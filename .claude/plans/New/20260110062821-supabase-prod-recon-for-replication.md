# Supabase Production Database Reconnaissance

**Date**: 2026-01-10
**Project ID**: qcfifybkaddcoimjroca (Production)
**Purpose**: Planning data for CLI-based prod-to-dev replication workflow

---

## 1. Database Tables (Public Schema)

**Total**: 67 tables | **67,200 rows**

### By Row Count (Descending)

| Table Name | Rows | RLS Enabled |
|------------|-----:|:-----------:|
| num | 22,973 | No |
| bookings_stays | 17,601 | No |
| _message | 6,074 | Yes |
| listing_photo | 4,604 | Yes |
| paymentrecords | 4,015 | No |
| zat_aisuggestions | 2,323 | No |
| datacollection_searchlogging | 1,682 | No |
| user | 951 | No |
| thread | 800 | Yes |
| proposal | 739 | Yes |
| pricing_list | 528 | No |
| virtualmeetingschedulesandlinks | 386 | No |
| negotiationsummary | 375 | No |
| multimessage | 359 | Yes |
| listing | 312 | Yes |
| visit | 298 | No |
| knowledgebaselineitem | 272 | No |
| narration | 252 | No |
| rentalapplication | 231 | No |
| dailycounter | 205 | No |
| bookings_leases | 197 | No |
| Listing_data_photos_backup | 197 | No |
| housemanual | 195 | No |
| qrcodes | 177 | No |
| file | 128 | No |
| notificationsettingsos_lists_ | 126 | No |
| updatestodocuments | 125 | No |
| sync_queue | 119 | Yes |
| datechangerequest | 99 | No |
| ratingdetail_reviews_ | 93 | No |
| informationaltexts | 84 | No |
| referral | 83 | No |
| zat_features_amenity | 61 | No |
| knowledgebase | 56 | No |
| occupant | 50 | No |
| state | 50 | No |
| remindersfromhousemanual | 48 | No |
| mailing_list_opt_in | 39 | No |
| emergencyreports | 34 | No |
| hostrestrictions | 33 | No |
| mainreview | 32 | No |
| co_hostrequest | 26 | No |
| proxysmssession | 22 | No |
| reviewslistingsexternal | 22 | No |
| paymentsfromdatechanges | 18 | No |
| emailtemplate_postmark_ | 15 | No |
| fieldsforleasedocuments | 14 | No |
| savedsearch | 14 | No |
| documentssent | 13 | No |
| postmark_loginbound | 10 | No |
| notification_preferences | 7 | Yes |
| listing_drafts | 6 | Yes |
| sync_config | 5 | Yes |
| housemanualphotos | 4 | No |
| waitlistsubmission | 3 | No |
| ai_parsing_queue | 3 | Yes |
| workflow_definitions | 3 | Yes |
| guest_inquiry | 3 | No |
| experiencesurvey | 2 | No |
| internalfiles | 2 | No |
| invoices | 2 | No |
| email | 0 | No |
| emailtemplates_category_postmark_ | 0 | No |
| zat_blocked_vm_bookingtimes | 0 | No |
| audit_log | 0 | No |
| external_reviews | 0 | Yes |
| workflow_executions | 0 | Yes |

### Tables with RLS Enabled (12 tables)

These require special handling during replication:

1. `_message` (6,074 rows)
2. `listing_photo` (4,604 rows)
3. `thread` (800 rows)
4. `proposal` (739 rows)
5. `multimessage` (359 rows)
6. `listing` (312 rows)
7. `sync_queue` (119 rows)
8. `notification_preferences` (7 rows)
9. `listing_drafts` (6 rows)
10. `sync_config` (5 rows)
11. `ai_parsing_queue` (3 rows)
12. `workflow_definitions` (3 rows)
13. `external_reviews` (0 rows)
14. `workflow_executions` (0 rows)

---

## 2. Installed Database Extensions

**Active Extensions** (installed_version not null):

| Extension | Version | Schema | Purpose |
|-----------|---------|--------|---------|
| pg_cron | 1.6.4 | pg_catalog | Job scheduler for PostgreSQL |
| plpgsql | 1.0 | pg_catalog | PL/pgSQL procedural language |
| pgcrypto | 1.3 | extensions | Cryptographic functions |
| pg_graphql | 1.5.11 | graphql | GraphQL support |
| pg_stat_statements | 1.11 | extensions | SQL execution statistics |
| pg_net | 0.19.5 | extensions | Async HTTP requests |
| pgmq | 1.4.4 | pgmq | Lightweight message queue |
| uuid-ossp | 1.1 | extensions | UUID generation |
| supabase_vault | 0.3.1 | vault | Supabase Vault for secrets |

**Critical for Replication**:
- `pg_cron` - Need to recreate cron jobs
- `pgmq` - Queue system may have state
- `supabase_vault` - Secrets must be manually set in dev

---

## 3. Edge Functions (22 Functions)

| Function Slug | JWT Verify | Version | Status |
|---------------|:----------:|--------:|--------|
| ai-gateway | Yes | 49 | ACTIVE |
| ai-parse-profile | No | 20 | ACTIVE |
| ai-signup-guest | No | 39 | ACTIVE |
| auth-user | No | 55 | ACTIVE |
| bubble-auth-proxy | No | 55 | ACTIVE |
| bubble_sync | No | 30 | ACTIVE |
| cohost-request | No | 28 | ACTIVE |
| cohost-request-slack-callback | Yes | 12 | ACTIVE |
| communications | No | 3 | ACTIVE |
| date-change-request | Yes | 1 | ACTIVE |
| listing | No | 44 | ACTIVE |
| messages | Yes | 31 | ACTIVE |
| pricing | Yes | 16 | ACTIVE |
| proposal | No | 67 | ACTIVE |
| rental-application | Yes | 23 | ACTIVE |
| send-email | No | 28 | ACTIVE |
| send-sms | No | 16 | ACTIVE |
| slack | No | 36 | ACTIVE |
| virtual-meeting | No | 27 | ACTIVE |
| workflow-enqueue | No | 13 | ACTIVE |
| workflow-orchestrator | No | 14 | ACTIVE |
| zap-auth-user | Yes | 18 | ACTIVE |

**Functions with JWT Verification (7)**:
- ai-gateway, cohost-request-slack-callback, date-change-request, messages, pricing, rental-application, zap-auth-user

---

## 4. Data Volume Summary

| Category | Count |
|----------|------:|
| Total Tables | 67 |
| Total Rows | 67,200 |
| Tables with RLS | 14 |
| Tables > 1000 rows | 7 |
| Empty Tables | 4 |
| Edge Functions | 22 |
| Active Extensions | 9 |

### Large Tables (>1000 rows)

| Table | Rows | % of Total |
|-------|-----:|:----------:|
| num | 22,973 | 34.2% |
| bookings_stays | 17,601 | 26.2% |
| _message | 6,074 | 9.0% |
| listing_photo | 4,604 | 6.9% |
| paymentrecords | 4,015 | 6.0% |
| zat_aisuggestions | 2,323 | 3.5% |
| datacollection_searchlogging | 1,682 | 2.5% |

Top 7 tables contain **88.3%** of all data.

---

## 5. Replication Considerations

### Schema-Only Tables (Skip Data)
These are likely transient/operational and don't need data replication:
- `sync_queue` - Temporary sync operations
- `audit_log` - Can start fresh
- `workflow_executions` - Runtime state
- `ai_parsing_queue` - Processing queue

### Environment Variables Required
Edge functions will need these secrets in dev:
- `SUPABASE_URL` / `SUPABASE_ANON_KEY` / `SUPABASE_SERVICE_ROLE_KEY`
- `OPENAI_API_KEY` (for ai-* functions)
- `SLACK_WEBHOOK_URL` (for slack, cohost-request-slack-callback)
- `POSTMARK_API_KEY` (for send-email)
- `TWILIO_*` (for send-sms)
- `BUBBLE_API_KEY` (for bubble-* functions)

### FK Constraint Order
Tables with foreign keys must be loaded in dependency order. Key relationships:
- `user` <- `_message`, `thread`, `proposal`, `listing`
- `listing` <- `listing_photo`, `proposal`, `booking_stays`
- `thread` <- `_message`, `multimessage`

---

## 6. CLI Workflow Recommendations

### Phase 1: Schema Export
```bash
# From production project
supabase db dump --project-ref qcfifybkaddcoimjroca -f schema.sql --schema public
```

### Phase 2: Data Export (Large Tables)
```bash
# Export specific tables with pg_dump
pg_dump -h db.qcfifybkaddcoimjroca.supabase.co -U postgres -d postgres \
  --data-only --table=public.user --table=public.listing > data.sql
```

### Phase 3: Apply to Dev
```bash
# Apply schema
supabase db push --project-ref <dev-project-id>

# Apply data
psql -h db.<dev-project-id>.supabase.co -U postgres -d postgres < data.sql
```

### Phase 4: Edge Functions
```bash
# Deploy all functions to dev
supabase functions deploy --project-ref <dev-project-id>
```

---

## Referenced Files

- `supabase/functions/` - All 22 edge functions
- `supabase/migrations/` - Database migrations
- `.claude/plans/New/20260109143200-supabase-replication-cli-workflow-current.md` - Related planning doc
