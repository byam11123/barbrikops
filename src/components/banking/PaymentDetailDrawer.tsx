import React, { useState } from 'react';
import { X, Landmark, Check, AlertTriangle, ShieldCheck, FileText, Clock, Upload } from 'lucide-react';
import { BankPaymentRecord, UserProfile, isUserDirector } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { AccountsDoubleEntryVerificationPanel } from './AccountsDoubleEntryVerificationPanel';

interface PaymentDetailDrawerProps {
  payment: BankPaymentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdate: () => void;
}

function parseDateString(str?: string): Date | null {
  if (!str) return null;
  try {
    const cleaned = str.replace(',', '').trim();
    const parts = cleaned.split(' ');
    if (parts.length >= 2) {
      const dateParts = parts[0].split('/');
      const timeParts = parts[1].split(':');
      if (dateParts.length === 3 && timeParts.length >= 2) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
        const d = new Date(year, month, day, hours, minutes, seconds);
        if (!isNaN(d.getTime())) return d;
      }
    }
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
  } catch {
    return null;
  }
}

function formatDateDisplay(d: Date | null): string {
  if (!d) return '—';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addHours(d: Date, hours: number): Date {
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

export const PaymentDetailDrawer: React.FC<PaymentDetailDrawerProps> = ({
  payment,
  isOpen,
  onClose,
  currentUser,
  onUpdate,
}) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectInput, setShowRejectInput] = useState(false);
  const [doubleEntryValid, setDoubleEntryValid] = useState(false);
  const [reEnteredData, setReEnteredData] = useState<{ reEnteredAccountNo: string; reEnteredIfscCode: string }>({
    reEnteredAccountNo: '',
    reEnteredIfscCode: '',
  });

  const handleVerificationStatusChange = React.useCallback((isValid: boolean, details: { reEnteredAccountNo: string; reEnteredIfscCode: string }) => {
    setDoubleEntryValid((prev) => (prev !== isValid ? isValid : prev));
    setReEnteredData((prev) => {
      if (prev.reEnteredAccountNo === details.reEnteredAccountNo && prev.reEnteredIfscCode === details.reEnteredIfscCode) {
        return prev;
      }
      return details;
    });
  }, []);

  // Stage 3 Portal Entry Form State
  const [entryProofUrl, setEntryProofUrl] = useState('');

  // Stage 4 Settlement Form State
  const [utrNumber, setUtrNumber] = useState('');
  const [settlementProofUrl, setSettlementProofUrl] = useState('');

  const [message, setMessage] = useState<string | null>(null);

  // Document Preview State
  const [previewDoc, setPreviewDoc] = useState<{
    isOpen: boolean;
    title: string;
    docType: 'CHEQUE' | 'DEBIT_ADVICE' | 'PORTAL_ENTRY' | 'INVOICE' | 'OTHER';
    url?: string;
  }>({
    isOpen: false,
    title: '',
    docType: 'OTHER'
  });

  if (!isOpen || !payment) return null;

  const isDirector = isUserDirector(currentUser);
  const isAccounts = (currentUser.departmentKeys || []).includes('ACCOUNTS') || (currentUser.departmentName || '').toUpperCase().includes('ACCOUNTS') || currentUser.role.toUpperCase().includes('ACCOUNTS');

  const handleApprove = () => {
    storageAdapter.approveBankPaymentRecord(payment.id, true, currentUser);
    setMessage('Payment approved successfully! Advanced to Accounts Bank Entry queue.');
    onUpdate();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleReject = () => {
    if (!rejectionReason.trim()) return;
    storageAdapter.approveBankPaymentRecord(payment.id, false, currentUser, rejectionReason.trim());
    setMessage('Payment rejected. Downstream steps cancelled.');
    setShowRejectInput(false);
    onUpdate();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleRecordPortalEntry = (e: React.FormEvent) => {
    e.preventDefault();
    storageAdapter.recordBankPaymentEntry(payment.id, 'DONE', entryProofUrl.trim() || undefined, currentUser);
    setMessage('Bank Portal entry recorded successfully!');
    onUpdate();
    setTimeout(() => setMessage(null), 3000);
  };

  const handleFinalizeSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrNumber.trim()) {
      alert('Bank UTR Number or Transaction Reference is required');
      return;
    }
    storageAdapter.finalizeBankPaymentSettlement(payment.id, 'DONE', utrNumber.trim(), settlementProofUrl.trim() || undefined, currentUser);
    setMessage('Bank settlement finalized and UTR saved!');
    onUpdate();
    setTimeout(() => setMessage(null), 3000);
  };

  // SLA Timestamps Calculation
  const intakeDate = parseDateString(payment.timestamp);
  
  // Stage 1: Intake (Triggered when anyone fills the payment request form)
  const stage1Actual = payment.timestamp;
  const stage1User = payment.requestedBy;

  // Stage 2: Approval (SLA = 1 Hr from Stage 1 Intake)
  const stage2PlannedDate = intakeDate ? addHours(intakeDate, 1) : null;
  const stage2Planned = formatDateDisplay(stage2PlannedDate);
  const stage2ActualDate = parseDateString(payment.approvalTimestamp);
  const stage2Actual = payment.approvalTimestamp ? `${payment.approvalTimestamp} by ${payment.approvedBy || 'Director'}` : '—';

  // Stage 3: Bank Entry (SLA = 1 Hr from Stage 2)
  const stage3BaseDate = stage2ActualDate || stage2PlannedDate;
  const stage3PlannedDate = stage3BaseDate ? addHours(stage3BaseDate, 1) : null;
  const stage3Planned = formatDateDisplay(stage3PlannedDate);
  const stage3ActualDate = parseDateString(payment.paymentEntryTimestamp);
  const stage3Actual = payment.paymentEntryTimestamp ? `${payment.paymentEntryTimestamp} by ${payment.paymentEntryBy || 'Accounts'}` : '—';

  // Stage 4: Settlement (SLA = 1 Hr from Stage 3)
  const stage4BaseDate = stage3ActualDate || stage3PlannedDate;
  const stage4PlannedDate = stage4BaseDate ? addHours(stage4BaseDate, 1) : null;
  const stage4Planned = formatDateDisplay(stage4PlannedDate);
  const stage4Actual = payment.paymentDoneTimestamp ? `${payment.paymentDoneTimestamp} (UTR: ${payment.remarks || 'N/A'})` : '—';

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end">
      <div className="w-full max-w-2xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* Drawer Header */}
        <div className="p-5 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl font-mono font-bold text-xs">
              {payment.sheetNo}
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">{payment.vendorName}</h3>
              <p className="text-xs text-slate-500 font-medium">₹{payment.amountToBePaid.toLocaleString('en-IN')} • {payment.site}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drawer Content */}
        <div className="p-6 space-y-5 overflow-y-auto flex-1 text-xs">
          {message && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{message}</span>
            </div>
          )}

          {/* Trade Name vs Legal Beneficiary Mismatch Warning */}
          {payment.isNameMismatch && (
            <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-2xl space-y-1 text-amber-900">
              <div className="flex items-center gap-1.5 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600" />
                <span>Trade Name vs Bank Account Title Mismatch</span>
              </div>
              <p className="text-[11px] leading-relaxed">
                Trade Vendor: <span className="font-bold">{payment.vendorName}</span> <br />
                Bank Holder Title: <span className="font-bold">{payment.beneficiaryName}</span> <br />
                Payee Context: <span className="font-semibold text-amber-950">{payment.payeeRelationship || 'N/A'}</span>
              </p>
            </div>
          )}

          {/* Key Transaction Particulars */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2">
              Payment Specification
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500 block text-[11px]">Vendor Name</span>
                <span className="font-bold text-slate-900">{payment.vendorName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Name of Beneficiary</span>
                <span className="font-bold text-slate-900">{payment.beneficiaryName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Amount</span>
                <span className="font-mono font-bold text-indigo-700 text-sm">₹{payment.amountToBePaid.toLocaleString('en-IN')}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Payment Mode</span>
                <span className="font-bold text-slate-900">{payment.modeOfPayment}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Site</span>
                <span className="font-semibold text-slate-800">{payment.site}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Planned Date</span>
                <span className="font-semibold text-slate-800">{payment.plannedDate}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block text-[11px]">Purpose</span>
                <span className="font-medium text-slate-800">{payment.purposeOfPayment}</span>
              </div>
              {payment.modeOfPayment === 'ACCOUNT' && (
                <>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Bank Name</span>
                    <span className="font-semibold text-slate-800">{payment.bankName || 'State Bank of India'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Account Number & IFSC</span>
                    <span className="font-mono font-bold text-slate-900">
                      {payment.accountNo || (payment.accountNoMasked ? payment.accountNoMasked.replace(/•/g, '3') : '381928371923')} ({payment.ifscCode || 'SBIN0001292'})
                    </span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Attachments & Proofs */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
            <h4 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2">
              Attached Documents & Verification Proofs
            </h4>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Cancelled Cheque / Passbook</span>
                <button
                  type="button"
                  onClick={() => setPreviewDoc({
                    isOpen: true,
                    title: `Cancelled Cheque Proof - ${payment.beneficiaryName}`,
                    docType: 'CHEQUE',
                    url: payment.cancelledChequeUrl
                  })}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Inspect Cheque Proof</span>
                </button>
              </div>

              <div>
                <span className="text-[11px] font-bold text-slate-500 block mb-1">Settlement UTR / Advice</span>
                {payment.paymentDoneProof || payment.remarks ? (
                  <button
                    type="button"
                    onClick={() => setPreviewDoc({
                      isOpen: true,
                      title: `Debit Advice / UTR Confirmation - ${payment.sheetNo}`,
                      docType: 'DEBIT_ADVICE',
                      url: payment.paymentDoneProof
                    })}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Inspect Debit Advice</span>
                  </button>
                ) : (
                  <span className="text-slate-400 text-[11px]">Pending Bank Settlement</span>
                )}
              </div>
            </div>
          </div>

          {/* ACCOUNTS STAFF Action Controls for Beneficiary Verification */}
          {payment.modeOfPayment === 'ACCOUNT' && (payment.beneficiaryMasterStatus === 'NEEDS_ADDITION' || isAccounts) && (
            <div className="space-y-3">
              <AccountsDoubleEntryVerificationPanel
                beneficiaryName={payment.beneficiaryName}
                vendorName={payment.vendorName}
                originalAccountNo={payment.accountNo || (payment.accountNoMasked ? payment.accountNoMasked.replace(/•/g, '3') : '50100293812834')}
                originalIfscCode={payment.ifscCode || 'HDFC0000412'}
                bankName={payment.bankName || 'HDFC Bank'}
                cancelledChequeUrl={payment.cancelledChequeUrl}
                isAlreadyVerified={Boolean(payment.verifiedByAccountant)}
                verificationTimestamp={payment.accountantVerificationTimestamp}
                onVerificationStatusChange={handleVerificationStatusChange}
              />

              {!payment.verifiedByAccountant && isAccounts && (
                <button
                  type="button"
                  disabled={!doubleEntryValid}
                  onClick={() => {
                    storageAdapter.verifyBankPaymentBeneficiary(payment.id, true, currentUser, reEnteredData);
                    setMessage('Beneficiary verified successfully via double-entry matching! Sent to Director for approval.');
                    onUpdate();
                    setTimeout(() => setMessage(null), 3000);
                  }}
                  className={`w-full py-2.5 font-bold rounded-xl text-xs transition-all shadow-xs flex items-center justify-center gap-1.5 ${
                    doubleEntryValid
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                      : 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                  }`}
                  title={!doubleEntryValid ? 'Account Number and IFSC Code must match the original request exactly to verify' : undefined}
                >
                  <Check className="w-4 h-4" />
                  <span>Verify Beneficiary &amp; Send to Director</span>
                </button>
              )}
            </div>
          )}

          {/* Dynamic Role Action Controls */}

          {/* DIRECTOR ONLY Action Controls for Stage 2 Payment Approval */}
          {isDirector && payment.approvalStatus === 'PENDING' && (
            <div className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-200 space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Payment Sanction Authorization Control</span>
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full">
                  Director Role
                </span>
              </div>

              {!showRejectInput ? (
                <div className="flex items-center gap-3">
                  <button
                    onClick={handleApprove}
                    className="flex-1 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Check className="w-4 h-4" />
                    <span>Approve Payment Request</span>
                  </button>
                  <button
                    onClick={() => setShowRejectInput(true)}
                    className="px-4 py-2.5 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                  >
                    Reject
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  <input
                    type="text"
                    placeholder="Reason for rejecting payment..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-rose-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-rose-500"
                  />
                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setShowRejectInput(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleReject}
                      className="px-4 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs cursor-pointer"
                    >
                      Confirm Reject
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ACCOUNTS STAFF Action Controls for Stage 3 Bank Portal Entry */}
          {isAccounts && payment.approvalStatus === 'APPROVED' && payment.paymentEntry === 'PENDING' && (
            <form onSubmit={handleRecordPortalEntry} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-900 text-xs block border-b border-slate-200 pb-2">
                Stage 3: NetBanking / CMS Portal Entry Confirmation
              </span>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Portal Punch Confirmation Proof URL / Screenshot
                </label>
                <input
                  type="text"
                  placeholder="Paste URL or Base64 of NetBanking entry confirmation"
                  value={entryProofUrl}
                  onChange={(e) => setEntryProofUrl(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                Mark Bank Portal Entry Completed
              </button>
            </form>
          )}

          {/* ACCOUNTS STAFF Action Controls for Stage 4 Settlement & UTR Entry */}
          {isAccounts && payment.approvalStatus === 'APPROVED' && payment.paymentEntry === 'DONE' && payment.paymentStatus === 'PENDING' && (
            <form onSubmit={handleFinalizeSettlement} className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
              <span className="font-bold text-slate-900 text-xs block border-b border-slate-200 pb-2">
                Stage 4: Bank Settlement & UTR Confirmation
              </span>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bank UTR / Transaction Reference ID *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-918237192834 or CMS-88123"
                  value={utrNumber}
                  onChange={(e) => setUtrNumber(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Final Payment Receipt / Debit Advice Proof URL
                </label>
                <input
                  type="text"
                  placeholder="Paste URL or Base64 of debit advice"
                  value={settlementProofUrl}
                  onChange={(e) => setSettlementProofUrl(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                type="submit"
                className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
              >
                Finalize Settlement & Record UTR
              </button>
            </form>
          )}

          {/* Unified 4-Step FMS Lifecycle & SLA Audit Log (POSITIONED AT BOTTOM) */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-indigo-600" />
                <span>4-Step FMS Lifecycle & SLA Execution Audit Log</span>
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                1 Hr SLA / Stage (Starts Stage 2)
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Stage 1: Intake */}
              <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-[11px]">1. Intake</span>
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                    Submitted
                  </span>
                </div>
                <div className="space-y-0.5 text-[10px] text-slate-600">
                  <div><span className="text-slate-400">Actual:</span> <span className="font-semibold text-slate-800">{stage1Actual}</span></div>
                  <div><span className="text-slate-400">By:</span> <span className="font-medium text-slate-700">{stage1User}</span></div>
                </div>
              </div>

              {/* Stage 2: Approval */}
              <div className={`p-3 rounded-xl border space-y-1.5 shadow-2xs ${
                payment.approvalStatus === 'APPROVED' ? 'bg-white border-emerald-300' :
                payment.approvalStatus === 'REJECTED' ? 'bg-rose-50/50 border-rose-200' : 'bg-amber-50/50 border-amber-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-[11px]">2. Approval</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    payment.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                    payment.approvalStatus === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {payment.approvalStatus}
                  </span>
                </div>
                <div className="space-y-0.5 text-[10px] text-slate-600">
                  <div><span className="text-slate-400">Planned SLA:</span> <span className="font-semibold text-slate-800">{stage2Planned}</span></div>
                  <div><span className="text-slate-400">Actual:</span> <span className="font-semibold text-slate-800">{stage2Actual}</span></div>
                </div>
              </div>

              {/* Stage 3: Bank Entry */}
              <div className={`p-3 rounded-xl border space-y-1.5 shadow-2xs ${
                payment.paymentEntry === 'DONE' ? 'bg-white border-emerald-300' :
                payment.paymentEntry === 'CANCELLED' ? 'bg-slate-100 border-slate-200' : 'bg-amber-50/50 border-amber-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-[11px]">3. Bank Entry</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    payment.paymentEntry === 'DONE' ? 'bg-emerald-100 text-emerald-800' :
                    payment.paymentEntry === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {payment.paymentEntry}
                  </span>
                </div>
                <div className="space-y-0.5 text-[10px] text-slate-600">
                  <div><span className="text-slate-400">Planned SLA:</span> <span className="font-semibold text-slate-800">{stage3Planned}</span></div>
                  <div><span className="text-slate-400">Actual:</span> <span className="font-semibold text-slate-800">{stage3Actual}</span></div>
                </div>
              </div>

              {/* Stage 4: Settlement */}
              <div className={`p-3 rounded-xl border space-y-1.5 shadow-2xs ${
                payment.paymentStatus === 'DONE' ? 'bg-white border-emerald-300' :
                payment.paymentStatus === 'CANCELLED' ? 'bg-slate-100 border-slate-200' : 'bg-amber-50/50 border-amber-300'
              }`}>
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-900 text-[11px]">4. Settlement</span>
                  <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    payment.paymentStatus === 'DONE' ? 'bg-emerald-100 text-emerald-800' :
                    payment.paymentStatus === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                  }`}>
                    {payment.paymentStatus}
                  </span>
                </div>
                <div className="space-y-0.5 text-[10px] text-slate-600">
                  <div><span className="text-slate-400">Planned SLA:</span> <span className="font-semibold text-slate-800">{stage4Planned}</span></div>
                  <div><span className="text-slate-400">Actual:</span> <span className="font-semibold text-slate-800">{stage4Actual}</span></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
        isOpen={previewDoc.isOpen}
        onClose={() => setPreviewDoc(prev => ({ ...prev, isOpen: false }))}
        title={previewDoc.title}
        documentType={previewDoc.docType}
        fileUrl={previewDoc.url}
        referenceNo={payment.sheetNo}
        partyName={payment.beneficiaryName}
        amount={payment.amountToBePaid}
      />
    </div>
  );
};
