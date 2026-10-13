import React, { useState, useMemo } from 'react';
import { 
  User, 
  ShieldCheck, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  Laptop, 
  LogOut, 
  ShieldAlert, 
  Activity,
  GitBranch,
  ListTodo,
  CheckSquare,
  Search,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  ArrowLeft
} from 'lucide-react';
import { 
  UserProfile, 
  FmsInstance, 
  DelegationTask, 
  ChecklistItem, 
  AuditLogEntry,
  isUserSuperAdmin 
} from '../../types';
import { UserAvatar } from '../common/UserAvatar';

export interface ActivityStreamItem {
  id: string;
  module: 'FMS' | 'DELEGATION' | 'CHECKLIST';
  actionType: 'ADVANCED' | 'COMPLETED' | 'CREATED' | 'REVISED' | 'REMARK' | 'ASSIGNED' | 'CHECKED';
  title: string;
  description: string;
  timestamp: string;
  referenceId: string;
  statusBadge?: string;
  badgeColor?: string;
  secondaryInfo?: string;
}

interface MyProfilePageProps {
  currentUser: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onLogout: () => void;
  onNavigateToScoreboard?: () => void;
  onBackToDashboard?: () => void;
  fmsFlows?: FmsInstance[];
  delegationTasks?: DelegationTask[];
  checklistItems?: ChecklistItem[];
  auditLogs?: AuditLogEntry[];
}

export const MyProfilePage: React.FC<MyProfilePageProps> = ({
  currentUser,
  onUpdateProfile,
  onLogout,
  onNavigateToScoreboard,
  onBackToDashboard,
  fmsFlows = [],
  delegationTasks = [],
  checklistItems = [],
  auditLogs = [],
}) => {
  const [activeTab, setActiveTab] = useState<'PROFILE' | 'ACTIVITY' | 'SECURITY'>('PROFILE');
  const [activityModuleFilter, setActivityModuleFilter] = useState<'ALL' | 'FMS' | 'DELEGATION' | 'CHECKLIST'>('ALL');
  const [activitySearchQuery, setActivitySearchQuery] = useState('');

  // Editable Profile States
  const [name, setName] = useState(currentUser.name || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  const [email, setEmail] = useState(currentUser.email || '');
  const [siteLocation, setSiteLocation] = useState(currentUser.siteLocation || 'Siladehi Site');
  const [shiftHours, setShiftHours] = useState(currentUser.shiftHours || 'General Shift 08:00 - 18:00');
  const [approvalPin, setApprovalPin] = useState(currentUser.approvalPin || '1234');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  
  const [isSaved, setIsSaved] = useState(false);
  const [securityMessage, setSecurityMessage] = useState<string | null>(null);

  // Compute live Activity Stream feed for current user across FMS, Delegation, Checklist & Audit Logs
  const activityStream = useMemo(() => {
    const list: ActivityStreamItem[] = [];
    const uName = (currentUser.name || '').trim().toLowerCase();
    const uEmail = (currentUser.email || '').trim().toLowerCase();
    const uRole = (currentUser.role || '').trim().toLowerCase();

    const matchesUser = (str?: string) => {
      if (!str) return false;
      const s = str.trim().toLowerCase();
      return (
        s === uName ||
        s === uEmail ||
        s.includes(uName) ||
        (uRole && s.includes(uRole))
      );
    };

    // 1. FMS Actions & Stages
    fmsFlows.forEach((flow) => {
      flow.stages.forEach((stage, idx) => {
        const isUserStage = matchesUser(stage.assignee) || matchesUser(stage.doerName);
        if (isUserStage) {
          if (stage.status === 'Completed' || stage.status === 'Done') {
            list.push({
              id: `fms-done-${flow.id}-${stage.stageId}-${idx}`,
              module: 'FMS',
              actionType: 'COMPLETED',
              title: `Completed Stage: ${stage.stageName}`,
              description: `Finalized stage for Flow #${flow.indentNo || flow.flowId} (${flow.flowType.replace(/_/g, ' ')}) at ${flow.siteName}`,
              timestamp: stage.actualDateTime || flow.updatedAt || flow.createdAt,
              referenceId: `FMS-${flow.indentNo || flow.flowId}`,
              statusBadge: 'Done',
              badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
              secondaryInfo: stage.how ? `Channel: ${stage.how}` : undefined,
            });
          } else if (stage.status === 'In Progress') {
            const stageSla = stage.logic?.slaHours ?? 24;
            list.push({
              id: `fms-prog-${flow.id}-${stage.stageId}-${idx}`,
              module: 'FMS',
              actionType: 'ADVANCED',
              title: `Working on Stage: ${stage.stageName}`,
              description: `Active workflow stage in progress for #${flow.indentNo || flow.flowId} (SLA: ${stageSla}h)`,
              timestamp: flow.updatedAt || flow.createdAt,
              referenceId: `FMS-${flow.indentNo || flow.flowId}`,
              statusBadge: 'In Progress',
              badgeColor: 'bg-blue-100 text-blue-800 border-blue-300',
              secondaryInfo: `Stage #${idx + 1} of ${flow.stages.length}`,
            });
          }
        }
      });
    });

    // 2. Delegation Module Tasks
    delegationTasks.forEach((dTask) => {
      if (matchesUser(dTask.name) || matchesUser(dTask.rolePhone)) {
        if (dTask.status === 'Completed') {
          list.push({
            id: `del-done-${dTask.taskId}`,
            module: 'DELEGATION',
            actionType: 'COMPLETED',
            title: `Completed Delegation: ${dTask.task}`,
            description: `Successfully closed delegated task #${dTask.taskId} (Target was ${dTask.firstDate})`,
            timestamp: dTask.completedAt || dTask.firstDate,
            referenceId: dTask.taskId,
            statusBadge: 'Completed',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            secondaryInfo: dTask.priority ? `Priority: ${dTask.priority}` : undefined,
          });
        } else {
          list.push({
            id: `del-pend-${dTask.taskId}`,
            module: 'DELEGATION',
            actionType: 'ASSIGNED',
            title: `Assigned Delegation: ${dTask.task}`,
            description: `Pending task execution assigned to you #${dTask.taskId}. Target date: ${dTask.firstDate}`,
            timestamp: dTask.firstDate,
            referenceId: dTask.taskId,
            statusBadge: dTask.status,
            badgeColor: dTask.status === 'Week Shifted' ? 'bg-amber-100 text-amber-800 border-amber-300' : 'bg-blue-100 text-blue-800 border-blue-300',
            secondaryInfo: dTask.revisionHistory?.length ? `Revisions: ${dTask.revisionHistory.length}` : undefined,
          });
        }

        // Delegation revisions logged by user
        if (dTask.revisionHistory) {
          dTask.revisionHistory.forEach((rev, revIdx) => {
            if (matchesUser(rev.revisedBy)) {
              list.push({
                id: `del-rev-${dTask.taskId}-${revIdx}`,
                module: 'DELEGATION',
                actionType: 'REVISED',
                title: `Shifted Target Date: Rev #${rev.revisionNumber}`,
                description: `Shifted date from ${rev.previousDate} to ${rev.newDate}. Reason: "${rev.reason}"`,
                timestamp: rev.timestamp,
                referenceId: dTask.taskId,
                statusBadge: 'Revision',
                badgeColor: 'bg-amber-100 text-amber-800 border-amber-300',
                secondaryInfo: `Task: ${dTask.task.slice(0, 30)}...`,
              });
            }
          });
        }

        if (dTask.processRemarks) {
          dTask.processRemarks.forEach((rem, rIdx) => {
            if (matchesUser(rem.authorName)) {
              list.push({
                id: `del-rem-${dTask.taskId}-${rIdx}`,
                module: 'DELEGATION',
                actionType: 'REMARK',
                title: `Logged Note on Delegation #${dTask.taskId}`,
                description: `"${rem.remarkText}"`,
                timestamp: rem.timestamp,
                referenceId: dTask.taskId,
                statusBadge: 'Note',
                badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
              });
            }
          });
        }
      }
    });

    // 3. Checklist Management Items
    checklistItems.forEach((chk) => {
      if (matchesUser(chk.name) || matchesUser(chk.email)) {
        if (chk.status === 'Done') {
          list.push({
            id: `chk-done-${chk.taskId}`,
            module: 'CHECKLIST',
            actionType: 'COMPLETED',
            title: `Executed Checklist: ${chk.task}`,
            description: `Recurring ${chk.frequency === 'D' ? 'Daily' : chk.frequency === 'W' ? 'Weekly' : 'Monthly'} SOP task checked off (${chk.department})`,
            timestamp: chk.actualDate || chk.plannedDate,
            referenceId: chk.taskId,
            statusBadge: 'Done',
            badgeColor: 'bg-emerald-100 text-emerald-800 border-emerald-300',
            secondaryInfo: `Freq: ${chk.frequency}`,
          });
        } else {
          list.push({
            id: `chk-pend-${chk.taskId}`,
            module: 'CHECKLIST',
            actionType: 'ASSIGNED',
            title: `Scheduled Checklist: ${chk.task}`,
            description: `Scheduled operational checklist item for ${chk.plannedDate} (${chk.department})`,
            timestamp: chk.plannedDate,
            referenceId: chk.taskId,
            statusBadge: 'Pending',
            badgeColor: 'bg-slate-100 text-slate-800 border-slate-300',
            secondaryInfo: `Freq: ${chk.frequency}`,
          });
        }

        // Remarks on checklist
        if (chk.processRemarks) {
          chk.processRemarks.forEach((rem, rIdx) => {
            if (matchesUser(rem.authorName)) {
              list.push({
                id: `chk-rem-${chk.taskId}-${rIdx}`,
                module: 'CHECKLIST',
                actionType: 'REMARK',
                title: `Logged Note on Checklist #${chk.taskId}`,
                description: `"${rem.remarkText}"`,
                timestamp: rem.timestamp,
                referenceId: chk.taskId,
                statusBadge: 'Note',
                badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
              });
            }
          });
        }
      }
    });

    const uniqueMap = new Map<string, ActivityStreamItem>();
    list.forEach((item) => {
      if (!uniqueMap.has(item.id)) {
        uniqueMap.set(item.id, item);
      }
    });

    return Array.from(uniqueMap.values()).sort((a, b) => {
      const timeA = new Date(a.timestamp).getTime() || 0;
      const timeB = new Date(b.timestamp).getTime() || 0;
      if (timeA && timeB) return timeB - timeA;
      return b.timestamp.localeCompare(a.timestamp);
    });
  }, [currentUser, fmsFlows, delegationTasks, checklistItems, auditLogs]);

  // Filtered activity stream
  const filteredActivityStream = useMemo(() => {
    return activityStream.filter((item) => {
      const matchesModule =
        activityModuleFilter === 'ALL' || item.module === activityModuleFilter;
      if (!matchesModule) return false;

      if (!activitySearchQuery.trim()) return true;
      const q = activitySearchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.description.toLowerCase().includes(q) ||
        item.referenceId.toLowerCase().includes(q)
      );
    });
  }, [activityStream, activityModuleFilter, activitySearchQuery]);

  // Activity module counts
  const activityCounts = useMemo(() => {
    return {
      total: activityStream.length,
      fms: activityStream.filter((a) => a.module === 'FMS').length,
      delegation: activityStream.filter((a) => a.module === 'DELEGATION').length,
      checklist: activityStream.filter((a) => a.module === 'CHECKLIST').length,
    };
  }, [activityStream]);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: UserProfile = {
      ...currentUser,
      name,
      phone,
      email,
      siteLocation,
      shiftHours,
      approvalPin,
    };
    onUpdateProfile(updated);
    setIsSaved(true);
    setTimeout(() => setIsSaved(false), 3000);
  };

  const handleUpdatePassword = (e: React.FormEvent) => {
    e.preventDefault();
    setSecurityMessage(null);

    if (!newPassword || newPassword.length < 4) {
      setSecurityMessage('Password must be at least 4 characters long.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setSecurityMessage('New password and confirm password do not match.');
      return;
    }

    const updated: UserProfile = {
      ...currentUser,
      password: newPassword,
    };
    onUpdateProfile(updated);
    setSecurityMessage('Password updated successfully!');
    setNewPassword('');
    setConfirmPassword('');
    setCurrentPassword('');
  };

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6 animate-in fade-in duration-200">
      {/* Top Breadcrumb & Action Row */}
      {onBackToDashboard && (
        <div className="flex items-center justify-between">
          <button
            type="button"
            onClick={onBackToDashboard}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-indigo-600 transition-colors cursor-pointer bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-2xs"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Operations</span>
          </button>
        </div>
      )}

      {/* Main Container Card */}
      <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden">
        {/* Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-6 sm:p-8 relative">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
            <div className="relative">
              <UserAvatar user={currentUser} size="lg" className="w-20 h-20 text-2xl shadow-xl border-2 border-indigo-400/50" />
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded-full border-2 border-slate-900 flex items-center gap-1 shadow-xs">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                ONLINE
              </span>
            </div>

            <div className="text-center sm:text-left space-y-1.5 flex-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
                <h1 className="text-xl sm:text-2xl font-black tracking-tight">{currentUser.name}</h1>
                <span className="text-[11px] font-extrabold bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 px-2.5 py-0.5 rounded-full uppercase tracking-wide">
                  {currentUser.role || 'Staff Member'}
                </span>
                {isUserSuperAdmin(currentUser) && (
                  <span className="text-[11px] font-extrabold bg-amber-500 text-slate-950 px-2.5 py-0.5 rounded-full uppercase flex items-center gap-1 shadow-xs">
                    <ShieldCheck className="w-3.5 h-3.5" /> {currentUser.systemRole === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'ADMINISTRATOR'}
                  </span>
                )}
              </div>

              <p className="text-xs sm:text-sm text-indigo-200">
                {currentUser.departmentName || 'Operations Department'} • {currentUser.email}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 pt-1 text-xs text-slate-300 font-medium">
                <span className="flex items-center gap-1.5"><MapPin className="w-4 h-4 text-indigo-400" /> {currentUser.siteLocation || 'Siladehi Site'}</span>
                <span className="flex items-center gap-1.5"><Clock className="w-4 h-4 text-indigo-400" /> {currentUser.shiftHours || 'General Shift'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation - Responsive without scrollbar */}
        <div className="bg-slate-50 border-b border-slate-200 p-2 sm:px-6 sm:py-0">
          <div className="grid grid-cols-3 gap-1.5 sm:flex sm:items-center sm:gap-2 w-full">
            <button
              type="button"
              onClick={() => setActiveTab('PROFILE')}
              className={`py-2 sm:py-3.5 px-2 sm:px-4 text-xs font-bold transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer rounded-lg sm:rounded-none sm:border-b-2 ${
                activeTab === 'PROFILE'
                  ? 'bg-white text-indigo-950 font-black shadow-xs sm:shadow-none sm:border-indigo-600 sm:bg-white sm:-mb-px'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 sm:hover:bg-transparent'
              }`}
            >
              <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="sm:hidden">Profile</span>
              <span className="hidden sm:inline">Online User Profile</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('ACTIVITY')}
              className={`py-2 sm:py-3.5 px-2 sm:px-4 text-xs font-bold transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer rounded-lg sm:rounded-none sm:border-b-2 ${
                activeTab === 'ACTIVITY'
                  ? 'bg-white text-indigo-950 font-black shadow-xs sm:shadow-none sm:border-indigo-600 sm:bg-white sm:-mb-px'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 sm:hover:bg-transparent'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="sm:hidden">Activity</span>
              <span className="hidden sm:inline">Activity Stream</span>
              {activityStream.length > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800 shrink-0">
                  {activityStream.length}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('SECURITY')}
              className={`py-2 sm:py-3.5 px-2 sm:px-4 text-xs font-bold transition-all flex items-center justify-center sm:justify-start gap-1.5 cursor-pointer rounded-lg sm:rounded-none sm:border-b-2 ${
                activeTab === 'SECURITY'
                  ? 'bg-white text-indigo-950 font-black shadow-xs sm:shadow-none sm:border-indigo-600 sm:bg-white sm:-mb-px'
                  : 'border-transparent text-slate-600 hover:text-slate-900 hover:bg-slate-100 sm:hover:bg-transparent'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <span className="sm:hidden">Security</span>
              <span className="hidden sm:inline">Login Sessions &amp; Security</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* TAB 1: ONLINE USER PROFILE */}
          {activeTab === 'PROFILE' && (
            <form onSubmit={handleSaveProfile} className="space-y-6 text-xs">
              {isSaved && (
                <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Profile updated and synced successfully!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Designation / Role</label>
                  <input
                    type="text"
                    value={currentUser.role}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2.5 font-semibold text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">WhatsApp Mobile Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Official Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Default Site / Store Location</label>
                  <select
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Siladehi Site">Siladehi Site</option>
                    <option value="Bijetala Site">Bijetala Site</option>
                    <option value="Raipur Office">Raipur Office</option>
                    <option value="Central Store">Central Store - Raipur</option>
                    <option value="Raipur Workshop">Raipur Workshop</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block font-bold text-slate-700">Work Shift Hours</label>
                  <input
                    type="text"
                    value={shiftHours}
                    onChange={(e) => setShiftHours(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2.5 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-4 py-2 border border-rose-200 text-rose-600 hover:bg-rose-50 rounded-xl font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Log Out of Session</span>
                </button>

                <button
                  type="submit"
                  className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 shadow-md hover:shadow-lg transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Save Profile Updates</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LIVE ACTIVITY STREAM */}
          {activeTab === 'ACTIVITY' && (
            <div className="space-y-4">
              {/* Search & Filter Header */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 pb-3 border-b border-slate-200">
                <div className="flex flex-wrap items-center gap-1.5 w-full sm:w-auto">
                  <button
                    onClick={() => setActivityModuleFilter('ALL')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      activityModuleFilter === 'ALL'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    All ({activityCounts.total})
                  </button>
                  <button
                    onClick={() => setActivityModuleFilter('FMS')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      activityModuleFilter === 'FMS'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <GitBranch className="w-3 h-3" /> FMS ({activityCounts.fms})
                  </button>
                  <button
                    onClick={() => setActivityModuleFilter('DELEGATION')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      activityModuleFilter === 'DELEGATION'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <ListTodo className="w-3 h-3" /> Delegation ({activityCounts.delegation})
                  </button>
                  <button
                    onClick={() => setActivityModuleFilter('CHECKLIST')}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1 cursor-pointer ${
                      activityModuleFilter === 'CHECKLIST'
                        ? 'bg-indigo-600 text-white shadow-2xs'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    <CheckSquare className="w-3 h-3" /> Checklist ({activityCounts.checklist})
                  </button>
                </div>

                <div className="relative w-full sm:w-56">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    placeholder="Search feed..."
                    className="w-full pl-8 pr-2.5 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              {/* Feed List */}
              <div className="space-y-3">
                {filteredActivityStream.length > 0 ? (
                  filteredActivityStream.map((item) => (
                    <div
                      key={item.id}
                      className="p-3.5 bg-slate-50/70 hover:bg-slate-50 border border-slate-200 rounded-xl flex items-start justify-between gap-3 transition-colors"
                    >
                      <div className="space-y-1 min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${
                              item.module === 'FMS'
                                ? 'bg-indigo-100 text-indigo-800 border-indigo-200'
                                : item.module === 'DELEGATION'
                                ? 'bg-purple-100 text-purple-800 border-purple-200'
                                : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                            }`}
                          >
                            {item.module}
                          </span>
                          <span className="text-xs font-bold text-slate-900 truncate">
                            {item.title}
                          </span>
                          {item.statusBadge && (
                            <span
                              className={`text-[9px] font-bold px-1.5 py-0.2 rounded-full border ${
                                item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                              }`}
                            >
                              {item.statusBadge}
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-slate-600 line-clamp-2">
                          {item.description}
                        </p>

                        <div className="flex items-center gap-3 text-[11px] text-slate-400 pt-0.5">
                          <span className="font-mono font-semibold text-indigo-600">
                            {item.referenceId}
                          </span>
                          <span>•</span>
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3 text-slate-400" /> {item.timestamp}
                          </span>
                          {item.secondaryInfo && (
                            <>
                              <span>•</span>
                              <span>{item.secondaryInfo}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <Activity className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700 text-sm">
                      No matching activity records found
                    </p>
                    <p className="text-xs text-slate-400">
                      Recent operations tasks, checklist logs, and FMS advances will appear here.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 3: LOGIN SESSIONS & SECURITY */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-6 text-xs">
              {/* Password update section */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-4">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldAlert className="w-4 h-4 text-indigo-600" /> Change Security Password
                </h3>

                {securityMessage && (
                  <div
                    className={`p-3 rounded-lg font-bold flex items-center gap-2 ${
                      securityMessage.includes('successfully')
                        ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                        : 'bg-rose-50 text-rose-800 border border-rose-200'
                    }`}
                  >
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{securityMessage}</span>
                  </div>
                )}

                <form onSubmit={handleUpdatePassword} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700">Current Password</label>
                      <input
                        type="password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700">New Password</label>
                      <input
                        type="password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block font-bold text-slate-700">Confirm New Password</label>
                      <input
                        type="password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        required
                      />
                    </div>
                  </div>

                  <div className="flex justify-end">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                    >
                      Update Password
                    </button>
                  </div>
                </form>
              </div>

              {/* Quick 4-digit approval PIN */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-600" /> Fast Operational Approval PIN (4-Digit)
                </h3>
                <p className="text-slate-500 text-xs">
                  This 4-digit PIN can be entered to fast-track verification signatures on purchase vouchers and stock releases.
                </p>

                <div className="flex items-center gap-3">
                  <input
                    type="password"
                    maxLength={4}
                    value={approvalPin}
                    onChange={(e) => setApprovalPin(e.target.value.replace(/\D/g, ''))}
                    placeholder="1234"
                    className="w-28 text-center text-base tracking-widest font-mono bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  <button
                    type="button"
                    onClick={handleSaveProfile}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                  >
                    Save Security PIN
                  </button>
                </div>
              </div>

              {/* Active Login Sessions */}
              <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <Laptop className="w-4 h-4 text-indigo-600" /> Active Login Sessions
                </h3>

                <div className="space-y-2">
                  <div className="bg-white p-3 rounded-lg border border-indigo-200 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
                        <Laptop className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="font-bold text-slate-800 text-xs">Current Active Session (Chrome / Linux Web)</div>
                        <div className="text-[10px] text-slate-500 font-mono">IP: 192.168.1.42 • Active since 09/10/2026 08:15 AM</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-extrabold bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full">
                      THIS DEVICE
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
