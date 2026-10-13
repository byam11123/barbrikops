import * as XLSX from 'xlsx';
import { CentralRegistryConfig, DepartmentDefinition, FmsTemplateDefinition } from '../types';
import { storageAdapter } from './storageAdapter';
import { DEFAULT_WORK_SHIFT_CONFIG } from './workShiftService';
import { BENEFICIARY_MIGRATION_MAPPINGS } from './migrationEngine';

/**
 * Generates an Excel workbook (.xlsx) containing the full Central Registry:
 * 1. Sheet 1: Shift_And_Working_Hours (Day shift, lunch break, working week, delay format)
 * 2. Sheet 2: Department_Master (All departments, keys, IDs, icons)
 * 3. Sheet 3: Google_Spreadsheets_Registry (Spreadsheet IDs, Tab IDs, Drive Folders)
 * 4. Sheet 4: FMS_Workflows_Master (All registered workflow pipelines & SLAs)
 * 5. Sheet 5: SLA_Operational_Rules (Explanation of shift rollovers, lunch deductions & - hh:mm:ss display)
 */
export function generateCentralRegistryExcelWorkbook(config: CentralRegistryConfig): Uint8Array {
  const wb = XLSX.utils.book_new();
  const shift = config.workShiftConfig || DEFAULT_WORK_SHIFT_CONFIG;

  // 1. Sheet 1: Shift_And_Working_Hours
  const shiftData = [
    {
      'Parameter': 'Organization Name',
      'Configured Value': config.organizationName || 'BarBrik Operations & Engineering',
      'Operational Meaning': 'Official enterprise identity',
    },
    {
      'Parameter': 'Shift Start Time',
      'Configured Value': shift.shiftStartTime || '09:30',
      'Operational Meaning': 'Morning reporting hour. SLA clock starts here on working days.',
    },
    {
      'Parameter': 'Shift End Time',
      'Configured Value': shift.shiftEndTime || '18:30',
      'Operational Meaning': 'Evening closing hour. Remaining SLA hours roll over to next morning.',
    },
    {
      'Parameter': 'Lunch Break Start Time',
      'Configured Value': shift.lunchStartTime || '13:30',
      'Operational Meaning': 'SLA timer automatically pauses when this time is reached.',
    },
    {
      'Parameter': 'Lunch Break End Time',
      'Configured Value': shift.lunchEndTime || '14:30',
      'Operational Meaning': 'SLA timer resumes counting working minutes after lunch.',
    },
    {
      'Parameter': 'Working Days of Week',
      'Configured Value': 'Monday to Saturday',
      'Operational Meaning': 'Official 6-day operating week (Mon, Tue, Wed, Thu, Fri, Sat).',
    },
    {
      'Parameter': 'Weekly Off Day',
      'Configured Value': 'Sunday',
      'Operational Meaning': 'Tasks crossing Saturday evening skip Sunday entirely and resume Monday 09:30 AM.',
    },
    {
      'Parameter': 'Time Delay Display Format',
      'Configured Value': '- hh:mm:ss',
      'Operational Meaning': 'All delays are formatted with leading minus sign e.g. - 02:45:30. On-time tasks display 00:00:00.',
    },
    {
      'Parameter': 'Google Forms Integration',
      'Configured Value': 'NO (100% Native In-App)',
      'Operational Meaning': 'Zero redirection to external Google Forms. All entries and approvals happen in Next.js.',
    },
    {
      'Parameter': 'Primary Storage Engine',
      'Configured Value': config.activeDataSource || 'HYBRID_TRANSITION',
      'Operational Meaning': 'HYBRID_TRANSITION (Next.js validates rules, writes to Sheets, logs to DB).',
    },
  ];

  const wsShift = XLSX.utils.json_to_sheet(shiftData);
  wsShift['!cols'] = [{ wch: 28 }, { wch: 38 }, { wch: 65 }];
  XLSX.utils.book_append_sheet(wb, wsShift, 'Shift_And_Working_Hours');

  // 2. Sheet 2: Department_Master
  const departments = storageAdapter.getDepartments();
  const deptData = departments.map((d: DepartmentDefinition) => ({
    'Department Key': d.key,
    'Department Name': d.name,
    'ID': d.id,
    'Description': d.description || '',
    'Icon': d.icon || 'Building2',
    'Created At': d.createdAt,
    'Status': d.isDefault ? 'SYSTEM_DEFAULT' : 'CUSTOM_DEPARTMENT',
  }));

  const wsDept = XLSX.utils.json_to_sheet(deptData);
  wsDept['!cols'] = [{ wch: 18 }, { wch: 26 }, { wch: 20 }, { wch: 45 }, { wch: 15 }, { wch: 14 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, wsDept, 'Department_Master');

  // 3. Sheet 3: Google_Spreadsheets_Registry
  const registryData = [
    { 'Registry Item': 'FMS Requisitions Spreadsheet ID', 'Value / ID': config.sheetsConfig.fmsSpreadsheetId, 'Tab Name': config.sheetsConfig.fmsSheetTabId },
    { 'Registry Item': 'Delegation (DTA) Spreadsheet ID', 'Value / ID': config.sheetsConfig.delegationSpreadsheetId, 'Tab Name': config.sheetsConfig.delegationSheetTabId },
    { 'Registry Item': 'Checklist Compliance Spreadsheet ID', 'Value / ID': config.sheetsConfig.checklistSpreadsheetId, 'Tab Name': config.sheetsConfig.checklistSheetTabId },
    { 'Registry Item': 'Inventory (IMS) Spreadsheet ID', 'Value / ID': config.sheetsConfig.inventorySpreadsheetId, 'Tab Name': config.sheetsConfig.inventorySheetTabId },
    { 'Registry Item': 'Google Workspace Shared Drive Root ID', 'Value / ID': config.driveConfig.sharedDriveId, 'Tab Name': 'Shared Org Root' },
    { 'Registry Item': 'Bills & Invoices Archive Folder ID', 'Value / ID': config.driveConfig.billsAndInvoicesFolderId, 'Tab Name': 'Accounts Dossiers' },
    { 'Registry Item': 'Purchase Orders Approved Folder ID', 'Value / ID': config.driveConfig.purchaseOrdersFolderId, 'Tab Name': 'Signed PO PDFs' },
    { 'Registry Item': 'Site Checklist Evidence Photos Folder ID', 'Value / ID': config.driveConfig.evidencePhotosFolderId, 'Tab Name': 'Site Visual Proof' },
    { 'Registry Item': 'Beneficiary Master Spreadsheet ID', 'Value / ID': '1mQ_ACCOUNTS_FINANCE_2026_BEN_SPREADSHEET', 'Tab Name': 'BENEFICIARY_MASTER (Cols A to O)' },
    { 'Registry Item': 'Beneficiary Cheque/Passbook Proofs Folder ID', 'Value / ID': '1jB_DRIVE_BENEFICIARY_PROOFS_FOLDER', 'Tab Name': 'Shared Drive / Finance / Cheques' },
  ];

  const wsReg = XLSX.utils.json_to_sheet(registryData);
  wsReg['!cols'] = [{ wch: 36 }, { wch: 38 }, { wch: 24 }];
  XLSX.utils.book_append_sheet(wb, wsReg, 'Google_Spreadsheets_Registry');

  // 4. Sheet 4: FMS_Workflows_Master
  const templates = storageAdapter.getAllMasterTemplates();
  const tplData = templates.map((t: FmsTemplateDefinition) => ({
    'Template Key': t.templateKey,
    'Workflow Title': t.name,
    'Department Hub': t.departmentHub,
    'Reference Label': t.referenceLabel,
    'Default Priority': t.defaultPriority,
    'Total Stages': t.stages.length,
    'Total SLA Hours': t.stages.reduce((acc, s) => acc + (s.slaHours || 0), 0),
    'Custom Workflow?': t.isCustom ? 'YES' : 'BUILTIN',
  }));

  const wsTpl = XLSX.utils.json_to_sheet(tplData);
  wsTpl['!cols'] = [{ wch: 26 }, { wch: 42 }, { wch: 20 }, { wch: 18 }, { wch: 15 }, { wch: 14 }, { wch: 16 }, { wch: 18 }];
  XLSX.utils.book_append_sheet(wb, wsTpl, 'FMS_Workflows_Master');

  // 5. Sheet 5: SLA_Operational_Rules
  const rulesData = [
    {
      'Rule Topic': '1. Active Shift Working Window',
      'Rule Detail': `Operating shift is from ${shift.shiftStartTime || '09:30'} to ${shift.shiftEndTime || '18:30'}. Only hours worked inside this window count towards turnaround SLA.`,
    },
    {
      'Rule Topic': '2. 1-Hour Lunch Break Deduction',
      'Rule Detail': `Lunch break is from ${shift.lunchStartTime || '13:30'} to ${shift.lunchEndTime || '14:30'}. Any task in progress during lunch pauses its timer and resumes at 14:30 without penalty.`,
    },
    {
      'Rule Topic': '3. Weekly Off (Sunday)',
      'Rule Detail': 'Work shifts run Monday through Saturday. Sunday is non-working. If a task starts Friday at 17:30 with 2 hrs SLA: 1 hr runs Friday (until 18:30), remaining 1 hr runs Saturday 09:30-10:30. If assigned Saturday 17:30 with 2 hrs SLA, it skips Sunday completely and targets Monday 10:30 AM.',
    },
    {
      'Rule Topic': '4. Delay Display Format',
      'Rule Detail': 'Delays are displayed as negative elapsed working hours in - hh:mm:ss format (e.g. - 02:45:30). Tasks completed on or ahead of planned time display 00:00:00.',
    },
    {
      'Rule Topic': '5. In-App Stage Actions',
      'Rule Detail': 'All form completions, approvals, document uploads, and stage advancements are performed in the web app. Actual completion timestamps are stamped automatically upon submission.',
    },
  ];

  const wsRules = XLSX.utils.json_to_sheet(rulesData);
  wsRules['!cols'] = [{ wch: 28 }, { wch: 80 }];
  XLSX.utils.book_append_sheet(wb, wsRules, 'SLA_Operational_Rules');

  // 6. Sheet 6: Beneficiary_Master_15_Cols
  const benMappingData = BENEFICIARY_MIGRATION_MAPPINGS.map((m) => ({
    'Google Sheet Column': m.sheetColumn,
    'PostgreSQL Target Column': m.postgresColumn,
    'Data Type': m.postgresType,
    'Validation Rule': m.validationRule,
    'Architectural Notes': m.notes,
  }));
  const wsBen = XLSX.utils.json_to_sheet(benMappingData);
  wsBen['!cols'] = [{ wch: 30 }, { wch: 28 }, { wch: 20 }, { wch: 38 }, { wch: 55 }];
  XLSX.utils.book_append_sheet(wb, wsBen, 'Beneficiary_Master_15_Cols');

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(excelBuffer);
}

/**
 * Triggers direct browser download for Central Registry & Shift Master workbook
 */
export function downloadCentralRegistryExcel(config: CentralRegistryConfig, fileName = 'Central_Registry_And_Shift_Master.xlsx'): void {
  const bytes = generateCentralRegistryExcelWorkbook(config);
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
