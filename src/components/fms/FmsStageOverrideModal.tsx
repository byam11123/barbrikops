import React, { useState } from 'react';
import {
  X,
  ShieldAlert,
  History,
  AlertTriangle,
  ArrowRight,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { FmsInstance, UserProfile, isUserAdminOrSuperAdmin, isUserSuperAdmin } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface FmsStageOverrideModalProps {
  isOpen: boolean;
  flow: FmsInstance;
  currentUser: UserProfile;
  onClose: () => void;
  onOverrideSuccess: (updatedFlow: FmsInstance) => void;
}

export const FmsStageOverrideModal: React.FC<FmsStageOverrideModalProps> = ({
  isOpen,
  flow,
  currentUser,
  onClose,
  onOverrideSuccess,
}) => {
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(
    flow.currentStageIndex
  );
  const [reason, setReason] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isAdminOrSuper =
    isUserSuperAdmin(currentUser) || isUserAdminOrSuperAdmin(currentUser);

  if (!isOpen) return null;

  if (!isAdminOrSuper) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4">
          <ShieldAlert className="w-12 h-12 text-rose-500 mx-auto" />
          <h3 className="font-black text-slate-900 text-base">Unauthorized Access</h3>
          <p className="text-xs text-slate-600">
            Only Super Admin and Admin users are authorized to perform dynamic FMS stage overrides.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            Close
          </button>
        </div>
      </div>
    );
  }

  const handleSubmitOverride = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (selectedStageIndex === flow.currentStageIndex) {
      setError('Please select a stage different from the currently active stage.');
      return;
    }

    if (!reason.trim()) {
      setError('Please provide a mandatory operational reason for the stage override.');
      return;
    }

    setSubmitting(true);
    try {
      const updatedFlow = storageAdapter.overrideFmsStage(
        flow.id,
        selectedStageIndex,
        reason.trim(),
        currentUser
      );
      onOverrideSuccess(updatedFlow);
      setSubmitting(false);
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to execute stage override.');
      setSubmitting(false);
    }
  };

  const currentStage = flow.stages[flow.currentStageIndex];
  const targetStage = flow.stages[selectedStageIndex];

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center font-black">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-black tracking-tight flex items-center gap-2">
                <span>Dynamic FMS Stage Override</span>
                <span className="text-[10px] font-mono px-2 py-0.5 bg-rose-500/30 text-rose-300 border border-rose-400/30 rounded font-bold">
                  ADMIN SAFEGUARD
                </span>
              </h3>
              <p className="text-[11px] text-slate-300">
                FMS Record #{flow.indentNo} ({flow.siteName})
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmitOverride} className="p-6 space-y-5 text-xs text-slate-800">
          {/* Historical Record Safeguard Banner */}
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl space-y-1">
            <div className="flex items-center gap-2 font-bold text-emerald-950">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Historical Record Preservation Enforced</span>
            </div>
            <p className="text-[11px] text-emerald-900 leading-relaxed">
              All previously completed stage records, actual timestamps, and attached CS Sheets remain untouched. Only the active stage index and its SLA planned timestamp will be reset forward.
            </p>
          </div>

          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Current Stage vs Target Stage Picker */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <div className="flex items-center justify-between text-xs font-bold text-slate-700">
              <span>Currently Active Stage:</span>
              <span className="px-2.5 py-0.5 bg-indigo-100 text-indigo-900 font-mono rounded-md">
                Stage {flow.currentStageIndex + 1}: {currentStage?.stageName}
              </span>
            </div>

            <div className="pt-2 border-t border-slate-200">
              <label className="block font-black text-slate-900 mb-1">
                Select Target Active Stage <span className="text-rose-500">*</span>
              </label>
              <select
                value={selectedStageIndex}
                onChange={(e) => setSelectedStageIndex(parseInt(e.target.value, 10))}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-bold text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500"
              >
                {flow.stages.map((stg, idx) => (
                  <option key={stg.stageId || idx} value={idx}>
                    Stage {idx + 1}: {stg.stageName} ({stg.assignee || 'Unassigned'})
                  </option>
                ))}
              </select>
            </div>

            {targetStage && (
              <div className="p-2.5 bg-indigo-50/70 border border-indigo-200 rounded-lg text-[11px] text-indigo-900 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-indigo-600" />
                  <span>SLA SLA hours for Stage {selectedStageIndex + 1}:</span>
                </div>
                <strong className="font-mono">{targetStage.targetDurationHours || 24} Hours</strong>
              </div>
            )}
          </div>

          {/* Mandatory Reason Input */}
          <div>
            <label className="block font-black text-slate-900 mb-1">
              Operational Justification / Reason for Stage Change <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Provide reason for manually jumping/reopening this stage (e.g. Revised vendor quotations received from site)..."
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl font-medium text-slate-900 text-xs focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <ShieldAlert className="w-4 h-4" />
              <span>{submitting ? 'Executing Override...' : 'Confirm Stage Override'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
