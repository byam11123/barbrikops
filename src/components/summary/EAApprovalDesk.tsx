import React, { useState, useMemo } from 'react';
import { 
  Briefcase, 
  CheckCircle2, 
  FileText, 
  Eye, 
  X, 
  Building2, 
  IndianRupee, 
  Calendar, 
  User, 
  Send, 
  Layers, 
  ShieldCheck,
  AlertCircle
} from 'lucide-react';
import { FmsInstance, UserProfile, ComparativeStatement, Priority } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { calculateCsL1Analytics } from '../../services/comparativeExcelService';

interface EAApprovalDeskProps {
  flows: FmsInstance[];
  currentUser: UserProfile;
  onSelectFlowDetail?: (flow: FmsInstance) => void;
  onUpdateFlow?: (updatedFlow: FmsInstance) => void;
}

export const EAApprovalDesk: React.FC<EAApprovalDeskProps> = ({
  flows,
  currentUser,
  onSelectFlowDetail,
  onUpdateFlow
}) => {
  const [localFlows, setLocalFlows] = useState<FmsInstance[]>(flows);
  const [selectedFlowForReview, setSelectedFlowForReview] = useState<FmsInstance | null>(null);
  const [eaBriefText, setEaBriefText] = useState<string>('');
  const [selectedPriority, setSelectedPriority] = useState<Priority>('Normal');
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  React.useEffect(() => {
    setLocalFlows(flows);
  }, [flows]);

  // Strict Filtering: The EA must ONLY see tasks for:
  // 1. INDENT_TO_PO (Director L1 Approval - Stage 4, index 3)
  // 2. PO_TO_PAYMENT (Director Payment Approval - Stage 6, index 5)
  // All operational tasks (Check Stock, Dispatch, etc.) are removed.
  const eaActionableFlows = useMemo(() => {
    return localFlows.filter((flow) => {
      if (flow.status !== 'In Progress') return false;

      const tKey = (flow.templateKey || flow.flowType || '').toUpperCase();
      const stgIdx = flow.currentStageIndex;
      const currentStage = flow.stages?.[stgIdx];
      if (!currentStage) return false;

      const sId = (currentStage.stageId || '').toUpperCase();
      const sName = (currentStage.stageName || '').toUpperCase();

      // INDENT_TO_PO / INDENT_PURCHASE Stage 4 (Director L1 Approval)
      const isIndentToPo = tKey.includes('INDENT') || flow.indentNo?.endsWith('-PUR') || flow.flowId?.includes('-PUR');
      const isDirectorL1Stage = (stgIdx === 3 && isIndentToPo) || sId === 'STG-04' || sName.includes('DIRECTOR L1');

      // PO_TO_PAYMENT Stage 6 (Director Payment Approval)
      const isPoToPayment = tKey.includes('PAYMENT') || flow.flowId?.includes('PAY');
      const isDirectorPaymentStage = (stgIdx === 5 && isPoToPayment) || sId === 'STG-PAY-06' || sName.includes('DIRECTOR PAYMENT');

      return isDirectorL1Stage || isDirectorPaymentStage;
    });
  }, [localFlows]);

  // Open Pre-Review Split-Screen Modal
  const handleOpenPreReview = (flow: FmsInstance) => {
    setSelectedFlowForReview(flow);
    const existingBrief = flow.stages[flow.currentStageIndex]?.submittedData?.eaPreReviewBrief || 
                          flow.stages[3]?.submittedData?.eaPreReviewBrief || 
                          flow.instanceDataPool?.eaPreReviewBrief || '';
    setEaBriefText(existingBrief);
    setSelectedPriority((flow.priority as any) || 'Normal');
  };

  // Submit EA Pre-Review Brief to Director
  const handleSendToDirector = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedFlowForReview) return;

    const currentStageIdx = selectedFlowForReview.currentStageIndex;
    const nowStr = new Date().toLocaleString('en-GB');

    const updatedStages = [...selectedFlowForReview.stages];
    const prevSubmitted = updatedStages[currentStageIdx]?.submittedData || {};

    updatedStages[currentStageIdx] = {
      ...updatedStages[currentStageIdx],
      submittedData: {
        ...prevSubmitted,
        eaPreReviewBrief: eaBriefText,
        eaReviewedBy: currentUser.name,
        eaReviewedAt: nowStr
      },
      notes: `[EA Pre-Review Note]: ${eaBriefText}`
    };

    const updatedFlow: FmsInstance = {
      ...selectedFlowForReview,
      priority: selectedPriority,
      stages: updatedStages,
      instanceDataPool: {
        ...(selectedFlowForReview.instanceDataPool || {}),
        eaPreReviewBrief: eaBriefText,
      },
      updatedAt: nowStr
    };

    // Save and update
    const updatedAll = localFlows.map((f) => (f.id === updatedFlow.id ? updatedFlow : f));
    setLocalFlows(updatedAll);
    storageAdapter.saveFmsFlows(updatedAll);

    if (onUpdateFlow) {
      onUpdateFlow(updatedFlow);
    }

    setToastMsg(`EA Brief successfully attached to Indent #${updatedFlow.indentNo} and forwarded to Director Queue!`);
    setTimeout(() => setToastMsg(null), 4000);
    setSelectedFlowForReview(null);
  };

  // Helper to extract csSheetId, vendorName, and poAmount for a flow
  const extractFlowData = (flow: FmsInstance) => {
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
                       'Multiple / Selected Vendor';

    const poAmount = flow.poAmount || 
                     flow.instanceDataPool?.poAmount || 
                     flow.stages?.[3]?.submittedData?.poAmount || 
                     flow.stages?.[1]?.submittedData?.poAmount || 
                     flow.stages?.[flow.currentStageIndex]?.submittedData?.poAmount || 
                     flow.stages?.[flow.currentStageIndex]?.submittedData?.approvedAmount || 
                     0;

    return { csSheetId, vendorName, poAmount };
  };

  // Find loaded ComparativeStatement for active modal
  const activeCs = useMemo(() => {
    if (!selectedFlowForReview) return null;
    const { csSheetId } = extractFlowData(selectedFlowForReview);
    const statements = storageAdapter.getComparativeStatements();
    return statements.find((s) => s.id === csSheetId || s.indentNo === selectedFlowForReview.indentNo) || null;
  }, [selectedFlowForReview]);

  return (
    <div className="space-y-4 animate-in fade-in duration-150">
      {/* Toast */}
      {toastMsg && (
        <div className="bg-emerald-600 text-white p-3 rounded-xl shadow-md text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-sky-950 text-white p-4 rounded-2xl border border-sky-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-sky-400 text-slate-950 rounded-xl font-black shrink-0">
            <Briefcase className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base sm:text-lg font-black tracking-tight">Executive Assistant (EA) Approval Desk</h3>
            <p className="text-xs text-sky-200 mt-0.5">
              Screen and pre-review procurement and payment approvals. Inspect Comparative Rate Statements and prepare executive briefs for Director sanction.
            </p>
          </div>
        </div>

        <div className="bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10 text-center shrink-0">
          <span className="text-[10px] text-sky-200 block uppercase font-bold">Awaiting EA Pre-Review</span>
          <span className="text-xl font-black text-sky-300">
            {eaActionableFlows.length}
          </span>
        </div>
      </div>

      {/* Requisitions Awaiting Executive Review Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-3.5 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <span className="font-extrabold text-slate-800 text-xs">
            Requisitions Awaiting Executive Screening ({eaActionableFlows.length})
          </span>
          <span className="text-[11px] text-slate-500 font-medium">
            Strict Filter: Director L1 Approvals &amp; Director Payment Sanctions only
          </span>
        </div>

        {eaActionableFlows.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto" />
            <h4 className="font-extrabold text-slate-800 text-sm">All Executive Tasks Pre-Reviewed!</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              There are currently no pending Director L1 or Director Payment approval tasks awaiting screening.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {eaActionableFlows.map((flow) => {
              const currentStage = flow.stages[flow.currentStageIndex];
              const { csSheetId, vendorName, poAmount } = extractFlowData(flow);
              const eaBrief = currentStage.submittedData?.eaPreReviewBrief || 
                              flow.stages[3]?.submittedData?.eaPreReviewBrief || 
                              flow.instanceDataPool?.eaPreReviewBrief;

              return (
                <div 
                  key={flow.id}
                  className="p-4 hover:bg-slate-50/80 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5 flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono font-bold text-xs text-sky-950 bg-sky-100 px-2.5 py-0.5 rounded border border-sky-300">
                        Indent #{flow.indentNo || flow.requisitionNumber}
                      </span>
                      <span className="font-extrabold text-slate-900 text-xs">
                        Stage {flow.currentStageIndex + 1}: {currentStage.stageName}
                      </span>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                        flow.priority === 'Urgent' 
                          ? 'bg-rose-100 text-rose-800 border border-rose-200' 
                          : flow.priority === 'Low'
                          ? 'bg-slate-100 text-slate-700 border border-slate-200'
                          : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                      }`}>
                        {flow.priority || 'Normal'}
                      </span>
                      {eaBrief ? (
                        <span className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" /> EA Brief Attached
                        </span>
                      ) : (
                        <span className="bg-amber-100 text-amber-900 border border-amber-300 font-extrabold text-[10px] px-2 py-0.5 rounded-full flex items-center gap-1">
                          <AlertCircle className="w-3 h-3 text-amber-600" /> Pending EA Brief
                        </span>
                      )}
                    </div>

                    <div className="text-xs text-slate-600 flex items-center gap-4 flex-wrap">
                      <span><strong>Vendor:</strong> {vendorName}</span>
                      <span><strong>Amount:</strong> ₹{poAmount ? poAmount.toLocaleString('en-IN') : 'As Per CS'}</span>
                      <span><strong>Site:</strong> {flow.siteName || 'Raipur HQ'}</span>
                      {csSheetId && (
                        <span className="font-mono text-slate-500 text-[11px]">CS Ref: {csSheetId}</span>
                      )}
                    </div>

                    {eaBrief && (
                      <div className="p-2.5 bg-sky-50 rounded-xl border border-sky-200 text-xs text-sky-950 font-medium">
                        <strong className="text-sky-900 block text-[11px]">Prepared EA Brief:</strong>
                        "{eaBrief}"
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleOpenPreReview(flow)}
                      className="px-4 py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold text-xs rounded-xl shadow-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                    >
                      <Briefcase className="w-3.5 h-3.5" />
                      <span>{eaBrief ? 'Edit Pre-Review' : 'Pre-Review'}</span>
                    </button>

                    {onSelectFlowDetail && (
                      <button
                        type="button"
                        onClick={() => onSelectFlowDetail(flow)}
                        className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer"
                        title="View Full Workflow Timeline"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* SPLIT-SCREEN PRE-REVIEW MODAL */}
      {selectedFlowForReview && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4 font-sans animate-in fade-in duration-200">
          <div className="bg-white rounded-2xl w-full max-w-6xl h-[92vh] max-h-[850px] border border-slate-300 shadow-2xl overflow-hidden flex flex-col">
            {/* Modal Header */}
            <div className="bg-sky-950 text-white p-3.5 px-5 flex items-center justify-between border-b border-sky-800 shrink-0">
              <div className="flex items-center gap-2.5">
                <Briefcase className="w-5 h-5 text-sky-400" />
                <div>
                  <h3 className="font-extrabold text-sm">
                    EA Pre-Review &amp; Executive Briefing — Indent #{selectedFlowForReview.indentNo}
                  </h3>
                  <span className="text-xs text-sky-200">
                    Stage {selectedFlowForReview.currentStageIndex + 1}: {selectedFlowForReview.stages[selectedFlowForReview.currentStageIndex]?.stageName}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setSelectedFlowForReview(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen Body */}
            <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-12 divide-y md:divide-y-0 md:divide-x divide-slate-200 overflow-hidden">
              {/* LEFT SIDE: RENDER THE CS DOCUMENT */}
              <div className="md:col-span-7 p-4 overflow-y-auto bg-slate-50 space-y-4">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <FileText className="w-4 h-4 text-slate-700" />
                    <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                      Comparative Statement (CS Sheet)
                    </h4>
                  </div>
                  {activeCs && (
                    <span className="font-mono text-[11px] font-bold text-sky-900 bg-sky-100 px-2 py-0.5 rounded border border-sky-200">
                      Ref: {activeCs.id}
                    </span>
                  )}
                </div>

                {activeCs ? (
                  <div className="space-y-4">
                    {/* CS Summary Header */}
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-xs bg-white p-3 rounded-xl border border-slate-200 shadow-2xs">
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Project Site</span>
                        <span className="font-bold text-slate-800">{activeCs.site || selectedFlowForReview.siteName}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">For Purpose</span>
                        <span className="font-bold text-slate-800">{activeCs.forPurpose || 'Procurement'}</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 font-semibold block uppercase">Statement Date</span>
                        <span className="font-bold text-slate-800">{activeCs.statementDate || activeCs.indentDate}</span>
                      </div>
                    </div>

                    {/* CS Items & Quoted Rates Table */}
                    <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-2xs">
                      <div className="p-2.5 bg-slate-100 border-b border-slate-200 text-xs font-bold text-slate-700">
                        Item Comparison &amp; Vendor Quotes ({activeCs.items.length} items, {activeCs.vendors.length} vendors)
                      </div>
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs border-collapse">
                          <thead className="bg-slate-50 text-slate-600 font-bold border-b border-slate-200 text-[11px]">
                            <tr>
                              <th className="p-2 pl-3">Item Description</th>
                              <th className="p-2 text-center">Qty</th>
                              {activeCs.vendors.map((v) => (
                                <th key={v.vendorId} className="p-2 text-right">
                                  {v.vendorName}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {activeCs.items.map((item) => (
                              <tr key={item.id} className="hover:bg-slate-50/50">
                                <td className="p-2 pl-3 font-semibold text-slate-900">
                                  {item.itemName}
                                </td>
                                <td className="p-2 text-center font-mono text-slate-700">
                                  {item.qty} {item.unit}
                                </td>
                                {activeCs.vendors.map((v) => {
                                  const quote = v.itemRates[item.id];
                                  return (
                                    <td key={v.vendorId} className="p-2 text-right font-mono">
                                      {quote && quote.isQuoted ? (
                                        <span className="font-bold text-slate-900">
                                          ₹{quote.baseRate.toLocaleString('en-IN')}
                                        </span>
                                      ) : (
                                        <span className="text-slate-400 italic">Unquoted</span>
                                      )}
                                    </td>
                                  );
                                })}
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Analytics / Total Landed Cost */}
                    {(() => {
                      const analytics = calculateCsL1Analytics(activeCs);
                      return (
                        <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-950 flex items-center justify-between">
                          <div>
                            <span className="font-extrabold text-emerald-900 block">Single Lowest L1 Total:</span>
                            <span className="font-mono text-sm font-black text-emerald-700">
                              ₹{(analytics.singleLowestVendor?.totalLanded || 0).toLocaleString('en-IN')}
                            </span>
                            <span className="text-[11px] text-emerald-800 ml-1">
                              ({analytics.singleLowestVendor?.vendorName})
                            </span>
                          </div>
                          {analytics.splitPoSavings > 0 && (
                            <div className="text-right">
                              <span className="font-bold text-emerald-900 block">Optimized Savings:</span>
                              <span className="font-mono text-sm font-black text-emerald-700">
                                ₹{analytics.splitPoSavings.toLocaleString('en-IN')}
                              </span>
                            </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-6 text-center space-y-3 bg-white rounded-xl border border-slate-200">
                    <FileText className="w-8 h-8 text-slate-400 mx-auto" />
                    <h5 className="font-bold text-slate-800 text-xs">Direct Indent Document Dossier</h5>
                    <div className="text-left text-xs space-y-1 bg-slate-50 p-3 rounded-lg border border-slate-200">
                      <div><strong>Indent No:</strong> {selectedFlowForReview.indentNo}</div>
                      <div><strong>Vendor:</strong> {extractFlowData(selectedFlowForReview).vendorName}</div>
                      <div><strong>Amount:</strong> ₹{extractFlowData(selectedFlowForReview).poAmount.toLocaleString('en-IN')}</div>
                      <div><strong>Site:</strong> {selectedFlowForReview.siteName}</div>
                      <div><strong>Line Items:</strong> {selectedFlowForReview.lineItems?.length || 1} item(s)</div>
                    </div>
                  </div>
                )}
              </div>

              {/* RIGHT SIDE: EA BRIEF TEXTAREA, PRIORITY DROPDOWN, SEND TO DIRECTOR */}
              <form onSubmit={handleSendToDirector} className="md:col-span-5 p-5 flex flex-col justify-between bg-white overflow-y-auto space-y-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 border-b border-slate-100 pb-2">
                    <ShieldCheck className="w-4 h-4 text-sky-700" />
                    <h4 className="font-extrabold text-xs text-slate-800 uppercase tracking-wider">
                      Executive Brief Preparation
                    </h4>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 text-xs mb-1.5">
                      EA Brief Note for Director *
                    </label>
                    <textarea
                      rows={8}
                      value={eaBriefText}
                      onChange={(e) => setEaBriefText(e.target.value)}
                      placeholder="e.g. Rate verified against previous purchase order. 3 vendor quotations compared; L1 supplier awarded. Credit term 30 days. Recommended for approval."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 font-medium text-slate-900 text-xs focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none leading-relaxed"
                      required
                    />
                    <span className="text-[11px] text-slate-400 mt-1 block">
                      This note will be highlighted to the Director and is mandatory for unlocking the final approval.
                    </span>
                  </div>

                  <div>
                    <label className="block font-bold text-slate-800 text-xs mb-1.5">
                      Executive Priority Flag *
                    </label>
                    <select
                      value={selectedPriority}
                      onChange={(e) => setSelectedPriority(e.target.value as any)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800 text-xs cursor-pointer focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                    >
                      <option value="Normal">Normal Priority</option>
                      <option value="Urgent">Critical Urgent</option>
                      <option value="Low">Low Priority</option>
                    </select>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-200 flex items-center justify-end gap-2.5">
                  <button
                    type="button"
                    onClick={() => setSelectedFlowForReview(null)}
                    className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold text-xs rounded-xl transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="submit"
                    className="px-5 py-2.5 bg-sky-600 hover:bg-sky-700 text-white font-extrabold text-xs rounded-xl shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Send to Director</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
