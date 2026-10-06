import React, { useState } from 'react';
import { X, CheckSquare, AlertCircle, Check } from 'lucide-react';
import { ChecklistItem, Frequency, UserProfile } from '../../types';
import { USERS } from '../../data/initialData';
import { ChecklistInputSchema } from '../../services/storageAdapter';

interface NewChecklistModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onCreate: (item: ChecklistItem) => void;
}

export const NewChecklistModal: React.FC<NewChecklistModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreate,
}) => {
  const [selectedUserId, setSelectedUserId] = useState<string>(USERS[0].userId);
  const [taskId, setTaskId] = useState<string>('');
  const [frequency, setFrequency] = useState<Frequency>('W');
  const [department, setDepartment] = useState<string>('Store in charge');
  const [task, setTask] = useState<string>('');
  const [plannedDate, setPlannedDate] = useState<string>('');
  const [buddyEmail, setBuddyEmail] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const user = USERS.find((u) => u.userId === selectedUserId) || USERS[0];
    const nameWithPhone = `${user.name} (${user.phone})`;

    let formattedDate = plannedDate;
    if (plannedDate.includes('-')) {
      const [year, month, day] = plannedDate.split('-');
      formattedDate = `${day}/${month}/${year}`;
    }

    const validation = ChecklistInputSchema.safeParse({
      taskId: taskId.trim(),
      name: nameWithPhone,
      email: user.email,
      buddyEmail: buddyEmail.trim(),
      department,
      frequency,
      task: task.trim(),
      plannedDate: formattedDate,
    });

    if (!validation.success) {
      setError(validation.error.issues[0]?.message || 'Invalid input');
      return;
    }

    const now = new Date().toLocaleString('en-GB');
    const newItem: ChecklistItem = {
      id: `chk-${Date.now()}`,
      taskId: taskId.trim(),
      name: nameWithPhone,
      email: user.email,
      buddyEmail: buddyEmail.trim() || undefined,
      department,
      frequency,
      task: task.trim(),
      plannedDate: formattedDate,
      status: 'Pending',
      createdAt: now,
      updatedAt: now,
    };

    onCreate(newItem);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <span>Add Recurring Checklist Task</span>
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Accountable Staff <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => {
                  setSelectedUserId(e.target.value);
                  const u = USERS.find((user) => user.userId === e.target.value);
                  if (u) setDepartment(u.departmentName);
                }}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                {USERS.map((u) => (
                  <option key={u.userId} value={u.userId}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Department <span className="text-rose-500">*</span>
              </label>
              <select
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="Store in charge">Store in charge</option>
                <option value="IT Eng.">IT Eng.</option>
                <option value="Sr. Structure">Sr. Structure</option>
                <option value="Structure">Structure</option>
                <option value="Purchase">Purchase & Store</option>
                <option value="MIS & Operations">MIS & Operations</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Task ID <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 850"
                value={taskId}
                onChange={(e) => setTaskId(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Frequency
              </label>
              <select
                value={frequency}
                onChange={(e) => setFrequency(e.target.value as Frequency)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="W">Weekly (W)</option>
                <option value="M">Monthly (M)</option>
                <option value="D">Daily (D)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Planned Date <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={plannedDate}
                onChange={(e) => setPlannedDate(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Checklist Task Description <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. All Switch/Modem Check/Maintenance (Siladehi)"
              value={task}
              onChange={(e) => setTask(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Buddy Email (Optional Verification)
            </label>
            <input
              type="email"
              placeholder="buddy.checker@barbrik.in"
              value={buddyEmail}
              onChange={(e) => setBuddyEmail(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
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
              <span>Save &amp; Sync to Sheet 3</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
