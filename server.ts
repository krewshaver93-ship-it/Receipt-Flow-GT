import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import { getDb, execute, queryOne, queryAll, saveDb } from './server/db.js';
import { validateReceiptFile, extractReceiptData } from './server/ocrService.js';
import { checkForDuplicates } from './server/duplicateService.js';
import {
  createGoogleSpreadsheet,
  syncExpensesToGoogleSheet,
  generateCsvExport,
} from './server/sheetsService.js';
import {
  getPayPalConfig,
  verifyPayPalSubscription,
  cancelPayPalSubscription,
  verifyWebhookSignature,
  processWebhookEvent,
  checkPayPalReadiness,
} from './server/paypalService.js';
import { runAllTests } from './server/testSuite.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Body parsers: support large JSON base64 uploads up to 15MB
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

// Tenant / User Context Helper from Bearer or simulated session
async function resolveAuthContext(req: Request) {
  const db = await getDb();
  const authHeader = req.headers.authorization;
  const orgHeader = req.headers['x-org-id'] as string;
  const userHeader = req.headers['x-user-id'] as string;

  if (userHeader) {
    const user = queryOne(db, 'SELECT * FROM users WHERE id = ?', [userHeader]);
    if (user) {
      return { user, orgId: user.org_id };
    }
  }

  // Check default or test user
  const firstUser = queryOne(db, 'SELECT * FROM users ORDER BY created_at ASC LIMIT 1');
  if (firstUser) {
    return { user: firstUser, orgId: firstUser.org_id };
  }

  // If no user exists yet, create default workspace
  const defaultOrgId = 'org_default';
  const defaultUserId = 'user_default';
  const now = new Date().toISOString();

  execute(
    db,
    `INSERT OR IGNORE INTO organizations (id, name, created_at) VALUES (?, 'My Workspace', ?)`,
    [defaultOrgId, now]
  );
  execute(
    db,
    `INSERT OR IGNORE INTO users (id, org_id, email, name, role, created_at)
     VALUES (?, ?, 'owner@receiptflow.app', 'Workspace Owner', 'admin', ?)`,
    [defaultUserId, defaultOrgId, now]
  );
  execute(
    db,
    `INSERT OR IGNORE INTO entitlements (id, org_id, plan_code, monthly_receipt_quota, receipts_used_this_month, quota_reset_date)
     VALUES (?, ?, 'free', 5, 0, ?)`,
    [`ent_${defaultOrgId}`, defaultOrgId, now]
  );

  const createdUser = queryOne(db, 'SELECT * FROM users WHERE id = ?', [defaultUserId]);
  return { user: createdUser, orgId: defaultOrgId };
}

// ==========================================
// AUTH & ACCOUNT APIS
// ==========================================

app.post('/api/auth/session', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const { email, name, picture, uid } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    const userId = uid || `user_${email.replace(/[^a-zA-Z0-9]/g, '_')}`;
    let existingUser = queryOne(db, 'SELECT * FROM users WHERE email = ?', [email]);
    let orgId: string;

    const now = new Date().toISOString();

    if (!existingUser) {
      orgId = `org_${Date.now()}`;
      execute(db, `INSERT INTO organizations (id, name, created_at) VALUES (?, ?, ?)`, [
        orgId,
        `${name ? name.split(' ')[0] : 'My'}'s Team`,
        now,
      ]);
      execute(
        db,
        `INSERT INTO users (id, org_id, email, name, picture, role, created_at) VALUES (?, ?, ?, ?, ?, 'admin', ?)`,
        [userId, orgId, email, name || 'Workspace User', picture || '', now]
      );
      execute(
        db,
        `INSERT INTO entitlements (id, org_id, plan_code, monthly_receipt_quota, receipts_used_this_month, quota_reset_date)
         VALUES (?, ?, 'free', 5, 0, ?)`,
        [`ent_${orgId}`, orgId, now]
      );
      existingUser = queryOne(db, 'SELECT * FROM users WHERE id = ?', [userId]);
    } else {
      orgId = existingUser.org_id;
      if (name || picture) {
        execute(db, `UPDATE users SET name = ?, picture = ? WHERE id = ?`, [
          name || existingUser.name,
          picture || existingUser.picture,
          existingUser.id,
        ]);
      }
    }

    const org = queryOne(db, 'SELECT * FROM organizations WHERE id = ?', [orgId]);
    const entitlement = queryOne(db, 'SELECT * FROM entitlements WHERE org_id = ?', [orgId]);
    const sheetsConfig = queryOne(db, 'SELECT * FROM sheets_configs WHERE org_id = ?', [orgId]);

    res.json({
      user: existingUser,
      organization: org,
      entitlement,
      sheetsConfig,
    });
  } catch (err: any) {
    console.error('Session error:', err);
    res.status(500).json({ error: err.message || 'Internal server error' });
  }
});

app.post('/api/auth/disconnect', async (req: Request, res: Response) => {
  try {
    const { orgId, user } = await resolveAuthContext(req);
    const db = await getDb();
    execute(db, `DELETE FROM sheets_configs WHERE org_id = ?`, [orgId]);
    execute(
      db,
      `INSERT INTO audit_logs (id, org_id, user_id, action, entity_type, entity_id, created_at)
       VALUES (?, ?, ?, 'disconnect_workspace', 'organization', ?, ?)`,
      [`audit_${Date.now()}`, orgId, user.id, orgId, new Date().toISOString()]
    );
    res.json({ success: true, message: 'Google Workspace disconnected successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/auth/account', async (req: Request, res: Response) => {
  try {
    const { orgId, user } = await resolveAuthContext(req);
    const db = await getDb();
    // Complete data purge
    execute(db, `DELETE FROM organizations WHERE id = ?`, [orgId]);
    saveDb();
    res.json({ success: true, message: 'All organization and account data has been completely erased.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// ENTITLEMENTS & QUOTAS
// ==========================================

app.get('/api/entitlements', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    let ent = queryOne(db, 'SELECT * FROM entitlements WHERE org_id = ?', [orgId]);
    if (!ent) {
      execute(
        db,
        `INSERT INTO entitlements (id, org_id, plan_code, monthly_receipt_quota, receipts_used_this_month, quota_reset_date)
         VALUES (?, ?, 'free', 5, 0, ?)`,
        [`ent_${orgId}`, orgId, new Date().toISOString()]
      );
      ent = queryOne(db, 'SELECT * FROM entitlements WHERE org_id = ?', [orgId]);
    }
    const sub = queryOne(
      db,
      `SELECT * FROM subscriptions WHERE org_id = ? ORDER BY created_at DESC LIMIT 1`,
      [orgId]
    );

    res.json({
      entitlement: ent,
      subscription: sub,
      pricing: {
        planName: 'ReceiptFlow Pro',
        priceMonthly: 9.99,
        currency: 'USD',
        quotaPro: 100,
        quotaFree: 5,
        comparisonCompetitor: 'Expensify Collect ($5.00/user/mo)',
      },
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// RECEIPTS & EXPENSE PROCESSING
// ==========================================

app.post('/api/receipts/upload', async (req: Request, res: Response) => {
  const t0 = Date.now();
  try {
    const { orgId, user } = await resolveAuthContext(req);
    const db = await getDb();
    const { fileBase64, filename, bypassDuplicateCheck } = req.body;

    if (!fileBase64) {
      return res.status(400).json({ error: 'Receipt file payload is required.' });
    }

    // 1. Quota Check
    const ent = queryOne(db, 'SELECT * FROM entitlements WHERE org_id = ?', [orgId]);
    if (ent && ent.receipts_used_this_month >= ent.monthly_receipt_quota) {
      return res.status(403).json({
        error: `Monthly receipt quota reached (${ent.receipts_used_this_month}/${ent.monthly_receipt_quota}). Upgrade to ReceiptFlow Pro ($9.99/user/mo) for 100 receipts per month.`,
        quotaExceeded: true,
        currentUsage: ent.receipts_used_this_month,
        quota: ent.monthly_receipt_quota,
      });
    }

    // 2. Validate File & Extract Magic Bytes
    const validation = validateReceiptFile(fileBase64, filename || 'receipt.jpg');
    if (!validation.valid) {
      return res.status(400).json({ error: validation.error });
    }

    // 3. Extract receipt data (Gemini OCR adapter or heuristic fallback)
    const extracted = await extractReceiptData(validation.buffer, validation.mimeType, validation.hash);

    // 4. Duplicate Check
    const dupCheck = checkForDuplicates(
      db,
      orgId,
      validation.hash,
      extracted.merchant,
      extracted.date,
      extracted.currency,
      extracted.total
    );

    if (dupCheck.isDuplicate && !bypassDuplicateCheck) {
      return res.status(409).json({
        duplicateDetected: true,
        message:
          dupCheck.reason === 'exact_file_hash'
            ? 'This exact receipt file has already been uploaded.'
            : `A matching expense for ${extracted.merchant} on ${extracted.date} ($${extracted.total.toFixed(2)}) already exists.`,
        dupCheck,
        extractedData: extracted,
      });
    }

    // 5. Store Receipt and Expense in DB
    const receiptId = `rec_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const expenseId = `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();

    // Store preview data (safely truncate if huge)
    const storageData = fileBase64.length > 500000 ? fileBase64.slice(0, 500000) : fileBase64;

    execute(
      db,
      `INSERT INTO receipts (id, org_id, user_id, filename, file_hash, file_type, file_size, storage_data, ocr_status, raw_text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?, ?)`,
      [
        receiptId,
        orgId,
        user.id,
        filename || 'receipt.jpg',
        validation.hash,
        validation.mimeType,
        validation.buffer.length,
        storageData,
        extracted.raw_text || '',
        now,
      ]
    );

    execute(
      db,
      `INSERT INTO expenses (id, org_id, receipt_id, user_id, merchant, date, currency, subtotal, tax, total, category, payment_method, reference_no, review_status, confidence_score, is_duplicate_flag, duplicate_of_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending_review', ?, ?, ?, ?, ?)`,
      [
        expenseId,
        orgId,
        receiptId,
        user.id,
        extracted.merchant,
        extracted.date,
        extracted.currency,
        extracted.subtotal,
        extracted.tax,
        extracted.total,
        extracted.category,
        extracted.payment_method,
        extracted.reference_no,
        extracted.confidence_score,
        dupCheck.isDuplicate ? 1 : 0,
        dupCheck.matchedExpenseId || null,
        now,
        now,
      ]
    );

    // Increment usage
    execute(db, `UPDATE entitlements SET receipts_used_this_month = receipts_used_this_month + 1 WHERE org_id = ?`, [
      orgId,
    ]);

    const processingMs = Date.now() - t0;

    res.json({
      success: true,
      expenseId,
      receiptId,
      extracted,
      processingMs,
      duplicateWarning: dupCheck.isDuplicate ? dupCheck : null,
    });
  } catch (err: any) {
    console.error('Upload processing error:', err);
    res.status(500).json({ error: err.message || 'Error processing receipt' });
  }
});

app.get('/api/expenses', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const { search, status, category, currency, startDate, endDate } = req.query;

    let sql = `
      SELECT e.*, r.filename, r.file_type
      FROM expenses e
      LEFT JOIN receipts r ON r.id = e.receipt_id
      WHERE e.org_id = ?
    `;
    const params: any[] = [orgId];

    if (search) {
      sql += ` AND (e.merchant LIKE ? OR e.notes LIKE ? OR e.reference_no LIKE ?)`;
      const term = `%${search}%`;
      params.push(term, term, term);
    }
    if (status && status !== 'all') {
      sql += ` AND e.review_status = ?`;
      params.push(status);
    }
    if (category && category !== 'all') {
      sql += ` AND e.category = ?`;
      params.push(category);
    }
    if (currency && currency !== 'all') {
      sql += ` AND e.currency = ?`;
      params.push(currency);
    }
    if (startDate) {
      sql += ` AND e.date >= ?`;
      params.push(startDate);
    }
    if (endDate) {
      sql += ` AND e.date <= ?`;
      params.push(endDate);
    }

    sql += ` ORDER BY e.date DESC, e.created_at DESC`;

    const expenses = queryAll(db, sql, params);
    res.json({ expenses });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/expenses/stats', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();

    // Group totals by currency strictly (as mandated in Section 4.E: never sum different currencies without verified rate)
    const currencyTotals = queryAll(
      db,
      `SELECT currency, SUM(total) as sum_total, COUNT(id) as count
       FROM expenses WHERE org_id = ?
       GROUP BY currency`,
      [orgId]
    );

    const pendingCount = queryOne(
      db,
      `SELECT COUNT(id) as count FROM expenses WHERE org_id = ? AND review_status = 'pending_review'`,
      [orgId]
    )?.count || 0;

    const reviewedCount = queryOne(
      db,
      `SELECT COUNT(id) as count FROM expenses WHERE org_id = ? AND review_status = 'reviewed'`,
      [orgId]
    )?.count || 0;

    const totalCount = queryOne(
      db,
      `SELECT COUNT(id) as count FROM expenses WHERE org_id = ?`,
      [orgId]
    )?.count || 0;

    const categoryBreakdown = queryAll(
      db,
      `SELECT category, currency, SUM(total) as amount, COUNT(id) as count
       FROM expenses WHERE org_id = ?
       GROUP BY category, currency
       ORDER BY amount DESC`,
      [orgId]
    );

    res.json({
      currencyTotals,
      pendingCount,
      reviewedCount,
      totalCount,
      categoryBreakdown,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/expenses/export.csv', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const expenses = queryAll(
      db,
      `SELECT * FROM expenses WHERE org_id = ? ORDER BY date DESC`,
      [orgId]
    );

    const csvData = generateCsvExport(expenses);
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="receiptflow-expenses-${Date.now()}.csv"`);
    res.send(csvData);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/expenses/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const { id } = req.params;
    const {
      merchant,
      date,
      currency,
      subtotal,
      tax,
      total,
      category,
      payment_method,
      reference_no,
      review_status,
      notes,
    } = req.body;

    const existing = queryOne(db, 'SELECT id FROM expenses WHERE id = ? AND org_id = ?', [id, orgId]);
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found or unauthorized' });
    }

    const now = new Date().toISOString();
    execute(
      db,
      `UPDATE expenses 
       SET merchant = ?, date = ?, currency = ?, subtotal = ?, tax = ?, total = ?, 
           category = ?, payment_method = ?, reference_no = ?, review_status = ?, notes = ?, updated_at = ?
       WHERE id = ? AND org_id = ?`,
      [
        merchant,
        date,
        currency,
        Number(subtotal) || 0,
        Number(tax) || 0,
        Number(total) || 0,
        category,
        payment_method || '',
        reference_no || '',
        review_status || 'reviewed',
        notes || '',
        now,
        id,
        orgId,
      ]
    );

    const updated = queryOne(db, 'SELECT * FROM expenses WHERE id = ?', [id]);
    res.json({ success: true, expense: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/expenses/:id/approve', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const { id } = req.params;

    const existing = queryOne(db, 'SELECT id FROM expenses WHERE id = ? AND org_id = ?', [id, orgId]);
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    const now = new Date().toISOString();
    execute(db, `UPDATE expenses SET review_status = 'reviewed', updated_at = ? WHERE id = ?`, [now, id]);

    res.json({ success: true, message: 'Expense marked as reviewed.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/expenses/:id', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const { id } = req.params;

    const existing = queryOne(db, 'SELECT id, receipt_id FROM expenses WHERE id = ? AND org_id = ?', [id, orgId]);
    if (!existing) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    execute(db, 'DELETE FROM expenses WHERE id = ? AND org_id = ?', [id, orgId]);
    if (existing.receipt_id) {
      execute(db, 'DELETE FROM receipts WHERE id = ? AND org_id = ?', [existing.receipt_id, orgId]);
    }
    saveDb();

    res.json({ success: true, message: 'Expense deleted successfully.' });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// GOOGLE SHEETS INTEGRATION APIS
// ==========================================

app.get('/api/sheets/config', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const config = queryOne(db, 'SELECT * FROM sheets_configs WHERE org_id = ?', [orgId]);
    res.json({ sheetsConfig: config });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sheets/create', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const { accessToken, title } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Google OAuth Access Token is required.' });
    }

    const result = await createGoogleSpreadsheet(accessToken, title || 'ReceiptFlow Expenses');
    const configId = `sc_${Date.now()}`;

    execute(
      db,
      `INSERT INTO sheets_configs (id, org_id, spreadsheet_id, spreadsheet_name, sheet_name, spreadsheet_url, last_synced_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(org_id) DO UPDATE SET 
         spreadsheet_id = excluded.spreadsheet_id,
         spreadsheet_name = excluded.spreadsheet_name,
         spreadsheet_url = excluded.spreadsheet_url`,
      [configId, orgId, result.spreadsheetId, title || 'ReceiptFlow Expenses', result.sheetName, result.spreadsheetUrl, '']
    );

    res.json({ success: true, ...result });
  } catch (err: any) {
    console.error('Create sheet error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sheets/connect-existing', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const { spreadsheetId, spreadsheetName, spreadsheetUrl } = req.body;

    if (!spreadsheetId) {
      return res.status(400).json({ error: 'Spreadsheet ID is required.' });
    }

    const configId = `sc_${Date.now()}`;
    const cleanUrl = spreadsheetUrl || `https://docs.google.com/spreadsheets/d/${spreadsheetId}/edit`;

    execute(
      db,
      `INSERT INTO sheets_configs (id, org_id, spreadsheet_id, spreadsheet_name, sheet_name, spreadsheet_url, last_synced_at)
       VALUES (?, ?, ?, ?, 'Expenses', ?, '')
       ON CONFLICT(org_id) DO UPDATE SET 
         spreadsheet_id = excluded.spreadsheet_id,
         spreadsheet_name = excluded.spreadsheet_name,
         spreadsheet_url = excluded.spreadsheet_url`,
      [configId, orgId, spreadsheetId, spreadsheetName || 'Expenses Spreadsheet', cleanUrl]
    );

    res.json({ success: true, spreadsheetId, spreadsheetUrl: cleanUrl });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/sheets/sync', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const { accessToken } = req.body;

    if (!accessToken) {
      return res.status(400).json({ error: 'Google OAuth Access Token is required.' });
    }

    const config = queryOne(db, 'SELECT * FROM sheets_configs WHERE org_id = ?', [orgId]);
    if (!config) {
      return res.status(400).json({ error: 'No Google Spreadsheet is currently connected.' });
    }

    // Only sync reviewed records as mandated in Section 4.F
    const expenses = queryAll(
      db,
      `SELECT * FROM expenses WHERE org_id = ? AND review_status = 'reviewed' ORDER BY date ASC`,
      [orgId]
    );

    if (expenses.length === 0) {
      return res.json({
        success: true,
        message: 'No reviewed expenses to sync. Please review expenses before syncing.',
        syncedCount: 0,
      });
    }

    const syncResult = await syncExpensesToGoogleSheet(
      accessToken,
      config.spreadsheet_id,
      config.sheet_name || 'Expenses',
      expenses
    );

    const now = new Date().toISOString();
    execute(db, `UPDATE sheets_configs SET last_synced_at = ? WHERE org_id = ?`, [now, orgId]);
    execute(db, `UPDATE expenses SET synced_to_sheets = 1 WHERE org_id = ? AND review_status = 'reviewed'`, [orgId]);

    res.json({
      success: true,
      ...syncResult,
      spreadsheetUrl: config.spreadsheet_url,
      lastSyncedAt: now,
    });
  } catch (err: any) {
    console.error('Sheets sync error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// PAYPAL BILLING APIS
// ==========================================

app.get('/api/billing/config', (req: Request, res: Response) => {
  const config = getPayPalConfig();
  res.json({
    env: config.env,
    clientId: config.clientId,
    productId: config.productId,
    planId: config.planId,
    priceMonthly: '9.99',
    currency: 'USD',
    isConfigured: config.isConfigured,
  });
});

app.get('/api/billing/readiness', async (req: Request, res: Response) => {
  try {
    const report = await checkPayPalReadiness();
    res.json(report);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/billing/create-subscription', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required.' });
    }

    const now = new Date().toISOString();
    const subRecordId = `sub_${Date.now()}`;

    execute(
      db,
      `INSERT INTO subscriptions (id, org_id, plan_id, status, paypal_subscription_id, current_period_start, current_period_end, created_at, updated_at)
       VALUES (?, ?, 'pro', 'pending', ?, ?, ?, ?, ?)`,
      [subRecordId, orgId, subscriptionId, now, now, now, now]
    );

    res.json({ success: true, subRecordId });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/billing/verify-subscription', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const { subscriptionId } = req.body;

    if (!subscriptionId) {
      return res.status(400).json({ error: 'Subscription ID is required.' });
    }

    // Server-side verification with PayPal REST API
    const verifyResult = await verifyPayPalSubscription(subscriptionId);

    if (verifyResult.status === 'ACTIVE' || verifyResult.status === 'APPROVED') {
      const now = new Date().toISOString();
      const periodEnd =
        verifyResult.nextBillingTime || new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString();

      execute(
        db,
        `UPDATE subscriptions 
         SET status = 'active', plan_id = 'pro', current_period_end = ?, updated_at = ?
         WHERE paypal_subscription_id = ? AND org_id = ?`,
        [periodEnd, now, subscriptionId, orgId]
      );

      execute(
        db,
        `UPDATE entitlements 
         SET plan_code = 'pro', monthly_receipt_quota = 100, features_json = ?
         WHERE org_id = ?`,
        [
          JSON.stringify({
            duplicateDetection: true,
            automatedSync: true,
            unlimitedExports: true,
          }),
          orgId,
        ]
      );

      return res.json({
        success: true,
        status: 'active',
        plan: 'pro',
        quota: 100,
        currentPeriodEnd: periodEnd,
      });
    } else {
      return res.status(400).json({
        success: false,
        status: verifyResult.status,
        error: `Subscription is not active (current status: ${verifyResult.status}).`,
      });
    }
  } catch (err: any) {
    console.error('Verify subscription error:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/billing/cancel-subscription', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const sub = queryOne(
      db,
      `SELECT * FROM subscriptions WHERE org_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1`,
      [orgId]
    );

    if (!sub || !sub.paypal_subscription_id) {
      return res.status(400).json({ error: 'No active PayPal subscription found to cancel.' });
    }

    await cancelPayPalSubscription(sub.paypal_subscription_id);

    const now = new Date().toISOString();
    execute(
      db,
      `UPDATE subscriptions SET status = 'cancelled', cancelled_at = ?, updated_at = ? WHERE id = ?`,
      [now, now, sub.id]
    );

    res.json({
      success: true,
      message: 'Subscription successfully cancelled. Your Pro access remains valid until the end of your billing cycle.',
      currentPeriodEnd: sub.current_period_end,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Official PayPal Webhook receiver
app.post('/api/billing/webhook', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const event = req.body;

    const isValid = await verifyWebhookSignature(req.headers as any, event);
    if (!isValid) {
      console.warn('Rejected invalid PayPal webhook signature');
      return res.status(400).json({ error: 'Invalid webhook signature.' });
    }

    const result = await processWebhookEvent(db, event);
    res.status(200).json(result);
  } catch (err: any) {
    console.error('Webhook processing error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// BENCHMARK & TEST SUITE APIS
// ==========================================

app.get('/api/benchmark/history', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const benchmarks = queryAll(
      db,
      'SELECT * FROM benchmarks WHERE org_id = ? ORDER BY created_at DESC LIMIT 20',
      [orgId]
    );
    res.json({ benchmarks });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/benchmark/record', async (req: Request, res: Response) => {
  try {
    const { orgId } = await resolveAuthContext(req);
    const db = await getDb();
    const { sessionName, mode, receiptsCount, durationSeconds, clicksCount, keystrokesCount } = req.body;

    const id = `bm_${Date.now()}`;
    const monthlyCost = mode === 'receiptflow' ? 3.0 : 5.0;

    execute(
      db,
      `INSERT INTO benchmarks (id, org_id, session_name, mode, receipts_count, duration_seconds, clicks_count, keystrokes_count, monthly_cost_per_user, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id,
        orgId,
        sessionName || 'Interactive Benchmark Session',
        mode,
        Number(receiptsCount) || 1,
        Number(durationSeconds) || 0,
        Number(clicksCount) || 0,
        Number(keystrokesCount) || 0,
        monthlyCost,
        new Date().toISOString(),
      ]
    );

    res.json({ success: true, benchmarkId: id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/tests/run', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const summary = await runAllTests(db);
    res.json(summary);
  } catch (err: any) {
    console.error('Test suite execution error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ==========================================
// STATIC FILES & DEV SERVER MOUNT
// ==========================================

async function startServer() {
  // Pre-initialize DB
  await getDb();

  if (process.env.NODE_ENV === 'production') {
    // Serve production build
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.resolve(distPath, 'index.html'));
    });
  } else {
    // Development Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`ReceiptFlow server listening on port ${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
