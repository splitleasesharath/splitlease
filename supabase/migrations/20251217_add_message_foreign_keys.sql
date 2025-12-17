-- Migration: Add Foreign Key Constraints to _message Table
-- Created: 2025-12-17
-- Description: Creates foreign key relationships for _message table to user and thread tables

-- ============================================
-- FOREIGN KEY CONSTRAINTS FOR _message TABLE
-- ============================================

-- Note: Column names in this table have special characters (leading dashes and slashes)
-- They must be properly quoted using double quotes

-- Foreign key: "-Guest User" -> user._id
ALTER TABLE public._message
ADD CONSTRAINT fk_message_guest_user
FOREIGN KEY ("-Guest User")
REFERENCES public."user" (_id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Foreign key: "-Host User" -> user._id
ALTER TABLE public._message
ADD CONSTRAINT fk_message_host_user
FOREIGN KEY ("-Host User")
REFERENCES public."user" (_id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Foreign key: "-Originator User" -> user._id
ALTER TABLE public._message
ADD CONSTRAINT fk_message_originator_user
FOREIGN KEY ("-Originator User")
REFERENCES public."user" (_id)
ON DELETE SET NULL
ON UPDATE CASCADE;

-- Foreign key: "Associated Thread/Conversation" -> thread._id
ALTER TABLE public._message
ADD CONSTRAINT fk_message_thread
FOREIGN KEY ("Associated Thread/Conversation")
REFERENCES public.thread (_id)
ON DELETE CASCADE
ON UPDATE CASCADE;

-- ============================================
-- CREATE INDEXES FOR FOREIGN KEY COLUMNS
-- ============================================
-- Adding indexes on foreign key columns improves join performance

-- Index on "-Guest User" (if not exists)
CREATE INDEX IF NOT EXISTS idx_message_guest_user
ON public._message ("-Guest User");

-- Index on "-Host User" (if not exists)
CREATE INDEX IF NOT EXISTS idx_message_host_user
ON public._message ("-Host User");

-- Index on "-Originator User" (if not exists)
CREATE INDEX IF NOT EXISTS idx_message_originator_user
ON public._message ("-Originator User");

-- Index on "Associated Thread/Conversation" (if not exists)
CREATE INDEX IF NOT EXISTS idx_message_thread
ON public._message ("Associated Thread/Conversation");

-- ============================================
-- VERIFICATION COMMENTS
-- ============================================
-- After running this migration, verify with:
--
-- SELECT
--     tc.constraint_name,
--     tc.table_name,
--     kcu.column_name,
--     ccu.table_name AS foreign_table_name,
--     ccu.column_name AS foreign_column_name
-- FROM information_schema.table_constraints AS tc
-- JOIN information_schema.key_column_usage AS kcu
--     ON tc.constraint_name = kcu.constraint_name
-- JOIN information_schema.constraint_column_usage AS ccu
--     ON ccu.constraint_name = tc.constraint_name
-- WHERE tc.constraint_type = 'FOREIGN KEY'
--     AND tc.table_name = '_message';
