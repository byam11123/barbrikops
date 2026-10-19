import React, { useState, useEffect } from 'react';
import { 
  Landmark, Plus, Search, Filter, AlertTriangle, CheckCircle2, Clock, 
  ExternalLink, ShieldCheck, Eye, RefreshCw, Download, FileText, Check, X, XCircle
} from 'lucide-react';
import { BankPaymentRecord, UserProfile, isUserDirector } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { NewBankPaymentModal } from './NewBankPaymentModal';
import { PaymentDetailDrawer } from './PaymentDetailDrawer';
import { AttachmentPreviewModal } from './AttachmentPreviewModal';
import { ColumnCustomizerPopover, ColumnOption } from './ColumnCustomizerPopover';
import { downloadCsv } from './exportCsvHelper';

interface BankPaymentsFmsViewProps {
  currentUser: UserProfile;
  searchQuery: string;
  siteFilter: string;
  onRefresh: () => void;
}

const BANK_PAYMENT_COLUMNS: ColumnOption[] = [
  { id: 'sheetNo', label: 'Sheet Ref', defaultVisible: true },
  { id: 'vendorName', label: 'Vendor Name', defaultVisible: true },
  { id: 'beneficiaryName', label: 'Name of Beneficiary', defaultVisible: true },
  { id: 'amount', label: 'Amount (₹)', defaultVisible: true },
  { id: 'mode', label: 'Payment Mode', defaultVisible: true },
  { id: 'site', label: 'Site', defaultVisible: true },
  { id: 'proof', label: 'Cheque / Proof', defaultVisible: true },
  { id: 'approvalStatus', label: 'Approval Status', defaultVisible: true },
  { id: 'paymentEntry', label: 'Bank Entry Status', defaultVisible: true },
  { id: 'paymentStatus', label: 'Payment Status', defaultVisible: true },
  { id: 'actions', label: 'Actions', defaultVisible: true },
];

const STORAGE_KEY = 'barbrik_bank_col_prefs_payments_v1';

export const BankPaymentsFmsView: React.FC<BankPaymentsFmsViewProps> = ({
  currentUser,
  searchQuery,
  siteFilter,
  onRefresh,
}) => {
  const [payments, setPayments] = useState<BankPaymentRecord[]>(() => storageAdapter.getBankPayments());
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DONE'>('ALL');
  const [mismatchOnly, setMismatchOnly] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<BankPaymentRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Attachment Preview Modal State
  const [previewDoc, setPreviewDoc] = useState<{
    isOpen: boolean;
    title: string;
    docType: 'CHEQUE' | 'DEBIT_ADVICE' | 'PORTAL_ENTRY' | 'INVOICE' | 'OTHER';
    url?: string;
    referenceNo?: string;
    partyName?: string;
    amount?: number;
  }>({
    isOpen: false,
    title: '',
    docType: 'OTHER',
  });

  // Column preferences
  const [visibleColumns, setVisibleColumns] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) return JSON.parse(saved);
    } catch {
      // ignore
    }
    return BANK_PAYMENT_COLUMNS.filter(c => c.defaultVisible).map(c => c.id);
  });

  const isDirector = isUserDirector(currentUser);
  const isAccounts = (currentUser.departmentKeys || []).includes('ACCOUNTS') || 
                     (currentUser.departmentName || '').toUpperCase().includes('ACCOUNTS') || 
                     currentUser.role.toUpperCase().includes('ACCOUNTS');

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

  const handleQuickPortalEntry = (e: React.MouseEvent, p: BankPaymentRecord) => {
    e.stopPropagation();
    storageAdapter.recordBankPaymentEntry(p.id, 'DONE', undefined, currentUser);
    refreshData();
  };

  const handleExportCsv = () => {
    const rows = [
      ['Sheet Ref', 'Date', 'Vendor Name', 'Name of Beneficiary', 'Name Mismatch', 'Amount (₹)', 'Mode', 'Site', 'Purpose', 'Approval Status', 'Approved By', 'Portal Entry', 'Settlement Status', 'UTR Number', 'Requested By'],
      ...filteredPayments.map(p => [
        p.sheetNo,
        p.timestamp,
        p.vendorName,
        p.beneficiaryName,
        p.isNameMismatch ? 'YES (MISMATCH)' : 'NO',
        p.amountToBePaid,
        p.modeOfPayment,
        p.site,
        p.purposeOfPayment,
        p.approvalStatus,
        p.approvedBy || '—',
        p.paymentEntry,
        p.paymentStatus,
        p.remarks || '—',
        p.requestedBy,
      ])
    ];
    downloadCsv('Bank_Disbursement_Register', rows);
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

    const effectiveSearch = (localSearch || searchQuery || '').trim().toLowerCase();
    if (effectiveSearch !== '') {
      const q = effectiveSearch;
      const matchVendor = (p.vendorName || '').toLowerCase().includes(q);
      const matchBen = (p.beneficiaryName || '').toLowerCase().includes(q);
      const matchSheet = (p.sheetNo || '').toLowerCase().includes(q);
      const matchPurpose = (p.purposeOfPayment || '').toLowerCase().includes(q);
      const matchSite = (p.site || '').toLowerCase().includes(q);
      const matchBill = (p.billNoPo || '').toLowerCase().includes(q);
      const matchMode = (p.modeOfPayment || '').toLowerCase().includes(q);
      const matchAmount = (p.amountToBePaid ? String(p.amountToBePaid) : '').includes(q);
      const matchReq = (p.requestedBy || '').toLowerCase().includes(q);
      if (!matchVendor && !matchBen && !matchSheet && !matchPurpose && !matchSite && !matchBill && !matchMode && !matchAmount && !matchReq) return false;
    }

    return true;
  });

  // KPI calculations
  const pendingApprovalList = payments.filter(p => p.approvalStatus === 'PENDING');
  const pendingApprovalSum = pendingApprovalList.reduce((acc, curr) => acc + (curr.amountToBePaid || 0), 0);

  const awaitingEntryList = payments.filter(p => p.approvalStatus === 'APPROVED' && p.paymentStatus !== 'DONE');
  const awaitingEntrySum = awaitingEntryList.reduce((acc, curr) => acc + (curr.amountToBePaid || 0), 0);

  const settledList = payments.filter(p => p.paymentStatus === 'DONE');
  const settledSum = settledList.reduce((acc, curr) => acc + (curr.amountToBePaid || 0), 0);

  const mismatchList = payments.filter(p => p.isNameMismatch);
  const mismatchSum = mismatchList.reduce((acc, curr) => acc + (curr.amountToBePaid || 0), 0);

  return (
    <div className="space-y-4">
      {/* 4 Interactive Stat Cards (2 Count Cards + 2 Amount Cards) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Count Card 1: Pending Sanctions */}
        <div 
          onClick={() => {
            setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING');
            setMismatchOnly(false);
          }}
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
              {pendingApprovalList.length}
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

        {/* Count Card 2: Awaiting Bank Entry */}
        <div 
          onClick={() => {
            setStatusFilter(statusFilter === 'APPROVED' ? 'ALL' : 'APPROVED');
            setMismatchOnly(false);
          }}
          title="Click to filter by Awaiting NetBanking Punch"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'APPROVED' 
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'APPROVED' ? 'text-white' : 'text-indigo-600'}`}>
              Awaiting Bank Entry
            </span>
            <Landmark className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'APPROVED' ? 'text-white' : 'text-indigo-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-4xl font-black ${statusFilter === 'APPROVED' ? 'text-white' : 'text-slate-900'}`}>
              {awaitingEntryList.length}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'APPROVED'
                ? 'bg-white/25 text-white'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            }`}>
              Accounts Queue
            </span>
          </div>
        </div>

        {/* Amount Card 3: Pending Sanction Value */}
        <div 
          onClick={() => {
            setStatusFilter(statusFilter === 'PENDING' ? 'ALL' : 'PENDING');
            setMismatchOnly(false);
          }}
          title="Click to filter by Pending Sanction Value"
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
            <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'PENDING' ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-xl sm:text-3xl font-black font-mono ${statusFilter === 'PENDING' ? 'text-white' : 'text-slate-900'}`}>
              ₹{pendingApprovalSum.toLocaleString('en-IN')}
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

        {/* Amount Card 4: Settled Disbursed Value */}
        <div 
          onClick={() => {
            setStatusFilter(statusFilter === 'DONE' ? 'ALL' : 'DONE');
            setMismatchOnly(false);
          }}
          title="Click to filter by Settled Disbursements"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'DONE' 
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'DONE' ? 'text-white' : 'text-emerald-600'}`}>
              Settled Disbursed
            </span>
            <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'DONE' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-xl sm:text-3xl font-black font-mono ${statusFilter === 'DONE' ? 'text-white' : 'text-slate-900'}`}>
              ₹{settledSum.toLocaleString('en-IN')}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'DONE'
                ? 'bg-white/25 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              Confirmed UTR
            </span>
          </div>
        </div>
      </div>

      {/* Table Controls & Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        {/* Row 1: Search Bar & Action Buttons */}
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box in Filter Bar */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={localSearch}
              onChange={(e) => setLocalSearch(e.target.value)}
              placeholder="Search payments by Sheet Ref, Vendor, Beneficiary, Amount, Site..."
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

          {/* Action Controls */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* Column Customizer */}
            <ColumnCustomizerPopover
              storageKey={STORAGE_KEY}
              availableColumns={BANK_PAYMENT_COLUMNS}
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

            {/* Create Requisition Action Button */}
            <button
              onClick={() => setIsNewModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer shrink-0"
            >
              <Plus className="w-4 h-4" />
              <span>+ New Payment Request</span>
            </button>
          </div>
        </div>

        {/* Row 2: Status Facet Tabs & Filter Reset Counter */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2.5 border-t border-slate-100">
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
              Pending Sanction ({pendingApprovalList.length})
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
              Awaiting Bank Entry ({awaitingEntryList.length})
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
              Settled ({settledList.length})
            </button>
            <button
              type="button"
              onClick={() => setMismatchOnly(!mismatchOnly)}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all flex items-center gap-1 cursor-pointer ${
                mismatchOnly
                  ? 'bg-rose-600 text-white shadow-2xs'
                  : 'bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>Name Mismatch ({mismatchList.length})</span>
            </button>
          </div>

          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <span>
              Showing <strong className="text-slate-800">{filteredPayments.length}</strong> of {payments.length} payments
            </span>
            {(statusFilter !== 'ALL' || mismatchOnly || localSearch) && (
              <button
                type="button"
                onClick={() => { setStatusFilter('ALL'); setMismatchOnly(false); setLocalSearch(''); }}
                className="text-indigo-600 hover:underline font-semibold cursor-pointer"
              >
                Reset filters
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="bg-slate-100 text-slate-900 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                {visibleColumns.includes('sheetNo') && <th className="p-3.5 pl-5">Sheet Ref</th>}
                {visibleColumns.includes('vendorName') && <th className="p-3.5">Vendor Name</th>}
                {visibleColumns.includes('beneficiaryName') && <th className="p-3.5">Name of Beneficiary</th>}
                {visibleColumns.includes('amount') && <th className="p-3.5">Amount (₹)</th>}
                {visibleColumns.includes('mode') && <th className="p-3.5">Mode</th>}
                {visibleColumns.includes('site') && <th className="p-3.5">Site</th>}
                {visibleColumns.includes('proof') && <th className="p-3.5">Cheque / Proof</th>}
                {visibleColumns.includes('approvalStatus') && <th className="p-3.5">Approval Status</th>}
                {visibleColumns.includes('paymentEntry') && <th className="p-3.5">Bank Entry Status</th>}
                {visibleColumns.includes('paymentStatus') && <th className="p-3.5">Payment Status</th>}
                {visibleColumns.includes('actions') && <th className="p-3.5 text-right pr-5">Actions</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredPayments.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length} className="p-10 text-center text-slate-400 font-medium">
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
                    {visibleColumns.includes('sheetNo') && (
                      <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                        <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-indigo-700">
                          {p.sheetNo}
                        </span>
                      </td>
                    )}

                    {visibleColumns.includes('vendorName') && (
                      <td className="p-3.5 font-bold text-slate-900">
                        {p.vendorName}
                        {p.billNoPo && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Ref: {p.billNoPo}
                          </span>
                        )}
                      </td>
                    )}

                    {visibleColumns.includes('beneficiaryName') && (
                      <td className="p-3.5">
                        <span className="font-semibold text-slate-900">{p.beneficiaryName}</span>
                        {p.isNameMismatch && (
                          <span className="mt-0.5 inline-flex items-center gap-0.5 px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded-md border border-amber-200">
                            <AlertTriangle className="w-3 h-3 text-amber-600" /> Name Mismatch
                          </span>
                        )}
                      </td>
                    )}

                    {visibleColumns.includes('amount') && (
                      <td className="p-3.5 font-mono font-bold text-indigo-700 text-sm">
                        ₹{p.amountToBePaid.toLocaleString('en-IN')}
                      </td>
                    )}

                    {visibleColumns.includes('mode') && (
                      <td className="p-3.5 font-bold text-slate-700">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] ${
                          p.modeOfPayment === 'UPI' ? 'bg-indigo-100 text-indigo-800' : 'bg-slate-100 text-slate-800'
                        }`}>
                          {p.modeOfPayment}
                        </span>
                      </td>
                    )}

                    {visibleColumns.includes('site') && (
                      <td className="p-3.5 font-medium text-slate-700">
                        {p.site}
                      </td>
                    )}

                    {visibleColumns.includes('proof') && (
                      <td className="p-3.5" onClick={(e) => e.stopPropagation()}>
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({
                            isOpen: true,
                            title: `Cancelled Cheque Proof - ${p.beneficiaryName}`,
                            docType: 'CHEQUE',
                            url: p.cancelledChequeUrl,
                            referenceNo: p.sheetNo,
                            partyName: p.beneficiaryName,
                            amount: p.amountToBePaid
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
                        {p.approvalStatus === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                          </span>
                        )}
                        {p.approvalStatus === 'APPROVED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Approved
                          </span>
                        )}
                        {p.approvalStatus === 'REJECTED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Rejected
                          </span>
                        )}
                      </td>
                    )}

                    {/* Bank Entry Status Column */}
                    {visibleColumns.includes('paymentEntry') && (
                      <td className="p-3.5">
                        {p.paymentEntry === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                          </span>
                        )}
                        {p.paymentEntry === 'DONE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                          </span>
                        )}
                        {p.paymentEntry === 'CANCELLED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Cancelled
                          </span>
                        )}
                      </td>
                    )}

                    {/* Payment Status Column */}
                    {visibleColumns.includes('paymentStatus') && (
                      <td className="p-3.5">
                        {p.paymentStatus === 'PENDING' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" /> Pending
                          </span>
                        )}
                        {p.paymentStatus === 'DONE' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Done
                          </span>
                        )}
                        {p.paymentStatus === 'CANCELLED' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                            <XCircle className="w-3 h-3 text-rose-600" /> Cancelled
                          </span>
                        )}
                      </td>
                    )}

                    {/* Actions Column */}
                    {visibleColumns.includes('actions') && (
                      <td className="p-3.5 pr-5 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Step 1: Pending Approval -> Approve / Reject */}
                          {p.approvalStatus === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  storageAdapter.updateBankPaymentStatus(p.id, 'approvalStatus', 'APPROVED', currentUser);
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
                                  storageAdapter.updateBankPaymentStatus(p.id, 'approvalStatus', 'REJECTED', currentUser);
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
                          {p.approvalStatus === 'APPROVED' && p.paymentEntry === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  storageAdapter.updateBankPaymentStatus(p.id, 'paymentEntry', 'DONE', currentUser);
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
                                  storageAdapter.updateBankPaymentStatus(p.id, 'paymentEntry', 'CANCELLED', currentUser);
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
                          {p.paymentEntry === 'DONE' && p.paymentStatus === 'PENDING' && (
                            <>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  storageAdapter.updateBankPaymentStatus(p.id, 'paymentStatus', 'DONE', currentUser);
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
                                  storageAdapter.updateBankPaymentStatus(p.id, 'paymentStatus', 'CANCELLED', currentUser);
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
                          {(p.approvalStatus === 'REJECTED' ||
                            p.paymentEntry === 'CANCELLED' ||
                            p.paymentStatus === 'CANCELLED' ||
                            (p.approvalStatus === 'APPROVED' && p.paymentEntry === 'DONE' && p.paymentStatus === 'DONE')) && (
                            <button
                              type="button"
                              onClick={() => handleRowClick(p)}
                              className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition-colors cursor-pointer flex items-center gap-1"
                              title="View Record Details"
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

      {/* Creation Modal */}
      <NewBankPaymentModal
        isOpen={isNewModalOpen}
        onClose={() => setIsNewModalOpen(false)}
        currentUser={currentUser}
        onSubmit={refreshData}
      />

      {/* Split Drawer */}
      <PaymentDetailDrawer
        payment={selectedPayment}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentUser={currentUser}
        onUpdate={refreshData}
      />

      {/* In-App Proof Preview Modal */}
      <AttachmentPreviewModal
        isOpen={previewDoc.isOpen}
        onClose={() => setPreviewDoc(prev => ({ ...prev, isOpen: false }))}
        title={previewDoc.title}
        documentType={previewDoc.docType}
        fileUrl={previewDoc.url}
        referenceNo={previewDoc.referenceNo}
        partyName={previewDoc.partyName}
        amount={previewDoc.amount}
      />
    </div>
  );
};
