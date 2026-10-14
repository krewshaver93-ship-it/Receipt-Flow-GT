import React from 'react';
import { FolderOpen, FileText, CheckCircle2, Hash, Calendar, DollarSign, Plus } from 'lucide-react';
import { Expense } from '../types';

interface ReceiptsViewProps {
  expenses: Expense[];
  onOpenAddReceipt: () => void;
  onEditExpense: (expense: Expense) => void;
}

export const ReceiptsView: React.FC<ReceiptsViewProps> = ({
  expenses,
  onOpenAddReceipt,
  onEditExpense,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Receipt Documents &amp; Audit Trail</h1>
          <p className="text-2xs text-slate-500">
            Immutable file hashes and cryptographic proof for tax authorities and bookkeepers.
          </p>
        </div>
        <button
          onClick={onOpenAddReceipt}
          className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center space-x-1"
        >
          <Plus className="w-4 h-4" />
          <span>Add receipt</span>
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {expenses.length === 0 ? (
          <div className="col-span-full p-12 text-center bg-white border border-slate-200 rounded-xl">
            <FolderOpen className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-slate-800">No receipts uploaded yet</h3>
            <p className="text-2xs text-slate-500 mt-1 mb-4">
              Capture your first receipt image or PDF document to begin.
            </p>
            <button
              onClick={onOpenAddReceipt}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg"
            >
              Add receipt
            </button>
          </div>
        ) : (
          expenses.map((exp) => (
            <div
              key={exp.id}
              onClick={() => onEditExpense(exp)}
              className="bg-white rounded-xl border border-slate-200 hover:border-blue-400 p-4 shadow-2xs hover:shadow-xs transition-all cursor-pointer group flex flex-col justify-between"
            >
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="w-8 h-8 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center">
                    <FileText className="w-4 h-4" />
                  </div>
                  <span
                    className={`text-3xs font-semibold uppercase px-2 py-0.5 rounded ${
                      exp.review_status === 'reviewed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-amber-50 text-amber-700 border border-amber-200'
                    }`}
                  >
                    {exp.review_status === 'reviewed' ? 'Reviewed' : 'Pending'}
                  </span>
                </div>

                <h3 className="text-xs font-bold text-slate-900 group-hover:text-blue-600 transition-colors truncate">
                  {exp.merchant}
                </h3>
                <p className="text-2xs text-slate-500 truncate mt-0.5">
                  {exp.filename || 'receipt.jpg'}
                </p>

                <div className="mt-3 pt-3 border-t border-slate-100 space-y-1 text-2xs text-slate-600">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Date:</span>
                    <span className="font-medium text-slate-800">{exp.date}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Total:</span>
                    <span className="font-bold font-mono text-slate-900">
                      ${exp.total.toFixed(2)} {exp.currency}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400">Sheets Row:</span>
                    <span className="font-mono text-slate-500">
                      {exp.synced_to_sheets ? '✓ Synced' : 'Queued'}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-100 flex items-center justify-between text-3xs text-slate-400">
                <span className="truncate font-mono">ID: {exp.id.slice(0, 10)}</span>
                <span className="font-semibold text-blue-600 group-hover:underline">View Record &rarr;</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
