import React, { useState, useEffect, useRef } from 'react';
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
  FileCheck2,
  ExternalLink
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
  initialVendorName?: string;
  initialPoNumber?: string;
  initialPoDocumentUrl?: string;
  initialAmount?: number;
}

export const NewBankPaymentModal: React.FC<NewBankPaymentModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSubmit,
  initialVendorName = '',
  initialPoNumber = '',
  initialPoDocumentUrl = '',
  initialAmount,
}) => {
  const isAuthorized = isUserAuthorizedForVendorBanking(currentUser);
  const masterSites = storageAdapter.getMasterSites();

  const isAccounts =
    (currentUser.departmentKeys || []).includes('ACCOUNTS') ||
    (currentUser.departmentName || '').toUpperCase().includes('ACCOUNTS') ||
    (currentUser.role || '').toUpperCase().includes('ACCOUNTS');

  // File Input Refs
  const chequeFileInputRef = useRef<HTMLInputElement>(null);
  const poFileInputRef = useRef<HTMLInputElement>(null);

  const [vendorName, setVendorName] = useState(initialVendorName);
  const [selectedVendor, setSelectedVendor] = useState<VendorProfileRecord | null>(null);
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [isMismatch, setIsMismatch] = useState(false);
  const [payeeRelationship, setPayeeRelationship] = useState('');
  const [purpose, setPurpose] = useState('');
  const [site, setSite] = useState(masterSites[0] || 'Siladehi Site');
  const [modeOfPayment, setModeOfPayment] = useState<'ACCOUNT' | 'UPI'>('ACCOUNT');
  const [amount, setAmount] = useState<string>(initialAmount ? String(initialAmount) : '');
  const [plannedDate, setPlannedDate] = useState<string>(() => {
    const today = new Date();
    return `${today.getDate().toString().padStart(2, '0')}/${(today.getMonth() + 1).toString().padStart(2, '0')}/${today.getFullYear()}`;
  });
  const [remark, setRemark] = useState('');
  const [billNoPo, setBillNoPo] = useState(initialPoNumber);
  const [poUpload, setPoUpload] = useState(initialPoDocumentUrl);

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

  // Sync state when modal opens or initial props change
  useEffect(() => {
    if (isOpen) {
      const vName = initialVendorName || '';
      setVendorName(vName);
      setBillNoPo(initialPoNumber || '');
      setPoUpload(initialPoDocumentUrl || '');
      setAmount(initialAmount ? String(initialAmount) : '');

      if (vName.trim().length >= 2) {
        const vMatches = storageAdapter.searchVendorsWithBanking(vName);
        if (vMatches.length > 0) {
          const exactMatch = vMatches.find(
            (m) =>
              m.vendor.tradeName.toLowerCase() === vName.toLowerCase() ||
              m.vendor.legalName?.toLowerCase() === vName.toLowerCase()
          ) || vMatches[0];
          handleSelectVendorProfileMatch(exactMatch);
        } else {
          const lMatches = storageAdapter.matchVendorBeneficiary(vName);
          if (lMatches.length > 0) {
            handleSelectLegacyMatch(lMatches[0]);
          }
        }
      }
    }
  }, [isOpen, initialVendorName, initialPoNumber, initialPoDocumentUrl, initialAmount]);

  const handleChequeFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setCancelledChequeUrl(file.name || fileUrl);
    }
  };

  const handlePoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileUrl = URL.createObjectURL(file);
      setPoUpload(file.name || fileUrl);
    }
  };

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

    if (!selectedVendor) {
      setError('Vendor not found. Please ask Accounts to add the Vendor to the Master.');
      return;
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      setError('Please enter a valid amount greater than ₹0');
      return;
    }

    if (!purpose.trim()) {
      setError('Purpose of payment is required');
      return;
    }

    const newPayment = storageAdapter.addBankPaymentRecord({
      vendorId: selectedVendor.id,
      vendorName: selectedVendor.tradeName,
      beneficiaryName: modeOfPayment === 'UPI' 
        ? selectedVendor.tradeName 
        : (beneficiaryName.trim() || selectedVendor.legalName || selectedVendor.tradeName),
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
      poUpload: poUpload.trim() || undefined,
      beneficiaryMasterStatus: modeOfPayment === 'UPI' ? 'NOT_APPLICABLE_UPI' : beneficiaryStatus,
      bankName: modeOfPayment === 'ACCOUNT' && bankName.trim() ? bankName.trim() : undefined,
      accountNoMasked: modeOfPayment === 'ACCOUNT' && accountNo.trim() ? accountNo.trim() : undefined,
      ifscCode: modeOfPayment === 'ACCOUNT' && ifscCode.trim() ? ifscCode.trim() : undefined,
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
                  Vendor Name <span className="text-rose-500">*</span>
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
                  onFocus={() => setShowSuggestions(true)}
                  className={`w-full text-xs p-2.5 bg-white border rounded-xl font-semibold text-slate-900 focus:outline-none focus:ring-2 pr-8 ${
                    selectedVendor 
                      ? 'border-emerald-400 bg-emerald-50/20 focus:ring-emerald-500' 
                      : vendorName.trim() && !selectedVendor 
                      ? 'border-rose-400 focus:ring-rose-500' 
                      : 'border-slate-300 focus:ring-indigo-500'
                  }`}
                />
                <Search className="w-4 h-4 text-slate-400 absolute right-2.5 top-3" />
              </div>

              {selectedVendor && (
                <div className="mt-1.5 flex items-center justify-between px-3 py-1.5 bg-emerald-50 border border-emerald-200 rounded-lg text-xs">
                  <span className="font-bold text-emerald-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span>Selected Vendor: {selectedVendor.tradeName} ({selectedVendor.vendorCode})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedVendor(null);
                      setVendorName('');
                      setShowSuggestions(true);
                    }}
                    className="text-[11px] font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                  >
                    Change Vendor
                  </button>
                </div>
              )}

              {/* Suggestions Dropdown with Auto-Detection Indicators */}
              {showSuggestions && (
                <div className="absolute left-0 right-0 z-20 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto divide-y divide-slate-100">
                  <div className="p-2 bg-slate-50 flex items-center justify-between text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    <span>Vendor Master Records</span>
                  </div>

                  {vendorMatches.length === 0 && legacyMatches.length === 0 ? (
                    <div className="p-3 text-center text-xs text-rose-700 bg-rose-50/80 font-bold space-y-1">
                      <div className="flex items-center justify-center gap-1.5 text-rose-800">
                        <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Vendor not found. Please ask Accounts to add the Vendor to the Master.</span>
                      </div>
                      <p className="text-[11px] font-normal text-rose-600">
                        Unlisted vendor names cannot be submitted. Only verified master vendors are allowed.
                      </p>
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

            {/* Account Title & Bank Coordinates Section */}
            {modeOfPayment === 'ACCOUNT' && (
              !isAccounts ? (
                /* PURCHASER VIEW (Shyam) */
                selectedVendor && selectedVendor.bankAccounts && selectedVendor.bankAccounts.length > 0 ? (
                  /* Purchaser: Vendor HAS bank details -> Show readOnly fields + note */
                  <div className="space-y-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                    <div className="flex items-center gap-1.5 pb-2 border-b border-slate-200">
                      <Lock className="w-3.5 h-3.5 text-slate-500" />
                      <span className="text-xs font-bold text-slate-800">
                        Vendor Bank Details (Verified Master)
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        Beneficiary Name
                      </label>
                      <input
                        type="text"
                        readOnly
                        value={beneficiaryName}
                        className="w-full text-xs p-2.5 rounded-xl font-semibold border bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed"
                      />
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Bank Name</label>
                        <input
                          type="text"
                          readOnly
                          value={bankName}
                          className="w-full text-xs p-2 rounded-lg font-medium border bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">Account No</label>
                        <input
                          type="text"
                          readOnly
                          value={accountNo}
                          className="w-full text-xs p-2 rounded-lg font-mono font-semibold border bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold text-slate-600 mb-1">IFSC Code</label>
                        <input
                          type="text"
                          readOnly
                          value={ifscCode}
                          className="w-full text-xs p-2 rounded-lg font-mono font-bold uppercase border bg-slate-100 text-slate-700 border-slate-200 cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="p-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-700 text-xs flex items-center gap-2 font-medium">
                      <AlertCircle className="w-4 h-4 shrink-0 text-slate-500" />
                      <span>If the vendor requests a change of account, please ask Accounts to update the Beneficiary Master.</span>
                    </div>
                  </div>
                ) : (
                  /* Purchaser: Vendor DOES NOT have bank details -> Hide fields + show warning */
                  <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl space-y-1.5">
                    <div className="flex items-center gap-2 text-amber-900 font-bold text-xs">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Missing Bank Details</span>
                    </div>
                    <p className="text-xs text-amber-800 leading-relaxed font-medium">
                      Missing bank details. This request will be routed to Accounts for verification.
                    </p>
                  </div>
                )
              ) : (
                /* ACCOUNTS VIEW (Priyanka) */
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
                            Bank Account Details
                          </span>
                        </>
                      )}
                    </div>

                    {isBankDetailsLocked && (
                      <button
                        type="button"
                        onClick={handleUnlockBankDetails}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                      >
                        Unlock to Edit (Accounts Authorized)
                      </button>
                    )}
                  </div>

                  {/* Name of Beneficiary */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      Name of Beneficiary <span className="text-rose-500">*</span>
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

                  {/* Cancelled Cheque / Beneficiary Verification View */}
                  <div className="space-y-2">
                    <div className="p-3 bg-white border border-slate-200 rounded-lg space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="block text-[11px] font-bold text-slate-700">
                          Cancelled Cheque Document Proof <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-amber-700 font-semibold">
                          Upload cancelled cheque for beneficiary verification
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <input
                          type="file"
                          ref={chequeFileInputRef}
                          accept="image/*,application/pdf"
                          className="hidden"
                          onChange={handleChequeFileUpload}
                        />
                        <input
                          type="text"
                          placeholder="Upload cancelled cheque or paste URL..."
                          value={cancelledChequeUrl}
                          onChange={(e) => setCancelledChequeUrl(e.target.value)}
                          className="flex-1 text-xs p-2 bg-slate-50 border border-slate-300 rounded-lg font-mono text-slate-800"
                        />
                        <button
                          type="button"
                          onClick={() => chequeFileInputRef.current?.click()}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                        >
                          <Upload className="w-3.5 h-3.5" />
                          <span>Upload Cheque</span>
                        </button>
                      </div>
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
              )
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
                  Site <span className="text-rose-500">*</span>
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

            {/* Purpose */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Purpose <span className="text-rose-500">*</span>
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

            {/* Bill / PO Reference & Remark */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">Remark</label>
                <input
                  type="text"
                  placeholder="e.g. Urgent advance required for dispatch release"
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>

            {/* ERP Purchase Order (PO) PDF Document Attachment */}
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <label className="block text-xs font-bold text-slate-800">
                  ERP Purchase Order (PO) Copy / PDF
                </label>
                <span className="text-[10px] text-slate-500 font-medium">
                  Auto-links to Stage 4 & PO_TO_PAYMENT workflow
                </span>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="file"
                  ref={poFileInputRef}
                  accept="application/pdf,image/*"
                  className="hidden"
                  onChange={handlePoFileUpload}
                />
                <input
                  type="text"
                  placeholder="Upload PO PDF file or paste document URL..."
                  value={poUpload}
                  onChange={(e) => setPoUpload(e.target.value)}
                  className="flex-1 text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  onClick={() => poFileInputRef.current?.click()}
                  className="px-3 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 transition-colors cursor-pointer"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Attach ERP PO</span>
                </button>
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
                <span>
                  {!isAccounts
                    ? 'Submit Payment Request to Accounts'
                    : 'Verify Beneficiary & Send to Director'}
                </span>
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
