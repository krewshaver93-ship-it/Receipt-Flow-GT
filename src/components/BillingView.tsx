import React, { useState, useEffect } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  Zap,
  ShieldCheck,
  RefreshCw,
  ExternalLink,
  Info,
  Check,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { Entitlement, Subscription } from '../types';
import {
  fetchPayPalConfig,
  fetchBillingReadiness,
  createSubscriptionRecord,
  verifySubscription,
  cancelSubscription,
} from '../api';

interface BillingViewProps {
  entitlement: Entitlement | null;
  subscription: Subscription | null;
  onRefreshEntitlements: () => void;
}

export const BillingView: React.FC<BillingViewProps> = ({
  entitlement,
  subscription,
  onRefreshEntitlements,
}) => {
  const [paypalConfig, setPaypalConfig] = useState<any>(null);
  const [readinessReport, setReadinessReport] = useState<any>(null);
  const [isCheckingReadiness, setIsCheckingReadiness] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [showSetupGuide, setShowSetupGuide] = useState(false);

  // Sandbox simulation state
  const [isSimulating, setIsSimulating] = useState(false);

  useEffect(() => {
    loadConfig();
  }, []);

  const loadConfig = async () => {
    try {
      const cfg = await fetchPayPalConfig();
      setPaypalConfig(cfg);
      const readiness = await fetchBillingReadiness();
      setReadinessReport(readiness);
    } catch (err) {
      console.error('Failed to load PayPal config:', err);
    }
  };

  const handleRefreshReadiness = async () => {
    setIsCheckingReadiness(true);
    try {
      const readiness = await fetchBillingReadiness();
      setReadinessReport(readiness);
    } catch (err) {
      console.error('Readiness check error:', err);
    } finally {
      setIsCheckingReadiness(false);
    }
  };

  const isPro = entitlement?.plan_code === 'pro';

  useEffect(() => {
    if (isPro) return;

    const containerId = 'paypal-button-container-P-7ED91484LC2894212NLGOPFA';
    const scriptId = 'paypal-sdk-subscription-script';

    const renderPayPalButtons = () => {
      const container = document.getElementById(containerId);
      if (!container) return;

      if ((window as any).paypal && (window as any).paypal.Buttons) {
        container.innerHTML = '';
        try {
          (window as any).paypal.Buttons({
            style: {
              shape: 'rect',
              color: 'gold',
              layout: 'vertical',
              label: 'subscribe',
            },
            createSubscription: function (_data: any, actions: any) {
              return actions.subscription.create({
                plan_id: 'P-7ED91484LC2894212NLGOPFA',
              });
            },
            onApprove: async function (data: any, _actions: any) {
              const subId = data.subscriptionID;
              try {
                await createSubscriptionRecord(subId);
                await verifySubscription(subId);
                setStatusMsg({
                  type: 'success',
                  text: `Payment authorized! Subscription ${subId} activated for ReceiptFlow Pro ($9.99/mo).`,
                });
                onRefreshEntitlements();
              } catch (err: any) {
                setStatusMsg({
                  type: 'error',
                  text: `Subscription created (${subId}): ${err.message || 'Verification recorded.'}`,
                });
                onRefreshEntitlements();
              }
            },
            onError: function (err: any) {
              console.error('PayPal button error:', err);
            },
          }).render('#' + containerId);
        } catch (e) {
          console.error('Error rendering PayPal Buttons:', e);
        }
      }
    };

    let script = document.getElementById(scriptId) as HTMLScriptElement;
    if (!script) {
      script = document.createElement('script');
      script.id = scriptId;
      script.src =
        'https://www.paypal.com/sdk/js?client-id=AYEOa_0CvPYhteYx0CZdr97Y9i_Irk4KAQ3q4RLvOF7vq9Tsx-duWYpEFS_8NyRcFWAJnSXMk9bcGhAS&vault=true&intent=subscription';
      script.setAttribute('data-sdk-integration-source', 'button-factory');
      script.onload = () => {
        renderPayPalButtons();
      };
      document.body.appendChild(script);
    } else {
      renderPayPalButtons();
    }
  }, [isPro]);

  const handleSimulateSandboxSubscription = async () => {
    setIsSimulating(true);
    setStatusMsg(null);
    try {
      const simulatedSubId = `I-SIM-${Date.now()}`;
      await createSubscriptionRecord(simulatedSubId);
      const verifyRes = await verifySubscription(simulatedSubId);

      setStatusMsg({
        type: 'success',
        text: `Sandbox subscription verified successfully! Entitlement upgraded to ReceiptFlow Pro ($9.99/mo, 100 receipts quota).`,
      });
      onRefreshEntitlements();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Subscription verification failed' });
    } finally {
      setIsSimulating(false);
    }
  };

  const handleCancelSubscription = async () => {
    const confirmed = window.confirm(
      'Are you sure you want to cancel your ReceiptFlow Pro subscription? You will retain access until the end of your current paid billing period.'
    );
    if (!confirmed) return;

    setIsLoading(true);
    setStatusMsg(null);
    try {
      const res = await cancelSubscription();
      setStatusMsg({
        type: 'success',
        text: res.message || 'Subscription successfully cancelled.',
      });
      onRefreshEntitlements();
    } catch (err: any) {
      setStatusMsg({ type: 'error', text: err.message || 'Failed to cancel subscription' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <h1 className="text-lg font-bold text-slate-900">Subscription &amp; Billing</h1>
          <p className="text-2xs text-slate-500">
            Transparent pricing designed for freelancers, small businesses, and bookkeeping teams.
          </p>
        </div>
        <button
          onClick={() => setShowSetupGuide(!showSetupGuide)}
          className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
        >
          <Info className="w-3.5 h-3.5" />
          <span>PayPal Setup Guide</span>
        </button>
      </div>

      {statusMsg && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center space-x-2 ${
            statusMsg.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {statusMsg.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span>{statusMsg.text}</span>
        </div>
      )}

      {/* PAYPAL CREDENTIALS SETUP GUIDE (Collapsible) */}
      {showSetupGuide && (
        <div className="bg-slate-900 text-slate-100 p-6 rounded-xl space-y-4 shadow-sm text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center space-x-2">
              <ShieldCheck className="w-5 h-5 text-blue-400" />
              <h3 className="text-sm font-bold text-white">
                PayPal Subscriptions API Integration Checklist
              </h3>
            </div>
            <span className="text-2xs text-slate-400">Environment: {paypalConfig?.env || 'sandbox'}</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-slate-200 uppercase text-2xs tracking-wider">
                1. Required Server Secrets (Environment Variables)
              </h4>
              <ul className="space-y-1 font-mono text-2xs text-slate-300">
                <li className="flex items-center space-x-1">
                  <span className="text-blue-400">•</span>
                  <span>PAYPAL_ENV=sandbox</span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className="text-blue-400">•</span>
                  <span>PAYPAL_CLIENT_ID</span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className="text-blue-400">•</span>
                  <span>PAYPAL_CLIENT_SECRET</span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className="text-blue-400">•</span>
                  <span>PAYPAL_PLAN_ID ($3.00 USD/user/month)</span>
                </li>
                <li className="flex items-center space-x-1">
                  <span className="text-blue-400">•</span>
                  <span>PAYPAL_WEBHOOK_ID</span>
                </li>
              </ul>
            </div>

            <div className="space-y-2">
              <h4 className="font-semibold text-slate-200 uppercase text-2xs tracking-wider">
                2. PayPal Developer Portal Steps
              </h4>
              <ol className="list-decimal pl-4 space-y-1 text-2xs text-slate-300">
                <li>Create a REST App in developer.paypal.com dashboard.</li>
                <li>Create Product &quot;ReceiptFlow Pro&quot; and Billing Plan for $3.00 USD monthly.</li>
                <li>Register Webhook URL: <code className="text-blue-300">/api/billing/webhook</code></li>
                <li>Subscribe to: BILLING.SUBSCRIPTION.ACTIVATED, CANCELLED, SUSPENDED, and PAYMENT.SALE.COMPLETED.</li>
              </ol>
            </div>
          </div>
        </div>
      )}

      {/* LIVE PAYMENT GATEWAY READINESS AUDIT */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 shadow-2xs space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="w-5 h-5 text-blue-600" />
            <h3 className="text-sm font-bold text-slate-900">Payment Gateway Live Readiness Audit</h3>
          </div>
          <button
            onClick={handleRefreshReadiness}
            disabled={isCheckingReadiness}
            className="inline-flex items-center space-x-1 px-2.5 py-1 text-2xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-md transition-colors"
          >
            <RefreshCw className={`w-3 h-3 ${isCheckingReadiness ? 'animate-spin' : ''}`} />
            <span>Check Gateway</span>
          </button>
        </div>

        {readinessReport ? (
          <div className="space-y-3">
            <div
              className={`p-3 rounded-lg border text-xs flex items-start space-x-2.5 ${
                readinessReport.canReceiveRealPayments
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                  : 'bg-amber-50 border-amber-200 text-amber-900'
              }`}
            >
              {readinessReport.canReceiveRealPayments ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              )}
              <div className="flex-1">
                <span className="font-bold">
                  {readinessReport.canReceiveRealPayments
                    ? 'Gateway Active: Ready to Receive Payments'
                    : 'Action Required: PayPal Credentials Not Yet Added'}
                </span>
                <p className="text-2xs mt-0.5 opacity-90">{readinessReport.summary}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 text-2xs">
              {readinessReport.checks.map((c: any, idx: number) => (
                <div
                  key={idx}
                  className={`p-2.5 rounded-lg border flex flex-col justify-between ${
                    c.status === 'pass'
                      ? 'bg-emerald-50/50 border-emerald-200'
                      : c.status === 'warn'
                      ? 'bg-amber-50/50 border-amber-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-semibold text-slate-800 truncate">{c.name}</span>
                    <span
                      className={`text-3xs uppercase font-bold px-1.5 py-0.2 rounded ${
                        c.status === 'pass'
                          ? 'bg-emerald-100 text-emerald-800'
                          : c.status === 'warn'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {c.status}
                    </span>
                  </div>
                  <span className="text-slate-500">{c.message}</span>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="text-2xs text-slate-400">Loading payment audit...</div>
        )}
      </div>

      {/* PLAN COMPARISON CARDS */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* FREE TIER CARD */}
        <div
          className={`bg-white rounded-xl border p-6 flex flex-col justify-between transition-all ${
            !isPro ? 'border-slate-400 shadow-xs' : 'border-slate-200'
          }`}
        >
          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900">Free Tier</h3>
              {!isPro && (
                <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-2xs font-bold uppercase">
                  Current Plan
                </span>
              )}
            </div>
            <div className="text-3xl font-extrabold text-slate-900 mb-1">$0</div>
            <p className="text-2xs text-slate-500 mb-4">Forever free for freelancers with minimal volume</p>

            <ul className="space-y-2 text-xs text-slate-600 mb-6">
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span><strong>5 receipts</strong> per month capture quota</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Basic expense dashboard &amp; review workflow</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Manual data corrections and editing</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>RFC 4180 CSV export</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-100">
            <span className="text-2xs text-slate-400">Included with every Google Workspace account</span>
          </div>
        </div>

        {/* PRO TIER CARD */}
        <div
          className={`bg-white rounded-xl border-2 p-6 flex flex-col justify-between relative shadow-sm ${
            isPro ? 'border-blue-600 bg-blue-50/10' : 'border-blue-500'
          }`}
        >
          <div className="absolute -top-3 right-6 bg-blue-600 text-white text-3xs font-extrabold uppercase px-2.5 py-0.5 rounded-full tracking-wider shadow-2xs">
            Official Subscription
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-base font-bold text-slate-900 flex items-center space-x-1.5">
                <span>ReceiptFlow Pro</span>
                <Sparkles className="w-4 h-4 text-amber-500" />
              </h3>
              {isPro && (
                <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-2xs font-bold uppercase">
                  Active Subscription
                </span>
              )}
            </div>

            <div className="flex items-baseline space-x-1 mb-1">
              <span className="text-3xl font-extrabold text-slate-900">$9.99</span>
              <span className="text-xs text-slate-500 font-medium">USD / user / month</span>
            </div>
            <p className="text-2xs text-slate-500 mb-4">
              Monthly recurring billing via PayPal Subscriptions. Cancel anytime.
            </p>

            <ul className="space-y-2 text-xs text-slate-700 mb-6">
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                <span><strong>100 receipts</strong> per month fair-use extraction</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                <span><strong>Cryptographic duplicate detection</strong> (SHA-256 + field hash)</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                <span><strong>Automated Google Sheets synchronization</strong> with stable row IDs</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                <span>Priority multimodal Gemini OCR model extraction</span>
              </li>
              <li className="flex items-center space-x-2">
                <Check className="w-4 h-4 text-blue-600 shrink-0" />
                <span>1-click cancellation anytime with no hidden lock-in</span>
              </li>
            </ul>
          </div>

          <div className="pt-4 border-t border-slate-100 space-y-2">
            {!isPro ? (
              <div className="space-y-3">
                {/* Official PayPal Button Container */}
                <div className="w-full">
                  <div
                    id="paypal-button-container-P-7ED91484LC2894212NLGOPFA"
                    className="min-h-[48px] w-full"
                  />
                </div>

                <div className="flex items-center space-x-2 my-1 text-3xs text-slate-400">
                  <div className="h-px bg-slate-200 flex-1" />
                  <span>or developer sandbox</span>
                  <div className="h-px bg-slate-200 flex-1" />
                </div>

                <button
                  onClick={handleSimulateSandboxSubscription}
                  disabled={isSimulating}
                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-2xs font-semibold rounded-lg transition-colors flex items-center justify-center space-x-1.5"
                >
                  <CreditCard className="w-3.5 h-3.5 text-slate-500" />
                  <span>
                    {isSimulating ? 'Verifying Sandbox...' : 'Test Sandbox Upgrade ($9.99/mo)'}
                  </span>
                </button>
                <p className="text-3xs text-center text-slate-400">
                  Plan: P-7ED91484LC2894212NLGOPFA • Official PayPal Subscriptions API
                </p>
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="text-2xs text-slate-500">
                  Renewal:{' '}
                  {subscription?.current_period_end
                    ? subscription.current_period_end.slice(0, 10)
                    : 'End of cycle'}
                </div>
                <button
                  onClick={handleCancelSubscription}
                  disabled={isLoading}
                  className="px-3 py-1.5 border border-slate-300 hover:bg-slate-100 text-rose-700 text-xs font-semibold rounded-lg transition-colors"
                >
                  Cancel Subscription
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* EXPENSIFY VALUE BENCHMARK COMPARISON TABLE */}
      <div className="bg-white rounded-xl border border-slate-200 p-6 shadow-2xs">
        <h3 className="text-sm font-bold text-slate-900 mb-1">
          Why ReceiptFlow vs Expensify Collect
        </h3>
        <p className="text-2xs text-slate-500 mb-4">
          Direct cost and workflow comparison based on official public listings
        </p>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-slate-50 text-slate-500 font-bold text-3xs uppercase tracking-wider">
              <tr>
                <th className="px-4 py-2.5">Feature / Metric</th>
                <th className="px-4 py-2.5 text-blue-700 font-extrabold">ReceiptFlow Pro</th>
                <th className="px-4 py-2.5 text-slate-500">Expensify Collect</th>
                <th className="px-4 py-2.5 text-emerald-700">Advantage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              <tr>
                <td className="px-4 py-2.5 font-semibold">Monthly Price per User</td>
                <td className="px-4 py-2.5 font-bold text-slate-900">$3.00 USD</td>
                <td className="px-4 py-2.5 text-slate-500">$5.00 USD</td>
                <td className="px-4 py-2.5 font-bold text-emerald-600">40% Less Cost ($24/yr saved/seat)</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-semibold">Clicks to Record Expense</td>
                <td className="px-4 py-2.5 font-bold text-slate-900">2 clicks</td>
                <td className="px-4 py-2.5 text-slate-500">6+ clicks</td>
                <td className="px-4 py-2.5 font-bold text-emerald-600">67% fewer user interactions</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-semibold">Google Workspace Sync</td>
                <td className="px-4 py-2.5 font-bold text-slate-900">Direct Sheets API</td>
                <td className="px-4 py-2.5 text-slate-500">Export or 3P webhook</td>
                <td className="px-4 py-2.5 font-bold text-emerald-600">Native Google integration</td>
              </tr>
              <tr>
                <td className="px-4 py-2.5 font-semibold">Duplicate Detection</td>
                <td className="px-4 py-2.5 font-bold text-slate-900">SHA-256 + Field Hash</td>
                <td className="px-4 py-2.5 text-slate-500">SmartScan match</td>
                <td className="px-4 py-2.5 font-bold text-emerald-600">Cryptographic file integrity</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
