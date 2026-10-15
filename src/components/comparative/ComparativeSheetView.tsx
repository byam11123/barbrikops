import React, { useState, useMemo } from 'react';
import { 
  FileSpreadsheet, 
  Download, 
  Plus, 
  Trash2, 
  Save, 
  CheckCircle2, 
  AlertTriangle, 
  ClipboardPaste, 
  Layers, 
  Building2, 
  UserCheck, 
  ArrowRight, 
  ExternalLink, 
  Percent, 
  Sparkles, 
  ShieldCheck,
  RefreshCw,
  FolderOpen,
  Calendar,
  MapPin,
  FileText,
  Clock,
  ChevronDown,
  Zap,
  Award,
  CheckSquare,
  FileDown,
  X,
  Lock,
} from 'lucide-react';
import { ComparativeStatement, CsItem, CsVendorQuote, UserProfile, FmsInstance } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { 
  downloadComparativeStatementExcel, 
  calculateCsL1Analytics 
} from '../../services/comparativeExcelService';
import { downloadComparativeStatementPdf } from '../../services/comparativePdfService';
import { ComparativeDirectoryView } from './ComparativeDirectoryView';
import { parseRawQuoteText } from '../../utils/quoteTextParser';

interface ComparativeSheetViewProps {
  currentUser: UserProfile;
  purchaseFlows?: FmsInstance[];
  onNavigateTab?: (tab: string) => void;
  initialCsId?: string | null;
}

export const ComparativeSheetView: React.FC<ComparativeSheetViewProps> = ({
  currentUser,
  purchaseFlows = [],
  onNavigateTab,
  initialCsId,
}) => {
  // Saved statements
  const [statements, setStatements] = useState<ComparativeStatement[]>(() => {
    return storageAdapter.getComparativeStatements();
  });

  const [activeStatementId, setActiveStatementId] = useState<string>(() => {
    if (initialCsId && statements.some((s) => s.id === initialCsId)) {
      return initialCsId;
    }
    return statements[0]?.id || 'new';
  });

  // Current active statement
  const activeStatement = useMemo(() => {
    return statements.find((s) => s.id === activeStatementId) || statements[0];
  }, [statements, activeStatementId]);

  // View mode switcher: DIRECTORY (ledger table & stats) vs EDITOR (detailed comparison matrix)
  const [viewMode, setViewMode] = useState<'DIRECTORY' | 'EDITOR'>(() => {
    return initialCsId ? 'EDITOR' : 'DIRECTORY';
  });

  const handleOpenEditor = (csId: string) => {
    setActiveStatementId(csId);
    const target = storageAdapter.getComparativeStatements().find((s) => s.id === csId);
    if (target) {
      setCs(target);
    }
    setViewMode('EDITOR');
  };

  const handleCreateNewFromDirectory = () => {
    handleCreateNewSheet();
    setViewMode('EDITOR');
  };

  const handleRefreshStatements = () => {
    setStatements(storageAdapter.getComparativeStatements());
  };

  // Working state for active statement
  const [cs, setCs] = useState<ComparativeStatement>(() => {
    return activeStatement || storageAdapter.getComparativeStatements()[0];
  });

  // Approver states - strictly restricted to Director Pranjal Agrawal
  const isPranjal = useMemo(() => {
    if (!currentUser) return false;
    const name = (currentUser.name || '').trim().toLowerCase();
    const username = (currentUser.username || '').trim().toLowerCase();
    const email = (currentUser.email || '').trim().toLowerCase();
    return (
      name.includes('pranjal') ||
      username.includes('pranjal') ||
      email.includes('pranjal') ||
      currentUser.userId === 'USR-013'
    );
  }, [currentUser]);

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [approverName, setApproverName] = useState('Pranjal Agrawal');
  const [approverDesignation, setApproverDesignation] = useState('Finance Approver / Director');
  const [approvalRemarks, setApprovalRemarks] = useState(
    activeStatement?.approvalDetails?.remarks ||
      'Approved with item-wise split PO allocation to maintain dual vendor operational readiness. Freight strictly OURS.'
  );

  // Split PO generation states
  const [isSplitPoModalOpen, setIsSplitPoModalOpen] = useState(false);
  const [createdSplitPos, setCreatedSplitPos] = useState<FmsInstance[]>([]);

  // Keep cs updated when switching statements
  React.useEffect(() => {
    if (activeStatement) {
      setCs(activeStatement);
      if (activeStatement.approvalDetails) {
        setApproverName(activeStatement.approvalDetails.approverName || 'Pranjal Agrawal');
        setApproverDesignation(
          activeStatement.approvalDetails.approverDesignation || 'Finance Approver / Director'
        );
        setApprovalRemarks(activeStatement.approvalDetails.remarks || '');
      } else {
        setApproverName('Pranjal Agrawal');
        setApproverDesignation('Finance Approver / Director');
      }
    }
  }, [activeStatement?.id]);

  // Modals & UI Toggles
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [rawQuoteInput, setRawQuoteInput] = useState('');
  const [isImportIndentOpen, setIsImportIndentOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);

  // Compute L-1 analytics
  const analytics = useMemo(() => {
    return calculateCsL1Analytics(cs);
  }, [cs]);

  const { itemL1Map, vendorTotals, singleLowestVendor, splitPoOptimizedTotal, splitPoSavings, savingsPercent } = analytics;

  // Multi-Vendor Awarded Allocation Summary
  const awardedSummary = useMemo(() => {
    const map = cs.awardedVendorMap || {};
    const vendorStats: Record<string, { itemCount: number; totalAmount: number; items: CsItem[] }> = {};

    cs.vendors.forEach((v) => {
      vendorStats[v.vendorId] = { itemCount: 0, totalAmount: 0, items: [] };
    });

    cs.items.forEach((item) => {
      const assignedVendorId =
        map[item.id] || analytics.itemL1Map[item.id]?.l1VendorId || cs.vendors[0]?.vendorId;
      if (assignedVendorId && vendorStats[assignedVendorId]) {
        const v = cs.vendors.find((vnd) => vnd.vendorId === assignedVendorId);
        const q = v?.itemRates[item.id];
        vendorStats[assignedVendorId].itemCount++;
        vendorStats[assignedVendorId].totalAmount += q ? q.amount : 0;
        vendorStats[assignedVendorId].items.push(item);
      }
    });

    const totalAwardedValue = Object.values(vendorStats).reduce((sum, s) => sum + s.totalAmount, 0);
    const totalItems = cs.items.length;
    const vendorsWithAwards = Object.values(vendorStats).filter((s) => s.itemCount > 0).length;
    const deltaVsPureL1 = Math.max(0, totalAwardedValue - splitPoOptimizedTotal);

    return {
      vendorStats,
      totalAwardedValue,
      totalItems,
      vendorsWithAwards,
      deltaVsPureL1,
    };
  }, [cs, analytics.itemL1Map, splitPoOptimizedTotal]);

  // Header update handler
  const handleUpdateHeader = (field: keyof ComparativeStatement, val: string) => {
    setCs((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  // Add Item
  const handleAddItem = () => {
    const newItem: CsItem = {
      id: `it-${Date.now()}`,
      sn: cs.items.length + 1,
      itemName: `NEW MATERIAL / SPARE PART ${cs.items.length + 1}`,
      brandMake: '—',
      unit: 'NOS',
      qty: 1,
    };

    const updatedVendors = cs.vendors.map((v) => ({
      ...v,
      itemRates: {
        ...v.itemRates,
        [newItem.id]: {
          baseRate: 0,
          gstPercent: 18,
          gstAmount: 0,
          landedRate: 0,
          amount: 0,
          isQuoted: false,
        },
      },
    }));

    setCs((prev) => ({
      ...prev,
      items: [...prev.items, newItem],
      vendors: updatedVendors,
    }));
  };

  // Delete Item
  const handleDeleteItem = (itemId: string) => {
    const updatedItems = cs.items.filter((it) => it.id !== itemId).map((it, idx) => ({ ...it, sn: idx + 1 }));
    const updatedVendors = cs.vendors.map((v) => {
      const copyRates = { ...v.itemRates };
      delete copyRates[itemId];
      return {
        ...v,
        itemRates: copyRates,
      };
    });

    setCs((prev) => ({
      ...prev,
      items: updatedItems,
      vendors: updatedVendors,
    }));
  };

  // Update Item Metadata
  const handleUpdateItemMeta = (itemId: string, field: keyof CsItem, value: any) => {
    setCs((prev) => {
      const updatedItems = prev.items.map((it) => {
        if (it.id === itemId) {
          return { ...it, [field]: value };
        }
        return it;
      });

      // If Qty changed, re-calculate amounts across all vendors
      let updatedVendors = prev.vendors;
      if (field === 'qty') {
        const newQty = Number(value) || 0;
        updatedVendors = prev.vendors.map((v) => {
          const q = v.itemRates[itemId];
          if (q) {
            return {
              ...v,
              itemRates: {
                ...v.itemRates,
                [itemId]: {
                  ...q,
                  amount: q.landedRate * newQty,
                },
              },
            };
          }
          return v;
        });
      }

      return {
        ...prev,
        items: updatedItems,
        vendors: updatedVendors,
      };
    });
  };

  // Add Vendor Column
  const handleAddVendor = () => {
    const newVendorId = `vnd-${Date.now()}`;
    const newVendorIndex = cs.vendors.length + 1;
    const itemRates: Record<string, any> = {};

    cs.items.forEach((it) => {
      itemRates[it.id] = {
        baseRate: 0,
        gstPercent: 18,
        gstAmount: 0,
        landedRate: 0,
        amount: 0,
        isQuoted: false,
      };
    });

    const newVendor: CsVendorQuote = {
      vendorId: newVendorId,
      vendorName: `Supplier ${String.fromCharCode(64 + newVendorIndex)}`,
      rating: '4.2 / 5.0 (Approved Vendor)',
      contactPersonMobile: 'Contact Person | Mo: +91-XXXXXXXXXX',
      storeOfficeAddress: 'Commercial Market, Raipur/Korba (C.G.)',
      paymentTerms: '30 Days Credit',
      warrantyPeriod: '01 Year OEM Warranty',
      gstTerms: '18% GST Applicable',
      freightDeliveryTerms: 'OURS (Barbrik Project Ltd.)',
      quotationDateValidity: `${new Date().toLocaleDateString('en-GB')} | 30 Days Validity`,
      primaryProductFocus: 'Heavy Equipment Spares & Consumables',
      itemRates,
    };

    setCs((prev) => ({
      ...prev,
      vendors: [...prev.vendors, newVendor],
    }));
  };

  // Delete Vendor
  const handleDeleteVendor = (vendorId: string) => {
    if (cs.vendors.length <= 1) {
      alert('At least one vendor is required for rate comparison.');
      return;
    }
    setCs((prev) => ({
      ...prev,
      vendors: prev.vendors.filter((v) => v.vendorId !== vendorId),
    }));
  };

  // Update Vendor Metadata
  const handleUpdateVendorMeta = (vendorId: string, field: keyof CsVendorQuote, value: string) => {
    setCs((prev) => ({
      ...prev,
      vendors: prev.vendors.map((v) => (v.vendorId === vendorId ? { ...v, [field]: value } : v)),
    }));
  };

  // Update Vendor Rate for an item
  const handleUpdateVendorRate = (
    vendorId: string,
    itemId: string,
    baseRate: number,
    gstPercent: number = 18
  ) => {
    const targetItem = cs.items.find((it) => it.id === itemId);
    const qty = targetItem ? targetItem.qty : 1;
    const gstAmount = (baseRate * gstPercent) / 100;
    const landedRate = baseRate + gstAmount;
    const amount = landedRate * qty;
    const isQuoted = baseRate > 0;

    setCs((prev) => ({
      ...prev,
      vendors: prev.vendors.map((v) => {
        if (v.vendorId === vendorId) {
          return {
            ...v,
            itemRates: {
              ...v.itemRates,
              [itemId]: {
                baseRate,
                gstPercent,
                gstAmount,
                landedRate,
                amount,
                isQuoted,
              },
            },
          };
        }
        return v;
      }),
    }));
  };

  // Save CS Sheet
  const handleSaveSheet = () => {
    const saved = storageAdapter.saveComparativeStatement(cs);
    const all = storageAdapter.getComparativeStatements();
    setStatements(all);
    setActiveStatementId(saved.id);
    setSaveSuccessMsg('Comparative Statement saved successfully!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Create New Sheet
  const handleCreateNewSheet = () => {
    const newId = `cs-${Date.now()}`;
    const newCs: ComparativeStatement = {
      id: newId,
      companyName: 'Barbrik Project Ltd.',
      site: 'BIJETALA',
      indentNo: '',
      indentDate: new Date().toLocaleDateString('en-GB'),
      forPurpose: '',
      statementDate: new Date().toLocaleDateString('en-GB'),
      items: [
        { id: `it-${Date.now()}-1`, sn: 1, itemName: 'EQUIPMENT SPARE PART 1', brandMake: '—', unit: 'NOS', qty: 1 },
      ],
      vendors: [
        {
          vendorId: `vnd-${Date.now()}-1`,
          vendorName: 'Supplier A',
          rating: '4.5 / 5.0 (Top Rated Supplier)',
          contactPersonMobile: 'Contact | Mo: +91-XXXXXXXXXX',
          storeOfficeAddress: 'Local Commercial Market, C.G.',
          paymentTerms: '30 Days Credit',
          warrantyPeriod: '01 Year Comprehensive Warranty',
          gstTerms: '18% GST Applicable',
          freightDeliveryTerms: 'OURS (Barbrik Project Ltd.)',
          quotationDateValidity: `${new Date().toLocaleDateString('en-GB')} | 30 Days Validity`,
          primaryProductFocus: 'Heavy Equipment Spares',
          itemRates: {
            [`it-${Date.now()}-1`]: { baseRate: 0, gstPercent: 18, gstAmount: 0, landedRate: 0, amount: 0, isQuoted: false },
          },
        },
        {
          vendorId: `vnd-${Date.now()}-2`,
          vendorName: 'Supplier B',
          rating: '4.2 / 5.0 (Authorized Distributor)',
          contactPersonMobile: 'Contact | Mo: +91-XXXXXXXXXX',
          storeOfficeAddress: 'Transport Nagar, C.G.',
          paymentTerms: '30 Days Credit',
          warrantyPeriod: '01 Year OEM Warranty',
          gstTerms: '18% GST Applicable',
          freightDeliveryTerms: 'OURS (Barbrik Project Ltd.)',
          quotationDateValidity: `${new Date().toLocaleDateString('en-GB')} | 30 Days Validity`,
          primaryProductFocus: 'Heavy Equipment Spares',
          itemRates: {
            [`it-${Date.now()}-1`]: { baseRate: 0, gstPercent: 18, gstAmount: 0, landedRate: 0, amount: 0, isQuoted: false },
          },
        },
      ],
      status: 'Draft',
      createdAt: new Date().toLocaleString('en-GB'),
      updatedAt: new Date().toLocaleString('en-GB'),
    };

    storageAdapter.saveComparativeStatement(newCs);
    setStatements(storageAdapter.getComparativeStatements());
    setActiveStatementId(newId);
    setCs(newCs);
  };

  // Parse Raw Quote Text
  const handleApplyParsedText = () => {
    if (!rawQuoteInput.trim()) return;
    const parsed = parseRawQuoteText(rawQuoteInput, cs.items);

    setCs((prev) => ({
      ...prev,
      site: parsed.site || prev.site,
      indentNo: parsed.indentNo || prev.indentNo,
      indentDate: parsed.indentDate || prev.indentDate,
      forPurpose: parsed.forPurpose || prev.forPurpose,
      items: parsed.items.length > 0 ? parsed.items : prev.items,
      vendors: parsed.vendors.length > 0 ? parsed.vendors : prev.vendors,
    }));

    setIsPasteModalOpen(false);
    setRawQuoteInput('');
    setSaveSuccessMsg('Quotation text parsed and items populated!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Import from Purchase FMS Flow
  const handleImportFromFlow = (flow: FmsInstance) => {
    const indentNo = flow.indentNo || flow.requisitionNumber || flow.flowId;
    const indentDate = flow.indentDate || flow.createdAt?.slice(0, 10) || new Date().toLocaleDateString('en-GB');
    const site = flow.siteName || 'BIJETALA';
    const forPurpose = flow.remarks || flow.machineName || flow.vendorName || `Indent for ${site}`;

    // Extract items from flow if available
    const newItems: CsItem[] = [];
    const flowAny = flow as any;
    if (flowAny.indentItems && Array.isArray(flowAny.indentItems) && flowAny.indentItems.length > 0) {
      flowAny.indentItems.forEach((it: any, idx: number) => {
        newItems.push({
          id: `flow-it-${idx + 1}-${Date.now()}`,
          sn: idx + 1,
          itemName: it.itemName || `Item ${idx + 1}`,
          brandMake: it.brand || it.brandMake || '—',
          unit: it.unit || 'NOS',
          qty: Number(it.qty) || 1,
        });
      });
    } else {
      newItems.push({
        id: `flow-it-1-${Date.now()}`,
        sn: 1,
        itemName: flow.partEquipmentName || flow.machineName || flow.remarks || 'Required Spares Consignment',
        brandMake: flow.machineMakeModel || '—',
        unit: 'SET',
        qty: 1,
      });
    }

    // Rebuild vendors for these items
    const updatedVendors = cs.vendors.map((v) => {
      const itemRates: Record<string, any> = {};
      newItems.forEach((it) => {
        itemRates[it.id] = {
          baseRate: 0,
          gstPercent: 18,
          gstAmount: 0,
          landedRate: 0,
          amount: 0,
          isQuoted: false,
        };
      });
      return {
        ...v,
        itemRates,
      };
    });

    setCs((prev) => ({
      ...prev,
      site,
      indentNo,
      indentDate,
      forPurpose,
      items: newItems,
      vendors: updatedVendors,
    }));

    setIsImportIndentOpen(false);
    setSaveSuccessMsg(`Imported requisition details from Indent ${indentNo}!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Award specific item to vendor (Director Item Selection)
  const handleAwardVendor = (itemId: string, vendorId: string) => {
    const updatedMap = {
      ...(cs.awardedVendorMap || {}),
      [itemId]: vendorId,
    };
    const updatedCs: ComparativeStatement = {
      ...cs,
      awardedVendorMap: updatedMap,
    };
    const saved = storageAdapter.saveComparativeStatement(updatedCs);
    setCs(saved);
    setStatements(storageAdapter.getComparativeStatements());
    const vendorName = cs.vendors.find((v) => v.vendorId === vendorId)?.vendorName || 'selected vendor';
    setSaveSuccessMsg(`Item selected & awarded to ${vendorName}!`);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Auto-Fill All items to their respective L-1 lowest bidder
  const handleAutoFillAllL1 = () => {
    const newAwardedMap: Record<string, string> = {};
    cs.items.forEach((item) => {
      const l1 = analytics.itemL1Map[item.id];
      if (l1 && l1.l1VendorId) {
        newAwardedMap[item.id] = l1.l1VendorId;
      } else if (cs.vendors[0]) {
        newAwardedMap[item.id] = cs.vendors[0].vendorId;
      }
    });

    const updated: ComparativeStatement = {
      ...cs,
      awardedVendorMap: newAwardedMap,
    };
    const saved = storageAdapter.saveComparativeStatement(updated);
    setCs(saved);
    setStatements(storageAdapter.getComparativeStatements());
    setSaveSuccessMsg('All items auto-awarded to their respective L-1 lowest bidders!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Delete current active statement
  const handleConfirmDeleteCurrentCs = () => {
    storageAdapter.deleteComparativeStatement(cs.id);
    const remaining = storageAdapter.getComparativeStatements();
    setStatements(remaining);
    setIsDeleteModalOpen(false);
    if (remaining.length > 0) {
      setActiveStatementId(remaining[0].id);
      setCs(remaining[0]);
    } else {
      setViewMode('DIRECTORY');
    }
    setSaveSuccessMsg('Comparative Statement permanently removed.');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Digital Sign & Authorize CS Sheet (Strictly Pranjal Agrawal Only)
  const handleDigitalSignAndApprove = () => {
    if (!isPranjal) {
      setSaveSuccessMsg('Error: Official signatory authorization is strictly restricted to Director Pranjal Agrawal.');
      return;
    }

    const timestamp = new Date().toLocaleString('en-GB');
    const signatureToken = `BPL-SIG-PA-${Math.random().toString(36).substring(2, 7).toUpperCase()}-EXEC-VERIFIED`;

    // Ensure all items have an awarded vendor
    const awardedMap = { ...(cs.awardedVendorMap || {}) };
    cs.items.forEach((item) => {
      if (!awardedMap[item.id]) {
        const l1 = analytics.itemL1Map[item.id];
        awardedMap[item.id] = l1?.l1VendorId || cs.vendors[0]?.vendorId || '';
      }
    });

    const updatedCs: ComparativeStatement = {
      ...cs,
      status: 'Approved',
      approvedBy: 'Pranjal Agrawal',
      approvalDate: timestamp,
      awardedVendorMap: awardedMap,
      approvalDetails: {
        approverName: 'Pranjal Agrawal',
        approverDesignation: 'Finance Approver / Director',
        approvalDate: timestamp,
        remarks: approvalRemarks.trim() || 'Approved with item-wise split PO allocation by Director Pranjal Agrawal.',
        signatureStamp: signatureToken,
      },
    };

    const saved = storageAdapter.saveComparativeStatement(updatedCs);
    setStatements(storageAdapter.getComparativeStatements());
    setCs(saved);
    setIsApproveModalOpen(false);
    setSaveSuccessMsg('Comparative Statement digitally approved and signed by Director Pranjal Agrawal!');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Generate Split Purchase Orders from Approved CS Sheet
  const handleGenerateSplitPurchaseOrders = () => {
    const result = storageAdapter.createSplitPurchaseOrdersFromCs(cs, currentUser);
    setCreatedSplitPos(result.createdFlows);
    setCs(result.updatedCs);
    setStatements(storageAdapter.getComparativeStatements());
    setIsSplitPoModalOpen(true);
    setSaveSuccessMsg(`Successfully generated ${result.createdFlows.length} split Purchase Orders!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  return (
    <div className="space-y-6 pb-16">
      {/* 0. VIEW MODE SWITCHER TABS (Directory vs Editor) */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white p-3 rounded-2xl border border-slate-200 shadow-2xs">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('DIRECTORY')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'DIRECTORY'
                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <Layers className="w-4 h-4" />
            <span>Saved CS Directory &amp; Ledger</span>
            <span
              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                viewMode === 'DIRECTORY' ? 'bg-indigo-750 text-indigo-100' : 'bg-slate-200 text-slate-700'
              }`}
            >
              {statements.length}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('EDITOR')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition-all cursor-pointer ${
              viewMode === 'EDITOR'
                ? 'bg-indigo-600 text-white shadow-xs ring-2 ring-indigo-500/20'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200'
            }`}
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Comparative Statement Workspace</span>
            {cs.indentNo && (
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                  viewMode === 'EDITOR' ? 'bg-indigo-750 text-indigo-100' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {cs.site} &bull; IND-{cs.indentNo}
              </span>
            )}
          </button>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-500 font-semibold px-1">
          {viewMode === 'DIRECTORY' ? (
            <span className="hidden sm:inline">Click any row in the ledger table to view summary or open in comparison matrix</span>
          ) : (
            <button
              type="button"
              onClick={() => setViewMode('DIRECTORY')}
              className="text-indigo-600 hover:text-indigo-700 font-bold flex items-center gap-1 cursor-pointer bg-indigo-50 px-3 py-1.5 rounded-lg border border-indigo-100"
            >
              <ArrowRight className="w-3.5 h-3.5 rotate-180" />
              <span>Back to Saved CS Directory</span>
            </button>
          )}
        </div>
      </div>

      {viewMode === 'DIRECTORY' ? (
        <ComparativeDirectoryView
          currentUser={currentUser}
          statements={statements}
          onOpenEditor={handleOpenEditor}
          onCreateNew={handleCreateNewFromDirectory}
          onRefreshStatements={handleRefreshStatements}
          onNavigateTab={onNavigateTab}
        />
      ) : (
        <>
          {/* 1. TOP HEADER & CORPORATE BRANDING */}
          <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-amber-400 text-slate-950 rounded font-mono">
                    Official Deliverable
                  </span>
                  <span className="text-xs text-indigo-200 font-semibold tracking-wider uppercase">
                    Procurement &amp; Engineering Division
                  </span>
                </div>
                <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
                  <span>BARBRIK PROJECT LTD.</span>
                  <span className="text-slate-400 font-normal text-sm sm:text-base">|</span>
                  <span className="text-indigo-200 font-bold text-sm sm:text-lg">Comparative Statement (CS Sheet)</span>
                </h1>
                <p className="text-xs text-slate-300">
                  Direct L-1 Bidder Normalization, Item-Wise GST Breakdown, Split PO Optimization &amp; Commercial Evaluation
                </p>
              </div>

              {/* Quick Actions */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleCreateNewSheet}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>New CS Sheet</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsPasteModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-indigo-200 border border-indigo-400/30 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  title="Paste WhatsApp or email quotes to auto-populate items & vendor rates"
                >
                  <ClipboardPaste className="w-3.5 h-3.5 text-amber-400" />
                  <span>Paste Quotes to Auto-Fill</span>
                </button>

                {purchaseFlows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsImportIndentOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                    <span>Load From Indent</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveSheet}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Save CS</span>
                </button>

                {/* DELETE CS ACTION */}
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-rose-950 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Delete this Comparative Statement"
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete CS</span>
                </button>

                {/* DIGITAL APPROVAL ACTION - STRICTLY PRANJAL AGRAWAL */}
                {cs.status !== 'Approved' && cs.status !== 'PO Created' ? (
                  isPranjal ? (
                    <button
                      type="button"
                      onClick={() => setIsApproveModalOpen(true)}
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-black transition-all shadow-md cursor-pointer"
                      title="Digitally approve and sign CS sheet as Director Pranjal Agrawal"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      <span>Sign &amp; Approve CS (Director)</span>
                    </button>
                  ) : (
                    <div
                      className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-850 text-amber-300/90 border border-amber-500/30 rounded-xl text-xs font-semibold select-none"
                      title="Executive signatory is restricted exclusively to Director Pranjal Agrawal. Switch user profile to Pranjal Agrawal to approve."
                    >
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                      <span>Signatory Restricted (Pranjal Agrawal Only)</span>
                    </div>
                  )
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsApproveModalOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-900/60 hover:bg-emerald-800 text-emerald-200 border border-emerald-500/50 rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                    <span>Signed by {cs.approvalDetails?.approverName || 'Pranjal Agrawal'}</span>
                  </button>
                )}

                {/* SPLIT PO GENERATION ACTION */}
                {(cs.status === 'Approved' || cs.status === 'PO Created') && (
                  <button
                    type="button"
                    onClick={handleGenerateSplitPurchaseOrders}
                    className="flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-black rounded-xl text-xs transition-all shadow-md cursor-pointer"
                    title="Generate discrete purchase orders for each awarded vendor in the FMS pipeline"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span>{cs.status === 'PO Created' ? 'Re-Generate Split POs' : 'Generate Split POs'}</span>
                  </button>
                )}

                {/* COLORED PDF DOWNLOAD */}
                <button
                  type="button"
                  onClick={() => downloadComparativeStatementPdf(cs)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-rose-700 hover:bg-rose-600 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Download Barbrik Project Ltd. high-resolution colored PDF in Landscape orientation"
                >
                  <FileDown className="w-3.5 h-3.5 text-rose-200" />
                  <span>Download PDF</span>
                </button>

                {/* EXCEL EXPORT */}
                <button
                  type="button"
                  onClick={() => downloadComparativeStatementExcel(cs)}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer"
                  title="Download standardized Barbrik Project Ltd. Excel (.xlsx) file in Landscape with Fit-All-Columns scaling"
                >
                  <Download className="w-3.5 h-3.5 text-amber-400" />
                  <span>Export Excel (.xlsx)</span>
                </button>
              </div>
            </div>

            {/* Success Toast */}
            {saveSuccessMsg && (
              <div className="mt-3 py-1.5 px-3 bg-emerald-500/20 border border-emerald-400/40 rounded-lg text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{saveSuccessMsg}</span>
              </div>
            )}
          </div>

      {/* 2. CS SHEET SELECTOR & MANDATORY HEADER BLOCK */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Saved Statements:</span>
            <select
              aria-label="Select saved Comparative Statement"
              value={activeStatementId}
              onChange={(e) => setActiveStatementId(e.target.value)}
              className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
            >
              {statements.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.site} — IND: {s.indentNo || 'N/A'} ({s.forPurpose?.slice(0, 30) || 'General'}) [{s.statementDate}]
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">
              Status:{' '}
              <strong className={cs.status === 'Approved' ? 'text-emerald-700' : 'text-amber-700'}>
                {cs.status}
              </strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-mono text-[11px]">Last Updated: {cs.updatedAt}</span>
          </div>
        </div>

        {/* Procurement Header Parameters */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Site */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="w-3 h-3 text-indigo-600" />
              <span>Project Site</span>
            </label>
            <input
              type="text"
              value={cs.site}
              onChange={(e) => handleUpdateHeader('site', e.target.value)}
              placeholder="e.g. BIJETALA, SILADEHI"
              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase"
            />
          </div>

          {/* Indent No */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <FileText className="w-3 h-3 text-indigo-600" />
              <span>Indent No.</span>
            </label>
            <input
              type="text"
              value={cs.indentNo}
              onChange={(e) => handleUpdateHeader('indentNo', e.target.value)}
              placeholder="e.g. 466, 778"
              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* Indent Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Calendar className="w-3 h-3 text-indigo-600" />
              <span>Indent Date</span>
            </label>
            <input
              type="text"
              value={cs.indentDate}
              onChange={(e) => handleUpdateHeader('indentDate', e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>

          {/* For / Equipment Purpose */}
          <div className="space-y-1 lg:col-span-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Building2 className="w-3 h-3 text-indigo-600" />
              <span>For (Equipment / Plant)</span>
            </label>
            <input
              type="text"
              value={cs.forPurpose}
              onChange={(e) => handleUpdateHeader('forPurpose', e.target.value)}
              placeholder="e.g. HM LOADER & DG-82.5KVA"
              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Statement Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-600" />
              <span>Statement Date</span>
            </label>
            <input
              type="text"
              value={cs.statementDate}
              onChange={(e) => handleUpdateHeader('statementDate', e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono"
            />
          </div>
        </div>
      </div>

      {/* 3. PROCUREMENT KPI & SPLIT PO SAVINGS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Single Lowest Bidder */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Overall Single L-1 Supplier</span>
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-slate-900 truncate">
            {singleLowestVendor ? singleLowestVendor.vendorName : 'None Quoted'}
          </div>
          <div className="text-xs font-mono font-bold text-emerald-700">
            ₹{singleLowestVendor ? singleLowestVendor.totalLanded.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
            <span className="text-[10px] text-slate-400 font-normal ml-1">Landed Cost</span>
          </div>
        </div>

        {/* Split PO Optimized Total */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Split PO Optimal Cost</span>
            <Sparkles className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-black text-indigo-900">
            ₹{splitPoOptimizedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-slate-500">
            Sum of individual item-wise L-1 bids
          </div>
        </div>

        {/* Split PO Savings */}
        <div className="bg-white p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-emerald-800 font-semibold uppercase">
            <span>Split PO Savings</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-lg font-black text-emerald-800">
            ₹{splitPoSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
          <div className="text-xs text-emerald-700 font-bold">
            {savingsPercent > 0 ? `${savingsPercent.toFixed(2)}% Saved vs Single PO` : 'Optimal as Single PO'}
          </div>
        </div>

        {/* Total Line Items & Suppliers */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between text-xs text-slate-500 font-semibold uppercase">
            <span>Bidding Scope</span>
            <Layers className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-lg font-black text-slate-900">
            {cs.items.length} Items &bull; {cs.vendors.length} Vendors
          </div>
          <div className="text-xs text-slate-500">
            Freight &amp; Delivery: <strong className="text-slate-700 font-semibold">OURS for all vendors</strong>
          </div>
        </div>
      </div>

      {/* 3.5 MULTI-VENDOR DIGITAL ALLOCATION SUMMARY */}
      <div className="bg-slate-900 text-white p-4 rounded-2xl border border-slate-800 shadow-2xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-2.5">
          <div className="flex items-center gap-2">
            <Award className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-black uppercase tracking-wider text-slate-100">
              Multi-Vendor Allocation &amp; Relationship Balance Matrix
            </span>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-900/80 text-indigo-300 rounded border border-indigo-700/50">
              {awardedSummary.vendorsWithAwards} of {cs.vendors.length} Vendors Awarded
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleAutoFillAllL1}
              className="flex items-center gap-1.5 px-3 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              title="One-click reset all items to their respective L-1 lowest bidder"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Auto-Fill All L-1</span>
            </button>

            {cs.status !== 'Approved' && cs.status !== 'PO Created' ? (
              isPranjal ? (
                <button
                  type="button"
                  onClick={() => setIsApproveModalOpen(true)}
                  className="flex items-center gap-1.5 px-3.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-black transition-all shadow-xs cursor-pointer"
                >
                  <UserCheck className="w-3.5 h-3.5" />
                  <span>Sign &amp; Approve CS (Director)</span>
                </button>
              ) : (
                <span
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 text-amber-300 border border-amber-500/30 rounded-lg text-[11px] font-semibold"
                  title="Director signatory is strictly restricted to Pranjal Agrawal"
                >
                  <ShieldCheck className="w-3 h-3 text-amber-400" />
                  <span>Signatory: Pranjal Agrawal Only</span>
                </span>
              )
            ) : (
              <div className="flex items-center gap-2">
                <span className="flex items-center gap-1 text-xs font-bold text-emerald-400 bg-emerald-950/80 border border-emerald-500/40 px-2.5 py-1 rounded-lg">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Approved by {cs.approvalDetails?.approverName || 'Pranjal Agrawal'}</span>
                </span>
                <button
                  type="button"
                  onClick={handleGenerateSplitPurchaseOrders}
                  className="flex items-center gap-1.5 px-3 py-1 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-black transition-all shadow-xs cursor-pointer"
                >
                  <Zap className="w-3.5 h-3.5 text-amber-300" />
                  <span>{cs.status === 'PO Created' ? 'Re-Generate Split POs' : 'Generate Split POs'}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Vendor Allocation Breakdown Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {cs.vendors.map((v) => {
            const stats = awardedSummary.vendorStats[v.vendorId] || { itemCount: 0, totalAmount: 0, items: [] };
            const isAnyAwarded = stats.itemCount > 0;
            const pctOfTotal = awardedSummary.totalAwardedValue > 0 ? (stats.totalAmount / awardedSummary.totalAwardedValue) * 100 : 0;

            return (
              <div
                key={`alloc-${v.vendorId}`}
                className={`p-3 rounded-xl border transition-all ${
                  isAnyAwarded
                    ? 'bg-slate-850 border-emerald-500/50 shadow-xs'
                    : 'bg-slate-900/50 border-slate-800 opacity-60'
                }`}
              >
                <div className="flex items-center justify-between gap-1 mb-1">
                  <span className="font-extrabold text-xs text-white truncate max-w-[170px]">
                    {v.vendorName}
                  </span>
                  <span
                    className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                      isAnyAwarded
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : 'bg-slate-800 text-slate-400'
                    }`}
                  >
                    {stats.itemCount} / {cs.items.length} Items
                  </span>
                </div>

                <div className="flex items-baseline justify-between">
                  <div className="text-sm font-black font-mono text-emerald-400">
                    ₹{stats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                  </div>
                  <div className="text-[10px] text-slate-400 font-semibold">
                    {pctOfTotal.toFixed(1)}% of Allocation
                  </div>
                </div>

                {isAnyAwarded && (
                  <div className="mt-2 pt-1.5 border-t border-slate-800 text-[10px] text-slate-300 truncate">
                    Items: {stats.items.map((it) => it.itemName).join(', ')}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. TABLE 1: COMPARATIVE STATEMENT SPREADSHEET */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden space-y-2">
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider">
              TABLE 1: PRIMARY MATRIX
            </div>
            <h2 className="text-sm sm:text-base font-extrabold tracking-wide uppercase text-white flex items-center gap-2">
              <span>Main Comparative Statement</span>
              <span className="text-xs font-normal text-slate-300 lowercase font-sans">
                (winning item rates directly highlighted in soft green; no separate L-1 columns)
              </span>
            </h2>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              onClick={handleAutoFillAllL1}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
              title="One-click reset all items to their lowest bidder"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Set All to L-1</span>
            </button>

            <button
              type="button"
              onClick={handleAddItem}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>

            <button
              type="button"
              onClick={handleAddVendor}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Vendor</span>
            </button>
          </div>
        </div>

        {/* Matrix Table */}
        <div className="overflow-x-auto max-h-[70vh] scrollbar-thin">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-900 text-white select-none">
              {/* TIER 1: VENDOR HEADERS */}
              <tr className="border-b border-slate-800">
                <th colSpan={6} className="py-2.5 px-3 bg-slate-950 text-white font-black uppercase tracking-wider border-r border-slate-800">
                  REQUISITION SPECIFICATION &amp; DIGITAL AWARD
                </th>
                {cs.vendors.map((v) => (
                  <th
                    key={`vhdr-${v.vendorId}`}
                    colSpan={3}
                    className="py-2.5 px-3 bg-indigo-950 text-indigo-100 font-extrabold text-center border-r border-slate-800 uppercase tracking-wide whitespace-nowrap text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 px-1">
                      <input
                        type="text"
                        value={v.vendorName}
                        onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'vendorName', e.target.value)}
                        className="bg-transparent text-white font-bold text-center border-b border-transparent hover:border-indigo-400 focus:border-indigo-400 focus:outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleDeleteVendor(v.vendorId)}
                        className="p-1 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                        title="Remove Vendor"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  </th>
                ))}
              </tr>

              {/* TIER 2: VENDOR RATINGS */}
              <tr className="border-b border-slate-800 text-[10px]">
                <th colSpan={6} className="py-1 px-3 bg-slate-900 text-slate-400 font-bold uppercase border-r border-slate-800">
                  COMPANY: BARBRIK PROJECT LTD.
                </th>
                {cs.vendors.map((v) => (
                  <th
                    key={`vrate-${v.vendorId}`}
                    colSpan={3}
                    className="py-1 px-3 bg-slate-850 text-amber-300 font-semibold text-center border-r border-slate-800 whitespace-nowrap"
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Award className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{v.rating}</span>
                    </span>
                  </th>
                ))}
              </tr>

              {/* TIER 3: SUB-COLUMNS (Rate, GST Amount, Amount) */}
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 text-[10px] font-black uppercase tracking-wider">
                <th className="py-2 px-2 w-8 text-center border-r border-slate-200">S.N.</th>
                <th className="py-2 px-3 border-r border-slate-200 min-w-[190px]">ITEM NAME</th>
                <th className="py-2 px-2.5 border-r border-slate-200 min-w-[110px]">BRAND / MAKE</th>
                <th className="py-2 px-2 border-r border-slate-200 w-14 text-center">UNIT</th>
                <th className="py-2 px-2 border-r border-slate-200 w-14 text-center">QTY</th>
                <th className="py-2 px-2.5 border-r-2 border-slate-300 min-w-[155px] bg-indigo-100 text-indigo-950 font-black text-center">
                  <div className="flex items-center justify-center gap-1">
                    <Award className="w-3.5 h-3.5 text-indigo-700" />
                    <span>DIRECTOR'S SELECTION</span>
                  </div>
                  <div className="text-[9px] font-semibold text-indigo-700/80 normal-case">
                    Executive Awarded Vendor
                  </div>
                </th>

                {cs.vendors.map((v) => (
                  <React.Fragment key={`subcols-${v.vendorId}`}>
                    <th className="py-2 px-2 text-center bg-slate-50 text-slate-700 border-r border-slate-200 min-w-[90px]">
                      RATE (₹)
                    </th>
                    <th className="py-2 px-2 text-center bg-slate-50 text-slate-700 border-r border-slate-200 min-w-[90px]">
                      GST AMT (₹)
                    </th>
                    <th className="py-2 px-2.5 text-center bg-slate-100 text-slate-900 border-r-2 border-slate-300 min-w-[105px]">
                      AMOUNT (₹)
                    </th>
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {cs.items.map((item, idx) => {
                const l1 = itemL1Map[item.id];
                const assignedVendorId =
                  (cs.awardedVendorMap && cs.awardedVendorMap[item.id]) ||
                  l1?.l1VendorId ||
                  cs.vendors[0]?.vendorId;
                const isAssignedL1 = l1 && l1.l1Rate > 0 && l1.l1VendorId === assignedVendorId;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/60 transition-colors">
                    {/* S.N. */}
                    <td className="py-2 px-2 text-center border-r border-slate-200 font-mono text-[11px] text-slate-500">
                      {idx + 1}
                    </td>

                    {/* Item Name */}
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <div className="flex items-center justify-between gap-1">
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) => handleUpdateItemMeta(item.id, 'itemName', e.target.value)}
                          className="w-full font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1"
                        />
                        {cs.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="p-1 text-slate-300 hover:text-rose-500 opacity-40 hover:opacity-100 cursor-pointer"
                            title="Delete Item"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </td>

                    {/* Brand / Make */}
                    <td className="py-1.5 px-2 border-r border-slate-200">
                      <input
                        type="text"
                        value={item.brandMake}
                        onChange={(e) => handleUpdateItemMeta(item.id, 'brandMake', e.target.value)}
                        className="w-full text-slate-700 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                      <input
                        type="text"
                        value={item.unit}
                        onChange={(e) => handleUpdateItemMeta(item.id, 'unit', e.target.value.toUpperCase())}
                        className="w-full text-center font-mono text-[11px] text-slate-700 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded"
                      />
                    </td>

                    {/* Qty */}
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-900">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        onChange={(e) => handleUpdateItemMeta(item.id, 'qty', Number(e.target.value))}
                        className="w-full text-center font-mono font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded"
                      />
                    </td>

                    {/* DIRECTOR'S AWARDED VENDOR SELECTOR */}
                    <td className="py-1.5 px-2 border-r-2 border-slate-300 bg-indigo-50/40">
                      <select
                        aria-label={`Award vendor for ${item.itemName}`}
                        value={assignedVendorId}
                        onChange={(e) => handleAwardVendor(item.id, e.target.value)}
                        className={`w-full text-[11px] font-bold py-1 px-1.5 rounded border focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer ${
                          isAssignedL1
                            ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black shadow-2xs'
                            : 'bg-indigo-50 border-indigo-200 text-indigo-950 font-bold'
                        }`}
                      >
                        {cs.vendors.map((v) => {
                          const isVndL1 = l1 && l1.l1Rate > 0 && l1.l1VendorId === v.vendorId;
                          const qRate = v.itemRates[item.id]?.baseRate || 0;
                          return (
                            <option key={`opt-${item.id}-${v.vendorId}`} value={v.vendorId}>
                              {v.vendorName.slice(0, 15)} {isVndL1 ? '★ [L-1]' : `(₹${qRate})`}
                            </option>
                          );
                        })}
                      </select>
                      <div className="mt-1 flex items-center justify-between text-[9px]">
                        {isAssignedL1 ? (
                          <span className="font-extrabold text-emerald-700 flex items-center gap-0.5">
                            <Award className="w-2.5 h-2.5 shrink-0" />
                            <span>Lowest L-1</span>
                          </span>
                        ) : (
                          <span className="font-bold text-indigo-700 flex items-center gap-0.5">
                            <Sparkles className="w-2.5 h-2.5 shrink-0" />
                            <span>Dual Split</span>
                          </span>
                        )}
                        <span className="text-slate-500 font-mono font-bold">
                          ₹{cs.vendors.find((v) => v.vendorId === assignedVendorId)?.itemRates[item.id]?.amount?.toFixed(0) || 0}
                        </span>
                      </div>
                    </td>

                    {/* Vendor Quoted Rate Columns */}
                    {cs.vendors.map((v) => {
                      const q = v.itemRates[item.id] || {
                        baseRate: 0,
                        gstPercent: 18,
                        gstAmount: 0,
                        landedRate: 0,
                        amount: 0,
                        isQuoted: false,
                      };
                      const isL1 = l1 && l1.l1Rate > 0 && l1.l1Rate === q.baseRate && q.isQuoted;
                      const isAwarded = assignedVendorId === v.vendorId;

                      return (
                        <React.Fragment key={`cell-${v.vendorId}-${item.id}`}>
                          {/* RATE */}
                          <td
                            className={`py-1.5 px-2 text-right border-r border-slate-200 font-mono transition-colors ${
                              isAwarded
                                ? 'bg-emerald-100 text-emerald-950 font-black ring-2 ring-inset ring-emerald-500'
                                : isL1
                                ? 'bg-emerald-50 text-emerald-950 font-bold ring-1 ring-inset ring-emerald-300'
                                : 'text-slate-800'
                            }`}
                          >
                            <input
                              type="number"
                              step="0.01"
                              value={q.baseRate || ''}
                              onChange={(e) =>
                                handleUpdateVendorRate(
                                  v.vendorId,
                                  item.id,
                                  Number(e.target.value),
                                  q.gstPercent
                                )
                              }
                              placeholder="0.00"
                              className={`w-full text-right font-mono font-bold bg-transparent border-none focus:outline-none rounded ${
                                isAwarded ? 'text-emerald-950 font-black' : 'text-slate-900'
                              }`}
                            />
                            <div className="mt-1 flex items-center justify-between gap-1 pt-1 border-t border-slate-200/50">
                              {isL1 && (
                                <span className="text-[9px] font-sans font-black uppercase text-emerald-700 flex items-center gap-0.5 tracking-tight">
                                  <Award className="w-2.5 h-2.5 shrink-0" />
                                  <span>L-1</span>
                                </span>
                              )}
                              <button
                                type="button"
                                onClick={() => handleAwardVendor(item.id, v.vendorId)}
                                className={`ml-auto text-[9px] font-sans font-bold px-1.5 py-0.5 rounded cursor-pointer transition-all flex items-center gap-0.5 ${
                                  isAwarded
                                    ? 'bg-emerald-600 text-white shadow-2xs font-black ring-1 ring-emerald-700'
                                    : 'bg-slate-200 hover:bg-indigo-100 text-slate-700 hover:text-indigo-900'
                                }`}
                                title={isAwarded ? 'Currently selected & awarded by Director' : `Click to select & award this item to ${v.vendorName}`}
                              >
                                {isAwarded ? (
                                  <>
                                    <CheckCircle2 className="w-2.5 h-2.5 shrink-0" />
                                    <span>Awarded</span>
                                  </>
                                ) : (
                                  <span>Select Bid</span>
                                )}
                              </button>
                            </div>
                          </td>

                          {/* GST AMOUNT */}
                          <td
                            className={`py-1.5 px-2 text-right border-r border-slate-200 font-mono text-[11px] ${
                              isL1 ? 'bg-emerald-50 text-emerald-900 font-bold' : 'text-slate-600'
                            }`}
                          >
                            <div className="flex items-center justify-end gap-1">
                              <span>₹{q.gstAmount.toFixed(2)}</span>
                              <span className="text-[9px] text-slate-400">({q.gstPercent}%)</span>
                            </div>
                          </td>

                          {/* AMOUNT */}
                          <td
                            className={`py-1.5 px-2.5 text-right border-r-2 border-slate-300 font-mono font-extrabold ${
                              isL1 ? 'bg-emerald-100/90 text-emerald-950 ring-1 ring-inset ring-emerald-300' : 'text-slate-900'
                            }`}
                          >
                            ₹{q.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}

              {/* TOTAL ROW */}
              <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                <td colSpan={6} className="py-2.5 px-4 uppercase tracking-wider text-right border-r-2 border-slate-300">
                  GRAND TOTAL (ALL ITEMS)
                </td>

                {cs.vendors.map((v) => {
                  const vTotal = vendorTotals.find((vt) => vt.vendorId === v.vendorId);
                  const isOverallLowest = singleLowestVendor && singleLowestVendor.vendorId === v.vendorId;

                  return (
                    <React.Fragment key={`tot-${v.vendorId}`}>
                      <td className="py-2.5 px-2 text-right border-r border-slate-200 font-mono text-slate-500">
                        —
                      </td>
                      <td className="py-2.5 px-2 text-right border-r border-slate-200 font-mono text-slate-700 text-[11px]">
                        ₹{vTotal ? vTotal.gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                      </td>
                      <td
                        className={`py-2.5 px-2.5 text-right border-r-2 border-slate-300 font-mono font-black ${
                          isOverallLowest ? 'bg-emerald-200 text-emerald-950 ring-2 ring-emerald-500' : 'text-slate-950'
                        }`}
                      >
                        ₹{vTotal ? vTotal.totalLanded.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}
                        {isOverallLowest && (
                          <span className="text-[9px] font-sans font-black block text-emerald-800 uppercase tracking-widest">
                            Overall L-1
                          </span>
                        )}
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>

              {/* APPROVED BY ROW (Strict Rule - Below Comparative Table) */}
              <tr className="bg-slate-50 border-t-2 border-slate-400">
                <td colSpan={6} className="py-4 px-4 bg-slate-100 border-r-2 border-slate-300">
                  {cs.approvalDetails ? (
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center font-black shadow-xs shrink-0 text-xs">
                        PA
                      </div>
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-black uppercase tracking-wider text-slate-900">
                            DIGITALLY APPROVED &amp; SIGNED
                          </span>
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded font-bold">
                            VERIFIED
                          </span>
                        </div>
                        <div className="text-xs font-bold text-slate-800">
                          {cs.approvalDetails.approverName}{' '}
                          <span className="text-slate-500 font-normal">({cs.approvalDetails.approverDesignation})</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono">
                          Date: {cs.approvalDetails.approvalDate} &bull; Token: {cs.approvalDetails.signatureStamp}
                        </div>
                        {cs.approvalDetails.remarks && (
                          <div className="text-[11px] text-emerald-900 bg-emerald-100/70 py-1 px-2 rounded font-medium mt-1">
                            &ldquo;{cs.approvalDetails.remarks}&rdquo;
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <UserCheck className="w-4 h-4 text-indigo-700" />
                        <div>
                          <div className="text-xs font-black uppercase tracking-wider text-slate-900">
                            DIRECTOR SIGNATORY
                          </div>
                          <div className="text-[10px] text-slate-500">
                            Authorized Executive Director Signature &bull; Barbrik Project Ltd.
                          </div>
                        </div>
                      </div>
                      {isPranjal ? (
                        <button
                          type="button"
                          onClick={() => setIsApproveModalOpen(true)}
                          className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black rounded-lg text-xs cursor-pointer shadow-xs flex items-center gap-1.5"
                        >
                          <UserCheck className="w-3.5 h-3.5" />
                          <span>Sign As Pranjal Agrawal</span>
                        </button>
                      ) : (
                        <div className="flex items-center gap-1.5 px-3 py-1 bg-amber-50 border border-amber-200 rounded-lg text-amber-800 text-[11px] font-semibold">
                          <ShieldCheck className="w-3.5 h-3.5 text-amber-600 shrink-0" />
                          <span>Awaiting Signature by Director Pranjal Agrawal</span>
                        </div>
                      )}
                    </div>
                  )}
                </td>

                {cs.vendors.map((v) => {
                  const stats = awardedSummary.vendorStats[v.vendorId] || { itemCount: 0, totalAmount: 0, items: [] };
                  const isAwarded = stats.itemCount > 0;

                  return (
                    <td
                      key={`appr-${v.vendorId}`}
                      colSpan={3}
                      className={`py-4 px-3 border-r-2 border-slate-300 text-center ${
                        isAwarded ? 'bg-emerald-50/50' : 'bg-white'
                      }`}
                    >
                      <div className="space-y-1.5 py-1">
                        {cs.approvalDetails ? (
                          isAwarded ? (
                            <>
                              <div className="text-[10px] font-black uppercase text-emerald-800 flex items-center justify-center gap-1">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>PO Approved &bull; {stats.itemCount} Items</span>
                              </div>
                              <div className="text-xs font-mono font-bold text-slate-900">
                                ₹{stats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                              <div className="text-[9px] font-mono text-emerald-700 bg-emerald-100/80 py-0.5 px-2 rounded inline-block">
                                Digitally Signed: {cs.approvalDetails.approverName}
                              </div>
                            </>
                          ) : (
                            <>
                              <div className="text-[10px] font-bold text-slate-400 uppercase">
                                Alternate Supplier Retained
                              </div>
                              <div className="text-[10px] text-slate-400 font-mono">
                                0 Items Awarded in this Indent
                              </div>
                            </>
                          )
                        ) : (
                          <>
                            <div className="text-[11px] font-mono text-slate-400 select-none">
                              Sign: ___________________
                            </div>
                            <div className="text-[10px] font-bold text-slate-600 uppercase">
                              {v.vendorName}
                            </div>
                          </>
                        )}
                      </div>
                    </td>
                  );
                })}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 5. TABLE 2: PERCENTAGE VARIANCE MATRIX (% vs. L-1) */}
      {/* Strict rule: NO remarks or competitive spread column! */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-indigo-950 text-white flex items-center justify-between">
          <div>
            <div className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider">
              TABLE 2: SPREAD MATRIX
            </div>
            <h3 className="text-sm font-extrabold uppercase text-white">
              Percentage Variance Matrix (% vs. L-1)
            </h3>
          </div>
          <span className="text-xs text-indigo-300 font-medium">
            Strict layout (strictly without remarks/spread column)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 text-[10px] font-black uppercase tracking-wider border-b border-slate-300">
              <tr>
                <th className="py-2.5 px-3 w-12 text-center border-r border-slate-200">S.N.</th>
                <th className="py-2.5 px-4 border-r border-slate-200">ITEM NAME</th>
                <th className="py-2.5 px-3 text-right border-r-2 border-slate-300 bg-emerald-50 text-emerald-950 font-black">
                  L-1 RATE (₹)
                </th>
                {cs.vendors.map((v) => (
                  <th key={`varhdr-${v.vendorId}`} className="py-2.5 px-3 text-center border-r border-slate-200">
                    {v.vendorName} (% vs L-1)
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cs.items.map((item, idx) => {
                const l1 = itemL1Map[item.id];

                return (
                  <tr key={`varrow-${item.id}`} className="hover:bg-slate-50/60">
                    <td className="py-2 px-3 text-center border-r border-slate-200 font-mono text-slate-500">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-4 border-r border-slate-200 font-bold text-slate-900">
                      {item.itemName}
                    </td>
                    <td className="py-2 px-3 text-right border-r-2 border-slate-300 font-mono font-black text-emerald-900 bg-emerald-50/50">
                      ₹{l1 && l1.l1Rate > 0 ? l1.l1Rate.toFixed(2) : '—'}
                    </td>

                    {cs.vendors.map((v) => {
                      const q = v.itemRates[item.id];
                      let varianceText = 'Not Quoted';
                      let isL1 = false;
                      let isHigh = false;

                      if (q && q.isQuoted && q.baseRate > 0 && l1 && l1.l1Rate > 0) {
                        const variance = ((q.baseRate - l1.l1Rate) / l1.l1Rate) * 100;
                        if (Math.abs(variance) < 0.001) {
                          varianceText = '0.00% (L-1)';
                          isL1 = true;
                        } else {
                          varianceText = `+${variance.toFixed(2)}%`;
                          isHigh = true;
                        }
                      }

                      return (
                        <td
                          key={`varcell-${v.vendorId}-${item.id}`}
                          className={`py-2 px-3 text-center border-r border-slate-200 font-mono font-bold ${
                            isL1
                              ? 'bg-emerald-100 text-emerald-950'
                              : isHigh
                              ? 'text-amber-800 bg-amber-50/40'
                              : 'text-slate-400'
                          }`}
                        >
                          {varianceText}
                        </td>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* 6. TABLE 3: COMMERCIAL TERMS & CONDITIONS & VENDOR EVALUATION */}
      {/* Strict rule: Freight & Delivery Terms: OURS for all vendors in uniform regular font */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white">
          <div className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider">
            TABLE 3: VENDOR EVALUATION
          </div>
          <h3 className="text-sm font-extrabold uppercase text-white">
            Commercial Terms &amp; Conditions &amp; Vendor Evaluation
          </h3>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-slate-800 text-white text-[11px] font-bold uppercase tracking-wider">
              <tr>
                <th className="py-2.5 px-4 w-72 border-r border-slate-700 bg-slate-850">
                  COMMERCIAL PARAMETERS
                </th>
                {cs.vendors.map((v) => (
                  <th key={`termhdr-${v.vendorId}`} className="py-2.5 px-4 border-r border-slate-700">
                    {v.vendorName.toUpperCase()}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-slate-800">
              {/* 1. Company Name */}
              <tr>
                <td className="py-2 px-4 font-bold bg-slate-50 border-r border-slate-200">
                  Company Name
                </td>
                {cs.vendors.map((v) => (
                  <td key={`c1-${v.vendorId}`} className="py-2 px-4 border-r border-slate-200 font-medium">
                    Barbrik Project Ltd.
                  </td>
                ))}
              </tr>

              {/* 2. Vendor Rating */}
              <tr>
                <td className="py-2 px-4 font-bold bg-slate-50 border-r border-slate-200">
                  Vendor Rating &amp; Assessment
                </td>
                {cs.vendors.map((v) => (
                  <td key={`c2-${v.vendorId}`} className="py-1 px-3 border-r border-slate-200">
                    <input
                      type="text"
                      value={v.rating}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'rating', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1"
                    />
                  </td>
                ))}
              </tr>

              {/* 3. Contact Person & Mobile */}
              <tr>
                <td className="py-2 px-4 font-bold bg-slate-50 border-r border-slate-200">
                  Contact Person &amp; Mobile
                </td>
                {cs.vendors.map((v) => (
                  <td key={`c3-${v.vendorId}`} className="py-1 px-3 border-r border-slate-200">
                    <input
                      type="text"
                      value={v.contactPersonMobile}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'contactPersonMobile', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1"
                    />
                  </td>
                ))}
              </tr>

              {/* 4. Store / Office Address */}
              <tr>
                <td className="py-2 px-4 font-bold bg-slate-50 border-r border-slate-200">
                  Store / Office Address
                </td>
                {cs.vendors.map((v) => (
                  <td key={`c4-${v.vendorId}`} className="py-1 px-3 border-r border-slate-200">
                    <input
                      type="text"
                      value={v.storeOfficeAddress}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'storeOfficeAddress', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1"
                    />
                  </td>
                ))}
              </tr>

              {/* 5. Payment Terms */}
              <tr>
                <td className="py-2 px-4 font-bold bg-slate-50 border-r border-slate-200">
                  Payment Terms
                </td>
                {cs.vendors.map((v) => (
                  <td key={`c5-${v.vendorId}`} className="py-1 px-3 border-r border-slate-200">
                    <input
                      type="text"
                      value={v.paymentTerms}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'paymentTerms', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1"
                    />
                  </td>
                ))}
              </tr>

              {/* 6. Warranty Period */}
              <tr>
                <td className="py-2 px-4 font-bold bg-slate-50 border-r border-slate-200">
                  Warranty Period
                </td>
                {cs.vendors.map((v) => (
                  <td key={`c6-${v.vendorId}`} className="py-1 px-3 border-r border-slate-200">
                    <input
                      type="text"
                      value={v.warrantyPeriod}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'warrantyPeriod', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1"
                    />
                  </td>
                ))}
              </tr>

              {/* 7. GST & Tax Terms */}
              <tr>
                <td className="py-2 px-4 font-bold bg-slate-50 border-r border-slate-200">
                  GST &amp; Tax Terms
                </td>
                {cs.vendors.map((v) => (
                  <td key={`c7-${v.vendorId}`} className="py-1 px-3 border-r border-slate-200">
                    <input
                      type="text"
                      value={v.gstTerms}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'gstTerms', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1"
                    />
                  </td>
                ))}
              </tr>

              {/* 8. Freight & Delivery Terms (STRICT RULE: OURS for all vendors in uniform regular font) */}
              <tr>
                <td className="py-2 px-4 font-bold bg-slate-50 border-r border-slate-200">
                  Freight &amp; Delivery Terms
                </td>
                {cs.vendors.map((v) => (
                  <td key={`c8-${v.vendorId}`} className="py-2 px-4 border-r border-slate-200 font-normal text-slate-700">
                    OURS (Barbrik Project Ltd.)
                  </td>
                ))}
              </tr>

              {/* 9. Quotation Date & Validity */}
              <tr>
                <td className="py-2 px-4 font-bold bg-slate-50 border-r border-slate-200">
                  Quotation Date &amp; Validity
                </td>
                {cs.vendors.map((v) => (
                  <td key={`c9-${v.vendorId}`} className="py-1 px-3 border-r border-slate-200">
                    <input
                      type="text"
                      value={v.quotationDateValidity}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'quotationDateValidity', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1"
                    />
                  </td>
                ))}
              </tr>

              {/* 10. Primary Product Focus */}
              <tr>
                <td className="py-2 px-4 font-bold bg-slate-50 border-r border-slate-200">
                  Primary Product Focus
                </td>
                {cs.vendors.map((v) => (
                  <td key={`c10-${v.vendorId}`} className="py-1 px-3 border-r border-slate-200">
                    <input
                      type="text"
                      value={v.primaryProductFocus}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'primaryProductFocus', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. TABLE 4: PROCUREMENT RECOMMENDATIONS & SAVINGS ANALYSIS */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white">
          <div className="text-[10px] font-mono text-indigo-300 font-bold uppercase tracking-wider">
            TABLE 4: EXECUTIVE ACTION PLAN
          </div>
          <h3 className="text-sm font-extrabold uppercase text-white">
            Procurement Recommendations &amp; Savings Analysis
          </h3>
        </div>

        <div className="p-5 space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Direct L-1 Single PO */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <span>Single Lowest Bidder</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {singleLowestVendor ? (
                  <>
                    <strong className="text-slate-900">{singleLowestVendor.vendorName}</strong> offers the lowest single
                    package quotation with total landed cost of{' '}
                    <strong className="text-emerald-800">
                      ₹{singleLowestVendor.totalLanded.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                    . Suitable if placing split orders incurs administrative or logistical overhead.
                  </>
                ) : (
                  'No valid quotes available to determine single lowest bidder.'
                )}
              </p>
            </div>

            {/* Split PO Strategy */}
            <div className="p-4 rounded-xl bg-indigo-50/60 border border-indigo-200 space-y-2">
              <div className="text-xs font-black uppercase text-indigo-900 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>Split PO Optimization</span>
              </div>
              <p className="text-xs text-slate-700 leading-relaxed">
                {splitPoSavings > 0 ? (
                  <>
                    Awarding item-wise L-1 items directly achieves an optimized cost of{' '}
                    <strong className="text-indigo-950 font-bold">
                      ₹{splitPoOptimizedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </strong>
                    , delivering net cash savings of{' '}
                    <strong className="text-emerald-700 font-bold">
                      ₹{splitPoSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })} ({savingsPercent.toFixed(2)}%)
                    </strong>{' '}
                    to Barbrik Project Ltd.
                  </>
                ) : (
                  'Single supplier PO is already optimal. No further financial gain achieved by splitting items.'
                )}
              </p>
            </div>

            {/* Logistics & Delivery */}
            <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="text-xs font-black uppercase text-slate-800 flex items-center gap-1.5">
                <Building2 className="w-4 h-4 text-indigo-600" />
                <span>Barbrik Logistics Protocol</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Freight &amp; delivery terms are strictly designated as{' '}
                <strong className="text-slate-900 font-semibold">OURS</strong> for all suppliers. Transport dispatch
                shall be organized through Barbrik fleet vehicles from regional transit stores.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* MODAL: PASTE RAW QUOTATION TEXT */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <ClipboardPaste className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">
                  Paste Vendor Quotes or WhatsApp Messages
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Paste quotations received via WhatsApp, email, or text. The smart parser automatically extracts Indent No,
              Site, items, quantities, brands, and vendor rates for Barbrik Project Ltd.
            </p>

            <textarea
              rows={9}
              value={rawQuoteInput}
              onChange={(e) => setRawQuoteInput(e.target.value)}
              placeholder={`Example:\nSITE: BIJETALA\nINDENT NO: 466\nFOR: HM LOADER & DG SET\n\nVENDOR: M/s Shanti Earthmovers\n1. GREASE NIPPLE 8NO (HINO) - 10 NOS @ 42/- GST 18%\n2. OIL FILTER LF-3959 - 2 NOS @ 850/- GST 18%\n\nVENDOR: M/s Chhattisgarh Diesel\n1. GREASE NIPPLE 8NO - 10 NOS @ 46/- GST 18%\n2. OIL FILTER LF-3959 - 2 NOS @ 890/- GST 18%`}
              className="w-full p-3 font-mono text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyParsedText}
                className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm cursor-pointer"
              >
                Extract &amp; Populate CS Sheet
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: IMPORT FROM PURCHASE INDENT */}
      {isImportIndentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <FolderOpen className="w-5 h-5 text-indigo-600" />
                <h3 className="text-base font-black text-slate-900">
                  Select Purchase Indent to Compare Quotes
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportIndentOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-500">
              Choose an active Purchase Indent requisition to populate Site, Indent No, and Material Items:
            </p>

            <div className="max-h-72 overflow-y-auto space-y-2">
              {purchaseFlows.map((flow) => (
                <div
                  key={flow.id}
                  onClick={() => handleImportFromFlow(flow)}
                  className="p-3 rounded-xl border border-slate-200 hover:border-indigo-500 hover:bg-indigo-50/40 cursor-pointer transition-all flex items-center justify-between"
                >
                  <div className="space-y-0.5">
                    <div className="text-xs font-black text-slate-900 flex items-center gap-2">
                      <span>IND: {flow.indentNo || flow.requisitionNumber || flow.flowId}</span>
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 bg-slate-100 text-slate-600 rounded">
                        {flow.siteName}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-600 truncate max-w-xs">
                      {flow.remarks || flow.machineName || flow.vendorName || 'Indent Requisition'}
                    </div>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 flex items-center gap-1">
                    <span>Select</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsImportIndentOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: DIGITAL APPROVAL & SIGNATURE (PRANJAL AGRAWAL) */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs">
                  PA
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Executive Digital Authorization</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                      BARBRIK APPROVED
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Barbrik Project Ltd. &bull; Comparative Statement Sign-Off
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Requisition Context */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Site</span>
                <span className="font-extrabold text-slate-900">{cs.site || 'BIJETALA'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Indent No</span>
                <span className="font-extrabold text-slate-900 font-mono">{cs.indentNo || 'IND-466'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Scope</span>
                <span className="font-extrabold text-slate-900">{cs.items.length} Items</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-bold block">Award Value</span>
                <span className="font-extrabold text-emerald-700 font-mono">
                  ₹{awardedSummary.totalAwardedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                </span>
              </div>
            </div>

            {/* Split Awarded Summary */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-700 flex items-center justify-between">
                <span>Award Allocation Summary Across Vendors:</span>
                <span className="text-[11px] font-normal text-slate-500 font-sans lowercase">
                  ({awardedSummary.vendorsWithAwards} suppliers allocated)
                </span>
              </label>
              <div className="max-h-36 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
                {cs.vendors.map((v) => {
                  const stats = awardedSummary.vendorStats[v.vendorId] || { itemCount: 0, totalAmount: 0, items: [] };
                  if (stats.itemCount === 0) return null;

                  return (
                    <div key={`m-alloc-${v.vendorId}`} className="p-2.5 flex items-center justify-between text-xs bg-white">
                      <div>
                        <span className="font-extrabold text-slate-900">{v.vendorName}</span>
                        <div className="text-[10px] text-slate-500 truncate max-w-sm">
                          {stats.itemCount} Items: {stats.items.map((it) => it.itemName).join(', ')}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-mono font-black text-emerald-700">
                          ₹{stats.totalAmount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </div>
                        <div className="text-[9px] text-slate-400 font-semibold">
                          Delivery: OURS
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Item-Wise Director Selection Review */}
            <div className="space-y-1.5">
              <label className="text-xs font-black uppercase text-slate-700 flex items-center justify-between">
                <span>Item-Wise Director Selection &amp; Award:</span>
                <span className="text-[11px] font-normal text-slate-500 lowercase">
                  ({cs.items.length} items reviewed)
                </span>
              </label>
              <div className="max-h-40 overflow-y-auto divide-y divide-slate-100 rounded-xl border border-slate-200">
                {cs.items.map((it) => {
                  const l1 = analytics.itemL1Map[it.id];
                  const assignedId = (cs.awardedVendorMap && cs.awardedVendorMap[it.id]) || l1?.l1VendorId || cs.vendors[0]?.vendorId;
                  const isL1 = l1 && l1.l1Rate > 0 && l1.l1VendorId === assignedId;

                  return (
                    <div key={`m-it-${it.id}`} className="p-2 flex items-center justify-between gap-2 text-xs bg-white hover:bg-slate-50">
                      <div className="min-w-0 flex-1">
                        <span className="font-bold text-slate-900 truncate block">{it.itemName}</span>
                        <span className="text-[10px] text-slate-400 font-mono">Qty: {it.qty} {it.unit}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          aria-label={`Award vendor for ${it.itemName}`}
                          value={assignedId}
                          onChange={(e) => handleAwardVendor(it.id, e.target.value)}
                          className={`text-[11px] font-bold py-1 px-2 rounded border focus:outline-none cursor-pointer ${
                            isL1 ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black' : 'bg-indigo-50 border-indigo-200 text-indigo-950'
                          }`}
                        >
                          {cs.vendors.map((v) => (
                            <option key={`m-opt-${it.id}-${v.vendorId}`} value={v.vendorId}>
                              {v.vendorName.slice(0, 15)} {l1?.l1VendorId === v.vendorId ? '★ [L-1]' : ''}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Official Signatory Display (Strictly Pranjal Agrawal Only) */}
            <div className="p-3 bg-emerald-50/60 rounded-xl border border-emerald-200 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0" />
                  <span className="text-xs font-black text-emerald-950 uppercase tracking-wide">
                    Exclusive Authorized Signatory
                  </span>
                </div>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-200 text-emerald-900 rounded">
                  OFFICIAL DIRECTOR SEAL
                </span>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Signatory Name</label>
                  <div className="px-3 py-1.5 text-xs font-black text-slate-900 bg-white border border-emerald-300 rounded-lg flex items-center justify-between">
                    <span>Pranjal Agrawal</span>
                    <span className="text-[10px] font-mono font-semibold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">USR-013</span>
                  </div>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase block">Executive Designation</label>
                  <div className="px-3 py-1.5 text-xs font-black text-slate-900 bg-white border border-emerald-300 rounded-lg">
                    Finance Approver / Director
                  </div>
                </div>
              </div>
            </div>

            {/* Remarks */}
            <div className="space-y-1">
              <label className="text-[11px] font-bold text-slate-600 uppercase">Approval Remarks / Commercial Note</label>
              <textarea
                rows={2}
                value={approvalRemarks}
                onChange={(e) => setApprovalRemarks(e.target.value)}
                placeholder="e.g. Split PO approved to maintain vendor relationship and site machinery uptime. Freight OURS."
                className="w-full p-2.5 text-xs bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>

            {/* Digital Stamp Disclaimer */}
            <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-[11px] text-emerald-950 flex items-start gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
              <div>
                <strong>Paperless Corporate Seal:</strong> Authorizing this CS sheet will permanently affix a digital signature stamp in the name of Director Pranjal Agrawal with timestamp and verification hash.
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
              >
                Cancel
              </button>
              {isPranjal ? (
                <button
                  type="button"
                  onClick={handleDigitalSignAndApprove}
                  className="px-5 py-2 text-xs font-black bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg shadow-md cursor-pointer flex items-center gap-1.5"
                >
                  <UserCheck className="w-4 h-4" />
                  <span>Authorize &amp; Digitally Sign CS</span>
                </button>
              ) : (
                <div className="px-4 py-2 text-xs font-bold bg-slate-200 text-slate-500 rounded-lg flex items-center gap-1.5 cursor-not-allowed">
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                  <span>Signatory Restricted to Pranjal Agrawal</span>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE CURRENT CS */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-60 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4 animate-in fade-in duration-150">
            <div className="flex items-start gap-3">
              <div className="p-3 bg-rose-100 text-rose-700 rounded-xl shrink-0">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-black text-slate-900">Delete Comparative Statement?</h3>
                <p className="text-xs text-slate-500 mt-1">
                  Are you sure you want to permanently delete this Comparative Statement ({cs.indentNo || cs.site})? This action cannot be undone.
                </p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1.5 font-medium">
              <div className="flex justify-between">
                <span className="text-slate-500">Site:</span>
                <span className="font-bold text-slate-900">{cs.site}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Indent No:</span>
                <span className="font-mono font-bold text-slate-900">{cs.indentNo || 'N/A'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Purpose / Scope:</span>
                <span className="font-bold text-slate-800 truncate max-w-[200px]">{cs.forPurpose || 'General Procurement'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Scope:</span>
                <span className="font-bold text-slate-800">{cs.items.length} items &bull; {cs.vendors.length} vendors</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteCurrentCs}
                className="px-4 py-2 text-xs font-black bg-rose-600 hover:bg-rose-500 text-white rounded-lg shadow-sm cursor-pointer transition-colors flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Yes, Delete Statement</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: GENERATED SPLIT PURCHASE ORDERS */}
      {isSplitPoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-slate-200 space-y-5 animate-in fade-in duration-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs">
                  <Zap className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
                    <span>Split Purchase Orders Created</span>
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded">
                      FMS PIPELINE ACTIVE
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Discrete Purchase Orders dispatched to the FMS workflow system for execution
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSplitPoModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <p className="text-xs text-slate-600">
              The comparative statement for <strong>Indent {cs.indentNo || '466'}</strong> has been split into{' '}
              <strong>{createdSplitPos.length} vendor purchase orders</strong>. Each order has been pre-configured with
              the approved item rates, site delivery, and <strong>Freight &amp; Delivery: OURS</strong>:
            </p>

            <div className="space-y-3 max-h-64 overflow-y-auto">
              {createdSplitPos.map((flow, idx) => (
                <div
                  key={flow.id}
                  className="p-3.5 rounded-xl border border-indigo-200 bg-indigo-50/40 space-y-1.5"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-black font-mono px-2 py-0.5 bg-indigo-900 text-white rounded">
                        {flow.poNumber}
                      </span>
                      <span className="text-xs font-bold text-slate-900">{flow.vendorName}</span>
                    </div>
                    <span className="text-xs font-mono font-black text-emerald-800">
                      ₹{flow.poAmount?.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </span>
                  </div>

                  <p className="text-[11px] text-slate-600 leading-relaxed truncate">
                    {flow.remarks}
                  </p>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-indigo-100">
                    <span>Site: <strong className="text-slate-700">{flow.siteName}</strong></span>
                    <span>Stage: <strong className="text-indigo-700">PO Issued &bull; Awaiting Dispatch</strong></span>
                    <span>Freight: <strong className="text-slate-800">OURS</strong></span>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <span className="text-xs text-slate-500">
                Authorized by <strong className="text-slate-800">{cs.approvalDetails?.approverName || 'Pranjal Agrawal'}</strong>
              </span>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsSplitPoModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer"
                >
                  Close
                </button>
                {onNavigateTab && (
                  <button
                    type="button"
                    onClick={() => {
                      setIsSplitPoModalOpen(false);
                      onNavigateTab('fms');
                    }}
                    className="px-5 py-2 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg shadow-sm flex items-center gap-1.5 cursor-pointer"
                  >
                    <span>View in Purchase FMS Pipeline</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
        </>
      )}
    </div>
  );
};
