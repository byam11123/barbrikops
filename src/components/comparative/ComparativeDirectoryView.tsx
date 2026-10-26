import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Layers,
  Building2,
  UserCheck,
  ArrowRight,
  ExternalLink,
  Percent,
  Sparkles,
  ShieldCheck,
  RefreshCw,
  FolderOpen,
  Calendar,
  MapPin,
  FileText,
  Clock,
  ChevronDown,
  Zap,
  Award,
  CheckSquare,
  Search,
  SlidersHorizontal,
  FileDown,
  X,
  Scale,
  Eye,
} from 'lucide-react';
import { ComparativeStatement, UserProfile } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { calculateCsL1Analytics, downloadComparativeStatementExcel } from '../../services/comparativeExcelService';
import { downloadComparativeStatementPdf } from '../../services/comparativePdfService';

interface ComparativeDirectoryViewProps {
  currentUser: UserProfile;
  statements: ComparativeStatement[];
  onOpenEditor: (csId: string) => void;
  onCreateNew: () => void;
  onRefreshStatements: () => void;
  onNavigateTab?: (tab: string) => void;
}

export const ComparativeDirectoryView: React.FC<ComparativeDirectoryViewProps> = ({
  currentUser,
  statements,
  onOpenEditor,
  onCreateNew,
  onRefreshStatements,
  onNavigateTab,
}) => {
  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [siteFilter, setSiteFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [dateFilter, setDateFilter] = useState('ALL');

  // Quick Detail Drawer State
  const [selectedCsForDrawer, setSelectedCsForDrawer] = useState<ComparativeStatement | null>(null);

  // Success Notification Toast
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Extract unique project sites for filter dropdown
  const uniqueSites = useMemo(() => {
    const sites = new Set<string>();
    statements.forEach((s) => {
      if (s.site && s.site.trim()) {
        sites.add(s.site.trim().toUpperCase());
      }
    });
    return Array.from(sites);
  }, [statements]);

  // Global KPI Metrics across all saved statements
  const stats = useMemo(() => {
    const totalCount = statements.length;
    let approvedCount = 0;
    let draftCount = 0;
    let poCreatedCount = 0;
    let totalComparedValue = 0;
    let totalRealizedSavings = 0;

    statements.forEach((s) => {
      if (s.status === 'Approved') approvedCount++;
      else if (s.status === 'PO Created') {
        approvedCount++;
        poCreatedCount++;
      } else {
        draftCount++;
      }

      const analytics = calculateCsL1Analytics(s);
      if (analytics.singleLowestVendor) {
        totalComparedValue += analytics.singleLowestVendor.totalLanded;
      }
      totalRealizedSavings += analytics.splitPoSavings;
    });

    const averageSavingsPercent =
      totalComparedValue > 0 ? (totalRealizedSavings / totalComparedValue) * 100 : 0;

    return {
      totalCount,
      approvedCount,
      draftCount,
      poCreatedCount,
      totalComparedValue,
      totalRealizedSavings,
      averageSavingsPercent,
    };
  }, [statements]);

  // Filtered statements list
  const filteredStatements = useMemo(() => {
    return statements.filter((s) => {
      // Search matching
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesRef = s.id.toLowerCase().includes(query);
        const matchesIndent = (s.indentNo || '').toLowerCase().includes(query);
        const matchesSite = (s.site || '').toLowerCase().includes(query);
        const matchesPurpose = (s.forPurpose || '').toLowerCase().includes(query);
        const matchesNotes = (s.notes || '').toLowerCase().includes(query);
        const matchesSignatory = (s.approvalDetails?.approverName || s.approvedBy || '').toLowerCase().includes(query);
        const matchesVendors = s.vendors.some((v) => v.vendorName.toLowerCase().includes(query));
        const matchesItems = s.items.some((it) => it.itemName.toLowerCase().includes(query));

        if (!matchesRef && !matchesIndent && !matchesSite && !matchesPurpose && !matchesNotes && !matchesSignatory && !matchesVendors && !matchesItems) {
          return false;
        }
      }

      // Site filter
      if (siteFilter !== 'ALL') {
        if ((s.site || '').toUpperCase() !== siteFilter.toUpperCase()) {
          return false;
        }
      }

      // Status filter
      if (statusFilter !== 'ALL') {
        if (s.status !== statusFilter) {
          return false;
        }
      }

      return true;
    });
  }, [statements, searchQuery, siteFilter, statusFilter, dateFilter]);

  // Delete CS Modal State & Handler
  const [statementToDelete, setStatementToDelete] = useState<ComparativeStatement | null>(null);

  const confirmDeleteStatement = () => {
    if (!statementToDelete) return;
    const targetId = statementToDelete.id;
    storageAdapter.deleteComparativeStatement(targetId);
    onRefreshStatements();
    if (selectedCsForDrawer?.id === targetId) {
      setSelectedCsForDrawer(null);
    }
    const label = statementToDelete.indentNo || statementToDelete.site || 'CS Sheet';
    setStatementToDelete(null);
    setActionSuccessMsg(`Comparative Statement (${label}) permanently removed.`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  return (
    <div className="space-y-6">
      {/* 1. EXECUTIVE KPI STAT CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
        {/* Total CS Sheets */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Total Statements</span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-600">
              <FileSpreadsheet className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900">{stats.totalCount}</div>
          <div className="text-[11px] text-slate-500 font-medium">
            Active procurement files
          </div>
        </div>

        {/* Approved & Signed by Pranjal Agrawal */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/20 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-800 uppercase tracking-wider">
            <span>Approved &amp; Signed</span>
            <div className="p-1.5 rounded-lg bg-emerald-100 text-emerald-700">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-900">{stats.approvedCount}</div>
          <div className="text-[11px] text-emerald-700 font-bold truncate">
            Authorized by Pranjal Agrawal
          </div>
        </div>

        {/* Draft / In Review */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 bg-amber-50/20 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-800 uppercase tracking-wider">
            <span>Draft / In Review</span>
            <div className="p-1.5 rounded-lg bg-amber-100 text-amber-700">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-900">{stats.draftCount}</div>
          <div className="text-[11px] text-amber-700 font-medium">
            Awaiting executive sign-off
          </div>
        </div>

        {/* Total Requisition Spend Analyzed */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-slate-500 uppercase tracking-wider">
            <span>Compared Spend</span>
            <div className="p-1.5 rounded-lg bg-slate-100 text-slate-700">
              <Scale className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            ₹{stats.totalComparedValue.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">
            Total quoted requisition value
          </div>
        </div>

        {/* Realized Split PO Savings */}
        <div className="bg-white p-4 rounded-2xl border border-indigo-200 bg-indigo-50/20 shadow-2xs space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-indigo-800 uppercase tracking-wider">
            <span>Split PO Savings</span>
            <div className="p-1.5 rounded-lg bg-indigo-100 text-indigo-700">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-indigo-900 font-mono">
            ₹{stats.totalRealizedSavings.toLocaleString('en-IN', { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-indigo-700 font-bold">
            {stats.averageSavingsPercent.toFixed(1)}% Saved vs Single PO
          </div>
        </div>
      </div>

      {/* 2. FILTER & SEARCH CONTROL BAR */}
      <div className="sticky top-0 z-30 bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by Indent No, Site, Equipment, Material, Vendor, or Signatory..."
              className="w-full pl-10 pr-4 py-2 text-xs font-medium text-slate-900 bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Site Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Site:</span>
              <select
                aria-label="Filter by Site"
                value={siteFilter}
                onChange={(e) => setSiteFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer uppercase"
              >
                <option value="ALL">All Sites ({statements.length})</option>
                {uniqueSites.map((st) => (
                  <option key={st} value={st}>
                    {st}
                  </option>
                ))}
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-slate-500 uppercase">Status:</span>
              <select
                aria-label="Filter by Status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option value="ALL">All Statuses</option>
                <option value="Approved">Approved &amp; Signed</option>
                <option value="Draft">Draft / In Review</option>
                <option value="PO Created">Split POs Created</option>
              </select>
            </div>

            {/* New CS Button */}
            <button
              type="button"
              onClick={onCreateNew}
              className="flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer ml-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>New CS Sheet</span>
            </button>
          </div>
        </div>

        {/* Feedback message */}
        {actionSuccessMsg && (
          <div className="py-1.5 px-3 bg-emerald-50 border border-emerald-300 text-emerald-800 rounded-lg text-xs font-bold flex items-center gap-2">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>{actionSuccessMsg}</span>
          </div>
        )}
      </div>

      {/* 3. MASTER SAVED CS LEDGER TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-0.5">
            <div className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-indigo-400" />
              <span>Comparative Statement Ledger</span>
            </div>
            <h3 className="text-sm font-extrabold text-white uppercase tracking-wide">
              All Saved Comparative Statements ({filteredStatements.length} Records)
            </h3>
          </div>

          <div className="text-xs text-slate-300 font-medium">
            Company: <strong className="text-white">Barbrik Project Ltd.</strong> &bull; Freight: <strong className="text-slate-200">OURS</strong>
          </div>
        </div>

        {/* Table Body */}
        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-30 bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-300 shadow-xs">
              <tr>
                <th className="sticky top-0 z-30 bg-slate-100 border-b border-slate-300 py-2.5 px-3 w-12 text-center border-r border-slate-200">S.N.</th>
                <th className="sticky top-0 z-30 bg-slate-100 border-b border-slate-300 py-2.5 px-3 border-r border-slate-200">SITE</th>
                <th className="sticky top-0 z-30 bg-slate-100 border-b border-slate-300 py-2.5 px-3 border-r border-slate-200">INDENT NO &amp; DATE</th>
                <th className="sticky top-0 z-30 bg-slate-100 border-b border-slate-300 py-2.5 px-3 border-r border-slate-200 min-w-[180px]">EQUIPMENT / PURPOSE</th>
                <th className="sticky top-0 z-30 bg-slate-100 border-b border-slate-300 py-2.5 px-2.5 text-center border-r border-slate-200 w-16">ITEMS</th>
                <th className="sticky top-0 z-30 bg-slate-100 border-b border-slate-300 py-2.5 px-2.5 text-center border-r border-slate-200 w-20">VENDORS</th>
                <th className="sticky top-0 z-30 bg-slate-100 border-b border-slate-300 py-2.5 px-3 border-r border-slate-200 min-w-[160px]">SINGLE L-1 SUPPLIER</th>
                <th className="sticky top-0 z-30 bg-slate-100 border-b border-slate-300 py-2.5 px-3 text-right border-r border-slate-200 font-mono">AWARD VALUE (₹)</th>
                <th className="sticky top-0 z-30 bg-slate-100 border-b border-slate-300 py-2.5 px-3 text-center border-r border-slate-200">STATUS</th>
                <th className="sticky top-0 z-30 bg-slate-100 border-b border-slate-300 py-2.5 px-3 text-center border-r border-slate-200 min-w-[140px]">SIGNATORY</th>
                <th className="sticky top-0 z-30 bg-slate-100 border-b border-slate-300 py-2.5 px-3 text-center w-36">ACTIONS</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 relative">
              {filteredStatements.length === 0 ? (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-400 space-y-2">
                    <FileSpreadsheet className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="text-sm font-bold text-slate-600">No comparative statements found.</p>
                    <p className="text-xs text-slate-400">
                      Try adjusting your search criteria or create a new statement.
                    </p>
                  </td>
                </tr>
              ) : (
                filteredStatements.map((statement, idx) => {
                  const analytics = calculateCsL1Analytics(statement);
                  const isApproved = statement.status === 'Approved' || statement.status === 'PO Created';
                  const isPoCreated = statement.status === 'PO Created';

                  // Calculate awarded value
                  let awardedValue = 0;
                  statement.items.forEach((it) => {
                    const assignedVendorId =
                      (statement.awardedVendorMap && statement.awardedVendorMap[it.id]) ||
                      analytics.itemL1Map[it.id]?.l1VendorId ||
                      statement.vendors[0]?.vendorId;
                    const v = statement.vendors.find((vnd) => vnd.vendorId === assignedVendorId);
                    const q = v?.itemRates[it.id];
                    awardedValue += q ? q.amount : 0;
                  });

                  return (
                    <tr
                      key={statement.id}
                      onClick={() => setSelectedCsForDrawer(statement)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      {/* S.N. */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200 font-mono text-slate-500">
                        {idx + 1}
                      </td>

                      {/* Site */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <span className="font-extrabold text-slate-900 flex items-center gap-1.5 uppercase">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span>{statement.site || 'BIJETALA'}</span>
                        </span>
                      </td>

                      {/* Indent No & Date */}
                      <td className="py-2.5 px-3 border-r border-slate-200 font-mono">
                        <div className="font-black text-slate-900">
                          {statement.indentNo || 'IND-466'}
                        </div>
                        <div className="text-[10px] text-slate-500">
                          {statement.indentDate || statement.statementDate}
                        </div>
                      </td>

                      {/* Equipment / Purpose */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        <div className="font-semibold text-slate-800 line-clamp-1 max-w-xs">
                          {statement.forPurpose || 'Equipment Maintenance Spares'}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          ID: {statement.id}
                        </div>
                      </td>

                      {/* Items Count */}
                      <td className="py-2.5 px-2.5 text-center border-r border-slate-200 font-mono font-bold text-slate-700">
                        {statement.items.length}
                      </td>

                      {/* Vendors Count */}
                      <td className="py-2.5 px-2.5 text-center border-r border-slate-200 font-mono font-bold text-slate-700">
                        {statement.vendors.length}
                      </td>

                      {/* Single L-1 Supplier */}
                      <td className="py-2.5 px-3 border-r border-slate-200">
                        {analytics.singleLowestVendor ? (
                          <div>
                            <div className="font-bold text-slate-900 truncate max-w-[160px]">
                              {analytics.singleLowestVendor.vendorName}
                            </div>
                            <div className="text-[10px] font-mono text-emerald-700 font-bold">
                              ₹{analytics.singleLowestVendor.totalLanded.toLocaleString('en-IN', { minimumFractionDigits: 0 })}
                            </div>
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Award Value */}
                      <td className="py-2.5 px-3 text-right border-r border-slate-200 font-mono font-black text-slate-900">
                        ₹{awardedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 text-center border-r border-slate-200">
                        {isPoCreated ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-indigo-100 text-indigo-900 border border-indigo-200">
                            <Zap className="w-3 h-3 text-indigo-600" />
                            <span>PO Created</span>
                          </span>
                        ) : isApproved ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-100 text-emerald-900 border border-emerald-300">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Approved</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-black bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Draft</span>
                          </span>
                        )}
                      </td>

                      {/* Signatory */}
                      <td className="py-2.5 px-3 border-r border-slate-200 text-center">
                        {isApproved ? (
                          <div className="space-y-0.5">
                            <div className="font-bold text-slate-900 text-[11px] truncate max-w-[130px]">
                              Pranjal Agrawal
                            </div>
                            <div className="text-[9px] font-mono text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded inline-block">
                              Signatory Verified
                            </div>
                            <div className="text-[10px] text-slate-500 font-medium">
                              Prep: {statement.preparedBy || 'Shyam Rao Sureshe'}
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-0.5">
                            <span className="text-[10px] text-amber-700 bg-amber-50 px-2 py-0.5 rounded font-semibold inline-block border border-amber-200/60">
                              Awaiting Pranjal Agrawal
                            </span>
                            <div className="text-[10px] text-slate-500 font-medium">
                              Prep: {statement.preparedBy || 'Shyam Rao Sureshe'}
                            </div>
                          </div>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-2.5 px-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          {/* View Detail Drawer */}
                          <button
                            type="button"
                            onClick={() => setSelectedCsForDrawer(statement)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Quick View Drawer"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>

                          {/* Open Full Editor */}
                          <button
                            type="button"
                            onClick={() => onOpenEditor(statement.id)}
                            className="p-1.5 text-slate-600 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Open in Full Comparison Editor"
                          >
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Download Colored PDF */}
                          <button
                            type="button"
                            onClick={() => downloadComparativeStatementPdf(statement)}
                            className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Download Colored PDF (Landscape)"
                          >
                            <FileDown className="w-3.5 h-3.5" />
                          </button>

                          {/* Export Excel */}
                          <button
                            type="button"
                            onClick={() => downloadComparativeStatementExcel(statement)}
                            className="p-1.5 text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                            title="Export Excel (.xlsx)"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setStatementToDelete(statement);
                            }}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete Statement"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. SLIDING QUICK DETAIL MODAL DRAWER */}
      {selectedCsForDrawer && (
        <div className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex justify-end">
          <div className="bg-white w-full max-w-2xl h-full shadow-2xl border-l border-slate-200 flex flex-col justify-between overflow-hidden animate-in slide-in-from-right duration-200">
            {/* Drawer Header */}
            <div className="p-5 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-amber-400 text-slate-950 rounded font-mono">
                    CS Sheet Detail
                  </span>
                  <span className="text-xs text-indigo-300 font-mono">
                    {selectedCsForDrawer.id}
                  </span>
                </div>
                <h3 className="text-base font-black text-white">
                  {selectedCsForDrawer.site} &bull; Indent {selectedCsForDrawer.indentNo}
                </h3>
              </div>

              <button
                type="button"
                onClick={() => setSelectedCsForDrawer(null)}
                className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Content */}
            <div className="p-5 overflow-y-auto space-y-5 flex-1 text-xs">
              {/* Context Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Site</span>
                  <span className="font-extrabold text-slate-900">{selectedCsForDrawer.site || 'BIJETALA'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Indent No</span>
                  <span className="font-extrabold text-slate-900 font-mono">{selectedCsForDrawer.indentNo || '466'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Indent Date</span>
                  <span className="font-extrabold text-slate-900">{selectedCsForDrawer.indentDate || 'DD/MM/YYYY'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">Freight Terms</span>
                  <span className="font-bold text-slate-800">OURS</span>
                </div>
              </div>

              {/* Purpose */}
              <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100">
                <span className="text-[10px] text-indigo-900 uppercase font-bold block mb-0.5">
                  Equipment / Plant Purpose:
                </span>
                <p className="font-semibold text-slate-800">
                  {selectedCsForDrawer.forPurpose || 'Heavy Equipment & Machinery Maintenance'}
                </p>
              </div>

              {/* Digital Authorization Badge */}
              <div className={`p-4 rounded-xl border space-y-1.5 ${
                selectedCsForDrawer.status === 'Approved' || selectedCsForDrawer.status === 'PO Created'
                  ? 'bg-emerald-50/70 border-emerald-300 text-emerald-950'
                  : 'bg-amber-50/70 border-amber-300 text-amber-950'
              }`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-emerald-700" />
                    <span className="font-black uppercase tracking-wider text-xs">
                      {selectedCsForDrawer.status === 'Approved' || selectedCsForDrawer.status === 'PO Created'
                        ? 'Digitally Authorized Deliverable'
                        : 'Draft - Pending Executive Approval'}
                    </span>
                  </div>
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-white/80">
                    {selectedCsForDrawer.status}
                  </span>
                </div>

                {selectedCsForDrawer.approvalDetails ? (
                  <div className="text-[11px] space-y-1 pt-1 border-t border-emerald-200/60">
                    <div>
                      Signatory: <strong className="text-slate-900">Pranjal Agrawal</strong>{' '}
                      <span className="text-slate-500 font-normal">({selectedCsForDrawer.approvalDetails.approverDesignation || 'Finance Approver / Director'})</span>
                    </div>
                    <div>
                      Prepared By: <strong className="text-slate-800">{selectedCsForDrawer.preparedBy || 'Shyam Rao Sureshe'}</strong>
                    </div>
                    <div className="text-[10px] text-slate-500 font-mono">
                      Timestamp: {selectedCsForDrawer.approvalDetails.approvalDate} &bull; Token: {selectedCsForDrawer.approvalDetails.signatureStamp}
                    </div>
                    {selectedCsForDrawer.approvalDetails.remarks && (
                      <div className="text-slate-700 italic bg-white/60 p-2 rounded">
                        &ldquo;{selectedCsForDrawer.approvalDetails.remarks}&rdquo;
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-[11px] text-amber-800 pt-1 space-y-1">
                    <div>
                      Prepared By: <strong className="text-slate-800">{selectedCsForDrawer.preparedBy || 'Shyam Rao Sureshe'}</strong>
                    </div>
                    <div>
                      This comparative sheet has not yet been authorized. Click &ldquo;Open in Full Editor&rdquo; to review quotes and digitally sign.
                    </div>
                  </div>
                )}
              </div>

              {/* Line Items & Multi-Vendor Award Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs font-black uppercase text-slate-700">
                  <span>Requisition Items ({selectedCsForDrawer.items.length})</span>
                  <span className="text-slate-400 font-normal font-sans lowercase">
                    {selectedCsForDrawer.vendors.length} vendors evaluated
                  </span>
                </div>

                <div className="rounded-xl border border-slate-200 overflow-hidden divide-y divide-slate-100">
                  {selectedCsForDrawer.items.map((it, idx) => {
                    const l1 = calculateCsL1Analytics(selectedCsForDrawer).itemL1Map[it.id];
                    const assignedVendorId =
                      (selectedCsForDrawer.awardedVendorMap && selectedCsForDrawer.awardedVendorMap[it.id]) ||
                      l1?.l1VendorId ||
                      selectedCsForDrawer.vendors[0]?.vendorId;
                    const vendor = selectedCsForDrawer.vendors.find((v) => v.vendorId === assignedVendorId);
                    const q = vendor?.itemRates[it.id];
                    const isL1 = l1 && l1.l1Rate > 0 && l1.l1VendorId === assignedVendorId;

                    return (
                      <div key={it.id} className="p-3 flex items-center justify-between gap-3 bg-white hover:bg-slate-50">
                        <div className="space-y-0.5">
                          <div className="font-bold text-slate-900 flex items-center gap-1.5">
                            <span className="text-[10px] font-mono text-slate-400">{idx + 1}.</span>
                            <span>{it.itemName}</span>
                            <span className="text-[10px] text-slate-400 font-normal">({it.qty} {it.unit})</span>
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Make: {it.brandMake || 'Standard'} &bull; Awarded to:{' '}
                            <strong className="text-slate-800">{vendor?.vendorName || 'Unassigned'}</strong>
                          </div>
                        </div>

                        <div className="text-right shrink-0">
                          <div className="font-mono font-bold text-slate-900">
                            ₹{q?.amount?.toLocaleString('en-IN', { minimumFractionDigits: 2 }) || '0.00'}
                          </div>
                          <span className={`text-[9px] font-black px-1.5 py-0.2 rounded font-sans uppercase ${
                            isL1 ? 'bg-emerald-100 text-emerald-800' : 'bg-indigo-100 text-indigo-800'
                          }`}>
                            {isL1 ? 'L-1 Lowest' : 'Dual Source'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Linked Split POs if Created */}
              {selectedCsForDrawer.generatedPoIds && selectedCsForDrawer.generatedPoIds.length > 0 && (
                <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-200 space-y-1.5">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-indigo-900">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    <span>Split Purchase Orders Active ({selectedCsForDrawer.generatedPoIds.length} POs)</span>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {selectedCsForDrawer.generatedPoIds.map((poId) => (
                      <span key={poId} className="px-2 py-0.5 bg-white text-indigo-900 rounded font-mono text-[10px] font-bold border border-indigo-200">
                        {poId}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedCsForDrawer(null)}
                  className="px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
                >
                  Close Drawer
                </button>
                <button
                  type="button"
                  onClick={() => setStatementToDelete(selectedCsForDrawer)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Delete this statement"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                {/* Download Colored PDF */}
                <button
                  type="button"
                  onClick={() => downloadComparativeStatementPdf(selectedCsForDrawer)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Download Designed Colored PDF"
                >
                  <FileDown className="w-3.5 h-3.5" />
                  <span>Download PDF</span>
                </button>

                {/* Export Excel */}
                <button
                  type="button"
                  onClick={() => downloadComparativeStatementExcel(selectedCsForDrawer)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Export Excel (.xlsx)"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export Excel</span>
                </button>

                {/* Open in Full Editor */}
                <button
                  type="button"
                  onClick={() => {
                    const id = selectedCsForDrawer.id;
                    setSelectedCsForDrawer(null);
                    onOpenEditor(id);
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
                >
                  <span>Open in Full Editor</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CONFIRM DELETE MODAL */}
      {statementToDelete && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Comparative Statement?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to permanently delete this Comparative Statement? This action cannot be undone and will remove all vendor quotations and landed calculations.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Site:</span>
                <span className="font-bold text-slate-900">{statementToDelete.site}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Indent No:</span>
                <span className="font-mono font-bold text-slate-900">{statementToDelete.indentNo || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Purpose / Scope:</span>
                <span className="font-bold text-slate-800 truncate max-w-[200px]">{statementToDelete.forPurpose || 'General Procurement'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Items / Vendors:</span>
                <span className="font-bold text-slate-800">{statementToDelete.items.length} items &bull; {statementToDelete.vendors.length} vendors</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setStatementToDelete(null)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteStatement}
                className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Statement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
