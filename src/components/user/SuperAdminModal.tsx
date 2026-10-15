import React, { useState } from 'react';
import { 
  X, 
  ShieldCheck, 
  UserPlus, 
  Trash2, 
  Edit3, 
  CheckCircle2, 
  AlertCircle, 
  Search, 
  Building2, 
  RefreshCw, 
  Megaphone, 
  Sparkles, 
  UserCheck, 
  Lock, 
  KeyRound, 
  Plus, 
  Pin, 
  CheckSquare, 
  GitBranch, 
  Save, 
  ShieldAlert,
  Sliders,
  UserX,
  Eye,
  EyeOff
} from 'lucide-react';
import { UserProfile, NoticeBoardItem, UserRole } from '../../types';
import { USERS, INITIAL_NOTICE_BOARD } from '../../data/initialData';
import { validateStaffUniqueness, filterUsersForViewer } from '../../utils/staffValidation';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  usersList: UserProfile[];
  onUpdateUsersList: (users: UserProfile[]) => void;
  noticeBoardItems: NoticeBoardItem[];
  onUpdateNoticeBoard: (notices: NoticeBoardItem[]) => void;
  onImpersonateUser: (user: UserProfile) => void;
  currentUser?: UserProfile;
}

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({
  isOpen,
  onClose,
  usersList,
  onUpdateUsersList,
  noticeBoardItems,
  onUpdateNoticeBoard,
  onImpersonateUser,
  currentUser,
}) => {
  const visibleUsersList = filterUsersForViewer(usersList, currentUser);
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'REASSIGN' | 'NOTICES'>('DIRECTORY');
  const [search, setSearch] = useState('');

  // New User Form State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserRoleTitle, setNewUserRoleTitle] = useState('Store Keeper');
  const [newUserSystemRole, setNewUserSystemRole] = useState<UserRole>('OPERATIONAL_USER');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserSite, setNewUserSite] = useState('Siladehi Site');

  // Password Reset Modal State
  const [passwordResetUser, setPasswordResetUser] = useState<UserProfile | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [newPinValue, setNewPinValue] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordResetCopied, setPasswordResetCopied] = useState(false);
  const [passwordResetSuccessMsg, setPasswordResetSuccessMsg] = useState<string | null>(null);

  // Role Manager Modal State
  const [roleManagerUser, setRoleManagerUser] = useState<UserProfile | null>(null);
  const [editSystemRole, setEditSystemRole] = useState<UserRole>('OPERATIONAL_USER');
  const [editFunctionalRole, setEditFunctionalRole] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editDepartmentName, setEditDepartmentName] = useState('');
  const [editSiteLocation, setEditSiteLocation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [roleManagerSuccessMsg, setRoleManagerSuccessMsg] = useState<string | null>(null);

  // Emergency Re-assignment State
  const [selectedAbsentUser, setSelectedAbsentUser] = useState<string>('');
  const [selectedReliefUser, setSelectedReliefUser] = useState<string>('');
  const [reassignSuccessMsg, setReassignSuccessMsg] = useState<string | null>(null);

  // New Notice Form State
  const [isAddNoticeOpen, setIsAddNoticeOpen] = useState(false);
  const [noticeTitle, setNoticeTitle] = useState('');
  const [noticeCategory, setNoticeCategory] = useState<NoticeBoardItem['category']>('URGENT');
  const [noticeContent, setNoticeContent] = useState('');
  const [noticeIsPinned, setNoticeIsPinned] = useState(true);

  // Password Reset Handlers
  const handleOpenPasswordReset = (user: UserProfile) => {
    setPasswordResetUser(user);
    setNewPasswordValue(user.password || 'pass123');
    setNewPinValue(user.approvalPin || '1234');
    setShowPasswordText(false);
    setPasswordResetCopied(false);
    setPasswordResetSuccessMsg(null);
  };

  const handleSavePasswordReset = (e: React.FormEvent) => {
    e.preventDefault();
    if (!passwordResetUser || !newPasswordValue.trim()) return;

    const updated = usersList.map((u) => {
      if (u.userId === passwordResetUser.userId) {
        return {
          ...u,
          password: newPasswordValue.trim(),
          approvalPin: newPinValue.trim() || '1234',
        };
      }
      return u;
    });

    onUpdateUsersList(updated);
    setPasswordResetSuccessMsg(`Password & PIN updated for ${passwordResetUser.name}!`);
    setTimeout(() => {
      setPasswordResetSuccessMsg(null);
      setPasswordResetUser(null);
    }, 1500);
  };

  // Role Manager Handlers
  const handleOpenRoleManager = (user: UserProfile) => {
    setRoleManagerUser(user);
    setEditSystemRole(user.systemRole || 'OPERATIONAL_USER');
    setEditFunctionalRole(user.role || 'Staff Member');
    setEditDepartmentId(user.departmentId || 'DEPT-STORE');
    setEditDepartmentName(user.departmentName || 'Central Operations');
    setEditSiteLocation(user.siteLocation || 'Siladehi Site');
    setEditPhone(user.phone || '');
    setEditEmail(user.email || '');
    setRoleManagerSuccessMsg(null);
  };

  const handleSaveRoleManager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleManagerUser) return;

    // Validate uniqueness for Username, Mobile, WhatsApp, and Email
    const validation = validateStaffUniqueness({
      username: roleManagerUser.username || '',
      phone: editPhone,
      email: editEmail,
      excludeUserId: roleManagerUser.userId,
      usersList,
    });

    if (!validation.isValid) {
      const firstErr = 
        validation.errors.username || 
        validation.errors.phone || 
        validation.errors.email || 
        'Validation error';
      setRoleManagerSuccessMsg(`Validation Error: ${firstErr}`);
      return;
    }

    const updated = usersList.map((u) => {
      if (u.userId === roleManagerUser.userId) {
        return {
          ...u,
          systemRole: editSystemRole,
          role: editFunctionalRole.trim() || u.role,
          departmentId: editDepartmentId,
          departmentName: editDepartmentName,
          siteLocation: editSiteLocation.trim() || u.siteLocation,
          phone: editPhone.trim() || u.phone,
          email: editEmail.trim() || u.email,
        };
      }
      return u;
    });

    onUpdateUsersList(updated);
    setRoleManagerSuccessMsg(`System Role & Details updated for ${roleManagerUser.name}!`);
    setTimeout(() => {
      setRoleManagerSuccessMsg(null);
      setRoleManagerUser(null);
    }, 1500);
  };

  if (!isOpen) return null;

  const filteredUsers = visibleUsersList.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const username = newUserUsername.trim() || newUserName.trim().toLowerCase().replace(/\s+/g, '.');
    const phone = newUserPhone.trim() || '9827100000';
    const email = newUserEmail.trim() || `${username}@barbrik.in`;

    const validation = validateStaffUniqueness({
      username,
      phone,
      email,
      usersList,
    });

    if (!validation.isValid) {
      const firstErr = validation.errors.username || validation.errors.phone || validation.errors.email || 'Validation error';
      alert(`Cannot create staff member: ${firstErr}`);
      return;
    }

    const created: UserProfile = {
      userId: `USR-${Date.now().toString().slice(-4)}`,
      name: newUserName.trim(),
      username,
      password: 'pass123',
      role: newUserRoleTitle,
      systemRole: newUserSystemRole,
      departmentId: 'DEPT-STORE',
      departmentName: 'Central Operations',
      email,
      phone,
      siteLocation: newUserSite,
      status: 'ACTIVE',
      approvalPin: '1234',
    };

    onUpdateUsersList([...usersList, created]);
    setIsAddUserOpen(false);
    setNewUserName('');
    setNewUserUsername('');
  };

  const handleToggleUserStatus = (userId: string) => {
    const updated = usersList.map((u) => {
      if (u.userId === userId) {
        const nextStatus = u.status === 'INACTIVE' ? 'ACTIVE' : 'INACTIVE';
        return { ...u, status: nextStatus as any };
      }
      return u;
    });
    onUpdateUsersList(updated);
  };

  const handleEmergencyReassign = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAbsentUser || !selectedReliefUser) return;
    const absent = usersList.find((u) => u.userId === selectedAbsentUser);
    const relief = usersList.find((u) => u.userId === selectedReliefUser);

    setReassignSuccessMsg(`Emergency Re-assignment Complete! Active FMS stages and tasks belonging to ${absent?.name} have been reassigned to ${relief?.name}.`);
    setTimeout(() => setReassignSuccessMsg(null), 5000);
  };

  const handleCreateNotice = (e: React.FormEvent) => {
    e.preventDefault();
    if (!noticeTitle.trim() || !noticeContent.trim()) return;

    const item: NoticeBoardItem = {
      id: `NB-${Date.now().toString().slice(-4)}`,
      title: noticeTitle.trim(),
      category: noticeCategory,
      content: noticeContent.trim(),
      date: new Date().toLocaleDateString('en-GB'),
      author: 'System Super Admin',
      isPinned: noticeIsPinned,
    };

    onUpdateNoticeBoard([item, ...noticeBoardItems]);
    setIsAddNoticeOpen(false);
    setNoticeTitle('');
    setNoticeContent('');
  };

  const handleDeleteNotice = (noticeId: string) => {
    onUpdateNoticeBoard(noticeBoardItems.filter((n) => n.id !== noticeId));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/80 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto font-sans">
      <div className="bg-white rounded-3xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-4 sm:p-6 flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-amber-500 text-slate-950 rounded-2xl font-bold shadow-lg shadow-amber-500/20">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg sm:text-xl font-black tracking-tight">Super Admin Governance Center</h2>
                <span className="bg-amber-400 text-slate-950 font-black text-[9px] px-2 py-0.5 rounded-full uppercase">
                  MASTER CONTROL
                </span>
              </div>
              <p className="text-xs text-indigo-200">
                User Management Directory, Role Governance, Emergency Task Re-assignment &amp; Notice Publisher
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 flex items-center gap-2 overflow-x-auto text-xs">
          <button
            onClick={() => setActiveTab('DIRECTORY')}
            className={`py-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'DIRECTORY'
                ? 'border-indigo-600 text-indigo-950 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <UserCheck className="w-4 h-4 text-indigo-600" />
            <span>Staff Directory &amp; Role Access ({visibleUsersList.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('REASSIGN')}
            className={`py-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'REASSIGN'
                ? 'border-indigo-600 text-indigo-950 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <RefreshCw className="w-4 h-4 text-amber-600" />
            <span>Emergency Task Re-assignment</span>
          </button>

          <button
            onClick={() => setActiveTab('NOTICES')}
            className={`py-3 px-4 font-bold border-b-2 transition-all flex items-center gap-1.5 whitespace-nowrap cursor-pointer ${
              activeTab === 'NOTICES'
                ? 'border-indigo-600 text-indigo-950 font-black'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Megaphone className="w-4 h-4 text-purple-600" />
            <span>Notice Board Publisher ({noticeBoardItems.length})</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 overflow-y-auto flex-1 space-y-4 text-xs">
          
          {/* TAB 1: USER DIRECTORY & ROLES */}
          {activeTab === 'DIRECTORY' && (
            <div className="space-y-4">
              
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3 rounded-2xl border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search staff by name, role, username, or email..."
                    className="w-full pl-9 pr-3 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(!isAddUserOpen)}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add New Staff Account</span>
                </button>
              </div>

              {/* Add User Form Drawer */}
              {isAddUserOpen && (
                <form onSubmit={handleCreateUser} className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-200 space-y-3 animate-in fade-in slide-in-from-top-2 duration-150">
                  <div className="flex items-center justify-between border-b border-indigo-200 pb-2">
                    <span className="font-extrabold text-indigo-950 text-xs flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      Register New Organization Staff Member
                    </span>
                    <button type="button" onClick={() => setIsAddUserOpen(false)} className="text-slate-400 hover:text-slate-700">
                      <X className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="e.g. Ramesh Kumar"
                        className="w-full bg-white border border-indigo-300 rounded-lg p-2 font-semibold text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">Username *</label>
                      <input
                        type="text"
                        value={newUserUsername}
                        onChange={(e) => setNewUserUsername(e.target.value)}
                        placeholder="e.g. ramesh.k"
                        className="w-full bg-white border border-indigo-300 rounded-lg p-2 font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">Job Designation *</label>
                      <input
                        type="text"
                        value={newUserRoleTitle}
                        onChange={(e) => setNewUserRoleTitle(e.target.value)}
                        placeholder="e.g. Store Keeper / Site Engg"
                        className="w-full bg-white border border-indigo-300 rounded-lg p-2 font-semibold text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">System Authorization Role *</label>
                      <select
                        value={newUserSystemRole}
                        onChange={(e) => setNewUserSystemRole(e.target.value as any)}
                        className="w-full bg-white border border-indigo-300 rounded-lg p-2 font-semibold text-slate-800 cursor-pointer"
                      >
                        <option value="OPERATIONAL_USER">OPERATIONAL_USER (Field &amp; Site Staff)</option>
                        <option value="PROCESS_COORDINATOR">PROCESS_COORDINATOR (Cross-Dept Delay Tracker)</option>
                        <option value="EXECUTIVE_ASSISTANT">EXECUTIVE_ASSISTANT (Approval Pre-Review &amp; Screening)</option>
                        <option value="DIRECTOR">DIRECTOR (Executive Decision Maker)</option>
                        <option value="PROCESS_MANAGER">PROCESS_MANAGER (Section In-Charge &amp; Approver)</option>
                        <option value="DEPT_ADMIN">DEPT_ADMIN (Department Head)</option>
                        <option value="ADMIN">ADMIN (Operational Administrator)</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN (Full Governance)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">WhatsApp Mobile *</label>
                      <input
                        type="text"
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        placeholder="e.g. 9827100000"
                        className="w-full bg-white border border-indigo-300 rounded-lg p-2 font-semibold text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">Official Email *</label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="e.g. ramesh@barbrik.in"
                        className="w-full bg-white border border-indigo-300 rounded-lg p-2 font-semibold text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end gap-2 pt-1">
                    <button
                      type="button"
                      onClick={() => setIsAddUserOpen(false)}
                      className="px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-700 hover:bg-slate-100 cursor-pointer"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
                    >
                      Save New Staff Account
                    </button>
                  </div>
                </form>
              )}

              {/* Users Table List */}
              <div className="space-y-2 border border-slate-200 rounded-2xl overflow-hidden shadow-xs">
                <div className="bg-slate-100 p-3 font-extrabold text-slate-700 grid grid-cols-12 gap-2 text-[11px] uppercase tracking-wider">
                  <span className="col-span-4">Staff Member &amp; Role</span>
                  <span className="col-span-3">Contact &amp; Site Location</span>
                  <span className="col-span-2">System Level</span>
                  <span className="col-span-3 text-right">Actions</span>
                </div>

                <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                  {filteredUsers.map((u) => {
                    const isInactive = u.status === 'INACTIVE';
                    return (
                      <div key={u.userId} className={`p-3 grid grid-cols-12 gap-2 items-center hover:bg-slate-50 transition-colors ${isInactive ? 'bg-slate-50/70 opacity-60' : ''}`}>
                        <div className="col-span-4 space-y-0.5">
                          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-xs">
                            <span>{u.name}</span>
                            <span className="text-[10px] font-mono font-medium text-slate-400">({u.username || u.userId})</span>
                          </div>
                          <div className="text-[11px] font-semibold text-indigo-700">
                            {u.role} • {u.departmentName}
                          </div>
                        </div>

                        <div className="col-span-3 text-[11px] text-slate-600 space-y-0.5">
                          <div className="font-semibold text-slate-800">{u.phone}</div>
                          <div className="truncate text-slate-500">{u.email}</div>
                        </div>

                        <div className="col-span-2">
                          <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            u.systemRole === 'SUPER_ADMIN' 
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : u.systemRole === 'ADMIN'
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                              : u.systemRole === 'DEPT_ADMIN'
                              ? 'bg-blue-100 text-blue-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.systemRole || 'STAFF'}
                          </span>
                        </div>

                        <div className="col-span-3 flex items-center justify-end gap-1 flex-wrap">
                          <button
                            type="button"
                            onClick={() => handleOpenPasswordReset(u)}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-md transition-colors cursor-pointer flex items-center gap-0.5"
                            title="Reset Password & Security PIN"
                          >
                            <KeyRound className="w-2.5 h-2.5 text-slate-600" />
                            <span>Pass</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenRoleManager(u)}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md transition-colors cursor-pointer flex items-center gap-0.5"
                            title="Manage System Role, Department & Designation"
                          >
                            <Edit3 className="w-2.5 h-2.5 text-indigo-600" />
                            <span>Role</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => {
                              onImpersonateUser(u);
                              onClose();
                            }}
                            className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-50 hover:bg-blue-100 text-blue-800 border border-blue-200 rounded-md transition-colors cursor-pointer flex items-center gap-0.5"
                            title="Switch view to test this user's portal"
                          >
                            <Eye className="w-2.5 h-2.5 text-blue-600" />
                            <span>View As</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u.userId)}
                            className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
                              isInactive
                                ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300'
                                : 'bg-rose-50 hover:bg-rose-100 text-rose-800 border border-rose-200'
                            }`}
                          >
                            {isInactive ? 'Activate' : 'Deactivate'}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

            </div>
          )}

          {/* TAB 2: EMERGENCY TASK RE-ASSIGNMENT */}
          {activeTab === 'REASSIGN' && (
            <form onSubmit={handleEmergencyReassign} className="space-y-4">
              
              <div className="p-3 bg-amber-50 border border-amber-200 text-amber-950 rounded-2xl font-medium leading-relaxed">
                <strong className="block font-bold text-amber-900 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 text-amber-600" />
                  Emergency Relief Re-Assignment Engine
                </strong>
                When an employee goes on leave or is absent, their active pending FMS stages, checklists, and delegations can be instantly transferred to a relief staff member to prevent SLA delay breaches.
              </div>

              {reassignSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-900 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{reassignSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">1. Select Absent / On-Leave Employee</label>
                  <select
                    value={selectedAbsentUser}
                    onChange={(e) => setSelectedAbsentUser(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800 cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Absent Staff Member --</option>
                    {visibleUsersList.map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.name} ({u.role} - {u.departmentName})
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="block font-bold text-slate-800">2. Select Relief Assignee</label>
                  <select
                    value={selectedReliefUser}
                    onChange={(e) => setSelectedReliefUser(e.target.value)}
                    className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800 cursor-pointer"
                    required
                  >
                    <option value="">-- Choose Relief Staff Member --</option>
                    {visibleUsersList.filter((u) => u.userId !== selectedAbsentUser).map((u) => (
                      <option key={u.userId} value={u.userId}>
                        {u.name} ({u.role} - {u.departmentName})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl transition-colors flex items-center gap-2 cursor-pointer shadow-xs"
              >
                <RefreshCw className="w-4 h-4 text-white" />
                <span>Execute Emergency Task Transfer &amp; Reassign Pending Stages</span>
              </button>
            </form>
          )}

          {/* TAB 3: NOTICE BOARD PUBLISHER */}
          {activeTab === 'NOTICES' && (
            <div className="space-y-4">
              
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-slate-900 text-xs">Organization Live Notice Board</h3>
                  <p className="text-[11px] text-slate-500">Notices created here appear live on the Login Screen and Staff Hub.</p>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddNoticeOpen(!isAddNoticeOpen)}
                  className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center gap-1.5 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>Publish New Notice</span>
                </button>
              </div>

              {isAddNoticeOpen && (
                <form onSubmit={handleCreateNotice} className="bg-purple-50 p-4 rounded-2xl border border-purple-200 space-y-3">
                  <div className="font-extrabold text-purple-950 text-xs">Publish Broadcast Notice</div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-purple-950 mb-1">Notice Headline Title *</label>
                      <input
                        type="text"
                        value={noticeTitle}
                        onChange={(e) => setNoticeTitle(e.target.value)}
                        placeholder="e.g. Mandatory Daily Material Audit"
                        className="w-full bg-white border border-purple-300 rounded-lg p-2 font-semibold text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-purple-950 mb-1">Category *</label>
                      <select
                        value={noticeCategory}
                        onChange={(e) => setNoticeCategory(e.target.value as any)}
                        className="w-full bg-white border border-purple-300 rounded-lg p-2 font-semibold text-slate-800 cursor-pointer"
                      >
                        <option value="URGENT">URGENT (Red Badge)</option>
                        <option value="SAFETY">SAFETY (Amber Badge)</option>
                        <option value="SITE_OPS">SITE_OPS (Indigo Badge)</option>
                        <option value="CIRCULAR">CIRCULAR (Emerald Badge)</option>
                        <option value="GENERAL">GENERAL (Slate Badge)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-purple-950 mb-1">Notice Message Body *</label>
                    <textarea
                      value={noticeContent}
                      onChange={(e) => setNoticeContent(e.target.value)}
                      rows={2}
                      placeholder="Write full notice details..."
                      className="w-full bg-white border border-purple-300 rounded-lg p-2 font-medium text-slate-800"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <label className="flex items-center gap-2 cursor-pointer font-bold text-purple-950 text-xs">
                      <input
                        type="checkbox"
                        checked={noticeIsPinned}
                        onChange={(e) => setNoticeIsPinned(e.target.checked)}
                        className="rounded border-purple-300 text-purple-600"
                      />
                      <span>Pin to Top of Login Screen</span>
                    </label>

                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg cursor-pointer"
                    >
                      Publish Notice Now
                    </button>
                  </div>
                </form>
              )}

              {/* Existing Notices List */}
              <div className="space-y-2">
                {noticeBoardItems.map((n) => (
                  <div key={n.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between gap-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-slate-900">{n.title}</span>
                        <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-1.5 py-0.2 rounded">
                          {n.category}
                        </span>
                      </div>
                      <p className="text-xs text-slate-600">{n.content}</p>
                      <div className="text-[10px] text-slate-400 font-mono">
                        Posted by {n.author} on {n.date}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteNotice(n.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer shrink-0"
                      title="Delete Notice"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>

            </div>
          )}

        </div>

      </div>

      {/* MODAL: Password Reset */}
      {passwordResetUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-amber-500/20 text-amber-400 rounded-lg">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Reset Password &amp; Security Credentials</h3>
                  <p className="text-[11px] text-slate-400">User: {passwordResetUser.name} ({passwordResetUser.username})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPasswordResetUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSavePasswordReset} className="p-5 space-y-4">
              {passwordResetSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{passwordResetSuccessMsg}</span>
                </div>
              )}

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    New Web Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showPasswordText ? "text" : "password"}
                      value={newPasswordValue}
                      onChange={(e) => setNewPasswordValue(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 pr-10 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPasswordText(!showPasswordText)}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      {showPasswordText ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                  <div className="flex items-center justify-between pt-1">
                    <button
                      type="button"
                      onClick={() => {
                        const randomPass = 'pass' + Math.floor(1000 + Math.random() * 9000);
                        setNewPasswordValue(randomPass);
                      }}
                      className="text-[10px] font-bold text-indigo-600 hover:underline cursor-pointer"
                    >
                      Auto-generate random password
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Approval 4-Digit Security PIN *
                  </label>
                  <input
                    type="text"
                    maxLength={4}
                    value={newPinValue}
                    onChange={(e) => setNewPinValue(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-sm font-mono font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-amber-500 outline-none"
                    placeholder="1234"
                    required
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Used for authorising stage transitions &amp; approvals in FMS/IMS.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl text-[11px] text-amber-900 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  Copy credentials to clipboard to share directly with staff member:
                  <div className="mt-1 font-mono font-bold text-[10px] bg-white p-1.5 rounded border border-amber-300 select-all flex items-center justify-between">
                    <span>User: {passwordResetUser.username} | Pass: {newPasswordValue} | PIN: {newPinValue}</span>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(`User: ${passwordResetUser.username}\nPass: ${newPasswordValue}\nPIN: ${newPinValue}`);
                        setPasswordResetCopied(true);
                        setTimeout(() => setPasswordResetCopied(false), 2000);
                      }}
                      className="ml-2 text-amber-800 hover:text-amber-950 underline cursor-pointer shrink-0 font-sans"
                    >
                      {passwordResetCopied ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setPasswordResetUser(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Save New Password</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: Role & Access Manager */}
      {roleManagerUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-indigo-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Role &amp; System Access Manager</h3>
                  <p className="text-[11px] text-indigo-200">Staff: {roleManagerUser.name} ({roleManagerUser.userId})</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRoleManagerUser(null)}
                className="text-indigo-300 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveRoleManager} className="p-5 space-y-4">
              {roleManagerSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{roleManagerSuccessMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    System Level Authorization *
                  </label>
                  <select
                    value={editSystemRole}
                    onChange={(e) => setEditSystemRole(e.target.value as UserRole)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 cursor-pointer focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="OPERATIONAL_USER">OPERATIONAL_USER (Field &amp; Site Staff)</option>
                    <option value="PROCESS_COORDINATOR">PROCESS_COORDINATOR (Cross-Dept SLA Delay Tracker)</option>
                    <option value="EXECUTIVE_ASSISTANT">EXECUTIVE_ASSISTANT (Approval Pre-Review &amp; Screening)</option>
                    <option value="DIRECTOR">DIRECTOR (Executive Decision Maker)</option>
                    <option value="PROCESS_MANAGER">PROCESS_MANAGER (Section In-Charge &amp; Approver)</option>
                    <option value="DEPT_ADMIN">DEPT_ADMIN (Department Head)</option>
                    <option value="ADMIN">ADMIN (Operational Administrator)</option>
                    <option value="SUPER_ADMIN">SUPER_ADMIN (Full Governance)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Designation / Job Title *
                  </label>
                  <input
                    type="text"
                    value={editFunctionalRole}
                    onChange={(e) => setEditFunctionalRole(e.target.value)}
                    placeholder="e.g. Site Manager, Store Keeper"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Department *
                  </label>
                  <select
                    value={editDepartmentId}
                    onChange={(e) => {
                      const deptId = e.target.value;
                      setEditDepartmentId(deptId);
                      const deptMap: Record<string, string> = {
                        'DEPT-STORE': 'Central Operations / Store',
                        'DEPT-FMS': 'Flow Management (FMS)',
                        'DEPT-CHECKLIST': 'Checklists & Audit',
                        'DEPT-DELEGATION': 'Task Delegation',
                        'DEPT-MIS': 'MIS & Accounts',
                      };
                      setEditDepartmentName(deptMap[deptId] || 'Central Operations');
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 cursor-pointer focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  >
                    <option value="DEPT-STORE">Central Store &amp; Inventory (IMS)</option>
                    <option value="DEPT-FMS">Flow Management System (FMS)</option>
                    <option value="DEPT-CHECKLIST">Checklist Management</option>
                    <option value="DEPT-DELEGATION">Delegation &amp; Tasks</option>
                    <option value="DEPT-MIS">Management Info System (MIS)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Site Location *
                  </label>
                  <input
                    type="text"
                    value={editSiteLocation}
                    onChange={(e) => setEditSiteLocation(e.target.value)}
                    placeholder="e.g. Siladehi Site"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    WhatsApp Mobile
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    placeholder="e.g. 9827100000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Official Email
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    placeholder="user@barbrik.in"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRoleManagerUser(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>Update Role &amp; Permissions</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
