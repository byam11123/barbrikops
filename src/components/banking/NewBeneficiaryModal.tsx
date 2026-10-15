import React, { useState } from 'react';
import { X, Building2, Check, AlertTriangle } from 'lucide-react';
import { BeneficiaryRecord, UserProfile } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface NewBeneficiaryModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSubmit: (record: BeneficiaryRecord) => void;
}

export const NewBeneficiaryModal: React.FC<NewBeneficiaryModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSubmit,
}) => {
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [tradeVendorName, setTradeVendorName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [bankName, setBankName] = useState('');
  const [purpose, setPurpose] = useState('');
  const [cancelledChequeUrl, setCancelledChequeUrl] = useState('');
  const [remark, setRemark] = useState('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!beneficiaryName.trim()) {
      setError('Legal Bank Account Holder Title is required');
      return;
    }

    if (!accountNo.trim()) {
      setError('Bank Account Number is required');
      return;
    }

    if (!ifscCode.trim()) {
      setError('Bank IFSC Code is required');
      return;
    }

    if (!cancelledChequeUrl.trim()) {
      setError('Cancelled Cheque or Bank Passbook Proof URL is required for registration');
      return;
    }

    const newRecord = storageAdapter.addBeneficiaryRecord({
      beneficiaryName: beneficiaryName.trim(),
      tradeVendorName: tradeVendorName.trim() || beneficiaryName.trim(),
      accountNo: accountNo.trim(),
      ifscCode: ifscCode.trim().toUpperCase(),
      bankName: bankName.trim() || 'State Bank of India',
      purpose: purpose.trim() || 'General Vendor Procurement',
      cancelledChequeUrl: cancelledChequeUrl.trim(),
      remark: remark.trim() || undefined,
      requestedBy: currentUser.name,
    }, currentUser);

    onSubmit(newRecord);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Register Master Beneficiary</h3>
              <p className="text-xs text-slate-500 font-normal">Add verified vendor bank account</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Legal Bank Account Holder Title <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="Exact title printed on Bank Passbook / Cheque"
              value={beneficiaryName}
              onChange={(e) => setBeneficiaryName(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Commercial Trade Vendor Name
            </label>
            <input
              type="text"
              placeholder="Invoice/Quotation Commercial Name (if different)"
              value={tradeVendorName}
              onChange={(e) => setTradeVendorName(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bank Account Number <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="Full bank account number"
                value={accountNo}
                onChange={(e) => setAccountNo(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bank IFSC Code <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. SBIN0001292"
                value={ifscCode}
                onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold uppercase text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Bank Name
            </label>
            <input
              type="text"
              placeholder="e.g. State Bank of India, HDFC Bank, ICICI Bank"
              value={bankName}
              onChange={(e) => setBankName(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Vendor Goods / Service Category
            </label>
            <input
              type="text"
              placeholder="e.g. Earthmoving Heavy Spares, Cement Supplier, Electricals"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Cancelled Cheque / Passbook Image URL <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="https://..."
              value={cancelledChequeUrl}
              onChange={(e) => setCancelledChequeUrl(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Notes / Remark
            </label>
            <input
              type="text"
              placeholder="Optional remarks"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Register Beneficiary</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
