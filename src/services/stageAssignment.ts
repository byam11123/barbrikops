import { FmsStageDefinition, FmsStageTemplate, FmsStageExecution, FmsInstance, UserProfile, ChecklistItem, DelegationTask } from '../types';
import { storageAdapter } from './storageAdapter';
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
} from '../data/initialData';

/**
 * Strict role and assignee matching for FMS stages across all flows:
 * 1. Check Stock FMS (Store Verification):
 *    - Amanat Bharadwaj (Store Manager)
 * 2. Store to Site Dispatch FMS (Stock Available):
 *    - Stages 1 to 8: Store Manager - Sumant (Siladehi) / Hemant (Bijetala)
 *    - Stage 9: Purchaser (Rajnikant Behera / Purchaser)
 * 3. Indent to PO FMS (Purchase Dept):
 *    - Stage 1: Store Manager (Amanat Bharadwaj)
 *    - Stages 2, 5, 6, 7, 8: Asst. Manager Purchase & Store (Bramhanand Patel)
 *    - Stage 4: Project Manager (Pranay Ghosh / Chakravarti Ji)
 *    - Stages 3, 9, 10, 11, 12: Purchase Executive (Shyam Rao Sureshe / Rajnikant Behera)
 * 4. PO to Payment FMS (Accounts Dept):
 *    - Stages 1, 5, 8, 12: Finance Approver (Pranjal Agrawal / Khushboo Sahu)
 *    - Stages 2, 4, 6, 9, 10, 15: Accounts Executive / Manager (Byamkesh Kaiwartya / Manish Koshle / Priyanka)
 *    - Stages 3, 7: Purchase Executive (Shyam Rao Sureshe)
 *    - Stages 11, 13, 14: EA / Accounts (Khushboo Sahu / Rajnikant / Vivek)
 * 5. Accounts Invoice Collection FMS:
 *    - Stages 1, 2, 6, 7: Accounts Manager (Byamkesh Kaiwartya / Priyanka / Manish Koshle / Accounts)
 *    - Stages 3, 4: Purchase Manager (Bramhanand Patel)
 *    - Stage 5: Khushboo Sahu (EA)
 * 6. HR Labour Attendance & Payment FMS:
 *    - Stage 1: Site Incharge
 *    - Stages 2, 3, 4, 5, 6, 9, 10, 11: Garima Pal (HR)
 *    - Stage 7: Mamta (HR / Accounts)
 *    - Stage 8: Nandita / Khilesh (Planning / DPR)
 * 7. Purchase to Store to Dispatch FMS:
 *    - Stages 1, 4, 5, 7, 8, 9: Store Manager (Bramhanand Patel)
 *    - Stages 2, 3, 6: Purchase Executive (Shyam Rao Sureshe)
 *    - Stage 10: Purchaser (Rajendra / Vivek / Rajnikant)
 * 8. Payment to Dispatch FMS:
 *    - Stages 1, 4, 5, 6, 7: Purchase Assistant / Purchaser (Rajendra / Vivek / Rajnikant)
 *    - Stages 2, 3: Purchase Executive (Shyam Rao Sureshe)
 * 9. Site Receive FMS:
 *    - Stages 1, 2, 3, 4, 5, 6, 8: Store Incharge (Amanat Bharadwaj / Site Store Incharge)
 *    - Stage 7: Construction (Civil Incharge) / Mechanical Incharge (Pranay Ghosh / Chakravarti Ji)
 *    - Stages 9, 10: Site DEO (Site Data Entry Operator)
 */
// Helper to normalize strings: lowercase, remove spaces, underscores, hyphens
const normalize = (str?: string) => (str || '').toLowerCase().replace(/[\s_-]/g, '');

export const isUserResponsibleForStage = (
  stageDef: FmsStageDefinition | FmsStageTemplate | undefined,
  stageExec: FmsStageExecution | undefined,
  user: UserProfile
): boolean => {
  if (!user) return false;

  const userName = normalize(user.name);
  const userRole = normalize(user.role);
  const sysRole = normalize(user.systemRole);

  // 1. Check explicit assignee of the instance
  const execAssignee = normalize(stageExec?.assignee);
  if (execAssignee) {
    const list = execAssignee.split(/[\/,]/).map(normalize);
    if (list.some(a => a && a === userName)) return true;
  }

  // 2. Check default assignee from template
  const rawAssignee = stageDef?.whoDefaultAssignee || '';
  const assigneeList = rawAssignee.split(/[\/,]/).map(normalize);
  if (assigneeList.some(a => a && a === userName)) return true;

  // 3. Check Role exactly
  const whoRole = normalize(stageDef?.whoRole || stageExec?.whoRole);
  if (whoRole) {
    if (whoRole === userRole) return true;
    if (whoRole === sysRole) return true;
    // Explicit alias mapping ONLY
    if (whoRole === 'director' && (userRole === 'director' || sysRole === 'director')) return true;
    if (whoRole === 'financeaccounts' && userRole === 'accountsmanager') return true;
    if (whoRole === 'purchasehead' && userRole === 'asst.managerpurchase&store') return true;
  }

  return false;
};

export const isFlowAwaitingUserAction = (
  flow: FmsInstance,
  user: UserProfile
): boolean => {
  if (!user) return false;
  if (flow.status === 'Completed' || flow.status === 'Cancelled' || flow.status === 'Awaiting Fulfillment') {
    return false;
  }

  const curIndex = flow.currentStageIndex;
  const curStage = flow.stages[curIndex];
  if (!curStage) return false;

  // Skip completed stages or stages with actual timestamp
  if (curStage.status === 'Done' || curStage.status === 'Completed' || curStage.status === 'Skipped' || Boolean(curStage.actualDateTime || curStage.actualTimestamp)) {
    return false;
  }

  // Skip system/child workflow assignees
  const assigneeLower = (curStage.assignee || '').toLowerCase();
  if (assigneeLower.includes('system') || assigneeLower.includes('child workflows')) {
    return false;
  }

  // Strict active stage assignee matching: if curStage.assignee is assigned to someone else, do not show for this user
  const execAssignee = (curStage.assignee || '').trim().toLowerCase().replace(/[\s_-]/g, '');
  const userName = (user.name || '').trim().toLowerCase().replace(/[\s_-]/g, '');
  if (execAssignee) {
    const list = execAssignee.split(/[\/,]/);
    if (!list.some(a => a && (a === userName || a.includes(userName) || userName.includes(a)))) {
      return false;
    }
  }

  const isPurchaseFlow =
    flow.flowType === 'INDENT_PURCHASE' ||
    flow.flowType === 'INDENT_TO_PO' ||
    flow.templateKey === 'INDENT_TO_PO' ||
    flow.indentNo?.endsWith('-PUR') ||
    flow.flowId?.includes('-PUR');

  let curDef: FmsStageDefinition | FmsStageTemplate | undefined;
  if (isPurchaseFlow) {
    curDef = FMS_STANDARD_PURCHASE_STAGES[curIndex];
  } else {
    // Get the template definition for the current stage
    const allTemplates = storageAdapter.getAllMasterTemplates();
    const template = allTemplates.find(t => t.templateKey === flow.flowType || t.id === flow.customTemplateId);
    curDef = template?.stages[curIndex];
  }

  // Fallback to stage definitions if template not found in master list
  if (!curDef) {
    const stageDefs = getStageDefinitionsForFlowType(flow.flowType);
    curDef = stageDefs[curIndex] || {
      stageId: curStage.stageId,
      stageNumber: curIndex + 1,
      name: curStage.stageName,
      what: curStage.stageName,
      whoRole: curStage.whoRole || curStage.assignee || '',
      whoDefaultAssignee: curStage.assignee || '',
      howChannel: curStage.how || '',
      slaHours: 4,
      hasYesNoDecision: false,
    };
  }

  return isUserResponsibleForStage(curDef, curStage, user);
};

/**
 * Returns stage definitions array for any flow type
 */
export const getStageDefinitionsForFlowType = (flowType: string): FmsStageDefinition[] => {
  switch (flowType) {
    case 'BENEFICIARY_APPROVAL':
      return FMS_BENEFICIARY_APPROVAL_STAGES;
    case 'CHECK_STOCK':
      return FMS_CHECK_STOCK_STAGES;
    case 'PO_TO_PAYMENT':
      return FMS_PO_PAYMENT_STAGES;
    case 'PURCHASE_TO_STORE_DISPATCH':
      return FMS_PURCHASE_TO_STORE_DISPATCH_STAGES;
    case 'STORE_TO_SITE_DISPATCH':
      return FMS_STORE_TO_SITE_DISPATCH_STAGES;
    case 'PAYMENT_TO_DISPATCH':
      return FMS_PAYMENT_TO_DISPATCH_STAGES;
    case 'SITE_RECEIVE':
      return FMS_SITE_RECEIVE_STAGES;
    case 'ACCOUNTS_INVOICE_COLLECTION':
      return FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES;
    case 'HR_ATTENDANCE_PAYMENT':
      return FMS_HR_ATTENDANCE_PAYMENT_STAGES;
    case 'BREAKDOWN_REPORTING':
      return FMS_BREAKDOWN_REPORTING_STAGES;
    case 'EQUIPMENT_PART_REPAIR':
      return FMS_EQUIPMENT_PART_REPAIR_STAGES;
    case 'DPR_REPORTING':
      return FMS_DPR_REPORTING_STAGES;
    case 'INDENT_PURCHASE':
    default:
      return FMS_STANDARD_PURCHASE_STAGES;
  }
};

/**
 * Groups 16+ FMS flow types into 4 core operational domains
 */
export const getFmsDomainCategory = (flowType: string): {
  domainKey: 'PROCUREMENT' | 'FINANCE_ACCOUNTS' | 'SITE_LOGISTICS' | 'HR_EQUIPMENT';
  label: string;
  badgeClass: string;
} => {
  switch (flowType) {
    case 'INDENT_PURCHASE':
    case 'CHECK_STOCK':
    case 'SUBCONTRACTOR_BILLING':
      return {
        domainKey: 'PROCUREMENT',
        label: 'Procurement & Vendor Sourcing',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300'
      };
    case 'BENEFICIARY_APPROVAL':
    case 'PO_TO_PAYMENT':
    case 'ACCOUNTS_INVOICE_COLLECTION':
    case 'PAYROLL':
      return {
        domainKey: 'FINANCE_ACCOUNTS',
        label: 'Accounts, Invoices & Finance',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300'
      };
    case 'PURCHASE_TO_STORE_DISPATCH':
    case 'STORE_TO_SITE_DISPATCH':
    case 'PAYMENT_TO_DISPATCH':
    case 'SITE_RECEIVE':
    case 'FUEL_ISSUE':
      return {
        domainKey: 'SITE_LOGISTICS',
        label: 'Site Logistics & Material Movement',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300'
      };
    case 'HR_ATTENDANCE_PAYMENT':
    case 'BREAKDOWN_REPORTING':
    case 'EQUIPMENT_PART_REPAIR':
    case 'DPR_REPORTING':
    case 'LEAVE_SUBMISSION':
    default:
      return {
        domainKey: 'HR_EQUIPMENT',
        label: 'Plant, Equipment & Site Operations',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300'
      };
  }
};

/**
 * Calculates SLA compliance status for a specific stage execution
 */
export const getStageSlaStatus = (
  slaHours: number,
  status: string,
  plannedStr?: string
): {
  status: 'DONE' | 'OVERDUE' | 'NEAR_BREACH' | 'ON_TRACK';
  label: string;
  badgeClass: string;
} => {
  if (status === 'Done' || status === 'Skipped') {
    return { status: 'DONE', label: 'Completed', badgeClass: 'bg-emerald-100 text-emerald-800' };
  }

  if (slaHours === 0 || !slaHours) {
    return { status: 'ON_TRACK', label: 'As Needed (No SLA)', badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium' };
  }

  // Reference date matching system time: 05/10/2026
  const now = new Date(2026, 9, 5, 12, 0).getTime();
  
  if (!plannedStr) {
    return { status: 'ON_TRACK', label: `SLA: ${slaHours}h`, badgeClass: 'bg-slate-100 text-slate-700' };
  }

  try {
    const cleaned = plannedStr.split(' ')[0];
    const parts = cleaned.split('/');
    if (parts.length === 3) {
      const plannedTime = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
      const slaMs = slaHours * 60 * 60 * 1000;
      const deadline = plannedTime + slaMs;

      if (now > deadline) {
        const hrsOver = Math.round((now - deadline) / (1000 * 60 * 60));
        return { 
          status: 'OVERDUE', 
          label: `Overdue +${hrsOver}h`, 
          badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold animate-pulse' 
        };
      } else if (now > deadline - (slaMs * 0.3)) {
        return { 
          status: 'NEAR_BREACH', 
          label: `Near SLA (${slaHours}h)`, 
          badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold' 
        };
      }
    }
  } catch {
    // Fallback
  }

  return { status: 'ON_TRACK', label: `On Track (${slaHours}h SLA)`, badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
};

/**
 * Finds all linked parent and child FMS flows for linear lineage tracing
 */
export const getLinkedFmsChain = (currentFlow: FmsInstance, allFlows: FmsInstance[]): FmsInstance[] => {
  const chain: FmsInstance[] = [];
  const indent = currentFlow.indentNo || currentFlow.requisitionNumber;
  const po = currentFlow.poNumber;

  allFlows.forEach((f) => {
    const fIndent = f.indentNo || f.requisitionNumber;
    const fPo = f.poNumber;

    if (f.id === currentFlow.id) {
      chain.push(f);
      return;
    }

    if (f.linkedFlowId === currentFlow.flowId || currentFlow.linkedFlowId === f.flowId) {
      chain.push(f);
      return;
    }

    if (indent && fIndent && indent === fIndent) {
      chain.push(f);
      return;
    }

    if (po && fPo && po === fPo) {
      chain.push(f);
      return;
    }
  });

  return Array.from(new Set(chain));
};

/**
 * Accurately matches any FMS flow instance against a workflowKey or template ID
 */
export const isFlowMatchingWorkflow = (
  flow: FmsInstance,
  workflowKeyOrTemplateId?: string | null
): boolean => {
  if (!workflowKeyOrTemplateId || workflowKeyOrTemplateId === 'ALL') return true;
  const target = workflowKeyOrTemplateId.trim();
  const targetUpper = target.toUpperCase();

  // 1. Exact match on flowType or customTemplateId
  if (flow.flowType === target || flow.flowType?.toUpperCase() === targetUpper) return true;
  if (flow.customTemplateId === target || flow.customTemplateId?.toUpperCase() === targetUpper) return true;

  // 2. Builtin template ID and templateKey aliases
  const BUILTIN_KEY_MAP: Record<string, string> = {
    tpl_indent_purchase: 'INDENT_PURCHASE',
    INDENT_PURCHASE: 'tpl_indent_purchase',
    tpl_indent_to_po: 'INDENT_PURCHASE',
    INDENT_TO_PO: 'tpl_indent_purchase',
    tpl_check_stock: 'CHECK_STOCK',
    CHECK_STOCK: 'tpl_check_stock',
    STORE_CHECK_STOCK: 'CHECK_STOCK',
    tpl_store_check_stock: 'CHECK_STOCK',
    tpl_po_to_payment: 'PO_TO_PAYMENT',
    PO_TO_PAYMENT: 'tpl_po_to_payment',
    tpl_beneficiary_approval: 'BENEFICIARY_APPROVAL',
    BENEFICIARY_APPROVAL: 'tpl_beneficiary_approval',
    tpl_purchase_to_store: 'PURCHASE_TO_STORE_DISPATCH',
    PURCHASE_TO_STORE_DISPATCH: 'tpl_purchase_to_store',
    tpl_store_to_site: 'STORE_TO_SITE_DISPATCH',
    STORE_TO_SITE_DISPATCH: 'tpl_store_to_site',
    tpl_site_receive: 'SITE_RECEIVE',
    SITE_RECEIVE: 'tpl_site_receive',
    tpl_payment_to_dispatch: 'PAYMENT_TO_DISPATCH',
    PAYMENT_TO_DISPATCH: 'tpl_payment_to_dispatch',
    tpl_accounts_invoice: 'ACCOUNTS_INVOICE_COLLECTION',
    ACCOUNTS_INVOICE_COLLECTION: 'tpl_accounts_invoice',
    tpl_hr_attendance: 'HR_ATTENDANCE_PAYMENT',
    HR_ATTENDANCE_PAYMENT: 'tpl_hr_attendance',
    tpl_breakdown: 'BREAKDOWN_REPORTING',
    BREAKDOWN_REPORTING: 'tpl_breakdown',
    tpl_part_repair: 'EQUIPMENT_PART_REPAIR',
    EQUIPMENT_PART_REPAIR: 'tpl_part_repair',
    tpl_dpr: 'DPR_REPORTING',
    DPR_REPORTING: 'tpl_dpr',
  };

  const alias = BUILTIN_KEY_MAP[target] || BUILTIN_KEY_MAP[targetUpper];
  if (alias) {
    if (flow.flowType === alias || flow.flowType?.toUpperCase() === alias.toUpperCase()) return true;
    if (flow.customTemplateId === alias || flow.customTemplateId?.toUpperCase() === alias.toUpperCase()) return true;
  }

  // Beneficiary Approval fallback heuristics (indent or requisition starting with BEN)
  if (targetUpper === 'BENEFICIARY_APPROVAL' || target === 'tpl_beneficiary_approval') {
    if (flow.flowType === 'BENEFICIARY_APPROVAL') return true;
    if (flow.indentNo && flow.indentNo.toUpperCase().includes('BEN')) return true;
    if (flow.requisitionNumber && flow.requisitionNumber.toUpperCase().includes('BEN')) return true;
  }

  return false;
};

/**
 * Resolves the department key for any FMS flow instance
 */
export const getFlowDepartmentKey = (
  flow: FmsInstance, 
  customTemplates?: Array<{ id: string; departmentHub?: string; templateKey?: string }>
): string => {
  if (flow.customTemplateId && customTemplates) {
    const tpl = customTemplates.find((t) => t.id === flow.customTemplateId);
    if (tpl?.departmentHub) {
      const hub = tpl.departmentHub.toUpperCase();
      if (hub === 'PROCUREMENT') return 'PURCHASE';
      if (hub === 'SITE_LOGISTICS') return 'STORE';
      if (hub === 'FINANCE_ACCOUNTS') return 'ACCOUNTS';
      if (hub === 'HR_EQUIPMENT') return 'PLANT_OPS';
      return hub;
    }
  }

  const ft = flow.flowType;
  if (['CHECK_STOCK', 'STORE_TO_SITE_DISPATCH', 'PURCHASE_TO_STORE_DISPATCH', 'SITE_RECEIVE', 'FUEL_ISSUE'].includes(ft)) {
    return 'STORE';
  }
  if (['INDENT_PURCHASE', 'PAYMENT_TO_DISPATCH', 'SUBCONTRACTOR_BILLING'].includes(ft)) {
    return 'PURCHASE';
  }
  if (['PO_TO_PAYMENT', 'ACCOUNTS_INVOICE_COLLECTION', 'PAYROLL', 'BENEFICIARY_APPROVAL'].includes(ft)) {
    return 'ACCOUNTS';
  }
  if (['BREAKDOWN_REPORTING', 'EQUIPMENT_PART_REPAIR', 'HR_ATTENDANCE_PAYMENT', 'LEAVE_SUBMISSION'].includes(ft)) {
    return 'PLANT_OPS';
  }
  if (['DPR_REPORTING'].includes(ft)) {
    return 'OPERATIONS';
  }
  return 'OPERATIONS';
};

/**
 * Returns formatted label for department keys based on Department Hub configuration
 */
export const getDepartmentBranchLabel = (deptKey: string): string => {
  if (!deptKey) return 'General';

  try {
    const configuredDepts = storageAdapter.getDepartments();
    const match = configuredDepts.find(
      (d) => d.key.toUpperCase() === deptKey.toUpperCase() || d.id === deptKey
    );
    if (match && match.name) {
      return match.name;
    }
  } catch {
    // Fallback if storage not ready
  }

  switch (deptKey.toUpperCase()) {
    case 'PURCHASE':
    case 'PROCUREMENT':
      return 'Purchase';
    case 'STORE':
    case 'SITE_LOGISTICS':
      return 'Store';
    case 'ACCOUNTS':
    case 'FINANCE_ACCOUNTS':
      return 'Accounts';
    case 'PLANT_OPS':
    case 'HR_EQUIPMENT':
      return 'Plant & Ops';
    case 'OPERATIONS':
      return 'Operations';
    default:
      return deptKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

/**
 * Maps a workflow key/template ID to its parent department key
 */
export const getDepartmentForWorkflow = (
  wfKey: string | null | undefined, 
  customTemplates: any[] = [], 
  flows: any[] = []
): string | null => {
  if (!wfKey || wfKey === 'ALL') return null;

  const k = wfKey.toLowerCase();
  
  if (k.includes('check_stock') || k.includes('store_dispatch') || k.includes('site_issue') || k.includes('site_receive') || k.includes('store')) {
    return 'STORE';
  }
  if (k.includes('indent') || k.includes('purchase') || k.includes('vendor_payment_dispatch') || k.includes('payment_to_dispatch')) {
    return 'PURCHASE';
  }
  if (k.includes('po_to_payment') || k.includes('beneficiary') || k.includes('accounts') || k.includes('invoice_collection')) {
    return 'ACCOUNTS';
  }
  if (k.includes('hr_attendance') || k.includes('breakdown') || k.includes('equipment_part_repair') || k.includes('plant_ops') || k.includes('labour')) {
    return 'PLANT_OPS';
  }
  if (k.includes('dpr') || k.includes('operations')) {
    return 'OPERATIONS';
  }

  // Check custom templates
  const tpl = customTemplates.find(t => t.id === wfKey || t.templateKey === wfKey);
  if (tpl && tpl.departmentHub) {
    return tpl.departmentHub;
  }

  // Check flows
  const flow = flows.find(f => f.flowType === wfKey || f.customTemplateId === wfKey || isFlowMatchingWorkflow(f, wfKey));
  if (flow) {
    return getFlowDepartmentKey(flow, customTemplates);
  }

  return null;
};

/**
 * Checks if a ChecklistItem belongs to a given department key
 */
export const matchItemDepartment = (itemDept: string | undefined, deptKey: string): boolean => {
  if (!itemDept || !deptKey) return false;
  const d1 = itemDept.trim().toUpperCase();
  const d2 = deptKey.trim().toUpperCase();

  if (d1 === d2) return true;

  if (d2 === 'PURCHASE') {
    return d1.includes('PURCHASE') || d1.includes('PROCUREMENT');
  }
  if (d2 === 'STORE') {
    return d1.includes('STORE') || d1.includes('WAREHOUSE') || d1.includes('CSR');
  }
  if (d2 === 'ACCOUNTS') {
    return d1.includes('ACCOUNT') || d1.includes('FINANCE') || d1.includes('AUDIT');
  }
  if (d2 === 'PLANT_OPS') {
    return d1.includes('PLANT') || d1.includes('HR') || d1.includes('MECHANIC') || d1.includes('EQUIP');
  }
  if (d2 === 'OPERATIONS') {
    return d1.includes('IT') || d1.includes('STRUCTURE') || d1.includes('SR. STRUCTURE') || d1.includes('MIS') || d1.includes('OPERAT');
  }

  return d1.includes(d2) || d2.includes(d1);
};

/**
 * Checks if a DelegationTask belongs to a given department key based on assignee and role
 */
export const matchTaskDepartment = (
  task: DelegationTask, 
  deptKey: string, 
  usersList?: UserProfile[]
): boolean => {
  if (!task || !deptKey) return false;
  const targetDept = deptKey.trim().toUpperCase();
  const taskName = (task.name || '').toLowerCase();
  const rolePhone = (task.rolePhone || '').toLowerCase();
  const taskDesc = (task.task || '').toLowerCase();

  // 1. Try matching with configured users
  if (usersList && usersList.length > 0) {
    const matchedUser = usersList.find((u) => {
      const uName = u.name.toLowerCase();
      return taskName.includes(uName) || rolePhone.includes(uName);
    });

    if (matchedUser) {
      if (matchedUser.departmentKeys && matchedUser.departmentKeys.some(k => k.toUpperCase() === targetDept)) {
        return true;
      }
      if (matchedUser.departmentId?.toUpperCase().includes(targetDept)) {
        return true;
      }
      if (matchedUser.departmentName && matchItemDepartment(matchedUser.departmentName, targetDept)) {
        return true;
      }
    }
  }

  // 2. Fallback to keyword matching on task assignee, role, and task description
  if (targetDept === 'PURCHASE') {
    return rolePhone.includes('purchase') || rolePhone.includes('procurement') ||
           taskName.includes('shyam') || taskName.includes('rajnikant') || taskName.includes('vivek') || taskName.includes('rajendra') ||
           taskDesc.includes('indent') || taskDesc.includes('quotation') || taskDesc.includes('purchase order') || taskDesc.includes('po ');
  }
  if (targetDept === 'STORE') {
    return rolePhone.includes('store') || rolePhone.includes('warehouse') ||
           taskName.includes('amanat') || taskName.includes('sumant') || taskName.includes('hemant') ||
           taskDesc.includes('stock') || taskDesc.includes('inventory') || taskDesc.includes('dispatch') || taskDesc.includes('mrn');
  }
  if (targetDept === 'ACCOUNTS') {
    return rolePhone.includes('account') || rolePhone.includes('finance') ||
           taskName.includes('priyanka') || taskName.includes('khushboo') || taskName.includes('pranjal') || taskName.includes('manish') ||
           taskDesc.includes('payment') || taskDesc.includes('voucher') || taskDesc.includes('bill') || taskDesc.includes('salary') || taskDesc.includes('payroll');
  }
  if (targetDept === 'PLANT_OPS') {
    return rolePhone.includes('plant') || rolePhone.includes('mechanic') || rolePhone.includes('hr') ||
           taskName.includes('garima') || taskName.includes('mamta') || taskName.includes('chakraworti') || taskName.includes('chakraborty') ||
           taskDesc.includes('breakdown') || taskDesc.includes('repair') || taskDesc.includes('attendance') || taskDesc.includes('machine');
  }
  if (targetDept === 'OPERATIONS') {
    return rolePhone.includes('it ') || rolePhone.includes('mis') || rolePhone.includes('project') || rolePhone.includes('structure') ||
           taskName.includes('byamkesh') || taskName.includes('pooja') || taskName.includes('pranay') || taskName.includes('aman kumar') ||
           taskDesc.includes('vpn') || taskDesc.includes('server') || taskDesc.includes('pole') || taskDesc.includes('dpr');
  }

  return false;
};

