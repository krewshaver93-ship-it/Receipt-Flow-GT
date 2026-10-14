import React, { useState } from 'react';
import {
  Search,
  Filter,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  Trash2,
  Edit2,
  ExternalLink,
  ChevronDown,
  RefreshCw,
  Plus,
} from 'lucide-react';
import { Expense } from '../types';

interface ExpensesViewProps {
  expenses: Expense[];
  onOpenAddReceipt: () => void;
  onApproveExpense: (id: string) => void;
  onDeleteExpense: (id: string) => void;
  onEditExpense: (expense: Expense) => void;
  onSyncGoogleSheets: () => void;
  isSyncingSheets: boolean;
}

const CATEGORIES = [
  'All',
  'Meals & Dining',
  'Travel & Transit',
  'Lodging',
  'Office Supplies',
  'Software & SaaS',
  'Utilities',
  'Professional Services',
  'Other',
];

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  onOpenAddReceipt,
  onApproveExpense,
  onDeleteExpense,
  onEditExpense,
  onSyncGoogleSheets,
  isSyncingSheets,
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [currencyFilter, setCurrencyFilter] = useState('all');

  const filteredExpenses = expenses.filter((exp) => {
    if (search) {
      const q = search.toLowerCase();
      const matchMerchant = exp.merchant.toLowerCase().includes(q);
      const matchNotes = (exp.notes || '').toLowerCase().includes(q);
      const matchRef = (exp.reference_no || '').toLowerCase().includes(q);
      if (!matchMerchant && !matchNotes && !matchRef) return false;
    }

    if (statusFilter !== 'all' && exp.review_status !== statusFilter) {
      return false;
    }

    if (categoryFilter !== 'All' && exp.category !== categoryFilter) {
      return false;
    }

    if (currencyFilter !== 'all' && exp.currency !== currencyFilter) {
      return false;
    }

    return true;
  });

  const currenciesFound = Array.from(new Set(expenses.map((e) => e.currency)));

  return (
    <div className="space-y-4">
      {/* Action Bar & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Expenses &amp; Review Ledger</h1>
          <p className="text-2xs text-slate-500">
            Review extracted receipt records before committing to Google Sheets or tax export.
          </p>
        </div>

        <div className="flex items-center space-x-2">
          {/* CSV Export Button */}
          <a
            href="/api/expenses/export.csv"
            download
            className="px-3 py-1.5 bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </a>

          {/* Sync to Google Sheets */}
          <button
            onClick={onSyncGoogleSheets}
            disabled={isSyncingSheets}
            className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
          >
            <FileSpreadsheet className={`w-3.5 h-3.5 ${isSyncingSheets ? 'animate-spin' : ''}`} />
            <span>{isSyncingSheets ? 'Syncing...' : 'Sync to Sheets'}</span>
          </button>

          {/* Add Receipt CTA */}
          <button
            onClick={onOpenAddReceipt}
            className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center space-x-1"
          >
            <Plus className="w-4 h-4" />
            <span>Add receipt</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center gap-2 text-xs">
        {/* Search */}
        <div className="relative flex-1 min-w-[200px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
          <input
            type="text"
            placeholder="Search merchant, notes, invoice #..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Status Filter */}
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
        >
          <option value="all">All Review Statuses</option>
          <option value="pending_review">Pending Review</option>
          <option value="reviewed">Reviewed &amp; Approved</option>
        </select>

        {/* Category Filter */}
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
        >
          {CATEGORIES.map((cat) => (
            <option key={cat} value={cat}>
              {cat === 'All' ? 'All Categories' : cat}
            </option>
          ))}
        </select>

        {/* Currency Filter */}
        {currenciesFound.length > 1 && (
          <select
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value)}
            className="px-2.5 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs text-slate-700 font-medium"
          >
            <option value="all">All Currencies</option>
            {currenciesFound.map((curr) => (
              <option key={curr} value={curr}>
                {curr}
              </option>
            ))}
          </select>
        )}

        <div className="text-2xs text-slate-400 ml-auto font-medium">
          Showing {filteredExpenses.length} of {expenses.length} records
        </div>
      </div>

      {/* Expenses Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-3xs font-bold tracking-wider">
              <tr>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Merchant</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3 text-right">Pre-Tax</th>
                <th className="px-4 py-3 text-right">Tax</th>
                <th className="px-4 py-3 text-right">Total</th>
                <th className="px-4 py-3">Sheets Sync</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-normal">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400 text-xs">
                    No matching expenses found.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Status */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span
                        className={`inline-flex items-center space-x-1 px-2 py-0.5 rounded text-3xs font-semibold uppercase tracking-wider ${
                          exp.review_status === 'reviewed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}
                      >
                        {exp.review_status === 'reviewed' ? (
                          <>
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Reviewed</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-3 h-3 text-amber-600" />
                            <span>Pending</span>
                          </>
                        )}
                      </span>
                      {exp.is_duplicate_flag === 1 && (
                        <span className="block mt-0.5 text-3xs font-semibold text-amber-700">
                          ⚠ Duplicate
                        </span>
                      )}
                    </td>

                    {/* Date */}
                    <td className="px-4 py-3 whitespace-nowrap font-medium text-slate-800">
                      {exp.date}
                    </td>

                    {/* Merchant & Reference */}
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{exp.merchant}</div>
                      {exp.reference_no && (
                        <div className="text-3xs text-slate-400 font-mono">
                          Ref: {exp.reference_no}
                        </div>
                      )}
                    </td>

                    {/* Category */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-medium text-3xs">
                        {exp.category}
                      </span>
                    </td>

                    {/* Subtotal */}
                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-slate-600">
                      ${exp.subtotal.toFixed(2)}
                    </td>

                    {/* Tax */}
                    <td className="px-4 py-3 text-right whitespace-nowrap font-mono text-slate-500">
                      ${exp.tax.toFixed(2)}
                    </td>

                    {/* Total */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <span className="font-bold font-mono text-slate-900 text-sm">
                        {exp.currency === 'USD' ? '$' : `${exp.currency} `}
                        {exp.total.toFixed(2)}
                      </span>
                    </td>

                    {/* Sheets Synced */}
                    <td className="px-4 py-3 whitespace-nowrap">
                      {exp.synced_to_sheets === 1 ? (
                        <span className="inline-flex items-center space-x-1 text-emerald-600 font-medium text-2xs">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>Synced</span>
                        </span>
                      ) : (
                        <span className="text-slate-400 text-2xs">Not yet synced</span>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="inline-flex items-center space-x-1.5">
                        {exp.review_status === 'pending_review' && (
                          <button
                            onClick={() => onApproveExpense(exp.id)}
                            className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 text-3xs font-bold rounded transition-colors"
                            title="Mark Reviewed"
                          >
                            Approve
                          </button>
                        )}
                        <button
                          onClick={() => onEditExpense(exp)}
                          className="p-1 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100"
                          title="Edit details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => onDeleteExpense(exp.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50"
                          title="Delete expense"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
