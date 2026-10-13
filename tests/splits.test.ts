import { describe, it, expect } from 'vitest';
import {
  calculateEqualSplit,
  validateExactSplit,
  calculatePercentageSplit,
  calculateSharesSplit,
  validatePayers,
} from '../src/lib/splits';
import { toPaise } from '../src/lib/currency';

describe('Splits Calculation Engine & Edge Cases', () => {
  it('splits ₹100 equally among 3 people without losing paise', () => {
    const splits = calculateEqualSplit(100, ['u1', 'u2', 'u3']);
    expect(splits).toHaveLength(3);

    // Should be ₹33.34, ₹33.33, ₹33.33
    expect(splits[0].amount).toBe(33.34);
    expect(splits[1].amount).toBe(33.33);
    expect(splits[2].amount).toBe(33.33);

    // Sum of paise must strictly equal 10000 paise (₹100.00)
    const sumPaise = splits.reduce((sum, s) => sum + toPaise(s.amount), 0);
    expect(sumPaise).toBe(10000);
  });

  it('splits ₹1000 equally among 7 people with zero paise discrepancy', () => {
    const userIds = ['u1', 'u2', 'u3', 'u4', 'u5', 'u6', 'u7'];
    const splits = calculateEqualSplit(1000, userIds);

    const sumPaise = splits.reduce((sum, s) => sum + toPaise(s.amount), 0);
    expect(sumPaise).toBe(100000); // 1000 * 100 paise
  });

  it('validates exact split correctly and detects shortfall or excess', () => {
    // Valid exact split
    const valid = validateExactSplit(1500, [
      { userId: 'u1', amount: 500 },
      { userId: 'u2', amount: 1000 },
    ]);
    expect(valid.isValid).toBe(true);
    expect(valid.difference).toBe(0);

    // Shortfall exact split
    const short = validateExactSplit(1500, [
      { userId: 'u1', amount: 500 },
      { userId: 'u2', amount: 900 },
    ]);
    expect(short.isValid).toBe(false);
    expect(short.difference).toBe(100);

    // Excess exact split
    const excess = validateExactSplit(1500, [
      { userId: 'u1', amount: 700 },
      { userId: 'u2', amount: 1000 },
    ]);
    expect(excess.isValid).toBe(false);
    expect(excess.difference).toBe(-200);
  });

  it('calculates percentage splits and reconciles rounding discrepancies', () => {
    // ₹1000 split 33.33%, 33.33%, 33.34%
    const res = calculatePercentageSplit(1000, [
      { userId: 'u1', percentage: 33.33 },
      { userId: 'u2', percentage: 33.33 },
      { userId: 'u3', percentage: 33.34 },
    ]);

    expect(res.isValid).toBe(true);
    const sumPaise = res.splits.reduce((sum, s) => sum + toPaise(s.amount), 0);
    expect(sumPaise).toBe(100000);
  });

  it('calculates shares/weight based splits accurately', () => {
    // ₹1200 split with shares: 1, 2, 3 (total 6 shares -> 200, 400, 600)
    const res = calculateSharesSplit(1200, [
      { userId: 'u1', shares: 1 },
      { userId: 'u2', shares: 2 },
      { userId: 'u3', shares: 3 },
    ]);

    expect(res.isValid).toBe(true);
    expect(res.splits[0].amount).toBe(200);
    expect(res.splits[1].amount).toBe(400);
    expect(res.splits[2].amount).toBe(600);
  });

  it('validates multi-payer bills against total amount', () => {
    const valid = validatePayers(5000, [
      { userId: 'u1', amount: 3000 },
      { userId: 'u2', amount: 2000 },
    ]);
    expect(valid.isValid).toBe(true);

    const invalid = validatePayers(5000, [
      { userId: 'u1', amount: 3000 },
      { userId: 'u2', amount: 1500 },
    ]);
    expect(invalid.isValid).toBe(false);
    expect(invalid.difference).toBe(500);
  });
});
