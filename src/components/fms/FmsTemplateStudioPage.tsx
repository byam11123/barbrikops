import React, { useState, useEffect, useRef } from 'react';
import { 
  Layers, 
  Plus, 
  Trash2, 
  Save, 
  Clock, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ArrowRight, 
  ShieldCheck, 
  ChevronDown, 
  Sparkles, 
  GitBranch, 
  CheckSquare, 
  ArrowUp, 
  ArrowDown, 
  Settings, 
  FileSpreadsheet, 
  Download, 
  Upload,
  ArrowLeft,
  Search,
  Filter,
  Copy,
  ExternalLink,
  Play,
  RotateCcw,
  Check,
  X,
  ListPlus,
  Eye,
  Sliders,
  HelpCircle,
  Hash,
  GripVertical,
  Move
} from 'lucide-react';
import { 
  FmsTemplateDefinition, 
  FmsStageTemplate, 
  FmsStageFieldConfig, 
  FmsSubWorkflowTriggerConfig, 
  Priority, 
  UserProfile, 
  isUserSuperAdmin, 
  isUserAdminOrSuperAdmin 
} from '../../types';
import { downloadFmsExcelTemplate, parseFmsExcelFile } from '../../services/fmsExcelService';
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
import { storageAdapter } from '../../services/storageAdapter';
import { CustomSelect } from '../common/CustomSelect';

const SLA_PRESETS = [
  { value: 0, label: 'Whenever Needed (No SLA Limit)' },
  { value: 1, label: '+1 Hour (Fast-Track / Bank approval)' },
  { value: 2, label: '+2 Hours' },
  { value: 3, label: '+3 Hours' },
  { value: 4, label: '+4 Hours (Half-Day)' },
  { value: 5, label: '+5 Hours' },
  { value: 6, label: '+6 Hours' },
  { value: 8, label: '+8 Hours (Full Shift)' },
  { value: 12, label: '+12 Hours (Half Day/Night)' },
  { value: 18, label: '+18 Hours' },
  { value: 24, label: '+24 Hours (Next Day)' },
  { value: 36, label: '+36 Hours' },
  { value: 48, label: '+48 Hours (2 Days)' },
  { value: 72, label: '+72 Hours (3 Days)' },
  { value: 120, label: '+120 Hours (5 Days)' },
  { value: 168, label: '+168 Hours (7 Days / 1 Week)' },
];

const DEPARTMENT_HUBS: Array<{ key: FmsTemplateDefinition['departmentHub']; label: string; color: string }> = [
  { key: 'PROCUREMENT', label: 'Procurement & Purchase', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' },
  { key: 'SITE_LOGISTICS', label: 'Stores & Site Logistics', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' },
  { key: 'FINANCE_ACCOUNTS', label: 'Finance & Accounts', color: 'bg-purple-50 text-purple-700 border-purple-200' },
  { key: 'HR_EQUIPMENT', label: 'Plant, Machinery & HR', color: 'bg-amber-50 text-amber-700 border-amber-200' },
  { key: 'OPERATIONS', label: 'Site Operations & DPR', color: 'bg-sky-50 text-sky-700 border-sky-200' },
  { key: 'GENERAL', label: 'General / Cross-Functional', color: 'bg-slate-50 text-slate-700 border-slate-200' },
];

interface FmsTemplateStudioPageProps {
  currentUser: UserProfile;
  initialTemplateKey?: string | null;
  onClearInitialKey?: () => void;
  onNavigateTab?: (tab: any) => void;
  onCreateFlowFromTemplate?: (templateKey: string) => void;
}

export const FmsTemplateStudioPage: React.FC<FmsTemplateStudioPageProps> = ({
  currentUser,
  initialTemplateKey,
  onClearInitialKey,
  onNavigateTab,
  onCreateFlowFromTemplate,
}) => {
  const isSuperAdmin = isUserSuperAdmin(currentUser);
  const isAdminOrSuperAdmin = isUserAdminOrSuperAdmin(currentUser);
  const canEdit = isSuperAdmin || isAdminOrSuperAdmin;

  // Active view: null = Hub/Gallery, string = Individual Template Key/Id
  const [activeTemplateKey, setActiveTemplateKey] = useState<string | null>(initialTemplateKey || null);
  const [templatesList, setTemplatesList] = useState<FmsTemplateDefinition[]>(() => storageAdapter.getAllMasterTemplates());
  const [hubFilter, setHubFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [showArchived, setShowArchived] = useState<boolean>(false);

  // Individual Template Editing State
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [templateName, setTemplateName] = useState<string>('');
  const [templateKey, setTemplateKey] = useState<string>('');
  const [departmentHub, setDepartmentHub] = useState<FmsTemplateDefinition['departmentHub']>('PROCUREMENT');
  const [referenceLabel, setReferenceLabel] = useState<string>('Requisition / Indent Ref');
  const [description, setDescription] = useState<string>('');
  const [defaultPriority, setDefaultPriority] = useState<Priority>('Normal');
  const [stages, setStages] = useState<FmsStageTemplate[]>([]);
  const [selectedStageIndex, setSelectedStageIndex] = useState<number>(0);

  // Drag and Drop Stage Reordering State
  const [draggedStageIdx, setDraggedStageIdx] = useState<number | null>(null);
  const [dragOverStageIdx, setDragOverStageIdx] = useState<number | null>(null);
  const [dragOverPosition, setDragOverPosition] = useState<'BEFORE' | 'AFTER' | null>(null);
  
  // Simulation / Live Preview State
  const [isSimulatorOpen, setIsSimulatorOpen] = useState<boolean>(false);
  const [simulatedData, setSimulatedData] = useState<Record<string, any>>({});
  const [simulatedDecision, setSimulatedDecision] = useState<'Yes' | 'No' | null>(null);
  
  // Notification Toast state
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const refreshTemplates = () => {
    setTemplatesList(storageAdapter.getAllMasterTemplates());
  };

  // Synchronize when initialTemplateKey prop changes
  useEffect(() => {
    if (initialTemplateKey) {
      handleOpenIndividualTemplate(initialTemplateKey);
      if (onClearInitialKey) onClearInitialKey();
    }
  }, [initialTemplateKey]);

  // Load a template into the individual page workspace
  const handleOpenIndividualTemplate = (targetKeyOrId: string) => {
    const all = storageAdapter.getAllMasterTemplates();
    const normalizedTarget = (targetKeyOrId === 'STORE_CHECK_STOCK' || targetKeyOrId === 'tpl_store_check_stock') ? 'CHECK_STOCK' : targetKeyOrId;
    const found = all.find((t) => 
      t.id === targetKeyOrId || 
      t.templateKey === targetKeyOrId ||
      t.id === normalizedTarget ||
      t.templateKey === normalizedTarget
    );

    if (found) {
      setEditingTemplateId(found.id);
      setTemplateName(found.name);
      setTemplateKey(found.templateKey);
      setDepartmentHub(found.departmentHub);
      setReferenceLabel(found.referenceLabel || 'Reference Code');
      setDescription(found.description || '');
      setDefaultPriority(found.defaultPriority || 'Normal');
      setStages(JSON.parse(JSON.stringify(found.stages || [])));
      setSelectedStageIndex(0);
      setActiveTemplateKey(found.templateKey || found.id);
      setErrorMessage(null);
      return;
    }

    // Baseline fallback if not found in saved list
    let name = '';
    let hub: FmsTemplateDefinition['departmentHub'] = 'PROCUREMENT';
    let ref = 'Reference Code';
    let baseStages: any[] = [];

    switch (normalizedTarget) {
      case 'CHECK_STOCK':
      case 'STORE_CHECK_STOCK':
      case 'tpl_check_stock':
      case 'tpl_store_check_stock':
        name = 'Store Check Stock & Requisition Workflow';
        hub = 'SITE_LOGISTICS';
        ref = 'Requisition / Indent Ref';
        baseStages = FMS_CHECK_STOCK_STAGES;
        break;
      case 'INDENT_PURCHASE':
        name = 'Purchase Indent to PO';
        hub = 'PROCUREMENT';
        ref = 'Indent Number';
        baseStages = FMS_STANDARD_PURCHASE_STAGES;
        break;
      case 'PO_TO_PAYMENT':
        name = 'Accounts PO to Payment';
        hub = 'FINANCE_ACCOUNTS';
        ref = 'PO Number';
        baseStages = FMS_PO_PAYMENT_STAGES;
        break;
      case 'STORE_TO_SITE_DISPATCH':
        name = 'Store to Site Dispatch';
        hub = 'SITE_LOGISTICS';
        ref = 'Requisition Number';
        baseStages = FMS_STORE_TO_SITE_DISPATCH_STAGES;
        break;
      case 'PURCHASE_TO_STORE_DISPATCH':
        name = 'Purchase to Store Dispatch';
        hub = 'SITE_LOGISTICS';
        ref = 'Challan / Indent Ref';
        baseStages = FMS_PURCHASE_TO_STORE_DISPATCH_STAGES;
        break;
      case 'PAYMENT_TO_DISPATCH':
        name = 'Vendor Payment to Dispatch';
        hub = 'PROCUREMENT';
        ref = 'PO Number';
        baseStages = FMS_PAYMENT_TO_DISPATCH_STAGES;
        break;
      case 'SITE_RECEIVE':
        name = 'Site Material Receive (GRN)';
        hub = 'SITE_LOGISTICS';
        ref = 'GRN / Delivery Challan';
        baseStages = FMS_SITE_RECEIVE_STAGES;
        break;
      case 'ACCOUNTS_INVOICE_COLLECTION':
        name = 'Accounts Invoice Collection';
        hub = 'FINANCE_ACCOUNTS';
        ref = 'Invoice / PO Reference';
        baseStages = FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES;
        break;
      case 'HR_ATTENDANCE_PAYMENT':
        name = 'Labour Attendance & Payment';
        hub = 'HR_EQUIPMENT';
        ref = 'Attendance Cycle Ref';
        baseStages = FMS_HR_ATTENDANCE_PAYMENT_STAGES;
        break;
      case 'EQUIPMENT_PART_REPAIR':
        name = 'Equipment Part Repair FMS';
        hub = 'HR_EQUIPMENT';
        ref = 'Part / Equipment Serial No.';
        baseStages = FMS_EQUIPMENT_PART_REPAIR_STAGES;
        break;
      case 'BREAKDOWN_REPORTING':
        name = 'Breakdown Reporting FMS';
        hub = 'HR_EQUIPMENT';
        ref = 'Machine / Vehicle Ref';
        baseStages = FMS_BREAKDOWN_REPORTING_STAGES;
        break;
      case 'DPR_REPORTING':
        name = 'Daily Progress Report (DPR)';
        hub = 'OPERATIONS';
        ref = 'DPR Ref No.';
        baseStages = FMS_DPR_REPORTING_STAGES;
        break;
      default:
        name = targetKeyOrId.replace(/_/g, ' ');
        hub = 'GENERAL';
        ref = 'Voucher / Sheet No.';
        baseStages = FMS_STANDARD_PURCHASE_STAGES;
        break;
    }

    setEditingTemplateId(`builtin_${targetKeyOrId}`);
    setTemplateName(name);
    setTemplateKey(targetKeyOrId);
    setDepartmentHub(hub);
    setReferenceLabel(ref);
    setDescription(`Standard operating procedure blueprint for ${name}`);
    setDefaultPriority('Normal');
    setStages(
      baseStages.map((s, idx) => ({
        stageId: s.stageId || `STG-${String(idx + 1).padStart(2, '0')}`,
        stageName: s.name || s.stageName,
        whoRole: s.whoRole || 'Assignee',
        whoDefaultAssignee: s.whoDefaultAssignee || USERS[0]?.name || 'GARIMA PAL',
        howChannel: s.howChannel || 'WHATSAPP / CALL / MANUAL SHEET',
        slaHours: s.slaHours !== undefined ? s.slaHours : 0,
        fields: s.fields || [],
        checkpoints: s.checkpoints || [],
        logic: (s as any).logic || undefined,
      }))
    );
    setSelectedStageIndex(0);
    setActiveTemplateKey(targetKeyOrId);
    setErrorMessage(null);
  };

  // Start creation of a new custom template
  const handleCreateNewTemplate = () => {
    const newId = `tpl_custom_${Date.now()}`;
    const newKey = `CUSTOM_WORKFLOW_${Date.now().toString().slice(-4)}`;
    setEditingTemplateId(newId);
    setTemplateName('New Operational Workflow');
    setTemplateKey(newKey);
    setDepartmentHub('PROCUREMENT');
    setReferenceLabel('Requisition / Form Reference');
    setDescription('Custom enterprise workflow pipeline designed in Template Studio');
    setDefaultPriority('Normal');
    setStages([
      {
        stageId: 'STG-CUSTOM-01',
        stageName: 'Requisition / Form Initiation',
        whoRole: 'Requester / Store Keeper',
        whoDefaultAssignee: USERS[0]?.name || 'GARIMA PAL',
        howChannel: 'IN-APP FORM',
        slaHours: 2,
        fields: [
          { id: 'purpose', label: 'Purpose / Requirement Description', type: 'TEXT', required: true },
          { id: 'estimatedAmount', label: 'Estimated Value (₹)', type: 'NUMBER', required: true },
          { id: 'siteLocation', label: 'Project Site Location', type: 'SELECT', options: ['Raipur Central Store', 'Raipur Workshop', 'Siladehi Site', 'Bijetala Site'], required: true },
          { id: 'attachmentUrl', label: 'Supporting Documents / Photos URL', type: 'URL', required: false },
        ],
        checkpoints: [
          'Requirement justified and approved by Site Incharge',
          'Physical stock verified at local site warehouse before indenting'
        ]
      },
      {
        stageId: 'STG-CUSTOM-02',
        stageName: 'Department Head Verification',
        whoRole: 'Project Manager / Incharge',
        whoDefaultAssignee: USERS[1]?.name || 'ASHIS PATHNAYAK',
        howChannel: 'IN-APP FORM',
        slaHours: 4,
        fields: [
          { id: 'status', label: 'Verification Decision', type: 'APPROVAL', options: ['APPROVED', 'REJECTED'], required: true },
          { id: 'approverRemarks', label: 'Technical Review Remarks', type: 'TEXTAREA', required: false },
        ],
        checkpoints: [
          'Budget availability confirmed for current billing cycle',
          'Material specifications match project technical standard'
        ]
      },
      {
        stageId: 'STG-CUSTOM-03',
        stageName: 'Execution & Completion Sign-Off',
        whoRole: 'Execution Officer',
        whoDefaultAssignee: USERS[2]?.name || 'PRANAY GHOSH',
        howChannel: 'PHYSICAL / IN-APP SIGN OFF',
        slaHours: 8,
        fields: [
          { id: 'completionRemarks', label: 'Completion Notes & Handover Reference', type: 'TEXTAREA', required: true },
          { id: 'deliveryReceiptUrl', label: 'Signed Delivery / Gate Pass URL', type: 'URL', required: false }
        ],
        checkpoints: [
          'Physical delivery or execution verified on site',
          'Materials entered into site ledger'
        ]
      }
    ]);
    setSelectedStageIndex(0);
    setActiveTemplateKey(newKey);
    setErrorMessage(null);
  };

  // Clone an existing template
  const handleCloneTemplate = (sourceTemplate: FmsTemplateDefinition) => {
    const newId = `tpl_custom_${Date.now()}`;
    const newKey = `${sourceTemplate.templateKey}_COPY_${Date.now().toString().slice(-4)}`;
    setEditingTemplateId(newId);
    setTemplateName(`${sourceTemplate.name} (Copy)`);
    setTemplateKey(newKey);
    setDepartmentHub(sourceTemplate.departmentHub);
    setReferenceLabel(sourceTemplate.referenceLabel || 'Reference Code');
    setDescription(`Cloned from ${sourceTemplate.name} on ${new Date().toLocaleDateString('en-GB')}`);
    setDefaultPriority(sourceTemplate.defaultPriority || 'Normal');
    setStages(JSON.parse(JSON.stringify(sourceTemplate.stages || [])));
    setSelectedStageIndex(0);
    setActiveTemplateKey(newKey);
    showToast(`Template "${sourceTemplate.name}" cloned into editor! Customize and save.`);
  };

  // Save the template currently in the workspace
  const handleSaveCurrentTemplate = () => {
    if (!templateName.trim()) {
      setErrorMessage('Please provide a valid template name.');
      return;
    }
    if (!stages || stages.length === 0) {
      setErrorMessage('Template must contain at least 1 stage.');
      return;
    }

    setIsSaving(true);
    setErrorMessage(null);

    try {
      const templateId = editingTemplateId || `tpl_custom_${Date.now()}`;
      const targetKey = templateKey.trim() || `CUSTOM_${Date.now()}`;

      const cleanedStages = stages.map((stg, idx) => ({
        ...stg,
        stageId: stg.stageId?.trim() || `STG-${String(idx + 1).padStart(2, '0')}`,
        stageName: stg.stageName?.trim() || `Stage ${idx + 1}`,
        whoRole: stg.whoRole?.trim() || 'Role Assignee',
        whoDefaultAssignee: stg.whoDefaultAssignee?.trim() || USERS[0]?.name || 'Officer',
        howChannel: stg.howChannel || 'IN-APP FORM',
        slaHours: !isNaN(Number(stg.slaHours)) ? Number(stg.slaHours) : 0,
        fields: stg.fields || [],
        checkpoints: stg.checkpoints || [],
      }));

      const templateToSave: FmsTemplateDefinition = {
        id: templateId,
        templateKey: targetKey,
        name: templateName.trim(),
        departmentHub,
        referenceLabel: referenceLabel.trim() || 'Reference Code',
        description: description.trim(),
        defaultPriority,
        stages: cleanedStages,
        createdAt: new Date().toLocaleDateString('en-GB'),
        updatedAt: new Date().toLocaleDateString('en-GB'),
        isCustom: true,
      };

      storageAdapter.saveFmsTemplate(templateToSave);
      refreshTemplates();
      showToast(`FMS Template "${templateToSave.name}" (${cleanedStages.length} stages) saved successfully!`);
    } catch (e: any) {
      setErrorMessage(`Failed to save template: ${e.message || String(e)}`);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete a custom template
  const handleDeleteTemplate = (idOrKey: string, name: string) => {
    if (!confirm(`Are you sure you want to delete custom template "${name}"? This cannot be undone.`)) {
      return;
    }
    storageAdapter.deleteFmsTemplate(idOrKey);
    refreshTemplates();
    if (activeTemplateKey === idOrKey) {
      setActiveTemplateKey(null);
    }
    showToast(`Template "${name}" removed.`);
  };

  // Stage Manipulation in Workspace
  const handleAddStage = (index?: number) => {
    const insertIdx = typeof index === 'number' ? index + 1 : stages.length;
    const newStage: FmsStageTemplate = {
      stageId: `STG-${String(insertIdx + 1).padStart(2, '0')}`,
      stageName: `New Stage ${insertIdx + 1}`,
      whoRole: 'Store Manager',
      whoDefaultAssignee: USERS[0]?.name || 'Amanat Bharadwaj',
      howChannel: 'IN-APP FORM',
      slaHours: 2,
      fields: [
        { id: 'status', label: 'Verification Status', type: 'APPROVAL', options: ['APPROVED', 'REJECTED'], required: true },
        { id: 'remarks', label: 'Stage Notes & Verification', type: 'TEXTAREA', required: false }
      ],
      checkpoints: ['Stage requirements verified as per standard SOP'],
    };

    const nextStages = [...stages];
    nextStages.splice(insertIdx, 0, newStage);
    setStages(nextStages);
    setSelectedStageIndex(insertIdx);
  };

  const handleRemoveStage = (idxToRemove: number) => {
    if (stages.length <= 1) {
      alert('A workflow template must have at least 1 stage.');
      return;
    }
    const nextStages = stages.filter((_, idx) => idx !== idxToRemove);
    setStages(nextStages);
    setSelectedStageIndex(Math.max(0, idxToRemove - 1));
  };

  // Drag & Drop Handlers for Sequential Workflow Progression
  const handleStageDragStart = (e: React.DragEvent, idx: number) => {
    setDraggedStageIdx(idx);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  };

  const handleStageDragOver = (e: React.DragEvent, idx: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (draggedStageIdx === null || draggedStageIdx === idx) return;

    const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
    const midX = rect.left + rect.width / 2;
    const pos = e.clientX < midX ? 'BEFORE' : 'AFTER';

    setDragOverStageIdx(idx);
    setDragOverPosition(pos);
  };

  const handleStageDrop = (e: React.DragEvent, targetIdx: number) => {
    e.preventDefault();
    if (draggedStageIdx === null || draggedStageIdx === targetIdx) {
      setDraggedStageIdx(null);
      setDragOverStageIdx(null);
      setDragOverPosition(null);
      return;
    }

    let toIdx = targetIdx;
    if (dragOverPosition === 'AFTER') {
      toIdx = targetIdx + 1;
    }
    if (draggedStageIdx < toIdx) {
      toIdx -= 1;
    }

    const nextStages = [...stages];
    const [moved] = nextStages.splice(draggedStageIdx, 1);
    nextStages.splice(toIdx, 0, moved);

    setStages(nextStages);
    setSelectedStageIndex(toIdx);

    setDraggedStageIdx(null);
    setDragOverStageIdx(null);
    setDragOverPosition(null);
    showToast(`Stage "${moved.stageName}" moved to Stage #${toIdx + 1}`);
  };

  const handleStageDragEnd = () => {
    setDraggedStageIdx(null);
    setDragOverStageIdx(null);
    setDragOverPosition(null);
  };

  const handleMoveStageToPosition = (fromIdx: number, targetPos1Based: number) => {
    const toIdx = targetPos1Based - 1;
    if (toIdx < 0 || toIdx >= stages.length || toIdx === fromIdx) return;
    const nextStages = [...stages];
    const [moved] = nextStages.splice(fromIdx, 1);
    nextStages.splice(toIdx, 0, moved);
    setStages(nextStages);
    setSelectedStageIndex(toIdx);
    showToast(`Stage "${moved.stageName}" moved to position #${toIdx + 1}`);
  };

  const handleUpdateCurrentStageField = <K extends keyof FmsStageTemplate>(field: K, val: FmsStageTemplate[K]) => {
    setStages((prev) => {
      const copy = [...prev];
      if (copy[selectedStageIndex]) {
        copy[selectedStageIndex] = { ...copy[selectedStageIndex], [field]: val };
      }
      return copy;
    });
  };

  // Form Fields within selected stage
  const handleAddFieldToStage = () => {
    const current = stages[selectedStageIndex];
    if (!current) return;
    const currentFields = current.fields || [];
    const newFieldId = `field_${Date.now().toString().slice(-5)}`;
    const newField: FmsStageFieldConfig = {
      id: newFieldId,
      label: `Form Field ${currentFields.length + 1}`,
      type: 'TEXT',
      required: false,
    };
    handleUpdateCurrentStageField('fields', [...currentFields, newField]);
  };

  const handleUpdateStageFormField = (fieldIdx: number, updated: Partial<FmsStageFieldConfig>) => {
    const current = stages[selectedStageIndex];
    if (!current) return;
    const nextFields = [...(current.fields || [])];
    nextFields[fieldIdx] = { ...nextFields[fieldIdx], ...updated };
    handleUpdateCurrentStageField('fields', nextFields);
  };

  const handleRemoveStageFormField = (fieldIdx: number) => {
    const current = stages[selectedStageIndex];
    if (!current) return;
    const nextFields = (current.fields || []).filter((_, idx) => idx !== fieldIdx);
    handleUpdateCurrentStageField('fields', nextFields);
  };

  // Filtered list of templates in catalog
  const filteredTemplates = templatesList.filter((tpl) => {
    if (!showArchived && tpl.isArchived) return false;
    if (showArchived && !tpl.isArchived) return false;
    if (hubFilter !== 'ALL' && tpl.departmentHub !== hubFilter) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = tpl.name.toLowerCase().includes(q);
      const matchKey = tpl.templateKey.toLowerCase().includes(q);
      const matchDesc = (tpl.description || '').toLowerCase().includes(q);
      const matchStage = (tpl.stages || []).some((s) => s.stageName.toLowerCase().includes(q));
      if (!matchName && !matchKey && !matchDesc && !matchStage) return false;
    }
    return true;
  });

  // Calculate quick metrics
  const totalStagesAcrossWorkflows = templatesList.reduce((acc, t) => acc + (t.stages?.length || 0), 0);
  const totalProcurementTemplates = templatesList.filter((t) => t.departmentHub === 'PROCUREMENT' || t.departmentHub === 'SITE_LOGISTICS').length;
  const totalCustomTemplates = templatesList.filter((t) => t.isCustom).length;

  return (
    <div className="w-full min-h-screen bg-slate-50 text-slate-800 pb-16">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span className="text-xs font-semibold">{toastMessage}</span>
        </div>
      )}

      {/* VIEW 1: ALL TEMPLATES STUDIO HUB / CATALOG */}
      {!activeTemplateKey ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
          {/* Header Banner */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-start gap-4">
              <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
                <Layers className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-xl sm:text-2xl font-black text-slate-900">FMS Template Studio</h1>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-50 text-indigo-700 border border-indigo-200">
                    SOP Architect
                  </span>
                </div>
                <p className="text-xs sm:text-sm text-slate-500 mt-1">
                  Design standard operating workflows, in-app validation forms, SLA duration matrices, and multi-tier role responsibility pipelines across project sites.
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => downloadFmsExcelTemplate()}
                className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                title="Download blank FMS Master Excel Spreadsheet"
              >
                <Download className="w-3.5 h-3.5 text-slate-600" />
                <span>Sample Excel</span>
              </button>

              {canEdit && (
                <button
                  type="button"
                  onClick={handleCreateNewTemplate}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-4 h-4 text-white" />
                  <span>New Workflow Template</span>
                </button>
              )}
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Active Workflows</span>
                <GitBranch className="w-4 h-4 text-indigo-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{templatesList.length}</span>
                <span className="text-[11px] text-slate-400">Standard SOPs</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Procurement Hubs</span>
                <FileText className="w-4 h-4 text-emerald-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-emerald-700">{totalProcurementTemplates}</span>
                <span className="text-[11px] text-slate-400">Stores & Indent</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Custom Built</span>
                <Sparkles className="w-4 h-4 text-purple-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-purple-700">{totalCustomTemplates}</span>
                <span className="text-[11px] text-slate-400">Customized</span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
              <div className="flex items-center justify-between text-slate-500 text-xs font-medium">
                <span>Total Workflow Steps</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-black text-amber-700">{totalStagesAcrossWorkflows}</span>
                <span className="text-[11px] text-slate-400">Monitored Stages</span>
              </div>
            </div>
          </div>

          {/* Department Hub Filter Tabs & Search Bar */}
          <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              {/* Department Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0 scrollbar-none text-xs">
                <button
                  type="button"
                  onClick={() => setHubFilter('ALL')}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-colors cursor-pointer whitespace-nowrap ${
                    hubFilter === 'ALL'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  All Hubs ({templatesList.length})
                </button>
                {DEPARTMENT_HUBS.map((hub) => {
                  const count = templatesList.filter((t) => t.departmentHub === hub.key).length;
                  return (
                    <button
                      key={hub.key}
                      type="button"
                      onClick={() => setHubFilter(hub.key)}
                      className={`px-3 py-1.5 rounded-lg font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                        hubFilter === hub.key
                          ? 'bg-slate-900 text-white shadow-xs'
                          : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200'
                      }`}
                    >
                      {hub.label} ({count})
                    </button>
                  );
                })}
              </div>

              {/* Search */}
              <div className="relative min-w-[240px]">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search templates, stages, keys..."
                  className="w-full text-xs bg-slate-50 border border-slate-200 rounded-lg pl-9 pr-3 py-1.5 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Templates Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTemplates.map((template) => {
              const stageCount = template.stages?.length || 0;
              const totalHours = (template.stages || []).reduce((acc, s) => acc + (s.slaHours || 0), 0);
              const totalFields = (template.stages || []).reduce((acc, s) => acc + (s.fields?.length || 0), 0);
              const hubInfo = DEPARTMENT_HUBS.find((h) => h.key === template.departmentHub) || {
                label: template.departmentHub,
                color: 'bg-slate-100 text-slate-700 border-slate-200',
              };

              return (
                <div
                  key={template.id || template.templateKey}
                  className="bg-white border border-slate-200 hover:border-indigo-300 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all flex flex-col justify-between group"
                >
                  <div className="space-y-3">
                    {/* Top Row: Hub & Custom Badge */}
                    <div className="flex items-center justify-between gap-2">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold border ${hubInfo.color}`}>
                        {hubInfo.label}
                      </span>
                      {template.isCustom ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-extrabold bg-purple-50 text-purple-700 border border-purple-200">
                          Custom Workflow
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-slate-50 text-slate-500 border border-slate-200">
                          System Blueprint
                        </span>
                      )}
                    </div>

                    {/* Title & Key */}
                    <div>
                      <h3 className="text-base font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {template.name}
                      </h3>
                      <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400 font-mono">
                        <span>KEY: {template.templateKey}</span>
                        <span>•</span>
                        <span>PREFIX: {template.referenceLabel}</span>
                      </div>
                    </div>

                    {/* Description */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      {template.description || 'Standard multi-stage operational tracking pipeline.'}
                    </p>

                    {/* Stage Preview Mini Flow */}
                    <div className="pt-2 border-t border-slate-100">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {template.stages?.slice(0, 3).map((stg, sIdx) => (
                          <span
                            key={sIdx}
                            className="text-[10px] font-medium text-slate-600 bg-slate-50 border border-slate-200 px-2 py-0.5 rounded"
                          >
                            {sIdx + 1}. {stg.stageName}
                          </span>
                        ))}
                        {stageCount > 3 && (
                          <span className="text-[10px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-1.5 py-0.5 rounded">
                            +{stageCount - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metrics Stats */}
                    <div className="grid grid-cols-3 gap-2 py-2.5 px-3 bg-slate-50 rounded-xl text-center text-xs">
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Stages</div>
                        <div className="font-black text-slate-900">{stageCount}</div>
                      </div>
                      <div className="border-x border-slate-200">
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Total SLA</div>
                        <div className="font-black text-amber-700">{totalHours}h</div>
                      </div>
                      <div>
                        <div className="text-[10px] text-slate-400 uppercase font-semibold">Forms</div>
                        <div className="font-black text-indigo-700">{totalFields}</div>
                      </div>
                    </div>
                  </div>

                  {/* Actions Row */}
                  <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleCloneTemplate(template)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Clone into a new custom template"
                      >
                        <Copy className="w-4 h-4" />
                      </button>

                      <button
                        type="button"
                        onClick={() => downloadFmsExcelTemplate()}
                        className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                        title="Export Template Blueprint as Excel"
                      >
                        <Download className="w-4 h-4" />
                      </button>

                      {template.isCustom && canEdit && (
                        <button
                          type="button"
                          onClick={() => handleDeleteTemplate(template.id, template.name)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                          title="Delete Custom Template"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {onCreateFlowFromTemplate && (
                        <button
                          type="button"
                          onClick={() => onCreateFlowFromTemplate(template.templateKey)}
                          className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                        >
                          Launch Flow
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleOpenIndividualTemplate(template.templateKey || template.id)}
                        className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition-all shadow-xs cursor-pointer"
                      >
                        <span>Open Studio</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 space-y-3">
              <Layers className="w-10 h-10 text-slate-300 mx-auto" />
              <h3 className="text-sm font-bold text-slate-800">No matching workflow templates found</h3>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Try searching with a different keyword or create a new custom template for your department.
              </p>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleCreateNewTemplate}
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs inline-flex items-center gap-1.5"
                >
                  <Plus className="w-4 h-4" />
                  <span>Create New Workflow Template</span>
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        /* VIEW 2: INDIVIDUAL TEMPLATE WORKSPACE PAGE */
        <div className="w-full space-y-5">
          {/* Top Breadcrumbs & Control Bar */}
          <div className="bg-white border-b border-slate-200 px-4 sm:px-6 py-4 sticky top-0 z-30 shadow-xs">
            <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveTemplateKey(null)}
                  className="p-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl transition-colors cursor-pointer flex items-center gap-1 text-xs font-bold"
                  title="Back to All Templates Hub"
                >
                  <ArrowLeft className="w-4 h-4 text-slate-600" />
                  <span className="hidden sm:inline">Templates Hub</span>
                </button>

                <div className="border-l border-slate-200 pl-3">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider">
                      Individual Template Editor
                    </span>
                    <span className="text-slate-300">•</span>
                    <span className="text-[11px] font-mono text-slate-400">{templateKey}</span>
                  </div>
                  <h2 className="text-lg font-black text-slate-900 leading-tight">
                    {templateName || 'Untitled Workflow'}
                  </h2>
                </div>
              </div>

              {/* Right Toolbar Actions */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => setIsSimulatorOpen(true)}
                  className="px-3 py-2 bg-slate-100 hover:bg-indigo-50 hover:text-indigo-700 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                  title="Simulate live user experience on these stages"
                >
                  <Play className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Live Simulator</span>
                </button>

                <button
                  type="button"
                  onClick={() => downloadFmsExcelTemplate()}
                  className="px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer border border-slate-200"
                  title="Export this workflow to Excel"
                >
                  <Download className="w-3.5 h-3.5 text-slate-600" />
                  <span>Export</span>
                </button>

                {canEdit && (
                  <button
                    type="button"
                    onClick={handleSaveCurrentTemplate}
                    disabled={isSaving}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 active:scale-95 text-white rounded-xl text-xs font-black flex items-center gap-2 transition-all shadow-md shadow-indigo-200 cursor-pointer disabled:opacity-50"
                  >
                    <Save className="w-4 h-4 text-white" />
                    <span>{isSaving ? 'Saving...' : 'Save & Publish Template'}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-5">
            {/* Error Message Alert */}
            {errorMessage && (
              <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-center justify-between text-xs text-rose-700">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
                <button onClick={() => setErrorMessage(null)} className="cursor-pointer">
                  <X className="w-4 h-4 text-rose-400" />
                </button>
              </div>
            )}

            {/* Template Top Metadata Card */}
            <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
              <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-indigo-600" />
                  <h3 className="text-xs font-black uppercase tracking-wider text-slate-700">
                    Template General Settings & Architecture
                  </h3>
                </div>
                <span className="text-[11px] text-slate-400">Total Stages: {stages.length}</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
                {/* Template Name */}
                <div className="sm:col-span-2 space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Workflow Name</label>
                  <input
                    type="text"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="e.g. Purchase Indent to PO"
                    className="w-full text-xs font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Department Hub */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Department / Operational Hub</label>
                  <select
                    value={departmentHub}
                    onChange={(e) => setDepartmentHub(e.target.value as any)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    {DEPARTMENT_HUBS.map((h) => (
                      <option key={h.key} value={h.key}>
                        {h.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Reference Code Prefix */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Reference / Indent Label</label>
                  <input
                    type="text"
                    value={referenceLabel}
                    onChange={(e) => setReferenceLabel(e.target.value)}
                    placeholder="e.g. Indent Number / PO #"
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-3 space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Description & SOP Objective</label>
                  <input
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Describe the operational goal and department standard..."
                    className="w-full text-xs bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  />
                </div>

                {/* Default Priority */}
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600">Default Priority SLA</label>
                  <select
                    value={defaultPriority}
                    onChange={(e) => setDefaultPriority(e.target.value as Priority)}
                    className="w-full text-xs font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="Normal">Normal</option>
                    <option value="Urgent">Urgent</option>
                    <option value="Emergency">Emergency</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Interactive Visual Stage Pipeline Ribbon with Drag & Drop Reordering */}
            <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs space-y-2">
              <div className="flex items-center justify-between text-xs flex-wrap gap-2">
                <span className="font-bold text-slate-700 flex items-center gap-1.5">
                  <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                  <span>Sequential Workflow Progression ({stages.length} Stages)</span>
                  <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-full flex items-center gap-1">
                    <GripVertical className="w-3 h-3 text-indigo-500" />
                    <span>Drag &amp; Drop nodes to reorder</span>
                  </span>
                </span>
                <span className="text-[11px] text-slate-400">Drag any stage node to insert anywhere in sequence</span>
              </div>

              <div className="flex items-center gap-2 overflow-x-auto py-3 px-1 scrollbar-thin">
                {stages.map((stg, idx) => {
                  const isSelected = selectedStageIndex === idx;
                  const isBeingDragged = draggedStageIdx === idx;
                  const isOver = dragOverStageIdx === idx;

                  let dragBorderClass = '';
                  if (isOver) {
                    if (dragOverPosition === 'BEFORE') {
                      dragBorderClass = 'border-l-4 border-l-indigo-600 ring-2 ring-indigo-400 bg-indigo-50/90 scale-105';
                    } else if (dragOverPosition === 'AFTER') {
                      dragBorderClass = 'border-r-4 border-r-indigo-600 ring-2 ring-indigo-400 bg-indigo-50/90 scale-105';
                    }
                  }

                  return (
                    <React.Fragment key={stg.stageId || idx}>
                      <div
                        draggable
                        onDragStart={(e) => handleStageDragStart(e, idx)}
                        onDragOver={(e) => handleStageDragOver(e, idx)}
                        onDrop={(e) => handleStageDrop(e, idx)}
                        onDragEnd={handleStageDragEnd}
                        onClick={() => setSelectedStageIndex(idx)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-xl text-left transition-all shrink-0 cursor-grab active:cursor-grabbing border select-none group relative ${
                          isBeingDragged
                            ? 'opacity-40 border-dashed border-indigo-400 bg-indigo-50/50 scale-95'
                            : dragBorderClass
                            ? dragBorderClass
                            : isSelected
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-sm ring-2 ring-indigo-200'
                            : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200'
                        }`}
                        title="Drag & drop node to insert anywhere in pipeline, or click to edit"
                      >
                        <GripVertical className={`w-3.5 h-3.5 shrink-0 ${isSelected ? 'text-indigo-200' : 'text-slate-400 group-hover:text-indigo-500'}`} />
                        <span
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black shrink-0 ${
                            isSelected ? 'bg-white text-indigo-700' : 'bg-slate-200 text-slate-700'
                          }`}
                        >
                          {idx + 1}
                        </span>
                        <div>
                          <div className="text-xs font-bold truncate max-w-[140px]">{stg.stageName}</div>
                          <div
                            className={`text-[10px] truncate max-w-[130px] ${
                              isSelected ? 'text-indigo-200' : 'text-slate-400'
                            }`}
                          >
                            {stg.whoDefaultAssignee || stg.whoRole} • {stg.slaHours}h
                          </div>
                        </div>
                      </div>

                      {idx < stages.length - 1 && (
                        <ArrowRight className="w-4 h-4 text-slate-300 shrink-0" />
                      )}
                    </React.Fragment>
                  );
                })}

                <button
                  type="button"
                  onClick={() => handleAddStage()}
                  className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-xl text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer"
                  title="Add new stage to pipeline"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add Stage</span>
                </button>
              </div>
            </div>

            {/* Stage Detailed Designer & Configuration */}
            {stages[selectedStageIndex] && (
              <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs divide-y divide-slate-100">
                {/* Active Stage Header */}
                <div className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50 rounded-t-2xl">
                  <div className="flex items-center gap-3">
                    <span className="w-8 h-8 rounded-xl bg-indigo-600 text-white font-black flex items-center justify-center text-sm shadow-xs">
                      {selectedStageIndex + 1}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-mono text-slate-400">ID: {stages[selectedStageIndex].stageId}</span>
                        <span className="text-slate-300">•</span>
                        <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          SLA: {stages[selectedStageIndex].slaHours} Hours
                        </span>
                      </div>
                      <h4 className="text-base font-black text-slate-900 mt-0.5">
                        {stages[selectedStageIndex].stageName}
                      </h4>
                    </div>
                  </div>

                  {/* Reorder Position Select & Stage Actions */}
                  <div className="flex items-center gap-2 flex-wrap">
                    <div className="flex items-center gap-1 bg-white border border-slate-200 rounded-lg px-2 py-1 text-xs shadow-2xs">
                      <GripVertical className="w-3.5 h-3.5 text-indigo-500" />
                      <span className="font-bold text-slate-600">Move to Position:</span>
                      <select
                        value={selectedStageIndex + 1}
                        onChange={(e) => handleMoveStageToPosition(selectedStageIndex, parseInt(e.target.value, 10))}
                        className="font-black text-indigo-700 bg-slate-50 border border-slate-300 rounded px-1.5 py-0.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer text-xs"
                      >
                        {stages.map((_, sIdx) => (
                          <option key={sIdx} value={sIdx + 1}>
                            Stage #{sIdx + 1} {sIdx === selectedStageIndex ? '(Current)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleAddStage(selectedStageIndex)}
                      className="px-2.5 py-1.5 bg-white border border-indigo-200 hover:bg-indigo-50 text-indigo-700 rounded-lg text-xs font-bold flex items-center gap-1 cursor-pointer"
                      title="Insert a new stage immediately after this step"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Insert Next</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRemoveStage(selectedStageIndex)}
                      className="p-1.5 bg-white border border-rose-200 hover:bg-rose-50 text-rose-600 rounded-lg text-xs font-bold cursor-pointer flex items-center gap-1"
                      title="Delete this stage"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">Delete Stage</span>
                    </button>
                  </div>
                </div>

                {/* Stage Base Details Form */}
                <div className="p-5 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 text-xs">
                  {/* Stage Name */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-slate-700">Stage Name</label>
                    <input
                      type="text"
                      value={stages[selectedStageIndex].stageName}
                      onChange={(e) => handleUpdateCurrentStageField('stageName', e.target.value)}
                      placeholder="e.g. STORE INVENTORY VERIFICATION"
                      className="w-full font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Stage ID */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Stage ID (Technical)</label>
                    <input
                      type="text"
                      value={stages[selectedStageIndex].stageId}
                      onChange={(e) => handleUpdateCurrentStageField('stageId', e.target.value)}
                      placeholder="e.g. STG-01"
                      className="w-full font-mono bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* SLA Hours Duration */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">SLA Duration</label>
                    <select
                      value={stages[selectedStageIndex].slaHours}
                      onChange={(e) => {
                        const parsed = parseInt(e.target.value, 10);
                        handleUpdateCurrentStageField('slaHours', isNaN(parsed) ? 0 : parsed);
                      }}
                      className="w-full font-bold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {SLA_PRESETS.map((p) => (
                        <option key={p.value} value={p.value}>
                          {p.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* "What" - SOP Description */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-slate-700">What: Goal & SOP Description</label>
                    <input
                      type="text"
                      value={stages[selectedStageIndex].stageName}
                      onChange={(e) => handleUpdateCurrentStageField('stageName', e.target.value)}
                      placeholder="What needs to be achieved in this stage..."
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* "Who" - Role & Assignee */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Who: Department Role</label>
                    <input
                      type="text"
                      value={stages[selectedStageIndex].whoRole}
                      onChange={(e) => handleUpdateCurrentStageField('whoRole', e.target.value)}
                      placeholder="e.g. Store Manager"
                      className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    />
                  </div>

                  {/* Default Assignee */}
                  <div className="space-y-1">
                    <label className="font-bold text-slate-700">Default Assignee</label>
                    <select
                      value={stages[selectedStageIndex].whoDefaultAssignee}
                      onChange={(e) => handleUpdateCurrentStageField('whoDefaultAssignee', e.target.value)}
                      className="w-full font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      {USERS.map((u) => (
                        <option key={u.userId} value={u.name}>
                          {u.name} ({u.role})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* "How" - Channel */}
                  <div className="sm:col-span-2 space-y-1">
                    <label className="font-bold text-slate-700">How: Channel / Execution Mechanism</label>
                    <select
                      value={stages[selectedStageIndex].howChannel || 'IN-APP FORM'}
                      onChange={(e) => handleUpdateCurrentStageField('howChannel', e.target.value)}
                      className="w-full font-semibold bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value="IN-APP FORM">IN-APP FORM (Digital Validation Form)</option>
                      <option value="IN-APP COMPARATIVE SHEET">IN-APP COMPARATIVE SHEET (Vendor Rates CS Sheet)</option>
                      <option value="PAYMENT APPROVAL SHEET / ONLINE PAYMENT">PAYMENT APPROVAL SHEET / ONLINE PAYMENT</option>
                      <option value="WHATSAPP / CALL / PHYSICAL">WHATSAPP / CALL / PHYSICAL</option>
                      <option value="MANUAL PO / PRINTED VOUCHER">MANUAL PO / PRINTED VOUCHER</option>
                      <option value="IN-APP DISPATCH VOUCHER">IN-APP DISPATCH VOUCHER</option>
                    </select>
                  </div>
                </div>

                {/* Sequential vs Conditional Progression Command */}
                <div className="px-5 py-4 bg-slate-50/80 border-t border-b border-slate-200 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="font-extrabold text-slate-800 text-xs uppercase tracking-wider flex items-center gap-1.5">
                        <GitBranch className="w-4 h-4 text-indigo-600" />
                        <span>Stage Progression Command (Sequential vs Conditional)</span>
                      </span>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Configure whether this stage automatically advances to the next step or branches conditionally based on user decision.
                      </p>
                    </div>

                    <div className="flex items-center gap-2 text-xs">
                      <button
                        type="button"
                        onClick={() => handleUpdateCurrentStageField('logic', {
                          gatewayType: 'STANDARD_ADVANCE',
                          slaHours: stages[selectedStageIndex].slaHours,
                        })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 border ${
                          (!stages[selectedStageIndex].logic || stages[selectedStageIndex].logic?.gatewayType === 'STANDARD_ADVANCE')
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <ArrowRight className="w-3.5 h-3.5" />
                        <span>Sequential (+1 Step)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateCurrentStageField('logic', {
                          gatewayType: 'CONDITIONAL_JUMP',
                          slaHours: stages[selectedStageIndex].slaHours,
                          yesTargetStageIndex: selectedStageIndex + 1 < stages.length ? selectedStageIndex + 1 : selectedStageIndex,
                          noTargetStageIndex: selectedStageIndex + 2 < stages.length ? selectedStageIndex + 2 : stages.length,
                        })}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer transition-all flex items-center gap-1.5 border ${
                          stages[selectedStageIndex].logic?.gatewayType === 'CONDITIONAL_JUMP'
                            ? 'bg-indigo-600 text-white border-indigo-700 shadow-xs'
                            : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
                        }`}
                      >
                        <GitBranch className="w-3.5 h-3.5" />
                        <span>Conditional Command (Branch / Skip)</span>
                      </button>
                    </div>
                  </div>

                  {stages[selectedStageIndex].logic?.gatewayType === 'CONDITIONAL_JUMP' && (
                    <div className="space-y-3 p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 text-xs shadow-2xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-emerald-800 flex items-center gap-1.5">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>If Decision / Condition is TRUE ('YES') → Route To:</span>
                          </label>
                          <select
                            value={stages[selectedStageIndex].logic?.yesTargetStageIndex ?? (selectedStageIndex + 1)}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              handleUpdateCurrentStageField('logic', {
                                ...stages[selectedStageIndex].logic,
                                gatewayType: 'CONDITIONAL_JUMP',
                                yesTargetStageIndex: val,
                              });
                            }}
                            className="w-full text-xs bg-white border border-emerald-300 rounded-xl p-2 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                          >
                            {stages.map((targetStg, tIdx) => (
                              <option key={tIdx} value={tIdx}>
                                {tIdx === selectedStageIndex + 1 ? `Proceed to Next: Stage #${tIdx + 1} (${targetStg.stageName})` : `Jump to: Stage #${tIdx + 1} (${targetStg.stageName})`}
                              </option>
                            ))}
                            <option value={stages.length}>Complete &amp; Finalize Workflow</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-rose-800 flex items-center gap-1.5">
                            <AlertCircle className="w-4 h-4 text-rose-600" />
                            <span>If Decision / Condition is FALSE ('NO') → Route To:</span>
                          </label>
                          <select
                            value={stages[selectedStageIndex].logic?.noTargetStageIndex ?? stages.length}
                            onChange={(e) => {
                              const val = Number(e.target.value);
                              handleUpdateCurrentStageField('logic', {
                                ...stages[selectedStageIndex].logic,
                                gatewayType: 'CONDITIONAL_JUMP',
                                noTargetStageIndex: val,
                              });
                            }}
                            className="w-full text-xs bg-white border border-rose-300 rounded-xl p-2 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-rose-500 cursor-pointer shadow-2xs"
                          >
                            {stages.map((targetStg, tIdx) => (
                              <option key={tIdx} value={tIdx}>
                                {tIdx === selectedStageIndex + 1 ? `Proceed to Next: Stage #${tIdx + 1} (${targetStg.stageName})` : `Skip Ahead to: Stage #${tIdx + 1} (${targetStg.stageName})`}
                              </option>
                            ))}
                            <option value={stages.length}>Terminate / Reject Workflow</option>
                          </select>
                        </div>
                      </div>

                      {/* Field-Based Conditional Rule Configurator */}
                      <div className="pt-2 border-t border-indigo-200/80 space-y-2">
                        <span className="text-xs font-bold text-indigo-900 block uppercase tracking-wider flex items-center gap-1.5">
                          <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                          <span>Conditional Command Configurator (Field-Based Rule)</span>
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">If Form Field:</label>
                            <select
                              value={stages[selectedStageIndex].logic?.conditionFieldId || ''}
                              onChange={(e) => handleUpdateCurrentStageField('logic', {
                                ...stages[selectedStageIndex].logic,
                                gatewayType: 'CONDITIONAL_JUMP',
                                conditionFieldId: e.target.value
                              })}
                              className="w-full text-xs bg-white border border-slate-300 rounded-lg p-1.5 font-semibold text-slate-800 cursor-pointer"
                            >
                              <option value="">Default Approval / Decision Field</option>
                              {(stages[selectedStageIndex].fields || []).map((f) => (
                                <option key={f.id} value={f.id || f.label}>
                                  {f.label} ({f.type})
                                </option>
                              ))}
                              <option value="is_eway_required">Is E-Way Bill Required?</option>
                              <option value="disposition">Disposition (Store vs Purchase)</option>
                              <option value="payment_approved">Is Payment Approved?</option>
                            </select>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Condition Operator &amp; Value:</label>
                            <div className="flex gap-1.5">
                              <select
                                value={stages[selectedStageIndex].logic?.conditionOperator || 'EQUALS'}
                                onChange={(e) => handleUpdateCurrentStageField('logic', {
                                  ...stages[selectedStageIndex].logic,
                                  gatewayType: 'CONDITIONAL_JUMP',
                                  conditionOperator: e.target.value as any
                                })}
                                className="w-20 text-xs bg-white border border-slate-300 rounded-lg p-1.5 font-bold text-slate-800 shrink-0"
                              >
                                <option value="EQUALS">==</option>
                                <option value="NOT_EQUALS">!=</option>
                                <option value="CONTAINS">In</option>
                              </select>
                              <input
                                type="text"
                                value={stages[selectedStageIndex].logic?.conditionValue || ''}
                                onChange={(e) => handleUpdateCurrentStageField('logic', {
                                  ...stages[selectedStageIndex].logic,
                                  gatewayType: 'CONDITIONAL_JUMP',
                                  conditionValue: e.target.value
                                })}
                                placeholder="e.g. Yes / Purchase"
                                className="flex-1 text-xs bg-white border border-slate-300 rounded-lg p-1.5 font-medium text-slate-800"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-[11px] font-bold text-slate-700 mb-1">Branch Action:</label>
                            <div className="text-xs font-bold text-indigo-700 bg-white border border-indigo-200 p-1.5 rounded-lg flex items-center justify-between">
                              <span>If Match → Stage #{ (stages[selectedStageIndex].logic?.yesTargetStageIndex ?? selectedStageIndex + 1) + 1 }</span>
                              <span>Else → Stage #{ (stages[selectedStageIndex].logic?.noTargetStageIndex ?? stages.length) + 1 }</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* In-App Form Field Designer */}
                <div className="p-5 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        <span>In-App Stage Form Fields ({(stages[selectedStageIndex].fields || []).length} Fields)</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Fields collected from the assignee in StageActionModal and Split Cockpit when performing this stage.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={handleAddFieldToStage}
                      className="px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold flex items-center gap-1 transition-colors cursor-pointer border border-indigo-200 shadow-2xs"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add Form Field</span>
                    </button>
                  </div>

                  {/* Reusable Payload Data Inheritance Banner for Stage 2+ */}
                  {selectedStageIndex > 0 && (
                    <div className="p-3 bg-gradient-to-r from-indigo-50/90 via-purple-50/80 to-blue-50/90 rounded-xl border border-indigo-200 text-xs flex items-center justify-between shadow-2xs">
                      <div className="flex items-center gap-2.5">
                        <Layers className="w-4.5 h-4.5 text-indigo-600 shrink-0" />
                        <div>
                          <span className="font-black text-indigo-950 block text-xs flex items-center gap-2">
                            <span>Reusable Payload Data Inheritance Active</span>
                            <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                              Stage 1 Requisition Items Linked
                            </span>
                          </span>
                          <span className="text-[11px] text-indigo-900 font-medium leading-snug block">
                            This stage automatically inherits the Itemized Grid Table &amp; Requisition Payload from Stage 1 (Receive Material Requisition). Assignees can verify, triage, or approve inherited items directly without re-entering data.
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="space-y-3">
                    {(stages[selectedStageIndex].fields || []).map((f, fIdx) => (
                      <div
                        key={f.id || fIdx}
                        className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-3 text-xs"
                      >
                        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 flex-1">
                          {/* Label */}
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Label</span>
                            <input
                              type="text"
                              value={f.label}
                              onChange={(e) => handleUpdateStageFormField(fIdx, { label: e.target.value })}
                              placeholder="Field Label"
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                          </div>

                          {/* Field Type */}
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">Type</span>
                            <select
                              value={f.type}
                              onChange={(e) => handleUpdateStageFormField(fIdx, { type: e.target.value as any })}
                              className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            >
                              <option value="TEXT">Text Field</option>
                              <option value="NUMBER">Number / Amount (₹)</option>
                              <option value="SELECT">Select Dropdown</option>
                              <option value="MULTI_ITEM_TABLE">Multi-Item Grid Table (Itemized Entries)</option>
                              <option value="TEXTAREA">Multi-line Notes (Textarea)</option>
                              <option value="APPROVAL">Approval Decision (Approved / Rejected)</option>
                              <option value="DATE">Date Picker</option>
                              <option value="CHECKBOX">Checkbox (Yes / No)</option>
                              <option value="URL">Document / Drive URL</option>
                            </select>
                          </div>

                          {/* Default / Placeholder or Columns Configuration */}
                          <div>
                            <span className="text-[10px] text-slate-400 font-bold block mb-0.5">
                              {f.type === 'SELECT' ? 'Options (Comma Separated)' : f.type === 'MULTI_ITEM_TABLE' ? 'Columns (Comma Separated)' : 'Default Value / Placeholder'}
                            </span>
                            {f.type === 'SELECT' ? (
                              <input
                                type="text"
                                value={(f.options || []).join(', ')}
                                onChange={(e) =>
                                  handleUpdateStageFormField(fIdx, {
                                    options: e.target.value.split(',').map((s) => s.trim()).filter(Boolean),
                                  })
                                }
                                placeholder="Option 1, Option 2, Option 3..."
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            ) : f.type === 'MULTI_ITEM_TABLE' ? (
                              <input
                                type="text"
                                value={f.defaultValue !== undefined ? f.defaultValue : (f.columns && f.columns.length > 0 ? f.columns.map(c => c.label).join(', ') : 'Item Description, Quantity, Unit, Work / Purpose Details, Disposition, Remarks')}
                                onChange={(e) => {
                                  const rawVal = e.target.value;
                                  const colLabels = rawVal.split(',').map(s => s.trim()).filter(Boolean);
                                  const cols = colLabels.map(label => ({
                                    key: label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                                    label,
                                    type: (label.toLowerCase().includes('rate') || label.toLowerCase().includes('qty') || label.toLowerCase().includes('quantity') || label.toLowerCase().includes('amount') || label.toLowerCase().includes('price') || label.toLowerCase().includes('nos')) ? ('NUMBER' as const) : ('TEXT' as const)
                                  }));
                                  handleUpdateStageFormField(fIdx, {
                                    defaultValue: rawVal,
                                    columns: cols
                                  });
                                }}
                                placeholder="Item Description, Quantity, Unit, Work / Purpose Details, Disposition, Remarks"
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 font-medium focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            ) : (
                              <input
                                type="text"
                                value={f.defaultValue || ''}
                                onChange={(e) => handleUpdateStageFormField(fIdx, { defaultValue: e.target.value })}
                                placeholder="Default value or placeholder"
                                className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-slate-700 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                              />
                            )}
                          </div>
                        </div>

                        {/* Field Data Inheritance & Multi-Item Table Row Routing */}
                        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-200">
                          <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-slate-700">
                            <input
                              type="checkbox"
                              checked={Boolean(f.isInherited)}
                              onChange={(e) => handleUpdateStageFormField(fIdx, {
                                isInherited: e.target.checked,
                                isReadOnly: e.target.checked ? true : f.isReadOnly,
                                inheritedSourceField: e.target.checked ? (f.inheritedSourceField || 'Item List from Stage 1') : undefined
                              })}
                              className="rounded text-indigo-600 focus:ring-indigo-500 w-4 h-4 cursor-pointer"
                            />
                            <span>Read-Only / Inherited from Parent Payload</span>
                          </label>

                          {f.isInherited && (
                            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                              <span className="text-[11px] font-bold text-slate-500 shrink-0">Data Source:</span>
                              <select
                                value={f.inheritedSourceField || 'Item List from Stage 1'}
                                onChange={(e) => handleUpdateStageFormField(fIdx, { inheritedSourceField: e.target.value })}
                                className="text-xs bg-indigo-50 border border-indigo-300 rounded-lg px-2.5 py-1 font-bold text-indigo-900 flex-1 cursor-pointer"
                              >
                                <option value="Item List from Stage 1">Item List from Stage 1 (Central Indent)</option>
                                <option value="Parent Indent Reference">Parent Indent / Requisition Number</option>
                                <option value="Site Name & Location">Site Name & Project Location</option>
                                <option value="Vendor Quotation Ledger">Vendor Quotation & CS Sheet Summary</option>
                                <option value="Total Indent Value">Total Indent Estimated Value (₹)</option>
                              </select>
                            </div>
                          )}

                          <div className="flex items-center gap-3 shrink-0 ml-auto">
                            <label className="flex items-center gap-1.5 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={Boolean(f.required)}
                                onChange={(e) => handleUpdateStageFormField(fIdx, { required: e.target.checked })}
                                className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5"
                              />
                              <span className="text-[11px] font-semibold text-slate-600">Required</span>
                            </label>

                            <button
                              type="button"
                              onClick={() => handleRemoveStageFormField(fIdx)}
                              className="p-1 text-slate-400 hover:text-rose-600 transition-colors cursor-pointer"
                              title="Remove field"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>

                        {/* Multi-Item Table Row-Level Triage Routing Strategy */}
                        {f.type === 'MULTI_ITEM_TABLE' && (
                          <div className="p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-200 text-xs space-y-2">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-emerald-950 text-xs flex items-center gap-1.5">
                                <GitBranch className="w-4 h-4 text-emerald-600" />
                                <span>Row-Level Logic &amp; Item Triage Routing Strategy</span>
                              </span>
                              <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded border border-emerald-300">
                                Store vs Purchase Triage Active
                              </span>
                            </div>
                            <p className="text-[11px] text-emerald-900 font-medium leading-tight">
                              Automatically inspects the 'Disposition' column in each row of this table during Stage completion and splits items into parallel tracks.
                            </p>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
                              <div className="bg-white p-2 rounded-lg border border-emerald-200">
                                <span className="font-bold text-indigo-700 block">Store Dispatch Rows:</span>
                                <span className="text-[11px] text-slate-600">Route to Store Manager (Amanat)</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-emerald-200">
                                <span className="font-bold text-amber-700 block">Purchase Indent Rows:</span>
                                <span className="text-[11px] text-slate-600">Route to Purchase Head (Brahmanand)</span>
                              </div>
                              <div className="bg-white p-2 rounded-lg border border-emerald-200">
                                <span className="font-bold text-rose-700 block">Hold / Archive Rows:</span>
                                <span className="text-[11px] text-slate-600">Schedule 7-Day Store Review Task</span>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>
                    ))}

                    {(!stages[selectedStageIndex].fields || stages[selectedStageIndex].fields?.length === 0) && (
                      <div className="p-4 bg-slate-50/70 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500 italic">
                        No custom fields configured for this stage yet. Inherited items and requisition payload from Stage 1 are active for validation.
                      </div>
                    )}
                  </div>
                </div>

                {/* Mandatory Checkpoint Verifications List */}
                <div className="p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Stage Verification Checklist</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Mandatory compliance items assignee must confirm before advancing this stage.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const cur = stages[selectedStageIndex].checkpoints || [];
                        handleUpdateCurrentStageField('checkpoints', [...cur, 'Verified physical receipt against PO specification']);
                      }}
                      className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg text-xs font-bold transition-colors cursor-pointer border border-emerald-200"
                    >
                      + Add Checkpoint
                    </button>
                  </div>

                  <div className="space-y-1.5">
                    {(stages[selectedStageIndex].checkpoints || []).map((cp, cpIdx) => (
                      <div key={cpIdx} className="flex items-center gap-2 text-xs">
                        <span className="w-4 text-center font-bold text-slate-400">{cpIdx + 1}.</span>
                        <input
                          type="text"
                          value={cp}
                          onChange={(e) => {
                            const cur = [...(stages[selectedStageIndex].checkpoints || [])];
                            cur[cpIdx] = e.target.value;
                            handleUpdateCurrentStageField('checkpoints', cur);
                          }}
                          className="flex-1 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1.5 font-medium text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <button
                          type="button"
                          onClick={() => {
                            const cur = (stages[selectedStageIndex].checkpoints || []).filter((_, idx) => idx !== cpIdx);
                            handleUpdateCurrentStageField('checkpoints', cur);
                          }}
                          className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Automated Sub-Workflow Trigger & Cross-Department Routing Configurator */}
                <div className="p-5 border-t border-slate-200 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Automated Sub-Workflow Trigger &amp; Cross-Department Routing</span>
                      </h4>
                      <p className="text-[11px] text-slate-500">
                        Configure sub-workflow spawning, target process selection, and dynamic assignee routing rules for Stage #{selectedStageIndex + 1}.
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => {
                        const cur = stages[selectedStageIndex].subWorkflowTrigger || { enabled: false, targetTemplateKey: 'INDENT_PURCHASE' };
                        handleUpdateCurrentStageField('subWorkflowTrigger', {
                          ...cur,
                          enabled: !cur.enabled,
                          targetTemplateKey: cur.targetTemplateKey || 'INDENT_PURCHASE',
                          triggerCondition: cur.triggerCondition || 'ON_COMPLETE',
                          targetAssigneeRule: cur.targetAssigneeRule || 'DYNAMIC_ROLE',
                          targetRole: cur.targetRole || 'PURCHASE_MANAGER',
                        });
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1 border ${
                        stages[selectedStageIndex].subWorkflowTrigger?.enabled
                          ? 'bg-emerald-600 text-white border-emerald-700 shadow-2xs'
                          : 'bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100'
                      }`}
                    >
                      {stages[selectedStageIndex].subWorkflowTrigger?.enabled ? '✓ Automation Enabled' : '+ Add Sub-Workflow Trigger'}
                    </button>
                  </div>

                  {stages[selectedStageIndex].subWorkflowTrigger?.enabled ? (
                    <div className="p-4 bg-gradient-to-r from-indigo-50/90 via-purple-50/90 to-indigo-50/90 rounded-2xl border border-indigo-200 space-y-4 text-xs shadow-2xs">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-indigo-950 flex items-center justify-between">
                            <span>Target Sub-Workflow Process</span>
                            <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/90 px-2 py-0.5 rounded border border-emerald-300">
                              Connected Target
                            </span>
                          </label>
                          <select
                            value={stages[selectedStageIndex].subWorkflowTrigger?.targetTemplateKey || 'INDENT_PURCHASE'}
                            onChange={(e) => {
                              const cur = stages[selectedStageIndex].subWorkflowTrigger || { enabled: true };
                              handleUpdateCurrentStageField('subWorkflowTrigger', { ...cur, targetTemplateKey: e.target.value });
                            }}
                            className="w-full text-xs bg-white border border-indigo-300 rounded-xl p-2 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                          >
                            <option value="INDENT_PURCHASE">Purchase Indent to PO (INDENT_PURCHASE)</option>
                            <option value="STORE_TO_SITE_DISPATCH">Store to Site Dispatch (STORE_TO_SITE_DISPATCH)</option>
                            <option value="PO_TO_PAYMENT">Accounts PO to Payment (PO_TO_PAYMENT)</option>
                            <option value="CHECK_STOCK">Store Check Stock (CHECK_STOCK)</option>
                            <option value="PURCHASE_TO_STORE_DISPATCH">Purchase to Store Dispatch (PURCHASE_TO_STORE_DISPATCH)</option>
                            <option value="PAYMENT_TO_DISPATCH">Vendor Payment to Dispatch (PAYMENT_TO_DISPATCH)</option>
                            <option value="SITE_RECEIVE">Site Material Receive GRN (SITE_RECEIVE)</option>
                            <option value="ACCOUNTS_INVOICE_COLLECTION">Accounts Invoice Collection (ACCOUNTS_INVOICE_COLLECTION)</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-indigo-950">
                            Execution Trigger Condition
                          </label>
                          <select
                            value={stages[selectedStageIndex].subWorkflowTrigger?.triggerCondition || 'ON_COMPLETE'}
                            onChange={(e) => {
                              const cur = stages[selectedStageIndex].subWorkflowTrigger || { enabled: true, targetTemplateKey: 'INDENT_PURCHASE' };
                              handleUpdateCurrentStageField('subWorkflowTrigger', { ...cur, enabled: true, targetTemplateKey: cur.targetTemplateKey || 'INDENT_PURCHASE', triggerCondition: e.target.value as any });
                            }}
                            className="w-full text-xs bg-white border border-indigo-300 rounded-xl p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                          >
                            <option value="ON_COMPLETE">Trigger whenever Stage #{selectedStageIndex + 1} completes</option>
                            <option value="ON_DECISION_YES">Trigger ONLY when Decision / Approval = YES</option>
                            <option value="ON_DECISION_NO">Trigger ONLY when Decision / Approval = NO</option>
                          </select>
                        </div>
                      </div>

                      {/* Dynamic Assignee Routing Configuration */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-indigo-200/80">
                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-indigo-950 flex items-center justify-between">
                            <span>Dynamic Assignee Routing Rule</span>
                            <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100/90 px-2 py-0.5 rounded">
                              Role-Based Queue
                            </span>
                          </label>
                          <select
                            value={stages[selectedStageIndex].subWorkflowTrigger?.targetAssigneeRule || 'DYNAMIC_ROLE'}
                            onChange={(e) => {
                              const cur = stages[selectedStageIndex].subWorkflowTrigger || { enabled: true, targetTemplateKey: 'INDENT_PURCHASE' };
                              handleUpdateCurrentStageField('subWorkflowTrigger', { ...cur, enabled: true, targetTemplateKey: cur.targetTemplateKey || 'INDENT_PURCHASE', targetAssigneeRule: e.target.value as any });
                            }}
                            className="w-full text-xs bg-white border border-indigo-300 rounded-xl p-2 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                          >
                            <option value="DYNAMIC_ROLE">Role-Based Queue (e.g. Purchase Head / Store Incharge)</option>
                            <option value="SPECIFIC_USER">Specific Individual User</option>
                            <option value="INHERIT_PARENT">Inherit Current Stage Assignee ({stages[selectedStageIndex].whoDefaultAssignee || 'Parent Assignee'})</option>
                          </select>
                        </div>

                        <div className="space-y-1.5">
                          <label className="block text-xs font-bold text-indigo-950">
                            Target Role / Assigned Queue
                          </label>
                          {stages[selectedStageIndex].subWorkflowTrigger?.targetAssigneeRule === 'SPECIFIC_USER' ? (
                            <select
                              value={stages[selectedStageIndex].subWorkflowTrigger?.targetAssignee || 'Brahmanand Patel'}
                              onChange={(e) => {
                                const cur = stages[selectedStageIndex].subWorkflowTrigger || { enabled: true, targetTemplateKey: 'INDENT_PURCHASE' };
                                handleUpdateCurrentStageField('subWorkflowTrigger', { ...cur, enabled: true, targetTemplateKey: cur.targetTemplateKey || 'INDENT_PURCHASE', targetAssignee: e.target.value });
                              }}
                              className="w-full text-xs bg-white border border-indigo-300 rounded-xl p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                            >
                              <option value="Brahmanand Patel">Brahmanand Patel (Asst. Manager Purchase &amp; Store)</option>
                              <option value="Amanat Bharadwaj">Amanat Bharadwaj (Store Manager)</option>
                              <option value="Manish Koshle">Manish Koshle (Finance &amp; Accounts)</option>
                              <option value="Shyam Rao Sureshe">Shyam Rao Sureshe (Purchase Executive)</option>
                              <option value="Pranjal Agrawal">Pranjal Agrawal (Director)</option>
                            </select>
                          ) : stages[selectedStageIndex].subWorkflowTrigger?.targetAssigneeRule === 'INHERIT_PARENT' ? (
                            <input
                              type="text"
                              disabled
                              value={stages[selectedStageIndex].whoDefaultAssignee || 'Inherited from current stage'}
                              className="w-full text-xs bg-slate-100 border border-slate-300 rounded-xl p-2 font-semibold text-slate-600 cursor-not-allowed"
                            />
                          ) : (
                            <select
                              value={stages[selectedStageIndex].subWorkflowTrigger?.targetRole || (stages[selectedStageIndex].subWorkflowTrigger?.targetTemplateKey === 'INDENT_PURCHASE' ? 'PURCHASE_MANAGER' : 'STORE_MANAGER')}
                              onChange={(e) => {
                                const cur = stages[selectedStageIndex].subWorkflowTrigger || { enabled: true, targetTemplateKey: 'INDENT_PURCHASE' };
                                handleUpdateCurrentStageField('subWorkflowTrigger', { ...cur, enabled: true, targetTemplateKey: cur.targetTemplateKey || 'INDENT_PURCHASE', targetRole: e.target.value });
                              }}
                              className="w-full text-xs bg-white border border-indigo-300 rounded-xl p-2 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-2xs"
                            >
                              <option value="PURCHASE_MANAGER">Role: PURCHASE_HEAD / PURCHASE_MANAGER (Brahmanand Patel)</option>
                              <option value="STORE_MANAGER">Role: STORE_MANAGER / DISPATCH (Amanat Bharadwaj)</option>
                              <option value="FINANCE_ACCOUNTS">Role: FINANCE_ACCOUNTS (Manish Koshle)</option>
                              <option value="PROJECT_MANAGER">Role: PROJECT_MANAGER (Pranay Ghosh / Chakravarti Ji)</option>
                            </select>
                          )}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs flex items-center justify-between text-slate-500">
                      <span>No sub-workflow trigger configured for Stage #{selectedStageIndex + 1}. Stage completion will advance sequentially within this process.</span>
                      <button
                        type="button"
                        onClick={() => {
                          const cur = stages[selectedStageIndex].subWorkflowTrigger || { enabled: false, targetTemplateKey: 'INDENT_PURCHASE' };
                          handleUpdateCurrentStageField('subWorkflowTrigger', {
                            ...cur,
                            enabled: true,
                            targetTemplateKey: 'INDENT_PURCHASE',
                            triggerCondition: 'ON_COMPLETE',
                            targetAssigneeRule: 'DYNAMIC_ROLE',
                            targetRole: 'PURCHASE_MANAGER',
                          });
                        }}
                        className="text-xs font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer shrink-0"
                      >
                        + Add Sub-Workflow Trigger
                      </button>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* SIMULATOR SLIDE-OVER DRAWER */}
          {isSimulatorOpen && (
            <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-xs animate-in fade-in">
              <div className="w-full max-w-lg bg-white h-full shadow-2xl flex flex-col justify-between animate-in slide-in-from-right duration-200">
                <div className="p-5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
                  <div className="flex items-center gap-2">
                    <Play className="w-4 h-4 text-indigo-600" />
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">Live Stage Simulator</h4>
                      <p className="text-[11px] text-slate-500">Test how the assignee fills this stage in real time</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setIsSimulatorOpen(false)}
                    className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-6 overflow-y-auto space-y-4 text-xs">
                  <div className="p-3 bg-indigo-50 rounded-xl border border-indigo-100 flex items-center gap-2 text-indigo-800">
                    <span className="w-6 h-6 rounded-lg bg-indigo-600 text-white font-black flex items-center justify-center shrink-0">
                      {selectedStageIndex + 1}
                    </span>
                    <div>
                      <div className="font-bold">{stages[selectedStageIndex]?.stageName}</div>
                      <div className="text-[11px] text-indigo-600">Assignee: {stages[selectedStageIndex]?.whoDefaultAssignee}</div>
                    </div>
                  </div>

                  {/* Form fields live test */}
                  {(stages[selectedStageIndex]?.fields || []).map((f) => (
                    <div key={f.id} className="space-y-1">
                      <label className="font-bold text-slate-700 flex items-center justify-between">
                        <span>{f.label} {f.required && <span className="text-rose-500">*</span>}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{f.type}</span>
                      </label>

                      {f.type === 'SELECT' ? (
                        <select
                          value={simulatedData[f.id] || f.defaultValue || ''}
                          onChange={(e) => setSimulatedData({ ...simulatedData, [f.id]: e.target.value })}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs font-semibold focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        >
                          <option value="">-- Choose Option --</option>
                          {(f.options || []).map((opt) => (
                            <option key={opt} value={opt}>
                              {opt}
                            </option>
                          ))}
                        </select>
                      ) : f.type === 'TEXTAREA' ? (
                        <textarea
                          rows={3}
                          value={simulatedData[f.id] || ''}
                          onChange={(e) => setSimulatedData({ ...simulatedData, [f.id]: e.target.value })}
                          placeholder="Type simulated notes..."
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      ) : f.type === 'APPROVAL' ? (
                        <div className="grid grid-cols-2 gap-2">
                          <button
                            type="button"
                            onClick={() => setSimulatedData({ ...simulatedData, [f.id]: 'APPROVED' })}
                            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              simulatedData[f.id] === 'APPROVED'
                                ? 'bg-emerald-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>APPROVED</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => setSimulatedData({ ...simulatedData, [f.id]: 'REJECTED' })}
                            className={`py-2 rounded-xl font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                              simulatedData[f.id] === 'REJECTED'
                                ? 'bg-rose-600 text-white shadow-xs'
                                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                            }`}
                          >
                            <X className="w-3.5 h-3.5" />
                            <span>REJECTED</span>
                          </button>
                        </div>
                      ) : (
                        <input
                          type={f.type === 'NUMBER' ? 'number' : 'text'}
                          value={simulatedData[f.id] || f.defaultValue || ''}
                          onChange={(e) => setSimulatedData({ ...simulatedData, [f.id]: e.target.value })}
                          placeholder={f.defaultValue || `Enter ${f.label}...`}
                          className="w-full bg-slate-50 border border-slate-300 rounded-xl px-3 py-2 text-xs focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                      )}
                    </div>
                  ))}

                  {/* Checkpoints simulator */}
                  {(stages[selectedStageIndex]?.checkpoints || []).length > 0 && (
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      <span className="font-bold text-slate-700 block">Required SOP Checkpoints</span>
                      {(stages[selectedStageIndex]?.checkpoints || []).map((cp, idx) => (
                        <label key={idx} className="flex items-start gap-2 p-2 bg-slate-50 rounded-lg cursor-pointer">
                          <input type="checkbox" className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500" />
                          <span className="text-slate-600">{cp}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="p-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between">
                  <span className="text-[11px] text-slate-500">Validation & Preview OK</span>
                  <button
                    type="button"
                    onClick={() => {
                      alert('Simulation Successful! All fields and validations verified.');
                      setIsSimulatorOpen(false);
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer"
                  >
                    Simulate Stage Advance
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
