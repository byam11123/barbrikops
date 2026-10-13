export type Frequency = 'D' | 'W' | 'M'; // Daily, Weekly, Monthly

export type TaskStatus = 'Pending' | 'Completed' | 'Week Shifted' | 'In Progress' | 'Delayed' | 'Done';

export type Priority = 'Urgent' | 'Normal' | 'Low';

export type UserRole = 'SUPER_ADMIN' | 'ADMIN' | 'DEPT_ADMIN' | 'PROCESS_MANAGER' | 'OPERATIONAL_USER';

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
  email: string;
  avatarUrl?: string;
  siteLocation?: string;
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

export interface ModuleDefinition {
  id: string;
  name: string;
  description: string;
  category: 'CORE' | 'OPERATIONS' | 'CONTROL';
}

export const SYSTEM_MODULES: ModuleDefinition[] = [
  { id: 'summary', name: 'My Work', description: 'Personal daily workbench, tasks, and today due items', category: 'CORE' },
  { id: 'mis', name: 'My Scoreboard', description: 'Performance analytics, completion metrics, and SLA status', category: 'CORE' },
  { id: 'fms', name: 'All FMS', description: 'Step-by-step cross-departmental operations tracking workflows', category: 'OPERATIONS' },
  { id: 'fms-audit', name: 'FMS Records & Audit', description: 'Historic workflow records, CSV export and compliance verification', category: 'OPERATIONS' },
  { id: 'delegation', name: 'Delegation', description: 'Cross-functional task assignments and delegation board', category: 'OPERATIONS' },
  { id: 'checklist', name: 'Checklist', description: 'Recurring periodic checklists and SOP verification', category: 'OPERATIONS' },
  { id: 'ims', name: 'Inventory', description: 'Material catalog, bin stocks, and inventory movements', category: 'OPERATIONS' },
  { id: 'registry', name: 'Registry', description: 'System central master registries, vendors, and departments', category: 'CONTROL' },
  { id: 'audit', name: 'Audit Logs', description: 'Chronological activity stream and change audit trails', category: 'CONTROL' },
];

export function isUserSuperAdmin(user?: UserProfile | null): boolean {
  if (!user) return false;
  return user.systemRole === 'SUPER_ADMIN' || user.role === 'SUPER_ADMIN' || user.role === 'Super Admin' || user.username === 'superadmin';
}

export function isUserAdminOrSuperAdmin(user?: UserProfile | null): boolean {
  if (!user) return false;
  return isUserSuperAdmin(user) || user.systemRole === 'ADMIN' || user.role === 'ADMIN' || user.userId === 'USR-000';
}

export function getUserModulePermission(
  user: UserProfile | null | undefined,
  moduleId: string
): ModulePermission {
  if (!user) {
    return { visible: false, canEdit: false, canDelete: false };
  }
  // Super Admin & Admin hold full unrestricted access to modules
  if (isUserAdminOrSuperAdmin(user)) {
    return { visible: true, canEdit: true, canDelete: true };
  }
  // If specific permissions have been configured for this user, use them
  if (user.permissions && user.permissions[moduleId]) {
    return user.permissions[moduleId];
  }
  // Default fallback behavior:
  // My Work and My Scoreboard are visible to everyone
  if (moduleId === 'summary' || moduleId === 'mis') {
    return { visible: true, canEdit: true, canDelete: false };
  }
  // Department Admin & Process Managers have standard operational access by default
  if (user.systemRole === 'DEPT_ADMIN' || user.systemRole === 'PROCESS_MANAGER') {
    if (['fms', 'delegation', 'checklist', 'ims', 'fms-audit'].includes(moduleId)) {
      return { visible: true, canEdit: true, canDelete: false };
    }
  }
  // Regular staff default: hidden unless granted
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
}

export interface FmsStageFieldConfig {
  id: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'SELECT' | 'APPROVAL' | 'STATUS_DONE' | 'URL' | 'TEXTAREA' | 'DATE' | 'FILE';
  options?: string[];
  required?: boolean;
  defaultValue?: string;
  placeholder?: string;
}

export interface FmsStageLogicConfig {
  slaHours?: number;
  gatewayType: 'STANDARD_ADVANCE' | 'APPROVAL_DECISION' | 'CONDITIONAL_JUMP' | 'VERIFY_CLOSE';
  rejectionBehavior?: 'HALT_WORKFLOW' | 'RETURN_TO_PREVIOUS';
  yesTargetStageIndex?: number;
  noTargetStageIndex?: number;
  yesConditionLabel?: string;
  noConditionLabel?: string;
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
  enabled: boolean;
  targetTemplateKey: string; // e.g. 'PO_TO_PAYMENT', 'CHECK_STOCK', etc.
  triggerCondition?: 'ON_COMPLETE' | 'ON_DECISION_YES' | 'ON_DECISION_NO';
  targetStageId?: string;
  fieldMappings?: Array<{
    sourceField: string;
    targetField: string;
  }>;
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

export interface FmsStageExecution {
  stageId: string;
  stageName: string;
  assignee: string;
  how: string;
  plannedDateTime?: string;
  actualDateTime?: string;
  status: 'Pending' | 'In Progress' | 'Done' | 'Skipped' | 'Delayed' | 'Completed' | 'Rejected';
  decisionValue?: 'Yes' | 'No' | ''; // For checkpoint decisions
  timeDelayHours?: number;
  delayHours?: number;
  notes?: string;
  formResponseRef?: string;
  evidenceDocumentUrl?: string;
  doerName?: string;
  processRemarks?: ProcessRemark[];
  lastNudgeTimestamp?: string;
  fields?: FmsStageFieldConfig[];
  submittedData?: Record<string, any>;
  logic?: FmsStageLogicConfig;
  checkpoints?: string[];
  checkedCheckpoints?: string[];
  subWorkflowTrigger?: FmsSubWorkflowTriggerConfig;
}

export interface FmsInstance {
  id: string;
  flowId: string;
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
  status: 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled' | 'CLOSED';
  isClosed?: boolean;
  closedAt?: string;
  closedBy?: string;
  closureRemark?: string;
  createdAt: string;
  updatedAt: string;
  stages: FmsStageExecution[];
  remarks?: string;
  totalDelayHours: number;
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
}

// IMS (Inventory Management System)
export interface InventoryItem {
  id: string;
  itemId: string; // e.g. "ITEM-IT-001"
  name: string;
  category: 'IT Equipment' | 'Office Hardware' | 'Plant Machinery' | 'Consumables' | 'Safety/CSR';
  location: 'Siladehi Site' | 'Bijetala Site' | 'Raipur Office' | 'Central Store';
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

export interface CentralRegistryConfig {
  organizationName: string;
  activeDataSource: 'GOOGLE_SHEETS' | 'POSTGRES_SUPABASE' | 'HYBRID_TRANSITION';
  masterSites?: string[];
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
  module: 'FMS' | 'DELEGATION' | 'CHECKLIST' | 'IMS' | 'REGISTRY';
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
