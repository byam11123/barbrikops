import React, { useState } from 'react';
import { 
  X, 
  CalendarCheck2, 
  BarChart3, 
  GitBranch, 
  ListTodo, 
  CheckSquare, 
  Boxes, 
  Sliders, 
  History, 
  User, 
  Users, 
  ShieldAlert, 
  ChevronRight, 
  ChevronDown, 
  ShoppingCart, 
  Warehouse, 
  Landmark, 
  Wrench, 
  FolderOpen,
  Zap,
  Plus,
  RefreshCw,
  ShieldCheck,
  FileSpreadsheet,
  Scale,
  Layers
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { UserProfile, FmsInstance, isUserSuperAdmin, isUserAdmin, isUserAdminOrSuperAdmin, hasModulePermission, ChecklistItem, DelegationTask } from '../../types';
import { USERS } from '../../data/initialData';
import { ViewScope } from './Header';
import { storageAdapter } from '../../services/storageAdapter';
import { getFlowDepartmentKey, getDepartmentBranchLabel, matchItemDepartment, matchTaskDepartment, getDepartmentForWorkflow } from '../../services/stageAssignment';
import { UserAvatar } from '../common/UserAvatar';
import { filterUsersForViewer } from '../../utils/staffValidation';

interface MobileDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
  viewScope: ViewScope;
  onToggleScope: (scope: ViewScope) => void;
  pcDeskActive?: boolean;
  onTogglePcDesk?: () => void;
  badgeCounts: {
    dueTodayCount: number;
    overdueCount: number;
    fmsActive: number;
    delegationPending: number;
    checklistPending: number;
    lowStockCount: number;
  };
  flows: FmsInstance[];
  checklistItems?: ChecklistItem[];
  delegationTasks?: DelegationTask[];
  selectedDepartment?: string | null;
  selectedWorkflowKey?: string | null;
  onSelectDepartmentFms?: (deptKey: string | null) => void;
  onSelectWorkflowFms?: (deptKey: string, flowKeyOrTemplateId: string | null) => void;
  onSelectDepartmentChecklist?: (deptKey: string) => void;
  onSelectDepartmentDelegation?: (deptKey: string) => void;
  onOpenQuickAction?: () => void;
  onRefresh?: () => void;
  usersList?: UserProfile[];
}

export const MobileDrawer: React.FC<MobileDrawerProps> = ({
  isOpen,
  onClose,
  activeTab,
  onTabChange,
  currentUser,
  onUserChange,
  viewScope,
  onToggleScope,
  pcDeskActive,
  onTogglePcDesk,
  badgeCounts,
  flows,
  checklistItems = [],
  delegationTasks = [],
  selectedDepartment,
  selectedWorkflowKey,
  onSelectDepartmentFms,
  onSelectWorkflowFms,
  onSelectDepartmentChecklist,
  onSelectDepartmentDelegation,
  onOpenQuickAction,
  onRefresh,
  usersList = [],
}) => {
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});
  const [collapsedSubSections, setCollapsedSubSections] = useState<Record<string, boolean>>({});

  const toggleSubSection = (subKey: string) => {
    setCollapsedSubSections((prev) => ({ ...prev, [subKey]: prev[subKey] === false ? true : false }));
  };
  const rawAvailableUsers = usersList && usersList.length > 0 ? usersList : USERS;
  const availableUsers = filterUsersForViewer(rawAvailableUsers, currentUser);

  React.useEffect(() => {
    if (isOpen) {
      const orig = document.body.style.overflow;
      document.body.style.overflow = 'hidden';

      // Lock underlying aside (Sidebar) and main scroll containers while drawer is open
      const scrollContainers = document.querySelectorAll('aside, main');
      const prevOverflows: string[] = [];
      scrollContainers.forEach((el, idx) => {
        prevOverflows[idx] = (el as HTMLElement).style.overflow;
        (el as HTMLElement).style.overflow = 'hidden';
      });

      return () => {
        document.body.style.overflow = orig;
        scrollContainers.forEach((el, idx) => {
          (el as HTMLElement).style.overflow = prevOverflows[idx] || '';
        });
      };
    }
  }, [isOpen]);

  const configuredDepts = storageAdapter.getDepartments();
  const customTemplates = storageAdapter.getFmsTemplates();
  const allMasterTemplates = storageAdapter.getAllMasterTemplates();

  // Auto-expand department and FMS sub-tree when selectedWorkflowKey or selectedDepartment changes
  React.useEffect(() => {
    let targetDept = selectedDepartment;
    if (selectedWorkflowKey && selectedWorkflowKey !== 'ALL') {
      const templates = storageAdapter.getFmsTemplates();
      const mappedDept = getDepartmentForWorkflow(selectedWorkflowKey, templates, flows);
      if (mappedDept) targetDept = mappedDept;
    }

    if (targetDept) {
      setCollapsedDepts((prev) => (prev[targetDept] === false ? prev : {
        ...prev,
        [targetDept]: false
      }));

      setCollapsedSubSections((prev) => {
        if (prev[`${targetDept}-fms`] === false && prev[`nav-fms-${targetDept}`] === false) {
          return prev;
        }
        return {
          ...prev,
          [`${targetDept}-fms`]: false,
          [`nav-fms-${targetDept}`]: false
        };
      });
    }
  }, [selectedWorkflowKey, selectedDepartment]);

  const toggleDept = (deptKey: string) => {
    setCollapsedDepts((prev) => ({ ...prev, [deptKey]: prev[deptKey] === false ? true : false }));
  };

  if (!isOpen) return null;

  const detectedDeptKeys = new Set<string>();
  const archivedKeys = new Set(configuredDepts.filter((d) => d.isArchived).map((d) => d.key.toUpperCase()));

  configuredDepts.forEach((d) => {
    if (!d.isArchived) detectedDeptKeys.add(d.key);
  });

  flows.forEach((flow) => {
    const dept = getFlowDepartmentKey(flow, customTemplates);
    if (dept && !archivedKeys.has(dept.toUpperCase())) {
      detectedDeptKeys.add(dept);
    }
  });

  const departmentList = Array.from(detectedDeptKeys).map((deptKey) => {
    const deptFlows = flows.filter((f) => getFlowDepartmentKey(f, customTemplates) === deptKey);
    const activeFmsCount = deptFlows.filter((f) => f.status === 'In Progress').length;

    // Checklists in this department
    const deptChecklistItems = checklistItems.filter((chk) => matchItemDepartment(chk.department, deptKey));
    const pendingChecklistCount = deptChecklistItems.filter((chk) => chk.status === 'Pending' || chk.status === 'Delayed').length;

    // Delegations in this department
    const deptDelegationTasks = delegationTasks.filter((del) => matchTaskDepartment(del, deptKey, usersList));
    const pendingDelegationCount = deptDelegationTasks.filter((del) => del.status === 'Pending').length;

    const totalActiveCount = activeFmsCount + pendingChecklistCount + pendingDelegationCount;

    const workflowMap = new Map<string, { key: string; name: string; activeCount: number; totalCount: number }>();

    allMasterTemplates.forEach((tpl) => {
      let tplDept = 'OPERATIONS';
      if (tpl.departmentHub) {
        const hub = tpl.departmentHub.toUpperCase();
        if (hub === 'PROCUREMENT') tplDept = 'PURCHASE';
        else if (hub === 'SITE_LOGISTICS') tplDept = 'STORE';
        else if (hub === 'FINANCE_ACCOUNTS') tplDept = 'ACCOUNTS';
        else if (hub === 'HR_EQUIPMENT') tplDept = 'PLANT_OPS';
        else tplDept = hub;
      } else {
        const dummyFlow = { flowType: tpl.templateKey || tpl.id } as FmsInstance;
        tplDept = getFlowDepartmentKey(dummyFlow, customTemplates);
      }

      if (tplDept.toUpperCase() === deptKey.toUpperCase()) {
        const flowKey = tpl.templateKey || tpl.id;
        const matchingFlows = deptFlows.filter(
          (f) => f.flowType === flowKey || f.customTemplateId === tpl.id || f.customTemplateId === flowKey
        );
        workflowMap.set(flowKey, {
          key: flowKey,
          name: tpl.name,
          activeCount: matchingFlows.filter((f) => f.status === 'In Progress').length,
          totalCount: matchingFlows.length,
        });
      }
    });

    deptFlows.forEach((f) => {
      const flowKey = f.customTemplateId || f.flowType;
      if (!workflowMap.has(flowKey)) {
        const matchingFlows = deptFlows.filter(
          (item) => item.flowType === f.flowType || (f.customTemplateId && item.customTemplateId === f.customTemplateId)
        );
        const formatName = f.flowType.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
        workflowMap.set(flowKey, {
          key: flowKey,
          name: formatName,
          activeCount: matchingFlows.filter((item) => item.status === 'In Progress').length,
          totalCount: matchingFlows.length,
        });
      }
    });

    return {
      key: deptKey,
      label: getDepartmentBranchLabel(deptKey),
      activeCount: totalActiveCount,
      fmsActiveCount: activeFmsCount,
      totalCount: deptFlows.length,
      workflows: Array.from(workflowMap.values()),
      checklistCount: pendingChecklistCount,
      checklistTotal: deptChecklistItems.length,
      deptChecklists: deptChecklistItems,
      delegationCount: pendingDelegationCount,
      delegationTotal: deptDelegationTasks.length,
      deptDelegations: deptDelegationTasks,
    };
  });

  const getDeptIcon = (deptKey: string) => {
    const matched = configuredDepts.find((d) => d.key.toUpperCase() === deptKey.toUpperCase());
    const iconName = matched?.icon;
    if (iconName === 'ShoppingCart' || deptKey === 'PURCHASE') {
      return <ShoppingCart className="w-4 h-4 text-amber-600 shrink-0" />;
    }
    if (iconName === 'Warehouse' || deptKey === 'STORE') {
      return <Warehouse className="w-4 h-4 text-blue-600 shrink-0" />;
    }
    if (iconName === 'Landmark' || deptKey === 'ACCOUNTS') {
      return <Landmark className="w-4 h-4 text-emerald-600 shrink-0" />;
    }
    if (iconName === 'Wrench' || deptKey === 'PLANT_OPS') {
      return <Wrench className="w-4 h-4 text-purple-600 shrink-0" />;
    }
    return <FolderOpen className="w-4 h-4 text-indigo-600 shrink-0" />;
  };

  const userNavItems = [
    {
      id: 'summary' as NavTab,
      label: 'My Work (Task Feed)',
      icon: CalendarCheck2,
      badge: badgeCounts.overdueCount > 0 
        ? `${badgeCounts.overdueCount} Overdue` 
        : badgeCounts.dueTodayCount > 0 
        ? `${badgeCounts.dueTodayCount} Today` 
        : undefined,
      badgeColor: badgeCounts.overdueCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
    },
    {
      id: 'mis' as NavTab,
      label: 'My Scoreboard (MIS)',
      icon: BarChart3,
    },
  ];

  const operationsNavItems: any[] = [
    {
      id: 'fms' as NavTab,
      label: 'All FMS (Pipelines)',
      icon: GitBranch,
      badge: badgeCounts.fmsActive > 0 ? `${badgeCounts.fmsActive}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
    },
    {
      id: 'fms-audit' as NavTab,
      label: 'FMS Records & Audit',
      icon: FileSpreadsheet,
    },
    {
      id: 'template-studio' as NavTab,
      label: 'FMS Template Studio',
      icon: Layers,
    },
    {
      id: 'delegation' as NavTab,
      label: 'Delegation Board',
      icon: ListTodo,
      badge: badgeCounts.delegationPending > 0 ? `${badgeCounts.delegationPending}` : undefined,
      badgeColor: 'bg-rose-100 text-rose-800'
    },
    {
      id: 'checklist' as NavTab,
      label: 'Checklists (SOPs)',
      icon: CheckSquare,
      badge: badgeCounts.checklistPending > 0 ? `${badgeCounts.checklistPending}` : undefined,
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'ims' as NavTab,
      label: 'Inventory & Stocks',
      icon: Boxes,
      badge: badgeCounts.lowStockCount > 0 ? `${badgeCounts.lowStockCount}` : undefined,
      badgeColor: 'bg-orange-100 text-orange-800'
    },
  ];

  const utilitiesNavItems: any[] = [
    {
      id: 'cs-sheet' as NavTab,
      label: 'Comparative Statement',
      icon: Scale,
    },
  ];

  const systemNavItems = [
    {
      id: 'registry' as NavTab,
      label: 'Central Registry & Depts',
      icon: Sliders,
    },
    {
      id: 'audit' as NavTab,
      label: 'Audit Log & History',
      icon: History,
    },
    {
      id: 'super-admin' as NavTab,
      label: 'Users',
      icon: ShieldCheck,
      badge: 'Master',
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300',
    },
  ];

  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const isAdmin = isUserAdmin(currentUser);
  const isAdminOrSuperAdmin = isUserAdminOrSuperAdmin(currentUser);

  type NavItemDef = {
    id: NavTab;
    label: string;
    icon: React.ComponentType<{ className?: string }>;
    badge?: string;
    badgeColor?: string;
  };

  const filterItem = (item: NavItemDef) => {
    if (item.id === 'super-admin') {
      return isSuperAdmin || isAdminOrSuperAdmin;
    }
    if (isSuperAdmin) {
      return true;
    }
    if (isAdmin) {
      if (['fms', 'fms-audit', 'delegation', 'checklist', 'ims'].includes(item.id)) {
        return false;
      }
      return true;
    }
    return hasModulePermission(currentUser, item.id, 'view');
  };

  const filteredUserNavItems = userNavItems.filter(filterItem);
  const filteredOperationsNavItems = operationsNavItems.filter(filterItem);
  const filteredUtilitiesNavItems = utilitiesNavItems.filter(filterItem);
  const filteredSystemNavItems = systemNavItems.filter(filterItem);
  const filteredDepartmentList = departmentList.filter((dept) => {
    if (isSuperAdmin || isAdminOrSuperAdmin) return true;
    return hasModulePermission(currentUser, `dept-${dept.key}`, 'view');
  });

  const handleNavigate = (tab: NavTab) => {
    onTabChange(tab);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex bg-slate-900/60 backdrop-blur-xs md:hidden overscroll-contain animate-in fade-in duration-200"
      onClick={onClose}
      onWheel={(e) => e.stopPropagation()}
      onTouchMove={(e) => e.stopPropagation()}
    >
      <div 
        className="w-[84%] max-w-[320px] bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto overscroll-contain animate-in slide-in-from-left duration-200"
        onClick={(e) => e.stopPropagation()}
        onWheel={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="p-4 border-b border-slate-100 bg-slate-50/80">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white font-bold flex items-center justify-center text-base shadow-xs">
                B
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-sm leading-tight">BarbrikOne</h3>
                <p className="text-[10px] text-slate-500 font-medium">Mobile Workspace</p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              {onRefresh && (
                <button 
                  onClick={() => {
                    onRefresh();
                  }}
                  className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
                  title="Refresh"
                >
                  <RefreshCw className="w-4 h-4" />
                </button>
              )}
              <button 
                onClick={onClose}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-200/50"
                title="Close Menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* User Profile Card & (Super Admin & Administrative User) Switcher */}
          <div className="mt-3 p-2 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-2">
            <div 
              onClick={() => {
                onTabChange('profile');
                onClose();
              }}
              className="flex items-center justify-between cursor-pointer hover:bg-slate-50 p-1.5 rounded-lg transition-colors group"
              title="Open My Profile & Settings"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar user={currentUser} size="sm" showOnlineStatus />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">{currentUser.name}</p>
                  <p className="text-[10px] text-indigo-600 font-semibold truncate">{currentUser.role} · {currentUser.departmentName}</p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-indigo-600 group-hover:translate-x-0.5 transition-all shrink-0 ml-1" />
            </div>
            {isAdminOrSuperAdmin && (
              <div>
                <label className="text-[10px] text-slate-400 font-semibold uppercase block mb-1">Switch Staff Profile</label>
                <select
                  aria-label="Active Staff Profile"
                  value={currentUser.userId}
                  onChange={(e) => {
                    const found = availableUsers.find((u) => u.userId === e.target.value);
                    if (found) onUserChange(found);
                  }}
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg py-1.5 px-2 font-semibold text-slate-800"
                >
                  {availableUsers.map((user) => (
                    <option key={user.userId} value={user.userId}>
                      {user.name} ({user.departmentName})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Scope and PC Desk toggles - Super Admin & Administrative User */}
          {isAdminOrSuperAdmin && (
            <div className="grid grid-cols-2 gap-2 mt-2.5">
              <button
                onClick={() => onToggleScope(viewScope === 'USER_ONLY' ? 'ALL_ORG' : 'USER_ONLY')}
                className={`p-2 rounded-xl border text-left text-xs font-bold flex flex-col justify-between transition-colors ${
                  viewScope === 'ALL_ORG'
                    ? 'bg-indigo-50 border-indigo-200 text-indigo-800'
                    : 'bg-white border-slate-200 text-slate-700'
                }`}
              >
                <span className="text-[10px] text-slate-400 uppercase font-medium">Scope</span>
                <span className="flex items-center gap-1 mt-0.5">
                  <User className="w-3.5 h-3.5 text-indigo-600" />
                  <span>{viewScope === 'USER_ONLY' ? 'My Items' : 'All Org'}</span>
                </span>
              </button>

              {onTogglePcDesk && (
                <button
                  onClick={onTogglePcDesk}
                  className={`p-2 rounded-xl border text-left text-xs font-bold flex flex-col justify-between transition-colors ${
                    pcDeskActive
                      ? 'bg-purple-600 border-purple-700 text-white'
                      : 'bg-white border-slate-200 text-slate-700'
                  }`}
                >
                  <span className={`text-[10px] uppercase font-medium ${pcDeskActive ? 'text-purple-200' : 'text-slate-400'}`}>Control</span>
                  <span className="flex items-center gap-1 mt-0.5">
                    <ShieldAlert className="w-3.5 h-3.5" />
                    <span>{pcDeskActive ? 'PC Active' : 'PC Desk'}</span>
                  </span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Modules List */}
        <div className="p-3 space-y-4 flex-1">
          {/* User Modules */}
          {filteredUserNavItems.length > 0 && (
            <div>
              <span className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                User Modules
              </span>
              <div className="space-y-1">
                {filteredUserNavItems.map((item) => {
                  const Icon = item.icon;
                  const isItemActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                        isItemActive
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 py-0.5">
                        <Icon className={`w-4 h-4 shrink-0 ${isItemActive ? 'text-white' : 'text-slate-500'}`} />
                        <span className="text-xs truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-mono shrink-0 font-bold px-2 py-0.5 rounded-full ${
                            isItemActive 
                              ? 'bg-white/20 text-white' 
                              : item.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Operations Modules - Super Admin Only */}
          {filteredOperationsNavItems.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Operations Modules
              </span>
              <div className="space-y-1">
                {filteredOperationsNavItems.map((item) => {
                  const Icon = item.icon;
                  const isItemActive = activeTab === item.id && (item.id !== 'fms' || (selectedDepartment === null && selectedWorkflowKey === null));

                  return (
                    <button
                      key={item.id}
                      onClick={() => {
                        handleNavigate(item.id);
                        if (item.id === 'fms') {
                          onSelectDepartmentFms?.(null);
                        }
                      }}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                        isItemActive
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 py-0.5">
                        <Icon className={`w-4 h-4 shrink-0 ${isItemActive ? 'text-white' : 'text-slate-500'}`} />
                        <span className="text-xs truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-mono shrink-0 font-bold px-2 py-0.5 rounded-full ${
                            isItemActive 
                              ? 'bg-white/20 text-white' 
                              : item.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Utilities & Tools Module */}
          {filteredUtilitiesNavItems.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Utilities &amp; Tools
              </span>
              <div className="space-y-1">
                {filteredUtilitiesNavItems.map((item) => {
                  const Icon = item.icon;
                  const isItemActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                        isItemActive
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 py-0.5">
                        <Icon className={`w-4 h-4 shrink-0 ${isItemActive ? 'text-white' : 'text-slate-500'}`} />
                        <span className="text-xs truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-mono shrink-0 font-bold px-2 py-0.5 rounded-full ${
                            isItemActive 
                              ? 'bg-white/20 text-white' 
                              : item.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Dynamic Department Modules - Individual Section */}
          {filteredDepartmentList.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Department Modules
              </span>
              <div className="space-y-1">
                {filteredDepartmentList.map((dept) => {
                  const isCollapsed = collapsedDepts[dept.key] !== false;
                  const isDeptFmsActive = activeTab === 'fms' && selectedDepartment === dept.key;
                  const isSubCollapsed = collapsedSubSections[`mob-${dept.key}-fms`] !== false;
                  return (
                    <div key={dept.key} className="space-y-1">
                      <button
                        onClick={() => toggleDept(dept.key)}
                        className="w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors uppercase tracking-wider"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          {getDeptIcon(dept.key)}
                          <span className="truncate">{dept.label}</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          {dept.activeCount > 0 && (
                            <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded">
                              {dept.activeCount}
                            </span>
                          )}
                          {isCollapsed ? (
                            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
                          ) : (
                            <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                          )}
                        </div>
                      </button>

                      {!isCollapsed && (
                        <div className="pl-3 pr-1 space-y-1.5 border-l-2 border-slate-200 ml-3 my-1">
                          {/* 1. FMS Workflows Sub-Branch */}
                          <div className="space-y-1">
                            <div className="flex items-center justify-between">
                              <button
                                onClick={() => {
                                  if (onSelectWorkflowFms) {
                                    onSelectWorkflowFms(dept.key, null);
                                  } else {
                                    onSelectDepartmentFms?.(dept.key);
                                  }
                                  onClose();
                                }}
                                className={`flex-1 flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all ${
                                  isDeptFmsActive && !selectedWorkflowKey
                                    ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                    : 'text-slate-700 hover:bg-slate-100 font-semibold'
                                }`}
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <GitBranch className={`w-3.5 h-3.5 shrink-0 ${isDeptFmsActive && !selectedWorkflowKey ? 'text-white' : 'text-indigo-600'}`} />
                                  <span className="text-xs truncate">FMS Workflows</span>
                                </div>
                                {dept.fmsActiveCount > 0 && (
                                  <span
                                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                                      isDeptFmsActive && !selectedWorkflowKey ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                                    }`}
                                  >
                                    {dept.fmsActiveCount}
                                  </span>
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => toggleSubSection(`mob-${dept.key}-fms`)}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 ml-0.5"
                                title="Toggle FMS workflows list"
                              >
                                {isSubCollapsed ? (
                                  <ChevronRight className="w-3.5 h-3.5" />
                                ) : (
                                  <ChevronDown className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>

                            {!isSubCollapsed && (
                              <div className="pl-2 space-y-0.5 border-l border-indigo-100 ml-2">
                                <button
                                  onClick={() => {
                                    if (onSelectWorkflowFms) {
                                      onSelectWorkflowFms(dept.key, null);
                                    } else {
                                      onSelectDepartmentFms?.(dept.key);
                                    }
                                    onClose();
                                  }}
                                  className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition-all ${
                                    isDeptFmsActive && !selectedWorkflowKey
                                      ? 'bg-indigo-100 text-indigo-900 font-bold'
                                      : 'text-slate-600 hover:bg-slate-100'
                                  }`}
                                >
                                  <span className="text-[11px] truncate">All {dept.label} FMS</span>
                                  {dept.fmsActiveCount > 0 && (
                                    <span className="text-[9px] font-mono font-bold text-amber-700">
                                      {dept.fmsActiveCount}
                                    </span>
                                  )}
                                </button>

                                {dept.workflows && dept.workflows.map((wf) => {
                                  const isWfActive = activeTab === 'fms' && selectedDepartment === dept.key && selectedWorkflowKey === wf.key;
                                  return (
                                    <button
                                      key={`mob-${dept.key}-${wf.key}`}
                                      onClick={() => {
                                        if (onSelectWorkflowFms) {
                                          onSelectWorkflowFms(dept.key, wf.key);
                                        } else {
                                          onSelectDepartmentFms?.(dept.key);
                                        }
                                        onClose();
                                      }}
                                      title={`${wf.name} (${wf.activeCount} active)`}
                                      className={`w-full flex items-center justify-between px-2 py-1 rounded text-left transition-all ${
                                        isWfActive
                                          ? 'bg-indigo-50 border border-indigo-300 text-indigo-900 font-bold shadow-2xs'
                                          : 'text-slate-600 hover:bg-slate-100'
                                      }`}
                                    >
                                      <div className="flex items-center gap-1.5 min-w-0">
                                        <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                          isWfActive ? 'bg-indigo-600 ring-2 ring-indigo-300' : 'bg-slate-300'
                                        }`} />
                                        <span className={`text-[11px] truncate ${isWfActive ? 'text-indigo-900 font-bold' : 'font-medium'}`}>
                                          {wf.name}
                                        </span>
                                      </div>
                                      {wf.activeCount > 0 ? (
                                        <span
                                          className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded shrink-0 ${
                                            isWfActive ? 'bg-indigo-200 text-indigo-950' : 'bg-amber-100 text-amber-800'
                                          }`}
                                        >
                                          {wf.activeCount}
                                        </span>
                                      ) : (
                                        <span className="text-[9px] font-mono text-slate-400 shrink-0">
                                          {wf.totalCount}
                                        </span>
                                      )}
                                    </button>
                                  );
                                })}
                              </div>
                            )}
                          </div>

                          {/* 2. Checklists Sub-Branch */}
                          <div>
                            <button
                              onClick={() => {
                                if (onSelectDepartmentChecklist) {
                                  onSelectDepartmentChecklist(dept.key);
                                } else {
                                  onTabChange('checklist');
                                }
                                onClose();
                              }}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all ${
                                activeTab === 'checklist' && selectedDepartment === dept.key
                                  ? 'bg-blue-600 text-white font-bold shadow-xs'
                                  : 'text-slate-700 hover:bg-slate-100 font-semibold'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <CheckSquare className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'checklist' && selectedDepartment === dept.key ? 'text-white' : 'text-blue-600'}`} />
                                <span className="text-xs truncate">Checklists</span>
                              </div>
                              {dept.checklistCount > 0 && (
                                <span
                                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                                    activeTab === 'checklist' && selectedDepartment === dept.key ? 'bg-white/20 text-white' : 'bg-blue-100 text-blue-800'
                                  }`}
                                >
                                  {dept.checklistCount}
                                </span>
                              )}
                            </button>
                          </div>

                          {/* 3. Delegations Sub-Branch */}
                          <div>
                            <button
                              onClick={() => {
                                if (onSelectDepartmentDelegation) {
                                  onSelectDepartmentDelegation(dept.key);
                                } else {
                                  onTabChange('delegation');
                                }
                                onClose();
                              }}
                              className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all ${
                                activeTab === 'delegation' && selectedDepartment === dept.key
                                  ? 'bg-rose-600 text-white font-bold shadow-xs'
                                  : 'text-slate-700 hover:bg-slate-100 font-semibold'
                              }`}
                            >
                              <div className="flex items-center gap-2 min-w-0">
                                <ListTodo className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'delegation' && selectedDepartment === dept.key ? 'text-white' : 'text-rose-600'}`} />
                                <span className="text-xs truncate">Delegations</span>
                              </div>
                              {dept.delegationCount > 0 && (
                                <span
                                  className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                                    activeTab === 'delegation' && selectedDepartment === dept.key ? 'bg-white/20 text-white' : 'bg-rose-100 text-rose-800'
                                  }`}
                                >
                                  {dept.delegationCount}
                                </span>
                              )}
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* System Modules */}
          {filteredSystemNavItems.length > 0 && (
            <div className="pt-2 border-t border-slate-100">
              <span className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                System Modules
              </span>
              <div className="space-y-1">
                {filteredSystemNavItems.map((item) => {
                  const Icon = item.icon;
                  const isItemActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNavigate(item.id)}
                      className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-left transition-all ${
                        isItemActive
                          ? 'bg-indigo-600 text-white font-bold shadow-xs'
                          : 'text-slate-700 hover:bg-slate-100 font-semibold'
                      }`}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 py-0.5">
                        <Icon className={`w-4 h-4 shrink-0 ${isItemActive ? 'text-white' : 'text-slate-500'}`} />
                        <span className="text-xs truncate">{item.label}</span>
                      </div>
                      {item.badge && (
                        <span
                          className={`text-[10px] font-mono shrink-0 font-bold px-2 py-0.5 rounded-full ${
                            isItemActive 
                              ? 'bg-white/20 text-white' 
                              : item.badgeColor || 'bg-slate-100 text-slate-700'
                          }`}
                        >
                          {item.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Bottom Drawer Quick CTA - Super Admin Only */}
        {isSuperAdmin && onOpenQuickAction && (
          <div className="p-3 border-t border-slate-100 bg-slate-50">
            <button
              onClick={() => {
                onClose();
                onOpenQuickAction();
              }}
              className="w-full py-2.5 px-3 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm active:scale-98 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>+ Quick Operation Action</span>
            </button>
          </div>
        )}

        {/* Bottom User Profile Card - For standard user view (matching sidebar redesign) */}
        {!isSuperAdmin && (
          <div className="mt-auto p-3 border-t border-slate-200 bg-slate-50/80 shrink-0">
            <button
              type="button"
              onClick={() => {
                onTabChange('profile');
                onClose();
              }}
              className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all text-xs font-semibold cursor-pointer border shadow-2xs group ${
                activeTab === 'profile'
                  ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-950'
                  : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
              }`}
              title="Open My Profile & Settings"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <UserAvatar user={currentUser} size="sm" showOnlineStatus />
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {currentUser.name}
                  </p>
                  <p className="text-[10px] text-slate-500 truncate font-medium">
                    {currentUser.role}
                  </p>
                </div>
              </div>
              <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
