import React, { useState, useEffect } from 'react';
import { 
  X, 
  Plus, 
  Trash2, 
  Save, 
  Layers, 
  Clock, 
  User, 
  FileText, 
  CheckCircle2, 
  AlertCircle, 
  ListPlus,
  ArrowRight,
  ShieldCheck,
  ChevronDown,
  Sparkles,
  GitBranch,
  CheckSquare,
  ArrowUp,
  ArrowDown,
  ArrowUpDown,
  RotateCcw,
  Settings,
  FileSpreadsheet,
  Download,
  Upload,
  Boxes
} from 'lucide-react';
import { FmsTemplateDefinition, FmsStageTemplate, FmsStageFieldConfig, FmsSubWorkflowTriggerConfig, Priority } from '../../types';
import { downloadFmsExcelTemplate, parseFmsExcelFile } from '../../services/fmsExcelService';
import { 
  FMS_CHECK_STOCK_STAGES, 
  FMS_STANDARD_PURCHASE_STAGES, 
  FMS_PO_PAYMENT_STAGES, 
  FMS_PURCHASE_TO_STORE_DISPATCH_STAGES, 
  FMS_STORE_TO_SITE_DISPATCH_STAGES, 
  FMS_PAYMENT_TO_DISPATCH_STAGES, 
  FMS_SITE_RECEIVE_STAGES, 
  FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES, 
  FMS_HR_ATTENDANCE_PAYMENT_STAGES, 
  FMS_BREAKDOWN_REPORTING_STAGES, 
  FMS_EQUIPMENT_PART_REPAIR_STAGES, 
  FMS_DPR_REPORTING_STAGES,
  USERS,
  SYSTEM_BUILTIN_TEMPLATES
} from '../../data/initialData';
import { storageAdapter } from '../../services/storageAdapter';

const SLA_PRESETS = [
  { value: 0, label: 'Whenever Needed (No SLA Limit)' },
  { value: 1, label: '+1 Hour (Fast-Track / Bank approval)' },
  { value: 2, label: '+2 Hours' },
  { value: 3, label: '+3 Hours' },
  { value: 4, label: '+4 Hours (Half-Day)' },
  { value: 5, label: '+5 Hours' },
  { value: 6, label: '+6 Hours' },
  { value: 8, label: '+8 Hours (Full Shift)' },
  { value: 12, label: '+12 Hours (Half Day/Night)' },
  { value: 18, label: '+18 Hours' },
  { value: 24, label: '+24 Hours (Next Day)' },
  { value: 36, label: '+36 Hours' },
  { value: 48, label: '+48 Hours (2 Days)' },
  { value: 72, label: '+72 Hours (3 Days)' },
  { value: 120, label: '+120 Hours (5 Days)' },
  { value: 168, label: '+168 Hours (7 Days / 1 Week)' },
];

interface WhenSlaSelectorProps {
  value: number;
  onChange: (val: number) => void;
}

const WhenSlaSelector: React.FC<WhenSlaSelectorProps> = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');

  const matchedPreset = SLA_PRESETS.find((p) => p.value === value);

  const filteredPresets = SLA_PRESETS.filter((p) =>
    p.label.toLowerCase().includes(search.toLowerCase()) ||
    p.value.toString() === search.trim()
  );

  const parsedNum = parseInt(search.replace(/\D/g, ''), 10);
  const isCustomNum = !isNaN(parsedNum) && parsedNum > 0 && !SLA_PRESETS.some((p) => p.value === parsedNum);

  const getDisplayText = () => {
    if (value === 0) return 'Whenever Needed (No SLA Limit)';
    if (matchedPreset) return matchedPreset.label;
    return `+${value} Hours (Custom SLA)`;
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-semibold text-slate-800 flex items-center justify-between hover:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
      >
        <span className="truncate">{getDisplayText()}</span>
        <ChevronDown className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-20" onClick={() => setIsOpen(false)} />
          <div className="absolute right-0 top-full mt-1 w-64 bg-white border border-slate-200 rounded-xl shadow-lg z-30 p-2 space-y-2">
            <input
              type="text"
              autoFocus
              placeholder="Search or type custom hours (e.g. 15)..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg p-1.5 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
            />

            <div className="max-h-48 overflow-y-auto space-y-0.5 text-xs">
              {isCustomNum && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(parsedNum);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full text-left px-2 py-1.5 rounded bg-indigo-50 hover:bg-indigo-100 text-indigo-900 font-bold flex items-center justify-between cursor-pointer"
                >
                  <span>+ Set Custom: {parsedNum} Hours</span>
                  <span className="text-[10px] bg-indigo-200 text-indigo-800 px-1.5 py-0.5 rounded font-mono">Custom</span>
                </button>
              )}

              {('whenever needed').includes(search.toLowerCase().trim()) && search.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    onChange(0);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className="w-full text-left px-2 py-1.5 rounded hover:bg-slate-100 text-slate-800 font-medium flex items-center justify-between cursor-pointer"
                >
                  <span>Whenever Needed (No SLA Limit)</span>
                </button>
              )}

              {filteredPresets.map((opt) => (
                <button
                  key={opt.value}
                  type="button"
                  onClick={() => {
                    onChange(opt.value);
                    setIsOpen(false);
                    setSearch('');
                  }}
                  className={`w-full text-left px-2 py-1.5 rounded transition-colors cursor-pointer flex items-center justify-between ${
                    value === opt.value
                      ? 'bg-indigo-600 text-white font-bold'
                      : 'hover:bg-slate-100 text-slate-800 font-medium'
                  }`}
                >
                  <span className="truncate">{opt.label}</span>
                  {value === opt.value && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 ml-1 text-white" />}
                </button>
              ))}

              {filteredPresets.length === 0 && !isCustomNum && (
                <p className="text-[11px] text-slate-400 p-2 text-center">Type a valid number (e.g. 15) or select "Whenever Needed"</p>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export interface TargetStage1Field {
  id: string;
  label: string;
  type: 'TEXT' | 'NUMBER' | 'SELECT' | 'DATE' | 'URL' | 'TEXTAREA' | 'FILE' | 'APPROVAL';
  options?: string[];
  required?: boolean;
  placeholder?: string;
  defaultSourceField: string;
}

export interface TargetStage1Info {
  key: string;
  templateName: string;
  stage1Id: string;
  stage1Name: string;
  whoRole: string;
  whoDefaultAssignee: string;
  slaHours: number;
  howChannel: string;
  fields: TargetStage1Field[];
  checkpoints: string[];
}

export const getTargetStage1Info = (templateKey: string): TargetStage1Info => {
  switch (templateKey) {
    case 'PO_TO_PAYMENT':
      return {
        key: 'PO_TO_PAYMENT',
        templateName: 'Accounts PO to Bank Payment FMS',
        stage1Id: 'STG-PAY-01',
        stage1Name: 'Payment Request Initiation & Voucher Entry',
        whoRole: 'FINANCE / EA / PURCHASER',
        whoDefaultAssignee: 'Pranjal Agrawal / Khushboo',
        slaHours: 0,
        howChannel: 'ACCOUNTS PAYMENT SHEET / FORM',
        fields: [
          { id: 'sheetNo', label: 'Sheet / Voucher Ref No.', type: 'TEXT', required: true, defaultSourceField: 'poNumber' },
          { id: 'vendorName', label: 'Vendor / Beneficiary Name', type: 'TEXT', required: true, defaultSourceField: 'vendorName' },
          { id: 'purposeOfPayment', label: 'Purpose of Payment', type: 'TEXT', required: true, defaultSourceField: 'remarks' },
          { id: 'requestedBy', label: 'Requested By (Purchaser)', type: 'TEXT', required: true, defaultSourceField: 'requestedBy' },
          { id: 'site', label: 'Site / Location', type: 'SELECT', options: ['Raipur Office', 'Raipur Workshop', 'Siladehi Site', 'Bijetala Site'], required: true, defaultSourceField: 'siteName' },
          { id: 'modeOfPayment', label: 'Mode Of Payment', type: 'SELECT', options: ['UPI', 'ACCOUNT', 'RTGS/NEFT', 'CHEQUE'], required: true, defaultSourceField: 'paymentMode' },
          { id: 'amountToBePaid', label: 'Amount to Be Paid (₹)', type: 'NUMBER', required: true, defaultSourceField: 'poAmount' },
          { id: 'billNoOrPo', label: 'Bill No. / PO Reference', type: 'TEXT', required: true, defaultSourceField: 'poNumber' },
          { id: 'poUploadLink', label: 'PO / Invoice Document Link', type: 'URL', required: false, defaultSourceField: 'attachmentUrl' },
          { id: 'remark', label: 'Payment Notes / Instructions', type: 'TEXTAREA', required: false, defaultSourceField: 'remarks' },
        ],
        checkpoints: [
          'Bill / PO voucher copy attached & verified legible',
          'Vendor name & GST matched with vendor master',
          'Bank payment mode & account IFSC confirmed',
          'Amount matches purchase order authorization',
        ],
      };

    case 'CHECK_STOCK':
      return {
        key: 'CHECK_STOCK',
        templateName: 'Store Check Stock FMS',
        stage1Id: 'STG-CHK-01',
        stage1Name: 'Indent Stock Check & Bin Count Verification',
        whoRole: 'STORE KEEPER',
        whoDefaultAssignee: 'Mahesh Verma',
        slaHours: 0,
        howChannel: 'STORE APP / GOOGLE FORM',
        fields: [
          { id: 'indentNo', label: 'Indent Requisition Number', type: 'TEXT', required: true, defaultSourceField: 'indentNo' },
          { id: 'siteName', label: 'Site / Store Location', type: 'TEXT', required: true, defaultSourceField: 'siteName' },
          { id: 'itemDetails', label: 'Item / Material Description', type: 'TEXT', required: true, defaultSourceField: 'itemDescription' },
          { id: 'reqQuantity', label: 'Required Requisition Quantity', type: 'NUMBER', required: true, defaultSourceField: 'quantity' },
          { id: 'inStockQty', label: 'Current Available Stock in Bin', type: 'NUMBER', required: true, defaultSourceField: 'availableStock' },
          { id: 'remarks', label: 'Stock Verification Remarks', type: 'TEXTAREA', required: false, defaultSourceField: 'remarks' },
        ],
        checkpoints: [
          'Physical store bin count performed',
          'Stock ledger vs physical count verified',
        ],
      };

    case 'STORE_TO_SITE_DISPATCH':
      return {
        key: 'STORE_TO_SITE_DISPATCH',
        templateName: 'Store to Site Dispatch FMS',
        stage1Id: 'STG-DISP-01',
        stage1Name: 'Dispatch Order & Gate Pass Generation',
        whoRole: 'STORE KEEPER',
        whoDefaultAssignee: 'Mahesh Verma',
        slaHours: 0,
        howChannel: 'GATE PASS SYSTEM',
        fields: [
          { id: 'dispatchChallanNo', label: 'Dispatch / Gate Pass Number', type: 'TEXT', required: true, defaultSourceField: 'challanNo' },
          { id: 'indentNo', label: 'Indent Reference', type: 'TEXT', required: true, defaultSourceField: 'indentNo' },
          { id: 'site', label: 'Destination Site', type: 'SELECT', options: ['Siladehi Site', 'Bijetala Site', 'Raipur Workshop'], required: true, defaultSourceField: 'siteName' },
          { id: 'dispatchedQty', label: 'Dispatched Quantity', type: 'NUMBER', required: true, defaultSourceField: 'dispatchQty' },
          { id: 'driverName', label: 'Driver / Transporter Name', type: 'TEXT', required: true, defaultSourceField: 'driverName' },
          { id: 'vehicleNo', label: 'Vehicle / Truck Number', type: 'TEXT', required: true, defaultSourceField: 'vehicleNo' },
          { id: 'remarks', label: 'Dispatch Gate Notes', type: 'TEXTAREA', required: false, defaultSourceField: 'remarks' },
        ],
        checkpoints: [
          'Material loaded & weighed on site scale',
          'Delivery challan signed by store in-charge',
        ],
      };

    case 'PURCHASE_TO_STORE_DISPATCH':
      return {
        key: 'PURCHASE_TO_STORE_DISPATCH',
        templateName: 'Purchase to Store Dispatch FMS',
        stage1Id: 'STG-PSD-01',
        stage1Name: 'Vendor Shipment Dispatch Tracking',
        whoRole: 'PURCHASE EXECUTIVE',
        whoDefaultAssignee: 'Shyam Rao Sureshe',
        slaHours: 0,
        howChannel: 'WHATSAPP / LOGISTICS FORM',
        fields: [
          { id: 'poNumber', label: 'Purchase Order Reference', type: 'TEXT', required: true, defaultSourceField: 'poNumber' },
          { id: 'vendorName', label: 'Vendor Name', type: 'TEXT', required: true, defaultSourceField: 'vendorName' },
          { id: 'lrNumber', label: 'LR / Docket Transport No.', type: 'TEXT', required: true, defaultSourceField: 'lrNumber' },
          { id: 'transporter', label: 'Logistics / Transporter Name', type: 'TEXT', required: true, defaultSourceField: 'transporter' },
          { id: 'expectedDeliveryDate', label: 'Expected Store Arrival Date', type: 'DATE', required: true, defaultSourceField: 'expectedDate' },
          { id: 'remarks', label: 'Transit Tracking Remarks', type: 'TEXTAREA', required: false, defaultSourceField: 'remarks' },
        ],
        checkpoints: [
          'LR copy uploaded & shared with destination store',
          'Driver mobile number recorded & active',
        ],
      };

    case 'PAYMENT_TO_DISPATCH':
      return {
        key: 'PAYMENT_TO_DISPATCH',
        templateName: 'Vendor Payment to Dispatch FMS',
        stage1Id: 'STG-PTD-01',
        stage1Name: 'Payment Confirmation & Vendor Dispatch Advice',
        whoRole: 'ACCOUNTS EXECUTIVE',
        whoDefaultAssignee: 'Pranjal Agrawal',
        slaHours: 0,
        howChannel: 'ACCOUNTS DASHBOARD',
        fields: [
          { id: 'poNumber', label: 'Purchase Order Reference', type: 'TEXT', required: true, defaultSourceField: 'poNumber' },
          { id: 'utrNumber', label: 'Bank UTR / Transaction Ref', type: 'TEXT', required: true, defaultSourceField: 'utrNumber' },
          { id: 'paidAmount', label: 'Total Paid Amount (₹)', type: 'NUMBER', required: true, defaultSourceField: 'poAmount' },
          { id: 'vendorConfirmation', label: 'Vendor Confirmation Status', type: 'SELECT', options: ['YES - Dispatch Released', 'PENDING'], required: true, defaultSourceField: 'vendorConfirmation' },
          { id: 'dispatchAdviceNo', label: 'Dispatch Advice Advice Ref', type: 'TEXT', required: false, defaultSourceField: 'dispatchAdviceNo' },
        ],
        checkpoints: [
          'Bank UTR verified in bank netbanking portal',
          'Payment debit advice emailed to vendor sales desk',
        ],
      };

    case 'SITE_RECEIVE':
      return {
        key: 'SITE_RECEIVE',
        templateName: 'Site Material Receive MRN FMS',
        stage1Id: 'STG-MRN-01',
        stage1Name: 'Material Receipt Note (MRN) & Unloading Inspection',
        whoRole: 'SITE STORE IN-CHARGE',
        whoDefaultAssignee: 'Suresh Kumar',
        slaHours: 0,
        howChannel: 'MRN MOBILE FORM',
        fields: [
          { id: 'mrnNumber', label: 'MRN Entry Number', type: 'TEXT', required: true, defaultSourceField: 'mrnNo' },
          { id: 'poNumber', label: 'PO / Gate Pass Ref', type: 'TEXT', required: true, defaultSourceField: 'poNumber' },
          { id: 'receivedQty', label: 'Total Received Quantity', type: 'NUMBER', required: true, defaultSourceField: 'quantity' },
          { id: 'damagedQty', label: 'Damaged / Shortage Quantity', type: 'NUMBER', required: false, defaultSourceField: 'damagedQty' },
          { id: 'inspectorName', label: 'Unloading Inspector Name', type: 'TEXT', required: true, defaultSourceField: 'requestedBy' },
          { id: 'mrnPhotos', label: 'Unloading Inspection Photo Link', type: 'URL', required: false, defaultSourceField: 'photoUrl' },
        ],
        checkpoints: [
          'Physical material counted at unloading dock',
          'Quality & physical damage checklist verified',
        ],
      };

    case 'ACCOUNTS_INVOICE_COLLECTION':
      return {
        key: 'ACCOUNTS_INVOICE_COLLECTION',
        templateName: 'Accounts Invoice Collection FMS',
        stage1Id: 'STG-INV-01',
        stage1Name: 'Tax Invoice Entry & GST Portal Verification',
        whoRole: 'ACCOUNTS CLERK',
        whoDefaultAssignee: 'Khushboo',
        slaHours: 0,
        howChannel: 'TAX INVOICE MODULE',
        fields: [
          { id: 'invoiceNumber', label: 'Tax Invoice Number', type: 'TEXT', required: true, defaultSourceField: 'invoiceNo' },
          { id: 'invoiceDate', label: 'Invoice Date', type: 'DATE', required: true, defaultSourceField: 'invoiceDate' },
          { id: 'poNumber', label: 'PO Reference Number', type: 'TEXT', required: true, defaultSourceField: 'poNumber' },
          { id: 'vendorGstin', label: 'Vendor GSTIN', type: 'TEXT', required: true, defaultSourceField: 'vendorGstin' },
          { id: 'taxableAmount', label: 'Taxable Amount (₹)', type: 'NUMBER', required: true, defaultSourceField: 'taxableAmount' },
          { id: 'gstAmount', label: 'GST Amount (₹)', type: 'NUMBER', required: true, defaultSourceField: 'gstAmount' },
          { id: 'totalInvoiceAmount', label: 'Total Invoice Amount (₹)', type: 'NUMBER', required: true, defaultSourceField: 'poAmount' },
        ],
        checkpoints: [
          'Scanned tax invoice copy uploaded',
          'GSTR 2B portal reflection checked',
        ],
      };

    case 'INDENT_PURCHASE':
    default:
      return {
        key: 'INDENT_PURCHASE',
        templateName: 'Purchase Indent to PO FMS',
        stage1Id: 'STG-IND-01',
        stage1Name: 'New Purchase Indent Requisition',
        whoRole: 'SITE ENGINEER',
        whoDefaultAssignee: 'Amit Sharma',
        slaHours: 0,
        howChannel: 'INDENT REQUISITION FORM',
        fields: [
          { id: 'indentNo', label: 'Indent Requisition Number', type: 'TEXT', required: true, defaultSourceField: 'indentNo' },
          { id: 'requestedBy', label: 'Requisitioner Name', type: 'TEXT', required: true, defaultSourceField: 'requestedBy' },
          { id: 'department', label: 'Site Location / Department', type: 'TEXT', required: true, defaultSourceField: 'siteName' },
          { id: 'itemCategory', label: 'Material Category', type: 'TEXT', required: true, defaultSourceField: 'itemCategory' },
          { id: 'quantity', label: 'Required Requisition Quantity', type: 'NUMBER', required: true, defaultSourceField: 'quantity' },
          { id: 'urgency', label: 'Urgency Priority', type: 'SELECT', options: ['NORMAL', 'HIGH', 'CRITICAL'], required: true, defaultSourceField: 'priority' },
        ],
        checkpoints: [
          'Indent requisition signed by site manager',
          'Budget availability confirmed',
        ],
      };
  }
};

interface SelectOptionsEditorProps {
  options?: string[];
  onChange: (options: string[]) => void;
}

const SelectOptionsEditor: React.FC<SelectOptionsEditorProps> = ({ options = [], onChange }) => {
  const optionsJoined = options ? options.join(', ') : '';
  const [text, setText] = useState(() => optionsJoined);
  const [singleInput, setSingleInput] = useState('');
  const isTypingRef = React.useRef(false);

  useEffect(() => {
    if (!isTypingRef.current) {
      setText(optionsJoined);
    }
  }, [optionsJoined]);

  const commitParsed = (val: string) => {
    const parsed = val
      .split(',')
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    onChange(parsed);
  };

  const handleTextChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    isTypingRef.current = true;
    const val = e.target.value;
    setText(val);
    commitParsed(val);
  };

  const handleBlur = () => {
    isTypingRef.current = false;
    commitParsed(text);
  };

  const handleApplyPreset = (preset: string[]) => {
    isTypingRef.current = false;
    onChange(preset);
    setText(preset.join(', '));
  };

  const handleRemoveOption = (optToRemove: string) => {
    isTypingRef.current = false;
    const updated = options.filter((o) => o !== optToRemove);
    onChange(updated);
    setText(updated.join(', '));
  };

  const handleAddSingle = () => {
    const trimmed = singleInput.trim();
    if (!trimmed) return;
    const newItems = trimmed.split(',').map((s) => s.trim()).filter(Boolean);
    const updated = [...options, ...newItems.filter((i) => !options.includes(i))];
    isTypingRef.current = false;
    onChange(updated);
    setText(updated.join(', '));
    setSingleInput('');
  };

  return (
    <div className="p-2.5 bg-indigo-50/70 rounded-lg border border-indigo-200 space-y-2 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-1">
        <label className="text-[11px] font-bold text-indigo-950 flex items-center gap-1">
          <span>Dropdown Choices (comma-separated):</span>
        </label>
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-slate-500 font-medium">Presets:</span>
          <button
            type="button"
            onClick={() => handleApplyPreset(['SILADEHI', 'BIJETALA', 'RAIPUR', 'CENTRAL STORE'])}
            className="text-[10px] font-bold bg-white text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
          >
            Sites
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(['Normal', 'Urgent', 'Low'])}
            className="text-[10px] font-bold bg-white text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
          >
            Priority
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(['Bank Account (NEFT/RTGS)', 'UPI QR Code', 'Cheque', 'Cash'])}
            className="text-[10px] font-bold bg-white text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
          >
            Payment
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset(['YES', 'NO'])}
            className="text-[10px] font-bold bg-white text-indigo-700 px-1.5 py-0.5 rounded border border-indigo-200 hover:bg-indigo-100 cursor-pointer"
          >
            Yes/No
          </button>
          <button
            type="button"
            onClick={() => handleApplyPreset([])}
            className="text-[10px] font-bold bg-white text-rose-600 px-1.5 py-0.5 rounded border border-rose-200 hover:bg-rose-50 cursor-pointer"
          >
            Clear
          </button>
        </div>
      </div>

      <div className="space-y-1">
        <input
          type="text"
          value={text}
          onChange={handleTextChange}
          onBlur={handleBlur}
          placeholder="e.g. SILADEHI, BIJETALA, RAIPUR, CENTRAL STORE or Custom Site A, Custom Site B"
          className="w-full text-xs bg-white border border-indigo-300 rounded px-2.5 py-1.5 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-2xs"
        />
        <div className="flex flex-wrap items-center justify-between text-[10px] text-slate-500">
          <span>Type or edit choices separated by commas (e.g. <span className="font-mono text-indigo-700 font-semibold">Site A, Site B, Site C</span>)</span>
          <span className="font-mono text-indigo-900 font-bold">{options.length} options set</span>
        </div>
      </div>

      <div className="pt-1.5 border-t border-indigo-100 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <input
            type="text"
            value={singleInput}
            onChange={(e) => setSingleInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleAddSingle();
              }
            }}
            placeholder="+ Add single choice"
            className="text-[11px] bg-white border border-indigo-200 rounded px-2 py-0.5 w-36 text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-400"
          />
          <button
            type="button"
            onClick={handleAddSingle}
            className="text-[11px] font-bold bg-indigo-600 text-white px-2 py-0.5 rounded hover:bg-indigo-700 cursor-pointer"
          >
            Add
          </button>
        </div>

        {options && options.length > 0 ? (
          <div className="flex flex-wrap gap-1 items-center">
            {options.map((opt, oIdx) => (
              <span
                key={oIdx}
                className="inline-flex items-center gap-1 text-[10px] font-bold bg-white text-indigo-900 pl-2 pr-1 py-0.5 rounded-full border border-indigo-200 shadow-2xs"
              >
                <span>{opt}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveOption(opt)}
                  className="text-slate-400 hover:text-rose-600 rounded-full p-0.5 cursor-pointer"
                  title="Remove choice"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            ))}
          </div>
        ) : (
          <span className="text-[10px] text-amber-700 font-medium">
            No choices entered yet.
          </span>
        )}
      </div>
    </div>
  );
};

interface FmsTemplateStudioModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveTemplate: (template: FmsTemplateDefinition) => void;
  initialTemplateKey?: string | null;
}

export const FmsTemplateStudioModal: React.FC<FmsTemplateStudioModalProps> = ({
  isOpen,
  onClose,
  onSaveTemplate,
  initialTemplateKey,
}) => {
  const customTemplates = storageAdapter.getFmsTemplates().filter((t) => {
    if (
      t.templateKey === 'CHECK_STOCK' ||
      t.templateKey === 'STORE_CHECK_STOCK' ||
      t.id === 'tpl_check_stock' ||
      t.id === 'tpl_store_check_stock' ||
      t.name?.toLowerCase().includes('stock check') ||
      t.name?.toLowerCase().includes('check stock')
    ) {
      return false;
    }
    const isBuiltin = SYSTEM_BUILTIN_TEMPLATES.some(
      (sys) => sys.id === t.id || sys.templateKey === t.templateKey
    );
    return !isBuiltin;
  });
  const [selectedExistingKey, setSelectedExistingKey] = useState<string>('');
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [saveMode, setSaveMode] = useState<'UPDATE_EXISTING' | 'SAVE_AS_NEW'>('UPDATE_EXISTING');
  const [templateName, setTemplateName] = useState<string>('');
  const [departmentHub, setDepartmentHub] = useState<FmsTemplateDefinition['departmentHub']>('FINANCE_ACCOUNTS');
  const [referenceLabel, setReferenceLabel] = useState<string>('Voucher / Sheet No.');
  const [description, setDescription] = useState<string>('');
  const [defaultPriority, setDefaultPriority] = useState<Priority>('Normal');
  const [confirmDeleteTemplate, setConfirmDeleteTemplate] = useState<boolean>(false);
  const [showTechnicalKeys, setShowTechnicalKeys] = useState<boolean>(false);

  useEffect(() => {
    if (isOpen) {
      setConfirmDeleteTemplate(false);
      if (initialTemplateKey) {
        setSelectedExistingKey(initialTemplateKey);
        handleLoadExisting(initialTemplateKey);
      } else {
        setSelectedExistingKey('');
        setEditingTemplateId(null);
      }
    }
  }, [isOpen, initialTemplateKey]);
  
  const [stages, setStages] = useState<FmsStageTemplate[]>([
    {
      stageId: 'STG-CUSTOM-01',
      stageName: 'Requisition / Form Initiation',
      whoRole: 'Requester',
      whoDefaultAssignee: USERS[0]?.name || 'GARIMA PAL',
      slaHours: 1,
      fields: [
        { id: 'purpose', label: 'Purpose / Description', type: 'TEXT', required: true },
        { id: 'amount', label: 'Estimated Amount (₹)', type: 'NUMBER', required: true },
        { id: 'documentLink', label: 'Attachment / Document Link', type: 'URL', required: false },
      ],
      checkpoints: [
        'All physical bills / quotation copies attached & legible',
        'Estimated amount verified within department budget',
      ],
    },
    {
      stageId: 'STG-CUSTOM-02',
      stageName: 'Management Approval',
      whoRole: 'Approver',
      whoDefaultAssignee: USERS[1]?.name || 'ASHIS PATHNAYAK',
      slaHours: 1,
      fields: [
        { id: 'status', label: 'Approval Status', type: 'APPROVAL', options: ['APPROVED', 'REJECTED'], required: true },
        { id: 'approvalRemarks', label: 'Approval Comments', type: 'TEXTAREA', required: false },
      ],
      checkpoints: [
        'Management justification and necessity verified',
        'Vendor background & terms reviewed and approved',
      ],
    },
  ]);

  const [error, setError] = useState<string | null>(null);
  const [importSuccessMsg, setImportSuccessMsg] = useState<string | null>(null);
  const [isImporting, setIsImporting] = useState<boolean>(false);
  const [confirmReset, setConfirmReset] = useState<boolean>(false);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsImporting(true);
    setError(null);
    setImportSuccessMsg(null);
    try {
      const res = await parseFmsExcelFile(file);
      if (!res.success || !res.template) {
        setError(res.error || 'Failed to parse Excel file');
        return;
      }
      const tpl = res.template;
      setEditingTemplateId(tpl.id);
      setTemplateName(tpl.name);
      setDepartmentHub(tpl.departmentHub);
      setReferenceLabel(tpl.referenceLabel);
      setDescription(tpl.description || '');
      setDefaultPriority(tpl.defaultPriority);
      setStages(tpl.stages.map((s) => ({
        ...s,
        fields: s.fields ? [...s.fields] : [],
        checkpoints: s.checkpoints ? [...s.checkpoints] : [],
      })));
      setSaveMode('SAVE_AS_NEW');
      setSelectedExistingKey('');
      setImportSuccessMsg(
        `Successfully loaded "${tpl.name}" from Excel with ${res.stageCount} stages and ${res.fieldCount} fields! Review the details below and click "Save & Activate Workflow".`
      );
    } catch (err: any) {
      setError(`Error reading file: ${err?.message || 'Unknown error'}`);
    } finally {
      setIsImporting(false);
      e.target.value = '';
    }
  };

  const handleResetTemplate = () => {
    setError(null);
    setConfirmReset(false);

    if (selectedExistingKey) {
      if (selectedExistingKey.startsWith('CUSTOM_')) {
        const custId = selectedExistingKey.replace('CUSTOM_', '');
        const tpl = customTemplates.find((t) => t.id === custId);
        if (tpl) {
          setEditingTemplateId(tpl.id);
          setTemplateName(tpl.name);
          setDepartmentHub(tpl.departmentHub);
          setReferenceLabel(tpl.referenceLabel);
          setDescription(tpl.description || '');
          setDefaultPriority(tpl.defaultPriority);
          setStages(tpl.stages.map((s) => ({ ...s, fields: s.fields ? [...s.fields] : [], checkpoints: s.checkpoints ? [...s.checkpoints] : [] })));
          setSaveMode('UPDATE_EXISTING');
        }
      } else {
        handleLoadExisting(selectedExistingKey);
      }
    } else {
      setEditingTemplateId(null);
      setTemplateName('');
      setDepartmentHub('FINANCE_ACCOUNTS');
      setReferenceLabel('Voucher / Sheet No.');
      setDescription('');
      setDefaultPriority('Normal');
      setStages([
        {
          stageId: 'STG-CUSTOM-01',
          stageName: 'Requisition / Form Initiation',
          whoRole: 'Requester',
          whoDefaultAssignee: USERS[0]?.name || 'GARIMA PAL',
          slaHours: 1,
          fields: [
            { id: 'purpose', label: 'Purpose / Description', type: 'TEXT', required: true },
            { id: 'amount', label: 'Estimated Amount (₹)', type: 'NUMBER', required: true },
            { id: 'documentLink', label: 'Attachment / Document Link', type: 'URL', required: false },
          ],
          checkpoints: [
            'All physical bills / quotation copies attached & legible',
            'Estimated amount verified within department budget',
          ],
        },
        {
          stageId: 'STG-CUSTOM-02',
          stageName: 'Management Approval',
          whoRole: 'Approver',
          whoDefaultAssignee: USERS[1]?.name || 'ASHIS PATHNAYAK',
          slaHours: 1,
          fields: [
            { id: 'status', label: 'Approval Status', type: 'APPROVAL', options: ['APPROVED', 'REJECTED'], required: true },
            { id: 'approvalRemarks', label: 'Approval Comments', type: 'TEXTAREA', required: false },
          ],
          checkpoints: [
            'Management justification and necessity verified',
            'Vendor background & terms reviewed and approved',
          ],
        },
      ]);
    }
  };

  const handleLoadExisting = (key: string) => {
    setSelectedExistingKey(key);
    setError(null);
    if (!key) return;

    if (key.startsWith('CUSTOM_')) {
      const custId = key.replace('CUSTOM_', '');
      const tpl = customTemplates.find((t) => t.id === custId);
      if (tpl) {
        setEditingTemplateId(tpl.id);
        setTemplateName(tpl.name);
        setDepartmentHub(tpl.departmentHub);
        setReferenceLabel(tpl.referenceLabel);
        setDescription(tpl.description || '');
        setDefaultPriority(tpl.defaultPriority);
        setStages(tpl.stages.map((s) => ({ ...s, fields: s.fields ? [...s.fields] : [], checkpoints: s.checkpoints ? [...s.checkpoints] : [] })));
        setSaveMode('UPDATE_EXISTING');
      }
      return;
    }

    // Check if an existing workflow was already customized and saved previously
    const previouslyCustomized = customTemplates.find((t) => t.templateKey === key || t.id === `builtin_${key}`);
    if (previouslyCustomized) {
      setEditingTemplateId(previouslyCustomized.id);
      setTemplateName(previouslyCustomized.name);
      setDepartmentHub(previouslyCustomized.departmentHub);
      setReferenceLabel(previouslyCustomized.referenceLabel);
      setDescription(previouslyCustomized.description || '');
      setDefaultPriority(previouslyCustomized.defaultPriority);
      setStages(previouslyCustomized.stages.map((s) => ({ ...s, fields: s.fields ? [...s.fields] : [], checkpoints: s.checkpoints ? [...s.checkpoints] : [] })));
      setSaveMode('UPDATE_EXISTING');
      return;
    }

    setEditingTemplateId(`builtin_${key}`);
    setSaveMode('UPDATE_EXISTING');
    let name = '';
    let hub: FmsTemplateDefinition['departmentHub'] = 'PROCUREMENT';
    let ref = 'Reference Code';
    let baseStages: any[] = [];

    switch (key) {
      case 'CHECK_STOCK':
        name = 'Store Inventory Stock Check';
        hub = 'SITE_LOGISTICS';
        ref = 'Requisition / Indent Ref';
        baseStages = FMS_CHECK_STOCK_STAGES;
        break;
      case 'INDENT_PURCHASE':
        name = 'Purchase Indent to PO';
        hub = 'PROCUREMENT';
        ref = 'Indent Number';
        baseStages = FMS_STANDARD_PURCHASE_STAGES;
        break;
      case 'PO_TO_PAYMENT':
        name = 'Accounts PO to Payment';
        hub = 'FINANCE_ACCOUNTS';
        ref = 'PO Number';
        baseStages = FMS_PO_PAYMENT_STAGES;
        break;
      case 'STORE_TO_SITE_DISPATCH':
        name = 'Store to Site Dispatch';
        hub = 'SITE_LOGISTICS';
        ref = 'Requisition Number';
        baseStages = FMS_STORE_TO_SITE_DISPATCH_STAGES;
        break;
      case 'PURCHASE_TO_STORE_DISPATCH':
        name = 'Purchase to Store Dispatch';
        hub = 'SITE_LOGISTICS';
        ref = 'Challan / Indent Ref';
        baseStages = FMS_PURCHASE_TO_STORE_DISPATCH_STAGES;
        break;
      case 'PAYMENT_TO_DISPATCH':
        name = 'Vendor Payment to Dispatch';
        hub = 'PROCUREMENT';
        ref = 'PO Number';
        baseStages = FMS_PAYMENT_TO_DISPATCH_STAGES;
        break;
      case 'SITE_RECEIVE':
        name = 'Site Material Receive (MRN)';
        hub = 'SITE_LOGISTICS';
        ref = 'MRN / Delivery Challan';
        baseStages = FMS_SITE_RECEIVE_STAGES;
        break;
      case 'ACCOUNTS_INVOICE_COLLECTION':
        name = 'Accounts Invoice Collection';
        hub = 'FINANCE_ACCOUNTS';
        ref = 'Invoice / PO Reference';
        baseStages = FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES;
        break;
      case 'HR_ATTENDANCE_PAYMENT':
        name = 'Labour Attendance & Payment';
        hub = 'HR_EQUIPMENT';
        ref = 'Attendance Cycle Ref';
        baseStages = FMS_HR_ATTENDANCE_PAYMENT_STAGES;
        break;
      case 'BREAKDOWN_REPORTING':
        name = 'Machine Breakdown';
        hub = 'HR_EQUIPMENT';
        ref = 'Machine ID / Breakdown Ref';
        baseStages = FMS_BREAKDOWN_REPORTING_STAGES;
        break;
      case 'EQUIPMENT_PART_REPAIR':
        name = 'Equipment Part Repair';
        hub = 'HR_EQUIPMENT';
        ref = 'Part Serial No.';
        baseStages = FMS_EQUIPMENT_PART_REPAIR_STAGES;
        break;
      case 'DPR_REPORTING':
        name = 'Daily Progress Report (DPR)';
        hub = 'OPERATIONS';
        ref = 'DPR Sheet Date/Code';
        baseStages = FMS_DPR_REPORTING_STAGES;
        break;
      default:
        return;
    }

    setTemplateName(name);
    setDepartmentHub(hub);
    setReferenceLabel(ref);
    setDescription(`Customized workflow template adapted from standard ${name}.`);

    const loadedStages: FmsStageTemplate[] = baseStages.map((def: any, idx: number) => {
      let defaultFields: FmsStageFieldConfig[] = [
        { id: `status_${idx + 1}`, label: 'Action Result', type: 'STATUS_DONE', required: true },
        { id: `remarks_${idx + 1}`, label: 'Remarks', type: 'TEXTAREA', required: false },
      ];

      // Stage #1 Trigger & Initiation Form Fields across baseline workflows
      if (idx === 0) {
        if (key === 'INDENT_PURCHASE') {
          defaultFields = [
            { id: 'indentNo', label: 'Indent No. / Requisition Ref', type: 'TEXT', required: true },
            { id: 'indentDate', label: 'Indent Date', type: 'TEXT', required: true },
            { id: 'siteName', label: 'Site Name', type: 'SELECT', options: ['SILADEHI', 'BIJETALA', 'RAIPUR', 'CENTRAL STORE'], required: true },
            { id: 'priority', label: 'Priority', type: 'SELECT', options: ['Normal', 'Urgent', 'Low'], required: true },
            { id: 'materialSpecs', label: 'Material Specifications & Items Needed', type: 'TEXTAREA', required: true },
            { id: 'remarks', label: 'Purpose / Remarks', type: 'TEXTAREA', required: false },
            { id: 'attachmentUrl', label: 'Indent Doc / Google Form / File Upload', type: 'URL', required: false },
          ];
        } else if (key === 'CHECK_STOCK') {
          defaultFields = [
            { id: 'email', label: 'Email Address', type: 'TEXT', required: true },
            { id: 'requisitionNumber', label: 'REQUISITION NUMBER', type: 'TEXT', required: true },
            { id: 'indentDate', label: 'REQUISITION DATE', type: 'TEXT', required: true },
            { id: 'siteName', label: 'SITE', type: 'SELECT', options: ['SILADEHI', 'BIJETALA', 'RAIPUR', 'CENTRAL STORE'], required: true },
            { id: 'materialDetails', label: 'MATERIAL ITEMS & SPECIFICATIONS', type: 'TEXTAREA', required: true },
            { id: 'remarks', label: 'REQUISITION PURPOSE / REMARKS', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'PO_TO_PAYMENT') {
          defaultFields = [
            { id: 'paymentRoute', label: 'Payment Route Decision', type: 'SELECT', options: ['YES - Bank Account (NEFT/RTGS)', 'NO - UPI QR Code Route'], required: true },
            { id: 'poNumber', label: 'PO Number / Voucher No.', type: 'TEXT', required: true },
            { id: 'vendorName', label: 'Vendor Name', type: 'TEXT', required: true },
            { id: 'poAmount', label: 'PO Amount (₹)', type: 'NUMBER', required: true },
            { id: 'poDate', label: 'PO Date', type: 'TEXT', required: true },
            { id: 'siteName', label: 'Site Location', type: 'SELECT', options: ['Raipur Office', 'Raipur Workshop', 'Siladehi Site', 'Bijetala Site'], required: true },
            { id: 'remarks', label: 'Payment Terms & Notes', type: 'TEXTAREA', required: false },
            { id: 'poUploadLink', label: 'PO / Voucher Upload Link', type: 'URL', required: false },
          ];
        } else if (key === 'STORE_TO_SITE_DISPATCH') {
          defaultFields = [
            { id: 'requisitionNumber', label: 'Issue Slip / Indent Ref', type: 'TEXT', required: true },
            { id: 'siteName', label: 'Destination Site', type: 'SELECT', options: ['SILADEHI', 'BIJETALA', 'RAIPUR', 'CENTRAL STORE'], required: true },
            { id: 'priority', label: 'Priority', type: 'SELECT', options: ['Normal', 'Urgent', 'Low'], required: true },
            { id: 'requiredDate', label: 'Required By Date', type: 'TEXT', required: true },
            { id: 'itemsList', label: 'Materials Items List & Quantity', type: 'TEXTAREA', required: true },
            { id: 'remarks', label: 'Issue Requisition Notes', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'PURCHASE_TO_STORE_DISPATCH') {
          defaultFields = [
            { id: 'poNumber', label: 'PO Number / LR Consignment No.', type: 'TEXT', required: true },
            { id: 'vendorName', label: 'Vendor Name', type: 'TEXT', required: true },
            { id: 'warehouseLocation', label: 'Receiving Store / Warehouse', type: 'SELECT', options: ['SILADEHI STORE', 'BIJETALA STORE', 'RAIPUR CENTRAL STORE'], required: true },
            { id: 'shipmentDate', label: 'Shipment / Transit Date', type: 'TEXT', required: true },
            { id: 'driverDetails', label: 'Driver / Transporter Details', type: 'TEXT', required: false },
            { id: 'remarks', label: 'Consignment Notes & Items', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'SITE_RECEIVE') {
          defaultFields = [
            { id: 'mrnNumber', label: 'Delivery Challan / MRN No.', type: 'TEXT', required: true },
            { id: 'consignorStore', label: 'Consignor / Source Store', type: 'TEXT', required: true },
            { id: 'siteName', label: 'Receiving Site', type: 'SELECT', options: ['SILADEHI', 'BIJETALA', 'RAIPUR'], required: true },
            { id: 'receivedDate', label: 'Receiving Date', type: 'TEXT', required: true },
            { id: 'vehicleNumber', label: 'Vehicle Number', type: 'TEXT', required: false },
            { id: 'remarks', label: 'Gate Inward Intake Remarks', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'PAYMENT_TO_DISPATCH') {
          defaultFields = [
            { id: 'poNumber', label: 'PO Number / Order Ref', type: 'TEXT', required: true },
            { id: 'vendorName', label: 'Vendor Name', type: 'TEXT', required: true },
            { id: 'poAmount', label: 'Approved Order Amount (₹)', type: 'NUMBER', required: true },
            { id: 'expectedDispatchDate', label: 'Expected Vendor Dispatch Date', type: 'TEXT', required: true },
            { id: 'vendorContact', label: 'Vendor Contact Person & Phone', type: 'TEXT', required: false },
            { id: 'remarks', label: 'Procurement Notes', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'ACCOUNTS_INVOICE_COLLECTION') {
          defaultFields = [
            { id: 'invoiceNumber', label: 'Vendor Invoice Number', type: 'TEXT', required: true },
            { id: 'invoiceDate', label: 'Invoice Date', type: 'TEXT', required: true },
            { id: 'vendorName', label: 'Vendor Name & GSTIN', type: 'TEXT', required: true },
            { id: 'poRef', label: 'Purchase Order Reference', type: 'TEXT', required: true },
            { id: 'invoiceAmount', label: 'Total Invoice Amount (₹)', type: 'NUMBER', required: true },
            { id: 'invoicePdfUrl', label: 'Invoice Copy PDF / Photo Link', type: 'URL', required: false },
          ];
        } else if (key === 'HR_ATTENDANCE_PAYMENT') {
          defaultFields = [
            { id: 'attendanceDate', label: 'Muster Roll / Attendance Date', type: 'TEXT', required: true },
            { id: 'siteName', label: 'Project Site Location', type: 'SELECT', options: ['SILADEHI', 'BIJETALA', 'RAIPUR'], required: true },
            { id: 'gangName', label: 'Contractor / Labour Gang Name', type: 'TEXT', required: true },
            { id: 'totalLabourCount', label: 'Reported Labour Headcount', type: 'NUMBER', required: true },
            { id: 'musterRollUrl', label: 'Attendance Sheet Link / Upload', type: 'URL', required: false },
          ];
        } else if (key === 'BREAKDOWN_REPORTING') {
          defaultFields = [
            { id: 'machineName', label: 'Machine / Equipment Name', type: 'TEXT', required: true },
            { id: 'machineIdNo', label: 'Machine ID / Serial No.', type: 'TEXT', required: true },
            { id: 'siteName', label: 'Site Location', type: 'SELECT', options: ['SILADEHI', 'BIJETALA', 'RAIPUR'], required: true },
            { id: 'breakdownTime', label: 'Breakdown Date & Time', type: 'TEXT', required: true },
            { id: 'breakdownDetails', label: 'Defect / Defect Description', type: 'TEXTAREA', required: true },
          ];
        } else if (key === 'EQUIPMENT_PART_REPAIR') {
          defaultFields = [
            { id: 'machineName', label: 'Equipment / Machine Name', type: 'TEXT', required: true },
            { id: 'partSerialNo', label: 'Part Serial No. / Model', type: 'TEXT', required: true },
            { id: 'siteName', label: 'Site Location', type: 'SELECT', options: ['SILADEHI', 'BIJETALA', 'RAIPUR'], required: true },
            { id: 'priority', label: 'Repair Urgency', type: 'SELECT', options: ['Urgent', 'Normal', 'Low'], required: true },
            { id: 'defectDetails', label: 'Defect Description & Symptoms', type: 'TEXTAREA', required: true },
          ];
        } else if (key === 'DPR_REPORTING') {
          defaultFields = [
            { id: 'dprDate', label: 'DPR Sheet Date', type: 'TEXT', required: true },
            { id: 'siteName', label: 'Project Site Location', type: 'SELECT', options: ['SILADEHI', 'BIJETALA', 'RAIPUR'], required: true },
            { id: 'preparedBy', label: 'Prepared By (Officer)', type: 'TEXT', required: true },
            { id: 'workSummary', label: 'Work Items Executed Summary', type: 'TEXTAREA', required: true },
            { id: 'dprFileUrl', label: 'DPR Sheet Link / Attachment', type: 'URL', required: false },
          ];
        }
      } else if (idx === 1) {
        // Stage #2 Execution, Check & Verification Form Fields across baseline workflows
        if (key === 'CHECK_STOCK') {
          defaultFields = [
            { id: 'status', label: 'STATUS (STOCK VERIFICATION)', type: 'SELECT', options: ['DONE - Stock Available in Store', 'DONE - Stock Not Available (Purchase Required)', 'DONE - Partial Stock Available', 'NOT DONE - Physical Stock Verification Pending'], required: true },
            { id: 'availableStockQty', label: 'AVAILABLE STOCK QUANTITY IN STORE', type: 'TEXT', required: false },
            { id: 'storeLocation', label: 'STORE BIN / RACK LOCATION', type: 'TEXT', required: false },
            { id: 'remarks', label: 'STORE VERIFICATION REMARKS', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'INDENT_PURCHASE') {
          defaultFields = [
            { id: 'degradedCheck', label: 'DEGRADED MATERIAL CHECK', type: 'SELECT', options: ['Yes - Degraded parts to be returned', 'No - Fresh procurement only'], required: true },
            { id: 'degradedPartDetails', label: 'Degraded Part Serial No. / Description', type: 'TEXT', required: false },
            { id: 'remarks', label: 'Degraded Material Remarks', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'PO_TO_PAYMENT') {
          defaultFields = [
            { id: 'isAccountAdded', label: 'IS ACCOUNT ALREADY ADDED IN BANKING?', type: 'SELECT', options: ['YES - Account already registered', 'NO - Add new beneficiary required'], required: true },
            { id: 'beneficiaryAccount', label: 'Registered Bank Account / IFSC', type: 'TEXT', required: false },
            { id: 'remarks', label: 'Accounts Verification Notes', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'STORE_TO_SITE_DISPATCH') {
          defaultFields = [
            { id: 'vehicleNo', label: 'VEHICLE / TRANSPORT NUMBER', type: 'TEXT', required: true },
            { id: 'driverName', label: 'DRIVER NAME & CONTACT PHONE', type: 'TEXT', required: true },
            { id: 'vehicleType', label: 'VEHICLE TYPE', type: 'SELECT', options: ['Pickup (Bolero/Tata)', 'Truck (6-Wheeler)', 'Heavy Truck (10-Wheeler)', 'Site Tractor', 'Direct Transit'], required: true },
            { id: 'remarks', label: 'TRANSPORT ARRANGEMENT NOTES', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'PURCHASE_TO_STORE_DISPATCH') {
          defaultFields = [
            { id: 'verificationStatus', label: 'INSPECTION STATUS AGAINST PO', type: 'SELECT', options: ['VERIFIED & MATCHED', 'DISCREPANCY IN QUANTITY', 'DAMAGED IN TRANSIT', 'REJECTED'], required: true },
            { id: 'verifiedQty', label: 'VERIFIED QUANTITY RECEIVED', type: 'NUMBER', required: true },
            { id: 'remarks', label: 'PHYSICAL INSPECTION NOTES', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'SITE_RECEIVE') {
          defaultFields = [
            { id: 'checkStatus', label: 'PHYSICAL CHECK WITH CHALLAN/PO', type: 'SELECT', options: ['MATCHED & ACCEPTED', 'SHORTAGE OBSERVED', 'DAMAGE OBSERVED', 'REJECTED'], required: true },
            { id: 'receivedQty', label: 'PHYSICALLY RECEIVED QUANTITY', type: 'NUMBER', required: true },
            { id: 'remarks', label: 'SITE STORE INSPECTION REMARKS', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'PAYMENT_TO_DISPATCH') {
          defaultFields = [
            { id: 'verificationStatus', label: 'MATERIAL SPECIFICATION CHECK', type: 'SELECT', options: ['APPROVED & MATCHED WITH PO', 'QUALITY ISSUE OBSERVED', 'SPECIFICATION MISMATCH'], required: true },
            { id: 'testCertificateAttached', label: 'TEST CERTIFICATE / TC ATTACHED', type: 'SELECT', options: ['YES', 'NO', 'NOT APPLICABLE'], required: true },
            { id: 'remarks', label: 'QUALITY & VERIFICATION REMARKS', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'ACCOUNTS_INVOICE_COLLECTION') {
          defaultFields = [
            { id: 'arithmeticCheckStatus', label: 'ARITHMETIC & GST RATE CHECK', type: 'SELECT', options: ['VERIFIED CORRECT', 'RATE MISMATCH WITH PO', 'CALCULATION ERROR', 'HSN CODE ERROR'], required: true },
            { id: 'taxableAmount', label: 'VERIFIED TAXABLE VALUE (₹)', type: 'NUMBER', required: true },
            { id: 'gstAmount', label: 'VERIFIED GST TAX AMOUNT (₹)', type: 'NUMBER', required: true },
            { id: 'remarks', label: 'ACCOUNTS AUDIT REMARKS', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'HR_ATTENDANCE_PAYMENT') {
          defaultFields = [
            { id: 'photoSheetCheck', label: 'PHOTO & HEADCOUNT VERIFICATION', type: 'SELECT', options: ['VERIFIED & MATCHED', 'HEADCOUNT MISMATCH WITH SITE LOG', 'PHOTO PROOF MISSING'], required: true },
            { id: 'verifiedHeadcount', label: 'VERIFIED LABOUR HEADCOUNT', type: 'NUMBER', required: true },
            { id: 'remarks', label: 'HR AUDIT NOTES', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'BREAKDOWN_REPORTING') {
          defaultFields = [
            { id: 'serviceEngineerReq', label: 'IS OEM SERVICE ENGINEER REQUIRED?', type: 'SELECT', options: ['YES - SPECIALIZED OEM VISIT REQUIRED', 'NO - SITE MECHANIC CAN REPAIR'], required: true },
            { id: 'severity', label: 'BREAKDOWN SEVERITY LEVEL', type: 'SELECT', options: ['CRITICAL (PLANT STOPPED)', 'MAJOR (PARTIAL IMPACT)', 'MINOR (OPERATIONAL)'], required: true },
            { id: 'remarks', label: 'DIAGNOSTIC ASSESSMENT NOTES', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'EQUIPMENT_PART_REPAIR') {
          defaultFields = [
            { id: 'warrantyStatus', label: 'WARRANTY COVERAGE STATUS', type: 'SELECT', options: ['ACTIVE OEM WARRANTY', 'OUT OF WARRANTY', 'AMC COVERAGE ACTIVE'], required: true },
            { id: 'warrantyCardRef', label: 'WARRANTY CARD / INVOICE REF NO.', type: 'TEXT', required: false },
            { id: 'remarks', label: 'WARRANTY VERIFICATION NOTES', type: 'TEXTAREA', required: false },
          ];
        } else if (key === 'DPR_REPORTING') {
          defaultFields = [
            { id: 'planVsActualStatus', label: 'PLANNED VS ACTUAL PROGRESS STATUS', type: 'SELECT', options: ['ON TRACK (ACHIEVED TARGET)', 'SLIGHT DELAY (<10%)', 'SIGNIFICANT DELAY (>10%)', 'WORK STOPPED'], required: true },
            { id: 'varianceDetails', label: 'VARIANCE REASON / BOTTLENECK', type: 'TEXT', required: false },
            { id: 'remarks', label: 'PLANNING OFFICER REMARKS', type: 'TEXTAREA', required: false },
          ];
        }
      } else if (key === 'CHECK_STOCK') {
        // Streamlined 2-stage workflow: Stage 1 Receive Requisition -> Stage 2 Check Stock & Split (Auto-spawns Sub-Workflows)
        defaultFields = [];
      } else if (key === 'PO_TO_PAYMENT') {
        if (idx === 6) {
          defaultFields = [
            { id: 'sheetNo', label: 'Sheet No. / Voucher No.', type: 'TEXT', required: true },
            { id: 'entryTimestamp', label: 'Timestamp', type: 'TEXT', required: false },
            { id: 'vendorName', label: 'Vendor Name', type: 'TEXT', required: true },
            { id: 'purposeOfPayment', label: 'Purpose of Payment', type: 'TEXT', required: true },
            { id: 'requestedBy', label: 'Requested By', type: 'TEXT', required: true },
            { id: 'site', label: 'Site Location', type: 'SELECT', options: ['Raipur Office', 'Raipur Workshop', 'Siladehi Site', 'Bijetala Site'], required: true },
            { id: 'modeOfPayment', label: 'Mode Of Payment', type: 'SELECT', options: ['UPI', 'ACCOUNT', 'RTGS/NEFT', 'CHEQUE'], required: true },
            { id: 'amountToBePaid', label: 'Amount to Be Paid (₹)', type: 'NUMBER', required: true },
            { id: 'billNoOrPo', label: 'Bill No. / PO Reference', type: 'TEXT', required: true },
            { id: 'poUploadLink', label: 'Remark PO UPLOAD', type: 'URL' },
            { id: 'remark', label: 'Initiation Remarks', type: 'TEXTAREA' },
          ];
        } else if (idx === 7) {
          defaultFields = [
            { id: 'status', label: 'Approval Status', type: 'APPROVAL', options: ['APPROVED', 'REJECTED'], required: true },
            { id: 'statusTimestamp', label: 'Status Timestamp', type: 'TEXT', required: false },
            { id: 'approvedAmount', label: 'Approved Amount (₹)', type: 'NUMBER', required: true },
            { id: 'approvalRemarks', label: 'Approval Notes / Justification', type: 'TEXTAREA' },
          ];
        } else if (idx === 8) {
          defaultFields = [
            { id: 'bankEntryStatus', label: 'Bank Entry Status', type: 'SELECT', options: ['DONE', 'APPROVED', 'PENDING'], required: true },
            { id: 'bankEntryTimestamp', label: 'Bank Entry Timestamp', type: 'TEXT', required: false },
            { id: 'bankAccount', label: 'Bank Account Debited', type: 'SELECT', options: ['HDFC Main Ops A/c', 'SBI Site A/c', 'ICICI Disbursements'], required: true },
            { id: 'entryRemarks', label: 'Bank Entry Notes', type: 'TEXTAREA' },
          ];
        }
      }

      let defaultCheckpoints: string[] = [
        'Supporting documents verified & legible',
        'Stage executed as per standard operating protocol',
      ];

      if (key === 'PO_TO_PAYMENT') {
        if (idx === 6) {
          defaultCheckpoints = [
            'Bill / PO voucher attached & legible',
            'Vendor name & GST matched with invoice',
            'Bank payment details (IFSC / Account / UPI) verified',
            'Amount correctly computed against purchase order',
          ];
        } else if (idx === 7) {
          defaultCheckpoints = [
            'Budget availability confirmed for site/department',
            'Payment due date and credit period verified',
            'No duplicate payment voucher check verified clear',
          ];
        } else if (idx === 8) {
          defaultCheckpoints = [
            'Bank disbursement entry initiated in internet banking',
            'Beneficiary account confirmed active in bank master',
            'Sufficient operational ledger balance verified',
          ];
        } else if (idx === 9) {
          defaultCheckpoints = [
            'Bank payment successfully processed & debited',
            'UTR / transaction reference verified from bank receipt',
            'Debit voucher shared with accounts & vendor',
          ];
        }
      }

      let defaultSubWorkflowTrigger: FmsSubWorkflowTriggerConfig | undefined = undefined;
      if (key === 'INDENT_PURCHASE' && idx === 10) {
        defaultSubWorkflowTrigger = {
          enabled: true,
          targetTemplateKey: 'PO_TO_PAYMENT',
          triggerCondition: 'ON_COMPLETE',
          fieldMappings: [
            { sourceField: 'poNumber', targetField: 'poNumber' },
            { sourceField: 'vendorName', targetField: 'vendorName' },
            { sourceField: 'poAmount', targetField: 'poAmount' },
            { sourceField: 'paymentMode', targetField: 'paymentMode' },
            { sourceField: 'remarks', targetField: 'remarks' },
          ],
        };
      } else if (key === 'INDENT_PURCHASE' && idx === 2) {
        defaultSubWorkflowTrigger = {
          enabled: true,
          targetTemplateKey: 'CHECK_STOCK',
          triggerCondition: 'ON_COMPLETE',
          fieldMappings: [
            { sourceField: 'indentNo', targetField: 'indentNo' },
            { sourceField: 'siteName', targetField: 'siteName' },
          ],
        };
      }

      return {
        stageId: def.stageId || `STG-${idx + 1}`,
        stageName: def.name,
        whoRole: def.whoRole || 'Operator',
        whoDefaultAssignee: def.whoDefaultAssignee || USERS[0].name,
        howChannel: def.formUrl || def.howChannel || 'IN-APP FORM',
        slaHours: idx === 0 ? 0 : (def.slaHours ?? 1),
        fields: defaultFields,
        checkpoints: defaultCheckpoints,
        subWorkflowTrigger: defaultSubWorkflowTrigger,
      };
    });

    setStages(loadedStages);
  };

  if (!isOpen) return null;

  const handleAddStage = () => {
    const nextIdx = stages.length + 1;
    const newStage: FmsStageTemplate = {
      stageId: `STG-CUSTOM-${String(nextIdx).padStart(2, '0')}`,
      stageName: `Stage ${nextIdx} Process`,
      whoRole: 'Operator',
      whoDefaultAssignee: USERS[0]?.name || 'GARIMA PAL',
      slaHours: 1,
      fields: [
        { id: `actionStatus_${nextIdx}`, label: 'Action Status', type: 'STATUS_DONE', required: true },
        { id: `remarks_${nextIdx}`, label: 'Execution Notes', type: 'TEXTAREA', required: false },
      ],
      checkpoints: [
        'Verify required physical/digital documents attached',
        'Confirm approval criteria and handover to next stage',
      ],
    };
    setStages([...stages, newStage]);
  };

  const handleRemoveStage = (idx: number) => {
    if (stages.length <= 1) {
      setError('A workflow must have at least 1 stage.');
      return;
    }
    setStages(stages.filter((_, i) => i !== idx));
  };

  const handleMoveStageUp = (index: number) => {
    if (index <= 0) return;
    const updated = [...stages];
    const temp = updated[index];
    updated[index] = updated[index - 1];
    updated[index - 1] = temp;
    setStages(updated);
  };

  const handleMoveStageDown = (index: number) => {
    if (index >= stages.length - 1) return;
    const updated = [...stages];
    const temp = updated[index];
    updated[index] = updated[index + 1];
    updated[index + 1] = temp;
    setStages(updated);
  };

  const handleSwapStages = (fromIdx: number, toIdx: number) => {
    if (fromIdx === toIdx || fromIdx < 0 || toIdx < 0 || fromIdx >= stages.length || toIdx >= stages.length) return;
    const updated = [...stages];
    const temp = updated[fromIdx];
    updated[fromIdx] = updated[toIdx];
    updated[toIdx] = temp;
    setStages(updated);
  };

  const handleUpdateStage = (idx: number, patch: Partial<FmsStageTemplate>) => {
    const updated = [...stages];
    updated[idx] = { ...updated[idx], ...patch };
    setStages(updated);
  };

  const handleAddFieldToStage = (stageIdx: number) => {
    const stage = stages[stageIdx];
    const fieldCount = (stage.fields?.length || 0) + 1;
    const newField: FmsStageFieldConfig = {
      id: `field_${stageIdx + 1}_${fieldCount}`,
      label: `Field ${fieldCount}`,
      type: 'TEXT',
      required: false,
    };
    const updatedFields = [...(stage.fields || []), newField];
    handleUpdateStage(stageIdx, { fields: updatedFields });
  };

  const handleRemoveFieldFromStage = (stageIdx: number, fieldIdx: number) => {
    const stage = stages[stageIdx];
    const updatedFields = (stage.fields || []).filter((_, i) => i !== fieldIdx);
    handleUpdateStage(stageIdx, { fields: updatedFields });
  };

  const handleMoveFieldUp = (stageIdx: number, fieldIdx: number) => {
    if (fieldIdx <= 0) return;
    const stage = stages[stageIdx];
    const fields = [...(stage.fields || [])];
    const temp = fields[fieldIdx - 1];
    fields[fieldIdx - 1] = fields[fieldIdx];
    fields[fieldIdx] = temp;
    handleUpdateStage(stageIdx, { fields });
  };

  const handleMoveFieldDown = (stageIdx: number, fieldIdx: number) => {
    const stage = stages[stageIdx];
    const fields = [...(stage.fields || [])];
    if (fieldIdx >= fields.length - 1) return;
    const temp = fields[fieldIdx + 1];
    fields[fieldIdx + 1] = fields[fieldIdx];
    fields[fieldIdx] = temp;
    handleUpdateStage(stageIdx, { fields });
  };

  const handleUpdateField = (stageIdx: number, fieldIdx: number, patch: Partial<FmsStageFieldConfig>) => {
    const stage = stages[stageIdx];
    const updatedFields = [...(stage.fields || [])];
    updatedFields[fieldIdx] = { ...updatedFields[fieldIdx], ...patch };
    handleUpdateStage(stageIdx, { fields: updatedFields });
  };

  const handleAddCheckpointToStage = (stageIdx: number) => {
    const stage = stages[stageIdx];
    const updatedCheckpoints = [...(stage.checkpoints || []), ''];
    handleUpdateStage(stageIdx, { checkpoints: updatedCheckpoints });
  };

  const handleUpdateCheckpoint = (stageIdx: number, cpIdx: number, val: string) => {
    const stage = stages[stageIdx];
    const updatedCheckpoints = [...(stage.checkpoints || [])];
    updatedCheckpoints[cpIdx] = val;
    handleUpdateStage(stageIdx, { checkpoints: updatedCheckpoints });
  };

  const handleRemoveCheckpointFromStage = (stageIdx: number, cpIdx: number) => {
    const stage = stages[stageIdx];
    const updatedCheckpoints = (stage.checkpoints || []).filter((_, i) => i !== cpIdx);
    handleUpdateStage(stageIdx, { checkpoints: updatedCheckpoints });
  };

  const handleToggleSubWorkflowTrigger = (stageIdx: number, enabled: boolean) => {
    const stage = stages[stageIdx];
    const targetKey = stage.subWorkflowTrigger?.targetTemplateKey || 'PO_TO_PAYMENT';
    const targetInfo = getTargetStage1Info(targetKey);
    const autoMappings = targetInfo.fields.map((f) => ({
      sourceField: f.defaultSourceField || f.id,
      targetField: f.id,
    }));

    const existing = stage.subWorkflowTrigger || {
      enabled: false,
      targetTemplateKey: targetKey,
      triggerCondition: 'ON_COMPLETE',
      fieldMappings: autoMappings,
    };
    handleUpdateStage(stageIdx, {
      subWorkflowTrigger: {
        ...existing,
        enabled,
        fieldMappings: existing.fieldMappings && existing.fieldMappings.length > 0 ? existing.fieldMappings : autoMappings,
      },
    });
  };

  const handleUpdateSubWorkflowTrigger = (
    stageIdx: number,
    patch: Partial<FmsSubWorkflowTriggerConfig>
  ) => {
    const stage = stages[stageIdx];
    const currentTargetKey = patch.targetTemplateKey || stage.subWorkflowTrigger?.targetTemplateKey || 'PO_TO_PAYMENT';
    const targetInfo = getTargetStage1Info(currentTargetKey);

    const existing = stage.subWorkflowTrigger || {
      enabled: true,
      targetTemplateKey: currentTargetKey,
      triggerCondition: 'ON_COMPLETE',
      fieldMappings: [],
    };

    let updatedMappings = patch.fieldMappings !== undefined ? patch.fieldMappings : (existing.fieldMappings || []);

    // If target template key changed or mappings are empty, auto-populate Stage 1 connected fields!
    if (patch.targetTemplateKey && patch.targetTemplateKey !== existing.targetTemplateKey) {
      updatedMappings = targetInfo.fields.map((f) => ({
        sourceField: f.defaultSourceField || f.id,
        targetField: f.id,
      }));
    } else if (updatedMappings.length === 0) {
      updatedMappings = targetInfo.fields.map((f) => ({
        sourceField: f.defaultSourceField || f.id,
        targetField: f.id,
      }));
    }

    handleUpdateStage(stageIdx, {
      subWorkflowTrigger: {
        ...existing,
        ...patch,
        targetTemplateKey: currentTargetKey,
        fieldMappings: updatedMappings,
      },
    });
  };

  const handleAutoConnectStage1Fields = (stageIdx: number) => {
    const stage = stages[stageIdx];
    const targetKey = stage.subWorkflowTrigger?.targetTemplateKey || 'PO_TO_PAYMENT';
    const targetInfo = getTargetStage1Info(targetKey);
    const autoMappings = targetInfo.fields.map((f) => ({
      sourceField: f.defaultSourceField || f.id,
      targetField: f.id,
    }));
    handleUpdateSubWorkflowTrigger(stageIdx, { fieldMappings: autoMappings });
  };

  const handleAddFieldMapping = (stageIdx: number) => {
    const stage = stages[stageIdx];
    const existing = stage.subWorkflowTrigger || {
      enabled: true,
      targetTemplateKey: 'PO_TO_PAYMENT',
      triggerCondition: 'ON_COMPLETE',
      fieldMappings: [],
    };
    const currentMappings = existing.fieldMappings || [];
    handleUpdateSubWorkflowTrigger(stageIdx, {
      fieldMappings: [...currentMappings, { sourceField: '', targetField: '' }],
    });
  };

  const handleUpdateFieldMapping = (
    stageIdx: number,
    mIdx: number,
    sourceField: string,
    targetField: string
  ) => {
    const stage = stages[stageIdx];
    if (!stage.subWorkflowTrigger) return;
    const currentMappings = [...(stage.subWorkflowTrigger.fieldMappings || [])];
    currentMappings[mIdx] = { sourceField, targetField };
    handleUpdateSubWorkflowTrigger(stageIdx, { fieldMappings: currentMappings });
  };

  const handleRemoveFieldMapping = (stageIdx: number, mIdx: number) => {
    const stage = stages[stageIdx];
    if (!stage.subWorkflowTrigger) return;
    const currentMappings = (stage.subWorkflowTrigger.fieldMappings || []).filter((_, i) => i !== mIdx);
    handleUpdateSubWorkflowTrigger(stageIdx, { fieldMappings: currentMappings });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!templateName.trim()) {
      setError('Please provide a name for this FMS workflow.');
      return;
    }

    if (stages.length === 0) {
      setError('Please define at least one stage.');
      return;
    }

    for (let i = 0; i < stages.length; i++) {
      if (!stages[i].stageName.trim()) {
        setError(`Stage #${i + 1} name cannot be empty.`);
        return;
      }
    }

    const isUpdatingBuiltin = saveMode === 'UPDATE_EXISTING' && selectedExistingKey && !selectedExistingKey.startsWith('CUSTOM_');
    const existingTemplate = editingTemplateId ? customTemplates.find((t) => t.id === editingTemplateId) : null;
    const templateKey = isUpdatingBuiltin
      ? selectedExistingKey
      : existingTemplate && saveMode === 'UPDATE_EXISTING'
      ? existingTemplate.templateKey 
      : `CUSTOM_${templateName.trim().toUpperCase().replace(/[^A-Z0-9]/g, '_')}_${Date.now().toString().slice(-4)}`;

    const templateId = isUpdatingBuiltin
      ? `builtin_${selectedExistingKey}`
      : editingTemplateId && saveMode === 'UPDATE_EXISTING'
      ? editingTemplateId
      : `template-${Date.now()}`;

    const newTemplate: FmsTemplateDefinition = {
      id: templateId,
      templateKey,
      name: templateName.trim(),
      departmentHub,
      description: description.trim() || undefined,
      referenceLabel: referenceLabel.trim() || 'Reference Code',
      defaultPriority,
      stages,
      createdAt: existingTemplate ? existingTemplate.createdAt : new Date().toLocaleDateString('en-GB'),
      updatedAt: new Date().toLocaleDateString('en-GB'),
      isCustom: !isUpdatingBuiltin,
    };

    onSaveTemplate(newTemplate);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-4xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[96vh] sm:max-h-[92vh] animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-slate-200 flex items-center justify-between bg-gradient-to-r from-indigo-900 via-indigo-950 to-slate-900 text-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
              <Sparkles className="w-5 h-5 text-indigo-300" />
            </div>
            <div>
              <h3 className="font-bold text-sm sm:text-base md:text-lg leading-tight">
                In-App FMS Template &amp; Stage Form Builder
              </h3>
              <p className="text-[11px] text-indigo-200 mt-0.5 line-clamp-1 sm:line-clamp-none">
                Edit existing FMS workflows, design custom stages, and configure native stage forms without spreadsheets.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition-colors cursor-pointer shrink-0"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form id="template-studio-form" onSubmit={handleSubmit} className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-6 text-xs flex-1">
          
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2 font-medium">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {importSuccessMsg && (
            <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center justify-between gap-2 font-medium">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{importSuccessMsg}</span>
              </div>
              <button
                type="button"
                onClick={() => setImportSuccessMsg(null)}
                className="text-emerald-700 hover:text-emerald-950 font-bold p-1 cursor-pointer"
              >
                ✕
              </button>
            </div>
          )}

          {/* Excel / CSV Workflow Builder & Importer */}
          <div className="p-4 bg-gradient-to-r from-emerald-50/90 via-teal-50/80 to-slate-50 rounded-xl border border-emerald-200/90 shadow-2xs space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-600 text-white shrink-0 shadow-xs">
                  <FileSpreadsheet className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                      Excel / CSV Bulk Workflow Builder &amp; Importer
                    </h4>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                      Offline Ready
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-600 mt-0.5">
                    Enter stages, assignees, SLAs, gateways &amp; custom form fields offline in Excel, then import to auto-create the complete workflow!
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  onClick={() => downloadFmsExcelTemplate()}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-white border border-emerald-300 text-emerald-800 text-xs font-bold hover:bg-emerald-100/50 transition-colors shadow-2xs cursor-pointer"
                  title="Download blank Excel template with sample stages and form fields"
                >
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Download Excel File</span>
                </button>
                <label className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-emerald-600 text-white text-xs font-bold hover:bg-emerald-700 transition-colors shadow-2xs cursor-pointer">
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isImporting ? 'Reading Excel...' : 'Import Excel / CSV'}</span>
                  <input
                    type="file"
                    accept=".xlsx,.xls,.csv"
                    onChange={handleFileImport}
                    disabled={isImporting}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-500 pt-1 border-t border-emerald-200/60">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                <strong>Sheet 1:</strong> Workflow Master Details (Name, Dept, Priority, Reference No.)
              </span>
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-teal-500"></span>
                <strong>Sheet 2:</strong> Stages &amp; Form Fields (Stage Name, Assignee, SLA, Fields, Checkpoints)
              </span>
            </div>
          </div>

          {/* Quick Load Existing FMS Process */}
          <div className="p-4 bg-indigo-50/70 rounded-xl border border-indigo-200 space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-indigo-950 text-xs flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                Select Existing FMS Workflow to Edit &amp; Customize
              </span>
              <span className="text-[11px] text-indigo-600 font-medium">
                Loads all stages, assignees &amp; forms into the editor
              </span>
            </div>
            <select
              value={selectedExistingKey}
              onChange={(e) => handleLoadExisting(e.target.value)}
              className="w-full text-xs bg-white border border-indigo-300 rounded-lg p-2 font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer shadow-2xs"
            >
              <option value="">-- Choose Existing FMS Workflow to Load &amp; Edit --</option>
              <optgroup label="Standard Built-In FMS Processes (12 Existing)">
                <option value="CHECK_STOCK">Store Check Stock (2 stages)</option>
                <option value="INDENT_PURCHASE">Purchase Indent to PO (7 stages)</option>
                <option value="PO_TO_PAYMENT">Accounts PO to Payment (15 stages)</option>
                <option value="STORE_TO_SITE_DISPATCH">Store to Site Dispatch (9 stages)</option>
                <option value="PURCHASE_TO_STORE_DISPATCH">Purchase to Store Dispatch (10 stages)</option>
                <option value="PAYMENT_TO_DISPATCH">Vendor Payment to Dispatch (7 stages)</option>
                <option value="SITE_RECEIVE">Site Material Receive (MRN) (9 stages)</option>
                <option value="ACCOUNTS_INVOICE_COLLECTION">Accounts Invoice Collection (10 stages)</option>
                <option value="HR_ATTENDANCE_PAYMENT">Labour Attendance &amp; Payment (7 stages)</option>
                <option value="BREAKDOWN_REPORTING">Machine Breakdown (13 stages)</option>
                <option value="EQUIPMENT_PART_REPAIR">Equipment Part Repair (18 stages)</option>
                <option value="DPR_REPORTING">Daily Progress Report (DPR) (6 stages)</option>
              </optgroup>
              {customTemplates.length > 0 && (
                <optgroup label="Saved Custom Templates">
                  {customTemplates.map((tpl) => (
                    <option key={tpl.id} value={`CUSTOM_${tpl.id}`}>
                      {tpl.name} ({tpl.stages.length} stages)
                    </option>
                  ))}
                </optgroup>
              )}
            </select>

            {selectedExistingKey && (
              <div className="flex flex-wrap items-center gap-3 bg-white p-2.5 rounded-lg border border-indigo-200 text-xs">
                <span className="font-bold text-slate-700">Save Action:</span>
                <label className="flex items-center gap-1.5 cursor-pointer font-bold text-indigo-900">
                  <input
                    type="radio"
                    name="saveMode"
                    value="UPDATE_EXISTING"
                    checked={saveMode === 'UPDATE_EXISTING'}
                    onChange={() => setSaveMode('UPDATE_EXISTING')}
                    className="text-indigo-600 cursor-pointer"
                  />
                  <span>Update &amp; Customize This Workflow ({selectedExistingKey})</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer font-medium text-slate-600">
                  <input
                    type="radio"
                    name="saveMode"
                    value="SAVE_AS_NEW"
                    checked={saveMode === 'SAVE_AS_NEW'}
                    onChange={() => setSaveMode('SAVE_AS_NEW')}
                    className="text-indigo-600 cursor-pointer"
                  />
                  <span>Save as New Custom Template</span>
                </label>
              </div>
            )}
          </div>

          {/* Workflow Metadata */}
          <div className="p-4 bg-slate-50/70 rounded-xl border border-slate-200 space-y-3.5">
            <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
              1. Workflow Master Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Workflow Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Site Petty Cash Disbursement FMS"
                  value={templateName}
                  onChange={(e) => setTemplateName(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Department Hub</label>
                <select
                  value={departmentHub}
                  onChange={(e) => setDepartmentHub(e.target.value as any)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  {storageAdapter.getDepartments().filter((d) => !d.isArchived).map((dept) => (
                    <option key={dept.id} value={dept.key}>
                      {dept.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Tracking Counter Series Prefix (e.g. BPL/BEN/)
                </label>
                <input
                  type="text"
                  placeholder="e.g. BPL/BEN/ or BPL/PO/"
                  value={referenceLabel}
                  onChange={(e) => setReferenceLabel(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
                />
                <p className="text-[10px] text-slate-500">
                  Automated ID Format: <strong className="text-indigo-700 font-mono">{(referenceLabel || 'BPL/BEN/').trim().toUpperCase()}{new Date().getFullYear()}{String(new Date().getMonth() + 1).padStart(2, '0')}{String(new Date().getDate()).padStart(2, '0')}-001</strong>
                </p>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Default Priority</label>
                <select
                  value={defaultPriority}
                  onChange={(e) => setDefaultPriority(e.target.value as Priority)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                >
                  <option value="Normal">Normal</option>
                  <option value="Urgent">Urgent</option>
                  <option value="Low">Low</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-semibold text-slate-700">Workflow Description</label>
                <input
                  type="text"
                  placeholder="Optional context or process purpose"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full text-xs bg-white border border-slate-300 rounded-lg p-2 font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          </div>

          {/* Sequential Stages Builder */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-bold text-slate-900 text-xs uppercase tracking-wider block">
                  2. Sequential Stages &amp; Attached Forms ({stages.length} Stages)
                </span>
                <p className="text-[11px] text-slate-500">
                  Each stage activates only after the previous stage is submitted. Data carries forward automatically.
                </p>
              </div>
              <button
                type="button"
                onClick={handleAddStage}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Step</span>
              </button>
            </div>

            {/* Interactive Stage Order Switcher & Quick Navigator Bar */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                  <ArrowUpDown className="w-3.5 h-3.5 text-indigo-600" />
                  Stage Sequence Switcher &amp; Navigator
                </span>
                <span className="text-[10px] text-slate-500 font-medium">Click Up/Down arrows to swap stage sequence instantly</span>
              </div>

              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
                {stages.map((stg, sIdx) => (
                  <div
                    key={stg.stageId || sIdx}
                    className="flex items-center gap-1 bg-white border border-slate-200 px-2 py-1 rounded-lg shrink-0 shadow-2xs font-semibold text-slate-800"
                  >
                    <span className="w-4 h-4 rounded-full bg-indigo-600 text-white font-bold text-[10px] flex items-center justify-center shrink-0">
                      {sIdx + 1}
                    </span>
                    <button
                      type="button"
                      onClick={() => {
                        const el = document.getElementById(`stage_card_${sIdx}`);
                        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                      }}
                      className="hover:text-indigo-600 font-bold truncate max-w-[120px] cursor-pointer"
                      title={`Jump to Stage #${sIdx + 1}: ${stg.stageName}`}
                    >
                      {stg.stageName || `Stage #${sIdx + 1}`}
                    </button>

                    {sIdx > 0 && (
                      <button
                        type="button"
                        onClick={() => handleMoveStageUp(sIdx)}
                        className="text-slate-400 hover:text-indigo-600 p-0.5 rounded hover:bg-slate-100 cursor-pointer ml-0.5"
                        title={`Move Stage #${sIdx + 1} UP to Position #${sIdx}`}
                      >
                        <ArrowUp className="w-3 h-3" />
                      </button>
                    )}

                    {sIdx < stages.length - 1 && (
                      <button
                        type="button"
                        onClick={() => handleMoveStageDown(sIdx)}
                        className="text-slate-400 hover:text-indigo-600 p-0.5 rounded hover:bg-slate-100 cursor-pointer"
                        title={`Move Stage #${sIdx + 1} DOWN to Position #${sIdx + 2}`}
                      >
                        <ArrowDown className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="space-y-4">
              {stages.map((stg, sIdx) => (
                <div id={`stage_card_${sIdx}`} key={stg.stageId || sIdx} className="p-4 bg-white rounded-xl border border-slate-200 shadow-2xs space-y-3">
                  {/* Stage Top Bar */}
                  <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                    <div className="flex items-center gap-2">
                      <span className="w-6 h-6 rounded-full bg-indigo-600 text-white font-bold text-xs flex items-center justify-center">
                        {sIdx + 1}
                      </span>
                      <span className="font-bold text-slate-800 text-xs">Stage #{sIdx + 1} Configuration</span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Position Swap Dropdown */}
                      <div className="flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg px-2 py-0.5 text-xs">
                        <span className="text-[10px] font-bold text-slate-500 uppercase">Position:</span>
                        <select
                          value={sIdx}
                          onChange={(e) => handleSwapStages(sIdx, Number(e.target.value))}
                          className="bg-transparent font-bold text-indigo-900 focus:outline-none cursor-pointer"
                          title="Move/Swap stage to another position number"
                        >
                          {stages.map((_, posIdx) => (
                            <option key={posIdx} value={posIdx}>
                              #{posIdx + 1} {posIdx === sIdx ? '(Current)' : ''}
                            </option>
                          ))}
                        </select>
                      </div>

                      {/* Move Up */}
                      <button
                        type="button"
                        disabled={sIdx === 0}
                        onClick={() => handleMoveStageUp(sIdx)}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer transition-colors"
                        title="Move Stage UP"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>

                      {/* Move Down */}
                      <button
                        type="button"
                        disabled={sIdx === stages.length - 1}
                        onClick={() => handleMoveStageDown(sIdx)}
                        className="p-1 text-slate-500 hover:text-indigo-600 hover:bg-slate-100 rounded disabled:opacity-30 cursor-pointer transition-colors"
                        title="Move Stage DOWN"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>

                      {stages.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveStage(sIdx)}
                          className="text-rose-500 hover:text-rose-700 p-1 rounded transition-colors cursor-pointer ml-1"
                          title="Delete this stage"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Stage Basic Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-1 space-y-1">
                      <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                        WHAT <span className="text-slate-500 font-medium font-sans text-[10px]">(Stage Task Name)</span>
                      </label>
                      <input
                        type="text"
                        value={stg.stageName}
                        onChange={(e) => handleUpdateStage(sIdx, { stageName: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        placeholder="e.g. Accounts Verification"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                        WHO <span className="text-slate-500 font-medium font-sans text-[10px]">(Doer / Assignee)</span>
                      </label>
                      <select
                        value={stg.whoDefaultAssignee}
                        onChange={(e) => handleUpdateStage(sIdx, { whoDefaultAssignee: e.target.value })}
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                      >
                        {USERS.map((u) => (
                          <option key={u.userId} value={u.name}>
                            {u.name} ({u.role})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                        HOW <span className="text-slate-500 font-medium font-sans text-[10px]">(Channel / Form URL)</span>
                      </label>
                      <input
                        type="text"
                        value={stg.howChannel || ''}
                        onChange={(e) => handleUpdateStage(sIdx, { howChannel: e.target.value })}
                        placeholder="IN-APP FORM or https://docs.google.com/forms/..."
                        className="w-full text-xs bg-slate-50 border border-slate-300 rounded-lg p-1.5 font-mono text-slate-800 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="block text-[11px] font-bold text-indigo-900 uppercase tracking-wider">
                        WHEN <span className="text-slate-500 font-medium font-sans text-[10px]">(Target SLA Time)</span>
                      </label>
                      <WhenSlaSelector
                        value={stg.slaHours}
                        onChange={(val) => handleUpdateStage(sIdx, { slaHours: val })}
                      />
                    </div>
                  </div>

                  {/* Sequential vs Conditional Progression Command */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                        Stage Progression Command
                      </span>
                      <div className="flex items-center gap-1.5 text-xs">
                        <button
                          type="button"
                          onClick={() => handleUpdateStage(sIdx, {
                            logic: {
                              gatewayType: 'STANDARD_ADVANCE',
                              slaHours: stg.slaHours,
                            }
                          })}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                            (!stg.logic || stg.logic.gatewayType === 'STANDARD_ADVANCE')
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Sequential (+1 Step)
                        </button>
                        <button
                          type="button"
                          onClick={() => handleUpdateStage(sIdx, {
                            logic: {
                              gatewayType: 'CONDITIONAL_JUMP',
                              slaHours: stg.slaHours,
                              yesTargetStageIndex: sIdx + 1 < stages.length ? sIdx + 1 : sIdx,
                              noTargetStageIndex: sIdx + 2 < stages.length ? sIdx + 2 : stages.length,
                            }
                          })}
                          className={`px-2.5 py-1 rounded text-[11px] font-bold cursor-pointer transition-all ${
                            stg.logic?.gatewayType === 'CONDITIONAL_JUMP'
                              ? 'bg-indigo-600 text-white shadow-2xs'
                              : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Conditional Command (Branch / Skip)
                        </button>
                      </div>
                    </div>

                    {stg.logic?.gatewayType === 'CONDITIONAL_JUMP' && (
                      <div className="space-y-2.5 p-2.5 bg-indigo-50/60 rounded-lg border border-indigo-200 text-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-emerald-800 flex items-center gap-1">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              If Decision / Condition is TRUE ('YES') → Route To
                            </label>
                            <select
                              value={stg.logic.yesTargetStageIndex ?? (sIdx + 1)}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                handleUpdateStage(sIdx, {
                                  logic: {
                                    ...stg.logic!,
                                    yesTargetStageIndex: val,
                                  }
                                });
                              }}
                              className="w-full text-xs bg-white border border-emerald-300 rounded p-1.5 font-semibold text-slate-800 cursor-pointer"
                            >
                              {stages.map((targetStg, tIdx) => (
                                <option key={tIdx} value={tIdx}>
                                  {tIdx === sIdx + 1 ? `Proceed to Next: Stage #${tIdx + 1} (${targetStg.stageName})` : `Jump to: Stage #${tIdx + 1} (${targetStg.stageName})`}
                                </option>
                              ))}
                              <option value={stages.length}>Complete &amp; Finalize Workflow</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-rose-800 flex items-center gap-1">
                              <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                              If Decision / Condition is FALSE ('NO') → Route To
                            </label>
                            <select
                              value={stg.logic.noTargetStageIndex ?? stages.length}
                              onChange={(e) => {
                                const val = Number(e.target.value);
                                handleUpdateStage(sIdx, {
                                  logic: {
                                    ...stg.logic!,
                                    noTargetStageIndex: val,
                                  }
                                });
                              }}
                              className="w-full text-xs bg-white border border-rose-300 rounded p-1.5 font-semibold text-slate-800 cursor-pointer"
                            >
                              {stages.map((targetStg, tIdx) => (
                                <option key={tIdx} value={tIdx}>
                                  {tIdx === sIdx + 1 ? `Proceed to Next: Stage #${tIdx + 1} (${targetStg.stageName})` : `Skip Ahead to: Stage #${tIdx + 1} (${targetStg.stageName})`}
                                </option>
                              ))}
                              <option value={stages.length}>Terminate / Reject Workflow</option>
                            </select>
                          </div>
                        </div>

                        {/* Conditional Branch Condition Rules */}
                        <div className="pt-2 border-t border-indigo-200/80 space-y-2">
                          <span className="text-[11px] font-bold text-indigo-900 block uppercase tracking-wider flex items-center gap-1">
                            <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                            Conditional Command Configurator (Field-Based Rule)
                          </span>
                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">If Form Field:</label>
                              <select
                                value={stg.logic.conditionFieldId || ''}
                                onChange={(e) => handleUpdateStage(sIdx, {
                                  logic: { ...stg.logic!, conditionFieldId: e.target.value }
                                })}
                                className="w-full text-xs bg-white border border-slate-300 rounded p-1 font-semibold text-slate-800 cursor-pointer"
                              >
                                <option value="">Default Approval / Decision Field</option>
                                {(stg.fields || []).map((f) => (
                                  <option key={f.id} value={f.id || f.label}>
                                    {f.label} ({f.type})
                                  </option>
                                ))}
                                <option value="is_eway_required">Is E-Way Bill Required?</option>
                                <option value="disposition">Disposition (Store vs Purchase)</option>
                                <option value="payment_approved">Is Payment Approved?</option>
                              </select>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Condition Value:</label>
                              <div className="flex gap-1">
                                <select
                                  value={stg.logic.conditionOperator || 'EQUALS'}
                                  onChange={(e) => handleUpdateStage(sIdx, {
                                    logic: { ...stg.logic!, conditionOperator: e.target.value as any }
                                  })}
                                  className="w-16 text-xs bg-white border border-slate-300 rounded p-1 font-bold text-slate-800 shrink-0"
                                >
                                  <option value="EQUALS">==</option>
                                  <option value="NOT_EQUALS">!=</option>
                                  <option value="CONTAINS">In</option>
                                </select>
                                <input
                                  type="text"
                                  value={stg.logic.conditionValue || ''}
                                  onChange={(e) => handleUpdateStage(sIdx, {
                                    logic: { ...stg.logic!, conditionValue: e.target.value }
                                  })}
                                  placeholder="e.g. Yes / Purchase"
                                  className="flex-1 text-xs bg-white border border-slate-300 rounded p-1 font-medium text-slate-800"
                                />
                              </div>
                            </div>

                            <div>
                              <label className="block text-[10px] font-bold text-slate-700 mb-0.5">Branch Action:</label>
                              <div className="text-[11px] font-bold text-indigo-700 bg-white border border-indigo-200 px-2 py-1 rounded flex items-center justify-between">
                                <span>If Equals → Stage #{ (stg.logic.yesTargetStageIndex ?? sIdx + 1) + 1 }</span>
                                <span>Else → Stage #{ (stg.logic.noTargetStageIndex ?? stages.length) + 1 }</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Attached Form Fields for this Stage */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1">
                        <FileText className="w-3.5 h-3.5 text-indigo-600" />
                        Form Fields for Stage #{sIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddFieldToStage(sIdx)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Input Field
                      </button>
                    </div>

                    <div className="space-y-2 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {stg.fields && stg.fields.length > 0 ? (
                        stg.fields.map((fld, fIdx) => (
                          <div key={fld.id || fIdx} className="bg-white p-2.5 rounded-lg border border-slate-200 space-y-2">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-mono font-bold text-[10px] border border-indigo-200 shrink-0" title={`Serial Position #${fIdx + 1}`}>
                                #{fIdx + 1}
                              </span>

                              <input
                                type="text"
                                value={fld.label}
                                onChange={(e) => handleUpdateField(sIdx, fIdx, { label: e.target.value })}
                                placeholder="Field Label (e.g. Site Name, Quotation Amount)"
                                className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 font-semibold text-slate-900 flex-1 min-w-[140px] focus:bg-white"
                              />

                              <select
                                value={fld.type}
                                onChange={(e) => {
                                  const newType = e.target.value as any;
                                  const patch: Partial<FmsStageFieldConfig> = { type: newType };
                                  if (newType === 'SELECT' && (!fld.options || fld.options.length === 0)) {
                                    patch.options = ['Option 1', 'Option 2'];
                                  }
                                  handleUpdateField(sIdx, fIdx, patch);
                                }}
                                className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 font-medium text-slate-800 cursor-pointer"
                              >
                                 <option value="TEXT">Short Text</option>
                                 <option value="NUMBER">Amount / Number (₹)</option>
                                 <option value="SELECT">Dropdown Selection</option>
                                 <option value="MULTI_ITEM_TABLE">Multi-Item Grid Table (Itemized Entries)</option>
                                 <option value="DATE">Date Picker</option>
                                 <option value="APPROVAL">Approval [APPROVED/REJECTED]</option>
                                 <option value="STATUS_DONE">Check [DONE]</option>
                                 <option value="FILE">Attachment (File Upload)</option>
                                 <option value="URL">Web Link / URL</option>
                                 <option value="TEXTAREA">Long Remarks</option>
                               </select>

                               <label className="flex items-center gap-1 text-[11px] text-slate-600 cursor-pointer shrink-0">
                                 <input
                                   type="checkbox"
                                   checked={!!fld.required}
                                   onChange={(e) => handleUpdateField(sIdx, fIdx, { required: e.target.checked })}
                                   className="rounded text-indigo-600 cursor-pointer"
                                 />
                                 <span>Required</span>
                               </label>

                               <div className="flex items-center gap-0.5 shrink-0 ml-auto">
                                 <button
                                   type="button"
                                   disabled={fIdx === 0}
                                   onClick={() => handleMoveFieldUp(sIdx, fIdx)}
                                   className={`p-1 rounded transition-colors ${fIdx === 0 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer'}`}
                                   title={`Move field UP to serial #${fIdx}`}
                                 >
                                   <ArrowUp className="w-3.5 h-3.5" />
                                 </button>
                                 <button
                                   type="button"
                                   disabled={fIdx === (stg.fields?.length || 0) - 1}
                                   onClick={() => handleMoveFieldDown(sIdx, fIdx)}
                                   className={`p-1 rounded transition-colors ${fIdx === (stg.fields?.length || 0) - 1 ? 'text-slate-200 cursor-not-allowed' : 'text-slate-400 hover:text-indigo-600 hover:bg-slate-100 cursor-pointer'}`}
                                   title={`Move field DOWN to serial #${fIdx + 2}`}
                                 >
                                   <ArrowDown className="w-3.5 h-3.5" />
                                 </button>
                                 <button
                                   type="button"
                                   onClick={() => handleRemoveFieldFromStage(sIdx, fIdx)}
                                   className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 cursor-pointer shrink-0 transition-colors"
                                   title="Delete field"
                                 >
                                   <X className="w-3.5 h-3.5" />
                                 </button>
                               </div>
                             </div>

                             {/* Field Data Inheritance Config */}
                             <div className="flex flex-wrap items-center gap-3 pt-1 border-t border-slate-100">
                               <label className="flex items-center gap-1.5 text-[11px] font-bold text-slate-700 cursor-pointer">
                                 <input
                                   type="checkbox"
                                   checked={!!fld.isInherited}
                                   onChange={(e) => handleUpdateField(sIdx, fIdx, {
                                     isInherited: e.target.checked,
                                     isReadOnly: e.target.checked ? true : fld.isReadOnly,
                                     inheritedSourceField: e.target.checked ? (fld.inheritedSourceField || 'Item List from Stage 1') : undefined
                                   })}
                                   className="rounded text-indigo-600 cursor-pointer w-3.5 h-3.5"
                                 />
                                 <span>Read-Only / Inherited from Parent Payload</span>
                               </label>

                               {fld.isInherited && (
                                 <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
                                   <span className="text-[10px] font-bold text-slate-500 shrink-0">Data Source:</span>
                                   <select
                                     value={fld.inheritedSourceField || 'Item List from Stage 1'}
                                     onChange={(e) => handleUpdateField(sIdx, fIdx, { inheritedSourceField: e.target.value })}
                                     className="text-[11px] bg-indigo-50/80 border border-indigo-300 rounded px-2 py-0.5 font-bold text-indigo-900 flex-1 cursor-pointer"
                                   >
                                     <option value="Item List from Stage 1">Item List from Stage 1 (Central Indent)</option>
                                     <option value="Parent Indent Reference">Parent Indent / Requisition Number</option>
                                     <option value="Site Name & Location">Site Name & Project Location</option>
                                     <option value="Vendor Quotation Ledger">Vendor Quotation & CS Sheet Summary</option>
                                     <option value="Total Indent Value">Total Indent Estimated Value (₹)</option>
                                   </select>
                                 </div>
                               )}
                             </div>

                             {/* Dropdown Options Customizer */}
                             {fld.type === 'SELECT' && (
                               <SelectOptionsEditor
                                 key={`${fld.id || fIdx}_${sIdx}`}
                                 options={fld.options}
                                 onChange={(opts) => handleUpdateField(sIdx, fIdx, { options: opts })}
                               />
                             )}

                             {/* Multi-Item Table Columns & Row Routing Customizer */}
                             {fld.type === 'MULTI_ITEM_TABLE' && (
                               <div className="space-y-2 pt-1 border-t border-slate-100">
                                 <div className="space-y-1">
                                   <span className="text-[10px] text-slate-500 font-bold block">
                                     Table Column Names (Comma Separated):
                                   </span>
                                   <input
                                     type="text"
                                     value={fld.defaultValue !== undefined ? fld.defaultValue : (fld.columns && fld.columns.length > 0 ? fld.columns.map(c => c.label).join(', ') : 'Item Description, Quantity, Unit, Work / Purpose Details, Disposition, Remarks')}
                                     onChange={(e) => {
                                       const rawVal = e.target.value;
                                       const colLabels = rawVal.split(',').map(s => s.trim()).filter(Boolean);
                                       const cols = colLabels.map(label => ({
                                         key: label.toLowerCase().replace(/[^a-z0-9]/g, '_'),
                                         label,
                                         type: (label.toLowerCase().includes('rate') || label.toLowerCase().includes('qty') || label.toLowerCase().includes('quantity') || label.toLowerCase().includes('amount') || label.toLowerCase().includes('price') || label.toLowerCase().includes('nos')) ? ('NUMBER' as const) : ('TEXT' as const)
                                       }));
                                       handleUpdateField(sIdx, fIdx, {
                                         defaultValue: rawVal,
                                         columns: cols
                                       });
                                     }}
                                     placeholder="e.g. Item Description, Quantity, Unit, Work / Purpose Details, Disposition, Remarks"
                                     className="w-full text-xs bg-slate-50 border border-slate-300 rounded px-2.5 py-1 text-slate-800 focus:bg-white focus:ring-1 focus:ring-indigo-500 font-medium"
                                   />
                                 </div>

                                 {/* Row-Level Logic & Triage Routing Config */}
                                 <div className="p-2 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-lg border border-emerald-200 text-xs space-y-1.5">
                                   <div className="flex items-center justify-between">
                                     <span className="font-bold text-emerald-950 text-[11px] flex items-center gap-1">
                                       <GitBranch className="w-3.5 h-3.5 text-emerald-600" />
                                       Row-Level Logic &amp; Item Triage Routing Strategy
                                     </span>
                                     <span className="text-[10px] font-bold text-emerald-700 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                                       Store vs Purchase Triage Active
                                     </span>
                                   </div>
                                   <p className="text-[10px] text-emerald-800 font-medium leading-tight">
                                     Automatically inspects the 'Disposition' column in each row of this table during Stage completion and splits items into parallel tracks.
                                   </p>
                                   <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
                                     <div className="bg-white p-1.5 rounded border border-emerald-200">
                                       <span className="font-bold text-indigo-700 block">Store Dispatch Rows:</span>
                                       <span className="text-[10px] text-slate-600">Route to Store Manager (Amanat)</span>
                                     </div>
                                     <div className="bg-white p-1.5 rounded border border-emerald-200">
                                       <span className="font-bold text-amber-700 block">Purchase Indent Rows:</span>
                                       <span className="text-[10px] text-slate-600">Route to Purchase Head (Brahmanand)</span>
                                     </div>
                                     <div className="bg-white p-1.5 rounded border border-emerald-200">
                                       <span className="font-bold text-rose-700 block">Hold / Archive Rows:</span>
                                       <span className="text-[10px] text-slate-600">Schedule 7-Day Store Review Task</span>
                                     </div>
                                   </div>
                                 </div>
                               </div>
                             )}

                             {/* Placeholder hint for Text, Number, Textarea, URL */}
                             {(fld.type === 'TEXT' || fld.type === 'NUMBER' || fld.type === 'TEXTAREA' || fld.type === 'URL') && (
                              <div className="flex items-center gap-2 pt-0.5">
                                <span className="text-[10px] text-slate-500 font-medium shrink-0">Placeholder:</span>
                                <input
                                  type="text"
                                  value={fld.placeholder || ''}
                                  onChange={(e) => handleUpdateField(sIdx, fIdx, { placeholder: e.target.value })}
                                  placeholder={`Hint text (e.g. Enter ${fld.label})...`}
                                  className="w-full text-[11px] bg-slate-50 border border-slate-200 rounded px-2 py-0.5 text-slate-700 focus:bg-white focus:outline-none"
                                />
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <div className="space-y-2">
                          {sIdx > 0 && (
                            <div className="p-2.5 bg-gradient-to-r from-indigo-50/90 via-purple-50/80 to-blue-50/90 rounded-lg border border-indigo-200 text-xs flex items-center justify-between shadow-2xs">
                              <div className="flex items-center gap-2">
                                <Layers className="w-4 h-4 text-indigo-600 shrink-0" />
                                <div>
                                  <span className="font-bold text-indigo-950 block text-[11px] flex items-center gap-1.5">
                                    <span>Reusable Payload Data Inheritance Active</span>
                                    <span className="text-[9px] font-bold text-emerald-800 bg-emerald-100 px-1.5 py-0.2 rounded border border-emerald-300">
                                      Stage 1 Requisition Items Linked
                                    </span>
                                  </span>
                                  <span className="text-[10px] text-indigo-900 font-medium leading-snug block">
                                    This stage automatically inherits the Itemized Grid Table &amp; Requisition Payload from Stage 1 (Receive Material Requisition). Doers can verify, triage, or approve the inherited item table directly without re-entering data.
                                  </span>
                                </div>
                              </div>
                            </div>
                          )}
                          <p className="text-[11px] text-slate-500 italic">No custom field overrides configured for this stage yet. Inherited items from Stage 1 are active for validation.</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Verification Checkpoints / Checklist for this Stage */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-slate-700 text-[11px] uppercase tracking-wider flex items-center gap-1.5">
                        <CheckSquare className="w-3.5 h-3.5 text-indigo-600" />
                        Verification Checkpoints &amp; Checklist ({stg.checkpoints?.length || 0})
                      </span>
                      <button
                        type="button"
                        onClick={() => handleAddCheckpointToStage(sIdx)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                      >
                        <Plus className="w-3 h-3" /> Add Checkpoint Item
                      </button>
                    </div>

                    <div className="space-y-1.5 bg-slate-50 p-2.5 rounded-lg border border-slate-200">
                      {stg.checkpoints && stg.checkpoints.length > 0 ? (
                        stg.checkpoints.map((cp, cpIdx) => (
                          <div key={cpIdx} className="flex items-center gap-2 bg-white p-1.5 rounded border border-slate-200">
                            <span className="text-[11px] font-bold text-slate-400 w-4 text-center">{cpIdx + 1}.</span>
                            <input
                              type="text"
                              value={cp}
                              onChange={(e) => handleUpdateCheckpoint(sIdx, cpIdx, e.target.value)}
                              placeholder="e.g. Verify tax invoice copy matches vendor ledger"
                              className="text-xs bg-slate-50 border border-slate-300 rounded px-2 py-1 font-medium text-slate-800 flex-1 focus:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleRemoveCheckpointFromStage(sIdx, cpIdx)}
                              className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer"
                              title="Remove checkpoint"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))
                      ) : (
                        <p className="text-[11px] text-slate-400 italic">No checklist checkpoints configured. Add checkpoints to remind doers of critical quality/compliance steps.</p>
                      )}
                    </div>
                  </div>

                  {/* Auto-Trigger Linked Sub-Workflow Editor */}
                  <div className="pt-2 border-t border-slate-100 space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-1.5 font-bold text-slate-700 text-[11px] uppercase tracking-wider cursor-pointer">
                        <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                        <span>Auto-Trigger Linked Sub-Workflow on Completion</span>
                      </label>
                      <label className="flex items-center gap-1.5 cursor-pointer text-xs font-bold text-indigo-700">
                        <input
                          type="checkbox"
                          checked={!!stg.subWorkflowTrigger?.enabled}
                          onChange={(e) => handleToggleSubWorkflowTrigger(sIdx, e.target.checked)}
                          className="rounded text-indigo-600 cursor-pointer w-4 h-4"
                        />
                        <span>{stg.subWorkflowTrigger?.enabled ? 'Automation Enabled' : 'Disabled'}</span>
                      </label>
                    </div>

                    {stg.subWorkflowTrigger?.enabled && (
                      <div className="p-3 bg-gradient-to-r from-indigo-50/90 via-purple-50/90 to-indigo-50/90 rounded-xl border border-indigo-200 space-y-3 shadow-xs">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-indigo-950 flex items-center justify-between">
                              <span>Target Sub-Workflow Process</span>
                              <span className="text-[10px] text-emerald-800 font-bold bg-emerald-100/90 px-1.5 py-0.2 rounded border border-emerald-300">
                                Stage 1 Auto-Connected
                              </span>
                            </label>
                            <select
                              value={stg.subWorkflowTrigger.targetTemplateKey || 'PO_TO_PAYMENT'}
                              onChange={(e) => handleUpdateSubWorkflowTrigger(sIdx, { targetTemplateKey: e.target.value })}
                              className="w-full text-xs bg-white border border-indigo-300 rounded-lg p-1.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs"
                            >
                              <option value="PO_TO_PAYMENT">Accounts PO to Payment (PO_TO_PAYMENT)</option>
                              <option value="CHECK_STOCK">Store Check Stock (CHECK_STOCK)</option>
                              <option value="INDENT_PURCHASE">Purchase Indent to PO (INDENT_PURCHASE)</option>
                              <option value="STORE_TO_SITE_DISPATCH">Store to Site Dispatch (STORE_TO_SITE_DISPATCH)</option>
                              <option value="PURCHASE_TO_STORE_DISPATCH">Purchase to Store Dispatch (PURCHASE_TO_STORE_DISPATCH)</option>
                              <option value="PAYMENT_TO_DISPATCH">Vendor Payment to Dispatch (PAYMENT_TO_DISPATCH)</option>
                              <option value="SITE_RECEIVE">Site Material Receive MRN (SITE_RECEIVE)</option>
                              <option value="ACCOUNTS_INVOICE_COLLECTION">Accounts Invoice Collection (ACCOUNTS_INVOICE_COLLECTION)</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-indigo-950">
                              Execution Trigger Condition
                            </label>
                            <select
                              value={stg.subWorkflowTrigger.triggerCondition || 'ON_COMPLETE'}
                              onChange={(e) => handleUpdateSubWorkflowTrigger(sIdx, { triggerCondition: e.target.value as any })}
                              className="w-full text-xs bg-white border border-indigo-300 rounded-lg p-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs"
                            >
                              <option value="ON_COMPLETE">Trigger whenever Stage #{sIdx + 1} completes</option>
                              <option value="ON_DECISION_YES">Trigger ONLY when Decision / Approval = YES</option>
                              <option value="ON_DECISION_NO">Trigger ONLY when Decision / Approval = NO</option>
                            </select>
                          </div>
                        </div>

                        {/* Dynamic Assignee Routing Configuration */}
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-indigo-200/80">
                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-indigo-950 flex items-center justify-between">
                              <span>Dynamic Assignee Routing Rule</span>
                              <span className="text-[10px] text-indigo-700 font-bold bg-indigo-100/90 px-1.5 py-0.2 rounded">
                                Role-Based Routing
                              </span>
                            </label>
                            <select
                              value={stg.subWorkflowTrigger.targetAssigneeRule || 'DYNAMIC_ROLE'}
                              onChange={(e) => handleUpdateSubWorkflowTrigger(sIdx, { targetAssigneeRule: e.target.value as any })}
                              className="w-full text-xs bg-white border border-indigo-300 rounded-lg p-1.5 font-bold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs"
                            >
                              <option value="DYNAMIC_ROLE">Role-Based Queue (e.g. Purchase Head / Store Incharge)</option>
                              <option value="SPECIFIC_USER">Specific Individual User</option>
                              <option value="INHERIT_PARENT">Inherit Current Stage Assignee ({stg.whoDefaultAssignee || 'Parent Assignee'})</option>
                            </select>
                          </div>

                          <div className="space-y-1">
                            <label className="block text-[11px] font-bold text-indigo-950">
                              Target Role / Assigned Queue
                            </label>
                            {stg.subWorkflowTrigger.targetAssigneeRule === 'SPECIFIC_USER' ? (
                              <select
                                value={stg.subWorkflowTrigger.targetAssignee || 'Brahmanand Patel'}
                                onChange={(e) => handleUpdateSubWorkflowTrigger(sIdx, { targetAssignee: e.target.value })}
                                className="w-full text-xs bg-white border border-indigo-300 rounded-lg p-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs"
                              >
                                <option value="Brahmanand Patel">Brahmanand Patel (Asst. Manager Purchase & Store)</option>
                                <option value="Amanat Bharadwaj">Amanat Bharadwaj (Store Manager)</option>
                                <option value="Manish Koshle">Manish Koshle (Finance & Accounts)</option>
                                <option value="Shyam Rao Sureshe">Shyam Rao Sureshe (Purchase Executive)</option>
                                <option value="Pranjal Agrawal">Pranjal Agrawal (Director)</option>
                              </select>
                            ) : stg.subWorkflowTrigger.targetAssigneeRule === 'INHERIT_PARENT' ? (
                              <input
                                type="text"
                                disabled
                                value={stg.whoDefaultAssignee || 'Inherited from current stage'}
                                className="w-full text-xs bg-slate-100 border border-slate-300 rounded-lg p-1.5 font-semibold text-slate-600 cursor-not-allowed"
                              />
                            ) : (
                              <select
                                value={stg.subWorkflowTrigger.targetRole || (stg.subWorkflowTrigger.targetTemplateKey === 'INDENT_PURCHASE' ? 'PURCHASE_MANAGER' : stg.subWorkflowTrigger.targetTemplateKey === 'STORE_TO_SITE_DISPATCH' ? 'STORE_MANAGER' : 'PURCHASE_MANAGER')}
                                onChange={(e) => handleUpdateSubWorkflowTrigger(sIdx, { targetRole: e.target.value })}
                                className="w-full text-xs bg-white border border-indigo-300 rounded-lg p-1.5 font-semibold text-slate-800 focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer shadow-xs"
                              >
                                <option value="PURCHASE_MANAGER">Role: PURCHASE_HEAD / PURCHASE_MANAGER (Brahmanand Patel)</option>
                                <option value="STORE_MANAGER">Role: STORE_MANAGER / DISPATCH (Amanat Bharadwaj)</option>
                                <option value="FINANCE_ACCOUNTS">Role: FINANCE_ACCOUNTS (Manish Koshle)</option>
                                <option value="PROJECT_MANAGER">Role: PROJECT_MANAGER (Pranay Ghosh / Chakravarti Ji)</option>
                              </select>
                            )}
                          </div>
                        </div>

                        {/* Multi-Track Output Mapping Guide for Check Stock & Split */}
                        {(stg.subWorkflowTrigger.targetTemplateKey === 'CHECK_STOCK' || stg.stageName.toLowerCase().includes('stock') || sIdx === 1) && (
                          <div className="bg-indigo-900/5 border border-indigo-200/80 rounded-lg p-2.5 text-[11px] space-y-1.5">
                            <span className="font-bold text-indigo-950 flex items-center gap-1.5">
                              <Boxes className="w-3.5 h-3.5 text-indigo-600" />
                              <span>Multi-Output Dynamic Triage Mapping (Stage 2 Split Architecture)</span>
                            </span>
                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-[10px]">
                              <div className="bg-white p-2 rounded border border-emerald-200 text-emerald-900">
                                <span className="font-bold block">1. Store In-Stock Items</span>
                                <span>Spawns <strong className="font-mono">-DISP</strong> &rarr; Assigned to <strong>STORE_MANAGER</strong> (Amanat)</span>
                              </div>
                              <div className="bg-white p-2 rounded border border-indigo-200 text-indigo-900">
                                <span className="font-bold block">2. Purchase Requisition Items</span>
                                <span>Spawns <strong className="font-mono">-PUR</strong> &rarr; Assigned to <strong>PURCHASE_MANAGER</strong> (Brahmanand)</span>
                              </div>
                              <div className="bg-white p-2 rounded border border-amber-200 text-amber-900">
                                <span className="font-bold block">3. Archive / Hold Items</span>
                                <span>Scheduled 7-day Review Task &rarr; Assigned to <strong>STORE_MANAGER</strong></span>
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Stage 1 Connected Workflow Container & Live Preview UI */}
                        {(() => {
                          const targetInfo = getTargetStage1Info(stg.subWorkflowTrigger.targetTemplateKey || 'PO_TO_PAYMENT');
                          const currentMappings = stg.subWorkflowTrigger.fieldMappings || [];

                          // Only include fields from current stage (sIdx) and prior stages (0..sIdx)
                          const availablePriorStages = stages.slice(0, sIdx + 1);

                          const stageSpecificFields = availablePriorStages.flatMap((s, sI) =>
                            (s.fields || []).map((f) => ({
                              key: f.id,
                              label: `${f.label} ${sI === sIdx ? `[Current Stage #${sI + 1}]` : `[Stage #${sI + 1}]`}`,
                              tech: f.id,
                            }))
                          );

                          const globalHeaderFields = [
                            { key: 'siteName', label: 'Site / Store Location', tech: 'siteName' },
                            { key: 'itemDescription', label: 'Item / Material Description', tech: 'itemDescription' },
                            { key: 'itemName', label: 'Item Description / Name', tech: 'itemName' },
                            { key: 'quantity', label: 'Required Requisition Quantity', tech: 'quantity' },
                            { key: 'reqQuantity', label: 'Required Quantity', tech: 'reqQuantity' },
                            { key: 'availableStock', label: 'Current Available Stock in Bin', tech: 'availableStock' },
                            { key: 'inStockQty', label: 'In-Stock Available Quantity', tech: 'inStockQty' },
                            { key: 'poNumber', label: 'PO / Agreement Number', tech: 'poNumber' },
                            { key: 'vendorName', label: 'Vendor / Party Name', tech: 'vendorName' },
                            { key: 'indentNo', label: 'Indent / Requisition Ref', tech: 'indentNo' },
                            { key: 'totalAmount', label: 'Estimated / Bill Amount (₹)', tech: 'totalAmount' },
                            { key: 'poAmount', label: 'PO Amount (₹)', tech: 'poAmount' },
                            { key: 'deliveryDate', label: 'Expected Delivery Date', tech: 'deliveryDate' },
                            { key: 'expectedDate', label: 'Expected Store Arrival Date', tech: 'expectedDate' },
                            { key: 'invoiceNo', label: 'Invoice / Bill Reference', tech: 'invoiceNo' },
                            { key: 'paymentBank', label: 'Bank Name & Branch', tech: 'paymentBank' },
                            { key: 'utrNumber', label: 'UTR / Payment Reference No.', tech: 'utrNumber' },
                            { key: 'mrnNumber', label: 'Material Receipt Note (MRN)', tech: 'mrnNumber' },
                            { key: 'purpose', label: 'Purpose / Remarks', tech: 'purpose' },
                            { key: 'remarks', label: 'Remarks / Notes', tech: 'remarks' },
                          ];

                          const parentDropdownOptions = [
                            ...stageSpecificFields,
                            ...globalHeaderFields,
                          ];

                          const parentOptionsMap = new Map<string, { key: string; label: string; tech: string }>();
                          parentDropdownOptions.forEach((opt) => {
                            if (!parentOptionsMap.has(opt.key)) {
                              parentOptionsMap.set(opt.key, opt);
                            }
                          });

                          // Register any default target fields or custom mapped keys into parentOptionsMap
                          targetInfo.fields.forEach((tf) => {
                            const valKey = tf.defaultSourceField || tf.id;
                            if (!parentOptionsMap.has(valKey)) {
                              parentOptionsMap.set(valKey, {
                                key: valKey,
                                label: tf.label,
                                tech: valKey
                              });
                            }
                          });

                          currentMappings.forEach((cm) => {
                            if (cm.sourceField && !parentOptionsMap.has(cm.sourceField)) {
                              parentOptionsMap.set(cm.sourceField, {
                                key: cm.sourceField,
                                label: cm.sourceField,
                                tech: cm.sourceField
                              });
                            }
                          });

                          const parentOptions = Array.from(parentOptionsMap.values());

                          return (
                            <div className="space-y-3 pt-2 border-t border-indigo-200/80">
                              {/* Target Stage 1 Header Info Box */}
                              <div className="bg-white rounded-lg p-2.5 border border-indigo-200 shadow-xs flex flex-wrap items-center justify-between gap-2">
                                <div className="space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <span className="px-1.5 py-0.5 text-[10px] font-extrabold bg-indigo-600 text-white rounded">
                                      STAGE 1
                                    </span>
                                    <span className="font-bold text-xs text-indigo-950">
                                      {targetInfo.templateName}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600 font-medium">
                                    Target Stage 1: <strong className="text-indigo-900">{targetInfo.stage1Name}</strong> ({targetInfo.whoRole})
                                  </p>
                                </div>

                                <div className="flex items-center gap-2">
                                  <span className="text-[10px] font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded border border-slate-200 flex items-center gap-1">
                                    <Clock className="w-3 h-3 text-amber-600" /> SLA: +{targetInfo.slaHours}h
                                  </span>

                                  <button
                                    type="button"
                                    onClick={() => setShowTechnicalKeys(!showTechnicalKeys)}
                                    className={`text-[10px] font-bold px-2 py-1 rounded border transition-colors flex items-center gap-1 cursor-pointer ${
                                      showTechnicalKeys 
                                        ? 'bg-amber-100 text-amber-900 border-amber-300' 
                                        : 'bg-slate-100 hover:bg-slate-200 text-slate-700 border-slate-300'
                                    }`}
                                    title="Toggle showing backend technical keys like siteName, reqQuantity"
                                  >
                                    <span className="flex items-center gap-1"><Settings className="w-3 h-3" /> {showTechnicalKeys ? 'Technical Keys: ON' : 'Show Technical Keys'}</span>
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => handleAutoConnectStage1Fields(sIdx)}
                                    className="text-[10px] font-extrabold bg-indigo-600 hover:bg-indigo-700 text-white px-2.5 py-1 rounded shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
                                    title="Re-connect and match parent variables with Stage 1 target fields"
                                  >
                                    <Sparkles className="w-3 h-3" /> Auto-Connect Stage 1 Fields
                                  </button>
                                </div>
                              </div>

                              {/* Auto-Connected Stage 1 Fields Matrix */}
                              <div className="space-y-2 bg-white p-3 rounded-lg border border-indigo-200">
                                <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                                  <span className="text-[11px] font-bold text-indigo-950 flex items-center gap-1.5">
                                    <GitBranch className="w-3.5 h-3.5 text-indigo-600" />
                                    <span>Automatically Connected Stage 1 Input Fields ({targetInfo.fields.length})</span>
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleAddFieldMapping(sIdx)}
                                    className="text-[10px] font-bold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
                                  >
                                    <Plus className="w-3 h-3" /> Add Custom Field Binding
                                  </button>
                                </div>

                                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                                  {targetInfo.fields.map((targetFld, fIdx) => {
                                    const existingMap = currentMappings.find((m) => m.targetField === targetFld.id);
                                    const sourceVal = existingMap ? existingMap.sourceField : targetFld.defaultSourceField;

                                    return (
                                      <div key={fIdx} className="bg-slate-50 p-2 rounded-md border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                        <div className="flex items-center gap-2 min-w-0 flex-1">
                                          <span className="text-[10px] font-bold bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded shrink-0">
                                            {targetFld.type}
                                          </span>
                                          <div className="truncate">
                                            <span className="text-xs font-bold text-slate-800">{targetFld.label}</span>
                                            {showTechnicalKeys && (
                                              <span className="text-[10px] font-mono text-indigo-600 bg-indigo-50 px-1 py-0.2 rounded border border-indigo-200 ml-1.5 font-semibold">
                                                ({targetFld.id})
                                              </span>
                                            )}
                                          </div>
                                          {targetFld.required && (
                                            <span className="text-[9px] font-bold text-rose-600 bg-rose-50 px-1 rounded border border-rose-200 shrink-0">
                                              REQ
                                            </span>
                                          )}
                                        </div>

                                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-1.5 sm:w-1/2">
                                          <span className="text-[10px] font-bold text-indigo-700 shrink-0 flex items-center gap-1">
                                            <ArrowRight className="w-3 h-3 text-indigo-500" />
                                            Maps From:
                                          </span>
                                          <select
                                            value={sourceVal}
                                            onChange={(e) => {
                                              const chosen = e.target.value;
                                              const mapIndex = currentMappings.findIndex((m) => m.targetField === targetFld.id);
                                              if (mapIndex >= 0) {
                                                handleUpdateFieldMapping(sIdx, mapIndex, chosen, targetFld.id);
                                              } else {
                                                handleUpdateSubWorkflowTrigger(sIdx, {
                                                  fieldMappings: [...currentMappings, { sourceField: chosen, targetField: targetFld.id }],
                                                });
                                              }
                                            }}
                                            className="text-xs bg-white border border-indigo-300 rounded-md px-2 py-1 font-semibold text-slate-800 w-full focus:ring-1 focus:ring-indigo-500 focus:outline-none cursor-pointer shadow-2xs"
                                          >
                                            {parentOptions.map((opt) => (
                                              <option key={opt.key} value={opt.key}>
                                                {showTechnicalKeys ? `${opt.label} (${opt.tech})` : opt.label}
                                              </option>
                                            ))}
                                          </select>
                                        </div>
                                      </div>
                                    );
                                  })}

                                  {/* Extra mapped fields not in target default fields */}
                                  {currentMappings
                                    .filter((m) => !targetInfo.fields.some((tf) => tf.id === m.targetField))
                                    .map((m, extraIdx) => {
                                      const actualMapIdx = currentMappings.findIndex((cm) => cm === m);
                                      return (
                                        <div key={extraIdx} className="bg-amber-50/60 p-2 rounded-md border border-amber-200 flex items-center gap-2 text-xs">
                                          <span className="text-[10px] font-bold bg-amber-200 text-amber-900 px-1.5 py-0.5 rounded shrink-0">
                                            MAPPED
                                          </span>
                                          <select
                                            value={m.sourceField}
                                            onChange={(e) => {
                                              handleUpdateFieldMapping(sIdx, actualMapIdx, e.target.value, m.targetField);
                                            }}
                                            className="text-xs bg-white border border-amber-300 rounded px-2 py-1 font-semibold text-slate-800 flex-1 cursor-pointer"
                                          >
                                            {parentOptions.map((opt) => (
                                              <option key={opt.key} value={opt.key}>
                                                {showTechnicalKeys ? `${opt.label} (${opt.tech})` : opt.label}
                                              </option>
                                            ))}
                                          </select>
                                          <ArrowRight className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                                          <span className="text-xs font-bold text-slate-800 shrink-0">
                                            {m.targetField}
                                          </span>
                                          <button
                                            type="button"
                                            onClick={() => handleRemoveFieldMapping(sIdx, actualMapIdx)}
                                            className="text-slate-400 hover:text-rose-600 p-1 cursor-pointer shrink-0 ml-auto"
                                            title="Remove binding"
                                          >
                                            <X className="w-3.5 h-3.5" />
                                          </button>
                                        </div>
                                      );
                                    })}
                                </div>
                              </div>

                              {/* Target Stage 1 Mandatory Checkpoints */}
                              <div className="bg-white p-2.5 rounded-lg border border-indigo-200 space-y-1.5">
                                <span className="text-[10px] font-extrabold uppercase text-indigo-900 flex items-center gap-1">
                                  <CheckSquare className="w-3 h-3 text-indigo-600" />
                                  Stage 1 Mandatory Checkpoints ({targetInfo.checkpoints.length})
                                </span>
                                <ul className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                                  {targetInfo.checkpoints.map((cp, cpIdx) => (
                                    <li key={cpIdx} className="text-[11px] text-slate-700 bg-slate-50 px-2 py-1 rounded border border-slate-200 flex items-center gap-1.5 font-medium">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                                      <span className="truncate">{cp}</span>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            </div>
                          );
                        })()}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </form>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-200 bg-slate-50 flex items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-white border border-slate-300 hover:bg-slate-100 text-slate-700 font-semibold rounded-lg text-xs transition-colors cursor-pointer"
            >
              Cancel
            </button>

            {confirmReset ? (
              <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-300 rounded-lg px-2.5 py-1">
                <span className="text-xs font-bold text-amber-900">Reset template to default state?</span>
                <button
                  type="button"
                  onClick={handleResetTemplate}
                  className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded text-xs cursor-pointer shadow-2xs"
                >
                  Yes, Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmReset(false)}
                  className="px-2.5 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded text-xs cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmReset(true)}
                className="px-3 py-2 text-slate-700 hover:bg-slate-100 bg-white border border-slate-300 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-2xs"
                title="Reset stages, fields, SLA settings, and auto-triggers back to default"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Reset Template</span>
              </button>
            )}

            {editingTemplateId && customTemplates.some((t) => t.id === editingTemplateId) && (
              confirmDeleteTemplate ? (
                <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-lg px-2 py-1">
                  <span className="text-xs font-bold text-rose-700">Delete this custom template?</span>
                  <button
                    type="button"
                    onClick={() => {
                      if (editingTemplateId) {
                        storageAdapter.deleteFmsTemplate(editingTemplateId);
                      }
                      if (selectedExistingKey) {
                        storageAdapter.deleteFmsTemplate(selectedExistingKey);
                      }
                      onClose();
                    }}
                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded text-xs cursor-pointer"
                  >
                    Yes, Delete
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDeleteTemplate(false)}
                    className="px-2 py-1 bg-slate-200 hover:bg-slate-300 text-slate-700 font-medium rounded text-xs cursor-pointer"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDeleteTemplate(true)}
                  className="px-3 py-2 text-rose-600 hover:bg-rose-50 border border-rose-200 font-semibold rounded-lg text-xs transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Template</span>
                </button>
              )
            )}
          </div>
          
          <button
            type="submit"
            form="template-studio-form"
            className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg text-xs shadow-sm transition-all flex items-center gap-1.5 cursor-pointer"
          >
            <Save className="w-4 h-4 text-white" />
            <span>Save &amp; Register FMS Template</span>
          </button>
        </div>

      </div>
    </div>
  );
};
