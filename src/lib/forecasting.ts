import { Expense } from '@/types/database';
import {
  startOfMonth,
  endOfMonth,
  getDaysInMonth,
  getDate,
  parseISO,
  subMonths,
  isSameMonth,
  format,
} from 'date-fns';

export interface OneTimeExpenseCandidate {
  expense: Expense;
  effectiveAmount: number;
  reason: string;
  categoryName: string;
  isExcludedFromRunRate: boolean;
}

export interface SpendingForecastOptions {
  currentDate?: Date;
  viewScope?: 'my_share' | 'total_expense';
  userId?: string;
  excludedExpenseIds?: string[];
  autoDetectOutliers?: boolean;
  outlierMultiplier?: number; // Multiple of median/mean to consider an outlier, default 2.5
  minOneTimeAmount?: number; // Minimum amount to even consider as a one-time spike, default 3000
}

export interface SpendingForecastResult {
  currentDay: number;
  totalDaysInMonth: number;
  daysRemaining: number;
  currentActualSpend: number;
  oneTimePaymentsTotal: number;
  variableSpendToDate: number;
  dailyVariableRunRate: number;
  naiveDailyRunRate: number;
  projectedMonthEndSpend: number;
  naiveProjectedMonthEndSpend: number;
  projectedRange: {
    optimistic: number;
    expected: number;
    conservative: number;
  };
  lastMonthTotalSpend: number;
  deltaVsLastMonth: number;
  deltaPercentVsLastMonth: number;
  detectedOneTimeExpenses: OneTimeExpenseCandidate[];
  allCurrentMonthExpenses: {
    expense: Expense;
    effectiveAmount: number;
  }[];
  trajectory: {
    day: number;
    dateLabel: string;
    actualSpend: number | null;
    projectedSmart: number;
    projectedLow: number;
    projectedHigh: number;
    projectedNaive: number;
  }[];
}

const ONE_TIME_KEYWORDS = [
  'rent',
  'deposit',
  'advance',
  'flight',
  'ticket',
  'airline',
  'laptop',
  'phone',
  'tv',
  'television',
  'ac',
  'air conditioner',
  'refrigerator',
  'fridge',
  'furniture',
  'sofa',
  'bed',
  'mattress',
  'annual',
  'yearly',
  'insurance',
  'premium',
  'brokerage',
  'maintenance',
  'security',
  'hospital',
  'surgery',
  'college',
  'fees',
  'tuition',
  'emi',
  'jewellery',
  'gold',
];

const ONE_TIME_CATEGORY_KEYWORDS = [
  'rent',
  'housing',
  'home',
  'flight',
  'travel',
  'electronics',
  'gadgets',
  'medical',
  'education',
  'investment',
];

export function getEffectiveExpenseAmount(
  exp: Expense,
  viewScope: 'my_share' | 'total_expense' = 'my_share',
  userId?: string
): number {
  if (viewScope === 'total_expense') {
    return exp.amount || 0;
  }
  if (!userId) return exp.amount || 0;
  const split = exp.splits?.find((s) => s.user_id === userId);
  return split ? split.amount_owed : 0;
}

/**
 * Detect potential one-time high expenses (like rent, flights, gadgets, security deposits).
 */
export function detectOneTimeCandidates(
  currentMonthExpenses: { expense: Expense; effectiveAmount: number }[],
  options: SpendingForecastOptions = {}
): OneTimeExpenseCandidate[] {
  const minAmount = options.minOneTimeAmount ?? 3000;
  const multiplier = options.outlierMultiplier ?? 2.5;

  const amounts = currentMonthExpenses
    .map((e) => e.effectiveAmount)
    .filter((a) => a > 0)
    .sort((a, b) => a - b);

  if (amounts.length === 0) return [];

  // Calculate median
  const mid = Math.floor(amounts.length / 2);
  const median = amounts.length % 2 !== 0 ? amounts[mid] : (amounts[mid - 1] + amounts[mid]) / 2;
  const outlierCutoff = Math.max(minAmount, median * multiplier);

  const candidates: OneTimeExpenseCandidate[] = [];

  for (const item of currentMonthExpenses) {
    const { expense, effectiveAmount } = item;
    if (effectiveAmount <= 0) continue;

    const desc = (expense.description || '').toLowerCase();
    const catName = (expense.category?.name || '').toLowerCase();

    let isCandidate = false;
    let reason = '';

    // 1. Keyword check in description
    const matchedKeyword = ONE_TIME_KEYWORDS.find((k) => desc.includes(k));
    if (matchedKeyword) {
      isCandidate = true;
      reason = `Matches keyword "${matchedKeyword}" (typically periodic/one-time)`;
    }

    // 2. Category check
    if (!isCandidate) {
      const matchedCategory = ONE_TIME_CATEGORY_KEYWORDS.find((k) => catName.includes(k));
      if (matchedCategory) {
        isCandidate = true;
        reason = `High-value category: ${expense.category?.name || 'Fixed Expense'}`;
      }
    }

    // 3. Statistical outlier check
    if (!isCandidate && effectiveAmount >= outlierCutoff) {
      isCandidate = true;
      const ratio = (effectiveAmount / Math.max(1, median)).toFixed(1);
      reason = `Statistical outlier (${ratio}x above median transaction)`;
    }

    // If candidate or explicitly high value above minAmount
    if (isCandidate || effectiveAmount >= 15000) {
      if (!reason) {
        reason = `High lump-sum payment (₹${effectiveAmount.toLocaleString('en-IN')})`;
      }
      candidates.push({
        expense,
        effectiveAmount,
        reason,
        categoryName: expense.category?.name || 'General',
        isExcludedFromRunRate: true,
      });
    }
  }

  return candidates.sort((a, b) => b.effectiveAmount - a.effectiveAmount);
}

/**
 * Main Spending Forecasting Engine
 */
export function calculateSpendingForecast(
  expenses: Expense[],
  options: SpendingForecastOptions = {}
): SpendingForecastResult {
  const now = options.currentDate || new Date();
  const viewScope = options.viewScope || 'my_share';
  const userId = options.userId;

  const currentMonthStart = startOfMonth(now);
  const currentMonthEnd = endOfMonth(now);
  const currentDay = Math.min(getDate(now), getDaysInMonth(now));
  const totalDaysInMonth = getDaysInMonth(now);
  const daysRemaining = Math.max(0, totalDaysInMonth - currentDay);

  // Previous month interval
  const prevMonthDate = subMonths(now, 1);
  const prevMonthStart = startOfMonth(prevMonthDate);
  const prevMonthEnd = endOfMonth(prevMonthDate);

  // Filter expenses for current month and previous month
  const currentMonthExpensesWithAmounts: { expense: Expense; effectiveAmount: number }[] = [];
  let lastMonthTotalSpend = 0;

  for (const exp of expenses) {
    if (!exp.date) continue;
    const expDate = parseISO(exp.date);
    const amount = getEffectiveExpenseAmount(exp, viewScope, userId);

    if (expDate >= currentMonthStart && expDate <= currentMonthEnd) {
      currentMonthExpensesWithAmounts.push({ expense: exp, effectiveAmount: amount });
    } else if (expDate >= prevMonthStart && expDate <= prevMonthEnd) {
      lastMonthTotalSpend += amount;
    }
  }

  // Detect candidates
  const detectedCandidates = detectOneTimeCandidates(currentMonthExpensesWithAmounts, options);

  // Set of IDs to exclude from run-rate
  // If options.excludedExpenseIds is provided, use that.
  // Otherwise, default to all detected candidates if autoDetectOutliers is true (default).
  const autoDetect = options.autoDetectOutliers ?? true;
  let excludedSet: Set<string>;

  if (options.excludedExpenseIds !== undefined) {
    excludedSet = new Set(options.excludedExpenseIds);
  } else if (autoDetect) {
    excludedSet = new Set(detectedCandidates.map((c) => c.expense.id));
  } else {
    excludedSet = new Set();
  }

  // Update candidate flags according to excludedSet
  const candidatesWithFlags: OneTimeExpenseCandidate[] = detectedCandidates.map((c) => ({
    ...c,
    isExcludedFromRunRate: excludedSet.has(c.expense.id),
  }));

  // Calculate current actual spend, one-time spend, and variable spend
  let currentActualSpend = 0;
  let oneTimePaymentsTotal = 0;
  let variableSpendToDate = 0;

  // Day-by-day actual accumulation
  const dailySpendMap = new Map<number, number>();
  for (let d = 1; d <= totalDaysInMonth; d++) {
    dailySpendMap.set(d, 0);
  }

  for (const item of currentMonthExpensesWithAmounts) {
    const { expense, effectiveAmount } = item;
    currentActualSpend += effectiveAmount;

    const expDate = parseISO(expense.date);
    const day = getDate(expDate);
    dailySpendMap.set(day, (dailySpendMap.get(day) || 0) + effectiveAmount);

    if (excludedSet.has(expense.id)) {
      oneTimePaymentsTotal += effectiveAmount;
    } else {
      variableSpendToDate += effectiveAmount;
    }
  }

  // Naive Daily Run-rate (unadjusted)
  const elapsedDays = Math.max(1, currentDay);
  const naiveDailyRunRate = currentActualSpend / elapsedDays;
  const naiveProjectedMonthEndSpend = Math.round(currentActualSpend + naiveDailyRunRate * daysRemaining);

  // Smart Daily Variable Run-rate
  const dailyVariableRunRate = variableSpendToDate / elapsedDays;

  // Projected Smart Month-End:
  // (Incurred One-time payments) + (Incurred variable spend) + (Projected future variable spend)
  const projectedFutureVariable = dailyVariableRunRate * daysRemaining;
  const projectedMonthEndSpend = Math.round(currentActualSpend + projectedFutureVariable);

  // Range estimates (optimistic = -15% variable pace, conservative = +20% variable pace)
  const projectedRange = {
    optimistic: Math.round(currentActualSpend + projectedFutureVariable * 0.85),
    expected: projectedMonthEndSpend,
    conservative: Math.round(currentActualSpend + projectedFutureVariable * 1.2),
  };

  // Deltas vs last month
  const deltaVsLastMonth = projectedMonthEndSpend - lastMonthTotalSpend;
  const deltaPercentVsLastMonth =
    lastMonthTotalSpend > 0 ? (deltaVsLastMonth / lastMonthTotalSpend) * 100 : 0;

  // Generate day-by-day trajectory curve
  let runningActual = 0;
  const trajectory: SpendingForecastResult['trajectory'] = [];

  for (let day = 1; day <= totalDaysInMonth; day++) {
    const dayDate = new Date(now.getFullYear(), now.getMonth(), day);
    const dateLabel = format(dayDate, 'dd MMM');

    if (day <= currentDay) {
      runningActual += dailySpendMap.get(day) || 0;
      trajectory.push({
        day,
        dateLabel,
        actualSpend: runningActual,
        projectedSmart: runningActual,
        projectedLow: runningActual,
        projectedHigh: runningActual,
        projectedNaive: runningActual,
      });
    } else {
      // Future days projection
      const futureDaysPastNow = day - currentDay;
      const smartProj = Math.round(runningActual + dailyVariableRunRate * futureDaysPastNow);
      const lowProj = Math.round(runningActual + dailyVariableRunRate * 0.85 * futureDaysPastNow);
      const highProj = Math.round(runningActual + dailyVariableRunRate * 1.2 * futureDaysPastNow);
      const naiveProj = Math.round(runningActual + naiveDailyRunRate * futureDaysPastNow);

      trajectory.push({
        day,
        dateLabel,
        actualSpend: null,
        projectedSmart: smartProj,
        projectedLow: lowProj,
        projectedHigh: highProj,
        projectedNaive: naiveProj,
      });
    }
  }

  return {
    currentDay,
    totalDaysInMonth,
    daysRemaining,
    currentActualSpend,
    oneTimePaymentsTotal,
    variableSpendToDate,
    dailyVariableRunRate,
    naiveDailyRunRate,
    projectedMonthEndSpend,
    naiveProjectedMonthEndSpend,
    projectedRange,
    lastMonthTotalSpend,
    deltaVsLastMonth,
    deltaPercentVsLastMonth,
    detectedOneTimeExpenses: candidatesWithFlags,
    allCurrentMonthExpenses: currentMonthExpensesWithAmounts,
    trajectory,
  };
}

