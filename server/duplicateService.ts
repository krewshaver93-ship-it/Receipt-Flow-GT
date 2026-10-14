import { Database } from 'sql.js';
import { queryOne, queryAll } from './db.js';

export interface DuplicateCheckResult {
  isDuplicate: boolean;
  reason?: 'exact_file_hash' | 'matching_transaction_fields';
  matchedExpenseId?: string;
  matchedExpenseSummary?: {
    merchant: string;
    date: string;
    currency: string;
    total: number;
    created_at: string;
  };
}

export function checkForDuplicates(
  db: Database,
  orgId: string,
  fileHash: string,
  merchant: string,
  date: string,
  currency: string,
  total: number,
  excludeExpenseId?: string
): DuplicateCheckResult {
  // 1. Check for exact duplicate file hash within this organization
  if (fileHash) {
    const existingReceipt = queryOne(
      db,
      `SELECT r.id as receipt_id, e.id as expense_id, e.merchant, e.date, e.currency, e.total, e.created_at
       FROM receipts r
       JOIN expenses e ON e.receipt_id = r.id
       WHERE r.org_id = ? AND r.file_hash = ? ${excludeExpenseId ? 'AND e.id != ?' : ''}
       LIMIT 1`,
      excludeExpenseId ? [orgId, fileHash, excludeExpenseId] : [orgId, fileHash]
    );

    if (existingReceipt) {
      return {
        isDuplicate: true,
        reason: 'exact_file_hash',
        matchedExpenseId: existingReceipt.expense_id,
        matchedExpenseSummary: {
          merchant: existingReceipt.merchant,
          date: existingReceipt.date,
          currency: existingReceipt.currency,
          total: existingReceipt.total,
          created_at: existingReceipt.created_at,
        },
      };
    }
  }

  // 2. Check for identical transaction details (same merchant, same date, same currency, and same total amount)
  if (merchant && date && total > 0) {
    const cleanMerchant = merchant.trim().toLowerCase();
    const existingExpense = queryOne(
      db,
      `SELECT id, merchant, date, currency, total, created_at
       FROM expenses
       WHERE org_id = ? 
         AND LOWER(TRIM(merchant)) = ? 
         AND date = ? 
         AND currency = ? 
         AND ABS(total - ?) < 0.01
         ${excludeExpenseId ? 'AND id != ?' : ''}
       LIMIT 1`,
      excludeExpenseId
        ? [orgId, cleanMerchant, date, currency, total, excludeExpenseId]
        : [orgId, cleanMerchant, date, currency, total]
    );

    if (existingExpense) {
      return {
        isDuplicate: true,
        reason: 'matching_transaction_fields',
        matchedExpenseId: existingExpense.id,
        matchedExpenseSummary: {
          merchant: existingExpense.merchant,
          date: existingExpense.date,
          currency: existingExpense.currency,
          total: existingExpense.total,
          created_at: existingExpense.created_at,
        },
      };
    }
  }

  return {
    isDuplicate: false,
  };
}
