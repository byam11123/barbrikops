import React, { useState } from 'react';
import { 
  Truck, Search, RefreshCw, Download, Eye, X, CheckCircle2, Clock, 
  MapPin, Calendar, User, Package, FileText, ArrowRight, Layers
} from 'lucide-react';
import { StnRecord, UserProfile } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { downloadCsv } from '../../utils/csvExporter';

interface StnLedgerViewProps {
  currentUser: UserProfile;
  onRefresh?: () => void;
  onSelectFlowDetail?: (flowId: string) => void;
}

export const StnLedgerView: React.FC<StnLedgerViewProps> = ({
  currentUser,
  onRefresh,
  onSelectFlowDetail,
}) => {
  const [stnRecords, setStnRecords] = useState<StnRecord[]>(() => storageAdapter.getStnRecords());
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'DRAFT' | 'DISPATCHED' | 'RECEIVED'>('ALL');
  const [selectedStn, setSelectedStn] = useState<StnRecord | null>(null);

  const refreshData = () => {
    setStnRecords(storageAdapter.getStnRecords());
    if (onRefresh) onRefresh();
  };

  const handleExportCsv = () => {
    const headers = [
      'STN Number',
      'Date',
      'Source Location',
      'Destination Location',
      'Item Count',
      'Total Quantity',
      'Dispatched By',
      'Linked Flow ID',
      'Status'
    ];
    const rows = filteredRecords.map(r => [
      r.stnNumber,
      r.date,
      r.sourceLocation,
      r.destinationLocation,
      r.items?.length || 0,
      r.totalQty,
      r.dispatchedBy,
      r.linkedFlowId,
      r.status
    ]);
    downloadCsv('Barbrik_STN_Stock_Transfer_Ledger.csv', headers, rows);
  };

  const filteredRecords = stnRecords.filter((r) => {
    if (statusFilter !== 'ALL' && r.status !== statusFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase().trim();
      const matchStn = (r.stnNumber || '').toLowerCase().includes(q);
      const matchSource = (r.sourceLocation || '').toLowerCase().includes(q);
      const matchDest = (r.destinationLocation || '').toLowerCase().includes(q);
      const matchDispatcher = (r.dispatchedBy || '').toLowerCase().includes(q);
      const matchFlow = (r.linkedFlowId || '').toLowerCase().includes(q);
      const matchItems = (r.items || []).some(i => (i.itemDescription || '').toLowerCase().includes(q));
      if (!matchStn && !matchSource && !matchDest && !matchDispatcher && !matchFlow && !matchItems) return false;
    }
    return true;
  });

  // KPI Calculations
  const totalCount = stnRecords.length;
  const dispatchedCount = stnRecords.filter(r => r.status === 'DISPATCHED').length;
  const receivedCount = stnRecords.filter(r => r.status === 'RECEIVED').length;
  const draftCount = stnRecords.filter(r => r.status === 'DRAFT').length;

  return (
    <div className="space-y-5">
      {/* Page Title Bar */}
      <div className="bg-white p-4 sm:p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center shrink-0">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              STN Ledger (Stock Transfer Note)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Outward store dispatches, inter-site transfer dockets, and gate dispatch registry
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
        {/* Card 1: Total STNs */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          className={`p-4 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'ALL' ? 'text-white' : 'text-indigo-600'}`}>
              Total STNs
            </span>
            <Layers className={`w-4 h-4 ${statusFilter === 'ALL' ? 'text-white' : 'text-indigo-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-3xl font-black ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
              {totalCount}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              statusFilter === 'ALL' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-600'
            }`}>
              All Notes
            </span>
          </div>
        </div>

        {/* Card 2: Dispatched */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'DISPATCHED' ? 'ALL' : 'DISPATCHED')}
          className={`p-4 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'DISPATCHED'
              ? 'bg-blue-600 text-white shadow-md ring-2 ring-blue-400/50'
              : 'bg-white border-slate-200 hover:border-blue-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'DISPATCHED' ? 'text-white' : 'text-blue-600'}`}>
              Dispatched (In Transit)
            </span>
            <Truck className={`w-4 h-4 ${statusFilter === 'DISPATCHED' ? 'text-white' : 'text-blue-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-3xl font-black ${statusFilter === 'DISPATCHED' ? 'text-white' : 'text-slate-900'}`}>
              {dispatchedCount}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              statusFilter === 'DISPATCHED' ? 'bg-white/20 text-white' : 'bg-blue-50 text-blue-700'
            }`}>
              On Road
            </span>
          </div>
        </div>

        {/* Card 3: Received */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'RECEIVED' ? 'ALL' : 'RECEIVED')}
          className={`p-4 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'RECEIVED'
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'RECEIVED' ? 'text-white' : 'text-emerald-600'}`}>
              Delivered / Received
            </span>
            <CheckCircle2 className={`w-4 h-4 ${statusFilter === 'RECEIVED' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-3xl font-black ${statusFilter === 'RECEIVED' ? 'text-white' : 'text-slate-900'}`}>
              {receivedCount}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              statusFilter === 'RECEIVED' ? 'bg-white/20 text-white' : 'bg-emerald-50 text-emerald-700'
            }`}>
              Site Acknowledged
            </span>
          </div>
        </div>

        {/* Card 4: Drafts */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'DRAFT' ? 'ALL' : 'DRAFT')}
          className={`p-4 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'DRAFT'
              ? 'bg-amber-600 text-white shadow-md ring-2 ring-amber-400/50'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] font-bold uppercase tracking-wider ${statusFilter === 'DRAFT' ? 'text-white' : 'text-amber-600'}`}>
              Draft Preparation
            </span>
            <Clock className={`w-4 h-4 ${statusFilter === 'DRAFT' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-3xl font-black ${statusFilter === 'DRAFT' ? 'text-white' : 'text-slate-900'}`}>
              {draftCount}
            </span>
            <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
              statusFilter === 'DRAFT' ? 'bg-white/20 text-white' : 'bg-amber-50 text-amber-700'
            }`}>
              Pending Outward
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
              placeholder="Search STN #, item, site, dispatcher..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-200 rounded-xl focus:outline-hidden focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all placeholder:text-slate-400"
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
              onClick={() => setStatusFilter('DISPATCHED')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'DISPATCHED'
                  ? 'bg-blue-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Dispatched ({dispatchedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('RECEIVED')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'RECEIVED'
                  ? 'bg-emerald-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Received ({receivedCount})
            </button>
            <button
              type="button"
              onClick={() => setStatusFilter('DRAFT')}
              className={`px-3 py-1.5 text-xs rounded-lg font-bold transition-all cursor-pointer whitespace-nowrap ${
                statusFilter === 'DRAFT'
                  ? 'bg-amber-600 text-white shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Draft ({draftCount})
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
                {/* Sticky Left Column 1: STN No */}
                <th className="sticky left-0 top-0 bg-slate-100 z-40 p-3.5 pl-4 border-r border-slate-200/80 min-w-[170px] shadow-xs">
                  STN No
                </th>
                <th className="p-3.5 min-w-[110px] sticky top-0 z-30 bg-slate-100 border-b border-slate-300">Date</th>
                <th className="p-3.5 min-w-[160px] sticky top-0 z-30 bg-slate-100 border-b border-slate-300">Source</th>
                <th className="p-3.5 min-w-[160px] sticky top-0 z-30 bg-slate-100 border-b border-slate-300">Destination</th>
                <th className="p-3.5 text-center min-w-[100px] sticky top-0 z-30 bg-slate-100 border-b border-slate-300">Items (Count)</th>
                <th className="p-3.5 text-center min-w-[110px] sticky top-0 z-30 bg-slate-100 border-b border-slate-300">Total Qty</th>
                <th className="p-3.5 min-w-[130px] sticky top-0 z-30 bg-slate-100 border-b border-slate-300">Status</th>
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
                    No Stock Transfer Notes match your filters.
                  </td>
                </tr>
              ) : (
                filteredRecords.map((r) => {
                  const itemCount = r.items?.length || 0;
                  const itemSummary = (r.items || [])
                    .slice(0, 2)
                    .map(i => i.itemDescription)
                    .join(', ');

                  return (
                    <tr
                      key={r.id}
                      onClick={() => setSelectedStn(r)}
                      className="hover:bg-indigo-50/40 transition-colors cursor-pointer group"
                    >
                      {/* Sticky Left: STN No */}
                      <td className="sticky left-0 bg-white group-hover:bg-slate-50 z-10 p-3.5 pl-4 border-r border-slate-200/80 align-middle">
                        <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200/70 px-2 py-0.5 rounded-md">
                          {r.stnNumber}
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

                      {/* Source */}
                      <td className="p-3.5 font-medium text-slate-800">
                        <div className="flex items-center gap-1.5">
                          <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span className="truncate">{r.sourceLocation || 'Central Store'}</span>
                        </div>
                      </td>

                      {/* Destination */}
                      <td className="p-3.5 font-bold text-slate-900">
                        <div className="flex items-center gap-1.5">
                          <ArrowRight className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                          <span className="truncate">{r.destinationLocation || 'Project Site'}</span>
                        </div>
                      </td>

                      {/* Items (Count) */}
                      <td className="p-3.5 text-center">
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-slate-100 rounded-md font-bold text-slate-700">
                          <Package className="w-3 h-3 text-slate-400" />
                          {itemCount} item{itemCount === 1 ? '' : 's'}
                        </span>
                        {itemSummary && (
                          <span className="block text-[10px] text-slate-400 truncate max-w-[140px] mx-auto mt-0.5">
                            {itemSummary}
                          </span>
                        )}
                      </td>

                      {/* Total Qty */}
                      <td className="p-3.5 text-center font-bold text-slate-900">
                        {r.totalQty}
                      </td>

                      {/* Status */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                          r.status === 'RECEIVED'
                            ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                            : r.status === 'DISPATCHED'
                            ? 'bg-blue-50 text-blue-800 border-blue-300'
                            : 'bg-amber-50 text-amber-800 border-amber-300'
                        }`}>
                          {r.status === 'RECEIVED' && <CheckCircle2 className="w-3 h-3 text-emerald-600" />}
                          {r.status === 'DISPATCHED' && <Truck className="w-3 h-3 text-blue-600" />}
                          {r.status === 'DRAFT' && <Clock className="w-3 h-3 text-amber-600" />}
                          {r.status}
                        </span>
                      </td>

                      {/* Sticky Right: Action */}
                      <td className="sticky right-0 bg-white group-hover:bg-slate-50 z-10 p-3.5 pr-4 text-right border-l border-slate-200/80 align-middle">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedStn(r);
                          }}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-indigo-600 hover:text-white text-slate-700 rounded-lg font-bold text-[11px] border border-slate-200 shadow-2xs transition-all flex items-center gap-1 ml-auto cursor-pointer"
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
      {selectedStn && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-600 flex items-center justify-center">
                  <Truck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                    <span>STN #{selectedStn.stnNumber}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      selectedStn.status === 'RECEIVED'
                        ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                        : selectedStn.status === 'DISPATCHED'
                        ? 'bg-blue-50 text-blue-800 border-blue-300'
                        : 'bg-amber-50 text-amber-800 border-amber-300'
                    }`}>
                      {selectedStn.status}
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Stock Transfer Note Details &amp; Dispatched Inventory
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setSelectedStn(null)}
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
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Date</span>
                  <p className="font-semibold text-slate-800 mt-1 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {selectedStn.date}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Dispatched By</span>
                  <p className="font-semibold text-slate-800 mt-1 flex items-center gap-1">
                    <User className="w-3.5 h-3.5 text-slate-400" />
                    {selectedStn.dispatchedBy || 'Store Manager'}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Source Store</span>
                  <p className="font-semibold text-slate-800 mt-1 flex items-center gap-1 truncate">
                    <MapPin className="w-3.5 h-3.5 text-slate-400" />
                    {selectedStn.sourceLocation}
                  </p>
                </div>

                <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
                  <span className="text-[10px] font-bold uppercase text-slate-400 tracking-wider">Destination Site</span>
                  <p className="font-semibold text-indigo-700 mt-1 flex items-center gap-1 truncate">
                    <ArrowRight className="w-3.5 h-3.5 text-indigo-500" />
                    {selectedStn.destinationLocation}
                  </p>
                </div>
              </div>

              {selectedStn.linkedFlowId && (
                <div className="p-3 bg-indigo-50/60 rounded-xl border border-indigo-100 flex items-center justify-between text-xs">
                  <div>
                    <span className="text-[10px] font-bold text-indigo-700 uppercase tracking-wider">Linked FMS Flow:</span>
                    <span className="ml-2 font-mono font-bold text-slate-800">{selectedStn.linkedFlowId}</span>
                  </div>
                  {onSelectFlowDetail && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectFlowDetail(selectedStn.linkedFlowId);
                        setSelectedStn(null);
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
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Dispatched Material Items ({selectedStn.items?.length || 0})
                  </h4>
                  <span className="text-xs font-bold text-slate-700">
                    Total Qty: {selectedStn.totalQty}
                  </span>
                </div>

                <div className="border border-slate-200 rounded-xl overflow-hidden">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2.5 px-3 w-10 text-center">#</th>
                        <th className="py-2.5 px-3">Item Description</th>
                        <th className="py-2.5 px-3 text-center">Quantity</th>
                        <th className="py-2.5 px-3 text-center">Unit</th>
                        <th className="py-2.5 px-3 text-center">Allocation</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {(!selectedStn.items || selectedStn.items.length === 0) ? (
                        <tr>
                          <td colSpan={5} className="py-4 text-center text-slate-400">
                            No individual items itemized for this STN.
                          </td>
                        </tr>
                      ) : (
                        selectedStn.items.map((item, idx) => (
                          <tr key={item.id || idx} className="hover:bg-slate-50">
                            <td className="py-2.5 px-3 text-center font-mono text-slate-400">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-semibold text-slate-900">{item.itemDescription}</td>
                            <td className="py-2.5 px-3 text-center font-bold text-slate-800">{item.qty}</td>
                            <td className="py-2.5 px-3 text-center text-slate-600">{item.unit || 'Nos'}</td>
                            <td className="py-2.5 px-3 text-center">
                              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px]">
                                {item.triageAllocation || 'STORE_DISPATCH'}
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
                onClick={() => setSelectedStn(null)}
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
