import { Expense, Settlement, SimplifiedDebt, User } from '@/types/database';
import { toPaise, toRupees } from './currency';

/**
 * Calculates net balance for every participant in a set of expenses & settlements.
 * Positive (+) balance = user is owed money (creditor).
 * Negative (-) balance = user owes money (debtor).
 * Zero (0) = all settled up.
 */
export function calculateNetBalances(
  expenses: Expense[],
  settlements: Settlement[]
): Map<string, number> {
  const balancesPaise = new Map<string, number>();

  const addPaise = (userId: string, paiseDelta: number) => {
    const current = balancesPaise.get(userId) || 0;
    balancesPaise.set(userId, current + paiseDelta);
  };

  // Process expenses
  for (const exp of expenses) {
    // Add what each payer paid (+)
    for (const payer of exp.payers) {
      addPaise(payer.user_id, toPaise(payer.amount_paid));
    }
    // Subtract what each participant owes (-)
    for (const split of exp.splits) {
      addPaise(split.user_id, -toPaise(split.amount_owed));
    }
  }

  // Process settlements
  for (const set of settlements) {
    // Payer sent money -> their debt decreases / balance increases (+)
    addPaise(set.payer_id, toPaise(set.amount));
    // Receiver got money -> their credit decreases / balance decreases (-)
    addPaise(set.receiver_id, -toPaise(set.amount));
  }

  // Convert back to rupees
  const balances = new Map<string, number>();
  for (const [userId, paise] of balancesPaise.entries()) {
    balances.set(userId, toRupees(paise));
  }

  return balances;
}

/**
 * Calculates direct pairwise debts without simplification.
 * For example: if Arjun paid for Rohan, Rohan owes Arjun directly.
 */
export function calculateDirectDebts(
  expenses: Expense[],
  settlements: Settlement[],
  usersMap?: Map<string, User>
): SimplifiedDebt[] {
  // Directed debt matrix in paise: matrix[fromUser][toUser] = paise
  const debtMatrix: Record<string, Record<string, number>> = {};

  const addDebt = (from: string, to: string, paise: number) => {
    if (from === to || paise === 0) return;
    if (!debtMatrix[from]) debtMatrix[from] = {};
    debtMatrix[from][to] = (debtMatrix[from][to] || 0) + paise;
  };

  for (const exp of expenses) {
    // If multiple payers, distribute proportionally
    const totalPaidPaise = exp.payers.reduce((sum, p) => sum + toPaise(p.amount_paid), 0);
    if (totalPaidPaise === 0) continue;

    for (const split of exp.splits) {
      const splitOwedPaise = toPaise(split.amount_owed);
      if (splitOwedPaise === 0) continue;

      for (const payer of exp.payers) {
        const payerPaidPaise = toPaise(payer.amount_paid);
        if (payer.user_id === split.user_id) continue;

        // Proportional share of debt to this payer
        const debtPortion = Math.round((splitOwedPaise * payerPaidPaise) / totalPaidPaise);
        addDebt(split.user_id, payer.user_id, debtPortion);
      }
    }
  }

  // Apply settlements
  for (const set of settlements) {
    const setPaise = toPaise(set.amount);
    // Settlement: payer paid receiver -> reduces payer's debt to receiver
    addDebt(set.payer_id, set.receiver_id, -setPaise);
  }

  // Net the mutual pairs: A owes B vs B owes A
  const allUsers = new Set<string>();
  Object.keys(debtMatrix).forEach((u) => {
    allUsers.add(u);
    Object.keys(debtMatrix[u] || {}).forEach((v) => allUsers.add(v));
  });

  const userList = Array.from(allUsers);
  const result: SimplifiedDebt[] = [];

  for (let i = 0; i < userList.length; i++) {
    for (let j = i + 1; j < userList.length; j++) {
      const u = userList[i];
      const v = userList[j];

      const uOwesV = (debtMatrix[u] && debtMatrix[u][v]) || 0;
      const vOwesU = (debtMatrix[v] && debtMatrix[v][u]) || 0;
      const netPaise = uOwesV - vOwesU;

      if (netPaise > 0) {
        result.push({
          fromUserId: u,
          toUserId: v,
          amount: toRupees(netPaise),
          fromUser: usersMap?.get(u),
          toUser: usersMap?.get(v),
        });
      } else if (netPaise < 0) {
        result.push({
          fromUserId: v,
          toUserId: u,
          amount: toRupees(-netPaise),
          fromUser: usersMap?.get(v),
          toUser: usersMap?.get(u),
        });
      }
    }
  }

  return result.filter((d) => d.amount > 0.009);
}

/**
 * Min-Cash-Flow Debt Simplification Algorithm.
 * Minimizes the total number of transactions needed to settle all debts in a group.
 * Matches the biggest debtor with the biggest creditor iteratively until all balances are 0.
 */
export function simplifyDebts(
  expenses: Expense[],
  settlements: Settlement[],
  usersMap?: Map<string, User>
): SimplifiedDebt[] {
  const netBalances = calculateNetBalances(expenses, settlements);

  // Separate debtors and creditors in integer paise
  interface ParticipantBalance {
    userId: string;
    paise: number;
  }

  const debtors: ParticipantBalance[] = [];
  const creditors: ParticipantBalance[] = [];

  for (const [userId, balance] of netBalances.entries()) {
    const paise = toPaise(balance);
    if (paise < -1) {
      // owes money
      debtors.push({ userId, paise: -paise }); // store as positive debt
    } else if (paise > 1) {
      // owed money
      creditors.push({ userId, paise });
    }
  }

  const simplified: SimplifiedDebt[] = [];

  // Sort descending by amount
  debtors.sort((a, b) => b.paise - a.paise);
  creditors.sort((a, b) => b.paise - a.paise);

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settledPaise = Math.min(debtor.paise, creditor.paise);

    if (settledPaise > 0) {
      simplified.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amount: toRupees(settledPaise),
        fromUser: usersMap?.get(debtor.userId),
        toUser: usersMap?.get(creditor.userId),
      });

      debtor.paise -= settledPaise;
      creditor.paise -= settledPaise;
    }

    if (debtor.paise === 0) dIdx++;
    if (creditor.paise === 0) cIdx++;
  }

  return simplified;
}
