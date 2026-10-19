import React, { useState } from 'react';
import { 
  X, 
  Building2, 
  Landmark, 
  Phone, 
  Mail, 
  MapPin, 
  FileText, 
  AlertTriangle, 
  CheckCircle2, 
  Plus, 
  ShieldCheck, 
  ExternalLink, 
  Eye, 
  Calendar, 
  Clock, 
  CreditCard,
  Edit2,
  FileCheck2,
  AlertCircle
} from 'lucide-react';
import { VendorProfileRecord, UserProfile, isUserAuthorizedForVendorBanking, BankPaymentRecord } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { AddVendorBankModal } from './AddVendorBankModal';

interface VendorProfileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string | null;
  currentUser: UserProfile;
  onVendorUpdated?: (updated: VendorProfileRecord) => void;
}

export const VendorProfileDrawer: React.FC<VendorProfileDrawerProps> = ({
  isOpen,
  onClose,
  vendorId,
  currentUser,
  onVendorUpdated
}) => {
  const isAuthorized = isUserAuthorizedForVendorBanking(currentUser);

  const [activeVendor, setActiveVendor] = useState<VendorProfileRecord | null>(() => {
    return vendorId ? storageAdapter.getVendorProfileById(vendorId) : null;
  });

  const [isAddBankModalOpen, setIsAddBankModalOpen] = useState(false);
  const [selectedChequeProof, setSelectedChequeProof] = useState<{ title: string; url: string } | null>(null);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [editedNotes, setEditedNotes] = useState('');
  const [revealedAccounts, setRevealedAccounts] = useState<Record<string, boolean>>({});

  // Sync when vendorId changes
  React.useEffect(() => {
    if (vendorId) {
      const v = storageAdapter.getVendorProfileById(vendorId);
      setActiveVendor(v);
      if (v) setEditedNotes(v.notes || '');
    } else {
      setActiveVendor(null);
    }
  }, [vendorId]);

  if (!isOpen || !activeVendor) return null;

  // Retrieve vendor's linked bank payment history
  const allPayments = storageAdapter.getBankPayments();
  const vendorPayments = allPayments.filter(
    (p) => (p.vendorName || '').trim().toLowerCase() === activeVendor.tradeName.trim().toLowerCase()
  );

  const totalDisbursed = vendorPayments
    .filter((p) => p.paymentStatus === 'DONE')
    .reduce((sum, p) => sum + p.amountToBePaid, 0);

  const pendingDisbursed = vendorPayments
    .filter((p) => p.approvalStatus === 'APPROVED' && p.paymentStatus !== 'DONE')
    .reduce((sum, p) => sum + p.amountToBePaid, 0);

  const toggleRevealAccount = (accId: string) => {
    setRevealedAccounts((prev) => ({ ...prev, [accId]: !prev[accId] }));
  };

  const handleSaveNotes = () => {
    if (!isAuthorized) return;
    const updated = storageAdapter.updateVendorProfile(
      activeVendor.id,
      { notes: editedNotes.trim() },
      currentUser
    );
    if (updated) {
      setActiveVendor(updated);
      setIsEditingNotes(false);
      if (onVendorUpdated) onVendorUpdated(updated);
    }
  };

  const handleBankAddedSuccess = (updated: VendorProfileRecord) => {
    setActiveVendor(updated);
    if (onVendorUpdated) onVendorUpdated(updated);
  };

  return (
    <>
      <div className="fixed inset-0 z-40 flex justify-end bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200">
        <div className="bg-white w-full max-w-4xl h-full shadow-2xl flex flex-col border-l border-slate-200 overflow-hidden">
          {/* Top Bar */}
          <div className="px-6 py-4 border-b border-slate-200 bg-slate-50 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <div className="p-2.5 bg-indigo-100 text-indigo-700 rounded-xl">
                <Building2 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                    {activeVendor.vendorCode}
                  </span>
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    activeVendor.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}>
                    {activeVendor.status}
                  </span>
                </div>
                <h2 className="text-lg font-bold text-slate-900 tracking-tight mt-0.5">
                  {activeVendor.tradeName}
                </h2>
                {activeVendor.legalName && activeVendor.legalName !== activeVendor.tradeName && (
                  <p className="text-xs text-slate-500 font-medium">
                    Legal Title: {activeVendor.legalName}
                  </p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              {isAuthorized && (
                <button
                  onClick={() => setIsAddBankModalOpen(true)}
                  className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Bank Account</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Body Content */}
          <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-900">
            {/* Quick KPI Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Category</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5 truncate">{activeVendor.category}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Bank Accounts</div>
                <div className="text-xs font-bold text-slate-900 mt-0.5">
                  {activeVendor.bankAccounts.length} Registered
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Disbursed</div>
                <div className="text-xs font-bold font-mono text-emerald-700 mt-0.5">
                  ₹{totalDisbursed.toLocaleString('en-IN')}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Pending Release</div>
                <div className="text-xs font-bold font-mono text-amber-700 mt-0.5">
                  ₹{pendingDisbursed.toLocaleString('en-IN')}
                </div>
              </div>
            </div>

            {/* Commercial Identity & Tax Details */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  <span>Commercial & Statutory Tax Identity</span>
                </h4>
                <div className="text-[11px] text-slate-500">
                  Registered On: <span className="font-semibold text-slate-700">{activeVendor.createdAt}</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="block text-[11px] font-bold text-slate-500">GSTIN</span>
                  <span className="font-mono font-bold text-slate-900">
                    {activeVendor.gstin || 'Not Provided (Unregistered)'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-500">Permanent Account Number (PAN)</span>
                  <span className="font-mono font-bold text-slate-900">
                    {activeVendor.pan || 'Not Provided'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-500">Registered City & State</span>
                  <span className="font-semibold text-slate-800">
                    {activeVendor.city || 'Raipur'}, {activeVendor.state || 'Chhattisgarh'}
                  </span>
                </div>
              </div>

              {activeVendor.address && (
                <div className="pt-2 border-t border-slate-100 flex items-start gap-2 text-xs text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                  <span>{activeVendor.address}</span>
                </div>
              )}
            </div>

            {/* Contact Personnel Details */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                Contact & Key Personnel
              </h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="block text-[11px] font-bold text-slate-500">Contact Person</span>
                  <span className="font-semibold text-slate-900">
                    {activeVendor.contactPerson || 'Authorized Representative'}
                  </span>
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-500">Phone / Mobile</span>
                  {activeVendor.phone ? (
                    <a
                      href={`tel:${activeVendor.phone}`}
                      className="font-mono font-bold text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Phone className="w-3 h-3" />
                      <span>{activeVendor.phone}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">Not recorded</span>
                  )}
                </div>
                <div>
                  <span className="block text-[11px] font-bold text-slate-500">Email Address</span>
                  {activeVendor.email ? (
                    <a
                      href={`mailto:${activeVendor.email}`}
                      className="font-medium text-indigo-600 hover:underline flex items-center gap-1"
                    >
                      <Mail className="w-3 h-3" />
                      <span className="truncate">{activeVendor.email}</span>
                    </a>
                  ) : (
                    <span className="text-slate-400">Not recorded</span>
                  )}
                </div>
              </div>
            </div>

            {/* ==================================================== */}
            {/* LINKED BANK ACCOUNTS & BENEFICIARY GOVERNANCE SECTION */}
            {/* ==================================================== */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-700" />
                    <span>Authorized Beneficiary & Bank Accounts</span>
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Official accounts verified for electronic disbursements (RTGS / NEFT / IMPS)
                  </p>
                </div>
                {isAuthorized && (
                  <button
                    onClick={() => setIsAddBankModalOpen(true)}
                    className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Add Account</span>
                  </button>
                )}
              </div>

              {/* Warning if no accounts exist */}
              {activeVendor.bankAccounts.length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-300 rounded-xl flex items-start gap-3">
                  <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <div className="text-xs font-bold text-amber-900">
                      No Bank Account Linked (Payment Requisitions Blocked)
                    </div>
                    <p className="text-[11px] text-amber-800 leading-relaxed">
                      This vendor does not have a registered bank account on file. When searching for this vendor in Payment Requests, the system will flag missing account details. To enable disbursements, an authorized user (Accounts, Director, Admin, Super Admin) must add bank details along with a verified cancelled cheque.
                    </p>
                    {isAuthorized && (
                      <button
                        onClick={() => setIsAddBankModalOpen(true)}
                        className="mt-2 px-3 py-1.5 bg-amber-700 hover:bg-amber-800 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add First Bank Account</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  {activeVendor.bankAccounts.map((acc, idx) => {
                    const displayAccountNo = acc.accountNo || acc.accountNoMasked;
                    const hasCheque = Boolean(acc.cancelledChequeUrl);

                    return (
                      <div
                        key={acc.id || idx}
                        className={`p-3.5 rounded-xl border transition-all ${
                          acc.isPrimary
                            ? 'bg-emerald-50/40 border-emerald-300 shadow-2xs'
                            : 'bg-slate-50/60 border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-slate-900">{acc.bankName}</span>
                              <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-200 text-slate-800 rounded font-bold">
                                {acc.accountType}
                              </span>
                              {acc.isPrimary && (
                                <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full flex items-center gap-1">
                                  <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                  Primary
                                </span>
                              )}
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                acc.verificationStatus === 'VERIFIED'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : acc.verificationStatus === 'PENDING'
                                  ? 'bg-amber-100 text-amber-800'
                                  : 'bg-rose-100 text-rose-800'
                              }`}>
                                {acc.verificationStatus}
                              </span>
                            </div>

                            <div className="text-xs text-slate-700">
                              Legal Bank Holder Title:{' '}
                              <span className="font-bold text-slate-900">{acc.beneficiaryName}</span>
                            </div>

                            <div className="flex items-center gap-4 text-xs pt-1 font-mono">
                              <div>
                                <span className="text-slate-500 font-sans text-[11px] font-semibold mr-1">A/C:</span>
                                <span className="font-bold text-slate-900">{displayAccountNo}</span>
                              </div>

                              <div>
                                <span className="text-slate-500 font-sans text-[11px] font-semibold mr-1">IFSC:</span>
                                <span className="font-bold text-slate-900 uppercase">{acc.ifscCode}</span>
                              </div>
                            </div>

                            {acc.verifiedBy && (
                              <div className="text-[11px] text-slate-500 pt-1">
                                Verified by <span className="font-semibold text-slate-700">{acc.verifiedBy}</span>
                                {acc.verifiedAt ? ` on ${acc.verifiedAt}` : ''}
                              </div>
                            )}
                          </div>

                          {/* Cancelled Cheque Thumbnail / Action */}
                          <div className="shrink-0 text-right space-y-1">
                            {hasCheque ? (
                              <button
                                type="button"
                                onClick={() => setSelectedChequeProof({
                                  title: `Cancelled Cheque Proof - ${acc.beneficiaryName} (${acc.bankName})`,
                                  url: acc.cancelledChequeUrl!
                                })}
                                className="px-2.5 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-800 rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-2xs transition-colors cursor-pointer"
                              >
                                <FileCheck2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>View Cheque Proof</span>
                              </button>
                            ) : (
                              <div className="p-1.5 bg-amber-100 text-amber-800 rounded text-[10px] font-bold flex items-center gap-1">
                                <AlertTriangle className="w-3 h-3 text-amber-600" />
                                <span>Cheque Missing</span>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Operational Notes / History */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-2 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Operational Remarks & Context
                </h4>
                {isAuthorized && !isEditingNotes && (
                  <button
                    onClick={() => setIsEditingNotes(true)}
                    className="text-indigo-600 hover:text-indigo-800 text-xs font-bold flex items-center gap-1 cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3" />
                    <span>Edit</span>
                  </button>
                )}
              </div>

              {isEditingNotes ? (
                <div className="space-y-2 pt-1">
                  <textarea
                    rows={3}
                    value={editedNotes}
                    onChange={(e) => setEditedNotes(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter operational vendor notes, payment terms, or remarks..."
                  />
                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setEditedNotes(activeVendor.notes || '');
                        setIsEditingNotes(false);
                      }}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={handleSaveNotes}
                      className="px-3 py-1.5 text-xs font-bold bg-indigo-700 text-white rounded-lg hover:bg-indigo-800 cursor-pointer"
                    >
                      Save Notes
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-slate-700 leading-relaxed">
                  {activeVendor.notes || 'No specific operational notes recorded for this vendor.'}
                </p>
              )}
            </div>

            {/* Linked Disbursements Table */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-3 shadow-xs">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Disbursement & Payment Requisition History
                  </h4>
                  <span className="text-[11px] text-slate-500">
                    {vendorPayments.length} payment requests recorded in FMS
                  </span>
                </div>
              </div>

              {vendorPayments.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">
                  No payment requisitions logged for this vendor yet.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 text-slate-500 border-b border-slate-200 text-[11px] uppercase font-bold">
                        <th className="p-2.5">Sheet No</th>
                        <th className="p-2.5">Date</th>
                        <th className="p-2.5">Site / Purpose</th>
                        <th className="p-2.5 text-right">Amount (₹)</th>
                        <th className="p-2.5 text-center">Director Sanction</th>
                        <th className="p-2.5 text-center">Settlement</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {vendorPayments.map((p) => (
                        <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                          <td className="p-2.5 font-mono font-bold text-indigo-700">{p.sheetNo}</td>
                          <td className="p-2.5 text-slate-600">{p.plannedDate || p.timestamp.slice(0, 10)}</td>
                          <td className="p-2.5 text-slate-800 max-w-xs truncate" title={p.purposeOfPayment}>
                            <span className="font-semibold text-slate-900">{p.site}</span>: {p.purposeOfPayment}
                          </td>
                          <td className="p-2.5 font-mono font-bold text-slate-900 text-right">
                            ₹{p.amountToBePaid.toLocaleString('en-IN')}
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.approvalStatus === 'APPROVED'
                                ? 'bg-emerald-100 text-emerald-800'
                                : p.approvalStatus === 'REJECTED'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}>
                              {p.approvalStatus}
                            </span>
                          </td>
                          <td className="p-2.5 text-center">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                              p.paymentStatus === 'DONE'
                                ? 'bg-emerald-100 text-emerald-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}>
                              {p.paymentStatus === 'DONE' ? 'SETTLED' : 'PENDING'}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Add Bank Account Modal */}
      <AddVendorBankModal
        isOpen={isAddBankModalOpen}
        onClose={() => setIsAddBankModalOpen(false)}
        vendor={activeVendor}
        currentUser={currentUser}
        onSuccess={handleBankAddedSuccess}
      />

      {/* Cancelled Cheque Modal View */}
      {selectedChequeProof && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full overflow-hidden shadow-2xl border border-slate-200">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileCheck2 className="w-5 h-5 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900">{selectedChequeProof.title}</h4>
              </div>
              <button
                onClick={() => setSelectedChequeProof(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-4 bg-slate-900 flex items-center justify-center min-h-[300px] max-h-[70vh] overflow-auto">
              <img
                src={selectedChequeProof.url}
                alt="Cancelled Cheque Proof"
                className="max-h-[60vh] max-w-full rounded-lg object-contain shadow-lg"
              />
            </div>
            <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-600">
              <span>Verified Banking Document on File</span>
              <button
                onClick={() => setSelectedChequeProof(null)}
                className="px-4 py-1.5 bg-slate-800 text-white rounded-lg font-bold hover:bg-slate-900 transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
