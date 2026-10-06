import React, { useState } from 'react';
import { X, GitBranch, AlertCircle, Plus, Check, CreditCard, ShoppingCart, Boxes, Truck, PackageCheck, FileText, UserCheck, Wrench, Cog, FileSpreadsheet } from 'lucide-react';
import { FmsInstance, Priority, UserProfile } from '../../types';
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
import { FmsCreateInputSchema } from '../../services/storageAdapter';

interface CreateFmsModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: UserProfile;
  onCreate: (flow: FmsInstance) => void;
}

export const CreateFmsModal: React.FC<CreateFmsModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onCreate,
}) => {
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

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const now = new Date();
    const formattedDate = `${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}/${now.getFullYear()}`;

    if (flowType === 'CHECK_STOCK') {
      if (!indentNo.trim()) {
        setError('Requisition number / Indent reference is required');
        return;
      }

      const flowId = `FLOW-STK-${indentNo.trim().replace(/[^a-zA-Z0-9]/g, '-')}`;
      const initialStages = FMS_CHECK_STOCK_STAGES.map((def, idx) => {
        const plannedTime = new Date(now.getTime() + (idx === 0 ? 4 : (idx + 1) * 4) * 3600000);
        return {
          stageId: def.stageId,
          stageName: def.name,
          assignee: def.whoDefaultAssignee,
          how: def.howChannel,
          status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          formResponseRef: def.formUrl,
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
        currentStageId: 'STG-STK-01',
        currentStageIndex: 0,
        totalStages: 5,
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
          status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          formResponseRef: def.formUrl,
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
        currentStageId: 'STG-01',
        currentStageIndex: 0,
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
          status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          formResponseRef: def.formUrl,
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
        currentStageId: 'STG-PSD-01',
        currentStageIndex: 0,
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
          status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          formResponseRef: def.formUrl,
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
        currentStageId: 'STG-SSD-01',
        currentStageIndex: 0,
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
          status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          formResponseRef: def.formUrl,
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
        currentStageId: 'STG-DISP-01',
        currentStageIndex: 0,
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
          status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          formResponseRef: def.formUrl,
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
        currentStageId: 'STG-REC-01',
        currentStageIndex: 0,
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
          status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          formResponseRef: def.formUrl,
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
        currentStageId: 'STG-INV-01',
        currentStageIndex: 0,
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
          status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
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
        currentStageId: 'STG-HR-01',
        currentStageIndex: 0,
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
          status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
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
        currentStageId: 'STG-BRK-01',
        currentStageIndex: 0,
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
          status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
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
        currentStageId: 'STG-EQP-01',
        currentStageIndex: 0,
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
          status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
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
        currentStageId: 'STG-DPR-01',
        currentStageIndex: 0,
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
      const initialStages = FMS_PO_PAYMENT_STAGES.map((def, idx) => {
        const plannedTime = new Date(now.getTime() + (idx === 0 ? 1 : (idx + 1) * 2) * 3600000);
        return {
          stageId: def.stageId,
          stageName: def.name,
          assignee: def.whoDefaultAssignee,
          how: def.howChannel,
          status: idx === 0 ? ('In Progress' as const) : ('Pending' as const),
          plannedDateTime: plannedTime.toLocaleString('en-GB'),
          formResponseRef: def.formUrl,
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
        currentStageId: 'STG-PAY-01',
        currentStageIndex: 0,
        totalStages: 15,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <GitBranch className="w-5 h-5 text-indigo-600" />
            <span>Initialize Organization Workflow</span>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[85vh] overflow-y-auto">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Workflow Type Selector - 7 Pillars */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Select Department Flow Type <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFlowType('CHECK_STOCK')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  flowType === 'CHECK_STOCK'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Boxes className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">Check Stock</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">Store Inventory (5 stages)</div>
              </button>

              <button
                type="button"
                onClick={() => setFlowType('STORE_TO_SITE_DISPATCH')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  flowType === 'STORE_TO_SITE_DISPATCH'
                    ? 'border-cyan-600 bg-cyan-50/70 ring-2 ring-cyan-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-cyan-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">Stock to Site</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">Stock to Site Dispatch (9 stages)</div>
              </button>

              <button
                type="button"
                onClick={() => setFlowType('INDENT_PURCHASE')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  flowType === 'INDENT_PURCHASE'
                    ? 'border-indigo-600 bg-indigo-50/60 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <ShoppingCart className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">Indent to PO</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">Purchase Dept (12 stages)</div>
              </button>

              <button
                type="button"
                onClick={() => setFlowType('PO_TO_PAYMENT')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  flowType === 'PO_TO_PAYMENT'
                    ? 'border-purple-600 bg-purple-50/60 ring-2 ring-purple-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <CreditCard className="w-4 h-4 text-purple-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">PO to Payment</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">Accounts Dept (15 stages)</div>
              </button>

              <button
                type="button"
                onClick={() => setFlowType('PAYMENT_TO_DISPATCH')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  flowType === 'PAYMENT_TO_DISPATCH'
                    ? 'border-amber-600 bg-amber-50/70 ring-2 ring-amber-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">Payment to Dispatch</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">Vendor QC &amp; Dispatch (7 stages)</div>
              </button>

              <button
                type="button"
                onClick={() => setFlowType('PURCHASE_TO_STORE_DISPATCH')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  flowType === 'PURCHASE_TO_STORE_DISPATCH'
                    ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">Store Dispatch</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">Store to Site Dispatch (10 stages)</div>
              </button>

              <button
                type="button"
                onClick={() => setFlowType('SITE_RECEIVE')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  flowType === 'SITE_RECEIVE'
                    ? 'border-blue-600 bg-blue-50/70 ring-2 ring-blue-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <PackageCheck className="w-4 h-4 text-blue-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">Site Receive</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">Site Inward &amp; Verification (10 stages)</div>
              </button>

              <button
                type="button"
                onClick={() => setFlowType('ACCOUNTS_INVOICE_COLLECTION')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  flowType === 'ACCOUNTS_INVOICE_COLLECTION'
                    ? 'border-indigo-600 bg-indigo-50/70 ring-2 ring-indigo-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">Invoice Collection</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">Accounts GST &amp; ERP (7 stages)</div>
              </button>

              <button
                type="button"
                onClick={() => setFlowType('HR_ATTENDANCE_PAYMENT')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  flowType === 'HR_ATTENDANCE_PAYMENT'
                    ? 'border-teal-600 bg-teal-50/70 ring-2 ring-teal-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-teal-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">Labour Attendance</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">HR Muster Roll &amp; Wages (11 stages)</div>
              </button>

              <button
                type="button"
                onClick={() => setFlowType('BREAKDOWN_REPORTING')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  flowType === 'BREAKDOWN_REPORTING'
                    ? 'border-orange-600 bg-orange-50/70 ring-2 ring-orange-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Wrench className="w-4 h-4 text-orange-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">Machine Breakdown</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">Plant/Vehicle Defect Analysis (14 stages)</div>
              </button>

              <button
                type="button"
                onClick={() => setFlowType('EQUIPMENT_PART_REPAIR')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  flowType === 'EQUIPMENT_PART_REPAIR'
                    ? 'border-rose-600 bg-rose-50/70 ring-2 ring-rose-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <Cog className="w-4 h-4 text-rose-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">Equipment Part Repair</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">Warranty, Estimate &amp; Work Order (18 stages)</div>
              </button>

              <button
                type="button"
                onClick={() => setFlowType('DPR_REPORTING')}
                className={`p-2.5 rounded-xl border text-left flex flex-col gap-1 transition-all ${
                  flowType === 'DPR_REPORTING'
                    ? 'border-emerald-600 bg-emerald-50/70 ring-2 ring-emerald-500/20'
                    : 'border-slate-200 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <FileSpreadsheet className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span className="text-xs font-bold text-slate-900">Daily Progress Report (DPR)</span>
                </div>
                <div className="text-[10px] text-slate-500 leading-tight">Progress, Consumption &amp; Hindrance (6 stages)</div>
              </button>
            </div>
          </div>

          {flowType === 'CHECK_STOCK' ? (
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

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Site Name <span className="text-rose-500">*</span>
              </label>
              <select
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="SILADEHI">SILADEHI</option>
                <option value="BIJETALA">BIJETALA</option>
                <option value="RAIPUR">RAIPUR OFFICE</option>
                <option value="CENTRAL STORE">CENTRAL STORE</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as Priority)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="Normal">Normal</option>
                <option value="Urgent">Urgent</option>
                <option value="Low">Low</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Purpose / Remarks
            </label>
            <textarea
              rows={2}
              placeholder="Describe materials requested or payment terms..."
              value={remarks}
              onChange={(e) => setRemarks(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="p-3 rounded-lg bg-indigo-50/70 border border-indigo-100 text-[11px] text-slate-600 space-y-1">
            <div className="font-semibold text-indigo-900">
              {flowType === 'CHECK_STOCK' 
                ? 'Store 5-Stage Check Stock Pipeline:' 
                : flowType === 'STORE_TO_SITE_DISPATCH'
                ? 'Store to Site 9-Stage Dispatch Pipeline (Stock Available):'
                : flowType === 'INDENT_PURCHASE' 
                ? 'Purchase 12-Stage Indent Pipeline:' 
                : flowType === 'PO_TO_PAYMENT'
                ? 'Accounts 15-Stage Payment Pipeline:'
                : flowType === 'PURCHASE_TO_STORE_DISPATCH'
                ? 'Store 10-Stage Dispatch Pipeline:'
                : flowType === 'PAYMENT_TO_DISPATCH'
                ? 'Vendor 7-Stage QC & Dispatch Pipeline:'
                : flowType === 'SITE_RECEIVE'
                ? 'Site 10-Stage Receiving & Inward Pipeline:'
                : 'Accounts 7-Stage Invoice Collection & ERP Pipeline:'}
            </div>
            <div>
              {flowType === 'CHECK_STOCK'
                ? 'Stage 1 (Check Stock) → Stage 2 (Purchase Required?) → Stage 3 (Send Indent) → Stage 4 (Partial Purchase?) → Stage 5 (Dispatch Material).'
                : flowType === 'STORE_TO_SITE_DISPATCH'
                ? 'Collect Items Available (Sumant/Hemant) → Arrange Vehicle → Stock Transfer Note / Challan → E-Way Bill Checkpoint → Load Material → Dispatch → Site Receiving Form.'
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
                : 'Receive Vendor Invoice (Byamkesh) → Line Item & Tax Calculation Check → Purchase Manager Acceptability Checkpoint → EA Approval (Khushboo) → ERP Voucher Upload → Original Invoice Archiving.'}
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
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


