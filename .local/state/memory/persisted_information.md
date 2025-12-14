# Persisted Information - e-Brochure Application

## Current State (December 14, 2025)
The application is a multi-tenant e-brochure/digital catalog creation platform running on port 5000.

## Recent Fixes Applied

### Campaign Saving Fix (Latest - December 14, 2025)
**Issue**: Campaign name was being saved as empty string, and user reported it showed "campaigns.untitled"

**Root cause**: `handleSave` in `campaign-editor.tsx` only showed the name dialog when `!campaignName && !savedCampaignId && id === "new"`. After first save, `savedCampaignId` was set, so dialog never showed again.

**Fix applied**: Changed condition to `!campaignName.trim()` to always prompt when name is empty.

**Canvas data**: Verified working correctly - logs confirm elements array with x, y, width, height, rotation, opacity, data, page are all saved properly to canvasData jsonb field.

### Previous Fixes
1. Fixed apiRequest issue - mutations were calling `.json()` on already-parsed JSON
2. Added tenantId validation in POST /api/campaigns
3. Improved canvas data serialization with all element properties

## Key Files
- `client/src/pages/campaign-editor.tsx` - Campaign editor with save dialog
- `server/routes.ts` - Backend API routes
- `client/src/lib/i18n.ts` - Translations (EN, TR, DE)
- `shared/schema.ts` - Database schema (campaigns has canvasData jsonb)
- `server/storage.ts` - Database operations
- `.local/state/replit/agent/progress_tracker.md` - Full task history (22 items)

## Architecture
- Frontend: React + Vite + TypeScript + shadcn/ui
- Backend: Express.js with JWT authentication
- Database: PostgreSQL with Drizzle ORM
- Super admin: superadmin@example.com / Super12345

## Notes
- User needs tenant membership to create campaigns (not super_admin)
- Canvas editor supports drag-drop products with full element manipulation