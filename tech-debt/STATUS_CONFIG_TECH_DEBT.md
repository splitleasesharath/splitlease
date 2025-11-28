# Tech Debt: Proposal Status Configuration

## Issue
The current implementation uses a static JavaScript object (`proposalStatusConfig.js`) to define proposal status configurations, including:
- Status text values
- Guest action labels
- Usual order for sorting

## Background
Bubble.io uses "Option Sets" - a database-driven configuration that allows admins to modify status labels, actions, and ordering without code changes. Our current implementation hardcodes these values.

## Future Consideration
Consider migrating status configuration to a database-driven approach:

1. **Supabase Table Option**: Create a `proposal_status_config` table:
   ```sql
   CREATE TABLE proposal_status_config (
     id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
     status_key TEXT UNIQUE NOT NULL,
     display_label TEXT NOT NULL,
     usual_order INTEGER NOT NULL,
     guest_action_1 TEXT NOT NULL DEFAULT 'Invisible',
     guest_action_2 TEXT NOT NULL DEFAULT 'Invisible',
     is_terminal BOOLEAN DEFAULT FALSE,
     created_at TIMESTAMPTZ DEFAULT NOW()
   );
   ```

2. **Benefits**:
   - Admin can modify status labels without deploys
   - Can add new statuses without code changes
   - Matches Bubble's flexibility

3. **Trade-offs**:
   - Additional database query on page load
   - Need caching strategy
   - More complex than current static approach

## Current Implementation
- File: `app/src/config/proposalStatusConfig.js`
- Pattern: Static config object with helper functions

## Priority
Low - Current implementation works. Revisit if frequent status changes are needed.

---
*Created: 2025-11-27*
