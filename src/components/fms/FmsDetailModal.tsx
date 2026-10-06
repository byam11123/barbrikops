import React, { useState } from 'react';
import { X, GitBranch, Clock, CheckCircle2, AlertTriangle, ExternalLink, Calendar, MapPin, User, Eye, Boxes, CreditCard, ShoppingCart, Truck, PackageCheck, FileText, UserCheck, Wrench, FileSpreadsheet } from 'lucide-react';
import { FmsInstance, UserProfile } from '../../types';
import { 
  FMS_CHECK_STOCK_STAGES, 
  FMS_STANDARD_PURCHASE_STAGES, 
  FMS_PO_PAYMENT_STAGES, 
  FMS_PURCHASE_TO_STORE_DISPATCH_STAGES,
  FMS_STORE_TO_SITE_DISPATCH_STAGES,
  FMS_PAYMENT_TO_DISPATCH_STAGES,
  FMS_SITE_RECEIVE_STAGES,
  FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES,
  FMS_HR_ATTENDANCE_PAYMENT_STAGES,
  FMS_BREAKDOWN_REPORTING_STAGES,
  FMS_EQUIPMENT_PART_REPAIR_STAGES,
  FMS_DPR_REPORTING_STAGES 
} from '../../data/initialData';
import { isUserResponsibleForStage } from '../../services/stageAssignment';

interface FmsDetailModalProps {
  flow: FmsInstance | null;
  currentUser: UserProfile;
  onClose: () => void;
}

export const FmsDetailModal: React.FC<FmsDetailModalProps> = ({ flow, currentUser, onClose }) => {
  const [modalStageFilter, setModalStageFilter] = useState<'MY_STAGES' | 'ALL_STAGES'>('MY_STAGES');

  if (!flow) return null;

  const activeStageDefs = flow.flowType === 'CHECK_STOCK'
    ? FMS_CHECK_STOCK_STAGES
    : flow.flowType === 'PO_TO_PAYMENT'
    ? FMS_PO_PAYMENT_STAGES
    : flow.flowType === 'PURCHASE_TO_STORE_DISPATCH'
    ? FMS_PURCHASE_TO_STORE_DISPATCH_STAGES
    : flow.flowType === 'STORE_TO_SITE_DISPATCH'
    ? FMS_STORE_TO_SITE_DISPATCH_STAGES
    : flow.flowType === 'PAYMENT_TO_DISPATCH'
    ? FMS_PAYMENT_TO_DISPATCH_STAGES
    : flow.flowType === 'SITE_RECEIVE'
    ? FMS_SITE_RECEIVE_STAGES
    : flow.flowType === 'ACCOUNTS_INVOICE_COLLECTION'
    ? FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES
    : flow.flowType === 'HR_ATTENDANCE_PAYMENT'
    ? FMS_HR_ATTENDANCE_PAYMENT_STAGES
    : flow.flowType === 'BREAKDOWN_REPORTING'
    ? FMS_BREAKDOWN_REPORTING_STAGES
    : FMS_STANDARD_PURCHASE_STAGES;

  const isMyStage = (stageIndex: number, stage: any) => {
    const def = activeStageDefs[stageIndex];
    if (!def) return false;
    return isUserResponsibleForStage(def, stage, currentUser);
  };

  const myStagesCount = flow.stages.filter((s, idx) => isMyStage(idx, s)).length;

  const displayedStages = flow.stages
    .map((stage, idx) => ({ stage, idx }))
    .filter(({ stage, idx }) => {
      if (modalStageFilter === 'MY_STAGES') {
        return isMyStage(idx, stage);
      }
      return true;
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-3xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${
              flow.flowType === 'CHECK_STOCK'
                ? 'bg-emerald-100 text-emerald-700'
                : flow.flowType === 'PO_TO_PAYMENT'
                ? 'bg-purple-100 text-purple-700'
                : flow.flowType === 'STORE_TO_SITE_DISPATCH'
                ? 'bg-cyan-100 text-cyan-700'
                : flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' || flow.flowType === 'PAYMENT_TO_DISPATCH'
                ? 'bg-amber-100 text-amber-700'
                : flow.flowType === 'SITE_RECEIVE'
                ? 'bg-blue-100 text-blue-700'
                : flow.flowType === 'ACCOUNTS_INVOICE_COLLECTION'
                ? 'bg-indigo-100 text-indigo-700'
                : flow.flowType === 'HR_ATTENDANCE_PAYMENT'
                ? 'bg-teal-100 text-teal-700'
                : flow.flowType === 'BREAKDOWN_REPORTING'
                ? 'bg-orange-100 text-orange-700'
                : flow.flowType === 'EQUIPMENT_PART_REPAIR'
                ? 'bg-blue-100 text-blue-700'
                : flow.flowType === 'DPR_REPORTING'
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-indigo-100 text-indigo-700'
            }`}>
              {flow.flowType === 'CHECK_STOCK' ? (
                <Boxes className="w-4 h-4" />
              ) : flow.flowType === 'PO_TO_PAYMENT' ? (
                <CreditCard className="w-4 h-4" />
              ) : flow.flowType === 'STORE_TO_SITE_DISPATCH' || flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' || flow.flowType === 'PAYMENT_TO_DISPATCH' ? (
                <Truck className="w-4 h-4" />
              ) : flow.flowType === 'SITE_RECEIVE' ? (
                <PackageCheck className="w-4 h-4" />
              ) : flow.flowType === 'ACCOUNTS_INVOICE_COLLECTION' ? (
                <FileText className="w-4 h-4" />
              ) : flow.flowType === 'HR_ATTENDANCE_PAYMENT' ? (
                <UserCheck className="w-4 h-4" />
              ) : flow.flowType === 'BREAKDOWN_REPORTING' ? (
                <Wrench className="w-4 h-4" />
              ) : flow.flowType === 'EQUIPMENT_PART_REPAIR' ? (
                <Wrench className="w-4 h-4" />
              ) : flow.flowType === 'DPR_REPORTING' ? (
                <FileSpreadsheet className="w-4 h-4" />
              ) : (
                <GitBranch className="w-4 h-4" />
              )}
            </div>
            <div>
              <h3 className="font-bold text-slate-900 text-base">
                {flow.flowType === 'CHECK_STOCK'
                  ? `Stock Check: ${flow.requisitionNumber || `Req #${flow.indentNo}`} — Audit Trail`
                  : flow.flowType === 'PO_TO_PAYMENT'
                  ? `PO: ${flow.poNumber || flow.indentNo} (${flow.vendorName || 'Accounts Payment'}) — Audit Trail`
                  : flow.flowType === 'STORE_TO_SITE_DISPATCH'
                  ? `Stock to Site Dispatch: Req #${flow.requisitionNumber || flow.indentNo} — Audit Trail`
                  : flow.flowType === 'PURCHASE_TO_STORE_DISPATCH'
                  ? `Store Dispatch: Indent #${flow.indentNo} (Req #${flow.requisitionNumber || flow.indentNo}) — Audit Trail`
                  : flow.flowType === 'PAYMENT_TO_DISPATCH'
                  ? `Dispatch: PO #${flow.poNumber || flow.indentNo} (${flow.vendorName || 'Material Dispatch'}) — Audit Trail`
                  : flow.flowType === 'SITE_RECEIVE'
                  ? `Site Inward: ${flow.requisitionNumber || `MRN #${flow.indentNo}`} — Audit Trail`
                  : flow.flowType === 'ACCOUNTS_INVOICE_COLLECTION'
                  ? `Invoice Collection: PO #${flow.poNumber || flow.indentNo} (${flow.vendorName || 'Accounts'}) — Audit Trail`
                  : flow.flowType === 'HR_ATTENDANCE_PAYMENT'
                  ? `Labour Attendance & Payment: ${flow.siteName} (${flow.attendanceDate || flow.indentDate}) — Audit Trail`
                  : flow.flowType === 'BREAKDOWN_REPORTING'
                  ? `Machine Breakdown: ${flow.machineName || flow.indentNo} (${flow.machineIdNo || 'ID'}) — Audit Trail`
                  : flow.flowType === 'EQUIPMENT_PART_REPAIR'
                  ? `Equipment Part Repair: ${flow.partEquipmentName || flow.indentNo} (${flow.partSerialNo || 'S/N'}) — Audit Trail`
                  : flow.flowType === 'DPR_REPORTING'
                  ? `Daily Progress Report (DPR): ${flow.siteName} (${flow.dprDate || flow.indentDate}) — Audit Trail`
                  : `FMS Indent #${flow.indentNo} — Detailed Audit Trail`}
              </h3>
              <p className="text-xs text-slate-500">
                Flow ID: {flow.flowId} • Site: {flow.siteName} • Priority: {flow.priority}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Requisition No</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{flow.requisitionNumber || '—'}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Indent Date</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{flow.indentDate}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Flow Status</span>
              <p className="text-sm font-bold text-slate-900 mt-0.5">{flow.status}</p>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Recorded Delays</span>
              <p className="text-sm font-bold text-rose-600 mt-0.5">{flow.totalDelayHours} hrs</p>
            </div>
          </div>

          {flow.remarks && (
            <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
              <strong>Notes &amp; Justification:</strong> {flow.remarks}
            </div>
          )}

          {/* Table Header with Toggle */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Stage Breakdown ({
                  flow.flowType === 'CHECK_STOCK' 
                    ? 'Store Check Stock Flow' 
                    : flow.flowType === 'PO_TO_PAYMENT' 
                    ? 'Accounts PO to Payment Flow' 
                    : flow.flowType === 'PAYMENT_TO_DISPATCH'
                    ? 'Payment to Dispatch Flow (7 Stages)'
                    : 'Purchase Indent to PO Flow'
                })
              </h4>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setModalStageFilter('MY_STAGES')}
                  className={`px-2.5 py-1 text-xs rounded font-semibold transition-all flex items-center gap-1 ${
                    modalStageFilter === 'MY_STAGES'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <User className="w-3 h-3" />
                  <span>My Stages ({myStagesCount})</span>
                </button>
                <button
                  onClick={() => setModalStageFilter('ALL_STAGES')}
                  className={`px-2.5 py-1 text-xs rounded font-semibold transition-all flex items-center gap-1 ${
                    modalStageFilter === 'ALL_STAGES'
                      ? 'bg-white text-slate-900 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Eye className="w-3 h-3" />
                  <span>All {flow.totalStages} Stages</span>
                </button>
              </div>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Stage #</th>
                    <th className="py-2.5 px-3">Stage Name</th>
                    <th className="py-2.5 px-3">Assignee</th>
                    <th className="py-2.5 px-3">Planned</th>
                    <th className="py-2.5 px-3">Actual</th>
                    <th className="py-2.5 px-3">Decision</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedStages.length > 0 ? (
                    displayedStages.map(({ stage, idx }) => (
                      <tr key={stage.stageId} className="hover:bg-slate-50/80">
                        <td className="py-2 px-3 font-semibold text-slate-500">{idx + 1}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">
                          <div className="flex items-center gap-1.5">
                            {stage.stageName}
                            {isMyStage(idx, stage) && (
                              <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold">
                                You
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2 px-3 text-slate-600">{stage.assignee}</td>
                        <td className="py-2 px-3 text-slate-500 font-mono text-[11px]">
                          {stage.plannedDateTime || '—'}
                        </td>
                        <td className="py-2 px-3 text-slate-700 font-mono text-[11px]">
                          {stage.actualDateTime || '—'}
                        </td>
                        <td className="py-2 px-3 font-semibold">
                          {stage.decisionValue ? (
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] ${
                                stage.decisionValue === 'Yes'
                                  ? 'bg-emerald-100 text-emerald-800'
                                  : 'bg-slate-200 text-slate-700'
                              }`}
                            >
                              {stage.decisionValue}
                            </span>
                          ) : (
                            '—'
                          )}
                        </td>
                        <td className="py-2 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              stage.status === 'Done'
                                ? 'bg-emerald-100 text-emerald-800'
                                : stage.status === 'In Progress'
                                ? 'bg-indigo-100 text-indigo-800'
                                : stage.status === 'Skipped'
                                ? 'bg-slate-100 text-slate-500'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {stage.status}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        No stages belong to {currentUser.name} in this procurement flow.
                        <button
                          onClick={() => setModalStageFilter('ALL_STAGES')}
                          className="block mx-auto mt-2 text-indigo-600 font-semibold hover:underline"
                        >
                          View all 12 stages →
                        </button>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex items-center justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors"
          >
            Close Details
          </button>
        </div>
      </div>
    </div>
  );
};
