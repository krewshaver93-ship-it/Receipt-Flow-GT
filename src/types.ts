export interface UserProfile {
  id: string;
  org_id: string;
  email: string;
  name: string;
  picture?: string;
  role: string;
  created_at: string;
}

export interface Organization {
  id: string;
  name: string;
  created_at: string;
  settings_json?: string;
}

export interface Entitlement {
  id: string;
  org_id: string;
  plan_code: 'free' | 'pro';
  monthly_receipt_quota: number;
  receipts_used_this_month: number;
  quota_reset_date: string;
  features_json?: string;
}

export interface Expense {
  id: string;
  org_id: string;
  receipt_id?: string;
  user_id: string;
  merchant: string;
  date: string;
  currency: string;
  subtotal: number;
  tax: number;
  total: number;
  category: string;
  payment_method?: string;
  reference_no?: string;
  review_status: 'pending_review' | 'reviewed' | 'rejected';
  confidence_score: number;
  is_duplicate_flag: number;
  duplicate_of_id?: string;
  notes?: string;
  synced_to_sheets: number;
  sheets_row_id?: string;
  created_at: string;
  updated_at: string;
  filename?: string;
  file_type?: string;
}

export interface SheetsConfig {
  id: string;
  org_id: string;
  spreadsheet_id: string;
  spreadsheet_name: string;
  sheet_name: string;
  spreadsheet_url: string;
  last_synced_at?: string;
  auto_sync_on_review: number;
}

export interface Subscription {
  id: string;
  org_id: string;
  plan_id: string;
  status: 'active' | 'pending' | 'cancelled' | 'suspended' | 'expired' | 'payment_failed';
  paypal_subscription_id?: string;
  paypal_plan_id?: string;
  current_period_start: string;
  current_period_end: string;
  cancelled_at?: string;
}

export interface BenchmarkRecord {
  id: string;
  session_name: string;
  mode: 'receiptflow' | 'expensify';
  receipts_count: number;
  duration_seconds: number;
  clicks_count: number;
  keystrokes_count: number;
  monthly_cost_per_user: number;
  created_at: string;
}

export interface TestResultItem {
  category: 'functional' | 'payment' | 'security' | 'reliability';
  name: string;
  passed: boolean;
  durationMs: number;
  details: string;
}

export interface TestSuiteResponse {
  total: number;
  passed: number;
  failed: number;
  durationMs: number;
  results: TestResultItem[];
}
