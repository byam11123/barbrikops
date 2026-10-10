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
  User
} from 'lucide-react';
import { FmsInstance, UserProfile, isUserSuperAdmin, hasModulePermission } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { getFlowDepartmentKey, getDepartmentBranchLabel } from '../../services/stageAssignment';
import { UserAvatar } from '../common/UserAvatar';

export type NavTab = 'summary' | 'mis' | 'fms' | 'fms-audit' | 'delegation' | 'checklist' | 'ims' | 'registry' | 'audit' | 'super-admin' | 'profile';

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
  selectedDepartment?: string | null;
  onSelectDepartmentFms?: (deptKey: string | null) => void;
  currentUser?: UserProfile;
  onOpenMyProfile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  badgeCounts,
  isOpen,
  flows = [],
  selectedDepartment = null,
  onSelectDepartmentFms,
  currentUser,
  onOpenMyProfile,
}) => {
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});

  const toggleDept = (deptKey: string) => {
    setCollapsedDepts((prev) => ({ ...prev, [deptKey]: !prev[deptKey] }));
  };

  // Dynamically compute department branches from Department Hub, flows & templates
  const configuredDepts = storageAdapter.getDepartments();
  const customTemplates = storageAdapter.getFmsTemplates();

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
    const activeCount = deptFlows.filter((f) => f.status === 'In Progress').length;
    return {
      key: deptKey,
      label: getDepartmentBranchLabel(deptKey),
      activeCount,
      totalCount: deptFlows.length,
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

  const navItems = [
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
      label: 'Super Admin',
      icon: ShieldCheck,
      badge: 'Master',
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300 font-extrabold',
      highlight: true
    },
  ];

  const isSuperAdmin = isUserSuperAdmin(currentUser);

  const filteredNavItems = navItems.filter((item) => {
    if (item.id === 'super-admin') {
      return isSuperAdmin;
    }
    return hasModulePermission(currentUser, item.id, 'view');
  });

  return (
    <aside className={`border-r border-slate-200 bg-white shrink-0 hidden md:flex flex-col h-[calc(100vh-4rem)] transition-all duration-300 ${
      isOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
    }`}>
      <div className="flex-1 p-3 space-y-3 min-w-[256px] overflow-y-auto">
        <div>
          <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
            Operations Modules
          </div>
          <div className="space-y-1 mt-1">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isItemActive = activeTab === item.id && (item.id !== 'fms' || selectedDepartment === null);
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

        {/* Dynamic Department Branches - Super Admin Only */}
        {isSuperAdmin && (
          <div className="pt-2 border-t border-slate-100">
            <div className="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wider">
              Department Branches
            </div>
            <div className="space-y-1.5 mt-1">
              {departmentList.map((dept) => {
                const isCollapsed = !!collapsedDepts[dept.key];
                const isDeptFmsActive = activeTab === 'fms' && selectedDepartment === dept.key;
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
                      <div className="pl-3.5 pr-1 space-y-1 border-l-2 border-slate-200 ml-4 my-0.5">
                        <button
                          onClick={() => onSelectDepartmentFms?.(dept.key)}
                          className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-md text-left transition-all ${
                            isDeptFmsActive
                              ? 'bg-indigo-600 text-white font-medium shadow-xs'
                              : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                          }`}
                        >
                          <div className="flex items-center gap-2 min-w-0">
                            <GitBranch className={`w-3.5 h-3.5 shrink-0 ${isDeptFmsActive ? 'text-white' : 'text-slate-400'}`} />
                            <span className="text-xs font-semibold truncate">FMS</span>
                          </div>
                          {dept.activeCount > 0 && (
                            <span
                              className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded-full ${
                                isDeptFmsActive ? 'bg-white/20 text-white' : 'bg-amber-100 text-amber-800'
                              }`}
                            >
                              {dept.activeCount}
                            </span>
                          )}
                        </button>
                      </div>
                    )}
                  </div>
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

