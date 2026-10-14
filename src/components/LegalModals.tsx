import React from 'react';
import { X, ShieldCheck, FileText, DollarSign, RefreshCw, Mail, Trash2 } from 'lucide-react';

interface LegalModalProps {
  type: 'privacy' | 'terms' | 'pricing' | 'cancellation' | 'support' | 'data-deletion' | null;
  onClose: () => void;
}

export const LegalModal: React.FC<LegalModalProps> = ({ type, onClose }) => {
  if (!type) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[85vh] flex flex-col border border-slate-200">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <div className="flex items-center space-x-2">
            {type === 'privacy' && <ShieldCheck className="w-5 h-5 text-blue-600" />}
            {type === 'terms' && <FileText className="w-5 h-5 text-blue-600" />}
            {type === 'pricing' && <DollarSign className="w-5 h-5 text-blue-600" />}
            {type === 'cancellation' && <RefreshCw className="w-5 h-5 text-blue-600" />}
            {type === 'support' && <Mail className="w-5 h-5 text-blue-600" />}
            {type === 'data-deletion' && <Trash2 className="w-5 h-5 text-rose-600" />}
            <h2 className="text-lg font-semibold text-slate-900 capitalize">
              {type === 'data-deletion' ? 'Data Deletion Policy' : `${type} Policy & Terms`}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-md text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-4 text-sm text-slate-600 leading-relaxed">
          {type === 'privacy' && (
            <>
              <p className="font-semibold text-slate-800">Effective Date: October 12, 2026</p>
              <p>
                ReceiptFlow (&quot;we&quot;, &quot;our&quot;, &quot;us&quot;) is committed to protecting your privacy. This Privacy Policy describes how we collect, use, and safeguard personal and financial data when you use ReceiptFlow.
              </p>
              <h3 className="font-semibold text-slate-800">1. Data We Access</h3>
              <p>
                We access only the minimum necessary Google Workspace scopes:
              </p>
              <ul className="list-disc pl-5 space-y-1">
                <li><strong>Google Sheets (<code className="bg-slate-100 px-1 py-0.5 rounded text-xs">spreadsheets</code>)</strong>: Used solely to create and append reviewed expense rows to authorized spreadsheets.</li>
                <li><strong>Google Drive (<code className="bg-slate-100 px-1 py-0.5 rounded text-xs">drive.file</code>)</strong>: Used solely to access files created or explicitly opened by ReceiptFlow. We never request full Drive or broad Gmail access.</li>
              </ul>
              <h3 className="font-semibold text-slate-800">2. Receipt &amp; Transaction Storage</h3>
              <p>
                Receipt images and documents are processed server-side for OCR extraction. Extracted merchant names, dates, amounts, and tax figures are stored in isolated tenant databases with cryptographic SHA-256 duplicate checking. We never sell or share your receipt data.
              </p>
              <h3 className="font-semibold text-slate-800">3. Independent Developer Notice</h3>
              <p>
                The seller and developer is ReceiptFlow, not Google. ReceiptFlow is an independent application integrating with Google Workspace APIs.
              </p>
            </>
          )}

          {type === 'terms' && (
            <>
              <p className="font-semibold text-slate-800">Last Revised: October 2026</p>
              <p>
                By using ReceiptFlow, you agree to these Terms of Service. If you do not agree, do not use the application.
              </p>
              <h3 className="font-semibold text-slate-800">1. Expense Review &amp; Accounting Disclaimer</h3>
              <p>
                ReceiptFlow provides AI-assisted receipt extraction and organization. The &quot;Reviewed&quot; status within ReceiptFlow is an internal tracking flag and does NOT constitute a formal legal, certified accounting, or tax audit approval. Users are responsible for verifying accuracy before financial reporting.
              </p>
              <h3 className="font-semibold text-slate-800">2. Subscription Terms</h3>
              <p>
                ReceiptFlow Pro is billed at $9.99 USD per user per month. Subscriptions automatically renew monthly via PayPal until cancelled by the user.
              </p>
              <h3 className="font-semibold text-slate-800">3. Termination</h3>
              <p>
                You may cancel your subscription at any time. We reserve the right to suspend accounts that abuse OCR processing limits.
              </p>
            </>
          )}

          {type === 'pricing' && (
            <>
              <h3 className="font-semibold text-slate-800">Pricing Overview</h3>
              <div className="grid grid-cols-2 gap-4 my-2">
                <div className="border border-slate-200 rounded-lg p-3 bg-slate-50">
                  <div className="font-bold text-slate-900">Free Tier</div>
                  <div className="text-xl font-bold text-slate-800 mt-1">$0</div>
                  <p className="text-xs text-slate-500 mt-1">5 receipts/month. Basic dashboard, manual corrections, CSV &amp; basic Sheets export.</p>
                </div>
                <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
                  <div className="font-bold text-blue-900">ReceiptFlow Pro</div>
                  <div className="text-xl font-bold text-blue-700 mt-1">$9.99 <span className="text-xs font-normal text-slate-600">/ user / mo</span></div>
                  <p className="text-xs text-slate-600 mt-1">100 receipts/month fair use. Automated Google Sheets sync, duplicate detection, priority OCR.</p>
                </div>
              </div>
              <p className="text-xs text-slate-500 italic">
                Recurring monthly billing via PayPal Subscriptions. Cancel anytime with a single click.
              </p>
            </>
          )}

          {type === 'cancellation' && (
            <>
              <h3 className="font-semibold text-slate-800">Cancellation &amp; Refund Policy</h3>
              <p>
                <strong>Cancellation:</strong> You can cancel your ReceiptFlow Pro subscription at any time with a single click from the Billing tab. Upon cancellation, your account will remain active with full Pro access until the end of your current paid billing period. You will not be charged again.
              </p>
              <p>
                <strong>Refunds:</strong> If you experience technical issues or are dissatisfied within the first 14 days of subscribing, contact support at support@receiptflow.app for a full refund.
              </p>
            </>
          )}

          {type === 'support' && (
            <>
              <h3 className="font-semibold text-slate-800">ReceiptFlow Customer Support</h3>
              <p>
                Need help with Google Workspace integration, OCR extraction, or PayPal billing?
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg space-y-1">
                <p><strong>Email Support:</strong> support@receiptflow.app</p>
                <p><strong>Response Time:</strong> Within 24 business hours</p>
                <p><strong>Hours of Operation:</strong> Monday - Friday, 9:00 AM - 6:00 PM EST</p>
              </div>
            </>
          )}

          {type === 'data-deletion' && (
            <>
              <h3 className="font-semibold text-slate-800">Data Deletion Instructions</h3>
              <p>
                You have the absolute right to purge all data associated with your organization at any time:
              </p>
              <ol className="list-decimal pl-5 space-y-2">
                <li>Navigate to <strong>Settings</strong> in ReceiptFlow.</li>
                <li>Under <strong>Data Management</strong>, click <strong>Delete All Organization Data</strong>.</li>
                <li>Confirm the irreversible deletion prompt.</li>
              </ol>
              <p>
                All stored receipt records, file hashes, expenses, audit logs, and integration configurations will be immediately and permanently removed from our databases.
              </p>
            </>
          )}
        </div>

        <div className="px-6 py-3 border-t border-slate-100 flex justify-end bg-slate-50 rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
