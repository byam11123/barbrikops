import { z } from 'zod';
import { 
  ChecklistItem, 
  DelegationTask, 
  FmsInstance, 
  InventoryItem, 
  InventoryMovement, 
  AuditLogEntry, 
  CentralRegistryConfig 
} from '../types';
import { 
  INITIAL_CHECKLIST_ITEMS, 
  INITIAL_DELEGATION_TASKS, 
  INITIAL_FMS_FLOWS, 
  INITIAL_INVENTORY_ITEMS, 
  INITIAL_INVENTORY_MOVEMENTS, 
  DEFAULT_REGISTRY_CONFIG 
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
};

class StorageAdapter {
  private auditLogs: AuditLogEntry[] = [];

  constructor() {
    this.initStorage();
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
      const stkStg2 = updatedStages.find((s) => s.stageId === 'STG-STK-02');
      const stkStg4 = updatedStages.find((s) => s.stageId === 'STG-STK-04');

      // If material purchase NOT required (No) -> Skip Stage 3 and Stage 4
      if (stkStg2?.decisionValue === 'No') {
        ['STG-STK-03', 'STG-STK-04'].forEach((sId) => {
          const stg = updatedStages.find((s) => s.stageId === sId);
          if (stg && stg.status !== 'Skipped') {
            stg.status = 'Skipped';
            stg.notes = 'Skipped: Stock available in store, no purchase needed';
            stg.actualDateTime = undefined;
            changed = true;
          }
        });
      }

      // If partial purchase NOT required (No, 100% purchase needed) -> Skip Stage 5
      if (stkStg4?.decisionValue === 'No') {
        const stg5 = updatedStages.find((s) => s.stageId === 'STG-STK-05');
        if (stg5 && stg5.status !== 'Skipped') {
          stg5.status = 'Skipped';
          stg5.notes = 'Skipped: Full purchase required from vendor';
          stg5.actualDateTime = undefined;
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
