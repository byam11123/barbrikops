import React, { useState } from 'react';
import { Landmark, Plus, Search, Filter, AlertTriangle, CheckCircle2, Clock, ShieldCheck, Eye, Building2, ArrowRightLeft } from 'lucide-react';
import { BankPaymentRecord, BeneficiaryRecord, InterbankTransferRecord, UserProfile, isUserDirector } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { BankPaymentsFmsView } from './BankPaymentsFmsView';
import { NewBeneficiaryModal } from './NewBeneficiaryModal';
import { NewIbtModal } from './NewIbtModal';

interface BankPaymentsSuiteViewProps {
  currentUser: UserProfile;
  searchQuery: string;
  siteFilter: string;
  onRefresh: () => void;
}

export const BankPaymentsSuiteView: React.FC<BankPaymentsSuiteViewProps> = ({
  currentUser,
  searchQuery,
  siteFilter,
  onRefresh,
}) => {
  const [activeSwitcher, setActiveSwitcher] = useState<'PAYMENTS' | 'BENEFICIARIES' | 'IBT'>('PAYMENTS');

  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRecord[]>(() => storageAdapter.getBeneficiaryRecords());
  const [ibtRecords, setIbtRecords] = useState<InterbankTransferRecord[]>(() => storageAdapter.getIbtRecords());

  const [isNewBenOpen, setIsNewBenOpen] = useState(false);
  const [isNewIbtOpen, setIsNewIbtOpen] = useState(false);

  const [benStatusFilter, setBenStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');
  const [ibtStatusFilter, setIbtStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED'>('ALL');

  const isDirector = isUserDirector(currentUser);
  const isAccounts = (currentUser.departmentKeys || []).includes('ACCOUNTS') || (currentUser.departmentName || '').toUpperCase().includes('ACCOUNTS') || currentUser.role.toUpperCase().includes('ACCOUNTS');

  const refreshSuiteData = () => {
    setBeneficiaries(storageAdapter.getBeneficiaryRecords());
    setIbtRecords(storageAdapter.getIbtRecords());
    onRefresh();
  };

  const handleApproveBeneficiary = (e: React.MouseEvent, b: BeneficiaryRecord) => {
    e.stopPropagation();
    storageAdapter.approveBeneficiaryRecord(b.id, true, currentUser);
    refreshSuiteData();
  };

  const handleApproveIbt = (e: React.MouseEvent, i: InterbankTransferRecord) => {
    e.stopPropagation();
    storageAdapter.approveIbtRecord(i.id, true, currentUser);
    refreshSuiteData();
  };

  const filteredBeneficiaries = beneficiaries.filter(b => {
    if (benStatusFilter === 'PENDING' && b.approvalStatus !== 'PENDING') return false;
    if (benStatusFilter === 'APPROVED' && b.approvalStatus !== 'APPROVED') return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (b.beneficiaryName || '').toLowerCase().includes(q) ||
             (b.tradeVendorName || '').toLowerCase().includes(q) ||
             (b.accountNo || '').toLowerCase().includes(q) ||
             (b.ifscCode || '').toLowerCase().includes(q);
    }
    return true;
  });

  const filteredIbt = ibtRecords.filter(i => {
    if (ibtStatusFilter === 'PENDING' && i.approvalStatus !== 'PENDING') return false;
    if (ibtStatusFilter === 'APPROVED' && i.approvalStatus !== 'APPROVED') return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      return (i.transferFrom || '').toLowerCase().includes(q) ||
             (i.transferTo || '').toLowerCase().includes(q) ||
             (i.purpose || '').toLowerCase().includes(q) ||
             (i.sheetNo || '').toLowerCase().includes(q);
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Suite Switcher Header Card */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="p-3 bg-indigo-50 text-indigo-700 rounded-xl">
            <Landmark className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Bank Payments &amp; Treasury Suite</h2>
            <p className="text-xs text-slate-500 font-normal">
              Barbrik Project Ltd. Corporate Banking, Beneficiary Registry &amp; Interbank Transfers
            </p>
          </div>
        </div>

        {/* 3 Switchers */}
        <div className="flex items-center gap-1.5 bg-slate-100 p-1.5 rounded-xl">
          <button
            type="button"
            onClick={() => setActiveSwitcher('PAYMENTS')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeSwitcher === 'PAYMENTS'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Bank Payments</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveSwitcher('BENEFICIARIES')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeSwitcher === 'BENEFICIARIES'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>Beneficiary Master</span>
            {beneficiaries.filter(b => b.approvalStatus === 'PENDING').length > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px]">
                {beneficiaries.filter(b => b.approvalStatus === 'PENDING').length}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => setActiveSwitcher('IBT')}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-2 ${
              activeSwitcher === 'IBT'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-700 hover:bg-slate-200/60'
            }`}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>Interbank Transfer</span>
            {ibtRecords.filter(i => i.approvalStatus === 'PENDING').length > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500 text-white rounded-full text-[10px]">
                {ibtRecords.filter(i => i.approvalStatus === 'PENDING').length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Switcher Content */}
      {activeSwitcher === 'PAYMENTS' && (
        <BankPaymentsFmsView
          currentUser={currentUser}
          searchQuery={searchQuery}
          siteFilter={siteFilter}
          onRefresh={onRefresh}
        />
      )}

      {activeSwitcher === 'BENEFICIARIES' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setBenStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  benStatusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All Beneficiaries ({beneficiaries.length})
              </button>
              <button
                type="button"
                onClick={() => setBenStatusFilter('PENDING')}
                className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  benStatusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending Approval ({beneficiaries.filter(b => b.approvalStatus === 'PENDING').length})
              </button>
              <button
                type="button"
                onClick={() => setBenStatusFilter('APPROVED')}
                className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  benStatusFilter === 'APPROVED' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Approved ({beneficiaries.filter(b => b.approvalStatus === 'APPROVED').length})
              </button>
            </div>

            <button
              onClick={() => setIsNewBenOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Register Master Beneficiary</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-900 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pl-5">Sheet Ref</th>
                    <th className="p-3.5">Legal Beneficiary Name</th>
                    <th className="p-3.5">Trade Vendor Name</th>
                    <th className="p-3.5">Bank Name &amp; A/C</th>
                    <th className="p-3.5">IFSC Code</th>
                    <th className="p-3.5">Approval Status</th>
                    <th className="p-3.5">Portal Addition</th>
                    <th className="p-3.5 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredBeneficiaries.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                        No beneficiary records found.
                      </td>
                    </tr>
                  ) : (
                    filteredBeneficiaries.map((b) => (
                      <tr key={b.id} className="hover:bg-indigo-50/50 transition-colors">
                        <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                          <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-indigo-700">
                            {b.sheetNo}
                          </span>
                        </td>
                        <td className="p-3.5 font-bold text-slate-900">{b.beneficiaryName}</td>
                        <td className="p-3.5 text-slate-600">{b.tradeVendorName || '—'}</td>
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{b.bankName}</div>
                          <div className="font-mono text-slate-500">A/C: {b.accountNo}</div>
                        </td>
                        <td className="p-3.5 font-mono font-bold text-slate-700">{b.ifscCode}</td>
                        <td className="p-3.5">
                          {b.approvalStatus === 'PENDING' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              Pending Approval
                            </span>
                          )}
                          {b.approvalStatus === 'APPROVED' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              Approved
                            </span>
                          )}
                          {b.approvalStatus === 'REJECTED' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              Rejected
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            b.additionStatus === 'DONE' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {b.additionStatus === 'DONE' ? 'Verified / Added' : 'Cooling / Pending'}
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isDirector && b.approvalStatus === 'PENDING' && (
                              <button
                                onClick={(e) => handleApproveBeneficiary(e, b)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {activeSwitcher === 'IBT' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-xl">
              <button
                type="button"
                onClick={() => setIbtStatusFilter('ALL')}
                className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  ibtStatusFilter === 'ALL' ? 'bg-slate-900 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                All IBT ({ibtRecords.length})
              </button>
              <button
                type="button"
                onClick={() => setIbtStatusFilter('PENDING')}
                className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  ibtStatusFilter === 'PENDING' ? 'bg-amber-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Pending Approval ({ibtRecords.filter(i => i.approvalStatus === 'PENDING').length})
              </button>
              <button
                type="button"
                onClick={() => setIbtStatusFilter('APPROVED')}
                className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                  ibtStatusFilter === 'APPROVED' ? 'bg-emerald-600 text-white' : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Approved ({ibtRecords.filter(i => i.approvalStatus === 'APPROVED').length})
              </button>
            </div>

            <button
              onClick={() => setIsNewIbtOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Interbank Transfer</span>
            </button>
          </div>

          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-100 text-slate-900 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3.5 pl-5">Sheet Ref</th>
                    <th className="p-3.5">Transfer From (Source)</th>
                    <th className="p-3.5">Transfer To (Destination)</th>
                    <th className="p-3.5">Amount (₹)</th>
                    <th className="p-3.5">Purpose / Remarks</th>
                    <th className="p-3.5">Approval Status</th>
                    <th className="p-3.5">Settlement (UTR)</th>
                    <th className="p-3.5 text-right pr-5">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredIbt.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="p-8 text-center text-slate-400 font-medium">
                        No interbank transfer records found.
                      </td>
                    </tr>
                  ) : (
                    filteredIbt.map((i) => (
                      <tr key={i.id} className="hover:bg-indigo-50/50 transition-colors">
                        <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                          <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-indigo-700">
                            {i.sheetNo}
                          </span>
                        </td>
                        <td className="p-3.5 font-semibold text-slate-900">{i.transferFrom}</td>
                        <td className="p-3.5 font-semibold text-slate-900">{i.transferTo}</td>
                        <td className="p-3.5 font-mono font-bold text-indigo-700 text-sm">
                          ₹{i.amount.toLocaleString('en-IN')}
                        </td>
                        <td className="p-3.5 text-slate-600 max-w-xs truncate">{i.purpose}</td>
                        <td className="p-3.5">
                          {i.approvalStatus === 'PENDING' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              Pending Approval
                            </span>
                          )}
                          {i.approvalStatus === 'APPROVED' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              Approved
                            </span>
                          )}
                        </td>
                        <td className="p-3.5">
                          <span className={`px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            i.paymentStatus === 'DONE' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-100 text-slate-700'
                          }`}>
                            {i.paymentStatus === 'DONE' ? `Settled: ${i.utrRef || 'UTR'}` : 'Pending Settlement'}
                          </span>
                        </td>
                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            {isDirector && i.approvalStatus === 'PENDING' && (
                              <button
                                onClick={(e) => handleApproveIbt(e, i)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modals */}
      <NewBeneficiaryModal
        isOpen={isNewBenOpen}
        onClose={() => setIsNewBenOpen(false)}
        currentUser={currentUser}
        onSubmit={() => refreshSuiteData()}
      />

      <NewIbtModal
        isOpen={isNewIbtOpen}
        onClose={() => setIsNewIbtOpen(false)}
        currentUser={currentUser}
        onSubmit={() => refreshSuiteData()}
      />
    </div>
  );
};
