import React, { useState, useEffect, useMemo } from 'react';
import {
  ArrowLeft,
  Calendar,
  Clock,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  MapPin,
  ExternalLink,
  Layers,
  Truck,
  ShoppingCart,
  Boxes,
  Award,
  CreditCard,
  Building2,
  ChevronRight,
  Download,
  Share2,
  RefreshCw,
  Edit3,
  ShieldCheck,
  CheckCircle,
  FileCheck,
  Zap,
  Info,
  X,
  Eye
} from 'lucide-react';
import { FmsInstance, FmsStageExecution, UserProfile, isUserSuperAdmin, isUserAdminOrSuperAdmin } from '../../types';
import { downloadCsv } from '../../utils/csvExporter';
import { StoreTriageModal } from './StoreTriageModal';
import { EmbeddedL1ApprovalModal } from './EmbeddedL1ApprovalModal';
import { FmsItemTable } from './FmsItemTable';
import { storageAdapter } from '../../services/storageAdapter';
import { isUserResponsibleForStage, getStageDefinitionsForFlowType } from '../../services/stageAssignment';

interface FmsIndividualViewProps {
  flow: FmsInstance;
  currentUser: UserProfile;
  onBack: () => void;
  onUpdateFlow?: (updatedFlow: FmsInstance) => void;
  onOpenStageAction?: (flow: FmsInstance, stageIndex: number) => void;
}

export const FmsIndividualView: React.FC<FmsIndividualViewProps> = ({
  flow,
  currentUser,
  onBack,
  onUpdateFlow,
  onOpenStageAction,
}) => {
  const [activeFlow, setActiveFlow] = useState<FmsInstance>(flow);
  const [isStoreTriageOpen, setIsStoreTriageOpen] = useState(false);
  const [isL1ModalOpen, setIsL1ModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<'STAGE_TABLE' | 'LINE_ITEMS' | 'UNIVERSAL_DATA'>('STAGE_TABLE');
  const [previewTableModal, setPreviewTableModal] = useState<{ isOpen: boolean; title: string; items: any[] } | null>(null);

  // Keep activeFlow synced whenever the parent flow prop updates after stage submission
  useEffect(() => {
    setActiveFlow(flow);
  }, [flow.id, flow.currentStageIndex, flow.status, flow.updatedAt]);

  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const isAdmin = isUserAdminOrSuperAdmin(currentUser);

  const allTemplates = useMemo(() => storageAdapter.getAllMasterTemplates(), []);
  const masterTemplate = useMemo(() => allTemplates.find(t => t.templateKey === activeFlow.flowType || t.id === activeFlow.customTemplateId), [allTemplates, activeFlow.flowType, activeFlow.customTemplateId]);

  // Formatting helpers
  const formatDateTime = (isoString?: string) => {
    if (!isoString) return '—';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return isoString;
      return d.toLocaleDateString('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return isoString;
    }
  };

  // Calculate stage SLA delay badge
  const renderSlaBadge = (stage: FmsStageExecution) => {
    if (stage.status === 'Pending') {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400 border border-slate-200 dark:border-slate-700">
          <Clock className="w-3 h-3 text-slate-400" /> Pending Entry
        </span>
      );
    }

    if (stage.status === 'Returned for Revision') {
      const delayHrs = stage.delayHours || stage.timeDelayHours || 0;
      if (delayHrs > 0) {
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
            <Clock className="w-3 h-3 text-amber-600" /> Returned for Revision (+{delayHrs.toFixed(1)}h)
          </span>
        );
      }
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-800 dark:bg-amber-950/50 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <Clock className="w-3 h-3 text-amber-600" /> Returned for Revision (On Time)
        </span>
      );
    }

    if (stage.status === 'In Progress') {
      const isOverdue = stage.plannedTimestamp && new Date(stage.plannedTimestamp).getTime() < Date.now();
      return isOverdue ? (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 dark:bg-rose-950/80 dark:text-rose-300 border border-rose-300 dark:border-rose-800 animate-pulse">
          <AlertTriangle className="w-3 h-3 text-rose-600 dark:text-rose-400" /> Overdue (Active)
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-300 dark:border-amber-800">
          <Clock className="w-3 h-3 text-amber-600 dark:text-amber-400" /> In Progress
        </span>
      );
    }

    // Completed or Done
    const delayHrs = stage.delayHours || stage.timeDelayHours || 0;
    if (delayHrs > 0) {
      return (
        <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-rose-50 text-rose-700 dark:bg-rose-950/50 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
          <AlertTriangle className="w-3 h-3 text-rose-500" /> Delayed +{delayHrs.toFixed(1)}h
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-700 dark:bg-emerald-950/50 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" /> On Time
      </span>
    );
  };

  const handleExportCsv = () => {
    const headers = [
      'Stage #',
      'Stage Name',
      'Assignee (WHO)',
      'Method (HOW)',
      'Planned Time (WHEN)',
      'Actual Time (WHEN)',
      'Status',
      'Delay (Hours)',
      'Evidence/Form Ref',
      'Notes',
    ];
    const rows = activeFlow.stages.map((stage, idx) => [
      idx + 1,
      stage.stageName,
      stage.doerName || stage.assignee,
      stage.how,
      formatDateTime(stage.plannedTimestamp),
      formatDateTime(stage.actualTimestamp),
      stage.status,
      stage.delayHours || 0,
      stage.formResponseRef || stage.evidenceDocumentUrl || '',
      stage.notes || '',
    ]);
    downloadCsv(`FMS_Individual_Report_${activeFlow.indentNo || activeFlow.id}.csv`, headers, rows);
  };

  const handleCompleteTriage = (updatedFlow: FmsInstance) => {
    setActiveFlow(updatedFlow);
    if (onUpdateFlow) onUpdateFlow(updatedFlow);
    setIsStoreTriageOpen(false);
  };

  const handleApproveL1InModal = (csSheet: any, remarks: string) => {
    // Advance L1 Approval stage
    const nextStageIdx = activeFlow.currentStageIndex + 1;
    const nextStages = activeFlow.stages.map((stg, i) => {
      if (i === activeFlow.currentStageIndex) {
        return {
          ...stg,
          status: 'Done' as const,
          actualTimestamp: new Date().toISOString(),
          notes: remarks,
        };
      }
      if (i === nextStageIdx) {
        return {
          ...stg,
          status: 'In Progress' as const,
          stageStartedAt: new Date().toISOString(),
          plannedTimestamp: new Date(Date.now() + (stg.targetDurationHours || 24) * 3600 * 1000).toISOString(),
        };
      }
      return stg;
    });

    const updated: FmsInstance = {
      ...activeFlow,
      currentStageIndex: nextStageIdx,
      stages: nextStages,
      instanceDataPool: {
        ...(activeFlow.instanceDataPool || {}),
        selectedL1Vendor: csSheet.approvedBy,
        csSheetNumber: csSheet.csNumber,
        l1ApprovalRemarks: remarks,
      }
    };

    setActiveFlow(updated);
    if (onUpdateFlow) onUpdateFlow(updated);
    setIsL1ModalOpen(false);
  };

  const lineItemsCount = activeFlow.lineItems?.length || 0;
  const storeDispatchItems = activeFlow.lineItems?.filter(i => i.triageAllocation === 'STORE_DISPATCH').length || 0;
  const purchaseItems = activeFlow.lineItems?.filter(i => i.triageAllocation === 'PURCHASE_REQUISITION').length || 0;

  return (
    <div className="w-full bg-white text-slate-900 space-y-6 pb-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-4 md:p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1.5">
          <div className="flex items-center gap-2 text-xs text-slate-500 font-medium">
            <button
              onClick={onBack}
              className="inline-flex items-center gap-1 text-slate-600 hover:text-indigo-600 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to FMS Table</span>
            </button>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="font-semibold text-slate-800">Individual Workflow Page</span>
            <ChevronRight className="w-3 h-3 text-slate-400" />
            <span className="font-mono text-indigo-600 font-bold">
              Indent #{activeFlow.indentNo || activeFlow.requisitionNumber}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              {activeFlow.title || `Requisition & Procurement Workflow #${activeFlow.indentNo}`}
            </h1>
            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full border ${
              activeFlow.status === 'Completed'
                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                : activeFlow.status === 'Awaiting Fulfillment'
                ? 'bg-amber-100 text-amber-800 border-amber-300'
                : 'bg-indigo-100 text-indigo-800 border-indigo-300'
            }`}>
              {activeFlow.status}
            </span>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleExportCsv}
            className="px-3.5 py-2 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors flex items-center gap-1.5 border border-slate-200"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>



          {((activeFlow.stages[activeFlow.currentStageIndex]?.stageName.toLowerCase().includes('l1') || activeFlow.stages[activeFlow.currentStageIndex]?.stageName.toLowerCase().includes('director approval'))) && (
            <button
              onClick={() => setIsL1ModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-slate-950 bg-amber-400 hover:bg-amber-500 rounded-xl shadow-md transition-all flex items-center gap-1.5"
            >
              <Award className="w-4 h-4 text-slate-950" />
              <span>Director L1 CS Approval</span>
            </button>
          )}
        </div>
      </div>

      {/* Summary Kpi Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Card 1: Requisition Overview */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Site &amp; Requisition</span>
            <MapPin className="w-4 h-4 text-indigo-500" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">{activeFlow.siteName || 'RAIPUR CENTRAL'}</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Indent Date: {activeFlow.indentDate || activeFlow.createdAt.slice(0, 10)}
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Priority:</span>
            <span className="font-bold text-rose-600">{activeFlow.priority}</span>
          </div>
        </div>

        {/* Card 2: Line Item Triage Split */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Material Line Triage</span>
            <Layers className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <p className="text-base font-bold text-slate-900">{lineItemsCount} Line Items</p>
            <div className="flex items-center gap-2 mt-1 text-xs">
              <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-medium">
                {storeDispatchItems} Store Stock
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-100 text-amber-800 font-medium">
                {purchaseItems} Purchase
              </span>
            </div>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Pipeline Mode:</span>
            <span className="font-semibold text-indigo-600">Parallel Triage</span>
          </div>
        </div>

        {/* Card 3: SLA Progress & Timestamps */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Stage Progress</span>
            <Clock className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            {activeFlow.status === 'Completed' ? (
              <>
                <p className="text-base font-bold text-emerald-700">
                  All {activeFlow.totalStages} Stages Completed
                </p>
                <p className="text-xs text-slate-500 mt-0.5">Workflow Finished</p>
              </>
            ) : activeFlow.status === 'Awaiting Fulfillment' ? (
              <>
                <p className="text-base font-bold text-amber-700">
                  Awaiting Fulfillment
                </p>
                <p className="text-xs text-amber-600 font-medium mt-0.5">
                  Waiting for child tracks (-DISP / -PUR)
                </p>
              </>
            ) : (
              <>
                <p className="text-base font-bold text-slate-900">
                  Stage {Math.min(activeFlow.currentStageIndex + 1, activeFlow.totalStages)} of {activeFlow.totalStages}
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Active: {activeFlow.stages[activeFlow.currentStageIndex]?.stageName || 'Completed'}
                </p>
              </>
            )}
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Doer/Assignee:</span>
            <span className="font-semibold text-slate-900">
              {activeFlow.stages[activeFlow.currentStageIndex]?.assignee || 'Store/Purchase'}
            </span>
          </div>
        </div>

        {/* Card 4: Total Lead Time Delay */}
        <div className="p-4 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500">Lead Time Variance</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div>
            <p className={`text-base font-black ${
              activeFlow.totalDelayHours > 0 ? 'text-rose-600' : 'text-emerald-600'
            }`}>
              {activeFlow.totalDelayHours > 0 ? `+${activeFlow.totalDelayHours.toFixed(1)} Hours Delay` : '0.0h On Time'}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">
              Calculated against stage target SLA offsets
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">SLA Standard:</span>
            <span className="font-semibold text-slate-700">Target Time</span>
          </div>
        </div>
      </div>

      {/* Navigation View Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab('STAGE_TABLE')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'STAGE_TABLE'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Detailed Stage Breakdown Table (WHAT, WHO, HOW, WHEN)</span>
        </button>

        <button
          onClick={() => setActiveTab('LINE_ITEMS')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'LINE_ITEMS'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Boxes className="w-4 h-4" />
          <span>Line Items &amp; Triage Allocation ({lineItemsCount})</span>
        </button>

        <button
          onClick={() => setActiveTab('UNIVERSAL_DATA')}
          className={`px-4 py-2.5 text-xs font-bold transition-all border-b-2 flex items-center gap-2 ${
            activeTab === 'UNIVERSAL_DATA'
              ? 'border-indigo-600 text-indigo-600'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Zap className="w-4 h-4" />
          <span>Universal Form Inheritance Pool</span>
        </button>
      </div>

      {/* Tab 1: Detailed Connected Stage Breakdown Table */}
      {activeTab === 'STAGE_TABLE' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
          <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <span>FMS Stage Execution Matrix</span>
              <span className="text-xs font-normal text-slate-500">
                (Every stage records actual timestamps upon doer execution and inherits universal form data)
              </span>
            </h3>
            <span className="text-xs font-medium text-slate-500">
              Total Stages: {activeFlow.totalStages}
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-3 px-3 w-10 text-center">#</th>
                  <th className="py-3 px-3 min-w-[160px]">WHAT (Stage Name)</th>
                  <th className="py-3 px-3 min-w-[130px]">WHO (Assignee / Doer)</th>
                  <th className="py-3 px-3 min-w-[200px]">HOW (Method &amp; Checklists)</th>
                  <th className="py-3 px-3 min-w-[150px]">WHEN (Planned)</th>
                  <th className="py-3 px-3 min-w-[150px]">WHEN (Actual)</th>
                  <th className="py-3 px-3 min-w-[120px]">VARIANCE</th>
                  <th className="py-3 px-3 min-w-[160px]">SUBMITTED / INHERITED DATA</th>
                  <th className="py-3 px-3 text-center">ACTION</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {activeFlow.stages.map((stage, idx) => {
                  const isStageDone = stage.status === 'Done' || 
                    stage.status === 'Completed' || 
                    stage.status === 'Skipped' || 
                    Boolean(stage.actualDateTime || stage.actualTimestamp) || 
                    stage.assignee === 'System / Child Workflows' ||
                    (stage.assignee || '').toLowerCase().includes('child workflow');

                  const isActive = idx === activeFlow.currentStageIndex && 
                    !isStageDone && 
                    activeFlow.status !== 'Completed' && 
                    activeFlow.status !== 'Awaiting Fulfillment';

                  const isDone = isStageDone;
                  const stageDef = masterTemplate?.stages[idx] || getStageDefinitionsForFlowType(activeFlow.flowType)[idx];
                  const canExecute = isUserResponsibleForStage(stageDef, stage, currentUser);

                  return (
                    <tr
                      key={stage.stageId || idx}
                      className={`transition-colors ${
                        isActive
                          ? 'bg-indigo-50/70 font-medium'
                          : isStageDone
                          ? 'bg-white'
                          : 'bg-slate-50/40 opacity-80'
                      }`}
                    >
                      <td className="py-3.5 px-3 text-center font-mono font-bold text-slate-500">
                        {stage.stageId?.includes('02B') || stage.stageName?.includes('2B') ? (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-black">
                            2B
                          </span>
                        ) : stage.stageId?.includes('03-FINAL') || stage.stageName?.includes('(Final)') ? (
                          <span className="inline-flex items-center justify-center px-1.5 py-0.5 rounded bg-indigo-100 text-indigo-900 border border-indigo-300 text-[10px] font-black">
                            3 (Final)
                          </span>
                        ) : (
                          idx + 1
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <p className="font-bold text-slate-900">{stage.stageName}</p>
                          {(stage.stageId?.includes('02B') || stage.stageName?.includes('2B')) && (
                            <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                              REVISION LOOP
                            </span>
                          )}
                        </div>
                        {isActive && (
                          <span className="inline-block mt-1 text-[10px] font-bold px-1.5 py-0.5 bg-indigo-600 text-white rounded">
                            CURRENT ACTIVE STAGE
                          </span>
                        )}
                        {stage.remarks && (
                          <p className="text-[11px] text-amber-800 dark:text-amber-400 mt-1 italic">
                            {stage.remarks}
                          </p>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex items-center gap-1.5 font-semibold text-slate-800">
                          <User className="w-3.5 h-3.5 text-slate-400" />
                          <span>{stage.doerName || stage.assignee}</span>
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <p className="text-slate-600 leading-relaxed">{stage.how}</p>
                        {stage.evidenceDocumentUrl && (
                          <a
                            href={stage.evidenceDocumentUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-[11px] text-indigo-600 font-semibold mt-1 hover:underline"
                          >
                            <FileText className="w-3 h-3" />
                            <span>View Proof/Evidence Document</span>
                          </a>
                        )}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-700">
                        {formatDateTime(stage.plannedTimestamp || stage.plannedDateTime)}
                      </td>
                      <td className="py-3.5 px-3 font-mono text-slate-900 font-semibold">
                        {formatDateTime(stage.actualTimestamp || stage.actualDateTime)}
                      </td>
                      <td className="py-3.5 px-3">
                        {renderSlaBadge(stage)}
                      </td>
                      <td className="py-3.5 px-3">
                        {stage.submittedData && Object.keys(stage.submittedData).length > 0 ? (
                          <div className="space-y-1.5">
                            {Object.entries(stage.submittedData)
                              .filter(([k]) => !k.startsWith('_'))
                              .slice(0, 3)
                              .map(([k, rawVal]) => {
                                // Extract / recover real data
                                let v = rawVal;
                                if (typeof v === 'string' && (v.trim().startsWith('[') || v.trim().startsWith('{'))) {
                                  try {
                                    v = JSON.parse(v);
                                  } catch {
                                    // keep raw string
                                  }
                                }

                                // If corrupted [object Object] string, attempt recovery from activeFlow lineItems or instanceDataPool
                                if (typeof v === 'string' && (v === '[object Object]' || v.includes('[object Object]'))) {
                                  if (k.toLowerCase().includes('item') && activeFlow.lineItems && activeFlow.lineItems.length > 0) {
                                    v = activeFlow.lineItems;
                                  } else if (activeFlow.instanceDataPool && activeFlow.instanceDataPool[k]) {
                                    v = activeFlow.instanceDataPool[k];
                                  }
                                }

                                // Check if v represents an array of items (or object with items)
                                const isItemArray = Array.isArray(v);
                                const isItemObject = typeof v === 'object' && v !== null && (
                                  Array.isArray((v as any).items) ||
                                  (k.toLowerCase().includes('item') && Object.values(v).every((sub) => typeof sub === 'object' && sub !== null))
                                );

                                const candidateItems: any[] | null = isItemArray
                                  ? v
                                  : isItemObject
                                  ? (Array.isArray((v as any).items) ? (v as any).items : Object.values(v))
                                  : null;

                                if (candidateItems && candidateItems.length > 0) {
                                  const itemNames = candidateItems
                                    .map((i: any) => i.itemDescription || i.item_description || i.description || i.name)
                                    .filter(Boolean);
                                  return (
                                    <div key={k} className="text-[11px] space-y-0.5">
                                      <button
                                        type="button"
                                        onClick={() => setPreviewTableModal({ isOpen: true, title: `${stage.stageName} - ${k}`, items: candidateItems })}
                                        className="text-indigo-600 hover:text-indigo-800 font-bold inline-flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded cursor-pointer transition-colors shadow-2xs"
                                        title="Click to view full items table"
                                      >
                                        <Layers className="w-3 h-3 text-indigo-600" />
                                        <span>{candidateItems.length} item{candidateItems.length === 1 ? '' : 's'} (View Data Table)</span>
                                      </button>
                                      {itemNames.length > 0 && (
                                        <p className="text-[10px] text-slate-700 font-medium truncate max-w-[220px]" title={itemNames.join(', ')}>
                                          {itemNames.slice(0, 3).join(', ')}{itemNames.length > 3 ? ` (+${itemNames.length - 3} more)` : ''}
                                        </p>
                                      )}
                                    </div>
                                  );
                                }

                                if (typeof v === 'object' && v !== null) {
                                  return (
                                    <div key={k} className="text-[11px]">
                                      <span className="text-slate-400 font-medium">{k}: </span>
                                      <span className="font-semibold text-slate-800">
                                        {Object.entries(v)
                                          .map(([sk, sv]) => `${sk}: ${typeof sv === 'object' ? JSON.stringify(sv) : sv}`)
                                          .join(' • ')}
                                      </span>
                                    </div>
                                  );
                                }

                                const displayStr = String(v ?? '');
                                return (
                                  <div key={k} className="text-[11px] truncate max-w-[200px]" title={displayStr}>
                                    <span className="text-slate-400 font-medium">{k}: </span>
                                    <span className="font-semibold text-slate-800">
                                      {displayStr === '[object Object]' ? '—' : displayStr}
                                    </span>
                                  </div>
                                );
                              })}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Inherited from Master Data</span>
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        {((activeFlow.flowType === 'CHECK_STOCK' || activeFlow.templateKey === 'CHECK_STOCK') && !activeFlow.indentNo?.endsWith('-PUR') && !activeFlow.flowId?.includes('-PUR') && (idx === 1 || stage.stageId === 'STG-STK-02')) ? (
                          isStageDone || activeFlow.status === 'Awaiting Fulfillment' || activeFlow.status === 'Completed' ? (
                            <button
                              type="button"
                              onClick={() => setIsStoreTriageOpen(true)}
                              className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-300 shadow-2xs transition-all flex items-center gap-1 mx-auto cursor-pointer"
                              title="Stage complete - View Store Triage Breakdown"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-500" />
                              <span>View Details</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setIsStoreTriageOpen(true)}
                              className={`px-3 py-1.5 rounded-lg font-bold text-[11px] transition-all flex items-center gap-1 mx-auto cursor-pointer ${
                                isActive
                                  ? 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                                  : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 shadow-2xs'
                              }`}
                            >
                              <span>Execute Stage</span>
                            </button>
                          )
                        ) : isActive && onOpenStageAction ? (
                          canExecute ? (
                            <button
                              type="button"
                              onClick={() => onOpenStageAction(activeFlow, idx)}
                              className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-[11px] shadow-xs transition-all flex items-center gap-1 mx-auto cursor-pointer"
                            >
                              <span>Execute Stage</span>
                            </button>
                          ) : (
                            <button
                              type="button"
                              disabled
                              className="px-3 py-1.5 bg-slate-100 text-slate-400 rounded-lg font-medium text-[11px] border border-slate-200 cursor-not-allowed mx-auto flex items-center gap-1"
                            >
                              <Eye className="w-3.5 h-3.5 text-slate-400" />
                              <span>View Details</span>
                            </button>
                          )
                        ) : isStageDone ? (
                          <button
                            type="button"
                            onClick={() => {
                              if ((activeFlow.flowType === 'CHECK_STOCK' || activeFlow.templateKey === 'CHECK_STOCK') && idx === 1) {
                                setIsStoreTriageOpen(true);
                              } else if (onOpenStageAction) {
                                onOpenStageAction(activeFlow, idx);
                              }
                            }}
                            className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-bold text-[11px] border border-slate-300 shadow-2xs transition-all flex items-center gap-1 mx-auto cursor-pointer"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>View Details</span>
                          </button>
                        ) : null}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 2: Line Items Breakdown & Triage Status */}
      {activeTab === 'LINE_ITEMS' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Requisition Material Breakdown
              </h3>
              <p className="text-xs text-slate-500">
                Individual items listed on physical indent slip with triage allocation
              </p>
            </div>
            {activeFlow.currentStageIndex === 1 && (activeFlow.flowType === 'CHECK_STOCK' || activeFlow.templateKey === 'CHECK_STOCK') && !activeFlow.indentNo?.endsWith('-PUR') && (
              <button
                onClick={() => setIsStoreTriageOpen(true)}
                className="px-3.5 py-1.5 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs"
              >
                Modify Triage Split
              </button>
            )}
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">#</th>
                  <th className="py-2.5 px-3">Item Description</th>
                  <th className="py-2.5 px-3 text-center">Requested Qty</th>
                  <th className="py-2.5 px-3 text-center">Triage Allocation</th>
                  <th className="py-2.5 px-3 text-center">Store Qty</th>
                  <th className="py-2.5 px-3 text-center">Purchase Qty</th>
                  <th className="py-2.5 px-3">Awarded Vendor / L1 Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {(activeFlow.lineItems || []).map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50">
                    <td className="py-3 px-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3 font-semibold text-slate-900">
                      {item.itemDescription}
                    </td>
                    <td className="py-3 px-3 text-center font-bold">
                      {item.qty} {item.unit}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold text-[11px] ${
                        item.triageAllocation === 'STORE_DISPATCH'
                          ? 'bg-emerald-100 text-emerald-800'
                          : item.triageAllocation === 'PURCHASE_REQUISITION'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}>
                        {item.triageAllocation || 'PURCHASE_REQUISITION'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-emerald-600">
                      {item.triageAllocation === 'STORE_DISPATCH' ? `${item.qty} ${item.unit}` : '0'}
                    </td>
                    <td className="py-3 px-3 text-center font-medium text-amber-600">
                      {item.purchaseQtyRequired ?? item.qty} {item.unit}
                    </td>
                    <td className="py-3 px-3 font-semibold text-slate-800">
                      {item.selectedL1Vendor ? `${item.selectedL1Vendor} (₹${item.selectedL1Amount || '0'})` : 'Quotation Pending'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Universal Form Data Inheritance Pool */}
      {activeTab === 'UNIVERSAL_DATA' && (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-xs p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Zap className="w-4 h-4 text-amber-500" />
                <span>Instance Data Cascade / Shared Data Pool</span>
              </h3>
              <p className="text-xs text-slate-500">
                Form values entered in earlier stages become universally accessible to all downstream forms automatically.
              </p>
            </div>
            <span className="text-xs font-mono px-2.5 py-1 bg-amber-50 text-amber-700 rounded-lg border border-amber-200">
              Universal Shared State Active
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Indent Details</span>
              <p className="font-semibold text-slate-900">Indent No: #{activeFlow.indentNo}</p>
              <p className="text-slate-600">Site: {activeFlow.siteName}</p>
              <p className="text-slate-600">Priority: {activeFlow.priority}</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">Triage Results</span>
              <p className="font-semibold text-slate-900">Store Dispatch Items: {storeDispatchItems}</p>
              <p className="text-slate-600">Purchase Items: {purchaseItems}</p>
              <p className="text-slate-600">Total Line Items: {lineItemsCount}</p>
            </div>

            <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-1.5">
              <span className="font-bold text-slate-500 uppercase tracking-wider text-[10px]">L1 &amp; Banking Details</span>
              <p className="font-semibold text-slate-900">
                Selected Vendor: {activeFlow.instanceDataPool?.selectedL1Vendor || activeFlow.vendorName || 'Not Assigned Yet'}
              </p>
              <p className="text-slate-600">
                Payment Mode: {activeFlow.paymentMode || 'BANK_TRANSFER'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Store Triage Modal */}
      {isStoreTriageOpen && (
        <StoreTriageModal
          flow={activeFlow}
          currentUser={currentUser}
          readOnly={
            activeFlow.stages[1]?.status === 'Done' || 
            activeFlow.stages[1]?.status === 'Completed' || 
            activeFlow.stages[1]?.status === 'Skipped' || 
            activeFlow.status === 'Awaiting Fulfillment' || 
            activeFlow.status === 'Completed' ||
            Boolean(activeFlow.stages[1]?.actualDateTime || activeFlow.stages[1]?.actualTimestamp) ||
            activeFlow.stages[1]?.assignee === 'System / Child Workflows'
          }
          onClose={() => setIsStoreTriageOpen(false)}
          onCompleteTriage={handleCompleteTriage}
        />
      )}

      {/* Embedded L1 Director Approval Modal */}
      {isL1ModalOpen && (
        <EmbeddedL1ApprovalModal
          isOpen={isL1ModalOpen}
          flow={activeFlow}
          stageIndex={activeFlow.currentStageIndex}
          csSheet={null}
          currentUser={currentUser}
          onClose={() => setIsL1ModalOpen(false)}
          onApproveL1={handleApproveL1InModal}
          onReturnToPurchaser={(updatedFlow) => {
            setActiveFlow(updatedFlow);
            if (onUpdateFlow) onUpdateFlow(updatedFlow);
            setIsL1ModalOpen(false);
          }}
        />
      )}

      {/* Items Table Viewer Modal Dialog */}
      {previewTableModal && previewTableModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[85vh] shadow-2xl border border-slate-200 flex flex-col overflow-hidden animate-in zoom-in-95">
            <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 text-indigo-700 flex items-center justify-center font-bold">
                  <Layers className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="font-black text-sm text-slate-900">{previewTableModal.title}</h4>
                  <p className="text-[11px] text-slate-500">
                    {previewTableModal.items.length} itemized row{previewTableModal.items.length === 1 ? '' : 's'} recorded
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setPreviewTableModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-200 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-5 overflow-y-auto">
              <FmsItemTable items={previewTableModal.items} />
            </div>

            <div className="px-5 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                type="button"
                onClick={() => setPreviewTableModal(null)}
                className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
