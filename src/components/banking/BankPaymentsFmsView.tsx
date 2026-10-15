import React, { useState } from 'react';
import { Landmark, Plus, Search, Filter, AlertTriangle, CheckCircle2, Clock, ExternalLink, ShieldCheck, Eye, RefreshCw } from 'lucide-react';
import { BankPaymentRecord, UserProfile, isUserDirector } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { NewBankPaymentModal } from './NewBankPaymentModal';
import { PaymentDetailDrawer } from './PaymentDetailDrawer';

interface BankPaymentsFmsViewProps {
  currentUser: UserProfile;
  searchQuery: string;
  siteFilter: string;
  onRefresh: () => void;
}

export const BankPaymentsFmsView: React.FC<BankPaymentsFmsViewProps> = ({
  currentUser,
  searchQuery,
  siteFilter,
  onRefresh,
}) => {
  const [payments, setPayments] = useState<BankPaymentRecord[]>(() => storageAdapter.getBankPayments());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DONE'>('ALL');
  const [mismatchOnly, setMismatchOnly] = useState(false);

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<BankPaymentRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const isDirector = isUserDirector(currentUser);

  const refreshData = () => {
    setPayments(storageAdapter.getBankPayments());
    if (onRefresh) onRefresh();
  };

  const handleRowClick = (p: BankPaymentRecord) => {
    setSelectedPayment(p);
    setIsDrawerOpen(true);
  };

  const handleQuickApprove = (e: React.MouseEvent, p: BankPaymentRecord) => {
    e.stopPropagation();
    storageAdapter.approveBankPaymentRecord(p.id, true, currentUser);
    refreshData();
  };

  const filteredPayments = payments.filter((p) => {
    if (mismatchOnly && !p.isNameMismatch) return false;
    if (siteFilter !== 'ALL' && p.site !== siteFilter) return false;

    if (statusFilter === 'PENDING') {
      if (p.approvalStatus !== 'PENDING') return false;
    } else if (statusFilter === 'APPROVED') {
      if (p.approvalStatus !== 'APPROVED' || p.paymentStatus === 'DONE') return false;
    } else if (statusFilter === 'REJECTED') {
      if (p.approvalStatus !== 'REJECTED') return false;
    } else if (statusFilter === 'DONE') {
      if (p.paymentStatus !== 'DONE') return false;
    }

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchVendor = (p.vendorName || '').toLowerCase().includes(q);
      const matchBen = (p.beneficiaryName || '').toLowerCase().includes(q);
      const matchSheet = (p.sheetNo || '').toLowerCase().includes(q);
      const matchPurpose = (p.purposeOfPayment || '').toLowerCase().includes(q);
      const matchSite = (p.site || '').toLowerCase().includes(q);
      if (!matchVendor && !matchBen && !matchSheet && !matchPurpose && !matchSite) return false;
    }

    return true;
  });

  return (
    <div className="space-y-4">
      {/* Table Controls Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Status Facet Tabs */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
          <button
            type="button"
            onClick={() => { setStatusFilter('ALL'); setMismatchOnly(false); }}
            className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'ALL' && !mismatchOnly
                ? 'bg-slate-900 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All ({payments.length})
          </button>
          <button
            type="button"
            onClick={() => { setStatusFilter('PENDING'); setMismatchOnly(false); }}
            className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'PENDING'
                ? 'bg-amber-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Pending Approval ({payments.filter(p => p.approvalStatus === 'PENDING').length})
          </button>
          <button
            type="button"
            onClick={() => { setStatusFilter('APPROVED'); setMismatchOnly(false); }}
            className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'APPROVED'
                ? 'bg-indigo-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Sanctioned / Awaiting Bank Entry ({payments.filter(p => p.approvalStatus === 'APPROVED' && p.paymentStatus !== 'DONE').length})
          </button>
          <button
            type="button"
            onClick={() => { setStatusFilter('DONE'); setMismatchOnly(false); }}
            className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
              statusFilter === 'DONE'
                ? 'bg-emerald-600 text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Settled ({payments.filter(p => p.paymentStatus === 'DONE').length})
          </button>
          <button
            type="button"
            onClick={() => setMismatchOnly(!mismatchOnly)}
            className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
              mismatchOnly
                ? 'bg-amber-500 text-white shadow-2xs'
                : 'bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200'
            }`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Name Mismatch ({payments.filter(p => p.isNameMismatch).length})</span>
          </button>
        </div>

        {/* Create Requisition Action Button */}
        <button
          onClick={() => setIsNewModalOpen(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>+ New Payment Request</span>
        </button>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-900 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                <th className="p-3.5 pl-5">Sheet Ref</th>
                <th className="p-3.5">Vendor Trade Name</th>
                <th className="p-3.5">Legal Beneficiary Name</th>
                <th className="p-3.5">Amount (₹)</th>
                <th className="p-3.5">Mode</th>
                <th className="p-3.5">Site Location</th>
                <th className="p-3.5">Stage Status</th>
                <th className="p-3.5 text-right pr-5">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                    No bank payment records match your filters.
                  </td>
                </tr>
              ) : (
                filteredPayments.map((p) => (
                  <tr
                    key={p.id}
                    onClick={() => handleRowClick(p)}
                    className="hover:bg-indigo-50/50 transition-colors cursor-pointer"
                  >
                    <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                      <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-indigo-700">
                        {p.sheetNo}
                      </span>
                    </td>
                    <td className="p-3.5 font-bold text-slate-900">
                      {p.vendorName}
                      {p.billNoPo && (
                        <span className="block text-[10px] text-slate-400 font-normal">
                          Ref: {p.billNoPo}
                        </span>
                      )}
                    </td>
                    <td className="p-3.5">
                      <span className="font-semibold text-slate-900">{p.beneficiaryName}</span>
                      {p.isNameMismatch && (
                        <span className="mt-0.5 inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md border border-amber-200">
                          <AlertTriangle className="w-3 h-3 text-amber-600" /> Name Mismatch
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 font-mono font-bold text-indigo-700 text-sm">
                      ₹{p.amountToBePaid.toLocaleString('en-IN')}
                    </td>
                    <td className="p-3.5 font-bold text-slate-700">
                      <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                        p.modeOfPayment === 'UPI' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'
                      }`}>
                        {p.modeOfPayment}
                      </span>
                    </td>
                    <td className="p-3.5 font-medium text-slate-700">
                      {p.site}
                    </td>
                    <td className="p-3.5">
                      {p.approvalStatus === 'PENDING' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                          <Clock className="w-3 h-3 text-amber-600" /> Pending Approval
                        </span>
                      )}
                      {p.approvalStatus === 'APPROVED' && p.paymentStatus !== 'DONE' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-100 text-indigo-800">
                          <Clock className="w-3 h-3 text-indigo-600" /> Sanctioned (Bank Entry)
                        </span>
                      )}
                      {p.approvalStatus === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                          Rejected
                        </span>
                      )}
                      {p.paymentStatus === 'DONE' && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Settled (UTR)
                        </span>
                      )}
                    </td>
                    <td className="p-3.5 pr-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Director-Exclusive Quick Approval Trigger */}
                        {isDirector && p.approvalStatus === 'PENDING' && (
                          <button
                            onClick={(e) => handleQuickApprove(e, p)}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                            title="Direct Sanction Authorization"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Approve</span>
                          </button>
                        )}

                        <button
                          onClick={(e) => { e.stopPropagation(); handleRowClick(p); }}
                          className="p-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                          title="View Full Ledger Detail"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      <NewBankPaymentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        currentUser={currentUser}
        onSubmit={() => refreshData()}
      />

      {/* Split Drawer */}
      <PaymentDetailDrawer
        payment={selectedPayment}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentUser={currentUser}
        onUpdate={() => refreshData()}
      />
    </div>
  );
};
