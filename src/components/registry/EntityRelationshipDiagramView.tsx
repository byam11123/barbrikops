import React, { useState } from 'react';
import { 
  GitBranch, 
  Database, 
  Users, 
  ShoppingCart, 
  Landmark, 
  Boxes, 
  ListTodo, 
  Key, 
  ArrowRight, 
  Search, 
  Layers, 
  ShieldCheck, 
  Building2, 
  FileText, 
  CheckCircle2, 
  ChevronRight, 
  Sparkles 
} from 'lucide-react';

interface EntityField {
  name: string;
  type: string;
  isPk?: boolean;
  isFk?: boolean;
  fkTarget?: string;
  description: string;
}

interface EntityNode {
  id: string;
  name: string;
  category: 'GOVERNANCE' | 'FMS_PIPELINE' | 'PROCUREMENT' | 'FINANCE' | 'INVENTORY' | 'WORKBENCH';
  description: string;
  color: string;
  icon: any;
  primaryKey: string;
  fields: EntityField[];
  relationships: {
    targetId: string;
    targetName: string;
    cardinality: '1:1' | '1:N' | 'N:1' | 'N:M';
    relationLabel: string;
  }[];
}

const ENTITIES: EntityNode[] = [
  {
    id: 'user_profile',
    name: 'UserProfile',
    category: 'GOVERNANCE',
    description: 'System user directory, system role mapping, and module permissions',
    color: 'bg-indigo-50 border-indigo-200 text-indigo-900',
    icon: Users,
    primaryKey: 'userId',
    fields: [
      { name: 'userId', type: 'string', isPk: true, description: 'Unique user identifier (e.g. USR-DIR-01)' },
      { name: 'name', type: 'string', description: 'Full name of the user (e.g. Pranjal Agrawal)' },
      { name: 'role', type: 'string', description: 'Operational role title (e.g. Executive Director)' },
      { name: 'systemRole', type: 'UserRole', description: 'SUPER_ADMIN | ADMIN | DIRECTOR | EXECUTIVE_ASSISTANT | PROCESS_COORDINATOR' },
      { name: 'departmentId', type: 'string', isFk: true, fkTarget: 'department', description: 'Foreign key to Department' },
      { name: 'phone', type: 'string', description: 'Primary contact phone' },
      { name: 'email', type: 'string', description: 'Work email address' },
      { name: 'permissions', type: 'ModulePermissionMap', description: 'Per-module visibility, edit, delete grants' },
    ],
    relationships: [
      { targetId: 'department', targetName: 'Department', cardinality: 'N:1', relationLabel: 'Belongs to department' },
      { targetId: 'bank_payment', targetName: 'BankPaymentRecord', cardinality: '1:N', relationLabel: 'Approves disbursement' },
      { targetId: 'audit_log', targetName: 'AuditLogEntry', cardinality: '1:N', relationLabel: 'Performs audit action' },
    ],
  },
  {
    id: 'department',
    name: 'Department',
    category: 'GOVERNANCE',
    description: 'Organizational departments (Purchase, Central Store, Accounts, Operations)',
    color: 'bg-purple-50 border-purple-200 text-purple-900',
    icon: Building2,
    primaryKey: 'departmentId',
    fields: [
      { name: 'departmentId', type: 'string', isPk: true, description: 'Unique department ID (e.g. PURCHASE)' },
      { name: 'name', type: 'string', description: 'Display name (e.g. Finance & Accounts)' },
      { name: 'code', type: 'string', description: 'Short department code (e.g. ACC)' },
      { name: 'headUserId', type: 'string', isFk: true, fkTarget: 'user_profile', description: 'Department Head user ID' },
    ],
    relationships: [
      { targetId: 'user_profile', targetName: 'UserProfile', cardinality: '1:N', relationLabel: 'Has assigned members' },
    ],
  },
  {
    id: 'fms_instance',
    name: 'FmsInstance',
    category: 'FMS_PIPELINE',
    description: 'Cross-departmental FMS workflow flow instance (Indents, POs, Dispatches)',
    color: 'bg-blue-50 border-blue-200 text-blue-900',
    icon: GitBranch,
    primaryKey: 'id / flowId',
    fields: [
      { name: 'id', type: 'string', isPk: true, description: 'Primary flow instance UUID' },
      { name: 'flowId', type: 'string', description: 'Human readable flow ID (e.g. FLOW-INDENT_PURCHASE-466)' },
      { name: 'indentNo', type: 'string', description: 'Indent Number reference (e.g. IND-466)' },
      { name: 'flowType', type: 'string', description: 'INDENT_PURCHASE | PURCHASE_TO_STORE_DISPATCH | PO_TO_PAYMENT | CHECK_STOCK' },
      { name: 'siteName', type: 'string', description: 'Project site location (e.g. BIJETALA)' },
      { name: 'priority', type: 'Priority', description: 'Urgent | Normal | Low' },
      { name: 'currentStageId', type: 'string', description: 'Active stage ID' },
      { name: 'status', type: 'string', description: 'In Progress | Completed | On Hold | CLOSED' },
      { name: 'instanceDataPool', type: 'Record<string, any>', description: 'Universal stage field inheritance payload' },
    ],
    relationships: [
      { targetId: 'fms_stage', targetName: 'FmsStageExecution', cardinality: '1:N', relationLabel: 'Contains ordered stages' },
      { targetId: 'fms_line_item', targetName: 'FmsLineItem', cardinality: '1:N', relationLabel: 'Has requisition items' },
      { targetId: 'cs_statement', targetName: 'ComparativeStatement', cardinality: '1:1', relationLabel: 'Generates CS via indentNo' },
    ],
  },
  {
    id: 'fms_stage',
    name: 'FmsStageExecution',
    category: 'FMS_PIPELINE',
    description: 'Individual stage execution inside an FMS workflow instance',
    color: 'bg-sky-50 border-sky-200 text-sky-900',
    icon: Layers,
    primaryKey: 'stageId (Composite)',
    fields: [
      { name: 'stageId', type: 'string', isPk: true, description: 'Stage Identifier (e.g. STG-01)' },
      { name: 'stageName', type: 'string', description: 'Stage name (e.g. INDENT RECIEVE)' },
      { name: 'assignee', type: 'string', description: 'Role or person assigned' },
      { name: 'status', type: 'string', description: 'Pending | In Progress | Done | Skipped' },
      { name: 'plannedTimestamp', type: 'string', description: 'SLA target completion timestamp' },
      { name: 'actualTimestamp', type: 'string', description: 'Actual completion timestamp' },
      { name: 'submittedData', type: 'Record<string, any>', description: 'Stage form submission inputs' },
    ],
    relationships: [
      { targetId: 'fms_instance', targetName: 'FmsInstance', cardinality: 'N:1', relationLabel: 'Belongs to FmsInstance' },
    ],
  },
  {
    id: 'fms_line_item',
    name: 'FmsLineItem',
    category: 'FMS_PIPELINE',
    description: 'Individual material line items requested within an indent',
    color: 'bg-cyan-50 border-cyan-200 text-cyan-900',
    icon: FileText,
    primaryKey: 'id',
    fields: [
      { name: 'id', type: 'string', isPk: true, description: 'Line item primary ID' },
      { name: 'itemDescription', type: 'string', description: 'Material description and specifications' },
      { name: 'qty', type: 'number', description: 'Total requested quantity' },
      { name: 'unit', type: 'string', description: 'Unit of measurement (Pcs, Mtr, Kg, Ltr)' },
      { name: 'triageAllocation', type: 'string', description: 'STORE_DISPATCH | PURCHASE_REQUISITION' },
      { name: 'storeStockQtyAvailable', type: 'number', description: 'Quantity fulfilled from site store' },
      { name: 'purchaseQtyRequired', type: 'number', description: 'Quantity routed for market purchase' },
    ],
    relationships: [
      { targetId: 'fms_instance', targetName: 'FmsInstance', cardinality: 'N:1', relationLabel: 'Belongs to Indent' },
    ],
  },
  {
    id: 'cs_statement',
    name: 'ComparativeStatement',
    category: 'PROCUREMENT',
    description: 'Vendor Rate Comparative Statement (CS) for Barbrik Project Ltd. standards',
    color: 'bg-amber-50 border-amber-200 text-amber-900',
    icon: ShoppingCart,
    primaryKey: 'id',
    fields: [
      { name: 'id', type: 'string', isPk: true, description: 'Primary CS Sheet ID' },
      { name: 'indentNo', type: 'string', isFk: true, fkTarget: 'fms_instance', description: 'Linked Indent Number' },
      { name: 'site', type: 'string', description: 'Project site (e.g. BIJETALA)' },
      { name: 'forPurpose', type: 'string', description: 'Equipment / Machine purpose' },
      { name: 'status', type: 'string', description: 'Draft | Approved | PO Created' },
      { name: 'approvedBy', type: 'string', description: 'Executive Director approver' },
      { name: 'generatedPoIds', type: 'string[]', description: 'Generated Purchase Orders' },
    ],
    relationships: [
      { targetId: 'fms_instance', targetName: 'FmsInstance', cardinality: '1:1', relationLabel: 'Linked to Indent' },
      { targetId: 'vendor_profile', targetName: 'VendorProfileRecord', cardinality: 'N:M', relationLabel: 'Quotes from multiple vendors' },
    ],
  },
  {
    id: 'vendor_profile',
    name: 'VendorProfileRecord',
    category: 'PROCUREMENT',
    description: 'Vendor master profiles, commercial GSTIN/PAN details, and categories',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    icon: Building2,
    primaryKey: 'id / vendorCode',
    fields: [
      { name: 'id', type: 'string', isPk: true, description: 'Vendor primary key' },
      { name: 'vendorCode', type: 'string', description: 'Short Code (e.g. VEN-001)' },
      { name: 'tradeName', type: 'string', description: 'Commercial Business Trade Name' },
      { name: 'legalName', type: 'string', description: 'Legal Registered Entity Name' },
      { name: 'gstin', type: 'string', description: '15-digit GST Registration Number' },
      { name: 'pan', type: 'string', description: '10-digit Income Tax PAN' },
      { name: 'category', type: 'string', description: 'Hardware, Cement, Spares, Fabrication' },
    ],
    relationships: [
      { targetId: 'vendor_bank', targetName: 'VendorBankAccount', cardinality: '1:N', relationLabel: 'Owns verified bank accounts' },
      { targetId: 'bank_payment', targetName: 'BankPaymentRecord', cardinality: '1:N', relationLabel: 'Payee for bank payment' },
    ],
  },
  {
    id: 'vendor_bank',
    name: 'VendorBankAccount',
    category: 'FINANCE',
    description: 'Verified vendor bank accounts, IFSC codes, and cancelled cheque proofs',
    color: 'bg-teal-50 border-teal-200 text-teal-900',
    icon: Landmark,
    primaryKey: 'id',
    fields: [
      { name: 'id', type: 'string', isPk: true, description: 'Bank account record ID' },
      { name: 'beneficiaryName', type: 'string', description: 'Legal bank title holder' },
      { name: 'bankName', type: 'string', description: 'Bank Name (e.g. State Bank of India)' },
      { name: 'accountNo', type: 'string', description: 'Full Bank Account Number' },
      { name: 'ifscCode', type: 'string', description: '11-character IFSC Code' },
      { name: 'cancelledChequeUrl', type: 'string', description: 'Verification proof document' },
      { name: 'verificationStatus', type: 'string', description: 'VERIFIED | PENDING | REJECTED' },
    ],
    relationships: [
      { targetId: 'vendor_profile', targetName: 'VendorProfileRecord', cardinality: 'N:1', relationLabel: 'Belongs to Vendor' },
      { targetId: 'beneficiary_record', targetName: 'BeneficiaryRecord', cardinality: '1:1', relationLabel: 'Synced with Beneficiary Master' },
    ],
  },
  {
    id: 'bank_payment',
    name: 'BankPaymentRecord',
    category: 'FINANCE',
    description: 'Disbursement payment requests, Director approval, and Accounts settlement UTR',
    color: 'bg-emerald-50 border-emerald-200 text-emerald-900',
    icon: Landmark,
    primaryKey: 'id / sheetNo',
    fields: [
      { name: 'id', type: 'string', isPk: true, description: 'Payment record ID' },
      { name: 'sheetNo', type: 'string', description: 'Reference Sheet Number (BPL/BANK/YYYYMMDD/NN)' },
      { name: 'vendorName', type: 'string', description: 'Trade Name payee' },
      { name: 'beneficiaryName', type: 'string', description: 'Bank Account holder title' },
      { name: 'isNameMismatch', type: 'boolean', description: 'Trade Name != Beneficiary Name flag' },
      { name: 'amountToBePaid', type: 'number', description: 'Amount in ₹' },
      { name: 'approvalStatus', type: 'string', description: 'PENDING | APPROVED | REJECTED (Director)' },
      { name: 'remarks', type: 'string', description: 'Bank UTR Settlement Reference' },
    ],
    relationships: [
      { targetId: 'vendor_profile', targetName: 'VendorProfileRecord', cardinality: 'N:1', relationLabel: 'Linked to Vendor Trade Profile' },
      { targetId: 'user_profile', targetName: 'UserProfile', cardinality: 'N:1', relationLabel: 'Approved by Director' },
    ],
  },
  {
    id: 'beneficiary_record',
    name: 'BeneficiaryRecord',
    category: 'FINANCE',
    description: 'Master bank beneficiary addition & cooling period verification workflow',
    color: 'bg-green-50 border-green-200 text-green-900',
    icon: ShieldCheck,
    primaryKey: 'id / sheetNo',
    fields: [
      { name: 'id', type: 'string', isPk: true, description: 'Beneficiary record ID' },
      { name: 'sheetNo', type: 'string', description: 'Beneficiary Master Reference (BPL/BEN/YYYYMMDD/NN)' },
      { name: 'beneficiaryName', type: 'string', description: 'Legal Bank Title' },
      { name: 'accountNo', type: 'string', description: 'Bank Account Number' },
      { name: 'ifscCode', type: 'string', description: 'IFSC Code' },
      { name: 'cancelledChequeUrl', type: 'string', description: 'Verification proof document' },
      { name: 'approvalStatus', type: 'string', description: 'Director approval status' },
    ],
    relationships: [
      { targetId: 'bank_payment', targetName: 'BankPaymentRecord', cardinality: '1:N', relationLabel: 'Validates payment payee' },
    ],
  },
  {
    id: 'inventory_item',
    name: 'InventoryItem',
    category: 'INVENTORY',
    description: 'Material catalog items, site bin locations, current stock, and threshold alerts',
    color: 'bg-rose-50 border-rose-200 text-rose-900',
    icon: Boxes,
    primaryKey: 'id / itemId',
    fields: [
      { name: 'id', type: 'string', isPk: true, description: 'Primary ID' },
      { name: 'itemId', type: 'string', description: 'Item Code (e.g. ITEM-IT-001)' },
      { name: 'name', type: 'string', description: 'Material Item Name' },
      { name: 'category', type: 'string', description: 'IT Equipment | Plant Machinery | Consumables' },
      { name: 'location', type: 'string', description: 'Site / Central Store location' },
      { name: 'currentStock', type: 'number', description: 'Available quantity on hand' },
      { name: 'minThreshold', type: 'number', description: 'Minimum stock alert trigger' },
    ],
    relationships: [
      { targetId: 'inventory_movement', targetName: 'InventoryMovement', cardinality: '1:N', relationLabel: 'Tracks inward/issue movements' },
    ],
  },
  {
    id: 'inventory_movement',
    name: 'InventoryMovement',
    category: 'INVENTORY',
    description: 'Inventory transactions (Receive, Issue, Stock Transfer, Degraded Return)',
    color: 'bg-orange-50 border-orange-200 text-orange-900',
    icon: Boxes,
    primaryKey: 'id / transactionId',
    fields: [
      { name: 'id', type: 'string', isPk: true, description: 'Movement transaction ID' },
      { name: 'itemId', type: 'string', isFk: true, fkTarget: 'inventory_item', description: 'Linked Inventory Item ID' },
      { name: 'type', type: 'string', description: 'RECEIVE | ISSUE | RETURN_DEGRADED | TRANSFER' },
      { name: 'quantity', type: 'number', description: 'Movement quantity' },
      { name: 'referenceDoc', type: 'string', description: 'Linked Indent No or PO No' },
      { name: 'initiatedBy', type: 'string', description: 'Person initiating stock movement' },
    ],
    relationships: [
      { targetId: 'inventory_item', targetName: 'InventoryItem', cardinality: 'N:1', relationLabel: 'Belongs to InventoryItem' },
    ],
  },
  {
    id: 'delegation_task',
    name: 'DelegationTask',
    category: 'WORKBENCH',
    description: 'Cross-functional task assignments, revision history, and target dates',
    color: 'bg-violet-50 border-violet-200 text-violet-900',
    icon: ListTodo,
    primaryKey: 'id / taskId',
    fields: [
      { name: 'id', type: 'string', isPk: true, description: 'Delegation ID' },
      { name: 'taskId', type: 'string', description: 'Short task number' },
      { name: 'name', type: 'string', description: 'Doer name' },
      { name: 'task', type: 'string', description: 'Task description' },
      { name: 'latestRevision', type: 'string', description: 'Latest target date' },
      { name: 'totalRevisions', type: 'number', description: 'Number of date extensions' },
      { name: 'status', type: 'string', description: 'Pending | Completed | Week Shifted' },
    ],
    relationships: [
      { targetId: 'user_profile', targetName: 'UserProfile', cardinality: 'N:1', relationLabel: 'Assigned to user' },
    ],
  },
];

export const EntityRelationshipDiagramView: React.FC = () => {
  const [selectedEntity, setSelectedEntity] = useState<EntityNode>(ENTITIES[2]); // Default to FmsInstance
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const filteredEntities = ENTITIES.filter((entity) => {
    const matchesCategory = categoryFilter === 'ALL' || entity.category === categoryFilter;
    const matchesSearch = 
      entity.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      entity.fields.some((f) => f.name.toLowerCase().includes(searchTerm.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-5 bg-slate-900 text-white rounded-2xl shadow-sm border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            <h2 className="text-lg font-bold tracking-tight">Barbrik Operations System Entity Relationship Diagram</h2>
            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-[10px] font-mono font-bold rounded-full">
              LIVE ERD
            </span>
          </div>
          <p className="text-xs text-slate-300">
            Interactive schema overview of Barbrik Project Ltd. purchase workflows, financial disbursements, vendor registries, and inventory data models.
          </p>
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto">
          <div className="relative flex-1 md:w-64">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search entities or fields..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-slate-800 text-white placeholder-slate-400 text-xs rounded-xl border border-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        {[
          { key: 'ALL', label: 'All Domains (13 Entities)' },
          { key: 'FMS_PIPELINE', label: 'FMS Workflow Pipeline' },
          { key: 'PROCUREMENT', label: 'Procurement & CS' },
          { key: 'FINANCE', label: 'Finance & Treasury' },
          { key: 'INVENTORY', label: 'Inventory & Store' },
          { key: 'GOVERNANCE', label: 'Governance & Users' },
          { key: 'WORKBENCH', label: 'Operational Workbench' },
        ].map((cat) => (
          <button
            key={cat.key}
            onClick={() => setCategoryFilter(cat.key)}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              categoryFilter === cat.key
                ? 'bg-indigo-600 text-white shadow-2xs font-bold'
                : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
            }`}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Main Grid & Inspector Split */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Entity Cards Grid */}
        <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {filteredEntities.map((entity) => {
            const IconComp = entity.icon;
            const isSelected = selectedEntity.id === entity.id;

            return (
              <div
                key={entity.id}
                onClick={() => setSelectedEntity(entity)}
                className={`p-4 rounded-2xl border-2 transition-all cursor-pointer relative overflow-hidden ${
                  isSelected
                    ? 'border-indigo-600 bg-white shadow-md ring-2 ring-indigo-600/20'
                    : 'border-slate-200 bg-white hover:border-slate-300 hover:shadow-xs'
                }`}
              >
                {isSelected && (
                  <div className="absolute top-0 right-0 w-3 h-3 bg-indigo-600 rounded-bl-lg" />
                )}

                <div className="flex items-start justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <div className={`p-2 rounded-xl ${entity.color}`}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <div>
                      <h3 className="text-xs font-bold text-slate-900 font-mono">{entity.name}</h3>
                      <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">
                        {entity.category.replace('_', ' ')}
                      </span>
                    </div>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-semibold border border-slate-200">
                    PK: {entity.primaryKey}
                  </span>
                </div>

                <p className="text-[11px] text-slate-600 line-clamp-2 mb-3">
                  {entity.description}
                </p>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-500 font-medium">
                  <span>{entity.fields.length} Fields</span>
                  <span className="flex items-center gap-1 text-indigo-600 font-bold">
                    <span>Inspect Relations</span>
                    <ChevronRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Column: Detailed Entity Inspector */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-5 sticky top-4">
            {/* Inspector Title */}
            <div className="flex items-start justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className={`p-2.5 rounded-xl ${selectedEntity.color}`}>
                  <selectedEntity.icon className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900 font-mono flex items-center gap-2">
                    <span>{selectedEntity.name}</span>
                    <span className="text-[10px] font-mono bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full font-bold">
                      ENTITY
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">{selectedEntity.description}</p>
                </div>
              </div>
            </div>

            {/* Relationships Section */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                <span>Entity Relationships &amp; Cardinalities</span>
              </h4>

              <div className="space-y-2">
                {selectedEntity.relationships.map((rel, idx) => {
                  const targetEntity = ENTITIES.find((e) => e.id === rel.targetId);

                  return (
                    <div
                      key={idx}
                      onClick={() => targetEntity && setSelectedEntity(targetEntity)}
                      className="p-3 bg-slate-50 hover:bg-indigo-50/50 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all cursor-pointer flex items-center justify-between"
                    >
                      <div className="space-y-0.5">
                        <div className="text-xs font-bold font-mono text-slate-900 flex items-center gap-1.5">
                          <span>{selectedEntity.name}</span>
                          <ArrowRight className="w-3 h-3 text-slate-400" />
                          <span className="text-indigo-700">{rel.targetName}</span>
                        </div>
                        <p className="text-[11px] text-slate-500">{rel.relationLabel}</p>
                      </div>

                      <span className="px-2 py-1 bg-white text-indigo-900 border border-indigo-200 font-mono font-bold text-[10px] rounded-lg shadow-2xs">
                        {rel.cardinality}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Schema Field Dictionary */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-slate-600" />
                <span>Fields &amp; Attributes</span>
              </h4>

              <div className="max-h-72 overflow-y-auto space-y-1.5 pr-1 scrollbar-thin">
                {selectedEntity.fields.map((field) => (
                  <div
                    key={field.name}
                    className="p-2.5 bg-slate-50 rounded-xl border border-slate-200 flex items-start justify-between text-xs"
                  >
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono font-bold text-slate-900">{field.name}</span>

                        {field.isPk && (
                          <span className="px-1.5 py-0.2 bg-amber-100 text-amber-900 border border-amber-300 font-mono font-extrabold text-[9px] rounded flex items-center gap-0.5">
                            <Key className="w-2.5 h-2.5 text-amber-700" />
                            PK
                          </span>
                        )}

                        {field.isFk && (
                          <span className="px-1.5 py-0.2 bg-purple-100 text-purple-900 border border-purple-300 font-mono font-extrabold text-[9px] rounded">
                            FK → {field.fkTarget}
                          </span>
                        )}
                      </div>
                      <p className="text-[11px] text-slate-500">{field.description}</p>
                    </div>

                    <span className="font-mono text-[10px] font-bold text-slate-600 bg-white px-2 py-0.5 rounded border border-slate-200">
                      {field.type}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
