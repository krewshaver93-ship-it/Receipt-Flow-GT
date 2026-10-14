import React from 'react';
import {
  LayoutDashboard,
  Receipt,
  FileSpreadsheet,
  BarChart3,
  CreditCard,
  Settings,
  Plus,
  Zap,
  Gauge,
  CheckCircle2,
  LogOut,
  FolderOpen,
} from 'lucide-react';
import { UserProfile, Entitlement } from '../types';

interface NavbarProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenAddReceipt: () => void;
  user: UserProfile | null;
  entitlement: Entitlement | null;
  onSignIn: () => void;
  onSignOut: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onSelectTab,
  onOpenAddReceipt,
  user,
  entitlement,
  onSignIn,
  onSignOut,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'expenses', label: 'Expenses', icon: Receipt },
    { id: 'receipts', label: 'Receipts', icon: FolderOpen },
    { id: 'reports', label: 'Reports', icon: BarChart3 },
    { id: 'integrations', label: 'Integrations', icon: FileSpreadsheet },
    { id: 'billing', label: 'Billing', icon: CreditCard },
    { id: 'settings', label: 'Settings', icon: Settings },
  ];

  const secondaryNavItems = [
    { id: 'benchmark', label: 'Benchmark', icon: Gauge },
    { id: 'tests', label: 'Test Suite', icon: CheckCircle2 },
  ];

  const quotaPercent = entitlement
    ? Math.min(100, (entitlement.receipts_used_this_month / entitlement.monthly_receipt_quota) * 100)
    : 0;

  return (
    <header className="bg-white border-b border-slate-200 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Brand Logo & Name */}
          <div className="flex items-center space-x-3 cursor-pointer" onClick={() => onSelectTab('dashboard')}>
            <div className="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white font-bold shadow-xs">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <span className="text-lg font-bold tracking-tight text-slate-900">ReceiptFlow</span>
              <span className="hidden sm:inline-block ml-2 text-2xs uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 border border-blue-200">
                Workspace
              </span>
            </div>
          </div>

          {/* Primary Nav Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                    isActive
                      ? 'bg-slate-100 text-blue-700 font-semibold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </button>
              );
            })}

            {/* Separator */}
            <div className="h-4 w-px bg-slate-200 mx-1" />

            {/* Benchmark & Tests */}
            {secondaryNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = currentTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onSelectTab(item.id)}
                  className={`flex items-center space-x-1 px-2 py-1 text-2xs font-medium rounded transition-colors ${
                    isActive
                      ? 'bg-blue-50 text-blue-700 font-semibold border border-blue-200'
                      : 'text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                  }`}
                  title={item.label}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </nav>

          {/* Action CTAs & User Profile */}
          <div className="flex items-center space-x-3">
            {/* Quota Indicator */}
            {entitlement && (
              <div
                onClick={() => onSelectTab('billing')}
                className="hidden xl:flex flex-col items-end cursor-pointer group pr-1"
                title="Monthly receipt capture quota"
              >
                <div className="flex items-center space-x-1 text-2xs text-slate-500">
                  <span className="font-semibold text-slate-700">
                    {entitlement.receipts_used_this_month}/{entitlement.monthly_receipt_quota}
                  </span>
                  <span>receipts</span>
                  {entitlement.plan_code === 'free' && (
                    <span className="text-blue-600 font-medium group-hover:underline">Upgrade</span>
                  )}
                </div>
                <div className="w-20 bg-slate-100 h-1.5 rounded-full overflow-hidden mt-0.5">
                  <div
                    className={`h-full rounded-full ${
                      quotaPercent > 80 ? 'bg-amber-500' : 'bg-blue-600'
                    }`}
                    style={{ width: `${quotaPercent}%` }}
                  />
                </div>
              </div>
            )}

            {/* Main Primary CTA: Add receipt */}
            <button
              onClick={onOpenAddReceipt}
              className="flex items-center space-x-1.5 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all transform active:scale-98"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add receipt</span>
            </button>

            {/* User Session / Sign In */}
            {user ? (
              <div className="flex items-center space-x-2 pl-1 border-l border-slate-200">
                {user.picture ? (
                  <img
                    src={user.picture}
                    alt={user.name}
                    className="w-7 h-7 rounded-full border border-slate-200"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center text-xs font-semibold">
                    {user.name.charAt(0)}
                  </div>
                )}
                <button
                  onClick={onSignOut}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
                  title="Sign out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={onSignIn}
                className="px-2.5 py-1.5 border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-medium rounded-lg transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="md:hidden flex items-center space-x-1 overflow-x-auto py-2 border-t border-slate-100 no-scrollbar">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center space-x-1 px-2.5 py-1 text-2xs font-medium whitespace-nowrap rounded-md ${
                  isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
          {secondaryNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={`flex items-center space-x-1 px-2.5 py-1 text-2xs font-medium whitespace-nowrap rounded-md ${
                  isActive ? 'bg-blue-50 text-blue-700 font-semibold' : 'text-slate-600'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </header>
  );
};
