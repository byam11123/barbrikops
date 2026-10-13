import React, { useState, useEffect } from 'react';
import { 
  X, 
  GitBranch, 
  Clock, 
  CheckCircle2, 
  AlertTriangle, 
  ExternalLink, 
  Calendar, 
  MapPin, 
  User, 
  Eye, 
  Boxes, 
  CreditCard, 
  ShoppingCart, 
  Truck, 
  PackageCheck, 
  FileText, 
  UserCheck, 
  Wrench, 
  FileSpreadsheet, 
  Edit3, 
  Save, 
  Paperclip,
  Activity,
  CheckCircle,
  FileCheck,
  ShieldCheck,
  Building2,
  Hash,
  Trash2,
  Download,
  ChevronDown,
  ChevronUp,
  Layers,
  Search,
  Lock
} from 'lucide-react';
import { FmsInstance, UserProfile, Priority, FmsStageFieldConfig, isUserSuperAdmin, isUserAdminOrSuperAdmin, getUserModulePermission } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { downloadCsv } from '../../utils/csvExporter';
import { FilePreviewModal } from '../common/FilePreviewModal';
import { CloseFmsModal } from './CloseFmsModal';
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
  FMS_DPR_REPORTING_STAGES,
  USERS 
} from '../../data/initialData';
import { isUserResponsibleForStage } from '../../services/stageAssignment';
import { getStageDelayHours, getFlowTotalDelay, formatDelayVariance } from './FmsPipeline';

interface FmsDetailModalProps {
  flow: FmsInstance | null;
  currentUser: UserProfile;
  onClose: () => void;
  onUpdateFlow?: (flow: FmsInstance) => void;
  onDeleteFlow?: (flowId: string) => void;
  allFlows?: FmsInstance[];
  onSelectFlow?: (flow: FmsInstance) => void;
}

export const FmsDetailModal: React.FC<FmsDetailModalProps> = ({ 
  flow, 
  currentUser, 
  onClose, 
  onUpdateFlow, 
  onDeleteFlow,
  allFlows,
  onSelectFlow 
}) => {
  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const canDelete = isSuperAdmin || isUserAdminOrSuperAdmin(currentUser) || getUserModulePermission(currentUser, 'fms').canDelete;
  const [modalStageFilter, setModalStageFilter] = useState<'MY_STAGES' | 'ALL_STAGES'>('ALL_STAGES');
  const [isEditing, setIsEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [expandedStageId, setExpandedStageId] = useState<string | null>(null);
  const [stageSearchQuery, setStageSearchQuery] = useState('');
  const [editSiteName, setEditSiteName] = useState(flow?.siteName || '');
  const [editPriority, setEditPriority] = useState<Priority>(flow?.priority || 'Normal');
  const [editRequisition, setEditRequisition] = useState(flow?.requisitionNumber || flow?.indentNo || '');
  const [editVendorName, setEditVendorName] = useState(flow?.vendorName || '');
  const [editPoAmount, setEditPoAmount] = useState(String(flow?.poAmount || ''));
  const [editRemarks, setEditRemarks] = useState(flow?.remarks || '');
  const [editActiveAssignee, setEditActiveAssignee] = useState(flow ? flow.stages[flow.currentStageIndex]?.assignee || '' : '');
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);
  const [showCloseModal, setShowCloseModal] = useState(false);

  useEffect(() => {
    if (flow) {
      setEditSiteName(flow.siteName || '');
      setEditPriority(flow.priority || 'Normal');
      setEditRequisition(flow.requisitionNumber || flow.indentNo || '');
      setEditVendorName(flow.vendorName || '');
      setEditPoAmount(flow.poAmount !== undefined ? String(flow.poAmount) : '');
      setEditRemarks(flow.remarks || '');
      setEditActiveAssignee(flow.stages[flow.currentStageIndex]?.assignee || '');
    }
  }, [flow?.id, isEditing]);

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!flow || !onUpdateFlow) return;

    const stagesCopy = [...flow.stages];
    if (stagesCopy[flow.currentStageIndex] && editActiveAssignee) {
      stagesCopy[flow.currentStageIndex] = {
        ...stagesCopy[flow.currentStageIndex],
        assignee: editActiveAssignee,
      };
    }

    const updatedFlow: FmsInstance = {
      ...flow,
      siteName: editSiteName,
      priority: editPriority,
      requisitionNumber: editRequisition,
      indentNo: editRequisition,
      vendorName: editVendorName || flow.vendorName,
      poAmount: editPoAmount ? parseFloat(editPoAmount) || flow.poAmount : flow.poAmount,
      remarks: editRemarks,
      stages: stagesCopy,
      updatedAt: new Date().toLocaleString('en-GB'),
    };

    onUpdateFlow(updatedFlow);
    setIsEditing(false);
  };

  if (!flow) return null;

  const customTemplateForFlow = flow.customTemplateId
    ? storageAdapter.getAllMasterTemplates().find((t) => t.id === flow.customTemplateId || t.templateKey === flow.flowType)
    : storageAdapter.getAllMasterTemplates().find((t) => t.templateKey === flow.flowType);

  const activeStageDefs = customTemplateForFlow
    ? customTemplateForFlow.stages.map((stg, sIdx) => ({
        stageId: stg.stageId,
        stageNumber: sIdx + 1,
        name: stg.stageName,
        what: stg.stageName,
        whoRole: stg.whoRole || 'ASSIGNED_ROLE',
        whoDefaultAssignee: stg.whoDefaultAssignee || 'Assignee',
        howChannel: stg.howChannel || 'IN-APP FORM',
        formUrl: stg.howChannel?.startsWith('http') ? stg.howChannel : undefined,
        slaHours: stg.slaHours || 4,
        isCheckpoint: stg.logic?.gatewayType === 'CONDITIONAL_JUMP',
        hasYesNoDecision: stg.logic?.gatewayType === 'CONDITIONAL_JUMP',
        fields: stg.fields,
      }))
    : flow.stages && flow.stages.length > 0 && !['CHECK_STOCK', 'PO_TO_PAYMENT', 'PURCHASE_TO_STORE_DISPATCH', 'STORE_TO_SITE_DISPATCH', 'PAYMENT_TO_DISPATCH', 'SITE_RECEIVE', 'ACCOUNTS_INVOICE_COLLECTION', 'HR_ATTENDANCE_PAYMENT', 'BREAKDOWN_REPORTING', 'EQUIPMENT_PART_REPAIR', 'DPR_REPORTING', 'INDENT_PURCHASE'].includes(flow.flowType)
    ? flow.stages.map((stg, sIdx) => ({
        stageId: stg.stageId,
        stageNumber: sIdx + 1,
        name: stg.stageName,
        what: stg.stageName,
        whoRole: 'ASSIGNED_ROLE',
        whoDefaultAssignee: stg.assignee || 'Assignee',
        howChannel: stg.how || 'IN-APP FORM',
        formUrl: stg.how?.startsWith('http') ? stg.how : undefined,
        slaHours: 4,
        isCheckpoint: stg.logic?.gatewayType === 'CONDITIONAL_JUMP',
        hasYesNoDecision: stg.logic?.gatewayType === 'CONDITIONAL_JUMP',
        fields: stg.fields,
      }))
    : flow.flowType === 'CHECK_STOCK'
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
    : flow.flowType === 'EQUIPMENT_PART_REPAIR'
    ? FMS_EQUIPMENT_PART_REPAIR_STAGES
    : flow.flowType === 'DPR_REPORTING'
    ? FMS_DPR_REPORTING_STAGES
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

  const filteredDisplayedStages = displayedStages.filter(({ stage }) => {
    if (!stageSearchQuery.trim()) return true;
    const q = stageSearchQuery.toLowerCase();
    const matchesName = stage.stageName.toLowerCase().includes(q);
    const matchesAssignee = stage.assignee?.toLowerCase().includes(q);
    const matchesStatus = stage.status.toLowerCase().includes(q);
    const matchesData = stage.submittedData ? JSON.stringify(stage.submittedData).toLowerCase().includes(q) : false;
    return matchesName || matchesAssignee || matchesStatus || matchesData;
  });

  const handleExportStageReport = () => {
    if (!flow) return;
    const headers = [
      'Flow ID',
      'Ref Identifier',
      'Site Name',
      'Vendor Name',
      'PO Amount',
      'Stage Number',
      'Stage Name',
      'Assignee',
      'Status',
      'Planned Date/Time',
      'Actual Date/Time',
      'Delay Variance',
      'Decision Value',
      'Submitted Data'
    ];

    const rows = flow.stages.map((stage, idx) => {
      const stgDelayHrs = (typeof stage.timeDelayHours === 'number' && stage.timeDelayHours > 0)
        ? stage.timeDelayHours
        : (typeof stage.delayHours === 'number' && stage.delayHours > 0)
        ? stage.delayHours
        : getStageDelayHours(stage, stage.plannedDateTime || flow.indentDate);

      const delayStr = stgDelayHrs > 0 ? formatDelayVariance(stgDelayHrs) : 'On Time';

      const submittedStr = stage.submittedData
        ? Object.entries(stage.submittedData)
            .filter(([k]) => !k.startsWith('_'))
            .map(([k, v]) => `${k}: ${v}`)
            .join(' | ')
        : 'None';

      return [
        flow.flowId,
        flow.requisitionNumber || flow.indentNo || '—',
        flow.siteName || '—',
        flow.vendorName || '—',
        flow.poAmount !== undefined ? `₹${flow.poAmount}` : '—',
        idx + 1,
        stage.stageName,
        stage.assignee || 'Unassigned',
        stage.status,
        stage.plannedDateTime || '—',
        stage.actualDateTime || '—',
        delayStr,
        stage.decisionValue || '—',
        submittedStr
      ];
    });

    const safeFilename = `fms_stage_report_${flow.flowId.replace(/[^a-zA-Z0-9_-]/g, '_')}_${new Date().toISOString().slice(0, 10)}.csv`;
    downloadCsv(safeFilename, headers, rows);
  };

  const totalFlowDelayHrs = getFlowTotalDelay(flow);
  const isFlowDelayed = totalFlowDelayHrs > 0;

  const stagesWithSubmittedData = flow.stages
    .map((stg, idx) => ({ stage: stg, idx }))
    .filter(({ stage }) => stage.submittedData && Object.keys(stage.submittedData).filter((k) => !k.startsWith('_')).length > 0);

  const allSubmittedFields = flow.stages.flatMap((stg, sIdx) => {
    if (!stg.submittedData) return [];
    return Object.entries(stg.submittedData)
      .filter(([k]) => !k.startsWith('_'))
      .map(([k, v]) => ({
        stageName: stg.stageName,
        stageNumber: sIdx + 1,
        key: k,
        value: v,
      }));
  });

  const completedStagesCount = flow.stages.filter((s) => s.status === 'Done' || s.status === 'Skipped').length;

  const getFlowTypeDisplayName = (flowType: string): string => {
    switch (flowType) {
      case 'CHECK_STOCK': return 'Store Check Stock Flow';
      case 'PO_TO_PAYMENT': return 'Accounts PO to Payment Flow';
      case 'STORE_TO_SITE_DISPATCH': return 'Store to Site Dispatch Flow';
      case 'PURCHASE_TO_STORE_DISPATCH': return 'Purchase to Store Dispatch Flow';
      case 'PAYMENT_TO_DISPATCH': return 'Payment to Dispatch Flow';
      case 'SITE_RECEIVE': return 'Site Receive Flow';
      case 'ACCOUNTS_INVOICE_COLLECTION': return 'Accounts Invoice Collection Flow';
      case 'HR_ATTENDANCE_PAYMENT': return 'Labour Attendance & Payment Flow';
      case 'BREAKDOWN_REPORTING': return 'Machine Breakdown Flow';
      case 'EQUIPMENT_PART_REPAIR': return 'Equipment Part Repair Flow';
      case 'DPR_REPORTING': return 'Daily Progress Report Flow';
      case 'INDENT_PURCHASE':
      default:
        return 'Purchase Indent to PO Flow';
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-5xl w-full max-h-[96vh] sm:max-h-[92vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3.5 min-w-0">
            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 shadow-2xs border ${
              flow.flowType === 'CHECK_STOCK'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : flow.flowType === 'PO_TO_PAYMENT'
                ? 'bg-purple-50 text-purple-700 border-purple-200'
                : flow.flowType === 'STORE_TO_SITE_DISPATCH'
                ? 'bg-cyan-50 text-cyan-700 border-cyan-200'
                : flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' || flow.flowType === 'PAYMENT_TO_DISPATCH'
                ? 'bg-amber-50 text-amber-700 border-amber-200'
                : flow.flowType === 'SITE_RECEIVE'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : flow.flowType === 'ACCOUNTS_INVOICE_COLLECTION'
                ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                : flow.flowType === 'HR_ATTENDANCE_PAYMENT'
                ? 'bg-teal-50 text-teal-700 border-teal-200'
                : flow.flowType === 'BREAKDOWN_REPORTING'
                ? 'bg-orange-50 text-orange-700 border-orange-200'
                : flow.flowType === 'EQUIPMENT_PART_REPAIR'
                ? 'bg-blue-50 text-blue-700 border-blue-200'
                : flow.flowType === 'DPR_REPORTING'
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                : 'bg-indigo-50 text-indigo-700 border-indigo-200'
            }`}>
              {flow.flowType === 'CHECK_STOCK' ? (
                <Boxes className="w-5 h-5" />
              ) : flow.flowType === 'PO_TO_PAYMENT' ? (
                <CreditCard className="w-5 h-5" />
              ) : flow.flowType === 'STORE_TO_SITE_DISPATCH' || flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' || flow.flowType === 'PAYMENT_TO_DISPATCH' ? (
                <Truck className="w-5 h-5" />
              ) : flow.flowType === 'SITE_RECEIVE' ? (
                <PackageCheck className="w-5 h-5" />
              ) : flow.flowType === 'ACCOUNTS_INVOICE_COLLECTION' ? (
                <FileText className="w-5 h-5" />
              ) : flow.flowType === 'HR_ATTENDANCE_PAYMENT' ? (
                <UserCheck className="w-5 h-5" />
              ) : flow.flowType === 'BREAKDOWN_REPORTING' ? (
                <Wrench className="w-5 h-5" />
              ) : flow.flowType === 'EQUIPMENT_PART_REPAIR' ? (
                <Wrench className="w-5 h-5" />
              ) : flow.flowType === 'DPR_REPORTING' ? (
                <FileSpreadsheet className="w-5 h-5" />
              ) : (
                <GitBranch className="w-5 h-5" />
              )}
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="font-bold text-slate-900 text-base sm:text-lg leading-snug">
                  {flow.flowType === 'CHECK_STOCK'
                    ? `Stock Check: ${flow.requisitionNumber || `Req #${flow.indentNo}`}`
                    : flow.flowType === 'PO_TO_PAYMENT'
                    ? `PO: ${flow.poNumber || flow.indentNo} (${flow.vendorName || 'Accounts Payment'})`
                    : flow.flowType === 'STORE_TO_SITE_DISPATCH'
                    ? `Stock to Site Dispatch: Req #${flow.requisitionNumber || flow.indentNo}`
                    : flow.flowType === 'PURCHASE_TO_STORE_DISPATCH'
                    ? `Store Dispatch: Indent #${flow.indentNo} (Req #${flow.requisitionNumber || flow.indentNo})`
                    : flow.flowType === 'PAYMENT_TO_DISPATCH'
                    ? `Dispatch: PO #${flow.poNumber || flow.indentNo} (${flow.vendorName || 'Material Dispatch'})`
                    : flow.flowType === 'SITE_RECEIVE'
                    ? `Site Inward: ${flow.requisitionNumber || `MRN #${flow.indentNo}`}`
                    : flow.flowType === 'ACCOUNTS_INVOICE_COLLECTION'
                    ? `Invoice Collection: PO #${flow.poNumber || flow.indentNo} (${flow.vendorName || 'Accounts'})`
                    : flow.flowType === 'HR_ATTENDANCE_PAYMENT'
                    ? `Labour Attendance & Payment: ${flow.siteName}`
                    : flow.flowType === 'BREAKDOWN_REPORTING'
                    ? `Machine Breakdown: ${flow.machineName || flow.indentNo}`
                    : flow.flowType === 'EQUIPMENT_PART_REPAIR'
                    ? `Equipment Part Repair: ${flow.partEquipmentName || flow.indentNo}`
                    : flow.flowType === 'DPR_REPORTING'
                    ? `Daily Progress Report (DPR): ${flow.siteName}`
                    : `FMS Indent #${flow.indentNo}`}
                </h3>
                <span className="text-xs font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
                  Detailed Audit Trail
                </span>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  flow.isClosed || flow.status === 'CLOSED'
                    ? 'bg-slate-900 text-emerald-400 border-slate-800'
                    : flow.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : flow.status === 'In Progress'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {flow.isClosed || flow.status === 'CLOSED' ? 'CLOSED 🔒' : flow.status}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  flow.priority === 'Urgent'
                    ? 'bg-red-50 text-red-700 border-red-200'
                    : flow.priority === 'Low'
                    ? 'bg-slate-50 text-slate-600 border-slate-200'
                    : 'bg-blue-50 text-blue-700 border-blue-200'
                }`}>
                  {flow.priority} Priority
                </span>
              </div>
              <div className="flex items-center gap-3 text-xs text-slate-500 mt-1 flex-wrap">
                <span className="font-mono text-slate-600 font-semibold bg-slate-100 px-1.5 py-0.5 rounded text-[11px]">
                  ID: {flow.flowId}
                </span>
                <span className="flex items-center gap-1 font-medium text-slate-600">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  {flow.siteName}
                </span>
                {flow.indentDate && (
                  <span className="flex items-center gap-1 font-medium text-slate-600">
                    <Calendar className="w-3.5 h-3.5 text-slate-400" />
                    {flow.indentDate}
                  </span>
                )}
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {allFlows && allFlows.length > 1 && onSelectFlow && (
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg border border-slate-200">
                <span className="text-[11px] font-semibold text-slate-500 pl-1 hidden sm:inline">Switch FMS:</span>
                <select
                  value={flow.id}
                  onChange={(e) => {
                    const target = allFlows.find((f) => f.id === e.target.value);
                    if (target) onSelectFlow(target);
                  }}
                  className="bg-white text-xs font-semibold text-slate-800 border border-slate-300 rounded-md px-2 py-1 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer max-w-[180px] truncate"
                >
                  {allFlows.map((f) => (
                    <option key={f.id} value={f.id}>
                      {f.flowId} - {f.siteName} ({f.status})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <button
              type="button"
              onClick={handleExportStageReport}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 shadow-2xs transition-colors cursor-pointer"
              title="Download stage records for this FMS in Excel/CSV format"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700" />
              <span>Export Stage Excel</span>
            </button>

            {isSuperAdmin && !flow.isClosed && flow.status !== 'CLOSED' && (
              <button
                type="button"
                onClick={() => setShowCloseModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-slate-900 hover:bg-slate-800 text-emerald-400 border border-slate-800 shadow-2xs transition-colors cursor-pointer"
                title="Close this FMS with formal verification remark (SuperAdmin only)"
              >
                <Lock className="w-3.5 h-3.5 text-emerald-400" />
                <span>Close FMS</span>
              </button>
            )}

            {onUpdateFlow && (
              <button
                type="button"
                onClick={() => setIsEditing(!isEditing)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer border ${
                  isEditing 
                    ? 'bg-slate-200 text-slate-800 border-slate-300' 
                    : 'bg-white hover:bg-slate-100 text-indigo-700 border-indigo-200 shadow-2xs'
                }`}
                title="Edit workflow details and active stage assignee"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>{isEditing ? 'Cancel Edit' : 'Edit Flow Details'}</span>
              </button>
            )}
            {canDelete && (
              confirmDelete ? (
                <div className="flex items-center gap-1 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
                  <span className="text-xs font-bold text-rose-700">Delete record?</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (onDeleteFlow) {
                        onDeleteFlow(flow.id);
                      } else {
                        storageAdapter.deleteFmsFlow(flow.id, currentUser);
                      }
                      onClose();
                    }}
                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-xs font-bold cursor-pointer"
                  >
                    Yes
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-2 py-0.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-medium cursor-pointer"
                  >
                    No
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 shadow-2xs transition-colors cursor-pointer"
                  title="Delete FMS Record"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-600" />
                  <span>Delete Record</span>
                </button>
              )
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-5 bg-slate-50/40">
          {/* Closure Audit Sign-Off Banner */}
          {(flow.isClosed || flow.status === 'CLOSED') && (
            <div className="p-4 bg-slate-900 text-white rounded-xl border border-slate-800 shadow-sm flex items-start gap-3.5">
              <div className="p-2 bg-emerald-500/20 text-emerald-400 rounded-lg shrink-0 border border-emerald-500/30">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1 text-xs w-full">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="font-bold text-sm text-emerald-400">Workflow Verified & Closed</span>
                  <span className="px-2.5 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">CLOSED</span>
                </div>
                <p className="text-slate-300">
                  Closed By: <span className="font-semibold text-white">{flow.closedBy || 'Super Administrator'}</span> on <span className="font-mono text-slate-200">{flow.closedAt}</span>
                </p>
                {flow.closureRemark && (
                  <div className="mt-2 pt-2 border-t border-slate-800 text-slate-300">
                    <span className="font-semibold text-slate-200">Closure Verification Remark: </span>
                    <span className="italic text-emerald-200">"{flow.closureRemark}"</span>
                  </div>
                )}
              </div>
            </div>
          )}
          {/* Live Instance Editing Form */}
          {isEditing && (
            <form onSubmit={handleSaveEdit} className="p-4 bg-white border border-indigo-200 rounded-xl space-y-3.5 shadow-xs animate-in fade-in duration-150">
              <div className="flex items-center justify-between pb-2 border-b border-indigo-100">
                <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                  <Edit3 className="w-4 h-4 text-indigo-600" />
                  Edit Live Workflow Instance
                </span>
                <span className="text-[10px] text-slate-500">Updating live operational parameters</span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Reference / Indent No.</label>
                  <input
                    type="text"
                    value={editRequisition}
                    onChange={(e) => setEditRequisition(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Site Location</label>
                  <select
                    value={editSiteName}
                    onChange={(e) => setEditSiteName(e.target.value)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="SILADEHI">SILADEHI Site</option>
                    <option value="BIJETALA">BIJETALA Site</option>
                    <option value="RAIPUR">RAIPUR Office</option>
                    <option value="Raipur Office">Raipur Office</option>
                    <option value="Raipur Workshop">Raipur Workshop</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Priority</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as Priority)}
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  >
                    <option value="Urgent">Urgent</option>
                    <option value="Normal">Normal</option>
                    <option value="Low">Low</option>
                  </select>
                </div>

                {flow.flowType === 'PO_TO_PAYMENT' && (
                  <>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">Vendor Name</label>
                      <input
                        type="text"
                        value={editVendorName}
                        onChange={(e) => setEditVendorName(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-slate-700 mb-1">PO Amount (₹)</label>
                      <input
                        type="number"
                        value={editPoAmount}
                        onChange={(e) => setEditPoAmount(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </>
                )}

                {flow.status === 'In Progress' && flow.stages[flow.currentStageIndex] && (
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                      Active Stage Assignee (Stg {flow.currentStageIndex + 1})
                    </label>
                    <select
                      value={editActiveAssignee}
                      onChange={(e) => setEditActiveAssignee(e.target.value)}
                      className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                    >
                      {USERS.map((u) => (
                        <option key={u.userId} value={u.name}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="sm:col-span-3">
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">Operational Remarks</label>
                  <input
                    type="text"
                    value={editRemarks}
                    onChange={(e) => setEditRemarks(e.target.value)}
                    placeholder="Enter operational notes or reason for edit..."
                    className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-indigo-100">
                <button
                  type="button"
                  onClick={() => setIsEditing(false)}
                  className="px-3 py-1.5 bg-white border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-semibold rounded-lg cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-lg shadow-2xs flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save Changes</span>
                </button>
              </div>
            </form>
          )}

          {/* Executive Overview Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                <span>Requisition / Indent</span>
                <FileText className="w-3.5 h-3.5 text-indigo-500" />
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-900 font-mono truncate">
                {flow.requisitionNumber || flow.indentNo || '—'}
              </p>
              <div className="text-[10px] text-slate-400 font-medium">Ref Identifier</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                <span>Site &amp; Location</span>
                <MapPin className="w-3.5 h-3.5 text-blue-500" />
              </div>
              <p className="text-sm sm:text-base font-bold text-slate-900 truncate">
                {flow.siteName || '—'}
              </p>
              <div className="text-[10px] text-slate-400 font-medium">Operational Location</div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                <span>Workflow Progress</span>
                <Activity className="w-3.5 h-3.5 text-emerald-500" />
              </div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-sm sm:text-base font-bold text-slate-900">
                  {completedStagesCount} / {flow.totalStages}
                </span>
                <span className="text-[11px] text-slate-500 font-semibold">Stages Completed</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-indigo-600 h-1.5 rounded-full transition-all" 
                  style={{ width: `${Math.round((completedStagesCount / Math.max(1, flow.totalStages)) * 100)}%` }} 
                />
              </div>
            </div>

            <div className="p-3.5 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
              <div className="flex items-center justify-between text-slate-500 text-[11px] font-medium">
                <span>Recorded Delay</span>
                <Clock className={`w-3.5 h-3.5 ${isFlowDelayed ? 'text-rose-500' : 'text-emerald-500'}`} />
              </div>
              <p className={`text-sm sm:text-base font-bold font-mono truncate ${isFlowDelayed ? 'text-rose-600' : 'text-emerald-700'}`}>
                {isFlowDelayed ? formatDelayVariance(totalFlowDelayHrs) : '0 hrs (On Time)'}
              </p>
              <div className="text-[10px] text-slate-400 font-medium">
                {isFlowDelayed ? `${totalFlowDelayHrs.toFixed(1)} hrs total variance` : 'SLA Target Met'}
              </div>
            </div>
          </div>

          {(flow.vendorName || flow.poAmount !== undefined) && (
            <div className="p-3 rounded-xl bg-white border border-slate-200 shadow-2xs flex items-center justify-between text-xs flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span className="text-slate-500 font-medium">Vendor Partner:</span>
                <span className="font-bold text-slate-900">{flow.vendorName || 'Not Assigned'}</span>
              </div>
              {flow.poAmount !== undefined && (
                <div className="flex items-center gap-1.5 font-bold text-slate-900">
                  <span className="text-slate-500 font-normal">PO Commercial Value:</span>
                  <span className="font-mono text-sm text-indigo-700">₹{Number(flow.poAmount).toLocaleString('en-IN')}</span>
                </div>
              )}
            </div>
          )}

          {/* Audit Trail Dossier — Completed Stage Records */}
          {stagesWithSubmittedData.length > 0 && (
            <div className="space-y-3.5">
                  {stagesWithSubmittedData.map(({ stage, idx }) => {
                    let stageFields = stage.fields || [];
                    if (stageFields.length === 0) {
                      try {
                        const allTemplates = storageAdapter.getAllMasterTemplates();
                        const tpl = allTemplates.find((t) => t.id === flow?.customTemplateId || t.templateKey === flow?.flowType);
                        const stageTpl = tpl?.stages.find((s, sIdx) => s.stageId === stage.stageId || sIdx === idx);
                        if (stageTpl?.fields) {
                          stageFields = stageTpl.fields;
                        }
                      } catch {}
                    }

                    const rawEntries = Object.entries(stage.submittedData || {}).filter(([k]) => !k.startsWith('_'));
                    const entries = [...rawEntries].sort(([keyA], [keyB]) => {
                      const idxA = stageFields.findIndex((f) => f.id === keyA);
                      const idxB = stageFields.findIndex((f) => f.id === keyB);
                      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                      if (idxA !== -1) return -1;
                      if (idxB !== -1) return 1;
                      return 0;
                    });

                    return (
                      <div key={stage.stageId || idx} className="rounded-xl border border-slate-200 overflow-hidden shadow-2xs bg-white">
                        <div className="px-3.5 py-2.5 bg-slate-50/80 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded-md bg-indigo-600 text-white text-[10px] font-bold uppercase tracking-wider">
                              Stage #{idx + 1}
                            </span>
                            <span className="font-bold text-slate-900 text-xs sm:text-sm">
                              {stage.stageName}
                            </span>
                            {stage.assignee && (
                              <span className="text-[11px] text-slate-600 flex items-center gap-1 font-medium bg-white px-2 py-0.5 rounded border border-slate-200">
                                <User className="w-3 h-3 text-slate-400" />
                                {stage.assignee}
                              </span>
                            )}
                          </div>
                          {stage.actualDateTime && (
                            <span className="text-[11px] text-slate-500 font-mono flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-200">
                              <Clock className="w-3 h-3 text-slate-400" />
                              Submitted: {stage.actualDateTime}
                            </span>
                          )}
                        </div>

                        <div className="p-3.5 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 bg-white">
                          {entries.map(([key, val]) => {
                            const matchedField = stageFields.find((f) => f.id === key);
                            let readableLabel = matchedField?.label;

                            if (!readableLabel && flow?.stages) {
                              for (const stg of flow.stages) {
                                const match = stg.fields?.find((f) => f.id === key);
                                if (match?.label) {
                                  readableLabel = match.label;
                                  break;
                                }
                              }
                            }

                            if (!readableLabel) {
                              try {
                                const allTemplates = storageAdapter.getAllMasterTemplates();
                                const tpl = allTemplates.find((t) => t.id === flow?.customTemplateId || t.templateKey === flow?.flowType);
                                if (tpl) {
                                  for (const stg of tpl.stages) {
                                    const match = stg.fields?.find((f) => f.id === key);
                                    if (match?.label) {
                                      readableLabel = match.label;
                                      break;
                                    }
                                  }
                                }
                              } catch {}
                            }

                            if (!readableLabel) {
                              const KNOWN_LABELS: Record<string, string> = {
                                requisitionNumber: 'Requisition / Indent No.',
                                indentNo: 'Indent No.',
                                site: 'Site Name',
                                priority: 'Priority',
                                remarks: 'Remarks',
                                vendorName: 'Vendor Name',
                                poNumber: 'PO Number',
                                poAmount: 'PO Amount (₹)',
                                amountToBePaid: 'Amount to Be Paid (₹)',
                                modeOfPayment: 'Mode of Payment',
                                purposeOfPayment: 'Purpose of Payment',
                                requestedBy: 'Requested By',
                                sheetNo: 'Sheet / Voucher No.',
                                billNoOrPo: 'Bill No. / PO',
                                poUploadLink: 'PO Upload Link',
                                attendanceDate: 'Attendance Date',
                                totalLabourPresent: 'Total Labour Present',
                                totalOtHours: 'Total OT Hours',
                                machineName: 'Machine Name',
                                machineIdNo: 'Machine ID No.',
                                machineMakeModel: 'Make / Model',
                                attendingMechanic: 'Attending Mechanic',
                                mechanicMobileNo: 'Mechanic Mobile No.',
                                partEquipmentName: 'Equipment / Part Name',
                                partSerialNo: 'Part Serial No.',
                                vehiclePlantMachineName: 'Machine / Plant Name',
                                warrantyStatus: 'Warranty Status',
                                dprDate: 'DPR Date',
                                dprPreparedBy: 'DPR Prepared By',
                                status: 'Approval Status',
                                approvedAmount: 'Approved Amount (₹)',
                                approvalRemarks: 'Approval Notes',
                                bankEntryStatus: 'Bank Entry Status',
                                bankAccount: 'Bank Account Debited',
                                entryRemarks: 'Bank Entry Notes',
                                paymentStatus: 'Payment Status',
                                utrNumber: 'Bank UTR / Transaction No.',
                                verified: 'Verification Status',
                                finalRemarks: 'Disbursement Remarks',
                              };
                              if (KNOWN_LABELS[key]) readableLabel = KNOWN_LABELS[key];
                            }

                            if (!readableLabel) {
                              const matchField = key.match(/^field_(\d+)_(\d+)$/i);
                              if (matchField) {
                                readableLabel = `Field #${matchField[2]} (Stage ${matchField[1]})`;
                              } else {
                                readableLabel = key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1').trim();
                              }
                            }

                            const strVal = String(val ?? '');
                            const isDataFile = strVal.startsWith('data:');
                            const isRefFile = strVal.startsWith('[File: ');
                            const isHttpLink = strVal.startsWith('http://') || strVal.startsWith('https://');
                            const isYesNo = strVal === 'Yes' || strVal === 'No';

                            return (
                              <div key={key} className="bg-slate-50/80 hover:bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 transition-colors space-y-1">
                                <div className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider truncate">
                                  {readableLabel}
                                </div>
                                <div className="text-xs break-words font-semibold">
                                  {isDataFile || isRefFile ? (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        setPreviewFile({
                                          url: strVal,
                                          name: isRefFile
                                            ? strVal.replace(/^\[File:\s*/, '').replace(/\]$/, '')
                                            : `${readableLabel} Attachment`,
                                        })
                                      }
                                      className="w-full text-left inline-flex items-center justify-between gap-1.5 px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-lg border border-indigo-200 transition-colors cursor-pointer group"
                                      title="Click to preview file in dialog"
                                    >
                                      <span className="inline-flex items-center gap-1.5 truncate">
                                        <Paperclip className="w-3.5 h-3.5 text-indigo-600 shrink-0 group-hover:rotate-12 transition-transform" />
                                        <span className="truncate">
                                          {isRefFile
                                            ? strVal.replace(/^\[File:\s*/, '').replace(/\]$/, '')
                                            : 'View / Download Attachment'}
                                        </span>
                                      </span>
                                      <Eye className="w-3.5 h-3.5 text-indigo-500 shrink-0 opacity-70 group-hover:opacity-100" />
                                    </button>
                                  ) : isHttpLink ? (
                                    <a 
                                      href={strVal} 
                                      target="_blank" 
                                      rel="noopener noreferrer" 
                                      className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-indigo-600 hover:text-indigo-800 text-xs font-semibold rounded-md border border-slate-200 transition-colors"
                                    >
                                      <span>Open Link</span>
                                      <ExternalLink className="w-3 h-3" />
                                    </a>
                                  ) : isYesNo ? (
                                    <span className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                                      strVal === 'Yes' ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-slate-200 text-slate-700'
                                    }`}>
                                      {strVal}
                                    </span>
                                  ) : (
                                    <span className="text-slate-800 font-bold">
                                      {strVal}
                                    </span>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
            </div>
          )}

          {/* Table Header with Toggle & Search */}
          <div>
            <div className="flex items-center justify-between gap-3 mb-3 flex-wrap">
              <div className="flex items-center gap-3 flex-wrap">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                  Stage Breakdown ({getFlowTypeDisplayName(flow.flowType)})
                </h4>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Filter stage, assignee, fields..."
                    value={stageSearchQuery}
                    onChange={(e) => setStageSearchQuery(e.target.value)}
                    className="pl-8 pr-3 py-1 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              </div>
              <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200">
                <button
                  onClick={() => setModalStageFilter('MY_STAGES')}
                  className={`px-2.5 py-1 text-xs rounded font-semibold transition-all flex items-center gap-1 cursor-pointer ${
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
                  className={`px-2.5 py-1 text-xs rounded font-semibold transition-all flex items-center gap-1 cursor-pointer ${
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

            <div className="border border-slate-200 rounded-xl overflow-x-auto shadow-2xs touch-pan-x overscroll-x-contain [scrollbar-width:thin] [scrollbar-color:#94a3b8_#f1f5f9] [&::-webkit-scrollbar]:h-2 [&::-webkit-scrollbar-track]:bg-slate-100 [&::-webkit-scrollbar-thumb]:bg-slate-300 [&::-webkit-scrollbar-thumb]:rounded-full">
              <table className="w-full min-w-[780px] text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3 w-10">#</th>
                    <th className="py-2.5 px-3">Stage Name</th>
                    <th className="py-2.5 px-3">Assignee / Department</th>
                    <th className="py-2.5 px-3">Planned Date</th>
                    <th className="py-2.5 px-3">Actual Date</th>
                    <th className="py-2.5 px-3">Delay / Variance</th>
                    <th className="py-2.5 px-3">Decision</th>
                    <th className="py-2.5 px-3">Status</th>
                    <th className="py-2.5 px-3 text-center">Stage Fields</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDisplayedStages.length > 0 ? (
                    filteredDisplayedStages.map(({ stage, idx }) => {
                      const isStageDone = stage.status === 'Done' || stage.status === 'Skipped';
                      const stgDelayHrs = (typeof stage.timeDelayHours === 'number' && stage.timeDelayHours > 0)
                        ? stage.timeDelayHours
                        : (typeof stage.delayHours === 'number' && stage.delayHours > 0)
                        ? stage.delayHours
                        : getStageDelayHours(stage, stage.plannedDateTime || flow.indentDate);

                      const isStgDelayed = stgDelayHrs > 0;
                      const formattedDelay = formatDelayVariance(stgDelayHrs);
                      const stageKey = stage.stageId || `stg-${idx}`;
                      const isExpanded = expandedStageId === stageKey;

                      // Find stage fields definitions
                      let stageFieldDefs = stage.fields || [];
                      if (!stageFieldDefs || stageFieldDefs.length === 0) {
                        try {
                          const allTemplates = storageAdapter.getAllMasterTemplates();
                          const tpl = allTemplates.find((t) => t.id === flow?.customTemplateId || t.templateKey === flow?.flowType);
                          const stageTpl = tpl?.stages.find((s, sIdx) => s.stageId === stage.stageId || sIdx === idx);
                          if (stageTpl?.fields) {
                            stageFieldDefs = stageTpl.fields;
                          }
                        } catch {}
                      }

                      const hasSubmittedData = stage.submittedData && Object.keys(stage.submittedData).filter((k) => !k.startsWith('_')).length > 0;

                      return (
                        <React.Fragment key={stageKey}>
                          <tr className={`hover:bg-slate-50/80 transition-colors ${isExpanded ? 'bg-indigo-50/40' : ''}`}>
                            <td className="py-2.5 px-3 font-semibold text-slate-500">{idx + 1}</td>
                            <td className="py-2.5 px-3 font-medium text-slate-900">
                              <div className="flex items-center gap-1.5">
                                {stage.stageName}
                                {isMyStage(idx, stage) && (
                                  <span className="text-[9px] px-1 py-0.2 rounded bg-indigo-100 text-indigo-700 font-bold">
                                    You
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-2.5 px-3 text-slate-600 font-medium">{stage.assignee || 'Unassigned'}</td>
                            <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                              {stage.plannedDateTime || '—'}
                            </td>
                            <td className="py-2.5 px-3 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                              {stage.actualDateTime || '—'}
                            </td>
                            <td className="py-2.5 px-3 font-mono text-[11px] whitespace-nowrap">
                              {isStgDelayed ? (
                                <span
                                  className={`inline-block px-2 py-0.5 rounded font-bold ${
                                    isStageDone
                                      ? 'bg-red-100 text-red-800 border border-red-200'
                                      : 'bg-yellow-100 text-yellow-800 border border-yellow-300 animate-pulse'
                                  }`}
                                >
                                  {formattedDelay}
                                </span>
                              ) : (
                                <span className="text-emerald-700 font-medium">On Time</span>
                              )}
                            </td>
                            <td className="py-2.5 px-3 font-semibold whitespace-nowrap">
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
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                                  stage.status === 'Done'
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : stage.status === 'In Progress'
                                    ? 'bg-indigo-100 text-indigo-800 border border-indigo-200'
                                    : stage.status === 'Skipped'
                                    ? 'bg-slate-100 text-slate-500'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {stage.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 text-center whitespace-nowrap">
                              <button
                                type="button"
                                onClick={() => setExpandedStageId(isExpanded ? null : stageKey)}
                                className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold transition-colors cursor-pointer ${
                                  isExpanded
                                    ? 'bg-indigo-600 text-white'
                                    : 'bg-slate-100 hover:bg-slate-200 text-indigo-700 border border-slate-200'
                                }`}
                              >
                                <span>{isExpanded ? 'Hide Fields' : 'View Fields'}</span>
                                {isExpanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                              </button>
                            </td>
                          </tr>

                          {/* Expanded Stage Fields Dossier Row */}
                          {isExpanded && (
                            <tr className="bg-slate-50/90 border-b border-indigo-100">
                              <td colSpan={9} className="p-3.5">
                                <div className="space-y-2 bg-white p-3.5 rounded-xl border border-indigo-100 shadow-2xs">
                                  <div className="flex items-center justify-between pb-2 border-b border-slate-100 flex-wrap gap-2">
                                    <div className="flex items-center gap-2">
                                      <span className="font-bold text-xs text-slate-900">
                                        Stage #{idx + 1} Fields &amp; Form Responses
                                      </span>
                                      <span className="text-[10px] text-slate-500">
                                        Assignee: <strong className="text-slate-800">{stage.assignee || 'Unassigned'}</strong>
                                      </span>
                                    </div>
                                    <div className="text-[11px] font-mono text-slate-600 flex items-center gap-2">
                                      <span>Planned: <strong>{stage.plannedDateTime || 'SLA Standard'}</strong></span>
                                      <span>•</span>
                                      <span>Actual: <strong>{stage.actualDateTime || 'Pending Completion'}</strong></span>
                                    </div>
                                  </div>

                                  {/* Submitted Values or Field Schema */}
                                  {hasSubmittedData ? (
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 pt-1">
                                      {Object.entries(stage.submittedData || {})
                                        .filter(([k]) => !k.startsWith('_'))
                                        .map(([key, val]) => {
                                          const matchedField = stageFieldDefs.find((f) => f.id === key);
                                          const label = matchedField?.label || key.replace(/_/g, ' ').replace(/([A-Z])/g, ' $1');
                                          const strVal = String(val ?? '');
                                          const isFile = strVal.startsWith('data:') || strVal.startsWith('[File: ');

                                          return (
                                            <div key={key} className="bg-slate-50 p-2.5 rounded-lg border border-slate-200 space-y-1">
                                              <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                                                {label}
                                              </div>
                                              <div className="text-xs font-semibold text-slate-900 break-words">
                                                {isFile ? (
                                                  <button
                                                    type="button"
                                                    onClick={() => setPreviewFile({ url: strVal, name: `${label} Attachment` })}
                                                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-md border border-indigo-200 text-xs font-semibold cursor-pointer"
                                                  >
                                                    <Paperclip className="w-3.5 h-3.5 text-indigo-600" />
                                                    <span>View Attachment</span>
                                                  </button>
                                                ) : (
                                                  strVal || '—'
                                                )}
                                              </div>
                                            </div>
                                          );
                                        })}
                                    </div>
                                  ) : stageFieldDefs.length > 0 ? (
                                    <div className="space-y-1.5 pt-1">
                                      <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                        Configured Stage Input Requirements ({stageFieldDefs.length} Fields)
                                      </div>
                                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                                        {stageFieldDefs.map((f) => (
                                          <div key={f.id} className="p-2 bg-slate-50 rounded-lg border border-slate-200 text-xs flex items-center justify-between">
                                            <span className="font-semibold text-slate-800">{f.label}</span>
                                            <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 text-slate-700 uppercase">
                                              {f.type} {f.required ? '*' : ''}
                                            </span>
                                          </div>
                                        ))}
                                      </div>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-slate-500 italic pt-1">
                                      Standard form stage. No custom fields configured for this stage.
                                    </p>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-slate-500">
                        No stages found matching filter "{stageSearchQuery}".
                        <button
                          onClick={() => {
                            setStageSearchQuery('');
                            setModalStageFilter('ALL_STAGES');
                          }}
                          className="block mx-auto mt-2 text-indigo-600 font-semibold hover:underline cursor-pointer"
                        >
                          Reset filters &amp; view all {flow.totalStages} stages →
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
            className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-200 rounded-lg transition-colors cursor-pointer"
          >
            Close Details
          </button>
        </div>

        {/* Close Fms Modal */}
        <CloseFmsModal
          isOpen={showCloseModal}
          flow={flow}
          currentUser={currentUser}
          onClose={() => setShowCloseModal(false)}
          onSuccess={() => {
            if (onUpdateFlow && flow) {
              const updated = storageAdapter.getFmsFlows().find((f) => f.id === flow.id || f.flowId === flow.flowId);
              if (updated) onUpdateFlow(updated);
            }
          }}
        />

        {/* File Preview Dialog */}
        {previewFile && (
          <FilePreviewModal
            isOpen={Boolean(previewFile)}
            fileUrl={previewFile.url}
            fileName={previewFile.name}
            onClose={() => setPreviewFile(null)}
          />
        )}
      </div>
    </div>
  );
};
