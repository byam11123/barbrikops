import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  CheckSquare,
  ChevronRight, 
  ChevronDown,
  Building2,
  ExternalLink, 
  Filter, 
  Plus, 
  Search, 
  ArrowUpRight,
  FileText,
  MapPin,
  Calendar,
  AlertTriangle,
  Play,
  User,
  Users,
  Eye,
  Layers,
  CreditCard,
  ShoppingCart,
  Boxes,
  Truck,
  PackageCheck,
  UserCheck,
  Wrench,
  Cog,
  Zap,
  FileSpreadsheet,
  Table,
  ClipboardList,
  Download,
  Coffee,
  CalendarDays,
  Timer,
  Trash2,
  Lock,
  Scale
} from 'lucide-react';
import { downloadCsv } from '../../utils/csvExporter';
import { downloadFmsHorizontalMatrixExcel, downloadFmsExcelTemplate } from '../../services/fmsExcelService';
import { FmsMasterCatalogView } from './FmsMasterCatalogView';
import { FmsStageMatrixTableView } from './FmsStageMatrixTableView';
import { FmsInstance, FmsStageExecution, FmsStageDefinition, Priority, UserProfile, isUserSuperAdmin, isUserAdminOrSuperAdmin, getUserModulePermission, isFlowAccessibleToUser } from '../../types';

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
import { isUserResponsibleForStage, isFlowAwaitingUserAction, getFmsDomainCategory, getFlowDepartmentKey, getDepartmentBranchLabel, isFlowMatchingWorkflow } from '../../services/stageAssignment';
import { storageAdapter } from '../../services/storageAdapter';
import { 
  calculateWorkingHoursDelay, 
  addWorkingSlaHours, 
  formatToStandardDateTime, 
  formatDelayHms,
  DEFAULT_WORK_SHIFT_CONFIG, 
  WorkShiftConfig 
} from '../../services/workShiftService';
import { ViewScope } from '../layout/Header';

interface FmsPipelineProps {
  flows: FmsInstance[];
  currentUser: UserProfile;
  viewScope: ViewScope;
  onToggleScope: (scope: ViewScope) => void;
  onUpdateFlow: (flow: FmsInstance) => void;
  onDeleteFlow?: (flowId: string) => void;
  onCreateFlow?: () => void;
  onSelectFlow: (flow: FmsInstance) => void;
  onOpenTemplateStudio?: (templateKey?: string) => void;
  onOpenStageAction?: (flow: FmsInstance, stageIndex: number) => void;
  selectedDepartmentFilter?: string | null;
  onClearDepartmentFilter?: () => void;
  selectedWorkflowFilter?: string | null;
  onClearWorkflowFilter?: () => void;
  onSelectWorkflowFilter?: (workflowKey: string | null) => void;
  onOpenComparativeSheet?: (indentNo?: string) => void;
}

export function parseDateTimeStr(str: string | undefined): Date | null {
  if (!str || typeof str !== 'string') return null;
  const clean = str.replace(',', ' ').trim();
  if (!clean || clean === '—' || clean === '-' || clean.toLowerCase().includes('pending')) return null;
  
  // 1. Custom DD/MM/YYYY or DD-MM-YYYY parsing
  try {
    const match = clean.match(/^(\d{1,2})[\s/:_.-]+(\d{1,2})[\s/:_.-]+(\d{4})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      
      let hour = 0;
      let min = 0;
      let sec = 0;
      
      const timePart = clean.substring(match[0].length).trim();
      if (timePart) {
        const timeMatch = timePart.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
        if (timeMatch) {
          hour = parseInt(timeMatch[1], 10);
          min = parseInt(timeMatch[2], 10);
          if (timeMatch[3]) sec = parseInt(timeMatch[3], 10);
        }
      }
      
      const isPM = clean.toLowerCase().includes('pm');
      const isAM = clean.toLowerCase().includes('am');
      if (isPM && hour < 12) hour += 12;
      if (isAM && hour === 12) hour = 0;
      
      const d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d;
    }
  } catch (e) {}

  // 2. Fallback to native Date parsing (handles ISO format YYYY-MM-DD etc.)
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

export function getStageDelayHours(stage?: FmsStageExecution, fallbackPlanned?: string, config?: WorkShiftConfig): number {
  if (!stage) return 0;
  if (typeof stage.timeDelayHours === 'number' && stage.timeDelayHours > 0) {
    return stage.timeDelayHours;
  }
  if (typeof stage.delayHours === 'number' && stage.delayHours > 0) {
    return stage.delayHours;
  }
  const plannedStr = stage.plannedDateTime || fallbackPlanned;
  if (!plannedStr) return 0;

  const activeConfig = config || storageAdapter.getRegistryConfig().workShiftConfig || DEFAULT_WORK_SHIFT_CONFIG;
  const result = calculateWorkingHoursDelay(plannedStr, stage.actualDateTime, activeConfig);
  return result.delayHours;
}

export function getFlowTotalDelay(flow: FmsInstance, config?: WorkShiftConfig): number {
  const explicit = flow.totalDelayHours || 0;
  let stagesSum = 0;
  if (flow.stages && flow.stages.length > 0) {
    flow.stages.forEach((s) => {
      stagesSum += getStageDelayHours(s, undefined, config);
    });
  }
  if (stagesSum > 0) return Math.max(explicit, stagesSum);
  if (explicit > 0) return explicit;
  if (flow.stages?.some(s => s.status === 'Delayed')) return 1;
  return 0;
}

export function getDelayHours(plannedStr: string | undefined, actualStr: string | undefined, isCompleted: boolean, config?: WorkShiftConfig): number {
  if (!plannedStr) return 0;
  const activeConfig = config || storageAdapter.getRegistryConfig().workShiftConfig || DEFAULT_WORK_SHIFT_CONFIG;
  const result = calculateWorkingHoursDelay(plannedStr, isCompleted ? actualStr : (actualStr || new Date().toISOString()), activeConfig);
  return result.delayHours;
}

export function formatDelayVariance(delayHours: number): string {
  if (!delayHours || delayHours <= 0) return '00:00:00';
  const totalSeconds = Math.round(delayHours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const pad = (n: number) => String(n).padStart(2, '0');
  return `- ${pad(h)}:${pad(m)}:${pad(s)}`;
}

export const FmsPipeline: React.FC<FmsPipelineProps> = ({
  flows,
  currentUser,
  viewScope,
  onToggleScope,
  onUpdateFlow,
  onDeleteFlow,
  onCreateFlow,
  onSelectFlow,
  onOpenTemplateStudio,
  onOpenStageAction,
  selectedDepartmentFilter = null,
  onClearDepartmentFilter,
  selectedWorkflowFilter = null,
  onClearWorkflowFilter,
  onSelectWorkflowFilter,
  onOpenComparativeSheet,
}) => {
  const [pipelineTypeFilter, setPipelineTypeFilter] = useState<string>('ALL');
  const [filterSite, setFilterSite] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [delayFilter, setDelayFilter] = useState<'ALL' | 'DELAYED_ONLY' | 'ON_TIME_ONLY'>('ALL');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'In Progress' | 'Completed'>('ALL');
  const [exportDropdownOpen, setExportDropdownOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFlowId, setSelectedFlowId] = useState<string>(flows[0]?.id || '');
  const [viewMode, setViewMode] = useState<'FOCUS_FEED' | 'KANBAN' | 'TIMELINE' | 'MATRIX' | 'STAGE_MATRIX'>('STAGE_MATRIX');
  const [matrixPage, setMatrixPage] = useState<number>(1);
  const [matrixPageSize, setMatrixPageSize] = useState<number>(25);
  const [matrixSelectedIds, setMatrixSelectedIds] = useState<string[]>([]);
  const [cardFilter, setCardFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'DELAYED' | 'AWAITING_ME'>('ALL');
  const [viewModeTab, setViewModeTab] = useState<'RUNNING_PIPELINE' | 'MASTER_CATALOG' | 'ARCHIVED'>('RUNNING_PIPELINE');
  const [matrixStyle, setMatrixStyle] = useState<'HORIZONTAL_SPREADSHEET' | 'COMPACT_TABLE'>('HORIZONTAL_SPREADSHEET');
  const [confirmDeleteRecordId, setConfirmDeleteRecordId] = useState<string | null>(null);

  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const isAdminOrSuperAdmin = isUserAdminOrSuperAdmin(currentUser);
  const canDelete = isSuperAdmin || isAdminOrSuperAdmin || getUserModulePermission(currentUser, 'fms').canDelete;
  const [confirmBatchDeleteMatrix, setConfirmBatchDeleteMatrix] = useState(false);

  const handleDeleteRecord = (flowId: string) => {
    if (onDeleteFlow) {
      onDeleteFlow(flowId);
    } else {
      storageAdapter.deleteFmsFlow(flowId, currentUser);
    }
    setConfirmDeleteRecordId(null);
  };

  // Stage display filter: Default to showing all workflow stages for complete visibility
  const [stageFilterMode, setStageFilterMode] = useState<'MY_STAGES' | 'ALL_STAGES'>('ALL_STAGES');

  useEffect(() => {
    if (!isAdminOrSuperAdmin) {
      setViewModeTab('RUNNING_PIPELINE');
    }
  }, [viewScope, isAdminOrSuperAdmin]);

  // Helper to check if a specific stage definition belongs to currentUser
  const isMyStage = (def: FmsStageDefinition, stageExec?: FmsStageExecution): boolean => {
    return isUserResponsibleForStage(def, stageExec, currentUser);
  };

  // Check if an entire FMS instance has action required right now by currentUser
  const isMyFlowAction = (flow: FmsInstance): boolean => {
    return isFlowAwaitingUserAction(flow, currentUser);
  };

  const myFlowsCount = flows.filter(isMyFlowAction).length;
  const closedFlowsCount = flows.filter((f) => f.isClosed || f.status === 'CLOSED').length;

  const customTemplates = storageAdapter.getFmsTemplates();

  const filteredFlows = flows.filter((f) => {
    // User site & historical createdBy access control
    if (!isFlowAccessibleToUser(f, currentUser)) return false;

    // 0. Closed vs Active View Tab
    if (viewModeTab === 'ARCHIVED') {
      if (!f.isClosed && f.status !== 'CLOSED') return false;
    } else {
      if (f.isClosed || f.status === 'CLOSED') return false;
    }

    // Individual Workflow Filter from Sidebar Sub-Branch or Tab
    if (selectedWorkflowFilter) {
      if (!isFlowMatchingWorkflow(f, selectedWorkflowFilter)) return false;
    } else if (selectedDepartmentFilter) {
      // Department Filter from Sidebar (when no specific workflow is selected)
      const flowDept = getFlowDepartmentKey(f, customTemplates);
      if (flowDept !== selectedDepartmentFilter) return false;
    }
    // Sub-pipeline filter if selected
    if (pipelineTypeFilter !== 'ALL' && f.flowType !== pipelineTypeFilter) {
      return false;
    }
    // 1. Requisitions filter
    if (viewScope === 'USER_ONLY' && !isMyFlowAction(f)) {
      return false;
    }
    // 2. Site Filter
    if (filterSite !== 'ALL' && f.siteName !== filterSite) return false;
    // 3. Priority Filter
    if (filterPriority !== 'ALL' && f.priority !== filterPriority) return false;
    // 3b. Status Filter
    if (statusFilter !== 'ALL' && f.status !== statusFilter) return false;
    // 3c. SLA Delay Filter
    const workShiftConfig = storageAdapter.getRegistryConfig().workShiftConfig || DEFAULT_WORK_SHIFT_CONFIG;
    const hasAnyDelay = f.stages?.some(stg => {
      const delayRes = calculateWorkingHoursDelay(stg.plannedDateTime, stg.actualDateTime, workShiftConfig);
      return delayRes.isDelayed;
    });
    if (delayFilter === 'DELAYED_ONLY' && !hasAnyDelay) return false;
    if (delayFilter === 'ON_TIME_ONLY' && hasAnyDelay) return false;
    // 4. Search Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchNo = f.indentNo?.toLowerCase().includes(q) || false;
      const matchReq = f.requisitionNumber?.toLowerCase().includes(q) || false;
      const matchPo = f.poNumber?.toLowerCase().includes(q) || false;
      const matchVendor = f.vendorName?.toLowerCase().includes(q) || false;
      const matchSite = f.siteName?.toLowerCase().includes(q) || false;
      const matchFlow = f.flowId?.toLowerCase().includes(q) || false;
      const matchMachine = f.machineName?.toLowerCase().includes(q) || f.machineIdNo?.toLowerCase().includes(q) || f.machineMakeModel?.toLowerCase().includes(q) || false;
      const matchPart = f.partSerialNo?.toLowerCase().includes(q) || f.partEquipmentName?.toLowerCase().includes(q) || f.vehiclePlantMachineName?.toLowerCase().includes(q) || false;
      if (!matchNo && !matchReq && !matchPo && !matchVendor && !matchSite && !matchFlow && !matchMachine && matchPart === false) return false;
    }
    // 5. Card Filter
    if (cardFilter === 'PENDING' && f.status !== 'In Progress') return false;
    if (cardFilter === 'COMPLETED' && f.status !== 'Completed') return false;
    if (cardFilter === 'DELAYED' && !(getFlowTotalDelay(f) > 0 || f.stages.some(s => getStageDelayHours(s) > 0 || s.status === 'Delayed'))) return false;
    if (cardFilter === 'AWAITING_ME' && !isMyFlowAction(f)) return false;
    return true;
  });

  const activeFlow = filteredFlows.find((f) => f.id === selectedFlowId) || filteredFlows[0] || flows.find((f) => f.id === selectedFlowId) || flows[0];

  const customTemplateForActiveFlow = activeFlow?.customTemplateId
    ? storageAdapter.getAllMasterTemplates().find((t) => t.id === activeFlow.customTemplateId || t.templateKey === activeFlow.flowType)
    : storageAdapter.getAllMasterTemplates().find((t) => t.templateKey === activeFlow?.flowType);

  const activeStageDefs: FmsStageDefinition[] = customTemplateForActiveFlow
    ? customTemplateForActiveFlow.stages.map((stg, sIdx) => ({
        stageId: stg.stageId,
        stageNumber: sIdx + 1,
        name: stg.stageName,
        what: stg.stageName,
        whoRole: stg.whoRole || 'ASSIGNED_ROLE',
        whoDefaultAssignee: stg.whoDefaultAssignee || 'Assignee',
        howChannel: stg.howChannel || 'IN-APP FORM',
        formUrl: stg.howChannel?.startsWith('http') ? stg.howChannel : undefined,
        slaHours: stg.slaHours || 4,
        isCheckpoint: stg.logic?.gatewayType === 'CONDITIONAL_JUMP',
        hasYesNoDecision: stg.logic?.gatewayType === 'CONDITIONAL_JUMP',
        fields: stg.fields,
      }))
    : activeFlow?.stages && activeFlow.stages.length > 0 && !['CHECK_STOCK', 'PO_TO_PAYMENT', 'PURCHASE_TO_STORE_DISPATCH', 'STORE_TO_SITE_DISPATCH', 'PAYMENT_TO_DISPATCH', 'SITE_RECEIVE', 'ACCOUNTS_INVOICE_COLLECTION', 'HR_ATTENDANCE_PAYMENT', 'BREAKDOWN_REPORTING', 'EQUIPMENT_PART_REPAIR', 'DPR_REPORTING', 'INDENT_PURCHASE'].includes(activeFlow.flowType)
    ? activeFlow.stages.map((stg, sIdx) => ({
        stageId: stg.stageId,
        stageNumber: sIdx + 1,
        name: stg.stageName,
        what: stg.stageName,
        whoRole: 'ASSIGNED_ROLE',
        whoDefaultAssignee: stg.assignee || 'Assignee',
        howChannel: stg.how || 'IN-APP FORM',
        formUrl: stg.how?.startsWith('http') ? stg.how : undefined,
        slaHours: 4,
        isCheckpoint: stg.logic?.gatewayType === 'CONDITIONAL_JUMP',
        hasYesNoDecision: stg.logic?.gatewayType === 'CONDITIONAL_JUMP',
        fields: stg.fields,
      }))
    : activeFlow?.flowType === 'CHECK_STOCK'
    ? FMS_CHECK_STOCK_STAGES
    : activeFlow?.flowType === 'PO_TO_PAYMENT' 
    ? FMS_PO_PAYMENT_STAGES 
    : activeFlow?.flowType === 'PURCHASE_TO_STORE_DISPATCH'
    ? FMS_PURCHASE_TO_STORE_DISPATCH_STAGES
    : activeFlow?.flowType === 'STORE_TO_SITE_DISPATCH'
    ? FMS_STORE_TO_SITE_DISPATCH_STAGES
    : activeFlow?.flowType === 'PAYMENT_TO_DISPATCH'
    ? FMS_PAYMENT_TO_DISPATCH_STAGES
    : activeFlow?.flowType === 'SITE_RECEIVE'
    ? FMS_SITE_RECEIVE_STAGES
    : activeFlow?.flowType === 'ACCOUNTS_INVOICE_COLLECTION'
    ? FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES
    : activeFlow?.flowType === 'HR_ATTENDANCE_PAYMENT'
    ? FMS_HR_ATTENDANCE_PAYMENT_STAGES
    : activeFlow?.flowType === 'BREAKDOWN_REPORTING'
    ? FMS_BREAKDOWN_REPORTING_STAGES
    : activeFlow?.flowType === 'EQUIPMENT_PART_REPAIR'
    ? FMS_EQUIPMENT_PART_REPAIR_STAGES
    : activeFlow?.flowType === 'DPR_REPORTING'
    ? FMS_DPR_REPORTING_STAGES
    : FMS_STANDARD_PURCHASE_STAGES;

  // Calculate user's stages count for activeFlow
  const myStagesInFlow = activeStageDefs.map((def, idx) => ({
    def,
    idx,
    exec: activeFlow?.stages[idx],
    isMine: isMyStage(def, activeFlow?.stages[idx]),
  })).filter((s) => s.isMine);

  // Stages to render based on stageFilterMode
  const stagesToRender = activeStageDefs.map((def, idx) => ({
    def,
    idx,
    exec: activeFlow?.stages[idx],
    isMine: isMyStage(def, activeFlow?.stages[idx]),
  })).filter((item) => {
    if (stageFilterMode === 'MY_STAGES') {
      return item.isMine;
    }
    return true;
  });

  const handleAdvanceCurrentStage = (flow: FmsInstance, decision?: 'Yes' | 'No') => {
    const updatedStages = [...flow.stages];
    const currentIndex = flow.currentStageIndex;
    const currentStage = updatedStages[currentIndex];

    if (!currentStage) return;

    const now = new Date().toLocaleString('en-GB');
    currentStage.status = 'Done';
    currentStage.actualDateTime = now;
    if (decision) {
      currentStage.decisionValue = decision;
    }

    let nextIndex = currentIndex + 1;

    // Checkpoint branching rules:
    if (flow.flowType === 'CHECK_STOCK') {
      // 1. Stage 2: IS MATERIAL PURCHASE REQUIRED?
      if (currentStage.stageId === 'STG-STK-02') {
        if (decision === 'No') {
          // Material in stock! Skip Stage 3 & Stage 4
          if (updatedStages[2]) {
            updatedStages[2].status = 'Skipped';
            updatedStages[2].notes = 'Skipped: Stock available in store, no purchase needed';
          }
          if (updatedStages[3]) {
            updatedStages[3].status = 'Skipped';
            updatedStages[3].notes = 'Skipped: Stock available in store, no purchase needed';
          }
          nextIndex = 4; // Jump directly to Stage 5: DISPATCH MATERIAL AVAILABLE
        } else if (decision === 'Yes') {
          nextIndex = 2; // Proceed to Stage 3: SEND INDENT FOR MATERIAL TO BE PURCHASED
        }
      }

      // 2. Stage 4: IS PARTIAL PURCHASE REQUIRED?
      if (currentStage.stageId === 'STG-STK-04') {
        if (decision === 'Yes') {
          nextIndex = 4; // Proceed to Stage 5: DISPATCH MATERIAL AVAILABLE
        } else if (decision === 'No') {
          // Zero available in store; 100% full purchase needed from vendor
          if (updatedStages[4]) {
            updatedStages[4].status = 'Skipped';
            updatedStages[4].notes = 'Skipped: Full purchase required from vendor';
          }
          nextIndex = 5;
        }
      }
    } else if (flow.flowType === 'PO_TO_PAYMENT') {
      // 1. Stage 1: IS PAYMENT TO BE DONE FROM ACCOUNT?
      if (currentStage.stageId === 'STG-PAY-01') {
        if (decision === 'Yes') {
          // Bank Account Path: Skip UPI stages (indexes 10, 11, 12, 13)
          [10, 11, 12, 13].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: Paid via Bank Account route';
            }
          });
          nextIndex = 1; // Stage 2: IS ACCOUNT ALREADY ADDED?
        } else if (decision === 'No') {
          // UPI Path: Skip Bank Account stages (indexes 1 to 9)
          for (let i = 1; i <= 9; i++) {
            if (updatedStages[i]) {
              updatedStages[i].status = 'Skipped';
              updatedStages[i].notes = 'Skipped: Routed via UPI QR code payment';
            }
          }
          nextIndex = 10; // Jump to Stage 11: PAYMENT APPROVAL FORM (UPI)
        }
      }

      // 2. Stage 2: IS ACCOUNT ALREADY ADDED?
      if (currentStage.stageId === 'STG-PAY-02') {
        if (decision === 'Yes') {
          // Account already added: Skip Beneficiary stages 3 to 6 (indexes 2, 3, 4, 5)
          for (let i = 2; i <= 5; i++) {
            if (updatedStages[i]) {
              updatedStages[i].status = 'Skipped';
              updatedStages[i].notes = 'Skipped: Account already verified in internet banking';
            }
          }
          nextIndex = 6; // Jump directly to Stage 7: PAYMENT APPROVAL FORM
        } else if (decision === 'No') {
          nextIndex = 2; // Proceed to Stage 3: GET CANCELLED CHEQUE/PASSBOOK COPY
        }
      }

      // 3. Stage 10: GET ONLINE PAYMENT APPROVAL / PAYMENT DONE (End of Bank Route)
      if (currentStage.stageId === 'STG-PAY-10') {
        nextIndex = 14; // Jump to Final Stage 15: SEND PAYMENT DETAILS TO GET MATERIAL
      }

      // 4. Stage 14: MAKE PAYMENT (End of UPI Route)
      if (currentStage.stageId === 'STG-PAY-14') {
        nextIndex = 14; // Jump to Final Stage 15: SEND PAYMENT DETAILS TO GET MATERIAL
      }
    } else if (flow.flowType === 'STORE_TO_SITE_DISPATCH') {
      // Stage 4: IS E-WAY REQUIRED?
      if (currentStage.stageId === 'STG-SSD-04') {
        if (decision === 'No') {
          // E-Way Bill Not Required: Skip Stage 5 (SEND CHALLAN) and Stage 6 (GET E-WAY BILL)
          [4, 5].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: E-Way Bill not required for this consignment';
            }
          });
          nextIndex = 6; // Jump directly to Stage 7: LOAD MATERIAL TO BE DISPATCHED
        } else if (decision === 'Yes') {
          nextIndex = 4; // Proceed to Stage 5: SEND STOCK TRANSFER NOTE/DELIVERY CHALLAN FOR E-WAY BILL
        }
      }
    } else if (flow.flowType === 'PURCHASE_TO_STORE_DISPATCH') {
      // Stage 5: IS E-WAY BILL REQUIRED?
      if (currentStage.stageId === 'STG-PSD-05') {
        if (decision === 'No') {
          // E-Way Bill Not Required: Skip Stage 6 (SEND CHALLAN) and Stage 7 (GET E-WAY BILL)
          [5, 6].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: E-Way Bill not required for this consignment';
            }
          });
          nextIndex = 7; // Jump directly to Stage 8: LOAD MATERIAL FOR DISPATCH
        } else if (decision === 'Yes') {
          nextIndex = 5; // Proceed to Stage 6: SEND DELIVERY CHALLAN/STOCK TRANSFER NOTE FOR E-WAY BILL
        }
      }
    } else if (flow.flowType === 'PAYMENT_TO_DISPATCH') {
      // 1. Stage 3: IS MATERIAL ACCEPTABLE ?
      if (currentStage.stageId === 'STG-DISP-03') {
        if (decision === 'Yes') {
          // Acceptable: Skip Return, Is Replaced, and Refund (Stages 4, 5, 6)
          [3, 4, 5].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: Material accepted as per PO specifications';
            }
          });
          nextIndex = 6; // Jump directly to Stage 7: DISPATCH MATERIAL
        } else if (decision === 'No') {
          nextIndex = 3; // Proceed to Stage 4: RETURN / REPLACE MATERIAL
        }
      }

      // 2. Stage 5: IS MATERIAL REPLACED ?
      if (currentStage.stageId === 'STG-DISP-05') {
        if (decision === 'Yes') {
          if (updatedStages[5]) {
            updatedStages[5].status = 'Skipped';
            updatedStages[5].notes = 'Skipped: Material successfully replaced by vendor';
          }
          nextIndex = 6; // Jump directly to Stage 7: DISPATCH MATERIAL
        } else if (decision === 'No') {
          nextIndex = 5; // Proceed to Stage 6: GET REFUND / CREDIT NOTES
        }
      }
    } else if (flow.flowType === 'SITE_RECEIVE') {
      // 1. Stage 3: ARE THERE ANY DISCREPANCY OBSERVED ?
      if (currentStage.stageId === 'STG-REC-03') {
        if (decision === 'No') {
          // No discrepancy observed: Skip Stage 4 (INFORM CSR STORE & GET IT RECTIFIED)
          if (updatedStages[3]) {
            updatedStages[3].status = 'Skipped';
            updatedStages[3].notes = 'Skipped: No discrepancy observed in consignment';
          }
          nextIndex = 4; // Jump directly to Stage 5: IS MATERIAL ACCEPTABLE ?
        } else if (decision === 'Yes') {
          nextIndex = 3; // Proceed to Stage 4: INFORM CSR STORE & GET IT RECTIFIED
        }
      }

      // 2. Stage 5: IS MATERIAL ACCEPTABLE ?
      if (currentStage.stageId === 'STG-REC-05') {
        if (decision === 'Yes') {
          // Material acceptable: Skip Stage 6 (RETURN MATERIAL TO REPAIRE STORE)
          if (updatedStages[5]) {
            updatedStages[5].status = 'Skipped';
            updatedStages[5].notes = 'Skipped: Material verified in acceptable condition';
          }
          nextIndex = 6; // Jump directly to Stage 7: GET MATERIAL VERIFIED
        } else if (decision === 'No') {
          nextIndex = 5; // Proceed to Stage 6: RETURN MATERIAL TO REPAIRE STORE
        }
      }

      // 3. Stage 9: IS MATERIAL INWARD FORM FILLED ?
      if (currentStage.stageId === 'STG-REC-09') {
        nextIndex = 9; // Proceed to Stage 10: FILL GOOGLE FORM FOR MATERIAL INWARD
      }
    } else if (flow.flowType === 'ACCOUNTS_INVOICE_COLLECTION') {
      // Stage 3: IS INVOICE ACCEPTABLE?
      if (currentStage.stageId === 'STG-INV-03') {
        if (decision === 'Yes') {
          // Acceptable: Skip Stage 4 (GET INVOICE RECTIFIED)
          if (updatedStages[3]) {
            updatedStages[3].status = 'Skipped';
            updatedStages[3].notes = 'Skipped: Invoice verified acceptable without rectification';
          }
          nextIndex = 4; // Jump directly to Stage 5: GET INVOICE APPROVAL
        } else if (decision === 'No') {
          nextIndex = 3; // Proceed to Stage 4: GET INVOICE RECTIFIED
        }
      }
    } else if (flow.flowType === 'HR_ATTENDANCE_PAYMENT') {
      // Stage 3: CHECK FOR OT IF ANY ?
      if (currentStage.stageId === 'STG-HR-03') {
        if (decision === 'No') {
          // No Overtime: Skip Stage 4 (PREPARE OT SHEET) and Stage 5 (GET APPROVAL OT SHEET)
          [3, 4].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: No overtime (OT) logged for this attendance cycle';
            }
          });
          nextIndex = 5; // Jump directly to Stage 6: PREPARE ATTENDANCE & PAYMENT SHEET
        } else if (decision === 'Yes') {
          nextIndex = 3; // Proceed to Stage 4: PREPARE OT SHEET
        }
      }
    } else if (flow.flowType === 'BREAKDOWN_REPORTING') {
      // 1. Stage 2: IS SERVICE ENGINEER REQUIRED?
      if (currentStage.stageId === 'STG-BRK-02') {
        if (decision === 'No') {
          // Service engineer not required: Skip Stage 3 (CALL SERVICE ENGINEER)
          if (updatedStages[2]) {
            updatedStages[2].status = 'Skipped';
            updatedStages[2].notes = 'Skipped: Service engineer visit not required';
          }
          nextIndex = 3; // Jump directly to Stage 4: PREPARE DETAILED DEFECT ANALYSIS REPORT
        } else if (decision === 'Yes') {
          nextIndex = 2; // Proceed to Stage 3: CALL SERVICE ENGINEER
        }
      }

      // 2. Stage 5: CAN DEFECTIVE PART/MACHINE/PLANT/VEHICLE BE REPAIRED AT SITE?
      if (currentStage.stageId === 'STG-BRK-05') {
        if (decision === 'Yes') {
          nextIndex = 5; // Proceed to Stage 6: SEND PARTS INDENT ALONG WITH SAMPLE
        } else if (decision === 'No') {
          // Cannot be repaired at site: Skip site parts indent & site repair (Stages 6, 7, 8)
          [5, 6, 7].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: Sent for offsite workshop repair';
            }
          });
          nextIndex = 8; // Jump directly to Stage 9: SEND MACHINE/PLANT/VEHICLE DEFECTIVE PART FOR REPAIR
        }
      }

      // 3. Stage 8: REPAIR MACHINE (Site Repair Complete)
      if (currentStage.stageId === 'STG-BRK-08') {
        // Skip offsite workshop repair stages 9, 10, 11, 12
        [8, 9, 10, 11].forEach((idx) => {
          if (updatedStages[idx]) {
            updatedStages[idx].status = 'Skipped';
            updatedStages[idx].notes = 'Skipped: Machine successfully repaired at site';
          }
        });
        nextIndex = 12; // Jump directly to Stage 13: TRIAL RUN FOR 2 HOURS
      }

      // 4. Stage 12: GET MACHINE REPAIR (External Workshop Complete)
      if (currentStage.stageId === 'STG-BRK-12') {
        nextIndex = 12; // Proceed to Stage 13: TRIAL RUN FOR 2 HOURS
      }
    } else if (flow.flowType === 'EQUIPMENT_PART_REPAIR') {
      // 1. Stage 3: IS PART/EQUIPMENT UNDER WARRANTY?
      if (currentStage.stageId === 'STG-EQP-03') {
        if (decision === 'No') {
          // Out of Warranty: Skip Stage 4 (SEND PART/EQUIPMENT TO AUTHORIZED SERVICE CENTER)
          if (updatedStages[3]) {
            updatedStages[3].status = 'Skipped';
            updatedStages[3].notes = 'Skipped: Out of warranty - proceed to paid repair approval';
          }
          nextIndex = 4; // Jump directly to Stage 5: GET APPROVAL FOR REPAIR
        } else if (decision === 'Yes') {
          nextIndex = 3; // Proceed to Stage 4: SEND PART/EQUIPMENT TO AUTHORIZED SERVICE CENTER
        }
      }

      // 2. Stage 12: IS TRIAL RUN SUCCESSFUL?
      if (currentStage.stageId === 'STG-EQP-12') {
        if (decision === 'Yes') {
          nextIndex = 12; // Proceed to Stage 13: ARE ADDITIONAL CHARGES TO BE INCURRED?
        } else if (decision === 'No') {
          nextIndex = 14; // Re-send for repair rework (Stage 15)
        }
      }

      // 3. Stage 13: ARE ADDITIONAL CHARGES TO BE INCURRED?
      if (currentStage.stageId === 'STG-EQP-13') {
        if (decision === 'No') {
          // No additional charges: Skip Stage 14 (GET APPROVAL), 15 (SEND FOR REPAIR), 16 (TRIAL RUN)
          [13, 14, 15].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: No additional charges incurred';
            }
          });
          nextIndex = 16; // Jump directly to Stage 17: RECEIVE PART/EQUIPMENT IN STORE
        } else if (decision === 'Yes') {
          nextIndex = 13; // Proceed to Stage 14: GET APPROVAL
        }
      }
    } else if (flow.flowType === 'DPR_REPORTING') {
      // Standard sequential progression for DPR (Stages 1 through 6)
      nextIndex = flow.currentStageIndex + 1;
    } else {
      // INDENT_PURCHASE Rules (Synced with App.handleAdvanceCurrentStage):
      const isStoreAvailabilityStage = currentStage.stageId === 'STG-IND-02' || currentStage.stageName.toUpperCase().includes('AVAILABLE IN STORE');
      const isDegradedMaterialCheck = currentStage.stageName.toUpperCase().includes('DEGRADED') || (currentStage.stageId === 'STG-02' && !isStoreAvailabilityStage);

      // 1. Degraded Material Check (Stage 2 in standard purchase flows)
      if (isDegradedMaterialCheck && decision === 'No') {
        if (updatedStages[2]) {
          updatedStages[2].status = 'Skipped';
          updatedStages[2].notes = 'Skipped: No degraded material to return';
        }
        nextIndex = 3; // Skip Stage 3 (RETURN OF DEGRADED MATERIAL) and jump directly to Stage 4 (PURCHASE APPROVAL)
      } else if (isStoreAvailabilityStage) {
        // 2. Store Availability Check (Construction Operations Flow)
        const availChoice = (decision || 'PARTIAL').toString().toUpperCase();
        if (availChoice === 'ALL') {
          // ALL items in store -> skip quotation & purchase stages (stages 2 through 10), jump directly to Store Dispatch
          for (let sIdx = 2; sIdx < updatedStages.length - 1; sIdx++) {
            if (updatedStages[sIdx]) {
              updatedStages[sIdx].status = 'Skipped';
              updatedStages[sIdx].notes = 'Skipped: All items available in store inventory, direct site dispatch issued';
            }
          }
          nextIndex = updatedStages.length - 1; // Stage 12: MATERIAL COLLECTION / DISPATCH
        } else if (availChoice === 'NONE') {
          // NONE in store -> proceed sequentially to Purchase Approval & Vendor Quotations
          nextIndex = flow.currentStageIndex + 1;
        } else {
          // PARTIAL: Store records available items, dispatches them, balance proceeds to Purchase
          nextIndex = flow.currentStageIndex + 1;
        }
      }


      const isIndentFlow =
        flow.flowType === 'INDENT_TO_PO' ||
        flow.flowType === 'INDENT_PURCHASE' ||
        flow.templateKey === 'INDENT_TO_PO' ||
        flow.templateKey === 'tpl_indent_purchase' ||
        flow.indentNo?.endsWith('-PUR') ||
        flow.flowId?.includes('-PUR');

      if (isIndentFlow && (currentStage.stageId === 'STG-03' || flow.currentStageIndex === 2)) {
        if (decision === 'Yes' || currentStage.status === 'Done') {
          // Skip static Stage 4 (GET ANOTHER QUOTATION)
          if (updatedStages[3]) {
            updatedStages[3].status = 'Skipped';
            updatedStages[3].notes = 'Skipped: Director Approved without additional quotation';
          }
          nextIndex = 4; // Jump directly to Stage 5 (Generate & Issue PO)
        } else {
          // Request Additional Quotation branch
          currentStage.status = 'Returned / On Hold';
          currentStage.remarks = 'Returned for Additional Quotation';
          nextIndex = 3; // Advance to Stage 4 (GET ANOTHER QUOTATION)

          if (updatedStages[3]) {
            updatedStages[3].status = 'In Progress';
            updatedStages[3].assignee = 'Brahmanand Patel';
            updatedStages[3].whoDefaultAssignee = 'Brahmanand Patel';
            updatedStages[3].whoRole = 'ASST. MANAGER PURCHASE';
            const planned12hDate = new Date(Date.now() + 12 * 3600 * 1000);
            updatedStages[3].slaHours = 12;
            updatedStages[3].targetDurationHours = 12;
            updatedStages[3].plannedDateTime = formatToStandardDateTime(planned12hDate);
            updatedStages[3].plannedTimestamp = planned12hDate.toISOString();
          }
        }
      } else if (isIndentFlow && (currentStage.stageId === 'STG-04' || flow.currentStageIndex === 3)) {
        // Stage 4: GET ANOTHER QUOTATION (Completed by Brahmanand Patel)
        currentStage.status = 'Done';
        nextIndex = 2; // Route back to Stage 3 (0-indexed: 2)
        if (updatedStages[2]) {
          updatedStages[2].status = 'In Progress';
          updatedStages[2].assignee = 'Pranjal Agrawal';
          updatedStages[2].whoDefaultAssignee = 'Pranjal Agrawal';
          updatedStages[2].whoRole = 'DIRECTOR / PROJECT MANAGER';
          updatedStages[2].actualDateTime = undefined;
          updatedStages[2].actualTimestamp = undefined;
          updatedStages[2].remarks = 'Awaiting Director Final L1 Approval after Stage 4 additional quotation';
        }
      } else if (
        isIndentFlow &&
        ((currentStage.stageId === 'STG-06' ||
          currentStage.stageId === 'STG-10' ||
          currentStage.stageName.toUpperCase().includes('ADVANCE PAYMENT TO BE DONE')) &&
          decision === 'No')
      ) {
        if (updatedStages[flow.currentStageIndex + 1]) {
          updatedStages[flow.currentStageIndex + 1].status = 'Skipped';
          updatedStages[flow.currentStageIndex + 1].notes = 'Skipped: No advance payment required';
        }
        nextIndex = flow.currentStageIndex + 2;
      }
    }

    const isComplete = nextIndex >= updatedStages.length;
    const nextStageId = isComplete ? 'COMPLETED' : updatedStages[nextIndex]?.stageId || 'COMPLETED';

    if (!isComplete && updatedStages[nextIndex]) {
      updatedStages[nextIndex].status = 'In Progress';
      if (!updatedStages[nextIndex].plannedDateTime) {
        const def = activeStageDefs.find((s) => s.stageId === updatedStages[nextIndex].stageId);
        const sla = def?.slaHours || 2;
        const workShiftConfig = storageAdapter.getRegistryConfig().workShiftConfig || DEFAULT_WORK_SHIFT_CONFIG;
        const targetDate = addWorkingSlaHours(new Date(), sla, workShiftConfig);
        updatedStages[nextIndex].plannedDateTime = formatToStandardDateTime(targetDate);
      }
    }

    const updatedFlow: FmsInstance = {
      ...flow,
      currentStageIndex: isComplete ? updatedStages.length : nextIndex,
      currentStageId: nextStageId,
      status: isComplete ? 'Completed' : 'In Progress',
      updatedAt: now,
      stages: updatedStages,
    };

    onUpdateFlow(updatedFlow);
  };

  const currentStageDef = activeStageDefs[activeFlow?.currentStageIndex] || activeStageDefs[0];
  const isCurrentStageWaitingForMe = activeFlow 
    ? isMyStage(currentStageDef, activeFlow.stages[activeFlow.currentStageIndex])
    : false;

  // KPI Calculations (scoped to selected workflow / department if selected, so each individual page gets instant stats)
  const scopedFlowsForStats = flows.filter((f) => {
    if (viewModeTab === 'ARCHIVED') {
      if (!f.isClosed && f.status !== 'CLOSED') return false;
    } else {
      if (f.isClosed || f.status === 'CLOSED') return false;
    }
    if (selectedWorkflowFilter) {
      if (!isFlowMatchingWorkflow(f, selectedWorkflowFilter)) return false;
    } else if (selectedDepartmentFilter) {
      const flowDept = getFlowDepartmentKey(f, customTemplates);
      if (flowDept !== selectedDepartmentFilter) return false;
    }
    return true;
  });

  const statsPending = scopedFlowsForStats.filter(f => f.status === 'In Progress').length;
  const statsCompleted = scopedFlowsForStats.filter(f => f.status === 'Completed').length;
  const statsDelayed = scopedFlowsForStats.filter(f => getFlowTotalDelay(f) > 0 || f.stages.some(s => getStageDelayHours(s) > 0 || s.status === 'Delayed')).length;
  const statsAwaitingMe = scopedFlowsForStats.filter(isMyFlowAction).length;

  // Export CSV handler for currently filtered table data
  const handleExportFilteredCsv = () => {
    const headers = [
      'Reference / Requisition Code',
      'Workflow Type',
      'Site Name',
      'Priority',
      'Status',
      'Current Active Stage',
      'Assigned To',
      'SLA Delay (Hours)',
      'Created Date',
      'Updated Date'
    ];

    const rows = filteredFlows.map((flow) => {
      const curStage = flow.stages[flow.currentStageIndex];
      return [
        flow.poNumber || flow.indentNo || flow.requisitionNumber || flow.flowId,
        flow.flowType,
        flow.siteName,
        flow.priority,
        flow.status,
        curStage ? `Stage ${flow.currentStageIndex + 1}: ${curStage.stageName}` : 'Completed',
        curStage ? curStage.assignee : 'N/A',
        flow.totalDelayHours || 0,
        flow.createdAt,
        flow.updatedAt
      ];
    });

    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`FMS_Pipeline_Filtered_Export_${timestamp}.csv`, headers, rows);
  };

  return (
    <div className="space-y-6">
      {/* Mode Switcher Banner: Active Running FMS vs Archived / Closed FMS vs FMS Master Directory */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg flex-wrap">
          <button
            type="button"
            onClick={() => setViewModeTab('RUNNING_PIPELINE')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              viewModeTab === 'RUNNING_PIPELINE'
                ? 'bg-indigo-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <GitBranch className="w-3.5 h-3.5" />
            <span>Active Workflows ({flows.filter((f) => !f.isClosed && f.status !== 'CLOSED').length})</span>
          </button>

          <button
            type="button"
            onClick={() => setViewModeTab('ARCHIVED')}
            className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
              viewModeTab === 'ARCHIVED'
                ? 'bg-slate-900 text-emerald-400 shadow-xs border border-slate-800'
                : 'text-slate-600 hover:text-slate-900 font-semibold'
            }`}
          >
            <Lock className="w-3.5 h-3.5 text-emerald-500" />
            <span>Archived / Closed FMS ({closedFlowsCount})</span>
          </button>

          {isAdminOrSuperAdmin && (
            <button
              type="button"
              onClick={() => setViewModeTab('MASTER_CATALOG')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                viewModeTab === 'MASTER_CATALOG'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 font-semibold'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>FMS Workflow Master Directory</span>
            </button>
          )}
        </div>

        {viewModeTab === 'RUNNING_PIPELINE' && onCreateFlow && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onCreateFlow()}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>New FMS Workflow</span>
            </button>
          </div>
        )}
      </div>

      {isAdminOrSuperAdmin && viewModeTab === 'MASTER_CATALOG' ? (
        <FmsMasterCatalogView
          currentUser={currentUser}
          onOpenTemplateStudio={onOpenTemplateStudio}
          onCreateFlow={onCreateFlow}
        />
      ) : (
        <>
          {/* KPI Stats Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5 sm:gap-4">
        {/* Total Pending */}
        <div 
          onClick={() => setCardFilter(cardFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          title="Click to filter by Pending status"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            cardFilter === 'PENDING' 
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${cardFilter === 'PENDING' ? 'text-white' : 'text-indigo-600'}`}>
              Pending
            </span>
            <Clock className={`w-4 h-4 sm:w-5 sm:h-5 ${cardFilter === 'PENDING' ? 'text-white' : 'text-indigo-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-4xl font-black ${cardFilter === 'PENDING' ? 'text-white' : 'text-slate-900'}`}>
              {statsPending}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              cardFilter === 'PENDING'
                ? 'bg-white/25 text-white'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            }`}>
              In-Progress
            </span>
          </div>
        </div>

        {/* Total Completed */}
        <div 
          onClick={() => setCardFilter(cardFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
          title="Click to filter by Completed status"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            cardFilter === 'COMPLETED' 
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${cardFilter === 'COMPLETED' ? 'text-white' : 'text-emerald-600'}`}>
              Completed
            </span>
            <CheckCircle2 className={`w-4 h-4 sm:w-5 sm:h-5 ${cardFilter === 'COMPLETED' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-4xl font-black ${cardFilter === 'COMPLETED' ? 'text-white' : 'text-slate-900'}`}>
              {statsCompleted}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              cardFilter === 'COMPLETED'
                ? 'bg-white/25 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              Finished
            </span>
          </div>
        </div>

        {/* Total Delayed */}
        <div 
          onClick={() => setCardFilter(cardFilter === 'DELAYED' ? 'ALL' : 'DELAYED')}
          title="Click to filter by Delayed status"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            cardFilter === 'DELAYED' 
              ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${cardFilter === 'DELAYED' ? 'text-white' : 'text-rose-600'}`}>
              Delayed
            </span>
            <AlertTriangle className={`w-4 h-4 sm:w-5 sm:h-5 ${cardFilter === 'DELAYED' ? 'text-white' : 'text-rose-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-4xl font-black ${cardFilter === 'DELAYED' ? 'text-white' : 'text-slate-900'}`}>
              {statsDelayed}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              cardFilter === 'DELAYED'
                ? 'bg-white/25 text-white'
                : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              Overdue
            </span>
          </div>
        </div>

        {/* My Active Actions */}
        <div 
          onClick={() => setCardFilter(cardFilter === 'AWAITING_ME' ? 'ALL' : 'AWAITING_ME')}
          title="Click to filter by actions on your desk"
          className={`p-3.5 sm:p-5 rounded-xl sm:rounded-2xl border cursor-pointer transition-all ${
            cardFilter === 'AWAITING_ME' 
              ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-400/50 scale-[1.01]' 
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[11px] sm:text-xs font-bold uppercase tracking-wider ${cardFilter === 'AWAITING_ME' ? 'text-white' : 'text-amber-600'}`}>
              My Actions
            </span>
            <UserCheck className={`w-4 h-4 sm:w-5 sm:h-5 ${cardFilter === 'AWAITING_ME' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className="mt-2 sm:mt-3 flex items-baseline justify-between">
            <span className={`text-2xl sm:text-4xl font-black ${cardFilter === 'AWAITING_ME' ? 'text-white' : 'text-slate-900'}`}>
              {statsAwaitingMe}
            </span>
            <span className={`text-[10px] sm:text-[11px] font-semibold px-2 py-0.5 sm:px-2.5 sm:py-1 rounded-full ${
              cardFilter === 'AWAITING_ME'
                ? 'bg-white/25 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}>
              Awaiting Me
            </span>
          </div>
        </div>
      </div>

      {/* UNIFIED SINGLE FMS HEADER TOOLBAR */}
      <div className="space-y-3 bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
        {/* Tier 1: Department Breadcrumb & Master Workflow Branch Selector */}
        <div className="flex flex-wrap items-center justify-between gap-2.5 px-3.5 py-2 bg-slate-50 border border-slate-200/80 rounded-xl text-xs">
          <div className="flex items-center gap-2 text-slate-800 font-bold flex-wrap">
            <GitBranch className="w-4 h-4 text-indigo-600 shrink-0" />
            {selectedDepartmentFilter && (
              <span>
                Department: <strong className="text-indigo-700">{getDepartmentBranchLabel(selectedDepartmentFilter)}</strong>
              </span>
            )}
            {selectedDepartmentFilter && <span className="text-slate-400">›</span>}

            {/* Workflow Branch Selector Dropdown */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-lg border border-slate-300 shadow-2xs">
              <label htmlFor="top-branch-select" className="text-[11px] font-extrabold uppercase text-indigo-900 whitespace-nowrap">
                Branch Workflow:
              </label>
              <select
                id="top-branch-select"
                value={selectedWorkflowFilter || 'ALL'}
                onChange={(e) => {
                  const val = e.target.value;
                  if (onSelectWorkflowFilter) {
                    onSelectWorkflowFilter(val === 'ALL' ? null : val);
                  }
                }}
                className="text-xs font-extrabold bg-transparent text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">
                  {selectedDepartmentFilter ? `All ${getDepartmentBranchLabel(selectedDepartmentFilter)} Workflows` : 'All Workflows Combined'}
                </option>
                <option value="INDENT_PURCHASE">Indent to PO (Purchase FMS)</option>
                <option value="PAYMENT_TO_DISPATCH">Vendor Payment to Dispatch</option>
                <option value="CHECK_STOCK">Check Stock (Store FMS)</option>
                <option value="PURCHASE_TO_STORE_DISPATCH">Purchase to Store Dispatch</option>
                <option value="STORE_TO_SITE_DISPATCH">Store to Site Issue</option>
                <option value="SITE_RECEIVE">Site Material Receive (MRN)</option>
                <option value="PO_TO_PAYMENT">PO to Payment (Accounts FMS)</option>
                <option value="BENEFICIARY_APPROVAL">Beneficiary Approval FMS</option>
                <option value="ACCOUNTS_INVOICE_COLLECTION">Invoice Collection FMS</option>
                <option value="HR_ATTENDANCE_PAYMENT">Labour Attendance &amp; Payment</option>
                <option value="BREAKDOWN_REPORTING">Machinery Breakdown FMS</option>
                <option value="EQUIPMENT_PART_REPAIR">Equipment Part Repair FMS</option>
                <option value="DPR_REPORTING">Daily Progress Report FMS</option>
                {customTemplates.map((tpl) => (
                  <option key={tpl.id} value={tpl.templateKey || tpl.id}>
                    {tpl.name}
                  </option>
                ))}
              </select>
            </div>

            <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 font-mono text-[11px] font-extrabold border border-indigo-100">
              {filteredFlows.length} FMS Entries
            </span>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {selectedWorkflowFilter && onClearWorkflowFilter && (
              <button
                type="button"
                onClick={onClearWorkflowFilter}
                className="text-[11px] font-bold text-indigo-700 hover:text-indigo-900 bg-white px-2 py-0.5 rounded border border-indigo-200 cursor-pointer shadow-2xs"
              >
                Reset Workflow Filter
              </button>
            )}
            {selectedDepartmentFilter && onClearDepartmentFilter && (
              <button
                type="button"
                onClick={onClearDepartmentFilter}
                className="text-[11px] font-bold text-slate-600 hover:text-slate-900 underline cursor-pointer"
              >
                All Departments
              </button>
            )}
          </div>
        </div>

        {/* Tier 2: Search, Filters, View Mode Switcher, and Export Menu */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left: Search input */}
          <div className="relative flex-1 min-w-[240px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search Indent / PO / Vendor / Beneficiary / Site..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-8 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-xl font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:bg-white text-slate-900 shadow-2xs"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600 cursor-pointer"
              >
                ✕
              </button>
            )}
          </div>

          {/* Center: Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Site Filter */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-300">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <select
                aria-label="Filter by site"
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="text-xs bg-transparent border-none text-slate-700 font-bold hover:text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Sites</option>
                <option value="SILADEHI">SILADEHI</option>
                <option value="BIJETALA">BIJETALA</option>
                <option value="RAIPUR">RAIPUR</option>
              </select>
            </div>


            {/* SLA Delay Filter */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-300">
              <Clock className="w-3.5 h-3.5 text-rose-500" />
              <select
                value={delayFilter}
                onChange={(e) => setDelayFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">SLA: All Timelines</option>
                <option value="DELAYED_ONLY">SLA: Delayed Only</option>
                <option value="ON_TIME_ONLY">SLA: On Time Only</option>
              </select>
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-xl border border-slate-300">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="bg-transparent text-xs font-bold text-slate-700 focus:outline-none cursor-pointer"
              >
                <option value="ALL">Status: All</option>
                <option value="In Progress">Status: In Progress</option>
                <option value="Completed">Status: Completed</option>
              </select>
            </div>
          </div>

          {/* Right: View Mode Toggle Group + Single Consolidated Export Menu */}
          <div className="flex items-center gap-2">
            {/* View Mode Toggle Buttons (Icon-Only) */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-xl border border-slate-200 gap-0.5">
              <button
                type="button"
                onClick={() => setViewMode('STAGE_MATRIX')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'STAGE_MATRIX'
                    ? 'bg-indigo-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Master Stage Matrix View (Stage-by-Stage Field Table)"
              >
                <FileSpreadsheet className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('MATRIX')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'MATRIX'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Horizontal Summary Matrix View"
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('FOCUS_FEED')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'FOCUS_FEED'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Standard Cards View"
              >
                <Zap className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('KANBAN')}
                className={`p-2 rounded-lg transition-all cursor-pointer ${
                  viewMode === 'KANBAN'
                    ? 'bg-slate-800 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
                }`}
                title="Operations Kanban View"
              >
                <ClipboardList className="w-4 h-4" />
              </button>
            </div>

            {/* Single Consolidated Export Menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setExportDropdownOpen(!exportDropdownOpen)}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs transition-all shrink-0 shadow-2xs cursor-pointer"
                title="Export FMS Data Options"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Export</span>
                <ChevronDown className="w-3 h-3 opacity-80" />
              </button>

              {exportDropdownOpen && (
                <>
                  <div className="fixed inset-0 z-20" onClick={() => setExportDropdownOpen(false)} />
                  <div className="absolute right-0 mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-xl z-30 py-1.5 text-xs text-slate-700 animate-in fade-in zoom-in-95">
                    <button
                      type="button"
                      onClick={() => {
                        handleExportFilteredCsv();
                        setExportDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-bold text-slate-800 cursor-pointer"
                    >
                      <FileText className="w-4 h-4 text-indigo-600" />
                      <span>Export Filtered CSV (.csv)</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const activeTitle = selectedWorkflowFilter
                          ? `${selectedWorkflowFilter.toUpperCase()} WORKFLOW`
                          : 'ALL FMS WORKFLOWS';
                        downloadFmsHorizontalMatrixExcel(filteredFlows, activeTitle);
                        setExportDropdownOpen(false);
                      }}
                      className="w-full text-left px-3 py-2 hover:bg-slate-50 flex items-center gap-2 font-bold text-slate-800 cursor-pointer border-t border-slate-100"
                    >
                      <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
                      <span>Export Stage Matrix (.xlsx)</span>
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Quick Launch Comparative Statement (CS Sheet) for Barbrik Project Ltd. */}
            {onOpenComparativeSheet && (
              <button
                type="button"
                onClick={() => onOpenComparativeSheet()}
                className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold rounded-xl text-xs transition-all shrink-0 shadow-2xs cursor-pointer"
                title="Open Comparative Statement (CS Sheet) & Vendor Rate Comparison for Barbrik Project Ltd."
              >
                <Scale className="w-3.5 h-3.5" />
                <span>CS Sheet</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* DEDICATED MASTER STAGE MATRIX TABLE VIEW */}
      {viewMode === 'STAGE_MATRIX' && (
        <FmsStageMatrixTableView
          flows={flows}
          currentUser={currentUser}
          onSelectFlow={onSelectFlow}
          onUpdateFlow={onUpdateFlow}
          onDeleteFlow={onDeleteFlow}
          selectedDepartmentFilter={selectedDepartmentFilter}
          selectedWorkflowFilter={selectedWorkflowFilter}
          onSelectWorkflowFilter={onSelectWorkflowFilter}
          viewModeTab={viewModeTab}
          onOpenStageAction={onOpenStageAction}
          searchQuery={searchQuery}
          siteFilter={filterSite}
          delayFilter={delayFilter}
          statusFilter={statusFilter}
        />
      )}

      {/* ENTERPRISE MATRIX / HORIZONTAL SPREADSHEET VIEW */}
      {viewMode === 'MATRIX' && (() => {
        const totalFlows = filteredFlows.length;
        const totalPages = Math.max(1, Math.ceil(totalFlows / matrixPageSize));
        const validPage = Math.min(matrixPage, totalPages);
        const startIndex = (validPage - 1) * matrixPageSize;
        const paginatedFlows = filteredFlows.slice(startIndex, startIndex + matrixPageSize);

        const myPaginatedFlows = paginatedFlows.filter(f => isFlowAwaitingUserAction(f, currentUser));

        const shift = storageAdapter.getRegistryConfig().workShiftConfig || DEFAULT_WORK_SHIFT_CONFIG;

        const handleSelectAllMatrix = () => {
          const selectable = viewScope === 'USER_ONLY' ? paginatedFlows : myPaginatedFlows;
          if (matrixSelectedIds.length === selectable.length && selectable.length > 0) {
            setMatrixSelectedIds([]);
          } else {
            setMatrixSelectedIds(selectable.map(f => f.id));
          }
        };

        const handleToggleMatrixId = (id: string) => {
          setMatrixSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        };

        const handleBatchAdvanceMatrix = () => {
          paginatedFlows.forEach(flow => {
            if (matrixSelectedIds.includes(flow.id) && isFlowAwaitingUserAction(flow, currentUser)) {
              handleAdvanceCurrentStage(flow);
            }
          });
          setMatrixSelectedIds([]);
        };

        const handleBatchDeleteMatrix = () => {
          matrixSelectedIds.forEach(id => {
            if (onDeleteFlow) {
              onDeleteFlow(id);
            } else {
              storageAdapter.deleteFmsFlow(id, currentUser);
            }
          });
          setMatrixSelectedIds([]);
          setConfirmBatchDeleteMatrix(false);
        };

        // Stages for horizontal matrix
        const horizontalStages = activeStageDefs && activeStageDefs.length > 0
          ? activeStageDefs.map((stg, sIdx) => ({
              name: `${sIdx + 1}. ${stg.name}`,
              assignee: stg.whoDefaultAssignee || stg.whoRole || 'Assigned Officer',
              how: stg.howChannel || 'IN-APP FORM',
              slaHours: stg.slaHours || 2,
            }))
          : (filteredFlows[0]?.stages?.map((stg, sIdx) => ({
              name: `${sIdx + 1}. ${stg.stageName}`,
              assignee: stg.assignee || 'Assigned Officer',
              how: stg.how || 'IN-APP FORM',
              slaHours: 2,
            })) || [
              { name: '1. INDENT RECIEVE', assignee: 'Amanat Bharadwaj (Store Manager)', how: 'WHATSAPP / CALL / PHYSICAL', slaHours: 1 },
              { name: '2. DEGRADED MATERIAL CHECK', assignee: 'Bramhanand Patel (Asst. Mgr Purchase)', how: 'PHYSICAL CHECK', slaHours: 1 },
              { name: '3. RETURN OF DEGRADED MATERIAL FORM', assignee: 'Shyam Rao Sureshe (Purchase Exec)', how: 'IN-APP FORM', slaHours: 1 },
              { name: '4. PURCHASE APPROVAL', assignee: 'Pranay Ghosh (Project Manager)', how: 'MANUAL SHEET / IN-APP', slaHours: 3 },
              { name: '5. GET QUOTATION', assignee: 'Bramhanand Patel', how: 'CALL / EMAIL', slaHours: 25 },
              { name: '6. GET APPROVAL FOR QUOTATION', assignee: 'Pranay Ghosh', how: 'IN-APP APPROVAL', slaHours: 12 },
              { name: '7. COMPARATIVE STATEMENT', assignee: 'Bramhanand Patel', how: 'EXCEL COMPARATIVE', slaHours: 1 },
              { name: '8. PO CREATION', assignee: 'Shyam Rao Sureshe', how: 'ERP / SYSTEM', slaHours: 2 },
              { name: '9. PO APPROVAL', assignee: 'Pranay Ghosh / MD', how: 'IN-APP APPROVAL', slaHours: 2 },
              { name: '10. ADVANCE PAYMENT DECISION', assignee: 'Bramhanand Patel', how: 'IN-APP CHECKPOINT', slaHours: 1 },
              { name: '11. SEND FOR PAYMENT', assignee: 'Shyam Rao Sureshe', how: 'PAYMENT DOSSIER', slaHours: 2 },
              { name: '12. MATERIAL COLLECTION PO', assignee: 'Shyam Rao Sureshe', how: 'IN-APP FORM / DISPATCH', slaHours: 1 },
            ]);

        const activeWorkflowTitle = pipelineTypeFilter === 'INDENT_PURCHASE'
          ? 'INDENT TO PO (PURCHASE DEPARTMENT FMS)'
          : pipelineTypeFilter === 'PO_TO_PAYMENT'
          ? 'PO TO PAYMENT (ACCOUNTS DEPARTMENT FMS)'
          : pipelineTypeFilter === 'CHECK_STOCK'
          ? 'CHECK STOCK (STORE DEPARTMENT FMS)'
          : 'FMS HORIZONTAL MULTI-STAGE TRACKER';

        return (
          <div className="space-y-4">
            {/* View Sub-Switcher & Direct Excel Export Strip */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-700">Display Layout:</span>
                <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                  <button
                    type="button"
                    onClick={() => setMatrixStyle('HORIZONTAL_SPREADSHEET')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      matrixStyle === 'HORIZONTAL_SPREADSHEET'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <FileSpreadsheet className="w-3.5 h-3.5" />
                    <span>Horizontal Spreadsheet View (Shared Format)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setMatrixStyle('COMPACT_TABLE')}
                    className={`px-3 py-1 text-xs font-bold rounded-md transition-all flex items-center gap-1.5 cursor-pointer ${
                      matrixStyle === 'COMPACT_TABLE'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <Table className="w-3.5 h-3.5" />
                    <span>Compact Requisition List</span>
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => downloadFmsHorizontalMatrixExcel(filteredFlows, activeWorkflowTitle)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  title="Download Excel workbook matching the exact horizontal spreadsheet structure"
                >
                  <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-200" />
                  <span>📥 Download Spreadsheet (.xlsx)</span>
                </button>
              </div>
            </div>



            {/* Batch Action Floating Bar */}
            {matrixSelectedIds.length > 0 && (
              <div className="bg-indigo-950 text-white p-3 px-4 rounded-xl shadow-lg border border-indigo-700/50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <CheckSquare className="w-4 h-4 text-indigo-300" />
                  <span>{matrixSelectedIds.length} Requisitions Checked for Batch Action</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchAdvanceMatrix}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mass Advance Checked ({matrixSelectedIds.length})
                  </button>
                  {canDelete && (
                    confirmBatchDeleteMatrix ? (
                      <div className="flex items-center gap-1.5 bg-rose-900/90 border border-rose-500 rounded-lg px-2.5 py-1">
                        <span className="text-[11px] font-bold text-rose-200">Delete {matrixSelectedIds.length} items?</span>
                        <button
                          type="button"
                          onClick={handleBatchDeleteMatrix}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold cursor-pointer transition-colors"
                        >
                          Yes, Delete
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmBatchDeleteMatrix(false)}
                          className="px-2 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[11px] cursor-pointer transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmBatchDeleteMatrix(true)}
                        className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                        title="Delete selected items"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        Delete Checked ({matrixSelectedIds.length})
                      </button>
                    )
                  )}
                  <button
                    onClick={() => {
                      setMatrixSelectedIds([]);
                      setConfirmBatchDeleteMatrix(false);
                    }}
                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* 1. HORIZONTAL MULTI-STAGE SPREADSHEET (THE EXACT USER SHARED LAYOUT) */}
            {matrixStyle === 'HORIZONTAL_SPREADSHEET' ? (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto max-h-[72vh]">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="sticky top-0 z-20 bg-slate-900 text-white select-none">
                      {/* TIER 1: WHAT */}
                      <tr className="border-b border-slate-700 text-[11px]">
                        <th colSpan={6} className="py-2.5 px-3 bg-slate-950 text-white font-extrabold uppercase tracking-wider border-r border-slate-800">
                          WHAT &nbsp;•&nbsp; Requisition Information
                        </th>
                        {horizontalStages.map((stg, sIdx) => (
                          <th
                            key={`what-${sIdx}`}
                            colSpan={4}
                            className="py-2 px-3 bg-slate-800 text-indigo-100 font-bold text-center border-r border-slate-700 uppercase tracking-wide whitespace-nowrap text-[11px]"
                          >
                            {stg.name}
                          </th>
                        ))}
                      </tr>

                      {/* TIER 2: WHO */}
                      <tr className="border-b border-slate-700 text-[11px]">
                        <th colSpan={6} className="py-1.5 px-3 bg-slate-900 text-slate-300 font-bold uppercase tracking-wider border-r border-slate-800">
                          WHO &nbsp;•&nbsp; Responsible Assignee
                        </th>
                        {horizontalStages.map((stg, sIdx) => (
                          <th
                            key={`who-${sIdx}`}
                            colSpan={4}
                            className="py-1 px-3 bg-slate-850 text-emerald-200 font-semibold text-center border-r border-slate-700 whitespace-nowrap text-[11px]"
                          >
                            {stg.assignee}
                          </th>
                        ))}
                      </tr>

                      {/* TIER 3: HOW */}
                      <tr className="border-b border-slate-700 text-[10px]">
                        <th colSpan={6} className="py-1.5 px-3 bg-slate-900 text-slate-400 font-bold uppercase tracking-wider border-r border-slate-800">
                          HOW &nbsp;•&nbsp; Execution Channel / Tool
                        </th>
                        {horizontalStages.map((stg, sIdx) => (
                          <th
                            key={`how-${sIdx}`}
                            colSpan={4}
                            className="py-1 px-3 bg-slate-800 text-slate-300 font-medium text-center border-r border-slate-700 whitespace-nowrap text-[10px]"
                          >
                            {stg.how}
                          </th>
                        ))}
                      </tr>

                      {/* TIER 4: WHEN (Sub-columns) */}
                      <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 text-[11px] font-bold uppercase tracking-wider">
                        <th className="py-2 px-3 w-10 text-center border-r border-slate-200">
                          <input
                            type="checkbox"
                            checked={matrixSelectedIds.length === paginatedFlows.length && paginatedFlows.length > 0}
                            onChange={handleSelectAllMatrix}
                            className="rounded text-indigo-600 cursor-pointer"
                          />
                        </th>
                        <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Indent / PO No.</th>
                        <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Date</th>
                        <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap">Site</th>
                        <th className="py-2 px-3 border-r border-slate-200 whitespace-nowrap min-w-[200px]">Item Details / Vendor</th>
                        <th className="py-2 px-3 border-r border-slate-300 whitespace-nowrap">Overall Status</th>

                        {horizontalStages.map((_, sIdx) => (
                          <React.Fragment key={`when-cols-${sIdx}`}>
                            <th className="py-2 px-2.5 text-center bg-slate-50 text-slate-600 border-r border-slate-200 whitespace-nowrap min-w-[130px]">Planned</th>
                            <th className="py-2 px-2.5 text-center bg-slate-50 text-slate-600 border-r border-slate-200 whitespace-nowrap min-w-[130px]">Actual</th>
                            <th className="py-2 px-2 text-center bg-slate-50 text-slate-600 border-r border-slate-200 whitespace-nowrap min-w-[90px]">Status</th>
                            <th className="py-2 px-2.5 text-center bg-rose-50 text-rose-800 border-r-2 border-slate-300 whitespace-nowrap min-w-[100px]">Delay</th>
                          </React.Fragment>
                        ))}
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {paginatedFlows.length > 0 ? (
                        paginatedFlows.map((flow, fIdx) => {
                          const isChecked = matrixSelectedIds.includes(flow.id);
                          const refCode = flow.indentNo || flow.poNumber || flow.requisitionNumber || flow.flowId;
                          const dateStr = flow.indentDate || flow.createdAt?.slice(0, 10) || '—';

                          return (
                            <tr key={flow.id} className={`hover:bg-slate-50/80 transition-colors ${isChecked ? 'bg-indigo-50/40' : ''}`}>
                              {/* S.No checkbox */}
                              <td className="py-2.5 px-3 text-center border-r border-slate-200">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleMatrixId(flow.id)}
                                  className="rounded text-indigo-600 cursor-pointer"
                                />
                              </td>

                              {/* Indent No */}
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900 border-r border-slate-200 whitespace-nowrap">
                                <div className="flex items-center justify-between gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => onSelectFlow(flow)}
                                    className="text-indigo-600 hover:text-indigo-900 hover:underline cursor-pointer"
                                    title="View Detailed Audit Trail"
                                  >
                                    {refCode}
                                  </button>
                                  {canDelete && (
                                    confirmDeleteRecordId === flow.id ? (
                                      <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteRecord(flow.id)}
                                          className="px-1.5 py-0.2 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                        >
                                          Del
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteRecordId(null)}
                                          className="px-1.5 py-0.2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] cursor-pointer"
                                        >
                                          ✕
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteRecordId(flow.id)}
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
                              <td className="py-2.5 px-3 text-slate-600 border-r border-slate-200 whitespace-nowrap font-mono text-[11px]">
                                {dateStr}
                              </td>

                              {/* Site */}
                              <td className="py-2.5 px-3 font-semibold text-slate-800 border-r border-slate-200 whitespace-nowrap">
                                <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] font-bold">
                                  {flow.siteName}
                                </span>
                              </td>

                              {/* Item Details */}
                              <td className="py-2.5 px-3 text-slate-700 border-r border-slate-200 max-w-[240px] truncate" title={flow.remarks || flow.vendorName}>
                                {flow.remarks || flow.vendorName || (flow.poAmount ? `PO ₹${flow.poAmount.toLocaleString('en-IN')}` : 'General Requisition Items')}
                              </td>

                              {/* Overall Status */}
                              <td className="py-2.5 px-3 border-r-2 border-slate-300 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  flow.status === 'Completed'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {flow.status}
                                </span>
                              </td>

                              {/* Stage Cells: Planned | Actual | Status | Delay */}
                              {horizontalStages.map((_, sIdx) => {
                                const stageExec = flow.stages?.[sIdx];
                                const isCurrentActiveStage = flow.status !== 'Completed' && flow.currentStageIndex === sIdx;
                                const isStageWaitingForMe = isCurrentActiveStage && isFlowAwaitingUserAction(flow, currentUser);

                                const plannedStr = stageExec?.plannedDateTime || '—';
                                const actualStr = stageExec?.actualDateTime || '—';
                                const stageStatus = stageExec?.status || 'Pending';

                                // Calculate working hours delay taking shift, lunch break, and Sundays into account!
                                const delayRes = calculateWorkingHoursDelay(stageExec?.plannedDateTime, stageExec?.actualDateTime, shift);
                                const isDelayed = delayRes.isDelayed;
                                const formattedDelay = delayRes.formattedDelay;

                                return (
                                  <React.Fragment key={`stage-data-${flow.id}-${sIdx}`}>
                                    {/* Planned */}
                                    <td className="py-2 px-2 text-center border-r border-slate-200 font-mono text-[10px] text-slate-700 whitespace-nowrap">
                                      {plannedStr}
                                    </td>

                                    {/* Actual */}
                                    <td className="py-2 px-2 text-center border-r border-slate-200 font-mono text-[10px] text-slate-700 whitespace-nowrap">
                                      {actualStr}
                                    </td>

                                    {/* Status with quick action */}
                                    <td className="py-2 px-2 text-center border-r border-slate-200 whitespace-nowrap">
                                      <div className="flex items-center justify-center gap-1">
                                        <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                          stageStatus === 'Done'
                                            ? 'bg-emerald-100 text-emerald-800'
                                            : stageStatus === 'In Progress'
                                            ? 'bg-blue-100 text-blue-800'
                                            : stageStatus === 'Delayed'
                                            ? 'bg-rose-100 text-rose-800'
                                            : stageStatus === 'Skipped'
                                            ? 'bg-slate-200 text-slate-600'
                                            : 'bg-slate-100 text-slate-500'
                                        }`}>
                                          {stageStatus}
                                        </span>

                                        {isCurrentActiveStage && (isStageWaitingForMe || isSuperAdmin) && (
                                          <button
                                            type="button"
                                            onClick={() => onOpenStageAction ? onOpenStageAction(flow, sIdx) : handleAdvanceCurrentStage(flow)}
                                            className="p-1 hover:bg-indigo-100 rounded text-indigo-700 cursor-pointer"
                                            title="Advance this stage"
                                          >
                                            <CheckCircle2 className="w-3.5 h-3.5" />
                                          </button>
                                        )}
                                      </div>
                                    </td>

                                    {/* Delay: - hh:mm:ss */}
                                    <td className="py-2 px-2.5 text-center border-r-2 border-slate-300 font-mono whitespace-nowrap text-[11px]">
                                      {isDelayed ? (
                                        <span className="inline-block px-1.5 py-0.2 rounded font-bold text-rose-700 bg-rose-50 border border-rose-200">
                                          {formattedDelay}
                                        </span>
                                      ) : (
                                        <span className="inline-block px-1.5 py-0.2 rounded font-medium text-emerald-700 bg-emerald-50">
                                          00:00:00
                                        </span>
                                      )}
                                    </td>
                                  </React.Fragment>
                                );
                              })}
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={6 + horizontalStages.length * 4} className="py-12 text-center text-slate-500 text-xs">
                            No requisitions found matching current filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Footer */}
                <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 sm:pr-24">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Rows:</span>
                      <select
                        value={matrixPageSize}
                        onChange={(e) => {
                          setMatrixPageSize(Number(e.target.value));
                          setMatrixPage(1);
                        }}
                        className="px-2 py-0.5 font-bold bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    <div>
                      Showing <span className="font-bold text-slate-900">{totalFlows > 0 ? startIndex + 1 : 0}</span> to{' '}
                      <span className="font-bold text-slate-900">{Math.min(startIndex + matrixPageSize, totalFlows)}</span> of{' '}
                      <span className="font-bold text-slate-900">{totalFlows}</span> Requisitions
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={validPage <= 1}
                      onClick={() => setMatrixPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-semibold cursor-pointer"
                    >
                      ← Previous
                    </button>
                    <span className="px-2 font-mono font-bold text-slate-800">
                      Page {validPage} of {totalPages}
                    </span>
                    <button
                      disabled={validPage >= totalPages}
                      onClick={() => setMatrixPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-semibold cursor-pointer"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              /* 2. COMPACT REQUISITION LIST */
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead className="bg-white text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                      <tr>
                        <th className="py-2.5 px-3 w-8 text-center">
                          <input
                            type="checkbox"
                            checked={matrixSelectedIds.length === paginatedFlows.length && paginatedFlows.length > 0}
                            onChange={handleSelectAllMatrix}
                            className="rounded text-indigo-600 cursor-pointer"
                          />
                        </th>
                        <th className="py-2.5 px-3">Reference / Code</th>
                        <th className="py-2.5 px-3">Pipeline Type &amp; Site</th>
                        <th className="py-2.5 px-3">Active Stage &amp; Assignee</th>
                        <th className="py-2.5 px-3">Status</th>
                        <th className="py-2.5 px-3">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-slate-500" />
                            <span>Planned Date/Time</span>
                          </span>
                        </th>
                        <th className="py-2.5 px-3">
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                            <span>Actual Date/Time</span>
                          </span>
                        </th>
                        <th className="py-2.5 px-3">
                          <span className="flex items-center gap-1">
                            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                            <span>Delay Variance</span>
                          </span>
                        </th>
                        <th className="py-2.5 px-4 text-right">Quick Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {paginatedFlows.length > 0 ? (
                        paginatedFlows.map((flow) => {
                          const isChecked = matrixSelectedIds.includes(flow.id);
                          const curStage = flow.stages[Math.min(flow.currentStageIndex, Math.max(0, flow.stages.length - 1))];
                          const refCode = flow.flowType === 'CHECK_STOCK'
                            ? (flow.requisitionNumber ? `Check Stock #${flow.requisitionNumber}` : `Stock Check #${flow.indentNo}`)
                            : flow.flowType === 'PO_TO_PAYMENT'
                            ? (flow.poNumber ? `PO #${flow.poNumber}` : `PO #${flow.indentNo}`)
                            : `Indent #${flow.indentNo}`;

                          const isCompleted = flow.status === 'Completed';
                          const now = new Date();
                          const todayFormatted = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
                          const plannedStr = curStage?.plannedDateTime || `${flow.indentDate || todayFormatted} 11:00 AM`;
                          const actualStr = isCompleted
                            ? (flow.stages[flow.stages.length - 1]?.actualDateTime || curStage?.actualDateTime || `${todayFormatted} 12:00 PM`)
                            : (curStage?.actualDateTime || '—');

                          const flowDelayHrs = getFlowTotalDelay(flow);
                          const stageDelayHrs = getStageDelayHours(curStage, plannedStr);
                          const delayHrs = isCompleted ? flowDelayHrs : Math.max(flowDelayHrs, stageDelayHrs);
                          const isDelayActive = delayHrs > 0;
                          const delayText = formatDelayVariance(delayHrs);

                          const isMyCurFlow = isFlowAwaitingUserAction(flow, currentUser);

                          return (
                            <tr key={flow.id} className={`hover:bg-slate-50 transition-colors ${isChecked ? 'bg-indigo-50/50' : ''}`}>
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleToggleMatrixId(flow.id)}
                                  className="rounded text-indigo-600 cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                                <button
                                  type="button"
                                  onClick={() => onSelectFlow(flow)}
                                  className="text-slate-900 hover:text-indigo-600 hover:underline cursor-pointer font-bold text-left"
                                  title="Open Detailed Audit Trail"
                                >
                                  {refCode}
                                </button>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 block w-max">
                                  {flow.flowType.replace(/_/g, ' ')}
                                </span>
                                <span className="text-[11px] text-slate-500 font-medium">{flow.siteName}</span>
                              </td>
                              <td className="py-2.5 px-3">
                                <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                                  Stg {Math.min(flow.currentStageIndex + 1, flow.totalStages)}: {curStage?.stageName || 'Completed'}
                                </div>
                                <span className="text-[10px] text-slate-500 font-mono">Assignee: {curStage?.assignee || 'System'}</span>
                              </td>
                              <td className="py-2.5 px-3 whitespace-nowrap">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  flow.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                                }`}>
                                  {flow.status}
                                </span>
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-800 whitespace-nowrap">
                                {plannedStr}
                              </td>
                              <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                                {actualStr}
                              </td>
                              <td className="py-2.5 px-3 font-mono whitespace-nowrap text-xs">
                                {isDelayActive ? (
                                  <span className={`inline-block px-2 py-0.5 rounded font-bold ${
                                    isCompleted
                                      ? 'bg-rose-100 text-rose-800 border border-rose-200'
                                      : 'bg-amber-100 text-amber-800 border border-amber-300'
                                  }`}>
                                    {delayText}
                                  </span>
                                ) : (
                                  <span className="inline-block px-2 py-0.5 rounded font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                    00:00:00
                                  </span>
                                )}
                              </td>
                              <td className="py-2.5 px-4 text-right whitespace-nowrap">
                                <div className="flex items-center justify-end gap-1.5">
                                  {flow.status !== 'Completed' && (isMyCurFlow || isSuperAdmin) && (
                                    (() => {
                                      const activeCurStage = flow.stages[flow.currentStageIndex];
                                      const curStageHasApproval = activeCurStage?.fields?.some((f: any) => f.type === 'APPROVAL' || f.id === 'status' || f.label?.toLowerCase().includes('approval'));
                                      const curStageHasForm = !!(
                                        (activeCurStage?.fields && activeCurStage.fields.length > 0) ||
                                        activeCurStage?.how === 'IN-APP FORM' ||
                                        activeCurStage?.how === 'IN APP FORM'
                                      );

                                      return (
                                        <button
                                          onClick={() => onOpenStageAction ? onOpenStageAction(flow, flow.currentStageIndex) : handleAdvanceCurrentStage(flow)}
                                          className={`px-2.5 py-1 font-bold rounded text-[11px] transition-colors cursor-pointer border shadow-2xs flex items-center gap-1 ${
                                            curStageHasApproval
                                              ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                              : curStageHasForm
                                              ? 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                              : 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200'
                                          }`}
                                          title={isSuperAdmin && !isMyCurFlow ? 'Super Admin Action' : 'Action Stage'}
                                        >
                                          {curStageHasApproval ? (
                                            <>
                                              <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                              <span>Approve / Reject</span>
                                            </>
                                          ) : curStageHasForm ? (
                                            <>
                                              <FileText className="w-3 h-3 text-indigo-600" />
                                              <span>Fill Form</span>
                                            </>
                                          ) : (
                                            <span>Mark Done</span>
                                          )}
                                        </button>
                                      );
                                    })()
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => onSelectFlow(flow)}
                                    className="p-1.5 hover:bg-indigo-50 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                                    title="View Detailed Audit Trail"
                                  >
                                    <Eye className="w-4 h-4" />
                                  </button>
                                  {canDelete && (
                                    confirmDeleteRecordId === flow.id ? (
                                      <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                                        <span className="text-[10px] font-bold text-rose-700">Delete?</span>
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteRecord(flow.id)}
                                          className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                        >
                                          Yes
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setConfirmDeleteRecordId(null)}
                                          className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] font-medium cursor-pointer"
                                        >
                                          No
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setConfirmDeleteRecordId(flow.id)}
                                        className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-500 hover:text-rose-700 transition-colors cursor-pointer"
                                        title="Delete Record"
                                      >
                                        <Trash2 className="w-4 h-4" />
                                      </button>
                                    )
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })
                      ) : (
                        <tr>
                          <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                            No requisitions found matching current filter.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Pagination Bar */}
                <div className="p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 sm:pr-24">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="text-slate-500 font-medium">Rows:</span>
                      <select
                        value={matrixPageSize}
                        onChange={(e) => {
                          setMatrixPageSize(Number(e.target.value));
                          setMatrixPage(1);
                        }}
                        className="px-2 py-0.5 font-bold bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        <option value={10}>10</option>
                        <option value={25}>25</option>
                        <option value={50}>50</option>
                        <option value={100}>100</option>
                      </select>
                    </div>

                    <div>
                      Showing <span className="font-bold text-slate-900">{totalFlows > 0 ? startIndex + 1 : 0}</span> to{' '}
                      <span className="font-bold text-slate-900">{Math.min(startIndex + matrixPageSize, totalFlows)}</span> of{' '}
                      <span className="font-bold text-slate-900">{totalFlows}</span> Requisitions
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      disabled={validPage <= 1}
                      onClick={() => setMatrixPage((p) => Math.max(1, p - 1))}
                      className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-semibold cursor-pointer"
                    >
                      ← Previous
                    </button>
                    <span className="px-2 font-mono font-bold text-slate-800">
                      Page {validPage} of {totalPages}
                    </span>
                    <button
                      disabled={validPage >= totalPages}
                      onClick={() => setMatrixPage((p) => Math.min(totalPages, p + 1))}
                      className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-semibold cursor-pointer"
                    >
                      Next →
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      })()}

      {/* OPERATIONS KANBAN BOARD VIEW */}
      {viewMode === 'KANBAN' && (() => {
        const pendingCol = filteredFlows.filter(f => f.status !== 'Completed' && f.currentStageIndex === 0);
        const inProgressCol = filteredFlows.filter(f => f.status !== 'Completed' && f.currentStageIndex > 0 && f.priority !== 'Urgent');
        const bottleneckCol = filteredFlows.filter(f => f.status !== 'Completed' && (f.priority === 'Urgent' || getFlowTotalDelay(f) > 0 || f.stages.some(s => getStageDelayHours(s) > 0 || s.status === 'Delayed')));
        const completedCol = filteredFlows.filter(f => f.status === 'Completed');

        const renderKanbanCard = (flow: FmsInstance) => {
          const curStage = flow.stages[Math.min(flow.currentStageIndex, Math.max(0, flow.stages.length - 1))];
          const isPayment = flow.flowType === 'PO_TO_PAYMENT';
          const refCode = flow.flowType === 'CHECK_STOCK'
            ? (flow.requisitionNumber ? `Stock Check #${flow.requisitionNumber}` : `Stock Check #${flow.indentNo}`)
            : isPayment
            ? (flow.poNumber ? `PO #${flow.poNumber}` : `Accounts PO #${flow.indentNo}`)
            : `FMS #${flow.indentNo}`;

          const flowDelay = getFlowTotalDelay(flow);

          return (
            <div key={flow.id} className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2 hover:border-indigo-300 transition-all">
              <div className="flex items-start justify-between gap-1">
                <span className="font-mono font-bold text-slate-900 text-xs">{refCode}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  flow.priority === 'Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {flow.siteName}
                </span>
              </div>

              <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                {curStage?.stageName || 'Completed'}
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Assignee: <strong className="text-slate-700">{curStage?.assignee || 'System'}</strong></span>
                <span className="text-[10px] font-mono text-indigo-600 font-bold">Stg {Math.min(flow.currentStageIndex + 1, flow.totalStages)}/{flow.totalStages}</span>
              </div>

              {flowDelay > 0 && (
                <div className="flex items-center gap-1 text-[10px] font-mono font-bold text-amber-800 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded">
                  <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0" />
                  <span>Delay: {formatDelayVariance(flowDelay)}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  {flow.status !== 'Completed' && isFlowAwaitingUserAction(flow, currentUser) && (
                    <button
                      onClick={() => onOpenStageAction ? onOpenStageAction(flow, flow.currentStageIndex) : handleAdvanceCurrentStage(flow)}
                      className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded text-[10px] cursor-pointer"
                    >
                      Advance Step →
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => onSelectFlow(flow)}
                    className="px-2 py-0.5 text-slate-500 hover:text-slate-800 rounded text-[10px] font-semibold cursor-pointer"
                    title="View Detailed Audit Trail"
                  >
                    Detail
                  </button>
                </div>
                {canDelete && (
                  confirmDeleteRecordId === flow.id ? (
                    <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteRecord(flow.id)}
                        className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                      >
                        Del
                      </button>
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteRecordId(null)}
                        className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteRecordId(flow.id)}
                      className="p-1 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded transition-colors cursor-pointer"
                      title="Delete Record"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )
                )}
              </div>
            </div>
          );
        };

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Column 1: Initiated / Pending Start */}
            <div className="bg-slate-100/70 p-3 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between font-bold text-xs text-slate-700 px-1">
                <span className="flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Initiated / Stage 1</span>
                </span>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full font-mono font-bold text-[10px] shadow-2xs">{pendingCol.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {pendingCol.map(renderKanbanCard)}
                {pendingCol.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">No flows in Stage 1</div>}
              </div>
            </div>

            {/* Column 2: In Progress & Approvals */}
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200/60 space-y-3">
              <div className="flex items-center justify-between font-bold text-xs text-blue-900 px-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Active Progression</span>
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-mono font-bold text-[10px] shadow-2xs">{inProgressCol.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {inProgressCol.map(renderKanbanCard)}
                {inProgressCol.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">No active progressing flows</div>}
              </div>
            </div>

            {/* Column 3: Delayed / Urgent Bottlenecks */}
            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/70 space-y-3">
              <div className="flex items-center justify-between font-bold text-xs text-amber-900 px-1">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Bottlenecks / Urgent</span>
                </span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full font-mono font-bold text-[10px] shadow-2xs">{bottleneckCol.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {bottleneckCol.map(renderKanbanCard)}
                {bottleneckCol.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">No delayed bottlenecks</div>}
              </div>
            </div>

            {/* Column 4: Completed */}
            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/60 space-y-3">
              <div className="flex items-center justify-between font-bold text-xs text-emerald-900 px-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Completed Workflows</span>
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-mono font-bold text-[10px] shadow-2xs">{completedCol.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {completedCol.map(renderKanbanCard)}
                {completedCol.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">No completed flows yet</div>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* STANDARD CARD / FOCUS FEED VIEW (Default 2-Column Sidebar & Stage Stepper) */}
      {(viewMode === 'FOCUS_FEED' || viewMode === 'TIMELINE') && (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Flow list sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {viewScope === 'USER_ONLY' ? 'My Action Queue' : 'Flows Queue'} ({filteredFlows.length})
            </h3>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {pipelineTypeFilter === 'PO_TO_PAYMENT' ? 'Accounts Sheet' : pipelineTypeFilter === 'INDENT_PURCHASE' ? 'Purchase Sheet 1' : 'Multi-Dept'}
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredFlows.length > 0 ? (
              filteredFlows.map((flow) => {
                const isSelected = flow.id === activeFlow?.id;
                const currentStage = flow.stages[flow.currentStageIndex];
                const currentStageName = currentStage?.stageName || 'Completed';
                const isMyCurrentStage = isMyFlowAction(flow);
                const isPaymentFlow = flow.flowType === 'PO_TO_PAYMENT';
                const isStockFlow = flow.flowType === 'CHECK_STOCK';
                const isReceiveFlow = flow.flowType === 'SITE_RECEIVE';
                const isStockToSiteFlow = flow.flowType === 'STORE_TO_SITE_DISPATCH';
                const isInvoiceFlow = flow.flowType === 'ACCOUNTS_INVOICE_COLLECTION';
                const isHrFlow = flow.flowType === 'HR_ATTENDANCE_PAYMENT';
                const isBreakdownFlow = flow.flowType === 'BREAKDOWN_REPORTING';
                const isEqpFlow = flow.flowType === 'EQUIPMENT_PART_REPAIR';
                const isDprFlow = flow.flowType === 'DPR_REPORTING';
                const isDispatchFlow = flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' || flow.flowType === 'PAYMENT_TO_DISPATCH' || flow.flowType === 'STORE_TO_SITE_DISPATCH';

                return (
                  <div
                    key={flow.id}
                    onClick={() => setSelectedFlowId(flow.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? isPaymentFlow 
                          ? 'bg-purple-50/70 border-purple-300 shadow-xs ring-1 ring-purple-400' 
                          : isStockFlow
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-xs ring-1 ring-emerald-400'
                          : isReceiveFlow
                          ? 'bg-blue-50/70 border-blue-300 shadow-xs ring-1 ring-blue-400'
                          : isStockToSiteFlow
                          ? 'bg-cyan-50/70 border-cyan-300 shadow-xs ring-1 ring-cyan-400'
                          : isInvoiceFlow
                          ? 'bg-indigo-50/70 border-indigo-300 shadow-xs ring-1 ring-indigo-400'
                          : isHrFlow
                          ? 'bg-teal-50/70 border-teal-300 shadow-xs ring-1 ring-teal-400'
                          : isBreakdownFlow
                          ? 'bg-orange-50/70 border-orange-300 shadow-xs ring-1 ring-orange-400'
                          : isEqpFlow
                          ? 'bg-blue-50/70 border-blue-300 shadow-xs ring-1 ring-blue-400'
                          : isDprFlow
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-xs ring-1 ring-emerald-400'
                          : isDispatchFlow
                          ? 'bg-amber-50/70 border-amber-300 shadow-xs ring-1 ring-amber-400'
                          : 'bg-indigo-50/70 border-indigo-300 shadow-xs ring-1 ring-indigo-400'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            {isPaymentFlow 
                              ? (flow.poNumber || `PO #${flow.indentNo}`) 
                              : isStockFlow 
                              ? (flow.requisitionNumber || `Stock Check #${flow.indentNo}`)
                              : isReceiveFlow
                              ? `Site Receive #${flow.requisitionNumber || flow.indentNo}`
                              : isStockToSiteFlow
                              ? `Stock Dispatch #${flow.requisitionNumber || flow.indentNo}`
                              : isInvoiceFlow
                              ? (flow.poNumber ? `Invoice #${flow.poNumber}` : `Invoice #${flow.indentNo}`)
                              : isHrFlow
                              ? `Labour Att #${flow.indentNo}`
                              : isBreakdownFlow
                              ? `Breakdown: ${flow.machineName || flow.indentNo}`
                              : isEqpFlow
                              ? `Part Repair: ${flow.partEquipmentName || flow.indentNo}`
                              : isDprFlow
                              ? `DPR: ${flow.dprDate || flow.indentNo}`
                              : isDispatchFlow
                              ? (flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' ? `Dispatch Indent #${flow.indentNo}` : flow.poNumber ? `Dispatch PO #${flow.poNumber}` : `Dispatch #${flow.indentNo}`)
                              : `Indent #${flow.indentNo}`}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              isPaymentFlow
                                ? 'bg-purple-100 text-purple-800'
                                : isStockFlow
                                ? 'bg-emerald-100 text-emerald-800'
                                : isReceiveFlow
                                ? 'bg-blue-100 text-blue-800'
                                : isStockToSiteFlow
                                ? 'bg-cyan-100 text-cyan-800'
                                : isInvoiceFlow
                                ? 'bg-indigo-100 text-indigo-800'
                                : isHrFlow
                                ? 'bg-teal-100 text-teal-800'
                                : isBreakdownFlow
                                ? 'bg-orange-100 text-orange-800'
                                : isEqpFlow
                                ? 'bg-blue-100 text-blue-800'
                                : isDprFlow
                                ? 'bg-emerald-100 text-emerald-800'
                                : isDispatchFlow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isPaymentFlow ? 'Accounts' : isStockFlow ? 'Store / Stock' : isReceiveFlow ? 'Site Receive' : isStockToSiteFlow ? 'Stock Dispatch' : isInvoiceFlow ? 'Invoice' : isHrFlow ? 'HR Muster' : isBreakdownFlow ? 'Breakdown' : isEqpFlow ? 'Part Repair' : isDprFlow ? 'DPR' : isDispatchFlow ? 'Store Dispatch' : 'Purchase'}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              flow.priority === 'Urgent'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {flow.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          {isPaymentFlow || isInvoiceFlow ? (
                            <>
                              <span className="font-medium text-slate-700 truncate max-w-[120px]">{flow.vendorName || 'Vendor'}</span>
                              <span>•</span>
                              <span className={`font-semibold ${isInvoiceFlow ? 'text-indigo-700' : 'text-emerald-700'}`}>₹{flow.poAmount ? flow.poAmount.toLocaleString('en-IN') : '—'}</span>
                            </>
                          ) : isHrFlow ? (
                            <>
                              <span className="font-medium text-teal-800">{flow.totalLabourPresent || 0} Labours</span>
                              <span>•</span>
                              <span className="text-amber-700 font-semibold">{flow.totalOtHours || 0} hrs OT</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                            </>
                          ) : isBreakdownFlow ? (
                            <>
                              <span className="font-medium text-orange-800">{flow.machineIdNo || flow.machineName}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                            </>
                          ) : isEqpFlow ? (
                            <>
                              <span className="font-medium text-blue-800">{flow.partEquipmentName || flow.partSerialNo || 'Part'}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                            </>
                          ) : isDprFlow ? (
                            <>
                              <span className="font-medium text-emerald-800">{flow.dprPreparedBy || 'DPR'}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                            </>
                          ) : isReceiveFlow ? (
                            <>
                              <span className="font-medium text-blue-800">Req #{flow.requisitionNumber || flow.indentNo}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                            </>
                          ) : isDispatchFlow ? (
                            <>
                              <span className="font-medium text-slate-700 truncate max-w-[120px]">{flow.vendorName || 'Vendor'}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                              <span>•</span>
                              <span>{flow.indentDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          flow.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {flow.status}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-500 font-medium">Stage {Math.min(flow.currentStageIndex + 1, flow.totalStages)} of {flow.totalStages}</span>
                        <span className="text-indigo-700 font-semibold truncate max-w-[130px]">
                          {currentStageName}
                        </span>
                      </div>
                      {isMyCurrentStage && (
                        <div className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold mt-1 inline-flex items-center gap-1">
                          <Zap className="w-3 h-3 text-amber-600" /> Waiting for you ({currentStage?.assignee})
                        </div>
                      )}
                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isPaymentFlow ? 'bg-purple-600' : isStockFlow ? 'bg-emerald-600' : isDispatchFlow ? 'bg-amber-500' : 'bg-indigo-600'
                          }`}
                          style={{
                            width: `${(Math.min(flow.currentStageIndex, flow.totalStages) / flow.totalStages) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                <p>No workflows currently match the filter.</p>
                <button
                  onClick={() => {
                    setPipelineTypeFilter('ALL');
                    onToggleScope('ALL_ORG');
                  }}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Clear filters &amp; view all →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Visual Workflow of Selected Flow */}
        <div className="lg:col-span-3 space-y-4">
          {activeFlow ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900">
                      {activeFlow.flowType === 'CHECK_STOCK' ? (
                        <>Stock Check: {activeFlow.requisitionNumber || `Req #${activeFlow.indentNo}`} — {activeFlow.siteName}</>
                      ) : activeFlow.flowType === 'PO_TO_PAYMENT' ? (
                        <>PO: {activeFlow.poNumber || activeFlow.indentNo} — {activeFlow.vendorName || 'Accounts Payment Flow'}</>
                      ) : activeFlow.flowType === 'STORE_TO_SITE_DISPATCH' ? (
                        <>Stock to Site Dispatch: Req #{activeFlow.requisitionNumber || activeFlow.indentNo} — {activeFlow.siteName}</>
                      ) : activeFlow.flowType === 'PURCHASE_TO_STORE_DISPATCH' ? (
                        <>Purchase Store Dispatch: Indent #{activeFlow.indentNo} (Req #{activeFlow.requisitionNumber || activeFlow.indentNo}) — {activeFlow.siteName}</>
                      ) : activeFlow.flowType === 'PAYMENT_TO_DISPATCH' ? (
                        <>Dispatch: {activeFlow.poNumber || activeFlow.indentNo} — {activeFlow.vendorName || 'Material Dispatch'} ({activeFlow.siteName})</>
                      ) : activeFlow.flowType === 'SITE_RECEIVE' ? (
                        <>Site Receive: Requisition #{activeFlow.requisitionNumber || activeFlow.indentNo} — {activeFlow.siteName}</>
                      ) : activeFlow.flowType === 'ACCOUNTS_INVOICE_COLLECTION' ? (
                        <>Invoice Collection: PO #{activeFlow.poNumber || activeFlow.indentNo} — {activeFlow.vendorName || 'Accounts Invoice Collection'}</>
                      ) : activeFlow.flowType === 'HR_ATTENDANCE_PAYMENT' ? (
                        <>Labour Attendance &amp; Wages: #{activeFlow.indentNo} — {activeFlow.siteName} ({activeFlow.totalLabourPresent || 0} Labours)</>
                      ) : activeFlow.flowType === 'BREAKDOWN_REPORTING' ? (
                        <>Breakdown: {activeFlow.machineName || activeFlow.indentNo} ({activeFlow.machineIdNo || 'ID'}) — {activeFlow.siteName}</>
                      ) : activeFlow.flowType === 'EQUIPMENT_PART_REPAIR' ? (
                        <>Part Repair: {activeFlow.partEquipmentName || activeFlow.indentNo} — {activeFlow.siteName}</>
                      ) : activeFlow.flowType === 'DPR_REPORTING' ? (
                        <>DPR Report: {activeFlow.siteName} ({activeFlow.dprDate || activeFlow.indentDate}) — {activeFlow.dprPreparedBy || 'DPR'}</>
                      ) : (
                        <>Indent #{activeFlow.indentNo} — {activeFlow.siteName}</>
                      )}
                    </h2>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        activeFlow.flowType === 'CHECK_STOCK'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : activeFlow.flowType === 'PO_TO_PAYMENT'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : activeFlow.flowType === 'PURCHASE_TO_STORE_DISPATCH' || activeFlow.flowType === 'PAYMENT_TO_DISPATCH'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : activeFlow.flowType === 'SITE_RECEIVE'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : activeFlow.flowType === 'ACCOUNTS_INVOICE_COLLECTION'
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          : activeFlow.flowType === 'HR_ATTENDANCE_PAYMENT'
                          ? 'bg-teal-100 text-teal-800 border border-teal-300'
                          : activeFlow.flowType === 'BREAKDOWN_REPORTING'
                          ? 'bg-orange-100 text-orange-800 border border-orange-300'
                          : activeFlow.flowType === 'EQUIPMENT_PART_REPAIR'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : activeFlow.flowType === 'DPR_REPORTING'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                      }`}
                    >
                      {activeFlow.flowType === 'CHECK_STOCK'
                        ? 'Store FMS (Check Stock)'
                        : activeFlow.flowType === 'PO_TO_PAYMENT'
                        ? 'Accounts FMS (PO to Payment)'
                        : activeFlow.flowType === 'PURCHASE_TO_STORE_DISPATCH'
                        ? 'Purchase to Store to Dispatch'
                        : activeFlow.flowType === 'PAYMENT_TO_DISPATCH'
                        ? 'Dispatch FMS (Payment to Dispatch)'
                        : activeFlow.flowType === 'SITE_RECEIVE'
                        ? 'Site Receive FMS'
                        : activeFlow.flowType === 'ACCOUNTS_INVOICE_COLLECTION'
                        ? 'Accounts Invoice Collection FMS'
                        : activeFlow.flowType === 'HR_ATTENDANCE_PAYMENT'
                        ? 'HR Labour Attendance FMS'
                        : activeFlow.flowType === 'BREAKDOWN_REPORTING'
                        ? 'Machine Breakdown FMS'
                        : activeFlow.flowType === 'EQUIPMENT_PART_REPAIR'
                        ? 'Equipment Part Repair FMS'
                        : activeFlow.flowType === 'DPR_REPORTING'
                        ? 'Daily Progress Report FMS'
                        : 'Purchase FMS (Indent to PO)'}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        activeFlow.priority === 'Urgent'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {activeFlow.priority} Priority
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-1.5">
                    <span><strong>Flow ID:</strong> {activeFlow.flowId}</span>
                    {activeFlow.flowType === 'HR_ATTENDANCE_PAYMENT' ? (
                      <>
                        <span className="text-teal-800 font-bold">
                          <strong>Labour Count:</strong> {activeFlow.totalLabourPresent || 0} Present
                        </span>
                        <span className="text-amber-700 font-bold">
                          <strong>OT Hours:</strong> {activeFlow.totalOtHours || 0} hrs
                        </span>
                        <span><strong>Muster Date:</strong> {activeFlow.attendanceDate || activeFlow.indentDate}</span>
                      </>
                    ) : activeFlow.flowType === 'BREAKDOWN_REPORTING' ? (
                      <>
                        <span className="text-orange-800 font-bold">
                          <strong>Machine/Model:</strong> {activeFlow.machineName} ({activeFlow.machineMakeModel || 'Std'})
                        </span>
                        <span><strong>Ident No:</strong> {activeFlow.machineIdNo}</span>
                        {activeFlow.attendingMechanic && (
                          <span><strong>Mechanic:</strong> {activeFlow.attendingMechanic} {activeFlow.mechanicMobileNo ? `(${activeFlow.mechanicMobileNo})` : ''}</span>
                        )}
                        <span><strong>Date:</strong> {activeFlow.indentDate}</span>
                      </>
                    ) : activeFlow.flowType === 'EQUIPMENT_PART_REPAIR' ? (
                      <>
                        <span className="text-blue-800 font-bold">
                          <strong>Part / Equipment:</strong> {activeFlow.partEquipmentName || activeFlow.vehiclePlantMachineName}
                        </span>
                        <span><strong>S/N:</strong> {activeFlow.partSerialNo || '—'}</span>
                        <span className={`font-bold ${activeFlow.warrantyStatus === 'IN_WARRANTY' ? 'text-emerald-700' : 'text-slate-600'}`}>
                          <strong>Warranty:</strong> {activeFlow.warrantyStatus === 'IN_WARRANTY' ? 'Under Warranty' : 'Out of Warranty'}
                        </span>
                        <span><strong>Date:</strong> {activeFlow.indentDate}</span>
                      </>
                    ) : activeFlow.flowType === 'DPR_REPORTING' ? (
                      <>
                        <span className="text-emerald-800 font-bold">
                          <strong>DPR Date:</strong> {activeFlow.dprDate || activeFlow.indentDate}
                        </span>
                        <span><strong>Prepared By:</strong> {activeFlow.dprPreparedBy || 'DPR'}</span>
                        <span><strong>Site:</strong> {activeFlow.siteName}</span>
                      </>
                    ) : (
                      <>
                        {activeFlow.poAmount ? (
                          <span className="text-emerald-700 font-bold">
                            <strong>Amount:</strong> ₹{activeFlow.poAmount.toLocaleString('en-IN')}
                          </span>
                        ) : null}
                        {activeFlow.poAssignTo && (
                          <span><strong>Officer:</strong> {activeFlow.poAssignTo}</span>
                        )}
                        <span><strong>Date Registered:</strong> {activeFlow.indentDate || activeFlow.poDate}</span>
                      </>
                    )}
                    <span><strong>Site:</strong> {activeFlow.siteName}</span>
                    <span><strong>Total Delay:</strong> {activeFlow.totalDelayHours} hrs</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectFlow(activeFlow)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Audit Breakdown</span>
                  </button>
                  {canDelete && (
                    confirmDeleteRecordId === activeFlow.id ? (
                      <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
                        <span className="text-xs font-bold text-rose-700">Delete record?</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteRecord(activeFlow.id)}
                          className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold cursor-pointer"
                        >
                          Yes
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteRecordId(null)}
                          className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-medium cursor-pointer"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteRecordId(activeFlow.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                        title="Delete Record"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                        <span>Delete Record</span>
                      </button>
                    )
                  )}
                </div>
              </div>

              {/* End-to-End Supply Chain Progression Stepper */}
              <div className="mx-5 mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Organizational Workflow Pipeline</span>
                  <span className="text-[10px] font-normal text-slate-400">Step 1 (Stock) → Step 2 (Purchase) → Step 3 (Accounts) → Step 4 (Dispatch) → Step 5 (Site Receive)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  {/* Step 1: Check Stock */}
                  {(() => {
                    const isCurrent = activeFlow.flowType === 'CHECK_STOCK';
                    const matchingStock = flows.find(f => f.flowType === 'CHECK_STOCK' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo || f.id === activeFlow.id));
                    const isDone = matchingStock?.status === 'Completed';

                    return (
                      <div 
                        onClick={() => {
                          if (matchingStock && !isCurrent) {
                            setSelectedFlowId(matchingStock.id);
                            setPipelineTypeFilter('CHECK_STOCK');
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isCurrent
                            ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                            : matchingStock
                            ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                            : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <Boxes className="w-3 h-3 text-emerald-600" />
                            1. Stock Check
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isCurrent
                              ? 'bg-emerald-600 text-white'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : matchingStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isCurrent ? 'Viewing' : isDone ? 'Done' : matchingStock ? 'Active' : 'N/A'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          {matchingStock ? `Req #${matchingStock.requisitionNumber || matchingStock.indentNo}` : 'Store Check'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Step 2: Indent to PO */}
                  {(() => {
                    const isCurrent = activeFlow.flowType === 'INDENT_PURCHASE';
                    const matchingIndent = flows.find(f => f.flowType === 'INDENT_PURCHASE' && (f.linkedFlowId === activeFlow.flowId || f.indentNo === activeFlow.indentNo || f.id === activeFlow.id));
                    const isDone = matchingIndent?.status === 'Completed';

                    return (
                      <div 
                        onClick={() => {
                          if (matchingIndent && !isCurrent) {
                            setSelectedFlowId(matchingIndent.id);
                            setPipelineTypeFilter('INDENT_PURCHASE');
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isCurrent
                            ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400'
                            : matchingIndent
                            ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                            : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3 text-indigo-600" />
                            2. Indent to PO
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isCurrent
                              ? 'bg-indigo-600 text-white'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : matchingIndent
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isCurrent ? 'Viewing' : isDone ? 'Done' : matchingIndent ? 'Active' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          {matchingIndent ? `Indent #${matchingIndent.indentNo}` : 'Purchase'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Step 3: PO to Payment */}
                  {(() => {
                    const isCurrent = activeFlow.flowType === 'PO_TO_PAYMENT';
                    const matchingPayment = flows.find(f => f.flowType === 'PO_TO_PAYMENT' && (f.linkedFlowId === activeFlow.flowId || f.poNumber === activeFlow.poNumber || f.indentNo === activeFlow.indentNo || f.id === activeFlow.id));
                    const isDone = matchingPayment?.status === 'Completed';

                    return (
                      <div 
                        onClick={() => {
                          if (matchingPayment && !isCurrent) {
                            setSelectedFlowId(matchingPayment.id);
                            setPipelineTypeFilter('PO_TO_PAYMENT');
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isCurrent
                            ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-400'
                            : matchingPayment
                            ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                            : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-purple-600" />
                            3. PO to Payment
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isCurrent
                              ? 'bg-purple-600 text-white'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : matchingPayment
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isCurrent ? 'Viewing' : isDone ? 'Done' : matchingPayment ? 'Active' : 'Accounts'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          {matchingPayment ? (matchingPayment.poNumber || `PO #${matchingPayment.indentNo}`) : 'Accounts'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Step 4: Dispatch Flow (Stock to Site, Payment to Dispatch, or Purchase Store Dispatch) */}
                  {(() => {
                    const isCurrent = activeFlow.flowType === 'STORE_TO_SITE_DISPATCH' || activeFlow.flowType === 'PURCHASE_TO_STORE_DISPATCH' || activeFlow.flowType === 'PAYMENT_TO_DISPATCH';
                    const matchingDispatch = flows.find(
                      f => (f.flowType === 'STORE_TO_SITE_DISPATCH' || f.flowType === 'PURCHASE_TO_STORE_DISPATCH' || f.flowType === 'PAYMENT_TO_DISPATCH') && (
                        f.linkedFlowId === activeFlow.flowId ||
                        f.linkedFlowId === activeFlow.linkedFlowId ||
                        f.requisitionNumber === activeFlow.requisitionNumber ||
                        f.poNumber === activeFlow.poNumber ||
                        f.indentNo === activeFlow.indentNo ||
                        f.id === activeFlow.id
                      )
                    );
                    const isDone = matchingDispatch?.status === 'Completed';

                    return (
                      <div 
                        onClick={() => {
                          if (matchingDispatch && !isCurrent) {
                            setSelectedFlowId(matchingDispatch.id);
                            if (matchingDispatch.flowType === 'STORE_TO_SITE_DISPATCH' || matchingDispatch.flowType === 'PAYMENT_TO_DISPATCH' || matchingDispatch.flowType === 'PURCHASE_TO_STORE_DISPATCH') {
                              setPipelineTypeFilter(matchingDispatch.flowType);
                            }
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isCurrent
                            ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400'
                            : matchingDispatch
                            ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                            : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-amber-600" />
                            {matchingDispatch?.flowType === 'STORE_TO_SITE_DISPATCH' ? '4. Stock Dispatch' : matchingDispatch?.flowType === 'PAYMENT_TO_DISPATCH' ? '4. QC Dispatch' : '4. Dispatch'}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isCurrent
                              ? 'bg-amber-600 text-white'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : matchingDispatch
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isCurrent ? 'Viewing' : isDone ? 'Done' : matchingDispatch ? 'Active' : 'Transit'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          {matchingDispatch
                            ? matchingDispatch.flowType === 'STORE_TO_SITE_DISPATCH'
                              ? `Req #${matchingDispatch.requisitionNumber || matchingDispatch.indentNo} (9 Stg)`
                              : matchingDispatch.flowType === 'PAYMENT_TO_DISPATCH'
                              ? `PO #${matchingDispatch.poNumber || matchingDispatch.indentNo}`
                              : `Indent #${matchingDispatch.indentNo}`
                            : 'Dispatch'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Step 5: Site Receive */}
                  {(() => {
                    const isCurrent = activeFlow.flowType === 'SITE_RECEIVE';
                    const matchingReceive = flows.find(
                      f => f.flowType === 'SITE_RECEIVE' && (
                        f.requisitionNumber === activeFlow.requisitionNumber ||
                        f.indentNo === activeFlow.indentNo ||
                        f.linkedFlowId === activeFlow.flowId ||
                        f.linkedFlowId === activeFlow.linkedFlowId ||
                        f.id === activeFlow.id
                      )
                    );
                    const isDone = matchingReceive?.status === 'Completed';

                    return (
                      <div 
                        onClick={() => {
                          if (matchingReceive && !isCurrent) {
                            setSelectedFlowId(matchingReceive.id);
                            setPipelineTypeFilter('SITE_RECEIVE');
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isCurrent
                            ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400'
                            : matchingReceive
                            ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                            : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <PackageCheck className="w-3 h-3 text-blue-600" />
                            5. Site Receive
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : matchingReceive
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isCurrent ? 'Viewing' : isDone ? 'Done' : matchingReceive ? 'Active' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          {matchingReceive ? `Req #${matchingReceive.requisitionNumber || matchingReceive.indentNo} (10 Stg)` : 'Site Inward'}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Cross-linking banner for Check Stock flow if Indent flow or Stock Dispatch flow exists */}
              {activeFlow.flowType === 'CHECK_STOCK' && (
                (() => {
                  const linkedIndent = flows.find(f => f.linkedFlowId === activeFlow.flowId || (f.indentNo === activeFlow.indentNo && f.flowType === 'INDENT_PURCHASE'));
                  const linkedStockDispatch = flows.find(f => (f.linkedFlowId === activeFlow.flowId || f.indentNo === activeFlow.indentNo || f.requisitionNumber === activeFlow.requisitionNumber) && f.flowType === 'STORE_TO_SITE_DISPATCH');
                  
                  return (
                    <>
                      {linkedStockDispatch && (
                        <div className="mx-5 mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 text-xs text-cyan-950">
                            <Truck className="w-4 h-4 text-cyan-600 shrink-0" />
                            <div>
                              <span className="font-bold">Stock Available Dispatch Active (9 Stages): </span>
                              <span>Materials confirmed available in store. Direct Store to Site Dispatch workflow is active for Requisition #{activeFlow.requisitionNumber || activeFlow.indentNo}.</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedStockDispatch.id);
                              setPipelineTypeFilter('STORE_TO_SITE_DISPATCH');
                            }}
                            className="px-3 py-1 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1"
                          >
                            <span>Open Stock Dispatch Flow →</span>
                          </button>
                        </div>
                      )}

                      {linkedIndent && (
                        <div className="mx-5 mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 text-xs text-indigo-900">
                            <ShoppingCart className="w-4 h-4 text-indigo-600 shrink-0" />
                            <div>
                              <span className="font-bold">Purchase Dept Hand-off Active: </span>
                              <span>Material requisition verified in store. Indent to PO flow is active for Indent #{activeFlow.indentNo}.</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedIndent.id);
                              setPipelineTypeFilter('INDENT_PURCHASE');
                            }}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1"
                          >
                            <span>Open Purchase Indent Flow →</span>
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()
              )}

              {/* Cross-linking banner for Indent flow if preceding Check Stock flow exists */}
              {activeFlow.flowType === 'INDENT_PURCHASE' && (
                (() => {
                  const linkedStock = flows.find(f => f.flowId === activeFlow.linkedFlowId || (f.indentNo === activeFlow.indentNo && f.flowType === 'CHECK_STOCK'));
                  if (linkedStock) {
                    return (
                      <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-xs text-emerald-900">
                          <Boxes className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold">Preceding Store Verification: </span>
                            <span>Physical stock check completed at store (Requisition #{linkedStock.requisitionNumber || linkedStock.indentNo}).</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFlowId(linkedStock.id);
                            setPipelineTypeFilter('CHECK_STOCK');
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1"
                        >
                          <span>View Stock Check Flow →</span>
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              {/* Cross-linking banner if Indent flow has advance payment decision YES */}
              {activeFlow.flowType === 'INDENT_PURCHASE' && activeFlow.stages[9]?.decisionValue === 'Yes' && (
                <div className="mx-5 mt-4 p-3 bg-purple-50 border border-purple-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-purple-900">
                    <CreditCard className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <span className="font-bold">Accounts Hand-off Active: </span>
                      <span>Advance payment approved at Stage 10. Dossier transferred to Accounts Department (PO to Payment FMS).</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const payFlow = flows.find(f => f.linkedFlowId === activeFlow.flowId || (f.indentNo === activeFlow.indentNo && f.flowType === 'PO_TO_PAYMENT'));
                      if (payFlow) {
                        setSelectedFlowId(payFlow.id);
                        setPipelineTypeFilter('PO_TO_PAYMENT');
                      }
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs"
                  >
                    Open Accounts Payment Flow →
                  </button>
                </div>
              )}

              {/* Cross-linking banner for PO to Payment flow if originating Indent flow exists */}
              {activeFlow.flowType === 'PO_TO_PAYMENT' && (
                (() => {
                  const linkedIndent = flows.find(f => f.flowId === activeFlow.linkedFlowId || (f.indentNo === activeFlow.indentNo && f.flowType === 'INDENT_PURCHASE'));
                  if (linkedIndent) {
                    return (
                      <div className="mx-5 mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-xs text-indigo-900">
                          <ShoppingCart className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <span className="font-bold">Originated from Purchase Dept: </span>
                            <span>Payment requisition triggered from Indent #{activeFlow.indentNo}.</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFlowId(linkedIndent.id);
                            setPipelineTypeFilter('INDENT_PURCHASE');
                          }}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1"
                        >
                          <span>View Purchase Indent Flow →</span>
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              {/* Cross-linking banner for PO to Payment flow if linked Dispatch flow exists */}
              {activeFlow.flowType === 'PO_TO_PAYMENT' && (
                (() => {
                  const linkedDispatch = flows.find(f => f.flowType === 'PAYMENT_TO_DISPATCH' && (f.linkedFlowId === activeFlow.flowId || f.poNumber === activeFlow.poNumber || f.indentNo === activeFlow.indentNo));
                  if (linkedDispatch) {
                    return (
                      <div className="mx-5 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-xs text-amber-900">
                          <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <span className="font-bold">Dispatch Hand-off Active: </span>
                            <span>Payment details completed. Material receipt and site dispatch workflow is active for PO #{activeFlow.poNumber || activeFlow.indentNo}.</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFlowId(linkedDispatch.id);
                            setPipelineTypeFilter('PAYMENT_TO_DISPATCH');
                          }}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1"
                        >
                          <span>Open Dispatch Flow →</span>
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              {/* Cross-linking banner for Payment to Dispatch flow */}
              {activeFlow.flowType === 'PAYMENT_TO_DISPATCH' && (
                (() => {
                  const linkedPayment = flows.find(f => f.flowType === 'PO_TO_PAYMENT' && (f.flowId === activeFlow.linkedFlowId || f.poNumber === activeFlow.poNumber || f.indentNo === activeFlow.indentNo));
                  const linkedIndent = flows.find(f => f.flowType === 'INDENT_PURCHASE' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo));
                  return (
                    <div className="mx-5 mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-amber-950">
                        <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-bold">Payment to Dispatch FMS (7 Stages): </span>
                          <span>Material collection from vendor <strong>{activeFlow.vendorName || 'Authorized Vendor'}</strong>, inspection by Shyam Rao Sureshe, and site release to <strong>{activeFlow.siteName}</strong> via Google Form.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {linkedPayment && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedPayment.id);
                              setPipelineTypeFilter('PO_TO_PAYMENT');
                            }}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>View Payment Flow →</span>
                          </button>
                        )}
                        {linkedIndent && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedIndent.id);
                              setPipelineTypeFilter('INDENT_PURCHASE');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>View Indent Flow →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Cross-linking banner for Store to Site Dispatch (Stock Available) flow */}
              {activeFlow.flowType === 'STORE_TO_SITE_DISPATCH' && (
                (() => {
                  const linkedStock = flows.find(f => f.flowType === 'CHECK_STOCK' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo || f.requisitionNumber === activeFlow.requisitionNumber));
                  const linkedSiteReceive = flows.find(f => f.flowType === 'SITE_RECEIVE' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo || f.requisitionNumber === activeFlow.requisitionNumber));
                  return (
                    <div className="mx-5 mt-4 p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-cyan-950">
                        <Truck className="w-4 h-4 text-cyan-600 shrink-0" />
                        <div>
                          <span className="font-bold">Store to Site Dispatch FMS (Stock Available — 9 Stages): </span>
                          <span>Inventory collection &amp; vehicle transit managed by <strong>Store Manager Sumant (Siladehi) / Hemant (Bijetala)</strong>, E-Way Bill decision, and site receiving by Purchaser via Google Form.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {linkedStock && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedStock.id);
                              setPipelineTypeFilter('CHECK_STOCK');
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <Boxes className="w-3 h-3" />
                            <span>View Check Stock Flow →</span>
                          </button>
                        )}
                        {linkedSiteReceive && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedSiteReceive.id);
                              setPipelineTypeFilter('SITE_RECEIVE');
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <PackageCheck className="w-3 h-3" />
                            <span>View Site Receive Flow →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Cross-linking banner for Purchase to Store to Dispatch flow */}
              {activeFlow.flowType === 'PURCHASE_TO_STORE_DISPATCH' && (
                (() => {
                  const linkedPayment = flows.find(f => f.flowType === 'PO_TO_PAYMENT' && (f.flowId === activeFlow.linkedFlowId || f.poNumber === activeFlow.poNumber || f.indentNo === activeFlow.indentNo));
                  const linkedIndent = flows.find(f => f.flowType === 'INDENT_PURCHASE' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo));
                  return (
                    <div className="mx-5 mt-4 p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-teal-950">
                        <Truck className="w-4 h-4 text-teal-600 shrink-0" />
                        <div>
                          <span className="font-bold">Purchase to Store to Dispatch FMS (10 Stages): </span>
                          <span>Store receiving by <strong>Bramhanand Patel</strong>, verification &amp; challan by <strong>Shyam Rao Sureshe</strong>, vehicle booking, E-Way Bill decision, and site receiving confirmation.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {linkedPayment && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedPayment.id);
                              setPipelineTypeFilter('PO_TO_PAYMENT');
                            }}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>View Payment Flow →</span>
                          </button>
                        )}
                        {linkedIndent && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedIndent.id);
                              setPipelineTypeFilter('INDENT_PURCHASE');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>View Indent Flow →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Cross-linking banner for Site Receive flow */}
              {activeFlow.flowType === 'SITE_RECEIVE' && (
                (() => {
                  const linkedDispatch = flows.find(f => (f.flowType === 'PURCHASE_TO_STORE_DISPATCH' || f.flowType === 'PAYMENT_TO_DISPATCH') && (f.flowId === activeFlow.linkedFlowId || f.requisitionNumber === activeFlow.requisitionNumber || f.indentNo === activeFlow.indentNo));
                  const linkedIndent = flows.find(f => f.flowType === 'INDENT_PURCHASE' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo));
                  return (
                    <div className="mx-5 mt-4 p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-blue-950">
                        <PackageCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-bold">Site Receiving &amp; Inward Workflow (10 Stages): </span>
                          <span>Material receipt at <strong>{activeFlow.siteName}</strong> store, physical inspection for discrepancies, engineering verification, and digital inward logging via Google Form.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {linkedDispatch && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedDispatch.id);
                              if (linkedDispatch.flowType === 'PAYMENT_TO_DISPATCH' || linkedDispatch.flowType === 'PURCHASE_TO_STORE_DISPATCH') {
                                setPipelineTypeFilter(linkedDispatch.flowType);
                              } else {
                                setPipelineTypeFilter('ALL');
                              }
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <Truck className="w-3 h-3" />
                            <span>View Dispatch Flow →</span>
                          </button>
                        )}
                        {linkedIndent && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedIndent.id);
                              setPipelineTypeFilter('INDENT_PURCHASE');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>View Indent Flow →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Cross-linking banner for Accounts Invoice Collection flow */}
              {activeFlow.flowType === 'ACCOUNTS_INVOICE_COLLECTION' && (
                (() => {
                  const linkedPayment = flows.find(f => f.flowType === 'PO_TO_PAYMENT' && (f.flowId === activeFlow.linkedFlowId || f.poNumber === activeFlow.poNumber || f.indentNo === activeFlow.indentNo));
                  const linkedIndent = flows.find(f => f.flowType === 'INDENT_PURCHASE' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo));
                  return (
                    <div className="mx-5 mt-4 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-indigo-950">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <span className="font-bold">Accounts Invoice Collection FMS (7 Stages): </span>
                          <span>GST invoice intake &amp; calculation check by <strong>Byamkesh Kaiwartya</strong>, acceptability verification by <strong>Bramhanand Patel</strong>, EA authorization by <strong>Khushboo Sahu</strong>, ERP voucher approval, and physical archiving.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {linkedPayment && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedPayment.id);
                              setPipelineTypeFilter('PO_TO_PAYMENT');
                            }}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>View Payment Flow →</span>
                          </button>
                        )}
                        {linkedIndent && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedIndent.id);
                              setPipelineTypeFilter('INDENT_PURCHASE');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>View Indent Flow →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Stage View Scope Selector */}
              <div className="px-5 pt-4 pb-2 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Pipeline Stages Scope:
                  </span>
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg">
                    <button
                      onClick={() => setStageFilterMode('MY_STAGES')}
                      className={`px-3 py-1 text-xs rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                        stageFilterMode === 'MY_STAGES'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <User className="w-3 h-3" />
                      <span>Only My Stages ({myStagesInFlow.length})</span>
                    </button>
                    <button
                      onClick={() => setStageFilterMode('ALL_STAGES')}
                      className={`px-3 py-1 text-xs rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                        stageFilterMode === 'ALL_STAGES'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>All {activeFlow.totalStages} Stages</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  {stageFilterMode === 'MY_STAGES' ? (
                    <span className="text-indigo-800 font-medium">
                      Showing only stages belonging to <strong>{currentUser.name}</strong> ({currentUser.role})
                    </span>
                  ) : (
                    <span>Showing complete {activeFlow.totalStages}-stage organizational flow</span>
                  )}
                </div>
              </div>

              {/* Active stage actionable hero banner (ONLY IF WAITING ON CURRENT USER!) */}
              {activeFlow.status !== 'Completed' && activeFlow.stages[activeFlow.currentStageIndex] && (
                isCurrentStageWaitingForMe ? (
                  <div className="m-5 p-4 rounded-xl border bg-amber-50/80 border-amber-300 ring-1 ring-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white bg-amber-600 flex items-center gap-1 animate-pulse">
                          <Zap className="w-3 h-3 text-white" /> Your Action Required: Step {activeFlow.currentStageIndex + 1} / {activeFlow.totalStages}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {activeFlow.stages[activeFlow.currentStageIndex].stageName}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600">
                        <strong>Assigned to:</strong> You ({currentUser.name} — {currentUser.role}) • <strong>Channel:</strong> {activeFlow.stages[activeFlow.currentStageIndex].how}
                      </p>
                      {activeFlow.stages[activeFlow.currentStageIndex].plannedDateTime && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          Target Planned: {activeFlow.stages[activeFlow.currentStageIndex].plannedDateTime}
                        </p>
                      )}
                    </div>

                    {/* Actions for current step */}
                    <div className="flex flex-wrap items-center gap-2">
                      {(() => {
                        const activeStage = activeFlow.stages[activeFlow.currentStageIndex];
                        const hasApprovalField = activeStage?.fields?.some((f: any) => f.type === 'APPROVAL' || f.id === 'status' || f.label?.toLowerCase().includes('approval')) || currentStageDef?.fields?.some((f: any) => f.type === 'APPROVAL');
                        const hasInAppForm = !!(
                          (activeStage?.fields && activeStage.fields.length > 0) ||
                          (currentStageDef?.fields && currentStageDef.fields.length > 0) ||
                          activeStage?.how === 'IN-APP FORM' ||
                          activeStage?.how === 'IN APP FORM'
                        );

                        if (onOpenStageAction && hasInAppForm) {
                          return (
                            <button
                              onClick={() => onOpenStageAction(activeFlow, activeFlow.currentStageIndex)}
                              className={`flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white ${
                                hasApprovalField ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-indigo-600 hover:bg-indigo-700'
                              } rounded-lg shadow-2xs transition-colors cursor-pointer`}
                            >
                              {hasApprovalField ? (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Approve / Reject</span>
                                </>
                              ) : (
                                <>
                                  <FileText className="w-3.5 h-3.5" />
                                  <span>Fill Stage Form &amp; Advance</span>
                                </>
                              )}
                            </button>
                          );
                        }

                        if (currentStageDef?.hasYesNoDecision || activeStage?.logic?.gatewayType === 'CONDITIONAL_JUMP') {
                          return (
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => handleAdvanceCurrentStage(activeFlow, 'Yes')}
                                className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>
                                  {activeStage?.stageId === 'STG-STK-02'
                                    ? 'Yes (Purchase Required → Send Indent)'
                                    : activeStage?.stageId === 'STG-STK-04'
                                    ? 'Yes (Partial Stock Available → Dispatch Available)'
                                    : activeStage?.stageId === 'STG-PAY-01'
                                    ? 'Yes (Bank Account / NEFT Route)'
                                    : activeStage?.stageId === 'STG-PAY-02'
                                    ? 'Yes (Account Already Added)'
                                    : activeStage?.stageId === 'STG-SSD-04' || activeStage?.stageId === 'STG-PSD-05'
                                    ? 'Yes (E-Way Bill Required → Send Challan)'
                                    : activeStage?.stageId === 'STG-DISP-03'
                                    ? 'Yes (Material Acceptable → Skip Return & Dispatch)'
                                    : activeStage?.stageId === 'STG-DISP-05'
                                    ? 'Yes (Material Replaced → Dispatch)'
                                    : activeStage?.stageId === 'STG-REC-03'
                                    ? 'Yes (Discrepancy Found → Inform CSR Store)'
                                    : activeStage?.stageId === 'STG-REC-05'
                                    ? 'Yes (Acceptable → Get Technical Verification)'
                                    : activeStage?.stageId === 'STG-REC-09'
                                    ? 'Yes (Form Already Submitted)'
                                    : activeStage?.stageId === 'STG-INV-03'
                                    ? 'Yes (Invoice Acceptable → Get Approval)'
                                    : activeStage?.stageId === 'STG-HR-03'
                                    ? 'Yes (OT Logged → Prepare OT Sheet)'
                                    : activeStage?.stageId === 'STG-BRK-02'
                                    ? 'Yes (Service Engineer Required → Schedule Visit)'
                                    : activeStage?.stageId === 'STG-BRK-05'
                                    ? 'Yes (Can Repair at Site → Send Parts Indent)'
                                    : activeStage?.stageId === 'STG-EQP-03'
                                    ? 'Yes (Under Warranty → Send to OEM Center)'
                                    : activeStage?.stageId === 'STG-EQP-12'
                                    ? 'Yes (Trial Run Successful → Check Extra Charges)'
                                    : activeStage?.stageId === 'STG-EQP-13'
                                    ? 'Yes (Extra Charges Incurred → Get Approval)'
                                    : activeStage?.stageId === 'STG-10'
                                    ? 'Yes (Advance Payment Required)'
                                    : activeStage?.logic?.yesConditionLabel || 'Approve (YES)'}
                                </span>
                              </button>
                              <button
                                onClick={() => handleAdvanceCurrentStage(activeFlow, 'No')}
                                className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
                              >
                                <span>
                                  {activeStage?.stageId === 'STG-STK-02'
                                    ? 'No (Fulfilled from Store Stock → Dispatch)'
                                    : activeStage?.stageId === 'STG-STK-04'
                                    ? 'No (Zero Stock → 100% Purchase Needed)'
                                    : activeStage?.stageId === 'STG-PAY-01'
                                    ? 'No (Route via UPI QR Code)'
                                    : activeStage?.stageId === 'STG-PAY-02'
                                    ? 'No (Passbook Copy & Add Account)'
                                    : activeStage?.stageId === 'STG-SSD-04' || activeStage?.stageId === 'STG-PSD-05'
                                    ? 'No (E-Way Bill Not Required → Load Material)'
                                    : activeStage?.stageId === 'STG-DISP-03'
                                    ? 'No (Defective / Mismatch → Return to Vendor)'
                                    : activeStage?.stageId === 'STG-DISP-05'
                                    ? 'No (Not Replaced → Get Refund/Credit Note)'
                                    : activeStage?.stageId === 'STG-REC-03'
                                    ? 'No (No Discrepancy → Verify Material Acceptance)'
                                    : activeStage?.stageId === 'STG-REC-05'
                                    ? 'No (Rejected / Damaged → Return to Repair Store)'
                                    : activeStage?.stageId === 'STG-REC-09'
                                    ? 'No (Fill Google Form Now)'
                                    : activeStage?.stageId === 'STG-INV-03'
                                    ? 'No (Discrepancy / Error → Get Rectified)'
                                    : activeStage?.stageId === 'STG-HR-03'
                                    ? 'No (No OT → Skip to Attendance Sheet)'
                                    : activeStage?.stageId === 'STG-BRK-02'
                                    ? 'No (Mechanic Diagnostic Sufficient → Analysis Report)'
                                    : activeStage?.stageId === 'STG-BRK-05'
                                    ? 'No (Send to Offsite Workshop for Repair)'
                                    : activeStage?.stageId === 'STG-EQP-03'
                                    ? 'No (Out of Warranty → Proceed to Paid Repair Approval)'
                                    : activeStage?.stageId === 'STG-EQP-12'
                                    ? 'No (Trial Run Failed → Send for Rework)'
                                    : activeStage?.stageId === 'STG-EQP-13'
                                    ? 'No (No Extra Charges → Receive in Store)'
                                    : activeStage?.stageId === 'STG-10'
                                    ? 'No (Skip Stage 11 → Go to Stage 12)'
                                    : activeStage?.logic?.noConditionLabel || 'Reject / No'}
                                </span>
                              </button>
                            </div>
                          );
                        }

                        return (
                          <button
                            onClick={() => onOpenStageAction ? onOpenStageAction(activeFlow, activeFlow.currentStageIndex) : handleAdvanceCurrentStage(activeFlow)}
                            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>Mark Step Done &amp; Advance</span>
                          </button>
                        );
                      })()}
                    </div>
                  </div>
                ) : (
                  /* If stage belongs to someone else (e.g. Bramhanand Patel while Amanat is logged in) */
                  stageFilterMode === 'ALL_STAGES' ? (
                    <div className="m-5 p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div>
                          <span className="font-semibold text-slate-800">
                            Current Step {activeFlow.currentStageIndex + 1}: {activeFlow.stages[activeFlow.currentStageIndex].stageName}
                          </span>
                          <p className="text-[11px] text-slate-500">
                            Responsible: {activeFlow.stages[activeFlow.currentStageIndex].assignee} • Channel: {activeFlow.stages[activeFlow.currentStageIndex].how}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-200 text-slate-700">
                          Awaiting {activeFlow.stages[activeFlow.currentStageIndex].assignee}
                        </span>
                        {isSuperAdmin && (
                          <button
                            onClick={() => onOpenStageAction ? onOpenStageAction(activeFlow, activeFlow.currentStageIndex) : handleAdvanceCurrentStage(activeFlow)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors cursor-pointer"
                            title="Super Admin Override / Action"
                          >
                            {(() => {
                              const activeStage = activeFlow.stages[activeFlow.currentStageIndex];
                              const hasApprovalField = activeStage?.fields?.some((f: any) => f.type === 'APPROVAL' || f.id === 'status' || f.label?.toLowerCase().includes('approval')) || currentStageDef?.fields?.some((f: any) => f.type === 'APPROVAL');
                              const hasInAppForm = !!(
                                (activeStage?.fields && activeStage.fields.length > 0) ||
                                (currentStageDef?.fields && currentStageDef.fields.length > 0) ||
                                activeStage?.how === 'IN-APP FORM' ||
                                activeStage?.how === 'IN APP FORM'
                              );
                              if (hasApprovalField) {
                                return (
                                  <>
                                    <CheckCircle2 className="w-3.5 h-3.5" />
                                    <span>Approve / Reject</span>
                                  </>
                                );
                              }
                              if (hasInAppForm) {
                                return (
                                  <>
                                    <FileText className="w-3.5 h-3.5" />
                                    <span>Fill Form &amp; Advance</span>
                                  </>
                                );
                              }
                              return (
                                <>
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  <span>Mark Done &amp; Advance</span>
                                </>
                              );
                            })()}
                          </button>
                        )}
                      </div>
                    </div>
                  ) : null
                )
              )}

              {/* Stepper Timeline - Filtered to User Stages or All */}
              <div className="p-5 overflow-x-auto">
                {stagesToRender.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {stagesToRender.map(({ def, idx, exec: stageExec, isMine }) => {
                      const stg10Decision = activeFlow.stages.find((s) => s.stageId === 'STG-10')?.decisionValue;
                      const isStg11AndStg10SaidNo = def.stageId === 'STG-11' && stg10Decision === 'No';

                      const isSkipped = stageExec?.status === 'Skipped' || isStg11AndStg10SaidNo;
                      const isDone = !isSkipped && stageExec?.status === 'Done';
                      const isCurrent = !isSkipped && activeFlow.currentStageIndex === idx;

                      return (
                        <div key={def.stageId} className="relative group">
                          {/* Status Icon Indicator */}
                          <div
                            className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : isCurrent
                                ? 'bg-indigo-600 text-white animate-pulse'
                                : isSkipped
                                ? 'bg-slate-300 text-slate-600'
                                : 'bg-slate-100 text-slate-400 border border-slate-300'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : isSkipped ? (
                              '—'
                            ) : (
                              idx + 1
                            )}
                          </div>

                          {/* Stage Card */}
                          <div
                            className={`p-3.5 rounded-lg border transition-all ${
                              isCurrent
                                ? 'bg-white border-indigo-400 shadow-xs ring-1 ring-indigo-200'
                                : isDone
                                ? 'bg-emerald-50/30 border-emerald-200'
                                : isSkipped
                                ? 'bg-slate-50/60 border-slate-200 opacity-60'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">
                                    Stage {idx + 1}: {def.name}
                                  </span>
                                  {isMine && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                                      Your Stage
                                    </span>
                                  )}
                                  {def.isCheckpoint && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                      CHECK POINT
                                    </span>
                                  )}
                                  {stageExec?.decisionValue && (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                        stageExec.decisionValue === 'Yes'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-slate-200 text-slate-800'
                                      }`}
                                    >
                                      Decision: {stageExec.decisionValue}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {def.what}
                                </p>
                              </div>

                              <div className="text-right flex flex-col items-end gap-1">
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                    isDone
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isCurrent
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : isSkipped
                                      ? 'bg-slate-100 text-slate-500'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {stageExec?.status || 'Pending'}
                                </span>
                                {(() => {
                                  const stgDelay = getStageDelayHours(stageExec);
                                  if (stgDelay <= 0) return null;
                                  return (
                                    <span
                                      className={`text-[10px] font-mono font-bold px-1.5 py-0.2 rounded border ${
                                        isDone
                                          ? 'bg-red-50 text-red-700 border-red-200'
                                          : 'bg-amber-50 text-amber-800 border-amber-300 animate-pulse'
                                      }`}
                                    >
                                      Delay: {formatDelayVariance(stgDelay)}
                                    </span>
                                  );
                                })()}
                                <div className="text-[11px] text-slate-400">
                                  SLA: {def.slaHours} hr{def.slaHours > 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                              <div>
                                <span className="text-slate-400 font-medium">Who: </span>
                                <span className="font-medium text-slate-800">
                                  {stageExec?.assignee || def.whoDefaultAssignee}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">Channel: </span>
                                <span>{stageExec?.how || def.howChannel}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">Timestamps: </span>
                                {isSkipped ? (
                                  <span className="text-slate-500 italic">
                                    Skipped {def.stageId === 'STG-11' ? '(No advance required)' : ''}
                                  </span>
                                ) : stageExec?.actualDateTime ? (
                                  <span className="text-emerald-700 font-medium">
                                    Done: {stageExec.actualDateTime}
                                  </span>
                                ) : stageExec?.plannedDateTime ? (
                                  <span className="text-indigo-600 font-medium">
                                    Target: {stageExec.plannedDateTime}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                            </div>

                            {(stageExec?.notes || isStg11AndStg10SaidNo) && (
                              <div className="mt-2 text-[11px] bg-slate-50 p-2 rounded text-slate-600 italic">
                                Note: {isStg11AndStg10SaidNo ? 'Skipped: No advance payment required' : stageExec?.notes}
                              </div>
                            )}

                            {def.formUrl && (
                              <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                <ExternalLink className="w-3.5 h-3.5" />
                                <a href={def.formUrl} target="_blank" rel="noreferrer">
                                  Google Form: {def.formUrl}
                                </a>
                              </div>
                            )}

                            {isCurrent && activeFlow.status !== 'Completed' && (isMine || isSuperAdmin) && (
                              <div className="mt-3 pt-2.5 border-t border-slate-100 flex items-center justify-end">
                                <button
                                  onClick={() => onOpenStageAction ? onOpenStageAction(activeFlow, idx) : handleAdvanceCurrentStage(activeFlow)}
                                  className={`px-3 py-1.5 text-xs font-bold text-white rounded-lg shadow-2xs transition-colors cursor-pointer flex items-center gap-1.5 ${
                                    (stageExec?.fields?.some((f: any) => f.type === 'APPROVAL' || f.id === 'status' || f.label?.toLowerCase().includes('approval')) || def.fields?.some((f: any) => f.type === 'APPROVAL'))
                                      ? 'bg-emerald-600 hover:bg-emerald-700'
                                      : 'bg-indigo-600 hover:bg-indigo-700'
                                  }`}
                                >
                                  {(stageExec?.fields?.some((f: any) => f.type === 'APPROVAL' || f.id === 'status' || f.label?.toLowerCase().includes('approval')) || def.fields?.some((f: any) => f.type === 'APPROVAL')) ? (
                                    <>
                                      <CheckCircle2 className="w-3.5 h-3.5" />
                                      <span>Approve / Reject</span>
                                    </>
                                  ) : (
                                    <>
                                      <FileText className="w-3.5 h-3.5" />
                                      <span>Fill Stage Form &amp; Advance</span>
                                    </>
                                  )}
                                </button>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center text-slate-500 text-xs space-y-2">
                    <User className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700">
                      No procurement stages in this flow belong directly to {currentUser.name} ({currentUser.role}).
                    </p>
                    <p className="text-slate-400">
                      You can view the full 12 stages across other departments (Store, Purchase, Projects).
                    </p>
                    <button
                      onClick={() => setStageFilterMode('ALL_STAGES')}
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition-colors"
                    >
                      View All 12 Stages →
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <GitBranch className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium text-sm">No FMS Requisitions found</p>
              <button
                onClick={() => onToggleScope('ALL_ORG')}
                className="mt-3 text-xs text-indigo-600 font-semibold hover:underline"
              >
                View all organization indents →
              </button>
            </div>
          )}
        </div>
      </div>
      )}
      </>
      )}
    </div>
  );
};
