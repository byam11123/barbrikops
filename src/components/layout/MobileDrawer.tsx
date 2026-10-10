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
  ShieldCheck
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { UserProfile, FmsInstance, isUserSuperAdmin, hasModulePermission } from '../../types';
import { USERS } from '../../data/initialData';
import { ViewScope } from './Header';
import { storageAdapter } from '../../services/storageAdapter';
import { getFlowDepartmentKey, getDepartmentBranchLabel } from '../../services/stageAssignment';
import { UserAvatar } from '../common/UserAvatar';

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
  selectedDepartment?: string | null;
  onSelectDepartmentFms?: (deptKey: string | null) => void;
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
  selectedDepartment,
  onSelectDepartmentFms,
  onOpenQuickAction,
  onRefresh,
  usersList,
}) => {
  const [collapsedDepts, setCollapsedDepts] = useState<Record<string, boolean>>({});
  const availableUsers = usersList && usersList.length > 0 ? usersList : USERS;

  if (!isOpen) return null;

  const toggleDept = (deptKey: string) => {
    setCollapsedDepts((prev) => ({ ...prev, [deptKey]: !prev[deptKey] }));
  };

  const configuredDepts = storageAdapter.getDepartments();
  const customTemplates = storageAdapter.getFmsTemplates();

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

  const navItems = [
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
    {
      id: 'fms' as NavTab,
      label: 'All FMS Pipelines',
      icon: GitBranch,
      badge: badgeCounts.fmsActive > 0 ? `${badgeCounts.fmsActive} Active` : undefined,
      badgeColor: 'bg-indigo-100 text-indigo-800'
    },
    {
      id: 'delegation' as NavTab,
      label: 'Delegation Board',
      icon: ListTodo,
      badge: badgeCounts.delegationPending > 0 ? `${badgeCounts.delegationPending}` : undefined,
      badgeColor: 'bg-purple-100 text-purple-800'
    },
    {
      id: 'checklist' as NavTab,
      label: 'Daily Checklists',
      icon: CheckSquare,
      badge: badgeCounts.checklistPending > 0 ? `${badgeCounts.checklistPending}` : undefined,
      badgeColor: 'bg-blue-100 text-blue-800'
    },
    {
      id: 'ims' as NavTab,
      label: 'Inventory IMS',
      icon: Boxes,
      badge: badgeCounts.lowStockCount > 0 ? `${badgeCounts.lowStockCount} Low` : undefined,
      badgeColor: 'bg-orange-100 text-orange-800'
    },
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
      label: 'Super Admin Governance',
      icon: ShieldCheck,
      badge: '👑 Master',
      badgeColor: 'bg-amber-100 text-amber-900 border border-amber-300',
    },
  ];

  const isSuperAdmin = isUserSuperAdmin(currentUser);

  const filteredNavItems = navItems.filter((item) => {
    if (item.id === 'super-admin') {
      return isSuperAdmin;
    }
    return hasModulePermission(currentUser, item.id, 'view');
  });

  const handleNavigate = (tab: NavTab) => {
    onTabChange(tab);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex bg-slate-900/60 backdrop-blur-xs md:hidden animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div 
        className="w-[84%] max-w-[320px] bg-white h-full shadow-2xl flex flex-col justify-between overflow-y-auto animate-in slide-in-from-left duration-200"
        onClick={(e) => e.stopPropagation()}
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

          {/* User Profile Card & (Super Admin only) Switcher */}
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
            {isSuperAdmin && (
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

          {/* Scope and PC Desk toggles - Super Admin Only */}
          {isSuperAdmin && (
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
          <div>
            <span className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
              Modules
            </span>
            <div className="space-y-1">
              {filteredNavItems.map((item) => {
                const Icon = item.icon;
                const isItemActive = activeTab === item.id && (item.id !== 'fms' || selectedDepartment === null);
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

          {/* Department Branches - Super Admin Only */}
          {isSuperAdmin && (
            <div className="pt-2 border-t border-slate-100">
              <span className="px-2 text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                Department Hubs
              </span>
              <div className="space-y-1">
                {departmentList.map((dept) => {
                  const isCollapsed = !!collapsedDepts[dept.key];
                  const isDeptFmsActive = activeTab === 'fms' && selectedDepartment === dept.key;
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
                        <div className="pl-3.5 pr-1 space-y-1 border-l-2 border-slate-200 ml-3 my-0.5">
                          <button
                            onClick={() => {
                              onSelectDepartmentFms?.(dept.key);
                              onClose();
                            }}
                            className={`w-full flex items-center justify-between px-2 py-1.5 rounded-lg text-left transition-all ${
                              isDeptFmsActive
                                ? 'bg-indigo-600 text-white font-bold shadow-xs'
                                : 'text-slate-600 hover:bg-slate-100'
                            }`}
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <GitBranch className={`w-3.5 h-3.5 shrink-0 ${isDeptFmsActive ? 'text-white' : 'text-slate-400'}`} />
                              <span className="text-xs font-semibold truncate">View FMS Flows</span>
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
