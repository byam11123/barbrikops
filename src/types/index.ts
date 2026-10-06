export type Frequency = 'D' | 'W' | 'M'; // Daily, Weekly, Monthly

export type TaskStatus = 'Pending' | 'Completed' | 'Week Shifted' | 'In Progress' | 'Delayed' | 'Done';

export type Priority = 'Urgent' | 'Normal' | 'Low';

export interface UserProfile {
  userId: string;
  name: string;
  role: string;
  departmentId: string;
  departmentName: string;
  phone: string;
  email: string;
  avatarUrl?: string;
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
}

export interface FmsStageExecution {
  stageId: string;
  stageName: string;
  assignee: string;
  how: string;
  plannedDateTime?: string;
  actualDateTime?: string;
  status: 'Pending' | 'In Progress' | 'Done' | 'Skipped' | 'Delayed';
  decisionValue?: 'Yes' | 'No' | ''; // For checkpoint decisions
  timeDelayHours?: number;
  delayHours?: number;
  notes?: string;
  formResponseRef?: string;
  evidenceDocumentUrl?: string;
  doerName?: string;
  processRemarks?: ProcessRemark[];
  lastNudgeTimestamp?: string;
}

export interface FmsInstance {
  id: string;
  flowId: string; // e.g. "FMS-STK-001", "FMS-PR-001", "FMS-PAY-001", "FMS-INV-001", "FMS-DISP-001", "FMS-REC-001", "FMS-SSD-001", or "FMS-HR-001"
  flowType: 'CHECK_STOCK' | 'INDENT_PURCHASE' | 'PO_TO_PAYMENT' | 'PURCHASE_TO_STORE_DISPATCH' | 'STORE_TO_SITE_DISPATCH' | 'PAYMENT_TO_DISPATCH' | 'SITE_RECEIVE' | 'ACCOUNTS_INVOICE_COLLECTION' | 'HR_ATTENDANCE_PAYMENT' | 'BREAKDOWN_REPORTING' | 'EQUIPMENT_PART_REPAIR' | 'DPR_REPORTING' | 'SUBCONTRACTOR_BILLING' | 'FUEL_ISSUE' | 'LEAVE_SUBMISSION' | 'PAYROLL';
  requisitionNumber?: string;
  indentNo: string; // e.g. "752", "22", or "ATT-260715"
  indentDate?: string; // DD/MM/YYYY
  siteName: string; // e.g. "SILADEHI", "BIJETALA", "RAIPUR"
  priority: Priority;
  currentStageId: string;
  currentStageIndex: number;
  totalStages: number;
  status: 'In Progress' | 'Completed' | 'On Hold' | 'Cancelled';
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
export interface CentralRegistryConfig {
  organizationName: string;
  activeDataSource: 'GOOGLE_SHEETS' | 'POSTGRES_SUPABASE' | 'HYBRID_TRANSITION';
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
  databaseSchemaReady: boolean;
}

// Audit Log (Immutable append-only record)
export interface AuditLogEntry {
  auditId: string;
  timestamp: string;
  userId: string;
  userName: string;
  module: 'FMS' | 'DELEGATION' | 'CHECKLIST' | 'IMS' | 'REGISTRY';
  action: 'CREATE' | 'UPDATE' | 'STAGE_ADVANCE' | 'REVISE_DATE' | 'STATUS_CHANGE' | 'STOCK_MOVEMENT';
  entityId: string;
  details: string;
  changes?: Record<string, { from: any; to: any }>;
}
