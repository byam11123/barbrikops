import React, { useState, useEffect, useMemo, useCallback } from 'react';
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
  Split,
  Eye
} from 'lucide-react';
import { FmsInstance, FmsLineItem, FmsStageExecution, FmsStageFieldConfig, UserProfile, FmsStageTemplate, ComparativeStatement, BankPaymentRecord, BeneficiaryRecord, isUserSuperAdmin, isUserAdminOrSuperAdmin } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { getBestPurchaseAssistant } from '../../services/stageAssignment';
import { 
  FMS_STANDARD_PURCHASE_STAGES, 
  FMS_PO_PAYMENT_STAGES,
  FMS_PURCHASE_TO_STORE_DISPATCH_STAGES,
  FMS_STORE_TO_SITE_DISPATCH_STAGES,
  FMS_SITE_RECEIVE_STAGES
} from '../../data/initialData';
import { FileUploadField } from '../common/FileUploadField';
import { FilePreviewModal } from '../common/FilePreviewModal';
import { FmsStagePreviewAccordion } from './FmsStagePreviewAccordion';
import { EmbeddedCsCreatorModal } from './EmbeddedCsCreatorModal';
import { EmbeddedL1ApprovalModal } from './EmbeddedL1ApprovalModal';
import { FmsStageOverrideModal } from './FmsStageOverrideModal';
import { FmsItemTable } from './FmsItemTable';
import { StoreTriageModal } from './StoreTriageModal';
import { NewBankPaymentModal } from '../banking/NewBankPaymentModal';
import { AccountsDoubleEntryVerificationPanel } from '../banking/AccountsDoubleEntryVerificationPanel';
import { FileSpreadsheet, Award, ShieldAlert, Building2, Landmark, Upload, Truck } from 'lucide-react';

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
  const [isStage4PaymentModalOpen, setIsStage4PaymentModalOpen] = useState(false);
  const [selectedStage4VendorGroup, setSelectedStage4VendorGroup] = useState<{ vendorId: string; vendorName: string; totalAmount: number; suggestedPoNo: string } | null>(null);
  const [linkedCsSheet, setLinkedCsSheet] = useState<ComparativeStatement | null>(null);
  const [initiatedStage4VendorIds, setInitiatedStage4VendorIds] = useState<string[]>([]);
  const [isDoubleEntryVerified, setIsDoubleEntryVerified] = useState(false);

  const handleStage4PaymentSubmit = (paymentRecord: BankPaymentRecord) => {
    if (!flow) return;

    if (selectedStage4VendorGroup) {
      setInitiatedStage4VendorIds((prev) => Array.from(new Set([...prev, selectedStage4VendorGroup.vendorId])));
    }

    // 1. Create linked PO_TO_PAYMENT workflow using centralized storageAdapter method
    const poNum = paymentRecord.billNoPo || selectedStage4VendorGroup?.suggestedPoNo || `BPL/PO/${flow.indentNo}`;
    const newPayFlow = storageAdapter.createPoToPaymentFmsInstance(paymentRecord, undefined, currentUser);
    if (!newPayFlow.linkedFlowId) {
      newPayFlow.linkedFlowId = flow.flowId;
      newPayFlow.poNumber = poNum;
      storageAdapter.saveFmsFlows(storageAdapter.getFmsFlows().map((f) => (f.id === newPayFlow.id ? newPayFlow : f)));
    }

    // 2. Extract erpPoDocument and poNumber into poList
    const poDocUrl = paymentRecord.poUpload || paymentRecord.cancelledChequeUrl || 'https://pdfobject.com/pdf/sample.pdf';

    const newPoItem = {
      poNumber: poNum,
      poDocumentUrl: poDocUrl,
      vendorName: paymentRecord.vendorName,
      amount: paymentRecord.amountToBePaid,
      paymentRecordId: paymentRecord.id,
      submittedAt: new Date().toISOString()
    };

    const existingPoList = Array.isArray(formData.poList) ? formData.poList : [];
    const poList = [...existingPoList.filter((p: any) => p.poNumber !== poNum), newPoItem];

    const updatedSubmitted = {
      ...formData,
      poList,
      poNumber: poNum,
      erpPoDocument: poDocUrl,
      poDocumentPdf: poDocUrl,
      bankPaymentRecordId: paymentRecord.id,
      linkedPaymentFlowId: newPayFlow.flowId,
      completedAt: new Date().toISOString()
    };

    setFormData(updatedSubmitted);
    setIsStage4PaymentModalOpen(false);
    setSelectedStage4VendorGroup(null);
  };

  const handleCreditPoFieldChange = (
    grp: { vendorId: string; vendorName: string; totalAmount: number; suggestedPoNo: string },
    poNum: string,
    poDocUrl: string,
    updatedNumbers?: Record<string, string>,
    updatedDocs?: Record<string, string>
  ) => {
    const numbers = updatedNumbers || formData.vendorPoNumbers || {};
    const docs = updatedDocs || formData.vendorPoDocuments || {};

    const existingPoList = Array.isArray(formData.poList) ? formData.poList : [];
    const updatedItem = {
      poNumber: poNum,
      poDocumentUrl: poDocUrl,
      vendorName: grp.vendorName,
      vendorId: grp.vendorId,
      amount: grp.totalAmount,
      paymentTerms: 'CREDIT',
      submittedAt: new Date().toISOString()
    };
    const nextPoList = [
      ...existingPoList.filter((p: any) => p.vendorId !== grp.vendorId && p.vendorName !== grp.vendorName),
      updatedItem
    ];

    setFormData((prev) => ({
      ...prev,
      vendorPoNumbers: { ...numbers, [grp.vendorId]: poNum },
      vendorPoDocuments: { ...docs, [grp.vendorId]: poDocUrl },
      poList: nextPoList,
      poNumber: poNum,
      erpPoDocument: poDocUrl,
      poDocumentPdf: poDocUrl
    }));
  };

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

    // 10-Stage PO_TO_PAYMENT Workflow Fields
    if (flow.flowType === 'PO_TO_PAYMENT' || flow.templateKey === 'PO_TO_PAYMENT') {
      const stageDef = FMS_PO_PAYMENT_STAGES[stageIndex] || FMS_PO_PAYMENT_STAGES.find((s) => s.stageId === stage.stageId);
      if (stageDef?.fields && stageDef.fields.length > 0) {
        return stageDef.fields;
      }
    }

    // Purchase to Store Dispatch Workflow Presets (4 Stages)
    if (flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' || flow.templateKey === 'PURCHASE_TO_STORE_DISPATCH') {
      const stageDef = FMS_PURCHASE_TO_STORE_DISPATCH_STAGES.find(
        (s) => s.stageId === stage.stageId ||
               s.name.toLowerCase() === stage.stageName?.toLowerCase() ||
               (stage.stageName?.toLowerCase().includes('vehicle') && s.name.toLowerCase().includes('vehicle'))
      ) || FMS_PURCHASE_TO_STORE_DISPATCH_STAGES[stageIndex];
      if (stageDef?.fields && stageDef.fields.length > 0) {
        return stageDef.fields;
      }
    }

    // Store to Site Dispatch Workflow Presets (4 Stages)
    if (flow.flowType === 'STORE_TO_SITE_DISPATCH' || flow.templateKey === 'STORE_TO_SITE_DISPATCH') {
      const stageDef = FMS_STORE_TO_SITE_DISPATCH_STAGES.find(
        (s) => s.stageId === stage.stageId ||
               s.name.toLowerCase() === stage.stageName?.toLowerCase() ||
               (stage.stageName?.toLowerCase().includes('vehicle') && s.name.toLowerCase().includes('vehicle')) ||
               (stage.stageName?.toLowerCase().includes('stn') && s.name.toLowerCase().includes('stn')) ||
               (stage.stageName?.toLowerCase().includes('gate pass') && s.name.toLowerCase().includes('gate pass')) ||
               (stage.stageName?.toLowerCase().includes('collect') && s.name.toLowerCase().includes('collect'))
      ) || FMS_STORE_TO_SITE_DISPATCH_STAGES[stageIndex];
      if (stageDef?.fields && stageDef.fields.length > 0) {
        return stageDef.fields;
      }
    }

    // Site Material Receive Workflow Presets (Standalone 1 Stage)
    if (flow.flowType === 'SITE_RECEIVE' || flow.templateKey === 'SITE_RECEIVE') {
      const stageDef = FMS_SITE_RECEIVE_STAGES[stageIndex] || FMS_SITE_RECEIVE_STAGES.find((s) => s.stageId === stage.stageId);
      if (stageDef?.fields && stageDef.fields.length > 0) {
        return stageDef.fields;
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

    // Indent to PO Purchase Workflow Presets (5-Stage Architecture)
    if (
      flow.flowType === 'INDENT_PURCHASE' || 
      flow.flowType === 'INDENT_TO_PO' || 
      flow.templateKey === 'INDENT_TO_PO' || 
      flow.templateKey === 'INDENT_PURCHASE' ||
      flow.indentNo?.endsWith('-PUR') ||
      flow.flowId?.includes('-PUR')
    ) {
      // Stage 5 (Material Collection): Only show fields relevant to logistics
      if (stage.stageId === 'STG-06' || stageIndex === 5 || stage.stageName?.toLowerCase().includes('material collection')) {
        return [
          { id: 'vendorDispatchChallanNo', label: 'LR / Delivery Challan No.', type: 'TEXT', required: true, placeholder: 'e.g. DC/2026/884 or Transporter LR No.' },
          { id: 'vehicleNumber', label: 'Vehicle Number', type: 'TEXT', required: true, placeholder: 'e.g. CG-04-1234' },
          { id: 'expectedStoreArrivalDate', label: 'Collection / Expected Arrival Date', type: 'DATE', required: true },
          { id: 'transporterDriverDetails', label: 'Transporter & Driver Contact Details', type: 'TEXT', placeholder: 'e.g. Driver Rajesh (9827012345)' },
          { id: 'dispatchHandoverNotes', label: 'Logistics & Store Handover Notes', type: 'TEXTAREA', placeholder: 'Enter dispatch details or arrival instructions...' }
        ];
      }

      const stageDef = FMS_STANDARD_PURCHASE_STAGES[stageIndex] || FMS_STANDARD_PURCHASE_STAGES.find((s: any) => s.stageId === stage.stageId);
      if (stageDef?.fields && stageDef.fields.length > 0) {
        return stageDef.fields;
      }
    }

    // Dedicated Vehicle & Logistics Stage Definition (Store to Site or General Logistics)
    if (
      stage.stageName?.toLowerCase().includes('vehicle') ||
      stage.stageName?.toLowerCase().includes('arrange vehicle') ||
      stage.stageId === 'STG-SSD-03' ||
      stage.stageId === 'STG-PSD-04'
    ) {
      return [
        { id: 'vehicleNumber', label: 'Vehicle Number', type: 'TEXT', required: true, placeholder: 'e.g. CG-04-1234' },
        { id: 'driverDetails', label: 'Driver Details (Name & Phone)', type: 'TEXT', required: true, placeholder: 'e.g. Rajesh Kumar (9827012345)' },
        { id: 'isEwayBillRequired', label: 'E-Way Bill Required?', type: 'SELECT', options: ['Yes', 'No'], required: true, defaultValue: 'Yes' },
        { id: 'ewayBillNumber', label: 'E-Way Bill Number', type: 'TEXT', placeholder: 'e.g. EWB-994821038' },
        { id: 'vehicleRemarks', label: 'Logistics / Transporter Remarks', type: 'TEXTAREA', placeholder: 'Enter logistics details, driver contact, route notes...' }
      ];
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

  // Check if Stage 4 requires payment initiation for all awarded vendor cards
  const isStage4 = fields.some((f) => f.type === 'SPLIT_PO_GENERATOR');

  const isStage5MaterialCollection = Boolean(
    flow && stage &&
    (flow.templateKey === 'INDENT_TO_PO' ||
     flow.templateKey === 'INDENT_PURCHASE' ||
     flow.flowType === 'INDENT_TO_PO' ||
     flow.flowType === 'INDENT_PURCHASE' ||
     flow.indentNo?.endsWith('-PUR') ||
     flow.flowId?.includes('-PUR')) &&
    (stage.stageId === 'STG-06' || stageIndex === 5 || stage.stageName?.toLowerCase().includes('material collection'))
  );

  const bestAssistantName = useMemo(() => {
    try {
      const allFlows = storageAdapter.getFmsFlows();
      const allTasks = storageAdapter.getDelegationTasks();
      const allUsers = storageAdapter.getUsers();
      const best = getBestPurchaseAssistant(allFlows, allTasks, allUsers);
      return best?.name || 'Rajendra';
    } catch {
      return 'Rajendra';
    }
  }, []);

  const activeCsForStage4 = isStage4
    ? linkedCsSheet || storageAdapter.getComparativeStatements().find((c) => c.indentNo === flow?.indentNo)
    : null;

  const stage4VendorCardIds = useMemo(() => {
    if (!activeCsForStage4 || !activeCsForStage4.awardedVendorMap) return [];
    const ids: string[] = [];
    activeCsForStage4.vendors.forEach((vendor) => {
      const hasAwardedItems = activeCsForStage4.items.some(
        (item) => activeCsForStage4.awardedVendorMap?.[item.id] === vendor.vendorId
      );
      if (hasAwardedItems) ids.push(vendor.vendorId);
    });
    return ids;
  }, [activeCsForStage4]);

  const isVendorInitiated = useCallback((vendorId: string, vendorName: string) => {
    if (initiatedStage4VendorIds.includes(vendorId)) return true;
    if (Array.isArray(formData.poList) && formData.poList.some((p: any) => p.vendorName === vendorName)) return true;
    if (stage?.submittedData?.poList && Array.isArray(stage.submittedData.poList) && stage.submittedData.poList.some((p: any) => p.vendorName === vendorName)) return true;
    const existingPayments = storageAdapter.getBankPayments();
    if (existingPayments.some((bp) => (bp.sheetNo === flow?.indentNo || (bp as any).linkedFlowId === flow?.flowId) && bp.vendorName === vendorName)) return true;
    return false;
  }, [initiatedStage4VendorIds, formData.poList, stage?.submittedData?.poList, flow?.indentNo, flow?.flowId]);

  const isStage4PendingPayment =
    isStage4 &&
    stage4VendorCardIds.length > 0 &&
    !stage4VendorCardIds.every((vId) => {
      const grp = activeCsForStage4?.vendors.find((v) => v.vendorId === vId);
      const csRawTerms = (grp?.paymentTerms || '').toLowerCase();
      const derivedCsTerms: 'ADVANCE' | 'CREDIT' = (csRawTerms.includes('credit') || csRawTerms.includes('net') || csRawTerms.includes('days credit')) ? 'CREDIT' : 'ADVANCE';
      const terms = formData.vendorPaymentTerms?.[vId] || derivedCsTerms;
      if (terms === 'CREDIT') return true; // Credit POs pass Stage 4 without advance payment initiation
      return isVendorInitiated(vId, grp?.vendorName || '');
    });

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

  const isPoToPaymentFlow = Boolean(flow && (flow.flowType === 'PO_TO_PAYMENT' || flow.templateKey === 'PO_TO_PAYMENT'));
  const isPaymentApprovalStage = Boolean(
    isPoToPaymentFlow &&
    stage &&
    (stage.stageId === 'STG-PAY-06' || stageIndex === 5 || stage.stageName.toLowerCase().includes('payment approval'))
  );
  const [isPriorStagesExpanded, setIsPriorStagesExpanded] = useState(false);

  // Look up matching BankPaymentRecord and BeneficiaryRecord for Stage 5 Payment Approval
  const targetPaymentRecord = useMemo(() => {
    if (!flow) return null;
    const bankPayments = storageAdapter.getBankPayments();
    return bankPayments.find(
      (p) => (flow.paymentId && p.id === flow.paymentId) ||
             (flow.paymentSheetNo && p.sheetNo === flow.paymentSheetNo) ||
             (flow.poNumber && (p.billNoPo === flow.poNumber || p.sheetNo === flow.poNumber)) ||
             (flow.indentNo && (p.sheetNo === flow.indentNo || p.billNoPo === flow.indentNo)) ||
             (flow.vendorName && p.vendorName && p.vendorName.toLowerCase().trim() === flow.vendorName.toLowerCase().trim())
    ) || null;
  }, [flow]);

  const targetBeneficiaryRecord = useMemo(() => {
    if (!flow && !targetPaymentRecord) return null;
    const beneficiaries = storageAdapter.getBeneficiaryRecords();
    return beneficiaries.find(
      (b: BeneficiaryRecord) => (targetPaymentRecord?.linkedBeneficiarySheetNo && b.sheetNo === targetPaymentRecord.linkedBeneficiarySheetNo) ||
             (targetPaymentRecord?.vendorId && b.vendorId === targetPaymentRecord.vendorId) ||
             (targetPaymentRecord?.vendorName && b.beneficiaryName && b.beneficiaryName.toLowerCase().trim() === targetPaymentRecord.vendorName.toLowerCase().trim()) ||
             (flow?.vendorName && b.beneficiaryName && b.beneficiaryName.toLowerCase().trim() === flow.vendorName.toLowerCase().trim())
    ) || null;
  }, [targetPaymentRecord, flow]);

  const paymentVendorName = targetPaymentRecord?.vendorName || flow?.vendorName || 'Awarded Vendor';
  const paymentAmount = targetPaymentRecord?.amountToBePaid ?? flow?.poAmount ?? 0;
  const paymentPurpose = targetPaymentRecord?.purposeOfPayment || flow?.remarks || flow?.instanceDataPool?.purposeOfPayment || 'Operational Payment Requisition';
  const paymentSite = targetPaymentRecord?.site || flow?.siteName || 'Siladehi Site';
  const paymentRequestedBy = targetPaymentRecord?.requestedBy || targetPaymentRecord?.requestedByUserId || flow?.submittedBy || flow?.createdBy || 'Purchaser';
  const paymentPoRef = targetPaymentRecord?.billNoPo || flow?.poNumber || flow?.requisitionNumber || flow?.indentNo || '—';

  const benLegalTitle = targetPaymentRecord?.beneficiaryName || targetBeneficiaryRecord?.beneficiaryName || flow?.beneficiaryName || paymentVendorName;
  const benBankName = targetPaymentRecord?.bankName || targetBeneficiaryRecord?.bankName || flow?.beneficiaryBankName || 'State Bank of India';
  const rawAccountNo = targetPaymentRecord?.accountNo || targetPaymentRecord?.accountNoMasked || targetBeneficiaryRecord?.accountNo || flow?.beneficiaryAccountNo || '';
  const benAccountMasked = rawAccountNo
    ? (rawAccountNo.startsWith('••') ? rawAccountNo : `•••• •••• ${rawAccountNo.slice(-4)}`)
    : '•••• •••• 1923';
  const benIfsc = targetPaymentRecord?.ifscCode || targetBeneficiaryRecord?.ifscCode || flow?.beneficiaryIfsc || 'SBIN0001292';
  const paymentChequeProof = targetPaymentRecord?.cancelledChequeUrl || targetBeneficiaryRecord?.cancelledChequeUrl || flow?.cancelledChequeUrl;
  const paymentPoProof = targetPaymentRecord?.poUpload || (Array.isArray(formData.poList) && formData.poList[0]?.poDocumentUrl) || formData.erpPoDocument;

  const handleDirectorPaymentDecision = (decision: 'Yes' | 'No') => {
    if (!flow) return;
    const isApproved = decision === 'Yes';
    const statusVal = isApproved ? 'APPROVED' : 'REJECTED';
    const remarks = formData.approvalRemarks?.trim() || (isApproved ? 'Payment approved by Director' : 'Payment rejected by Director');

    if (targetPaymentRecord) {
      try {
        storageAdapter.updateBankPaymentStatus(targetPaymentRecord.id, 'approvalStatus', statusVal, currentUser);
      } catch (err) {
        console.error('Failed to sync bank payment status:', err);
      }
    }

    const payload = {
      ...formData,
      status: statusVal,
      approvalStatus: statusVal,
      approvalRemarks: remarks,
      approvedAmount: paymentAmount,
      approvedBy: currentUser.name,
      approvedByUserId: currentUser.userId,
      approvalTimestamp: new Date().toISOString(),
      _checkpoints: checkedCheckpoints,
      _totalCheckpoints: checkpoints.length,
    };

    onSubmitStage(flow, stageIndex, payload, decision);
    onClose();
  };

  const hasCsModuleEmbed = useMemo(
    () =>
      Boolean(
        flow &&
        (flow.flowType === 'INDENT_TO_PO' || flow.flowType === 'INDENT_PURCHASE' || flow.templateKey === 'INDENT_TO_PO') &&
        flow.flowType !== 'STORE_TO_SITE_DISPATCH' &&
        flow.flowType !== 'PURCHASE_TO_STORE_DISPATCH' &&
        !isPoToPaymentFlow &&
        fields.some((f) => f.type === 'CS_MODULE_EMBED')
      ),
    [flow, isPoToPaymentFlow, fields]
  );

  // If this stage is the CS quotation stage, automatically launch the CS workspace on execute
  useEffect(() => {
    if (isOpen && hasCsModuleEmbed) {
      setIsCsModalOpen(true);
    }
  }, [isOpen, hasCsModuleEmbed]);

  const isStage2CheckStock = Boolean(
    flow &&
    stage &&
    !hasCsModuleEmbed &&
    !fields.some((f) => f.type === 'CS_MODULE_EMBED') &&
    flow.flowType !== 'INDENT_PURCHASE' &&
    flow.flowType !== 'INDENT_TO_PO' &&
    flow.templateKey !== 'INDENT_TO_PO' &&
    flow.templateKey !== 'INDENT_PURCHASE' &&
    !flow.indentNo?.endsWith('-PUR') &&
    !flow.flowId?.includes('-PUR') &&
    (flow.flowType === 'CHECK_STOCK' || flow.templateKey === 'CHECK_STOCK') &&
    (stageIndex === 1 || stage.stageId === 'STG-STK-02' || stage.stageName.toUpperCase().includes('CHECK STOCK') || stage.stageName.toUpperCase().includes('TRIAGE'))
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
          let inherited: any[] = [];
          if (flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' && (stage.stageId === 'STG-PSD-01' || stageIndex === 0)) {
            const rawItems = flow.lineItems && flow.lineItems.length > 0 ? flow.lineItems : pool.requisitionItems || pool.lineItems || [];
            if (rawItems.length > 0) {
              inherited = rawItems.map((item: any, i: number) => {
                const q = item.purchaseQty || item.requestedQty || item.quantity || item.qty || 1;
                return {
                  id: item.id || `row_${i + 1}`,
                  item_description: item.itemDescription || item.description || `Item #${i + 1}`,
                  ordered_qty: q,
                  received_qty: q,
                  accepted_qty: q,
                  rejected_qty: 0,
                  rejection_reason: ''
                };
              });
            } else {
              inherited = [{
                id: 'row_1',
                item_description: flow.remarks || 'Consignment Item',
                ordered_qty: 1,
                received_qty: 1,
                accepted_qty: 1,
                rejected_qty: 0,
                rejection_reason: ''
              }];
            }
          } else {
            inherited = pool[f.id] || pool.multiItems || pool.requisitionItems || pool.lineItems || (flow.lineItems && flow.lineItems.length > 0 ? flow.lineItems.map((item: any, i: number) => ({
              id: item.id || `row_${i+1}`,
              item_description: item.itemDescription || item.description || '',
              quantity: item.requestedQty || item.storeQty || item.purchaseQty || item.quantity || 1,
              unit: item.unit || 'Nos',
              work_purpose: item.workPurpose || item.purpose || '',
              remarks: item.remarks || item.remark || item.triageAllocation || ''
            })) : []);
          }
          initial[f.id] = inherited;
        } else if (f.id === 'grnNumber' && !initial[f.id]) {
          initial[f.id] = pool.grnNumber || `BPL/GRN/${new Date().getFullYear()}/${(flow.indentNo || '001').replace(/[^a-zA-Z0-9]/g, '')}`;
        } else if (f.id === 'vendorChallanNo' && !initial[f.id]) {
          initial[f.id] = pool.vendorChallanNo || pool.vendorDispatchChallanNo || '';
        } else if ((f.id === 'receivedDate' || f.id === 'receiptDate' || f.id === 'inwardDate' || f.id === 'stnDate' || f.id === 'collectionDate' || f.id === 'dispatchDate') && !initial[f.id]) {
          initial[f.id] = pool[f.id] || new Date().toISOString().split('T')[0];
        } else if (f.id === 'siteGrnNumber' && !initial[f.id]) {
          initial[f.id] = pool.siteGrnNumber || `SITE/GRN/${new Date().getFullYear()}/${(flow.indentNo || '001').replace(/[^a-zA-Z0-9]/g, '')}`;
        } else if (f.id === 'stnNumber' && !initial[f.id]) {
          initial[f.id] = pool.stnNumber || `BPL/STN/${new Date().getFullYear()}/${(flow.indentNo || '001').replace(/[^a-zA-Z0-9]/g, '')}`;
        } else if (f.id === 'receivedBy' && !initial[f.id]) {
          initial[f.id] = pool.receivedBy || currentUser.name || 'Aman Kumar (Site Store)';
        } else if (f.id === 'receivedQty' && !initial[f.id]) {
          initial[f.id] = pool.receivedQty || (flow.lineItems?.[0]?.qty || 1);
        } else if ((f.id === 'poNumber' || f.id === 'poNo' || f.id === 'billNoOrPo') && (pool.billNoOrPo || pool.poNumber || flow.poNumber || flow.requisitionNumber || flow.indentNo)) {
          initial[f.id] = pool.billNoOrPo || pool.poNumber || flow.poNumber || flow.requisitionNumber || flow.indentNo;
        } else if ((f.id === 'vendorName' || f.id === 'vendor') && (pool.vendorName || flow.vendorName || targetPaymentRecord?.vendorName)) {
          initial[f.id] = pool.vendorName || flow.vendorName || targetPaymentRecord?.vendorName;
        } else if ((f.id === 'amountToBePaid' || f.id === 'poAmount' || f.id === 'approvedAmount' || f.id === 'poAmountDisplay') && (pool.amountToBePaid || pool.poAmount || flow.poAmount || targetPaymentRecord?.amountToBePaid)) {
          initial[f.id] = String(pool.amountToBePaid || pool.poAmount || flow.poAmount || targetPaymentRecord?.amountToBePaid || '');
        } else if ((f.id === 'purposeOfPayment' || f.id === 'purpose') && (pool.purposeOfPayment || flow.remarks || targetPaymentRecord?.purposeOfPayment)) {
          initial[f.id] = pool.purposeOfPayment || flow.remarks || targetPaymentRecord?.purposeOfPayment;
        } else if (f.id === 'siteName' && (pool.siteName || flow.siteName || targetPaymentRecord?.site)) {
          initial[f.id] = pool.siteName || flow.siteName || targetPaymentRecord?.site;
        } else if (f.id === 'indentNo' && (pool.indentNo || flow.indentNo || flow.requisitionNumber)) {
          initial[f.id] = pool.indentNo || flow.indentNo || flow.requisitionNumber;
        } else if (f.id === 'poDate' && (pool.poDate || flow.poDate || flow.createdAt)) {
          initial[f.id] = pool.poDate || flow.poDate || (flow.createdAt ? flow.createdAt.split(',')[0] : new Date().toLocaleDateString('en-GB'));
        } else if (f.id === 'requestedBy' && (pool.requestedBy || targetPaymentRecord?.requestedBy || flow.submittedBy || flow.createdBy)) {
          initial[f.id] = pool.requestedBy || targetPaymentRecord?.requestedBy || flow.submittedBy || flow.createdBy || 'Purchaser';
        } else if (f.id === 'poAttachmentUrl' && (pool.poAttachmentUrl || pool.poUploadLink || targetPaymentRecord?.poUpload || pool.erpPoDocument)) {
          initial[f.id] = pool.poAttachmentUrl || pool.poUploadLink || targetPaymentRecord?.poUpload || pool.erpPoDocument;
        } else if (f.id === 'paymentDoneScreenshot' && (pool.paymentDoneScreenshot || targetPaymentRecord?.paymentDoneProof || flow.stages?.find(s => s.submittedData?.paymentDoneScreenshot)?.submittedData?.paymentDoneScreenshot)) {
          initial[f.id] = pool.paymentDoneScreenshot || targetPaymentRecord?.paymentDoneProof || flow.stages?.find(s => s.submittedData?.paymentDoneScreenshot)?.submittedData?.paymentDoneScreenshot || '';
        } else if (f.id === 'utrNumber' && (pool.utrNumber || targetPaymentRecord?.remarks)) {
          initial[f.id] = pool.utrNumber || targetPaymentRecord?.remarks || '';
        } else {
          initial[f.id] = f.defaultValue || '';
        }
      });

      if (isStage4 || (isPoToPaymentFlow && (stage.stageId === 'STG-PAY-09' || stageIndex === 8))) {
        initial.poAssignTo = prevData.poAssignTo || pool.poAssignTo || flow.poAssignTo || bestAssistantName;
      }

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
      if (f.type === 'SPLIT_PO_GENERATOR') {
        if (isStage4 && activeCsForStage4) {
          for (const vId of stage4VendorCardIds) {
            const grp = activeCsForStage4.vendors.find((v) => v.vendorId === vId);
            const vendorName = grp?.vendorName || 'Awarded Vendor';
            const csRawTerms = (grp?.paymentTerms || '').toLowerCase();
            const derivedCsTerms: 'ADVANCE' | 'CREDIT' = (csRawTerms.includes('credit') || csRawTerms.includes('net') || csRawTerms.includes('days credit')) ? 'CREDIT' : 'ADVANCE';
            const terms = formData.vendorPaymentTerms?.[vId] || derivedCsTerms;
            const vendorShort = vendorName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
            const defaultPo = `BPL/PO/${flow.indentNo}/${vendorShort}`;

            if (terms === 'CREDIT') {
              const poNum = formData.vendorPoNumbers?.[vId] !== undefined ? String(formData.vendorPoNumbers[vId]).trim() : defaultPo;
              const poDoc = formData.vendorPoDocuments?.[vId];
              if (!poNum) {
                setError(`Please enter the PO Number for ${vendorName} before completing this stage.`);
                return;
              }
              if (!poDoc || String(poDoc).trim() === '') {
                setError(`Please upload the ERP PO PDF for ${vendorName} before completing this stage.`);
                return;
              }
            } else {
              // ADVANCE terms
              if (!isVendorInitiated(vId, vendorName)) {
                setError(`Please upload ERP PO & initiate payment for ${vendorName} before completing this stage.`);
                return;
              }
            }
          }
        }
        continue;
      }
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

    if (isStage4) {
      const chosenAssignee = formData.poAssignTo || bestAssistantName;
      if (!chosenAssignee || !String(chosenAssignee).trim()) {
        setError('Please select a Purchaser Assistant in "PO Assign To" before completing this stage.');
        return;
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

    // Consolidate all Credit POs into finalPoList
    let finalPoList = Array.isArray(formData.poList) ? [...formData.poList] : [];
    if (isStage4 && activeCsForStage4) {
      stage4VendorCardIds.forEach((vId) => {
        const grp = activeCsForStage4.vendors.find((v) => v.vendorId === vId);
        if (!grp) return;
        const vendorShort = (grp.vendorName || '').replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
        const defaultPo = `BPL/PO/${flow.indentNo}/${vendorShort}`;
        let vendorTotal = 0;
        activeCsForStage4.items.forEach((item) => {
          if (activeCsForStage4.awardedVendorMap?.[item.id] === vId) {
            const rateInfo = grp.itemRates?.[item.id];
            const landedRate = rateInfo?.landedRate || 0;
            vendorTotal += landedRate * item.qty;
          }
        });
        const csRawTerms = (grp.paymentTerms || '').toLowerCase();
        const derivedCsTerms: 'ADVANCE' | 'CREDIT' = (csRawTerms.includes('credit') || csRawTerms.includes('net') || csRawTerms.includes('days credit')) ? 'CREDIT' : 'ADVANCE';
        const terms = formData.vendorPaymentTerms?.[vId] || derivedCsTerms;

        if (terms === 'CREDIT') {
          const poNum = formData.vendorPoNumbers?.[vId] !== undefined ? String(formData.vendorPoNumbers[vId]).trim() : defaultPo;
          const poDoc = formData.vendorPoDocuments?.[vId] || '';
          const existingIdx = finalPoList.findIndex((p: any) => p.vendorName === grp.vendorName || p.poNumber === poNum);
          const creditPoObj = {
            poNumber: poNum,
            poDocumentUrl: poDoc,
            vendorName: grp.vendorName,
            vendorId: grp.vendorId,
            amount: vendorTotal,
            paymentTerms: 'CREDIT',
            submittedAt: new Date().toISOString()
          };
          if (existingIdx >= 0) {
            finalPoList[existingIdx] = creditPoObj;
          } else {
            finalPoList.push(creditPoObj);
          }

          // Create / update BankPaymentRecord with PENDING_GRN status without spawning PO_TO_PAYMENT FMS
          try {
            const allBankPayments = storageAdapter.getBankPayments();
            const existingBpIdx = allBankPayments.findIndex(
              (p) => p.billNoPo === poNum || p.sheetNo === poNum || (p.sheetNo === flow.indentNo && p.vendorName === grp.vendorName)
            );
            const creditPaymentRecord: BankPaymentRecord = {
              id: existingBpIdx >= 0 ? allBankPayments[existingBpIdx].id : `bank-cr-${Date.now()}-${vId.slice(-4)}`,
              sheetNo: poNum,
              timestamp: new Date().toLocaleString('en-GB'),
              vendorId: grp.vendorId,
              vendorName: grp.vendorName,
              beneficiaryName: grp.vendorName,
              isNameMismatch: false,
              purposeOfPayment: `Material Supply - Credit Terms (PO #${poNum})`,
              requestedBy: currentUser.name || 'Shyam Rao Sureshe',
              requestedByUserId: currentUser.userId,
              site: flow.siteName || 'Bijetala Site',
              modeOfPayment: 'ACCOUNT',
              amountToBePaid: vendorTotal,
              plannedDate: new Date().toLocaleDateString('en-GB'),
              poUpload: poDoc,
              billNoPo: poNum,
              beneficiaryMasterStatus: 'VERIFIED',
              approvalStatus: 'PENDING_GRN',
              paymentEntry: 'PENDING',
              paymentStatus: 'PENDING',
              paymentTerms: 'CREDIT',
              remarks: `Credit purchase - Awaiting GRN from Store Manager (Indent #${flow.indentNo})`,
            };
            let updatedBpList: BankPaymentRecord[];
            if (existingBpIdx >= 0) {
              updatedBpList = [...allBankPayments];
              updatedBpList[existingBpIdx] = { ...allBankPayments[existingBpIdx], ...creditPaymentRecord, approvalStatus: 'PENDING_GRN' };
            } else {
              updatedBpList = [creditPaymentRecord, ...allBankPayments];
            }
            storageAdapter.saveBankPayments(updatedBpList);
          } catch (bpErr) {
            console.error('Failed to save credit bank payment record:', bpErr);
          }
        }
      });
    }

    const firstPo = finalPoList[0];
    const submissionPayload = {
      ...formData,
      poList: finalPoList,
      poAssignTo: formData.poAssignTo || bestAssistantName,
      ...(firstPo ? {
        poNumber: firstPo.poNumber,
        erpPoDocument: firstPo.poDocumentUrl,
        poDocumentPdf: firstPo.poDocumentUrl,
        vendorName: firstPo.vendorName,
        paymentTerms: firstPo.paymentTerms || 'CREDIT',
      } : {}),
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

  // Dedicated routing for CS_MODULE_EMBED (Stage 2 & Stage 3): renders EmbeddedCsCreatorModal directly
  if (
    (flow.flowType === 'INDENT_TO_PO' || flow.flowType === 'INDENT_PURCHASE' || flow.templateKey === 'INDENT_TO_PO') &&
    flow.flowType !== 'STORE_TO_SITE_DISPATCH' &&
    flow.flowType !== 'PURCHASE_TO_STORE_DISPATCH' &&
    flow.flowType !== 'CHECK_STOCK' &&
    flow.flowType !== 'PO_TO_PAYMENT' &&
    flow.flowType !== 'SITE_RECEIVE' &&
    ((fields.some((f) => f.type === 'CS_MODULE_EMBED') && stage.stageId !== 'STG-04' && stageIndex !== 3) ||
      (stageIndex === 1 || stageIndex === 2 || stage.stageId === 'STG-02' || stage.stageId === 'STG-03'))
  ) {
    return (
      <EmbeddedCsCreatorModal
        isOpen={isOpen}
        flow={flow}
        stageIndex={stageIndex}
        currentUser={currentUser}
        onClose={onClose}
        onSaveAndLink={(cs) => {
          setLinkedCsSheet(cs);
          const payload = {
            ...formData,
            csSheetId: cs.id,
            csIndentNo: cs.indentNo,
            status: 'COMPLETED',
            vendorsEvaluated: cs.vendors.map((v) => v.vendorName).join(', '),
            itemsCount: cs.items.length,
          };
          onSubmitStage(flow, stageIndex, payload);
          onClose();
        }}
      />
    );
  }

  // Dedicated routing for CS_L1_APPROVAL_EMBED (Stage 4: Director L1 CS Approval): renders EmbeddedL1ApprovalModal directly
  if (
    (flow.flowType === 'INDENT_TO_PO' || flow.flowType === 'INDENT_PURCHASE' || flow.templateKey === 'INDENT_TO_PO') &&
    flow.flowType !== 'STORE_TO_SITE_DISPATCH' &&
    flow.flowType !== 'PURCHASE_TO_STORE_DISPATCH' &&
    flow.flowType !== 'CHECK_STOCK' &&
    flow.flowType !== 'PO_TO_PAYMENT' &&
    flow.flowType !== 'SITE_RECEIVE' &&
    (fields.some((f) => f.type === 'CS_L1_APPROVAL_EMBED') ||
      (stageIndex === 3 || stage.stageId === 'STG-04' || stage.stageName?.toLowerCase().includes('director') || stage.stageName?.toLowerCase().includes('l1')))
  ) {
    const activeCs = linkedCsSheet || storageAdapter.getComparativeStatements().find((c) => c.indentNo === flow.indentNo);
    return (
      <EmbeddedL1ApprovalModal
        isOpen={isOpen}
        flow={flow}
        stageIndex={stageIndex}
        csSheet={activeCs || null}
        currentUser={currentUser}
        onClose={onClose}
        onReturnToPurchaser={(_updatedFlow) => {
          onClose();
        }}
        onApproveL1={(updatedCs, remarks) => {
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
    );
  }

  // Dedicated routing for CHECK_STOCK Stage 2 (Check Stock & Store Triage): renders StoreTriageModal directly (Dark UI)
  if (isStage2CheckStock) {
    return (
      <StoreTriageModal
        flow={flow}
        currentUser={currentUser}
        readOnly={
          stage.status === 'Done' ||
          stage.status === 'Completed' ||
          stage.status === 'Skipped' ||
          Boolean(stage.actualDateTime || stage.actualTimestamp)
        }
        onClose={onClose}
        onCompleteTriage={(updatedFlow, triageSummary) => {
          const enrichedLineItems = (updatedFlow.lineItems || []).map((item) => ({
            ...item,
            storeQty: (item.csrQty || 0) + (item.otherSiteQty || 0),
            purchaseQty: item.purchaseQtyRequired ?? item.purchaseQty ?? 0,
          }));

          const payload = {
            ...formData,
            triageLineItems: enrichedLineItems,
            lineItems: enrichedLineItems,
            csrStockSummary: enrichedLineItems.map((i) => ({
              id: i.id,
              itemDescription: i.itemDescription,
              csrStock: i.csrStock,
              otherSiteStock: i.otherSiteStock,
              stockSiteName: i.stockSiteName,
            })),
            storeItemsCount: triageSummary.storeDispatchCount,
            purchaseItemsCount: triageSummary.purchaseCount,
            archivedItemsCount: triageSummary.archivedCount,
            triageNotes: triageSummary.triageNotes,
            status: 'COMPLETED',
            availabilityDecision:
              triageSummary.purchaseCount === 0
                ? 'ALL'
                : triageSummary.storeDispatchCount === 0
                ? 'NONE'
                : 'PARTIAL',
          };

          const decision = triageSummary.purchaseCount > 0 ? 'Yes' : 'No';
          onSubmitStage(updatedFlow, stageIndex, payload, decision);
          onClose();
        }}
      />
    );
  }

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

          {/* Dedicated Director Payment Approval Summary Card (PO_TO_PAYMENT Stage 5) */}
          {isPaymentApprovalStage && (
            <div className="p-5 bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-xl border border-indigo-500/40 space-y-4">
              {/* Header & Net Payable Big Badge */}
              <div className="flex items-start justify-between flex-wrap gap-4 border-b border-indigo-800/60 pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 flex items-center gap-1">
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                      Director Payment Authorization Required
                    </span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 font-mono">
                      Stage 6 of 9
                    </span>
                  </div>
                  <h4 className="text-lg font-black text-white tracking-tight flex items-center gap-2">
                    <Building2 className="w-5 h-5 text-amber-300 shrink-0" />
                    <span>{paymentVendorName}</span>
                  </h4>
                  <p className="text-xs text-indigo-200 flex items-center gap-2">
                    <span>PO Ref: <strong className="text-white font-mono">{paymentPoRef}</strong></span>
                    <span>•</span>
                    <span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5 text-slate-400" /> {paymentSite}</span>
                  </p>
                </div>

                <div className="bg-slate-900/90 border border-emerald-500/40 rounded-xl px-4 py-2.5 text-right shadow-inner">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
                    Net Payable Amount
                  </span>
                  <span className="text-2xl sm:text-3xl font-black text-emerald-400 tracking-tight font-mono">
                    ₹{Number(paymentAmount).toLocaleString('en-IN')}
                  </span>
                </div>
              </div>

              {/* Primary Metadata Details Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">PO / Bill Voucher</span>
                  <span className="text-white font-bold font-mono truncate block mt-0.5" title={paymentPoRef}>
                    {paymentPoRef}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Project / Site</span>
                  <span className="text-white font-bold truncate block mt-0.5" title={paymentSite}>
                    {paymentSite}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Requested By</span>
                  <span className="text-white font-bold truncate block mt-0.5" title={paymentRequestedBy}>
                    {paymentRequestedBy}
                  </span>
                </div>

                <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80">
                  <span className="text-[10px] text-slate-400 font-bold block uppercase tracking-wider">Payment Vehicle</span>
                  <span className="text-amber-300 font-black block mt-0.5 truncate">
                    {targetPaymentRecord?.modeOfPayment || flow?.paymentMode || 'ACCOUNT'}
                  </span>
                </div>
              </div>

              {/* Purpose of Payment Box */}
              <div className="p-3 bg-indigo-900/40 border border-indigo-700/50 rounded-xl text-xs space-y-1">
                <div className="flex items-center gap-1.5 text-indigo-300 text-[10px] font-bold uppercase tracking-wider">
                  <Info className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Purpose of Payment / Work Particulars</span>
                </div>
                <p className="text-slate-100 font-medium text-xs leading-relaxed">
                  {paymentPurpose}
                </p>
              </div>

              {/* Beneficiary Bank Account Details Card */}
              <div className="p-3.5 bg-slate-950/70 border border-slate-700/80 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <Landmark className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-black text-white uppercase tracking-wider">
                      Verified Beneficiary Bank Account
                    </span>
                    <span className="px-2 py-0.5 rounded text-[9px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      VERIFIED
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    {paymentChequeProof && (
                      <button
                        type="button"
                        onClick={() => setPreviewFile({ url: paymentChequeProof, name: `Cancelled_Cheque_${paymentVendorName}.jpg` })}
                        className="text-[11px] font-bold text-indigo-300 hover:text-white inline-flex items-center gap-1 underline cursor-pointer"
                      >
                        <Paperclip className="w-3 h-3" />
                        <span>View Cheque</span>
                      </button>
                    )}
                    {paymentPoProof && (
                      <button
                        type="button"
                        onClick={() => setPreviewFile({ url: paymentPoProof, name: `Voucher_${paymentPoRef}.pdf` })}
                        className="text-[11px] font-bold text-amber-300 hover:text-white inline-flex items-center gap-1 underline cursor-pointer"
                      >
                        <FileText className="w-3 h-3" />
                        <span>View Invoice/PO</span>
                      </button>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Beneficiary Legal Name</span>
                    <span className="text-slate-200 font-bold truncate block">{benLegalTitle}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Bank Name</span>
                    <span className="text-slate-200 font-bold truncate block">{benBankName}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">Account Number</span>
                    <span className="text-emerald-400 font-mono font-bold flex items-center gap-1">
                      <Lock className="w-3 h-3 text-slate-400 shrink-0" />
                      {benAccountMasked}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block font-semibold">IFSC Code</span>
                    <span className="text-white font-mono font-bold">{benIfsc}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Stage 6 Logistics Summary: Dispatch Readiness Card */}
          {(stage.stageId === 'STG-06' || (stageIndex === 5 && (flow.flowType === 'INDENT_PURCHASE' || flow.flowType === 'INDENT_TO_PO'))) && (
            <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md border border-indigo-500/40 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-indigo-500/30 border border-indigo-400/40 text-amber-300 flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5 text-amber-300" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-white">Dispatch Readiness &amp; Logistics Summary</h4>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold">
                        PO Issued &amp; Ready
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-200 mt-0.5">
                      Vendor: <strong className="text-amber-300">{flow.vendorName || (Array.isArray(formData.poList) && formData.poList[0]?.vendorName) || 'Awarded Vendor'}</strong> • PO Ref: <strong className="text-white font-mono">{flow.poNumber || `BPL/PO/${flow.indentNo}`}</strong>
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    const docUrl = (Array.isArray(formData.poList) && formData.poList[0]?.poDocumentUrl) || formData.erpPoDocument || 'https://pdfobject.com/pdf/sample.pdf';
                    setPreviewFile({ url: docUrl, name: `ERP_PO_${flow.poNumber || flow.indentNo}.pdf` });
                  }}
                  className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <FileText className="w-4 h-4" />
                  <span>View ERP PO PDF</span>
                </button>
              </div>

              {/* Items to Collect */}
              {Array.isArray(flow.lineItems) && flow.lineItems.length > 0 && (
                <div className="pt-2 border-t border-slate-800 text-xs space-y-1">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Items to Collect ({flow.lineItems.length} Items):</span>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {flow.lineItems.map((it, idx) => (
                      <span key={idx} className="px-2 py-0.5 bg-slate-800 border border-slate-700 text-slate-200 rounded-md text-[11px] font-medium">
                        {it.itemDescription || (it as any).itemName || `Item #${idx+1}`} ({it.requestedQty || it.qty || 1} {it.unit || 'Nos'})
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stage 9 Purchaser Intimation: Send Payment Details to Get Material */}
          {isPoToPaymentFlow && (stage.stageId === 'STG-PAY-09' || stageIndex === 8) && (
            <div className="p-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl shadow-md border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 flex items-center justify-center font-bold">
                    <Truck className="w-5 h-5 text-emerald-400" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h4 className="font-black text-sm text-white">Send Payment Details &amp; Material Collection Intimation</h4>
                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold">
                        Payment Disbursed
                      </span>
                    </div>
                    <p className="text-[11px] text-indigo-200 mt-0.5">
                      Assigned to Purchaser (<strong className="text-amber-300">{stage.assignee || 'Shyam Rao Sureshe / Vivek'}</strong>) • Intimate vendor with UTR and schedule material collection / dispatch
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {(formData.poAttachmentUrl || targetPaymentRecord?.poUpload) && (
                    <button
                      type="button"
                      onClick={() => {
                        const url = formData.poAttachmentUrl || targetPaymentRecord?.poUpload;
                        setPreviewFile({ url, name: `PO_Voucher_${formData.billNoOrPo || flow.poNumber}.pdf` });
                      }}
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-lg text-xs border border-slate-700 flex items-center gap-1.5 cursor-pointer"
                    >
                      <Paperclip className="w-3.5 h-3.5 text-indigo-400" />
                      <span>View PO</span>
                    </button>
                  )}
                  {(formData.paymentDoneScreenshot || targetPaymentRecord?.paymentDoneProof) && (
                    <button
                      type="button"
                      onClick={() => {
                        const url = formData.paymentDoneScreenshot || targetPaymentRecord?.paymentDoneProof;
                        setPreviewFile({ url, name: `Payment_Screenshot_${formData.billNoOrPo || flow.poNumber}.jpg` });
                      }}
                      className="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white font-bold rounded-lg text-xs shadow-sm flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>View Payment Screenshot</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Grid of Key Payment & Requisition Fields */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs pt-1 border-t border-slate-800">
                <div className="p-2 bg-slate-800/80 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-semibold">Bill / PO No.</span>
                  <span className="text-white font-mono font-bold truncate block">{formData.billNoOrPo || flow.poNumber || '—'}</span>
                </div>
                <div className="p-2 bg-slate-800/80 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-semibold">Vendor Name</span>
                  <span className="text-amber-300 font-bold truncate block">{formData.vendorName || flow.vendorName || '—'}</span>
                </div>
                <div className="p-2 bg-slate-800/80 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-semibold">Indent No.</span>
                  <span className="text-white font-mono font-bold truncate block">{formData.indentNo || flow.indentNo || '—'}</span>
                </div>
                <div className="p-2 bg-slate-800/80 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-semibold">PO Date</span>
                  <span className="text-slate-200 font-bold truncate block">{formData.poDate || flow.poDate || '—'}</span>
                </div>
                <div className="p-2 bg-slate-800/80 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-semibold">Disbursed Amount</span>
                  <span className="text-emerald-400 font-mono font-bold truncate block">₹{Number(formData.poAmount || flow.poAmount || 0).toLocaleString('en-IN')}</span>
                </div>
                <div className="p-2 bg-slate-800/80 rounded-lg">
                  <span className="text-[10px] text-slate-400 block font-semibold">Delivery Site</span>
                  <span className="text-slate-200 font-bold truncate block">{formData.siteName || flow.siteName || '—'}</span>
                </div>
                <div className="p-2 bg-slate-800/80 rounded-lg col-span-2">
                  <span className="text-[10px] text-slate-400 block font-semibold">Settlement UTR Ref</span>
                  <span className="text-white font-mono font-bold truncate block">{formData.utrNumber || flow.instanceDataPool?.utrNumber || targetPaymentRecord?.remarks || 'UTR Confirmed'}</span>
                </div>
              </div>
            </div>
          )}

          {/* Embedded Sub-Task Banner: CS Sheet Builder (Strictly INDENT_TO_PO purchase quotation stages, NEVER STORE_TO_SITE_DISPATCH, NEVER PURCHASE_TO_STORE_DISPATCH) */}
          {(flow.flowType === 'INDENT_TO_PO' || flow.templateKey === 'INDENT_TO_PO' || flow.flowType === 'INDENT_PURCHASE') &&
           flow.flowType !== 'STORE_TO_SITE_DISPATCH' &&
           flow.flowType !== 'PURCHASE_TO_STORE_DISPATCH' &&
           flow.flowType !== 'CHECK_STOCK' &&
           flow.flowType !== 'PO_TO_PAYMENT' &&
           flow.flowType !== 'SITE_RECEIVE' &&
           !isPoToPaymentFlow &&
           (stage.stageId === 'STG-02' ||
            stage.stageId === 'STG-IND-03' ||
            stage.stageName.toLowerCase().includes('quotation') ||
            stage.stageName.toLowerCase().includes('comparative') ||
            /\bcs\b/i.test(stage.stageName)) && (
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

          {/* Embedded Sub-Task Banner: L1 Approval (Strictly INDENT_TO_PO / INDENT_PURCHASE only, NEVER STORE_TO_SITE_DISPATCH or PURCHASE_TO_STORE_DISPATCH) */}
          {!isPoToPaymentFlow &&
           (flow.flowType === 'INDENT_TO_PO' || flow.flowType === 'INDENT_PURCHASE' || flow.templateKey === 'INDENT_TO_PO' || flow.templateKey === 'INDENT_PURCHASE') &&
           flow.flowType !== 'STORE_TO_SITE_DISPATCH' &&
           flow.flowType !== 'PURCHASE_TO_STORE_DISPATCH' &&
           flow.flowType !== 'CHECK_STOCK' &&
           flow.flowType !== 'PO_TO_PAYMENT' &&
           flow.flowType !== 'SITE_RECEIVE' &&
           (stage.stageName.toLowerCase().includes('l1') ||
            (stage.stageName.toLowerCase().includes('approval') && !stage.stageName.toLowerCase().includes('payment')) ||
            stage.stageId === 'STG-03' ||
            stage.stageId === 'STG-04') && (
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
          {priorStages.length > 0 && (() => {
            const priorStagesCards = priorStages.map((prior, pIdx) => {
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
                      <div className="space-y-3 pt-0.5 text-[11px]">
                        {/* Normal / Scalar fields grid */}
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {submittedEntries
                            .map(([k, rawVal]) => {
                              let v = rawVal;
                              if (typeof v === 'string' && (v.trim().startsWith('[') || v.trim().startsWith('{'))) {
                                try {
                                  v = JSON.parse(v);
                                } catch {
                                  // keep raw
                                }
                              }

                              // If corrupted [object Object] string, attempt recovery from lineItems
                              if (typeof v === 'string' && (v === '[object Object]' || v.includes('[object Object]'))) {
                                if (k.toLowerCase().includes('item') && flow.lineItems && flow.lineItems.length > 0) {
                                  v = flow.lineItems;
                                }
                              }

                              const isItemArray = Array.isArray(v);
                              const isItemObj = typeof v === 'object' && v !== null && (
                                Array.isArray((v as any).items) ||
                                (k.toLowerCase().includes('item') && Object.values(v).every((sub) => typeof sub === 'object' && sub !== null))
                              );

                              if (isItemArray || isItemObj) {
                                return null; // rendered below in itemized section
                              }

                              const displayLabel = resolveFieldLabel(k, prior, pIdx);
                              const isObject = typeof v === 'object' && v !== null;
                              const strVal = isObject
                                ? Object.entries(v)
                                    .map(([sk, sv]) => `${sk}: ${typeof sv === 'object' ? JSON.stringify(sv) : sv}`)
                                    .join(' • ')
                                : String(v ?? '');
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
                                      onClick={() => {
                                        let ext = '.pdf';
                                        if (strVal.startsWith('data:image/')) ext = '.png';
                                        else if (/\.(png|jpe?g|gif|webp|svg)$/i.test(strVal)) ext = '';
                                        const baseName = isRefFile
                                          ? strVal.replace(/^\[File:\s*/, '').replace(/\]$/, '')
                                          : `${displayLabel.replace(/[^a-zA-Z0-9_-]/g, '_')}_Attachment`;
                                        const finalName = baseName.includes('.') ? baseName : `${baseName}${ext}`;
                                        setPreviewFile({
                                          url: strVal,
                                          name: finalName,
                                        });
                                      }}
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
                                      {strVal === '[object Object]' ? '—' : strVal}
                                    </span>
                                  )}
                                </div>
                              );
                            })}
                        </div>

                        {/* Array / Itemized Table Fields */}
                        {submittedEntries
                          .map(([k, rawVal]) => {
                            let v = rawVal;
                            if (typeof v === 'string' && (v.trim().startsWith('[') || v.trim().startsWith('{'))) {
                              try {
                                v = JSON.parse(v);
                              } catch {
                                // keep raw
                              }
                            }
                            if (typeof v === 'string' && (v === '[object Object]' || v.includes('[object Object]'))) {
                              if (k.toLowerCase().includes('item') && flow.lineItems && flow.lineItems.length > 0) {
                                v = flow.lineItems;
                              }
                            }

                            const isItemArray = Array.isArray(v);
                            const isItemObj = typeof v === 'object' && v !== null && (
                              Array.isArray((v as any).items) ||
                              (k.toLowerCase().includes('item') && Object.values(v).every((sub) => typeof sub === 'object' && sub !== null))
                            );

                            const itemsList = isItemArray
                              ? v
                              : isItemObj
                              ? (Array.isArray((v as any).items) ? (v as any).items : Object.values(v))
                              : null;

                            if (!itemsList || itemsList.length === 0) return null;

                            const displayLabel = resolveFieldLabel(k, prior, pIdx);
                            return (
                              <div key={k} className="pt-2 border-t border-slate-100">
                                <FmsItemTable items={itemsList as any[]} title={displayLabel} />
                              </div>
                            );
                          })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-slate-500 italic">Stage verified by {prior.assignee}</p>
                    )}
                  </div>
                );
              });

            if (isPoToPaymentFlow) {
              return (
                <div className="bg-slate-50 border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setIsPriorStagesExpanded(!isPriorStagesExpanded)}
                    className="w-full px-4 py-2.5 flex items-center justify-between text-left hover:bg-slate-100 transition-colors cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <History className="w-4 h-4 text-indigo-600" />
                      <span className="font-bold text-xs text-slate-800">
                        Beneficiary Setup &amp; Upstream Workflow History
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                        {priorStages.length} Stages Handled
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs font-semibold text-indigo-600">
                      <span>{isPriorStagesExpanded ? 'Hide History' : 'View History Details'}</span>
                      <span className="text-slate-400 font-mono text-[10px]">{isPriorStagesExpanded ? '▲' : '▼'}</span>
                    </div>
                  </button>

                  {!isPriorStagesExpanded && (
                    <div className="px-4 py-2 border-t border-slate-200/60 bg-white flex items-center gap-1.5 overflow-x-auto text-[11px]">
                      {priorStages.map((prior, idx) => (
                        <span key={prior.stageId || idx} className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0 font-medium">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                          <span>{prior.stageName}</span>
                          {prior.actualDateTime && <span className="text-[10px] text-emerald-600/80">({prior.actualDateTime.split(' ')[0]})</span>}
                        </span>
                      ))}
                    </div>
                  )}

                  {isPriorStagesExpanded && (
                    <div className="p-3.5 space-y-3 border-t border-slate-200 bg-slate-100/40">
                      {priorStagesCards}
                    </div>
                  )}
                </div>
              );
            }

            if (isStage5MaterialCollection) {
              const stage4Execution = flow?.stages?.find(s => s.stageId === 'STG-05') || flow?.stages?.[4];
              const stage4Submitted = stage4Execution?.submittedData || {};
              const stage4PoList = Array.isArray(stage4Submitted.poList) ? stage4Submitted.poList : (Array.isArray(flow?.instanceDataPool?.poList) ? flow?.instanceDataPool?.poList : []);
              const stage4FirstPo = stage4PoList[0] || {};

              const handoverPoNo = stage4FirstPo.poNumber || stage4Submitted.poNumber || flow?.poNumber || flow?.instanceDataPool?.poNumber || '—';
              const handoverVendorName = stage4FirstPo.vendorName || stage4Submitted.vendorName || flow?.vendorName || flow?.instanceDataPool?.vendorName || '—';
              const handoverIndentNo = flow?.indentNo || flow?.requisitionNumber || '—';
              const handoverPoDate = stage4FirstPo.submittedAt ? new Date(stage4FirstPo.submittedAt).toLocaleDateString('en-GB') : (stage4Execution?.actualDateTime?.split(',')[0] || flow?.createdAt?.split(',')[0] || new Date().toLocaleDateString('en-GB'));
              const handoverAmount = stage4FirstPo.amount ?? stage4Submitted.amount ?? flow?.poAmount ?? flow?.instanceDataPool?.poAmount ?? 0;
              const handoverSiteName = flow?.siteName || flow?.instanceDataPool?.siteName || '—';
              const handoverPoAttachment = stage4FirstPo.poDocumentUrl || stage4Submitted.erpPoDocument || stage4Submitted.poDocumentPdf || stage4Submitted.poUpload || flow?.instanceDataPool?.erpPoDocument || '';

              return (
                <div className="space-y-3">
                  <div className="p-4 bg-gradient-to-br from-indigo-950 via-slate-900 to-indigo-900 border border-indigo-500/40 rounded-2xl text-white shadow-md space-y-3">
                    <div className="flex items-center justify-between flex-wrap gap-2 pb-2.5 border-b border-indigo-800/60">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                          <Truck className="w-4 h-4 text-indigo-400" />
                        </div>
                        <div>
                          <h4 className="font-bold text-xs uppercase tracking-wider text-white">PO Handover Summary</h4>
                          <p className="text-[10px] text-indigo-200">Inherited purchase order details from Stage 4</p>
                        </div>
                      </div>
                      {handoverPoAttachment ? (
                        <button
                          type="button"
                          onClick={() => {
                            const safePo = (handoverPoNo || 'Document').replace(/[^a-zA-Z0-9_-]/g, '_');
                            const ext = handoverPoAttachment.startsWith('data:image/') ? '.png' : '.pdf';
                            setPreviewFile({
                              url: handoverPoAttachment,
                              name: `PO_Attachment_${safePo}${ext}`,
                            });
                          }}
                          className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-lg text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer"
                        >
                          <Paperclip className="w-3.5 h-3.5" />
                          <span>View PO Attachment</span>
                        </button>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No PO Attachment</span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Bill / PO No</span>
                        <span className="font-bold font-mono text-amber-300 block truncate">{handoverPoNo}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Vendor Name</span>
                        <span className="font-bold text-white block truncate">{handoverVendorName}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Indent No</span>
                        <span className="font-bold font-mono text-indigo-200 block truncate">{handoverIndentNo}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">PO Date</span>
                        <span className="font-bold text-slate-200 block">{handoverPoDate}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Amount</span>
                        <span className="font-extrabold font-mono text-emerald-300 text-sm block">₹{Number(handoverAmount).toLocaleString('en-IN')}</span>
                      </div>
                      <div className="space-y-0.5">
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">Site Name</span>
                        <span className="font-bold text-slate-200 block truncate">{handoverSiteName}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div className="space-y-3">
                {priorStagesCards}
              </div>
            );
          })()}

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

          {flow.linkedSubFlows && flow.linkedSubFlows.length > 0 && (stage.status === 'Done' || stage.status === 'Skipped' || flow.status === 'Awaiting Fulfillment') && (
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
            {/* Validation Error Banner */}
            {error && (
              <div className="p-3.5 bg-rose-50 border border-rose-300 rounded-xl text-rose-800 text-xs font-bold flex items-center gap-2.5 shadow-2xs animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            {/* PURCHASER / ASSIGNEE LINE ITEM REVIEW & QUANTITY REVISION */}
            {purchaserItems.length > 0 && !isStage2CheckStock && stageIndex !== 4 && stage.stageId !== 'STG-05' && !isStage5MaterialCollection && (
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

            {/* Dedicated Director Payment Approval Remarks Area (PO_TO_PAYMENT Stage 5) */}
            {isPaymentApprovalStage && (
              <div className="p-4 bg-white rounded-xl border border-indigo-100 shadow-2xs space-y-2.5">
                <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600" />
                  <span>Director Approval / Disbursement Remarks (Optional)</span>
                </label>
                <textarea
                  rows={2}
                  value={formData.approvalRemarks || ''}
                  onChange={(e) => handleFieldChange('approvalRemarks', e.target.value)}
                  placeholder="Enter payment approval instructions or audit remarks (e.g. Approved for release today via SBI account)..."
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-slate-50 font-medium text-slate-800 placeholder-slate-400 resize-none"
                />
              </div>
            )}

            {!isPaymentApprovalStage && (
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

                  if (field.type === 'CS_MODULE_EMBED') {
                    if (
                      flow.flowType === 'STORE_TO_SITE_DISPATCH' ||
                      flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' ||
                      flow.flowType === 'CHECK_STOCK' ||
                      flow.flowType === 'PO_TO_PAYMENT' ||
                      flow.flowType === 'SITE_RECEIVE' ||
                      (flow.flowType !== 'INDENT_TO_PO' && flow.flowType !== 'INDENT_PURCHASE' && flow.templateKey !== 'INDENT_TO_PO')
                    ) {
                      return null;
                    }
                    const activeCs = linkedCsSheet || storageAdapter.getComparativeStatements().find((c) => c.indentNo === flow.indentNo);
                    const inheritedItemsCount = flow.lineItems?.length || (Array.isArray(flow.instanceDataPool?.requisitionItems) ? flow.instanceDataPool.requisitionItems.length : 0) || (Array.isArray(flow.stages?.[0]?.submittedData?.purchaseItems) ? flow.stages[0]?.submittedData.purchaseItems.length : 0);

                    return (
                      <div key={field.id} className="sm:col-span-2 p-4 bg-gradient-to-r from-indigo-950 via-slate-900 to-indigo-950 text-white rounded-2xl shadow-md border border-indigo-500/40 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-indigo-500/30 border border-indigo-400/40 text-amber-300 flex items-center justify-center font-bold">
                              <FileSpreadsheet className="w-5 h-5 text-amber-300" />
                            </div>
                            <div>
                              <h4 className="font-black text-sm text-white flex items-center gap-2">
                                <span>{field.label || 'Comparative Statement (CS) Module'}</span>
                                {field.required && <span className="text-amber-400 text-xs">*</span>}
                              </h4>
                              <p className="text-[11px] text-indigo-200">
                                {activeCs
                                  ? `CS Attached (#${activeCs.indentNo}) • ${activeCs.items.length} items • ${activeCs.vendors.length} vendors evaluated`
                                  : `${inheritedItemsCount > 0 ? `${inheritedItemsCount} items inherited from Indent` : 'Enter vendor rates & calculate landed L1 cost'} for Indent #${flow.indentNo}`}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsCsModalOpen(true)}
                            className="px-4 py-2 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <FileSpreadsheet className="w-4 h-4 text-slate-950" />
                            <span>{activeCs ? 'View / Edit CS Sheet' : 'Create / Open CS Sheet'}</span>
                          </button>
                        </div>

                        {activeCs && (
                          <div className="p-2.5 bg-slate-800/80 rounded-xl border border-slate-700/80 text-xs flex items-center justify-between flex-wrap gap-2">
                            <span className="text-slate-300 font-medium">
                              CS Record Ref: <strong className="text-amber-300 font-mono">#{activeCs.indentNo}</strong> • Status:{' '}
                              <strong className={(activeCs.status === 'Approved' || activeCs.status === 'PO Created' || Boolean(activeCs.approvalDetails)) ? 'text-emerald-400' : 'text-amber-400'}>
                                {(activeCs.status === 'Approved' || activeCs.status === 'PO Created' || Boolean(activeCs.approvalDetails)) ? 'Locked & Digitally Signed' : 'Draft / Rate Entry In Progress'}
                              </strong>
                            </span>
                            <span className="text-slate-400 text-[11px]">
                              Vendors: {activeCs.vendors.map((v) => v.vendorName).join(', ')}
                            </span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (field.type === 'ACCOUNTS_DOUBLE_ENTRY_VERIFICATION') {
                    const linkedPayment = storageAdapter.getBankPayments().find(
                      (bp) => bp.sheetNo === flow.indentNo || bp.billNoPo === flow.poNumber || bp.vendorName === flow.vendorName || bp.id === flow.linkedFlowId
                    );

                    const origAccount =
                      linkedPayment?.accountNo ||
                      (linkedPayment?.accountNoMasked ? linkedPayment.accountNoMasked.replace(/•/g, '3') : undefined) ||
                      (flow.instanceDataPool?.accountNo as string) ||
                      (flow.stages?.[0]?.submittedData?.accountNo as string) ||
                      '50100293812834';

                    const origIfsc =
                      linkedPayment?.ifscCode ||
                      (flow.instanceDataPool?.ifscCode as string) ||
                      (flow.stages?.[0]?.submittedData?.ifscCode as string) ||
                      'HDFC0000412';

                    const chequeUrl =
                      linkedPayment?.cancelledChequeUrl ||
                      (flow.instanceDataPool?.cancelledChequeUrl as string) ||
                      (flow.stages?.[0]?.submittedData?.cancelledChequeUrl as string);

                    return (
                      <div key={field.id} className="sm:col-span-2">
                        <AccountsDoubleEntryVerificationPanel
                          beneficiaryName={linkedPayment?.beneficiaryName || flow.vendorName || ''}
                          vendorName={flow.vendorName || ''}
                          originalAccountNo={origAccount}
                          originalIfscCode={origIfsc}
                          bankName={linkedPayment?.bankName || 'HDFC Bank'}
                          cancelledChequeUrl={chequeUrl}
                          isAlreadyVerified={Boolean(linkedPayment?.verifiedByAccountant || formData.verifiedByAccountant)}
                          verificationTimestamp={linkedPayment?.accountantVerificationTimestamp}
                          onVerificationStatusChange={(isValid, details) => {
                            setIsDoubleEntryVerified(isValid);
                            handleFieldChange('verifiedByAccountant', isValid);
                            handleFieldChange('reEnteredAccountNo', details.reEnteredAccountNo);
                            handleFieldChange('reEnteredIfscCode', details.reEnteredIfscCode);
                            if (linkedPayment && isValid) {
                              storageAdapter.verifyBankPaymentBeneficiary(linkedPayment.id, true, currentUser, details);
                            }
                          }}
                        />
                      </div>
                    );
                  }

                  if (field.type === 'CS_L1_APPROVAL_EMBED') {
                    const activeCs = linkedCsSheet || storageAdapter.getComparativeStatements().find((c) => c.indentNo === flow.indentNo);
                    const isApproved = Boolean(activeCs && (activeCs.status === 'Approved' || activeCs.status === 'PO Created' || Boolean(activeCs.approvalDetails))) || formData.status === 'APPROVED' || val === 'APPROVED';

                    return (
                      <div key={field.id} className="sm:col-span-2 p-4 bg-gradient-to-r from-amber-950 via-slate-900 to-slate-950 text-white rounded-2xl shadow-md border border-amber-500/40 space-y-3">
                        <div className="flex items-center justify-between flex-wrap gap-3">
                          <div className="flex items-center gap-2.5">
                            <div className="w-10 h-10 rounded-xl bg-amber-500/30 border border-amber-400/40 text-amber-400 flex items-center justify-center font-bold">
                              <Award className="w-5 h-5 text-amber-400" />
                            </div>
                            <div>
                              <h4 className="font-black text-sm text-white flex items-center gap-2">
                                <span>{field.label || 'Director L1 Award Allocation & Digital Sign-off'}</span>
                                {field.required && <span className="text-amber-400 text-xs">*</span>}
                              </h4>
                              <p className="text-[11px] text-amber-200">
                                {isApproved
                                  ? 'CS Award allocated & digitally signed by Director'
                                  : 'Review Comparative Statement rates, finalize awarded vendors, and digitally sign to lock'}
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => setIsL1ModalOpen(true)}
                            className="px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-500 hover:to-amber-600 text-slate-950 font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                          >
                            <Award className="w-4 h-4 text-slate-950" />
                            <span>{isApproved ? 'Re-inspect L1 CS Approval' : 'Review & Approve L1 CS'}</span>
                          </button>
                        </div>

                        {isApproved && (
                          <div className="p-2.5 bg-emerald-950/60 rounded-xl border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                            <span>Digitally signed &amp; locked by Director Pranjal Agrawal. Awarded items mapped for Split PO Generation.</span>
                          </div>
                        )}
                      </div>
                    );
                  }

                  if (field.type === 'SPLIT_PO_GENERATOR') {
                    const activeCs = linkedCsSheet || storageAdapter.getComparativeStatements().find((c) => c.indentNo === flow.indentNo);

                    // Compute awarded vendor PO groups
                    const awardedVendorGroups: Array<{
                      vendorId: string;
                      vendorName: string;
                      items: Array<{ itemName: string; qty: number; unit: string; rate: number; amount: number }>;
                      totalAmount: number;
                      suggestedPoNo: string;
                      csPaymentTerms: string;
                      derivedDefaultTerms: 'ADVANCE' | 'CREDIT';
                    }> = [];

                    if (activeCs && activeCs.awardedVendorMap) {
                      activeCs.vendors.forEach((vendor) => {
                        const awardedItems: Array<{ itemName: string; qty: number; unit: string; rate: number; amount: number }> = [];
                        let total = 0;
                        activeCs.items.forEach((item) => {
                          if (activeCs.awardedVendorMap?.[item.id] === vendor.vendorId) {
                            const rateInfo = vendor.itemRates[item.id];
                            const landedRate = rateInfo?.landedRate || 0;
                            const amt = landedRate * item.qty;
                            awardedItems.push({
                              itemName: item.itemName,
                              qty: item.qty,
                              unit: item.unit,
                              rate: landedRate,
                              amount: amt,
                            });
                            total += amt;
                          }
                        });

                        if (awardedItems.length > 0) {
                          const vendorShort = vendor.vendorName.replace(/[^a-zA-Z0-9]/g, '').slice(0, 4).toUpperCase();
                          const rawTerms = (vendor.paymentTerms || '').trim();
                          const lower = rawTerms.toLowerCase();
                          const derivedTerms: 'ADVANCE' | 'CREDIT' = (lower.includes('credit') || lower.includes('net') || lower.includes('days credit')) ? 'CREDIT' : 'ADVANCE';

                          awardedVendorGroups.push({
                            vendorId: vendor.vendorId,
                            vendorName: vendor.vendorName,
                            items: awardedItems,
                            totalAmount: total,
                            suggestedPoNo: `BPL/PO/${flow.indentNo}/${vendorShort}`,
                            csPaymentTerms: rawTerms,
                            derivedDefaultTerms: derivedTerms,
                          });
                        }
                      });
                    }

                    return (
                      <div key={field.id} className="sm:col-span-2 p-4 bg-slate-900 border border-indigo-500/40 rounded-2xl text-white space-y-4">
                        <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-800">
                          <div className="flex items-center gap-2">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-400/30 flex items-center justify-center text-indigo-400">
                              <Building2 className="w-4 h-4 text-indigo-400" />
                            </div>
                            <div>
                              <h4 className="font-bold text-xs text-white uppercase tracking-wider">{field.label || 'Awarded Vendor PO Generation'}</h4>
                              <p className="text-[11px] text-slate-400">Auto-split Purchase Orders generated from locked CS statement</p>
                            </div>
                          </div>
                          {awardedVendorGroups.length > 0 && (
                            <span className="px-2.5 py-1 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-lg text-[11px] font-bold">
                              {awardedVendorGroups.length} Split PO{awardedVendorGroups.length > 1 ? 's' : ''} Ready
                            </span>
                          )}
                        </div>

                        {awardedVendorGroups.length > 0 ? (
                          <div className="space-y-3">
                            {awardedVendorGroups.map((grp, gIdx) => (
                              <div key={grp.vendorId} className="p-3 bg-slate-800/80 border border-slate-700 rounded-xl space-y-2">
                                <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] font-black flex items-center justify-center">
                                      {gIdx + 1}
                                    </span>
                                    <span className="font-black text-amber-300">{grp.vendorName}</span>
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <span className="text-[11px] text-slate-400 font-mono">PO Ref: <strong className="text-white">{grp.suggestedPoNo}</strong></span>
                                    <span className="font-black font-mono text-emerald-400">₹{grp.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</span>
                                  </div>
                                </div>

                                <div className="overflow-x-auto">
                                  <table className="w-full text-left text-[11px]">
                                    <thead>
                                      <tr className="text-slate-400 border-b border-slate-700/60">
                                        <th className="py-1 px-1.5 font-medium">Item Description</th>
                                        <th className="py-1 px-1.5 font-medium text-center">Qty</th>
                                        <th className="py-1 px-1.5 font-medium text-right">Landed Rate</th>
                                        <th className="py-1 px-1.5 font-medium text-right">Amount (₹)</th>
                                      </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-800">
                                      {grp.items.map((it, itIdx) => (
                                        <tr key={itIdx} className="text-slate-300">
                                          <td className="py-1 px-1.5 font-medium text-white">{it.itemName}</td>
                                          <td className="py-1 px-1.5 text-center font-mono">{it.qty} {it.unit}</td>
                                          <td className="py-1 px-1.5 text-right font-mono">₹{it.rate.toLocaleString('en-IN')}</td>
                                          <td className="py-1 px-1.5 text-right font-mono font-bold text-slate-200">₹{it.amount.toLocaleString('en-IN')}</td>
                                        </tr>
                                      ))}
                                    </tbody>
                                  </table>
                                </div>
                                <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between flex-wrap gap-2">
                                  <div className="flex items-center gap-3 flex-wrap">
                                    <span className="text-[11px] text-slate-400 font-medium">Split PO for: <strong className="text-white">{grp.vendorName}</strong></span>
                                    
                                    {/* Mandatory Payment Terms Dropdown */}
                                    <div className="flex items-center gap-1.5">
                                      <label className="text-[11px] font-bold text-slate-300">Payment Terms <span className="text-amber-400">*</span>:</label>
                                      <select
                                        value={formData.vendorPaymentTerms?.[grp.vendorId] || 'ADVANCE'}
                                        onChange={(e) => {
                                          const val = e.target.value as 'ADVANCE' | 'CREDIT';
                                          const prevTerms = formData.vendorPaymentTerms || {};
                                          handleFieldChange('vendorPaymentTerms', { ...prevTerms, [grp.vendorId]: val });
                                        }}
                                        className="px-2 py-1 bg-slate-900 border border-slate-700 text-amber-300 text-xs font-bold rounded-lg focus:ring-2 focus:ring-amber-400 outline-none cursor-pointer"
                                      >
                                        <option value="ADVANCE">ADVANCE (Initiate Upfront Payment)</option>
                                        <option value="CREDIT">CREDIT (Payment Triggered on GRN Clearance)</option>
                                      </select>
                                    </div>

                                    {(formData.vendorPaymentTerms?.[grp.vendorId] || 'ADVANCE') === 'ADVANCE' && isVendorInitiated(grp.vendorId, grp.vendorName) && (
                                      <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 rounded text-[10px] font-bold flex items-center gap-1">
                                        <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                                        <span>Payment Initiated</span>
                                      </span>
                                    )}
                                  </div>

                                  {(formData.vendorPaymentTerms?.[grp.vendorId] || 'ADVANCE') === 'ADVANCE' ? (
                                    <button
                                      type="button"
                                      disabled={isVendorInitiated(grp.vendorId, grp.vendorName)}
                                      onClick={() => {
                                        if (isVendorInitiated(grp.vendorId, grp.vendorName)) return;
                                        setSelectedStage4VendorGroup(grp);
                                        setIsStage4PaymentModalOpen(true);
                                      }}
                                      className={
                                        isVendorInitiated(grp.vendorId, grp.vendorName)
                                          ? "px-3 py-1.5 bg-slate-800 text-slate-400 border border-slate-700 font-bold text-xs rounded-lg flex items-center gap-1.5 cursor-not-allowed opacity-75"
                                          : "px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                                      }
                                    >
                                      {isVendorInitiated(grp.vendorId, grp.vendorName) ? (
                                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                      ) : (
                                        <Upload className="w-3.5 h-3.5" />
                                      )}
                                      <span>
                                        {isVendorInitiated(grp.vendorId, grp.vendorName)
                                          ? 'Payment Requested (Pending)'
                                          : `Upload ERP PO & Initiate Payment (${grp.vendorName.split(' ')[0]})`}
                                      </span>
                                    </button>
                                  ) : (
                                    /* Credit PO Fields: PO Number Input and Upload ERP PO PDF Button */
                                    <div className="flex items-center gap-3 flex-wrap">
                                      <div className="flex items-center gap-1.5">
                                        <label className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
                                          PO Number <span className="text-amber-400">*</span>:
                                        </label>
                                        <input
                                          type="text"
                                          required
                                          value={formData.vendorPoNumbers?.[grp.vendorId] !== undefined ? formData.vendorPoNumbers[grp.vendorId] : grp.suggestedPoNo}
                                          onChange={(e) => {
                                            const val = e.target.value;
                                            const prevNums = formData.vendorPoNumbers || {};
                                            const newNums = { ...prevNums, [grp.vendorId]: val };
                                            handleCreditPoFieldChange(grp, val, formData.vendorPoDocuments?.[grp.vendorId] || '', newNums, formData.vendorPoDocuments);
                                          }}
                                          placeholder="e.g. BPL/PO/..."
                                          className="px-2.5 py-1 bg-slate-900 border border-slate-600 text-amber-200 text-xs font-mono font-bold rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none w-48"
                                        />
                                      </div>

                                      <div className="flex items-center gap-1.5">
                                        <label className="text-[11px] font-bold text-slate-300 whitespace-nowrap">
                                          Upload ERP PO <span className="text-amber-400">*</span>:
                                        </label>
                                        {formData.vendorPoDocuments?.[grp.vendorId] ? (
                                          <div className="flex items-center gap-1.5 px-2.5 py-1 bg-emerald-950/80 border border-emerald-500/40 rounded-lg text-xs">
                                            <Paperclip className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                                            <span className="text-emerald-200 font-bold truncate max-w-[130px]">
                                              PO Uploaded
                                            </span>
                                            <button
                                              type="button"
                                              onClick={() => setPreviewFile({ url: formData.vendorPoDocuments[grp.vendorId], name: `ERP PO - ${grp.vendorName}` })}
                                              className="text-emerald-400 hover:text-emerald-200 p-0.5 rounded cursor-pointer"
                                              title="Preview PO PDF"
                                            >
                                              <Eye className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                              type="button"
                                              onClick={() => {
                                                const prevDocs = formData.vendorPoDocuments || {};
                                                const newDocs = { ...prevDocs, [grp.vendorId]: '' };
                                                const poNum = formData.vendorPoNumbers?.[grp.vendorId] !== undefined ? formData.vendorPoNumbers[grp.vendorId] : grp.suggestedPoNo;
                                                handleCreditPoFieldChange(grp, poNum, '', formData.vendorPoNumbers, newDocs);
                                              }}
                                              className="text-slate-400 hover:text-rose-400 p-0.5 rounded cursor-pointer"
                                              title="Remove file"
                                            >
                                              <X className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        ) : (
                                          <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-lg transition-all shadow-xs cursor-pointer">
                                            <Upload className="w-3.5 h-3.5" />
                                            <span>Upload ERP PO PDF</span>
                                            <input
                                              type="file"
                                              accept=".pdf,.png,.jpg,.jpeg,.doc,.docx"
                                              className="hidden"
                                              onChange={(e) => {
                                                const file = e.target.files?.[0];
                                                if (!file) return;
                                                const poNum = formData.vendorPoNumbers?.[grp.vendorId] !== undefined ? formData.vendorPoNumbers[grp.vendorId] : grp.suggestedPoNo;
                                                if (file.size <= 4 * 1024 * 1024) {
                                                  const reader = new FileReader();
                                                  reader.onload = () => {
                                                    if (typeof reader.result === 'string') {
                                                      const prevDocs = formData.vendorPoDocuments || {};
                                                      const newDocs = { ...prevDocs, [grp.vendorId]: reader.result };
                                                      handleCreditPoFieldChange(grp, poNum, reader.result, formData.vendorPoNumbers, newDocs);
                                                    }
                                                  };
                                                  reader.readAsDataURL(file);
                                                } else {
                                                  const refNote = `[File: ${file.name}]`;
                                                  const prevDocs = formData.vendorPoDocuments || {};
                                                  const newDocs = { ...prevDocs, [grp.vendorId]: refNote };
                                                  handleCreditPoFieldChange(grp, poNum, refNote, formData.vendorPoNumbers, newDocs);
                                                }
                                              }}
                                            />
                                          </label>
                                        )}
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="p-3.5 bg-slate-800/40 border border-dashed border-slate-700 rounded-xl text-center space-y-1">
                            <p className="text-xs text-slate-300 font-medium">Split PO Groups Pending</p>
                            <p className="text-[11px] text-slate-400">Awarded vendor POs will populate automatically based on the Director's locked L1 allocation from Stage 3.</p>
                          </div>
                        )}

                        {/* Mandatory PO Assign To Dropdown for Material Collection (for both Advance and Credit) */}
                        <div className="p-3.5 bg-slate-800/90 border border-slate-700 rounded-xl space-y-2">
                          <div className="flex items-center justify-between flex-wrap gap-1">
                            <label className="text-xs font-bold text-white flex items-center gap-1.5">
                              <User className="w-3.5 h-3.5 text-indigo-400" />
                              <span>PO Assign To (Material Collection)</span>
                              <span className="text-amber-400">*</span>
                            </label>
                            <span className="text-[11px] text-indigo-300 font-medium">
                              Auto-selected (least pending tasks): <strong className="text-amber-300 font-bold">{bestAssistantName}</strong>
                            </span>
                          </div>
                          <select
                            value={formData.poAssignTo || bestAssistantName}
                            onChange={(e) => handleFieldChange('poAssignTo', e.target.value)}
                            required
                            className="w-full px-3 py-2 bg-slate-900 border border-slate-600 text-amber-200 text-xs font-bold rounded-lg focus:ring-2 focus:ring-indigo-500 outline-none cursor-pointer"
                          >
                            <option value="Rajendra">Rajendra (Purchaser Assistant)</option>
                            <option value="Vivek">Vivek (Purchaser Assistant)</option>
                            <option value="Rajnikant">Rajnikant (Purchaser Assistant)</option>
                          </select>
                          <p className="text-[11px] text-slate-400">
                            The selected assistant will receive the Stage 5 Material Collection handover in their inbox. Shyam can override the auto-selected assignee if needed.
                          </p>
                        </div>
                      </div>
                    );
                  }

                  // Extract items if val is array, JSON array, or object with items
                  let parsedItems: any[] | null = null;
                  if (Array.isArray(val)) {
                    parsedItems = val;
                  } else if (typeof val === 'string' && (val.trim().startsWith('[') || val.trim().startsWith('{'))) {
                    try {
                      const p = JSON.parse(val);
                      if (Array.isArray(p)) parsedItems = p;
                      else if (p && typeof p === 'object' && Array.isArray(p.items)) parsedItems = p.items;
                    } catch {
                      // ignore parse error
                    }
                  } else if (typeof val === 'object' && val !== null) {
                    if (Array.isArray((val as any).items)) {
                      parsedItems = (val as any).items;
                    } else if (field.id.toLowerCase().includes('item') && Object.values(val).every((sub) => typeof sub === 'object' && sub !== null)) {
                      parsedItems = Object.values(val);
                    }
                  }

                  // Fallback recovery if field is items and val is corrupted [object Object]
                  if (!parsedItems && field.id.toLowerCase().includes('item') && (val === '[object Object]' || String(val).includes('[object Object]'))) {
                    if (flow.lineItems && flow.lineItems.length > 0) {
                      parsedItems = flow.lineItems;
                    } else if (flow.instanceDataPool && flow.instanceDataPool.requisitionItems) {
                      parsedItems = flow.instanceDataPool.requisitionItems;
                    }
                  }

                  // If field received an array/list of items, render the full DataTable component (unless Stage 2 Stock Register is active)
                  if (parsedItems && parsedItems.length > 0) {
                    if (isStage2CheckStock) return null;
                    return (
                      <div key={field.id} className="sm:col-span-2 space-y-1">
                        <FmsItemTable items={parsedItems} title={field.label} />
                      </div>
                    );
                  }

                  // Default TEXT
                  const safeVal = typeof val === 'object' && val !== null
                    ? Object.entries(val)
                        .map(([sk, sv]) => `${sk}: ${typeof sv === 'object' ? JSON.stringify(sv) : sv}`)
                        .join(' • ')
                    : String(val ?? '') === '[object Object]'
                    ? ''
                    : val ?? '';

                  const fieldIdLower = field.id.toLowerCase();
                  const fieldLabelLower = field.label.toLowerCase();

                  const isManualDocumentField =
                    fieldIdLower.includes('challan') ||
                    fieldIdLower.includes('lr') ||
                    fieldIdLower.includes('transporter') ||
                    fieldIdLower.includes('invoice') ||
                    fieldIdLower.includes('billno') ||
                    fieldIdLower.includes('taxinvoice') ||
                    fieldLabelLower.includes('challan') ||
                    fieldLabelLower.includes('lr') ||
                    fieldLabelLower.includes('transporter') ||
                    fieldLabelLower.includes('vendor invoice') ||
                    fieldLabelLower.includes('bill no');

                  const isSystemGeneratedId =
                    !isManualDocumentField &&
                    (fieldIdLower.includes('ponumber') ||
                      fieldIdLower.includes('poid') ||
                      fieldIdLower.includes('csreference') ||
                      fieldIdLower.includes('csid') ||
                      fieldIdLower.includes('csnumber') ||
                      fieldIdLower.includes('paymentvoucher') ||
                      fieldIdLower.includes('voucherno') ||
                      fieldIdLower.includes('requisitionnumber') ||
                      fieldIdLower.includes('indentno') ||
                      fieldIdLower.includes('trackingid') ||
                      fieldIdLower.includes('grnnumber') ||
                      fieldIdLower.includes('sitegrnnumber') ||
                      fieldIdLower.includes('autoref') ||
                      fieldLabelLower.includes('auto-generated') ||
                      fieldLabelLower.includes('po number') ||
                      fieldLabelLower.includes('requisition number') ||
                      fieldLabelLower.includes('cs reference') ||
                      fieldLabelLower.includes('payment voucher') ||
                      fieldLabelLower.includes('indent ref'));

                  return (
                    <div key={field.id} className="space-y-1">
                      <div className="flex items-center justify-between">
                        <label className="block text-xs font-semibold text-slate-700">
                          {field.label} {field.required && <span className="text-rose-500">*</span>}
                        </label>
                        {isSystemGeneratedId && (
                          <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded border border-slate-200">
                            System Generated • Read Only
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={safeVal}
                        readOnly={isSystemGeneratedId}
                        onChange={(e) => !isSystemGeneratedId && handleFieldChange(field.id, e.target.value)}
                        placeholder={field.placeholder || `Enter ${field.label}...`}
                        className={`w-full text-xs border rounded-lg p-2 font-medium ${
                          isSystemGeneratedId
                            ? 'bg-slate-100 text-slate-600 border-slate-300 font-semibold cursor-not-allowed select-all focus:outline-none'
                            : 'bg-white border-slate-300 text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500'
                        }`}
                      />
                    </div>
                  );
                })}
              </div>
            </div>
            )}

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
            {stage.status === 'Done' || stage.status === 'Skipped' ? 'Close Details' : 'Cancel'}
          </button>
          
          {isPaymentApprovalStage ? (
            <div className="flex items-center gap-2.5">
              {stage.status === 'Done' || stage.status === 'Skipped' ? (
                <span className="px-4 py-2 bg-emerald-50 text-emerald-800 border border-emerald-200 rounded-xl font-bold text-xs flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Payment Authorized by Director (Read-Only)</span>
                </span>
              ) : (
                <>
                  <button
                    type="button"
                    onClick={() => handleDirectorPaymentDecision('No')}
                    className="px-5 py-2.5 bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white font-bold rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <X className="w-4 h-4 stroke-[2.5]" />
                    <span>Reject Payment</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDirectorPaymentDecision('Yes')}
                    className="px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-emerald-700 hover:from-emerald-700 hover:to-emerald-800 active:from-emerald-800 active:to-emerald-900 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
                    <span>Approve Payment</span>
                  </button>
                </>
              )}
            </div>
          ) : (
            <button
              type="submit"
              form="stage-action-form"
              disabled={
                flow.isClosed ||
                flow.status === 'CLOSED' ||
                stage.status === 'Done' ||
                stage.status === 'Skipped' ||
                (fields.some((f) => f.type === 'ACCOUNTS_DOUBLE_ENTRY_VERIFICATION') && !isDoubleEntryVerified)
              }
              title={
                fields.some((f) => f.type === 'ACCOUNTS_DOUBLE_ENTRY_VERIFICATION') && !isDoubleEntryVerified
                  ? 'Account Number and IFSC Code must match the original request exactly to verify'
                  : undefined
              }
              className={`px-5 py-2 font-bold rounded-lg text-xs shadow-sm transition-all flex items-center gap-1.5 ${
                flow.isClosed ||
                flow.status === 'CLOSED' ||
                stage.status === 'Done' ||
                stage.status === 'Skipped' ||
                (fields.some((f) => f.type === 'ACCOUNTS_DOUBLE_ENTRY_VERIFICATION') && !isDoubleEntryVerified)
                  ? 'bg-slate-200 text-slate-500 cursor-not-allowed border border-slate-300'
                  : 'bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white cursor-pointer'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>
                {stage.status === 'Done' || stage.status === 'Skipped'
                  ? 'Stage Completed (Read-Only)'
                  : flow.isClosed || flow.status === 'CLOSED'
                  ? 'Workflow Closed (Locked)'
                  : fields.some((f) => f.type === 'ACCOUNTS_DOUBLE_ENTRY_VERIFICATION')
                  ? 'Verify Beneficiary & Send to Director'
                  : 'Submit & Advance Stage'}
              </span>
            </button>
          )}
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
              const payload = {
                ...formData,
                csSheetId: cs.id,
                csIndentNo: cs.indentNo,
                totalL1Value: cs.vendors[0]
                  ? Object.values(cs.vendors[0].itemRates || {}).reduce((s, r: any) => s + (r.amount || 0), 0)
                  : 0,
                selectedVendors: cs.vendors.map((v) => v.vendorName).join(', '),
                csStatus: cs.status || 'Pending Approval',
                actionStatus: 'COMPLETED',
                remarks: `Comparative Statement #${cs.indentNo} finalized & linked by ${currentUser.name}. ${cs.items.length} items evaluated.`,
              };
              onSubmitStage(flow, stageIndex, payload, 'Yes');
              onClose();
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
            onReturnToPurchaser={(updatedFlow) => {
              setIsL1ModalOpen(false);
              onClose();
            }}
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

        {/* Stage 4 Unified Bank Payment Requisition Modal */}
        {isStage4PaymentModalOpen && flow && (
          <NewBankPaymentModal
            isOpen={isStage4PaymentModalOpen}
            onClose={() => {
              setIsStage4PaymentModalOpen(false);
              setSelectedStage4VendorGroup(null);
            }}
            currentUser={currentUser}
            initialVendorName={
              selectedStage4VendorGroup?.vendorName ||
              (linkedCsSheet?.vendors?.length ? linkedCsSheet.vendors[0].vendorName : '') ||
              flow.vendorName ||
              ''
            }
            initialPoNumber={
              selectedStage4VendorGroup?.suggestedPoNo || `BPL/PO/${flow.indentNo}`
            }
            initialAmount={
              selectedStage4VendorGroup?.totalAmount || flow.poAmount || undefined
            }
            onSubmit={(paymentRecord) => handleStage4PaymentSubmit(paymentRecord)}
          />
        )}
      </div>
    </div>
  );
};
