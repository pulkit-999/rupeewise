# RupeeWise (Splitwise Pro) 🇮🇳

A production-ready, full-stack expense sharing and spending analytics web application tailored for the Indian financial ecosystem. Built with Next.js 14 App Router, TypeScript, Tailwind CSS, Supabase PostgreSQL with Row Level Security (RLS), and Recharts.

![RupeeWise Dashboard Preview](https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?auto=format&fit=crop&w=1200&q=80)

---

## 🚀 Key Highlights & Features

### 1. Indian Financial System & INR Focus
- **Strict Indian Numbering**: Formats all amounts in Lakhs and Crores (`₹1,23,456.00` and `₹12.50L`, `₹1.20Cr`) via `Intl.NumberFormat('en-IN')`.
- **Paise-Accurate Precision**: All calculations convert Rupees to integer Paise internally (`toPaise` / `toRupees`) to prevent IEEE 754 floating-point inaccuracies.
- **UPI Integration**: First-class support for Indian UPI handles (`arjun@okhdfcbank`, `priya@icici`, GPay/PhonePe/Paytm), cash, and bank transfers for one-click settlement tracking.

### 2. Complex Split Mechanics
- **Equal Split**: Automatically rounds down to the nearest paisa and fairly distributes 1-paisa remainders to the first $k$ participants. Total owed always strictly matches total paid.
- **Exact Amounts**: Live discrepancy indicator validating that exact split sums match total bill down to the paisa.
- **Percentages**: Percentage-based distribution with automated discrepancy resolution.
- **Shares / Parts**: Proportional weight allocations (e.g., 2 shares for couples, 1 share for singles).
- **Multi-Payer Bills**: Supports expenses funded by multiple people with uneven contributions.

### 3. Debt Simplification Engine (Min Cash Flow)
- Uses an optimal greedy bipartite matching algorithm reducing $N(N-1)/2$ complex pairwise debts down to at most $N-1$ direct settlements.
- Includes a live toggle in groups to inspect raw debts vs. simplified debts with full transparency.
- Guaranteed zero-sum balance invariant $\sum \beta_i = 0$.

### 4. Interactive Spending Analytics Dashboard
- **Aggregate Metrics**: Total spend, average expense size, net balance, debts owed, debts to collect.
- **Interactive Visualizations**:
  - Donut chart with category distribution and custom INR tooltips.
  - Monthly spending trends bar chart with dual breakdown (total spend vs. your share).
  - Member expenditure comparison.
  - Group-by-group spending breakdown.
- **RFC-4180 CSV Exporter**: One-click download of all filtered expenses with properly formatted INR amounts.
- **Flexible Filters**: Filter by timeframe (This Month, Last Month, 3 Months, 6 Months, 12 Months, All Time), Group, and Category.

### 5. Social & Group Management
- **Group Categories**: Trip 🏖️, Flat/Home 🏠, Couple 💑, Event 🎉, Other.
- **Role-Based Access Control**: `owner`, `admin`, `member`.
- **Audit Activity Trail**: Real-time logging of created expenses, settlements, membership changes, and comments.
- **1-on-1 Friends Ledger**: Direct ledger with any friend outside groups.

---

## 🛠️ Tech Stack

| Layer | Technologies |
|---|---|
| **Framework** | Next.js 14 (App Router, Server & Client Components) |
| **Language** | TypeScript (Strict mode, ES2022 target) |
| **Styling** | Tailwind CSS, Lucide React Icons |
| **Database & Auth** | Supabase PostgreSQL with RLS, Stored Procedures, Aggregation Views |
| **Data Visualization** | Recharts |
| **Forms & Validation** | Zod, React Hook Form |
| **Date Utilities** | `date-fns` |
| **Testing** | Vitest (12 comprehensive unit tests for splits, math & debt simplification) |

---

## 📂 Project Structure

```
splitwise-pro/
├── src/
│   ├── app/
│   │   ├── layout.tsx              # Root layout with AppProvider & Navigation
│   │   ├── page.tsx                # Landing & redirection
│   │   ├── dashboard/page.tsx      # Main dashboard with balances, quick actions & feed
│   │   ├── groups/
│   │   │   ├── page.tsx            # Group listing & filter cards
│   │   │   └── [id]/page.tsx       # Group details: expenses, balances, debt simplification
│   │   ├── friends/page.tsx        # 1-on-1 friend ledger & balances
│   │   ├── analytics/page.tsx      # Spending Analytics dashboard
│   │   ├── activity/page.tsx       # Global audit trail
│   │   └── profile/page.tsx        # User profile, UPI ID & demo user switcher
│   ├── components/
│   │   ├── analytics/              # Recharts analytics charts & KPI widgets
│   │   ├── dashboard/              # Balance cards, quick actions, recent activity
│   │   ├── expenses/               # AddExpenseModal, ExpenseDetailModal, ExpenseItem
│   │   ├── friends/                # AddFriendModal
│   │   ├── groups/                 # CreateGroupModal, GroupBalances
│   │   ├── layout/                 # Navbar, Sidebar, MobileNav
│   │   ├── settlements/            # SettleModal (UPI, Cash, Bank Transfer)
│   │   └── ui/                     # Button, Input, Modal, Card, Badge, Avatar
│   ├── lib/
│   │   ├── currency.ts             # INR formatting, formatCompactINR, paise math
│   │   ├── debt-simplification.ts  # Min Cash Flow debt simplification algorithm
│   │   ├── mock-data.ts            # Realistic Indian demo seed data
│   │   ├── splits.ts               # Equal, exact, percentage, shares split engines
│   │   ├── store.tsx               # Reactive application store & localStorage cache
│   │   ├── supabase/               # Supabase browser & server clients
│   │   └── utils.ts                # Tailwind class merging & styling helpers
│   └── types/
│       └── database.ts             # TypeScript definitions for Supabase entities
├── supabase/
│   ├── migrations/
│   │   └── 20240101000000_init_schema.sql # Complete schema, RLS policies, views
│   └── seed.sql                    # Initial seed data for Goa trip, Indiranagar flat
├── tests/
│   ├── currency.test.ts            # INR formatting & paise precision tests
│   ├── debt-simplification.test.ts # Min Cash Flow algorithm correctness tests
│   └── splits.test.ts              # Split calculations & rounding invariant tests
├── .env.example
├── next.config.mjs
├── package.json
├── tailwind.config.ts
└── tsconfig.json
```

---

## 🏃 Getting Started

### 1. Prerequisites
- Node.js 18.x or 20+ (tested with Node v22.12.0)
- npm or pnpm

### 2. Installation
```bash
# Clone the repository
git clone https://github.com/your-username/splitwise-pro.git
cd splitwise-pro

# Install dependencies
npm install
```

### 3. Environment Variables
Create a `.env.local` file from `.env.example`:
```bash
cp .env.example .env.local
```

Fill in your Supabase credentials:
```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

> **Note on Demo Mode**: The application is built with a self-contained interactive demo store preloaded with realistic Indian transactions (Goa vacation, Bangalore apartment, Coorg trip). Even without connecting Supabase, all features (adding expenses, multi-payer splits, settlements, debt simplification, switching users, and analytics) work immediately out of the box!

### 4. Database Setup (Supabase)
To run with a live Supabase PostgreSQL backend:
1. Create a project in [Supabase](https://supabase.com).
2. Go to the **SQL Editor** in your Supabase dashboard.
3. Run the SQL schema from [`supabase/migrations/20240101000000_init_schema.sql`](supabase/migrations/20240101000000_init_schema.sql).
4. Run the demo seed script from [`supabase/seed.sql`](supabase/seed.sql).

### 5. Running the Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 🧪 Running Tests

The test suite validates financial correctness, penny reconciliation, and debt simplification invariants:
```bash
# Run tests with Vitest
npm test

# Run tests with coverage
npx vitest run
```

### Test Coverage Highlights:
- **`tests/splits.test.ts`**:
  - Equal split remainder distribution (₹100 split 3 ways yields ₹33.34, ₹33.33, ₹33.33 summing to exactly ₹100.00).
  - Exact split balance verification.
  - Percentage split decimal reconciliation.
  - Weighted share distribution.
- **`tests/debt-simplification.test.ts`**:
  - Cyclic debt simplification: $A \to B \to C \to A$ correctly collapses to 0 transactions.
  - Net balance conservation: total owed before and after simplification is identical.
  - Multi-payer expense ledger balancing.
- **`tests/currency.test.ts`**:
  - INR Indian numbering formatting (`₹1,23,456.00`).
  - Compact Indian currency (`₹1.5L`, `₹2.5Cr`, `₹4.5K`).
  - Integer paise conversions without IEEE 754 float drift.

---

## 🚢 Building & Deployment

### Production Build
```bash
npm run build
npm run start
```

### Deploy to Vercel
1. Push your repository to GitHub / GitLab.
2. Import the project into [Vercel](https://vercel.com).
3. Set the Environment Variables (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`).
4. Click **Deploy**. Vercel will automatically run `npm run build` and provision serverless edge functions.

---

## 🔒 Security & Row Level Security (RLS)

- **Strict Access Isolation**: All tables have RLS enabled. Users can only read expenses and settlements belonging to groups they are active members of.
- **Stored Procedures & Constraints**: Checks guarantee no self-friendships, positive amounts, valid percentages totaling 100%, and valid split shares.
- **Audit Logs**: All creations, deletions, and settlements generate immutable activity log entries.

---

## 📄 License
MIT License. Feel free to use and customize for your personal or commercial projects.

