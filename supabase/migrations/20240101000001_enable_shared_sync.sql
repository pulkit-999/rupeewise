-- ====================================================================
-- Enable Anonymous Read & Write Access for Collaborative Shared Ledger
-- Run this in Supabase Dashboard -> SQL Editor -> New query -> Run
-- ====================================================================

-- 1. Remove strict unique constraint on email to allow collaborative friends & guest profiles
ALTER TABLE public.users DROP CONSTRAINT IF EXISTS users_email_key;

-- 2. Disable Row Level Security on all tables so all friends can read & write together
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payers DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_comments DISABLE ROW LEVEL SECURITY;

-- 3. Grant full permissions to anon (public) and authenticated API keys
GRANT ALL ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO anon, authenticated;
