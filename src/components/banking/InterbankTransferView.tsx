import React, { useState } from 'react';
import { 
  ArrowRightLeft, Plus, Search, Filter, ShieldCheck, CheckCircle2, Clock, 
  FileText, Download, Check, ExternalLink, Building2, Landmark
} from 'lucide-react';
import { InterbankTransferRecord, UserProfile, isUserDirector } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { NewIbtModal } from './NewIbtModal';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { ColumnCustomizerPopover, ColumnOption } from './ColumnCustomizerPopover';
import { downloadCsv } from './exportCsvHelper';

interface InterbankTransferViewProps {
  currentUser: UserProfile;
  searchQuery: string;
  onRefresh: () => void;
}

const IBT_COLUMNS: ColumnOption[] = [
  { id: 'sheetNo', label: 'Sheet Ref', defaultVisible: true },
  { id: 'timestamp', label: 'Date', defaultVisible: true },
  { id: 'transferFrom', label: 'Source Bank (From)', defaultVisible: true },
  { id: 'transferTo', label: 'Destination Bank (To)', defaultVisible: true },
  { id: 'amount', label: 'Amount (₹)', defaultVisible: true },
  { id: 'purpose', label: 'Purpose / Remarks', defaultVisible: true },
  { id: 'approvalStatus', label: 'Approval Status', defaultVisible: true },
  { id: 'paymentStatus', label: 'Settlement & UTR', defaultVisible: true },
  { id: 'proof', label: 'Debit Advice Proof', defaultVisible: true },
  { id: 'actions', label: 'Actions', defaultVisible: true },
];

const STORAGE_KEY = 'barbrik_bank_col_prefs_ibt_v1';

export const InterbankTransferView: React.FC<InterbankTransferViewProps> = ({
  currentUser,
  searchQuery,
  onRefresh,
}) => {
  const [ibtRecords, setIbtRecords] = useState<InterbankTransferRecord[]>(() => storageAdapter.getIbtRecords());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'SETTLED'>('ALL');
  const [localSearch, setLocalSearch] = useState('');
  const [isNewModalOpen, setIsNewModalOpen] = useState(false);

  // Quick UTR Recording Dialog
  const [utrDialog, setUtrDialog] = useState<{
    isOpen: boolean;
    record: InterbankTransferRecord | null;
    utrValue: string;
    proofUrl: string;
  }>({
    isOpen: false,
    record: null,
    utrValue: '',
    proofUrl: '',
  });

  // Proof Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<{
    isOpen: boolean;
    title: string;
    fileUrl?: string;
    referenceNo?: string;
    partyName?: string;
    amount?: number;
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
    return IBT_COLUMNS.filter(c => c.defaultVisible).map(c => c.id);
  });

  const isDirector = isUserDirector(currentUser);
  const isAccounts = (currentUser.departmentKeys || []).includes('ACCOUNTS') || 
                     (currentUser.departmentName || '').toUpperCase().includes('ACCOUNTS') || 
                     currentUser.role.toUpperCase().includes('ACCOUNTS');

  const refreshData = () => {
    setIbtRecords(storageAdapter.getIbtRecords());
    onRefresh();
  };

  const handleApprove = (e: React.MouseEvent, record: InterbankTransferRecord) => {
    e.stopPropagation();
    storageAdapter.approveIbtRecord(record.id, true, currentUser);
    refreshData();
  };

  const handleOpenUtrDialog = (e: React.MouseEvent, record: InterbankTransferRecord) => {
    e.stopPropagation();
    setUtrDialog({
      isOpen: true,
      record,
      utrValue: record.utrRef || '',
      proofUrl: record.paymentDoneProof || '',
    });
  };

  const handleSubmitUtr = (e: React.FormEvent) => {
    e.preventDefault();
    if (!utrDialog.record || !utrDialog.utrValue.trim()) return;

    storageAdapter.finalizeIbtPayment(
      utrDialog.record.id,
      'DONE',
      utrDialog.utrValue.trim(),
      utrDialog.proofUrl.trim() || undefined,
      currentUser
    );

    setUtrDialog({ isOpen: false, record: null, utrValue: '', proofUrl: '' });
    refreshData();
  };

  const handleExportCsv = () => {
    const rows = [
      ['Sheet Ref', 'Date', 'Source Account (From)', 'Destination Account (To)', 'Amount (₹)', 'Purpose / Justification', 'Requested By', 'Approval Status', 'Approved By', 'Settlement Status', 'UTR Number', 'Settled Date'],
      ...filteredRecords.map(i => [
        i.sheetNo,
        i.timestamp,
        i.transferFrom,
        i.transferTo,
        i.amount,
        i.purpose || '—',
        i.requestedBy,
        i.approvalStatus,
        i.approvedBy || '—',
        i.paymentStatus === 'DONE' ? 'Settled' : 'Pending',
        i.utrRef || '—',
        i.paymentDoneTimestamp || '—',
      ])
    ];
    downloadCsv('Interbank_Transfers_Ledger', rows);
  };

  const filteredRecords = ibtRecords.filter(i => {
    if (statusFilter === 'PENDING' && i.approvalStatus !== 'PENDING') return false;
    if (statusFilter === 'APPROVED' && (i.approvalStatus !== 'APPROVED' || i.paymentStatus === 'DONE')) return false;
    if (statusFilter === 'SETTLED' && i.paymentStatus !== 'DONE') return false;

    const effectiveSearch = (localSearch || searchQuery || '').trim().toLowerCase();
    if (effectiveSearch !== '') {
      const q = effectiveSearch;
      const matchFrom = (i.transferFrom || '').toLowerCase().includes(q);
      const matchTo = (i.transferTo || '').toLowerCase().includes(q);
      const matchPurpose = (i.purpose || '').toLowerCase().includes(q);
      const matchSheet = (i.sheetNo || '').toLowerCase().includes(q);
      const matchUtr = (i.utrRef || '').toLowerCase().includes(q);
      const matchAmount = (i.amount ? String(i.amount) : '').includes(q);
      const matchReq = (i.requestedBy || '').toLowerCase().includes(q);
      if (!matchFrom && !matchTo && !matchPurpose && !matchSheet && !matchUtr && !matchAmount && !matchReq) return false;
    }

    return true;
  });

  // KPI calculations
  const pendingDirector = ibtRecords.filter(i => i.approvalStatus === 'PENDING');
  const pendingDirectorSum = pendingDirector.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const awaitingUtr = ibtRecords.filter(i => i.approvalStatus === 'APPROVED' && i.paymentStatus !== 'DONE');
  const awaitingUtrSum = awaitingUtr.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  const settled = ibtRecords.filter(i => i.paymentStatus === 'DONE');
  const settledSum = settled.reduce((acc, curr) => acc + (curr.amount || 0), 0);

  return (
    <div className="space-y-4">
      {/* 4 Interactive Stat Cards (2 Count Cards + 2 Amount Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Count Card 1: Pending Sanctions */}
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
              {pendingDirector.length}
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

        {/* Count Card 2: Awaiting Bank UTR */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED')}
          title="Click to filter by Awaiting UTR Punch"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'APPROVED' 
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'APPROVED' ? 'text-white' : 'text-indigo-600'}`}>
              Awaiting Bank UTR
            </span>
            <Landmark className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'APPROVED' ? 'text-white' : 'text-indigo-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-4xl font-black ${statusFilter === 'APPROVED' ? 'text-white' : 'text-slate-900'}`}>
              {awaitingUtr.length}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'APPROVED'
                ? 'bg-white/25 text-white'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            }`}>
              Accounts Punch
            </span>
          </div>
        </div>

        {/* Amount Card 3: Pending Sanction Value */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          title="Click to filter by Pending Sanctions Value"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'PENDING' 
              ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'PENDING' ? 'text-white' : 'text-amber-700'}`}>
              Pending Amount
            </span>
            <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'PENDING' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-xl sm:text-3xl font-black font-mono ${statusFilter === 'PENDING' ? 'text-white' : 'text-slate-900'}`}>
              ₹{pendingDirectorSum.toLocaleString('en-IN')}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'PENDING'
                ? 'bg-white/25 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}>
              To Sanction
            </span>
          </div>
        </div>

        {/* Amount Card 4: Settled Liquidity Value */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'SETTLED' ? 'ALL' : 'SETTLED')}
          title="Click to filter by Settled Transfers"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'SETTLED' 
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'SETTLED' ? 'text-white' : 'text-emerald-600'}`}>
              Settled Liquidity
            </span>
            <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'SETTLED' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-xl sm:text-3xl font-black font-mono ${statusFilter === 'SETTLED' ? 'text-white' : 'text-slate-900'}`}>
              ₹{settledSum.toLocaleString('en-IN')}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'SETTLED'
                ? 'bg-white/25 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              Disbursed
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
              placeholder="Search by From/To Account, Purpose, Sheet Ref, Amount, UTR..."
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
              availableColumns={IBT_COLUMNS}
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

            {/* New IBT Modal */}
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Interbank Transfer</span>
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
              All ({ibtRecords.length})
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
              Pending Sanction ({pendingDirector.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('APPROVED')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'APPROVED'
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Awaiting UTR ({awaitingUtr.length})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('SETTLED')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer ${
                statusFilter === 'SETTLED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Settled ({settled.length})
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{filteredRecords.length}</strong> of {ibtRecords.length} transfers
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
                {visibleColumns.includes('timestamp') && <th className="p-3.5">Date</th>}
                {visibleColumns.includes('transferFrom') && <th className="p-3.5">Source Bank (From)</th>}
                {visibleColumns.includes('transferTo') && <th className="p-3.5">Destination Bank (To)</th>}
                {visibleColumns.includes('amount') && <th className="p-3.5">Amount (₹)</th>}
                {visibleColumns.includes('purpose') && <th className="p-3.5">Purpose / Remarks</th>}
                {visibleColumns.includes('approvalStatus') && <th className="p-3.5">Approval Status</th>}
                {visibleColumns.includes('paymentStatus') && <th className="p-3.5">Settlement (UTR)</th>}
                {visibleColumns.includes('proof') && <th className="p-3.5">Debit Advice Proof</th>}
                {visibleColumns.includes('actions') && <th className="p-3.5 text-right pr-5">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="p-10 text-center text-slate-400 font-medium">
                    No interbank transfer records match your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((i) => (
                  <tr key={i.id} className="hover:bg-indigo-50/40 transition-colors">
                    {visibleColumns.includes('sheetNo') && (
                      <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                        <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-indigo-700">
                          {i.sheetNo}
                        </span>
                      </td>
                    )}

                    {visibleColumns.includes('timestamp') && (
                      <td className="p-3.5 text-slate-600 font-medium">
                        {i.timestamp}
                      </td>
                    )}

                    {visibleColumns.includes('transferFrom') && (
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Landmark className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>{i.transferFrom}</span>
                        </div>
                      </td>
                    )}

                    {visibleColumns.includes('transferTo') && (
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5 text-indigo-900">
                          <Landmark className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span>{i.transferTo}</span>
                        </div>
                      </td>
                    )}

                    {visibleColumns.includes('amount') && (
                      <td className="p-3.5 font-mono font-bold text-indigo-700 text-sm">
                        ₹{i.amount.toLocaleString('en-IN')}
                      </td>
                    )}

                    {visibleColumns.includes('purpose') && (
                      <td className="p-3.5 text-slate-600 max-w-xs truncate" title={i.purpose}>
                        {i.purpose}
                      </td>
                    )}

                    {visibleColumns.includes('approvalStatus') && (
                      <td className="p-3.5">
                        {i.approvalStatus === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending Sanction
                          </span>
                        )}
                        {i.approvalStatus === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Sanctioned
                          </span>
                        )}
                        {i.approvalStatus === 'REJECTED' && (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800">
                            Rejected
                          </span>
                        )}
                      </td>
                    )}

                    {visibleColumns.includes('paymentStatus') && (
                      <td className="p-3.5">
                        {i.paymentStatus === 'DONE' ? (
                          <div className="space-y-0.5">
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Settled
                            </span>
                            <div className="font-mono text-[10px] text-slate-500 font-bold">
                              UTR: {i.utrRef || 'REF-N/A'}
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
                            <Clock className="w-3 h-3 text-slate-500" /> Awaiting Debit
                          </span>
                        )}
                      </td>
                    )}

                    {visibleColumns.includes('proof') && (
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            isOpen: true,
                            title: `Debit Advice / Bank Receipt - ${i.sheetNo}`,
                            fileUrl: i.paymentDoneProof,
                            referenceNo: i.sheetNo,
                            partyName: `${i.transferFrom} ➔ ${i.transferTo}`,
                            amount: i.amount
                          })}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-bold text-[11px] transition-colors cursor-pointer"
                        >
                          <FileText className="w-3.5 h-3.5" />
                          <span>View Proof</span>
                        </button>
                      </td>
                    )}

                    {visibleColumns.includes('actions') && (
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Director-Exclusive Sanction Action */}
                          {isDirector && i.approvalStatus === 'PENDING' && (
                            <button
                              onClick={(e) => handleApprove(e, i)}
                              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Sanction Liquidity Transfer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Sanction</span>
                            </button>
                          )}

                          {/* Accounts UTR Finalization Button */}
                          {isAccounts && i.approvalStatus === 'APPROVED' && i.paymentStatus !== 'DONE' && (
                            <button
                              onClick={(e) => handleOpenUtrDialog(e, i)}
                              className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                              title="Record Bank Debit UTR Number"
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>Record UTR</span>
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Record UTR Dialog */}
      {utrDialog.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95">
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div>
                <h4 className="text-sm font-bold text-slate-900">Record Bank Debit UTR</h4>
                <p className="text-xs text-slate-500 font-mono">Ref: {utrDialog.record?.sheetNo}</p>
              </div>
              <button
                type="button"
                onClick={() => setUtrDialog({ isOpen: false, record: null, utrValue: '', proofUrl: '' })}
                className="text-slate-400 hover:text-slate-600 text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitUtr} className="p-5 space-y-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bank UTR / Transaction Reference Number *
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. UTR-9821873192 or CMS-77123"
                  value={utrDialog.utrValue}
                  onChange={(e) => setUtrDialog(prev => ({ ...prev, utrValue: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Debit Advice / Proof URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Paste URL or reference of bank debit receipt"
                  value={utrDialog.proofUrl}
                  onChange={(e) => setUtrDialog(prev => ({ ...prev, proofUrl: e.target.value }))}
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUtrDialog({ isOpen: false, record: null, utrValue: '', proofUrl: '' })}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-xs cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-colors shadow-xs cursor-pointer"
                >
                  Confirm Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Creation Modal */}
      <NewIbtModal
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
        documentType="DEBIT_ADVICE"
        fileUrl={previewDoc.fileUrl}
        referenceNo={previewDoc.referenceNo}
        partyName={previewDoc.partyName}
        amount={previewDoc.amount}
      />
    </div>
  );
};
