# Implementation Plan - Site to Site Complete Materials FMS

## Overview
Create and integrate the new **"Site to Site Complete Materials FMS"** (`SITE_TO_SITE_MATERIALS`) representing the complete material lifecycle across **Site → Store → Purchase → Account → Store → Site**.

---

## 1. Master Template Catalog Metadata
* **FMS ID**: `tpl_site_to_site_materials`
* **Display Name**: Site to Site Complete Materials FMS
* **Code Prefix**: `BPL/SSPASS/2026/`
* **Primary Hub**: `PURCHASE` (Purchase & Procurement)
* **Default Priority Options**: `Normal`, `Urgent`, `Very Urgent`

---

## 2. Configured Stage Breakdown

### Stage 1: RECEIVE MATERIAL REQUISITION (Site Stage)
* **WHAT**: RECEIVE MATERIAL REQUISITION
* **WHO**: Amanat Bharadwaj (Role: `REQUESTER` / `STORE MANAGER`)
* **HOW**: IN-APP FORM
* **WHEN**: WHENEVER NEEDED
* **Header Form Fields**:
  - `indentNo`: Text (`IND-2026-001`)
  - `indentDate`: Date Picker
  - `siteLocation`: Select Dropdown (Active Site Locations)
  - `priority`: Select Dropdown (`Normal`, `Urgent`, `Very Urgent`)
  - `uploadedIndentFile`: File Upload
* **Multi-Item Grid Columns**:
  1. `#` (Line number)
  2. `itemDescription` (Text / Material select)
  3. `qty` (Numeric)
  4. `unit` (Select: Bags, MT, Nos, Pcs, Ltrs, Meters)
  5. `requestedBy` (Text)
  6. `remark` (Text)

---

### Stage 2: CHECK STOCK (Store Stage)
* **WHAT**: CHECK STOCK
* **WHO**: Amanat Bharadwaj (Role: `STORE MANAGER`)
* **HOW**: IN-APP FORM
* **WHEN**: 4 Hours SLA
* **Fields & Verification**:
  - **Requisition Summary**: Displays carried-forward Indent No., Date, Site Location, Priority, and uploaded Indent file from Stage 1.
  - **Multi-Item Stock Verification Grid**:
    1. `#` & `itemDescription` (Carried forward from Stage 1)
    2. `requestedQty` & `unit` (Carried forward from Stage 1)
    3. `availableStockQty` (Editable numerical input)
    4. `shortageQty` (Calculated auto-field: `requestedQty - availableStockQty`)
    5. `lineAction` (Dropdown: `In-Stock / Direct Issue`, `Transfer from Other Site Store`, `Purchase Indent Needed`)
  - **Store Decision Checkpoint**:
    - `overallStockStatus`: Dropdown (`Fully In-Stock`, `Partially In-Stock`, `Out of Stock`)
    - `storeKeeperRemarks`: Text notes
    - `stockInspectionReport`: File Upload

---

### Stage 3: IS MATERIAL PURCHASE REQUIRED? (Store Stage)
* **WHAT**: IS MATERIAL PURCHASE REQUIRED?
* **WHO**: Amanat Bharadwaj (Role: `STORE MANAGER`)
* **HOW**: WHATSAPP / EMAIL / PHYSICALLY
* **WHEN**: 4 Hours SLA
* **Form & Decision Fields**:
  - **Purchase Decision Toggle**: `Yes` (Material Purchase Required) / `No` (No Purchase Needed - Stock Available / Local Resolution)
  - **Communication Mode Recorded**: Select Dropdown (`WhatsApp`, `Email`, `Physically / In-Person`)
  - **Storekeeper Notes**: Text field capturing rationale and communication summary.

---

### Subsequent Pipeline Overview
4. **Stage 4: PURCHASE REQUISITION & QUOTATION COMPARATIVE** (Purchase Hub)
5. **Stage 5: ACCOUNT VOUCHER & PAYMENT APPROVAL** (Account Hub)
6. **Stage 6: STORE MATERIAL RECEIPT & MRN** (Store Hub)
7. **Stage 7: SITE DISPATCH & ACKNOWLEDGEMENT** (Site Hub)

---

## 3. Technical Implementation Tasks
1. **`src/types/index.ts`**:
   - Add `SITE_TO_SITE_MATERIALS` to `FmsTemplateType`.
2. **`src/data/initialData.ts`**:
   - Register `tpl_site_to_site_materials` in `SYSTEM_BUILTIN_TEMPLATES` with Stage 1, Stage 2, Stage 3 and subsequent stages.
3. **`src/components/fms/StageFormModal.tsx`**:
   - Implement custom stage renderers for Stage 1, Stage 2 (stock calculation grid), and Stage 3 (Purchase required toggle + communication mode).
4. **UI Catalog & Creation Integration**:
   - Include template in Template Studio, Create FMS modal, and Purchase Hub list.
