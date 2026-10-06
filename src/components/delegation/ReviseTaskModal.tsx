import React, { useState } from 'react';
import { X, Calendar, AlertCircle, RefreshCw, Check } from 'lucide-react';
import { DelegationTask, UserProfile } from '../../types';

interface ReviseTaskModalProps {
  task: DelegationTask | null;
  currentUser: UserProfile;
  onClose: () => void;
  onSaveRevision: (task: DelegationTask) => void;
}

export const ReviseTaskModal: React.FC<ReviseTaskModalProps> = ({
  task,
  currentUser,
  onClose,
  onSaveRevision,
}) => {
  const [newDate, setNewDate] = useState<string>('');
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!task) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!newDate) {
      setError('Please provide a new target date');
      return;
    }
    if (!reason.trim()) {
      setError('Revision justification reason is mandatory for operational compliance');
      return;
    }

    let formattedDate = newDate;
    if (newDate.includes('-')) {
      const [year, month, day] = newDate.split('-');
      formattedDate = `${day}/${month}/${year}`;
    }

    const newRevCount = task.totalRevisions + 1;
    const rev1 = task.revision1 || formattedDate;
    const rev2 = task.revision1 ? formattedDate : task.revision2;

    const revisionEntry = {
      revisionNumber: newRevCount,
      previousDate: task.latestRevision,
      newDate: formattedDate,
      reason: reason.trim(),
      timestamp: new Date().toLocaleString('en-GB'),
      revisedBy: currentUser.name,
    };

    const updatedTask: DelegationTask = {
      ...task,
      revision1: rev1,
      revision2: rev2,
      latestRevision: formattedDate,
      totalRevisions: newRevCount,
      status: 'Week Shifted',
      revisionHistory: [...(task.revisionHistory || []), revisionEntry],
    };

    onSaveRevision(updatedTask);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <RefreshCw className="w-5 h-5 text-indigo-600" />
            <span>Revise Deadline — Task #{task.taskId}</span>
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

          <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-1">
            <p className="font-semibold text-slate-900">{task.task}</p>
            <p className="text-slate-500">
              Assignee: {task.name} • First Date: {task.firstDate}
            </p>
            <p className="text-indigo-600 font-medium">
              Current Latest Revision: {task.latestRevision} (Revision #{task.totalRevisions})
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              New Target Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reason for Revision <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Vendor stock delay, site weather delay, awaiting client sign-off..."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
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
              <span>Record Revision &amp; Update Sheet</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
