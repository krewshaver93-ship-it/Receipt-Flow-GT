import initSqlJs, { Database } from 'sql.js';
import fs from 'fs';
import path from 'path';

const DB_FILE = path.resolve(process.cwd(), 'data.db');

let dbInstance: Database | null = null;

// Helper to save SQL.js database to disk
export function saveDb(): void {
  if (!dbInstance) return;
  try {
    const data = dbInstance.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(DB_FILE, buffer);
  } catch (err) {
    console.error('Error saving database to disk:', err);
  }
}

export async function getDb(): Promise<Database> {
  if (dbInstance) {
    return dbInstance;
  }

  const SQL = await initSqlJs();

  if (fs.existsSync(DB_FILE)) {
    try {
      const fileBuffer = fs.readFileSync(DB_FILE);
      dbInstance = new SQL.Database(fileBuffer);
    } catch (err) {
      console.warn('Failed to read existing DB file, creating fresh database:', err);
      dbInstance = new SQL.Database();
    }
  } else {
    dbInstance = new SQL.Database();
  }

  // Enable foreign keys
  dbInstance.run('PRAGMA foreign_keys = ON;');

  // Run migrations
  runMigrations(dbInstance);
  saveDb();

  return dbInstance;
}

function runMigrations(db: Database): void {
  // 1. Migrations table
  db.run(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version INTEGER PRIMARY KEY,
      applied_at TEXT NOT NULL
    );
  `);

  const rows = db.exec('SELECT version FROM schema_migrations ORDER BY version ASC');
  const appliedVersions = new Set<number>();
  if (rows.length > 0 && rows[0].values) {
    for (const val of rows[0].values) {
      appliedVersions.add(Number(val[0]));
    }
  }

  // Migration 1: Core tables
  if (!appliedVersions.has(1)) {
    db.run(`
      -- Organizations / Workspaces
      CREATE TABLE IF NOT EXISTS organizations (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        created_at TEXT NOT NULL,
        settings_json TEXT DEFAULT '{}'
      );

      -- Users
      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        name TEXT NOT NULL,
        picture TEXT DEFAULT '',
        role TEXT NOT NULL DEFAULT 'admin',
        created_at TEXT NOT NULL,
        FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
      );

      -- Receipt files metadata
      CREATE TABLE IF NOT EXISTS receipts (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        filename TEXT NOT NULL,
        file_hash TEXT NOT NULL,
        file_type TEXT NOT NULL,
        file_size INTEGER NOT NULL,
        storage_data TEXT NOT NULL,
        ocr_status TEXT NOT NULL DEFAULT 'pending',
        raw_text TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );

      -- Expenses records
      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        receipt_id TEXT,
        user_id TEXT NOT NULL,
        merchant TEXT NOT NULL,
        date TEXT NOT NULL,
        currency TEXT NOT NULL DEFAULT 'USD',
        subtotal REAL NOT NULL DEFAULT 0.0,
        tax REAL NOT NULL DEFAULT 0.0,
        total REAL NOT NULL DEFAULT 0.0,
        category TEXT NOT NULL DEFAULT 'Other',
        payment_method TEXT DEFAULT '',
        reference_no TEXT DEFAULT '',
        review_status TEXT NOT NULL DEFAULT 'pending_review',
        confidence_score REAL NOT NULL DEFAULT 0.9,
        is_duplicate_flag INTEGER NOT NULL DEFAULT 0,
        duplicate_of_id TEXT,
        notes TEXT DEFAULT '',
        synced_to_sheets INTEGER NOT NULL DEFAULT 0,
        sheets_row_id TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY (receipt_id) REFERENCES receipts(id) ON DELETE SET NULL
      );

      -- Google Sheets connection config
      CREATE TABLE IF NOT EXISTS sheets_configs (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL UNIQUE,
        spreadsheet_id TEXT NOT NULL,
        spreadsheet_name TEXT NOT NULL,
        sheet_name TEXT NOT NULL DEFAULT 'Expenses',
        spreadsheet_url TEXT NOT NULL,
        last_synced_at TEXT DEFAULT '',
        auto_sync_on_review INTEGER NOT NULL DEFAULT 1,
        FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
      );

      -- Subscriptions
      CREATE TABLE IF NOT EXISTS subscriptions (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        plan_id TEXT NOT NULL DEFAULT 'free',
        status TEXT NOT NULL DEFAULT 'active',
        paypal_subscription_id TEXT DEFAULT '',
        paypal_plan_id TEXT DEFAULT '',
        current_period_start TEXT NOT NULL,
        current_period_end TEXT NOT NULL,
        cancelled_at TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
      );

      -- Plan entitlements & usage quotas
      CREATE TABLE IF NOT EXISTS entitlements (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL UNIQUE,
        plan_code TEXT NOT NULL DEFAULT 'free',
        monthly_receipt_quota INTEGER NOT NULL DEFAULT 5,
        receipts_used_this_month INTEGER NOT NULL DEFAULT 0,
        quota_reset_date TEXT NOT NULL,
        features_json TEXT NOT NULL DEFAULT '{}',
        FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
      );

      -- Webhook idempotent events log
      CREATE TABLE IF NOT EXISTS webhook_events (
        id TEXT PRIMARY KEY,
        event_id TEXT NOT NULL UNIQUE,
        event_type TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'processed',
        payload_json TEXT NOT NULL,
        processed_at TEXT NOT NULL
      );

      -- Audit logs
      CREATE TABLE IF NOT EXISTS audit_logs (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        user_id TEXT NOT NULL,
        action TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id TEXT NOT NULL,
        details_json TEXT DEFAULT '{}',
        ip_address TEXT DEFAULT '',
        created_at TEXT NOT NULL,
        FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
      );

      -- Benchmarks records (Expensify vs ReceiptFlow)
      CREATE TABLE IF NOT EXISTS benchmarks (
        id TEXT PRIMARY KEY,
        org_id TEXT NOT NULL,
        session_name TEXT NOT NULL,
        mode TEXT NOT NULL,
        receipts_count INTEGER NOT NULL,
        duration_seconds REAL NOT NULL,
        clicks_count INTEGER NOT NULL,
        keystrokes_count INTEGER NOT NULL,
        monthly_cost_per_user REAL NOT NULL,
        created_at TEXT NOT NULL,
        FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
      );

      -- Indexes for performance & tenant isolation
      CREATE INDEX IF NOT EXISTS idx_expenses_org_date ON expenses(org_id, date);
      CREATE INDEX IF NOT EXISTS idx_expenses_review ON expenses(org_id, review_status);
      CREATE INDEX IF NOT EXISTS idx_receipts_hash ON receipts(org_id, file_hash);
      CREATE INDEX IF NOT EXISTS idx_users_org ON users(org_id);
      CREATE INDEX IF NOT EXISTS idx_audit_org ON audit_logs(org_id, created_at);
      CREATE INDEX IF NOT EXISTS idx_webhook_event_id ON webhook_events(event_id);
    `);

    db.run(`INSERT INTO schema_migrations (version, applied_at) VALUES (1, ?);`, [new Date().toISOString()]);
  }
}

// Utility wrapper for executing queries with parameters and returning object rows
export function queryAll<T = any>(db: Database, sql: string, params: any[] = []): T[] {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    const results: T[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject() as unknown as T);
    }
    return results;
  } finally {
    stmt.free();
  }
}

export function queryOne<T = any>(db: Database, sql: string, params: any[] = []): T | null {
  const items = queryAll<T>(db, sql, params);
  return items.length > 0 ? items[0] : null;
}

export function execute(db: Database, sql: string, params: any[] = []): void {
  const stmt = db.prepare(sql);
  try {
    stmt.bind(params);
    stmt.step();
  } finally {
    stmt.free();
    saveDb();
  }
}
