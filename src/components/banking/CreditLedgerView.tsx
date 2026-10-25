import React, { useState } from 'react';
import { 
  CreditCard, Search, RefreshCw, Download, Eye, X, CheckCircle2, Clock, 
  Building2, Calendar, FileText, ArrowRight, ShieldAlert, Sparkles
} from 'lucide-react';
import { CreditLedgerRecord, UserProfile } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { downloadCsv } from '../../utils/csvExporter';

interface CreditLedgerViewProps {
  currentUser: UserProfile;
  onRefresh?: () => void;
  onSelectFlowDetail?: (flowId: string) => void;
}

export const CreditLedgerView: React.FC<CreditLedgerViewProps> = ({
  currentUser,
  onRefresh,
  onSelectFlowDetail,
}) => {
  const [creditRecords, setCreditRecords] = useState<CreditLedgerRecord[]>(() => storageAdapter.getCreditLedgerRecords());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'AWAITING_GRN' | 'GRN_COMPLETED' | 'PAYMENT_INITIATED'>('ALL');
  const [selectedRecord, setSelectedRecord] = useState<CreditLedgerRecord | null>(null);

  const refreshData = () => {
    setCreditRecords(storageAdapter.getCreditLedgerRecords());
    if (onRefresh) onRefresh();
  };

  const handleExportCsv = () => {
    const headers = [
      'PO Number',
      'PO Date',
      'Vendor Name',
      'Indent Number',
      'Amount (₹)',
      'Status',
      'Linked Flow ID'
    ];
    const rows = filteredRecords.map(r => [
      r.poNumber,
      r.poDate,
      r.vendorName,
      r.indentNo,
      r.poAmount,
      r.status,
      r.linkedFlowId || '—'
    ]);
    downloadCsv('Credit_Purchase_Ledger.csv', headers, rows);
  };

  const filteredRecords = creditRecords.filter(r => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchPo = (r.poNumber || '').toLowerCase().includes(q);
      const matchVen = (r.vendorName || '').toLowerCase().includes(q);
      const matchInd = (r.indentNo || '').toLowerCase().includes(q);
      const matchAmt = String(r.poAmount || '').includes(q);
      if (!matchPo && !matchVen && !matchInd && !matchAmt) return false;
    }
    return true;
  });

  // KPI Calculations
  const totalCreditValue = creditRecords.reduce((sum, r) => sum + (Number(r.poAmount) || 0), 0);
  const awaitingGrnList = creditRecords.filter(r => r.status === 'AWAITING_GRN');
  const awaitingGrnValue = awaitingGrnList.reduce((sum, r) => sum + (Number(r.poAmount) || 0), 0);
  const readyForPaymentList = creditRecords.filter(r => r.status === 'GRN_COMPLETED' || r.status === 'PAYMENT_INITIATED');
  const readyForPaymentValue = readyForPaymentList.reduce((sum, r) => sum + (Number(r.poAmount) || 0), 0);

  const getStatusBadge = (status: CreditLedgerRecord['status']) => {
    switch (status) {
      case 'AWAITING_GRN':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
            <Clock className="w-3 h-3 text-amber-600" />
            Awaiting GRN
          </span>
        );
      case 'GRN_COMPLETED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
            <CheckCircle2 className="w-3 h-3 text-blue-600" />
            Ready for Payment (GRN Done)
          </span>
        );
      case 'PAYMENT_INITIATED':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Payment Initiated
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-slate-100 text-slate-700">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 tracking-tight">Credit Ledger</h1>
              <p className="text-xs text-slate-500 font-medium">
                Track procurement under Credit payment terms awaiting warehouse GRN inspection and Accounts disbursement
              </p>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            type="button"
            onClick={refreshData}
            className="flex items-center gap-1 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold shadow-2xs transition-colors cursor-pointer"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        {/* Card 1: Total Credit Value */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          title="Click to view all credit orders"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-md ring-2 ring-slate-400/50 scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-slate-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-600'}`}>
              Total Credit Value
            </span>
            <CreditCard className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-xl sm:text-3xl font-black font-mono ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
              ₹{totalCreditValue.toLocaleString('en-IN')}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'ALL'
                ? 'bg-white/25 text-white'
                : 'bg-slate-100 text-slate-700 border border-slate-200'
            }`}>
              {creditRecords.length} POs
            </span>
          </div>
        </div>

        {/* Card 2: Awaiting GRN */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'AWAITING_GRN' ? 'ALL' : 'AWAITING_GRN')}
          title="Click to filter by Awaiting GRN"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'AWAITING_GRN'
              ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50 scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'AWAITING_GRN' ? 'text-white' : 'text-amber-700'}`}>
              Awaiting GRN
            </span>
            <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'AWAITING_GRN' ? 'text-white' : 'text-amber-600'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-xl sm:text-3xl font-black font-mono ${statusFilter === 'AWAITING_GRN' ? 'text-white' : 'text-slate-900'}`}>
              ₹{awaitingGrnValue.toLocaleString('en-IN')}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'AWAITING_GRN'
                ? 'bg-white/25 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}>
              {awaitingGrnList.length} Orders
            </span>
          </div>
        </div>

        {/* Card 3: Ready for Payment */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'GRN_COMPLETED' ? 'ALL' : 'GRN_COMPLETED')}
          title="Click to filter by Ready for Payment"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'GRN_COMPLETED' || statusFilter === 'PAYMENT_INITIATED'
              ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50 scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${statusFilter === 'GRN_COMPLETED' || statusFilter === 'PAYMENT_INITIATED' ? 'text-white' : 'text-blue-700'}`}>
              Ready for Payment
            </span>
            <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 ${statusFilter === 'GRN_COMPLETED' || statusFilter === 'PAYMENT_INITIATED' ? 'text-white' : 'text-blue-600'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-xl sm:text-3xl font-black font-mono ${statusFilter === 'GRN_COMPLETED' || statusFilter === 'PAYMENT_INITIATED' ? 'text-white' : 'text-slate-900'}`}>
              ₹{readyForPaymentValue.toLocaleString('en-IN')}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              statusFilter === 'GRN_COMPLETED' || statusFilter === 'PAYMENT_INITIATED'
                ? 'bg-white/25 text-white'
                : 'bg-blue-50 text-blue-700 border border-blue-100'
            }`}>
              {readyForPaymentList.length} Accounts Queue
            </span>
          </div>
        </div>
      </div>

      {/* Toolbar & Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
          {/* Search Box */}
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by PO Number, Vendor Name, Indent Number, Amount..."
              className="w-full pl-9 pr-8 py-2 text-xs bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-xl outline-none transition-all placeholder:text-slate-400 text-slate-800 font-medium"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs font-bold cursor-pointer"
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
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              aria-label="Filter credit orders by status"
              className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 rounded-xl border border-slate-200 text-xs font-bold transition-colors cursor-pointer shadow-2xs outline-none focus:border-indigo-500"
            >
              <option value="ALL">All Statuses ({creditRecords.length})</option>
              <option value="AWAITING_GRN">Awaiting GRN ({awaitingGrnList.length})</option>
              <option value="GRN_COMPLETED">Ready for Payment (GRN Done) ({creditRecords.filter(r => r.status === 'GRN_COMPLETED').length})</option>
              <option value="PAYMENT_INITIATED">Payment Initiated ({creditRecords.filter(r => r.status === 'PAYMENT_INITIATED').length})</option>
            </select>

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
          </div>
        </div>
      </div>

      {/* Main Table with Sticky Columns */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto relative">
          <table className="w-full text-left text-xs text-slate-700 border-collapse">
            <thead className="bg-slate-100 text-slate-900 font-bold uppercase tracking-wider text-[11px] border-b border-slate-200">
              <tr>
                {/* Sticky Column 1: PO Number */}
                <th className="p-3.5 pl-5 sticky left-0 z-20 bg-slate-100 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)] min-w-[170px]">
                  PO Number
                </th>
                <th className="p-3.5 min-w-[200px]">Vendor Name</th>
                <th className="p-3.5 min-w-[110px]">PO Date</th>
                <th className="p-3.5 min-w-[130px] text-right">PO Amount (₹)</th>
                <th className="p-3.5 min-w-[150px]">Indent Ref</th>
                <th className="p-3.5 min-w-[180px]">Status</th>
                {/* Sticky Column Right: Action */}
                <th className="p-3.5 pr-5 sticky right-0 z-20 bg-slate-100 text-right shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.06)] min-w-[130px]">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <CreditCard className="w-8 h-8 mx-auto mb-2 text-slate-300" />
                    <p className="font-medium">No Credit Purchase records found</p>
                    <p className="text-xs text-slate-400 mt-1">Orders with Credit terms awaiting GRN or payment will appear here</p>
                  </td>
                </tr>
              ) : (
                filteredRecords.map((rec) => (
                  <tr key={rec.id} className="hover:bg-amber-50/30 transition-colors">
                    {/* Sticky Column 1: PO Number */}
                    <td className="p-3.5 pl-5 font-bold text-slate-900 sticky left-0 z-10 bg-white group-hover:bg-amber-50/30 shadow-[2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                        <span className="font-mono text-xs">{rec.poNumber}</span>
                      </div>
                    </td>

                    {/* Vendor Name */}
                    <td className="p-3.5">
                      <div className="flex items-center gap-1.5">
                        <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                        <span className="font-semibold text-slate-800">{rec.vendorName}</span>
                      </div>
                    </td>

                    {/* PO Date */}
                    <td className="p-3.5 text-slate-600 font-mono text-[11px]">
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" />
                        {rec.poDate}
                      </div>
                    </td>

                    {/* PO Amount */}
                    <td className="p-3.5 text-right font-black font-mono text-emerald-700">
                      ₹{Number(rec.poAmount || 0).toLocaleString('en-IN')}
                    </td>

                    {/* Indent Ref */}
                    <td className="p-3.5 text-slate-600 font-mono text-xs">
                      {rec.indentNo}
                    </td>

                    {/* Status */}
                    <td className="p-3.5">
                      {getStatusBadge(rec.status)}
                    </td>

                    {/* Sticky Column Right: Action */}
                    <td className="p-3.5 pr-5 text-right sticky right-0 z-10 bg-white group-hover:bg-amber-50/30 shadow-[-2px_0_4px_-1px_rgba(0,0,0,0.06)]">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSelectedRecord(rec)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Details</span>
                        </button>
                        {rec.linkedFlowId && onSelectFlowDetail && (
                          <button
                            type="button"
                            onClick={() => onSelectFlowDetail(rec.linkedFlowId)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            title="Open Linked Workflow"
                          >
                            <span>Flow</span>
                            <ArrowRight className="w-3 h-3" />
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

      {/* Details Modal */}
      {selectedRecord && (
        <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-100 rounded-xl text-amber-700">
                  <CreditCard className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-slate-900 text-sm">Credit Purchase Details</h3>
                  <p className="text-xs font-mono text-slate-500">{selectedRecord.poNumber}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Content */}
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block mb-1">Vendor</span>
                  <span className="font-bold text-slate-800">{selectedRecord.vendorName}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block mb-1">PO Date</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedRecord.poDate}</span>
                </div>
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 block mb-1">Indent Reference</span>
                  <span className="font-bold text-slate-800 font-mono">{selectedRecord.indentNo}</span>
                </div>
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-100">
                  <span className="text-emerald-700 block mb-1">Credit Amount</span>
                  <span className="font-black text-emerald-800 font-mono text-sm">
                    ₹{Number(selectedRecord.poAmount || 0).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Status Section */}
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-600">Current Status:</span>
                  {getStatusBadge(selectedRecord.status)}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {selectedRecord.status === 'AWAITING_GRN' && (
                    'Purchase Order has been issued under Credit payment terms. Waiting for Central Store to physically receive material and log GRN inspection.'
                  )}
                  {selectedRecord.status === 'GRN_COMPLETED' && (
                    'Central Store has completed Goods Received Note (GRN) verification. Consignment is accepted and payment requisition is in the Accounts queue.'
                  )}
                  {selectedRecord.status === 'PAYMENT_INITIATED' && (
                    'Accounts has initiated the PO to Payment FMS workflow. Payment is pending bank clearance or UTR disbursement.'
                  )}
                </p>
              </div>

              {selectedRecord.linkedFlowId && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-slate-500 block text-[11px]">Linked Workflow:</span>
                    <span className="font-mono font-bold text-indigo-700">{selectedRecord.linkedFlowId}</span>
                  </div>
                  {onSelectFlowDetail && (
                    <button
                      type="button"
                      onClick={() => {
                        const targetId = selectedRecord.linkedFlowId;
                        setSelectedRecord(null);
                        onSelectFlowDetail(targetId);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-xs shadow-xs cursor-pointer"
                    >
                      <span>Open Workflow</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-3.5 bg-slate-50 border-t border-slate-200 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedRecord(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
