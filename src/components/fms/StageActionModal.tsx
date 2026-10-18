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
  Paperclip,
  Lock,
  Plus,
  Trash2,
  Boxes,
  PackageCheck,
  GitFork,
  Archive,
  MapPin,
  TrendingDown,
  TrendingUp,
  Sparkles,
  Split
} from 'lucide-react';
import { FmsInstance, FmsLineItem, FmsStageExecution, FmsStageFieldConfig, UserProfile, FmsStageTemplate, ComparativeStatement, isUserSuperAdmin, isUserAdminOrSuperAdmin } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { FileUploadField } from '../common/FileUploadField';
import { FilePreviewModal } from '../common/FilePreviewModal';
import { FmsStagePreviewAccordion } from './FmsStagePreviewAccordion';
import { EmbeddedCsCreatorModal } from './EmbeddedCsCreatorModal';
import { EmbeddedL1ApprovalModal } from './EmbeddedL1ApprovalModal';
import { FmsStageOverrideModal } from './FmsStageOverrideModal';
import { FileSpreadsheet, Award, ShieldAlert } from 'lucide-react';

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

  // Embedded Sub-Task Modals
  const [isCsModalOpen, setIsCsModalOpen] = useState(false);
  const [isL1ModalOpen, setIsL1ModalOpen] = useState(false);
  const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
  const [linkedCsSheet, setLinkedCsSheet] = useState<ComparativeStatement | null>(null);

  // Quick add option state for select fields
  const [quickAddSelectModal, setQuickAddSelectModal] = useState<{
    isOpen: boolean;
    fieldId: string;
    fieldLabel: string;
    options: string[];
  } | null>(null);
  const [quickAddOptionValue, setQuickAddOptionValue] = useState<string>('');

  const stage: FmsStageExecution | undefined = flow?.stages[stageIndex];

  const handleAddSelectOption = (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickAddSelectModal || !quickAddOptionValue.trim()) return;
    const clean = quickAddOptionValue.trim();

    if (quickAddSelectModal.fieldLabel.toLowerCase().includes('site')) {
      storageAdapter.addMasterSite(clean);
    } else if (quickAddSelectModal.fieldLabel.toLowerCase().includes('vendor')) {
      storageAdapter.addMasterVendor(clean);
    } else if (quickAddSelectModal.fieldLabel.toLowerCase().includes('priority')) {
      storageAdapter.addMasterPriority(clean);
    }

    if (flow && stage) {
      const templateKey = flow.customTemplateId || flow.flowType;
      if (templateKey) {
        storageAdapter.addFieldOptionToTemplateStage(templateKey, stage.stageId, quickAddSelectModal.fieldId, clean);
      }
    }

    handleFieldChange(quickAddSelectModal.fieldId, clean);
    setQuickAddSelectModal(null);
    setQuickAddOptionValue('');
  };

  // Derive dynamic or fallback fields for this stage
  const getStageFields = (): FmsStageFieldConfig[] => {
    if (!flow || !stage) return [];

    // If explicit fields are defined on the stage execution
    if (stage.fields && stage.fields.length > 0) {
      return stage.fields;
    }

    // Look up template definition (custom template or master studio)
    try {
      const masterTemplates = storageAdapter.getAllMasterTemplates();
      const tpl = flow.customTemplateId
        ? masterTemplates.find((t) => t.id === flow.customTemplateId || t.templateKey === flow.flowType)
        : masterTemplates.find((t) => t.templateKey === flow.flowType);

      if (tpl) {
        const tplStage = tpl.stages[stageIndex] || tpl.stages.find((s) => s.stageId === stage.stageId);
        if (tplStage?.fields && tplStage.fields.length > 0) {
          return tplStage.fields;
        }
      }
    } catch {
      // Ignore template lookup error
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
          { id: 'requisitionItems', label: 'Material Requisition Items', type: 'MULTI_ITEM_TABLE', required: true },
          { id: 'site', label: 'Site Location', type: 'TEXT', defaultValue: flow.siteName },
          { id: 'workPurpose', label: 'Work / Activity Purpose Details', type: 'TEXT', placeholder: 'e.g. Pier 4 foundation pour' },
          { id: 'remarks', label: 'Requester Remarks', type: 'TEXTAREA' }
        ];
      }
      if (stage.stageId === 'STG-STK-02' || stageIndex === 1) {
        return [
          { id: 'storeKeeperRemarks', label: 'Store Keeper Inspection & Handover Notes', type: 'TEXTAREA', placeholder: 'Enter physical inspection summary, bin status, or dispatch handover remarks...' }
        ];
      }
    }

    // Indent to PO Purchase Workflow Presets (Construction Operations)
    if (flow.flowType === 'INDENT_PURCHASE') {
      if (stage.stageId === 'STG-IND-02' || stage.stageName.includes('AVAILABLE IN STORE')) {
        return [
          { id: 'availabilityDecision', label: 'Store Availability Status', type: 'SELECT', options: ['PARTIAL', 'ALL', 'NONE'], required: true, defaultValue: 'PARTIAL' },
          { id: 'availableQty', label: 'Available In-Store Qty / Items', type: 'TEXT', defaultValue: '5 items available for immediate site dispatch' },
          { id: 'purchaseQty', label: 'Items Requiring Purchase Quotations', type: 'TEXT', defaultValue: '5 items sent to Purchase Dept' },
          { id: 'storeKeeperRemarks', label: 'Store Keeper Notes / Bin Location', type: 'TEXTAREA', placeholder: 'Verify physical stock at central warehouse...' }
        ];
      }

      if (stage.stageId === 'STG-IND-03' || stage.stageId === 'STG-05' || stage.stageName.includes('VENDOR QUOTATIONS')) {
        return [
          { id: 'quotationRfqReference', label: 'Quotation RFQ Reference', type: 'TEXT', defaultValue: `RFQ-BPL-${flow.indentNo}-2026` },
          { id: 'comparativeSheetAction', label: 'Comparative Statement (CS)', type: 'SELECT', options: ['AUTO_CREATE_AND_OPEN_CS', 'LINK_MANUAL_QUOTES'], required: true, defaultValue: 'AUTO_CREATE_AND_OPEN_CS' },
          { id: 'targetVendors', label: 'Invited Vendors for Rates', type: 'TEXT', defaultValue: 'M/S Mahavir Traders, Chhattisgarh Spares, OEM Ex-Stock' },
          { id: 'remarks', label: 'Quotation Solicitation Notes', type: 'TEXTAREA', placeholder: 'Specify critical brand specs, warranty, delivery timeline...' }
        ];
      }

      if (stage.stageId === 'STG-08' || stage.stageName.includes('L1 APPROVAL') || stage.stageName.includes('DIRECTOR')) {
        return [
          { id: 'approvalStatus', label: 'Director CS & L1 Approval', type: 'APPROVAL', options: ['APPROVED', 'REJECTED'], required: true, defaultValue: 'APPROVED' },
          { id: 'directorSignature', label: 'Authorizing Signatory', type: 'TEXT', required: true, defaultValue: 'Director Pranjal Agrawal' },
          { id: 'splitPoRule', label: 'Purchase Order Generation Mode', type: 'SELECT', options: ['SPLIT_PO_PER_AWARDED_VENDOR', 'SINGLE_L1_VENDOR'], required: true, defaultValue: 'SPLIT_PO_PER_AWARDED_VENDOR' },
          { id: 'approvalRemarks', label: 'Director Approval Remarks & Terms', type: 'TEXTAREA', defaultValue: 'Approved with item-wise split PO allocation. Freight strictly OURS.' }
        ];
      }

      if (stage.stageId === 'STG-IND-05' || stage.stageId === 'STG-11' || stageIndex === 10) {
        return [
          { id: 'poNumber', label: 'Purchase Order No. (PO)', type: 'TEXT', required: true, defaultValue: flow.poNumber || `RAO/PO/${flow.indentNo}-001` },
          { id: 'vendorName', label: 'Authorized Vendor Name', type: 'TEXT', required: true, defaultValue: flow.vendorName || 'M/S MAHAVIR TRADERS & SPARES' },
          { id: 'amountToBePaid', label: 'Advance Payment Amount (₹)', type: 'NUMBER', required: true, defaultValue: String(flow.poAmount || 50000) },
          { id: 'modeOfPayment', label: 'Payment Mode', type: 'SELECT', options: ['ACCOUNT', 'UPI', 'RTGS/NEFT', 'CHEQUE'], required: true, defaultValue: 'ACCOUNT' },
          { id: 'urgency', label: 'Payment Urgency / SLA', type: 'SELECT', options: ['Normal', 'Urgent', 'Emergency'], required: true, defaultValue: 'Urgent' },
          { id: 'purposeOfPayment', label: 'Payment Purpose', type: 'TEXT', required: true, defaultValue: `Advance payment for Indent #${flow.indentNo} (${flow.siteName})` },
          { id: 'poUploadLink', label: 'Signed PO Copy / Mandated Bill URL (Mandatory for UPI)', type: 'URL', placeholder: 'https://drive.google.com/...' },
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

    // 1. If explicit checkpoints array is defined on the stage execution
    if (Array.isArray(stage.checkpoints)) {
      return stage.checkpoints.filter((cp) => Boolean(cp && typeof cp === 'string' && cp.trim()));
    }

    // 2. Look up template definition (custom or master)
    try {
      const masterTemplates = storageAdapter.getAllMasterTemplates();
      const tpl = flow.customTemplateId
        ? masterTemplates.find((t) => t.id === flow.customTemplateId || t.templateKey === flow.flowType)
        : masterTemplates.find((t) => t.templateKey === flow.flowType);

      if (tpl) {
        const tplStage = tpl.stages[stageIndex] || tpl.stages.find((s) => s.stageId === stage.stageId);
        if (tplStage && Array.isArray(tplStage.checkpoints)) {
          return tplStage.checkpoints.filter((cp) => Boolean(cp && typeof cp === 'string' && cp.trim()));
        }
        return [];
      }
    } catch {
      // Ignore template lookup error
    }

    // 3. Built-in workflow stage-specific default checkpoints only where formally defined
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

    // Never fabricate checkpoints for stages without configured checkpoints
    return [];
  };

  const checkpoints = getStageCheckpoints();
  const [checkedCheckpoints, setCheckedCheckpoints] = useState<string[]>([]);
  const [previewFile, setPreviewFile] = useState<{ url: string; name: string } | null>(null);

  const isStage2CheckStock = Boolean(
    flow && stage && flow.flowType === 'CHECK_STOCK' && (stageIndex === 1 || stage.stageId === 'STG-STK-02' || stage.stageName.includes('CHECK STOCK'))
  );

  const [triageItems, setTriageItems] = useState<FmsLineItem[]>([]);
  const [purchaserItems, setPurchaserItems] = useState<FmsLineItem[]>([]);

  // Initialize defaults with intelligent auto-assignment from instanceDataPool & previous stages
  useEffect(() => {
    if (isOpen && flow && stage) {
      const initial: Record<string, any> = {};
      const prevData = stage.submittedData || {};
      const pool = flow.instanceDataPool || {};

      fields.forEach((f) => {
        if (prevData[f.id] !== undefined) {
          initial[f.id] = prevData[f.id];
        } else if (pool[f.id] !== undefined) {
          initial[f.id] = pool[f.id];
        } else if (f.type === 'MULTI_ITEM_TABLE') {
          const inherited = pool[f.id] || pool.multiItems || pool.requisitionItems || pool.lineItems || (flow.lineItems && flow.lineItems.length > 0 ? flow.lineItems.map((item: any, i: number) => ({
            id: item.id || `row_${i+1}`,
            item_description: item.itemDescription || item.description || '',
            quantity: item.requestedQty || item.storeQty || item.purchaseQty || item.quantity || 1,
            unit: item.unit || 'Nos',
            work_purpose: item.workPurpose || item.purpose || '',
            remarks: item.remarks || item.remark || item.triageAllocation || ''
          })) : []);
          initial[f.id] = inherited;
        } else if ((f.id === 'poNumber' || f.id === 'poNo' || f.id === 'billNoOrPo') && (pool.poNumber || flow.poNumber)) {
          initial[f.id] = pool.poNumber || flow.poNumber;
        } else if ((f.id === 'vendorName' || f.id === 'vendor') && (pool.vendorName || flow.vendorName)) {
          initial[f.id] = pool.vendorName || flow.vendorName;
        } else if ((f.id === 'amountToBePaid' || f.id === 'poAmount' || f.id === 'approvedAmount') && (pool.amountToBePaid || pool.poAmount || flow.poAmount)) {
          initial[f.id] = String(pool.amountToBePaid || pool.poAmount || flow.poAmount);
        } else if ((f.id === 'purposeOfPayment' || f.id === 'purpose') && (pool.purposeOfPayment || flow.remarks)) {
          initial[f.id] = pool.purposeOfPayment || flow.remarks;
        } else {
          initial[f.id] = f.defaultValue || '';
        }
      });
      setFormData(initial);

      // Initialize Triage Line Items for Stage 2
      if (isStage2CheckStock) {
        let candidateItems: any[] = [];
        if (stage.submittedData?.triageLineItems && Array.isArray(stage.submittedData.triageLineItems)) {
          candidateItems = stage.submittedData.triageLineItems;
        } else if (flow.lineItems && flow.lineItems.length > 0) {
          candidateItems = flow.lineItems;
        } else if (pool.multiItems || pool.requisitionItems || pool.lineItems) {
          candidateItems = pool.multiItems || pool.requisitionItems || pool.lineItems;
        } else {
          // Look across prior stages
          const priorSubmitted = flow.stages.slice(0, stageIndex);
          for (const prior of priorSubmitted) {
            const data = prior.submittedData || {};
            const arr = Object.values(data).find((v) => Array.isArray(v) && v.length > 0 && typeof v[0] === 'object');
            if (arr && Array.isArray(arr)) {
              candidateItems = arr;
              break;
            }
          }
        }

        if (candidateItems.length > 0) {
          setTriageItems(
            candidateItems.map((item, idx) => {
              const reqQty = parseFloat(item.requestedQty || item.quantity || item.qty) || 1;
              const verifiedQty = item.storeVerifiedQty !== undefined ? parseFloat(item.storeVerifiedQty) : reqQty;
              const found = item.physicalStockFound !== undefined ? parseFloat(item.physicalStockFound) : 0;
              const storeQ = item.storeQty !== undefined ? parseFloat(item.storeQty) : 0;
              const purchaseQ = item.purchaseQty !== undefined ? parseFloat(item.purchaseQty) : verifiedQty;
              const holdQ = item.holdQty !== undefined ? parseFloat(item.holdQty) : 0;

              return {
                id: item.id || `item_${Date.now()}_${idx + 1}`,
                itemDescription: item.itemDescription || item.item_description || item.description || `Item #${idx + 1}`,
                requestedQty: reqQty,
                qty: verifiedQty,
                unit: item.unit || 'Nos',
                workPurpose: item.workPurpose || item.work_purpose || item.purpose || '',
                physicalStockFound: found,
                storeBinLocation: item.storeBinLocation || '',
                storeVerifiedQty: verifiedQty,
                qtyRevisionReason: item.qtyRevisionReason || '',
                storeQty: storeQ,
                purchaseQty: purchaseQ,
                holdQty: holdQ,
                remarks: item.remarks || item.remark || '',
                triageAllocation: storeQ > 0 && purchaseQ > 0 ? 'SPLIT' : storeQ > 0 ? 'STORE' : holdQ === verifiedQty ? 'HOLD' : 'PURCHASE',
              };
            })
          );
        } else {
          setTriageItems([]);
        }
      }

      // Initialize purchaser items for non-stage-2 review and quantity adjustment
      if (!isStage2CheckStock && flow.lineItems && flow.lineItems.length > 0) {
        setPurchaserItems(flow.lineItems.map((item) => ({ ...item })));
      } else {
        setPurchaserItems([]);
      }

      setCheckedCheckpoints(stage.checkedCheckpoints || (stage.submittedData?._checkpoints as string[]) || []);
      setError(null);
    }
  }, [isOpen, flow?.id, stageIndex]);

  if (!isOpen || !flow || !stage) return null;

  const getFullTemplateStagesForFlow = (): FmsStageTemplate[] => {
    if (!flow) return [];

    try {
      const allTemplates = storageAdapter.getAllMasterTemplates();
      const tpl = allTemplates.find((t) => t.id === flow.customTemplateId || t.templateKey === flow.flowType);
      if (tpl && tpl.stages && tpl.stages.length > 0) {
        return tpl.stages;
      }
    } catch {
      // Fallback
    }

    return flow.stages.map((stg) => ({
      stageId: stg.stageId,
      stageName: stg.stageName,
      whoRole: stg.assignee,
      whoDefaultAssignee: stg.assignee,
      slaHours: stg.timeDelayHours || 4,
      fields: stg.fields,
      logic: stg.logic,
      checkpoints: stg.checkpoints,
    }));
  };

  const approvalFieldInModal = fields.find((f) => f.type === 'APPROVAL' || f.id === 'status' || f.label.toLowerCase().includes('approval'));
  const currentApprovalValInModal = approvalFieldInModal ? formData[approvalFieldInModal.id] : formData.status;
  const currentActiveDecision: 'Yes' | 'No' | '' = currentApprovalValInModal === 'APPROVED' ? 'Yes' : currentApprovalValInModal === 'REJECTED' ? 'No' : '';

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

    // Validate Stage 2 Physical Stock Check & Triage
    if (isStage2CheckStock && triageItems.length > 0) {
      for (const item of triageItems) {
        const approved = item.storeVerifiedQty !== undefined ? Number(item.storeVerifiedQty) : Number(item.requestedQty || 1);
        const storeQ = Number(item.storeQty || 0);
        const purchaseQ = Number(item.purchaseQty || 0);
        const holdQ = Number(item.holdQty || 0);
        const totalAllocated = storeQ + purchaseQ + holdQ;
        if (Math.abs(totalAllocated - approved) > 0.001) {
          setError(`Item "${item.itemDescription}": Total allocated (${storeQ} Store + ${purchaseQ} Purchase + ${holdQ} Hold = ${totalAllocated}) must equal Approved Qty (${approved}).`);
          return;
        }
        if (approved !== (item.requestedQty || 1) && !item.qtyRevisionReason?.trim()) {
          setError(`Item "${item.itemDescription}": Please provide a brief reason for revising quantity from ${item.requestedQty} to ${approved}.`);
          return;
        }
      }
    }

    // Determine decision if approval stage
    let decision: 'Yes' | 'No' | undefined = undefined;
    const approvalField = fields.find((f) => f.type === 'APPROVAL' || f.id === 'status' || f.label.toLowerCase().includes('approval'));
    const approvalVal = approvalField ? formData[approvalField.id] : formData.status;
    if (approvalVal === 'APPROVED') decision = 'Yes';
    else if (approvalVal === 'REJECTED') decision = 'No';

    const storeCount = triageItems.filter((i) => (i.storeQty || 0) > 0).length;
    const purchaseCount = triageItems.filter((i) => (i.purchaseQty || 0) > 0).length;
    const holdCount = triageItems.filter((i) => (i.holdQty || 0) > 0).length;

    if (isStage2CheckStock && decision === undefined) {
      decision = purchaseCount > 0 ? 'Yes' : 'No';
    }

    const submissionPayload = {
      ...formData,
      ...(isStage2CheckStock ? {
        triageLineItems: triageItems,
        storeItemsCount: storeCount,
        purchaseItemsCount: purchaseCount,
        holdItemsCount: holdCount,
        availabilityDecision: purchaseCount === 0 ? 'ALL' : storeCount === 0 ? 'NONE' : 'PARTIAL',
      } : {}),
      ...(purchaserItems.length > 0 && !isStage2CheckStock ? {
        purchaserLineItems: purchaserItems,
      } : {}),
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
              </div>
              <p className="text-[11px] text-indigo-200 mt-0.5">
                Ref: <strong className="text-white font-mono">{flow.requisitionNumber || flow.indentNo || flow.flowId}</strong> • Assignee: <strong className="text-white">{stage.assignee}</strong>
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {isUserAdminOrSuperAdmin(currentUser) && (
              <button
                type="button"
                onClick={() => setIsOverrideModalOpen(true)}
                className="px-2.5 py-1 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-400/30 rounded-lg text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer"
                title="Super Admin / Admin Stage Override"
              >
                <ShieldAlert className="w-3.5 h-3.5" />
                <span>Override Stage</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">

          {/* Embedded Sub-Task Banner: CS Sheet Builder */}
          {(stage.stageName.toLowerCase().includes('cs') ||
            stage.stageName.toLowerCase().includes('quotation') ||
            stage.stageId === 'STG-05' ||
            stage.stageId === 'STG-IND-03') && (
            <div className="p-4 bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md border border-indigo-700/50 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-indigo-500/30 border border-indigo-400/40 text-amber-300 flex items-center justify-center font-bold">
                    <FileSpreadsheet className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white">Comparative Statement (CS Sheet) Sub-task</h4>
                    <p className="text-[11px] text-indigo-200">
                      Generate itemized rates and vendor comparisons directly for Indent #{flow.indentNo}
                    </p>
                  </div>
                </div>

                {linkedCsSheet || stage.linkedModuleRecord?.recordId ? (
                  <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded-lg font-bold text-xs flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                    <span>CS Sheet Attached</span>
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsCsModalOpen(true)}
                    className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <FileSpreadsheet className="w-4 h-4 text-slate-950" />
                    <span>Create CS Sheet</span>
                  </button>
                )}
              </div>

              {(linkedCsSheet || stage.linkedModuleRecord?.recordId) && (
                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs flex items-center justify-between">
                  <span className="text-slate-300 font-medium">
                    Attached Record Ref: <strong className="text-amber-300 font-mono">#{linkedCsSheet?.indentNo || stage.linkedModuleRecord?.recordNumber || flow.indentNo}</strong>
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsCsModalOpen(true)}
                    className="text-indigo-300 hover:text-white font-bold underline cursor-pointer"
                  >
                    View / Edit CS Sheet
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Embedded Sub-Task Banner: L1 Approval */}
          {(stage.stageName.toLowerCase().includes('l1') ||
            stage.stageName.toLowerCase().includes('approval') ||
            stage.stageId === 'STG-03') && (
            <div className="p-4 bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 text-white rounded-2xl shadow-md border border-amber-500/40 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/30 border border-amber-400/40 text-amber-400 flex items-center justify-center font-bold">
                    <Award className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-black text-sm text-white">L1 CS Approval (Pranjal Sir / Executive Sign-off)</h4>
                    <p className="text-[11px] text-amber-200">
                      Interactive vendor rate comparison &amp; L1 rate sign-off protocol
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setIsL1ModalOpen(true)}
                  className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <Award className="w-4 h-4 text-slate-950" />
                  <span>Review &amp; Approve L1 CS</span>
                </button>
              </div>
            </div>
          )}
          
          {(flow.isClosed || flow.status === 'CLOSED') && (
            <div className="p-3.5 bg-slate-900 text-white rounded-xl border border-slate-800 text-xs flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <Lock className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <span className="font-bold text-emerald-400">Workflow Verified & Closed: </span>
                  <span className="text-slate-300">This FMS is locked. All stage actions and form edits are disabled.</span>
                </div>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shrink-0">CLOSED</span>
            </div>
          )}

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
                const priorStageFields = (prior.fields && prior.fields.length > 0)
                  ? prior.fields
                  : (() => {
                      try {
                        const allTemplates = storageAdapter.getAllMasterTemplates();
                        const tpl = allTemplates.find((t) => t.id === flow?.customTemplateId || t.templateKey === flow?.flowType);
                        const stageTpl = tpl?.stages.find((s, idx) => s.stageId === prior.stageId || idx === pIdx);
                        return stageTpl?.fields || [];
                      } catch {
                        return [];
                      }
                    })();

                const rawEntries = prior.submittedData
                  ? Object.entries(prior.submittedData).filter(([k]) => !k.startsWith('_'))
                  : [];

                const submittedEntries = [...rawEntries].sort(([keyA], [keyB]) => {
                  const idxA = priorStageFields.findIndex((f) => f.id === keyA);
                  const idxB = priorStageFields.findIndex((f) => f.id === keyB);
                  if (idxA !== -1 && idxB !== -1) return idxA - idxB;
                  if (idxA !== -1) return -1;
                  if (idxB !== -1) return 1;
                  return 0;
                });

                return (
                  <div key={prior.stageId || pIdx} className="p-3.5 bg-white rounded-xl border border-slate-200 space-y-2 shadow-2xs">
                    <div className="flex items-center justify-between pb-1.5 border-b border-slate-100">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs flex items-center gap-1.5">
                          <History className="w-3.5 h-3.5 text-indigo-600" />
                          {prior.stageName}
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

          {/* Linked Parent / Sub-Flow Banners */}
          {flow.parentFlowId && (
            <div className="p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex items-center justify-between text-xs shadow-2xs">
              <div className="flex items-center gap-2">
                <GitFork className="w-4 h-4 text-indigo-600 shrink-0" />
                <span className="font-bold text-indigo-950">
                  Sub-Workflow spawned from Parent Requisition #{flow.parentFlowIndentNo || flow.parentFlowId}
                </span>
              </div>
              <span className="px-2 py-0.5 bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded">
                Child Track
              </span>
            </div>
          )}

          {flow.linkedSubFlows && flow.linkedSubFlows.length > 0 && (
            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2 shadow-2xs">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <GitFork className="w-4 h-4 text-indigo-600" />
                  Linked Sub-Workflows Spawned from Indent Triage
                </span>
                <span className="text-[10px] text-slate-500 font-medium">
                  {flow.linkedSubFlows.length} Active Tracks
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {flow.linkedSubFlows.map((sub, sIdx) => (
                  <div key={sIdx} className="p-2.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between shadow-2xs">
                    <div className="space-y-0.5">
                      <span className="text-xs font-bold text-slate-900 block">{sub.name}</span>
                      <span className="text-[10px] text-slate-500 font-mono">Ref: {sub.indentNo || sub.id} • {sub.itemCount} items</span>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                      sub.type === 'STORE_DISPATCH' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                    }`}>
                      {sub.status || 'Active'}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Current Stage Form Inputs */}
          <form id="stage-action-form" onSubmit={handleSubmit} className="space-y-4">
            {/* STAGE 2: PHYSICAL STORE CHECK & TRIAGE REGISTER */}
            {isStage2CheckStock && (
              <div className="p-4 bg-emerald-50/50 border border-emerald-200 rounded-xl space-y-4">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <span className="text-xs font-extrabold text-emerald-950 flex items-center gap-1.5 uppercase tracking-wide">
                      <Boxes className="w-4 h-4 text-emerald-700 shrink-0" />
                      Physical Store Check &amp; Triage Register
                    </span>
                    <p className="text-[11px] text-emerald-800/80 mt-0.5">
                      Verify physical count on the shelf (no computer inventory record needed). Adjust approved quantities based on actual work necessity, and allocate items to Store Dispatch or Purchase.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      const newId = `item_stk_${Date.now()}`;
                      setTriageItems([
                        ...triageItems,
                        {
                          id: newId,
                          itemDescription: '',
                          requestedQty: 1,
                          qty: 1,
                          unit: 'Nos',
                          workPurpose: '',
                          physicalStockFound: 0,
                          storeBinLocation: '',
                          storeVerifiedQty: 1,
                          qtyRevisionReason: '',
                          storeQty: 0,
                          purchaseQty: 1,
                          holdQty: 0,
                          triageAllocation: 'PURCHASE',
                        },
                      ]);
                    }}
                    className="px-2.5 py-1 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add Item Line</span>
                  </button>
                </div>

                {triageItems.length === 0 ? (
                  <div className="p-6 bg-white border border-emerald-200 rounded-xl text-center space-y-2">
                    <p className="text-xs text-slate-500 italic">No line items received yet from Stage 1 requisition.</p>
                    <button
                      type="button"
                      onClick={() => {
                        const newId = `item_stk_${Date.now()}`;
                        setTriageItems([
                          {
                            id: newId,
                            itemDescription: 'Item 1',
                            requestedQty: 10,
                            qty: 10,
                            unit: 'Nos',
                            workPurpose: 'Site Work',
                            physicalStockFound: 5,
                            storeBinLocation: 'Rack A-01',
                            storeVerifiedQty: 10,
                            qtyRevisionReason: '',
                            storeQty: 5,
                            purchaseQty: 5,
                            holdQty: 0,
                            triageAllocation: 'SPLIT',
                          },
                        ]);
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-lg cursor-pointer"
                    >
                      + Add Item Entry to Check Stock
                    </button>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {triageItems.map((item, idx) => {
                      const approved = item.storeVerifiedQty !== undefined ? Number(item.storeVerifiedQty) : Number(item.requestedQty || 1);
                      const requested = Number(item.requestedQty || 1);
                      const isQtyChanged = approved !== requested;
                      const storeQ = Number(item.storeQty || 0);
                      const purchaseQ = Number(item.purchaseQty || 0);
                      const holdQ = Number(item.holdQty || 0);
                      const totalAllocated = storeQ + purchaseQ + holdQ;
                      const isAllocValid = Math.abs(totalAllocated - approved) < 0.001;

                      return (
                        <div key={item.id || idx} className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-2xs space-y-3">
                          {/* Item Title & Purpose Banner */}
                          <div className="flex items-start justify-between gap-2 flex-wrap border-b border-slate-100 pb-2">
                            <div className="space-y-0.5 flex-1 min-w-[200px]">
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-[11px] font-bold text-slate-400">#{idx + 1}</span>
                                <input
                                  type="text"
                                  value={item.itemDescription}
                                  onChange={(e) => {
                                    const next = [...triageItems];
                                    next[idx] = { ...item, itemDescription: e.target.value };
                                    setTriageItems(next);
                                  }}
                                  placeholder="Item Description"
                                  className="font-bold text-xs text-slate-900 border-b border-transparent hover:border-slate-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5 w-full max-w-sm"
                                />
                              </div>
                              <div className="flex items-center gap-2 text-[11px] text-slate-500 pl-5">
                                <span>Purpose / Work:</span>
                                <input
                                  type="text"
                                  value={item.workPurpose || ''}
                                  onChange={(e) => {
                                    const next = [...triageItems];
                                    next[idx] = { ...item, workPurpose: e.target.value };
                                    setTriageItems(next);
                                  }}
                                  placeholder="e.g. Pier 4 foundation pour"
                                  className="text-slate-700 font-medium italic border-b border-slate-200 focus:border-indigo-500 focus:outline-none px-1 py-0.5 w-full max-w-xs"
                                />
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 text-[11px] font-bold rounded">
                                Requested: {requested} {item.unit || 'Nos'}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setTriageItems(triageItems.filter((_, i) => i !== idx));
                                }}
                                className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors cursor-pointer"
                                title="Remove item"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* 3 Step Execution Grid: Physical Check -> Approved Qty -> Triage Split */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                            {/* Step 1: Physical Store Verification */}
                            <div className="p-2.5 bg-emerald-50/60 border border-emerald-200 rounded-lg space-y-2">
                              <span className="text-[10px] font-extrabold text-emerald-900 uppercase tracking-wide block">
                                1. Physical Store Verification
                              </span>
                              <div className="space-y-1.5">
                                <div>
                                  <label className="text-[10px] font-semibold text-emerald-800 block">
                                    Physical Stock Found on Shelf:
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.physicalStockFound ?? 0}
                                    onChange={(e) => {
                                      const found = parseFloat(e.target.value) || 0;
                                      const next = [...triageItems];
                                      // Suggest storeQty up to found count, balance to purchase
                                      const autoStore = Math.min(found, approved);
                                      const autoPurch = Math.max(0, approved - autoStore);
                                      next[idx] = {
                                        ...item,
                                        physicalStockFound: found,
                                        storeQty: autoStore,
                                        purchaseQty: autoPurch,
                                        holdQty: 0,
                                        triageAllocation: autoStore > 0 && autoPurch > 0 ? 'SPLIT' : autoStore > 0 ? 'STORE' : 'PURCHASE',
                                      };
                                      setTriageItems(next);
                                    }}
                                    className="w-full text-xs bg-white border border-emerald-300 rounded px-2 py-1 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="text-[10px] font-semibold text-emerald-800 block">
                                    Bin / Shelf / Rack Location:
                                  </label>
                                  <div className="relative">
                                    <input
                                      type="text"
                                      value={item.storeBinLocation || ''}
                                      onChange={(e) => {
                                        const next = [...triageItems];
                                        next[idx] = { ...item, storeBinLocation: e.target.value };
                                        setTriageItems(next);
                                      }}
                                      placeholder="e.g. Rack A-04 or Yard Bay 2"
                                      className="w-full text-xs bg-white border border-emerald-300 rounded pl-6 pr-2 py-1 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                                    />
                                    <MapPin className="w-3 h-3 text-emerald-600 absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none" />
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Step 2: Store Approved / Revised Quantity */}
                            <div className="p-2.5 bg-blue-50/60 border border-blue-200 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold text-blue-900 uppercase tracking-wide">
                                  2. Store Approved Qty
                                </span>
                                {isQtyChanged && (
                                  <span className={`px-1.5 py-0.5 text-[9px] font-bold rounded flex items-center gap-0.5 ${
                                    approved < requested ? 'bg-rose-100 text-rose-700' : 'bg-blue-100 text-blue-800'
                                  }`}>
                                    {approved < requested ? <TrendingDown className="w-2.5 h-2.5" /> : <TrendingUp className="w-2.5 h-2.5" />}
                                    {approved < requested ? `Reduced -${requested - approved}` : `Increased +${approved - requested}`}
                                  </span>
                                )}
                              </div>

                              <div className="space-y-1.5">
                                <div>
                                  <label className="text-[10px] font-semibold text-blue-800 block">
                                    Approved Total Quantity:
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.storeVerifiedQty ?? requested}
                                    onChange={(e) => {
                                      const nextApproved = parseFloat(e.target.value) || 0;
                                      const next = [...triageItems];
                                      const currentStore = item.storeQty || 0;
                                      const autoStore = Math.min(currentStore, nextApproved);
                                      const autoPurch = Math.max(0, nextApproved - autoStore);
                                      next[idx] = {
                                        ...item,
                                        storeVerifiedQty: nextApproved,
                                        qty: nextApproved,
                                        storeQty: autoStore,
                                        purchaseQty: autoPurch,
                                        holdQty: 0,
                                        triageAllocation: autoStore > 0 && autoPurch > 0 ? 'SPLIT' : autoStore > 0 ? 'STORE' : 'PURCHASE',
                                      };
                                      setTriageItems(next);
                                    }}
                                    className="w-full text-xs bg-white border border-blue-300 rounded px-2 py-1 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-blue-500"
                                  />
                                </div>

                                {isQtyChanged ? (
                                  <div>
                                    <label className="text-[10px] font-bold text-rose-700 block">
                                      Revision Reason <span className="text-rose-500">*</span>:
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={item.qtyRevisionReason || ''}
                                      onChange={(e) => {
                                        const next = [...triageItems];
                                        next[idx] = { ...item, qtyRevisionReason: e.target.value };
                                        setTriageItems(next);
                                      }}
                                      placeholder="e.g. Reduced based on Pier 4 site check"
                                      className="w-full text-xs bg-white border border-rose-300 rounded px-2 py-1 font-medium text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500"
                                    />
                                  </div>
                                ) : (
                                  <p className="text-[10px] text-blue-700/80 pt-1 italic">
                                    Approved quantity matches requested ({requested} {item.unit}).
                                  </p>
                                )}
                              </div>
                            </div>

                            {/* Step 3: Multi-Route Triage Allocation Split */}
                            <div className="p-2.5 bg-amber-50/60 border border-amber-200 rounded-lg space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-extrabold text-amber-900 uppercase tracking-wide">
                                  3. Indent Triage Split
                                </span>
                                {!isAllocValid && (
                                  <span className="text-[9px] font-bold text-rose-600 bg-rose-100 px-1 py-0.5 rounded">
                                    Sum ({totalAllocated}) ≠ Approved ({approved})
                                  </span>
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-1.5">
                                <div>
                                  <label className="text-[9px] font-bold text-emerald-800 block truncate" title="Store Dispatch">
                                    Store Qty:
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.storeQty ?? 0}
                                    onChange={(e) => {
                                      const sq = parseFloat(e.target.value) || 0;
                                      const next = [...triageItems];
                                      const pq = Math.max(0, approved - sq);
                                      next[idx] = {
                                        ...item,
                                        storeQty: sq,
                                        purchaseQty: pq,
                                        holdQty: 0,
                                        triageAllocation: sq > 0 && pq > 0 ? 'SPLIT' : sq > 0 ? 'STORE' : 'PURCHASE',
                                      };
                                      setTriageItems(next);
                                    }}
                                    className="w-full text-xs bg-white border border-emerald-300 rounded px-1.5 py-1 font-bold text-emerald-900 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-amber-800 block truncate" title="Purchase Indent">
                                    Purchase Qty:
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.purchaseQty ?? 0}
                                    onChange={(e) => {
                                      const pq = parseFloat(e.target.value) || 0;
                                      const next = [...triageItems];
                                      next[idx] = {
                                        ...item,
                                        purchaseQty: pq,
                                        triageAllocation: (item.storeQty || 0) > 0 && pq > 0 ? 'SPLIT' : (item.storeQty || 0) > 0 ? 'STORE' : 'PURCHASE',
                                      };
                                      setTriageItems(next);
                                    }}
                                    className="w-full text-xs bg-white border border-amber-300 rounded px-1.5 py-1 font-bold text-amber-900 focus:outline-none"
                                  />
                                </div>
                                <div>
                                  <label className="text-[9px] font-bold text-slate-600 block truncate" title="Hold / Deferred">
                                    Hold Qty:
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    step="any"
                                    value={item.holdQty ?? 0}
                                    onChange={(e) => {
                                      const hq = parseFloat(e.target.value) || 0;
                                      const next = [...triageItems];
                                      next[idx] = {
                                        ...item,
                                        holdQty: hq,
                                        triageAllocation: hq === approved ? 'HOLD' : item.triageAllocation,
                                      };
                                      setTriageItems(next);
                                    }}
                                    className="w-full text-xs bg-white border border-slate-300 rounded px-1.5 py-1 font-bold text-slate-700 focus:outline-none"
                                  />
                                </div>
                              </div>

                              {/* Quick Fill Action Buttons */}
                              <div className="flex items-center gap-1 pt-0.5">
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...triageItems];
                                    next[idx] = { ...item, storeQty: approved, purchaseQty: 0, holdQty: 0, triageAllocation: 'STORE' };
                                    setTriageItems(next);
                                  }}
                                  className="text-[9px] px-1.5 py-0.5 bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold rounded cursor-pointer"
                                  title="Fulfill 100% from store"
                                >
                                  Store 100%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...triageItems];
                                    next[idx] = { ...item, storeQty: 0, purchaseQty: approved, holdQty: 0, triageAllocation: 'PURCHASE' };
                                    setTriageItems(next);
                                  }}
                                  className="text-[9px] px-1.5 py-0.5 bg-amber-100 hover:bg-amber-200 text-amber-800 font-bold rounded cursor-pointer"
                                  title="Send 100% to purchase"
                                >
                                  Purchase 100%
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const half = Math.floor(approved / 2);
                                    const next = [...triageItems];
                                    next[idx] = { ...item, storeQty: half, purchaseQty: approved - half, holdQty: 0, triageAllocation: 'SPLIT' };
                                    setTriageItems(next);
                                  }}
                                  className="text-[9px] px-1.5 py-0.5 bg-blue-100 hover:bg-blue-200 text-blue-800 font-bold rounded cursor-pointer"
                                  title="Split 50/50"
                                >
                                  50/50
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    const next = [...triageItems];
                                    next[idx] = { ...item, storeQty: 0, purchaseQty: 0, holdQty: approved, triageAllocation: 'HOLD' };
                                    setTriageItems(next);
                                  }}
                                  className="text-[9px] px-1.5 py-0.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded cursor-pointer"
                                  title="Hold item"
                                >
                                  Hold
                                </button>
                              </div>
                            </div>
                          </div>

                          {/* Allocation Destination Status Badge */}
                          <div className="pt-1 flex items-center justify-between text-[11px] border-t border-slate-100">
                            <span className="text-slate-500">Destination Workflow Routing:</span>
                            {storeQ > 0 && purchaseQ > 0 ? (
                              <span className="font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded border border-blue-200 flex items-center gap-1">
                                <Split className="w-3 h-3" />
                                Split: {storeQ} {item.unit} to Store Dispatch + {purchaseQ} {item.unit} to Purchase Indent
                              </span>
                            ) : storeQ > 0 ? (
                              <span className="font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 flex items-center gap-1">
                                <PackageCheck className="w-3 h-3" />
                                100% Store Material Dispatch ({storeQ} {item.unit})
                              </span>
                            ) : holdQ === approved && approved > 0 ? (
                              <span className="font-bold text-slate-700 bg-slate-100 px-2 py-0.5 rounded border border-slate-300 flex items-center gap-1">
                                <Archive className="w-3 h-3" />
                                Held / Deferred ({holdQ} {item.unit})
                              </span>
                            ) : (
                              <span className="font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200 flex items-center gap-1">
                                <ArrowRight className="w-3 h-3" />
                                100% Purchase Indent to PO ({purchaseQ} {item.unit})
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Triage Summary Footer */}
                {triageItems.length > 0 && (
                  <div className="p-3 bg-white border border-emerald-300 rounded-xl flex items-center justify-between flex-wrap gap-2 text-xs shadow-2xs">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-extrabold text-slate-900">Summary:</span>
                      <span className="px-2 py-0.5 bg-emerald-100 text-emerald-900 font-bold rounded flex items-center gap-1">
                        <PackageCheck className="w-3 h-3" />
                        Store Dispatch: {triageItems.filter((i) => (i.storeQty || 0) > 0).length} Items
                      </span>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-900 font-bold rounded flex items-center gap-1">
                        <ArrowRight className="w-3 h-3" />
                        Purchase Indent: {triageItems.filter((i) => (i.purchaseQty || 0) > 0).length} Items
                      </span>
                      {triageItems.some((i) => (i.holdQty || 0) > 0) && (
                        <span className="px-2 py-0.5 bg-slate-100 text-slate-800 font-bold rounded flex items-center gap-1">
                          <Archive className="w-3 h-3" />
                          Hold: {triageItems.filter((i) => (i.holdQty || 0) > 0).length} Items
                        </span>
                      )}
                    </div>
                    <span className="text-[10px] text-emerald-800 font-medium">
                      ⚡ Automatically spawns linked sub-workflows on stage submit
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* PURCHASER / ASSIGNEE LINE ITEM REVIEW & QUANTITY REVISION */}
            {purchaserItems.length > 0 && !isStage2CheckStock && (
              <div className="p-3.5 bg-indigo-50/60 border border-indigo-200 rounded-xl space-y-3">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <div>
                    <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5 uppercase tracking-wide">
                      <Layers className="w-4 h-4 text-indigo-700 shrink-0" />
                      Requisition Line Items ({purchaserItems.length} Items)
                    </span>
                    <p className="text-[11px] text-indigo-900/80 mt-0.5">
                      Verify requisition quantities against work purpose. Adjust or revise quantities if required (with revision reason).
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                  <table className="w-full text-xs text-left">
                    <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                      <tr>
                        <th className="py-2 px-2 w-8 text-center">#</th>
                        <th className="py-2 px-2 min-w-[140px]">Item Description</th>
                        <th className="py-2 px-2 min-w-[120px]">Work / Purpose</th>
                        <th className="py-2 px-2 w-24 text-center">Requested</th>
                        <th className="py-2 px-2 w-28 text-center">Effective Qty</th>
                        <th className="py-2 px-2 w-16">Unit</th>
                        <th className="py-2 px-2 min-w-[160px]">Revision Reason (if altered)</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {purchaserItems.map((item, pIdx) => {
                        const origReq = item.requestedQty || item.qty;
                        const isQtyAltered = item.qty !== origReq;

                        return (
                          <tr key={item.id || pIdx} className="hover:bg-indigo-50/30">
                            <td className="py-2 px-2 text-center font-mono text-slate-400 text-[11px]">
                              {pIdx + 1}
                            </td>
                            <td className="py-2 px-2 font-bold text-slate-800">
                              {item.itemDescription}
                            </td>
                            <td className="py-2 px-2 text-slate-600 text-[11px] italic">
                              {item.workPurpose || '-'}
                            </td>
                            <td className="py-2 px-2 text-center font-semibold text-slate-500 text-[11px]">
                              {origReq}
                            </td>
                            <td className="py-1.5 px-2 text-center">
                              <input
                                type="number"
                                min="0"
                                step="any"
                                value={item.qty}
                                onChange={(e) => {
                                  const nextQty = parseFloat(e.target.value) || 0;
                                  const next = [...purchaserItems];
                                  next[pIdx] = {
                                    ...item,
                                    qty: nextQty,
                                    purchaserQty: nextQty,
                                  };
                                  setPurchaserItems(next);
                                }}
                                className="w-20 text-center text-xs bg-slate-50 focus:bg-white border border-slate-300 focus:border-indigo-500 rounded px-1.5 py-1 font-bold text-slate-800 focus:outline-none"
                              />
                            </td>
                            <td className="py-2 px-2 font-medium text-slate-600">
                              {item.unit || 'Nos'}
                            </td>
                            <td className="py-1.5 px-2">
                              {isQtyAltered ? (
                                <input
                                  type="text"
                                  value={item.qtyRevisionReason || ''}
                                  onChange={(e) => {
                                    const next = [...purchaserItems];
                                    next[pIdx] = { ...item, qtyRevisionReason: e.target.value };
                                    setPurchaserItems(next);
                                  }}
                                  placeholder="Reason (e.g. MOQ / package size)"
                                  className="w-full text-xs bg-rose-50 border border-rose-300 focus:border-rose-500 rounded px-2 py-1 font-medium text-rose-900 focus:outline-none"
                                />
                              ) : (
                                <span className="text-slate-400 text-[11px] italic">Matches requested</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-3.5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="font-bold text-indigo-950 text-xs uppercase tracking-wider flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  {stage.stageName}
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
                      ? storageAdapter.getMasterSites()
                      : field.label.toLowerCase().includes('priority')
                      ? storageAdapter.getMasterPriorities()
                      : field.label.toLowerCase().includes('vendor')
                      ? storageAdapter.getMasterVendors()
                      : ['Option 1', 'Option 2'];

                    return (
                      <div key={field.id} className="space-y-1">
                        <label className="block text-xs font-semibold text-slate-700">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        <div className="flex items-center gap-1.5">
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
                          <button
                            type="button"
                            onClick={() =>
                              setQuickAddSelectModal({
                                isOpen: true,
                                fieldId: field.id,
                                fieldLabel: field.label,
                                options,
                              })
                            }
                            className="p-2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 rounded-lg text-xs font-bold transition-all shrink-0 cursor-pointer"
                            title={`Add option to ${field.label}`}
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
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

                  if (field.type === 'MULTI_ITEM_TABLE') {
                    const rows = Array.isArray(val) ? val : [];
                    const columns = (field.columns && field.columns.length > 0)
                      ? field.columns
                      : typeof field.defaultValue === 'string' && field.defaultValue.trim()
                      ? field.defaultValue.split(',').map(s => s.trim()).filter(Boolean).map(colLabel => ({
                          key: colLabel.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                          label: colLabel,
                          type: (colLabel.toLowerCase().includes('rate') || colLabel.toLowerCase().includes('qty') || colLabel.toLowerCase().includes('quantity') || colLabel.toLowerCase().includes('amount') || colLabel.toLowerCase().includes('nos') || colLabel.toLowerCase().includes('price')) ? ('NUMBER' as const) : ('TEXT' as const)
                        }))
                      : [
                          { key: 'item_description', label: 'Item Description', type: 'TEXT' as const },
                          { key: 'quantity', label: 'Quantity', type: 'NUMBER' as const },
                          { key: 'unit', label: 'Unit', type: 'TEXT' as const },
                          { key: 'work_purpose', label: 'Work / Purpose Details', type: 'TEXT' as const },
                          { key: 'remarks', label: 'Remarks', type: 'TEXT' as const },
                        ];

                    const handleAddRow = () => {
                      const newRow: Record<string, any> = { id: `row_${Date.now()}` };
                      columns.forEach((col) => {
                        newRow[col.key] = col.type === 'NUMBER' ? 0 : '';
                      });
                      handleFieldChange(field.id, [...rows, newRow]);
                    };

                    const handleRowChange = (rowIdx: number, colKey: string, colValue: any) => {
                      const updatedRows = [...rows];
                      const row = { ...updatedRows[rowIdx], [colKey]: colValue };
                      updatedRows[rowIdx] = row;
                      handleFieldChange(field.id, updatedRows);
                    };

                    const handleDeleteRow = (rowIdx: number) => {
                      const updatedRows = rows.filter((_, idx) => idx !== rowIdx);
                      handleFieldChange(field.id, updatedRows);
                    };

                    const hasAmountCol = columns.some((c) => c.key === 'amount' || c.key.includes('amount') || c.key === 'total_amount');
                    const totalSum = hasAmountCol ? rows.reduce((acc, row) => acc + (parseFloat(row.amount) || 0), 0) : 0;

                    return (
                      <div key={field.id} className="sm:col-span-2 space-y-2 p-3.5 bg-slate-50 border border-indigo-200 rounded-xl">
                        <div className="flex items-center justify-between gap-2">
                          <div>
                            <span className="text-xs font-extrabold text-indigo-950 flex items-center gap-1.5">
                              <Layers className="w-4 h-4 text-indigo-600" />
                              <span>{field.label} ({rows.length} Multi-Item Entries)</span>
                            </span>
                            <p className="text-[10px] text-slate-500 font-medium">
                              ⚡ Auto-assigned &amp; inherited from master requisition data. Modify or add entries below.
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={handleAddRow}
                            className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-[11px] font-bold rounded-lg transition-all flex items-center gap-1 shadow-xs cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>Add Item Row</span>
                          </button>
                        </div>

                        <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
                          <table className="w-full text-xs text-left">
                            <thead className="bg-slate-100 text-slate-800 font-bold border-b border-slate-200">
                              <tr>
                                <th className="py-2 px-2 w-8 text-center">#</th>
                                {columns.map((col) => (
                                  <th key={col.key} className="py-2 px-2 min-w-[110px]">
                                    {col.label}
                                  </th>
                                ))}
                                <th className="py-2 px-1 w-8 text-center"></th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                              {rows.length === 0 ? (
                                <tr>
                                  <td colSpan={columns.length + 2} className="py-4 text-center text-slate-400 italic text-[11px]">
                                    No item rows added yet. Click &quot;Add Item Row&quot; above to add entry.
                                  </td>
                                </tr>
                              ) : (
                                rows.map((row, rIdx) => (
                                  <tr key={row.id || rIdx} className="hover:bg-indigo-50/30">
                                    <td className="py-2 px-2 text-center font-mono text-slate-400 text-[11px]">
                                      {rIdx + 1}
                                    </td>
                                    {columns.map((col) => (
                                      <td key={col.key} className="py-1.5 px-1.5">
                                        <input
                                          type={col.type === 'NUMBER' ? 'number' : 'text'}
                                          step={col.type === 'NUMBER' ? 'any' : undefined}
                                          value={row[col.key] !== undefined ? row[col.key] : ''}
                                          onChange={(e) =>
                                            handleRowChange(
                                              rIdx,
                                              col.key,
                                              col.type === 'NUMBER' ? parseFloat(e.target.value) || 0 : e.target.value
                                            )
                                          }
                                          placeholder={col.label}
                                          className="w-full text-xs bg-slate-50 focus:bg-white border border-slate-200 focus:border-indigo-500 rounded-md px-2 py-1 font-semibold text-slate-800 focus:outline-none"
                                        />
                                      </td>
                                    ))}
                                    <td className="py-1.5 px-1 text-center">
                                      <button
                                        type="button"
                                        onClick={() => handleDeleteRow(rIdx)}
                                        className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors cursor-pointer"
                                        title="Delete row"
                                      >
                                        <Trash2 className="w-3.5 h-3.5" />
                                      </button>
                                    </td>
                                  </tr>
                                ))
                              )}
                            </tbody>
                            {hasAmountCol && totalSum > 0 && (
                              <tfoot className="bg-slate-50 border-t border-slate-200 font-bold">
                                <tr>
                                  <td colSpan={columns.length} className="py-2 px-3 text-right text-slate-600 text-[11px]">
                                    Total Itemized Value:
                                  </td>
                                  <td className="py-2 px-2 text-indigo-700 font-mono text-xs font-black">
                                    ₹{totalSum.toLocaleString('en-IN')}
                                  </td>
                                  <td></td>
                                </tr>
                              </tfoot>
                            )}
                          </table>
                        </div>
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

            {/* Upcoming Downstream Stage & Conditional Branch Preview Accordion (Super Admin & Admin) */}
            {(() => {
              const isAdminOrSuper = isUserSuperAdmin(currentUser) || isUserAdminOrSuperAdmin(currentUser);
              if (!isAdminOrSuper) return null;
              const fullTemplateStages = getFullTemplateStagesForFlow();
              if (!fullTemplateStages || fullTemplateStages.length <= stageIndex + 1) return null;

              return (
                <FmsStagePreviewAccordion
                  stages={fullTemplateStages}
                  startIndex={stageIndex + 1}
                  title="Upcoming Workflow & Conditional Branches"
                  subtitle="Preview downstream stage fields that will unlock upon completing this stage."
                  activeDecision={currentActiveDecision}
                  compact={true}
                />
              );
            })()}

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
            disabled={flow.isClosed || flow.status === 'CLOSED'}
            className={`px-5 py-2 font-bold rounded-lg text-xs shadow-sm transition-all flex items-center gap-1.5 ${
              flow.isClosed || flow.status === 'CLOSED'
                ? 'bg-slate-300 text-slate-500 cursor-not-allowed border border-slate-300'
                : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white cursor-pointer'
            }`}
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>{flow.isClosed || flow.status === 'CLOSED' ? 'Workflow Closed (Locked)' : 'Submit & Advance Stage'}</span>
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

        {/* Quick Add Select Option Overlay */}
        {quickAddSelectModal && quickAddSelectModal.isOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/70 backdrop-blur-xs p-4">
            <div className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden">
              <div className="flex items-center justify-between p-4 bg-slate-900 text-white">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Plus className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-xs">
                      Quick Add Option
                    </h4>
                    <p className="text-[10px] text-slate-300">
                      Add new choice for {quickAddSelectModal.fieldLabel}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setQuickAddSelectModal(null);
                    setQuickAddOptionValue('');
                  }}
                  className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleAddSelectOption} className="p-4 space-y-4 text-xs">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    New Option Label for {quickAddSelectModal.fieldLabel} <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    autoFocus
                    placeholder={`Enter new option for ${quickAddSelectModal.fieldLabel}...`}
                    value={quickAddOptionValue}
                    onChange={(e) => setQuickAddOptionValue(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Saves this option instantly to the Master Registry / Field config and selects it.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => {
                      setQuickAddSelectModal(null);
                      setQuickAddOptionValue('');
                    }}
                    className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Add &amp; Select</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Embedded CS Creator Modal Overlay */}
        {isCsModalOpen && (
          <EmbeddedCsCreatorModal
            isOpen={isCsModalOpen}
            flow={flow}
            stageIndex={stageIndex}
            currentUser={currentUser}
            onClose={() => setIsCsModalOpen(false)}
            onSaveAndLink={(cs) => {
              setLinkedCsSheet(cs);
              handleFieldChange('csSheetId', cs.id);
              handleFieldChange('csIndentNo', cs.indentNo);
              setIsCsModalOpen(false);
            }}
          />
        )}

        {/* Embedded L1 Approval Modal Overlay */}
        {isL1ModalOpen && (
          <EmbeddedL1ApprovalModal
            isOpen={isL1ModalOpen}
            flow={flow}
            stageIndex={stageIndex}
            csSheet={linkedCsSheet}
            currentUser={currentUser}
            onClose={() => setIsL1ModalOpen(false)}
            onApproveL1={(updatedCs, remarks) => {
              setIsL1ModalOpen(false);
              const payload = {
                ...formData,
                status: 'APPROVED',
                approvalRemarks: remarks,
                csSheetId: updatedCs.id,
                csNumber: updatedCs.indentNo,
              };
              onSubmitStage(flow, stageIndex, payload, 'Yes');
              onClose();
            }}
          />
        )}

        {/* FMS Stage Override Modal Overlay */}
        {isOverrideModalOpen && (
          <FmsStageOverrideModal
            isOpen={isOverrideModalOpen}
            flow={flow}
            currentUser={currentUser}
            onClose={() => setIsOverrideModalOpen(false)}
            onOverrideSuccess={(updatedFlow) => {
              setIsOverrideModalOpen(false);
              onClose();
            }}
          />
        )}
      </div>
    </div>
  );
};
