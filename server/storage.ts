import { eq, and, or, desc, ilike } from "drizzle-orm";
import { db } from "./db";
import {
  users, tenants, subscriptions, products, templates,
  campaigns, campaignProducts, messages, suggestions, tutorials, systemConfig, productConnectors, joinRequests,
  type User, type InsertUser, type Tenant, type InsertTenant,
  type Subscription, type InsertSubscription, type Product, type InsertProduct,
  type Template, type InsertTemplate, type Campaign, type InsertCampaign,
  type CampaignProduct, type InsertCampaignProduct, type Message, type InsertMessage,
  type Suggestion, type InsertSuggestion, type Tutorial, type InsertTutorial,
  type SystemConfig, type InsertSystemConfig, type ProductConnector, type InsertProductConnector,
  type JoinRequest, type InsertJoinRequest
} from "@shared/schema";

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getUserByActivationToken(token: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined>;
  deleteUser(id: string): Promise<boolean>;
  getUsersByTenant(tenantId: string): Promise<User[]>;

  getTenant(id: string): Promise<Tenant | undefined>;
  getTenantBySlug(slug: string): Promise<Tenant | undefined>;
  getAllTenants(): Promise<Tenant[]>;
  createTenant(tenant: InsertTenant): Promise<Tenant>;
  updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined>;
  deleteTenant(id: string): Promise<boolean>;

  getSubscription(id: string): Promise<Subscription | undefined>;
  getSubscriptionByTenant(tenantId: string): Promise<Subscription | undefined>;
  createSubscription(subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, data: Partial<InsertSubscription>): Promise<Subscription | undefined>;

  getProduct(id: string): Promise<Product | undefined>;
  getProductsByTenant(tenantId: string): Promise<Product[]>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined>;
  deleteProduct(id: string): Promise<boolean>;

  getTemplate(id: string): Promise<Template | undefined>;
  getTemplatesByTenant(tenantId: string): Promise<Template[]>;
  getGlobalTemplates(): Promise<Template[]>;
  createTemplate(template: InsertTemplate): Promise<Template>;
  updateTemplate(id: string, data: Partial<InsertTemplate>): Promise<Template | undefined>;
  deleteTemplate(id: string): Promise<boolean>;

  getCampaign(id: string): Promise<Campaign | undefined>;
  getCampaignsByTenant(tenantId: string): Promise<Campaign[]>;
  createCampaign(campaign: InsertCampaign): Promise<Campaign>;
  updateCampaign(id: string, data: Partial<InsertCampaign>): Promise<Campaign | undefined>;
  deleteCampaign(id: string): Promise<boolean>;

  getCampaignProducts(campaignId: string): Promise<CampaignProduct[]>;
  addCampaignProduct(data: InsertCampaignProduct): Promise<CampaignProduct>;
  removeCampaignProduct(id: string): Promise<boolean>;

  getMessage(id: string): Promise<Message | undefined>;
  getMessagesByUser(userId: string): Promise<Message[]>;
  getMessagesByTenant(tenantId: string): Promise<Message[]>;
  createMessage(message: InsertMessage): Promise<Message>;
  markMessageRead(id: string): Promise<Message | undefined>;
  deleteMessage(id: string): Promise<boolean>;

  getSuggestion(id: string): Promise<Suggestion | undefined>;
  getSuggestionsByTenant(tenantId: string): Promise<Suggestion[]>;
  getAllSuggestions(): Promise<Suggestion[]>;
  createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion>;
  updateSuggestion(id: string, data: Partial<InsertSuggestion>): Promise<Suggestion | undefined>;
  deleteSuggestion(id: string): Promise<boolean>;

  getTutorial(id: string): Promise<Tutorial | undefined>;
  getAllTutorials(): Promise<Tutorial[]>;
  createTutorial(tutorial: InsertTutorial): Promise<Tutorial>;
  updateTutorial(id: string, data: Partial<InsertTutorial>): Promise<Tutorial | undefined>;
  deleteTutorial(id: string): Promise<boolean>;

  getSystemConfig(key: string): Promise<SystemConfig | undefined>;
  setSystemConfig(key: string, value: any): Promise<SystemConfig>;

  getProductConnector(id: string): Promise<ProductConnector | undefined>;
  getAllProductConnectors(): Promise<ProductConnector[]>;
  getEnabledProductConnectors(): Promise<ProductConnector[]>;
  createProductConnector(connector: InsertProductConnector): Promise<ProductConnector>;
  updateProductConnector(id: string, data: Partial<InsertProductConnector>): Promise<ProductConnector | undefined>;
  deleteProductConnector(id: string): Promise<boolean>;

  getTenantByCode(code: string): Promise<Tenant | undefined>;
  
  getJoinRequest(id: string): Promise<JoinRequest | undefined>;
  getJoinRequestsByTenant(tenantId: string): Promise<JoinRequest[]>;
  getJoinRequestsByUser(userId: string): Promise<JoinRequest[]>;
  getPendingJoinRequestsByTenant(tenantId: string): Promise<JoinRequest[]>;
  createJoinRequest(request: InsertJoinRequest): Promise<JoinRequest>;
  updateJoinRequest(id: string, data: Partial<InsertJoinRequest>): Promise<JoinRequest | undefined>;
  deleteJoinRequest(id: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async getUserByActivationToken(token: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.activationToken, token));
    return user;
  }

  async createUser(user: InsertUser): Promise<User> {
    const [created] = await db.insert(users).values(user).returning();
    return created;
  }

  async updateUser(id: string, data: Partial<InsertUser>): Promise<User | undefined> {
    const [updated] = await db.update(users).set(data).where(eq(users.id, id)).returning();
    return updated;
  }

  async deleteUser(id: string): Promise<boolean> {
    const result = await db.delete(users).where(eq(users.id, id));
    return true;
  }

  async getUsersByTenant(tenantId: string): Promise<User[]> {
    return db.select().from(users).where(eq(users.tenantId, tenantId));
  }

  async getTenant(id: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.id, id));
    return tenant;
  }

  async getTenantBySlug(slug: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.slug, slug));
    return tenant;
  }

  async createTenant(tenant: InsertTenant): Promise<Tenant> {
    const [created] = await db.insert(tenants).values(tenant).returning();
    return created;
  }

  async updateTenant(id: string, data: Partial<InsertTenant>): Promise<Tenant | undefined> {
    const [updated] = await db.update(tenants).set(data).where(eq(tenants.id, id)).returning();
    return updated;
  }

  async getAllTenants(): Promise<Tenant[]> {
    return db.select().from(tenants).orderBy(desc(tenants.createdAt));
  }

  async deleteTenant(id: string): Promise<boolean> {
    await db.delete(tenants).where(eq(tenants.id, id));
    return true;
  }

  async getSubscription(id: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions).where(eq(subscriptions.id, id));
    return subscription;
  }

  async getSubscriptionByTenant(tenantId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions)
      .where(eq(subscriptions.tenantId, tenantId))
      .orderBy(desc(subscriptions.createdAt))
      .limit(1);
    return subscription;
  }

  async createSubscription(subscription: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values(subscription).returning();
    return created;
  }

  async updateSubscription(id: string, data: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [updated] = await db.update(subscriptions).set(data).where(eq(subscriptions.id, id)).returning();
    return updated;
  }

  async getProduct(id: string): Promise<Product | undefined> {
    const [product] = await db.select().from(products).where(eq(products.id, id));
    return product;
  }

  async getProductsByTenant(tenantId: string): Promise<Product[]> {
    return db.select().from(products).where(
      or(eq(products.tenantId, tenantId), eq(products.isGlobal, true))
    ).orderBy(desc(products.createdAt));
  }

  async createProduct(product: InsertProduct): Promise<Product> {
    const [created] = await db.insert(products).values(product).returning();
    return created;
  }

  async updateProduct(id: string, data: Partial<InsertProduct>): Promise<Product | undefined> {
    const [updated] = await db.update(products).set(data).where(eq(products.id, id)).returning();
    return updated;
  }

  async deleteProduct(id: string): Promise<boolean> {
    await db.delete(products).where(eq(products.id, id));
    return true;
  }

  async getTemplate(id: string): Promise<Template | undefined> {
    const [template] = await db.select().from(templates).where(eq(templates.id, id));
    return template;
  }

  async getTemplatesByTenant(tenantId: string): Promise<Template[]> {
    return db.select().from(templates).where(
      or(eq(templates.tenantId, tenantId), eq(templates.isGlobal, true))
    ).orderBy(desc(templates.createdAt));
  }

  async getGlobalTemplates(): Promise<Template[]> {
    return db.select().from(templates).where(eq(templates.isGlobal, true));
  }

  async createTemplate(template: InsertTemplate): Promise<Template> {
    const [created] = await db.insert(templates).values(template).returning();
    return created;
  }

  async updateTemplate(id: string, data: Partial<InsertTemplate>): Promise<Template | undefined> {
    const [updated] = await db.update(templates).set(data).where(eq(templates.id, id)).returning();
    return updated;
  }

  async deleteTemplate(id: string): Promise<boolean> {
    await db.delete(templates).where(eq(templates.id, id));
    return true;
  }

  async getCampaign(id: string): Promise<Campaign | undefined> {
    const [campaign] = await db.select().from(campaigns).where(eq(campaigns.id, id));
    return campaign;
  }

  async getCampaignsByTenant(tenantId: string): Promise<Campaign[]> {
    return db.select().from(campaigns)
      .where(eq(campaigns.tenantId, tenantId))
      .orderBy(desc(campaigns.updatedAt));
  }

  async createCampaign(campaign: InsertCampaign): Promise<Campaign> {
    const [created] = await db.insert(campaigns).values(campaign).returning();
    return created;
  }

  async updateCampaign(id: string, data: Partial<InsertCampaign>): Promise<Campaign | undefined> {
    const [updated] = await db.update(campaigns)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(campaigns.id, id))
      .returning();
    return updated;
  }

  async deleteCampaign(id: string): Promise<boolean> {
    await db.delete(campaignProducts).where(eq(campaignProducts.campaignId, id));
    await db.delete(campaigns).where(eq(campaigns.id, id));
    return true;
  }

  async getCampaignProducts(campaignId: string): Promise<CampaignProduct[]> {
    return db.select().from(campaignProducts).where(eq(campaignProducts.campaignId, campaignId));
  }

  async addCampaignProduct(data: InsertCampaignProduct): Promise<CampaignProduct> {
    const [created] = await db.insert(campaignProducts).values(data).returning();
    return created;
  }

  async removeCampaignProduct(id: string): Promise<boolean> {
    await db.delete(campaignProducts).where(eq(campaignProducts.id, id));
    return true;
  }

  async getMessage(id: string): Promise<Message | undefined> {
    const [message] = await db.select().from(messages).where(eq(messages.id, id));
    return message;
  }

  async getMessagesByUser(userId: string): Promise<Message[]> {
    return db.select().from(messages).where(
      or(eq(messages.senderId, userId), eq(messages.receiverId, userId))
    ).orderBy(desc(messages.createdAt));
  }

  async getMessagesByTenant(tenantId: string): Promise<Message[]> {
    return db.select().from(messages)
      .where(eq(messages.tenantId, tenantId))
      .orderBy(desc(messages.createdAt));
  }

  async createMessage(message: InsertMessage): Promise<Message> {
    const [created] = await db.insert(messages).values(message).returning();
    return created;
  }

  async markMessageRead(id: string): Promise<Message | undefined> {
    const [updated] = await db.update(messages)
      .set({ isRead: true })
      .where(eq(messages.id, id))
      .returning();
    return updated;
  }

  async deleteMessage(id: string): Promise<boolean> {
    await db.delete(messages).where(eq(messages.id, id));
    return true;
  }

  async getSuggestion(id: string): Promise<Suggestion | undefined> {
    const [suggestion] = await db.select().from(suggestions).where(eq(suggestions.id, id));
    return suggestion;
  }

  async getSuggestionsByTenant(tenantId: string): Promise<Suggestion[]> {
    return db.select().from(suggestions)
      .where(eq(suggestions.tenantId, tenantId))
      .orderBy(desc(suggestions.createdAt));
  }

  async createSuggestion(suggestion: InsertSuggestion): Promise<Suggestion> {
    const [created] = await db.insert(suggestions).values(suggestion).returning();
    return created;
  }

  async updateSuggestion(id: string, data: Partial<InsertSuggestion>): Promise<Suggestion | undefined> {
    const [updated] = await db.update(suggestions).set(data).where(eq(suggestions.id, id)).returning();
    return updated;
  }

  async getAllSuggestions(): Promise<Suggestion[]> {
    return db.select().from(suggestions).orderBy(desc(suggestions.createdAt));
  }

  async deleteSuggestion(id: string): Promise<boolean> {
    await db.delete(suggestions).where(eq(suggestions.id, id));
    return true;
  }

  async getTutorial(id: string): Promise<Tutorial | undefined> {
    const [tutorial] = await db.select().from(tutorials).where(eq(tutorials.id, id));
    return tutorial;
  }

  async getAllTutorials(): Promise<Tutorial[]> {
    return db.select().from(tutorials)
      .where(eq(tutorials.isPublished, true))
      .orderBy(tutorials.order);
  }

  async createTutorial(tutorial: InsertTutorial): Promise<Tutorial> {
    const [created] = await db.insert(tutorials).values(tutorial).returning();
    return created;
  }

  async updateTutorial(id: string, data: Partial<InsertTutorial>): Promise<Tutorial | undefined> {
    const [updated] = await db.update(tutorials).set(data).where(eq(tutorials.id, id)).returning();
    return updated;
  }

  async deleteTutorial(id: string): Promise<boolean> {
    await db.delete(tutorials).where(eq(tutorials.id, id));
    return true;
  }

  async getSystemConfig(key: string): Promise<SystemConfig | undefined> {
    const [config] = await db.select().from(systemConfig).where(eq(systemConfig.key, key));
    return config;
  }

  async setSystemConfig(key: string, value: any): Promise<SystemConfig> {
    const existing = await this.getSystemConfig(key);
    if (existing) {
      const [updated] = await db.update(systemConfig)
        .set({ value, updatedAt: new Date() })
        .where(eq(systemConfig.key, key))
        .returning();
      return updated;
    }
    const [created] = await db.insert(systemConfig).values({ key, value }).returning();
    return created;
  }

  async getProductConnector(id: string): Promise<ProductConnector | undefined> {
    const [connector] = await db.select().from(productConnectors).where(eq(productConnectors.id, id));
    return connector;
  }

  async getAllProductConnectors(): Promise<ProductConnector[]> {
    return db.select().from(productConnectors).orderBy(desc(productConnectors.createdAt));
  }

  async getEnabledProductConnectors(): Promise<ProductConnector[]> {
    return db.select().from(productConnectors)
      .where(eq(productConnectors.isEnabled, true))
      .orderBy(desc(productConnectors.createdAt));
  }

  async createProductConnector(connector: InsertProductConnector): Promise<ProductConnector> {
    const [created] = await db.insert(productConnectors).values(connector).returning();
    return created;
  }

  async updateProductConnector(id: string, data: Partial<InsertProductConnector>): Promise<ProductConnector | undefined> {
    const [updated] = await db.update(productConnectors)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(productConnectors.id, id))
      .returning();
    return updated;
  }

  async deleteProductConnector(id: string): Promise<boolean> {
    await db.delete(productConnectors).where(eq(productConnectors.id, id));
    return true;
  }

  async getTenantByCode(code: string): Promise<Tenant | undefined> {
    const [tenant] = await db.select().from(tenants).where(eq(tenants.code, code));
    return tenant;
  }

  async getJoinRequest(id: string): Promise<JoinRequest | undefined> {
    const [request] = await db.select().from(joinRequests).where(eq(joinRequests.id, id));
    return request;
  }

  async getJoinRequestsByTenant(tenantId: string): Promise<JoinRequest[]> {
    return db.select().from(joinRequests)
      .where(eq(joinRequests.tenantId, tenantId))
      .orderBy(desc(joinRequests.createdAt));
  }

  async getJoinRequestsByUser(userId: string): Promise<JoinRequest[]> {
    return db.select().from(joinRequests)
      .where(eq(joinRequests.userId, userId))
      .orderBy(desc(joinRequests.createdAt));
  }

  async getPendingJoinRequestsByTenant(tenantId: string): Promise<JoinRequest[]> {
    return db.select().from(joinRequests)
      .where(and(eq(joinRequests.tenantId, tenantId), eq(joinRequests.status, "pending")))
      .orderBy(desc(joinRequests.createdAt));
  }

  async createJoinRequest(request: InsertJoinRequest): Promise<JoinRequest> {
    const [created] = await db.insert(joinRequests).values(request).returning();
    return created;
  }

  async updateJoinRequest(id: string, data: Partial<InsertJoinRequest>): Promise<JoinRequest | undefined> {
    const [updated] = await db.update(joinRequests).set(data).where(eq(joinRequests.id, id)).returning();
    return updated;
  }

  async deleteJoinRequest(id: string): Promise<boolean> {
    await db.delete(joinRequests).where(eq(joinRequests.id, id));
    return true;
  }
}

export const storage = new DatabaseStorage();
