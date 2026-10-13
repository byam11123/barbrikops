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
  Sparkles
} from 'lucide-react';
import { FmsInstance, UserProfile, Priority, FmsStageDefinition, isUserSuperAdmin } from '../../types';
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
  FMS_DPR_REPORTING_STAGES 
} from '../../data/initialData';
import { calculateWorkingHoursDelay, DEFAULT_WORK_SHIFT_CONFIG } from '../../services/workShiftService';
import { downloadCsv } from '../../utils/csvExporter';
import { storageAdapter } from '../../services/storageAdapter';
import { getFlowDepartmentKey } from '../../services/stageAssignment';

interface FmsStageMatrixTableViewProps {
  flows: FmsInstance[];
  currentUser: UserProfile;
  onSelectFlow: (flow: FmsInstance) => void;
  onUpdateFlow?: (flow: FmsInstance) => void;
  onDeleteFlow?: (flowId: string) => void;
  selectedDepartmentFilter?: string | null;
  selectedWorkflowFilter?: string | null;
  onOpenStageAction?: (flow: FmsInstance, stageIndex: number) => void;
}

export const FmsStageMatrixTableView: React.FC<FmsStageMatrixTableViewProps> = ({
  flows,
  currentUser,
  onSelectFlow,
  onUpdateFlow,
  onDeleteFlow,
  selectedDepartmentFilter,
  selectedWorkflowFilter,
  onOpenStageAction
}) => {
  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const workShift = storageAdapter.getRegistryConfig().workShiftConfig || DEFAULT_WORK_SHIFT_CONFIG;

  // Active FMS Branch Filter
  const [activeBranchKey, setActiveBranchKey] = useState<string>('BENEFICIARY_APPROVAL');

  // Sync activeBranchKey whenever sidebar selection changes
  useEffect(() => {
    if (selectedWorkflowFilter) {
      setActiveBranchKey(selectedWorkflowFilter);
    } else if (selectedDepartmentFilter) {
      setActiveBranchKey('ALL');
    }
  }, [selectedWorkflowFilter, selectedDepartmentFilter]);
  
  // Filters & Search State
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [siteFilter, setSiteFilter] = useState<string>('ALL');
  const [delayFilter, setDelayFilter] = useState<'ALL' | 'DELAYED_ONLY' | 'ON_TIME_ONLY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'In Progress' | 'Completed'>('ALL');
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  // Pagination State
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(25);

  // Selection for Batch Actions
  const [selectedFlowIds, setSelectedFlowIds] = useState<string[]>([]);

  // Workflow Types & Templates Mapping
  const customTemplates = storageAdapter.getFmsTemplates();

  // Branch Preset Options (Dynamically Includes Custom Templates)
  const branchPresets = useMemo(() => {
    const basePresets = [
      { key: 'BENEFICIARY_APPROVAL', label: 'Beneficiary Approval FMS', icon: '💳' },
      { key: 'INDENT_PURCHASE', label: 'Indent to PO (Purchase FMS)', icon: '🛒' },
      { key: 'PO_TO_PAYMENT', label: 'PO to Payment (Accounts FMS)', icon: '💰' },
      { key: 'CHECK_STOCK', label: 'Check Stock (Store FMS)', icon: '📦' },
      { key: 'EQUIPMENT_PART_REPAIR', label: 'Equipment Part Repair FMS', icon: '🔧' },
      { key: 'BREAKDOWN_REPORTING', label: 'Machinery Breakdown FMS', icon: '🚨' },
      { key: 'DPR_REPORTING', label: 'Daily Progress Report FMS', icon: '📊' },
      { key: 'ACCOUNTS_INVOICE_COLLECTION', label: 'Invoice Collection FMS', icon: '🧾' },
    ];

    const existingKeys = new Set(basePresets.map(p => p.key));
    const dynamicPresets: { key: string; label: string; icon: string }[] = [];

    customTemplates.forEach(tpl => {
      const key = tpl.templateKey || tpl.id;
      if (!existingKeys.has(key)) {
        existingKeys.add(key);
        dynamicPresets.push({
          key,
          label: `${tpl.name}`,
          icon: '⚡'
        });
      }
    });

    return [...basePresets, ...dynamicPresets, { key: 'ALL', label: 'All Workflows Combined', icon: '🌐' }];
  }, [customTemplates]);

  // Stage Definitions for the active branch
  const activeStageDefinitions: FmsStageDefinition[] = useMemo(() => {
    if (activeBranchKey === 'BENEFICIARY_APPROVAL') {
      return [
        {
          stageId: 'STG-BEN-01',
          stageNumber: 1,
          name: 'BENEFICIARY DETAILS ENTRY',
          what: 'Enter site beneficiary bank details, purpose & attach cheque copy',
          whoRole: 'SITE ACCOUNTANT / SITE MANAGER',
          whoDefaultAssignee: 'Site Accountant',
          howChannel: 'IN-APP FORM',
          slaHours: 2,
          fields: [
            { id: 'beneficiaryName', label: 'Beneficiary Name', type: 'TEXT', required: true },
            { id: 'accountNo', label: 'Account Number', type: 'TEXT', required: true },
            { id: 'ifscCode', label: 'IFSC Code', type: 'TEXT', required: true },
            { id: 'bankName', label: 'Bank Name', type: 'TEXT', required: true },
            { id: 'purpose', label: 'Purpose', type: 'TEXT', required: true },
            { id: 'chequeCopyUrl', label: 'Cheque Attachment', type: 'URL' }
          ]
        },
        {
          stageId: 'STG-BEN-02',
          stageNumber: 2,
          name: 'ACCOUNTS APPROVAL',
          what: 'Review beneficiary credentials and approve for disbursement',
          whoRole: 'ACCOUNTS HEAD / DIRECTOR',
          whoDefaultAssignee: 'Pranjal Agrawal / Accounts Head',
          howChannel: 'IN-APP APPROVAL',
          slaHours: 4,
          isCheckpoint: true,
          hasYesNoDecision: true,
          fields: [
            { id: 'approvalStatus', label: 'Approval Status', type: 'APPROVAL', required: true },
            { id: 'approvedAmount', label: 'Approved Amount (₹)', type: 'NUMBER', required: true },
            { id: 'accountsRemarks', label: 'Accounts Remarks', type: 'TEXTAREA' }
          ]
        },
        {
          stageId: 'STG-BEN-03',
          stageNumber: 3,
          name: 'UTR DISBURSEMENT & RELEASE',
          what: 'Execute RTGS/NEFT payment and update bank UTR transaction reference',
          whoRole: 'DISBURSING OFFICER',
          whoDefaultAssignee: 'Shyam Rao Sureshe / Disbursal Exec',
          howChannel: 'BANK ERP / IN-APP FORM',
          slaHours: 2,
          fields: [
            { id: 'utrNumber', label: 'UTR Ref No.', type: 'TEXT', required: true },
            { id: 'disbursalDate', label: 'Payment Date', type: 'DATE', required: true },
            { id: 'paymentMode', label: 'Payment Mode', type: 'SELECT', options: ['RTGS', 'NEFT', 'IMPS', 'CHEQUE'] }
          ]
        }
      ];
    }

    if (activeBranchKey === 'CHECK_STOCK') return FMS_CHECK_STOCK_STAGES;
    if (activeBranchKey === 'PO_TO_PAYMENT') return FMS_PO_PAYMENT_STAGES;
    if (activeBranchKey === 'INDENT_PURCHASE') return FMS_STANDARD_PURCHASE_STAGES;
    if (activeBranchKey === 'EQUIPMENT_PART_REPAIR') return FMS_EQUIPMENT_PART_REPAIR_STAGES;
    if (activeBranchKey === 'BREAKDOWN_REPORTING') return FMS_BREAKDOWN_REPORTING_STAGES;
    if (activeBranchKey === 'DPR_REPORTING') return FMS_DPR_REPORTING_STAGES;
    if (activeBranchKey === 'ACCOUNTS_INVOICE_COLLECTION') return FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES;

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
    const firstMatchingFlow = flows.find(f => f.flowType === activeBranchKey || f.customTemplateId === activeBranchKey);
    if (firstMatchingFlow?.stages && firstMatchingFlow.stages.length > 0) {
      return firstMatchingFlow.stages.map((stg, idx) => ({
        stageId: stg.stageId,
        stageNumber: idx + 1,
        name: stg.stageName,
        what: stg.stageName,
        whoRole: 'ASSIGNED_ROLE',
        whoDefaultAssignee: stg.assignee || 'Assignee',
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
      // Branch / Flow Type Filter
      if (activeBranchKey !== 'ALL') {
        if (activeBranchKey === 'BENEFICIARY_APPROVAL') {
          const isBenType = flow.flowType === 'BENEFICIARY_APPROVAL' || 
            (flow.indentNo && flow.indentNo.toUpperCase().includes('BEN')) || 
            (flow.requisitionNumber && flow.requisitionNumber.toUpperCase().includes('BEN'));
          if (!isBenType) return false;
        } else {
          const matchesType = flow.flowType === activeBranchKey;
          const matchesCustom = flow.customTemplateId === activeBranchKey;
          if (!matchesType && !matchesCustom) return false;
        }
      }

      // Sidebar Department Filter
      if (selectedDepartmentFilter) {
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

  // Helper to extract submitted stage value
  const getStageFieldValue = (stageExec: any, fieldId: string, fallbackKey?: string) => {
    if (!stageExec) return '—';
    if (stageExec.submittedData && stageExec.submittedData[fieldId] !== undefined) {
      const val = stageExec.submittedData[fieldId];
      if (typeof val === 'boolean') return val ? 'Yes' : 'No';
      return String(val);
    }
    if (fallbackKey && stageExec[fallbackKey] !== undefined) {
      return String(stageExec[fallbackKey]);
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
      {/* 1. TOP BRANCH SELECTOR TABS */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
        <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-600" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Master Stage Matrix Branch Registry
            </h3>
            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[11px] font-extrabold border border-indigo-100">
              {filteredFlows.length} FMS Entries
            </span>
          </div>
          <button
            type="button"
            onClick={handleExportFullStageMatrix}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export Stage Matrix (Excel)</span>
          </button>
        </div>

        {/* Preset Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {branchPresets.map(preset => {
            const isActive = activeBranchKey === preset.key;
            return (
              <button
                key={preset.key}
                type="button"
                onClick={() => {
                  setActiveBranchKey(preset.key);
                  setCurrentPage(1);
                }}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200/60'
                }`}
              >
                <span>{preset.icon}</span>
                <span>{preset.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. HIGH-CAPACITY 1000+ ENTRY FILTER BAR */}
      <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        {/* Left: Search box */}
        <div className="relative flex-1 min-w-[280px]">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search across 1000+ entries (Ref ID, Beneficiary Name, Account No., UTR, Vendor, Site)..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>
          )}
        </div>

        {/* Right: Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Site Filter */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
            <Building2 className="w-3.5 h-3.5 text-slate-500" />
            <select
              value={siteFilter}
              onChange={(e) => {
                setSiteFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">All Sites ({availableSites.length})</option>
              {availableSites.map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          {/* Delay Filter */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
            <Clock className="w-3.5 h-3.5 text-rose-500" />
            <select
              value={delayFilter}
              onChange={(e) => {
                setDelayFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">SLA: All Timelines</option>
              <option value="DELAYED_ONLY">SLA: Delayed Only (🚨)</option>
              <option value="ON_TIME_ONLY">SLA: On Time Only (✅)</option>
            </select>
          </div>

          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-200">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as any);
                setCurrentPage(1);
              }}
              className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
            >
              <option value="ALL">Status: All</option>
              <option value="In Progress">Status: In Progress</option>
              <option value="Completed">Status: Completed</option>
            </select>
          </div>
        </div>
      </div>

      {/* 3. WIDE MASTER STAGE MATRIX SPREADSHEET TABLE */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto max-h-[70vh] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-900 text-white select-none">
              {/* TIER 1: STAGE NAMES (WHAT) */}
              <tr className="border-b border-slate-800">
                <th colSpan={6} className="py-2.5 px-3 bg-slate-950 text-white font-black uppercase tracking-wider border-r border-slate-800">
                  REQUISITION METADATA
                </th>
                {activeStageDefinitions.map((stgDef, sIdx) => {
                  const fieldCount = stgDef.fields?.length || 0;
                  const colSpan = 4 + fieldCount; // Planned + Actual + Status + Delay + Field Columns
                  return (
                    <th
                      key={`tier1-${sIdx}`}
                      colSpan={colSpan}
                      className="py-2.5 px-3 bg-indigo-950 text-indigo-100 font-extrabold text-center border-r border-slate-800 uppercase tracking-wide whitespace-nowrap text-[11px]"
                    >
                      Stage {sIdx + 1}: {stgDef.name}
                    </th>
                  );
                })}
              </tr>

              {/* TIER 2: ASSIGNEE & HOW (WHO & HOW) */}
              <tr className="border-b border-slate-800 text-[10px]">
                <th colSpan={6} className="py-1.5 px-3 bg-slate-900 text-slate-400 font-bold uppercase border-r border-slate-800">
                  RESPONSIBLE ASSIGNEES & CHANNELS
                </th>
                {activeStageDefinitions.map((stgDef, sIdx) => {
                  const fieldCount = stgDef.fields?.length || 0;
                  const colSpan = 4 + fieldCount;
                  return (
                    <th
                      key={`tier2-${sIdx}`}
                      colSpan={colSpan}
                      className="py-1.5 px-3 bg-slate-850 text-emerald-300 font-semibold text-center border-r border-slate-800 whitespace-nowrap"
                    >
                      👤 {stgDef.whoDefaultAssignee || stgDef.whoRole} &nbsp;•&nbsp; ⚡ {stgDef.howChannel || 'IN-APP'}
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
                <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap sticky left-0 bg-slate-100 z-10 min-w-[140px]">
                  Ref Identifier / Indent
                </th>
                <th className="py-2 px-2.5 border-r border-slate-200 whitespace-nowrap min-w-[90px]">Date</th>
                <th className="py-2 px-2.5 border-r border-slate-200 whitespace-nowrap min-w-[100px]">Site</th>
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

            <tbody className="divide-y divide-slate-100">
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
                      <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap sticky left-0 bg-white z-10 shadow-2xs">
                        <div className="flex items-center justify-between gap-1.5">
                          <button
                            type="button"
                            onClick={() => onSelectFlow(flow)}
                            className="text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer flex items-center gap-1 font-mono"
                          >
                            <span>{refCode}</span>
                            <Eye className="w-3 h-3 opacity-60 hover:opacity-100" />
                          </button>
                          {isSuperAdmin && (
                            confirmDeleteId === flow.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSelected(flow.id)}
                                  className="px-1.5 py-0.2 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                >
                                  Del
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1.5 py-0.2 bg-slate-200 text-slate-700 rounded text-[10px] cursor-pointer"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(flow.id)}
                                className="p-1 hover:bg-rose-50 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
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
                                  🚨 {delayRes.formattedDelay}
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
