import React, { useState } from 'react';
import { X, Lock, CheckCircle2, AlertTriangle, ShieldCheck, FileText } from 'lucide-react';
import { FmsInstance, UserProfile } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface CloseFmsModalProps {
  isOpen: boolean;
  flow: FmsInstance | null;
  currentUser?: UserProfile | null;
  onClose: () => void;
  onSuccess?: () => void;
}

export const CloseFmsModal: React.FC<CloseFmsModalProps> = ({
  isOpen,
  flow,
  currentUser,
  onClose,
  onSuccess,
}) => {
  const [remark, setRemark] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen || !flow) return null;

  const handleConfirmClose = (e: React.FormEvent) => {
    e.preventDefault();
    if (!remark.trim()) {
      setError('Please provide a detailed closure verification remark before closing.');
      return;
    }
    if (remark.trim().length < 5) {
      setError('Closure remark must be at least 5 characters describing verification status.');
      return;
    }

    setIsSubmitting(true);
    try {
      storageAdapter.closeFmsInstance(flow.id || flow.flowId, remark.trim(), currentUser || undefined);
      setIsSubmitting(false);
      setRemark('');
      setError('');
      if (onSuccess) onSuccess();
      onClose();
    } catch (err) {
      setIsSubmitting(false);
      setError('Failed to close FMS workflow. Please try again.');
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-lg bg-white dark:bg-slate-900 rounded-xl shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 bg-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg border border-emerald-500/30">
              <Lock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white tracking-tight">Close FMS Workflow</h3>
              <p className="text-xs text-slate-300 font-mono">
                {flow.requisitionNumber || flow.indentNo ? `Ref: #${flow.requisitionNumber || flow.indentNo}` : `ID: ${flow.flowId}`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <form onSubmit={handleConfirmClose} className="p-6 space-y-5">
          {/* Workflow Summary Card */}
          <div className="p-3.5 bg-slate-50 dark:bg-slate-800/60 rounded-lg border border-slate-200 dark:border-slate-700/60 text-xs space-y-1.5">
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="text-slate-500 font-medium">Flow Type:</span>
              <span className="font-semibold">{flow.flowType.replace(/_/g, ' ')}</span>
            </div>
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="text-slate-500 font-medium">Site Location:</span>
              <span className="font-semibold">{flow.siteName}</span>
            </div>
            <div className="flex justify-between items-center text-slate-700 dark:text-slate-300">
              <span className="text-slate-500 font-medium">Total Stages:</span>
              <span className="font-mono">{flow.stages?.length || flow.totalStages} stages</span>
            </div>
          </div>

          {/* SuperAdmin Security Notice */}
          <div className="p-3.5 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/50 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900 dark:text-amber-200 space-y-1">
              <p className="font-semibold">SuperAdmin Formal Verification Sign-Off</p>
              <p className="text-amber-700 dark:text-amber-300">
                Closing confirms all departments, assignees, and financial receipts have been thoroughly checked and verified.
                This workflow will be locked and archived from active operational queues.
              </p>
            </div>
          </div>

          {/* Verification Remark Input */}
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-200 flex items-center justify-between">
              <span>Closure Verification Remark <span className="text-rose-500">*</span></span>
              <span className="text-[11px] font-normal text-slate-500">SuperAdmin Audit Entry</span>
            </label>
            <textarea
              rows={3}
              value={remark}
              onChange={(e) => {
                setRemark(e.target.value);
                if (error) setError('');
              }}
              placeholder="e.g., Verified with Purchase, Stores & Accounts. All vendor bills, physical dispatches, and bank transfers reconciled successfully."
              className="w-full px-3 py-2 text-xs text-slate-900 dark:text-slate-100 bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500 placeholder:text-slate-400"
            />
            {error && <p className="text-xs text-rose-600 dark:text-rose-400 font-medium">{error}</p>}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 rounded-lg shadow-sm transition-all flex items-center gap-2"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Closing FMS...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Confirm & Close FMS 🔒</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
