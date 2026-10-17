import React, { useState } from 'react';
import { X, Landmark, Check, AlertTriangle, ShieldCheck, FileText, ArrowRight, ExternalLink, Clock, Copy, Upload } from 'lucide-react';
import { BankPaymentRecord, UserProfile, isUserDirector } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';

interface PaymentDetailDrawerProps {
  payment: BankPaymentRecord | null;
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdate: () => void;
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
        <div className="p-6 space-y-6 overflow-y-auto flex-1 text-xs">
          {message && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-300 text-emerald-900 font-bold rounded-xl flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-600" />
              <span>{message}</span>
            </div>
          )}

          {/* 4-Step Visual FMS Progress Stepper */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-3">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
              4-Step FMS Lifecycle Status
            </span>
            <div className="grid grid-cols-4 gap-2 text-center text-[10px] font-bold">
              {/* Step 1: Intake */}
              <div className="p-2 bg-emerald-100 text-emerald-900 rounded-xl border border-emerald-200 space-y-1">
                <span className="block font-black text-emerald-700">1. Intake</span>
                <span className="block text-[9px] text-emerald-800">Submitted</span>
              </div>

              {/* Step 2: Approval */}
              <div className={`p-2 rounded-xl border space-y-1 ${
                payment.approvalStatus === 'APPROVED'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                  : payment.approvalStatus === 'REJECTED'
                  ? 'bg-rose-100 text-rose-900 border-rose-200'
                  : 'bg-amber-100 text-amber-900 border-amber-300 animate-pulse'
              }`}>
                <span className="block font-black">2. Approval</span>
                <span className="block text-[9px]">{payment.approvalStatus}</span>
              </div>

              {/* Step 3: Portal Entry */}
              <div className={`p-2 rounded-xl border space-y-1 ${
                payment.paymentEntry === 'DONE'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                  : payment.paymentEntry === 'CANCELLED'
                  ? 'bg-slate-100 text-slate-400 border-slate-200'
                  : payment.approvalStatus === 'APPROVED'
                  ? 'bg-indigo-100 text-indigo-900 border-indigo-200 animate-pulse'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                <span className="block font-black">3. Bank Entry</span>
                <span className="block text-[9px]">{payment.paymentEntry}</span>
              </div>

              {/* Step 4: Settlement */}
              <div className={`p-2 rounded-xl border space-y-1 ${
                payment.paymentStatus === 'DONE'
                  ? 'bg-emerald-100 text-emerald-900 border-emerald-200'
                  : payment.paymentStatus === 'CANCELLED'
                  ? 'bg-slate-100 text-slate-400 border-slate-200'
                  : payment.paymentEntry === 'DONE'
                  ? 'bg-indigo-100 text-indigo-900 border-indigo-200 animate-pulse'
                  : 'bg-slate-100 text-slate-500 border-slate-200'
              }`}>
                <span className="block font-black">4. Settlement</span>
                <span className="block text-[9px]">{payment.paymentStatus}</span>
              </div>
            </div>
          </div>

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
                <span className="text-slate-500 block text-[11px]">Trade Vendor Name</span>
                <span className="font-bold text-slate-900">{payment.vendorName}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Legal Beneficiary Name</span>
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
                <span className="text-slate-500 block text-[11px]">Project Site</span>
                <span className="font-semibold text-slate-800">{payment.site}</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[11px]">Required Date</span>
                <span className="font-semibold text-slate-800">{payment.plannedDate}</span>
              </div>
              <div className="col-span-2">
                <span className="text-slate-500 block text-[11px]">Purpose / Particulars</span>
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
                    <span className="font-mono font-bold text-slate-900">{payment.accountNoMasked || '••••••••3352'} ({payment.ifscCode || 'SBIN0001292'})</span>
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

          {/* Audit Timestamp History */}
          <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 space-y-2 text-[11px]">
            <span className="font-bold text-slate-700 block uppercase tracking-wider text-[10px]">
              Audit Execution Logs
            </span>
            <div className="space-y-1 text-slate-600">
              <div className="flex justify-between">
                <span>Requested:</span>
                <span className="font-semibold text-slate-800">{payment.timestamp} by {payment.requestedBy}</span>
              </div>
              {payment.approvalTimestamp && (
                <div className="flex justify-between">
                  <span>Sanctioned:</span>
                  <span className="font-semibold text-slate-800">{payment.approvalTimestamp} by {payment.approvedBy}</span>
                </div>
              )}
              {payment.paymentEntryTimestamp && (
                <div className="flex justify-between">
                  <span>Portal Entry:</span>
                  <span className="font-semibold text-slate-800">{payment.paymentEntryTimestamp} by {payment.paymentEntryBy}</span>
                </div>
              )}
              {payment.paymentDoneTimestamp && (
                <div className="flex justify-between">
                  <span>Final Debit UTR:</span>
                  <span className="font-semibold text-slate-800">{payment.paymentDoneTimestamp} (UTR: {payment.remarks || 'N/A'})</span>
                </div>
              )}
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
