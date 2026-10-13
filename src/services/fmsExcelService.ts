import * as XLSX from 'xlsx';
import { FmsTemplateDefinition, FmsStageTemplate, FmsStageFieldConfig, Priority, FmsInstance, FmsStageDefinition } from '../types';
import { calculateWorkingHoursDelay, formatDelayHms, DEFAULT_WORK_SHIFT_CONFIG, WorkShiftConfig } from './workShiftService';
import { storageAdapter } from './storageAdapter';

export interface FmsImportResult {
  success: boolean;
  template?: FmsTemplateDefinition;
  error?: string;
  stageCount?: number;
  fieldCount?: number;
}

/**
 * Generates an Excel (.xlsx) file workbook pre-populated with structure, column headers,
 * instructions, and real-world sample data for creating any custom FMS workflow.
 */
export function generateFmsExcelTemplate(): Uint8Array {
  const wb = XLSX.utils.book_new();

  // 1. Sheet 1: Workflow_Master
  const masterData = [
    {
      'Property': 'Workflow Name',
      'Value': 'Site Petty Cash & Fast-Track Reimbursement FMS',
      'Notes & Instructions': 'The official title of the workflow (Required)',
    },
    {
      'Property': 'Department Hub',
      'Value': 'FINANCE_ACCOUNTS',
      'Notes & Instructions': 'Options: FINANCE_ACCOUNTS, PROCUREMENT, SITE_LOGISTICS, HR_EQUIPMENT, OPERATIONS, GENERAL',
    },
    {
      'Property': 'Reference Label',
      'Value': 'Voucher / Bill Ref No.',
      'Notes & Instructions': 'Label for tracking code (e.g. PO No., Indent No., Bill Ref No., Ticket ID)',
    },
    {
      'Property': 'Default Priority',
      'Value': 'Normal',
      'Notes & Instructions': 'Options: Normal, Urgent, Critical, Low',
    },
    {
      'Property': 'Day Shift Hours',
      'Value': '09:30 - 18:30',
      'Notes & Instructions': 'Official active shift hours. SLA elapsed time only counts inside this window.',
    },
    {
      'Property': 'Lunch Break Window',
      'Value': '13:30 - 14:30',
      'Notes & Instructions': '1-hour lunch break pause. SLA timers pause during lunch without penalty.',
    },
    {
      'Property': 'Working Days of Week',
      'Value': 'Monday to Saturday',
      'Notes & Instructions': 'Official 6-day work week. Sunday is weekly off (SLA timer paused).',
    },
    {
      'Property': 'Delay Variance Display Format',
      'Value': '- hh:mm:ss',
      'Notes & Instructions': 'Delays formatted with leading minus sign e.g. - 02:45:30. On-time tasks show 00:00:00.',
    },
    {
      'Property': 'Google Forms Integration',
      'Value': 'NO (100% Native In-App Form Execution)',
      'Notes & Instructions': 'Zero external Google Form links. All actions execute directly in Next.js.',
    },
    {
      'Property': 'Description / SOP',
      'Value': 'Workflow for emergency site petty cash requests, manager review, and accounts bank disbursement.',
      'Notes & Instructions': 'Brief description or SOP protocol for this workflow',
    },
  ];

  const wsMaster = XLSX.utils.json_to_sheet(masterData);
  wsMaster['!cols'] = [{ wch: 22 }, { wch: 45 }, { wch: 60 }];
  XLSX.utils.book_append_sheet(wb, wsMaster, 'Workflow_Master');

  // 2. Sheet 2: Stages_And_Fields
  const stagesData = [
    {
      'Stage_Number': 1,
      'Stage_Name': 'Site Expense Request & Voucher Initiation',
      'What_Task': 'Site supervisor fills expense sheet and attaches bills',
      'Who_Role': 'SITE SUPERVISOR / REQUESTER',
      'Who_Assignee': 'Garima Pal',
      'How_Channel': 'SYSTEM APP / PHYSICAL BILL',
      'SLA_Hours': 1,
      'Gateway_Type': 'STANDARD_ADVANCE',
      'Yes_Condition_Label': 'Submit Voucher',
      'No_Condition_Label': 'Cancel Request',
      'Rejection_Behavior': 'HALT_WORKFLOW',
      'Checkpoints_List': 'Original physical cash memos attached; Expense verified within daily limit',
      'Field_Label': 'Purpose / Description of Expense',
      'Field_Type': 'TEXT',
      'Field_Options': '',
      'Field_Required': 'YES',
      'Field_Placeholder': 'e.g. Emergency diesel purchase for DG Set',
    },
    {
      'Stage_Number': 1,
      'Stage_Name': '',
      'What_Task': '',
      'Who_Role': '',
      'Who_Assignee': '',
      'How_Channel': '',
      'SLA_Hours': '',
      'Gateway_Type': '',
      'Yes_Condition_Label': '',
      'No_Condition_Label': '',
      'Rejection_Behavior': '',
      'Checkpoints_List': '',
      'Field_Label': 'Amount Spent (₹)',
      'Field_Type': 'NUMBER',
      'Field_Options': '',
      'Field_Required': 'YES',
      'Field_Placeholder': 'e.g. 3500',
    },
    {
      'Stage_Number': 1,
      'Stage_Name': '',
      'What_Task': '',
      'Who_Role': '',
      'Who_Assignee': '',
      'How_Channel': '',
      'SLA_Hours': '',
      'Gateway_Type': '',
      'Yes_Condition_Label': '',
      'No_Condition_Label': '',
      'Rejection_Behavior': '',
      'Checkpoints_List': '',
      'Field_Label': 'Site / Location',
      'Field_Type': 'SELECT',
      'Field_Options': 'Siladehi Site, Bijetala Site, Raipur Workshop, Head Office',
      'Field_Required': 'YES',
      'Field_Placeholder': '',
    },
    {
      'Stage_Number': 1,
      'Stage_Name': '',
      'What_Task': '',
      'Who_Role': '',
      'Who_Assignee': '',
      'How_Channel': '',
      'SLA_Hours': '',
      'Gateway_Type': '',
      'Yes_Condition_Label': '',
      'No_Condition_Label': '',
      'Rejection_Behavior': '',
      'Checkpoints_List': '',
      'Field_Label': 'Cash Memo / Bill Photo Link',
      'Field_Type': 'URL',
      'Field_Options': '',
      'Field_Required': 'NO',
      'Field_Placeholder': 'Google Drive link or upload reference',
    },
    {
      'Stage_Number': 2,
      'Stage_Name': 'Project Manager Verification & Approval',
      'What_Task': 'Review site supervisor expense justification against site log',
      'Who_Role': 'PROJECT MANAGER',
      'Who_Assignee': 'Ashis Pathnayak',
      'How_Channel': 'SYSTEM APP',
      'SLA_Hours': 2,
      'Gateway_Type': 'APPROVAL_DECISION',
      'Yes_Condition_Label': 'Approve & Forward to Accounts',
      'No_Condition_Label': 'Reject / Return for Clarification',
      'Rejection_Behavior': 'RETURN_TO_PREVIOUS',
      'Checkpoints_List': 'Physical site logbook verified; Expense necessity verified against BOQ',
      'Field_Label': 'Approval Status',
      'Field_Type': 'APPROVAL',
      'Field_Options': 'APPROVED, REJECTED',
      'Field_Required': 'YES',
      'Field_Placeholder': '',
    },
    {
      'Stage_Number': 2,
      'Stage_Name': '',
      'What_Task': '',
      'Who_Role': '',
      'Who_Assignee': '',
      'How_Channel': '',
      'SLA_Hours': '',
      'Gateway_Type': '',
      'Yes_Condition_Label': '',
      'No_Condition_Label': '',
      'Rejection_Behavior': '',
      'Checkpoints_List': '',
      'Field_Label': 'Manager Approval Remarks',
      'Field_Type': 'TEXTAREA',
      'Field_Options': '',
      'Field_Required': 'NO',
      'Field_Placeholder': 'Enter notes or reason if rejected',
    },
    {
      'Stage_Number': 3,
      'Stage_Name': 'Accounts Cash / UPI Disbursement',
      'What_Task': 'Disburse petty cash to supervisor and update cash ledger',
      'Who_Role': 'ACCOUNTS EXECUTIVE',
      'Who_Assignee': 'Pranjal Agrawal',
      'How_Channel': 'BANK UPI / CASH VOUCHER',
      'SLA_Hours': 2,
      'Gateway_Type': 'VERIFY_CLOSE',
      'Yes_Condition_Label': 'Disbursed & Ledger Updated',
      'No_Condition_Label': 'Hold Payment',
      'Rejection_Behavior': 'HALT_WORKFLOW',
      'Checkpoints_List': 'Cash voucher signed or UPI UTR reference saved; Cash register updated',
      'Field_Label': 'Disbursement Mode',
      'Field_Type': 'SELECT',
      'Field_Options': 'UPI Transfer, Cash Handover, Bank NEFT',
      'Field_Required': 'YES',
      'Field_Placeholder': '',
    },
    {
      'Stage_Number': 3,
      'Stage_Name': '',
      'What_Task': '',
      'Who_Role': '',
      'Who_Assignee': '',
      'How_Channel': '',
      'SLA_Hours': '',
      'Gateway_Type': '',
      'Yes_Condition_Label': '',
      'No_Condition_Label': '',
      'Rejection_Behavior': '',
      'Checkpoints_List': '',
      'Field_Label': 'Bank / UPI Transaction Reference (UTR)',
      'Field_Type': 'TEXT',
      'Field_Options': '',
      'Field_Required': 'YES',
      'Field_Placeholder': 'e.g. UTR38491823901',
    },
  ];

  const wsStages = XLSX.utils.json_to_sheet(stagesData);
  wsStages['!cols'] = [
    { wch: 12 }, // Stage_Number
    { wch: 38 }, // Stage_Name
    { wch: 45 }, // What_Task
    { wch: 28 }, // Who_Role
    { wch: 20 }, // Who_Assignee
    { wch: 25 }, // How_Channel
    { wch: 10 }, // SLA_Hours
    { wch: 22 }, // Gateway_Type
    { wch: 25 }, // Yes_Condition_Label
    { wch: 25 }, // No_Condition_Label
    { wch: 22 }, // Rejection_Behavior
    { wch: 45 }, // Checkpoints_List
    { wch: 30 }, // Field_Label
    { wch: 14 }, // Field_Type
    { wch: 35 }, // Field_Options
    { wch: 14 }, // Field_Required
    { wch: 30 }, // Field_Placeholder
  ];
  XLSX.utils.book_append_sheet(wb, wsStages, 'Stages_And_Fields');

  // 3. Sheet 3: Reference_Guide (Column definitions & rules)
  const guideData = [
    { 'Column Header': 'Stage_Number', 'Required?': 'YES', 'Description & Allowed Values': '1, 2, 3... Group fields under the same stage number or leave blank to continue previous stage.' },
    { 'Column Header': 'Stage_Name', 'Required?': 'YES (on 1st row of stage)', 'Description & Allowed Values': 'Clear operational name (e.g. "Director Approval", "Physical Inspection").' },
    { 'Column Header': 'What_Task', 'Required?': 'NO', 'Description & Allowed Values': 'Explanation of what must be achieved in this step.' },
    { 'Column Header': 'Who_Role', 'Required?': 'NO', 'Description & Allowed Values': 'Operational title (e.g. STORE KEEPER, PURCHASE MANAGER, FINANCE EA).' },
    { 'Column Header': 'Who_Assignee', 'Required?': 'NO', 'Description & Allowed Values': 'Staff member name assigned by default.' },
    { 'Column Header': 'How_Channel', 'Required?': 'NO', 'Description & Allowed Values': 'How action is performed (e.g. SYSTEM APP, WHATSAPP, PHYSICAL, FORM, CALL).' },
    { 'Column Header': 'SLA_Hours', 'Required?': 'NO (Default: 1)', 'Description & Allowed Values': 'Allowed turnaround time in hours (e.g. 1, 2, 4, 8, 24, 48, 72). 0 means no time limit.' },
    { 'Column Header': 'Gateway_Type', 'Required?': 'NO', 'Description & Allowed Values': 'STANDARD_ADVANCE (normal next step), APPROVAL_DECISION (Yes/No approval), CONDITIONAL_JUMP, VERIFY_CLOSE (final step).' },
    { 'Column Header': 'Rejection_Behavior', 'Required?': 'NO', 'Description & Allowed Values': 'RETURN_TO_PREVIOUS (sends back 1 step) or HALT_WORKFLOW (stops entire workflow).' },
    { 'Column Header': 'Checkpoints_List', 'Required?': 'NO', 'Description & Allowed Values': 'Semicolon-separated SOP items to tick off (e.g. "Check bin; Verify PO; Call driver").' },
    { 'Column Header': 'Field_Label', 'Required?': 'NO', 'Description & Allowed Values': 'Form input title for data entry (e.g. "Amount to Be Paid", "Vendor Name").' },
    { 'Column Header': 'Field_Type', 'Required?': 'NO (Default: TEXT)', 'Description & Allowed Values': 'TEXT, NUMBER, SELECT, APPROVAL, DATE, URL, FILE, TEXTAREA.' },
    { 'Column Header': 'Field_Options', 'Required?': 'For SELECT / APPROVAL', 'Description & Allowed Values': 'Comma-separated choices (e.g. "Option A, Option B, Option C").' },
    { 'Column Header': 'Field_Required', 'Required?': 'NO (Default: NO)', 'Description & Allowed Values': 'YES or NO.' },
  ];
  const wsGuide = XLSX.utils.json_to_sheet(guideData);
  wsGuide['!cols'] = [{ wch: 22 }, { wch: 14 }, { wch: 70 }];
  XLSX.utils.book_append_sheet(wb, wsGuide, 'Reference_Guide');

  // 4. Sheet 4: Shift_And_SLA_Rules (Organization Day Shift, Lunch Break, Working Week & Delay Display)
  const shiftRulesData = [
    {
      'Shift & Calendar Parameter': 'Day Shift Hours',
      'Configured Value': '09:30 AM to 06:30 PM',
      'How It Works': 'SLA turnaround timer ONLY counts working minutes inside this window. Tasks arriving before 09:30 AM start at 09:30 AM. Tasks in progress at 06:30 PM pause until next morning 09:30 AM.',
    },
    {
      'Shift & Calendar Parameter': 'Lunch Break Window',
      'Configured Value': '01:30 PM to 02:30 PM (1 Hour)',
      'How It Works': 'The SLA timer automatically pauses for 60 minutes during lunch hour and resumes at 02:30 PM without penalizing the assignee.',
    },
    {
      'Shift & Calendar Parameter': 'Working Week Schedule',
      'Configured Value': 'Monday through Saturday',
      'How It Works': 'Official 6 working days per week. Work carries forward across consecutive weekdays.',
    },
    {
      'Shift & Calendar Parameter': 'Weekly Off (Sunday)',
      'Configured Value': 'Sunday (Clock Paused)',
      'How It Works': 'Sunday is non-working. If a 2-hour task starts Saturday at 05:30 PM, 1 hour runs Saturday (until 06:30 PM), Sunday is skipped entirely, and the remaining 1 hour runs Monday 09:30 AM to 10:30 AM.',
    },
    {
      'Shift & Calendar Parameter': 'Delay Variance Display',
      'Configured Value': '- hh:mm:ss format',
      'How It Works': 'Any task completed or overdue past its planned deadline displays with a leading minus sign (e.g. - 02:45:30 or - 00:30:00). Tasks on schedule display 00:00:00.',
    },
    {
      'Shift & Calendar Parameter': 'Google Forms Integration',
      'Configured Value': 'NO (100% In-App Web Forms)',
      'How It Works': 'Zero external Google Form redirects. All fields, checklists, attachments, and approvals are completed directly inside the web application.',
    },
  ];
  const wsShiftRules = XLSX.utils.json_to_sheet(shiftRulesData);
  wsShiftRules['!cols'] = [{ wch: 28 }, { wch: 32 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsShiftRules, 'Shift_And_SLA_Rules');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

/**
 * Triggers a direct browser file download for the pre-formatted Excel template.
 */
export function downloadFmsExcelTemplate(fileName = 'FMS_Workflow_Template_Builder.xlsx'): void {
  const bytes = generateFmsExcelTemplate();
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Parses an uploaded Excel (.xlsx) or CSV file into a complete FmsTemplateDefinition.
 */
export async function parseFmsExcelFile(file: File): Promise<FmsImportResult> {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const wb = XLSX.read(arrayBuffer, { type: 'array' });

    if (!wb.SheetNames || wb.SheetNames.length === 0) {
      return { success: false, error: 'The uploaded file does not contain any readable sheets.' };
    }

    // Read Workflow_Master sheet or fallback to first sheet
    let masterSheet = wb.Sheets['Workflow_Master'];
    let stagesSheet = wb.Sheets['Stages_And_Fields'];

    // If specific sheet names are not found, look for any sheet with "stage" or use first/second sheets
    if (!stagesSheet) {
      for (const name of wb.SheetNames) {
        if (name.toLowerCase().includes('stage') || name.toLowerCase().includes('field')) {
          stagesSheet = wb.Sheets[name];
          break;
        }
      }
      if (!stagesSheet) {
        // Fallback: second sheet if exists, otherwise first sheet
        stagesSheet = wb.SheetNames.length > 1 ? wb.Sheets[wb.SheetNames[1]] : wb.Sheets[wb.SheetNames[0]];
      }
    }

    if (!masterSheet && wb.SheetNames.length > 1) {
      masterSheet = wb.Sheets[wb.SheetNames[0]];
    }

    // Parse Master Metadata
    let workflowName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
    let departmentHub = 'GENERAL';
    let referenceLabel = 'Reference No.';
    let defaultPriority: Priority = 'Normal';
    let description = '';

    if (masterSheet) {
      const masterRows = XLSX.utils.sheet_to_json<any>(masterSheet);
      for (const row of masterRows) {
        const prop = (row['Property'] || row['property'] || row['Key'] || row['key'] || '').toString().trim().toLowerCase();
        const val = (row['Value'] || row['value'] || '').toString().trim();
        if (!val) continue;

        if (prop.includes('workflow name') || prop.includes('template name') || prop.includes('name')) {
          workflowName = val;
        } else if (prop.includes('department') || prop.includes('hub')) {
          departmentHub = val.toUpperCase().replace(/\s+/g, '_');
        } else if (prop.includes('reference') || prop.includes('label')) {
          referenceLabel = val;
        } else if (prop.includes('priority')) {
          if (['Urgent', 'Critical', 'High'].includes(val)) defaultPriority = 'Urgent';
          else if (['Low'].includes(val)) defaultPriority = 'Low';
          else defaultPriority = 'Normal';
        } else if (prop.includes('description') || prop.includes('sop')) {
          description = val;
        }
      }
    }

    if (!stagesSheet) {
      return { success: false, error: 'Could not locate the Stages_And_Fields sheet in the workbook.' };
    }

    const stageRows = XLSX.utils.sheet_to_json<any>(stagesSheet);
    if (!stageRows || stageRows.length === 0) {
      return { success: false, error: 'The Stages_And_Fields sheet is empty. Please add at least 1 stage.' };
    }

    const stagesMap = new Map<number, {
      stageNumber: number;
      stageName: string;
      what: string;
      whoRole: string;
      whoAssignee: string;
      howChannel: string;
      slaHours: number;
      gatewayType: string;
      yesConditionLabel: string;
      noConditionLabel: string;
      rejectionBehavior: string;
      checkpoints: string[];
      fields: FmsStageFieldConfig[];
    }>();

    let currentStageNum = 1;
    let totalFields = 0;

    for (let rIdx = 0; rIdx < stageRows.length; rIdx++) {
      const row = stageRows[rIdx];

      // Extract raw properties with case insensitivity
      const rawStageNum = row['Stage_Number'] ?? row['Stage Number'] ?? row['Stage_No'] ?? row['stage_number'];
      const rawStageName = row['Stage_Name'] ?? row['Stage Name'] ?? row['stage_name'] ?? '';
      const rawWhat = row['What_Task'] ?? row['What'] ?? row['Task'] ?? row['what_task'] ?? '';
      const rawWhoRole = row['Who_Role'] ?? row['Who Role'] ?? row['Role'] ?? row['who_role'] ?? '';
      const rawWhoAssignee = row['Who_Assignee'] ?? row['Who Assignee'] ?? row['Assignee'] ?? row['who_assignee'] ?? '';
      const rawHowChannel = row['How_Channel'] ?? row['How Channel'] ?? row['How'] ?? row['how_channel'] ?? '';
      const rawSlaHours = row['SLA_Hours'] ?? row['SLA Hours'] ?? row['SLA'] ?? row['sla_hours'];
      const rawGateway = row['Gateway_Type'] ?? row['Gateway Type'] ?? row['gateway_type'] ?? '';
      const rawYesLabel = row['Yes_Condition_Label'] ?? row['Yes Label'] ?? row['yes_condition_label'] ?? '';
      const rawNoLabel = row['No_Condition_Label'] ?? row['No Label'] ?? row['no_condition_label'] ?? '';
      const rawRejection = row['Rejection_Behavior'] ?? row['Rejection Behavior'] ?? row['rejection_behavior'] ?? '';
      const rawCheckpoints = row['Checkpoints_List'] ?? row['Checkpoints'] ?? row['checkpoints_list'] ?? '';

      const rawFieldLabel = row['Field_Label'] ?? row['Field Label'] ?? row['field_label'] ?? '';
      const rawFieldType = row['Field_Type'] ?? row['Field Type'] ?? row['field_type'] ?? 'TEXT';
      const rawFieldOptions = row['Field_Options'] ?? row['Field Options'] ?? row['Options'] ?? row['field_options'] ?? '';
      const rawFieldReq = row['Field_Required'] ?? row['Field Required'] ?? row['Required'] ?? row['field_required'] ?? '';
      const rawFieldPlaceholder = row['Field_Placeholder'] ?? row['Placeholder'] ?? row['field_placeholder'] ?? '';

      // Determine stage number
      if (rawStageNum !== undefined && rawStageNum !== '' && !isNaN(parseInt(rawStageNum, 10))) {
        currentStageNum = parseInt(rawStageNum, 10);
      }

      // Ensure stage exists in map
      if (!stagesMap.has(currentStageNum)) {
        const slaParsed = rawSlaHours !== undefined && !isNaN(parseInt(rawSlaHours, 10)) ? parseInt(rawSlaHours, 10) : 1;
        const cpList = rawCheckpoints
          ? rawCheckpoints.toString().split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0)
          : [];

        stagesMap.set(currentStageNum, {
          stageNumber: currentStageNum,
          stageName: rawStageName ? rawStageName.toString().trim() : `Stage ${currentStageNum}`,
          what: rawWhat ? rawWhat.toString().trim() : '',
          whoRole: rawWhoRole ? rawWhoRole.toString().trim() : 'Operations Staff',
          whoAssignee: rawWhoAssignee ? rawWhoAssignee.toString().trim() : 'Ashis Pathnayak',
          howChannel: rawHowChannel ? rawHowChannel.toString().trim() : 'SYSTEM APP',
          slaHours: Math.max(0, slaParsed),
          gatewayType: rawGateway ? rawGateway.toString().trim() : 'STANDARD_ADVANCE',
          yesConditionLabel: rawYesLabel ? rawYesLabel.toString().trim() : 'Approve / Advance',
          noConditionLabel: rawNoLabel ? rawNoLabel.toString().trim() : 'Reject / Return',
          rejectionBehavior: rawRejection ? rawRejection.toString().trim() : 'HALT_WORKFLOW',
          checkpoints: cpList,
          fields: [],
        });
      } else {
        // If this row also defines or updates stage name / properties
        const stg = stagesMap.get(currentStageNum)!;
        if (rawStageName && !stg.stageName.startsWith('Stage ') && stg.stageName !== rawStageName) {
          stg.stageName = rawStageName.toString().trim();
        }
        if (rawWhat) stg.what = rawWhat.toString().trim();
        if (rawWhoRole) stg.whoRole = rawWhoRole.toString().trim();
        if (rawWhoAssignee) stg.whoAssignee = rawWhoAssignee.toString().trim();
        if (rawHowChannel) stg.howChannel = rawHowChannel.toString().trim();
        if (rawCheckpoints) {
          const extraCps = rawCheckpoints.toString().split(';').map((s: string) => s.trim()).filter((s: string) => s.length > 0);
          for (const cp of extraCps) {
            if (!stg.checkpoints.includes(cp)) stg.checkpoints.push(cp);
          }
        }
      }

      // Add field if Field_Label is provided
      if (rawFieldLabel && rawFieldLabel.toString().trim().length > 0) {
        const stg = stagesMap.get(currentStageNum)!;
        const fieldCount = stg.fields.length + 1;
        const cleanType = (rawFieldType.toString().trim().toUpperCase()) as any;
        const validTypes = ['TEXT', 'NUMBER', 'SELECT', 'APPROVAL', 'STATUS_DONE', 'URL', 'TEXTAREA', 'DATE', 'FILE'];
        const finalType = validTypes.includes(cleanType) ? cleanType : 'TEXT';

        let opts: string[] | undefined = undefined;
        if (['SELECT', 'APPROVAL'].includes(finalType) && rawFieldOptions) {
          opts = rawFieldOptions.toString().split(',').map((o: string) => o.trim()).filter((o: string) => o.length > 0);
        } else if (finalType === 'APPROVAL') {
          opts = ['APPROVED', 'REJECTED'];
        }

        const isReq = ['YES', 'TRUE', '1', 'Y'].includes(rawFieldReq.toString().trim().toUpperCase());

        stg.fields.push({
          id: `field_${currentStageNum}_${fieldCount}`,
          label: rawFieldLabel.toString().trim(),
          type: finalType,
          options: opts,
          required: isReq,
          placeholder: rawFieldPlaceholder ? rawFieldPlaceholder.toString().trim() : undefined,
        });

        totalFields++;
      }
    }

    if (stagesMap.size === 0) {
      return { success: false, error: 'No valid stages could be parsed from the sheet.' };
    }

    // Convert map to sorted FmsStageTemplate array
    const sortedStageKeys = Array.from(stagesMap.keys()).sort((a, b) => a - b);
    const finalStages: FmsStageTemplate[] = sortedStageKeys.map((num, idx) => {
      const s = stagesMap.get(num)!;
      return {
        stageId: `STG-IMPORTED-${idx + 1}`,
        stageName: s.stageName,
        whoRole: s.whoRole,
        whoDefaultAssignee: s.whoAssignee,
        howChannel: s.howChannel,
        slaHours: s.slaHours,
        logic: {
          slaHours: s.slaHours,
          gatewayType: (s.gatewayType as any) || 'STANDARD_ADVANCE',
          rejectionBehavior: (s.rejectionBehavior as any) || 'HALT_WORKFLOW',
          yesConditionLabel: s.yesConditionLabel || 'Approve (YES)',
          noConditionLabel: s.noConditionLabel || 'Reject (NO)',
        },
        fields: s.fields,
        checkpoints: s.checkpoints.length > 0 ? s.checkpoints : [
          'Process completed as per SOP specifications',
          'Supporting verification checked',
        ],
      };
    });

    const now = new Date().toLocaleDateString('en-GB');
    const importedTemplate: FmsTemplateDefinition = {
      id: `imported_${Date.now()}`,
      templateKey: `CUSTOM_${workflowName.toUpperCase().replace(/[^A-Z0-9]+/g, '_').slice(0, 30)}_${Date.now() % 10000}`,
      name: workflowName,
      departmentHub: departmentHub,
      referenceLabel: referenceLabel || 'Reference No.',
      defaultPriority: defaultPriority,
      description: description || `Imported workflow containing ${finalStages.length} sequential stages.`,
      stages: finalStages,
      createdAt: now,
      updatedAt: now,
      isCustom: true,
    };

    return {
      success: true,
      template: importedTemplate,
      stageCount: finalStages.length,
      fieldCount: totalFields,
    };
  } catch (err: any) {
    return {
      success: false,
      error: `Failed to parse Excel file: ${err?.message || 'Unknown parsing error'}`,
    };
  }
}

/**
 * Generates the EXACT Horizontal Multi-Stage Matrix spreadsheet (.xlsx)
 * matching the user's shared spreadsheet layout (INDENT TO PO.html / matrix layout):
 * Row 1: Merged Title & Shift/Lunch Rules Banner
 * Row 2: WHAT (Stage Name merged across 4 columns)
 * Row 3: WHO  (Stage Assignee merged across 4 columns)
 * Row 4: HOW  (Stage Channel merged across 4 columns)
 * Row 5: WHEN (Sub-columns: Planned | Actual | Status | Delay per stage)
 * Row 6+: Requisition Rows with real dates, statuses, and - hh:mm:ss delay format!
 */
export function generateFmsHorizontalMatrixWorkbook(
  flows: FmsInstance[],
  workflowTitle = 'INDENT TO PO (PURCHASE DEPARTMENT FMS)',
  customStages?: Array<{ name: string; assignee: string; how: string; slaHours?: number }>,
  shiftConfig?: WorkShiftConfig
): Uint8Array {
  const wb = XLSX.utils.book_new();
  const shift = shiftConfig || storageAdapter.getRegistryConfig().workShiftConfig || DEFAULT_WORK_SHIFT_CONFIG;

  // Determine the reference stages to map across the horizontal matrix
  let stagesHeader: Array<{ name: string; assignee: string; how: string; slaHours?: number }> = [];

  if (customStages && customStages.length > 0) {
    stagesHeader = customStages;
  } else if (flows.length > 0 && flows[0].stages && flows[0].stages.length > 0) {
    stagesHeader = flows[0].stages.map((s, idx) => ({
      name: `${idx + 1}. ${s.stageName}`,
      assignee: s.assignee || 'Assigned Officer',
      how: s.how || 'IN-APP FORM',
      slaHours: 2,
    }));
  } else {
    // Default fallback to 12 stages of Indent to PO from user's sheet
    stagesHeader = [
      { name: '1. INDENT RECIEVE', assignee: 'Amanat Bharadwaj (Store Manager)', how: 'WHATSAPP / CALL / PHYSICAL', slaHours: 1 },
      { name: '2. DEGRADED MATERIAL CHECK', assignee: 'Bramhanand Patel (Asst. Mgr Purchase)', how: 'PHYSICAL CHECK', slaHours: 1 },
      { name: '3. RETURN OF DEGRADED MATERIAL FORM', assignee: 'Shyam Rao Sureshe (Purchase Exec)', how: 'IN-APP FORM', slaHours: 1 },
      { name: '4. PURCHASE APPROVAL', assignee: 'Pranay Ghosh (Project Manager)', how: 'MANUAL SHEET / IN-APP', slaHours: 3 },
      { name: '5. GET QUOTATION', assignee: 'Bramhanand Patel', how: 'CALL / EMAIL', slaHours: 25 },
      { name: '6. GET APPROVAL FOR QUOTATION', assignee: 'Pranay Ghosh', how: 'IN-APP APPROVAL', slaHours: 12 },
      { name: '7. COMPARATIVE STATEMENT', assignee: 'Bramhanand Patel', how: 'EXCEL COMPARATIVE', slaHours: 1 },
      { name: '8. PO CREATION', assignee: 'Shyam Rao Sureshe', how: 'ERP / SYSTEM', slaHours: 2 },
      { name: '9. PO APPROVAL', assignee: 'Pranay Ghosh / MD', how: 'IN-APP APPROVAL', slaHours: 2 },
      { name: '10. ADVANCE PAYMENT DECISION', assignee: 'Bramhanand Patel', how: 'CHECKPOINT (YES/NO)', slaHours: 1 },
      { name: '11. SEND FOR PAYMENT', assignee: 'Shyam Rao Sureshe', how: 'PAYMENT DOSSIER', slaHours: 2 },
      { name: '12. MATERIAL COLLECTION PO', assignee: 'Shyam Rao Sureshe', how: 'IN-APP FORM / DISPATCH', slaHours: 1 },
    ];
  }

  const baseColsCount = 7; // S.No, Date, Indent No, Site, Item Details, Priority, Status
  const totalCols = baseColsCount + stagesHeader.length * 4;

  const aoa: any[][] = [];

  // Row 1 (Index 0): Title Banner & Shift Operating Parameters
  const row1 = new Array(totalCols).fill('');
  row1[0] = `BARBRIK OPERATIONS — ${workflowTitle.toUpperCase()} | SHIFT: ${shift.shiftStartTime || '09:30'} - ${shift.shiftEndTime || '18:30'} | LUNCH: ${shift.lunchStartTime || '13:30'} - ${shift.lunchEndTime || '14:30'} | WORK WEEK: MON-SAT (SUN OFF) | DELAY FORMAT: - hh:mm:ss`;
  aoa.push(row1);

  // Row 2 (Index 1): WHAT
  const row2 = new Array(totalCols).fill('');
  row2[0] = 'WHAT';
  row2[1] = 'Requisition Information';
  stagesHeader.forEach((stg, i) => {
    const colIdx = baseColsCount + i * 4;
    row2[colIdx] = stg.name;
  });
  aoa.push(row2);

  // Row 3 (Index 2): WHO
  const row3 = new Array(totalCols).fill('');
  row3[0] = 'WHO';
  row3[1] = 'Responsible Assignee';
  stagesHeader.forEach((stg, i) => {
    const colIdx = baseColsCount + i * 4;
    row3[colIdx] = stg.assignee;
  });
  aoa.push(row3);

  // Row 4 (Index 3): HOW
  const row4 = new Array(totalCols).fill('');
  row4[0] = 'HOW';
  row4[1] = 'Execution Channel / Tool';
  stagesHeader.forEach((stg, i) => {
    const colIdx = baseColsCount + i * 4;
    row4[colIdx] = stg.how;
  });
  aoa.push(row4);

  // Row 5 (Index 4): Sub-column headers (WHEN)
  const row5 = new Array(totalCols).fill('');
  row5[0] = 'S.No';
  row5[1] = 'Indent Date';
  row5[2] = 'Indent No.';
  row5[3] = 'Site Name';
  row5[4] = 'Item Details / Vendor';
  row5[5] = 'Priority';
  row5[6] = 'Overall Status';

  stagesHeader.forEach((_, i) => {
    const colIdx = baseColsCount + i * 4;
    row5[colIdx] = 'Planned';
    row5[colIdx + 1] = 'Actual';
    row5[colIdx + 2] = 'Status';
    row5[colIdx + 3] = 'Delay';
  });
  aoa.push(row5);

  // Row 6+ (Index 5+): Live Data Rows
  if (flows && flows.length > 0) {
    flows.forEach((flow, fIdx) => {
      const dataRow = new Array(totalCols).fill('');
      dataRow[0] = fIdx + 1;
      dataRow[1] = flow.indentDate || flow.createdAt?.slice(0, 10) || '01/10/2026';
      dataRow[2] = flow.indentNo || flow.poNumber || flow.requisitionNumber || flow.flowId;
      dataRow[3] = flow.siteName || 'RAIPUR';
      dataRow[4] = flow.remarks || flow.vendorName || (flow.poAmount ? `PO ₹${flow.poAmount.toLocaleString('en-IN')}` : 'General Requisition Items');
      dataRow[5] = flow.priority || 'Normal';
      dataRow[6] = flow.status || 'In Progress';

      stagesHeader.forEach((_, sIdx) => {
        const colIdx = baseColsCount + sIdx * 4;
        const stageExec = flow.stages?.[sIdx];

        if (stageExec) {
          dataRow[colIdx] = stageExec.plannedDateTime || '—';
          dataRow[colIdx + 1] = stageExec.actualDateTime || '—';
          dataRow[colIdx + 2] = stageExec.status || 'Pending';

          // Format delay strictly as - hh:mm:ss taking shift, lunch & Sundays into account!
          const delayRes = calculateWorkingHoursDelay(stageExec.plannedDateTime, stageExec.actualDateTime, shift);
          dataRow[colIdx + 3] = delayRes.formattedDelay;
        } else {
          dataRow[colIdx] = '—';
          dataRow[colIdx + 1] = '—';
          dataRow[colIdx + 2] = 'Pending';
          dataRow[colIdx + 3] = '00:00:00';
        }
      });

      aoa.push(dataRow);
    });
  } else {
    // Add 3 sample/blank rows for the user to fill in Excel
    for (let sampleIdx = 1; sampleIdx <= 3; sampleIdx++) {
      const sampleRow = new Array(totalCols).fill('');
      sampleRow[0] = sampleIdx;
      sampleRow[1] = '12/10/2026';
      sampleRow[2] = `IND-${800 + sampleIdx}`;
      sampleRow[3] = sampleIdx === 1 ? 'SILADEHI' : sampleIdx === 2 ? 'BIJETALA' : 'RAIPUR';
      sampleRow[4] = sampleIdx === 1 ? 'Structural Insulators & Hardware' : 'Emergency Workshop Spares';
      sampleRow[5] = sampleIdx === 1 ? 'Urgent' : 'Normal';
      sampleRow[6] = 'In Progress';

      stagesHeader.forEach((_, sIdx) => {
        const colIdx = baseColsCount + sIdx * 4;
        sampleRow[colIdx] = sIdx === 0 ? '12/10/2026 10:30:00' : '—';
        sampleRow[colIdx + 1] = sIdx === 0 && sampleIdx === 1 ? '12/10/2026 10:15:00' : '—';
        sampleRow[colIdx + 2] = sIdx === 0 && sampleIdx === 1 ? 'Done' : sIdx === 0 ? 'In Progress' : 'Pending';
        sampleRow[colIdx + 3] = '00:00:00';
      });

      aoa.push(sampleRow);
    }
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Set merges for Row 1 (Banner) and Rows 2-4 (WHAT, WHO, HOW across 4 cols per stage)
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } }, // Banner
    { s: { r: 1, c: 0 }, e: { r: 1, c: baseColsCount - 1 } }, // WHAT label
    { s: { r: 2, c: 0 }, e: { r: 2, c: baseColsCount - 1 } }, // WHO label
    { s: { r: 3, c: 0 }, e: { r: 3, c: baseColsCount - 1 } }, // HOW label
  ];

  stagesHeader.forEach((_, i) => {
    const colIdx = baseColsCount + i * 4;
    merges.push({ s: { r: 1, c: colIdx }, e: { r: 1, c: colIdx + 3 } }); // WHAT stage title
    merges.push({ s: { r: 2, c: colIdx }, e: { r: 2, c: colIdx + 3 } }); // WHO assignee
    merges.push({ s: { r: 3, c: colIdx }, e: { r: 3, c: colIdx + 3 } }); // HOW channel
  });

  ws['!merges'] = merges;

  // Set column widths
  const colWidths = [
    { wch: 8 },  // S.No
    { wch: 14 }, // Date
    { wch: 16 }, // Indent No
    { wch: 14 }, // Site
    { wch: 35 }, // Item Details
    { wch: 12 }, // Priority
    { wch: 15 }, // Status
  ];
  stagesHeader.forEach(() => {
    colWidths.push({ wch: 20 }); // Planned
    colWidths.push({ wch: 20 }); // Actual
    colWidths.push({ wch: 14 }); // Status
    colWidths.push({ wch: 15 }); // Delay (- hh:mm:ss)
  });
  ws['!cols'] = colWidths;

  const sheetName = workflowTitle.includes('INDENT') ? 'INDENT_TO_PO_TRACKER' : 'FMS_MATRIX_TRACKER';
  XLSX.utils.book_append_sheet(wb, ws, sheetName);

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

/**
 * Generates and downloads the exact 15-column BENEFICIARY_MASTER Google Sheet layout
 * Cols A-I: Form Submission, Cols J-O: Connected 3-Stage FMS Execution
 */
export function downloadBeneficiaryMasterExcel(
  flows: FmsInstance[],
  fileName = 'BENEFICIARY_MASTER_GOOGLE_SHEET.xlsx'
): void {
  const wb = XLSX.utils.book_new();
  const benFlows = flows.filter(f => f.flowType === 'BENEFICIARY_APPROVAL');
  const targetFlows = benFlows.length > 0 ? benFlows : flows;

  const aoa: any[][] = [];

  // Banner Row
  aoa.push([
    'ACCOUNTS & FINANCE DEPARTMENT — VENDOR BENEFICIARY MASTER & 3-STAGE APPROVAL WORKFLOW (Cols A-I: In-App Form | Cols J-O: FMS Stages)'
  ]);

  // Headers (Row 2)
  aoa.push([
    'Sheet No.',
    'Timestamp',
    'Name of Beneficiary',
    'Account No.',
    'IFSC Code',
    'Bank Name',
    'Purpose',
    'CANCELLED CHEQUE / PASSBOOK',
    'Remark',
    'Status (Stage 1: Approval)',
    'Approval Timestamp',
    'Beneficiary Entry (Stage 2: NetBanking)',
    'Beneficiary Entry Timestamp',
    'Addition Status (Stage 3: Bank Activation)',
    'Addition Timestamp'
  ]);

  if (targetFlows.length > 0) {
    targetFlows.forEach((flow) => {
      const stg1 = flow.stages?.[0];
      const stg2 = flow.stages?.[1];
      const stg3 = flow.stages?.[2];

      aoa.push([
        flow.beneficiarySheetNo || flow.indentNo || flow.flowId,
        flow.createdAt || flow.indentDate || '—',
        flow.beneficiaryName || '—',
        flow.beneficiaryAccountNo || '—',
        flow.beneficiaryIfsc || '—',
        flow.beneficiaryBankName || '—',
        flow.beneficiaryPurpose || flow.remarks || '—',
        flow.cancelledChequeUrl || 'Google Drive',
        flow.remarks || '—',
        stg1?.status === 'Done' ? (stg1.submittedData?.status || 'APPROVED') : (stg1?.status || 'Pending'),
        stg1?.actualDateTime || stg1?.submittedData?.approvalTimestamp || '—',
        stg2?.status === 'Done' ? (stg2.submittedData?.beneficiaryEntry || 'Done') : (stg2?.status || 'Pending'),
        stg2?.actualDateTime || stg2?.submittedData?.beneficiaryEntryTimestamp || '—',
        stg3?.status === 'Done' ? (stg3.submittedData?.additionStatus || 'Done') : (stg3?.status || 'Pending'),
        stg3?.actualDateTime || stg3?.submittedData?.additionTimestamp || '—'
      ]);
    });
  } else {
    // Sample Row
    aoa.push([
      'BPL/BEN/20260919/01',
      '19-09-2026 15:56:46',
      'NOTEBOOK GALLERY',
      '9826295153',
      'KKBK0000132',
      'KOTAK MAHINDRA BANK',
      'FOR PAYMENT OF MSI MONITOR',
      'https://drive.google.com/open?id=1jB_2MKeXk6i4saBtKi0IRmOGX3_PPBVT',
      'Vendor Registration for IT Equipment',
      'APPROVED',
      '2026-09-01 16:25:53',
      'Done',
      '2026-09-12 11:33:27',
      'Done',
      '2026-09-12 11:30:21'
    ]);
  }

  const ws = XLSX.utils.aoa_to_sheet(aoa);

  // Auto-fit column widths
  ws['!cols'] = [
    { wch: 22 }, // Sheet No.
    { wch: 20 }, // Timestamp
    { wch: 26 }, // Name of Beneficiary
    { wch: 18 }, // Account No.
    { wch: 14 }, // IFSC Code
    { wch: 24 }, // Bank Name
    { wch: 32 }, // Purpose
    { wch: 40 }, // Cancelled Cheque
    { wch: 24 }, // Remark
    { wch: 24 }, // Status
    { wch: 22 }, // Approval Timestamp
    { wch: 30 }, // Beneficiary Entry
    { wch: 24 }, // Beneficiary Entry Timestamp
    { wch: 32 }, // Addition Status
    { wch: 22 }  // Addition Timestamp
  ];

  XLSX.utils.book_append_sheet(wb, ws, 'BENEFICIARY_MASTER');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const bytes = new Uint8Array(excelBuffer);

  const blob = new Blob([bytes as unknown as BlobPart], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Triggers direct browser download for the exact horizontal multi-stage matrix spreadsheet
 */
export function downloadFmsHorizontalMatrixExcel(
  flows: FmsInstance[],
  workflowTitle?: string,
  fileName?: string
): void {
  const bytes = generateFmsHorizontalMatrixWorkbook(flows, workflowTitle);
  const finalName = fileName || `${(workflowTitle || 'FMS_Horizontal_Matrix_Tracker').replace(/[^a-zA-Z0-9_-]+/g, '_')}.xlsx`;
  const blob = new Blob([bytes as unknown as BlobPart], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = finalName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
