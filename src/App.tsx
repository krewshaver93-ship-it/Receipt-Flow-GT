/**
 * @license
 * ReceiptFlow — Production-Ready Google Workspace Expense Management
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Navbar } from './components/Navbar';
import { DashboardView } from './components/DashboardView';
import { ExpensesView } from './components/ExpensesView';
import { ReceiptsView } from './components/ReceiptsView';
import { ReportsView } from './components/ReportsView';
import { IntegrationsView } from './components/IntegrationsView';
import { BillingView } from './components/BillingView';
import { SettingsView } from './components/SettingsView';
import { BenchmarkView } from './components/BenchmarkView';
import { TestSuiteView } from './components/TestSuiteView';
import { AddReceiptModal } from './components/AddReceiptModal';
import { LegalModal } from './components/LegalModals';
import {
  UserProfile,
  Organization,
  Entitlement,
  Expense,
  SheetsConfig,
  Subscription,
} from './types';
import {
  syncSession,
  fetchExpenses,
  fetchStats,
  fetchEntitlements,
  fetchSheetsConfig,
  approveExpense,
  deleteExpense,
  syncToGoogleSheets,
  setApiAuthContext,
} from './api';
import { initAuth, googleSignIn, logout, getAccessToken } from './firebase';
import { Loader2 } from 'lucide-react';

export default function App() {
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [user, setUser] = useState<UserProfile | null>(null);
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [entitlement, setEntitlement] = useState<Entitlement | null>(null);
  const [subscription, setSubscription] = useState<Subscription | null>(null);
  const [sheetsConfig, setSheetsConfig] = useState<SheetsConfig | null>(null);

  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSyncingSheets, setIsSyncingSheets] = useState<boolean>(false);

  // Modals
  const [isAddReceiptOpen, setIsAddReceiptOpen] = useState<boolean>(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);
  const [legalModalType, setLegalModalType] = useState<
    'privacy' | 'terms' | 'pricing' | 'cancellation' | 'support' | 'data-deletion' | null
  >(null);

  // Auth Initialization
  useEffect(() => {
    // 1. Initialize default session first so app is immediately usable
    initializeDefaultSession();

    // 2. Listen to Firebase Auth state
    const unsubscribe = initAuth(
      async (firebaseUser, token) => {
        try {
          const session = await syncSession({
            email: firebaseUser.email || 'workspace-user@receiptflow.app',
            name: firebaseUser.displayName || 'Workspace User',
            picture: firebaseUser.photoURL || '',
            uid: firebaseUser.uid,
          });
          setUser(session.user);
          setOrganization(session.organization);
          setEntitlement(session.entitlement);
          setApiAuthContext(session.organization.id, session.user.id);
          loadAppData();
        } catch (err) {
          console.error('Session sync error on auth change:', err);
        }
      },
      () => {
        // Fallback / guest mode
      }
    );

    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  const initializeDefaultSession = async () => {
    try {
      const session = await syncSession({
        email: 'workspace-owner@receiptflow.app',
        name: 'Workspace Owner',
        picture: '',
      });
      setUser(session.user);
      setOrganization(session.organization);
      setEntitlement(session.entitlement);
      setApiAuthContext(session.organization.id, session.user.id);
      await loadAppData();
    } catch (err) {
      console.error('Failed to init session:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const loadAppData = async () => {
    try {
      const [expData, statsData, entData, scData] = await Promise.all([
        fetchExpenses(),
        fetchStats(),
        fetchEntitlements(),
        fetchSheetsConfig(),
      ]);
      setExpenses(expData.expenses);
      setStats(statsData);
      setEntitlement(entData.entitlement);
      setSubscription(entData.subscription || null);
      setSheetsConfig(scData.sheetsConfig);
    } catch (err) {
      console.error('Error loading app data:', err);
    }
  };

  const handleSignIn = async () => {
    try {
      const result = await googleSignIn();
      if (result) {
        const session = await syncSession({
          email: result.user.email || 'user@receiptflow.app',
          name: result.user.displayName || 'Google User',
          picture: result.user.photoURL || '',
          uid: result.user.uid,
        });
        setUser(session.user);
        setOrganization(session.organization);
        setEntitlement(session.entitlement);
        setApiAuthContext(session.organization.id, session.user.id);
        loadAppData();
      }
    } catch (err) {
      console.error('Sign in failed:', err);
    }
  };

  const handleSignOut = async () => {
    await logout();
    setUser(null);
    initializeDefaultSession();
  };

  const handleApproveExpense = async (id: string) => {
    try {
      await approveExpense(id);
      loadAppData();
    } catch (err) {
      alert('Failed to approve expense');
    }
  };

  const handleDeleteExpense = async (id: string) => {
    if (!window.confirm('Delete this expense record?')) return;
    try {
      await deleteExpense(id);
      loadAppData();
    } catch (err) {
      alert('Failed to delete expense');
    }
  };

  const handleSyncGoogleSheets = async () => {
    setIsSyncingSheets(true);
    try {
      let token = await getAccessToken();
      if (!token) {
        const signResult = await googleSignIn();
        token = signResult?.accessToken || null;
      }
      if (!token) throw new Error('Google authorization token required.');

      const res = await syncToGoogleSheets(token);
      alert(
        `Successfully synced ${res.syncedCount} expenses to Google Sheets (${res.updatedCount} updated, ${res.appendedCount} appended).`
      );
      loadAppData();
    } catch (err: any) {
      alert(err.message || 'Failed to sync to Google Sheets');
    } finally {
      setIsSyncingSheets(false);
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-3">
        <Loader2 className="w-8 h-8 text-blue-600 animate-spin" />
        <p className="text-xs font-semibold text-slate-600">Initializing ReceiptFlow Workspace...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col font-sans antialiased selection:bg-blue-100 selection:text-blue-900">
      {/* Top Navigation */}
      <Navbar
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenAddReceipt={() => setIsAddReceiptOpen(true)}
        user={user}
        entitlement={entitlement}
        onSignIn={handleSignIn}
        onSignOut={handleSignOut}
      />

      {/* Main View Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {currentTab === 'dashboard' && (
          <DashboardView
            stats={stats}
            recentExpenses={expenses}
            sheetsConfig={sheetsConfig}
            entitlement={entitlement}
            onOpenAddReceipt={() => setIsAddReceiptOpen(true)}
            onSelectTab={setCurrentTab}
            onApproveExpense={handleApproveExpense}
          />
        )}

        {currentTab === 'expenses' && (
          <ExpensesView
            expenses={expenses}
            onOpenAddReceipt={() => setIsAddReceiptOpen(true)}
            onApproveExpense={handleApproveExpense}
            onDeleteExpense={handleDeleteExpense}
            onEditExpense={(exp) => {
              setEditingExpense(exp);
              setIsAddReceiptOpen(true);
            }}
            onSyncGoogleSheets={handleSyncGoogleSheets}
            isSyncingSheets={isSyncingSheets}
          />
        )}

        {currentTab === 'receipts' && (
          <ReceiptsView
            expenses={expenses}
            onOpenAddReceipt={() => setIsAddReceiptOpen(true)}
            onEditExpense={(exp) => {
              setEditingExpense(exp);
              setIsAddReceiptOpen(true);
            }}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsView expenses={expenses} stats={stats} />
        )}

        {currentTab === 'integrations' && (
          <IntegrationsView
            sheetsConfig={sheetsConfig}
            onRefreshConfig={loadAppData}
          />
        )}

        {currentTab === 'billing' && (
          <BillingView
            entitlement={entitlement}
            subscription={subscription}
            onRefreshEntitlements={loadAppData}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsView
            user={user}
            organization={organization}
            onOpenLegal={setLegalModalType}
            onSignOut={handleSignOut}
            onDataPurged={initializeDefaultSession}
          />
        )}

        {currentTab === 'benchmark' && <BenchmarkView />}

        {currentTab === 'tests' && <TestSuiteView />}
      </main>

      {/* Footer & Compliance */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between text-2xs text-slate-500 gap-3">
          <div>
            <span>&copy; {new Date().getFullYear()} ReceiptFlow. The seller is the ReceiptFlow developer, not Google.</span>
          </div>

          <div className="flex flex-wrap items-center space-x-4">
            <button
              onClick={() => setLegalModalType('privacy')}
              className="hover:text-slate-800 transition-colors"
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setLegalModalType('terms')}
              className="hover:text-slate-800 transition-colors"
            >
              Terms of Service
            </button>
            <button
              onClick={() => setLegalModalType('pricing')}
              className="hover:text-slate-800 transition-colors"
            >
              Pricing ($9.99/mo)
            </button>
            <button
              onClick={() => setLegalModalType('cancellation')}
              className="hover:text-slate-800 transition-colors"
            >
              Cancellation &amp; Refunds
            </button>
            <button
              onClick={() => setLegalModalType('support')}
              className="hover:text-slate-800 transition-colors"
            >
              Support
            </button>
            <button
              onClick={() => setLegalModalType('data-deletion')}
              className="hover:text-rose-600 transition-colors"
            >
              Data Deletion
            </button>
          </div>
        </div>
      </footer>

      {/* Add / Capture Receipt Modal */}
      <AddReceiptModal
        isOpen={isAddReceiptOpen}
        onClose={() => {
          setIsAddReceiptOpen(false);
          setEditingExpense(null);
        }}
        onSuccess={loadAppData}
      />

      {/* Legal & Policy Modals */}
      <LegalModal type={legalModalType} onClose={() => setLegalModalType(null)} />
    </div>
  );
}
