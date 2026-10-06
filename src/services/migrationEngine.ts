export const GENERATED_POSTGRES_SCHEMA = `-- =====================================================================
-- BARBRIK CENTRAL OPERATIONS SYSTEM - MIGRATION DDL SCHEMA
-- Compatible with PostgreSQL 15+ / Supabase
-- Target: Zero-downtime transition from Google Sheets & Apps Script
-- =====================================================================

-- 1. Departments & Users Registry
CREATE TABLE IF NOT EXISTS departments (
    department_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    code VARCHAR(32) NOT NULL UNIQUE,
    head_user_id VARCHAR(64),
    google_sheet_id VARCHAR(128),
    google_drive_folder_id VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    user_id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    role VARCHAR(128) NOT NULL,
    department_id VARCHAR(64) REFERENCES departments(department_id),
    phone VARCHAR(32),
    email VARCHAR(255) NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 2. Checklist Management (Replacing Recurring Task Sheets)
CREATE TABLE IF NOT EXISTS checklists (
    id VARCHAR(64) PRIMARY KEY,
    task_id VARCHAR(32) NOT NULL, -- Spreadsheet Task ID (e.g. "270", "319")
    assignee_name VARCHAR(255) NOT NULL,
    accountable_email VARCHAR(255) NOT NULL,
    buddy_email VARCHAR(255),
    department VARCHAR(128) NOT NULL,
    frequency VARCHAR(4) NOT NULL CHECK (frequency IN ('D', 'W', 'M')),
    task_description TEXT NOT NULL,
    planned_date DATE NOT NULL,
    actual_date DATE,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Done', 'Pending', 'Delayed')),
    evidence_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_checklists_planned_date ON checklists(planned_date);
CREATE INDEX IF NOT EXISTS idx_checklists_status ON checklists(status);
CREATE INDEX IF NOT EXISTS idx_checklists_department ON checklists(department);

-- 3. Delegation & Task Assignment (DTA)
CREATE TABLE IF NOT EXISTS delegations (
    id VARCHAR(64) PRIMARY KEY,
    task_id VARCHAR(32) NOT NULL UNIQUE, -- Stable Hash ID (e.g. "vhdlgas", "nfs3wfn")
    assignee_name VARCHAR(255) NOT NULL,
    role_phone VARCHAR(255) NOT NULL,
    task_description TEXT NOT NULL,
    first_date DATE NOT NULL,
    revision_1_date DATE,
    revision_2_date DATE,
    latest_revision_date DATE NOT NULL,
    total_revisions INT NOT NULL DEFAULT 0,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Completed', 'Week Shifted', 'In Progress')),
    priority VARCHAR(16) DEFAULT 'Normal' CHECK (priority IN ('Urgent', 'Normal', 'Low')),
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS delegation_revisions (
    revision_id VARCHAR(64) PRIMARY KEY,
    delegation_id VARCHAR(64) NOT NULL REFERENCES delegations(id) ON DELETE CASCADE,
    revision_number INT NOT NULL,
    previous_date DATE NOT NULL,
    new_date DATE NOT NULL,
    reason TEXT NOT NULL,
    revised_by VARCHAR(255) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 4. FMS (Flow Management System)
CREATE TABLE IF NOT EXISTS fms_flows (
    id VARCHAR(64) PRIMARY KEY,
    flow_id VARCHAR(64) NOT NULL UNIQUE, -- e.g. "FLOW-IND-752"
    flow_type VARCHAR(64) NOT NULL, -- e.g. "INDENT_PURCHASE"
    requisition_number VARCHAR(64),
    indent_no VARCHAR(32) NOT NULL,
    indent_date DATE NOT NULL,
    site_name VARCHAR(128) NOT NULL,
    priority VARCHAR(16) NOT NULL DEFAULT 'Normal' CHECK (priority IN ('Urgent', 'Normal', 'Low')),
    current_stage_id VARCHAR(32) NOT NULL,
    current_stage_index INT NOT NULL DEFAULT 0,
    total_stages INT NOT NULL,
    status VARCHAR(32) NOT NULL DEFAULT 'In Progress' CHECK (status IN ('In Progress', 'Completed', 'On Hold', 'Cancelled')),
    total_delay_hours NUMERIC(8, 2) DEFAULT 0,
    remarks TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fms_stages (
    id VARCHAR(64) PRIMARY KEY,
    flow_id VARCHAR(64) NOT NULL REFERENCES fms_flows(id) ON DELETE CASCADE,
    stage_id VARCHAR(32) NOT NULL,
    stage_number INT NOT NULL,
    stage_name VARCHAR(255) NOT NULL,
    assignee VARCHAR(255) NOT NULL,
    channel_how VARCHAR(128) NOT NULL,
    planned_datetime TIMESTAMPTZ,
    actual_datetime TIMESTAMPTZ,
    status VARCHAR(32) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Done', 'Skipped', 'Delayed')),
    decision_value VARCHAR(16), -- 'Yes', 'No'
    time_delay_hours NUMERIC(8, 2) DEFAULT 0,
    form_ref_url TEXT,
    evidence_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

-- 5. Inventory Management System (IMS)
CREATE TABLE IF NOT EXISTS inventory_items (
    id VARCHAR(64) PRIMARY KEY,
    item_id VARCHAR(64) NOT NULL UNIQUE, -- e.g. "ITEM-IT-001"
    name VARCHAR(255) NOT NULL,
    category VARCHAR(64) NOT NULL,
    location VARCHAR(128) NOT NULL,
    current_stock NUMERIC(12, 2) NOT NULL DEFAULT 0,
    min_threshold NUMERIC(12, 2) NOT NULL DEFAULT 0,
    unit VARCHAR(32) NOT NULL,
    condition VARCHAR(64) NOT NULL DEFAULT 'Good',
    last_checked_date DATE,
    return_degraded_sheet_ref VARCHAR(128),
    created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS inventory_movements (
    id VARCHAR(64) PRIMARY KEY,
    transaction_id VARCHAR(64) NOT NULL UNIQUE,
    item_id VARCHAR(64) NOT NULL REFERENCES inventory_items(item_id),
    movement_type VARCHAR(32) NOT NULL CHECK (movement_type IN ('RECEIVE', 'ISSUE', 'RETURN_DEGRADED', 'TRANSFER', 'ADJUSTMENT')),
    quantity NUMERIC(12, 2) NOT NULL,
    source_location VARCHAR(128) NOT NULL,
    destination_location VARCHAR(128) NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    reference_doc VARCHAR(128),
    initiated_by VARCHAR(255) NOT NULL,
    notes TEXT
);

-- 6. Append-Only Operational Audit Log
CREATE TABLE IF NOT EXISTS audit_logs (
    audit_id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
    user_id VARCHAR(64) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    module VARCHAR(32) NOT NULL,
    action VARCHAR(32) NOT NULL,
    entity_id VARCHAR(64) NOT NULL,
    details TEXT NOT NULL,
    delta_json JSONB
);

CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON audit_logs(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity ON audit_logs(entity_id);
`;

export interface MigrationMapping {
  sheetColumn: string;
  postgresColumn: string;
  postgresType: string;
  validationRule: string;
  notes: string;
}

export const FMS_MIGRATION_MAPPINGS: MigrationMapping[] = [
  { sheetColumn: 'Timestamp (Col A)', postgresColumn: 'created_at', postgresType: 'TIMESTAMPTZ', validationRule: 'Valid date/time format', notes: 'Initial indent submission' },
  { sheetColumn: 'Requisition Number (Col B)', postgresColumn: 'requisition_number', postgresType: 'VARCHAR(64)', validationRule: 'Optional alphanumeric', notes: 'Internal PR reference' },
  { sheetColumn: 'Indent No. (Col C)', postgresColumn: 'indent_no', postgresType: 'VARCHAR(32)', validationRule: 'Mandatory numeric/alphanumeric', notes: 'Unique indent tracking number' },
  { sheetColumn: 'Indent Date (Col D)', postgresColumn: 'indent_date', postgresType: 'DATE', validationRule: 'DD/MM/YYYY parsed to ISO', notes: 'Requisition origin date' },
  { sheetColumn: 'Site Name (Col E)', postgresColumn: 'site_name', postgresType: 'VARCHAR(128)', validationRule: 'From Site Master list', notes: 'SILADEHI, BIJETALA, RAIPUR, etc.' },
  { sheetColumn: 'Priority (Col F)', postgresColumn: 'priority', postgresType: 'VARCHAR(16)', validationRule: 'Urgent / Normal / Low', notes: 'Governs SLA escalation' },
  { sheetColumn: 'Stage Planned/Actual (Cols H-AY)', postgresColumn: 'fms_stages.*', postgresType: 'TABLE fms_stages', validationRule: 'Normalized 1-to-many relationship', notes: 'Decoupled from 50-column flat spreadsheet row!' }
];

export const DELEGATION_MIGRATION_MAPPINGS: MigrationMapping[] = [
  { sheetColumn: 'Task ID (Col A)', postgresColumn: 'task_id', postgresType: 'VARCHAR(32)', validationRule: 'Unique stable random hash', notes: 'Replaces row index' },
  { sheetColumn: 'Name & Phone (Col B)', postgresColumn: 'assignee_name, role_phone', postgresType: 'VARCHAR(255)', validationRule: 'Normalized to User Profile foreign key', notes: 'Parsed phone and staff identity' },
  { sheetColumn: 'Task (Col C)', postgresColumn: 'task_description', postgresType: 'TEXT', validationRule: 'Non-empty string', notes: 'Operational objective' },
  { sheetColumn: 'First Date (Col D)', postgresColumn: 'first_date', postgresType: 'DATE', validationRule: 'Valid target date', notes: 'Original promised deadline' },
  { sheetColumn: 'Revision 1 / 2 (Col E/F)', postgresColumn: 'delegation_revisions', postgresType: 'TABLE delegation_revisions', validationRule: 'Audit logged with reasons', notes: 'Allows infinite revisions without expanding sheet columns' },
  { sheetColumn: 'Latest Revision (Col G)', postgresColumn: 'latest_revision_date', postgresType: 'DATE', validationRule: 'Current effective deadline', notes: 'Computed or overridden' },
  { sheetColumn: 'Status (Col I)', postgresColumn: 'status', postgresType: 'VARCHAR(32)', validationRule: 'Pending, Completed, Week Shifted', notes: 'State machine status' }
];

export const CHECKLIST_MIGRATION_MAPPINGS: MigrationMapping[] = [
  { sheetColumn: 'Name & Phone (Col A)', postgresColumn: 'assignee_name', postgresType: 'VARCHAR(255)', validationRule: 'String', notes: 'Staff member' },
  { sheetColumn: 'Email (Col B)', postgresColumn: 'accountable_email', postgresType: 'VARCHAR(255)', validationRule: 'Valid email', notes: 'Accountable user' },
  { sheetColumn: 'Department (Col C)', postgresColumn: 'department', postgresType: 'VARCHAR(128)', validationRule: 'Department list', notes: 'Store, IT, Structure, etc.' },
  { sheetColumn: 'Task ID (Col D)', postgresColumn: 'task_id', postgresType: 'VARCHAR(32)', validationRule: 'Master checklist code', notes: 'Standard maintenance task ID' },
  { sheetColumn: 'Freq (Col E)', postgresColumn: 'frequency', postgresType: 'VARCHAR(4)', validationRule: 'D, W, M', notes: 'Daily, Weekly, Monthly frequency' },
  { sheetColumn: 'Task (Col F)', postgresColumn: 'task_description', postgresType: 'TEXT', validationRule: 'Non-empty string', notes: 'Specific checklist step' },
  { sheetColumn: 'Planned (Col G)', postgresColumn: 'planned_date', postgresType: 'DATE', validationRule: 'Date', notes: 'Scheduled execution' },
  { sheetColumn: 'Actual (Col H)', postgresColumn: 'actual_date', postgresType: 'DATE', validationRule: 'Date when marked done', notes: 'Execution verification' },
  { sheetColumn: 'Status (Col I)', postgresColumn: 'status', postgresType: 'VARCHAR(32)', validationRule: 'Done, Pending, Delayed', notes: 'Compliance state' }
];
