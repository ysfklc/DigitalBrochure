import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import speakeasy from "speakeasy";
import session from "express-session";
import multer from "multer";
import path from "path";
import fs from "fs";
import {
  loginSchema, registerSchema, resetPasswordSchema, verifyTotpSchema, tenantSetupSchema,
  insertProductSchema, insertTemplateSchema, insertCampaignSchema,
  insertMessageSchema, insertSuggestionSchema, insertTutorialSchema
} from "@shared/schema";
import { z } from "zod";
import { generateActivationToken, getActivationTokenExpiry, sendActivationEmail } from "./email";

const uploadsDir = path.join(process.cwd(), "uploads");
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const fileStorage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    const ext = path.extname(file.originalname);
    cb(null, `${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage: fileStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error("Only image files are allowed"));
    }
  },
});

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
    firstName: string;
    lastName: string;
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
      firstName: user.firstName,
      lastName: user.lastName,
      tenantId: user.tenantId,
      role: user.role
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

const requireTenant = (req: AuthRequest, res: Response, next: NextFunction) => {
  if (req.user?.role === "super_admin") {
    return next();
  }
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

  app.use("/uploads", (await import("express")).default.static(uploadsDir));

  app.post("/api/upload", authenticate, upload.single("file"), (req: AuthRequest, res: Response) => {
    if (!req.file) {
      return res.status(400).json({ error: "No file uploaded" });
    }
    const fileUrl = `/uploads/${req.file.filename}`;
    res.json({ url: fileUrl });
  });

  app.post("/api/auth/register", async (req: Request, res: Response) => {
    try {
      const data = registerSchema.parse(req.body);
      const existingUser = await storage.getUserByEmail(data.email);
      if (existingUser) {
        return res.status(400).json({ error: "Email already registered" });
      }

      const hashedPassword = await bcrypt.hash(data.password, 12);
      const totpSecret = speakeasy.generateSecret({ name: `eBrochure:${data.email}` });
      const activationToken = generateActivationToken();
      const activationTokenExpiry = getActivationTokenExpiry();

      const user = await storage.createUser({
        email: data.email,
        password: hashedPassword,
        firstName: data.firstName,
        lastName: data.lastName,
        mobilePhone: data.mobilePhone || null,
        tenantId: null,
        role: "tenant_admin",
        totpSecret: totpSecret.base32,
        totpEnabled: false,
        isActive: false,
        activationToken,
        activationTokenExpiry
      });

      await sendActivationEmail(data.email, data.firstName, activationToken, storage);

      res.json({
        userId: user.id,
        message: "Registration successful. Please check your email to verify your account.",
        requiresVerification: true
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
        return res.status(401).json({ 
          error: "Please verify your email address",
          requiresVerification: true,
          email: user.email
        });
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

  app.get("/api/auth/verify-email", async (req: Request, res: Response) => {
    try {
      const token = req.query.token as string;
      if (!token) {
        return res.status(400).json({ error: "Verification token is required" });
      }

      const user = await storage.getUserByActivationToken(token);
      if (!user) {
        return res.status(400).json({ error: "Invalid or expired verification token" });
      }

      if (user.activationTokenExpiry && new Date() > new Date(user.activationTokenExpiry)) {
        return res.status(400).json({ error: "Verification token has expired. Please request a new one." });
      }

      await storage.updateUser(user.id, {
        isActive: true,
        activationToken: null,
        activationTokenExpiry: null
      });

      res.json({ 
        message: "Email verified successfully. You can now log in.",
        verified: true
      });
    } catch (error) {
      console.error("Verify email error:", error);
      res.status(500).json({ error: "Failed to verify email" });
    }
  });

  app.post("/api/auth/resend-verification", async (req: Request, res: Response) => {
    try {
      const { email } = req.body;
      if (!email) {
        return res.status(400).json({ error: "Email is required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user) {
        return res.json({ message: "If an account exists, a verification email has been sent." });
      }

      if (user.isActive) {
        return res.status(400).json({ error: "Email is already verified" });
      }

      const activationToken = generateActivationToken();
      const activationTokenExpiry = getActivationTokenExpiry();

      await storage.updateUser(user.id, {
        activationToken,
        activationTokenExpiry
      });

      await sendActivationEmail(user.email, user.firstName, activationToken, storage);

      res.json({ message: "Verification email sent. Please check your inbox." });
    } catch (error) {
      console.error("Resend verification error:", error);
      res.status(500).json({ error: "Failed to resend verification email" });
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

  app.post("/api/tenant/setup", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const data = tenantSetupSchema.parse(req.body);

      if (req.user!.tenantId) {
        return res.status(400).json({ error: "User already has an organization" });
      }

      const existingTenant = await storage.getTenantBySlug(data.slug);
      if (existingTenant) {
        return res.status(400).json({ error: "This organization URL is already taken" });
      }

      const generateTenantCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      let tenantCode = generateTenantCode();
      let existingCodeTenant = await storage.getTenantByCode(tenantCode);
      while (existingCodeTenant) {
        tenantCode = generateTenantCode();
        existingCodeTenant = await storage.getTenantByCode(tenantCode);
      }

      const tenant = await storage.createTenant({ name: data.name, slug: data.slug, code: tenantCode });
      await storage.updateUser(req.user!.id, { tenantId: tenant.id });

      res.json({ tenant, message: "Organization created successfully" });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ error: error.errors[0]?.message || "Invalid input" });
      }
      console.error("Tenant setup error:", error);
      res.status(500).json({ error: "Failed to create organization" });
    }
  });

  app.get("/api/tenant/current", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      const tenant = await storage.getTenant(req.user!.tenantId!);
      if (!tenant) {
        return res.status(404).json({ error: "Organization not found" });
      }
      res.json({ 
        id: tenant.id, 
        name: tenant.name, 
        slug: tenant.slug,
        code: tenant.code,
        logoUrl: tenant.logoUrl 
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get organization info" });
    }
  });

  app.get("/api/tenant/by-code/:code", async (req: Request, res: Response) => {
    try {
      const tenant = await storage.getTenantByCode(req.params.code.toUpperCase());
      if (!tenant) {
        return res.status(404).json({ error: "Organization not found with this code" });
      }
      res.json({ id: tenant.id, name: tenant.name });
    } catch (error) {
      res.status(500).json({ error: "Failed to find organization" });
    }
  });

  app.post("/api/join-requests", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const { tenantCode, message } = req.body;
      
      if (req.user!.tenantId) {
        return res.status(400).json({ error: "You are already a member of an organization" });
      }

      const tenant = await storage.getTenantByCode(tenantCode.toUpperCase());
      if (!tenant) {
        return res.status(404).json({ error: "Organization not found with this code" });
      }

      const existingRequests = await storage.getJoinRequestsByUser(req.user!.id);
      const pendingRequest = existingRequests.find(r => r.tenantId === tenant.id && r.status === "pending");
      if (pendingRequest) {
        return res.status(400).json({ error: "You already have a pending request to join this organization" });
      }

      const joinRequest = await storage.createJoinRequest({
        userId: req.user!.id,
        tenantId: tenant.id,
        message: message || null,
        status: "pending",
        reviewedBy: null
      });

      res.json({ joinRequest, message: "Join request submitted successfully" });
    } catch (error) {
      console.error("Create join request error:", error);
      res.status(500).json({ error: "Failed to submit join request" });
    }
  });

  app.get("/api/join-requests", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "tenant_admin" && req.user!.role !== "super_admin") {
        return res.status(403).json({ error: "Only admins can view join requests" });
      }
      const requests = await storage.getPendingJoinRequestsByTenant(req.user!.tenantId!);
      const requestsWithUsers = await Promise.all(requests.map(async (request) => {
        const user = await storage.getUser(request.userId);
        return {
          ...request,
          user: user ? { id: user.id, email: user.email, firstName: user.firstName, lastName: user.lastName } : null
        };
      }));
      res.json(requestsWithUsers);
    } catch (error) {
      res.status(500).json({ error: "Failed to get join requests" });
    }
  });

  app.get("/api/join-requests/my", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const requests = await storage.getJoinRequestsByUser(req.user!.id);
      const requestsWithTenants = await Promise.all(requests.map(async (request) => {
        const tenant = await storage.getTenant(request.tenantId);
        return {
          ...request,
          tenant: tenant ? { id: tenant.id, name: tenant.name } : null
        };
      }));
      res.json(requestsWithTenants);
    } catch (error) {
      res.status(500).json({ error: "Failed to get your join requests" });
    }
  });

  app.post("/api/join-requests/:id/approve", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "tenant_admin" && req.user!.role !== "super_admin") {
        return res.status(403).json({ error: "Only admins can approve join requests" });
      }

      const request = await storage.getJoinRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Join request not found" });
      }

      if (request.tenantId !== req.user!.tenantId && req.user!.role !== "super_admin") {
        return res.status(403).json({ error: "You can only approve requests for your organization" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ error: "This request has already been processed" });
      }

      await storage.updateJoinRequest(req.params.id, {
        status: "approved",
        reviewedBy: req.user!.id,
        reviewedAt: new Date()
      } as any);

      await storage.updateUser(request.userId, { tenantId: request.tenantId, role: "tenant_user" });

      res.json({ message: "Join request approved successfully" });
    } catch (error) {
      console.error("Approve join request error:", error);
      res.status(500).json({ error: "Failed to approve join request" });
    }
  });

  app.post("/api/join-requests/:id/reject", authenticate, requireTenant, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role !== "tenant_admin" && req.user!.role !== "super_admin") {
        return res.status(403).json({ error: "Only admins can reject join requests" });
      }

      const request = await storage.getJoinRequest(req.params.id);
      if (!request) {
        return res.status(404).json({ error: "Join request not found" });
      }

      if (request.tenantId !== req.user!.tenantId && req.user!.role !== "super_admin") {
        return res.status(403).json({ error: "You can only reject requests for your organization" });
      }

      if (request.status !== "pending") {
        return res.status(400).json({ error: "This request has already been processed" });
      }

      await storage.updateJoinRequest(req.params.id, {
        status: "rejected",
        reviewedBy: req.user!.id,
        reviewedAt: new Date()
      } as any);

      res.json({ message: "Join request rejected" });
    } catch (error) {
      console.error("Reject join request error:", error);
      res.status(500).json({ error: "Failed to reject join request" });
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

  // Product search from connectors - MUST be before /api/products/:id to avoid route conflict
  app.get("/api/products/search", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      const { q } = req.query;
      const searchQuery = (q as string) || "";
      console.log("[DEBUG] /api/products/search called with q:", searchQuery);
      
      const connectors = await storage.getEnabledProductConnectors();
      console.log("[DEBUG] Found connectors:", connectors.length);
      if (connectors.length === 0) {
        return res.json([]);
      }

      const allProducts: any[] = [];
      for (const connector of connectors) {
        try {
          const products = await executeConnectorSearch(connector, searchQuery);
          allProducts.push(...products.map((p: any) => ({ ...p, connectorId: connector.id, connectorName: connector.name })));
        } catch (err) {
          console.error(`Connector ${connector.name} failed:`, err);
        }
      }

      console.log("[DEBUG] Returning products:", allProducts.length);
      res.json(allProducts);
    } catch (error) {
      res.status(500).json({ error: "Failed to search products" });
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

  app.get("/api/dashboard/stats", authenticate, async (req: AuthRequest, res: Response) => {
    try {
      if (req.user!.role === "super_admin") {
        const tenants = await storage.getAllTenants();
        const allSuggestions = await storage.getAllSuggestions();
        res.json({
          totalTenants: tenants.length,
          totalSuggestions: allSuggestions.length,
          pendingSuggestions: allSuggestions.filter(s => s.status === "pending").length,
          recentTenants: tenants.slice(0, 5)
        });
      } else {
        const [products, campaigns, templates] = await Promise.all([
          storage.getProductsByTenant(req.user!.tenantId!),
          storage.getCampaignsByTenant(req.user!.tenantId!),
          storage.getTemplatesByTenant(req.user!.tenantId!)
        ]);

        const activeCampaigns = campaigns.filter(c => c.status === "active").length;
        const draftCampaigns = campaigns.filter(c => c.status === "draft").length;

        // Generate monthly campaign data for the last 6 months
        const now = new Date();
        const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
        const campaignChartData = [];
        for (let i = 5; i >= 0; i--) {
          const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
          const monthStart = new Date(date.getFullYear(), date.getMonth(), 1);
          const monthEnd = new Date(date.getFullYear(), date.getMonth() + 1, 0);
          const count = campaigns.filter(c => {
            const createdAt = new Date(c.createdAt);
            return createdAt >= monthStart && createdAt <= monthEnd;
          }).length;
          campaignChartData.push({
            month: monthNames[date.getMonth()],
            campaigns: count
          });
        }

        // Generate product category breakdown
        const categoryMap = new Map<string, number>();
        products.forEach(p => {
          const category = p.category || "Uncategorized";
          categoryMap.set(category, (categoryMap.get(category) || 0) + 1);
        });
        const productCategoryData = Array.from(categoryMap.entries())
          .map(([name, value]) => ({ name, value }))
          .sort((a, b) => b.value - a.value)
          .slice(0, 4);

        // Generate recent activity from campaigns
        const recentActivity = campaigns
          .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
          .map(c => {
            const createdAt = new Date(c.createdAt);
            const diffMs = now.getTime() - createdAt.getTime();
            const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
            const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
            let timeAgo = "";
            if (diffHours < 1) timeAgo = "Just now";
            else if (diffHours < 24) timeAgo = `${diffHours} hour${diffHours > 1 ? 's' : ''} ago`;
            else timeAgo = `${diffDays} day${diffDays > 1 ? 's' : ''} ago`;
            
            return {
              id: c.id,
              action: c.status === "active" ? "Published campaign" : c.status === "draft" ? "Created campaign" : "Updated campaign",
              item: c.name,
              time: timeAgo,
              type: "campaign"
            };
          });

        res.json({
          totalProducts: products.length,
          totalCampaigns: campaigns.length,
          activeCampaigns,
          draftCampaigns,
          totalTemplates: templates.length,
          recentCampaigns: campaigns.slice(0, 5),
          campaignChartData,
          productCategoryData,
          recentActivity
        });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to get dashboard stats" });
    }
  });

  app.get("/api/admin/tenants", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const tenants = await storage.getAllTenants();
      const tenantsWithDetails = await Promise.all(
        tenants.map(async (tenant) => {
          const users = await storage.getUsersByTenant(tenant.id);
          const subscription = await storage.getSubscriptionByTenant(tenant.id);
          return {
            ...tenant,
            userCount: users.length,
            subscription
          };
        })
      );
      res.json(tenantsWithDetails);
    } catch (error) {
      res.status(500).json({ error: "Failed to get tenants" });
    }
  });

  app.get("/api/admin/tenants/:id", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      const users = await storage.getUsersByTenant(tenant.id);
      const subscription = await storage.getSubscriptionByTenant(tenant.id);
      const campaigns = await storage.getCampaignsByTenant(tenant.id);
      res.json({
        ...tenant,
        users: users.map(({ password, totpSecret, ...u }) => u),
        subscription,
        campaignCount: campaigns.length
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get tenant" });
    }
  });

  app.post("/api/admin/tenants", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { name, slug } = req.body;
      const existingTenant = await storage.getTenantBySlug(slug);
      if (existingTenant) {
        return res.status(400).json({ error: "Tenant slug already exists" });
      }
      
      const generateTenantCode = () => {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 8; i++) {
          code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
      };

      let tenantCode = generateTenantCode();
      let existingCodeTenant = await storage.getTenantByCode(tenantCode);
      while (existingCodeTenant) {
        tenantCode = generateTenantCode();
        existingCodeTenant = await storage.getTenantByCode(tenantCode);
      }
      
      const tenant = await storage.createTenant({ name, slug, code: tenantCode });
      res.json(tenant);
    } catch (error) {
      console.error("Failed to create tenant:", error);
      res.status(500).json({ error: "Failed to create tenant" });
    }
  });

  app.patch("/api/admin/tenants/:id", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const tenant = await storage.updateTenant(req.params.id, req.body);
      res.json(tenant);
    } catch (error) {
      res.status(500).json({ error: "Failed to update tenant" });
    }
  });

  app.delete("/api/admin/tenants/:id", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteTenant(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete tenant" });
    }
  });

  app.post("/api/admin/tenants/:id/impersonate", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const tenant = await storage.getTenant(req.params.id);
      if (!tenant) {
        return res.status(404).json({ error: "Tenant not found" });
      }
      
      const users = await storage.getUsersByTenant(tenant.id);
      const tenantAdmin = users.find(u => u.role === "tenant_admin");
      
      if (!tenantAdmin) {
        return res.status(400).json({ error: "No tenant admin found for this tenant" });
      }
      
      const impersonationToken = jwt.sign(
        { 
          userId: tenantAdmin.id,
          impersonatedBy: req.user!.id,
          isImpersonation: true
        },
        JWT_SECRET,
        { expiresIn: "2h" }
      );
      
      const { password, totpSecret, ...safeUser } = tenantAdmin;
      res.json({ 
        user: safeUser, 
        token: impersonationToken,
        tenant
      });
    } catch (error) {
      console.error("Failed to impersonate tenant:", error);
      res.status(500).json({ error: "Failed to impersonate tenant" });
    }
  });

  app.get("/api/admin/suggestions", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const allSuggestions = await storage.getAllSuggestions();
      res.json(allSuggestions);
    } catch (error) {
      res.status(500).json({ error: "Failed to get suggestions" });
    }
  });

  app.delete("/api/admin/suggestions/:id", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteSuggestion(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete suggestion" });
    }
  });

  app.get("/api/admin/settings/:key", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const config = await storage.getSystemConfig(req.params.key);
      res.json(config?.value || null);
    } catch (error) {
      res.status(500).json({ error: "Failed to get setting" });
    }
  });

  app.get("/api/admin/settings", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const [iyzicoConfig, productApiConfig, emailConfig] = await Promise.all([
        storage.getSystemConfig("iyzico"),
        storage.getSystemConfig("product_api"),
        storage.getSystemConfig("email")
      ]);
      res.json({
        iyzico: iyzicoConfig?.value || null,
        productApi: productApiConfig?.value || null,
        email: emailConfig?.value || null
      });
    } catch (error) {
      res.status(500).json({ error: "Failed to get settings" });
    }
  });

  app.post("/api/admin/settings/:key", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const config = await storage.setSystemConfig(req.params.key, req.body.value);
      res.json(config);
    } catch (error) {
      res.status(500).json({ error: "Failed to save setting" });
    }
  });

  app.post("/api/admin/sync-products", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const productApiConfig = await storage.getSystemConfig("product_api");
      if (!productApiConfig?.value) {
        return res.status(400).json({ error: "Product API not configured" });
      }
      res.json({ success: true, message: "Product sync initiated" });
    } catch (error) {
      res.status(500).json({ error: "Failed to sync products" });
    }
  });

  app.post("/api/admin/test-email", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const { sendTestEmail } = await import("./email");
      const user = req.user!;
      const success = await sendTestEmail(user.email, user.firstName, storage);
      if (success) {
        res.json({ success: true, message: "Test email sent" });
      } else {
        res.status(500).json({ error: "Failed to send test email" });
      }
    } catch (error) {
      res.status(500).json({ error: "Failed to send test email" });
    }
  });

  // Product Connector routes
  app.get("/api/admin/product-connectors", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const connectors = await storage.getAllProductConnectors();
      res.json(connectors);
    } catch (error) {
      res.status(500).json({ error: "Failed to get product connectors" });
    }
  });

  app.get("/api/admin/product-connectors/:id", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const connector = await storage.getProductConnector(req.params.id);
      if (!connector) {
        return res.status(404).json({ error: "Connector not found" });
      }
      res.json(connector);
    } catch (error) {
      res.status(500).json({ error: "Failed to get product connector" });
    }
  });

  app.post("/api/admin/product-connectors", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const connector = await storage.createProductConnector(req.body);
      res.status(201).json(connector);
    } catch (error) {
      res.status(500).json({ error: "Failed to create product connector" });
    }
  });

  app.patch("/api/admin/product-connectors/:id", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const connector = await storage.updateProductConnector(req.params.id, req.body);
      if (!connector) {
        return res.status(404).json({ error: "Connector not found" });
      }
      res.json(connector);
    } catch (error) {
      res.status(500).json({ error: "Failed to update product connector" });
    }
  });

  app.delete("/api/admin/product-connectors/:id", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      await storage.deleteProductConnector(req.params.id);
      res.json({ success: true });
    } catch (error) {
      res.status(500).json({ error: "Failed to delete product connector" });
    }
  });

  app.post("/api/admin/product-connectors/:id/test", authenticate, requireRole("super_admin"), async (req: AuthRequest, res: Response) => {
    try {
      const connector = await storage.getProductConnector(req.params.id);
      if (!connector) {
        return res.status(404).json({ error: "Connector not found" });
      }
      
      const { searchQuery } = req.body;
      const result = await executeConnectorSearch(connector, searchQuery || "test");
      res.json({ success: true, products: result });
    } catch (error: any) {
      res.status(500).json({ error: error.message || "Failed to test connector" });
    }
  });

  return httpServer;
}

async function executeConnectorSearch(connector: any, searchQuery: string): Promise<any[]> {
  const { requestMethod, requestUrl, requestHeaders, requestParams, requestBody, responseParser, fieldMappings } = connector;
  
  console.log("[DEBUG] executeConnectorSearch called with searchQuery:", searchQuery);
  console.log("[DEBUG] Connector config:", { requestMethod, requestUrl, requestParams, responseParser, fieldMappings });
  
  // Build URL with parameters
  // First, extract base URL (remove any existing query string that might have empty placeholders)
  let baseUrl = requestUrl;
  const existingParams = new URLSearchParams();
  
  // Parse existing URL to separate base and query params
  if (requestUrl.includes("?")) {
    const urlParts = requestUrl.split("?");
    baseUrl = urlParts[0];
    // Parse existing query string but ignore empty values
    const existingQuery = new URLSearchParams(urlParts[1]);
    existingQuery.forEach((value, key) => {
      if (value && value.trim()) {
        existingParams.append(key, value);
      }
    });
  }
  
  // Add request params, replacing empty/placeholder values with search query
  if (requestParams && Array.isArray(requestParams)) {
    for (const param of requestParams) {
      let value = param.value;
      console.log("[DEBUG] Processing param:", param, "original value:", value);
      // Use search query if value is empty, matches the key, or is a placeholder
      if (!value || value === param.key || value === "{{search}}" || value === "q") {
        value = searchQuery;
        console.log("[DEBUG] Replaced with searchQuery:", value);
      }
      existingParams.set(param.key, value); // Use set to override any existing empty param
    }
  }
  
  // If no requestParams but URL had an empty q= parameter, add search query
  if ((!requestParams || requestParams.length === 0) && requestUrl.includes("?q=")) {
    existingParams.set("q", searchQuery);
    console.log("[DEBUG] No requestParams, but URL has q= placeholder, setting q to:", searchQuery);
  }
  
  // Build final URL
  let url = baseUrl;
  if (existingParams.toString()) {
    url += "?" + existingParams.toString();
  }

  console.log("[DEBUG] Final request URL:", url);

  // Prepare headers
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (requestHeaders && typeof requestHeaders === "object") {
    Object.assign(headers, requestHeaders);
  }

  // Prepare request body
  let body: string | undefined;
  if (requestMethod !== "GET" && requestBody) {
    body = requestBody.replace(/\{\{search\}\}/g, searchQuery);
  }

  // Make the request
  console.log("[DEBUG] Making fetch request to:", url);
  const response = await fetch(url, {
    method: requestMethod,
    headers,
    body,
  });

  console.log("[DEBUG] Response status:", response.status, response.statusText);

  if (!response.ok) {
    throw new Error(`API request failed: ${response.status} ${response.statusText}`);
  }

  const data = await response.json();
  console.log("[DEBUG] Response data:", JSON.stringify(data).substring(0, 500));
  
  // Parse response using JSONPath-like expression
  let products = parseJsonPath(data, responseParser);
  
  if (!Array.isArray(products)) {
    products = [products];
  }

  // Map fields according to fieldMappings
  const mappings = fieldMappings as { name: string; image: string; price?: string; sku?: string };
  return products.map((item: any) => ({
    id: `external-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    name: getValueByPath(item, mappings.name || "") || "Unknown Product",
    imageUrl: getValueByPath(item, mappings.image || "") || "",
    price: getValueByPath(item, mappings.price || "") || "0",
    sku: getValueByPath(item, mappings.sku || "") || "",
    isExternal: true,
  }));
}

function parseJsonPath(data: any, path: string): any {
  if (!path || path === "$" || path === ".") {
    return data;
  }
  
  // Handle jq-like syntax: .data.products or $.data.products
  const cleanPath = path.replace(/^\$\.?/, "").replace(/^\./, "");
  if (!cleanPath) return data;
  
  const parts = cleanPath.split(/\.|\[|\]/).filter(Boolean);
  let result = data;
  
  for (const part of parts) {
    if (result === undefined || result === null) break;
    if (Array.isArray(result) && part === "*") {
      continue;
    }
    result = result[part];
  }
  
  return result;
}

function getValueByPath(obj: any, path: string): any {
  if (!path) return undefined;
  const cleanPath = path.replace(/^\$\.?/, "").replace(/^\./, "");
  const parts = cleanPath.split(/\.|\[|\]/).filter(Boolean);
  let result = obj;
  
  for (const part of parts) {
    if (result === undefined || result === null) break;
    result = result[part];
  }
  
  return result;
}
