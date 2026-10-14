import {
  UserProfile,
  Organization,
  Entitlement,
  Expense,
  SheetsConfig,
  Subscription,
  BenchmarkRecord,
  TestSuiteResponse,
} from './types';

let currentOrgId: string = '';
let currentUserId: string = '';

export function setApiAuthContext(orgId: string, userId: string) {
  currentOrgId = orgId;
  currentUserId = userId;
}

function getHeaders(customHeaders: Record<string, string> = {}): Record<string, string> {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...customHeaders,
  };
  if (currentOrgId) headers['x-org-id'] = currentOrgId;
  if (currentUserId) headers['x-user-id'] = currentUserId;
  return headers;
}

export async function syncSession(userData: {
  email: string;
  name?: string;
  picture?: string;
  uid?: string;
}): Promise<{
  user: UserProfile;
  organization: Organization;
  entitlement: Entitlement;
  sheetsConfig?: SheetsConfig;
}> {
  const res = await fetch('/api/auth/session', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(userData),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchExpenses(params?: {
  search?: string;
  status?: string;
  category?: string;
  currency?: string;
  startDate?: string;
  endDate?: string;
}): Promise<{ expenses: Expense[] }> {
  const query = new URLSearchParams();
  if (params?.search) query.set('search', params.search);
  if (params?.status) query.set('status', params.status);
  if (params?.category) query.set('category', params.category);
  if (params?.currency) query.set('currency', params.currency);
  if (params?.startDate) query.set('startDate', params.startDate);
  if (params?.endDate) query.set('endDate', params.endDate);

  const res = await fetch(`/api/expenses?${query.toString()}`, {
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchStats(): Promise<{
  currencyTotals: { currency: string; sum_total: number; count: number }[];
  pendingCount: number;
  reviewedCount: number;
  totalCount: number;
  categoryBreakdown: { category: string; currency: string; amount: number; count: number }[];
}> {
  const res = await fetch('/api/expenses/stats', { headers: getHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function uploadReceipt(
  fileBase64: string,
  filename: string,
  bypassDuplicateCheck: boolean = false
): Promise<{
  success: boolean;
  expenseId?: string;
  receiptId?: string;
  extracted?: any;
  processingMs?: number;
  duplicateDetected?: boolean;
  message?: string;
  dupCheck?: any;
  extractedData?: any;
}> {
  const res = await fetch('/api/receipts/upload', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ fileBase64, filename, bypassDuplicateCheck }),
  });

  const data = await res.json();
  if (!res.ok) {
    if (res.status === 409) {
      return data; // duplicate detected
    }
    throw new Error(data.error || 'Failed to upload receipt');
  }
  return data;
}

export async function updateExpense(id: string, updates: Partial<Expense>): Promise<{ expense: Expense }> {
  const res = await fetch(`/api/expenses/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(updates),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function approveExpense(id: string): Promise<void> {
  const res = await fetch(`/api/expenses/${id}/approve`, {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function deleteExpense(id: string): Promise<void> {
  const res = await fetch(`/api/expenses/${id}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
}

export async function fetchEntitlements(): Promise<{
  entitlement: Entitlement;
  subscription?: Subscription;
  pricing: any;
}> {
  const res = await fetch('/api/entitlements', { headers: getHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchSheetsConfig(): Promise<{ sheetsConfig: SheetsConfig | null }> {
  const res = await fetch('/api/sheets/config', { headers: getHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createGoogleSheet(accessToken: string, title?: string): Promise<{
  spreadsheetId: string;
  spreadsheetUrl: string;
  sheetName: string;
}> {
  const res = await fetch('/api/sheets/create', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ accessToken, title }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to create Google Sheet');
  }
  return res.json();
}

export async function connectExistingSheet(
  spreadsheetId: string,
  spreadsheetName?: string,
  spreadsheetUrl?: string
): Promise<any> {
  const res = await fetch('/api/sheets/connect-existing', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ spreadsheetId, spreadsheetName, spreadsheetUrl }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function syncToGoogleSheets(accessToken: string): Promise<{
  syncedCount: number;
  updatedCount: number;
  appendedCount: number;
  spreadsheetUrl: string;
  message?: string;
}> {
  const res = await fetch('/api/sheets/sync', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ accessToken }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Failed to sync to Google Sheet');
  }
  return res.json();
}

export async function fetchPayPalConfig(): Promise<{
  env: 'sandbox' | 'live';
  clientId: string;
  productId: string;
  planId: string;
  priceMonthly: string;
  currency: string;
  isConfigured: boolean;
}> {
  const res = await fetch('/api/billing/config');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchBillingReadiness(): Promise<{
  canReceiveRealPayments: boolean;
  environment: 'sandbox' | 'live';
  checks: { name: string; status: 'pass' | 'fail' | 'warn'; message: string }[];
  summary: string;
}> {
  const res = await fetch('/api/billing/readiness');
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function createSubscriptionRecord(subscriptionId: string): Promise<any> {
  const res = await fetch('/api/billing/create-subscription', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ subscriptionId }),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function verifySubscription(subscriptionId: string): Promise<any> {
  const res = await fetch('/api/billing/verify-subscription', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ subscriptionId }),
  });
  if (!res.ok) {
    const err = await res.json();
    throw new Error(err.error || 'Subscription verification failed');
  }
  return res.json();
}

export async function cancelSubscription(): Promise<any> {
  const res = await fetch('/api/billing/cancel-subscription', {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function fetchBenchmarkHistory(): Promise<{ benchmarks: BenchmarkRecord[] }> {
  const res = await fetch('/api/benchmark/history', { headers: getHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function recordBenchmark(data: {
  sessionName: string;
  mode: 'receiptflow' | 'expensify';
  receiptsCount: number;
  durationSeconds: number;
  clicksCount: number;
  keystrokesCount: number;
}): Promise<any> {
  const res = await fetch('/api/benchmark/record', {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function runAutomatedTests(): Promise<TestSuiteResponse> {
  const res = await fetch('/api/tests/run', { headers: getHeaders() });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function disconnectWorkspace(): Promise<any> {
  const res = await fetch('/api/auth/disconnect', {
    method: 'POST',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}

export async function deleteAccountAndData(): Promise<any> {
  const res = await fetch('/api/auth/account', {
    method: 'DELETE',
    headers: getHeaders(),
  });
  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
