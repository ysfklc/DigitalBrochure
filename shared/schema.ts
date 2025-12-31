import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  varchar,
  integer,
  boolean,
  timestamp,
  jsonb,
  decimal,
  pgEnum,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const userRoleEnum = pgEnum("user_role", [
  "super_admin",
  "tenant_admin",
  "tenant_user",
]);
export const subscriptionStatusEnum = pgEnum("subscription_status", [
  "active",
  "expired",
  "pending",
  "cancelled",
]);
export const subscriptionPlanEnum = pgEnum("subscription_plan", [
  "monthly",
  "six_month",
  "yearly",
]);
export const templateTypeEnum = pgEnum("template_type", [
  "single_page",
  "multi_page",
]);
export const campaignStatusEnum = pgEnum("campaign_status", [
  "draft",
  "active",
  "scheduled",
  "completed",
  "paused",
]);
export const tutorialTypeEnum = pgEnum("tutorial_type", [
  "video",
  "pdf",
  "announcement",
]);
export const joinRequestStatusEnum = pgEnum("join_request_status", [
  "pending",
  "approved",
  "rejected",
]);

export const tenants = pgTable("tenants", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  code: text("code").unique(),
  logoUrl: text("logo_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  mobilePhone: text("mobile_phone"),
  role: userRoleEnum("role").notNull().default("tenant_user"),
  totpSecret: text("totp_secret"),
  totpEnabled: boolean("totp_enabled").default(false),
  isActive: boolean("is_active").default(false),
  activationToken: text("activation_token"),
  activationTokenExpiry: timestamp("activation_token_expiry"),
  resetToken: text("reset_token"),
  resetTokenExpiry: timestamp("reset_token_expiry"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  language: text("language").default("en"),
});

export const joinRequests = pgTable("join_requests", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  tenantId: varchar("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  status: joinRequestStatusEnum("status").notNull().default("pending"),
  message: text("message"),
  reviewedBy: varchar("reviewed_by").references(() => users.id),
  reviewedAt: timestamp("reviewed_at"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const subscriptions = pgTable("subscriptions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  plan: subscriptionPlanEnum("plan").notNull(),
  status: subscriptionStatusEnum("status").notNull().default("pending"),
  pricePerMonth: decimal("price_per_month", {
    precision: 10,
    scale: 2,
  }).notNull(),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const products = pgTable("products", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  description: text("description"),
  category: text("category"),
  price: decimal("price", { precision: 10, scale: 2 }),
  discountPrice: decimal("discount_price", { precision: 10, scale: 2 }),
  discountPercentage: integer("discount_percentage"),
  imageUrl: text("image_url"),
  unit: text("unit"),
  isGlobal: boolean("is_global").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const templates = pgTable("templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  title: text("title").notNull(),
  type: templateTypeEnum("type").notNull(),
  labelTemplateId: varchar("label_template_id").references(
    () => priceTagTemplates.id,
  ),
  // Label/badge image for single-page templates
  labelImageUrl: text("label_image_url"),
  // Single-page template background image
  backgroundImageUrl: text("background_image_url"),
  // Multi-page template images
  coverPageImageUrl: text("cover_page_image_url"),
  middlePageImageUrl: text("middle_page_image_url"),
  finalPageImageUrl: text("final_page_image_url"),
  // Text styling configurations (stored as JSON)
  productTitleConfig: jsonb("product_title_config"),
  labelTextConfig: jsonb("label_text_config"),
  discountedPriceConfig: jsonb("discounted_price_config"),
  unitOfMeasureConfig: jsonb("unit_of_measure_config"),
  dateTextConfig: jsonb("date_text_config"),
  // Legacy fields for backward compatibility
  coverPageConfig: jsonb("cover_page_config"),
  innerPageConfig: jsonb("inner_page_config"),
  backPageConfig: jsonb("back_page_config"),
  priceTemplateConfig: jsonb("price_template_config"),
  fontFamily: text("font_family").default("Inter"),
  textColor: text("text_color").default("#000000"),
  backgroundColor: text("background_color").default("#ffffff"),
  thumbnailUrl: text("thumbnail_url"),
  isGlobal: boolean("is_global").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const campaigns = pgTable("campaigns", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id")
    .references(() => tenants.id)
    .notNull(),
  createdBy: varchar("created_by")
    .references(() => users.id)
    .notNull(),
  templateId: varchar("template_id").references(() => templates.id),
  name: text("name").notNull(),
  description: text("description"),
  type: templateTypeEnum("type"),
  status: campaignStatusEnum("status").notNull().default("draft"),
  language: text("language").default("tr"),
  currency: text("currency").default("₺"),
  startDate: timestamp("start_date"),
  endDate: timestamp("end_date"),
  canvasData: jsonb("canvas_data"),
  thumbnailUrl: text("thumbnail_url"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const priceTagTemplates = pgTable("price_tag_templates", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  name: text("name").notNull(),
  designConfig: jsonb("design_config"),
  thumbnailUrl: text("thumbnail_url"),
  isGlobal: boolean("is_global").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const campaignProducts = pgTable("campaign_products", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  campaignId: varchar("campaign_id")
    .references(() => campaigns.id)
    .notNull(),
  productId: varchar("product_id")
    .references(() => products.id)
    .notNull(),
  campaignPrice: decimal("campaign_price", { precision: 10, scale: 2 }),
  campaignDiscountPrice: decimal("campaign_discount_price", {
    precision: 10,
    scale: 2,
  }),
  priceTagTemplateId: varchar("price_tag_template_id").references(
    () => priceTagTemplates.id,
  ),
  positionX: integer("position_x"),
  positionY: integer("position_y"),
  width: integer("width"),
  height: integer("height"),
  pageNumber: integer("page_number").default(1),
});

export const messages = pgTable("messages", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  senderId: varchar("sender_id")
    .references(() => users.id)
    .notNull(),
  receiverId: varchar("receiver_id")
    .references(() => users.id)
    .notNull(),
  subject: text("subject"),
  content: text("content").notNull(),
  isRead: boolean("is_read").default(false),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const suggestions = pgTable("suggestions", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  tenantId: varchar("tenant_id").references(() => tenants.id),
  userId: varchar("user_id")
    .references(() => users.id)
    .notNull(),
  title: text("title").notNull(),
  content: text("content").notNull(),
  status: text("status").default("pending"),
  adminComment: text("admin_comment"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const tutorials = pgTable("tutorials", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  description: text("description"),
  type: tutorialTypeEnum("type").notNull(),
  contentUrl: text("content_url"),
  thumbnailUrl: text("thumbnail_url"),
  isPublished: boolean("is_published").default(true),
  order: integer("order").default(0),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const systemConfig = pgTable("system_config", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  key: text("key").notNull().unique(),
  value: jsonb("value"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const productConnectors = pgTable("product_connectors", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  description: text("description"),
  isEnabled: boolean("is_enabled").default(true),
  requestMethod: text("request_method").notNull().default("GET"),
  requestUrl: text("request_url").notNull(),
  requestHeaders: jsonb("request_headers").default({}),
  requestParams: jsonb("request_params").default([]),
  requestBody: text("request_body"),
  responseParser: text("response_parser").notNull(),
  fieldMappings: jsonb("field_mappings").notNull(),
  excludeFilters: jsonb("exclude_filters").default([]),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const tenantsRelations = relations(tenants, ({ many }) => ({
  users: many(users),
  subscriptions: many(subscriptions),
  products: many(products),
  templates: many(templates),
  campaigns: many(campaigns),
  joinRequests: many(joinRequests),
}));

export const usersRelations = relations(users, ({ one, many }) => ({
  tenant: one(tenants, { fields: [users.tenantId], references: [tenants.id] }),
  campaigns: many(campaigns),
  sentMessages: many(messages, { relationName: "sender" }),
  receivedMessages: many(messages, { relationName: "receiver" }),
  suggestions: many(suggestions),
  joinRequests: many(joinRequests),
}));

export const joinRequestsRelations = relations(joinRequests, ({ one }) => ({
  user: one(users, { fields: [joinRequests.userId], references: [users.id] }),
  tenant: one(tenants, {
    fields: [joinRequests.tenantId],
    references: [tenants.id],
  }),
  reviewer: one(users, {
    fields: [joinRequests.reviewedBy],
    references: [users.id],
  }),
}));

export const subscriptionsRelations = relations(subscriptions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [subscriptions.tenantId],
    references: [tenants.id],
  }),
}));

export const productsRelations = relations(products, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [products.tenantId],
    references: [tenants.id],
  }),
  campaignProducts: many(campaignProducts),
}));

export const templatesRelations = relations(templates, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [templates.tenantId],
    references: [tenants.id],
  }),
  labelTemplate: one(priceTagTemplates, {
    fields: [templates.labelTemplateId],
    references: [priceTagTemplates.id],
  }),
  campaigns: many(campaigns),
}));

export const campaignsRelations = relations(campaigns, ({ one, many }) => ({
  tenant: one(tenants, {
    fields: [campaigns.tenantId],
    references: [tenants.id],
  }),
  creator: one(users, {
    fields: [campaigns.createdBy],
    references: [users.id],
  }),
  template: one(templates, {
    fields: [campaigns.templateId],
    references: [templates.id],
  }),
  campaignProducts: many(campaignProducts),
}));

export const priceTagTemplatesRelations = relations(
  priceTagTemplates,
  ({ one, many }) => ({
    tenant: one(tenants, {
      fields: [priceTagTemplates.tenantId],
      references: [tenants.id],
    }),
    campaignProducts: many(campaignProducts),
  }),
);

export const campaignProductsRelations = relations(
  campaignProducts,
  ({ one }) => ({
    campaign: one(campaigns, {
      fields: [campaignProducts.campaignId],
      references: [campaigns.id],
    }),
    product: one(products, {
      fields: [campaignProducts.productId],
      references: [products.id],
    }),
    priceTagTemplate: one(priceTagTemplates, {
      fields: [campaignProducts.priceTagTemplateId],
      references: [priceTagTemplates.id],
    }),
  }),
);

export const messagesRelations = relations(messages, ({ one }) => ({
  tenant: one(tenants, {
    fields: [messages.tenantId],
    references: [tenants.id],
  }),
  sender: one(users, {
    fields: [messages.senderId],
    references: [users.id],
    relationName: "sender",
  }),
  receiver: one(users, {
    fields: [messages.receiverId],
    references: [users.id],
    relationName: "receiver",
  }),
}));

export const suggestionsRelations = relations(suggestions, ({ one }) => ({
  tenant: one(tenants, {
    fields: [suggestions.tenantId],
    references: [tenants.id],
  }),
  user: one(users, { fields: [suggestions.userId], references: [users.id] }),
}));

export const insertTenantSchema = createInsertSchema(tenants).omit({
  id: true,
  createdAt: true,
});
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});
export const insertJoinRequestSchema = createInsertSchema(joinRequests).omit({
  id: true,
  createdAt: true,
  reviewedAt: true,
});
export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({
  id: true,
  createdAt: true,
});
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
  createdAt: true,
});
export const insertTemplateSchema = createInsertSchema(templates).omit({
  id: true,
  createdAt: true,
});
export const insertCampaignSchema = createInsertSchema(campaigns).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
});
export const insertPriceTagTemplateSchema = createInsertSchema(
  priceTagTemplates,
).omit({ id: true, createdAt: true });
export const insertCampaignProductSchema = createInsertSchema(
  campaignProducts,
).omit({ id: true });
export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  createdAt: true,
});
export const insertSuggestionSchema = createInsertSchema(suggestions).omit({
  id: true,
  createdAt: true,
});
export const insertTutorialSchema = createInsertSchema(tutorials).omit({
  id: true,
  createdAt: true,
});
export const insertSystemConfigSchema = createInsertSchema(systemConfig).omit({
  id: true,
  updatedAt: true,
});
export const insertProductConnectorSchema = createInsertSchema(
  productConnectors,
).omit({ id: true, createdAt: true, updatedAt: true });

export type Tenant = typeof tenants.$inferSelect;
export type InsertTenant = z.infer<typeof insertTenantSchema>;
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type JoinRequest = typeof joinRequests.$inferSelect;
export type InsertJoinRequest = z.infer<typeof insertJoinRequestSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;
export type Template = typeof templates.$inferSelect;
export type InsertTemplate = z.infer<typeof insertTemplateSchema>;
export type Campaign = typeof campaigns.$inferSelect;
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type PriceTagTemplate = typeof priceTagTemplates.$inferSelect;
export type InsertPriceTagTemplate = z.infer<
  typeof insertPriceTagTemplateSchema
>;
export type CampaignProduct = typeof campaignProducts.$inferSelect;
export type InsertCampaignProduct = z.infer<typeof insertCampaignProductSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Suggestion = typeof suggestions.$inferSelect;
export type InsertSuggestion = z.infer<typeof insertSuggestionSchema>;
export type Tutorial = typeof tutorials.$inferSelect;
export type InsertTutorial = z.infer<typeof insertTutorialSchema>;
export type SystemConfig = typeof systemConfig.$inferSelect;
export type InsertSystemConfig = z.infer<typeof insertSystemConfigSchema>;
export type ProductConnector = typeof productConnectors.$inferSelect;
export type InsertProductConnector = z.infer<
  typeof insertProductConnectorSchema
>;

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(6),
  captchaToken: z.string().optional(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  mobilePhone: z.string().optional(),
  captchaToken: z.string().optional(),
  signupType: z.enum(["create_tenant", "join_tenant"]).optional(),
  tenantCode: z.string().optional(),
  joinMessage: z.string().optional(),
});

export const resetPasswordSchema = z.object({
  email: z.string().email(),
  captchaToken: z.string().optional(),
});

export const verifyTotpSchema = z.object({
  token: z.string().length(6),
});

export const tenantSetupSchema = z.object({
  name: z
    .string()
    .min(2, "Organization name must be at least 2 characters")
    .max(100),
  slug: z
    .string()
    .min(3, "Slug must be at least 3 characters")
    .max(50, "Slug must be less than 50 characters")
    .regex(
      /^[a-z0-9-]+$/,
      "Slug can only contain lowercase letters, numbers, and hyphens",
    )
    .transform((val) => val.toLowerCase().trim()),
});

export type LoginInput = z.infer<typeof loginSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
export type VerifyTotpInput = z.infer<typeof verifyTotpSchema>;
