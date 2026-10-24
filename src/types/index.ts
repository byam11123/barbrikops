export type Frequency = 'D' | 'W' | 'M'; // Daily, Weekly, Monthly

export type TaskStatus = 'Pending' | 'Completed' | 'Week Shifted' | 'In Progress' | 'Delayed' | 'Done';

export type Priority = 'Urgent' | 'Normal' | 'Low';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'DIRECTOR' | 'EXECUTIVE_ASSISTANT' | 'PROCESS_COORDINATOR' | 'DEPT_ADMIN' | 'PROCESS_MANAGER' | 'OPERATIONAL_USER';

export interface UserSession {
  sessionId: string;
  loginTime: string;
  ipAddress: string;
  deviceInfo: string;
  status: 'ACTIVE' | 'EXPIRED';
}

export interface UserProfile {
  userId: string;
  name: string;
  username?: string;
  password?: string;
  role: string; // e.g. "Store Manager" or "SUPER_ADMIN"
  systemRole?: UserRole; // "SUPER_ADMIN" | "ADMIN" | "DEPT_ADMIN" | "PROCESS_MANAGER" | "OPERATIONAL_USER"
  departmentId: string;
  departmentName: string;
  departmentKeys?: string[];
  phone: string;
  whatsappPhone?: string;
  email: string;
  avatarUrl?: string;
  siteLocation?: string;
  siteAccess?: string[]; // Array of allowed sites for multi-site or transferred users
  shiftHours?: string;
  status?: 'ACTIVE' | 'ON_LEAVE' | 'INACTIVE';
  approvalPin?: string;
  sessions?: UserSession[];
  lastLoginAt?: string;
  permissions?: ModulePermissionMap;
}

export interface ModulePermission {
  visible: boolean; // Show or hide module/tab
  canEdit: boolean; // Can create/edit records in this module
  canDelete: boolean; // Can delete records in this module
}

export type ModulePermissionMap = Record<string, ModulePermission>;

export type ModuleCategory = 'CORE' | 'OPERATIONS' | 'UTILITIES' | 'DEPARTMENTS' | 'CONTROL' | 'GOVERNANCE';
export type SidebarSectionKey = 'USER' | 'OPERATIONS' | 'UTILITIES' | 'DEPARTMENTS' | 'GOVERNANCE';

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: ModuleCategory;
  sectionKey?: SidebarSectionKey;
  iconName?: string;
  isSafeguarded?: boolean;
}

export interface ModuleSectionDefinition {
  sectionKey: SidebarSectionKey;
  title: string;
  sidebarLabel: string;
  description: string;
  iconName: string;
  modules: ModuleDefinition[];
}

export const SYSTEM_MODULES: ModuleDefinition[] = [
  // 1. User Modules (Workbench)
  { id: 'summary', name: 'My Work', description: 'Personal daily workbench, tasks, and today due items', category: 'CORE', sectionKey: 'USER', iconName: 'CalendarCheck2' },
  { id: 'mis', name: 'My Scoreboard', description: 'Performance analytics, completion metrics, and SLA status', category: 'CORE', sectionKey: 'USER', iconName: 'BarChart3' },

  // 2. Operations Modules
  { id: 'fms', name: 'All FMS', description: 'Step-by-step cross-departmental operations tracking workflows', category: 'OPERATIONS', sectionKey: 'OPERATIONS', iconName: 'GitBranch' },
  { id: 'fms-audit', name: 'FMS Records & Audit', description: 'Historic workflow records, CSV export and compliance verification', category: 'OPERATIONS', sectionKey: 'OPERATIONS', iconName: 'FileSpreadsheet' },
  { id: 'delegation', name: 'Delegation', description: 'Cross-functional task assignments and delegation board', category: 'OPERATIONS', sectionKey: 'OPERATIONS', iconName: 'ListTodo' },
  { id: 'checklist', name: 'Checklist', description: 'Recurring periodic checklists and SOP verification', category: 'OPERATIONS', sectionKey: 'OPERATIONS', iconName: 'CheckSquare' },
  { id: 'ims', name: 'Inventory', description: 'Material catalog, bin stocks, and inventory movements', category: 'OPERATIONS', sectionKey: 'OPERATIONS', iconName: 'Boxes' },

  // 3. Utilities & Tools
  { id: 'cs-sheet', name: 'Comparative Statement', description: 'Vendor rate comparison, L-1 analysis, and Excel CS generation for Barbrik Project Ltd.', category: 'UTILITIES', sectionKey: 'UTILITIES', iconName: 'Scale' },
  { id: 'bank-payments', name: 'Bank Payments', description: 'Vendor disbursements, beneficiary master verification, and interbank treasury transfers', category: 'UTILITIES', sectionKey: 'UTILITIES', iconName: 'Landmark' },
  { id: 'vendor-directory', name: 'Vendor Directory', description: 'Vendor master profiles, commercial GSTIN/PAN details, and verified bank accounts', category: 'UTILITIES', sectionKey: 'UTILITIES', iconName: 'Users' },

  // 4. Department Modules (Individual controls per department)
  { id: 'dept-PURCHASE', name: 'Purchase Department', description: 'Central Procurement, Indents, RFQs, Vendor Comparison and PO Workflows', category: 'DEPARTMENTS', sectionKey: 'DEPARTMENTS', iconName: 'ShoppingCart' },
  { id: 'dept-STORE', name: 'Store & Logistics', description: 'Site inventory, Material Inward, Stock Transfers, Bin Locations and Dispatches', category: 'DEPARTMENTS', sectionKey: 'DEPARTMENTS', iconName: 'Warehouse' },
  { id: 'dept-ACCOUNTS', name: 'Finance & Accounts', description: 'Bill Verification, GST Invoicing, Advance Payments, Financial Audits and Ledger', category: 'DEPARTMENTS', sectionKey: 'DEPARTMENTS', iconName: 'Landmark' },
  { id: 'dept-PLANT_OPS', name: 'Plant & Operations', description: 'Heavy machinery, plant maintenance, equipment logs and SOP compliance', category: 'DEPARTMENTS', sectionKey: 'DEPARTMENTS', iconName: 'Wrench' },

  // 5. System Governance
  { id: 'registry', name: 'Registry', description: 'System central master registries, vendors, item master, and departments', category: 'CONTROL', sectionKey: 'GOVERNANCE', iconName: 'Sliders' },
  { id: 'audit', name: 'Audit Logs', description: 'Chronological activity stream and compliance change audit trails', category: 'CONTROL', sectionKey: 'GOVERNANCE', iconName: 'History' },
  { id: 'super-admin', name: 'Users & Access Governance', description: 'User directory, staff management, role assignment & access control governance (Super Admin Safeguard)', category: 'CONTROL', sectionKey: 'GOVERNANCE', iconName: 'ShieldCheck', isSafeguarded: true },
];

export const SYSTEM_MODULE_SECTIONS: ModuleSectionDefinition[] = [
  {
    sectionKey: 'USER',
    title: 'User Modules',
    sidebarLabel: 'User Workbench',
    description: 'Personal daily workbench, tasks, and scoreboard metrics',
    iconName: 'CalendarCheck2',
    modules: SYSTEM_MODULES.filter((m) => m.sectionKey === 'USER'),
  },
  {
    sectionKey: 'OPERATIONS',
    title: 'Operations Modules',
    sidebarLabel: 'Operations Modules',
    description: 'Cross-departmental operations tracking workflows, checklists, tasks, and inventory',
    iconName: 'GitBranch',
    modules: SYSTEM_MODULES.filter((m) => m.sectionKey === 'OPERATIONS'),
  },
  {
    sectionKey: 'UTILITIES',
    title: 'Utilities & Tools',
    sidebarLabel: 'Utilities & Tools',
    description: 'Operational analysis, rate comparisons, and business utilities',
    iconName: 'Scale',
    modules: SYSTEM_MODULES.filter((m) => m.sectionKey === 'UTILITIES'),
  },
  {
    sectionKey: 'DEPARTMENTS',
    title: 'Department Modules',
    sidebarLabel: 'Department Modules',
    description: 'Dynamic department branches with individual workflow, checklist, and delegation access',
    iconName: 'FolderTree',
    modules: SYSTEM_MODULES.filter((m) => m.sectionKey === 'DEPARTMENTS'),
  },
  {
    sectionKey: 'GOVERNANCE',
    title: 'System Governance',
    sidebarLabel: 'System Modules',
    description: 'System master configuration, user administration, and security audit logs',
    iconName: 'ShieldCheck',
    modules: SYSTEM_MODULES.filter((m) => m.sectionKey === 'GOVERNANCE'),
  },
];

export function isUserSuperAdmin(user?: UserProfile | null): boolean {
  if (!user) return false;
  return (
    user.userId === 'USR-000' ||
    user.systemRole === 'SUPER_ADMIN' ||
    user.role === 'SUPER_ADMIN' ||
    user.role === 'Super Admin' ||
    user.username === 'superadmin'
  );
}

export function isUserAdmin(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (isUserSuperAdmin(user)) return false;
  const sysRole = (user.systemRole || '').toUpperCase();
  const role = (user.role || '').toUpperCase();
  return (
    sysRole === 'ADMIN' ||
    role === 'ADMIN' ||
    user.userId === 'USR-ADMIN-01' ||
    user.username === 'admin'
  );
}

export function isUserAdminOrSuperAdmin(user?: UserProfile | null): boolean {
  return isUserSuperAdmin(user) || isUserAdmin(user);
}

export function isUserDirector(user?: UserProfile | null): boolean {
  if (!user) return false;
  const sysRole = (user.systemRole || '').toUpperCase();
  const role = (user.role || '').toUpperCase();
  const name = (user.name || '').toLowerCase();
  const username = (user.username || '').toLowerCase();
  const email = (user.email || '').toLowerCase();

  return (
    sysRole === 'DIRECTOR' ||
    role === 'DIRECTOR' ||
    role.includes('DIRECTOR') ||
    role.includes('MANAGING DIRECTOR') ||
    name.includes('pranjal') ||
    username.includes('pranjal') ||
    email.includes('pranjal') ||
    user.userId === 'USR-DIR-01'
  );
}

export function isUserEA(user?: UserProfile | null): boolean {
  if (!user) return false;
  const sysRole = (user.systemRole || '').toUpperCase();
  const role = (user.role || '').toUpperCase();
  return (
    sysRole === 'EXECUTIVE_ASSISTANT' ||
    role === 'EXECUTIVE_ASSISTANT' ||
    role.includes('EXECUTIVE ASSISTANT') ||
    role === 'EA'
  );
}

export function isUserProcessCoordinator(user?: UserProfile | null): boolean {
  if (!user) return false;
  const sysRole = (user.systemRole || '').toUpperCase();
  const role = (user.role || '').toUpperCase();
  const name = (user.name || '').toLowerCase();
  return (
    sysRole === 'PROCESS_COORDINATOR' ||
    role === 'PROCESS_COORDINATOR' ||
    role.includes('PROCESS COORDINATOR') ||
    role === 'PC' ||
    name.includes('ritu sahu')
  );
}

export function isUserAuthorizedForVendorBanking(user?: UserProfile | null): boolean {
  if (!user) return false;
  if (isUserSuperAdmin(user) || isUserAdmin(user) || isUserDirector(user)) return true;
  const role = (user.role || '').toUpperCase();
  const sysRole = (user.systemRole || '').toUpperCase();
  const deptName = (user.departmentName || '').toUpperCase();
  const deptKeys = user.departmentKeys || [];
  return (
    deptKeys.includes('ACCOUNTS') ||
    deptKeys.includes('FINANCE') ||
    deptName.includes('ACCOUNT') ||
    deptName.includes('FINANCE') ||
    role.includes('ACCOUNT') ||
    sysRole.includes('ACCOUNT')
  );
}

export function getUserModulePermission(
  user: UserProfile | null | undefined,
  moduleId: string
): ModulePermission {
  if (!user) {
    return { visible: false, canEdit: false, canDelete: false };
  }
  // Super Admin holds full unrestricted master access across all modules
  if (isUserSuperAdmin(user)) {
    return { visible: true, canEdit: true, canDelete: true };
  }

  // Admin holds full master access to User Modules, Utilities, Department Modules, System Governance, and department workflows
  if (isUserAdmin(user)) {
    return { visible: true, canEdit: true, canDelete: true };
  }

  // If specific permissions have been configured for this user, respect them
  if (user.permissions && user.permissions[moduleId]) {
    return user.permissions[moduleId];
  }
  // Core user modules are visible to everyone
  if (moduleId === 'summary' || moduleId === 'mis' || moduleId === 'site-requisitions') {
    return { visible: true, canEdit: false, canDelete: false };
  }
  // Department modules (dept-*) default based on user's assigned departments
  if (moduleId.startsWith('dept-')) {
    const deptKey = moduleId.replace('dept-', '').toUpperCase();
    if (user.departmentKeys?.some((k) => k.toUpperCase() === deptKey) || user.departmentId?.toUpperCase().includes(deptKey)) {
      return { visible: true, canEdit: true, canDelete: false };
    }
    return { visible: false, canEdit: false, canDelete: false };
  }
  // Administrative control & governance modules are restricted to Admins by default
  if (moduleId === 'registry' || moduleId === 'audit' || moduleId === 'super-admin') {
    return { visible: false, canEdit: false, canDelete: false };
  }
  if (['fms', 'delegation', 'checklist', 'ims', 'fms-audit', 'template-studio'].includes(moduleId)) {
    return { visible: true, canEdit: true, canDelete: false };
  }
  if (moduleId === 'vendor-directory') {
    return { visible: true, canEdit: isUserAuthorizedForVendorBanking(user), canDelete: isUserSuperAdmin(user) };
  }
  if (moduleId === 'bank-payments') {
    return { visible: true, canEdit: true, canDelete: isUserSuperAdmin(user) };
  }
  if (moduleId === 'cs-sheet') {
    return { visible: false, canEdit: false, canDelete: false };
  }
  return { visible: false, canEdit: false, canDelete: false };
}

export function hasModulePermission(
  user: UserProfile | null | undefined,
  moduleId: string,
  action: 'view' | 'edit' | 'delete' = 'view'
): boolean {
  const perm = getUserModulePermission(user, moduleId);
  if (action === 'view') return perm.visible;
  if (action === 'edit') return perm.canEdit;
  if (action === 'delete') return perm.canDelete;
  return false;
}

export function isUserGlobalView(user?: UserProfile | null): boolean {
  if (!user) return true;
  return (
    isUserAdminOrSuperAdmin(user) ||
    isUserDirector(user) ||
    isUserProcessCoordinator(user) ||
    isUserEA(user)
  );
}

export function getUserAllowedSites(user?: UserProfile | null): string[] {
  if (!user) return ['ALL'];
  const sites: string[] = [];
  if (user.siteAccess && Array.isArray(user.siteAccess) && user.siteAccess.length > 0) {
    sites.push(...user.siteAccess);
  }
  if (user.siteLocation) {
    sites.push(user.siteLocation);
  }
  if (sites.length === 0) {
    sites.push('Siladehi Site', 'Siladehi');
  }
  return Array.from(new Set(sites.map((s) => s.trim().toUpperCase())));
}

export function isFlowAccessibleToUser(flow: FmsInstance, user?: UserProfile | null): boolean {
  if (!user || isUserGlobalView(user)) return true;

  // Rule: flow.siteName IN (currentUser.siteAccess || [currentUser.siteLocation]) OR flow.createdBy === currentUser.name
  const allowedSites = getUserAllowedSites(user);
  const flowSiteUpper = (flow.siteName || '').trim().toUpperCase();

  const matchesSite = allowedSites.some((s) => {
    if (s === 'ALL') return true;
    const cleanS = s.replace(/\s+SITE$/i, '').trim().toUpperCase();
    const cleanFlowSite = flowSiteUpper.replace(/\s+SITE$/i, '').trim().toUpperCase();
    return cleanS === cleanFlowSite || flowSiteUpper.includes(cleanS) || cleanS.includes(flowSiteUpper);
  });

  const flowCreatedBy = (flow.createdBy || flow.dprPreparedBy || flow.submittedBy || '').trim().toLowerCase();
  const userName = (user.name || '').trim().toLowerCase();
  const matchesCreatedBy = userName !== '' && (
    flowCreatedBy.includes(userName) ||
    userName.includes(flowCreatedBy) ||
    flow.createdByUserId === user.userId
  );

  return matchesSite || matchesCreatedBy;
}

export interface NoticeBoardItem {
  id: string;
  title: string;
  category: 'URGENT' | 'SAFETY' | 'SITE_OPS' | 'CIRCULAR' | 'GENERAL';
  content: string;
  date: string;
  author: string;
  isPinned?: boolean;
}

export type ShowcaseCategory = 'ALL' | 'NOTICE' | 'QUOTE' | 'CELEBRATION' | 'WISHES' | 'GALLERY';

export interface DynamicShowcaseSlide {
  id: string;
  category: 'NOTICE' | 'QUOTE' | 'CELEBRATION' | 'WISHES' | 'GALLERY';
  title: string;
  subtitle?: string;
  content: string;
  authorOrTarget?: string;
  date?: string;
  imageUrl?: string;
  badgeText?: string;
  tagColor?: 'rose' | 'amber' | 'indigo' | 'emerald' | 'purple' | 'sky';
  isPinned?: boolean;
}

export interface Department {
  departmentId: string;
  name: string;
  code: string;
  headUserId: string;
  sheetId?: string;
  driveFolderId?: string;
}

export interface ProcessRemark {
  id: string;
  authorName: string; // e.g. "Ritu Sahu"
  authorRole: string; // e.g. "Process Coordinator"
  category: 'VENDOR_DELAY' | 'AWAITING_APPROVAL' | 'STAFF_ON_LEAVE' | 'SITE_DOCS_MISSING' | 'TECHNICAL_ISSUE' | 'OTHER';
  remarkText: string;
  timestamp: string;
  isResolved?: boolean;
}

// Checklist Module
export interface ChecklistItem {
  id: string; // stable identifier
  taskId: string; // e.g. "270", "319"
  name: string;
  email: string;
  buddyEmail?: string;
  department: string;
  frequency: Frequency;
  task: string;
  plannedDate: string; // DD/MM/YYYY
  actualDate?: string;
  status: 'Done' | 'Pending' | 'Delayed';
  notes?: string;
  evidenceUrl?: string;
  createdAt: string;
  updatedAt: string;
  processRemarks?: ProcessRemark[];
  lastNudgeTimestamp?: string;
}

// Delegation Module
export interface DelegationTask {
  id: string; // stable identifier
  taskId: string; // e.g. "vhdlgas", "nfs3wfn"
  name: string;
  rolePhone: string;
  task: string;
  firstDate: string; // DD/MM/YYYY
  revision1?: string;
  revision2?: string;
  latestRevision: string;
  totalRevisions: number;
  status: 'Pending' | 'Completed' | 'Week Shifted';
  priority?: Priority;
  revisionHistory?: Array<{
    revisionNumber: number;
    previousDate: string;
    newDate: string;
    reason: string;
    timestamp: string;
    revisedBy: string;
  }>;
  completedAt?: string;
  notes?: string;
  processRemarks?: ProcessRemark[];
  lastNudgeTimestamp?: string;
}

// FMS (Flow Management System)
export interface FmsStageDefinition {
  stageId: string;
  stageNumber: number;
  name: string; // e.g. "INDENT RECIEVE", "PURCHASE APPROVAL", "GET QUOTATION"
  what: string;
  whoRole: string;
  whoDefaultAssignee: string;
  howChannel: string; // e.g. "WHATSAPP / CALL / PHYSICAL", "GOOGLE FORM"
  slaHours: number; // e.g. 1, 3, 25, 12, etc.
  isCheckpoint?: boolean;
  formUrl?: string;
  hasYesNoDecision?: boolean;
  fields?: FmsStageFieldConfig[];
  logic?: FmsStageLogicConfig;
  subWorkflowTrigger?: FmsSubWorkflowTriggerConfig;
  subWorkflowTriggers?: FmsSubWorkflowTriggerConfig[];
}


export interface DepartmentDefinition {
  id: string;
  key: string; // e.g. "PURCHASE", "STORE", "ACCOUNTS"
  name: string; // e.g. "Purchase", "Central Store", "Finance & Accounts"
  description?: string;
  icon?: string;
  isDefault?: boolean;
  isArchived?: boolean;
  createdAt: string;
}

export interface FmsSubWorkflowTriggerConfig {
  id?: string;
  enabled: boolean;
  name?: string;
  targetTemplateKey?: string; // e.g. 'INDENT_PURCHASE', 'STORE_TO_SITE_DISPATCH', 'PO_TO_PAYMENT', etc.
  action?: string;
  target?: string;
  triggerCondition?: 'ON_COMPLETE' | 'ON_DECISION_YES' | 'ON_DECISION_NO' | 'ON_FIELD_MATCH';
  filterFieldId?: string; // e.g. 'disposition', 'purchaseRequired'
  filterFieldValue?: string; // e.g. 'Purchase', 'Yes'
  targetStageId?: string;
  fieldMappings?: Array<{
    sourceField: string;
    targetField: string;
  }>;
  // Dynamic Assignee Routing Configuration
  targetAssigneeRule?: 'DYNAMIC_ROLE' | 'SPECIFIC_USER' | 'INHERIT_PARENT';
  targetRole?: string; // e.g., 'PURCHASE_MANAGER', 'STORE_MANAGER', 'FINANCE_ACCOUNTS', 'PROJECT_MANAGER'
  targetAssignee?: string; // e.g., 'Brahmanand Patel', 'Amanat Bharadwaj'
  payloadItemFilter?: 'ALL_ITEMS' | 'MATCHING_ROWS_ONLY' | 'REQUISITION_HEADER_ONLY';
  splitOutputs?: {
    storeRole?: string;
    storeAssignee?: string;
    purchaseRole?: string;
    purchaseAssignee?: string;
    holdReviewAssignee?: string;
  };
}

export interface FmsStageFieldColumnConfig {
  key: string;
  label: string;
  type?: 'TEXT' | 'NUMBER' | 'SELECT';
  options?: string[];
  placeholder?: string;
  defaultValue?: string;
}

export interface FmsStageFieldConfig {
  id: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'SELECT' | 'APPROVAL' | 'STATUS_DONE' | 'URL' | 'TEXTAREA' | 'DATE' | 'FILE' | 'CHECKBOX' | 'MULTI_ITEM_TABLE' | 'CS_MODULE_EMBED' | 'CS_L1_APPROVAL_EMBED' | 'SPLIT_PO_GENERATOR' | 'ACCOUNTS_DOUBLE_ENTRY_VERIFICATION';
  options?: string[];
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
  columns?: FmsStageFieldColumnConfig[];
  // Inheritance / Auto-Populate from Upstream Stages
  isInherited?: boolean;
  inheritedSourceField?: string; // e.g. "Stage 1 - requisitionItems", "Header - siteName"
  isReadOnly?: boolean;
  // Multi-Item Table Row Routing Config
  rowRoutingConfig?: {
    dispositionColumnKey?: string; // e.g. 'triageAllocation', 'disposition'
    storeAllocationValue?: string; // e.g. 'STORE_DISPATCH', 'Store Stock'
    purchaseAllocationValue?: string; // e.g. 'PURCHASE_REQUISITION', 'Purchase'
    holdAllocationValue?: string; // e.g. 'HELD_ARCHIVED', 'Hold / Archive'
  };
}

export interface FmsStageLogicConfig {
  slaHours?: number;
  gatewayType: 'STANDARD_ADVANCE' | 'APPROVAL_DECISION' | 'CONDITIONAL_JUMP' | 'VERIFY_CLOSE' | 'CONDITIONAL_DECISION' | 'RETURN_LOOP';
  decisionOptions?: string[];
  approveTargetStageIndex?: number;
  requestQuoteTargetStageIndex?: number;
  progression?: string;
  targetStageIndex?: number;
  rejectionBehavior?: 'HALT_WORKFLOW' | 'RETURN_TO_PREVIOUS';
  yesTargetStageIndex?: number;
  noTargetStageIndex?: number;
  yesConditionLabel?: string;
  noConditionLabel?: string;
  // Conditional Branch Builder (If Field Equals Value Then Go To Stage N Else Go To Stage M)
  conditionFieldId?: string; // Field to evaluate, e.g. "is_eway_required"
  conditionOperator?: 'EQUALS' | 'NOT_EQUALS' | 'CONTAINS' | 'GREATER_THAN';
  conditionValue?: string; // Value to compare, e.g. "Yes", "Purchase"
  thenTargetStageIndex?: number; // Jump to stage index if True
  elseTargetStageIndex?: number; // Jump to stage index if False
}

export interface FmsStageTemplate {
  stageId: string;
  stageName: string;
  whoRole: string;
  whoDefaultAssignee: string;
  howChannel?: string;
  slaHours: number;
  logic?: FmsStageLogicConfig;
  fields?: FmsStageFieldConfig[];
  checkpoints?: string[];
  subWorkflowTrigger?: FmsSubWorkflowTriggerConfig;
  subWorkflowTriggers?: FmsSubWorkflowTriggerConfig[]; // Support multiple triggers per stage
}

export interface FmsTemplateDefinition {
  id: string;
  templateKey: string;
  name: string;
  departmentHub: 'PROCUREMENT' | 'FINANCE_ACCOUNTS' | 'SITE_LOGISTICS' | 'HR_EQUIPMENT' | 'OPERATIONS' | 'GENERAL' | string;
  description?: string;
  referenceLabel: string;
  defaultPriority: Priority;
  stages: FmsStageTemplate[];
  createdAt: string;
  updatedAt: string;
  isCustom?: boolean;
  isArchived?: boolean;
}

export interface FmsOverrideLog {
  id: string;
  fmsInstanceId: string;
  performedByUserId: string;
  performedByUserName: string;
  performedByUserRole: string;
  previousStageIndex: number;
  newStageIndex: number;
  previousStageName: string;
  newStageName: string;
  reason: string;
  timestamp: string;
}

export interface FmsStageExecution {
  stageId: string;
  stageName: string;
  whoRole?: string;
  whoDefaultAssignee?: string;
  assignee: string;
  how: string;
  plannedDateTime?: string;
  actualDateTime?: string;
  targetDurationHours?: number;
  slaHours?: number;
  stageStartedAt?: string;
  plannedTimestamp?: string; // ISO string calculated from stageStartedAt + SLA hours
  actualTimestamp?: string;  // ISO string recorded on completion
  status: 'Pending' | 'In Progress' | 'Done' | 'Skipped' | 'Delayed' | 'Completed' | 'Rejected' | 'OVERRIDDEN' | 'Returned to Purchaser' | 'Returned for Revision' | 'Returned / On Hold';
  decisionValue?: 'Yes' | 'No' | '' | string; // For checkpoint decisions
  timeDelayHours?: number;
  delayHours?: number;
  notes?: string;
  remarks?: string;
  formResponseRef?: string;
  evidenceDocumentUrl?: string;
  googleFormUrl?: string;
  doerName?: string;
  processRemarks?: ProcessRemark[];
  lastNudgeTimestamp?: string;
  fields?: FmsStageFieldConfig[];
  submittedData?: Record<string, any>;
  logic?: FmsStageLogicConfig;
  checkpoints?: string[];
  checkedCheckpoints?: string[];
  subWorkflowTrigger?: FmsSubWorkflowTriggerConfig;
  subWorkflowTriggers?: FmsSubWorkflowTriggerConfig[];
  inheritedData?: Record<string, any>;
  linkedModuleRecord?: {
    moduleType: 'CS_SHEET' | 'PO' | 'GRN' | 'INVOICE' | 'APPROVAL' | string;
    recordId: string;
    recordNumber?: string;
    metadata?: Record<string, any>;
  };
}

export interface FmsVendorQuote {
  vendorId?: string;
  vendorName: string;
  ratePerUnit: number;
  totalAmount: number;
  quotedDate?: string;
  isL1Selected?: boolean;
  notes?: string;
}

export interface FmsLineItem {
  id: string;
  itemDescription: string;
  qty: number;
  requestedQty?: number;
  unit: string;
  urgency?: 'NORMAL' | 'URGENT' | 'HIGH';
  remark?: string;
  remarks?: string;
  workPurpose?: string; // Specific work/site task (e.g. "Pier 4 foundation pour")

  // Stage 2 Store Physical Check & Revision
  physicalStockFound?: number; // Physical count verified in store bin/shelf
  storeBinLocation?: string; // Physical location/bin in store
  storeVerifiedQty?: number; // Revised approved quantity after store assessment
  qtyRevisionReason?: string; // Reason if quantity is reduced or increased

  // Triage Allocations
  storeQty?: number; // Fulfilled from physical store stock -> Routes to Store Dispatch
  purchaseQty?: number; // Allocated to procurement -> Routes to Purchase Indent
  holdQty?: number; // Put on hold / deferred
  triageAllocation?: 'STORE' | 'PURCHASE' | 'SPLIT' | 'HOLD' | 'STORE_DISPATCH' | 'PURCHASE_REQUISITION' | 'HELD_ARCHIVED';
  storeStockQtyAvailable?: number;
  purchaseQtyRequired?: number;
  vendorQuotes?: FmsVendorQuote[];
  selectedL1Vendor?: string;
  selectedL1Amount?: number;
  // Multi-Store Triage Fields
  inventoryItemId?: string; // Master Inventory Catalog SKU ID (e.g. "ITEM-CON-001")
  csrStock?: number; // Stock available at Central Store / Raipur Workshop
  otherSiteStock?: number; // Stock available at other site
  stockSiteName?: string; // Location name of other site stock
  csrQty?: number; // Amount dispatched from Central Store
  otherSiteQty?: number; // Amount dispatched from other site
  dispatchSource?: string; // e.g. "Central Store", "Bijetala Site", "Central Store & Bijetala Site"
  status?: 'PENDING_TRIAGE' | 'IN_STORE_DISPATCH' | 'IN_PURCHASE_QUOTE' | 'L1_APPROVED' | 'PURCHASED' | 'DELIVERED_TO_SITE' | 'ARCHIVED';
  purchaserQty?: number;
}

export interface FmsInstance {
  id: string;
  flowId: string;
  title?: string;
  templateKey?: string;
  flowType: 'CHECK_STOCK' | 'INDENT_PURCHASE' | 'PO_TO_PAYMENT' | 'PURCHASE_TO_STORE_DISPATCH' | 'STORE_TO_SITE_DISPATCH' | 'PAYMENT_TO_DISPATCH' | 'SITE_RECEIVE' | 'ACCOUNTS_INVOICE_COLLECTION' | 'HR_ATTENDANCE_PAYMENT' | 'BREAKDOWN_REPORTING' | 'EQUIPMENT_PART_REPAIR' | 'DPR_REPORTING' | 'SUBCONTRACTOR_BILLING' | 'FUEL_ISSUE' | 'LEAVE_SUBMISSION' | 'PAYROLL' | string;
  customTemplateId?: string;
  requisitionNumber?: string;
  indentNo: string; // e.g. "752", "22", or "ATT-260715"
  indentDate?: string; // DD/MM/YYYY
  siteName: string; // e.g. "SILADEHI", "BIJETALA", "RAIPUR"
  priority: Priority;
  currentStageId: string;
  currentStageIndex: number;
  totalStages: number;
  status: 'In Progress' | 'Pending' | 'Completed' | 'On Hold' | 'Cancelled' | 'CLOSED' | 'Awaiting Fulfillment' | string;
  isClosed?: boolean;
  closedAt?: string;
  closedBy?: string;
  closureRemark?: string;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  submittedBy?: string;
  createdByUserId?: string;
  stages: FmsStageExecution[];
  remarks?: string;
  totalDelayHours: number;
  overrideLogs?: FmsOverrideLog[];
  // Universal Form Inheritance & Data Cascade Pool across stages:
  instanceDataPool?: Record<string, any>;
  lineItems?: FmsLineItem[];
  linkedSubFlows?: {
    type: 'STORE_DISPATCH' | 'PURCHASE' | 'HOLD';
    id: string;
    flowType: string;
    name: string;
    indentNo?: string;
    itemCount: number;
    status: string;
    createdAt?: string;
  }[];
  parentFlowId?: string;
  parentFlowType?: string;
  parentFlowIndentNo?: string;
  subTracks?: {
    storeDispatchTrack?: FmsStageExecution[];
    purchaseTrack?: FmsStageExecution[];
  };
  // Accounts PO to Payment & Invoice specific fields:
  poNumber?: string;
  vendorName?: string;
  poAssignTo?: string;
  poDate?: string;
  poAmount?: number;
  linkedFlowId?: string;
  paymentMode?: 'BANK_ACCOUNT' | 'UPI' | 'PENDING';
  // HR Labour Attendance specific fields:
  totalLabourPresent?: number;
  totalOtHours?: number;
  attendanceDate?: string;
  // Machine/Vehicle Breakdown specific fields:
  machineName?: string;
  machineIdNo?: string;
  machineMakeModel?: string;
  attendingMechanic?: string;
  mechanicMobileNo?: string;
  // Equipment Part Repair specific fields:
  partSerialNo?: string;
  partEquipmentName?: string;
  vehiclePlantMachineName?: string;
  warrantyStatus?: 'IN_WARRANTY' | 'OUT_WARRANTY';
  // DPR (Daily Progress Report) specific fields:
  dprDate?: string;
  dprPreparedBy?: string;
  dprSiteName?: string;
  // Beneficiary Approval specific fields:
  beneficiarySheetNo?: string;
  beneficiaryName?: string;
  beneficiaryAccountNo?: string;
  beneficiaryIfsc?: string;
  beneficiaryBankName?: string;
  beneficiaryPurpose?: string;
  cancelledChequeUrl?: string;
  paymentId?: string;
  paymentSheetNo?: string;
  linkedBeneficiarySheetNo?: string;
  vendorId?: string;
  // Module links:
  comparativeSheetId?: string;
  linkedModuleRecord?: {
    moduleType: 'COMPARATIVE_SHEET' | 'BANK_PAYMENT' | 'PO' | 'DISPATCH' | string;
    recordId: string;
    recordNumber?: string;
    metadata?: Record<string, any>;
  };
}

// IMS (Inventory Management System)
export interface InventoryItem {
  id: string;
  itemId: string; // e.g. "ITEM-IT-001"
  name: string;
  category: 'IT Equipment' | 'Office Hardware' | 'Plant Machinery' | 'Consumables' | 'Safety/CSR' | string;
  location: 'Siladehi Site' | 'Bijetala Site' | 'Raipur Office' | 'Central Store' | string;
  currentStock: number;
  minThreshold: number;
  unit: string;
  condition: 'Good' | 'Fair' | 'Degraded/Damaged' | 'Under Repair';
  lastCheckedDate: string;
  returnDegradedSheetRef?: string;
}

export interface InventoryMovement {
  id: string;
  transactionId: string;
  itemId: string;
  itemName: string;
  type: 'RECEIVE' | 'ISSUE' | 'RETURN_DEGRADED' | 'TRANSFER' | 'ADJUSTMENT';
  quantity: number;
  sourceLocation: string;
  destinationLocation: string;
  timestamp: string;
  referenceDoc?: string; // Indent No or PO No
  initiatedBy: string;
  notes?: string;
}

// Registry Design (Central registry for stable mapping to Google Sheets & Cloud DB)
export interface NotificationSettings {
  webhookUrl?: string; // Configurable Webhook URL (Slack, Microsoft Teams, Zapier, Custom HTTP)
  enableDesktopPush: boolean;
  enableSlaBreachAlerts: boolean;
  enableDelegationAlerts: boolean;
  enableStockAlerts: boolean;
  enableFmsAlerts: boolean;
}

export interface WorkShiftConfig {
  shiftStartTime: string; // e.g. "09:30"
  shiftEndTime: string;   // e.g. "18:30"
  lunchStartTime: string; // e.g. "13:30"
  lunchEndTime: string;   // e.g. "14:30"
  workingDays: number[];  // [1, 2, 3, 4, 5, 6] (1=Mon, ..., 6=Sat; 0=Sun)
  timezone?: string;
}

export interface SiteRegistryItem {
  id: string;
  code: string;
  name: string;
  status: 'ACTIVE' | 'ARCHIVED';
  createdAt: string;
  updatedAt?: string;
}

export interface CentralRegistryConfig {
  organizationName: string;
  activeDataSource: 'GOOGLE_SHEETS' | 'POSTGRES_SUPABASE' | 'HYBRID_TRANSITION';
  masterSites?: string[];
  sitesRegistry?: SiteRegistryItem[];
  masterCategories?: string[];
  masterUnits?: string[];
  masterVendors?: string[];
  masterPriorities?: string[];
  workShiftConfig?: WorkShiftConfig;
  sheetsConfig: {
    fmsSpreadsheetId: string;
    fmsSheetTabId: string;
    delegationSpreadsheetId: string;
    delegationSheetTabId: string;
    checklistSpreadsheetId: string;
    checklistSheetTabId: string;
    inventorySpreadsheetId: string;
    inventorySheetTabId: string;
  };
  formsConfig: {
    returnOfDegradedMaterialFormUrl: string;
    advancePaymentApprovalFormUrl: string;
    materialCollectionPoFormUrl: string;
    generalIndentFormUrl: string;
  };
  driveConfig: {
    sharedDriveId: string;
    billsAndInvoicesFolderId: string;
    purchaseOrdersFolderId: string;
    evidencePhotosFolderId: string;
  };
  notificationSettings?: NotificationSettings;
  databaseSchemaReady: boolean;
}

// Audit Log (Immutable append-only record)
export interface AuditLogEntry {
  auditId: string;
  timestamp: string;
  userId: string;
  userName: string;
  module: 'FMS' | 'DELEGATION' | 'CHECKLIST' | 'IMS' | 'REGISTRY' | 'COMPARATIVE_SHEET' | 'BANKING' | 'VENDOR';
  action: 'CREATE' | 'UPDATE' | 'DELETE' | 'STAGE_ADVANCE' | 'REVISE_DATE' | 'STATUS_CHANGE' | 'STOCK_MOVEMENT';
  entityId: string;
  details: string;
  changes?: Record<string, { from: any; to: any }>;
}

// In-App Notification Center
export interface AppNotification {
  id: string;
  userId: string; // Target user or 'ALL'
  targetUserName?: string;
  senderName?: string;
  urgency?: 'HIGH' | 'MEDIUM' | 'LOW';
  title: string;
  message: string;
  type: 'FMS_ACTION_REQUIRED' | 'STAGE_ADVANCED' | 'SLA_BREACH' | 'NUDGE' | 'DELEGATION' | 'STOCK_ALERT' | 'SYSTEM';
  timestamp: string;
  read: boolean;
  linkTab?: string;
  linkEntityId?: string;
  data?: Record<string, any>;
}

// ==========================================
// VENDOR RATE COMPARATIVE STATEMENT (CS) TYPES
// Strictly for Barbrik Project Ltd. Standards
// ==========================================

export interface CsItem {
  id: string;
  sn: number;
  itemName: string;
  brandMake: string;
  unit: string;
  qty: number;
}

export interface CsVendorItemRate {
  baseRate: number;
  gstPercent: number; // e.g. 5, 12, 18, 28
  gstAmount: number;  // (baseRate * gstPercent) / 100
  freightPerUnit?: number; // 0 (since freight is arranged by Barbrik: OURS)
  landedRate: number; // baseRate + gstAmount
  amount: number;     // landedRate * qty
  isQuoted: boolean;
}

export interface CsVendorQuote {
  vendorId: string;
  vendorName: string;
  rating: string; // e.g. "4.5 / 5.0 (Top Rated Local Supplier)"
  contactPersonMobile: string; // e.g. "Amit Ji | Mo: +91-7477230200"
  storeOfficeAddress: string;
  paymentTerms: string; // e.g. "30 Days Credit"
  warrantyPeriod: string; // e.g. "01 Year Comprehensive Warranty"
  gstTerms: string; // e.g. "18% GST Paid / Included"
  freightDeliveryTerms: string; // Strictly "OURS" (arranged by Barbrik Project Ltd.)
  quotationDateValidity: string; // e.g. "19/08/2026 | 30 Days Validity"
  primaryProductFocus: string; // e.g. "Heavy Equipment Spares & Consumables"
  itemRates: Record<string, CsVendorItemRate>; // key: itemId
}

export interface CsApprovalDetails {
  approverName: string; // e.g. "Pranjal Agrawal"
  approverDesignation: string; // e.g. "Executive Director / Authorized Signatory"
  approvalDate: string; // ISO & display formatted timestamp
  remarks?: string; // e.g. "Approved with split order to maintain dual supply"
  signatureStamp: string; // Official digital verification token
}

export interface ComparativeStatement {
  id: string;
  companyName: 'Barbrik Project Ltd.';
  site: string; // e.g. "BIJETALA", "DURG", "SILADEHI", "RAIPUR"
  indentNo: string; // e.g. "IND-466"
  indentDate: string; // e.g. "12/10/2026"
  forPurpose: string; // e.g. "HM LOADER & DG-82.5KVA (CHAKRABORTY JI)"
  statementDate: string; // e.g. "13/10/2026"
  items: CsItem[];
  vendors: CsVendorQuote[];
  status: 'Draft' | 'Pending Approval' | 'Approved' | 'PO Created';
  isLocked?: boolean;
  directorRevisionRemarks?: string;
  preparedBy?: string; // e.g. "Shyam Rao Sureshe" / "Brahmanand Patel"
  approvedBy?: string;
  approvalDate?: string;
  notes?: string;
  awardedVendorMap?: Record<string, string>; // itemId -> vendorId
  approvalDetails?: CsApprovalDetails;
  fmsFlowId?: string;
  generatedPoIds?: string[];
  createdAt: string;
  updatedAt: string;
}

// ==========================================
// BANK PAYMENTS, BENEFICIARY & IBT TYPES
// ==========================================

export type PaymentApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
export type PaymentStepStatus = 'PENDING' | 'DONE' | 'CANCELLED';

export interface BankPaymentRecord {
  id: string;
  sheetNo: string;                   // BPL/BANK/YYYYMMDD/NN
  timestamp: string;                 // ISO date of request
  vendorId?: string;                 // Relational ID linking to VendorProfileRecord.id
  vendorName: string;                // Trade Name (e.g. MAHAVIR GAS CHULHA)
  beneficiaryName: string;           // Bank Account Holder Name (e.g. KANHAIYA)
  isNameMismatch: boolean;           // Trade Name != Beneficiary Name
  payeeRelationship?: string;        // e.g. "Proprietor Account", "Sister Entity"
  purposeOfPayment: string;          // Purpose / Particulars
  requestedBy: string;               // Requester Name
  requestedByUserId?: string;
  site: string;                      // Project Site
  modeOfPayment: 'UPI' | 'ACCOUNT';  // Payment Vehicle
  amountToBePaid: number;            // Amount in ₹
  remark?: string;                   // Requester Notes
  plannedDate: string;               // Required Date (DD/MM/YYYY)
  poUpload?: string;                 // Attachment URL or Base64
  billNoPo?: string;                 // Bill / PO Reference No
  emailAddress?: string;

  // Beneficiary Master Link & Accounts Double-Entry Verification
  beneficiaryMasterStatus: 'VERIFIED' | 'NEEDS_ADDITION' | 'NOT_APPLICABLE_UPI';
  bankName?: string;
  accountNo?: string;
  accountNoMasked?: string;
  ifscCode?: string;
  cancelledChequeUrl?: string;
  linkedBeneficiarySheetNo?: string;
  verifiedByAccountant?: boolean;
  accountantVerificationTimestamp?: string;
  reEnteredAccountNo?: string;
  reEnteredIfscCode?: string;

  // Stage 2: Payment Approval (DIRECTOR ONLY)
  approvalStatus: PaymentApprovalStatus;
  approvalTimestamp?: string;
  rejectionReason?: string;
  approvedBy?: string;
  approvedByUserId?: string;

  // Stage 3: Bank Portal Entry (ACCOUNTS TEAM)
  paymentEntry: PaymentStepStatus;
  paymentEntryTimestamp?: string;
  paymentEntryProof?: string;
  paymentEntryBy?: string;

  // Stage 4: Settlement & UTR (ACCOUNTS TEAM)
  paymentStatus: PaymentStepStatus;
  paymentDoneTimestamp?: string;
  paymentDoneProof?: string;
  remarks?: string;                  // Bank UTR Number / Reference
  paymentDoneBy?: string;
}

export interface BeneficiaryRecord {
  id: string;
  sheetNo: string;                   // BPL/BEN/YYYYMMDD/NN
  timestamp: string;
  vendorId?: string;                 // Relational ID linking to VendorProfileRecord.id
  beneficiaryName: string;           // Legal Bank Title
  tradeVendorName?: string;          // Commercial Trade Name
  accountNo: string;                 // Bank Account Number
  ifscCode: string;                  // IFSC Code
  bankName: string;                  // Bank Name
  purpose: string;                   // Category / Goods
  cancelledChequeUrl: string;        // Proof attachment
  remark?: string;
  requestedBy?: string;

  // Accounts Double-Entry Verification
  verifiedByAccountant?: boolean;
  accountantVerificationTimestamp?: string;
  reEnteredAccountNo?: string;
  reEnteredIfscCode?: string;

  // Approval Status
  approvalStatus: PaymentApprovalStatus;
  approvalTimestamp?: string;
  rejectionReason?: string;
  approvedBy?: string;

  // Bank Portal Addition
  beneficiaryEntry: PaymentStepStatus;
  beneficiaryEntryTimestamp?: string;
  beneficiaryEntryProof?: string;

  // Final Cooling Period / Active Status
  additionStatus: PaymentStepStatus;
  additionTimestamp?: string;
  additionProof?: string;
}

export interface InterbankTransferRecord {
  id: string;
  sheetNo: string;                   // BPL/IBT/YYYYMMDD/NN
  timestamp: string;
  transferFrom: string;              // Source Bank Account
  transferTo: string;                // Target Bank Account
  purpose: string;                   // e.g. SALARY / VENDOR LIQUIDITY
  amount: number;                    // Transfer Amount ₹
  remarks?: string;                  // Operational notes
  plannedDate: string;               // Execution date
  requestedBy?: string;

  // Approval Status (DIRECTOR ONLY)
  approvalStatus: PaymentApprovalStatus;
  approvalTimestamp?: string;
  rejectionReason?: string;
  approvedBy?: string;

  // Bank Portal Entry
  bankEntry: PaymentStepStatus;
  bankEntryTimestamp?: string;
  bankEntryProof?: string;

  // Settlement & UTR
  paymentStatus: PaymentStepStatus;
  paymentDoneTimestamp?: string;
  paymentDoneProof?: string;
  utrRef?: string;                   // Treasury UTR Reference
}

export interface VendorBeneficiaryMatch {
  vendorName: string;
  beneficiaryName: string;
  isMismatch: boolean;
  bankName?: string;
  accountNoMasked?: string;
  ifscCode?: string;
  hasVerifiedBeneficiary: boolean;
  cancelledChequeUrl?: string;
  category?: string;
}

export interface VendorBankAccount {
  id: string;
  beneficiaryName: string;       // Legal Bank Account Holder Title
  tradeVendorName?: string;
  bankName: string;
  accountNo: string;
  accountNoMasked: string;       // e.g. ••••••••3352
  ifscCode: string;
  accountType: 'CURRENT' | 'SAVINGS' | 'CASH_CREDIT';
  isPrimary: boolean;
  cancelledChequeUrl?: string;
  verificationStatus: 'VERIFIED' | 'PENDING' | 'REJECTED';
  verifiedBy?: string;
  verifiedAt?: string;
  linkedBeneficiarySheetNo?: string;
  rejectionReason?: string;
  notes?: string;
}

export interface VendorProfileRecord {
  id: string;
  vendorCode: string;            // e.g. "VEN-001"
  tradeName: string;             // Commercial Name (e.g. "M/S ULTRA TECH CEMENT")
  legalName?: string;            // Legal registered name
  gstin?: string;                // 15-digit GSTIN
  pan?: string;                  // 10-digit PAN
  category: string;              // Cement, Electrical, Hardware, Fabrication, etc.
  contactPerson?: string;
  phone?: string;
  email?: string;
  address?: string;
  city?: string;
  state?: string;
  status: 'ACTIVE' | 'INACTIVE' | 'BLOCKED';
  bankAccounts: VendorBankAccount[];
  notes?: string;
  createdAt: string;
  createdBy: string;
  updatedAt?: string;
  updatedBy?: string;
}

export interface VendorSearchWithBankingResult {
  vendor: VendorProfileRecord;
  hasBankAccounts: boolean;
  primaryAccount?: VendorBankAccount;
  hasVerifiedBeneficiary: boolean;
  hasCancelledCheque: boolean;
  isNameMismatch: boolean;
  matchScore: number;
}

