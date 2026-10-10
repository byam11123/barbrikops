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
  Menu,
  ShieldAlert
} from 'lucide-react';
import { UserProfile, CentralRegistryConfig, isUserSuperAdmin } from '../../types';
import { USERS } from '../../data/initialData';
import { UserAvatar } from '../common/UserAvatar';

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
  pcDeskActive?: boolean;
  onTogglePcDesk?: () => void;
  onOpenMobileMenu?: () => void;
  onOpenMyProfile?: () => void;
  onOpenSuperAdmin?: () => void;
  onLogout?: () => void;
  onOpenGlobalSearch?: () => void;
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
  pcDeskActive,
  onTogglePcDesk,
  onOpenMobileMenu,
  onOpenMyProfile,
  onOpenSuperAdmin,
  onLogout,
  onOpenGlobalSearch,
}) => {
  const isSuperAdmin = isUserSuperAdmin(currentUser);

  return (
    <header className="h-16 border-b border-slate-200 bg-white sticky top-0 z-30 flex items-center justify-between px-3 sm:px-6 shadow-xs">
      {/* Left Title & Status */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Mobile Hamburger Menu Button */}
        {onOpenMobileMenu && (
          <button
            onClick={onOpenMobileMenu}
            className="md:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Open Mobile Navigation Menu"
            aria-label="Open Navigation Menu"
          >
            <Menu className="w-5 h-5 text-slate-700" />
          </button>
        )}

        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* Desktop Sidebar Toggle Button */}
          <button
            onClick={onToggleSidebar}
            title={isSidebarOpen ? "Collapse Sidebar" : "Expand Sidebar"}
            className="w-9 h-9 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white flex items-center justify-center font-bold text-lg shadow-sm transition-all hover:scale-[1.03] active:scale-[0.97] cursor-pointer focus:outline-none shrink-0"
          >
            B
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-bold text-slate-900 leading-tight text-sm sm:text-base md:text-lg truncate max-w-[150px] sm:max-w-none">
                BarbrikOne
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 font-medium leading-none mt-0.5 hidden md:block">
              {getDynamicGreetingHeader(currentUser.name)}
            </p>
          </div>
        </div>
      </div>

      {/* Center Controls: Global Search Bar & (SuperAdmin only) Scope Dropdown & PC Desk */}
      <div className="hidden md:flex items-center gap-3">
        {/* Prominent Global Search Bar */}
        {onOpenGlobalSearch && (
          <button
            type="button"
            onClick={onOpenGlobalSearch}
            className="flex items-center gap-2.5 bg-slate-50 hover:bg-slate-100/90 text-slate-500 hover:text-slate-800 border border-slate-200 hover:border-slate-300 px-3 py-1.5 rounded-xl text-xs font-medium w-64 lg:w-80 shadow-2xs transition-all cursor-pointer group text-left"
            title="Press Ctrl+K or click to open Universal Search"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors shrink-0" />
            <span className="truncate flex-1 text-slate-500 font-medium">Search flows, tasks, stock...</span>
            <span className="hidden sm:inline-flex items-center gap-0.5 text-[10px] font-mono font-bold bg-white border border-slate-200 text-slate-500 px-1.5 py-0.5 rounded shadow-2xs">
              <span className="text-[11px]">⌘</span>K
            </span>
          </button>
        )}

        {/* Scope Dropdown - Super Admin Only */}
        {isSuperAdmin && (
          <div className="flex items-center bg-white px-2.5 py-1 rounded-lg border border-slate-200 shadow-2xs gap-1.5">
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
        )}

        {/* Relocated PC Desk button - Super Admin Only */}
        {isSuperAdmin && onTogglePcDesk && (
          <button
            onClick={onTogglePcDesk}
            className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
              pcDeskActive
                ? 'bg-purple-600 text-white border-purple-700 shadow-xs ring-1 ring-purple-400/50'
                : 'bg-purple-50 hover:bg-purple-100 text-purple-700 border-purple-200'
            }`}
            title={pcDeskActive ? "PC Desk Mode Active (Click to disable)" : "Switch to Process Coordinator Control Desk"}
          >
            <ShieldAlert className={`w-3.5 h-3.5 ${pcDeskActive ? 'text-purple-200' : 'text-purple-600'}`} />
            <span>PC Desk</span>
          </button>
        )}
      </div>

      {/* Mobile Right Controls: Touch-friendly Quick Actions */}
      <div className="flex md:hidden items-center gap-1.5">
        {/* Mobile Search Button */}
        {onOpenGlobalSearch && (
          <button
            onClick={onOpenGlobalSearch}
            className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg transition-colors cursor-pointer"
            title="Global Search"
          >
            <Search className="w-4 h-4 text-slate-700" />
          </button>
        )}

        {/* Mobile Scope Toggle - Super Admin Only */}
        {isSuperAdmin && (
          <button
            onClick={() => onToggleScope(viewScope === 'USER_ONLY' ? 'ALL_ORG' : 'USER_ONLY')}
            className={`px-2 py-1 rounded-lg text-[10px] font-bold border flex items-center gap-1 transition-colors ${
              viewScope === 'ALL_ORG' 
                ? 'bg-indigo-50 border-indigo-200 text-indigo-700' 
                : 'bg-slate-50 border-slate-200 text-slate-700'
            }`}
            title="Toggle My Items vs All Org"
          >
            <User className="w-3 h-3 text-indigo-600" />
            <span>{viewScope === 'USER_ONLY' ? 'Mine' : 'All Org'}</span>
          </button>
        )}

        {/* Mobile PC Desk Indicator/Toggle - Super Admin Only */}
        {isSuperAdmin && onTogglePcDesk && (
          <button
            onClick={onTogglePcDesk}
            className={`p-1.5 rounded-lg border transition-colors ${
              pcDeskActive 
                ? 'bg-purple-600 text-white border-purple-700' 
                : 'bg-slate-50 text-slate-600 border-slate-200'
            }`}
            title="Toggle PC Desk mode"
          >
            <ShieldAlert className="w-3.5 h-3.5" />
          </button>
        )}

        {/* Mobile User Profile: Switcher for SuperAdmin, Identity badge for normal users */}
        <div className="flex items-center gap-1.5">
          <UserAvatar
            user={currentUser}
            size="xs"
            onClick={onOpenMyProfile}
          />
          {isSuperAdmin ? (
            <select
              aria-label="Active Staff Profile"
              value={currentUser.userId}
              onChange={(e) => {
                const found = USERS.find((u) => u.userId === e.target.value);
                if (found) onUserChange(found);
              }}
              className="text-[11px] bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 font-bold text-slate-800 max-w-[85px] truncate"
            >
              {USERS.map((user) => (
                <option key={user.userId} value={user.userId}>
                  {user.name.split(' ')[0]} ({user.role.slice(0, 8)})
                </option>
              ))}
            </select>
          ) : (
            <span className="text-[10px] bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 font-bold text-slate-800 max-w-[90px] truncate">
              {currentUser.name.split(' ')[0]}
            </span>
          )}
        </div>
      </div>

      {/* Right User & Actions (Desktop View) */}
      <div className="hidden md:flex items-center gap-2">
        {/* Super Admin Control Center Button */}
        {isSuperAdmin && onOpenSuperAdmin && (
          <button
            type="button"
            onClick={onOpenSuperAdmin}
            className="px-2.5 py-1.5 bg-amber-500 hover:bg-amber-600 text-slate-950 font-black rounded-lg text-xs transition-colors flex items-center gap-1 shadow-xs cursor-pointer"
            title="Super Admin Governance Center"
          >
            <span>👑 Super Admin</span>
          </button>
        )}

        {/* User Identity & Switcher */}
        <div className="flex items-center gap-2.5">
          <UserAvatar
            user={currentUser}
            size="sm"
            onClick={onOpenMyProfile}
          />
          <div className="text-left hidden sm:block">
            <p className="text-xs font-bold text-slate-900 leading-none">
              {currentUser.name}
            </p>
            <p className="text-[11px] text-indigo-600 font-medium leading-none mt-1">
              {currentUser.role}
            </p>
          </div>
          
          {/* Super Admin only: User Switcher dropdown */}
          {isSuperAdmin && (
            <div className="relative">
              <select
                aria-label="Active Staff Profile"
                value={currentUser.userId}
                onChange={(e) => {
                  const found = USERS.find((u) => u.userId === e.target.value);
                  if (found) onUserChange(found);
                }}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2 font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[150px] truncate"
              >
                {USERS.map((user) => (
                  <option key={user.userId} value={user.userId}>
                    {user.name} ({user.departmentName})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Logout Button */}
          {onLogout && (
            <button
              onClick={onLogout}
              className="text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 px-2 py-1.5 rounded-lg font-bold transition-colors cursor-pointer flex items-center gap-1"
              title="Sign out of your session"
            >
              <span>Logout</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
