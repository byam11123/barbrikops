import React from 'react';
import { 
  GitBranch, 
  CheckSquare, 
  ListTodo, 
  Boxes, 
  BarChart3, 
  Sliders, 
  History, 
  FileSpreadsheet,
  ArrowRightLeft,
  ShieldCheck,
  CalendarCheck2,
  AlertTriangle
} from 'lucide-react';

export type NavTab = 'summary' | 'mis' | 'fms' | 'delegation' | 'checklist' | 'ims' | 'registry' | 'audit';

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
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  badgeCounts,
  isOpen,
}) => {
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
      label: 'FMS',
      icon: GitBranch,
      badge: badgeCounts.fmsActive > 0 ? `${badgeCounts.fmsActive}` : undefined,
      badgeColor: 'bg-amber-100 text-amber-800'
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
  ];

  return (
    <aside className={`border-r border-slate-200 bg-slate-50/70 shrink-0 flex flex-col justify-between h-[calc(100vh-4rem)] transition-all duration-300 ${
      isOpen ? 'w-64 opacity-100' : 'w-0 opacity-0 overflow-hidden border-none'
    }`}>
      <div className="p-3 space-y-1 min-w-[256px]">
        <div className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
          Operations Modules
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onTabChange(item.id)}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg text-left transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white font-medium shadow-xs'
                  : 'text-slate-700 hover:bg-slate-200/60 hover:text-slate-900'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0 mr-2 py-0.5">
                <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-white' : 'text-slate-500'}`} />
                <span className="text-sm font-semibold leading-normal truncate">{item.label}</span>
              </div>
              {item.badge && (
                <span
                  className={`text-[11px] font-mono shrink-0 font-bold ml-auto px-2 py-0.5 rounded-full transition-all ${
                    isActive 
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
    </aside>
  );
};
