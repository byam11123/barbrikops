import React, { useState, useMemo } from 'react';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertTriangle, 
  FileText, 
  Eye, 
  X, 
  TrendingUp, 
  DollarSign, 
  KeyRound, 
  Clock, 
  FileSpreadsheet, 
  AlertCircle 
} from 'lucide-react';
import { FmsInstance, UserProfile, ComparativeStatement } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { calculateCsL1Analytics } from '../../services/comparativeExcelService';

interface DirectorQueueProps {
  flows: FmsInstance[];
  currentUser: UserProfile;
  onAdvanceFmsStage: (flow: FmsInstance, decision?: 'Yes' | 'No' | string, submittedData?: Record<string, any>) => void;
  onOpenStageAction?: (flow: FmsInstance, stageIndex: number) => void;
  onSelectFlowDetail?: (flow: FmsInstance) => void;
}

export const DirectorQueue: React.FC<DirectorQueueProps> = ({
  flows,
  currentUser,
  onAdvanceFmsStage,
  onOpenStageAction,
  onSelectFlowDetail,
}) => {
  const [localFlows, setLocalFlows] = useState<FmsInstance[]>(flows);
  const [selectedFlowForCsModal, setSelectedFlowForCsModal] = useState<FmsInstance | null>(null);
  const [selectedFlowForApproval, setSelectedFlowForApproval] = useState<FmsInstance | null>(null);
  const [selectedFlowForReject, setSelectedFlowForReject] = useState<FmsInstance | null>(null);
  const [pinVal, setPinVal] = useState<string>('');
  const [pinError, setPinError] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');

  React.useEffect(() => {
    setLocalFlows(flows);
  }, [flows]);

  // Strict Filtering: The Director must ONLY see Financial Approvals:
  // 1. INDENT_TO_PO (Stage 4: Director L1 Approval, index 3)
  // 2. PO_TO_PAYMENT (Stage 6: Director Payment Approval, index 5)
  const directorActionableFlows = useMemo(() => {
    return localFlows.filter((flow) => {
      if (flow.status !== 'In Progress') return false;

      const tKey = (flow.templateKey || flow.flowType || '').toUpperCase();
      const stgIdx = flow.currentStageIndex;
      const currentStage = flow.stages?.[stgIdx];
      if (!currentStage) return false;

      const sId = (currentStage.stageId || '').toUpperCase();
      const sName = (currentStage.stageName || '').toUpperCase();

      // INDENT_TO_PO Stage 4 (Director L1 Approval)
      const isIndentToPo = tKey.includes('INDENT') || flow.indentNo?.endsWith('-PUR') || flow.flowId?.includes('-PUR');
      const isDirectorL1Stage = (stgIdx === 3 && isIndentToPo) || sId === 'STG-04' || sName.includes('DIRECTOR L1');

      // PO_TO_PAYMENT Stage 6 (Director Payment Approval)
      const isPoToPayment = tKey.includes('PAYMENT') || flow.flowId?.includes('PAY');
      const isDirectorPaymentStage = (stgIdx === 5 && isPoToPayment) || sId === 'STG-PAY-06' || sName.includes('DIRECTOR PAYMENT');

      return isDirectorL1Stage || isDirectorPaymentStage;
    });
  }, [localFlows]);

  // Helper to extract data and calculate CS analytics for a flow
  const getFlowFinancials = (flow: FmsInstance) => {
    const csSheetId = (flow as any).csSheetId || 
                      flow.instanceDataPool?.csSheetId || 
                      flow.stages?.[3]?.submittedData?.csSheetId || 
                      flow.stages?.[1]?.submittedData?.csSheetId || 
                      flow.stages?.[1]?.submittedData?.linkedCsId || 
                      flow.linkedModuleRecord?.recordId || '';

    const vendorName = flow.vendorName || 
                       flow.instanceDataPool?.vendorName || 
                       flow.stages?.[3]?.submittedData?.vendorName || 
                       flow.stages?.[1]?.submittedData?.selectedVendorName || 
                       flow.stages?.[flow.currentStageIndex]?.submittedData?.vendorName || 
                       'Awarded Vendor';

    const poAmount = flow.poAmount || 
                     flow.instanceDataPool?.poAmount || 
                     flow.stages?.[3]?.submittedData?.poAmount || 
                     flow.stages?.[1]?.submittedData?.poAmount || 
                     flow.stages?.[flow.currentStageIndex]?.submittedData?.poAmount || 
                     flow.stages?.[flow.currentStageIndex]?.submittedData?.approvedAmount || 
                     0;

    // Fetch linked CS statement
    let savingsAmount = 0;
    let linkedCs: ComparativeStatement | null = null;
    if (csSheetId || flow.indentNo) {
      const statements = storageAdapter.getComparativeStatements();
      linkedCs = statements.find((s) => s.id === csSheetId || s.indentNo === flow.indentNo) || null;
      if (linkedCs) {
        const analytics = calculateCsL1Analytics(linkedCs);
        savingsAmount = analytics.splitPoSavings || (analytics as any).splitPoSavingsAmount || 0;
      }
    }

    // Read EA Brief Note
    const eaBrief = flow.stages?.[3]?.submittedData?.eaPreReviewBrief || 
                    flow.stages?.[flow.currentStageIndex]?.submittedData?.eaPreReviewBrief || 
                    flow.instanceDataPool?.eaPreReviewBrief || '';

    return { csSheetId, vendorName, poAmount, savingsAmount, linkedCs, eaBrief };
  };

  // Confirm Director Approval with PIN
  const handleConfirmApproval = (flow: FmsInstance) => {
    // PIN verification
    if (pinVal !== '1234' && pinVal !== '0000') {
      setPinError('Invalid Authorization PIN. Enter 1234 to sign.');
      return;
    }

    const stageIdx = flow.currentStageIndex;
    const currentStage = flow.stages[stageIdx];
    const isPaymentStage = (currentStage.stageId || '').includes('PAY') || stageIdx === 5;
    const nowStr = new Date().toLocaleString('en-GB');

    const approvalData: Record<string, any> = {
      approvedBy: currentUser.name,
      approvedAt: nowStr,
      digitalSignatureLock: `SIG-${Date.now().toString().slice(-6)}`,
      approvalStatus: 'APPROVED'
    };

    if (isPaymentStage) {
      approvalData.status = 'APPROVED';
      approvalData.approvedAmount = flow.poAmount || 0;
      approvalData.approvalRemarks = 'Payment sanctioned by Director';
    } else {
      approvalData.csL1Approval = 'APPROVED';
      approvalData.approvalRemarks = 'CS L1 rate approved by Director';
    }

    onAdvanceFmsStage(flow, 'Yes', approvalData);
    setSelectedFlowForApproval(null);
    setPinVal('');
    setPinError(null);
  };

  // Confirm Rejection / Return to Previous
  const handleConfirmReject = (flow: FmsInstance) => {
    onAdvanceFmsStage(flow, 'No', {
      status: 'REJECTED',
      approvalStatus: 'REJECTED',
      rejectionReason: rejectReason || 'Revision requested by Director',
      rejectedBy: currentUser.name
    });
    setSelectedFlowForReject(null);
    setRejectReason('');
  };

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 text-white p-4 rounded-2xl border border-emerald-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-emerald-400 text-slate-950 rounded-xl font-black shrink-0">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight">Director Executive Decision Desk</h3>
            <p className="text-xs text-emerald-200 mt-0.5">
              Review pre-screened EA briefs, inspect rate comparisons and savings, and authorize procurement L1 awards &amp; payment releases.
            </p>
          </div>
        </div>

        <div className="bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10 text-center shrink-0">
          <span className="text-[10px] text-emerald-200 block uppercase font-bold">Actionable Sanctions</span>
          <span className="text-xl font-black text-emerald-300">
            {directorActionableFlows.length}
          </span>
        </div>
      </div>

      {/* Decision Brief Cards */}
      <div className="grid grid-cols-1 gap-4">
        {directorActionableFlows.length === 0 ? (
          <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-extrabold text-slate-800 text-sm">Director Queue Clear!</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are currently no financial approvals awaiting executive sanction.
            </p>
          </div>
        ) : (
          directorActionableFlows.map((flow) => {
            const currentStage = flow.stages[flow.currentStageIndex];
            const { csSheetId, vendorName, poAmount, savingsAmount, eaBrief, linkedCs } = getFlowFinancials(flow);
            const hasEaBrief = Boolean(eaBrief && eaBrief.trim().length > 0);

            return (
              <div 
                key={flow.id}
                className="bg-white rounded-2xl border-2 border-emerald-200/90 shadow-md p-4 sm:p-5 space-y-4 hover:border-emerald-400 transition-all"
              >
                {/* Card Top Banner */}
                <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3 flex-wrap">
                  <div className="flex items-center gap-2">
                    <span className="bg-emerald-100 text-emerald-950 font-mono font-black text-xs px-3 py-1 rounded-lg border border-emerald-300">
                      Indent #{flow.indentNo || flow.requisitionNumber}
                    </span>
                    <span className="font-black text-slate-900 text-sm">
                      Stage {flow.currentStageIndex + 1}: {currentStage.stageName}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {flow.priority === 'Urgent' ? (
                      <span className="bg-rose-600 text-white font-extrabold text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wider animate-pulse">
                        CRITICAL URGENT
                      </span>
                    ) : flow.priority === 'Low' ? (
                      <span className="bg-slate-100 text-slate-700 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                        LOW PRIORITY
                      </span>
                    ) : (
                      <span className="bg-emerald-100 text-emerald-800 font-bold text-[10px] px-2.5 py-0.5 rounded-full uppercase">
                        NORMAL PRIORITY
                      </span>
                    )}

                    {hasEaBrief ? (
                      <span className="bg-sky-100 text-sky-900 border border-sky-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-sky-600" /> EA PRE-SCREENED
                      </span>
                    ) : (
                      <span className="bg-rose-100 text-rose-900 border border-rose-300 font-extrabold text-[10px] px-2.5 py-0.5 rounded-full flex items-center gap-1">
                        <AlertCircle className="w-3 h-3 text-rose-600" /> AWAITING EA BRIEF
                      </span>
                    )}
                  </div>
                </div>

                {/* EA BRIEF PROMINENT DISPLAY (YELLOW BOX) */}
                {hasEaBrief ? (
                  <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-3.5 text-xs text-amber-950 space-y-1.5 shadow-2xs">
                    <div className="flex items-center justify-between font-black text-amber-900 text-[11px] uppercase tracking-wider">
                      <span className="flex items-center gap-1.5">
                        <ShieldCheck className="w-4 h-4 text-amber-600" />
                        EA Brief (Khushboo Sahu):
                      </span>
                      <span className="text-[10px] text-amber-700 font-bold bg-amber-200/80 px-2 py-0.5 rounded-full">
                        Verified &amp; Brief Attached
                      </span>
                    </div>
                    <p className="font-semibold text-amber-950 text-xs sm:text-[13px] leading-relaxed">
                      "{eaBrief}"
                    </p>
                  </div>
                ) : (
                  <div className="bg-amber-50/70 border border-dashed border-amber-300 rounded-xl p-3 text-xs text-amber-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      <strong>Awaiting EA Brief:</strong> The Executive Assistant must pre-review this item and attach an executive note before Director authorization is unlocked.
                    </span>
                  </div>
                )}

                {/* Financials & Operational Details Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Vendor Partner</span>
                    <span className="font-bold text-slate-900">{vendorName}</span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Sanction Amount</span>
                    <span className="font-black text-emerald-700 text-sm">
                      ₹{poAmount > 0 ? poAmount.toLocaleString('en-IN') : 'As Per CS'}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Split PO Savings</span>
                    <span className="font-extrabold text-indigo-700 text-xs flex items-center gap-1">
                      <TrendingUp className="w-3.5 h-3.5 text-indigo-600" />
                      Savings: ₹{savingsAmount.toLocaleString('en-IN')}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-400 font-semibold block uppercase">Project Site Location</span>
                    <span className="font-bold text-slate-800">{flow.siteName || 'Raipur HQ'}</span>
                  </div>
                </div>

                {/* Action Bar */}
                <div className="flex items-center justify-between gap-3 pt-1 flex-wrap">
                  <div className="flex items-center gap-2">
                    {/* View CS / PO Document Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedFlowForCsModal(flow)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl border border-slate-300 transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5 text-slate-600" />
                      <span>View CS / PO</span>
                    </button>

                    {onSelectFlowDetail && (
                      <button
                        type="button"
                        onClick={() => onSelectFlowDetail(flow)}
                        className="px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-600 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                      >
                        Timeline
                      </button>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Request Revision / Reject Button */}
                    <button
                      type="button"
                      onClick={() => setSelectedFlowForReject(flow)}
                      className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                    >
                      Request Revision / Reject
                    </button>

                    {/* Authorize & Approve Button (DISABLED IF EA BRIEF IS EMPTY) */}
                    <button
                      type="button"
                      disabled={!hasEaBrief}
                      onClick={() => {
                        if (!hasEaBrief) return;
                        setSelectedFlowForApproval(flow);
                        setPinVal('');
                        setPinError(null);
                      }}
                      className={`px-5 py-2 font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 ${
                        !hasEaBrief
                          ? 'bg-slate-200 text-slate-400 border border-slate-300 cursor-not-allowed shadow-none'
                          : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer hover:shadow-lg'
                      }`}
                      title={!hasEaBrief ? 'Awaiting EA Brief' : 'Authorize & Approve Stage'}
                    >
                      <CheckCircle2 className="w-4 h-4" />
                      <span>{!hasEaBrief ? 'Awaiting EA Brief' : 'Authorize & Approve'}</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* VIEW CS / PO DOCUMENT MODAL */}
      {selectedFlowForCsModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 font-sans animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-5xl max-h-[90vh] border border-slate-300 shadow-2xl overflow-hidden flex flex-col">
            <div className="bg-slate-900 text-white p-4 flex items-center justify-between border-b border-slate-800 shrink-0">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-sm">
                  Comparative Statement Document — Indent #{selectedFlowForCsModal.indentNo}
                </h3>
              </div>
              <button
                onClick={() => setSelectedFlowForCsModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto space-y-4">
              {(() => {
                const { csSheetId, vendorName, poAmount, savingsAmount, linkedCs } = getFlowFinancials(selectedFlowForCsModal);

                if (!linkedCs) {
                  return (
                    <div className="p-8 text-center space-y-3 bg-slate-50 rounded-xl border border-slate-200">
                      <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                      <h4 className="font-bold text-slate-800 text-sm">Purchase Order Dossier</h4>
                      <p className="text-xs text-slate-500">
                        Indent #{selectedFlowForCsModal.indentNo} • Vendor: {vendorName} • Amount: ₹{poAmount.toLocaleString('en-IN')}
                      </p>
                      <div className="p-3 bg-white rounded-lg border border-slate-200 text-xs text-left max-w-md mx-auto">
                        <div><strong>Site Location:</strong> {selectedFlowForCsModal.siteName}</div>
                        <div><strong>Priority:</strong> {selectedFlowForCsModal.priority || 'Normal'}</div>
                        <div><strong>Items:</strong> {selectedFlowForCsModal.lineItems?.length || 1} material items</div>
                      </div>
                    </div>
                  );
                }

                const analytics = calculateCsL1Analytics(linkedCs);

                return (
                  <div className="space-y-4">
                    {/* Header info */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-slate-50 p-3.5 rounded-xl border border-slate-200 text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">CS Sheet Ref</span>
                        <span className="font-mono font-bold text-slate-900">{linkedCs.id}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Lowest Vendor</span>
                        <span className="font-bold text-slate-900">{analytics.singleLowestVendor?.vendorName || '—'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Landed Total</span>
                        <span className="font-bold text-emerald-700">₹{(analytics.singleLowestVendor?.totalLanded || 0).toLocaleString('en-IN')}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Split PO Savings</span>
                        <span className="font-bold text-indigo-700">₹{analytics.splitPoSavings.toLocaleString('en-IN')}</span>
                      </div>
                    </div>

                    {/* Items table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200 text-[11px]">
                            <tr>
                              <th className="p-2.5 pl-3">Item Description</th>
                              <th className="p-2.5 text-center">Qty</th>
                              {linkedCs.vendors.map((v) => (
                                <th key={v.vendorId} className="p-2.5 text-right font-mono">
                                  {v.vendorName}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {linkedCs.items.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50">
                                <td className="p-2.5 pl-3 font-semibold text-slate-900">{item.itemName}</td>
                                <td className="p-2.5 text-center font-mono text-slate-600">{item.qty} {item.unit}</td>
                                {linkedCs.vendors.map((v) => {
                                  const q = v.itemRates[item.id];
                                  return (
                                    <td key={v.vendorId} className="p-2.5 text-right font-mono font-bold">
                                      {q && q.isQuoted ? `₹${q.baseRate.toLocaleString('en-IN')}` : '—'}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>
        </div>
      )}

      {/* AUTHORIZATION PIN MODAL */}
      {selectedFlowForApproval && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-300 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <h4 className="font-extrabold text-sm text-slate-900">
                  Director Authorization Sign-off
                </h4>
              </div>
              <button onClick={() => setSelectedFlowForApproval(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs space-y-1">
              <span className="font-bold text-emerald-950 block">
                Sanction Indent #{selectedFlowForApproval.indentNo}
              </span>
              <p className="text-emerald-800">
                Stage {selectedFlowForApproval.currentStageIndex + 1}: {selectedFlowForApproval.stages[selectedFlowForApproval.currentStageIndex]?.stageName}
              </p>
            </div>

            <div className="space-y-2">
              <label className="block font-bold text-slate-800 text-xs">
                Enter Director PIN (default: 1234)
              </label>
              <input
                type="password"
                maxLength={4}
                value={pinVal}
                onChange={(e) => {
                  setPinVal(e.target.value);
                  setPinError(null);
                }}
                placeholder="••••"
                className="w-full text-center tracking-[0.5em] font-mono text-xl py-2.5 border border-slate-300 rounded-xl focus:ring-2 focus:ring-emerald-500 outline-none"
                autoFocus
              />
              {pinError && (
                <span className="text-rose-600 text-xs font-semibold block">{pinError}</span>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedFlowForApproval(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmApproval(selectedFlowForApproval)}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
              >
                Authorize &amp; Sign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* REVISION / REJECTION MODAL */}
      {selectedFlowForReject && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4 font-sans animate-in fade-in duration-150">
          <div className="bg-white rounded-2xl w-full max-w-md border border-slate-300 shadow-2xl p-5 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h4 className="font-extrabold text-sm text-slate-900">
                Request Revision / Return to Purchaser
              </h4>
              <button onClick={() => setSelectedFlowForReject(null)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2 text-xs">
              <label className="block font-bold text-slate-800">
                Reason for Revision / Return *
              </label>
              <textarea
                rows={4}
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="e.g. Rate is higher than budget. Obtain fresh quotes from alternative suppliers."
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-slate-900 text-xs focus:ring-2 focus:ring-rose-500 outline-none"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setSelectedFlowForReject(null)}
                className="px-4 py-2 border border-slate-300 text-slate-700 font-bold text-xs rounded-xl hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleConfirmReject(selectedFlowForReject)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-700 text-white font-black text-xs rounded-xl shadow-md cursor-pointer"
              >
                Submit Rejection
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
