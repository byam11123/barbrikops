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
import { FmsTemplateStudioPage } from './components/fms/FmsTemplateStudioPage';
import { FmsIndividualView } from './components/fms/FmsIndividualView';
import { ComparativeSheetView } from './components/comparative/ComparativeSheetView';
import { BankPaymentsSuiteView } from './components/banking/BankPaymentsSuiteView';
import { VendorDirectoryView } from './components/vendor/VendorDirectoryView';
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
import { SiteRequisitionTracker } from './components/fms/SiteRequisitionTracker';
import { StnLedgerView } from './components/store/StnLedgerView';
import { GrnLedgerView } from './components/store/GrnLedgerView';
import { CreditLedgerView } from './components/banking/CreditLedgerView';
import { Plus } from 'lucide-react';

import { 
  ChecklistItem, 
  DelegationTask, 
  FmsInstance, 
  FmsLineItem, 
  InventoryItem, 
  InventoryMovement, 
  UserProfile, 
  CentralRegistryConfig, 
  AuditLogEntry,
  ProcessRemark,
  FmsTemplateDefinition,
  NoticeBoardItem,
  isUserSuperAdmin,
  isUserAdminOrSuperAdmin,
  hasModulePermission,
  getUserModulePermission,
  AppNotification,
  StnRecord,
  GrnRecord,
  CreditLedgerRecord
} from './types';
import { 
  getBrowserNotificationPermission, 
  requestBrowserNotificationPermission, 
  sendBrowserDesktopNotification,
  dispatchWebhookNotification,
  isSelfAssigned,
  evaluateStageSlaStatus,
  clearNotificationsForStage,
  groupWorkflowNotifications
} from './services/notificationService';
import { addWorkingSlaHours, formatToStandardDateTime, DEFAULT_WORK_SHIFT_CONFIG } from './services/workShiftService';
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
import { isFlowAwaitingUserAction, getDepartmentForWorkflow, getBestPurchaseAssistant } from './services/stageAssignment';
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
  const isAdminOrSuperAdmin = isUserAdminOrSuperAdmin(currentUser);
  const [isMyProfileOpen, setIsMyProfileOpen] = useState<boolean>(false);
  const [isSuperAdminOpen, setIsSuperAdminOpen] = useState<boolean>(false);

  // Super Admin & Admin default to ALL_ORG to view all organization entries; standard staff default to USER_ONLY
  const [viewScope, setViewScope] = useState<ViewScope>(() => {
    const authUser = storageAdapter.getAuthUser() || USERS[0];
    return isUserAdminOrSuperAdmin(authUser) ? 'ALL_ORG' : 'USER_ONLY';
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [pcDeskActive, setPcDeskActive] = useState<boolean>(false);
  const [impersonatorAdmin, setImpersonatorAdmin] = useState<UserProfile | null>(null);

  const handleImpersonateUser = (targetUser: UserProfile) => {
    if ((isSuperAdmin || isAdminOrSuperAdmin) && !impersonatorAdmin) {
      setImpersonatorAdmin(currentUser);
    }
    const latestUser = usersList.find((u) => u.userId === targetUser.userId) || targetUser;
    handleUserChange(latestUser);
    setActiveTab('summary');
    showToast(`Viewing session as ${latestUser.name} (${latestUser.role})`);
  };

  const handleExitImpersonation = () => {
    if (impersonatorAdmin) {
      const originalAdmin = usersList.find((u) => u.userId === impersonatorAdmin.userId) || impersonatorAdmin;
      setImpersonatorAdmin(null);
      handleUserChange(originalAdmin);
      setActiveTab('super-admin');
      showToast(`Returned to ${originalAdmin.name} session`);
    }
  };

  // Data states
  const [flows, setFlows] = useState<FmsInstance[]>([]);
  const [selectedFmsDepartment, setSelectedFmsDepartment] = useState<string | null>(null);
  const [selectedFmsWorkflowKey, setSelectedFmsWorkflowKey] = useState<string | null>(null);
  const [selectedChecklistDepartment, setSelectedChecklistDepartment] = useState<string | null>(null);
  const [selectedDelegationDepartment, setSelectedDelegationDepartment] = useState<string | null>(null);
  const [delegationTasks, setDelegationTasks] = useState<DelegationTask[]>([]);
  const [checklistItems, setChecklistItems] = useState<ChecklistItem[]>([]);
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [inventoryMovements, setInventoryMovements] = useState<InventoryMovement[]>([]);
  const [registryConfig, setRegistryConfig] = useState<CentralRegistryConfig>(storageAdapter.getRegistryConfig());
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>(() => groupWorkflowNotifications(storageAdapter.getNotifications()));
  const [desktopPermission, setDesktopPermission] = useState<NotificationPermission>(() => getBrowserNotificationPermission());

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
    const matchingCurrentUser = updatedUsers.find((u) => u.userId === currentUser.userId);
    if (matchingCurrentUser) {
      setCurrentUser(matchingCurrentUser);
      storageAdapter.saveAuthUser(matchingCurrentUser);
    }
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
    setSelectedFmsDetail(null);
    setStageActionTarget(null);
    setImpersonatorAdmin(null);
    showToast('Signed out of session.');
  };

  // Notification handlers (Channels 1 & 2)
  const handleMarkNotificationRead = (id: string) => {
    storageAdapter.markNotificationRead(id);
    setNotifications(groupWorkflowNotifications(storageAdapter.getNotifications()));
  };

  const handleMarkAllNotificationsRead = () => {
    storageAdapter.markAllNotificationsRead(currentUser.userId);
    setNotifications(groupWorkflowNotifications(storageAdapter.getNotifications()));
    showToast('All notifications marked as read.');
  };

  const handleClearAllNotifications = () => {
    storageAdapter.clearAllNotifications(currentUser.userId);
    setNotifications(groupWorkflowNotifications(storageAdapter.getNotifications()));
    showToast('Cleared notifications.');
  };

  const handleRequestDesktopPermission = async () => {
    const res = await requestBrowserNotificationPermission();
    setDesktopPermission(res);
    if (res === 'granted') {
      showToast('Browser desktop notifications enabled!');
      sendBrowserDesktopNotification({
        title: 'Barbrik Operations Portal',
        body: 'Desktop notifications are active. You will receive real-time FMS alerts.',
      });
    } else {
      showToast('Desktop notification permission declined.');
    }
  };

  const handleSelectNotification = (notif: AppNotification) => {
    // 1. Mark as read immediately
    handleMarkNotificationRead(notif.id);

    // 2. Switch tab
    if (notif.linkTab) {
      handleTabChange(notif.linkTab as NavTab);
    }

    // 3. Open entity details & focus
    if (notif.linkTab === 'fms' && notif.linkEntityId) {
      const foundFlow = flows.find(
        (f) =>
          f.id === notif.linkEntityId ||
          f.flowId === notif.linkEntityId ||
          f.indentNo === notif.linkEntityId ||
          f.poNumber === notif.linkEntityId
      );
      if (foundFlow) {
        setSelectedFmsDetail(foundFlow);
        showToast(`Opened FMS Flow: ${foundFlow.poNumber || foundFlow.flowId}`);
      }
    } else if (notif.linkTab === 'delegation' && notif.linkEntityId) {
      const foundTask = delegationTasks.find(
        (t) => t.id === notif.linkEntityId || t.taskId === notif.linkEntityId
      );
      if (foundTask) {
        setSelectedTaskForRevision(foundTask);
        showToast(`Opened Delegated Task #${foundTask.taskId}`);
      }
    } else if (notif.linkTab === 'ims') {
      showToast(`Navigated to Inventory Management (${notif.title})`);
    } else if (notif.linkTab === 'checklist') {
      showToast(`Navigated to Operational Checklists`);
    }
  };

  const handleAddProcessRemark = (
    module: 'FMS' | 'CHECKLIST' | 'DELEGATION' | 'BANKING',
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

  // Helper to map an operational assignee name or role to a specific registered UserProfile
  const resolveTargetUser = (assigneeNameOrRole?: string): UserProfile | undefined => {
    if (!assigneeNameOrRole) return undefined;
    const clean = assigneeNameOrRole.toLowerCase().trim();
    return usersList.find((u) => {
      const uName = u.name.toLowerCase();
      const uRole = (u.role || '').toLowerCase();
      const uDept = (u.departmentName || '').toLowerCase();
      return (
        clean.includes(uName) ||
        uName.includes(clean) ||
        clean.includes(uRole) ||
        uRole.includes(clean) ||
        clean.includes(uDept)
      );
    });
  };

  const handleNudgeItem = (
    module: 'FMS' | 'CHECKLIST' | 'DELEGATION' | 'BANKING',
    targetId: string,
    stageIndex?: number
  ) => {
    const nudgeTime = new Date().toLocaleString('en-GB');
    let targetAssigneeName = '';

    if (module === 'CHECKLIST') {
      const updated = checklistItems.map((chk) => {
        if (chk.id === targetId || chk.taskId === targetId) {
          targetAssigneeName = chk.name;
          return { ...chk, lastNudgeTimestamp: nudgeTime };
        }
        return chk;
      });
      setChecklistItems(updated);
      storageAdapter.saveChecklistItems(updated);
    } else if (module === 'DELEGATION') {
      const updated = delegationTasks.map((del) => {
        if (del.id === targetId || del.taskId === targetId) {
          targetAssigneeName = del.name;
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
            targetAssigneeName = stagesCopy[stgIdx].assignee || '';
            const currentCount = stagesCopy[stgIdx].nudgeCount || 0;
            stagesCopy[stgIdx] = {
              ...stagesCopy[stgIdx],
              lastNudgeTimestamp: nudgeTime,
              nudgeCount: currentCount + 1,
              lastNudgeAt: nudgeTime,
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

    // Channel 1 & Channel 2: Emit user-based Nudge notification
    const matchedUser = resolveTargetUser(targetAssigneeName);
    const targetUserId = matchedUser ? matchedUser.userId : (targetAssigneeName ? targetAssigneeName : currentUser.userId);
    const nudgeTitle = `Nudge / Expedite: ${module} #${targetId}`;
    const nudgeMessage = `${currentUser.name} (${currentUser.role}) requested expedite action on this item.`;

    storageAdapter.addNotification({
      userId: targetUserId,
      title: nudgeTitle,
      message: nudgeMessage,
      type: 'NUDGE',
      linkTab: module.toLowerCase(),
      linkEntityId: targetId,
    });
    setNotifications(storageAdapter.getNotifications());

    // Only fire browser push for the active user if it is targeted to them or if they triggered it
    if (targetUserId === currentUser.userId || isSuperAdmin) {
      sendBrowserDesktopNotification({
        title: nudgeTitle,
        body: nudgeMessage,
        onClick: () => handleTabChange(module.toLowerCase() as NavTab),
      });
    }

    showToast(`Nudge alert issued by ${currentUser.name}! Assignee notified.`);
  };

  const loadAllData = async () => {
    setFlows(storageAdapter.getFmsFlows());
    setDelegationTasks(storageAdapter.getDelegationTasks());
    setChecklistItems(storageAdapter.getChecklistItems());
    setInventoryItems(storageAdapter.getInventoryItems());
    setInventoryMovements(storageAdapter.getInventoryMovements());
    setRegistryConfig(storageAdapter.getRegistryConfig());
    setAuditLogs(storageAdapter.getAuditLogs());
    setUsersList(storageAdapter.getUsers());
    setNotifications(groupWorkflowNotifications(storageAdapter.getNotifications()));

    // Asynchronous Firestore sync
    const synced = await storageAdapter.loadFromFirestore();
    if (synced) {
      setFlows(storageAdapter.getFmsFlows());
      setDelegationTasks(storageAdapter.getDelegationTasks());
      setChecklistItems(storageAdapter.getChecklistItems());
      setInventoryItems(storageAdapter.getInventoryItems());
      setInventoryMovements(storageAdapter.getInventoryMovements());
      setUsersList(storageAdapter.getUsers());
      setNoticeBoardItems(storageAdapter.getNoticeBoard());
      setNotifications(groupWorkflowNotifications(storageAdapter.getNotifications()));
    }
  };

  useEffect(() => {
    loadAllData();
    storageAdapter.initFirestoreRealtimeSync();
    const unsubscribe = storageAdapter.subscribe(() => {
      setFlows(storageAdapter.getFmsFlows());
      setDelegationTasks(storageAdapter.getDelegationTasks());
      setChecklistItems(storageAdapter.getChecklistItems());
      setInventoryItems(storageAdapter.getInventoryItems());
      setInventoryMovements(storageAdapter.getInventoryMovements());
      setUsersList(storageAdapter.getUsers());
      setNoticeBoardItems(storageAdapter.getNoticeBoard());
      setNotifications(groupWorkflowNotifications(storageAdapter.getNotifications()));
    });
    return () => unsubscribe();
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

  // Periodic SLA Breach Evaluator (runs on interval to prevent infinite state re-render loops)
  useEffect(() => {
    const checkSlaBreaches = () => {
      const currentFlows = storageAdapter.getFmsFlows();
      if (currentFlows.length === 0) return;
      if (registryConfig.notificationSettings && !registryConfig.notificationSettings.enableSlaBreachAlerts) return;

      const now = new Date().getTime();
      let notifsAdded = false;

      currentFlows.forEach((flow) => {
        if (flow.status !== 'In Progress') return;
        const currentStage = flow.stages[flow.currentStageIndex];
        if (!currentStage || currentStage.status !== 'In Progress') return;

        const stageDefs = flow.flowType === 'CHECK_STOCK'
          ? FMS_CHECK_STOCK_STAGES
          : flow.flowType === 'PO_TO_PAYMENT' 
          ? FMS_PO_PAYMENT_STAGES 
          : flow.flowType === 'PAYMENT_TO_DISPATCH'
          ? FMS_PAYMENT_TO_DISPATCH_STAGES
          : flow.flowType === 'PURCHASE_TO_STORE_DISPATCH'
          ? FMS_PURCHASE_TO_STORE_DISPATCH_STAGES
          : flow.flowType === 'STORE_TO_SITE_DISPATCH'
          ? FMS_STORE_TO_SITE_DISPATCH_STAGES
          : flow.flowType === 'SITE_RECEIVE'
          ? FMS_SITE_RECEIVE_STAGES
          : FMS_STANDARD_PURCHASE_STAGES;

        const def = stageDefs.find((s) => s.stageId === currentStage.stageId);
        const defaultSlaHours = typeof def?.slaHours === 'number' && def.slaHours > 0 ? def.slaHours : 2;

        const slaEval = evaluateStageSlaStatus(currentStage, defaultSlaHours, now);
        if (slaEval.status === 'OK') return;

        const isOverdue = slaEval.status === 'OVERDUE';
        const notifType = isOverdue ? 'SLA_BREACH' : 'SLA_WARNING';
        const notifKey = `sla-${isOverdue ? 'overdue' : 'warning'}-${flow.flowId}-${currentStage.stageId}`;
        const freshNotifs = storageAdapter.getNotifications();
        const todayStr = new Date().toLocaleDateString('en-GB');
        const alreadyNotified = freshNotifs.some(
          (n) => n.data?.slaKey === notifKey && n.timestamp.includes(todayStr)
        );

        if (!alreadyNotified) {
          let updatedNotifs = freshNotifs;
          if (isOverdue) {
            // Clear prior warning for this stage if upgraded to overdue
            const warningKey = `sla-warning-${flow.flowId}-${currentStage.stageId}`;
            updatedNotifs = updatedNotifs.filter((n) => n.data?.slaKey !== warningKey);
          }

          const matchedUser = resolveTargetUser(currentStage.assignee);
          const targetUserId = matchedUser ? matchedUser.userId : 'ALL';
          const notifTitle = isOverdue
            ? `SLA Overdue: ${flow.poNumber || flow.indentNo} (${currentStage.stageName})`
            : `SLA Warning: ${flow.poNumber || flow.indentNo} (${currentStage.stageName})`;
          const notifMessage = isOverdue
            ? `Stage ${flow.currentStageIndex + 1} (${currentStage.stageName}) assigned to ${currentStage.assignee || 'Operations'} is strictly past planned deadline.`
            : `Stage ${flow.currentStageIndex + 1} (${currentStage.stageName}) has reached 80% of allocated SLA duration. Please expedite.`;

          const newNotif: AppNotification = {
            id: `notif-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
            userId: targetUserId,
            title: notifTitle,
            message: notifMessage,
            type: notifType,
            timestamp: new Date().toLocaleString('en-GB'),
            read: false,
            linkTab: 'fms',
            linkEntityId: flow.id,
            data: { slaKey: notifKey, flowId: flow.flowId, stageId: currentStage.stageId, stageIndex: flow.currentStageIndex }
          };

          storageAdapter.saveNotifications([newNotif, ...updatedNotifs]);
          notifsAdded = true;

          if (targetUserId === currentUser.userId || isSuperAdmin) {
            sendBrowserDesktopNotification({
              title: notifTitle,
              body: notifMessage,
              onClick: () => {
                handleTabChange('fms');
                setSelectedFmsDetail(flow);
              }
            });
          }

          if (registryConfig.notificationSettings?.webhookUrl && (registryConfig.notificationSettings.enableSlaBreachAlerts ?? true)) {
            dispatchWebhookNotification(registryConfig.notificationSettings.webhookUrl, {
              event: isOverdue ? 'FMS_SLA_BREACH' : 'FMS_SLA_WARNING',
              title: notifTitle,
              message: notifMessage,
              timestamp: new Date().toISOString(),
              entityId: flow.flowId,
              data: {
                flowId: flow.flowId,
                indentNo: flow.indentNo,
                stageName: currentStage.stageName,
                assignee: currentStage.assignee,
                plannedDateTime: currentStage.plannedDateTime,
              }
            });
          }
        }
      });

      if (notifsAdded) {
        setNotifications(groupWorkflowNotifications(storageAdapter.getNotifications()));
      }
    };

    // Run check once on mount / settings change
    checkSlaBreaches();

    // Check periodically every 60 seconds
    const interval = setInterval(checkSlaBreaches, 60000);
    return () => clearInterval(interval);
  }, [registryConfig.notificationSettings?.enableSlaBreachAlerts]);

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
    setSelectedFmsDetail(null);
    setStageActionTarget(null);

    if (tab === 'profile') {
      setActiveTab('profile');
      return;
    }
    if (tab === 'super-admin') {
      if (isSuperAdmin || isAdminOrSuperAdmin || hasModulePermission(currentUser, 'super-admin', 'view')) {
        setActiveTab('super-admin');
      }
      return;
    }
    if (!isSuperAdmin && !isAdminOrSuperAdmin && !hasModulePermission(currentUser, tab, 'view')) {
      if (hasModulePermission(currentUser, 'summary', 'view')) {
        setActiveTab('summary');
      } else if (hasModulePermission(currentUser, 'mis', 'view')) {
        setActiveTab('mis');
      } else if (hasModulePermission(currentUser, 'cs-sheet', 'view')) {
        setActiveTab('cs-sheet');
      } else {
        setActiveTab('profile');
      }
      return;
    }
    setActiveTab(tab);
  };

  // Real-time permission guard: if currentUser permissions change and current activeTab is revoked, redirect
  useEffect(() => {
    if (isSuperAdmin || isAdminOrSuperAdmin) return;
    if (activeTab === 'profile') return;
    if (activeTab === 'super-admin') {
      if (!isAdminOrSuperAdmin && !hasModulePermission(currentUser, 'super-admin', 'view')) {
        if (hasModulePermission(currentUser, 'summary', 'view')) {
          setActiveTab('summary');
        } else if (hasModulePermission(currentUser, 'mis', 'view')) {
          setActiveTab('mis');
        } else {
          setActiveTab('profile');
        }
      }
      return;
    }
    if (!hasModulePermission(currentUser, activeTab, 'view')) {
      if (hasModulePermission(currentUser, 'summary', 'view')) {
        setActiveTab('summary');
      } else if (hasModulePermission(currentUser, 'mis', 'view')) {
        setActiveTab('mis');
      } else if (hasModulePermission(currentUser, 'cs-sheet', 'view')) {
        setActiveTab('cs-sheet');
      } else {
        setActiveTab('profile');
      }
    }
  }, [currentUser.userId, currentUser.role, activeTab, isSuperAdmin, isAdminOrSuperAdmin]);

  const handleUserChange = (newUser: UserProfile) => {
    const latestUser = usersList.find((u) => u.userId === newUser.userId) || newUser;
    setCurrentUser(latestUser);
    storageAdapter.saveAuthUser(latestUser);
    setSelectedFmsDetail(null);
    setStageActionTarget(null);
    loadAllData();
    const newIsAdminOrSuper = isUserAdminOrSuperAdmin(latestUser);
    if (!newIsAdminOrSuper) {
      setViewScope('USER_ONLY');
      setPcDeskActive(false);
      setActiveTab((prev) => {
        if (prev === 'profile') return prev;
        if (prev === 'fms') return 'summary';
        if (hasModulePermission(latestUser, prev, 'view')) return prev;
        if (hasModulePermission(latestUser, 'summary', 'view')) return 'summary';
        if (hasModulePermission(latestUser, 'mis', 'view')) return 'mis';
        if (hasModulePermission(latestUser, 'delegation', 'view')) return 'delegation';
        if (hasModulePermission(latestUser, 'checklist', 'view')) return 'checklist';
        if (hasModulePermission(latestUser, 'ims', 'view')) return 'ims';
        return 'profile';
      });
      showToast(`Switched active profile to ${latestUser.name} (${latestUser.role})`);
    } else {
      const isPc = latestUser.role.toLowerCase().includes('process coordinator') || latestUser.name.toLowerCase().includes('ritu sahu');
      setPcDeskActive(isPc);
      setViewScope('ALL_ORG');
      showToast(`Switched active profile to ${latestUser.name} (${latestUser.role}) — Organization Mode Active`);
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

  const handleUpdateFlow = (updatedFlow: FmsInstance) => {
    const stored = storageAdapter.getFmsFlows();
    const exists = stored.some((f) => f.id === updatedFlow.id || f.flowId === updatedFlow.flowId);
    const updated = exists
      ? stored.map((f) => (f.id === updatedFlow.id || f.flowId === updatedFlow.flowId ? updatedFlow : f))
      : [updatedFlow, ...stored];
    setFlows(updated);
    storageAdapter.saveFmsFlows(updated);
  };

  const handleAdvanceCurrentStage = (
    flow: FmsInstance, 
    decision?: 'Yes' | 'No' | string,
    submittedData?: Record<string, any>
  ) => {
    const updatedStages = [...flow.stages];
    const currentIndex = flow.currentStageIndex;
    const currentStage = updatedStages[currentIndex];

    if (!currentStage) return;

    // Auto-Clear Notifications: When a stage is completed, automatically mark all 'Overdue' or 'Action Required' notifications for that specific stage as Read/cleared
    const currentNotifs = storageAdapter.getNotifications();
    const clearedNotifs = clearNotificationsForStage(
      currentNotifs,
      { flowId: flow.flowId, id: flow.id, indentNo: flow.indentNo, poNumber: flow.poNumber },
      { stageId: currentStage.stageId, stageIndex: currentIndex, stageName: currentStage.stageName }
    );
    if (clearedNotifs.length !== currentNotifs.length) {
      storageAdapter.saveNotifications(clearedNotifs);
    }

    const now = new Date();
    const formattedNow = now.toLocaleString('en-GB');
    currentStage.status = 'Done';
    currentStage.actualDateTime = formattedNow;
    currentStage.actualTimestamp = now.toISOString();

    if (currentStage.plannedTimestamp) {
      const diffMs = now.getTime() - new Date(currentStage.plannedTimestamp).getTime();
      const delayHrs = diffMs > 0 ? diffMs / (1000 * 3600) : 0;
      currentStage.delayHours = Math.round(delayHrs * 10) / 10;
      currentStage.timeDelayHours = currentStage.delayHours;
    } else if (currentStage.plannedDateTime) {
      try {
        const parsed = new Date(currentStage.plannedDateTime);
        if (!isNaN(parsed.getTime())) {
          const diffMs = now.getTime() - parsed.getTime();
          const delayHrs = diffMs > 0 ? diffMs / (1000 * 3600) : 0;
          currentStage.delayHours = Math.round(delayHrs * 10) / 10;
          currentStage.timeDelayHours = currentStage.delayHours;
        }
      } catch {
        // ignore invalid date strings
      }
    }

    if (decision) {
      currentStage.decisionValue = decision;
    }
    if (submittedData) {
      currentStage.submittedData = submittedData;
      if (Array.isArray(submittedData._checkpoints)) {
        currentStage.checkedCheckpoints = submittedData._checkpoints;
      }
    }

    const updatedDataPool = {
      ...(flow.instanceDataPool || {}),
      ...(submittedData || {}),
      [`stage_${currentIndex}_submittedAt`]: now.toISOString(),
      [`stage_${currentIndex}_doer`]: currentUser.name,
    };

    let nextIndex = currentIndex + 1;

    // Checkpoint branching rules:
    // 1. Custom configured conditional jump commands from Template Studio:
    if (currentStage.logic?.gatewayType === 'CONDITIONAL_JUMP') {
      const fieldId = (currentStage.logic as any).conditionFieldId;
      const dec = decision || (fieldId && currentStage.submittedData?.[fieldId]) || (currentStage.submittedData?.isAdvancePaymentRequired as string) || (currentStage.submittedData?.status === 'APPROVED' ? 'Yes' : currentStage.submittedData?.status === 'REJECTED' ? 'No' : undefined);
      const yesTarget = typeof currentStage.logic.yesTargetStageIndex === 'number'
        ? currentStage.logic.yesTargetStageIndex
        : (currentStage.logic as any).thenTargetStageIndex;
      const noTarget = typeof currentStage.logic.noTargetStageIndex === 'number'
        ? currentStage.logic.noTargetStageIndex
        : (currentStage.logic as any).elseTargetStageIndex;

      if (dec === 'Yes' && typeof yesTarget === 'number') {
        const target = yesTarget;
        if (target > currentIndex + 1) {
          for (let i = currentIndex + 1; i < target && i < updatedStages.length; i++) {
            if (updatedStages[i]) {
              updatedStages[i].status = 'Skipped';
              updatedStages[i].notes = `Skipped by conditional jump from Stage #${currentIndex + 1} ('Yes' branch)`;
            }
          }
        }
        nextIndex = target;
      } else if (dec === 'No' && typeof noTarget === 'number') {
        const target = noTarget;
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
      // Stage 2: CHECK STOCK & SPLIT - Finishes Store Manager triage and completes manual stages
      if (currentStage.stageId === 'STG-STK-02' || currentIndex === 1) {
        nextIndex = updatedStages.length; // Completes parent stages; enters Awaiting Fulfillment
      }
    } else if (flow.flowType === 'PO_TO_PAYMENT') {
      // 9-Stage Workflow Architecture for PO_TO_PAYMENT:
      // STG-PAY-01 (Receive PO & Payment Request): Assignee: Accountant
      // STG-PAY-02 (Fill Beneficiary): Assignee: Accountant
      // STG-PAY-03 (Director Beneficiary Approval): Assignee: Director
      // STG-PAY-04 (Bank Entry Beneficiary): Assignee: Accountant
      // STG-PAY-05 (Netbanking Beneficiary Confirmation): Assignee: Director (Proxy for Accountant)
      // STG-PAY-06 (Director Payment Approval): Assignee: Director
      // STG-PAY-07 (Bank Payment Entry): Assignee: Accountant
      // STG-PAY-08 (Netbanking Payment Confirmation): Assignee: Director (Proxy for Accountant) - Captures UTR & Payment Screenshot
      // STG-PAY-09 (Send Payment Details to Get Material): Assignee: Purchaser (Shyam/Vivek)
      
      const bankPayments = storageAdapter.getBankPayments();
      const targetPayment = bankPayments.find(
        (p) => (flow.paymentId && p.id === flow.paymentId) ||
               (flow.paymentSheetNo && p.sheetNo === flow.paymentSheetNo) ||
               (flow.indentNo && (p.sheetNo === flow.indentNo || p.billNoPo === flow.indentNo)) ||
               (flow.poNumber && (p.billNoPo === flow.poNumber || p.sheetNo === flow.poNumber))
      );
      const targetPaymentId = targetPayment?.id || targetPayment?.sheetNo || flow.paymentId || flow.paymentSheetNo;
      const targetBenSheetNo = targetPayment?.linkedBeneficiarySheetNo || flow.linkedBeneficiarySheetNo;

      if (currentStage.stageId === 'STG-PAY-01' || currentIndex === 0) {
        // STG-PAY-01: Receive PO & Payment Request - Accountant acknowledges the request
        // Skip Logic: If the vendor is ALREADY verified, Stages 2, 3, 4, and 5 must be marked Skipped,
        // and the flow must jump directly to Stage 6 (Director Payment Approval).
        const vendorProfiles = storageAdapter.getVendorProfiles();
        const vendorMatch = vendorProfiles.find(
          (v) =>
            v.tradeName?.toLowerCase().trim() === flow.vendorName?.toLowerCase().trim() ||
            v.legalName?.toLowerCase().trim() === flow.vendorName?.toLowerCase().trim() ||
            (targetPayment?.vendorName && v.tradeName?.toLowerCase().trim() === targetPayment.vendorName.toLowerCase().trim())
        );
        const hasVerifiedBankInMaster = Boolean(vendorMatch?.bankAccounts?.some((a) => a.verificationStatus === 'VERIFIED'));
        const isAlreadyVerified =
          flow.paymentMode === 'UPI' ||
          targetPayment?.modeOfPayment === 'UPI' ||
          targetPayment?.beneficiaryMasterStatus === 'VERIFIED' ||
          hasVerifiedBankInMaster ||
          updatedStages[1]?.status === 'Skipped';

        if (isAlreadyVerified) {
          // Mark Stages 2, 3, 4, 5 (indices 1, 2, 3, 4) as Skipped
          for (let sIdx = 1; sIdx <= 4; sIdx++) {
            if (updatedStages[sIdx]) {
              updatedStages[sIdx].status = 'Skipped';
              updatedStages[sIdx].notes = 'Auto-skipped: Vendor is already verified in Beneficiary Master';
              updatedStages[sIdx].actualDateTime = formattedNow;
              updatedStages[sIdx].actualTimestamp = now.toISOString();
            }
          }
          nextIndex = 5; // Jump directly to Stage 6 (STG-PAY-06: Director Payment Approval)
        } else {
          nextIndex = 1; // Proceed to Stage 2 (STG-PAY-02: Fill Beneficiary)
        }
      } else if (currentStage.stageId === 'STG-PAY-02' || currentIndex === 1) {
        // STG-PAY-02: Fill Beneficiary - Accountant records coordinates
        if (targetPaymentId && (submittedData?.beneficiaryName || submittedData?.accountNo)) {
          storageAdapter.addBeneficiaryDetailsToPayment(
            targetPaymentId,
            {
              beneficiaryName: String(submittedData.beneficiaryName || flow.vendorName),
              accountNo: String(submittedData.accountNo || ''),
              ifscCode: String(submittedData.ifscCode || ''),
              bankName: String(submittedData.bankName || ''),
              cancelledChequeUrl: submittedData.cancelledChequeUrl,
            },
            currentUser
          );
        }
        nextIndex = 2; // Advance to Stage 3 (STG-PAY-03: Director Beneficiary Approval)
      } else if (currentStage.stageId === 'STG-PAY-03' || currentIndex === 2) {
        // STG-PAY-03: Director Beneficiary Approval - Director checks and sanctions addition
        const isApproved = submittedData?.status !== 'REJECTED' && decision !== 'No';
        if (targetBenSheetNo) {
          storageAdapter.approveBeneficiaryRecord(targetBenSheetNo, isApproved, currentUser, submittedData?.approvalRemarks);
        }
        if (isApproved) {
          nextIndex = 3; // Advance to Stage 4 (STG-PAY-04: Bank Entry Beneficiary)
        } else {
          // Rejection returns to Stage 2 for correction
          if (updatedStages[1]) {
            updatedStages[1].status = 'In Progress';
            updatedStages[1].actualDateTime = undefined;
            updatedStages[1].actualTimestamp = undefined;
          }
          nextIndex = 1;
        }
      } else if (currentStage.stageId === 'STG-PAY-04' || currentIndex === 3) {
        // STG-PAY-04: Bank Entry Beneficiary - Accountant initiates bank portal addition & cooling period
        if (targetBenSheetNo) {
          storageAdapter.recordBeneficiaryEntry(targetBenSheetNo, 'DONE', submittedData?.bankReferenceNumber, currentUser);
        }
        nextIndex = 4; // Advance to Stage 5 (STG-PAY-05: Netbanking Beneficiary Confirmation)
      } else if (currentStage.stageId === 'STG-PAY-05' || currentIndex === 4) {
        // STG-PAY-05: Netbanking Beneficiary Confirmation - Director (Proxy for Accountant)
        if (targetBenSheetNo) {
          storageAdapter.finalizeBeneficiaryAddition(targetBenSheetNo, 'DONE', submittedData?.confirmationRemarks, currentUser);
        }
        nextIndex = 5; // Advance to Stage 6 (STG-PAY-06: Director Payment Approval)
      } else if (currentStage.stageId === 'STG-PAY-06' || currentIndex === 5) {
        // STG-PAY-06: Director Payment Approval - Director sanctions release
        const isApproved = submittedData?.status !== 'REJECTED' && decision !== 'No';
        if (targetPaymentId) {
          storageAdapter.approveBankPayment(targetPaymentId, isApproved, currentUser, submittedData?.approvalRemarks);
        }
        if (isApproved) {
          nextIndex = 6; // Advance to Stage 7 (STG-PAY-07: Bank Payment Entry)
        } else {
          nextIndex = 5; // Rejected / Paused at Stage 6
        }
      } else if (currentStage.stageId === 'STG-PAY-07' || currentIndex === 6) {
        // STG-PAY-07: Bank Payment Entry - Accountant performs portal transfer
        if (targetPaymentId) {
          storageAdapter.recordBankPaymentEntry(targetPaymentId, 'DONE', submittedData?.bankAccountDebited, currentUser);
        }
        nextIndex = 7; // Advance to Stage 8 (STG-PAY-08: Netbanking Payment Confirmation)
      } else if (currentStage.stageId === 'STG-PAY-08' || currentIndex === 7) {
        // STG-PAY-08: Netbanking Payment Confirmation - Director (Proxy for Accountant)
        // Mandatory UTR number and Payment Done Screenshot
        const utr = submittedData?.utrNumber || `UTR-${Date.now().toString().slice(-6)}`;
        const screenshotUrl = submittedData?.paymentDoneScreenshot || submittedData?.paymentDoneProof || '';
        if (targetPaymentId) {
          storageAdapter.finalizeBankPaymentSettlement(targetPaymentId, 'DONE', utr, screenshotUrl, currentUser);
        }
        updatedDataPool.utrNumber = utr;
        updatedDataPool.paymentDoneScreenshot = screenshotUrl;

        // Credit vs Advance branching logic:
        const rawTerms = String(flow.paymentTerms || targetPayment?.paymentTerms || flow.instanceDataPool?.paymentTerms || '').toUpperCase();
        const isCredit = rawTerms.includes('CREDIT');

        if (isCredit) {
          // If CREDIT: Stages 9 and 10 are SKIPPED (material was ALREADY received at Central Store before payment was released)
          for (let sIdx = 8; sIdx < updatedStages.length; sIdx++) {
            if (updatedStages[sIdx]) {
              updatedStages[sIdx].status = 'Skipped';
              updatedStages[sIdx].notes = 'Auto-skipped: Material was already collected and received at Central Store prior to payment disbursement';
              updatedStages[sIdx].actualDateTime = formattedNow;
              updatedStages[sIdx].actualTimestamp = now.toISOString();
            }
          }
          nextIndex = updatedStages.length; // Completes PO_TO_PAYMENT!
        } else {
          // ADVANCE terms: Proceed to Stage 9 (Send Payment Details to Get Material - Shyam)
          if (updatedStages[8]) {
            updatedStages[8].assignee = 'Shyam Rao Sureshe';
            updatedStages[8].whoDefaultAssignee = 'Shyam Rao Sureshe';
          }
          nextIndex = 8;
        }
      } else if (currentStage.stageId === 'STG-PAY-09' || currentIndex === 8) {
        // STG-PAY-09: Send Payment Details to Get Material - Purchaser (Shyam)
        // Shyam assigns PO to lowest workload assistant or chosen assistant
        const chosenAssistant = submittedData?.poAssignTo || updatedDataPool.poAssignTo || flow.poAssignTo || 'Rajendra';
        if (updatedStages[9]) {
          updatedStages[9].assignee = chosenAssistant;
          updatedStages[9].whoDefaultAssignee = chosenAssistant;
        }
        updatedDataPool.poAssignTo = chosenAssistant;
        nextIndex = 9; // Advance to Stage 10 (STG-PAY-10: Collect Material from Vendor)
      } else if (currentStage.stageId === 'STG-PAY-10' || currentIndex === 9) {
        // STG-PAY-10: Collect Material from Vendor - Purchaser Assistant (Rajendra/Vivek/Rajnikant)
        nextIndex = 10; // Completed all 10 stages!
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
      // INDENT_PURCHASE / INDENT_TO_PO Rules:
      const isPurchaseFlow =
        flow.flowType === 'INDENT_PURCHASE' ||
        flow.flowType === 'INDENT_TO_PO' ||
        flow.templateKey === 'INDENT_TO_PO';

      if (isPurchaseFlow) {
        // Normal Flow: After Stage 2 (Index 1: Get Quotation & Generate CS), mark Stage 3 (Index 2: Get Another Quotation) as Skipped and jump directly to Stage 4 (Index 3: Director L1 Approval)
        if (currentIndex === 1 || currentStage.stageId === 'STG-02') {
          if (updatedStages[2]) {
            updatedStages[2].status = 'Skipped';
            updatedStages[2].notes = 'Skipped in normal flow';
          }
          nextIndex = 3; // Stage 4: Director L1 Approval
        } else if (currentIndex === 2 || currentStage.stageId === 'STG-03') {
          // Rework Flow: When Brahmanand submits Stage 3 (Index 2: Get Another Quotation), jump back to Stage 4 (Index 3: Director L1 Approval)
          nextIndex = 3; // Stage 4: Director L1 Approval
        } else if (currentIndex === 3 || currentStage.stageId === 'STG-04') {
          // Stage 4 (Index 3: Director L1 Approval) -> Stage 5 (Index 4: Generate & Issue PO)
          nextIndex = 4;
        } else if (currentIndex === 4 || currentStage.stageId === 'STG-05') {
          // Stage 5 (Index 4: Generate & Issue PO) -> Stage 6 (Index 5: Send PO for Material Collection)
          // Condition: Stage 6 should ONLY trigger if PaymentTerms === 'CREDIT'.
          // If PaymentTerms === 'ADVANCE', mark this stage as Skipped, because material collection is handled by Stage 9 of PO_TO_PAYMENT workflow.
          const rawTerms = 
            submittedData?.paymentTerms || 
            flow.instanceDataPool?.paymentTerms ||
            (submittedData?.vendorPaymentTerms && Object.values(submittedData.vendorPaymentTerms)[0]) ||
            (flow.instanceDataPool?.vendorPaymentTerms && Object.values(flow.instanceDataPool.vendorPaymentTerms)[0]);
          const isCredit = String(rawTerms || '').toUpperCase().includes('CREDIT');

          if (isCredit) {
            // Trigger Stage 6 for CREDIT PO: Dynamic Workload & Delay Assignment or Shyam's Override
            const bestAssistant = getBestPurchaseAssistant(flows, delegationTasks, usersList);
            const assignedAssistant = submittedData?.poAssignTo || flow.poAssignTo || flow.instanceDataPool?.poAssignTo || bestAssistant.name;
            if (updatedStages[5]) {
              updatedStages[5].assignee = assignedAssistant;
              updatedStages[5].whoDefaultAssignee = assignedAssistant;
              updatedStages[5].status = 'In Progress';
            }
            updatedDataPool.poAssignTo = assignedAssistant;
            nextIndex = 5;
          } else {
            // ADVANCE terms: Mark Stage 6 as Skipped because material collection is handled via Stage 9 of PO_TO_PAYMENT
            if (submittedData?.poAssignTo) {
              updatedDataPool.poAssignTo = submittedData.poAssignTo;
            }
            if (updatedStages[5]) {
              updatedStages[5].status = 'Skipped';
              updatedStages[5].notes = 'Skipped: Material collection handled via Stage 9 of PO to Payment FMS flow (Advance payment)';
              updatedStages[5].actualDateTime = formattedNow;
              updatedStages[5].actualTimestamp = now.toISOString();
            }
            nextIndex = 6; // Completes INDENT_TO_PO workflow!
          }
        }
      } else {
        const isStoreAvailabilityStage = currentStage.stageId === 'STG-IND-02' || currentStage.stageName.toUpperCase().includes('AVAILABLE IN STORE');
        const isDegradedMaterialCheck = currentStage.stageName.toUpperCase().includes('DEGRADED') || (currentStage.stageId === 'STG-02' && !isStoreAvailabilityStage);

        if (isDegradedMaterialCheck && decision === 'No') {
          if (updatedStages[2]) {
            updatedStages[2].status = 'Skipped';
            updatedStages[2].notes = 'Skipped: No degraded material to return';
          }
          nextIndex = 3;
        } else if (isStoreAvailabilityStage) {
          const availChoice = (submittedData?.availabilityDecision || decision || 'PARTIAL').toString().toUpperCase();
          if (availChoice === 'ALL') {
            for (let sIdx = 2; sIdx < updatedStages.length - 1; sIdx++) {
              if (updatedStages[sIdx]) {
                updatedStages[sIdx].status = 'Skipped';
                updatedStages[sIdx].notes = 'Skipped: All items available in store inventory, direct site dispatch issued';
              }
            }
            nextIndex = updatedStages.length - 1;
            updatedDataPool.storeAvailability = 'ALL';
            updatedDataPool.availableQty = submittedData?.availableQty || 'All items available';
          } else if (availChoice === 'NONE') {
            nextIndex = currentIndex + 1;
            updatedDataPool.storeAvailability = 'NONE';
            updatedDataPool.purchaseQty = submittedData?.purchaseQty || 'All items require procurement';
          } else {
            nextIndex = currentIndex + 1;
            updatedDataPool.storeAvailability = 'PARTIAL';
            updatedDataPool.availableQty = submittedData?.availableQty || '5 items in store (Dispatched to Site)';
            updatedDataPool.purchaseQty = submittedData?.purchaseQty || '5 items sent to Purchase for Quotations';
            updatedDataPool.partialDispatchStatus = 'DISPATCHED_TO_SITE';
          }
        }

        if (currentStage.stageId === 'STG-10' && decision === 'No') {
          if (updatedStages[10]) {
            updatedStages[10].status = 'Skipped';
            updatedStages[10].notes = 'Skipped: No advance payment required';
            nextIndex = 11;
          }
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
      const sla: number = typeof updatedStages[nextIndex].slaHours === 'number' ? updatedStages[nextIndex].slaHours! : (typeof def?.slaHours === 'number' ? def.slaHours : 0);
      const workShiftConfig = storageAdapter.getRegistryConfig().workShiftConfig || DEFAULT_WORK_SHIFT_CONFIG;
      const targetDate = addWorkingSlaHours(now, sla, workShiftConfig);

      // CRITICAL (SLA Reset): Re-entering Stage 4 after Stage 3 or starting Stage 4 resets Director's SLA
      const isPurchaseFlow = flow.flowType === 'INDENT_PURCHASE' || flow.flowType === 'INDENT_TO_PO' || flow.templateKey === 'INDENT_TO_PO';
      if (nextIndex === 3 && isPurchaseFlow) {
        updatedStages[3].plannedDateTime = formatToStandardDateTime(targetDate);
        updatedStages[3].plannedTimestamp = targetDate.toISOString();
        updatedStages[3].stageStartedAt = now.toISOString();
        updatedStages[3].actualDateTime = undefined;
        updatedStages[3].actualTimestamp = undefined;
        updatedStages[3].delayHours = undefined;
        updatedStages[3].timeDelayHours = undefined;
        updatedStages[3].assignee = 'Pranjal Agrawal';
        updatedStages[3].whoDefaultAssignee = 'Pranjal Agrawal';
        updatedStages[3].whoRole = 'DIRECTOR';
      } else {
        updatedStages[nextIndex].plannedDateTime = formatToStandardDateTime(targetDate);
        updatedStages[nextIndex].plannedTimestamp = targetDate.toISOString();
        updatedStages[nextIndex].actualDateTime = undefined;
        updatedStages[nextIndex].actualTimestamp = undefined;
        updatedStages[nextIndex].delayHours = undefined;
        updatedStages[nextIndex].timeDelayHours = undefined;
        if (!updatedStages[nextIndex].stageStartedAt) {
          updatedStages[nextIndex].stageStartedAt = now.toISOString();
        }
      }
    }

    const totalDelay = updatedStages.reduce((acc, s) => acc + (s.delayHours || s.timeDelayHours || 0), 0);

    const nextAssignee = isComplete
      ? flow.poAssignTo
      : (updatedStages[nextIndex]?.assignee || updatedStages[nextIndex]?.whoDefaultAssignee || flow.poAssignTo);

    const updatedFlow: FmsInstance = {
      ...flow,
      currentStageIndex: isComplete ? Math.max(0, updatedStages.length - 1) : nextIndex,
      currentStageId: nextStageId,
      status: isComplete ? 'Completed' : 'In Progress',
      totalDelayHours: totalDelay,
      updatedAt: formattedNow,
      poAssignTo: nextAssignee,
      stages: updatedStages,
      instanceDataPool: updatedDataPool,
      ...(submittedData?.vendorName ? { vendorName: String(submittedData.vendorName) } : {}),
      ...(submittedData?.amountToBePaid ? { poAmount: parseFloat(submittedData.amountToBePaid) || flow.poAmount } : {}),
      ...(submittedData?.modeOfPayment ? { paymentMode: submittedData.modeOfPayment } : {}),
      ...(submittedData?.billNoOrPo ? { poNumber: String(submittedData.billNoOrPo) } : {}),
      ...(submittedData?.triageLineItems && Array.isArray(submittedData.triageLineItems) ? { lineItems: submittedData.triageLineItems } : {}),
      ...(submittedData?.purchaserLineItems && Array.isArray(submittedData.purchaserLineItems) ? { lineItems: submittedData.purchaserLineItems } : {}),
    };

    let updatedFlowsList = storageAdapter.syncParentChildWorkflowStatuses(
      flows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f))
    );

    // DYNAMIC SUB-WORKFLOW TRIGGER EVALUATOR (Configured via Template Studio)
    if (currentStage.subWorkflowTrigger && currentStage.subWorkflowTrigger.enabled && currentStage.subWorkflowTrigger.targetTemplateKey) {
      const trigger = currentStage.subWorkflowTrigger;
      let conditionMet = false;
      if (trigger.triggerCondition === 'ON_DECISION_YES' && decision === 'Yes') conditionMet = true;
      else if (trigger.triggerCondition === 'ON_DECISION_NO' && decision === 'No') conditionMet = true;
      else if (!trigger.triggerCondition || trigger.triggerCondition === 'ON_COMPLETE') conditionMet = true;

      if (conditionMet && trigger.targetTemplateKey) {
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
          let childStages = FMS_PO_PAYMENT_STAGES;
          if (targetType === 'CHECK_STOCK') childStages = FMS_CHECK_STOCK_STAGES;
          else if (targetType === 'INDENT_PURCHASE' || targetType === 'PURCHASE') childStages = FMS_STANDARD_PURCHASE_STAGES;
          else if (targetType === 'PURCHASE_TO_STORE_DISPATCH') childStages = FMS_PURCHASE_TO_STORE_DISPATCH_STAGES;
          else if (targetType === 'STORE_TO_SITE_DISPATCH') childStages = FMS_STORE_TO_SITE_DISPATCH_STAGES;
          else if (targetType === 'PAYMENT_TO_DISPATCH') childStages = FMS_PAYMENT_TO_DISPATCH_STAGES;
          else if (targetType === 'SITE_RECEIVE') childStages = FMS_SITE_RECEIVE_STAGES;

          // Stage 0 assignee MUST strictly be childStages[0].whoDefaultAssignee (never flow.poAssignTo or currentUser.name)
          const resolvedChildAssignee = childStages[0]?.whoDefaultAssignee || 'Operations';

          const newChildFlow: FmsInstance = {
            id: `fms-inst-${targetType.toLowerCase()}-${flow.indentNo}-${Date.now().toString().slice(-4)}`,
            flowId: `FLOW-${targetType}-${flow.indentNo}`,
            flowType: targetType,
            parentFlowId: flow.id,
            parentFlowType: flow.flowType,
            parentFlowIndentNo: flow.indentNo,
            linkedFlowId: flow.flowId,
            poNumber: targetPoNumber,
            vendorName: targetVendor,
            poAssignTo: resolvedChildAssignee,
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
              assignee: sIdx === 0 ? (childStages[0]?.whoDefaultAssignee || s.whoDefaultAssignee) : s.whoDefaultAssignee,
              whoRole: s.whoRole,
              whoDefaultAssignee: s.whoDefaultAssignee,
              how: s.howChannel,
              status: sIdx === 0 ? 'In Progress' : 'Pending',
              plannedDateTime: sIdx === 0 ? formattedNow : undefined,
              formResponseRef: s.formUrl,
            }))
          };
          updatedFlowsList = [newChildFlow, ...updatedFlowsList];
          showToast(`Linked sub-workflow (${targetType}) triggered automatically via Template Studio rule for Indent #${flow.indentNo}! Assigned to: ${resolvedChildAssignee}`);
        }
      }
    }

    // When Check Stock Stage 2 completes:
    // Split line items and auto-spawn linked Store Dispatch and/or Purchase Indent workflows!
    if (flow.flowType === 'CHECK_STOCK' && (currentStage.stageId === 'STG-STK-02' || currentIndex === 1)) {
      const submittedItems: FmsLineItem[] = Array.isArray(submittedData?.triageLineItems) 
        ? submittedData.triageLineItems 
        : (flow.lineItems || []);
      
      const storeItems = submittedItems.filter((i) => (i.storeQty || 0) > 0 || ((i.csrQty || 0) + (i.otherSiteQty || 0)) > 0);
      const purchaseItems = submittedItems.filter((i) => (i.purchaseQty || 0) > 0 || (i.purchaseQtyRequired || 0) > 0);
      const holdItems = submittedItems.filter((i) => (i.holdQty || 0) > 0 || i.triageAllocation === 'HELD_ARCHIVED');

      const generatedSubFlows: NonNullable<FmsInstance['linkedSubFlows']> = [];

      // 1. Spawn Store Material Dispatch if storeQty > 0
      if (storeItems.length > 0) {
        const storeDispatchIndentNo = `${flow.indentNo}-DISP`;
        const storedFlows = storageAdapter.getFmsFlows();
        const existingStoreFlow = updatedFlowsList.find(
          (f) => f.flowType === 'STORE_TO_SITE_DISPATCH' && (f.parentFlowId === flow.id || f.indentNo === storeDispatchIndentNo || f.indentNo === `${flow.indentNo}-DISP`)
        ) || storedFlows.find(
          (f) => f.flowType === 'STORE_TO_SITE_DISPATCH' && (f.parentFlowId === flow.id || f.indentNo === storeDispatchIndentNo || f.indentNo === `${flow.indentNo}-DISP`)
        );

        const storeLineItems: FmsLineItem[] = storeItems.map((item) => ({
          ...item,
          qty: item.storeQty || item.qty,
          requestedQty: item.requestedQty || item.qty,
        }));

        if (existingStoreFlow) {
          const updatedStoreFlow: FmsInstance = {
            ...existingStoreFlow,
            lineItems: storeLineItems,
            updatedAt: formattedNow,
          };
          updatedFlowsList = updatedFlowsList.map((f) => (f.id === existingStoreFlow.id ? updatedStoreFlow : f));
          generatedSubFlows.push({
            type: 'STORE_DISPATCH',
            id: existingStoreFlow.id,
            flowType: 'STORE_TO_SITE_DISPATCH',
            name: `Store Material Dispatch (${storeItems.length} items)`,
            indentNo: existingStoreFlow.indentNo,
            itemCount: storeItems.length,
            status: existingStoreFlow.status,
            createdAt: existingStoreFlow.createdAt,
          });
        } else {
          const newStoreFlow: FmsInstance = {
            id: `fms-inst-disp-${flow.indentNo}-${Date.now().toString().slice(-4)}`,
            flowId: `FLOW-DISP-${flow.indentNo}`,
            flowType: 'STORE_TO_SITE_DISPATCH',
            parentFlowId: flow.id,
            parentFlowType: flow.flowType,
            parentFlowIndentNo: flow.indentNo,
            indentNo: storeDispatchIndentNo,
            requisitionNumber: flow.requisitionNumber || flow.indentNo,
            indentDate: flow.indentDate || formattedNow,
            siteName: flow.siteName,
            priority: flow.priority,
            currentStageId: FMS_STORE_TO_SITE_DISPATCH_STAGES[0]?.stageId || 'STG-SSD-01',
            currentStageIndex: 0,
            totalStages: FMS_STORE_TO_SITE_DISPATCH_STAGES.length,
            status: 'In Progress',
            createdAt: formattedNow,
            updatedAt: formattedNow,
            totalDelayHours: 0,
            remarks: `Store Dispatch allocated from Stock Check #${flow.indentNo}. ${storeItems.length} items ready for immediate site dispatch.`,
            lineItems: storeLineItems,
            stages: FMS_STORE_TO_SITE_DISPATCH_STAGES.map((s, sIdx) => ({
              stageId: s.stageId,
              stageName: s.name,
              assignee: s.whoDefaultAssignee || 'Amanat Bharadwaj',
              how: s.howChannel,
              status: sIdx === 0 ? 'In Progress' : 'Pending',
              plannedDateTime: sIdx === 0 ? formattedNow : undefined,
            })),
          };
          updatedFlowsList = [newStoreFlow, ...updatedFlowsList];
          generatedSubFlows.push({
            type: 'STORE_DISPATCH',
            id: newStoreFlow.id,
            flowType: 'STORE_TO_SITE_DISPATCH',
            name: `Store Material Dispatch (${storeItems.length} items)`,
            indentNo: newStoreFlow.indentNo,
            itemCount: storeItems.length,
            status: 'In Progress',
            createdAt: formattedNow,
          });
        }
      }

      // 2. Spawn Purchase Indent if purchaseQty > 0
      if (purchaseItems.length > 0) {
        const purchaseIndentNo = `${flow.indentNo}-PUR`;
        const storedFlows = storageAdapter.getFmsFlows();
        const existingPurchaseFlow = updatedFlowsList.find(
          (f) => (f.flowType === 'INDENT_PURCHASE' || f.flowType === 'INDENT_TO_PO') && (f.parentFlowId === flow.id || f.indentNo === purchaseIndentNo || f.indentNo === flow.indentNo || f.indentNo === `${flow.indentNo}-PUR`)
        ) || storedFlows.find(
          (f) => (f.flowType === 'INDENT_PURCHASE' || f.flowType === 'INDENT_TO_PO') && (f.parentFlowId === flow.id || f.indentNo === purchaseIndentNo || f.indentNo === flow.indentNo || f.indentNo === `${flow.indentNo}-PUR`)
        );

        const purchaseLineItems: FmsLineItem[] = purchaseItems.map((item) => ({
          ...item,
          qty: item.purchaseQty || item.qty,
          requestedQty: item.requestedQty || item.qty,
        }));

        if (existingPurchaseFlow) {
          const updatedPurchaseFlow: FmsInstance = {
            ...existingPurchaseFlow,
            lineItems: purchaseLineItems,
            updatedAt: formattedNow,
          };
          updatedFlowsList = updatedFlowsList.map((f) => (f.id === existingPurchaseFlow.id ? updatedPurchaseFlow : f));
          generatedSubFlows.push({
            type: 'PURCHASE',
            id: existingPurchaseFlow.id,
            flowType: 'INDENT_PURCHASE',
            name: `Purchase Indent to PO (${purchaseItems.length} items)`,
            indentNo: existingPurchaseFlow.indentNo,
            itemCount: purchaseItems.length,
            status: existingPurchaseFlow.status,
            createdAt: existingPurchaseFlow.createdAt,
          });
        } else {
          const newPurchaseFlow: FmsInstance = {
            id: `fms-inst-ind-${flow.indentNo}-${Date.now().toString().slice(-4)}`,
            flowId: `FLOW-IND-${flow.indentNo}`,
            flowType: 'INDENT_PURCHASE',
            templateKey: 'INDENT_TO_PO',
            customTemplateId: undefined,
            parentFlowId: flow.id,
            parentFlowType: flow.flowType,
            parentFlowIndentNo: flow.indentNo,
            indentNo: purchaseIndentNo,
            requisitionNumber: flow.requisitionNumber || flow.indentNo,
            indentDate: flow.indentDate || formattedNow,
            siteName: flow.siteName,
            priority: flow.priority,
            poAssignTo: 'Brahmanand Patel',
            currentStageId: 'STG-02',
            currentStageIndex: 1,
            totalStages: FMS_STANDARD_PURCHASE_STAGES.length,
            status: 'In Progress',
            createdAt: formattedNow,
            updatedAt: formattedNow,
            totalDelayHours: 0,
            remarks: `Purchase procurement requisition allocated from Stock Check #${flow.indentNo}. ${purchaseItems.length} items requiring market RFQ and quotes.`,
            lineItems: purchaseLineItems,
            stages: FMS_STANDARD_PURCHASE_STAGES.map((s, sIdx) => ({
              stageId: s.stageId,
              stageName: s.name,
              assignee: s.whoDefaultAssignee,
              whoRole: s.whoRole,
              whoDefaultAssignee: s.whoDefaultAssignee,
              how: s.howChannel,
              status: sIdx === 0 ? 'Done' : sIdx === 1 ? 'In Progress' : 'Pending',
              plannedDateTime: sIdx <= 1 ? formattedNow : undefined,
              actualDateTime: sIdx === 0 ? formattedNow : undefined,
              notes: sIdx === 0 ? `Material requisition triaged at store and forwarded to Purchase from Stock Check #${flow.indentNo}` : undefined,
              fields: s.fields,
              logic: (s as any).logic,
              subWorkflowTrigger: (s as any).subWorkflowTrigger,
            })),
          };
          updatedFlowsList = [newPurchaseFlow, ...updatedFlowsList];

          // Emit high-priority notification to Brahmanand Patel (only if not self-assigned)
          if (!isSelfAssigned(currentUser, 'Brahmanand Patel')) {
            storageAdapter.addNotification({
              userId: 'USR-002', // Brahmanand Patel
              title: `Action Required: Purchase Indent #${purchaseIndentNo}`,
              message: `Purchase requisition triaged from Stock Check #${flow.indentNo} (${purchaseItems.length} items). Assigned to Brahmanand Patel for Stage 2: GET QUOTATION & GENERATE CS.`,
              type: 'FMS_ACTION_REQUIRED',
              linkTab: 'fms',
              linkEntityId: newPurchaseFlow.id,
              data: { flowId: newPurchaseFlow.flowId, stageIndex: 1 }
            });
          }

          generatedSubFlows.push({
            type: 'PURCHASE',
            id: newPurchaseFlow.id,
            flowType: 'INDENT_PURCHASE',
            name: `Purchase Indent to PO (${purchaseItems.length} items)`,
            indentNo: newPurchaseFlow.indentNo,
            itemCount: purchaseItems.length,
            status: 'In Progress',
            createdAt: formattedNow,
          });
        }
      }

      // Parent CHECK_STOCK status is always moved to Awaiting Fulfillment and handed off to System / Child Workflows
      updatedFlow.status = 'Awaiting Fulfillment';
      updatedFlow.poAssignTo = 'System / Child Workflows';
      if (updatedFlow.stages && updatedFlow.stages[1]) {
        updatedFlow.stages[1].assignee = 'System / Child Workflows';
        updatedFlow.stages[1].status = 'Done';
        updatedFlow.stages[1].actualTimestamp = now.toISOString();
        updatedFlow.stages[1].actualDateTime = formattedNow;
      }
      if (generatedSubFlows.length > 0) {
        updatedFlow.linkedSubFlows = generatedSubFlows;
      }
      updatedFlowsList = updatedFlowsList.map((f) => (
        f.id === updatedFlow.id 
          ? { 
              ...f, 
              status: 'Awaiting Fulfillment' as const, 
              poAssignTo: 'System / Child Workflows',
              linkedSubFlows: generatedSubFlows.length > 0 ? generatedSubFlows : f.linkedSubFlows, 
              lineItems: submittedItems,
              stages: f.stages.map((stg, sIdx) => sIdx === 1 ? { 
                ...stg, 
                assignee: 'System / Child Workflows', 
                status: 'Done' as const,
                actualTimestamp: now.toISOString(),
                actualDateTime: formattedNow
              } : stg)
            } 
          : f
      ));

      // 3. Generate 7-Day Archive Review Task for Amanat Bharadwaj if hold items exist
      if (holdItems.length > 0) {
        const targetDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
        const day = String(targetDate.getDate()).padStart(2, '0');
        const month = String(targetDate.getMonth() + 1).padStart(2, '0');
        const year = targetDate.getFullYear();
        const formattedTargetDate = `${day}/${month}/${year}`;

        const holdItemSummary = holdItems.map((i) => `${i.itemDescription} (${i.holdQty} ${i.unit || 'Nos'})`).join(', ');
        const newHoldTask: DelegationTask = {
          id: `task_hold_${Date.now()}`,
          taskId: `d_hold_${Date.now().toString().slice(-4)}`,
          name: 'Amanat Bharadwaj',
          rolePhone: 'STORE MANAGER',
          task: `Archive Review: Requisition #${flow.indentNo} - Hold Items (${holdItemSummary})`,
          firstDate: formattedTargetDate,
          latestRevision: formattedTargetDate,
          totalRevisions: 0,
          status: 'Pending',
          priority: 'Normal',
          notes: `Stock placed on hold during Stage 2 stock verification on ${new Date().toLocaleDateString('en-GB')} for Indent #${flow.indentNo} (${flow.siteName}). Action required in 7 days: verify shelf inventory, confirm site necessity, or release/archive hold.`,
        };

        const existingTasks = storageAdapter.getDelegationTasks();
        const updatedTasks = [newHoldTask, ...existingTasks];
        storageAdapter.saveDelegationTasks(updatedTasks);
        setDelegationTasks(updatedTasks);

        storageAdapter.addNotification({
          userId: 'USR-001', // Amanat Bharadwaj
          title: `Archive Review Scheduled: Indent #${flow.indentNo}`,
          message: `Archive review task scheduled for 7 days later (${formattedTargetDate}) for ${holdItems.length} hold item(s). View in Delegation dashboard.`,
          type: 'FMS_ACTION_REQUIRED',
          linkTab: 'delegation',
        });
      }

      const toastParts = [];
      if (storeItems.length > 0) toastParts.push(`Store Dispatch (${storeItems.length} items)`);
      if (purchaseItems.length > 0) toastParts.push(`Purchase Indent (${purchaseItems.length} items)`);
      if (holdItems.length > 0) toastParts.push(`${holdItems.length} on Hold (Review in 7 days)`);
      showToast(`Stock Check triage complete: ${toastParts.join(' • ')}`);
    }

    // 2. When Indent Purchase reaches "SEND FOR VENDOR QUOTATIONS" (STG-IND-03 / STG-05):
    // Automatically generate and link Comparative Statement (CS) Sheet pre-populated with requisition items!
    if (
      flow.flowType === 'INDENT_PURCHASE' &&
      (currentStage.stageId === 'STG-IND-03' || currentStage.stageId === 'STG-05' || currentStage.stageName.includes('VENDOR QUOTATIONS'))
    ) {
      const createdCs = storageAdapter.createComparativeSheetFromFms(flow, currentUser);
      updatedFlow.comparativeSheetId = createdCs.id;
      updatedFlow.linkedModuleRecord = {
        moduleType: 'COMPARATIVE_SHEET',
        recordId: createdCs.id,
        recordNumber: createdCs.indentNo,
        metadata: { site: createdCs.site, itemsCount: createdCs.items.length }
      };
      updatedFlowsList = updatedFlowsList.map((f) => (f.id === updatedFlow.id ? updatedFlow : f));
      showToast(`Comparative Statement #${createdCs.id} auto-created with ${createdCs.items.length} items for Indent #${flow.indentNo}!`);
    }

    // 3. When Director CS & L1 Approval completes (STG-08):
    // Ensure awarded vendors generate split POs and reflect in parent flow data pool
    if (
      flow.flowType === 'INDENT_PURCHASE' &&
      (currentStage.stageId === 'STG-08' || currentStage.stageName.includes('DIRECTOR CS & L1') || currentStage.stageName.includes('L1 APPROVAL'))
    ) {
      const csId = flow.comparativeSheetId || flow.linkedModuleRecord?.recordId;
      if (csId) {
        const cs = storageAdapter.getComparativeStatements().find((c) => c.id === csId);
        if (cs && cs.status === 'Approved') {
          if (!cs.generatedPoIds || cs.generatedPoIds.length === 0) {
            const splitRes = storageAdapter.createSplitPurchaseOrdersFromCs(cs, currentUser);
            updatedFlow.instanceDataPool = {
              ...(updatedFlow.instanceDataPool || {}),
              generatedPoIds: splitRes.createdFlows.map((f) => f.poNumber),
              awardedVendorMap: cs.awardedVendorMap,
            };
            updatedFlowsList = updatedFlowsList.map((f) => (f.id === updatedFlow.id ? updatedFlow : f));
            showToast(`Split POs generated from Director-approved CS #${cs.id}!`);
          }
        }
      }
    }

    // 3b. When Shyam completes Stage 4/5 (Generate PO) in INDENT_TO_PO / INDENT_PURCHASE and PaymentTerms === 'CREDIT':
    const isPoStage = (
      (flow.flowType === 'INDENT_PURCHASE' || flow.flowType === 'INDENT_TO_PO') &&
      (currentStage.stageId === 'STG-05' || currentStage.stageId === 'STG-IND-05' || currentIndex === 4 || ((currentStage.stageName || '').toLowerCase().includes('generate') && (currentStage.stageName || '').toLowerCase().includes('po')))
    );
    const flowTerms = String(submittedData?.paymentTerms || flow.paymentTerms || flow.instanceDataPool?.paymentTerms || '').toUpperCase();
    const isCreditOrder = flowTerms.includes('CREDIT') || (!flowTerms.includes('ADVANCE') && Boolean(flow.poNumber || submittedData?.poNumber));

    if (isPoStage && isCreditOrder) {
      const poNum = submittedData?.poNumber || flow.poNumber || `BPL/PO/${flow.indentNo}`;
      const venName = submittedData?.vendorName || flow.vendorName || 'Awarded Vendor';
      const amt = Number(submittedData?.poAmount || flow.poAmount || 0);

      try {
        storageAdapter.addOrUpdateCreditLedgerRecord({
          id: `credit-${flow.id || flow.flowId}`,
          poNumber: String(poNum),
          poDate: submittedData?.poDate || formattedNow.split(' ')[0],
          vendorName: String(venName),
          indentNo: flow.indentNo,
          poAmount: amt > 0 ? amt : 185000,
          status: 'AWAITING_GRN',
          linkedFlowId: flow.flowId || flow.id,
        });
        showToast(`Credit obligation recorded in Credit Ledger for PO #${poNum} (Awaiting GRN)`);
      } catch (cErr) {
        console.error('Failed to record credit ledger record:', cErr);
      }
    }

    // 4. When Indent Purchase Stage 10 approves advance payment (decision = 'Yes')
    // OR Stage 11 / STG-IND-05 completes "PO GENERATION & BANK PAYMENT":
    // Automatically link / ensure Accounts PO-to-Payment FMS exists AND create Bank Payment Record!
    if (
      flow.flowType === 'INDENT_PURCHASE' &&
      (currentStage.stageId === 'STG-IND-05' || currentStage.stageId === 'STG-11' || (currentStage.stageId === 'STG-10' && decision === 'Yes'))
    ) {
      const existingPayFlowIndex = updatedFlowsList.findIndex(
        (f) => f.linkedFlowId === flow.flowId || (f.indentNo === flow.indentNo && f.flowType === 'PO_TO_PAYMENT')
      );

      const resolvedPoNumber = submittedData?.poNumber ? String(submittedData.poNumber) : (flow.poNumber || `RAO/PO/${flow.indentNo}-001`);
      const resolvedVendor = submittedData?.vendorName ? String(submittedData.vendorName) : (flow.vendorName || 'M/S AUTHORIZED OEM VENDOR');
      const resolvedAmount = submittedData?.amountToBePaid ? (parseFloat(submittedData.amountToBePaid) || 50000) : (flow.poAmount || 50000);
      const rawMode = (submittedData?.modeOfPayment || flow.paymentMode || 'ACCOUNT').toString().toUpperCase();
      const resolvedMode = rawMode === 'UPI' ? 'UPI' : 'ACCOUNT';
      const resolvedRemarks = submittedData?.paymentRemarks || submittedData?.remarks || `Payment dossier transferred from Indent #${flow.indentNo} for Accounts disbursement`;
      const resolvedBill = submittedData?.billNoOrPo || submittedData?.poUploadLink || flow.poNumber;

      // Auto-create Bank Payment Record for Director Approval and Accounts Queue:
      try {
        const vendorProfiles = storageAdapter.getVendorProfiles();
        const matchedVendor = vendorProfiles.find(v => v.tradeName.toLowerCase() === resolvedVendor.toLowerCase());
        const hasVerifiedBank = Boolean(matchedVendor && matchedVendor.bankAccounts && matchedVendor.bankAccounts.some(b => b.verificationStatus === 'VERIFIED'));

        const newBankPayment = storageAdapter.addBankPaymentRecord({
          vendorName: resolvedVendor,
          beneficiaryName: matchedVendor?.bankAccounts?.[0]?.beneficiaryName || resolvedVendor,
          isNameMismatch: false,
          purposeOfPayment: `Advance / PO payment for Indent #${flow.indentNo} (${flow.siteName})`,
          requestedBy: currentUser.name,
          requestedByUserId: currentUser.userId,
          site: flow.siteName,
          modeOfPayment: resolvedMode,
          amountToBePaid: resolvedAmount,
          plannedDate: new Date().toLocaleDateString('en-GB'),
          billNoPo: String(resolvedBill || resolvedPoNumber),
          poUpload: submittedData?.poUploadLink || '',
          beneficiaryMasterStatus: resolvedMode === 'UPI' ? 'NOT_APPLICABLE_UPI' : (hasVerifiedBank ? 'VERIFIED' : 'NEEDS_ADDITION'),
          remark: resolvedMode === 'UPI'
            ? `UPI payment voucher with mandatory bill ref #${resolvedBill || resolvedPoNumber}`
            : `Account disbursement voucher linked to Indent #${flow.indentNo}`,
          accountNoMasked: matchedVendor?.bankAccounts?.[0]?.accountNoMasked || (matchedVendor?.bankAccounts?.[0]?.accountNo ? `••••${matchedVendor.bankAccounts[0].accountNo.slice(-4)}` : undefined),
          bankName: matchedVendor?.bankAccounts?.[0]?.bankName,
          ifscCode: matchedVendor?.bankAccounts?.[0]?.ifscCode,
        }, currentUser);

        updatedFlow.linkedModuleRecord = {
          moduleType: 'BANK_PAYMENT',
          recordId: newBankPayment.id,
          recordNumber: newBankPayment.sheetNo,
        };
        showToast(`Bank Payment Request #${newBankPayment.sheetNo} (${resolvedMode}) created for Director & Accounts queue!`);
      } catch (err) {
        console.warn('Bank payment record auto-queue skipped or error:', err);
      }

      // Refresh flow list from storageAdapter to include the newly spawned 7-stage PO_TO_PAYMENT flow
      updatedFlowsList = storageAdapter.getFmsFlows();
    }

    // Helpers to spawn standardized sub-workflows:
    const spawnPurchaseToStoreDispatch = (parentFlow: FmsInstance, reason: string) => {
      const existingPsdFlow = updatedFlowsList.find(
        (f) => f.flowType === 'PURCHASE_TO_STORE_DISPATCH' && (f.linkedFlowId === parentFlow.flowId || f.indentNo === parentFlow.indentNo)
      );
      if (!existingPsdFlow) {
        const poList = (parentFlow as any).poList || ((parentFlow as any).submittedData)?.poList || (parentFlow.instanceDataPool?.poList) || [];
        const poNum = parentFlow.poNumber || (Array.isArray(poList) && poList[0]?.poNumber) || `BPL/PO/${parentFlow.indentNo}`;
        const venName = parentFlow.vendorName || (Array.isArray(poList) && poList[0]?.vendorName) || 'Vendor';

        const newPsdFlow: FmsInstance = {
          id: `fms-inst-psd-${parentFlow.indentNo}-${Date.now().toString().slice(-4)}`,
          flowId: `FLOW-PSD-${parentFlow.indentNo}`,
          flowType: 'PURCHASE_TO_STORE_DISPATCH',
          templateKey: 'PURCHASE_TO_STORE_DISPATCH',
          linkedFlowId: parentFlow.flowId,
          parentFlowId: parentFlow.id,
          parentFlowType: parentFlow.flowType,
          parentFlowIndentNo: parentFlow.indentNo,
          requisitionNumber: parentFlow.requisitionNumber || parentFlow.indentNo,
          indentNo: parentFlow.indentNo,
          indentDate: parentFlow.indentDate || formattedNow,
          poNumber: poNum,
          vendorName: venName,
          siteName: parentFlow.siteName || 'Bijetala Site',
          priority: parentFlow.priority || 'Normal',
          paymentTerms: parentFlow.paymentTerms || parentFlow.instanceDataPool?.paymentTerms || 'CREDIT',
          currentStageId: 'STG-PSD-01',
          currentStageIndex: 0,
          totalStages: 4,
          status: 'In Progress',
          createdAt: formattedNow,
          updatedAt: formattedNow,
          totalDelayHours: 0,
          remarks: `Material collected from vendor (${reason}). Purchase to Store Dispatch initiated for Brahmanand Patel.`,
          lineItems: parentFlow.lineItems || [],
          stages: FMS_PURCHASE_TO_STORE_DISPATCH_STAGES.map((s, sIdx) => ({
            stageId: s.stageId,
            stageName: s.name,
            assignee: s.whoDefaultAssignee || 'Brahmanand Patel',
            whoRole: s.whoRole,
            whoDefaultAssignee: s.whoDefaultAssignee || 'Brahmanand Patel',
            how: s.howChannel,
            status: sIdx === 0 ? 'In Progress' : 'Pending',
            plannedDateTime: sIdx === 0 ? formattedNow : undefined,
            fields: s.fields,
          })),
        };
        updatedFlowsList = [newPsdFlow, ...updatedFlowsList];
        showToast(`Material collected! Purchase to Store Dispatch Flow created for Brahmanand Patel (Indent #${parentFlow.indentNo}).`);

        if (!isSelfAssigned(currentUser, 'Brahmanand Patel')) {
          storageAdapter.addNotification({
            userId: 'USR-002', // Brahmanand Patel
            title: `Action Required: GRN & Quality Check #${newPsdFlow.flowId}`,
            message: `Consignment arriving from ${venName} (PO #${poNum}). Physical inspection & GRN entry required.`,
            type: 'FMS_ACTION_REQUIRED',
            linkTab: 'fms',
            linkEntityId: newPsdFlow.id,
            data: { flowId: newPsdFlow.flowId, stageIndex: 0 }
          });
        }
      }
    };

    const spawnSiteReceive = (parentDispatchFlow: FmsInstance) => {
      const existingRec = updatedFlowsList.find(
        (f) => f.flowType === 'SITE_RECEIVE' && (f.parentFlowId === parentDispatchFlow.id || f.linkedFlowId === parentDispatchFlow.flowId)
      );
      if (!existingRec) {
        const siteIndentNo = `${parentDispatchFlow.indentNo}-REC`;
        const newSiteRecFlow: FmsInstance = {
          id: `fms-inst-rec-${parentDispatchFlow.indentNo}-${Date.now().toString().slice(-4)}`,
          flowId: `FLOW-REC-${parentDispatchFlow.indentNo}`,
          flowType: 'SITE_RECEIVE',
          templateKey: 'SITE_RECEIVE',
          parentFlowId: parentDispatchFlow.id,
          parentFlowType: parentDispatchFlow.flowType,
          parentFlowIndentNo: parentDispatchFlow.indentNo,
          linkedFlowId: parentDispatchFlow.flowId,
          requisitionNumber: parentDispatchFlow.requisitionNumber || parentDispatchFlow.indentNo,
          indentNo: siteIndentNo,
          indentDate: parentDispatchFlow.indentDate || formattedNow,
          poNumber: parentDispatchFlow.poNumber,
          vendorName: parentDispatchFlow.vendorName,
          siteName: parentDispatchFlow.siteName || 'Bijetala Site',
          priority: parentDispatchFlow.priority || 'Normal',
          currentStageId: 'STG-REC-01',
          currentStageIndex: 0,
          totalStages: 1,
          status: 'In Progress',
          createdAt: formattedNow,
          updatedAt: formattedNow,
          totalDelayHours: 0,
          remarks: `Site Material Receive (GRN) dispatched from ${parentDispatchFlow.flowType}. Handover to Site User / Store Incharge.`,
          lineItems: parentDispatchFlow.lineItems || [],
          stages: FMS_SITE_RECEIVE_STAGES.map((s) => ({
            stageId: s.stageId,
            stageName: s.name,
            assignee: s.whoDefaultAssignee || 'Aman Kumar',
            whoRole: s.whoRole,
            whoDefaultAssignee: s.whoDefaultAssignee || 'Aman Kumar',
            how: s.howChannel,
            status: 'In Progress',
            plannedDateTime: formattedNow,
            fields: s.fields,
          })),
        };
        updatedFlowsList = [newSiteRecFlow, ...updatedFlowsList];
        showToast(`Consignment dispatched! Site GRN Receive workflow spawned for ${parentDispatchFlow.siteName} (Assigned to Aman Kumar).`);

        if (!isSelfAssigned(currentUser, 'Aman Kumar')) {
          storageAdapter.addNotification({
            userId: 'USR-001', // Aman Kumar / Site Store
            title: `Action Required: Site GRN Receipt #${newSiteRecFlow.flowId}`,
            message: `Consignment in transit from Central Store to ${parentDispatchFlow.siteName}. Verify physical delivery and upload stamped challan.`,
            type: 'FMS_ACTION_REQUIRED',
            linkTab: 'fms',
            linkEntityId: newSiteRecFlow.id,
            data: { flowId: newSiteRecFlow.flowId, stageIndex: 0 }
          });
        }
      }
    };

    // Symmetric Collection Triggers -> PURCHASE_TO_STORE_DISPATCH:
    // (A) Indent to PO Stage 6 (Credit PO) completion -> spawn PURCHASE_TO_STORE_DISPATCH
    if (
      (flow.flowType === 'INDENT_PURCHASE' || flow.flowType === 'INDENT_TO_PO') &&
      (currentStage.stageId === 'STG-06' || currentIndex === 5)
    ) {
      spawnPurchaseToStoreDispatch(flow, 'Credit PO Collection Complete');
    }

    // (B) PO to Payment Stage 10 (Advance PO) completion -> spawn PURCHASE_TO_STORE_DISPATCH
    if (
      flow.flowType === 'PO_TO_PAYMENT' &&
      (currentStage.stageId === 'STG-PAY-10' || currentIndex === 9)
    ) {
      spawnPurchaseToStoreDispatch(flow, 'Advance Payment & Collection Complete');
    }

    // PURCHASE_TO_STORE_DISPATCH Stage 1 (GRN & Quality Check) completion:
    if (
      flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' &&
      (currentStage.stageId === 'STG-PSD-01' || currentIndex === 0)
    ) {
      // 1. Quality Check & Rejection Analysis
      const itemsList = Array.isArray(submittedData?.itemsTable) ? submittedData.itemsTable : (flow.lineItems || []);
      let totalAcceptedQty = 0;
      let totalRejectedQty = 0;
      const rejectedItemsDesc: string[] = [];

      itemsList.forEach((it: any) => {
        const acc = Number(it.accepted_qty ?? it.quantity ?? it.qty ?? 1);
        const rej = Number(it.rejected_qty ?? 0);
        totalAcceptedQty += acc;
        totalRejectedQty += rej;
        if (rej > 0) {
          rejectedItemsDesc.push(`${it.item_description || 'Item'} (${rej} damaged/rejected: ${it.rejection_reason || 'Defective'})`);
        }
      });

      // 2. Log Inventory Movement: RECEIVE to Central Store
      try {
        storageAdapter.addInventoryMovement({
          transactionId: `TXN-GRN-${Date.now().toString().slice(-6)}`,
          itemId: flow.lineItems?.[0]?.id || `ITEM-GRN-${flow.indentNo}`,
          itemName: flow.lineItems?.[0]?.itemDescription || flow.remarks || `Consignment under PO #${flow.poNumber}`,
          type: 'RECEIVE',
          quantity: totalAcceptedQty > 0 ? totalAcceptedQty : 1,
          sourceLocation: flow.vendorName || 'Vendor Consignment',
          destinationLocation: 'Central Store',
          timestamp: formattedNow,
          referenceDoc: submittedData?.grnNumber || `GRN-${flow.indentNo}`,
          initiatedBy: currentUser.name || 'Brahmanand Patel',
          notes: `Goods Received Note (GRN) verification complete at Central Store warehouse. Accepted: ${totalAcceptedQty}, Rejected: ${totalRejectedQty}.`
        });
      } catch (movErr) {
        console.error('Failed to log inventory receipt movement:', movErr);
      }

      // 3. Sync to Standalone GRN Ledger
      try {
        const grnRecord: GrnRecord = {
          id: `grn-${flow.id || flow.flowId}`,
          grnNumber: submittedData?.grnNumber || flow.instanceDataPool?.grnNumber || `BPL/GRN/2026/${flow.indentNo || Date.now().toString().slice(-4)}`,
          date: submittedData?.receivedDate || formattedNow.split(' ')[0],
          vendorName: flow.vendorName || 'Vendor Consignment',
          poNumber: flow.poNumber || `BPL/PO/${flow.indentNo}`,
          items: itemsList.map((it: any, i: number) => ({
            id: it.id || `grn-item-${i}`,
            itemDescription: it.item_description || it.itemDescription || 'Material Item',
            qty: Number(it.accepted_qty ?? it.quantity ?? it.qty ?? 1),
            unit: it.unit || 'Nos',
            acceptedQty: Number(it.accepted_qty ?? it.quantity ?? it.qty ?? 1),
            rejectedQty: Number(it.rejected_qty ?? 0),
            rejectionReason: it.rejection_reason || ''
          })),
          totalAcceptedQty,
          totalRejectedQty,
          receivedBy: currentUser.name || 'Brahmanand Patel',
          linkedFlowId: flow.flowId || flow.id,
          status: 'COMPLETED'
        };
        storageAdapter.addOrUpdateGrnRecord(grnRecord);
      } catch (grnErr) {
        console.error('Failed to sync GRN record to ledger:', grnErr);
      }

      // 4. If RejectedQty > 0, trigger a return task
      if (totalRejectedQty > 0) {
        const returnTask: DelegationTask = {
          id: `task_rej_${Date.now()}`,
          taskId: `d_rej_${Date.now().toString().slice(-4)}`,
          name: 'Brahmanand Patel',
          rolePhone: 'CENTRAL STORE MANAGER',
          task: `Return Defective Material to Vendor: PO #${flow.poNumber || flow.indentNo}`,
          firstDate: formattedNow.split(' ')[0],
          latestRevision: formattedNow.split(' ')[0],
          totalRevisions: 0,
          status: 'Pending',
          priority: 'Urgent',
          notes: `Defective / damaged items identified during GRN check for Indent #${flow.indentNo}: ${rejectedItemsDesc.join('; ')}. Contact vendor ${flow.vendorName} for replacement or credit note.`,
        };
        const allTasks = storageAdapter.getDelegationTasks();
        storageAdapter.saveDelegationTasks([returnTask, ...allTasks]);
        setDelegationTasks([returnTask, ...allTasks]);
        showToast(`Return task created for Brahmanand Patel: ${totalRejectedQty} rejected item(s).`);
      }

      // 5. If Credit PO, completing Stage 1 triggers PO_TO_PAYMENT using AcceptedQty amount
      const rawTerms = String(flow.paymentTerms || flow.instanceDataPool?.paymentTerms || '').toUpperCase();
      const isCredit = rawTerms.includes('CREDIT') || (!rawTerms.includes('ADVANCE'));

      if (isCredit) {
        const poNum = flow.poNumber || `BPL/PO/${flow.indentNo}`;
        let payableAmount = flow.poAmount || 0;
        if (totalAcceptedQty > 0 && itemsList.length > 0) {
          const totalOrdered = itemsList.reduce((acc: number, it: any) => acc + Number(it.ordered_qty || it.qty || 1), 0);
          if (totalOrdered > 0 && payableAmount > 0) {
            payableAmount = Math.round((payableAmount * totalAcceptedQty) / totalOrdered);
          }
        }

        // Update BankPaymentRecord to READY_FOR_PAYMENT
        try {
          const bankPayments = storageAdapter.getBankPayments();
          let bankPaymentsUpdated = false;
          const updatedBankPayments = bankPayments.map((p) => {
            if (
              p.approvalStatus === 'PENDING_GRN' &&
              (p.billNoPo === poNum || p.sheetNo === poNum || p.sheetNo === flow.indentNo || (flow.vendorName && p.vendorName?.toLowerCase().trim() === flow.vendorName?.toLowerCase().trim()))
            ) {
              bankPaymentsUpdated = true;
              return {
                ...p,
                amountToBePaid: payableAmount > 0 ? payableAmount : p.amountToBePaid,
                approvalStatus: 'READY_FOR_PAYMENT' as const,
                remarks: `GRN Completed on ${formattedNow} (Accepted Qty: ${totalAcceptedQty}) - Ready for Payment Sanction`,
              };
            }
            return p;
          });
          if (bankPaymentsUpdated) {
            storageAdapter.saveBankPayments(updatedBankPayments);
          }
        } catch (bpErr) {
          console.error('Failed to update bank payment to READY_FOR_PAYMENT:', bpErr);
        }

        // Update Credit Ledger record to GRN_COMPLETED
        try {
          const creditRecords = storageAdapter.getCreditLedgerRecords();
          const matchedCredit = creditRecords.find(
            (c) => c.linkedFlowId === flow.flowId || c.linkedFlowId === flow.parentFlowId || c.indentNo === flow.indentNo || (flow.poNumber && c.poNumber === flow.poNumber)
          );
          if (matchedCredit) {
            storageAdapter.addOrUpdateCreditLedgerRecord({
              ...matchedCredit,
              status: 'GRN_COMPLETED',
            });
          }
        } catch (cErr) {
          console.error('Failed to update Credit Ledger to GRN_COMPLETED:', cErr);
        }

        // Spawn PO_TO_PAYMENT for Accounts if not already created
        const existingPayFlow = updatedFlowsList.find(
          (f) => f.flowType === 'PO_TO_PAYMENT' && (f.linkedFlowId === flow.flowId || f.indentNo === flow.indentNo)
        );

        if (!existingPayFlow) {
          const initialPayStages = FMS_PO_PAYMENT_STAGES.map((stg, idx) => ({
            stageId: stg.stageId,
            stageName: stg.name,
            whoRole: stg.whoRole,
            whoDefaultAssignee: stg.whoDefaultAssignee,
            assignee: stg.whoDefaultAssignee || 'Priyanka Agrawal',
            how: stg.howChannel || 'IN-APP',
            status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
            plannedDateTime: formattedNow,
            fields: stg.fields,
          }));

          const newPayFlow: FmsInstance = {
            id: `fms-inst-pay-${flow.indentNo}-${Date.now().toString().slice(-4)}`,
            flowId: `FLOW-PAY-${poNum.replace(/[^a-zA-Z0-9]/g, '-')}`,
            flowType: 'PO_TO_PAYMENT',
            templateKey: 'PO_TO_PAYMENT',
            linkedFlowId: flow.flowId,
            parentFlowId: flow.id,
            parentFlowType: flow.flowType,
            parentFlowIndentNo: flow.indentNo,
            poNumber: poNum,
            vendorName: flow.vendorName || 'Awarded Vendor',
            poAmount: payableAmount,
            poAssignTo: 'Priyanka Agrawal',
            indentNo: flow.indentNo,
            siteName: flow.siteName,
            paymentTerms: 'CREDIT',
            createdAt: formattedNow,
            updatedAt: formattedNow,
            currentStageIndex: 0,
            currentStageId: initialPayStages[0]?.stageId || 'STG-PAY-01',
            totalStages: 10,
            stages: initialPayStages,
            status: 'In Progress',
            priority: 'Urgent',
            totalDelayHours: 0,
            remarks: `GRN Completed at Central Store. Credit purchase payment disbursement initiated for accepted goods (₹${payableAmount}).`
          };

          updatedFlowsList = [newPayFlow, ...updatedFlowsList];

          // Update Credit Ledger to PAYMENT_INITIATED
          try {
            const creditRecords = storageAdapter.getCreditLedgerRecords();
            const matchedCredit = creditRecords.find(
              (c) => c.linkedFlowId === flow.flowId || c.linkedFlowId === flow.parentFlowId || c.indentNo === flow.indentNo || (flow.poNumber && c.poNumber === flow.poNumber)
            );
            if (matchedCredit) {
              storageAdapter.addOrUpdateCreditLedgerRecord({
                ...matchedCredit,
                status: 'PAYMENT_INITIATED',
              });
            } else {
              storageAdapter.addOrUpdateCreditLedgerRecord({
                id: `credit-${flow.id || flow.flowId}`,
                poNumber: poNum,
                poDate: flow.indentDate || formattedNow.split(' ')[0],
                vendorName: flow.vendorName || 'Awarded Vendor',
                indentNo: flow.indentNo,
                poAmount: payableAmount > 0 ? payableAmount : (flow.poAmount || 0),
                status: 'PAYMENT_INITIATED',
                linkedFlowId: flow.flowId || flow.id,
              });
            }
          } catch (cErr) {
            console.error('Failed to update Credit Ledger to PAYMENT_INITIATED:', cErr);
          }

          showToast(`GRN Verification Completed! Credit Payment Requisition spawned in Accounts Inbox for ₹${payableAmount}.`);
        }
      }
    }

    // STN Preparation Stage Completion: Sync to STN Ledger
    if (
      (flow.flowType === 'STORE_TO_SITE_DISPATCH' && (currentStage.stageId === 'STG-SSD-02' || currentIndex === 1 || (currentStage.stageName || '').toLowerCase().includes('prepare stn'))) ||
      (flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' && (currentStage.stageId === 'STG-PSD-03' || currentIndex === 2 || (currentStage.stageName || '').toLowerCase().includes('prepare stn')))
    ) {
      try {
        const rawItems = Array.isArray(submittedData?.stnItemsTable)
          ? submittedData.stnItemsTable
          : (flow.lineItems || []);

        let sumQty = 0;
        const mappedItems: FmsLineItem[] = rawItems.map((it: any, idx: number) => {
          const q = Number(it.quantity || it.qty || it.accepted_qty || 1);
          sumQty += q;
          return {
            id: it.id || `stn-item-${idx}`,
            itemDescription: it.item_description || it.itemDescription || 'Material Item',
            qty: q,
            unit: it.unit || 'Nos'
          };
        });

        const stnRecord: StnRecord = {
          id: `stn-${flow.id || flow.flowId}`,
          stnNumber: submittedData?.stnNumber || flow.instanceDataPool?.stnNumber || `BPL/STN/2026/${flow.indentNo || Date.now().toString().slice(-4)}`,
          date: submittedData?.stnDate || formattedNow.split(' ')[0],
          sourceLocation: 'Central Store',
          destinationLocation: flow.siteName || 'Project Site',
          items: mappedItems.length > 0 ? mappedItems : (flow.lineItems || []),
          totalQty: sumQty > 0 ? sumQty : (flow.lineItems || []).reduce((acc, it) => acc + (Number(it.qty) || 1), 0),
          dispatchedBy: currentUser.name || 'Store Manager',
          linkedFlowId: flow.flowId || flow.id,
          status: 'DISPATCHED'
        };
        storageAdapter.addOrUpdateStnRecord(stnRecord);
      } catch (stnErr) {
        console.error('Failed to sync STN record to ledger:', stnErr);
      }
    }

    // Outbound Dispatch -> Transfer Inventory & Spawn Standalone SITE_RECEIVE:
    // (A) PURCHASE_TO_STORE_DISPATCH Stage 4 (Dispatch) completion:
    if (
      flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' &&
      (currentStage.stageId === 'STG-PSD-04' || currentIndex === 3)
    ) {
      // 1. Log Inventory Movement: TRANSFER to target site
      try {
        storageAdapter.addInventoryMovement({
          transactionId: `TXN-TRF-${Date.now().toString().slice(-6)}`,
          itemId: flow.lineItems?.[0]?.id || `ITEM-TRF-${flow.indentNo}`,
          itemName: flow.lineItems?.[0]?.itemDescription || flow.remarks || `Consignment Transfer to ${flow.siteName}`,
          type: 'TRANSFER',
          quantity: Number(flow.lineItems?.[0]?.qty || 1),
          sourceLocation: 'Central Store',
          destinationLocation: flow.siteName || 'Project Site',
          timestamp: formattedNow,
          referenceDoc: submittedData?.stnNumber || flow.instanceDataPool?.stnNumber || `STN-${flow.indentNo}`,
          initiatedBy: currentUser.name || 'Brahmanand Patel',
          notes: `Central Store dispatched to ${flow.siteName} with Gate Pass #${submittedData?.gatePassNumber || 'GP'}.`
        });
      } catch (trfErr) {
        console.error('Failed to log inventory transfer movement:', trfErr);
      }

      // 2. Spawn Standalone SITE_RECEIVE
      spawnSiteReceive(flow);
    }

    // (B) STORE_TO_SITE_DISPATCH Stage 4 (Dispatch) completion:
    if (
      flow.flowType === 'STORE_TO_SITE_DISPATCH' &&
      (currentStage.stageId === 'STG-SSD-04' || currentIndex === 3)
    ) {
      // 1. Log Inventory Movement: TRANSFER to target site
      try {
        storageAdapter.addInventoryMovement({
          transactionId: `TXN-TRF-${Date.now().toString().slice(-6)}`,
          itemId: flow.lineItems?.[0]?.id || `ITEM-TRF-${flow.indentNo}`,
          itemName: flow.lineItems?.[0]?.itemDescription || flow.remarks || `Store Material Issue to ${flow.siteName}`,
          type: 'TRANSFER',
          quantity: Number(flow.lineItems?.[0]?.qty || 1),
          sourceLocation: 'Central Store',
          destinationLocation: flow.siteName || 'Project Site',
          timestamp: formattedNow,
          referenceDoc: submittedData?.stnNumber || flow.instanceDataPool?.stnNumber || `STN-${flow.indentNo}`,
          initiatedBy: currentUser.name || 'Amanat Bharadwaj',
          notes: `Store warehouse issue dispatched to ${flow.siteName} with Gate Pass.`
        });
      } catch (trfErr) {
        console.error('Failed to log inventory transfer movement:', trfErr);
      }

      // 2. Spawn Standalone SITE_RECEIVE
      spawnSiteReceive(flow);
    }

    setFlows(updatedFlowsList);
    storageAdapter.saveFmsFlows(updatedFlowsList);
    if (selectedFmsDetail && (selectedFmsDetail.id === updatedFlow.id || selectedFmsDetail.flowId === updatedFlow.flowId)) {
      setSelectedFmsDetail(updatedFlow);
    }
    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module: 'FMS',
      action: 'STAGE_ADVANCE',
      entityId: updatedFlow.flowId,
      details: `Advanced stage ${currentStage.stageName}. Decision: ${currentStage.decisionValue || 'Done'}`
    });
    setAuditLogs(storageAdapter.getAuditLogs());

    // Channel 1 & Channel 2: Emit in-app and desktop notifications
    const nextStage = !isComplete ? updatedFlow.stages[nextIndex] : null;
    const targetAssignee = nextStage?.assignee || nextStage?.whoDefaultAssignee;
    const targetUser = usersList.find((u) => u.name === targetAssignee);
    const notifTargetUserId = targetUser ? targetUser.userId : 'ALL';

    const notifTitle = isComplete
      ? `FMS Completed: ${updatedFlow.poNumber || updatedFlow.indentNo}`
      : `Action Required: Stage ${nextIndex + 1} (${nextStage?.stageName})`;
    const notifMessage = isComplete
      ? `Flow ${updatedFlow.flowId} has completed all operational stages.`
      : `${currentUser.name} advanced stage. Assigned to ${targetAssignee || 'Operations'}.`;

    if (!isComplete && nextStage) {
      // Stop 'Self-Assignment' Spam: If user completes a stage and next stage is assigned to themselves, do NOT send Action Required
      const isSelf = isSelfAssigned(currentUser, targetAssignee, targetUser);
      if (!isSelf) {
        storageAdapter.addNotification({
          userId: notifTargetUserId,
          title: notifTitle,
          message: notifMessage,
          type: 'FMS_ACTION_REQUIRED',
          linkTab: 'fms',
          linkEntityId: updatedFlow.id,
          data: { flowId: updatedFlow.flowId, stageIndex: nextIndex, stageId: nextStage.stageId }
        });

        // Desktop push notification (only sent if not self-assigned and recipient is targeted)
        if (notifTargetUserId === currentUser.userId || isSuperAdmin) {
          sendBrowserDesktopNotification({
            title: notifTitle,
            body: notifMessage,
            onClick: () => {
              handleTabChange('fms');
              setSelectedFmsDetail(updatedFlow);
            }
          });
        }
      }
    } else if (isComplete) {
      storageAdapter.addNotification({
        userId: notifTargetUserId,
        title: notifTitle,
        message: notifMessage,
        type: 'STAGE_ADVANCED',
        linkTab: 'fms',
        linkEntityId: updatedFlow.id,
        data: { flowId: updatedFlow.flowId, stageIndex: nextIndex }
      });

      if (notifTargetUserId === currentUser.userId || isSuperAdmin) {
        sendBrowserDesktopNotification({
          title: notifTitle,
          body: notifMessage,
          onClick: () => {
            handleTabChange('fms');
            setSelectedFmsDetail(updatedFlow);
          }
        });
      }
    }

    setNotifications(groupWorkflowNotifications(storageAdapter.getNotifications()));

    // Webhook dispatch if configured
    if (registryConfig.notificationSettings?.webhookUrl && (registryConfig.notificationSettings.enableFmsAlerts ?? true)) {
      dispatchWebhookNotification(registryConfig.notificationSettings.webhookUrl, {
        event: isComplete ? 'FMS_FLOW_COMPLETED' : 'FMS_STAGE_ADVANCED',
        title: notifTitle,
        message: notifMessage,
        timestamp: new Date().toISOString(),
        entityId: updatedFlow.flowId,
        data: {
          flowId: updatedFlow.flowId,
          indentNo: updatedFlow.indentNo,
          poNumber: updatedFlow.poNumber,
          stageIndex: nextIndex,
          assignee: targetAssignee,
        }
      });
    }

    showToast(`FMS #${updatedFlow.poNumber || updatedFlow.indentNo} advanced to stage: ${updatedFlow.stages[updatedFlow.currentStageIndex]?.stageName || 'Completed'}`);
  };

  const handleCompleteFmsStage = (
    flow: FmsInstance, 
    stageIndex: number, 
    decision?: 'Yes' | 'No' | string,
    submittedData?: Record<string, any>
  ) => {
    // FMS stages are strictly sequential: can ONLY action the active stage in an in-progress flow!
    if (flow.status !== 'In Progress' || stageIndex !== flow.currentStageIndex) {
      showToast(`Stage ${stageIndex + 1} cannot be actioned out of sequence. Active stage is Stage ${flow.currentStageIndex + 1}.`);
      return;
    }
    handleAdvanceCurrentStage(flow, decision, submittedData);
  };

  const handleDeleteFlow = (flowId: string) => {
    const canDelete = isSuperAdmin || isUserAdminOrSuperAdmin(currentUser) || getUserModulePermission(currentUser, 'fms').canDelete;
    if (!canDelete) {
      showToast('Permission denied. Admin or Super Admin permission required to delete FMS records.');
      return;
    }
    const targetFlow = flows.find((f) => f.id === flowId || f.flowId === flowId);
    const idToDelete = targetFlow ? targetFlow.id : flowId;
    const codeToDelete = targetFlow ? targetFlow.flowId : flowId;

    storageAdapter.deleteFmsFlow(idToDelete, currentUser);
    if (codeToDelete && codeToDelete !== idToDelete) {
      storageAdapter.deleteFmsFlow(codeToDelete, currentUser);
    }

    const updated = flows.filter((f) => f.id !== idToDelete && f.flowId !== codeToDelete);
    setFlows(updated);
    setAuditLogs(storageAdapter.getAuditLogs());

    if (selectedFmsDetail && (selectedFmsDetail.id === idToDelete || selectedFmsDetail.flowId === codeToDelete)) {
      setSelectedFmsDetail(null);
    }
    showToast(`FMS Record ${codeToDelete || idToDelete} deleted successfully.`);
  };

  const handleDeleteTemplate = (templateKey: string) => {
    if (!isSuperAdmin) {
      showToast('Permission denied. Only Super Admin can delete workflow templates.');
      return;
    }
    storageAdapter.deleteFmsTemplate(templateKey, currentUser);
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`FMS Workflow Template (${templateKey}) deleted by Super Admin.`);
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

    // Trigger Notification & Desktop push for Delegation Assignee
    const assignedUser = usersList.find((u) => u.name === newTask.name);
    const targetUserId = assignedUser ? assignedUser.userId : 'ALL';
    const notifTitle = `New Task Delegated: #${newTask.taskId}`;
    const notifMessage = `${currentUser.name} delegated: "${newTask.task}" to ${newTask.name} (Due: ${newTask.firstDate})`;

    storageAdapter.addNotification({
      userId: targetUserId,
      title: notifTitle,
      message: notifMessage,
      type: 'DELEGATION',
      linkTab: 'delegation',
      linkEntityId: newTask.id,
    });
    setNotifications(storageAdapter.getNotifications());

    sendBrowserDesktopNotification({
      title: notifTitle,
      body: notifMessage,
      onClick: () => handleTabChange('delegation'),
    });

    if (registryConfig.notificationSettings?.webhookUrl && (registryConfig.notificationSettings.enableDelegationAlerts ?? true)) {
      dispatchWebhookNotification(registryConfig.notificationSettings.webhookUrl, {
        event: 'DELEGATION_TASK_CREATED',
        title: notifTitle,
        message: notifMessage,
        timestamp: new Date().toISOString(),
        entityId: newTask.taskId,
        data: newTask,
      });
    }

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

    if (updatedTask.status === 'Completed') {
      const notifTitle = `Task Completed: #${updatedTask.taskId}`;
      const notifMessage = `${updatedTask.name} marked task "${updatedTask.task}" as Completed.`;
      storageAdapter.addNotification({
        userId: 'ALL',
        title: notifTitle,
        message: notifMessage,
        type: 'DELEGATION',
        linkTab: 'delegation',
        linkEntityId: updatedTask.id,
      });
      setNotifications(storageAdapter.getNotifications());

      if (registryConfig.notificationSettings?.webhookUrl && (registryConfig.notificationSettings.enableDelegationAlerts ?? true)) {
        dispatchWebhookNotification(registryConfig.notificationSettings.webhookUrl, {
          event: 'DELEGATION_TASK_COMPLETED',
          title: notifTitle,
          message: notifMessage,
          timestamp: new Date().toISOString(),
          entityId: updatedTask.taskId,
          data: updatedTask,
        });
      }
    }

    showToast(`Task #${updatedTask.taskId} updated successfully.`);
  };

  const handleDeleteDelegationTask = (taskId: string) => {
    const canDelete = isSuperAdmin || isUserAdminOrSuperAdmin(currentUser) || getUserModulePermission(currentUser, 'delegation').canDelete;
    if (!canDelete) {
      showToast('Permission denied. Admin or Super Admin permission required to delete delegation tasks.');
      return;
    }
    storageAdapter.deleteDelegationTask(taskId, currentUser);
    const updated = delegationTasks.filter((t) => t.id !== taskId && t.taskId !== taskId);
    setDelegationTasks(updated);
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`Delegation task #${taskId} permanently deleted.`);
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

  const handleDeleteChecklistItem = (id: string) => {
    const canDelete = isSuperAdmin || isUserAdminOrSuperAdmin(currentUser) || getUserModulePermission(currentUser, 'checklist').canDelete;
    if (!canDelete) {
      showToast('Permission denied. Admin or Super Admin permission required to delete checklist items.');
      return;
    }
    storageAdapter.deleteChecklistItem(id, currentUser);
    const updated = checklistItems.filter((i) => i.id !== id && i.taskId !== id);
    setChecklistItems(updated);
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(`Checklist item permanently deleted.`);
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
    const { isNew } = storageAdapter.saveInventoryItem(updatedItem);
    const updatedList = storageAdapter.getInventoryItems();
    setInventoryItems(updatedList);
    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module: 'IMS',
      action: isNew ? 'CREATE' : 'UPDATE',
      entityId: updatedItem.itemId,
      details: `${isNew ? 'Registered new item' : 'Updated item'} ${updatedItem.itemId} (${updatedItem.name}) in Master Catalog`,
    });
    setAuditLogs(storageAdapter.getAuditLogs());
    showToast(isNew ? 'Item Created Successfully' : `Inventory item ${updatedItem.itemId} updated.`);
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

    // Low Stock Alert Trigger: Check if updated stock is at or below threshold
    const affectedItem = updatedItems.find((i) => i.itemId === movement.itemId);
    if (affectedItem && affectedItem.currentStock <= affectedItem.minThreshold) {
      const notifTitle = `Low Stock Alert: ${affectedItem.name}`;
      const notifMessage = `Stock reached ${affectedItem.currentStock} ${affectedItem.unit} (Min Threshold: ${affectedItem.minThreshold}) at ${affectedItem.location}. Immediate replenishment required.`;

      // Find store manager or purchase officer for stock alert
      const storeUser = usersList.find((u) => 
        (u.departmentName || '').toUpperCase().includes('STORE') ||
        (u.role || '').toUpperCase().includes('STORE') ||
        (u.role || '').toUpperCase().includes('PURCHASE')
      );
      const stockTargetUserId = storeUser ? storeUser.userId : currentUser.userId;

      storageAdapter.addNotification({
        userId: stockTargetUserId,
        title: notifTitle,
        message: notifMessage,
        type: 'STOCK_ALERT',
        linkTab: 'ims',
        linkEntityId: affectedItem.id,
      });
      setNotifications(storageAdapter.getNotifications());

      if (stockTargetUserId === currentUser.userId || isSuperAdmin) {
        sendBrowserDesktopNotification({
          title: notifTitle,
          body: notifMessage,
          onClick: () => handleTabChange('ims'),
        });
      }

      if (registryConfig.notificationSettings?.webhookUrl && (registryConfig.notificationSettings.enableStockAlerts ?? true)) {
        dispatchWebhookNotification(registryConfig.notificationSettings.webhookUrl, {
          event: 'LOW_STOCK_BREACH',
          title: notifTitle,
          message: notifMessage,
          timestamp: new Date().toISOString(),
          entityId: affectedItem.itemId,
          data: affectedItem,
        });
      }
    }

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
          const freshUser = usersList.find((usr) => usr.userId === u.userId) || u;
          storageAdapter.saveAuthUser(freshUser);
          setCurrentUser(freshUser);
          setIsAuthenticated(true);
          setViewScope(isUserAdminOrSuperAdmin(freshUser) ? 'ALL_ORG' : 'USER_ONLY');
          setSelectedFmsDetail(null);
          setStageActionTarget(null);
          loadAllData();
          showToast(`Welcome back, ${freshUser.name}!`);
        }}
        noticeItems={noticeBoardItems}
        usersList={usersList}
      />
    );
  }

  return (
    <div className="h-screen max-h-screen bg-white flex flex-col font-sans text-slate-900 antialiased overflow-hidden">
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
        usersList={usersList}
        impersonatorAdmin={impersonatorAdmin}
        onExitImpersonation={handleExitImpersonation}
        onUserChange={(newUser) => {
          handleUserChange(newUser);
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
        viewScope={isAdminOrSuperAdmin ? viewScope : 'USER_ONLY'}
        onToggleScope={handleToggleScope}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        pcDeskActive={isAdminOrSuperAdmin ? pcDeskActive : false}
        onTogglePcDesk={isAdminOrSuperAdmin ? () => {
          const next = !pcDeskActive;
          setPcDeskActive(next);
          showToast(next ? "PC Desk Mode Enabled" : "PC Desk Mode Disabled");
        } : undefined}
        onOpenMobileMenu={() => setIsMobileDrawerOpen(true)}
        onOpenMyProfile={() => handleTabChange('profile')}
        onOpenSuperAdmin={isAdminOrSuperAdmin ? () => handleTabChange('super-admin') : undefined}
        onLogout={handleLogout}
        onOpenGlobalSearch={() => setIsGlobalSearchOpen(true)}
        notifications={notifications.filter((n) => {
          if (isAdminOrSuperAdmin && viewScope === 'ALL_ORG') return true;
          return (
            n.userId === currentUser.userId ||
            n.userId === currentUser.name ||
            n.targetUserName === currentUser.name ||
            n.userId === 'ALL'
          );
        })}
        onMarkNotificationRead={handleMarkNotificationRead}
        onMarkAllNotificationsRead={handleMarkAllNotificationsRead}
        onClearAllNotifications={handleClearAllNotifications}
        onSelectNotification={handleSelectNotification}
        desktopPermission={desktopPermission}
        onRequestDesktopPermission={handleRequestDesktopPermission}
      />

      {/* Impersonation Active Banner */}
      {impersonatorAdmin && (
        <div className="bg-amber-400 text-slate-950 px-4 py-1.5 flex items-center justify-between text-xs font-bold shrink-0 border-b border-amber-500 shadow-2xs z-30">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-slate-950 animate-pulse shrink-0" />
            <span className="truncate">
              Viewing as: <strong className="underline">{currentUser.name}</strong> ({currentUser.role}). Module visibility and access are scoped to this user.
            </span>
          </div>
          <button
            type="button"
            onClick={handleExitImpersonation}
            className="px-2.5 py-1 bg-slate-950 hover:bg-slate-800 text-white rounded-md text-[11px] font-extrabold transition-colors cursor-pointer shrink-0 ml-2"
          >
            Exit View As (Return to {impersonatorAdmin.name})
          </button>
        </div>
      )}

      <div className="flex-1 flex overflow-hidden min-h-0">
        {/* Sidebar */}
        <Sidebar
          activeTab={activeTab}
          onTabChange={(tab) => {
            handleTabChange(tab);
          }}
          badgeCounts={badgeCounts}
          isOpen={isSidebarOpen}
          flows={flows}
          checklistItems={checklistItems}
          delegationTasks={delegationTasks}
          usersList={usersList}
          selectedDepartment={
            activeTab === 'fms' ? selectedFmsDepartment :
            activeTab === 'checklist' ? selectedChecklistDepartment :
            activeTab === 'delegation' ? selectedDelegationDepartment : null
          }
          selectedWorkflowKey={selectedFmsWorkflowKey}
          onSelectDepartmentFms={(deptKey) => {
            handleTabChange('fms');
            setSelectedFmsDepartment(deptKey);
            setSelectedFmsWorkflowKey(null);
          }}
          onSelectWorkflowFms={(deptKey, flowKey) => {
            handleTabChange('fms');
            setSelectedFmsDepartment(deptKey);
            setSelectedFmsWorkflowKey(flowKey);
          }}
          onSelectDepartmentChecklist={(deptKey) => {
            handleTabChange('checklist');
            setSelectedChecklistDepartment(deptKey);
          }}
          onSelectDepartmentDelegation={(deptKey) => {
            handleTabChange('delegation');
            setSelectedDelegationDepartment(deptKey);
          }}
          currentUser={currentUser}
          onOpenMyProfile={() => handleTabChange('profile')}
        />

        {/* Main Content Area */}
        <main className="flex-1 overflow-y-auto min-h-0 p-3 sm:p-5 pb-28 md:pb-6 bg-white">
          <div className={selectedFmsDetail || activeTab === 'summary' ? "w-full" : "max-w-7xl mx-auto w-full"}>
            {selectedFmsDetail ? (
              <FmsDetailModal
                flow={selectedFmsDetail}
                currentUser={currentUser}
                onClose={() => setSelectedFmsDetail(null)}
                onUpdateFlow={handleUpdateFlow}
                onDeleteFlow={handleDeleteFlow}
                allFlows={flows}
                onSelectFlow={(f) => setSelectedFmsDetail(f)}
                onOpenStageAction={(f, sIdx) => setStageActionTarget({ flow: f, stageIndex: sIdx })}
              />
            ) : (
              <>
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
                    pcDeskActive={isAdminOrSuperAdmin ? pcDeskActive : false}
                    onTogglePcDesk={isAdminOrSuperAdmin ? (active) => setPcDeskActive(active) : undefined}
                    onOpenStageAction={(flow, stageIndex) => setStageActionTarget({ flow, stageIndex })}
                    onCreateFmsFlow={(isSuperAdmin || hasModulePermission(currentUser, 'summary', 'edit')) ? () => setIsCreateFmsOpen(true) : undefined}
                  />
                )}

                {activeTab === 'site-requisitions' && (
                  <SiteRequisitionTracker
                    currentUser={currentUser}
                    flows={flows}
                  />
                )}

            {activeTab === 'mis' && (isSuperAdmin || hasModulePermission(currentUser, 'mis', 'view')) && (
              <MisDashboard
                flows={flows}
                delegationTasks={delegationTasks}
                checklistItems={checklistItems}
                inventoryItems={inventoryItems}
                currentUser={currentUser}
                viewScope={isAdminOrSuperAdmin ? viewScope : 'USER_ONLY'}
                onToggleScope={handleToggleScope}
                onNavigateTab={(tab) => handleTabChange(tab)}
                usersList={usersList}
              />
            )}

            {activeTab === 'fms' && (isSuperAdmin || hasModulePermission(currentUser, 'fms', 'view')) && (
              <FmsPipeline
                flows={flows}
                currentUser={currentUser}
                viewScope={isAdminOrSuperAdmin ? viewScope : 'USER_ONLY'}
                onToggleScope={handleToggleScope}
                onUpdateFlow={handleUpdateFlow}
                onDeleteFlow={handleDeleteFlow}
                onCreateFlow={(isSuperAdmin || hasModulePermission(currentUser, 'fms', 'edit')) ? () => setIsCreateFmsOpen(true) : undefined}
                onSelectFlow={(f) => setSelectedFmsDetail(f)}
                onOpenTemplateStudio={(isSuperAdmin || hasModulePermission(currentUser, 'fms', 'edit')) ? (key) => {
                  setTemplateStudioKey(key || null);
                  setIsTemplateStudioOpen(true);
                } : undefined}
                onOpenStageAction={(flow, stageIndex) => setStageActionTarget({ flow, stageIndex })}
                selectedDepartmentFilter={selectedFmsDepartment}
                onClearDepartmentFilter={() => {
                  setSelectedFmsDepartment(null);
                  setSelectedFmsWorkflowKey(null);
                }}
                selectedWorkflowFilter={selectedFmsWorkflowKey}
                onClearWorkflowFilter={() => setSelectedFmsWorkflowKey(null)}
                onSelectWorkflowFilter={(flowKey) => {
                  setSelectedFmsWorkflowKey(flowKey);
                  if (flowKey) {
                    const parentDept = getDepartmentForWorkflow(flowKey, storageAdapter.getFmsTemplates(), flows);
                    if (parentDept) {
                      setSelectedFmsDepartment(parentDept);
                    }
                  }
                }}
                onOpenComparativeSheet={() => handleTabChange('cs-sheet')}
              />
            )}

            {activeTab === 'fms-audit' && (isSuperAdmin || hasModulePermission(currentUser, 'fms-audit', 'view')) && (
              <FmsAuditLedgerView
                flows={flows}
                currentUser={currentUser}
                onSelectFlow={(f) => setSelectedFmsDetail(f)}
                onDeleteFlow={handleDeleteFlow}
              />
            )}

            {activeTab === 'template-studio' && (isSuperAdmin || hasModulePermission(currentUser, 'template-studio', 'view')) && (
              <FmsTemplateStudioPage
                currentUser={currentUser}
                initialTemplateKey={templateStudioKey}
                onClearInitialKey={() => setTemplateStudioKey(null)}
                onNavigateTab={(tab) => handleTabChange(tab as any)}
                onCreateFlowFromTemplate={(templateKey) => {
                  setSelectedFmsWorkflowKey(templateKey);
                  setIsCreateFmsOpen(true);
                }}
              />
            )}

            {activeTab === 'cs-sheet' && (isSuperAdmin || isAdminOrSuperAdmin || hasModulePermission(currentUser, 'cs-sheet', 'view')) && (
              <ComparativeSheetView
                currentUser={currentUser}
                purchaseFlows={flows.filter((f) => f.flowType === 'INDENT_PURCHASE' || Boolean(f.indentNo))}
                onNavigateTab={(tab) => handleTabChange(tab as any)}
              />
            )}

            {activeTab === 'bank-payments' && (
              <BankPaymentsSuiteView
                currentUser={currentUser}
                searchQuery=""
                siteFilter="ALL"
                onRefresh={() => {
                  setAuditLogs(storageAdapter.getAuditLogs());
                }}
              />
            )}

            {activeTab === 'vendor-directory' && (
              <VendorDirectoryView currentUser={currentUser} />
            )}

            {activeTab === 'delegation' && (isSuperAdmin || hasModulePermission(currentUser, 'delegation', 'view')) && (
              <DelegationBoard
                tasks={delegationTasks}
                currentUser={currentUser}
                viewScope={isAdminOrSuperAdmin ? viewScope : 'USER_ONLY'}
                onToggleScope={handleToggleScope}
                onUpdateTask={handleUpdateDelegationTask}
                onDeleteTask={handleDeleteDelegationTask}
                onNewTask={(isSuperAdmin || hasModulePermission(currentUser, 'delegation', 'edit')) ? () => setIsNewTaskOpen(true) : undefined}
                onReviseTask={(task) => setSelectedTaskForRevision(task)}
                onAddProcessRemark={handleAddProcessRemark}
                selectedDepartmentFilter={selectedDelegationDepartment}
                onClearDepartmentFilter={() => setSelectedDelegationDepartment(null)}
                usersList={usersList}
              />
            )}

            {activeTab === 'checklist' && (isSuperAdmin || hasModulePermission(currentUser, 'checklist', 'view')) && (
              <ChecklistManager
                items={checklistItems}
                currentUser={currentUser}
                viewScope={isAdminOrSuperAdmin ? viewScope : 'USER_ONLY'}
                onToggleScope={handleToggleScope}
                onUpdateItem={handleUpdateChecklistItem}
                onDeleteItem={handleDeleteChecklistItem}
                onNewItem={(isSuperAdmin || hasModulePermission(currentUser, 'checklist', 'edit')) ? () => setIsNewChecklistOpen(true) : undefined}
                onBatchGenerateNextCycle={(isSuperAdmin || hasModulePermission(currentUser, 'checklist', 'edit')) ? handleBatchGenerateNextCycle : undefined}
                onAddProcessRemark={handleAddProcessRemark}
                selectedDepartmentFilter={selectedChecklistDepartment}
                onClearDepartmentFilter={() => setSelectedChecklistDepartment(null)}
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

            {activeTab === 'stn-ledger' && (isSuperAdmin || hasModulePermission(currentUser, 'stn-ledger', 'view')) && (
              <StnLedgerView
                currentUser={currentUser}
                onRefresh={() => {
                  setAuditLogs(storageAdapter.getAuditLogs());
                }}
                onSelectFlowDetail={(flowId) => {
                  const target = flows.find((f) => f.flowId === flowId || f.id === flowId);
                  if (target) setSelectedFmsDetail(target);
                }}
              />
            )}

            {activeTab === 'grn-ledger' && (isSuperAdmin || hasModulePermission(currentUser, 'grn-ledger', 'view')) && (
              <GrnLedgerView
                currentUser={currentUser}
                onRefresh={() => {
                  setAuditLogs(storageAdapter.getAuditLogs());
                }}
                onSelectFlowDetail={(flowId) => {
                  const target = flows.find((f) => f.flowId === flowId || f.id === flowId);
                  if (target) setSelectedFmsDetail(target);
                }}
              />
            )}

            {activeTab === 'credit-ledger' && (isSuperAdmin || hasModulePermission(currentUser, 'credit-ledger', 'view')) && (
              <CreditLedgerView
                currentUser={currentUser}
                onRefresh={() => {
                  setAuditLogs(storageAdapter.getAuditLogs());
                }}
                onSelectFlowDetail={(flowId) => {
                  const target = flows.find((f) => f.flowId === flowId || f.id === flowId);
                  if (target) setSelectedFmsDetail(target);
                }}
              />
            )}

            {activeTab === 'registry' && (isSuperAdmin || hasModulePermission(currentUser, 'registry', 'view')) && (
              <CentralRegistryView
                config={registryConfig}
                currentUser={currentUser}
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
              <AuditLogView logs={auditLogs} currentUser={currentUser} />
            )}

            {activeTab === 'super-admin' && (isSuperAdmin || isAdminOrSuperAdmin) && (
              <SuperAdminGovernanceView
                usersList={usersList}
                onUpdateUsersList={handleUpdateUsersList}
                noticeBoardItems={noticeBoardItems}
                onUpdateNoticeBoard={handleUpdateNoticeBoard}
                onImpersonateUser={handleImpersonateUser}
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
              </>
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

      <NewTaskModal
        isOpen={isNewTaskOpen}
        onClose={() => setIsNewTaskOpen(false)}
        onCreate={handleCreateDelegationTask}
        currentUser={currentUser}
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
        usersList={usersList}
        onUserChange={handleUserChange}
        viewScope={isAdminOrSuperAdmin ? viewScope : 'USER_ONLY'}
        onToggleScope={handleToggleScope}
        pcDeskActive={isAdminOrSuperAdmin ? pcDeskActive : false}
        onTogglePcDesk={isAdminOrSuperAdmin ? () => {
          const next = !pcDeskActive;
          setPcDeskActive(next);
          showToast(next ? "PC Desk Mode Enabled" : "PC Desk Mode Disabled");
        } : undefined}
        badgeCounts={badgeCounts}
        flows={flows}
        checklistItems={checklistItems}
        delegationTasks={delegationTasks}
        selectedDepartment={
          activeTab === 'fms' ? selectedFmsDepartment :
          activeTab === 'checklist' ? selectedChecklistDepartment :
          activeTab === 'delegation' ? selectedDelegationDepartment : null
        }
        selectedWorkflowKey={selectedFmsWorkflowKey}
        onSelectDepartmentFms={(deptKey) => {
          handleTabChange('fms');
          setSelectedFmsDepartment(deptKey);
          setSelectedFmsWorkflowKey(null);
        }}
        onSelectWorkflowFms={(deptKey, flowKey) => {
          handleTabChange('fms');
          setSelectedFmsDepartment(deptKey);
          setSelectedFmsWorkflowKey(flowKey);
        }}
        onSelectDepartmentChecklist={(deptKey) => {
          handleTabChange('checklist');
          setSelectedChecklistDepartment(deptKey);
        }}
        onSelectDepartmentDelegation={(deptKey) => {
          handleTabChange('delegation');
          setSelectedDelegationDepartment(deptKey);
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
          handleTabChange('mis');
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
        onImpersonateUser={handleImpersonateUser}
        currentUser={currentUser}
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
        onNavigateTab={(tab) => handleTabChange(tab)}
        onSelectFlowDetail={(flow) => setSelectedFmsDetail(flow)}
        onSelectInventoryItem={(item) => {
          setPreselectedInventoryItem(item);
          setIsStockMovementOpen(true);
        }}
        onSelectDelegationTask={(task) => setSelectedTaskForRevision(task)}
        onImpersonateUser={handleImpersonateUser}
      />
    </div>
  );
}
