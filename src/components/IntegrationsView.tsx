import React, { useState } from 'react';
import {
  FileSpreadsheet,
  CheckCircle2,
  ExternalLink,
  Plus,
  RefreshCw,
  FolderOpen,
  ShieldCheck,
  AlertTriangle,
  Code,
  Copy,
  Check,
} from 'lucide-react';
import { SheetsConfig } from '../types';
import { createGoogleSheet, connectExistingSheet, syncToGoogleSheets } from '../api';
import { getAccessToken, googleSignIn } from '../firebase';

interface IntegrationsViewProps {
  sheetsConfig: SheetsConfig | null;
  onRefreshConfig: () => void;
}

export const IntegrationsView: React.FC<IntegrationsViewProps> = ({
  sheetsConfig,
  onRefreshConfig,
}) => {
  const [isCreating, setIsCreating] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [existingId, setExistingId] = useState('');
  const [existingTitle, setExistingTitle] = useState('');
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );
  const [copiedCode, setCopiedCode] = useState(false);

  const handleCreateNewSheet = async () => {
    setIsCreating(true);
    setStatusMessage(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const signResult = await googleSignIn();
        token = signResult?.accessToken || null;
      }
      if (!token) throw new Error('Google OAuth authorization token required.');

      const result = await createGoogleSheet(token, 'ReceiptFlow Expenses Ledger');
      setStatusMessage({
        type: 'success',
        text: `Created new spreadsheet "${result.sheetName}" with frozen headers and stable schema.`,
      });
      onRefreshConfig();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to create Google Sheet.' });
    } finally {
      setIsCreating(false);
    }
  };

  const handleConnectExisting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!existingId.trim()) return;
    setStatusMessage(null);
    try {
      await connectExistingSheet(existingId.trim(), existingTitle.trim() || 'Connected Spreadsheet');
      setStatusMessage({
        type: 'success',
        text: 'Successfully linked existing Google Sheet to ReceiptFlow.',
      });
      setExistingId('');
      setExistingTitle('');
      onRefreshConfig();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to connect spreadsheet.' });
    }
  };

  const handleManualSync = async () => {
    setIsSyncing(true);
    setStatusMessage(null);
    try {
      let token = await getAccessToken();
      if (!token) {
        const signResult = await googleSignIn();
        token = signResult?.accessToken || null;
      }
      if (!token) throw new Error('Google OAuth authorization token required.');

      const res = await syncToGoogleSheets(token);
      setStatusMessage({
        type: 'success',
        text: `Synced ${res.syncedCount} reviewed expenses (${res.updatedCount} updated, ${res.appendedCount} appended).`,
      });
      onRefreshConfig();
    } catch (err: any) {
      setStatusMessage({ type: 'error', text: err.message || 'Failed to sync to Google Sheet.' });
    } finally {
      setIsSyncing(false);
    }
  };

  const copyAddOnCode = () => {
    const code = `/** ReceiptFlow Google Sheets Add-on */
function onSheetsHomepage(e) {
  var card = CardService.newCardBuilder();
  card.setHeader(CardService.newCardHeader().setTitle("ReceiptFlow").setSubtitle("Smart Expense Sync"));
  // Section: Quick Sync
  var section = CardService.newCardSection().setHeader("Actions");
  section.addWidget(CardService.newTextButton().setText("Sync Expenses").setOnClickAction(CardService.newAction().setFunctionName("onSyncExpensesClick")));
  card.addSection(section);
  return card.build();
}`;
    navigator.clipboard.writeText(code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Google Workspace Integrations</h1>
        <p className="text-2xs text-slate-500">
          Native, least-privilege Google Sheets synchronization and Apps Script Add-on deployment.
        </p>
      </div>

      {statusMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center space-x-2 ${
            statusMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Main Google Sheets Connection Card */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start space-x-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0 border border-emerald-100">
              <FileSpreadsheet className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center space-x-2">
                <h2 className="text-sm font-bold text-slate-900">Google Sheets Expense Sync</h2>
                <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-3xs font-semibold uppercase">
                  Connected
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                ReceiptFlow records verified expenses into a dedicated spreadsheet table with stable record IDs in Column A. Unreviewed or draft receipts are never written without approval.
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-2 shrink-0">
            {sheetsConfig && (
              <button
                onClick={handleManualSync}
                disabled={isSyncing}
                className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Syncing Rows...' : 'Sync Reviewed Now'}</span>
              </button>
            )}
            <button
              onClick={handleCreateNewSheet}
              disabled={isCreating}
              className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>{isCreating ? 'Creating Sheet...' : 'Create New Sheet'}</span>
            </button>
          </div>
        </div>

        {/* Current Active Spreadsheet Details */}
        {sheetsConfig ? (
          <div className="p-6 bg-slate-50/50 space-y-4">
            <div className="bg-white p-4 rounded-lg border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <span className="text-3xs uppercase font-bold text-slate-400 tracking-wider">
                  Active Spreadsheet
                </span>
                <h3 className="text-xs font-bold text-slate-900 mt-0.5">
                  {sheetsConfig.spreadsheet_name}
                </h3>
                <div className="flex items-center space-x-2 text-2xs text-slate-500 mt-1">
                  <span>Tab: <strong>{sheetsConfig.sheet_name || 'Expenses'}</strong></span>
                  <span>•</span>
                  <span>
                    Last Synced:{' '}
                    {sheetsConfig.last_synced_at
                      ? sheetsConfig.last_synced_at.slice(0, 19).replace('T', ' ')
                      : 'Never'}
                  </span>
                </div>
              </div>

              <a
                href={sheetsConfig.spreadsheet_url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center space-x-1 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
              >
                <span>Open in Google Sheets</span>
                <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
              </a>
            </div>

            {/* Schema Guarantee Info */}
            <div className="p-3 bg-emerald-50/60 border border-emerald-100 rounded-lg text-2xs text-emerald-900 space-y-1">
              <div className="font-bold">✓ Safe Sync Guarantee</div>
              <p>
                ReceiptFlow operates with strict row idempotency: Column A contains the stable Expense ID. Existing rows are updated in place, new expenses are appended, and unrelated columns or tabs are never modified.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-6 text-center">
            <p className="text-xs text-slate-500 mb-3">
              No spreadsheet is currently selected for automatic sync. Click &quot;Create New Sheet&quot; above to auto-provision an expense tracker, or link an existing Google Sheet ID below.
            </p>
          </div>
        )}

        {/* Connect Existing Spreadsheet ID form */}
        <div className="p-6 border-t border-slate-100 bg-white">
          <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider mb-2">
            Or Link an Existing Google Sheet by ID
          </h3>
          <form onSubmit={handleConnectExisting} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <input
              type="text"
              placeholder="Google Spreadsheet ID (from URL)"
              value={existingId}
              onChange={(e) => setExistingId(e.target.value)}
              className="sm:col-span-2 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-mono text-slate-800"
            />
            <button
              type="submit"
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-semibold rounded-lg transition-colors"
            >
              Connect Spreadsheet ID
            </button>
          </form>
        </div>
      </div>

      {/* Scope Minimization & Google Workspace Security */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center space-x-2">
          <ShieldCheck className="w-5 h-5 text-blue-600" />
          <h2 className="text-sm font-bold text-slate-900">Least Privilege OAuth Scopes</h2>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          ReceiptFlow is architected with strict scope minimization according to Google Cloud Trust &amp; Safety guidelines. We do not request broad Drive or Gmail inbox access.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-mono text-2xs text-blue-700 font-semibold mb-1">
              https://www.googleapis.com/auth/spreadsheets
            </div>
            <p className="text-slate-600 text-2xs">
              <strong>Purpose:</strong> Allows ReceiptFlow to create the expense tracker spreadsheet and write reviewed expense records.
            </p>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <div className="font-mono text-2xs text-blue-700 font-semibold mb-1">
              https://www.googleapis.com/auth/drive.file
            </div>
            <p className="text-slate-600 text-2xs">
              <strong>Purpose:</strong> Per-file access restricted strictly to spreadsheets or receipt files created or opened by ReceiptFlow.
            </p>
          </div>
        </div>
      </div>

      {/* Google Workspace Add-on Marketplace Asset Pack */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Code className="w-5 h-5 text-indigo-600" />
            <h2 className="text-sm font-bold text-slate-900">Installable Google Workspace Add-on</h2>
          </div>
          <button
            onClick={copyAddOnCode}
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-2xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
          >
            {copiedCode ? <Check className="w-3 h-3 text-emerald-600" /> : <Copy className="w-3 h-3" />}
            <span>{copiedCode ? 'Copied' : 'Copy Add-on Script'}</span>
          </button>
        </div>
        <p className="text-xs text-slate-600 leading-relaxed">
          ReceiptFlow includes an official installable Google Workspace Add-on manifest (<code className="bg-slate-100 px-1 py-0.5 rounded text-2xs">appsscript.json</code>) and Apps Script (<code className="bg-slate-100 px-1 py-0.5 rounded text-2xs">Code.gs</code>) in the repository for deployment to the Google Workspace Marketplace.
        </p>

        <div className="p-3 bg-slate-900 text-slate-200 rounded-lg text-2xs font-mono overflow-x-auto">
          <code>
            {`// Repository Add-on Files:
- /google-workspace-addon/appsscript.json (Add-on manifest)
- /google-workspace-addon/Code.gs (Apps Script Homepage & Sync Trigger)
- /google-workspace-addon/MARKETPLACE_LISTING.md (Marketplace listing specifications)`}
          </code>
        </div>
      </div>

      {/* Official Marketplace Publishing Guide */}
      <div className="bg-slate-900 text-white rounded-xl p-6 shadow-xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center space-x-2">
            <ExternalLink className="w-5 h-5 text-blue-400" />
            <h3 className="text-sm font-bold">Google Workspace Marketplace Submission Steps</h3>
          </div>
          <span className="text-3xs bg-blue-500/20 text-blue-300 border border-blue-400/30 px-2 py-0.5 rounded font-semibold uppercase">
            Publisher Guide
          </span>
        </div>
        <p className="text-xs text-slate-300 leading-relaxed">
          Submitting to the public Marketplace requires human publisher ownership verification in your Google Cloud Console. Follow these 4 steps using the code already generated in this repository:
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-1.5">
            <div className="font-bold text-blue-300">Step 1: Deploy Apps Script</div>
            <p className="text-slate-300 text-2xs leading-relaxed">
              Open <strong>script.google.com</strong> &gt; New project. Paste <code className="text-blue-200">google-workspace-addon/Code.gs</code> and <code className="text-blue-200">appsscript.json</code>. Click <strong>Deploy &gt; New deployment &gt; Google Workspace Add-on</strong>, and copy the Deployment ID.
            </p>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-1.5">
            <div className="font-bold text-blue-300">Step 2: Enable Marketplace SDK</div>
            <p className="text-slate-300 text-2xs leading-relaxed">
              In <strong>console.cloud.google.com</strong>, enable the <strong>Google Workspace Marketplace SDK</strong> API.
            </p>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-1.5">
            <div className="font-bold text-blue-300">Step 3: App Configuration</div>
            <p className="text-slate-300 text-2xs leading-relaxed">
              In Google Workspace Marketplace SDK &gt; App Configuration, paste your Apps Script Deployment ID and check Sheets Add-on.
            </p>
          </div>

          <div className="p-3.5 bg-slate-800/80 rounded-lg border border-slate-700/80 space-y-1.5">
            <div className="font-bold text-blue-300">Step 4: Store Listing &amp; Submit</div>
            <p className="text-slate-300 text-2xs leading-relaxed">
              Under Store Listing, paste the metadata from <code className="text-blue-200">MARKETPLACE_LISTING.md</code> (App Name: ReceiptFlow, Price: $3.00/mo, Privacy &amp; Terms links) and click <strong>Publish</strong> to initiate Google&apos;s review.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
