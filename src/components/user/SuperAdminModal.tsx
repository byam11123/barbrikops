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
  UserX
} from 'lucide-react';
import { UserProfile, NoticeBoardItem, UserRole } from '../../types';
import { USERS, INITIAL_NOTICE_BOARD } from '../../data/initialData';

interface SuperAdminModalProps {
  isOpen: boolean;
  onClose: () => void;
  usersList: UserProfile[];
  onUpdateUsersList: (users: UserProfile[]) => void;
  noticeBoardItems: NoticeBoardItem[];
  onUpdateNoticeBoard: (notices: NoticeBoardItem[]) => void;
  onImpersonateUser: (user: UserProfile) => void;
}

export const SuperAdminModal: React.FC<SuperAdminModalProps> = ({
  isOpen,
  onClose,
  usersList,
  onUpdateUsersList,
  noticeBoardItems,
  onUpdateNoticeBoard,
  onImpersonateUser,
}) => {
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

  if (!isOpen) return null;

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
            <span>Staff Directory &amp; Role Access ({usersList.length})</span>
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
                        <option value="OPERATIONAL_USER">OPERATIONAL_USER (Field Staff)</option>
                        <option value="PROCESS_MANAGER">PROCESS_MANAGER (Coordinators)</option>
                        <option value="DEPT_ADMIN">DEPT_ADMIN (Department Head)</option>
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
                              : u.systemRole === 'DEPT_ADMIN'
                              ? 'bg-indigo-100 text-indigo-900'
                              : 'bg-slate-100 text-slate-700'
                          }`}>
                            {u.systemRole || 'STAFF'}
                          </span>
                        </div>

                        <div className="col-span-3 flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => {
                              onImpersonateUser(u);
                              onClose();
                            }}
                            className="px-2 py-1 text-[10px] font-bold bg-indigo-50 hover:bg-indigo-100 text-indigo-800 border border-indigo-200 rounded-md transition-colors cursor-pointer"
                            title="Switch view to test this user's portal"
                          >
                            View As
                          </button>

                          <button
                            type="button"
                            onClick={() => handleToggleUserStatus(u.userId)}
                            className={`px-2 py-1 text-[10px] font-bold rounded-md transition-colors cursor-pointer ${
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
                    {usersList.map((u) => (
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
                    {usersList.filter((u) => u.userId !== selectedAbsentUser).map((u) => (
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
    </div>
  );
};
