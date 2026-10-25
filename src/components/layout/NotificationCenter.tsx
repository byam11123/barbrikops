import React, { useRef, useEffect, useState } from 'react';
import { 
  Bell, 
  CheckCheck, 
  Trash2, 
  AlertCircle, 
  AlertTriangle,
  CheckCircle2, 
  Clock, 
  ArrowRight,
  Volume2, 
  X,
  User,
  Package,
  CheckSquare,
  FileText,
  Zap,
  Filter
} from 'lucide-react';
import { AppNotification, UserProfile } from '../../types';
import { 
  isBrowserNotificationSupported, 
} from '../../services/notificationService';

interface NotificationCenterProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: UserProfile;
  notifications: AppNotification[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
  onClearAll: () => void;
  onSelectNotification: (notif: AppNotification) => void;
  desktopPermission: NotificationPermission;
  onRequestDesktopPermission: () => void;
}

type FilterTab = 'FOR_ME' | 'ALL' | 'FMS' | 'ALERTS';

export const NotificationCenter: React.FC<NotificationCenterProps> = ({
  isOpen,
  onClose,
  currentUser,
  notifications,
  onMarkRead,
  onMarkAllRead,
  onClearAll,
  onSelectNotification,
  desktopPermission,
  onRequestDesktopPermission,
}) => {
  const panelRef = useRef<HTMLDivElement>(null);
  const [activeFilter, setActiveFilter] = useState<FilterTab>('FOR_ME');

  // Close when clicking outside panel
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(event.target as Node)) {
        onClose();
      }
    }
    if (isOpen) {
      // Use mousedown with small deferral to prevent instant race cancellation
      const timer = setTimeout(() => {
        document.addEventListener('mousedown', handleClickOutside);
      }, 50);
      return () => {
        clearTimeout(timer);
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const currentUserId = currentUser?.userId || '';
  const currentUserName = currentUser?.name || '';

  // Filter logic
  const isDirectlyForUser = (n: AppNotification) => {
    return n.userId === currentUserId || 
           n.userId === currentUserName || 
           n.targetUserName === currentUserName;
  };

  const filteredNotifications = notifications.filter((notif) => {
    switch (activeFilter) {
      case 'FOR_ME':
        return isDirectlyForUser(notif) || nBroadcast(notif);
      case 'FMS':
        return notif.type === 'FMS_ACTION_REQUIRED' || 
               notif.type === 'STAGE_ADVANCED' || 
               notif.type === 'SLA_BREACH' ||
               notif.type === 'SLA_WARNING';
      case 'ALERTS':
        return notif.type === 'STOCK_ALERT' || 
               notif.type === 'DELEGATION' || 
               notif.type === 'NUDGE';
      case 'ALL':
      default:
        return true;
    }
  });

  function nBroadcast(n: AppNotification) {
    return n.userId === 'ALL';
  }

  const unreadTotal = notifications.filter((n) => !n.read).length;
  const unreadForMe = notifications.filter((n) => !n.read && (isDirectlyForUser(n) || nBroadcast(n))).length;

  const getNotificationTheme = (notif: AppNotification) => {
    switch (notif.type) {
      case 'FMS_ACTION_REQUIRED':
        return {
          pill: 'bg-blue-100 text-blue-800 border-blue-200',
          badgeText: 'FMS APPROVAL REQUIRED',
          borderAccent: 'border-l-4 border-blue-600',
          bgActive: 'bg-blue-50/50 hover:bg-blue-50/90',
          icon: <FileText className="w-4 h-4 text-blue-600 shrink-0" />,
          actionText: 'Review & Take Action'
        };
      case 'SLA_BREACH':
        return {
          pill: 'bg-rose-100 text-rose-800 border-rose-200',
          badgeText: 'SLA OVERDUE ALERT',
          borderAccent: 'border-l-4 border-rose-600',
          bgActive: 'bg-rose-50/50 hover:bg-rose-50/90',
          icon: <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 animate-pulse" />,
          actionText: 'Inspect Delayed Stage'
        };
      case 'SLA_WARNING':
        return {
          pill: 'bg-amber-100 text-amber-800 border-amber-200',
          badgeText: 'SLA WARNING (80%)',
          borderAccent: 'border-l-4 border-amber-500',
          bgActive: 'bg-amber-50/50 hover:bg-amber-50/90',
          icon: <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />,
          actionText: 'Inspect Approaching SLA'
        };
      case 'STOCK_ALERT':
        return {
          pill: 'bg-amber-100 text-amber-800 border-amber-200',
          badgeText: 'LOW STOCK WARNING',
          borderAccent: 'border-l-4 border-amber-500',
          bgActive: 'bg-amber-50/50 hover:bg-amber-50/90',
          icon: <Package className="w-4 h-4 text-amber-600 shrink-0" />,
          actionText: 'Open Inventory Stock'
        };
      case 'DELEGATION':
        return {
          pill: 'bg-purple-100 text-purple-800 border-purple-200',
          badgeText: 'DELEGATED TASK',
          borderAccent: 'border-l-4 border-purple-600',
          bgActive: 'bg-purple-50/50 hover:bg-purple-50/90',
          icon: <CheckSquare className="w-4 h-4 text-purple-600 shrink-0" />,
          actionText: 'Open Delegated Task'
        };
      case 'NUDGE':
        return {
          pill: 'bg-orange-100 text-orange-800 border-orange-200',
          badgeText: 'EXPEDITE NUDGE',
          borderAccent: 'border-l-4 border-orange-500',
          bgActive: 'bg-orange-50/50 hover:bg-orange-50/90',
          icon: <Zap className="w-4 h-4 text-orange-600 shrink-0" />,
          actionText: 'Respond to Nudge'
        };
      case 'STAGE_ADVANCED':
        return {
          pill: 'bg-emerald-100 text-emerald-800 border-emerald-200',
          badgeText: 'STAGE ADVANCED',
          borderAccent: 'border-l-4 border-emerald-600',
          bgActive: 'bg-emerald-50/40 hover:bg-emerald-50/80',
          icon: <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />,
          actionText: 'View Stage Progress'
        };
      default:
        return {
          pill: 'bg-slate-100 text-slate-800 border-slate-200',
          badgeText: 'SYSTEM NOTICE',
          borderAccent: 'border-l-4 border-slate-400',
          bgActive: 'bg-slate-50 hover:bg-slate-100',
          icon: <Bell className="w-4 h-4 text-slate-600 shrink-0" />,
          actionText: 'View Details'
        };
    }
  };

  const handleCardClick = (e: React.MouseEvent, notif: AppNotification) => {
    e.preventDefault();
    e.stopPropagation();
    if (!notif.read) {
      if (notif.data?.groupedIds && Array.isArray(notif.data.groupedIds)) {
        notif.data.groupedIds.forEach((id: string) => onMarkRead(id));
      }
      onMarkRead(notif.id);
    }
    onSelectNotification(notif);
    onClose();
  };

  return (
    <div 
      ref={panelRef}
      onClick={(e) => e.stopPropagation()}
      className="w-[92vw] sm:w-[440px] max-w-[460px] bg-white border border-slate-300 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[86vh] animate-in fade-in slide-in-from-top-2 duration-150 text-slate-900"
    >
      {/* Top Header */}
      <div className="px-4 py-3 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between border-b border-slate-700">
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 rounded-xl">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-black tracking-tight text-white">
                Notifications
              </h3>
              {unreadTotal > 0 && (
                <span className="px-2 py-0.5 bg-rose-500 text-white text-[10px] font-black rounded-full shadow-xs">
                  {unreadTotal} new
                </span>
              )}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1">
          {unreadTotal > 0 && (
            <button
              type="button"
              onClick={onMarkAllRead}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-slate-700/60 rounded-lg text-xs font-medium transition-colors cursor-pointer"
              title="Mark all as read"
            >
              <CheckCheck className="w-4 h-4" />
            </button>
          )}
          {notifications.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
              title="Clear all notifications"
            >
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          )}
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-700/60 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="px-3 py-2 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => setActiveFilter('FOR_ME')}
          className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
            activeFilter === 'FOR_ME'
              ? 'bg-indigo-600 text-white shadow-sm ring-1 ring-indigo-600 font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 border border-slate-300 font-medium'
          }`}
        >
          <span>Assigned to Me</span>
          {unreadForMe > 0 && (
            <span className={`px-1.5 py-0.5 rounded-full text-[9px] font-black ${
              activeFilter === 'FOR_ME' ? 'bg-white text-indigo-700' : 'bg-rose-500 text-white'
            }`}>
              {unreadForMe}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('ALL')}
          className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer ${
            activeFilter === 'ALL'
              ? 'bg-slate-900 text-white shadow-sm ring-1 ring-slate-900 font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 border border-slate-300 font-medium'
          }`}
        >
          All Updates ({notifications.length})
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('FMS')}
          className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer ${
            activeFilter === 'FMS'
              ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-600 font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 border border-slate-300 font-medium'
          }`}
        >
          FMS & Approvals
        </button>

        <button
          type="button"
          onClick={() => setActiveFilter('ALERTS')}
          className={`px-2.5 py-1 text-xs rounded-lg transition-all cursor-pointer ${
            activeFilter === 'ALERTS'
              ? 'bg-amber-600 text-white shadow-sm ring-1 ring-amber-600 font-bold'
              : 'bg-white text-slate-700 hover:bg-slate-100 hover:text-slate-950 border border-slate-300 font-medium'
          }`}
        >
          Tasks
        </button>
      </div>

      {/* Browser Notification Banner */}
      {isBrowserNotificationSupported() && desktopPermission !== 'granted' && desktopPermission !== 'denied' && (
        <div className="px-3.5 py-2.5 bg-indigo-50 border-b border-indigo-200 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <Volume2 className="w-4 h-4 text-indigo-600 shrink-0" />
            <p className="text-[11px] text-indigo-950 font-semibold leading-tight">
              Enable browser desktop alerts for urgent FMS approvals & SLA breaches
            </p>
          </div>
          <button
            type="button"
            onClick={onRequestDesktopPermission}
            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg shrink-0 shadow-2xs transition-colors cursor-pointer"
          >
            Enable Now
          </button>
        </div>
      )}

      {/* Notifications List */}
      <div className="overflow-y-auto flex-1 divide-y divide-slate-100 p-2 space-y-2">
        {filteredNotifications.length === 0 ? (
          <div className="py-12 px-4 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-slate-100 flex items-center justify-center text-slate-400 mb-2.5">
              <Bell className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm font-bold text-slate-800">No notifications here</p>
            <p className="text-xs text-slate-500 mt-1">
              {activeFilter === 'FOR_ME'
                ? `No pending action items directly assigned to ${currentUser?.name || 'your user account'}.`
                : 'No alerts found for this filter tab.'}
            </p>
            {activeFilter !== 'ALL' && (
              <button
                type="button"
                onClick={() => setActiveFilter('ALL')}
                className="mt-3 px-3 py-1.5 text-xs font-bold text-indigo-600 bg-indigo-50 hover:bg-indigo-100 rounded-lg transition-colors cursor-pointer"
              >
                View all team notifications
              </button>
            )}
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const theme = getNotificationTheme(notif);
            const isUserTarget = isDirectlyForUser(notif);

            return (
              <div
                key={notif.id}
                onClick={(e) => handleCardClick(e, notif)}
                className={`group relative rounded-xl border p-3 transition-all cursor-pointer text-left shadow-2xs ${
                  theme.borderAccent
                } ${
                  notif.read
                    ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/80'
                    : `${theme.bgActive} border-slate-300 shadow-xs`
                }`}
              >
                {/* Header row of notification card */}
                <div className="flex items-center justify-between gap-1.5 mb-1.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 text-[9px] font-black uppercase tracking-wider rounded-md border ${theme.pill} flex items-center gap-1`}>
                      {theme.icon}
                      {theme.badgeText}
                    </span>

                    {/* Target Recipient Chip if directly assigned */}
                    {isUserTarget && (
                      <span className="px-1.5 py-0.5 text-[9px] font-black bg-indigo-100 text-indigo-800 rounded border border-indigo-200 flex items-center gap-0.5">
                        <User className="w-2.5 h-2.5" />
                        For You
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="text-[10px] text-slate-500 font-medium">
                      {notif.timestamp}
                    </span>
                    {!notif.read && (
                      <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" title="Unread" />
                    )}
                  </div>
                </div>

                {/* Title */}
                <h4 className={`text-xs mb-1 leading-snug ${
                  notif.read ? 'text-slate-800 font-bold' : 'text-slate-950 font-black'
                }`}>
                  {notif.title}
                </h4>

                {/* Message Body */}
                <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed">
                  {notif.message}
                </p>

                {/* Action CTA Button at bottom */}
                <div className="mt-2.5 pt-2 border-t border-slate-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-1 text-[11px] font-bold text-indigo-600 group-hover:text-indigo-700 group-hover:translate-x-0.5 transition-all">
                    <span>{theme.actionText}</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>

                  {!notif.read && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (notif.data?.groupedIds && Array.isArray(notif.data.groupedIds)) {
                          notif.data.groupedIds.forEach((id: string) => onMarkRead(id));
                        }
                        onMarkRead(notif.id);
                      }}
                      className="text-[10px] text-slate-400 hover:text-slate-700 font-medium hover:underline p-0.5"
                    >
                      Mark read
                    </button>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-[11px] text-slate-500">
        <span>Showing {filteredNotifications.length} items</span>
        <span className="text-slate-400">Click any notification to open & take action</span>
      </div>
    </div>
  );
};
