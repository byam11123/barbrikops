# Simplified Purchase FMS Workflow & Split Indent Architecture

Streamline the Purchase FMS Tracker to make the entire financial and procurement workflow so clean and intuitive that a non-technical user (or Class 10 student) can understand and operate it effortlessly. Eliminate visual clutter, reduce option paralysis, split store dispatch vs. purchase items into distinct independent indents, and embed L1 comparative choices and bank payment workflows directly into FMS modals.

## User Review & Critical Decisions

> [!IMPORTANT]
> The design directly incorporates all confirmed user preferences to eliminate complexity and confusion for non-technical users.

- **Confirmed Decision 1 (Simplified Non-Technical UX)**: Eliminate redundant buttons, confusing technical jargon, and scattered action controls. Present a clear linear 5-step progress indicator on every indent card with one primary action button per role.
- **Confirmed Decision 2 (Independent Split Indents)**: When store triage splits a request (e.g., 2 items in store, 3 items missing), create **2 completely separate independent indents** in the pipeline (`IND-001-DISP` for Store Dispatch and `IND-001-PURCH` for Purchase Requisition) so store managers and purchasers work on clean, isolated task queues.
- **Confirmed Decision 3 (Embedded FMS Approvals & Payments)**: Place Director L1 radio-button authorization, vendor bank beneficiary checks, and payment release forms directly inside embedded modals on the FMS / "My Work" screen—avoiding context switching across disparate tabs.

---

## 1. Overview & Core Concept

### What It Does
1. **Simplified Role Dashboard**: Non-technical team members see only their relevant pending step with a big, friendly action button (e.g., "Pack 2 Store Items", "Submit 3 Market Quotes", "Authorize L1 Vendor", "Release Payment").
2. **2-Way Independent Indent Split**: Triage automatically converts a partial stock hit into two separate indents:
   - **Store Dispatch Indent**: Tracks picking from store, gate pass, and site delivery receipt.
   - **Purchase Requisition Indent**: Tracks market quotation collection, L1 comparative approval, bank beneficiary validation, and payment release.
3. **Embedded In-Place Execution**: All approvals (L1 comparative, beneficiary validation, payment release) happen directly inside overlay modals without leaving the active workflow page.

### Target Audience & Persona
- **Store Managers & Site Engineers**: Non-technical staff needing fast, error-free stock checks and receiving acknowledgments.
- **Purchasers**: Field staff uploading vendor quotes and selecting payment modes (UPI / Bank Transfer).
- **Director & Accountants**: Executive approvers making high-value financial choices with 1-click radio buttons and attached bills.

---

## 2. User Experience & Visual Design

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                       MY WORK SUMMARY & ACTIONABLE FMS                      │
├─────────────────────────────────────────────────────────────────────────────┤
│  IND-2026-001-DISP  [STORE DISPATCH]                      Step 2 of 3       │
│  Site: Sector-4 School  ·  2 Items  ·  Status: Pack Goods                   │
│  [ Primary Action: Confirm Pack & Dispatch ]                                │
├─────────────────────────────────────────────────────────────────────────────┤
│  IND-2026-001-PURCH [PURCHASE REQUISITION]               Step 3 of 5       │
│  Site: Sector-4 School  ·  3 Items  ·  Status: Director L1 Selection Needed │
│  [ Primary Action: Open L1 Selection Modal ]                                │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Visual Identity & Theme
- **Clean Utilitarian Style**: High readability, crisp typography, generous spacing, and anti-clutter discipline.
- **Color Palette**:
  - Store Dispatch Track: Calm Teal/Emerald (`emerald-600` / `teal-500`)
  - Purchase Order Track: Professional Blue (`blue-600` / `indigo-500`)
  - Urgent Director Action: Warm Amber/Coral (`amber-600` / `orange-500`)
- **Linear Progress Stepper**: Replaces complex nested tables with a simple 5-step visual milestone bar:
  `1. Stock Check` &rarr; `2. Market Quotes` &rarr; `3. L1 Choice` &rarr; `4. Payment` &rarr; `5. Site Received`

---

## 3. Technical Architecture & Data Strategy

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           STORE REQUISITION ENTRY                           │
│                             (Indent: 5 Items)                               │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
                                       ▼
                         ┌───────────────────────────┐
                         │   STORE MANAGER TRIAGE    │
                         └─────────────┬─────────────┘
                                       │
            ┌──────────────────────────┴──────────────────────────┐
            ▼                                                     ▼
┌───────────────────────────────┐                     ┌───────────────────────────────┐
│ IND-2026-001-DISP             │                     │ IND-2026-001-PURCH            │
│ (2 Items in Stock)            │                     │ (3 Missing Items to Buy)      │
├───────────────────────────────┤                     ├───────────────────────────────┤
│ 1. Pack Items                 │                     │ 1. Purchaser Collects Quotes  │
│ 2. Issue Gate Pass            │                     │ 2. Embedded L1 Selection      │
│ 3. Site Receive & Complete    │                     │ 3. Bank/UPI Payment Modal     │
│                               │                     │ 4. Vendor Delivery & Complete │
└───────────────────────────────┘                     └───────────────────────────────┘
```

### Key Modules & Refactoring Areas

1. **Storage & Data Layer (`src/services/storageAdapter.ts` & `src/types/fms.ts`)**:
   - Update `splitIndentForPurchaseAndStore` to create two fully independent FMS Indent objects (`IND-xxx-DISP` and `IND-xxx-PURCH`) with distinct IDs, tracking numbers, line items, and workflow stages.
   - Maintain a bidirectional link (`parentIndentId`, `splitSiblingId`) so managers can view the relation if desired, while the pipeline renders them as clean standalone cards.

2. **FMS Pipeline & Matrix UI (`src/components/fms/FmsPipeline.tsx` & `FmsIndividualView.tsx`)**:
   - Simplify card displays by removing redundant technical pills and overcrowded buttons.
   - Show 1 prominent action button corresponding to the current user's role and the active stage.
   - Add clear visual tags: `STORE DISPATCH TRACK` vs `PURCHASE TRACK`.

3. **Embedded Approvals & Payment Modals (`src/components/fms/EmbeddedL1ApprovalModal.tsx` & `StageActionModal.tsx`)**:
   - **Embedded Director L1 Selection**: Show vendor prices side-by-side with clear radio buttons and total calculations.
   - **Embedded Bank & UPI Payment Form**: In-place beneficiary verification (check if bank details exist; if missing, upload canceled cheque for accountant), payment mode selection (NEFT/RTGS/UPI), and compulsory bill attachment.

---

## 4. Step-by-Step Implementation Plan

### Task 1: Refactor Indent Split Logic into Two Independent Indents
- Modify `storageAdapter.ts` so that triaging an indent splits items into two completely separate records with unique IDs (`IND-xxx-DISP` and `IND-xxx-PURCH`).
- Assign independent stage lists: Store Dispatch track gets 3 steps; Purchase Order track gets 5 steps.

### Task 2: Simplify FMS Pipeline Cards & Work Summary UI
- Clean up `FmsPipeline.tsx` and `MyWorkSummaryView.tsx` to eliminate redundant options, crowded action rows, and technical jargon.
- Introduce a clear linear step indicator and a single primary call-to-action button per card.

### Task 3: Enhance Embedded L1 Director Approval Modal
- Refine `EmbeddedL1ApprovalModal.tsx` to display multi-vendor prices clearly with radio buttons for vendor authorization.
- Ensure clicking "Authorize L1 Vendor" automatically moves the purchase track to the Bank Payment stage.

### Task 4: Integrate Embedded Bank Payment & Beneficiary Flow
- Update `StageActionModal.tsx` / `BankPaymentsSuiteView.tsx` to handle Bank vs UPI payment selection, bill attachment validation, and beneficiary account checks directly inside the FMS modal.
- Route payment approval directly to the Director and Accountant in the embedded modal view.

### Task 5: End-to-End Verification & User Testing
- Verify full flow from site requisition &rarr; store 2-way split &rarr; separate indents &rarr; purchaser quotes &rarr; embedded L1 radio button approval &rarr; embedded bank payment &rarr; site receipt.
- Run applet compilation and verify zero errors.

---

## Verification Checklist
- [ ] Store triage splits a 5-item request into 2 completely separate indents in the pipeline.
- [ ] Non-technical user interface shows clear step indicators and single primary action buttons.
- [ ] Director completes L1 comparative selection with a radio button directly in an embedded modal.
- [ ] Purchaser/Director executes bank payment & bill upload inside an embedded modal on the FMS screen.
- [ ] All code compiles cleanly without errors.
