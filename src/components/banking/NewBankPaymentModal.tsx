import React, { useState, useEffect } from 'react';
import { 
  X, 
  Landmark, 
  AlertTriangle, 
  Upload, 
  Check, 
  Search, 
  FileText, 
  Building2, 
  Lock, 
  ShieldAlert, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  FileCheck2 
} from 'lucide-react';
import { 
  BankPaymentRecord, 
  UserProfile, 
  VendorBeneficiaryMatch, 
  VendorProfileRecord, 
  VendorSearchWithBankingResult, 
  isUserAuthorizedForVendorBanking 
} from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { NewVendorModal } from '../vendor/NewVendorModal';

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
  const isAuthorized = isUserAuthorizedForVendorBanking(currentUser);
  const masterSites = storageAdapter.getMasterSites();

  const [vendorName, setVendorName] = useState('');
  const [selectedVendor, setSelectedVendor] = useState<VendorProfileRecord | null>(null);
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
  
  // Bank details locked from ad-hoc editing when populated from verified vendor master
  const [isBankDetailsLocked, setIsBankDetailsLocked] = useState(false);
  const [isAccountMissing, setIsAccountMissing] = useState(false);
  const [chequeMissingWarning, setChequeMissingWarning] = useState(false);

  // Autocomplete Suggestions State
  const [vendorMatches, setVendorMatches] = useState<VendorSearchWithBankingResult[]>([]);
  const [legacyMatches, setLegacyMatches] = useState<VendorBeneficiaryMatch[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Modal to register vendor if not found
  const [isRegisterVendorModalOpen, setIsRegisterVendorModalOpen] = useState(false);

  // Dynamic Search & Auto-Detection
  useEffect(() => {
    if (vendorName.trim().length >= 2) {
      const vMatches = storageAdapter.searchVendorsWithBanking(vendorName);
      setVendorMatches(vMatches);

      const lMatches = storageAdapter.matchVendorBeneficiary(vendorName);
      setLegacyMatches(lMatches);

      setShowSuggestions(true);
    } else {
      setVendorMatches([]);
      setLegacyMatches([]);
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

  const handleSelectVendorProfileMatch = (match: VendorSearchWithBankingResult) => {
    const { vendor, hasBankAccounts, primaryAccount, hasVerifiedBeneficiary, hasCancelledCheque, isNameMismatch: mismatch } = match;

    setSelectedVendor(vendor);
    setVendorName(vendor.tradeName);

    if (hasBankAccounts && primaryAccount) {
      setBeneficiaryName(primaryAccount.beneficiaryName);
      setBankName(primaryAccount.bankName);
      setAccountNo(primaryAccount.accountNoMasked || primaryAccount.accountNo);
      setIfscCode(primaryAccount.ifscCode);
      setCancelledChequeUrl(primaryAccount.cancelledChequeUrl || '');
      setIsMismatch(mismatch);
      setBeneficiaryStatus(hasVerifiedBeneficiary ? 'VERIFIED' : 'NEEDS_ADDITION');
      setIsBankDetailsLocked(true); // LOCK coordinates
      setIsAccountMissing(false);
      setChequeMissingWarning(!hasCancelledCheque);
    } else {
      // Vendor has NO bank accounts
      setBeneficiaryName(vendor.legalName || vendor.tradeName);
      setBankName('');
      setAccountNo('');
      setIfscCode('');
      setCancelledChequeUrl('');
      setBeneficiaryStatus('NEEDS_ADDITION');
      setIsBankDetailsLocked(false);
      setIsAccountMissing(true);
      setChequeMissingWarning(true);
    }

    setShowSuggestions(false);
  };

  const handleSelectLegacyMatch = (s: VendorBeneficiaryMatch) => {
    setVendorName(s.vendorName);
    setBeneficiaryName(s.beneficiaryName);
    setIsMismatch(s.isMismatch);
    if (s.bankName) setBankName(s.bankName);
    if (s.accountNoMasked) setAccountNo(s.accountNoMasked);
    if (s.ifscCode) setIfscCode(s.ifscCode);
    if (s.cancelledChequeUrl) setCancelledChequeUrl(s.cancelledChequeUrl);
    setBeneficiaryStatus(s.hasVerifiedBeneficiary ? 'VERIFIED' : 'NEEDS_ADDITION');
    setIsBankDetailsLocked(true);
    setIsAccountMissing(!s.bankName);
    setChequeMissingWarning(!s.cancelledChequeUrl);
    setShowSuggestions(false);
  };

  const handleUnlockBankDetails = () => {
    if (!isAuthorized) {
      setError('Unauthorized: Bank account details are locked. Only Accounts, Director, Admin, or Super Admin can modify banking coordinates.');
      return;
    }
    setIsBankDetailsLocked(false);
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
      if (isAccountMissing && !accountNo.trim()) {
        setError('Bank Account Number is required for Bank Transfer mode');
        return;
      }
      if (isAccountMissing && !ifscCode.trim()) {
        setError('Bank IFSC Code is required for Bank Transfer mode');
        return;
      }
      if (beneficiaryStatus === 'NEEDS_ADDITION' && !cancelledChequeUrl.trim()) {
        setError('Mandatory: Cancelled Cheque proof is strictly required for new beneficiary additions before submission.');
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
    <>
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
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
            >
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
                onClick={() => {
                  setModeOfPayment('ACCOUNT');
                  if (!isAccountMissing) setBeneficiaryStatus('VERIFIED');
                }}
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
                onClick={() => {
                  setModeOfPayment('UPI');
                  setBeneficiaryStatus('NOT_APPLICABLE_UPI');
                }}
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

            {/* Vendor Name & Autocomplete Search */}
            <div className="relative">
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-bold text-slate-700">
                  Trade Vendor / Commercial Entity Name <span className="text-rose-500">*</span>
                </label>
                {selectedVendor && (
                  <span className="text-[11px] font-mono text-indigo-600 font-bold">
                    Code: {selectedVendor.vendorCode}
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type="text"
                  required
                  placeholder="Search vendor (e.g. ULTRA TECH, KANHAIYA, ASHARAM, PATEL)"
                  value={vendorName}
                  onChange={(e) => {
                    setVendorName(e.target.value);
                    setSelectedVendor(null);
                    setIsBankDetailsLocked(false);
                    setIsAccountMissing(false);
                    setChequeMissingWarning(false);
                  }}
                  onFocus={() => setShowSuggestions(vendorMatches.length > 0 || legacyMatches.length > 0)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 pr-8"
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-3" />
              </div>

              {/* Suggestions Dropdown with Auto-Detection Indicators */}
              {showSuggestions && (
                <div className="absolute left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  <div className="p-2 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Vendor Master Matches</span>
                    {isAuthorized && (
                      <button
                        type="button"
                        onClick={() => {
                          setShowSuggestions(false);
                          setIsRegisterVendorModalOpen(true);
                        }}
                        className="text-indigo-600 hover:text-indigo-800 lowercase font-semibold flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>add new vendor</span>
                      </button>
                    )}
                  </div>

                  {vendorMatches.length === 0 && legacyMatches.length === 0 ? (
                    <div className="p-3 text-center text-xs text-slate-500">
                      <div>No vendor found matching "{vendorName}"</div>
                      {isAuthorized ? (
                        <button
                          type="button"
                          onClick={() => {
                            setShowSuggestions(false);
                            setIsRegisterVendorModalOpen(true);
                          }}
                          className="mt-1.5 px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg text-xs font-bold inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Register "{vendorName}" to Vendor Master</span>
                        </button>
                      ) : (
                        <p className="text-[11px] text-amber-700 mt-1 font-medium">
                          Note: Only authorized roles (Accounts, Director, Admin, Super Admin) can register new vendors as per PO.
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      {/* Rich Vendor Profile Matches */}
                      {vendorMatches.map((m) => (
                        <button
                          key={m.vendor.id}
                          type="button"
                          onClick={() => handleSelectVendorProfileMatch(m)}
                          className="w-full text-left p-2.5 hover:bg-indigo-50/60 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="text-xs font-bold text-slate-900 truncate">
                                {m.vendor.tradeName}
                              </span>
                              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                                {m.vendor.vendorCode}
                              </span>
                            </div>
                            <div className="text-[11px] text-slate-500 truncate mt-0.5">
                              {m.hasBankAccounts && m.primaryAccount ? (
                                <span>
                                  A/C: <span className="font-semibold text-slate-700">{m.primaryAccount.bankName}</span> ({m.primaryAccount.accountNoMasked}) · Holder: {m.primaryAccount.beneficiaryName}
                                </span>
                              ) : (
                                <span className="text-amber-700 font-semibold flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3 text-amber-600 inline" />
                                  No Bank Account Registered
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="shrink-0 text-right">
                            {m.hasBankAccounts ? (
                              m.hasVerifiedBeneficiary ? (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full inline-flex items-center gap-0.5">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Verified
                                </span>
                              ) : (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full inline-flex items-center gap-0.5">
                                  <AlertTriangle className="w-3 h-3 text-amber-600" />
                                  Unverified
                                </span>
                              )
                            ) : (
                              <span className="text-[10px] font-bold px-2 py-0.5 bg-rose-100 text-rose-800 rounded-full inline-flex items-center gap-0.5">
                                Missing Bank
                              </span>
                            )}
                          </div>
                        </button>
                      ))}

                      {/* Legacy Matched Vendors (if any) */}
                      {legacyMatches.map((s, idx) => (
                        <button
                          key={`leg-${idx}`}
                          type="button"
                          onClick={() => handleSelectLegacyMatch(s)}
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
                              Verified
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-800 rounded-full">
                              Unverified
                            </span>
                          )}
                        </button>
                      ))}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Auto-Detection Warning: Missing Bank Account */}
            {modeOfPayment === 'ACCOUNT' && isAccountMissing && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Missing Bank Details Warning</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  The vendor <span className="font-bold">{vendorName}</span> does not have a verified bank account on file. For Beneficiary Master entry, a <span className="font-bold">verified cancelled cheque</span> is mandatory.
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <span className="text-[11px] text-amber-900 font-semibold">
                    You can queue a Beneficiary Addition request below with mandatory cancelled cheque upload:
                  </span>
                </div>
              </div>
            )}

            {/* Auto-Detection Warning: Missing Cancelled Cheque */}
            {modeOfPayment === 'ACCOUNT' && !isAccountMissing && chequeMissingWarning && (
              <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-1.5">
                <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>Mandatory Cancelled Cheque Missing</span>
                </div>
                <p className="text-[11px] text-amber-800 leading-relaxed">
                  Although bank details are recorded, a verified cancelled cheque document is not uploaded. Financial compliance requires a cancelled cheque before disbursement.
                </p>
              </div>
            )}

            {/* Account Title & Bank Coordinates Section */}
            {modeOfPayment === 'ACCOUNT' && (
              <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                {/* Governance Lock Indicator */}
                <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                  <div className="flex items-center gap-1.5">
                    {isBankDetailsLocked ? (
                      <>
                        <Lock className="w-3.5 h-3.5 text-emerald-700" />
                        <span className="text-xs font-bold text-slate-800">
                          Bank Coordinates Locked (Master Verified)
                        </span>
                      </>
                    ) : (
                      <>
                        <Building2 className="w-3.5 h-3.5 text-indigo-700" />
                        <span className="text-xs font-bold text-slate-800">
                          Banking Requisition Coordinates
                        </span>
                      </>
                    )}
                  </div>

                  {isBankDetailsLocked && isAuthorized ? (
                    <button
                      type="button"
                      onClick={handleUnlockBankDetails}
                      className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Unlock to Edit (Authorized)
                    </button>
                  ) : isBankDetailsLocked ? (
                    <span className="text-[10px] text-slate-500 italic">
                      Protected from ad-hoc modification
                    </span>
                  ) : null}
                </div>

                {/* Legal Beneficiary Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Legal Bank Account Holder Title <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    readOnly={isBankDetailsLocked}
                    placeholder="Exact title printed on Bank Passbook / Cheque"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    className={`w-full text-xs p-2.5 rounded-xl font-semibold border ${
                      isBankDetailsLocked
                        ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                        : 'bg-white text-slate-900 border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                    }`}
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

                {/* Bank Details Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Bank Name</label>
                    <input
                      type="text"
                      readOnly={isBankDetailsLocked}
                      placeholder="e.g. State Bank of India"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className={`w-full text-xs p-2 rounded-lg font-medium border ${
                        isBankDetailsLocked
                          ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-900 border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">Account No</label>
                    <input
                      type="text"
                      readOnly={isBankDetailsLocked}
                      placeholder="Full account number"
                      value={accountNo}
                      onChange={(e) => setAccountNo(e.target.value)}
                      className={`w-full text-xs p-2 rounded-lg font-mono font-semibold border ${
                        isBankDetailsLocked
                          ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-900 border-slate-300'
                      }`}
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-600 mb-1">IFSC Code</label>
                    <input
                      type="text"
                      readOnly={isBankDetailsLocked}
                      placeholder="e.g. SBIN0001292"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      className={`w-full text-xs p-2 rounded-lg font-mono font-bold uppercase border ${
                        isBankDetailsLocked
                          ? 'bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed'
                          : 'bg-white text-slate-900 border-slate-300'
                      }`}
                    />
                  </div>
                </div>

                {/* Cancelled Cheque Upload for Beneficiary Entry */}
                <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Cancelled Cheque Document Proof {beneficiaryStatus === 'NEEDS_ADDITION' && <span className="text-rose-500">*</span>}
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold">
                      Required for Beneficiary Master Sanction
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required={beneficiaryStatus === 'NEEDS_ADDITION'}
                      placeholder="Document proof URL or image reference"
                      value={cancelledChequeUrl}
                      onChange={(e) => setCancelledChequeUrl(e.target.value)}
                      className="flex-1 text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
                    />
                    <button
                      type="button"
                      onClick={() => setCancelledChequeUrl('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600')}
                      className="px-2.5 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg flex items-center gap-1 cursor-pointer"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>Sample</span>
                    </button>
                  </div>
                </div>

                {/* Beneficiary Master Verification Toggle */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200">
                  <span className="text-xs font-bold text-slate-700">Beneficiary Master Status:</span>
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
                      Queue Beneficiary Addition
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
                  <span className="absolute left-3 top-2.5 text-xs font-bold text-slate-500">₹</span>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="0.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full text-xs pl-7 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Project Site Location <span className="text-rose-500">*</span>
                </label>
                <select
                  value={site}
                  onChange={(e) => setSite(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {masterSites.map((s, idx) => (
                    <option key={idx} value={s}>
                      {s}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Purpose & Bill / PO Reference */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Purpose / Particulars <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 500 Bags OPC Cement for Siladehi Pier Cap"
                  value={purpose}
                  onChange={(e) => setPurpose(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bill No / PO Reference (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. PO-BPL-2026-081"
                  value={billNoPo}
                  onChange={(e) => setBillNoPo(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* Planned Execution Date & Remark */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Planned Execution Date (DD/MM/YYYY) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="DD/MM/YYYY"
                  value={plannedDate}
                  onChange={(e) => setPlannedDate(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Requester Operational Remark</label>
                <input
                  type="text"
                  placeholder="e.g. Urgent advance required for dispatch release"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
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
                className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                <span>Submit Payment Requisition</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Modal to register vendor if not found */}
      <NewVendorModal
        isOpen={isRegisterVendorModalOpen}
        onClose={() => setIsRegisterVendorModalOpen(false)}
        currentUser={currentUser}
        onSuccess={(newV) => {
          setSelectedVendor(newV);
          setVendorName(newV.tradeName);
          if (newV.bankAccounts.length > 0) {
            const primary = newV.bankAccounts[0];
            setBeneficiaryName(primary.beneficiaryName);
            setBankName(primary.bankName);
            setAccountNo(primary.accountNoMasked);
            setIfscCode(primary.ifscCode);
            setCancelledChequeUrl(primary.cancelledChequeUrl || '');
            setIsBankDetailsLocked(true);
            setIsAccountMissing(false);
          } else {
            setIsAccountMissing(true);
            setIsBankDetailsLocked(false);
          }
        }}
      />
    </>
  );
};
