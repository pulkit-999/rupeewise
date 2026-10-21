import { describe, it, expect } from 'vitest';
import { calculateSpendingForecast, detectOneTimeCandidates } from '../src/lib/forecasting';
import { Expense } from '../src/types/database';

describe('Spending Forecasting Engine', () => {
  const mockExpenses: Expense[] = [
    // Rent on Oct 2nd: ₹25,000 (User share ₹12,500)
    {
      id: 'exp-rent',
      description: 'Monthly Apartment Rent',
      amount: 25000,
      currency: 'INR',
      date: '2026-10-02T10:00:00.000Z',
      category_id: 'cat-housing',
      split_type: 'equal',
      created_by: 'user-1',
      created_at: '2026-10-02T10:00:00.000Z',
      updated_at: '2026-10-02T10:00:00.000Z',
      category: { id: 'cat-housing', name: 'Housing & Rent', color: '#10b981', icon: 'home' },
      payers: [{ id: 'p1', expense_id: 'exp-rent', user_id: 'user-1', amount_paid: 25000 }],
      splits: [
        { id: 's1', expense_id: 'exp-rent', user_id: 'user-1', amount_owed: 12500 },
        { id: 's2', expense_id: 'exp-rent', user_id: 'user-2', amount_owed: 12500 },
      ],
    },
    // Daily Groceries on Oct 4th: ₹800 (User share ₹400)
    {
      id: 'exp-groceries-1',
      description: 'Supermarket Groceries',
      amount: 800,
      currency: 'INR',
      date: '2026-10-04T12:00:00.000Z',
      category_id: 'cat-groceries',
      split_type: 'equal',
      created_by: 'user-1',
      created_at: '2026-10-04T12:00:00.000Z',
      updated_at: '2026-10-04T12:00:00.000Z',
      category: { id: 'cat-groceries', name: 'Groceries', color: '#3b82f6', icon: 'shopping-cart' },
      payers: [{ id: 'p2', expense_id: 'exp-groceries-1', user_id: 'user-1', amount_paid: 800 }],
      splits: [
        { id: 's3', expense_id: 'exp-groceries-1', user_id: 'user-1', amount_owed: 400 },
        { id: 's4', expense_id: 'exp-groceries-1', user_id: 'user-2', amount_owed: 400 },
      ],
    },
    // Dinner on Oct 8th: ₹1200 (User share ₹600)
    {
      id: 'exp-dinner',
      description: 'Team Dinner',
      amount: 1200,
      currency: 'INR',
      date: '2026-10-08T20:00:00.000Z',
      category_id: 'cat-dining',
      split_type: 'equal',
      created_by: 'user-1',
      created_at: '2026-10-08T20:00:00.000Z',
      updated_at: '2026-10-08T20:00:00.000Z',
      category: { id: 'cat-dining', name: 'Dining', color: '#f59e0b', icon: 'utensils' },
      payers: [{ id: 'p3', expense_id: 'exp-dinner', user_id: 'user-1', amount_paid: 1200 }],
      splits: [
        { id: 's5', expense_id: 'exp-dinner', user_id: 'user-1', amount_owed: 600 },
        { id: 's6', expense_id: 'exp-dinner', user_id: 'user-2', amount_owed: 600 },
      ],
    },
    // Last month expense: Sep 15th: ₹20,000
    {
      id: 'exp-last-month',
      description: 'Previous Month Rent & Bills',
      amount: 20000,
      currency: 'INR',
      date: '2026-09-15T10:00:00.000Z',
      category_id: 'cat-housing',
      split_type: 'equal',
      created_by: 'user-1',
      created_at: '2026-09-15T10:00:00.000Z',
      updated_at: '2026-09-15T10:00:00.000Z',
      payers: [{ id: 'p4', expense_id: 'exp-last-month', user_id: 'user-1', amount_paid: 20000 }],
      splits: [
        { id: 's7', expense_id: 'exp-last-month', user_id: 'user-1', amount_owed: 10000 },
        { id: 's8', expense_id: 'exp-last-month', user_id: 'user-2', amount_owed: 10000 },
      ],
    },
  ];

  it('correctly detects Rent as a one-time / outlier candidate', () => {
    const expensesWithAmounts = mockExpenses
      .filter((e) => e.date.startsWith('2026-10'))
      .map((e) => ({ expense: e, effectiveAmount: e.amount }));

    const candidates = detectOneTimeCandidates(expensesWithAmounts);
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates[0].expense.id).toBe('exp-rent');
    expect(candidates[0].reason).toContain('rent');
  });

  it('excludes rent from daily run-rate and calculates accurate smart forecast', () => {
    // Current date: Oct 10th (10 days elapsed, 21 days remaining in 31-day Oct)
    const fixedNow = new Date('2026-10-10T12:00:00.000Z');

    const result = calculateSpendingForecast(mockExpenses, {
      currentDate: fixedNow,
      viewScope: 'total_expense',
      autoDetectOutliers: true,
    });

    expect(result.currentDay).toBe(10);
    expect(result.daysRemaining).toBe(21);
    // Total current actual: 25000 (rent) + 800 + 1200 = 27000
    expect(result.currentActualSpend).toBe(27000);
    // One-time isolated: 25000 (rent)
    expect(result.oneTimePaymentsTotal).toBe(25000);
    // Variable spend: 800 + 1200 = 2000
    expect(result.variableSpendToDate).toBe(2000);
    // Variable daily rate: 2000 / 10 = 200 / day
    expect(result.dailyVariableRunRate).toBe(200);

    // Smart Projected Month-End:
    // 27000 + (200 * 21) = 27000 + 4200 = 31200
    expect(result.projectedMonthEndSpend).toBe(31200);

    // Naive Projected Month-End would be:
    // Naive daily rate = 27000 / 10 = 2700 / day
    // Naive projected = 27000 + (2700 * 21) = 83700! (Distorted by rent!)
    expect(result.naiveProjectedMonthEndSpend).toBe(83700);

    // Verify smart projection is significantly more realistic than naive
    expect(result.projectedMonthEndSpend).toBeLessThan(result.naiveProjectedMonthEndSpend);
  });

  it('allows manual inclusion of rent in benchmark if user toggles it', () => {
    const fixedNow = new Date('2026-10-10T12:00:00.000Z');

    // If user explicitly includes everything (empty excludedExpenseIds)
    const result = calculateSpendingForecast(mockExpenses, {
      currentDate: fixedNow,
      viewScope: 'total_expense',
      excludedExpenseIds: [], // Nothing excluded
    });

    expect(result.oneTimePaymentsTotal).toBe(0);
    expect(result.variableSpendToDate).toBe(27000);
    expect(result.dailyVariableRunRate).toBe(2700);
    expect(result.projectedMonthEndSpend).toBe(83700);
  });

  it('works accurately with user share scope', () => {
    const fixedNow = new Date('2026-10-10T12:00:00.000Z');

    const result = calculateSpendingForecast(mockExpenses, {
      currentDate: fixedNow,
      viewScope: 'my_share',
      userId: 'user-1',
      autoDetectOutliers: true,
    });

    // My rent share = 12500, groceries share = 400, dinner share = 600
    // Total my spend to date = 13500
    expect(result.currentActualSpend).toBe(13500);
    expect(result.oneTimePaymentsTotal).toBe(12500);
    expect(result.variableSpendToDate).toBe(1000);
    expect(result.dailyVariableRunRate).toBe(100);

    // Smart projected: 13500 + (100 * 21) = 15600
    expect(result.projectedMonthEndSpend).toBe(15600);
  });
});

