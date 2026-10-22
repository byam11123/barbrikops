import React, { useState, useEffect } from 'react';
import { ShieldAlert, CheckCircle2, AlertTriangle, FileText, Lock, Eye } from 'lucide-react';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';

interface AccountsDoubleEntryVerificationPanelProps {
  beneficiaryName: string;
  vendorName: string;
  originalAccountNo: string;
  originalIfscCode: string;
  bankName?: string;
  cancelledChequeUrl?: string;
  isAlreadyVerified?: boolean;
  verificationTimestamp?: string;
  onVerificationStatusChange: (
    isValid: boolean,
    details: { reEnteredAccountNo: string; reEnteredIfscCode: string }
  ) => void;
}

export const AccountsDoubleEntryVerificationPanel: React.FC<AccountsDoubleEntryVerificationPanelProps> = ({
  beneficiaryName,
  vendorName,
  originalAccountNo,
  originalIfscCode,
  bankName,
  cancelledChequeUrl,
  isAlreadyVerified,
  verificationTimestamp,
  onVerificationStatusChange,
}) => {
  const [reEnteredAccountNo, setReEnteredAccountNo] = useState('');
  const [reEnteredIfscCode, setReEnteredIfscCode] = useState('');
  const [isChequePreviewOpen, setIsChequePreviewOpen] = useState(false);

  // Extract last 4 digits for masked display
  const rawAccountNo = (originalAccountNo || '').trim().replace(/\s+/g, '');
  const last4 = rawAccountNo.slice(-4) || '1234';
  const maskedAccountNo = rawAccountNo ? `XXXX XXXX XXXX ${last4}` : 'XXXX XXXX XXXX 1234';

  const cleanOriginalAccount = rawAccountNo;
  const cleanOriginalIfsc = (originalIfscCode || '').trim().toUpperCase().replace(/\s+/g, '');

  const cleanTypedAccount = reEnteredAccountNo.trim().replace(/\s+/g, '');
  const cleanTypedIfsc = reEnteredIfscCode.trim().toUpperCase().replace(/\s+/g, '');

  const isAccountTyped = cleanTypedAccount.length > 0;
  const isIfscTyped = cleanTypedIfsc.length > 0;

  const isAccountMatch = isAccountTyped && cleanTypedAccount === cleanOriginalAccount;
  const isIfscMatch = isIfscTyped && cleanTypedIfsc === cleanOriginalIfsc;
  const isFullMatch = isAccountMatch && isIfscMatch;

  const hasAccountError = isAccountTyped && !isAccountMatch;
  const hasIfscError = isIfscTyped && !isIfscMatch;

  const prevMatchRef = React.useRef<{ isFullMatch?: boolean; account?: string; ifsc?: string }>({});

  useEffect(() => {
    if (
      prevMatchRef.current.isFullMatch !== isFullMatch ||
      prevMatchRef.current.account !== cleanTypedAccount ||
      prevMatchRef.current.ifsc !== cleanTypedIfsc
    ) {
      prevMatchRef.current = { isFullMatch, account: cleanTypedAccount, ifsc: cleanTypedIfsc };
      onVerificationStatusChange(isFullMatch, {
        reEnteredAccountNo: cleanTypedAccount,
        reEnteredIfscCode: cleanTypedIfsc,
      });
    }
  }, [isFullMatch, cleanTypedAccount, cleanTypedIfsc, onVerificationStatusChange]);

  const chequeProofUrl = cancelledChequeUrl || 'https://pdfobject.com/pdf/sample.pdf';

  return (
    <div className="p-4 bg-slate-900 border-2 border-amber-500/60 rounded-2xl text-white space-y-4 shadow-lg animate-in fade-in">
      {/* Panel Header */}
      <div className="flex items-center justify-between flex-wrap gap-2 pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-amber-500/20 border border-amber-400/40 rounded-xl text-amber-400">
            <ShieldAlert className="w-5 h-5 text-amber-400" />
          </div>
          <div>
            <h4 className="font-extrabold text-xs text-amber-300 uppercase tracking-wider flex items-center gap-2">
              <span>Accounts Mandatory Double-Entry Verification</span>
              <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded font-bold">
                STRICT SECURITY CHECK
              </span>
            </h4>
            <p className="text-[11px] text-slate-300 font-medium">
              Physical Cheque Inspection &amp; Re-entry required to verify new vendor bank coordinates
            </p>
          </div>
        </div>

        {isAlreadyVerified && (
          <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-xl text-xs font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Verified by Accounts on {verificationTimestamp || 'Today'}</span>
          </span>
        )}
      </div>

      {/* Masked Summary & Cheque Proof Inspection */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs bg-slate-800/80 p-3.5 rounded-xl border border-slate-700">
        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Vendor / Beneficiary</span>
          <span className="font-extrabold text-white text-xs">{beneficiaryName || vendorName}</span>
          <span className="block text-[10px] text-slate-400 mt-0.5">Bank: {bankName || 'State Bank of India'}</span>
        </div>

        <div>
          <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">Entered Account Number (Masked)</span>
          <span className="font-mono font-black text-amber-300 text-sm tracking-widest">{maskedAccountNo}</span>
          <span className="block text-[10px] text-slate-400 mt-0.5 font-mono">IFSC: {originalIfscCode || 'N/A'}</span>
        </div>

        <div className="sm:col-span-2 pt-2 border-t border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
          <span className="text-[11px] text-slate-300 font-medium flex items-center gap-1.5">
            <FileText className="w-4 h-4 text-amber-300" />
            <span>Cancelled Cheque / Passbook Proof Attached</span>
          </span>
          <button
            type="button"
            onClick={() => setIsChequePreviewOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black rounded-lg text-xs transition-colors shadow-xs cursor-pointer"
          >
            <Eye className="w-3.5 h-3.5 text-slate-950" />
            <span>Inspect Cancelled Cheque</span>
          </button>
        </div>
      </div>

      {/* Double-Entry Input Fields */}
      <div className="space-y-3 pt-1">
        <label className="block text-xs font-bold text-slate-200">
          Re-enter Account Details for Strict Comparison <span className="text-amber-400">*</span>
        </label>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <Lock className="w-3 h-3 text-indigo-400" />
              <span>Re-enter Account Number *</span>
            </label>
            <input
              type="text"
              required
              value={reEnteredAccountNo}
              onChange={(e) => setReEnteredAccountNo(e.target.value)}
              placeholder="Type full account number..."
              className={`w-full text-xs font-mono font-bold px-3 py-2 bg-slate-950 border rounded-xl focus:outline-none transition-colors text-white ${
                hasAccountError
                  ? 'border-rose-500 focus:ring-2 focus:ring-rose-500 bg-rose-950/40'
                  : isAccountMatch
                  ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500 bg-emerald-950/20'
                  : 'border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/50'
              }`}
            />
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
              <Lock className="w-3 h-3 text-indigo-400" />
              <span>Re-enter IFSC Code *</span>
            </label>
            <input
              type="text"
              required
              value={reEnteredIfscCode}
              onChange={(e) => setReEnteredIfscCode(e.target.value.toUpperCase())}
              placeholder="e.g. SBIN0001292"
              className={`w-full text-xs font-mono font-bold px-3 py-2 bg-slate-950 border rounded-xl uppercase focus:outline-none transition-colors text-white ${
                hasIfscError
                  ? 'border-rose-500 focus:ring-2 focus:ring-rose-500 bg-rose-950/40'
                  : isIfscMatch
                  ? 'border-emerald-500 focus:ring-2 focus:ring-emerald-500 bg-emerald-950/20'
                  : 'border-slate-700 focus:border-amber-400 focus:ring-2 focus:ring-amber-400/50'
              }`}
            />
          </div>
        </div>

        {/* Mismatch Red Error State */}
        {hasAccountError && (
          <div className="p-3 bg-rose-950/90 border-2 border-rose-500 text-rose-200 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Account Number mismatch. Please check the Cancelled Cheque image.</span>
          </div>
        )}

        {hasIfscError && !hasAccountError && (
          <div className="p-3 bg-rose-950/90 border-2 border-rose-500 text-rose-200 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>IFSC Code mismatch. Please check the Cancelled Cheque image.</span>
          </div>
        )}

        {/* Exact Match Success State */}
        {isFullMatch && (
          <div className="p-3 bg-emerald-950/90 border-2 border-emerald-500 text-emerald-200 text-xs font-bold rounded-xl flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>✓ Account Number &amp; IFSC Code Matched Successfully! Beneficiary verified for Director sign-off.</span>
          </div>
        )}
      </div>

      {/* Cheque Attachment Modal */}
      {isChequePreviewOpen && (
        <AttachmentPreviewModal
          isOpen={isChequePreviewOpen}
          onClose={() => setIsChequePreviewOpen(false)}
          title="Cancelled Cheque & Bank Proof Verification"
          documentType="CHEQUE"
          fileUrl={chequeProofUrl}
          partyName={beneficiaryName || vendorName}
          referenceNo={`IFSC: ${originalIfscCode || 'N/A'}`}
        />
      )}
    </div>
  );
};
