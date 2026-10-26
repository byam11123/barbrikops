import React, { useState, useMemo, useEffect } from 'react';
import {
  Search,
  Filter,
  Download,
  ChevronLeft,
  ChevronRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileSpreadsheet,
  Layers,
  Eye,
  Trash2,
  Building2,
  ExternalLink,
  Plus,
  RefreshCw,
  FileText,
  SlidersHorizontal,
  ArrowUpDown,
  CheckSquare,
  Sparkles,
  User
} from 'lucide-react';
import { FmsInstance, UserProfile, Priority, FmsStageDefinition, isUserSuperAdmin, isUserAdminOrSuperAdmin, getUserModulePermission, isFlowAccessibleToUser } from '../../types';
import { 
  FMS_CHECK_STOCK_STAGES, 
  FMS_STANDARD_PURCHASE_STAGES, 
  FMS_PO_PAYMENT_STAGES,
  FMS_PURCHASE_TO_STORE_DISPATCH_STAGES,
  FMS_STORE_TO_SITE_DISPATCH_STAGES,
  FMS_PAYMENT_TO_DISPATCH_STAGES,
  FMS_SITE_RECEIVE_STAGES,
  FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES,
  FMS_HR_ATTENDANCE_PAYMENT_STAGES,
  FMS_BREAKDOWN_REPORTING_STAGES,
  FMS_EQUIPMENT_PART_REPAIR_STAGES,
  FMS_DPR_REPORTING_STAGES,
  FMS_BENEFICIARY_APPROVAL_STAGES 
} from '../../data/initialData';
import { calculateWorkingHoursDelay, DEFAULT_WORK_SHIFT_CONFIG } from '../../services/workShiftService';
import { downloadCsv } from '../../utils/csvExporter';
import { storageAdapter } from '../../services/storageAdapter';
import { getFlowDepartmentKey, isFlowMatchingWorkflow } from '../../services/stageAssignment';

interface FmsStageMatrixTableViewProps {
  flows: FmsInstance[];
  currentUser: UserProfile;
  onSelectFlow: (flow: FmsInstance) => void;
  onUpdateFlow?: (flow: FmsInstance) => void;
  onDeleteFlow?: (flowId: string) => void;
  selectedDepartmentFilter?: string | null;
  selectedWorkflowFilter?: string | null;
  onSelectWorkflowFilter?: (flowKey: string | null) => void;
  viewModeTab?: 'RUNNING_PIPELINE' | 'MASTER_CATALOG' | 'ARCHIVED';
  onOpenStageAction?: (flow: FmsInstance, stageIndex: number) => void;
  searchQuery?: string;
  siteFilter?: string;
  delayFilter?: 'ALL' | 'DELAYED_ONLY' | 'ON_TIME_ONLY';
  statusFilter?: 'ALL' | 'In Progress' | 'Completed';
}

export const FmsStageMatrixTableView: React.FC<FmsStageMatrixTableViewProps> = ({
  flows,
  currentUser,
  onSelectFlow,
  onUpdateFlow,
  onDeleteFlow,
  selectedDepartmentFilter,
  selectedWorkflowFilter,
  onSelectWorkflowFilter,
  viewModeTab = 'RUNNING_PIPELINE',
  onOpenStageAction,
  searchQuery: propsSearchQuery,
  siteFilter: propsSiteFilter,
  delayFilter: propsDelayFilter,
  statusFilter: propsStatusFilter,
}) => {
  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const canDelete = isSuperAdmin || isUserAdminOrSuperAdmin(currentUser) || getUserModulePermission(currentUser, 'fms').canDelete;
  const workShift = storageAdapter.getRegistryConfig().workShiftConfig || DEFAULT_WORK_SHIFT_CONFIG;

  // Active FMS Branch Filter - syncs directly with selectedWorkflowFilter or defaults to 'ALL'
  const [activeBranchKey, setActiveBranchKey] = useState<string>(() => {
    return selectedWorkflowFilter || 'ALL';
  });

  // Sync activeBranchKey whenever sidebar selection changes
  useEffect(() => {
    if (selectedWorkflowFilter) {
      setActiveBranchKey(selectedWorkflowFilter);
    } else {
      setActiveBranchKey('ALL');
    }
  }, [selectedWorkflowFilter, selectedDepartmentFilter]);
  
  // Internal Filters & Search Fallbacks if props not supplied
  const [internalSearchQuery, setInternalSearchQuery] = useState<string>('');
  const [internalSiteFilter, setInternalSiteFilter] = useState<string>('ALL');
  const [internalDelayFilter, setInternalDelayFilter] = useState<'ALL' | 'DELAYED_ONLY' | 'ON_TIME_ONLY'>('ALL');
  const [internalStatusFilter, setInternalStatusFilter] = useState<'ALL' | 'In Progress' | 'Completed'>('ALL');

  const searchQuery = propsSearchQuery !== undefined ? propsSearchQuery : internalSearchQuery;
  const siteFilter = propsSiteFilter !== undefined ? propsSiteFilter : internalSiteFilter;
  const delayFilter = propsDelayFilter !== undefined ? propsDelayFilter : internalDelayFilter;
  const statusFilter = propsStatusFilter !== undefined ? propsStatusFilter : internalStatusFilter;

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Selection for Batch Actions
  const [selectedFlowIds, setSelectedFlowIds] = useState<string[]>([]);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Workflow Types & Templates Mapping
  const customTemplates = storageAdapter.getFmsTemplates();

  // Branch Preset Options (Dynamically Includes Custom Templates and all workflows)
  const branchPresets = useMemo(() => {
    const basePresets = [
      { key: 'ALL', label: selectedDepartmentFilter ? `All ${selectedDepartmentFilter} Workflows` : 'All Workflows Combined', dept: 'ALL' },
      { key: 'INDENT_PURCHASE', label: 'Indent to PO (Purchase FMS)', dept: 'PURCHASE' },
      { key: 'PAYMENT_TO_DISPATCH', label: 'Vendor Payment to Dispatch', dept: 'PURCHASE' },
      { key: 'CHECK_STOCK', label: 'Check Stock (Store FMS)', dept: 'STORE' },
      { key: 'PURCHASE_TO_STORE_DISPATCH', label: 'Purchase to Store Dispatch', dept: 'STORE' },
      { key: 'STORE_TO_SITE_DISPATCH', label: 'Store to Site Issue', dept: 'STORE' },
      { key: 'SITE_RECEIVE', label: 'Site Material Receive (GRN)', dept: 'STORE' },
      { key: 'PO_TO_PAYMENT', label: 'PO to Payment (Accounts FMS)', dept: 'ACCOUNTS' },
      { key: 'BENEFICIARY_APPROVAL', label: 'Beneficiary Approval FMS', dept: 'ACCOUNTS' },
      { key: 'ACCOUNTS_INVOICE_COLLECTION', label: 'Invoice Collection FMS', dept: 'ACCOUNTS' },
      { key: 'HR_ATTENDANCE_PAYMENT', label: 'Labour Attendance & Payment', dept: 'PLANT_OPS' },
      { key: 'BREAKDOWN_REPORTING', label: 'Machinery Breakdown FMS', dept: 'PLANT_OPS' },
      { key: 'EQUIPMENT_PART_REPAIR', label: 'Equipment Part Repair FMS', dept: 'PLANT_OPS' },
      { key: 'DPR_REPORTING', label: 'Daily Progress Report FMS', dept: 'OPERATIONS' },
    ];

    const existingKeys = new Set(basePresets.map(p => p.key));
    const dynamicPresets: { key: string; label: string; dept?: string }[] = [];

    customTemplates.forEach(tpl => {
      const key = tpl.templateKey || tpl.id;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        dynamicPresets.push({
          key,
          label: `${tpl.name}`,
          dept: tpl.departmentHub || 'OPERATIONS'
        });
      }
    });

    const combined = [...basePresets, ...dynamicPresets];
    if (selectedDepartmentFilter) {
      return combined.filter(
        (p) => p.key === 'ALL' || !p.dept || p.dept.toUpperCase() === selectedDepartmentFilter.toUpperCase()
      );
    }
    return combined;
  }, [customTemplates, selectedDepartmentFilter]);

  // Stage Definitions for the active branch
  const activeStageDefinitions: FmsStageDefinition[] = useMemo(() => {
    if (activeBranchKey === 'BENEFICIARY_APPROVAL' || activeBranchKey === 'tpl_beneficiary_approval') {
      return FMS_BENEFICIARY_APPROVAL_STAGES;
    }
    if (activeBranchKey === 'CHECK_STOCK' || activeBranchKey === 'tpl_check_stock') return FMS_CHECK_STOCK_STAGES;
    if (activeBranchKey === 'PO_TO_PAYMENT' || activeBranchKey === 'tpl_po_to_payment') return FMS_PO_PAYMENT_STAGES;
    if (
      activeBranchKey === 'INDENT_PURCHASE' || 
      activeBranchKey === 'tpl_indent_purchase' || 
      activeBranchKey === 'INDENT_TO_PO' || 
      activeBranchKey.toUpperCase().includes('INDENT')
    ) {
      return FMS_STANDARD_PURCHASE_STAGES;
    }
    if (activeBranchKey === 'PURCHASE_TO_STORE_DISPATCH' || activeBranchKey === 'tpl_purchase_to_store') return FMS_PURCHASE_TO_STORE_DISPATCH_STAGES;
    if (activeBranchKey === 'STORE_TO_SITE_DISPATCH' || activeBranchKey === 'tpl_store_to_site') return FMS_STORE_TO_SITE_DISPATCH_STAGES;
    if (activeBranchKey === 'PAYMENT_TO_DISPATCH' || activeBranchKey === 'tpl_payment_to_dispatch') return FMS_PAYMENT_TO_DISPATCH_STAGES;
    if (activeBranchKey === 'SITE_RECEIVE' || activeBranchKey === 'tpl_site_receive') return FMS_SITE_RECEIVE_STAGES;
    if (activeBranchKey === 'ACCOUNTS_INVOICE_COLLECTION' || activeBranchKey === 'tpl_accounts_invoice') return FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES;
    if (activeBranchKey === 'HR_ATTENDANCE_PAYMENT' || activeBranchKey === 'tpl_hr_attendance') return FMS_HR_ATTENDANCE_PAYMENT_STAGES;
    if (activeBranchKey === 'BREAKDOWN_REPORTING' || activeBranchKey === 'tpl_breakdown') return FMS_BREAKDOWN_REPORTING_STAGES;
    if (activeBranchKey === 'EQUIPMENT_PART_REPAIR' || activeBranchKey === 'tpl_part_repair') return FMS_EQUIPMENT_PART_REPAIR_STAGES;
    if (activeBranchKey === 'DPR_REPORTING' || activeBranchKey === 'tpl_dpr') return FMS_DPR_REPORTING_STAGES;

    // Custom Template match
    const customMatch = customTemplates.find(t => t.templateKey === activeBranchKey || t.id === activeBranchKey);
    if (customMatch) {
      return customMatch.stages.map((stg, idx) => ({
        stageId: stg.stageId,
        stageNumber: idx + 1,
        name: stg.stageName,
        what: stg.stageName,
        whoRole: stg.whoRole || 'ASSIGNED_ROLE',
        whoDefaultAssignee: stg.whoDefaultAssignee || 'Assignee',
        howChannel: stg.howChannel || 'IN-APP FORM',
        slaHours: stg.slaHours || 2,
        fields: stg.fields
      }));
    }

    // Extract stage definitions from first matching instance if dynamically created
    const firstMatchingFlow = flows.find(f => isFlowMatchingWorkflow(f, activeBranchKey));
    if (firstMatchingFlow?.stages && firstMatchingFlow.stages.length > 0) {
      return firstMatchingFlow.stages.map((stg, idx) => ({
        stageId: stg.stageId,
        stageNumber: idx + 1,
        name: stg.stageName,
        what: stg.stageName,
        whoRole: stg.whoRole || 'ASSIGNED_ROLE',
        whoDefaultAssignee: stg.whoDefaultAssignee || stg.assignee || 'Assignee',
        howChannel: stg.how || 'IN-APP FORM',
        slaHours: 4,
        fields: stg.fields
      }));
    }

    return FMS_STANDARD_PURCHASE_STAGES;
  }, [activeBranchKey, customTemplates, flows]);

  // Extract unique site names for filtering
  const availableSites = useMemo(() => {
    const set = new Set<string>();
    flows.forEach(f => {
      if (f.siteName) set.add(f.siteName);
    });
    return Array.from(set).sort();
  }, [flows]);

  // Filter flows for the active branch & search criteria
  const filteredFlows = useMemo(() => {
    return flows.filter(flow => {
      // User site & historical createdBy access control
      if (!isFlowAccessibleToUser(flow, currentUser)) return false;

      if (viewModeTab === 'ARCHIVED') {
        if (!flow.isClosed && flow.status !== 'CLOSED') return false;
      } else {
        if (flow.isClosed || flow.status === 'CLOSED') return false;
      }

      // Branch / Flow Type Filter
      if (activeBranchKey !== 'ALL') {
        if (!isFlowMatchingWorkflow(flow, activeBranchKey)) return false;
      } else if (selectedWorkflowFilter) {
        if (!isFlowMatchingWorkflow(flow, selectedWorkflowFilter)) return false;
      } else if (selectedDepartmentFilter) {
        // Sidebar Department Filter (only when ALL workflows in that department are requested)
        const flowDept = getFlowDepartmentKey(flow, customTemplates);
        if (flowDept !== selectedDepartmentFilter) return false;
      }

      // Site Filter
      if (siteFilter !== 'ALL' && flow.siteName !== siteFilter) return false;

      // Status Filter
      if (statusFilter !== 'ALL' && flow.status !== statusFilter) return false;

      // SLA Delay Filter
      const hasAnyDelay = flow.stages.some(stg => {
        const delayRes = calculateWorkingHoursDelay(stg.plannedDateTime, stg.actualDateTime, workShift);
        return delayRes.isDelayed;
      });

      if (delayFilter === 'DELAYED_ONLY' && !hasAnyDelay) return false;
      if (delayFilter === 'ON_TIME_ONLY' && hasAnyDelay) return false;

      // Deep Text Search across all metadata & submitted stage field values!
      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase().trim();
        const refNo = (flow.indentNo || '').toLowerCase();
        const reqNo = (flow.requisitionNumber || '').toLowerCase();
        const flowId = (flow.flowId || '').toLowerCase();
        const site = (flow.siteName || '').toLowerCase();
        const vendor = (flow.vendorName || '').toLowerCase();
        const poNo = (flow.poNumber || '').toLowerCase();
        const remarks = (flow.remarks || '').toLowerCase();

        const matchMeta = refNo.includes(q) || reqNo.includes(q) || flowId.includes(q) || 
                          site.includes(q) || vendor.includes(q) || poNo.includes(q) || remarks.includes(q);
        if (matchMeta) return true;

        // Search submitted stage field responses
        const matchFieldData = flow.stages.some(stg => {
          if (!stg.submittedData) return false;
          return Object.values(stg.submittedData).some(val => 
            String(val || '').toLowerCase().includes(q)
          );
        });

        if (!matchFieldData) return false;
      }

      return true;
    });
  }, [flows, activeBranchKey, selectedDepartmentFilter, siteFilter, statusFilter, delayFilter, searchQuery, workShift]);

  // Paginated records
  const totalRecords = filteredFlows.length;
  const totalPages = Math.ceil(totalRecords / pageSize) || 1;
  const paginatedFlows = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredFlows.slice(start, start + pageSize);
  }, [filteredFlows, currentPage, pageSize]);

  // Batch Selection Handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedFlowIds(paginatedFlows.map(f => f.id));
    } else {
      setSelectedFlowIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedFlowIds(prev => 
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    );
  };

  const handleDeleteSelected = (id: string) => {
    if (onDeleteFlow) {
      onDeleteFlow(id);
    } else {
      storageAdapter.deleteFmsFlow(id, currentUser);
    }
    setConfirmDeleteId(null);
  };

  const handleBulkDelete = () => {
    if (selectedFlowIds.length === 0) return;
    selectedFlowIds.forEach(id => {
      if (onDeleteFlow) {
        onDeleteFlow(id);
      } else {
        storageAdapter.deleteFmsFlow(id, currentUser);
      }
    });
    setSelectedFlowIds([]);
    setBulkDeleteConfirm(false);
  };

  // Helper to extract submitted stage value
  const getStageFieldValue = (stageExec: any, fieldId: string, fallbackKey?: string) => {
    if (!stageExec) return '—';
    if (stageExec.submittedData && stageExec.submittedData[fieldId] !== undefined) {
      let val = stageExec.submittedData[fieldId];
      if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
        try {
          val = JSON.parse(val);
        } catch {
          // ignore
        }
      }
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      if (Array.isArray(val)) {
        const itemNames = val.map((i: any) => i.itemDescription || i.item_description || i.description || i.name).filter(Boolean);
        return itemNames.length > 0 ? `${val.length} item(s): ${itemNames.slice(0, 2).join(', ')}` : `${val.length} item(s)`;
      }
      if (typeof val === 'object' && val !== null) {
        if (Array.isArray(val.items)) {
          return `${val.items.length} item(s)`;
        }
        return Object.entries(val)
          .map(([k, v]) => `${k}: ${typeof v === 'object' ? JSON.stringify(v) : v}`)
          .join(' • ');
      }
      if (String(val) === '[object Object]') {
        return '—';
      }
      return String(val);
    }
    if (fallbackKey && stageExec[fallbackKey] !== undefined) {
      const fbVal = String(stageExec[fallbackKey]);
      return fbVal === '[object Object]' ? '—' : fbVal;
    }
    return '—';
  };

  // CSV Export Handler for Full Stage Matrix
  const handleExportFullStageMatrix = () => {
    const headers = [
      'Ref Identifier',
      'Indent / Requisition No',
      'Date Created',
      'Site Location',
      'Priority',
      'Overall Status',
      'Vendor / Beneficiary',
      'Remarks / Purpose'
    ];

    // Add stage columns dynamically
    activeStageDefinitions.forEach((stgDef, sIdx) => {
      const prefix = `S${sIdx + 1} (${stgDef.name})`;
      headers.push(`${prefix} - Planned Due`);
      headers.push(`${prefix} - Actual Completion`);
      headers.push(`${prefix} - Status`);
      headers.push(`${prefix} - Delay Variance`);
      
      // Stage field labels
      if (stgDef.fields && stgDef.fields.length > 0) {
        stgDef.fields.forEach(f => {
          headers.push(`${prefix} - ${f.label}`);
        });
      }
    });

    const rows = filteredFlows.map(flow => {
      const refCode = flow.indentNo || flow.poNumber || flow.requisitionNumber || flow.flowId;
      const dateStr = flow.indentDate || flow.createdAt?.slice(0, 10) || '—';

      const row: string[] = [
        flow.flowId,
        refCode,
        dateStr,
        flow.siteName || '—',
        flow.priority || 'Normal',
        flow.status || 'In Progress',
        flow.vendorName || '—',
        flow.remarks || '—'
      ];

      activeStageDefinitions.forEach((stgDef, sIdx) => {
        const stageExec = flow.stages?.[sIdx];
        const plannedStr = stageExec?.plannedDateTime || '—';
        const actualStr = stageExec?.actualDateTime || '—';
        const stgStatus = stageExec?.status || 'Pending';

        const delayRes = calculateWorkingHoursDelay(stageExec?.plannedDateTime, stageExec?.actualDateTime, workShift);
        const delayStr = delayRes.isDelayed ? delayRes.formattedDelay : 'On Time';

        row.push(plannedStr, actualStr, stgStatus, delayStr);

        if (stgDef.fields && stgDef.fields.length > 0) {
          stgDef.fields.forEach(f => {
            const val = getStageFieldValue(stageExec, f.id);
            row.push(val);
          });
        }
      });

      return row;
    });

    const filename = `FMS_Master_Stage_Matrix_${activeBranchKey}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(filename, headers, rows);
  };

  return (
    <div className="space-y-4">
      {/* BULK ACTIONS TOOLBAR (Appears when rows are selected) */}
      {selectedFlowIds.length > 0 && (
        <div className="bg-indigo-950 text-white p-3 px-4 rounded-2xl shadow-lg border border-indigo-700/50 flex flex-wrap items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckSquare className="w-4 h-4 text-indigo-300" />
            <span>{selectedFlowIds.length} {selectedFlowIds.length === 1 ? 'Record' : 'Records'} Selected</span>
          </div>
          <div className="flex items-center gap-2">
            {canDelete && (
              bulkDeleteConfirm ? (
                <div className="flex items-center gap-1.5 bg-rose-900/90 border border-rose-500 rounded-xl px-3 py-1">
                  <span className="text-xs font-bold text-rose-200">Permanently delete {selectedFlowIds.length} records?</span>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer transition-colors"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkDeleteConfirm(false)}
                    className="px-2.5 py-1 bg-white/20 hover:bg-white/30 text-white rounded-lg text-xs font-medium cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setBulkDeleteConfirm(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer"
                  title="Delete all selected records"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedFlowIds.length})</span>
                </button>
              )
            )}
            <button
              type="button"
              onClick={() => {
                setSelectedFlowIds([]);
                setBulkDeleteConfirm(false);
              }}
              className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-xl text-xs font-semibold cursor-pointer transition-colors"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* 3. WIDE MASTER STAGE MATRIX SPREADSHEET TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-30 bg-slate-900 text-white select-none shadow-xs">
              {/* TIER 1: STAGE NAMES (WHAT) */}
              <tr className="border-b border-slate-800">
                <th colSpan={7} className="py-2 px-3 bg-slate-950 text-white font-black uppercase tracking-wider border-r border-slate-800 text-[11px]">
                  WHAT • REQUISITION METADATA
                </th>
                {activeStageDefinitions.map((stgDef, sIdx) => {
                  const fieldCount = stgDef.fields?.length || 0;
                  const colSpan = 4 + fieldCount; // Planned + Actual + Status + Delay + Field Columns
                  return (
                    <th
                      key={`tier1-${sIdx}`}
                      colSpan={colSpan}
                      className="py-2 px-3 bg-indigo-950 text-indigo-100 font-extrabold text-center border-r border-slate-800 uppercase tracking-wide whitespace-nowrap text-[11px]"
                    >
                      Stage {sIdx + 1}: {stgDef.name}
                    </th>
                  );
                })}
              </tr>

              {/* TIER 2: ASSIGNEE (WHO) */}
              <tr className="border-b border-slate-800 text-[10px]">
                <th colSpan={7} className="py-1 px-3 bg-slate-900 text-slate-300 font-extrabold uppercase border-r border-slate-800">
                  WHO • RESPONSIBLE ASSIGNEE
                </th>
                {activeStageDefinitions.map((stgDef, sIdx) => {
                  const fieldCount = stgDef.fields?.length || 0;
                  const colSpan = 4 + fieldCount;
                  return (
                    <th
                      key={`tier2-who-${sIdx}`}
                      colSpan={colSpan}
                      className="py-1 px-3 bg-slate-900 text-emerald-300 font-semibold text-center border-r border-slate-800 whitespace-nowrap"
                    >
                      {stgDef.whoDefaultAssignee || stgDef.whoRole || 'ASSIGNED_ROLE'}
                    </th>
                  );
                })}
              </tr>

              {/* TIER 3: EXECUTION CHANNEL (HOW) */}
              <tr className="border-b border-slate-800 text-[10px]">
                <th colSpan={7} className="py-1 px-3 bg-slate-900 text-slate-300 font-extrabold uppercase border-r border-slate-800">
                  HOW • EXECUTION CHANNEL / TOOL
                </th>
                {activeStageDefinitions.map((stgDef, sIdx) => {
                  const fieldCount = stgDef.fields?.length || 0;
                  const colSpan = 4 + fieldCount;
                  return (
                    <th
                      key={`tier3-how-${sIdx}`}
                      colSpan={colSpan}
                      className="py-1 px-3 bg-slate-850 text-cyan-300 font-semibold text-center border-r border-slate-800 whitespace-nowrap"
                    >
                      {stgDef.howChannel || 'IN-APP FORM'}
                    </th>
                  );
                })}
              </tr>

              {/* TIER 4: PLANNED SLA (WHEN) */}
              <tr className="border-b border-slate-800 text-[10px]">
                <th colSpan={7} className="py-1 px-3 bg-slate-900 text-slate-300 font-extrabold uppercase border-r border-slate-800">
                  WHEN • PLANNED SLA / TARGET TIME
                </th>
                {activeStageDefinitions.map((stgDef, sIdx) => {
                  const fieldCount = stgDef.fields?.length || 0;
                  const colSpan = 4 + fieldCount;
                  const slaHours = stgDef.slaHours || 4;
                  return (
                    <th
                      key={`tier4-when-${sIdx}`}
                      colSpan={colSpan}
                      className="py-1 px-3 bg-slate-800 text-amber-300 font-bold text-center border-r border-slate-800 whitespace-nowrap"
                    >
                      Target SLA: {slaHours} {slaHours === 1 ? 'Hour' : 'Hours'}
                    </th>
                  );
                })}
              </tr>

              {/* TIER 3: SUB-COLUMNS (Planned | Actual | Status | Delay | Field Inputs...) */}
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 text-[10px] font-black uppercase tracking-wider">
                <th className="py-2 px-2.5 w-8 text-center border-r border-slate-200">
                  <input
                    type="checkbox"
                    checked={selectedFlowIds.length === paginatedFlows.length && paginatedFlows.length > 0}
                    onChange={handleSelectAll}
                    className="rounded text-indigo-600 cursor-pointer"
                  />
                </th>
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap sticky left-0 top-0 bg-slate-100 z-40 min-w-[155px]">
                  Ref Identifier / Actions
                </th>
                <th className="py-2 px-2.5 border-r border-slate-200 whitespace-nowrap min-w-[90px]">Date</th>
                <th className="py-2 px-2.5 border-r border-slate-200 whitespace-nowrap min-w-[100px]">Site</th>
                <th className="py-2 px-2.5 border-r border-slate-200 whitespace-nowrap min-w-[110px]">Requested By</th>
                <th className="py-2 px-2.5 border-r border-slate-200 whitespace-nowrap min-w-[80px]">Priority</th>
                <th className="py-2 px-2.5 border-r-2 border-slate-300 whitespace-nowrap min-w-[90px]">Status</th>

                {/* Stage Sub-Columns */}
                {activeStageDefinitions.map((stgDef, sIdx) => (
                  <React.Fragment key={`subcols-${sIdx}`}>
                    <th className="py-2 px-2 text-center bg-slate-50 text-slate-600 border-r border-slate-200 whitespace-nowrap min-w-[125px]">Planned</th>
                    <th className="py-2 px-2 text-center bg-slate-50 text-slate-600 border-r border-slate-200 whitespace-nowrap min-w-[125px]">Actual</th>
                    <th className="py-2 px-2 text-center bg-slate-50 text-slate-600 border-r border-slate-200 whitespace-nowrap min-w-[80px]">Status</th>
                    <th className="py-2 px-2 text-center bg-rose-50 text-rose-800 border-r border-slate-200 whitespace-nowrap min-w-[95px]">Delay</th>

                    {/* Dynamic Stage Form Fields */}
                    {stgDef.fields && stgDef.fields.map(f => (
                      <th
                        key={`fhdr-${sIdx}-${f.id}`}
                        className="py-2 px-2 text-center bg-amber-50/70 text-amber-900 border-r border-slate-200 whitespace-nowrap min-w-[130px]"
                      >
                        {f.label}
                      </th>
                    ))}
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100 relative">
              {paginatedFlows.length > 0 ? (
                paginatedFlows.map((flow) => {
                  const isChecked = selectedFlowIds.includes(flow.id);
                  const refCode = flow.indentNo || flow.poNumber || flow.requisitionNumber || flow.flowId;
                  const dateStr = flow.indentDate || flow.createdAt?.slice(0, 10) || '—';

                  return (
                    <tr
                      key={flow.id}
                      className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-indigo-50/40' : ''}`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-2 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleSelect(flow.id)}
                          className="rounded text-indigo-600 cursor-pointer"
                        />
                      </td>

                      {/* Sticky Left Ref Code */}
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap sticky left-0 bg-white z-10 shadow-2xs align-middle">
                        <div className="flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectFlow(flow)}
                            className="text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer flex items-center gap-1 font-mono"
                          >
                            <span>{refCode}</span>
                            <Eye className="w-3 h-3 opacity-60 hover:opacity-100" />
                          </button>
                          {canDelete && (
                            confirmDeleteId === flow.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSelected(flow.id)}
                                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  title="Confirm deletion"
                                >
                                  Del
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] cursor-pointer"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(flow.id)}
                                className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition-colors cursor-pointer"
                                title="Delete Record"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </td>

                      {/* Date */}
                      <td className="py-2.5 px-2.5 text-slate-600 border-r border-slate-200 whitespace-nowrap font-mono text-[11px]">
                        {dateStr}
                      </td>

                      {/* Site */}
                      <td className="py-2.5 px-2.5 font-bold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                          {flow.siteName || 'MAIN'}
                        </span>
                      </td>

                      {/* Requested By */}
                      <td className="py-2.5 px-2.5 text-slate-700 border-r border-slate-200 whitespace-nowrap font-medium text-[11px]">
                        <span className="flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400 shrink-0" />
                          <span>{flow.createdBy || flow.dprPreparedBy || flow.submittedBy || 'Aman Kumar'}</span>
                        </span>
                      </td>

                      {/* Priority */}
                      <td className="py-2.5 px-2.5 border-r border-slate-200 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          flow.priority === 'Urgent'
                            ? 'bg-rose-100 text-rose-800'
                            : flow.priority === 'Normal'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-700'
                        }`}>
                          {flow.priority || 'Normal'}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-2.5 border-r-2 border-slate-300 whitespace-nowrap">
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          flow.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}>
                          {flow.status}
                        </span>
                      </td>

                      {/* Stages Row Data */}
                      {activeStageDefinitions.map((stgDef, sIdx) => {
                        const stageExec = flow.stages?.[sIdx];
                        const plannedStr = stageExec?.plannedDateTime || '—';
                        const actualStr = stageExec?.actualDateTime || '—';
                        const stgStatus = stageExec?.status || 'Pending';

                        const delayRes = calculateWorkingHoursDelay(stageExec?.plannedDateTime, stageExec?.actualDateTime, workShift);
                        const isDelayed = delayRes.isDelayed;

                        return (
                          <React.Fragment key={`cell-${flow.id}-${sIdx}`}>
                            {/* Planned */}
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-mono text-[10px] text-slate-700 whitespace-nowrap">
                              {plannedStr}
                            </td>

                            {/* Actual */}
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-mono text-[10px] text-slate-700 whitespace-nowrap">
                              {actualStr}
                            </td>

                            {/* Status */}
                            <td className="py-2 px-2 text-center border-r border-slate-200 whitespace-nowrap">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                stgStatus === 'Done'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : stgStatus === 'In Progress'
                                  ? 'bg-blue-100 text-blue-800'
                                  : stgStatus === 'Delayed'
                                  ? 'bg-rose-100 text-rose-800'
                                  : stgStatus === 'Skipped'
                                  ? 'bg-slate-200 text-slate-600'
                                  : 'bg-slate-100 text-slate-500'
                              }`}>
                                {stgStatus}
                              </span>
                            </td>

                            {/* Delay */}
                            <td className="py-2 px-2 text-center border-r border-slate-200 font-mono text-[10px] whitespace-nowrap">
                              {isDelayed ? (
                                <span className="px-1.5 py-0.5 rounded bg-rose-50 text-rose-700 font-bold border border-rose-200">
                                  {delayRes.formattedDelay}
                                </span>
                              ) : (
                                <span className="text-emerald-600 font-semibold">
                                  On Time
                                </span>
                              )}
                            </td>

                            {/* Form Input Fields */}
                            {stgDef.fields && stgDef.fields.map(f => {
                              const val = getStageFieldValue(stageExec, f.id);
                              return (
                                <td
                                  key={`val-${flow.id}-${sIdx}-${f.id}`}
                                  className="py-2 px-2 text-left border-r border-slate-200 text-[11px] font-medium text-slate-800 whitespace-nowrap max-w-[200px] truncate"
                                  title={val}
                                >
                                  {f.type === 'URL' && val.startsWith('http') ? (
                                    <a
                                      href={val}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-indigo-600 hover:underline flex items-center gap-1 font-mono text-[10px]"
                                    >
                                      <span>View File</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : f.type === 'APPROVAL' ? (
                                    <span className={`px-1.5 py-0.5 rounded text-[10px] font-extrabold ${
                                      val.toLowerCase().includes('approved') || val === 'Yes'
                                        ? 'bg-emerald-100 text-emerald-800'
                                        : val.toLowerCase().includes('reject') || val === 'No'
                                        ? 'bg-rose-100 text-rose-800'
                                        : 'text-slate-500'
                                    }`}>
                                      {val}
                                    </span>
                                  ) : (
                                    <span className="font-mono text-[11px]">
                                      {val}
                                    </span>
                                  )}
                                </td>
                              );
                            })}
                          </React.Fragment>
                        );
                      })}
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td
                    colSpan={6 + activeStageDefinitions.length * 4}
                    className="py-12 text-center text-slate-500 font-medium"
                  >
                    <div className="max-w-md mx-auto space-y-2">
                      <Layers className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-bold text-slate-700">No Stage Records found matching current search/filters.</p>
                      <p className="text-[11px] text-slate-400">Try clearing filters or switching FMS Branch tabs above.</p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* 4. PAGINATION FOOTER */}
        <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-2 text-slate-600 font-medium">
            <span>Showing {paginatedFlows.length} of {totalRecords} entries</span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <span>Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="bg-white border border-slate-200 rounded px-1.5 py-0.5 font-bold focus:outline-none cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </span>
          </div>

          {/* Page Buttons */}
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="px-2 py-0.5 font-bold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              type="button"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              className="p-1 rounded bg-white border border-slate-200 text-slate-600 hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
