# Persisted Information - e-Brochure Application

## Current State
The application is a multi-tenant e-brochure/digital catalog creation platform running on port 5000.

## Recent Changes (December 14, 2025)

### Campaign Saving Fix
1. **Fixed apiRequest issue**: Mutations in `client/src/pages/campaign-editor.tsx` were calling `.json()` on already-parsed JSON. Fixed by removing redundant `.json()` calls.

2. **Added tenantId validation**: `server/routes.ts` POST `/api/campaigns` now checks for tenantId before creating campaign.

3. **Added campaign name prompt dialog**: 
   - New state: `showSaveDialog`, `tempCampaignName`
   - Dialog prompts for campaign name when saving new campaigns
   - Added `handleSaveDialogConfirm` function

4. **Improved canvas data serialization**: `performSave` maps all element properties (id, type, x, y, width, height, rotation, opacity, data, page)

5. **Added translations** in `client/src/lib/i18n.ts` for English, Turkish, German

## Key Files
- `client/src/pages/campaign-editor.tsx` - Campaign editor with save dialog
- `server/routes.ts` - Backend API routes
- `client/src/lib/i18n.ts` - Translations
- `shared/schema.ts` - Database schema
- `server/storage.ts` - Database operations

## Architecture
- Frontend: React + Vite + TypeScript + shadcn/ui
- Backend: Express.js with JWT authentication
- Database: PostgreSQL with Drizzle ORM
- Super admin: superadmin@example.com / Super12345

## Progress
See `.local/state/replit/agent/progress_tracker.md` for full task history.

## Notes
- User needs tenant membership to create campaigns (not super_admin)
- Canvas editor supports drag-drop products with full element manipulation