import { z } from 'zod';
import { db, testConnection } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
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
  NoticeBoardItem,
  AppNotification
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
  INITIAL_NOTICE_BOARD,
  INITIAL_NOTIFICATIONS
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

export function getEnvCollectionName(baseName: string): string {
  if (typeof window === 'undefined') return baseName;
  const isDev =
    window.location.hostname.includes('ais-dev-') ||
    window.location.hostname === 'localhost' ||
    Boolean(import.meta.env.DEV);

  return isDev ? `dev_${baseName}` : baseName;
}

export function getStorageKey(baseKey: string): string {
  if (typeof window === 'undefined') return baseKey;
  const isDev =
    window.location.hostname.includes('ais-dev-') ||
    window.location.hostname === 'localhost' ||
    Boolean(import.meta.env.DEV);

  return isDev ? `dev_${baseKey}` : baseKey;
}

const RAW_STORAGE_KEYS = {
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
  NOTIFICATIONS: 'barbrik_ops_notifications_v1',
  DELETED_FLOWS: 'barbrik_ops_deleted_flow_ids_v1',
  DELETED_TEMPLATES: 'barbrik_ops_deleted_template_keys_v1',
  DELETED_DELEGATION: 'barbrik_ops_deleted_delegation_ids_v1',
  DELETED_CHECKLIST: 'barbrik_ops_deleted_checklist_ids_v1',
};

const STORAGE_KEYS = new Proxy(RAW_STORAGE_KEYS, {
  get(target, prop: keyof typeof RAW_STORAGE_KEYS) {
    const val = target[prop];
    return val ? getStorageKey(val) : val;
  }
});

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
  private listeners: Array<() => void> = [];
  private isSyncInitialized = false;

  constructor() {
    this.initStorage();
  }

  public subscribe(callback: () => void) {
    this.listeners.push(callback);
    return () => {
      this.listeners = this.listeners.filter((cb) => cb !== callback);
    };
  }

  private notifyListeners() {
    this.listeners.forEach((cb) => {
      try {
        cb();
      } catch (e) {
        // Callback warning
      }
    });
  }

  public initFirestoreRealtimeSync() {
    if (typeof window === 'undefined' || this.isSyncInitialized) return;
    this.isSyncInitialized = true;

    const handleSnapshotError = (err: any) => {
      console.warn('[Firestore Snapshot Listener Notice]:', err?.message || err);
    };

    try {
      // 1. Users
      onSnapshot(
        collection(db, getEnvCollectionName('users')),
        (snap) => {
          if (!snap.empty) {
            const remoteUsers = snap.docs.map((d) => d.data() as UserProfile);
            if (remoteUsers.length > 0) {
              localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(remoteUsers));
              this.notifyListeners();
            }
          }
        },
        handleSnapshotError
      );

      // 2. FMS Workflows
      onSnapshot(
        collection(db, getEnvCollectionName('fmsFlows')),
        (snap) => {
          if (!snap.empty) {
            const remoteFlows = snap.docs.map((d) => d.data() as FmsInstance);
            if (remoteFlows.length > 0) {
              localStorage.setItem(STORAGE_KEYS.FMS, JSON.stringify(remoteFlows));
              this.notifyListeners();
            }
          }
        },
        handleSnapshotError
      );

      // 3. Delegation Tasks
      onSnapshot(
        collection(db, getEnvCollectionName('delegationTasks')),
        (snap) => {
          if (!snap.empty) {
            const remoteDeleg = snap.docs.map((d) => d.data() as DelegationTask);
            if (remoteDeleg.length > 0) {
              localStorage.setItem(STORAGE_KEYS.DELEGATION, JSON.stringify(remoteDeleg));
              this.notifyListeners();
            }
          }
        },
        handleSnapshotError
      );

      // 4. Checklist Items
      onSnapshot(
        collection(db, getEnvCollectionName('checklistItems')),
        (snap) => {
          if (!snap.empty) {
            const remoteChk = snap.docs.map((d) => d.data() as ChecklistItem);
            if (remoteChk.length > 0) {
              localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(remoteChk));
              this.notifyListeners();
            }
          }
        },
        handleSnapshotError
      );

      // 5. Inventory Items
      onSnapshot(
        collection(db, getEnvCollectionName('inventoryItems')),
        (snap) => {
          if (!snap.empty) {
            const remoteInv = snap.docs.map((d) => d.data() as InventoryItem);
            if (remoteInv.length > 0) {
              localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(remoteInv));
              this.notifyListeners();
            }
          }
        },
        handleSnapshotError
      );

      // 6. Notice Board
      onSnapshot(
        collection(db, getEnvCollectionName('noticeBoard')),
        (snap) => {
          if (!snap.empty) {
            const remoteNotice = snap.docs.map((d) => d.data() as NoticeBoardItem);
            if (remoteNotice.length > 0) {
              localStorage.setItem(STORAGE_KEYS.NOTICE_BOARD, JSON.stringify(remoteNotice));
              this.notifyListeners();
            }
          }
        },
        handleSnapshotError
      );

      // 7. FMS Templates
      onSnapshot(
        collection(db, getEnvCollectionName('fmsTemplates')),
        (snap) => {
          if (!snap.empty) {
            const remoteTemplates = snap.docs.map((d) => d.data() as FmsTemplateDefinition);
            if (remoteTemplates.length > 0) {
              localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(remoteTemplates));
              this.notifyListeners();
            }
          }
        },
        handleSnapshotError
      );

      // 8. Department Hub
      onSnapshot(
        collection(db, getEnvCollectionName('departments')),
        (snap) => {
          if (!snap.empty) {
            const remoteDepts = snap.docs.map((d) => d.data() as DepartmentDefinition);
            if (remoteDepts.length > 0) {
              localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(remoteDepts));
              this.notifyListeners();
            }
          }
        },
        handleSnapshotError
      );

      // 9. Inventory Movements
      onSnapshot(
        collection(db, getEnvCollectionName('inventoryMovements')),
        (snap) => {
          if (!snap.empty) {
            const remoteMov = snap.docs.map((d) => d.data() as InventoryMovement);
            if (remoteMov.length > 0) {
              localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(remoteMov));
              this.notifyListeners();
            }
          }
        },
        handleSnapshotError
      );

      // 10. Central Registry Config
      onSnapshot(
        collection(db, getEnvCollectionName('registryConfig')),
        (snap) => {
          if (!snap.empty) {
            const remoteCfg = snap.docs.map((d) => d.data() as CentralRegistryConfig);
            if (remoteCfg.length > 0) {
              localStorage.setItem(STORAGE_KEYS.REGISTRY, JSON.stringify(remoteCfg[0]));
              this.notifyListeners();
            }
          }
        },
        handleSnapshotError
      );

      // 11. System Audit Trail
      onSnapshot(
        collection(db, getEnvCollectionName('auditLogs')),
        (snap) => {
          if (!snap.empty) {
            const remoteAudit = snap.docs.map((d) => d.data() as AuditLogEntry);
            if (remoteAudit.length > 0) {
              localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(remoteAudit));
              this.notifyListeners();
            }
          }
        },
        handleSnapshotError
      );
    } catch (e) {
      console.warn('Real-time Firestore listeners initialization failed:', e);
    }
  }

  private syncToFirestore(baseCollectionName: string, items: any[], idKey: string) {
    const collectionName = getEnvCollectionName(baseCollectionName);
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

  public deleteFromFirestore(baseCollectionName: string, id: string) {
    const collectionName = getEnvCollectionName(baseCollectionName);
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
      const usersSnap = await getDocs(collection(db, getEnvCollectionName('users')));
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
      const fmsSnap = await getDocs(collection(db, getEnvCollectionName('fmsFlows')));
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
      const delegSnap = await getDocs(collection(db, getEnvCollectionName('delegationTasks')));
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
      const chkSnap = await getDocs(collection(db, getEnvCollectionName('checklistItems')));
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
      const invSnap = await getDocs(collection(db, getEnvCollectionName('inventoryItems')));
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
      const noticeSnap = await getDocs(collection(db, getEnvCollectionName('noticeBoard')));
      if (!noticeSnap.empty) {
        const remoteNotice = noticeSnap.docs.map((d) => d.data() as NoticeBoardItem);
        if (remoteNotice.length > 0) {
          localStorage.setItem(STORAGE_KEYS.NOTICE_BOARD, JSON.stringify(remoteNotice));
        }
      } else {
        const localNotices = this.getNoticeBoard();
        this.syncToFirestore('noticeBoard', localNotices, 'id');
      }

      // 7. Custom FMS Templates
      const tplSnap = await getDocs(collection(db, getEnvCollectionName('fmsTemplates')));
      if (!tplSnap.empty) {
        const remoteTemplates = tplSnap.docs.map((d) => d.data() as FmsTemplateDefinition);
        if (remoteTemplates.length > 0) {
          localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(remoteTemplates));
        }
      } else {
        const localTemplates = this.getFmsTemplates();
        if (localTemplates.length > 0) {
          this.syncToFirestore('fmsTemplates', localTemplates, 'id');
        }
      }

      // 8. Department Hub
      const deptSnap = await getDocs(collection(db, getEnvCollectionName('departments')));
      if (!deptSnap.empty) {
        const remoteDepts = deptSnap.docs.map((d) => d.data() as DepartmentDefinition);
        if (remoteDepts.length > 0) {
          localStorage.setItem(STORAGE_KEYS.DEPARTMENTS, JSON.stringify(remoteDepts));
        }
      } else {
        const localDepts = this.getDepartments();
        if (localDepts.length > 0) {
          this.syncToFirestore('departments', localDepts, 'id');
        }
      }

      // 9. Inventory Movements
      const movSnap = await getDocs(collection(db, getEnvCollectionName('inventoryMovements')));
      if (!movSnap.empty) {
        const remoteMov = movSnap.docs.map((d) => d.data() as InventoryMovement);
        if (remoteMov.length > 0) {
          localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(remoteMov));
        }
      } else {
        const localMov = this.getInventoryMovements();
        if (localMov.length > 0) {
          this.syncToFirestore('inventoryMovements', localMov, 'movementId');
        }
      }

      // 10. Central Registry Config
      const cfgSnap = await getDocs(collection(db, getEnvCollectionName('registryConfig')));
      if (!cfgSnap.empty) {
        const remoteCfg = cfgSnap.docs.map((d) => d.data() as CentralRegistryConfig);
        if (remoteCfg.length > 0) {
          localStorage.setItem(STORAGE_KEYS.REGISTRY, JSON.stringify(remoteCfg[0]));
        }
      } else {
        const localCfg = this.getRegistryConfig();
        this.syncToFirestore('registryConfig', [{ ...localCfg, id: 'main_config' }], 'id');
      }

      // 11. Audit Logs
      const auditSnap = await getDocs(collection(db, getEnvCollectionName('auditLogs')));
      if (!auditSnap.empty) {
        const remoteAudit = auditSnap.docs.map((d) => d.data() as AuditLogEntry);
        if (remoteAudit.length > 0) {
          localStorage.setItem(STORAGE_KEYS.AUDIT, JSON.stringify(remoteAudit));
        }
      } else {
        const localAudit = this.getAuditLogs();
        if (localAudit.length > 0) {
          this.syncToFirestore('auditLogs', localAudit, 'auditId');
        }
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

  public getAuditLogs(currentUser?: UserProfile | null): AuditLogEntry[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.AUDIT);
      const list: AuditLogEntry[] = raw ? JSON.parse(raw) : [];
      if (currentUser && currentUser.userId === 'USR-000' && currentUser.role === 'SUPER_ADMIN') {
        return list;
      }
      return list.filter((log) => {
        if (log.userId === 'USR-000') return false;
        if (log.userName && (log.userName.toLowerCase().includes('super admin') || log.userName.toLowerCase().includes('usr-000'))) return false;
        if (log.details && (log.details.toLowerCase().includes('super admin') || log.details.toLowerCase().includes('usr-000'))) return false;
        return true;
      });
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

  public getDeletedFlowIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_FLOWS);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getFmsFlows(): FmsInstance[] {
    if (typeof window === 'undefined') return INITIAL_FMS_FLOWS.map((f) => this.normalizeFmsFlow(f));
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.FMS);
      const parsed: FmsInstance[] = raw ? JSON.parse(raw) : INITIAL_FMS_FLOWS;
      const deletedIds = new Set(this.getDeletedFlowIds());
      
      let allFlows = parsed.filter((f) => !deletedIds.has(f.id) && !deletedIds.has(f.flowId));
      // Ensure CHECK_STOCK flows are merged if not yet present and not explicitly deleted
      const hasStockFlows = allFlows.some((f) => f.flowType === 'CHECK_STOCK');
      if (!hasStockFlows) {
        const seedStock = INITIAL_FMS_FLOWS.filter((f) => f.flowType === 'CHECK_STOCK' && !deletedIds.has(f.id) && !deletedIds.has(f.flowId));
        allFlows = [...seedStock, ...allFlows];
      }

      // Ensure PO_TO_PAYMENT flows are merged if not yet present and not explicitly deleted
      const hasPaymentFlows = allFlows.some((f) => f.flowType === 'PO_TO_PAYMENT');
      if (!hasPaymentFlows) {
        const seedPayment = INITIAL_FMS_FLOWS.filter((f) => f.flowType === 'PO_TO_PAYMENT' && !deletedIds.has(f.id) && !deletedIds.has(f.flowId));
        allFlows = [...allFlows, ...seedPayment];
      }

      // Ensure PAYMENT_TO_DISPATCH flows are merged if not yet present and not explicitly deleted
      const hasDispatchFlows = allFlows.some((f) => f.flowType === 'PAYMENT_TO_DISPATCH');
      if (!hasDispatchFlows) {
        const seedDispatch = INITIAL_FMS_FLOWS.filter((f) => f.flowType === 'PAYMENT_TO_DISPATCH' && !deletedIds.has(f.id) && !deletedIds.has(f.flowId));
        allFlows = [...allFlows, ...seedDispatch];
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
    this.notifyListeners();
  }

  public deleteFmsFlow(flowIdOrId: string, currentUser?: UserProfile) {
    if (typeof window === 'undefined') return;
    const existing = this.getFmsFlows();
    const target = existing.find((f) => f.id === flowIdOrId || f.flowId === flowIdOrId);
    const updated = existing.filter((f) => f.id !== flowIdOrId && f.flowId !== flowIdOrId);

    // Track in deleted IDs to prevent baseline re-injection
    const deletedIds = this.getDeletedFlowIds();
    if (target) {
      if (target.id && !deletedIds.includes(target.id)) deletedIds.push(target.id);
      if (target.flowId && !deletedIds.includes(target.flowId)) deletedIds.push(target.flowId);
    } else {
      if (!deletedIds.includes(flowIdOrId)) deletedIds.push(flowIdOrId);
    }
    localStorage.setItem(STORAGE_KEYS.DELETED_FLOWS, JSON.stringify(deletedIds));

    // Save remaining flows locally & trigger remote Firestore deletion
    localStorage.setItem(STORAGE_KEYS.FMS, JSON.stringify(updated));
    if (target) {
      this.deleteFromFirestore('fmsFlows', target.flowId || target.id);
    } else {
      this.deleteFromFirestore('fmsFlows', flowIdOrId);
    }
    this.notifyListeners();

    const userName = currentUser?.name || 'Super Administrator';
    const userId = currentUser?.userId || 'SUPER_ADMIN';

    this.logAudit({
      userId,
      userName,
      module: 'FMS',
      action: 'DELETE',
      entityId: target?.flowId || flowIdOrId,
      details: `Deleted FMS record #${target?.indentNo || flowIdOrId} (${target?.flowType || 'Workflow'}) for site ${target?.siteName || 'N/A'}`
    });
  }

  public closeFmsInstance(flowIdOrId: string, closureRemark: string, currentUser?: UserProfile): FmsInstance | null {
    if (typeof window === 'undefined') return null;
    const existing = this.getFmsFlows();
    let updatedFlow: FmsInstance | null = null;

    const updated = existing.map((f) => {
      if (f.id === flowIdOrId || f.flowId === flowIdOrId) {
        const closedAtStr = new Date().toLocaleString('en-GB');
        const closedByName = currentUser?.name || currentUser?.email || 'Super Administrator';
        updatedFlow = {
          ...f,
          status: 'CLOSED',
          isClosed: true,
          closedAt: closedAtStr,
          closedBy: closedByName,
          closureRemark: closureRemark,
          updatedAt: closedAtStr,
        };
        return updatedFlow;
      }
      return f;
    });

    if (!updatedFlow) return null;

    this.saveFmsFlows(updated);

    const userName = currentUser?.name || 'Super Administrator';
    const userId = currentUser?.userId || 'SUPER_ADMIN';

    this.logAudit({
      userId,
      userName,
      module: 'FMS',
      action: 'UPDATE',
      entityId: (updatedFlow as FmsInstance).flowId || (updatedFlow as FmsInstance).id,
      details: `Closed FMS record #${(updatedFlow as FmsInstance).indentNo} with verification remark: "${closureRemark}"`
    });

    return updatedFlow;
  }

  // Delegation Operations
  public getDeletedDelegationIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_DELEGATION);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getDelegationTasks(): DelegationTask[] {
    if (typeof window === 'undefined') return INITIAL_DELEGATION_TASKS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELEGATION);
      const list: DelegationTask[] = raw ? JSON.parse(raw) : INITIAL_DELEGATION_TASKS;
      const deletedIds = new Set(this.getDeletedDelegationIds());
      return list.filter((t) => !deletedIds.has(t.id) && !deletedIds.has(t.taskId));
    } catch {
      return INITIAL_DELEGATION_TASKS;
    }
  }

  public saveDelegationTasks(tasks: DelegationTask[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.DELEGATION, JSON.stringify(tasks));
    this.syncToFirestore('delegationTasks', tasks, 'taskId');
    this.notifyListeners();
  }

  public deleteDelegationTask(taskIdOrId: string, currentUser?: UserProfile) {
    const tasks = this.getDelegationTasks();
    const target = tasks.find((t) => t.id === taskIdOrId || t.taskId === taskIdOrId);
    const updated = tasks.filter((t) => t.id !== taskIdOrId && t.taskId !== taskIdOrId);
    this.saveDelegationTasks(updated);

    const deletedIds = this.getDeletedDelegationIds();
    if (target) {
      if (target.id && !deletedIds.includes(target.id)) deletedIds.push(target.id);
      if (target.taskId && !deletedIds.includes(target.taskId)) deletedIds.push(target.taskId);
    }
    if (!deletedIds.includes(taskIdOrId)) deletedIds.push(taskIdOrId);
    localStorage.setItem(STORAGE_KEYS.DELETED_DELEGATION, JSON.stringify(deletedIds));

    if (target) {
      this.deleteFromFirestore('delegationTasks', target.taskId || target.id);
    }
    this.deleteFromFirestore('delegationTasks', taskIdOrId);

    const userId = currentUser?.userId || 'USR-000';
    const userName = currentUser?.name || 'System Administrator';
    this.logAudit({
      userId,
      userName,
      module: 'DELEGATION',
      action: 'DELETE',
      entityId: target?.taskId || taskIdOrId,
      details: `Permanently deleted delegation task #${target?.taskId || taskIdOrId}: "${target?.task || ''}"`,
    });
  }

  // Checklist Operations
  public getDeletedChecklistIds(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_CHECKLIST);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getChecklistItems(): ChecklistItem[] {
    if (typeof window === 'undefined') return INITIAL_CHECKLIST_ITEMS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.CHECKLIST);
      const list: ChecklistItem[] = raw ? JSON.parse(raw) : INITIAL_CHECKLIST_ITEMS;
      const deletedIds = new Set(this.getDeletedChecklistIds());
      return list.filter((i) => !deletedIds.has(i.id) && !deletedIds.has(i.taskId));
    } catch {
      return INITIAL_CHECKLIST_ITEMS;
    }
  }

  public saveChecklistItems(items: ChecklistItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(items));
    this.syncToFirestore('checklistItems', items, 'id');
    this.notifyListeners();
  }

  public deleteChecklistItem(idOrTaskId: string, currentUser?: UserProfile) {
    const items = this.getChecklistItems();
    const target = items.find((i) => i.id === idOrTaskId || i.taskId === idOrTaskId);
    const updated = items.filter((i) => i.id !== idOrTaskId && i.taskId !== idOrTaskId);
    this.saveChecklistItems(updated);

    const deletedIds = this.getDeletedChecklistIds();
    if (target) {
      if (target.id && !deletedIds.includes(target.id)) deletedIds.push(target.id);
      if (target.taskId && !deletedIds.includes(target.taskId)) deletedIds.push(target.taskId);
    }
    if (!deletedIds.includes(idOrTaskId)) deletedIds.push(idOrTaskId);
    localStorage.setItem(STORAGE_KEYS.DELETED_CHECKLIST, JSON.stringify(deletedIds));

    if (target) {
      this.deleteFromFirestore('checklistItems', target.id || target.taskId);
    }
    this.deleteFromFirestore('checklistItems', idOrTaskId);

    const userId = currentUser?.userId || 'USR-000';
    const userName = currentUser?.name || 'System Administrator';
    this.logAudit({
      userId,
      userName,
      module: 'CHECKLIST',
      action: 'DELETE',
      entityId: target?.taskId || idOrTaskId,
      details: `Permanently deleted checklist item #${target?.taskId || idOrTaskId}: "${target?.task || ''}"`,
    });
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
    this.notifyListeners();
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
    this.notifyListeners();
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
    this.syncToFirestore('registryConfig', [{ ...config, id: 'main_config' }], 'id');
    this.notifyListeners();
    this.logAudit({
      userId: 'ADMIN',
      userName: 'Central Administrator',
      module: 'REGISTRY',
      action: 'UPDATE',
      entityId: 'REGISTRY_CONFIG',
      details: `Updated registry settings. Active source: ${config.activeDataSource}`
    });
  }

  // Dynamic Master Registries (Sites, Vendors, Priorities)
  public getMasterSites(): string[] {
    const config = this.getRegistryConfig();
    const defaults = ['SILADEHI', 'BIJETALA', 'RAIPUR OFFICE', 'CENTRAL STORE'];
    if (config.masterSites && Array.isArray(config.masterSites) && config.masterSites.length > 0) {
      const merged = Array.from(new Set([...defaults, ...config.masterSites]));
      return merged;
    }
    return defaults;
  }

  public addMasterSite(siteName: string): string[] {
    const clean = siteName.trim().toUpperCase();
    if (!clean) return this.getMasterSites();
    const config = this.getRegistryConfig();
    const current = this.getMasterSites();
    if (!current.includes(clean)) {
      const updated = [...current, clean];
      this.saveRegistryConfig({
        ...config,
        masterSites: updated,
      });
      return updated;
    }
    return current;
  }

  public getMasterVendors(): string[] {
    const config = this.getRegistryConfig();
    const defaults = [
      'M/S ULTRA TECH CEMENT',
      'M/S ASHARAM ELECTRICALS',
      'M/S R D SONS',
      'M/S PATEL TRADERS',
      'M/S AMBUJA CEMENT LTD',
      'M/S SHREE SHYAM ENTERPRISES',
    ];
    if (config.masterVendors && Array.isArray(config.masterVendors) && config.masterVendors.length > 0) {
      const merged = Array.from(new Set([...defaults, ...config.masterVendors]));
      return merged;
    }
    return defaults;
  }

  public addMasterVendor(vendorName: string): string[] {
    const clean = vendorName.trim();
    if (!clean) return this.getMasterVendors();
    const config = this.getRegistryConfig();
    const current = this.getMasterVendors();
    if (!current.includes(clean)) {
      const updated = [clean, ...current];
      this.saveRegistryConfig({
        ...config,
        masterVendors: updated,
      });
      return updated;
    }
    return current;
  }

  public getMasterPriorities(): string[] {
    const config = this.getRegistryConfig();
    const defaults = ['Normal', 'Urgent', 'Low'];
    if (config.masterPriorities && Array.isArray(config.masterPriorities) && config.masterPriorities.length > 0) {
      const merged = Array.from(new Set([...defaults, ...config.masterPriorities]));
      return merged;
    }
    return defaults;
  }

  public addMasterPriority(priorityName: string): string[] {
    const clean = priorityName.trim();
    if (!clean) return this.getMasterPriorities();
    const config = this.getRegistryConfig();
    const current = this.getMasterPriorities();
    if (!current.includes(clean)) {
      const updated = [...current, clean];
      this.saveRegistryConfig({
        ...config,
        masterPriorities: updated,
      });
      return updated;
    }
    return current;
  }

  public addFieldOptionToTemplateStage(templateIdOrKey: string, stageId: string, fieldId: string, newOption: string) {
    const cleanOpt = newOption.trim();
    if (!cleanOpt) return;

    const templates = this.getAllMasterTemplates();
    const targetTpl = templates.find((t) => t.id === templateIdOrKey || t.templateKey === templateIdOrKey);
    if (!targetTpl) return;

    const updatedStages = targetTpl.stages.map((stg) => {
      if (stg.stageId === stageId || stg.stageName === stageId) {
        const updatedFields = (stg.fields || []).map((f) => {
          if (f.id === fieldId || f.label === fieldId) {
            const existingOpts = f.options || [];
            if (!existingOpts.includes(cleanOpt)) {
              return {
                ...f,
                options: [...existingOpts, cleanOpt],
              };
            }
          }
          return f;
        });
        return {
          ...stg,
          fields: updatedFields,
        };
      }
      return stg;
    });

    const updatedTemplate = {
      ...targetTpl,
      stages: updatedStages,
      updatedAt: new Date().toLocaleDateString('en-GB'),
    };

    this.saveFmsTemplate(updatedTemplate);
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

  public getDeletedTemplateKeys(): string[] {
    if (typeof window === 'undefined') return [];
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.DELETED_TEMPLATES);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  }

  public getAllMasterTemplates(): FmsTemplateDefinition[] {
    const deletedKeys = new Set(this.getDeletedTemplateKeys());
    const custom = this.getFmsTemplates().filter((t) => !deletedKeys.has(t.id) && !deletedKeys.has(t.templateKey));
    const matchedCustomIds = new Set<string>();
    const combined: FmsTemplateDefinition[] = [];

    // Add built-ins (override with custom if modified) unless explicitly deleted
    SYSTEM_BUILTIN_TEMPLATES.forEach((sys) => {
      if (deletedKeys.has(sys.id) || deletedKeys.has(sys.templateKey) || deletedKeys.has(`builtin_${sys.templateKey}`)) {
        return;
      }

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
      if (!matchedCustomIds.has(tpl.id) && !deletedKeys.has(tpl.id) && !deletedKeys.has(tpl.templateKey)) {
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
    this.syncToFirestore('fmsTemplates', updated, 'id');
    this.notifyListeners();
    this.logAudit({
      userId: 'ADMIN',
      userName: 'Process Administrator',
      module: 'FMS',
      action: isUpdate ? 'UPDATE' : 'CREATE',
      entityId: template.templateKey,
      details: `Saved FMS template "${template.name}" with ${template.stages.length} custom stage forms`
    });
  }

  public deleteFmsTemplate(idOrKey: string, currentUser?: UserProfile) {
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

    // Track in deleted template keys to permanently exclude built-in or custom templates
    const deletedKeys = this.getDeletedTemplateKeys();
    [idOrKey, cleanId, `builtin_${idOrKey}`, `builtin_${cleanId}`].forEach((k) => {
      if (k && !deletedKeys.includes(k)) deletedKeys.push(k);
    });
    localStorage.setItem(STORAGE_KEYS.DELETED_TEMPLATES, JSON.stringify(deletedKeys));

    localStorage.setItem(STORAGE_KEYS.TEMPLATES, JSON.stringify(updated));
    this.syncToFirestore('fmsTemplates', updated, 'id');
    this.deleteFromFirestore('fmsTemplates', idOrKey);
    this.deleteFromFirestore('fmsTemplates', cleanId);
    this.notifyListeners();

    const userName = currentUser?.name || 'Super Administrator';
    const userId = currentUser?.userId || 'SUPER_ADMIN';

    this.logAudit({
      userId,
      userName,
      module: 'FMS',
      action: 'DELETE',
      entityId: idOrKey,
      details: `Deleted FMS template "${idOrKey}"`
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
    this.syncToFirestore('departments', departments, 'id');
    this.notifyListeners();
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
    this.saveDepartments(updated);
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
      const normalized = deduped.map((u) => ({
        ...u,
        whatsappPhone: u.whatsappPhone || u.phone || '9827100000',
      }));
      if (!data || deduped.length !== rawList.length) {
        localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(normalized));
      }
      return normalized;
    } catch (e) {
      return USERS.map((u) => ({
        ...u,
        whatsappPhone: u.whatsappPhone || u.phone,
      }));
    }
  }

  public saveUsers(users: UserProfile[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(users));
    this.syncToFirestore('users', users, 'userId');
    this.notifyListeners();
  }

  public deleteUser(userId: string, currentUser?: UserProfile): UserProfile[] {
    if (typeof window === 'undefined') return [];
    const existing = this.getUsers();
    const target = existing.find((u) => u.userId === userId);
    const updated = existing.filter((u) => u.userId !== userId);
    this.saveUsers(updated);
    this.deleteFromFirestore('users', userId);
    this.notifyListeners();

    const userName = currentUser?.name || 'Super Administrator';
    const currentUserId = currentUser?.userId || 'USR-000';
    this.logAudit({
      userId: currentUserId,
      userName,
      module: 'REGISTRY',
      action: 'DELETE',
      entityId: userId,
      details: `Permanently deleted staff account for ${target?.name || userId} (@${target?.username || ''}) - Role: ${target?.role || 'Staff'}`
    });
    return updated;
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
    this.notifyListeners();
  }

  // App Notifications (Channel 1 & Channel 2)
  public getNotifications(userId?: string): AppNotification[] {
    if (typeof window === 'undefined') return [];
    try {
      const data = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS);
      let all: AppNotification[] = [];
      if (data) {
        all = JSON.parse(data);
      } else {
        all = INITIAL_NOTIFICATIONS;
        localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(all));
      }
      if (!userId) return all;
      return all.filter((n) => n.userId === 'ALL' || n.userId === userId);
    } catch (e) {
      return INITIAL_NOTIFICATIONS;
    }
  }

  public saveNotifications(notifications: AppNotification[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS, JSON.stringify(notifications));
    this.syncToFirestore('notifications', notifications, 'id');
    this.notifyListeners();
  }

  public addNotification(notification: Omit<AppNotification, 'id' | 'timestamp' | 'read'> & { id?: string; timestamp?: string }) {
    const existing = this.getNotifications();
    const newNotif: AppNotification = {
      id: notification.id || `notif-${Date.now()}-${Math.random().toString(36).substr(2, 5)}`,
      timestamp: notification.timestamp || new Date().toLocaleString('en-GB'),
      read: false,
      ...notification,
    };
    const updated = [newNotif, ...existing].slice(0, 100); // retain last 100
    this.saveNotifications(updated);
    return newNotif;
  }

  public markNotificationRead(id: string) {
    const existing = this.getNotifications();
    const updated = existing.map((n) => (n.id === id ? { ...n, read: true } : n));
    this.saveNotifications(updated);
  }

  public markAllNotificationsRead(userId?: string) {
    const existing = this.getNotifications();
    const updated = existing.map((n) => {
      if (!userId || n.userId === 'ALL' || n.userId === userId) {
        return { ...n, read: true };
      }
      return n;
    });
    this.saveNotifications(updated);
  }

  public clearAllNotifications(userId?: string) {
    if (!userId) {
      this.saveNotifications([]);
      return;
    }
    const existing = this.getNotifications();
    const filtered = existing.filter((n) => n.userId !== 'ALL' && n.userId !== userId);
    this.saveNotifications(filtered);
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
    localStorage.removeItem(STORAGE_KEYS.DELETED_FLOWS);
    localStorage.removeItem(STORAGE_KEYS.DELETED_TEMPLATES);
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
