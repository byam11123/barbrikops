import React, { useState, useEffect } from 'react';
import { X, Landmark, AlertTriangle, Upload, Check, Search, FileText, Building2 } from 'lucide-react';
import { BankPaymentRecord, UserProfile, VendorBeneficiaryMatch } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface NewBankPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSubmit: (record: BankPaymentRecord) => void;
}

export const NewBankPaymentModal: React.FC<NewBankPaymentModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSubmit,
}) => {
  const masterSites = storageAdapter.getMasterSites();

  const [vendorName, setVendorName] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [isMismatch, setIsMismatch] = useState(false);
  const [payeeRelationship, setPayeeRelationship] = useState('');
  const [purpose, setPurpose] = useState('');
  const [site, setSite] = useState(masterSites[0] || 'Siladehi Site');
  const [modeOfPayment, setModeOfPayment] = useState<'ACCOUNT' | 'UPI'>('ACCOUNT');
  const [amount, setAmount] = useState<string>('');
  const [plannedDate, setPlannedDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  });
  const [remark, setRemark] = useState('');
  const [billNoPo, setBillNoPo] = useState('');

  // Bank & Cheque Details
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [cancelledChequeUrl, setCancelledChequeUrl] = useState('');
  const [beneficiaryStatus, setBeneficiaryStatus] = useState<'VERIFIED' | 'NEEDS_ADDITION' | 'NOT_APPLICABLE_UPI'>('VERIFIED');

  // Autocomplete Suggestions State
  const [suggestions, setSuggestions] = useState<VendorBeneficiaryMatch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (vendorName.trim().length >= 2) {
      const matches = storageAdapter.matchVendorBeneficiary(vendorName);
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [vendorName]);

  // Auto detect mismatch when vendorName or beneficiaryName changes
  useEffect(() => {
    if (vendorName.trim() && beneficiaryName.trim()) {
      const mismatch = vendorName.trim().toLowerCase() !== beneficiaryName.trim().toLowerCase();
      setIsMismatch(mismatch);
    } else {
      setIsMismatch(false);
    }
  }, [vendorName, beneficiaryName]);

  if (!isOpen) return null;

  const handleSelectSuggestion = (s: VendorBeneficiaryMatch) => {
    setVendorName(s.vendorName);
    setBeneficiaryName(s.beneficiaryName);
    setIsMismatch(s.isMismatch);
    if (s.bankName) setBankName(s.bankName);
    if (s.accountNoMasked) setAccountNo(s.accountNoMasked);
    if (s.ifscCode) setIfscCode(s.ifscCode);
    if (s.cancelledChequeUrl) setCancelledChequeUrl(s.cancelledChequeUrl);
    setBeneficiaryStatus(s.hasVerifiedBeneficiary ? 'VERIFIED' : 'NEEDS_ADDITION');
    setShowSuggestions(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }

    if (!vendorName.trim()) {
      setError('Trade Vendor Name is required');
      return;
    }

    if (!purpose.trim()) {
      setError('Purpose of payment is required');
      return;
    }

    if (modeOfPayment === 'ACCOUNT') {
      if (!beneficiaryName.trim()) {
        setError('Legal Beneficiary Bank Account Holder Title is required');
        return;
      }
      if (isMismatch && !payeeRelationship.trim()) {
        setError('Please specify payee relationship context for name mismatch');
        return;
      }
    }

    const newPayment = storageAdapter.addBankPaymentRecord({
      vendorName: vendorName.trim(),
      beneficiaryName: modeOfPayment === 'UPI' ? vendorName.trim() : beneficiaryName.trim(),
      isNameMismatch: modeOfPayment === 'ACCOUNT' ? isMismatch : false,
      payeeRelationship: isMismatch ? payeeRelationship.trim() : undefined,
      purposeOfPayment: purpose.trim(),
      requestedBy: currentUser.name,
      requestedByUserId: currentUser.userId,
      site,
      modeOfPayment,
      amountToBePaid: numAmount,
      remark: remark.trim() || undefined,
      plannedDate,
      billNoPo: billNoPo.trim() || undefined,
      beneficiaryMasterStatus: modeOfPayment === 'UPI' ? 'NOT_APPLICABLE_UPI' : beneficiaryStatus,
      bankName: modeOfPayment === 'ACCOUNT' ? (bankName.trim() || 'State Bank of India') : undefined,
      accountNoMasked: modeOfPayment === 'ACCOUNT' ? (accountNo.trim() || '••••••••3352') : undefined,
      ifscCode: modeOfPayment === 'ACCOUNT' ? (ifscCode.trim() || 'SBIN0001292') : undefined,
      cancelledChequeUrl: cancelledChequeUrl.trim() || undefined,
    }, currentUser);

    onSubmit(newPayment);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <div className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
              <Landmark className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">New Bank Payment Request</h3>
              <p className="text-xs text-slate-500 font-normal">Create vendor disbursement requisition</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Payment Mode Selector */}
          <div className="grid grid-cols-2 gap-3 p-1 bg-slate-100 rounded-xl">
            <button
              type="button"
              onClick={() => { setModeOfPayment('ACCOUNT'); setBeneficiaryStatus('VERIFIED'); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                modeOfPayment === 'ACCOUNT'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Bank Account Transfer</span>
            </button>
            <button
              type="button"
              onClick={() => { setModeOfPayment('UPI'); setBeneficiaryStatus('NOT_APPLICABLE_UPI'); }}
              className={`py-2 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer ${
                modeOfPayment === 'UPI'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Landmark className="w-4 h-4" />
              <span>UPI / Instant Transfer</span>
            </button>
          </div>

          {/* Vendor Name & Autocomplete */}
          <div className="relative">
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Trade Vendor / Commercial Entity Name <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type="text"
                required
                placeholder="e.g. MAHAVIR GAS CHULHA, KANHAIYA HARDWARE"
                value={vendorName}
                onChange={(e) => setVendorName(e.target.value)}
                onFocus={() => setShowSuggestions(suggestions.length > 0)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8"
              />
              <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-3" />
            </div>

            {/* Suggestions Dropdown */}
            {showSuggestions && (
              <div className="absolute left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-48 overflow-y-auto divide-y divide-slate-100">
                <div className="p-2 bg-slate-50 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Matched Saved Master Vendors
                </div>
                {suggestions.map((s, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSelectSuggestion(s)}
                    className="w-full text-left p-2.5 hover:bg-indigo-50 transition-colors flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div>
                      <div className="text-xs font-bold text-slate-900">{s.vendorName}</div>
                      <div className="text-[11px] text-slate-500">
                        Beneficiary: <span className="font-semibold text-slate-700">{s.beneficiaryName}</span> ({s.bankName || 'Bank Master'})
                      </div>
                    </div>
                    {s.hasVerifiedBeneficiary ? (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full">
                        Verified Bank
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                        Unverified
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Account Title & Mismatch Handling */}
          {modeOfPayment === 'ACCOUNT' && (
            <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Legal Bank Account Holder Name <span className="text-rose-500">*</span>
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

              {/* Name Mismatch Warning Callout */}
              {isMismatch && (
                <div className="p-3 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Trade Name vs Bank Account Holder Mismatch Detected</span>
                  </div>
                  <p className="text-[11px] text-amber-800 leading-relaxed">
                    The Trade Vendor Name (<span className="font-semibold">{vendorName}</span>) differs from Bank Holder Title (<span className="font-semibold">{beneficiaryName}</span>). Please specify relationship context below.
                  </p>
                  <div>
                    <label className="block text-[11px] font-bold text-amber-900 mb-1">
                      Payee Relationship Context *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Sole Proprietor Personal Account, Sister Concern Entity, Director Account"
                      value={payeeRelationship}
                      onChange={(e) => setPayeeRelationship(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-amber-300 rounded-lg font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                </div>
              )}

              {/* Bank Details */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Bank Name</label>
                  <input
                    type="text"
                    placeholder="e.g. State Bank of India"
                    value={bankName}
                    onChange={(e) => setBankName(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">Account No</label>
                  <input
                    type="text"
                    placeholder="Full account number"
                    value={accountNo}
                    onChange={(e) => setAccountNo(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-semibold text-slate-900"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold text-slate-600 mb-1">IFSC Code</label>
                  <input
                    type="text"
                    placeholder="e.g. SBIN0001292"
                    value={ifscCode}
                    onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 uppercase"
                  />
                </div>
              </div>

              {/* Beneficiary Master Verification Toggle */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700">Beneficiary Bank Verification Status:</span>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setBeneficiaryStatus('VERIFIED')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                      beneficiaryStatus === 'VERIFIED'
                        ? 'bg-emerald-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Verified Active Account
                  </button>
                  <button
                    type="button"
                    onClick={() => setBeneficiaryStatus('NEEDS_ADDITION')}
                    className={`px-2.5 py-1 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                      beneficiaryStatus === 'NEEDS_ADDITION'
                        ? 'bg-amber-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    New Account (Auto-Queue Entry)
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Amount & Site Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Net Payment Amount (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <span className="absolute left-3 top-2.5 font-bold text-slate-400">₹</span>
                <input
                  type="number"
                  step="any"
                  required
                  placeholder="0.00"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="w-full text-xs p-2.5 pl-7 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Project Site / Office Location <span className="text-rose-500">*</span>
              </label>
              <select
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                {masterSites.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Purpose & Bill Reference */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Purpose / Business Particulars <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Oxygen Cylinder Refill, M20 Anchor Bolts"
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Bill No / Purchase Order Reference
              </label>
              <input
                type="text"
                placeholder="e.g. INV-MGC-9812 or PO-BPL-2026-88"
                value={billNoPo}
                onChange={(e) => setBillNoPo(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>

          {/* Cancelled Cheque / Document URL Attachment */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Cancelled Cheque / Invoice Document Attachment URL
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Paste image/PDF URL or Base64"
                value={cancelledChequeUrl}
                onChange={(e) => setCancelledChequeUrl(e.target.value)}
                className="flex-1 text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">Provide cheque image URL to verify account holder name</p>
          </div>

          {/* Operational Remarks */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Operational Remark / Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Rate approved via CS-IND-466, urgent dispatch needed"
              value={remark}
              onChange={(e) => setRemark(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Form Actions */}
          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Submit Payment Request</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
