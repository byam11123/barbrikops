import { 
  CentralRegistryConfig, 
  ChecklistItem, 
  DelegationTask, 
  FmsInstance, 
  FmsStageDefinition, 
  FmsTemplateDefinition,
  InventoryItem, 
  InventoryMovement, 
  UserProfile,
  NoticeBoardItem,
  AppNotification,
  BankPaymentRecord,
  BeneficiaryRecord,
  InterbankTransferRecord,
  ComparativeStatement,
  VendorProfileRecord
} from '../types';

export const INITIAL_NOTIFICATIONS: AppNotification[] = [
  {
    id: 'notif-init-01',
    userId: 'USR-000',
    targetUserName: 'System Super Admin',
    title: 'Executive Approval: Flow FLOW-INV-260715-006',
    message: 'Stage 4 Rate Approval pending executive authorization for 500 MT Cement procurement.',
    type: 'FMS_ACTION_REQUIRED',
    urgency: 'HIGH',
    timestamp: '10/10/2026, 09:15 AM',
    read: false,
    linkTab: 'fms',
    linkEntityId: 'FLOW-INV-260715-006',
    data: { flowId: 'FLOW-INV-260715-006', stageName: 'Rate Approval' }
  },
  {
    id: 'notif-init-02',
    userId: 'USR-001',
    targetUserName: 'Amanat Bharadwaj',
    title: 'Physical GRN Verification: FLOW-REC-102-001',
    message: 'Consignment arrived at Central Store. Quality check and physical gate GRN entry required.',
    type: 'FMS_ACTION_REQUIRED',
    urgency: 'HIGH',
    timestamp: '10/10/2026, 08:45 AM',
    read: false,
    linkTab: 'fms',
    linkEntityId: 'FLOW-REC-102-001',
    data: { flowId: 'FLOW-REC-102-001', stageName: 'Store GRN & Inspection' }
  },
  {
    id: 'notif-init-03',
    userId: 'USR-001',
    targetUserName: 'Amanat Bharadwaj',
    title: 'Low Stock Alert: ITEM-MAT-006 (OPC 53 Cement)',
    message: 'Current stock is below safety buffer (150 Bags remaining). Urgent purchase replenishment advised.',
    type: 'STOCK_ALERT',
    urgency: 'HIGH',
    timestamp: '10/10/2026, 07:30 AM',
    read: false,
    linkTab: 'ims',
    linkEntityId: 'ITEM-MAT-006',
    data: { itemId: 'ITEM-MAT-006' }
  },
  {
    id: 'notif-init-04',
    userId: 'USR-002',
    targetUserName: 'Bramhanand Patel',
    title: 'SLA Overdue: Rate Approval for FLOW-SSD-654',
    message: 'Planned completion was exceeded by 3 hours. Please review quotation comparative table.',
    type: 'SLA_BREACH',
    urgency: 'HIGH',
    timestamp: '09/10/2026, 04:30 PM',
    read: false,
    linkTab: 'fms',
    linkEntityId: 'FLOW-SSD-654',
    data: { flowId: 'FLOW-SSD-654', stageName: 'Rate Approval' }
  },
  {
    id: 'notif-init-05',
    userId: 'USR-003',
    targetUserName: 'Shyam Rao Sureshe',
    title: 'Delegated Task: Vendor Dispatch Follow-up',
    message: 'Please coordinate with supplier for delivery schedule regarding Task #vhdlgas.',
    type: 'DELEGATION',
    urgency: 'MEDIUM',
    timestamp: '09/10/2026, 02:00 PM',
    read: false,
    linkTab: 'delegation',
    linkEntityId: 'vhdlgas',
    data: { taskId: 'vhdlgas' }
  },
  {
    id: 'notif-init-06',
    userId: 'USR-013',
    targetUserName: 'Pranjal Agrawal',
    title: 'Accounts Voucher Approval: FLOW-SSD-477',
    message: 'Commercial tax verification completed. Advance payment voucher awaiting director authorization.',
    type: 'FMS_ACTION_REQUIRED',
    urgency: 'HIGH',
    timestamp: '09/10/2026, 11:15 AM',
    read: false,
    linkTab: 'fms',
    linkEntityId: 'FLOW-SSD-477',
    data: { flowId: 'FLOW-SSD-477', stageName: 'Payment Authorization' }
  },
  {
    id: 'notif-init-07',
    userId: 'ALL',
    title: 'FMS Stage Completed: FLOW-BRK-DG82-01',
    message: 'Equipment breakdown inspection signed off by Plant Ops. Flow advanced to parts procurement.',
    type: 'STAGE_ADVANCED',
    urgency: 'LOW',
    timestamp: '08/10/2026, 05:20 PM',
    read: true,
    linkTab: 'fms',
    linkEntityId: 'FLOW-BRK-DG82-01',
    data: { flowId: 'FLOW-BRK-DG82-01' }
  }
];

export const INITIAL_NOTICE_BOARD: NoticeBoardItem[] = [
  {
    id: 'NB-01',
    title: 'Mandatory Daily Material Stock Count Audit at Central Store',
    category: 'URGENT',
    content: 'All Store Keepers must verify physical bin counts against Google Sheets ledger by 05:00 PM every evening. Any stock discrepancies must be reported via Fms Store Check Stock module.',
    date: '09/10/2026',
    author: 'System Super Admin',
    isPinned: true
  },
  {
    id: 'NB-02',
    title: 'Site Safety Protocol & Helmet Verification Checklist',
    category: 'SAFETY',
    content: 'Mandatory safety check required for all field engineers at Siladehi & Bijetala sites before operating heavy equipment.',
    date: '08/10/2026',
    author: 'Operations & Safety Head',
    isPinned: true
  },
  {
    id: 'NB-03',
    title: 'Vendor Payment Voucher Fast-Tracking (SLA Update)',
    category: 'CIRCULAR',
    content: 'Accounts PO to Payment vouchers with bank approval SLA limits updated. Fast-track payments will now auto-alert Finance Manager after +1 hour delay.',
    date: '05/10/2026',
    author: 'Finance & Accounts Manager',
    isPinned: false
  },
  {
    id: 'NB-04',
    title: 'Equipment Part Repair Tracking Module Active',
    category: 'SITE_OPS',
    content: 'All breakdown reports for plant machinery and vehicles should now be logged via FMS Equipment Part Repair flow.',
    date: '02/10/2026',
    author: 'Plant & Machinery In-Charge',
    isPinned: false
  }
];

export const USERS: UserProfile[] = [
  {
    userId: 'USR-000',
    name: 'System Super Admin',
    username: 'superadmin',
    password: 'pass123',
    role: 'SUPER_ADMIN',
    systemRole: 'SUPER_ADMIN',
    departmentId: 'DEPT-ADMIN',
    departmentName: 'Executive Control & Governance',
    departmentKeys: ['PURCHASE', 'STORE', 'ACCOUNTS', 'PLANT_OPS', 'OPERATIONS'],
    phone: '9999999999',
    email: 'superadmin@barbrik.in',
    siteLocation: 'Raipur Headquarters',
    shiftHours: '24/7 System Governance',
    status: 'ACTIVE',
    approvalPin: '0000',
    lastLoginAt: '09/10/2026 09:30 AM'
  },
  {
    userId: 'USR-ADMIN-01',
    name: 'Administrative User',
    username: 'admin',
    password: 'pass123',
    role: 'ADMIN',
    systemRole: 'ADMIN',
    departmentId: 'DEPT-ADMIN',
    departmentName: 'Executive Control & Governance',
    departmentKeys: ['PURCHASE', 'STORE', 'ACCOUNTS', 'PLANT_OPS', 'OPERATIONS'],
    phone: '9999999998',
    email: 'admin.daily@barbrik.in',
    siteLocation: 'Raipur Headquarters',
    shiftHours: '09:00 AM - 06:00 PM',
    status: 'ACTIVE',
    approvalPin: '1111',
    lastLoginAt: '09/10/2026 09:30 AM',
    permissions: {
      summary: { visible: true, canEdit: true, canDelete: false },
      mis: { visible: true, canEdit: true, canDelete: false },
      fms: { visible: false, canEdit: false, canDelete: false },
      'fms-audit': { visible: false, canEdit: false, canDelete: false },
      delegation: { visible: false, canEdit: false, canDelete: false },
      checklist: { visible: false, canEdit: false, canDelete: false },
      ims: { visible: false, canEdit: false, canDelete: false },
      'cs-sheet': { visible: true, canEdit: true, canDelete: true },
      'dept-PURCHASE': { visible: true, canEdit: true, canDelete: true },
      'dept-STORE': { visible: true, canEdit: true, canDelete: true },
      'dept-ACCOUNTS': { visible: true, canEdit: true, canDelete: true },
      'dept-PLANT_OPS': { visible: true, canEdit: true, canDelete: true },
      registry: { visible: true, canEdit: true, canDelete: true },
      audit: { visible: true, canEdit: true, canDelete: true },
      'super-admin': { visible: true, canEdit: true, canDelete: true }
    }
  },
  {
    userId: 'USR-001',
    name: 'Amanat Bharadwaj',
    username: 'amanat',
    password: 'pass123',
    role: 'Store Manager',
    systemRole: 'DEPT_ADMIN',
    departmentId: 'DEPT-STORE',
    departmentName: 'Central Stores & Logistics',
    departmentKeys: ['STORE', 'SITE_LOGISTICS'],
    phone: '8084801020',
    email: 'rws.store1@gmail.com',
    siteLocation: 'Central Store - Raipur',
    shiftHours: '08:00 AM - 06:00 PM',
    status: 'ACTIVE',
    approvalPin: '1234',
    lastLoginAt: '09/10/2026 08:15 AM'
  },
  {
    userId: 'USR-002',
    name: 'Bramhanand Patel',
    username: 'bramhanand',
    password: 'pass123',
    role: 'Asst. Manager Purchase & Store',
    systemRole: 'PROCESS_MANAGER',
    departmentId: 'DEPT-PURCHASE',
    departmentName: 'Purchase & Store',
    departmentKeys: ['PURCHASE', 'STORE'],
    phone: '9827100011',
    email: 'purchase.mgr@barbrik.in',
    siteLocation: 'Raipur Office',
    shiftHours: '09:00 AM - 06:30 PM',
    status: 'ACTIVE',
    approvalPin: '1234'
  },
  {
    userId: 'USR-003',
    name: 'Shyam Rao Sureshe',
    username: 'shyam',
    password: 'pass123',
    role: 'Purchase Executive',
    systemRole: 'OPERATIONAL_USER',
    departmentId: 'DEPT-PURCHASE',
    departmentName: 'Purchase & Procurement',
    departmentKeys: ['PURCHASE'],
    phone: '9827100022',
    email: 'purchase.exec@barbrik.in',
    siteLocation: 'Raipur Office',
    shiftHours: '09:30 AM - 06:30 PM',
    status: 'ACTIVE',
    approvalPin: '1234'
  },
  {
    userId: 'USR-012',
    name: 'Priyanka',
    username: 'priyanka',
    password: 'pass123',
    role: 'Accounts Manager',
    systemRole: 'DEPT_ADMIN',
    departmentId: 'DEPT-ACCOUNTS',
    departmentName: 'Accounts & Finance',
    departmentKeys: ['ACCOUNTS'],
    phone: '9827100055',
    email: 'accounts.mgr@barbrik.in',
    siteLocation: 'Raipur Headquarters',
    shiftHours: '10:00 AM - 07:00 PM',
    status: 'ACTIVE',
    approvalPin: '1234'
  },
  {
    userId: 'USR-004',
    name: 'Pranay Ghosh',
    username: 'pranay.ghosh',
    password: 'pass123',
    role: 'Project Manager',
    departmentId: 'DEPT-PROJECTS',
    departmentName: 'Project Management',
    phone: '9437342135',
    email: 'pranay.ghosh@barbrik.in'
  },
  {
    userId: 'USR-005',
    name: 'Pooja Rao',
    username: 'pooja.rao',
    password: 'pass123',
    role: 'MIS Executive',
    departmentId: 'DEPT-MIS',
    departmentName: 'MIS & Operations',
    phone: '9301242522',
    email: 'mis@barbrik.in'
  },
  {
    userId: 'USR-006',
    name: 'Byamkesh Kaiwartya',
    username: 'byamkesh',
    password: 'pass123',
    role: 'IT Executive',
    departmentId: 'DEPT-IT',
    departmentName: 'IT Engineering',
    phone: '9977853230',
    email: 'itrpr@barbrik.in'
  },
  {
    userId: 'USR-007',
    name: 'Rajnikant Behera',
    username: 'rajnikant',
    password: 'pass123',
    role: 'Purchaser',
    departmentId: 'DEPT-PURCHASE',
    departmentName: 'Purchase',
    phone: '9348371469',
    email: 'rajnikant.behera@barbrik.in'
  },
  {
    userId: 'USR-008',
    name: 'Vinod Tiwari',
    username: 'vinod.tiwari',
    password: 'pass123',
    role: 'Liaising Officer',
    departmentId: 'DEPT-ADMIN',
    departmentName: 'Liaising & Admin',
    phone: '7869234640',
    email: 'vinod.tiwari@barbrik.in'
  },
  {
    userId: 'USR-009',
    name: 'Mamta Kumari',
    username: 'mamta.kumari',
    password: 'pass123',
    role: 'HR Executive',
    departmentId: 'DEPT-HR',
    departmentName: 'Human Resources',
    phone: '8709897038',
    email: 'hr@barbrik.in'
  },
  {
    userId: 'USR-010',
    name: 'Aman Kumar',
    username: 'aman.kumar',
    password: 'pass123',
    role: 'Site IT/Structure',
    departmentId: 'DEPT-SITE-SILA',
    departmentName: 'Structure',
    phone: '9123456780',
    email: 'siladehi.it1@gmail.com',
    siteLocation: 'Bijetala Site',
    siteAccess: ['Bijetala Site', 'Siladehi Site']
  },
  {
    userId: 'USR-011',
    name: 'Pappu Gupta / Rajesh Singh',
    username: 'pappu.gupta',
    password: 'pass123',
    role: 'Sr. Structure / Site IT',
    departmentId: 'DEPT-SITE-BIJE',
    departmentName: 'Sr. Structure',
    phone: '9827100099',
    email: 'bijetala.it2@gmail.com'
  },
  {
    userId: 'USR-013',
    name: 'Pranjal Agrawal',
    username: 'pranjal.agrawal',
    password: 'pass123',
    role: 'Director',
    systemRole: 'DIRECTOR',
    departmentId: 'DEPT-ACCOUNTS',
    departmentName: 'Accounts & Finance',
    phone: '9827100066',
    email: 'pranjal.agrawal@barbrik.in'
  },
  {
    userId: 'USR-014',
    name: 'Khushboo Sahu',
    username: 'khushboo.sahu',
    password: 'pass123',
    role: 'Executive Assistant',
    systemRole: 'EXECUTIVE_ASSISTANT',
    departmentId: 'DEPT-ACCOUNTS',
    departmentName: 'Accounts & Finance',
    phone: '9827100077',
    email: 'khushboo.sahu@barbrik.in'
  },
  {
    userId: 'USR-015',
    name: 'Manish Koshle',
    username: 'manish.koshle',
    password: 'pass123',
    role: 'PO Accounts In-charge',
    departmentId: 'DEPT-ACCOUNTS',
    departmentName: 'Accounts & Finance',
    phone: '9827100088',
    whatsappPhone: '9827100088',
    email: 'manish.koshle@barbrik.in'
  },
  {
    userId: 'USR-016',
    name: 'Vivek',
    username: 'vivek',
    password: 'pass123',
    role: 'Purchase Assistant',
    departmentId: 'DEPT-PURCHASE',
    departmentName: 'Purchase',
    phone: '9827100023',
    whatsappPhone: '9827100023',
    email: 'vivek.purchase@barbrik.in'
  },
  {
    userId: 'USR-017',
    name: 'Rajendra',
    username: 'rajendra',
    password: 'pass123',
    role: 'Purchase Assistant',
    departmentId: 'DEPT-PURCHASE',
    departmentName: 'Purchase',
    phone: '9827100033',
    whatsappPhone: '9827100033',
    email: 'rajendra.purchase@barbrik.in'
  },
  {
    userId: 'USR-018',
    name: 'Sumant',
    username: 'sumant',
    password: 'pass123',
    role: 'Store Manager (Siladehi)',
    departmentId: 'DEPT-STORE-SILA',
    departmentName: 'Store Department (Siladehi)',
    phone: '9827100044',
    whatsappPhone: '9827100044',
    email: 'sumant.store@barbrik.in'
  },
  {
    userId: 'USR-019',
    name: 'Hemant',
    username: 'hemant',
    password: 'pass123',
    role: 'Store Manager (Bijetala)',
    departmentId: 'DEPT-STORE-BIJE',
    departmentName: 'Store Department (Bijetala)',
    phone: '9827100056',
    whatsappPhone: '9827100056',
    email: 'hemant.store@barbrik.in'
  },
  {
    userId: 'USR-020',
    name: 'Garima Pal',
    username: 'garima.pal',
    password: 'pass123',
    role: 'HR Executive',
    departmentId: 'DEPT-HR',
    departmentName: 'Human Resources',
    phone: '9827100067',
    whatsappPhone: '9827100067',
    email: 'garima.hr@barbrik.in'
  },
  {
    userId: 'USR-021',
    name: 'Mamta',
    username: 'mamta',
    password: 'pass123',
    role: 'HR & Accounts Officer',
    departmentId: 'DEPT-HR',
    departmentName: 'Human Resources',
    phone: '9827100078',
    whatsappPhone: '9827100078',
    email: 'mamta.hr@barbrik.in'
  },
  {
    userId: 'USR-022',
    name: 'Nandita / Khilesh',
    username: 'nandita',
    password: 'pass123',
    role: 'DPR & Planning Officer',
    departmentId: 'DEPT-PLANNING',
    departmentName: 'Project Planning & DPR',
    phone: '9827100089',
    whatsappPhone: '9827100089',
    email: 'nandita.planning@barbrik.in'
  },
  {
    userId: 'USR-023',
    name: 'Ritu Sahu',
    username: 'ritu.sahu',
    password: 'pass123',
    role: 'Process Coordinator',
    systemRole: 'PROCESS_COORDINATOR',
    departmentId: 'DEPT-MIS',
    departmentName: 'Process Coordination & Audit',
    phone: '9827100091',
    whatsappPhone: '9827100091',
    email: 'process.coordinator@barbrik.in'
  }
];

export const FMS_CHECK_STOCK_STAGES: FmsStageDefinition[] = [
  {
    stageId: 'STG-STK-01',
    stageNumber: 1,
    name: 'RECEIVE MATERIAL REQUISITION',
    what: 'Receive material requisition details from site or company requester with required items',
    whoRole: 'REQUESTER / SITE USER',
    whoDefaultAssignee: 'Amanat Bharadwaj',
    howChannel: 'IN-APP FORM / REQUISITION SLIP',
    slaHours: 0,
    hasYesNoDecision: false,
    fields: [
      {
        id: 'requisitionItems',
        label: 'Material Requisition Items',
        type: 'MULTI_ITEM_TABLE',
        required: true,
        columns: [
          { key: 'item_description', label: 'Item Description', type: 'TEXT' },
          { key: 'quantity', label: 'Quantity', type: 'NUMBER' },
          { key: 'unit', label: 'Unit', type: 'TEXT' },
          { key: 'work_purpose', label: 'Work / Purpose Details', type: 'TEXT' },
          { key: 'remarks', label: 'Remarks', type: 'TEXT' }
        ]
      },
      {
        id: 'siteName',
        label: 'Site Name',
        type: 'SELECT',
        required: true,
        options: ['SILADEHI', 'BIJETALA', 'CENTRAL STORE', 'HEAD OFFICE', 'RAIPUR WORKSHOP']
      },
      {
        id: 'priority',
        label: 'Priority',
        type: 'SELECT',
        required: true,
        options: ['Normal', 'Urgent', 'Low']
      },
      {
        id: 'remarks',
        label: 'Purpose / Remarks',
        type: 'TEXTAREA',
        placeholder: 'Specify requisition purpose, activity details, or additional remarks...'
      }
    ]
  },
  {
    stageId: 'STG-STK-02',
    stageNumber: 2,
    name: 'CHECK STOCK & TRIAGE',
    what: 'Verify physical stock at site store and central warehouse, allocate available stock for Store Dispatch, and route shortage to Purchase',
    whoRole: 'STORE MANAGER',
    whoDefaultAssignee: 'Amanat Bharadwaj',
    howChannel: 'IN-APP STORE TRIAGE DESK',
    slaHours: 4,
    hasYesNoDecision: false,
    fields: [
      {
        id: 'storeKeeperRemarks',
        label: 'Store Keeper Inspection & Handover Notes',
        type: 'TEXTAREA',
        placeholder: 'Enter physical inspection summary, bin status, or dispatch handover remarks...'
      }
    ],
    subWorkflowTrigger: {
      enabled: true,
      targetTemplateKey: 'STORE_TO_SITE_DISPATCH',
      triggerCondition: 'ON_COMPLETE',
      targetAssigneeRule: 'DYNAMIC_ROLE',
      targetRole: 'STORE_MANAGER',
      targetAssignee: 'Amanat Bharadwaj'
    },
    subWorkflowTriggers: [
      {
        id: 'trig-store-disp',
        enabled: true,
        name: 'Store to Site Dispatch Trigger',
        targetTemplateKey: 'STORE_TO_SITE_DISPATCH',
        triggerCondition: 'ON_COMPLETE',
        filterFieldId: 'disposition',
        filterFieldValue: 'Store Items',
        targetAssigneeRule: 'DYNAMIC_ROLE',
        targetRole: 'STORE_MANAGER',
        targetAssignee: 'Amanat Bharadwaj',
        payloadItemFilter: 'MATCHING_ROWS_ONLY'
      },
      {
        id: 'trig-pur-indent',
        enabled: true,
        name: 'Purchase Indent to PO Trigger',
        targetTemplateKey: 'INDENT_TO_PO',
        triggerCondition: 'ON_COMPLETE',
        filterFieldId: 'disposition',
        filterFieldValue: 'Purchase Items',
        targetAssigneeRule: 'DYNAMIC_ROLE',
        targetRole: 'PURCHASE_MANAGER',
        targetAssignee: 'Brahmanand Patel',
        payloadItemFilter: 'MATCHING_ROWS_ONLY'
      }
    ]
  }
];


export const FMS_STANDARD_PURCHASE_STAGES: FmsStageDefinition[] = [
  {
    stageId: 'STG-01',
    stageNumber: 1,
    name: 'Receive Indent & Verify Evidence',
    what: 'Review inherited items from Store Triage and view site photos for degraded materials',
    whoRole: 'ASST_MANAGER_PURCHASE',
    whoDefaultAssignee: 'Brahmanand Patel',
    howChannel: 'IN-APP PURCHASE DESK',
    slaHours: 2,
    hasYesNoDecision: false,
    fields: [
      {
        id: 'purchaseItems',
        label: 'Purchase Requisition Items',
        type: 'MULTI_ITEM_TABLE',
        required: true,
        isInherited: true,
        inheritedSourceField: 'requisitionItems',
        isReadOnly: false,
        columns: [
          { key: 'item_description', label: 'Item Description', type: 'TEXT' },
          { key: 'quantity', label: 'Purchase Qty Required', type: 'NUMBER' },
          { key: 'unit', label: 'Unit', type: 'TEXT' },
          { key: 'work_purpose', label: 'Work Purpose / Site', type: 'TEXT' },
          { key: 'remarks', label: 'Remarks / Urgency', type: 'TEXT' }
        ]
      },
      {
        id: 'degradedMaterialPhotos',
        label: 'Degraded / Worn-out Material Site Photo Proof',
        type: 'FILE',
        placeholder: 'Upload site photo proof of damaged or required item...'
      },
      {
        id: 'purchaseHeadNotes',
        label: 'Purchase Head Verification Notes',
        type: 'TEXTAREA',
        placeholder: 'Enter verification remarks, urgency confirmation, or vendor direction...'
      }
    ]
  },
  {
    stageId: 'STG-02',
    stageNumber: 2,
    name: 'Get Quotation & Generate CS',
    what: 'Fetch/upload vendor quotes and auto-generate Comparative Statement (CS) matrix',
    whoRole: 'PURCHASE_EXECUTIVE',
    whoDefaultAssignee: 'Brahmanand Patel',
    howChannel: 'COMPARATIVE STATEMENT MODULE',
    slaHours: 24,
    hasYesNoDecision: false,
    fields: [
      {
        id: 'csModule',
        label: 'Comparative Statement (CS) Quotation Matrix',
        type: 'CS_MODULE_EMBED',
        required: true,
        placeholder: 'Fetch vendor master rates, add quotes for 2-3 vendors per item, enter GST & freight, compute L1 rates.'
      },
      {
        id: 'rfqVendorQuotes',
        label: 'Vendor Quotation PDFs / Scans',
        type: 'FILE',
        placeholder: 'Upload PDF quotation attachments received from vendors...'
      },
      {
        id: 'purchaserNotes',
        label: 'Purchase Executive Summary & Recommendation',
        type: 'TEXTAREA',
        placeholder: 'Enter price comparison notes, delivery timelines, or vendor payment term exceptions...'
      }
    ]
  },
  {
    stageId: 'STG-03',
    stageNumber: 3,
    name: 'Get Another Quotation',
    what: 'Fetch additional vendor quotations as requested by Director for CS review',
    whoRole: 'ASST_MANAGER_PURCHASE',
    whoDefaultAssignee: 'Brahmanand Patel',
    howChannel: 'COMPARATIVE STATEMENT MODULE',
    slaHours: 12,
    hasYesNoDecision: false,
    fields: [
      {
        id: 'additionalCsModule',
        label: 'Additional Quotation Entry & Updated CS Matrix',
        type: 'CS_MODULE_EMBED',
        required: true,
        placeholder: 'Add new vendor quotation rates, revised GST & freight details...'
      },
      {
        id: 'additionalQuotesFile',
        label: 'Additional Vendor Quotation Attachment',
        type: 'FILE',
        placeholder: 'Upload additional vendor quote document...'
      },
      {
        id: 'reworkNotes',
        label: 'Rework Summary & Justification',
        type: 'TEXTAREA',
        placeholder: 'Notes on new quotes received and rate negotiations...'
      }
    ]
  },
  {
    stageId: 'STG-04',
    stageNumber: 4,
    name: 'Director L1 Approval & Digital Sign',
    what: 'Review CS, edit awarded vendor selections/quantities, and digitally sign to lock CS',
    whoRole: 'DIRECTOR',
    whoDefaultAssignee: 'Pranjal Agrawal',
    howChannel: 'DIRECTOR APPROVAL DESK',
    slaHours: 12,
    hasYesNoDecision: true,
    logic: {
      gatewayType: 'APPROVAL_DECISION',
      rejectionBehavior: 'RETURN_TO_PREVIOUS',
      slaHours: 12,
    },
    fields: [
      {
        id: 'csL1Approval',
        label: 'Director L1 Award Allocation & Digital Sign-off',
        type: 'CS_L1_APPROVAL_EMBED',
        required: true
      },
      {
        id: 'approvalRemarks',
        label: 'Director / PM Approval Notes & Directives',
        type: 'TEXTAREA',
        placeholder: 'Enter approval remarks, discount negotiation notes, or budget authorization...'
      },
      {
        id: 'digitalSignature',
        label: 'Digital Sign-Off Lock Timestamp',
        type: 'TEXT',
        placeholder: 'Auto-recorded digital sign-off lock upon approval'
      }
    ]
  },
  {
    stageId: 'STG-05',
    stageNumber: 5,
    name: 'Generate & Issue Purchase Order (PO)',
    what: 'Generate individual POs per awarded vendorPoGroup from locked CS payload and assign official PO numbers',
    whoRole: 'PURCHASE_EXECUTIVE',
    whoDefaultAssignee: 'Shyam Rao Sureshe',
    howChannel: 'SPLIT PO GENERATOR MODULE',
    slaHours: 6,
    hasYesNoDecision: false,
    fields: [
      {
        id: 'splitPoGenerator',
        label: 'Awarded Vendor PO Generation & Ref Assignment',
        type: 'SPLIT_PO_GENERATOR',
        required: true
      }
    ]
  },
  {
    stageId: 'STG-06',
    stageNumber: 6,
    name: 'Send PO for Material Collection & Dispatch',
    what: 'Vendor collection, gate pass generation, transporter dispatch, and central store receiving handover',
    whoRole: 'PURCHASE_ASSISTANT',
    whoDefaultAssignee: 'Rajendra / Vivek',
    howChannel: 'STORE DISPATCH HANDOVER',
    slaHours: 4,
    hasYesNoDecision: false,
    fields: [
      {
        id: 'vendorDispatchChallanNo',
        label: 'Vendor Delivery Challan / LR Reference',
        type: 'TEXT',
        required: true,
        placeholder: 'e.g. DC/2026/884 or Transporter LR No.'
      },
      {
        id: 'expectedStoreArrivalDate',
        label: 'Expected Store Arrival Date',
        type: 'DATE',
        required: true
      },
      {
        id: 'transporterDriverDetails',
        label: 'Transporter & Driver Contact Details',
        type: 'TEXT',
        placeholder: 'e.g. Truck CG-04-1234, Driver Rajesh (9827012345)'
      },
      {
        id: 'dispatchHandoverNotes',
        label: 'Dispatch & Store Handover Notes',
        type: 'TEXTAREA',
        placeholder: 'Enter dispatch status, driver contact, or gate arrival instructions...'
      }
    ],
    subWorkflowTrigger: {
      enabled: true,
      name: 'Trigger Purchase to Store Dispatch & GRN Workflow',
      targetTemplateKey: 'PURCHASE_TO_STORE_DISPATCH',
      triggerCondition: 'ON_COMPLETE',
      targetAssigneeRule: 'DYNAMIC_ROLE',
      targetRole: 'STORE_MANAGER',
      targetAssignee: 'Amanat Bharadwaj'
    }
  }
];

export const FMS_PO_PAYMENT_STAGES: FmsStageDefinition[] = [
  // Stage 1: Receive PO & Payment Request (Accountant)
  {
    stageId: 'STG-PAY-01',
    stageNumber: 1,
    name: 'Receive PO & Payment Request',
    what: 'Accountant verification & acknowledgment of PO payment request, amount, purpose, site requisition and PO attachment',
    whoRole: 'ACCOUNTANT',
    whoDefaultAssignee: 'Priyanka Agrawal',
    howChannel: 'IN-APP FORM',
    slaHours: 1,
    hasYesNoDecision: false,
    fields: [
      { id: 'acknowledged', label: 'Acknowledge Payment Request', type: 'SELECT', options: ['ACKNOWLEDGED', 'REVISE_REQUIRED'], required: true, defaultValue: 'ACKNOWLEDGED' },
      { id: 'poAmountDisplay', label: 'Payable Amount (₹)', type: 'TEXT', required: false, placeholder: 'Amount in INR' },
      { id: 'purposeOfPayment', label: 'Purpose of Payment', type: 'TEXT', required: false },
      { id: 'siteName', label: 'Project / Site', type: 'TEXT', required: false },
      { id: 'requestedBy', label: 'Requested By', type: 'TEXT', required: false },
      { id: 'vendorName', label: 'Vendor Name', type: 'TEXT', required: false },
      { id: 'poAttachmentUrl', label: 'PO PDF Attachment', type: 'FILE', required: false },
      { id: 'accountantRemarks', label: 'Accountant Acknowledgment Notes', type: 'TEXTAREA', placeholder: 'Dossier received and verified against PO & budget...' }
    ]
  },
  // Phase 1: Beneficiary Setup (Skip Stages 2-5 if vendor is already verified)
  {
    stageId: 'STG-PAY-02',
    stageNumber: 2,
    name: 'Fill Beneficiary Details',
    what: 'Fill vendor beneficiary bank coordinates & upload cancelled cheque in Beneficiary Master',
    whoRole: 'ACCOUNTANT',
    whoDefaultAssignee: 'Priyanka Agrawal',
    howChannel: 'IN-APP FORM',
    slaHours: 2,
    hasYesNoDecision: false,
    fields: [
      { id: 'beneficiaryName', label: 'Beneficiary Name (Account Title)', type: 'TEXT', required: true, placeholder: 'e.g. ULTRA TECH CEMENT LTD' },
      { id: 'bankName', label: 'Bank Name', type: 'TEXT', required: true, placeholder: 'e.g. State Bank of India' },
      { id: 'accountNo', label: 'Bank Account Number', type: 'TEXT', required: true, placeholder: 'Enter complete bank account number' },
      { id: 'ifscCode', label: 'IFSC Code', type: 'TEXT', required: true, placeholder: 'e.g. SBIN0001292' },
      { id: 'cancelledChequeUrl', label: 'Cancelled Cheque Copy / Attachment', type: 'FILE', required: true },
      { id: 'beneficiaryEntryRemarks', label: 'Accountant Notes', type: 'TEXTAREA', placeholder: 'Enter remarks, verification notes or branch details...' }
    ]
  },
  {
    stageId: 'STG-PAY-03',
    stageNumber: 3,
    name: 'Director Beneficiary Approval',
    what: 'Director review & approval of vendor beneficiary addition',
    whoRole: 'DIRECTOR',
    whoDefaultAssignee: 'Pranjal Agrawal',
    howChannel: 'DIRECTOR APPROVAL DESK',
    slaHours: 1,
    hasYesNoDecision: true,
    logic: {
      gatewayType: 'APPROVAL_DECISION',
      rejectionBehavior: 'RETURN_TO_PREVIOUS',
      slaHours: 1
    },
    fields: [
      { id: 'status', label: 'Approval Status', type: 'APPROVAL', options: ['APPROVED', 'REJECTED'], required: true, defaultValue: 'APPROVED' },
      { id: 'approvalRemarks', label: 'Director Beneficiary Approval Notes', type: 'TEXTAREA', placeholder: 'Enter approval directive or sanction remarks...' }
    ]
  },
  {
    stageId: 'STG-PAY-04',
    stageNumber: 4,
    name: 'Bank Entry Beneficiary',
    what: 'Add beneficiary account to corporate internet banking portal (cooling period initiated)',
    whoRole: 'ACCOUNTANT',
    whoDefaultAssignee: 'Priyanka Agrawal',
    howChannel: 'BANKING PORTAL',
    slaHours: 1,
    hasYesNoDecision: false,
    fields: [
      { id: 'beneficiaryEntryStatus', label: 'Netbanking Portal Addition Status', type: 'SELECT', options: ['DONE', 'PENDING'], required: true, defaultValue: 'DONE' },
      { id: 'bankReferenceNumber', label: 'Bank Portal Reference / URN', type: 'TEXT', placeholder: 'e.g. URN-98127391' },
      { id: 'portalRemarks', label: 'Bank Entry Remarks', type: 'TEXTAREA', placeholder: 'Cooling period initiated (e.g. 4-hour cooling on corporate netbanking)...' }
    ]
  },
  {
    stageId: 'STG-PAY-05',
    stageNumber: 5,
    name: 'Netbanking Beneficiary Confirmation',
    what: 'Confirm beneficiary addition status in bank portal after cooling period (Proxy Action: Accountant or Director)',
    whoRole: 'DIRECTOR',
    whoDefaultAssignee: 'Pranjal Agrawal',
    howChannel: 'BANKING PORTAL',
    slaHours: 1,
    hasYesNoDecision: false,
    fields: [
      { id: 'additionStatus', label: 'Beneficiary Activation Status', type: 'SELECT', options: ['DONE', 'ACTIVE', 'COOLING_PENDING'], required: true, defaultValue: 'DONE' },
      { id: 'confirmationRemarks', label: 'Cooling Period / Activation Confirmation Notes', type: 'TEXTAREA', placeholder: 'Beneficiary confirmed active for RTGS/NEFT disbursements.' }
    ]
  },
  // Phase 2: Payment Execution & Release
  {
    stageId: 'STG-PAY-06',
    stageNumber: 6,
    name: 'Director Payment Approval',
    what: 'Director authorization / digital sign-off for payment disbursement',
    whoRole: 'DIRECTOR',
    whoDefaultAssignee: 'Pranjal Agrawal',
    howChannel: 'DIRECTOR APPROVAL DESK',
    slaHours: 1,
    hasYesNoDecision: true,
    logic: {
      gatewayType: 'APPROVAL_DECISION',
      rejectionBehavior: 'RETURN_TO_PREVIOUS',
      slaHours: 1
    },
    fields: [
      { id: 'status', label: 'Payment Approval Status', type: 'APPROVAL', options: ['APPROVED', 'REJECTED'], required: true, defaultValue: 'APPROVED' },
      { id: 'approvedAmount', label: 'Approved Amount (₹)', type: 'NUMBER', required: true },
      { id: 'approvalRemarks', label: 'Director Payment Approval Notes', type: 'TEXTAREA', placeholder: 'Enter authorization remarks or budget account allocation...' }
    ]
  },
  {
    stageId: 'STG-PAY-07',
    stageNumber: 7,
    name: 'Bank Payment Entry',
    what: 'Initiate payment transfer (NEFT/RTGS/IMPS/UPI) entry on bank netbanking portal',
    whoRole: 'ACCOUNTANT',
    whoDefaultAssignee: 'Priyanka Agrawal',
    howChannel: 'BANKING PORTAL',
    slaHours: 1,
    hasYesNoDecision: false,
    fields: [
      { id: 'paymentEntryStatus', label: 'Payment Portal Entry Status', type: 'SELECT', options: ['DONE', 'PENDING'], required: true, defaultValue: 'DONE' },
      { id: 'bankAccountDebited', label: 'Bank Account Debited', type: 'SELECT', options: ['HDFC Main Ops A/c', 'SBI Site A/c', 'ICICI Disbursements'], required: true, defaultValue: 'HDFC Main Ops A/c' },
      { id: 'entryRemarks', label: 'Payment Initiation Notes', type: 'TEXTAREA', placeholder: 'Entered on corporate banking portal, awaiting Director OTP / final sign-off...' }
    ]
  },
  {
    stageId: 'STG-PAY-08',
    stageNumber: 8,
    name: 'Netbanking Payment Confirmation',
    what: 'Final netbanking payment approval, release & UTR recording with transfer screenshot proof (Proxy Action: Accountant or Director)',
    whoRole: 'DIRECTOR',
    whoDefaultAssignee: 'Pranjal Agrawal',
    howChannel: 'BANKING PORTAL',
    slaHours: 1,
    hasYesNoDecision: false,
    fields: [
      { id: 'utrNumber', label: 'Bank UTR / Transaction Reference No', type: 'TEXT', required: true, placeholder: 'e.g. UTR-9182371928' },
      { id: 'paymentDoneScreenshot', label: 'Payment Done Screenshot / Transfer Proof', type: 'FILE', required: true },
      { id: 'paymentStatus', label: 'Final Settlement Status', type: 'SELECT', options: ['DONE', 'SETTLED'], required: true, defaultValue: 'DONE' },
      { id: 'settlementRemarks', label: 'Disbursement Remarks', type: 'TEXTAREA', placeholder: 'Transaction processed successfully. UTR and proof communicated.' }
    ]
  },
  // Phase 3: Material Collection Notification (Purchaser)
  {
    stageId: 'STG-PAY-09',
    stageNumber: 9,
    name: 'Send Payment Details to Get Material',
    what: 'Purchaser shares payment UTR, PO details and transfer proof screenshot with vendor and selects Purchaser Assistant for material collection',
    whoRole: 'PURCHASER',
    whoDefaultAssignee: 'Shyam Rao Sureshe',
    howChannel: 'WHATSAPP / EMAIL TO VENDOR',
    slaHours: 2,
    hasYesNoDecision: false,
    fields: [
      { id: 'billNoOrPo', label: 'Bill / PO Number', type: 'TEXT', required: true },
      { id: 'vendorName', label: 'Vendor Name', type: 'TEXT', required: true },
      { id: 'indentNo', label: 'Indent Number', type: 'TEXT', required: true },
      { id: 'poDate', label: 'PO Date', type: 'TEXT', required: true },
      { id: 'poAmount', label: 'Disbursed Amount (₹)', type: 'TEXT', required: true },
      { id: 'siteName', label: 'Delivery Site Name', type: 'TEXT', required: true },
      { id: 'poAttachmentUrl', label: 'PO Attachment', type: 'FILE', required: false },
      { id: 'paymentDoneScreenshot', label: 'Payment Done Screenshot', type: 'FILE', required: true },
      { id: 'sentVia', label: 'Sent Via', type: 'SELECT', options: ['WhatsApp', 'Email', 'Courier'], required: true, defaultValue: 'WhatsApp' },
      { id: 'poAssignTo', label: 'PO Assign To', type: 'SELECT', options: ['Rajendra', 'Vivek', 'Rajnikant'], required: true },
      { id: 'dispatchRemarks', label: 'Purchaser Delivery / Material Dispatch Notes', type: 'TEXTAREA', placeholder: 'Details communicated to vendor via WhatsApp/Email. Target dispatch date confirmed...' }
    ]
  },
  {
    stageId: 'STG-PAY-10',
    stageNumber: 10,
    name: 'Collect Material from Vendor',
    what: 'Purchaser Assistant collects physical material consignment from vendor, verifies delivery challan, and books transit vehicle',
    whoRole: 'PURCHASER ASSISTANT',
    whoDefaultAssignee: 'Rajendra',
    howChannel: 'PHYSICAL HANDOVER',
    slaHours: 4,
    hasYesNoDecision: false,
    fields: [
      { id: 'collectionDate', label: 'Collection Date', type: 'DATE', required: true },
      { id: 'vendorDispatchChallanNo', label: 'Vendor Delivery Challan / LR No', type: 'TEXT', required: true, placeholder: 'e.g. DC-9842 or LR No' },
      { id: 'vehicleNumber', label: 'Vehicle Number', type: 'TEXT', required: true, placeholder: 'e.g. CG-04-1234' },
      { id: 'driverDetails', label: 'Driver Name & Phone', type: 'TEXT', placeholder: 'e.g. Driver Rajesh (9827012345)' },
      { id: 'collectionRemarks', label: 'Collection Remarks', type: 'TEXTAREA', placeholder: 'Physical inspection and collection notes...' }
    ]
  }
];

export const FMS_BENEFICIARY_APPROVAL_STAGES: FmsStageDefinition[] = [
  {
    stageId: 'STG-BEN-01',
    stageNumber: 1,
    name: 'GET APPROVAL (BENEFICIARY)',
    what: 'Obtain management / director approval for vendor beneficiary registration',
    whoRole: 'FINANCE APPROVER',
    whoDefaultAssignee: 'Pranjal Agrawal / Khushboo Sahu',
    howChannel: 'WHATSAPP / CALL / MANUAL',
    slaHours: 0,
    isCheckpoint: true,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-BEN-02',
    stageNumber: 2,
    name: 'ADD ACCOUNT ONLINE',
    what: 'Add vendor beneficiary bank account details into online net banking portal',
    whoRole: 'ACCOUNTS EXECUTIVE',
    whoDefaultAssignee: 'Byamkesh Kaiwartya',
    howChannel: 'ONLINE BANKING',
    slaHours: 1,
    isCheckpoint: true,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-BEN-03',
    stageNumber: 3,
    name: 'CONFIRM ACCOUNT ADDITION',
    what: 'Verify bank cooling period and confirm beneficiary account addition',
    whoRole: 'ACCOUNTS EXECUTIVE',
    whoDefaultAssignee: 'Byamkesh Kaiwartya',
    howChannel: 'WHATSAPP / PHONE / EMAIL',
    slaHours: 4,
    hasYesNoDecision: false
  }
];

export const FMS_PURCHASE_TO_STORE_DISPATCH_STAGES: FmsStageDefinition[] = [
  {
    stageId: 'STG-PSD-01',
    stageNumber: 1,
    name: 'GRN & Quality Check',
    what: 'Receive incoming purchased material physically at Central Store warehouse, perform quality check and log Goods Received Note (GRN)',
    whoRole: 'STORE MANAGER (BRAHMANAND PATEL)',
    whoDefaultAssignee: 'Brahmanand Patel',
    howChannel: 'PHYSICALLY',
    slaHours: 2,
    hasYesNoDecision: false,
    fields: [
      { id: 'grnNumber', label: 'GRN Number', type: 'TEXT', required: true, placeholder: 'e.g. BPL/GRN/2026/012' },
      { id: 'vendorChallanNo', label: 'Vendor Challan / Invoice No', type: 'TEXT', required: true },
      { id: 'receivedDate', label: 'Received Date', type: 'DATE', required: true },
      { 
        id: 'itemsTable', 
        label: 'GRN Line Items & Quality Check', 
        type: 'MULTI_ITEM_TABLE', 
        required: true,
        columns: [
          { key: 'item_description', label: 'Item Description', type: 'TEXT' },
          { key: 'ordered_qty', label: 'Ordered Qty', type: 'NUMBER' },
          { key: 'received_qty', label: 'Received Qty', type: 'NUMBER' },
          { key: 'accepted_qty', label: 'Accepted Qty', type: 'NUMBER' },
          { key: 'rejected_qty', label: 'Rejected Qty', type: 'NUMBER' },
          { key: 'rejection_reason', label: 'Remarks / Rejection Reason', type: 'TEXT' }
        ]
      },
      { id: 'grnAttachment', label: 'Upload Vendor Bill / Delivery Challan', type: 'FILE', required: false }
    ]
  },
  {
    stageId: 'STG-PSD-02',
    stageNumber: 2,
    name: 'Stock Inward',
    what: 'Store accepted stock in designated warehouse bin/rack location and record inward entry in digital register',
    whoRole: 'STORE MANAGER (BRAHMANAND PATEL)',
    whoDefaultAssignee: 'Brahmanand Patel',
    howChannel: 'STORE REGISTER',
    slaHours: 2,
    hasYesNoDecision: false,
    fields: [
      { id: 'binLocation', label: 'Bin / Shelf Location', type: 'TEXT', required: true, placeholder: 'e.g. Bay 4 - Rack B - Shelf 2' },
      { id: 'inwardDate', label: 'Inward Date', type: 'DATE', required: true },
      { id: 'inwardRemarks', label: 'Warehouse Inward Remarks', type: 'TEXTAREA' }
    ]
  },
  {
    stageId: 'STG-PSD-03',
    stageNumber: 3,
    name: 'Prepare STN (Stock Transfer Note)',
    what: 'Generate official Stock Transfer Note (STN) for outbound transit to project site',
    whoRole: 'STORE MANAGER (BRAHMANAND PATEL)',
    whoDefaultAssignee: 'Brahmanand Patel',
    howChannel: 'PHYSICAL COPY',
    slaHours: 2,
    hasYesNoDecision: false,
    fields: [
      { id: 'stnNumber', label: 'STN Number', type: 'TEXT', required: true, placeholder: 'e.g. BPL/STN/2026/089' },
      { id: 'stnDate', label: 'STN Date', type: 'DATE', required: true },
      { id: 'stnItemsTable', label: 'Outward STN Items', type: 'MULTI_ITEM_TABLE', required: true }
    ]
  },
  {
    stageId: 'STG-PSD-04',
    stageNumber: 4,
    name: 'Logistics & Dispatch',
    what: 'Coordinate transit vehicle, check E-Way Bill requirement, generate Gate Pass, and dispatch consignment to project site',
    whoRole: 'STORE MANAGER (BRAHMANAND PATEL)',
    whoDefaultAssignee: 'Brahmanand Patel',
    howChannel: 'PHYSICAL DISPATCH',
    slaHours: 4,
    hasYesNoDecision: false,
    fields: [
      { id: 'vehicleNumber', label: 'Vehicle Number', type: 'TEXT', required: true, placeholder: 'e.g. CG-04-1234' },
      { id: 'driverDetails', label: 'Driver Details (Name & Phone)', type: 'TEXT', required: true, placeholder: 'e.g. Rajesh Kumar (9827012345)' },
      { id: 'isEwayBillRequired', label: 'E-Way Bill Required?', type: 'SELECT', options: ['Yes', 'No'], required: true, defaultValue: 'Yes' },
      { id: 'ewayBillNumber', label: 'E-Way Bill Number', type: 'TEXT', placeholder: 'e.g. 191283719283' },
      { id: 'gatePassDocument', label: 'Upload Signed Gate Pass / STN Docket', type: 'FILE', required: false },
      { id: 'dispatchRemarks', label: 'Outward Dispatch Remarks', type: 'TEXTAREA' }
    ]
  }
];

export const FMS_PAYMENT_TO_DISPATCH_STAGES: FmsStageDefinition[] = [
  {
    stageId: 'STG-DISP-01',
    stageNumber: 1,
    name: 'GET MATERIAL',
    what: 'Procure and receive material from vendor as per Purchase Order',
    whoRole: 'PURCHASE ASSISTANT (RAJENDRA/VIVEK/RAJNIKANT)',
    whoDefaultAssignee: 'Rajendra / Vivek / Rajnikant',
    howChannel: 'WHATSAPP/CALL/PHYSICAL VERIFICATION',
    slaHours: 4,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-DISP-02',
    stageNumber: 2,
    name: 'CHECK & VERIFY MATERIAL WITH PO',
    what: 'Inspect and verify material quality, specifications, and quantity with Purchase Order',
    whoRole: 'PURCHASE EXECUTIVE (SHYAM RAO SURESHE)',
    whoDefaultAssignee: 'Shyam Rao Sureshe',
    howChannel: 'WHATSAPP/CALL/PHYSICAL VERIFICATION',
    slaHours: 3,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-DISP-03',
    stageNumber: 3,
    name: 'IS MATERIAL ACCEPTABLE ?',
    what: 'Inspection Checkpoint: Is material acceptable as per required standard?',
    whoRole: 'PURCHASE EXECUTIVE (SHYAM RAO SURESHE)',
    whoDefaultAssignee: 'Shyam Rao Sureshe',
    howChannel: 'WHATSAPP / CALL',
    slaHours: 1,
    isCheckpoint: true,
    hasYesNoDecision: true
  },
  {
    stageId: 'STG-DISP-04',
    stageNumber: 4,
    name: 'RETURN / REPLACE MATERIAL',
    what: 'Initiate physical return or replacement of defective/non-compliant material with vendor',
    whoRole: 'PURCHASE ASSISTANT (RAJENDRA/VIVEK/RAJNIKANT)',
    whoDefaultAssignee: 'Rajendra / Vivek / Rajnikant',
    howChannel: 'PHYSICALLY',
    slaHours: 3,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-DISP-05',
    stageNumber: 5,
    name: 'IS MATERIAL REPLACED ?',
    what: 'Checkpoint: Has vendor successfully replaced the returned material?',
    whoRole: 'PURCHASE ASSISTANT (RAJENDRA/VIVEK/RAJNIKANT)',
    whoDefaultAssignee: 'Rajendra / Vivek / Rajnikant',
    howChannel: 'WHATSAPP / CALL',
    slaHours: 4,
    isCheckpoint: true,
    hasYesNoDecision: true
  },
  {
    stageId: 'STG-DISP-06',
    stageNumber: 6,
    name: 'GET REFUND / CREDIT NOTES',
    what: 'Obtain official credit note or bank refund from vendor for non-replaceable material',
    whoRole: 'PURCHASE ASSISTANT (RAJENDRA/VIVEK/RAJNIKANT)',
    whoDefaultAssignee: 'Rajendra / Vivek / Rajnikant',
    howChannel: 'WHATSAPP/ EMAIL / PHYSICAL COPY',
    slaHours: 4,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-DISP-07',
    stageNumber: 7,
    name: 'DISPATCH MATERIAL',
    what: 'Fill Purchase to Store to Dispatch Google Form and release material to project site',
    whoRole: 'Purchaser (Rajendra/Rajnikant/Vivek)',
    whoDefaultAssignee: 'Rajendra / Rajnikant / Vivek',
    howChannel: 'IN-APP DISPATCH ENTRY',
    formUrl: undefined,
    slaHours: 28,
    isCheckpoint: true,
    hasYesNoDecision: false
  }
];

export const FMS_SITE_RECEIVE_STAGES: FmsStageDefinition[] = [
  {
    stageId: 'STG-REC-01',
    stageNumber: 1,
    name: 'Site Material Receipt & GRN Verification',
    what: 'Site store team inspects incoming consignment, verifies quantities against delivery challan, logs Site GRN, and uploads signed acknowledgment slip',
    whoRole: 'SITE USER (AMAN KUMAR / SITE DEO)',
    whoDefaultAssignee: 'Aman Kumar',
    howChannel: 'IN-APP SITE LOG',
    slaHours: 12,
    hasYesNoDecision: false,
    fields: [
      { id: 'siteGrnNumber', label: 'Site GRN Number', type: 'TEXT', required: true, placeholder: 'e.g. SITE/GRN/2026/044' },
      { id: 'receiptDate', label: 'Receipt Date', type: 'DATE', required: true },
      { id: 'receivedBy', label: 'Received By (Staff Name & Designation)', type: 'TEXT', required: true, placeholder: 'e.g. Aman Kumar (Site Store Incharge)' },
      { id: 'receivedQty', label: 'Received Quantity Confirmed', type: 'NUMBER', required: true },
      { id: 'signedChallanUpload', label: 'Upload Signed & Stamped Delivery Challan', type: 'FILE', required: true },
      { id: 'siteRemarks', label: 'Site Verification & Physical Inspection Notes', type: 'TEXTAREA', placeholder: 'Items physically inspected and verified on site...' }
    ]
  }
];

export const FMS_STORE_TO_SITE_DISPATCH_STAGES: FmsStageDefinition[] = [
  {
    stageId: 'STG-SSD-01',
    stageNumber: 1,
    name: 'Collect Items from Store',
    what: 'Physically gather all approved requisition materials from store racks and verify inventory readiness',
    whoRole: 'STORE MANAGER (AMANAT / SUMANT / HEMANT)',
    whoDefaultAssignee: 'Amanat Bharadwaj',
    howChannel: 'PHYSICALLY',
    slaHours: 4,
    hasYesNoDecision: false,
    fields: [
      { id: 'itemsTable', label: 'Store Items to Collect', type: 'MULTI_ITEM_TABLE', required: true },
      { id: 'collectionDate', label: 'Store Collection Date', type: 'DATE', required: true },
      { id: 'storeKeeperNotes', label: 'Store Keeper Collection Remarks', type: 'TEXTAREA' }
    ]
  },
  {
    stageId: 'STG-SSD-02',
    stageNumber: 2,
    name: 'Prepare STN (Stock Transfer Note)',
    what: 'Prepare official stock transfer note (STN) and delivery challan for outbound internal transfer',
    whoRole: 'STORE MANAGER (AMANAT / SUMANT / HEMANT)',
    whoDefaultAssignee: 'Amanat Bharadwaj',
    howChannel: 'PHYSICAL COPY',
    slaHours: 2,
    hasYesNoDecision: false,
    fields: [
      { id: 'stnNumber', label: 'STN Number', type: 'TEXT', required: true, placeholder: 'e.g. BPL/STN/2026/044' },
      { id: 'stnDate', label: 'STN Issue Date', type: 'DATE', required: true },
      { id: 'stnItemsTable', label: 'Outward STN Items', type: 'MULTI_ITEM_TABLE', required: true },
      { id: 'stnDocument', label: 'Upload STN / Challan Document', type: 'FILE' }
    ]
  },
  {
    stageId: 'STG-SSD-03',
    stageNumber: 3,
    name: 'Arrange Vehicle & Logistics',
    what: 'Coordinate and book transport/vehicle physically for project site transit and confirm E-Way Bill if required',
    whoRole: 'STORE MANAGER (AMANAT / SUMANT / HEMANT)',
    whoDefaultAssignee: 'Amanat Bharadwaj',
    howChannel: 'PHYSICALLY',
    slaHours: 4,
    hasYesNoDecision: false,
    fields: [
      { id: 'vehicleNumber', label: 'Vehicle Number', type: 'TEXT', required: true, placeholder: 'e.g. CG-04-1234' },
      { id: 'driverDetails', label: 'Driver Details (Name & Phone)', type: 'TEXT', required: true, placeholder: 'e.g. Rajesh Kumar (9827012345)' },
      { id: 'isEwayBillRequired', label: 'E-Way Bill Required?', type: 'SELECT', options: ['Yes', 'No'], required: true, defaultValue: 'Yes' },
      { id: 'ewayBillNumber', label: 'E-Way Bill Number', type: 'TEXT' }
    ]
  },
  {
    stageId: 'STG-SSD-04',
    stageNumber: 4,
    name: 'Dispatch Material with Gate Pass',
    what: 'Release loaded vehicle physically with signed challan, transfer note, and gate pass',
    whoRole: 'STORE MANAGER (AMANAT / SUMANT / HEMANT)',
    whoDefaultAssignee: 'Amanat Bharadwaj',
    howChannel: 'PHYSICALLY',
    slaHours: 4,
    hasYesNoDecision: false,
    fields: [
      { id: 'gatePassNumber', label: 'Gate Pass Number', type: 'TEXT', required: true, placeholder: 'e.g. GP-2026-981' },
      { id: 'dispatchDate', label: 'Dispatch Date & Time', type: 'DATE', required: true },
      { id: 'gatePassDocument', label: 'Upload Signed Gate Pass', type: 'FILE' },
      { id: 'dispatchRemarks', label: 'Outward Transit Remarks', type: 'TEXTAREA' }
    ]
  }
];

export const FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES: FmsStageDefinition[] = [
  {
    stageId: 'STG-INV-01',
    stageNumber: 1,
    name: 'RECEIVE INVOICE',
    what: 'Receive vendor GST invoice copy via WhatsApp, email, or physical submission',
    whoRole: 'ACCOUNT MANAGER',
    whoDefaultAssignee: 'Byamkesh Kaiwartya / Accounts',
    howChannel: 'WHATSAPP/EMAIL/PHYSICAL',
    slaHours: 0,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-INV-02',
    stageNumber: 2,
    name: 'CHECK INVOICE DETAILS & CALCULATION',
    what: 'Inspect invoice line items, tax breakdown, GST rates, HSN codes, and arithmetic calculations physically against PO',
    whoRole: 'ACCOUNTS MANAGER',
    whoDefaultAssignee: 'Byamkesh Kaiwartya',
    howChannel: 'INVOICE PHYSICALLY',
    slaHours: 2,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-INV-03',
    stageNumber: 3,
    name: 'IS INVOICE ACCEPTABLE?',
    what: 'Verification Checkpoint: Is the vendor invoice legally, commercially, and physically acceptable?',
    whoRole: 'PURCHASE MANAGER(BRAHMANAND PATEL)',
    whoDefaultAssignee: 'Bramhanand Patel',
    howChannel: 'SITE INCHARGE PHYSICALLY',
    slaHours: 1,
    isCheckpoint: true,
    hasYesNoDecision: true
  },
  {
    stageId: 'STG-INV-04',
    stageNumber: 4,
    name: 'GET INVOICE RECTIFIED',
    what: 'Liaise with vendor / site store to rectify discrepancies, issue revised invoice or debit/credit note',
    whoRole: 'PURCHASE MANAGER(BRAHMANAND PATEL)',
    whoDefaultAssignee: 'Bramhanand Patel',
    howChannel: 'SITE INCHARGE PHYSICALLY',
    slaHours: 12,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-INV-05',
    stageNumber: 5,
    name: 'GET INVOICE APPROVAL',
    what: 'Submit verified invoice dossier to Executive Assistant / Finance for final executive authorization',
    whoRole: 'KHUSBOO (EA)',
    whoDefaultAssignee: 'Khushboo Sahu',
    howChannel: 'PHYSICAL COPY',
    slaHours: 2,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-INV-06',
    stageNumber: 6,
    name: 'UPLOAD/APPROVE IN ERP',
    what: 'Enter invoice journal voucher, post entry, and approve in corporate ERP system',
    whoRole: 'ACCOUNTS MANAGER',
    whoDefaultAssignee: 'Byamkesh Kaiwartya',
    howChannel: 'ONLINE ERP',
    slaHours: 4,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-INV-07',
    stageNumber: 7,
    name: 'RECEIVE ORIGINAL INVOICE',
    what: 'Receive and archive hard-copy original tax invoice in physical accounts record registry',
    whoRole: 'ACCOUNTS MANAGER',
    whoDefaultAssignee: 'Byamkesh Kaiwartya',
    howChannel: 'PHYSICAL COPY',
    slaHours: 72,
    hasYesNoDecision: false
  }
];

export const FMS_HR_ATTENDANCE_PAYMENT_STAGES: FmsStageDefinition[] = [
  {
    stageId: 'STG-HR-01',
    stageNumber: 1,
    name: 'COLLECT ATTENDANCE OF LABOUR',
    what: 'Collect daily muster roll, gang count, and labour attendance log from site in-charge',
    whoRole: 'SITE INCHARGE',
    whoDefaultAssignee: 'Site Incharge',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 0,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-HR-02',
    stageNumber: 2,
    name: 'CHECK ATTENDANCE OF LABOUR FROM PHOTO AND SHEET',
    what: 'Verify physical photo proof, gang headcount, and attendance manual sheet against site logs',
    whoRole: 'GARIMA PAL (HR)',
    whoDefaultAssignee: 'Garima Pal',
    howChannel: 'WHATSAPP',
    slaHours: 1,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-HR-03',
    stageNumber: 3,
    name: 'CHECK FOR OT IF ANY ?',
    what: 'Audit Checkpoint: Is overtime (OT) logged for any labour gang at site?',
    whoRole: 'GARIMA PAL (HR)',
    whoDefaultAssignee: 'Garima Pal',
    howChannel: 'WHATSAPP',
    slaHours: 1,
    isCheckpoint: true,
    hasYesNoDecision: true
  },
  {
    stageId: 'STG-HR-04',
    stageNumber: 4,
    name: 'PREPARE OT SHEET',
    what: 'Calculate approved overtime hours, shift rates, and compile Labour OT Sheet in Excel',
    whoRole: 'GARIMA PAL (HR)',
    whoDefaultAssignee: 'Garima Pal',
    howChannel: 'EXCEL',
    slaHours: 1,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-HR-05',
    stageNumber: 5,
    name: 'GET APPROVAL OT SHEET',
    what: 'Submit prepared OT sheet to site incharge/PM and secure physical signature sign-off',
    whoRole: 'GARIMA PAL (HR)',
    whoDefaultAssignee: 'Garima Pal',
    howChannel: 'MANUAL SHEET/PHYSICAL',
    slaHours: 2,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-HR-06',
    stageNumber: 6,
    name: 'PREPARE ATTENDANCE & PAYMENT SHEET',
    what: 'Compute shift wages, food allowances, deductions, and finalize comprehensive Payment Sheet in Excel',
    whoRole: 'GARIMA PAL (HR)',
    whoDefaultAssignee: 'Garima Pal',
    howChannel: 'EXCEL',
    slaHours: 1,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-HR-07',
    stageNumber: 7,
    name: 'CHECK ATTENDANCE AND PAYMENT SHEET',
    what: 'Independent audit of attendance wage formulas, gang sums, and calculation accuracy',
    whoRole: 'MAMTA (HR / ACCOUNTS)',
    whoDefaultAssignee: 'Mamta',
    howChannel: 'MANUAL SHEET/WHATSAPP/PHYSICAL',
    slaHours: 1,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-HR-08',
    stageNumber: 8,
    name: 'CHECK DPR SHEET',
    what: 'Reconcile daily labour deployment and activity output with Daily Progress Report (DPR) site logs',
    whoRole: 'NANDITA/KHILEASH',
    whoDefaultAssignee: 'Nandita / Khilesh',
    howChannel: 'MANUAL SHEET/WHATSAPP/PHYSICAL',
    slaHours: 1,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-HR-09',
    stageNumber: 9,
    name: 'GET APPROVAL PAYMENT AND ATTENDANCE SHEET FROM PM',
    what: 'Submit verified attendance and payment sheet to Project Manager (PM) for formal operational approval',
    whoRole: 'GARIMA PAL (HR)',
    whoDefaultAssignee: 'Garima Pal',
    howChannel: 'MANUAL SHEET/PHYSICAL',
    slaHours: 1,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-HR-10',
    stageNumber: 10,
    name: 'GET APPROVAL FROM MD',
    what: 'Submit approved wage dossier to Managing Director (MD) for final executive payment release sign-off',
    whoRole: 'GARIMA PAL (HR)',
    whoDefaultAssignee: 'Garima Pal',
    howChannel: 'MANUAL SHEET/PHYSICAL',
    slaHours: 1,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-HR-11',
    stageNumber: 11,
    name: 'MAKE LABOUR PAYMENT',
    what: 'Execute wage disbursement to site labour / gangs and archive physical signed payout vouchers',
    whoRole: 'GARIMA PAL (HR)',
    whoDefaultAssignee: 'Garima Pal',
    howChannel: 'MANUAL SHEET/PHYSICAL',
    slaHours: 1,
    hasYesNoDecision: false
  }
];

export const FMS_BREAKDOWN_REPORTING_STAGES: FmsStageDefinition[] = [
  {
    stageId: 'STG-BRK-01',
    stageNumber: 1,
    name: 'BREAKDOWN PRELIMINARY REPORT',
    what: 'Log preliminary breakdown report immediately upon machine / vehicle / plant failure',
    whoRole: 'SITE MECHANIC',
    whoDefaultAssignee: 'Site Mechanic',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 0,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-BRK-02',
    stageNumber: 2,
    name: 'IS SERVICE ENGINEER REQUIRED?',
    what: 'Assess if specialized OEM Service Engineer visit is required for diagnostics',
    whoRole: 'SITE MECHANIC',
    whoDefaultAssignee: 'Site Mechanic',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 1,
    isCheckpoint: true,
    hasYesNoDecision: true
  },
  {
    stageId: 'STG-BRK-03',
    stageNumber: 3,
    name: 'CALL SERVICE ENGINEER',
    what: 'Contact and schedule certified Service Engineer to visit site',
    whoRole: 'MECHANICAL MANAGER (J CHAKRAWORTI)',
    whoDefaultAssignee: 'J Chakraworti',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 24,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-BRK-04',
    stageNumber: 4,
    name: 'PREPARE DETAILED DEFECT ANALYSIS REPORT',
    what: 'Prepare technical defect analysis report detailing root cause and required parts',
    whoRole: 'SERVICE ENGINEER/MECHANIC',
    whoDefaultAssignee: 'Service Engineer / Mechanic',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 12,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-BRK-05',
    stageNumber: 5,
    name: 'CAN DEFECTIVE PART/MACHINE/PLANT/VEHICLE BE REPAIRED AT SITE?',
    what: 'Evaluate if repair can be completed at site store or requires external workshop dispatch',
    whoRole: 'MECHANIC/MECHANICAL MANAGER (J CHAKRAWORTI)',
    whoDefaultAssignee: 'J Chakraworti / Mechanic',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 1,
    isCheckpoint: true,
    hasYesNoDecision: true
  },
  {
    stageId: 'STG-BRK-06',
    stageNumber: 6,
    name: 'SEND PARTS INDENT ALONG WITH SAMPLE (IF REQUIRED)',
    what: 'Dispatch parts indent requisition and damaged sample part to store',
    whoRole: 'STORE KEEPER (SUMANT SINGH CHAUHAN / PRANAB CHAKRABORTY)',
    whoDefaultAssignee: 'Sumant Singh Chauhan / Pranab Chakraborty',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 1,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-BRK-07',
    stageNumber: 7,
    name: 'RECEIVE PARTS',
    what: 'Receive replacement parts at site store and verify specs against indent',
    whoRole: 'STORE KEEPER (SUMANT SINGH CHAUHAN / PRANAB CHAKRABORTY)',
    whoDefaultAssignee: 'Sumant Singh Chauhan / Pranab Chakraborty',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 24,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-BRK-08',
    stageNumber: 8,
    name: 'REPAIR MACHINE',
    what: 'Execute site mechanic repair and part replacement on machine',
    whoRole: 'MECHANIC',
    whoDefaultAssignee: 'Site Mechanic',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 12,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-BRK-09',
    stageNumber: 9,
    name: 'SEND MACHINE/PLANT/VEHICLE DEFECTIVE PART FOR REPAIR',
    what: 'Transport machine / defective unit to authorized offsite workshop',
    whoRole: 'MECHANICAL MANAGER (J CHAKRAWORTI)',
    whoDefaultAssignee: 'J Chakraworti',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 24,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-BRK-10',
    stageNumber: 10,
    name: 'GET REPAIR ESTIMATE',
    what: 'Obtain formal repair cost estimate and quotation from workshop',
    whoRole: 'MECHANICAL MANAGER (J CHAKRAWORTI)',
    whoDefaultAssignee: 'J Chakraworti',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 12,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-BRK-11',
    stageNumber: 11,
    name: 'GET ESTIMATE APPROVAL',
    what: 'Secure management approval for workshop repair estimate',
    whoRole: 'MECHANICAL MANAGER (J CHAKRAWORTI)',
    whoDefaultAssignee: 'J Chakraworti',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 2,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-BRK-12',
    stageNumber: 12,
    name: 'GET MACHINE REPAIR',
    what: 'Complete external workshop repair and receive repaired machine back at site',
    whoRole: 'MECHANICAL MANAGER (J CHAKRAWORTI)',
    whoDefaultAssignee: 'J Chakraworti',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 36,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-BRK-13',
    stageNumber: 13,
    name: 'TRIAL RUN FOR 2 HOURS',
    what: 'Conduct mandatory 2-hour continuous trial run to verify load and operational stability',
    whoRole: 'DRIVER/OPERATOR/MECHANIC',
    whoDefaultAssignee: 'Driver / Operator / Mechanic',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 2,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-BRK-14',
    stageNumber: 14,
    name: 'DEPLOY AT SITE',
    what: 'Clear machine for active site deployment and update site availability logs',
    whoRole: 'DRIVER/OPERATOR/MECHANIC',
    whoDefaultAssignee: 'Driver / Operator / Mechanic',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 2,
    hasYesNoDecision: false
  }
];

export const FMS_EQUIPMENT_PART_REPAIR_STAGES: FmsStageDefinition[] = [
  {
    stageId: 'STG-EQP-01',
    stageNumber: 1,
    name: 'RECEIVE REPAIR REQUEST',
    what: 'Receive and log equipment/part repair requisition via Google Form',
    whoRole: 'PURCHASE MANAGER (BRAMHANAND PATEL)',
    whoDefaultAssignee: 'Bramhanand Patel',
    howChannel: 'IN-APP FORM',
    slaHours: 0,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-02',
    stageNumber: 2,
    name: 'CHECK WARRANTY DETAILS',
    what: 'Verify OEM invoice and warranty card to check active coverage',
    whoRole: 'PURCHASE MANAGER (BRAMHANAND PATEL)',
    whoDefaultAssignee: 'Bramhanand Patel',
    howChannel: 'INVOICE/WARRANTY CARD',
    slaHours: 3,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-03',
    stageNumber: 3,
    name: 'IS PART/EQUIPMENT UNDER WARRANTY?',
    what: 'Checkpoint: Is the damaged part / equipment under active manufacturer warranty?',
    whoRole: 'PURCHASE MANAGER (BRAMHANAND PATEL)',
    whoDefaultAssignee: 'Bramhanand Patel',
    howChannel: 'MANUAL',
    slaHours: 1,
    isCheckpoint: true,
    hasYesNoDecision: true
  },
  {
    stageId: 'STG-EQP-04',
    stageNumber: 4,
    name: 'SEND PART/EQUIPMENT TO AUTHORIZED SERVICE CENTER',
    what: 'Ship defective part / equipment to authorized OEM service center for free warranty repair',
    whoRole: 'PURCHASE MANAGER (BRAMHANAND PATEL)',
    whoDefaultAssignee: 'Bramhanand Patel',
    howChannel: 'SEND PHYSICALLY',
    slaHours: 24,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-05',
    stageNumber: 5,
    name: 'GET APPROVAL FOR REPAIR',
    what: 'Obtain formal management approval on paper to proceed with paid workshop repair',
    whoRole: 'PURCHASE MANAGER (BRAMHANAND PATEL)',
    whoDefaultAssignee: 'Bramhanand Patel',
    howChannel: 'ON PAPER',
    slaHours: 2,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-06',
    stageNumber: 6,
    name: 'SEND FOR REPAIR',
    what: 'Dispatch defective part physically to authorized workshop / vendor for estimation',
    whoRole: 'PURCHASE EXECUTIVE',
    whoDefaultAssignee: 'Shyam Rao Sureshe',
    howChannel: 'PHYSICALLY',
    slaHours: 24,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-07',
    stageNumber: 7,
    name: 'GET ESTIMATE',
    what: 'Receive formal repair quotation and part breakdown estimate from workshop',
    whoRole: 'PURCHASE EXECUTIVE',
    whoDefaultAssignee: 'Shyam Rao Sureshe',
    howChannel: 'WHATSAPP/EMAIL/PHYSICALLY',
    slaHours: 24,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-08',
    stageNumber: 8,
    name: 'GET ESTIMATE APPROVAL',
    what: 'Review and approve workshop repair cost estimate',
    whoRole: 'PURCHASE MANAGER (BRAMHANAND PATEL)',
    whoDefaultAssignee: 'Bramhanand Patel',
    howChannel: 'WHATSAPP/EMAIL/PHYSICALLY',
    slaHours: 2,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-09',
    stageNumber: 9,
    name: 'GIVE WORK ORDER',
    what: 'Issue official Work Order (WO) to vendor to commence repair work',
    whoRole: 'PURCHASE MANAGER (BRAMHANAND PATEL)',
    whoDefaultAssignee: 'Bramhanand Patel',
    howChannel: 'WHATSAPP/EMAIL/PHYSICALLY',
    slaHours: 2,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-10',
    stageNumber: 10,
    name: 'GET REPAIRED',
    what: 'Monitor workshop repair progress and collect repaired equipment / part',
    whoRole: 'PURCHASE EXECUTIVE',
    whoDefaultAssignee: 'Shyam Rao Sureshe',
    howChannel: 'PHYSICALLY',
    slaHours: 48,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-11',
    stageNumber: 11,
    name: 'TRIAL RUN (IF POSSIBLE)',
    what: 'Conduct initial functional trial run / video testing of repaired equipment',
    whoRole: 'PURCHASE ASSISTANT',
    whoDefaultAssignee: 'Rajendra / Vivek',
    howChannel: 'PHYSICALLY/VIDEO',
    slaHours: 2,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-12',
    stageNumber: 12,
    name: 'IS TRIAL RUN SUCCESSFUL?',
    what: 'Checkpoint: Did the repaired part/equipment pass the functional trial test successfully?',
    whoRole: 'PURCHASE EXECUTIVE',
    whoDefaultAssignee: 'Shyam Rao Sureshe',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 1,
    isCheckpoint: true,
    hasYesNoDecision: true
  },
  {
    stageId: 'STG-EQP-13',
    stageNumber: 13,
    name: 'ARE ADDITIONAL CHARGES TO BE INCURRED?',
    what: 'Checkpoint: Are there extra / unexpected repair charges or parts required?',
    whoRole: 'PURCHASE EXECUTIVE',
    whoDefaultAssignee: 'Shyam Rao Sureshe',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 1,
    isCheckpoint: true,
    hasYesNoDecision: true
  },
  {
    stageId: 'STG-EQP-14',
    stageNumber: 14,
    name: 'GET APPROVAL',
    what: 'Get approval for additional repair expenses',
    whoRole: 'PURCHASE MANAGER (BRAMHANAND PATEL)',
    whoDefaultAssignee: 'Bramhanand Patel',
    howChannel: 'WHATSAPP/CALL/MANUAL',
    slaHours: 1,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-15',
    stageNumber: 15,
    name: 'SEND FOR REPAIR',
    what: 'Re-send part to workshop for additional rectifications',
    whoRole: 'PURCHASE MANAGER (BRAMHANAND PATEL)',
    whoDefaultAssignee: 'Bramhanand Patel',
    howChannel: 'PHYSICAL',
    slaHours: 2,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-16',
    stageNumber: 16,
    name: 'TRIAL RUN',
    what: 'Re-conduct trial run after secondary repair',
    whoRole: 'PURCHASE EXECUTIVE',
    whoDefaultAssignee: 'Shyam Rao Sureshe',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 2,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-17',
    stageNumber: 17,
    name: 'RECEIVE PART/EQUIPMENT IN STORE',
    what: 'Receive fully repaired part / equipment into central / site store inventory',
    whoRole: 'STORE_MANAGER',
    whoDefaultAssignee: 'Sumant / Hemant',
    howChannel: 'PHYSICALLY',
    slaHours: 4,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-EQP-18',
    stageNumber: 18,
    name: 'DEPLOY AT SITE',
    what: 'Dispatch and install repaired part / equipment at active site location',
    whoRole: 'STORE_MANAGER',
    whoDefaultAssignee: 'Sumant / Hemant',
    howChannel: 'PHYSICALLY',
    slaHours: 12,
    hasYesNoDecision: false
  }
];

export const FMS_DPR_REPORTING_STAGES: FmsStageDefinition[] = [
  {
    stageId: 'STG-DPR-01',
    stageNumber: 1,
    name: 'RECEIVE DPR',
    what: 'Receive and log site Daily Progress Report (DPR) via WhatsApp / Call',
    whoRole: 'PLANNING / DPR INCHARGE (KHILESH)',
    whoDefaultAssignee: 'Khilesh',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 0,
    isCheckpoint: true,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-DPR-02',
    stageNumber: 2,
    name: 'PREPARE PLANNED ACTUAL SHEET',
    what: 'Collate planned vs actual work progress targets into comparison sheet',
    whoRole: 'PLANNING EXECUTIVE (NANDITA)',
    whoDefaultAssignee: 'Nandita',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 1,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-DPR-03',
    stageNumber: 3,
    name: 'PREPARE CONSUMPTION REPORT',
    what: 'Calculate diesel, cement, steel, and material site consumption from DPR',
    whoRole: 'PLANNING EXECUTIVE (NANDITA)',
    whoDefaultAssignee: 'Nandita',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 1,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-DPR-04',
    stageNumber: 4,
    name: 'REPORT MECHANICAL ISSUES TO MECHANICAL INCHARGE',
    what: 'Flag equipment breakdown or plant downtime issues to mechanical team',
    whoRole: 'MECHANICAL INCHARGE (PRANAY GHOSH)',
    whoDefaultAssignee: 'Pranay Ghosh',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 1,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-DPR-05',
    stageNumber: 5,
    name: 'REPORT HINDRANCE DETAILS TO PROJECT MANAGER',
    what: 'Highlight site ROW, weather, labor, or drawing hindrances to PM',
    whoRole: 'PLANNING INCHARGE (KHILESH)',
    whoDefaultAssignee: 'Khilesh',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 1,
    isCheckpoint: true,
    hasYesNoDecision: false
  },
  {
    stageId: 'STG-DPR-06',
    stageNumber: 6,
    name: 'UPDATE WEEKLY REVIEW SHEET',
    what: 'Sync daily progress data into executive weekly review matrix',
    whoRole: 'PLANNING INCHARGE (KHILESH)',
    whoDefaultAssignee: 'Khilesh',
    howChannel: 'WHATSAPP/CALL',
    slaHours: 1,
    hasYesNoDecision: false
  }
];

export const INITIAL_FMS_FLOWS: FmsInstance[] = [
  {
    id: 'fms-inst-dpr-001',
    flowId: 'FLOW-DPR-BIJETALA-01',
    flowType: 'DPR_REPORTING',
    indentNo: 'DPR-BIJ-010726',
    dprDate: '01/07/2026',
    dprPreparedBy: 'Eklavya Upadhyay',
    siteName: 'BIJETALA',
    priority: 'Normal',
    currentStageId: 'STG-DPR-06',
    currentStageIndex: 5,
    totalStages: 6,
    status: 'Completed',
    createdAt: '02/07/2026 12:59:53',
    updatedAt: '02/07/2026 16:12:18',
    totalDelayHours: 0.93,
    remarks: 'Bijetala site DPR for 01/07/2026 by Eklavya Upadhyay. All 6 stages processed.',
    stages: [
      { stageId: 'STG-DPR-01', stageName: 'RECEIVE DPR', assignee: 'Khilesh', how: 'WHATSAPP/CALL', status: 'Done', plannedDateTime: '02/07/2026 13:59:53', actualDateTime: '02/07/2026 14:56:13', timeDelayHours: 0.93 },
      { stageId: 'STG-DPR-02', stageName: 'PREPARE PLANNED ACTUAL SHEET', assignee: 'Nandita', how: 'WHATSAPP/CALL', status: 'Done', plannedDateTime: '02/07/2026 15:56:13', actualDateTime: '02/07/2026 14:56:26', timeDelayHours: 0 },
      { stageId: 'STG-DPR-03', stageName: 'PREPARE CONSUMPTION REPORT', assignee: 'Nandita', how: 'WHATSAPP/CALL', status: 'Done', plannedDateTime: '02/07/2026 15:56:26', actualDateTime: '02/07/2026 15:23:12', timeDelayHours: 0 },
      { stageId: 'STG-DPR-04', stageName: 'REPORT MECHANICAL ISSUES TO MECHANICAL INCHARGE', assignee: 'Pranay Ghosh', how: 'WHATSAPP/CALL', status: 'Done', plannedDateTime: '02/07/2026 16:23:12', actualDateTime: '02/07/2026 15:44:35', timeDelayHours: 0 },
      { stageId: 'STG-DPR-05', stageName: 'REPORT HINDRANCE DETAILS TO PROJECT MANAGER', assignee: 'Khilesh', how: 'WHATSAPP/CALL', status: 'Done', plannedDateTime: '02/07/2026 16:44:35', actualDateTime: '02/07/2026 16:12:18', timeDelayHours: 0 },
      { stageId: 'STG-DPR-06', stageName: 'UPDATE WEEKLY REVIEW SHEET', assignee: 'Khilesh', how: 'WHATSAPP/CALL', status: 'Done', plannedDateTime: '02/07/2026 17:12:18', actualDateTime: '02/07/2026 16:12:18', timeDelayHours: 0 }
    ]
  },
  {
    id: 'fms-inst-eqp-001',
    flowId: 'FLOW-EQP-PUMP-22376424',
    flowType: 'EQUIPMENT_PART_REPAIR',
    indentNo: 'EQP-PUMP-22376424',
    partSerialNo: 'Pump S/N: 22376424 Motor S/N: 23029944',
    partEquipmentName: 'Submersible Pump Set',
    vehiclePlantMachineName: 'Submersible Pump Set',
    siteName: 'BIJETALA',
    warrantyStatus: 'OUT_WARRANTY',
    priority: 'Urgent',
    currentStageId: 'STG-EQP-17',
    currentStageIndex: 16,
    totalStages: 18,
    status: 'In Progress',
    createdAt: '03/08/2026 15:49:43',
    updatedAt: '18/08/2026 12:58:34',
    totalDelayHours: 0,
    remarks: 'Bijetala Submersible Pump repair. Completed repair and trial run, receiving in store.',
    stages: [
      { stageId: 'STG-EQP-01', stageName: 'RECEIVE REPAIR REQUEST', assignee: 'Bramhanand Patel', how: 'IN-APP FORM', status: 'Done', plannedDateTime: '04/08/2026 10:49:43', actualDateTime: '03/08/2026 15:52:52', timeDelayHours: 0 },
      { stageId: 'STG-EQP-02', stageName: 'CHECK WARRANTY DETAILS', assignee: 'Bramhanand Patel', how: 'INVOICE/WARRANTY CARD', status: 'Done', plannedDateTime: '03/08/2026 16:52:52', actualDateTime: '03/08/2026 15:53:03', timeDelayHours: 0 },
      { stageId: 'STG-EQP-03', stageName: 'IS PART/EQUIPMENT UNDER WARRANTY?', assignee: 'Bramhanand Patel', how: 'MANUAL', status: 'Done', decisionValue: 'No', plannedDateTime: '03/08/2026 17:53:03', actualDateTime: '03/08/2026 15:55:29', timeDelayHours: 0 },
      { stageId: 'STG-EQP-04', stageName: 'SEND PART/EQUIPMENT TO AUTHORIZED SERVICE CENTER', assignee: 'Bramhanand Patel', how: 'SEND PHYSICALLY', status: 'Skipped', notes: 'Skipped: Out of warranty' },
      { stageId: 'STG-EQP-05', stageName: 'GET APPROVAL FOR REPAIR', assignee: 'Bramhanand Patel', how: 'ON PAPER', status: 'Done', plannedDateTime: '06/08/2026 15:55:29', actualDateTime: '03/08/2026 15:55:37', timeDelayHours: 0 },
      { stageId: 'STG-EQP-06', stageName: 'SEND FOR REPAIR', assignee: 'Shyam Rao Sureshe', how: 'PHYSICALLY', status: 'Done', plannedDateTime: '06/08/2026 15:55:37', actualDateTime: '07/08/2026 11:40:53', timeDelayHours: 19 },
      { stageId: 'STG-EQP-07', stageName: 'GET ESTIMATE', assignee: 'Shyam Rao Sureshe', how: 'WHATSAPP/EMAIL/PHYSICALLY', status: 'Done', plannedDateTime: '07/08/2026 13:40:53', actualDateTime: '10/08/2026 18:51:09', timeDelayHours: 77 },
      { stageId: 'STG-EQP-08', stageName: 'GET ESTIMATE APPROVAL', assignee: 'Bramhanand Patel', how: 'WHATSAPP/EMAIL/PHYSICALLY', status: 'Done', plannedDateTime: '11/08/2026 12:30:00', actualDateTime: '10/08/2026 18:51:18', timeDelayHours: 0 },
      { stageId: 'STG-EQP-09', stageName: 'GIVE WORK ORDER', assignee: 'Bramhanand Patel', how: 'WHATSAPP/EMAIL/PHYSICALLY', status: 'Done', plannedDateTime: '18/08/2026 10:30:00', actualDateTime: '17/08/2026 15:07:21', timeDelayHours: 0 },
      { stageId: 'STG-EQP-10', stageName: 'GET REPAIRED', assignee: 'Shyam Rao Sureshe', how: 'PHYSICALLY', status: 'Done', plannedDateTime: '17/08/2026 17:07:21', actualDateTime: '18/08/2026 12:58:22', timeDelayHours: 19 },
      { stageId: 'STG-EQP-11', stageName: 'TRIAL RUN (IF POSSIBLE)', assignee: 'Rajendra / Vivek', how: 'PHYSICALLY/VIDEO', status: 'Done', plannedDateTime: '18/08/2026 13:58:22', actualDateTime: '18/08/2026 12:58:22', timeDelayHours: 0 },
      { stageId: 'STG-EQP-12', stageName: 'IS TRIAL RUN SUCCESSFUL?', assignee: 'Shyam Rao Sureshe', how: 'WHATSAPP/CALL', status: 'Done', decisionValue: 'Yes', plannedDateTime: '18/08/2026 13:58:22', actualDateTime: '18/08/2026 12:58:22', timeDelayHours: 0 },
      { stageId: 'STG-EQP-13', stageName: 'ARE ADDITIONAL CHARGES TO BE INCURRED?', assignee: 'Shyam Rao Sureshe', how: 'WHATSAPP/CALL', status: 'Done', decisionValue: 'No', plannedDateTime: '18/08/2026 13:58:22', actualDateTime: '18/08/2026 12:58:22', timeDelayHours: 0 },
      { stageId: 'STG-EQP-14', stageName: 'GET APPROVAL', assignee: 'Bramhanand Patel', how: 'WHATSAPP/CALL/MANUAL', status: 'Skipped', notes: 'Skipped: No additional charges' },
      { stageId: 'STG-EQP-15', stageName: 'SEND FOR REPAIR', assignee: 'Bramhanand Patel', how: 'PHYSICAL', status: 'Skipped', notes: 'Skipped: No additional charges' },
      { stageId: 'STG-EQP-16', stageName: 'TRIAL RUN', assignee: 'Shyam Rao Sureshe', how: 'WHATSAPP/CALL', status: 'Skipped', notes: 'Skipped: No additional charges' },
      { stageId: 'STG-EQP-17', stageName: 'RECEIVE PART/EQUIPMENT IN STORE', assignee: 'Sumant / Hemant', how: 'PHYSICALLY', status: 'In Progress', plannedDateTime: '18/08/2026 16:58:22', actualDateTime: '18/08/2026 12:58:29' },
      { stageId: 'STG-EQP-18', stageName: 'DEPLOY AT SITE', assignee: 'Sumant / Hemant', how: 'PHYSICALLY', status: 'Pending', plannedDateTime: '19/08/2026 16:58:29' }
    ]
  },
  {
    id: 'fms-inst-brk-001',
    flowId: 'FLOW-BRK-DG82-01',
    flowType: 'BREAKDOWN_REPORTING',
    indentNo: 'BRK-CJGS18014779',
    machineName: 'Dg-82.5',
    machineIdNo: 'CJGS18014779',
    machineMakeModel: 'JSPF-82.5B',
    siteName: 'BIJETALA',
    attendingMechanic: 'Chotu',
    mechanicMobileNo: '8581041010',
    indentDate: '28/07/2026',
    priority: 'Urgent',
    currentStageId: 'STG-BRK-13',
    currentStageIndex: 12,
    totalStages: 14,
    status: 'In Progress',
    createdAt: '28/07/2026 15:22:47',
    updatedAt: '30/07/2026 12:26:48',
    totalDelayHours: 0,
    remarks: 'DG breakdown at Bijetala site. Repaired and undergoing 2-hour trial run.',
    stages: [
      { stageId: 'STG-BRK-01', stageName: 'BREAKDOWN PRELIMINARY REPORT', assignee: 'Site Mechanic', how: 'WHATSAPP/CALL', status: 'Done', plannedDateTime: '28/07/2026 16:22:47', actualDateTime: '28/07/2026 15:58:44', timeDelayHours: 0 },
      { stageId: 'STG-BRK-02', stageName: 'IS SERVICE ENGINEER REQUIRED?', assignee: 'Site Mechanic', how: 'WHATSAPP/CALL', status: 'Done', decisionValue: 'No', plannedDateTime: '28/07/2026 16:58:44', actualDateTime: '28/07/2026 15:59:00', timeDelayHours: 0 },
      { stageId: 'STG-BRK-03', stageName: 'CALL SERVICE ENGINEER', assignee: 'J Chakraworti', how: 'WHATSAPP/CALL', status: 'Skipped', notes: 'Skipped: Service engineer visit not required' },
      { stageId: 'STG-BRK-04', stageName: 'PREPARE DETAILED DEFECT ANALYSIS REPORT', assignee: 'Service Engineer / Mechanic', how: 'WHATSAPP/CALL', status: 'Done', plannedDateTime: '30/07/2026 11:59:00', actualDateTime: '30/07/2026 10:21:21', timeDelayHours: 0 },
      { stageId: 'STG-BRK-05', stageName: 'CAN DEFECTIVE PART/MACHINE/PLANT/VEHICLE BE REPAIRED AT SITE?', assignee: 'J Chakraworti / Mechanic', how: 'WHATSAPP/CALL', status: 'Done', decisionValue: 'Yes', plannedDateTime: '30/07/2026 11:21:21', actualDateTime: '30/07/2026 10:21:55', timeDelayHours: 0 },
      { stageId: 'STG-BRK-06', stageName: 'SEND PARTS INDENT ALONG WITH SAMPLE (IF REQUIRED)', assignee: 'Sumant Singh Chauhan / Pranab Chakraborty', how: 'WHATSAPP/CALL', status: 'Done', plannedDateTime: '30/07/2026 11:21:55', actualDateTime: '30/07/2026 10:23:08', timeDelayHours: 0 },
      { stageId: 'STG-BRK-07', stageName: 'RECEIVE PARTS', assignee: 'Sumant Singh Chauhan / Pranab Chakraborty', how: 'WHATSAPP/CALL', status: 'Done', plannedDateTime: '03/08/2026 10:23:08', actualDateTime: '30/07/2026 10:23:47', timeDelayHours: 0 },
      { stageId: 'STG-BRK-08', stageName: 'REPAIR MACHINE', assignee: 'Site Mechanic', how: 'WHATSAPP/CALL', status: 'Done', plannedDateTime: '31/07/2026 14:23:47', actualDateTime: '30/07/2026 10:23:57', timeDelayHours: 0 },
      { stageId: 'STG-BRK-09', stageName: 'SEND MACHINE/PLANT/VEHICLE DEFECTIVE PART FOR REPAIR', assignee: 'J Chakraworti', how: 'WHATSAPP/CALL', status: 'Skipped', notes: 'Skipped: Repaired at site' },
      { stageId: 'STG-BRK-10', stageName: 'GET REPAIR ESTIMATE', assignee: 'J Chakraworti', how: 'WHATSAPP/CALL', status: 'Skipped', notes: 'Skipped: Repaired at site' },
      { stageId: 'STG-BRK-11', stageName: 'GET ESTIMATE APPROVAL', assignee: 'J Chakraworti', how: 'WHATSAPP/CALL', status: 'Skipped', notes: 'Skipped: Repaired at site' },
      { stageId: 'STG-BRK-12', stageName: 'GET MACHINE REPAIR', assignee: 'J Chakraworti', how: 'WHATSAPP/CALL', status: 'Skipped', notes: 'Skipped: Repaired at site' },
      { stageId: 'STG-BRK-13', stageName: 'TRIAL RUN FOR 2 HOURS', assignee: 'Driver / Operator / Mechanic', how: 'WHATSAPP/CALL', status: 'In Progress', plannedDateTime: '30/07/2026 12:23:57', actualDateTime: '30/07/2026 10:26:41' },
      { stageId: 'STG-BRK-14', stageName: 'DEPLOY AT SITE', assignee: 'Driver / Operator / Mechanic', how: 'WHATSAPP/CALL', status: 'Pending', plannedDateTime: '30/07/2026 12:26:41' }
    ]
  },
  {
    id: 'fms-inst-hr-001',
    flowId: 'FLOW-HR-ATT-SILA-01',
    flowType: 'HR_ATTENDANCE_PAYMENT',
    indentNo: 'ATT-SILA-260715',
    siteName: 'SILADEHI',
    totalLabourPresent: 48,
    totalOtHours: 14,
    attendanceDate: '15/07/2026',
    indentDate: '15/07/2026',
    priority: 'Urgent',
    currentStageId: 'STG-HR-06',
    currentStageIndex: 5,
    totalStages: 11,
    status: 'In Progress',
    createdAt: '15/07/2026 08:30:00',
    updatedAt: '15/07/2026 14:15:00',
    totalDelayHours: 0,
    remarks: 'Daily labour attendance and OT verification for Siladehi civil works gang.',
    stages: [
      {
        stageId: 'STG-HR-01',
        stageName: 'COLLECT ATTENDANCE OF LABOUR',
        assignee: 'Site Incharge',
        how: 'WHATSAPP/CALL',
        status: 'Done',
        plannedDateTime: '15/07/2026 09:00:00',
        actualDateTime: '15/07/2026 08:45:00',
        timeDelayHours: 0,
        doerName: 'Site Incharge'
      },
      {
        stageId: 'STG-HR-02',
        stageName: 'CHECK ATTENDANCE OF LABOUR FROM PHOTO AND SHEET',
        assignee: 'Garima Pal',
        how: 'WHATSAPP',
        status: 'Done',
        plannedDateTime: '15/07/2026 10:00:00',
        actualDateTime: '15/07/2026 09:40:00',
        timeDelayHours: 0,
        doerName: 'Garima Pal'
      },
      {
        stageId: 'STG-HR-03',
        stageName: 'CHECK FOR OT IF ANY ?',
        assignee: 'Garima Pal',
        how: 'WHATSAPP',
        status: 'Done',
        plannedDateTime: '15/07/2026 11:00:00',
        actualDateTime: '15/07/2026 10:30:00',
        decisionValue: 'Yes',
        timeDelayHours: 0,
        doerName: 'Garima Pal'
      },
      {
        stageId: 'STG-HR-04',
        stageName: 'PREPARE OT SHEET',
        assignee: 'Garima Pal',
        how: 'EXCEL',
        status: 'Done',
        plannedDateTime: '15/07/2026 12:00:00',
        actualDateTime: '15/07/2026 11:50:00',
        timeDelayHours: 0,
        doerName: 'Garima Pal'
      },
      {
        stageId: 'STG-HR-05',
        stageName: 'GET APPROVAL OT SHEET',
        assignee: 'Garima Pal',
        how: 'MANUAL SHEET/PHYSICAL',
        status: 'Done',
        plannedDateTime: '15/07/2026 14:00:00',
        actualDateTime: '15/07/2026 13:45:00',
        timeDelayHours: 0,
        doerName: 'Garima Pal'
      },
      {
        stageId: 'STG-HR-06',
        stageName: 'PREPARE ATTENDANCE & PAYMENT SHEET',
        assignee: 'Garima Pal',
        how: 'EXCEL',
        status: 'In Progress',
        plannedDateTime: '15/07/2026 15:00:00'
      },
      {
        stageId: 'STG-HR-07',
        stageName: 'CHECK ATTENDANCE AND PAYMENT SHEET',
        assignee: 'Mamta',
        how: 'MANUAL SHEET/WHATSAPP/PHYSICAL',
        status: 'Pending',
        plannedDateTime: '15/07/2026 16:00:00'
      },
      {
        stageId: 'STG-HR-08',
        stageName: 'CHECK DPR SHEET',
        assignee: 'Nandita / Khilesh',
        how: 'MANUAL SHEET/WHATSAPP/PHYSICAL',
        status: 'Pending',
        plannedDateTime: '15/07/2026 17:00:00'
      },
      {
        stageId: 'STG-HR-09',
        stageName: 'GET APPROVAL PAYMENT AND ATTENDANCE SHEET FROM PM',
        assignee: 'Garima Pal',
        how: 'MANUAL SHEET/PHYSICAL',
        status: 'Pending',
        plannedDateTime: '15/07/2026 18:00:00'
      },
      {
        stageId: 'STG-HR-10',
        stageName: 'GET APPROVAL FROM MD',
        assignee: 'Garima Pal',
        how: 'MANUAL SHEET/PHYSICAL',
        status: 'Pending',
        plannedDateTime: '15/07/2026 19:00:00'
      },
      {
        stageId: 'STG-HR-11',
        stageName: 'MAKE LABOUR PAYMENT',
        assignee: 'Garima Pal',
        how: 'MANUAL SHEET/PHYSICAL',
        status: 'Pending',
        plannedDateTime: '15/07/2026 20:00:00'
      }
    ]
  },
  {
    id: 'fms-inst-hr-002',
    flowId: 'FLOW-HR-ATT-BIJE-02',
    flowType: 'HR_ATTENDANCE_PAYMENT',
    indentNo: 'ATT-BIJE-260715',
    siteName: 'BIJETALA',
    totalLabourPresent: 32,
    totalOtHours: 0,
    attendanceDate: '15/07/2026',
    indentDate: '15/07/2026',
    priority: 'Normal',
    currentStageId: 'STG-HR-03',
    currentStageIndex: 2,
    totalStages: 11,
    status: 'In Progress',
    createdAt: '15/07/2026 09:00:00',
    updatedAt: '15/07/2026 10:10:00',
    totalDelayHours: 0,
    remarks: 'Bijetala plant & fabrication labour daily muster roll.',
    stages: [
      {
        stageId: 'STG-HR-01',
        stageName: 'COLLECT ATTENDANCE OF LABOUR',
        assignee: 'Site Incharge',
        how: 'WHATSAPP/CALL',
        status: 'Done',
        plannedDateTime: '15/07/2026 09:30:00',
        actualDateTime: '15/07/2026 09:15:00',
        timeDelayHours: 0,
        doerName: 'Site Incharge'
      },
      {
        stageId: 'STG-HR-02',
        stageName: 'CHECK ATTENDANCE OF LABOUR FROM PHOTO AND SHEET',
        assignee: 'Garima Pal',
        how: 'WHATSAPP',
        status: 'Done',
        plannedDateTime: '15/07/2026 10:30:00',
        actualDateTime: '15/07/2026 10:10:00',
        timeDelayHours: 0,
        doerName: 'Garima Pal'
      },
      {
        stageId: 'STG-HR-03',
        stageName: 'CHECK FOR OT IF ANY ?',
        assignee: 'Garima Pal',
        how: 'WHATSAPP',
        status: 'In Progress',
        plannedDateTime: '15/07/2026 11:30:00'
      },
      {
        stageId: 'STG-HR-04',
        stageName: 'PREPARE OT SHEET',
        assignee: 'Garima Pal',
        how: 'EXCEL',
        status: 'Pending',
        plannedDateTime: '15/07/2026 12:30:00'
      },
      {
        stageId: 'STG-HR-05',
        stageName: 'GET APPROVAL OT SHEET',
        assignee: 'Garima Pal',
        how: 'MANUAL SHEET/PHYSICAL',
        status: 'Pending',
        plannedDateTime: '15/07/2026 14:30:00'
      },
      {
        stageId: 'STG-HR-06',
        stageName: 'PREPARE ATTENDANCE & PAYMENT SHEET',
        assignee: 'Garima Pal',
        how: 'EXCEL',
        status: 'Pending',
        plannedDateTime: '15/07/2026 15:30:00'
      },
      {
        stageId: 'STG-HR-07',
        stageName: 'CHECK ATTENDANCE AND PAYMENT SHEET',
        assignee: 'Mamta',
        how: 'MANUAL SHEET/WHATSAPP/PHYSICAL',
        status: 'Pending',
        plannedDateTime: '15/07/2026 16:30:00'
      },
      {
        stageId: 'STG-HR-08',
        stageName: 'CHECK DPR SHEET',
        assignee: 'Nandita / Khilesh',
        how: 'MANUAL SHEET/WHATSAPP/PHYSICAL',
        status: 'Pending',
        plannedDateTime: '15/07/2026 17:30:00'
      },
      {
        stageId: 'STG-HR-09',
        stageName: 'GET APPROVAL PAYMENT AND ATTENDANCE SHEET FROM PM',
        assignee: 'Garima Pal',
        how: 'MANUAL SHEET/PHYSICAL',
        status: 'Pending',
        plannedDateTime: '15/07/2026 18:30:00'
      },
      {
        stageId: 'STG-HR-10',
        stageName: 'GET APPROVAL FROM MD',
        assignee: 'Garima Pal',
        how: 'MANUAL SHEET/PHYSICAL',
        status: 'Pending',
        plannedDateTime: '15/07/2026 19:30:00'
      },
      {
        stageId: 'STG-HR-11',
        stageName: 'MAKE LABOUR PAYMENT',
        assignee: 'Garima Pal',
        how: 'MANUAL SHEET/PHYSICAL',
        status: 'Pending',
        plannedDateTime: '15/07/2026 20:30:00'
      }
    ]
  },
  {
    id: 'fms-inst-inv-449',
    flowId: 'FLOW-INV-260715-006',
    flowType: 'ACCOUNTS_INVOICE_COLLECTION',
    poNumber: 'RAO/PO/260715-006',
    vendorName: 'M/S ULTRA TECH CEMENT - [GEN]',
    poAssignTo: 'MR. BRAMHANAND PATEL',
    indentNo: '449',
    poDate: '15/07/2026',
    siteName: 'BIJETALA',
    priority: 'Normal',
    currentStageId: 'STG-INV-06',
    currentStageIndex: 5,
    totalStages: 7,
    status: 'In Progress',
    createdAt: '15/07/2026 17:39:21',
    updatedAt: '20/07/2026 10:28:47',
    totalDelayHours: 40.81,
    remarks: 'Cement consignment invoice verification and ERP processing.',
    stages: [
      {
        stageId: 'STG-INV-01',
        stageName: 'RECEIVE INVOICE',
        assignee: 'Byamkesh Kaiwartya / Accounts',
        how: 'WHATSAPP/EMAIL/PHYSICAL',
        status: 'Done',
        plannedDateTime: '18/07/2026 17:39:21',
        actualDateTime: '20/07/2026 10:28:04',
        timeDelayHours: 40.81,
        doerName: 'Byamkesh Kaiwartya'
      },
      {
        stageId: 'STG-INV-02',
        stageName: 'CHECK INVOICE DETAILS & CALCULATION',
        assignee: 'Byamkesh Kaiwartya',
        how: 'INVOICE PHYSICALLY',
        status: 'Done',
        plannedDateTime: '20/07/2026 12:30:00',
        actualDateTime: '20/07/2026 10:28:11',
        timeDelayHours: 0,
        doerName: 'Byamkesh Kaiwartya'
      },
      {
        stageId: 'STG-INV-03',
        stageName: 'IS INVOICE ACCEPTABLE?',
        assignee: 'Bramhanand Patel',
        how: 'SITE INCHARGE PHYSICALLY',
        status: 'Done',
        plannedDateTime: '20/07/2026 11:30:00',
        actualDateTime: '20/07/2026 10:28:19',
        decisionValue: 'Yes',
        doerName: 'Bramhanand Patel'
      },
      {
        stageId: 'STG-INV-04',
        stageName: 'GET INVOICE RECTIFIED',
        assignee: 'Bramhanand Patel',
        how: 'SITE INCHARGE PHYSICALLY',
        status: 'Skipped',
        notes: 'Skipped: Invoice verified acceptable without rectification'
      },
      {
        stageId: 'STG-INV-05',
        stageName: 'GET INVOICE APPROVAL',
        assignee: 'Khushboo Sahu (EA)',
        how: 'PHYSICAL COPY',
        status: 'Done',
        plannedDateTime: '20/07/2026 12:30:00',
        actualDateTime: '20/07/2026 10:28:47',
        timeDelayHours: 0,
        doerName: 'Khushboo Sahu'
      },
      {
        stageId: 'STG-INV-06',
        stageName: 'UPLOAD/APPROVE IN ERP',
        assignee: 'Byamkesh Kaiwartya',
        how: 'ONLINE ERP',
        status: 'In Progress',
        plannedDateTime: '20/07/2026 14:30:00'
      },
      {
        stageId: 'STG-INV-07',
        stageName: 'RECEIVE ORIGINAL INVOICE',
        assignee: 'Byamkesh Kaiwartya',
        how: 'PHYSICAL COPY',
        status: 'Pending',
        plannedDateTime: '23/07/2026 14:30:00'
      }
    ]
  },
  {
    id: 'fms-inst-ssd-654',
    flowId: 'FLOW-SSD-654',
    flowType: 'STORE_TO_SITE_DISPATCH',
    requisitionNumber: '654',
    indentNo: '654',
    indentDate: '04/08/2026',
    siteName: 'SILADEHI',
    priority: 'Urgent',
    currentStageId: 'COMPLETED',
    currentStageIndex: 9,
    totalStages: 9,
    status: 'Completed',
    createdAt: '04/08/2026 09:03:24',
    updatedAt: '05/08/2026 11:00:52',
    totalDelayHours: 0.52,
    remarks: 'Dispatched directly from Store to Siladehi site after stock check availability.',
    stages: [
      {
        stageId: 'STG-SSD-01',
        stageName: 'COLLECT ALL ITEMS AVAILABE',
        assignee: 'Sumant (Siladehi)',
        how: 'PHYSICALLY',
        status: 'Done',
        plannedDateTime: '04/08/2026 14:30:00',
        actualDateTime: '04/08/2026 15:01:29',
        timeDelayHours: 0.52,
        doerName: 'Sumant'
      },
      {
        stageId: 'STG-SSD-02',
        stageName: 'ARRANGE VEHICLE FOR DISPATCH',
        assignee: 'Sumant (Siladehi)',
        how: 'PHYSICALLY',
        status: 'Done',
        plannedDateTime: '05/08/2026 13:01:29',
        actualDateTime: '04/08/2026 16:13:07',
        timeDelayHours: 0,
        doerName: 'Sumant'
      },
      {
        stageId: 'STG-SSD-03',
        stageName: 'PREPARE STOCK TRANSFER NOTE/DELIVERY CHALLAN',
        assignee: 'Sumant (Siladehi)',
        how: 'PHYSICALLY',
        status: 'Done',
        plannedDateTime: '04/08/2026 18:13:07',
        actualDateTime: '04/08/2026 16:13:18',
        timeDelayHours: 0,
        doerName: 'Sumant'
      },
      {
        stageId: 'STG-SSD-04',
        stageName: 'IS E-WAY REQUIRED?',
        assignee: 'Sumant (Siladehi)',
        how: 'WHATSAPP/CALL',
        status: 'Done',
        plannedDateTime: '04/08/2026 17:13:18',
        actualDateTime: '04/08/2026 16:13:33',
        decisionValue: 'No',
        doerName: 'Sumant'
      },
      {
        stageId: 'STG-SSD-05',
        stageName: 'SEND STOCK TRANSFER NOTE/DELIVERY CHALLAN FOR E-WAY BILL',
        assignee: 'Sumant (Siladehi)',
        how: 'WHATSAPP/EMAIL/PHYSICALLY',
        status: 'Skipped',
        notes: 'Bypassed because E-Way Bill not required'
      },
      {
        stageId: 'STG-SSD-06',
        stageName: 'GET E-WAY BILL',
        assignee: 'Sumant (Siladehi)',
        how: 'WHATSAPP/EMAIL/PHYSICALLY',
        status: 'Skipped',
        notes: 'Bypassed because E-Way Bill not required'
      },
      {
        stageId: 'STG-SSD-07',
        stageName: 'LOAD MATERIAL TO BE DISPATCHED',
        assignee: 'Sumant (Siladehi)',
        how: 'PHYSICALLY',
        status: 'Done',
        plannedDateTime: '05/08/2026 12:13:33',
        actualDateTime: '05/08/2026 10:56:13',
        timeDelayHours: 0,
        doerName: 'Sumant'
      },
      {
        stageId: 'STG-SSD-08',
        stageName: 'DISPATCH MATERIAL WITH ALL DOCUMENTS',
        assignee: 'Sumant (Siladehi)',
        how: 'PHYSICALLY',
        status: 'Done',
        plannedDateTime: '05/08/2026 14:56:13',
        actualDateTime: '05/08/2026 10:56:24',
        timeDelayHours: 0,
        doerName: 'Sumant'
      },
      {
        stageId: 'STG-SSD-09',
        stageName: 'GET RECEIVING OF MATERIAL',
        assignee: 'Rajnikant Behera / Purchaser',
        how: 'WHATSAPP/EMAIL/PHYSICAL COPY',
        formResponseRef: undefined,
        status: 'Done',
        plannedDateTime: '06/08/2026 14:56:24',
        actualDateTime: '05/08/2026 11:00:52',
        timeDelayHours: 0,
        doerName: 'Rajnikant Behera'
      }
    ]
  },
  {
    id: 'fms-inst-ssd-477',
    flowId: 'FLOW-SSD-477',
    flowType: 'STORE_TO_SITE_DISPATCH',
    requisitionNumber: '477',
    indentNo: '477',
    indentDate: '05/10/2026',
    siteName: 'BIJETALA',
    priority: 'Normal',
    currentStageId: 'STG-SSD-02',
    currentStageIndex: 1,
    totalStages: 9,
    status: 'In Progress',
    createdAt: '05/10/2026 09:30:00',
    updatedAt: '05/10/2026 11:30:00',
    totalDelayHours: 0,
    remarks: 'Dispatched following Check Stock confirmation for Bijetala site.',
    stages: [
      {
        stageId: 'STG-SSD-01',
        stageName: 'COLLECT ALL ITEMS AVAILABE',
        assignee: 'Hemant (Bijetala)',
        how: 'PHYSICALLY',
        status: 'Done',
        plannedDateTime: '05/10/2026 13:30:00',
        actualDateTime: '05/10/2026 11:30:00',
        timeDelayHours: 0,
        doerName: 'Hemant'
      },
      {
        stageId: 'STG-SSD-02',
        stageName: 'ARRANGE VEHICLE FOR DISPATCH',
        assignee: 'Hemant (Bijetala)',
        how: 'PHYSICALLY',
        status: 'In Progress',
        plannedDateTime: '05/10/2026 17:30:00'
      },
      {
        stageId: 'STG-SSD-03',
        stageName: 'PREPARE STOCK TRANSFER NOTE/DELIVERY CHALLAN',
        assignee: 'Hemant (Bijetala)',
        how: 'PHYSICALLY',
        status: 'Pending',
        plannedDateTime: '05/10/2026 19:30:00'
      },
      {
        stageId: 'STG-SSD-04',
        stageName: 'IS E-WAY REQUIRED?',
        assignee: 'Hemant (Bijetala)',
        how: 'WHATSAPP/CALL',
        status: 'Pending',
        plannedDateTime: '05/10/2026 20:30:00'
      },
      {
        stageId: 'STG-SSD-05',
        stageName: 'SEND STOCK TRANSFER NOTE/DELIVERY CHALLAN FOR E-WAY BILL',
        assignee: 'Hemant (Bijetala)',
        how: 'WHATSAPP/EMAIL/PHYSICALLY',
        status: 'Pending',
        plannedDateTime: '06/10/2026 10:30:00'
      },
      {
        stageId: 'STG-SSD-06',
        stageName: 'GET E-WAY BILL',
        assignee: 'Hemant (Bijetala)',
        how: 'WHATSAPP/EMAIL/PHYSICALLY',
        status: 'Pending',
        plannedDateTime: '06/10/2026 14:30:00'
      },
      {
        stageId: 'STG-SSD-07',
        stageName: 'LOAD MATERIAL TO BE DISPATCHED',
        assignee: 'Hemant (Bijetala)',
        how: 'PHYSICALLY',
        status: 'Pending',
        plannedDateTime: '06/10/2026 18:30:00'
      },
      {
        stageId: 'STG-SSD-08',
        stageName: 'DISPATCH MATERIAL WITH ALL DOCUMENTS',
        assignee: 'Hemant (Bijetala)',
        how: 'PHYSICALLY',
        status: 'Pending',
        plannedDateTime: '06/10/2026 22:30:00'
      },
      {
        stageId: 'STG-SSD-09',
        stageName: 'GET RECEIVING OF MATERIAL',
        assignee: 'Rajnikant Behera / Purchaser',
        how: 'WHATSAPP/EMAIL/PHYSICAL COPY',
        formResponseRef: undefined,
        status: 'Pending',
        plannedDateTime: '07/10/2026 10:30:00'
      }
    ]
  },
  {
    id: 'fms-inst-rec-102-1',
    flowId: 'FLOW-REC-102-001',
    flowType: 'SITE_RECEIVE',
    requisitionNumber: '102',
    indentNo: '102',
    indentDate: '17/07/2026',
    siteName: 'BIJETALA',
    priority: 'Normal',
    currentStageId: 'COMPLETED',
    currentStageIndex: 10,
    totalStages: 10,
    status: 'Completed',
    createdAt: '04/08/2026 11:12:44',
    updatedAt: '07/08/2026 17:17:44',
    totalDelayHours: 30.1,
    remarks: 'Material received at Bijetala site. Verified by Civil/Mechanical Incharge and logged via Google Form.',
    stages: [
      {
        stageId: 'STG-REC-01',
        stageName: 'RECEIVE MATERIAL',
        assignee: 'Site Store Incharge (Amanat / Bijetala Incharge)',
        how: 'WHATSAPP/EMAIL',
        plannedDateTime: '05/08/2026 15:12:44',
        actualDateTime: '04/08/2026 11:21:04',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-02',
        stageName: 'CHECK MATERIAL WITH PO/DELIVERY CHALLAN/INVOICE/STOCK TRANSFER NOTE',
        assignee: 'Site Store Incharge',
        how: 'PHYSICALLY',
        plannedDateTime: '04/08/2026 15:21:04',
        actualDateTime: '04/08/2026 12:24:04',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-03',
        stageName: 'ARE THERE ANY DISCREPANCY OBSERVED ?',
        assignee: 'Site Store Incharge',
        how: 'WHATSAPP/CALL',
        plannedDateTime: '04/08/2026 13:24:04',
        actualDateTime: '04/08/2026 12:24:24',
        decisionValue: 'No',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-04',
        stageName: 'INFORM CSR STORE & GET IT RECTIFIED',
        assignee: 'Site Store Incharge',
        how: 'WHATSAPP/EMAIL/PHONE',
        status: 'Skipped',
        notes: 'Skipped: No discrepancy observed',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-05',
        stageName: 'IS MATERIAL ACCEPTABLE ?',
        assignee: 'Site Store Incharge',
        how: 'WHATSAPP/CALL',
        plannedDateTime: '04/08/2026 13:24:24',
        actualDateTime: '04/08/2026 12:24:50',
        decisionValue: 'Yes',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-06',
        stageName: 'RETURN MATERIAL TO REPAIRE STORE',
        assignee: 'Site Store Incharge',
        how: 'PHYSICALLY',
        status: 'Skipped',
        notes: 'Skipped: Material accepted in good condition',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-07',
        stageName: 'GET MATERIAL VERIFIED',
        assignee: 'Chakravarti Ji / Pranay Ghosh',
        how: 'WHATSAPP/EMAIL/PHYSICALLY',
        plannedDateTime: '04/08/2026 13:24:50',
        actualDateTime: '04/08/2026 13:09:14',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-08',
        stageName: 'GIVE RECEIVING IN STOCK TRANSFER NOTE/DELIVERY CHALLAN/INVOICE SEND TO RAIPUR STORE',
        assignee: 'Site Store Incharge',
        how: 'WHATSAPP/EMAIL/PHYSICALLY',
        plannedDateTime: '04/08/2026 14:09:14',
        actualDateTime: '04/08/2026 13:09:14',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-09',
        stageName: 'IS MATERIAL INWARD FORM FILLED ?',
        assignee: 'Site DEO',
        how: 'IN-APP MATERIAL LOG',
        plannedDateTime: '04/08/2026 14:09:14',
        actualDateTime: '05/08/2026 18:07:33',
        decisionValue: 'Yes',
        status: 'Done',
        timeDelayHours: 27.97
      },
      {
        stageId: 'STG-REC-10',
        stageName: 'IN-APP MATERIAL INWARD ENTRY',
        assignee: 'Site DEO',
        how: 'IN-APP MATERIAL LOG',
        plannedDateTime: '06/08/2026 11:07:33',
        actualDateTime: '07/08/2026 17:17:44',
        status: 'Done',
        timeDelayHours: 30.17,
        formResponseRef: undefined,
      }
    ]
  },
  {
    id: 'fms-inst-rec-752-1',
    flowId: 'FLOW-REC-752-001',
    flowType: 'SITE_RECEIVE',
    linkedFlowId: 'FLOW-PSD-752-001',
    requisitionNumber: '752',
    indentNo: '752',
    indentDate: '10/07/2026',
    siteName: 'SILADEHI',
    priority: 'Urgent',
    currentStageId: 'STG-REC-09',
    currentStageIndex: 8,
    totalStages: 10,
    status: 'In Progress',
    createdAt: '04/08/2026 12:00:00',
    updatedAt: '04/08/2026 15:30:00',
    totalDelayHours: 0,
    remarks: 'Physical material verified by Site Engineers. Awaiting Site DEO Material Inward Google Form submission.',
    stages: [
      {
        stageId: 'STG-REC-01',
        stageName: 'RECEIVE MATERIAL',
        assignee: 'Site Store Incharge (Amanat / Siladehi Incharge)',
        how: 'WHATSAPP/EMAIL',
        plannedDateTime: '04/08/2026 14:00:00',
        actualDateTime: '04/08/2026 12:30:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-02',
        stageName: 'CHECK MATERIAL WITH PO/DELIVERY CHALLAN/INVOICE/STOCK TRANSFER NOTE',
        assignee: 'Site Store Incharge',
        how: 'PHYSICALLY',
        plannedDateTime: '04/08/2026 16:30:00',
        actualDateTime: '04/08/2026 13:45:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-03',
        stageName: 'ARE THERE ANY DISCREPANCY OBSERVED ?',
        assignee: 'Site Store Incharge',
        how: 'WHATSAPP/CALL',
        plannedDateTime: '04/08/2026 14:45:00',
        actualDateTime: '04/08/2026 14:00:00',
        decisionValue: 'No',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-04',
        stageName: 'INFORM CSR STORE & GET IT RECTIFIED',
        assignee: 'Site Store Incharge',
        how: 'WHATSAPP/EMAIL/PHONE',
        status: 'Skipped',
        notes: 'Skipped: No discrepancy observed',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-05',
        stageName: 'IS MATERIAL ACCEPTABLE ?',
        assignee: 'Site Store Incharge',
        how: 'WHATSAPP/CALL',
        plannedDateTime: '04/08/2026 15:00:00',
        actualDateTime: '04/08/2026 14:30:00',
        decisionValue: 'Yes',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-06',
        stageName: 'RETURN MATERIAL TO REPAIRE STORE',
        assignee: 'Site Store Incharge',
        how: 'PHYSICALLY',
        status: 'Skipped',
        notes: 'Skipped: Consignment verified and acceptable',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-07',
        stageName: 'GET MATERIAL VERIFIED',
        assignee: 'Chakravarti Ji / Pranay Ghosh',
        how: 'WHATSAPP/EMAIL/PHYSICALLY',
        plannedDateTime: '04/08/2026 15:30:00',
        actualDateTime: '04/08/2026 15:15:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-08',
        stageName: 'GIVE RECEIVING IN STOCK TRANSFER NOTE/DELIVERY CHALLAN/INVOICE SEND TO RAIPUR STORE',
        assignee: 'Site Store Incharge',
        how: 'WHATSAPP/EMAIL/PHYSICALLY',
        plannedDateTime: '04/08/2026 16:15:00',
        actualDateTime: '04/08/2026 15:30:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-09',
        stageName: 'IS MATERIAL INWARD FORM FILLED ?',
        assignee: 'Site DEO',
        how: 'IN-APP MATERIAL LOG',
        plannedDateTime: '04/08/2026 16:30:00',
        status: 'In Progress',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-REC-10',
        stageName: 'IN-APP MATERIAL INWARD ENTRY',
        assignee: 'Site DEO',
        how: 'IN-APP MATERIAL LOG',
        formResponseRef: undefined,
        status: 'Pending',
        timeDelayHours: 0
      }
    ]
  },
  {
    id: 'fms-inst-psd-752-1',
    flowId: 'FLOW-PSD-752-001',
    flowType: 'PURCHASE_TO_STORE_DISPATCH',
    linkedFlowId: 'FLOW-IND-752',
    requisitionNumber: '752',
    indentNo: '752',
    indentDate: '10/07/2026',
    siteName: 'SILADEHI',
    priority: 'Urgent',
    currentStageId: 'COMPLETED',
    currentStageIndex: 10,
    totalStages: 10,
    status: 'Completed',
    createdAt: '07/08/2026 12:12:52',
    updatedAt: '04/08/2026 11:33:50',
    totalDelayHours: 0,
    remarks: 'Dispatched to Siladehi site with all documents. Receiving logged via Google Form.',
    stages: [
      {
        stageId: 'STG-PSD-01',
        stageName: 'RECEIVE PURCHASED MATERIAL',
        assignee: 'Bramhanand Patel',
        how: 'PHYSICALLY',
        plannedDateTime: '07/08/2026 14:12:52',
        actualDateTime: '03/08/2026 12:08:51',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-02',
        stageName: 'CHECK & VERIFY MATERIAL PURCHASED WITH PO/STOCK TRANSFER NOTE/INVOICE',
        assignee: 'Shyam Rao Sureshe',
        how: 'PHYSICALLY',
        plannedDateTime: '03/08/2026 14:08:51',
        actualDateTime: '03/08/2026 12:09:27',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-03',
        stageName: 'PREPARE STOCK TRANSFER NOTE/DELIVERY CHALLAN',
        assignee: 'Shyam Rao Sureshe',
        how: 'PHYSICAL COPY',
        plannedDateTime: '03/08/2026 18:09:27',
        actualDateTime: '03/08/2026 12:09:48',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-04',
        stageName: 'ARRANGE VEHICLE FOR DISPATCH',
        assignee: 'Bramhanand Patel',
        how: 'PHYSICAL',
        plannedDateTime: '03/08/2026 13:09:48',
        actualDateTime: '03/08/2026 13:06:38',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-05',
        stageName: 'IS E-WAY BILL REQUIRED?',
        assignee: 'Bramhanand Patel',
        how: 'WHATSAPP/CALL',
        plannedDateTime: '03/08/2026 17:06:38',
        actualDateTime: '03/08/2026 13:06:38',
        decisionValue: 'No',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-06',
        stageName: 'SEND DELIVERY CHALLAN/STOCK TRANSFER NOTE FOR E-WAY BILL',
        assignee: 'Shyam Rao Sureshe',
        how: 'WHATSAPP/EMAIL/PHYYSICAL',
        status: 'Skipped',
        notes: 'Skipped: E-Way Bill not required for this consignment',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-07',
        stageName: 'GET E-WAY BILL',
        assignee: 'Bramhanand Patel',
        how: 'WHATSAPP/EMAIL/PHYSICAL',
        status: 'Skipped',
        notes: 'Skipped: E-Way Bill not required for this consignment',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-08',
        stageName: 'LOAD MATERIAL FOR DISPATCH',
        assignee: 'Bramhanand Patel',
        how: 'PHYSICALLY',
        plannedDateTime: '03/08/2026 17:06:38',
        actualDateTime: '03/08/2026 13:07:23',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-09',
        stageName: 'DISPATCH ALL MATERIAL WITH ALL DOCUMENTS',
        assignee: 'Bramhanand Patel',
        how: 'PHYSICALLY',
        plannedDateTime: '03/08/2026 17:07:23',
        actualDateTime: '03/08/2026 13:07:42',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-10',
        stageName: 'GET RECEIVING',
        assignee: 'Rajendra / Vivek / Rajnikant',
        how: 'WHATSAPP/EMAIL/PHYSICALLY',
        plannedDateTime: '04/08/2026 17:07:42',
        actualDateTime: '04/08/2026 11:33:50',
        status: 'Done',
        timeDelayHours: 0,
        doerName: 'Rajendra',
        formResponseRef: undefined,
      }
    ]
  },
  {
    id: 'fms-inst-psd-22-1',
    flowId: 'FLOW-PSD-22-001',
    flowType: 'PURCHASE_TO_STORE_DISPATCH',
    linkedFlowId: 'FLOW-IND-22',
    requisitionNumber: '22',
    indentNo: '22',
    indentDate: '12/07/2026',
    siteName: 'BIJETALA',
    priority: 'Normal',
    currentStageId: 'STG-PSD-05',
    currentStageIndex: 4,
    totalStages: 10,
    status: 'In Progress',
    createdAt: '12/07/2026 09:30:00',
    updatedAt: '12/07/2026 14:15:00',
    totalDelayHours: 0,
    remarks: 'Awaiting E-Way Bill decision by Store Manager Bramhanand Patel',
    stages: [
      {
        stageId: 'STG-PSD-01',
        stageName: 'RECEIVE PURCHASED MATERIAL',
        assignee: 'Bramhanand Patel',
        how: 'PHYSICALLY',
        plannedDateTime: '12/07/2026 11:30:00',
        actualDateTime: '12/07/2026 10:15:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-02',
        stageName: 'CHECK & VERIFY MATERIAL PURCHASED WITH PO/STOCK TRANSFER NOTE/INVOICE',
        assignee: 'Shyam Rao Sureshe',
        how: 'PHYSICALLY',
        plannedDateTime: '12/07/2026 12:15:00',
        actualDateTime: '12/07/2026 11:45:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-03',
        stageName: 'PREPARE STOCK TRANSFER NOTE/DELIVERY CHALLAN',
        assignee: 'Shyam Rao Sureshe',
        how: 'PHYSICAL COPY',
        plannedDateTime: '12/07/2026 13:45:00',
        actualDateTime: '12/07/2026 12:30:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-04',
        stageName: 'ARRANGE VEHICLE FOR DISPATCH',
        assignee: 'Bramhanand Patel',
        how: 'PHYSICAL',
        plannedDateTime: '12/07/2026 18:30:00',
        actualDateTime: '12/07/2026 14:15:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-05',
        stageName: 'IS E-WAY BILL REQUIRED?',
        assignee: 'Bramhanand Patel',
        how: 'WHATSAPP/CALL',
        plannedDateTime: '12/07/2026 15:15:00',
        status: 'In Progress',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-06',
        stageName: 'SEND DELIVERY CHALLAN/STOCK TRANSFER NOTE FOR E-WAY BILL',
        assignee: 'Shyam Rao Sureshe',
        how: 'WHATSAPP/EMAIL/PHYYSICAL',
        status: 'Pending',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-07',
        stageName: 'GET E-WAY BILL',
        assignee: 'Bramhanand Patel',
        how: 'WHATSAPP/EMAIL/PHYSICAL',
        status: 'Pending',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-08',
        stageName: 'LOAD MATERIAL FOR DISPATCH',
        assignee: 'Bramhanand Patel',
        how: 'PHYSICALLY',
        status: 'Pending',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-09',
        stageName: 'DISPATCH ALL MATERIAL WITH ALL DOCUMENTS',
        assignee: 'Bramhanand Patel',
        how: 'PHYSICALLY',
        status: 'Pending',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PSD-10',
        stageName: 'GET RECEIVING',
        assignee: 'Rajendra / Vivek / Rajnikant',
        how: 'WHATSAPP/EMAIL/PHYSICALLY',
        formResponseRef: undefined,
        status: 'Pending',
        timeDelayHours: 0
      }
    ]
  },
  {
    id: 'fms-inst-disp-752-1',
    flowId: 'FLOW-DISP-752-001',
    flowType: 'PAYMENT_TO_DISPATCH',
    linkedFlowId: 'FLOW-IND-752',
    poNumber: 'RAO/PO/260722-002',
    vendorName: 'M/S ASHARAM ELECTRICALS',
    poAssignTo: 'BRAHMANAND SIR',
    indentNo: '752',
    indentDate: '22/07/2026',
    poDate: '22/07/2026',
    siteName: 'SILADEHI',
    priority: 'Urgent',
    currentStageId: 'COMPLETED',
    currentStageIndex: 7,
    totalStages: 7,
    status: 'Completed',
    createdAt: '22/07/2026 18:27:48',
    updatedAt: '16/06/2026 15:41:28',
    totalDelayHours: 0,
    remarks: 'Dispatched to Siladehi site via Purchase to Store to Dispatch Form',
    stages: [
      {
        stageId: 'STG-DISP-01',
        stageName: 'GET MATERIAL',
        assignee: 'Brahmanand Patel / Rajendra',
        how: 'WHATSAPP/CALL/PHYSICAL VERIFICATION',
        plannedDateTime: '23/07/2026 14:27:48',
        actualDateTime: '16/06/2026 15:40:11',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-02',
        stageName: 'CHECK & VERIFY MATERIAL WITH PO',
        assignee: 'Shyam Rao Sureshe',
        how: 'WHATSAPP/CALL/PHYSICAL VERIFICATION',
        plannedDateTime: '17/06/2026 10:40:11',
        actualDateTime: '16/06/2026 15:41:13',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-03',
        stageName: 'IS MATERIAL ACCEPTABLE ?',
        assignee: 'Shyam Rao Sureshe',
        how: 'WHATSAPP / CALL',
        plannedDateTime: '16/06/2026 16:41:13',
        actualDateTime: '16/06/2026 15:41:19',
        decisionValue: 'Yes',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-04',
        stageName: 'RETURN / REPLACE MATERIAL',
        assignee: 'Rajendra / Vivek / Rajnikant',
        how: 'PHYSICALLY',
        status: 'Skipped',
        notes: 'Skipped: Material accepted as per PO specifications',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-05',
        stageName: 'IS MATERIAL REPLACED ?',
        assignee: 'Rajendra / Vivek / Rajnikant',
        how: 'WHATSAPP / CALL',
        status: 'Skipped',
        notes: 'Skipped: Material accepted as per PO specifications',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-06',
        stageName: 'GET REFUND / CREDIT NOTES',
        assignee: 'Rajendra / Vivek / Rajnikant',
        how: 'WHATSAPP/ EMAIL / PHYSICAL COPY',
        status: 'Skipped',
        notes: 'Skipped: Material accepted as per PO specifications',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-07',
        stageName: 'DISPATCH MATERIAL',
        assignee: 'Rajendra / Rajnikant / Vivek',
        how: 'IN-APP DISPATCH ENTRY',
        plannedDateTime: '20/06/2026 11:41:19',
        actualDateTime: '16/06/2026 15:41:28',
        status: 'Done',
        timeDelayHours: 0,
        formResponseRef: undefined,
      }
    ]
  },
  {
    id: 'fms-inst-disp-752-2',
    flowId: 'FLOW-DISP-752-002',
    flowType: 'PAYMENT_TO_DISPATCH',
    linkedFlowId: 'FLOW-IND-752',
    poNumber: 'RAO/PO/260715-008',
    vendorName: 'M/S R D SONS',
    poAssignTo: 'MR. VIVEK',
    indentNo: '752',
    indentDate: '17/07/2026',
    poDate: '17/07/2026',
    siteName: 'SILADEHI',
    priority: 'Normal',
    currentStageId: 'COMPLETED',
    currentStageIndex: 7,
    totalStages: 7,
    status: 'Completed',
    createdAt: '24/07/2026 17:22:32',
    updatedAt: '16/06/2026 15:41:51',
    totalDelayHours: 0,
    remarks: 'Dispatched to Siladehi site via Purchase to Store to Dispatch Form',
    stages: [
      {
        stageId: 'STG-DISP-01',
        stageName: 'GET MATERIAL',
        assignee: 'Vivek / Rajnikant',
        how: 'WHATSAPP/CALL/PHYSICAL VERIFICATION',
        plannedDateTime: '25/07/2026 13:22:32',
        actualDateTime: '16/06/2026 15:41:34',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-02',
        stageName: 'CHECK & VERIFY MATERIAL WITH PO',
        assignee: 'Shyam Rao Sureshe',
        how: 'WHATSAPP/CALL/PHYSICAL VERIFICATION',
        plannedDateTime: '17/06/2026 10:41:34',
        actualDateTime: '16/06/2026 15:41:39',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-03',
        stageName: 'IS MATERIAL ACCEPTABLE ?',
        assignee: 'Shyam Rao Sureshe',
        how: 'WHATSAPP / CALL',
        plannedDateTime: '16/06/2026 16:41:39',
        actualDateTime: '16/06/2026 15:41:44',
        decisionValue: 'Yes',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-04',
        stageName: 'RETURN / REPLACE MATERIAL',
        assignee: 'Rajendra / Vivek / Rajnikant',
        how: 'PHYSICALLY',
        status: 'Skipped',
        notes: 'Skipped: Material accepted as per PO specifications',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-05',
        stageName: 'IS MATERIAL REPLACED ?',
        assignee: 'Rajendra / Vivek / Rajnikant',
        how: 'WHATSAPP / CALL',
        status: 'Skipped',
        notes: 'Skipped: Material accepted as per PO specifications',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-06',
        stageName: 'GET REFUND / CREDIT NOTES',
        assignee: 'Rajendra / Vivek / Rajnikant',
        how: 'WHATSAPP/ EMAIL / PHYSICAL COPY',
        status: 'Skipped',
        notes: 'Skipped: Material accepted as per PO specifications',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-07',
        stageName: 'DISPATCH MATERIAL',
        assignee: 'Rajendra / Rajnikant / Vivek',
        how: 'IN-APP DISPATCH ENTRY',
        plannedDateTime: '20/06/2026 11:41:44',
        actualDateTime: '16/06/2026 15:41:51',
        status: 'Done',
        timeDelayHours: 0,
        formResponseRef: undefined,
      }
    ]
  },
  {
    id: 'fms-inst-disp-752-3',
    flowId: 'FLOW-DISP-752-003',
    flowType: 'PAYMENT_TO_DISPATCH',
    linkedFlowId: 'FLOW-IND-752',
    poNumber: 'RAO/MPO/17072026/14',
    vendorName: 'MEHADIA STEEL TRADERS',
    poAssignTo: 'MR. VIVEK JI',
    indentNo: '752',
    indentDate: '17/07/2026',
    poDate: '17/07/2026',
    siteName: 'SILADEHI',
    priority: 'Normal',
    currentStageId: 'COMPLETED',
    currentStageIndex: 7,
    totalStages: 7,
    status: 'Completed',
    createdAt: '31/07/2026 17:50:46',
    updatedAt: '25/06/2026 11:30:26',
    totalDelayHours: 0,
    remarks: 'Dispatched to Siladehi site via Purchase to Store to Dispatch Form',
    stages: [
      {
        stageId: 'STG-DISP-01',
        stageName: 'GET MATERIAL',
        assignee: 'Vivek / Rajnikant',
        how: 'WHATSAPP/CALL/PHYSICAL VERIFICATION',
        plannedDateTime: '01/08/2026 13:50:46',
        actualDateTime: '25/06/2026 11:29:20',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-02',
        stageName: 'CHECK & VERIFY MATERIAL WITH PO',
        assignee: 'Shyam Rao Sureshe',
        how: 'WHATSAPP/CALL/PHYSICAL VERIFICATION',
        plannedDateTime: '25/06/2026 14:29:20',
        actualDateTime: '25/06/2026 11:29:57',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-03',
        stageName: 'IS MATERIAL ACCEPTABLE ?',
        assignee: 'Shyam Rao Sureshe',
        how: 'WHATSAPP / CALL',
        plannedDateTime: '25/06/2026 12:29:57',
        actualDateTime: '25/06/2026 11:30:11',
        decisionValue: 'Yes',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-04',
        stageName: 'RETURN / REPLACE MATERIAL',
        assignee: 'Rajendra / Vivek / Rajnikant',
        how: 'PHYSICALLY',
        status: 'Skipped',
        notes: 'Skipped: Material accepted as per PO specifications',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-05',
        stageName: 'IS MATERIAL REPLACED ?',
        assignee: 'Rajendra / Vivek / Rajnikant',
        how: 'WHATSAPP / CALL',
        status: 'Skipped',
        notes: 'Skipped: Material accepted as per PO specifications',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-06',
        stageName: 'GET REFUND / CREDIT NOTES',
        assignee: 'Rajendra / Vivek / Rajnikant',
        how: 'WHATSAPP/ EMAIL / PHYSICAL COPY',
        status: 'Skipped',
        notes: 'Skipped: Material accepted as per PO specifications',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-DISP-07',
        stageName: 'DISPATCH MATERIAL',
        assignee: 'Rajendra / Rajnikant / Vivek',
        how: 'IN-APP DISPATCH ENTRY',
        plannedDateTime: '29/06/2026 15:30:11',
        actualDateTime: '25/06/2026 11:30:26',
        status: 'Done',
        timeDelayHours: 0,
        formResponseRef: undefined,
      }
    ]
  },
  {
    id: 'fms-inst-stk-476',
    flowId: 'FLOW-STK-476',
    flowType: 'CHECK_STOCK',
    requisitionNumber: 'Indent no-476',
    indentNo: '476',
    indentDate: '07/08/2026',
    siteName: 'BIJETALA',
    priority: 'Urgent',
    currentStageId: 'STG-STK-02',
    currentStageIndex: 1,
    totalStages: 2,
    status: 'Completed',
    createdAt: '07/08/2026 16:55:36',
    updatedAt: '08/08/2026 10:58:51',
    totalDelayHours: 0,
    remarks: 'Requisition completed with partial stock dispatch and balance PO indent',
    stages: [
      {
        stageId: 'STG-STK-01',
        stageName: 'RECEIVE MATERIAL REQUISITION',
        assignee: 'Amanat Bharadwaj',
        how: 'IN-APP FORM / REQUISITION SLIP',
        plannedDateTime: '07/08/2026 17:55:36',
        actualDateTime: '07/08/2026 16:55:36',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-STK-02',
        stageName: 'CHECK STOCK & SPLIT',
        assignee: 'Amanat Bharadwaj',
        how: 'WHATSAPP/EMAIL/PHYSICALLY',
        plannedDateTime: '08/08/2026 12:55:36',
        actualDateTime: '07/08/2026 17:00:33',
        status: 'Done',
        timeDelayHours: 0,
        notes: 'Stock verified and triaged into Store Dispatch and Purchase sub-workflows.'
      }
    ]
  },
  {
    id: 'fms-inst-stk-752',
    flowId: 'FLOW-STK-752',
    flowType: 'CHECK_STOCK',
    requisitionNumber: 'REQ-SILA-752',
    indentNo: '752',
    indentDate: '10/07/2026',
    siteName: 'SILADEHI',
    createdBy: 'Aman Kumar',
    createdByUserId: 'USR-010',
    priority: 'Urgent',
    currentStageId: 'STG-STK-02',
    currentStageIndex: 1,
    totalStages: 2,
    status: 'Awaiting Fulfillment',
    createdAt: '10/07/2026 14:00:00',
    updatedAt: '10/07/2026 15:25:00',
    totalDelayHours: 0,
    remarks: 'Structural welding electrodes: Partial stock dispatched from Central Store, balance routed to Purchase Dept',
    stages: [
      {
        stageId: 'STG-STK-01',
        stageName: 'RECEIVE MATERIAL REQUISITION',
        assignee: 'Amanat Bharadwaj',
        how: 'IN-APP FORM / REQUISITION SLIP',
        plannedDateTime: '10/07/2026 15:00:00',
        actualDateTime: '10/07/2026 14:00:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-STK-02',
        stageName: 'CHECK STOCK & SPLIT',
        assignee: 'Amanat Bharadwaj',
        how: 'WHATSAPP / EMAIL / PHYSICALLY',
        plannedDateTime: '10/07/2026 18:00:00',
        actualDateTime: '10/07/2026 14:30:00',
        status: 'Done',
        timeDelayHours: 0,
        notes: 'Stage 2 triage complete: 1 Store Dispatch sub-workflow, 1 Purchase Indent sub-workflow auto-spawned.'
      }
    ]
  },
  {
    id: 'fms-inst-pay-001',
    flowId: 'FLOW-PAY-260625-001',
    flowType: 'PO_TO_PAYMENT',
    poNumber: 'RAO/PO/260625-001',
    vendorName: 'M/S R D SONS',
    poAssignTo: 'MANISH KOSHLE',
    indentNo: '22',
    poDate: '25/06/2026',
    poAmount: 27445,
    siteName: 'SILADEHI',
    priority: 'Normal',
    currentStageId: 'COMPLETED',
    currentStageIndex: 15,
    totalStages: 15,
    status: 'Completed',
    createdAt: '25/06/2026 17:34:51',
    updatedAt: '27/06/2026 13:29:02',
    totalDelayHours: 26.68,
    remarks: 'PO Advance & Account Payment settled with M/S R D SONS',
    paymentMode: 'BANK_ACCOUNT',
    stages: [
      {
        stageId: 'STG-PAY-01',
        stageName: 'IS PAYMENT TO BE DONE FROM ACCOUNT?',
        assignee: 'Pranjal Agrawal / Khushboo',
        how: 'WHATSAPP / CALL / MANUAL',
        plannedDateTime: '26/06/2026 10:34:51',
        actualDateTime: '25/06/2026 17:45:08',
        status: 'Done',
        decisionValue: 'Yes',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PAY-02',
        stageName: 'IS ACCOUNT ALREADY ADDED?',
        assignee: 'Byamkesh Kaiwartya',
        how: 'WHATSAPP / PHONE / EMAIL',
        plannedDateTime: '26/06/2026 10:45:08',
        actualDateTime: '25/06/2026 17:45:37',
        status: 'Done',
        decisionValue: 'Yes',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PAY-03',
        stageName: 'GET CANCELLED CHEQUE/PASSBOOK COPY',
        assignee: 'Shyam Rao Sureshe',
        how: 'WHATSAPP / CALL / MANUAL',
        status: 'Skipped',
        notes: 'Skipped: Account already verified in internet banking'
      },
      {
        stageId: 'STG-PAY-04',
        stageName: 'BENEFICIARY APPROVAL FORM',
        assignee: 'Byamkesh Kaiwartya',
        how: 'IN-APP FORM',
        formResponseRef: undefined,
        status: 'Skipped',
        notes: 'Skipped: Account already verified in internet banking'
      },
      {
        stageId: 'STG-PAY-05',
        stageName: 'GET APPROVAL (BENEFICIARY)',
        assignee: 'Pranjal Agrawal / Khushboo Sahu',
        how: 'WHATSAPP / CALL / MANUAL',
        status: 'Skipped',
        notes: 'Skipped: Account already verified in internet banking'
      },
      {
        stageId: 'STG-PAY-06',
        stageName: 'ADD ACCOUNT ONLINE',
        assignee: 'Byamkesh Kaiwartya',
        how: 'WHATSAPP / CALL / MANUAL',
        status: 'Skipped',
        notes: 'Skipped: Account already verified in internet banking'
      },
      {
        stageId: 'STG-PAY-07',
        stageName: 'PAYMENT APPROVAL FORM',
        assignee: 'Shyam Rao Sureshe',
        how: 'IN-APP FORM',
        plannedDateTime: '26/06/2026 10:45:37',
        actualDateTime: '25/06/2026 17:46:38',
        status: 'Done',
        timeDelayHours: 0,
        formResponseRef: undefined,
      },
      {
        stageId: 'STG-PAY-08',
        stageName: 'GET APPROVAL (PAYMENT)',
        assignee: 'Pranjal Agrawal / Khushboo',
        how: 'WHATSAPP / CALL / MANUAL',
        plannedDateTime: '26/06/2026 10:46:38',
        actualDateTime: '27/06/2026 13:27:25',
        status: 'Done',
        timeDelayHours: 26.68
      },
      {
        stageId: 'STG-PAY-09',
        stageName: 'BANK PAYMENT ENTRY',
        assignee: 'Byamkesh Kaiwartya',
        how: 'WHATSAPP / CALL / MANUAL',
        plannedDateTime: '27/06/2026 14:27:25',
        actualDateTime: '27/06/2026 13:28:49',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PAY-10',
        stageName: 'GET ONLINE PAYMENT APPROVAL / PAYMENT DONE',
        assignee: 'Pranjal Agrawal / Khushboo',
        how: 'WHATSAPP / CALL / MANUAL',
        plannedDateTime: '27/06/2026 14:28:49',
        actualDateTime: '27/06/2026 13:28:49',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PAY-11',
        stageName: 'PAYMENT APPROVAL FORM (UPI)',
        assignee: 'Khushboo Sahu',
        how: 'IN-APP FORM',
        status: 'Skipped',
        notes: 'Skipped: Paid via Bank Account route'
      },
      {
        stageId: 'STG-PAY-12',
        stageName: 'GET APPROVAL (UPI)',
        assignee: 'Pranjal Agrawal / Khushboo Sahu',
        how: 'WHATSAPP / CALL / MANUAL',
        status: 'Skipped',
        notes: 'Skipped: Paid via Bank Account route'
      },
      {
        stageId: 'STG-PAY-13',
        stageName: 'GET QR CODE',
        assignee: 'Rajnikant / Vivek / Raj',
        how: 'WHATSAPP / CALL / MANUAL',
        status: 'Skipped',
        notes: 'Skipped: Paid via Bank Account route'
      },
      {
        stageId: 'STG-PAY-14',
        stageName: 'MAKE PAYMENT (UPI)',
        assignee: 'Khushboo Sahu',
        how: 'WHATSAPP / CALL / MANUAL',
        status: 'Skipped',
        notes: 'Skipped: Paid via Bank Account route'
      },
      {
        stageId: 'STG-PAY-15',
        stageName: 'SEND PAYMENT DETAILS TO GET MATERIAL',
        assignee: 'Byamkesh Kaiwartya / Khushboo',
        how: 'IN-APP FORM',
        plannedDateTime: '27/06/2026 14:28:49',
        actualDateTime: '27/06/2026 13:29:02',
        status: 'Done',
        timeDelayHours: 0,
        formResponseRef: undefined,
      }
    ]
  },
  {
    id: 'fms-inst-pay-752',
    flowId: 'FLOW-PAY-752-001',
    flowType: 'PO_TO_PAYMENT',
    linkedFlowId: 'FLOW-IND-752',
    poNumber: 'RAO/PO/752-001',
    vendorName: 'M/S ESAB WELDING SOLUTIONS',
    poAssignTo: 'Pranjal Agrawal',
    indentNo: '752',
    poDate: '05/10/2026',
    poAmount: 85200,
    siteName: 'SILADEHI',
    priority: 'Urgent',
    currentStageId: 'STG-PAY-06',
    currentStageIndex: 5,
    totalStages: 9,
    status: 'In Progress',
    createdAt: '05/10/2026 16:35:00',
    updatedAt: '05/10/2026 16:40:00',
    totalDelayHours: 0,
    remarks: 'Advance payment dossier received from Purchase Dept (Indent #752)',
    paymentMode: 'BANK_ACCOUNT',
    stages: [
      {
        stageId: 'STG-PAY-01',
        stageName: 'Receive PO & Payment Request',
        assignee: 'Priyanka Agrawal',
        whoRole: 'ACCOUNTANT',
        whoDefaultAssignee: 'Priyanka Agrawal',
        how: 'IN-APP FORM',
        plannedDateTime: '05/10/2026 16:35:00',
        actualDateTime: '05/10/2026 16:40:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PAY-02',
        stageName: 'Fill Beneficiary Details',
        assignee: 'Priyanka Agrawal',
        whoRole: 'ACCOUNTANT',
        whoDefaultAssignee: 'Priyanka Agrawal',
        how: 'IN-APP FORM',
        plannedDateTime: '05/10/2026 16:45:00',
        actualDateTime: '05/10/2026 16:55:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PAY-03',
        stageName: 'Director Beneficiary Approval',
        assignee: 'Pranjal Agrawal',
        whoRole: 'DIRECTOR',
        whoDefaultAssignee: 'Pranjal Agrawal',
        how: 'DIRECTOR APPROVAL DESK',
        plannedDateTime: '05/10/2026 17:40:00',
        actualDateTime: '05/10/2026 17:00:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PAY-04',
        stageName: 'Bank Entry Beneficiary',
        assignee: 'Priyanka Agrawal',
        whoRole: 'ACCOUNTANT',
        whoDefaultAssignee: 'Priyanka Agrawal',
        how: 'BANKING PORTAL',
        plannedDateTime: '05/10/2026 18:00:00',
        actualDateTime: '05/10/2026 17:15:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PAY-05',
        stageName: 'Netbanking Beneficiary Confirmation',
        assignee: 'Pranjal Agrawal',
        whoRole: 'DIRECTOR',
        whoDefaultAssignee: 'Pranjal Agrawal',
        how: 'BANKING PORTAL',
        plannedDateTime: '05/10/2026 18:15:00',
        actualDateTime: '05/10/2026 17:30:00',
        status: 'Done',
        timeDelayHours: 0
      },
      {
        stageId: 'STG-PAY-06',
        stageName: 'Director Payment Approval',
        assignee: 'Pranjal Agrawal',
        whoRole: 'DIRECTOR',
        whoDefaultAssignee: 'Pranjal Agrawal',
        how: 'DIRECTOR APPROVAL DESK',
        plannedDateTime: '05/10/2026 18:30:00',
        status: 'In Progress',
        timeDelayHours: 1,
        delayHours: 1
      },
      {
        stageId: 'STG-PAY-07',
        stageName: 'Bank Payment Entry',
        assignee: 'Priyanka Agrawal',
        whoRole: 'ACCOUNTANT',
        whoDefaultAssignee: 'Priyanka Agrawal',
        how: 'BANKING PORTAL',
        plannedDateTime: '06/10/2026 10:30:00',
        status: 'Pending'
      },
      {
        stageId: 'STG-PAY-08',
        stageName: 'Netbanking Payment Confirmation',
        assignee: 'Pranjal Agrawal',
        whoRole: 'DIRECTOR',
        whoDefaultAssignee: 'Pranjal Agrawal',
        how: 'BANKING PORTAL',
        plannedDateTime: '06/10/2026 11:30:00',
        status: 'Pending'
      },
      {
        stageId: 'STG-PAY-09',
        stageName: 'Send Payment Details to Get Material',
        assignee: 'Shyam Rao Sureshe',
        whoRole: 'PURCHASER',
        whoDefaultAssignee: 'Shyam Rao Sureshe',
        how: 'WHATSAPP / EMAIL TO VENDOR',
        plannedDateTime: '06/10/2026 13:30:00',
        status: 'Pending'
      }
    ]
  },
  {
    id: 'fms-inst-ben-20261010-001',
    flowId: 'BPL/BEN/20261010-001',
    flowType: 'BENEFICIARY_APPROVAL',
    requisitionNumber: 'BEN/20261010-001',
    indentNo: 'BPL/BEN/20261010-001',
    indentDate: '10/10/2026',
    siteName: 'SILADEHI',
    priority: 'Urgent',
    currentStageId: 'STG-BEN-03',
    currentStageIndex: 2,
    totalStages: 3,
    status: 'In Progress',
    createdAt: '10/10/2026 10:00:00',
    updatedAt: '11/10/2026 15:30:00',
    totalDelayHours: 0,
    remarks: 'Disbursal payment to Barbrik Infra Pvt Ltd for Siladehi civil works.',
    stages: [
      {
        stageId: 'STG-BEN-01',
        stageName: 'BENEFICIARY DETAILS ENTRY',
        assignee: 'Site Accountant',
        how: 'IN-APP FORM',
        status: 'Done',
        plannedDateTime: '10/10/2026 10:00:00',
        actualDateTime: '10/10/2026 10:45:00',
        timeDelayHours: 0,
        doerName: 'Site Accountant',
        submittedData: {
          beneficiaryName: 'Barbrik Infra Pvt Ltd',
          accountNo: '987654321001',
          ifscCode: 'SBIN0001234',
          bankName: 'State Bank of India',
          purpose: 'Siladehi Site Earthwork Advance Settlement',
          chequeCopyUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500'
        }
      },
      {
        stageId: 'STG-BEN-02',
        stageName: 'ACCOUNTS APPROVAL',
        assignee: 'Pranjal Agrawal / Accounts Head',
        how: 'IN-APP APPROVAL',
        status: 'Done',
        plannedDateTime: '11/10/2026 14:00:00',
        actualDateTime: '11/10/2026 15:30:00',
        timeDelayHours: 0,
        decisionValue: 'Yes',
        doerName: 'Pranjal Agrawal',
        submittedData: {
          approvalStatus: 'Approved',
          approvedAmount: 250000,
          accountsRemarks: 'Approved for immediate RTGS disburse.'
        }
      },
      {
        stageId: 'STG-BEN-03',
        stageName: 'UTR DISBURSEMENT & RELEASE',
        assignee: 'Shyam Rao Sureshe',
        how: 'BANK ERP / IN-APP FORM',
        status: 'In Progress',
        plannedDateTime: '12/10/2026 11:00:00',
        submittedData: {}
      }
    ]
  },
  {
    id: 'fms-inst-ben-20261010-002',
    flowId: 'BPL/BEN/20261010-002',
    flowType: 'BENEFICIARY_APPROVAL',
    requisitionNumber: 'BEN/20261010-002',
    indentNo: 'BPL/BEN/20261010-002',
    indentDate: '08/10/2026',
    siteName: 'BIJETALA',
    priority: 'Normal',
    currentStageId: 'COMPLETED',
    currentStageIndex: 3,
    totalStages: 3,
    status: 'Completed',
    createdAt: '08/10/2026 09:00:00',
    updatedAt: '10/10/2026 16:40:00',
    totalDelayHours: 2.5,
    remarks: 'Disbursal payment to Royal Build Tech Ltd.',
    stages: [
      {
        stageId: 'STG-BEN-01',
        stageName: 'BENEFICIARY DETAILS ENTRY',
        assignee: 'Site Accountant',
        how: 'IN-APP FORM',
        status: 'Done',
        plannedDateTime: '08/10/2026 09:00:00',
        actualDateTime: '08/10/2026 11:30:00',
        timeDelayHours: 2.5,
        doerName: 'Site Accountant',
        submittedData: {
          beneficiaryName: 'Royal Build Tech Ltd',
          accountNo: '456789012004',
          ifscCode: 'HDFC0000456',
          bankName: 'HDFC Bank',
          purpose: 'Bijetala Plant Fabrication Work',
          chequeCopyUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=500'
        }
      },
      {
        stageId: 'STG-BEN-02',
        stageName: 'ACCOUNTS APPROVAL',
        assignee: 'Pranjal Agrawal / Accounts Head',
        how: 'IN-APP APPROVAL',
        status: 'Done',
        plannedDateTime: '09/10/2026 12:00:00',
        actualDateTime: '09/10/2026 13:15:00',
        timeDelayHours: 0,
        decisionValue: 'Yes',
        doerName: 'Pranjal Agrawal',
        submittedData: {
          approvalStatus: 'Approved',
          approvedAmount: 120000,
          accountsRemarks: 'Verified and cleared.'
        }
      },
      {
        stageId: 'STG-BEN-03',
        stageName: 'UTR DISBURSEMENT & RELEASE',
        assignee: 'Shyam Rao Sureshe',
        how: 'BANK ERP / IN-APP FORM',
        status: 'Done',
        plannedDateTime: '10/10/2026 16:00:00',
        actualDateTime: '10/10/2026 16:40:00',
        timeDelayHours: 0,
        doerName: 'Shyam Rao Sureshe',
        submittedData: {
          utrNumber: 'UTR-98214',
          disbursalDate: '10/10/2026',
          paymentMode: 'RTGS'
        }
      }
    ]
  },
  {
    id: 'fms-inst-752',
    flowId: 'FLOW-IND-752',
    flowType: 'INDENT_PURCHASE',
    templateKey: 'INDENT_TO_PO',
    requisitionNumber: 'REQ-2026-752',
    indentNo: '752',
    indentDate: '10/07/2026',
    siteName: 'SILADEHI',
    priority: 'Urgent',
    poAssignTo: 'Brahmanand Patel',
    currentStageId: 'STG-02',
    currentStageIndex: 1,
    totalStages: 6,
    status: 'In Progress',
    createdAt: '10/07/2026 15:29:47',
    updatedAt: '16/06/2026 10:12:38',
    totalDelayHours: 0,
    remarks: 'Critical plant machinery repair item; approved for urgent procurement.',
    stages: [
      {
        stageId: 'STG-01',
        stageName: 'Receive Indent & Verify Evidence',
        assignee: 'Brahmanand Patel',
        whoRole: 'ASST_MANAGER_PURCHASE',
        whoDefaultAssignee: 'Brahmanand Patel',
        how: 'IN-APP PURCHASE DESK',
        plannedDateTime: '10/07/2026 16:29:47',
        actualDateTime: '15/06/2026 11:30:36',
        status: 'Done',
        timeDelayHours: 0,
        fields: FMS_STANDARD_PURCHASE_STAGES[0].fields,
      },
      {
        stageId: 'STG-02',
        stageName: 'Get Quotation & Generate CS',
        assignee: 'Brahmanand Patel',
        whoRole: 'PURCHASE_EXECUTIVE',
        whoDefaultAssignee: 'Brahmanand Patel',
        how: 'COMPARATIVE STATEMENT MODULE',
        plannedDateTime: '18/06/2026 12:37:33',
        status: 'In Progress',
        timeDelayHours: 0,
        fields: FMS_STANDARD_PURCHASE_STAGES[1].fields,
      },
      {
        stageId: 'STG-03',
        stageName: 'Get Another Quotation',
        assignee: 'Brahmanand Patel',
        whoRole: 'ASST_MANAGER_PURCHASE',
        whoDefaultAssignee: 'Brahmanand Patel',
        how: 'COMPARATIVE STATEMENT MODULE',
        status: 'Pending',
        fields: FMS_STANDARD_PURCHASE_STAGES[2].fields,
      },
      {
        stageId: 'STG-04',
        stageName: 'Director L1 Approval & Digital Sign',
        assignee: 'Pranjal Agrawal',
        whoRole: 'DIRECTOR',
        whoDefaultAssignee: 'Pranjal Agrawal',
        how: 'DIRECTOR APPROVAL DESK',
        status: 'Pending',
        fields: FMS_STANDARD_PURCHASE_STAGES[3].fields,
        logic: (FMS_STANDARD_PURCHASE_STAGES[3] as any).logic,
      },
      {
        stageId: 'STG-05',
        stageName: 'Generate & Issue Purchase Order (PO)',
        assignee: 'Shyam Rao Sureshe',
        whoRole: 'PURCHASE_EXECUTIVE',
        whoDefaultAssignee: 'Shyam Rao Sureshe',
        how: 'SPLIT PO GENERATOR MODULE',
        status: 'Pending',
        fields: FMS_STANDARD_PURCHASE_STAGES[4].fields,
      },
      {
        stageId: 'STG-06',
        stageName: 'Send PO for Material Collection & Dispatch',
        assignee: 'Rajendra / Vivek',
        whoRole: 'PURCHASE_ASSISTANT',
        whoDefaultAssignee: 'Rajendra / Vivek',
        how: 'STORE DISPATCH HANDOVER',
        status: 'Pending',
        fields: FMS_STANDARD_PURCHASE_STAGES[5].fields,
        subWorkflowTrigger: (FMS_STANDARD_PURCHASE_STAGES[5] as any).subWorkflowTrigger,
      }
    ]
  },
  {
    id: 'fms-inst-780',
    flowId: 'FLOW-IND-780',
    flowType: 'INDENT_PURCHASE',
    templateKey: 'INDENT_TO_PO',
    requisitionNumber: 'REQ-2026-780',
    indentNo: '780',
    indentDate: '01/10/2026',
    siteName: 'BIJETALA',
    priority: 'Normal',
    poAssignTo: 'Pranjal Agrawal',
    currentStageId: 'STG-04',
    currentStageIndex: 3,
    totalStages: 6,
    status: 'In Progress',
    createdAt: '01/10/2026 09:15:00',
    updatedAt: '02/10/2026 14:00:00',
    totalDelayHours: 0,
    remarks: 'Standard quarterly structural consumables indent awaiting Director L1 authorization',
    stages: [
      {
        stageId: 'STG-01',
        stageName: 'Receive Indent & Verify Evidence',
        assignee: 'Brahmanand Patel',
        whoRole: 'ASST_MANAGER_PURCHASE',
        whoDefaultAssignee: 'Brahmanand Patel',
        how: 'IN-APP PURCHASE DESK',
        plannedDateTime: '01/10/2026 10:15:00',
        actualDateTime: '01/10/2026 10:05:00',
        status: 'Done',
        timeDelayHours: 0,
        fields: FMS_STANDARD_PURCHASE_STAGES[0].fields,
      },
      {
        stageId: 'STG-02',
        stageName: 'Get Quotation & Generate CS',
        assignee: 'Brahmanand Patel',
        whoRole: 'PURCHASE_EXECUTIVE',
        whoDefaultAssignee: 'Brahmanand Patel',
        how: 'COMPARATIVE STATEMENT MODULE',
        plannedDateTime: '02/10/2026 17:30:00',
        actualDateTime: '02/10/2026 14:00:00',
        status: 'Done',
        fields: FMS_STANDARD_PURCHASE_STAGES[1].fields,
      },
      {
        stageId: 'STG-03',
        stageName: 'Get Another Quotation',
        assignee: 'Brahmanand Patel',
        whoRole: 'ASST_MANAGER_PURCHASE',
        whoDefaultAssignee: 'Brahmanand Patel',
        how: 'COMPARATIVE STATEMENT MODULE',
        status: 'Skipped',
        notes: 'Skipped in normal flow',
        fields: FMS_STANDARD_PURCHASE_STAGES[2].fields,
      },
      {
        stageId: 'STG-04',
        stageName: 'Director L1 Approval & Digital Sign',
        assignee: 'Pranjal Agrawal',
        whoRole: 'DIRECTOR',
        whoDefaultAssignee: 'Pranjal Agrawal',
        how: 'DIRECTOR APPROVAL DESK',
        plannedDateTime: '03/10/2026 14:00:00',
        status: 'In Progress',
        fields: FMS_STANDARD_PURCHASE_STAGES[3].fields,
        logic: (FMS_STANDARD_PURCHASE_STAGES[3] as any).logic,
      },
      {
        stageId: 'STG-05',
        stageName: 'Generate & Issue Purchase Order (PO)',
        assignee: 'Shyam Rao Sureshe',
        whoRole: 'PURCHASE_EXECUTIVE',
        whoDefaultAssignee: 'Shyam Rao Sureshe',
        how: 'SPLIT PO GENERATOR MODULE',
        status: 'Pending',
        fields: FMS_STANDARD_PURCHASE_STAGES[4].fields,
      },
      {
        stageId: 'STG-06',
        stageName: 'Send PO for Material Collection & Dispatch',
        assignee: 'Rajendra / Vivek',
        whoRole: 'PURCHASE_ASSISTANT',
        whoDefaultAssignee: 'Rajendra / Vivek',
        how: 'STORE DISPATCH HANDOVER',
        status: 'Pending',
        fields: FMS_STANDARD_PURCHASE_STAGES[5].fields,
        subWorkflowTrigger: (FMS_STANDARD_PURCHASE_STAGES[5] as any).subWorkflowTrigger,
      }
    ]
  }
];

export const INITIAL_DELEGATION_TASKS: DelegationTask[] = [
  {
    id: 'del-vhdlgas',
    taskId: 'vhdlgas',
    name: 'POOJA RAO (MIS Executive)',
    rolePhone: 'POOJA RAO (MIS Executive) - 9301242522',
    task: 'SUBCONTRACTOR BILLING FMS',
    firstDate: '01/10/2026 10:00 AM',
    latestRevision: '01/10/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Pending',
    priority: 'Urgent'
  },
  {
    id: 'del-nfs3wfn',
    taskId: 'nfs3wfn',
    name: 'BYAMKESH KAIWARTYA (IT Executive)',
    rolePhone: 'BYAMKESH KAIWARTYA (IT Executive) - 9977853230',
    task: 'return washing machine',
    firstDate: '30/09/2026 11:30 AM',
    latestRevision: '30/09/2026 11:30 AM',
    totalRevisions: 0,
    status: 'Pending',
    priority: 'Normal'
  },
  {
    id: 'del-g2qajsx',
    taskId: 'g2qajsx',
    name: 'POOJA RAO (MIS Executive)',
    rolePhone: 'POOJA RAO (MIS Executive) - 9301242522',
    task: 'CREATE SYSTEM MASTER FOR ACTIVE & INACTIVE SHEET',
    firstDate: '18/09/2026 10:00 AM',
    latestRevision: '18/09/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Completed',
    completedAt: '18/09/2026 17:45:00'
  },
  {
    id: 'del-iks4ofb',
    taskId: 'iks4ofb',
    name: 'POOJA RAO (MIS Executive)',
    rolePhone: 'POOJA RAO (MIS Executive) - 9301242522',
    task: 'IBT ROLL OUT',
    firstDate: '18/09/2026 10:00 AM',
    latestRevision: '18/09/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Completed',
    completedAt: '18/09/2026 18:10:00'
  },
  {
    id: 'del-2307kk7',
    taskId: '2307kk7',
    name: 'POOJA RAO (MIS Executive)',
    rolePhone: 'POOJA RAO (MIS Executive) - 9301242522',
    task: 'BENIFICEIARY ROLL OUT',
    firstDate: '18/09/2026 10:00 AM',
    latestRevision: '18/09/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Completed',
    completedAt: '18/09/2026 18:30:00'
  },
  {
    id: 'del-8nxsaph',
    taskId: '8nxsaph',
    name: 'RAJNIKANT BEHERA (PURCHASER)',
    rolePhone: 'RAJNIKANT BEHERA (PURCHASER) - 9348371469',
    task: 'TABLE CLOCK REPAIRING',
    firstDate: '19/09/2026 10:00 AM',
    latestRevision: '19/09/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Completed',
    completedAt: '19/09/2026 16:00:00'
  },
  {
    id: 'del-ztyjngb',
    taskId: 'ztyjngb',
    name: 'VINOD TIWARI (LIASING)',
    rolePhone: 'VINOD TIWARI (LIASING) - 78692 34640',
    task: 'FINAL DOCCUMENT COLLECTION',
    firstDate: '30/09/2026 02:00 PM',
    latestRevision: '30/09/2026 02:00 PM',
    totalRevisions: 0,
    status: 'Pending',
    priority: 'Urgent'
  },
  {
    id: 'del-5rfo8ok',
    taskId: '5rfo8ok',
    name: 'MAMTA KUMARI (HR)',
    rolePhone: 'MAMTA KUMARI (HR) - 870 989 7038',
    task: 'MIS Required: Timing 10 am to 8 pm, Location: Julum Tekari, Old Dhamtari Road, Raipur. Salary 20-25k',
    firstDate: '26/09/2026 10:00 AM',
    latestRevision: '26/09/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Pending',
    priority: 'Normal'
  },
  {
    id: 'del-qpgi0f7',
    taskId: 'qpgi0f7',
    name: 'RAJNIKANT BEHERA (PURCHASER)',
    rolePhone: 'RAJNIKANT BEHERA (PURCHASER) - 9348371469',
    task: 'ALUM STONE & BOX',
    firstDate: '21/09/2026 10:00 AM',
    latestRevision: '21/09/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Completed',
    completedAt: '21/09/2026 15:20:00'
  },
  {
    id: 'del-k012i9a',
    taskId: 'k012i9a',
    name: 'RAJENDRA SARTHI (PURCHASER)',
    rolePhone: 'RAJENDRA SARTHI (PURCHASER) - 9343318047',
    task: 'DOCCUMENT DROP TO RKC',
    firstDate: '21/09/2026 10:00 AM',
    latestRevision: '21/09/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Completed',
    completedAt: '21/09/2026 17:00:00'
  },
  {
    id: 'del-89iyju4',
    taskId: '89iyju4',
    name: 'RAJNIKANT BEHERA (PURCHASER)',
    rolePhone: 'RAJNIKANT BEHERA (PURCHASER) - 9348371469',
    task: 'Purchase dog food',
    firstDate: '24/09/2026 10:00 AM',
    revision1: '25/09/2026 10:00 AM',
    revision2: '25/09/2026 02:00 PM',
    latestRevision: '25/09/2026 02:00 PM',
    totalRevisions: 2,
    status: 'Week Shifted',
    priority: 'Normal',
    revisionHistory: [
      {
        revisionNumber: 1,
        previousDate: '24/09/2026 10:00 AM',
        newDate: '25/09/2026 10:00 AM',
        reason: 'Vendor store stock unavailable',
        timestamp: '24/09/2026 14:00',
        revisedBy: 'Rajnikant Behera'
      },
      {
        revisionNumber: 2,
        previousDate: '25/09/2026 10:00 AM',
        newDate: '25/09/2026 02:00 PM',
        reason: 'Shifted to weekend bulk transport run',
        timestamp: '25/09/2026 09:30',
        revisedBy: 'Bramhanand Patel'
      }
    ]
  },
  {
    id: 'del-swnspsf',
    taskId: 'swnspsf',
    name: 'POOJA RAO (MIS Executive)',
    rolePhone: 'POOJA RAO (MIS Executive) - 9301242522',
    task: 'attendance collation fms',
    firstDate: '24/09/2026 10:00 AM',
    latestRevision: '24/09/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Completed',
    completedAt: '24/09/2026 19:00:00'
  },
  {
    id: 'del-iz5qme6',
    taskId: 'iz5qme6',
    name: 'POOJA RAO (MIS Executive)',
    rolePhone: 'POOJA RAO (MIS Executive) - 9301242522',
    task: 'LEAVE SUBMISSION FMS',
    firstDate: '24/09/2026 10:00 AM',
    latestRevision: '24/09/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Completed',
    completedAt: '24/09/2026 19:30:00'
  },
  {
    id: 'del-7yqfdf0',
    taskId: '7yqfdf0',
    name: 'POOJA RAO (MIS Executive)',
    rolePhone: 'POOJA RAO (MIS Executive) - 9301242522',
    task: 'MATETIAL ISSUE TO SUBCONTRACTOR FMS',
    firstDate: '05/10/2026 10:00 AM',
    latestRevision: '05/10/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Pending',
    priority: 'Urgent'
  },
  {
    id: 'del-due-today-01',
    taskId: 'dt01byam',
    name: 'BYAMKESH KAIWARTYA (IT Executive)',
    rolePhone: 'BYAMKESH KAIWARTYA (IT Executive) - 9977853230',
    task: 'Configure VPN tunnels for Bijetala site office router',
    firstDate: '06/10/2026 11:30 AM',
    latestRevision: '06/10/2026 11:30 AM',
    totalRevisions: 0,
    status: 'Pending',
    priority: 'Urgent'
  },
  {
    id: 'del-due-today-02',
    taskId: 'dt02pooja',
    name: 'POOJA RAO (MIS Executive)',
    rolePhone: 'POOJA RAO (MIS Executive) - 9301242522',
    task: 'Daily Indent SLA Compliance Audit Summary for Management',
    firstDate: '06/10/2026 03:00 PM',
    latestRevision: '06/10/2026 03:00 PM',
    totalRevisions: 0,
    status: 'Pending',
    priority: 'Normal'
  },
  {
    id: 'del-571x65t',
    taskId: '571x65t',
    name: 'PRANAY GHOSH (Project Manager)',
    rolePhone: 'PRANAY GHOSH (Project Manager) - 9437342135',
    task: 'ELECTRIC POLE',
    firstDate: '29/09/2026 10:00 AM',
    latestRevision: '29/09/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Pending',
    priority: 'Urgent'
  },
  {
    id: 'del-t65ruur',
    taskId: 't65ruur',
    name: 'POOJA RAO (MIS Executive)',
    rolePhone: 'POOJA RAO (MIS Executive) - 9301242522',
    task: 'SALARY PREPARATION/PAYROLL PROCESSING FMS',
    firstDate: '26/09/2026 10:00 AM',
    latestRevision: '26/09/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Pending',
    priority: 'Urgent'
  },
  {
    id: 'del-vvkafs5',
    taskId: 'vvkafs5',
    name: 'POOJA RAO (MIS Executive)',
    rolePhone: 'POOJA RAO (MIS Executive) - 9301242522',
    task: 'FUEL ISSUE FMS',
    firstDate: '25/09/2026 10:00 AM',
    latestRevision: '25/09/2026 10:00 AM',
    totalRevisions: 0,
    status: 'Completed',
    completedAt: '25/09/2026 18:00:00'
  }
];

export const INITIAL_CHECKLIST_ITEMS: ChecklistItem[] = [
  // Amanat Bharadwaj - Store in charge
  {
    id: 'chk-270',
    taskId: '270',
    name: 'Amanat Bharadwaj (8084801020)',
    email: 'rws.store1@gmail.com',
    department: 'Store in charge',
    frequency: 'W',
    task: 'All Computer/Laptop Cleaning (CSR)',
    plannedDate: '18/06/2026 10:00 AM',
    actualDate: '24/06/2026 04:30 PM',
    status: 'Done',
    createdAt: '18/06/2026 08:00',
    updatedAt: '24/06/2026 16:30'
  },
  {
    id: 'chk-319',
    taskId: '319',
    name: 'Amanat Bharadwaj (8084801020)',
    email: 'rws.store1@gmail.com',
    department: 'Store in charge',
    frequency: 'W',
    task: 'All Computer/Laptop Check Running (CSR)',
    plannedDate: '18/06/2026 10:00 AM',
    actualDate: '24/06/2026 04:40 PM',
    status: 'Done',
    createdAt: '18/06/2026 08:00',
    updatedAt: '24/06/2026 16:40'
  },
  {
    id: 'chk-368',
    taskId: '368',
    name: 'Amanat Bharadwaj (8084801020)',
    email: 'rws.store1@gmail.com',
    department: 'Store in charge',
    frequency: 'W',
    task: 'All Camera Check/Maintenance (CSR)',
    plannedDate: '18/06/2026 10:00 AM',
    actualDate: '24/06/2026 05:00 PM',
    status: 'Done',
    createdAt: '18/06/2026 08:00',
    updatedAt: '24/06/2026 17:00'
  },
  {
    id: 'chk-417',
    taskId: '417',
    name: 'Amanat Bharadwaj (8084801020)',
    email: 'rws.store1@gmail.com',
    department: 'Store in charge',
    frequency: 'W',
    task: 'All Switch/Modem Check/Maintenance (CSR)',
    plannedDate: '18/06/2026 10:00 AM',
    actualDate: '24/06/2026 05:15 PM',
    status: 'Done',
    createdAt: '18/06/2026 08:00',
    updatedAt: '24/06/2026 17:15'
  },
  {
    id: 'chk-466',
    taskId: '466',
    name: 'Amanat Bharadwaj (8084801020)',
    email: 'rws.store1@gmail.com',
    department: 'Store in charge',
    frequency: 'M',
    task: 'All Printer Check/Maintenance (CSR)',
    plannedDate: '18/06/2026 10:00 AM',
    actualDate: '24/06/2026 05:30 PM',
    status: 'Done',
    createdAt: '18/06/2026 08:00',
    updatedAt: '24/06/2026 17:30'
  },
  {
    id: 'chk-478',
    taskId: '478',
    name: 'Amanat Bharadwaj (8084801020)',
    email: 'rws.store1@gmail.com',
    department: 'Store in charge',
    frequency: 'M',
    task: 'All Printer Ink/Cartridge Check/Maintenance (CSR)',
    plannedDate: '18/06/2026 10:00 AM',
    actualDate: '24/06/2026 05:45 PM',
    status: 'Done',
    createdAt: '18/06/2026 08:00',
    updatedAt: '24/06/2026 17:45'
  },
  // Byamkesh Kaiwartya - IT Eng.
  {
    id: 'chk-1',
    taskId: '1',
    name: 'Byamkesh Kaiwartya (9977853230)',
    email: 'itrpr@barbrik.in',
    department: 'IT Eng.',
    frequency: 'W',
    task: 'All Computer/Laptop Cleaning (Raipur office)',
    plannedDate: '20/06/2026 10:00 AM',
    actualDate: '24/06/2026 02:00 PM',
    status: 'Done',
    createdAt: '20/06/2026 08:00',
    updatedAt: '24/06/2026 14:00'
  },
  {
    id: 'chk-50',
    taskId: '50',
    name: 'Byamkesh Kaiwartya (9977853230)',
    email: 'itrpr@barbrik.in',
    department: 'IT Eng.',
    frequency: 'W',
    task: 'All Computer/Laptop Check Running (Raipur office)',
    plannedDate: '20/06/2026 10:00 AM',
    actualDate: '24/06/2026 02:20 PM',
    status: 'Done',
    createdAt: '20/06/2026 08:00',
    updatedAt: '24/06/2026 14:20'
  },
  {
    id: 'chk-99',
    taskId: '99',
    name: 'Byamkesh Kaiwartya (9977853230)',
    email: 'itrpr@barbrik.in',
    department: 'IT Eng.',
    frequency: 'W',
    task: 'All Camera Check/Maintenance (Raipur office)',
    plannedDate: '20/06/2026 10:00 AM',
    actualDate: '24/06/2026 02:40 PM',
    status: 'Done',
    createdAt: '20/06/2026 08:00',
    updatedAt: '24/06/2026 14:40'
  },
  {
    id: 'chk-148',
    taskId: '148',
    name: 'Byamkesh Kaiwartya (9977853230)',
    email: 'itrpr@barbrik.in',
    department: 'IT Eng.',
    frequency: 'W',
    task: 'All Switch/Modem Check/Maintenance (Raipur office)',
    plannedDate: '20/06/2026 10:00 AM',
    actualDate: '24/06/2026 03:00 PM',
    status: 'Done',
    createdAt: '20/06/2026 08:00',
    updatedAt: '24/06/2026 15:00'
  },
  {
    id: 'chk-197',
    taskId: '197',
    name: 'Byamkesh Kaiwartya (9977853230)',
    email: 'itrpr@barbrik.in',
    department: 'IT Eng.',
    frequency: 'W',
    task: 'All Intercom equipments Check/Maintenance (Raipur office)',
    plannedDate: '20/06/2026 10:00 AM',
    actualDate: '24/06/2026 03:20 PM',
    status: 'Done',
    createdAt: '20/06/2026 08:00',
    updatedAt: '24/06/2026 15:20'
  },
  {
    id: 'chk-246',
    taskId: '246',
    name: 'Byamkesh Kaiwartya (9977853230)',
    email: 'itrpr@barbrik.in',
    department: 'IT Eng.',
    frequency: 'M',
    task: 'All Printer Check/Maintenance (Raipur office)',
    plannedDate: '20/06/2026 10:00 AM',
    actualDate: '24/06/2026 03:40 PM',
    status: 'Done',
    createdAt: '20/06/2026 08:00',
    updatedAt: '24/06/2026 15:40'
  },
  {
    id: 'chk-258',
    taskId: '258',
    name: 'Byamkesh Kaiwartya (9977853230)',
    email: 'itrpr@barbrik.in',
    department: 'IT Eng.',
    frequency: 'M',
    task: 'All Printer Ink/Cartridge Check/Maintenance (Raipur office)',
    plannedDate: '20/06/2026 10:00 AM',
    actualDate: '24/06/2026 04:00 PM',
    status: 'Done',
    createdAt: '20/06/2026 08:00',
    updatedAt: '24/06/2026 16:00'
  },
  // Pappu Gupta / Rajesh Singh - Bijetala
  {
    id: 'chk-490',
    taskId: '490',
    name: 'Pappu Gupta / Rajesh Singh',
    email: 'bijetala.it2@gmail.com',
    department: 'Sr. Structure',
    frequency: 'W',
    task: 'All Computer/Laptop Cleaning (Bijetala)',
    plannedDate: '20/06/2026 10:00 AM',
    actualDate: '24/06/2026 04:20 PM',
    status: 'Done',
    createdAt: '20/06/2026 08:00',
    updatedAt: '24/06/2026 16:20'
  },
  {
    id: 'chk-710',
    taskId: '710',
    name: 'Aman Kumar',
    email: 'siladehi.it1@gmail.com',
    department: 'Structure',
    frequency: 'W',
    task: 'All Computer/Laptop Cleaning (Siladehi)',
    plannedDate: '20/06/2026 10:00 AM',
    actualDate: '24/06/2026 04:30 PM',
    status: 'Done',
    createdAt: '20/06/2026 08:00',
    updatedAt: '24/06/2026 16:30'
  },
  // Active/Upcoming Checklists for current date
  {
    id: 'chk-cur-01',
    taskId: '901',
    name: 'Amanat Bharadwaj (8084801020)',
    email: 'rws.store1@gmail.com',
    department: 'Store in charge',
    frequency: 'W',
    task: 'Physical Verification of Degraded Materials in Store Bay 4',
    plannedDate: '06/10/2026 11:30 AM',
    status: 'Pending',
    createdAt: '01/10/2026 08:00',
    updatedAt: '01/10/2026 08:00'
  },
  {
    id: 'chk-cur-02',
    taskId: '902',
    name: 'Byamkesh Kaiwartya (9977853230)',
    email: 'itrpr@barbrik.in',
    department: 'IT Eng.',
    frequency: 'W',
    task: 'Server Room UPS & Backup Battery Health Check',
    plannedDate: '05/10/2026 10:00 AM',
    status: 'Pending',
    createdAt: '01/10/2026 08:00',
    updatedAt: '01/10/2026 08:00'
  },
  {
    id: 'chk-cur-03',
    taskId: '903',
    name: 'Amanat Bharadwaj (8084801020)',
    email: 'rws.store1@gmail.com',
    department: 'Store in charge',
    frequency: 'D',
    task: 'Daily Forklift & Heavy Store Handling Equipment Inspection',
    plannedDate: '06/10/2026 03:00 PM',
    status: 'Pending',
    createdAt: '06/10/2026 08:00',
    updatedAt: '06/10/2026 08:00'
  },
  {
    id: 'chk-cur-04',
    taskId: '904',
    name: 'Byamkesh Kaiwartya (9977853230)',
    email: 'itrpr@barbrik.in',
    department: 'IT Eng.',
    frequency: 'W',
    task: 'Biometric Attendance Device Sync & Audit',
    plannedDate: '06/10/2026 04:30 PM',
    status: 'Pending',
    createdAt: '06/10/2026 08:00',
    updatedAt: '06/10/2026 08:00'
  }
];

export const INITIAL_INVENTORY_ITEMS: InventoryItem[] = [
  {
    id: 'inv-001',
    itemId: 'ITEM-IT-001',
    name: 'HP LaserJet Pro MFP M428fdw',
    category: 'IT Equipment',
    location: 'Raipur Office',
    currentStock: 4,
    minThreshold: 2,
    unit: 'Units',
    condition: 'Good',
    lastCheckedDate: '24/06/2026'
  },
  {
    id: 'inv-002',
    itemId: 'ITEM-IT-002',
    name: 'Cisco Catalyst 24-Port Gigabit Switch',
    category: 'IT Equipment',
    location: 'Siladehi Site',
    currentStock: 2,
    minThreshold: 1,
    unit: 'Units',
    condition: 'Good',
    lastCheckedDate: '24/06/2026'
  },
  {
    id: 'inv-003',
    itemId: 'ITEM-IT-003',
    name: 'Hikvision 4MP IP Dome Camera',
    category: 'IT Equipment',
    location: 'Bijetala Site',
    currentStock: 18,
    minThreshold: 5,
    unit: 'Units',
    condition: 'Good',
    lastCheckedDate: '24/06/2026'
  },
  {
    id: 'inv-004',
    itemId: 'ITEM-IT-004',
    name: 'Dell OptiPlex 3080 Desktop Core i5',
    category: 'IT Equipment',
    location: 'Central Store',
    currentStock: 3,
    minThreshold: 4,
    unit: 'Units',
    condition: 'Fair',
    lastCheckedDate: '24/06/2026'
  },
  {
    id: 'inv-005',
    itemId: 'ITEM-MECH-005',
    name: 'Heavy Duty Structural Electric Pole Insulators',
    category: 'Plant Machinery',
    location: 'Siladehi Site',
    currentStock: 12,
    minThreshold: 20,
    unit: 'Sets',
    condition: 'Degraded/Damaged',
    lastCheckedDate: '29/09/2026',
    returnDegradedSheetRef: 'REQ-2026-752'
  },
  {
    id: 'inv-006',
    itemId: 'ITEM-MAT-006',
    name: 'Alum Stone Industrial Grade 50kg Bags',
    category: 'Consumables',
    location: 'Central Store',
    currentStock: 35,
    minThreshold: 15,
    unit: 'Bags',
    condition: 'Good',
    lastCheckedDate: '21/09/2026'
  }
];

export const INITIAL_INVENTORY_MOVEMENTS: InventoryMovement[] = [
  {
    id: 'mov-001',
    transactionId: 'TXN-2026-091',
    itemId: 'ITEM-IT-001',
    itemName: 'HP LaserJet Pro MFP M428fdw',
    type: 'ISSUE',
    quantity: 1,
    sourceLocation: 'Central Store',
    destinationLocation: 'Raipur Office',
    timestamp: '20/06/2026 11:00',
    referenceDoc: 'CHK-246',
    initiatedBy: 'Byamkesh Kaiwartya',
    notes: 'Monthly replacement cartridge & printer test complete'
  },
  {
    id: 'mov-002',
    transactionId: 'TXN-2026-092',
    itemId: 'ITEM-MECH-005',
    itemName: 'Heavy Duty Structural Electric Pole Insulators',
    type: 'RETURN_DEGRADED',
    quantity: 6,
    sourceLocation: 'Siladehi Site',
    destinationLocation: 'Central Store - Scrap Bay',
    timestamp: '15/06/2026 11:32',
    referenceDoc: 'REQ-2026-752',
    initiatedBy: 'Bramhanand Patel',
    notes: 'Degraded damaged items decommissioned via FMS Stage 2'
  }
];

export const INITIAL_SITE_REGISTRY = [
  { id: 'site-01', code: 'SIL-01', name: 'Siladehi Site', status: 'ACTIVE' as const, createdAt: '01/10/2026' },
  { id: 'site-02', code: 'BIJ-01', name: 'Bijetala Site', status: 'ACTIVE' as const, createdAt: '01/10/2026' },
  { id: 'site-03', code: 'RPR-HQ', name: 'Raipur Office', status: 'ACTIVE' as const, createdAt: '01/10/2026' },
  { id: 'site-04', code: 'CST-01', name: 'Central Store', status: 'ACTIVE' as const, createdAt: '01/10/2026' },
];

export const DEFAULT_MASTER_CATEGORIES = [
  'Consumables',
  'Plant Machinery',
  'Safety/CSR',
  'IT Equipment',
  'Office Hardware',
  'Tools & Spares',
  'Electricals',
  'Raw Material / Fuel'
];

export const DEFAULT_MASTER_UNITS = [
  'Nos',
  'Kg',
  'Ltr',
  'Mtr',
  'Set',
  'Pkt',
  'Box',
  'Bag',
  'Pair',
  'Roll',
  'Sqft'
];

export const DEFAULT_REGISTRY_CONFIG: CentralRegistryConfig = {
  organizationName: 'BarBrik Construction & Engineering',
  activeDataSource: 'HYBRID_TRANSITION',
  masterSites: ['Siladehi Site', 'Bijetala Site', 'Raipur Office', 'Central Store'],
  sitesRegistry: INITIAL_SITE_REGISTRY,
  masterCategories: DEFAULT_MASTER_CATEGORIES,
  masterUnits: DEFAULT_MASTER_UNITS,
  workShiftConfig: {
    shiftStartTime: '09:30',
    shiftEndTime: '18:30',
    lunchStartTime: '13:30',
    lunchEndTime: '14:30',
    workingDays: [1, 2, 3, 4, 5, 6], // Monday to Saturday (Sunday weekly off)
  },
  sheetsConfig: {
    fmsSpreadsheetId: '1eB8x9Q_fms_central_indent_v2',
    fmsSheetTabId: 'FMS_INDENT_RECIEVE',
    delegationSpreadsheetId: '1184708924_delegation_master',
    delegationSheetTabId: 'DTA_TASKS',
    checklistSpreadsheetId: '2092959791_checklist_compliance',
    checklistSheetTabId: 'CHECKLIST_ITEMS',
    inventorySpreadsheetId: '1ims_central_store_v1',
    inventorySheetTabId: 'IMS_STOCK_MASTER'
  },
  formsConfig: {
    returnOfDegradedMaterialFormUrl: '',
    advancePaymentApprovalFormUrl: '',
    materialCollectionPoFormUrl: '',
    generalIndentFormUrl: '',
  },
  driveConfig: {
    sharedDriveId: '0ABrBk_Shared_Org_Drive_Root',
    billsAndInvoicesFolderId: '1Fdr_Bills_Invoices_Archive',
    purchaseOrdersFolderId: '1Fdr_Approved_PO_PDFs',
    evidencePhotosFolderId: '1Fdr_Checklist_Site_Photos'
  },
  notificationSettings: {
    webhookUrl: '',
    enableDesktopPush: true,
    enableSlaBreachAlerts: true,
    enableDelegationAlerts: true,
    enableStockAlerts: true,
    enableFmsAlerts: true,
  },
  databaseSchemaReady: true
};

export const SYSTEM_BUILTIN_TEMPLATES: FmsTemplateDefinition[] = [
  {
    id: 'tpl_indent_purchase',
    templateKey: 'INDENT_TO_PO',
    name: 'Indent to Purchase Order Workflow',
    departmentHub: 'PURCHASE',
    referenceLabel: 'BPL/IND/',
    defaultPriority: 'Normal',
    description: '6-stage procurement flow: Indent verification, Comparative Statement (CS) quotation analysis, Director L1 approval, split PO issuance, and store dispatch handover.',
    createdAt: '01/10/2026',
    updatedAt: '01/10/2026',
    stages: FMS_STANDARD_PURCHASE_STAGES.map((s, idx) => ({
      stageId: s.stageId,
      stageName: s.name,
      whoRole: s.whoRole,
      whoDefaultAssignee: s.whoDefaultAssignee,
      howChannel: s.howChannel,
      slaHours: idx === 0 ? 0 : s.slaHours,
      fields: s.fields,
      hasYesNoDecision: s.hasYesNoDecision,
      logic: (s as any).logic,
      subWorkflowTrigger: (s as any).subWorkflowTrigger,
      subWorkflowTriggers: (s as any).subWorkflowTriggers,
    })),
  },
  {
    id: 'tpl_check_stock',
    templateKey: 'CHECK_STOCK',
    name: 'Store Check Stock',
    departmentHub: 'STORE',
    referenceLabel: 'BPL/STK/',
    defaultPriority: 'Normal',
    description: '2-stage requisition & store stock verification with automated sub-workflow dispatch & purchase splitting.',
    createdAt: '01/10/2026',
    updatedAt: '01/10/2026',
    stages: FMS_CHECK_STOCK_STAGES.map((s, idx) => ({
      stageId: s.stageId,
      stageName: s.name,
      whoRole: s.whoRole,
      whoDefaultAssignee: s.whoDefaultAssignee,
      howChannel: s.howChannel,
      slaHours: idx === 0 ? 0 : s.slaHours,
      fields: s.fields,
      hasYesNoDecision: s.hasYesNoDecision,
      subWorkflowTrigger: (s as any).subWorkflowTrigger,
      subWorkflowTriggers: (s as any).subWorkflowTriggers,
    })),
  },
  {
    id: 'tpl_po_to_payment',
    templateKey: 'PO_TO_PAYMENT',
    name: 'PO to Payment Disbursement Workflow',
    departmentHub: 'ACCOUNTS',
    referenceLabel: 'BPL/PO/',
    defaultPriority: 'Normal',
    description: '7-stage payment workflow: Beneficiary setup (4 stages, auto-skipped if verified) and Payment execution (3 stages with Director sign-off & UTR confirmation).',
    createdAt: '01/10/2026',
    updatedAt: '01/10/2026',
    stages: FMS_PO_PAYMENT_STAGES.map((s, idx) => ({
      stageId: s.stageId,
      stageName: s.name,
      whoRole: s.whoRole,
      whoDefaultAssignee: s.whoDefaultAssignee,
      howChannel: s.howChannel,
      slaHours: s.slaHours,
      fields: s.fields,
      hasYesNoDecision: s.hasYesNoDecision,
      logic: (s as any).logic,
    })),
  },
  {
    id: 'tpl_beneficiary_approval',
    templateKey: 'BENEFICIARY_APPROVAL',
    name: 'Vendor Beneficiary Bank Approval Workflow',
    departmentHub: 'ACCOUNTS',
    referenceLabel: 'BPL/BEN/',
    defaultPriority: 'Normal',
    description: '3-stage bank beneficiary registration, director signoff & net-banking activation verification.',
    createdAt: '01/10/2026',
    updatedAt: '01/10/2026',
    stages: FMS_BENEFICIARY_APPROVAL_STAGES.map((s, idx) => ({
      stageId: s.stageId,
      stageName: s.name,
      whoRole: s.whoRole,
      whoDefaultAssignee: s.whoDefaultAssignee,
      howChannel: s.howChannel,
      slaHours: idx === 0 ? 0 : s.slaHours,
    })),
  },
  {
    id: 'tpl_purchase_to_store',
    templateKey: 'PURCHASE_TO_STORE_DISPATCH',
    name: 'Purchase Vendor to Central Store Dispatch',
    departmentHub: 'STORE',
    referenceLabel: 'BPL/PTS/',
    defaultPriority: 'Normal',
    description: '4-stage central store GRN & quality check, stock inward, STN preparation and site dispatch.',
    createdAt: '01/10/2026',
    updatedAt: '01/10/2026',
    stages: FMS_PURCHASE_TO_STORE_DISPATCH_STAGES.map((s, idx) => ({
      stageId: s.stageId,
      stageName: s.name,
      whoRole: s.whoRole,
      whoDefaultAssignee: s.whoDefaultAssignee,
      howChannel: s.howChannel,
      slaHours: idx === 0 ? 0 : s.slaHours,
    })),
  },
  {
    id: 'tpl_store_to_site',
    templateKey: 'STORE_TO_SITE_DISPATCH',
    name: 'Central Store to Site Material Issue',
    departmentHub: 'STORE',
    referenceLabel: 'BPL/SIV/',
    defaultPriority: 'Normal',
    description: '4-stage central warehouse issue voucher, STN preparation, vehicle logistics and dispatch.',
    createdAt: '01/10/2026',
    updatedAt: '01/10/2026',
    stages: FMS_STORE_TO_SITE_DISPATCH_STAGES.map((s, idx) => ({
      stageId: s.stageId,
      stageName: s.name,
      whoRole: s.whoRole,
      whoDefaultAssignee: s.whoDefaultAssignee,
      howChannel: s.howChannel,
      slaHours: idx === 0 ? 0 : s.slaHours,
    })),
  },
  {
    id: 'tpl_site_receive',
    templateKey: 'SITE_RECEIVE',
    name: 'Site Material Receive (GRN) Workflow',
    departmentHub: 'STORE',
    referenceLabel: 'BPL/GRN/',
    defaultPriority: 'Normal',
    description: 'Standalone site material receipt note (GRN), physical verification, challan upload and handover sign-off.',
    createdAt: '01/10/2026',
    updatedAt: '01/10/2026',
    stages: FMS_SITE_RECEIVE_STAGES.map((s, idx) => ({
      stageId: s.stageId,
      stageName: s.name,
      whoRole: s.whoRole,
      whoDefaultAssignee: s.whoDefaultAssignee,
      howChannel: s.howChannel,
      slaHours: idx === 0 ? 0 : s.slaHours,
    })),
  },
  {
    id: 'tpl_payment_to_dispatch',
    templateKey: 'PAYMENT_TO_DISPATCH',
    name: 'Vendor Payment to Dispatch Clearance',
    departmentHub: 'PURCHASE',
    referenceLabel: 'BPL/PAY/',
    defaultPriority: 'Normal',
    description: '7-stage payment confirmation, vendor dispatch advice, lorry receipt collection & clearance.',
    createdAt: '01/10/2026',
    updatedAt: '01/10/2026',
    stages: FMS_PAYMENT_TO_DISPATCH_STAGES.map((s, idx) => ({
      stageId: s.stageId,
      stageName: s.name,
      whoRole: s.whoRole,
      whoDefaultAssignee: s.whoDefaultAssignee,
      howChannel: s.howChannel,
      slaHours: idx === 0 ? 0 : s.slaHours,
    })),
  },
  {
    id: 'tpl_accounts_invoice',
    templateKey: 'ACCOUNTS_INVOICE_COLLECTION',
    name: 'Accounts Invoice Collection Workflow',
    departmentHub: 'ACCOUNTS',
    referenceLabel: 'BPL/INV/',
    defaultPriority: 'Normal',
    description: '6-stage tax invoice collection, GSTR 2B reconciliation, 3-way matching & accounts posting.',
    createdAt: '01/10/2026',
    updatedAt: '01/10/2026',
    stages: FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES.map((s, idx) => ({
      stageId: s.stageId,
      stageName: s.name,
      whoRole: s.whoRole,
      whoDefaultAssignee: s.whoDefaultAssignee,
      howChannel: s.howChannel,
      slaHours: idx === 0 ? 0 : s.slaHours,
    })),
  },
  {
    id: 'tpl_hr_attendance',
    templateKey: 'HR_ATTENDANCE_PAYMENT',
    name: 'Labour Attendance & Payment Workflow',
    departmentHub: 'PLANT_OPS',
    referenceLabel: 'BPL/ATT/',
    defaultPriority: 'Normal',
    description: '9-stage daily site labour muster roll, wage calculation, site engineer approval & payout.',
    createdAt: '01/10/2026',
    updatedAt: '01/10/2026',
    stages: FMS_HR_ATTENDANCE_PAYMENT_STAGES.map((s, idx) => ({
      stageId: s.stageId,
      stageName: s.name,
      whoRole: s.whoRole,
      whoDefaultAssignee: s.whoDefaultAssignee,
      howChannel: s.howChannel,
      slaHours: idx === 0 ? 0 : s.slaHours,
    })),
  },
  {
    id: 'tpl_breakdown',
    templateKey: 'BREAKDOWN_REPORTING',
    name: 'Machine Breakdown & Repair Workflow',
    departmentHub: 'PLANT_OPS',
    referenceLabel: 'BPL/MAC/',
    defaultPriority: 'Urgent',
    description: '13-stage plant machinery breakdown alert, mechanic assignment, spares indent, repair & job card.',
    createdAt: '01/10/2026',
    updatedAt: '01/10/2026',
    stages: FMS_BREAKDOWN_REPORTING_STAGES.map((s, idx) => ({
      stageId: s.stageId,
      stageName: s.name,
      whoRole: s.whoRole,
      whoDefaultAssignee: s.whoDefaultAssignee,
      howChannel: s.howChannel,
      slaHours: idx === 0 ? 0 : s.slaHours,
    })),
  },
  {
    id: 'tpl_part_repair',
    templateKey: 'EQUIPMENT_PART_REPAIR',
    name: 'Equipment Part Repair Workflow',
    departmentHub: 'PLANT_OPS',
    referenceLabel: 'BPL/PRT/',
    defaultPriority: 'Normal',
    description: '18-stage heavy equipment component overhaul, workshop dispatch, quotation, repair & testing.',
    createdAt: '01/10/2026',
    updatedAt: '01/10/2026',
    stages: FMS_EQUIPMENT_PART_REPAIR_STAGES.map((s, idx) => ({
      stageId: s.stageId,
      stageName: s.name,
      whoRole: s.whoRole,
      whoDefaultAssignee: s.whoDefaultAssignee,
      howChannel: s.howChannel,
      slaHours: idx === 0 ? 0 : s.slaHours,
    })),
  },
  {
    id: 'tpl_dpr',
    templateKey: 'DPR_REPORTING',
    name: 'Daily Progress Report (DPR) Workflow',
    departmentHub: 'OPERATIONS',
    referenceLabel: 'BPL/DPR/',
    defaultPriority: 'Normal',
    description: '6-stage site engineer daily execution log, machinery hours, material usage & project manager sign-off.',
    createdAt: '01/10/2026',
    updatedAt: '01/10/2026',
    stages: FMS_DPR_REPORTING_STAGES.map((s, idx) => ({
      stageId: s.stageId,
      stageName: s.name,
      whoRole: s.whoRole,
      whoDefaultAssignee: s.whoDefaultAssignee,
      howChannel: s.howChannel,
      slaHours: idx === 0 ? 0 : s.slaHours,
    })),
  },
];

export const INITIAL_BENEFICIARIES: BeneficiaryRecord[] = [
  {
    id: 'ben-001',
    sheetNo: 'BPL/BEN/20261012/01',
    timestamp: '12/10/2026 10:30',
    vendorId: 'ven-prof-002',
    beneficiaryName: 'MAHAVIR GAS CHULHA REPAIR STORE',
    tradeVendorName: 'MAHAVIR GAS CHULHA',
    accountNo: '381928371923',
    ifscCode: 'SBIN0001292',
    bankName: 'State Bank of India',
    purpose: 'Kitchen Machinery & Refill Accessories',
    cancelledChequeUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    remark: 'Verified active vendor account',
    requestedBy: 'Amanat Bharadwaj',
    approvalStatus: 'APPROVED',
    approvalTimestamp: '12/10/2026 11:00',
    approvedBy: 'Pranjal Agrawal',
    beneficiaryEntry: 'DONE',
    beneficiaryEntryTimestamp: '12/10/2026 12:15',
    additionStatus: 'DONE',
    additionTimestamp: '12/10/2026 12:30'
  },
  {
    id: 'ben-002',
    sheetNo: 'BPL/BEN/20261014/01',
    timestamp: '14/10/2026 09:15',
    vendorId: 'ven-prof-003',
    beneficiaryName: 'KANHAIYA LAL SAHU',
    tradeVendorName: 'KANHAIYA HARDWARE & INDUSTRIAL SUPPLIES',
    accountNo: '918237192834',
    ifscCode: 'HDFC0000412',
    bankName: 'HDFC Bank Ltd',
    purpose: 'Structural Fasteners & Site Tools',
    cancelledChequeUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    remark: 'Proprietor Account - Mismatch Approved',
    requestedBy: 'Priyanka',
    approvalStatus: 'PENDING',
    beneficiaryEntry: 'PENDING',
    additionStatus: 'PENDING'
  }
];

export const INITIAL_BANK_PAYMENTS: BankPaymentRecord[] = [
  {
    id: 'bank-001',
    sheetNo: 'BPL/BANK/20261014/01',
    timestamp: '14/10/2026 09:30',
    vendorId: 'ven-prof-002',
    vendorName: 'MAHAVIR GAS CHULHA',
    beneficiaryName: 'MAHAVIR GAS CHULHA REPAIR STORE',
    isNameMismatch: false,
    purposeOfPayment: 'Industrial LPG Cylinder Refill & Torch Nozzles for Siladehi Workshop',
    requestedBy: 'Bramhanand Patel',
    requestedByUserId: 'USR-002',
    site: 'Siladehi Site',
    modeOfPayment: 'ACCOUNT',
    amountToBePaid: 48500,
    remark: 'Urgent for metal fabrication works',
    plannedDate: '14/10/2026',
    billNoPo: 'INV-MGC-9812',
    beneficiaryMasterStatus: 'VERIFIED',
    bankName: 'State Bank of India',
    accountNoMasked: '••••••••1923',
    ifscCode: 'SBIN0001292',
    cancelledChequeUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    linkedBeneficiarySheetNo: 'BPL/BEN/20261012/01',
    approvalStatus: 'PENDING',
    paymentEntry: 'PENDING',
    paymentStatus: 'PENDING'
  },
  {
    id: 'bank-002',
    sheetNo: 'BPL/BANK/20261013/02',
    timestamp: '13/10/2026 14:10',
    vendorId: 'ven-prof-003',
    vendorName: 'KANHAIYA HARDWARE',
    beneficiaryName: 'KANHAIYA LAL SAHU',
    isNameMismatch: true,
    payeeRelationship: 'Sole Proprietor Personal Bank Account',
    purposeOfPayment: 'M20 Grade Anchor Bolts & Galvanized Clamps for Bijetala Tower',
    requestedBy: 'Shyam Rao Sureshe',
    requestedByUserId: 'USR-003',
    site: 'Bijetala Site',
    modeOfPayment: 'ACCOUNT',
    amountToBePaid: 125000,
    remark: 'Rate approved via CS-IND-466',
    plannedDate: '14/10/2026',
    billNoPo: 'PO-BPL-2026-88',
    beneficiaryMasterStatus: 'NEEDS_ADDITION',
    bankName: 'HDFC Bank Ltd',
    accountNoMasked: '••••••••2834',
    ifscCode: 'HDFC0000412',
    cancelledChequeUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
    linkedBeneficiarySheetNo: 'BPL/BEN/20261014/01',
    approvalStatus: 'APPROVED',
    approvalTimestamp: '13/10/2026 16:00',
    approvedBy: 'Pranjal Agrawal',
    approvedByUserId: 'USR-013',
    paymentEntry: 'PENDING',
    paymentStatus: 'PENDING'
  },
  {
    id: 'bank-003',
    sheetNo: 'BPL/BANK/20261012/01',
    timestamp: '12/10/2026 11:20',
    vendorId: 'ven-prof-001',
    vendorName: 'RAIPUR AUTO SPARES',
    beneficiaryName: 'RAIPUR AUTO SPARES LLP',
    isNameMismatch: false,
    purposeOfPayment: 'JCB Loader Engine Oil & Filter Replacement Consumables',
    requestedBy: 'Amanat Bharadwaj',
    requestedByUserId: 'USR-001',
    site: 'Raipur Office',
    modeOfPayment: 'UPI',
    amountToBePaid: 18200,
    remark: 'Instant UPI payout',
    plannedDate: '12/10/2026',
    beneficiaryMasterStatus: 'NOT_APPLICABLE_UPI',
    approvalStatus: 'APPROVED',
    approvalTimestamp: '12/10/2026 11:45',
    approvedBy: 'Pranjal Agrawal',
    approvedByUserId: 'USR-013',
    paymentEntry: 'DONE',
    paymentEntryTimestamp: '12/10/2026 12:00',
    paymentEntryBy: 'Priyanka',
    paymentStatus: 'DONE',
    paymentDoneTimestamp: '12/10/2026 12:05',
    remarks: 'UPI-UTR-918237192834',
    paymentDoneBy: 'Priyanka'
  }
];

export const INITIAL_IBT_RECORDS: InterbankTransferRecord[] = [
  {
    id: 'ibt-001',
    sheetNo: 'BPL/IBT/20261014/01',
    timestamp: '14/10/2026 08:30',
    transferFrom: 'SBI CC A/C 3819203912 (Raipur Main Branch)',
    transferTo: 'HDFC CURRENT A/C 9182371928 (Treasury Ops)',
    purpose: 'Site Labour Muster Wage Disbursement Liquidity',
    amount: 500000,
    plannedDate: '14/10/2026',
    remarks: 'Muster roll payout scheduled for 15/10',
    requestedBy: 'Priyanka',
    approvalStatus: 'PENDING',
    bankEntry: 'PENDING',
    paymentStatus: 'PENDING'
  }
];

export const INITIAL_COMPARATIVE_STATEMENTS: ComparativeStatement[] = [
  {
    id: 'cs-barbrik-001',
    companyName: 'Barbrik Project Ltd.',
    site: 'BIJETALA',
    indentNo: '466',
    indentDate: '12/10/2026',
    forPurpose: 'HM LOADER & DG-82.5KVA (CHAKRABORTY JI)',
    statementDate: '13/10/2026',
    status: 'Approved',
    approvedBy: 'Pranjal Agrawal',
    approvalDate: '13/10/2026, 11:30 AM',
    notes: 'Quotation normalized with Freight & Delivery: OURS for all vendors. L-1 item-wise split PO recommended for maximum project cost savings.',
    awardedVendorMap: {
      'it-01': 'vnd-01', // Shanti Earthmovers (L-1)
      'it-02': 'vnd-01', // Shanti Earthmovers (L-1)
      'it-03': 'vnd-02', // Chhattisgarh Diesel (L-1)
      'it-04': 'vnd-01', // Shanti Earthmovers (L-1)
      'it-05': 'vnd-02', // Chhattisgarh Diesel (L-1)
    },
    approvalDetails: {
      approverName: 'Pranjal Agrawal',
      approverDesignation: 'Executive Director / Authorized Signatory',
      approvalDate: '13/10/2026, 11:30 AM',
      remarks: 'Approved with item-wise split PO allocation to maintain dual vendor operational readiness. Freight strictly OURS.',
      signatureStamp: 'BPL-SIG-PA-9482-EXEC-VERIFIED',
    },
    items: [
      { id: 'it-01', sn: 1, itemName: 'GREASE NIPPLE 8NO', brandMake: 'HINO ASCO', unit: 'NOS', qty: 10 },
      { id: 'it-02', sn: 2, itemName: 'OIL FILTER LF-3959 (DG 82.5KVA)', brandMake: 'COMMINS/F.GUARD', unit: 'NOS', qty: 2 },
      { id: 'it-03', sn: 3, itemName: 'HYDRAULIC RETURN FILTER HF-6510', brandMake: 'FLEETGUARD', unit: 'NOS', qty: 4 },
      { id: 'it-04', sn: 4, itemName: 'AIR FILTER CARTRIDGE AF-25292', brandMake: 'DONALDSON', unit: 'SET', qty: 2 },
      { id: 'it-05', sn: 5, itemName: 'DIESEL FILTER ELEMENT FF-5052', brandMake: 'MICO BOSCH', unit: 'NOS', qty: 6 },
    ],
    vendors: [
      {
        vendorId: 'vnd-01',
        vendorName: 'M/s Shanti Earthmovers & Spares',
        rating: '4.5 / 5.0 (Top Rated Local Supplier)',
        contactPersonMobile: 'Amit Ji | Mo: +91-7477230200',
        storeOfficeAddress: 'Shop No. 20, Korba/Karcha Market, MG Road, Korba (C.G.)',
        paymentTerms: '30 Days Credit',
        warrantyPeriod: '01 Year Comprehensive Warranty',
        gstTerms: '18% GST Paid / Included in Quoted Rates',
        freightDeliveryTerms: 'OURS (Barbrik Project Ltd.)',
        quotationDateValidity: '19/08/2026 | 30 Days Validity',
        primaryProductFocus: 'Heavy Equipment Spares & Filtration',
        itemRates: {
          'it-01': { baseRate: 42, gstPercent: 18, gstAmount: 7.56, landedRate: 49.56, amount: 495.6, isQuoted: true },
          'it-02': { baseRate: 850, gstPercent: 18, gstAmount: 153, landedRate: 1003, amount: 2006, isQuoted: true },
          'it-03': { baseRate: 1450, gstPercent: 18, gstAmount: 261, landedRate: 1711, amount: 6844, isQuoted: true },
          'it-04': { baseRate: 2200, gstPercent: 18, gstAmount: 396, landedRate: 2596, amount: 5192, isQuoted: true },
          'it-05': { baseRate: 340, gstPercent: 18, gstAmount: 61.2, landedRate: 401.2, amount: 2407.2, isQuoted: true },
        }
      },
      {
        vendorId: 'vnd-02',
        vendorName: 'M/s Chhattisgarh Diesel & Machinery Store',
        rating: '4.2 / 5.0 (Authorized Distributor)',
        contactPersonMobile: 'Ramesh Verma | Mo: +91-9425211890',
        storeOfficeAddress: 'Transport Nagar, Near Indian Oil Depot, Bilaspur (C.G.)',
        paymentTerms: '100% Advance Payment',
        warrantyPeriod: '06 Months OEM Warranty',
        gstTerms: '18% GST Paid / Included in Quoted Rates',
        freightDeliveryTerms: 'OURS (Barbrik Project Ltd.)',
        quotationDateValidity: '20/08/2026 | 15 Days Validity',
        primaryProductFocus: 'Engine & Filtration Spares',
        itemRates: {
          'it-01': { baseRate: 46, gstPercent: 18, gstAmount: 8.28, landedRate: 54.28, amount: 542.8, isQuoted: true },
          'it-02': { baseRate: 890, gstPercent: 18, gstAmount: 160.2, landedRate: 1050.2, amount: 2100.4, isQuoted: true },
          'it-03': { baseRate: 1380, gstPercent: 18, gstAmount: 248.4, landedRate: 1628.4, amount: 6513.6, isQuoted: true },
          'it-04': { baseRate: 2350, gstPercent: 18, gstAmount: 423, landedRate: 2773, amount: 5546, isQuoted: true },
          'it-05': { baseRate: 320, gstPercent: 18, gstAmount: 57.6, landedRate: 377.6, amount: 2265.6, isQuoted: true },
        }
      },
      {
        vendorId: 'vnd-03',
        vendorName: 'M/s Raipur Heavy Industrial Spares',
        rating: '3.9 / 5.0 (Regional Stockist)',
        contactPersonMobile: 'Suresh Agrawal | Mo: +91-9893124560',
        storeOfficeAddress: 'Industrial Area, Bhanpuri, Raipur (C.G.)',
        paymentTerms: '50% Advance, Balance on Delivery',
        warrantyPeriod: 'Replacement on Manufacturer Defect',
        gstTerms: '18% GST Extra',
        freightDeliveryTerms: 'OURS (Barbrik Project Ltd.)',
        quotationDateValidity: '22/08/2026 | 30 Days Validity',
        primaryProductFocus: 'Earthmoving & Plant Spares',
        itemRates: {
          'it-01': { baseRate: 48, gstPercent: 18, gstAmount: 8.64, landedRate: 56.64, amount: 566.4, isQuoted: true },
          'it-02': { baseRate: 910, gstPercent: 18, gstAmount: 163.8, landedRate: 1073.8, amount: 2147.6, isQuoted: true },
          'it-03': { baseRate: 1420, gstPercent: 18, gstAmount: 255.6, landedRate: 1675.6, amount: 6702.4, isQuoted: true },
          'it-04': { baseRate: 2290, gstPercent: 18, gstAmount: 412.2, landedRate: 2702.2, amount: 5404.4, isQuoted: true },
          'it-05': { baseRate: 350, gstPercent: 18, gstAmount: 63, landedRate: 413, amount: 2478, isQuoted: true },
        }
      }
    ],
    createdAt: '13/10/2026, 10:00 AM',
    updatedAt: '13/10/2026, 10:30 AM'
  }
];

export const INITIAL_VENDOR_PROFILES: VendorProfileRecord[] = [
  {
    id: 'ven-prof-001',
    vendorCode: 'VEN-2026-001',
    tradeName: 'M/S ULTRA TECH CEMENT',
    legalName: 'UltraTech Cement Limited',
    gstin: '22AAACU3456F1Z2',
    pan: 'AAACU3456F',
    category: 'Cement & Concrete',
    contactPerson: 'Rakesh Agrawal (Key Account Manager)',
    phone: '+91 98271 23450',
    email: 'rakesh.agrawal@ultratech.com',
    address: 'Plot 42, Heavy Industrial Area, Bhanpuri',
    city: 'Raipur',
    state: 'Chhattisgarh',
    status: 'ACTIVE',
    bankAccounts: [
      {
        id: 'acc-001',
        beneficiaryName: 'ULTRATECH CEMENT LIMITED',
        tradeVendorName: 'M/S ULTRA TECH CEMENT',
        bankName: 'State Bank of India',
        accountNo: '38291048291',
        accountNoMasked: '••••••••8291',
        ifscCode: 'SBIN0001292',
        accountType: 'CURRENT',
        isPrimary: true,
        verificationStatus: 'VERIFIED',
        verifiedBy: 'Pranjal Agrawal',
        verifiedAt: '10/10/2026',
        cancelledChequeUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        linkedBeneficiarySheetNo: 'BPL/BEN/20261010/01',
        notes: 'Corporate current account with CMS enablement.'
      }
    ],
    notes: 'Primary bulk OPC/PPC cement supplier for Siladehi and Bijetala bridge projects.',
    createdAt: '01/10/2026',
    createdBy: 'System Super Admin'
  },
  {
    id: 'ven-prof-002',
    vendorCode: 'VEN-2026-002',
    tradeName: 'MAHAVIR GAS CHULHA',
    legalName: 'Mahavir Gas Chulha Repair & Services',
    gstin: '22AAGPM9123D1ZK',
    pan: 'AAGPM9123D',
    category: 'Kitchen & Industrial Refills',
    contactPerson: 'Kailash Sahu',
    phone: '+91 94255 19283',
    email: 'mahavir.gas@gmail.com',
    address: 'Shop No. 12, Subhash Chowk, Janjgir',
    city: 'Janjgir-Champa',
    state: 'Chhattisgarh',
    status: 'ACTIVE',
    bankAccounts: [
      {
        id: 'acc-002',
        beneficiaryName: 'MAHAVIR GAS CHULHA REPAIR STORE',
        tradeVendorName: 'MAHAVIR GAS CHULHA',
        bankName: 'State Bank of India',
        accountNo: '381928371923',
        accountNoMasked: '••••••••1923',
        ifscCode: 'SBIN0001292',
        accountType: 'CURRENT',
        isPrimary: true,
        verificationStatus: 'VERIFIED',
        verifiedBy: 'Pranjal Agrawal',
        verifiedAt: '12/10/2026',
        cancelledChequeUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        linkedBeneficiarySheetNo: 'BPL/BEN/20261012/01',
        notes: 'Verified branch current account. Cancelled cheque on file.'
      }
    ],
    notes: 'Local supplier for kitchen cooking fuel and cutting torch gas refills.',
    createdAt: '05/10/2026',
    createdBy: 'Amanat Bharadwaj'
  },
  {
    id: 'ven-prof-003',
    vendorCode: 'VEN-2026-003',
    tradeName: 'KANHAIYA HARDWARE & INDUSTRIAL SUPPLIES',
    legalName: 'Kanhaiya Lal Sahu (Proprietor)',
    gstin: '22AAGPA9182E1Z8',
    pan: 'AAGPA9182E',
    category: 'Hardware & Tools',
    contactPerson: 'Kanhaiya Lal Sahu',
    phone: '+91 94252 88123',
    email: 'kanhaiya.hardware@yahoo.com',
    address: 'Ring Road No. 2, Transport Nagar',
    city: 'Bilaspur',
    state: 'Chhattisgarh',
    status: 'ACTIVE',
    bankAccounts: [
      {
        id: 'acc-003',
        beneficiaryName: 'KANHAIYA LAL SAHU',
        tradeVendorName: 'KANHAIYA HARDWARE & INDUSTRIAL SUPPLIES',
        bankName: 'HDFC Bank Ltd',
        accountNo: '918237192834',
        accountNoMasked: '••••••••2834',
        ifscCode: 'HDFC0000412',
        accountType: 'CURRENT',
        isPrimary: true,
        verificationStatus: 'PENDING',
        cancelledChequeUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        linkedBeneficiarySheetNo: 'BPL/BEN/20261014/01',
        notes: 'Proprietor name mismatch declaration submitted. Director sanction pending.'
      }
    ],
    notes: 'Hardware fastener, power tools and safety consumables provider.',
    createdAt: '06/10/2026',
    createdBy: 'Priyanka'
  },
  {
    id: 'ven-prof-004',
    vendorCode: 'VEN-2026-004',
    tradeName: 'M/S ASHARAM ELECTRICALS',
    legalName: 'Asharam Electricals Private Limited',
    gstin: '22AADCA7712Q1Z4',
    pan: 'AADCA7712Q',
    category: 'Electrical & Automation',
    contactPerson: 'Vikas Sharma (Project Sales)',
    phone: '+91 97555 12040',
    email: 'vikas.sharma@asharamelec.in',
    address: 'Near Old Bus Stand, G.E. Road',
    city: 'Durg',
    state: 'Chhattisgarh',
    status: 'ACTIVE',
    bankAccounts: [
      {
        id: 'acc-004',
        beneficiaryName: 'ASHARAM ELECTRICALS PVT LTD',
        tradeVendorName: 'M/S ASHARAM ELECTRICALS',
        bankName: 'ICICI Bank',
        accountNo: '004205019284',
        accountNoMasked: '••••••••9284',
        ifscCode: 'ICIC0000042',
        accountType: 'CURRENT',
        isPrimary: true,
        verificationStatus: 'VERIFIED',
        verifiedBy: 'Pranjal Agrawal',
        verifiedAt: '08/10/2026',
        cancelledChequeUrl: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
        linkedBeneficiarySheetNo: 'BPL/BEN/20261008/02',
        notes: 'Verified high-voltage cable supplier account.'
      }
    ],
    notes: 'Turnkey electrical panels, LT cables, transformers and sub-station gear.',
    createdAt: '02/10/2026',
    createdBy: 'System Super Admin'
  },
  {
    id: 'ven-prof-005',
    vendorCode: 'VEN-2026-005',
    tradeName: 'M/S PATEL TRADERS',
    legalName: 'Patel Sand & Aggregates Traders',
    gstin: '22BBNPP8821K1Z3',
    pan: 'BBNPP8821K',
    category: 'Aggregates & Sand',
    contactPerson: 'Bhavesh Patel',
    phone: '+91 98930 44211',
    email: 'bhavesh.patel@rediffmail.com',
    address: 'Siladehi Quarry Link Road, Janjgir-Champa',
    city: 'Janjgir-Champa',
    state: 'Chhattisgarh',
    status: 'ACTIVE',
    bankAccounts: [], // NO BANK ACCOUNT YET - testing auto-detection warning in Payment Request
    notes: 'Local river sand and 20mm/40mm coarse aggregates quarry vendor. Banking pending.',
    createdAt: '11/10/2026',
    createdBy: 'Bramhanand Patel'
  },
  {
    id: 'ven-prof-006',
    vendorCode: 'VEN-2026-006',
    tradeName: 'M/S SHREE SHYAM ENTERPRISES',
    legalName: 'Shree Shyam Enterprises',
    gstin: '22AACCS9920M1Z1',
    pan: 'AACCS9920M',
    category: 'Safety & PPE',
    contactPerson: 'Suresh Agarwal',
    phone: '+91 93000 55412',
    email: 'shreeshyam.raipur@gmail.com',
    address: 'Shop 18, Pandri Commercial Complex',
    city: 'Raipur',
    state: 'Chhattisgarh',
    status: 'ACTIVE',
    bankAccounts: [
      {
        id: 'acc-006',
        beneficiaryName: 'SHREE SHYAM ENTERPRISES',
        tradeVendorName: 'M/S SHREE SHYAM ENTERPRISES',
        bankName: 'Axis Bank',
        accountNo: '921020038471928',
        accountNoMasked: '••••••••1928',
        ifscCode: 'UTIB0000128',
        accountType: 'CURRENT',
        isPrimary: true,
        verificationStatus: 'PENDING', // PENDING & NO CANCELLED CHEQUE - prompts cheque upload!
        notes: 'Bank details submitted, pending physical cancelled cheque copy.'
      }
    ],
    notes: 'Helmets, safety shoes, reflective jackets and personal protection equipment.',
    createdAt: '09/10/2026',
    createdBy: 'Amanat Bharadwaj'
  }
];

