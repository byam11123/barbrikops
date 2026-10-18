# Requisition Triage, Physical Stock Check & Stage-Wise Quantity Revision

Transform Stage 1 Material Requisition and Stage 2 Check Stock into an operational triage system tailored for construction sites: eliminating daily fluctuating rates from initial requisition, supporting hands-on physical store checks without pre-existing computer inventory, enabling stage-wise quantity adjustments with audit tracking, and automatically splitting line items into Store Dispatch and Purchase Indent sub-workflows.

> [!IMPORTANT]
> **Summary of User Requirements & Revisions in This Plan**:
> 1. **No Estimated Rates in Stage 1**: Site engineers do not know current material prices because daily market rates fluctuate. Estimated Rate (₹) and Total Amount (₹) are completely removed from Stage 1 Requisition and template defaults. Pricing remains strictly downstream in Vendor Quotations and Comparative Statements (CS).
> 2. **Physical Stock Check Without Computer Inventory**: Currently, there is no computer inventory database. During Stage 2 (`Check Stock`), the store in-charge conducts a physical inspection of bins/shelves, records the physically verified count (`Physical Stock Found`) and `Bin / Shelf Location`, which serves as the baseline for upcoming daily store audits.
> 3. **Stage-Wise Quantity Revision**: The store in-charge can adjust the requested quantity based on the specific work/purpose (e.g., requested 10 bags, store approves 8 bags: 5 from physical store, 3 to purchase) with a required revision note. Downstream purchasers can also adjust quantity if MOQ or packaging requires it, while preserving original requested quantity for audit comparison.
> 4. **Intelligent Indent Split & Auto-Spawning**: Once Stage 2 is submitted, items are split into:
>    - **Store Dispatch**: Automatically spawns a linked `STORE_TO_SITE_DISPATCH` workflow for items available in the store.
>    - **Purchase Indent**: Automatically spawns a linked `INDENT_PURCHASE` workflow for items requiring procurement.
>    - **Hold / Archive**: Items deferred with reason preserved in the audit log.

---

### 1. Overview & Core Concept

- **What It Does**:
  - **Stage 1 (Site Engineer / Requester)**: Simple, rate-free requisition slip capturing `Item Description`, `Requested Qty`, `Unit`, `Work / Purpose Details` (e.g., "Pier 4 foundation concreting"), and `Remarks`.
  - **Stage 2 (Store In-Charge)**: Physical store check modal where the store manager records physical count found on the shelf, assesses the work necessity, revises/approves the total quantity, and allocates items into **Store Stock**, **Purchase Indent**, and **Hold/Archive**.
  - **Automated Dispatch & Purchase Routing**: Submitting Stage 2 instantly creates linked child workflows: a Store Dispatch workflow for items in stock and a Purchase Indent workflow for items to buy.
- **Target Audience**:
  - **Site Engineers**: Quick requisition without needing financial rates or unit costs.
  - **Store Keepers / Process Coordinators**: Physical store check, quantity validation, and clear dispatch/procurement routing.
  - **Management / Auditors**: Full visibility into original vs. revised quantities and reason audit log.

---

### 2. User Experience & Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 1: MATERIAL REQUISITION (Site Engineer)                                              │
│ [ No Rate / No Total Amount — Simplified Field Capture ]                                   │
│  Item Description           Requested Qty   Unit     Work / Purpose Details      Remarks    │
│  ─────────────────────────  ─────────────   ──────   ─────────────────────────   ─────────  │
│  OPC 53 Cement              10              Bags     Pier 4 Foundation Pour      Urgent     │
│  20mm Aggregate             15              MT       Pier 4 Foundation Pour      -          │
│  MS Binding Wire            2               Bundles  Pier 4 Reinforcement        Standard   │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                                           ▼ Submit Requisition
┌─────────────────────────────────────────────────────────────────────────────────────────────┐
│ STAGE 2: PHYSICAL STORE CHECK & TRIAGE (Store In-Charge)                                    │
│                                                                                             │
│  Item: OPC 53 Cement (Requested: 10 Bags for "Pier 4 Foundation Pour")                      │
│  ┌───────────────────────────┬───────────────────────────────────────────────────────────┐  │
│  │ Physical Check in Store:  │ Approved Qty: 8 Bags (-2 reduced: "Site already has 2")   │  │
│  │ Physical Found: 5 Bags    ├───────────────────────────────────────────────────────────┤  │
│  │ Bin / Shelf: Rack A-04    │ Triage Allocation:                                        │  │
│  │                           │ • From Store Stock:    5 Bags  ──► [To Store Dispatch]    │  │
│  │                           │ • To Purchase Indent:  3 Bags  ──► [To Purchase Process]  │  │
│  │                           │ • Hold / Deferred:     0 Bags                             │  │
│  └───────────────────────────┴───────────────────────────────────────────────────────────┘  │
│                                                                                             │
│  [✓ Submit & Generate Dispatch + Purchase Indents]                                          │
└─────────────────────────────────────────────────────────────────────────────────────────────┘
                                           │
                      ┌────────────────────┴────────────────────┐
                      ▼                                         ▼
┌──────────────────────────────────────────┐  ┌──────────────────────────────────────────┐
│ CHILD FLOW 1: STORE MATERIAL DISPATCH    │  │ CHILD FLOW 2: PURCHASE INDENT TO PO      │
│ Ref: BPL/STK/001-DISP                    │  │ Ref: BPL/STK/001-PUR                     │
│ Items:                                   │  │ Items:                                   │
│ • OPC 53 Cement: 5 Bags (Bin Rack A-04)  │  │ • OPC 53 Cement: 3 Bags                  │
│ • 20mm Aggregate: 10 MT (Yard Bay 2)     │  │ • 20mm Aggregate: 5 MT                   │
│                                          │  │ (Vendor Quotation & Rate CS happen here) │
└──────────────────────────────────────────┘  └──────────────────────────────────────────┘
```

#### Key Visual & UX Patterns
1. **Zero Financial Fields in Requisition**:
   - Requisition entry tables show only operational and purpose columns.
   - Clean Indian metric units dropdown (`Bags`, `MT`, `Nos`, `Liters`, `Kgs`, `Bundles`, `Boxes`, `Feet`).
2. **Physical Store Check Cards in Stage 2**:
   - High-contrast inspection box with emerald badges for physical verification.
   - Dual numeric inputs: `Physical Stock Found` and `Store Bin / Shelf Ref` (e.g., "Bin C-12", "Yard Bay 1").
   - Revision difference pill: highlights when approved quantity deviates from requested quantity (e.g., `↓ 2 Reduced`, `↑ 5 Increased`).
3. **Allocation Row Inputs**:
   - Live validation: `Store Qty + Purchase Qty + Hold Qty === Approved Qty`.
   - Real-time destination indicators: `Store Dispatch (Green)`, `Purchase Indent (Amber)`, `Hold (Slate)`.

---

### 3. Key Product Decisions & Trade-Offs

- **Decision 1: Physical Stock Check without Prior Database Inventory**
  - *Chosen Approach*: Provide dedicated `physicalStockFound` and `storeBinLocation` fields directly in the Stage 2 triage grid.
  - *Why*: Construction projects often lack real-time digital inventory balances initially. Recording the physical shelf check on each requisition creates the initial data required to launch the daily store audit and automated stock ledger later without blocking current operations.
- **Decision 2: Elimination of Rates & Total Amount from Requisitions**
  - *Chosen Approach*: Completely remove `Estimated Rate (₹)` and `Total Amount (₹)` from Stage 1 forms and template default columns.
  - *Why*: Site engineers do not know current market vendor prices because bulk material rates fluctuate daily. Including fake or guessed rates damages quotation accuracy. Pricing begins at Stage 4 (Quotation & Comparative Statement).
- **Decision 3: Stage-Wise Quantity Revision with Audit Preserving Initial Request**
  - *Chosen Approach*: Retain `requestedQty` immutable as submitted in Stage 1, while recording `storeVerifiedQty`, `qtyRevisionReason`, and `purchaserQty`.
  - *Why*: Prevents disputes between site engineers, store keepers, and procurement coordinators. Audit trail clearly shows what site asked for, what store approved, and why.
- **Decision 4: Multi-Route Workflow Auto-Spawning**
  - *Chosen Approach*: Automatically instantiate `STORE_TO_SITE_DISPATCH` for store-fulfilled quantities and `INDENT_PURCHASE` for purchase quantities, embedding reciprocal reference links (`parentFlowId` and `linkedSubFlows`).
  - *Why*: Replaces a cumbersome, single monolithic 18-stage workflow with two focused, parallel workflows that fit real-world team roles.

---

### 4. Technical Architecture & Data Strategy

```
┌──────────────────────────────────────────────────────────────────────────────────┐
│                                APPLICATION STATE                                 │
│                                                                                  │
│   src/types/index.ts                                                             │
│   └── FmsLineItem                                                               │
│       ├── id, itemDescription, unit, requestedQty                                │
│       ├── workPurpose: string                                                    │
│       ├── physicalStockFound?: number                                            │
│       ├── storeBinLocation?: string                                              │
│       ├── storeVerifiedQty?: number                                              │
│       ├── qtyRevisionReason?: string                                             │
│       ├── storeQty: number                                                       │
│       ├── purchaseQty: number                                                    │
│       ├── holdQty: number                                                        │
│       └── triageAllocation: 'STORE' | 'PURCHASE' | 'SPLIT' | 'HOLD'              │
└────────────────────────────────────────┬─────────────────────────────────────────┘
                                         │
                   ┌─────────────────────┴─────────────────────┐
                   ▼                                           ▼
┌──────────────────────────────────────┐    ┌──────────────────────────────────────┐
│        STAGE 1 CREATION MODAL        │    │          STAGE ACTION MODAL          │
│       src/components/fms/            │    │         src/components/fms/          │
│       CreateFmsModal.tsx             │    │        StageActionModal.tsx          │
│                                      │    │                                      │
│ • Removes Rate & Total columns       │    │ • Stage 2 Physical Check Grid        │
│ • Renders Item, Qty, Unit,           │    │ • Approved Qty & Revision Reason     │
│   Work/Purpose, Remarks              │    │ • Store / Purchase / Hold Triage     │
└──────────────────────────────────────┘    └──────────────────┬───────────────────┘
                                                               │
                                                               ▼ On Stage 2 Submit
                                            ┌──────────────────────────────────────┐
                                            │            App.tsx PIPELINE          │
                                            │                                      │
                                            │ • Spawns STORE_TO_SITE_DISPATCH      │
│ • Spawns INDENT_PURCHASE             │
│ • Cross-links IDs in both flows      │
└──────────────────────────────────────┘
```

#### Detailed File Impact & Changes
1. `src/types/index.ts`:
   - Update `FmsLineItem` to include `workPurpose`, `physicalStockFound`, `storeBinLocation`, `storeVerifiedQty`, `qtyRevisionReason`, `storeQty`, `purchaseQty`, `holdQty`, and `triageAllocation`.
   - Update `FmsInstance` to include `linkedSubFlows` and `parentFlowId`.
2. `src/components/fms/CreateFmsModal.tsx`:
   - Remove `Estimated Rate (₹)` and `Total Amount (₹)` from default `MULTI_ITEM_TABLE` fallback and initial state.
   - Include `Work / Purpose Details` as standard column.
3. `src/components/fms/StageActionModal.tsx`:
   - In Stage 2 (`Check Stock`), render the **Physical Stock Check & Triage Grid**:
     - Physical count found input & bin location.
     - Approved quantity input with revision indicator (+/- difference) and reason input.
     - Split inputs for Store, Purchase, and Hold.
4. `src/components/fms/FmsTemplateStudioModal.tsx` & `FmsTemplateStudioPage.tsx`:
   - Update default columns placeholder for `MULTI_ITEM_TABLE` to:
     `Item Description, Quantity, Unit, Work / Purpose Details, Remarks`.
5. `src/App.tsx`:
   - In `handleStageActionSubmit` / `handleStageAdvance`, detect completion of Stage 2 for `CHECK_STOCK` flow.
   - Automatically create the linked child instances for Store Dispatch and Purchase Indent.
   - Cross-link the references and provide direct navigation buttons.

---

### 5. Ordered Implementation Tasks

| Task ID | Component / File | Purpose | Test / Verification |
|---|---|---|---|
| **TASK-1** | `src/types/index.ts` | Extend `FmsLineItem` and `FmsInstance` with physical check and triage fields | TypeScript compile check |
| **TASK-2** | `CreateFmsModal.tsx`, `FmsTemplateStudioModal.tsx`, `FmsTemplateStudioPage.tsx` | Remove `Estimated Rate` and `Total Amount` from Stage 1 requisition and template defaults | Open New FMS -> Multi-item table has no rate columns |
| **TASK-3** | `StageActionModal.tsx` | Implement Stage 2 Physical Stock Check & Qty Revision triage grid | Open Stage 2 Check Stock -> Verify physical count, bin, approved qty, reason, and split inputs |
| **TASK-4** | `App.tsx` | Handle Stage 2 completion: auto-spawn linked Store Dispatch & Purchase Indent flows | Complete Stage 2 with 5 Store / 3 Purchase -> Verify 2 child flows spawned with correct items |
| **TASK-5** | `FmsPipeline.tsx` & `StageActionModal.tsx` | Render linked sub-flow cards and audit breakdown summary | Click on parent requisition -> See child flow cards with status and direct jump links |
| **TASK-6** | Global Build & QA | Run `compile_applet` and `lint_applet` for full zero-error verification | 0 build/lint errors |
