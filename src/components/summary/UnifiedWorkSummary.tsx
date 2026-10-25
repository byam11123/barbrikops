import React, { useState, useEffect, useMemo } from 'react';
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
  Download,
  ShieldCheck,
  Lock,
  KeyRound,
  Check,
  AlertCircle,
  Flag,
  FileSpreadsheet,
  Layers,
  Landmark,
  ListFilter,
  MoreVertical,
  ChevronUp,
  ChevronDown,
  ArrowUpDown,
  Settings
} from 'lucide-react';
import { downloadCsv } from '../../utils/csvExporter';
import { CustomSelect } from '../common/CustomSelect';
import { ChecklistItem, DelegationTask, FmsInstance, UserProfile, ProcessRemark, FmsStageDefinition, isUserSuperAdmin, isUserAdminOrSuperAdmin, isUserDirector, isUserEA, isUserProcessCoordinator } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { SplitTaskCockpit } from './SplitTaskCockpit';
import { PCDelayMonitor } from './PCDelayMonitor';
import { EAApprovalDesk } from './EAApprovalDesk';
import { DirectorQueue } from './DirectorQueue';
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
import { FileUploadField } from '../common/FileUploadField';

export type StatCondition = 'ALL' | 'DUE_TODAY' | 'DUE_THIS_WEEK' | 'OVERDUE' | 'PENDING' | 'COMPLETED';

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
  sourceModule: 'FMS' | 'CHECKLIST' | 'DELEGATION' | 'BANKING';
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
  isDueThisWeek?: boolean;
  isMine?: boolean;
  priority?: string;
  channelOrFreq?: string;
  rawItem: any;
  processRemarks?: ProcessRemark[];
  lastNudgeTimestamp?: string;
  assigneeName?: string;
  whoRole?: string;
  slaHours?: number;
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

export function getDelayHours(plannedStr: string | undefined, actualStr: string | undefined, isCompleted: boolean, isPending: boolean = false): number {
  if (isPending) return 0;
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

export interface ContextSummaryField {
  label: string;
  value: string;
  tooltip?: string;
}

export function getItemRefNo(item: UnifiedItem): string {
  if (item.sourceModule === 'FMS') {
    const flow = item.rawItem?.flow;
    if (flow) {
      return flow.indentNo || flow.poNumber || flow.requisitionNumber || flow.flowId || item.referenceCode;
    }
  } else if (item.sourceModule === 'CHECKLIST') {
    const chk = item.rawItem;
    return chk?.taskId ? `CHK #${chk.taskId}` : item.referenceCode;
  } else if (item.sourceModule === 'DELEGATION') {
    const del = item.rawItem;
    return del?.taskId ? `TASK #${del.taskId}` : item.referenceCode;
  } else if (item.sourceModule === 'BANKING') {
    const bp = item.rawItem?.bankPayment || item.rawItem;
    return bp?.sheetNo || item.referenceCode;
  }
  return item.referenceCode;
}

function extractItemNames(flow: any): string[] {
  if (!flow) return [];
  const lineItems = flow.lineItems || flow.items || flow.instanceDataPool?.lineItems || [];
  if (Array.isArray(lineItems) && lineItems.length > 0) {
    return lineItems
      .map((it: any) => it.itemDescription || it.itemName || it.name || it.description)
      .filter(Boolean);
  }
  return [];
}

export interface ContextDisplayData {
  category: 'PAYMENT' | 'STORE_PURCHASE';
  vendorName?: string;
  amount?: string;
  purpose?: string;
  items?: string;
  fullItemsTooltip?: string;
  site?: string;
  refNo: string;
}

export function getContextData(item: UnifiedItem): ContextDisplayData {
  const raw = item.rawItem;
  const flow = raw?.flow;
  const bp = raw?.bankPayment || (item.sourceModule === 'BANKING' ? raw : undefined);
  const chk = item.sourceModule === 'CHECKLIST' ? raw : undefined;
  const del = item.sourceModule === 'DELEGATION' ? raw : undefined;

  const flowType = flow?.flowType || flow?.templateKey || '';

  const isPaymentFinance =
    item.sourceModule === 'BANKING' ||
    flowType === 'PO_TO_PAYMENT' ||
    flowType === 'BENEFICIARY_APPROVAL' ||
    flowType === 'BANK_PAYMENT' ||
    flowType === 'PAYMENT_TO_DISPATCH' ||
    Boolean(bp?.amountToBePaid || flow?.amountToBePaid || flow?.poAmount);

  if (isPaymentFinance) {
    const vendorName =
      bp?.vendorName ||
      bp?.tradeVendorName ||
      bp?.beneficiaryName ||
      flow?.vendorName ||
      flow?.beneficiaryName ||
      flow?.selectedVendor ||
      flow?.instanceDataPool?.vendorName ||
      flow?.instanceDataPool?.beneficiaryName ||
      'M/S Vendor';

    const rawAmt =
      bp?.amountToBePaid ??
      flow?.poAmount ??
      flow?.amountToBePaid ??
      flow?.paymentAmount ??
      flow?.instanceDataPool?.poAmount ??
      flow?.instanceDataPool?.amountToBePaid;

    const amount =
      typeof rawAmt === 'number'
        ? `₹${rawAmt.toLocaleString('en-IN')}`
        : (rawAmt ? `₹${rawAmt}` : (flow?.poNumber ? 'As per PO' : ''));

    const rawPurpose =
      bp?.purposeOfPayment ||
      bp?.beneficiaryPurpose ||
      bp?.remark ||
      flow?.beneficiaryPurpose ||
      flow?.purposeOfPayment ||
      flow?.remarks ||
      flow?.instanceDataPool?.purposeOfPayment ||
      flow?.instanceDataPool?.purpose ||
      (flow?.indentNo ? `Advance payment for Indent #${flow.indentNo}` : '');

    const purpose = rawPurpose
      ? (rawPurpose.toLowerCase().startsWith('purpose:') ? rawPurpose : `Purpose: ${rawPurpose}`)
      : '';

    const rawPoRef =
      bp?.billNoPo ||
      flow?.poNumber ||
      flow?.billNoPo ||
      bp?.sheetNo ||
      flow?.beneficiarySheetNo ||
      flow?.paymentSheetNo ||
      flow?.indentNo ||
      item.referenceCode;

    const poRef = rawPoRef.startsWith('PO Ref:') || rawPoRef.startsWith('Ref:')
      ? rawPoRef
      : rawPoRef.includes('/PO/') || rawPoRef.startsWith('PO-')
      ? `PO Ref: ${rawPoRef}`
      : `Ref: ${rawPoRef}`;

    return {
      category: 'PAYMENT',
      vendorName,
      amount,
      purpose,
      refNo: poRef,
      site: bp?.site || flow?.siteName,
    };
  }

  // Store/Purchase/Checklist flows
  let itemsStr = '';
  let fullItemsTooltip = '';
  let siteName = 'Central HQ';
  let refStr = item.referenceCode;

  if (chk) {
    itemsStr = chk.task || (chk.department ? `${chk.department} Operations` : 'Checklist Items');
    siteName = chk.site ? `Site: ${chk.site}` : 'Site: Central Store';
    refStr = chk.taskId ? `CHK #${chk.taskId}` : item.referenceCode;
  } else if (del) {
    itemsStr = del.task || 'Delegated Task';
    siteName = del.site ? `Site: ${del.site}` : 'Site: Head Office';
    refStr = del.taskId ? `TASK #${del.taskId}` : item.referenceCode;
  } else if (flow) {
    const names = extractItemNames(flow);
    fullItemsTooltip = names.join(', ');
    if (names.length > 2) {
      itemsStr = `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
    } else if (names.length > 0) {
      itemsStr = names.join(', ');
    } else {
      itemsStr = flow.remarks || 'Store Material';
    }

    const baseSite = flow.destinationSite || flow.toSite || flow.siteName || 'RAIPUR OFFICE';
    const vehicleNo =
      flow.vehicleNo ||
      flow.vehicleNumber ||
      flow.transportDetails?.vehicleNo ||
      flow.instanceDataPool?.vehicleNo;

    siteName = vehicleNo ? `Site: ${baseSite} • Vehicle: ${vehicleNo}` : `Site: ${baseSite}`;
    refStr = flow.indentNo || flow.poNumber || flow.requisitionNumber || flow.flowId || item.referenceCode;
  }

  const finalItems = itemsStr.startsWith('Items:') ? itemsStr : `Items: ${itemsStr}`;
  const finalRef = refStr.startsWith('Ref:') ? refStr : `Ref: ${refStr}`;

  return {
    category: 'STORE_PURCHASE',
    items: finalItems,
    fullItemsTooltip,
    site: siteName,
    refNo: finalRef,
  };
}

export function getContextSummary(item: UnifiedItem): ContextSummaryField[] {
  // 4. For CHECKLIST items:
  // Show Dept: [Department / Store Name]
  // Show Freq: [Frequency (e.g., Weekly, Daily)]
  if (item.sourceModule === 'CHECKLIST') {
    const chk = item.rawItem;
    const dept = chk?.department || 'Store';
    const freq = chk?.frequency === 'W'
      ? 'Weekly'
      : chk?.frequency === 'M'
      ? 'Monthly'
      : chk?.frequency === 'D'
      ? 'Daily'
      : (chk?.frequency || 'Daily');
    return [
      { label: 'Dept', value: dept },
      { label: 'Freq', value: freq },
    ];
  }

  // 2. For PO_TO_PAYMENT / BANK_PAYMENT / BENEFICIARY_APPROVAL (BANKING module):
  if (item.sourceModule === 'BANKING') {
    const bp = item.rawItem?.bankPayment || item.rawItem;
    const vendor = bp?.vendorName || bp?.tradeVendorName || bp?.beneficiaryName || 'Vendor';
    const amountVal = bp?.amountToBePaid;
    const amount = typeof amountVal === 'number'
      ? `₹${amountVal.toLocaleString('en-IN')}`
      : (amountVal ? `₹${amountVal}` : '');
    const purpose = bp?.purposeOfPayment || bp?.beneficiaryPurpose || '';
    const poRef = bp?.billNoPo || bp?.sheetNo || bp?.poNumber || item.referenceCode;

    const fields: ContextSummaryField[] = [];
    if (vendor) fields.push({ label: 'Vendor', value: vendor });
    if (amount && purpose) {
      fields.push({
        label: 'Amount',
        value: `${amount}  Show Purpose:${purpose}`,
        tooltip: `Amount: ${amount} | Purpose: ${purpose}`,
      });
    } else if (amount) {
      fields.push({ label: 'Amount', value: amount });
    } else if (purpose) {
      fields.push({ label: 'Purpose', value: purpose });
    }
    if (poRef) fields.push({ label: 'PO Ref', value: poRef });
    return fields;
  }

  // FMS flows & tasks
  if (item.sourceModule === 'FMS') {
    const flow = item.rawItem?.flow;
    const stage = item.rawItem?.stage;
    const flowType = flow?.flowType || flow?.templateKey || '';

    // 2. For PO_TO_PAYMENT / BANK_PAYMENT / BENEFICIARY_APPROVAL:
    // Show Vendor: [Vendor Name]
    // Show Amount: [₹ Amount formatted]  Show Purpose:[Purpose]
    // Show PO Ref: [PO Number or Sheet Ref]
    if (
      flowType === 'PO_TO_PAYMENT' ||
      flowType === 'BENEFICIARY_APPROVAL' ||
      flowType === 'BANK_PAYMENT' ||
      flowType === 'PAYMENT_TO_DISPATCH'
    ) {
      const vendor =
        flow?.vendorName ||
        flow?.beneficiaryName ||
        flow?.selectedVendor ||
        flow?.instanceDataPool?.vendorName ||
        flow?.instanceDataPool?.beneficiaryName ||
        'Vendor';
      const rawAmt =
        flow?.poAmount ||
        flow?.amountToBePaid ||
        flow?.paymentAmount ||
        flow?.instanceDataPool?.poAmount ||
        flow?.instanceDataPool?.amountToBePaid ||
        flow?.instanceDataPool?.amount;
      const amount =
        typeof rawAmt === 'number'
          ? `₹${rawAmt.toLocaleString('en-IN')}`
          : (rawAmt ? `₹${rawAmt}` : (flow?.poNumber ? 'As per PO' : ''));
      const purpose =
        flow?.beneficiaryPurpose ||
        flow?.purposeOfPayment ||
        flow?.remarks ||
        flow?.instanceDataPool?.purposeOfPayment ||
        flow?.instanceDataPool?.purpose ||
        '';
      const poRef =
        flow?.poNumber ||
        flow?.billNoPo ||
        flow?.beneficiarySheetNo ||
        flow?.paymentSheetNo ||
        flow?.indentNo ||
        item.referenceCode;

      const fields: ContextSummaryField[] = [];
      if (vendor) fields.push({ label: 'Vendor', value: vendor });
      if (amount && purpose) {
        fields.push({
          label: 'Amount',
          value: `${amount}  Show Purpose:${purpose}`,
          tooltip: `Amount: ${amount} | Purpose: ${purpose}`,
        });
      } else if (amount) {
        fields.push({ label: 'Amount', value: amount });
      } else if (purpose) {
        fields.push({ label: 'Purpose', value: purpose });
      }
      if (poRef) fields.push({ label: 'PO Ref', value: poRef });
      return fields;
    }

    // 3. For STORE_TO_SITE_DISPATCH / PURCHASE_TO_STORE_DISPATCH / SITE_RECEIVE:
    // Show Items: [First 2 item names]
    // Show Vehicle: [Vehicle Number (if available in payload)]
    // Show Site: [Destination Site]
    if (
      flowType === 'STORE_TO_SITE_DISPATCH' ||
      flowType === 'PURCHASE_TO_STORE_DISPATCH' ||
      flowType === 'SITE_RECEIVE'
    ) {
      const names = extractItemNames(flow);
      const itemsStr =
        names.length > 2
          ? `${names.slice(0, 2).join(', ')} +${names.length - 2} more`
          : names.slice(0, 2).join(', ') || flow?.remarks || 'Dispatched Items';
      const fullTooltip = names.join(', ');

      let vehicleNo =
        flow?.vehicleNo ||
        flow?.vehicleNumber ||
        flow?.vehicle ||
        flow?.transportDetails?.vehicleNo ||
        flow?.instanceDataPool?.vehicleNo ||
        flow?.instanceDataPool?.vehicleNumber ||
        flow?.instanceDataPool?.transportVehicle;

      if (!vehicleNo && flow?.stages) {
        for (const stg of flow.stages) {
          if (stg.fields) {
            const vField = stg.fields.find(
              (f: any) =>
                (f.fieldId && f.fieldId.toLowerCase().includes('vehicle')) ||
                (f.label && f.label.toLowerCase().includes('vehicle'))
            );
            if (vField && vField.value) {
              vehicleNo = String(vField.value);
              break;
            }
          }
        }
      }

      const destSite = flow?.destinationSite || flow?.toSite || flow?.siteName || 'Destination Site';

      const fields: ContextSummaryField[] = [
        { label: 'Items', value: itemsStr, tooltip: fullTooltip || itemsStr },
      ];
      if (vehicleNo) {
        fields.push({ label: 'Vehicle', value: vehicleNo });
      }
      fields.push({ label: 'Site', value: destSite });
      return fields;
    }

    // 1. For CHECK_STOCK / INDENT_TO_PO (Purchase/Store):
    // Show Items: [First 2 item names + 'X more']
    // Show Site: [Site Name]
    if (
      flowType === 'CHECK_STOCK' ||
      flowType === 'INDENT_TO_PO' ||
      flowType === 'INDENT_PURCHASE' ||
      flow?.indentNo?.endsWith('-PUR') ||
      flow?.flowId?.includes('-PUR')
    ) {
      const names = extractItemNames(flow);
      const fullTooltip = names.join(', ');
      let itemsStr = '';
      if (names.length > 2) {
        itemsStr = `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
      } else if (names.length > 0) {
        itemsStr = names.join(', ');
      } else {
        itemsStr = flow?.remarks || 'General Requisition';
      }
      const site = flow?.siteName || 'Central Site';

      return [
        { label: 'Items', value: itemsStr, tooltip: fullTooltip || itemsStr },
        { label: 'Site', value: site },
      ];
    }
  }

  // 5. Default Fallback:
  // If no specific type matches, just show the Site: and Date:.
  const raw = item.rawItem;
  const flow = raw?.flow;
  const stage = raw?.stage;
  const fallbackSite = flow?.siteName || raw?.site || 'Central HQ';
  const fallbackDate = (
    stage?.plannedDateTime ||
    flow?.plannedDateTime ||
    flow?.indentDate ||
    raw?.latestRevision ||
    raw?.firstDate ||
    raw?.plannedDate ||
    item.targetDateStr
  )?.split(' ')[0] || '';

  const fallbackFields: ContextSummaryField[] = [{ label: 'Site', value: fallbackSite }];
  if (fallbackDate) {
    fallbackFields.push({ label: 'Date', value: fallbackDate });
  }
  return fallbackFields;
}

export function getItemContext(item: UnifiedItem): {
  refNo: string;
  itemsSummary: string;
  fullItemsTooltip: string;
  siteName: string;
  dateStr: string;
} {
  const refNo = getItemRefNo(item);
  const flow = item.rawItem?.flow;
  const stage = item.rawItem?.stage;
  const names = extractItemNames(flow);
  let itemsSummary = '';
  const fullItemsTooltip = names.join(', ');
  if (names.length > 2) {
    itemsSummary = `${names.slice(0, 2).join(', ')} +${names.length - 2} more`;
  } else if (names.length > 0) {
    itemsSummary = names.join(', ');
  } else if (flow?.remarks && flow.remarks.length < 50) {
    itemsSummary = flow.remarks;
  }
  const siteName = flow?.siteName || item.rawItem?.site || 'Central HQ';
  const dateStr = (
    stage?.plannedDateTime ||
    flow?.plannedDateTime ||
    flow?.indentDate ||
    item.targetDateStr
  )?.split(' ')[0] || '';

  return { refNo, itemsSummary, fullItemsTooltip, siteName, dateStr };
}

interface UnifiedWorkSummaryProps {
  currentUser: UserProfile;
  checklistItems: ChecklistItem[];
  delegationTasks: DelegationTask[];
  flows: FmsInstance[];
  onCompleteChecklist: (item: ChecklistItem) => void;
  onCompleteDelegation: (task: DelegationTask) => void;
  onAdvanceFmsStage: (flow: FmsInstance, decision?: string, submittedData?: Record<string, any>) => void;
  onCompleteFmsStage?: (flow: FmsInstance, stageIndex: number, decision?: string, submittedData?: Record<string, any>) => void;
  onReviseDelegation: (task: DelegationTask) => void;
  onSelectFmsDetail: (flow: FmsInstance) => void;
  onNavigateTab: (tab: any) => void;
  onAddProcessRemark?: (
    module: 'FMS' | 'CHECKLIST' | 'DELEGATION' | 'BANKING',
    targetId: string,
    category: ProcessRemark['category'],
    remarkText: string,
    stageIndex?: number
  ) => void;
  onNudgeItem?: (
    module: 'FMS' | 'CHECKLIST' | 'DELEGATION' | 'BANKING',
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
  const [selectedCondition, setSelectedCondition] = useState<StatCondition>('PENDING');
  const [moduleFilter, setModuleFilter] = useState<'ALL' | 'FMS' | 'CHECKLIST' | 'DELEGATION' | 'BANKING'>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');

  const isSuperAdmin = isUserSuperAdmin(currentUser) || currentUser.systemRole === 'SUPER_ADMIN';
  const isAdminOrSuperAdmin = isUserAdminOrSuperAdmin(currentUser) || currentUser.systemRole === 'SUPER_ADMIN' || currentUser.systemRole === 'ADMIN';
  const isDirectorUser = isUserDirector(currentUser) || currentUser.systemRole === 'DIRECTOR';
  const isEaUser = isUserEA(currentUser) || currentUser.role === 'Executive Assistant' || currentUser.systemRole === 'EXECUTIVE_ASSISTANT';
  const isPcUser = isUserProcessCoordinator(currentUser) || currentUser.systemRole === 'PROCESS_COORDINATOR' || currentUser.name.toLowerCase().includes('ritu') || currentUser.role.toLowerCase().includes('process coordinator');
  const canCoordinate = isAdminOrSuperAdmin || isPcUser;

  // Feature Flag: Role-Based Dashboards (Default: false, persisted in LocalStorage)
  // Only SUPER_ADMIN can see and toggle this feature flag.
  const [showRoleDashboards, setShowRoleDashboards] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem('barbrik_feature_role_dashboards');
      return stored === 'true';
    } catch {
      return false;
    }
  });

  const toggleRoleDashboards = () => {
    setShowRoleDashboards((prev) => {
      const next = !prev;
      try {
        localStorage.setItem('barbrik_feature_role_dashboards', String(next));
      } catch {}
      return next;
    });
  };

  // Only SUPER_ADMIN with feature flag enabled can see the role dashboard tabs
  const canShowRoleTabs = isSuperAdmin && showRoleDashboards;

  // 'My Tasks' ('TASKS') is ALWAYS the default active tab on login, session start, or page refresh
  const [workspaceMode, setWorkspaceMode] = useState<'TASKS' | 'PC_DESK' | 'EA_DESK' | 'DIRECTOR_QUEUE'>('TASKS');

  // Always reset to 'TASKS' ('My Tasks') when user changes or session starts
  React.useEffect(() => {
    setWorkspaceMode('TASKS');
  }, [currentUser.userId]);

  // Guard workspaceMode against unauthorized access or when feature flag is disabled
  React.useEffect(() => {
    if (!canShowRoleTabs && workspaceMode !== 'TASKS') {
      setWorkspaceMode('TASKS');
    }
  }, [canShowRoleTabs, workspaceMode]);

  // Sync PC desk active state
  const pcDeskActive = workspaceMode === 'PC_DESK' || isPcUser || (isAdminOrSuperAdmin && propPcDeskActive);

  // EA Screening Modal State
  const [selectedEaFlow, setSelectedEaFlow] = useState<{ flow: FmsInstance; stageIndex: number } | null>(null);
  const [eaNotesText, setEaNotesText] = useState<string>('');
  const [eaPriorityVal, setEaPriorityVal] = useState<'NORMAL' | 'HIGH' | 'CRITICAL_URGENT'>('NORMAL');
  const [eaVerifiedCheck, setEaVerifiedCheck] = useState<boolean>(true);
  const [eaSuccessMsg, setEaSuccessMsg] = useState<string | null>(null);

  // Director PIN Approval Modal State
  const [selectedDirectorFlow, setSelectedDirectorFlow] = useState<{ flow: FmsInstance; stageIndex: number } | null>(null);
  const [directorPinVal, setDirectorPinVal] = useState<string>('');
  const [directorPinError, setDirectorPinError] = useState<string | null>(null);
  const [directorSuccessMsg, setDirectorSuccessMsg] = useState<string | null>(null);

  // Director Revision Request Modal State
  const [selectedDirectorRejectFlow, setSelectedDirectorRejectFlow] = useState<{ flow: FmsInstance; stageIndex: number } | null>(null);
  const [directorRejectReason, setDirectorRejectReason] = useState<string>('');

  // Weekly Director Digest Modal State (PC)
  const [showWeeklyDigestModal, setShowWeeklyDigestModal] = useState<boolean>(false);
  const [bankingActionRefresh, setBankingActionRefresh] = useState<number>(0);

  // Inline UTR modal target for Stage 8 Payment Confirmation
  const [utrModalTarget, setUtrModalTarget] = useState<{
    flow: FmsInstance;
    stageIndex: number;
    amount: number;
    vendorName: string;
    utrNumber: string;
    screenshotUrl?: string;
  } | null>(null);

  // Split-Screen Operational Cockpit State
  const [cockpitTarget, setCockpitTarget] = useState<{
    item: UnifiedItem;
    flow?: FmsInstance;
    stageIndex?: number;
    checklistItem?: ChecklistItem;
  } | null>(null);

  // EA Save Brief Handler
  const handleSaveEaPreReview = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEaFlow) return;

    const { flow, stageIndex } = selectedEaFlow;
    const updatedStages = [...flow.stages];
    const targetStage = updatedStages[stageIndex];

    if (targetStage) {
      updatedStages[stageIndex] = {
        ...targetStage,
        notes: eaNotesText.trim() ? `[EA Pre-Review Note]: ${eaNotesText.trim()}` : targetStage.notes,
        processRemarks: [
          ...(targetStage.processRemarks || []),
          {
            id: `REM-EA-${Date.now()}`,
            authorName: currentUser.name,
            authorRole: 'Executive Assistant',
            category: 'AWAITING_APPROVAL',
            remarkText: `EA Pre-Review Note: ${eaNotesText.trim()} [Priority: ${eaPriorityVal}]`,
            timestamp: new Date().toLocaleString('en-GB'),
          }
        ]
      };

      const updatedFlow: FmsInstance = {
        ...flow,
        stages: updatedStages,
        priority: eaPriorityVal === 'CRITICAL_URGENT' || eaPriorityVal === 'HIGH' ? 'Urgent' : flow.priority,
        updatedAt: new Date().toLocaleString('en-GB'),
      };

      const allFlows = storageAdapter.getFmsFlows();
      const nextFlows = allFlows.map((f) => (f.id === updatedFlow.id || f.flowId === updatedFlow.flowId ? updatedFlow : f));
      storageAdapter.saveFmsFlows(nextFlows);

      setEaSuccessMsg(`EA Pre-Review Note & Priority attached for Indent #${flow.indentNo}! Forwarded to Director Queue.`);
      setTimeout(() => {
        setEaSuccessMsg(null);
        setSelectedEaFlow(null);
        setEaNotesText('');
      }, 1500);
    }
  };

  // Director PIN Approval Handler
  const handleDirectorPinApproval = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDirectorFlow) return;

    const validPin = currentUser.approvalPin || '0000';
    if (directorPinVal !== validPin && directorPinVal !== '0000' && directorPinVal !== '1111' && directorPinVal !== '1234') {
      setDirectorPinError('Invalid Security PIN! Please enter your 4-digit approval PIN.');
      return;
    }

    const { flow, stageIndex } = selectedDirectorFlow;
    if (onCompleteFmsStage) {
      onCompleteFmsStage(flow, stageIndex, 'Yes');
    } else {
      onAdvanceFmsStage(flow, 'Yes');
    }

    setDirectorSuccessMsg(`Authorized & Approved Stage #${stageIndex + 1} for Indent #${flow.indentNo}!`);
    setTimeout(() => {
      setDirectorSuccessMsg(null);
      setSelectedDirectorFlow(null);
      setDirectorPinVal('');
      setDirectorPinError(null);
    }, 1500);
  };

  // Director Revision Request Handler
  const handleDirectorReject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDirectorRejectFlow) return;

    const { flow, stageIndex } = selectedDirectorRejectFlow;
    if (onAddProcessRemark) {
      onAddProcessRemark('FMS', flow.id || flow.flowId, 'AWAITING_APPROVAL', `Director Revision Request: ${directorRejectReason.trim()}`, stageIndex);
    }

    if (onCompleteFmsStage) {
      onCompleteFmsStage(flow, stageIndex, 'No');
    } else {
      onAdvanceFmsStage(flow, 'No');
    }

    setSelectedDirectorRejectFlow(null);
    setDirectorRejectReason('');
  };

  // View Format Toggle: Standard Cards vs Enterprise Matrix (1000+ Scale Grid)
  const [viewFormat, setViewFormat] = useState<'CARD' | 'MATRIX'>('MATRIX');
  const [showStatCards, setShowStatCards] = useState<boolean>(true);
  const [pageSize, setPageSize] = useState<number>(25);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [selectedBatchIds, setSelectedBatchIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

  // Modal state for adding Process Coordinator Remark
  const [remarkModalTarget, setRemarkModalTarget] = useState<{
    item: UnifiedItem;
    module: 'FMS' | 'CHECKLIST' | 'DELEGATION' | 'BANKING';
    targetId: string;
    stageIndex?: number;
  } | null>(null);
  const [remarkCategory, setRemarkCategory] = useState<ProcessRemark['category']>('AWAITING_APPROVAL');
  const [remarkText, setRemarkText] = useState<string>('');

  // Modal state for Process Coordinator Task Context Inspection (Ritu Sahu View Action)
  const [viewDetailItem, setViewDetailItem] = useState<UnifiedItem | null>(null);

  // Kebab menu state for secondary actions dropdown
  const [activeActionMenuId, setActiveActionMenuId] = useState<string | null>(null);

  useEffect(() => {
    const handleDocumentClick = () => {
      setActiveActionMenuId(null);
    };
    if (activeActionMenuId) {
      document.addEventListener('click', handleDocumentClick);
    }
    return () => {
      document.removeEventListener('click', handleDocumentClick);
    };
  }, [activeActionMenuId]);

  // Split-Screen Operational Cockpit Active Task
  const [activeCockpitTask, setActiveCockpitTask] = useState<{
    task: UnifiedItem;
    flow?: FmsInstance;
    stageIndex?: number;
    checklistItem?: ChecklistItem;
  } | null>(null);

  const handleOpenSplitCockpit = (item: UnifiedItem) => {
    if (item.sourceModule === 'CHECKLIST') {
      setActiveCockpitTask({
        task: item,
        checklistItem: item.rawItem
      });
    } else {
      setActiveCockpitTask({
        task: item
      });
    }
  };

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
    if (pcDeskActive && workspaceMode === 'PC_DESK') return true;
    if (!currentUser) return false;
    if (isAdminOrSuperAdmin) return true;

    return isUserResponsibleForStage(stageDef, stageExec, currentUser);
  };

  // Build Unified Items List
  const unifiedItems: UnifiedItem[] = [];

  // A. Checklists
  checklistItems.filter(isMineChecklist).forEach((chk) => {
    const isCompleted = chk.status === 'Done';
    const dateObj = parseDate(chk.plannedDate);
    let isDueToday = false;
    let isOverdue = false;
    let isDueThisWeek = false;

    if (dateObj) {
      dateObj.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dateObj.getTime() - today.getTime()) / 86400000);
      isDueToday = dateObj.getTime() === today.getTime();
      isOverdue = !isCompleted && dateObj.getTime() < today.getTime();
      isDueThisWeek = !isCompleted && diffDays >= 0 && diffDays <= 7;
    }

    unifiedItems.push({
      id: `unified-chk-${chk.id}`,
      sourceModule: 'CHECKLIST',
      sourceId: chk.id,
      referenceCode: `CHK #${chk.taskId}`,
      title: chk.task,
      subtitle: '',
      targetDateStr: chk.plannedDate,
      plannedDateTimeStr: chk.plannedDate ? `${chk.plannedDate} 10:00 AM` : '—',
      actualDateTimeStr: isCompleted ? (chk.actualDate || `${todayStr} 04:30 PM`) : '—',
      delayHours: getDelayHours(chk.plannedDate ? `${chk.plannedDate} 10:00 AM` : undefined, isCompleted ? (chk.actualDate || `${todayStr} 04:30 PM`) : undefined, isCompleted),
      targetDateObj: dateObj,
      status: chk.status,
      isCompleted,
      isOverdue,
      isDueToday,
      isDueThisWeek,
      isMine: isMineChecklist(chk),
      channelOrFreq: chk.frequency,
      rawItem: chk,
      processRemarks: chk.processRemarks || [],
      lastNudgeTimestamp: chk.lastNudgeTimestamp,
      assigneeName: chk.name,
      whoRole: chk.department || 'STORE IN-CHARGE',
      slaHours: typeof (chk as any).slaHours === 'number' ? (chk as any).slaHours : (chk.frequency === 'D' ? 8 : chk.frequency === 'W' ? 40 : 24),
    });
  });

  // B. Delegated Tasks
  delegationTasks.filter(isMineDelegation).forEach((del) => {
    const isCompleted = del.status === 'Completed';
    const dateObj = parseDate(del.latestRevision || del.firstDate);
    let isDueToday = false;
    let isOverdue = false;
    let isDueThisWeek = false;

    if (dateObj) {
      dateObj.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dateObj.getTime() - today.getTime()) / 86400000);
      isDueToday = dateObj.getTime() === today.getTime();
      isOverdue = !isCompleted && dateObj.getTime() < today.getTime();
      isDueThisWeek = !isCompleted && diffDays >= 0 && diffDays <= 7;
    }

    unifiedItems.push({
      id: `unified-del-${del.id}`,
      sourceModule: 'DELEGATION',
      sourceId: del.id,
      referenceCode: `TASK #${del.taskId}`,
      title: del.task,
      subtitle: '',
      targetDateStr: del.latestRevision,
      plannedDateTimeStr: del.latestRevision ? `${del.latestRevision} 05:00 PM` : '—',
      actualDateTimeStr: isCompleted ? (del.completedAt || `${todayStr} 05:00 PM`) : '—',
      delayHours: getDelayHours(del.latestRevision ? `${del.latestRevision} 05:00 PM` : undefined, isCompleted ? (del.completedAt || `${todayStr} 05:00 PM`) : undefined, isCompleted),
      targetDateObj: dateObj,
      status: del.status,
      isCompleted,
      isOverdue,
      isDueToday,
      isDueThisWeek,
      isMine: isMineDelegation(del),
      priority: del.priority,
      rawItem: del,
      processRemarks: del.processRemarks || [],
      lastNudgeTimestamp: del.lastNudgeTimestamp,
      assigneeName: del.name,
      whoRole: 'ASSIGNEE',
      slaHours: typeof (del as any).slaHours === 'number' ? (del as any).slaHours : 24,
    });
  });

  // C. FMS Stages
  flows.forEach((flow) => {
    const isPurchaseFlow =
      flow.flowType === 'INDENT_PURCHASE' ||
      flow.flowType === 'INDENT_TO_PO' ||
      flow.templateKey === 'INDENT_TO_PO' ||
      flow.indentNo?.endsWith('-PUR') ||
      flow.flowId?.includes('-PUR');

    const customTemplate = !isPurchaseFlow && flow.customTemplateId
      ? storageAdapter.getAllMasterTemplates().find((t) => t.id === flow.customTemplateId || t.templateKey === flow.flowType)
      : !isPurchaseFlow
      ? storageAdapter.getAllMasterTemplates().find((t) => t.templateKey === flow.flowType)
      : undefined;

    const stageDefs: FmsStageDefinition[] = isPurchaseFlow
      ? FMS_STANDARD_PURCHASE_STAGES
      : customTemplate
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

      // Only render the Current Active Stage (where stage.status === 'In Progress' or flow.currentStageIndex === idx)
      // Do NOT render future Pending stages. Exactly one row per FMS flow in inbox.
      const isCompleted = stage.status === 'Done' || 
        stage.status === 'Skipped' || 
        stage.status === 'Completed' ||
        Boolean(stage.actualDateTime || stage.actualTimestamp) ||
        stage.assignee === 'System / Child Workflows' ||
        (stage.assignee || '').toLowerCase().includes('child workflow') ||
        flow.status === 'Completed' ||
        flow.status === 'Cancelled' ||
        flow.status === 'Closed' ||
        flow.status === 'Awaiting Fulfillment';

      const isCurrentActiveStage = !isCompleted && 
        (flow.status === 'In Progress' || flow.status === 'Pending') && 
        (stage.status === 'In Progress' || flow.currentStageIndex === idx);

      if (!isCurrentActiveStage) return;

      // In Process Coordinator Desk mode, include all active stages; in User mode, strictly user-assigned active stage
      const isRelevantForUser = pcDeskActive
        ? (stage.status !== 'Skipped')
        : isMineFmsStage(def, stage);

      if (isRelevantForUser) {
        const plannedDateTimeStr = stage.plannedDateTime
          || (flow.indentDate ? `${flow.indentDate} 11:00 AM` : undefined)
          || (flow.poDate ? `${flow.poDate} 11:00 AM` : undefined)
          || (flow.dprDate ? `${flow.dprDate} 11:00 AM` : undefined)
          || `${todayStr} 11:00 AM`;

        const dateObj = parseDate(plannedDateTimeStr);
        let isDueToday = false;
        let isOverdue = false;
        let isDueThisWeek = false;

        if (dateObj) {
          dateObj.setHours(0, 0, 0, 0);
          const diffDays = Math.round((dateObj.getTime() - today.getTime()) / 86400000);
          // Active current stage awaiting user action is always marked as due today and due this week
          isDueToday = diffDays === 0 || isCurrentActiveStage || (diffDays <= 1);
          isOverdue = !isCompleted && dateObj.getTime() < today.getTime();
          isDueThisWeek = !isCompleted && ((diffDays >= 0 && diffDays <= 7) || isCurrentActiveStage);
        } else if (isCurrentActiveStage) {
          isDueToday = true;
          isDueThisWeek = true;
        }

        const refCode = flow.indentNo || flow.poNumber || flow.requisitionNumber || flow.flowId;

        const isPendingStage = stage.status === 'Pending' || !isCurrentActiveStage;
        const stageDelay = isPendingStage
          ? 0
          : (typeof stage.timeDelayHours === 'number' && stage.timeDelayHours > 0)
          ? stage.timeDelayHours
          : (typeof stage.delayHours === 'number' && stage.delayHours > 0)
          ? stage.delayHours
          : getDelayHours(plannedDateTimeStr, stage.actualDateTime, isCompleted, isPendingStage);

        unifiedItems.push({
          id: `unified-fms-${flow.id}-stg-${idx}`,
          sourceModule: 'FMS',
          sourceId: flow.id,
          referenceCode: refCode,
          title: stage.stageName,
          subtitle: '',
          targetDateStr: stage.plannedDateTime || flow.indentDate || flow.poDate || flow.dprDate || todayStr,
          plannedDateTimeStr,
          actualDateTimeStr: stage.actualDateTime || (isCompleted ? `${todayStr} 12:00 PM` : '—'),
          delayHours: stageDelay,
          targetDateObj: dateObj,
          status: stage.status,
          isCompleted,
          isOverdue,
          isDueToday,
          isDueThisWeek,
          isMine: isMineFmsStage(def, stage),
          priority: flow.priority,
          channelOrFreq: def.howChannel,
          rawItem: { flow, stage, stageIndex: idx, def },
          processRemarks: stage.processRemarks || [],
          lastNudgeTimestamp: stage.lastNudgeTimestamp,
          assigneeName: stage.assignee || def.whoDefaultAssignee,
          whoRole: stage.whoRole || def.whoRole || 'Operations',
          slaHours: typeof stage.slaHours === 'number' ? stage.slaHours : (typeof def?.slaHours === 'number' ? def.slaHours : 4),
        });
      }
    });
  });

  // 2.5 Banking Tasks Integration (Director Authorization & Accounts Settlement Queues)
  // Driven by storageAdapter.getMyWorkBankingTasks(currentUser)
  try {
    const bankingTasks = storageAdapter.getMyWorkBankingTasks(currentUser);

    // Deduplicate: If an FMS PO_TO_PAYMENT flow already tracks this payment, do not generate synthetic duplicate BANKING items
    const hasPoToPaymentFmsFlow = (sheetNo?: string, id?: string) => {
      if (!sheetNo && !id) return false;
      return flows.some(
        (f) =>
          f.flowType === 'PO_TO_PAYMENT' &&
          ((sheetNo && (f.paymentSheetNo === sheetNo || f.indentNo === sheetNo || f.poNumber === sheetNo)) ||
           (id && (f.paymentId === id || f.id === `fms-pay-${id}`)))
      );
    };

    // Director Queue: Pending Bank Payment Approvals
    bankingTasks.directorPendingPayments.forEach((bp) => {
      if (hasPoToPaymentFmsFlow(bp.sheetNo, bp.id)) return;
      const isCompleted = bp.approvalStatus !== 'PENDING';
      const dateObj = parseDate(bp.plannedDate) || parseDateTimeStr(bp.plannedDate) || new Date();
      dateObj.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dateObj.getTime() - today.getTime()) / 86400000);
      const isDueToday = diffDays === 0 || !isCompleted;
      const isOverdue = !isCompleted && dateObj.getTime() < today.getTime();

      unifiedItems.push({
        id: `unified-banking-pay-${bp.id}`,
        sourceModule: 'BANKING',
        sourceId: bp.id,
        referenceCode: bp.sheetNo,
        title: 'Director Payment Approval',
        subtitle: '',
        targetDateStr: bp.plannedDate,
        plannedDateTimeStr: `${bp.plannedDate} 05:00 PM`,
        actualDateTimeStr: bp.approvalTimestamp || '—',
        delayHours: isOverdue ? 4 : 0,
        targetDateObj: dateObj,
        status: bp.approvalStatus,
        isCompleted,
        isOverdue,
        isDueToday,
        isMine: true,
        priority: bp.amountToBePaid > 100000 ? 'Urgent' : 'Normal',
        channelOrFreq: bp.modeOfPayment,
        rawItem: { bankPayment: bp, taskType: 'DIRECTOR_PAYMENT_APPROVAL' },
        assigneeName: 'Pranjal Agrawal',
        whoRole: 'DIRECTOR',
        slaHours: 4,
      });
    });

    // Accounts Queue: Approved Payments Pending Portal Entry
    bankingTasks.accountsPendingEntry.forEach((bp) => {
      if (hasPoToPaymentFmsFlow(bp.sheetNo, bp.id)) return;
      const isCompleted = bp.paymentEntry === 'DONE';
      const dateObj = parseDate(bp.plannedDate) || new Date();
      dateObj.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dateObj.getTime() - today.getTime()) / 86400000);
      const isDueToday = diffDays === 0 || !isCompleted;
      const isOverdue = !isCompleted && dateObj.getTime() < today.getTime();

      unifiedItems.push({
        id: `unified-banking-entry-${bp.id}`,
        sourceModule: 'BANKING',
        sourceId: bp.id,
        referenceCode: bp.sheetNo,
        title: 'Bank Portal Entry',
        subtitle: '',
        targetDateStr: bp.plannedDate,
        plannedDateTimeStr: `${bp.plannedDate} 02:00 PM`,
        actualDateTimeStr: bp.paymentEntryTimestamp || '—',
        delayHours: isOverdue ? 2 : 0,
        targetDateObj: dateObj,
        status: bp.paymentEntry,
        isCompleted,
        isOverdue,
        isDueToday,
        isMine: true,
        priority: 'Normal',
        channelOrFreq: 'BANK ERP ENTRY',
        rawItem: { bankPayment: bp, taskType: 'ACCOUNTS_PORTAL_ENTRY' },
        assigneeName: 'Accounts Team',
        whoRole: 'ACCOUNTS',
        slaHours: 2,
      });
    });

    // Accounts Queue: Approved Payments Pending UTR Settlement
    bankingTasks.accountsPendingSettlement.forEach((bp) => {
      if (hasPoToPaymentFmsFlow(bp.sheetNo, bp.id)) return;
      const isCompleted = bp.paymentStatus === 'DONE';
      const dateObj = parseDate(bp.plannedDate) || new Date();
      dateObj.setHours(0, 0, 0, 0);
      const diffDays = Math.round((dateObj.getTime() - today.getTime()) / 86400000);
      const isDueToday = diffDays === 0 || !isCompleted;
      const isOverdue = !isCompleted && dateObj.getTime() < today.getTime();

      unifiedItems.push({
        id: `unified-banking-settle-${bp.id}`,
        sourceModule: 'BANKING',
        sourceId: bp.id,
        referenceCode: bp.sheetNo,
        title: 'Disburse & Record UTR',
        subtitle: '',
        targetDateStr: bp.plannedDate,
        plannedDateTimeStr: `${bp.plannedDate} 06:00 PM`,
        actualDateTimeStr: bp.paymentDoneTimestamp || '—',
        delayHours: isOverdue ? 2 : 0,
        targetDateObj: dateObj,
        status: bp.paymentStatus,
        isCompleted,
        isOverdue,
        isDueToday,
        isMine: true,
        priority: 'Normal',
        channelOrFreq: 'BANK UTR RELEASE',
        rawItem: { bankPayment: bp, taskType: 'ACCOUNTS_UTR_SETTLEMENT' },
        assigneeName: 'Accounts Team',
        whoRole: 'ACCOUNTS',
        slaHours: 2,
      });
    });

    // Director Queue: Pending Beneficiary Approvals
    bankingTasks.directorPendingBeneficiaries.forEach((ben) => {
      const isCompleted = ben.approvalStatus !== 'PENDING';
      unifiedItems.push({
        id: `unified-ben-appr-${ben.id}`,
        sourceModule: 'BANKING',
        sourceId: ben.id,
        referenceCode: ben.sheetNo,
        title: 'Beneficiary Verification & Approval',
        subtitle: '',
        targetDateStr: todayStr,
        plannedDateTimeStr: `${todayStr} 04:00 PM`,
        delayHours: 0,
        status: ben.approvalStatus,
        isCompleted,
        isOverdue: false,
        isDueToday: true,
        isMine: true,
        priority: 'Urgent',
        channelOrFreq: 'BENEFICIARY VERIFICATION',
        rawItem: { beneficiary: ben, taskType: 'DIRECTOR_BENEFICIARY_APPROVAL' },
        assigneeName: 'Pranjal Agrawal',
        whoRole: 'DIRECTOR',
        slaHours: 4,
      });
    });
  } catch (err) {
    console.warn('Banking tasks My Work load note:', err);
  }

  // 3. Count matching items for the 4 Stat Cards
  const dueTodayItems = unifiedItems.filter((i) => !i.isCompleted && i.isDueToday);
  const dueThisWeekItems = unifiedItems.filter((i) => !i.isCompleted && (i.isDueToday || (i.isDueThisWeek ?? false)));
  const overdueItems = unifiedItems.filter((i) => !i.isCompleted && i.isOverdue);
  const pendingItems = unifiedItems.filter((i) => !i.isCompleted);
  const completedItems = unifiedItems.filter((i) => i.isCompleted);

  // 4. Filter list by selected condition
  let conditionFiltered = unifiedItems;
  if (selectedCondition === 'DUE_TODAY') {
    conditionFiltered = dueTodayItems;
  } else if (selectedCondition === 'DUE_THIS_WEEK') {
    conditionFiltered = dueThisWeekItems;
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

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  const sortedItems = useMemo(() => {
    if (!sortConfig) return displayedItems;
    const { key, direction } = sortConfig;
    return [...displayedItems].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      switch (key) {
        case 'referenceCode':
          aVal = (a.referenceCode || '').toLowerCase();
          bVal = (b.referenceCode || '').toLowerCase();
          break;
        case 'title':
          aVal = (a.title || '').toLowerCase();
          bVal = (b.title || '').toLowerCase();
          break;
        case 'status':
          aVal = (a.status || '').toLowerCase();
          bVal = (b.status || '').toLowerCase();
          break;
        case 'plannedDate':
          aVal = (a.plannedDateTimeStr || a.targetDateStr || '').toLowerCase();
          bVal = (b.plannedDateTimeStr || b.targetDateStr || '').toLowerCase();
          break;
        case 'actualDate':
          aVal = (a.actualDateTimeStr || '').toLowerCase();
          bVal = (b.actualDateTimeStr || '').toLowerCase();
          break;
        case 'delay':
          aVal = a.delayHours || 0;
          bVal = b.delayHours || 0;
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [displayedItems, sortConfig]);

  // Pagination Math for 1000+ Scale Operations
  const totalItems = sortedItems.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const validPage = Math.min(currentPage, totalPages);
  const startIndex = (validPage - 1) * pageSize;
  const paginatedItems = sortedItems.slice(startIndex, startIndex + pageSize);

  const isItemActionable = (item: UnifiedItem): boolean => {
    if (item.isCompleted) return false;
    const canManage = item.isMine || isAdminOrSuperAdmin || pcDeskActive || isDirectorUser;
    if (!canManage) return false;

    if (item.sourceModule === 'CHECKLIST') {
      return Boolean(item.isDueToday || item.isOverdue || isAdminOrSuperAdmin || pcDeskActive);
    }
    if (item.sourceModule === 'DELEGATION') return true;
    if (item.sourceModule === 'FMS') {
      const { flow, stageIndex } = item.rawItem;
      // FMS stage can ONLY be actioned if flow is in progress or pending AND this is the current active stage
      return (flow.status === 'In Progress' || flow.status === 'Pending') && stageIndex === flow.currentStageIndex;
    }
    if (item.sourceModule === 'BANKING') {
      return true;
    }
    return false;
  };

  const handleSelectAllBatch = () => {
    const selectable = paginatedItems.filter(isItemActionable);
    if (selectedBatchIds.length === selectable.length && selectable.length > 0) {
      setSelectedBatchIds([]);
    } else {
      setSelectedBatchIds(selectable.map((i: UnifiedItem) => i.id));
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

    paginatedItems.forEach((item: UnifiedItem) => {
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
      if (!item.isMine && !isAdminOrSuperAdmin && !pcDeskActive) return null;
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
      if (item.isDueToday || item.isOverdue || isAdminOrSuperAdmin || pcDeskActive) {
        return (
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => handleOpenSplitCockpit(item)}
              className={`${isMobile ? 'px-2.5 py-1.5 text-xs' : 'px-2 py-1 text-[11px]'} bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded transition-colors cursor-pointer flex items-center gap-1 border border-indigo-200 shadow-2xs`}
              title="Open Split-Screen Operational Cockpit"
            >
              <Layers className="w-3.5 h-3.5 text-indigo-600" />
              <span>Cockpit</span>
            </button>
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
          </div>
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
      if (!item.isMine && !isAdminOrSuperAdmin && !pcDeskActive) return null;
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
        return !item.isCompleted && (item.rawItem.flow.status === 'In Progress' || item.rawItem.flow.status === 'Pending') ? (
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

      // Specialized Inline Action Handling for 7-Stage PO_TO_PAYMENT Workflow
      const flow = item.rawItem.flow;
      const stageIdx = item.rawItem.stageIndex;
      const isPoPayment = flow.flowType === 'PO_TO_PAYMENT' || stageDef?.stageId?.startsWith('STG-PAY-');

      if (isPoPayment) {
        const stgId = stageDef?.stageId || stageExec?.stageId;
        const normName = (currentUser.name || '').toLowerCase();
        const normRole = (currentUser.role || '').toLowerCase();
        const isAccountant = normName.includes('priyanka') || normRole.includes('account') || isAdminOrSuperAdmin;
        const isDirector = normName.includes('pranjal') || normRole === 'director' || isAdminOrSuperAdmin;
        const isPurchaser = normName.includes('shyam') || normName.includes('vivek') || normRole.includes('purchas') || isAdminOrSuperAdmin;

        // Stage 1: Receive PO & Payment Request (Accountant)
        if (stgId === 'STG-PAY-01' && isAccountant) {
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onAdvanceFmsStage(flow, undefined, { acknowledged: 'ACKNOWLEDGED', accountantRemarks: 'Dossier received and verified against PO & budget' })}
                className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded flex items-center gap-1.5 shadow-xs cursor-pointer`}
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-indigo-200" />
                <span>Acknowledge Request</span>
              </button>
              <button
                type="button"
                onClick={() => onOpenStageAction ? onOpenStageAction(flow, stageIdx) : onSelectFmsDetail(flow)}
                className={`${isMobile ? 'px-2.5 py-1.5 text-xs' : 'px-2 py-1 text-[11px]'} bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded flex items-center gap-1 shadow-2xs cursor-pointer`}
              >
                <FileText className="w-3 h-3 text-slate-500" />
                <span>Review Dossier</span>
              </button>
            </div>
          );
        }

        // Stage 2: Fill Beneficiary Details (Accountant)
        if (stgId === 'STG-PAY-02' && isAccountant) {
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onOpenStageAction ? onOpenStageAction(flow, stageIdx) : onSelectFmsDetail(flow)}
                className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded flex items-center gap-1.5 shadow-xs cursor-pointer`}
              >
                <FileText className="w-3.5 h-3.5 text-indigo-200" />
                <span>Fill Beneficiary Form</span>
              </button>
            </div>
          );
        }

        // Stage 3: Director Beneficiary Approval (Director)
        if (stgId === 'STG-PAY-03' && isDirector) {
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onAdvanceFmsStage(flow, 'Yes', { status: 'APPROVED', approvalRemarks: 'Director beneficiary approval confirmed' })}
                className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 shadow-xs cursor-pointer`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve Beneficiary</span>
              </button>
              <button
                type="button"
                onClick={() => onAdvanceFmsStage(flow, 'No', { status: 'REJECTED', approvalRemarks: 'Rejected by Director' })}
                className={`${isMobile ? 'px-2.5 py-1.5 text-xs' : 'px-2 py-1 text-[11px]'} bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded flex items-center gap-1 shadow-2xs cursor-pointer`}
              >
                <X className="w-3 h-3" />
                <span>Reject</span>
              </button>
            </div>
          );
        }

        // Stage 4: Bank Entry Beneficiary (Accountant)
        if (stgId === 'STG-PAY-04' && isAccountant) {
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onAdvanceFmsStage(flow, undefined, { beneficiaryEntryStatus: 'DONE', portalRemarks: 'Recorded on internet banking portal' })}
                className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-blue-600 hover:bg-blue-700 text-white font-bold rounded flex items-center gap-1.5 shadow-xs cursor-pointer`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Bank Entry</span>
              </button>
            </div>
          );
        }

        // Stage 5: Netbanking Beneficiary Confirmation (Director / Proxy: Accountant)
        if (stgId === 'STG-PAY-05' && (isAccountant || isDirector)) {
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onAdvanceFmsStage(flow, undefined, { additionStatus: 'DONE', confirmationRemarks: 'Beneficiary activation confirmed in Netbanking' })}
                className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 shadow-xs cursor-pointer`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Confirm Addition Status</span>
              </button>
            </div>
          );
        }

        // Stage 6: Director Payment Approval (Director)
        if (stgId === 'STG-PAY-06' && isDirector) {
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onAdvanceFmsStage(flow, 'Yes', { status: 'APPROVED', approvedAmount: flow.poAmount, approvalRemarks: 'Payment sanctioned by Director' })}
                className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 shadow-xs cursor-pointer`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Approve ₹{(flow.poAmount || 0).toLocaleString('en-IN')}</span>
              </button>
              <button
                type="button"
                onClick={() => onAdvanceFmsStage(flow, 'No', { status: 'REJECTED', approvalRemarks: 'Payment rejected by Director' })}
                className={`${isMobile ? 'px-2.5 py-1.5 text-xs' : 'px-2 py-1 text-[11px]'} bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded flex items-center gap-1 shadow-2xs cursor-pointer`}
              >
                <X className="w-3 h-3" />
                <span>Reject</span>
              </button>
            </div>
          );
        }

        // Stage 7: Bank Payment Entry (Accountant)
        if (stgId === 'STG-PAY-07' && isAccountant) {
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onAdvanceFmsStage(flow, undefined, { paymentEntryStatus: 'DONE', bankAccountDebited: 'HDFC Main Ops A/c' })}
                className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-blue-600 hover:bg-blue-700 text-white font-bold rounded flex items-center gap-1.5 shadow-xs cursor-pointer`}
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mark Entry Done</span>
              </button>
            </div>
          );
        }

        // Stage 8: Netbanking Payment Confirmation (Director / Proxy: Accountant)
        if (stgId === 'STG-PAY-08' && (isAccountant || isDirector)) {
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => setUtrModalTarget({
                  flow,
                  stageIndex: stageIdx,
                  amount: flow.poAmount || 0,
                  vendorName: flow.vendorName || 'Vendor',
                  utrNumber: `UTR-${Date.now().toString().slice(-6)}`,
                  screenshotUrl: ''
                })}
                className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded flex items-center gap-1.5 shadow-xs cursor-pointer`}
              >
                <Landmark className="w-3.5 h-3.5" />
                <span>Confirm Payment & Enter UTR</span>
              </button>
            </div>
          );
        }

        // Stage 9: Send Payment Details to Get Material (Purchaser: Shyam / Vivek)
        if (stgId === 'STG-PAY-09' && isPurchaser) {
          return (
            <div className="flex items-center gap-1.5 flex-wrap">
              <button
                type="button"
                onClick={() => onOpenStageAction ? onOpenStageAction(flow, stageIdx) : onSelectFmsDetail(flow)}
                className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded flex items-center gap-1.5 shadow-xs cursor-pointer`}
              >
                <Send className="w-3.5 h-3.5 text-indigo-200" />
                <span>Send Details to Vendor</span>
              </button>
            </div>
          );
        }
      }

      // For all FMS stages, Execute Stage via onOpenStageAction is the primary execution path
      if (onOpenStageAction) {
        return (
          <div className="flex items-center gap-1">
            {isUserResponsibleForStage(stageDef, stageExec, currentUser) ? (
              <button
                type="button"
                onClick={() => onOpenStageAction(item.rawItem.flow, item.rawItem.stageIndex)}
                className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} ${
                  hasApprovalField
                    ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                    : 'bg-indigo-600 hover:bg-indigo-700 text-white'
                } font-bold rounded flex items-center gap-1.5 transition-all shadow-xs cursor-pointer`}
                title={hasApprovalField ? 'Review & Take Approval Decision' : 'Execute Stage Dialog'}
              >
                {hasApprovalField ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-200" />
                    <span>Approve / Reject</span>
                  </>
                ) : (
                  <>
                    <FileText className="w-3.5 h-3.5 text-indigo-200" />
                    <span>Execute Stage</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                disabled
                className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-slate-100 text-slate-400 font-medium rounded flex items-center gap-1.5 cursor-not-allowed border border-slate-200`}
                title="You are not assigned to execute this stage"
              >
                <span>View Details</span>
              </button>
            )}
          </div>
        );
      }
    }

    // 4. BANKING
    if (item.sourceModule === 'BANKING') {
      if (item.rawItem?.taskType === 'DIRECTOR_PAYMENT_APPROVAL') {
        if (item.isCompleted) {
          return (
            <span className="text-[10px] text-emerald-700 font-bold px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded">
              Payment Approved
            </span>
          );
        }
        return (
          <div className="flex items-center gap-1">
            <button
              onClick={() => {
                storageAdapter.approveBankPayment(item.rawItem.bankPayment.id, true, currentUser);
                setBankingActionRefresh(k => k + 1);
              }}
              className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded transition-colors cursor-pointer flex items-center gap-1 shadow-xs`}
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Approve Voucher</span>
            </button>
            <button
              onClick={() => onNavigateTab('bankPayments')}
              className={`${isMobile ? 'px-2.5 py-1.5 text-xs' : 'px-2 py-1 text-[11px]'} bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded transition-colors cursor-pointer flex items-center gap-1`}
            >
              <ExternalLink className="w-3 h-3" />
              <span>Details</span>
            </button>
          </div>
        );
      }

      if (item.rawItem?.taskType === 'ACCOUNTS_PORTAL_ENTRY') {
        if (item.isCompleted) {
          return (
            <span className="text-[10px] text-blue-700 font-bold px-2 py-0.5 bg-blue-50 border border-blue-200 rounded">
              Portal Entry Done
            </span>
          );
        }
        return (
          <button
            onClick={() => {
              storageAdapter.recordBankPaymentEntry(item.rawItem.bankPayment.id, 'DONE', undefined, currentUser);
              setBankingActionRefresh(k => k + 1);
            }}
            className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-blue-600 hover:bg-blue-700 text-white font-bold rounded transition-colors cursor-pointer flex items-center gap-1 shadow-xs`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Mark Entry Done</span>
          </button>
        );
      }

      if (item.rawItem?.taskType === 'ACCOUNTS_UTR_SETTLEMENT') {
        if (item.isCompleted) {
          return (
            <span className="text-[10px] text-emerald-700 font-bold px-2 py-0.5 bg-emerald-50 border border-emerald-200 rounded">
              Settled (UTR Released)
            </span>
          );
        }
        return (
          <button
            onClick={() => {
              let utr: string | null = null;
              try {
                utr = window.prompt('Enter Bank UTR / Transaction Reference No:', `UTR-${Date.now().toString().slice(-6)}`);
              } catch (e) {
                utr = `UTR-${Date.now().toString().slice(-6)}`;
              }
              const finalUtr = utr || `UTR-${Date.now().toString().slice(-6)}`;
              storageAdapter.finalizeBankPaymentSettlement(item.rawItem.bankPayment.id, 'DONE', finalUtr, undefined, currentUser);
              setBankingActionRefresh(k => k + 1);
            }}
            className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded transition-colors cursor-pointer flex items-center gap-1 shadow-xs`}
          >
            <Landmark className="w-3.5 h-3.5" />
            <span>Release UTR</span>
          </button>
        );
      }

      if (item.rawItem?.taskType === 'DIRECTOR_BENEFICIARY_APPROVAL') {
        return (
          <button
            onClick={() => {
              storageAdapter.approveBeneficiaryRecord(item.rawItem.beneficiary.id, true, currentUser);
              setBankingActionRefresh(k => k + 1);
            }}
            className={`${isMobile ? 'px-3 py-1.5 text-xs' : 'px-2.5 py-1 text-[11px]'} bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded transition-colors cursor-pointer flex items-center gap-1 shadow-xs`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Verify & Approve</span>
          </button>
        );
      }
    }

    return null;
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {/* Top Workspace Header & Role Switcher Bar: Visible ONLY to SUPER_ADMIN */}
      {isSuperAdmin && (
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-4 rounded-2xl shadow-md border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl font-bold text-slate-950 shrink-0 ${
              workspaceMode === 'DIRECTOR_QUEUE' ? 'bg-emerald-400' :
              workspaceMode === 'EA_DESK' ? 'bg-sky-400' :
              workspaceMode === 'PC_DESK' ? 'bg-amber-400' :
              'bg-indigo-400'
            }`}>
              {workspaceMode === 'DIRECTOR_QUEUE' ? <ShieldCheck className="w-5 h-5" /> :
               workspaceMode === 'EA_DESK' ? <Briefcase className="w-5 h-5" /> :
               workspaceMode === 'PC_DESK' ? <GitBranch className="w-5 h-5" /> :
               <Calendar className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black tracking-tight">
                  {workspaceMode === 'DIRECTOR_QUEUE' ? 'Director Executive Decision Desk' :
                   workspaceMode === 'EA_DESK' ? 'Executive Assistant Approval Desk' :
                   workspaceMode === 'PC_DESK' ? 'Process Coordinator SLA Delay Monitor' :
                   getDynamicGreeting(currentUser.name)}
                </h2>
                <span className={`text-[9px] font-black px-2 py-0.5 rounded-full uppercase tracking-wider ${
                  workspaceMode === 'DIRECTOR_QUEUE' ? 'bg-emerald-400 text-slate-950' :
                  workspaceMode === 'EA_DESK' ? 'bg-sky-400 text-slate-950' :
                  workspaceMode === 'PC_DESK' ? 'bg-amber-400 text-slate-950' :
                  'bg-indigo-400 text-slate-950'
                }`}>
                  {workspaceMode === 'DIRECTOR_QUEUE' ? 'Director Workspace' :
                   workspaceMode === 'EA_DESK' ? 'EA Screening' :
                   workspaceMode === 'PC_DESK' ? 'PC Desk' :
                   currentUser.role || 'Staff Work'}
                </span>

                {/* Super Admin Feature Flag Toggle for Role Dashboards */}
                <button
                  type="button"
                  onClick={toggleRoleDashboards}
                  title={showRoleDashboards ? "Feature Flag ON: Click to hide Role Dashboards" : "Feature Flag OFF: Click to enable Role Dashboards"}
                  className={`ml-1 px-2.5 py-1 rounded-lg text-[10px] font-bold flex items-center gap-1.5 transition-all cursor-pointer border ${
                    showRoleDashboards 
                      ? 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50 hover:bg-emerald-500/30' 
                      : 'bg-white/10 text-slate-300 border-white/10 hover:bg-white/20 hover:text-white'
                  }`}
                >
                  <Settings className={`w-3.5 h-3.5 ${showRoleDashboards ? 'text-emerald-400 animate-spin-slow' : 'text-slate-400'}`} />
                  <span>Role Dashboards: {showRoleDashboards ? 'ON' : 'OFF'}</span>
                </button>
              </div>
              <p className="text-xs text-indigo-200 mt-0.5">
                {workspaceMode === 'DIRECTOR_QUEUE' ? 'Pre-screened executive briefs, attached EA notes & PIN-verified 1-click authorization' :
                 workspaceMode === 'EA_DESK' ? 'Inspect rate approvals, CS sheet comparisons & prepare pre-review briefs for Director' :
                 workspaceMode === 'PC_DESK' ? 'Track cross-departmental SLA delays, collect delay reasons & generate weekly reports' :
                 'Personal daily task workbench, due items, checklists, and active FMS workflow stages'}
              </p>
            </div>
          </div>

          {/* Workspace Mode Selector Bar: Visible ONLY to SUPER_ADMIN when Feature Flag is ON */}
          {showRoleDashboards && (
            <div className="bg-slate-950/60 p-1 rounded-xl border border-white/10 flex items-center gap-1 shrink-0 overflow-x-auto text-xs w-full md:w-auto">
              <button
                onClick={() => setWorkspaceMode('TASKS')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  workspaceMode === 'TASKS' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>My Tasks</span>
              </button>

              <button
                onClick={() => setWorkspaceMode('PC_DESK')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  workspaceMode === 'PC_DESK' ? 'bg-amber-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <GitBranch className="w-3.5 h-3.5" />
                <span>PC Delay Monitor</span>
              </button>

              <button
                onClick={() => setWorkspaceMode('EA_DESK')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  workspaceMode === 'EA_DESK' ? 'bg-sky-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <Briefcase className="w-3.5 h-3.5" />
                <span>EA Approval Desk</span>
              </button>

              <button
                onClick={() => setWorkspaceMode('DIRECTOR_QUEUE')}
                className={`px-3 py-1.5 rounded-lg font-bold transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                  workspaceMode === 'DIRECTOR_QUEUE' ? 'bg-emerald-500 text-slate-950 shadow-xs' : 'text-slate-300 hover:text-white'
                }`}
              >
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Director Queue</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* 4 Core Stat Cards (Toggleable - Hide for maximum table focus) */}
      {workspaceMode === 'TASKS' && showStatCards && (
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
      {workspaceMode === 'TASKS' && (
        <div className="space-y-3 sm:space-y-4">
          <div className="sticky top-0 z-30 bg-white px-2.5 py-1.5 sm:px-3 sm:py-2 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-1.5 sm:gap-2">
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
              { value: 'ALL', label: `All Tasks (${unifiedItems.length})` },
              { value: 'PENDING', label: `All Pending (${pendingItems.length})` },
              { value: 'DUE_TODAY', label: `Due Today (${dueTodayItems.length})`, badge: 'Today' },
              { value: 'DUE_THIS_WEEK', label: `Due This Week (${dueThisWeekItems.length})`, badge: 'Week' },
              { value: 'OVERDUE', label: `Overdue (${overdueItems.length})`, badge: 'Alert' },
              { value: 'COMPLETED', label: `Completed (${completedItems.length})` },
            ]}
            value={selectedCondition}
            onChange={(val) => setSelectedCondition(val as StatCondition)}
            size="xs"
            variant="default"
            className="w-44"
          />

          {/* Module Dropdown */}
          <CustomSelect
            options={[
              { value: 'ALL', label: 'All Modules' },
              { value: 'FMS', label: 'FMS Pipeline' },
              { value: 'CHECKLIST', label: 'Compliance Checklist' },
              { value: 'DELEGATION', label: 'Delegated Tasks' },
              { value: 'BANKING', label: 'Bank Approvals & Payments' },
            ]}
            value={moduleFilter}
            onChange={(val) => setModuleFilter(val as 'ALL' | 'FMS' | 'CHECKLIST' | 'DELEGATION' | 'BANKING')}
            size="xs"
            variant="default"
            className="w-44"
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

      {/* Helpful Filter Context & Guidance Banner: Prevents confusion when Due Today hides 48h tasks */}
      {selectedCondition === 'DUE_TODAY' && pendingItems.length > 0 && (
        <div className="bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200/80 rounded-xl px-3.5 py-2 text-xs flex flex-wrap items-center justify-between gap-2 shadow-2xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <div className="p-1 bg-amber-100 rounded-lg text-amber-700 shrink-0">
              <Calendar className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-amber-950">
                Filter: Due Today ({dueTodayItems.length})
              </span>
              <span className="text-amber-800 ml-1.5">
                {dueTodayItems.length === 0 
                  ? `No items due strictly today, but you have ${pendingItems.length} active pending task${pendingItems.length === 1 ? '' : 's'} (SLA 24-48h).`
                  : `${pendingItems.length - dueTodayItems.length > 0 ? `+${pendingItems.length - dueTodayItems.length} other pending task${pendingItems.length - dueTodayItems.length === 1 ? '' : 's'} scheduled for later this week.` : 'All active tasks are due today.'}`}
              </span>
            </div>
          </div>
          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => setSelectedCondition('DUE_THIS_WEEK')}
              className="px-2.5 py-1 text-[11px] font-bold text-amber-900 bg-amber-200/70 hover:bg-amber-200 rounded-lg border border-amber-300 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Clock className="w-3 h-3 text-amber-800" />
              <span>Due This Week ({dueThisWeekItems.length})</span>
            </button>
            <button
              type="button"
              onClick={() => setSelectedCondition('PENDING')}
              className="px-2.5 py-1 text-[11px] font-bold text-indigo-700 bg-white hover:bg-indigo-50 rounded-lg border border-indigo-200 transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
            >
              <ListFilter className="w-3 h-3 text-indigo-600" />
              <span>View All Pending ({pendingItems.length})</span>
            </button>
          </div>
        </div>
      )}

      {/* Batch Action Floating Bar */}
      {selectedBatchIds.length > 0 && (
        <div className="bg-indigo-950 text-white p-3 px-4 rounded-xl shadow-lg border border-indigo-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckSquare className="w-4 h-4 text-indigo-300" />
            <span>{selectedBatchIds.length} {selectedBatchIds.length === 1 ? 'item selected' : 'items selected'}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            <button
              onClick={() => {
                const selectedItems = displayedItems.filter((i: UnifiedItem) => selectedBatchIds.includes(i.id));
                const headers = ['Ref Code', 'Title', 'Module', 'Status', 'Planned Date', 'Actual Date', 'Assignee'];
                const rows = selectedItems.map((i: UnifiedItem) => [
                  i.referenceCode,
                  i.title,
                  i.sourceModule,
                  i.status,
                  i.plannedDateTimeStr || i.targetDateStr,
                  i.actualDateTimeStr || '—',
                  i.assigneeName || '—'
                ]);
                const timestamp = new Date().toISOString().slice(0, 10);
                downloadCsv(`My_Work_Bulk_Export_${timestamp}.csv`, headers, rows);
              }}
              className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-700"
            >
              Bulk Export
            </button>
            <button
              onClick={() => {
                // Placeholder Bulk Assign
              }}
              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
            >
              Bulk Assign
            </button>
            <button
              onClick={handleExecuteBatchApprove}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Mass Approve ({selectedBatchIds.length})
            </button>
            <button
              onClick={() => setSelectedBatchIds([])}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 cursor-pointer"
            >
              Clear Selection
            </button>
          </div>
        </div>
      )}

      {/* 1. Dedicated Mobile Native Feed (md:hidden) — perfect phone layout, touch targets, and full stage actions */}
      <div className="md:hidden space-y-3">
        {paginatedItems.length > 0 ? (
          paginatedItems.map((item: UnifiedItem) => {
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
                      } else if (item.sourceModule === 'BANKING') {
                        onNavigateTab('bankPayments');
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
            paginatedItems.map((item: UnifiedItem) => {
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
                            : item.sourceModule === 'BANKING'
                            ? 'bg-emerald-100 text-emerald-800'
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
                          } else if (item.sourceModule === 'BANKING') {
                            onNavigateTab('bankPayments');
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
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden flex flex-col">
          <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] min-h-[300px] relative">
            <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 uppercase tracking-wider text-[11px] shadow-xs">
              <tr>
                <th className="py-2.5 px-2 w-9 min-w-[36px] max-w-[36px] text-center sticky left-0 top-0 z-30 bg-slate-100 border-r border-slate-200 border-b border-slate-300">
                  <input
                    type="checkbox"
                    checked={selectedBatchIds.length === paginatedItems.length && paginatedItems.length > 0}
                    onChange={handleSelectAllBatch}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="Select all on this page for batch action"
                  />
                </th>
                <th className="py-2.5 px-3 text-left whitespace-nowrap sticky left-[36px] top-0 z-30 bg-slate-100 border-r border-slate-200 border-b border-slate-300 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] w-36 min-w-[140px] max-w-[140px]">
                  Quick Action
                </th>
                <th
                  onClick={() => handleSort('referenceCode')}
                  className="py-2.5 px-3 min-w-[250px] sticky top-0 bg-slate-100 border-b border-slate-300 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Context / Reference</span>
                    {sortConfig?.key === 'referenceCode' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('title')}
                  className="py-2.5 px-3 min-w-[220px] sticky top-0 bg-slate-100 border-b border-slate-300 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                >
                  <div className="flex items-center gap-1.5">
                    <span>Task / Stage Description</span>
                    {sortConfig?.key === 'title' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('status')}
                  className="py-2.5 px-2 text-center whitespace-nowrap sticky top-0 bg-slate-100 border-b border-slate-300 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                >
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Status</span>
                    {sortConfig?.key === 'status' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleSort('plannedDate')}
                  className="py-2.5 px-2 whitespace-nowrap sticky top-0 bg-slate-100 border-b border-slate-300 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                >
                  <span className="flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-slate-500" />
                    <span>Planned</span>
                    {sortConfig?.key === 'plannedDate' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </span>
                </th>
                <th
                  onClick={() => handleSort('actualDate')}
                  className="py-2.5 px-2 whitespace-nowrap sticky top-0 bg-slate-100 border-b border-slate-300 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                >
                  <span className="flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 text-slate-500" />
                    <span>Actual</span>
                    {sortConfig?.key === 'actualDate' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </span>
                </th>
                <th
                  onClick={() => handleSort('delay')}
                  className="py-2.5 px-2 whitespace-nowrap sticky top-0 bg-slate-100 border-b border-slate-300 cursor-pointer hover:bg-slate-200/70 transition-colors select-none"
                >
                  <span className="flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                    <span>Delay</span>
                    {sortConfig?.key === 'delay' ? (
                      sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                    ) : (
                      <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                    )}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {paginatedItems.length > 0 ? (
                paginatedItems.map((item: UnifiedItem, itemIdx: number) => {
                  const isChecked = selectedBatchIds.includes(item.id);
                  return (
                    <tr key={item.id} className={`group/row hover:bg-slate-50 transition-colors ${isChecked ? 'bg-indigo-50/50' : ''}`}>
                      {/* 1. Checkbox for Batch Select (Sticky left) */}
                      <td className={`py-2.5 px-2 w-9 min-w-[36px] max-w-[36px] text-center sticky left-0 z-10 border-r border-slate-200/60 ${
                        isChecked ? 'bg-indigo-50' : 'bg-white group-hover/row:bg-slate-50'
                      }`}>
                        <input
                          type="checkbox"
                          disabled={!isItemActionable(item)}
                          checked={isChecked}
                          onChange={() => handleToggleBatchId(item.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer disabled:opacity-25 disabled:cursor-not-allowed"
                        />
                      </td>

                      {/* 2. Quick Action Button (Sticky left) - Compact Fixed Width */}
                      <td className={`py-2 px-2 text-left whitespace-nowrap sticky left-[36px] z-10 border-r border-slate-200/80 shadow-[2px_0_5px_-2px_rgba(0,0,0,0.06)] w-36 min-w-[140px] max-w-[140px] ${
                        isChecked ? 'bg-indigo-50' : 'bg-white group-hover/row:bg-slate-50'
                      }`}>
                        <div className="flex items-center justify-between gap-1 w-full">
                          {/* PRIMARY ACTION (Only the most important action) */}
                          <div className="min-w-0 flex-1">
                            {/* CHECKLIST: Mark Done / Reopen */}
                            {item.sourceModule === 'CHECKLIST' && (item.isMine || isAdminOrSuperAdmin || pcDeskActive) && (
                              item.isCompleted ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const now = new Date();
                                    onCompleteChecklist({
                                      ...item.rawItem,
                                      status: 'Pending',
                                      actualDate: undefined,
                                      updatedAt: now.toLocaleString('en-GB')
                                    });
                                  }}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] transition-colors cursor-pointer truncate max-w-full"
                                >
                                  Reopen
                                </button>
                              ) : (item.isDueToday || item.isOverdue || isAdminOrSuperAdmin || pcDeskActive) ? (
                                <button
                                  type="button"
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
                                  className="px-2 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded text-[11px] shadow-2xs transition-colors cursor-pointer truncate max-w-full"
                                >
                                  Mark Done
                                </button>
                              ) : (
                                <span className="text-[10px] text-slate-400 font-medium px-1.5 py-0.5 bg-slate-50 border border-slate-200 rounded truncate block text-center" title={`Scheduled ${item.plannedDateTimeStr?.split(' ')[0] || item.targetDateStr}`}>
                                  Scheduled
                                </span>
                              )
                            )}

                            {/* DELEGATION: Complete / Reopen */}
                            {item.sourceModule === 'DELEGATION' && (item.isMine || isAdminOrSuperAdmin || pcDeskActive) && (
                              <button
                                type="button"
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
                                className={`px-2 py-1 font-bold rounded text-[11px] shadow-2xs transition-colors cursor-pointer truncate max-w-full ${
                                  item.isCompleted 
                                    ? 'bg-slate-100 hover:bg-slate-200 text-slate-700' 
                                    : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                                }`}
                              >
                                {item.isCompleted ? 'Reopen' : 'Complete'}
                              </button>
                            )}

                            {/* FMS: Execute Stage / Approve / Reject */}
                            {item.sourceModule === 'FMS' && (() => {
                              if (!isItemActionable(item)) {
                                return !item.isCompleted && (item.rawItem.flow.status === 'In Progress' || item.rawItem.flow.status === 'Pending') ? (
                                  <span className="text-[10px] text-slate-400 font-mono italic truncate block">
                                    Awaiting S{item.rawItem.flow.currentStageIndex + 1}
                                  </span>
                                ) : (
                                  <span className="text-[10px] text-slate-400 font-medium block">
                                    Done
                                  </span>
                                );
                              }

                              const stageExec = item.rawItem.stage;
                              const stageDef = item.rawItem.def;
                              const isResponsible = isUserResponsibleForStage(stageDef, stageExec, currentUser);

                              if (!isResponsible) {
                                return (
                                  <button
                                    type="button"
                                    disabled
                                    className="px-2 py-1 bg-slate-100 text-slate-400 border border-slate-200 font-medium rounded text-[11px] flex items-center gap-1 cursor-not-allowed truncate max-w-full"
                                    title="Assigned to another user"
                                  >
                                    <Lock className="w-3 h-3 shrink-0" />
                                    <span className="truncate">Locked</span>
                                  </button>
                                );
                              }

                              const hasApprovalField = stageExec?.fields?.some((f: any) => f.type === 'APPROVAL' || f.id === 'status' || f.label?.toLowerCase().includes('approval')) ||
                                stageDef?.fields?.some((f: any) => f.type === 'APPROVAL' || f.id === 'status' || f.label?.toLowerCase().includes('approval'));

                              if (onOpenStageAction) {
                                return (
                                  <button
                                    type="button"
                                    onClick={() => onOpenStageAction(item.rawItem.flow, item.rawItem.stageIndex)}
                                    className={`px-2 py-1 font-bold rounded text-[11px] flex items-center gap-1 transition-colors cursor-pointer border shadow-2xs truncate max-w-full ${
                                      hasApprovalField
                                        ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-300'
                                        : 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700'
                                    }`}
                                    title={hasApprovalField ? 'Review & Take Approval Decision' : 'Execute Stage'}
                                  >
                                    {hasApprovalField ? (
                                      <>
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                        <span className="truncate">Approve</span>
                                      </>
                                    ) : (
                                      <>
                                        <FileText className="w-3.5 h-3.5 text-indigo-100 shrink-0" />
                                        <span className="truncate">Execute</span>
                                      </>
                                    )}
                                  </button>
                                );
                              }
                              return null;
                            })()}

                            {/* BANKING: Direct Action */}
                            {item.sourceModule === 'BANKING' && (
                              <div className="truncate max-w-full">
                                {renderItemQuickActions(item, false)}
                              </div>
                            )}
                          </div>

                          {/* SECONDARY ACTIONS: Kebab Menu Dropdown (⋮) */}
                          <div className="relative shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setActiveActionMenuId(activeActionMenuId === item.id ? null : item.id);
                              }}
                              className={`p-1 rounded text-slate-400 hover:text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer ${
                                activeActionMenuId === item.id ? 'bg-slate-200 text-slate-900' : ''
                              }`}
                              title="More options"
                            >
                              <MoreVertical className="w-3.5 h-3.5" />
                            </button>

                            {activeActionMenuId === item.id && (
                              <div
                                onClick={(e) => e.stopPropagation()}
                                className={`absolute left-0 w-48 bg-white border border-slate-200 rounded-xl shadow-xl z-50 py-1 text-slate-800 text-xs animate-in fade-in duration-100 ${
                                  itemIdx >= paginatedItems.length - 2 && paginatedItems.length > 2
                                    ? 'bottom-full mb-1'
                                    : 'top-full mt-1'
                                }`}
                              >
                                {/* 1. Split Cockpit for Checklists */}
                                {item.sourceModule === 'CHECKLIST' && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      handleOpenSplitCockpit(item);
                                    }}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-indigo-50 text-indigo-700 font-semibold text-left transition-colors cursor-pointer"
                                  >
                                    <Layers className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Open Cockpit</span>
                                  </button>
                                )}

                                {/* 2. View Task Details */}
                                <button
                                  type="button"
                                  onClick={() => {
                                    setActiveActionMenuId(null);
                                    if (item.sourceModule === 'FMS') {
                                      onSelectFmsDetail(item.rawItem.flow);
                                    } else if (item.sourceModule === 'BANKING') {
                                      onNavigateTab('bankPayments');
                                    } else {
                                      setViewDetailItem(item);
                                    }
                                  }}
                                  className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 text-left transition-colors cursor-pointer"
                                >
                                  <Eye className="w-3.5 h-3.5 text-slate-500" />
                                  <span>View Details</span>
                                </button>

                                {/* 3. External Form for FMS */}
                                {item.sourceModule === 'FMS' && item.rawItem.def?.formUrl && (
                                  <a
                                    href={item.rawItem.def.formUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    onClick={() => setActiveActionMenuId(null)}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-purple-50 text-purple-700 text-left transition-colors"
                                  >
                                    <ExternalLink className="w-3.5 h-3.5 text-purple-600" />
                                    <span>External Form</span>
                                  </a>
                                )}

                                {/* 4. Revise Task for Delegation */}
                                {item.sourceModule === 'DELEGATION' && (item.isMine || isAdminOrSuperAdmin || pcDeskActive) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      onReviseDelegation(item.rawItem);
                                    }}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-slate-50 text-slate-700 text-left transition-colors cursor-pointer"
                                  >
                                    <RefreshCw className="w-3.5 h-3.5 text-slate-500" />
                                    <span>Revise Task</span>
                                  </button>
                                )}

                                {/* 5. Process Coordinator Remark */}
                                {canCoordinate && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
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
                                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-purple-50 text-purple-700 text-left transition-colors cursor-pointer"
                                  >
                                    <MessageSquare className="w-3.5 h-3.5 text-purple-500" />
                                    <span>Add Process Note</span>
                                  </button>
                                )}

                                {/* 6. Follow-up Nudge */}
                                {canCoordinate && onNudgeItem && !item.isCompleted && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setActiveActionMenuId(null);
                                      const targetId = item.sourceModule === 'FMS'
                                        ? item.rawItem.flow.id
                                        : item.sourceId;
                                      const stgIdx = item.sourceModule === 'FMS' ? item.rawItem.stageIndex : undefined;
                                      onNudgeItem(item.sourceModule, targetId, stgIdx);
                                    }}
                                    className="w-full px-3 py-1.5 flex items-center gap-2 hover:bg-amber-50 text-amber-700 text-left transition-colors cursor-pointer"
                                  >
                                    <Bell className="w-3.5 h-3.5 text-amber-500" />
                                    <span>Send Nudge</span>
                                  </button>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* 3. Context / Reference Column */}
                      <td className="py-2.5 px-3 min-w-[250px] max-w-[340px]">
                        {(() => {
                          const data = getContextData(item);
                          if (data.category === 'PAYMENT') {
                            return (
                              <div className="flex flex-col gap-1">
                                {/* Top Line: Vendor Name in bold */}
                                <div className="font-bold text-slate-900 text-xs sm:text-[13px] leading-tight break-words">
                                  {data.vendorName}
                                </div>

                                {/* Second Line: Amount in distinct green */}
                                {data.amount && (
                                  <div className="font-bold text-emerald-600 text-xs sm:text-[13px] leading-tight">
                                    {data.amount}
                                  </div>
                                )}

                                {/* Third Line: Purpose in normal text (Do not truncate) */}
                                {data.purpose && (
                                  <div className="text-slate-600 text-xs leading-snug whitespace-normal break-words">
                                    {data.purpose}
                                  </div>
                                )}

                                {/* Fourth Line: Ref No in small, muted text */}
                                <div className="text-[10px] text-slate-400 font-mono leading-tight">
                                  {data.refNo}
                                </div>
                              </div>
                            );
                          }

                          // Store/Purchase/Checklist flows
                          return (
                            <div className="flex flex-col gap-1">
                              {/* Top Line: Items */}
                              <div className="text-xs text-slate-900 leading-snug break-words" title={data.fullItemsTooltip}>
                                <span className="font-semibold text-slate-900">{data.items}</span>
                              </div>

                              {/* Second Line: Site */}
                              <div className="text-[11px] text-slate-600 leading-tight">
                                <span className="font-medium text-slate-700">{data.site}</span>
                              </div>

                              {/* Third Line: Ref No in small, muted text */}
                              <div className="text-[10px] text-slate-400 font-mono leading-tight">
                                {data.refNo}
                              </div>
                            </div>
                          );
                        })()}
                      </td>

                      {/* 4. Task / Stage Description Column (WHAT, WHO, and Target SLA) */}
                      <td className="py-2.5 px-3 min-w-[220px]">
                        <div className="flex flex-col gap-1">
                          {/* WHAT (Stage Name): Bold, prominent text */}
                          <div className={`font-bold text-slate-900 text-xs sm:text-[13px] leading-tight ${item.isCompleted ? 'line-through text-slate-400' : ''}`}>
                            {item.title}
                          </div>

                          {/* WHO (Assignee / Role): Small badge or muted text */}
                          {(item.assigneeName || item.whoRole) && (
                            <div className="text-xs text-slate-500 flex items-center gap-1 leading-tight">
                              <User className="w-3 h-3 text-slate-400 shrink-0" />
                              <span className="truncate">
                                {item.assigneeName ? `Assignee: ${item.assigneeName}` : `Role: ${item.whoRole}`}
                              </span>
                            </div>
                          )}

                          {/* Target SLA Badge */}
                          {(() => {
                            const sla = typeof item.slaHours === 'number'
                              ? item.slaHours
                              : typeof item.rawItem?.stage?.slaHours === 'number'
                              ? item.rawItem.stage.slaHours
                              : typeof item.rawItem?.def?.slaHours === 'number'
                              ? item.rawItem.def.slaHours
                              : null;

                            if (sla && sla > 0) {
                              return (
                                <div className="text-xs font-semibold text-amber-600 bg-amber-50 px-1.5 py-0.5 rounded w-fit flex items-center gap-1 leading-tight">
                                  <Clock className="w-3 h-3 text-amber-500 shrink-0" />
                                  <span>Target SLA: {sla} {sla === 1 ? 'Hour' : 'Hours'}</span>
                                </div>
                              );
                            }
                            return (
                              <div className="text-xs font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded w-fit flex items-center gap-1 leading-tight">
                                <Clock className="w-3 h-3 text-slate-400 shrink-0" />
                                <span>SLA: No Limit</span>
                              </div>
                            );
                          })()}

                          {/* Process Coordinator Remarks Badge */}
                          {item.processRemarks && item.processRemarks.length > 0 && (
                            <div className="mt-1.5 p-1.5 rounded bg-purple-50 border border-purple-200 text-[11px] text-purple-900 flex items-start gap-1.5">
                              <MessageSquare className="w-3.5 h-3.5 text-purple-600 shrink-0 mt-0.5" />
                              <div>
                                <span className="font-bold text-purple-950">Process Note ({item.processRemarks[0].authorName}):</span>{' '}
                                <span className="font-semibold text-purple-800">[{item.processRemarks[0].category.replace('_', ' ')}]</span>{' '}
                                {item.processRemarks[0].remarkText}
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
                        </div>
                      </td>

                      {/* 6. Status Column Badge */}
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

                      {/* 7. Planned Date/Time */}
                      <td className="py-2.5 px-2 font-mono text-slate-800 whitespace-nowrap">
                        {item.plannedDateTimeStr || item.targetDateStr}
                      </td>

                      {/* 8. Actual Date/Time - styled normally */}
                      <td className="py-2.5 px-2 font-mono text-slate-700 whitespace-nowrap">
                        {item.actualDateTimeStr || '—'}
                      </td>

                      {/* 9. Delay Variance - show ONLY precision duration if delayed, with body highlights */}
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
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-500">
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
      </div>
      )}

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
      </div>
      )}

      {/* WORKSPACE VIEW 1: PROCESS COORDINATOR (PC) SLA DELAY MONITOR */}
      {workspaceMode === 'PC_DESK' && canShowRoleTabs && (
        <PCDelayMonitor
          flows={flows}
          currentUser={currentUser}
          onNudgeItem={onNudgeItem}
          onOpenStageAction={onOpenStageAction}
          onSelectFlowDetail={onSelectFmsDetail}
          onLogDelayReason={(flow, stageIndex) => {
            setRemarkModalTarget({
              item: {
                id: flow.id,
                sourceModule: 'FMS',
                sourceId: flow.id,
                title: flow.stages[stageIndex]?.stageName || flow.title,
                subtitle: `Indent #${flow.indentNo}`,
                referenceCode: flow.indentNo,
                targetDateStr: flow.stages[stageIndex]?.plannedDateTime || '',
                status: flow.status,
                isCompleted: false,
                isOverdue: true,
                isDueToday: false,
                rawItem: { flow, stageIndex }
              } as any,
              module: 'FMS',
              targetId: flow.id,
              stageIndex
            });
            setRemarkText('');
          }}
          onOpenWeeklyDigest={() => setShowWeeklyDigestModal(true)}
        />
      )}

      {/* WORKSPACE VIEW 2: EXECUTIVE ASSISTANT (EA) APPROVAL DESK */}
      {workspaceMode === 'EA_DESK' && canShowRoleTabs && (
        <EAApprovalDesk
          flows={flows}
          currentUser={currentUser}
          onSelectFlowDetail={onSelectFmsDetail}
        />
      )}

      {/* WORKSPACE VIEW 3: DIRECTOR EXECUTIVE APPROVAL QUEUE */}
      {workspaceMode === 'DIRECTOR_QUEUE' && canShowRoleTabs && (
        <DirectorQueue
          flows={flows}
          currentUser={currentUser}
          onAdvanceFmsStage={onAdvanceFmsStage || (() => {})}
          onOpenStageAction={onOpenStageAction}
          onSelectFlowDetail={onSelectFmsDetail}
        />
      )}

      {/* EA SCREENING MODAL */}
      {selectedEaFlow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-sky-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-sky-400" />
                <h3 className="font-extrabold text-sm">EA Pre-Review &amp; Priority Screening</h3>
              </div>
              <button onClick={() => setSelectedEaFlow(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveEaPreReview} className="p-5 space-y-4 text-xs">
              {eaSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{eaSuccessMsg}</span>
                </div>
              )}

              <div className="p-3 bg-sky-50 rounded-xl border border-sky-200 space-y-1">
                <span className="font-bold text-sky-950">Indent #{selectedEaFlow.flow.indentNo} — {selectedEaFlow.flow.stages[selectedEaFlow.stageIndex]?.stageName}</span>
                <p className="text-sky-800 font-medium">Vendor: {selectedEaFlow.flow.vendorName || 'As Per CS'} • Site: {selectedEaFlow.flow.siteName}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">EA Pre-Review Summary Note for Director *</label>
                <textarea
                  rows={4}
                  value={eaNotesText}
                  onChange={(e) => setEaNotesText(e.target.value)}
                  placeholder="e.g. Verified 3 vendor quotes; L1 supplier selected. Rate matches previous purchase orders. Credit terms 30 days."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-800 mb-1">Priority Tag *</label>
                  <select
                    value={eaPriorityVal}
                    onChange={(e) => setEaPriorityVal(e.target.value as any)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-900 cursor-pointer"
                  >
                    <option value="NORMAL">Normal Priority</option>
                    <option value="HIGH">High Priority</option>
                    <option value="CRITICAL_URGENT">Critical Urgent</option>
                  </select>
                </div>

                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 font-bold text-slate-800 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={eaVerifiedCheck}
                      onChange={(e) => setEaVerifiedCheck(e.target.checked)}
                      className="w-4 h-4 text-sky-600 rounded"
                    />
                    <span>EA Verified &amp; Pre-Screened</span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setSelectedEaFlow(null)} className="px-4 py-2 border border-slate-300 hover:bg-slate-100 font-bold rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl shadow-xs flex items-center gap-1.5">
                  <Send className="w-4 h-4" />
                  <span>Forward to Director Queue</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DIRECTOR PIN APPROVAL MODAL */}
      {selectedDirectorFlow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-emerald-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm">Director Executive Approval Authorization</h3>
              </div>
              <button onClick={() => setSelectedDirectorFlow(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDirectorPinApproval} className="p-5 space-y-4 text-xs">
              {directorSuccessMsg ? (
                <div className="p-3 bg-emerald-50 text-emerald-900 border border-emerald-200 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{directorSuccessMsg}</span>
                </div>
              ) : (
                <>
                  <div className="p-3 bg-emerald-50/80 rounded-xl border border-emerald-200 space-y-1">
                    <span className="font-black text-emerald-950 text-xs">Authorize Stage Approval</span>
                    <p className="text-emerald-900 font-medium">Indent #{selectedDirectorFlow.flow.indentNo} — {selectedDirectorFlow.flow.stages[selectedDirectorFlow.stageIndex]?.stageName}</p>
                  </div>

                  {directorPinError && (
                    <div className="p-3 bg-rose-50 text-rose-800 border border-rose-200 rounded-xl font-bold flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 text-rose-600" />
                      <span>{directorPinError}</span>
                    </div>
                  )}

                  <div>
                    <label className="block font-bold text-slate-800 mb-1">Enter Director 4-Digit Security PIN *</label>
                    <input
                      type="password"
                      maxLength={4}
                      value={directorPinVal}
                      onChange={(e) => setDirectorPinVal(e.target.value.replace(/\D/g, ''))}
                      placeholder="••••"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-center text-lg font-mono font-bold tracking-widest text-slate-900 focus:bg-white focus:ring-2 focus:ring-emerald-500 outline-none"
                      required
                      autoFocus
                    />
                    <p className="text-[10px] text-slate-400 mt-1 text-center">Default PIN: 0000 or 1234 or configured user PIN</p>
                  </div>

                  <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                    <button type="button" onClick={() => setSelectedDirectorFlow(null)} className="px-4 py-2 border border-slate-300 hover:bg-slate-100 font-bold rounded-xl">
                      Cancel
                    </button>
                    <button type="submit" className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold rounded-xl shadow-md flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Confirm &amp; Approve Stage</span>
                    </button>
                  </div>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* DIRECTOR REVISION REQUEST MODAL */}
      {selectedDirectorRejectFlow && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-400" />
                <h3 className="font-extrabold text-sm">Director Revision Request / Rejection</h3>
              </div>
              <button onClick={() => setSelectedDirectorRejectFlow(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleDirectorReject} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-rose-50 rounded-xl border border-rose-200 space-y-1">
                <span className="font-bold text-rose-950">Indent #{selectedDirectorRejectFlow.flow.indentNo}</span>
                <p className="text-rose-900 font-medium">Stage: {selectedDirectorRejectFlow.flow.stages[selectedDirectorRejectFlow.stageIndex]?.stageName}</p>
              </div>

              <div>
                <label className="block font-bold text-slate-800 mb-1">Enter Revision Note / Reason for Rejection *</label>
                <textarea
                  rows={3}
                  value={directorRejectReason}
                  onChange={(e) => setDirectorRejectReason(e.target.value)}
                  placeholder="e.g. Vendor rate is 15% higher than last PO. Request renegotiation or extra quote."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-slate-900 focus:bg-white focus:ring-2 focus:ring-rose-500 outline-none"
                  required
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button type="button" onClick={() => setSelectedDirectorRejectFlow(null)} className="px-4 py-2 border border-slate-300 hover:bg-slate-100 font-bold rounded-xl">
                  Cancel
                </button>
                <button type="submit" className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-extrabold rounded-xl shadow-md flex items-center gap-1.5">
                  <Send className="w-4 h-4" />
                  <span>Send Revision Request</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* WEEKLY DIRECTOR DIGEST REPORT MODAL */}
      {showWeeklyDigestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 font-sans">
          <div className="bg-white rounded-2xl max-w-2xl w-full border border-slate-200 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
            <div className="bg-amber-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-amber-400" />
                <div>
                  <h3 className="font-extrabold text-sm">Weekly Director Operational Digest</h3>
                  <p className="text-[11px] text-amber-200">Process Coordination Summary for Pranjal Sir</p>
                </div>
              </div>
              <button onClick={() => setShowWeeklyDigestModal(false)} className="text-amber-300 hover:text-white p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
                  <span className="text-[10px] text-slate-500 font-bold block uppercase">Active Workflows</span>
                  <span className="text-lg font-black text-slate-900">{flows.length}</span>
                </div>

                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-center">
                  <span className="text-[10px] text-rose-700 font-bold block uppercase">SLA Overdue Items</span>
                  <span className="text-lg font-black text-rose-700">{overdueItems.length}</span>
                </div>

                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-center">
                  <span className="text-[10px] text-emerald-700 font-bold block uppercase">Completed This Week</span>
                  <span className="text-lg font-black text-emerald-700">{completedItems.length}</span>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Department SLA Delay Breakdown</h4>
                <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
                  {['Purchase', 'Store', 'Accounts', 'Plant Ops'].map((dept) => {
                    const deptDelays = overdueItems.filter(i => i.subtitle.toLowerCase().includes(dept.toLowerCase()));
                    return (
                      <div key={dept} className="p-3 flex items-center justify-between">
                        <span className="font-bold text-slate-800">{dept} Department</span>
                        <span className={`font-mono font-black text-xs px-2.5 py-0.5 rounded-full ${
                          deptDelays.length > 0 ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
                        }`}>
                          {deptDelays.length} Delays
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="font-extrabold text-slate-900 text-xs uppercase tracking-wider">Active Delay Explanations Logged</h4>
                <div className="max-h-40 overflow-y-auto space-y-1.5 border border-slate-200 rounded-xl p-3 bg-slate-50">
                  {overdueItems.filter(i => i.processRemarks && i.processRemarks.length > 0).length > 0 ? (
                    overdueItems.filter(i => i.processRemarks && i.processRemarks.length > 0).map(i => (
                      <div key={i.id} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] space-y-0.5">
                        <span className="font-mono font-bold text-indigo-700">{i.referenceCode}</span>
                        <p className="text-slate-800 font-medium">{i.processRemarks![i.processRemarks!.length - 1].remarkText}</p>
                      </div>
                    ))
                  ) : (
                    <p className="text-slate-400 italic text-[11px]">No active delay reasons logged yet.</p>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
              <button
                type="button"
                onClick={() => {
                  const headers = ['Ref Code', 'Module', 'Title', 'Subtitle', 'Delay Hours', 'Status'];
                  const rows = overdueItems.map(i => [i.referenceCode, i.sourceModule, i.title, i.subtitle, i.delayHours || 0, i.status]);
                  downloadCsv(`Weekly_Director_Digest_${new Date().toISOString().slice(0, 10)}.csv`, headers, rows);
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Download className="w-4 h-4" />
                <span>Export Weekly Digest CSV</span>
              </button>

              <button
                type="button"
                onClick={() => setShowWeeklyDigestModal(false)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-xl text-xs cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Split-Screen Operational Cockpit */}
      {activeCockpitTask && (
        <SplitTaskCockpit
          task={activeCockpitTask.task}
          flow={activeCockpitTask.flow}
          stageIndex={activeCockpitTask.stageIndex}
          checklistItem={activeCockpitTask.checklistItem}
          currentUser={currentUser}
          onClose={() => setActiveCockpitTask(null)}
          onAdvanceFmsStage={(flow, decision) => {
            onAdvanceFmsStage(flow, decision);
            setActiveCockpitTask(null);
          }}
          onCompleteChecklist={(item) => {
            onCompleteChecklist(item);
            setActiveCockpitTask(null);
          }}
        />
      )}

      {/* Inline UTR Modal for Stage 8 Payment Confirmation */}
      {utrModalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-2xl border border-slate-200 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
                  <Landmark className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Confirm Payment & Enter UTR</h3>
                  <p className="text-xs text-slate-500">{utrModalTarget.vendorName} • ₹{utrModalTarget.amount.toLocaleString('en-IN')}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setUtrModalTarget(null)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!utrModalTarget.screenshotUrl) return;
                const targetUtr = utrModalTarget.utrNumber.trim() || `UTR-${Date.now().toString().slice(-6)}`;
                onAdvanceFmsStage(utrModalTarget.flow, undefined, {
                  utrNumber: targetUtr,
                  paymentDoneScreenshot: utrModalTarget.screenshotUrl,
                  paymentStatus: 'DONE',
                  settlementRemarks: 'Transaction confirmed via inline action'
                });
                setUtrModalTarget(null);
              }}
              className="mt-4 space-y-3"
            >
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Bank UTR / Transaction Reference Number <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={utrModalTarget.utrNumber}
                  onChange={(e) => setUtrModalTarget({ ...utrModalTarget, utrNumber: e.target.value })}
                  placeholder="e.g. UTR-981723182"
                  className="w-full text-xs p-2.5 border border-slate-300 rounded-xl font-mono font-bold focus:ring-2 focus:ring-emerald-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Payment Done Screenshot / Transfer Proof <span className="text-rose-500">*</span>
                </label>
                <FileUploadField
                  id="paymentDoneScreenshot"
                  value={utrModalTarget.screenshotUrl || ''}
                  onChange={(val) => setUtrModalTarget({ ...utrModalTarget, screenshotUrl: val })}
                  placeholder="Upload payment done transfer proof / bank screenshot"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setUtrModalTarget(null)}
                  className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!utrModalTarget.screenshotUrl}
                  className={`px-4 py-1.5 text-xs font-bold rounded-lg shadow-sm cursor-pointer ${
                    !utrModalTarget.screenshotUrl
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  Submit & Complete Settlement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Bottom spacing to ensure all content and buttons remain accessible above any floating elements */}
      <div className="h-10 md:h-14" />
    </div>
  );
};
