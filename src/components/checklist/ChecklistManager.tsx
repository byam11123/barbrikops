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
  Info
} from 'lucide-react';
import { ChecklistItem, Frequency, UserProfile } from '../../types';
import { ViewScope } from '../layout/Header';

interface ChecklistManagerProps {
  items: ChecklistItem[];
  currentUser: UserProfile;
  viewScope: ViewScope;
  onToggleScope: (scope: ViewScope) => void;
  onUpdateItem: (item: ChecklistItem) => void;
  onNewItem: () => void;
  onBatchGenerateNextCycle: () => void;
}

export const ChecklistManager: React.FC<ChecklistManagerProps> = ({
  items,
  currentUser,
  viewScope,
  onToggleScope,
  onUpdateItem,
  onNewItem,
  onBatchGenerateNextCycle,
}) => {
  const [activeFrequency, setActiveFrequency] = useState<string>('ALL');
  const [departmentFilter, setDepartmentFilter] = useState<string>('ALL');
  const [statusFilter, setStatusFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

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

  const filteredItems = items.filter((item) => {
    // 1. User Scope Filtering
    if (viewScope === 'USER_ONLY' && !isMyItem(item)) {
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

  const handleToggleStatus = (item: ChecklistItem) => {
    const isDone = item.status === 'Done';
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

  const currentDisplayCount = filteredItems.length;
  const doneCount = (viewScope === 'USER_ONLY' ? myItemsTotal : items).filter((i) => i.status === 'Done').length;
  const totalBaseCount = viewScope === 'USER_ONLY' ? myItemsTotal.length : items.length;
  const complianceRate = totalBaseCount > 0 ? Math.round((doneCount / totalBaseCount) * 100) : 100;

  return (
    <div className="space-y-5">
      {/* Top Compliance Bar */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">
              {viewScope === 'USER_ONLY' 
                ? `My Operations Checklist Compliance (${currentUser.name})` 
                : 'All Department Operations Checklists'}
            </h2>
            <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Sheet 3 Master
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            {viewScope === 'USER_ONLY'
              ? `Filtered to items assigned to ${currentUser.name} (${currentUser.departmentName}).`
              : 'Showing all compliance checklists across Store, IT, and Structure departments.'}
          </p>
        </div>

        <div className="flex items-center gap-6 w-full md:w-auto justify-between md:justify-end">
          <div className="text-right">
            <div className="text-xs text-slate-500 font-medium">
              {viewScope === 'USER_ONLY' ? 'My Compliance Rate' : 'Org Compliance Rate'}
            </div>
            <div className="text-2xl font-black text-indigo-600">{complianceRate}%</div>
          </div>
          <div className="w-32 bg-slate-100 rounded-full h-2.5 overflow-hidden">
            <div
              className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
              style={{ width: `${complianceRate}%` }}
            />
          </div>
          <button
            onClick={onBatchGenerateNextCycle}
            title="Auto-generates next recurring maintenance cycle"
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-300 rounded-lg text-xs font-semibold transition-colors"
          >
            <Sparkles className="w-4 h-4 text-emerald-600" />
            <span>Auto Roll Out Next Cycle</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Total Checklists Card */}
        <div 
          onClick={() => setStatusFilter('ALL')}
          title="Click to show all checklist items"
          className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs ${
            statusFilter === 'ALL' ? 'border-indigo-400 bg-indigo-50/10 ring-1 ring-indigo-400/20' : 'border-slate-200 bg-white'
          }`}
        >
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
            Total Checklist Items
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-slate-900">{totalBaseCount}</span>
            <span className="text-[10px] text-slate-400 font-bold">Total Scope</span>
          </div>
        </div>

        {/* Pending Checklists Card */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Pending' ? 'ALL' : 'Pending')}
          title="Click to filter Pending checklists"
          className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs ${
            statusFilter === 'Pending' ? 'border-rose-400 bg-rose-50/10 ring-1 ring-rose-400/20' : 'border-slate-200 bg-white'
          }`}
        >
          <span className="text-xs font-bold text-rose-600 uppercase tracking-wider">Pending Execution</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-rose-600">{totalBaseCount - doneCount}</span>
            <span className="text-[10px] text-rose-500 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
              Needs Done
            </span>
          </div>
        </div>

        {/* Completed Checklists Card */}
        <div 
          onClick={() => setStatusFilter(statusFilter === 'Done' ? 'ALL' : 'Done')}
          title="Click to filter Completed checklists"
          className={`p-4 rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs ${
            statusFilter === 'Done' ? 'border-emerald-400 bg-emerald-50/10 ring-1 ring-emerald-400/20' : 'border-slate-200 bg-white'
          }`}
        >
          <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completed Compliance</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-2xl font-black text-emerald-600">{doneCount}</span>
            <span className="text-[10px] text-emerald-600 font-bold bg-emerald-50 px-1.5 py-0.5 rounded">
              Verified OK
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
              Showing <strong>{myItemsTotal.length} checklist items</strong> assigned specifically to <strong>{currentUser.name}</strong> ({currentUser.email}).
            </span>
          </div>
          <button
            onClick={() => onToggleScope('ALL_ORG')}
            className="font-bold underline text-indigo-700 hover:text-indigo-900 shrink-0 ml-2"
          >
            View all {items.length} organization checklists →
          </button>
        </div>
      ) : (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-700">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500 shrink-0" />
            <span>
              Viewing <strong>All Organization Checklists ({items.length} total)</strong> across all staff.
            </span>
          </div>
          <button
            onClick={() => onToggleScope('USER_ONLY')}
            className="font-bold text-indigo-600 hover:text-indigo-800 shrink-0 ml-2"
          >
            Focus only on my checklists ({myItemsTotal.length}) →
          </button>
        </div>
      )}

      {/* Frequency Tabs & Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* User scope selector as dropdown */}
          <div className="flex items-center bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs gap-1.5">
            <User className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <select
              aria-label="Filter by scope"
              value={viewScope}
              onChange={(e) => onToggleScope(e.target.value as any)}
              className="text-xs font-bold bg-transparent border-none text-slate-700 hover:text-slate-900 focus:outline-none cursor-pointer py-0.5"
            >
              <option value="USER_ONLY">My Tasks — {myItemsTotal.length}</option>
              <option value="ALL_ORG">All Staff — {items.length}</option>
            </select>
          </div>

          {/* Frequency selector as dropdown */}
          <div className="flex items-center bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/80 shadow-2xs gap-1.5">
            <Filter className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
            <select
              aria-label="Filter by frequency"
              value={activeFrequency}
              onChange={(e) => setActiveFrequency(e.target.value as any)}
              className="text-xs font-bold bg-transparent border-none text-slate-700 hover:text-slate-900 focus:outline-none cursor-pointer py-0.5"
            >
              <option value="ALL">All Frequencies</option>
              <option value="W">Weekly</option>
              <option value="M">Monthly</option>
            </select>
          </div>

          {/* Department filter (useful in ALL_ORG mode) */}
          {viewScope === 'ALL_ORG' && (
            <select
              aria-label="Filter by department"
              value={departmentFilter}
              onChange={(e) => setDepartmentFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2 text-slate-700 font-medium max-w-[150px]"
            >
              <option value="ALL">All Depts</option>
              {departments.map((dept) => (
                <option key={dept} value={dept}>
                  {dept}
                </option>
              ))}
            </select>
          )}

          {/* Status filter */}
          <select
            aria-label="Filter by status"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="text-xs bg-slate-50 border border-slate-300 rounded-lg py-1.5 px-2 text-slate-700 font-medium"
          >
            <option value="ALL">All Status</option>
            <option value="Done">Done</option>
            <option value="Pending">Pending</option>
          </select>

          {/* Search box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-8 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-36 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>

        <button
          onClick={onNewItem}
          className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Add Checklist Item</span>
        </button>
      </div>

      {/* Checklist Table (Exact reflection of Sheet 3) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-[#8989eb] text-white font-bold border-b border-slate-200 uppercase tracking-wider text-[11px]">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">Status</th>
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
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length > 0 ? (
                filteredItems.map((item, idx) => {
                  const isDone = item.status === 'Done';
                  const rowBg = idx % 2 === 1 ? 'bg-[#e8e7fc]/30' : 'bg-white';
                  const isMine = isMyItem(item);

                  return (
                    <tr
                      key={item.id}
                      className={`hover:bg-indigo-50/40 transition-colors ${rowBg}`}
                    >
                      {/* Interactive completion toggle */}
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => handleToggleStatus(item)}
                          className={`w-5 h-5 rounded flex items-center justify-center transition-colors mx-auto ${
                            isDone
                              ? 'bg-emerald-600 text-white'
                              : 'border border-slate-300 text-transparent hover:border-indigo-500'
                          }`}
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
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
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={11} className="py-12 text-center text-slate-500">
                    <User className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                    <p className="font-semibold text-slate-700">No checklist items found for {currentUser.name}</p>
                    <p className="text-xs text-slate-400 mt-1">
                      Switch to &quot;All Staff&quot; or switch your active user profile in the top-right menu.
                    </p>
                    <button
                      onClick={() => onToggleScope('ALL_ORG')}
                      className="mt-3 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg transition-colors"
                    >
                      View All Organization Checklists ({items.length})
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
