-- ====================================================================
-- RupeeWise / Splitwise-Pro: Realistic Seed Data for Indian Users & Groups
-- Pre-loaded with INR transactions, multi-payer bills, and settlements
-- ====================================================================

-- 1. Insert Demo Users
INSERT INTO public.users (id, email, full_name, avatar_url, default_currency, upi_id, phone)
VALUES 
    ('a0000000-0000-0000-0000-000000000001', 'arjun@example.com', 'Arjun Mehta', 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150', 'INR', 'arjun@okhdfcbank', '+91 98765 43210'),
    ('a0000000-0000-0000-0000-000000000002', 'priya@example.com', 'Priya Sharma', 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150', 'INR', 'priya@icici', '+91 98765 43211'),
    ('a0000000-0000-0000-0000-000000000003', 'rohan@example.com', 'Rohan Verma', 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150', 'INR', 'rohan@oksbi', '+91 98765 43212'),
    ('a0000000-0000-0000-0000-000000000004', 'sneha@example.com', 'Sneha Patel', 'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150', 'INR', 'sneha@paytm', '+91 98765 43213')
ON CONFLICT (id) DO NOTHING;

-- 2. Insert Friendships
INSERT INTO public.friendships (id, user_id, friend_id, status)
VALUES
    ('f0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'accepted'),
    ('f0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'accepted'),
    ('f0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'accepted')
ON CONFLICT (id) DO NOTHING;

-- 3. Insert Groups
INSERT INTO public.groups (id, name, description, type, currency, created_by)
VALUES
    ('g0000000-0000-0000-0000-000000000001', 'Goa Beach Holiday 🏖️', 'Baga beach, villas, seafood and scootering in North Goa', 'trip', 'INR', 'a0000000-0000-0000-0000-000000000001'),
    ('g0000000-0000-0000-0000-000000000002', 'Flat 402 Indiranagar 🏠', 'Shared flat expenses, bills, WiFi and groceries in Bangalore', 'home', 'INR', 'a0000000-0000-0000-0000-000000000001'),
    ('g0000000-0000-0000-0000-000000000003', 'Coorg Weekend Drive 🌲', 'Coffee estate homestay and trekking', 'trip', 'INR', 'a0000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

-- 4. Insert Group Members
INSERT INTO public.group_members (id, group_id, user_id, role)
VALUES
    -- Goa group
    ('m0000000-0000-0000-0000-000000000001', 'g0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 'owner'),
    ('m0000000-0000-0000-0000-000000000002', 'g0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 'admin'),
    ('m0000000-0000-0000-0000-000000000003', 'g0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'member'),
    ('m0000000-0000-0000-0000-000000000004', 'g0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 'member'),
    -- Flat group
    ('m0000000-0000-0000-0000-000000000005', 'g0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 'owner'),
    ('m0000000-0000-0000-0000-000000000006', 'g0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000003', 'member'),
    -- Coorg group
    ('m0000000-0000-0000-0000-000000000007', 'g0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000002', 'owner'),
    ('m0000000-0000-0000-0000-000000000008', 'g0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 'member'),
    ('m0000000-0000-0000-0000-000000000009', 'g0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000004', 'member')
ON CONFLICT (id) DO NOTHING;

-- 5. Insert Expenses
-- Expense 1: Goa Luxury Villa (₹24,000 paid by Arjun, equal split)
INSERT INTO public.expenses (id, group_id, description, amount, currency, date, category_id, split_type, created_by)
VALUES ('e0000000-0000-0000-0000-000000000001', 'g0000000-0000-0000-0000-000000000001', 'Candolim Luxury Villa Stay', 24000.00, 'INR', '2024-03-10 14:30:00+00', 'cat_travel', 'equal', 'a0000000-0000-0000-0000-000000000001')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.expense_payers (expense_id, user_id, amount_paid)
VALUES ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 24000.00)
ON CONFLICT (expense_id, user_id) DO NOTHING;

INSERT INTO public.expense_splits (expense_id, user_id, amount_owed)
VALUES 
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000001', 6000.00),
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000002', 6000.00),
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 6000.00),
    ('e0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000004', 6000.00)
ON CONFLICT (expense_id, user_id) DO NOTHING;

-- Expense 2: Seafood Dinner (₹7,200 paid by Priya, equal split)
INSERT INTO public.expenses (id, group_id, description, amount, currency, date, category_id, split_type, created_by)
VALUES ('e0000000-0000-0000-0000-000000000002', 'g0000000-0000-0000-0000-000000000001', 'Fisherman''s Wharf Seafood Dinner', 7200.00, 'INR', '2024-03-11 21:00:00+00', 'cat_food', 'equal', 'a0000000-0000-0000-0000-000000000002')
ON CONFLICT (id) DO NOTHING;

INSERT INTO public.expense_payers (expense_id, user_id, amount_paid)
VALUES ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 7200.00)
ON CONFLICT (expense_id, user_id) DO NOTHING;

INSERT INTO public.expense_splits (expense_id, user_id, amount_owed)
VALUES 
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000001', 1800.00),
    ('e0000000-0000-0000-0000-000000000002', 'a0000000-0000-0000-0000-000000000002', 1800.00),
    ('e0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000003', 1800.00),
    ('e0000000-0000-0000-0000-000000000004', 'a0000000-0000-0000-0000-000000000004', 1800.00)
ON CONFLICT (expense_id, user_id) DO NOTHING;

-- 6. Insert Settlements
INSERT INTO public.settlements (id, group_id, payer_id, receiver_id, amount, currency, payment_method, reference_note)
VALUES ('s0000000-0000-0000-0000-000000000001', 'g0000000-0000-0000-0000-000000000001', 'a0000000-0000-0000-0000-000000000003', 'a0000000-0000-0000-0000-000000000001', 5000.00, 'INR', 'upi', 'Paid via Google Pay UPI Ref: 408123984')
ON CONFLICT (id) DO NOTHING;
