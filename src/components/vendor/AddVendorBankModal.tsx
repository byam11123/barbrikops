import React, { useState } from 'react';
import { X, Landmark, AlertTriangle, Upload, Check, Building2, ShieldAlert } from 'lucide-react';
import { VendorProfileRecord, VendorBankAccount, UserProfile, isUserAuthorizedForVendorBanking } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface AddVendorBankModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendor: VendorProfileRecord;
  currentUser: UserProfile;
  onSuccess: (updatedVendor: VendorProfileRecord) => void;
}

export const AddVendorBankModal: React.FC<AddVendorBankModalProps> = ({
  isOpen,
  onClose,
  vendor,
  currentUser,
  onSuccess
}) => {
  const isAuthorized = isUserAuthorizedForVendorBanking(currentUser);

  const [beneficiaryName, setBeneficiaryName] = useState(vendor.legalName || vendor.tradeName);
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [confirmAccountNo, setConfirmAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountType, setAccountType] = useState<'CURRENT' | 'SAVINGS' | 'CASH_CREDIT'>('CURRENT');
  const [isPrimary, setIsPrimary] = useState(vendor.bankAccounts.length === 0);
  const [cancelledChequeUrl, setCancelledChequeUrl] = useState('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600');
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const isNameMismatch = beneficiaryName.trim().toLowerCase() !== vendor.tradeName.trim().toLowerCase();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthorized) {
      setError('Access Denied: Only Accounts, Director, Admin, or Super Admin can register bank accounts.');
      return;
    }

    if (!beneficiaryName.trim()) {
      setError('Legal Beneficiary Name is required.');
      return;
    }

    if (!bankName.trim()) {
      setError('Bank Name is required.');
      return;
    }

    if (!accountNo.trim() || accountNo.trim().length < 6) {
      setError('Valid Bank Account Number is required (minimum 6 digits).');
      return;
    }

    if (accountNo.trim() !== confirmAccountNo.trim()) {
      setError('Account Numbers do not match. Please re-check.');
      return;
    }

    const cleanIfsc = ifscCode.trim().toUpperCase();
    if (!cleanIfsc || cleanIfsc.length !== 11) {
      setError('Valid 11-character IFSC Code is required (e.g. SBIN0001292).');
      return;
    }

    if (!cancelledChequeUrl.trim()) {
      setError('Mandatory Requirement: Cancelled Cheque proof is strictly required for Beneficiary Master registration.');
      return;
    }

    try {
      storageAdapter.addVendorBankAccount(
        vendor.id,
        {
          beneficiaryName: beneficiaryName.trim(),
          tradeVendorName: vendor.tradeName,
          bankName: bankName.trim(),
          accountNo: accountNo.trim(),
          accountNoMasked: `••••••••${accountNo.trim().slice(-4)}`,
          ifscCode: cleanIfsc,
          accountType,
          isPrimary,
          cancelledChequeUrl: cancelledChequeUrl.trim(),
          verificationStatus: 'VERIFIED',
          notes: notes.trim() || undefined,
        },
        currentUser
      );

      const refreshed = storageAdapter.getVendorProfileById(vendor.id);
      if (refreshed) {
        onSuccess(refreshed);
      }
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to add bank account.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Add Authorized Bank Account</h3>
              <p className="text-xs text-slate-500 font-normal">
                Linking bank details to <span className="font-semibold text-slate-800">{vendor.tradeName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {!isAuthorized && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Restricted Governance: Only Accounts, Director, Admin, or Super Admin can register banking records.</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Beneficiary Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Legal Bank Account Holder Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              disabled={!isAuthorized}
              placeholder="Exact name printed on Passbook / Cheque"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
            />
          </div>

          {/* Name Mismatch Notice */}
          {isNameMismatch && (
            <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-1">
              <div className="flex items-center gap-1.5 text-amber-900 font-bold text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                <span>Trade vs Beneficiary Title Mismatch</span>
              </div>
              <p className="text-[11px] text-amber-800 leading-relaxed">
                Trade Name (<span className="font-semibold">{vendor.tradeName}</span>) differs from Bank Holder (<span className="font-semibold">{beneficiaryName}</span>). A proprietor or director relationship remark is recommended.
              </p>
            </div>
          )}

          {/* Bank Name & Account Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bank Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!isAuthorized}
                placeholder="e.g. State Bank of India, HDFC Bank"
                value={bankName}
                onChange={(e) => setBankName(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Account Type <span className="text-rose-500">*</span>
              </label>
              <select
                disabled={!isAuthorized}
                value={accountType}
                onChange={(e) => setAccountType(e.target.value as any)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              >
                <option value="CURRENT">Current Account (Commercial)</option>
                <option value="SAVINGS">Savings Account (Proprietorship)</option>
                <option value="CASH_CREDIT">Cash Credit / Overdraft</option>
              </select>
            </div>
          </div>

          {/* Account Numbers & IFSC */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bank Account Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!isAuthorized}
                placeholder="Full account number"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Confirm Account Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!isAuthorized}
                placeholder="Re-enter account number"
                value={confirmAccountNo}
                onChange={(e) => setConfirmAccountNo(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                IFSC Code (11 Chars) <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!isAuthorized}
                maxLength={11}
                placeholder="e.g. SBIN0001292"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                <input
                  type="checkbox"
                  disabled={!isAuthorized}
                  checked={isPrimary}
                  onChange={(e) => setIsPrimary(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500"
                />
                <span>Set as Primary Disbursal Account</span>
              </label>
            </div>
          </div>

          {/* Cancelled Cheque Proof (Mandatory as per user instruction) */}
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Cancelled Cheque Proof Attachment <span className="text-rose-500">*</span>
              </label>
              <span className="text-[11px] font-bold text-emerald-700">Mandatory for Beneficiary Master</span>
            </div>
            <p className="text-[11px] text-slate-500 leading-normal">
              As per financial compliance, a verified cancelled cheque is required before vendor payments can be disbursed.
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                disabled={!isAuthorized}
                placeholder="Document / Image URL or Storage Link"
                value={cancelledChequeUrl}
                onChange={(e) => setCancelledChequeUrl(e.target.value)}
                className="flex-1 text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-800 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
              />
              <button
                type="button"
                disabled={!isAuthorized}
                onClick={() => setCancelledChequeUrl('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600')}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>Default Sample</span>
              </button>
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Verification Remarks / Notes</label>
            <input
              type="text"
              disabled={!isAuthorized}
              placeholder="e.g. Verified by Accounts with physical passbook copy"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-slate-100"
            />
          </div>

          {/* Action buttons */}
          <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 text-slate-700 rounded-xl text-xs font-bold hover:bg-slate-100 transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!isAuthorized}
              className="px-5 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>Register & Authorize Bank Account</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
