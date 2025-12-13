# e-Brochure

## Overview

e-Brochure is a multi-tenant SaaS application for creating digital brochures and promotional posters. Users can dynamically design brochures on a canvas interface, manage products with automatic pricing, organize campaigns, and share content to social media platforms. The platform features a subscription-based model with iyzico payment integration and supports three user roles: Super Admin, Tenant Admin, and Tenant User.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for lightweight client-side routing
- **State Management**: TanStack React Query for server state management
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with CSS variables for theming (light/dark mode support)
- **Forms**: React Hook Form with Zod validation
- **Internationalization**: i18next for multi-language support (English, Turkish, German)

### Backend Architecture
- **Runtime**: Node.js with Express.js
- **Language**: TypeScript with ESM modules
- **API Design**: RESTful API endpoints under `/api` prefix
- **Session Management**: Express sessions with JWT tokens for authentication
- **Security**: bcryptjs for password hashing, speakeasy for TOTP-based 2FA

### Data Storage
- **Database**: PostgreSQL
- **ORM**: Drizzle ORM with drizzle-kit for migrations
- **Schema Location**: `shared/schema.ts` contains all table definitions and Zod validation schemas
- **Key Entities**: Users, Tenants, Subscriptions, Products, Templates, Campaigns, Messages, Suggestions, Tutorials, System Config

### Authentication & Authorization
- **Authentication Flow**: Email/password login with mandatory TOTP-based 2FA
- **Account Activation**: Email verification required after registration
- **Password Reset**: Time-limited reset tokens (3 hours validity)
- **Role-Based Access**: Three roles with hierarchical permissions
  - Super Admin: Full system access, can manage all tenants
  - Tenant Admin: Full access within their tenant
  - Tenant User: Limited access within their tenant

### Multi-Tenancy
- Tenant isolation at the database level via `tenantId` foreign keys
- Each tenant has their own users, products, templates, and campaigns
- Super Admin can switch between tenants for management purposes

### Build System
- **Development**: Vite dev server with HMR
- **Production**: Custom build script (`script/build.ts`) using esbuild for server bundling and Vite for client
- **Output**: Server compiled to `dist/index.cjs`, client assets to `dist/public`

## External Dependencies

### Payment Gateway
- **iyzico**: Turkish payment gateway for subscription payments
- Configuration managed via Super Admin interface

### Database
- **PostgreSQL**: Primary data store
- Connection via `DATABASE_URL` environment variable

### Email Service
- **Nodemailer**: For sending activation emails, password reset links, and notifications

### Authentication Libraries
- **speakeasy**: TOTP generation and verification for 2FA
- **jsonwebtoken**: JWT token generation and validation

### AI Services (Optional)
- **OpenAI** and **Google Generative AI**: Listed as dependencies for potential AI features

### Social Media Integration
- Designed for sharing campaigns to Instagram and Facebook (implementation pending)