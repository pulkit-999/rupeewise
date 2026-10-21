'use client';

import React, { useState, useMemo } from 'react';
import { Expense } from '@/types/database';
import { formatINR, formatCompactINR } from '@/lib/currency';
import {
  calculateSpendingForecast,
  SpendingForecastResult,
  OneTimeExpenseCandidate,
} from '@/lib/forecasting';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import {
  AreaChart,
  Area,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  Sparkles,
  SlidersHorizontal,
  Info,
  Calendar,
  CheckCircle2,
  XCircle,
  ArrowUpRight,
  ArrowDownRight,
  ShieldCheck,
  Building,
  Plane,
  AlertTriangle,
  Flame,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface ForecastingAnalysisProps {
  expenses: Expense[];
  viewScope: 'my_share' | 'total_expense';
  userId?: string;
}

export function ForecastingAnalysis({
  expenses,
  viewScope,
  userId,
}: ForecastingAnalysisProps) {
  // State for user-controlled exclusions
  const [autoDetectOutliers, setAutoDetectOutliers] = useState(true);
  const [manuallyExcludedIds, setManuallyExcludedIds] = useState<string[] | null>(null);
  const [showNaiveComparison, setShowNaiveComparison] = useState(true);
  const [showOtherExpenses, setShowOtherExpenses] = useState(false);

  // Calculate forecast
  const forecast: SpendingForecastResult = useMemo(() => {
    return calculateSpendingForecast(expenses, {
      viewScope,
      userId,
      autoDetectOutliers,
      excludedExpenseIds: manuallyExcludedIds !== null ? manuallyExcludedIds : undefined,
    });
  }, [expenses, viewScope, userId, autoDetectOutliers, manuallyExcludedIds]);

  // Current excluded IDs set for easy lookup
  const currentExcludedSet = useMemo(() => {
    if (manuallyExcludedIds !== null) {
      return new Set(manuallyExcludedIds);
    }
    return new Set(
      forecast.detectedOneTimeExpenses
        .filter((c) => c.isExcludedFromRunRate)
        .map((c) => c.expense.id)
    );
  }, [manuallyExcludedIds, forecast.detectedOneTimeExpenses]);

  // Toggle exclusion for an individual expense
  const toggleExpenseExclusion = (expenseId: string) => {
    const nextSet = new Set(currentExcludedSet);
    if (nextSet.has(expenseId)) {
      nextSet.delete(expenseId);
    } else {
      nextSet.add(expenseId);
    }
    setManuallyExcludedIds(Array.from(nextSet));
  };

  // Reset to auto-detection recommendations
  const handleResetToAuto = () => {
    setManuallyExcludedIds(null);
    setAutoDetectOutliers(true);
  };

  // Non-detected current month expenses for manual exclusion picker
  const nonDetectedExpenses = useMemo(() => {
    const detectedIds = new Set(forecast.detectedOneTimeExpenses.map((c) => c.expense.id));
    return forecast.allCurrentMonthExpenses.filter(
      (item) => !detectedIds.has(item.expense.id) && item.effectiveAmount > 0
    );
  }, [forecast.detectedOneTimeExpenses, forecast.allCurrentMonthExpenses]);

  const distortionSaved = Math.max(
    0,
    forecast.naiveProjectedMonthEndSpend - forecast.projectedMonthEndSpend
  );

  return (
    <div className="space-y-6">
      {/* Section Header & Explanatory Banner */}
      <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/10 via-card to-teal-500/5 p-4 sm:p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-600 text-white shadow-xs">
                <Sparkles className="h-4 w-4" />
              </span>
              <h2 className="text-lg font-bold tracking-tight text-foreground">
                Intelligent Spending Forecast
              </h2>
              <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300">
                Outlier Isolated
              </span>
            </div>
            <p className="text-xs text-muted-foreground max-w-2xl">
              Accurately projects your end-of-month spend using a variable daily burn-rate.
              High one-time payments (like <strong>Rent</strong>, <strong>Security Deposits</strong>, or <strong>Flights</strong>) are accounted for, but isolated from multiplying your future daily benchmark.
            </p>
          </div>

          {/* Master Toggle */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => {
                const nextState = !autoDetectOutliers;
                setAutoDetectOutliers(nextState);
                if (!nextState) {
                  setManuallyExcludedIds([]);
                } else {
                  setManuallyExcludedIds(null);
                }
              }}
              className={`flex items-center gap-2 rounded-xl border px-3 py-2 text-xs font-semibold transition-all ${
                autoDetectOutliers
                  ? 'border-emerald-500 bg-emerald-50 text-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200'
                  : 'border-border bg-card text-muted-foreground hover:bg-muted/40'
              }`}
            >
              <ShieldCheck className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
              <span>
                {autoDetectOutliers ? 'Smart Benchmark: Active' : 'Naive Run-Rate: Active'}
              </span>
            </button>
          </div>
        </div>

        {/* Distortion Callout Banner */}
        {autoDetectOutliers && distortionSaved > 0 && (
          <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl bg-card/80 border border-emerald-500/20 p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/60 dark:text-emerald-300 font-bold text-[10px]">
                ✓
              </span>
              <span className="text-muted-foreground">
                <strong className="text-foreground">Run-rate Distortion Prevented: </strong>
                Isolating {formatINR(forecast.oneTimePaymentsTotal)} in one-off lump sums saved your forecast from an inflated projection of{' '}
                <span className="line-through text-rose-500 font-medium">
                  {formatINR(forecast.naiveProjectedMonthEndSpend)}
                </span>
                .
              </span>
            </div>
            <button
              onClick={() => setShowNaiveComparison(!showNaiveComparison)}
              className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 hover:underline shrink-0"
            >
              {showNaiveComparison ? 'Hide Naive Curve' : 'Compare with Naive Curve'}
            </button>
          </div>
        )}
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Projected Month-End */}
        <Card className="border-border/80 relative overflow-hidden">
          <div className="absolute top-0 right-0 h-16 w-16 bg-emerald-500/10 rounded-bl-full pointer-events-none" />
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Projected Month-End Spend</span>
              <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
            </CardDescription>
            <CardTitle className="text-2xl font-extrabold text-foreground">
              {formatINR(forecast.projectedMonthEndSpend)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-[11px] text-muted-foreground">
              Range: <span className="font-medium text-foreground">{formatINR(forecast.projectedRange.optimistic)}</span> – <span className="font-medium text-foreground">{formatINR(forecast.projectedRange.conservative)}</span>
            </div>
            <div className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium">
              Based on {forecast.daysRemaining} days remaining in month
            </div>
          </CardContent>
        </Card>

        {/* Card 2: Actual Spent to Date */}
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Actual Incurred to Date</span>
              <Calendar className="h-3.5 w-3.5 text-blue-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {formatINR(forecast.currentActualSpend)}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-[11px] text-muted-foreground flex items-center justify-between">
              <span>Day {forecast.currentDay} of {forecast.totalDaysInMonth}</span>
              <span className="font-semibold text-foreground">
                {Math.round((forecast.currentDay / forecast.totalDaysInMonth) * 100)}% of month
              </span>
            </div>
            <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-blue-500 h-1.5 rounded-full"
                style={{ width: `${(forecast.currentDay / forecast.totalDaysInMonth) * 100}%` }}
              />
            </div>
          </CardContent>
        </Card>

        {/* Card 3: Daily Variable Burn Rate */}
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Daily Variable Burn Rate</span>
              <Flame className="h-3.5 w-3.5 text-amber-500" />
            </CardDescription>
            <CardTitle className="text-2xl font-bold text-foreground">
              {formatINR(Math.round(forecast.dailyVariableRunRate))}
              <span className="text-xs font-normal text-muted-foreground"> / day</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-[11px] text-muted-foreground">
              Variable spend: {formatINR(forecast.variableSpendToDate)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              One-off lump sums excluded: {formatINR(forecast.oneTimePaymentsTotal)}
            </div>
          </CardContent>
        </Card>

        {/* Card 4: Comparison vs Last Month */}
        <Card className="border-border/80">
          <CardHeader className="pb-2">
            <CardDescription className="text-xs font-medium flex items-center justify-between">
              <span>Vs. Last Month Total</span>
              {forecast.deltaVsLastMonth <= 0 ? (
                <ArrowDownRight className="h-3.5 w-3.5 text-emerald-600" />
              ) : (
                <ArrowUpRight className="h-3.5 w-3.5 text-rose-500" />
              )}
            </CardDescription>
            <CardTitle className="text-2xl font-bold">
              {forecast.lastMonthTotalSpend > 0 ? (
                <span
                  className={
                    forecast.deltaVsLastMonth <= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-rose-500'
                  }
                >
                  {forecast.deltaVsLastMonth > 0 ? '+' : ''}
                  {Math.round(forecast.deltaPercentVsLastMonth)}%
                </span>
              ) : (
                <span className="text-foreground text-lg">No Baseline</span>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-[11px] text-muted-foreground">
              Last Month: {formatINR(forecast.lastMonthTotalSpend)}
            </div>
            <div className="text-[10px] text-muted-foreground">
              {forecast.deltaVsLastMonth <= 0
                ? `Tracking ${formatINR(Math.abs(forecast.deltaVsLastMonth))} lower`
                : `Tracking ${formatINR(forecast.deltaVsLastMonth)} higher`}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Trajectory Area & Line Chart */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <span>Month-to-Date Trajectory & Forecast Projection</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Solid line shows verified spend to date. Dashed line projects the remaining {forecast.daysRemaining} days.
              </CardDescription>
            </div>
            <div className="flex items-center gap-3 text-xs">
              <label className="flex items-center gap-1.5 cursor-pointer text-muted-foreground hover:text-foreground">
                <input
                  type="checkbox"
                  checked={showNaiveComparison}
                  onChange={(e) => setShowNaiveComparison(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5"
                />
                <span>Show Naive Run-Rate</span>
              </label>
            </div>
          </div>
        </CardHeader>
        <CardContent className="h-80 pt-4">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={forecast.trajectory}
              margin={{ top: 10, right: 15, left: 15, bottom: 20 }}
            >
              <defs>
                <linearGradient id="smartForecastGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#10b981" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#10b981" stopOpacity={0.02} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis
                dataKey="dateLabel"
                fontSize={11}
                tickLine={false}
                interval={Math.floor(forecast.totalDaysInMonth / 7)}
              />
              <YAxis
                fontSize={11}
                tickFormatter={(val) => formatCompactINR(val)}
                tickLine={false}
                domain={[0, 'auto']}
              />
              <Tooltip
                formatter={(val: any, name: string) => {
                  if (val === null || val === undefined) return ['-', name];
                  const labels: Record<string, string> = {
                    actualSpend: 'Actual Spend to Date',
                    projectedSmart: 'Smart Forecast Trajectory',
                    projectedNaive: 'Naive Trajectory (Unadjusted)',
                    projectedLow: 'Optimistic Pace (-15%)',
                    projectedHigh: 'Conservative Pace (+20%)',
                  };
                  return [formatINR(val), labels[name] || name];
                }}
                labelFormatter={(label) => `Date: ${label}`}
                contentStyle={{
                  backgroundColor: 'hsl(var(--card))',
                  borderColor: 'hsl(var(--border))',
                  borderRadius: '0.5rem',
                  fontSize: '12px',
                }}
              />
              <Legend
                verticalAlign="bottom"
                wrapperStyle={{ fontSize: '11px', paddingTop: '15px' }}
              />

              {/* Confidence interval area */}
              <Area
                type="monotone"
                dataKey="projectedHigh"
                stroke="transparent"
                fill="#10b981"
                fillOpacity={0.08}
                name="Forecast Upper Bound"
              />

              {/* Smart Projection Curve */}
              <Line
                type="monotone"
                dataKey="projectedSmart"
                stroke="#10b981"
                strokeWidth={2.5}
                strokeDasharray="4 4"
                dot={false}
                name="Smart Projected Trajectory"
              />

              {/* Actual Spend Solid Curve */}
              <Line
                type="monotone"
                dataKey="actualSpend"
                stroke="#059669"
                strokeWidth={3}
                dot={{ r: 3, fill: '#059669' }}
                activeDot={{ r: 6 }}
                name="Actual Spend to Date"
              />

              {/* Naive unadjusted curve if enabled */}
              {showNaiveComparison && (
                <Line
                  type="monotone"
                  dataKey="projectedNaive"
                  stroke="#f43f5e"
                  strokeWidth={2}
                  strokeDasharray="2 2"
                  dot={false}
                  name="Naive Extrapolation (Inflated)"
                />
              )}

              {/* Reference line for Today */}
              <ReferenceLine
                x={format(new Date(new Date().getFullYear(), new Date().getMonth(), forecast.currentDay), 'dd MMM')}
                stroke="#64748b"
                strokeDasharray="3 3"
                label={{
                  value: 'Today',
                  position: 'top',
                  fill: '#64748b',
                  fontSize: 10,
                }}
              />

              {/* Reference line for Last Month total spend */}
              {forecast.lastMonthTotalSpend > 0 && (
                <ReferenceLine
                  y={forecast.lastMonthTotalSpend}
                  stroke="#94a3b8"
                  strokeDasharray="5 5"
                  label={{
                    value: `Last Month: ${formatCompactINR(forecast.lastMonthTotalSpend)}`,
                    position: 'insideBottomRight',
                    fill: '#64748b',
                    fontSize: 10,
                  }}
                />
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* One-Time Payment & Outlier Management Section */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <CardTitle className="text-base flex items-center gap-2">
                <SlidersHorizontal className="h-4 w-4 text-emerald-600" />
                <span>One-Time Spikes & Outlier Benchmark Management</span>
              </CardTitle>
              <CardDescription className="text-xs">
                Toggle which expenses are excluded from your daily variable burn rate.
              </CardDescription>
            </div>
            {manuallyExcludedIds !== null && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetToAuto}
                className="text-xs font-semibold h-8"
              >
                Reset to Smart Defaults
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {forecast.detectedOneTimeExpenses.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border p-6 text-center text-xs text-muted-foreground">
              No large one-time spikes or rent payments detected for this month so far. All current expenses are being factored into your daily burn rate.
            </div>
          ) : (
            <div className="divide-y divide-border/60 border rounded-xl overflow-hidden bg-card">
              <div className="bg-muted/40 px-3.5 py-2.5 text-[11px] font-semibold text-muted-foreground flex items-center justify-between">
                <span>Detected High Payments / Outliers ({forecast.detectedOneTimeExpenses.length})</span>
                <span>Action</span>
              </div>
              {forecast.detectedOneTimeExpenses.map((candidate) => {
                const isExcluded = currentExcludedSet.has(candidate.expense.id);
                return (
                  <div
                    key={candidate.expense.id}
                    className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-muted/20 transition-colors"
                  >
                    <div className="space-y-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-foreground truncate">
                          {candidate.expense.description}
                        </span>
                        <span className="rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-medium px-2 py-0.5">
                          {candidate.categoryName}
                        </span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {candidate.expense.date
                            ? format(parseISO(candidate.expense.date), 'dd MMM yyyy')
                            : '-'}
                        </span>
                      </div>
                      <div className="text-[11px] text-muted-foreground flex items-center gap-1.5">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
                        <span>{candidate.reason}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 justify-between sm:justify-end shrink-0">
                      <div className="text-right">
                        <div className="font-extrabold text-sm text-foreground">
                          {formatINR(candidate.effectiveAmount)}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          {viewScope === 'my_share' ? 'Your share' : 'Total bill'}
                        </div>
                      </div>

                      {/* Toggle button */}
                      <button
                        type="button"
                        onClick={() => toggleExpenseExclusion(candidate.expense.id)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-xs ${
                          isExcluded
                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                            : 'border border-border bg-muted/50 hover:bg-muted text-foreground'
                        }`}
                      >
                        {isExcluded ? (
                          <>
                            <CheckCircle2 className="h-3.5 w-3.5 text-white" />
                            <span>Excluded from Benchmark</span>
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            <span>Included in Benchmark</span>
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Toggle to view all other current month expenses */}
          {nonDetectedExpenses.length > 0 && (
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setShowOtherExpenses(!showOtherExpenses)}
                className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1.5"
              >
                {showOtherExpenses ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                <span>
                  {showOtherExpenses
                    ? 'Hide Other Month Expenses'
                    : `View & Exclude from other ${nonDetectedExpenses.length} regular expenses`}
                </span>
              </button>

              {showOtherExpenses && (
                <div className="mt-3 border rounded-xl divide-y divide-border/60 bg-muted/10 max-h-64 overflow-y-auto">
                  {nonDetectedExpenses.map((item) => {
                    const isExcluded = currentExcludedSet.has(item.expense.id);
                    return (
                      <div
                        key={item.expense.id}
                        className="p-2.5 px-3.5 flex items-center justify-between text-xs hover:bg-muted/30 transition-colors"
                      >
                        <div className="min-w-0 pr-2">
                          <span className="font-medium text-foreground truncate block">
                            {item.expense.description}
                          </span>
                          <span className="text-[10px] text-muted-foreground">
                            {item.expense.date ? format(parseISO(item.expense.date), 'dd MMM') : ''} • {item.expense.category?.name || 'General'}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="font-bold text-foreground">
                            {formatINR(item.effectiveAmount)}
                          </span>
                          <button
                            type="button"
                            onClick={() => toggleExpenseExclusion(item.expense.id)}
                            className={`px-2.5 py-1 rounded text-[11px] font-semibold transition-all ${
                              isExcluded
                                ? 'bg-emerald-600 text-white'
                                : 'border border-border text-muted-foreground hover:text-foreground'
                            }`}
                          >
                            {isExcluded ? 'Excluded' : 'Exclude'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

