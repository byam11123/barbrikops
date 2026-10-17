import React, { useState, useEffect } from 'react';
import { 
  Building2, Plus, Search, Filter, ShieldCheck, CheckCircle2, Clock, 
  Eye, EyeOff, FileText, Download, AlertTriangle, ArrowUpDown, Check
} from 'lucide-react';
import { BeneficiaryRecord, UserProfile, isUserDirector } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { NewBeneficiaryModal } from './NewBeneficiaryModal';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { ColumnCustomizerPopover, ColumnOption } from './ColumnCustomizerPopover';
import { downloadCsv } from './exportCsvHelper';

interface BeneficiaryMasterViewProps {
  currentUser: UserProfile;
  searchQuery: string;
  onRefresh: () => void;
}

const BENEFICIARY_COLUMNS: ColumnOption[] = [
  { id: 'sheetNo', label: 'Sheet Ref', defaultVisible: true },
  { id: 'beneficiaryName', label: 'Legal Beneficiary Name', defaultVisible: true },
  { id: 'tradeVendorName', label: 'Trade Vendor Name', defaultVisible: true },
  { id: 'bankDetails', label: 'Bank Name & A/C', defaultVisible: true },
  { id: 'ifscCode', label: 'IFSC Code', defaultVisible: true },
  { id: 'category', label: 'Purpose / Category', defaultVisible: true },
  { id: 'proof', label: 'Cheque / Proof', defaultVisible: true },
  { id: 'approvalStatus', label: 'Approval Status', defaultVisible: true },
  { id: 'additionStatus', label: 'Portal Addition', defaultVisible: true },
  { id: 'actions', label: 'Actions', defaultVisible: true },
];

const STORAGE_KEY = 'barbrik_bank_col_prefs_beneficiaries_v1';

export const BeneficiaryMasterView: React.FC<BeneficiaryMasterViewProps> = ({
  currentUser,
  searchQuery,
  onRefresh,
}) => {
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRecord[]>(() => storageAdapter.getBeneficiaryRecords());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'COOLING'>('ALL');
  const [localSearch, setLocalSearch] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [unmaskedAccounts, setUnmaskedAccounts] = useState<Record<string, boolean>>({});

  // Proof Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<{
    isOpen: boolean;
    title: string;
    fileUrl?: string;
    referenceNo?: string;
    partyName?: string;
  }>({
    isOpen: false,
    title: '',
  });

  // Column preferences
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return BENEFICIARY_COLUMNS.filter(c => c.defaultVisible).map(c => c.id);
  });

  const isDirector = isUserDirector(currentUser);
  const isAccounts = (currentUser.departmentKeys || []).includes('ACCOUNTS') || 
                     (currentUser.departmentName || '').toUpperCase().includes('ACCOUNTS') || 
                     currentUser.role.toUpperCase().includes('ACCOUNTS');

  const refreshData = () => {
    setBeneficiaries(storageAdapter.getBeneficiaryRecords());
    onRefresh();
  };

  const toggleUnmask = (id: string) => {
    setUnmaskedAccounts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleApprove = (e: React.MouseEvent, record: BeneficiaryRecord) => {
    e.stopPropagation();
    storageAdapter.approveBeneficiaryRecord(record.id, true, currentUser);
    refreshData();
  };

  const handleMarkAddedToPortal = (e: React.MouseEvent, record: BeneficiaryRecord) => {
    e.stopPropagation();
    storageAdapter.recordBeneficiaryEntry(record.id, 'DONE', undefined, currentUser);
    refreshData();
  };

  const handleExportCsv = () => {
    const rows = [
      ['Sheet Ref', 'Timestamp', 'Legal Beneficiary Name', 'Trade Vendor Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Category', 'Approval Status', 'Approved By', 'Portal Addition Status', 'Added By'],
      ...filteredBeneficiaries.map(b => [
        b.sheetNo,
        b.timestamp,
        b.beneficiaryName,
        b.tradeVendorName || '—',
        b.bankName,
        b.accountNo,
        b.ifscCode,
        b.purpose || '—',
        b.approvalStatus,
        b.approvedBy || '—',
        b.additionStatus === 'DONE' ? 'Verified / Added' : 'Pending Addition',
        b.requestedBy || '—',
      ])
    ];
    downloadCsv('Beneficiary_Master_Directory', rows);
  };

  const filteredBeneficiaries = beneficiaries.filter(b => {
    if (statusFilter === 'PENDING' && b.approvalStatus !== 'PENDING') return false;
    if (statusFilter === 'APPROVED' && b.approvalStatus !== 'APPROVED') return false;
    if (statusFilter === 'COOLING' && (b.approvalStatus !== 'APPROVED' || b.additionStatus === 'DONE')) return false;

    const effectiveSearch = (localSearch || searchQuery || '').trim().toLowerCase();
    if (effectiveSearch !== '') {
      const q = effectiveSearch;
      const matchBen = (b.beneficiaryName || '').toLowerCase().includes(q);
      const matchVendor = (b.tradeVendorName || '').toLowerCase().includes(q);
      const matchAccount = (b.accountNo || '').toLowerCase().includes(q);
      const matchIfsc = (b.ifscCode || '').toLowerCase().includes(q);
      const matchBank = (b.bankName || '').toLowerCase().includes(q);
      const matchSheet = (b.sheetNo || '').toLowerCase().includes(q);
      const matchReq = (b.requestedBy || '').toLowerCase().includes(q);
      if (!matchBen && !matchVendor && !matchAccount && !matchIfsc && !matchBank && !matchSheet && !matchReq) return false;
    }

    return true;
  });

  // Metric counts
  const pendingDirectorCount = beneficiaries.filter(b => b.approvalStatus === 'PENDING').length;
  const coolingPortalCount = beneficiaries.filter(b => b.approvalStatus === 'APPROVED' && b.additionStatus !== 'DONE').length;
  const verifiedActiveCount = beneficiaries.filter(b => b.additionStatus === 'DONE').length;
  const approvedTotalCount = beneficiaries.filter(b => b.approvalStatus === 'APPROVED').length;

  return (
    <div className="space-y-4">
      {/* 4 Interactive Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Total Beneficiaries */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'ALL' ? 'ALL' : 'ALL')}
          title="Click to view all beneficiaries"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'ALL' 
              ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-slate-400 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-600'}`}>
              Total Beneficiaries
            </span>
            <Building2 className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-4xl font-black ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
              {beneficiaries.length}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'ALL'
                ? 'bg-white/25 text-white'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              Directory
            </span>
          </div>
        </div>

        {/* Card 2: Pending Director Sanction */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          title="Click to filter by Pending Sanction"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'PENDING' 
              ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'PENDING' ? 'text-white' : 'text-amber-600'}`}>
              Pending Sanctions
            </span>
            <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'PENDING' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-4xl font-black ${statusFilter === 'PENDING' ? 'text-white' : 'text-slate-900'}`}>
              {pendingDirectorCount}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'PENDING'
                ? 'bg-white/25 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}>
              Director Review
            </span>
          </div>
        </div>

        {/* Card 3: Cooling / Bank Entry */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'COOLING' ? 'ALL' : 'COOLING')}
          title="Click to filter by Awaiting Portal Addition"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'COOLING' 
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'COOLING' ? 'text-white' : 'text-indigo-600'}`}>
              Cooling / NetBanking
            </span>
            <ShieldCheck className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'COOLING' ? 'text-white' : 'text-indigo-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-4xl font-black ${statusFilter === 'COOLING' ? 'text-white' : 'text-slate-900'}`}>
              {coolingPortalCount}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'COOLING'
                ? 'bg-white/25 text-white'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            }`}>
              Accounts Action
            </span>
          </div>
        </div>

        {/* Card 4: Verified & Active */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
          title="Click to filter by Verified Active Beneficiaries"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'APPROVED' 
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'APPROVED' ? 'text-white' : 'text-emerald-600'}`}>
              Verified &amp; Active
            </span>
            <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'APPROVED' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-4xl font-black ${statusFilter === 'APPROVED' ? 'text-white' : 'text-slate-900'}`}>
              {verifiedActiveCount}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'APPROVED'
                ? 'bg-white/25 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              Ready to Pay
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Row 1: Search Box & Actions */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search by Legal Name, Vendor, A/C No, IFSC, Bank, Sheet Ref..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
            />
            {localSearch && (
              <button
                type="button"
                onClick={() => setLocalSearch('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold"
                title="Clear search"
              >
                ✕
              </button>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Column Customizer */}
            <ColumnCustomizerPopover
              storageKey={STORAGE_KEY}
              availableColumns={BENEFICIARY_COLUMNS}
              visibleColumns={visibleColumns}
              onChange={setVisibleColumns}
            />

            {/* Export CSV */}
            <button
              type="button"
              onClick={handleExportCsv}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="Download formatted CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-500" />
              <span>Export CSV</span>
            </button>

            {/* Add Beneficiary Button */}
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ Add Beneficiary</span>
            </button>
          </div>
        </div>

        {/* Row 2: Status Facet Tabs & Count */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({beneficiaries.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'PENDING'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending Sanction ({pendingDirectorCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COOLING')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'COOLING'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Awaiting Portal Entry ({coolingPortalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved ({approvedTotalCount})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{filteredBeneficiaries.length}</strong> of {beneficiaries.length} beneficiaries
            </span>
            {(statusFilter !== 'ALL' || localSearch) && (
              <button
                type="button"
                onClick={() => { setStatusFilter('ALL'); setLocalSearch(''); }}
                className="text-indigo-600 hover:underline font-semibold cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-900 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                {visibleColumns.includes('sheetNo') && <th className="p-3.5 pl-5">Sheet Ref</th>}
                {visibleColumns.includes('beneficiaryName') && <th className="p-3.5">Legal Beneficiary Name</th>}
                {visibleColumns.includes('tradeVendorName') && <th className="p-3.5">Trade Vendor Name</th>}
                {visibleColumns.includes('bankDetails') && <th className="p-3.5">Bank Name &amp; A/C</th>}
                {visibleColumns.includes('ifscCode') && <th className="p-3.5">IFSC Code</th>}
                {visibleColumns.includes('category') && <th className="p-3.5">Category</th>}
                {visibleColumns.includes('proof') && <th className="p-3.5">Cheque / Proof</th>}
                {visibleColumns.includes('approvalStatus') && <th className="p-3.5">Approval Status</th>}
                {visibleColumns.includes('additionStatus') && <th className="p-3.5">Portal Addition</th>}
                {visibleColumns.includes('actions') && <th className="p-3.5 text-right pr-5">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredBeneficiaries.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="p-10 text-center text-slate-400 font-medium">
                    No beneficiary records match your search query or filters.
                  </td>
                </tr>
              ) : (
                filteredBeneficiaries.map((b) => {
                  const isUnmasked = unmaskedAccounts[b.id];
                  const displayAccount = isUnmasked
                    ? b.accountNo
                    : `••••••••${(b.accountNo || '').slice(-4)}`;

                  return (
                    <tr key={b.id} className="hover:bg-indigo-50/40 transition-colors">
                      {visibleColumns.includes('sheetNo') && (
                        <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                          <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-indigo-700">
                            {b.sheetNo}
                          </span>
                        </td>
                      )}

                      {visibleColumns.includes('beneficiaryName') && (
                        <td className="p-3.5 font-bold text-slate-900">
                          {b.beneficiaryName}
                        </td>
                      )}

                      {visibleColumns.includes('tradeVendorName') && (
                        <td className="p-3.5 text-slate-600 font-medium">
                          {b.tradeVendorName || '—'}
                        </td>
                      )}

                      {visibleColumns.includes('bankDetails') && (
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{b.bankName}</div>
                          <div className="flex items-center gap-1.5 font-mono text-slate-500 text-[11px]">
                            <span>A/C: {displayAccount}</span>
                            <button
                              type="button"
                              onClick={() => toggleUnmask(b.id)}
                              className="text-slate-400 hover:text-slate-700 cursor-pointer"
                              title={isUnmasked ? 'Mask Account' : 'Reveal Account'}
                            >
                              {isUnmasked ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                            </button>
                          </div>
                        </td>
                      )}

                      {visibleColumns.includes('ifscCode') && (
                        <td className="p-3.5 font-mono font-bold text-slate-800">
                          {b.ifscCode}
                        </td>
                      )}

                      {visibleColumns.includes('category') && (
                        <td className="p-3.5 text-slate-600">
                          {b.purpose || 'Vendor Account'}
                        </td>
                      )}

                      {visibleColumns.includes('proof') && (
                        <td className="p-3.5">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({
                              isOpen: true,
                              title: `Cancelled Cheque Proof - ${b.beneficiaryName}`,
                              fileUrl: b.cancelledChequeUrl,
                              referenceNo: b.sheetNo,
                              partyName: b.beneficiaryName
                            })}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                          >
                            <FileText className="w-3.5 h-3.5" />
                            <span>View Proof</span>
                          </button>
                        </td>
                      )}

                      {visibleColumns.includes('approvalStatus') && (
                        <td className="p-3.5">
                          {b.approvalStatus === 'PENDING' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                              <Clock className="w-3 h-3 text-amber-600" /> Pending Sanction
                            </span>
                          )}
                          {b.approvalStatus === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sanctioned
                            </span>
                          )}
                          {b.approvalStatus === 'REJECTED' && (
                            <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                              Rejected
                            </span>
                          )}
                        </td>
                      )}

                      {visibleColumns.includes('additionStatus') && (
                        <td className="p-3.5">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold ${
                            b.additionStatus === 'DONE' 
                              ? 'bg-emerald-100 text-emerald-800' 
                              : 'bg-amber-100 text-amber-800'
                          }`}>
                            {b.additionStatus === 'DONE' ? (
                              <>
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Verified in NetBanking
                              </>
                            ) : (
                              <>
                                <Clock className="w-3 h-3 text-amber-600" /> Cooling / Pending Punch
                              </>
                            )}
                          </span>
                        </td>
                      )}

                      {visibleColumns.includes('actions') && (
                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {/* Director-Exclusive Sanction Button */}
                            {isDirector && b.approvalStatus === 'PENDING' && (
                              <button
                                onClick={(e) => handleApprove(e, b)}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Sanction Beneficiary Registration"
                              >
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Sanction</span>
                              </button>
                            )}

                            {/* Accounts Team Action to Mark Added in NetBanking */}
                            {isAccounts && b.approvalStatus === 'APPROVED' && b.additionStatus !== 'DONE' && (
                              <button
                                onClick={(e) => handleMarkAddedToPortal(e, b)}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Mark added in NetBanking CMS"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Mark Added</span>
                              </button>
                            )}
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Creation Modal */}
      <NewBeneficiaryModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        currentUser={currentUser}
        onSubmit={refreshData}
      />

      {/* Attachment Preview Modal */}
      <AttachmentPreviewModal
        isOpen={previewDoc.isOpen}
        onClose={() => setPreviewDoc(prev => ({ ...prev, isOpen: false }))}
        title={previewDoc.title}
        documentType="CHEQUE"
        fileUrl={previewDoc.fileUrl}
        referenceNo={previewDoc.referenceNo}
        partyName={previewDoc.partyName}
      />
    </div>
  );
};
