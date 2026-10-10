/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Header, ViewScope } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { MobileBottomNav } from './components/layout/MobileBottomNav';
import { MobileDrawer } from './components/layout/MobileDrawer';
import { MobileQuickActionModal } from './components/layout/MobileQuickActionModal';
import { UnifiedWorkSummary } from './components/summary/UnifiedWorkSummary';
import { MisDashboard } from './components/mis/MisDashboard';
import { FmsPipeline } from './components/fms/FmsPipeline';
import { FmsAuditLedgerView } from './components/fms/FmsAuditLedgerView';
import { CreateFmsModal } from './components/fms/CreateFmsModal';
import { FmsDetailModal } from './components/fms/FmsDetailModal';
import { StageActionModal } from './components/fms/StageActionModal';
import { FmsTemplateStudioModal } from './components/fms/FmsTemplateStudioModal';
import { DelegationBoard } from './components/delegation/DelegationBoard';
import { NewTaskModal } from './components/delegation/NewTaskModal';
import { ReviseTaskModal } from './components/delegation/ReviseTaskModal';
import { ChecklistManager } from './components/checklist/ChecklistManager';
import { NewChecklistModal } from './components/checklist/NewChecklistModal';
import { InventoryManager } from './components/ims/InventoryManager';
import { StockMovementModal } from './components/ims/StockMovementModal';
import { CentralRegistryView } from './components/registry/CentralRegistryView';
import { AuditLogView } from './components/audit/AuditLogView';
import { LoginPage } from './components/auth/LoginPage';
import { MyProfileModal } from './components/user/MyProfileModal';
import { MyProfilePage } from './components/user/MyProfilePage';
import { SuperAdminModal } from './components/user/SuperAdminModal';
import { SuperAdminGovernanceView } from './components/user/SuperAdminGovernanceView';
import { GlobalSearchModal } from './components/common/GlobalSearchModal';
import { Plus } from 'lucide-react';

import { 
  ChecklistItem, 
  DelegationTask, 
  FmsInstance, 
  InventoryItem, 
  InventoryMovement, 
  UserProfile, 
  CentralRegistryConfig, 
  AuditLogEntry,
  ProcessRemark,
  FmsTemplateDefinition,
  NoticeBoardItem,
  isUserSuperAdmin,
  hasModulePermission
} from './types';
import { 
  USERS, 
  FMS_CHECK_STOCK_STAGES, 
  FMS_STANDARD_PURCHASE_STAGES, 
  FMS_PO_PAYMENT_STAGES,
  FMS_PURCHASE_TO_STORE_DISPATCH_STAGES,
  FMS_STORE_TO_SITE_DISPATCH_STAGES,
  FMS_PAYMENT_TO_DISPATCH_STAGES,
  FMS_SITE_RECEIVE_STAGES
} from './data/initialData';
import { isFlowAwaitingUserAction } from './services/stageAssignment';
import { storageAdapter } from './services/storageAdapter';

export default function App() {
  // Land by default on the unified daily work summary
  const [activeTab, setActiveTab] = useState<NavTab>('summary');
  
  // User Management & Authentication States
  const [usersList, setUsersList] = useState<UserProfile[]>(() => storageAdapter.getUsers());
  const [noticeBoardItems, setNoticeBoardItems] = useState<NoticeBoardItem[]>(() => storageAdapter.getNoticeBoard());
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(() => storageAdapter.getAuthUser() !== null);
  const [currentUser, setCurrentUser] = useState<UserProfile>(() => storageAdapter.getAuthUser() || USERS[0]);
  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const [isMyProfileOpen, setIsMyProfileOpen] = useState<boolean>(false);
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState<boolean>(false);

  // Default to USER_ONLY so staff members see only what belongs to them first
  const [viewScope, setViewScope] = useState<ViewScope>('USER_ONLY');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [pcDeskActive, setPcDeskActive] = useState<boolean>(false);

  // Data states
  const [flows, setFlows] = useState<FmsInstance[]>([]);
  const [selectedFmsDepartment, setSelectedFmsDepartment] = useState<string | null>(null);
  const [delegationTasks, setDelegationTasks] = useState<DelegationTask[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [registryConfig, setRegistryConfig] = useState<CentralRegistryConfig>(storageAdapter.getRegistryConfig());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);

  // Modals
  const [isGlobalSearchOpen, setIsGlobalSearchOpen] = useState(false);
  const [isCreateFmsOpen, setIsCreateFmsOpen] = useState(false);
  const [isTemplateStudioOpen, setIsTemplateStudioOpen] = useState(false);
  const [templateStudioKey, setTemplateStudioKey] = useState<string | null>(null);
  const [stageActionTarget, setStageActionTarget] = useState<{ flow: FmsInstance; stageIndex: number } | null>(null);
  const [selectedFmsDetail, setSelectedFmsDetail] = useState<FmsInstance | null>(null);
  const [isNewTaskOpen, setIsNewTaskOpen] = useState(false);
  const [selectedTaskForRevision, setSelectedTaskForRevision] = useState<DelegationTask | null>(null);
  const [isNewChecklistOpen, setIsNewChecklistOpen] = useState(false);
  const [isStockMovementOpen, setIsStockMovementOpen] = useState(false);
  const [preselectedInventoryItem, setPreselectedInventoryItem] = useState<InventoryItem | null>(null);
  
  // Mobile Native navigation states
  const [isMobileDrawerOpen, setIsMobileDrawerOpen] = useState(false);
  const [isQuickActionModalOpen, setIsQuickActionModalOpen] = useState(false);

  // Toast notification
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const handleUpdateUsersList = (updatedUsers: UserProfile[]) => {
    setUsersList(updatedUsers);
    storageAdapter.saveUsers(updatedUsers);
  };

  const handleUpdateNoticeBoard = (updatedNotices: NoticeBoardItem[]) => {
    setNoticeBoardItems(updatedNotices);
    storageAdapter.saveNoticeBoard(updatedNotices);
  };

  const handleUpdateCurrentUser = (updatedUser: UserProfile) => {
    setCurrentUser(updatedUser);
    storageAdapter.saveAuthUser(updatedUser);
    const nextList = usersList.map((u) => (u.userId === updatedUser.userId ? updatedUser : u));
    handleUpdateUsersList(nextList);
  };

  const handleLogout = () => {
    storageAdapter.logoutAuthUser();
    setIsAuthenticated(false);
    setIsMyProfileOpen(false);
    setIsSuperAdminOpen(false);
    showToast('Signed out of session.');
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

  // Global Keyboard Shortcut: Ctrl+K or Cmd+K to open universal search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsGlobalSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleToggleScope = (newScope: ViewScope) => {
    if (!isSuperAdmin) {
      setViewScope('USER_ONLY');
      return;
    }
    setViewScope(newScope);
    showToast(
      newScope === 'USER_ONLY'
        ? `Scope set to items belonging to ${currentUser.name}`
        : 'Scope expanded to view all organization items'
    );
  };

  const handleTabChange = (tab: NavTab) => {
    if (tab === 'profile') {
      setActiveTab('profile');
      return;
    }
    if (tab === 'super-admin') {
      if (isSuperAdmin) {
        setActiveTab('super-admin');
      }
      return;
    }
    if (!isSuperAdmin && !hasModulePermission(currentUser, tab, 'view')) {
      if (hasModulePermission(currentUser, 'summary', 'view')) {
        setActiveTab('summary');
      } else if (hasModulePermission(currentUser, 'mis', 'view')) {
        setActiveTab('mis');
      } else {
        setActiveTab('profile');
      }
      return;
    }
    setActiveTab(tab);
  };

  const handleUserChange = (newUser: UserProfile) => {
    setCurrentUser(newUser);
    const newIsSuper = isUserSuperAdmin(newUser);
    if (!newIsSuper) {
      setViewScope('USER_ONLY');
      setPcDeskActive(false);
      setActiveTab((prev) => {
        if (prev === 'profile') return prev;
        if (hasModulePermission(newUser, prev, 'view')) return prev;
        if (hasModulePermission(newUser, 'summary', 'view')) return 'summary';
        if (hasModulePermission(newUser, 'mis', 'view')) return 'mis';
        return 'profile';
      });
      showToast(`Switched active profile to ${newUser.name} (${newUser.role})`);
    } else {
      const isPc = newUser.role.toLowerCase().includes('process coordinator') || newUser.name.toLowerCase().includes('ritu sahu');
      setPcDeskActive(isPc);
      if (isPc) {
        setViewScope('ALL_ORG');
        showToast(`Switched active profile to ${newUser.name} (${newUser.role}). Scope automatically expanded to view ALL user data across all departments!`);
      } else {
        showToast(`Switched active profile to ${newUser.name} (${newUser.role})`);
      }
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

  const handleAdvanceCurrentStage = (
    flow: FmsInstance, 
    decision?: 'Yes' | 'No',
    submittedData?: Record<string, any>
  ) => {
    const updatedStages = [...flow.stages];
    const currentIndex = flow.currentStageIndex;
    const currentStage = updatedStages[currentIndex];

    if (!currentStage) return;

    const now = new Date();
    const formattedNow = now.toLocaleString('en-GB');
    currentStage.status = 'Done';
    currentStage.actualDateTime = formattedNow;
    if (decision) {
      currentStage.decisionValue = decision;
    }
    if (submittedData) {
      currentStage.submittedData = submittedData;
      if (Array.isArray(submittedData._checkpoints)) {
        currentStage.checkedCheckpoints = submittedData._checkpoints;
      }
    }

    let nextIndex = currentIndex + 1;

    // Checkpoint branching rules:
    // 1. Custom configured conditional jump commands from Template Studio:
    if (currentStage.logic?.gatewayType === 'CONDITIONAL_JUMP') {
      const dec = decision || (currentStage.submittedData?.status === 'APPROVED' ? 'Yes' : currentStage.submittedData?.status === 'REJECTED' ? 'No' : undefined);
      if (dec === 'Yes' && typeof currentStage.logic.yesTargetStageIndex === 'number') {
        const target = currentStage.logic.yesTargetStageIndex;
        if (target > currentIndex + 1) {
          for (let i = currentIndex + 1; i < target && i < updatedStages.length; i++) {
            if (updatedStages[i]) {
              updatedStages[i].status = 'Skipped';
              updatedStages[i].notes = `Skipped by conditional jump from Stage #${currentIndex + 1} ('Yes' branch)`;
            }
          }
        }
        nextIndex = target;
      } else if (dec === 'No' && typeof currentStage.logic.noTargetStageIndex === 'number') {
        const target = currentStage.logic.noTargetStageIndex;
        if (target > currentIndex + 1) {
          for (let i = currentIndex + 1; i < target && i < updatedStages.length; i++) {
            if (updatedStages[i]) {
              updatedStages[i].status = 'Skipped';
              updatedStages[i].notes = `Skipped by conditional jump from Stage #${currentIndex + 1} ('No' branch)`;
            }
          }
        }
        nextIndex = target;
      }
    } else if (flow.flowType === 'CHECK_STOCK') {
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
      const def = stageDefs.find((s) => s.stageId === updatedStages[nextIndex].stageId);
      const sla = def?.slaHours || 1;
      const targetDate = new Date(now.getTime() + sla * 3600000);
      updatedStages[nextIndex].plannedDateTime = targetDate.toLocaleString('en-GB');
    }

    const updatedFlow: FmsInstance = {
      ...flow,
      currentStageIndex: isComplete ? updatedStages.length : nextIndex,
      currentStageId: nextStageId,
      status: isComplete ? 'Completed' : 'In Progress',
      updatedAt: formattedNow,
      stages: updatedStages,
      ...(submittedData?.vendorName ? { vendorName: String(submittedData.vendorName) } : {}),
      ...(submittedData?.amountToBePaid ? { poAmount: parseFloat(submittedData.amountToBePaid) || flow.poAmount } : {}),
      ...(submittedData?.modeOfPayment ? { paymentMode: submittedData.modeOfPayment } : {}),
      ...(submittedData?.billNoOrPo ? { poNumber: String(submittedData.billNoOrPo) } : {}),
    };

    let updatedFlowsList = flows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f));

    // DYNAMIC SUB-WORKFLOW TRIGGER EVALUATOR (Configured via Template Studio)
    if (currentStage.subWorkflowTrigger && currentStage.subWorkflowTrigger.enabled && currentStage.subWorkflowTrigger.targetTemplateKey) {
      const trigger = currentStage.subWorkflowTrigger;
      let conditionMet = false;
      if (trigger.triggerCondition === 'ON_DECISION_YES' && decision === 'Yes') conditionMet = true;
      else if (trigger.triggerCondition === 'ON_DECISION_NO' && decision === 'No') conditionMet = true;
      else if (!trigger.triggerCondition || trigger.triggerCondition === 'ON_COMPLETE') conditionMet = true;

      if (conditionMet) {
        const targetType = trigger.targetTemplateKey;
        const mappings = trigger.fieldMappings || [];
        
        // Map submittedData and flow variables
        const mappedData: Record<string, any> = {};
        mappings.forEach((m) => {
          const val = submittedData?.[m.sourceField] || (submittedData as any)?.[m.targetField] || (flow as any)[m.sourceField] || (flow as any)[m.targetField];
          if (val !== undefined && val !== '') {
            mappedData[m.targetField] = val;
          }
        });

        const existingChildIndex = updatedFlowsList.findIndex(
          (f) => f.linkedFlowId === flow.flowId || (f.indentNo === flow.indentNo && f.flowType === targetType)
        );

        const targetPoNumber = mappedData.poNumber || submittedData?.poNumber || flow.poNumber || `RAO/PO/${flow.indentNo}-001`;
        const targetVendor = mappedData.vendorName || submittedData?.vendorName || flow.vendorName || 'AUTHORISED OEM VENDOR';
        const targetAmount = mappedData.poAmount ? parseFloat(mappedData.poAmount) : (submittedData?.amountToBePaid ? parseFloat(submittedData.amountToBePaid) : (flow.poAmount || 50000));
        const targetMode = mappedData.paymentMode || submittedData?.modeOfPayment || flow.paymentMode || 'ACCOUNT';
        const targetRemarks = mappedData.remarks || submittedData?.paymentRemarks || submittedData?.remarks || `Automated workflow trigger from ${flow.indentNo} stage ${currentStage.stageName}`;

        if (existingChildIndex >= 0) {
          const existingChild = updatedFlowsList[existingChildIndex];
          const updatedChild: FmsInstance = {
            ...existingChild,
            poNumber: targetPoNumber,
            vendorName: targetVendor,
            poAmount: targetAmount,
            paymentMode: targetMode,
            remarks: targetRemarks,
            updatedAt: formattedNow,
          };
          updatedFlowsList = updatedFlowsList.map((f, idx) => (idx === existingChildIndex ? updatedChild : f));
          showToast(`Dynamic sub-workflow (${targetType}) updated automatically from Template Studio rule for Indent #${flow.indentNo}.`);
        } else {
          let childStages = FMS_PO_PAYMENT_STAGES;
          if (targetType === 'CHECK_STOCK') childStages = FMS_CHECK_STOCK_STAGES;
          else if (targetType === 'PURCHASE_TO_STORE_DISPATCH') childStages = FMS_PURCHASE_TO_STORE_DISPATCH_STAGES;
          else if (targetType === 'STORE_TO_SITE_DISPATCH') childStages = FMS_STORE_TO_SITE_DISPATCH_STAGES;
          else if (targetType === 'PAYMENT_TO_DISPATCH') childStages = FMS_PAYMENT_TO_DISPATCH_STAGES;
          else if (targetType === 'SITE_RECEIVE') childStages = FMS_SITE_RECEIVE_STAGES;

          const newChildFlow: FmsInstance = {
            id: `fms-inst-${targetType.toLowerCase()}-${flow.indentNo}-${Date.now().toString().slice(-4)}`,
            flowId: `FLOW-${targetType}-${flow.indentNo}`,
            flowType: targetType,
            linkedFlowId: flow.flowId,
            poNumber: targetPoNumber,
            vendorName: targetVendor,
            poAssignTo: 'MANISH KOSHLE',
            indentNo: flow.indentNo,
            indentDate: flow.indentDate || formattedNow,
            poDate: formattedNow,
            poAmount: targetAmount,
            siteName: flow.siteName,
            priority: flow.priority,
            currentStageId: childStages[0]?.stageId || 'STG-01',
            currentStageIndex: 0,
            totalStages: childStages.length,
            status: 'In Progress',
            createdAt: formattedNow,
            updatedAt: formattedNow,
            totalDelayHours: 0,
            remarks: targetRemarks,
            paymentMode: targetMode,
            stages: childStages.map((s, sIdx) => ({
              stageId: s.stageId,
              stageName: s.name,
              assignee: s.whoDefaultAssignee,
              how: s.howChannel,
              status: sIdx === 0 ? 'In Progress' : 'Pending',
              plannedDateTime: sIdx === 0 ? formattedNow : undefined,
              formResponseRef: s.formUrl,
            }))
          };
          updatedFlowsList = [newChildFlow, ...updatedFlowsList];
          showToast(`Linked sub-workflow (${targetType}) triggered automatically via Template Studio rule for Indent #${flow.indentNo}!`);
        }
      }
    }

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
          indentDate: flow.indentDate || formattedNow,
          siteName: flow.siteName,
          priority: flow.priority,
          currentStageId: 'STG-01',
          currentStageIndex: 0,
          totalStages: 12,
          status: 'In Progress',
          createdAt: formattedNow,
          updatedAt: formattedNow,
          totalDelayHours: 0,
          remarks: `Material indent forwarded from Store Stock Check #${flow.indentNo}`,
          stages: FMS_STANDARD_PURCHASE_STAGES.map((s, sIdx) => ({
            stageId: s.stageId,
            stageName: s.name,
            assignee: s.whoDefaultAssignee,
            how: s.howChannel,
            status: sIdx === 0 ? 'In Progress' : 'Pending',
            plannedDateTime: sIdx === 0 ? formattedNow : undefined,
            formResponseRef: s.formUrl,
          })),
        };
        updatedFlowsList = [newIndentFlow, ...updatedFlowsList];
        showToast(`Stock Check requisition sent! Purchase Dept Indent-to-PO Flow created for Indent #${flow.indentNo}.`);
      }
    }

    // 2. When Indent Purchase Stage 10 approves advance payment (decision = 'Yes')
    // OR Stage 11 completes "SEND FOR PAYMENT":
    // Automatically link / ensure Accounts PO-to-Payment FMS exists and is updated!
    if (
      flow.flowType === 'INDENT_PURCHASE' &&
      ((currentStage.stageId === 'STG-10' && decision === 'Yes') || currentStage.stageId === 'STG-11')
    ) {
      const existingPayFlowIndex = updatedFlowsList.findIndex(
        (f) => f.linkedFlowId === flow.flowId || (f.indentNo === flow.indentNo && f.flowType === 'PO_TO_PAYMENT')
      );

      const resolvedPoNumber = submittedData?.poNumber ? String(submittedData.poNumber) : (flow.poNumber || `RAO/PO/${flow.indentNo}-001`);
      const resolvedVendor = submittedData?.vendorName ? String(submittedData.vendorName) : (flow.vendorName || 'M/S AUTHORIZED OEM VENDOR');
      const resolvedAmount = submittedData?.amountToBePaid ? (parseFloat(submittedData.amountToBePaid) || 50000) : (flow.poAmount || 50000);
      const resolvedMode = submittedData?.modeOfPayment || flow.paymentMode || 'ACCOUNT';
      const resolvedRemarks = submittedData?.paymentRemarks || submittedData?.remarks || `Payment dossier transferred from Indent #${flow.indentNo} for Accounts disbursement`;

      if (existingPayFlowIndex >= 0) {
        // Update existing Accounts flow with any refined PO/Vendor/Amount details submitted in Stage 11
        const existing = updatedFlowsList[existingPayFlowIndex];
        const updatedPayFlow: FmsInstance = {
          ...existing,
          poNumber: resolvedPoNumber,
          vendorName: resolvedVendor,
          poAmount: resolvedAmount,
          paymentMode: resolvedMode,
          remarks: resolvedRemarks,
          updatedAt: formattedNow,
        };
        updatedFlowsList = updatedFlowsList.map((f, idx) => (idx === existingPayFlowIndex ? updatedPayFlow : f));
        if (currentStage.stageId === 'STG-11') {
          showToast(`Payment details synced to Accounts PO-to-Payment FMS for Indent #${flow.indentNo}.`);
        }
      } else {
        const newPayFlow: FmsInstance = {
          id: `fms-inst-pay-${flow.indentNo}`,
          flowId: `FLOW-PAY-${flow.indentNo}-001`,
          flowType: 'PO_TO_PAYMENT',
          linkedFlowId: flow.flowId,
          poNumber: resolvedPoNumber,
          vendorName: resolvedVendor,
          poAssignTo: 'MANISH KOSHLE',
          indentNo: flow.indentNo,
          indentDate: flow.indentDate || formattedNow,
          poDate: formattedNow,
          poAmount: resolvedAmount,
          siteName: flow.siteName,
          priority: flow.priority,
          currentStageId: 'STG-PAY-01',
          currentStageIndex: 0,
          totalStages: 15,
          status: 'In Progress',
          createdAt: formattedNow,
          updatedAt: formattedNow,
          totalDelayHours: 0,
          remarks: resolvedRemarks,
          paymentMode: resolvedMode,
          stages: FMS_PO_PAYMENT_STAGES.map((s, sIdx) => ({
            stageId: s.stageId,
            stageName: s.name,
            assignee: s.whoDefaultAssignee,
            how: s.howChannel,
            status: sIdx === 0 ? 'In Progress' : 'Pending',
            plannedDateTime: sIdx === 0 ? formattedNow : undefined,
            formResponseRef: s.formUrl,
          }))
        };
        updatedFlowsList = [newPayFlow, ...updatedFlowsList];
        showToast(
          currentStage.stageId === 'STG-11'
            ? `Dossier submitted! Accounts PO-to-Payment flow initialized for Indent #${flow.indentNo}.`
            : `Advance payment approved! Accounts PO-to-Payment flow initialized for Indent #${flow.indentNo}.`
        );
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
          indentDate: flow.indentDate || formattedNow,
          siteName: flow.siteName,
          priority: flow.priority,
          currentStageId: 'STG-PSD-01',
          currentStageIndex: 0,
          totalStages: 10,
          status: 'In Progress',
          createdAt: formattedNow,
          updatedAt: formattedNow,
          totalDelayHours: 0,
          remarks: `Material received at warehouse. Purchase to Store to Dispatch workflow initiated for Indent #${flow.indentNo}`,
          stages: FMS_PURCHASE_TO_STORE_DISPATCH_STAGES.map((s, sIdx) => ({
            stageId: s.stageId,
            stageName: s.name,
            assignee: s.whoDefaultAssignee,
            how: s.howChannel,
            status: sIdx === 0 ? 'In Progress' : 'Pending',
            plannedDateTime: sIdx === 0 ? formattedNow : undefined,
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

  const handleCompleteFmsStage = (
    flow: FmsInstance, 
    stageIndex: number, 
    decision?: 'Yes' | 'No',
    submittedData?: Record<string, any>
  ) => {
    // FMS stages are strictly sequential: can ONLY action the active stage in an in-progress flow!
    if (flow.status !== 'In Progress' || stageIndex !== flow.currentStageIndex) {
      showToast(`Stage ${stageIndex + 1} cannot be actioned out of sequence. Active stage is Stage ${flow.currentStageIndex + 1}.`);
      return;
    }
    handleAdvanceCurrentStage(flow, decision, submittedData);
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

  if (!isAuthenticated) {
    return (
      <LoginPage
        onLoginSuccess={(u) => {
          storageAdapter.saveAuthUser(u);
          setCurrentUser(u);
          setIsAuthenticated(true);
          showToast(`Welcome back, ${u.name}!`);
        }}
        noticeItems={noticeBoardItems}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col font-sans text-slate-900 antialiased">
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
        onUserChange={(newUser) => {
          setCurrentUser(newUser);
          storageAdapter.saveAuthUser(newUser);
          const deptName = (newUser.departmentName || newUser.role || '').toUpperCase();
          if (deptName.includes('PURCHASE')) {
            setSelectedFmsDepartment('PURCHASE');
          } else if (deptName.includes('STORE')) {
            setSelectedFmsDepartment('STORE');
          } else if (deptName.includes('ACCOUNT') || deptName.includes('FINANCE')) {
            setSelectedFmsDepartment('ACCOUNTS');
          } else if (deptName.includes('PLANT') || deptName.includes('EQUIPMENT') || deptName.includes('STRUCTURE')) {
            setSelectedFmsDepartment('PLANT_OPS');
          } else {
            setSelectedFmsDepartment(null);
          }
        }}
        registryConfig={registryConfig}
        activeTab={activeTab}
        onRefresh={loadAllData}
        viewScope={isSuperAdmin ? viewScope : 'USER_ONLY'}
        onToggleScope={handleToggleScope}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        pcDeskActive={isSuperAdmin ? pcDeskActive : false}
        onTogglePcDesk={isSuperAdmin ? () => {
          const next = !pcDeskActive;
          setPcDeskActive(next);
          showToast(next ? "PC Desk Mode Enabled" : "PC Desk Mode Disabled");
        } : undefined}
        onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
        onOpenMyProfile={() => handleTabChange('profile')}
        onOpenSuperAdmin={isSuperAdmin ? () => setActiveTab('super-admin') : undefined}
        onLogout={handleLogout}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
      />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            handleTabChange(tab);
            if (tab === 'fms') {
              setSelectedFmsDepartment(null);
            }
          }}
          badgeCounts={badgeCounts}
          isOpen={isSidebarOpen}
          flows={flows}
          selectedDepartment={selectedFmsDepartment}
          onSelectDepartmentFms={(deptKey) => {
            handleTabChange('fms');
            setSelectedFmsDepartment(deptKey);
          }}
          currentUser={currentUser}
          onOpenMyProfile={() => handleTabChange('profile')}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-6 pb-28 md:pb-6 bg-white">
          <div className="max-w-7xl mx-auto">
            {activeTab === 'summary' && (isSuperAdmin || hasModulePermission(currentUser, 'summary', 'view')) && (
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
                onNavigateTab={(tab) => handleTabChange(tab)}
                onAddProcessRemark={handleAddProcessRemark}
                onNudgeItem={handleNudgeItem}
                pcDeskActive={isSuperAdmin ? pcDeskActive : false}
                onTogglePcDesk={isSuperAdmin ? (active) => setPcDeskActive(active) : undefined}
                onCreateFmsFlow={(isSuperAdmin || hasModulePermission(currentUser, 'summary', 'edit')) ? () => setIsCreateFmsOpen(true) : undefined}
                onOpenStageAction={(flow, stageIndex) => setStageActionTarget({ flow, stageIndex })}
              />
            )}

            {activeTab === 'mis' && (isSuperAdmin || hasModulePermission(currentUser, 'mis', 'view')) && (
              <MisDashboard
                flows={flows}
                delegationTasks={delegationTasks}
                checklistItems={checklistItems}
                inventoryItems={inventoryItems}
                currentUser={currentUser}
                viewScope={isSuperAdmin ? viewScope : 'USER_ONLY'}
                onToggleScope={handleToggleScope}
                onNavigateTab={(tab) => handleTabChange(tab)}
                usersList={usersList}
              />
            )}

            {activeTab === 'fms' && (isSuperAdmin || hasModulePermission(currentUser, 'fms', 'view')) && (
              <FmsPipeline
                flows={flows}
                currentUser={currentUser}
                viewScope={isSuperAdmin ? viewScope : 'USER_ONLY'}
                onToggleScope={handleToggleScope}
                onUpdateFlow={(flow) => {
                  const updated = flows.map((f) => (f.id === flow.id ? flow : f));
                  setFlows(updated);
                  storageAdapter.saveFmsFlows(updated);
                }}
                onCreateFlow={(isSuperAdmin || hasModulePermission(currentUser, 'fms', 'edit')) ? () => setIsCreateFmsOpen(true) : undefined}
                onSelectFlow={(f) => setSelectedFmsDetail(f)}
                onOpenTemplateStudio={(isSuperAdmin || hasModulePermission(currentUser, 'fms', 'edit')) ? (key) => {
                  setTemplateStudioKey(key || null);
                  setIsTemplateStudioOpen(true);
                } : undefined}
                onOpenStageAction={(flow, stageIndex) => setStageActionTarget({ flow, stageIndex })}
                selectedDepartmentFilter={selectedFmsDepartment}
                onClearDepartmentFilter={() => setSelectedFmsDepartment(null)}
              />
            )}

            {activeTab === 'fms-audit' && (isSuperAdmin || hasModulePermission(currentUser, 'fms-audit', 'view')) && (
              <FmsAuditLedgerView
                flows={flows}
                currentUser={currentUser}
                onSelectFlow={(f) => setSelectedFmsDetail(f)}
              />
            )}

            {activeTab === 'delegation' && (isSuperAdmin || hasModulePermission(currentUser, 'delegation', 'view')) && (
              <DelegationBoard
                tasks={delegationTasks}
                currentUser={currentUser}
                viewScope={isSuperAdmin ? viewScope : 'USER_ONLY'}
                onToggleScope={handleToggleScope}
                onUpdateTask={handleUpdateDelegationTask}
                onNewTask={(isSuperAdmin || hasModulePermission(currentUser, 'delegation', 'edit')) ? () => setIsNewTaskOpen(true) : undefined}
                onReviseTask={(task) => setSelectedTaskForRevision(task)}
                onAddProcessRemark={handleAddProcessRemark}
              />
            )}

            {activeTab === 'checklist' && (isSuperAdmin || hasModulePermission(currentUser, 'checklist', 'view')) && (
              <ChecklistManager
                items={checklistItems}
                currentUser={currentUser}
                viewScope={isSuperAdmin ? viewScope : 'USER_ONLY'}
                onToggleScope={handleToggleScope}
                onUpdateItem={handleUpdateChecklistItem}
                onNewItem={(isSuperAdmin || hasModulePermission(currentUser, 'checklist', 'edit')) ? () => setIsNewChecklistOpen(true) : undefined}
                onBatchGenerateNextCycle={(isSuperAdmin || hasModulePermission(currentUser, 'checklist', 'edit')) ? handleBatchGenerateNextCycle : undefined}
                onAddProcessRemark={handleAddProcessRemark}
              />
            )}

            {activeTab === 'ims' && (isSuperAdmin || hasModulePermission(currentUser, 'ims', 'view')) && (
              <InventoryManager
                items={inventoryItems}
                movements={inventoryMovements}
                currentUser={currentUser}
                onUpdateItem={handleUpdateInventoryItem}
                onNewMovement={(isSuperAdmin || hasModulePermission(currentUser, 'ims', 'edit')) ? () => {
                  setPreselectedInventoryItem(null);
                  setIsStockMovementOpen(true);
                } : undefined}
                onReturnDegraded={handleReturnDegradedFromInventory}
              />
            )}

            {activeTab === 'registry' && (isSuperAdmin || hasModulePermission(currentUser, 'registry', 'view')) && (
              <CentralRegistryView
                config={registryConfig}
                onSaveConfig={handleSaveRegistryConfig}
                onResetSeedData={handleResetSeedData}
                onOpenTemplateStudio={(key) => {
                  setTemplateStudioKey(key || null);
                  setIsTemplateStudioOpen(true);
                }}
                onCreateFlow={() => setIsCreateFmsOpen(true)}
              />
            )}

            {activeTab === 'audit' && (isSuperAdmin || hasModulePermission(currentUser, 'audit', 'view')) && (
              <AuditLogView logs={auditLogs} />
            )}

            {activeTab === 'super-admin' && isSuperAdmin && (
              <SuperAdminGovernanceView
                usersList={usersList}
                onUpdateUsersList={handleUpdateUsersList}
                noticeBoardItems={noticeBoardItems}
                onUpdateNoticeBoard={handleUpdateNoticeBoard}
                onImpersonateUser={(u) => {
                  setCurrentUser(u);
                  storageAdapter.saveAuthUser(u);
                  showToast(`Now viewing portal as ${u.name}`);
                }}
                currentUser={currentUser}
              />
            )}
            {activeTab === 'profile' && (
              <MyProfilePage
                currentUser={currentUser}
                onUpdateProfile={handleUpdateCurrentUser}
                onLogout={handleLogout}
                onNavigateToScoreboard={() => handleTabChange('mis')}
                onBackToDashboard={() => handleTabChange('summary')}
                fmsFlows={flows}
                delegationTasks={delegationTasks}
                checklistItems={checklistItems}
                auditLogs={auditLogs}
              />
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
        onOpenTemplateStudio={() => {
          setIsCreateFmsOpen(false);
          setIsTemplateStudioOpen(true);
        }}
      />

      <StageActionModal
        isOpen={Boolean(stageActionTarget)}
        flow={stageActionTarget ? flows.find(f => f.id === stageActionTarget.flow.id) || stageActionTarget.flow : null}
        stageIndex={stageActionTarget ? stageActionTarget.stageIndex : 0}
        currentUser={currentUser}
        onClose={() => setStageActionTarget(null)}
        onSubmitStage={(flow, stageIndex, submittedData, decision) => {
          handleAdvanceCurrentStage(flow, decision, submittedData);
          setStageActionTarget(null);
        }}
      />

      <FmsTemplateStudioModal
        isOpen={isTemplateStudioOpen}
        initialTemplateKey={templateStudioKey}
        onClose={() => {
          setIsTemplateStudioOpen(false);
          setTemplateStudioKey(null);
        }}
        onSaveTemplate={(template) => {
          storageAdapter.saveFmsTemplate(template);
          showToast(`FMS Template "${template.name}" with ${template.stages.length} custom stage forms saved!`);
        }}
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

      {/* Desktop Floating Action Button (FAB) */}
      <div className="hidden md:flex fixed bottom-6 right-6 z-40">
        <button
          type="button"
          onClick={() => setIsQuickActionModalOpen(true)}
          className="h-14 w-14 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-xl hover:shadow-2xl ring-4 ring-indigo-100/90 hover:scale-105 active:scale-95 transition-all cursor-pointer group"
          title="Quick Action: Create New Entry (+)"
          aria-label="Create New Entry"
        >
          <Plus className="w-7 h-7 stroke-[2.5] group-hover:rotate-90 transition-transform duration-200" />
        </button>
      </div>

      {/* Mobile Native Experience Components (md:hidden) */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={(tab) => {
          handleTabChange(tab);
          if (tab === 'fms') {
            setSelectedFmsDepartment(null);
          }
        }}
        badgeCounts={badgeCounts}
        onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
        onOpenQuickAction={() => setIsQuickActionModalOpen(true)}
        currentUser={currentUser}
      />

      <MobileDrawer
        isOpen={isMobileDrawerOpen}
        onClose={() => setIsMobileDrawerOpen(false)}
        activeTab={activeTab}
        onTabChange={(tab) => {
          handleTabChange(tab);
          if (tab === 'fms') {
            setSelectedFmsDepartment(null);
          }
        }}
        currentUser={currentUser}
        onUserChange={handleUserChange}
        viewScope={isSuperAdmin ? viewScope : 'USER_ONLY'}
        onToggleScope={handleToggleScope}
        pcDeskActive={isSuperAdmin ? pcDeskActive : false}
        onTogglePcDesk={isSuperAdmin ? () => {
          const next = !pcDeskActive;
          setPcDeskActive(next);
          showToast(next ? "PC Desk Mode Enabled" : "PC Desk Mode Disabled");
        } : undefined}
        badgeCounts={badgeCounts}
        flows={flows}
        selectedDepartment={selectedFmsDepartment}
        onSelectDepartmentFms={(deptKey) => {
          handleTabChange('fms');
          setSelectedFmsDepartment(deptKey);
        }}
        onOpenQuickAction={isSuperAdmin ? () => {
          setIsMobileDrawerOpen(false);
          setIsQuickActionModalOpen(true);
        } : undefined}
        onRefresh={loadAllData}
      />

      <MobileQuickActionModal
        isOpen={isQuickActionModalOpen}
        onClose={() => setIsQuickActionModalOpen(false)}
        onCreateFms={() => setIsCreateFmsOpen(true)}
        onNewTask={() => setIsNewTaskOpen(true)}
        onNewChecklist={() => setIsNewChecklistOpen(true)}
        onStockMovement={() => {
          setPreselectedInventoryItem(null);
          setIsStockMovementOpen(true);
        }}
        onOpenTemplateStudio={() => {
          setTemplateStudioKey(null);
          setIsTemplateStudioOpen(true);
        }}
      />

      {/* User Profile Modal */}
      <MyProfileModal
        isOpen={isMyProfileOpen}
        onClose={() => setIsMyProfileOpen(false)}
        currentUser={currentUser}
        onUpdateProfile={handleUpdateCurrentUser}
        onLogout={handleLogout}
        onNavigateToScoreboard={() => {
          setIsMyProfileOpen(false);
          setActiveTab('mis');
        }}
        fmsFlows={flows}
        delegationTasks={delegationTasks}
        checklistItems={checklistItems}
        auditLogs={auditLogs}
      />

      {/* Super Admin Governance Center Modal */}
      <SuperAdminModal
        isOpen={isSuperAdminOpen}
        onClose={() => setIsSuperAdminOpen(false)}
        usersList={usersList}
        onUpdateUsersList={handleUpdateUsersList}
        noticeBoardItems={noticeBoardItems}
        onUpdateNoticeBoard={handleUpdateNoticeBoard}
        onImpersonateUser={(u) => {
          setCurrentUser(u);
          storageAdapter.saveAuthUser(u);
          showToast(`Now viewing portal as ${u.name}`);
        }}
      />

      {/* Global Universal Search Modal */}
      <GlobalSearchModal
        isOpen={isGlobalSearchOpen}
        onClose={() => setIsGlobalSearchOpen(false)}
        flows={flows}
        delegationTasks={delegationTasks}
        checklistItems={checklistItems}
        inventoryItems={inventoryItems}
        usersList={usersList}
        noticeBoardItems={noticeBoardItems}
        onNavigateTab={(tab) => setActiveTab(tab)}
        onSelectFlowDetail={(flow) => setSelectedFmsDetail(flow)}
        onSelectInventoryItem={(item) => {
          setPreselectedInventoryItem(item);
          setIsStockMovementOpen(true);
        }}
        onSelectDelegationTask={(task) => setSelectedTaskForRevision(task)}
        onImpersonateUser={(u) => {
          setCurrentUser(u);
          storageAdapter.saveAuthUser(u);
          showToast(`Now viewing portal as ${u.name}`);
        }}
      />
    </div>
  );
}
