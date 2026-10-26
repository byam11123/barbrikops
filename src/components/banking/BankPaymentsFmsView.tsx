import React, { useState, useEffect } from 'react';
import { 
  Landmark, Plus, Search, Filter, AlertTriangle, CheckCircle2, Clock, 
  ExternalLink, ShieldCheck, ShieldAlert, Eye, RefreshCw, Download, FileText, Check, X, XCircle,
  ChevronUp, ChevronDown, ArrowUpDown
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'DONE' | 'PENDING_GRN'>('ALL');
  const [mismatchOnly, setMismatchOnly] = useState(false);
  const [localSearch, setLocalSearch] = useState('');

  const [isNewModalOpen, setIsNewModalOpen] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState<BankPaymentRecord | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

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
    } else if (statusFilter === 'PENDING_GRN') {
      if (p.approvalStatus !== 'PENDING_GRN') return false;
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

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  const sortedPayments = React.useMemo(() => {
    if (!sortConfig) return filteredPayments;
    const { key, direction } = sortConfig;
    return [...filteredPayments].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      switch (key) {
        case 'sheetNo':
          aVal = (a.sheetNo || '').toLowerCase();
          bVal = (b.sheetNo || '').toLowerCase();
          break;
        case 'vendorName':
          aVal = (a.vendorName || '').toLowerCase();
          bVal = (b.vendorName || '').toLowerCase();
          break;
        case 'beneficiaryName':
          aVal = (a.beneficiaryName || '').toLowerCase();
          bVal = (b.beneficiaryName || '').toLowerCase();
          break;
        case 'amount':
          aVal = a.amountToBePaid || 0;
          bVal = b.amountToBePaid || 0;
          break;
        case 'mode':
          aVal = (a.modeOfPayment || '').toLowerCase();
          bVal = (b.modeOfPayment || '').toLowerCase();
          break;
        case 'site':
          aVal = (a.site || '').toLowerCase();
          bVal = (b.site || '').toLowerCase();
          break;
        case 'approvalStatus':
          aVal = (a.approvalStatus || '').toLowerCase();
          bVal = (b.approvalStatus || '').toLowerCase();
          break;
        case 'paymentEntry':
          aVal = (a.paymentEntry || '').toLowerCase();
          bVal = (b.paymentEntry || '').toLowerCase();
          break;
        case 'paymentStatus':
          aVal = (a.paymentStatus || '').toLowerCase();
          bVal = (b.paymentStatus || '').toLowerCase();
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredPayments, sortConfig]);

  const toggleSelectAll = () => {
    if (selectedRowIds.length === sortedPayments.length && sortedPayments.length > 0) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(sortedPayments.map((p) => p.id));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // KPI calculations
  const pendingApprovalList = payments.filter(p => p.approvalStatus === 'PENDING');
  const pendingApprovalSum = pendingApprovalList.reduce((acc, curr) => acc + (curr.amountToBePaid || 0), 0);

  const awaitingEntryList = payments.filter(p => p.approvalStatus === 'APPROVED' && p.paymentStatus !== 'DONE');
  const awaitingEntrySum = awaitingEntryList.reduce((acc, curr) => acc + (curr.amountToBePaid || 0), 0);

  const settledList = payments.filter(p => p.paymentStatus === 'DONE');
  const settledSum = settledList.reduce((acc, curr) => acc + (curr.amountToBePaid || 0), 0);

  const creditPendingList = payments.filter(p => p.approvalStatus === 'PENDING_GRN');

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
      <div className="sticky top-0 z-30 bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
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
            {/* Status Filter Dropdown */}
            <select
              value={mismatchOnly ? 'MISMATCH' : statusFilter}
              onChange={(e) => {
                const val = e.target.value;
                if (val === 'MISMATCH') {
                  setMismatchOnly(true);
                  setStatusFilter('ALL');
                } else {
                  setMismatchOnly(false);
                  setStatusFilter(val as any);
                }
              }}
              aria-label="Filter payments by status"
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses ({payments.length})</option>
              <option value="PENDING">Pending Sanction ({pendingApprovalList.length})</option>
              <option value="APPROVED">Awaiting Bank Entry ({awaitingEntryList.length})</option>
              <option value="DONE">Settled ({settledList.length})</option>
              <option value="PENDING_GRN">Credit Pending ({creditPendingList.length})</option>
              <option value="REJECTED">Rejected</option>
              <option value="MISMATCH">Name Mismatch ({mismatchList.length})</option>
            </select>

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
      </div>

      {/* Main Data Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] relative">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-900 font-bold uppercase tracking-wider text-[11px] border-b border-slate-300 shadow-xs">
              <tr>
                <th className="px-3 py-3.5 sticky left-0 top-0 z-30 bg-slate-100 border-r border-slate-200 border-b border-slate-300 shadow-[2px_0_4px_rgba(0,0,0,0.05)] whitespace-nowrap w-36 min-w-[130px]">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={sortedPayments.length > 0 && selectedRowIds.length === sortedPayments.length}
                      onChange={toggleSelectAll}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="Select / Deselect All"
                    />
                    <span>Actions</span>
                  </div>
                </th>
                {visibleColumns.includes('sheetNo') && (
                  <th
                    onClick={() => handleSort('sheetNo')}
                    className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 p-3.5 pl-4 cursor-pointer hover:bg-slate-200/70 transition-colors select-none w-[9%]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Sheet Ref</span>
                      {sortConfig?.key === 'sheetNo' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('vendorName') && (
                  <th
                    onClick={() => handleSort('vendorName')}
                    className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 p-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors select-none w-[16%] whitespace-normal"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Vendor Name</span>
                      {sortConfig?.key === 'vendorName' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('beneficiaryName') && (
                  <th
                    onClick={() => handleSort('beneficiaryName')}
                    className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 p-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors select-none w-[16%] whitespace-normal"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Name of Beneficiary</span>
                      {sortConfig?.key === 'beneficiaryName' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('amount') && (
                  <th
                    onClick={() => handleSort('amount')}
                    className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 p-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors select-none w-[11%]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Amount (₹)</span>
                      {sortConfig?.key === 'amount' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('mode') && (
                  <th
                    onClick={() => handleSort('mode')}
                    className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 p-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors select-none w-[7%]"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Mode</span>
                      {sortConfig?.key === 'mode' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('site') && (
                  <th
                    onClick={() => handleSort('site')}
                    className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 p-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors select-none w-[10%] whitespace-normal"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Site</span>
                      {sortConfig?.key === 'site' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('proof') && <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 p-3.5 w-[8%]">Cheque / Proof</th>}
                {visibleColumns.includes('approvalStatus') && (
                  <th
                    onClick={() => handleSort('approvalStatus')}
                    className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 p-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Approval Status</span>
                      {sortConfig?.key === 'approvalStatus' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('paymentEntry') && (
                  <th
                    onClick={() => handleSort('paymentEntry')}
                    className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 p-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Bank Entry Status</span>
                      {sortConfig?.key === 'paymentEntry' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}
                {visibleColumns.includes('paymentStatus') && (
                  <th
                    onClick={() => handleSort('paymentStatus')}
                    className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 p-3.5 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Payment Status</span>
                      {sortConfig?.key === 'paymentStatus' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {sortedPayments.length === 0 ? (
                <tr>
                  <td colSpan={visibleColumns.length + 1} className="p-10 text-center text-slate-400 font-medium">
                    No bank payment records match your filters.
                  </td>
                </tr>
              ) : (
                sortedPayments.map((p) => {
                  const isChecked = selectedRowIds.includes(p.id);
                  return (
                    <tr
                      key={p.id}
                      onClick={() => handleRowClick(p)}
                      className={`hover:bg-indigo-50/50 transition-colors cursor-pointer group ${isChecked ? 'bg-indigo-50/40' : ''}`}
                    >
                      <td
                        className={`px-3 py-3.5 sticky left-0 z-20 border-r border-slate-200 shadow-[2px_0_4px_rgba(0,0,0,0.05)] whitespace-nowrap ${
                          isChecked ? 'bg-indigo-50' : 'bg-white group-hover:bg-indigo-50/50'
                        }`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-2.5">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRow(p.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                          <div className="flex items-center gap-1.5">
                            {/* Director Role: Approve / Reject Pending Payments */}
                            {isDirector && p.approvalStatus === 'PENDING' && (
                              <>
                                <button
                                  type="button"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    storageAdapter.updateBankPaymentStatus(p.id, 'approvalStatus', 'APPROVED', currentUser);
                                    refreshData();
                                  }}
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                  title="Director Approve Request"
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
                                  className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                  title="Director Reject Request"
                                >
                                  <X className="w-3.5 h-3.5" />
                                  <span>Reject</span>
                                </button>
                              </>
                            )}

                            {/* Accounts Role: Verify Beneficiary */}
                            {isAccounts && p.beneficiaryMasterStatus === 'NEEDS_ADDITION' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPayment(p);
                                  setIsDrawerOpen(true);
                                }}
                                className="px-2 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Verify New Beneficiary"
                              >
                                <ShieldAlert className="w-3.5 h-3.5" />
                                <span>Verify</span>
                              </button>
                            )}

                            {/* Accounts Role: Record UTR for Approved Pending Payments */}
                            {isAccounts && p.approvalStatus === 'APPROVED' && p.paymentStatus === 'PENDING' && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPayment(p);
                                  setIsDrawerOpen(true);
                                }}
                                className="px-2 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs transition-colors shadow-2xs cursor-pointer flex items-center gap-1"
                                title="Record UTR / Bank Settlement"
                              >
                                <Check className="w-3.5 h-3.5" />
                                <span>Record UTR</span>
                              </button>
                            )}

                            {/* View Details action */}
                            {!(isDirector && p.approvalStatus === 'PENDING') &&
                             !(isAccounts && p.beneficiaryMasterStatus === 'NEEDS_ADDITION') &&
                             !(isAccounts && p.approvalStatus === 'APPROVED' && p.paymentStatus === 'PENDING') && (
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPayment(p);
                                  setIsDrawerOpen(true);
                                }}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer flex items-center gap-1 border border-slate-200 shadow-2xs"
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5 text-slate-500" />
                                <span>View</span>
                              </button>
                            )}
                          </div>
                        </div>
                      </td>
                    {visibleColumns.includes('sheetNo') && (
                      <td className="p-3.5 pl-5 font-mono font-bold text-slate-900">
                        <span className="px-2 py-1 bg-slate-100 border border-slate-200 rounded-md text-indigo-700">
                          {p.sheetNo}
                        </span>
                      </td>
                    )}

                    {visibleColumns.includes('vendorName') && (
                      <td className="p-3.5 font-bold text-slate-900 whitespace-normal break-words">
                        {p.vendorName}
                        {p.billNoPo && (
                          <span className="block text-[10px] text-slate-400 font-normal">
                            Ref: {p.billNoPo}
                          </span>
                        )}
                      </td>
                    )}

                    {visibleColumns.includes('beneficiaryName') && (
                      <td className="p-3.5 whitespace-normal break-words">
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
                      <td className="p-3.5 font-medium text-slate-700 whitespace-normal break-words">
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
                        {p.approvalStatus === 'PENDING_GRN' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-purple-100 text-purple-800 border border-purple-200">
                            <Clock className="w-3 h-3 text-purple-600" /> Pending GRN
                          </span>
                        )}
                        {p.approvalStatus === 'READY_FOR_PAYMENT' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-200">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" /> Ready for Payment
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
                    </tr>
                );
              }))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Bulk Action Bar */}
      {selectedRowIds.length > 0 && (
        <div className="sticky bottom-4 z-40 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center justify-between gap-4 border border-slate-700 animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-bold">
              {selectedRowIds.length}
            </span>
            <span className="text-xs font-semibold text-slate-200">
              {selectedRowIds.length === 1 ? 'item selected' : 'items selected'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                const selected = sortedPayments.filter(p => selectedRowIds.includes(p.id));
                const rows = [
                  ['Sheet Ref', 'Date', 'Vendor Name', 'Name of Beneficiary', 'Amount (₹)', 'Mode', 'Site', 'Approval Status', 'Bank Entry', 'Payment Status'],
                  ...selected.map(p => [
                    p.sheetNo,
                    p.timestamp,
                    p.vendorName,
                    p.beneficiaryName,
                    p.amountToBePaid,
                    p.modeOfPayment,
                    p.site,
                    p.approvalStatus,
                    p.paymentEntry,
                    p.paymentStatus
                  ])
                ];
                downloadCsv('Bank_Payments_Bulk_Export', rows);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-700"
            >
              Bulk Export
            </button>
            <button
              type="button"
              onClick={() => {
                // Bulk Assign placeholder
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Bulk Assign
            </button>
            <button
              type="button"
              onClick={() => setSelectedRowIds([])}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

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
