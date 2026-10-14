import React, { useState } from 'react';
import {
  Settings,
  ShieldCheck,
  User,
  Building,
  LogOut,
  Trash2,
  FileText,
  AlertTriangle,
  Lock,
  ExternalLink,
  Info,
} from 'lucide-react';
import { UserProfile, Organization } from '../types';
import { disconnectWorkspace, deleteAccountAndData } from '../api';

interface SettingsViewProps {
  user: UserProfile | null;
  organization: Organization | null;
  onOpenLegal: (type: 'privacy' | 'terms' | 'pricing' | 'cancellation' | 'support' | 'data-deletion') => void;
  onSignOut: () => void;
  onDataPurged: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  user,
  organization,
  onOpenLegal,
  onSignOut,
  onDataPurged,
}) => {
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string>('');

  const handleDisconnect = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to disconnect Google Workspace? ReceiptFlow will unbind the connected Google Sheet.'
    );
    if (!confirmed) return;

    setIsDisconnecting(true);
    try {
      await disconnectWorkspace();
      setStatusMsg('Google Workspace disconnected successfully.');
    } catch (err: any) {
      alert(err.message || 'Failed to disconnect');
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleDeleteAllData = async () => {
    const confirmation = window.prompt(
      'DANGER: This will permanently delete your workspace, all uploaded receipts, expenses, and settings. Type "DELETE" to confirm:'
    );
    if (confirmation !== 'DELETE') return;

    setIsDeleting(true);
    try {
      await deleteAccountAndData();
      alert('All workspace data has been permanently erased.');
      onDataPurged();
    } catch (err: any) {
      alert(err.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-lg font-bold text-slate-900">Workspace &amp; Security Settings</h1>
        <p className="text-2xs text-slate-500">
          Manage Google Workspace access, data isolation, and organization configuration.
        </p>
      </div>

      {statusMsg && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs rounded-lg">
          {statusMsg}
        </div>
      )}

      {/* Organization & Account Info */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <Building className="w-4 h-4 text-slate-500" />
          <span>Organization Profile</span>
        </h2>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-2xs uppercase font-bold text-slate-400">Workspace Name</span>
            <div className="font-bold text-slate-900 mt-0.5">{organization?.name || 'Default Workspace'}</div>
            <span className="text-3xs text-slate-400 font-mono mt-1 block">Tenant ID: {organization?.id}</span>
          </div>

          <div className="p-3 bg-slate-50 rounded-lg border border-slate-200">
            <span className="text-2xs uppercase font-bold text-slate-400">Owner Email</span>
            <div className="font-bold text-slate-900 mt-0.5">{user?.email || 'owner@receiptflow.app'}</div>
            <span className="text-3xs text-slate-400 font-mono mt-1 block">Role: {user?.role || 'admin'}</span>
          </div>
        </div>
      </div>

      {/* Google Workspace Connection Management */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-4">
        <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <ShieldCheck className="w-4 h-4 text-blue-600" />
          <span>Google Workspace Access Control</span>
        </h2>
        <p className="text-xs text-slate-600 leading-relaxed">
          ReceiptFlow uses narrow, client-side OAuth 2.0 tokens to synchronize verified expense rows into Google Sheets and read user-selected receipt documents.
        </p>

        <div className="pt-2 flex flex-wrap items-center gap-3">
          <button
            onClick={handleDisconnect}
            disabled={isDisconnecting}
            className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            {isDisconnecting ? 'Disconnecting...' : 'Disconnect Google Workspace'}
          </button>
          <button
            onClick={onSignOut}
            className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>

      {/* Legal & Compliance Links */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs space-y-3">
        <h2 className="text-sm font-bold text-slate-900 flex items-center space-x-2">
          <FileText className="w-4 h-4 text-slate-500" />
          <span>Policies &amp; Marketplace Compliance</span>
        </h2>
        <p className="text-xs text-slate-600">
          Official policies prepared for Google Workspace Marketplace listing and user data rights:
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1 text-xs">
          <button
            onClick={() => onOpenLegal('privacy')}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-slate-700 font-medium transition-colors"
          >
            Privacy Policy &rarr;
          </button>
          <button
            onClick={() => onOpenLegal('terms')}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-slate-700 font-medium transition-colors"
          >
            Terms of Service &rarr;
          </button>
          <button
            onClick={() => onOpenLegal('pricing')}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-slate-700 font-medium transition-colors"
          >
            Pricing Terms &rarr;
          </button>
          <button
            onClick={() => onOpenLegal('cancellation')}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-slate-700 font-medium transition-colors"
          >
            Cancellation &amp; Refund &rarr;
          </button>
          <button
            onClick={() => onOpenLegal('support')}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-lg text-left text-slate-700 font-medium transition-colors"
          >
            Support Contact &rarr;
          </button>
          <button
            onClick={() => onOpenLegal('data-deletion')}
            className="p-2.5 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg text-left text-rose-800 font-medium transition-colors"
          >
            Data Deletion Rights &rarr;
          </button>
        </div>
      </div>

      {/* Irreversible Account & Organization Data Purge */}
      <div className="bg-rose-50/50 rounded-xl border border-rose-200 p-6 space-y-3">
        <h2 className="text-sm font-bold text-rose-900 flex items-center space-x-2">
          <AlertTriangle className="w-4 h-4 text-rose-600" />
          <span>Danger Zone: Permanent Workspace Deletion</span>
        </h2>
        <p className="text-xs text-rose-700 leading-relaxed">
          Permanently erase all expense records, receipt file binary hashes, Google Sheets connection tokens, and organization data from the database. This action cannot be undone.
        </p>
        <button
          onClick={handleDeleteAllData}
          disabled={isDeleting}
          className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-lg shadow-2xs transition-colors flex items-center space-x-1.5"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>{isDeleting ? 'Erasing...' : 'Delete All Organization Data'}</span>
        </button>
      </div>
    </div>
  );
};
