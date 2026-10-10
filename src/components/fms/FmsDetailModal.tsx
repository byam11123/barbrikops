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
  Hash
} from 'lucide-react';
import { FmsInstance, UserProfile, Priority, FmsStageFieldConfig } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { FilePreviewModal } from '../common/FilePreviewModal';
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
}

export const FmsDetailModal: React.FC<FmsDetailModalProps> = ({ flow, currentUser, onClose, onUpdateFlow }) => {
  const [modalStageFilter, setModalStageFilter] = useState<'MY_STAGES' | 'ALL_STAGES'>('MY_STAGES');
  const [isEditing, setIsEditing] = useState(false);
  const [editSiteName, setEditSiteName] = useState(flow?.siteName || '');
  const [editPriority, setEditPriority] = useState<Priority>(flow?.priority || 'Normal');
  const [editRequisition, setEditRequisition] = useState(flow?.requisitionNumber || flow?.indentNo || '');
  const [editVendorName, setEditVendorName] = useState(flow?.vendorName || '');
  const [editPoAmount, setEditPoAmount] = useState(String(flow?.poAmount || ''));
  const [editRemarks, setEditRemarks] = useState(flow?.remarks || '');
  const [editActiveAssignee, setEditActiveAssignee] = useState(flow ? flow.stages[flow.currentStageIndex]?.assignee || '' : '');
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

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
                  flow.status === 'Completed'
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : flow.status === 'In Progress'
                    ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    : 'bg-slate-100 text-slate-700 border-slate-200'
                }`}>
                  {flow.status}
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
          <div className="flex items-center gap-2">
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

          {flow.remarks && (
            <div className="p-3.5 bg-amber-50/70 border-l-4 border-amber-500 border-y border-r border-amber-200 rounded-r-xl flex items-start gap-3 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs">
                <span className="font-bold text-amber-950 mr-1.5">Operational Notes &amp; Justification:</span>
                <span className="text-amber-900 leading-relaxed">{flow.remarks}</span>
              </div>
            </div>
          )}

          {/* Audit Trail Dossier — Completed Stage Records */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50/90 border-b border-slate-200 flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                    Consolidated Stage Form Responses &amp; Master Records
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Archived operational parameters, decisions, and uploaded verification attachments
                  </p>
                </div>
              </div>
              <span className="text-[11px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2.5 py-1 rounded-full">
                {stagesWithSubmittedData.length} Completed Stage Form(s) Recorded
              </span>
            </div>

            <div className="p-4">
              {stagesWithSubmittedData.length === 0 ? (
                <div className="text-center py-8 px-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                  <FileText className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <p className="text-xs font-semibold text-slate-700">No stage form responses recorded yet</p>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Field entries and uploaded documents will be logged here as each workflow stage is executed.
                  </p>
                </div>
              ) : (
                <div className="space-y-3.5">
                  {stagesWithSubmittedData.map(({ stage, idx }) => {
                    const stageFields = stage.fields || [];
                    const entries = Object.entries(stage.submittedData || {}).filter(([k]) => !k.startsWith('_'));

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
            </div>
          </div>

          {/* Table Header with Toggle */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500">
                Stage Breakdown ({getFlowTypeDisplayName(flow.flowType)})
              </h4>
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
              <table className="w-full min-w-[720px] text-left text-xs border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Stage #</th>
                    <th className="py-2.5 px-3">Stage Name</th>
                    <th className="py-2.5 px-3">Assignee</th>
                    <th className="py-2.5 px-3">Planned</th>
                    <th className="py-2.5 px-3">Actual</th>
                    <th className="py-2.5 px-3">Delay / Variance</th>
                    <th className="py-2.5 px-3">Decision</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {displayedStages.length > 0 ? (
                    displayedStages.map(({ stage, idx }) => {
                      const isStageDone = stage.status === 'Done' || stage.status === 'Skipped';
                      const stgDelayHrs = (typeof stage.timeDelayHours === 'number' && stage.timeDelayHours > 0)
                        ? stage.timeDelayHours
                        : (typeof stage.delayHours === 'number' && stage.delayHours > 0)
                        ? stage.delayHours
                        : getStageDelayHours(stage, stage.plannedDateTime || flow.indentDate);

                      const isStgDelayed = stgDelayHrs > 0;
                      const formattedDelay = formatDelayVariance(stgDelayHrs);

                      return (
                        <tr key={stage.stageId || idx} className="hover:bg-slate-50/80 transition-colors">
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
                          <td className="py-2.5 px-3 text-slate-600">{stage.assignee}</td>
                          <td className="py-2.5 px-3 text-slate-500 font-mono text-[11px] whitespace-nowrap">
                            {stage.plannedDateTime || '—'}
                          </td>
                          <td className="py-2.5 px-3 text-slate-700 font-mono text-[11px] whitespace-nowrap">
                            {stage.actualDateTime || '—'}
                          </td>
                          {/* Delay / Variance column with highlight badges */}
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
                              <span className="text-slate-400">—</span>
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
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-500">
                        No stages belong to {currentUser.name} in this procurement flow.
                        <button
                          onClick={() => setModalStageFilter('ALL_STAGES')}
                          className="block mx-auto mt-2 text-indigo-600 font-semibold hover:underline cursor-pointer"
                        >
                          View all {flow.totalStages} stages →
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
