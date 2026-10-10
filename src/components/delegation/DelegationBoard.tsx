import React, { useState } from 'react';
import { 
  ListTodo, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  CheckSquare,
  RefreshCw, 
  ChevronRight,
  AlertTriangle,
  History,
  Phone,
  User,
  Users,
  Eye,
  MessageSquare,
  X,
  Info,
  Send,
  Download
} from 'lucide-react';
import { downloadCsv } from '../../utils/csvExporter';
import { DelegationTask, UserProfile, ProcessRemark, isUserSuperAdmin, hasModulePermission } from '../../types';
import { ViewScope } from '../layout/Header';

interface DelegationBoardProps {
  tasks: DelegationTask[];
  currentUser: UserProfile;
  viewScope: ViewScope;
  onToggleScope: (scope: ViewScope) => void;
  onUpdateTask: (task: DelegationTask) => void;
  onNewTask?: () => void;
  onReviseTask: (task: DelegationTask) => void;
  onAddProcessRemark?: (
    module: 'FMS' | 'CHECKLIST' | 'DELEGATION',
    targetId: string,
    category: ProcessRemark['category'],
    remarkText: string,
    stageIndex?: number
  ) => void;
}

export const DelegationBoard: React.FC<DelegationBoardProps> = ({
  tasks,
  currentUser,
  viewScope,
  onToggleScope,
  onUpdateTask,
  onNewTask,
  onReviseTask,
  onAddProcessRemark,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const isSuperAdmin = isUserSuperAdmin(currentUser);

  // Modal states for View Context and Add Remark
  const [viewDetailTask, setViewDetailTask] = useState<DelegationTask | null>(null);
  const [remarkTarget, setRemarkTarget] = useState<DelegationTask | null>(null);
  const [remarkCategory, setRemarkCategory] = useState<ProcessRemark['category']>('AWAITING_APPROVAL');
  const [remarkText, setRemarkText] = useState<string>('');

  const uniqueAssignees = Array.from(new Set(tasks.map((t) => t.name)));

  // Helper to check if task is assigned to currentUser
  const isMyTask = (task: DelegationTask) => {
    const curName = currentUser.name.toLowerCase();
    const taskName = task.name.toLowerCase();
    const rolePhone = task.rolePhone.toLowerCase();

    if (taskName.includes(curName) || rolePhone.includes(curName)) return true;
    if (currentUser.phone && (taskName.includes(currentUser.phone) || rolePhone.includes(currentUser.phone))) return true;

    return false;
  };

  const myTasksTotal = tasks.filter(isMyTask);
  const effectiveScope = isSuperAdmin ? viewScope : 'USER_ONLY';

  const filteredTasks = tasks.filter((task) => {
    // 1. User Scope Filtering - non-superadmin only sees own tasks
    if (effectiveScope === 'USER_ONLY' && !isMyTask(task)) {
      return false;
    }

    // 2. Status Filtering
    if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;

    // 3. Assignee Filter (in ALL_ORG mode)
    if (effectiveScope === 'ALL_ORG' && assigneeFilter !== 'ALL' && task.name !== assigneeFilter) return false;

    // 4. Search Filtering
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchId = task.taskId.toLowerCase().includes(q);
      const matchTask = task.task.toLowerCase().includes(q);
      const matchName = task.name.toLowerCase().includes(q);
      if (!matchId && !matchTask && !matchName) return false;
    }
    return true;
  });

  const handleToggleComplete = (task: DelegationTask) => {
    if (!isMyTask(task)) return;
    const isCompleted = task.status === 'Completed';
    const updated: DelegationTask = {
      ...task,
      status: isCompleted ? 'Pending' : 'Completed',
      completedAt: isCompleted ? undefined : new Date().toLocaleString('en-GB'),
    };
    onUpdateTask(updated);
  };

  const myFilteredTasks = filteredTasks.filter(isMyTask);

  const handleSelectAll = () => {
    const selectable = viewScope === 'USER_ONLY' ? filteredTasks : myFilteredTasks;
    if (selectedIds.length === selectable.length && selectable.length > 0) {
      setSelectedIds([]);
    } else {
      setSelectedIds(selectable.map((t) => t.id));
    }
  };

  const handleToggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleBatchMarkComplete = () => {
    const now = new Date().toLocaleString('en-GB');
    filteredTasks.forEach((t) => {
      if (selectedIds.includes(t.id) && isMyTask(t) && t.status !== 'Completed') {
        onUpdateTask({
          ...t,
          status: 'Completed',
          completedAt: now,
        });
      }
    });
    setSelectedIds([]);
  };

  const handleWeekShift = (task: DelegationTask) => {
    const parts = task.latestRevision.split('/');
    let newDateStr = task.latestRevision;
    if (parts.length === 3) {
      const d = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0]));
      d.setDate(d.getDate() + 7);
      newDateStr = `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
    }

    const newRevCount = task.totalRevisions + 1;
    const rev1 = task.revision1 || newDateStr;
    const rev2 = task.revision1 ? newDateStr : task.revision2;

    const updated: DelegationTask = {
      ...task,
      revision1: rev1,
      revision2: rev2,
      latestRevision: newDateStr,
      totalRevisions: newRevCount,
      status: 'Week Shifted',
    };
    onUpdateTask(updated);
  };

  const currentDataset = effectiveScope === 'USER_ONLY' ? myTasksTotal : tasks;
  const pendingCount = currentDataset.filter((t) => t.status === 'Pending').length;
  const completedCount = currentDataset.filter((t) => t.status === 'Completed').length;
  const shiftedCount = currentDataset.filter((t) => t.status === 'Week Shifted').length;

  const handleExportFilteredCsv = () => {
    const headers = [
      'Task ID',
      'Assignee Name',
      'Role / Contact',
      'Task Description',
      'Priority',
      'Status',
      'First Assigned Date',
      'Latest Revised SLA Date',
      'Total Shifts / Revisions',
      'Completed Timestamp'
    ];

    const rows = filteredTasks.map((t) => [
      t.taskId,
      t.name,
      t.rolePhone,
      t.task,
      t.priority || 'Normal',
      t.status,
      t.firstDate,
      t.latestRevision || t.firstDate,
      t.totalRevisions || 0,
      t.completedAt || '—'
    ]);

    const timestamp = new Date().toISOString().slice(0, 10);
    downloadCsv(`Delegation_Tasks_Filtered_Export_${timestamp}.csv`, headers, rows);
  };

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Total Delegated Card */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          title="Click to show all tasks"
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'ALL'
              ? 'bg-indigo-600 text-white shadow-md ring-2 ring-indigo-400/50 scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'ALL' ? 'text-white' : 'text-indigo-600'}`}>
              {effectiveScope === 'USER_ONLY' ? 'My Delegated' : 'Total Delegated'}
            </span>
            <ListTodo className={`w-5 h-5 ${statusFilter === 'ALL' ? 'text-white' : 'text-indigo-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-3xl sm:text-4xl font-black ${statusFilter === 'ALL' ? 'text-white' : 'text-slate-900'}`}>
              {currentDataset.length}
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              statusFilter === 'ALL'
                ? 'bg-white/25 text-white'
                : 'bg-indigo-50 text-indigo-700 border border-indigo-100'
            }`}>
              Sheet 2 Scope
            </span>
          </div>
        </div>

        {/* Pending Card */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'ALL' : 'Pending')}
          title="Click to filter Pending tasks"
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
              {pendingCount}
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              statusFilter === 'Pending'
                ? 'bg-white/25 text-white'
                : 'bg-rose-50 text-rose-700 border border-rose-100'
            }`}>
              Action Needed
            </span>
          </div>
        </div>

        {/* Completed Card */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'ALL' : 'Completed')}
          title="Click to filter Completed tasks"
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'Completed'
              ? 'bg-emerald-600 text-white shadow-md ring-2 ring-emerald-400/50 scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'Completed' ? 'text-white' : 'text-emerald-600'}`}>
              Completed
            </span>
            <CheckCircle2 className={`w-5 h-5 ${statusFilter === 'Completed' ? 'text-white' : 'text-emerald-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-3xl sm:text-4xl font-black ${statusFilter === 'Completed' ? 'text-white' : 'text-slate-900'}`}>
              {completedCount}
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              statusFilter === 'Completed'
                ? 'bg-white/25 text-white'
                : 'bg-emerald-50 text-emerald-700 border border-emerald-100'
            }`}>
              Finished
            </span>
          </div>
        </div>

        {/* Week Shifted Card */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Week Shifted' ? 'ALL' : 'Week Shifted')}
          title="Click to filter Week Shifted tasks"
          className={`p-5 rounded-2xl border cursor-pointer transition-all ${
            statusFilter === 'Week Shifted'
              ? 'bg-amber-500 text-white shadow-md ring-2 ring-amber-400/50 scale-[1.01]'
              : 'bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs text-slate-900'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className={`text-xs font-bold uppercase tracking-wider ${statusFilter === 'Week Shifted' ? 'text-white' : 'text-amber-600'}`}>
              Week Shifted
            </span>
            <RefreshCw className={`w-5 h-5 ${statusFilter === 'Week Shifted' ? 'text-white' : 'text-amber-500'}`} />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className={`text-3xl sm:text-4xl font-black ${statusFilter === 'Week Shifted' ? 'text-white' : 'text-slate-900'}`}>
              {shiftedCount}
            </span>
            <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
              statusFilter === 'Week Shifted'
                ? 'bg-white/25 text-white'
                : 'bg-amber-50 text-amber-700 border border-amber-100'
            }`}>
              Revised SLA
            </span>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* User scope selector as dropdown - Super Admin Only */}
          {isSuperAdmin && (
            <div className="flex items-center bg-white px-2.5 py-1.5 rounded-lg border border-slate-200 shadow-2xs gap-1.5">
              <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
              <select
                aria-label="Filter by scope"
                value={viewScope}
                onChange={(e) => onToggleScope(e.target.value as ViewScope)}
                className="text-xs font-bold bg-transparent border-none text-slate-700 hover:text-slate-900 focus:outline-none cursor-pointer py-0.5"
              >
                <option value="USER_ONLY">Assigned to Me — {myTasksTotal.length}</option>
                <option value="ALL_ORG">All Staff — {tasks.length}</option>
              </select>
            </div>
          )}

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Task ID, Task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-700 font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Week Shifted">Week Shifted</option>
            </select>
          </div>

          {isSuperAdmin && viewScope === 'ALL_ORG' && (
            <div className="flex items-center gap-2">
              <select
                aria-label="Filter by assignee"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-700 font-semibold max-w-[180px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
              >
                <option value="ALL">All Staff</option>
                {uniqueAssignees.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleExportFilteredCsv}
            title="Export currently filtered delegation tasks to CSV/Excel"
            className="flex items-center justify-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 font-semibold rounded-lg text-xs transition-colors shrink-0 border border-slate-300 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5 text-slate-600" />
            <span>Export CSV ({filteredTasks.length})</span>
          </button>
          {(isSuperAdmin || hasModulePermission(currentUser, 'delegation', 'edit')) && (
            <button
              onClick={onNewTask}
              className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors shrink-0 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Delegate New Task</span>
            </button>
          )}
        </div>
      </div>

      {/* Floating Batch Action Bar */}
      {selectedIds.length > 0 && (
        <div className="bg-indigo-950 text-white p-3 px-4 rounded-xl shadow-lg border border-indigo-700/50 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-xs font-bold">
            <CheckSquare className="w-4 h-4 text-indigo-300" />
            <span>{selectedIds.length} Tasks Selected for Batch Action</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleBatchMarkComplete}
              className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors cursor-pointer"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Bulk Mark Done ({selectedIds.length})
            </button>
            <button
              onClick={() => setSelectedIds([])}
              className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold border border-white/20 cursor-pointer"
            >
              Cancel Selection
            </button>
          </div>
        </div>
      )}

      {/* Task Assignment Table (Direct 1-to-1 reflection of Sheet 2) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-white text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-8 text-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.length === filteredTasks.length && filteredTasks.length > 0}
                    onChange={handleSelectAll}
                    className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="Select all for batch action"
                  />
                </th>
                <th className="py-3 px-3">Task ID</th>
                <th className="py-3 px-4">Assignee &amp; Role</th>
                <th className="py-3 px-4">Task Description</th>
                <th className="py-3 px-3">First Date</th>
                <th className="py-3 px-3">Rev 1</th>
                <th className="py-3 px-3">Rev 2</th>
                <th className="py-3 px-3">Latest Rev</th>
                <th className="py-3 px-3 text-center">Total Rev</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-4 text-right">Quick Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => {
                  const isDone = task.status === 'Completed';
                  const isShifted = task.status === 'Week Shifted';
                  const isMine = isMyTask(task);
                  const isSelected = selectedIds.includes(task.id);

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isSelected ? 'bg-indigo-50/50' : isDone ? 'bg-slate-50/40 text-slate-400' : ''
                      }`}
                    >
                      {/* Batch select checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelectId(task.id)}
                          className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Task ID */}
                      <td className="py-3 px-3 font-mono font-bold text-slate-800">
                        {task.taskId}
                      </td>

                      {/* Assignee */}
                      <td className="py-3 px-4 font-medium text-slate-800 min-w-[200px]">
                        <div className="flex items-center gap-1.5">
                          {task.rolePhone}
                          {isMine && (
                            <span className="text-[10px] px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold">
                              You
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Task */}
                      <td className="py-3 px-4 text-slate-900 font-medium min-w-[260px]">
                        <span className={isDone ? 'line-through text-slate-400' : ''}>
                          {task.task}
                        </span>
                        {task.processRemarks && task.processRemarks.length > 0 && (
                          <div className="mt-1 p-1 rounded bg-purple-50 border border-purple-200 text-[10px] text-purple-900 flex items-start gap-1">
                            <MessageSquare className="w-3 h-3 text-purple-600 shrink-0 mt-0.5" />
                            <span>
                              <strong>Note ({task.processRemarks[0].authorName}):</strong> {task.processRemarks[0].remarkText}
                            </span>
                          </div>
                        )}
                      </td>

                      {/* First Date */}
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {task.firstDate}
                      </td>

                      {/* Revision 1 */}
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {task.revision1 || '—'}
                      </td>

                      {/* Revision 2 */}
                      <td className="py-3 px-3 font-mono text-slate-600">
                        {task.revision2 || '—'}
                      </td>

                      {/* Latest Revision */}
                      <td className="py-3 px-3 font-mono font-semibold text-slate-900">
                        {task.latestRevision}
                      </td>

                      {/* Total Revisions */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`px-2 py-0.5 rounded-full font-bold text-[11px] ${
                            task.totalRevisions > 1
                              ? 'bg-rose-100 text-rose-800'
                              : task.totalRevisions === 1
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {task.totalRevisions}
                        </span>
                      </td>

                      {/* Status */}
                      <td className="py-3 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full font-semibold text-[10px] ${
                            isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : isShifted
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {task.status}
                        </span>
                      </td>

                      {/* Quick Action buttons */}
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Mark Done / Reopen button (Strict User Assignment Check) */}
                          {isMine && (
                            <button
                              onClick={() => handleToggleComplete(task)}
                              className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-semibold rounded text-[11px] transition-colors cursor-pointer"
                            >
                              {isDone ? 'Reopen' : 'Mark Done'}
                            </button>
                          )}

                          {/* Revise Target Date (Only for assigned user) */}
                          {isMine && (
                            <button
                              onClick={() => onReviseTask(task)}
                              title="Revise Target Date"
                              className="px-2 py-1 text-[11px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded font-medium transition-colors cursor-pointer"
                            >
                              Revise
                            </button>
                          )}

                          {/* View Detail Context (Available to all users to see current stage/progress) */}
                          <button
                            onClick={() => setViewDetailTask(task)}
                            title="View task detail & context"
                            className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors cursor-pointer"
                          >
                            <Eye className="w-4 h-4 text-slate-600" />
                          </button>

                          {/* Add Process Remark */}
                          <button
                            onClick={() => {
                              setRemarkTarget(task);
                              setRemarkText('');
                            }}
                            title="Add Process Coordinator Remark"
                            className="p-1.5 hover:bg-purple-50 text-slate-400 hover:text-purple-700 rounded-lg transition-colors cursor-pointer"
                          >
                            <MessageSquare className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No delegated tasks found for {currentUser.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Switch your active user profile in the top right or view all organization tasks.
                    </p>
                    <button
                      onClick={() => onToggleScope('ALL_ORG')}
                      className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors cursor-pointer"
                    >
                      View All Organization Tasks ({tasks.length})
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
            Showing <span className="font-semibold text-slate-800">{filteredTasks.length}</span> delegated tasks ({completedCount} completed)
          </div>
          <div className="text-[11px] font-medium text-slate-400">
            DTA Delegation Tracking System • Status: {statusFilter}
          </div>
        </div>
      </div>

      {/* Task Detail Modal */}
      {viewDetailTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[85vh]">
            <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-800 text-white">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Info className="w-4 h-4 text-indigo-400" />
                <span>Task Context — {viewDetailTask.taskId}</span>
              </div>
              <button
                onClick={() => setViewDetailTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 overflow-y-auto space-y-4 text-xs">
              <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-indigo-950 text-sm">{viewDetailTask.task}</span>
                  <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-purple-100 text-purple-800">
                    DELEGATION
                  </span>
                </div>
                <p className="text-indigo-800 font-medium">Assignee: {viewDetailTask.rolePhone}</p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">First Target Date</span>
                  <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">{viewDetailTask.firstDate}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">Latest Revised SLA</span>
                  <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">{viewDetailTask.latestRevision}</span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">Current Status</span>
                  <span className={`font-bold text-xs mt-0.5 block ${
                    viewDetailTask.status === 'Completed' ? 'text-emerald-700' : 'text-amber-700'
                  }`}>
                    {viewDetailTask.status}
                  </span>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-200">
                  <span className="text-[10px] text-slate-500 font-semibold block">Total Revisions</span>
                  <span className="font-mono font-bold text-slate-900 text-xs mt-0.5 block">{viewDetailTask.totalRevisions} Shift(s)</span>
                </div>
              </div>

              {/* Revision History */}
              {viewDetailTask.revisionHistory && viewDetailTask.revisionHistory.length > 0 && (
                <div className="space-y-2">
                  <span className="font-bold text-slate-900 uppercase tracking-wider text-[10px] block">
                    Delegation Revision History ({viewDetailTask.revisionHistory.length} Shifts)
                  </span>
                  <div className="space-y-1.5 border border-slate-200 rounded-xl p-3 bg-slate-50/50">
                    {viewDetailTask.revisionHistory.map((rev, idx) => (
                      <div key={idx} className="p-2 bg-white rounded-lg border border-slate-200 text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between font-semibold">
                          <span className="text-indigo-700">Shift #{rev.revisionNumber}: {rev.previousDate} → {rev.newDate}</span>
                          <span className="text-[10px] text-slate-400">{rev.timestamp}</span>
                        </div>
                        <p className="text-slate-600">Reason: "{rev.reason}" (Revised by: {rev.revisedBy})</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Process Remarks */}
              <div className="space-y-2 pt-2 border-t border-slate-200">
                <span className="font-bold text-purple-950 uppercase tracking-wider text-[10px] flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-purple-600" />
                  Process Audit Notes ({viewDetailTask.processRemarks?.length || 0})
                </span>

                {viewDetailTask.processRemarks && viewDetailTask.processRemarks.length > 0 ? (
                  <div className="space-y-2">
                    {viewDetailTask.processRemarks.map((rem, rIdx) => (
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
                onClick={() => setViewDetailTask(null)}
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
                <span className="font-semibold text-slate-700 block mb-1">Task:</span>
                <p className="p-2.5 bg-slate-50 rounded-lg text-slate-800 font-medium border border-slate-200">
                  {remarkTarget.task} ({remarkTarget.name})
                </p>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Delay / Bottleneck Category
                </label>
                <select
                  value={remarkCategory}
                  onChange={(e) => setRemarkCategory(e.target.value as ProcessRemark['category'])}
                  className="w-full p-2 bg-slate-50 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 font-medium text-xs cursor-pointer"
                >
                  <option value="AWAITING_APPROVAL">Awaiting Management / Director Approval</option>
                  <option value="VENDOR_DELAY">Vendor / Contractor Logistics Delay</option>
                  <option value="SITE_DOCS_MISSING">Site Not Ready / Execution Blocked</option>
                  <option value="STAFF_ON_LEAVE">Staff On Leave / Resource Gap</option>
                  <option value="TECHNICAL_ISSUE">Technical / Specification Clarification</option>
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
                  placeholder="Enter detailed audit remark or justification..."
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
                        'DELEGATION',
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
                      onUpdateTask({
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
