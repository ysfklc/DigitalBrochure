import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import session from "express-session";
import {
  loginSchema, registerSchema, resetPasswordSchema, verifyTotpSchema,
  insertProductSchema, insertTemplateSchema, insertCampaignSchema,
  insertMessageSchema, insertSuggestionSchema, insertTutorialSchema
} from "@shared/schema";
import { z } from "zod";

const JWT_SECRET = process.env.SESSION_SECRET || "your-secret-key";

async function seedSuperAdmin() {
  try {
    const existingAdmin = await storage.getUserByEmail("superadmin@example.com");
    if (!existingAdmin) {
      const hashedPassword = await bcrypt.hash("Super12345", 12);
      await storage.createUser({
        email: "superadmin@example.com",
        password: hashedPassword,
        firstName: "Super",
        lastName: "Admin",
        mobilePhone: null,
        tenantId: null,
        role: "super_admin",
        totpSecret: null,
        totpEnabled: false,
        isActive: true
      });
      console.log("Super admin user created successfully");
    }
  } catch (error) {
    console.error("Error seeding super admin:", error);
  }
}

declare module "express-session" {
  interface SessionData {
    userId?: string;
    tenantId?: string;
    role?: string;
  }
}

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    tenantId: string | null;
    role: string;
  };
}

const authenticate = async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith("Bearer ")) {
      return res.status(401).json({ error: "No token provided" });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    const user = await storage.getUser(decoded.userId);

    if (!user) {
      return res.status(401).json({ error: "User not found" });
    }

    req.user = {
      id: user.id,
      email: user.email,
      tenantId: user.tenantId,
      role: user.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const requireTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.user?.tenantId) {
    return res.status(403).json({ error: "Tenant access required" });
  }
  next();
};

const requireRole = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Insufficient permissions" });
    }
    next();
  };
};

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  await seedSuperAdmin();
  
  app.use(session({
    secret: JWT_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false, maxAge: 24 * 60 * 60 * 1000 }
  }));

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 12);
      const slug = data.email.split("@")[0].toLowerCase().replace(/[^a-z0-9]/g, "") + "-" + Date.now().toString(36);
      
      const tenant = await storage.createTenant({
        name: `${data.firstName}'s Organization`,
        slug
      });

      const totpSecret = speakeasy.generateSecret({ name: `eBrochure:${data.email}` });

      const user = await storage.createUser({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        mobilePhone: data.mobilePhone || null,
        tenantId: tenant.id,
        role: "tenant_admin",
        totpSecret: totpSecret.base32,
        totpEnabled: false,
        isActive: true
      });

      res.json({
        userId: user.id,
        message: "Registration successful. Please set up 2FA."
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Register error:", error);
      res.status(500).json({ error: "Registration failed" });
    }
  });

  app.post("/api/auth/login", async (req: Request, res: Response) => {
    try {
      const data = loginSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);

      if (!user) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      const validPassword = await bcrypt.compare(data.password, user.password);
      if (!validPassword) {
        return res.status(401).json({ error: "Invalid credentials" });
      }

      if (!user.isActive) {
        return res.status(401).json({ error: "Account is not active" });
      }

      if (user.totpEnabled) {
        return res.json({
          requiresTotp: true,
          userId: user.id
        });
      }

      const token = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
      const { password, totpSecret, ...safeUser } = user;

      res.json({
        user: safeUser,
        token,
        requiresTotp: false
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      console.error("Login error:", error);
      res.status(500).json({ error: "Login failed" });
    }
  });

  app.get("/api/auth/setup-2fa", async (req: Request, res: Response) => {
    try {
      const userId = req.query.userId as string;
      if (!userId) {
        return res.status(400).json({ error: "User ID required" });
      }

      const user = await storage.getUser(userId);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const otpauthUrl = speakeasy.otpauthURL({
        secret: user.totpSecret || "",
        label: `eBrochure:${user.email}`,
        issuer: "eBrochure",
        encoding: "base32"
      });

      res.json({
        secret: user.totpSecret,
        otpauthUrl
      });
    } catch (error) {
      console.error("Setup 2FA error:", error);
      res.status(500).json({ error: "Failed to setup 2FA" });
    }
  });

  app.post("/api/auth/verify-2fa-setup", async (req: Request, res: Response) => {
    try {
      const { userId, token } = req.body;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const verified = speakeasy.totp.verify({
        secret: user.totpSecret || "",
        encoding: "base32",
        token,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      await storage.updateUser(userId, { totpEnabled: true });

      const jwtToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
      const { password, totpSecret, ...safeUser } = user;

      res.json({
        user: { ...safeUser, totpEnabled: true },
        token: jwtToken
      });
    } catch (error) {
      console.error("Verify 2FA setup error:", error);
      res.status(500).json({ error: "Failed to verify 2FA" });
    }
  });

  app.post("/api/auth/verify-2fa", async (req: Request, res: Response) => {
    try {
      const { userId, token } = req.body;
      const user = await storage.getUser(userId);

      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }

      const verified = speakeasy.totp.verify({
        secret: user.totpSecret || "",
        encoding: "base32",
        token,
        window: 2
      });

      if (!verified) {
        return res.status(400).json({ error: "Invalid verification code" });
      }

      const jwtToken = jwt.sign({ userId: user.id }, JWT_SECRET, { expiresIn: "24h" });
      const { password, totpSecret, ...safeUser } = user;

      res.json({
        user: safeUser,
        token: jwtToken
      });
    } catch (error) {
      console.error("Verify 2FA error:", error);
      res.status(500).json({ error: "Failed to verify 2FA" });
    }
  });

  app.post("/api/auth/reset-password", async (req: Request, res: Response) => {
    try {
      const data = resetPasswordSchema.parse(req.body);
      const user = await storage.getUserByEmail(data.email);

      res.json({ message: "If an account exists, a reset email has been sent." });
    } catch (error) {
      res.status(500).json({ error: "Failed to process reset request" });
    }
  });

  app.get("/api/auth/me", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.user!.id);
      if (!user) {
        return res.status(404).json({ error: "User not found" });
      }
      const { password, totpSecret, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to get user" });
    }
  });

  app.post("/api/subscription/create", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const { plan } = req.body;
      const tenantId = req.user!.tenantId;

      if (!tenantId) {
        return res.status(400).json({ error: "No tenant associated" });
      }

      const prices: Record<string, string> = {
        monthly: "300.00",
        six_month: "250.00",
        yearly: "200.00"
      };

      const periods: Record<string, number> = {
        monthly: 1,
        six_month: 6,
        yearly: 12
      };

      const subscription = await storage.createSubscription({
        tenantId,
        plan,
        status: "active",
        pricePerMonth: prices[plan] || "300.00",
        startDate: new Date(),
        endDate: new Date(Date.now() + periods[plan] * 30 * 24 * 60 * 60 * 1000)
      });

      res.json(subscription);
    } catch (error) {
      console.error("Create subscription error:", error);
      res.status(500).json({ error: "Failed to create subscription" });
    }
  });

  app.get("/api/subscription", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const subscription = await storage.getSubscriptionByTenant(req.user!.tenantId!);
      res.json(subscription || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to get subscription" });
    }
  });

  app.get("/api/products", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const products = await storage.getProductsByTenant(req.user!.tenantId!);
      res.json(products);
    } catch (error) {
      res.status(500).json({ error: "Failed to get products" });
    }
  });

  app.get("/api/products/:id", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product) {
        return res.status(404).json({ error: "Product not found" });
      }
      if (product.tenantId !== req.user!.tenantId && !product.isGlobal) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(product);
    } catch (error) {
      res.status(500).json({ error: "Failed to get product" });
    }
  });

  app.post("/api/products", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const data = insertProductSchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const product = await storage.createProduct(data);
      res.json(product);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create product" });
    }
  });

  app.patch("/api/products/:id", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product || product.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Product not found" });
      }
      const updated = await storage.updateProduct(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product" });
    }
  });

  app.delete("/api/products/:id", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const product = await storage.getProduct(req.params.id);
      if (!product || product.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Product not found" });
      }
      await storage.deleteProduct(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product" });
    }
  });

  app.get("/api/templates", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const templates = await storage.getTemplatesByTenant(req.user!.tenantId!);
      res.json(templates);
    } catch (error) {
      res.status(500).json({ error: "Failed to get templates" });
    }
  });

  app.get("/api/templates/:id", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template) {
        return res.status(404).json({ error: "Template not found" });
      }
      if (template.tenantId !== req.user!.tenantId && !template.isGlobal) {
        return res.status(403).json({ error: "Access denied" });
      }
      res.json(template);
    } catch (error) {
      res.status(500).json({ error: "Failed to get template" });
    }
  });

  app.post("/api/templates", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const data = insertTemplateSchema.parse({ ...req.body, tenantId: req.user!.tenantId });
      const template = await storage.createTemplate(data);
      res.json(template);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create template" });
    }
  });

  app.patch("/api/templates/:id", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template || template.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Template not found" });
      }
      const updated = await storage.updateTemplate(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update template" });
    }
  });

  app.delete("/api/templates/:id", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const template = await storage.getTemplate(req.params.id);
      if (!template || template.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Template not found" });
      }
      await storage.deleteTemplate(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete template" });
    }
  });

  app.get("/api/campaigns", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const campaigns = await storage.getCampaignsByTenant(req.user!.tenantId!);
      res.json(campaigns);
    } catch (error) {
      res.status(500).json({ error: "Failed to get campaigns" });
    }
  });

  app.get("/api/campaigns/:id", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign || campaign.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      res.json(campaign);
    } catch (error) {
      res.status(500).json({ error: "Failed to get campaign" });
    }
  });

  app.post("/api/campaigns", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const data = insertCampaignSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
        createdBy: req.user!.id
      });
      const campaign = await storage.createCampaign(data);
      res.json(campaign);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create campaign" });
    }
  });

  app.patch("/api/campaigns/:id", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign || campaign.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      const updated = await storage.updateCampaign(req.params.id, req.body);
      res.json(updated);
    } catch (error) {
      res.status(500).json({ error: "Failed to update campaign" });
    }
  });

  app.delete("/api/campaigns/:id", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign || campaign.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      await storage.deleteCampaign(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete campaign" });
    }
  });

  app.get("/api/campaigns/:id/products", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign || campaign.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      const campaignProducts = await storage.getCampaignProducts(req.params.id);
      res.json(campaignProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to get campaign products" });
    }
  });

  app.post("/api/campaigns/:id/products", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const campaign = await storage.getCampaign(req.params.id);
      if (!campaign || campaign.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "Campaign not found" });
      }
      const campaignProduct = await storage.addCampaignProduct({
        ...req.body,
        campaignId: req.params.id
      });
      res.json(campaignProduct);
    } catch (error) {
      res.status(500).json({ error: "Failed to add campaign product" });
    }
  });

  app.delete("/api/campaigns/:campaignId/products/:productId", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      await storage.removeCampaignProduct(req.params.productId);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to remove campaign product" });
    }
  });

  app.get("/api/messages", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const messages = await storage.getMessagesByTenant(req.user!.tenantId!);
      res.json(messages);
    } catch (error) {
      res.status(500).json({ error: "Failed to get messages" });
    }
  });

  app.post("/api/messages", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const data = insertMessageSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
        senderId: req.user!.id
      });
      const message = await storage.createMessage(data);
      res.json(message);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to send message" });
    }
  });

  app.patch("/api/messages/:id/read", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const message = await storage.markMessageRead(req.params.id);
      res.json(message);
    } catch (error) {
      res.status(500).json({ error: "Failed to mark message read" });
    }
  });

  app.delete("/api/messages/:id", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteMessage(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete message" });
    }
  });

  app.get("/api/suggestions", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const suggestions = await storage.getSuggestionsByTenant(req.user!.tenantId!);
      res.json(suggestions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  });

  app.post("/api/suggestions", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const data = insertSuggestionSchema.parse({
        ...req.body,
        tenantId: req.user!.tenantId,
        userId: req.user!.id
      });
      const suggestion = await storage.createSuggestion(data);
      res.json(suggestion);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create suggestion" });
    }
  });

  app.patch("/api/suggestions/:id", authenticate, requireRole("super_admin", "tenant_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const suggestion = await storage.updateSuggestion(req.params.id, req.body);
      res.json(suggestion);
    } catch (error) {
      res.status(500).json({ error: "Failed to update suggestion" });
    }
  });

  app.get("/api/tutorials", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const tutorials = await storage.getAllTutorials();
      res.json(tutorials);
    } catch (error) {
      res.status(500).json({ error: "Failed to get tutorials" });
    }
  });

  app.post("/api/tutorials", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const data = insertTutorialSchema.parse(req.body);
      const tutorial = await storage.createTutorial(data);
      res.json(tutorial);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors });
      }
      res.status(500).json({ error: "Failed to create tutorial" });
    }
  });

  app.patch("/api/tutorials/:id", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const tutorial = await storage.updateTutorial(req.params.id, req.body);
      res.json(tutorial);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tutorial" });
    }
  });

  app.delete("/api/tutorials/:id", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteTutorial(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tutorial" });
    }
  });

  app.get("/api/users", authenticate, requireTenant, requireRole("super_admin", "tenant_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const users = await storage.getUsersByTenant(req.user!.tenantId!);
      const safeUsers = users.map(({ password, totpSecret, ...u }) => u);
      res.json(safeUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to get users" });
    }
  });

  app.post("/api/users", authenticate, requireTenant, requireRole("super_admin", "tenant_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { email, firstName, lastName, password, role, mobilePhone } = req.body;
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 12);
      const totpSecret = speakeasy.generateSecret({ name: `eBrochure:${email}` });

      const user = await storage.createUser({
        email,
        firstName,
        lastName,
        password: hashedPassword,
        role: role || "tenant_user",
        tenantId: req.user!.tenantId,
        mobilePhone: mobilePhone || null,
        totpSecret: totpSecret.base32,
        totpEnabled: false,
        isActive: true
      });

      const { password: _, totpSecret: __, ...safeUser } = user;
      res.json(safeUser);
    } catch (error) {
      res.status(500).json({ error: "Failed to create user" });
    }
  });

  app.patch("/api/users/:id", authenticate, requireTenant, requireRole("super_admin", "tenant_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user || user.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "User not found" });
      }
      
      const updateData: any = { ...req.body };
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 12);
      }
      
      const updated = await storage.updateUser(req.params.id, updateData);
      if (updated) {
        const { password, totpSecret, ...safeUser } = updated;
        res.json(safeUser);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update user" });
    }
  });

  app.delete("/api/users/:id", authenticate, requireTenant, requireRole("super_admin", "tenant_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const user = await storage.getUser(req.params.id);
      if (!user || user.tenantId !== req.user!.tenantId) {
        return res.status(404).json({ error: "User not found" });
      }
      if (user.id === req.user!.id) {
        return res.status(400).json({ error: "Cannot delete yourself" });
      }
      await storage.deleteUser(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete user" });
    }
  });

  app.patch("/api/account", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const updateData: any = { ...req.body };
      if (updateData.password) {
        updateData.password = await bcrypt.hash(updateData.password, 12);
      }
      
      const updated = await storage.updateUser(req.user!.id, updateData);
      if (updated) {
        const { password, totpSecret, ...safeUser } = updated;
        res.json(safeUser);
      } else {
        res.status(404).json({ error: "User not found" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to update account" });
    }
  });

  app.get("/api/dashboard/stats", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const [products, campaigns, templates] = await Promise.all([
        storage.getProductsByTenant(req.user!.tenantId!),
        storage.getCampaignsByTenant(req.user!.tenantId!),
        storage.getTemplatesByTenant(req.user!.tenantId!)
      ]);

      const activeCampaigns = campaigns.filter(c => c.status === "active").length;
      const draftCampaigns = campaigns.filter(c => c.status === "draft").length;

      res.json({
        totalProducts: products.length,
        totalCampaigns: campaigns.length,
        activeCampaigns,
        draftCampaigns,
        totalTemplates: templates.length,
        recentCampaigns: campaigns.slice(0, 5)
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  return httpServer;
}
