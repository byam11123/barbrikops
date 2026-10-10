import React, { useState } from 'react';
import { X, GitBranch, AlertCircle, Plus, Check, CreditCard, ShoppingCart, Boxes, Truck, PackageCheck, FileText, UserCheck, Wrench, Cog, FileSpreadsheet, Sparkles, Link2 } from 'lucide-react';
import { FmsInstance, Priority, UserProfile, FmsTemplateDefinition } from '../../types';
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
  FMS_DPR_REPORTING_STAGES 
} from '../../data/initialData';
import { FmsCreateInputSchema, storageAdapter } from '../../services/storageAdapter';
import { FileUploadField } from '../common/FileUploadField';

interface CreateFmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onCreate: (flow: FmsInstance) => void;
  onOpenTemplateStudio?: () => void;
}

export const CreateFmsModal: React.FC<CreateFmsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreate,
  onOpenTemplateStudio,
}) => {
  const customTemplates = storageAdapter.getFmsTemplates();
  const [selectedCustomTemplateId, setSelectedCustomTemplateId] = useState<string | null>(null);
  const [customFormData, setCustomFormData] = useState<Record<string, any>>({});
  const [flowType, setFlowType] = useState<'CHECK_STOCK' | 'INDENT_PURCHASE' | 'PO_TO_PAYMENT' | 'STORE_TO_SITE_DISPATCH' | 'PURCHASE_TO_STORE_DISPATCH' | 'PAYMENT_TO_DISPATCH' | 'SITE_RECEIVE' | 'ACCOUNTS_INVOICE_COLLECTION' | 'HR_ATTENDANCE_PAYMENT' | 'BREAKDOWN_REPORTING' | 'EQUIPMENT_PART_REPAIR' | 'DPR_REPORTING'>('CHECK_STOCK');
  const [indentNo, setIndentNo] = useState<string>('');
  const [poNumber, setPoNumber] = useState<string>('');
  const [vendorName, setVendorName] = useState<string>('');
  const [poAmount, setPoAmount] = useState<string>('');
  const [poAssignTo, setPoAssignTo] = useState<string>('MR. BRAMHANAND PATEL');
  const [siteName, setSiteName] = useState<string>('SILADEHI');
  const [priority, setPriority] = useState<Priority>('Normal');
  const [totalLabourPresent, setTotalLabourPresent] = useState<string>('40');
  const [totalOtHours, setTotalOtHours] = useState<string>('0');
  const [attendanceDate, setAttendanceDate] = useState<string>('');
  // Machine breakdown fields:
  const [machineName, setMachineName] = useState<string>('');
  const [machineIdNo, setMachineIdNo] = useState<string>('');
  const [machineMakeModel, setMachineMakeModel] = useState<string>('');
  const [attendingMechanic, setAttendingMechanic] = useState<string>('');
  const [mechanicMobileNo, setMechanicMobileNo] = useState<string>('');
  // Equipment Part Repair fields:
  const [partSerialNo, setPartSerialNo] = useState<string>('');
  const [partEquipmentName, setPartEquipmentName] = useState<string>('');
  const [vehiclePlantMachineName, setVehiclePlantMachineName] = useState<string>('');
  const [warrantyStatus, setWarrantyStatus] = useState<'IN_WARRANTY' | 'OUT_WARRANTY'>('OUT_WARRANTY');
  // DPR fields:
  const [dprDate, setDprDate] = useState<string>('');
  const [dprPreparedBy, setDprPreparedBy] = useState<string>('Eklavya Upadhyay');
  const [remarks, setRemarks] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const handleSelectCustomTemplate = (tplId: string) => {
    setSelectedCustomTemplateId(tplId);
    const tpl = customTemplates.find((t) => t.id === tplId);
    if (tpl) {
      const initialData: Record<string, any> = {};
      const s1Fields = tpl.stages[0]?.fields || [];
      s1Fields.forEach((f) => {
        if (f.label.toLowerCase().includes('site')) {
          initialData[f.id] = siteName || 'SILADEHI';
        } else if (f.label.toLowerCase().includes('priority')) {
          initialData[f.id] = priority || 'Normal';
        }
      });
      setCustomFormData(initialData);
    }
  };

  const handleCustomFieldChange = (fieldId: string, value: any) => {
    setCustomFormData((prev) => ({
      ...prev,
      [fieldId]: value,
    }));
  };

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    if (selectedCustomTemplateId) {
      const template = customTemplates.find((t) => t.id === selectedCustomTemplateId);
      if (!template) {
        setError('Selected custom template not found');
        return;
      }

      // Validate required fields in Stage 1
      const stage1Fields = template.stages[0]?.fields || [];
      for (const f of stage1Fields) {
        if (f.required && (customFormData[f.id] === undefined || customFormData[f.id] === null || customFormData[f.id].toString().trim() === '')) {
          setError(`"${f.label}" is required`);
          return;
        }
      }

      const effectiveIndentNo = indentNo.trim() || customFormData['requisitionNumber'] || customFormData['poNumber'] || customFormData['indentNo'] || customFormData['voucherNo'] || `REF-${Date.now().toString().slice(-4)}`;
      if (!effectiveIndentNo) {
        setError(`${template.referenceLabel || 'Reference / Indent Number'} is required`);
        return;
      }

      // Sync site from customFormData if present
      const customSiteKey = Object.keys(customFormData).find((k) => k.toLowerCase().includes('site'));
      const effectiveSite = customSiteKey && customFormData[customSiteKey] ? customFormData[customSiteKey] : siteName;

      // Sync priority from customFormData if present
      const customPriorityKey = Object.keys(customFormData).find((k) => k.toLowerCase().includes('priority'));
      const effectivePriority = (customPriorityKey && customFormData[customPriorityKey] ? customFormData[customPriorityKey] : priority) || template.defaultPriority || 'Normal';

      // Sync remarks / purpose from customFormData if present
      const customRemarksKey = Object.keys(customFormData).find((k) => k.toLowerCase().includes('purpose') || k.toLowerCase().includes('remark'));
      const effectiveRemarks = (customRemarksKey && customFormData[customRemarksKey] ? customFormData[customRemarksKey] : remarks) || '';

      // Sync vendor from customFormData if present
      const customVendorKey = Object.keys(customFormData).find((k) => k.toLowerCase().includes('vendor'));
      const effectiveVendor = customVendorKey && customFormData[customVendorKey] ? customFormData[customVendorKey] : vendorName;

      // Sync amount from customFormData if present
      const customAmountKey = Object.keys(customFormData).find((k) => k.toLowerCase().includes('amount'));
      const effectiveAmount = customAmountKey && customFormData[customAmountKey] ? Number(customFormData[customAmountKey]) || undefined : undefined;

      const flowId = `FLOW-${template.templateKey.slice(0, 10)}-${effectiveIndentNo.replace(/[^a-zA-Z0-9]/g, '-')}`;
      const hasMoreStages = template.stages.length > 1;
      const initialStages = template.stages.map((stg, idx) => {
        const sla = stg.slaHours || 4;
        const plannedTime = new Date(now.getTime() + (idx === 0 ? sla : (idx + 1) * sla) * 3600000);
        return {
          stageId: stg.stageId,
          stageName: stg.stageName,
          assignee: stg.whoDefaultAssignee || stg.whoRole || 'Assignee',
          how: stg.howChannel || 'IN-APP FORM',
          status: idx === 0 
            ? ('Done' as const) 
            : idx === 1 
            ? ('In Progress' as const) 
            : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
          fields: stg.fields,
          logic: stg.logic,
          checkpoints: stg.checkpoints,
          submittedData: idx === 0 ? customFormData : undefined,
        };
      });

      const newFlow: FmsInstance = {
        id: `fms-inst-cust-${Date.now()}`,
        flowId,
        flowType: template.templateKey,
        customTemplateId: template.id,
        requisitionNumber: effectiveIndentNo,
        indentNo: effectiveIndentNo,
        indentDate: formattedDate,
        siteName: effectiveSite,
        priority: effectivePriority,
        currentStageId: hasMoreStages ? (template.stages[1]?.stageId || 'STG-02') : (template.stages[0]?.stageId || 'STG-01'),
        currentStageIndex: hasMoreStages ? 1 : 0,
        totalStages: template.stages.length,
        status: hasMoreStages ? 'In Progress' : 'Completed',
        createdAt: now.toLocaleString('en-GB'),
        updatedAt: now.toLocaleString('en-GB'),
        totalDelayHours: 0,
        vendorName: effectiveVendor,
        poAmount: effectiveAmount,
        remarks: effectiveRemarks.trim() || undefined,
        stages: initialStages,
      };

      onCreate(newFlow);
      onClose();
      return;
    }

    if (flowType === 'CHECK_STOCK') {
      if (!indentNo.trim()) {
        setError('Requisition number / Indent reference is required');
        return;
      }

      const flowId = `FLOW-STK-${indentNo.trim().replace(/[^a-zA-Z0-9]/g, '-')}`;
      const customizedTpl = customTemplates.find((t) => t.templateKey === 'CHECK_STOCK' || t.id === 'builtin_CHECK_STOCK');
      const initialStages = customizedTpl
        ? customizedTpl.stages.map((stg, idx) => {
            const sla = stg.slaHours || 4;
            const plannedTime = new Date(now.getTime() + (idx === 0 ? sla : (idx + 1) * sla) * 3600000);
            return {
              stageId: stg.stageId,
              stageName: stg.stageName,
              assignee: stg.whoDefaultAssignee,
              how: stg.howChannel || 'IN-APP FORM',
              status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
              plannedDateTime: plannedTime.toLocaleString('en-GB'),
              actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
              fields: stg.fields,
              logic: stg.logic,
              checkpoints: stg.checkpoints,
              submittedData: idx === 0 ? { requisitionNumber: indentNo.trim(), site: siteName, priority, remarks } : undefined,
            };
          })
        : FMS_CHECK_STOCK_STAGES.map((def, idx) => {
            const plannedTime = new Date(now.getTime() + (idx === 0 ? 4 : (idx + 1) * 4) * 3600000);
            return {
              stageId: def.stageId,
              stageName: def.name,
              assignee: def.whoDefaultAssignee,
              how: def.howChannel,
              status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
              plannedDateTime: plannedTime.toLocaleString('en-GB'),
              actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
              formResponseRef: def.formUrl,
              submittedData: idx === 0 ? { requisitionNumber: indentNo.trim(), site: siteName, priority, remarks } : undefined,
            };
          });

      const newFlow: FmsInstance = {
        id: `fms-inst-stk-${Date.now()}`,
        flowId,
        flowType: 'CHECK_STOCK',
        requisitionNumber: indentNo.trim(),
        indentNo: indentNo.trim(),
        indentDate: formattedDate,
        siteName,
        priority,
        currentStageId: initialStages[1]?.stageId || 'STG-STK-02',
        currentStageIndex: 1,
        totalStages: initialStages.length,
        status: 'In Progress',
        createdAt: now.toLocaleString('en-GB'),
        updatedAt: now.toLocaleString('en-GB'),
        totalDelayHours: 0,
        remarks: remarks.trim() || undefined,
        stages: initialStages,
      };

      onCreate(newFlow);
      onClose();
    } else if (flowType === 'INDENT_PURCHASE') {
      const flowId = `FLOW-IND-${indentNo.trim()}`;
      const validation = FmsCreateInputSchema.safeParse({
        flowId,
        indentNo: indentNo.trim(),
        indentDate: formattedDate,
        siteName,
        priority,
        remarks,
      });

      if (!validation.success) {
        setError(validation.error.issues[0]?.message || 'Invalid input');
        return;
      }

      // Build the initial 12 stages with planned SLA dates
      const initialStages = FMS_STANDARD_PURCHASE_STAGES.map((def, idx) => {
        const plannedTime = new Date(now.getTime() + (idx === 0 ? 1 : (idx + 1) * 2) * 3600000);
        return {
          stageId: def.stageId,
          stageName: def.name,
          assignee: def.whoDefaultAssignee,
          how: def.howChannel,
          status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
          formResponseRef: def.formUrl,
          submittedData: idx === 0 ? { indentNo: indentNo.trim(), requisitionNumber: `REQ-2026-${indentNo.trim()}`, site: siteName, priority, remarks } : undefined,
        };
      });

      const newFlow: FmsInstance = {
        id: `fms-inst-${Date.now()}`,
        flowId,
        flowType: 'INDENT_PURCHASE',
        requisitionNumber: `REQ-2026-${indentNo.trim()}`,
        indentNo: indentNo.trim(),
        indentDate: formattedDate,
        siteName,
        priority,
        currentStageId: initialStages[1]?.stageId || 'STG-02',
        currentStageIndex: 1,
        totalStages: 12,
        status: 'In Progress',
        createdAt: now.toLocaleString('en-GB'),
        updatedAt: now.toLocaleString('en-GB'),
        totalDelayHours: 0,
        remarks: remarks.trim() || undefined,
        stages: initialStages,
      };

      onCreate(newFlow);
      onClose();
    } else if (flowType === 'PURCHASE_TO_STORE_DISPATCH') {
      if (!indentNo.trim()) {
        setError('Indent / Requisition Number is required');
        return;
      }

      const flowId = `FLOW-PSD-${indentNo.trim().replace(/[^a-zA-Z0-9]/g, '-')}`;
      const initialStages = FMS_PURCHASE_TO_STORE_DISPATCH_STAGES.map((def, idx) => {
        const plannedTime = new Date(now.getTime() + (idx === 0 ? 2 : (idx + 1) * 3) * 3600000);
        return {
          stageId: def.stageId,
          stageName: def.name,
          assignee: def.whoDefaultAssignee,
          how: def.howChannel,
          status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
          formResponseRef: def.formUrl,
          submittedData: idx === 0 ? { indentNo: indentNo.trim(), poNumber: poNumber.trim(), vendorName: vendorName.trim(), site: siteName, priority, remarks } : undefined,
        };
      });

      const newFlow: FmsInstance = {
        id: `fms-inst-psd-${Date.now()}`,
        flowId,
        flowType: 'PURCHASE_TO_STORE_DISPATCH',
        indentNo: indentNo.trim(),
        requisitionNumber: indentNo.trim(),
        poNumber: poNumber.trim() || undefined,
        vendorName: vendorName.trim() || undefined,
        indentDate: formattedDate,
        siteName,
        priority,
        currentStageId: initialStages[1]?.stageId || 'STG-PSD-02',
        currentStageIndex: 1,
        totalStages: 10,
        status: 'In Progress',
        createdAt: now.toLocaleString('en-GB'),
        updatedAt: now.toLocaleString('en-GB'),
        totalDelayHours: 0,
        remarks: remarks.trim() || undefined,
        stages: initialStages,
      };

      onCreate(newFlow);
      onClose();
    } else if (flowType === 'STORE_TO_SITE_DISPATCH') {
      if (!indentNo.trim()) {
        setError('Requisition Number is required');
        return;
      }

      const flowId = `FLOW-SSD-${indentNo.trim().replace(/[^a-zA-Z0-9]/g, '-')}`;
      const initialStages = FMS_STORE_TO_SITE_DISPATCH_STAGES.map((def, idx) => {
        const plannedTime = new Date(now.getTime() + (idx === 0 ? 4 : (idx + 1) * 3) * 3600000);
        return {
          stageId: def.stageId,
          stageName: def.name,
          assignee: def.whoDefaultAssignee,
          how: def.howChannel,
          status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
          formResponseRef: def.formUrl,
          submittedData: idx === 0 ? { requisitionNumber: indentNo.trim(), site: siteName, priority, remarks } : undefined,
        };
      });

      const newFlow: FmsInstance = {
        id: `fms-inst-ssd-${Date.now()}`,
        flowId,
        flowType: 'STORE_TO_SITE_DISPATCH',
        requisitionNumber: indentNo.trim(),
        indentNo: indentNo.trim(),
        indentDate: formattedDate,
        siteName,
        priority,
        currentStageId: initialStages[1]?.stageId || 'STG-SSD-02',
        currentStageIndex: 1,
        totalStages: 9,
        status: 'In Progress',
        createdAt: now.toLocaleString('en-GB'),
        updatedAt: now.toLocaleString('en-GB'),
        totalDelayHours: 0,
        remarks: remarks.trim() || undefined,
        stages: initialStages,
      };

      onCreate(newFlow);
      onClose();
    } else if (flowType === 'PAYMENT_TO_DISPATCH') {
      if (!poNumber.trim()) {
        setError('Purchase Order (PO) Number is required');
        return;
      }
      if (!vendorName.trim()) {
        setError('Vendor name is required');
        return;
      }

      const flowId = `FLOW-DISP-${poNumber.trim().replace(/[^a-zA-Z0-9]/g, '-')}`;
      const initialStages = FMS_PAYMENT_TO_DISPATCH_STAGES.map((def, idx) => {
        const plannedTime = new Date(now.getTime() + (idx === 0 ? 4 : (idx + 1) * 4) * 3600000);
        return {
          stageId: def.stageId,
          stageName: def.name,
          assignee: def.whoDefaultAssignee,
          how: def.howChannel,
          status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
          formResponseRef: def.formUrl,
          submittedData: idx === 0 ? { poNumber: poNumber.trim(), vendorName: vendorName.trim(), site: siteName, priority, remarks } : undefined,
        };
      });

      const newFlow: FmsInstance = {
        id: `fms-inst-disp-${Date.now()}`,
        flowId,
        flowType: 'PAYMENT_TO_DISPATCH',
        poNumber: poNumber.trim(),
        vendorName: vendorName.trim(),
        poAssignTo: poAssignTo.trim() || 'MR. VIVEK',
        indentNo: indentNo.trim() || poNumber.trim(),
        indentDate: formattedDate,
        poDate: formattedDate,
        siteName,
        priority,
        currentStageId: initialStages[1]?.stageId || 'STG-DISP-02',
        currentStageIndex: 1,
        totalStages: 7,
        status: 'In Progress',
        createdAt: now.toLocaleString('en-GB'),
        updatedAt: now.toLocaleString('en-GB'),
        totalDelayHours: 0,
        remarks: remarks.trim() || undefined,
        stages: initialStages,
      };

      onCreate(newFlow);
      onClose();
    } else if (flowType === 'SITE_RECEIVE') {
      if (!indentNo.trim()) {
        setError('Site Requisition / MRN / Challan Number is required');
        return;
      }

      const flowId = `FLOW-REC-${indentNo.trim().replace(/[^a-zA-Z0-9]/g, '-')}`;
      const initialStages = FMS_SITE_RECEIVE_STAGES.map((def, idx) => {
        const plannedTime = new Date(now.getTime() + (idx === 0 ? 2 : (idx + 1) * 3) * 3600000);
        return {
          stageId: def.stageId,
          stageName: def.name,
          assignee: def.whoDefaultAssignee,
          how: def.howChannel,
          status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
          formResponseRef: def.formUrl,
          submittedData: idx === 0 ? { requisitionNumber: indentNo.trim(), site: siteName, priority, remarks } : undefined,
        };
      });

      const newFlow: FmsInstance = {
        id: `fms-inst-rec-${Date.now()}`,
        flowId,
        flowType: 'SITE_RECEIVE',
        requisitionNumber: indentNo.trim(),
        indentNo: indentNo.trim(),
        indentDate: formattedDate,
        siteName,
        priority,
        currentStageId: initialStages[1]?.stageId || 'STG-REC-02',
        currentStageIndex: 1,
        totalStages: 10,
        status: 'In Progress',
        createdAt: now.toLocaleString('en-GB'),
        updatedAt: now.toLocaleString('en-GB'),
        totalDelayHours: 0,
        remarks: remarks.trim() || undefined,
        stages: initialStages,
      };

      onCreate(newFlow);
      onClose();
    } else if (flowType === 'ACCOUNTS_INVOICE_COLLECTION') {
      if (!poNumber.trim()) {
        setError('Purchase Order (PO) Number / Ref is required');
        return;
      }
      if (!vendorName.trim()) {
        setError('Vendor name is required');
        return;
      }

      const flowId = `FLOW-INV-${poNumber.trim().replace(/[^a-zA-Z0-9]/g, '-')}`;
      const initialStages = FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES.map((def, idx) => {
        const plannedTime = new Date(now.getTime() + (idx === 0 ? 24 : (idx + 1) * 4) * 3600000);
        return {
          stageId: def.stageId,
          stageName: def.name,
          assignee: def.whoDefaultAssignee,
          how: def.howChannel,
          status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
          formResponseRef: def.formUrl,
          submittedData: idx === 0 ? { poNumber: poNumber.trim(), vendorName: vendorName.trim(), poAmount, site: siteName, priority, remarks } : undefined,
        };
      });

      const newFlow: FmsInstance = {
        id: `fms-inst-inv-${Date.now()}`,
        flowId,
        flowType: 'ACCOUNTS_INVOICE_COLLECTION',
        poNumber: poNumber.trim(),
        vendorName: vendorName.trim(),
        poAmount: parseFloat(poAmount) || 0,
        poAssignTo: poAssignTo.trim() || 'MR. BRAMHANAND PATEL',
        indentNo: indentNo.trim() || poNumber.trim(),
        indentDate: formattedDate,
        poDate: formattedDate,
        siteName,
        priority,
        currentStageId: initialStages[1]?.stageId || 'STG-INV-02',
        currentStageIndex: 1,
        totalStages: 7,
        status: 'In Progress',
        createdAt: now.toLocaleString('en-GB'),
        updatedAt: now.toLocaleString('en-GB'),
        totalDelayHours: 0,
        remarks: remarks.trim() || undefined,
        stages: initialStages,
      };

      onCreate(newFlow);
      onClose();
    } else if (flowType === 'HR_ATTENDANCE_PAYMENT') {
      const attRef = indentNo.trim() || `ATT-${siteName.slice(0, 4)}-${String(now.getDate()).padStart(2, '0')}${String(now.getMonth() + 1).padStart(2, '0')}`;
      const flowId = `FLOW-HR-${attRef.replace(/[^a-zA-Z0-9]/g, '-')}`;
      
      const initialStages = FMS_HR_ATTENDANCE_PAYMENT_STAGES.map((def, idx) => {
        const plannedTime = new Date(now.getTime() + (idx === 0 ? 4 : (idx + 1) * 2) * 3600000);
        return {
          stageId: def.stageId,
          stageName: def.name,
          assignee: def.whoDefaultAssignee,
          how: def.howChannel,
          status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
          submittedData: idx === 0 ? { attendanceDate: attendanceDate.trim() || formattedDate, totalLabourPresent, totalOtHours, site: siteName, priority, remarks } : undefined,
        };
      });

      const newFlow: FmsInstance = {
        id: `fms-inst-hr-${Date.now()}`,
        flowId,
        flowType: 'HR_ATTENDANCE_PAYMENT',
        indentNo: attRef,
        attendanceDate: attendanceDate.trim() || formattedDate,
        indentDate: attendanceDate.trim() || formattedDate,
        siteName,
        priority,
        totalLabourPresent: parseInt(totalLabourPresent, 10) || 0,
        totalOtHours: parseFloat(totalOtHours) || 0,
        currentStageId: initialStages[1]?.stageId || 'STG-HR-02',
        currentStageIndex: 1,
        totalStages: 11,
        status: 'In Progress',
        createdAt: now.toLocaleString('en-GB'),
        updatedAt: now.toLocaleString('en-GB'),
        totalDelayHours: 0,
        remarks: remarks.trim() || undefined,
        stages: initialStages,
      };

      onCreate(newFlow);
      onClose();
    } else if (flowType === 'BREAKDOWN_REPORTING') {
      if (!machineName.trim()) {
        setError('Name of Machine / Vehicle / Plant is required');
        return;
      }
      if (!machineIdNo.trim()) {
        setError('Machine Identification Number is required');
        return;
      }

      const brkRef = `BRK-${machineIdNo.trim().toUpperCase().replace(/[^a-zA-Z0-9]/g, '')}`;
      const flowId = `FLOW-BRK-${machineIdNo.trim().toUpperCase().replace(/[^a-zA-Z0-9]/g, '-')}`;

      const initialStages = FMS_BREAKDOWN_REPORTING_STAGES.map((def, idx) => {
        const plannedTime = new Date(now.getTime() + (idx === 0 ? 1 : (idx + 1) * 2) * 3600000);
        return {
          stageId: def.stageId,
          stageName: def.name,
          assignee: def.whoDefaultAssignee,
          how: def.howChannel,
          status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
          submittedData: idx === 0 ? { machineName: machineName.trim(), machineIdNo: machineIdNo.trim(), machineMakeModel, attendingMechanic, mechanicMobileNo, site: siteName, priority, remarks } : undefined,
        };
      });

      const newFlow: FmsInstance = {
        id: `fms-inst-brk-${Date.now()}`,
        flowId,
        flowType: 'BREAKDOWN_REPORTING',
        indentNo: brkRef,
        indentDate: formattedDate,
        machineName: machineName.trim(),
        machineIdNo: machineIdNo.trim(),
        machineMakeModel: machineMakeModel.trim() || undefined,
        siteName,
        attendingMechanic: attendingMechanic.trim() || undefined,
        mechanicMobileNo: mechanicMobileNo.trim() || undefined,
        priority,
        currentStageId: initialStages[1]?.stageId || 'STG-BRK-02',
        currentStageIndex: 1,
        totalStages: 14,
        status: 'In Progress',
        createdAt: now.toLocaleString('en-GB'),
        updatedAt: now.toLocaleString('en-GB'),
        totalDelayHours: 0,
        remarks: remarks.trim() || undefined,
        stages: initialStages,
      };

      onCreate(newFlow);
      onClose();
    } else if (flowType === 'EQUIPMENT_PART_REPAIR') {
      if (!partEquipmentName.trim()) {
        setError('Part / Equipment Name is required');
        return;
      }

      const eqpRef = partSerialNo.trim() ? `EQP-${partSerialNo.trim().toUpperCase().replace(/[^a-zA-Z0-9]/g, '')}` : `EQP-${Date.now()}`;
      const flowId = `FLOW-EQP-${eqpRef.replace(/[^a-zA-Z0-9]/g, '-')}`;

      const initialStages = FMS_EQUIPMENT_PART_REPAIR_STAGES.map((def, idx) => {
        const plannedTime = new Date(now.getTime() + (idx === 0 ? 1 : (idx + 1) * 2) * 3600000);
        return {
          stageId: def.stageId,
          stageName: def.name,
          assignee: def.whoDefaultAssignee,
          how: def.howChannel,
          status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
          submittedData: idx === 0 ? { partEquipmentName: partEquipmentName.trim(), partSerialNo, vehiclePlantMachineName, warrantyStatus, site: siteName, priority, remarks } : undefined,
        };
      });

      const newFlow: FmsInstance = {
        id: `fms-inst-eqp-${Date.now()}`,
        flowId,
        flowType: 'EQUIPMENT_PART_REPAIR',
        indentNo: eqpRef,
        indentDate: formattedDate,
        partSerialNo: partSerialNo.trim() || undefined,
        partEquipmentName: partEquipmentName.trim(),
        vehiclePlantMachineName: vehiclePlantMachineName.trim() || partEquipmentName.trim(),
        warrantyStatus,
        siteName,
        priority,
        currentStageId: initialStages[1]?.stageId || 'STG-EQP-02',
        currentStageIndex: 1,
        totalStages: 18,
        status: 'In Progress',
        createdAt: now.toLocaleString('en-GB'),
        updatedAt: now.toLocaleString('en-GB'),
        totalDelayHours: 0,
        remarks: remarks.trim() || undefined,
        stages: initialStages,
      };

      onCreate(newFlow);
      onClose();
    } else if (flowType === 'DPR_REPORTING') {
      const selectedDprDate = dprDate.trim() || formattedDate;
      const dprRef = `DPR-${siteName.substring(0, 3).toUpperCase()}-${selectedDprDate.replace(/[^0-9]/g, '')}`;
      const flowId = `FLOW-DPR-${siteName.toUpperCase()}-${Date.now()}`;

      const initialStages = FMS_DPR_REPORTING_STAGES.map((def, idx) => {
        const plannedTime = new Date(now.getTime() + (idx === 0 ? 1 : (idx + 1)) * 3600000);
        return {
          stageId: def.stageId,
          stageName: def.name,
          assignee: def.whoDefaultAssignee,
          how: def.howChannel,
          status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
          submittedData: idx === 0 ? { dprDate: selectedDprDate, dprPreparedBy: dprPreparedBy.trim() || currentUser.name, site: siteName, priority, remarks } : undefined,
        };
      });

      const newFlow: FmsInstance = {
        id: `fms-inst-dpr-${Date.now()}`,
        flowId,
        flowType: 'DPR_REPORTING',
        indentNo: dprRef,
        indentDate: selectedDprDate,
        dprDate: selectedDprDate,
        dprPreparedBy: dprPreparedBy.trim() || currentUser.name,
        siteName,
        priority,
        currentStageId: initialStages[1]?.stageId || 'STG-DPR-02',
        currentStageIndex: 1,
        totalStages: 6,
        status: 'In Progress',
        createdAt: now.toLocaleString('en-GB'),
        updatedAt: now.toLocaleString('en-GB'),
        totalDelayHours: 0,
        remarks: remarks.trim() || undefined,
        stages: initialStages,
      };

      onCreate(newFlow);
      onClose();
    } else {
      // PO_TO_PAYMENT
      if (!poNumber.trim()) {
        setError('Purchase Order (PO) Number is required');
        return;
      }
      if (!vendorName.trim()) {
        setError('Vendor name is required');
        return;
      }

      const flowId = `FLOW-PAY-${poNumber.trim().replace(/[^a-zA-Z0-9]/g, '-')}`;
      const customizedTpl = customTemplates.find((t) => t.templateKey === 'PO_TO_PAYMENT' || t.id === 'builtin_PO_TO_PAYMENT');
      const initialStages = customizedTpl
        ? customizedTpl.stages.map((stg, idx) => {
            const sla = stg.slaHours || 1;
            const plannedTime = new Date(now.getTime() + (idx === 0 ? sla : (idx + 1) * sla) * 3600000);
            return {
              stageId: stg.stageId,
              stageName: stg.stageName,
              assignee: stg.whoDefaultAssignee,
              how: stg.howChannel || 'IN-APP FORM',
              status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
              plannedDateTime: plannedTime.toLocaleString('en-GB'),
              actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
              fields: stg.fields,
              logic: stg.logic,
              checkpoints: stg.checkpoints,
              submittedData: idx === 0 ? { poNumber: poNumber.trim(), vendorName: vendorName.trim(), poAmount, site: siteName, priority, remarks } : undefined,
            };
          })
        : FMS_PO_PAYMENT_STAGES.map((def, idx) => {
            const plannedTime = new Date(now.getTime() + (idx === 0 ? 1 : (idx + 1) * 2) * 3600000);
            let stageFields = undefined;
            if (idx === 6) {
              stageFields = [
                { id: 'sheetNo', label: 'Sheet No. / Voucher No.', type: 'TEXT' as const, required: true },
                { id: 'entryTimestamp', label: 'Timestamp', type: 'TEXT' as const, required: false },
                { id: 'vendorName', label: 'Vendor Name', type: 'TEXT' as const, required: true },
                { id: 'purposeOfPayment', label: 'Purpose of Payment', type: 'TEXT' as const, required: true },
                { id: 'requestedBy', label: 'Requested By', type: 'TEXT' as const, required: true },
                { id: 'site', label: 'Site', type: 'SELECT' as const, options: ['Raipur Office', 'Raipur Workshop', 'Siladehi Site', 'Bijetala Site'], required: true },
                { id: 'modeOfPayment', label: 'Mode Of Payment', type: 'SELECT' as const, options: ['UPI', 'ACCOUNT', 'RTGS/NEFT', 'CHEQUE'], required: true },
                { id: 'amountToBePaid', label: 'Amount to Be Paid (₹)', type: 'NUMBER' as const, required: true },
                { id: 'billNoOrPo', label: 'Bill No./PO', type: 'TEXT' as const, required: true },
                { id: 'poUploadLink', label: 'Remark PO UPLOAD', type: 'URL' as const },
                { id: 'remark', label: 'Initiation Remarks', type: 'TEXTAREA' as const },
              ];
            } else if (idx === 7) {
              stageFields = [
                { id: 'status', label: 'Approval Status', type: 'APPROVAL' as const, options: ['APPROVED', 'REJECTED'], required: true },
                { id: 'statusTimestamp', label: 'Status Timestamp', type: 'TEXT' as const, required: false },
                { id: 'approvedAmount', label: 'Approved Amount (₹)', type: 'NUMBER' as const, required: true },
                { id: 'approvalRemarks', label: 'Approval Notes / Justification', type: 'TEXTAREA' as const },
              ];
            } else if (idx === 8) {
              stageFields = [
                { id: 'bankEntryStatus', label: 'Bank Entry Status', type: 'SELECT' as const, options: ['DONE', 'APPROVED', 'PENDING'], required: true },
                { id: 'bankEntryTimestamp', label: 'Bank Entry Timestamp', type: 'TEXT' as const, required: false },
                { id: 'bankAccount', label: 'Bank Account Debited', type: 'SELECT' as const, options: ['HDFC Main Ops A/c', 'SBI Site A/c', 'ICICI Disbursements'], required: true },
                { id: 'entryRemarks', label: 'Bank Entry Notes', type: 'TEXTAREA' as const },
              ];
            }

            return {
              stageId: def.stageId,
              stageName: def.name,
              assignee: def.whoDefaultAssignee,
              how: def.howChannel,
              status: idx === 0 ? ('Done' as const) : idx === 1 ? ('In Progress' as const) : ('Pending' as const),
              plannedDateTime: plannedTime.toLocaleString('en-GB'),
              actualDateTime: idx === 0 ? now.toLocaleString('en-GB') : undefined,
              formResponseRef: def.formUrl,
              fields: stageFields,
              submittedData: idx === 0 ? { poNumber: poNumber.trim(), vendorName: vendorName.trim(), poAmount, site: siteName, priority, remarks } : undefined,
            };
          });

      const newFlow: FmsInstance = {
        id: `fms-inst-pay-${Date.now()}`,
        flowId,
        flowType: 'PO_TO_PAYMENT',
        poNumber: poNumber.trim(),
        vendorName: vendorName.trim(),
        poAmount: parseFloat(poAmount) || 0,
        poAssignTo: poAssignTo.trim(),
        indentNo: indentNo.trim() || poNumber.trim(),
        indentDate: formattedDate,
        poDate: formattedDate,
        siteName,
        priority,
        currentStageId: initialStages[1]?.stageId || 'STG-PAY-02',
        currentStageIndex: 1,
        totalStages: initialStages.length,
        status: 'In Progress',
        createdAt: now.toLocaleString('en-GB'),
        updatedAt: now.toLocaleString('en-GB'),
        totalDelayHours: 0,
        paymentMode: 'PENDING',
        remarks: remarks.trim() || undefined,
        stages: initialStages,
      };

      onCreate(newFlow);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4">
      <div className="bg-white rounded-2xl max-w-xl sm:max-w-2xl w-full shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] sm:max-h-[88vh] flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 shrink-0">
              <GitBranch className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900 leading-tight">
                Initialize Organization Workflow
              </h3>
              <p className="text-[11px] text-slate-500">
                Launch a tracked department operation or custom workflow
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto flex-1">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Department Flow Type Selector */}
          <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-800">
                Workflow Process Template <span className="text-rose-500">*</span>
              </label>
              {onOpenTemplateStudio && (
                <button
                  type="button"
                  onClick={onOpenTemplateStudio}
                  className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Build New Template</span>
                </button>
              )}
            </div>

            <select
              value={selectedCustomTemplateId ? `CUSTOM_${selectedCustomTemplateId}` : flowType}
              onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('CUSTOM_')) {
                  const tplId = val.replace('CUSTOM_', '');
                  handleSelectCustomTemplate(tplId);
                } else {
                  setSelectedCustomTemplateId(null);
                  setFlowType(val as any);
                }
              }}
              className="w-full text-xs px-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-semibold text-slate-800 cursor-pointer shadow-xs"
            >
              <optgroup label="Standard Department Workflows">
                <option value="CHECK_STOCK">Store Check Stock (Store Inventory, 5 stages)</option>
                <option value="STORE_TO_SITE_DISPATCH">Store to Site Dispatch (Stock to Site, 9 stages)</option>
                <option value="INDENT_PURCHASE">Purchase Indent to PO (Purchase Dept, 12 stages)</option>
                <option value="PO_TO_PAYMENT">Accounts PO to Payment (Accounts Dept, 15 stages)</option>
                <option value="VENDOR_PAYMENT_TO_DISPATCH">Vendor Payment to Dispatch (Vendor QC, 7 stages)</option>
                <option value="PURCHASE_TO_STORE_DISPATCH">Purchase to Store Dispatch (Store to Site, 10 stages)</option>
                <option value="SITE_RECEIVE">Site Material Receive (MRN) (Site Inward, 10 stages)</option>
                <option value="ACCOUNTS_INVOICE_COLLECTION">Accounts Invoice Collection (Accounts GST, 7 stages)</option>
                <option value="HR_ATTENDANCE_PAYMENT">Labour Attendance &amp; Payment (HR Muster Roll, 11 stages)</option>
                <option value="BREAKDOWN_REPORTING">Machine Breakdown (Plant/Vehicle Defect, 14 stages)</option>
                <option value="EQUIPMENT_PART_REPAIR">Equipment Part Repair (Warranty &amp; Work Order, 18 stages)</option>
                <option value="DPR_REPORTING">Daily Progress Report (DPR) (Consumption &amp; Progress, 6 stages)</option>
              </optgroup>
              {customTemplates.length > 0 && (
                <optgroup label="Custom Workflow Templates">
                  {customTemplates.map((tpl) => (
                    <option key={tpl.id} value={`CUSTOM_${tpl.id}`}>
                      {tpl.name} ({tpl.stages.length} stages)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>
          </div>

          {selectedCustomTemplateId ? (
            (() => {
              const tpl = customTemplates.find((t) => t.id === selectedCustomTemplateId);
              if (!tpl) return null;
              const stage1Fields = tpl.stages[0]?.fields || [];

              return (
                <div className="space-y-4 p-4 bg-slate-50/80 rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-slate-900 text-xs">Custom Workflow: {tpl.name}</span>
                        <span className="text-[10px] bg-indigo-100 text-indigo-700 font-bold px-2 py-0.5 rounded">
                          {tpl.stages.length} Stages
                        </span>
                      </div>
                      {tpl.description && <p className="text-[11px] text-slate-500 mt-0.5">{tpl.description}</p>}
                    </div>
                  </div>

                  {/* Primary Workflow Identifier (Reference / Voucher No.) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="block text-xs font-semibold text-slate-700">
                        {tpl.referenceLabel && !tpl.referenceLabel.toUpperCase().includes('UPI')
                          ? tpl.referenceLabel
                          : 'Tracking Reference / Serial Code'}{' '}
                        <span className="text-rose-500">*</span>
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          const prefix = (tpl.name || 'REF')
                            .replace(/[^A-Za-z0-9]/g, '')
                            .slice(0, 3)
                            .toUpperCase() || 'REF';
                          setIndentNo(`${prefix}-${new Date().getFullYear()}-${Date.now().toString().slice(-4)}`);
                        }}
                        className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 cursor-pointer flex items-center gap-1"
                      >
                        <Sparkles className="w-3 h-3" />
                        <span>Auto-Generate ID</span>
                      </button>
                    </div>
                    <input
                      type="text"
                      required
                      placeholder={`e.g. ${tpl.referenceLabel || 'REF-2026-001'}`}
                      value={indentNo}
                      onChange={(e) => setIndentNo(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-900"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      Unique tracking number or voucher code for this entry.
                    </p>
                  </div>

                  {/* Stage #1 Form Fields Defined in Template Studio */}
                  {stage1Fields.length > 0 && (
                    <div className="space-y-3 pt-2 border-t border-slate-200">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                          Stage #1 Form Fields: {tpl.stages[0]?.stageName || 'Initiation Requisition'}
                        </span>
                        <span className="text-[10px] bg-white text-indigo-700 font-semibold px-2 py-0.5 rounded border border-indigo-200">
                          Assignee: {tpl.stages[0]?.whoDefaultAssignee || tpl.stages[0]?.whoRole || 'Requester'}
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-2xs">
                        {stage1Fields.map((field) => {
                          const isFullWidth = field.type === 'TEXTAREA' || field.label.length > 25;
                          return (
                            <div key={field.id} className={isFullWidth ? 'sm:col-span-2' : ''}>
                              <label className="block text-xs font-semibold text-slate-700 mb-1">
                                {field.label} {field.required && <span className="text-rose-500">*</span>}
                              </label>

                              {field.type === 'SELECT' ? (
                                <select
                                  required={field.required}
                                  value={customFormData[field.id] ?? ''}
                                  onChange={(e) => {
                                    handleCustomFieldChange(field.id, e.target.value);
                                    if (field.label.toLowerCase().includes('site')) {
                                      setSiteName(e.target.value);
                                    }
                                    if (field.label.toLowerCase().includes('priority')) {
                                      setPriority(e.target.value as Priority);
                                    }
                                  }}
                                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
                                >
                                  <option value="">-- Select {field.label} --</option>
                                  {(field.options && field.options.length > 0
                                    ? field.options
                                    : field.label.toLowerCase().includes('site')
                                    ? ['SILADEHI', 'BIJETALA', 'RAIPUR', 'CENTRAL STORE']
                                    : field.label.toLowerCase().includes('priority')
                                    ? ['Normal', 'Urgent', 'Low']
                                    : ['Option 1', 'Option 2']
                                  ).map((opt) => (
                                    <option key={opt} value={opt}>
                                      {opt}
                                    </option>
                                  ))}
                                </select>
                              ) : field.type === 'NUMBER' ? (
                                <input
                                  type="number"
                                  required={field.required}
                                  placeholder={field.placeholder || `Enter ${field.label}...`}
                                  value={customFormData[field.id] ?? ''}
                                  onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
                                />
                              ) : field.type === 'TEXTAREA' ? (
                                <textarea
                                  rows={2}
                                  required={field.required}
                                  placeholder={field.placeholder || `Enter ${field.label}...`}
                                  value={customFormData[field.id] ?? ''}
                                  onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
                                />
                              ) : (field.type as string) === 'DATE' ? (
                                <input
                                  type="date"
                                  required={field.required}
                                  value={customFormData[field.id] ?? ''}
                                  onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
                                />
                              ) : (field.type as string) === 'FILE' ? (
                                <FileUploadField
                                  id={field.id}
                                  label={field.label}
                                  required={field.required}
                                  placeholder={field.placeholder}
                                  value={customFormData[field.id] ?? ''}
                                  onChange={(val) => handleCustomFieldChange(field.id, val)}
                                />
                              ) : field.type === 'URL' ? (
                                <div className="relative">
                                  <input
                                    type="url"
                                    required={field.required}
                                    placeholder={field.placeholder || 'https://drive.google.com/... or web URL'}
                                    value={customFormData[field.id] ?? ''}
                                    onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                    className="w-full text-xs pl-8 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
                                  />
                                  <Link2 className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                                </div>
                              ) : (
                                <input
                                  type="text"
                                  required={field.required}
                                  placeholder={field.placeholder || `Enter ${field.label}...`}
                                  value={customFormData[field.id] ?? ''}
                                  onChange={(e) => handleCustomFieldChange(field.id, e.target.value)}
                                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
                                />
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  <div className="pt-1">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                      Pipeline Stages Progression
                    </span>
                    <div className="flex flex-wrap items-center gap-1.5">
                      {tpl.stages.map((s, idx) => (
                        <div key={s.stageId} className="flex items-center gap-1">
                          <span className="text-[11px] font-medium bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700">
                            <span className="font-bold text-indigo-600 mr-1">{idx + 1}.</span>
                            {s.stageName}
                          </span>
                          {idx < tpl.stages.length - 1 && (
                            <span className="text-slate-400 text-xs">→</span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })()
          ) : flowType === 'CHECK_STOCK' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Material Requisition Number / Indent Ref <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. Indent no-477 or REQ-477"
                value={indentNo}
                onChange={(e) => setIndentNo(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Store Manager (Amanat Bhardwaj) will verify physical stock and decide whether to dispatch or trigger Purchase Indent.
              </p>
            </div>
          ) : flowType === 'STORE_TO_SITE_DISPATCH' ? (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Requisition Number (Available Stock) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. 654 or REQ-477"
                  value={indentNo}
                  onChange={(e) => setIndentNo(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-cyan-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Covers 9 stages: Collect items available by Store Manager Sumant (Siladehi) / Hemant (Bijetala), arrange vehicle, stock transfer note / delivery challan, E-Way Bill decision checkpoint, loading, dispatch, and purchaser Google Form receiving.
              </p>
            </div>
          ) : flowType === 'INDENT_PURCHASE' ? (
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Indent No. <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                placeholder="e.g. 753 or 781"
                value={indentNo}
                onChange={(e) => setIndentNo(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
              />
              <p className="text-[11px] text-slate-400 mt-1">
                Syncs with Indent Purchase Sheet 1 (Stages 1 to 12).
              </p>
            </div>
          ) : flowType === 'PURCHASE_TO_STORE_DISPATCH' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Indent No. / Requisition <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 752 or 22"
                    value={indentNo}
                    onChange={(e) => setIndentNo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PO Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. PO/2026/0752"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vendor Name (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Authorized Vendor"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Covers 10 stages: Store Manager Bramhanand Patel material receiving, Shyam Rao Sureshe physical inspection and challan generation, vehicle arrangement, E-Way Bill decision checkpoint, and final Google Form site receiving confirmation.
              </p>
            </div>
          ) : flowType === 'SITE_RECEIVE' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Site Requisition / MRN <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MRN-2026-088 or Indent 752"
                    value={indentNo}
                    onChange={(e) => setIndentNo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Challan / Dispatch No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. CHAL-0082"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Transporter / Vehicle / Vendor Ref
                </label>
                <input
                  type="text"
                  placeholder="e.g. CG-04-MB-2291 / Central Store Transfer"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none"
                />
              </div>
              <p className="text-[11px] text-slate-400">
                Covers 10 stages: Site Store Incharge receipt, physical verification against documents, discrepancy decision checkpoint, site engineer technical verification, and Site DEO Google Form inward recording.
              </p>
            </div>
          ) : flowType === 'PAYMENT_TO_DISPATCH' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Order (PO) Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RAO/PO/260722-002"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Indent Ref No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 752 or 22"
                    value={indentNo}
                    onChange={(e) => setIndentNo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Vendor Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. M/S ASHARAM ELECTRICALS"
                  value={vendorName}
                  onChange={(e) => setVendorName(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PO Assigned Officer
                </label>
                <input
                  type="text"
                  placeholder="e.g. MR. VIVEK / RAJENDRA"
                  value={poAssignTo}
                  onChange={(e) => setPoAssignTo(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Covers 7 stages: Vendor material collection, Shyam Rao Sureshe inspection, acceptability checkpoint, replacement/credit note routing, and final dispatch Google Form submission.
              </p>
            </div>
          ) : flowType === 'ACCOUNTS_INVOICE_COLLECTION' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Purchase Order (PO) Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RAO/PO/260715-006"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Requisition / Indent Ref No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 449 or 752"
                    value={indentNo}
                    onChange={(e) => setIndentNo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor / Supplier Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M/S ULTRA TECH CEMENT"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Invoice / PO Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 150000"
                    value={poAmount}
                    onChange={(e) => setPoAmount(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Responsible Officer / Manager
                </label>
                <input
                  type="text"
                  placeholder="e.g. MR. BRAMHANAND PATEL / BYAMKESH KAIWARTYA"
                  value={poAssignTo}
                  onChange={(e) => setPoAssignTo(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Covers 7 stages: Accounts Manager (Byamkesh) invoice receipt, line-item &amp; tax calculation verification, Purchase Manager (Bramhanand Patel) acceptability decision &amp; rectification, Khushboo EA authorization, online ERP voucher upload, and physical hardcopy archiving.
              </p>
            </div>
          ) : flowType === 'BREAKDOWN_REPORTING' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Machine / Vehicle Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Dg-82.5 or JCB 3DX"
                    value={machineName}
                    onChange={(e) => setMachineName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Identification Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. CJGS18014779"
                    value={machineIdNo}
                    onChange={(e) => setMachineIdNo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Make &amp; Model
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. JSPF-82.5B"
                    value={machineMakeModel}
                    onChange={(e) => setMachineMakeModel(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Attending Mechanic Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Chotu / Site Mechanic"
                    value={attendingMechanic}
                    onChange={(e) => setAttendingMechanic(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mechanic Mobile Number
                </label>
                <input
                  type="text"
                  placeholder="e.g. 8581041010"
                  value={mechanicMobileNo}
                  onChange={(e) => setMechanicMobileNo(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:outline-none"
                />
              </div>

              <p className="text-[11px] text-slate-400">
                Covers 14 breakdown management stages: Preliminary report, OEM service engineer decision &amp; visit, defect analysis, site repair vs offsite workshop routing, parts indent, 2-hour load trial run, and site redeployment.
              </p>
            </div>
          ) : flowType === 'EQUIPMENT_PART_REPAIR' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Part / Equipment Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Submersible Pump Set / Hydraulic Cylinder"
                    value={partEquipmentName}
                    onChange={(e) => setPartEquipmentName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Part Serial Number(s)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Pump S/N: 22376424 Motor S/N: 23029944"
                    value={partSerialNo}
                    onChange={(e) => setPartSerialNo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vehicle / Plant / Machine Name
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Submersible Pump Set or DG-82.5"
                    value={vehiclePlantMachineName}
                    onChange={(e) => setVehiclePlantMachineName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Warranty Status
                  </label>
                  <select
                    value={warrantyStatus}
                    onChange={(e) => setWarrantyStatus(e.target.value as any)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-rose-500 focus:outline-none bg-white"
                  >
                    <option value="OUT_WARRANTY">OUT OF WARRANTY (Paid Repair)</option>
                    <option value="IN_WARRANTY">IN WARRANTY (Free OEM Repair)</option>
                  </select>
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Covers 18 repair stages: Google form requisition, warranty verification checkpoint, OEM service center dispatch, paper approval, estimation, work order issue, 2-stage trial runs, additional charges checkpoint, store receipt, and site deployment.
              </p>
            </div>
          ) : flowType === 'DPR_REPORTING' ? (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Date of DPR <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 01/07/2026"
                    value={dprDate}
                    onChange={(e) => setDprDate(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    DPR Prepared By <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Eklavya Upadhyay / Khilesh"
                    value={dprPreparedBy}
                    onChange={(e) => setDprPreparedBy(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                  />
                </div>
              </div>

              <p className="text-[11px] text-slate-400">
                Covers 6 DPR stages: Receive DPR, Prepare Planned Actual Sheet, Prepare Consumption Report, Report Mechanical Issues, Report Hindrances to PM, and Update Weekly Review Sheet.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PO Number <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. RAO/PO/260625-002"
                    value={poNumber}
                    onChange={(e) => setPoNumber(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Indent Ref No.
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 752 or 22"
                    value={indentNo}
                    onChange={(e) => setIndentNo(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Vendor Name <span className="text-rose-500">*</span>
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. M/S R D SONS"
                    value={vendorName}
                    onChange={(e) => setVendorName(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    PO Amount (₹)
                  </label>
                  <input
                    type="number"
                    placeholder="e.g. 27445"
                    value={poAmount}
                    onChange={(e) => setPoAmount(e.target.value)}
                    className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  PO Assigned Officer
                </label>
                <input
                  type="text"
                  placeholder="e.g. MANISH KOSHLE"
                  value={poAssignTo}
                  onChange={(e) => setPoAssignTo(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:outline-none"
                />
              </div>
            </div>
          )}

          {/* Only show generic Site, Priority, Remarks if NO custom template is selected OR custom template does not provide them */}
          {(() => {
            const currentTpl = selectedCustomTemplateId ? customTemplates.find((t) => t.id === selectedCustomTemplateId) : null;
            const s1Fields = currentTpl?.stages[0]?.fields || [];
            const hasSiteField = s1Fields.some((f) => f.label.toLowerCase().includes('site') || f.id.toLowerCase().includes('site'));
            const hasPriorityField = s1Fields.some((f) => f.label.toLowerCase().includes('priority') || f.id.toLowerCase().includes('priority'));
            const hasRemarksField = s1Fields.some((f) => f.label.toLowerCase().includes('remark') || f.label.toLowerCase().includes('purpose') || f.id.toLowerCase().includes('remark'));

            if (currentTpl && hasSiteField && hasRemarksField && hasPriorityField) {
              return null; // All core fields already provided inside Stage #1 custom form
            }

            return (
              <>
                {(!hasSiteField || !hasPriorityField) && (
                  <div className="grid grid-cols-2 gap-4">
                    {!hasSiteField && (
                      <div className={hasPriorityField ? 'col-span-2' : ''}>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Site Name <span className="text-rose-500">*</span>
                        </label>
                        <select
                          value={siteName}
                          onChange={(e) => setSiteName(e.target.value)}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
                        >
                          <option value="SILADEHI">SILADEHI</option>
                          <option value="BIJETALA">BIJETALA</option>
                          <option value="RAIPUR">RAIPUR OFFICE</option>
                          <option value="CENTRAL STORE">CENTRAL STORE</option>
                        </select>
                      </div>
                    )}

                    {!hasPriorityField && (
                      <div className={hasSiteField ? 'col-span-2' : ''}>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Priority
                        </label>
                        <select
                          value={priority}
                          onChange={(e) => setPriority(e.target.value as Priority)}
                          className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
                        >
                          <option value="Normal">Normal</option>
                          <option value="Urgent">Urgent</option>
                          <option value="Low">Low</option>
                        </select>
                      </div>
                    )}
                  </div>
                )}

                {!hasRemarksField && (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      Purpose / Remarks
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Describe materials requested or payment terms..."
                      value={remarks}
                      onChange={(e) => setRemarks(e.target.value)}
                      className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium text-slate-800"
                    />
                  </div>
                )}
              </>
            );
          })()}

          <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 text-xs text-slate-600 space-y-1.5">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>
                {selectedCustomTemplateId ? (
                  (() => {
                    const tpl = customTemplates.find((t) => t.id === selectedCustomTemplateId);
                    return tpl ? `${tpl.name} (${tpl.stages.length}-Stage Pipeline)` : 'Custom Workflow Pipeline';
                  })()
                ) : flowType === 'CHECK_STOCK' 
                  ? 'Store 6-Stage Check Stock Pipeline' 
                  : flowType === 'STORE_TO_SITE_DISPATCH'
                  ? 'Store to Site 9-Stage Dispatch Pipeline (Stock Available)'
                  : flowType === 'INDENT_PURCHASE' 
                  ? 'Purchase 12-Stage Indent Pipeline' 
                  : flowType === 'PO_TO_PAYMENT'
                  ? 'Accounts 15-Stage Payment Pipeline'
                  : flowType === 'PURCHASE_TO_STORE_DISPATCH'
                  ? 'Store 10-Stage Dispatch Pipeline'
                  : flowType === 'PAYMENT_TO_DISPATCH'
                  ? 'Vendor 7-Stage QC & Dispatch Pipeline'
                  : flowType === 'SITE_RECEIVE'
                  ? 'Site 10-Stage Receiving & Inward Pipeline'
                  : 'Accounts 7-Stage Invoice Collection & ERP Pipeline'}
              </span>
              <span className="text-[10px] font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded">
                Tracked FMS
              </span>
            </div>
            <div className="text-[11px] text-slate-500 leading-relaxed">
              {selectedCustomTemplateId ? (
                (() => {
                  const tpl = customTemplates.find((t) => t.id === selectedCustomTemplateId);
                  return tpl
                    ? tpl.stages.map((s, sIdx) => `${sIdx + 1}. ${s.stageName} (${s.whoRole || s.whoDefaultAssignee || 'Assignee'})`).join(' → ')
                    : '';
                })()
              ) : flowType === 'CHECK_STOCK'
                ? 'Stage 1 (Receive Requisition) → Stage 2 (Check Stock) → Stage 3 (Purchase Required?) → Stage 4 (Send Indent) → Stage 5 (Partial Purchase?) → Stage 6 (Dispatch Material).'
                : flowType === 'STORE_TO_SITE_DISPATCH'
                ? 'Collect Items Available → Arrange Vehicle → Stock Transfer Note / Challan → E-Way Bill Checkpoint → Load Material → Dispatch → Site Receiving Form.'
                : flowType === 'INDENT_PURCHASE'
                ? 'Indent Receive → Degraded Material Check → ... → Advance Payment Decision → Material Collection PO.'
                : flowType === 'PO_TO_PAYMENT'
                ? 'Payment from Account Checkpoint (Yes: Bank NEFT / No: UPI QR) → Account Check → Payment Approval Form → Disbursement.'
                : flowType === 'PURCHASE_TO_STORE_DISPATCH'
                ? 'Store Material Receive → Physical Check → Challan Ready → Vehicle Arrangement → E-Way Bill Checkpoint → Inward Form.'
                : flowType === 'PAYMENT_TO_DISPATCH'
                ? 'Vendor Material Receive → Inspection → Quality Acceptable Checkpoint → Debit/Replacement Note → Dispatch Form.'
                : flowType === 'SITE_RECEIVE'
                ? 'Site Material Receive → Physical Inspection → Discrepancy Checkpoint → Site Engineer Verification → Google Form Inward Entry.'
                : 'Receive Vendor Invoice → Line Item & Tax Calculation Check → Purchase Manager Acceptability Checkpoint → EA Approval → ERP Voucher Upload → Original Invoice Archiving.'}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-lg text-xs font-bold shadow-xs transition-colors cursor-pointer"
            >
              <Check className="w-4 h-4" />
              <span>Register &amp; Initialize Flow</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};


