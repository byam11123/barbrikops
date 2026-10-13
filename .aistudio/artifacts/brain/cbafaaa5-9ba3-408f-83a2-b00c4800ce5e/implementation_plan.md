# Implementation Plan: Dedicated WHEN (Planned SLA / Target Time) Header Row in Horizontal Spreadsheet View

## Problem Statement
In the **Horizontal Spreadsheet View** (`FmsStageMatrixTableView.tsx`), the table header matrix currently displays stage information across two main header tiers (*WHAT* for stage names and combined *WHO / HOW* for assignee and channel). It is missing the **WHEN** dimension (Planned SLA / Target Turnaround Time), leaving users without visibility into target stage durations directly in the table header.

## Proposed Solution
We will update `src/components/fms/FmsStageMatrixTableView.tsx` to include a dedicated **WHEN • PLANNED SLA / TARGET TIME** header row alongside distinct **WHO** and **HOW** rows:

1. **Header Row Hierarchy Update**:
   - **Row 1 (WHAT)**: Requisition Stage Name & Number (e.g., `Stage 1: Check Stock`).
   - **Row 2 (WHO)**: Responsible Assignee (e.g., `WHO • Assignee: Pranjal Agrawal / Khushboo`).
   - **Row 3 (HOW)**: Execution Channel / Tool (e.g., `HOW • Channel: WHATSAPP / CALL / MANUAL`).
   - **Row 4 (WHEN)**: Planned SLA / Target Time (e.g., `WHEN • Target SLA: 4 Hours` or configured SLA).
   - **Row 5 (Sub-Columns)**: Column headers (`Planned | Actual | Status | Delay | Stage Form Fields`).

2. **Data Integration**:
   - Retrieve `stgDef.slaHours` or `4` hours fallback for each stage definition (`activeStageDefinitions`).
   - Format stage SLA gracefully (e.g., `Target SLA: 4 Hours` or `SLA: 24 Hours`).

## Affected Files
- `src/components/fms/FmsStageMatrixTableView.tsx`

## Verification Strategy
- Run `compile_applet` to confirm build success.
- Run `lint_applet` to verify zero TypeScript or syntax errors.
