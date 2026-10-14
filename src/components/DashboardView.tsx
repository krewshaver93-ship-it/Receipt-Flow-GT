import React from 'react';
import {
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Receipt,
  FileSpreadsheet,
  Plus,
  ArrowUpRight,
  Clock,
  Sparkles,
  ExternalLink,
} from 'lucide-react';
import { Expense, SheetsConfig, Entitlement } from '../types';

interface DashboardViewProps {
  stats: {
    currencyTotals: { currency: string; sum_total: number; count: number }[];
    pendingCount: number;
    reviewedCount: number;
    totalCount: number;
    categoryBreakdown: { category: string; currency: string; amount: number; count: number }[];
  } | null;
  recentExpenses: Expense[];
  sheetsConfig: SheetsConfig | null;
  entitlement: Entitlement | null;
  onOpenAddReceipt: () => void;
  onSelectTab: (tab: string) => void;
  onApproveExpense: (id: string) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  stats,
  recentExpenses,
  sheetsConfig,
  entitlement,
  onOpenAddReceipt,
  onSelectTab,
  onApproveExpense,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Welcome / Hero Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-slate-800 rounded-2xl p-6 text-white shadow-xs flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <div className="flex items-center space-x-2 mb-1">
            <span className="px-2 py-0.5 rounded bg-blue-500/20 text-blue-300 border border-blue-400/30 text-2xs font-semibold uppercase tracking-wider">
              Google Workspace Connected
            </span>
            {entitlement?.plan_code === 'pro' ? (
              <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-2xs font-semibold uppercase tracking-wider">
                Pro Active ($9.99/mo)
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-400/30 text-2xs font-semibold uppercase tracking-wider">
                Free Tier
              </span>
            )}
          </div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
            Streamlined Expense Capture
          </h1>
          <p className="text-xs sm:text-sm text-slate-300 mt-1 max-w-xl">
            Drop receipts, extract clean data in 2 clicks, and sync directly to Google Sheets with zero manual entry.
          </p>
        </div>
        <div className="flex items-center space-x-3 shrink-0">
          <button
            onClick={() => onSelectTab('benchmark')}
            className="px-3.5 py-2 bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700 text-xs font-semibold rounded-xl text-slate-200 transition-colors flex items-center space-x-1.5"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Expensify Benchmark</span>
          </button>
          <button
            onClick={onOpenAddReceipt}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-xs font-bold rounded-xl text-white shadow-xs hover:shadow transition-all flex items-center space-x-1.5 transform active:scale-98"
          >
            <Plus className="w-4 h-4 stroke-[3]" />
            <span>Add receipt</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Currency Totals (Grouped strictly by currency) */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Total Recorded Spend</span>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          {stats?.currencyTotals && stats.currencyTotals.length > 0 ? (
            <div className="space-y-1">
              {stats.currencyTotals.map((ct) => (
                <div key={ct.currency} className="flex items-baseline justify-between">
                  <span className="text-xl font-bold text-slate-900 tracking-tight">
                    {ct.currency === 'USD' ? '$' : ct.currency === 'EUR' ? '€' : `${ct.currency} `}
                    {ct.sum_total.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                  <span className="text-2xs font-semibold text-slate-400 uppercase">
                    {ct.count} {ct.count === 1 ? 'receipt' : 'receipts'}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xl font-bold text-slate-900">$0.00</div>
          )}
          <p className="text-2xs text-slate-400 mt-2">Grouped by currency per GAAP accounting</p>
        </div>

        {/* Pending Review */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Pending Reviews</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats?.pendingCount ?? 0}
          </div>
          <p className="text-2xs text-amber-600 font-medium mt-2">
            {(stats?.pendingCount ?? 0) > 0 ? 'Requires attention before Sheets sync' : 'All receipts reviewed!'}
          </p>
        </div>

        {/* Reviewed & Synced */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
            <span>Reviewed &amp; Verified</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-slate-900">
            {stats?.reviewedCount ?? 0}
          </div>
          <p className="text-2xs text-emerald-600 font-medium mt-2">
            Ready for Google Sheets export
          </p>
        </div>

        {/* Google Sheets Sync Card */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between text-slate-500 text-xs font-medium mb-2">
              <span>Google Sheet Sync</span>
              <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            </div>
            {sheetsConfig ? (
              <div>
                <p className="text-xs font-bold text-slate-900 truncate">
                  {sheetsConfig.spreadsheet_name}
                </p>
                <p className="text-2xs text-slate-500 mt-0.5">
                  Last sync: {sheetsConfig.last_synced_at ? sheetsConfig.last_synced_at.slice(0, 16).replace('T', ' ') : 'Pending'}
                </p>
              </div>
            ) : (
              <div>
                <p className="text-xs font-semibold text-slate-600">No sheet linked</p>
                <p className="text-2xs text-slate-400 mt-0.5">Connect in Integrations tab</p>
              </div>
            )}
          </div>
          <button
            onClick={() => onSelectTab('integrations')}
            className="mt-3 text-xs font-semibold text-blue-600 hover:text-blue-700 inline-flex items-center space-x-1"
          >
            <span>Configure Google Sheets</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Split Grid: Pending Reviews / Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Actionable Recent Expenses */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 shadow-2xs p-5">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-sm font-bold text-slate-900">Recent Expense Activity</h2>
              <p className="text-2xs text-slate-500">Live review status and transaction details</p>
            </div>
            <button
              onClick={() => onSelectTab('expenses')}
              className="text-xs font-semibold text-blue-600 hover:text-blue-700"
            >
              View all ({stats?.totalCount ?? 0})
            </button>
          </div>

          {recentExpenses.length === 0 ? (
            <div className="p-8 text-center border-2 border-dashed border-slate-200 rounded-xl">
              <Receipt className="w-8 h-8 text-slate-300 mx-auto mb-2" />
              <p className="text-xs font-semibold text-slate-700">No expense records found</p>
              <p className="text-2xs text-slate-500 mt-0.5 mb-3">
                Upload your first receipt image or PDF to test instant extraction.
              </p>
              <button
                onClick={onOpenAddReceipt}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs"
              >
                Add receipt
              </button>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentExpenses.slice(0, 5).map((exp) => (
                <div key={exp.id} className="py-3 flex items-center justify-between gap-3">
                  <div className="flex items-center space-x-3 truncate">
                    <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs shrink-0">
                      {exp.merchant.charAt(0)}
                    </div>
                    <div className="truncate">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-900 truncate">
                          {exp.merchant}
                        </span>
                        {exp.is_duplicate_flag === 1 && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-800 text-3xs font-semibold rounded">
                            Duplicate Flag
                          </span>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 text-2xs text-slate-400 mt-0.5">
                        <span>{exp.date}</span>
                        <span>•</span>
                        <span>{exp.category}</span>
                        {exp.payment_method && (
                          <>
                            <span>•</span>
                            <span>{exp.payment_method}</span>
                          </>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center space-x-3 shrink-0">
                    <div className="text-right">
                      <div className="text-xs font-bold text-slate-900">
                        {exp.currency === 'USD' ? '$' : `${exp.currency} `}
                        {exp.total.toFixed(2)}
                      </div>
                      <span
                        className={`inline-block text-3xs font-semibold uppercase px-1.5 py-0.2 rounded ${
                          exp.review_status === 'reviewed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {exp.review_status === 'reviewed' ? 'Reviewed' : 'Pending Review'}
                      </span>
                    </div>

                    {exp.review_status === 'pending_review' && (
                      <button
                        onClick={() => onApproveExpense(exp.id)}
                        className="px-2.5 py-1 bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200 hover:border-emerald-300 text-2xs font-semibold rounded-md transition-colors"
                        title="Mark Reviewed"
                      >
                        Approve
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Col: Category Breakdown & Quota Card */}
        <div className="space-y-4">
          {/* Monthly Quota Card */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
              Monthly Usage Quota
            </h3>
            <div className="flex items-baseline justify-between mb-1.5">
              <span className="text-sm font-bold text-slate-800">
                {entitlement?.receipts_used_this_month ?? 0} / {entitlement?.monthly_receipt_quota ?? 5} receipts
              </span>
              <span className="text-2xs text-slate-500 uppercase font-semibold">
                {entitlement?.plan_code === 'pro' ? 'Pro Plan' : 'Free Tier'}
              </span>
            </div>
            <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden mb-3">
              <div
                className="bg-blue-600 h-full rounded-full transition-all"
                style={{
                  width: `${Math.min(
                    100,
                    (((entitlement?.receipts_used_this_month ?? 0) /
                      (entitlement?.monthly_receipt_quota ?? 5)) *
                      100)
                  )}%`,
                }}
              />
            </div>
            <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-lg">
              <div className="text-xs font-bold text-blue-950">ReceiptFlow Pro is $9.99/user/mo</div>
              <p className="text-2xs text-blue-800 mt-0.5">
                Get 100 receipts/month fair-use extraction, duplicate detection, and instant Google Sheets sync.
              </p>
              <button
                onClick={() => onSelectTab('billing')}
                className="mt-2 text-2xs font-bold text-blue-700 hover:text-blue-800 underline"
              >
                View billing details &rarr;
              </button>
            </div>
          </div>

          {/* Category Breakdown */}
          <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
              Spend by Category
            </h3>
            {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
              <div className="space-y-2">
                {stats.categoryBreakdown.slice(0, 5).map((cat) => (
                  <div key={`${cat.category}-${cat.currency}`} className="flex items-center justify-between text-xs">
                    <span className="text-slate-600 truncate">{cat.category}</span>
                    <span className="font-semibold text-slate-900">
                      ${cat.amount.toFixed(2)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-2xs text-slate-400">No categorized expenses recorded yet.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
