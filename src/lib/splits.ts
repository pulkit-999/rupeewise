import { toPaise, toRupees } from './currency';

export interface SplitParticipant {
  userId: string;
  exactAmount?: number;
  percentage?: number;
  shares?: number;
}

export interface SplitResult {
  userId: string;
  amount: number;
}

/**
 * Calculates equal splits down to the last paise.
 * For example: ₹100 split among 3 people -> 10000 paise / 3 = 3333 paise each with 1 paise remainder.
 * The first participant receives 3334 paise (₹33.34) and the other two receive 3333 paise (₹33.33).
 * Sum is strictly ₹100.00.
 */
export function calculateEqualSplit(totalAmount: number, userIds: string[]): SplitResult[] {
  if (userIds.length === 0 || totalAmount <= 0) return [];

  const totalPaise = toPaise(totalAmount);
  const count = userIds.length;
  const basePaise = Math.floor(totalPaise / count);
  let remainderPaise = totalPaise % count;

  return userIds.map((userId) => {
    let participantPaise = basePaise;
    if (remainderPaise > 0) {
      participantPaise += 1;
      remainderPaise -= 1;
    }
    return {
      userId,
      amount: toRupees(participantPaise),
    };
  });
}

/**
 * Validates and normalizes exact splits.
 * Checks that the sum of exact amounts equals total amount within 1 paise tolerance.
 */
export function validateExactSplit(
  totalAmount: number,
  participants: { userId: string; amount: number }[]
): { isValid: boolean; difference: number; splits: SplitResult[] } {
  const totalPaise = toPaise(totalAmount);
  const sumPaise = participants.reduce((sum, p) => sum + toPaise(p.amount || 0), 0);
  const differencePaise = totalPaise - sumPaise;

  return {
    isValid: Math.abs(differencePaise) === 0,
    difference: toRupees(differencePaise),
    splits: participants.map((p) => ({
      userId: p.userId,
      amount: toRupees(toPaise(p.amount || 0)),
    })),
  };
}

/**
 * Calculates percentage splits.
 * Reconciles penny/paise differences so the sum strictly matches totalAmount.
 */
export function calculatePercentageSplit(
  totalAmount: number,
  participants: { userId: string; percentage: number }[]
): { isValid: boolean; totalPercentage: number; splits: SplitResult[] } {
  const totalPercentage = participants.reduce((sum, p) => sum + (p.percentage || 0), 0);
  const isPercentValid = Math.abs(totalPercentage - 100) < 0.01;

  if (participants.length === 0 || totalAmount <= 0) {
    return { isValid: false, totalPercentage, splits: [] };
  }

  const totalPaise = toPaise(totalAmount);
  let allocatedPaise = 0;

  const initialSplits = participants.map((p) => {
    const rawPaise = Math.round((totalPaise * (p.percentage || 0)) / 100);
    allocatedPaise += rawPaise;
    return {
      userId: p.userId,
      paise: rawPaise,
    };
  });

  // Reconcile rounding discrepancy to the first participant with non-zero share
  const discrepancy = totalPaise - allocatedPaise;
  if (discrepancy !== 0 && initialSplits.length > 0) {
    initialSplits[0].paise += discrepancy;
  }

  return {
    isValid: isPercentValid,
    totalPercentage,
    splits: initialSplits.map((s) => ({
      userId: s.userId,
      amount: toRupees(s.paise),
    })),
  };
}

/**
 * Calculates share/weight based splits.
 * Proportional to number of shares with remainder reconciliation.
 */
export function calculateSharesSplit(
  totalAmount: number,
  participants: { userId: string; shares: number }[]
): { isValid: boolean; totalShares: number; splits: SplitResult[] } {
  const totalShares = participants.reduce((sum, p) => sum + (p.shares || 0), 0);

  if (totalShares <= 0 || totalAmount <= 0) {
    return { isValid: false, totalShares, splits: [] };
  }

  const totalPaise = toPaise(totalAmount);
  let allocatedPaise = 0;

  const initialSplits = participants.map((p) => {
    const sharePaise = Math.floor((totalPaise * (p.shares || 0)) / totalShares);
    allocatedPaise += sharePaise;
    return {
      userId: p.userId,
      paise: sharePaise,
    };
  });

  let remainder = totalPaise - allocatedPaise;
  let idx = 0;
  while (remainder > 0 && idx < initialSplits.length) {
    initialSplits[idx].paise += 1;
    remainder -= 1;
    idx++;
  }

  return {
    isValid: true,
    totalShares,
    splits: initialSplits.map((s) => ({
      userId: s.userId,
      amount: toRupees(s.paise),
    })),
  };
}

/**
 * Validates multiple payers.
 * Sum of amounts paid by all payers must match total bill.
 */
export function validatePayers(
  totalAmount: number,
  payers: { userId: string; amount: number }[]
): { isValid: boolean; difference: number } {
  const totalPaise = toPaise(totalAmount);
  const paidPaise = payers.reduce((sum, p) => sum + toPaise(p.amount || 0), 0);
  const diffPaise = totalPaise - paidPaise;

  return {
    isValid: Math.abs(diffPaise) === 0,
    difference: toRupees(diffPaise),
  };
}
