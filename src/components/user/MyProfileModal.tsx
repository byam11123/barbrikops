import React, { useState, useMemo } from 'react';
import { 
  X, 
  User, 
  ShieldCheck, 
  Phone, 
  Mail, 
  MapPin, 
  Clock, 
  CheckCircle2, 
  KeyRound, 
  Laptop, 
  LogOut, 
  Save, 
  Lock, 
  ShieldAlert, 
  BarChart3,
  ArrowUpRight,
  Activity,
  GitBranch,
  ListTodo,
  CheckSquare,
  Search,
  Filter,
  Calendar,
  AlertCircle,
  ExternalLink,
  ChevronRight,
  Sparkles
} from 'lucide-react';
import { 
  UserProfile, 
  FmsInstance, 
  DelegationTask, 
  ChecklistItem, 
  AuditLogEntry,
  isUserSuperAdmin 
} from '../../types';

export interface ActivityStreamItem {
  id: string;
  module: 'FMS' | 'DELEGATION' | 'CHECKLIST';
  actionType: 'ADVANCED' | 'COMPLETED' | 'CREATED' | 'REVISED' | 'REMARK' | 'ASSIGNED' | 'CHECKED';
  title: string;
  description: string;
  timestamp: string; // ISO or readable
  referenceId: string;
  statusBadge?: string;
  badgeColor?: string;
  secondaryInfo?: string;
}

interface MyProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onUpdateProfile: (updated: UserProfile) => void;
  onLogout: () => void;
  onNavigateToScoreboard?: () => void;
  fmsFlows?: FmsInstance[];
  delegationTasks?: DelegationTask[];
  checklistItems?: ChecklistItem[];
  auditLogs?: AuditLogEntry[];
}

export const MyProfileModal: React.FC<MyProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUpdateProfile,
  onLogout,
  onNavigateToScoreboard,
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
          // If completed / advanced
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
              badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-300',
              secondaryInfo: `Target: ${stage.plannedDateTime || 'Scheduled'}`,
            });
          }
        }

        // Remarks added in this stage
        if (stage.processRemarks && stage.processRemarks.length > 0) {
          stage.processRemarks.forEach((rem, rIdx) => {
            if (matchesUser(rem.authorName) || matchesUser(rem.authorRole)) {
              list.push({
                id: `fms-rem-${flow.id}-${stage.stageId}-${rIdx}`,
                module: 'FMS',
                actionType: 'REMARK',
                title: `Logged Remark on Stage: ${stage.stageName}`,
                description: `"${rem.remarkText}" [Category: ${rem.category}]`,
                timestamp: rem.timestamp,
                referenceId: `FMS-${flow.indentNo || flow.flowId}`,
                statusBadge: 'Remark',
                badgeColor: 'bg-purple-100 text-purple-800 border-purple-300',
                secondaryInfo: `Indent: ${flow.indentNo}`,
              });
            }
          });
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

        // Remarks on delegation task
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

    // 4. Also check Audit Logs for direct actions initiated by this user
    auditLogs.forEach((entry) => {
      if (
        entry.userId === currentUser.userId ||
        matchesUser(entry.userName) ||
        matchesUser(entry.userId)
      ) {
        if (
          entry.module === 'FMS' ||
          entry.module === 'DELEGATION' ||
          entry.module === 'CHECKLIST'
        ) {
          list.push({
            id: `audit-${entry.auditId}`,
            module: entry.module,
            actionType: entry.action === 'CREATE' ? 'CREATED' : entry.action === 'STAGE_ADVANCE' ? 'ADVANCED' : 'COMPLETED',
            title: `${entry.action.replace(/_/g, ' ')}: ${entry.entityId}`,
            description: entry.details,
            timestamp: entry.timestamp,
            referenceId: entry.entityId,
            statusBadge: entry.action,
            badgeColor: 'bg-indigo-100 text-indigo-800 border-indigo-200',
            secondaryInfo: `Audit #${entry.auditId.slice(0, 10)}`,
          });
        }
      }
    });

    // Deduplicate by ID and sort descending by timestamp
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

  if (!isOpen) return null;

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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Top Banner */}
        <div className="bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white p-4 sm:p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>

          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-4">
            <div className="relative">
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-indigo-600 border-2 border-indigo-400/50 flex items-center justify-center text-white font-black text-2xl shadow-xl">
                {currentUser.name ? currentUser.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <span className="absolute -bottom-1 -right-1 bg-emerald-500 text-white text-[9px] font-black px-1.5 py-0.2 rounded-full border-2 border-slate-900 flex items-center gap-0.5 shadow-xs">
                <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />
                ONLINE
              </span>
            </div>

            <div className="text-center sm:text-left space-y-1">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">{currentUser.name}</h2>
                <span className="text-[10px] font-extrabold bg-indigo-500/30 text-indigo-300 border border-indigo-400/40 px-2 py-0.5 rounded-full uppercase">
                  {currentUser.role || 'Staff Member'}
                </span>
                {isUserSuperAdmin(currentUser) && (
                  <span className="text-[10px] font-extrabold bg-amber-500 text-slate-950 px-2 py-0.5 rounded-full uppercase flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> {currentUser.systemRole === 'SUPER_ADMIN' ? 'SUPER ADMIN' : 'ADMINISTRATOR'}
                  </span>
                )}
              </div>

              <p className="text-xs text-indigo-200">
                {currentUser.departmentName || 'Operations Department'} • {currentUser.email}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-[11px] text-slate-300 font-medium">
                <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-indigo-400" /> {currentUser.siteLocation || 'Siladehi Site'}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5 text-indigo-400" /> {currentUser.shiftHours || 'General Shift'}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-2 overflow-x-auto">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('PROFILE')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'PROFILE'
                  ? 'border-indigo-600 text-indigo-950 font-black'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Online User Profile</span>
            </button>

            <button
              onClick={() => setActiveTab('ACTIVITY')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'ACTIVITY'
                  ? 'border-indigo-600 text-indigo-950 font-black'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Activity className="w-3.5 h-3.5 text-indigo-600" />
              <span>Activity Stream</span>
              {activityStream.length > 0 && (
                <span className="text-[10px] font-black px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-800">
                  {activityStream.length}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('SECURITY')}
              className={`py-3 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
                activeTab === 'SECURITY'
                  ? 'border-indigo-600 text-indigo-950 font-black'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-3.5 h-3.5 text-indigo-600" />
              <span>Login Sessions &amp; Security</span>
            </button>
          </div>

          {onNavigateToScoreboard && (
            <button
              type="button"
              onClick={onNavigateToScoreboard}
              className="py-1.5 px-3 bg-white hover:bg-indigo-50 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
              title="Open full operational scoreboard in sidebar"
            >
              <BarChart3 className="w-3.5 h-3.5 text-indigo-600" />
              <span>Open My Scoreboard</span>
              <ArrowUpRight className="w-3 h-3 text-indigo-400" />
            </button>
          )}
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4">
          
          {/* TAB 1: ONLINE USER PROFILE */}
          {activeTab === 'PROFILE' && (
            <form onSubmit={handleSaveProfile} className="space-y-4 text-xs">
              
              {isSaved && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Profile updated and synced successfully!</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Full Name</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Designation / Role</label>
                  <input
                    type="text"
                    value={currentUser.role}
                    disabled
                    className="w-full bg-slate-100 border border-slate-200 rounded-lg p-2 font-semibold text-slate-500 cursor-not-allowed"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">WhatsApp Mobile Number</label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Official Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Default Site / Store Location</label>
                  <select
                    value={siteLocation}
                    onChange={(e) => setSiteLocation(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Siladehi Site">Siladehi Site</option>
                    <option value="Bijetala Site">Bijetala Site</option>
                    <option value="Raipur Office">Raipur Office</option>
                    <option value="Central Store">Central Store - Raipur</option>
                    <option value="Raipur Workshop">Raipur Workshop</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-700">Work Shift Hours</label>
                  <input
                    type="text"
                    value={shiftHours}
                    onChange={(e) => setShiftHours(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-between">
                <button
                  type="button"
                  onClick={onLogout}
                  className="px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out of Session</span>
                </button>

                <button
                  type="submit"
                  className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-white" />
                  <span>Save Profile Updates</span>
                </button>
              </div>
            </form>
          )}

          {/* TAB 2: LIVE ACTIVITY STREAM FEED */}
          {activeTab === 'ACTIVITY' && (
            <div className="space-y-4 text-xs">
              
              {/* Header Card & Quick Stats */}
              <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 rounded-2xl shadow-sm border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <div className="p-1.5 bg-indigo-600 rounded-lg">
                      <Activity className="w-4 h-4 text-white" />
                    </div>
                    <h3 className="font-extrabold text-sm tracking-tight">Personal Activity Stream</h3>
                    <span className="text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full flex items-center gap-1">
                      <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping" />
                      LIVE FEED
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    Unified audit feed of your actions across FMS Workflows, Task Delegations, and Checklist SOPs.
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <div className="bg-slate-800/80 border border-slate-700 rounded-xl px-3 py-1.5 text-center">
                    <span className="text-[10px] text-slate-400 block font-semibold">Total Actions</span>
                    <span className="text-sm font-black text-white">{activityCounts.total}</span>
                  </div>
                </div>
              </div>

              {/* Filters & Search Toolbar */}
              <div className="bg-slate-50 border border-slate-200 p-2.5 rounded-2xl flex flex-col sm:flex-row items-center justify-between gap-2.5">
                {/* Module Pill Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
                  <button
                    type="button"
                    onClick={() => setActivityModuleFilter('ALL')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      activityModuleFilter === 'ALL'
                        ? 'bg-slate-900 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <span>All Actions</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-200/50 text-slate-700 font-extrabold">
                      {activityCounts.total}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivityModuleFilter('FMS')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      activityModuleFilter === 'FMS'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <GitBranch className="w-3 h-3" />
                    <span>FMS Flows</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-indigo-100 text-indigo-900 font-extrabold">
                      {activityCounts.fms}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivityModuleFilter('DELEGATION')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      activityModuleFilter === 'DELEGATION'
                        ? 'bg-amber-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <ListTodo className="w-3 h-3" />
                    <span>Delegation</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-amber-100 text-amber-900 font-extrabold">
                      {activityCounts.delegation}
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setActivityModuleFilter('CHECKLIST')}
                    className={`px-3 py-1.5 rounded-xl font-bold text-xs transition-colors flex items-center gap-1 cursor-pointer whitespace-nowrap ${
                      activityModuleFilter === 'CHECKLIST'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
                    }`}
                  >
                    <CheckSquare className="w-3 h-3" />
                    <span>Checklist</span>
                    <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-100 text-emerald-900 font-extrabold">
                      {activityCounts.checklist}
                    </span>
                  </button>
                </div>

                {/* Search Input */}
                <div className="relative w-full sm:w-64">
                  <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    value={activitySearchQuery}
                    onChange={(e) => setActivitySearchQuery(e.target.value)}
                    placeholder="Search actions, id, notes..."
                    className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                  {activitySearchQuery && (
                    <button
                      type="button"
                      onClick={() => setActivitySearchQuery('')}
                      className="absolute right-2.5 top-2 text-slate-400 hover:text-slate-600 cursor-pointer text-xs"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>

              {/* Feed List Items */}
              {filteredActivityStream.length === 0 ? (
                <div className="p-10 text-center bg-slate-50 border border-dashed border-slate-200 rounded-2xl space-y-2">
                  <div className="w-10 h-10 mx-auto rounded-full bg-slate-200 flex items-center justify-center text-slate-400">
                    <Activity className="w-5 h-5" />
                  </div>
                  <h4 className="font-bold text-slate-700">No activity logged yet</h4>
                  <p className="text-[11px] text-slate-500 max-w-sm mx-auto">
                    {activitySearchQuery
                      ? 'No events match your current search query. Try clearing the search box.'
                      : 'As you complete stages in FMS, execute delegation tasks, or check off checklist items, your chronological stream will appear here.'}
                  </p>
                </div>
              ) : (
                <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
                  {filteredActivityStream.map((item) => {
                    const isFms = item.module === 'FMS';
                    const isDel = item.module === 'DELEGATION';
                    const isChk = item.module === 'CHECKLIST';

                    const moduleBadgeColor = isFms
                      ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                      : isDel
                      ? 'bg-amber-50 text-amber-700 border-amber-200'
                      : 'bg-emerald-50 text-emerald-700 border-emerald-200';

                    const ModuleIcon = isFms
                      ? GitBranch
                      : isDel
                      ? ListTodo
                      : CheckSquare;

                    return (
                      <div
                        key={item.id}
                        className="p-3.5 bg-white hover:bg-slate-50/80 border border-slate-200 rounded-2xl transition-all shadow-2xs hover:shadow-xs flex items-start gap-3 group"
                      >
                        {/* Module Icon Accent */}
                        <div
                          className={`p-2 rounded-xl shrink-0 border ${
                            isFms
                              ? 'bg-indigo-50 text-indigo-600 border-indigo-100'
                              : isDel
                              ? 'bg-amber-50 text-amber-600 border-amber-100'
                              : 'bg-emerald-50 text-emerald-600 border-emerald-100'
                          }`}
                        >
                          <ModuleIcon className="w-4 h-4" />
                        </div>

                        {/* Event Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span
                                className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md border ${moduleBadgeColor}`}
                              >
                                {item.module}
                              </span>
                              <span className="font-mono text-[10px] font-bold text-slate-500">
                                #{item.referenceId}
                              </span>
                              {item.statusBadge && (
                                <span
                                  className={`text-[10px] font-extrabold px-2 py-0.2 rounded-full border ${
                                    item.badgeColor || 'bg-slate-100 text-slate-700 border-slate-200'
                                  }`}
                                >
                                  {item.statusBadge}
                                </span>
                              )}
                            </div>

                            <span className="text-[10px] font-semibold text-slate-400 flex items-center gap-1 whitespace-nowrap">
                              <Clock className="w-3 h-3 text-slate-400" />
                              {item.timestamp}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 mt-1 text-xs">
                            {item.title}
                          </h4>

                          <p className="text-[11px] text-slate-600 mt-0.5 leading-relaxed">
                            {item.description}
                          </p>

                          {item.secondaryInfo && (
                            <div className="mt-2 text-[10px] font-semibold text-slate-500 flex items-center gap-2">
                              <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-md">
                                {item.secondaryInfo}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: LOGIN SESSIONS & SECURITY */}
          {activeTab === 'SECURITY' && (
            <div className="space-y-5 text-xs">
              
              {securityMessage && (
                <div className="p-3 bg-indigo-50 border border-indigo-200 text-indigo-950 rounded-xl font-bold flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span>{securityMessage}</span>
                </div>
              )}

              {/* Change Password */}
              <form onSubmit={handleUpdatePassword} className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                  <KeyRound className="w-4 h-4 text-indigo-600" /> Change Account Password
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">New Password</label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Enter new password"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="block font-bold text-slate-700">Confirm New Password</label>
                    <input
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Confirm new password"
                      className="w-full bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg transition-colors cursor-pointer"
                >
                  Update Password
                </button>
              </form>

              {/* Set 4-Digit Security PIN */}
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-bold text-xs text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Lock className="w-4 h-4 text-emerald-600" /> 4-Digit Security Approval PIN
                  </h3>
                  <span className="text-[10px] text-slate-500">Used for high-value FMS voucher approvals</span>
                </div>

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
              <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 space-y-3">
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
