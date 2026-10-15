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
  Layers,
  X,
  Phone,
  MessageSquare,
  Mail,
  Info,
  CalendarCheck2,
  BarChart3,
  FileSpreadsheet,
  ListTodo,
  Boxes,
  Scale,
  ShoppingCart,
  Warehouse,
  Landmark,
  Wrench,
  History,
  FolderTree
} from 'lucide-react';
import { 
  UserProfile, 
  NoticeBoardItem, 
  UserRole,
  SYSTEM_MODULES,
  SYSTEM_MODULE_SECTIONS,
  ModulePermission,
  ModulePermissionMap,
  getUserModulePermission,
  isUserSuperAdmin,
  isUserAdmin
} from '../../types';
import { USERS } from '../../data/initialData';
import { validateStaffUniqueness, normalizePhone, filterUsersForViewer } from '../../utils/staffValidation';
import { storageAdapter } from '../../services/storageAdapter';

const getModuleIcon = (iconName?: string) => {
  switch (iconName) {
    case 'CalendarCheck2': return <CalendarCheck2 className="w-4 h-4 text-indigo-600 shrink-0" />;
    case 'BarChart3': return <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />;
    case 'GitBranch': return <GitBranch className="w-4 h-4 text-amber-600 shrink-0" />;
    case 'FileSpreadsheet': return <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />;
    case 'ListTodo': return <ListTodo className="w-4 h-4 text-rose-600 shrink-0" />;
    case 'CheckSquare': return <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />;
    case 'Boxes': return <Boxes className="w-4 h-4 text-orange-600 shrink-0" />;
    case 'Scale': return <Scale className="w-4 h-4 text-teal-600 shrink-0" />;
    case 'ShoppingCart': return <ShoppingCart className="w-4 h-4 text-amber-600 shrink-0" />;
    case 'Warehouse': return <Warehouse className="w-4 h-4 text-blue-600 shrink-0" />;
    case 'Landmark': return <Landmark className="w-4 h-4 text-emerald-600 shrink-0" />;
    case 'Wrench': return <Wrench className="w-4 h-4 text-purple-600 shrink-0" />;
    case 'FolderTree': return <FolderTree className="w-4 h-4 text-indigo-600 shrink-0" />;
    case 'Sliders': return <Sliders className="w-4 h-4 text-slate-600 shrink-0" />;
    case 'History': return <History className="w-4 h-4 text-slate-600 shrink-0" />;
    case 'ShieldCheck': return <ShieldCheck className="w-4 h-4 text-amber-600 shrink-0" />;
    default: return <Layers className="w-4 h-4 text-slate-500 shrink-0" />;
  }
};

const getSectionIcon = (key: string) => {
  switch (key) {
    case 'USER': return <CalendarCheck2 className="w-4 h-4 text-indigo-600 shrink-0" />;
    case 'OPERATIONS': return <GitBranch className="w-4 h-4 text-amber-600 shrink-0" />;
    case 'UTILITIES': return <Scale className="w-4 h-4 text-teal-600 shrink-0" />;
    case 'DEPARTMENTS': return <Building2 className="w-4 h-4 text-purple-600 shrink-0" />;
    case 'GOVERNANCE': return <ShieldCheck className="w-4 h-4 text-indigo-600 shrink-0" />;
    default: return <Sliders className="w-4 h-4 text-slate-600 shrink-0" />;
  }
};

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
  const visibleUsersList = filterUsersForViewer(usersList, currentUser);
  const matrixTargetStaffList = visibleUsersList.filter(
    (u) => !isUserSuperAdmin(u) && !isUserAdmin(u)
  );
  const [activeTab, setActiveTab] = useState<'DIRECTORY' | 'PERMISSIONS' | 'REASSIGN' | 'NOTICES'>('DIRECTORY');
  const [search, setSearch] = useState('');

  // Permissions Matrix State
  const [selectedStaffForPermissions, setSelectedStaffForPermissions] = useState<string>(
    matrixTargetStaffList[0]?.userId || visibleUsersList[0]?.userId || ''
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
  const [newUserWhatsappPhone, setNewUserWhatsappPhone] = useState('');
  const [newUserSameAsMobile, setNewUserSameAsMobile] = useState(true);
  const [newUserSite, setNewUserSite] = useState('Siladehi Site');
  const [newUserPassword, setNewUserPassword] = useState('pass123');
  const [newUserPin, setNewUserPin] = useState('1234');
  const [newUserValidationErr, setNewUserValidationErr] = useState<string | null>(null);

  // Read / View Profile Modal State
  const [viewProfileUser, setViewProfileUser] = useState<UserProfile | null>(null);

  // Delete User Modal State
  const [deleteConfirmUser, setDeleteConfirmUser] = useState<UserProfile | null>(null);
  const [deleteErrorMsg, setDeleteErrorMsg] = useState<string | null>(null);
  const [deleteSuccessMsg, setDeleteSuccessMsg] = useState<string | null>(null);

  // Password Reset Modal State
  const [passwordResetUser, setPasswordResetUser] = useState<UserProfile | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [newPinValue, setNewPinValue] = useState('');
  const [showPasswordText, setShowPasswordText] = useState(false);
  const [passwordResetCopied, setPasswordResetCopied] = useState(false);
  const [passwordResetSuccessMsg, setPasswordResetSuccessMsg] = useState<string | null>(null);

  // Role Manager / Edit Staff Modal State
  const [roleManagerUser, setRoleManagerUser] = useState<UserProfile | null>(null);
  const [editName, setEditName] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editSystemRole, setEditSystemRole] = useState<UserRole>('OPERATIONAL_USER');
  const [editFunctionalRole, setEditFunctionalRole] = useState('');
  const [editDepartmentId, setEditDepartmentId] = useState('');
  const [editDepartmentName, setEditDepartmentName] = useState('');
  const [editSiteLocation, setEditSiteLocation] = useState('');
  const [editPhone, setEditPhone] = useState('');
  const [editWhatsappPhone, setEditWhatsappPhone] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [roleManagerSuccessMsg, setRoleManagerSuccessMsg] = useState<string | null>(null);
  const [editValidationErr, setEditValidationErr] = useState<string | null>(null);

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

  // Role Manager & Edit Staff Handlers
  const handleOpenRoleManager = (user: UserProfile) => {
    setRoleManagerUser(user);
    setEditName(user.name);
    setEditUsername(user.username || '');
    setEditSystemRole(user.systemRole || 'OPERATIONAL_USER');
    setEditFunctionalRole(user.role || 'Staff Member');
    setEditDepartmentId(user.departmentId || 'DEPT-STORE');
    setEditDepartmentName(user.departmentName || 'Central Operations');
    setEditSiteLocation(user.siteLocation || 'Siladehi Site');
    setEditPhone(user.phone || '');
    setEditWhatsappPhone(user.whatsappPhone || user.phone || '');
    setEditEmail(user.email || '');
    setRoleManagerSuccessMsg(null);
    setEditValidationErr(null);
  };

  const handleSaveRoleManager = (e: React.FormEvent) => {
    e.preventDefault();
    if (!roleManagerUser) return;

    // Validate uniqueness for Username, Mobile, WhatsApp, and Email
    const validation = validateStaffUniqueness({
      username: editUsername,
      phone: editPhone,
      whatsappPhone: editWhatsappPhone || editPhone,
      email: editEmail,
      excludeUserId: roleManagerUser.userId,
      usersList,
    });

    if (!validation.isValid) {
      const firstErr = 
        validation.errors.username || 
        validation.errors.phone || 
        validation.errors.whatsappPhone || 
        validation.errors.email || 
        'Validation failed. Please correct duplicate fields.';
      setEditValidationErr(firstErr);
      return;
    }

    setEditValidationErr(null);

    const updated = usersList.map((u) => {
      if (u.userId === roleManagerUser.userId) {
        return {
          ...u,
          name: editName.trim() || u.name,
          username: editUsername.trim().toLowerCase() || u.username,
          systemRole: editSystemRole,
          role: editFunctionalRole.trim() || u.role,
          departmentId: editDepartmentId,
          departmentName: editDepartmentName,
          siteLocation: editSiteLocation.trim() || u.siteLocation,
          phone: editPhone.trim() || u.phone,
          whatsappPhone: (editWhatsappPhone.trim() || editPhone.trim()) || u.whatsappPhone,
          email: editEmail.trim().toLowerCase() || u.email,
        };
      }
      return u;
    });

    onUpdateUsersList(updated);
    setRoleManagerSuccessMsg(`Updated profile and access for ${editName.trim()}!`);
    setTimeout(() => {
      setRoleManagerSuccessMsg(null);
      setRoleManagerUser(null);
    }, 1500);
  };

  const filteredUsers = visibleUsersList.filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.role.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(search.toLowerCase())) ||
      (u.phone && u.phone.includes(search))
  );

  const handleCreateUser = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUserName.trim()) return;

    const actualUsername = newUserUsername.trim() || newUserName.trim().toLowerCase().replace(/\s+/g, '.');
    const actualPhone = newUserPhone.trim() || '9827100000';
    const actualWhatsapp = newUserSameAsMobile ? actualPhone : (newUserWhatsappPhone.trim() || actualPhone);
    const actualEmail = newUserEmail.trim() || `${actualUsername}@barbrik.in`;

    // Validate uniqueness for Username, Mobile, WhatsApp, and Email
    const validation = validateStaffUniqueness({
      username: actualUsername,
      phone: actualPhone,
      whatsappPhone: actualWhatsapp,
      email: actualEmail,
      usersList,
    });

    if (!validation.isValid) {
      const firstErr = 
        validation.errors.username || 
        validation.errors.phone || 
        validation.errors.whatsappPhone || 
        validation.errors.email || 
        'Validation failed. Please correct duplicate fields.';
      setNewUserValidationErr(firstErr);
      return;
    }

    setNewUserValidationErr(null);

    const created: UserProfile = {
      userId: `USR-${Date.now().toString().slice(-4)}`,
      name: newUserName.trim(),
      username: actualUsername,
      password: newUserPassword.trim() || 'pass123',
      role: newUserRoleTitle.trim() || 'Store Keeper',
      systemRole: newUserSystemRole,
      departmentId: 'DEPT-STORE',
      departmentName: 'Central Operations',
      email: actualEmail,
      phone: actualPhone,
      whatsappPhone: actualWhatsapp,
      siteLocation: newUserSite,
      status: 'ACTIVE',
      approvalPin: newUserPin.trim() || '1234',
    };

    onUpdateUsersList([...usersList, created]);
    setIsAddUserOpen(false);
    setNewUserName('');
    setNewUserUsername('');
    setNewUserEmail('');
    setNewUserPhone('');
    setNewUserWhatsappPhone('');
    setNewUserSameAsMobile(true);
  };

  // Open Safety Delete Modal
  const handleOpenDeleteConfirm = (user: UserProfile) => {
    setDeleteConfirmUser(user);
    setDeleteErrorMsg(null);
    setDeleteSuccessMsg(null);

    // Safeguard 1: Cannot delete currently logged in session user
    if (currentUser && currentUser.userId === user.userId) {
      setDeleteErrorMsg("Safety Lock: You cannot delete your own active logged-in account!");
      return;
    }

    // Safeguard 2: Root Super Admin USR-000 cannot be deleted
    if (user.userId === 'USR-000') {
      setDeleteErrorMsg("Safety Lock: Root Super Admin (USR-000) is the master account and cannot be deleted.");
      return;
    }

    // Safeguard 3: If only 1 Super Admin exists, prevent deleting them
    const superAdmins = usersList.filter((u) => isUserSuperAdmin(u));
    if (isUserSuperAdmin(user) && superAdmins.length <= 1) {
      setDeleteErrorMsg("Safety Lock: System requires at least 1 active Super Admin account. Create another Super Admin before deleting this account.");
      return;
    }
  };

  const handleExecuteDeleteUser = () => {
    if (!deleteConfirmUser || deleteErrorMsg) return;

    // Call storage adapter to purge from storage and firestore
    storageAdapter.deleteUser(deleteConfirmUser.userId, currentUser);

    const updated = usersList.filter((u) => u.userId !== deleteConfirmUser.userId);
    onUpdateUsersList(updated);

    setDeleteSuccessMsg(`Permanently deleted staff record for ${deleteConfirmUser.name} (${deleteConfirmUser.userId}).`);
    setTimeout(() => {
      setDeleteSuccessMsg(null);
      setDeleteConfirmUser(null);
    }, 1500);
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

  const selectedStaffObj = visibleUsersList.find((u) => u.userId === selectedStaffForPermissions) || visibleUsersList[0];
  const isViewerSuperAdmin = isUserSuperAdmin(currentUser);
  const isSelectedStaffAdmin = selectedStaffObj?.systemRole === 'ADMIN' || selectedStaffObj?.role === 'ADMIN' || selectedStaffObj?.userId === 'USR-ADMIN-01';

  // "all modules should visible to superadmin but for admin should visible only user modules, utilites & tools, department modules and system governance not operations modules"
  const visibleMatrixSections = SYSTEM_MODULE_SECTIONS.filter((section) => {
    if (section.sectionKey === 'OPERATIONS') {
      // Operations Modules are strictly hidden for Admin viewer or when viewing Admin profile
      if (!isViewerSuperAdmin || isSelectedStaffAdmin) return false;
      return true;
    }
    return true;
  });

  const displayedMatrixModules = visibleMatrixSections.flatMap((s) => s.modules);

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

  const handleToggleSectionPerm = (sectionKey: string, field: 'visible' | 'canEdit' | 'canDelete', targetValue: boolean) => {
    if (!selectedStaffObj) return;
    const section = SYSTEM_MODULE_SECTIONS.find((s) => s.sectionKey === sectionKey);
    if (!section) return;

    const updatedPermissions: ModulePermissionMap = { ...(selectedStaffObj.permissions || {}) };
    section.modules.forEach((mod) => {
      // Super admin safeguard
      if (mod.id === 'super-admin' && isUserSuperAdmin(selectedStaffObj)) return;

      const current = getUserModulePermission(selectedStaffObj, mod.id);
      const nextPerm = { ...current, [field]: targetValue };
      if (field === 'visible' && !targetValue) {
        nextPerm.canEdit = false;
        nextPerm.canDelete = false;
      }
      if ((field === 'canEdit' || field === 'canDelete') && targetValue) {
        nextPerm.visible = true;
      }
      updatedPermissions[mod.id] = nextPerm;
    });

    const updatedUser: UserProfile = {
      ...selectedStaffObj,
      permissions: updatedPermissions,
    };

    const nextList = usersList.map((u) => (u.userId === updatedUser.userId ? updatedUser : u));
    onUpdateUsersList(nextList);
    setPermissionSuccessMsg(`Updated ${section.title} (${targetValue ? 'Enabled' : 'Disabled'}) for ${selectedStaffObj.name}.`);
    setTimeout(() => setPermissionSuccessMsg(null), 3000);
  };

  const handleApplyPreset = (preset: 'ALL' | 'STANDARD' | 'READONLY' | 'MINIMAL') => {
    if (!selectedStaffObj) return;
    const newPermissions: ModulePermissionMap = {};

    SYSTEM_MODULES.forEach((mod) => {
      // Super admin safeguard
      if (mod.id === 'super-admin' && isUserSuperAdmin(selectedStaffObj)) {
        newPermissions[mod.id] = { visible: true, canEdit: true, canDelete: true };
        return;
      }

      if (preset === 'ALL') {
        newPermissions[mod.id] = { visible: true, canEdit: true, canDelete: true };
      } else if (preset === 'STANDARD') {
        const isOps = mod.sectionKey === 'USER' || mod.sectionKey === 'OPERATIONS' || mod.sectionKey === 'DEPARTMENTS';
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
            <span className="text-lg font-black text-amber-400">{visibleUsersList.filter(u => u.status !== 'INACTIVE').length} / {visibleUsersList.length}</span>
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
              <span>Staff Directory &amp; Role Access ({visibleUsersList.length})</span>
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
                <form onSubmit={handleCreateUser} className="bg-indigo-50/80 p-4 rounded-2xl border border-indigo-200 space-y-4 animate-in fade-in duration-200 shadow-xs">
                  <div className="flex items-center justify-between border-b border-indigo-200/80 pb-2.5">
                    <h3 className="font-black text-indigo-950 text-sm flex items-center gap-1.5">
                      <UserPlus className="w-4 h-4 text-indigo-600" /> Provision New Organization Staff Account
                    </h3>
                    <button
                      type="button"
                      onClick={() => {
                        setIsAddUserOpen(false);
                        setNewUserValidationErr(null);
                      }}
                      className="text-indigo-600 hover:text-indigo-900 font-bold text-xs cursor-pointer flex items-center gap-1"
                    >
                      <X className="w-4 h-4" />
                      <span>Cancel</span>
                    </button>
                  </div>

                  {newUserValidationErr && (
                    <div className="p-3 bg-rose-100 border border-rose-300 text-rose-900 rounded-xl font-bold text-xs flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>{newUserValidationErr}</span>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">Full Staff Name *</label>
                      <input
                        type="text"
                        value={newUserName}
                        onChange={(e) => setNewUserName(e.target.value)}
                        placeholder="e.g. Ramesh Verma"
                        className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">
                        Login Username * <span className="text-[10px] text-indigo-600 font-normal">(Unique)</span>
                      </label>
                      <input
                        type="text"
                        value={newUserUsername}
                        onChange={(e) => {
                          setNewUserUsername(e.target.value);
                          setNewUserValidationErr(null);
                        }}
                        placeholder="e.g. ramesh.verma"
                        className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">Designation / Role Title *</label>
                      <input
                        type="text"
                        value={newUserRoleTitle}
                        onChange={(e) => setNewUserRoleTitle(e.target.value)}
                        placeholder="e.g. Store Keeper / Purchase Assistant"
                        className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">System Governance Level *</label>
                      <select
                        value={newUserSystemRole}
                        onChange={(e) => setNewUserSystemRole(e.target.value as any)}
                        className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 font-bold text-slate-900 cursor-pointer focus:ring-2 focus:ring-indigo-500 outline-none"
                      >
                        <option value="OPERATIONAL_USER">OPERATIONAL_USER (Field / Site Staff)</option>
                        <option value="PROCESS_MANAGER">PROCESS_MANAGER (Approver / HOD)</option>
                        <option value="DEPT_ADMIN">DEPT_ADMIN (Store / Purchase Head)</option>
                        <option value="ADMIN">ADMIN (Operational Administrator)</option>
                        {currentUser?.userId === 'USR-000' && (
                          <option value="SUPER_ADMIN">SUPER_ADMIN (Full Control)</option>
                        )}
                      </select>
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">
                        Mobile Phone Number * <span className="text-[10px] text-indigo-600 font-normal">(10 Digits)</span>
                      </label>
                      <input
                        type="text"
                        value={newUserPhone}
                        onChange={(e) => {
                          setNewUserPhone(e.target.value);
                          setNewUserValidationErr(null);
                        }}
                        placeholder="e.g. 9827100099"
                        className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="font-bold text-indigo-950">WhatsApp Contact</label>
                        <label className="flex items-center gap-1 text-[10px] font-bold text-indigo-700 cursor-pointer">
                          <input
                            type="checkbox"
                            checked={newUserSameAsMobile}
                            onChange={(e) => setNewUserSameAsMobile(e.target.checked)}
                            className="rounded border-indigo-300 text-indigo-600"
                          />
                          <span>Same as Mobile</span>
                        </label>
                      </div>
                      <input
                        type="text"
                        value={newUserSameAsMobile ? newUserPhone : newUserWhatsappPhone}
                        onChange={(e) => {
                          setNewUserWhatsappPhone(e.target.value);
                          setNewUserValidationErr(null);
                        }}
                        disabled={newUserSameAsMobile}
                        placeholder="e.g. 9827100099"
                        className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none disabled:bg-slate-100 disabled:text-slate-500"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">
                        Official Email * <span className="text-[10px] text-indigo-600 font-normal">(Unique)</span>
                      </label>
                      <input
                        type="email"
                        value={newUserEmail}
                        onChange={(e) => {
                          setNewUserEmail(e.target.value);
                          setNewUserValidationErr(null);
                        }}
                        placeholder="e.g. ramesh@barbrik.in"
                        className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">Site / Base Location</label>
                      <input
                        type="text"
                        value={newUserSite}
                        onChange={(e) => setNewUserSite(e.target.value)}
                        placeholder="e.g. Siladehi Site"
                        className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 font-semibold text-slate-900 focus:ring-2 focus:ring-indigo-500 outline-none"
                      />
                    </div>

                    <div>
                      <label className="block font-bold text-indigo-950 mb-1">Initial Password &amp; Approval PIN</label>
                      <div className="grid grid-cols-2 gap-2">
                        <input
                          type="text"
                          value={newUserPassword}
                          onChange={(e) => setNewUserPassword(e.target.value)}
                          placeholder="pass123"
                          className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 font-mono text-xs font-bold text-slate-900"
                        />
                        <input
                          type="text"
                          maxLength={4}
                          value={newUserPin}
                          onChange={(e) => setNewUserPin(e.target.value.replace(/\D/g, ''))}
                          placeholder="1234"
                          className="w-full bg-white border border-indigo-200 rounded-xl p-2.5 font-mono text-xs font-bold text-slate-900"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between pt-2 border-t border-indigo-200/80">
                    <p className="text-[11px] text-indigo-800 font-medium">
                      Automatically validates distinct Username, Mobile No, WhatsApp No, and Official Email.
                    </p>
                    <button
                      type="submit"
                      className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-black rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                    >
                      <UserPlus className="w-4 h-4" />
                      <span>Save &amp; Activate Staff Account</span>
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
                              <div className="font-semibold text-slate-900">{user.phone || '9827100000'}</div>
                              {user.whatsappPhone && user.whatsappPhone !== user.phone && (
                                <div className="text-[10px] text-emerald-700 font-medium">WA: {user.whatsappPhone}</div>
                              )}
                              <div className="text-[10px] text-slate-400 font-mono">{user.email}</div>
                            </td>

                            <td className="p-3">
                              <span className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full uppercase ${
                                user.systemRole === 'SUPER_ADMIN'
                                  ? 'bg-amber-100 text-amber-900 border border-amber-300'
                                  : user.systemRole === 'ADMIN'
                                  ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
                                  : user.systemRole === 'DIRECTOR'
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                                  : user.systemRole === 'EXECUTIVE_ASSISTANT'
                                  ? 'bg-sky-100 text-sky-900 border border-sky-300'
                                  : user.systemRole === 'PROCESS_COORDINATOR'
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

                            <td className="p-3 pr-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5 flex-wrap">
                                {/* READ: View Full Profile */}
                                <button
                                  type="button"
                                  onClick={() => setViewProfileUser(user)}
                                  className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-800 font-bold rounded-lg border border-blue-200 cursor-pointer text-[11px] flex items-center gap-1"
                                  title="View Complete Staff Profile & Access Summary"
                                >
                                  <Eye className="w-3 h-3 text-blue-600" />
                                  <span>View</span>
                                </button>

                                {/* UPDATE: Edit Staff & Role */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenRoleManager(user)}
                                  className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold rounded-lg border border-indigo-300 cursor-pointer text-[11px] flex items-center gap-1"
                                  title="Edit Staff Credentials, Role, Phone & Email"
                                >
                                  <Edit3 className="w-3 h-3 text-indigo-600" />
                                  <span>Edit</span>
                                </button>

                                {/* UPDATE: Module Permissions (Operational Staff Only) */}
                                {!isUserSuperAdmin(user) && !isUserAdmin(user) && (
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setSelectedStaffForPermissions(user.userId);
                                      setActiveTab('PERMISSIONS');
                                    }}
                                    className="px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 font-bold rounded-lg border border-amber-300 cursor-pointer text-[11px] flex items-center gap-1"
                                    title="Configure Granular Module Visibility & Edit Rights"
                                  >
                                    <Sliders className="w-3 h-3 text-amber-700" />
                                    <span>Permissions</span>
                                  </button>
                                )}

                                {/* UPDATE: Password / PIN */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenPasswordReset(user)}
                                  className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold rounded-lg border border-slate-300 cursor-pointer text-[11px] flex items-center gap-1"
                                  title="Reset User Password & Security PIN"
                                >
                                  <KeyRound className="w-3 h-3 text-slate-600" />
                                  <span>Password</span>
                                </button>

                                {/* IMPERSONATE: View As */}
                                <button
                                  type="button"
                                  onClick={() => onImpersonateUser(user)}
                                  className="px-2 py-1 bg-teal-50 hover:bg-teal-100 text-teal-800 font-bold rounded-lg border border-teal-200 cursor-pointer text-[11px] flex items-center gap-1"
                                  title="Login As This User (Session Impersonation)"
                                >
                                  <UserCheck className="w-3 h-3 text-teal-600" />
                                  <span>View As</span>
                                </button>

                                {/* STATUS: Toggle Active / Inactive */}
                                <button
                                  type="button"
                                  onClick={() => handleToggleUserStatus(user.userId)}
                                  className={`px-2 py-1 font-bold rounded-lg border cursor-pointer text-[11px] ${
                                    isInactive
                                      ? 'bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border-emerald-200'
                                      : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                  }`}
                                >
                                  {isInactive ? 'Re-activate' : 'Deactivate'}
                                </button>

                                {/* DELETE: Delete Staff Member */}
                                <button
                                  type="button"
                                  onClick={() => handleOpenDeleteConfirm(user)}
                                  className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-800 font-bold rounded-lg border border-rose-300 cursor-pointer text-[11px] flex items-center gap-1"
                                  title="Permanently Delete Staff Account"
                                >
                                  <Trash2 className="w-3 h-3 text-rose-600" />
                                  <span>Delete</span>
                                </button>
                              </div>
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
                      {matrixTargetStaffList.length > 0 ? (
                        matrixTargetStaffList.map((u) => (
                          <option key={u.userId} value={u.userId}>
                            {u.name} ({u.role}) — {u.systemRole || 'STAFF'}
                          </option>
                        ))
                      ) : (
                        <option value="">No operational staff configured</option>
                      )}
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
                              : selectedStaffObj.systemRole === 'ADMIN'
                              ? 'bg-indigo-100 text-indigo-900 border border-indigo-300'
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

                    {/* Quick Presets (only for non-superadmin and non-admin) */}
                    {!isUserSuperAdmin(selectedStaffObj) && !isUserAdmin(selectedStaffObj) && (
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

              {/* If selected user is Super Admin or Admin */}
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
              ) : selectedStaffObj && isUserAdmin(selectedStaffObj) ? (
                <div className="p-6 bg-indigo-50 border border-indigo-300 rounded-2xl text-center space-y-2">
                  <div className="inline-flex p-3 bg-indigo-100 text-indigo-900 rounded-2xl">
                    <ShieldCheck className="w-8 h-8" />
                  </div>
                  <h3 className="font-black text-indigo-950 text-sm">Admin Role Access Active</h3>
                  <p className="text-xs text-indigo-900 max-w-lg mx-auto">
                    Admin users hold automatic administrative access to User Modules, Utilities &amp; Tools, Department Modules, and System Governance (all modules except Operations). Individual module toggle matrices apply only to operational staff members.
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
                        {visibleMatrixSections.map((section) => {
                          const visibleInSection = section.modules.filter(
                            (m) => getUserModulePermission(selectedStaffObj, m.id).visible
                          ).length;

                          return (
                            <React.Fragment key={section.sectionKey}>
                              {/* Section Header Row */}
                              <tr className="bg-slate-100/90 border-t-2 border-b border-slate-200">
                                <td colSpan={2} className="py-2.5 px-4">
                                  <div className="flex items-center gap-2.5">
                                    <div className="p-1.5 rounded-lg bg-white border border-slate-200 shadow-2xs">
                                      {getSectionIcon(section.sectionKey)}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-slate-900 text-xs tracking-tight">
                                          {section.title}
                                        </span>
                                        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-slate-200 text-slate-700">
                                          {section.modules.length} {section.sectionKey === 'DEPARTMENTS' ? 'Departments' : 'Modules'}
                                        </span>
                                        <span
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                            visibleInSection > 0
                                              ? 'bg-emerald-100 text-emerald-800'
                                              : 'bg-slate-200 text-slate-500'
                                          }`}
                                        >
                                          {visibleInSection} of {section.modules.length} Visible
                                        </span>
                                      </div>
                                      <p className="text-[10px] text-slate-500 line-clamp-1 mt-0.5">
                                        {section.description}
                                      </p>
                                    </div>
                                  </div>
                                </td>
                                <td colSpan={3} className="py-2 px-4 text-right">
                                  <div className="flex items-center justify-end gap-1.5">
                                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mr-1">
                                      Section:
                                    </span>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSectionPerm(section.sectionKey, 'visible', true)}
                                      className="px-2 py-1 bg-white hover:bg-emerald-50 text-emerald-700 border border-slate-300 hover:border-emerald-300 rounded-lg text-[10px] font-bold shadow-2xs cursor-pointer transition-colors"
                                    >
                                      Show All
                                    </button>
                                    <button
                                      type="button"
                                      onClick={() => handleToggleSectionPerm(section.sectionKey, 'visible', false)}
                                      className="px-2 py-1 bg-white hover:bg-rose-50 text-slate-600 hover:text-rose-700 border border-slate-300 hover:border-rose-300 rounded-lg text-[10px] font-bold shadow-2xs cursor-pointer transition-colors"
                                    >
                                      Hide All
                                    </button>
                                  </div>
                                </td>
                              </tr>

                              {/* Section Module Rows */}
                              {section.modules.map((mod) => {
                                const perm = getUserModulePermission(selectedStaffObj, mod.id);
                                const isVisible = perm.visible;
                                const canEdit = perm.canEdit;
                                const canDelete = perm.canDelete;
                                const isLockedSuperAdmin = mod.id === 'super-admin' && isUserSuperAdmin(selectedStaffObj);

                                return (
                                  <tr
                                    key={mod.id}
                                    className={`hover:bg-slate-50 transition-colors ${
                                      !isVisible ? 'bg-slate-50/50 opacity-70' : 'bg-white'
                                    }`}
                                  >
                                    {/* Module Info */}
                                    <td className="p-3 pl-4">
                                      <div className="flex items-center gap-2.5">
                                        <div className="p-1.5 rounded-lg bg-slate-50 border border-slate-200 shrink-0">
                                          {getModuleIcon(mod.iconName)}
                                        </div>
                                        <div>
                                          <div className="font-black text-slate-900 text-xs flex items-center gap-1.5 flex-wrap">
                                            <span>{mod.name}</span>
                                            <span className="font-mono text-[10px] text-slate-400">({mod.id})</span>
                                            {mod.isSafeguarded && (
                                              <span className="inline-flex items-center gap-1 text-[9px] font-black px-1.5 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
                                                <ShieldAlert className="w-3 h-3 text-amber-700" />
                                                <span>Super Admin Safeguard</span>
                                              </span>
                                            )}
                                          </div>
                                          <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-1">
                                            {mod.description}
                                          </div>
                                        </div>
                                      </div>
                                    </td>

                                    {/* Category Pill */}
                                    <td className="p-3">
                                      <span
                                        className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full uppercase tracking-wider ${
                                          section.sectionKey === 'USER'
                                            ? 'bg-blue-100 text-blue-800 border border-blue-200'
                                            : section.sectionKey === 'OPERATIONS'
                                            ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                            : section.sectionKey === 'UTILITIES'
                                            ? 'bg-teal-100 text-teal-800 border border-teal-200'
                                            : section.sectionKey === 'DEPARTMENTS'
                                            ? 'bg-purple-100 text-purple-800 border border-purple-200'
                                            : 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                        }`}
                                      >
                                        {section.sectionKey === 'DEPARTMENTS' ? 'DEPARTMENT' : mod.category}
                                      </span>
                                    </td>

                                    {/* Visibility Toggle */}
                                    <td className="p-3 text-center">
                                      <button
                                        type="button"
                                        disabled={isLockedSuperAdmin}
                                        onClick={() => handleToggleModulePerm(mod.id, 'visible')}
                                        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all inline-flex items-center gap-1.5 shadow-2xs border ${
                                          isLockedSuperAdmin
                                            ? 'bg-amber-50 text-amber-800 border-amber-300 cursor-not-allowed opacity-90'
                                            : isVisible
                                            ? 'bg-emerald-600 hover:bg-emerald-700 text-white border-emerald-700 cursor-pointer'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-600 border-slate-300 cursor-pointer'
                                        }`}
                                        title={
                                          isLockedSuperAdmin
                                            ? 'Super Admin master bypass active'
                                            : isVisible
                                            ? 'Visible in navigation bar & screens'
                                            : 'Hidden from user navigation'
                                        }
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
                                        disabled={isLockedSuperAdmin}
                                        onClick={() => handleToggleModulePerm(mod.id, 'canEdit')}
                                        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all inline-flex items-center gap-1.5 shadow-2xs border ${
                                          isLockedSuperAdmin
                                            ? 'bg-amber-50 text-amber-800 border-amber-300 cursor-not-allowed opacity-90'
                                            : canEdit
                                            ? 'bg-indigo-600 hover:bg-indigo-700 text-white border-indigo-700 cursor-pointer'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300 cursor-pointer'
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
                                        disabled={isLockedSuperAdmin}
                                        onClick={() => handleToggleModulePerm(mod.id, 'canDelete')}
                                        className={`px-3 py-1.5 rounded-xl font-bold text-[11px] transition-all inline-flex items-center gap-1.5 shadow-2xs border ${
                                          isLockedSuperAdmin
                                            ? 'bg-amber-50 text-amber-800 border-amber-300 cursor-not-allowed opacity-90'
                                            : canDelete
                                            ? 'bg-rose-600 hover:bg-rose-700 text-white border-rose-700 cursor-pointer'
                                            : 'bg-slate-100 hover:bg-slate-200 text-slate-500 border-slate-300 cursor-pointer'
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
                            </React.Fragment>
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
                          {displayedMatrixModules.filter((m) => getUserModulePermission(selectedStaffObj, m.id).visible).length}
                        </strong> of {displayedMatrixModules.length} Modules Shown
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-indigo-700 font-bold">
                          {displayedMatrixModules.filter((m) => getUserModulePermission(selectedStaffObj, m.id).canEdit).length}
                        </strong> Edit Rights
                      </span>
                      <span>•</span>
                      <span>
                        <strong className="text-rose-700 font-bold">
                          {displayedMatrixModules.filter((m) => getUserModulePermission(selectedStaffObj, m.id).canDelete).length}
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
                      {visibleUsersList.map((u) => (
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
                      {visibleUsersList
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

      {/* MODAL: READ - View Full Staff Profile */}
      {viewProfileUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 font-black flex items-center justify-center text-sm shrink-0">
                  {viewProfileUser.name.charAt(0)}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">{viewProfileUser.name}</h3>
                  <p className="text-[11px] text-slate-300 font-mono">@{viewProfileUser.username || viewProfileUser.userId} • {viewProfileUser.userId}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setViewProfileUser(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {/* Primary Attributes */}
              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200">
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Operational Title</span>
                  <span className="font-extrabold text-slate-900">{viewProfileUser.role}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Department</span>
                  <span className="font-extrabold text-slate-900">{viewProfileUser.departmentName || 'Operations'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">System Level</span>
                  <span className="font-black text-indigo-700">{viewProfileUser.systemRole || 'STAFF'}</span>
                </div>
                <div>
                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Site Location</span>
                  <span className="font-extrabold text-slate-900">{viewProfileUser.siteLocation || 'Siladehi Site'}</span>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-2">
                <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1">
                  <Phone className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Contact Credentials</span>
                </h4>
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Mobile Phone:</span>
                    <span className="font-bold text-slate-800">{viewProfileUser.phone || '9827100000'}</span>
                  </div>
                  <div className="p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">WhatsApp Contact:</span>
                    <span className="font-bold text-emerald-800">{viewProfileUser.whatsappPhone || viewProfileUser.phone || '9827100000'}</span>
                  </div>
                  <div className="col-span-2 p-2 bg-slate-50 rounded-lg border border-slate-100">
                    <span className="text-slate-400 text-[10px] block">Official Email Address:</span>
                    <span className="font-bold text-indigo-900">{viewProfileUser.email}</span>
                  </div>
                </div>
              </div>

              {/* Security Credentials */}
              <div className="p-3 bg-amber-50/80 border border-amber-200 rounded-xl space-y-1">
                <div className="font-bold text-amber-950 flex items-center gap-1.5 text-xs">
                  <KeyRound className="w-3.5 h-3.5 text-amber-700" />
                  <span>Authentication Credentials</span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span>Web Password: <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">{viewProfileUser.password || 'pass123'}</strong></span>
                  <span>Approval PIN: <strong className="font-mono bg-white px-1.5 py-0.5 rounded border border-amber-300">{viewProfileUser.approvalPin || '1234'}</strong></span>
                </div>
              </div>

              {/* Module Permissions Summary */}
              <div className="space-y-1.5">
                <h4 className="font-black text-slate-900 text-xs flex items-center gap-1.5 border-b border-slate-100 pb-1">
                  <Sliders className="w-3.5 h-3.5 text-amber-600" />
                  <span>Module Access Summary</span>
                </h4>
                <div className="flex flex-wrap gap-1">
                  {SYSTEM_MODULES.map((m) => {
                    const perm = getUserModulePermission(viewProfileUser, m.id);
                    if (!perm.visible) return null;
                    return (
                      <span key={m.id} className="text-[10px] font-extrabold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-900 border border-indigo-200">
                        {m.name} {perm.canEdit ? '(Edit)' : '(Read)'}
                      </span>
                    );
                  })}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    setViewProfileUser(null);
                    handleOpenRoleManager(viewProfileUser);
                  }}
                  className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold rounded-xl border border-indigo-200 cursor-pointer flex items-center gap-1"
                >
                  <Edit3 className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Edit Profile</span>
                </button>

                <button
                  type="button"
                  onClick={() => setViewProfileUser(null)}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-950 text-white font-bold rounded-xl cursor-pointer"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DELETE - Safety Delete Confirmation */}
      {deleteConfirmUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full border border-rose-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-rose-950 text-white p-4 flex items-center justify-between border-b border-rose-900">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-rose-500/20 text-rose-300 rounded-xl">
                  <ShieldAlert className="w-5 h-5 text-rose-400" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm text-rose-100">Permanently Delete Staff Member</h3>
                  <p className="text-[10px] text-rose-300">Irreversible Storage &amp; Account Purge</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDeleteConfirmUser(null)}
                className="text-rose-300 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 space-y-4 text-xs">
              {deleteSuccessMsg && (
                <div className="p-3 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>{deleteSuccessMsg}</span>
                </div>
              )}

              {deleteErrorMsg ? (
                <div className="p-3 bg-amber-50 border border-amber-300 text-amber-950 rounded-xl space-y-1">
                  <div className="font-extrabold flex items-center gap-1.5 text-amber-900">
                    <Lock className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Action Blocked By Governance Safeguard</span>
                  </div>
                  <p className="text-[11px] text-amber-900 leading-relaxed">
                    {deleteErrorMsg}
                  </p>
                </div>
              ) : (
                <div className="bg-rose-50/70 p-3.5 rounded-xl border border-rose-200 text-rose-950 space-y-2">
                  <p className="font-bold text-xs">
                    Are you sure you want to delete staff account <strong className="underline">{deleteConfirmUser.name}</strong>?
                  </p>
                  <div className="bg-white p-2.5 rounded-lg border border-rose-200 space-y-1 text-[11px]">
                    <div>User ID: <strong className="font-mono">{deleteConfirmUser.userId}</strong></div>
                    <div>Username: <strong className="font-mono">@{deleteConfirmUser.username}</strong></div>
                    <div>Designation: <strong>{deleteConfirmUser.role}</strong></div>
                    <div>Email: <strong>{deleteConfirmUser.email}</strong></div>
                  </div>
                  <p className="text-[10px] text-rose-700 leading-tight">
                    This will remove the user profile from local persistence and Firestore database. Active workflow tasks assigned to this user should be reassigned first.
                  </p>
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmUser(null)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl cursor-pointer"
                >
                  Cancel
                </button>
                {!deleteErrorMsg && (
                  <button
                    type="button"
                    onClick={handleExecuteDeleteUser}
                    className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs rounded-xl shadow-xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Confirm &amp; Delete Account</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

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

      {/* MODAL: UPDATE - Edit Staff Details & Role Access Manager */}
      {roleManagerUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-slate-200 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="bg-indigo-950 text-white p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-lg">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-extrabold text-sm">Edit Staff Profile &amp; System Authorization</h3>
                  <p className="text-[11px] text-indigo-200">Staff ID: {roleManagerUser.userId}</p>
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

              {editValidationErr && (
                <div className="p-3 bg-rose-100 border border-rose-300 text-rose-900 rounded-xl font-bold text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{editValidationErr}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Full Staff Name *
                  </label>
                  <input
                    type="text"
                    value={editName}
                    onChange={(e) => setEditName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Login Username * <span className="text-[10px] text-indigo-600 font-normal">(Unique)</span>
                  </label>
                  <input
                    type="text"
                    value={editUsername}
                    onChange={(e) => {
                      setEditUsername(e.target.value);
                      setEditValidationErr(null);
                    }}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

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
                    <option value="PROCESS_MANAGER">PROCESS_MANAGER (Process Coordinators &amp; Approvers)</option>
                    <option value="DEPT_ADMIN">DEPT_ADMIN (Department Head)</option>
                    <option value="ADMIN">ADMIN (Operational Administrator)</option>
                    {currentUser?.userId === 'USR-000' && (
                      <option value="SUPER_ADMIN">SUPER_ADMIN (Full Governance Control)</option>
                    )}
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
                    Site / Base Location *
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
                    Mobile Phone Number *
                  </label>
                  <input
                    type="text"
                    value={editPhone}
                    onChange={(e) => {
                      setEditPhone(e.target.value);
                      setEditValidationErr(null);
                    }}
                    placeholder="e.g. 9827100000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    WhatsApp Contact
                  </label>
                  <input
                    type="text"
                    value={editWhatsappPhone}
                    onChange={(e) => {
                      setEditWhatsappPhone(e.target.value);
                      setEditValidationErr(null);
                    }}
                    placeholder="e.g. 9827100000"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-extrabold text-slate-700 mb-1">
                    Official Email *
                  </label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => {
                      setEditEmail(e.target.value);
                      setEditValidationErr(null);
                    }}
                    placeholder="user@barbrik.in"
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold text-slate-900 focus:bg-white focus:ring-2 focus:ring-indigo-500 outline-none"
                    required
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
                  <span>Update Profile &amp; Access</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
