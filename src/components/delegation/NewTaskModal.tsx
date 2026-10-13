import React, { useState } from 'react';
import { X, ListTodo, AlertCircle, Check } from 'lucide-react';
import { DelegationTask, Priority, UserProfile } from '../../types';
import { USERS } from '../../data/initialData';
import { DelegationInputSchema } from '../../services/storageAdapter';

import { filterUsersForViewer } from '../../utils/staffValidation';

interface NewTaskModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreate: (task: DelegationTask) => void;
  currentUser?: UserProfile;
}

export const NewTaskModal: React.FC<NewTaskModalProps> = ({ isOpen, onClose, onCreate, currentUser }) => {
  const assignableUsers = filterUsersForViewer(USERS, currentUser);
  const [selectedUserId, setSelectedUserId] = useState<string>(assignableUsers[0]?.userId || USERS[0].userId);
  const [taskDesc, setTaskDesc] = useState<string>('');
  const [targetDate, setTargetDate] = useState<string>('');
  const [priority, setPriority] = useState<Priority>('Normal');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = assignableUsers.find((u) => u.userId === selectedUserId) || assignableUsers[0] || USERS[0];
    const rolePhone = `${user.name.toUpperCase()} (${user.role}) - ${user.phone}`;
    // Generate 7 character random hash matching Sheet 2 format (e.g. vhdlgas, nfs3wfn)
    const randomHash = Math.random().toString(36).substring(2, 9).toLowerCase();

    // Default target date formatted DD/MM/YYYY if using html date picker
    let formattedDate = targetDate;
    if (targetDate.includes('-')) {
      const [year, month, day] = targetDate.split('-');
      formattedDate = `${day}/${month}/${year}`;
    }

    const validation = DelegationInputSchema.safeParse({
      taskId: randomHash,
      name: user.name,
      rolePhone,
      task: taskDesc.trim(),
      firstDate: formattedDate,
      priority,
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Invalid input');
      return;
    }

    const newTask: DelegationTask = {
      id: `del-${randomHash}`,
      taskId: randomHash,
      name: user.name,
      rolePhone,
      task: taskDesc.trim(),
      firstDate: formattedDate,
      latestRevision: formattedDate,
      totalRevisions: 0,
      status: 'Pending',
      priority,
    };

    onCreate(newTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <ListTodo className="w-5 h-5 text-indigo-600" />
            <span>Delegate New Task (DTA Master)</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Assignee Staff <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
            >
              {assignableUsers.map((u) => (
                <option key={u.userId} value={u.userId}>
                  {u.name} — {u.role} ({u.phone})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Task Description <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. SUBCONTRACTOR BILLING FMS, return washing machine, etc."
              value={taskDesc}
              onChange={(e) => setTaskDesc(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                First Target Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div className="p-3 rounded-lg bg-slate-50 border border-slate-200 text-[11px] text-slate-500">
            Note: Generates a stable random 7-char Task ID (e.g. <span className="font-mono font-bold">8nxsaph</span>) ensuring no dependency on spreadsheet row indices.
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Delegate Task</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
