import React, { useState } from 'react';
import { 
  Calendar, 
  AlertTriangle, 
  Clock, 
  CheckCircle2, 
  CheckSquare, 
  ListTodo, 
  GitBranch, 
  ChevronRight, 
  ExternalLink, 
  RefreshCw,
  User,
  ArrowRight,
  Filter,
  Sparkles,
  Search,
  MessageSquare,
  Bell,
  ShieldAlert,
  Send,
  X,
  UserCheck,
  Eye,
  EyeOff,
  Info,
  FileText,
  Zap,
  Briefcase,
  Award,
  Table,
  Plus,
  Download
} from 'lucide-react';
import { downloadCsv } from '../../utils/csvExporter';
import { CustomSelect } from '../common/CustomSelect';
import { ChecklistItem, DelegationTask, FmsInstance, UserProfile, ProcessRemark, FmsStageDefinition, isUserSuperAdmin, isUserAdminOrSuperAdmin } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
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
import { isUserResponsibleForStage } from '../../services/stageAssignment';

export type StatCondition = 'ALL' | 'DUE_TODAY' | 'OVERDUE' | 'PENDING' | 'COMPLETED';

export function getDynamicGreeting(name: string): string {
  const hr = new Date().getHours();
  let greet = 'Good morning';
  if (hr >= 12 && hr < 17) {
    greet = 'Good afternoon';
  } else if (hr >= 17 || hr < 5) {
    greet = 'Good evening';
  }
  return `${greet}, ${name}`;
}

export interface UnifiedItem {
  id: string;
  sourceModule: 'FMS' | 'CHECKLIST' | 'DELEGATION';
  sourceId: string;
  title: string;
  subtitle: string;
  referenceCode: string;
  targetDateStr: string;
  plannedDateTimeStr?: string;
  actualDateTimeStr?: string;
  delayHours?: number;
  targetDateObj?: Date;
  status: string;
  isCompleted: boolean;
  isOverdue: boolean;
  isDueToday: boolean;
  isMine?: boolean;
  priority?: string;
  channelOrFreq?: string;
  rawItem: any;
  processRemarks?: ProcessRemark[];
  lastNudgeTimestamp?: string;
  assigneeName?: string;
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

export function getDelayHours(plannedStr: string | undefined, actualStr: string | undefined, isCompleted: boolean): number {
  const plannedDate = parseDateTimeStr(plannedStr);
  if (!plannedDate) return 0;
  let actualDate = parseDateTimeStr(actualStr);
  if (!actualDate) {
    if (isCompleted) return 0;
    actualDate = new Date();
  }
  const diffMs = actualDate.getTime() - plannedDate.getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60);
}

export function formatDelayVariance(delayHours: number): string {
  if (!delayHours || delayHours <= 0) return '—';
  const totalSeconds = Math.round(delayHours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const hStr = h.toString().padStart(2, '0');
  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');
  const baseTime = `${hStr}:${mStr}:${sStr}`;
  if (h >= 24) {
    const days = (delayHours / 24).toFixed(1);
    return `${baseTime} (${days} D)`;
  }
  return baseTime;
}

interface UnifiedWorkSummaryProps {
  currentUser: UserProfile;
  checklistItems: ChecklistItem[];
  delegationTasks: DelegationTask[];
  flows: FmsInstance[];
  onCompleteChecklist: (item: ChecklistItem) => void;
  onCompleteDelegation: (task: DelegationTask) => void;
  onAdvanceFmsStage: (flow: FmsInstance, decision?: 'Yes' | 'No') => void;
  onCompleteFmsStage?: (flow: FmsInstance, stageIndex: number, decision?: 'Yes' | 'No') => void;
  onReviseDelegation: (task: DelegationTask) => void;
  onSelectFmsDetail: (flow: FmsInstance) => void;
  onNavigateTab: (tab: any) => void;
  onAddProcessRemark?: (
    module: 'FMS' | 'CHECKLIST' | 'DELEGATION',
    targetId: string,
    category: ProcessRemark['category'],
    remarkText: string,
    stageIndex?: number
  ) => void;
  onNudgeItem?: (
    module: 'FMS' | 'CHECKLIST' | 'DELEGATION',
    targetId: string,
    stageIndex?: number
  ) => void;
  pcDeskActive?: boolean;
  onTogglePcDesk?: (active: boolean) => void;
  onCreateFmsFlow?: () => void;
  onOpenStageAction?: (flow: FmsInstance, stageIndex: number) => void;
}

export const UnifiedWorkSummary: React.FC<UnifiedWorkSummaryProps> = ({
  currentUser,
  checklistItems,
  delegationTasks,
  flows,
  onCompleteChecklist,
  onCompleteDelegation,
  onAdvanceFmsStage,
  onCompleteFmsStage,
  onReviseDelegation,
  onSelectFmsDetail,
  onNavigateTab,
  onAddProcessRemark,
  onNudgeItem,
  pcDeskActive: propPcDeskActive,
  onTogglePcDesk,
  onCreateFmsFlow,
  onOpenStageAction,
}) => {
  const [selectedCondition, setSelectedCondition] = useState<StatCondition>('DUE_TODAY');
  const [moduleFilter, setModuleFilter] = useState<'ALL' | 'FMS' | 'CHECKLIST' | 'DELEGATION'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');

  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const isAdminOrSuperAdmin = isUserAdminOrSuperAdmin(currentUser);
  const canCoordinate = isSuperAdmin || isAdminOrSuperAdmin;

  // Process Coordinator Desk Mode (Super Admin, Administrative User, or Process Coordinator)
  const isRituSahu = canCoordinate || currentUser.name.toLowerCase().includes('ritu') || currentUser.role.toLowerCase().includes('process coordinator');
  const [localPcDeskActive, setLocalPcDeskActive] = useState<boolean>(canCoordinate && isRituSahu);
  const pcDeskActive = canCoordinate ? (propPcDeskActive !== undefined ? propPcDeskActive : localPcDeskActive) : false;
  const setPcDeskActive = (val: boolean) => {
    if (!canCoordinate) return;
    if (onTogglePcDesk) onTogglePcDesk(val);
    else setLocalPcDeskActive(val);
  };

  // View Format Toggle: Standard Cards vs Enterprise Matrix (1000+ Scale Grid)
  const [viewFormat, setViewFormat] = useState<'CARD' | 'MATRIX'>('MATRIX');
  const [showStatCards, setShowStatCards] = useState<boolean>(true);
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);

  // Modal state for adding Process Coordinator Remark
  const [remarkModalTarget, setRemarkModalTarget] = useState<{
    item: UnifiedItem;
    module: 'FMS' | 'CHECKLIST' | 'DELEGATION';
    targetId: string;
    stageIndex?: number;
  } | null>(null);
  const [remarkCategory, setRemarkCategory] = useState<ProcessRemark['category']>('AWAITING_APPROVAL');
  const [remarkText, setRemarkText] = useState<string>('');

  // Modal state for Process Coordinator Task Context Inspection (Ritu Sahu View Action)
  const [viewDetailItem, setViewDetailItem] = useState<UnifiedItem | null>(null);

  // Dynamic current date (Today)
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayStr = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

  const parseDate = (dStr?: string): Date | undefined => {
    if (!dStr) return undefined;
    try {
      const cleaned = dStr.trim().split(' ')[0].split('T')[0];
      if (cleaned.includes('/')) {
        const parts = cleaned.split('/');
        if (parts.length === 3) {
          const p0 = parseInt(parts[0], 10);
          const p1 = parseInt(parts[1], 10);
          const p2 = parseInt(parts[2], 10);
          if (parts[2].length === 4 || p2 > 1000) {
            return new Date(p2, p1 - 1, p0);
          }
          if (parts[0].length === 4 || p0 > 1000) {
            return new Date(p0, p1 - 1, p2);
          }
          return new Date(p2, p1 - 1, p0);
        }
      } else if (cleaned.includes('-')) {
        const parts = cleaned.split('-');
        if (parts.length === 3) {
          const p0 = parseInt(parts[0], 10);
          const p1 = parseInt(parts[1], 10);
          const p2 = parseInt(parts[2], 10);
          if (parts[0].length === 4 || p0 > 1000) {
            return new Date(p0, p1 - 1, p2);
          }
          return new Date(p2, p1 - 1, p0);
        }
      }
      const direct = new Date(dStr);
      if (!isNaN(direct.getTime())) {
        return direct;
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  // Helpers for user matching
  const isDirectlyAssignedChecklist = (c: ChecklistItem) => {
    const curName = currentUser.name.toLowerCase();
    const curEmail = currentUser.email.toLowerCase();
    return c.email.toLowerCase() === curEmail ||
           c.name.toLowerCase().includes(curName) ||
           (currentUser.phone ? c.name.includes(currentUser.phone) : false);
  };

  const isDirectlyAssignedDelegation = (d: DelegationTask) => {
    const curName = currentUser.name.toLowerCase();
    return d.name.toLowerCase().includes(curName) ||
           d.rolePhone.toLowerCase().includes(curName) ||
           (currentUser.phone ? d.rolePhone.includes(currentUser.phone) : false);
  };

  const isDirectlyAssignedFms = (stageDef: any, stageExec?: any) => {
    return isUserResponsibleForStage(stageDef, stageExec, currentUser);
  };

  const isMineChecklist = (c: ChecklistItem) => {
    if (pcDeskActive || isAdminOrSuperAdmin) return true; // Super Admin & Administrative User (2nd Owner) see ALL tasks
    return isDirectlyAssignedChecklist(c);
  };

  const isMineDelegation = (d: DelegationTask) => {
    if (pcDeskActive || isAdminOrSuperAdmin) return true; // Super Admin & Administrative User (2nd Owner) see ALL tasks
    return isDirectlyAssignedDelegation(d);
  };

  const isMineFmsStage = (stageDef: any, stageExec?: any) => {
    if (pcDeskActive || isAdminOrSuperAdmin) return true; // Super Admin & Administrative User (2nd Owner) see ALL active stages
    return isDirectlyAssignedFms(stageDef, stageExec);
  };

  // Build Unified Items List
  const unifiedItems: UnifiedItem[] = [];

  // A. Checklists
  checklistItems.filter(isMineChecklist).forEach((chk) => {
    const isCompleted = chk.status === 'Done';
    const dateObj = parseDate(chk.plannedDate);
    let isDueToday = false;
    let isOverdue = false;

    if (dateObj) {
      dateObj.setHours(0, 0, 0, 0);
      isDueToday = dateObj.getTime() === today.getTime();
      isOverdue = !isCompleted && dateObj.getTime() < today.getTime();
    }

    unifiedItems.push({
      id: `unified-chk-${chk.id}`,
      sourceModule: 'CHECKLIST',
      sourceId: chk.id,
      referenceCode: `CHK #${chk.taskId}`,
      title: chk.task,
      subtitle: `${chk.department} • Assignee: ${chk.name} (${chk.email}) • Freq: ${chk.frequency === 'W' ? 'Weekly' : chk.frequency === 'M' ? 'Monthly' : 'Daily'}`,
      targetDateStr: chk.plannedDate,
      plannedDateTimeStr: chk.plannedDate ? `${chk.plannedDate} 10:00 AM` : '—',
      actualDateTimeStr: isCompleted ? (chk.actualDate || `${todayStr} 04:30 PM`) : '—',
      delayHours: getDelayHours(chk.plannedDate ? `${chk.plannedDate} 10:00 AM` : undefined, isCompleted ? (chk.actualDate || `${todayStr} 04:30 PM`) : undefined, isCompleted),
      targetDateObj: dateObj,
      status: chk.status,
      isCompleted,
      isOverdue,
      isDueToday,
      isMine: isDirectlyAssignedChecklist(chk),
      channelOrFreq: chk.frequency,
      rawItem: chk,
      processRemarks: chk.processRemarks || [],
      lastNudgeTimestamp: chk.lastNudgeTimestamp,
      assigneeName: chk.name,
    });
  });

  // B. Delegated Tasks
  delegationTasks.filter(isMineDelegation).forEach((del) => {
    const isCompleted = del.status === 'Completed';
    const dateObj = parseDate(del.latestRevision || del.firstDate);
    let isDueToday = false;
    let isOverdue = false;

    if (dateObj) {
      dateObj.setHours(0, 0, 0, 0);
      isDueToday = dateObj.getTime() === today.getTime();
      isOverdue = !isCompleted && dateObj.getTime() < today.getTime();
    }

    unifiedItems.push({
      id: `unified-del-${del.id}`,
      sourceModule: 'DELEGATION',
      sourceId: del.id,
      referenceCode: `TASK #${del.taskId}`,
      title: del.task,
      subtitle: `Delegated Task • Assignee: ${del.name} (${del.rolePhone}) • Revisions: ${del.totalRevisions}`,
      targetDateStr: del.latestRevision,
      plannedDateTimeStr: del.latestRevision ? `${del.latestRevision} 05:00 PM` : '—',
      actualDateTimeStr: isCompleted ? (del.completedAt || `${todayStr} 05:00 PM`) : '—',
      delayHours: getDelayHours(del.latestRevision ? `${del.latestRevision} 05:00 PM` : undefined, isCompleted ? (del.completedAt || `${todayStr} 05:00 PM`) : undefined, isCompleted),
      targetDateObj: dateObj,
      status: del.status,
      isCompleted,
      isOverdue,
      isDueToday,
      isMine: isDirectlyAssignedDelegation(del),
      priority: del.priority,
      rawItem: del,
      processRemarks: del.processRemarks || [],
      lastNudgeTimestamp: del.lastNudgeTimestamp,
      assigneeName: del.name,
    });
  });

  // C. FMS Stages
  flows.forEach((flow) => {
    const customTemplate = flow.customTemplateId
      ? storageAdapter.getAllMasterTemplates().find((t) => t.id === flow.customTemplateId || t.templateKey === flow.flowType)
      : storageAdapter.getAllMasterTemplates().find((t) => t.templateKey === flow.flowType);

    const stageDefs: FmsStageDefinition[] = customTemplate
      ? customTemplate.stages.map((stg, sIdx) => ({
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
      : flow.flowType === 'CHECK_STOCK'
      ? FMS_CHECK_STOCK_STAGES
      : flow.flowType === 'BENEFICIARY_APPROVAL'
      ? FMS_BENEFICIARY_APPROVAL_STAGES
      : flow.flowType === 'PO_TO_PAYMENT'
      ? FMS_PO_PAYMENT_STAGES
      : flow.flowType === 'PURCHASE_TO_STORE_DISPATCH'
      ? FMS_PURCHASE_TO_STORE_DISPATCH_STAGES
      : flow.flowType === 'STORE_TO_SITE_DISPATCH'
      ? FMS_STORE_TO_SITE_DISPATCH_STAGES
      : flow.flowType === 'PAYMENT_TO_DISPATCH'
      ? FMS_PAYMENT_TO_DISPATCH_STAGES
      : flow.flowType === 'SITE_RECEIVE'
      ? FMS_SITE_RECEIVE_STAGES
      : flow.flowType === 'ACCOUNTS_INVOICE_COLLECTION'
      ? FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES
      : flow.flowType === 'HR_ATTENDANCE_PAYMENT'
      ? FMS_HR_ATTENDANCE_PAYMENT_STAGES
      : flow.flowType === 'BREAKDOWN_REPORTING'
      ? FMS_BREAKDOWN_REPORTING_STAGES
      : flow.flowType === 'EQUIPMENT_PART_REPAIR'
      ? FMS_EQUIPMENT_PART_REPAIR_STAGES
      : flow.flowType === 'DPR_REPORTING'
      ? FMS_DPR_REPORTING_STAGES
      : FMS_STANDARD_PURCHASE_STAGES;

    flow.stages.forEach((stage, idx) => {
      const def = stageDefs[idx] || {
        stageId: stage.stageId,
        stageNumber: idx + 1,
        name: stage.stageName,
        what: stage.stageName,
        whoRole: stage.assignee,
        whoDefaultAssignee: stage.assignee,
        howChannel: stage.how,
        slaHours: 4,
        isCheckpoint: stage.logic?.gatewayType === 'CONDITIONAL_JUMP',
        hasYesNoDecision: stage.logic?.gatewayType === 'CONDITIONAL_JUMP',
        fields: stage.fields,
      };
      if (!def) return;

      // In Process Coordinator Desk mode, include all stages across flows; in User mode, include user-assigned stages
      const isRelevantForPc = pcDeskActive
        ? (stage.status !== 'Skipped')
        : isMineFmsStage(def, stage);

      if (isRelevantForPc) {
        const isCompleted = stage.status === 'Done' || stage.status === 'Skipped';
        const isCurrentActiveStage = !isCompleted && flow.status === 'In Progress' && idx === flow.currentStageIndex;
        const plannedDateTimeStr = stage.plannedDateTime
          || (flow.indentDate ? `${flow.indentDate} 11:00 AM` : undefined)
          || (flow.poDate ? `${flow.poDate} 11:00 AM` : undefined)
          || (flow.dprDate ? `${flow.dprDate} 11:00 AM` : undefined)
          || `${todayStr} 11:00 AM`;

        const dateObj = parseDate(plannedDateTimeStr);
        let isDueToday = false;
        let isOverdue = false;

        if (dateObj) {
          dateObj.setHours(0, 0, 0, 0);
          const diffDays = Math.round((dateObj.getTime() - today.getTime()) / 86400000);
          // Due today if target date is today, OR if it's the current active stage awaiting action within 24h
          isDueToday = diffDays === 0 || (isCurrentActiveStage && diffDays <= 1);
          isOverdue = !isCompleted && dateObj.getTime() < today.getTime();
        } else if (isCurrentActiveStage) {
          isDueToday = true;
        }

        const refCode = flow.flowType === 'CHECK_STOCK'
          ? (flow.requisitionNumber ? `Check Stock #${flow.requisitionNumber}` : `Stock Check #${flow.indentNo}`)
          : flow.flowType === 'PO_TO_PAYMENT'
          ? (flow.poNumber ? `PO #${flow.poNumber}` : `Accounts PO #${flow.indentNo}`)
          : `FMS #${flow.indentNo}`;

        const stageDelay = (typeof stage.timeDelayHours === 'number' && stage.timeDelayHours > 0)
          ? stage.timeDelayHours
          : (typeof stage.delayHours === 'number' && stage.delayHours > 0)
          ? stage.delayHours
          : getDelayHours(plannedDateTimeStr, stage.actualDateTime, isCompleted);

        unifiedItems.push({
          id: `unified-fms-${flow.id}-stg-${idx}`,
          sourceModule: 'FMS',
          sourceId: flow.id,
          referenceCode: `${refCode} (Stg ${idx + 1})`,
          title: `${stage.stageName} — ${flow.siteName} Site`,
          subtitle: `FMS Flow: ${flow.flowId} • Role: ${def.whoRole} • Assignee: ${stage.assignee || def.whoDefaultAssignee}`,
          targetDateStr: stage.plannedDateTime || flow.indentDate || flow.poDate || flow.dprDate || todayStr,
          plannedDateTimeStr,
          actualDateTimeStr: stage.actualDateTime || (isCompleted ? `${todayStr} 12:00 PM` : '—'),
          delayHours: stageDelay,
          targetDateObj: dateObj,
          status: stage.status,
          isCompleted,
          isOverdue,
          isDueToday,
          isMine: isDirectlyAssignedFms(def, stage),
          priority: flow.priority,
          channelOrFreq: def.howChannel,
          rawItem: { flow, stage, stageIndex: idx, def },
          processRemarks: stage.processRemarks || [],
          lastNudgeTimestamp: stage.lastNudgeTimestamp,
          assigneeName: stage.assignee || def.whoDefaultAssignee,
        });
      }
    });
  });

  // 3. Count matching items for the 4 Stat Cards
  const dueTodayItems = unifiedItems.filter((i) => !i.isCompleted && i.isDueToday);
  const overdueItems = unifiedItems.filter((i) => !i.isCompleted && i.isOverdue);
  const pendingItems = unifiedItems.filter((i) => !i.isCompleted);
  const completedItems = unifiedItems.filter((i) => i.isCompleted);

  // 4. Filter list by selected condition
  let conditionFiltered = unifiedItems;
  if (selectedCondition === 'DUE_TODAY') {
    conditionFiltered = dueTodayItems;
  } else if (selectedCondition === 'OVERDUE') {
    conditionFiltered = overdueItems;
  } else if (selectedCondition === 'PENDING') {
    conditionFiltered = pendingItems;
  } else if (selectedCondition === 'COMPLETED') {
    conditionFiltered = completedItems;
  }

  // 5. Filter by module & search
  const displayedItems = conditionFiltered.filter((item) => {
    if (moduleFilter !== 'ALL' && item.sourceModule !== moduleFilter) return false;
    if (assigneeFilter !== 'ALL' && item.assigneeName) {
      if (!item.assigneeName.toLowerCase().includes(assigneeFilter.toLowerCase())) return false;
    }
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchRef = item.referenceCode.toLowerCase().includes(q);
      const matchSub = item.subtitle.toLowerCase().includes(q);
      const matchAssignee = item.assigneeName?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchRef && !matchSub && !matchAssignee) return false;
    }
    return true;
  });

  // Pagination Math for 1000+ Scale Operations
  const totalItems = displayedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedItems = displayedItems.slice(startIndex, startIndex + pageSize);

  const isItemActionable = (item: UnifiedItem): boolean => {
    if (!item.isMine || item.isCompleted) return false;
    if (item.sourceModule === 'CHECKLIST') {
      return item.isDueToday || item.isOverdue;
    }
    if (item.sourceModule === 'DELEGATION') return true;
    if (item.sourceModule === 'FMS') {
      const { flow, stageIndex } = item.rawItem;
      // FMS stage can ONLY be actioned if flow is in progress AND this is the current active stage
      return flow.status === 'In Progress' && stageIndex === flow.currentStageIndex;
    }
    return false;
  };

  const handleSelectAllBatch = () => {
    const selectable = paginatedItems.filter(isItemActionable);
    if (selectedBatchIds.length === selectable.length && selectable.length > 0) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(selectable.map((i) => i.id));
    }
  };

  const handleToggleBatchId = (id: string) => {
    setSelectedBatchIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleExecuteBatchApprove = () => {
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    const formattedDateTime = now.toLocaleString('en-GB');

    paginatedItems.forEach((item) => {
      if (selectedBatchIds.includes(item.id) && isItemActionable(item)) {
        if (item.sourceModule === 'CHECKLIST') {
          onCompleteChecklist({
            ...item.rawItem,
            status: 'Done',
            actualDate: formattedDate,
            updatedAt: formattedDateTime,
          });
        } else if (item.sourceModule === 'DELEGATION') {
          onCompleteDelegation({
            ...item.rawItem,
            status: 'Completed',
            completedAt: formattedDateTime,
          });
        } else if (item.sourceModule === 'FMS') {
          if (onCompleteFmsStage) {
            onCompleteFmsStage(item.rawItem.flow, item.rawItem.stageIndex);
          } else {
            onAdvanceFmsStage(item.rawItem.flow);
          }
        }
      }
    });
    setSelectedBatchIds([]);
  };

  const handleExportFilteredCsv = () => {
    const headers = [
      'Reference Code',
      'Module',
      'Title / Description',
      'Subtitle / Context',
      'Target / Planned Date',
      'Actual Date',
      'Delay Hours',
      'Status',
      'Assignee'
    ];

    const rows = displayedItems.map((i) => [
      i.referenceCode,
      i.sourceModule,
      i.title,
      i.subtitle,
      i.plannedDateTimeStr || i.targetDateStr,
      i.actualDateTimeStr || '—',
      i.delayHours || 0,
      i.status,
      i.assigneeName || '—'
    ]);

    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`MyWork_Summary_Filtered_Export_${timestamp}.csv`, headers, rows);
  };

  const renderItemQuickActions = (item: UnifiedItem, isMobile = false) => {
    // 1. CHECKLIST
    if (item.sourceModule === 'CHECKLIST') {
      if (!item.isMine) return null;
      if (item.isCompleted) {
        return (
          <button
            onClick={() => {
              const now = new Date();
              onCompleteChecklist({
                ...item.rawItem,
                status: 'Pending',
                actualDate: undefined,
                updatedAt: now.toLocaleString('en-GB')
              });
            }}
            className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded transition-colors cursor-pointer`}
          >
            Reopen
          </button>
        );
      }
      if (item.isDueToday || item.isOverdue) {
        return (
          <button
            onClick={() => {
              const now = new Date();
              const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
              onCompleteChecklist({
                ...item.rawItem,
                status: 'Done',
                actualDate: formattedDate,
                updatedAt: now.toLocaleString('en-GB')
              });
            }}
            className={`${isMobile ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded transition-colors cursor-pointer flex items-center gap-1 border border-emerald-200`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark Done</span>
          </button>
        );
      }
      return (
        <span className="text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-50 border border-slate-200 rounded">
          Scheduled {item.plannedDateTimeStr?.split(' ')[0] || item.targetDateStr}
        </span>
      );
    }

    // 2. DELEGATION
    if (item.sourceModule === 'DELEGATION') {
      if (!item.isMine) return null;
      return (
        <div className="flex items-center gap-1">
          <button
            onClick={() => {
              const now = new Date();
              const formattedDateTime = now.toLocaleString('en-GB');
              const isDone = item.isCompleted;
              onCompleteDelegation({
                ...item.rawItem,
                status: isDone ? 'Pending' : 'Completed',
                completedAt: isDone ? undefined : formattedDateTime
              });
            }}
            className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-[11px]'} bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded transition-colors cursor-pointer border border-emerald-200`}
          >
            {item.isCompleted ? 'Reopen' : 'Complete'}
          </button>
          <button
            onClick={() => onReviseDelegation(item.rawItem)}
            className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-[11px]'} bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded transition-colors cursor-pointer border border-indigo-200`}
          >
            Revise
          </button>
        </div>
      );
    }

    // 3. FMS
    if (item.sourceModule === 'FMS') {
      if (!isItemActionable(item)) {
        return !item.isCompleted && item.rawItem.flow.status === 'In Progress' ? (
          <span className="text-[10px] text-slate-400 font-mono italic pr-1">
            Awaiting Stg {item.rawItem.flow.currentStageIndex + 1}
          </span>
        ) : null;
      }

      const stageExec = item.rawItem.stage;
      const stageDef = item.rawItem.def;
      const hasFormFields = !!(
        (stageExec?.fields && stageExec.fields.length > 0) ||
        (stageDef?.fields && stageDef.fields.length > 0) ||
        stageExec?.how === 'IN-APP FORM' ||
        stageExec?.how === 'IN APP FORM'
      );
      const hasApprovalField = stageExec?.fields?.some((f: any) => f.type === 'APPROVAL' || f.id === 'status' || f.label?.toLowerCase().includes('approval')) ||
        stageDef?.fields?.some((f: any) => f.type === 'APPROVAL' || f.id === 'status' || f.label?.toLowerCase().includes('approval'));

      // When stage has configured form fields, Fill Form / Approve is the single primary action
      if (onOpenStageAction && hasFormFields) {
        return (
          <button
            type="button"
            onClick={() => onOpenStageAction(item.rawItem.flow, item.rawItem.stageIndex)}
            className={`${isMobile ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} ${
              hasApprovalField
                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
            } font-bold rounded flex items-center gap-1.5 transition-colors cursor-pointer border shadow-2xs`}
            title={hasApprovalField ? 'Review & Take Approval Decision' : 'Fill Form'}
          >
            {hasApprovalField ? (
              <>
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> <span>Approve / Reject</span>
              </>
            ) : (
              <>
                <FileText className="w-3.5 h-3.5" /> <span>Fill Form</span>
              </>
            )}
          </button>
        );
      }

      // For non-form stages with decision logic: Yes / No
      if (stageDef?.hasYesNoDecision || stageExec?.logic?.gatewayType === 'CONDITIONAL_JUMP') {
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                if (onOpenStageAction) {
                  onOpenStageAction(item.rawItem.flow, item.rawItem.stageIndex);
                } else {
                  onAdvanceFmsStage(item.rawItem.flow, 'Yes');
                }
              }}
              className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded transition-colors cursor-pointer border border-emerald-200`}
              title="Yes / Approve"
            >
              Yes
            </button>
            <button
              type="button"
              onClick={() => {
                if (onOpenStageAction) {
                  onOpenStageAction(item.rawItem.flow, item.rawItem.stageIndex);
                } else {
                  onAdvanceFmsStage(item.rawItem.flow, 'No');
                }
              }}
              className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2 py-1 text-[11px]'} bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded transition-colors cursor-pointer`}
              title={stageExec?.stageId === 'STG-10' ? 'No: Skip Stage 11 and jump directly to Stage 12' : 'No / Reject'}
            >
              {stageExec?.stageId === 'STG-10' ? 'No (Skip Stg 11)' : 'No'}
            </button>
          </div>
        );
      }

      // For non-form sequential steps: Mark Done
      return (
        <button
          onClick={() => {
            if (onOpenStageAction) {
              onOpenStageAction(item.rawItem.flow, item.rawItem.stageIndex);
            } else if (onCompleteFmsStage) {
              onCompleteFmsStage(item.rawItem.flow, item.rawItem.stageIndex);
            } else {
              onAdvanceFmsStage(item.rawItem.flow);
            }
          }}
          className={`${isMobile ? 'px-3.5 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded flex items-center gap-1 transition-colors cursor-pointer border border-amber-200`}
        >
          <CheckCircle2 className="w-3.5 h-3.5" />
          <span>Mark Done</span>
        </button>
      );
    }

    return null;
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* 4 Core Stat Cards (Toggleable - Hide for maximum table focus) */}
      {showStatCards && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-2.5 animate-in fade-in duration-150">
        {/* Due Today Card */}
        <div
          onClick={() => setSelectedCondition('DUE_TODAY')}
          className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border cursor-pointer transition-all ${
            selectedCondition === 'DUE_TODAY'
              ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-400/50 scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${selectedCondition === 'DUE_TODAY' ? 'text-white' : 'text-amber-600'}`}>
              Due Today
            </span>
            <Calendar className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${selectedCondition === 'DUE_TODAY' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between">
            <span className={`text-xl sm:text-2xl font-black ${selectedCondition === 'DUE_TODAY' ? 'text-white' : 'text-slate-900'}`}>
              {dueTodayItems.length}
            </span>
            <span className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full ${
              selectedCondition === 'DUE_TODAY'
                ? 'bg-white/25 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}>
              Today ({todayStr.slice(0, 5)})
            </span>
          </div>
        </div>

        {/* Overdue Card */}
        <div
          onClick={() => setSelectedCondition('OVERDUE')}
          className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border cursor-pointer transition-all ${
            selectedCondition === 'OVERDUE'
              ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50 scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${selectedCondition === 'OVERDUE' ? 'text-white' : 'text-rose-600'}`}>
              Overdue
            </span>
            <AlertTriangle className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${selectedCondition === 'OVERDUE' ? 'text-white' : 'text-rose-500'}`} />
          </div>
          <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between">
            <span className={`text-xl sm:text-2xl font-black ${selectedCondition === 'OVERDUE' ? 'text-white' : 'text-slate-900'}`}>
              {overdueItems.length}
            </span>
            <span className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full ${
              selectedCondition === 'OVERDUE'
                ? 'bg-white/25 text-white'
                : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              Action Req.
            </span>
          </div>
        </div>

        {/* Pending Card */}
        <div
          onClick={() => setSelectedCondition('PENDING')}
          className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border cursor-pointer transition-all ${
            selectedCondition === 'PENDING'
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50 scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${selectedCondition === 'PENDING' ? 'text-white' : 'text-indigo-600'}`}>
              Pending
            </span>
            <Clock className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${selectedCondition === 'PENDING' ? 'text-white' : 'text-indigo-500'}`} />
          </div>
          <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between">
            <span className={`text-xl sm:text-2xl font-black ${selectedCondition === 'PENDING' ? 'text-white' : 'text-slate-900'}`}>
              {pendingItems.length}
            </span>
            <span className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full ${
              selectedCondition === 'PENDING'
                ? 'bg-white/25 text-white'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            }`}>
              Active
            </span>
          </div>
        </div>

        {/* Completed Card */}
        <div
          onClick={() => setSelectedCondition('COMPLETED')}
          className={`px-3 py-2 sm:px-4 sm:py-2.5 rounded-xl border cursor-pointer transition-all ${
            selectedCondition === 'COMPLETED'
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50 scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-[10px] sm:text-[11px] font-bold uppercase tracking-wider ${selectedCondition === 'COMPLETED' ? 'text-white' : 'text-emerald-600'}`}>
              Completed
            </span>
            <CheckCircle2 className={`w-3.5 h-3.5 sm:w-4 sm:h-4 ${selectedCondition === 'COMPLETED' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-1 sm:mt-1.5 flex items-baseline justify-between">
            <span className={`text-xl sm:text-2xl font-black ${selectedCondition === 'COMPLETED' ? 'text-white' : 'text-slate-900'}`}>
              {completedItems.length}
            </span>
            <span className={`text-[9px] sm:text-[10px] font-semibold px-1.5 py-0.5 sm:px-2 sm:py-0.5 rounded-full ${
              selectedCondition === 'COMPLETED'
                ? 'bg-white/25 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              Finished
            </span>
          </div>
        </div>
      </div>
      )}

      {/* Control & Filter Bar (Sticky top bar for easy filtering at all times) */}
      <div className="sticky top-0 z-20 bg-white/95 backdrop-blur-xs px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-1.5 sm:gap-2">
        {/* Search on Left */}
        <div className="relative flex-1 min-w-0 md:max-w-xs">
          <Search className="w-3.5 h-3.5 absolute left-2.5 top-2 text-slate-400" />
          <input
            type="text"
            placeholder="Search tasks, reference codes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8 pr-2.5 py-1 text-xs bg-white border border-slate-300 rounded-lg w-full h-8 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {/* Filters & Actions on Right */}
        <div className="flex items-center gap-1.5 flex-wrap sm:flex-nowrap shrink-0">
          {/* Workload Status Selector Dropdown */}
          <CustomSelect
            options={[
              { value: 'ALL', label: `All (${unifiedItems.length})` },
              { value: 'DUE_TODAY', label: `Due Today (${dueTodayItems.length})`, badge: 'Today' },
              { value: 'OVERDUE', label: `Overdue (${overdueItems.length})`, badge: 'Alert' },
              { value: 'PENDING', label: `Pending (${pendingItems.length})` },
              { value: 'COMPLETED', label: `Completed (${completedItems.length})` },
            ]}
            value={selectedCondition}
            onChange={(val) => setSelectedCondition(val as StatCondition)}
            size="xs"
            variant="default"
            className="w-36"
          />

          {/* Module Dropdown */}
          <CustomSelect
            options={[
              { value: 'ALL', label: 'All Modules' },
              { value: 'FMS', label: 'FMS Pipeline' },
              { value: 'CHECKLIST', label: 'Compliance Checklist' },
              { value: 'DELEGATION', label: 'Delegated Tasks' },
            ]}
            value={moduleFilter}
            onChange={(val) => setModuleFilter(val as 'ALL' | 'FMS' | 'CHECKLIST' | 'DELEGATION')}
            size="xs"
            variant="default"
            className="w-40"
          />

          {/* View Mode Toggle (Standard Card vs Enterprise Matrix 1000+ Scale) */}
          <div className="flex items-center bg-slate-50 p-0.5 rounded-lg border border-slate-200 h-8 shrink-0">
            <button
              onClick={() => setViewFormat('CARD')}
              className={`p-1 rounded transition-all flex items-center ${
                viewFormat === 'CARD'
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Standard Card Feed View"
            >
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
            </button>
            <button
              onClick={() => setViewFormat('MATRIX')}
              className={`p-1 rounded transition-all flex items-center ${
                viewFormat === 'MATRIX'
                  ? 'bg-white text-slate-900 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
              title="Enterprise Matrix Grid View"
            >
              <Table className="w-3.5 h-3.5 text-slate-600" />
            </button>
          </div>

          {/* Toggle Stat Cards Visibility Button (Icon only) */}
          <button
            type="button"
            onClick={() => setShowStatCards((prev) => !prev)}
            className={`flex items-center justify-center w-8 h-8 rounded-lg transition-colors shrink-0 border cursor-pointer ${
              showStatCards
                ? 'bg-white hover:bg-slate-50 text-slate-700 border-slate-300'
                : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-300 shadow-2xs'
            }`}
            title={showStatCards ? 'Hide Stat Cards' : 'Show Stat Cards'}
          >
            {showStatCards ? (
              <EyeOff className="w-3.5 h-3.5 text-slate-500" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-indigo-600" />
            )}
          </button>

          {/* Export Filtered Data CSV Button (Icon only) */}
          <button
            type="button"
            onClick={handleExportFilteredCsv}
            title={`Export CSV (${displayedItems.length} items)`}
            className="flex items-center justify-center w-8 h-8 bg-white hover:bg-slate-50 text-slate-700 rounded-lg transition-colors shrink-0 border border-slate-300 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
          </button>
        </div>
      </div>

      {/* Batch Action Floating Bar */}
      {selectedBatchIds.length > 0 && (
        <div className="bg-indigo-950 text-white p-3 px-4 rounded-xl shadow-lg border border-indigo-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckSquare className="w-4 h-4 text-indigo-300" />
            <span>{selectedBatchIds.length} Requisitions Checked for Mass Action</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleExecuteBatchApprove}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mass Approve Checked ({selectedBatchIds.length})
            </button>
            <button
              onClick={() => setSelectedBatchIds([])}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20"
            >
              Cancel Selection
            </button>
          </div>
        </div>
      )}

      {/* 1. Dedicated Mobile Native Feed (md:hidden) — perfect phone layout, touch targets, and full stage actions */}
      <div className="md:hidden space-y-3">
        {paginatedItems.length > 0 ? (
          paginatedItems.map((item) => {
            const isChecked = selectedBatchIds.includes(item.id);
            const delayHrs = item.delayHours || 0;
            const isDelayActive = delayHrs > 0;
            const delayText = formatDelayVariance(delayHrs);

            return (
              <div 
                key={`mob-${item.id}`}
                className={`p-3.5 bg-white rounded-xl border transition-all space-y-2.5 shadow-2xs ${
                  isChecked ? 'border-indigo-500 ring-1 ring-indigo-500/20 bg-indigo-50/10' : 'border-slate-200'
                }`}
              >
                {/* Header row */}
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <input
                      type="checkbox"
                      disabled={!isItemActionable(item)}
                      checked={isChecked}
                      onChange={() => handleToggleBatchId(item.id)}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-25"
                    />
                    <span
                      className={`px-2 py-0.5 rounded font-bold text-[9px] flex items-center gap-1 uppercase shrink-0 ${
                        item.sourceModule === 'FMS'
                          ? 'bg-amber-100 text-amber-800'
                          : item.sourceModule === 'CHECKLIST'
                          ? 'bg-blue-100 text-blue-800'
                          : 'bg-purple-100 text-purple-800'
                      }`}
                    >
                      {item.sourceModule === 'FMS' && <GitBranch className="w-2.5 h-2.5" />}
                      {item.sourceModule === 'CHECKLIST' && <CheckSquare className="w-2.5 h-2.5" />}
                      {item.sourceModule === 'DELEGATION' && <ListTodo className="w-2.5 h-2.5" />}
                      <span>{item.sourceModule}</span>
                    </span>
                    <span className="font-mono font-bold text-slate-900 text-xs truncate">
                      {item.referenceCode}
                    </span>
                  </div>

                  {/* Status Badge */}
                  <div className="shrink-0">
                    {item.isCompleted ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                        Completed
                      </span>
                    ) : item.isOverdue ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                        Overdue
                      </span>
                    ) : item.isDueToday ? (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                        Due Today
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                        Pending
                      </span>
                    )}
                  </div>
                </div>

                {/* Title and Subtitle */}
                <div>
                  <h4 className={`font-bold text-slate-900 text-xs sm:text-sm leading-snug ${item.isCompleted ? 'line-through text-slate-400' : ''}`}>
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 mt-0.5 leading-tight">{item.subtitle}</p>
                </div>

                {/* Process Remarks Badge */}
                {item.processRemarks && item.processRemarks.length > 0 && (
                  <div className="p-2 rounded bg-purple-50 border border-purple-100 text-[11px] text-purple-900 space-y-0.5">
                    <div className="font-bold flex items-center gap-1 text-[10px]">
                      <MessageSquare className="w-3 h-3 text-purple-600" />
                      <span>Process Note ({item.processRemarks[0].authorName}):</span>
                    </div>
                    <p className="font-medium text-purple-800 text-[11px]">
                      {item.processRemarks[0].remarkText}
                    </p>
                  </div>
                )}

                {/* Timestamps & Delay */}
                <div className="p-2 bg-slate-50 rounded-lg text-[10px] space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-slate-400 font-semibold uppercase">Planned:</span>
                    <span className="font-mono font-bold text-slate-700">{item.plannedDateTimeStr || item.targetDateStr}</span>
                  </div>
                  {item.actualDateTimeStr && (
                    <div className="flex items-center justify-between">
                      <span className="text-slate-400 font-semibold uppercase">Actual:</span>
                      <span className="font-mono font-bold text-slate-700">{item.actualDateTimeStr}</span>
                    </div>
                  )}
                  {isDelayActive && (
                    <div className={`pt-1 border-t border-slate-200/60 font-mono font-bold flex items-center justify-between ${
                      item.isCompleted ? 'text-red-700' : 'text-amber-700'
                    }`}>
                      <span className="flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        <span>Delay:</span>
                      </span>
                      <span>{delayText}</span>
                    </div>
                  )}
                </div>

                {/* Actions row */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-1.5 flex-wrap">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {renderItemQuickActions(item, true)}
                    {canCoordinate && (
                      <button
                        onClick={() => {
                          const targetId = item.sourceModule === 'FMS' ? item.rawItem.flow.id : item.sourceId;
                          const stgIdx = item.sourceModule === 'FMS' ? item.rawItem.stageIndex : undefined;
                          setRemarkModalTarget({
                            item,
                            module: item.sourceModule,
                            targetId,
                            stageIndex: stgIdx,
                          });
                          setRemarkText('');
                        }}
                        className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded-lg text-[11px] flex items-center gap-1 transition-all"
                        title="Add Process Coordinator Remark"
                      >
                        <MessageSquare className="w-3 h-3" /> <span>Note</span>
                      </button>
                    )}
                    {canCoordinate && onNudgeItem && (
                      <button
                        onClick={() => {
                          const targetId = item.sourceModule === 'FMS' ? item.rawItem.flow.id : item.sourceId;
                          const stgIdx = item.sourceModule === 'FMS' ? item.rawItem.stageIndex : undefined;
                          onNudgeItem(item.sourceModule, targetId, stgIdx);
                        }}
                        className="p-1.5 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg transition-colors"
                        title="Send nudge follow-up"
                      >
                        <Bell className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      if (item.sourceModule === 'FMS') {
                        onSelectFmsDetail(item.rawItem.flow);
                      } else {
                        setViewDetailItem(item);
                      }
                    }}
                    className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded-lg text-[11px] flex items-center gap-1 transition-all ml-auto"
                  >
                    <Eye className="w-3.5 h-3.5 text-slate-500" />
                    <span>View</span>
                  </button>
                </div>
              </div>
            );
          })
        ) : (
          <div className="py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
            <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
            <p className="font-semibold text-slate-800 text-sm">No items found</p>
            <p className="text-xs text-slate-400 mt-1">All clear in this category!</p>
          </div>
        )}

        {/* Mobile Pagination */}
        {totalItems > pageSize && (
          <div className="p-3 bg-white rounded-xl border border-slate-200 flex items-center justify-between text-xs text-slate-600">
            <span>
              <span className="font-bold text-slate-900">{startIndex + 1}</span>-
              <span className="font-bold text-slate-900">{Math.min(startIndex + pageSize, totalItems)}</span> of{' '}
              <span className="font-bold text-slate-900">{totalItems}</span>
            </span>
            <div className="flex items-center gap-1.5">
              <button
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="px-2.5 py-1 bg-slate-100 rounded-lg font-bold disabled:opacity-30"
              >
                ← Prev
              </button>
              <button
                disabled={currentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="px-2.5 py-1 bg-slate-100 rounded-lg font-bold disabled:opacity-30"
              >
                Next →
              </button>
            </div>
          </div>
        )}
      </div>

      {/* 2. Desktop View (hidden md:block) */}
      <div className="hidden md:block">
      {viewFormat === 'CARD' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {paginatedItems.length > 0 ? (
            paginatedItems.map((item) => {
              const isChecked = selectedBatchIds.includes(item.id);
              const delayHrs = item.delayHours || 0;
              const isDelayActive = delayHrs > 0;
              const delayText = formatDelayVariance(delayHrs);

              return (
                <div 
                  key={item.id} 
                  className={`p-4 bg-white rounded-xl border transition-all flex flex-col justify-between h-full relative ${
                    isChecked ? 'border-indigo-500 ring-1 ring-indigo-500/20 bg-indigo-50/10' : 'border-slate-200 hover:border-slate-300 shadow-2xs'
                  }`}
                >
                  <div className="space-y-3">
                    {/* Header of Card */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-1.5">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleToggleBatchId(item.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="font-mono font-bold text-slate-900 text-xs">{item.referenceCode}</span>
                      </div>
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[9px] flex items-center gap-1 uppercase ${
                          item.sourceModule === 'FMS'
                            ? 'bg-amber-100 text-amber-800'
                            : item.sourceModule === 'CHECKLIST'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-purple-100 text-purple-800'
                        }`}
                      >
                        {item.sourceModule}
                      </span>
                    </div>

                    {/* Body Content */}
                    <div className="space-y-1">
                      <h4 className={`font-bold text-slate-900 text-xs sm:text-sm ${item.isCompleted ? 'line-through text-slate-400' : ''}`}>
                        {item.title}
                      </h4>
                      <p className="text-[11px] text-slate-500 leading-relaxed">{item.subtitle}</p>
                    </div>

                    {/* Status badge */}
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Status</span>
                      {item.isCompleted ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-100 text-emerald-800">
                          Completed
                        </span>
                      ) : item.isOverdue ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                          Overdue
                        </span>
                      ) : item.isDueToday ? (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                          Due Today
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-slate-100 text-slate-700">
                          Pending
                        </span>
                      )}
                    </div>

                    {/* Process Coordinator Remarks Badge */}
                    {item.processRemarks && item.processRemarks.length > 0 && (
                      <div className="p-2 rounded bg-purple-50 border border-purple-100 text-[11px] text-purple-900 space-y-0.5">
                        <div className="font-bold flex items-center gap-1 text-[10px]">
                          <MessageSquare className="w-3 h-3 text-purple-600" />
                          <span>Process Note ({item.processRemarks[0].authorName}):</span>
                        </div>
                        <p className="font-medium text-purple-800 leading-tight">
                          {item.processRemarks[0].remarkText}
                        </p>
                      </div>
                    )}

                    {/* Last Nudge */}
                    {item.lastNudgeTimestamp && (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded w-max border border-amber-100">
                        <Bell className="w-2.5 h-2.5 text-amber-600" />
                        <span>Followed up: {item.lastNudgeTimestamp}</span>
                      </div>
                    )}

                    {/* Timestamps */}
                    <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-[10px]">
                      <div>
                        <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[8px]">Planned:</span>
                        <span className="font-mono font-bold text-slate-700">{item.plannedDateTimeStr || item.targetDateStr}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 font-semibold block uppercase tracking-wider text-[8px]">Actual:</span>
                        <span className="font-mono font-bold text-slate-700">{item.actualDateTimeStr || '—'}</span>
                      </div>
                    </div>

                    {/* Delay variance badge on card */}
                    {isDelayActive && (
                      <div className={`p-2 rounded text-[11px] font-mono font-bold flex items-center justify-between ${
                        item.isCompleted
                          ? 'bg-red-100 text-red-800 border border-red-200'
                          : 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                      }`}>
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                          <span>Delay Variance:</span>
                        </span>
                        <span>{delayText}</span>
                      </div>
                    )}
                  </div>

                  {/* Bottom row actions */}
                  <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between gap-1.5 shrink-0">
                    <div className="flex items-center gap-1">
                      {renderItemQuickActions(item, false)}

                      {canCoordinate && (
                        <button
                          onClick={() => {
                            const targetId = item.sourceModule === 'FMS' ? item.rawItem.flow.id : item.sourceId;
                            const stgIdx = item.sourceModule === 'FMS' ? item.rawItem.stageIndex : undefined;
                            setRemarkModalTarget({
                              item,
                              module: item.sourceModule,
                              targetId,
                              stageIndex: stgIdx,
                            });
                            setRemarkText('');
                          }}
                          className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold rounded text-[10px] flex items-center gap-1 transition-all"
                          title="Add Process Coordinator Remark"
                        >
                          <MessageSquare className="w-3 h-3" /> Remark
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      {canCoordinate && onNudgeItem && (
                        <button
                          onClick={() => {
                            const targetId = item.sourceModule === 'FMS' ? item.rawItem.flow.id : item.sourceId;
                            const stgIdx = item.sourceModule === 'FMS' ? item.rawItem.stageIndex : undefined;
                            onNudgeItem(item.sourceModule, targetId, stgIdx);
                          }}
                          className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded transition-colors"
                          title="Send nudge follow-up"
                        >
                          <Bell className="w-3.5 h-3.5" />
                        </button>
                      )}

                      <button
                        onClick={() => {
                          if (item.sourceModule === 'FMS') {
                            onSelectFmsDetail(item.rawItem.flow);
                          } else {
                            setViewDetailItem(item);
                          }
                        }}
                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold rounded text-[10px] flex items-center gap-0.5 transition-all"
                      >
                        <Eye className="w-3 h-3 text-slate-500" /> View
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          ) : (
            <div className="col-span-full py-12 text-center text-slate-500 bg-white rounded-xl border border-slate-200">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800 text-sm">No items found</p>
              <p className="text-xs text-slate-400 mt-1">All clear in this category!</p>
            </div>
          )}
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-visible flex flex-col">
          <div className="overflow-x-auto min-h-[300px]">
            <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-10 bg-slate-100/95 backdrop-blur-xs text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px] shadow-2xs">
              <tr>
                <th className="py-2.5 px-2 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedBatchIds.length === paginatedItems.length && paginatedItems.length > 0}
                    onChange={handleSelectAllBatch}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="Select all on this page for batch action"
                  />
                </th>
                <th className="py-2.5 px-2 whitespace-nowrap">Module</th>
                <th className="py-2.5 px-2 whitespace-nowrap">Reference</th>
                <th className="py-2.5 px-3">Task / Stage Description</th>
                <th className="py-2.5 px-2 text-center whitespace-nowrap">Status</th>
                <th className="py-2.5 px-2 whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Planned</span>
                  </span>
                </th>
                <th className="py-2.5 px-2 whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Actual</span>
                  </span>
                </th>
                <th className="py-2.5 px-2 whitespace-nowrap">
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Delay</span>
                  </span>
                </th>
                <th className="py-2.5 px-3 text-right whitespace-nowrap">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item) => {
                  const isChecked = selectedBatchIds.includes(item.id);
                  return (
                    <tr key={item.id} className={`hover:bg-slate-50 transition-colors ${isChecked ? 'bg-indigo-50/50' : ''}`}>
                      {/* Checkbox for Batch Select */}
                      <td className="py-2.5 px-2 text-center">
                        <input
                          type="checkbox"
                          disabled={!isItemActionable(item)}
                          checked={isChecked}
                          onChange={() => handleToggleBatchId(item.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* Module Badge */}
                      <td className="py-2.5 px-2 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded font-bold text-[10px] flex items-center gap-1 w-max ${
                            item.sourceModule === 'FMS'
                              ? 'bg-amber-100 text-amber-800'
                              : item.sourceModule === 'CHECKLIST'
                              ? 'bg-blue-100 text-blue-800'
                              : 'bg-purple-100 text-purple-800'
                          }`}
                        >
                          {item.sourceModule === 'FMS' && <GitBranch className="w-3 h-3" />}
                          {item.sourceModule === 'CHECKLIST' && <CheckSquare className="w-3 h-3" />}
                          {item.sourceModule === 'DELEGATION' && <ListTodo className="w-3 h-3" />}
                          <span>{item.sourceModule}</span>
                        </span>
                      </td>

                      {/* Reference Code */}
                      <td className="py-2.5 px-2 font-mono font-bold text-slate-800 whitespace-nowrap">
                        {item.referenceCode}
                      </td>

                      {/* Title & Subtitle + Process Coordinator Remarks */}
                      <td className="py-2.5 px-3 min-w-0">
                        <div className={`font-semibold text-slate-900 ${item.isCompleted ? 'line-through text-slate-400' : ''}`}>
                          {item.title}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {item.subtitle}
                        </div>

                        {/* Process Coordinator Remarks Badge */}
                        {item.processRemarks && item.processRemarks.length > 0 && (
                          <div className="mt-1.5 p-1.5 rounded bg-purple-50 border border-purple-200 text-[11px] text-purple-900 flex items-start gap-1.5">
                            <MessageSquare className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                            <div>
                              <span className="font-bold text-purple-950">Process Note ({item.processRemarks[0].authorName}):</span>{' '}
                              <span className="font-semibold text-purple-800">[{item.processRemarks[0].category.replace('_', ' ')}]</span>{' '}
                              {item.processRemarks[0].remarkText}
                              <span className="text-[10px] text-purple-500 block font-mono mt-0.5">
                                Logged: {item.processRemarks[0].timestamp}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Last Nudge Timestamp */}
                        {item.lastNudgeTimestamp && (
                          <div className="mt-1 flex items-center gap-1 text-[10px] font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded w-max border border-amber-200">
                            <Bell className="w-3 h-3 text-amber-600" />
                            <span>Followed up / Nudged: {item.lastNudgeTimestamp}</span>
                          </div>
                        )}
                      </td>

                      {/* Status Column Badge */}
                      <td className="py-2.5 px-2 text-center whitespace-nowrap">
                        {item.isCompleted ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            Completed
                          </span>
                        ) : item.isOverdue ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-300">
                            Overdue
                          </span>
                        ) : item.isDueToday ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                            Due Today
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            Pending
                          </span>
                        )}
                      </td>

                      {/* Planned Date/Time */}
                      <td className="py-2.5 px-2 font-mono text-slate-800 whitespace-nowrap">
                        {item.plannedDateTimeStr || item.targetDateStr}
                      </td>

                      {/* Actual Date/Time - styled normally */}
                      <td className="py-2.5 px-2 font-mono text-slate-700 whitespace-nowrap">
                        {item.actualDateTimeStr || '—'}
                      </td>

                      {/* Delay Variance - show ONLY precision duration if delayed, with body highlights */}
                      {(() => {
                        const delayHrs = item.delayHours || 0;
                        const isDelayActive = delayHrs > 0;
                        const delayText = formatDelayVariance(delayHrs);

                        return (
                          <td className={`py-2.5 px-2 font-mono whitespace-nowrap text-xs font-bold ${
                            isDelayActive
                              ? item.isCompleted
                                ? 'bg-red-100 text-red-800 border border-red-200 rounded'
                                : 'bg-yellow-100 text-yellow-800 border border-yellow-200 rounded'
                              : 'text-slate-400'
                          }`}>
                            {delayText}
                          </td>
                        );
                      })()}

                      {/* Quick Action Button */}
                      <td className="py-2.5 px-3 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* CHECKLIST: Mark Done / Reopen only for assigned user, and Mark Done visible ONLY for Due Today or Overdue */}
                          {item.sourceModule === 'CHECKLIST' && item.isMine && (
                            item.isCompleted ? (
                              <button
                                onClick={() => {
                                  const now = new Date();
                                  onCompleteChecklist({
                                    ...item.rawItem,
                                    status: 'Pending',
                                    actualDate: undefined,
                                    updatedAt: now.toLocaleString('en-GB')
                                  });
                                }}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] transition-colors cursor-pointer"
                              >
                                Reopen
                              </button>
                            ) : (item.isDueToday || item.isOverdue) ? (
                              <button
                                onClick={() => {
                                  const now = new Date();
                                  const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
                                  onCompleteChecklist({
                                    ...item.rawItem,
                                    status: 'Done',
                                    actualDate: formattedDate,
                                    updatedAt: now.toLocaleString('en-GB')
                                  });
                                }}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-[11px] transition-colors cursor-pointer"
                              >
                                Mark Done
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-50 border border-slate-200 rounded">
                                Scheduled {item.plannedDateTimeStr?.split(' ')[0] || item.targetDateStr}
                              </span>
                            )
                          )}

                          {/* DELEGATION: Complete / Reopen / Revise only for assigned user */}
                          {item.sourceModule === 'DELEGATION' && item.isMine && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => {
                                  const now = new Date();
                                  const formattedDateTime = now.toLocaleString('en-GB');
                                  const isDone = item.isCompleted;
                                  onCompleteDelegation({
                                    ...item.rawItem,
                                    status: isDone ? 'Pending' : 'Completed',
                                    completedAt: isDone ? undefined : formattedDateTime
                                  });
                                }}
                                className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-[11px] transition-colors cursor-pointer"
                              >
                                {item.isCompleted ? 'Reopen' : 'Complete'}
                              </button>
                              <button
                                onClick={() => onReviseDelegation(item.rawItem)}
                                className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-medium rounded text-[11px] transition-colors cursor-pointer"
                              >
                                Revise
                              </button>
                            </div>
                          )}

                          {/* FMS: Advance / Yes / No only for assigned user of active stage */}
                          {item.sourceModule === 'FMS' && (
                            <div className="flex items-center gap-1">
                              {item.rawItem.def?.formUrl && isItemActionable(item) && (
                                <a
                                  href={item.rawItem.def.formUrl}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded text-[11px] flex items-center gap-1 transition-colors"
                                >
                                  <ExternalLink className="w-3 h-3" /> Form
                                </a>
                              )}
                              {(() => {
                                if (!isItemActionable(item)) {
                                  return !item.isCompleted && item.rawItem.flow.status === 'In Progress' ? (
                                    <span className="text-[10px] text-slate-400 font-mono italic pr-1">
                                      Awaiting Stg {item.rawItem.flow.currentStageIndex + 1}
                                    </span>
                                  ) : null;
                                }

                                const stageExec = item.rawItem.stage;
                                const stageDef = item.rawItem.def;
                                const hasFormFields = !!(
                                  (stageExec?.fields && stageExec.fields.length > 0) ||
                                  (stageDef?.fields && stageDef.fields.length > 0) ||
                                  stageExec?.how === 'IN-APP FORM' ||
                                  stageExec?.how === 'IN APP FORM'
                                );
                                const hasApprovalField = stageExec?.fields?.some((f: any) => f.type === 'APPROVAL' || f.id === 'status' || f.label?.toLowerCase().includes('approval')) ||
                                  stageDef?.fields?.some((f: any) => f.type === 'APPROVAL' || f.id === 'status' || f.label?.toLowerCase().includes('approval'));

                                // When stage has configured form fields, Fill Form / Approve is the single primary action
                                if (onOpenStageAction && hasFormFields) {
                                  return (
                                    <button
                                      type="button"
                                      onClick={() => onOpenStageAction(item.rawItem.flow, item.rawItem.stageIndex)}
                                      className={`px-2.5 py-1 font-bold rounded text-[11px] flex items-center gap-1.5 transition-colors cursor-pointer border shadow-2xs ${
                                        hasApprovalField
                                          ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                          : 'bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border-indigo-200'
                                      }`}
                                      title={hasApprovalField ? 'Review & Take Approval Decision' : 'Fill Form'}
                                    >
                                      {hasApprovalField ? (
                                        <>
                                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" /> <span>Approve / Reject</span>
                                        </>
                                      ) : (
                                        <>
                                          <FileText className="w-3.5 h-3.5" /> <span>Fill Form</span>
                                        </>
                                      )}
                                    </button>
                                  );
                                }

                                // For non-form stages with decision logic: Yes / No
                                if (stageDef?.hasYesNoDecision || stageExec?.logic?.gatewayType === 'CONDITIONAL_JUMP') {
                                  return (
                                    <div className="flex items-center gap-1">
                                      <button
                                        onClick={() => {
                                          if (onCompleteFmsStage) {
                                            onCompleteFmsStage(item.rawItem.flow, item.rawItem.stageIndex, 'Yes');
                                          } else {
                                            onAdvanceFmsStage(item.rawItem.flow, 'Yes');
                                          }
                                        }}
                                        className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded text-[11px] transition-colors cursor-pointer"
                                        title="Advance / Yes"
                                      >
                                        Yes
                                      </button>
                                      <button
                                        onClick={() => {
                                          if (onCompleteFmsStage) {
                                            onCompleteFmsStage(item.rawItem.flow, item.rawItem.stageIndex, 'No');
                                          } else {
                                            onAdvanceFmsStage(item.rawItem.flow, 'No');
                                          }
                                        }}
                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded text-[11px] transition-colors cursor-pointer"
                                        title={stageExec?.stageId === 'STG-10' ? 'No: Skip Stage 11 and jump directly to Stage 12' : 'No / Reject'}
                                      >
                                        {stageExec?.stageId === 'STG-10' ? 'No (Skip Stg 11)' : 'No'}
                                      </button>
                                    </div>
                                  );
                                }

                                // For non-form sequential steps: Mark Done
                                return (
                                  <button
                                    onClick={() => {
                                      if (onOpenStageAction) {
                                        onOpenStageAction(item.rawItem.flow, item.rawItem.stageIndex);
                                      } else if (onCompleteFmsStage) {
                                        onCompleteFmsStage(item.rawItem.flow, item.rawItem.stageIndex);
                                      } else {
                                        onAdvanceFmsStage(item.rawItem.flow);
                                      }
                                    }}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded text-[11px] transition-colors cursor-pointer"
                                  >
                                    Mark Done
                                  </button>
                                );
                              })()}
                            </div>
                          )}

                          {/* Single Context View Button (Available to ALL users to inspect progress and stages) */}
                          <button
                            onClick={() => {
                              if (item.sourceModule === 'FMS') {
                                onSelectFmsDetail(item.rawItem.flow);
                              } else {
                                setViewDetailItem(item);
                              }
                            }}
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                            title="View task detail & status"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </button>

                          {/* Process Note Remark Button - Super Admin & Administrative User */}
                          {canCoordinate && (
                            <button
                              onClick={() => {
                                const targetId = item.sourceModule === 'FMS'
                                  ? item.rawItem.flow.id
                                  : item.sourceId;
                                const stgIdx = item.sourceModule === 'FMS' ? item.rawItem.stageIndex : undefined;
                                setRemarkModalTarget({
                                  item,
                                  module: item.sourceModule,
                                  targetId,
                                  stageIndex: stgIdx,
                                });
                                setRemarkText('');
                              }}
                              className="p-1.5 hover:bg-purple-50 text-slate-400 hover:text-purple-700 rounded-lg transition-colors"
                              title="Add Process Coordinator Remark"
                            >
                              <MessageSquare className="w-3.5 h-3.5" />
                            </button>
                          )}

                          {/* Optional Nudge Button for open items - Super Admin & Administrative User */}
                          {canCoordinate && onNudgeItem && !item.isCompleted && (
                            <button
                              onClick={() => {
                                const targetId = item.sourceModule === 'FMS'
                                  ? item.rawItem.flow.id
                                  : item.sourceId;
                                const stgIdx = item.sourceModule === 'FMS' ? item.rawItem.stageIndex : undefined;
                                onNudgeItem(item.sourceModule, targetId, stgIdx);
                              }}
                              className="p-1.5 hover:bg-amber-50 text-slate-400 hover:text-amber-600 rounded-lg transition-colors"
                              title="Send follow-up nudge to assignee"
                            >
                              <Bell className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-500">
                    <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                    <p className="font-semibold text-slate-800 text-sm">
                      No items found in {selectedCondition.replace('_', ' ')}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      All workflows for {currentUser.name} are clean in this category!
                    </p>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Bar for 1000+ Requisitions - pr-24 prevents FAB overlap */}
        <div className="shrink-0 p-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600 sm:pr-24">
          <div className="flex items-center gap-4">
            {/* Relocated Rows dropdown */}
            <div className="flex items-center gap-1.5">
              <span className="text-slate-500 font-medium">Rows:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="px-1.5 py-0.5 text-[11px] font-bold bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
              >
                <option value={10}>10</option>
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>

            <span>
              Showing <span className="font-bold text-slate-900">{totalItems > 0 ? startIndex + 1 : 0}</span> to{' '}
              <span className="font-bold text-slate-900">{Math.min(startIndex + pageSize, totalItems)}</span> of{' '}
              <span className="font-bold text-slate-900">{totalItems}</span> Requisitions
            </span>
            {selectedBatchIds.length > 0 && (
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded-full">
                {selectedBatchIds.length} Checked
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              disabled={validPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-3 py-1 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold shadow-2xs transition-all"
            >
              ← Previous
            </button>
            <span className="px-2 font-mono font-bold text-slate-800 text-xs">
              Page {validPage} of {totalPages}
            </span>
            <button
              disabled={validPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-3 py-1 bg-white border border-slate-300 rounded-lg hover:bg-slate-100 disabled:opacity-40 disabled:cursor-not-allowed font-semibold shadow-2xs transition-all"
            >
              Next →
            </button>
          </div>
        </div>
      </div>
      )}
      </div>

      {/* Add Process Coordinator Remark Modal */}
      {remarkModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-purple-50">
              <div className="flex items-center gap-2 text-purple-950 font-bold text-sm">
                <MessageSquare className="w-4 h-4 text-purple-600" />
                <span>Log Process Coordinator Remark — {currentUser.name}</span>
              </div>
              <button
                onClick={() => setRemarkModalTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
                <span className="font-mono font-bold text-indigo-700">{remarkModalTarget.item.referenceCode}</span>
                <p className="font-semibold text-slate-900 text-xs mt-0.5">{remarkModalTarget.item.title}</p>
                <p className="text-[11px] text-slate-500 mt-0.5">{remarkModalTarget.item.subtitle}</p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Delay / Status Category <span className="text-rose-500">*</span>
                </label>
                <select
                  value={remarkCategory}
                  onChange={(e) => setRemarkCategory(e.target.value as any)}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-medium text-xs"
                >
                  <option value="AWAITING_APPROVAL">Awaiting Management / Director Approval</option>
                  <option value="VENDOR_DELAY">Vendor / Supplier Sourcing Delay</option>
                  <option value="STAFF_ON_LEAVE">Key Staff / Assignee On Leave</option>
                  <option value="SITE_DOCS_MISSING">Site Documentation / Drawing Missing</option>
                  <option value="TECHNICAL_ISSUE">Technical / Bank Payment Verification Issue</option>
                  <option value="OTHER">Other Operational Constraint</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Detailed Justification / Remark Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  placeholder="e.g. Followed up with Purchase Manager Bramhanand Patel. Vendor requested 2 days extension due to steel transport strike..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRemarkModalTarget(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!remarkText.trim()) return;
                    if (onAddProcessRemark) {
                      onAddProcessRemark(
                        remarkModalTarget.module,
                        remarkModalTarget.targetId,
                        remarkCategory,
                        remarkText.trim(),
                        remarkModalTarget.stageIndex
                      );
                    }
                    setRemarkModalTarget(null);
                    setRemarkText('');
                  }}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 shadow-sm"
                >
                  <Send className="w-3.5 h-3.5" /> Log Process Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Task Deep Inspection Modal for Process Coordinator (Ritu Sahu View Action) */}
      {viewDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-800 text-white">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Info className="w-4 h-4 text-indigo-400" />
                <span>Process Audit Context — {viewDetailItem.referenceCode}</span>
              </div>
              <button
                onClick={() => setViewDetailItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 text-sm">{viewDetailItem.title}</span>
                  <span className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                    viewDetailItem.sourceModule === 'CHECKLIST'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {viewDetailItem.sourceModule}
                  </span>
                </div>
                <p className="text-indigo-800 font-medium">{viewDetailItem.subtitle}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">Target SLA / Target Date</span>
                  <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">{viewDetailItem.targetDateStr}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">Current Status</span>
                  <span className={`font-bold text-xs mt-0.5 block ${
                    viewDetailItem.isCompleted ? 'text-emerald-700' : viewDetailItem.isOverdue ? 'text-rose-700 font-bold' : 'text-amber-700'
                  }`}>
                    {viewDetailItem.status}
                  </span>
                </div>
              </div>

              {/* Revision History for Delegation */}
              {viewDetailItem.sourceModule === 'DELEGATION' && viewDetailItem.rawItem.revisionHistory && viewDetailItem.rawItem.revisionHistory.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                    Delegation Revision History ({viewDetailItem.rawItem.revisionHistory.length} Shifts)
                  </span>
                  <div className="space-y-1.5 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                    {viewDetailItem.rawItem.revisionHistory.map((rev: any, idx: number) => (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-indigo-700">Shift #{rev.revisionNumber}: {rev.previousDate} → {rev.newDate}</span>
                          <span className="text-[10px] text-slate-400">{rev.timestamp}</span>
                        </div>
                        <p className="text-slate-600">Reason: "{rev.reason}" (Revised by: {rev.revisedBy})</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Checklist evidence link */}
              {viewDetailItem.sourceModule === 'CHECKLIST' && viewDetailItem.rawItem.evidenceUrl && (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <span className="font-bold text-purple-950 block text-[11px]">Submitted Photo / Document Evidence</span>
                  <a
                    href={viewDetailItem.rawItem.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 text-purple-700 underline font-semibold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> View Evidence Document
                  </a>
                </div>
              )}

              {/* Process Coordinator Remarks Audit List */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="font-bold text-purple-950 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                  Process Coordinator Audit Notes ({viewDetailItem.processRemarks?.length || 0})
                </span>

                {viewDetailItem.processRemarks && viewDetailItem.processRemarks.length > 0 ? (
                  <div className="space-y-2">
                    {viewDetailItem.processRemarks.map((rem, rIdx) => (
                      <div key={rem.id || rIdx} className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 space-y-1">
                        <div className="flex items-center justify-between font-bold text-purple-950">
                          <span>{rem.authorName} ({rem.authorRole})</span>
                          <span className="font-mono text-[10px] font-normal text-purple-600">{rem.timestamp}</span>
                        </div>
                        <span className="inline-block px-1.5 py-0.2 rounded bg-purple-200/80 text-purple-900 font-bold text-[10px]">
                          {rem.category.replace('_', ' ')}
                        </span>
                        <p className="text-purple-900 font-medium leading-relaxed mt-0.5">{rem.remarkText}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[11px] p-2 bg-slate-50 rounded-lg">
                    No process remarks logged yet. Use the 'Remark' button on the main row to add one.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setViewDetailItem(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors text-xs"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom spacing to ensure all content and buttons remain accessible above any floating elements */}
      <div className="h-10 md:h-14" />
    </div>
  );
};
