import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Search, 
  Filter, 
  Download, 
  Eye, 
  ChevronDown, 
  ChevronRight, 
  Paperclip, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  User, 
  Building2, 
  FileText, 
  CheckSquare, 
  SlidersHorizontal,
  RefreshCw,
  FolderOpen,
  Trash2
} from 'lucide-react';
import { FmsInstance, FmsStageExecution, UserProfile, isUserSuperAdmin, isUserAdminOrSuperAdmin, getUserModulePermission } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { downloadCsv } from '../../utils/csvExporter';
import { FilePreviewModal } from '../common/FilePreviewModal';
import { formatDelayVariance, getStageDelayHours } from './FmsPipeline';

interface FmsAuditLedgerViewProps {
  flows: FmsInstance[];
  currentUser: UserProfile;
  onSelectFlow?: (flow: FmsInstance) => void;
  onDeleteFlow?: (flowId: string) => void;
}

export const FmsAuditLedgerView: React.FC<FmsAuditLedgerViewProps> = ({
  flows,
  currentUser,
  onSelectFlow,
  onDeleteFlow,
}) => {
  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const canDelete = isSuperAdmin || isUserAdminOrSuperAdmin(currentUser) || getUserModulePermission(currentUser, 'fms').canDelete;
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFlowType, setSelectedFlowType] = useState<string>('ALL');
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [viewFormat, setViewFormat] = useState<'ACCORDION' | 'FLAT_STAGES'>('ACCORDION');
  const [expandedFlowIds, setExpandedFlowIds] = useState<Record<string, boolean>>({});
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  // Template registry lookup for human-friendly flow labels
  const customTemplates = useMemo(() => storageAdapter.getFmsTemplates(), []);

  const getFlowDisplayName = (flowType: string): string => {
    const matched = customTemplates.find((t) => t.templateKey === flowType);
    if (matched) return matched.name;
    switch (flowType) {
      case 'CHECK_STOCK': return 'Store Check Stock';
      case 'PO_TO_PAYMENT': return 'Accounts PO to Payment';
      case 'STORE_TO_SITE_DISPATCH': return 'Store to Site Dispatch';
      case 'PURCHASE_TO_STORE_DISPATCH': return 'Purchase to Store Dispatch';
      case 'PAYMENT_TO_DISPATCH': return 'Payment to Dispatch';
      case 'SITE_RECEIVE': return 'Site Receive';
      case 'ACCOUNTS_INVOICE_COLLECTION': return 'Accounts Invoice Collection';
      case 'HR_ATTENDANCE_PAYMENT': return 'Labour Attendance & Payment';
      case 'BREAKDOWN_REPORTING': return 'Machine Breakdown';
      case 'EQUIPMENT_PART_REPAIR': return 'Equipment Part Repair';
      case 'DPR_REPORTING': return 'Daily Progress Report';
      case 'INDENT_PURCHASE': return 'Purchase Indent to PO';
      default: return flowType.replace(/_/g, ' ');
    }
  };

  // Distinct flow types present in dataset
  const distinctFlowTypes = useMemo(() => {
    const set = new Set<string>();
    flows.forEach((f) => set.add(f.flowType));
    return Array.from(set);
  }, [flows]);

  // Filtered flows
  const filteredFlows = useMemo(() => {
    return flows.filter((f) => {
      if (selectedFlowType !== 'ALL' && f.flowType !== selectedFlowType) return false;
      if (selectedStatus !== 'ALL' && f.status !== selectedStatus) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchBasic = 
          (f.indentNo && f.indentNo.toLowerCase().includes(q)) ||
          (f.flowId && f.flowId.toLowerCase().includes(q)) ||
          (f.siteName && f.siteName.toLowerCase().includes(q)) ||
          (f.vendorName && f.vendorName.toLowerCase().includes(q)) ||
          (f.remarks && f.remarks.toLowerCase().includes(q));

        if (matchBasic) return true;

        // Search within stages and submitted form fields
        const matchStages = f.stages?.some((stg) => {
          if (stg.stageName && stg.stageName.toLowerCase().includes(q)) return true;
          if (stg.assignee && stg.assignee.toLowerCase().includes(q)) return true;
          if (stg.submittedData) {
            return Object.entries(stg.submittedData).some(([k, v]) => 
              k.toLowerCase().includes(q) || String(v).toLowerCase().includes(q)
            );
          }
          return false;
        });

        if (matchStages) return true;
        return false;
      }
      return true;
    });
  }, [flows, selectedFlowType, selectedStatus, searchQuery]);

  // Flat stage rows computed across filtered flows
  const flatStageRecords = useMemo(() => {
    const list: Array<{
      flow: FmsInstance;
      stage: FmsStageExecution;
      stageIndex: number;
    }> = [];

    filteredFlows.forEach((flow) => {
      flow.stages?.forEach((stage, idx) => {
        list.push({ flow, stage, stageIndex: idx });
      });
    });

    return list;
  }, [filteredFlows]);

  const toggleExpandFlow = (id: string) => {
    setExpandedFlowIds((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const expandAll = () => {
    const map: Record<string, boolean> = {};
    filteredFlows.forEach((f) => { map[f.id] = true; });
    setExpandedFlowIds(map);
  };

  const collapseAll = () => {
    setExpandedFlowIds({});
  };

  // Helper for human-readable field labels
  const resolveFieldLabel = (key: string, stage: FmsStageExecution, flow: FmsInstance): string => {
    const matchedField = stage.fields?.find((f) => f.id === key);
    if (matchedField?.label) return matchedField.label;

    const KNOWN_LABELS: Record<string, string> = {
      requisitionNumber: 'Requisition / Indent No.',
      indentNo: 'Indent No.',
      site: 'Site Name',
      priority: 'Priority',
      remarks: 'Remarks',
      vendorName: 'Vendor Name',
      poNumber: 'PO Number',
      poAmount: 'PO Amount (₹)',
      amountToBePaid: 'Amount to Be Paid (₹)',
      modeOfPayment: 'Mode of Payment',
      purposeOfPayment: 'Purpose of Payment',
      requestedBy: 'Requested By',
      sheetNo: 'Sheet / Voucher No.',
      billNoOrPo: 'Bill No. / PO',
      poUploadLink: 'PO Upload Link',
      attendanceDate: 'Attendance Date',
      totalLabourPresent: 'Total Labour Present',
      totalOtHours: 'Total OT Hours',
      machineName: 'Machine Name',
      machineIdNo: 'Machine ID No.',
      machineMakeModel: 'Make / Model',
      attendingMechanic: 'Attending Mechanic',
      mechanicMobileNo: 'Mechanic Mobile No.',
      partEquipmentName: 'Equipment / Part Name',
      partSerialNo: 'Part Serial No.',
      vehiclePlantMachineName: 'Machine / Plant Name',
      warrantyStatus: 'Warranty Status',
      dprDate: 'DPR Date',
      dprPreparedBy: 'DPR Prepared By',
      status: 'Approval Status',
      approvedAmount: 'Approved Amount (₹)',
      approvalRemarks: 'Approval Notes',
      bankEntryStatus: 'Bank Entry Status',
      bankAccount: 'Bank Account Debited',
      entryRemarks: 'Bank Entry Notes',
      paymentStatus: 'Payment Status',
      utrNumber: 'Bank UTR / Transaction No.',
      verified: 'Verification Status',
      finalRemarks: 'Disbursement Remarks',
    };

    if (KNOWN_LABELS[key]) return KNOWN_LABELS[key];

    const matchField = key.match(/^field_(\d+)_(\d+)$/i);
    if (matchField) {
      return `Field #${matchField[2]} (Stage ${matchField[1]})`;
    }
    return key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
  };

  // CSV Export implementation
  const handleExportCsv = () => {
    if (viewFormat === 'ACCORDION') {
      const headers = [
        'Flow ID',
        'Indent / Ref No',
        'Flow Type',
        'Site Location',
        'Priority',
        'Status',
        'Current Stage',
        'Total Stages',
        'Vendor Name',
        'PO Amount',
        'Delay (Hours)',
        'Created Date',
        'Updated Date',
        'Remarks'
      ];
      const rows = filteredFlows.map((f) => [
        f.flowId,
        f.indentNo,
        getFlowDisplayName(f.flowType),
        f.siteName,
        f.priority,
        f.status,
        f.currentStageIndex + 1,
        f.totalStages,
        f.vendorName || '',
        f.poAmount ?? '',
        f.totalDelayHours || 0,
        f.createdAt || '',
        f.updatedAt || '',
        f.remarks || ''
      ]);
      downloadCsv(`fms-audit-summary-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    } else {
      const headers = [
        'Flow ID',
        'Indent No',
        'Flow Type',
        'Site',
        'Stage #',
        'Stage Name',
        'Assignee',
        'Status',
        'Planned Time',
        'Actual Time',
        'Delay (Hours)',
        'Decision',
        'Checklist Items Passed',
        'Recorded Field Responses'
      ];
      const rows = flatStageRecords.map(({ flow, stage, stageIndex }) => {
        const submittedEntries = Object.entries(stage.submittedData || {})
          .filter(([k]) => !k.startsWith('_'))
          .map(([k, v]) => `${resolveFieldLabel(k, stage, flow)}: ${Array.isArray(v) ? `${v.length} item(s)` : String(v)}`)
          .join(' | ');

        const checklistCount = stage.checkpoints
          ? `${stage.checkedCheckpoints?.length || 0}/${stage.checkpoints.length}`
          : '—';

        return [
          flow.flowId,
          flow.indentNo,
          getFlowDisplayName(flow.flowType),
          flow.siteName,
          stageIndex + 1,
          stage.stageName,
          stage.assignee,
          stage.status,
          stage.plannedDateTime || '—',
          stage.actualDateTime || '—',
          formatDelayVariance(Math.max(stage.delayHours ?? 0, stage.timeDelayHours ?? 0, getStageDelayHours(stage))),
          stage.decisionValue || '—',
          checklistCount,
          submittedEntries || 'None'
        ];
      });
      downloadCsv(`fms-detailed-stage-ledger-${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
    }
  };

  return (
    <div className="space-y-5">
      {/* Page Header */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
            <FileSpreadsheet className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900">
                FMS Audit &amp; Stage Records Ledger
              </h1>
              <span className="text-[11px] px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {filteredFlows.length} Flows Recorded
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Comprehensive operational register showing each workflow’s stage timeline, submitted form fields, checklist results, and uploaded files.
            </p>
          </div>
        </div>

        {/* View Switcher & CSV Download */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewFormat('ACCORDION')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewFormat === 'ACCORDION'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Workflow Breakdown
            </button>
            <button
              type="button"
              onClick={() => setViewFormat('FLAT_STAGES')}
              className={`px-3 py-1.5 rounded-md transition-all cursor-pointer ${
                viewFormat === 'FLAT_STAGES'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Flat Stage Register ({flatStageRecords.length})
            </button>
          </div>

          <button
            type="button"
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
            title="Download CSV spreadsheet of current records"
          >
            <Download className="w-3.5 h-3.5 text-slate-500" />
            <span>Export CSV</span>
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Query */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search Indent, ID, Site, Vendor, Field..."
              className="w-full pl-8 pr-3 py-2 text-xs bg-slate-50 focus:bg-white border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-colors"
            />
          </div>

          {/* Flow Type Filter */}
          <div>
            <select
              aria-label="Filter by workflow type"
              value={selectedFlowType}
              onChange={(e) => setSelectedFlowType(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="ALL">All Workflow Types ({distinctFlowTypes.length})</option>
              {distinctFlowTypes.map((type) => (
                <option key={type} value={type}>
                  {getFlowDisplayName(type)}
                </option>
              ))}
            </select>
          </div>

          {/* Status Filter */}
          <div>
            <select
              aria-label="Filter by status"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="w-full py-2 px-3 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
            >
              <option value="ALL">All Statuses</option>
              <option value="Completed">Completed</option>
              <option value="In Progress">In Progress</option>
              <option value="On Hold">On Hold</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          {/* Accordion Controls (when in Accordion view) */}
          <div className="flex items-center gap-2">
            {viewFormat === 'ACCORDION' ? (
              <>
                <button
                  type="button"
                  onClick={expandAll}
                  className="flex-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
                >
                  Expand All Stages
                </button>
                <button
                  type="button"
                  onClick={collapseAll}
                  className="flex-1 py-2 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer text-center"
                >
                  Collapse All
                </button>
              </>
            ) : (
              <div className="text-xs text-slate-500 py-2 px-2 flex items-center gap-1.5 font-medium">
                <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
                <span>Showing {flatStageRecords.length} executed stage records</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      {viewFormat === 'ACCORDION' ? (
        /* ================= Mode A: Workflow Breakdown with Stage Accordion ================= */
        <div className="space-y-3">
          {filteredFlows.length === 0 ? (
            <div className="p-12 text-center bg-white rounded-xl border border-dashed border-slate-200">
              <FolderOpen className="w-9 h-9 text-slate-300 mx-auto mb-2" />
              <p className="text-sm font-semibold text-slate-700">No matching FMS records found</p>
              <p className="text-xs text-slate-400 mt-1">Try clearing or adjusting search filters.</p>
            </div>
          ) : (
            filteredFlows.map((flow) => {
              const isExpanded = Boolean(expandedFlowIds[flow.id]);
              const completedCount = flow.stages?.filter((s) => s.status === 'Done' || s.status === 'Skipped' || s.status === 'Completed').length || 0;
              const hasDelay = (flow.totalDelayHours || 0) > 0;

              return (
                <div 
                  key={flow.id} 
                  className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden transition-all"
                >
                  {/* Flow Header Card */}
                  <div className="p-4 flex flex-col lg:flex-row lg:items-center justify-between gap-3 bg-white hover:bg-slate-50/50 transition-colors">
                    <div className="flex items-start gap-3 min-w-0">
                      <button
                        type="button"
                        onClick={() => toggleExpandFlow(flow.id)}
                        className="mt-0.5 p-1 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md transition-colors cursor-pointer"
                        title={isExpanded ? 'Collapse stages' : 'Expand stages'}
                      >
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-indigo-600" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200">
                            #{flow.indentNo}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {getFlowDisplayName(flow.flowType)}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            flow.status === 'Completed'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : flow.status === 'In Progress'
                              ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                              : 'bg-slate-100 text-slate-700 border-slate-200'
                          }`}>
                            {flow.status}
                          </span>
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            flow.priority === 'Urgent'
                              ? 'bg-red-50 text-red-700 border-red-200'
                              : 'bg-blue-50 text-blue-700 border-blue-200'
                          }`}>
                            {flow.priority}
                          </span>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                          <span className="flex items-center gap-1 font-medium">
                            <MapPin className="w-3.5 h-3.5 text-slate-400" />
                            {flow.siteName}
                          </span>
                          {flow.indentDate && (
                            <span className="flex items-center gap-1 font-medium">
                              <Calendar className="w-3.5 h-3.5 text-slate-400" />
                              {flow.indentDate}
                            </span>
                          )}
                          {flow.vendorName && (
                            <span className="flex items-center gap-1 font-medium text-slate-700">
                              <Building2 className="w-3.5 h-3.5 text-indigo-500" />
                              {flow.vendorName}
                            </span>
                          )}
                          {flow.poAmount !== undefined && (
                            <span className="font-mono font-bold text-slate-800">
                              ₹{Number(flow.poAmount).toLocaleString('en-IN')}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Progress Summary and Action Buttons */}
                    <div className="flex items-center gap-3 self-end lg:self-center shrink-0">
                      <div className="text-right text-xs">
                        <div className="font-bold text-slate-700">
                          {completedCount} / {flow.totalStages} Stages Done
                        </div>
                        <div className={`text-[11px] font-mono font-medium ${
                          hasDelay ? 'text-rose-600' : 'text-emerald-600'
                        }`}>
                          {hasDelay ? `+${formatDelayVariance(flow.totalDelayHours)} Delay` : 'On Time'}
                        </div>
                      </div>

                      {onSelectFlow && (
                        <button
                          type="button"
                          onClick={() => onSelectFlow(flow)}
                          className="px-2.5 py-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                          title="Open Full Audit Trail Dialog"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Audit Dialog</span>
                        </button>
                      )}

                      {canDelete && (
                        confirmDeleteId === flow.id ? (
                          <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
                            <span className="text-xs font-bold text-rose-700">Delete record?</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (onDeleteFlow) {
                                  onDeleteFlow(flow.id);
                                } else {
                                  storageAdapter.deleteFmsFlow(flow.id, currentUser);
                                }
                                setConfirmDeleteId(null);
                              }}
                              className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold cursor-pointer"
                            >
                              Yes
                            </button>
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-medium cursor-pointer"
                            >
                              No
                            </button>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(flow.id)}
                            className="px-2.5 py-1.5 text-xs font-semibold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer flex items-center gap-1"
                            title="Delete FMS Record"
                          >
                            <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                            <span>Delete</span>
                          </button>
                        )
                      )}

                      <button
                        type="button"
                        onClick={() => toggleExpandFlow(flow.id)}
                        className="px-2.5 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-lg transition-colors cursor-pointer"
                      >
                        {isExpanded ? 'Hide Details' : 'View Stages & Fields'}
                      </button>
                    </div>
                  </div>

                  {/* Accordion Content: Stages breakdown */}
                  {isExpanded && (
                    <div className="border-t border-slate-200 bg-slate-50/60 p-4 space-y-4">
                      {(!flow.stages || flow.stages.length === 0) ? (
                        <p className="text-xs text-slate-400 italic">No stages configured for this workflow.</p>
                      ) : (
                        flow.stages.map((stage, idx) => {
                          const stageFields = stage.fields || [];
                          const rawEntries = Object.entries(stage.submittedData || {}).filter(([k]) => !k.startsWith('_'));
                          const entries = [...rawEntries].sort(([keyA], [keyB]) => {
                            const idxA = stageFields.findIndex((f) => f.id === keyA);
                            const idxB = stageFields.findIndex((f) => f.id === keyB);
                            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                            if (idxA !== -1) return -1;
                            if (idxB !== -1) return 1;
                            return 0;
                          });
                          const isDone = stage.status === 'Done' || stage.status === 'Skipped' || stage.status === 'Completed';
                          const delay = Math.max(stage.delayHours ?? 0, stage.timeDelayHours ?? 0, getStageDelayHours(stage));
                          const isOverdue = !isDone && delay > 0;

                          return (
                            <div 
                              key={stage.stageId || idx}
                              className={`rounded-xl border overflow-hidden transition-colors ${
                                isOverdue
                                  ? 'bg-amber-50/50 border-amber-300 shadow-xs ring-1 ring-amber-200'
                                  : !isDone
                                  ? 'bg-amber-50/20 border-amber-200 shadow-2xs'
                                  : 'bg-white border-slate-200 shadow-2xs'
                              }`}
                            >
                              {/* Stage Header */}
                              <div className={`px-3.5 py-2.5 border-b flex items-center justify-between flex-wrap gap-2 text-xs ${
                                isOverdue
                                  ? 'bg-amber-100/70 border-amber-200'
                                  : !isDone
                                  ? 'bg-amber-50/50 border-amber-200'
                                  : 'bg-slate-50/90 border-slate-200'
                              }`}>
                                <div className="flex items-center gap-2">
                                  <span className={`px-2 py-0.5 rounded-md font-bold text-[10px] text-white ${
                                    isDone 
                                      ? 'bg-indigo-600' 
                                      : isOverdue
                                      ? 'bg-amber-600'
                                      : 'bg-slate-600'
                                  }`}>
                                    Stage #{idx + 1}
                                  </span>
                                  <span className="font-bold text-slate-900">
                                    {stage.stageName}
                                  </span>
                                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                                    isDone 
                                      ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                                      : isOverdue
                                      ? 'bg-amber-100 text-amber-800 border-amber-300 font-semibold'
                                      : stage.status === 'In Progress'
                                      ? 'bg-blue-50 text-blue-700 border-blue-200'
                                      : 'bg-slate-100 text-slate-600 border-slate-200'
                                  }`}>
                                    {stage.status}
                                  </span>
                                  {!isDone && (
                                    <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide rounded border ${
                                      isOverdue
                                        ? 'bg-amber-200 text-amber-900 border-amber-300'
                                        : 'bg-amber-100 text-amber-800 border-amber-200'
                                    }`}>
                                      Uncompleted
                                    </span>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 text-slate-500 font-medium flex-wrap text-[11px]">
                                  {stage.assignee && (
                                    <span className="flex items-center gap-1">
                                      <User className="w-3 h-3 text-slate-400" />
                                      {stage.assignee}
                                    </span>
                                  )}
                                  {stage.plannedDateTime && (
                                    <span>Planned: {stage.plannedDateTime}</span>
                                  )}
                                  {stage.actualDateTime && (
                                    <span className="font-mono text-slate-700 font-semibold">
                                      Actual: {stage.actualDateTime}
                                    </span>
                                  )}
                                  {delay > 0 ? (
                                    <span className={`font-mono font-bold px-2 py-0.5 rounded text-[11px] border ${
                                      isDone
                                        ? 'bg-rose-50 text-rose-700 border-rose-200'
                                        : 'bg-amber-100 text-amber-800 border-amber-300'
                                    }`}>
                                      +{formatDelayVariance(delay)} {isDone ? 'late' : 'delay'}
                                    </span>
                                  ) : (
                                    <span className="text-emerald-600 font-mono text-[11px] font-medium">
                                      On Time
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Stage Body: Fields & Checklists */}
                              <div className="p-3.5 space-y-3">
                                {/* Checklists if any */}
                                {stage.checkpoints && stage.checkpoints.length > 0 && (
                                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                                    <div className="text-[11px] font-bold text-slate-600 mb-1.5 flex items-center gap-1.5">
                                      <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                                      <span>Execution Checkpoints ({stage.checkedCheckpoints?.length || 0} / {stage.checkpoints.length} verified):</span>
                                    </div>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                      {stage.checkpoints.map((cp, cIdx) => {
                                        const isChecked = stage.checkedCheckpoints?.includes(cp);
                                        return (
                                          <div key={cIdx} className="flex items-center gap-1.5 text-xs text-slate-700">
                                            {isChecked ? (
                                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            ) : (
                                              <span className="w-3.5 h-3.5 rounded border border-slate-300 shrink-0" />
                                            )}
                                            <span className={isChecked ? 'font-medium text-slate-800' : 'text-slate-500'}>
                                              {cp}
                                            </span>
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                )}

                                {/* Submitted Custom Fields */}
                                {entries.length === 0 ? (
                                  <div className="text-[11px] text-slate-400 italic py-1">
                                    No custom input fields recorded for this stage.
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
                                    {entries.map(([key, rawVal]) => {
                                      const label = resolveFieldLabel(key, stage, flow);
                                      let val = rawVal;
                                      if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
                                        try {
                                          val = JSON.parse(val);
                                        } catch {
                                          // keep raw
                                        }
                                      }
                                      if (typeof val === 'string' && (val === '[object Object]' || val.includes('[object Object]'))) {
                                        if (key.toLowerCase().includes('item') && flow.lineItems && flow.lineItems.length > 0) {
                                          val = flow.lineItems;
                                        }
                                      }

                                      const isItemArray = Array.isArray(val);
                                      const isItemObj = typeof val === 'object' && val !== null && (
                                        Array.isArray((val as any).items) ||
                                        (key.toLowerCase().includes('item') && Object.values(val).every((sub) => typeof sub === 'object' && sub !== null))
                                      );

                                      const itemsList = isItemArray
                                        ? val
                                        : isItemObj
                                        ? (Array.isArray((val as any).items) ? (val as any).items : Object.values(val))
                                        : null;

                                      const strVal = typeof val === 'object' && val !== null && !itemsList
                                        ? Object.entries(val)
                                            .map(([sk, sv]) => `${sk}: ${typeof sv === 'object' ? JSON.stringify(sv) : sv}`)
                                            .join(' • ')
                                        : String(val ?? '');

                                      const isDataFile = strVal.startsWith('data:');
                                      const isRefFile = strVal.startsWith('[File: ');
                                      const isHttpLink = strVal.startsWith('http://') || strVal.startsWith('https://');
                                      const isYesNo = strVal === 'Yes' || strVal === 'No';

                                      return (
                                        <div 
                                          key={key} 
                                          className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/80 space-y-1"
                                        >
                                          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500 truncate">
                                            {label}
                                          </div>
                                          <div className="text-xs font-semibold text-slate-800 break-words">
                                            {itemsList && itemsList.length > 0 ? (
                                              <div className="space-y-1">
                                                <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100 inline-block">
                                                  {itemsList.length} Itemized Row{itemsList.length === 1 ? '' : 's'}
                                                </span>
                                                <div className="text-[11px] text-slate-700 max-h-28 overflow-y-auto space-y-1 font-mono bg-white p-2 rounded border border-slate-200 shadow-2xs">
                                                  {itemsList.map((itemRow: any, rIdx: number) => {
                                                    const desc = itemRow.itemDescription || itemRow.item_description || itemRow.description || itemRow.name;
                                                    const qty = itemRow.qty || itemRow.quantity || itemRow.requestedQty || itemRow.storeQty || '';
                                                    const unit = itemRow.unit || 'Nos';
                                                    if (desc) {
                                                      return (
                                                        <div key={rIdx} className="truncate border-b border-slate-100 last:border-b-0 pb-0.5">
                                                          <span className="font-bold text-indigo-900">#{rIdx + 1}:</span> {desc} {qty ? `(${qty} ${unit})` : ''}
                                                        </div>
                                                      );
                                                    }
                                                    const rowVals = Object.entries(itemRow)
                                                      .filter(([rk]) => rk !== 'id')
                                                      .map(([_, rv]) => String(rv ?? ''))
                                                      .filter(Boolean);
                                                    return (
                                                      <div key={rIdx} className="truncate border-b border-slate-100 last:border-b-0 pb-0.5">
                                                        <span className="font-bold text-indigo-900">#{rIdx + 1}:</span> {rowVals.join(' | ')}
                                                      </div>
                                                    );
                                                  })}
                                                </div>
                                              </div>
                                            ) : isDataFile || isRefFile ? (
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  setPreviewFile({
                                                    url: strVal,
                                                    name: isRefFile
                                                      ? strVal.replace(/^\[File:\s*/, '').replace(/\]$/, '')
                                                      : `${label} Attachment`,
                                                  })
                                                }
                                                className="w-full text-left inline-flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg border border-indigo-200 transition-colors cursor-pointer"
                                                title="Open attachment in preview modal"
                                              >
                                                <span className="inline-flex items-center gap-1.5 truncate">
                                                  <Paperclip className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                                                  <span className="truncate">
                                                    {isRefFile
                                                      ? strVal.replace(/^\[File:\s*/, '').replace(/\]$/, '')
                                                      : 'View Uploaded File'}
                                                  </span>
                                                </span>
                                                <Eye className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                                              </button>
                                            ) : isHttpLink ? (
                                              <a
                                                href={strVal}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 underline"
                                              >
                                                <span>Open Link</span>
                                                <ExternalLink className="w-3 h-3" />
                                              </a>
                                            ) : isYesNo ? (
                                              <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                                strVal === 'Yes' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-700'
                                              }`}>
                                                {strVal}
                                              </span>
                                            ) : (
                                              <span>{strVal === '[object Object]' ? '—' : strVal}</span>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* ================= Mode B: Flat Stage Register (Row-by-Row Table) ================= */
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Flow Ref</th>
                  <th className="py-2.5 px-3">Workflow</th>
                  <th className="py-2.5 px-3">Site</th>
                  <th className="py-2.5 px-3">Stage #</th>
                  <th className="py-2.5 px-3">Stage Name</th>
                  <th className="py-2.5 px-3">Assignee</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3">Planned Date</th>
                  <th className="py-2.5 px-3">Actual Timestamp</th>
                  <th className="py-2.5 px-3">Delay</th>
                  <th className="py-2.5 px-3">Recorded Fields &amp; Attachments</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {flatStageRecords.length === 0 ? (
                  <tr>
                    <td colSpan={12} className="py-8 text-center text-slate-400">
                      No stage records match the current filters.
                    </td>
                  </tr>
                ) : (
                  flatStageRecords.map(({ flow, stage, stageIndex }) => {
                    const entries = Object.entries(stage.submittedData || {}).filter(([k]) => !k.startsWith('_'));
                    const isDone = stage.status === 'Done' || stage.status === 'Skipped' || stage.status === 'Completed';
                    const delay = Math.max(stage.delayHours ?? 0, stage.timeDelayHours ?? 0, getStageDelayHours(stage));

                    return (
                      <tr key={`${flow.id}-${stage.stageId || stageIndex}`} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-2.5 px-3 font-mono font-bold text-slate-800 whitespace-nowrap">
                          #{flow.indentNo}
                        </td>
                        <td className="py-2.5 px-3 font-medium text-slate-900 whitespace-nowrap">
                          {getFlowDisplayName(flow.flowType)}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {flow.siteName}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-500 whitespace-nowrap">
                          {stageIndex + 1}
                        </td>
                        <td className="py-2.5 px-3 font-semibold text-slate-800">
                          {stage.stageName}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                          {stage.assignee || '—'}
                        </td>
                        <td className="py-2.5 px-3 whitespace-nowrap">
                          <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isDone 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                              : delay > 0
                              ? 'bg-amber-100 text-amber-800 border-amber-300 font-semibold'
                              : stage.status === 'In Progress'
                              ? 'bg-blue-50 text-blue-700 border-blue-200'
                              : 'bg-slate-100 text-slate-600 border-slate-200'
                          }`}>
                            {stage.status}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {stage.plannedDateTime || '—'}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                          {stage.actualDateTime || '—'}
                        </td>
                        <td className={`py-2.5 px-3 font-mono whitespace-nowrap text-center transition-colors ${
                          delay > 0
                            ? isDone
                              ? 'bg-rose-100 text-rose-900 border-x border-rose-300 font-bold'
                              : 'bg-amber-100 text-amber-900 border-x border-amber-300 font-bold'
                            : 'text-slate-400'
                        }`}>
                          {delay > 0 ? `+${formatDelayVariance(delay)}` : '—'}
                        </td>
                        <td className="py-2.5 px-3 max-w-xs">
                          {entries.length === 0 ? (
                            <span className="text-slate-400 italic">None</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {entries.slice(0, 3).map(([k, v]) => {
                                const strVal = String(v ?? '');
                                const isFile = strVal.startsWith('data:') || strVal.startsWith('[File: ');
                                const label = resolveFieldLabel(k, stage, flow);

                                if (isFile) {
                                  return (
                                    <button
                                      key={k}
                                      type="button"
                                      onClick={() =>
                                        setPreviewFile({
                                          url: strVal,
                                          name: strVal.startsWith('[File: ')
                                            ? strVal.replace(/^\[File:\s*/, '').replace(/\]$/, '')
                                            : `${label} Attachment`,
                                        })
                                      }
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-[10px] font-semibold cursor-pointer"
                                      title="Click to preview file"
                                    >
                                      <Paperclip className="w-3 h-3 text-indigo-600" />
                                      <span className="truncate max-w-[100px]">{label}</span>
                                    </button>
                                  );
                                }

                                return (
                                  <span key={k} className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200 text-[10px]">
                                    <span className="font-semibold text-slate-900">{label}:</span> {strVal}
                                  </span>
                                );
                              })}
                              {entries.length > 3 && (
                                <span className="text-[10px] font-semibold text-indigo-600 px-1 py-0.5">
                                  +{entries.length - 3} more
                                </span>
                              )}
                            </div>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-right whitespace-nowrap">
                          {onSelectFlow && (
                            <button
                              type="button"
                              onClick={() => onSelectFlow(flow)}
                              className="text-indigo-600 hover:text-indigo-800 font-semibold text-xs hover:underline cursor-pointer"
                            >
                              Flow Details →
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* File Preview Modal */}
      {previewFile && (
        <FilePreviewModal
          isOpen={Boolean(previewFile)}
          fileUrl={previewFile.url}
          fileName={previewFile.name}
          onClose={() => setPreviewFile(null)}
        />
      )}
    </div>
  );
};
