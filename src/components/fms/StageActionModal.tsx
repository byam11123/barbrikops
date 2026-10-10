import React, { useState, useEffect } from 'react';
import { 
  X, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  FileText, 
  CheckSquare, 
  ExternalLink, 
  ShieldCheck, 
  CreditCard, 
  User, 
  History,
  Info,
  Calendar,
  Layers,
  ArrowRight,
  Link2,
  Paperclip
} from 'lucide-react';
import { FmsInstance, FmsStageExecution, FmsStageFieldConfig, UserProfile } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { FileUploadField } from '../common/FileUploadField';
import { FilePreviewModal } from '../common/FilePreviewModal';

interface StageActionModalProps {
  isOpen: boolean;
  flow: FmsInstance | null;
  stageIndex: number;
  currentUser: UserProfile;
  onClose: () => void;
  onSubmitStage: (
    flow: FmsInstance, 
    stageIndex: number, 
    submittedData: Record<string, any>, 
    decision?: 'Yes' | 'No'
  ) => void;
}

export const StageActionModal: React.FC<StageActionModalProps> = ({
  isOpen,
  flow,
  stageIndex,
  currentUser,
  onClose,
  onSubmitStage,
}) => {
  const [formData, setFormData] = useState<Record<string, any>>({});
  const [error, setError] = useState<string | null>(null);

  const stage: FmsStageExecution | undefined = flow?.stages[stageIndex];

  // Derive dynamic or fallback fields for this stage
  const getStageFields = (): FmsStageFieldConfig[] => {
    if (!flow || !stage) return [];

    // If explicit fields are defined on the stage execution
    if (stage.fields && stage.fields.length > 0) {
      return stage.fields;
    }

    // Default intelligent presets for standard baseline flows (like PO to Payment from user's sheet)
    if (flow.flowType === 'PO_TO_PAYMENT') {
      if (stage.stageId === 'STG-PAY-07' || stageIndex === 6) {
        return [
          { id: 'sheetNo', label: 'Sheet No. / Voucher No.', type: 'TEXT', defaultValue: flow.requisitionNumber || flow.indentNo || `SHT-${Date.now().toString().slice(-4)}` },
          { id: 'entryTimestamp', label: 'Timestamp', type: 'TEXT', defaultValue: new Date().toLocaleString('en-GB') },
          { id: 'vendorName', label: 'Vendor Name', type: 'TEXT', required: true, defaultValue: flow.vendorName || '' },
          { id: 'purposeOfPayment', label: 'Purpose of Payment', type: 'TEXT', required: true },
          { id: 'requestedBy', label: 'Requested By', type: 'TEXT', required: true, defaultValue: currentUser.name },
          { id: 'site', label: 'Site', type: 'SELECT', options: ['Raipur Office', 'Raipur Workshop', 'Siladehi Site', 'Bijetala Site'], required: true, defaultValue: flow.siteName },
          { id: 'modeOfPayment', label: 'Mode Of Payment', type: 'SELECT', options: ['UPI', 'ACCOUNT', 'RTGS/NEFT', 'CHEQUE'], required: true, defaultValue: 'ACCOUNT' },
          { id: 'amountToBePaid', label: 'Amount to Be Paid (₹)', type: 'NUMBER', required: true, defaultValue: String(flow.poAmount || '') },
          { id: 'billNoOrPo', label: 'Bill No./PO', type: 'TEXT', required: true, defaultValue: flow.poNumber || '' },
          { id: 'poUploadLink', label: 'Remark PO UPLOAD', type: 'URL', placeholder: 'https://drive.google.com/...' },
          { id: 'remark', label: 'Initiation Remarks', type: 'TEXTAREA' },
        ];
      }

      if (stage.stageId === 'STG-PAY-08' || stageIndex === 7) {
        return [
          { id: 'status', label: 'Approval Status', type: 'APPROVAL', options: ['APPROVED', 'REJECTED'], required: true, defaultValue: 'APPROVED' },
          { id: 'statusTimestamp', label: 'Status Timestamp', type: 'TEXT', defaultValue: new Date().toLocaleString('en-GB') },
          { id: 'approvedAmount', label: 'Approved Amount (₹)', type: 'NUMBER', required: true, defaultValue: String(flow.poAmount || '') },
          { id: 'approvalRemarks', label: 'Approval Notes / Justification', type: 'TEXTAREA' },
        ];
      }

      if (stage.stageId === 'STG-PAY-09' || stageIndex === 8) {
        return [
          { id: 'bankEntryStatus', label: 'Bank Entry Status', type: 'SELECT', options: ['DONE', 'APPROVED', 'PENDING'], required: true, defaultValue: 'APPROVED' },
          { id: 'bankEntryTimestamp', label: 'Bank Entry Timestamp', type: 'TEXT', defaultValue: new Date().toLocaleString('en-GB') },
          { id: 'bankAccount', label: 'Bank Account Debited', type: 'SELECT', options: ['HDFC Main Ops A/c', 'SBI Site A/c', 'ICICI Disbursements'], required: true, defaultValue: 'HDFC Main Ops A/c' },
          { id: 'entryRemarks', label: 'Bank Entry Notes', type: 'TEXTAREA' },
        ];
      }

      if (stage.stageId === 'STG-PAY-10' || stageIndex === 9) {
        return [
          { id: 'paymentStatus', label: 'Final Payment Status', type: 'STATUS_DONE', options: ['DONE', 'PENDING'], required: true, defaultValue: 'DONE' },
          { id: 'utrNumber', label: 'Bank UTR / Transaction No.', type: 'TEXT', required: true, placeholder: 'e.g. UTR2026091800921' },
          { id: 'verified', label: 'Accounts Verification', type: 'SELECT', options: ['VERIFIED', 'UNDER_REVIEW'], required: true, defaultValue: 'VERIFIED' },
          { id: 'finalRemarks', label: 'Disbursement Remarks', type: 'TEXTAREA' },
        ];
      }
    }

    // Check Stock Workflow Presets
    if (flow.flowType === 'CHECK_STOCK') {
      if (stage.stageId === 'STG-STK-01' || stageIndex === 0) {
        return [
          { id: 'storePhysicalCheck', label: 'Store Physical Stock Found', type: 'SELECT', options: ['FULL_STOCK_AVAILABLE', 'PARTIAL_AVAILABLE', 'NIL_STOCK'], required: true },
          { id: 'availableQty', label: 'Available In-Stock Qty', type: 'NUMBER', required: true },
          { id: 'storeKeeperRemarks', label: 'Store Keeper Notes', type: 'TEXTAREA' }
        ];
      }
    }

    // Indent to PO Purchase Workflow Presets
    if (flow.flowType === 'INDENT_PURCHASE') {
      if (stage.stageId === 'STG-11' || stageIndex === 10) {
        return [
          { id: 'poNumber', label: 'Purchase Order No. (PO)', type: 'TEXT', required: true, defaultValue: flow.poNumber || `RAO/PO/${flow.indentNo}-001` },
          { id: 'vendorName', label: 'Authorized Vendor Name', type: 'TEXT', required: true, defaultValue: flow.vendorName || 'M/S AUTHORIZED OEM VENDOR' },
          { id: 'amountToBePaid', label: 'Advance Payment Amount (₹)', type: 'NUMBER', required: true, defaultValue: String(flow.poAmount || 50000) },
          { id: 'modeOfPayment', label: 'Payment Mode', type: 'SELECT', options: ['ACCOUNT', 'RTGS/NEFT', 'UPI', 'CHEQUE'], required: true, defaultValue: 'ACCOUNT' },
          { id: 'urgency', label: 'Payment Urgency / SLA', type: 'SELECT', options: ['Normal', 'Urgent', 'Emergency'], required: true, defaultValue: 'Urgent' },
          { id: 'purposeOfPayment', label: 'Payment Purpose', type: 'TEXT', required: true, defaultValue: `Advance payment for Indent #${flow.indentNo}` },
          { id: 'poUploadLink', label: 'Signed PO Copy / Proforma Invoice URL', type: 'URL', placeholder: 'https://drive.google.com/...' },
          { id: 'paymentRemarks', label: 'Handover Instructions to Accounts', type: 'TEXTAREA', placeholder: 'Specify payment deadline, vendor contact, or settlement terms...' }
        ];
      }
    }

    // General fallback fields for standard steps
    return [
      { id: 'actionStatus', label: 'Stage Execution Result', type: 'SELECT', options: ['COMPLETED', 'VERIFIED_OK'], required: true, defaultValue: 'COMPLETED' },
      { id: 'referenceDocument', label: 'Reference / Challan / Document No.', type: 'TEXT', placeholder: 'Optional reference ID' },
      { id: 'evidenceUrl', label: 'Evidence / Document Link (Google Drive / URL)', type: 'URL', placeholder: 'https://...' },
      { id: 'remarks', label: 'Operational Remarks', type: 'TEXTAREA', placeholder: 'Enter remarks or audit notes...' },
    ];
  };

  const fields = getStageFields();

  // Derive verification checkpoint checklist for this stage
  const getStageCheckpoints = (): string[] => {
    if (!flow || !stage) return [];
    if (stage.checkpoints && stage.checkpoints.length > 0) {
      return stage.checkpoints;
    }

    if (flow.flowType === 'PO_TO_PAYMENT') {
      if (stage.stageId === 'STG-PAY-07' || stageIndex === 6) {
        return [
          'Bill / PO voucher attached & legible',
          'Vendor name & GST matched with invoice',
          'Bank payment details (IFSC / Account / UPI) verified',
          'Amount correctly computed against purchase order'
        ];
      }
      if (stage.stageId === 'STG-PAY-08' || stageIndex === 7) {
        return [
          'Budget availability confirmed for site/department',
          'Payment due date and credit period verified',
          'No duplicate payment voucher check verified clear'
        ];
      }
      if (stage.stageId === 'STG-PAY-09' || stageIndex === 8) {
        return [
          'Bank disbursement entry initiated in internet banking',
          'Beneficiary account confirmed active in bank master',
          'Sufficient operational ledger balance verified'
        ];
      }
      if (stage.stageId === 'STG-PAY-10' || stageIndex === 9) {
        return [
          'Bank payment successfully processed & debited',
          'UTR / transaction reference verified from bank receipt',
          'Debit voucher shared with accounts & vendor'
        ];
      }
    }

    if (flow.flowType === 'CHECK_STOCK') {
      return [
        'Store physical stock physically counted & inspected',
        'Bin card / register entry reconciled with requirement',
        'Store keeper recommendation verified'
      ];
    }

    if (flow.flowType === 'INDENT_PURCHASE' && (stage.stageId === 'STG-11' || stageIndex === 10)) {
      return [
        'Purchase Order (PO) draft approved and attached',
        'Vendor banking details (Account/IFSC/UPI) validated against master',
        'Advance payment dossier submitted to Accounts Department within SLA'
      ];
    }

    return [
      'Supporting physical/digital documentation verified',
      'Operational guidelines and quality standards confirmed',
      'Task completed and ready for handover to next stage'
    ];
  };

  const checkpoints = getStageCheckpoints();
  const [checkedCheckpoints, setCheckedCheckpoints] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  // Initialize defaults
  useEffect(() => {
    if (isOpen && flow && stage) {
      const initial: Record<string, any> = {};
      const prevData = stage.submittedData || {};
      fields.forEach((f) => {
        initial[f.id] = prevData[f.id] !== undefined ? prevData[f.id] : (f.defaultValue || '');
      });
      setFormData(initial);
      setCheckedCheckpoints(stage.checkedCheckpoints || (stage.submittedData?._checkpoints as string[]) || []);
      setError(null);
    }
  }, [isOpen, flow?.id, stageIndex]);

  if (!isOpen || !flow || !stage) return null;

  const handleFieldChange = (id: string, value: any) => {
    setFormData((prev) => ({ ...prev, [id]: value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate required fields
    for (const f of fields) {
      if (f.required) {
        const val = formData[f.id];
        if (val === undefined || val === null || String(val).trim() === '') {
          setError(`Please fill in "${f.label}" before completing this stage.`);
          return;
        }
      }
    }

    // Determine decision if approval stage
    let decision: 'Yes' | 'No' | undefined = undefined;
    if (formData.status === 'APPROVED') decision = 'Yes';
    else if (formData.status === 'REJECTED') decision = 'No';

    const submissionPayload = {
      ...formData,
      _checkpoints: checkedCheckpoints,
      _totalCheckpoints: checkpoints.length,
    };

    onSubmitStage(flow, stageIndex, submissionPayload, decision);
    onClose();
  };

  // Upstream dossier: Gather all submitted data from prior stages
  const priorStages = flow.stages.slice(0, stageIndex).filter((s) => s.status === 'Completed' || s.status === 'Done');

  // Helper to resolve human-readable assigned label for any field key
  const resolveFieldLabel = (key: string, priorStage: FmsStageExecution, priorIndex: number): string => {
    // 1. Direct field config on the prior stage execution
    if (priorStage.fields && priorStage.fields.length > 0) {
      const matched = priorStage.fields.find((f) => f.id === key);
      if (matched && matched.label) return matched.label;
    }

    // 2. Any stage in the current workflow instance
    if (flow?.stages) {
      for (const stg of flow.stages) {
        if (stg.fields) {
          const matched = stg.fields.find((f) => f.id === key);
          if (matched && matched.label) return matched.label;
        }
      }
    }

    // 3. Template definition from storage
    try {
      const allTemplates = storageAdapter.getAllMasterTemplates();
      const tpl = allTemplates.find((t) => t.id === flow?.customTemplateId || t.templateKey === flow?.flowType);
      if (tpl) {
        const stageTpl = tpl.stages.find((s, idx) => s.stageId === priorStage.stageId || idx === priorIndex);
        const tplField = stageTpl?.fields?.find((f) => f.id === key);
        if (tplField && tplField.label) return tplField.label;

        for (const stg of tpl.stages) {
          const anyField = stg.fields?.find((f) => f.id === key);
          if (anyField && anyField.label) return anyField.label;
        }
      }
    } catch {
      // Ignore template lookup error
    }

    // 4. Known built-in field label map
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
      entryTimestamp: 'Timestamp',
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
      statusTimestamp: 'Status Timestamp',
      approvedAmount: 'Approved Amount (₹)',
      approvalRemarks: 'Approval Notes / Justification',
      bankEntryStatus: 'Bank Entry Status',
      bankEntryTimestamp: 'Bank Entry Timestamp',
      bankAccount: 'Bank Account Debited',
      entryRemarks: 'Bank Entry Notes',
      paymentStatus: 'Payment Status',
      utrNumber: 'Bank UTR / Transaction No.',
      verified: 'Verification Status',
      finalRemarks: 'Disbursement Remarks',
      storePhysicalCheck: 'Store Physical Stock Found',
      availableQty: 'Available In-Stock Qty',
      storeKeeperRemarks: 'Store Keeper Notes',
      actionStatus: 'Stage Execution Result',
      referenceDocument: 'Reference / Challan No.',
      evidenceUrl: 'Evidence Document Link',
      urgency: 'Payment Urgency / SLA',
      paymentRemarks: 'Handover Instructions to Accounts',
    };

    if (KNOWN_LABELS[key]) {
      return KNOWN_LABELS[key];
    }

    // 5. Handle field_X_Y format gracefully if not in config
    const matchField = key.match(/^field_(\d+)_(\d+)$/i);
    if (matchField) {
      return `Field #${matchField[2]} (Stage ${matchField[1]})`;
    }

    // 6. Generic formatted string
    return key
      .replace(/_/g, ' ')
      .replace(/([A-Z])/g, ' $1')
      .replace(/\b\w/g, (c) => c.toUpperCase())
      .trim();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[95vh] sm:max-h-[90vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Modal Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center font-bold text-xs text-indigo-300">
              #{stageIndex + 1}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-bold text-sm sm:text-base leading-tight">
                  {stage.stageName}
                </h3>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/20">
                  {flow.flowType.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-[11px] text-indigo-200 mt-0.5">
                Ref: <strong className="text-white font-mono">{flow.requisitionNumber || flow.indentNo || flow.flowId}</strong> • Assignee: <strong className="text-white">{stage.assignee}</strong>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Upstream Dossier: Data Carryover from Prior Stages */}
          {priorStages.length > 0 && (
            <div className="space-y-3">
              {priorStages.map((prior, pIdx) => {
                const submittedEntries = prior.submittedData
                  ? Object.entries(prior.submittedData).filter(([k]) => !k.startsWith('_'))
                  : [];

                return (
                  <div key={prior.stageId || pIdx} className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-indigo-600" />
                          Stage #{pIdx + 1}: {prior.stageName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          Completed Dossier
                        </span>
                      </div>
                      <span className="text-[10px] font-mono text-slate-500">
                        {prior.actualDateTime || 'Completed'}
                      </span>
                    </div>

                    {submittedEntries.length > 0 ? (
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-0.5 text-[11px]">
                        {submittedEntries.map(([k, v]) => {
                          const displayLabel = resolveFieldLabel(k, prior, pIdx);
                          const strVal = String(v ?? '');
                          const isDataFile = strVal.startsWith('data:');
                          const isRefFile = strVal.startsWith('[File: ');
                          const isHttpLink = strVal.startsWith('http://') || strVal.startsWith('https://');

                          return (
                            <div key={k} className="overflow-hidden">
                              <span className="text-[10px] text-slate-400 font-semibold block capitalize truncate" title={displayLabel}>
                                {displayLabel}
                              </span>
                              {isDataFile || isRefFile ? (
                                <button
                                  type="button"
                                  onClick={() =>
                                    setPreviewFile({
                                      url: strVal,
                                      name: isRefFile
                                        ? strVal.replace(/^\[File:\s*/, '').replace(/\]$/, '')
                                        : `${displayLabel} Attachment`,
                                    })
                                  }
                                  className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 truncate text-[11px] cursor-pointer"
                                  title="Click to open file in dialog box"
                                >
                                  <Paperclip className="w-3 h-3 shrink-0" />
                                  <span className="truncate">
                                    {isRefFile
                                      ? strVal.replace(/^\[File:\s*/, '').replace(/\]$/, '')
                                      : 'View Attachment'}
                                  </span>
                                </button>
                              ) : isHttpLink ? (
                                <a
                                  href={strVal}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="font-bold text-indigo-600 hover:text-indigo-800 hover:underline inline-flex items-center gap-1 truncate text-[11px]"
                                  title={strVal}
                                >
                                  <ExternalLink className="w-3 h-3 shrink-0" />
                                  <span className="truncate">{strVal}</span>
                                </a>
                              ) : (
                                <span className="font-medium text-slate-800 block truncate" title={strVal}>
                                  {strVal}
                                </span>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">Stage verified by {prior.assignee}</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Current Stage Form Inputs */}
          <form id="stage-action-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-indigo-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  Stage #{stageIndex + 1}: {stage.stageName}
                </span>
                <span className="text-[10px] font-semibold text-slate-500">
                  Planned SLA: <strong className="text-slate-800 font-mono">{stage.plannedDateTime || '—'}</strong>
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                {fields.map((field) => {
                  const val = formData[field.id] !== undefined ? formData[field.id] : '';

                  if (field.type === 'APPROVAL') {
                    return (
                      <div key={field.id} className="sm:col-span-2 space-y-1.5">
                        <label className="block text-xs font-bold text-slate-800">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => handleFieldChange(field.id, 'APPROVED')}
                            className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                              val === 'APPROVED'
                                ? 'bg-emerald-600 text-white border-emerald-700 shadow-xs ring-2 ring-emerald-400/40'
                                : 'bg-white border-slate-300 text-slate-700 hover:bg-emerald-50'
                            }`}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                            <span>APPROVED</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFieldChange(field.id, 'REJECTED')}
                            className={`py-2 px-3 rounded-lg font-bold text-xs flex items-center justify-center gap-1.5 border transition-all cursor-pointer ${
                              val === 'REJECTED'
                                ? 'bg-rose-600 text-white border-rose-700 shadow-xs ring-2 ring-rose-400/40'
                                : 'bg-white border-slate-300 text-slate-700 hover:bg-rose-50'
                            }`}
                          >
                            <X className="w-4 h-4" />
                            <span>REJECTED</span>
                          </button>
                        </div>
                      </div>
                    );
                  }

                  if (field.type === 'SELECT') {
                    const options = (field.options && field.options.length > 0)
                      ? field.options
                      : field.label.toLowerCase().includes('site')
                      ? ['SILADEHI', 'BIJETALA', 'RAIPUR', 'CENTRAL STORE']
                      : field.label.toLowerCase().includes('priority')
                      ? ['Normal', 'Urgent', 'Low']
                      : ['Option 1', 'Option 2'];

                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <select
                          value={val}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                        >
                          <option value="">Select option...</option>
                          {options.map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      </div>
                    );
                  }

                  if (field.type === 'DATE') {
                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="date"
                          value={val}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    );
                  }

                  if (field.type === 'NUMBER') {
                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <input
                          type="number"
                          step="any"
                          value={val}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || 'Enter amount...'}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    );
                  }

                  if (field.type === 'TEXTAREA') {
                    return (
                      <div key={field.id} className="sm:col-span-2 space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <textarea
                          rows={2}
                          value={val}
                          onChange={(e) => handleFieldChange(field.id, e.target.value)}
                          placeholder={field.placeholder || 'Enter remarks...'}
                          className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                      </div>
                    );
                  }

                  if ((field.type as string) === 'FILE') {
                    return (
                      <div key={field.id} className="sm:col-span-2 space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <FileUploadField
                          id={field.id}
                          label={field.label}
                          required={field.required}
                          placeholder={field.placeholder}
                          value={val}
                          onChange={(uploadedVal) => handleFieldChange(field.id, uploadedVal)}
                        />
                      </div>
                    );
                  }

                  if (field.type === 'URL') {
                    return (
                      <div key={field.id} className="sm:col-span-2 space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            type="url"
                            value={val}
                            onChange={(e) => handleFieldChange(field.id, e.target.value)}
                            placeholder={field.placeholder || 'https://drive.google.com/... or web URL'}
                            className="w-full text-xs bg-white border border-slate-300 rounded-lg pl-8 pr-8 py-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                          <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                          {val && (
                            <a
                              href={val.startsWith('http') ? val : `https://${val}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-indigo-600 hover:text-indigo-800 p-0.5"
                              title="Open link"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                            </a>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // Default TEXT
                  return (
                    <div key={field.id} className="space-y-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        {field.label} {field.required && <span className="text-rose-500">*</span>}
                      </label>
                      <input
                        type="text"
                        value={val}
                        onChange={(e) => handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || `Enter ${field.label}...`}
                        className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Stage Pre-Completion Verification Checkpoint Checklist */}
            {checkpoints.length > 0 && (
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="font-bold text-slate-900 text-xs uppercase tracking-wider flex items-center gap-1.5">
                    <CheckSquare className="w-4 h-4 text-indigo-600" />
                    Stage Verification Checkpoints ({checkedCheckpoints.length}/{checkpoints.length} verified)
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      if (checkedCheckpoints.length === checkpoints.length) {
                        setCheckedCheckpoints([]);
                      } else {
                        setCheckedCheckpoints([...checkpoints]);
                      }
                    }}
                    className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer"
                  >
                    {checkedCheckpoints.length === checkpoints.length ? 'Clear All' : 'Check All'}
                  </button>
                </div>
                <div className="space-y-1.5">
                  {checkpoints.map((cp, cIdx) => {
                    const isChecked = checkedCheckpoints.includes(cp);
                    return (
                      <label
                        key={cIdx}
                        className={`flex items-start gap-2.5 p-2 rounded-lg border text-xs cursor-pointer transition-colors ${
                          isChecked
                            ? 'bg-emerald-50/80 border-emerald-200 text-emerald-950 font-medium'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {
                            if (isChecked) {
                              setCheckedCheckpoints(checkedCheckpoints.filter((c) => c !== cp));
                            } else {
                              setCheckedCheckpoints([...checkedCheckpoints, cp]);
                            }
                          }}
                          className="mt-0.5 rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                        <span className="leading-snug">{cp}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Rolling SLA Notice */}
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex items-center justify-between text-xs text-indigo-900">
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>
                  Completion will record actual timestamp and automatically calculate the next stage's rolling SLA (+1 Hour).
                </span>
              </div>
            </div>
          </form>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
          >
            Cancel
          </button>
          
          <button
            type="submit"
            form="stage-action-form"
            className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-bold rounded-lg text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <CheckCircle2 className="w-4 h-4 text-white" />
            <span>Submit &amp; Advance Stage</span>
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
