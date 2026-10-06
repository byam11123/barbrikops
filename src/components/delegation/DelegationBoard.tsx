import React, { useState } from 'react';
import { 
  ListTodo, 
  Search, 
  Filter, 
  Plus, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  RefreshCw, 
  ChevronRight,
  AlertTriangle,
  History,
  Phone,
  User,
  Users
} from 'lucide-react';
import { DelegationTask, UserProfile } from '../../types';
import { ViewScope } from '../layout/Header';

interface DelegationBoardProps {
  tasks: DelegationTask[];
  currentUser: UserProfile;
  viewScope: ViewScope;
  onToggleScope: (scope: ViewScope) => void;
  onUpdateTask: (task: DelegationTask) => void;
  onNewTask: () => void;
  onReviseTask: (task: DelegationTask) => void;
}

export const DelegationBoard: React.FC<DelegationBoardProps> = ({
  tasks,
  currentUser,
  viewScope,
  onToggleScope,
  onUpdateTask,
  onNewTask,
  onReviseTask,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [assigneeFilter, setAssigneeFilter] = useState<string>('ALL');

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

  const filteredTasks = tasks.filter((task) => {
    // 1. User Scope Filtering
    if (viewScope === 'USER_ONLY' && !isMyTask(task)) {
      return false;
    }

    // 2. Status Filtering
    if (statusFilter !== 'ALL' && task.status !== statusFilter) return false;

    // 3. Assignee Filter (in ALL_ORG mode)
    if (viewScope === 'ALL_ORG' && assigneeFilter !== 'ALL' && task.name !== assigneeFilter) return false;

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
    const isCompleted = task.status === 'Completed';
    const updated: DelegationTask = {
      ...task,
      status: isCompleted ? 'Pending' : 'Completed',
      completedAt: isCompleted ? undefined : new Date().toLocaleString('en-GB'),
    };
    onUpdateTask(updated);
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

  const currentDataset = viewScope === 'USER_ONLY' ? myTasksTotal : tasks;
  const pendingCount = currentDataset.filter((t) => t.status === 'Pending').length;
  const completedCount = currentDataset.filter((t) => t.status === 'Completed').length;
  const shiftedCount = currentDataset.filter((t) => t.status === 'Week Shifted').length;

  return (
    <div className="space-y-5">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Total Delegated Card */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          title="Click to show all tasks"
          className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs ${
            statusFilter === 'ALL' ? 'border-indigo-400 bg-indigo-50/10 ring-1 ring-indigo-400/20' : 'border-slate-200 bg-white'
          }`}
        >
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            {viewScope === 'USER_ONLY' ? 'My Total Delegated' : 'Total Delegated'}
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{currentDataset.length}</span>
            <span className="text-xs font-bold text-slate-400">Sheet 2</span>
          </div>
        </div>

        {/* Pending Card */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'ALL' : 'Pending')}
          title="Click to filter Pending tasks"
          className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs ${
            statusFilter === 'Pending' ? 'border-rose-400 bg-rose-50/10 ring-1 ring-rose-400/20' : 'border-slate-200 bg-white'
          }`}
        >
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Pending Execution</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-600">{pendingCount}</span>
            <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
              Action Needed
            </span>
          </div>
        </div>

        {/* Completed Card */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Completed' ? 'ALL' : 'Completed')}
          title="Click to filter Completed tasks"
          className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs ${
            statusFilter === 'Completed' ? 'border-emerald-400 bg-emerald-50/10 ring-1 ring-emerald-400/20' : 'border-slate-200 bg-white'
          }`}
        >
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completed</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600">{completedCount}</span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
              Done
            </span>
          </div>
        </div>

        {/* Week Shifted Card */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Week Shifted' ? 'ALL' : 'Week Shifted')}
          title="Click to filter Week Shifted tasks"
          className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs ${
            statusFilter === 'Week Shifted' ? 'border-amber-400 bg-amber-50/10 ring-1 ring-amber-400/20' : 'border-slate-200 bg-white'
          }`}
        >
          <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Week Shifted / Revised</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-amber-600">{shiftedCount}</span>
            <span className="text-[10px] text-amber-700 font-bold bg-amber-50 px-1.5 py-0.5 rounded">
              Revised SLA
            </span>
          </div>
        </div>
      </div>

      {/* Scope banner if USER_ONLY */}
      {viewScope === 'USER_ONLY' ? (
        <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Showing <strong>{myTasksTotal.length} tasks</strong> assigned to <strong>{currentUser.name}</strong>. Other staff tasks are hidden in this view.
            </span>
          </div>
          <button
            onClick={() => onToggleScope('ALL_ORG')}
            className="font-bold underline text-indigo-700 hover:text-indigo-900 shrink-0 ml-2"
          >
            View all {tasks.length} organization tasks →
          </button>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              Viewing <strong>All Organization Delegated Tasks ({tasks.length} total)</strong> across all staff.
            </span>
          </div>
          <button
            onClick={() => onToggleScope('USER_ONLY')}
            className="font-bold text-indigo-600 hover:text-indigo-800 shrink-0 ml-2"
          >
            Filter to only my tasks ({myTasksTotal.length}) →
          </button>
        </div>
      )}

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          {/* User scope selector as dropdown */}
          <div className="flex items-center bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs gap-1.5">
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

          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search Task ID, Task..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-52 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <select
              aria-label="Filter by status"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-700 font-semibold cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="ALL">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Completed">Completed</option>
              <option value="Week Shifted">Week Shifted</option>
            </select>
          </div>

          {viewScope === 'ALL_ORG' && (
            <div className="flex items-center gap-2">
              <select
                aria-label="Filter by assignee"
                value={assigneeFilter}
                onChange={(e) => setAssigneeFilter(e.target.value)}
                className="text-xs bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2.5 text-slate-700 font-semibold max-w-[180px] cursor-pointer focus:outline-none focus:ring-2 focus:ring-indigo-500"
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

        <button
          onClick={onNewTask}
          className="flex items-center justify-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Delegate New Task</span>
        </button>
      </div>

      {/* Task Assignment Table (Direct 1-to-1 reflection of Sheet 2) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-3 px-3 w-10 text-center">Action</th>
                <th className="py-3 px-3">Task ID</th>
                <th className="py-3 px-4">Assignee &amp; Role</th>
                <th className="py-3 px-4">Task Description</th>
                <th className="py-3 px-3">First Date</th>
                <th className="py-3 px-3">Rev 1</th>
                <th className="py-3 px-3">Rev 2</th>
                <th className="py-3 px-3">Latest Rev</th>
                <th className="py-3 px-3 text-center">Total Rev</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredTasks.length > 0 ? (
                filteredTasks.map((task) => {
                  const isDone = task.status === 'Completed';
                  const isShifted = task.status === 'Week Shifted';
                  const isMine = isMyTask(task);

                  return (
                    <tr
                      key={task.id}
                      className={`hover:bg-slate-50 transition-colors ${
                        isDone ? 'bg-slate-50/40 text-slate-400' : ''
                      }`}
                    >
                      {/* Completion checkbox button */}
                      <td className="py-3 px-3 text-center">
                        <button
                          onClick={() => handleToggleComplete(task)}
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors ${
                            isDone
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 text-transparent hover:border-indigo-500'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
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

                      {/* Action buttons */}
                      <td className="py-3 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => onReviseTask(task)}
                            title="Revise Target Date"
                            className="px-2 py-1 text-[11px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded font-medium transition-colors"
                          >
                            Revise
                          </button>
                          <button
                            onClick={() => handleWeekShift(task)}
                            title="Shift +1 Week"
                            className="px-2 py-1 text-[11px] text-amber-700 bg-amber-50 hover:bg-amber-100 rounded font-medium transition-colors"
                          >
                            +1 Wk
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
                      className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      View All Organization Tasks ({tasks.length})
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
