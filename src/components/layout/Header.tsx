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
  ShieldAlert,
  Crown
} from 'lucide-react';
import { UserProfile, CentralRegistryConfig, isUserSuperAdmin, isUserAdminOrSuperAdmin, AppNotification } from '../../types';
import { USERS } from '../../data/initialData';
import { UserAvatar } from '../common/UserAvatar';
import { CustomSelect } from '../common/CustomSelect';
import { NotificationCenter } from './NotificationCenter';
import { filterUsersForViewer } from '../../utils/staffValidation';

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
  usersList?: UserProfile[];
  notifications?: AppNotification[];
  onMarkNotificationRead?: (id: string) => void;
  onMarkAllNotificationsRead?: () => void;
  onClearAllNotifications?: () => void;
  onSelectNotification?: (notif: AppNotification) => void;
  desktopPermission?: NotificationPermission;
  onRequestDesktopPermission?: () => void;
  impersonatorAdmin?: UserProfile | null;
  onExitImpersonation?: () => void;
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
  usersList,
  notifications = [],
  onMarkNotificationRead,
  onMarkAllNotificationsRead,
  onClearAllNotifications,
  onSelectNotification,
  desktopPermission = 'default',
  onRequestDesktopPermission,
  impersonatorAdmin,
  onExitImpersonation,
}) => {
  const [isNotificationOpen, setIsNotificationOpen] = React.useState(false);
  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const isAdminOrSuperAdmin = isUserAdminOrSuperAdmin(currentUser);
  const rawAvailableUsers = usersList && usersList.length > 0 ? usersList : USERS;
  const availableUsers = filterUsersForViewer(rawAvailableUsers, currentUser);
  const unreadCount = notifications.filter((n) => !n.read).length;

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

      {/* Center Controls: Global Search Bar */}
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

        {/* Mobile Notification Bell */}
        <button
          type="button"
          onClick={() => setIsNotificationOpen((prev) => !prev)}
          className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-colors relative cursor-pointer"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-slate-700" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[15px] h-[15px] px-0.5 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* Mobile User Profile Identity badge */}
        <div className="flex items-center gap-1.5">
          <UserAvatar
            user={currentUser}
            size="xs"
            onClick={onOpenMyProfile}
          />
          <span className="text-[10px] bg-slate-50 border border-slate-200 rounded-lg py-1 px-1.5 font-bold text-slate-800 max-w-[90px] truncate">
            {currentUser.name.split(' ')[0]}
          </span>
        </div>
      </div>

      {/* Right User & Actions (Desktop View) */}
      <div className="hidden md:flex items-center gap-2">
        {/* Desktop Notification Bell */}
        <button
          type="button"
          onClick={() => setIsNotificationOpen((prev) => !prev)}
          className="p-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 transition-all relative cursor-pointer group shadow-2xs hover:border-slate-300"
          title="Notifications"
        >
          <Bell className="w-4 h-4 text-slate-600 group-hover:text-indigo-600 transition-colors" />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[17px] h-[17px] px-1 bg-rose-500 text-white rounded-full text-[9px] font-black flex items-center justify-center shadow-xs animate-pulse">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>

        {/* User Identity */}
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

          {/* Exit View As Action */}
          {impersonatorAdmin && onExitImpersonation && (
            <button
              onClick={onExitImpersonation}
              className="text-xs bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-2.5 py-1.5 rounded-lg shadow-2xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
              title={`Exit View As and return to ${impersonatorAdmin.name}`}
            >
              <span>Exit View As</span>
            </button>
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

      {/* Unified Single Mount Notification Popover */}
      {isNotificationOpen && (
        <div className="absolute right-2 sm:right-6 top-14 z-50">
          <NotificationCenter
            isOpen={isNotificationOpen}
            onClose={() => setIsNotificationOpen(false)}
            currentUser={currentUser}
            notifications={notifications}
            onMarkRead={(id) => onMarkNotificationRead?.(id)}
            onMarkAllRead={() => onMarkAllNotificationsRead?.()}
            onClearAll={() => onClearAllNotifications?.()}
            onSelectNotification={(notif) => {
              setIsNotificationOpen(false);
              onSelectNotification?.(notif);
            }}
            desktopPermission={desktopPermission}
            onRequestDesktopPermission={() => onRequestDesktopPermission?.()}
          />
        </div>
      )}
    </header>
  );
};
