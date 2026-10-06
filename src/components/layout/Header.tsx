import React from 'react';
import { 
  Building2, 
  Layers, 
  Database, 
  FileSpreadsheet, 
  UserCheck, 
  Bell, 
  Search,
  Sparkles,
  RefreshCw,
  User,
  Users,
  Menu
} from 'lucide-react';
import { UserProfile, CentralRegistryConfig } from '../../types';
import { USERS } from '../../data/initialData';

export type ViewScope = 'USER_ONLY' | 'ALL_ORG';

interface HeaderProps {
  currentUser: UserProfile;
  onUserChange: (user: UserProfile) => void;
  registryConfig: CentralRegistryConfig;
  activeTab: string;
  onRefresh: () => void;
  viewScope: ViewScope;
  onToggleScope: (scope: ViewScope) => void;
  isSidebarOpen: boolean;
  onToggleSidebar: () => void;
}

export function getDynamicGreetingHeader(name: string): string {
  const hr = new Date().getHours();
  let greet = 'Good morning';
  if (hr >= 12 && hr < 17) {
    greet = 'Good afternoon';
  } else if (hr >= 17 || hr < 5) {
    greet = 'Good evening';
  }
  return `${greet}, ${name}`;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  onUserChange,
  registryConfig,
  activeTab,
  onRefresh,
  viewScope,
  onToggleScope,
  isSidebarOpen,
  onToggleSidebar,
}) => {
  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 flex items-center justify-between px-6 shadow-xs">
      {/* Left Title & Status */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-sm transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer focus:outline-none"
          >
            B
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 leading-tight text-base sm:text-lg">
                BarBrik Central Ops
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5 hidden md:block">
              {getDynamicGreetingHeader(currentUser.name)}
            </p>
          </div>
        </div>
      </div>

      {/* Center Scope Toggle (User-Based vs Organization-Wide as Dropdown) */}
      <div className="flex items-center bg-slate-100 px-2 py-1 rounded-lg border border-slate-200/80 shadow-2xs gap-1.5">
        <User className="w-3.5 h-3.5 text-indigo-600" />
        <select
          value={viewScope}
          onChange={(e) => onToggleScope(e.target.value as ViewScope)}
          title="Switch view scope"
          className="text-xs font-semibold bg-transparent border-none text-slate-700 hover:text-slate-900 focus:outline-none cursor-pointer py-0.5 font-sans"
        >
          <option value="USER_ONLY">My Items Only</option>
          <option value="ALL_ORG">All Organization</option>
        </select>
      </div>

      {/* Right User & Actions */}
      <div className="flex items-center gap-3">
        {/* Refresh button */}
        <button
          onClick={onRefresh}
          title="Refresh Data from Sheets"
          className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
        </button>

        {/* User Switcher Dropdown */}
        <div className="flex items-center gap-2 pl-3 border-l border-slate-200">
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-slate-900 leading-none">
              {currentUser.name}
            </p>
            <p className="text-[11px] text-indigo-600 font-medium leading-none mt-1">
              {currentUser.role}
            </p>
          </div>
          <div className="relative">
            <select
              aria-label="Active Staff Profile"
              value={currentUser.userId}
              onChange={(e) => {
                const found = USERS.find((u) => u.userId === e.target.value);
                if (found) onUserChange(found);
              }}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[170px] truncate"
            >
              {USERS.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.name} ({user.departmentName})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </header>
  );
};
