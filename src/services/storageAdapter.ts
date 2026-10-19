import { z } from 'zod';
import { db, testConnection } from './firebase';
import { collection, doc, getDocs, setDoc, deleteDoc, onSnapshot } from 'firebase/firestore';
import { 
  ChecklistItem, 
  DelegationTask, 
  FmsInstance, 
  FmsLineItem,
  FmsOverrideLog,
  InventoryItem, 
  InventoryMovement, 
  AuditLogEntry, 
  CentralRegistryConfig,
  SiteRegistryItem,
  FmsTemplateDefinition,
  DepartmentDefinition,
  UserProfile,
  NoticeBoardItem,
  AppNotification,
  ComparativeStatement,
  CsItem,
  CsVendorQuote,
  BankPaymentRecord,
  BeneficiaryRecord,
  InterbankTransferRecord,
  PaymentStepStatus,
  PaymentApprovalStatus,
  VendorBeneficiaryMatch,
  isUserDirector,
  VendorProfileRecord,
  VendorBankAccount,
  VendorSearchWithBankingResult,
  isUserAuthorizedForVendorBanking
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
  INITIAL_SITE_REGISTRY,
  SYSTEM_BUILTIN_TEMPLATES,
  USERS,
  INITIAL_NOTICE_BOARD,
  INITIAL_NOTIFICATIONS,
  INITIAL_BANK_PAYMENTS,
  INITIAL_BENEFICIARIES,
  INITIAL_IBT_RECORDS,
  INITIAL_COMPARATIVE_STATEMENTS,
  INITIAL_VENDOR_PROFILES,
  FMS_PURCHASE_TO_STORE_DISPATCH_STAGES,
  FMS_STORE_TO_SITE_DISPATCH_STAGES,
  FMS_STANDARD_PURCHASE_STAGES
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
  // Use unified collection names across DEV and Published so created/modified business data is persistent across all environments
  return baseName;
}

export function getStorageKey(baseKey: string): string {
  // Use unified storage keys across DEV and Published
  return baseKey;
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
  CS_SHEETS: 'barbrik_ops_comparative_statements_v1',
  SITES: 'barbrik_ops_sites_registry_v1',
  BANK_PAYMENTS: 'barbrik_ops_bank_payments_v1',
  BENEFICIARIES: 'barbrik_ops_beneficiaries_v1',
  IBT: 'barbrik_ops_ibt_v1',
  VENDOR_PROFILES: 'barbrik_ops_vendor_profiles_v1',
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
  private isQuotaExceeded = false;

  constructor() {
    this.initStorage();
  }

  private activeUnsubscribes: Array<() => void> = [];

  private handleFirestoreError(err: any) {
    if (!err) return;
    const msg = String(err?.message || err).toLowerCase();
    const code = String(err?.code || '').toLowerCase();
    if (code.includes('resource-exhausted') || msg.includes('quota limit exceeded') || msg.includes('resource-exhausted') || msg.includes('quota exceeded')) {
      if (!this.isQuotaExceeded) {
        this.isQuotaExceeded = true;
        console.warn('[StorageAdapter] Firestore daily quota reached. Detaching remote listeners and operating seamlessly with persistent local storage.');
        this.activeUnsubscribes.forEach((unsub) => {
          try { unsub(); } catch (_) {}
        });
        this.activeUnsubscribes = [];
      }
    }
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
    if (typeof window === 'undefined' || this.isSyncInitialized || this.isQuotaExceeded) return;
    this.isSyncInitialized = true;

    const handleSnapshotError = (err: any) => {
      this.handleFirestoreError(err);
      if (!this.isQuotaExceeded) {
        console.warn('[Firestore Snapshot Listener Notice]:', err?.message || err);
      }
    };

    try {
      // 1. Users
      this.activeUnsubscribes.push(
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
        )
      );

      // 2. FMS Workflows
      this.activeUnsubscribes.push(
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
        )
      );

      // 3. Delegation Tasks
      this.activeUnsubscribes.push(
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
        )
      );

      // 4. Checklist Items
      this.activeUnsubscribes.push(
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
        )
      );

      // 5. Inventory Items
      this.activeUnsubscribes.push(
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
        )
      );

      // 6. Notice Board
      this.activeUnsubscribes.push(
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
        )
      );

      // 7. FMS Templates
      this.activeUnsubscribes.push(
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
        )
      );

      // 8. Department Hub
      this.activeUnsubscribes.push(
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
        )
      );

      // 9. Inventory Movements
      this.activeUnsubscribes.push(
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
        )
      );

      // 10. Central Registry Config
      this.activeUnsubscribes.push(
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
        )
      );

      // 11. System Audit Trail
      this.activeUnsubscribes.push(
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
        )
      );
    } catch (e) {
      this.handleFirestoreError(e);
      if (!this.isQuotaExceeded) {
        console.warn('Real-time Firestore listeners initialization failed:', e);
      }
    }
  }

  private syncToFirestore(baseCollectionName: string, items: any[], idKey: string) {
    if (this.isQuotaExceeded) return;
    const collectionName = getEnvCollectionName(baseCollectionName);
    try {
      const currentIds = new Set(
        items.map((item) => String(item[idKey] || item.id || item.flowId || item.taskId || item.itemId || item.userId || item.auditId)).filter(Boolean)
      );

      // 1. Create / Update (Upsert) clean items
      for (const item of items) {
        if (this.isQuotaExceeded) break;
        const id = item[idKey] || item.id || item.flowId || item.taskId || item.itemId || item.userId || item.auditId;
        if (id) {
          const cleanPayload = sanitizeForFirestore(item);
          setDoc(doc(db, collectionName, String(id)), cleanPayload, { merge: true })
            .catch((err) => {
              this.handleFirestoreError(err);
              if (!this.isQuotaExceeded) {
                console.warn(`[Firestore Write Error] ${collectionName}/${id}:`, err?.message || err);
              }
            });
        }
      }

      // 2. Delete removed items from remote Firestore collection
      if (!this.isQuotaExceeded) {
        getDocs(collection(db, collectionName)).then((snap) => {
          snap.docs.forEach((d) => {
            if (!currentIds.has(d.id)) {
              deleteDoc(doc(db, collectionName, d.id)).catch((err) => this.handleFirestoreError(err));
            }
          });
        }).catch((err) => this.handleFirestoreError(err));
      }
    } catch (err) {
      this.handleFirestoreError(err);
      if (!this.isQuotaExceeded) {
        console.warn(`[Firestore Sync Exception] ${collectionName}:`, err);
      }
    }
  }

  public deleteFromFirestore(baseCollectionName: string, id: string) {
    if (this.isQuotaExceeded) return;
    const collectionName = getEnvCollectionName(baseCollectionName);
    try {
      deleteDoc(doc(db, collectionName, id)).catch((err) => {
        this.handleFirestoreError(err);
        if (!this.isQuotaExceeded) {
          console.warn(`[Firestore Delete Error] ${collectionName}/${id}:`, err?.message || err);
        }
      });
    } catch (err) {
      this.handleFirestoreError(err);
      if (!this.isQuotaExceeded) {
        console.warn(`[Firestore Delete Exception] ${collectionName}/${id}:`, err);
      }
    }
  }

  public async migrateLegacyDevData() {
    if (typeof window === 'undefined' || this.isQuotaExceeded) return;
    try {
      const collectionsToMigrate = [
        { name: 'users', key: 'userId' },
        { name: 'fmsFlows', key: 'flowId' },
        { name: 'delegationTasks', key: 'taskId' },
        { name: 'checklistItems', key: 'id' },
        { name: 'inventoryItems', key: 'itemId' },
        { name: 'noticeBoard', key: 'id' },
        { name: 'fmsTemplates', key: 'id' },
        { name: 'departments', key: 'id' },
        { name: 'inventoryMovements', key: 'movementId' },
        { name: 'registryConfig', key: 'id' },
        { name: 'auditLogs', key: 'auditId' }
      ];

      for (const col of collectionsToMigrate) {
        if (this.isQuotaExceeded) break;
        const devSnap = await getDocs(collection(db, `dev_${col.name}`));
        if (!devSnap.empty) {
          const devDocs = devSnap.docs.map(d => d.data());
          for (const docData of devDocs) {
            if (this.isQuotaExceeded) break;
            const docId = docData[col.key] || docData.id || docData.flowId || docData.userId;
            if (docId) {
              const clean = sanitizeForFirestore(docData);
              await setDoc(doc(db, col.name, String(docId)), clean, { merge: true });
            }
          }
        }
      }

      for (const [, rawKey] of Object.entries(RAW_STORAGE_KEYS)) {
        const devKey = `dev_${rawKey}`;
        const devVal = localStorage.getItem(devKey);
        if (devVal) {
          if (!localStorage.getItem(rawKey)) {
            localStorage.setItem(rawKey, devVal);
          }
        }
      }
    } catch (err) {
      this.handleFirestoreError(err);
      if (!this.isQuotaExceeded) {
        console.warn('Legacy dev data migration notice:', err);
      }
    }
  }

  public async loadFromFirestore() {
    if (this.isQuotaExceeded) return false;
    try {
      const isConnected = await testConnection();
      if (!isConnected) {
        console.warn('Firestore server not reachable, serving cached local data.');
        return false;
      }

      await this.migrateLegacyDevData();

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

      // 10b. Site Registry
      const siteSnap = await getDocs(collection(db, getEnvCollectionName('sitesRegistry')));
      if (!siteSnap.empty) {
        const remoteSites = siteSnap.docs.map((d) => d.data() as SiteRegistryItem);
        if (remoteSites.length > 0) {
          localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(remoteSites));
        }
      } else {
        const localSites = this.getSiteRegistry();
        if (localSites.length > 0) {
          this.syncToFirestore('sitesRegistry', localSites, 'id');
        }
      }

      // 10c. Bank Payments
      const bankSnap = await getDocs(collection(db, getEnvCollectionName('bankPayments')));
      if (!bankSnap.empty) {
        const remoteBank = bankSnap.docs.map((d) => d.data() as BankPaymentRecord);
        if (remoteBank.length > 0) {
          localStorage.setItem(STORAGE_KEYS.BANK_PAYMENTS, JSON.stringify(remoteBank));
        }
      } else {
        const localBank = this.getBankPayments();
        if (localBank.length > 0) {
          this.syncToFirestore('bankPayments', localBank, 'id');
        }
      }

      // 10d. Beneficiaries
      const benSnap = await getDocs(collection(db, getEnvCollectionName('beneficiaries')));
      if (!benSnap.empty) {
        const remoteBen = benSnap.docs.map((d) => d.data() as BeneficiaryRecord);
        if (remoteBen.length > 0) {
          localStorage.setItem(STORAGE_KEYS.BENEFICIARIES, JSON.stringify(remoteBen));
        }
      } else {
        const localBen = this.getBeneficiaryRecords();
        if (localBen.length > 0) {
          this.syncToFirestore('beneficiaries', localBen, 'id');
        }
      }

      // 10e. IBT Records
      const ibtSnap = await getDocs(collection(db, getEnvCollectionName('ibtRecords')));
      if (!ibtSnap.empty) {
        const remoteIbt = ibtSnap.docs.map((d) => d.data() as InterbankTransferRecord);
        if (remoteIbt.length > 0) {
          localStorage.setItem(STORAGE_KEYS.IBT, JSON.stringify(remoteIbt));
        }
      } else {
        const localIbt = this.getIbtRecords();
        if (localIbt.length > 0) {
          this.syncToFirestore('ibtRecords', localIbt, 'id');
        }
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
      this.handleFirestoreError(e);
      if (!this.isQuotaExceeded) {
        console.warn('Error loading from Firestore:', e);
      }
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
    if (!localStorage.getItem(STORAGE_KEYS.SITES)) {
      localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(INITIAL_SITE_REGISTRY));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BANK_PAYMENTS)) {
      localStorage.setItem(STORAGE_KEYS.BANK_PAYMENTS, JSON.stringify(INITIAL_BANK_PAYMENTS));
    }
    if (!localStorage.getItem(STORAGE_KEYS.BENEFICIARIES)) {
      localStorage.setItem(STORAGE_KEYS.BENEFICIARIES, JSON.stringify(INITIAL_BENEFICIARIES));
    }
    if (!localStorage.getItem(STORAGE_KEYS.IBT)) {
      localStorage.setItem(STORAGE_KEYS.IBT, JSON.stringify(INITIAL_IBT_RECORDS));
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

  public splitIndentForPurchaseAndStore(
    parentFlow: FmsInstance,
    lineItems: FmsLineItem[],
    triageNotes: string,
    currentUser?: UserProfile
  ): { storeFlow: FmsInstance | null; purchaseFlow: FmsInstance | null; updatedParent?: FmsInstance } {
    const existingFlows = this.getFmsFlows();
    const baseIndentNo = parentFlow.indentNo || parentFlow.requisitionNumber || `IND-${Date.now().toString().slice(-4)}`;
    
    const storeItems = lineItems.filter((i) => i.triageAllocation === 'STORE_DISPATCH');
    const purchaseItems = lineItems.filter((i) => i.triageAllocation === 'PURCHASE_REQUISITION');

    let storeFlow: FmsInstance | null = null;
    let purchaseFlow: FmsInstance | null = null;

    const nowIso = new Date().toISOString();
    const nowStr = new Date().toLocaleString('en-GB');

    // 1. Create Store Dispatch Indent if store items exist
    if (storeItems.length > 0) {
      const dispId = `fms-disp-${Date.now()}`;
      const dispFlowId = `FLOW-DISP-${Date.now().toString().slice(-6)}`;
      const dispIndentNo = `${baseIndentNo}-DISP`;

      storeFlow = {
        ...parentFlow,
        id: dispId,
        flowId: dispFlowId,
        indentNo: dispIndentNo,
        requisitionNumber: dispIndentNo,
        flowType: 'STORE_TO_SITE_DISPATCH',
        title: `[STORE DISPATCH TRACK] ${parentFlow.title || 'Store Stock Issue'}`,
        status: 'In Progress',
        isClosed: false,
        lineItems: storeItems,
        currentStageIndex: 0,
        currentStageId: 'STG-SSD-01',
        createdAt: nowStr,
        updatedAt: nowStr,
        stages: FMS_STORE_TO_SITE_DISPATCH_STAGES.map((stg, idx) => ({
          stageId: stg.stageId,
          stageName: stg.name,
          assignee: stg.whoDefaultAssignee || stg.whoRole || 'Store Keeper',
          how: stg.howChannel || 'In-App Form',
          status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
          stageStartedAt: idx === 0 ? nowIso : undefined,
          plannedTimestamp: idx === 0 ? new Date(Date.now() + (stg.slaHours || 12) * 3600 * 1000).toISOString() : undefined,
        })),
        instanceDataPool: {
          ...(parentFlow.instanceDataPool || {}),
          parentIndentNo: baseIndentNo,
          splitTrackType: 'STORE_DISPATCH',
          triageNotes,
          triagedBy: currentUser?.name || 'Store Keeper',
        },
      };
    }

    // 2. Create Purchase Requisition Indent if purchase items exist
    if (purchaseItems.length > 0) {
      const purchId = `fms-purch-${Date.now() + 1}`;
      const purchFlowId = `FLOW-PURCH-${Date.now().toString().slice(-6)}`;
      const purchIndentNo = `${baseIndentNo}-PURCH`;

      purchaseFlow = {
        ...parentFlow,
        id: purchId,
        flowId: purchFlowId,
        indentNo: purchIndentNo,
        requisitionNumber: purchIndentNo,
        flowType: 'INDENT_PURCHASE',
        title: `[PURCHASE REQUISITION TRACK] ${parentFlow.title || 'Market Requisition'}`,
        status: 'In Progress',
        isClosed: false,
        lineItems: purchaseItems,
        poAssignTo: 'Bramhanand Patel',
        currentStageIndex: 1,
        currentStageId: 'STG-02',
        createdAt: nowStr,
        updatedAt: nowStr,
        stages: FMS_STANDARD_PURCHASE_STAGES.map((stg, idx) => ({
          stageId: stg.stageId,
          stageName: stg.name,
          assignee: idx === 1 ? 'Bramhanand Patel' : (stg.whoDefaultAssignee || stg.whoRole || 'Purchase Officer'),
          how: stg.howChannel || 'In-App Form',
          status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
          stageStartedAt: idx <= 1 ? nowIso : undefined,
          actualTimestamp: idx === 0 ? nowIso : undefined,
          notes: idx === 0 ? `Received & triaged at store from Indent #${baseIndentNo}; forwarded to Purchase Department` : undefined,
          plannedTimestamp: idx === 1 ? new Date(Date.now() + (stg.slaHours || 24) * 3600 * 1000).toISOString() : undefined,
        })),
        instanceDataPool: {
          ...(parentFlow.instanceDataPool || {}),
          parentIndentNo: baseIndentNo,
          splitTrackType: 'PURCHASE_REQUISITION',
          triageNotes,
          triagedBy: currentUser?.name || 'Store Keeper',
        },
      };

      // Emit high-priority action notification to Bramhanand Patel
      this.addNotification({
        userId: 'USR-002', // Bramhanand Patel
        title: `Action Required: Purchase Indent #${purchIndentNo}`,
        message: `Material requisition triaged and forwarded from Central Store (${purchaseItems.length} items). Assigned for Degraded Material Check.`,
        type: 'FMS_ACTION_REQUIRED',
        linkTab: 'fms',
        linkEntityId: purchId,
        data: { flowId: purchFlowId, stageIndex: 1 }
      });
    }

    // 3. Advance parent flow (e.g. CHECK_STOCK) to next stage for Store Manager without closing it
    const nextStageIdx = parentFlow.currentStageIndex + 1;
    const hasNextStage = nextStageIdx < parentFlow.stages.length;
    const updatedStages = parentFlow.stages.map((stg, i) => {
      if (i === parentFlow.currentStageIndex) {
        return {
          ...stg,
          status: 'Done' as const,
          actualTimestamp: nowIso,
          notes: triageNotes || `Store stock check & triage completed (${storeItems.length} Store Dispatch, ${purchaseItems.length} Purchase Requisition).`,
        };
      }
      if (i === nextStageIdx && hasNextStage) {
        return {
          ...stg,
          status: 'In Progress' as const,
          stageStartedAt: nowIso,
          plannedTimestamp: new Date(Date.now() + (stg.targetDurationHours || stg.timeDelayHours || 12) * 3600 * 1000).toISOString(),
        };
      }
      return stg;
    });

    const updatedParent: FmsInstance = {
      ...parentFlow,
      status: hasNextStage ? 'In Progress' : 'Completed',
      isClosed: !hasNextStage,
      currentStageIndex: hasNextStage ? nextStageIdx : parentFlow.currentStageIndex,
      currentStageId: hasNextStage ? parentFlow.stages[nextStageIdx]?.stageId || parentFlow.currentStageId : parentFlow.currentStageId,
      lineItems: lineItems,
      linkedSubFlows: [
        ...(storeFlow ? [{
          type: 'STORE_DISPATCH' as const,
          id: storeFlow.id,
          flowType: storeFlow.flowType,
          name: `Store Material Dispatch (${storeItems.length} items)`,
          indentNo: storeFlow.indentNo,
          itemCount: storeItems.length,
          status: storeFlow.status,
          createdAt: nowStr,
        }] : []),
        ...(purchaseFlow ? [{
          type: 'PURCHASE' as const,
          id: purchaseFlow.id,
          flowType: purchaseFlow.flowType,
          name: `Purchase Indent to PO (${purchaseItems.length} items)`,
          indentNo: purchaseFlow.indentNo,
          itemCount: purchaseItems.length,
          status: purchaseFlow.status,
          createdAt: nowStr,
        }] : [])
      ],
      updatedAt: nowStr,
    };

    // Replace parent and prepend new sub-indents
    const newFlowList = existingFlows.map((f) => (f.id === parentFlow.id || f.flowId === parentFlow.flowId ? updatedParent : f));
    if (storeFlow) newFlowList.unshift(storeFlow);
    if (purchaseFlow) newFlowList.unshift(purchaseFlow);

    this.saveFmsFlows(newFlowList);

    this.logAudit({
      userId: currentUser?.userId || 'STORE_MGR',
      userName: currentUser?.name || 'Store Manager',
      module: 'FMS',
      action: 'CREATE',
      entityId: baseIndentNo,
      details: `Triaged Indent #${baseIndentNo} into 2 independent track indents (${storeItems.length} Store Dispatch items, ${purchaseItems.length} Market Purchase items).`,
    });

    return { storeFlow, purchaseFlow, updatedParent };
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

  public overrideFmsStage(
    fmsInstanceId: string,
    targetStageIndex: number,
    reason: string,
    currentUser: UserProfile
  ): FmsInstance {
    const flows = this.getFmsFlows();
    const targetFlowIndex = flows.findIndex(
      (f) => f.id === fmsInstanceId || f.flowId === fmsInstanceId
    );

    if (targetFlowIndex === -1) {
      throw new Error(`FMS Record ${fmsInstanceId} not found.`);
    }

    const flow = flows[targetFlowIndex];
    const prevStageIndex = flow.currentStageIndex;
    const prevStageName = flow.stages[prevStageIndex]?.stageName || 'Unknown Stage';
    const newStage = flow.stages[targetStageIndex];

    if (!newStage) {
      throw new Error(`Target stage index ${targetStageIndex} is out of bounds.`);
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const nowFormatted = now.toLocaleString('en-GB');

    const updatedStages = flow.stages.map((stg, idx) => {
      // PRESERVE PAST COMPLETED RECORDS UNTOUCHED!
      if (idx === prevStageIndex && stg.status === 'In Progress') {
        return {
          ...stg,
          status: 'OVERRIDDEN' as const,
          notes: `Stage overridden to Stage ${targetStageIndex + 1} by ${currentUser.name}. Reason: ${reason}`,
        };
      }
      if (idx === targetStageIndex) {
        const slaHours = stg.targetDurationHours || 24;
        const plannedIso = new Date(now.getTime() + slaHours * 3600 * 1000).toISOString();
        return {
          ...stg,
          status: 'In Progress' as const,
          stageStartedAt: nowIso,
          plannedTimestamp: plannedIso,
          notes: stg.notes ? `${stg.notes} (Activated via override: ${reason})` : `Activated via stage override: ${reason}`,
        };
      }
      return stg;
    });

    const overrideEntry: FmsOverrideLog = {
      id: `ovr-${Date.now()}`,
      fmsInstanceId: flow.id || flow.flowId,
      performedByUserId: currentUser.userId,
      performedByUserName: currentUser.name,
      performedByUserRole: currentUser.systemRole || currentUser.role,
      previousStageIndex: prevStageIndex,
      newStageIndex: targetStageIndex,
      previousStageName: prevStageName,
      newStageName: newStage.stageName,
      reason,
      timestamp: nowIso,
    };

    const updatedFlow: FmsInstance = {
      ...flow,
      currentStageIndex: targetStageIndex,
      currentStageId: newStage.stageId,
      status: 'In Progress',
      stages: updatedStages,
      overrideLogs: [...(flow.overrideLogs || []), overrideEntry],
      updatedAt: nowFormatted,
    };

    const updatedFlows = [...flows];
    updatedFlows[targetFlowIndex] = updatedFlow;
    this.saveFmsFlows(updatedFlows);

    this.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module: 'FMS',
      action: 'UPDATE',
      entityId: flow.flowId || flow.id,
      details: `Super Admin / Admin Override: Active stage moved from Stage ${prevStageIndex + 1} (${prevStageName}) to Stage ${targetStageIndex + 1} (${newStage.stageName}). Reason: ${reason}`,
    });

    return updatedFlow;
  }

  public updateFmsStageUrl(
    flowId: string,
    stageIndex: number,
    googleFormUrl: string,
    currentUser?: UserProfile
  ): FmsInstance | null {
    const flows = this.getFmsFlows();
    const targetIdx = flows.findIndex((f) => f.id === flowId || f.flowId === flowId);
    if (targetIdx === -1) return null;

    const flow = flows[targetIdx];
    const updatedStages = [...flow.stages];
    if (updatedStages[stageIndex]) {
      updatedStages[stageIndex] = {
        ...updatedStages[stageIndex],
        googleFormUrl,
      };
    }

    const updatedFlow: FmsInstance = {
      ...flow,
      stages: updatedStages,
      updatedAt: new Date().toLocaleString('en-GB')
    };

    flows[targetIdx] = updatedFlow;
    this.saveFmsFlows(flows);

    if (currentUser) {
      this.logAudit({
        userId: currentUser.userId,
        userName: currentUser.name,
        module: 'FMS',
        action: 'UPDATE',
        entityId: flow.flowId || flow.id,
        details: `Configured Stage ${stageIndex + 1} (${updatedStages[stageIndex]?.stageName}) external work URL: ${googleFormUrl}`
      });
    }

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

  // Site Registry CRUD & Master Site Helpers
  public getSiteRegistry(): SiteRegistryItem[] {
    if (typeof window === 'undefined') return INITIAL_SITE_REGISTRY;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.SITES);
      if (!raw) return INITIAL_SITE_REGISTRY;
      const parsed: SiteRegistryItem[] = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_SITE_REGISTRY;
    } catch {
      return INITIAL_SITE_REGISTRY;
    }
  }

  public saveSiteRegistry(items: SiteRegistryItem[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.SITES, JSON.stringify(items));
    this.syncToFirestore('sitesRegistry', items, 'id');
  }

  public getActiveSites(): SiteRegistryItem[] {
    return this.getSiteRegistry().filter((s) => s.status === 'ACTIVE');
  }

  public addSiteRegistryItem(code: string, name: string): SiteRegistryItem[] {
    const cleanCode = code.trim().toUpperCase();
    const cleanName = name.trim();
    if (!cleanName) return this.getSiteRegistry();

    const current = this.getSiteRegistry();
    const newSite: SiteRegistryItem = {
      id: `site_${Date.now()}`,
      code: cleanCode || cleanName.slice(0, 3).toUpperCase(),
      name: cleanName,
      status: 'ACTIVE',
      createdAt: new Date().toLocaleDateString('en-GB'),
    };
    const updated = [newSite, ...current];
    this.saveSiteRegistry(updated);

    const config = this.getRegistryConfig();
    const masterSites = Array.from(new Set([...(config.masterSites || []), cleanName]));
    this.saveRegistryConfig({ ...config, masterSites });

    this.logAudit({
      userId: 'ADMIN',
      userName: 'Central Administrator',
      module: 'REGISTRY',
      action: 'CREATE',
      entityId: newSite.id,
      details: `Added new site to Central Registry: ${newSite.code} - ${newSite.name}`
    });

    return updated;
  }

  public updateSiteRegistryItem(id: string, updates: Partial<SiteRegistryItem>): SiteRegistryItem[] {
    const current = this.getSiteRegistry();
    const updated = current.map((item) => {
      if (item.id === id) {
        return {
          ...item,
          ...updates,
          updatedAt: new Date().toLocaleDateString('en-GB'),
        };
      }
      return item;
    });
    this.saveSiteRegistry(updated);
    return updated;
  }

  public toggleArchiveSiteRegistryItem(id: string): SiteRegistryItem[] {
    const current = this.getSiteRegistry();
    const updated = current.map((item) => {
      if (item.id === id) {
        const nextStatus: 'ACTIVE' | 'ARCHIVED' = item.status === 'ACTIVE' ? 'ARCHIVED' : 'ACTIVE';
        return {
          ...item,
          status: nextStatus,
          updatedAt: new Date().toLocaleDateString('en-GB'),
        };
      }
      return item;
    });
    this.saveSiteRegistry(updated);
    return updated;
  }

  public deleteSiteRegistryItem(id: string): SiteRegistryItem[] {
    const current = this.getSiteRegistry();
    const updated = current.filter((item) => item.id !== id);
    this.saveSiteRegistry(updated);
    return updated;
  }

  public getMasterSites(): string[] {
    const activeSites = this.getActiveSites();
    if (activeSites.length > 0) {
      return activeSites.map((s) => s.name);
    }
    const config = this.getRegistryConfig();
    const defaults = ['Siladehi Site', 'Bijetala Site', 'Raipur Office', 'Central Store'];
    if (config.masterSites && Array.isArray(config.masterSites) && config.masterSites.length > 0) {
      const merged = Array.from(new Set([...defaults, ...config.masterSites]));
      return merged;
    }
    return defaults;
  }

  public addMasterSite(siteName: string): string[] {
    const clean = siteName.trim();
    if (!clean) return this.getMasterSites();
    return this.addSiteRegistryItem(clean.slice(0, 3).toUpperCase(), clean).map(s => s.name);
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
          (c.templateKey && (
            c.templateKey === sys.templateKey ||
            (sys.templateKey === 'CHECK_STOCK' && (c.templateKey === 'STORE_CHECK_STOCK' || c.id === 'tpl_store_check_stock' || c.name.toLowerCase().includes('store check stock')))
          )) ||
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
      const normalized = deduped.map((u) => {
        const initialMatch = USERS.find((initU) => initU.userId === u.userId);
        let perms = u.permissions;
        if (u.userId === 'USR-ADMIN-01') {
          // Merge permissions for USR-ADMIN-01 ensuring operations are hidden and utilities, departments, governance are visible
          perms = {
            ...initialMatch?.permissions,
            ...(u.permissions || {}),
            fms: { visible: false, canEdit: false, canDelete: false },
            'fms-audit': { visible: false, canEdit: false, canDelete: false },
            delegation: { visible: false, canEdit: false, canDelete: false },
            checklist: { visible: false, canEdit: false, canDelete: false },
            ims: { visible: false, canEdit: false, canDelete: false },
            'cs-sheet': { visible: true, canEdit: true, canDelete: true },
            'dept-PURCHASE': u.permissions?.['dept-PURCHASE'] || { visible: true, canEdit: true, canDelete: true },
            'dept-STORE': u.permissions?.['dept-STORE'] || { visible: true, canEdit: true, canDelete: true },
            'dept-ACCOUNTS': u.permissions?.['dept-ACCOUNTS'] || { visible: true, canEdit: true, canDelete: true },
            'dept-PLANT_OPS': u.permissions?.['dept-PLANT_OPS'] || { visible: true, canEdit: true, canDelete: true },
            registry: u.permissions?.registry || { visible: true, canEdit: true, canDelete: true },
            audit: u.permissions?.audit || { visible: true, canEdit: true, canDelete: true },
            'super-admin': u.permissions?.['super-admin'] || { visible: true, canEdit: true, canDelete: true },
          };
        } else if (!perms) {
          perms = initialMatch?.permissions;
        }
        return {
          ...u,
          whatsappPhone: u.whatsappPhone || u.phone || '9827100000',
          permissions: perms,
        };
      });
      localStorage.setItem(STORAGE_KEYS.USERS, JSON.stringify(normalized));
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

  // Comparative Statement (CS Sheet) for Barbrik Project Ltd.
  public getComparativeStatements(): ComparativeStatement[] {
    if (typeof window === 'undefined') return INITIAL_COMPARATIVE_STATEMENTS;
    try {
      const data = localStorage.getItem(STORAGE_KEYS.CS_SHEETS);
      if (!data) {
        localStorage.setItem(STORAGE_KEYS.CS_SHEETS, JSON.stringify(INITIAL_COMPARATIVE_STATEMENTS));
        return INITIAL_COMPARATIVE_STATEMENTS;
      }
      return JSON.parse(data);
    } catch (e) {
      return INITIAL_COMPARATIVE_STATEMENTS;
    }
  }

  public getComparativeStatementById(id: string): ComparativeStatement | null {
    const list = this.getComparativeStatements();
    return list.find((cs) => cs.id === id) || null;
  }

  public saveComparativeStatement(statement: ComparativeStatement): ComparativeStatement {
    const list = this.getComparativeStatements();
    const existingIdx = list.findIndex((cs) => cs.id === statement.id);
    const updated = [...list];
    const timestamp = new Date().toLocaleString('en-GB');
    const statementWithMeta: ComparativeStatement = {
      ...statement,
      companyName: 'Barbrik Project Ltd.',
      updatedAt: timestamp,
      createdAt: statement.createdAt || timestamp,
    };

    if (existingIdx >= 0) {
      updated[existingIdx] = statementWithMeta;
    } else {
      updated.unshift(statementWithMeta);
    }

    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CS_SHEETS, JSON.stringify(updated));
    }
    this.syncToFirestore('comparativeStatements', updated, 'id');
    this.notifyListeners();

    if (statement.status === 'Approved') {
      this.logAudit({
        userId: statement.approvalDetails?.approverName ? 'USR-013' : 'DIR',
        userName: statement.approvalDetails?.approverName || 'Pranjal Agrawal',
        module: 'COMPARATIVE_SHEET',
        action: 'STAGE_ADVANCE',
        entityId: statement.id,
        details: `Director Pranjal Agrawal approved Comparative Statement #${statement.id} for Indent #${statement.indentNo} with item-wise split vendor allocation.`
      });
    }

    return statementWithMeta;
  }

  public createComparativeSheetFromFms(flow: FmsInstance, currentUser?: UserProfile): ComparativeStatement {
    const timestamp = new Date().toLocaleString('en-GB');
    const existingCsList = this.getComparativeStatements();
    const existing = existingCsList.find((c) => (flow.indentNo && c.indentNo === flow.indentNo) || c.id === flow.comparativeSheetId);
    if (existing) {
      return existing;
    }

    const todayDate = new Date().toLocaleDateString('en-GB');
    let csItems: CsItem[] = [];
    if (flow.lineItems && flow.lineItems.length > 0) {
      csItems = flow.lineItems.map((li, idx) => ({
        id: `cs-it-${Date.now()}-${idx + 1}`,
        sn: idx + 1,
        itemName: li.itemDescription || `Requisition Item #${idx + 1}`,
        brandMake: 'Reputed/OEM',
        unit: li.unit || 'Nos',
        qty: li.qty || 1,
      }));
    } else {
      csItems = [
        {
          id: `cs-it-${Date.now()}-1`,
          sn: 1,
          itemName: flow.remarks ? flow.remarks.split(';')[0].slice(0, 50) : 'Plant Machinery Spares / Material',
          brandMake: 'OEM Spec',
          unit: 'Nos',
          qty: 5,
        },
        {
          id: `cs-it-${Date.now()}-2`,
          sn: 2,
          itemName: 'Hydraulic Seal & Filter Kit',
          brandMake: 'Standard',
          unit: 'Set',
          qty: 2,
        }
      ];
    }

    const vendors: CsVendorQuote[] = [
      {
        vendorId: 'VND-001',
        vendorName: 'M/S MAHAVIR TRADERS & SPARES',
        rating: '4.8 / 5.0 (Top Rated Local Supplier)',
        contactPersonMobile: 'Kanhaiya Lal | Mo: +91-9826101122',
        storeOfficeAddress: 'Transport Nagar, Raipur (C.G.)',
        paymentTerms: '30 Days Net from Delivery',
        warrantyPeriod: '12 Months Standard Warranty',
        gstTerms: '18% GST Applicable',
        freightDeliveryTerms: 'OURS (Barbrik Transit Vehicle Pickup)',
        quotationDateValidity: `${todayDate} | 15 Days Validity`,
        primaryProductFocus: 'Heavy Equipment Spares & Consumables',
        itemRates: {
          [csItems[0].id]: { baseRate: 4200, gstPercent: 18, gstAmount: 756, landedRate: 4956, amount: 4956 * (csItems[0]?.qty || 1), isQuoted: true },
          ...(csItems[1] ? { [csItems[1].id]: { baseRate: 3100, gstPercent: 18, gstAmount: 558, landedRate: 3658, amount: 3658 * (csItems[1]?.qty || 1), isQuoted: true } } : {})
        }
      },
      {
        vendorId: 'VND-002',
        vendorName: 'M/S CHHATTISGARH INDUSTRIAL BEARINGS',
        rating: '4.6 / 5.0 (OEM Certified Distributor)',
        contactPersonMobile: 'Suresh Agrawal | Mo: +91-9425203344',
        storeOfficeAddress: 'G.E. Road, Bhilai (C.G.)',
        paymentTerms: '50% Advance via Bank, Balance on Delivery',
        warrantyPeriod: '6 Months Replacement Warranty',
        gstTerms: '18% GST Applicable',
        freightDeliveryTerms: 'THEIRS (Door Delivery to Site)',
        quotationDateValidity: `${todayDate} | 10 Days Validity`,
        primaryProductFocus: 'Bearings, Seals & Hydraulics',
        itemRates: {
          [csItems[0].id]: { baseRate: 4500, gstPercent: 18, gstAmount: 810, landedRate: 5310, amount: 5310 * (csItems[0]?.qty || 1), isQuoted: true },
          ...(csItems[1] ? { [csItems[1].id]: { baseRate: 2900, gstPercent: 18, gstAmount: 522, landedRate: 3422, amount: 3422 * (csItems[1]?.qty || 1), isQuoted: true } } : {})
        }
      }
    ];

    const newCs: ComparativeStatement = {
      id: `cs-${Date.now()}`,
      companyName: 'Barbrik Project Ltd.',
      site: flow.siteName || 'BIJETALA',
      indentNo: flow.indentNo || `IND-${Date.now().toString().slice(-4)}`,
      indentDate: flow.indentDate || todayDate,
      forPurpose: flow.remarks || `Material procurement for ${flow.siteName} site`,
      statementDate: todayDate,
      items: csItems,
      vendors,
      status: 'Draft',
      notes: `Auto-generated from FMS Requisition #${flow.indentNo} for comparative rate analysis & director approval.`,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const saved = this.saveComparativeStatement(newCs);
    this.logAudit({
      userId: currentUser?.userId || 'PURCHASE',
      userName: currentUser?.name || 'Purchase Dept',
      module: 'COMPARATIVE_SHEET',
      action: 'CREATE',
      entityId: saved.id,
      details: `Auto-generated Comparative Statement #${saved.id} with ${csItems.length} items from FMS Flow #${flow.flowId} (Indent #${flow.indentNo}).`
    });

    return saved;
  }

  public deleteComparativeStatement(id: string): void {
    const list = this.getComparativeStatements();
    const updated = list.filter((cs) => cs.id !== id);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.CS_SHEETS, JSON.stringify(updated));
    }
    this.deleteFromFirestore('comparativeStatements', id);
    this.notifyListeners();
  }

  public createSplitPurchaseOrdersFromCs(
    cs: ComparativeStatement,
    currentUser?: UserProfile
  ): { createdFlows: FmsInstance[]; updatedCs: ComparativeStatement } {
    const existingFlows = this.getFmsFlows();
    const createdFlows: FmsInstance[] = [];
    const timestamp = new Date().toLocaleString('en-GB');

    // Group items by awarded vendor
    const vendorItemsMap: Record<string, CsItem[]> = {};
    const awardedMap = cs.awardedVendorMap || {};

    cs.items.forEach((item) => {
      const assignedVendorId = awardedMap[item.id] || cs.vendors[0]?.vendorId;
      if (assignedVendorId) {
        if (!vendorItemsMap[assignedVendorId]) {
          vendorItemsMap[assignedVendorId] = [];
        }
        vendorItemsMap[assignedVendorId].push(item);
      }
    });

    let poCounter = 1;
    const safeSite = (cs.site || 'SITE').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
    const safeIndent = (cs.indentNo || 'IND').replace(/[^a-zA-Z0-9]/g, '');

    for (const [vendorId, items] of Object.entries(vendorItemsMap)) {
      const vendor = cs.vendors.find((v) => v.vendorId === vendorId);
      if (!vendor) continue;

      let poTotal = 0;
      const itemsDetailList: string[] = [];

      items.forEach((item) => {
        const rateObj = vendor.itemRates[item.id];
        const amt = rateObj ? rateObj.amount : 0;
        poTotal += amt;
        itemsDetailList.push(`${item.itemName} (${item.qty} ${item.unit})`);
      });

      const poSuffix = String.fromCharCode(64 + poCounter); // A, B, C...
      const poNumber = `PO-BPL-${safeSite}-${safeIndent}-${poSuffix}`;
      const flowId = `flow-po-${Date.now()}-${poCounter}`;

      const newFlow: FmsInstance = {
        id: flowId,
        flowId: flowId,
        flowType: 'INDENT_PURCHASE',
        indentNo: cs.indentNo || 'IND-466',
        indentDate: cs.indentDate || timestamp.slice(0, 10),
        siteName: cs.site || 'BIJETALA',
        priority: 'Normal',
        currentStageId: 'STAGE_PO_ISSUED',
        currentStageIndex: 2,
        totalStages: 5,
        status: 'In Progress',
        createdAt: timestamp,
        updatedAt: timestamp,
        poNumber: poNumber,
        vendorName: vendor.vendorName,
        poDate: timestamp.slice(0, 10),
        poAmount: Math.round(poTotal * 100) / 100,
        linkedFlowId: cs.id,
        remarks: `[Split PO ${poSuffix}] Approved by ${cs.approvalDetails?.approverName || 'Pranjal Agrawal'}. Items: ${itemsDetailList.slice(0, 3).join(', ')}${itemsDetailList.length > 3 ? '...' : ''}. Freight: OURS.`,
        totalDelayHours: 0,
        stages: [
          {
            stageId: 'STAGE_INDENT_APPROVAL',
            stageName: 'Indent Approved & CS Verified',
            assignee: 'Purchase Officer',
            how: 'Verify comparative statement approval',
            status: 'Completed',
            actualDateTime: timestamp,
            notes: `Approved in CS Sheet ${cs.id} by ${cs.approvalDetails?.approverName || 'Pranjal Agrawal'}`,
          },
          {
            stageId: 'STAGE_VENDOR_QUOTATION_L1',
            stageName: 'Quotation Comparison & L-1 Award',
            assignee: 'Purchase Officer',
            how: 'Evaluate vendor quotations and award',
            status: 'Completed',
            actualDateTime: timestamp,
            notes: `Awarded to ${vendor.vendorName} (Landed: ₹${poTotal.toLocaleString('en-IN')})`,
          },
          {
            stageId: 'STAGE_PO_ISSUED',
            stageName: 'Purchase Order Generation & Issue',
            assignee: 'Purchase Head',
            how: 'Issue official Barbrik PO to vendor',
            status: 'In Progress',
            notes: `PO ${poNumber} generated. Delivery terms: OURS (Barbrik Fleet).`,
          },
          {
            stageId: 'STAGE_MATERIAL_DISPATCH',
            stageName: 'Vendor Dispatch & Barbrik Transit',
            assignee: 'Store Keeper',
            how: 'Coordinate fleet transit and dispatch',
            status: 'Pending',
          },
          {
            stageId: 'STAGE_GRN_AND_BILL',
            stageName: 'Site Delivery, GRN & Bill Booking',
            assignee: 'Accounts Executive',
            how: 'Inspect site delivery and book vendor invoice',
            status: 'Pending',
          },
        ],
      };

      createdFlows.push(newFlow);
      poCounter++;
    }

    // Save flows
    const updatedFlows = [...createdFlows, ...existingFlows];
    this.saveFmsFlows(updatedFlows);

    // Update CS Statement
    const updatedCs: ComparativeStatement = {
      ...cs,
      status: 'PO Created',
      generatedPoIds: createdFlows.map((f) => f.flowId),
    };
    this.saveComparativeStatement(updatedCs);

    this.logAudit({
      userId: currentUser?.userId || 'PRANJAL_AGRAWAL',
      userName: currentUser?.name || cs.approvalDetails?.approverName || 'Pranjal Agrawal',
      module: 'FMS',
      action: 'CREATE',
      entityId: cs.id,
      details: `Generated ${createdFlows.length} Split Purchase Orders (${createdFlows.map((f) => f.poNumber).join(', ')}) from Comparative Statement ${cs.id}`,
    });

    return { createdFlows, updatedCs };
  }

  public resetToSeedData() {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.FMS, JSON.stringify(INITIAL_FMS_FLOWS));
    localStorage.setItem(STORAGE_KEYS.DELEGATION, JSON.stringify(INITIAL_DELEGATION_TASKS));
    localStorage.setItem(STORAGE_KEYS.CHECKLIST, JSON.stringify(INITIAL_CHECKLIST_ITEMS));
    localStorage.setItem(STORAGE_KEYS.INVENTORY, JSON.stringify(INITIAL_INVENTORY_ITEMS));
    localStorage.setItem(STORAGE_KEYS.MOVEMENTS, JSON.stringify(INITIAL_INVENTORY_MOVEMENTS));
    localStorage.setItem(STORAGE_KEYS.REGISTRY, JSON.stringify(DEFAULT_REGISTRY_CONFIG));
    localStorage.setItem(STORAGE_KEYS.CS_SHEETS, JSON.stringify(INITIAL_COMPARATIVE_STATEMENTS));
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

  // ============================================================================
  // BANK PAYMENTS, BENEFICIARY MASTER & IBT METHODS
  // ============================================================================

  // 1. Bank Payments CRUD & Workflow
  public getBankPayments(): BankPaymentRecord[] {
    if (typeof window === 'undefined') return INITIAL_BANK_PAYMENTS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BANK_PAYMENTS);
      if (!raw) return INITIAL_BANK_PAYMENTS;
      const parsed: BankPaymentRecord[] = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_BANK_PAYMENTS;
    } catch {
      return INITIAL_BANK_PAYMENTS;
    }
  }

  public saveBankPayments(records: BankPaymentRecord[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.BANK_PAYMENTS, JSON.stringify(records));
    this.syncToFirestore('bankPayments', records, 'id');
  }

  public addBankPaymentRecord(
    data: Omit<BankPaymentRecord, 'id' | 'sheetNo' | 'timestamp' | 'approvalStatus' | 'paymentEntry' | 'paymentStatus'>,
    currentUser?: UserProfile
  ): BankPaymentRecord {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const currentList = this.getBankPayments();
    const dailyCount = currentList.filter(p => p.sheetNo && p.sheetNo.includes(dateStr)).length + 1;
    const seqStr = String(dailyCount).padStart(2, '0');
    const sheetNo = `BPL/BANK/${dateStr}/${seqStr}`;

    const newRecord: BankPaymentRecord = {
      id: `bank-${Date.now()}`,
      sheetNo,
      timestamp: new Date().toLocaleString('en-GB'),
      ...data,
      requestedBy: currentUser?.name || data.requestedBy || 'Requester Staff',
      requestedByUserId: currentUser?.userId || data.requestedByUserId,
      approvalStatus: 'PENDING',
      paymentEntry: 'PENDING',
      paymentStatus: 'PENDING',
    };

    // Auto-queue unverified account into Beneficiary Master if needed
    if (data.modeOfPayment === 'ACCOUNT' && data.beneficiaryMasterStatus === 'NEEDS_ADDITION' && data.cancelledChequeUrl) {
      const benSheetNo = `BPL/BEN/${dateStr}/${seqStr}`;
      const newBen: BeneficiaryRecord = {
        id: `ben-${Date.now()}`,
        sheetNo: benSheetNo,
        timestamp: new Date().toLocaleString('en-GB'),
        beneficiaryName: data.beneficiaryName || data.vendorName,
        tradeVendorName: data.vendorName,
        accountNo: data.accountNoMasked || 'Pending Account No',
        ifscCode: data.ifscCode || 'Pending IFSC',
        bankName: data.bankName || 'Pending Bank',
        purpose: data.purposeOfPayment,
        cancelledChequeUrl: data.cancelledChequeUrl,
        remark: `Auto-queued from Bank Payment Request #${sheetNo}`,
        requestedBy: currentUser?.name || data.requestedBy,
        approvalStatus: 'PENDING',
        beneficiaryEntry: 'PENDING',
        additionStatus: 'PENDING',
      };
      newRecord.linkedBeneficiarySheetNo = benSheetNo;
      this.addBeneficiaryRecordDirect(newBen);
    }

    const updated = [newRecord, ...currentList];
    this.saveBankPayments(updated);

    this.logAudit({
      userId: currentUser?.userId || 'USER',
      userName: currentUser?.name || 'Requester Staff',
      module: 'FMS',
      action: 'CREATE',
      entityId: newRecord.sheetNo,
      details: `Submitted new Bank Payment Request #${newRecord.sheetNo} for ${newRecord.vendorName} (₹${newRecord.amountToBePaid.toLocaleString('en-IN')})`
    });

    return newRecord;
  }

  public approveBankPayment(
    idOrSheetNo: string,
    approved: boolean,
    currentUser: UserProfile,
    rejectionReason?: string
  ): BankPaymentRecord | null {
    return this.approveBankPaymentRecord(idOrSheetNo, approved, currentUser, rejectionReason);
  }

  public approveBankPaymentRecord(
    idOrSheetNo: string,
    approved: boolean,
    currentUser: UserProfile,
    rejectionReason?: string
  ): BankPaymentRecord | null {
    const list = this.getBankPayments();
    let updatedRecord: BankPaymentRecord | null = null;

    const updated = list.map(p => {
      if (p.id === idOrSheetNo || p.sheetNo === idOrSheetNo) {
        updatedRecord = {
          ...p,
          approvalStatus: approved ? 'APPROVED' : 'REJECTED',
          approvalTimestamp: new Date().toLocaleString('en-GB'),
          approvedBy: currentUser.name,
          approvedByUserId: currentUser.userId,
          rejectionReason: approved ? undefined : (rejectionReason || 'Rejected by Director'),
          ...(!approved ? { paymentEntry: 'CANCELLED' as const, paymentStatus: 'CANCELLED' as const } : {})
        };
        return updatedRecord;
      }
      return p;
    });

    if (updatedRecord) {
      this.saveBankPayments(updated);
      this.logAudit({
        userId: currentUser.userId,
        userName: currentUser.name,
        module: 'BANKING',
        action: 'STATUS_CHANGE',
        entityId: (updatedRecord as BankPaymentRecord).sheetNo,
        details: `${approved ? 'Approved' : 'Rejected'} Bank Payment Request #${(updatedRecord as BankPaymentRecord).sheetNo}. ${rejectionReason ? `Reason: ${rejectionReason}` : ''}`
      });
    }

    return updatedRecord;
  }

  public recordBankPaymentEntry(
    idOrSheetNo: string,
    status: PaymentStepStatus,
    proofUrl?: string,
    currentUser?: UserProfile
  ): BankPaymentRecord | null {
    const list = this.getBankPayments();
    let updatedRecord: BankPaymentRecord | null = null;

    const updated = list.map(p => {
      if (p.id === idOrSheetNo || p.sheetNo === idOrSheetNo) {
        updatedRecord = {
          ...p,
          paymentEntry: status,
          paymentEntryTimestamp: new Date().toLocaleString('en-GB'),
          paymentEntryProof: proofUrl || p.paymentEntryProof,
          paymentEntryBy: currentUser?.name || 'Accounts Staff',
          ...(status === 'CANCELLED' ? { paymentStatus: 'CANCELLED' as const } : {})
        };
        return updatedRecord;
      }
      return p;
    });

    if (updatedRecord) {
      this.saveBankPayments(updated);
      this.logAudit({
        userId: currentUser?.userId || 'ACCOUNTS',
        userName: currentUser?.name || 'Accounts Staff',
        module: 'BANKING',
        action: 'UPDATE',
        entityId: (updatedRecord as BankPaymentRecord).sheetNo,
        details: `Recorded Bank Portal Entry (${status}) for #${(updatedRecord as BankPaymentRecord).sheetNo}`
      });
    }

    return updatedRecord;
  }

  public finalizeBankPaymentSettlement(
    idOrSheetNo: string,
    status: PaymentStepStatus,
    utrRef?: string,
    proofUrl?: string,
    currentUser?: UserProfile
  ): BankPaymentRecord | null {
    const list = this.getBankPayments();
    let updatedRecord: BankPaymentRecord | null = null;

    const updated = list.map(p => {
      if (p.id === idOrSheetNo || p.sheetNo === idOrSheetNo) {
        updatedRecord = {
          ...p,
          paymentStatus: status,
          paymentDoneTimestamp: new Date().toLocaleString('en-GB'),
          remarks: utrRef || p.remarks,
          paymentDoneProof: proofUrl || p.paymentDoneProof,
          paymentDoneBy: currentUser?.name || 'Accounts Staff'
        };
        return updatedRecord;
      }
      return p;
    });

    if (updatedRecord) {
      this.saveBankPayments(updated);
      this.logAudit({
        userId: currentUser?.userId || 'ACCOUNTS',
        userName: currentUser?.name || 'Accounts Staff',
        module: 'BANKING',
        action: 'STATUS_CHANGE',
        entityId: (updatedRecord as BankPaymentRecord).sheetNo,
        details: `Finalized Bank Settlement (${status}) for #${(updatedRecord as BankPaymentRecord).sheetNo}. UTR: ${utrRef || 'N/A'}`
      });
    }

    return updatedRecord;
  }

  public updateBankPaymentStatus(
    idOrSheetNo: string,
    field: 'approvalStatus' | 'paymentEntry' | 'paymentStatus',
    value: string,
    currentUser?: UserProfile
  ): BankPaymentRecord | null {
    const list = this.getBankPayments();
    let updatedRecord: BankPaymentRecord | null = null;

    const updated = list.map(p => {
      if (p.id === idOrSheetNo || p.sheetNo === idOrSheetNo) {
        let newApproval = p.approvalStatus;
        let newEntry = p.paymentEntry;
        let newStatus = p.paymentStatus;

        if (field === 'approvalStatus') {
          newApproval = value as any;
          if (value === 'REJECTED') {
            newEntry = 'CANCELLED';
            newStatus = 'CANCELLED';
          }
        } else if (field === 'paymentEntry') {
          newEntry = value as any;
          if (value === 'CANCELLED') {
            newStatus = 'CANCELLED';
          }
        } else if (field === 'paymentStatus') {
          newStatus = value as any;
        }

        updatedRecord = {
          ...p,
          approvalStatus: newApproval,
          paymentEntry: newEntry,
          paymentStatus: newStatus,
          ...(field === 'approvalStatus' && value === 'APPROVED' ? { approvedBy: currentUser?.name, approvalTimestamp: new Date().toLocaleString('en-GB') } : {}),
          ...(field === 'paymentEntry' ? { paymentEntryBy: currentUser?.name, paymentEntryTimestamp: new Date().toLocaleString('en-GB') } : {}),
          ...(field === 'paymentStatus' ? { paymentDoneBy: currentUser?.name, paymentDoneTimestamp: new Date().toLocaleString('en-GB') } : {}),
        };
        return updatedRecord;
      }
      return p;
    });

    if (updatedRecord) {
      this.saveBankPayments(updated);
      this.logAudit({
        userId: currentUser?.userId || 'SYSTEM',
        userName: currentUser?.name || 'User',
        module: 'BANKING',
        action: 'STATUS_CHANGE',
        entityId: (updatedRecord as BankPaymentRecord).sheetNo,
        details: `Updated ${field} to ${value} for Bank Payment #${(updatedRecord as BankPaymentRecord).sheetNo}`
      });
    }

    return updatedRecord;
  }

  // 2. Beneficiary Master CRUD
  public getBeneficiaryRecords(): BeneficiaryRecord[] {
    if (typeof window === 'undefined') return INITIAL_BENEFICIARIES;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.BENEFICIARIES);
      if (!raw) return INITIAL_BENEFICIARIES;
      const parsed: BeneficiaryRecord[] = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_BENEFICIARIES;
    } catch {
      return INITIAL_BENEFICIARIES;
    }
  }

  public saveBeneficiaryRecords(records: BeneficiaryRecord[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.BENEFICIARIES, JSON.stringify(records));
    this.syncToFirestore('beneficiaries', records, 'id');
  }

  private addBeneficiaryRecordDirect(record: BeneficiaryRecord) {
    const current = this.getBeneficiaryRecords();
    this.saveBeneficiaryRecords([record, ...current]);
  }

  public addBeneficiaryRecord(
    data: Omit<BeneficiaryRecord, 'id' | 'sheetNo' | 'timestamp' | 'approvalStatus' | 'beneficiaryEntry' | 'additionStatus'>,
    currentUser?: UserProfile
  ): BeneficiaryRecord {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const current = this.getBeneficiaryRecords();
    const dailyCount = current.filter(b => b.sheetNo && b.sheetNo.includes(dateStr)).length + 1;
    const seqStr = String(dailyCount).padStart(2, '0');
    const sheetNo = `BPL/BEN/${dateStr}/${seqStr}`;

    const newRecord: BeneficiaryRecord = {
      id: `ben-${Date.now()}`,
      sheetNo,
      timestamp: new Date().toLocaleString('en-GB'),
      ...data,
      requestedBy: currentUser?.name || data.requestedBy || 'Accounts Officer',
      approvalStatus: 'PENDING',
      beneficiaryEntry: 'PENDING',
      additionStatus: 'PENDING'
    };

    this.saveBeneficiaryRecords([newRecord, ...current]);
    this.logAudit({
      userId: currentUser?.userId || 'ACCOUNTS',
      userName: currentUser?.name || 'Accounts Staff',
      module: 'REGISTRY',
      action: 'CREATE',
      entityId: newRecord.sheetNo,
      details: `Created Beneficiary Master Registration Request #${newRecord.sheetNo} for ${newRecord.beneficiaryName}`
    });

    return newRecord;
  }

  public approveBeneficiaryRecord(
    idOrSheetNo: string,
    approved: boolean,
    currentUser: UserProfile,
    rejectionReason?: string
  ): BeneficiaryRecord | null {
    const list = this.getBeneficiaryRecords();
    let updatedRecord: BeneficiaryRecord | null = null;

    const updated = list.map(b => {
      if (b.id === idOrSheetNo || b.sheetNo === idOrSheetNo) {
        updatedRecord = {
          ...b,
          approvalStatus: approved ? 'APPROVED' : 'REJECTED',
          approvalTimestamp: new Date().toLocaleString('en-GB'),
          approvedBy: currentUser.name,
          rejectionReason: approved ? undefined : rejectionReason
        };
        return updatedRecord;
      }
      return b;
    });

    if (updatedRecord) {
      this.saveBeneficiaryRecords(updated);
    }
    return updatedRecord;
  }

  public recordBeneficiaryEntry(
    idOrSheetNo: string,
    status: PaymentStepStatus,
    proofUrl?: string,
    currentUser?: UserProfile
  ): BeneficiaryRecord | null {
    const list = this.getBeneficiaryRecords();
    let updatedRecord: BeneficiaryRecord | null = null;

    const updated = list.map(b => {
      if (b.id === idOrSheetNo || b.sheetNo === idOrSheetNo) {
        updatedRecord = {
          ...b,
          beneficiaryEntry: status,
          beneficiaryEntryTimestamp: new Date().toLocaleString('en-GB'),
          beneficiaryEntryProof: proofUrl || b.beneficiaryEntryProof
        };
        return updatedRecord;
      }
      return b;
    });

    if (updatedRecord) {
      this.saveBeneficiaryRecords(updated);
    }
    return updatedRecord;
  }

  public finalizeBeneficiaryAddition(
    idOrSheetNo: string,
    status: PaymentStepStatus,
    proofUrl?: string,
    currentUser?: UserProfile
  ): BeneficiaryRecord | null {
    const list = this.getBeneficiaryRecords();
    let updatedRecord: BeneficiaryRecord | null = null;

    const updated = list.map(b => {
      if (b.id === idOrSheetNo || b.sheetNo === idOrSheetNo) {
        updatedRecord = {
          ...b,
          additionStatus: status,
          additionTimestamp: new Date().toLocaleString('en-GB'),
          additionProof: proofUrl || b.additionProof
        };
        return updatedRecord;
      }
      return b;
    });

    if (updatedRecord) {
      this.saveBeneficiaryRecords(updated);
    }
    return updatedRecord;
  }

  public updateBeneficiaryRecordStatus(
    idOrSheetNo: string,
    field: 'approvalStatus' | 'beneficiaryEntry' | 'additionStatus',
    value: string,
    currentUser?: UserProfile
  ): BeneficiaryRecord | null {
    const list = this.getBeneficiaryRecords();
    let updatedRecord: BeneficiaryRecord | null = null;

    const updated = list.map(b => {
      if (b.id === idOrSheetNo || b.sheetNo === idOrSheetNo) {
        updatedRecord = {
          ...b,
          [field]: value
        };
        if (field === 'approvalStatus') {
          updatedRecord.approvalTimestamp = new Date().toLocaleString('en-GB');
          if (currentUser) updatedRecord.approvedBy = currentUser.name;
          if (value === 'REJECTED') {
            updatedRecord.beneficiaryEntry = 'CANCELLED';
            updatedRecord.additionStatus = 'CANCELLED';
          }
        } else if (field === 'beneficiaryEntry') {
          updatedRecord.beneficiaryEntryTimestamp = new Date().toLocaleString('en-GB');
          if (value === 'CANCELLED') {
            updatedRecord.additionStatus = 'CANCELLED';
          }
        } else if (field === 'additionStatus') {
          updatedRecord.additionTimestamp = new Date().toLocaleString('en-GB');
        }
        return updatedRecord;
      }
      return b;
    });

    if (updatedRecord) {
      this.saveBeneficiaryRecords(updated);
      this.logAudit({
        userId: currentUser?.userId || 'USER',
        userName: currentUser?.name || 'User',
        module: 'REGISTRY',
        action: 'STATUS_CHANGE',
        entityId: (updatedRecord as BeneficiaryRecord).sheetNo,
        details: `Updated ${field} to ${value} for Beneficiary #${(updatedRecord as BeneficiaryRecord).sheetNo}`
      });
    }
    return updatedRecord;
  }

  public updateBeneficiaryRecordDetails(
    idOrSheetNo: string,
    updates: Partial<BeneficiaryRecord>,
    currentUser?: UserProfile
  ): BeneficiaryRecord | null {
    const list = this.getBeneficiaryRecords();
    let updatedRecord: BeneficiaryRecord | null = null;

    const updated = list.map(b => {
      if (b.id === idOrSheetNo || b.sheetNo === idOrSheetNo) {
        updatedRecord = {
          ...b,
          ...updates
        };
        return updatedRecord;
      }
      return b;
    });

    if (updatedRecord) {
      this.saveBeneficiaryRecords(updated);
      this.logAudit({
        userId: currentUser?.userId || 'USER',
        userName: currentUser?.name || 'User',
        module: 'REGISTRY',
        action: 'UPDATE',
        entityId: (updatedRecord as BeneficiaryRecord).sheetNo,
        details: `Updated details for Beneficiary #${(updatedRecord as BeneficiaryRecord).sheetNo}`
      });
    }
    return updatedRecord;
  }

  public deleteBeneficiaryRecord(idOrSheetNo: string, currentUser?: UserProfile): boolean {
    const list = this.getBeneficiaryRecords();
    const target = list.find(b => b.id === idOrSheetNo || b.sheetNo === idOrSheetNo);
    if (!target) return false;

    const filtered = list.filter(b => b.id !== target.id && b.sheetNo !== target.sheetNo);
    this.saveBeneficiaryRecords(filtered);

    this.logAudit({
      userId: currentUser?.userId || 'USER',
      userName: currentUser?.name || 'User',
      module: 'REGISTRY',
      action: 'DELETE',
      entityId: target.sheetNo,
      details: `Deleted Beneficiary record #${target.sheetNo} (${target.beneficiaryName})`
    });

    return true;
  }


  // 3. Interbank Transfer (IBT) CRUD
  public getIbtRecords(): InterbankTransferRecord[] {
    if (typeof window === 'undefined') return INITIAL_IBT_RECORDS;
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.IBT);
      if (!raw) return INITIAL_IBT_RECORDS;
      const parsed: InterbankTransferRecord[] = JSON.parse(raw);
      return Array.isArray(parsed) && parsed.length > 0 ? parsed : INITIAL_IBT_RECORDS;
    } catch {
      return INITIAL_IBT_RECORDS;
    }
  }

  public saveIbtRecords(records: InterbankTransferRecord[]) {
    if (typeof window === 'undefined') return;
    localStorage.setItem(STORAGE_KEYS.IBT, JSON.stringify(records));
    this.syncToFirestore('ibtRecords', records, 'id');
  }

  public addIbtRecord(
    data: Omit<InterbankTransferRecord, 'id' | 'sheetNo' | 'timestamp' | 'approvalStatus' | 'bankEntry' | 'paymentStatus'>,
    currentUser?: UserProfile
  ): InterbankTransferRecord {
    const today = new Date();
    const dateStr = today.toISOString().slice(0, 10).replace(/-/g, '');
    const current = this.getIbtRecords();
    const dailyCount = current.filter(i => i.sheetNo && i.sheetNo.includes(dateStr)).length + 1;
    const seqStr = String(dailyCount).padStart(2, '0');
    const sheetNo = `BPL/IBT/${dateStr}/${seqStr}`;

    const newRecord: InterbankTransferRecord = {
      id: `ibt-${Date.now()}`,
      sheetNo,
      timestamp: new Date().toLocaleString('en-GB'),
      ...data,
      requestedBy: currentUser?.name || data.requestedBy || 'Accounts Staff',
      approvalStatus: 'PENDING',
      bankEntry: 'PENDING',
      paymentStatus: 'PENDING'
    };

    this.saveIbtRecords([newRecord, ...current]);
    this.logAudit({
      userId: currentUser?.userId || 'ACCOUNTS',
      userName: currentUser?.name || 'Accounts Staff',
      module: 'FMS',
      action: 'CREATE',
      entityId: newRecord.sheetNo,
      details: `Created Interbank Transfer Request #${newRecord.sheetNo} (₹${newRecord.amount.toLocaleString('en-IN')})`
    });

    return newRecord;
  }

  public approveIbtRecord(
    idOrSheetNo: string,
    approved: boolean,
    currentUser: UserProfile,
    rejectionReason?: string
  ): InterbankTransferRecord | null {
    const list = this.getIbtRecords();
    let updatedRecord: InterbankTransferRecord | null = null;

    const updated = list.map(i => {
      if (i.id === idOrSheetNo || i.sheetNo === idOrSheetNo) {
        updatedRecord = {
          ...i,
          approvalStatus: approved ? 'APPROVED' : 'REJECTED',
          approvalTimestamp: new Date().toLocaleString('en-GB'),
          approvedBy: currentUser.name,
          rejectionReason: approved ? undefined : rejectionReason
        };
        return updatedRecord;
      }
      return i;
    });

    if (updatedRecord) {
      this.saveIbtRecords(updated);
    }
    return updatedRecord;
  }

  public recordIbtBankEntry(
    idOrSheetNo: string,
    status: PaymentStepStatus,
    proofUrl?: string,
    currentUser?: UserProfile
  ): InterbankTransferRecord | null {
    const list = this.getIbtRecords();
    let updatedRecord: InterbankTransferRecord | null = null;

    const updated = list.map(i => {
      if (i.id === idOrSheetNo || i.sheetNo === idOrSheetNo) {
        updatedRecord = {
          ...i,
          bankEntry: status,
          bankEntryTimestamp: new Date().toLocaleString('en-GB'),
          bankEntryProof: proofUrl || i.bankEntryProof
        };
        return updatedRecord;
      }
      return i;
    });

    if (updatedRecord) {
      this.saveIbtRecords(updated);
    }
    return updatedRecord;
  }

  public finalizeIbtPayment(
    idOrSheetNo: string,
    status: PaymentStepStatus,
    utrRef?: string,
    proofUrl?: string,
    currentUser?: UserProfile
  ): InterbankTransferRecord | null {
    const list = this.getIbtRecords();
    let updatedRecord: InterbankTransferRecord | null = null;

    const updated = list.map(i => {
      if (i.id === idOrSheetNo || i.sheetNo === idOrSheetNo) {
        updatedRecord = {
          ...i,
          paymentStatus: status,
          paymentDoneTimestamp: new Date().toLocaleString('en-GB'),
          utrRef: utrRef || i.utrRef,
          paymentDoneProof: proofUrl || i.paymentDoneProof
        };
        return updatedRecord;
      }
      return i;
    });

    if (updatedRecord) {
      this.saveIbtRecords(updated);
    }
    return updatedRecord;
  }

  public updateIbtRecordStatus(
    idOrSheetNo: string,
    field: 'approvalStatus' | 'bankEntry' | 'paymentStatus',
    value: string,
    currentUser?: UserProfile
  ): InterbankTransferRecord | null {
    const list = this.getIbtRecords();
    let updatedRecord: InterbankTransferRecord | null = null;

    const updated = list.map(i => {
      if (i.id === idOrSheetNo || i.sheetNo === idOrSheetNo) {
        let newApproval = i.approvalStatus;
        let newEntry = i.bankEntry || 'PENDING';
        let newPayment = i.paymentStatus;

        if (field === 'approvalStatus') {
          newApproval = value as any;
          if (value === 'REJECTED') {
            newEntry = 'CANCELLED';
            newPayment = 'CANCELLED';
          }
        } else if (field === 'bankEntry') {
          newEntry = value as any;
          if (value === 'CANCELLED') {
            newPayment = 'CANCELLED';
          }
        } else if (field === 'paymentStatus') {
          newPayment = value as any;
        }

        updatedRecord = {
          ...i,
          approvalStatus: newApproval,
          bankEntry: newEntry,
          paymentStatus: newPayment,
          ...(field === 'approvalStatus' && value === 'APPROVED' ? { approvedBy: currentUser?.name, approvalTimestamp: new Date().toLocaleString('en-GB') } : {}),
          ...(field === 'bankEntry' ? { bankEntryTimestamp: new Date().toLocaleString('en-GB') } : {}),
          ...(field === 'paymentStatus' ? { paymentDoneTimestamp: new Date().toLocaleString('en-GB') } : {}),
        };
        return updatedRecord;
      }
      return i;
    });

    if (updatedRecord) {
      this.saveIbtRecords(updated);
      this.logAudit({
        userId: currentUser?.userId || 'USER',
        userName: currentUser?.name || 'User',
        module: 'BANKING',
        action: 'STATUS_CHANGE',
        entityId: (updatedRecord as InterbankTransferRecord).sheetNo,
        details: `Updated ${field} to ${value} for IBT #${(updatedRecord as InterbankTransferRecord).sheetNo}`
      });
    }

    return updatedRecord;
  }

  // 4. Fuzzy Autocomplete Matcher for Vendor / Beneficiary
  public matchVendorBeneficiary(query: string): VendorBeneficiaryMatch[] {
    if (!query || query.trim().length === 0) return [];
    const q = query.trim().toLowerCase();
    const matches: VendorBeneficiaryMatch[] = [];
    const seen = new Set<string>();

    const benList = this.getBeneficiaryRecords();
    benList.forEach(ben => {
      const bName = ben.beneficiaryName || '';
      const tName = ben.tradeVendorName || '';
      if (bName.toLowerCase().includes(q) || tName.toLowerCase().includes(q)) {
        const key = `${tName || bName}::${bName}`;
        if (!seen.has(key)) {
          seen.add(key);
          const isMismatch = Boolean(tName && bName && tName.toLowerCase() !== bName.toLowerCase());
          matches.push({
            vendorName: tName || bName,
            beneficiaryName: bName,
            isMismatch,
            bankName: ben.bankName,
            accountNoMasked: `••••••••${(ben.accountNo || '').slice(-4)}`,
            ifscCode: ben.ifscCode,
            hasVerifiedBeneficiary: ben.approvalStatus === 'APPROVED' && ben.additionStatus === 'DONE',
            cancelledChequeUrl: ben.cancelledChequeUrl,
            category: ben.purpose
          });
        }
      }
    });

    const bankPayments = this.getBankPayments();
    bankPayments.forEach(bp => {
      const vName = bp.vendorName || '';
      const bName = bp.beneficiaryName || '';
      if (vName.toLowerCase().includes(q) || bName.toLowerCase().includes(q)) {
        const key = `${vName}::${bName}`;
        if (!seen.has(key)) {
          seen.add(key);
          matches.push({
            vendorName: vName,
            beneficiaryName: bName,
            isMismatch: bp.isNameMismatch,
            bankName: bp.bankName,
            accountNoMasked: bp.accountNoMasked,
            ifscCode: bp.ifscCode,
            hasVerifiedBeneficiary: bp.beneficiaryMasterStatus === 'VERIFIED',
            cancelledChequeUrl: bp.cancelledChequeUrl,
            category: bp.purposeOfPayment
          });
        }
      }
    });

    return matches.slice(0, 8);
  }

  // 5. My Work Integration for Bank Payments
  public getMyWorkBankingTasks(currentUser: UserProfile) {
    const isDirector = isUserDirector(currentUser);
    const isAccounts = (currentUser.departmentKeys || []).includes('ACCOUNTS') || (currentUser.departmentName || '').toUpperCase().includes('ACCOUNTS') || currentUser.role.toUpperCase().includes('ACCOUNTS');

    const bankPayments = this.getBankPayments();
    const beneficiaries = this.getBeneficiaryRecords();
    const ibtRecords = this.getIbtRecords();

    // Director My Work: Pending Payment Approvals ONLY
    const directorPendingPayments = isDirector
      ? bankPayments.filter(p => p.approvalStatus === 'PENDING')
      : [];

    const directorPendingIbt = isDirector
      ? ibtRecords.filter(i => i.approvalStatus === 'PENDING')
      : [];

    const directorPendingBeneficiaries = isDirector
      ? beneficiaries.filter(b => b.approvalStatus === 'PENDING')
      : [];

    // Accounts My Work: Approved Payments awaiting Portal Entry or UTR Settlement
    const accountsPendingEntry = isAccounts
      ? bankPayments.filter(p => p.approvalStatus === 'APPROVED' && p.paymentEntry === 'PENDING')
      : [];

    const accountsPendingSettlement = isAccounts
      ? bankPayments.filter(p => p.approvalStatus === 'APPROVED' && p.paymentEntry === 'DONE' && p.paymentStatus === 'PENDING')
      : [];

    const accountsPendingBenEntry = isAccounts
      ? beneficiaries.filter(b => b.approvalStatus === 'APPROVED' && (b.beneficiaryEntry === 'PENDING' || b.additionStatus === 'PENDING'))
      : [];

    return {
      directorPendingPayments,
      directorPendingIbt,
      directorPendingBeneficiaries,
      accountsPendingEntry,
      accountsPendingSettlement,
      accountsPendingBenEntry,
    };
  }

  // ==========================================
  // VENDOR PROFILES & BANKING MASTER GOVERNANCE
  // ==========================================
  public getVendorProfiles(): VendorProfileRecord[] {
    try {
      const raw = localStorage.getItem(STORAGE_KEYS.VENDOR_PROFILES);
      if (!raw) {
        this.saveVendorProfiles(INITIAL_VENDOR_PROFILES);
        return INITIAL_VENDOR_PROFILES;
      }
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
      this.saveVendorProfiles(INITIAL_VENDOR_PROFILES);
      return INITIAL_VENDOR_PROFILES;
    } catch (e) {
      console.error('Failed to load vendor profiles, resetting to initial seed', e);
      return INITIAL_VENDOR_PROFILES;
    }
  }

  public saveVendorProfiles(profiles: VendorProfileRecord[]): void {
    try {
      localStorage.setItem(STORAGE_KEYS.VENDOR_PROFILES, JSON.stringify(profiles));
    } catch (e) {
      console.error('Failed to save vendor profiles to localStorage', e);
    }
  }

  public getVendorProfileById(id: string): VendorProfileRecord | null {
    const list = this.getVendorProfiles();
    return list.find(v => v.id === id || v.vendorCode === id) || null;
  }

  public addVendorProfile(
    record: Omit<VendorProfileRecord, 'id' | 'createdAt'>,
    user: UserProfile
  ): VendorProfileRecord {
    if (!isUserAuthorizedForVendorBanking(user)) {
      throw new Error('Unauthorized: Only Accounts, Director, Admin, or Super Admin can register new vendors.');
    }

    const current = this.getVendorProfiles();
    const newId = `ven-prof-${Date.now()}`;
    const vendorCode = record.vendorCode || `VEN-${new Date().getFullYear()}-${String(current.length + 1).padStart(3, '0')}`;
    const today = new Date().toLocaleDateString('en-GB');

    const newProfile: VendorProfileRecord = {
      ...record,
      id: newId,
      vendorCode,
      createdAt: today,
      createdBy: user.name,
      status: record.status || 'ACTIVE',
      bankAccounts: record.bankAccounts || []
    };

    const updated = [newProfile, ...current];
    this.saveVendorProfiles(updated);

    // Keep master registry vendors in sync
    this.addMasterVendor(newProfile.tradeName);

    // If an initial bank account was attached, sync to Beneficiary Master if applicable
    if (newProfile.bankAccounts.length > 0) {
      const primary = newProfile.bankAccounts[0];
      const existingBen = this.getBeneficiaryRecords().find(
        b => b.tradeVendorName?.toLowerCase() === newProfile.tradeName.toLowerCase() ||
             b.accountNo === primary.accountNo
      );
      if (!existingBen) {
        this.addBeneficiaryRecord({
          beneficiaryName: primary.beneficiaryName,
          tradeVendorName: newProfile.tradeName,
          accountNo: primary.accountNo,
          ifscCode: primary.ifscCode,
          bankName: primary.bankName,
          purpose: newProfile.category || 'Vendor Procurement',
          cancelledChequeUrl: primary.cancelledChequeUrl || 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=600',
          remark: primary.notes || 'Created during Vendor Registration'
        }, user);
      }
    }

    this.logAudit({
      userId: user.userId,
      userName: user.name,
      module: 'REGISTRY',
      action: 'CREATE',
      entityId: newProfile.tradeName,
      details: `Registered vendor ${newProfile.tradeName} (${vendorCode}) with ${newProfile.bankAccounts.length} bank account(s)`
    });

    return newProfile;
  }

  public updateVendorProfile(
    id: string,
    updates: Partial<VendorProfileRecord>,
    user: UserProfile
  ): VendorProfileRecord | null {
    if (!isUserAuthorizedForVendorBanking(user)) {
      throw new Error('Unauthorized: Only Accounts, Director, Admin, or Super Admin can modify vendor details.');
    }

    const current = this.getVendorProfiles();
    let updatedProfile: VendorProfileRecord | null = null;

    const updated = current.map(v => {
      if (v.id === id) {
        updatedProfile = {
          ...v,
          ...updates,
          updatedAt: new Date().toLocaleDateString('en-GB') + ' ' + new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
          updatedBy: user.name
        };
        return updatedProfile;
      }
      return v;
    });

    if (updatedProfile) {
      this.saveVendorProfiles(updated);
      if (updates.tradeName) {
        this.addMasterVendor(updates.tradeName);
      }
      this.logAudit({
        userId: user.userId,
        userName: user.name,
        module: 'REGISTRY',
        action: 'UPDATE',
        entityId: (updatedProfile as VendorProfileRecord).tradeName,
        details: `Updated details for vendor ${(updatedProfile as VendorProfileRecord).tradeName}`
      });
    }

    return updatedProfile;
  }

  public addVendorBankAccount(
    vendorId: string,
    bankAccount: Omit<VendorBankAccount, 'id'>,
    user: UserProfile
  ): VendorBankAccount | null {
    if (!isUserAuthorizedForVendorBanking(user)) {
      throw new Error('Unauthorized: Only Accounts, Director, Admin, or Super Admin can register vendor bank accounts.');
    }

    const current = this.getVendorProfiles();
    const vendor = current.find(v => v.id === vendorId);
    if (!vendor) return null;

    const accId = `acc-${Date.now()}`;
    const cleanAccountNo = (bankAccount.accountNo || '').trim();
    const masked = bankAccount.accountNoMasked || `••••••••${cleanAccountNo.slice(-4)}`;

    const newAccount: VendorBankAccount = {
      ...bankAccount,
      id: accId,
      accountNo: cleanAccountNo,
      accountNoMasked: masked,
      ifscCode: (bankAccount.ifscCode || '').trim().toUpperCase(),
      tradeVendorName: vendor.tradeName,
      verifiedBy: bankAccount.verificationStatus === 'VERIFIED' ? user.name : undefined,
      verifiedAt: bankAccount.verificationStatus === 'VERIFIED' ? new Date().toLocaleDateString('en-GB') : undefined,
    };

    let updatedAccounts = [...vendor.bankAccounts];
    if (newAccount.isPrimary) {
      updatedAccounts = updatedAccounts.map(a => ({ ...a, isPrimary: false }));
    } else if (updatedAccounts.length === 0) {
      newAccount.isPrimary = true;
    }
    updatedAccounts.push(newAccount);

    this.updateVendorProfile(vendorId, { bankAccounts: updatedAccounts }, user);

    // Sync to Beneficiary Master if cancelled cheque is present or verified
    if (newAccount.cancelledChequeUrl) {
      this.addBeneficiaryRecord({
        beneficiaryName: newAccount.beneficiaryName,
        tradeVendorName: vendor.tradeName,
        accountNo: newAccount.accountNo,
        ifscCode: newAccount.ifscCode,
        bankName: newAccount.bankName,
        purpose: vendor.category || 'Vendor Disbursement',
        cancelledChequeUrl: newAccount.cancelledChequeUrl,
        remark: `Linked to vendor ${vendor.tradeName} (${vendor.vendorCode})`
      }, user);
    }

    this.logAudit({
      userId: user.userId,
      userName: user.name,
      module: 'REGISTRY',
      action: 'CREATE',
      entityId: vendor.tradeName,
      details: `Added bank account ${newAccount.bankName} (${newAccount.accountNoMasked}) for ${vendor.tradeName}`
    });

    return newAccount;
  }

  public updateVendorBankAccount(
    vendorId: string,
    accountId: string,
    updates: Partial<VendorBankAccount>,
    user: UserProfile
  ): VendorBankAccount | null {
    if (!isUserAuthorizedForVendorBanking(user)) {
      throw new Error('Unauthorized: Only Accounts, Director, Admin, or Super Admin can edit vendor bank accounts.');
    }

    const current = this.getVendorProfiles();
    const vendor = current.find(v => v.id === vendorId);
    if (!vendor) return null;

    let targetAccount: VendorBankAccount | null = null;
    let updatedAccounts = vendor.bankAccounts.map(acc => {
      if (acc.id === accountId) {
        targetAccount = {
          ...acc,
          ...updates,
          ifscCode: updates.ifscCode ? updates.ifscCode.trim().toUpperCase() : acc.ifscCode,
          accountNoMasked: updates.accountNo ? `••••••••${updates.accountNo.slice(-4)}` : acc.accountNoMasked
        };
        return targetAccount;
      }
      return acc;
    });

    if (targetAccount && (targetAccount as VendorBankAccount).isPrimary) {
      updatedAccounts = updatedAccounts.map(a => a.id === accountId ? a : { ...a, isPrimary: false });
    }

    this.updateVendorProfile(vendorId, { bankAccounts: updatedAccounts }, user);
    return targetAccount;
  }

  public searchVendorsWithBanking(query: string): VendorSearchWithBankingResult[] {
    if (!query || query.trim().length === 0) return [];
    const q = query.trim().toLowerCase();
    const vendors = this.getVendorProfiles();
    const results: VendorSearchWithBankingResult[] = [];

    vendors.forEach(v => {
      const matchTrade = (v.tradeName || '').toLowerCase().includes(q);
      const matchLegal = (v.legalName || '').toLowerCase().includes(q);
      const matchGstin = (v.gstin || '').toLowerCase().includes(q);
      const matchPan = (v.pan || '').toLowerCase().includes(q);
      const matchCategory = (v.category || '').toLowerCase().includes(q);

      // Also check bank accounts
      const matchBank = v.bankAccounts.some(b => 
        (b.beneficiaryName || '').toLowerCase().includes(q) ||
        (b.bankName || '').toLowerCase().includes(q) ||
        (b.accountNo || '').includes(q)
      );

      if (matchTrade || matchLegal || matchGstin || matchPan || matchCategory || matchBank) {
        let score = 0;
        if (v.tradeName.toLowerCase() === q) score += 100;
        else if (v.tradeName.toLowerCase().startsWith(q)) score += 50;
        else if (matchTrade) score += 25;
        if (matchGstin || matchPan) score += 20;

        const primaryAccount = v.bankAccounts.find(a => a.isPrimary) || v.bankAccounts[0];
        const hasBankAccounts = v.bankAccounts.length > 0;
        const hasVerifiedBeneficiary = Boolean(primaryAccount && primaryAccount.verificationStatus === 'VERIFIED');
        const hasCancelledCheque = Boolean(primaryAccount && primaryAccount.cancelledChequeUrl && primaryAccount.cancelledChequeUrl.trim().length > 0);
        const isNameMismatch = Boolean(
          primaryAccount &&
          primaryAccount.beneficiaryName &&
          v.tradeName &&
          primaryAccount.beneficiaryName.trim().toLowerCase() !== v.tradeName.trim().toLowerCase()
        );

        results.push({
          vendor: v,
          hasBankAccounts,
          primaryAccount,
          hasVerifiedBeneficiary,
          hasCancelledCheque,
          isNameMismatch,
          matchScore: score
        });
      }
    });

    results.sort((a, b) => b.matchScore - a.matchScore);
    return results.slice(0, 8);
  }
}

export const storageAdapter = new StorageAdapter();

