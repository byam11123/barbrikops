import React, { useState } from 'react';
import { X, Building2, Landmark, AlertTriangle, Check, ShieldAlert, Upload } from 'lucide-react';
import { VendorProfileRecord, UserProfile, isUserAuthorizedForVendorBanking } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface NewVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onSuccess: (newVendor: VendorProfileRecord) => void;
}

export const NewVendorModal: React.FC<NewVendorModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onSuccess
}) => {
  const isAuthorized = isUserAuthorizedForVendorBanking(currentUser);

  // Vendor Basic Details
  const [tradeName, setTradeName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [category, setCategory] = useState('Cement & Aggregates');
  const [gstin, setGstin] = useState('');
  const [pan, setPan] = useState('');
  const [contactPerson, setContactPerson] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Raipur');
  const [state, setState] = useState('Chhattisgarh');
  const [notes, setNotes] = useState('');

  // Initial Bank Account Details (Optional at creation, but encouraged)
  const [includeBankAccount, setIncludeBankAccount] = useState(false);
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [bankName, setBankName] = useState('');
  const [accountNo, setAccountNo] = useState('');
  const [ifscCode, setIfscCode] = useState('');
  const [accountType, setAccountType] = useState<'CURRENT' | 'SAVINGS' | 'CASH_CREDIT'>('CURRENT');
  const [cancelledChequeUrl, setCancelledChequeUrl] = useState('https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600');

  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!isAuthorized) {
      setError('Access Denied: Only Accounts, Director, Admin, or Super Admin can register new vendors.');
      return;
    }

    if (!tradeName.trim()) {
      setError('Trade Vendor Name is required.');
      return;
    }

    const cleanGstin = gstin.trim().toUpperCase();
    if (cleanGstin && cleanGstin.length !== 15) {
      setError('If provided, GSTIN must be 15 alphanumeric characters (e.g. 22AAAAA0000A1Z5).');
      return;
    }

    const cleanPan = pan.trim().toUpperCase();
    if (cleanPan && cleanPan.length !== 10) {
      setError('If provided, PAN must be 10 characters (e.g. AAAAA0000A).');
      return;
    }

    const initialBankAccounts = [];
    if (includeBankAccount) {
      if (!beneficiaryName.trim() || !bankName.trim() || !accountNo.trim() || !ifscCode.trim()) {
        setError('Please fill all mandatory bank account fields or uncheck Add Initial Bank Account.');
        return;
      }
      if (ifscCode.trim().length !== 11) {
        setError('IFSC code must be exactly 11 characters (e.g. SBIN0001292).');
        return;
      }
      if (!cancelledChequeUrl.trim()) {
        setError('Cancelled cheque proof is required for bank account registration.');
        return;
      }

      initialBankAccounts.push({
        id: `acc-${Date.now()}`,
        beneficiaryName: beneficiaryName.trim(),
        tradeVendorName: tradeName.trim(),
        bankName: bankName.trim(),
        accountNo: accountNo.trim(),
        accountNoMasked: `••••••••${accountNo.trim().slice(-4)}`,
        ifscCode: ifscCode.trim().toUpperCase(),
        accountType,
        isPrimary: true,
        verificationStatus: 'VERIFIED' as const,
        verifiedBy: currentUser.name,
        verifiedAt: new Date().toLocaleDateString('en-GB'),
        cancelledChequeUrl: cancelledChequeUrl.trim(),
        notes: 'Initial account added during vendor master registration'
      });
    }

    try {
      const newVendor = storageAdapter.addVendorProfile(
        {
          vendorCode: '',
          tradeName: tradeName.trim(),
          legalName: legalName.trim() || undefined,
          category,
          gstin: cleanGstin || undefined,
          pan: cleanPan || (cleanGstin ? cleanGstin.slice(2, 12) : undefined),
          contactPerson: contactPerson.trim() || undefined,
          phone: phone.trim() || undefined,
          email: email.trim() || undefined,
          address: address.trim() || undefined,
          city: city.trim() || undefined,
          state: state.trim() || undefined,
          status: 'ACTIVE',
          bankAccounts: initialBankAccounts,
          notes: notes.trim() || undefined,
          createdBy: currentUser.name
        },
        currentUser
      );

      onSuccess(newVendor);
      onClose();
    } catch (err: any) {
      setError(err?.message || 'Failed to register vendor.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-100 text-indigo-800 rounded-xl">
              <Building2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Register Master Vendor</h3>
              <p className="text-xs text-slate-500 font-normal">Add commercial entity & authorized banking identity</p>
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
          {!isAuthorized && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
              <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
              <span>Restricted Governance: Only Accounts, Director, Admin, or Super Admin are authorized to add master vendors.</span>
            </div>
          )}

          {error && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{error}</span>
            </div>
          )}

          {/* Trade Name & Legal Name */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Trade Vendor Name <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                disabled={!isAuthorized}
                placeholder="e.g. M/S ULTRA TECH CEMENT"
                value={tradeName}
                onChange={(e) => {
                  setTradeName(e.target.value);
                  if (!beneficiaryName) setBeneficiaryName(e.target.value);
                }}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Legal Entity Registered Title
              </label>
              <input
                type="text"
                disabled={!isAuthorized}
                placeholder="e.g. UltraTech Cement Limited"
                value={legalName}
                onChange={(e) => setLegalName(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Category & Tax Identifiers */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Procurement Category</label>
              <select
                disabled={!isAuthorized}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              >
                <option value="Cement & Concrete">Cement & Concrete</option>
                <option value="Steel & TMT Bars">Steel & TMT Bars</option>
                <option value="Aggregates & Sand">Aggregates & Sand</option>
                <option value="Electrical & Automation">Electrical & Automation</option>
                <option value="Hardware & Tools">Hardware & Tools</option>
                <option value="Heavy Machinery Spares">Heavy Machinery Spares</option>
                <option value="Safety & PPE">Safety & PPE</option>
                <option value="Kitchen & Industrial Refills">Kitchen & Industrial Refills</option>
                <option value="General Works & Services">General Works & Services</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">GSTIN (15 Digits)</label>
              <input
                type="text"
                disabled={!isAuthorized}
                maxLength={15}
                placeholder="22AAAAA0000A1Z5"
                value={gstin}
                onChange={(e) => {
                  const val = e.target.value.toUpperCase();
                  setGstin(val);
                  if (val.length >= 12 && !pan) {
                    setPan(val.slice(2, 12));
                  }
                }}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">PAN (10 Digits)</label>
              <input
                type="text"
                disabled={!isAuthorized}
                maxLength={10}
                placeholder="AAAAA0000A"
                value={pan}
                onChange={(e) => setPan(e.target.value.toUpperCase())}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-bold text-slate-900 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Contact Details */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Contact Person</label>
              <input
                type="text"
                disabled={!isAuthorized}
                placeholder="e.g. Rajesh Kumar (Manager)"
                value={contactPerson}
                onChange={(e) => setContactPerson(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Phone / Mobile</label>
              <input
                type="text"
                disabled={!isAuthorized}
                placeholder="+91 98271 00000"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-mono font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Email Address</label>
              <input
                type="email"
                disabled={!isAuthorized}
                placeholder="vendor@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              />
            </div>
          </div>

          {/* Location & Address */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">Premises / Street Address</label>
              <input
                type="text"
                disabled={!isAuthorized}
                placeholder="Plot / Street / Area / Landmark"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">City & State</label>
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  disabled={!isAuthorized}
                  placeholder="City"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
                <input
                  type="text"
                  disabled={!isAuthorized}
                  placeholder="State"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Toggle Add Bank Account */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Landmark className="w-4 h-4 text-emerald-700" />
                <span className="text-xs font-bold text-slate-900">Link Bank Account for Immediate Disbursements</span>
              </div>
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-indigo-700">
                <input
                  type="checkbox"
                  disabled={!isAuthorized}
                  checked={includeBankAccount}
                  onChange={(e) => setIncludeBankAccount(e.target.checked)}
                  className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>Add Bank Account Now</span>
              </label>
            </div>

            {includeBankAccount && (
              <div className="space-y-3 pt-2 border-t border-slate-200">
                <div>
                  <label className="block text-[11px] font-bold text-slate-700 mb-1">
                    Beneficiary Name (Account Holder Title) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Printed title on Bank Passbook / Cheque"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-semibold text-slate-900"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank Name *</label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. State Bank of India"
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Account Type</label>
                    <select
                      value={accountType}
                      onChange={(e) => setAccountType(e.target.value as any)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg text-slate-900"
                    >
                      <option value="CURRENT">Current Account</option>
                      <option value="SAVINGS">Savings Account</option>
                      <option value="CASH_CREDIT">Cash Credit</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">Bank Account Number *</label>
                    <input
                      type="text"
                      required
                      placeholder="Full account number"
                      value={accountNo}
                      onChange={(e) => setAccountNo(e.target.value)}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-semibold text-slate-900"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 mb-1">IFSC Code (11 Chars) *</label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      placeholder="e.g. SBIN0001292"
                      value={ifscCode}
                      onChange={(e) => setIfscCode(e.target.value.toUpperCase())}
                      className="w-full text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono font-bold text-slate-900 uppercase"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Cancelled Cheque Document Proof *
                    </label>
                    <span className="text-[10px] text-emerald-700 font-semibold">Mandatory for Beneficiary Master</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="text"
                      required
                      placeholder="Cheque image URL or reference"
                      value={cancelledChequeUrl}
                      onChange={(e) => setCancelledChequeUrl(e.target.value)}
                      className="flex-1 text-xs p-2 bg-white border border-slate-300 rounded-lg font-mono text-slate-800"
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
              </div>
            )}
          </div>

          {/* Operational Notes */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">Operational Remarks / Products Supplied</label>
            <input
              type="text"
              disabled={!isAuthorized}
              placeholder="e.g. Approved supplier for bridge girder shuttering"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100"
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
              className="px-5 py-2 bg-indigo-700 hover:bg-indigo-800 text-white rounded-xl text-xs font-bold transition-all shadow-sm flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Check className="w-4 h-4" />
              <span>Register Vendor Master</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
