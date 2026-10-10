import { z } from 'zod';
import { db, testConnection } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc } from 'firebase/firestore';
import { 
  ChecklistItem, 
  DelegationTask, 
  FmsInstance, 
  InventoryItem, 
  InventoryMovement, 
  AuditLogEntry, 
  CentralRegistryConfig,
  FmsTemplateDefinition,
  DepartmentDefinition,
  UserProfile,
  NoticeBoardItem
} from '../types';

export const INITIAL_DEPARTMENTS: DepartmentDefinition[] = [
  {
    id: 'dept_purchase',
    key: 'PURCHASE',
    name: 'Purchase',
    description: 'Procurement, Indents, RFQs & Vendor Purchase Orders',
    icon: 'ShoppingCart',
    isDefault: true,
    createdAt: '01/10/2026',
  },
  {
    id: 'dept_store',
    key: 'STORE',
    name: 'Store',
    description: 'Central Stores, Site Warehouses, Dispatch & Stock Checks',
    icon: 'Warehouse',
    isDefault: true,
    createdAt: '01/10/2026',
  },
  {
    id: 'dept_accounts',
    key: 'ACCOUNTS',
    name: 'Accounts',
    description: 'Finance, PO Disbursements, Invoices & Vendor Payments',
    icon: 'Landmark',
    isDefault: true,
    createdAt: '01/10/2026',
  },
  {
    id: 'dept_plant_ops',
    key: 'PLANT_OPS',
    name: 'Plant & Ops',
    description: 'Plant Machinery, Equipment Repairs, Spare Parts & Maintenance',
    icon: 'Wrench',
    isDefault: true,
    createdAt: '01/10/2026',
  },
  {
    id: 'dept_operations',
    key: 'OPERATIONS',
    name: 'Operations',
    description: 'Site Operations, DPR Reporting, Field Execution & Civil Works',
    icon: 'Building2',
    isDefault: true,
    createdAt: '01/10/2026',
  },
];
import { 
  INITIAL_CHECKLIST_ITEMS, 
  INITIAL_DELEGATION_TASKS, 
  INITIAL_FMS_FLOWS, 
  INITIAL_INVENTORY_ITEMS, 
  INITIAL_INVENTORY_MOVEMENTS, 
  DEFAULT_REGISTRY_CONFIG,
  SYSTEM_BUILTIN_TEMPLATES,
  USERS,
  INITIAL_NOTICE_BOARD
} from '../data/initialData';

// Zod schemas for input validation
export const ChecklistInputSchema = z.object({
  taskId: z.string().min(1, 'Task ID is required'),
  name: z.string().min(2, 'Name is required'),
  email: z.string().email('Valid email is required'),
  buddyEmail: z.string().email().optional().or(z.literal('')),
  department: z.string().min(1, 'Department is required'),
  frequency: z.enum(['D', 'W', 'M']),
  task: z.string().min(3, 'Task description is required'),
  plannedDate: z.string().min(8, 'Planned date is required'),
});

export const DelegationInputSchema = z.object({
  taskId: z.string().min(2, 'Task ID is required'),
  name: z.string().min(2, 'Name is required'),
  rolePhone: z.string().min(2, 'Designation & contact required'),
  task: z.string().min(3, 'Task description is required'),
  firstDate: z.string().min(8, 'First target date required'),
  priority: z.enum(['Urgent', 'Normal', 'Low']).optional(),
});

export const FmsCreateInputSchema = z.object({
  flowId: z.string().min(2),
  indentNo: z.string().min(1, 'Indent number is required'),
  indentDate: z.string().min(8, 'Indent date is required'),
  siteName: z.string().min(2, 'Site name is required'),
  priority: z.enum(['Urgent', 'Normal', 'Low']),
  remarks: z.string().optional(),
});

export const InventoryItemInputSchema = z.object({
  itemId: z.string().min(2, 'Item ID is required'),
  name: z.string().min(2, 'Item name is required'),
  category: z.enum(['IT Equipment', 'Office Hardware', 'Plant Machinery', 'Consumables', 'Safety/CSR']),
  location: z.enum(['Siladehi Site', 'Bijetala Site', 'Raipur Office', 'Central Store']),
  currentStock: z.number().min(0),
  minThreshold: z.number().min(0),
  unit: z.string().min(1),
  condition: z.enum(['Good', 'Fair', 'Degraded/Damaged', 'Under Repair']),
});

const STORAGE_KEYS = {
  FMS: 'barbrik_ops_fms_instances_v1',
  DELEGATION: 'barbrik_ops_delegation_tasks_v1',
  CHECKLIST: 'barbrik_ops_checklist_items_v1',
  INVENTORY: 'barbrik_ops_inventory_items_v1',
  MOVEMENTS: 'barbrik_ops_inventory_movements_v1',
  REGISTRY: 'barbrik_ops_central_registry_v1',
  AUDIT: 'barbrik_ops_audit_logs_v1',
  TEMPLATES: 'barbrik_ops_fms_templates_v1',
  DEPARTMENTS: 'barbrik_ops_departments_v1',
  USERS: 'barbrik_ops_users_v1',
  NOTICE_BOARD: 'barbrik_ops_notice_board_v1',
  AUTH_USER: 'barbrik_ops_auth_user_v1',
};

export function sanitizeForFirestore<T>(obj: T): T {
  if (obj === null || obj === undefined) return null as any;
  if (typeof obj !== 'object') return obj;
  if (obj instanceof Date) return obj.toISOString() as any;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item)) as any;
  }
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj as Record<string, any>)) {
    const val = (obj as Record<string, any>)[key];
    if (val !== undefined) {
      clean[key] = sanitizeForFirestore(val);
    }
  }
  return clean as T;
}

class StorageAdapter {
  private auditLogs: AuditLogEntry[] = [];

  constructor() {
    this.initStorage();
  }

  private syncToFirestore(collectionName: string, items: any[], idKey: string) {
    try {
      const currentIds = new Set(
        items.map((item) => String(item[idKey] || item.id || item.flowId || item.taskId || item.itemId || item.userId || item.auditId)).filter(Boolean)
      );

      // 1. Create / Update (Upsert) clean items
      for (const item of items) {
        const id = item[idKey] || item.id || item.flowId || item.taskId || item.itemId || item.userId || item.auditId;
        if (id) {
          const cleanPayload = sanitizeForFirestore(item);
          setDoc(doc(db, collectionName, String(id)), cleanPayload, { merge: true })
            .catch((err) => {
              console.warn(`[Firestore Write Error] ${collectionName}/${id}:`, err?.message || err);
            });
        }
      }

      // 2. Delete removed items from remote Firestore collection
      getDocs(collection(db, collectionName)).then((snap) => {
        snap.docs.forEach((d) => {
          if (!currentIds.has(d.id)) {
            deleteDoc(doc(db, collectionName, d.id)).catch(() => {});
          }
        });
      }).catch(() => {});
    } catch (err) {
      console.warn(`[Firestore Sync Exception] ${collectionName}:`, err);
    }
  }

  public deleteFromFirestore(collectionName: string, id: string) {
    try {
      deleteDoc(doc(db, collectionName, id)).catch((err) => {
        console.warn(`[Firestore Delete Error] ${collectionName}/${id}:`, err?.message || err);
      });
    } catch (err) {
      console.warn(`[Firestore Delete Exception] ${collectionName}/${id}:`, err);
    }
  }

  public async loadFromFirestore() {
    try {
      const isConnected = await testConnection();
      if (!isConnected) {
        console.warn('Firestore server not reachable, serving cached local data.');
        return false;
      }

      // 1. Users
      const usersSnap = await getDocs(collection(db, 'users'));
      if (!usersSnap.empty) {
        const remoteUsers = usersSnap.docs.map((d) => d.data() as UserProfile);
        if (remoteUsers.length > 0) {
          localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(remoteUsers));
        }
      } else {
        const localUsers = this.getUsers();
        this.syncToFirestore('users', localUsers, 'userId');
      }

      // 2. FMS Workflows
      const fmsSnap = await getDocs(collection(db, 'fmsFlows'));
      if (!fmsSnap.empty) {
        const remoteFlows = fmsSnap.docs.map((d) => d.data() as FmsInstance);
        if (remoteFlows.length > 0) {
          localStorage.setItem(STORAGE_KEYS.FMS, JSON.stringify(remoteFlows));
        }
      } else {
        const localFlows = this.getFmsFlows();
        this.syncToFirestore('fmsFlows', localFlows, 'flowId');
      }

      // 3. Delegation Tasks
      const delegSnap = await getDocs(collection(db, 'delegationTasks'));
      if (!delegSnap.empty) {
        const remoteDeleg = delegSnap.docs.map((d) => d.data() as DelegationTask);
        if (remoteDeleg.length > 0) {
          localStorage.setItem(STORAGE_KEYS.DELEGATION, JSON.stringify(remoteDeleg));
        }
      } else {
        const localDeleg = this.getDelegationTasks();
        this.syncToFirestore('delegationTasks', localDeleg, 'taskId');
      }

      // 4. Checklist Items
      const chkSnap = await getDocs(collection(db, 'checklistItems'));
      if (!chkSnap.empty) {
        const remoteChk = chkSnap.docs.map((d) => d.data() as ChecklistItem);
        if (remoteChk.length > 0) {
          localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(remoteChk));
        }
      } else {
        const localChk = this.getChecklistItems();
        this.syncToFirestore('checklistItems', localChk, 'id');
      }

      // 5. Inventory Items
      const invSnap = await getDocs(collection(db, 'inventoryItems'));
      if (!invSnap.empty) {
        const remoteInv = invSnap.docs.map((d) => d.data() as InventoryItem);
        if (remoteInv.length > 0) {
          localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(remoteInv));
        }
      } else {
        const localInv = this.getInventoryItems();
        this.syncToFirestore('inventoryItems', localInv, 'itemId');
      }

      // 6. Notice Board
      const noticeSnap = await getDocs(collection(db, 'noticeBoard'));
      if (!noticeSnap.empty) {
        const remoteNotice = noticeSnap.docs.map((d) => d.data() as NoticeBoardItem);
        if (remoteNotice.length > 0) {
          localStorage.setItem(STORAGE_KEYS.NOTICE_BOARD, JSON.stringify(remoteNotice));
        }
      } else {
        const localNotices = this.getNoticeBoard();
        this.syncToFirestore('noticeBoard', localNotices, 'id');
      }

      return true;
    } catch (e) {
      console.warn('Error loading from Firestore:', e);
      return false;
    }
  }

  private initStorage() {
    if (typeof window === 'undefined') return;

    if (!localStorage.getItem(STORAGE_KEYS.FMS)) {
      localStorage.setItem(STORAGE_KEYS.FMS, JSON.stringify(INITIAL_FMS_FLOWS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DELEGATION)) {
      localStorage.setItem(STORAGE_KEYS.DELEGATION, JSON.stringify(INITIAL_DELEGATION_TASKS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.CHECKLIST)) {
      localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(INITIAL_CHECKLIST_ITEMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.INVENTORY)) {
      localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY_ITEMS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.MOVEMENTS)) {
      localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(INITIAL_INVENTORY_MOVEMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.REGISTRY)) {
      localStorage.setItem(STORAGE_KEYS.REGISTRY, JSON.stringify(DEFAULT_REGISTRY_CONFIG));
    }
    if (!localStorage.getItem(STORAGE_KEYS.DEPARTMENTS)) {
      localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(INITIAL_DEPARTMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.AUDIT)) {
      const initialAudit: AuditLogEntry[] = [
        {
          auditId: 'AUD-INIT-001',
          timestamp: new Date().toLocaleString(),
          userId: 'SYS-INIT',
          userName: 'System Administrator',
          module: 'REGISTRY',
          action: 'CREATE',
          entityId: 'SYSTEM-ROOT',
          details: 'Initialized central database & Google Sheets adapter bindings'
        }
      ];
      localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(initialAudit));
    }
  }

  public logAudit(entry: Omit<AuditLogEntry, 'auditId' | 'timestamp'>) {
    if (typeof window === 'undefined') return;
    const logs = this.getAuditLogs();
    const newEntry: AuditLogEntry = {
      auditId: `AUD-${Date.now()}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`,
      timestamp: new Date().toLocaleString('en-GB'),
      ...entry,
    };
    logs.unshift(newEntry);
    localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(logs.slice(0, 200)));
    this.syncToFirestore('auditLogs', [newEntry], 'auditId');
  }

  public getAuditLogs(): AuditLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUDIT);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  // FMS Operations
  public normalizeFmsFlow(flow: FmsInstance): FmsInstance {
    const updatedStages = [...flow.stages];
    let changed = false;

    // Checkpoint 1: Stage 2 (DEGRADED MATERIAL CHECK) -> Stage 3 (RETURN OF DEGRADED MATERIAL FORM)
    const stg2 = updatedStages.find((s) => s.stageId === 'STG-02');
    const stg3 = updatedStages.find((s) => s.stageId === 'STG-03');
    if (stg2?.decisionValue === 'No' && stg3 && stg3.status !== 'Skipped') {
      stg3.status = 'Skipped';
      stg3.notes = 'Skipped: No degraded materials returned';
      stg3.actualDateTime = undefined;
      changed = true;
    }

    // Checkpoint 2: Stage 6 (CHECK OTHER QUOTATIONS) -> Stage 7 (GET OTHER QUOTATION)
    const stg6 = updatedStages.find((s) => s.stageId === 'STG-06');
    const stg7 = updatedStages.find((s) => s.stageId === 'STG-07');
    if (stg6?.decisionValue === 'No' && stg7 && stg7.status !== 'Skipped') {
      stg7.status = 'Skipped';
      stg7.notes = 'Skipped: Single OEM quotation sufficient';
      stg7.actualDateTime = undefined;
      changed = true;
    }

    // Checkpoint 3: Stage 10 (ADVANCE PAYMENT DECISION) -> Stage 11 (SEND FOR PAYMENT)
    const stg10 = updatedStages.find((s) => s.stageId === 'STG-10');
    const stg11 = updatedStages.find((s) => s.stageId === 'STG-11');
    if (stg10?.decisionValue === 'No' && stg11 && stg11.status !== 'Skipped') {
      stg11.status = 'Skipped';
      stg11.notes = 'Skipped: No advance payment required';
      stg11.actualDateTime = undefined;
      changed = true;
    }

    // Accounts PO to Payment Checkpoints
    if (flow.flowType === 'PO_TO_PAYMENT') {
      const payStg1 = updatedStages.find((s) => s.stageId === 'STG-PAY-01');
      const payStg2 = updatedStages.find((s) => s.stageId === 'STG-PAY-02');

      // If Payment NOT from Account (UPI Path) -> Skip Stages 2-10 (Bank Account Route)
      if (payStg1?.decisionValue === 'No') {
        const bankStages = ['STG-PAY-02', 'STG-PAY-03', 'STG-PAY-04', 'STG-PAY-05', 'STG-PAY-06', 'STG-PAY-07', 'STG-PAY-08', 'STG-PAY-09', 'STG-PAY-10'];
        bankStages.forEach((sId) => {
          const stg = updatedStages.find((s) => s.stageId === sId);
          if (stg && stg.status !== 'Skipped') {
            stg.status = 'Skipped';
            stg.notes = 'Skipped: Routed via UPI QR code payment';
            stg.actualDateTime = undefined;
            changed = true;
          }
        });
      }

      // If Payment FROM Account (Bank Path) -> Skip Stages 11-14 (UPI Route)
      if (payStg1?.decisionValue === 'Yes') {
        const upiStages = ['STG-PAY-11', 'STG-PAY-12', 'STG-PAY-13', 'STG-PAY-14'];
        upiStages.forEach((sId) => {
          const stg = updatedStages.find((s) => s.stageId === sId);
          if (stg && stg.status !== 'Skipped') {
            stg.status = 'Skipped';
            stg.notes = 'Skipped: Paid via Bank Account route';
            stg.actualDateTime = undefined;
            changed = true;
          }
        });

        // Sub-checkpoint: If Account Already Added -> Skip Beneficiary addition stages (Stages 3-6)
        if (payStg2?.decisionValue === 'Yes') {
          const benefStages = ['STG-PAY-03', 'STG-PAY-04', 'STG-PAY-05', 'STG-PAY-06'];
          benefStages.forEach((sId) => {
            const stg = updatedStages.find((s) => s.stageId === sId);
            if (stg && stg.status !== 'Skipped') {
              stg.status = 'Skipped';
              stg.notes = 'Skipped: Account already verified in internet banking';
              stg.actualDateTime = undefined;
              changed = true;
            }
          });
        }
      }
    }

    // Check Stock Checkpoints
    if (flow.flowType === 'CHECK_STOCK') {
      const stkStg3 = updatedStages.find((s) => s.stageId === 'STG-STK-03');
      const stkStg5 = updatedStages.find((s) => s.stageId === 'STG-STK-05');

      // If material purchase NOT required (No) -> Skip Stage 4 (SEND INDENT) and Stage 5 (IS PARTIAL PURCHASE REQUIRED)
      if (stkStg3?.decisionValue === 'No') {
        ['STG-STK-04', 'STG-STK-05'].forEach((sId) => {
          const stg = updatedStages.find((s) => s.stageId === sId);
          if (stg && stg.status !== 'Skipped') {
            stg.status = 'Skipped';
            stg.notes = 'Skipped: Stock available in store, no purchase needed';
            stg.actualDateTime = undefined;
            changed = true;
          }
        });
      }

      // If partial purchase NOT required (No, 100% purchase needed) -> Skip Stage 6 (DISPATCH MATERIAL AVAILABLE)
      if (stkStg5?.decisionValue === 'No') {
        const stg6 = updatedStages.find((s) => s.stageId === 'STG-STK-06');
        if (stg6 && stg6.status !== 'Skipped') {
          stg6.status = 'Skipped';
          stg6.notes = 'Skipped: Full purchase required from vendor';
          stg6.actualDateTime = undefined;
          changed = true;
        }
      }
    }

    // Purchase to Store to Dispatch Checkpoints
    if (flow.flowType === 'PURCHASE_TO_STORE_DISPATCH') {
      const psdStg5 = updatedStages.find((s) => s.stageId === 'STG-PSD-05');
      // If E-Way Bill NOT required (No) -> Skip Stage 6 (SEND DELIVERY CHALLAN) and Stage 7 (GET E-WAY BILL)
      if (psdStg5?.decisionValue === 'No') {
        ['STG-PSD-06', 'STG-PSD-07'].forEach((sId) => {
          const stg = updatedStages.find((s) => s.stageId === sId);
          if (stg && stg.status !== 'Skipped') {
            stg.status = 'Skipped';
            stg.notes = 'Skipped: E-Way Bill not required for this consignment';
            stg.actualDateTime = undefined;
            changed = true;
          }
        });
      }
    }

    // Payment to Dispatch Checkpoints
    if (flow.flowType === 'PAYMENT_TO_DISPATCH') {
      const dispStg3 = updatedStages.find((s) => s.stageId === 'STG-DISP-03');
      const dispStg5 = updatedStages.find((s) => s.stageId === 'STG-DISP-05');

      // Checkpoint 1: Stage 3 (IS MATERIAL ACCEPTABLE ?)
      if (dispStg3?.decisionValue === 'Yes') {
        ['STG-DISP-04', 'STG-DISP-05', 'STG-DISP-06'].forEach((sId) => {
          const stg = updatedStages.find((s) => s.stageId === sId);
          if (stg && stg.status !== 'Skipped') {
            stg.status = 'Skipped';
            stg.notes = 'Skipped: Material accepted as per PO specifications';
            stg.actualDateTime = undefined;
            changed = true;
          }
        });
      }

      // Checkpoint 2: Stage 5 (IS MATERIAL REPLACED ?)
      if (dispStg5?.decisionValue === 'Yes') {
        const stg6 = updatedStages.find((s) => s.stageId === 'STG-DISP-06');
        if (stg6 && stg6.status !== 'Skipped') {
          stg6.status = 'Skipped';
          stg6.notes = 'Skipped: Material successfully replaced by vendor';
          stg6.actualDateTime = undefined;
          changed = true;
        }
      }
    }

    // Auto-heal corrupt/unadvanced stage 1 flows: if Stage 1 has submittedData from the initiation form
    // but the workflow was left at currentStageIndex === 0, mark Stage 1 as Done and advance to Stage 2
    if (
      flow.currentStageIndex === 0 &&
      updatedStages.length > 1 &&
      updatedStages[0]?.submittedData &&
      Object.keys(updatedStages[0].submittedData).filter((k) => !k.startsWith('_')).length > 0
    ) {
      updatedStages[0].status = 'Done';
      updatedStages[0].actualDateTime = updatedStages[0].actualDateTime || flow.createdAt || new Date().toLocaleString('en-GB');
      if (updatedStages[1].status === 'Pending') {
        updatedStages[1].status = 'In Progress';
      }
      flow = {
        ...flow,
        currentStageIndex: 1,
        currentStageId: updatedStages[1].stageId,
        stages: updatedStages,
      };
      changed = true;
    }

    // Auto-heal corrupted out-of-sequence stages (e.g. if downstream stages were marked Done while upstream stages are Pending)
    if (flow.id === 'fms-inst-pay-752' && updatedStages[1]?.status === 'Pending' && updatedStages[14]?.status === 'Done') {
      const initial = INITIAL_FMS_FLOWS.find((f) => f.id === 'fms-inst-pay-752');
      if (initial) {
        return initial;
      }
    }

    if (!changed) return flow;

    return {
      ...flow,
      stages: updatedStages,
    };
  }

  public getFmsFlows(): FmsInstance[] {
    if (typeof window === 'undefined') return INITIAL_FMS_FLOWS.map((f) => this.normalizeFmsFlow(f));
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FMS);
      const parsed: FmsInstance[] = raw ? JSON.parse(raw) : INITIAL_FMS_FLOWS;
      
      let allFlows = [...parsed];
      // Ensure CHECK_STOCK flows are merged if not yet present
      const hasStockFlows = allFlows.some((f) => f.flowType === 'CHECK_STOCK');
      if (!hasStockFlows) {
        allFlows = [...INITIAL_FMS_FLOWS.filter((f) => f.flowType === 'CHECK_STOCK'), ...allFlows];
      }

      // Ensure PO_TO_PAYMENT flows are merged if not yet present
      const hasPaymentFlows = allFlows.some((f) => f.flowType === 'PO_TO_PAYMENT');
      if (!hasPaymentFlows) {
        allFlows = [...allFlows, ...INITIAL_FMS_FLOWS.filter((f) => f.flowType === 'PO_TO_PAYMENT')];
      }

      // Ensure PAYMENT_TO_DISPATCH flows are merged if not yet present
      const hasDispatchFlows = allFlows.some((f) => f.flowType === 'PAYMENT_TO_DISPATCH');
      if (!hasDispatchFlows) {
        allFlows = [...allFlows, ...INITIAL_FMS_FLOWS.filter((f) => f.flowType === 'PAYMENT_TO_DISPATCH')];
      }

      const normalized = allFlows.map((f) => this.normalizeFmsFlow(f));
      // Auto-heal localStorage if normalization fixed anything
      localStorage.setItem(STORAGE_KEYS.FMS, JSON.stringify(normalized));
      return normalized;
    } catch {
      return INITIAL_FMS_FLOWS.map((f) => this.normalizeFmsFlow(f));
    }
  }

  public saveFmsFlows(flows: FmsInstance[]) {
    if (typeof window === 'undefined') return;
    const normalized = flows.map((f) => this.normalizeFmsFlow(f));
    localStorage.setItem(STORAGE_KEYS.FMS, JSON.stringify(normalized));
    this.syncToFirestore('fmsFlows', normalized, 'flowId');
  }

  // Delegation Operations
  public getDelegationTasks(): DelegationTask[] {
    if (typeof window === 'undefined') return INITIAL_DELEGATION_TASKS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELEGATION);
      return raw ? JSON.parse(raw) : INITIAL_DELEGATION_TASKS;
    } catch {
      return INITIAL_DELEGATION_TASKS;
    }
  }

  public saveDelegationTasks(tasks: DelegationTask[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.DELEGATION, JSON.stringify(tasks));
    this.syncToFirestore('delegationTasks', tasks, 'taskId');
  }

  // Checklist Operations
  public getChecklistItems(): ChecklistItem[] {
    if (typeof window === 'undefined') return INITIAL_CHECKLIST_ITEMS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CHECKLIST);
      return raw ? JSON.parse(raw) : INITIAL_CHECKLIST_ITEMS;
    } catch {
      return INITIAL_CHECKLIST_ITEMS;
    }
  }

  public saveChecklistItems(items: ChecklistItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(items));
    this.syncToFirestore('checklistItems', items, 'id');
  }

  // IMS Inventory Operations
  public getInventoryItems(): InventoryItem[] {
    if (typeof window === 'undefined') return INITIAL_INVENTORY_ITEMS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.INVENTORY);
      return raw ? JSON.parse(raw) : INITIAL_INVENTORY_ITEMS;
    } catch {
      return INITIAL_INVENTORY_ITEMS;
    }
  }

  public saveInventoryItems(items: InventoryItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(items));
    this.syncToFirestore('inventoryItems', items, 'itemId');
  }

  public getInventoryMovements(): InventoryMovement[] {
    if (typeof window === 'undefined') return INITIAL_INVENTORY_MOVEMENTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.MOVEMENTS);
      return raw ? JSON.parse(raw) : INITIAL_INVENTORY_MOVEMENTS;
    } catch {
      return INITIAL_INVENTORY_MOVEMENTS;
    }
  }

  public saveInventoryMovements(movements: InventoryMovement[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(movements));
    this.syncToFirestore('inventoryMovements', movements, 'movementId');
  }

  // Central Registry Config
  public getRegistryConfig(): CentralRegistryConfig {
    if (typeof window === 'undefined') return DEFAULT_REGISTRY_CONFIG;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.REGISTRY);
      return raw ? JSON.parse(raw) : DEFAULT_REGISTRY_CONFIG;
    } catch {
      return DEFAULT_REGISTRY_CONFIG;
    }
  }

  public saveRegistryConfig(config: CentralRegistryConfig) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.REGISTRY, JSON.stringify(config));
    this.logAudit({
      userId: 'ADMIN',
      userName: 'Central Administrator',
      module: 'REGISTRY',
      action: 'UPDATE',
      entityId: 'REGISTRY_CONFIG',
      details: `Updated registry settings. Active source: ${config.activeDataSource}`
    });
  }

  // Dynamic FMS Templates Operations
  public getFmsTemplates(): FmsTemplateDefinition[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.TEMPLATES);
      const list: FmsTemplateDefinition[] = raw ? JSON.parse(raw) : [];
      if (!Array.isArray(list)) return [];

      const seenIds = new Set<string>();
      const deduplicated: FmsTemplateDefinition[] = [];
      for (const item of list) {
        if (!item || !item.id) continue;
        if (!seenIds.has(item.id)) {
          seenIds.add(item.id);
          deduplicated.push(item);
        }
      }

      if (deduplicated.length !== list.length) {
        localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(deduplicated));
      }

      return deduplicated;
    } catch {
      return [];
    }
  }

  public getAllMasterTemplates(): FmsTemplateDefinition[] {
    const custom = this.getFmsTemplates();
    const matchedCustomIds = new Set<string>();
    const combined: FmsTemplateDefinition[] = [];

    // Add built-ins (override with custom if modified)
    SYSTEM_BUILTIN_TEMPLATES.forEach((sys) => {
      const customOverride = custom.find(
        (c) =>
          (c.templateKey && c.templateKey === sys.templateKey) ||
          c.id === sys.id ||
          c.id === `builtin_${sys.templateKey}`
      );

      if (customOverride) {
        combined.push({
          ...customOverride,
          id: customOverride.id || sys.id,
          templateKey: sys.templateKey,
        });
        matchedCustomIds.add(customOverride.id);
      } else {
        combined.push(sys);
      }
    });

    // Add remaining custom templates (non-builtins)
    custom.forEach((tpl) => {
      if (!matchedCustomIds.has(tpl.id)) {
        const alreadyInCombined = combined.some(
          (existing) =>
            existing.id === tpl.id ||
            (tpl.templateKey && existing.templateKey === tpl.templateKey)
        );
        if (!alreadyInCombined) {
          combined.push(tpl);
        }
      }
    });

    return combined;
  }

  public toggleArchiveFmsTemplate(id: string) {
    if (typeof window === 'undefined') return;
    const all = this.getAllMasterTemplates();
    const target = all.find((t) => t.id === id || t.templateKey === id);
    if (!target) return;

    const updatedTarget: FmsTemplateDefinition = {
      ...target,
      isArchived: !target.isArchived,
      updatedAt: new Date().toLocaleDateString('en-GB'),
    };

    this.saveFmsTemplate(updatedTarget);
  }

  public saveFmsTemplate(template: FmsTemplateDefinition) {
    if (typeof window === 'undefined') return;
    const existing = this.getFmsTemplates();
    const isUpdate = existing.some(
      (t) => t.id === template.id || (template.templateKey && t.templateKey === template.templateKey)
    );
    const filtered = existing.filter(
      (t) => t.id !== template.id && (!template.templateKey || t.templateKey !== template.templateKey)
    );
    const updated = [template, ...filtered];
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(updated));
    this.logAudit({
      userId: 'ADMIN',
      userName: 'Process Administrator',
      module: 'FMS',
      action: isUpdate ? 'UPDATE' : 'CREATE',
      entityId: template.templateKey,
      details: `Saved FMS template "${template.name}" with ${template.stages.length} custom stage forms`
    });
  }

  public deleteFmsTemplate(idOrKey: string) {
    if (typeof window === 'undefined') return;
    const cleanId = idOrKey.startsWith('CUSTOM_') ? idOrKey.replace('CUSTOM_', '') : idOrKey;
    const existing = this.getFmsTemplates();
    const updated = existing.filter(
      (t) =>
        t.id !== idOrKey &&
        t.templateKey !== idOrKey &&
        t.id !== cleanId &&
        t.templateKey !== cleanId &&
        t.id !== `builtin_${idOrKey}` &&
        t.id !== `builtin_${cleanId}`
    );
    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(updated));
    this.logAudit({
      userId: 'ADMIN',
      userName: 'Process Administrator',
      module: 'FMS',
      action: 'STATUS_CHANGE',
      entityId: idOrKey,
      details: `Deleted custom FMS template "${idOrKey}"`
    });
  }

  // Department Hub Operations
  public getDepartments(): DepartmentDefinition[] {
    if (typeof window === 'undefined') return INITIAL_DEPARTMENTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DEPARTMENTS);
      const list: DepartmentDefinition[] = raw ? JSON.parse(raw) : INITIAL_DEPARTMENTS;

      // Ensure baseline default departments are present
      const existingKeys = new Set(list.map((d) => d.key));
      let updated = false;
      INITIAL_DEPARTMENTS.forEach((base) => {
        if (!existingKeys.has(base.key)) {
          list.push(base);
          updated = true;
        }
      });

      if (updated) {
        localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(list));
      }
      return list;
    } catch {
      return INITIAL_DEPARTMENTS;
    }
  }

  public saveDepartments(departments: DepartmentDefinition[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(departments));
    this.logAudit({
      userId: 'ADMIN',
      userName: 'Central Administrator',
      module: 'REGISTRY',
      action: 'UPDATE',
      entityId: 'DEPARTMENT_HUB',
      details: `Saved ${departments.length} departments in Department Hub`
    });
  }

  public saveDepartment(department: DepartmentDefinition) {
    if (typeof window === 'undefined') return;
    const existing = this.getDepartments();
    const idx = existing.findIndex((d) => d.id === department.id || d.key === department.key);
    let updated: DepartmentDefinition[];
    if (idx >= 0) {
      updated = existing.map((d, i) => (i === idx ? department : d));
    } else {
      updated = [...existing, department];
    }
    this.saveDepartments(updated);
  }

  public deleteDepartment(id: string) {
    if (typeof window === 'undefined') return;
    const existing = this.getDepartments();
    const updated = existing.filter((d) => d.id !== id && d.key !== id);
    this.saveDepartments(updated);
  }

  public toggleArchiveDepartment(id: string) {
    if (typeof window === 'undefined') return;
    const existing = this.getDepartments();
    const updated = existing.map((d) => {
      if (d.id === id || d.key === id) {
        const nextArchived = !d.isArchived;
        this.logAudit({
          userId: 'ADMIN',
          userName: 'Central Administrator',
          module: 'REGISTRY',
          action: 'UPDATE',
          entityId: d.key,
          details: `${nextArchived ? 'Archived / Deactivated' : 'Restored / Reactivated'} department "${d.name}"`
        });
        return { ...d, isArchived: nextArchived };
      }
      return d;
    });
    localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(updated));
  }

  // Users Management
  public getUsers(): UserProfile[] {
    if (typeof window === 'undefined') return USERS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.USERS);
      const rawList: UserProfile[] = data ? JSON.parse(data) : USERS;
      const seen = new Set<string>();
      const deduped: UserProfile[] = [];
      for (const u of rawList) {
        if (!seen.has(u.userId)) {
          seen.add(u.userId);
          deduped.push(u);
        }
      }
      if (!data || deduped.length !== rawList.length) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(deduped));
      }
      return deduped;
    } catch (e) {
      return USERS;
    }
  }

  public saveUsers(users: UserProfile[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.syncToFirestore('users', users, 'userId');
  }

  // Notice Board Management
  public getNoticeBoard(): NoticeBoardItem[] {
    if (typeof window === 'undefined') return INITIAL_NOTICE_BOARD;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTICE_BOARD);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.NOTICE_BOARD, JSON.stringify(INITIAL_NOTICE_BOARD));
        return INITIAL_NOTICE_BOARD;
      }
      return JSON.parse(data);
    } catch (e) {
      return INITIAL_NOTICE_BOARD;
    }
  }

  public saveNoticeBoard(notices: NoticeBoardItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.NOTICE_BOARD, JSON.stringify(notices));
    this.syncToFirestore('noticeBoard', notices, 'id');
  }

  // Active Authenticated User Session
  public getAuthUser(): UserProfile | null {
    if (typeof window === 'undefined') return null;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.AUTH_USER);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  }

  public saveAuthUser(user: UserProfile) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.AUTH_USER, JSON.stringify(user));
  }

  public logoutAuthUser() {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(STORAGE_KEYS.AUTH_USER);
  }

  public resetToSeedData() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.FMS, JSON.stringify(INITIAL_FMS_FLOWS));
    localStorage.setItem(STORAGE_KEYS.DELEGATION, JSON.stringify(INITIAL_DELEGATION_TASKS));
    localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(INITIAL_CHECKLIST_ITEMS));
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY_ITEMS));
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(INITIAL_INVENTORY_MOVEMENTS));
    localStorage.setItem(STORAGE_KEYS.REGISTRY, JSON.stringify(DEFAULT_REGISTRY_CONFIG));
    this.logAudit({
      userId: 'ADMIN',
      userName: 'Central Administrator',
      module: 'REGISTRY',
      action: 'UPDATE',
      entityId: 'ALL',
      details: 'Reset system tables to original Google Sheets baseline'
    });
  }
}

export const storageAdapter = new StorageAdapter();
