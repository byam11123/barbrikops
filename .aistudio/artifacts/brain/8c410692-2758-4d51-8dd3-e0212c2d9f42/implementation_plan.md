# Implementation Plan: Dynamic "All FMS" Sidebar Sub-Tree & Workflow Filtering

## Objective
Expand the **All FMS** module in the sidebar to display dynamic department sub-branches and individual workflow sub-trees. Selecting any workflow in the sub-tree will filter the FMS view (stat cards, stage matrix, and pipeline table) to show data exclusively for that workflow.

---

## 1. Sidebar Navigation Enhancements (`Sidebar.tsx` & `MobileDrawer.tsx`)
- **Expandable "All FMS" Section**:
  - Add an expand/collapse toggle chevron to the main **All FMS** menu item.
  - Dynamically compute department branches (*Purchase*, *Store*, *Accounts*, *Plant & Ops*, *Operations*).
- **Dynamic Workflow Sub-Tree**:
  - Under each department branch, dynamically render all configured FMS workflows from live instances and master catalog templates.
  - Display live active flow counters next to each workflow item in the sub-tree.
  - Highlight the currently selected department and workflow item.

---

## 2. FMS View Filtering & Stat Sync (`App.tsx` & `FmsPipeline.tsx`)
- **App State Integration**:
  - Pass `selectedWorkflowKey` and `onSelectWorkflowFms` to `Sidebar` and `MobileDrawer`.
  - Pass `selectedWorkflowKey` into `<FmsPipeline />`.
- **FmsPipeline Filtering**:
  - Filter `activeFlows`, `completedFlows`, and stage metrics by `selectedWorkflowKey` when specified.
  - Ensure top stat cards (*Active Pipelines*, *Completed*, *Delayed Variance*, *SLA Breaches*) update dynamically.
  - Display a clear filter chip with a "Clear Filter" button when a specific workflow or department is active.

---

## 3. Verification & Quality Assurance
- Run `compile_applet` to ensure zero build errors.
- Run `lint_applet` to verify TypeScript syntax and prop types.
