import React, { useState, useRef } from 'react';
import {
  X,
  UploadCloud,
  FileText,
  AlertTriangle,
  CheckCircle2,
  Loader2,
  DollarSign,
  Calendar,
  Building,
  Tag,
  CreditCard,
  Hash,
  Sparkles,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { uploadReceipt, updateExpense, approveExpense } from '../api';
import { Expense } from '../types';

interface AddReceiptModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  onBenchmarkAction?: (action: 'click' | 'keystroke') => void;
}

const CATEGORIES = [
  'Meals & Dining',
  'Travel & Transit',
  'Lodging',
  'Office Supplies',
  'Software & SaaS',
  'Utilities',
  'Professional Services',
  'Other',
];

const CURRENCIES = ['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'JPY'];

export const AddReceiptModal: React.FC<AddReceiptModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  onBenchmarkAction,
}) => {
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState<string>('');
  const [isUploading, setIsUploading] = useState(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [error, setError] = useState<string>('');

  // Duplicate warning state
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [pendingExtractedData, setPendingExtractedData] = useState<any>(null);

  // Extracted/editable fields
  const [expenseId, setExpenseId] = useState<string>('');
  const [merchant, setMerchant] = useState('');
  const [date, setDate] = useState('');
  const [currency, setCurrency] = useState('USD');
  const [subtotal, setSubtotal] = useState<number>(0);
  const [tax, setTax] = useState<number>(0);
  const [total, setTotal] = useState<number>(0);
  const [category, setCategory] = useState('Other');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [referenceNo, setReferenceNo] = useState('');
  const [notes, setNotes] = useState('');
  const [confidence, setConfidence] = useState<number>(0.9);
  const [reviewReasons, setReviewReasons] = useState<string[]>([]);
  const [isExtracted, setIsExtracted] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onBenchmarkAction?.('click');
    if (e.target.files && e.target.files[0]) {
      processSelectedFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    onBenchmarkAction?.('click');
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processSelectedFile(e.dataTransfer.files[0]);
    }
  };

  const processSelectedFile = (selectedFile: File) => {
    setError('');
    setDuplicateWarning(null);

    // Client-side quick check
    if (selectedFile.size > 10 * 1024 * 1024) {
      setError('File size exceeds 10MB limit.');
      return;
    }

    setFile(selectedFile);

    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      setFilePreview(base64);
      // Auto-trigger upload and OCR extraction
      executeUploadAndOcr(base64, selectedFile.name, false);
    };
    reader.readAsDataURL(selectedFile);
  };

  const executeUploadAndOcr = async (
    base64Data: string,
    filename: string,
    bypassDuplicate: boolean = false
  ) => {
    setIsUploading(true);
    setUploadStep('Validating file binary...');
    setError('');

    try {
      setUploadStep('Running AI OCR document extraction...');
      const response = await uploadReceipt(base64Data, filename, bypassDuplicate);

      if (response.duplicateDetected) {
        setDuplicateWarning(response.dupCheck);
        setPendingExtractedData({
          base64Data,
          filename,
          extracted: response.extractedData,
        });
        setIsUploading(false);
        return;
      }

      if (response.success && response.extracted) {
        populateExtractedFields(response.expenseId!, response.extracted);
      }
    } catch (err: any) {
      setError(err.message || 'Failed to process receipt.');
    } finally {
      setIsUploading(false);
      setUploadStep('');
    }
  };

  const populateExtractedFields = (expId: string, extracted: any) => {
    setExpenseId(expId);
    setMerchant(extracted.merchant || '');
    setDate(extracted.date || new Date().toISOString().slice(0, 10));
    setCurrency(extracted.currency || 'USD');
    setSubtotal(extracted.subtotal || 0);
    setTax(extracted.tax || 0);
    setTotal(extracted.total || 0);
    setCategory(extracted.category || 'Other');
    setPaymentMethod(extracted.payment_method || '');
    setReferenceNo(extracted.reference_no || '');
    setConfidence(extracted.confidence_score || 0.9);
    setReviewReasons(extracted.needs_review_reasons || []);
    setIsExtracted(true);
  };

  const handleProceedDuplicate = () => {
    onBenchmarkAction?.('click');
    if (pendingExtractedData) {
      executeUploadAndOcr(
        pendingExtractedData.base64Data,
        pendingExtractedData.filename,
        true
      );
      setDuplicateWarning(null);
    }
  };

  const handleSaveAndApprove = async (markReviewed: boolean = true) => {
    onBenchmarkAction?.('click');
    if (!expenseId) return;
    setIsSaving(true);
    setError('');

    try {
      await updateExpense(expenseId, {
        merchant,
        date,
        currency,
        subtotal: Number(subtotal) || 0,
        tax: Number(tax) || 0,
        total: Number(total) || 0,
        category,
        payment_method: paymentMethod,
        reference_no: referenceNo,
        notes,
        review_status: markReviewed ? 'reviewed' : 'pending_review',
      });

      if (markReviewed) {
        await approveExpense(expenseId);
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to save expense.');
    } finally {
      setIsSaving(false);
    }
  };

  // Math consistency check
  const calculatedSum = Number((Number(subtotal) + Number(tax)).toFixed(2));
  const isMathConsistent = Math.abs(calculatedSum - Number(total)) <= 0.05;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[92vh] flex flex-col border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 rounded-lg bg-blue-100 text-blue-600 flex items-center justify-center">
              <UploadCloud className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">Capture &amp; Review Receipt</h2>
              <p className="text-xs text-slate-500">
                AI extraction with automated duplicate detection and Google Sheets sync
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {error && (
            <div className="mb-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-700 flex items-start space-x-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold">Error: </span>
                {error}
              </div>
            </div>
          )}

          {/* DUPLICATE WARNING BANNER */}
          {duplicateWarning && (
            <div className="mb-6 p-4 bg-amber-50 border border-amber-300 rounded-xl">
              <div className="flex items-start space-x-3">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <h4 className="text-xs font-bold text-amber-900">
                    Potential Duplicate Receipt Detected
                  </h4>
                  <p className="text-xs text-amber-800 mt-1">
                    {duplicateWarning.reason === 'exact_file_hash'
                      ? 'An identical receipt file (matching SHA-256 binary hash) already exists in this workspace.'
                      : `A matching expense for "${duplicateWarning.matchedExpenseSummary?.merchant}" on ${duplicateWarning.matchedExpenseSummary?.date} for $${duplicateWarning.matchedExpenseSummary?.total} already exists.`}
                  </p>
                  <div className="mt-3 flex items-center space-x-2">
                    <button
                      onClick={handleProceedDuplicate}
                      className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-md transition-colors"
                    >
                      Proceed Anyway (Allow Duplicate)
                    </button>
                    <button
                      onClick={() => {
                        setDuplicateWarning(null);
                        setFile(null);
                        setFilePreview('');
                      }}
                      className="px-3 py-1.5 bg-white border border-amber-300 text-amber-800 hover:bg-amber-100 text-xs font-medium rounded-md transition-colors"
                    >
                      Cancel &amp; Discard
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* UPLOAD / DROPZONE VIEW (When no file uploaded yet) */}
          {!file && !isExtracted && (
            <div
              onDragOver={(e) => e.preventDefault()}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-slate-300 hover:border-blue-500 hover:bg-blue-50/30 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer transition-colors group"
            >
              <input
                ref={fileInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp,application/pdf"
                onChange={handleFileChange}
                className="hidden"
              />
              <div className="w-16 h-16 rounded-full bg-slate-100 group-hover:bg-blue-100 text-slate-400 group-hover:text-blue-600 flex items-center justify-center transition-colors mb-4">
                <UploadCloud className="w-8 h-8" />
              </div>
              <h3 className="text-sm font-bold text-slate-800 mb-1">
                Drop your receipt image or PDF here
              </h3>
              <p className="text-xs text-slate-500 mb-4 text-center max-w-sm">
                Supports JPG, PNG, WebP images and PDF documents up to 10MB. OCR extracts vendor, date, currency, taxes, and total automatically.
              </p>
              <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs transition-colors">
                <span>Browse Files</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </div>
          )}

          {/* PROCESSING INDICATOR */}
          {isUploading && (
            <div className="p-12 flex flex-col items-center justify-center text-center space-y-4">
              <div className="relative">
                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                <Sparkles className="w-4 h-4 text-amber-500 absolute -top-1 -right-1" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-800">Processing Receipt</h4>
                <p className="text-xs text-slate-500 mt-1">{uploadStep || 'Please wait...'}</p>
              </div>
            </div>
          )}

          {/* SIDE-BY-SIDE REVIEW VIEW */}
          {isExtracted && !isUploading && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Left Column: Receipt Document Preview */}
              <div className="flex flex-col border border-slate-200 rounded-xl overflow-hidden bg-slate-900/5">
                <div className="px-4 py-2 bg-slate-100 border-b border-slate-200 flex items-center justify-between text-xs text-slate-700 font-medium">
                  <div className="flex items-center space-x-1.5 truncate">
                    <FileText className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                    <span className="truncate">{file?.name || 'receipt-document'}</span>
                  </div>
                  <span className="text-2xs text-slate-500 uppercase">
                    {(confidence * 100).toFixed(0)}% OCR Confidence
                  </span>
                </div>
                <div className="flex-1 p-3 flex items-center justify-center min-h-[300px] max-h-[480px] overflow-auto bg-slate-900/10">
                  {filePreview.startsWith('data:application/pdf') ? (
                    <div className="text-center p-6 bg-white rounded-lg border border-slate-200 shadow-xs">
                      <FileText className="w-12 h-12 text-blue-600 mx-auto mb-2" />
                      <p className="text-xs font-semibold text-slate-800">PDF Document Attached</p>
                      <p className="text-2xs text-slate-500 mt-1">{file?.name}</p>
                    </div>
                  ) : (
                    <img
                      src={filePreview}
                      alt="Receipt Document"
                      className="max-h-[450px] w-auto object-contain rounded shadow-xs"
                    />
                  )}
                </div>
              </div>

              {/* Right Column: Extracted Data Fields & Verification */}
              <div className="space-y-4">
                {/* Review Reasons / Discrepancy Alert */}
                {reviewReasons.length > 0 && (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-1">
                    <div className="flex items-center space-x-1.5 text-amber-800 font-semibold text-xs">
                      <AlertTriangle className="w-3.5 h-3.5" />
                      <span>Review Required</span>
                    </div>
                    <ul className="text-2xs text-amber-700 list-disc pl-4 space-y-0.5">
                      {reviewReasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-3">
                  {/* Merchant */}
                  <div className="col-span-2">
                    <label className="block text-2xs font-semibold text-slate-700 uppercase mb-1">
                      Merchant / Vendor
                    </label>
                    <div className="relative">
                      <Building className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="text"
                        value={merchant}
                        onChange={(e) => {
                          setMerchant(e.target.value);
                          onBenchmarkAction?.('keystroke');
                        }}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                        placeholder="e.g. Acme Corp"
                      />
                    </div>
                  </div>

                  {/* Transaction Date */}
                  <div>
                    <label className="block text-2xs font-semibold text-slate-700 uppercase mb-1">
                      Transaction Date
                    </label>
                    <div className="relative">
                      <Calendar className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                      <input
                        type="date"
                        value={date}
                        onChange={(e) => {
                          setDate(e.target.value);
                          onBenchmarkAction?.('keystroke');
                        }}
                        className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-medium text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Currency */}
                  <div>
                    <label className="block text-2xs font-semibold text-slate-700 uppercase mb-1">
                      Currency
                    </label>
                    <select
                      value={currency}
                      onChange={(e) => {
                        setCurrency(e.target.value);
                        onBenchmarkAction?.('click');
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    >
                      {CURRENCIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Subtotal */}
                  <div>
                    <label className="block text-2xs font-semibold text-slate-700 uppercase mb-1">
                      Subtotal
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={subtotal}
                      onChange={(e) => {
                        setSubtotal(parseFloat(e.target.value) || 0);
                        onBenchmarkAction?.('keystroke');
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Tax */}
                  <div>
                    <label className="block text-2xs font-semibold text-slate-700 uppercase mb-1">
                      Tax / VAT
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      value={tax}
                      onChange={(e) => {
                        setTax(parseFloat(e.target.value) || 0);
                        onBenchmarkAction?.('keystroke');
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  {/* Total */}
                  <div className="col-span-2 p-2.5 bg-slate-50 border border-slate-200 rounded-lg">
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-2xs font-bold text-slate-800 uppercase">
                        Total Amount Charged
                      </label>
                      <span
                        className={`text-2xs font-semibold px-2 py-0.5 rounded ${
                          isMathConsistent
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {isMathConsistent ? '✓ Math Verified' : '⚠ Subtotal+Tax Mismatch'}
                      </span>
                    </div>
                    <div className="relative">
                      <DollarSign className="w-5 h-5 text-slate-500 absolute left-2.5 top-2" />
                      <input
                        type="number"
                        step="0.01"
                        value={total}
                        onChange={(e) => {
                          setTotal(parseFloat(e.target.value) || 0);
                          onBenchmarkAction?.('keystroke');
                        }}
                        className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-lg text-base font-bold text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                  </div>

                  {/* Category */}
                  <div>
                    <label className="block text-2xs font-semibold text-slate-700 uppercase mb-1">
                      Category
                    </label>
                    <select
                      value={category}
                      onChange={(e) => {
                        setCategory(e.target.value);
                        onBenchmarkAction?.('click');
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    >
                      {CATEGORIES.map((cat) => (
                        <option key={cat} value={cat}>
                          {cat}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Payment Method */}
                  <div>
                    <label className="block text-2xs font-semibold text-slate-700 uppercase mb-1">
                      Payment Method
                    </label>
                    <input
                      type="text"
                      value={paymentMethod}
                      onChange={(e) => {
                        setPaymentMethod(e.target.value);
                        onBenchmarkAction?.('keystroke');
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Visa *1234"
                    />
                  </div>

                  {/* Reference No */}
                  <div className="col-span-2">
                    <label className="block text-2xs font-semibold text-slate-700 uppercase mb-1">
                      Receipt / Invoice Reference #
                    </label>
                    <input
                      type="text"
                      value={referenceNo}
                      onChange={(e) => {
                        setReferenceNo(e.target.value);
                        onBenchmarkAction?.('keystroke');
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. INV-2026-904"
                    />
                  </div>

                  {/* Notes */}
                  <div className="col-span-2">
                    <label className="block text-2xs font-semibold text-slate-700 uppercase mb-1">
                      Business Purpose / Notes
                    </label>
                    <input
                      type="text"
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        onBenchmarkAction?.('keystroke');
                      }}
                      className="w-full px-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                      placeholder="e.g. Client lunch with marketing directors"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer Actions */}
        <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between">
          <div className="text-2xs text-slate-400">
            {isExtracted ? 'Review status is an internal tracking flag.' : 'Files stored with isolated tenant encryption.'}
          </div>
          <div className="flex items-center space-x-2">
            <button
              onClick={onClose}
              className="px-3.5 py-1.5 border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-lg transition-colors"
            >
              Cancel
            </button>
            {isExtracted && (
              <>
                <button
                  disabled={isSaving}
                  onClick={() => handleSaveAndApprove(false)}
                  className="px-3.5 py-1.5 border border-slate-300 hover:bg-slate-100 text-slate-800 text-xs font-semibold rounded-lg transition-colors"
                >
                  Save as Draft
                </button>
                <button
                  disabled={isSaving}
                  onClick={() => handleSaveAndApprove(true)}
                  className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold rounded-lg shadow-xs hover:shadow transition-all flex items-center space-x-1.5"
                >
                  {isSaving ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Approve &amp; Mark Reviewed</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
