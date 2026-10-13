import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { Expense } from "@/types/database";
import { format } from "date-fns";
import { formatINR } from "./currency";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Exports expenses array as RFC-4180 compliant CSV file and triggers browser download
 */
export function exportExpensesToCSV(expenses: Expense[], filename: string = 'expenses-export.csv') {
  if (!expenses || expenses.length === 0) {
    alert('No expenses found to export.');
    return;
  }

  const headers = [
    'Date',
    'Description',
    'Category',
    'Group',
    'Total Amount (INR)',
    'Split Type',
    'Paid By',
    'Split Details',
    'Notes',
  ];

  const rows = expenses.map((exp) => {
    const dateFormatted = exp.date ? format(new Date(exp.date), 'dd/MM/yyyy') : '';
    const desc = (exp.description || '').replace(/"/g, '""');
    const cat = exp.category?.name || 'General';
    const groupName = exp.group?.name || 'Individual Expense';
    const amount = exp.amount.toFixed(2);
    const splitType = exp.split_type;
    const paidBy = exp.payers.map((p) => `${p.user?.full_name || 'Member'}: ₹${p.amount_paid}`).join('; ');
    const splitDetails = exp.splits.map((s) => `${s.user?.full_name || 'Member'}: ₹${s.amount_owed}`).join('; ');
    const notes = (exp.notes || '').replace(/"/g, '""');

    return [
      `"${dateFormatted}"`,
      `"${desc}"`,
      `"${cat}"`,
      `"${groupName}"`,
      `"${amount}"`,
      `"${splitType}"`,
      `"${paidBy}"`,
      `"${splitDetails}"`,
      `"${notes}"`,
    ].join(',');
  });

  const csvContent = [headers.join(','), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
