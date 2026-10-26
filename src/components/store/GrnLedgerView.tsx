import React, { useState } from 'react';
import { 
  FileCheck, Search, RefreshCw, Download, Eye, X, CheckCircle2, Clock, 
  Building2, Calendar, User, Package, AlertTriangle, Layers, FileText
} from 'lucide-react';
import { GrnRecord, UserProfile } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { downloadCsv } from '../../utils/csvExporter';

interface GrnLedgerViewProps {
  currentUser: UserProfile;
  onRefresh?: () => void;
  onSelectFlowDetail?: (flowId: string) => void;
}

export const GrnLedgerView: React.FC<GrnLedgerViewProps> = ({
  currentUser,
  onRefresh,
  onSelectFlowDetail,
}) => {
  const [grnRecords, setGrnRecords] = useState<GrnRecord[]>(() => storageAdapter.getGrnRecords());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'COMPLETED' | 'PENDING_VERIFICATION'>('ALL');
  const [selectedGrn, setSelectedGrn] = useState<GrnRecord | null>(null);

  const refreshData = () => {
    setGrnRecords(storageAdapter.getGrnRecords());
    if (onRefresh) onRefresh();
  };

  const handleExportCsv = () => {
    const headers = [
      'GRN Number',
      'Date',
      'Vendor Name',
      'PO Number',
      'Accepted Quantity',
      'Rejected Quantity',
      'Received By',
      'Linked Flow ID',
      'Status'
    ];
    const rows = filteredRecords.map(r => [
      r.grnNumber,
      r.date,
      r.vendorName,
      r.poNumber,
      r.totalAcceptedQty,
      r.totalRejectedQty,
      r.receivedBy,
      r.linkedFlowId,
      r.status
    ]);
    downloadCsv('Barbrik_GRN_Goods_Receipt_Ledger.csv', headers, rows);
  };

  const filteredRecords = grnRecords.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matchGrn = (r.grnNumber || '').toLowerCase().includes(q);
      const matchVendor = (r.vendorName || '').toLowerCase().includes(q);
      const matchPo = (r.poNumber || '').toLowerCase().includes(q);
      const matchReceiver = (r.receivedBy || '').toLowerCase().includes(q);
      const matchFlow = (r.linkedFlowId || '').toLowerCase().includes(q);
      const matchItems = (r.items || []).some(i => (i.itemDescription || '').toLowerCase().includes(q));
      if (!matchGrn && !matchVendor && !matchPo && !matchReceiver && !matchFlow && !matchItems) return false;
    }
    return true;
  });

  // KPI Calculations
  const totalCount = grnRecords.length;
  const completedCount = grnRecords.filter(r => r.status === 'COMPLETED').length;
  const pendingCount = grnRecords.filter(r => r.status === 'PENDING_VERIFICATION').length;
  const totalAcceptedSum = grnRecords.reduce((acc, curr) => acc + (curr.totalAcceptedQty || 0), 0);

  return (
    <div className="space-y-5">
      {/* Page Title Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center shrink-0">
            <FileCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              GRN Ledger (Goods Receipt Note)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Material inward receipts, QA inspection acceptance, and warehouse receiving ledger
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={refreshData}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition-colors cursor-pointer border border-slate-200"
            title="Refresh Ledger"
          >
            <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
            <span>Refresh</span>
          </button>
          <button
            type="button"
            onClick={handleExportCsv}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* KPI Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Card 1: Total GRNs */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'ALL' ? 'text-white' : 'text-emerald-600'}`}>
              Total GRNs
            </span>
            <Layers className={`w-4 h-4 ${statusFilter === 'ALL' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-3xl font-black ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
              {totalCount}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              All Inwards
            </span>
          </div>
        </div>

        {/* Card 2: Completed / Verified */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
          className={`p-4 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'COMPLETED'
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'COMPLETED' ? 'text-white' : 'text-indigo-600'}`}>
              Verified &amp; Accepted
            </span>
            <CheckCircle2 className={`w-4 h-4 ${statusFilter === 'COMPLETED' ? 'text-white' : 'text-indigo-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-3xl font-black ${statusFilter === 'COMPLETED' ? 'text-white' : 'text-slate-900'}`}>
              {completedCount}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              statusFilter === 'COMPLETED' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
            }`}>
              Pass QA
            </span>
          </div>
        </div>

        {/* Card 3: Pending Verification */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'PENDING_VERIFICATION' ? 'ALL' : 'PENDING_VERIFICATION')}
          className={`p-4 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'PENDING_VERIFICATION'
              ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'PENDING_VERIFICATION' ? 'text-white' : 'text-amber-600'}`}>
              Pending QA / Review
            </span>
            <Clock className={`w-4 h-4 ${statusFilter === 'PENDING_VERIFICATION' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-3xl font-black ${statusFilter === 'PENDING_VERIFICATION' ? 'text-white' : 'text-slate-900'}`}>
              {pendingCount}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              statusFilter === 'PENDING_VERIFICATION' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
            }`}>
              Inspection
            </span>
          </div>
        </div>

        {/* Card 4: Total Accepted Items */}
        <div 
          className="p-4 rounded-xl sm:rounded-2xl border bg-white border-slate-200 text-slate-900"
        >
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
              Total Units Accepted
            </span>
            <Package className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-black text-slate-900">
              {totalAcceptedSum.toLocaleString('en-IN')}
            </span>
            <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              Stock Inward
            </span>
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Search Bar */}
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search GRN #, vendor, PO ref, receiver..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-600 transition-all placeholder:text-slate-400"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 text-xs"
              >
                ✕
              </button>
            )}
          </div>

          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl self-start sm:self-auto overflow-x-auto w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setStatusFilter('ALL')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'ALL'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              All ({totalCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('COMPLETED')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'COMPLETED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Completed ({completedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('PENDING_VERIFICATION')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'PENDING_VERIFICATION'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Pending Verification ({pendingCount})
            </button>
          </div>
        </div>
      </div>

      {/* Main Data Table with Sticky Columns */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-700">
            <thead className="sticky top-0 z-30 bg-slate-100 text-slate-900 font-bold uppercase tracking-wider text-[11px] border-b border-slate-300 shadow-xs">
              <tr>
                {/* Sticky Left Column 1: GRN No */}
                <th className="sticky left-0 top-0 bg-slate-100 z-40 p-3.5 pl-4 border-r border-slate-200/80 min-w-[170px] shadow-xs">
                  GRN No
                </th>
                <th className="p-3.5 min-w-[110px] sticky top-0 z-30 bg-slate-100 border-b border-slate-300">Date</th>
                <th className="p-3.5 min-w-[180px] sticky top-0 z-30 bg-slate-100 border-b border-slate-300">Vendor</th>
                <th className="p-3.5 min-w-[140px] sticky top-0 z-30 bg-slate-100 border-b border-slate-300">PO Ref</th>
                <th className="p-3.5 text-center min-w-[110px] sticky top-0 z-30 bg-slate-100 border-b border-slate-300">Accepted Qty</th>
                <th className="p-3.5 text-center min-w-[110px] sticky top-0 z-30 bg-slate-100 border-b border-slate-300">Rejected Qty</th>
                <th className="p-3.5 min-w-[140px] sticky top-0 z-30 bg-slate-100 border-b border-slate-300">Status</th>
                {/* Sticky Right Column: Action */}
                <th className="sticky right-0 top-0 bg-slate-100 z-40 p-3.5 pr-4 text-right border-l border-slate-200/80 min-w-[110px] shadow-xs">
                  Action
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 relative">
              {filteredRecords.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-10 text-center text-slate-400 font-medium">
                    No Goods Receipt Notes match your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedGrn(r)}
                      className="hover:bg-emerald-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Sticky Left: GRN No */}
                      <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 p-3.5 pl-4 border-r border-slate-200/80 align-middle">
                        <span className="font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200/70 px-2 py-0.5 rounded-md">
                          {r.grnNumber}
                        </span>
                        {r.linkedFlowId && (
                          <span className="block text-[10px] text-slate-400 font-normal mt-0.5 truncate max-w-[150px]">
                            {r.linkedFlowId}
                          </span>
                        )}
                      </td>

                      {/* Date */}
                      <td className="p-3.5 font-medium text-slate-600">
                        {r.date}
                      </td>

                      {/* Vendor */}
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{r.vendorName || 'Authorized Vendor'}</span>
                        </div>
                      </td>

                      {/* PO Ref */}
                      <td className="p-3.5 font-mono text-slate-700">
                        <span className="px-2 py-0.5 bg-slate-100 rounded text-slate-700 font-semibold border border-slate-200">
                          {r.poNumber || '—'}
                        </span>
                      </td>

                      {/* Accepted Qty */}
                      <td className="p-3.5 text-center font-bold text-emerald-600">
                        {r.totalAcceptedQty}
                      </td>

                      {/* Rejected Qty */}
                      <td className="p-3.5 text-center font-bold">
                        {r.totalRejectedQty > 0 ? (
                          <span className="text-rose-600 bg-rose-50 px-2 py-0.5 rounded border border-rose-200">
                            {r.totalRejectedQty}
                          </span>
                        ) : (
                          <span className="text-slate-400 font-normal">0</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          r.status === 'COMPLETED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {r.status === 'COMPLETED' ? (
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          ) : (
                            <Clock className="w-3 h-3 text-amber-600" />
                          )}
                          {r.status === 'COMPLETED' ? 'Completed' : 'Pending Verification'}
                        </span>
                      </td>

                      {/* Sticky Right: Action */}
                      <td className="sticky right-0 bg-white group-hover:bg-slate-50 z-10 p-3.5 pr-4 text-right border-l border-slate-200/80 align-middle">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedGrn(r);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-emerald-600 hover:text-white text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 shadow-2xs transition-all flex items-center gap-1 ml-auto cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>View Details</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* View Details Modal */}
      {selectedGrn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center">
                  <FileCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>GRN #{selectedGrn.grnNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      selectedGrn.status === 'COMPLETED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      {selectedGrn.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Goods Receipt Note &amp; Warehouse Inspection Summary
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedGrn(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4">
              {/* Meta Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Receipt Date</span>
                  <p className="font-semibold text-slate-800 mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {selectedGrn.date}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Received By</span>
                  <p className="font-semibold text-slate-800 mt-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {selectedGrn.receivedBy || 'Store In-charge'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Vendor</span>
                  <p className="font-semibold text-slate-900 mt-1 flex items-center gap-1 truncate">
                    <Building2 className="w-3.5 h-3.5 text-slate-400" />
                    {selectedGrn.vendorName}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Purchase Order Ref</span>
                  <p className="font-mono font-bold text-indigo-700 mt-1 truncate">
                    {selectedGrn.poNumber}
                  </p>
                </div>
              </div>

              {/* Counts Banner */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs font-bold text-emerald-900">Total Accepted Qty</span>
                  </div>
                  <span className="text-base font-black text-emerald-700">{selectedGrn.totalAcceptedQty}</span>
                </div>

                <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600" />
                    <span className="text-xs font-bold text-rose-900">Total Rejected Qty</span>
                  </div>
                  <span className="text-base font-black text-rose-700">{selectedGrn.totalRejectedQty}</span>
                </div>
              </div>

              {selectedGrn.linkedFlowId && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Linked Procurement FMS Flow:</span>
                    <span className="ml-2 font-mono font-bold text-slate-800">{selectedGrn.linkedFlowId}</span>
                  </div>
                  {onSelectFlowDetail && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectFlowDetail(selectedGrn.linkedFlowId);
                        setSelectedGrn(null);
                      }}
                      className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[10px] transition-colors"
                    >
                      Open Flow Matrix
                    </button>
                  )}
                </div>
              )}

              {/* Items Table */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  Material Verification Line Items ({selectedGrn.items?.length || 0})
                </h4>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-center">Ordered Qty</th>
                        <th className="py-2.5 px-3 text-center">Unit</th>
                        <th className="py-2.5 px-3 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!selectedGrn.items || selectedGrn.items.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            No individual items recorded for this GRN.
                          </td>
                        </tr>
                      ) : (
                        selectedGrn.items.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{item.itemDescription}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800">{item.qty}</td>
                            <td className="py-2.5 px-3 text-center text-slate-600">{item.unit || 'Nos'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                Verified
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedGrn(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
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
