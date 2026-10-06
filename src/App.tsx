/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, ViewScope } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { UnifiedWorkSummary } from './components/summary/UnifiedWorkSummary';
import { MisDashboard } from './components/mis/MisDashboard';
import { FmsPipeline } from './components/fms/FmsPipeline';
import { CreateFmsModal } from './components/fms/CreateFmsModal';
import { FmsDetailModal } from './components/fms/FmsDetailModal';
import { DelegationBoard } from './components/delegation/DelegationBoard';
import { NewTaskModal } from './components/delegation/NewTaskModal';
import { ReviseTaskModal } from './components/delegation/ReviseTaskModal';
import { ChecklistManager } from './components/checklist/ChecklistManager';
import { NewChecklistModal } from './components/checklist/NewChecklistModal';
import { InventoryManager } from './components/ims/InventoryManager';
import { StockMovementModal } from './components/ims/StockMovementModal';
import { CentralRegistryView } from './components/registry/CentralRegistryView';
import { AuditLogView } from './components/audit/AuditLogView';

import { 
  ChecklistItem, 
  DelegationTask, 
  FmsInstance, 
  InventoryItem, 
  InventoryMovement, 
  UserProfile, 
  CentralRegistryConfig, 
  AuditLogEntry,
  ProcessRemark 
} from './types';
import { 
  USERS, 
  FMS_CHECK_STOCK_STAGES, 
  FMS_STANDARD_PURCHASE_STAGES, 
  FMS_PO_PAYMENT_STAGES,
  FMS_PURCHASE_TO_STORE_DISPATCH_STAGES,
  FMS_PAYMENT_TO_DISPATCH_STAGES 
} from './data/initialData';
import { isFlowAwaitingUserAction } from './services/stageAssignment';
import { storageAdapter } from './services/storageAdapter';

export default function App() {
  // Land by default on the unified daily work summary
  const [activeTab, setActiveTab] = useState<NavTab>('summary');
  const [currentUser, setCurrentUser] = useState<UserProfile>(USERS[0]);
  // Default to USER_ONLY so staff members see only what belongs to them first
  const [viewScope, setViewScope] = useState<ViewScope>('USER_ONLY');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  // Data states
  const [flows, setFlows] = useState<FmsInstance[]>([]);
  const [delegationTasks, setDelegationTasks] = useState<DelegationTask[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [registryConfig, setRegistryConfig] = useState<CentralRegistryConfig>(storageAdapter.getRegistryConfig());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Modals
  const [isCreateFmsOpen, setIsCreateFmsOpen] = useState(false);
  const [selectedFmsDetail, setSelectedFmsDetail] = useState<FmsInstance | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedTaskForRevision, setSelectedTaskForRevision] = useState<DelegationTask | null>(null);
  const [isNewChecklistOpen, setIsNewChecklistOpen] = useState(false);
  const [isStockMovementOpen, setIsStockMovementOpen] = useState(false);
  const [preselectedInventoryItem, setPreselectedInventoryItem] = useState<InventoryItem | null>(null);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleAddProcessRemark = (
    module: 'FMS' | 'CHECKLIST' | 'DELEGATION',
    targetId: string,
    category: ProcessRemark['category'],
    remarkText: string,
    stageIndex?: number
  ) => {
    const newRemark: ProcessRemark = {
      id: `rem-${Date.now()}`,
      authorName: currentUser.name,
      authorRole: currentUser.role,
      category,
      remarkText,
      timestamp: new Date().toLocaleString('en-GB')
    };

    if (module === 'CHECKLIST') {
      const updated = checklistItems.map((chk) => {
        if (chk.id === targetId || chk.taskId === targetId) {
          const existing = chk.processRemarks || [];
          return { ...chk, processRemarks: [newRemark, ...existing] };
        }
        return chk;
      });
      setChecklistItems(updated);
      storageAdapter.saveChecklistItems(updated);
    } else if (module === 'DELEGATION') {
      const updated = delegationTasks.map((del) => {
        if (del.id === targetId || del.taskId === targetId) {
          const existing = del.processRemarks || [];
          return { ...del, processRemarks: [newRemark, ...existing] };
        }
        return del;
      });
      setDelegationTasks(updated);
      storageAdapter.saveDelegationTasks(updated);
    } else if (module === 'FMS') {
      const updated = flows.map((f) => {
        if (f.id === targetId || f.flowId === targetId) {
          const stagesCopy = [...f.stages];
          const stgIdx = stageIndex !== undefined ? stageIndex : f.currentStageIndex;
          if (stagesCopy[stgIdx]) {
            const existing = stagesCopy[stgIdx].processRemarks || [];
            stagesCopy[stgIdx] = {
              ...stagesCopy[stgIdx],
              processRemarks: [newRemark, ...existing]
            };
          }
          return { ...f, stages: stagesCopy };
        }
        return f;
      });
      setFlows(updated);
      storageAdapter.saveFmsFlows(updated);
    }

    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module,
      action: 'UPDATE',
      entityId: targetId,
      details: `Logged Process Coordination Remark [${category}]: "${remarkText}"`
    });
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`Process Coordination Remark logged by ${currentUser.name}!`);
  };

  const handleNudgeItem = (
    module: 'FMS' | 'CHECKLIST' | 'DELEGATION',
    targetId: string,
    stageIndex?: number
  ) => {
    const nudgeTime = new Date().toLocaleString('en-GB');

    if (module === 'CHECKLIST') {
      const updated = checklistItems.map((chk) => {
        if (chk.id === targetId || chk.taskId === targetId) {
          return { ...chk, lastNudgeTimestamp: nudgeTime };
        }
        return chk;
      });
      setChecklistItems(updated);
      storageAdapter.saveChecklistItems(updated);
    } else if (module === 'DELEGATION') {
      const updated = delegationTasks.map((del) => {
        if (del.id === targetId || del.taskId === targetId) {
          return { ...del, lastNudgeTimestamp: nudgeTime };
        }
        return del;
      });
      setDelegationTasks(updated);
      storageAdapter.saveDelegationTasks(updated);
    } else if (module === 'FMS') {
      const updated = flows.map((f) => {
        if (f.id === targetId || f.flowId === targetId) {
          const stagesCopy = [...f.stages];
          const stgIdx = stageIndex !== undefined ? stageIndex : f.currentStageIndex;
          if (stagesCopy[stgIdx]) {
            stagesCopy[stgIdx] = {
              ...stagesCopy[stgIdx],
              lastNudgeTimestamp: nudgeTime
            };
          }
          return { ...f, stages: stagesCopy };
        }
        return f;
      });
      setFlows(updated);
      storageAdapter.saveFmsFlows(updated);
    }

    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module,
      action: 'UPDATE',
      entityId: targetId,
      details: `Issued Nudge / Follow-up alert for ${module} #${targetId}`
    });
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`Nudge alert issued by ${currentUser.name}! Assignee notified.`);
  };

  const loadAllData = () => {
    setFlows(storageAdapter.getFmsFlows());
    setDelegationTasks(storageAdapter.getDelegationTasks());
    setChecklistItems(storageAdapter.getChecklistItems());
    setInventoryItems(storageAdapter.getInventoryItems());
    setInventoryMovements(storageAdapter.getInventoryMovements());
    setRegistryConfig(storageAdapter.getRegistryConfig());
    setAuditLogs(storageAdapter.getAuditLogs());
  };

  useEffect(() => {
    loadAllData();
  }, []);

  const handleToggleScope = (newScope: ViewScope) => {
    setViewScope(newScope);
    showToast(
      newScope === 'USER_ONLY'
        ? `Scope set to items belonging to ${currentUser.name}`
        : 'Scope expanded to view all organization items'
    );
  };

  const handleUserChange = (newUser: UserProfile) => {
    setCurrentUser(newUser);
    const isPc = newUser.role.toLowerCase().includes('process coordinator') || newUser.name.toLowerCase().includes('ritu sahu');
    if (isPc) {
      setViewScope('ALL_ORG');
      showToast(`Switched active profile to ${newUser.name} (${newUser.role}). Scope automatically expanded to view ALL user data across all departments!`);
    } else {
      showToast(`Switched active profile to ${newUser.name} (${newUser.role})`);
    }
  };

  // FMS Handlers
  const handleCreateFlow = (newFlow: FmsInstance) => {
    const updated = [newFlow, ...flows];
    setFlows(updated);
    storageAdapter.saveFmsFlows(updated);
    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module: 'FMS',
      action: 'CREATE',
      entityId: newFlow.flowId,
      details: `Registered Indent #${newFlow.indentNo} for site ${newFlow.siteName} (Priority: ${newFlow.priority})`
    });
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`Indent #${newFlow.indentNo} successfully registered in 12-stage FMS pipeline!`);
  };

  const handleAdvanceCurrentStage = (flow: FmsInstance, decision?: 'Yes' | 'No') => {
    const updatedStages = [...flow.stages];
    const currentIndex = flow.currentStageIndex;
    const currentStage = updatedStages[currentIndex];

    if (!currentStage) return;

    const now = new Date().toLocaleString('en-GB');
    currentStage.status = 'Done';
    currentStage.actualDateTime = now;
    if (decision) {
      currentStage.decisionValue = decision;
    }

    let nextIndex = currentIndex + 1;

    // Checkpoint branching rules:
    if (flow.flowType === 'CHECK_STOCK') {
      // 1. Stage 2: IS MATERIAL PURCHASE REQUIRED?
      if (currentStage.stageId === 'STG-STK-02') {
        if (decision === 'No') {
          // Stock available in store! Skip Stage 3 & Stage 4
          if (updatedStages[2]) {
            updatedStages[2].status = 'Skipped';
            updatedStages[2].notes = 'Skipped: Stock available in store, no purchase needed';
          }
          if (updatedStages[3]) {
            updatedStages[3].status = 'Skipped';
            updatedStages[3].notes = 'Skipped: Stock available in store, no purchase needed';
          }
          nextIndex = 4; // Jump directly to Stage 5: DISPATCH MATERIAL AVAILABLE
        } else if (decision === 'Yes') {
          nextIndex = 2; // Proceed to Stage 3: SEND INDENT FOR MATERIAL TO BE PURCHASED
        }
      }

      // 2. Stage 4: IS PARTIAL PURCHASE REQUIRED?
      if (currentStage.stageId === 'STG-STK-04') {
        if (decision === 'Yes') {
          nextIndex = 4; // Proceed to Stage 5: DISPATCH MATERIAL AVAILABLE
        } else if (decision === 'No') {
          // Zero available in store; 100% full purchase needed from vendor
          if (updatedStages[4]) {
            updatedStages[4].status = 'Skipped';
            updatedStages[4].notes = 'Skipped: Full purchase required from vendor';
          }
          nextIndex = 5;
        }
      }
    } else if (flow.flowType === 'PO_TO_PAYMENT') {
      // Stage 1: IS PAYMENT TO BE DONE FROM ACCOUNT?
      if (currentStage.stageId === 'STG-PAY-01') {
        if (decision === 'Yes') {
          // Bank Account Route: Skip UPI stages (10 to 13)
          [10, 11, 12, 13].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: Paid via Bank Account route';
            }
          });
          nextIndex = 1;
        } else if (decision === 'No') {
          // UPI Route: Skip Bank stages (1 to 9)
          for (let i = 1; i <= 9; i++) {
            if (updatedStages[i]) {
              updatedStages[i].status = 'Skipped';
              updatedStages[i].notes = 'Skipped: Routed via UPI QR code payment';
            }
          }
          nextIndex = 10;
        }
      }

      // Stage 2: IS ACCOUNT ALREADY ADDED?
      if (currentStage.stageId === 'STG-PAY-02') {
        if (decision === 'Yes') {
          for (let i = 2; i <= 5; i++) {
            if (updatedStages[i]) {
              updatedStages[i].status = 'Skipped';
              updatedStages[i].notes = 'Skipped: Account already verified in internet banking';
            }
          }
          nextIndex = 6;
        } else if (decision === 'No') {
          nextIndex = 2;
        }
      }

      // Stage 10: GET ONLINE PAYMENT APPROVAL / PAYMENT DONE
      if (currentStage.stageId === 'STG-PAY-10') {
        nextIndex = 14;
      }

      // Stage 14: MAKE PAYMENT (UPI)
      if (currentStage.stageId === 'STG-PAY-14') {
        nextIndex = 14;
      }
    } else if (flow.flowType === 'PURCHASE_TO_STORE_DISPATCH') {
      // Stage 5: IS E-WAY BILL REQUIRED?
      if (currentStage.stageId === 'STG-PSD-05') {
        if (decision === 'No') {
          // E-Way Bill Not Required: Skip Stage 6 (SEND CHALLAN FOR E-WAY) and Stage 7 (GET E-WAY BILL)
          [5, 6].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: E-Way Bill not required for this consignment';
            }
          });
          nextIndex = 7; // Jump directly to Stage 8 (index 7): LOAD MATERIAL FOR DISPATCH
        } else if (decision === 'Yes') {
          nextIndex = 5; // Proceed to Stage 6: SEND DELIVERY CHALLAN/STOCK TRANSFER NOTE FOR E-WAY BILL
        }
      }
    } else if (flow.flowType === 'PAYMENT_TO_DISPATCH') {
      // Stage 3: IS MATERIAL ACCEPTABLE ?
      if (currentStage.stageId === 'STG-DISP-03') {
        if (decision === 'Yes') {
          // Acceptable: Skip Stages 4, 5, 6
          [3, 4, 5].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: Material accepted as per PO specifications';
            }
          });
          nextIndex = 6; // Jump directly to Stage 7: DISPATCH MATERIAL
        } else if (decision === 'No') {
          nextIndex = 3; // Proceed to Stage 4: RETURN / REPLACE MATERIAL
        }
      }

      // Stage 5: IS MATERIAL REPLACED ?
      if (currentStage.stageId === 'STG-DISP-05') {
        if (decision === 'Yes') {
          if (updatedStages[5]) {
            updatedStages[5].status = 'Skipped';
            updatedStages[5].notes = 'Skipped: Material successfully replaced by vendor';
          }
          nextIndex = 6; // Jump directly to Stage 7: DISPATCH MATERIAL
        } else if (decision === 'No') {
          nextIndex = 5; // Proceed to Stage 6: GET REFUND / CREDIT NOTES
        }
      }
    } else {
      // INDENT_PURCHASE Rules:
      if (currentStage.stageId === 'STG-02' && decision === 'No') {
        if (updatedStages[2]) {
          updatedStages[2].status = 'Skipped';
          updatedStages[2].notes = 'Skipped: No degraded materials returned';
          nextIndex = 3;
        }
      }

      if (currentStage.stageId === 'STG-06' && decision === 'No') {
        if (updatedStages[6]) {
          updatedStages[6].status = 'Skipped';
          updatedStages[6].notes = 'Skipped: Single OEM quotation sufficient';
          nextIndex = 7;
        }
      }

      if (currentStage.stageId === 'STG-10' && decision === 'No') {
        if (updatedStages[10]) {
          updatedStages[10].status = 'Skipped';
          updatedStages[10].notes = 'Skipped: No advance payment required';
          nextIndex = 11; // Skips Stage 11 (SEND FOR PAYMENT) and jumps directly to Stage 12 (MATERIAL COLLECTION PO)
        }
      }
    }

    const isComplete = nextIndex >= updatedStages.length;
    const nextStageId = isComplete ? 'COMPLETED' : updatedStages[nextIndex]?.stageId || 'COMPLETED';

    const stageDefs = flow.flowType === 'CHECK_STOCK'
      ? FMS_CHECK_STOCK_STAGES
      : flow.flowType === 'PO_TO_PAYMENT' 
      ? FMS_PO_PAYMENT_STAGES 
      : flow.flowType === 'PAYMENT_TO_DISPATCH'
      ? FMS_PAYMENT_TO_DISPATCH_STAGES
      : FMS_STANDARD_PURCHASE_STAGES;

    if (!isComplete && updatedStages[nextIndex]) {
      updatedStages[nextIndex].status = 'In Progress';
      if (!updatedStages[nextIndex].plannedDateTime) {
        const def = stageDefs.find((s) => s.stageId === updatedStages[nextIndex].stageId);
        const sla = def?.slaHours || 2;
        const targetDate = new Date();
        targetDate.setHours(targetDate.getHours() + sla);
        updatedStages[nextIndex].plannedDateTime = targetDate.toLocaleString('en-GB');
      }
    }

    const updatedFlow: FmsInstance = {
      ...flow,
      currentStageIndex: isComplete ? updatedStages.length : nextIndex,
      currentStageId: nextStageId,
      status: isComplete ? 'Completed' : 'In Progress',
      updatedAt: now,
      stages: updatedStages,
    };

    let updatedFlowsList = flows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f));

    // 1. When Check Stock Stage 3 completes (indent submitted to Purchase Dept):
    // Automatically spawn / ensure Indent to PO Flow exists in Purchase Department!
    if (flow.flowType === 'CHECK_STOCK' && currentStage.stageId === 'STG-STK-03') {
      const existingIndentFlow = flows.find(
        (f) => f.linkedFlowId === flow.flowId || (f.indentNo === flow.indentNo && f.flowType === 'INDENT_PURCHASE')
      );
      if (!existingIndentFlow) {
        const newIndentFlow: FmsInstance = {
          id: `fms-inst-ind-${flow.indentNo}`,
          flowId: `FLOW-IND-${flow.indentNo}`,
          flowType: 'INDENT_PURCHASE',
          linkedFlowId: flow.flowId,
          requisitionNumber: flow.requisitionNumber || `Indent #${flow.indentNo}`,
          indentNo: flow.indentNo,
          indentDate: flow.indentDate || now,
          siteName: flow.siteName,
          priority: flow.priority,
          currentStageId: 'STG-01',
          currentStageIndex: 0,
          totalStages: 12,
          status: 'In Progress',
          createdAt: now,
          updatedAt: now,
          totalDelayHours: 0,
          remarks: `Material indent forwarded from Store Stock Check #${flow.indentNo}`,
          stages: FMS_STANDARD_PURCHASE_STAGES.map((s, sIdx) => ({
            stageId: s.stageId,
            stageName: s.name,
            assignee: s.whoDefaultAssignee,
            how: s.howChannel,
            status: sIdx === 0 ? 'In Progress' : 'Pending',
            plannedDateTime: sIdx === 0 ? now : undefined,
            formResponseRef: s.formUrl,
          })),
        };
        updatedFlowsList = [newIndentFlow, ...updatedFlowsList];
        showToast(`Stock Check requisition sent! Purchase Dept Indent-to-PO Flow created for Indent #${flow.indentNo}.`);
      }
    }

    // 2. When Indent Purchase Stage 10 approves advance payment (decision = 'Yes'):
    // Automatically link / ensure Accounts PO-to-Payment FMS exists!
    if (flow.flowType === 'INDENT_PURCHASE' && currentStage.stageId === 'STG-10' && decision === 'Yes') {
      const existingPayFlow = flows.find((f) => f.linkedFlowId === flow.flowId || (f.indentNo === flow.indentNo && f.flowType === 'PO_TO_PAYMENT'));
      if (!existingPayFlow) {
        const newPayFlow: FmsInstance = {
          id: `fms-inst-pay-${flow.indentNo}`,
          flowId: `FLOW-PAY-${flow.indentNo}-001`,
          flowType: 'PO_TO_PAYMENT',
          linkedFlowId: flow.flowId,
          poNumber: `RAO/PO/${flow.indentNo}-001`,
          vendorName: 'M/S AUTHORIZED OEM VENDOR',
          poAssignTo: 'MANISH KOSHLE',
          indentNo: flow.indentNo,
          indentDate: flow.indentDate || now,
          poDate: now,
          poAmount: 50000,
          siteName: flow.siteName,
          priority: flow.priority,
          currentStageId: 'STG-PAY-01',
          currentStageIndex: 0,
          totalStages: 15,
          status: 'In Progress',
          createdAt: now,
          updatedAt: now,
          totalDelayHours: 0,
          remarks: `Advance payment dossier transferred from Indent #${flow.indentNo} for Accounts disbursement`,
          paymentMode: 'PENDING',
          stages: FMS_PO_PAYMENT_STAGES.map((s, sIdx) => ({
            stageId: s.stageId,
            stageName: s.name,
            assignee: s.whoDefaultAssignee,
            how: s.howChannel,
            status: sIdx === 0 ? 'In Progress' : 'Pending',
            plannedDateTime: sIdx === 0 ? now : undefined,
            formResponseRef: s.formUrl,
          }))
        };
        updatedFlowsList = [newPayFlow, ...updatedFlowsList];
        showToast(`Advance payment approved! Accounts PO-to-Payment flow initialized for Indent #${flow.indentNo}.`);
      }
    }

    // 3. When Accounts PO to Payment completes Stage 15 (SEND PAYMENT DETAILS TO GET MATERIAL):
    // Automatically spawn / ensure Purchase to Store to Dispatch FMS exists!
    if (flow.flowType === 'PO_TO_PAYMENT' && currentStage.stageId === 'STG-PAY-15') {
      const existingPsdFlow = flows.find(
        (f) => f.linkedFlowId === flow.flowId || (f.indentNo === flow.indentNo && f.flowType === 'PURCHASE_TO_STORE_DISPATCH')
      );
      if (!existingPsdFlow) {
        const newPsdFlow: FmsInstance = {
          id: `fms-inst-psd-${flow.indentNo}-${Date.now()}`,
          flowId: `FLOW-PSD-${flow.indentNo}-001`,
          flowType: 'PURCHASE_TO_STORE_DISPATCH',
          linkedFlowId: flow.flowId,
          requisitionNumber: flow.indentNo,
          indentNo: flow.indentNo,
          indentDate: flow.indentDate || now,
          siteName: flow.siteName,
          priority: flow.priority,
          currentStageId: 'STG-PSD-01',
          currentStageIndex: 0,
          totalStages: 10,
          status: 'In Progress',
          createdAt: now,
          updatedAt: now,
          totalDelayHours: 0,
          remarks: `Material received at warehouse. Purchase to Store to Dispatch workflow initiated for Indent #${flow.indentNo}`,
          stages: FMS_PURCHASE_TO_STORE_DISPATCH_STAGES.map((s, sIdx) => ({
            stageId: s.stageId,
            stageName: s.name,
            assignee: s.whoDefaultAssignee,
            how: s.howChannel,
            status: sIdx === 0 ? 'In Progress' : 'Pending',
            plannedDateTime: sIdx === 0 ? now : undefined,
            formResponseRef: s.formUrl,
          })),
        };
        updatedFlowsList = [newPsdFlow, ...updatedFlowsList];
        showToast(`Payment completed! Purchase to Store to Dispatch Flow created for Indent #${flow.indentNo}.`);
      }
    }

    setFlows(updatedFlowsList);
    storageAdapter.saveFmsFlows(updatedFlowsList);
    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module: 'FMS',
      action: 'STAGE_ADVANCE',
      entityId: updatedFlow.flowId,
      details: `Advanced stage ${currentStage.stageName}. Decision: ${currentStage.decisionValue || 'Done'}`
    });
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`FMS #${updatedFlow.poNumber || updatedFlow.indentNo} advanced to stage: ${updatedFlow.stages[updatedFlow.currentStageIndex]?.stageName || 'Completed'}`);
  };

  const handleCompleteFmsStage = (flow: FmsInstance, stageIndex: number, decision?: 'Yes' | 'No') => {
    const updatedStages = [...flow.stages];
    const targetStage = updatedStages[stageIndex];
    if (!targetStage) return;

    const isCurrentlyDone = targetStage.status === 'Done';
    const now = new Date().toLocaleString('en-GB');

    targetStage.status = isCurrentlyDone ? 'Pending' : 'Done';
    targetStage.actualDateTime = isCurrentlyDone ? undefined : now;
    if (decision) {
      targetStage.decisionValue = decision;
    }

    let nextIndex = stageIndex + 1;

    // Checkpoint branching rules:
    if (flow.flowType === 'CHECK_STOCK') {
      if (targetStage.stageId === 'STG-STK-02') {
        if (decision === 'No') {
          if (updatedStages[2]) {
            updatedStages[2].status = 'Skipped';
            updatedStages[2].notes = 'Skipped: Stock available in store, no purchase needed';
          }
          if (updatedStages[3]) {
            updatedStages[3].status = 'Skipped';
            updatedStages[3].notes = 'Skipped: Stock available in store, no purchase needed';
          }
          nextIndex = 4;
        } else if (decision === 'Yes') {
          nextIndex = 2;
        }
      }

      if (targetStage.stageId === 'STG-STK-04') {
        if (decision === 'Yes') {
          nextIndex = 4;
        } else if (decision === 'No') {
          if (updatedStages[4]) {
            updatedStages[4].status = 'Skipped';
            updatedStages[4].notes = 'Skipped: Full purchase required from vendor';
          }
          nextIndex = 5;
        }
      }
    } else if (flow.flowType === 'PO_TO_PAYMENT') {
      if (targetStage.stageId === 'STG-PAY-01') {
        if (decision === 'Yes') {
          [10, 11, 12, 13].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: Paid via Bank Account route';
            }
          });
          nextIndex = 1;
        } else if (decision === 'No') {
          for (let i = 1; i <= 9; i++) {
            if (updatedStages[i]) {
              updatedStages[i].status = 'Skipped';
              updatedStages[i].notes = 'Skipped: Routed via UPI QR code payment';
            }
          }
          nextIndex = 10;
        }
      }

      if (targetStage.stageId === 'STG-PAY-02') {
        if (decision === 'Yes') {
          for (let i = 2; i <= 5; i++) {
            if (updatedStages[i]) {
              updatedStages[i].status = 'Skipped';
              updatedStages[i].notes = 'Skipped: Account already verified in internet banking';
            }
          }
          nextIndex = 6;
        } else if (decision === 'No') {
          nextIndex = 2;
        }
      }

      if (targetStage.stageId === 'STG-PAY-10') {
        nextIndex = 14;
      }

      if (targetStage.stageId === 'STG-PAY-14') {
        nextIndex = 14;
      }
    } else if (flow.flowType === 'PURCHASE_TO_STORE_DISPATCH') {
      if (targetStage.stageId === 'STG-PSD-05') {
        if (decision === 'No') {
          [5, 6].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: E-Way Bill not required for this consignment';
            }
          });
          nextIndex = 7;
        } else if (decision === 'Yes') {
          nextIndex = 5;
        }
      }
    } else if (flow.flowType === 'PAYMENT_TO_DISPATCH') {
      if (targetStage.stageId === 'STG-DISP-03') {
        if (decision === 'Yes') {
          [3, 4, 5].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: Material accepted as per PO specifications';
            }
          });
          nextIndex = 6;
        } else if (decision === 'No') {
          nextIndex = 3;
        }
      }

      if (targetStage.stageId === 'STG-DISP-05') {
        if (decision === 'Yes') {
          if (updatedStages[5]) {
            updatedStages[5].status = 'Skipped';
            updatedStages[5].notes = 'Skipped: Material successfully replaced by vendor';
          }
          nextIndex = 6;
        } else if (decision === 'No') {
          nextIndex = 5;
        }
      }
    } else {
      // Checkpoint branching rules from Sheet 1:
      if (targetStage.stageId === 'STG-02' && decision === 'No') {
        if (updatedStages[2]) {
          updatedStages[2].status = 'Skipped';
          updatedStages[2].notes = 'Skipped: No degraded materials returned';
          nextIndex = 3;
        }
      }

      if (targetStage.stageId === 'STG-06' && decision === 'No') {
        if (updatedStages[6]) {
          updatedStages[6].status = 'Skipped';
          updatedStages[6].notes = 'Skipped: Single OEM quotation sufficient';
          nextIndex = 7;
        }
      }

      if (targetStage.stageId === 'STG-10' && decision === 'No') {
        if (updatedStages[10]) {
          updatedStages[10].status = 'Skipped';
          updatedStages[10].notes = 'Skipped: No advance payment required';
          nextIndex = 11; // Skips Stage 11 (SEND FOR PAYMENT) and jumps directly to Stage 12 (MATERIAL COLLECTION PO)
        }
      }
    }

    if (stageIndex < flow.currentStageIndex && !isCurrentlyDone) {
      nextIndex = Math.max(flow.currentStageIndex, nextIndex);
    }

    const isComplete = nextIndex >= updatedStages.length;
    const stageDefs = flow.flowType === 'CHECK_STOCK'
      ? FMS_CHECK_STOCK_STAGES
      : flow.flowType === 'PO_TO_PAYMENT' 
      ? FMS_PO_PAYMENT_STAGES 
      : flow.flowType === 'PURCHASE_TO_STORE_DISPATCH'
      ? FMS_PURCHASE_TO_STORE_DISPATCH_STAGES
      : flow.flowType === 'PAYMENT_TO_DISPATCH'
      ? FMS_PAYMENT_TO_DISPATCH_STAGES
      : FMS_STANDARD_PURCHASE_STAGES;

    if (!isComplete && updatedStages[nextIndex] && updatedStages[nextIndex].status !== 'Done') {
      updatedStages[nextIndex].status = 'In Progress';
      if (!updatedStages[nextIndex].plannedDateTime) {
        const def = stageDefs.find((s) => s.stageId === updatedStages[nextIndex].stageId);
        const sla = def?.slaHours || 2;
        const targetDate = new Date();
        targetDate.setHours(targetDate.getHours() + sla);
        updatedStages[nextIndex].plannedDateTime = targetDate.toLocaleString('en-GB');
      }
    }

    const updatedFlow: FmsInstance = {
      ...flow,
      currentStageIndex: isComplete ? updatedStages.length : nextIndex,
      currentStageId: isComplete ? 'COMPLETED' : (updatedStages[nextIndex]?.stageId || 'COMPLETED'),
      status: isComplete ? 'Completed' : 'In Progress',
      updatedAt: now,
      stages: updatedStages,
    };

    let updated = flows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f));

    // When Check Stock Stage 3 completes in modal/table:
    if (flow.flowType === 'CHECK_STOCK' && targetStage.stageId === 'STG-STK-03' && !isCurrentlyDone) {
      const existingIndentFlow = flows.find(
        (f) => f.linkedFlowId === flow.flowId || (f.indentNo === flow.indentNo && f.flowType === 'INDENT_PURCHASE')
      );
      if (!existingIndentFlow) {
        const newIndentFlow: FmsInstance = {
          id: `fms-inst-ind-${flow.indentNo}`,
          flowId: `FLOW-IND-${flow.indentNo}`,
          flowType: 'INDENT_PURCHASE',
          linkedFlowId: flow.flowId,
          requisitionNumber: flow.requisitionNumber || `Indent #${flow.indentNo}`,
          indentNo: flow.indentNo,
          indentDate: flow.indentDate || now,
          siteName: flow.siteName,
          priority: flow.priority,
          currentStageId: 'STG-01',
          currentStageIndex: 0,
          totalStages: 12,
          status: 'In Progress',
          createdAt: now,
          updatedAt: now,
          totalDelayHours: 0,
          remarks: `Material indent forwarded from Store Stock Check #${flow.indentNo}`,
          stages: FMS_STANDARD_PURCHASE_STAGES.map((s, sIdx) => ({
            stageId: s.stageId,
            stageName: s.name,
            assignee: s.whoDefaultAssignee,
            how: s.howChannel,
            status: sIdx === 0 ? 'In Progress' : 'Pending',
            plannedDateTime: sIdx === 0 ? now : undefined,
            formResponseRef: s.formUrl,
          })),
        };
        updated = [newIndentFlow, ...updated];
        showToast(`Stock Check requisition sent! Purchase Dept Indent-to-PO Flow created for Indent #${flow.indentNo}.`);
      }
    }

    // When Accounts completes Stage 15 in modal/table:
    if (flow.flowType === 'PO_TO_PAYMENT' && targetStage.stageId === 'STG-PAY-15' && !isCurrentlyDone) {
      const existingDispFlow = flows.find(
        (f) => f.linkedFlowId === flow.flowId || (f.poNumber === flow.poNumber && f.flowType === 'PAYMENT_TO_DISPATCH')
      );
      if (!existingDispFlow) {
        const newDispFlow: FmsInstance = {
          id: `fms-inst-disp-${flow.indentNo}-${Date.now()}`,
          flowId: `FLOW-DISP-${flow.indentNo}-001`,
          flowType: 'PAYMENT_TO_DISPATCH',
          linkedFlowId: flow.flowId,
          poNumber: flow.poNumber || `RAO/PO/${flow.indentNo}-001`,
          vendorName: flow.vendorName || 'Authorized Vendor',
          poAssignTo: 'MR. VIVEK',
          indentNo: flow.indentNo,
          indentDate: flow.indentDate || now,
          poDate: flow.poDate || now,
          siteName: flow.siteName,
          priority: flow.priority,
          currentStageId: 'STG-DISP-01',
          currentStageIndex: 0,
          totalStages: 7,
          status: 'In Progress',
          createdAt: now,
          updatedAt: now,
          totalDelayHours: 0,
          remarks: `Material receipt and site dispatch triggered post-payment for PO #${flow.poNumber || flow.indentNo}`,
          stages: FMS_PAYMENT_TO_DISPATCH_STAGES.map((s, sIdx) => ({
            stageId: s.stageId,
            stageName: s.name,
            assignee: s.whoDefaultAssignee,
            how: s.howChannel,
            status: sIdx === 0 ? 'In Progress' : 'Pending',
            plannedDateTime: sIdx === 0 ? now : undefined,
            formResponseRef: s.formUrl,
          })),
        };
        updated = [newDispFlow, ...updated];
        showToast(`Payment completed! Payment to Dispatch Flow created for PO #${flow.poNumber || flow.indentNo}.`);
      }
    }
    setFlows(updated);
    storageAdapter.saveFmsFlows(updated);
    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module: 'FMS',
      action: 'STAGE_ADVANCE',
      entityId: updatedFlow.flowId,
      details: `${isCurrentlyDone ? 'Reopened' : 'Completed'} Stage ${stageIndex + 1}: ${targetStage.stageName} (Decision: ${decision || targetStage.decisionValue || 'Done'})`
    });
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`Stage ${stageIndex + 1}: ${targetStage.stageName} marked as ${targetStage.status}!`);
  };

  // Delegation Handlers
  const handleCreateDelegationTask = (newTask: DelegationTask) => {
    const updated = [newTask, ...delegationTasks];
    setDelegationTasks(updated);
    storageAdapter.saveDelegationTasks(updated);
    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module: 'DELEGATION',
      action: 'CREATE',
      entityId: newTask.taskId,
      details: `Delegated task "${newTask.task}" to ${newTask.name} (Deadline: ${newTask.firstDate})`
    });
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`Task ${newTask.taskId} delegated to ${newTask.name}!`);
  };

  const handleUpdateDelegationTask = (updatedTask: DelegationTask) => {
    const updated = delegationTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t));
    setDelegationTasks(updated);
    storageAdapter.saveDelegationTasks(updated);
    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module: 'DELEGATION',
      action: updatedTask.status === 'Completed' ? 'STATUS_CHANGE' : 'REVISE_DATE',
      entityId: updatedTask.taskId,
      details: updatedTask.status === 'Completed'
        ? `Marked task #${updatedTask.taskId} as Completed`
        : `Shifted task #${updatedTask.taskId} to ${updatedTask.latestRevision} (Rev #${updatedTask.totalRevisions})`
    });
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`Task #${updatedTask.taskId} updated successfully.`);
  };

  // Checklist Handlers
  const handleCreateChecklistItem = (newItem: ChecklistItem) => {
    const updated = [newItem, ...checklistItems];
    setChecklistItems(updated);
    storageAdapter.saveChecklistItems(updated);
    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module: 'CHECKLIST',
      action: 'CREATE',
      entityId: newItem.taskId,
      details: `Created recurring [${newItem.frequency}] checklist task "${newItem.task}" for ${newItem.department}`
    });
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`Recurring checklist task #${newItem.taskId} registered!`);
  };

  const handleUpdateChecklistItem = (updatedItem: ChecklistItem) => {
    const updated = checklistItems.map((i) => (i.id === updatedItem.id ? updatedItem : i));
    setChecklistItems(updated);
    storageAdapter.saveChecklistItems(updated);
    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module: 'CHECKLIST',
      action: 'STATUS_CHANGE',
      entityId: updatedItem.taskId,
      details: `Task #${updatedItem.taskId} (${updatedItem.task}) status set to ${updatedItem.status}`
    });
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`Checklist task #${updatedItem.taskId} marked as ${updatedItem.status}!`);
  };

  const handleBatchGenerateNextCycle = () => {
    const today = new Date();
    today.setDate(today.getDate() + 7);
    const nextDate = `${String(today.getDate()).padStart(2, '0')}/${String(today.getMonth() + 1).padStart(2, '0')}/${today.getFullYear()}`;

    const weeklyTemplates = checklistItems.filter((i) => i.frequency === 'W').slice(0, 5);
    const newItems: ChecklistItem[] = weeklyTemplates.map((t, idx) => ({
      id: `chk-next-${Date.now()}-${idx}`,
      taskId: `${parseInt(t.taskId) + 100}`,
      name: t.name,
      email: t.email,
      buddyEmail: t.buddyEmail,
      department: t.department,
      frequency: 'W',
      task: t.task,
      plannedDate: nextDate,
      status: 'Pending',
      createdAt: new Date().toLocaleString('en-GB'),
      updatedAt: new Date().toLocaleString('en-GB'),
    }));

    const updated = [...newItems, ...checklistItems];
    setChecklistItems(updated);
    storageAdapter.saveChecklistItems(updated);
    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module: 'CHECKLIST',
      action: 'CREATE',
      entityId: 'CYCLE-NEXT-WK',
      details: `Auto-generated ${newItems.length} maintenance checklist tasks for planned date ${nextDate}`
    });
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`Auto-generated ${newItems.length} weekly checklist tasks for ${nextDate}!`);
  };

  // Inventory Handlers
  const handleUpdateInventoryItem = (updatedItem: InventoryItem) => {
    const updated = inventoryItems.map((i) => (i.id === updatedItem.id ? updatedItem : i));
    setInventoryItems(updated);
    storageAdapter.saveInventoryItems(updated);
    showToast(`Inventory item ${updatedItem.itemId} updated.`);
  };

  const handleRecordStockMovement = (
    movement: InventoryMovement, 
    updatedStock: number, 
    newCondition?: InventoryItem['condition']
  ) => {
    const updatedMovements = [movement, ...inventoryMovements];
    setInventoryMovements(updatedMovements);
    storageAdapter.saveInventoryMovements(updatedMovements);

    const updatedItems = inventoryItems.map((item) => {
      if (item.itemId === movement.itemId) {
        return {
          ...item,
          currentStock: updatedStock,
          condition: newCondition || item.condition,
          lastCheckedDate: new Date().toLocaleDateString('en-GB'),
        };
      }
      return item;
    });
    setInventoryItems(updatedItems);
    storageAdapter.saveInventoryItems(updatedItems);

    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module: 'IMS',
      action: 'STOCK_MOVEMENT',
      entityId: movement.transactionId,
      details: `${movement.type} ${movement.quantity} units of ${movement.itemName} from ${movement.sourceLocation} to ${movement.destinationLocation}`
    });
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`Stock transaction ${movement.transactionId} recorded!`);
  };

  const handleReturnDegradedFromInventory = (item: InventoryItem) => {
    setPreselectedInventoryItem(item);
    setIsStockMovementOpen(true);
  };

  // Registry Handlers
  const handleSaveRegistryConfig = (newConfig: CentralRegistryConfig) => {
    setRegistryConfig(newConfig);
    storageAdapter.saveRegistryConfig(newConfig);
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast('Registry and Cloud DB configuration updated.');
  };

  const handleResetSeedData = () => {
    if (window.confirm('Reset all data to the original Google Sheets baseline tables?')) {
      storageAdapter.resetToSeedData();
      loadAllData();
      showToast('All system modules restored to original Sheet baseline.');
    }
  };

  // Date parsing helper for badge counts
  const refDate = new Date(2026, 9, 5); // 05/10/2026
  refDate.setHours(0, 0, 0, 0);

  const parseD = (dStr?: string) => {
    if (!dStr) return null;
    const parts = dStr.split(' ')[0].split('/');
    if (parts.length === 3) return new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
    return null;
  };

  // User-scoped vs org counts for badges
  const isMineChecklist = (c: ChecklistItem) => {
    return c.email.toLowerCase() === currentUser.email.toLowerCase() ||
           c.name.toLowerCase().includes(currentUser.name.toLowerCase()) ||
           (currentUser.phone ? c.name.includes(currentUser.phone) : false);
  };
  const isMineDelegation = (d: DelegationTask) => {
    return d.name.toLowerCase().includes(currentUser.name.toLowerCase()) ||
           d.rolePhone.toLowerCase().includes(currentUser.name.toLowerCase()) ||
           (currentUser.phone ? d.rolePhone.includes(currentUser.phone) : false);
  };
  const isMineFms = (f: FmsInstance) => {
    return isFlowAwaitingUserAction(f, currentUser);
  };

  // Count due today and overdue for current user
  let myDueTodayCount = 0;
  let myOverdueCount = 0;

  checklistItems.filter(isMineChecklist).forEach((c) => {
    if (c.status !== 'Done') {
      const dt = parseD(c.plannedDate);
      if (dt) {
        dt.setHours(0, 0, 0, 0);
        if (dt.getTime() === refDate.getTime()) myDueTodayCount++;
        else if (dt.getTime() < refDate.getTime()) myOverdueCount++;
      }
    }
  });

  delegationTasks.filter(isMineDelegation).forEach((d) => {
    if (d.status !== 'Completed') {
      const dt = parseD(d.latestRevision || d.firstDate);
      if (dt) {
        dt.setHours(0, 0, 0, 0);
        if (dt.getTime() === refDate.getTime()) myDueTodayCount++;
        else if (dt.getTime() < refDate.getTime()) myOverdueCount++;
      }
    }
  });

  const badgeCounts = {
    dueTodayCount: myDueTodayCount,
    overdueCount: myOverdueCount,
    fmsActive: viewScope === 'USER_ONLY'
      ? flows.filter(isMineFms).length
      : flows.filter((f) => f.status === 'In Progress').length,
    delegationPending: viewScope === 'USER_ONLY'
      ? delegationTasks.filter(isMineDelegation).filter((t) => t.status === 'Pending').length
      : delegationTasks.filter((t) => t.status === 'Pending').length,
    checklistPending: viewScope === 'USER_ONLY'
      ? checklistItems.filter(isMineChecklist).filter((i) => i.status === 'Pending').length
      : checklistItems.filter((i) => i.status === 'Pending').length,
    lowStockCount: inventoryItems.filter((i) => i.currentStock <= i.minThreshold).length,
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans text-slate-900 antialiased">
      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-bounce">
          <span className="w-2 h-2 rounded-full bg-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Header with scope toggle and user switcher */}
      <Header
        currentUser={currentUser}
        onUserChange={handleUserChange}
        registryConfig={registryConfig}
        activeTab={activeTab}
        onRefresh={loadAllData}
        viewScope={viewScope}
        onToggleScope={handleToggleScope}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={setActiveTab}
          badgeCounts={badgeCounts}
          isOpen={isSidebarOpen}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-6">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'summary' && (
              <UnifiedWorkSummary
                currentUser={currentUser}
                checklistItems={checklistItems}
                delegationTasks={delegationTasks}
                flows={flows}
                onCompleteChecklist={handleUpdateChecklistItem}
                onCompleteDelegation={handleUpdateDelegationTask}
                onAdvanceFmsStage={handleAdvanceCurrentStage}
                onCompleteFmsStage={handleCompleteFmsStage}
                onReviseDelegation={(task) => setSelectedTaskForRevision(task)}
                onSelectFmsDetail={(flow) => setSelectedFmsDetail(flow)}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onAddProcessRemark={handleAddProcessRemark}
                onNudgeItem={handleNudgeItem}
              />
            )}

            {activeTab === 'mis' && (
              <MisDashboard
                flows={flows}
                delegationTasks={delegationTasks}
                checklistItems={checklistItems}
                inventoryItems={inventoryItems}
                currentUser={currentUser}
                viewScope={viewScope}
                onToggleScope={handleToggleScope}
                onNavigateTab={(tab) => setActiveTab(tab)}
              />
            )}

            {activeTab === 'fms' && (
              <FmsPipeline
                flows={flows}
                currentUser={currentUser}
                viewScope={viewScope}
                onToggleScope={handleToggleScope}
                onUpdateFlow={(flow) => {
                  const updated = flows.map((f) => (f.id === flow.id ? flow : f));
                  setFlows(updated);
                  storageAdapter.saveFmsFlows(updated);
                }}
                onCreateFlow={() => setIsCreateFmsOpen(true)}
                onSelectFlow={(f) => setSelectedFmsDetail(f)}
              />
            )}

            {activeTab === 'delegation' && (
              <DelegationBoard
                tasks={delegationTasks}
                currentUser={currentUser}
                viewScope={viewScope}
                onToggleScope={handleToggleScope}
                onUpdateTask={handleUpdateDelegationTask}
                onNewTask={() => setIsNewTaskOpen(true)}
                onReviseTask={(task) => setSelectedTaskForRevision(task)}
              />
            )}

            {activeTab === 'checklist' && (
              <ChecklistManager
                items={checklistItems}
                currentUser={currentUser}
                viewScope={viewScope}
                onToggleScope={handleToggleScope}
                onUpdateItem={handleUpdateChecklistItem}
                onNewItem={() => setIsNewChecklistOpen(true)}
                onBatchGenerateNextCycle={handleBatchGenerateNextCycle}
              />
            )}

            {activeTab === 'ims' && (
              <InventoryManager
                items={inventoryItems}
                movements={inventoryMovements}
                currentUser={currentUser}
                onUpdateItem={handleUpdateInventoryItem}
                onNewMovement={() => {
                  setPreselectedInventoryItem(null);
                  setIsStockMovementOpen(true);
                }}
                onReturnDegraded={handleReturnDegradedFromInventory}
              />
            )}

            {activeTab === 'registry' && (
              <CentralRegistryView
                config={registryConfig}
                onSaveConfig={handleSaveRegistryConfig}
                onResetSeedData={handleResetSeedData}
              />
            )}

            {activeTab === 'audit' && (
              <AuditLogView logs={auditLogs} />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <CreateFmsModal
        isOpen={isCreateFmsOpen}
        onClose={() => setIsCreateFmsOpen(false)}
        currentUser={currentUser}
        onCreate={handleCreateFlow}
      />

      <FmsDetailModal
        flow={selectedFmsDetail}
        currentUser={currentUser}
        onClose={() => setSelectedFmsDetail(null)}
      />

      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        onCreate={handleCreateDelegationTask}
      />

      <ReviseTaskModal
        task={selectedTaskForRevision}
        currentUser={currentUser}
        onClose={() => setSelectedTaskForRevision(null)}
        onSaveRevision={handleUpdateDelegationTask}
      />

      <NewChecklistModal
        isOpen={isNewChecklistOpen}
        onClose={() => setIsNewChecklistOpen(false)}
        currentUser={currentUser}
        onCreate={handleCreateChecklistItem}
      />

      <StockMovementModal
        isOpen={isStockMovementOpen}
        onClose={() => {
          setIsStockMovementOpen(false);
          setPreselectedInventoryItem(null);
        }}
        items={inventoryItems}
        currentUser={currentUser}
        preselectedItem={preselectedInventoryItem}
        onRecord={handleRecordStockMovement}
      />
    </div>
  );
}
