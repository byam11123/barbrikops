import React, { useState, useEffect } from 'react';
import { 
  GitBranch, 
  Clock, 
  AlertCircle, 
  CheckCircle2, 
  CheckSquare,
  ChevronRight, 
  ExternalLink, 
  Filter, 
  Plus, 
  Search, 
  ArrowUpRight,
  FileText,
  MapPin,
  Calendar,
  AlertTriangle,
  Play,
  User,
  Users,
  Eye,
  Layers,
  CreditCard,
  ShoppingCart,
  Boxes,
  Truck,
  PackageCheck,
  UserCheck,
  Wrench,
  Cog,
  FileSpreadsheet,
  Zap,
  Table,
  ClipboardList
} from 'lucide-react';
import { FmsInstance, FmsStageExecution, FmsStageDefinition, Priority, UserProfile } from '../../types';
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
import { isUserResponsibleForStage, isFlowAwaitingUserAction, getFmsDomainCategory } from '../../services/stageAssignment';
import { ViewScope } from '../layout/Header';

interface FmsPipelineProps {
  flows: FmsInstance[];
  currentUser: UserProfile;
  viewScope: ViewScope;
  onToggleScope: (scope: ViewScope) => void;
  onUpdateFlow: (flow: FmsInstance) => void;
  onCreateFlow: () => void;
  onSelectFlow: (flow: FmsInstance) => void;
}

export function parseDateTimeStr(str: string | undefined): Date | null {
  if (!str || str === '—' || str.includes('Target Pending')) return null;
  
  // Custom DD/MM/YYYY parsing to avoid standard Date interpreting it as MM/DD/YYYY
  try {
    const clean = str.replace(',', '').trim();
    const match = clean.match(/^(\d{1,2})[\s/:_.-]+(\d{1,2})[\s/:_.-]+(\d{4})/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10) - 1;
      const year = parseInt(match[3], 10);
      
      let hour = 0;
      let min = 0;
      let sec = 0;
      
      const timePart = clean.substring(match[0].length).trim();
      const timeParts = timePart.split(/[\s/:_.-]+/);
      if (timeParts.length >= 2) {
        hour = parseInt(timeParts[0], 10);
        min = parseInt(timeParts[1], 10);
        if (timeParts[2]) {
          const secVal = parseInt(timeParts[2], 10);
          if (!isNaN(secVal)) {
            sec = secVal;
          }
        }
      }
      
      const isPM = clean.toLowerCase().includes('pm');
      const isAM = clean.toLowerCase().includes('am');
      if (isPM && hour < 12) hour += 12;
      if (isAM && hour === 12) hour = 0;
      
      const d = new Date(year, month, day, hour, min, sec);
      if (!isNaN(d.getTime())) return d;
    }
  } catch (e) {}

  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) return parsed;
  return null;
}

export function getDelayHours(plannedStr: string | undefined, actualStr: string | undefined, isCompleted: boolean): number {
  const plannedDate = parseDateTimeStr(plannedStr);
  if (!plannedDate) return 0;
  let actualDate = parseDateTimeStr(actualStr);
  if (!actualDate) {
    if (isCompleted) return 0;
    actualDate = new Date();
  }
  const diffMs = actualDate.getTime() - plannedDate.getTime();
  if (diffMs <= 0) return 0;
  return diffMs / (1000 * 60 * 60);
}

export function formatDelayVariance(delayHours: number): string {
  if (delayHours <= 0) return '—';
  const totalSeconds = Math.round(delayHours * 3600);
  const h = Math.floor(totalSeconds / 3600);
  const m = Math.floor((totalSeconds % 3600) / 60);
  const s = totalSeconds % 60;
  const hStr = h.toString().padStart(2, '0');
  const mStr = m.toString().padStart(2, '0');
  const sStr = s.toString().padStart(2, '0');
  const baseTime = `${hStr}:${mStr}:${sStr}`;
  if (h >= 24) {
    const days = (delayHours / 24).toFixed(1);
    return `${baseTime}(${days} D)`;
  }
  return baseTime;
}

export const FmsPipeline: React.FC<FmsPipelineProps> = ({
  flows,
  currentUser,
  viewScope,
  onToggleScope,
  onUpdateFlow,
  onCreateFlow,
  onSelectFlow,
}) => {
  const [domainFilter, setDomainFilter] = useState<'ALL' | 'PROCUREMENT' | 'FINANCE_ACCOUNTS' | 'SITE_LOGISTICS' | 'HR_EQUIPMENT'>('ALL');
  const [pipelineTypeFilter, setPipelineTypeFilter] = useState<string>('ALL');
  const [filterSite, setFilterSite] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFlowId, setSelectedFlowId] = useState<string>(flows[0]?.id || '');
  const [viewMode, setViewMode] = useState<'FOCUS_FEED' | 'KANBAN' | 'TIMELINE' | 'MATRIX'>('MATRIX');
  const [matrixPage, setMatrixPage] = useState<number>(1);
  const [matrixPageSize, setMatrixPageSize] = useState<number>(25);
  const [matrixSelectedIds, setMatrixSelectedIds] = useState<string[]>([]);
  const [cardFilter, setCardFilter] = useState<'ALL' | 'PENDING' | 'COMPLETED' | 'DELAYED' | 'AWAITING_ME'>('ALL');

  // Stage display filter: User should see only his stage by default!
  const [stageFilterMode, setStageFilterMode] = useState<'MY_STAGES' | 'ALL_STAGES'>('MY_STAGES');

  useEffect(() => {
    setStageFilterMode(viewScope === 'USER_ONLY' ? 'MY_STAGES' : 'ALL_STAGES');
  }, [viewScope]);

  // Helper to check if a specific stage definition belongs to currentUser
  const isMyStage = (def: FmsStageDefinition, stageExec?: FmsStageExecution): boolean => {
    return isUserResponsibleForStage(def, stageExec, currentUser);
  };

  // Check if an entire FMS instance has action required right now by currentUser
  const isMyFlowAction = (flow: FmsInstance): boolean => {
    return isFlowAwaitingUserAction(flow, currentUser);
  };

  const myFlowsCount = flows.filter(isMyFlowAction).length;

  const filteredFlows = flows.filter((f) => {
    // 0. Domain Filter
    if (domainFilter !== 'ALL') {
      const cat = getFmsDomainCategory(f.flowType);
      if (cat.domainKey !== domainFilter) return false;
    }
    // Sub-pipeline filter if selected
    if (pipelineTypeFilter !== 'ALL' && f.flowType !== pipelineTypeFilter) {
      return false;
    }
    // 1. Requisitions filter
    if (viewScope === 'USER_ONLY' && !isMyFlowAction(f)) {
      return false;
    }
    // 2. Site Filter
    if (filterSite !== 'ALL' && f.siteName !== filterSite) return false;
    // 3. Priority Filter
    if (filterPriority !== 'ALL' && f.priority !== filterPriority) return false;
    // 4. Search Filter
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchNo = f.indentNo?.toLowerCase().includes(q) || false;
      const matchReq = f.requisitionNumber?.toLowerCase().includes(q) || false;
      const matchPo = f.poNumber?.toLowerCase().includes(q) || false;
      const matchVendor = f.vendorName?.toLowerCase().includes(q) || false;
      const matchSite = f.siteName?.toLowerCase().includes(q) || false;
      const matchFlow = f.flowId?.toLowerCase().includes(q) || false;
      const matchMachine = f.machineName?.toLowerCase().includes(q) || f.machineIdNo?.toLowerCase().includes(q) || f.machineMakeModel?.toLowerCase().includes(q) || false;
      const matchPart = f.partSerialNo?.toLowerCase().includes(q) || f.partEquipmentName?.toLowerCase().includes(q) || f.vehiclePlantMachineName?.toLowerCase().includes(q) || false;
      if (!matchNo && !matchReq && !matchPo && !matchVendor && !matchSite && !matchFlow && !matchMachine && matchPart === false) return false;
    }
    // 5. Card Filter
    if (cardFilter === 'PENDING' && f.status !== 'In Progress') return false;
    if (cardFilter === 'COMPLETED' && f.status !== 'Completed') return false;
    if (cardFilter === 'DELAYED' && !(f.totalDelayHours > 0 || f.stages.some(s => s.status === 'Delayed'))) return false;
    if (cardFilter === 'AWAITING_ME' && !isMyFlowAction(f)) return false;
    return true;
  });

  const activeFlow = flows.find((f) => f.id === selectedFlowId) || filteredFlows[0] || flows[0];

  const activeStageDefs = activeFlow?.flowType === 'CHECK_STOCK'
    ? FMS_CHECK_STOCK_STAGES
    : activeFlow?.flowType === 'PO_TO_PAYMENT' 
    ? FMS_PO_PAYMENT_STAGES 
    : activeFlow?.flowType === 'PURCHASE_TO_STORE_DISPATCH'
    ? FMS_PURCHASE_TO_STORE_DISPATCH_STAGES
    : activeFlow?.flowType === 'STORE_TO_SITE_DISPATCH'
    ? FMS_STORE_TO_SITE_DISPATCH_STAGES
    : activeFlow?.flowType === 'PAYMENT_TO_DISPATCH'
    ? FMS_PAYMENT_TO_DISPATCH_STAGES
    : activeFlow?.flowType === 'SITE_RECEIVE'
    ? FMS_SITE_RECEIVE_STAGES
    : activeFlow?.flowType === 'ACCOUNTS_INVOICE_COLLECTION'
    ? FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES
    : activeFlow?.flowType === 'HR_ATTENDANCE_PAYMENT'
    ? FMS_HR_ATTENDANCE_PAYMENT_STAGES
    : activeFlow?.flowType === 'BREAKDOWN_REPORTING'
    ? FMS_BREAKDOWN_REPORTING_STAGES
    : activeFlow?.flowType === 'EQUIPMENT_PART_REPAIR'
    ? FMS_EQUIPMENT_PART_REPAIR_STAGES
    : activeFlow?.flowType === 'DPR_REPORTING'
    ? FMS_DPR_REPORTING_STAGES
    : FMS_STANDARD_PURCHASE_STAGES;

  // Calculate user's stages count for activeFlow
  const myStagesInFlow = activeStageDefs.map((def, idx) => ({
    def,
    idx,
    exec: activeFlow?.stages[idx],
    isMine: isMyStage(def, activeFlow?.stages[idx]),
  })).filter((s) => s.isMine);

  // Stages to render based on stageFilterMode
  const stagesToRender = activeStageDefs.map((def, idx) => ({
    def,
    idx,
    exec: activeFlow?.stages[idx],
    isMine: isMyStage(def, activeFlow?.stages[idx]),
  })).filter((item) => {
    if (stageFilterMode === 'MY_STAGES') {
      return item.isMine;
    }
    return true;
  });

  const handleAdvanceCurrentStage = (flow: FmsInstance, decision?: 'Yes' | 'No') => {
    const updatedStages = [...flow.stages];
    const currentIndex = flow.currentStageIndex;
    const currentStage = updatedStages[currentIndex];

    if (!currentStage) return;

    const now = new Date().toLocaleString('en-GB');
    currentStage.status = 'Done';
    currentStage.actualDateTime = now;
    if (decision) {
      currentStage.decisionValue = decision;
    }

    let nextIndex = currentIndex + 1;

    // Checkpoint branching rules:
    if (flow.flowType === 'CHECK_STOCK') {
      // 1. Stage 2: IS MATERIAL PURCHASE REQUIRED?
      if (currentStage.stageId === 'STG-STK-02') {
        if (decision === 'No') {
          // Material in stock! Skip Stage 3 & Stage 4
          if (updatedStages[2]) {
            updatedStages[2].status = 'Skipped';
            updatedStages[2].notes = 'Skipped: Stock available in store, no purchase needed';
          }
          if (updatedStages[3]) {
            updatedStages[3].status = 'Skipped';
            updatedStages[3].notes = 'Skipped: Stock available in store, no purchase needed';
          }
          nextIndex = 4; // Jump directly to Stage 5: DISPATCH MATERIAL AVAILABLE
        } else if (decision === 'Yes') {
          nextIndex = 2; // Proceed to Stage 3: SEND INDENT FOR MATERIAL TO BE PURCHASED
        }
      }

      // 2. Stage 4: IS PARTIAL PURCHASE REQUIRED?
      if (currentStage.stageId === 'STG-STK-04') {
        if (decision === 'Yes') {
          nextIndex = 4; // Proceed to Stage 5: DISPATCH MATERIAL AVAILABLE
        } else if (decision === 'No') {
          // Zero available in store; 100% full purchase needed from vendor
          if (updatedStages[4]) {
            updatedStages[4].status = 'Skipped';
            updatedStages[4].notes = 'Skipped: Full purchase required from vendor';
          }
          nextIndex = 5;
        }
      }
    } else if (flow.flowType === 'PO_TO_PAYMENT') {
      // 1. Stage 1: IS PAYMENT TO BE DONE FROM ACCOUNT?
      if (currentStage.stageId === 'STG-PAY-01') {
        if (decision === 'Yes') {
          // Bank Account Path: Skip UPI stages (indexes 10, 11, 12, 13)
          [10, 11, 12, 13].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: Paid via Bank Account route';
            }
          });
          nextIndex = 1; // Stage 2: IS ACCOUNT ALREADY ADDED?
        } else if (decision === 'No') {
          // UPI Path: Skip Bank Account stages (indexes 1 to 9)
          for (let i = 1; i <= 9; i++) {
            if (updatedStages[i]) {
              updatedStages[i].status = 'Skipped';
              updatedStages[i].notes = 'Skipped: Routed via UPI QR code payment';
            }
          }
          nextIndex = 10; // Jump to Stage 11: PAYMENT APPROVAL FORM (UPI)
        }
      }

      // 2. Stage 2: IS ACCOUNT ALREADY ADDED?
      if (currentStage.stageId === 'STG-PAY-02') {
        if (decision === 'Yes') {
          // Account already added: Skip Beneficiary stages 3 to 6 (indexes 2, 3, 4, 5)
          for (let i = 2; i <= 5; i++) {
            if (updatedStages[i]) {
              updatedStages[i].status = 'Skipped';
              updatedStages[i].notes = 'Skipped: Account already verified in internet banking';
            }
          }
          nextIndex = 6; // Jump directly to Stage 7: PAYMENT APPROVAL FORM
        } else if (decision === 'No') {
          nextIndex = 2; // Proceed to Stage 3: GET CANCELLED CHEQUE/PASSBOOK COPY
        }
      }

      // 3. Stage 10: GET ONLINE PAYMENT APPROVAL / PAYMENT DONE (End of Bank Route)
      if (currentStage.stageId === 'STG-PAY-10') {
        nextIndex = 14; // Jump to Final Stage 15: SEND PAYMENT DETAILS TO GET MATERIAL
      }

      // 4. Stage 14: MAKE PAYMENT (End of UPI Route)
      if (currentStage.stageId === 'STG-PAY-14') {
        nextIndex = 14; // Jump to Final Stage 15: SEND PAYMENT DETAILS TO GET MATERIAL
      }
    } else if (flow.flowType === 'STORE_TO_SITE_DISPATCH') {
      // Stage 4: IS E-WAY REQUIRED?
      if (currentStage.stageId === 'STG-SSD-04') {
        if (decision === 'No') {
          // E-Way Bill Not Required: Skip Stage 5 (SEND CHALLAN) and Stage 6 (GET E-WAY BILL)
          [4, 5].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: E-Way Bill not required for this consignment';
            }
          });
          nextIndex = 6; // Jump directly to Stage 7: LOAD MATERIAL TO BE DISPATCHED
        } else if (decision === 'Yes') {
          nextIndex = 4; // Proceed to Stage 5: SEND STOCK TRANSFER NOTE/DELIVERY CHALLAN FOR E-WAY BILL
        }
      }
    } else if (flow.flowType === 'PURCHASE_TO_STORE_DISPATCH') {
      // Stage 5: IS E-WAY BILL REQUIRED?
      if (currentStage.stageId === 'STG-PSD-05') {
        if (decision === 'No') {
          // E-Way Bill Not Required: Skip Stage 6 (SEND CHALLAN) and Stage 7 (GET E-WAY BILL)
          [5, 6].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: E-Way Bill not required for this consignment';
            }
          });
          nextIndex = 7; // Jump directly to Stage 8: LOAD MATERIAL FOR DISPATCH
        } else if (decision === 'Yes') {
          nextIndex = 5; // Proceed to Stage 6: SEND DELIVERY CHALLAN/STOCK TRANSFER NOTE FOR E-WAY BILL
        }
      }
    } else if (flow.flowType === 'PAYMENT_TO_DISPATCH') {
      // 1. Stage 3: IS MATERIAL ACCEPTABLE ?
      if (currentStage.stageId === 'STG-DISP-03') {
        if (decision === 'Yes') {
          // Acceptable: Skip Return, Is Replaced, and Refund (Stages 4, 5, 6)
          [3, 4, 5].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: Material accepted as per PO specifications';
            }
          });
          nextIndex = 6; // Jump directly to Stage 7: DISPATCH MATERIAL
        } else if (decision === 'No') {
          nextIndex = 3; // Proceed to Stage 4: RETURN / REPLACE MATERIAL
        }
      }

      // 2. Stage 5: IS MATERIAL REPLACED ?
      if (currentStage.stageId === 'STG-DISP-05') {
        if (decision === 'Yes') {
          if (updatedStages[5]) {
            updatedStages[5].status = 'Skipped';
            updatedStages[5].notes = 'Skipped: Material successfully replaced by vendor';
          }
          nextIndex = 6; // Jump directly to Stage 7: DISPATCH MATERIAL
        } else if (decision === 'No') {
          nextIndex = 5; // Proceed to Stage 6: GET REFUND / CREDIT NOTES
        }
      }
    } else if (flow.flowType === 'SITE_RECEIVE') {
      // 1. Stage 3: ARE THERE ANY DISCREPANCY OBSERVED ?
      if (currentStage.stageId === 'STG-REC-03') {
        if (decision === 'No') {
          // No discrepancy observed: Skip Stage 4 (INFORM CSR STORE & GET IT RECTIFIED)
          if (updatedStages[3]) {
            updatedStages[3].status = 'Skipped';
            updatedStages[3].notes = 'Skipped: No discrepancy observed in consignment';
          }
          nextIndex = 4; // Jump directly to Stage 5: IS MATERIAL ACCEPTABLE ?
        } else if (decision === 'Yes') {
          nextIndex = 3; // Proceed to Stage 4: INFORM CSR STORE & GET IT RECTIFIED
        }
      }

      // 2. Stage 5: IS MATERIAL ACCEPTABLE ?
      if (currentStage.stageId === 'STG-REC-05') {
        if (decision === 'Yes') {
          // Material acceptable: Skip Stage 6 (RETURN MATERIAL TO REPAIRE STORE)
          if (updatedStages[5]) {
            updatedStages[5].status = 'Skipped';
            updatedStages[5].notes = 'Skipped: Material verified in acceptable condition';
          }
          nextIndex = 6; // Jump directly to Stage 7: GET MATERIAL VERIFIED
        } else if (decision === 'No') {
          nextIndex = 5; // Proceed to Stage 6: RETURN MATERIAL TO REPAIRE STORE
        }
      }

      // 3. Stage 9: IS MATERIAL INWARD FORM FILLED ?
      if (currentStage.stageId === 'STG-REC-09') {
        nextIndex = 9; // Proceed to Stage 10: FILL GOOGLE FORM FOR MATERIAL INWARD
      }
    } else if (flow.flowType === 'ACCOUNTS_INVOICE_COLLECTION') {
      // Stage 3: IS INVOICE ACCEPTABLE?
      if (currentStage.stageId === 'STG-INV-03') {
        if (decision === 'Yes') {
          // Acceptable: Skip Stage 4 (GET INVOICE RECTIFIED)
          if (updatedStages[3]) {
            updatedStages[3].status = 'Skipped';
            updatedStages[3].notes = 'Skipped: Invoice verified acceptable without rectification';
          }
          nextIndex = 4; // Jump directly to Stage 5: GET INVOICE APPROVAL
        } else if (decision === 'No') {
          nextIndex = 3; // Proceed to Stage 4: GET INVOICE RECTIFIED
        }
      }
    } else if (flow.flowType === 'HR_ATTENDANCE_PAYMENT') {
      // Stage 3: CHECK FOR OT IF ANY ?
      if (currentStage.stageId === 'STG-HR-03') {
        if (decision === 'No') {
          // No Overtime: Skip Stage 4 (PREPARE OT SHEET) and Stage 5 (GET APPROVAL OT SHEET)
          [3, 4].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: No overtime (OT) logged for this attendance cycle';
            }
          });
          nextIndex = 5; // Jump directly to Stage 6: PREPARE ATTENDANCE & PAYMENT SHEET
        } else if (decision === 'Yes') {
          nextIndex = 3; // Proceed to Stage 4: PREPARE OT SHEET
        }
      }
    } else if (flow.flowType === 'BREAKDOWN_REPORTING') {
      // 1. Stage 2: IS SERVICE ENGINEER REQUIRED?
      if (currentStage.stageId === 'STG-BRK-02') {
        if (decision === 'No') {
          // Service engineer not required: Skip Stage 3 (CALL SERVICE ENGINEER)
          if (updatedStages[2]) {
            updatedStages[2].status = 'Skipped';
            updatedStages[2].notes = 'Skipped: Service engineer visit not required';
          }
          nextIndex = 3; // Jump directly to Stage 4: PREPARE DETAILED DEFECT ANALYSIS REPORT
        } else if (decision === 'Yes') {
          nextIndex = 2; // Proceed to Stage 3: CALL SERVICE ENGINEER
        }
      }

      // 2. Stage 5: CAN DEFECTIVE PART/MACHINE/PLANT/VEHICLE BE REPAIRED AT SITE?
      if (currentStage.stageId === 'STG-BRK-05') {
        if (decision === 'Yes') {
          nextIndex = 5; // Proceed to Stage 6: SEND PARTS INDENT ALONG WITH SAMPLE
        } else if (decision === 'No') {
          // Cannot be repaired at site: Skip site parts indent & site repair (Stages 6, 7, 8)
          [5, 6, 7].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: Sent for offsite workshop repair';
            }
          });
          nextIndex = 8; // Jump directly to Stage 9: SEND MACHINE/PLANT/VEHICLE DEFECTIVE PART FOR REPAIR
        }
      }

      // 3. Stage 8: REPAIR MACHINE (Site Repair Complete)
      if (currentStage.stageId === 'STG-BRK-08') {
        // Skip offsite workshop repair stages 9, 10, 11, 12
        [8, 9, 10, 11].forEach((idx) => {
          if (updatedStages[idx]) {
            updatedStages[idx].status = 'Skipped';
            updatedStages[idx].notes = 'Skipped: Machine successfully repaired at site';
          }
        });
        nextIndex = 12; // Jump directly to Stage 13: TRIAL RUN FOR 2 HOURS
      }

      // 4. Stage 12: GET MACHINE REPAIR (External Workshop Complete)
      if (currentStage.stageId === 'STG-BRK-12') {
        nextIndex = 12; // Proceed to Stage 13: TRIAL RUN FOR 2 HOURS
      }
    } else if (flow.flowType === 'EQUIPMENT_PART_REPAIR') {
      // 1. Stage 3: IS PART/EQUIPMENT UNDER WARRANTY?
      if (currentStage.stageId === 'STG-EQP-03') {
        if (decision === 'No') {
          // Out of Warranty: Skip Stage 4 (SEND PART/EQUIPMENT TO AUTHORIZED SERVICE CENTER)
          if (updatedStages[3]) {
            updatedStages[3].status = 'Skipped';
            updatedStages[3].notes = 'Skipped: Out of warranty - proceed to paid repair approval';
          }
          nextIndex = 4; // Jump directly to Stage 5: GET APPROVAL FOR REPAIR
        } else if (decision === 'Yes') {
          nextIndex = 3; // Proceed to Stage 4: SEND PART/EQUIPMENT TO AUTHORIZED SERVICE CENTER
        }
      }

      // 2. Stage 12: IS TRIAL RUN SUCCESSFUL?
      if (currentStage.stageId === 'STG-EQP-12') {
        if (decision === 'Yes') {
          nextIndex = 12; // Proceed to Stage 13: ARE ADDITIONAL CHARGES TO BE INCURRED?
        } else if (decision === 'No') {
          nextIndex = 14; // Re-send for repair rework (Stage 15)
        }
      }

      // 3. Stage 13: ARE ADDITIONAL CHARGES TO BE INCURRED?
      if (currentStage.stageId === 'STG-EQP-13') {
        if (decision === 'No') {
          // No additional charges: Skip Stage 14 (GET APPROVAL), 15 (SEND FOR REPAIR), 16 (TRIAL RUN)
          [13, 14, 15].forEach((idx) => {
            if (updatedStages[idx]) {
              updatedStages[idx].status = 'Skipped';
              updatedStages[idx].notes = 'Skipped: No additional charges incurred';
            }
          });
          nextIndex = 16; // Jump directly to Stage 17: RECEIVE PART/EQUIPMENT IN STORE
        } else if (decision === 'Yes') {
          nextIndex = 13; // Proceed to Stage 14: GET APPROVAL
        }
      }
    } else if (flow.flowType === 'DPR_REPORTING') {
      // Standard sequential progression for DPR (Stages 1 through 6)
      nextIndex = flow.currentStageIndex + 1;
    } else {
      // INDENT_PURCHASE Rules:
      if (currentStage.stageId === 'STG-02' && decision === 'No') {
        if (updatedStages[2]) {
          updatedStages[2].status = 'Skipped';
          updatedStages[2].notes = 'Skipped: No degraded materials returned';
          nextIndex = 3;
        }
      }

      if (currentStage.stageId === 'STG-06' && decision === 'No') {
        if (updatedStages[6]) {
          updatedStages[6].status = 'Skipped';
          updatedStages[6].notes = 'Skipped: Single OEM quotation sufficient';
          nextIndex = 7;
        }
      }

      if (currentStage.stageId === 'STG-10' && decision === 'No') {
        if (updatedStages[10]) {
          updatedStages[10].status = 'Skipped';
          updatedStages[10].notes = 'Skipped: No advance payment required';
          nextIndex = 11; // Skips Stage 11 (SEND FOR PAYMENT) and jumps directly to Stage 12 (MATERIAL COLLECTION PO)
        }
      }
    }

    const isComplete = nextIndex >= updatedStages.length;
    const nextStageId = isComplete ? 'COMPLETED' : updatedStages[nextIndex]?.stageId || 'COMPLETED';

    if (!isComplete && updatedStages[nextIndex]) {
      updatedStages[nextIndex].status = 'In Progress';
      if (!updatedStages[nextIndex].plannedDateTime) {
        const def = activeStageDefs.find((s) => s.stageId === updatedStages[nextIndex].stageId);
        const sla = def?.slaHours || 2;
        const targetDate = new Date();
        targetDate.setHours(targetDate.getHours() + sla);
        updatedStages[nextIndex].plannedDateTime = targetDate.toLocaleString('en-GB');
      }
    }

    const updatedFlow: FmsInstance = {
      ...flow,
      currentStageIndex: isComplete ? updatedStages.length : nextIndex,
      currentStageId: nextStageId,
      status: isComplete ? 'Completed' : 'In Progress',
      updatedAt: now,
      stages: updatedStages,
    };

    onUpdateFlow(updatedFlow);
  };

  const currentStageDef = activeStageDefs[activeFlow?.currentStageIndex] || activeStageDefs[0];
  const isCurrentStageWaitingForMe = activeFlow 
    ? isMyStage(currentStageDef, activeFlow.stages[activeFlow.currentStageIndex])
    : false;

  // KPI Calculations
  const statsPending = flows.filter(f => f.status === 'In Progress').length;
  const statsCompleted = flows.filter(f => f.status === 'Completed').length;
  const statsDelayed = flows.filter(f => f.totalDelayHours > 0 || f.stages.some(s => s.status === 'Delayed')).length;
  const statsAwaitingMe = flows.filter(isMyFlowAction).length;

  return (
    <div className="space-y-6">
      {/* KPI Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Pending */}
        <div 
          onClick={() => setCardFilter(cardFilter === 'PENDING' ? 'ALL' : 'PENDING')}
          title="Click to filter by Pending status"
          className={`p-4 bg-white rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs ${
            cardFilter === 'PENDING' ? 'border-indigo-500 bg-indigo-50/10 ring-1 ring-indigo-500/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Pending</span>
            <Clock className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-slate-900">{statsPending}</span>
            <span className="text-[10px] text-slate-400 font-bold">In-Progress Flows</span>
          </div>
        </div>

        {/* Total Completed */}
        <div 
          onClick={() => setCardFilter(cardFilter === 'COMPLETED' ? 'ALL' : 'COMPLETED')}
          title="Click to filter by Completed status"
          className={`p-4 bg-white rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs ${
            cardFilter === 'COMPLETED' ? 'border-emerald-500 bg-emerald-50/10 ring-1 ring-emerald-500/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Total Completed</span>
            <CheckCircle2 className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-emerald-600">{statsCompleted}</span>
            <span className="text-[10px] text-emerald-500/80 font-bold">Closed Workflows</span>
          </div>
        </div>

        {/* Total Delayed */}
        <div 
          onClick={() => setCardFilter(cardFilter === 'DELAYED' ? 'ALL' : 'DELAYED')}
          title="Click to filter by Delayed status"
          className={`p-4 bg-white rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs ${
            cardFilter === 'DELAYED' ? 'border-amber-500 bg-amber-50/10 ring-1 ring-amber-500/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-600 uppercase tracking-wider">Total Delayed</span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-amber-600">{statsDelayed}</span>
            <span className="text-[10px] text-amber-500/80 font-bold">SLA Overdue</span>
          </div>
        </div>

        {/* My Active Actions */}
        <div 
          onClick={() => setCardFilter(cardFilter === 'AWAITING_ME' ? 'ALL' : 'AWAITING_ME')}
          title="Click to filter by actions on your desk"
          className={`p-4 bg-white rounded-xl border cursor-pointer transition-all hover:scale-[1.01] hover:shadow-xs ${
            cardFilter === 'AWAITING_ME' ? 'border-indigo-500 bg-indigo-50/10 ring-1 ring-indigo-500/20' : 'border-slate-200'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">My Actions</span>
            <UserCheck className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-2xl font-black text-indigo-600">{statsAwaitingMe}</span>
            <span className="text-[10px] text-indigo-500 font-bold">Awaiting Me</span>
          </div>
        </div>
      </div>

      {/* Top action & filter bar */}
      <div className="space-y-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4">
          {/* Left side: Search & unboxed filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search Indent / PO / Vendor..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-300 rounded-lg w-48 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            {/* Site Filter */}
            <div className="flex items-center gap-1 bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/80">
              <Filter className="w-3.5 h-3.5 text-slate-500" />
              <select
                aria-label="Filter by site"
                value={filterSite}
                onChange={(e) => setFilterSite(e.target.value)}
                className="text-xs bg-transparent border-none text-slate-700 font-bold hover:text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Sites</option>
                <option value="SILADEHI">SILADEHI</option>
                <option value="BIJETALA">BIJETALA</option>
                <option value="RAIPUR">RAIPUR</option>
              </select>
            </div>

            {/* Relocated All Hubs Dropdown next to Site Filter */}
            <div className="flex items-center bg-slate-100 px-2.5 py-1.5 rounded-lg border border-slate-200/80 gap-2">
              <Layers className="w-3.5 h-3.5 text-slate-500" />
              <select
                value={domainFilter}
                onChange={(e) => {
                  const val = e.target.value as any;
                  setDomainFilter(val);
                  setPipelineTypeFilter('ALL');
                }}
                title="Filter by Hub / Department"
                className="text-xs font-bold bg-transparent border-none text-slate-700 hover:text-slate-900 focus:outline-none cursor-pointer"
              >
                <option value="ALL">All Hubs ({flows.length})</option>
                <option value="PROCUREMENT">Procurement</option>
                <option value="FINANCE_ACCOUNTS">Accounts &amp; Finance</option>
                <option value="SITE_LOGISTICS">Site Logistics</option>
                <option value="HR_EQUIPMENT">Plant &amp; Operations</option>
              </select>
            </div>
          </div>

          {/* Right side: View toggles & Relocated Action button */}
          <div className="flex items-center justify-between sm:justify-end gap-3">
            {/* View Mode Toggle Buttons */}
            <div className="flex items-center bg-slate-100 p-0.5 rounded-lg border border-slate-200 shadow-2xs">
              <button
                onClick={() => setViewMode('FOCUS_FEED')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'FOCUS_FEED'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Standard Cards"
              >
                <Zap className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('MATRIX')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'MATRIX'
                    ? 'bg-white text-indigo-700 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Enterprise Matrix (1000+)"
              >
                <Table className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('KANBAN')}
                className={`p-1.5 rounded transition-all ${
                  viewMode === 'KANBAN'
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
                title="Operations Kanban"
              >
                <ClipboardList className="w-4 h-4" />
              </button>
            </div>

            {/* Relocated New FMS Workflow Button right next to view switchers */}
            <button
              onClick={onCreateFlow}
              className="flex items-center justify-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ New FMS Workflow</span>
            </button>
          </div>
        </div>
      </div>

      {/* ENTERPRISE MATRIX VIEW (1,000+ Scale Paginated High-Density Grid) */}
      {viewMode === 'MATRIX' && (() => {
        const totalFlows = filteredFlows.length;
        const totalPages = Math.max(1, Math.ceil(totalFlows / matrixPageSize));
        const validPage = Math.min(matrixPage, totalPages);
        const startIndex = (validPage - 1) * matrixPageSize;
        const paginatedFlows = filteredFlows.slice(startIndex, startIndex + matrixPageSize);

        const handleSelectAllMatrix = () => {
          if (matrixSelectedIds.length === paginatedFlows.length && paginatedFlows.length > 0) {
            setMatrixSelectedIds([]);
          } else {
            setMatrixSelectedIds(paginatedFlows.map(f => f.id));
          }
        };

        const handleToggleMatrixId = (id: string) => {
          setMatrixSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
        };

        const handleBatchAdvanceMatrix = () => {
          paginatedFlows.forEach(flow => {
            if (matrixSelectedIds.includes(flow.id)) {
              handleAdvanceCurrentStage(flow);
            }
          });
          setMatrixSelectedIds([]);
        };

        return (
          <div className="space-y-4">
            {/* Batch Action Floating Bar */}
            {matrixSelectedIds.length > 0 && (
              <div className="bg-indigo-950 text-white p-3 px-4 rounded-xl shadow-lg border border-indigo-700/50 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center gap-2 text-xs font-bold">
                  <CheckSquare className="w-4 h-4 text-indigo-300" />
                  <span>{matrixSelectedIds.length} Requisitions Checked for Batch Action</span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleBatchAdvanceMatrix}
                    className="px-3.5 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold flex items-center gap-1 shadow-sm transition-colors"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Mass Advance Checked ({matrixSelectedIds.length})
                  </button>
                  <button
                    onClick={() => setMatrixSelectedIds([])}
                    className="px-2.5 py-1.5 bg-white/10 hover:bg-white/20 text-white rounded-lg text-xs font-semibold"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                    <tr>
                      <th className="py-2.5 px-3 w-8 text-center">
                        <input
                          type="checkbox"
                          checked={matrixSelectedIds.length === paginatedFlows.length && paginatedFlows.length > 0}
                          onChange={handleSelectAllMatrix}
                          className="rounded text-indigo-600 cursor-pointer"
                        />
                      </th>
                      <th className="py-2.5 px-3">Reference / Code</th>
                      <th className="py-2.5 px-3">Pipeline Type &amp; Site</th>
                      <th className="py-2.5 px-3">Active Stage &amp; Assignee</th>
                      <th className="py-2.5 px-3">Status</th>
                      <th className="py-2.5 px-3">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5 text-slate-500" />
                          <span>Planned Date/Time</span>
                        </span>
                      </th>
                      <th className="py-2.5 px-3">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span>Actual Date/Time</span>
                        </span>
                      </th>
                      <th className="py-2.5 px-3">
                        <span className="flex items-center gap-1">
                          <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
                          <span>Delay Variance</span>
                        </span>
                      </th>
                      <th className="py-2.5 px-4 text-right">Quick Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {paginatedFlows.length > 0 ? (
                      paginatedFlows.map((flow) => {
                        const isChecked = matrixSelectedIds.includes(flow.id);
                        const curStage = flow.stages[flow.currentStageIndex];
                        const refCode = flow.flowType === 'CHECK_STOCK'
                          ? (flow.requisitionNumber ? `Check Stock #${flow.requisitionNumber}` : `Stock Check #${flow.indentNo}`)
                          : flow.flowType === 'PO_TO_PAYMENT'
                          ? (flow.poNumber ? `PO #${flow.poNumber}` : `PO #${flow.indentNo}`)
                          : `Indent #${flow.indentNo}`;

                        const isCompleted = flow.status === 'Completed' || curStage?.status === 'Done';
                        const plannedStr = curStage?.plannedDateTime || `${flow.indentDate || '05/10/2026'} 11:00 AM`;
                        const actualStr = curStage?.actualDateTime || (isCompleted ? '05/10/2026 12:00 PM' : '—');
                        const delayHrs = curStage?.delayHours || flow.totalDelayHours || (curStage?.status === 'Delayed' ? 18 : 0);

                        return (
                          <tr key={flow.id} className={`hover:bg-slate-50 transition-colors ${isChecked ? 'bg-indigo-50/50' : ''}`}>
                            <td className="py-2.5 px-3 text-center">
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleMatrixId(flow.id)}
                                className="rounded text-indigo-600 cursor-pointer"
                              />
                            </td>
                            <td className="py-2.5 px-3 font-mono font-bold text-slate-900 whitespace-nowrap">
                              {refCode}
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 block w-max">
                                {flow.flowType.replace(/_/g, ' ')}
                              </span>
                              <span className="text-[11px] text-slate-500 font-medium">{flow.siteName}</span>
                            </td>
                            <td className="py-2.5 px-3">
                              <div className="font-semibold text-slate-900 truncate max-w-[180px]">
                                Stg {flow.currentStageIndex + 1}: {curStage?.stageName || 'Completed'}
                              </div>
                              <span className="text-[10px] text-slate-500 font-mono">Assignee: {curStage?.assignee || 'System'}</span>
                            </td>
                            <td className="py-2.5 px-3 whitespace-nowrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                flow.status === 'Completed' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                              }`}>
                                {flow.status}
                              </span>
                            </td>
                            <td className="py-2.5 px-3 font-mono text-slate-800 whitespace-nowrap">
                              {plannedStr}
                            </td>
                            {/* Actual Date/Time - styled normally */}
                            <td className="py-2.5 px-3 font-mono text-slate-700 whitespace-nowrap">
                              {actualStr}
                            </td>
                            {/* Delay Variance - show ONLY precision duration if delayed, with body highlights */}
                            {(() => {
                              const calculatedDelayHrs = getDelayHours(plannedStr, curStage?.actualDateTime, isCompleted);
                              const isDelayActive = calculatedDelayHrs > 0;
                              const delayText = formatDelayVariance(calculatedDelayHrs);

                              return (
                                <td className={`py-2.5 px-3 font-mono whitespace-nowrap text-xs font-bold ${
                                  isDelayActive
                                    ? isCompleted
                                      ? 'bg-red-100 text-red-800 border border-red-200 rounded'
                                      : 'bg-yellow-100 text-yellow-800 border border-yellow-200 rounded'
                                    : 'text-slate-400'
                                }`}>
                                  {delayText}
                                </td>
                              );
                            })()}
                            <td className="py-2.5 px-4 text-right whitespace-nowrap">
                              <div className="flex items-center justify-end gap-1.5">
                                {flow.status !== 'Completed' && (
                                  <button
                                    onClick={() => handleAdvanceCurrentStage(flow)}
                                    className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold rounded text-[11px] transition-colors"
                                  >
                                    Mark Done
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setSelectedFlowId(flow.id);
                                    setViewMode('FOCUS_FEED');
                                  }}
                                  className="p-1.5 hover:bg-slate-100 rounded-lg text-slate-500 hover:text-indigo-600 transition-colors"
                                  title="Inspect Requisition Details"
                                >
                                  <Eye className="w-4 h-4" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={9} className="py-12 text-center text-slate-500 text-xs">
                          No requisitions found matching current filter.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination Bar */}
              <div className="p-3 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3 text-xs text-slate-600">
                <div className="flex items-center gap-4">
                  {/* Relocated Rows per page dropdown */}
                  <div className="flex items-center gap-1.5">
                    <span className="text-slate-500 font-medium">Rows:</span>
                    <select
                      value={matrixPageSize}
                      onChange={(e) => {
                        setMatrixPageSize(Number(e.target.value));
                        setMatrixPage(1);
                      }}
                      className="px-2 py-0.5 font-bold bg-white border border-slate-300 rounded text-xs focus:ring-1 focus:ring-indigo-500"
                    >
                      <option value={10}>10</option>
                      <option value={25}>25</option>
                      <option value={50}>50</option>
                      <option value={100}>100</option>
                    </select>
                  </div>

                  <div>
                    Showing <span className="font-bold text-slate-900">{totalFlows > 0 ? startIndex + 1 : 0}</span> to{' '}
                    <span className="font-bold text-slate-900">{Math.min(startIndex + matrixPageSize, totalFlows)}</span> of{' '}
                    <span className="font-bold text-slate-900">{totalFlows}</span> Requisitions
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    disabled={validPage <= 1}
                    onClick={() => setMatrixPage((p) => Math.max(1, p - 1))}
                    className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-semibold"
                  >
                    ← Previous
                  </button>
                  <span className="px-2 font-mono font-bold text-slate-800">
                    Page {validPage} of {totalPages}
                  </span>
                  <button
                    disabled={validPage >= totalPages}
                    onClick={() => setMatrixPage((p) => Math.min(totalPages, p + 1))}
                    className="px-3 py-1 bg-white border border-slate-300 rounded hover:bg-slate-100 disabled:opacity-40 font-semibold"
                  >
                    Next →
                  </button>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* OPERATIONS KANBAN BOARD VIEW */}
      {viewMode === 'KANBAN' && (() => {
        const pendingCol = filteredFlows.filter(f => f.status !== 'Completed' && f.currentStageIndex === 0);
        const inProgressCol = filteredFlows.filter(f => f.status !== 'Completed' && f.currentStageIndex > 0 && f.priority !== 'Urgent');
        const bottleneckCol = filteredFlows.filter(f => f.status !== 'Completed' && (f.priority === 'Urgent' || f.totalDelayHours > 0));
        const completedCol = filteredFlows.filter(f => f.status === 'Completed');

        const renderKanbanCard = (flow: FmsInstance) => {
          const curStage = flow.stages[flow.currentStageIndex];
          const isPayment = flow.flowType === 'PO_TO_PAYMENT';
          const refCode = flow.flowType === 'CHECK_STOCK'
            ? (flow.requisitionNumber ? `Stock Check #${flow.requisitionNumber}` : `Stock Check #${flow.indentNo}`)
            : isPayment
            ? (flow.poNumber ? `PO #${flow.poNumber}` : `Accounts PO #${flow.indentNo}`)
            : `FMS #${flow.indentNo}`;

          return (
            <div key={flow.id} className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-2xs space-y-2 hover:border-indigo-300 transition-all">
              <div className="flex items-start justify-between gap-1">
                <span className="font-mono font-bold text-slate-900 text-xs">{refCode}</span>
                <span className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                  flow.priority === 'Urgent' ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {flow.siteName}
                </span>
              </div>

              <div className="text-xs font-semibold text-slate-800 line-clamp-1">
                {curStage?.stageName || 'Completed'}
              </div>

              <div className="text-[11px] text-slate-500 flex items-center justify-between pt-1 border-t border-slate-100">
                <span>Assignee: <strong className="text-slate-700">{curStage?.assignee || 'System'}</strong></span>
                <span className="text-[10px] font-mono text-indigo-600 font-bold">Stg {flow.currentStageIndex + 1}/{flow.totalStages}</span>
              </div>

              <div className="flex items-center justify-between pt-1">
                {flow.status !== 'Completed' && (
                  <button
                    onClick={() => handleAdvanceCurrentStage(flow)}
                    className="px-2 py-0.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold rounded text-[10px]"
                  >
                    Advance Step →
                  </button>
                )}
                <button
                  onClick={() => {
                    setSelectedFlowId(flow.id);
                    setViewMode('FOCUS_FEED');
                  }}
                  className="px-2 py-0.5 text-slate-500 hover:text-slate-800 rounded text-[10px] font-semibold"
                >
                  Detail
                </button>
              </div>
            </div>
          );
        };

        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Column 1: Initiated / Pending Start */}
            <div className="bg-slate-100/70 p-3 rounded-xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between font-bold text-xs text-slate-700 px-1">
                <span className="flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                  <span>Initiated / Stage 1</span>
                </span>
                <span className="px-2 py-0.5 bg-slate-200 text-slate-700 rounded-full font-mono font-bold text-[10px] shadow-2xs">{pendingCol.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {pendingCol.map(renderKanbanCard)}
                {pendingCol.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">No flows in Stage 1</div>}
              </div>
            </div>

            {/* Column 2: In Progress & Approvals */}
            <div className="bg-blue-50/50 p-3 rounded-xl border border-blue-200/60 space-y-3">
              <div className="flex items-center justify-between font-bold text-xs text-blue-900 px-1">
                <span className="flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                  <span>Active Progression</span>
                </span>
                <span className="px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full font-mono font-bold text-[10px] shadow-2xs">{inProgressCol.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {inProgressCol.map(renderKanbanCard)}
                {inProgressCol.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">No active progressing flows</div>}
              </div>
            </div>

            {/* Column 3: Delayed / Urgent Bottlenecks */}
            <div className="bg-amber-50/60 p-3 rounded-xl border border-amber-200/70 space-y-3">
              <div className="flex items-center justify-between font-bold text-xs text-amber-900 px-1">
                <span className="flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                  <span>Bottlenecks / Urgent</span>
                </span>
                <span className="px-2 py-0.5 bg-amber-100 text-amber-900 rounded-full font-mono font-bold text-[10px] shadow-2xs">{bottleneckCol.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {bottleneckCol.map(renderKanbanCard)}
                {bottleneckCol.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">No delayed bottlenecks</div>}
              </div>
            </div>

            {/* Column 4: Completed */}
            <div className="bg-emerald-50/50 p-3 rounded-xl border border-emerald-200/60 space-y-3">
              <div className="flex items-center justify-between font-bold text-xs text-emerald-900 px-1">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  <span>Completed Workflows</span>
                </span>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-mono font-bold text-[10px] shadow-2xs">{completedCol.length}</span>
              </div>
              <div className="space-y-2.5 max-h-[70vh] overflow-y-auto pr-1">
                {completedCol.map(renderKanbanCard)}
                {completedCol.length === 0 && <div className="p-4 text-center text-xs text-slate-400 italic">No completed flows yet</div>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* STANDARD CARD / FOCUS FEED VIEW (Default 2-Column Sidebar & Stage Stepper) */}
      {(viewMode === 'FOCUS_FEED' || viewMode === 'TIMELINE') && (
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Flow list sidebar */}
        <div className="lg:col-span-1 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500">
              {viewScope === 'USER_ONLY' ? 'My Action Queue' : 'Flows Queue'} ({filteredFlows.length})
            </h3>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              {pipelineTypeFilter === 'PO_TO_PAYMENT' ? 'Accounts Sheet' : pipelineTypeFilter === 'INDENT_PURCHASE' ? 'Purchase Sheet 1' : 'Multi-Dept'}
            </span>
          </div>

          <div className="space-y-2.5">
            {filteredFlows.length > 0 ? (
              filteredFlows.map((flow) => {
                const isSelected = flow.id === activeFlow?.id;
                const currentStage = flow.stages[flow.currentStageIndex];
                const currentStageName = currentStage?.stageName || 'Completed';
                const isMyCurrentStage = isMyFlowAction(flow);
                const isPaymentFlow = flow.flowType === 'PO_TO_PAYMENT';
                const isStockFlow = flow.flowType === 'CHECK_STOCK';
                const isReceiveFlow = flow.flowType === 'SITE_RECEIVE';
                const isStockToSiteFlow = flow.flowType === 'STORE_TO_SITE_DISPATCH';
                const isInvoiceFlow = flow.flowType === 'ACCOUNTS_INVOICE_COLLECTION';
                const isHrFlow = flow.flowType === 'HR_ATTENDANCE_PAYMENT';
                const isBreakdownFlow = flow.flowType === 'BREAKDOWN_REPORTING';
                const isEqpFlow = flow.flowType === 'EQUIPMENT_PART_REPAIR';
                const isDprFlow = flow.flowType === 'DPR_REPORTING';
                const isDispatchFlow = flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' || flow.flowType === 'PAYMENT_TO_DISPATCH' || flow.flowType === 'STORE_TO_SITE_DISPATCH';

                return (
                  <div
                    key={flow.id}
                    onClick={() => setSelectedFlowId(flow.id)}
                    className={`p-3.5 rounded-xl border text-left cursor-pointer transition-all ${
                      isSelected
                        ? isPaymentFlow 
                          ? 'bg-purple-50/70 border-purple-300 shadow-xs ring-1 ring-purple-400' 
                          : isStockFlow
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-xs ring-1 ring-emerald-400'
                          : isReceiveFlow
                          ? 'bg-blue-50/70 border-blue-300 shadow-xs ring-1 ring-blue-400'
                          : isStockToSiteFlow
                          ? 'bg-cyan-50/70 border-cyan-300 shadow-xs ring-1 ring-cyan-400'
                          : isInvoiceFlow
                          ? 'bg-indigo-50/70 border-indigo-300 shadow-xs ring-1 ring-indigo-400'
                          : isHrFlow
                          ? 'bg-teal-50/70 border-teal-300 shadow-xs ring-1 ring-teal-400'
                          : isBreakdownFlow
                          ? 'bg-orange-50/70 border-orange-300 shadow-xs ring-1 ring-orange-400'
                          : isEqpFlow
                          ? 'bg-blue-50/70 border-blue-300 shadow-xs ring-1 ring-blue-400'
                          : isDprFlow
                          ? 'bg-emerald-50/70 border-emerald-300 shadow-xs ring-1 ring-emerald-400'
                          : isDispatchFlow
                          ? 'bg-amber-50/70 border-amber-300 shadow-xs ring-1 ring-amber-400'
                          : 'bg-indigo-50/70 border-indigo-300 shadow-xs ring-1 ring-indigo-400'
                        : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-bold text-slate-900 text-sm">
                            {isPaymentFlow 
                              ? (flow.poNumber || `PO #${flow.indentNo}`) 
                              : isStockFlow 
                              ? (flow.requisitionNumber || `Stock Check #${flow.indentNo}`)
                              : isReceiveFlow
                              ? `Site Receive #${flow.requisitionNumber || flow.indentNo}`
                              : isStockToSiteFlow
                              ? `Stock Dispatch #${flow.requisitionNumber || flow.indentNo}`
                              : isInvoiceFlow
                              ? (flow.poNumber ? `Invoice #${flow.poNumber}` : `Invoice #${flow.indentNo}`)
                              : isHrFlow
                              ? `Labour Att #${flow.indentNo}`
                              : isBreakdownFlow
                              ? `Breakdown: ${flow.machineName || flow.indentNo}`
                              : isEqpFlow
                              ? `Part Repair: ${flow.partEquipmentName || flow.indentNo}`
                              : isDprFlow
                              ? `DPR: ${flow.dprDate || flow.indentNo}`
                              : isDispatchFlow
                              ? (flow.flowType === 'PURCHASE_TO_STORE_DISPATCH' ? `Dispatch Indent #${flow.indentNo}` : flow.poNumber ? `Dispatch PO #${flow.poNumber}` : `Dispatch #${flow.indentNo}`)
                              : `Indent #${flow.indentNo}`}
                          </span>
                          <span
                            className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              isPaymentFlow
                                ? 'bg-purple-100 text-purple-800'
                                : isStockFlow
                                ? 'bg-emerald-100 text-emerald-800'
                                : isReceiveFlow
                                ? 'bg-blue-100 text-blue-800'
                                : isStockToSiteFlow
                                ? 'bg-cyan-100 text-cyan-800'
                                : isInvoiceFlow
                                ? 'bg-indigo-100 text-indigo-800'
                                : isHrFlow
                                ? 'bg-teal-100 text-teal-800'
                                : isBreakdownFlow
                                ? 'bg-orange-100 text-orange-800'
                                : isEqpFlow
                                ? 'bg-blue-100 text-blue-800'
                                : isDprFlow
                                ? 'bg-emerald-100 text-emerald-800'
                                : isDispatchFlow
                                ? 'bg-amber-100 text-amber-800'
                                : 'bg-blue-100 text-blue-800'
                            }`}
                          >
                            {isPaymentFlow ? 'Accounts' : isStockFlow ? 'Store / Stock' : isReceiveFlow ? 'Site Receive' : isStockToSiteFlow ? 'Stock Dispatch' : isInvoiceFlow ? 'Invoice' : isHrFlow ? 'HR Muster' : isBreakdownFlow ? 'Breakdown' : isEqpFlow ? 'Part Repair' : isDprFlow ? 'DPR' : isDispatchFlow ? 'Store Dispatch' : 'Purchase'}
                          </span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-bold uppercase ${
                              flow.priority === 'Urgent'
                                ? 'bg-rose-100 text-rose-700'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {flow.priority}
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500 mt-1">
                          {isPaymentFlow || isInvoiceFlow ? (
                            <>
                              <span className="font-medium text-slate-700 truncate max-w-[120px]">{flow.vendorName || 'Vendor'}</span>
                              <span>•</span>
                              <span className={`font-semibold ${isInvoiceFlow ? 'text-indigo-700' : 'text-emerald-700'}`}>₹{flow.poAmount ? flow.poAmount.toLocaleString('en-IN') : '—'}</span>
                            </>
                          ) : isHrFlow ? (
                            <>
                              <span className="font-medium text-teal-800">{flow.totalLabourPresent || 0} Labours</span>
                              <span>•</span>
                              <span className="text-amber-700 font-semibold">{flow.totalOtHours || 0} hrs OT</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                            </>
                          ) : isBreakdownFlow ? (
                            <>
                              <span className="font-medium text-orange-800">{flow.machineIdNo || flow.machineName}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                            </>
                          ) : isEqpFlow ? (
                            <>
                              <span className="font-medium text-blue-800">{flow.partEquipmentName || flow.partSerialNo || 'Part'}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                            </>
                          ) : isDprFlow ? (
                            <>
                              <span className="font-medium text-emerald-800">{flow.dprPreparedBy || 'DPR'}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                            </>
                          ) : isReceiveFlow ? (
                            <>
                              <span className="font-medium text-blue-800">Req #{flow.requisitionNumber || flow.indentNo}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                            </>
                          ) : isDispatchFlow ? (
                            <>
                              <span className="font-medium text-slate-700 truncate max-w-[120px]">{flow.vendorName || 'Vendor'}</span>
                              <span>•</span>
                              <span className="flex items-center gap-0.5">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                            </>
                          ) : (
                            <>
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3 text-slate-400" />
                                {flow.siteName}
                              </span>
                              <span>•</span>
                              <span>{flow.indentDate}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-medium shrink-0 ${
                          flow.status === 'Completed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {flow.status}
                      </span>
                    </div>

                    <div className="mt-3 pt-2.5 border-t border-slate-200/60">
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="text-slate-500 font-medium">Stage {Math.min(flow.currentStageIndex + 1, flow.totalStages)} of {flow.totalStages}</span>
                        <span className="text-indigo-700 font-semibold truncate max-w-[130px]">
                          {currentStageName}
                        </span>
                      </div>
                      {isMyCurrentStage && (
                        <div className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded font-bold mt-1 inline-block">
                          ⚡ Waiting for you ({currentStage?.assignee})
                        </div>
                      )}
                      {/* Progress bar */}
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden mt-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all duration-300 ${
                            isPaymentFlow ? 'bg-purple-600' : isStockFlow ? 'bg-emerald-600' : isDispatchFlow ? 'bg-amber-500' : 'bg-indigo-600'
                          }`}
                          style={{
                            width: `${(Math.min(flow.currentStageIndex, flow.totalStages) / flow.totalStages) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                );
              })
            ) : (
              <div className="bg-white p-6 rounded-xl border border-slate-200 text-center text-xs text-slate-500 space-y-2">
                <p>No workflows currently match the filter.</p>
                <button
                  onClick={() => {
                    setPipelineTypeFilter('ALL');
                    onToggleScope('ALL_ORG');
                  }}
                  className="font-bold text-indigo-600 hover:underline"
                >
                  Clear filters &amp; view all →
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Detailed Visual Workflow of Selected Flow */}
        <div className="lg:col-span-3 space-y-4">
          {activeFlow ? (
            <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
              {/* Header */}
              <div className="p-5 border-b border-slate-200 bg-gradient-to-r from-slate-50 to-indigo-50/30 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-lg font-bold text-slate-900">
                      {activeFlow.flowType === 'CHECK_STOCK' ? (
                        <>Stock Check: {activeFlow.requisitionNumber || `Req #${activeFlow.indentNo}`} — {activeFlow.siteName}</>
                      ) : activeFlow.flowType === 'PO_TO_PAYMENT' ? (
                        <>PO: {activeFlow.poNumber || activeFlow.indentNo} — {activeFlow.vendorName || 'Accounts Payment Flow'}</>
                      ) : activeFlow.flowType === 'STORE_TO_SITE_DISPATCH' ? (
                        <>Stock to Site Dispatch: Req #{activeFlow.requisitionNumber || activeFlow.indentNo} — {activeFlow.siteName}</>
                      ) : activeFlow.flowType === 'PURCHASE_TO_STORE_DISPATCH' ? (
                        <>Purchase Store Dispatch: Indent #{activeFlow.indentNo} (Req #{activeFlow.requisitionNumber || activeFlow.indentNo}) — {activeFlow.siteName}</>
                      ) : activeFlow.flowType === 'PAYMENT_TO_DISPATCH' ? (
                        <>Dispatch: {activeFlow.poNumber || activeFlow.indentNo} — {activeFlow.vendorName || 'Material Dispatch'} ({activeFlow.siteName})</>
                      ) : activeFlow.flowType === 'SITE_RECEIVE' ? (
                        <>Site Receive: Requisition #{activeFlow.requisitionNumber || activeFlow.indentNo} — {activeFlow.siteName}</>
                      ) : activeFlow.flowType === 'ACCOUNTS_INVOICE_COLLECTION' ? (
                        <>Invoice Collection: PO #{activeFlow.poNumber || activeFlow.indentNo} — {activeFlow.vendorName || 'Accounts Invoice Collection'}</>
                      ) : activeFlow.flowType === 'HR_ATTENDANCE_PAYMENT' ? (
                        <>Labour Attendance &amp; Wages: #{activeFlow.indentNo} — {activeFlow.siteName} ({activeFlow.totalLabourPresent || 0} Labours)</>
                      ) : activeFlow.flowType === 'BREAKDOWN_REPORTING' ? (
                        <>Breakdown: {activeFlow.machineName || activeFlow.indentNo} ({activeFlow.machineIdNo || 'ID'}) — {activeFlow.siteName}</>
                      ) : activeFlow.flowType === 'EQUIPMENT_PART_REPAIR' ? (
                        <>Part Repair: {activeFlow.partEquipmentName || activeFlow.indentNo} — {activeFlow.siteName}</>
                      ) : activeFlow.flowType === 'DPR_REPORTING' ? (
                        <>DPR Report: {activeFlow.siteName} ({activeFlow.dprDate || activeFlow.indentDate}) — {activeFlow.dprPreparedBy || 'DPR'}</>
                      ) : (
                        <>Indent #{activeFlow.indentNo} — {activeFlow.siteName}</>
                      )}
                    </h2>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        activeFlow.flowType === 'CHECK_STOCK'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : activeFlow.flowType === 'PO_TO_PAYMENT'
                          ? 'bg-purple-100 text-purple-800 border border-purple-300'
                          : activeFlow.flowType === 'PURCHASE_TO_STORE_DISPATCH' || activeFlow.flowType === 'PAYMENT_TO_DISPATCH'
                          ? 'bg-amber-100 text-amber-800 border border-amber-300'
                          : activeFlow.flowType === 'SITE_RECEIVE'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : activeFlow.flowType === 'ACCOUNTS_INVOICE_COLLECTION'
                          ? 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                          : activeFlow.flowType === 'HR_ATTENDANCE_PAYMENT'
                          ? 'bg-teal-100 text-teal-800 border border-teal-300'
                          : activeFlow.flowType === 'BREAKDOWN_REPORTING'
                          ? 'bg-orange-100 text-orange-800 border border-orange-300'
                          : activeFlow.flowType === 'EQUIPMENT_PART_REPAIR'
                          ? 'bg-blue-100 text-blue-800 border border-blue-300'
                          : activeFlow.flowType === 'DPR_REPORTING'
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
                          : 'bg-indigo-100 text-indigo-800 border border-indigo-300'
                      }`}
                    >
                      {activeFlow.flowType === 'CHECK_STOCK'
                        ? 'Store FMS (Check Stock)'
                        : activeFlow.flowType === 'PO_TO_PAYMENT'
                        ? 'Accounts FMS (PO to Payment)'
                        : activeFlow.flowType === 'PURCHASE_TO_STORE_DISPATCH'
                        ? 'Purchase to Store to Dispatch'
                        : activeFlow.flowType === 'PAYMENT_TO_DISPATCH'
                        ? 'Dispatch FMS (Payment to Dispatch)'
                        : activeFlow.flowType === 'SITE_RECEIVE'
                        ? 'Site Receive FMS'
                        : activeFlow.flowType === 'ACCOUNTS_INVOICE_COLLECTION'
                        ? 'Accounts Invoice Collection FMS'
                        : activeFlow.flowType === 'HR_ATTENDANCE_PAYMENT'
                        ? 'HR Labour Attendance FMS'
                        : activeFlow.flowType === 'BREAKDOWN_REPORTING'
                        ? 'Machine Breakdown FMS'
                        : activeFlow.flowType === 'EQUIPMENT_PART_REPAIR'
                        ? 'Equipment Part Repair FMS'
                        : activeFlow.flowType === 'DPR_REPORTING'
                        ? 'Daily Progress Report FMS'
                        : 'Purchase FMS (Indent to PO)'}
                    </span>
                    <span
                      className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase ${
                        activeFlow.priority === 'Urgent'
                          ? 'bg-rose-100 text-rose-700'
                          : 'bg-slate-200 text-slate-700'
                      }`}
                    >
                      {activeFlow.priority} Priority
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 mt-1.5">
                    <span><strong>Flow ID:</strong> {activeFlow.flowId}</span>
                    {activeFlow.flowType === 'HR_ATTENDANCE_PAYMENT' ? (
                      <>
                        <span className="text-teal-800 font-bold">
                          <strong>Labour Count:</strong> {activeFlow.totalLabourPresent || 0} Present
                        </span>
                        <span className="text-amber-700 font-bold">
                          <strong>OT Hours:</strong> {activeFlow.totalOtHours || 0} hrs
                        </span>
                        <span><strong>Muster Date:</strong> {activeFlow.attendanceDate || activeFlow.indentDate}</span>
                      </>
                    ) : activeFlow.flowType === 'BREAKDOWN_REPORTING' ? (
                      <>
                        <span className="text-orange-800 font-bold">
                          <strong>Machine/Model:</strong> {activeFlow.machineName} ({activeFlow.machineMakeModel || 'Std'})
                        </span>
                        <span><strong>Ident No:</strong> {activeFlow.machineIdNo}</span>
                        {activeFlow.attendingMechanic && (
                          <span><strong>Mechanic:</strong> {activeFlow.attendingMechanic} {activeFlow.mechanicMobileNo ? `(${activeFlow.mechanicMobileNo})` : ''}</span>
                        )}
                        <span><strong>Date:</strong> {activeFlow.indentDate}</span>
                      </>
                    ) : activeFlow.flowType === 'EQUIPMENT_PART_REPAIR' ? (
                      <>
                        <span className="text-blue-800 font-bold">
                          <strong>Part / Equipment:</strong> {activeFlow.partEquipmentName || activeFlow.vehiclePlantMachineName}
                        </span>
                        <span><strong>S/N:</strong> {activeFlow.partSerialNo || '—'}</span>
                        <span className={`font-bold ${activeFlow.warrantyStatus === 'IN_WARRANTY' ? 'text-emerald-700' : 'text-slate-600'}`}>
                          <strong>Warranty:</strong> {activeFlow.warrantyStatus === 'IN_WARRANTY' ? 'Under Warranty' : 'Out of Warranty'}
                        </span>
                        <span><strong>Date:</strong> {activeFlow.indentDate}</span>
                      </>
                    ) : activeFlow.flowType === 'DPR_REPORTING' ? (
                      <>
                        <span className="text-emerald-800 font-bold">
                          <strong>DPR Date:</strong> {activeFlow.dprDate || activeFlow.indentDate}
                        </span>
                        <span><strong>Prepared By:</strong> {activeFlow.dprPreparedBy || 'DPR'}</span>
                        <span><strong>Site:</strong> {activeFlow.siteName}</span>
                      </>
                    ) : (
                      <>
                        {activeFlow.poAmount ? (
                          <span className="text-emerald-700 font-bold">
                            <strong>Amount:</strong> ₹{activeFlow.poAmount.toLocaleString('en-IN')}
                          </span>
                        ) : null}
                        {activeFlow.poAssignTo && (
                          <span><strong>Officer:</strong> {activeFlow.poAssignTo}</span>
                        )}
                        <span><strong>Date Registered:</strong> {activeFlow.indentDate || activeFlow.poDate}</span>
                      </>
                    )}
                    <span><strong>Site:</strong> {activeFlow.siteName}</span>
                    <span><strong>Total Delay:</strong> {activeFlow.totalDelayHours} hrs</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onSelectFlow(activeFlow)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-lg transition-colors"
                  >
                    <FileText className="w-3.5 h-3.5 text-slate-500" />
                    <span>Audit Breakdown</span>
                  </button>
                </div>
              </div>

              {/* End-to-End Supply Chain Progression Stepper */}
              <div className="mx-5 mt-4 p-3 bg-slate-50 border border-slate-200 rounded-xl">
                <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Organizational Workflow Pipeline</span>
                  <span className="text-[10px] font-normal text-slate-400">Step 1 (Stock) → Step 2 (Purchase) → Step 3 (Accounts) → Step 4 (Dispatch) → Step 5 (Site Receive)</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
                  {/* Step 1: Check Stock */}
                  {(() => {
                    const isCurrent = activeFlow.flowType === 'CHECK_STOCK';
                    const matchingStock = flows.find(f => f.flowType === 'CHECK_STOCK' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo || f.id === activeFlow.id));
                    const isDone = matchingStock?.status === 'Completed';

                    return (
                      <div 
                        onClick={() => {
                          if (matchingStock && !isCurrent) {
                            setSelectedFlowId(matchingStock.id);
                            setPipelineTypeFilter('CHECK_STOCK');
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isCurrent
                            ? 'bg-emerald-50 border-emerald-300 ring-1 ring-emerald-400'
                            : matchingStock
                            ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                            : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <Boxes className="w-3 h-3 text-emerald-600" />
                            1. Stock Check
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isCurrent
                              ? 'bg-emerald-600 text-white'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : matchingStock
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isCurrent ? 'Viewing' : isDone ? 'Done' : matchingStock ? 'Active' : 'N/A'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          {matchingStock ? `Req #${matchingStock.requisitionNumber || matchingStock.indentNo}` : 'Store Check'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Step 2: Indent to PO */}
                  {(() => {
                    const isCurrent = activeFlow.flowType === 'INDENT_PURCHASE';
                    const matchingIndent = flows.find(f => f.flowType === 'INDENT_PURCHASE' && (f.linkedFlowId === activeFlow.flowId || f.indentNo === activeFlow.indentNo || f.id === activeFlow.id));
                    const isDone = matchingIndent?.status === 'Completed';

                    return (
                      <div 
                        onClick={() => {
                          if (matchingIndent && !isCurrent) {
                            setSelectedFlowId(matchingIndent.id);
                            setPipelineTypeFilter('INDENT_PURCHASE');
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isCurrent
                            ? 'bg-indigo-50 border-indigo-300 ring-1 ring-indigo-400'
                            : matchingIndent
                            ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                            : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <ShoppingCart className="w-3 h-3 text-indigo-600" />
                            2. Indent to PO
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isCurrent
                              ? 'bg-indigo-600 text-white'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : matchingIndent
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isCurrent ? 'Viewing' : isDone ? 'Done' : matchingIndent ? 'Active' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          {matchingIndent ? `Indent #${matchingIndent.indentNo}` : 'Purchase'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Step 3: PO to Payment */}
                  {(() => {
                    const isCurrent = activeFlow.flowType === 'PO_TO_PAYMENT';
                    const matchingPayment = flows.find(f => f.flowType === 'PO_TO_PAYMENT' && (f.linkedFlowId === activeFlow.flowId || f.poNumber === activeFlow.poNumber || f.indentNo === activeFlow.indentNo || f.id === activeFlow.id));
                    const isDone = matchingPayment?.status === 'Completed';

                    return (
                      <div 
                        onClick={() => {
                          if (matchingPayment && !isCurrent) {
                            setSelectedFlowId(matchingPayment.id);
                            setPipelineTypeFilter('PO_TO_PAYMENT');
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isCurrent
                            ? 'bg-purple-50 border-purple-300 ring-1 ring-purple-400'
                            : matchingPayment
                            ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                            : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <CreditCard className="w-3 h-3 text-purple-600" />
                            3. PO to Payment
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isCurrent
                              ? 'bg-purple-600 text-white'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : matchingPayment
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isCurrent ? 'Viewing' : isDone ? 'Done' : matchingPayment ? 'Active' : 'Accounts'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          {matchingPayment ? (matchingPayment.poNumber || `PO #${matchingPayment.indentNo}`) : 'Accounts'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Step 4: Dispatch Flow (Stock to Site, Payment to Dispatch, or Purchase Store Dispatch) */}
                  {(() => {
                    const isCurrent = activeFlow.flowType === 'STORE_TO_SITE_DISPATCH' || activeFlow.flowType === 'PURCHASE_TO_STORE_DISPATCH' || activeFlow.flowType === 'PAYMENT_TO_DISPATCH';
                    const matchingDispatch = flows.find(
                      f => (f.flowType === 'STORE_TO_SITE_DISPATCH' || f.flowType === 'PURCHASE_TO_STORE_DISPATCH' || f.flowType === 'PAYMENT_TO_DISPATCH') && (
                        f.linkedFlowId === activeFlow.flowId ||
                        f.linkedFlowId === activeFlow.linkedFlowId ||
                        f.requisitionNumber === activeFlow.requisitionNumber ||
                        f.poNumber === activeFlow.poNumber ||
                        f.indentNo === activeFlow.indentNo ||
                        f.id === activeFlow.id
                      )
                    );
                    const isDone = matchingDispatch?.status === 'Completed';

                    return (
                      <div 
                        onClick={() => {
                          if (matchingDispatch && !isCurrent) {
                            setSelectedFlowId(matchingDispatch.id);
                            if (matchingDispatch.flowType === 'STORE_TO_SITE_DISPATCH' || matchingDispatch.flowType === 'PAYMENT_TO_DISPATCH' || matchingDispatch.flowType === 'PURCHASE_TO_STORE_DISPATCH') {
                              setPipelineTypeFilter(matchingDispatch.flowType);
                            }
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isCurrent
                            ? 'bg-amber-50 border-amber-300 ring-1 ring-amber-400'
                            : matchingDispatch
                            ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                            : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <Truck className="w-3 h-3 text-amber-600" />
                            {matchingDispatch?.flowType === 'STORE_TO_SITE_DISPATCH' ? '4. Stock Dispatch' : matchingDispatch?.flowType === 'PAYMENT_TO_DISPATCH' ? '4. QC Dispatch' : '4. Dispatch'}
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isCurrent
                              ? 'bg-amber-600 text-white'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : matchingDispatch
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isCurrent ? 'Viewing' : isDone ? 'Done' : matchingDispatch ? 'Active' : 'Transit'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          {matchingDispatch
                            ? matchingDispatch.flowType === 'STORE_TO_SITE_DISPATCH'
                              ? `Req #${matchingDispatch.requisitionNumber || matchingDispatch.indentNo} (9 Stg)`
                              : matchingDispatch.flowType === 'PAYMENT_TO_DISPATCH'
                              ? `PO #${matchingDispatch.poNumber || matchingDispatch.indentNo}`
                              : `Indent #${matchingDispatch.indentNo}`
                            : 'Dispatch'}
                        </p>
                      </div>
                    );
                  })()}

                  {/* Step 5: Site Receive */}
                  {(() => {
                    const isCurrent = activeFlow.flowType === 'SITE_RECEIVE';
                    const matchingReceive = flows.find(
                      f => f.flowType === 'SITE_RECEIVE' && (
                        f.requisitionNumber === activeFlow.requisitionNumber ||
                        f.indentNo === activeFlow.indentNo ||
                        f.linkedFlowId === activeFlow.flowId ||
                        f.linkedFlowId === activeFlow.linkedFlowId ||
                        f.id === activeFlow.id
                      )
                    );
                    const isDone = matchingReceive?.status === 'Completed';

                    return (
                      <div 
                        onClick={() => {
                          if (matchingReceive && !isCurrent) {
                            setSelectedFlowId(matchingReceive.id);
                            setPipelineTypeFilter('SITE_RECEIVE');
                          }
                        }}
                        className={`p-2 rounded-lg border text-left transition-all ${
                          isCurrent
                            ? 'bg-blue-50 border-blue-300 ring-1 ring-blue-400'
                            : matchingReceive
                            ? 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50 cursor-pointer'
                            : 'bg-slate-100/60 border-slate-200 opacity-60'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] font-bold text-slate-800 flex items-center gap-1">
                            <PackageCheck className="w-3 h-3 text-blue-600" />
                            5. Site Receive
                          </span>
                          <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                            isCurrent
                              ? 'bg-blue-600 text-white'
                              : isDone
                              ? 'bg-emerald-100 text-emerald-800'
                              : matchingReceive
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-slate-200 text-slate-500'
                          }`}>
                            {isCurrent ? 'Viewing' : isDone ? 'Done' : matchingReceive ? 'Active' : 'Pending'}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-500 mt-1 truncate">
                          {matchingReceive ? `Req #${matchingReceive.requisitionNumber || matchingReceive.indentNo} (10 Stg)` : 'Site Inward'}
                        </p>
                      </div>
                    );
                  })()}
                </div>
              </div>

              {/* Cross-linking banner for Check Stock flow if Indent flow or Stock Dispatch flow exists */}
              {activeFlow.flowType === 'CHECK_STOCK' && (
                (() => {
                  const linkedIndent = flows.find(f => f.linkedFlowId === activeFlow.flowId || (f.indentNo === activeFlow.indentNo && f.flowType === 'INDENT_PURCHASE'));
                  const linkedStockDispatch = flows.find(f => (f.linkedFlowId === activeFlow.flowId || f.indentNo === activeFlow.indentNo || f.requisitionNumber === activeFlow.requisitionNumber) && f.flowType === 'STORE_TO_SITE_DISPATCH');
                  
                  return (
                    <>
                      {linkedStockDispatch && (
                        <div className="mx-5 mt-4 p-3 bg-cyan-50 border border-cyan-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 text-xs text-cyan-950">
                            <Truck className="w-4 h-4 text-cyan-600 shrink-0" />
                            <div>
                              <span className="font-bold">Stock Available Dispatch Active (9 Stages): </span>
                              <span>Materials confirmed available in store. Direct Store to Site Dispatch workflow is active for Requisition #{activeFlow.requisitionNumber || activeFlow.indentNo}.</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedStockDispatch.id);
                              setPipelineTypeFilter('STORE_TO_SITE_DISPATCH');
                            }}
                            className="px-3 py-1 bg-cyan-700 hover:bg-cyan-800 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1"
                          >
                            <span>Open Stock Dispatch Flow →</span>
                          </button>
                        </div>
                      )}

                      {linkedIndent && (
                        <div className="mx-5 mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                          <div className="flex items-center gap-2.5 text-xs text-indigo-900">
                            <ShoppingCart className="w-4 h-4 text-indigo-600 shrink-0" />
                            <div>
                              <span className="font-bold">Purchase Dept Hand-off Active: </span>
                              <span>Material requisition verified in store. Indent to PO flow is active for Indent #{activeFlow.indentNo}.</span>
                            </div>
                          </div>
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedIndent.id);
                              setPipelineTypeFilter('INDENT_PURCHASE');
                            }}
                            className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1"
                          >
                            <span>Open Purchase Indent Flow →</span>
                          </button>
                        </div>
                      )}
                    </>
                  );
                })()
              )}

              {/* Cross-linking banner for Indent flow if preceding Check Stock flow exists */}
              {activeFlow.flowType === 'INDENT_PURCHASE' && (
                (() => {
                  const linkedStock = flows.find(f => f.flowId === activeFlow.linkedFlowId || (f.indentNo === activeFlow.indentNo && f.flowType === 'CHECK_STOCK'));
                  if (linkedStock) {
                    return (
                      <div className="mx-5 mt-4 p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-xs text-emerald-900">
                          <Boxes className="w-4 h-4 text-emerald-600 shrink-0" />
                          <div>
                            <span className="font-bold">Preceding Store Verification: </span>
                            <span>Physical stock check completed at store (Requisition #{linkedStock.requisitionNumber || linkedStock.indentNo}).</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFlowId(linkedStock.id);
                            setPipelineTypeFilter('CHECK_STOCK');
                          }}
                          className="px-3 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1"
                        >
                          <span>View Stock Check Flow →</span>
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              {/* Cross-linking banner if Indent flow has advance payment decision YES */}
              {activeFlow.flowType === 'INDENT_PURCHASE' && activeFlow.stages[9]?.decisionValue === 'Yes' && (
                <div className="mx-5 mt-4 p-3 bg-purple-50 border border-purple-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 text-xs text-purple-900">
                    <CreditCard className="w-4 h-4 text-purple-600 shrink-0" />
                    <div>
                      <span className="font-bold">Accounts Hand-off Active: </span>
                      <span>Advance payment approved at Stage 10. Dossier transferred to Accounts Department (PO to Payment FMS).</span>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      const payFlow = flows.find(f => f.linkedFlowId === activeFlow.flowId || (f.indentNo === activeFlow.indentNo && f.flowType === 'PO_TO_PAYMENT'));
                      if (payFlow) {
                        setSelectedFlowId(payFlow.id);
                        setPipelineTypeFilter('PO_TO_PAYMENT');
                      }
                    }}
                    className="px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs"
                  >
                    Open Accounts Payment Flow →
                  </button>
                </div>
              )}

              {/* Cross-linking banner for PO to Payment flow if originating Indent flow exists */}
              {activeFlow.flowType === 'PO_TO_PAYMENT' && (
                (() => {
                  const linkedIndent = flows.find(f => f.flowId === activeFlow.linkedFlowId || (f.indentNo === activeFlow.indentNo && f.flowType === 'INDENT_PURCHASE'));
                  if (linkedIndent) {
                    return (
                      <div className="mx-5 mt-4 p-3 bg-indigo-50 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-xs text-indigo-900">
                          <ShoppingCart className="w-4 h-4 text-indigo-600 shrink-0" />
                          <div>
                            <span className="font-bold">Originated from Purchase Dept: </span>
                            <span>Payment requisition triggered from Indent #{activeFlow.indentNo}.</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFlowId(linkedIndent.id);
                            setPipelineTypeFilter('INDENT_PURCHASE');
                          }}
                          className="px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1"
                        >
                          <span>View Purchase Indent Flow →</span>
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              {/* Cross-linking banner for PO to Payment flow if linked Dispatch flow exists */}
              {activeFlow.flowType === 'PO_TO_PAYMENT' && (
                (() => {
                  const linkedDispatch = flows.find(f => f.flowType === 'PAYMENT_TO_DISPATCH' && (f.linkedFlowId === activeFlow.flowId || f.poNumber === activeFlow.poNumber || f.indentNo === activeFlow.indentNo));
                  if (linkedDispatch) {
                    return (
                      <div className="mx-5 mt-4 p-3 bg-amber-50 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5 text-xs text-amber-900">
                          <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                          <div>
                            <span className="font-bold">Dispatch Hand-off Active: </span>
                            <span>Payment details completed. Material receipt and site dispatch workflow is active for PO #{activeFlow.poNumber || activeFlow.indentNo}.</span>
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            setSelectedFlowId(linkedDispatch.id);
                            setPipelineTypeFilter('PAYMENT_TO_DISPATCH');
                          }}
                          className="px-3 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shrink-0 shadow-xs flex items-center gap-1"
                        >
                          <span>Open Dispatch Flow →</span>
                        </button>
                      </div>
                    );
                  }
                  return null;
                })()
              )}

              {/* Cross-linking banner for Payment to Dispatch flow */}
              {activeFlow.flowType === 'PAYMENT_TO_DISPATCH' && (
                (() => {
                  const linkedPayment = flows.find(f => f.flowType === 'PO_TO_PAYMENT' && (f.flowId === activeFlow.linkedFlowId || f.poNumber === activeFlow.poNumber || f.indentNo === activeFlow.indentNo));
                  const linkedIndent = flows.find(f => f.flowType === 'INDENT_PURCHASE' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo));
                  return (
                    <div className="mx-5 mt-4 p-3 bg-amber-50/70 border border-amber-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-amber-950">
                        <Truck className="w-4 h-4 text-amber-600 shrink-0" />
                        <div>
                          <span className="font-bold">Payment to Dispatch FMS (7 Stages): </span>
                          <span>Material collection from vendor <strong>{activeFlow.vendorName || 'Authorized Vendor'}</strong>, inspection by Shyam Rao Sureshe, and site release to <strong>{activeFlow.siteName}</strong> via Google Form.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {linkedPayment && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedPayment.id);
                              setPipelineTypeFilter('PO_TO_PAYMENT');
                            }}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>View Payment Flow →</span>
                          </button>
                        )}
                        {linkedIndent && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedIndent.id);
                              setPipelineTypeFilter('INDENT_PURCHASE');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>View Indent Flow →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Cross-linking banner for Store to Site Dispatch (Stock Available) flow */}
              {activeFlow.flowType === 'STORE_TO_SITE_DISPATCH' && (
                (() => {
                  const linkedStock = flows.find(f => f.flowType === 'CHECK_STOCK' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo || f.requisitionNumber === activeFlow.requisitionNumber));
                  const linkedSiteReceive = flows.find(f => f.flowType === 'SITE_RECEIVE' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo || f.requisitionNumber === activeFlow.requisitionNumber));
                  return (
                    <div className="mx-5 mt-4 p-3 bg-cyan-50/70 border border-cyan-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-cyan-950">
                        <Truck className="w-4 h-4 text-cyan-600 shrink-0" />
                        <div>
                          <span className="font-bold">Store to Site Dispatch FMS (Stock Available — 9 Stages): </span>
                          <span>Inventory collection &amp; vehicle transit managed by <strong>Store Manager Sumant (Siladehi) / Hemant (Bijetala)</strong>, E-Way Bill decision, and site receiving by Purchaser via Google Form.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {linkedStock && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedStock.id);
                              setPipelineTypeFilter('CHECK_STOCK');
                            }}
                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <Boxes className="w-3 h-3" />
                            <span>View Check Stock Flow →</span>
                          </button>
                        )}
                        {linkedSiteReceive && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedSiteReceive.id);
                              setPipelineTypeFilter('SITE_RECEIVE');
                            }}
                            className="px-2.5 py-1 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <PackageCheck className="w-3 h-3" />
                            <span>View Site Receive Flow →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Cross-linking banner for Purchase to Store to Dispatch flow */}
              {activeFlow.flowType === 'PURCHASE_TO_STORE_DISPATCH' && (
                (() => {
                  const linkedPayment = flows.find(f => f.flowType === 'PO_TO_PAYMENT' && (f.flowId === activeFlow.linkedFlowId || f.poNumber === activeFlow.poNumber || f.indentNo === activeFlow.indentNo));
                  const linkedIndent = flows.find(f => f.flowType === 'INDENT_PURCHASE' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo));
                  return (
                    <div className="mx-5 mt-4 p-3 bg-teal-50/70 border border-teal-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-teal-950">
                        <Truck className="w-4 h-4 text-teal-600 shrink-0" />
                        <div>
                          <span className="font-bold">Purchase to Store to Dispatch FMS (10 Stages): </span>
                          <span>Store receiving by <strong>Bramhanand Patel</strong>, verification &amp; challan by <strong>Shyam Rao Sureshe</strong>, vehicle booking, E-Way Bill decision, and site receiving confirmation.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {linkedPayment && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedPayment.id);
                              setPipelineTypeFilter('PO_TO_PAYMENT');
                            }}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>View Payment Flow →</span>
                          </button>
                        )}
                        {linkedIndent && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedIndent.id);
                              setPipelineTypeFilter('INDENT_PURCHASE');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>View Indent Flow →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Cross-linking banner for Site Receive flow */}
              {activeFlow.flowType === 'SITE_RECEIVE' && (
                (() => {
                  const linkedDispatch = flows.find(f => (f.flowType === 'PURCHASE_TO_STORE_DISPATCH' || f.flowType === 'PAYMENT_TO_DISPATCH') && (f.flowId === activeFlow.linkedFlowId || f.requisitionNumber === activeFlow.requisitionNumber || f.indentNo === activeFlow.indentNo));
                  const linkedIndent = flows.find(f => f.flowType === 'INDENT_PURCHASE' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo));
                  return (
                    <div className="mx-5 mt-4 p-3 bg-blue-50/70 border border-blue-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-blue-950">
                        <PackageCheck className="w-4 h-4 text-blue-600 shrink-0" />
                        <div>
                          <span className="font-bold">Site Receiving &amp; Inward Workflow (10 Stages): </span>
                          <span>Material receipt at <strong>{activeFlow.siteName}</strong> store, physical inspection for discrepancies, engineering verification, and digital inward logging via Google Form.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {linkedDispatch && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedDispatch.id);
                              if (linkedDispatch.flowType === 'PAYMENT_TO_DISPATCH' || linkedDispatch.flowType === 'PURCHASE_TO_STORE_DISPATCH') {
                                setPipelineTypeFilter(linkedDispatch.flowType);
                              } else {
                                setPipelineTypeFilter('ALL');
                              }
                            }}
                            className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <Truck className="w-3 h-3" />
                            <span>View Dispatch Flow →</span>
                          </button>
                        )}
                        {linkedIndent && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedIndent.id);
                              setPipelineTypeFilter('INDENT_PURCHASE');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>View Indent Flow →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Cross-linking banner for Accounts Invoice Collection flow */}
              {activeFlow.flowType === 'ACCOUNTS_INVOICE_COLLECTION' && (
                (() => {
                  const linkedPayment = flows.find(f => f.flowType === 'PO_TO_PAYMENT' && (f.flowId === activeFlow.linkedFlowId || f.poNumber === activeFlow.poNumber || f.indentNo === activeFlow.indentNo));
                  const linkedIndent = flows.find(f => f.flowType === 'INDENT_PURCHASE' && (f.flowId === activeFlow.linkedFlowId || f.indentNo === activeFlow.indentNo));
                  return (
                    <div className="mx-5 mt-4 p-3 bg-indigo-50/70 border border-indigo-200 rounded-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 text-xs text-indigo-950">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div>
                          <span className="font-bold">Accounts Invoice Collection FMS (7 Stages): </span>
                          <span>GST invoice intake &amp; calculation check by <strong>Byamkesh Kaiwartya</strong>, acceptability verification by <strong>Bramhanand Patel</strong>, EA authorization by <strong>Khushboo Sahu</strong>, ERP voucher approval, and physical archiving.</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {linkedPayment && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedPayment.id);
                              setPipelineTypeFilter('PO_TO_PAYMENT');
                            }}
                            className="px-2.5 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <CreditCard className="w-3 h-3" />
                            <span>View Payment Flow →</span>
                          </button>
                        )}
                        {linkedIndent && (
                          <button
                            onClick={() => {
                              setSelectedFlowId(linkedIndent.id);
                              setPipelineTypeFilter('INDENT_PURCHASE');
                            }}
                            className="px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-colors shadow-xs flex items-center gap-1"
                          >
                            <ShoppingCart className="w-3 h-3" />
                            <span>View Indent Flow →</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })()
              )}

              {/* Stage View Scope Selector */}
              <div className="px-5 pt-4 pb-2 bg-slate-50/70 border-b border-slate-200/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                    <Layers className="w-4 h-4 text-indigo-600" />
                    Pipeline Stages Scope:
                  </span>
                  <div className="flex items-center bg-slate-200/80 p-0.5 rounded-lg">
                    <button
                      onClick={() => setStageFilterMode('MY_STAGES')}
                      className={`px-3 py-1 text-xs rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                        stageFilterMode === 'MY_STAGES'
                          ? 'bg-white text-indigo-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <User className="w-3 h-3" />
                      <span>Only My Stages ({myStagesInFlow.length})</span>
                    </button>
                    <button
                      onClick={() => setStageFilterMode('ALL_STAGES')}
                      className={`px-3 py-1 text-xs rounded-md font-semibold transition-all flex items-center gap-1.5 ${
                        stageFilterMode === 'ALL_STAGES'
                          ? 'bg-white text-slate-900 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>All {activeFlow.totalStages} Stages</span>
                    </button>
                  </div>
                </div>

                <div className="text-[11px] text-slate-500">
                  {stageFilterMode === 'MY_STAGES' ? (
                    <span className="text-indigo-800 font-medium">
                      Showing only stages belonging to <strong>{currentUser.name}</strong> ({currentUser.role})
                    </span>
                  ) : (
                    <span>Showing complete {activeFlow.totalStages}-stage organizational flow</span>
                  )}
                </div>
              </div>

              {/* Active stage actionable hero banner (ONLY IF WAITING ON CURRENT USER!) */}
              {activeFlow.status !== 'Completed' && activeFlow.stages[activeFlow.currentStageIndex] && (
                isCurrentStageWaitingForMe ? (
                  <div className="m-5 p-4 rounded-xl border bg-amber-50/80 border-amber-300 ring-1 ring-amber-200 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase text-white bg-amber-600 animate-pulse">
                          ⚡ Your Action Required: Step {activeFlow.currentStageIndex + 1} / {activeFlow.totalStages}
                        </span>
                        <h4 className="font-bold text-slate-900 text-sm">
                          {activeFlow.stages[activeFlow.currentStageIndex].stageName}
                        </h4>
                      </div>
                      <p className="text-xs text-slate-600">
                        <strong>Assigned to:</strong> You ({currentUser.name} — {currentUser.role}) • <strong>Channel:</strong> {activeFlow.stages[activeFlow.currentStageIndex].how}
                      </p>
                      {activeFlow.stages[activeFlow.currentStageIndex].plannedDateTime && (
                        <p className="text-xs text-slate-500 flex items-center gap-1">
                          <Clock className="w-3.5 h-3.5 text-indigo-500" />
                          Target Planned: {activeFlow.stages[activeFlow.currentStageIndex].plannedDateTime}
                        </p>
                      )}
                    </div>

                    {/* Actions for current step */}
                    <div className="flex flex-wrap items-center gap-2">
                      {activeFlow.stages[activeFlow.currentStageIndex].formResponseRef && (
                        <a
                          href={activeFlow.stages[activeFlow.currentStageIndex].formResponseRef}
                          target="_blank"
                          rel="noreferrer"
                          className="flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-100 hover:bg-indigo-200 rounded-lg transition-colors"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open Linked Google Form</span>
                        </a>
                      )}

                      {currentStageDef?.hasYesNoDecision ? (
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleAdvanceCurrentStage(activeFlow, 'Yes')}
                            className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>
                                {activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-STK-02'
                                ? 'Yes (Purchase Required → Send Indent)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-STK-04'
                                ? 'Yes (Partial Stock Available → Dispatch Available)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-PAY-01'
                                ? 'Yes (Bank Account / NEFT Route)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-PAY-02'
                                ? 'Yes (Account Already Added)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-SSD-04' || activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-PSD-05'
                                ? 'Yes (E-Way Bill Required → Send Challan)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-DISP-03'
                                ? 'Yes (Material Acceptable → Skip Return & Dispatch)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-DISP-05'
                                ? 'Yes (Material Replaced → Dispatch)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-REC-03'
                                ? 'Yes (Discrepancy Found → Inform CSR Store)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-REC-05'
                                ? 'Yes (Acceptable → Get Technical Verification)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-REC-09'
                                ? 'Yes (Form Already Submitted)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-INV-03'
                                ? 'Yes (Invoice Acceptable → Get Approval)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-HR-03'
                                ? 'Yes (OT Logged → Prepare OT Sheet)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-BRK-02'
                                ? 'Yes (Service Engineer Required → Schedule Visit)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-BRK-05'
                                ? 'Yes (Can Repair at Site → Send Parts Indent)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-EQP-03'
                                ? 'Yes (Under Warranty → Send to OEM Center)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-EQP-12'
                                ? 'Yes (Trial Run Successful → Check Extra Charges)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-EQP-13'
                                ? 'Yes (Extra Charges Incurred → Get Approval)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-10'
                                ? 'Yes (Advance Payment Required)'
                                : 'Approve (YES)'}
                            </span>
                          </button>
                          <button
                            onClick={() => handleAdvanceCurrentStage(activeFlow, 'No')}
                            className="flex items-center gap-1 px-3.5 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 hover:bg-slate-100 rounded-lg transition-colors"
                          >
                            <span>
                              {activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-STK-02'
                                ? 'No (Fulfilled from Store Stock → Dispatch)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-STK-04'
                                ? 'No (Zero Stock → 100% Purchase Needed)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-PAY-01'
                                ? 'No (Route via UPI QR Code)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-PAY-02'
                                ? 'No (Passbook Copy & Add Account)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-SSD-04' || activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-PSD-05'
                                ? 'No (E-Way Bill Not Required → Load Material)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-DISP-03'
                                ? 'No (Defective / Mismatch → Return to Vendor)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-DISP-05'
                                ? 'No (Not Replaced → Get Refund/Credit Note)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-REC-03'
                                ? 'No (No Discrepancy → Verify Material Acceptance)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-REC-05'
                                ? 'No (Rejected / Damaged → Return to Repair Store)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-REC-09'
                                ? 'No (Fill Google Form Now)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-INV-03'
                                ? 'No (Discrepancy / Error → Get Rectified)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-HR-03'
                                ? 'No (No OT → Skip to Attendance Sheet)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-BRK-02'
                                ? 'No (Mechanic Diagnostic Sufficient → Analysis Report)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-BRK-05'
                                ? 'No (Send to Offsite Workshop for Repair)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-EQP-03'
                                ? 'No (Out of Warranty → Proceed to Paid Repair Approval)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-EQP-12'
                                ? 'No (Trial Run Failed → Send for Rework)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-EQP-13'
                                ? 'No (No Extra Charges → Receive in Store)'
                                : activeFlow.stages[activeFlow.currentStageIndex]?.stageId === 'STG-10'
                                ? 'No (Skip Stage 11 → Go to Stage 12)'
                                : 'Reject / No'}
                            </span>
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={() => handleAdvanceCurrentStage(activeFlow)}
                          className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-2xs transition-colors"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>Mark Step Done &amp; Advance</span>
                        </button>
                      )}
                    </div>
                  </div>
                ) : (
                  /* If stage belongs to someone else (e.g. Bramhanand Patel while Amanat is logged in) */
                  stageFilterMode === 'ALL_STAGES' ? (
                    <div className="m-5 p-3.5 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2.5">
                        <Clock className="w-4 h-4 text-slate-400" />
                        <div>
                          <span className="font-semibold text-slate-800">
                            Current Step {activeFlow.currentStageIndex + 1}: {activeFlow.stages[activeFlow.currentStageIndex].stageName}
                          </span>
                          <p className="text-[11px] text-slate-500">
                            Responsible: {activeFlow.stages[activeFlow.currentStageIndex].assignee} • Channel: {activeFlow.stages[activeFlow.currentStageIndex].how}
                          </p>
                        </div>
                      </div>
                      <span className="px-2.5 py-1 rounded-md text-[11px] font-semibold bg-slate-200 text-slate-700">
                        Awaiting {activeFlow.stages[activeFlow.currentStageIndex].assignee}
                      </span>
                    </div>
                  ) : null
                )
              )}

              {/* Stepper Timeline - Filtered to User Stages or All */}
              <div className="p-5 overflow-x-auto">
                {stagesToRender.length > 0 ? (
                  <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200">
                    {stagesToRender.map(({ def, idx, exec: stageExec, isMine }) => {
                      const stg10Decision = activeFlow.stages.find((s) => s.stageId === 'STG-10')?.decisionValue;
                      const isStg11AndStg10SaidNo = def.stageId === 'STG-11' && stg10Decision === 'No';

                      const isSkipped = stageExec?.status === 'Skipped' || isStg11AndStg10SaidNo;
                      const isDone = !isSkipped && stageExec?.status === 'Done';
                      const isCurrent = !isSkipped && activeFlow.currentStageIndex === idx;

                      return (
                        <div key={def.stageId} className="relative group">
                          {/* Status Icon Indicator */}
                          <div
                            className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold ring-4 ring-white ${
                              isDone
                                ? 'bg-emerald-600 text-white'
                                : isCurrent
                                ? 'bg-indigo-600 text-white animate-pulse'
                                : isSkipped
                                ? 'bg-slate-300 text-slate-600'
                                : 'bg-slate-100 text-slate-400 border border-slate-300'
                            }`}
                          >
                            {isDone ? (
                              <CheckCircle2 className="w-3 h-3" />
                            ) : isSkipped ? (
                              '—'
                            ) : (
                              idx + 1
                            )}
                          </div>

                          {/* Stage Card */}
                          <div
                            className={`p-3.5 rounded-lg border transition-all ${
                              isCurrent
                                ? 'bg-white border-indigo-400 shadow-xs ring-1 ring-indigo-200'
                                : isDone
                                ? 'bg-emerald-50/30 border-emerald-200'
                                : isSkipped
                                ? 'bg-slate-50/60 border-slate-200 opacity-60'
                                : 'bg-white border-slate-200'
                            }`}
                          >
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-slate-900 text-sm">
                                    Stage {idx + 1}: {def.name}
                                  </span>
                                  {isMine && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-indigo-100 text-indigo-700">
                                      Your Stage
                                    </span>
                                  )}
                                  {def.isCheckpoint && (
                                    <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-amber-100 text-amber-800 border border-amber-300">
                                      CHECK POINT
                                    </span>
                                  )}
                                  {stageExec?.decisionValue && (
                                    <span
                                      className={`text-[10px] font-bold px-2 py-0.5 rounded ${
                                        stageExec.decisionValue === 'Yes'
                                          ? 'bg-emerald-100 text-emerald-800'
                                          : 'bg-slate-200 text-slate-800'
                                      }`}
                                    >
                                      Decision: {stageExec.decisionValue}
                                    </span>
                                  )}
                                </div>
                                <p className="text-xs text-slate-500 mt-0.5">
                                  {def.what}
                                </p>
                              </div>

                              <div className="text-right">
                                <span
                                  className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
                                    isDone
                                      ? 'bg-emerald-100 text-emerald-800'
                                      : isCurrent
                                      ? 'bg-indigo-100 text-indigo-800'
                                      : isSkipped
                                      ? 'bg-slate-100 text-slate-500'
                                      : 'bg-slate-100 text-slate-600'
                                  }`}
                                >
                                  {stageExec?.status || 'Pending'}
                                </span>
                                <div className="text-[11px] text-slate-400 mt-1">
                                  SLA: {def.slaHours} hr{def.slaHours > 1 ? 's' : ''}
                                </div>
                              </div>
                            </div>

                            <div className="mt-2.5 pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs text-slate-600">
                              <div>
                                <span className="text-slate-400 font-medium">Who: </span>
                                <span className="font-medium text-slate-800">
                                  {stageExec?.assignee || def.whoDefaultAssignee}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">Channel: </span>
                                <span>{stageExec?.how || def.howChannel}</span>
                              </div>
                              <div>
                                <span className="text-slate-400 font-medium">Timestamps: </span>
                                {isSkipped ? (
                                  <span className="text-slate-500 italic">
                                    Skipped {def.stageId === 'STG-11' ? '(No advance required)' : ''}
                                  </span>
                                ) : stageExec?.actualDateTime ? (
                                  <span className="text-emerald-700 font-medium">
                                    Done: {stageExec.actualDateTime}
                                  </span>
                                ) : stageExec?.plannedDateTime ? (
                                  <span className="text-indigo-600 font-medium">
                                    Target: {stageExec.plannedDateTime}
                                  </span>
                                ) : (
                                  <span className="text-slate-400">—</span>
                                )}
                              </div>
                            </div>

                            {(stageExec?.notes || isStg11AndStg10SaidNo) && (
                              <div className="mt-2 text-[11px] bg-slate-50 p-2 rounded text-slate-600 italic">
                                Note: {isStg11AndStg10SaidNo ? 'Skipped: No advance payment required' : stageExec?.notes}
                              </div>
                            )}

                            {def.formUrl && (
                              <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-600 hover:text-indigo-800 font-medium">
                                <ExternalLink className="w-3.5 h-3.5" />
                                <a href={def.formUrl} target="_blank" rel="noreferrer">
                                  Google Form: {def.formUrl}
                                </a>
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="py-10 text-center text-slate-500 text-xs space-y-2">
                    <User className="w-8 h-8 text-slate-300 mx-auto" />
                    <p className="font-semibold text-slate-700">
                      No procurement stages in this flow belong directly to {currentUser.name} ({currentUser.role}).
                    </p>
                    <p className="text-slate-400">
                      You can view the full 12 stages across other departments (Store, Purchase, Projects).
                    </p>
                    <button
                      onClick={() => setStageFilterMode('ALL_STAGES')}
                      className="px-3.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold rounded-lg text-xs transition-colors"
                    >
                      View All 12 Stages →
                    </button>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-white p-12 rounded-xl border border-slate-200 text-center">
              <GitBranch className="w-10 h-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium text-sm">No FMS Requisitions found</p>
              <button
                onClick={() => onToggleScope('ALL_ORG')}
                className="mt-3 text-xs text-indigo-600 font-semibold hover:underline"
              >
                View all organization indents →
              </button>
            </div>
          )}
        </div>
      </div>
      )}
    </div>
  );
};
