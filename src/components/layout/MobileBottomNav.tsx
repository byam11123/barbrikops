import React from 'react';
import { 
  CalendarCheck2, 
  GitBranch, 
  CheckSquare, 
  ListTodo, 
  Menu,
  Plus,
  BarChart3
} from 'lucide-react';
import { NavTab } from './Sidebar';
import { UserProfile, isUserSuperAdmin, hasModulePermission } from '../../types';

interface MobileBottomNavProps {
  activeTab: NavTab;
  onTabChange: (tab: NavTab) => void;
  badgeCounts: {
    dueTodayCount: number;
    overdueCount: number;
    fmsActive: number;
    delegationPending: number;
    checklistPending: number;
  };
  onOpenMobileMenu: () => void;
  onOpenQuickAction: () => void;
  currentUser?: UserProfile;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onTabChange,
  badgeCounts,
  onOpenMobileMenu,
  onOpenQuickAction,
  currentUser,
}) => {
  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const myWorkBadge = (badgeCounts.overdueCount || 0) + (badgeCounts.dueTodayCount || 0);
  const tasksBadge = (badgeCounts.checklistPending || 0) + (badgeCounts.delegationPending || 0);

  // Minimalist Mobile Bar for regular staff: My Work, My Scoreboard & Quick Action
  if (!isSuperAdmin) {
    const showSummary = hasModulePermission(currentUser, 'summary', 'view');
    const showMis = hasModulePermission(currentUser, 'mis', 'view');

    return (
      <nav 
        aria-label="Mobile Navigation Bar"
        className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-4 py-1.5 flex items-center justify-around safe-bottom"
      >
        {/* 1. My Work */}
        {showSummary && (
          <button
            type="button"
            onClick={() => onTabChange('summary')}
            className={`relative flex-1 py-1 px-2 flex flex-col items-center justify-center transition-all cursor-pointer rounded-lg active:scale-95 ${
              activeTab === 'summary' 
                ? 'text-indigo-600 font-bold' 
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className="relative">
              <CalendarCheck2 className={`w-5 h-5 transition-transform ${activeTab === 'summary' ? 'scale-110 text-indigo-600' : 'text-slate-500'}`} />
              {myWorkBadge > 0 && (
                <span className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs ${
                  badgeCounts.overdueCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
                }`}>
                  {myWorkBadge > 99 ? '99+' : myWorkBadge}
                </span>
              )}
            </div>
            <span className={`text-[10px] mt-0.5 tracking-tight truncate ${activeTab === 'summary' ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}>
              My Work
            </span>
            {activeTab === 'summary' && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute bottom-0" />
            )}
          </button>
        )}

        {/* 2. Center Elevated Quick Action (+) Button */}
        <div className="flex-1 flex justify-center -mt-5">
          <button
            type="button"
            onClick={onOpenQuickAction}
            className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg ring-4 ring-white active:scale-90 transition-transform cursor-pointer"
            title="Create New Workflow, Task, or Entry"
          >
            <Plus className="w-6 h-6 stroke-[2.5]" />
          </button>
        </div>

        {/* 3. My Scoreboard */}
        {showMis && (
          <button
            type="button"
            onClick={() => onTabChange('mis')}
            className={`relative flex-1 py-1 px-2 flex flex-col items-center justify-center transition-all cursor-pointer rounded-lg active:scale-95 ${
              activeTab === 'mis' 
                ? 'text-indigo-600 font-bold' 
                : 'text-slate-500 hover:text-slate-800 font-medium'
            }`}
          >
            <div className="relative">
              <BarChart3 className={`w-5 h-5 transition-transform ${activeTab === 'mis' ? 'scale-110 text-indigo-600' : 'text-slate-500'}`} />
            </div>
            <span className={`text-[10px] mt-0.5 tracking-tight truncate ${activeTab === 'mis' ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}>
              My Scoreboard
            </span>
            {activeTab === 'mis' && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute bottom-0" />
            )}
          </button>
        )}
      </nav>
    );
  }

  return (
    <nav 
      aria-label="Mobile Navigation Bar"
      className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] px-2 py-1.5 flex items-center justify-around safe-bottom"
    >
      {/* 1. My Work */}
      <button
        type="button"
        onClick={() => onTabChange('summary')}
        className={`relative flex-1 py-1 px-1 flex flex-col items-center justify-center transition-all cursor-pointer rounded-lg active:scale-95 ${
          activeTab === 'summary' 
            ? 'text-indigo-600 font-bold' 
            : 'text-slate-500 hover:text-slate-800 font-medium'
        }`}
      >
        <div className="relative">
          <CalendarCheck2 className={`w-5 h-5 transition-transform ${activeTab === 'summary' ? 'scale-110 text-indigo-600' : 'text-slate-500'}`} />
          {myWorkBadge > 0 && (
            <span className={`absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs ${
              badgeCounts.overdueCount > 0 ? 'bg-rose-500 text-white' : 'bg-amber-500 text-white'
            }`}>
              {myWorkBadge > 99 ? '99+' : myWorkBadge}
            </span>
          )}
        </div>
        <span className={`text-[10px] mt-0.5 tracking-tight truncate max-w-[62px] ${activeTab === 'summary' ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}>
          My Work
        </span>
        {activeTab === 'summary' && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute bottom-0" />
        )}
      </button>

      {/* 2. All FMS */}
      <button
        type="button"
        onClick={() => onTabChange('fms')}
        className={`relative flex-1 py-1 px-1 flex flex-col items-center justify-center transition-all cursor-pointer rounded-lg active:scale-95 ${
          activeTab === 'fms' 
            ? 'text-indigo-600 font-bold' 
            : 'text-slate-500 hover:text-slate-800 font-medium'
        }`}
      >
        <div className="relative">
          <GitBranch className={`w-5 h-5 transition-transform ${activeTab === 'fms' ? 'scale-110 text-indigo-600' : 'text-slate-500'}`} />
          {badgeCounts.fmsActive > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs bg-indigo-600 text-white">
              {badgeCounts.fmsActive > 99 ? '99+' : badgeCounts.fmsActive}
            </span>
          )}
        </div>
        <span className={`text-[10px] mt-0.5 tracking-tight truncate max-w-[62px] ${activeTab === 'fms' ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}>
          All FMS
        </span>
        {activeTab === 'fms' && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute bottom-0" />
        )}
      </button>

      {/* 3. Center Elevated Quick Action Button */}
      <div className="flex-1 flex justify-center -mt-5">
        <button
          type="button"
          onClick={onOpenQuickAction}
          className="w-12 h-12 rounded-full bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center shadow-lg ring-4 ring-white active:scale-90 transition-transform cursor-pointer"
          title="Create New Workflow, Task, or Checklist"
        >
          <Plus className="w-6 h-6 stroke-[2.5]" />
        </button>
      </div>

      {/* 4. Checklist & Delegation (Tasks) */}
      <button
        type="button"
        onClick={() => {
          if (activeTab === 'checklist') {
            onTabChange('delegation');
          } else {
            onTabChange('checklist');
          }
        }}
        className={`relative flex-1 py-1 px-1 flex flex-col items-center justify-center transition-all cursor-pointer rounded-lg active:scale-95 ${
          activeTab === 'checklist' || activeTab === 'delegation'
            ? 'text-indigo-600 font-bold' 
            : 'text-slate-500 hover:text-slate-800 font-medium'
        }`}
      >
        <div className="relative">
          {activeTab === 'delegation' ? (
            <ListTodo className="w-5 h-5 text-indigo-600 scale-110" />
          ) : (
            <CheckSquare className={`w-5 h-5 transition-transform ${activeTab === 'checklist' ? 'scale-110 text-indigo-600' : 'text-slate-500'}`} />
          )}
          {tasksBadge > 0 && (
            <span className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 px-1 rounded-full text-[9px] font-bold flex items-center justify-center shadow-xs bg-blue-600 text-white">
              {tasksBadge > 99 ? '99+' : tasksBadge}
            </span>
          )}
        </div>
        <span className={`text-[10px] mt-0.5 tracking-tight truncate max-w-[62px] ${activeTab === 'checklist' || activeTab === 'delegation' ? 'text-indigo-600 font-bold' : 'text-slate-600'}`}>
          {activeTab === 'delegation' ? 'Delegation' : 'Tasks'}
        </span>
        {(activeTab === 'checklist' || activeTab === 'delegation') && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 absolute bottom-0" />
        )}
      </button>

      {/* 5. Menu Drawer */}
      <button
        type="button"
        onClick={onOpenMobileMenu}
        className="relative flex-1 py-1 px-1 flex flex-col items-center justify-center transition-all cursor-pointer rounded-lg active:scale-95 text-slate-500 hover:text-slate-800 font-medium"
      >
        <Menu className="w-5 h-5 text-slate-600" />
        <span className="text-[10px] mt-0.5 tracking-tight truncate max-w-[62px] text-slate-600">
          More
        </span>
      </button>
    </nav>
  );
};
