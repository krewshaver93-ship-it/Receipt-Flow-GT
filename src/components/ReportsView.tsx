import React from 'react';
import { BarChart3, Download, DollarSign, Calendar, TrendingUp } from 'lucide-react';
import { Expense } from '../types';

interface ReportsViewProps {
  expenses: Expense[];
  stats: {
    currencyTotals: { currency: string; sum_total: number; count: number }[];
    categoryBreakdown: { category: string; currency: string; amount: number; count: number }[];
  } | null;
}

export const ReportsView: React.FC<ReportsViewProps> = ({ expenses, stats }) => {
  // Compute tax deductions summary
  const totalTax = expenses.reduce((sum, e) => sum + e.tax, 0);
  const totalSubtotal = expenses.reduce((sum, e) => sum + e.subtotal, 0);
  const totalGross = expenses.reduce((sum, e) => sum + e.total, 0);

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Expense &amp; Tax Reports</h1>
          <p className="text-2xs text-slate-500">
            Categorized summaries ready for bookkeepers, accountants, and tax preparation.
          </p>
        </div>
        <a
          href="/api/expenses/export.csv"
          download
          className="px-3.5 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
        >
          <Download className="w-3.5 h-3.5 text-slate-500" />
          <span>Export RFC 4180 CSV</span>
        </a>
      </div>

      {/* Tax Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-2xs uppercase font-bold text-slate-400">Net Expense (Pre-Tax)</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            ${totalSubtotal.toFixed(2)}
          </div>
          <p className="text-2xs text-slate-400 mt-1">Deductible business principal</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-2xs uppercase font-bold text-slate-400">Total Tax / VAT Paid</span>
          <div className="text-2xl font-bold text-emerald-700 mt-1 font-mono">
            ${totalTax.toFixed(2)}
          </div>
          <p className="text-2xs text-slate-400 mt-1">Input VAT / Sales Tax claimable</p>
        </div>

        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs">
          <span className="text-2xs uppercase font-bold text-slate-400">Gross Spend</span>
          <div className="text-2xl font-bold text-slate-900 mt-1 font-mono">
            ${totalGross.toFixed(2)}
          </div>
          <p className="text-2xs text-slate-400 mt-1">{expenses.length} verified transactions</p>
        </div>
      </div>

      {/* Category Breakdown Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-6">
        <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-3">
          Category Distribution
        </h3>
        {stats?.categoryBreakdown && stats.categoryBreakdown.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-600">
              <thead className="bg-slate-50 text-slate-500 text-3xs uppercase font-bold tracking-wider">
                <tr>
                  <th className="px-4 py-2.5">Category</th>
                  <th className="px-4 py-2.5">Currency</th>
                  <th className="px-4 py-2.5 text-center">Receipt Count</th>
                  <th className="px-4 py-2.5 text-right">Total Amount</th>
                  <th className="px-4 py-2.5 text-right">% of Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {stats.categoryBreakdown.map((cat) => {
                  const pct = totalGross > 0 ? (cat.amount / totalGross) * 100 : 0;
                  return (
                    <tr key={`${cat.category}-${cat.currency}`} className="hover:bg-slate-50">
                      <td className="px-4 py-2.5 font-bold text-slate-900">{cat.category}</td>
                      <td className="px-4 py-2.5 font-mono text-slate-500">{cat.currency}</td>
                      <td className="px-4 py-2.5 text-center">{cat.count}</td>
                      <td className="px-4 py-2.5 text-right font-mono font-bold text-slate-800">
                        ${cat.amount.toFixed(2)}
                      </td>
                      <td className="px-4 py-2.5 text-right font-mono text-slate-500">
                        {pct.toFixed(1)}%
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-2xs text-slate-400">No categories recorded yet.</p>
        )}
      </div>
    </div>
  );
};
