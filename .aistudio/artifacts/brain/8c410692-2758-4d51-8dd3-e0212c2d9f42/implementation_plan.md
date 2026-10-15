# Implementation Plan: Director-Exclusive Bank Payments, Beneficiary Master & Interbank Transfer (IBT) Suite

A logic-driven banking operational suite under **Utilities & Tools** featuring a 3-way segmented switcher for **Bank Payments**, **Beneficiary Master**, and **Interbank Transfer (IBT)**. Completely eliminates hardcoded designation strings and enforces strict role logic where **Payment Approval (Stage 2) is strictly reserved for the Director**.

---

## 1. Logic-Driven Workflow & Strict Role Authorization

### 3-Way Segmented Navigation Switcher
1. **Bank Payments**: Vendor disbursements, project expenses, and UPI / account transfers.
2. **Beneficiary Master**: Vendor bank accounts, verification documents, and active banking status.
3. **Interbank Transfer (IBT)**: Internal liquidity movements between company bank accounts.

### Dynamic Role-Based Operational Stages

| Stage | Action / Step | Permitted Role | My Work & Authorization Logic |
|---|---|---|---|
| **Stage 1: Request & Intake** | Create payment request with Trade Name, Beneficiary Name, Mode (`ACCOUNT` or `UPI`), Site, Amount, and invoices | **Any Logged-in User** | Tracked under Requester's active submissions |
| **Stage 2: Payment Approval** | Review purpose, amount, site justification, and verify mismatch flags | **DIRECTOR ONLY** *(Excludes Super Admin & Admin)* | **Exclusively appears in Director's My Work** approval queue and approval action controls |
| **Stage 3: Bank Portal Entry** | Punch approved transaction into NetBanking / CMS portal & attach confirmation screenshot | **Accounts Team / Operational Staff** *(Excludes Director)* | **Auto-appears in Accounts My Work** as pending portal execution |
| **Stage 4: Settlement & UTR** | Confirm bank debit, enter Bank UTR / Reference, and attach payment receipt proof | **Accounts Team / Operational Staff** *(Excludes Director)* | Finalizes record & moves to completed archive |

---

## 2. Cross-Module Beneficiary Auto-Routing
- When any user creates a payment request in `ACCOUNT` mode where the vendor account is not verified, the system sets `beneficiaryStatus: 'NEEDS_ADDITION'`.
- The system **automatically generates a pending task in Beneficiary Master (`BPL/BEN/...`)**.
- This task immediately routes into the **Accounts team's My Work** queue as a pending beneficiary bank entry requirement, ensuring accounts officers verify the cancelled cheque and register the account in the bank portal.

---

## 3. Technical Scope & Implementation Details

### A. Data Contracts (`src/types/index.ts`)
- Use neutral, objective status enumerations:
  - `PaymentApprovalStatus`: `'PENDING' | 'APPROVED' | 'REJECTED'`
  - `PaymentStepStatus`: `'PENDING' | 'DONE' | 'CANCELLED'`
- `BankPaymentRecord`:
  - `sheetNo`, `timestamp`, `vendorName`, `beneficiaryName`, `isNameMismatch`, `payeeRelationship`
  - `purposeOfPayment`, `requestedBy`, `requestedByUserId`, `site`, `modeOfPayment`, `amountToBePaid`, `plannedDate`
  - `poUpload`, `billNoPo`, `beneficiaryMasterStatus`, `bankName`, `accountNoMasked`, `ifscCode`, `cancelledChequeUrl`
  - `approvalStatus`, `approvalTimestamp`, `approvedByUserId`, `approvedByName`, `rejectionReason`
  - `paymentEntry`, `paymentEntryTimestamp`, `paymentEntryProof`, `paymentEntryBy`
  - `paymentStatus`, `paymentDoneTimestamp`, `paymentDoneProof`, `remarks` (UTR), `paymentDoneBy`
- `BeneficiaryRecord` & `InterbankTransferRecord`:
  - Aligned with identical objective stage statuses and audit fields.

### B. Storage, Auto-Queuing & Director-Exclusive Authorization (`src/services/storageAdapter.ts`)
- Storage Keys: `barbrik_ops_bank_payments_v1`, `barbrik_ops_beneficiaries_v1`, `barbrik_ops_ibt_v1`.
- Helper methods for Bank Payments, Beneficiaries, and IBT:
  - `getBankPayments()`, `createBankPayment()`, `approveBankPayment()`, `recordBankPaymentEntry()`, `finalizeBankPayment()`
  - Helper `isUserDirector(user)` to strictly check if user role or systemRole is `DIRECTOR` / `DIRECTOR_ROLE` (or Pranjal Agrawal).
  - Injection of pending payment approvals **strictly into Director's My Work** view (`getMyWorkTasks()` / Director summary). Super Admin and Admin views will NOT show pending payment approvals.
  - Injection of pending bank portal entries and unverified beneficiaries into Accounts users' **My Work** queue.
- Real-time persistence with Firestore collections (`bankPayments`, `beneficiaries`, `ibtRecords`).

### C. Banking UI Components (`src/components/banking/`)
- `BankPaymentsContainer.tsx`: 3-way navigation switcher (`Bank Payments`, `Beneficiary Master`, `Interbank Transfer`), dynamic KPI summary metrics (Pending Approval, Awaiting Bank Entry, Pending UTR, Mismatch Count), and search/site filter bar.
- `BankPaymentsFmsView.tsx`: Tabular view with strict role action triggers:
  - Approve/Reject action buttons are **visible strictly to Director**.
  - Portal Entry & UTR Settlement action buttons are visible to Accounts / Operational staff.
- `BeneficiaryMasterView.tsx`: Beneficiary directory, approval status, and account registration forms.
- `InterbankTransferView.tsx`: Treasury account-to-account moves and settlement tracking.
- `NewBankPaymentModal.tsx`: Standard payment creation modal open to all users with live fuzzy vendor matching, name mismatch warnings, and cheque/bill uploads.
- `PaymentDetailDrawer.tsx`: Split-screen overview with 4-step visual stepper, audit logs, and `Ctrl+V` screenshot pasting utility for bank receipts.

### D. Navigation Integration (`src/components/layout/Sidebar.tsx` & `src/App.tsx`)
- Add **Bank Payments** under Utilities & Tools in the navigation sidebar.
- Connect role badges and route rendering when active.

---

## 4. Verification & Testing Strategy

1. **Compilation & Linting**: Run `compile_applet` and `lint_applet` to verify clean build.
2. **Director-Exclusive Approval Test**:
   - Log in as Director (or Pranjal Agrawal). Verify that pending payment approvals appear in Director's **My Work** screen and table action buttons are active.
   - Log in as Super Admin / Admin. Verify that pending payment approvals do **NOT** appear in their My Work or as approval triggers.
3. **Accounts My Work Test**:
   - Log in as Accounts Officer (e.g. Priyanka). Verify that items awaiting Bank Portal Entry or unverified Beneficiary Additions appear in Accounts' task queue.
4. **General Operational User Test**:
   - Log in as an operational user (e.g. Store or Purchase Executive). Verify they can create new bank payment requests, but cannot approve them.
5. **Data Persistence**:
   - Verify newly created payments, approvals, and beneficiary additions persist across page reloads and Firestore sync.
