-- ============================================================================
-- Seed Initial Workflow Definitions
-- Split Lease - Workflow Orchestration System
-- Created: 2025-12-13
-- ============================================================================

INSERT INTO workflow_definitions (name, description, steps, required_fields, timeout_seconds, visibility_timeout, max_retries)
VALUES
-- Proposal Accepted Workflow
(
    'proposal_accepted',
    'Sends email notification when a proposal is accepted',
    '[
        {
            "name": "send_acceptance_email",
            "function": "send-email",
            "action": "send",
            "payload_template": {
                "template_id": "{{email_template_id}}",
                "to_email": "{{guest_email}}",
                "to_name": "{{guest_name}}",
                "variables": {
                    "guest_name": "{{guest_name}}",
                    "host_name": "{{host_name}}",
                    "listing_address": "{{listing_address}}",
                    "start_date": "{{start_date}}",
                    "end_date": "{{end_date}}",
                    "monthly_rent": "{{monthly_rent}}"
                }
            },
            "on_failure": "retry"
        }
    ]'::jsonb,
    ARRAY['guest_email', 'guest_name', 'email_template_id'],
    300,
    60,
    3
),

-- Listing Submitted Workflow
(
    'listing_submitted',
    'Handles post-listing submission tasks: email confirmation, Slack notification',
    '[
        {
            "name": "send_confirmation_email",
            "function": "send-email",
            "action": "send",
            "payload_template": {
                "template_id": "{{email_template_id}}",
                "to_email": "{{host_email}}",
                "to_name": "{{host_name}}",
                "variables": {
                    "host_name": "{{host_name}}",
                    "listing_address": "{{listing_address}}",
                    "listing_id": "{{listing_id}}"
                }
            },
            "on_failure": "continue"
        },
        {
            "name": "notify_slack",
            "function": "slack",
            "action": "faq_inquiry",
            "payload_template": {
                "message": "New listing submitted: {{listing_address}} by {{host_name}}",
                "channel": "acquisition"
            },
            "on_failure": "continue"
        }
    ]'::jsonb,
    ARRAY['host_email', 'host_name', 'listing_address', 'listing_id', 'email_template_id'],
    600,
    60,
    3
),

-- User Signup Workflow
(
    'user_signup_complete',
    'Post-signup tasks: welcome email',
    '[
        {
            "name": "send_welcome_email",
            "function": "send-email",
            "action": "send",
            "payload_template": {
                "template_id": "{{welcome_email_template_id}}",
                "to_email": "{{user_email}}",
                "to_name": "{{user_name}}",
                "variables": {
                    "first_name": "{{first_name}}",
                    "signup_date": "{{signup_date}}"
                }
            },
            "on_failure": "retry"
        }
    ]'::jsonb,
    ARRAY['user_email', 'user_name', 'first_name', 'welcome_email_template_id'],
    300,
    60,
    3
)
ON CONFLICT (name) DO NOTHING;

-- Log completion
DO $$
BEGIN
    RAISE LOG 'Seeded % workflow definitions', (SELECT COUNT(*) FROM workflow_definitions);
END $$;
