import { describe, it, expect } from 'vitest';
import {
  calculateNetBalances,
  simplifyDebts,
  calculateDirectDebts,
} from '../src/lib/debt-simplification';
import { Expense, Settlement } from '../src/types/database';
import { toPaise } from '../src/lib/currency';

describe('Debt Simplification & Balance Engine', () => {
  it('guarantees zero-sum invariant: total net balances always sum to 0', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        description: 'Dinner',
        amount: 3000,
        currency: 'INR',
        date: '2024-03-01',
        category_id: 'cat_food',
        split_type: 'equal',
        created_by: 'u1',
        created_at: '',
        updated_at: '',
        payers: [{ id: 'p1', expense_id: 'e1', user_id: 'u1', amount_paid: 3000 }],
        splits: [
          { id: 's1', expense_id: 'e1', user_id: 'u1', amount_owed: 1000 },
          { id: 's2', expense_id: 'e1', user_id: 'u2', amount_owed: 1000 },
          { id: 's3', expense_id: 'e1', user_id: 'u3', amount_owed: 1000 },
        ],
      },
    ];

    const balances = calculateNetBalances(expenses, []);
    let totalSumPaise = 0;
    balances.forEach((bal) => {
      totalSumPaise += toPaise(bal);
    });

    expect(totalSumPaise).toBe(0);
    expect(balances.get('u1')).toBe(2000); // Lent 2000
    expect(balances.get('u2')).toBe(-1000); // Owes 1000
    expect(balances.get('u3')).toBe(-1000); // Owes 1000
  });

  it('simplifies circular 3-party debts into minimal transactions', () => {
    // A owes B ₹1000, B owes C ₹1000
    // Net: A owes ₹1000, B is net 0, C is owed ₹1000
    // Simplified: A pays C ₹1000 (1 transaction instead of 2!)
    const expenses: Expense[] = [
      {
        id: 'e1',
        description: 'B paid for A',
        amount: 1000,
        currency: 'INR',
        date: '2024-03-01',
        category_id: 'cat_food',
        split_type: 'exact',
        created_by: 'B',
        created_at: '',
        updated_at: '',
        payers: [{ id: 'p1', expense_id: 'e1', user_id: 'B', amount_paid: 1000 }],
        splits: [{ id: 's1', expense_id: 'e1', user_id: 'A', amount_owed: 1000 }],
      },
      {
        id: 'e2',
        description: 'C paid for B',
        amount: 1000,
        currency: 'INR',
        date: '2024-03-02',
        category_id: 'cat_food',
        split_type: 'exact',
        created_by: 'C',
        created_at: '',
        updated_at: '',
        payers: [{ id: 'p2', expense_id: 'e2', user_id: 'C', amount_paid: 1000 }],
        splits: [{ id: 's2', expense_id: 'e2', user_id: 'B', amount_owed: 1000 }],
      },
    ];

    const direct = calculateDirectDebts(expenses, []);
    expect(direct).toHaveLength(2); // A->B and B->C

    const simplified = simplifyDebts(expenses, []);
    expect(simplified).toHaveLength(1); // Only A->C
    expect(simplified[0].fromUserId).toBe('A');
    expect(simplified[0].toUserId).toBe('C');
    expect(simplified[0].amount).toBe(1000);
  });

  it('handles partial settlements and updates balances accurately', () => {
    const expenses: Expense[] = [
      {
        id: 'e1',
        description: 'Flight',
        amount: 4000,
        currency: 'INR',
        date: '2024-03-01',
        category_id: 'cat_travel',
        split_type: 'equal',
        created_by: 'u1',
        created_at: '',
        updated_at: '',
        payers: [{ id: 'p1', expense_id: 'e1', user_id: 'u1', amount_paid: 4000 }],
        splits: [
          { id: 's1', expense_id: 'e1', user_id: 'u1', amount_owed: 2000 },
          { id: 's2', expense_id: 'e1', user_id: 'u2', amount_owed: 2000 },
        ],
      },
    ];

    // u2 partially settles ₹1500 of the ₹2000 debt via UPI
    const settlements: Settlement[] = [
      {
        id: 'st1',
        payer_id: 'u2',
        receiver_id: 'u1',
        amount: 1500,
        currency: 'INR',
        payment_method: 'upi',
        settled_at: '2024-03-02',
        created_at: '2024-03-02',
      },
    ];

    const balances = calculateNetBalances(expenses, settlements);
    expect(balances.get('u1')).toBe(500); // 2000 - 1500 = 500 remaining
    expect(balances.get('u2')).toBe(-500); // owes 500 remaining

    const remainingDebt = simplifyDebts(expenses, settlements);
    expect(remainingDebt).toHaveLength(1);
    expect(remainingDebt[0].fromUserId).toBe('u2');
    expect(remainingDebt[0].toUserId).toBe('u1');
    expect(remainingDebt[0].amount).toBe(500);
  });
});
