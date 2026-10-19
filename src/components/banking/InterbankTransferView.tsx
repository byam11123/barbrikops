import React, { useState } from 'react';
import { 
  ArrowRightLeft, Plus, Search, CheckCircle2, Clock, 
  FileText, Download, Check, X, XCircle, Eye, Landmark
} from 'lucide-react';
import { InterbankTransferRecord, UserProfile } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { NewIbtModal } from './NewIbtModal';
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
  { id: 'purpose', label: 'Purpose', defaultVisible: true },
  { id: 'proof', label: 'Debit Advice Proof', defaultVisible: true },
  { id: 'approvalStatus', label: 'Approval Status', defaultVisible: true },
  { id: 'bankEntry', label: 'Bank Entry Status', defaultVisible: true },
  { id: 'paymentStatus', label: 'Payment Status', defaultVisible: true },
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
  const [selectedIbtRecord, setSelectedIbtRecord] = useState<InterbankTransferRecord | null>(null);

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

  const refreshData = () => {
    setIbtRecords(storageAdapter.getIbtRecords());
    onRefresh();
  };

  const handleExportCsv = () => {
    const rows = [
      ['Sheet Ref', 'Date', 'Source Account (From)', 'Destination Account (To)', 'Amount (₹)', 'Purpose', 'Remark', 'Requested By', 'Approval Status', 'Approved By', 'Bank Entry Status', 'Payment Status', 'UTR Number'],
      ...filteredRecords.map(i => [
        i.sheetNo,
        i.timestamp,
        i.transferFrom,
        i.transferTo,
        i.amount,
        i.purpose || '—',
        i.remarks || '—',
        i.requestedBy,
        i.approvalStatus,
        i.approvedBy || '—',
        i.bankEntry || 'PENDING',
        i.paymentStatus,
        i.utrRef || '—',
      ])
    ];
    downloadCsv('Interbank_Transfers_Ledger', rows);
  };

  const filteredRecords = ibtRecords.filter(i => {
    if (statusFilter === 'PENDING' && i.approvalStatus !== 'PENDING') return false;
    if (statusFilter === 'APPROVED' && (i.approvalStatus !== 'APPROVED' || i.paymentStatus === 'DONE')) return false;
    if (statusFilter === 'SETTLED' && i.paymentStatus === 'DONE') return false;

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
                {visibleColumns.includes('purpose') && <th className="p-3.5">Purpose</th>}
                {visibleColumns.includes('proof') && <th className="p-3.5">Debit Advice Proof</th>}
                {visibleColumns.includes('approvalStatus') && <th className="p-3.5">Approval Status</th>}
                {visibleColumns.includes('bankEntry') && <th className="p-3.5">Bank Entry Status</th>}
                {visibleColumns.includes('paymentStatus') && <th className="p-3.5">Payment Status</th>}
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

                    {visibleColumns.includes('proof') && (
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            isOpen: true,
                            title: `Debit Advice / Bank Receipt - ${i.sheetNo}`,
                            fileUrl: i.paymentDoneProof || i.bankEntryProof,
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

                    {/* Approval Status Column */}
                    {visibleColumns.includes('approvalStatus') && (
                      <td className="p-3.5">
                        {i.approvalStatus === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                          </span>
                        )}
                        {i.approvalStatus === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                          </span>
                        )}
                        {i.approvalStatus === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                          </span>
                        )}
                      </td>
                    )}

                    {/* Bank Entry Status Column */}
                    {visibleColumns.includes('bankEntry') && (
                      <td className="p-3.5">
                        {(i.bankEntry === 'PENDING' || !i.bankEntry) && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                          </span>
                        )}
                        {i.bankEntry === 'DONE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                          </span>
                        )}
                        {i.bankEntry === 'CANCELLED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Cancelled
                          </span>
                        )}
                      </td>
                    )}

                    {/* Payment Status Column */}
                    {visibleColumns.includes('paymentStatus') && (
                      <td className="p-3.5">
                        {i.paymentStatus === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                          </span>
                        )}
                        {i.paymentStatus === 'DONE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                          </span>
                        )}
                        {i.paymentStatus === 'CANCELLED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Cancelled
                          </span>
                        )}
                      </td>
                    )}

                    {/* Actions Column */}
                    {visibleColumns.includes('actions') && (
                      <td className="p-3.5 pr-5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Step 1: Pending Approval -> Approve / Reject */}
                          {i.approvalStatus === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  storageAdapter.updateIbtRecordStatus(i.id, 'approvalStatus', 'APPROVED', currentUser);
                                  refreshData();
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Approve Request"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Approve</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  storageAdapter.updateIbtRecordStatus(i.id, 'approvalStatus', 'REJECTED', currentUser);
                                  refreshData();
                                }}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Reject Request"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Reject</span>
                              </button>
                            </>
                          )}

                          {/* Step 2: Approved, Awaiting Bank Entry -> Done / Cancelled */}
                          {i.approvalStatus === 'APPROVED' && (i.bankEntry === 'PENDING' || !i.bankEntry) && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  storageAdapter.updateIbtRecordStatus(i.id, 'bankEntry', 'DONE', currentUser);
                                  refreshData();
                                }}
                                className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Bank Entry Done"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Done</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  storageAdapter.updateIbtRecordStatus(i.id, 'bankEntry', 'CANCELLED', currentUser);
                                  refreshData();
                                }}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Cancel Bank Entry"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Cancelled</span>
                              </button>
                            </>
                          )}

                          {/* Step 3: Bank Entry Done, Awaiting Payment Status -> Done / Cancelled */}
                          {i.bankEntry === 'DONE' && i.paymentStatus === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  storageAdapter.updateIbtRecordStatus(i.id, 'paymentStatus', 'DONE', currentUser);
                                  refreshData();
                                }}
                                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Payment Settlement Done"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Done</span>
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  storageAdapter.updateIbtRecordStatus(i.id, 'paymentStatus', 'CANCELLED', currentUser);
                                  refreshData();
                                }}
                                className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Cancel Payment Settlement"
                              >
                                <X className="w-3.5 h-3.5" />
                                <span>Cancelled</span>
                              </button>
                            </>
                          )}

                          {/* Terminal State or Resolved -> View Only */}
                          {(i.approvalStatus === 'REJECTED' ||
                            i.bankEntry === 'CANCELLED' ||
                            i.paymentStatus === 'CANCELLED' ||
                            (i.approvalStatus === 'APPROVED' && i.bankEntry === 'DONE' && i.paymentStatus === 'DONE')) && (
                            <button
                              type="button"
                              onClick={() => setSelectedIbtRecord(i)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                              title="View Transfer Details"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-600" />
                              <span>View</span>
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

      {/* View Details Read-Only Modal (Matches Bank Payment UI) */}
      {selectedIbtRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full my-8 shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="px-3 py-1 bg-indigo-100 text-indigo-700 font-mono font-bold text-xs rounded-xl">
                  {selectedIbtRecord.sheetNo}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{selectedIbtRecord.transferFrom} ➔ {selectedIbtRecord.transferTo}</h3>
                  <p className="text-xs text-slate-500 font-medium">₹{selectedIbtRecord.amount.toLocaleString('en-IN')} • Interbank Transfer</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedIbtRecord(null)}
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-6 space-y-4 text-xs overflow-y-auto max-h-[80vh]">
              {/* Card 1: Interbank Transfer Specification */}
              <div className="bg-white p-4 rounded-2xl border border-slate-200 space-y-3">
                <h4 className="font-bold text-slate-900 text-xs border-b border-slate-100 pb-2">
                  Interbank Transfer Specification
                </h4>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Source Account (From)</span>
                    <span className="font-bold text-slate-900">{selectedIbtRecord.transferFrom}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Destination Account (To)</span>
                    <span className="font-bold text-indigo-900">{selectedIbtRecord.transferTo}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Amount</span>
                    <span className="font-mono font-bold text-indigo-700 text-sm">₹{selectedIbtRecord.amount.toLocaleString('en-IN')}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Requested Date</span>
                    <span className="font-semibold text-slate-800">{selectedIbtRecord.timestamp}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Purpose</span>
                    <span className="font-medium text-slate-800">{selectedIbtRecord.purpose}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[11px]">Requested By</span>
                    <span className="font-semibold text-slate-800">{selectedIbtRecord.requestedBy || 'System Requester'}</span>
                  </div>
                  <div className="col-span-2">
                    <span className="text-slate-500 block text-[11px]">Remark</span>
                    <span className="font-medium text-slate-800">{selectedIbtRecord.remarks || '—'}</span>
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
                    <span className="text-[11px] font-bold text-slate-500 block mb-1">Debit Advice / Settlement Proof</span>
                    {selectedIbtRecord.paymentDoneProof || selectedIbtRecord.bankEntryProof ? (
                      <button
                        type="button"
                        onClick={() => setPreviewDoc({
                          isOpen: true,
                          title: `Debit Advice / Bank Receipt - ${selectedIbtRecord.sheetNo}`,
                          fileUrl: selectedIbtRecord.paymentDoneProof || selectedIbtRecord.bankEntryProof,
                          referenceNo: selectedIbtRecord.sheetNo,
                          partyName: `${selectedIbtRecord.transferFrom} ➔ ${selectedIbtRecord.transferTo}`,
                          amount: selectedIbtRecord.amount
                        })}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                      >
                        <FileText className="w-3.5 h-3.5" />
                        <span>Inspect Debit Advice</span>
                      </button>
                    ) : (
                      <span className="text-slate-400 text-[11px]">Pending Bank Settlement</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Card 3: 4-Step FMS Lifecycle & SLA Execution Audit Log */}
              {(() => {
                const intakeDate = parseDateString(selectedIbtRecord.timestamp);
                const stage2PlannedDate = intakeDate ? addHours(intakeDate, 1) : null;
                const stage2Planned = formatDateDisplay(stage2PlannedDate);
                const stage2ActualDate = parseDateString(selectedIbtRecord.approvalTimestamp);

                const stage3BaseDate = stage2ActualDate || stage2PlannedDate;
                const stage3PlannedDate = stage3BaseDate ? addHours(stage3BaseDate, 1) : null;
                const stage3Planned = formatDateDisplay(stage3PlannedDate);
                const stage3ActualDate = parseDateString(selectedIbtRecord.bankEntryTimestamp);

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
                          <div><span className="text-slate-400">Actual:</span> <span className="font-semibold text-slate-800">{selectedIbtRecord.timestamp}</span></div>
                          <div><span className="text-slate-400">By:</span> <span className="font-medium text-slate-700">{selectedIbtRecord.requestedBy || 'Requester'}</span></div>
                        </div>
                      </div>

                      {/* Stage 2: Approval */}
                      <div className={`p-3 rounded-xl border space-y-1.5 shadow-2xs ${
                        selectedIbtRecord.approvalStatus === 'APPROVED' ? 'bg-white border-emerald-300' :
                        selectedIbtRecord.approvalStatus === 'REJECTED' ? 'bg-rose-50/50 border-rose-200' : 'bg-amber-50/50 border-amber-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-[11px]">2. Approval</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            selectedIbtRecord.approvalStatus === 'APPROVED' ? 'bg-emerald-100 text-emerald-800' :
                            selectedIbtRecord.approvalStatus === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {selectedIbtRecord.approvalStatus}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-[10px] text-slate-600">
                          <div><span className="text-slate-400">Planned SLA:</span> <span className="font-semibold text-slate-800">{stage2Planned}</span></div>
                          <div><span className="text-slate-400">Actual:</span> <span className="font-semibold text-slate-800">{selectedIbtRecord.approvalTimestamp || selectedIbtRecord.approvalStatus}</span></div>
                        </div>
                      </div>

                      {/* Stage 3: Bank Entry */}
                      <div className={`p-3 rounded-xl border space-y-1.5 shadow-2xs ${
                        selectedIbtRecord.bankEntry === 'DONE' ? 'bg-white border-emerald-300' :
                        selectedIbtRecord.bankEntry === 'CANCELLED' ? 'bg-slate-100 border-slate-200' : 'bg-amber-50/50 border-amber-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-[11px]">3. Bank Entry</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            selectedIbtRecord.bankEntry === 'DONE' ? 'bg-emerald-100 text-emerald-800' :
                            selectedIbtRecord.bankEntry === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {selectedIbtRecord.bankEntry || 'PENDING'}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-[10px] text-slate-600">
                          <div><span className="text-slate-400">Planned SLA:</span> <span className="font-semibold text-slate-800">{stage3Planned}</span></div>
                          <div><span className="text-slate-400">Actual:</span> <span className="font-semibold text-slate-800">{selectedIbtRecord.bankEntryTimestamp || selectedIbtRecord.bankEntry || 'Pending'}</span></div>
                        </div>
                      </div>

                      {/* Stage 4: Payment Status */}
                      <div className={`p-3 rounded-xl border space-y-1.5 shadow-2xs ${
                        selectedIbtRecord.paymentStatus === 'DONE' ? 'bg-white border-emerald-300' :
                        selectedIbtRecord.paymentStatus === 'CANCELLED' ? 'bg-slate-100 border-slate-200' : 'bg-amber-50/50 border-amber-300'
                      }`}>
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-slate-900 text-[11px]">4. Settlement</span>
                          <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            selectedIbtRecord.paymentStatus === 'DONE' ? 'bg-emerald-100 text-emerald-800' :
                            selectedIbtRecord.paymentStatus === 'CANCELLED' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {selectedIbtRecord.paymentStatus}
                          </span>
                        </div>
                        <div className="space-y-0.5 text-[10px] text-slate-600">
                          <div><span className="text-slate-400">Planned SLA:</span> <span className="font-semibold text-slate-800">{stage4Planned}</span></div>
                          <div><span className="text-slate-400">Actual:</span> <span className="font-semibold text-slate-800">{selectedIbtRecord.paymentDoneTimestamp || selectedIbtRecord.paymentStatus || 'Pending'}</span></div>
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
                onClick={() => setSelectedIbtRecord(null)}
                className="px-4 py-2 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>
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
