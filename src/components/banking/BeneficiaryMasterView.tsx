import React, { useState } from 'react';
import { 
  Building2, Plus, Search, CheckCircle2, Clock, 
  Eye, EyeOff, FileText, Download, Check, X, XCircle, ShieldCheck, User
} from 'lucide-react';
import { BeneficiaryRecord, UserProfile, PaymentApprovalStatus, PaymentStepStatus } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { NewBeneficiaryModal } from './NewBeneficiaryModal';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { ColumnCustomizerPopover, ColumnOption } from './ColumnCustomizerPopover';
import { downloadCsv } from './exportCsvHelper';

function parseDateString(str?: string): Date | null {
  if (!str) return null;
  try {
    const cleaned = str.replace(',', '').trim();
    const parts = cleaned.split(' ');
    if (parts.length >= 2) {
      const dateParts = parts[0].split('/');
      const timeParts = parts[1].split(':');
      if (dateParts.length === 3 && timeParts.length >= 2) {
        const day = parseInt(dateParts[0], 10);
        const month = parseInt(dateParts[1], 10) - 1;
        const year = parseInt(dateParts[2], 10);
        const hours = parseInt(timeParts[0], 10);
        const minutes = parseInt(timeParts[1], 10);
        const seconds = timeParts[2] ? parseInt(timeParts[2], 10) : 0;
        const d = new Date(year, month, day, hours, minutes, seconds);
        if (!isNaN(d.getTime())) return d;
      }
    }
    const fallback = new Date(str);
    return isNaN(fallback.getTime()) ? null : fallback;
  } catch {
    return null;
  }
}

function formatDateDisplay(d: Date | null): string {
  if (!d) return '—';
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function addHours(d: Date, hours: number): Date {
  return new Date(d.getTime() + hours * 60 * 60 * 1000);
}

interface BeneficiaryMasterViewProps {
  currentUser: UserProfile;
  searchQuery: string;
  onRefresh: () => void;
}

const BENEFICIARY_COLUMNS: ColumnOption[] = [
  { id: 'sheetNo', label: 'Sheet Ref', defaultVisible: true },
  { id: 'beneficiaryName', label: 'Name of Beneficiary', defaultVisible: true },
  { id: 'tradeVendorName', label: 'Vendor Name', defaultVisible: true },
  { id: 'bankDetails', label: 'Bank Name & A/C', defaultVisible: true },
  { id: 'ifscCode', label: 'IFSC Code', defaultVisible: true },
  { id: 'category', label: 'Purpose', defaultVisible: true },
  { id: 'proof', label: 'Cheque / Proof', defaultVisible: true },
  { id: 'remark', label: 'Remark', defaultVisible: true },
  { id: 'approvalStatus', label: 'Approval Status', defaultVisible: true },
  { id: 'beneficiaryEntry', label: 'Beneficiary Entry Status', defaultVisible: true },
  { id: 'additionStatus', label: 'Addition Status', defaultVisible: true },
  { id: 'actions', label: 'Actions', defaultVisible: true },
];

const STORAGE_KEY = 'barbrik_bank_col_prefs_beneficiaries_v1';

export const BeneficiaryMasterView: React.FC<BeneficiaryMasterViewProps> = ({
  currentUser,
  searchQuery,
  onRefresh,
}) => {
  const [beneficiaries, setBeneficiaries] = useState<BeneficiaryRecord[]>(() => storageAdapter.getBeneficiaryRecords());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [localSearch, setLocalSearch] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [unmaskedAccounts, setUnmaskedAccounts] = useState<Record<string, boolean>>({});

  // View Record Modal State (Read-only view when all 3 statuses are resolved)
  const [viewingRecord, setViewingRecord] = useState<BeneficiaryRecord | null>(null);

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

  const refreshData = () => {
    setBeneficiaries(storageAdapter.getBeneficiaryRecords());
    onRefresh();
  };

  const toggleUnmask = (id: string) => {
    setUnmaskedAccounts(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleUpdateApprovalStatus = (record: BeneficiaryRecord, status: PaymentApprovalStatus) => {
    storageAdapter.updateBeneficiaryRecordStatus(record.id, 'approvalStatus', status, currentUser);
    refreshData();
  };

  const handleUpdateEntryStatus = (record: BeneficiaryRecord, status: PaymentStepStatus) => {
    storageAdapter.updateBeneficiaryRecordStatus(record.id, 'beneficiaryEntry', status, currentUser);
    refreshData();
  };

  const handleUpdateAdditionStatus = (record: BeneficiaryRecord, status: PaymentStepStatus) => {
    storageAdapter.updateBeneficiaryRecordStatus(record.id, 'additionStatus', status, currentUser);
    refreshData();
  };

  const handleExportCsv = () => {
    const rows = [
      ['Sheet Ref', 'Timestamp', 'Name of Beneficiary', 'Vendor Name', 'Bank Name', 'Account Number', 'IFSC Code', 'Purpose', 'Remark', 'Approval Status', 'Approved By', 'Beneficiary Entry Status', 'Addition Status', 'Requested By'],
      ...filteredBeneficiaries.map(b => {
        const isRejected = b.approvalStatus === 'REJECTED';
        const isEntryCancelled = b.beneficiaryEntry === 'CANCELLED';
        const effectiveEntry = isRejected ? 'Cancelled' : b.beneficiaryEntry === 'DONE' ? 'Done' : b.beneficiaryEntry === 'CANCELLED' ? 'Cancelled' : 'Pending';
        const effectiveAddition = (isRejected || isEntryCancelled || b.additionStatus === 'CANCELLED') ? 'Cancelled' : b.additionStatus === 'DONE' ? 'Done' : 'Pending';

        return [
          b.sheetNo,
          b.timestamp,
          b.beneficiaryName,
          b.tradeVendorName || '—',
          b.bankName,
          b.accountNo,
          b.ifscCode,
          b.purpose || '—',
          b.remark || '—',
          b.approvalStatus === 'APPROVED' ? 'Approved' : b.approvalStatus === 'REJECTED' ? 'Rejected' : 'Pending',
          b.approvedBy || '—',
          effectiveEntry,
          effectiveAddition,
          b.requestedBy || '—',
        ];
      })
    ];
    downloadCsv('Beneficiary_Master_Directory', rows);
  };

  const filteredBeneficiaries = beneficiaries.filter(b => {
    if (statusFilter === 'PENDING' && b.approvalStatus !== 'PENDING') return false;
    if (statusFilter === 'APPROVED' && b.approvalStatus !== 'APPROVED') return false;
    if (statusFilter === 'REJECTED' && b.approvalStatus !== 'REJECTED') return false;

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
      const matchRemark = (b.remark || '').toLowerCase().includes(q);
      if (!matchBen && !matchVendor && !matchAccount && !matchIfsc && !matchBank && !matchSheet && !matchReq && !matchRemark) return false;
    }

    return true;
  });

  // Metric counts
  const pendingCount = beneficiaries.filter(b => b.approvalStatus === 'PENDING').length;
  const approvedCount = beneficiaries.filter(b => b.approvalStatus === 'APPROVED').length;
  const rejectedCount = beneficiaries.filter(b => b.approvalStatus === 'REJECTED').length;

  return (
    <div className="space-y-4">
      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Card 1: Total Beneficiaries */}
        <div 
          onClick={() => setStatusFilter('ALL')}
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

        {/* Card 2: Approved */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
          title="Click to filter by Approved"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'APPROVED' 
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'APPROVED' ? 'text-white' : 'text-emerald-600'}`}>
              Approved
            </span>
            <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'APPROVED' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-4xl font-black ${statusFilter === 'APPROVED' ? 'text-white' : 'text-slate-900'}`}>
              {approvedCount}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'APPROVED'
                ? 'bg-white/25 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              Active
            </span>
          </div>
        </div>

        {/* Card 3: Pending Approval */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          title="Click to filter by Pending"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'PENDING' 
              ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'PENDING' ? 'text-white' : 'text-amber-600'}`}>
              Pending Approval
            </span>
            <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'PENDING' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-4xl font-black ${statusFilter === 'PENDING' ? 'text-white' : 'text-slate-900'}`}>
              {pendingCount}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'PENDING'
                ? 'bg-white/25 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}>
              In Review
            </span>
          </div>
        </div>

        {/* Card 4: Rejected */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'REJECTED' ? 'ALL' : 'REJECTED')}
          title="Click to filter by Rejected"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'REJECTED' 
              ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'REJECTED' ? 'text-white' : 'text-rose-600'}`}>
              Rejected
            </span>
            <XCircle className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'REJECTED' ? 'text-white' : 'text-rose-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-4xl font-black ${statusFilter === 'REJECTED' ? 'text-white' : 'text-slate-900'}`}>
              {rejectedCount}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'REJECTED'
                ? 'bg-white/25 text-white'
                : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              Declined
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
              placeholder="Search by Legal Name, Vendor, A/C No, IFSC, Bank, Remark..."
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
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'APPROVED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Approved ({approvedCount})
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
              Pending ({pendingCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('REJECTED')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'REJECTED'
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Rejected ({rejectedCount})
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
                {visibleColumns.includes('beneficiaryName') && <th className="p-3.5">Name of Beneficiary</th>}
                {visibleColumns.includes('tradeVendorName') && <th className="p-3.5">Vendor Name</th>}
                {visibleColumns.includes('bankDetails') && <th className="p-3.5">Bank Name &amp; A/C</th>}
                {visibleColumns.includes('ifscCode') && <th className="p-3.5">IFSC Code</th>}
                {visibleColumns.includes('category') && <th className="p-3.5">Purpose</th>}
                {visibleColumns.includes('proof') && <th className="p-3.5">Cheque / Proof</th>}
                {visibleColumns.includes('remark') && <th className="p-3.5">Remark</th>}
                {visibleColumns.includes('approvalStatus') && <th className="p-3.5">Approval Status</th>}
                {visibleColumns.includes('beneficiaryEntry') && <th className="p-3.5">Beneficiary Entry Status</th>}
                {visibleColumns.includes('additionStatus') && <th className="p-3.5">Addition Status</th>}
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
                  const isRejected = b.approvalStatus === 'REJECTED';
                  const isEntryCancelled = b.beneficiaryEntry === 'CANCELLED';

                  return (
                    <tr key={b.id} className="hover:bg-indigo-50/40 transition-colors">
                      {/* 1. Sheet Ref */}
                      {visibleColumns.includes('sheetNo') && (
                        <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                          <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-indigo-700">
                            {b.sheetNo}
                          </span>
                        </td>
                      )}

                      {/* 2. Legal Beneficiary Name */}
                      {visibleColumns.includes('beneficiaryName') && (
                        <td className="p-3.5 font-bold text-slate-900">
                          {b.beneficiaryName}
                        </td>
                      )}

                      {/* 3. Trade Vendor Name */}
                      {visibleColumns.includes('tradeVendorName') && (
                        <td className="p-3.5 text-slate-600 font-medium">
                          {b.tradeVendorName || '—'}
                        </td>
                      )}

                      {/* 4. Bank Name & A/C */}
                      {visibleColumns.includes('bankDetails') && (
                        <td className="p-3.5">
                          <div className="font-bold text-slate-900">{b.bankName}</div>
                          <div className="font-mono text-slate-600 text-[11px] font-semibold">
                            A/C: {b.accountNo}
                          </div>
                        </td>
                      )}

                      {/* 5. IFSC Code */}
                      {visibleColumns.includes('ifscCode') && (
                        <td className="p-3.5 font-mono font-bold text-slate-800">
                          {b.ifscCode}
                        </td>
                      )}

                      {/* 6. Category */}
                      {visibleColumns.includes('category') && (
                        <td className="p-3.5 text-slate-600">
                          {b.purpose || 'Vendor Account'}
                        </td>
                      )}

                      {/* 7. Cheque / Proof */}
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

                      {/* 8. Remark */}
                      {visibleColumns.includes('remark') && (
                        <td className="p-3.5 text-slate-600 max-w-xs truncate" title={b.remark || 'No remark'}>
                          {b.remark || '—'}
                        </td>
                      )}

                      {/* 9. Approval Status */}
                      {visibleColumns.includes('approvalStatus') && (
                        <td className="p-3.5">
                          {b.approvalStatus === 'APPROVED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                            </span>
                          )}
                          {b.approvalStatus === 'REJECTED' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                            </span>
                          )}
                          {(b.approvalStatus === 'PENDING' || !b.approvalStatus) && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" /> Pending
                            </span>
                          )}
                        </td>
                      )}

                      {/* 10. Beneficiary Entry Status (Auto-cancelled if Approval is Rejected) */}
                      {visibleColumns.includes('beneficiaryEntry') && (
                        <td className="p-3.5">
                          {isRejected || b.beneficiaryEntry === 'CANCELLED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" /> Cancelled
                            </span>
                          ) : b.beneficiaryEntry === 'DONE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" /> Pending
                            </span>
                          )}
                        </td>
                      )}

                      {/* 11. Addition Status (Auto-cancelled if Approval is Rejected OR Entry is Cancelled) */}
                      {visibleColumns.includes('additionStatus') && (
                        <td className="p-3.5">
                          {isRejected || isEntryCancelled || b.additionStatus === 'CANCELLED' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" /> Cancelled
                            </span>
                          ) : b.additionStatus === 'DONE' ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                              <Clock className="w-3 h-3 text-amber-600" /> Pending
                            </span>
                          )}
                        </td>
                      )}

                      {/* 12. Actions Column */}
                      {visibleColumns.includes('actions') && (
                        <td className="p-3.5 pr-5 text-right">
                          <div className="flex items-center justify-end gap-1.5 flex-wrap">
                            {/* Step 1: Approval Pending -> Show ONLY Approve & Reject buttons */}
                            {(b.approvalStatus === 'PENDING' || !b.approvalStatus) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateApprovalStatus(b, 'APPROVED')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                  title="Approve Beneficiary Registration"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Approve</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateApprovalStatus(b, 'REJECTED')}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                  title="Reject Beneficiary Registration"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {/* Step 2: Approved & Beneficiary Entry Pending -> Show ONLY Done & Cancelled buttons */}
                            {b.approvalStatus === 'APPROVED' && (b.beneficiaryEntry === 'PENDING' || !b.beneficiaryEntry) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateEntryStatus(b, 'DONE')}
                                  className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                  title="Mark Beneficiary Entry as Done"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Done</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateEntryStatus(b, 'CANCELLED')}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                  title="Mark Beneficiary Entry as Cancelled"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Cancelled</span>
                                </button>
                              </>
                            )}

                            {/* Step 3: Approved & Entry Done & Addition Status Pending -> Show ONLY Done & Cancelled buttons */}
                            {b.approvalStatus === 'APPROVED' && b.beneficiaryEntry === 'DONE' && (b.additionStatus === 'PENDING' || !b.additionStatus) && (
                              <>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAdditionStatus(b, 'DONE')}
                                  className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                  title="Mark Addition Status as Done"
                                >
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Done</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleUpdateAdditionStatus(b, 'CANCELLED')}
                                  className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                  title="Mark Addition Status as Cancelled"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Cancelled</span>
                                </button>
                              </>
                            )}

                            {/* Step 4: Terminal State (All 3 decided / Rejected / Cancelled) -> Show ONLY View button (No Edit, No Delete) */}
                            {(isRejected || isEntryCancelled || b.additionStatus === 'CANCELLED' || (b.approvalStatus === 'APPROVED' && b.beneficiaryEntry === 'DONE' && b.additionStatus === 'DONE')) && (
                              <button
                                type="button"
                                onClick={() => setViewingRecord(b)}
                                className="px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 shadow-2xs"
                                title="View Complete Beneficiary Details"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>View</span>
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

      {/* Read-Only Beneficiary Details Modal (Matches Bank Payment UI) */}
      {viewingRecord && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full my-8 border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-indigo-100 text-indigo-700 font-mono font-bold text-xs rounded-xl">
                  {viewingRecord.sheetNo}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{viewingRecord.tradeVendorName || viewingRecord.beneficiaryName}</h3>
                  <p className="text-xs text-slate-500 font-medium">{viewingRecord.beneficiaryName} • {viewingRecord.bankName}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
              {/* Card 1: Beneficiary Specification */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2">
                  Beneficiary Specification
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Vendor Name</span>
                    <span className="font-bold text-slate-900">{viewingRecord.tradeVendorName || '—'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Name of Beneficiary</span>
                    <span className="font-bold text-slate-900">{viewingRecord.beneficiaryName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Bank Name</span>
                    <span className="font-semibold text-slate-800">{viewingRecord.bankName}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Account Number & IFSC</span>
                    <span className="font-mono font-bold text-slate-900">{viewingRecord.accountNo} ({viewingRecord.ifscCode})</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Purpose</span>
                    <span className="font-medium text-slate-800">{viewingRecord.purpose || 'Vendor Account'}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Requested By</span>
                    <span className="font-semibold text-slate-800">{viewingRecord.requestedBy || 'System Requester'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[11px]">Remark</span>
                    <span className="font-medium text-slate-800">{viewingRecord.remark || '—'}</span>
                  </div>
                </div>
              </div>

              {/* Card 2: Attached Documents & Verification Proofs */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2">
                  Attached Documents & Verification Proofs
                </h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">Cancelled Cheque / Passbook</span>
                    {viewingRecord.cancelledChequeUrl ? (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({
                          isOpen: true,
                          title: `Cancelled Cheque Proof - ${viewingRecord.beneficiaryName}`,
                          fileUrl: viewingRecord.cancelledChequeUrl,
                          referenceNo: viewingRecord.sheetNo,
                          partyName: viewingRecord.beneficiaryName
                        })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Inspect Cheque Proof</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[11px]">No Cheque Uploaded</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: 4-Step FMS Lifecycle & SLA Execution Audit Log */}
              {(() => {
                const intakeDate = parseDateString(viewingRecord.timestamp);
                const stage2PlannedDate = intakeDate ? addHours(intakeDate, 1) : null;
                const stage2Planned = formatDateDisplay(stage2PlannedDate);
                const stage2ActualDate = parseDateString(viewingRecord.approvalTimestamp);

                const stage3BaseDate = stage2ActualDate || stage2PlannedDate;
                const stage3PlannedDate = stage3BaseDate ? addHours(stage3BaseDate, 1) : null;
                const stage3Planned = formatDateDisplay(stage3PlannedDate);
                const stage3ActualDate = parseDateString(viewingRecord.beneficiaryEntryTimestamp);

                const stage4BaseDate = stage3ActualDate || stage3PlannedDate;
                const stage4PlannedDate = stage4BaseDate ? addHours(stage4BaseDate, 1) : null;
                const stage4Planned = formatDateDisplay(stage4PlannedDate);

                return (
                  <div className="bg-slate-50/80 p-4 rounded-2xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600" />
                        <span>4-Step FMS Lifecycle & SLA Execution Audit Log</span>
                      </span>
                      <span className="text-[10px] font-bold px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-full border border-indigo-200">
                        1 Hr SLA / Stage (Starts Stage 2)
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {/* Stage 1: Intake */}
                      <div className="p-3 bg-white rounded-xl border border-slate-200 space-y-1.5 shadow-2xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-[11px]">1. Intake</span>
                          <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 text-emerald-800 rounded-full">
                            Submitted
                          </span>
                        </div>
                        <div className="space-y-0.5 text-[10px] text-slate-600">
                          <div><span className="text-slate-400">Actual:</span> <span className="font-semibold text-slate-800">{viewingRecord.timestamp}</span></div>
                          <div><span className="text-slate-400">By:</span> <span className="font-medium text-slate-700">{viewingRecord.requestedBy || 'Requester'}</span></div>
                        </div>
                      </div>

                      {/* Stage 2: Approval */}
                      <div className={`p-3 rounded-xl border space-y-1.5 shadow-2xs ${
                        viewingRecord.approvalStatus === 'APPROVED' ? 'bg-white border-emerald-300' :
                        viewingRecord.approvalStatus === 'REJECTED' ? 'bg-rose-50/50 border-rose-200' : 'bg-amber-50/50 border-amber-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-[11px]">2. Approval</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            viewingRecord.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            viewingRecord.approvalStatus === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {viewingRecord.approvalStatus}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-[10px] text-slate-600">
                          <div><span className="text-slate-400">Planned SLA:</span> <span className="font-semibold text-slate-800">{stage2Planned}</span></div>
                          <div><span className="text-slate-400">Actual:</span> <span className="font-semibold text-slate-800">{viewingRecord.approvalTimestamp || viewingRecord.approvalStatus} {viewingRecord.approvedBy ? `by ${viewingRecord.approvedBy}` : ''}</span></div>
                        </div>
                      </div>

                      {/* Stage 3: Beneficiary Entry */}
                      <div className={`p-3 rounded-xl border space-y-1.5 shadow-2xs ${
                        viewingRecord.beneficiaryEntry === 'DONE' ? 'bg-white border-emerald-300' :
                        viewingRecord.approvalStatus === 'REJECTED' || viewingRecord.beneficiaryEntry === 'CANCELLED' ? 'bg-slate-100 border-slate-200' : 'bg-amber-50/50 border-amber-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-[11px]">3. Beneficiary Entry</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            viewingRecord.beneficiaryEntry === 'DONE' ? 'bg-emerald-100 text-emerald-800' :
                            viewingRecord.approvalStatus === 'REJECTED' || viewingRecord.beneficiaryEntry === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {viewingRecord.approvalStatus === 'REJECTED' ? 'CANCELLED' : viewingRecord.beneficiaryEntry}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-[10px] text-slate-600">
                          <div><span className="text-slate-400">Planned SLA:</span> <span className="font-semibold text-slate-800">{stage3Planned}</span></div>
                          <div><span className="text-slate-400">Actual:</span> <span className="font-semibold text-slate-800">{viewingRecord.beneficiaryEntryTimestamp || (viewingRecord.approvalStatus === 'REJECTED' ? 'Cancelled' : viewingRecord.beneficiaryEntry)}</span></div>
                        </div>
                      </div>

                      {/* Stage 4: Addition Status */}
                      <div className={`p-3 rounded-xl border space-y-1.5 shadow-2xs ${
                        viewingRecord.additionStatus === 'DONE' ? 'bg-white border-emerald-300' :
                        viewingRecord.approvalStatus === 'REJECTED' || viewingRecord.beneficiaryEntry === 'CANCELLED' || viewingRecord.additionStatus === 'CANCELLED' ? 'bg-slate-100 border-slate-200' : 'bg-amber-50/50 border-amber-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-[11px]">4. Addition Status</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            viewingRecord.additionStatus === 'DONE' ? 'bg-emerald-100 text-emerald-800' :
                            viewingRecord.approvalStatus === 'REJECTED' || viewingRecord.beneficiaryEntry === 'CANCELLED' || viewingRecord.additionStatus === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {viewingRecord.approvalStatus === 'REJECTED' ? 'CANCELLED' : viewingRecord.additionStatus}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-[10px] text-slate-600">
                          <div><span className="text-slate-400">Planned SLA:</span> <span className="font-semibold text-slate-800">{stage4Planned}</span></div>
                          <div><span className="text-slate-400">Actual:</span> <span className="font-semibold text-slate-800">{viewingRecord.additionTimestamp || (viewingRecord.approvalStatus === 'REJECTED' ? 'Cancelled' : viewingRecord.additionStatus)}</span></div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setViewingRecord(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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
