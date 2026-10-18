import React, { useState } from 'react';
import { 
  GitBranch, 
  CheckSquare, 
  ListTodo, 
  Boxes, 
  BarChart3, 
  Sliders, 
  History, 
  CalendarCheck2,
  ChevronDown,
  ChevronRight,
  ShoppingCart,
  Warehouse,
  Landmark,
  Wrench,
  FolderOpen,
  FileSpreadsheet,
  ShieldCheck,
  User,
  Scale,
  Users,
  Layers
} from 'lucide-react';
import { FmsInstance, UserProfile, isUserSuperAdmin, isUserAdmin, isUserAdminOrSuperAdmin, hasModulePermission, ChecklistItem, DelegationTask } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { getFlowDepartmentKey, getDepartmentBranchLabel, matchItemDepartment, matchTaskDepartment, getDepartmentForWorkflow } from '../../services/stageAssignment';
import { UserAvatar } from '../common/UserAvatar';

export type NavTab = 'summary' | 'mis' | 'fms' | 'fms-audit' | 'template-studio' | 'cs-sheet' | 'bank-payments' | 'vendor-directory' | 'delegation' | 'checklist' | 'ims' | 'registry' | 'audit' | 'super-admin' | 'profile';

interface SidebarProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  badgeCounts: {
    dueTodayCount: number;
    overdueCount: number;
    fmsActive: number;
    delegationPending: number;
    checklistPending: number;
    lowStockCount: number;
  };
  isOpen: boolean;
  flows?: FmsInstance[];
  checklistItems?: ChecklistItem[];
  delegationTasks?: DelegationTask[];
  usersList?: UserProfile[];
  selectedDepartment?: string | null;
  selectedWorkflowKey?: string | null;
  onSelectDepartmentFms?: (deptKey: string | null) => void;
  onSelectWorkflowFms?: (deptKey: string, flowKeyOrTemplateId: string | null) => void;
  onSelectDepartmentChecklist?: (deptKey: string) => void;
  onSelectDepartmentDelegation?: (deptKey: string) => void;
  currentUser?: UserProfile;
  onOpenMyProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  badgeCounts,
  isOpen,
  flows = [],
  checklistItems = [],
  delegationTasks = [],
  usersList = [],
  selectedDepartment = null,
  selectedWorkflowKey = null,
  onSelectDepartmentFms,
  onSelectWorkflowFms,
  onSelectDepartmentChecklist,
  onSelectDepartmentDelegation,
  currentUser,
  onOpenMyProfile,
}) => {
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});
  const [collapsedSubSections, setCollapsedSubSections] = useState<Record<string, boolean>>({});

  const toggleDept = (deptKey: string) => {
    setCollapsedDepts((prev) => ({ ...prev, [deptKey]: prev[deptKey] === false ? true : false }));
  };

  const toggleSubSection = (subKey: string) => {
    setCollapsedSubSections((prev) => ({ ...prev, [subKey]: prev[subKey] === false ? true : false }));
  };

  // Dynamically compute department branches from Department Hub, flows & templates
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

  const detectedDeptKeys = new Set<string>();

  // 1. Add active (non-archived) configured departments from Central Department Hub
  const archivedKeys = new Set(configuredDepts.filter((d) => d.isArchived).map((d) => d.key.toUpperCase()));

  configuredDepts.forEach((d) => {
    if (!d.isArchived) detectedDeptKeys.add(d.key);
  });

  // 2. Add department keys from active flows only if not explicitly archived
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

    // Detect distinct workflows belonging to this department
    const workflowMap = new Map<string, { key: string; name: string; activeCount: number; totalCount: number }>();

    // A. From Master Templates belonging to this department
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

    // B. From actual flows in this department not already mapped
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

    const workflows = Array.from(workflowMap.values());

    return {
      key: deptKey,
      label: getDepartmentBranchLabel(deptKey),
      activeCount: totalActiveCount,
      fmsActiveCount: activeFmsCount,
      totalCount: deptFlows.length,
      workflows,
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
      return <ShoppingCart className="w-3.5 h-3.5 text-amber-600 shrink-0" />;
    }
    if (iconName === 'Warehouse' || deptKey === 'STORE') {
      return <Warehouse className="w-3.5 h-3.5 text-blue-600 shrink-0" />;
    }
    if (iconName === 'Landmark' || deptKey === 'ACCOUNTS') {
      return <Landmark className="w-3.5 h-3.5 text-emerald-600 shrink-0" />;
    }
    if (iconName === 'Wrench' || deptKey === 'PLANT_OPS') {
      return <Wrench className="w-3.5 h-3.5 text-purple-600 shrink-0" />;
    }
    return <FolderOpen className="w-3.5 h-3.5 text-indigo-600 shrink-0" />;
  };

  const userNavItems = [
    {
      id: 'summary' as NavTab,
      label: 'My Work',
      icon: CalendarCheck2,
      badge: badgeCounts.overdueCount > 0 
        ? `${badgeCounts.overdueCount}` 
        : badgeCounts.dueTodayCount > 0 
        ? `${badgeCounts.dueTodayCount}` 
        : undefined,
      badgeColor: badgeCounts.overdueCount > 0 ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
    },
    {
      id: 'mis' as NavTab,
      label: 'My Scoreboard',
      icon: BarChart3,
    },
  ];

  const operationsNavItems: NavItemDef[] = [
    {
      id: 'fms' as NavTab,
      label: 'All FMS',
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
      label: 'Delegation',
      icon: ListTodo,
      badge: badgeCounts.delegationPending > 0 ? `${badgeCounts.delegationPending}` : undefined,
      badgeColor: 'bg-rose-100 text-rose-800'
    },
    {
      id: 'checklist' as NavTab,
      label: 'Checklist',
      icon: CheckSquare,
      badge: badgeCounts.checklistPending > 0 ? `${badgeCounts.checklistPending}` : undefined,
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'ims' as NavTab,
      label: 'Inventory',
      icon: Boxes,
      badge: badgeCounts.lowStockCount > 0 ? `${badgeCounts.lowStockCount}` : undefined,
      badgeColor: 'bg-orange-100 text-orange-800'
    },
  ];

  const utilitiesNavItems: NavItemDef[] = [
    {
      id: 'cs-sheet' as NavTab,
      label: 'Comparative Statement',
      icon: Scale,
    },
    {
      id: 'bank-payments' as NavTab,
      label: 'Bank Payments',
      icon: Landmark,
    },
    {
      id: 'vendor-directory' as NavTab,
      label: 'Vendor Directory',
      icon: Users,
    },
  ];

  const systemNavItems = [
    {
      id: 'registry' as NavTab,
      label: 'Registry',
      icon: Sliders,
    },
    {
      id: 'audit' as NavTab,
      label: 'Audit',
      icon: History,
    },
    {
      id: 'super-admin' as NavTab,
      label: 'Users',
      icon: ShieldCheck,
      badge: 'Master',
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold',
      highlight: true
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
    highlight?: boolean;
  };

  const filterItem = (item: NavItemDef) => {
    if (item.id === 'super-admin') {
      return isSuperAdmin || isAdminOrSuperAdmin;
    }
    if (isSuperAdmin) {
      return true;
    }
    // Admin user receives User Modules, Utilities, Department Modules, and System Governance - NOT top-level Operations Modules
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

  return (
    <aside className={`border-r border-slate-200 bg-white shrink-0 hidden md:flex flex-col h-full min-h-0 transition-all duration-300 ${
      isOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
    }`}>
      <div className="flex-1 p-3 space-y-3 min-w-[256px] overflow-y-auto overscroll-contain min-h-0">
        {/* User Modules */}
        {filteredUserNavItems.length > 0 && (
          <div>
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              User Modules
            </div>
            <div className="space-y-1 mt-1">
              {filteredUserNavItems.map((item) => {
                const Icon = item.icon;
                const isItemActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                      isItemActive
                        ? 'bg-indigo-600 text-white font-medium shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 mr-2 py-0.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isItemActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="text-sm font-semibold leading-normal truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[11px] font-mono shrink-0 font-bold ml-auto px-2 py-0.5 rounded-full transition-all ${
                          isItemActive 
                            ? 'bg-white/20 text-white shadow-2xs' 
                            : item.badgeColor || 'bg-slate-200 text-slate-700'
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
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Operations Modules
            </div>
            <div className="space-y-1 mt-1">
              {filteredOperationsNavItems.map((item) => {
                const Icon = item.icon;
                const isItemActive = activeTab === item.id && (item.id !== 'fms' || (selectedDepartment === null && selectedWorkflowKey === null));

                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onTabChange(item.id);
                      if (item.id === 'fms') {
                        onSelectDepartmentFms?.(null);
                      }
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                      isItemActive
                        ? 'bg-indigo-600 text-white font-medium shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 mr-2 py-0.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isItemActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="text-sm font-semibold leading-normal truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[11px] font-mono shrink-0 font-bold ml-auto px-2 py-0.5 rounded-full transition-all ${
                          isItemActive 
                            ? 'bg-white/20 text-white shadow-2xs' 
                            : item.badgeColor || 'bg-slate-200 text-slate-700'
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
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Utilities &amp; Tools
            </div>
            <div className="space-y-1 mt-1">
              {filteredUtilitiesNavItems.map((item) => {
                const Icon = item.icon;
                const isItemActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                      isItemActive
                        ? 'bg-indigo-600 text-white font-medium shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 mr-2 py-0.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isItemActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="text-sm font-semibold leading-normal truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[11px] font-mono shrink-0 font-bold ml-auto px-2 py-0.5 rounded-full transition-all ${
                          isItemActive 
                            ? 'bg-white/20 text-white shadow-2xs' 
                            : item.badgeColor || 'bg-slate-200 text-slate-700'
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
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Department Modules
            </div>
            <div className="space-y-1.5 mt-1">
              {filteredDepartmentList.map((dept) => {
                const isCollapsed = collapsedDepts[dept.key] !== false;
                const isDeptFmsActive = activeTab === 'fms' && selectedDepartment === dept.key;
                const isSubCollapsed = collapsedSubSections[`${dept.key}-fms`] !== false;
                return (
                  <div key={dept.key} className="space-y-1">
                    <button
                      onClick={() => toggleDept(dept.key)}
                      className="w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-left text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors uppercase tracking-wider"
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
                      <div className="pl-3 pr-1 space-y-1.5 border-l-2 border-slate-200 ml-3.5 my-1">
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
                              }}
                              className={`flex-1 flex items-center justify-between px-2 py-1 rounded-md text-left transition-all ${
                                isDeptFmsActive && !selectedWorkflowKey
                                  ? 'bg-indigo-600 text-white font-medium shadow-xs'
                                  : 'text-slate-700 hover:bg-slate-100 font-semibold'
                              }`}
                            >
                              <div className="flex items-center gap-1.5 min-w-0">
                                <GitBranch className={`w-3.5 h-3.5 shrink-0 ${isDeptFmsActive && !selectedWorkflowKey ? 'text-white' : 'text-indigo-600'}`} />
                                <span className="text-[11px] truncate">FMS Workflows</span>
                              </div>
                              {dept.fmsActiveCount > 0 && (
                                <span
                                  className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
                                    isDeptFmsActive && !selectedWorkflowKey ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                                  }`}
                                >
                                  {dept.fmsActiveCount}
                                </span>
                              )}
                            </button>
                            <button
                              type="button"
                              onClick={() => toggleSubSection(`${dept.key}-fms`)}
                              className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 ml-0.5"
                              title="Toggle FMS workflows list"
                            >
                              {isSubCollapsed ? (
                                <ChevronRight className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>
                          </div>

                          {!isSubCollapsed && (
                            <div className="pl-2 space-y-0.5 border-l border-indigo-100 ml-2">
                              {/* All Workflows in Department */}
                              <button
                                onClick={() => {
                                  if (onSelectWorkflowFms) {
                                    onSelectWorkflowFms(dept.key, null);
                                  } else {
                                    onSelectDepartmentFms?.(dept.key);
                                  }
                                }}
                                className={`w-full flex items-center justify-between px-2 py-0.5 rounded text-left transition-all ${
                                  isDeptFmsActive && !selectedWorkflowKey
                                    ? 'bg-indigo-100/70 text-indigo-900 font-bold'
                                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                }`}
                              >
                                <span className="text-[10px] truncate">All {dept.label} FMS</span>
                                {dept.fmsActiveCount > 0 && (
                                  <span className="text-[9px] font-mono font-bold text-amber-700">
                                    {dept.fmsActiveCount}
                                  </span>
                                )}
                              </button>

                              {/* Individual Workflow Sub-Branches */}
                              {dept.workflows && dept.workflows.map((wf) => {
                                const isWfActive = activeTab === 'fms' && selectedWorkflowKey === wf.key;
                                return (
                                  <button
                                    key={`${dept.key}-${wf.key}`}
                                    onClick={() => {
                                      if (onSelectWorkflowFms) {
                                        onSelectWorkflowFms(dept.key, wf.key);
                                      } else {
                                        onSelectDepartmentFms?.(dept.key);
                                      }
                                    }}
                                    title={`${wf.name} (${wf.activeCount} active, ${wf.totalCount} total)`}
                                    className={`w-full flex items-center justify-between px-2 py-0.5 rounded text-left transition-all group ${
                                      isWfActive
                                        ? 'bg-indigo-50 border border-indigo-300 text-indigo-900 font-bold shadow-2xs'
                                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                        isWfActive ? 'bg-indigo-600 ring-2 ring-indigo-300' : 'bg-slate-300 group-hover:bg-slate-400'
                                      }`} />
                                      <span className={`text-[10px] truncate ${isWfActive ? 'text-indigo-900 font-bold' : 'font-medium'}`}>
                                        {wf.name}
                                      </span>
                                    </div>
                                    {wf.activeCount > 0 ? (
                                      <span
                                        className={`text-[9px] font-mono font-bold px-1 py-0.2 rounded shrink-0 ${
                                          isWfActive ? 'bg-indigo-200 text-indigo-950' : 'bg-amber-50 text-amber-800 border border-amber-200'
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
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-all ${
                              activeTab === 'checklist' && selectedDepartment === dept.key
                                ? 'bg-blue-600 text-white font-medium shadow-xs'
                                : 'text-slate-700 hover:bg-slate-100 font-semibold'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <CheckSquare className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'checklist' && selectedDepartment === dept.key ? 'text-white' : 'text-blue-600'}`} />
                              <span className="text-[11px] truncate">Checklists</span>
                            </div>
                            {dept.checklistCount > 0 && (
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
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
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1 rounded-md text-left transition-all ${
                              activeTab === 'delegation' && selectedDepartment === dept.key
                                ? 'bg-rose-600 text-white font-medium shadow-xs'
                                : 'text-slate-700 hover:bg-slate-100 font-semibold'
                            }`}
                          >
                            <div className="flex items-center gap-1.5 min-w-0">
                              <ListTodo className={`w-3.5 h-3.5 shrink-0 ${activeTab === 'delegation' && selectedDepartment === dept.key ? 'text-white' : 'text-rose-600'}`} />
                              <span className="text-[11px] truncate">Delegations</span>
                            </div>
                            {dept.delegationCount > 0 && (
                              <span
                                className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded-full ${
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
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              System Modules
            </div>
            <div className="space-y-1 mt-1">
              {filteredSystemNavItems.map((item) => {
                const Icon = item.icon;
                const isItemActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => onTabChange(item.id)}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-left transition-all ${
                      isItemActive
                        ? 'bg-indigo-600 text-white font-medium shadow-xs'
                        : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 mr-2 py-0.5">
                      <Icon className={`w-4 h-4 shrink-0 ${isItemActive ? 'text-white' : 'text-slate-500'}`} />
                      <span className="text-sm font-semibold leading-normal truncate">{item.label}</span>
                    </div>
                    {item.badge && (
                      <span
                        className={`text-[11px] font-mono shrink-0 font-bold ml-auto px-2 py-0.5 rounded-full transition-all ${
                          isItemActive 
                            ? 'bg-white/20 text-white shadow-2xs' 
                            : item.badgeColor || 'bg-slate-200 text-slate-700'
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

      {/* User Profile Card - Fixed to bottom */}
      {onOpenMyProfile && (
        <div className="mt-auto p-2.5 border-t border-slate-200 shrink-0 bg-white/95 backdrop-blur-xs">
          <button
            type="button"
            onClick={onOpenMyProfile}
            className={`w-full flex items-center justify-between p-2 rounded-xl text-left transition-all text-xs font-semibold cursor-pointer border shadow-2xs group ${
              activeTab === 'profile'
                ? 'bg-indigo-50 border-indigo-300 ring-2 ring-indigo-500/20 text-indigo-950'
                : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200 hover:border-slate-300'
            }`}
            title="Open My Profile & Settings"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              {currentUser ? (
                <UserAvatar user={currentUser} size="sm" showOnlineStatus />
              ) : (
                <div className="w-8 h-8 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs ring-2 ring-white shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-bold text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                  {currentUser ? currentUser.name : 'My Profile'}
                </p>
                <p className="text-[10px] text-slate-500 truncate font-medium">
                  {currentUser ? currentUser.role : 'Account Settings'}
                </p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-slate-400 group-hover:text-slate-700 group-hover:translate-x-0.5 transition-all shrink-0 ml-1.5" />
          </button>
        </div>
      )}
    </aside>
  );
};

