'use client';

import React, { useState, useMemo } from 'react';
import { useAppStore } from '@/lib/store';
import { Expense } from '@/types/database';
import { formatINR, formatCompactINR } from '@/lib/currency';
import { exportExpensesToCSV } from '@/lib/utils';
import { Button } from '@/components/ui/Button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import {
  Download,
  Calendar,
  Filter,
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Tag,
  ArrowUpRight,
  ArrowDownRight,
  Sparkles,
  Wallet,
  Building,
  User,
} from 'lucide-react';
import {
  subMonths,
  startOfMonth,
  endOfMonth,
  isWithinInterval,
  parseISO,
  format,
} from 'date-fns';
import { ForecastingAnalysis } from './ForecastingAnalysis';

type TimeRange = 'this_month' | 'last_month' | 'last_3m' | 'last_6m' | 'last_12m' | 'all';

export function AnalyticsDashboard() {
  const { expenses, groups, categories, users, currentUser } = useAppStore();

  const [activeTab, setActiveTab] = useState<'overview' | 'forecasting'>('overview');
  const [timeRange, setTimeRange] = useState<TimeRange>('all');
  const [selectedGroupId, setSelectedGroupId] = useState<string>('all');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>('all');
  const [selectedUserId, setSelectedUserId] = useState<string>('all');
  const [viewScope, setViewScope] = useState<'my_share' | 'total_expense'>('my_share');

  // Filter expenses based on date range and filters
  const filteredExpenses = useMemo(() => {
    const now = new Date();

    return expenses.filter((exp) => {
      // 1. Group filter
      if (selectedGroupId !== 'all' && exp.group_id !== selectedGroupId) {
        return false;
      }

      // 2. Category filter
      if (selectedCategoryId !== 'all' && exp.category_id !== selectedCategoryId) {
        return false;
      }

      // 3. User filter (either paid or owes)
      if (selectedUserId !== 'all') {
        const isPayer = exp.payers.some((p) => p.user_id === selectedUserId);
        const isSplitter = exp.splits.some((s) => s.user_id === selectedUserId);
        if (!isPayer && !isSplitter) return false;
      }

      // 4. Date filter
      if (timeRange === 'all') return true;

      const expDate = parseISO(exp.date);
      if (timeRange === 'this_month') {
        return isWithinInterval(expDate, {
          start: startOfMonth(now),
          end: endOfMonth(now),
        });
      }
      if (timeRange === 'last_month') {
        const lastMonth = subMonths(now, 1);
        return isWithinInterval(expDate, {
          start: startOfMonth(lastMonth),
          end: endOfMonth(lastMonth),
        });
      }
      if (timeRange === 'last_3m') {
        return expDate >= subMonths(now, 3);
      }
      if (timeRange === 'last_6m') {
        return expDate >= subMonths(now, 6);
      }
      if (timeRange === 'last_12m') {
        return expDate >= subMonths(now, 12);
      }
      return true;
    });
  }, [expenses, timeRange, selectedGroupId, selectedCategoryId, selectedUserId]);

  // Aggregate KPIs
  const kpis = useMemo(() => {
    let totalSpend = 0;
    let myTotalShare = 0;
    let myTotalPaid = 0;

    filteredExpenses.forEach((exp) => {
      totalSpend += exp.amount;

      const mySplit = exp.splits.find((s) => s.user_id === currentUser.id);
      if (mySplit) myTotalShare += mySplit.amount_owed;

      const myPayer = exp.payers.find((p) => p.user_id === currentUser.id);
      if (myPayer) myTotalPaid += myPayer.amount_paid;
    });

    const activeSpend = viewScope === 'my_share' ? myTotalShare : totalSpend;
    const avgExpense = filteredExpenses.length > 0 ? activeSpend / filteredExpenses.length : 0;

    return {
      totalSpend,
      myTotalShare,
      myTotalPaid,
      activeSpend,
      avgExpense,
      count: filteredExpenses.length,
    };
  }, [filteredExpenses, viewScope, currentUser.id]);

  // Category Breakdown Data for Donut Chart
  const categoryData = useMemo(() => {
    const map = new Map<string, { name: string; value: number; color: string }>();

    filteredExpenses.forEach((exp) => {
      const cat = exp.category || categories.find((c) => c.id === exp.category_id) || {
        id: 'cat_other',
        name: 'Other',
        color: '#64748b',
      };

      const amount =
        viewScope === 'my_share'
          ? exp.splits.find((s) => s.user_id === currentUser.id)?.amount_owed || 0
          : exp.amount;

      if (amount <= 0) return;

      const existing = map.get(cat.id);
      if (existing) {
        existing.value += amount;
      } else {
        map.set(cat.id, {
          name: cat.name,
          value: amount,
          color: cat.color,
        });
      }
    });

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [filteredExpenses, viewScope, currentUser.id, categories]);

  // Monthly Spending Trend Data
  const monthlyData = useMemo(() => {
    const monthMap = new Map<string, number>();

    filteredExpenses.forEach((exp) => {
      const monthKey = format(parseISO(exp.date), 'MMM yyyy');
      const amount =
        viewScope === 'my_share'
          ? exp.splits.find((s) => s.user_id === currentUser.id)?.amount_owed || 0
          : exp.amount;

      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + amount);
    });

    return Array.from(monthMap.entries()).map(([month, amount]) => ({
      month,
      amount,
    }));
  }, [filteredExpenses, viewScope, currentUser.id]);

  // Spending by Group Data
  const groupData = useMemo(() => {
    const groupMap = new Map<string, number>();

    filteredExpenses.forEach((exp) => {
      const groupName = exp.group?.name || 'Individual Expenses';
      const amount =
        viewScope === 'my_share'
          ? exp.splits.find((s) => s.user_id === currentUser.id)?.amount_owed || 0
          : exp.amount;

      groupMap.set(groupName, (groupMap.get(groupName) || 0) + amount);
    });

    return Array.from(groupMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [filteredExpenses, viewScope, currentUser.id]);

  // Spending by Member Data
  const memberData = useMemo(() => {
    const memberMap = new Map<string, number>();

    filteredExpenses.forEach((exp) => {
      exp.payers.forEach((payer) => {
        const userName = payer.user?.full_name || 'Member';
        memberMap.set(userName, (memberMap.get(userName) || 0) + payer.amount_paid);
      });
    });

    return Array.from(memberMap.entries())
      .map(([name, paid]) => ({ name, paid }))
      .sort((a, b) => b.paid - a.paid);
  }, [filteredExpenses]);

  // Top 10 Expenses
  const topExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => b.amount - a.amount).slice(0, 10);
  }, [filteredExpenses]);

  // Automated Smart Insights
  const insights = useMemo(() => {
    const topCat = categoryData[0];
    const topGroup = groupData[0];
    const topPayer = memberData[0];

    const list = [];

    if (topCat && kpis.activeSpend > 0) {
      const pct = Math.round((topCat.value / kpis.activeSpend) * 100);
      list.push({
        title: `Dominant Category: ${topCat.name}`,
        desc: `${topCat.name} accounts for ${pct}% (${formatINR(topCat.value)}) of your spending.`,
        type: 'category',
      });
    }

    if (topGroup) {
      list.push({
        title: `Highest Spending Group: ${topGroup.name}`,
        desc: `Shared spend of ${formatINR(topGroup.amount)} in this timeframe.`,
        type: 'group',
      });
    }

    if (topPayer) {
      list.push({
        title: `Top Spender: ${topPayer.name}`,
        desc: `${topPayer.name} contributed ${formatINR(topPayer.paid)} in payments.`,
        type: 'member',
      });
    }

    return list;
  }, [categoryData, groupData, memberData, kpis.activeSpend]);

  const handleExportCSV = () => {
    exportExpensesToCSV(
      filteredExpenses,
      `rupeewise-expenses-${timeRange}-${format(new Date(), 'yyyy-MM-dd')}.csv`
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header & Scope Switch */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/80">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground flex items-center gap-2">
            Spending Analytics
            <span className="text-xs bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 px-2 py-0.5 rounded-full font-semibold">
              Live INR
            </span>
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Understand your shared and personal expenses with interactive charts and insights.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Scope Toggle: My Share vs Group Total */}
          <div className="flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
            <button
              onClick={() => setViewScope('my_share')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewScope === 'my_share'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              My Share
            </button>
            <button
              onClick={() => setViewScope('total_expense')}
              className={`px-3 py-1.5 rounded-md font-medium transition-all ${
                viewScope === 'total_expense'
                  ? 'bg-card text-foreground font-semibold shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              }`}
            >
              Total Bills
            </button>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={handleExportCSV}
            className="gap-1.5 text-xs font-semibold"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </Button>
        </div>
      </div>

      {/* Analytics Subnavigation Tabs */}
      <div className="flex border-b border-border/80 gap-6 text-xs font-semibold">
        <button
          type="button"
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-2 pb-2.5 border-b-2 transition-all ${
            activeTab === 'overview'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <PieIcon className="w-4 h-4" />
          <span>Category & Historical Breakdown</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('forecasting')}
          className={`flex items-center gap-2 pb-2.5 border-b-2 transition-all ${
            activeTab === 'forecasting'
              ? 'border-emerald-600 text-emerald-600 dark:text-emerald-400 font-bold'
              : 'border-transparent text-muted-foreground hover:text-foreground'
          }`}
        >
          <Sparkles className="w-4 h-4 text-emerald-500" />
          <span>Spending Forecast & Run-rate</span>
          <span className="text-[10px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 font-semibold px-2 py-0.5 rounded-full">
            Smart Benchmark
          </span>
        </button>
      </div>

      {activeTab === 'forecasting' ? (
        <ForecastingAnalysis
          expenses={expenses}
          viewScope={viewScope}
          userId={currentUser.id}
        />
      ) : (
        <>
          {/* Quick Forecast Teaser Banner */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 rounded-xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/10 via-card to-teal-500/5 text-xs">
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Sparkles className="w-4 h-4" />
              </div>
              <div>
                <span className="font-bold text-foreground">Want to predict your end-of-month spend? </span>
                <span className="text-muted-foreground">
                  Our Smart Forecast isolates one-time spikes (like Rent) from your daily burn rate.
                </span>
              </div>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setActiveTab('forecasting')}
              className="h-8 text-xs font-semibold shrink-0 bg-emerald-600 hover:bg-emerald-700 text-white border-transparent"
            >
              Open Forecast Engine →
            </Button>
          </div>

          {/* Filter Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-card border border-border shadow-2xs">
        {/* Timeframe */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Time Range</label>
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Time</option>
            <option value="this_month">This Month</option>
            <option value="last_month">Last Month</option>
            <option value="last_3m">Last 3 Months</option>
            <option value="last_6m">Last 6 Months</option>
            <option value="last_12m">Last 12 Months</option>
          </select>
        </div>

        {/* Group Filter */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Group</label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Groups</option>
            {groups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </div>

        {/* Category Filter */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Category</label>
          <select
            value={selectedCategoryId}
            onChange={(e) => setSelectedCategoryId(e.target.value)}
            className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {/* Member Filter */}
        <div>
          <label className="text-[11px] font-semibold text-muted-foreground mb-1 block">Participant</label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full h-8 rounded-lg border border-input bg-background px-2 text-xs font-medium focus:ring-1 focus:ring-ring"
          >
            <option value="all">All Participants</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">
              {viewScope === 'my_share' ? 'Your Total Share' : 'Total Group Spending'}
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {formatINR(kpis.activeSpend)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[11px] text-muted-foreground flex items-center gap-1">
              <TrendingUp className="w-3.5 h-3.5 text-emerald-600" />
              <span>Across {kpis.count} recorded expenses</span>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">You Actually Paid</CardDescription>
            <CardTitle className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {formatINR(kpis.myTotalPaid)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[11px] text-muted-foreground">
              Total upfront payments made by {currentUser.full_name.split(' ')[0]}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Net Spending Delta</CardDescription>
            <CardTitle className="text-2xl font-bold">
              {kpis.myTotalPaid - kpis.myTotalShare >= 0 ? (
                <span className="text-emerald-600 dark:text-emerald-400">
                  +{formatINR(kpis.myTotalPaid - kpis.myTotalShare)}
                </span>
              ) : (
                <span className="text-rose-500">
                  {formatINR(kpis.myTotalPaid - kpis.myTotalShare)}
                </span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[11px] text-muted-foreground">
              {kpis.myTotalPaid >= kpis.myTotalShare ? 'You paid more than your share' : 'Others paid for you'}
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium">Average Expense</CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {formatINR(kpis.avgExpense)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-[11px] text-muted-foreground">
              Average per transaction in filtered period
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Smart Insights Banner */}
      {insights.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {insights.map((ins, i) => (
            <div
              key={i}
              className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-500/5 border border-emerald-500/20 space-y-1"
            >
              <div className="text-xs font-bold text-emerald-800 dark:text-emerald-300 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5" />
                <span>{ins.title}</span>
              </div>
              <p className="text-xs text-muted-foreground">{ins.desc}</p>
            </div>
          ))}
        </div>
      )}

      {/* Main Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Category Donut Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Category Breakdown</span>
              <span className="text-xs text-muted-foreground font-normal">
                {viewScope === 'my_share' ? 'By Your Share' : 'By Total Bill'}
              </span>
            </CardTitle>
            <CardDescription className="text-xs">
              Distribution of spending across expense categories in INR
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {categoryData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No expense data for this selection.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={categoryData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {categoryData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(val: number) => [formatINR(val), 'Amount']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Monthly Spending Trend Bar Chart */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base flex items-center justify-between">
              <span>Monthly Spending Trend</span>
              <span className="text-xs text-muted-foreground font-normal">INR per Month</span>
            </CardTitle>
            <CardDescription className="text-xs">
              Spending trajectory over monthly billing cycles
            </CardDescription>
          </CardHeader>
          <CardContent className="h-72">
            {monthlyData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No monthly data available.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={monthlyData} margin={{ top: 10, right: 10, left: 10, bottom: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis dataKey="month" fontSize={11} tickLine={false} />
                  <YAxis
                    fontSize={11}
                    tickFormatter={(val) => formatCompactINR(val)}
                    tickLine={false}
                  />
                  <Tooltip
                    formatter={(val: number) => [formatINR(val), 'Spent']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="amount" fill="#10b981" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Spending by Group */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spending by Group</CardTitle>
            <CardDescription className="text-xs">
              Where your money is allocated across trips and flats
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {groupData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No group spending data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={groupData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    type="number"
                    tickFormatter={(val) => formatCompactINR(val)}
                    fontSize={11}
                  />
                  <YAxis type="category" dataKey="name" fontSize={11} width={90} />
                  <Tooltip
                    formatter={(val: number) => [formatINR(val), 'Spend']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="amount" fill="#3b82f6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>

        {/* Total Payments by Member */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upfront Payments by Member</CardTitle>
            <CardDescription className="text-xs">
              Total bill payments fronted by each member
            </CardDescription>
          </CardHeader>
          <CardContent className="h-64">
            {memberData.length === 0 ? (
              <div className="h-full flex items-center justify-center text-xs text-muted-foreground">
                No member payment data.
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={memberData}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                  <XAxis
                    type="number"
                    tickFormatter={(val) => formatCompactINR(val)}
                    fontSize={11}
                  />
                  <YAxis type="category" dataKey="name" fontSize={11} width={80} />
                  <Tooltip
                    formatter={(val: number) => [formatINR(val), 'Total Paid']}
                    contentStyle={{
                      backgroundColor: 'hsl(var(--card))',
                      borderColor: 'hsl(var(--border))',
                      borderRadius: '0.5rem',
                      fontSize: '12px',
                    }}
                  />
                  <Bar dataKey="paid" fill="#8b5cf6" radius={[0, 6, 6, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top 10 Expenses Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Top 10 Largest Expenses</CardTitle>
          <CardDescription className="text-xs">
            Highest transactions in filtered range
          </CardDescription>
        </CardHeader>
        <CardContent>
          {topExpenses.length === 0 ? (
            <div className="text-xs text-muted-foreground py-4 text-center">
              No expenses match current filters.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="text-[11px] text-muted-foreground uppercase border-b border-border">
                  <tr>
                    <th className="py-2.5 px-3">Date</th>
                    <th className="py-2.5 px-3">Description</th>
                    <th className="py-2.5 px-3">Category</th>
                    <th className="py-2.5 px-3">Group</th>
                    <th className="py-2.5 px-3">Paid By</th>
                    <th className="py-2.5 px-3 text-right">Total (INR)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {topExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-muted/40 transition-colors">
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                        {exp.date ? format(parseISO(exp.date), 'dd MMM yyyy') : '-'}
                      </td>
                      <td className="py-2.5 px-3 font-semibold text-foreground whitespace-nowrap">
                        {exp.description}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className="px-2 py-0.5 rounded-full text-[10px] font-medium"
                          style={{
                            backgroundColor: `${exp.category?.color || '#10b981'}20`,
                            color: exp.category?.color || '#10b981',
                          }}
                        >
                          {exp.category?.name || 'General'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                        {exp.group?.name || 'Individual'}
                      </td>
                      <td className="py-2.5 px-3 whitespace-nowrap text-muted-foreground">
                        {exp.payers.map((p) => p.user?.full_name || 'Member').join(', ')}
                      </td>
                      <td className="py-2.5 px-3 text-right font-bold text-foreground whitespace-nowrap">
                        {formatINR(exp.amount)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
        </>
      )}
    </div>
  );
}
