-- ====================================================================
-- RupeeWise / Splitwise-Pro: PostgreSQL Schema with Row Level Security (RLS)
-- Optimized for Indian Rupee (INR) amounts with numeric(12,2) precision
-- ====================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. CURRENCIES TABLE
CREATE TABLE IF NOT EXISTS public.currencies (
    code VARCHAR(3) PRIMARY KEY,
    name VARCHAR(50) NOT NULL,
    symbol VARCHAR(5) NOT NULL,
    decimal_digits INT NOT NULL DEFAULT 2
);

INSERT INTO public.currencies (code, name, symbol, decimal_digits)
VALUES 
    ('INR', 'Indian Rupee', '₹', 2),
    ('USD', 'US Dollar', '$', 2),
    ('EUR', 'Euro', '€', 2),
    ('GBP', 'British Pound', '£', 2)
ON CONFLICT (code) DO NOTHING;

-- 2. USERS PROFILE TABLE
CREATE TABLE IF NOT EXISTS public.users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    default_currency VARCHAR(3) NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code),
    upi_id TEXT,
    phone TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_users_email ON public.users(email);

-- 3. FRIENDSHIPS TABLE
CREATE TABLE IF NOT EXISTS public.friendships (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    friend_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    status TEXT NOT NULL CHECK (status IN ('pending', 'accepted', 'declined')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_friendship UNIQUE (user_id, friend_id),
    CONSTRAINT no_self_friendship CHECK (user_id != friend_id)
);

CREATE INDEX IF NOT EXISTS idx_friendships_user ON public.friendships(user_id);
CREATE INDEX IF NOT EXISTS idx_friendships_friend ON public.friendships(friend_id);

-- 4. GROUPS TABLE
CREATE TABLE IF NOT EXISTS public.groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL CHECK (type IN ('trip', 'home', 'couple', 'event', 'other')),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code),
    avatar_url TEXT,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_groups_created_by ON public.groups(created_by);

-- 5. GROUP MEMBERS TABLE
CREATE TABLE IF NOT EXISTS public.group_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'member')),
    joined_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_group_member UNIQUE (group_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_group_members_group ON public.group_members(group_id);
CREATE INDEX IF NOT EXISTS idx_group_members_user ON public.group_members(user_id);

-- 6. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    icon TEXT NOT NULL,
    color TEXT NOT NULL
);

INSERT INTO public.categories (id, name, icon, color) VALUES
    ('cat_food', 'Food & Dining', 'Utensils', '#f59e0b'),
    ('cat_groceries', 'Groceries & Supplies', 'ShoppingBag', '#10b981'),
    ('cat_travel', 'Travel & Trips', 'Plane', '#3b82f6'),
    ('cat_rent', 'Rent & Utilities', 'Home', '#8b5cf6'),
    ('cat_entertainment', 'Entertainment & Movies', 'Film', '#ec4899'),
    ('cat_transport', 'Cab & Transport', 'Car', '#06b6d4'),
    ('cat_shopping', 'Shopping', 'Tag', '#6366f1'),
    ('cat_other', 'General & Others', 'Receipt', '#64748b')
ON CONFLICT (id) DO NOTHING;

-- 7. EXPENSES TABLE
CREATE TABLE IF NOT EXISTS public.expenses (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code),
    date TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    category_id TEXT NOT NULL REFERENCES public.categories(id),
    notes TEXT,
    receipt_url TEXT,
    split_type TEXT NOT NULL CHECK (split_type IN ('equal', 'exact', 'percentage', 'shares')),
    created_by UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_expenses_group ON public.expenses(group_id);
CREATE INDEX IF NOT EXISTS idx_expenses_date ON public.expenses(date);
CREATE INDEX IF NOT EXISTS idx_expenses_category ON public.expenses(category_id);
CREATE INDEX IF NOT EXISTS idx_expenses_created_by ON public.expenses(created_by);

-- 8. EXPENSE PAYERS (supports multi-payer bills)
CREATE TABLE IF NOT EXISTS public.expense_payers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount_paid NUMERIC(12, 2) NOT NULL CHECK (amount_paid >= 0),
    CONSTRAINT unique_expense_payer UNIQUE (expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_payers_expense ON public.expense_payers(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_payers_user ON public.expense_payers(user_id);

-- 9. EXPENSE SPLITS (what each person owes)
CREATE TABLE IF NOT EXISTS public.expense_splits (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    amount_owed NUMERIC(12, 2) NOT NULL CHECK (amount_owed >= 0),
    percentage NUMERIC(5, 2),
    shares NUMERIC(8, 2),
    CONSTRAINT unique_expense_split UNIQUE (expense_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_expense_splits_expense ON public.expense_splits(expense_id);
CREATE INDEX IF NOT EXISTS idx_expense_splits_user ON public.expense_splits(user_id);

-- 10. SETTLEMENTS TABLE
CREATE TABLE IF NOT EXISTS public.settlements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE SET NULL,
    payer_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    receiver_id UUID NOT NULL REFERENCES public.users(id) ON DELETE RESTRICT,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    currency VARCHAR(3) NOT NULL DEFAULT 'INR' REFERENCES public.currencies(code),
    payment_method TEXT NOT NULL CHECK (payment_method IN ('upi', 'cash', 'bank_transfer', 'other')),
    reference_note TEXT,
    settled_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT no_self_settlement CHECK (payer_id != receiver_id)
);

CREATE INDEX IF NOT EXISTS idx_settlements_group ON public.settlements(group_id);
CREATE INDEX IF NOT EXISTS idx_settlements_payer ON public.settlements(payer_id);
CREATE INDEX IF NOT EXISTS idx_settlements_receiver ON public.settlements(receiver_id);
CREATE INDEX IF NOT EXISTS idx_settlements_settled_at ON public.settlements(settled_at);

-- 11. EXPENSE COMMENTS
CREATE TABLE IF NOT EXISTS public.expense_comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    expense_id UUID NOT NULL REFERENCES public.expenses(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    comment TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_expense_comments_expense ON public.expense_comments(expense_id);

-- 12. ACTIVITY LOG TABLE
CREATE TABLE IF NOT EXISTS public.activity_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    group_id UUID REFERENCES public.groups(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    entity_type TEXT NOT NULL CHECK (entity_type IN ('expense', 'settlement', 'group', 'friend')),
    entity_id UUID NOT NULL,
    action TEXT NOT NULL CHECK (action IN ('created', 'updated', 'deleted')),
    details JSONB NOT NULL DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE INDEX IF NOT EXISTS idx_activity_logs_group ON public.activity_logs(group_id);
CREATE INDEX IF NOT EXISTS idx_activity_logs_created_at ON public.activity_logs(created_at DESC);

-- 13. BUDGETS TABLE (OPTIONAL)
CREATE TABLE IF NOT EXISTS public.budgets (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    amount NUMERIC(12, 2) NOT NULL CHECK (amount > 0),
    month DATE NOT NULL, -- e.g. '2024-03-01'
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT unique_user_category_month_budget UNIQUE (user_id, category_id, month)
);

-- ====================================================================
-- ANALYTICS VIEWS
-- ====================================================================

-- View 1: Category monthly spending summary
CREATE OR REPLACE VIEW public.view_category_monthly_spending AS
SELECT 
    e.category_id,
    c.name AS category_name,
    c.color AS category_color,
    c.icon AS category_icon,
    date_trunc('month', e.date)::DATE AS spend_month,
    e.group_id,
    SUM(es.amount_owed) AS total_spent,
    COUNT(DISTINCT e.id) AS expense_count
FROM public.expenses e
JOIN public.expense_splits es ON e.id = es.expense_id
JOIN public.categories c ON e.category_id = c.id
GROUP BY e.category_id, c.name, c.color, c.icon, date_trunc('month', e.date), e.group_id;

-- View 2: Member Net Balances Per Group
CREATE OR REPLACE VIEW public.view_group_member_balances AS
WITH paid_totals AS (
    SELECT 
        e.group_id,
        ep.user_id,
        COALESCE(SUM(ep.amount_paid), 0) AS total_paid
    FROM public.expenses e
    JOIN public.expense_payers ep ON e.id = ep.expense_id
    WHERE e.group_id IS NOT NULL
    GROUP BY e.group_id, ep.user_id
),
owed_totals AS (
    SELECT 
        e.group_id,
        es.user_id,
        COALESCE(SUM(es.amount_owed), 0) AS total_owed
    FROM public.expenses e
    JOIN public.expense_splits es ON e.id = es.expense_id
    WHERE e.group_id IS NOT NULL
    GROUP BY e.group_id, es.user_id
),
settlement_paid AS (
    SELECT 
        s.group_id,
        s.payer_id AS user_id,
        COALESCE(SUM(s.amount), 0) AS settled_sent
    FROM public.settlements s
    WHERE s.group_id IS NOT NULL
    GROUP BY s.group_id, s.payer_id
),
settlement_received AS (
    SELECT 
        s.group_id,
        s.receiver_id AS user_id,
        COALESCE(SUM(s.amount), 0) AS settled_got
    FROM public.settlements s
    WHERE s.group_id IS NOT NULL
    GROUP BY s.group_id, s.receiver_id
)
SELECT 
    gm.group_id,
    gm.user_id,
    u.full_name,
    u.avatar_url,
    COALESCE(p.total_paid, 0) AS total_paid,
    COALESCE(o.total_owed, 0) AS total_owed,
    COALESCE(sp.settled_sent, 0) AS settled_sent,
    COALESCE(sr.settled_got, 0) AS settled_got,
    (COALESCE(p.total_paid, 0) - COALESCE(o.total_owed, 0) + COALESCE(sp.settled_sent, 0) - COALESCE(sr.settled_got, 0)) AS net_balance
FROM public.group_members gm
JOIN public.users u ON gm.user_id = u.id
LEFT JOIN paid_totals p ON gm.group_id = p.group_id AND gm.user_id = p.user_id
LEFT JOIN owed_totals o ON gm.group_id = o.group_id AND gm.user_id = o.user_id
LEFT JOIN settlement_paid sp ON gm.group_id = sp.group_id AND gm.user_id = sp.user_id
LEFT JOIN settlement_received sr ON gm.group_id = sr.group_id AND gm.user_id = sr.user_id;

-- ====================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ====================================================================

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.friendships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expenses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_payers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_splits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settlements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.expense_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budgets ENABLE ROW LEVEL SECURITY;

-- Users policies
CREATE POLICY "Users can view profile of friends and group members"
    ON public.users FOR SELECT
    USING (true); -- Authenticated users can view public profile details

CREATE POLICY "Users can update own profile"
    ON public.users FOR UPDATE
    USING (auth.uid() = id);

-- Groups policies
CREATE POLICY "Users can view groups they belong to"
    ON public.groups FOR SELECT
    USING (
        id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
        OR created_by = auth.uid()
    );

CREATE POLICY "Users can create groups"
    ON public.groups FOR INSERT
    WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Owners and admins can update groups"
    ON public.groups FOR UPDATE
    USING (
        id IN (
            SELECT group_id FROM public.group_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Group members policies
CREATE POLICY "Users can view members of groups they belong to"
    ON public.group_members FOR SELECT
    USING (
        group_id IN (
            SELECT group_id FROM public.group_members WHERE user_id = auth.uid()
        )
    );

CREATE POLICY "Admins or owners can manage group members"
    ON public.group_members FOR ALL
    USING (
        group_id IN (
            SELECT group_id FROM public.group_members 
            WHERE user_id = auth.uid() AND role IN ('owner', 'admin')
        )
    );

-- Expenses policies
CREATE POLICY "Users can view expenses of groups they belong to or direct splits"
    ON public.expenses FOR SELECT
    USING (
        group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
        OR id IN (SELECT expense_id FROM public.expense_splits WHERE user_id = auth.uid())
        OR id IN (SELECT expense_id FROM public.expense_payers WHERE user_id = auth.uid())
    );

CREATE POLICY "Members can insert expenses into their groups"
    ON public.expenses FOR INSERT
    WITH CHECK (
        group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
        OR auth.uid() = created_by
    );

-- Expense splits policies
CREATE POLICY "Users can view splits for visible expenses"
    ON public.expense_splits FOR SELECT
    USING (
        expense_id IN (
            SELECT id FROM public.expenses WHERE 
                group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
                OR created_by = auth.uid()
        )
    );

-- Settlements policies
CREATE POLICY "Users can view settlements they are part of or within their group"
    ON public.settlements FOR SELECT
    USING (
        payer_id = auth.uid()
        OR receiver_id = auth.uid()
        OR group_id IN (SELECT group_id FROM public.group_members WHERE user_id = auth.uid())
    );

CREATE POLICY "Users can record settlements"
    ON public.settlements FOR INSERT
    WITH CHECK (auth.uid() = payer_id);
