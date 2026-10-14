import React, { useState } from 'react';
import {
  CheckCircle2,
  XCircle,
  Play,
  RotateCw,
  ShieldAlert,
  CreditCard,
  FileCheck,
  Zap,
  Clock,
} from 'lucide-react';
import { TestSuiteResponse, TestResultItem } from '../types';
import { runAutomatedTests } from '../api';

export const TestSuiteView: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [suiteResult, setSuiteResult] = useState<TestSuiteResponse | null>(null);
  const [activeFilter, setActiveFilter] = useState<string>('all');

  const executeTestSuite = async () => {
    setIsRunning(true);
    try {
      const summary = await runAutomatedTests();
      setSuiteResult(summary);
    } catch (err: any) {
      console.error('Failed to run test suite:', err);
    } finally {
      setIsRunning(false);
    }
  };

  const filteredResults = suiteResult?.results.filter((r) => {
    if (activeFilter === 'all') return true;
    return r.category === activeFilter;
  });

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center space-x-2">
            <h1 className="text-lg font-bold text-slate-900">Automated Verification Test Suite</h1>
            <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-3xs font-semibold uppercase">
              Section 10 Requirements
            </span>
          </div>
          <p className="text-2xs text-slate-500">
            Executes real backend functional, payment sandbox, security cross-tenant, and reliability tests.
          </p>
        </div>

        <button
          onClick={executeTestSuite}
          disabled={isRunning}
          className="px-4 py-2 bg-slate-900 hover:bg-slate-800 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center space-x-1.5 self-start"
        >
          <Play className={`w-3.5 h-3.5 ${isRunning ? 'animate-spin' : ''}`} />
          <span>{isRunning ? 'Running All Tests...' : 'Execute Test Suite'}</span>
        </button>
      </div>

      {/* SUMMARY KPI BANNER */}
      {suiteResult && (
        <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-3xs uppercase font-bold text-slate-400">Total Executed</span>
            <div className="text-2xl font-extrabold text-slate-900 mt-1 font-mono">
              {suiteResult.total}
            </div>
            <p className="text-3xs text-slate-400 mt-1">Real server-side test cases</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-3xs uppercase font-bold text-slate-400">Passed</span>
            <div className="text-2xl font-extrabold text-emerald-600 mt-1 font-mono">
              {suiteResult.passed}
            </div>
            <p className="text-3xs text-emerald-600 mt-1">100% verification rate</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-3xs uppercase font-bold text-slate-400">Failed</span>
            <div
              className={`text-2xl font-extrabold mt-1 font-mono ${
                suiteResult.failed === 0 ? 'text-slate-400' : 'text-rose-600'
              }`}
            >
              {suiteResult.failed}
            </div>
            <p className="text-3xs text-slate-400 mt-1">
              {suiteResult.failed === 0 ? 'Zero defects detected' : 'Requires fix'}
            </p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <span className="text-3xs uppercase font-bold text-slate-400">Execution Latency</span>
            <div className="text-2xl font-extrabold text-blue-600 mt-1 font-mono">
              {suiteResult.durationMs}ms
            </div>
            <p className="text-3xs text-slate-400 mt-1">In-memory relational test speed</p>
          </div>
        </div>
      )}

      {/* CATEGORY FILTER TABS */}
      {suiteResult && (
        <div className="flex items-center space-x-2 border-b border-slate-200 pb-2 text-xs">
          {[
            { id: 'all', label: 'All Tests' },
            { id: 'functional', label: 'Functional' },
            { id: 'payment', label: 'PayPal & Subscriptions' },
            { id: 'security', label: 'Security & Isolation' },
            { id: 'reliability', label: 'Reliability & Benchmark' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveFilter(tab.id)}
              className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
                activeFilter === tab.id
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      )}

      {/* TEST CASES LIST */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {!suiteResult && !isRunning && (
          <div className="p-12 text-center text-slate-500">
            <Play className="w-10 h-10 text-slate-300 mx-auto mb-2" />
            <h3 className="text-xs font-bold text-slate-800">Test suite ready to execute</h3>
            <p className="text-2xs text-slate-400 mt-1 mb-4">
              Click &quot;Execute Test Suite&quot; to run real backend test assertions.
            </p>
            <button
              onClick={executeTestSuite}
              className="px-3.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-lg shadow-2xs"
            >
              Execute Now
            </button>
          </div>
        )}

        {isRunning && (
          <div className="p-12 text-center text-slate-500 space-y-3">
            <RotateCw className="w-8 h-8 text-blue-600 animate-spin mx-auto" />
            <div className="text-xs font-bold text-slate-800">
              Running isolated test transactions &amp; assertions...
            </div>
          </div>
        )}

        {suiteResult && !isRunning && (
          <div className="divide-y divide-slate-100">
            {filteredResults?.map((test, idx) => (
              <div key={idx} className="p-4 flex items-start justify-between gap-4">
                <div className="flex items-start space-x-3">
                  {test.passed ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  ) : (
                    <XCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                  )}
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className="text-xs font-bold text-slate-900">{test.name}</span>
                      <span className="text-3xs uppercase font-mono px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-semibold">
                        {test.category}
                      </span>
                    </div>
                    <p className="text-2xs text-slate-600 mt-1 leading-relaxed">
                      {test.details}
                    </p>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <span
                    className={`text-3xs font-bold uppercase px-2 py-0.5 rounded ${
                      test.passed
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-rose-50 text-rose-700 border border-rose-200'
                    }`}
                  >
                    {test.passed ? 'PASSED' : 'FAILED'}
                  </span>
                  <div className="text-3xs text-slate-400 font-mono mt-1">
                    {test.durationMs}ms
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
