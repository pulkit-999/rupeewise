import { describe, it, expect } from 'vitest';
import { formatINR, formatCompactINR, toPaise, toRupees } from '../src/lib/currency';

describe('Indian Currency Formatting (INR)', () => {
  it('formats amounts using Indian digit grouping (Lakhs and Crores)', () => {
    // Standard thousands
    const formatted1k = formatINR(1000);
    expect(formatted1k).toContain('1,000.00');

    // Lakhs: 1,23,456.78
    const formattedLakh = formatINR(123456.78);
    expect(formattedLakh).toContain('1,23,456.78');

    // Ten Lakhs: 10,00,000.00
    const formatted10Lakh = formatINR(1000000);
    expect(formatted10Lakh).toContain('10,00,000.00');

    // Crores: 1,00,00,000.00
    const formattedCrore = formatINR(10000000);
    expect(formattedCrore).toContain('1,00,00,000.00');
  });

  it('formats compact Indian currency for charts and badges', () => {
    expect(formatCompactINR(1500)).toBe('₹1.5K');
    expect(formatCompactINR(250000)).toBe('₹2.5L');
    expect(formatCompactINR(25000000)).toBe('₹2.5Cr');
    expect(formatCompactINR(-500000)).toBe('-₹5L');
  });

  it('converts accurately between Rupees and Paise without IEEE-754 precision loss', () => {
    // 0.1 + 0.2 in JS is 0.30000000000000004
    // Using toPaise:
    const paise1 = toPaise(0.1);
    const paise2 = toPaise(0.2);
    expect(paise1 + paise2).toBe(30);
    expect(toRupees(paise1 + paise2)).toBe(0.3);

    // Exact ₹123.45 -> 12345 paise
    expect(toPaise(123.45)).toBe(12345);
    expect(toRupees(12345)).toBe(123.45);
  });
});
