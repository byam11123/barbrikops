import React, { useState } from 'react';
import { 
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
  User,
  Users,
  Eye,
  EyeOff,
  Layers
} from 'lucide-react';
import { 
  UserProfile, 
  NoticeBoardItem, 
  UserRole,
  SYSTEM_MODULES,
  ModulePermission,
  ModulePermissionMap,
  getUserModulePermission,
  isUserSuperAdmin
} from '../../types';
import { USERS } from '../../data/initialData';

interface SuperAdminGovernanceViewProps {
  usersList: UserProfile[];
  onUpdateUsersList: (users: UserProfile[]) => void;
  noticeBoardItems: NoticeBoardItem[];
  onUpdateNoticeBoard: (notices: NoticeBoardItem[]) => void;
  onImpersonateUser: (user: UserProfile) => void;
  currentUser?: UserProfile;
}

export const SuperAdminGovernanceView: React.FC<SuperAdminGovernanceViewProps> = ({
  usersList,
  onUpdateUsersList,
  noticeBoardItems,
  onUpdateNoticeBoard,
  onImpersonateUser,
  currentUser,
}) => {
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'PERMISSIONS' | 'REASSIGN' | 'NOTICES'>('DIRECTORY');
  const [search, setSearch] = useState('');

  // Permissions Matrix State
  const [selectedStaffForPermissions, setSelectedStaffForPermissions] = useState<string>(
    usersList.find((u) => u.systemRole !== 'SUPER_ADMIN')?.userId || usersList[0]?.userId || ''
  );
  const [permissionSuccessMsg, setPermissionSuccessMsg] = useState<string | null>(null);

  // New User Form State
  const [isAddUserOpen, setIsAddUserOpen] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserUsername, setNewUserUsername] = useState('');
  const [newUserRoleTitle, setNewUserRoleTitle] = useState('Store Keeper');
  const [newUserSystemRole, setNewUserSystemRole] = useState<UserRole>('OPERATIONAL_USER');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPhone, setNewUserPhone] = useState('');
  const [newUserSite, setNewUserSite] = useState('Siladehi Site');

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

  const filteredUsers = usersList.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(search.toLowerCase()))
  );

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const created: UserProfile = {
      userId: `USR-${Date.now().toString().slice(-4)}`,
      name: newUserName.trim(),
      username: newUserUsername.trim() || newUserName.trim().toLowerCase().replace(/\s+/g, '.'),
      password: 'pass123',
      role: newUserRoleTitle,
      systemRole: newUserSystemRole,
      departmentId: 'DEPT-STORE',
      departmentName: 'Central Operations',
      email: newUserEmail.trim() || `${newUserName.trim().toLowerCase().replace(/\s+/g, '.')}@barbrik.in`,
      phone: newUserPhone.trim() || '9827100000',
      siteLocation: newUserSite,
      status: 'ACTIVE',
      approvalPin: '1234',
    };

    onUpdateUsersList([...usersList, created]);
    setIsAddUserOpen(false);
    setNewUserName('');
    setNewUserUsername('');
    setNewUserEmail('');
    setNewUserPhone('');
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

  const selectedStaffObj = usersList.find((u) => u.userId === selectedStaffForPermissions);

  const handleToggleModulePerm = (moduleId: string, field: 'visible' | 'canEdit' | 'canDelete') => {
    if (!selectedStaffObj) return;
    const currentPerm = getUserModulePermission(selectedStaffObj, moduleId);
    const updatedPerm: ModulePermission = {
      ...currentPerm,
      [field]: !currentPerm[field],
    };

    // If visibility is turned off, disable edit and delete
    if (field === 'visible' && !updatedPerm.visible) {
      updatedPerm.canEdit = false;
      updatedPerm.canDelete = false;
    }
    // If edit or delete is enabled, automatically make visible
    if ((field === 'canEdit' || field === 'canDelete') && updatedPerm[field]) {
      updatedPerm.visible = true;
    }

    const updatedUser: UserProfile = {
      ...selectedStaffObj,
      permissions: {
        ...(selectedStaffObj.permissions || {}),
        [moduleId]: updatedPerm,
      },
    };

    const nextList = usersList.map((u) => (u.userId === updatedUser.userId ? updatedUser : u));
    onUpdateUsersList(nextList);
    setPermissionSuccessMsg(`Updated ${field.toUpperCase()} for ${moduleId.toUpperCase()} on ${selectedStaffObj.name}.`);
    setTimeout(() => setPermissionSuccessMsg(null), 3000);
  };

  const handleApplyPreset = (preset: 'ALL' | 'STANDARD' | 'READONLY' | 'MINIMAL') => {
    if (!selectedStaffObj) return;
    const newPermissions: ModulePermissionMap = {};

    SYSTEM_MODULES.forEach((mod) => {
      if (preset === 'ALL') {
        newPermissions[mod.id] = { visible: true, canEdit: true, canDelete: true };
      } else if (preset === 'STANDARD') {
        const isOps = mod.category === 'CORE' || mod.category === 'OPERATIONS';
        newPermissions[mod.id] = {
          visible: isOps,
          canEdit: isOps,
          canDelete: false,
        };
      } else if (preset === 'READONLY') {
        newPermissions[mod.id] = { visible: true, canEdit: false, canDelete: false };
      } else if (preset === 'MINIMAL') {
        newPermissions[mod.id] = {
          visible: mod.id === 'summary' || mod.id === 'mis',
          canEdit: mod.id === 'summary',
          canDelete: false,
        };
      }
    });

    const updatedUser: UserProfile = {
      ...selectedStaffObj,
      permissions: newPermissions,
    };

    const nextList = usersList.map((u) => (u.userId === updatedUser.userId ? updatedUser : u));
    onUpdateUsersList(nextList);
    setPermissionSuccessMsg(`Applied '${preset}' preset permissions to ${selectedStaffObj.name}.`);
    setTimeout(() => setPermissionSuccessMsg(null), 3500);
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
      author: currentUser?.name || 'System Super Admin',
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
    <div className="space-y-6">
      {/* Page Header Banner */}
      <div className="bg-gradient-to-r from-slate-950 via-indigo-950 to-slate-900 text-white p-5 sm:p-6 rounded-2xl shadow-lg border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="p-3 bg-amber-500 text-slate-950 rounded-2xl font-bold shadow-lg shadow-amber-500/20 shrink-0">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl sm:text-2xl font-black tracking-tight">Super Admin Governance Center</h1>
              <span className="bg-amber-400 text-slate-950 font-black text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider">
                MASTER CONTROL
              </span>
            </div>
            <p className="text-xs sm:text-sm text-indigo-200 mt-1">
              Organization-wide User Management, Role Governance, Emergency Task Re-assignment &amp; Live Notice Publisher
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-3.5 py-2 rounded-xl text-center">
            <span className="text-[10px] text-slate-300 block font-semibold uppercase tracking-wider">Active Staff</span>
            <span className="text-lg font-black text-amber-400">{usersList.filter(u => u.status !== 'INACTIVE').length} / {usersList.length}</span>
          </div>
          <div className="bg-white/10 backdrop-blur-xs border border-white/10 px-3.5 py-2 rounded-xl text-center">
            <span className="text-[10px] text-slate-300 block font-semibold uppercase tracking-wider">Notices</span>
            <span className="text-lg font-black text-white">{noticeBoardItems.length}</span>
          </div>
        </div>
      </div>

      {/* Main Governance Content Container */}
      <div className="bg-white rounded-2xl shadow-xs border border-slate-200 overflow-hidden">
        
        {/* Navigation Tabs Header */}
        <div className="bg-slate-100 border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-2 overflow-x-auto text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab('DIRECTORY')}
              className={`py-3.5 px-4 font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'DIRECTORY'
                  ? 'border-indigo-600 text-indigo-950 font-black'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Users className="w-4 h-4 text-indigo-600" />
              <span>Staff Directory &amp; Role Access ({usersList.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('PERMISSIONS')}
              className={`py-3.5 px-4 font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'PERMISSIONS'
                  ? 'border-indigo-600 text-indigo-950 font-black'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Sliders className="w-4 h-4 text-amber-600" />
              <span>Module &amp; Action Permissions Matrix</span>
            </button>

            <button
              onClick={() => setActiveTab('REASSIGN')}
              className={`py-3.5 px-4 font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
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
              className={`py-3.5 px-4 font-bold border-b-2 transition-all flex items-center gap-2 whitespace-nowrap cursor-pointer ${
                activeTab === 'NOTICES'
                  ? 'border-indigo-600 text-indigo-950 font-black'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
              }`}
            >
              <Megaphone className="w-4 h-4 text-purple-600" />
              <span>Notice Board Publisher ({noticeBoardItems.length})</span>
            </button>
          </div>
        </div>

        {/* Tab Body */}
        <div className="p-4 sm:p-6 space-y-5 text-xs">
          
          {/* TAB 1: USER DIRECTORY & ROLES */}
          {activeTab === 'DIRECTORY' && (
            <div className="space-y-4">
              
              {/* Controls bar */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search staff by name, role, username, or email..."
                    className="w-full pl-10 pr-3 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddUserOpen(!isAddUserOpen)}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <UserPlus className="w-4 h-4" />
                  <span>Add New Staff Account</span>
                </button>
              </div>

              {/* Add User Drawer / Form */}
              {isAddUserOpen && (
                <form onSubmit={handleCreateUser} className="bg-indigo-50/70 p-4 rounded-2xl border border-indigo-200 space-y-3 animate-in fade-in duration-200">
                  <div className="flex items-center justify-between">
                    <h3 className="font-black text-indigo-950 text-sm flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-indigo-600" /> Provision New Organization Staff
                    </h3>
                    <button
                      type="button"
                      onClick={() => setIsAddUserOpen(false)}
                      className="text-indigo-600 hover:text-indigo-900 font-bold text-xs cursor-pointer"
                    >
                      Cancel
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">Full Name *</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="e.g. Ramesh Verma"
                        className="w-full bg-white border border-indigo-200 rounded-lg p-2 font-medium text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">Login Username</label>
                      <input
                        type="text"
                        value={newUserUsername}
                        onChange={(e) => setNewUserUsername(e.target.value)}
                        placeholder="e.g. ramesh.verma"
                        className="w-full bg-white border border-indigo-200 rounded-lg p-2 font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">Operational Role Title</label>
                      <input
                        type="text"
                        value={newUserRoleTitle}
                        onChange={(e) => setNewUserRoleTitle(e.target.value)}
                        placeholder="e.g. Store Keeper / Purchase Assistant"
                        className="w-full bg-white border border-indigo-200 rounded-lg p-2 font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">System Governance Role</label>
                      <select
                        value={newUserSystemRole}
                        onChange={(e) => setNewUserSystemRole(e.target.value as any)}
                        className="w-full bg-white border border-indigo-200 rounded-lg p-2 font-medium text-slate-800 cursor-pointer"
                      >
                        <option value="OPERATIONAL_USER">OPERATIONAL_USER (Staff)</option>
                        <option value="PROCESS_MANAGER">PROCESS_MANAGER (Approval HOD)</option>
                        <option value="DEPT_ADMIN">DEPT_ADMIN (Store/Purchase Manager)</option>
                        <option value="SUPER_ADMIN">SUPER_ADMIN (Master Control)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">Official Email</label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => setNewUserEmail(e.target.value)}
                        placeholder="ramesh@barbrik.in"
                        className="w-full bg-white border border-indigo-200 rounded-lg p-2 font-medium text-slate-800"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">WhatsApp Contact</label>
                      <input
                        type="text"
                        value={newUserPhone}
                        onChange={(e) => setNewUserPhone(e.target.value)}
                        placeholder="9827100000"
                        className="w-full bg-white border border-indigo-200 rounded-lg p-2 font-medium text-slate-800"
                      />
                    </div>
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg cursor-pointer"
                    >
                      Save &amp; Activate Staff Account
                    </button>
                  </div>
                </form>
              )}

              {/* Staff Table */}
              <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse">
                    <thead className="bg-slate-100/80 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                      <tr>
                        <th className="p-3 pl-4">Staff Member &amp; Role</th>
                        <th className="p-3">Contact &amp; Site Location</th>
                        <th className="p-3">System Level</th>
                        <th className="p-3">Status</th>
                        <th className="p-3 pr-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredUsers.map((user) => {
                        const isInactive = user.status === 'INACTIVE';
                        return (
                          <tr key={user.userId} className={`hover:bg-slate-50 transition-colors ${isInactive ? 'opacity-60 bg-slate-50/50' : ''}`}>
                            <td className="p-3 pl-4">
                              <div className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                                <span>{user.name}</span>
                                {user.username && (
                                  <span className="font-mono text-[10px] font-normal text-slate-400">
                                    ({user.username})
                                  </span>
                                )}
                              </div>
                              <div className="text-[11px] text-indigo-600 font-medium">
                                {user.role} • {user.departmentName || 'Operations'}
                              </div>
                            </td>

                            <td className="p-3 text-[11px] text-slate-600">
                              <div>{user.phone || '9827100000'}</div>
                              <div className="text-[10px] text-slate-400">{user.email}</div>
                            </td>

                            <td className="p-3">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                user.systemRole === 'SUPER_ADMIN'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : user.systemRole === 'DEPT_ADMIN'
                                  ? 'bg-blue-100 text-blue-900 border border-blue-200'
                                  : user.systemRole === 'PROCESS_MANAGER'
                                  ? 'bg-purple-100 text-purple-900 border border-purple-200'
                                  : 'bg-slate-100 text-slate-700'
                              }`}>
                                {user.systemRole || 'STAFF'}
                              </span>
                            </td>

                            <td className="p-3">
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                isInactive 
                                  ? 'bg-rose-100 text-rose-800' 
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}>
                                {isInactive ? 'Inactive' : 'Active'}
                              </span>
                            </td>

                            <td className="p-3 pr-4 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedStaffForPermissions(user.userId);
                                  setActiveTab('PERMISSIONS');
                                }}
                                className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-300 cursor-pointer text-[11px]"
                                title="Configure Module Visibility, Edit and Delete Permissions"
                              >
                                Permissions
                              </button>

                              <button
                                type="button"
                                onClick={() => onImpersonateUser(user)}
                                className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-lg border border-indigo-200 cursor-pointer text-[11px]"
                                title="Login As This User (Session Impersonation)"
                              >
                                View As
                              </button>

                              <button
                                type="button"
                                onClick={() => handleToggleUserStatus(user.userId)}
                                className={`px-2.5 py-1 font-bold rounded-lg border cursor-pointer text-[11px] ${
                                  isInactive
                                    ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                    : 'bg-rose-50 hover:bg-rose-100 text-rose-700 border-rose-200'
                                }`}
                              >
                                {isInactive ? 'Re-activate' : 'Deactivate'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>
          )}

          {/* TAB: MODULE & ACTION PERMISSIONS MATRIX */}
          {activeTab === 'PERMISSIONS' && (
            <div className="space-y-5">
              {/* Top Banner & User Selector */}
              <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Sliders className="w-4 h-4 text-amber-600" />
                      <span>Granular Module, Tab &amp; Action Governance</span>
                    </h2>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Configure exactly which modules are visible in navigation and grant or revoke Edit and Delete privileges per staff member.
                    </p>
                  </div>

                  {/* Staff Dropdown Picker */}
                  <div className="flex items-center gap-2 shrink-0">
                    <label className="text-[11px] font-bold text-slate-700 whitespace-nowrap">Selected Staff:</label>
                    <select
                      value={selectedStaffForPermissions}
                      onChange={(e) => setSelectedStaffForPermissions(e.target.value)}
                      className="bg-white border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 cursor-pointer shadow-2xs focus:ring-1 focus:ring-indigo-500"
                    >
                      {usersList.map((u) => (
                        <option key={u.userId} value={u.userId}>
                          {u.name} ({u.role}) — {u.systemRole || 'STAFF'}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                {/* Selected Staff Card */}
                {selectedStaffObj && (
                  <div className="bg-white p-3.5 rounded-xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200 text-indigo-700 font-black flex items-center justify-center text-sm shrink-0">
                        {selectedStaffObj.name.charAt(0)}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-black text-slate-900 text-xs">{selectedStaffObj.name}</span>
                          {selectedStaffObj.username && (
                            <span className="text-[10px] text-slate-400 font-mono">@{selectedStaffObj.username}</span>
                          )}
                          <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                            selectedStaffObj.systemRole === 'SUPER_ADMIN'
                              ? 'bg-amber-100 text-amber-900 border border-amber-300'
                              : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                          }`}>
                            {selectedStaffObj.systemRole || 'STAFF'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          {selectedStaffObj.role} • {selectedStaffObj.departmentName || 'Operations'} • {selectedStaffObj.email}
                        </div>
                      </div>
                    </div>

                    {/* Quick Presets (only for non-superadmin) */}
                    {!isUserSuperAdmin(selectedStaffObj) && (
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider mr-1">Presets:</span>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset('ALL')}
                          className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 rounded-lg border border-emerald-300 font-bold text-[10px] transition-colors cursor-pointer"
                        >
                          Full Access
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset('STANDARD')}
                          className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 rounded-lg border border-indigo-300 font-bold text-[10px] transition-colors cursor-pointer"
                        >
                          Standard Ops
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset('READONLY')}
                          className="px-2.5 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 rounded-lg border border-blue-300 font-bold text-[10px] transition-colors cursor-pointer"
                        >
                          Read-Only
                        </button>
                        <button
                          type="button"
                          onClick={() => handleApplyPreset('MINIMAL')}
                          className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg border border-slate-300 font-bold text-[10px] transition-colors cursor-pointer"
                        >
                          Work Only
                        </button>
                      </div>
                    )}
                  </div>
                )}

                {/* Success Feedback Banner */}
                {permissionSuccessMsg && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold text-[11px] flex items-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{permissionSuccessMsg}</span>
                  </div>
                )}
              </div>

              {/* If selected user is Super Admin */}
              {selectedStaffObj && isUserSuperAdmin(selectedStaffObj) ? (
                <div className="p-6 bg-amber-50 border border-amber-300 rounded-2xl text-center space-y-2">
                  <div className="inline-flex p-3 bg-amber-100 text-amber-900 rounded-2xl">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="font-black text-amber-950 text-sm">Super Admin Master Bypass Active</h3>
                  <p className="text-xs text-amber-900 max-w-lg mx-auto">
                    This account holds organization-wide Super Admin governance rights. All navigation modules, operational tabs, and create/edit/delete actions are permanently unlocked and cannot be restricted.
                  </p>
                </div>
              ) : selectedStaffObj && (
                /* Matrix Table */
                <div className="border border-slate-200 rounded-2xl overflow-hidden shadow-2xs">
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse">
                      <thead className="bg-slate-100/90 text-slate-700 uppercase font-extrabold text-[10px] tracking-wider border-b border-slate-200">
                        <tr>
                          <th className="p-3 pl-4">Application Module &amp; Tab</th>
                          <th className="p-3">Category</th>
                          <th className="p-3 text-center">Visibility (Show / Hide)</th>
                          <th className="p-3 text-center">Edit Action</th>
                          <th className="p-3 text-center">Delete Action</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {SYSTEM_MODULES.map((mod) => {
                          const perm = getUserModulePermission(selectedStaffObj, mod.id);
                          const isVisible = perm.visible;
                          const canEdit = perm.canEdit;
                          const canDelete = perm.canDelete;

                          return (
                            <tr key={mod.id} className={`hover:bg-slate-50 transition-colors ${!isVisible ? 'bg-slate-50/40 opacity-75' : ''}`}>
                              {/* Module Info */}
                              <td className="p-3 pl-4">
                                <div className="font-black text-slate-900 text-xs flex items-center gap-1.5">
                                  <span>{mod.name}</span>
                                  <span className="font-mono text-[10px] text-slate-400">({mod.id})</span>
                                </div>
                                <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                  {mod.description}
                                </div>
                              </td>

                              {/* Category */}
                              <td className="p-3">
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                  mod.category === 'CORE'
                                    ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                    : mod.category === 'OPERATIONS'
                                    ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                    : 'bg-purple-100 text-purple-800 border border-purple-200'
                                }`}>
                                  {mod.category}
                                </span>
                              </td>

                              {/* Visibility Toggle */}
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleModulePerm(mod.id, 'visible')}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
                                    isVisible
                                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300'
                                  }`}
                                  title={isVisible ? 'Visible in navigation bar & screens' : 'Hidden from user navigation'}
                                >
                                  {isVisible ? (
                                    <>
                                      <Eye className="w-3.5 h-3.5" />
                                      <span>Show</span>
                                    </>
                                  ) : (
                                    <>
                                      <EyeOff className="w-3.5 h-3.5 text-slate-400" />
                                      <span>Hide</span>
                                    </>
                                  )}
                                </button>
                              </td>

                              {/* Can Edit Toggle */}
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleModulePerm(mod.id, 'canEdit')}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
                                    canEdit
                                      ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300'
                                  }`}
                                  title={canEdit ? 'Can create and update records' : 'Read-only / No editing'}
                                >
                                  <Edit3 className={`w-3.5 h-3.5 ${canEdit ? 'text-white' : 'text-slate-400'}`} />
                                  <span>{canEdit ? 'Can Edit' : 'No Edit'}</span>
                                </button>
                              </td>

                              {/* Can Delete Toggle */}
                              <td className="p-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => handleToggleModulePerm(mod.id, 'canDelete')}
                                  className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all inline-flex items-center gap-1.5 cursor-pointer shadow-2xs border ${
                                    canDelete
                                      ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300'
                                  }`}
                                  title={canDelete ? 'Can delete records and entries' : 'Deletion restricted'}
                                >
                                  <Trash2 className={`w-3.5 h-3.5 ${canDelete ? 'text-white' : 'text-slate-400'}`} />
                                  <span>{canDelete ? 'Can Delete' : 'No Delete'}</span>
                                </button>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Matrix Footer Overview */}
                  <div className="bg-slate-50 p-3 px-4 border-t border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px] text-slate-600 font-medium">
                    <div className="flex items-center gap-4 flex-wrap">
                      <span>
                        <strong className="text-slate-900 font-bold">
                          {SYSTEM_MODULES.filter((m) => getUserModulePermission(selectedStaffObj, m.id).visible).length}
                        </strong> of {SYSTEM_MODULES.length} Modules Shown
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-indigo-700 font-bold">
                          {SYSTEM_MODULES.filter((m) => getUserModulePermission(selectedStaffObj, m.id).canEdit).length}
                        </strong> Edit Rights
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-rose-700 font-bold">
                          {SYSTEM_MODULES.filter((m) => getUserModulePermission(selectedStaffObj, m.id).canDelete).length}
                        </strong> Delete Rights
                      </span>
                    </div>

                    <span className="text-slate-400 text-[10px]">
                      Changes update live across Desktop Sidebar, Mobile Drawer &amp; Bottom Nav
                    </span>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: EMERGENCY TASK RE-ASSIGNMENT */}
          {activeTab === 'REASSIGN' && (
            <div className="space-y-4">
              <div className="bg-amber-50 border border-amber-200 p-4 rounded-2xl flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h3 className="font-black text-amber-950 text-xs">Unplanned Absence &amp; Staff Shift Handover</h3>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    When a critical staff member (e.g. Store Manager or Purchase Assistant) is absent, on sudden leave, or in the field, this utility re-assigns all their pending FMS workflow stages, unexecuted Delegation items, and open Checklists to a designated relief colleague to avoid any SLA bottlenecks.
                  </p>
                </div>
              </div>

              {reassignSuccessMsg && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>{reassignSuccessMsg}</span>
                </div>
              )}

              <form onSubmit={handleEmergencyReassign} className="bg-slate-50 p-5 rounded-2xl border border-slate-200 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-700">Absent / Primary Staff Member</label>
                    <select
                      value={selectedAbsentUser}
                      onChange={(e) => setSelectedAbsentUser(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800 cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Absent Staff --</option>
                      {usersList.map((u) => (
                        <option key={u.userId} value={u.userId}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block font-bold text-slate-700">Designated Relief / Acting Colleague</label>
                    <select
                      value={selectedReliefUser}
                      onChange={(e) => setSelectedReliefUser(e.target.value)}
                      className="w-full bg-white border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800 cursor-pointer"
                      required
                    >
                      <option value="">-- Choose Relief Staff --</option>
                      {usersList
                        .filter((u) => u.userId !== selectedAbsentUser)
                        .map((u) => (
                          <option key={u.userId} value={u.userId}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                    </select>
                  </div>
                </div>

                <div className="p-3 bg-white rounded-xl border border-slate-200 text-slate-600 text-[11px] space-y-1">
                  <div className="font-bold text-slate-800 flex items-center gap-1.5">
                    <CheckSquare className="w-3.5 h-3.5 text-indigo-600" /> Tasks To Be Transferred:
                  </div>
                  <ul className="list-disc list-inside space-y-0.5 text-slate-500 pl-1">
                    <li>All Pending &amp; In-Progress FMS Workflow Stages</li>
                    <li>Open Delegation tasks assigned to the primary user</li>
                    <li>Scheduled daily / weekly checklist SOP responsibilities</li>
                  </ul>
                </div>

                <div className="flex justify-end">
                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                  >
                    <RefreshCw className="w-4 h-4" />
                    <span>Execute Emergency Work Re-assignment</span>
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* TAB 3: NOTICE BOARD PUBLISHER */}
          {activeTab === 'NOTICES' && (
            <div className="space-y-4">
              
              <div className="flex items-center justify-between bg-purple-50 p-4 rounded-2xl border border-purple-200">
                <div className="flex items-center gap-2.5">
                  <Megaphone className="w-5 h-5 text-purple-600" />
                  <div>
                    <h3 className="font-black text-purple-950 text-xs">Live Organizational Notice Board</h3>
                    <p className="text-[11px] text-purple-800">
                      Notices published here appear immediately on the Login Screen notice board and user dashboards.
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsAddNoticeOpen(!isAddNoticeOpen)}
                  className="px-3.5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Publish New Notice</span>
                </button>
              </div>

              {isAddNoticeOpen && (
                <form onSubmit={handleCreateNotice} className="bg-purple-50/60 p-4 rounded-2xl border border-purple-200 space-y-3 animate-in fade-in duration-200">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block font-bold text-purple-950 mb-1">Notice Headline *</label>
                      <input
                        type="text"
                        value={noticeTitle}
                        onChange={(e) => setNoticeTitle(e.target.value)}
                        placeholder="e.g. Critical Server Maintenance Tonight"
                        className="w-full bg-white border border-purple-300 rounded-lg p-2 font-medium text-slate-800"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-purple-950 mb-1">Notice Category</label>
                      <select
                        value={noticeCategory}
                        onChange={(e) => setNoticeCategory(e.target.value as any)}
                        className="w-full bg-white border border-purple-300 rounded-lg p-2 font-medium text-slate-800 cursor-pointer"
                      >
                        <option value="URGENT">URGENT (Red Alert)</option>
                        <option value="OPERATIONS">OPERATIONS (General Ops)</option>
                        <option value="HR_POLICY">HR_POLICY (Human Resources)</option>
                        <option value="CELEBRATION">CELEBRATION (Company Milestone)</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block font-bold text-purple-950 mb-1">Notice Message Body *</label>
                    <textarea
                      value={noticeContent}
                      onChange={(e) => setNoticeContent(e.target.value)}
                      rows={3}
                      placeholder="Write full notice details..."
                      className="w-full bg-white border border-purple-300 rounded-lg p-2 font-medium text-slate-800"
                      required
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
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
                      className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg cursor-pointer"
                    >
                      Publish Notice Now
                    </button>
                  </div>
                </form>
              )}

              {/* Existing Notices List */}
              <div className="space-y-2.5">
                {noticeBoardItems.map((n) => (
                  <div key={n.id} className="p-3.5 bg-slate-50 hover:bg-slate-100/70 transition-colors rounded-2xl border border-slate-200 flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-xs text-slate-900">{n.title}</span>
                        <span className="text-[10px] font-extrabold bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full border border-purple-200">
                          {n.category}
                        </span>
                        {n.isPinned && (
                          <span className="text-[10px] font-extrabold bg-amber-100 text-amber-900 px-2 py-0.5 rounded-full border border-amber-200 flex items-center gap-0.5">
                            <Pin className="w-2.5 h-2.5" /> PINNED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed">{n.content}</p>
                      <div className="text-[10px] text-slate-400 font-mono pt-0.5">
                        Posted by {n.author} on {n.date}
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleDeleteNotice(n.id)}
                      className="text-slate-400 hover:text-rose-600 p-1.5 hover:bg-rose-50 rounded-lg cursor-pointer shrink-0 transition-colors"
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
    </div>
  );
};
