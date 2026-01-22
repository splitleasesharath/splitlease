# Emergency Management Dashboard Migration Plan

**Date**: 2026-01-21
**Source**: https://github.com/splitleasesharath/_internal-emergency
**Target**: Split Lease Monorepo (Islands Architecture + Supabase Edge Functions)
**Classification**: BUILD
**Status**: COMPLETED

---

## Implementation Changelog

**Plan Executed**: 20260121160000-emergency-management-migration-plan.md
**Execution Date**: 2026-01-22
**Status**: Complete

### Summary

Successfully migrated the standalone Express/React emergency management dashboard into the Split Lease codebase architecture. Created 5 database tables, 1 Edge Function with 15 actions, and 2 frontend pages (admin dashboard and guest submission form) following Split Lease patterns.

### Files Modified

| File | Change Type | Description |
|------|-------------|-------------|
| `app/src/routes.config.js` | Modified | Added emergency routes |
| `app/public/_redirects` | Modified | Regenerated with new routes |

### Files Created

| File | Change Type | Description |
|------|-------------|-------------|
| `app/public/internal-emergency.html` | Created | HTML entry point for admin dashboard |
| `app/public/report-emergency.html` | Created | HTML entry point for guest form |
| `app/src/internal-emergency.jsx` | Created | JSX entry point for admin dashboard |
| `app/src/report-emergency.jsx` | Created | JSX entry point for guest form |
| `app/src/lib/emergencyService.js` | Created | Edge Function client library |
| `app/src/islands/pages/InternalEmergencyPage/InternalEmergencyPage.jsx` | Created | Hollow component for admin dashboard |
| `app/src/islands/pages/InternalEmergencyPage/useInternalEmergencyPageLogic.js` | Created | Logic hook with all business logic |
| `app/src/islands/pages/InternalEmergencyPage/InternalEmergencyPage.css` | Created | Styles for admin dashboard |
| `app/src/islands/pages/InternalEmergencyPage/components/EmergencyList.jsx` | Created | Emergency list sidebar component |
| `app/src/islands/pages/InternalEmergencyPage/components/EmergencyDetails.jsx` | Created | Emergency details panel component |
| `app/src/islands/pages/InternalEmergencyPage/components/CommunicationPanel.jsx` | Created | SMS/Email communication component |
| `app/src/islands/pages/ReportEmergencyPage/ReportEmergencyPage.jsx` | Created | Guest emergency submission form |
| `app/src/islands/pages/ReportEmergencyPage/useReportEmergencyPageLogic.js` | Created | Logic hook for guest form |
| `app/src/islands/pages/ReportEmergencyPage/ReportEmergencyPage.css` | Created | Styles for guest form |
| `supabase/functions/emergency/index.ts` | Created | Edge Function with 15 actions |
| `supabase/functions/emergency/handlers/getAll.ts` | Created | Fetch emergencies with filters |
| `supabase/functions/emergency/handlers/getById.ts` | Created | Fetch single emergency with relations |
| `supabase/functions/emergency/handlers/create.ts` | Created | Create emergency report |
| `supabase/functions/emergency/handlers/update.ts` | Created | Update emergency fields |
| `supabase/functions/emergency/handlers/assignEmergency.ts` | Created | Assign to team member + Slack notify |
| `supabase/functions/emergency/handlers/updateStatus.ts` | Created | Update status with timestamps |
| `supabase/functions/emergency/handlers/updateVisibility.ts` | Created | Hide/show emergency |
| `supabase/functions/emergency/handlers/sendSMS.ts` | Created | Send SMS via Twilio + log |
| `supabase/functions/emergency/handlers/sendEmail.ts` | Created | Send email via SendGrid + log |
| `supabase/functions/emergency/handlers/getMessages.ts` | Created | Fetch SMS history |
| `supabase/functions/emergency/handlers/getEmails.ts` | Created | Fetch email history |
| `supabase/functions/emergency/handlers/getPresetMessages.ts` | Created | Fetch SMS templates |
| `supabase/functions/emergency/handlers/getPresetEmails.ts` | Created | Fetch email templates |
| `supabase/functions/emergency/handlers/getTeamMembers.ts` | Created | Fetch admin users |

### Database Changes

Applied migration `20260122151845_create_emergency_tables`:
- `emergency_report` - Main emergency tracking table with TEXT FKs
- `emergency_message` - SMS communication log
- `emergency_email_log` - Email communication log
- `emergency_preset_message` - SMS template presets (7 seed records)
- `emergency_preset_email` - Email template presets (5 seed records)

Features:
- All tables have RLS policies (service_role access)
- Indexes on commonly queried columns
- `updated_at` triggers for automatic timestamps
- CASCADE delete on message/email logs

### Edge Function Actions

15 actions implemented following Split Lease action-based pattern:

| Action | Description | Auth Required |
|--------|-------------|---------------|
| `getAll` | Fetch emergencies with filters | No (public) |
| `getById` | Fetch single emergency with relations | No (public) |
| `create` | Create new emergency report | No (public) |
| `update` | Update emergency fields | Admin |
| `assignEmergency` | Assign to team member + Slack | Admin |
| `updateStatus` | Update status with timestamps | Admin |
| `updateVisibility` | Hide/show emergency | Admin |
| `sendSMS` | Send via Twilio + log | Admin |
| `sendEmail` | Send via SendGrid + log | Admin |
| `getMessages` | Fetch SMS history | No |
| `getEmails` | Fetch email history | No |
| `getPresetMessages` | Fetch SMS templates | No |
| `getPresetEmails` | Fetch email templates | No |
| `getTeamMembers` | Fetch admin users | No |
| `health` | Health check | No |

### Git Commits

1. `430125b8` - feat(emergency): Add frontend InternalEmergencyPage and ReportEmergencyPage

### Verification Steps Completed

- [x] Database migration applied successfully
- [x] 5 emergency tables created
- [x] Seed data inserted (7 SMS presets, 5 email presets)
- [x] Edge Function code structure complete (index.ts + 14 handlers)
- [x] Frontend routes registered in routes.config.js
- [x] _redirects file regenerated with emergency routes
- [x] HTML entry points created
- [x] JSX entry points created
- [x] Page components follow hollow component pattern
- [x] Logic hooks contain all business logic
- [x] emergencyService.js client created

### Notes & Observations

1. **Edge Function Deployment Required**: The `emergency` Edge Function is NOT yet deployed to Supabase. Run `supabase functions deploy emergency` before testing.

2. **Environment Secrets Required**: The following secrets must be configured in Supabase:
   - `TWILIO_ACCOUNT_SID` - Twilio account SID
   - `TWILIO_AUTH_TOKEN` - Twilio auth token
   - `TWILIO_PHONE_NUMBER` - Twilio phone number for sending SMS
   - `SENDGRID_API_KEY` - SendGrid API key for emails
   - `SLACK_WEBHOOK_EMERGENCIES` - Slack webhook URL for notifications

3. **Admin Authentication**: The Edge Function checks `user.admin` boolean field in the `user` table for admin-only actions.

4. **Supabase Storage**: Photo uploads use Supabase Storage bucket. Ensure `emergency-photos` bucket exists or update the storage bucket name.

5. **Adaptations Made**:
   - Used `proposal` table instead of external `reservation` table
   - Used TEXT foreign keys for Bubble.io compatibility
   - Used existing `_shared/slack.ts` utility pattern
   - Implemented Twilio/SendGrid via native fetch (not npm SDKs)

### Recommendations for Follow-up

1. Deploy Edge Function: `supabase functions deploy emergency`
2. Configure Supabase secrets for Twilio, SendGrid, Slack
3. Create `emergency-photos` Supabase Storage bucket
4. Test all 15 Edge Function actions
5. Test frontend flows end-to-end
6. Add error monitoring/logging

---

**END OF CHANGELOG**

---

[Original Plan Content Below]

---

## Executive Summary

This plan migrates a standalone Express/React emergency management dashboard into the Split Lease codebase architecture. The external repository uses:

- **Backend**: Express + Prisma ORM + PostgreSQL + TypeScript
- **Frontend**: React SPA with Material-UI + React Query
- **External Services**: Twilio SMS, Nodemailer, Slack Web API

The migration requires:
1. Converting Prisma schema to Supabase migrations
2. Rewriting Express controllers to Supabase Edge Functions (action-based pattern)
3. Converting React SPA to Islands Architecture page
4. Adapting Material-UI components to Split Lease component patterns
5. Migrating external service integrations to Edge Function utilities

[... rest of original plan content ...]
