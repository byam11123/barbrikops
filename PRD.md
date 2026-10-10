# Product Requirements Document (PRD)
## BarBrik Central Ops — Organization Workflow & Operations Management Platform

---

### Document Control
- **Document Title**: Product Requirements Document (PRD) — Central Operations Platform
- **Organization**: BarBrik Group
- **Version**: 1.0.0 (Production Blueprint)
- **Author**: Senior Product Architect & Full-Stack Systems Engineer
- **Status**: Approved for Phased Rollout & Migration
- **Target Tech Stack**: Next.js (App Router), TypeScript, Tailwind CSS, Google Workspace APIs (Sheets, Drive, Forms), PostgreSQL / Supabase Migration Layer

---

## 1. Executive Summary & Product Vision

### 1.1 Vision
To unite all organizational operations, multi-site procurement pipelines, task delegations, recurring compliance checklists, and store inventory management into a **single, unified, high-density web control application (BarBrik Central Ops)**.

### 1.2 Core Architectural Principle
- **Web Application as Master Control Layer**: Next.js provides a responsive, role-adaptive, dropdown-first interface for staff across all sites (Siladehi, Bijetala, Raipur).
- **Google Sheets as Transitional Data Layer**: Existing department Google Sheets remain the operational record/reporting layer during transition without breaking spreadsheet automations.
- **Migration-Friendly Database Boundary**: Business logic and data access are abstracted through storage/repository adapters, enabling seamless migration from Google Sheets to relational PostgreSQL/Supabase without rewriting frontend components.
- **Strict Separation of Secrets**: No Google service-account secrets, OAuth refresh tokens, private keys, or credentials are ever exposed to the client browser. All actions route through server-side validated API handlers.
- **Stable ID System**: Strict ban on using spreadsheet row numbers as permanent identifiers; all records use immutable, enterprise-grade business IDs.

---

## 2. Problem Statement & Operational Background

### 2.1 Current State & Friction Points
Historically, departments operated via independent Google Spreadsheets with custom Google Apps Script menus:
1. **Menu Fragmentation**: Staff were forced to memorize distinct Apps Script custom menus across 10+ spreadsheets.
2. **Rollout Duplication**: Creating standard department sheets required duplicate template copying, leading to version drift.
3. **Manual Weekly Monitoring**: Management lacked a single pane of glass to track overdue tasks, delayed purchase approvals, and stockout risks.
4. **Data Corruption Risk**: Manual cell edits in Google Sheets occasionally overwrote formulas or validation dropdowns.

### 2.2 Desired Future State
One central responsive web portal where:
- Staff complete daily checklists, delegate tasks, execute purchase flow stages, and track store inventory without touching raw spreadsheet cells.
- Executives (Managing Director, HODs, Process Coordinators) have real-time scoreboard metrics, SLA bottleneck alerts, and 1-click batch approvals.
- Google Drive remains the repository for official bills, invoices, photos, and compliance evidence.
- Google Forms remain available for lightweight field submissions, integrated via webhook and central registry mapping.

---

## 3. Phased Architecture & Migration Roadmap

| Phase | Duration | Primary Source of Truth | Key Deliverables & Milestones |
|---|---|---|---|
| **Phase 1: Central Web Control (Current MVP)** | Weeks 1–4 | Google Sheets API v4 + Local Storage Cache | • Unified Work Hub ("My Work")<br>• High-Density Enterprise Matrix for FMS (1000+ scale)<br>• Checklist Compliance with Cycle Auto Rollout<br>• Task Delegation (DTA) with SLA Revision tracking<br>• Central Registry of Sheet IDs & Drive Folders<br>• Process Coordinator (PC Desk) delay remarks & nudges |
| **Phase 2: Hybrid Server-Side Sync & Google Workspace OAuth** | Weeks 5–8 | Google Workspace Shared Drive + Backend Proxy | • Server-side Route Handlers for idempotent batch updates<br>• Direct Google Drive evidence file upload integration<br>• Real-time webhook ingest for Google Forms field submissions<br>• Centralized append-only audit trail logging |
| **Phase 3: Database Source of Truth Migration** | Weeks 9–14 | PostgreSQL / Supabase with Sheets Read-Replica | • Migration of high-risk transactional modules (Inventory, Stage Approvals, Financial Invoices)<br>• One-way background sync from PostgreSQL back into Google Sheets for spreadsheet-based executive reporting<br>• Deprecation of direct Apps Script menu mutations |

---

## 4. User Personas & Role-Based Access Control (RBAC)

The system dynamically adapts views and default filter scopes based on the active user profile:

```
+-----------------------------------------------------------------------------------+
|                            BarBrik Central Ops RBAC                               |
+---------------------+-------------------------------+-----------------------------+
| Role Persona        | Operational Focus             | Primary View / Dashboard    |
+---------------------+-------------------------------+-----------------------------+
| Managing Director   | High-value PO approvals,      | Executive Control Cockpit   |
| (e.g. Pranjal)      | org-wide delay bottlenecks    | POV Radar                   |
+---------------------+-------------------------------+-----------------------------+
| Process Coordinator | SLA variance tracking, delay  | Process Coordinator Desk    |
| (e.g. Ritu Sahu)    | remarks, staff nudges         | (PC Control Room)           |
+---------------------+-------------------------------+-----------------------------+
| Head of Department  | Department workload balance,  | Departmental Operations     |
| (HODs / Managers)   | team stage advancement        | Radar                       |
+---------------------+-------------------------------+-----------------------------+
| Executive Assistant | VIP follow-ups, Director      | EA Follow-up & Escalation   |
| (e.g. Monalisa)     | escalations radar             | Command Desk                |
+---------------------+-------------------------------+-----------------------------+
| Operational Staff   | Daily checklist execution,    | "My Work" Unified Task      |
| & Site Engineers    | assigned PO stage processing  | Radar (User Only Default)   |
+---------------------+-------------------------------+-----------------------------+
| Store in Charge     | Inward/Outward movements,     | IMS Store In Charge Radar   |
|                     | minimum stock threshold alerts| & Stock Ledger              |
+---------------------+-------------------------------+-----------------------------+
```

---

## 5. System Modules & Functional Specifications

### 5.1 Module 1: Daily Work Hub ("My Work" Unified Workload Radar)
- **Objective**: Consolidate all tasks belonging to the current user across Checklist, Delegation, and FMS into a single chronological action stream.
- **Key Features**:
  - **4 Top KPI Cards**: Due Today, Overdue, All Pending, Completed.
  - **View Formats**: Standard Cards View and Enterprise Matrix Grid (1000+ scale).
  - **10-Column Data Grid**: Checkbox, Done Toggle, Module Badge, Reference Code, Description, Status, Planned Date/Time, Actual Date/Time, Delay Variance (`HH:MM:SS`), and Quick Actions.
  - **1-Click Batch Approval**: Multi-select requisitions and tasks for mass completion.
  - **Nudge & Remark Drawer**: Log coordination remarks with categorizations (Awaiting Approval, Vendor Followup, Site Issue).

### 5.2 Module 2: MIS Executive Cockpit ("My Scoreboard")
- **Objective**: Provide quantitative health scores across all organization modules without hallucinated numbers.
- **Key Features**:
  - **Process Health & Velocity Radar**: Overall SLA compliance percentage, average stage turnaround hours, on-time delivery rates.
  - **Site-Wise Distribution**: Workload breakdowns across Siladehi, Bijetala, and Raipur sites.
  - **Bottleneck Spotlight**: Immediate ranking of overdue tasks and delayed stage assignees.

### 5.3 Module 3: Flow Management System (FMS Pipeline)
- **Objective**: End-to-end tracking of procurement, site logistics, accounts payments, and plant maintenance workflows.
- **Supported Flow Types**:
  1. `CHECK_STOCK`: Store Stock Availability Check
  2. `INDENT_PURCHASE`: Standard Purchase Requisition to Order
  3. `PO_TO_PAYMENT`: Accounts Purchase Order to Vendor Disbursement
  4. `PURCHASE_TO_STORE_DISPATCH`: Dispatch from Vendor to Central Store
  5. `STORE_TO_SITE_DISPATCH`: Dispatch from Central Store to Project Site
  6. `PAYMENT_TO_DISPATCH`: Payment Clearance to Material Movement
  7. `SITE_RECEIVE`: Project Site Goods Receipt & Inspection
  8. `ACCOUNTS_INVOICE_COLLECTION`: Vendor Invoice Verification & Tax Filing
  9. `HR_ATTENDANCE_PAYMENT`: Labour Attendance Muster to Wage Disbursement
  10. `BREAKDOWN_REPORTING`: Plant & Vehicle Machine Breakdown Remediation
  11. `EQUIPMENT_PART_REPAIR`: Equipment Component Servicing & Testing
  12. `DPR_REPORTING`: Daily Project Progress Reporting
- **View Modes**:
  - **Enterprise Matrix (Default)**: High-density paginated tabular grid designed for 1000+ requisitions with bottom-left rows selector (10, 25, 50, 100).
  - **Operations Kanban**: 4 Columns (Initiated, Active Progression, SLA Bottlenecks, Completed) with highlighted count badges.
  - **Standard Card Feed**: 2-column detailed stage stepper with live form links and yes/no gatekeeping.
- **Interactive KPI Stat Cards**:
  - `Total Pending` (Filters in-progress flows)
  - `Total Completed` (Filters closed flows)
  - `Total Delayed` (Filters SLA overdue bottlenecks)
  - `My Actions` (Filters flows currently waiting for active user's approval)

### 5.4 Module 4: Delegation Task Assignment (DTA Board)
- **Objective**: Digital mirror of Sheet 2 Task Delegation with complete audit trail of deadline revisions.
- **Key Features**:
  - **SLA Revision Control**: First Date, Rev 1, Rev 2, and Latest Revision tracking with total revision counter.
  - **1-Click Week Shift**: Extend task deadlines by +7 days with automatic status transition to `Week Shifted`.
  - **Interactive KPI Cards**: Total Delegated, Pending Execution, Completed, Week Shifted / Revised.
  - **Dropdown-First Filtering**: Unboxed select dropdowns for Scope (Assigned to Me / All Staff), Status, and Assignee.

### 5.5 Module 5: Checklist Compliance Manager
- **Objective**: Manage daily, weekly, and monthly recurring operational compliance checksheets (Sheet 3).
- **Key Features**:
  - **Compliance Progress Bar**: Live percentage calculation with dynamic progress indicator.
  - **Interactive KPI Stat Cards**: Total Checklist Items, Pending Execution, Completed Compliance.
  - **Auto Roll Out Next Cycle**: Auto-generate recurring maintenance items for subsequent cycles.
  - **Dropdown Scope & Frequency Filters**: Fast switching between Weekly, Monthly, and All Frequencies.

### 5.6 Module 6: Inventory Management System (IMS)
- **Objective**: Real-time stock visibility across consumable items, spare parts, structural materials, and equipment.
- **Key Features**:
  - **Stock Level Radar**: High-visibility warning flags when stock falls below `minThreshold`.
  - **Stock Movement Logging**: Inward (Received from PO/Vendor), Outward (Issued to Site/Work Order), and Degraded/Damaged Return workflows.
  - **Degraded Return Integration**: Direct linkage from returned damaged goods back into FMS Repair or Supplier Claim pipelines.

### 5.7 Module 7: Central Registry & Google Workspace Integration
- **Objective**: Manage official Google Spreadsheet IDs, Sheet Tab GIDs, Google Form URLs, and Drive Shared Folders in one configuration screen.
- **Key Features**:
  - Central registry configuration editor with JSON import/export.
  - Dynamic Google Sheets & Drive links for every department pipeline.
  - Reset Seed Data capability for staging and testing environments.

### 5.8 Module 8: Audit Trail & Reversibility Engine
- **Objective**: Immutable, append-only chronological log of every approval, stage advancement, checklist check, and inventory movement.
- **Key Features**:
  - Records Timestamp, User ID, User Name, Module, Action Type (CREATE, UPDATE, DELETE, COMPLETE), Entity ID, and Details.
  - Searchable by User, Entity ID, or Module.

---

## 6. Entity Data Model & Stable Identifier Conventions

To prevent data loss and support seamless migration to PostgreSQL/Supabase, row numbers are never used as permanent IDs.

```
+-----------------------------------------------------------------------------------------+
|                               Stable Business Identifiers                               |
+--------------------+---------------------+----------------------------------------------+
| Entity             | Stable ID Format    | Description                                  |
+--------------------+---------------------+----------------------------------------------+
| User               | `usr-xxx`           | Permanent staff identity and role            |
| FMS Workflow       | `fms-xxx`           | Master pipeline requisition instance         |
| FMS Stage Def      | `stg-xxx`           | Standardized step definition in workflow     |
| Delegation Task    | `del-xxx` / `T-xxx` | Sheet 2 Task Assignment entity               |
| Checklist Item     | `chk-xxx` / `CHK-x` | Sheet 3 Operational Checklist entity         |
| Inventory Item     | `itm-xxx` / `SKU-x` | Stock keeping item entity                    |
| Stock Movement     | `mov-xxx`           | Inward / Outward / Return ledger entry       |
| Process Remark     | `rem-xxx`           | Coordination note logged on a bottleneck     |
| Audit Log Entry    | `aud-xxx`           | Immutable system audit trail record          |
+--------------------+---------------------+----------------------------------------------+
```

### 6.1 Schema Relationships

```
  [User usr-xxx]
        |
        +---> [Assigned FMS Stages (stg-xxx in fms-xxx)]
        |            |
        |            +---> [Process Remarks (rem-xxx)]
        |
        +---> [Delegation Tasks (del-xxx)]
        |
        +---> [Checklist Items (chk-xxx)]
        |
        +---> [Stock Movements (mov-xxx)] ---> [Inventory Item (itm-xxx)]
        |
        +---> [Audit Log Entries (aud-xxx)]
```

---

## 7. UI/UX Constitution & Anti-AI Slop Standards

The application enforces strict design discipline according to the internal Frontend Design Constitution:

1. **Logo-Integrated Sidebar Toggle**: Clicking the central logo "B" box collapses or expands the sidebar navigation, removing ornamental standalone menu buttons.
2. **Zero-Pill Static Metadata**: Informational metadata (timestamps, reference IDs, counts) is rendered as clean unboxed text with subtle typographic separators (`·`, `—`), avoiding candy-colored static pill badge enclosures.
3. **Interactive Control Highlights**: Filter controls and KPI cards are functional elements that highlight cleanly upon selection and clear on second click.
4. **Dropdown-First Architecture**: All scope and filter controls use native-styled, accessible select dropdowns instead of sprawling pill lists.
5. **No Truncated Typography**: Font line heights and vertical padding (`py-0.5`, `leading-normal`) ensure all characters with descenders ("g", "y", "p", "q") render completely.
6. **High-Density Tabular Grids**: All numeric values in matrix tables use tabular monospace numerals (`tabular-nums`) with pagination relocated to the bottom-left table footer.
7. **Icon-Only Action Affordances**: Table action buttons (such as View, Inspect, and Filter switches) use high-clarity Lucide icons with descriptive hover tooltips.

---

## 8. Non-Functional Requirements & Governance

### 8.1 Performance SLAs
- **Client Render Latency**: Initial page interactive state in $< 800\text{ms}$.
- **Filter Response Time**: Client-side filtering and matrix pagination updates in $< 50\text{ms}$.
- **Batch Processing**: Mass approval of 50+ requisitions executes in $< 300\text{ms}$.

### 8.2 Security & Credential Protection
- **No Secret Leakage**: Service account JSON keys, OAuth client secrets, and database connection strings are prohibited from client-side bundles (zero `NEXT_PUBLIC_` secret prefixing).
- **Idempotency**: All stage completions and stock movements generate unique transaction IDs to prevent duplicate processing on unstable connections.
- **Append-Only Logging**: Business data is never permanently deleted without an audit log entry; soft deletions and reversal entries are prioritized.

---

## 9. Verification & Acceptance Criteria

| Feature / Capability | Acceptance Criteria |
|---|---|
| **Logo Sidebar Toggle** | Clicking the logo "B" square smoothly collapses and expands the navigation bar; standalone menu button is removed. |
| **FMS KPI Stat Cards** | Top cards display Total Pending, Total Completed, Total Delayed, and My Actions. Clicking any card immediately filters the table and Kanban board. |
| **High-Density Matrix Header** | Redundant table title banner is removed, allowing the grid to lead directly with column headers. |
| **My Work Column Alignment** | Table header `thead` and row `tbody` align exactly across all 10 columns including Status and Quick Actions. |
| **Checklist & Delegation Cards** | Top KPI cards in Checklist and Delegation boards are clickable and filter data by status with active highlight styling. |
| **Typography & Font Descenders** | Letters "g" in Delegation and "y" in Inventory render fully without horizontal line clipping. |
| **Zero Build & Lint Errors** | `compile_applet` and `lint_applet` pass with 100% success rate on TypeScript strict mode. |

---

*End of Product Requirements Document.*
