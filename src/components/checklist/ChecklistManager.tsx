import React, { useState } from 'react';
import { 
  CheckSquare, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  CheckCircle2, 
  Clock, 
  Building, 
  Mail, 
  Users, 
  Sparkles,
  ArrowRight,
  User,
  Info,
  Eye,
  MessageSquare,
  X,
  Send,
  ExternalLink,
  AlertTriangle,
  ListTodo,
  Download,
  Trash2
} from 'lucide-react';
import { downloadCsv } from '../../utils/csvExporter';
import { CustomSelect } from '../common/CustomSelect';
import { ChecklistItem, Frequency, UserProfile, ProcessRemark, isUserSuperAdmin, isUserAdminOrSuperAdmin, hasModulePermission, getUserModulePermission } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { ViewScope } from '../layout/Header';
import { matchItemDepartment, getDepartmentBranchLabel } from '../../services/stageAssignment';

interface ChecklistManagerProps {
  items: ChecklistItem[];
  currentUser: UserProfile;
  viewScope: ViewScope;
  onToggleScope: (scope: ViewScope) => void;
  onUpdateItem: (item: ChecklistItem) => void;
  onDeleteItem?: (id: string) => void;
  onNewItem?: () => void;
  onBatchGenerateNextCycle?: () => void;
  onAddProcessRemark?: (
    module: 'FMS' | 'CHECKLIST' | 'DELEGATION',
    targetId: string,
    category: ProcessRemark['category'],
    remarkText: string,
    stageIndex?: number
  ) => void;
  selectedDepartmentFilter?: string | null;
  onClearDepartmentFilter?: () => void;
}

export const ChecklistManager: React.FC<ChecklistManagerProps> = ({
  items,
  currentUser,
  viewScope,
  onToggleScope,
  onUpdateItem,
  onDeleteItem,
  onNewItem,
  onBatchGenerateNextCycle,
  onAddProcessRemark,
  selectedDepartmentFilter = null,
  onClearDepartmentFilter,
}) => {
  const [activeFrequency, setActiveFrequency] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const isAdminOrSuperAdmin = isUserAdminOrSuperAdmin(currentUser);
  const canViewAllOrg = isSuperAdmin || isAdminOrSuperAdmin;
  const canDelete = isSuperAdmin || isAdminOrSuperAdmin || getUserModulePermission(currentUser, 'checklist').canDelete;

  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);

  // Modal states
  const [viewDetailItem, setViewDetailItem] = useState<ChecklistItem | null>(null);
  const [remarkTarget, setRemarkTarget] = useState<ChecklistItem | null>(null);
  const [remarkCategory, setRemarkCategory] = useState<ProcessRemark['category']>('AWAITING_APPROVAL');
  const [remarkText, setRemarkText] = useState<string>('');

  const departments = Array.from(new Set(items.map((i) => i.department)));

  // Helper to check if an item belongs to the current user
  const isMyItem = (item: ChecklistItem) => {
    const itemEmail = item.email.toLowerCase();
    const curEmail = currentUser.email.toLowerCase();
    if (itemEmail === curEmail) return true;

    const itemName = item.name.toLowerCase();
    const curName = currentUser.name.toLowerCase();
    if (itemName.includes(curName)) return true;

    if (currentUser.phone && item.name.includes(currentUser.phone)) return true;

    return false;
  };

  const myItemsTotal = items.filter(isMyItem);
  const effectiveScope = canViewAllOrg ? viewScope : 'USER_ONLY';

  const filteredItems = items.filter((item) => {
    // 1. User Scope Filtering - non-superadmin only sees own tasks
    if (effectiveScope === 'USER_ONLY' && !isMyItem(item)) {
      return false;
    }

    // 1b. Department Filter from Sidebar
    if (selectedDepartmentFilter && !matchItemDepartment(item.department, selectedDepartmentFilter)) {
      return false;
    }

    // 2. Frequency Filtering
    if (activeFrequency !== 'ALL' && item.frequency !== activeFrequency) return false;

    // 3. Department Filtering
    if (departmentFilter !== 'ALL' && item.department !== departmentFilter) return false;

    // 4. Status Filtering
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;

    // 5. Search Filtering
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchTask = item.task.toLowerCase().includes(q);
      const matchName = item.name.toLowerCase().includes(q);
      const matchId = item.taskId.toLowerCase().includes(q);
      if (!matchTask && !matchName && !matchId) return false;
    }
    return true;
  });

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const parseDate = (dStr?: string): Date | undefined => {
    if (!dStr) return undefined;
    try {
      const cleaned = dStr.trim().split(' ')[0].split('T')[0];
      if (cleaned.includes('/')) {
        const parts = cleaned.split('/');
        if (parts.length === 3) {
          const p0 = parseInt(parts[0], 10);
          const p1 = parseInt(parts[1], 10);
          const p2 = parseInt(parts[2], 10);
          if (parts[2].length === 4 || p2 > 1000) {
            return new Date(p2, p1 - 1, p0);
          }
          if (parts[0].length === 4 || p0 > 1000) {
            return new Date(p0, p1 - 1, p2);
          }
          return new Date(p2, p1 - 1, p0);
        }
      } else if (cleaned.includes('-')) {
        const parts = cleaned.split('-');
        if (parts.length === 3) {
          const p0 = parseInt(parts[0], 10);
          const p1 = parseInt(parts[1], 10);
          const p2 = parseInt(parts[2], 10);
          if (parts[0].length === 4 || p0 > 1000) {
            return new Date(p0, p1 - 1, p2);
          }
          return new Date(p2, p1 - 1, p0);
        }
      }
      const direct = new Date(dStr);
      if (!isNaN(direct.getTime())) {
        return direct;
      }
      return undefined;
    } catch {
      return undefined;
    }
  };

  const isItemDueOrOverdue = (item: ChecklistItem): boolean => {
    if (!item.plannedDate) return true;
    const d = parseDate(item.plannedDate);
    if (!d) return true;
    d.setHours(0, 0, 0, 0);
    return d.getTime() <= today.getTime();
  };

  const handleToggleStatus = (item: ChecklistItem) => {
    if (!isMyItem(item)) return;
    const isDone = item.status === 'Done';
    // If not done, only allow marking done if due today or overdue
    if (!isDone && !isItemDueOrOverdue(item)) return;
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    const updated: ChecklistItem = {
      ...item,
      status: isDone ? 'Pending' : 'Done',
      actualDate: isDone ? undefined : formattedDate,
      updatedAt: now.toLocaleString('en-GB'),
    };
    onUpdateItem(updated);
  };

  const myFilteredItems = filteredItems.filter(isMyItem);

  const handleSelectAll = () => {
    const selectable = (viewScope === 'USER_ONLY' ? filteredItems : myFilteredItems).filter((i) => i.status !== 'Done' && isItemDueOrOverdue(i));
    if (selectedIds.length === selectable.length && selectable.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectable.map((i) => i.id));
    }
  };

  const handleToggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBatchMarkDone = () => {
    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;
    filteredItems.forEach((item) => {
      if (selectedIds.includes(item.id) && isMyItem(item) && item.status !== 'Done' && isItemDueOrOverdue(item)) {
        onUpdateItem({
          ...item,
          status: 'Done',
          actualDate: formattedDate,
          updatedAt: now.toLocaleString('en-GB'),
        });
      }
    });
    setSelectedIds([]);
  };

  const handleDeleteSingle = (id: string) => {
    if (onDeleteItem) {
      onDeleteItem(id);
    } else {
      storageAdapter.deleteChecklistItem(id, currentUser);
    }
    setConfirmDeleteId(null);
  };

  const handleBulkDelete = () => {
    if (selectedIds.length === 0) return;
    selectedIds.forEach((id) => {
      if (onDeleteItem) {
        onDeleteItem(id);
      } else {
        storageAdapter.deleteChecklistItem(id, currentUser);
      }
    });
    setSelectedIds([]);
    setBulkDeleteConfirm(false);
  };

  const handleExportFilteredCsv = () => {
    const headers = [
      'Task ID',
      'Assignee Name',
      'Email',
      'Department',
      'Frequency',
      'Checklist Task Description',
      'Planned Due Date',
      'Actual Completion Date',
      'Status',
      'Updated At'
    ];

    const rows = filteredItems.map((item) => [
      item.taskId,
      item.name,
      item.email,
      item.department,
      item.frequency,
      item.task,
      item.plannedDate,
      item.actualDate || '—',
      item.status,
      item.updatedAt || '—'
    ]);

    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`Checklist_Filtered_Export_${timestamp}.csv`, headers, rows);
  };

  const currentDisplayCount = filteredItems.length;
  const doneCount = (effectiveScope === 'USER_ONLY' ? myItemsTotal : items).filter((i) => i.status === 'Done').length;
  const totalBaseCount = effectiveScope === 'USER_ONLY' ? myItemsTotal.length : items.length;
  const complianceRate = totalBaseCount > 0 ? Math.round((doneCount / totalBaseCount) * 100) : 100;

  return (
    <div className="space-y-5">
      {/* Department Filter Indicator from Sidebar */}
      {selectedDepartmentFilter && (
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 px-3.5 py-2.5 bg-blue-50/90 border border-blue-200 rounded-xl text-xs shadow-2xs">
          <div className="flex items-center gap-2 text-blue-950 font-semibold">
            <CheckSquare className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              Department: <strong className="text-blue-700">{getDepartmentBranchLabel(selectedDepartmentFilter)}</strong>
            </span>
            <span className="text-slate-400">·</span>
            <span className="text-slate-600 font-normal">{filteredItems.length} checklist tasks</span>
          </div>
          {onClearDepartmentFilter && (
            <button
              type="button"
              onClick={onClearDepartmentFilter}
              className="px-2.5 py-1 bg-blue-200 hover:bg-blue-300 text-blue-900 rounded-md font-bold text-[11px] transition-colors cursor-pointer"
            >
              Clear Filter ✕
            </button>
          )}
        </div>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Checklists Card */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          title="Click to show all checklist items"
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50 scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'ALL' ? 'text-white' : 'text-indigo-600'}`}>
              Total Checklist Items
            </span>
            <ListTodo className={`w-5 h-5 ${statusFilter === 'ALL' ? 'text-white' : 'text-indigo-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-3xl sm:text-4xl font-black ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
              {totalBaseCount}
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              statusFilter === 'ALL'
                ? 'bg-white/25 text-white'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            }`}>
              Total Scope
            </span>
          </div>
        </div>

        {/* Pending Checklists Card */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'ALL' : 'Pending')}
          title="Click to filter Pending checklists"
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'Pending'
              ? 'bg-rose-600 text-white shadow-md ring-2 ring-rose-400/50 scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'Pending' ? 'text-white' : 'text-rose-600'}`}>
              Pending Execution
            </span>
            <AlertTriangle className={`w-5 h-5 ${statusFilter === 'Pending' ? 'text-white' : 'text-rose-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-3xl sm:text-4xl font-black ${statusFilter === 'Pending' ? 'text-white' : 'text-slate-900'}`}>
              {totalBaseCount - doneCount}
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              statusFilter === 'Pending'
                ? 'bg-white/25 text-white'
                : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              Needs Done
            </span>
          </div>
        </div>

        {/* Completed Checklists Card */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Done' ? 'ALL' : 'Done')}
          title="Click to filter Completed checklists"
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'Done'
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50 scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'Done' ? 'text-white' : 'text-emerald-600'}`}>
              Completed Compliance
            </span>
            <CheckCircle2 className={`w-5 h-5 ${statusFilter === 'Done' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-3xl sm:text-4xl font-black ${statusFilter === 'Done' ? 'text-white' : 'text-slate-900'}`}>
              {doneCount}
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              statusFilter === 'Done'
                ? 'bg-white/25 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              Verified OK
            </span>
          </div>
        </div>
      </div>

      {/* Frequency Tabs & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* User scope selector as dropdown - Super Admin & Administrative User */}
          {canViewAllOrg && (
            <CustomSelect
              options={[
                { value: 'USER_ONLY', label: `My Tasks (${myItemsTotal.length})` },
                { value: 'ALL_ORG', label: `All Staff (${items.length})` },
              ]}
              value={viewScope}
              onChange={(val) => onToggleScope(val as any)}
              icon={<User className="w-3.5 h-3.5 text-indigo-600" />}
              size="xs"
              variant="default"
              className="w-40"
            />
          )}

          {/* Frequency selector as dropdown */}
          <CustomSelect
            options={[
              { value: 'ALL', label: 'All Frequencies' },
              { value: 'W', label: 'Weekly' },
              { value: 'M', label: 'Monthly' },
            ]}
            value={activeFrequency}
            onChange={(val) => setActiveFrequency(val as any)}
            icon={<Filter className="w-3.5 h-3.5 text-indigo-600" />}
            size="xs"
            variant="default"
            className="w-36"
          />

          {/* Department filter (useful in ALL_ORG mode) */}
          {canViewAllOrg && viewScope === 'ALL_ORG' && (
            <CustomSelect
              options={[
                { value: 'ALL', label: 'All Depts' },
                ...departments.map((dept) => ({ value: dept, label: dept })),
              ]}
              value={departmentFilter}
              onChange={(val) => setDepartmentFilter(val)}
              size="xs"
              variant="default"
              className="w-36"
            />
          )}

          {/* Status filter */}
          <CustomSelect
            options={[
              { value: 'ALL', label: 'All Status' },
              { value: 'Done', label: 'Done' },
              { value: 'Pending', label: 'Pending' },
            ]}
            value={statusFilter}
            onChange={(val) => setStatusFilter(val)}
            size="xs"
            variant="default"
            className="w-32"
          />

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-36 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportFilteredCsv}
            title="Export currently filtered checklist items to CSV/Excel"
            className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors shrink-0 border border-slate-300 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV ({filteredItems.length})</span>
          </button>
          {(isSuperAdmin || isAdminOrSuperAdmin) && onBatchGenerateNextCycle && (
            <button
              onClick={onBatchGenerateNextCycle}
              title="Auto-generates next recurring maintenance cycle"
              className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer shrink-0"
            >
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Auto Roll Out Next Cycle</span>
            </button>
          )}
          {(isSuperAdmin || isAdminOrSuperAdmin || hasModulePermission(currentUser, 'checklist', 'edit')) && onNewItem && (
            <button
              onClick={onNewItem}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Add Checklist Item</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-950 text-white p-3 px-4 rounded-xl shadow-lg border border-indigo-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckSquare className="w-4 h-4 text-indigo-300" />
            <span>{selectedIds.length} Checklist Items Selected for Batch Action</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleBatchMarkDone}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Bulk Mark Done ({selectedIds.length})
            </button>
            {canDelete && (
              bulkDeleteConfirm ? (
                <div className="flex items-center gap-1.5 bg-rose-900/90 border border-rose-500 rounded-lg px-2.5 py-1">
                  <span className="text-[11px] font-bold text-rose-200">Delete {selectedIds.length} items?</span>
                  <button
                    type="button"
                    onClick={handleBulkDelete}
                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold cursor-pointer transition-colors"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setBulkDeleteConfirm(false)}
                    className="px-2 py-0.5 bg-white/20 hover:bg-white/30 text-white rounded text-[11px] cursor-pointer transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setBulkDeleteConfirm(true)}
                  className="px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
                  title="Delete all selected checklist items"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Selected ({selectedIds.length})</span>
                </button>
              )
            )}
            <button
              onClick={() => {
                setSelectedIds([]);
                setBulkDeleteConfirm(false);
              }}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 cursor-pointer"
            >
              Cancel Selection
            </button>
          </div>
        </div>
      )}

      {/* Checklist Table (Exact reflection of Sheet 3) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredItems.length && filteredItems.length > 0}
                    onChange={handleSelectAll}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="Select all for batch action"
                  />
                </th>
                <th className="py-2.5 px-4">Name (Staff)</th>
                <th className="py-2.5 px-3">Email Accountable</th>
                <th className="py-2.5 px-3">Department</th>
                <th className="py-2.5 px-3 text-center">Task ID</th>
                <th className="py-2.5 px-3 text-center">Freq</th>
                <th className="py-2.5 px-4">Checklist Task</th>
                <th className="py-2.5 px-3">Planned</th>
                <th className="py-2.5 px-3">Actual</th>
                <th className="py-2.5 px-3">Status</th>
                <th className="py-2.5 px-3">Buddy Email</th>
                <th className="py-2.5 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item) => {
                  const isDone = item.status === 'Done';
                  const rowBg = 'bg-white';
                  const isMine = isMyItem(item);
                  const isSelected = selectedIds.includes(item.id);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-slate-50 transition-colors ${isSelected ? 'bg-indigo-50/70' : rowBg}`}
                    >
                      {/* Batch select checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectId(item.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Name */}
                      <td className="py-2.5 px-4 font-semibold text-slate-800 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          {item.name}
                          {isMine && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Accountable Email */}
                      <td className="py-2.5 px-3 text-slate-600 font-mono text-[11px] whitespace-nowrap">
                        {item.email}
                      </td>

                      {/* Department */}
                      <td className="py-2.5 px-3 text-slate-700 whitespace-nowrap">
                        <span className="px-2 py-0.5 rounded bg-slate-100 font-medium text-[11px]">
                          {item.department}
                        </span>
                      </td>

                      {/* Task ID (Col D) */}
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800">
                        {item.taskId}
                      </td>

                      {/* Frequency (Col E: W, M, D) */}
                      <td className="py-2.5 px-3 text-center font-bold">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] ${
                            item.frequency === 'W'
                              ? 'bg-indigo-100 text-indigo-800'
                              : item.frequency === 'M'
                              ? 'bg-purple-100 text-purple-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.frequency}
                        </span>
                      </td>

                      {/* Task (Col F) */}
                      <td className="py-2.5 px-4 font-medium text-slate-900 min-w-[280px]">
                        <span className={isDone ? 'line-through text-slate-400' : ''}>
                          {item.task}
                        </span>
                        {item.processRemarks && item.processRemarks.length > 0 && (
                          <div className="mt-1 p-1 rounded bg-purple-50 border border-purple-200 text-[10px] text-purple-900 flex items-start gap-1">
                            <MessageSquare className="w-3 h-3 text-purple-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>Note ({item.processRemarks[0].authorName}):</strong> {item.processRemarks[0].remarkText}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* Planned Date */}
                      <td className="py-2.5 px-3 font-mono text-slate-600 whitespace-nowrap">
                        {item.plannedDate}
                      </td>

                      {/* Actual Date */}
                      <td className="py-2.5 px-3 font-mono text-slate-800 font-medium whitespace-nowrap">
                        {item.actualDate || '—'}
                      </td>

                      {/* Status */}
                      <td className="py-2.5 px-3 whitespace-nowrap">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                            isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>

                      {/* Buddy Email */}
                      <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px] whitespace-nowrap">
                        {item.buddyEmail || '—'}
                      </td>

                      {/* Quick Action Buttons */}
                      <td className="py-2.5 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Mark Done / Reopen button (Strict User Assignment Check & Due Today/Overdue Only) */}
                          {isMine && (
                            isDone ? (
                              <button
                                onClick={() => handleToggleStatus(item)}
                                className="px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded text-[11px] transition-colors cursor-pointer"
                              >
                                Reopen
                              </button>
                            ) : isItemDueOrOverdue(item) ? (
                              <button
                                onClick={() => handleToggleStatus(item)}
                                className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-[11px] transition-colors cursor-pointer"
                              >
                                Mark Done
                              </button>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-medium px-2 py-1 bg-slate-50 border border-slate-200 rounded">
                                Scheduled {item.plannedDate}
                              </span>
                            )
                          )}

                          {/* View Detail Context (Available to all users to see current stage/progress) */}
                          <button
                            onClick={() => setViewDetailItem(item)}
                            title="View checklist detail & context"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </button>

                          {/* Add Process Remark */}
                          <button
                            onClick={() => {
                              setRemarkTarget(item);
                              setRemarkText('');
                            }}
                            title="Add Process Coordinator Remark"
                            className="p-1.5 hover:bg-purple-50 text-slate-400 hover:text-purple-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>

                          {/* Delete Item */}
                          {canDelete && (
                            confirmDeleteId === item.id ? (
                              <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded px-1.5 py-0.5">
                                <button
                                  type="button"
                                  onClick={() => handleDeleteSingle(item.id)}
                                  className="px-1.5 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10px] font-bold cursor-pointer"
                                  title="Confirm deletion"
                                >
                                  Del
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteId(null)}
                                  className="px-1.5 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-[10px] cursor-pointer"
                                  title="Cancel"
                                >
                                  ✕
                                </button>
                              </div>
                            ) : (
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteId(item.id)}
                                className="p-1.5 hover:bg-rose-50 text-rose-500 hover:text-rose-700 rounded-lg transition-colors cursor-pointer"
                                title="Delete Item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-slate-500">
                    <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No checklist items found for {currentUser.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Switch to &quot;All Staff&quot; or switch your active user profile in the top-right menu.
                    </p>
                    <button
                      onClick={() => onToggleScope('ALL_ORG')}
                      className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      View All Organization Checklists ({items.length})
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer */}
        <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
          <div>
            Showing <span className="font-semibold text-slate-800">{filteredItems.length}</span> checklist tasks ({doneCount} completed)
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            BarBrik Compliance System • Frequency: {activeFrequency}
          </div>
        </div>
      </div>

      {/* Checklist Detail Context Modal */}
      {viewDetailItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-800 text-white">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Info className="w-4 h-4 text-indigo-400" />
                <span>Checklist Context — {viewDetailItem.taskId}</span>
              </div>
              <button
                onClick={() => setViewDetailItem(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-blue-950 text-sm">{viewDetailItem.task}</span>
                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-blue-100 text-blue-800">
                    CHECKLIST
                  </span>
                </div>
                <p className="text-blue-800 font-medium">Department: {viewDetailItem.department} • Accountable: {viewDetailItem.name} ({viewDetailItem.email})</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">Frequency</span>
                  <span className="font-bold text-slate-900 text-xs mt-0.5 block">
                    {viewDetailItem.frequency === 'W' ? 'Weekly' : viewDetailItem.frequency === 'M' ? 'Monthly' : 'Daily'}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">Planned Date</span>
                  <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">{viewDetailItem.plannedDate}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">Actual Execution Date</span>
                  <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">{viewDetailItem.actualDate || '—'}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">Status</span>
                  <span className={`font-bold text-xs mt-0.5 block ${
                    viewDetailItem.status === 'Done' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {viewDetailItem.status}
                  </span>
                </div>
              </div>

              {/* Evidence Document link */}
              {viewDetailItem.evidenceUrl && (
                <div className="p-3 rounded-xl bg-purple-50 border border-purple-200">
                  <span className="font-bold text-purple-950 block text-[11px]">Submitted Photo / Document Evidence</span>
                  <a
                    href={viewDetailItem.evidenceUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-1 text-purple-700 underline font-semibold flex items-center gap-1"
                  >
                    <ExternalLink className="w-3 h-3" /> View Evidence Document
                  </a>
                </div>
              )}

              {/* Process Remarks */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="font-bold text-purple-950 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                  Process Audit Notes ({viewDetailItem.processRemarks?.length || 0})
                </span>

                {viewDetailItem.processRemarks && viewDetailItem.processRemarks.length > 0 ? (
                  <div className="space-y-2">
                    {viewDetailItem.processRemarks.map((rem, rIdx) => (
                      <div key={rem.id || rIdx} className="p-2.5 rounded-lg bg-purple-50 border border-purple-200 space-y-1">
                        <div className="flex items-center justify-between font-bold text-purple-950">
                          <span>{rem.authorName} ({rem.authorRole})</span>
                          <span className="font-mono text-[10px] font-normal text-purple-600">{rem.timestamp}</span>
                        </div>
                        <span className="inline-block px-1.5 py-0.2 rounded bg-purple-200/80 text-purple-900 font-bold text-[10px]">
                          {rem.category.replace('_', ' ')}
                        </span>
                        <p className="text-purple-900 font-medium leading-relaxed mt-0.5">{rem.remarkText}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 italic text-[11px] p-2 bg-slate-50 rounded-lg">
                    No process remarks logged yet.
                  </p>
                )}
              </div>
            </div>

            <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
              <button
                type="button"
                onClick={() => setViewDetailItem(null)}
                className="px-4 py-1.5 bg-slate-800 hover:bg-slate-900 text-white font-bold rounded-lg transition-colors text-xs cursor-pointer"
              >
                Close Inspection
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Remark Modal */}
      {remarkTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-purple-900 text-white">
              <div className="flex items-center gap-2 font-bold text-sm">
                <MessageSquare className="w-4 h-4 text-purple-300" />
                <span>Process Audit Remark — {remarkTarget.taskId}</span>
              </div>
              <button
                onClick={() => setRemarkTarget(null)}
                className="text-purple-200 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs">
              <div>
                <span className="font-semibold text-slate-700 block mb-1">Checklist Task:</span>
                <p className="p-2.5 bg-slate-50 rounded-lg text-slate-800 font-medium border border-slate-200">
                  {remarkTarget.task} ({remarkTarget.name})
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Compliance / Delay Category
                </label>
                <select
                  value={remarkCategory}
                  onChange={(e) => setRemarkCategory(e.target.value as ProcessRemark['category'])}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-medium text-xs cursor-pointer"
                >
                  <option value="AWAITING_APPROVAL">Awaiting Management / Verification</option>
                  <option value="VENDOR_DELAY">Vendor / Third-Party Delay</option>
                  <option value="SITE_DOCS_MISSING">Site Unavailable / Docs Missing</option>
                  <option value="STAFF_ON_LEAVE">Staff On Leave / Shift Gap</option>
                  <option value="TECHNICAL_ISSUE">Equipment Breakdown / Technical Issue</option>
                  <option value="OTHER">General Operations / Other Remark</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Detailed Justification / Remark Note <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  value={remarkText}
                  onChange={(e) => setRemarkText(e.target.value)}
                  placeholder="Enter detailed compliance remark or note..."
                  className="w-full p-2.5 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 text-xs"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setRemarkTarget(null)}
                  className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 font-semibold hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => {
                    if (!remarkText.trim()) return;
                    if (onAddProcessRemark) {
                      onAddProcessRemark(
                        'CHECKLIST',
                        remarkTarget.id,
                        remarkCategory,
                        remarkText.trim()
                      );
                    } else {
                      const newRemark: ProcessRemark = {
                        id: `rem-${Date.now()}`,
                        authorName: currentUser.name,
                        authorRole: currentUser.role,
                        category: remarkCategory,
                        remarkText: remarkText.trim(),
                        timestamp: new Date().toLocaleString('en-GB')
                      };
                      const existing = remarkTarget.processRemarks || [];
                      onUpdateItem({
                        ...remarkTarget,
                        processRemarks: [newRemark, ...existing]
                      });
                    }
                    setRemarkTarget(null);
                    setRemarkText('');
                  }}
                  className="px-4 py-1.5 rounded-lg bg-purple-600 hover:bg-purple-700 text-white font-bold flex items-center gap-1.5 shadow-sm cursor-pointer"
                >
                  <Send className="w-3.5 h-3.5" /> Log Process Note
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
