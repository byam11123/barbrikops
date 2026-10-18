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
  Upload,
  Image as ImageIcon,
  Loader2,
  Bot,
  Check,
  Camera,
} from 'lucide-react';
import { ComparativeStatement, CsItem, CsVendorQuote, UserProfile, FmsInstance, CsVendorItemRate } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { 
  downloadComparativeStatementExcel, 
  calculateCsL1Analytics 
} from '../../services/comparativeExcelService';
import { downloadComparativeStatementPdf } from '../../services/comparativePdfService';
import { ComparativeDirectoryView } from './ComparativeDirectoryView';
import { parseRawQuoteText, extractQuotationWithAI, ExtractedVendorQuoteData } from '../../utils/quoteTextParser';

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

  // AI WhatsApp & Photo Quote Extraction States
  const [importTab, setImportTab] = useState<'image' | 'text'>('image');
  const [quoteImageBase64, setQuoteImageBase64] = useState<string | null>(null);
  const [quoteMimeType, setQuoteMimeType] = useState<string | null>(null);
  const [isExtractingAi, setIsExtractingAi] = useState(false);
  const [extractedData, setExtractedData] = useState<ExtractedVendorQuoteData | null>(null);
  const [extractedVendorName, setExtractedVendorName] = useState('');
  const [extractedGstTerms, setExtractedGstTerms] = useState('');
  const [extractedPaymentTerms, setExtractedPaymentTerms] = useState('');
  const [extractedItemsReview, setExtractedItemsReview] = useState<
    Array<{
      id: string;
      itemRawName: string;
      brandMake: string;
      unit: string;
      qty: number;
      baseRate: number;
      gstPercent: number;
      matchedItemId: string | null;
      confidenceScore: number;
      included: boolean;
    }>
  >([]);

  // Check if Comparative Statement is digitally signed and locked
  const isRecordLocked = useMemo(() => {
    return (
      cs.status === 'Approved' ||
      cs.status === 'PO Created' ||
      Boolean(cs.approvalDetails?.signatureStamp) ||
      Boolean(cs.approvedBy)
    );
  }, [cs.status, cs.approvalDetails?.signatureStamp, cs.approvedBy]);

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
    if (isRecordLocked) return;
    setCs((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  // Add Item
  const handleAddItem = () => {
    if (isRecordLocked) {
      setSaveSuccessMsg('Record is digitally signed & locked. No edits allowed.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }
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
    if (isRecordLocked) {
      setSaveSuccessMsg('Error: Record is digitally signed & locked. No edits allowed.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }
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
    if (isRecordLocked) return;
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
    if (isRecordLocked) {
      setSaveSuccessMsg('Error: Record is digitally signed & locked. No edits allowed.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }
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
    if (isRecordLocked) {
      setSaveSuccessMsg('Error: Record is digitally signed & locked. No edits allowed.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }
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
    if (isRecordLocked) return;
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
    if (isRecordLocked) return;
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
    if (isRecordLocked) {
      setSaveSuccessMsg('Record is digitally signed & locked (Read-Only).');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }
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
    if (isRecordLocked) {
      setSaveSuccessMsg('Error: Record is digitally signed & locked.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }
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

  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setQuoteMimeType(file.type || 'image/png');
    const reader = new FileReader();
    reader.onload = (event) => {
      setQuoteImageBase64(event.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleRunAiExtraction = async () => {
    setIsExtractingAi(true);
    try {
      const res = await extractQuotationWithAI({
        rawText: importTab === 'text' ? rawQuoteInput : undefined,
        imageBase64: importTab === 'image' ? (quoteImageBase64 || undefined) : undefined,
        mimeType: importTab === 'image' ? (quoteMimeType || undefined) : undefined,
        existingItems: cs.items,
      });

      setExtractedData(res);
      setExtractedVendorName(res.vendorName || 'WhatsApp Vendor');
      setExtractedGstTerms(res.gstTerms || '18% GST Applicable');
      setExtractedPaymentTerms(res.paymentTerms || '30 Days Credit');

      const reviewList = res.extractedItems.map((item, idx) => ({
        id: `rev-${idx}-${Date.now()}`,
        itemRawName: item.itemRawName,
        brandMake: item.brandMake || '—',
        unit: item.unit || 'NOS',
        qty: item.qty || 1,
        baseRate: item.baseRate || 0,
        gstPercent: item.gstPercent !== undefined ? item.gstPercent : 18,
        matchedItemId: item.matchedItemId,
        confidenceScore: item.confidenceScore || 0,
        included: true,
      }));

      setExtractedItemsReview(reviewList);
    } catch (err) {
      console.error('AI Extraction Error:', err);
    } finally {
      setIsExtractingAi(false);
    }
  };

  const handleApplyImportedVendorToCs = () => {
    if (isRecordLocked) {
      setSaveSuccessMsg('Error: Record is digitally signed & locked.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }
    if (!extractedVendorName.trim()) return;

    const activeVendorName = extractedVendorName.trim();
    let targetVendorId = cs.vendors.find(
      (v) => v.vendorName.toLowerCase() === activeVendorName.toLowerCase()
    )?.vendorId;

    if (!targetVendorId) {
      targetVendorId = `vnd-${Date.now()}`;
    }

    setCs((prev) => {
      const existingVendor = prev.vendors.find((v) => v.vendorId === targetVendorId);
      const updatedRates: Record<string, CsVendorItemRate> = existingVendor
        ? { ...existingVendor.itemRates }
        : {};

      prev.items.forEach((it) => {
        if (!updatedRates[it.id]) {
          updatedRates[it.id] = {
            baseRate: 0,
            gstPercent: 18,
            gstAmount: 0,
            landedRate: 0,
            amount: 0,
            isQuoted: false,
          };
        }
      });

      extractedItemsReview.forEach((rev) => {
        if (rev.included && rev.matchedItemId) {
          const targetCsItem = prev.items.find((it) => it.id === rev.matchedItemId);
          const qty = targetCsItem ? targetCsItem.qty : rev.qty;
          const baseRate = Number(rev.baseRate) || 0;
          const gstPercent = Number(rev.gstPercent) || 0;
          const gstAmount = (baseRate * gstPercent) / 100;
          const landedRate = baseRate + gstAmount;
          const amount = landedRate * qty;

          updatedRates[rev.matchedItemId] = {
            baseRate,
            gstPercent,
            gstAmount,
            landedRate,
            amount,
            isQuoted: baseRate > 0,
          };
        }
      });

      const updatedVendor: CsVendorQuote = {
        vendorId: targetVendorId!,
        vendorName: activeVendorName,
        rating: existingVendor?.rating || '4.5 / 5.0 (WhatsApp Extracted)',
        contactPersonMobile: existingVendor?.contactPersonMobile || 'Mo: +91-9876543210',
        storeOfficeAddress: existingVendor?.storeOfficeAddress || 'Local Market, CG',
        paymentTerms: extractedPaymentTerms || '30 Days Credit',
        warrantyPeriod: existingVendor?.warrantyPeriod || '01 Year Comprehensive Warranty',
        gstTerms: extractedGstTerms || '18% GST Applicable',
        freightDeliveryTerms: 'OURS (Barbrik Project Ltd.)',
        quotationDateValidity: `${new Date().toLocaleDateString('en-GB')} | 30 Days Validity`,
        primaryProductFocus: existingVendor?.primaryProductFocus || 'Heavy Equipment Spares',
        itemRates: updatedRates,
      };

      const vendorExists = prev.vendors.some((v) => v.vendorId === targetVendorId);
      const updatedVendors = vendorExists
        ? prev.vendors.map((v) => (v.vendorId === targetVendorId ? updatedVendor : v))
        : [...prev.vendors, updatedVendor];

      const updatedCs = {
        ...prev,
        vendors: updatedVendors,
        updatedAt: new Date().toLocaleString('en-GB'),
      };

      storageAdapter.saveComparativeStatement(updatedCs);
      return updatedCs;
    });

    setIsPasteModalOpen(false);
    setExtractedData(null);
    setQuoteImageBase64(null);
    setRawQuoteInput('');
    setSaveSuccessMsg(`Quotation auto-filled for vendor "${activeVendorName}"!`);
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Import from Purchase FMS Flow
  const handleImportFromFlow = (flow: FmsInstance) => {
    if (isRecordLocked) {
      setSaveSuccessMsg('Error: Record is digitally signed & locked.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }
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
    if (isRecordLocked) {
      setSaveSuccessMsg('Record is digitally signed & locked. Award selection cannot be altered.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }
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
    if (isRecordLocked) {
      setSaveSuccessMsg('Record is digitally signed & locked. Award selection cannot be altered.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }
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
    if (isRecordLocked) {
      setSaveSuccessMsg('Error: Digitally signed and approved records cannot be deleted.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      setIsDeleteModalOpen(false);
      return;
    }
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

    // Auto-generate Split POs and advance parent FMS flow
    let splitPosCount = 0;
    try {
      const splitResult = storageAdapter.createSplitPurchaseOrdersFromCs(saved, currentUser);
      splitPosCount = splitResult.createdFlows.length;
      setCreatedSplitPos(splitResult.createdFlows);

      // Advance parent FMS flow
      const allFlows = storageAdapter.getFmsFlows();
      const parentFlowIdx = allFlows.findIndex(
        (f) => (f.indentNo && f.indentNo === cs.indentNo) || f.comparativeSheetId === cs.id || f.linkedModuleRecord?.recordId === cs.id
      );

      if (parentFlowIdx >= 0) {
        const parent = allFlows[parentFlowIdx];
        const updatedStages = [...parent.stages];
        const l1StageIdx = updatedStages.findIndex(
          (s) => s.stageId === 'STG-08' || s.stageName.includes('L1') || s.stageName.includes('DIRECTOR')
        );

        const targetStageIdx = l1StageIdx >= 0 ? l1StageIdx : parent.currentStageIndex;
        if (updatedStages[targetStageIdx]) {
          updatedStages[targetStageIdx].status = 'Done';
          updatedStages[targetStageIdx].actualDateTime = timestamp;
          updatedStages[targetStageIdx].notes = `Approved by Director Pranjal Agrawal in CS #${cs.id}. Item-wise split POs generated: ${splitResult.createdFlows.map(f => f.poNumber).join(', ')}`;
        }

        const nextStageIdx = Math.min(targetStageIdx + 1, updatedStages.length - 1);
        if (updatedStages[nextStageIdx] && updatedStages[nextStageIdx].status !== 'Done') {
          updatedStages[nextStageIdx].status = 'In Progress';
        }

        const updatedParent: FmsInstance = {
          ...parent,
          currentStageIndex: nextStageIdx,
          currentStageId: updatedStages[nextStageIdx]?.stageId || 'STG-09',
          updatedAt: timestamp,
          stages: updatedStages,
          instanceDataPool: {
            ...(parent.instanceDataPool || {}),
            csId: saved.id,
            awardedVendorMap: awardedMap,
            generatedPoIds: splitResult.createdFlows.map((f) => f.poNumber),
          },
        };

        allFlows[parentFlowIdx] = updatedParent;
        storageAdapter.saveFmsFlows(allFlows);
      }
    } catch (err) {
      console.warn('Split PO generation or FMS advancement note:', err);
    }

    setStatements(storageAdapter.getComparativeStatements());
    setCs(saved);
    setIsApproveModalOpen(false);
    setSaveSuccessMsg(`Comparative Statement digitally signed by Director Pranjal Agrawal! Generated ${splitPosCount} split POs and advanced parent FMS.`);
    setTimeout(() => setSaveSuccessMsg(null), 4000);
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
                  disabled={isRecordLocked}
                  className="flex items-center gap-1.5 px-3 py-2 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-100 border border-indigo-400/40 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  title={isRecordLocked ? "Record is digitally signed & locked." : "Upload vendor quote photo/PDF or paste WhatsApp chat to extract items & auto-fill CS"}
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  <span>AI WhatsApp &amp; Image Import</span>
                </button>

                {purchaseFlows.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setIsImportIndentOpen(true)}
                    disabled={isRecordLocked}
                    className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <FolderOpen className="w-3.5 h-3.5 text-blue-400" />
                    <span>Load From Indent</span>
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleSaveSheet}
                  disabled={isRecordLocked}
                  className="flex items-center gap-1.5 px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>{isRecordLocked ? 'Saved (Locked)' : 'Save CS'}</span>
                </button>

                {/* DELETE CS ACTION */}
                <button
                  type="button"
                  onClick={() => setIsDeleteModalOpen(true)}
                  disabled={isRecordLocked}
                  className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-rose-950 text-rose-300 hover:text-white border border-rose-500/30 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  title={isRecordLocked ? "Digitally signed records cannot be deleted" : "Delete this Comparative Statement"}
                >
                  <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                  <span>Delete CS</span>
                </button>

                {/* DIGITAL APPROVAL ACTION - STRICTLY PRANJAL AGRAWAL */}
                {!isRecordLocked ? (
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
                    className="flex items-center gap-1.5 px-3 py-2 bg-emerald-900/80 text-emerald-200 border border-emerald-500/60 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-300" />
                    <span>Digitally Signed: {cs.approvalDetails?.approverName || 'Pranjal Agrawal'}</span>
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

      {/* RECORD LOCKED NOTICE BANNER */}
      {isRecordLocked && (
        <div className="bg-gradient-to-r from-slate-900 via-amber-950 to-slate-900 border-2 border-amber-500/50 text-amber-100 p-4 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/20 text-amber-400 rounded-xl border border-amber-500/40 shrink-0">
              <Lock className="w-6 h-6" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs font-black uppercase tracking-wider text-amber-300">
                  RECORD DIGITALLY LOCKED &bull; READ ONLY
                </span>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-500/30 text-emerald-300 border border-emerald-400/40 rounded flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>DIGITALLY SIGNED BY DIRECTOR PRANJAL AGRAWAL</span>
                </span>
              </div>
              <p className="text-xs text-amber-100/90 font-medium">
                This Comparative Statement is officially signed and approved. All item rates, GST calculations, and vendor selection checkboxes are locked to prevent tampering.
              </p>
            </div>
          </div>
          {cs.approvalDetails && (
            <div className="text-right shrink-0 text-xs font-mono text-amber-200/90 bg-amber-900/60 px-3.5 py-2 rounded-xl border border-amber-500/30 shadow-2xs space-y-0.5">
              <div>Approved: {cs.approvalDetails.approvalDate}</div>
              <div className="text-[10px] text-amber-400 font-bold">Token: {cs.approvalDetails.signatureStamp}</div>
            </div>
          )}
        </div>
      )}

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
                  {s.site} — IND: {s.indentNo || 'N/A'} ({s.forPurpose?.slice(0, 30) || 'General'}) [{s.statementDate}] {s.status === 'Approved' ? '🔒' : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <span className="text-slate-500">
              Status:{' '}
              <strong className={cs.status === 'Approved' ? 'text-emerald-700 font-extrabold' : 'text-amber-700 font-extrabold'}>
                {cs.status} {isRecordLocked ? '(Locked)' : ''}
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
              disabled={isRecordLocked}
              onChange={(e) => handleUpdateHeader('site', e.target.value)}
              placeholder="e.g. BIJETALA, SILADEHI"
              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 uppercase disabled:bg-slate-100 disabled:text-slate-600"
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
              disabled={isRecordLocked}
              onChange={(e) => handleUpdateHeader('indentNo', e.target.value)}
              placeholder="e.g. 466, 778"
              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:bg-slate-100 disabled:text-slate-600"
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
              disabled={isRecordLocked}
              onChange={(e) => handleUpdateHeader('indentDate', e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:bg-slate-100 disabled:text-slate-600"
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
              disabled={isRecordLocked}
              onChange={(e) => handleUpdateHeader('forPurpose', e.target.value)}
              placeholder="e.g. HM LOADER & DG-82.5KVA"
              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-100 disabled:text-slate-600"
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
              disabled={isRecordLocked}
              onChange={(e) => handleUpdateHeader('statementDate', e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full px-3 py-1.5 text-xs font-bold text-slate-900 bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 font-mono disabled:bg-slate-100 disabled:text-slate-600"
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
              disabled={isRecordLocked}
              className="flex items-center gap-1 px-2.5 py-1.5 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title={isRecordLocked ? "Record is digitally signed & locked" : "One-click reset all items to their lowest bidder"}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-300" />
              <span>Set All to L-1</span>
            </button>

            <button
              type="button"
              onClick={handleAddItem}
              disabled={isRecordLocked}
              className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Item</span>
            </button>

            <button
              type="button"
              onClick={handleAddVendor}
              disabled={isRecordLocked}
              className="flex items-center gap-1 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-lg text-xs font-bold transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                <th colSpan={5} className="py-2.5 px-3 bg-slate-950 text-white font-black uppercase tracking-wider border-r border-slate-800">
                  REQUISITION SPECIFICATION &amp; DIGITAL AWARD
                </th>
                {cs.vendors.map((v) => (
                  <th
                    key={`vhdr-${v.vendorId}`}
                    colSpan={4}
                    className="py-2.5 px-3 bg-indigo-950 text-indigo-100 font-extrabold text-center border-r border-slate-800 uppercase tracking-wide whitespace-nowrap text-xs"
                  >
                    <div className="flex items-center justify-between gap-2 px-1">
                      <input
                        type="text"
                        value={v.vendorName}
                        disabled={isRecordLocked}
                        onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'vendorName', e.target.value)}
                        className="bg-transparent text-white font-bold text-center border-b border-transparent hover:border-indigo-400 focus:border-indigo-400 focus:outline-none disabled:opacity-80"
                      />
                      {!isRecordLocked && (
                        <button
                          type="button"
                          onClick={() => handleDeleteVendor(v.vendorId)}
                          className="p-1 text-slate-400 hover:text-rose-400 rounded cursor-pointer"
                          title="Remove Vendor"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>

              {/* TIER 2: VENDOR RATINGS */}
              <tr className="border-b border-slate-800 text-[10px]">
                <th colSpan={5} className="py-1 px-3 bg-slate-900 text-slate-400 font-bold uppercase border-r border-slate-800">
                  COMPANY: BARBRIK PROJECT LTD.
                </th>
                {cs.vendors.map((v) => (
                  <th
                    key={`vrate-${v.vendorId}`}
                    colSpan={4}
                    className="py-1 px-3 bg-slate-850 text-amber-300 font-semibold text-center border-r border-slate-800 whitespace-nowrap"
                  >
                    <span className="flex items-center justify-center gap-1">
                      <Award className="w-3 h-3 text-amber-400 shrink-0" />
                      <span>{v.rating}</span>
                    </span>
                  </th>
                ))}
              </tr>

              {/* TIER 3: SUB-COLUMNS (Rate, GST Amount, Amount, Director Select) */}
              <tr className="bg-slate-100 text-slate-700 border-b border-slate-300 text-[10px] font-black uppercase tracking-wider">
                <th className="py-2 px-2 w-8 text-center border-r border-slate-200">S.N.</th>
                <th className="py-2 px-3 border-r border-slate-200 min-w-[190px]">ITEM NAME</th>
                <th className="py-2 px-2.5 border-r border-slate-200 min-w-[110px]">BRAND / MAKE</th>
                <th className="py-2 px-2 border-r border-slate-200 w-14 text-center">UNIT</th>
                <th className="py-2 px-2 border-r-2 border-slate-300 w-14 text-center">QTY</th>

                {cs.vendors.map((v) => (
                  <React.Fragment key={`subcols-${v.vendorId}`}>
                    <th className="py-2 px-2 text-center bg-slate-50 text-slate-700 border-r border-slate-200 min-w-[90px]">
                      RATE (₹)
                    </th>
                    <th className="py-2 px-2 text-center bg-slate-50 text-slate-700 border-r border-slate-200 min-w-[90px]">
                      GST AMT (₹)
                    </th>
                    <th className="py-2 px-2.5 text-center bg-slate-100 text-slate-900 border-r border-slate-200 min-w-[105px]">
                      AMOUNT (₹)
                    </th>
                    <th className="py-2 px-2 text-center bg-indigo-100/90 text-indigo-950 border-r-2 border-slate-300 min-w-[85px]">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className="w-3 h-3 text-indigo-700" />
                        <span>DIRECTOR</span>
                      </div>
                      <div className="text-[9px] font-semibold text-indigo-800 normal-case">
                        Select (✓)
                      </div>
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
                          disabled={isRecordLocked}
                          onChange={(e) => handleUpdateItemMeta(item.id, 'itemName', e.target.value)}
                          className="w-full font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 disabled:opacity-80"
                        />
                        {cs.items.length > 1 && !isRecordLocked && (
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
                        disabled={isRecordLocked}
                        onChange={(e) => handleUpdateItemMeta(item.id, 'brandMake', e.target.value)}
                        className="w-full text-slate-700 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded px-1 disabled:opacity-80"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                      <input
                        type="text"
                        value={item.unit}
                        disabled={isRecordLocked}
                        onChange={(e) => handleUpdateItemMeta(item.id, 'unit', e.target.value.toUpperCase())}
                        className="w-full text-center font-mono text-[11px] text-slate-700 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded disabled:opacity-80"
                      />
                    </td>

                    {/* Qty */}
                    <td className="py-1.5 px-2 border-r-2 border-slate-300 text-center font-mono font-bold text-slate-900">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        disabled={isRecordLocked}
                        onChange={(e) => handleUpdateItemMeta(item.id, 'qty', Number(e.target.value))}
                        className="w-full text-center font-mono font-bold text-slate-900 bg-transparent border-none focus:outline-none focus:ring-1 focus:ring-indigo-400 rounded disabled:opacity-80"
                      />
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
                              disabled={isRecordLocked}
                              onChange={(e) =>
                                handleUpdateVendorRate(
                                  v.vendorId,
                                  item.id,
                                  Number(e.target.value),
                                  q.gstPercent
                                )
                              }
                              placeholder="0.00"
                              className={`w-full text-right font-mono font-bold bg-transparent border-none focus:outline-none rounded disabled:opacity-80 ${
                                isAwarded ? 'text-emerald-950 font-black' : 'text-slate-900'
                              }`}
                            />
                            {isL1 && (
                              <div className="mt-1 flex items-center justify-end pt-0.5 border-t border-slate-200/50">
                                <span className="text-[9px] font-sans font-black uppercase text-emerald-700 flex items-center gap-0.5 tracking-tight">
                                  <Award className="w-2.5 h-2.5 shrink-0" />
                                  <span>L-1</span>
                                </span>
                              </div>
                            )}
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
                            className={`py-1.5 px-2.5 text-right border-r border-slate-200 font-mono font-extrabold ${
                              isL1 ? 'bg-emerald-100/90 text-emerald-950 ring-1 ring-inset ring-emerald-300' : 'text-slate-900'
                            }`}
                          >
                            ₹{q.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* DIRECTOR SELECTION CHECKBOX */}
                          <td
                            className={`py-1.5 px-2 text-center border-r-2 border-slate-300 transition-colors ${
                              isAwarded ? 'bg-emerald-100/90 text-emerald-950 font-bold' : 'bg-slate-50/20'
                            }`}
                          >
                            <label className={`inline-flex items-center justify-center p-1 rounded ${isRecordLocked ? 'cursor-not-allowed opacity-70' : 'cursor-pointer hover:bg-slate-200/50'}`} title={isRecordLocked ? 'Record digitally signed & locked' : isAwarded ? 'Vendor selected by Director' : `Select ${v.vendorName}`}>
                              <input
                                type="checkbox"
                                aria-label={`Select ${v.vendorName} for ${item.itemName}`}
                                checked={isAwarded}
                                disabled={isRecordLocked}
                                onChange={() => handleAwardVendor(item.id, v.vendorId)}
                                className="w-4.5 h-4.5 text-emerald-600 rounded border-slate-400 focus:ring-emerald-500 cursor-pointer accent-emerald-600 disabled:cursor-not-allowed"
                              />
                            </label>
                          </td>
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}

              {/* TOTAL ROW */}
              <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300 text-xs">
                <td colSpan={5} className="py-2.5 px-4 uppercase tracking-wider text-right border-r-2 border-slate-300">
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
                        className={`py-2.5 px-2.5 text-right border-r border-slate-200 font-mono font-black ${
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
                      <td className="py-2.5 px-2 text-center border-r-2 border-slate-300 font-mono text-slate-400 font-bold text-[10px]">
                        —
                      </td>
                    </React.Fragment>
                  );
                })}
              </tr>

              {/* APPROVED BY ROW (Strict Rule - Below Comparative Table) */}
              <tr className="bg-slate-50 border-t-2 border-slate-400">
                <td colSpan={5} className="py-4 px-4 bg-slate-100 border-r-2 border-slate-300">
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
                      colSpan={4}
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
                      disabled={isRecordLocked}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'rating', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1 disabled:opacity-80"
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
                      disabled={isRecordLocked}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'contactPersonMobile', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1 disabled:opacity-80"
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
                      disabled={isRecordLocked}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'storeOfficeAddress', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1 disabled:opacity-80"
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
                      disabled={isRecordLocked}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'paymentTerms', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1 disabled:opacity-80"
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
                      disabled={isRecordLocked}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'warrantyPeriod', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1 disabled:opacity-80"
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
                      disabled={isRecordLocked}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'gstTerms', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1 disabled:opacity-80"
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
                      disabled={isRecordLocked}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'quotationDateValidity', e.target.value)}
                      className="w-full bg-transparent border-none text-slate-800 font-medium focus:ring-1 focus:ring-indigo-400 rounded px-1 disabled:opacity-80"
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

      {/* MODAL: AI WHATSAPP & IMAGE QUOTATION IMPORT STUDIO */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 my-0 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 bg-slate-900 text-white shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-indigo-600 rounded-xl">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-wide text-white">
                    AI WhatsApp &amp; Image Quotation Import Studio
                  </h3>
                  <p className="text-xs text-indigo-200">
                    Barbrik Smart OCR &amp; Fuzzy Item Matching Engine
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setExtractedData(null);
                }}
                className="text-slate-400 hover:text-white p-1.5 rounded-lg hover:bg-slate-800 transition-colors cursor-pointer"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Scrollable Body */}
            <div className="p-6 overflow-y-auto min-h-0 flex-1 space-y-5 bg-slate-50">
              {/* Input Type Selector Tabs */}
              <div className="flex items-center gap-2 p-1 bg-slate-200/80 rounded-xl w-fit">
                <button
                  type="button"
                  onClick={() => setImportTab('image')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    importTab === 'image'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <Camera className="w-4 h-4 text-indigo-600" />
                  <span>Photo / PDF Quote Upload</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab('text')}
                  className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                    importTab === 'text'
                      ? 'bg-white text-indigo-700 shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4 text-amber-600" />
                  <span>WhatsApp Chat Text</span>
                </button>
              </div>

              {/* TAB 1: Image / Photo Upload */}
              {importTab === 'image' && (
                <div className="space-y-3">
                  <label className="block text-xs font-bold text-slate-700">
                    Upload Vendor Quotation Bill, Photo, or PDF
                  </label>
                  <div className="border-2 border-dashed border-indigo-200 rounded-2xl p-6 bg-white hover:bg-indigo-50/40 transition-colors text-center cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleImageFileUpload}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <div className="flex flex-col items-center justify-center space-y-2">
                      <div className="p-3 bg-indigo-100 rounded-full text-indigo-600">
                        <Upload className="w-6 h-6" />
                      </div>
                      <p className="text-xs font-bold text-slate-800">
                        Click or drag handwritten or printed vendor bill photo / PDF
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Supports JPEG, PNG, WebP, PDF up to 20MB. AI extracts items, rates, and taxes automatically.
                      </p>
                    </div>
                  </div>

                  {quoteImageBase64 && (
                    <div className="flex items-center gap-3 p-3 bg-indigo-50 border border-indigo-200 rounded-xl">
                      <div className="w-12 h-12 rounded-lg bg-slate-200 overflow-hidden shrink-0 border border-slate-300">
                        <img src={quoteImageBase64} alt="Quotation preview" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold text-slate-800 truncate">Quotation File Loaded</p>
                        <p className="text-[11px] text-slate-500">Ready for AI multimodal analysis</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setQuoteImageBase64(null)}
                        className="text-xs font-bold text-rose-600 hover:text-rose-800 cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* TAB 2: WhatsApp Chat Text */}
              {importTab === 'text' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Paste WhatsApp Quote Message
                  </label>
                  <textarea
                    rows={6}
                    value={rawQuoteInput}
                    onChange={(e) => setRawQuoteInput(e.target.value)}
                    placeholder={`Example WhatsApp Message:\nVendor: M/s Chhattisgarh Spares\n1. GREASE NIPPLE 8NO - 10 NOS @ 42/- GST 18%\n2. OIL FILTER LF-3959 - 2 NOS @ 850/- GST 18%\nPayment: 30 days credit\nGST: Extra 18%`}
                    className="w-full p-3 font-mono text-xs bg-white border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 shadow-xs"
                  />
                </div>
              )}

              {/* Run AI Extraction Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleRunAiExtraction}
                  disabled={isExtractingAi || (importTab === 'image' && !quoteImageBase64) || (importTab === 'text' && !rawQuoteInput.trim())}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-all"
                >
                  {isExtractingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Extracting Quotes &amp; Matching Items...</span>
                    </>
                  ) : (
                    <>
                      <Bot className="w-4 h-4 text-amber-300" />
                      <span>Run AI Extraction &amp; Auto-Match</span>
                    </>
                  )}
                </button>
              </div>

              {/* EXTRACTION REVIEW RESULT SECTION */}
              {extractedData && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-black uppercase tracking-wider text-slate-800 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Extracted Quotation &amp; Smart Match Review</span>
                    </h4>
                    <span className="text-[11px] font-bold text-slate-500 bg-slate-200 px-2.5 py-1 rounded-full">
                      {extractedItemsReview.length} Line Items Detected
                    </span>
                  </div>

                  {/* Vendor Header Metadata Inputs */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 p-3.5 bg-white rounded-xl border border-slate-200 shadow-xs">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Vendor / Party Name</label>
                      <input
                        type="text"
                        value={extractedVendorName}
                        onChange={(e) => setExtractedVendorName(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">GST / Tax Terms</label>
                      <input
                        type="text"
                        value={extractedGstTerms}
                        onChange={(e) => setExtractedGstTerms(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-bold text-slate-600 mb-1">Payment Credit Terms</label>
                      <input
                        type="text"
                        value={extractedPaymentTerms}
                        onChange={(e) => setExtractedPaymentTerms(e.target.value)}
                        className="w-full px-2.5 py-1.5 text-xs font-medium bg-slate-50 border border-slate-300 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                    </div>
                  </div>

                  {/* Smart Match Items Review Table */}
                  <div className="border border-slate-200 rounded-xl overflow-hidden bg-white shadow-xs">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-slate-900 text-white text-[11px] uppercase font-bold">
                        <tr>
                          <th className="py-2.5 px-3 w-8 text-center">Inc</th>
                          <th className="py-2.5 px-3">Vendor Extracted Quote Item</th>
                          <th className="py-2.5 px-3">Matched CS Requisition Item</th>
                          <th className="py-2.5 px-3 text-center">Confidence</th>
                          <th className="py-2.5 px-3 text-right">Base Rate (₹)</th>
                          <th className="py-2.5 px-3 text-right">GST %</th>
                          <th className="py-2.5 px-3 text-right">Landed Unit (₹)</th>
                          <th className="py-2.5 px-3 text-right">Line Total (₹)</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200 text-slate-800">
                        {extractedItemsReview.map((rev, idx) => {
                          const base = Number(rev.baseRate) || 0;
                          const gst = Number(rev.gstPercent) || 0;
                          const landed = base + (base * gst) / 100;
                          const total = landed * (rev.qty || 1);

                          const score = rev.confidenceScore || 0;
                          const badgeColor =
                            score >= 0.8
                              ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                              : score >= 0.5
                              ? 'bg-amber-100 text-amber-800 border-amber-300'
                              : 'bg-rose-100 text-rose-800 border-rose-300';

                          return (
                            <tr key={rev.id} className={rev.included ? 'bg-white' : 'bg-slate-100 opacity-60'}>
                              <td className="py-2.5 px-3 text-center">
                                <input
                                  type="checkbox"
                                  checked={rev.included}
                                  onChange={(e) => {
                                    const val = e.target.checked;
                                    setExtractedItemsReview((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, included: val } : item))
                                    );
                                  }}
                                  className="w-4 h-4 text-indigo-600 rounded cursor-pointer"
                                />
                              </td>
                              <td className="py-2.5 px-3">
                                <p className="font-bold text-slate-900">{rev.itemRawName}</p>
                                <p className="text-[11px] text-slate-500">
                                  Brand: {rev.brandMake} | Qty: {rev.qty} {rev.unit}
                                </p>
                              </td>
                              <td className="py-2.5 px-3">
                                <select
                                  value={rev.matchedItemId || ''}
                                  onChange={(e) => {
                                    const selectedId = e.target.value || null;
                                    setExtractedItemsReview((prev) =>
                                      prev.map((item, i) =>
                                        i === idx
                                          ? {
                                              ...item,
                                              matchedItemId: selectedId,
                                              confidenceScore: selectedId ? 1.0 : 0,
                                            }
                                          : item
                                      )
                                    );
                                  }}
                                  className="w-full px-2 py-1 text-xs border border-slate-300 rounded-md bg-slate-50 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-medium"
                                >
                                  <option value="">-- Select CS Requisition Item --</option>
                                  {cs.items.map((csIt) => (
                                    <option key={csIt.id} value={csIt.id}>
                                      {csIt.sn}. {csIt.itemName} ({csIt.qty} {csIt.unit})
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2.5 px-3 text-center">
                                <span className={`inline-block px-2 py-0.5 text-[10px] font-black rounded-full border ${badgeColor}`}>
                                  {Math.round(score * 100)}%
                                </span>
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  value={rev.baseRate}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setExtractedItemsReview((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, baseRate: val } : item))
                                    );
                                  }}
                                  className="w-20 px-1.5 py-1 text-right text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 font-bold"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right">
                                <input
                                  type="number"
                                  value={rev.gstPercent}
                                  onChange={(e) => {
                                    const val = parseFloat(e.target.value) || 0;
                                    setExtractedItemsReview((prev) =>
                                      prev.map((item, i) => (i === idx ? { ...item, gstPercent: val } : item))
                                    );
                                  }}
                                  className="w-14 px-1.5 py-1 text-right text-xs border border-slate-300 rounded focus:ring-1 focus:ring-indigo-500 font-medium"
                                />
                              </td>
                              <td className="py-2.5 px-3 text-right font-bold text-slate-800">
                                ₹{landed.toFixed(2)}
                              </td>
                              <td className="py-2.5 px-3 text-right font-black text-indigo-950">
                                ₹{total.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer Actions */}
            <div className="flex items-center justify-between px-6 py-3.5 bg-slate-100 border-t border-slate-200 shrink-0">
              <button
                type="button"
                onClick={() => {
                  setIsPasteModalOpen(false);
                  setExtractedData(null);
                }}
                className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-lg cursor-pointer transition-colors"
              >
                Cancel
              </button>

              {extractedData ? (
                <button
                  type="button"
                  onClick={handleApplyImportedVendorToCs}
                  className="flex items-center gap-2 px-6 py-2.5 text-xs font-black bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-md cursor-pointer transition-all"
                >
                  <Check className="w-4 h-4" />
                  <span>Apply &amp; Auto-Fill CS Vendor Column</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleRunAiExtraction}
                  disabled={isExtractingAi || (importTab === 'image' && !quoteImageBase64) || (importTab === 'text' && !rawQuoteInput.trim())}
                  className="flex items-center gap-2 px-5 py-2.5 text-xs font-bold bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-xl shadow-sm cursor-pointer transition-all"
                >
                  <Bot className="w-4 h-4 text-amber-300" />
                  <span>Extract Quotes &amp; Auto-Match</span>
                </button>
              )}
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
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 my-0 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in duration-200 overflow-hidden my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
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
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-4 min-h-0 flex-1">
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
                        <div className="flex items-center gap-2 flex-wrap justify-end">
                          {cs.vendors.map((v) => {
                            const isChecked = assignedId === v.vendorId;
                            const isVndL1 = l1?.l1VendorId === v.vendorId;
                            return (
                              <label
                                key={`m-opt-${it.id}-${v.vendorId}`}
                                className={`flex items-center gap-1.5 px-2 py-1 rounded-lg border text-[11px] font-bold cursor-pointer transition-colors ${
                                  isChecked
                                    ? 'bg-emerald-50 border-emerald-300 text-emerald-950 font-black'
                                    : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                                }`}
                              >
                                <input
                                  type="checkbox"
                                  checked={isChecked}
                                  onChange={() => handleAwardVendor(it.id, v.vendorId)}
                                  className="w-3.5 h-3.5 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 accent-emerald-600 cursor-pointer"
                                />
                                <span>{v.vendorName.slice(0, 15)}</span>
                                {isVndL1 && <span className="text-[9px] text-emerald-700 font-black">★ L1</span>}
                              </label>
                            );
                          })}
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
            </div>

            {/* Fixed Footer */}
            <div className="flex items-center justify-end gap-2 px-6 py-3.5 border-t border-slate-100 shrink-0 bg-slate-50/50">
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
        <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 my-0 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-slate-200 animate-in fade-in duration-200 overflow-hidden my-auto">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4 shrink-0 bg-slate-50/50">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-xs shrink-0">
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
                className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer shrink-0"
                aria-label="Close modal"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Scrollable Body */}
            <div className="p-6 overflow-y-auto space-y-4 min-h-0 flex-1">
              <p className="text-xs text-slate-600">
                The comparative statement for <strong>Indent {cs.indentNo || '466'}</strong> has been split into{' '}
                <strong>{createdSplitPos.length} vendor purchase orders</strong>. Each order has been pre-configured with
                the approved item rates, site delivery, and <strong>Freight &amp; Delivery: OURS</strong>:
              </p>

              <div className="space-y-3">
                {createdSplitPos.map((flow) => (
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
            </div>

            {/* Fixed Footer */}
            <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-100 shrink-0 bg-slate-50/50">
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
