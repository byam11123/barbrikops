import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  ExternalLink, 
  Copy, 
  Check, 
  CheckCircle2, 
  AlertTriangle, 
  Building2, 
  Landmark, 
  FileText, 
  ShieldCheck, 
  Clock, 
  Lock, 
  RefreshCw, 
  Eye, 
  Globe, 
  CheckSquare, 
  FileSpreadsheet,
  Layers,
  ChevronRight,
  Info,
  Settings,
  Link2,
  Edit3,
  Save,
  X
} from 'lucide-react';
import { UnifiedItem } from './UnifiedWorkSummary';
import { FmsInstance, UserProfile, ChecklistItem } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface SplitTaskCockpitProps {
  task: UnifiedItem;
  flow?: FmsInstance;
  stageIndex?: number;
  checklistItem?: ChecklistItem;
  currentUser: UserProfile;
  onClose: () => void;
  onAdvanceFmsStage: (flow: FmsInstance, decision?: 'Yes' | 'No') => void;
  onCompleteChecklist?: (item: ChecklistItem) => void;
}

interface ChecklistItemState {
  id: string;
  label: string;
  checked: boolean;
  required: boolean;
}

export const SplitTaskCockpit: React.FC<SplitTaskCockpitProps> = ({
  task,
  flow,
  stageIndex = 0,
  checklistItem,
  currentUser,
  onClose,
  onAdvanceFmsStage,
  onCompleteChecklist,
}) => {
  // Determine Stage Configuration & Defaults
  const currentStage = flow?.stages[stageIndex];
  const stageName = currentStage?.stageName || task.title;
  const stageNameUpper = stageName.toUpperCase();

  // Detect Stage Category
  const isBankingStage = 
    stageNameUpper.includes('PAYMENT') || 
    stageNameUpper.includes('BANK') || 
    stageNameUpper.includes('DISBURSE') || 
    stageNameUpper.includes('RTGS') || 
    stageNameUpper.includes('NEFT') || 
    stageNameUpper.includes('ACCOUNTS');

  const isErpStage = 
    stageNameUpper.includes('INWARD') || 
    stageNameUpper.includes('STORE') || 
    stageNameUpper.includes('GRN') || 
    stageNameUpper.includes('STOCK') || 
    stageNameUpper.includes('MATERIAL') || 
    stageNameUpper.includes('BILL');

  const isCsStage = 
    stageNameUpper.includes('RATE') || 
    stageNameUpper.includes('COMPARISON') || 
    stageNameUpper.includes('CS') || 
    stageNameUpper.includes('QUOTE') || 
    stageNameUpper.includes('L-1');

  const isPoStage = 
    stageNameUpper.includes('PURCHASE ORDER') || 
    stageNameUpper.includes('PO RELEASE') || 
    stageNameUpper.includes('PO ISSUE');

  // Sourced Data (from linked Flow / Bank Payment / Vendor)
  const allBankPayments = storageAdapter.getBankPayments();
  const matchedPayment = flow?.indentNo 
    ? allBankPayments.find(p => p.billNoPo?.includes(flow.indentNo) || p.purposeOfPayment.includes(flow.indentNo))
    : allBankPayments[0];

  const vendorName = flow?.vendorName || matchedPayment?.vendorName || 'M/S ULTRA TECH CEMENT';
  const beneficiaryName = matchedPayment?.beneficiaryName || 'ULTRATECH CEMENT LIMITED';
  const bankName = matchedPayment?.bankName || 'State Bank of India';
  const accountNo = matchedPayment?.accountNoMasked || '38291048291';
  const ifscCode = matchedPayment?.ifscCode || 'SBIN0001292';
  const amountNumber = matchedPayment?.amountToBePaid || 48500;
  const poRefNumber = flow?.poNumber || flow?.indentNo || 'PO-BPL-2026-081';

  // Determine Work Link (Google Form, Netbanking, ERP Portal)
  const defaultWorkUrl = isBankingStage
    ? 'https://corp.onlinesbi.sbi/corp/login.htm'
    : isCsStage
    ? 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit'
    : isErpStage
    ? 'https://erp.barbrik.com/material-inward'
    : 'https://docs.google.com/forms/d/e/1FAIpQLScQ9PZ_GqC3_sample/viewform';

  const stageDef = (task.rawItem as any)?.def;
  const initialUrl = 
    currentStage?.googleFormUrl || 
    (task.rawItem as any)?.stage?.googleFormUrl || 
    stageDef?.formUrl || 
    defaultWorkUrl;

  const [workUrl, setWorkUrl] = useState<string>(initialUrl);
  const [isLinkConfigOpen, setIsLinkConfigOpen] = useState<boolean>(false);
  const [inputUrl, setInputUrl] = useState<string>(initialUrl);
  const [savePermanent, setSavePermanent] = useState<boolean>(true);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    setInputUrl(workUrl);
  }, [workUrl]);

  const handleSaveLink = (newUrl: string) => {
    const trimmed = newUrl.trim();
    if (!trimmed) return;
    
    let formatted = trimmed;
    if (!formatted.startsWith('http://') && !formatted.startsWith('https://')) {
      formatted = `https://${formatted}`;
    }

    setWorkUrl(formatted);

    const isProtected = 
      formatted.includes('onlinesbi.sbi') || 
      formatted.includes('hdfcbank.com') || 
      formatted.includes('icicibank.com') || 
      formatted.includes('gst.gov.in') || 
      formatted.includes('ewaybillgst.gov.in') ||
      formatted.includes('erp.barbrik.com');
    setEmbedMode(!isProtected);

    if (savePermanent && flow) {
      storageAdapter.updateFmsStageUrl(flow.id, stageIndex, formatted, currentUser);
    }

    setSaveSuccessMsg('Target link updated successfully!');
    setTimeout(() => {
      setSaveSuccessMsg(null);
      setIsLinkConfigOpen(false);
    }, 1000);
  };

  // External Portal Detection (Netbanking, Tally, GST block iframes)
  const isProtectedExternalPortal = 
    workUrl.includes('onlinesbi.sbi') || 
    workUrl.includes('hdfcbank.com') || 
    workUrl.includes('icicibank.com') || 
    workUrl.includes('gst.gov.in') || 
    workUrl.includes('ewaybillgst.gov.in') ||
    workUrl.includes('erp.barbrik.com');

  const [embedMode, setEmbedMode] = useState<boolean>(!isProtectedExternalPortal);

  // Auto-launch external portal in new tab on mount if it blocks iframes
  useEffect(() => {
    if (isProtectedExternalPortal) {
      try {
        window.open(workUrl, '_blank', 'noopener,noreferrer');
      } catch (e) {
        console.warn('Popup blocked for external portal auto-launch', e);
      }
    }
  }, [isProtectedExternalPortal, workUrl]);

  // Clipboard Copy State
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const handleCopy = (key: string, val: string) => {
    navigator.clipboard.writeText(val);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  // Standardized Checklist Items by Stage Category
  const defaultChecklist: ChecklistItemState[] = isBankingStage
    ? [
        { id: 'c1', label: 'Verified beneficiary name & account coordinates against approved PO / invoice', checked: false, required: true },
        { id: 'c2', label: 'Confirmed payment amount matches management sanction limit', checked: false, required: true },
        { id: 'c3', label: 'Initiated electronic transfer in corporate netbanking portal', checked: false, required: true },
        { id: 'c4', label: 'Generated and recorded official Bank UTR / Transaction Reference', checked: false, required: true },
      ]
    : isErpStage
    ? [
        { id: 'c1', label: 'Physically inspected received material against delivery challan', checked: false, required: true },
        { id: 'c2', label: 'Verified batch quality certificate and store bin allocation', checked: false, required: true },
        { id: 'c3', label: 'Generated Material Inward / GRN voucher in ERP software', checked: false, required: true },
        { id: 'c4', label: 'Attached signed physical challan copy for accounts audit', checked: false, required: true },
      ]
    : isCsStage
    ? [
        { id: 'c1', label: 'Obtained minimum 3 competitive vendor quotations on standard RFQ', checked: false, required: true },
        { id: 'c2', label: 'Calculated landed cost per unit including GST, freight, and terms', checked: false, required: true },
        { id: 'c3', label: 'Prepared Comparative Statement and identified L-1 rate recommendation', checked: false, required: true },
        { id: 'c4', label: 'Obtained user department technical clearance', checked: false, required: true },
      ]
    : isPoStage
    ? [
        { id: 'c1', label: 'Verified approved indent items, site delivery dates, and specifications', checked: false, required: true },
        { id: 'c2', label: 'Incorporated finalized L-1 rates and agreed payment milestones', checked: false, required: true },
        { id: 'c3', label: 'Generated formal Purchase Order (PO) document with statutory GST clauses', checked: false, required: true },
        { id: 'c4', label: 'Dispatched signed copy to vendor and project site storekeeper', checked: false, required: true },
      ]
    : [
        { id: 'c1', label: 'Physically inspected work / task section on ground as per SOP', checked: false, required: true },
        { id: 'c2', label: 'Verified compliance and entered operational observations', checked: false, required: true },
        { id: 'c3', label: 'Signed off execution record in departmental register', checked: false, required: true },
      ];

  const [checklist, setChecklist] = useState<ChecklistItemState[]>(defaultChecklist);
  const [referenceProof, setReferenceProof] = useState<string>('');
  const [customRemarks, setCustomRemarks] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  // Toggle Checkbox
  const handleToggleCheck = (id: string) => {
    setChecklist(prev => prev.map(item => item.id === id ? { ...item, checked: !item.checked } : item));
  };

  const checkedCount = checklist.filter(c => c.checked).length;
  const totalRequired = checklist.filter(c => c.required).length;
  const allChecksComplete = checkedCount >= totalRequired;
  const hasProof = referenceProof.trim().length >= 3;
  const isActionEnabled = allChecksComplete && hasProof;

  // Reference Proof Label
  const proofLabel = isBankingStage
    ? 'Bank UTR / Transaction Reference Number *'
    : isErpStage
    ? 'ERP Goods Receipt Note (GRN) / Voucher No *'
    : isCsStage
    ? 'Approved CS Sheet Ref / Document No *'
    : isPoStage
    ? 'Released Purchase Order (PO) Number *'
    : 'Execution / Logbook Reference ID *';

  const proofPlaceholder = isBankingStage
    ? 'e.g. UTR-SBIN2610149812'
    : isErpStage
    ? 'e.g. GRN-2026-BPL-0482'
    : isCsStage
    ? 'e.g. CS-BPL-2026-OCT-012'
    : isPoStage
    ? 'e.g. PO-BPL-2026-089'
    : 'e.g. LOG-SIL-2026-1014';

  const handleCompleteStage = (decision: 'Yes' | 'No' = 'Yes') => {
    if (!isActionEnabled || isSubmitting) return;
    setIsSubmitting(true);

    try {
      // 1. Log audit trail with verified checklist items & reference proof
      storageAdapter.logAudit({
        userId: currentUser.userId,
        userName: currentUser.name,
        module: task.sourceModule === 'CHECKLIST' ? 'CHECKLIST' : 'FMS',
        action: 'STAGE_ADVANCE',
        entityId: flow?.flowId || task.referenceCode,
        details: `Completed stage "${stageName}" in Cockpit with ${checkedCount}/${checklist.length} checklist verifications. Proof: ${referenceProof.trim()}`
      });

      // 2. Advance FMS Flow or Complete Checklist
      if (task.sourceModule === 'CHECKLIST' && checklistItem && onCompleteChecklist) {
        onCompleteChecklist(checklistItem);
      } else if (flow) {
        onAdvanceFmsStage(flow, decision);
      }

      onClose();
    } catch (e) {
      console.error('Failed to advance stage in cockpit', e);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-slate-900 text-slate-100 animate-in fade-in duration-200">
      {/* Cockpit Top Bar */}
      <div className="h-14 px-6 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to My Work Table</span>
          </button>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2 text-xs">
            <span className="font-mono font-bold px-2 py-0.5 bg-indigo-950 text-indigo-400 border border-indigo-800 rounded">
              {flow?.indentNo || flow?.flowId || task.referenceCode}
            </span>
            <span className="font-bold text-slate-200">{stageName}</span>
            <span className="text-slate-500">·</span>
            <span className="text-slate-400">{vendorName}</span>
          </div>
        </div>

        <div className="flex items-center gap-2.5 text-xs">
          {/* Configure / Change Work Link Trigger */}
          <button
            type="button"
            onClick={() => setIsLinkConfigOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 border border-indigo-700/60 rounded-lg font-bold transition-all shadow-xs cursor-pointer"
            title="Configure target Google Form, Sheet, or Portal link"
          >
            <Settings className="w-3.5 h-3.5 text-indigo-300" />
            <span>Change Link</span>
          </button>

          {/* Quick Target URL Launch */}
          <a
            href={workUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-400 font-bold rounded-lg border border-slate-700 transition-colors"
          >
            <ExternalLink className="w-3.5 h-3.5" />
            <span>Open in New Window</span>
          </a>

          {/* SLA Status Indicator */}
          <div className={`px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 ${
            task.isOverdue
              ? 'bg-rose-950/80 border border-rose-800 text-rose-300'
              : 'bg-emerald-950/80 border border-emerald-800 text-emerald-300'
          }`}>
            <Clock className="w-3.5 h-3.5" />
            <span>Target: {task.targetDateStr}</span>
          </div>
        </div>
      </div>

      {/* Main Split-Screen Viewport */}
      <div className="flex-1 flex overflow-hidden">
        {/* ========================================================= */}
        {/* LEFT PANEL (~38% width): TASK IDENTITY & VERIFICATION     */}
        {/* ========================================================= */}
        <div className="w-full lg:w-[460px] xl:w-[490px] border-r border-slate-800 bg-slate-900/95 flex flex-col shrink-0 overflow-y-auto p-5 space-y-4">
          {/* Task Identity Card */}
          <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                Operational Task Identity
              </span>
              <span className="text-xs font-semibold px-2 py-0.5 bg-slate-700 text-slate-300 rounded">
                Stage {stageIndex + 1} of {flow?.stages.length || 1}
              </span>
            </div>

            <div>
              <h3 className="text-sm font-bold text-white">{stageName}</h3>
              <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                {flow?.title || task.subtitle || 'Execute required operational entry in the designated portal.'}
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-700/60 text-xs">
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Vendor / Beneficiary</span>
                <span className="font-semibold text-slate-200 truncate block">{vendorName}</span>
              </div>
              <div>
                <span className="block text-[10px] text-slate-500 font-bold uppercase">Planned Amount</span>
                <span className="font-mono font-bold text-emerald-400">₹{amountNumber.toLocaleString('en-IN')}</span>
              </div>
            </div>
          </div>

          {/* ========================================================= */}
          {/* 1-CLICK CLIPBOARD STRIP (NO MANUAL TYPING ERRORS)        */}
          {/* ========================================================= */}
          <div className="p-3.5 bg-indigo-950/40 border border-indigo-900/60 rounded-xl space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-indigo-300 flex items-center gap-1.5">
                <Copy className="w-3.5 h-3.5" />
                <span>1-Click Copy Helpers (For Netbanking / ERP)</span>
              </span>
              <span className="text-[10px] text-indigo-400 font-medium">Click to paste in portal</span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              {/* Copy Account Number */}
              <button
                type="button"
                onClick={() => handleCopy('acc', accountNo)}
                className="p-2 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 rounded-lg text-left flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Account No</div>
                  <div className="font-mono font-bold text-slate-200 truncate">{accountNo}</div>
                </div>
                {copiedKey === 'acc' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
              </button>

              {/* Copy IFSC */}
              <button
                type="button"
                onClick={() => handleCopy('ifsc', ifscCode)}
                className="p-2 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 rounded-lg text-left flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">IFSC Code</div>
                  <div className="font-mono font-bold text-slate-200 uppercase truncate">{ifscCode}</div>
                </div>
                {copiedKey === 'ifsc' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
              </button>

              {/* Copy Net Amount */}
              <button
                type="button"
                onClick={() => handleCopy('amt', String(amountNumber))}
                className="p-2 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 rounded-lg text-left flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">Amount (₹)</div>
                  <div className="font-mono font-bold text-emerald-400 truncate">₹{amountNumber}</div>
                </div>
                {copiedKey === 'amt' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
              </button>

              {/* Copy PO / Indent Ref */}
              <button
                type="button"
                onClick={() => handleCopy('po', poRefNumber)}
                className="p-2 bg-slate-800/90 hover:bg-slate-750 border border-slate-700 rounded-lg text-left flex items-center justify-between cursor-pointer transition-colors"
              >
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-bold uppercase">PO / Indent Ref</div>
                  <div className="font-mono font-bold text-slate-200 truncate">{poRefNumber}</div>
                </div>
                {copiedKey === 'po' ? (
                  <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                ) : (
                  <Copy className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                )}
              </button>
            </div>
          </div>

          {/* ========================================================= */}
          {/* MANDATORY VERIFICATION CHECKLIST (STAGE ACTION GATE)     */}
          {/* ========================================================= */}
          <div className="p-4 bg-slate-800/80 border border-slate-700/80 rounded-xl space-y-3 flex-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                <CheckSquare className="w-4 h-4 text-emerald-400" />
                <span>Mandatory Action Checklist</span>
              </div>
              <span className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                allChecksComplete
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  : 'bg-amber-950 text-amber-300 border border-amber-800'
              }`}>
                {checkedCount} of {totalRequired} Checked
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-normal">
              You must verify all procedural checklist items below before the stage completion action button unlocks.
            </p>

            {/* Check Items List */}
            <div className="space-y-2 pt-1">
              {checklist.map((item) => (
                <label
                  key={item.id}
                  className={`flex items-start gap-2.5 p-2.5 rounded-lg border transition-all cursor-pointer ${
                    item.checked
                      ? 'bg-emerald-950/30 border-emerald-800/60 text-slate-200'
                      : 'bg-slate-900/60 border-slate-700 text-slate-300 hover:bg-slate-900'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={item.checked}
                    onChange={() => handleToggleCheck(item.id)}
                    className="mt-0.5 w-4 h-4 rounded text-emerald-600 focus:ring-emerald-500 bg-slate-800 border-slate-600"
                  />
                  <span className="text-xs leading-relaxed font-medium select-none">
                    {item.label}
                  </span>
                </label>
              ))}
            </div>

            {/* Reference Proof Input Field (Mandatory) */}
            <div className="pt-3 border-t border-slate-700/70 space-y-1.5">
              <label className="block text-xs font-bold text-slate-200">
                {proofLabel}
              </label>
              <input
                type="text"
                required
                placeholder={proofPlaceholder}
                value={referenceProof}
                onChange={(e) => setReferenceProof(e.target.value)}
                className="w-full text-xs p-2.5 bg-slate-900 border border-slate-700 rounded-lg font-mono font-bold text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 placeholder:text-slate-600"
              />
              <span className="text-[10px] text-slate-400 block">
                Proof of completion will be recorded in audit log and presented to the next stage assignee.
              </span>
            </div>

            {/* Operational Remarks (Optional) */}
            <div className="space-y-1">
              <label className="block text-[11px] font-bold text-slate-400">
                Operational Notes / Deviations (Optional)
              </label>
              <input
                type="text"
                placeholder="e.g. Rate negotiated down by 2% with supplier"
                value={customRemarks}
                onChange={(e) => setCustomRemarks(e.target.value)}
                className="w-full text-xs p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 placeholder:text-slate-600"
              />
            </div>
          </div>

          {/* ========================================================= */}
          {/* COMPLETION ACTION BUTTON GATE                             */}
          {/* ========================================================= */}
          <div className="pt-2 border-t border-slate-800 space-y-2">
            {!isActionEnabled && (
              <div className="p-2.5 bg-amber-950/60 border border-amber-800/80 rounded-lg text-[11px] text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Action Locked: Check all {totalRequired} boxes and provide reference proof to complete.
                </span>
              </div>
            )}

            <button
              type="button"
              disabled={!isActionEnabled || isSubmitting}
              onClick={() => handleCompleteStage('Yes')}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold transition-all shadow-md flex items-center justify-center gap-2 ${
                isActionEnabled
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white cursor-pointer ring-2 ring-emerald-400 shadow-emerald-950/50'
                  : 'bg-slate-800 text-slate-500 border border-slate-700 cursor-not-allowed opacity-60'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {isSubmitting
                  ? 'Verifying & Handing Over...'
                  : isBankingStage
                  ? 'Confirm Payment Done & Handover'
                  : 'Complete Stage & Advance Workflow'}
              </span>
            </button>
          </div>
        </div>

        {/* ========================================================= */}
        {/* RIGHT PANEL (~62% width): LIVE WORK LINK / PORTAL BRIDGE */}
        {/* ========================================================= */}
        <div className="flex-1 bg-slate-950 flex flex-col overflow-hidden relative">
          {/* Right Panel Header Bar */}
          <div className="h-10 px-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <Globe className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
              <span className="font-bold text-slate-300 truncate max-w-xs sm:max-w-md" title={workUrl}>
                {workUrl}
              </span>
              <button
                type="button"
                onClick={() => setIsLinkConfigOpen(true)}
                className="px-2 py-0.5 bg-indigo-950 text-indigo-300 hover:text-white hover:bg-indigo-800 border border-indigo-700/60 rounded text-[10px] font-bold transition-colors inline-flex items-center gap-1 cursor-pointer shrink-0"
                title="Change or customize this work link"
              >
                <Edit3 className="w-3 h-3" />
                <span>Edit Link</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setEmbedMode(!embedMode)}
                className="px-2.5 py-1 text-[11px] font-semibold text-slate-400 hover:text-slate-200 bg-slate-800 hover:bg-slate-750 rounded transition-colors"
              >
                {embedMode ? 'Show Portal Bridge' : 'Try Embedded View'}
              </button>
              <a
                href={workUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded transition-colors"
                title="Open in new window"
              >
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Right Viewport Body */}
          <div className="flex-1 relative overflow-auto">
            {embedMode ? (
              /* Live Embedded Iframe (Google Forms, Google Sheets, Internal Docs) */
              <iframe
                src={workUrl}
                title="Work Execution Target"
                className="w-full h-full border-none bg-white"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              />
            ) : (
              /* Protected External Portal Execution Bridge Card (Netbanking / ERP) */
              <div className="h-full flex items-center justify-center p-8 bg-gradient-to-b from-slate-900 to-slate-950">
                <div className="max-w-xl w-full p-8 bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl text-center space-y-5">
                  <div className="p-3.5 bg-indigo-950 text-indigo-400 border border-indigo-800/60 rounded-2xl inline-flex items-center justify-center">
                    {isBankingStage ? (
                      <Landmark className="w-10 h-10" />
                    ) : (
                      <Building2 className="w-10 h-10" />
                    )}
                  </div>

                  <div className="space-y-1.5">
                    <h3 className="text-lg font-bold text-white">
                      {isBankingStage
                        ? 'Corporate Netbanking Portal Active'
                        : 'External Enterprise ERP Portal Active'}
                    </h3>
                    <p className="text-xs text-slate-400 leading-relaxed max-w-md mx-auto">
                      This security-protected banking or corporate ERP portal operates in an external browser window. Use the <span className="font-semibold text-indigo-400">1-click copy helpers</span> on the left to complete your entry without typing mistakes.
                    </p>
                  </div>

                  {/* Re-launch Portal Action */}
                  <div className="pt-2">
                    <a
                      href={workUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-lg inline-flex items-center gap-2 cursor-pointer"
                    >
                      <ExternalLink className="w-4 h-4" />
                      <span>Launch / Re-open Portal Tab</span>
                    </a>
                  </div>

                  {/* Status Indicator */}
                  <div className="p-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-left text-xs text-slate-300 space-y-1">
                    <div className="font-bold text-slate-200 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Operational Handover Protocol</span>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Once you finish the transfer in Netbanking or the entry in ERP, copy your <span className="font-semibold text-slate-200">UTR / Voucher No</span> into the left panel and tick all verification boxes to advance the workflow.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Target Link Configuration Modal */}
      {isLinkConfigOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-950/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full overflow-hidden shadow-2xl text-slate-100">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-500/20 text-indigo-400 rounded-xl">
                  <Link2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">Configure Target Link for this Stage</h3>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Stage: <span className="text-indigo-300 font-semibold">{stageName}</span> ({flow?.indentNo || task.referenceCode})
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsLinkConfigOpen(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 space-y-4 text-xs">
              <p className="text-slate-300 leading-relaxed text-[11px]">
                The Split-Screen Cockpit opens this target link in the right panel. Google Forms and Google Sheets are embedded live in the viewport. External portals like SBI/HDFC Netbanking and ERP portals open automatically in a fresh tab with active copy helpers.
              </p>

              {/* 1-Click Presets */}
              <div className="space-y-1.5">
                <span className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                  Quick Link Presets:
                </span>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setInputUrl('https://docs.google.com/forms/d/e/1FAIpQLScQ9PZ_GqC3_sample/viewform')}
                    className="p-2 bg-slate-800/80 hover:bg-indigo-950/80 border border-slate-700 hover:border-indigo-600 rounded-lg text-left transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-slate-200 group-hover:text-indigo-300 flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-purple-400" />
                      <span>Google Form</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">Live embedded form</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputUrl('https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit')}
                    className="p-2 bg-slate-800/80 hover:bg-indigo-950/80 border border-slate-700 hover:border-indigo-600 rounded-lg text-left transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-slate-200 group-hover:text-indigo-300 flex items-center gap-1.5">
                      <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Google Sheet CS</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">Rate Comparison Sheet</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputUrl('https://corp.onlinesbi.sbi/corp/login.htm')}
                    className="p-2 bg-slate-800/80 hover:bg-indigo-950/80 border border-slate-700 hover:border-indigo-600 rounded-lg text-left transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-slate-200 group-hover:text-indigo-300 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-sky-400" />
                      <span>SBI Netbanking</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">Corporate Portal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputUrl('https://netbanking.hdfcbank.com/netbanking/')}
                    className="p-2 bg-slate-800/80 hover:bg-indigo-950/80 border border-slate-700 hover:border-indigo-600 rounded-lg text-left transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-slate-200 group-hover:text-indigo-300 flex items-center gap-1.5">
                      <Landmark className="w-3.5 h-3.5 text-blue-400" />
                      <span>HDFC Netbanking</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">Disbursement Portal</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputUrl('https://erp.barbrik.com/material-inward')}
                    className="p-2 bg-slate-800/80 hover:bg-indigo-950/80 border border-slate-700 hover:border-indigo-600 rounded-lg text-left transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-slate-200 group-hover:text-indigo-300 flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-amber-400" />
                      <span>Barbrik ERP GRN</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">Store Inward Voucher</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setInputUrl('https://ewaybillgst.gov.in/')}
                    className="p-2 bg-slate-800/80 hover:bg-indigo-950/80 border border-slate-700 hover:border-indigo-600 rounded-lg text-left transition-all cursor-pointer group"
                  >
                    <div className="font-bold text-slate-200 group-hover:text-indigo-300 flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-teal-400" />
                      <span>GST E-Way Bill</span>
                    </div>
                    <span className="text-[10px] text-slate-500 block truncate mt-0.5">Statutory Portal</span>
                  </button>
                </div>
              </div>

              {/* Custom URL Input Field */}
              <div className="space-y-1.5 pt-2 border-t border-slate-800">
                <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider">
                  Target Work Link URL (Web Address):
                </label>
                <div className="relative">
                  <Globe className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                  <input
                    type="url"
                    value={inputUrl}
                    onChange={(e) => setInputUrl(e.target.value)}
                    placeholder="https://docs.google.com/forms/d/e/... or https://portal..."
                    className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-xs font-mono text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 placeholder:text-slate-600"
                  />
                </div>
              </div>

              {/* Persist checkbox */}
              {flow && (
                <label className="flex items-center gap-2 pt-1 text-slate-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={savePermanent}
                    onChange={(e) => setSavePermanent(e.target.checked)}
                    className="w-4 h-4 rounded text-indigo-600 bg-slate-800 border-slate-700 focus:ring-indigo-500"
                  />
                  <span>Save this link permanently for this stage in workflow record</span>
                </label>
              )}

              {saveSuccessMsg && (
                <div className="p-2.5 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-lg text-xs font-bold flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>{saveSuccessMsg}</span>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-slate-800 bg-slate-900/90 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsLinkConfigOpen(false)}
                className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => handleSaveLink(inputUrl)}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Apply & Save Link</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
