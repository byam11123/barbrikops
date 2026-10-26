import React, { useState, useMemo, useEffect } from 'react';
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
  ImageIcon,
  Loader2,
  Check,
  Camera,
  ArrowLeft,
  Info,
  MoreVertical,
} from 'lucide-react';
import { 
  ComparativeStatement, 
  CsItem, 
  CsVendorQuote, 
  UserProfile, 
  FmsInstance, 
  FmsStageExecution,
  CsApprovalDetails 
} from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { 
  downloadComparativeStatementExcel, 
  calculateCsL1Analytics 
} from '../../services/comparativeExcelService';
import { downloadComparativeStatementPdf } from '../../services/comparativePdfService';
import { parseRawQuoteText, extractQuotationWithAI, ExtractedVendorQuoteData } from '../../utils/quoteTextParser';
import { addWorkingSlaHours, formatToStandardDateTime, DEFAULT_WORK_SHIFT_CONFIG } from '../../services/workShiftService';

export interface ComparativeStatementWorkspaceProps {
  initialCs?: ComparativeStatement;
  currentUser: UserProfile;
  purchaseFlows?: FmsInstance[];
  // Embedded in FMS Stage 2 (EDIT) or Stage 3 (APPROVAL)
  isEmbedded?: boolean;
  flow?: FmsInstance;
  stageIndex?: number;
  mode?: 'EDIT' | 'APPROVAL' | 'VIEW';
  onClose?: () => void;
  onSaveAndLink?: (cs: ComparativeStatement) => void;
  onReturnToPurchaser?: (updatedFlow: FmsInstance) => void;
  // Standalone Directory / List props
  onBackToDirectory?: () => void;
  statements?: ComparativeStatement[];
  activeStatementId?: string;
  onSelectStatementId?: (id: string) => void;
  onCreateNewSheet?: () => void;
  onDeleteCsSheet?: (id: string) => void;
}

export const ComparativeStatementWorkspace: React.FC<ComparativeStatementWorkspaceProps> = ({
  initialCs,
  currentUser,
  purchaseFlows = [],
  isEmbedded = false,
  flow,
  stageIndex = 1,
  mode,
  onClose,
  onSaveAndLink,
  onReturnToPurchaser,
  onBackToDirectory,
  statements = [],
  activeStatementId,
  onSelectStatementId,
  onCreateNewSheet,
  onDeleteCsSheet,
}) => {
  // Working state for active statement
  const [cs, setCs] = useState<ComparativeStatement>(() => {
    if (initialCs) return initialCs;
    if (flow) {
      const allStatements = storageAdapter.getComparativeStatements();
      const existing = allStatements.find(
        (c) =>
          (flow.indentNo && c.indentNo === flow.indentNo) ||
          c.id === flow.comparativeSheetId ||
          (flow.indentNo?.includes('-PUR') && c.indentNo === flow.indentNo.replace('-PUR', ''))
      );
      if (existing) return existing;
      return storageAdapter.createComparativeSheetFromFms(flow, currentUser);
    }
    const all = storageAdapter.getComparativeStatements();
    return all[0] || initialCs;
  });

  // Vendor Master List for autocompletion
  const vendorMasterList = useMemo(() => storageAdapter.getVendorProfiles(), []);

  // Effective mode determination
  const effectiveMode: 'EDIT' | 'APPROVAL' | 'VIEW' = useMemo(() => {
    if (mode) return mode;
    if (
      stageIndex === 2 ||
      flow?.stages?.[stageIndex]?.stageName.toLowerCase().includes('l1') ||
      flow?.stages?.[stageIndex]?.stageName.toLowerCase().includes('director')
    ) {
      return 'APPROVAL';
    }
    return 'EDIT';
  }, [mode, stageIndex, flow?.stages]);

  // Check if current flow stage is Stage 2B (Additional Quotation Revision loop)
  const isStage2B = useMemo(() => {
    if (cs.directorRevisionRemarks && cs.status !== 'Approved') return true;
    if (!flow) return false;
    const currentStg = flow.stages?.[flow.currentStageIndex];
    const thisStg = flow.stages?.[stageIndex];
    return Boolean(
      flow.currentStageId?.includes('02B') ||
      currentStg?.stageId?.includes('02B') ||
      currentStg?.stageName?.includes('2B') ||
      thisStg?.stageId?.includes('02B') ||
      thisStg?.stageName?.includes('2B') ||
      thisStg?.stageName?.toLowerCase().includes('additional quotation')
    );
  }, [flow, stageIndex, cs.directorRevisionRemarks, cs.status]);

  // Check if record is officially signed and locked
  const isRecordLocked = useMemo(() => {
    // If in EDIT mode (Stage 2: Quotation Entry), or Stage 2B, or CS is explicitly unlocked (isLocked === false), record must NEVER be treated as locked
    if (effectiveMode === 'EDIT' || isStage2B || cs.isLocked === false) return false;

    return (
      cs.status === 'Approved' ||
      cs.status === 'PO Created' ||
      Boolean(cs.approvalDetails?.signatureStamp) ||
      Boolean(cs.approvedBy)
    );
  }, [cs.status, cs.approvalDetails?.signatureStamp, cs.approvedBy, cs.isLocked, effectiveMode, isStage2B]);

  // Rates are locked in APPROVAL mode, VIEW mode, or when record is fully locked
  const isRatesLocked = (effectiveMode === 'APPROVAL' && !isStage2B) || effectiveMode === 'VIEW' || isRecordLocked;

  // Approver states - strictly restricted to Director Pranjal Agrawal as Signatory
  const isPranjal = useMemo(() => {
    if (!currentUser) return false;
    const name = (currentUser.name || '').trim().toLowerCase();
    const username = (currentUser.username || '').trim().toLowerCase();
    const email = (currentUser.email || '').trim().toLowerCase();
    const role = (currentUser.role || currentUser.systemRole || '').trim().toLowerCase();
    return (
      name.includes('pranjal') ||
      username.includes('pranjal') ||
      email.includes('pranjal') ||
      role.includes('director') ||
      currentUser.userId === 'USR-013'
    );
  }, [currentUser]);

  // Award Selection is editable ONLY in APPROVAL mode by Director Pranjal Agrawal
  const isAwardEditable = effectiveMode === 'APPROVAL' && isPranjal && !isRecordLocked;

  const [isApproveModalOpen, setIsApproveModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [approverName, setApproverName] = useState('Pranjal Agrawal');
  const [approverDesignation, setApproverDesignation] = useState('Finance Approver / Director');
  const [approvalRemarks, setApprovalRemarks] = useState(
    cs?.approvalDetails?.remarks ||
      'Approved with item-wise split PO allocation to maintain dual vendor operational readiness. Freight strictly OURS.'
  );

  // Split PO generation states
  const [isSplitPoModalOpen, setIsSplitPoModalOpen] = useState(false);
  const [createdSplitPos, setCreatedSplitPos] = useState<FmsInstance[]>([]);

  // Modals & UI Toggles
  const [isPasteModalOpen, setIsPasteModalOpen] = useState(false);
  const [rawQuoteInput, setRawQuoteInput] = useState('');
  const [isImportIndentOpen, setIsImportIndentOpen] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<string[] | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isRequestAdditionalQuoteModalOpen, setIsRequestAdditionalQuoteModalOpen] = useState(false);
  const [requestQuoteInstructions, setRequestQuoteInstructions] = useState('');

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

  // Secondary actions dropdown menu toggle
  const [isSecondaryMenuOpen, setIsSecondaryMenuOpen] = useState(false);

  // EA Brief & Director Revision Remark resolution
  const eaBrief = useMemo(() => {
    return (
      (flow?.stages?.[3]?.submittedData?.eaPreReviewBrief as string) ||
      (flow?.instanceDataPool?.eaPreReviewBrief as string) ||
      (cs as any)?.eaBrief ||
      (cs as any)?.eaPreReviewBrief ||
      ''
    );
  }, [flow, cs]);

  const directorRevisionRemark = useMemo(() => {
    return (
      cs.directorRevisionRemarks ||
      (flow?.stages?.[flow.currentStageIndex]?.remarks?.replace('Director Directive: ', '')) ||
      (flow?.currentStageId?.includes('02B') ? flow?.remarks : '') ||
      ''
    );
  }, [cs.directorRevisionRemarks, flow]);

  // Synchronize when initialCs or flow changes
  useEffect(() => {
    if (initialCs) {
      setCs(initialCs);
    }
  }, [initialCs?.id]);

  // Auto-Unlock CS when opened in Stage 2 (Quotation Entry / EDIT mode)
  useEffect(() => {
    if (effectiveMode === 'EDIT') {
      const isLockedInMemory =
        cs.status === 'Approved' ||
        cs.status === 'PO Created' ||
        Boolean(cs.approvedBy) ||
        Boolean(cs.approvalDetails?.signatureStamp);

      if (isLockedInMemory) {
        const timestamp = new Date().toLocaleString('en-GB');
        const unlockedCs: ComparativeStatement = {
          ...cs,
          status: 'Draft',
          approvedBy: undefined,
          approvalDate: undefined,
          approvalDetails: undefined,
          updatedAt: timestamp,
        };
        storageAdapter.saveComparativeStatement(unlockedCs);
        setCs(unlockedCs);
      }
    }
  }, [effectiveMode, cs.status, cs.approvedBy, cs.approvalDetails?.signatureStamp]);

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
    if (isRatesLocked) return;
    setCs((prev) => ({
      ...prev,
      [field]: val,
    }));
  };

  // Add Item
  const handleAddItem = () => {
    if (isRatesLocked) {
      setSaveSuccessMsg('Item rates and specifications are locked in Stage 3 Approval mode.');
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
    if (isRatesLocked) {
      setSaveSuccessMsg('Item rows are locked in Stage 3 Approval mode.');
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
    if (isRatesLocked) return;
    setCs((prev) => {
      const updatedItems = prev.items.map((it) => {
        if (it.id === itemId) {
          return { ...it, [field]: value };
        }
        return it;
      });

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
    if (isRatesLocked) {
      setSaveSuccessMsg('Vendor columns are locked in Stage 3 Approval mode.');
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
    if (isRatesLocked) {
      setSaveSuccessMsg('Vendor columns are locked in Stage 3 Approval mode.');
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
  const handleUpdateVendorMeta = (vendorId: string, field: keyof CsVendorQuote, value: any) => {
    if (isRatesLocked) return;
    setCs((prev) => ({
      ...prev,
      vendors: prev.vendors.map((v) => (v.vendorId === vendorId ? { ...v, [field]: value } : v)),
    }));
  };

  // Update Cell Rate Values
  const handleRateChange = (vendorId: string, itemId: string, field: 'baseRate' | 'gstPercent', val: number) => {
    if (isRatesLocked) return;
    setCs((prev) => {
      const item = prev.items.find((it) => it.id === itemId);
      const qty = item ? item.qty : 1;

      const updatedVendors = prev.vendors.map((vendor) => {
        if (vendor.vendorId !== vendorId) return vendor;

        const currentRate = vendor.itemRates[itemId] || {
          baseRate: 0,
          gstPercent: 18,
          gstAmount: 0,
          landedRate: 0,
          amount: 0,
          isQuoted: false,
        };

        const newBaseRate = field === 'baseRate' ? val : currentRate.baseRate;
        const newGstPercent = field === 'gstPercent' ? val : currentRate.gstPercent;

        const gstAmount = (newBaseRate * newGstPercent) / 100;
        const landedRate = newBaseRate + gstAmount;
        const amount = landedRate * qty;
        const isQuoted = newBaseRate > 0;

        return {
          ...vendor,
          itemRates: {
            ...vendor.itemRates,
            [itemId]: {
              baseRate: newBaseRate,
              gstPercent: newGstPercent,
              gstAmount,
              landedRate,
              amount,
              isQuoted,
            },
          },
        };
      });

      return {
        ...prev,
        vendors: updatedVendors,
      };
    });
  };

  // Award specific item to vendor (Director Item Selection - EDITABLE IN STAGE 3 APPROVAL MODE)
  const handleAwardVendor = (itemId: string, vendorId: string) => {
    if (!isAwardEditable) {
      setSaveSuccessMsg('Award selection is locked for this statement.');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }
    const current = cs.awardedVendorMap?.[itemId];
    const updatedMap = { ...(cs.awardedVendorMap || {}) };

    if (current === vendorId) {
      delete updatedMap[itemId];
      setSaveSuccessMsg('Award selection cleared for this item.');
    } else {
      updatedMap[itemId] = vendorId;
      const vendorName = cs.vendors.find((v) => v.vendorId === vendorId)?.vendorName || 'selected vendor';
      setSaveSuccessMsg(`Item selected & awarded to ${vendorName}!`);
    }

    const updatedCs: ComparativeStatement = {
      ...cs,
      awardedVendorMap: updatedMap,
    };
    const saved = storageAdapter.saveComparativeStatement(updatedCs);
    setCs(saved);
    setTimeout(() => setSaveSuccessMsg(null), 2500);
  };

  // Auto-Fill All items to their respective L-1 lowest bidder (EDITABLE IN STAGE 3 APPROVAL MODE)
  const handleAutoFillAllL1 = () => {
    if (!isAwardEditable) {
      setSaveSuccessMsg('Award selection is locked for this statement.');
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
    setSaveSuccessMsg('All items auto-awarded to their respective L-1 lowest bidders!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // Import items from Purchase FMS Flow
  const handleImportFromFlow = (f: FmsInstance) => {
    const newSheet = storageAdapter.createComparativeSheetFromFms(f, currentUser);
    setCs(newSheet);
    setIsImportIndentOpen(false);
    setSaveSuccessMsg(`Loaded items from Indent #${f.indentNo || f.requisitionNumber}!`);
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // AI & Image Quotation Extraction
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      alert('Please select an image file (PNG, JPG, WEBP) or PDF quotation scan.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const result = uploadEvent.target?.result as string;
      const base64Data = result.split(',')[1];
      setQuoteImageBase64(base64Data);
      setQuoteMimeType(file.type);
    };
    reader.readAsDataURL(file);
  };

  const handleExtractQuoteWithAi = async () => {
    setIsExtractingAi(true);
    setExtractedData(null);

    try {
      let result: ExtractedVendorQuoteData;

      if (importTab === 'image' && quoteImageBase64 && quoteMimeType) {
        result = await extractQuotationWithAI({
          imageBase64: quoteImageBase64,
          mimeType: quoteMimeType,
          existingItems: cs.items,
        });
      } else if (rawQuoteInput.trim()) {
        result = await extractQuotationWithAI({
          rawText: rawQuoteInput,
          existingItems: cs.items,
        });
      } else {
        alert('Please paste quotation text or upload a quotation document/image.');
        setIsExtractingAi(false);
        return;
      }

      setExtractedData(result);
      setExtractedVendorName(result.vendorName || '');
      setExtractedGstTerms(result.gstTerms || '18% GST Extra');
      setExtractedPaymentTerms(result.paymentTerms || '30 Days Credit');

      const reviewRows = (result.extractedItems || []).map((it, idx) => ({
        id: `extracted-${idx + 1}`,
        itemRawName: it.itemRawName,
        brandMake: it.brandMake || '—',
        unit: it.unit || 'NOS',
        qty: it.qty || 1,
        baseRate: it.baseRate || 0,
        gstPercent: it.gstPercent !== undefined ? it.gstPercent : 18,
        matchedItemId: it.matchedItemId,
        confidenceScore: it.confidenceScore || 0.8,
        included: it.baseRate > 0,
      }));

      setExtractedItemsReview(reviewRows);
    } catch (err: any) {
      console.warn('AI Extraction fallback:', err);
      const fallback = parseRawQuoteText(rawQuoteInput, cs.items);
      const fallbackVendor = fallback.vendors[0];
      const vName = fallbackVendor?.vendorName || 'Extracted Vendor';
      setExtractedVendorName(vName);
      setExtractedGstTerms(fallbackVendor?.gstTerms || '18% GST Applicable');
      setExtractedPaymentTerms(fallbackVendor?.paymentTerms || '30 Days Credit');

      const reviewRows = fallback.items.map((it, idx) => {
        const rate = fallbackVendor?.itemRates[it.id];
        return {
          id: `fallback-${idx + 1}`,
          itemRawName: it.itemName,
          brandMake: it.brandMake || '—',
          unit: it.unit || 'NOS',
          qty: it.qty || 1,
          baseRate: rate?.baseRate || 0,
          gstPercent: rate?.gstPercent !== undefined ? rate.gstPercent : 18,
          matchedItemId: it.id,
          confidenceScore: 0.7,
          included: (rate?.baseRate || 0) > 0,
        };
      });

      setExtractedItemsReview(reviewRows);
    } finally {
      setIsExtractingAi(false);
    }
  };

  const handleApplyExtractedQuote = (targetVendorId?: string) => {
    if (!extractedItemsReview || extractedItemsReview.length === 0) return;

    const activeVendorName = extractedVendorName.trim() || `Auto-Vendor ${cs.vendors.length + 1}`;

    setCs((prev) => {
      let vId = targetVendorId;
      if (!vId) {
        const found = prev.vendors.find(
          (v) => v.vendorName.toLowerCase().includes(activeVendorName.toLowerCase()) || activeVendorName.toLowerCase().includes(v.vendorName.toLowerCase())
        );
        vId = found ? found.vendorId : `vnd-${Date.now()}`;
      }

      const existingVendor = prev.vendors.find((v) => v.vendorId === vId);
      const updatedRates: Record<string, any> = { ...(existingVendor?.itemRates || {}) };

      extractedItemsReview.forEach((extractedItem) => {
        if (!extractedItem.included) return;

        let targetItemId = extractedItem.matchedItemId;
        if (!targetItemId) {
          const matchByName = prev.items.find(
            (it) => it.itemName.toLowerCase().includes(extractedItem.itemRawName.toLowerCase()) || extractedItem.itemRawName.toLowerCase().includes(it.itemName.toLowerCase())
          );
          if (matchByName) {
            targetItemId = matchByName.id;
          }
        }

        if (targetItemId) {
          const item = prev.items.find((it) => it.id === targetItemId);
          const qty = item ? item.qty : extractedItem.qty || 1;
          const baseRate = Number(extractedItem.baseRate) || 0;
          const gstPercent = Number(extractedItem.gstPercent) || 18;
          const gstAmount = (baseRate * gstPercent) / 100;
          const landedRate = baseRate + gstAmount;
          const amount = landedRate * qty;

          updatedRates[targetItemId] = {
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
        vendorId: vId!,
        vendorName: activeVendorName,
        rating: existingVendor?.rating || '4.5 / 5.0 (AI Extracted)',
        contactPersonMobile: existingVendor?.contactPersonMobile || 'Mo: +91-XXXXXXXXXX',
        storeOfficeAddress: existingVendor?.storeOfficeAddress || 'Local Commercial Hub (C.G.)',
        paymentTerms: extractedPaymentTerms || '30 Days Credit',
        warrantyPeriod: existingVendor?.warrantyPeriod || '01 Year Comprehensive Warranty',
        gstTerms: extractedGstTerms || '18% GST Applicable',
        freightDeliveryTerms: 'OURS (Barbrik Project Ltd.)',
        quotationDateValidity: `${new Date().toLocaleDateString('en-GB')} | 30 Days Validity`,
        primaryProductFocus: existingVendor?.primaryProductFocus || 'Heavy Equipment Spares & Consumables',
        itemRates: updatedRates,
      };

      const vendorExists = prev.vendors.some((v) => v.vendorId === vId);
      const updatedVendors = vendorExists
        ? prev.vendors.map((v) => (v.vendorId === vId ? updatedVendor : v))
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

  // Digital Sign & Authorize CS Sheet (Strictly Pranjal Agrawal Only)
  const handleDigitalSignAndApprove = () => {
    const timestamp = new Date().toLocaleString('en-GB');
    const signatureToken = `BPL-SIG-PA-${Math.random().toString(36).substring(2, 7).toUpperCase()}-EXEC-VERIFIED`;

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
      preparedBy: cs.preparedBy || currentUser.name || 'Shyam Rao Sureshe',
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
    setCs(saved);
    setIsApproveModalOpen(false);

    if (isEmbedded && onSaveAndLink) {
      onSaveAndLink(saved);
    } else {
      setSaveSuccessMsg('CS Sheet officially approved and digitally signed by Director Pranjal Agrawal.');
      setTimeout(() => setSaveSuccessMsg(null), 3500);
    }
  };

  // Generate Split POs
  const handleGenerateSplitPurchaseOrders = () => {
    try {
      const result = storageAdapter.createSplitPurchaseOrdersFromCs(cs, currentUser);
      setCreatedSplitPos(result.createdFlows);
      setCs(result.updatedCs);
      setIsSplitPoModalOpen(true);
    } catch (e: any) {
      alert(`Split PO Error: ${e.message}`);
    }
  };

  // Save Sheet (Draft or Standard)
  const handleSaveSheet = () => {
    if (isRatesLocked && effectiveMode !== 'APPROVAL') {
      setSaveSuccessMsg('Record is digitally signed & locked (Read-Only).');
      setTimeout(() => setSaveSuccessMsg(null), 3000);
      return;
    }
    const saved = storageAdapter.saveComparativeStatement({
      ...cs,
      preparedBy: cs.preparedBy || currentUser.name || 'Shyam Rao Sureshe',
    });
    setCs(saved);
    setSaveSuccessMsg('Comparative Statement saved successfully!');
    setTimeout(() => setSaveSuccessMsg(null), 3000);
  };

  // STRICT STAGE COMPLETION VALIDATION (Requirement 4)
  const validateCsCompletion = (targetCs: ComparativeStatement): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (!targetCs.items || targetCs.items.length === 0) {
      errors.push('At least 1 requisition item must be present in the Comparative Statement.');
    } else {
      const zeroQtyItems = targetCs.items.filter((it) => !it.qty || Number(it.qty) <= 0);
      if (zeroQtyItems.length > 0) {
        errors.push(`All item quantities must be greater than zero (${zeroQtyItems.length} item(s) have 0 quantity).`);
      }
    }

    if (!targetCs.vendors || targetCs.vendors.length < 2) {
      errors.push('At least 2 vendors are required for comparative rate evaluation.');
    } else {
      const vendorsWithQuotes = targetCs.vendors.filter((v) => {
        return Object.values(v.itemRates || {}).some(
          (rate) => rate && (rate.landedRate > 0 || rate.baseRate > 0 || rate.isQuoted)
        );
      });
      if (vendorsWithQuotes.length < 2) {
        errors.push(`At least 2 vendors must have entered quotation rates (currently ${vendorsWithQuotes.length} quoted).`);
      }
    }

    const csAnalytics = calculateCsL1Analytics(targetCs);
    if (!csAnalytics.splitPoOptimizedTotal || csAnalytics.splitPoOptimizedTotal <= 0) {
      errors.push('Total comparative statement value is ₹0.00. Valid item quotation rates must be entered.');
    }

    targetCs.items.forEach((it, idx) => {
      const awardedVendorId = targetCs.awardedVendorMap?.[it.id] || csAnalytics.itemL1Map[it.id]?.l1VendorId;
      if (!awardedVendorId) {
        errors.push(`Item #${idx + 1} (${it.itemName}) has not been awarded to any vendor.`);
      } else {
        const vendor = targetCs.vendors.find((v) => v.vendorId === awardedVendorId);
        const rate = vendor?.itemRates?.[it.id];
        if (!rate || rate.landedRate <= 0) {
          errors.push(`Item #${idx + 1} (${it.itemName}) awarded vendor (${vendor?.vendorName || awardedVendorId}) has rate of ₹0.00.`);
        }
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Save & Link to Purchase FMS (Stage 2)
  const handleSaveAndLinkToFms = () => {
    setIsSaving(true);
    const { isValid, errors } = validateCsCompletion(cs);
    if (!isValid) {
      setValidationErrors(errors);
      setIsSaving(false);
      return;
    }

    setValidationErrors(null);
    const awardedMap = { ...(cs.awardedVendorMap || {}) };
    cs.items.forEach((item) => {
      if (!awardedMap[item.id]) {
        const l1 = analytics.itemL1Map[item.id];
        awardedMap[item.id] = l1?.l1VendorId || cs.vendors[0]?.vendorId || '';
      }
    });

    const timestamp = new Date().toLocaleString('en-GB');

    const completedCs: ComparativeStatement = {
      ...cs,
      status: 'Pending Approval',
      approvedBy: undefined,
      approvalDate: undefined,
      approvalDetails: undefined,
      preparedBy: cs.preparedBy || currentUser.name || 'Shyam Rao Sureshe',
      awardedVendorMap: awardedMap,
      updatedAt: timestamp,
    };

    const saved = storageAdapter.saveComparativeStatement(completedCs);
    setCs(saved);
    setIsSaving(false);

    if (onSaveAndLink) {
      onSaveAndLink(saved);
    }
  };

  // Save Draft Award Selection (Stage 3)
  const handleSaveDraftAwardInFms = () => {
    const timestamp = new Date().toLocaleString('en-GB');
    const saved = storageAdapter.saveComparativeStatement({
      ...cs,
      updatedAt: timestamp,
    });
    setCs(saved);
    setSaveSuccessMsg('Director Item Award Selections saved as Draft! Click "Confirm Award & Digitally Sign" to lock.');
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Save as Draft in FMS modal (Stage 2)
  const handleSaveDraftInFms = () => {
    const timestamp = new Date().toLocaleString('en-GB');
    const draftCs: ComparativeStatement = {
      ...cs,
      status: 'Draft',
      preparedBy: cs.preparedBy || currentUser.name || 'Shyam Rao Sureshe',
      updatedAt: timestamp,
    };
    const saved = storageAdapter.saveComparativeStatement(draftCs);
    setCs(saved);
    setValidationErrors(null);
    setSaveSuccessMsg(
      `Saved as Draft! Total value: ₹${(analytics.splitPoOptimizedTotal || 0).toLocaleString('en-IN')}. Stage remains In Progress.`
    );
    setTimeout(() => setSaveSuccessMsg(null), 3500);
  };

  // Director Stage 3: Return to Purchaser for Additional Quotation (5h SLA)
  const handleReturnToPurchaser = (instructions: string) => {
    if (!instructions.trim()) return;
    setIsSaving(true);
    const now = new Date();
    const timestamp = now.toLocaleString('en-GB');
    const isoNow = now.toISOString();

    const updatedCs: ComparativeStatement = {
      ...cs,
      status: 'Draft',
      isLocked: false,
      directorRevisionRemarks: instructions,
      approvedBy: undefined,
      approvalDate: undefined,
      approvalDetails: undefined,
      notes: `[DIRECTOR DIRECTIVE - ${timestamp}]: ${instructions}\n${cs.notes || ''}`,
      updatedAt: timestamp,
    };
    storageAdapter.saveComparativeStatement(updatedCs);
    setCs(updatedCs);

    let updatedFlowResult: FmsInstance | null = null;

    if (flow) {
      const existingStages = [...flow.stages];
      const workShiftConfig = storageAdapter.getRegistryConfig().workShiftConfig || DEFAULT_WORK_SHIFT_CONFIG;

      // Pause Stage 4 (Director L1 Approval - Index 3)
      if (existingStages[3]) {
        existingStages[3] = {
          ...existingStages[3],
          status: 'Pending',
          actualDateTime: undefined,
          actualTimestamp: undefined,
          delayHours: undefined,
          timeDelayHours: undefined,
          remarks: `Returned for Additional Quotation: ${instructions}`,
          notes: `Returned to Brahmanand Patel for Additional Quotation. Directive: "${instructions}"`,
        };
      }

      // Activate Stage 3 (Get Another Quotation - Index 2)
      const targetDate = addWorkingSlaHours(now, 12, workShiftConfig);
      if (existingStages[2]) {
        existingStages[2] = {
          ...existingStages[2],
          status: 'In Progress',
          assignee: 'Brahmanand Patel',
          whoRole: 'ASST_MANAGER_PURCHASE',
          whoDefaultAssignee: 'Brahmanand Patel',
          slaHours: 12,
          stageStartedAt: isoNow,
          plannedDateTime: formatToStandardDateTime(targetDate),
          plannedTimestamp: targetDate.toISOString(),
          actualDateTime: undefined,
          actualTimestamp: undefined,
          delayHours: undefined,
          timeDelayHours: undefined,
          remarks: `Director Directive: ${instructions}`,
          notes: `Additional Quotation Directive from Director Pranjal Agrawal: "${instructions}"`,
        };
      }

      const updatedFlow: FmsInstance = {
        ...flow,
        currentStageIndex: 2, // Jump backward to Stage 3
        currentStageId: 'STG-03',
        status: 'In Progress',
        stages: existingStages,
        updatedAt: timestamp,
        remarks: `Director requested additional quote: "${instructions}"`,
      };

      updatedFlowResult = updatedFlow;

      const allFlows = storageAdapter.getFmsFlows();
      const updatedList = allFlows.map((f) => (f.id === flow.id || f.flowId === flow.flowId ? updatedFlow : f));
      storageAdapter.saveFmsFlows(updatedList);

      storageAdapter.logAudit({
        userId: currentUser.userId,
        userName: currentUser.name,
        module: 'FMS',
        action: 'STAGE_ADVANCE',
        entityId: flow.flowId,
        details: `Director Pranjal Agrawal returned Stage 4 to Brahmanand Patel for Stage 3 (Get Another Quotation, 12h SLA). Directive: "${instructions}"`,
      });

      storageAdapter.addNotification({
        userId: 'USR-002', // Brahmanand Patel
        title: `Action Required: Stage 3 (Get Another Quotation) - Indent #${flow.indentNo}`,
        message: `Director Pranjal Agrawal requested additional quote: "${instructions}". 12-hour SLA assigned.`,
        type: 'FMS_ACTION_REQUIRED',
        linkTab: 'fms',
        linkEntityId: updatedFlow.id,
        data: { flowId: updatedFlow.flowId, stageIndex: 2 },
      });
    }

    setIsSaving(false);
    setIsRequestAdditionalQuoteModalOpen(false);

    if (updatedFlowResult && onReturnToPurchaser) {
      onReturnToPurchaser(updatedFlowResult);
    } else if (onClose) {
      onClose();
    }
  };

  // Rework Flow: Brahmanand Submits Stage 3 -> Jump back to Stage 4 with SLA Reset
  const handleResubmitToDirector = () => {
    if (!flow) return;
    setIsSaving(true);
    const now = new Date();
    const timestamp = now.toLocaleString('en-GB');
    const isoNow = now.toISOString();

    const saved = storageAdapter.saveComparativeStatement({
      ...cs,
      updatedAt: timestamp,
    });
    setCs(saved);

    const existingStages = [...flow.stages];
    const workShiftConfig = storageAdapter.getRegistryConfig().workShiftConfig || DEFAULT_WORK_SHIFT_CONFIG;

    // Mark Stage 3 (Index 2: Get Another Quotation) as Done
    if (existingStages[2]) {
      existingStages[2] = {
        ...existingStages[2],
        status: 'Done',
        actualTimestamp: isoNow,
        actualDateTime: timestamp,
        remarks: `Updated CS with requested additional quotes and resubmitted to Director.`,
      };
    }

    // Activate Stage 4 (Index 3: Director L1 Approval) with RESET SLA!
    const targetDate = addWorkingSlaHours(now, 12, workShiftConfig);
    if (existingStages[3]) {
      existingStages[3] = {
        ...existingStages[3],
        status: 'In Progress',
        assignee: 'Pranjal Agrawal',
        whoRole: 'DIRECTOR',
        whoDefaultAssignee: 'Pranjal Agrawal',
        slaHours: 12,
        stageStartedAt: isoNow,
        plannedDateTime: formatToStandardDateTime(targetDate),
        plannedTimestamp: targetDate.toISOString(),
        actualDateTime: undefined,
        actualTimestamp: undefined,
        delayHours: undefined,
        timeDelayHours: undefined,
      };
    }

    const updatedFlow: FmsInstance = {
      ...flow,
      currentStageIndex: 3, // Jump back to Stage 4
      currentStageId: 'STG-04',
      status: 'In Progress',
      stages: existingStages,
      updatedAt: timestamp,
      remarks: `Resubmitted to Director Pranjal Agrawal for L1 Approval by ${currentUser.name}`,
    };

    const allFlows = storageAdapter.getFmsFlows();
    const updatedList = allFlows.map((f) => (f.id === flow.id || f.flowId === flow.flowId ? updatedFlow : f));
    storageAdapter.saveFmsFlows(updatedList);

    storageAdapter.logAudit({
      userId: currentUser.userId,
      userName: currentUser.name,
      module: 'FMS',
      action: 'STAGE_ADVANCE',
      entityId: flow.flowId,
      details: `Brahmanand Patel completed Stage 3 and resubmitted CS to Director Pranjal Agrawal for L1 Approval (fresh 12h SLA reset).`,
    });

    storageAdapter.addNotification({
      userId: 'USR-013', // Pranjal Agrawal
      title: `Action Required: Director L1 Approval - Indent #${flow.indentNo}`,
      message: `Brahmanand Patel resubmitted updated Comparative Statement for Director Approval. Fresh 12-hour SLA active.`,
      type: 'FMS_ACTION_REQUIRED',
      linkTab: 'fms',
      linkEntityId: updatedFlow.id,
      data: { flowId: updatedFlow.flowId, stageIndex: 3 },
    });

    setIsSaving(false);
    if (onReturnToPurchaser) {
      onReturnToPurchaser(updatedFlow);
    } else if (onClose) {
      onClose();
    }
  };

  return (
    <>
      <div className={`space-y-6 pb-28 md:pb-24 ${isEmbedded ? 'p-1' : ''}`}>
      {/* 1. TOP HEADER & CORPORATE BRANDING (CLEAN EXECUTIVE HEADER) */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-5 rounded-2xl shadow-sm border border-slate-800 flex items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 bg-amber-400 text-slate-950 rounded font-mono">
              {isEmbedded ? (effectiveMode === 'APPROVAL' ? 'FMS Stage 3 Approval' : 'FMS Stage 2 Module') : 'Official Deliverable'}
            </span>
            <span className="text-xs text-indigo-200 font-semibold tracking-wider uppercase">
              Procurement &amp; Engineering Division
            </span>
            <span className="text-[11px] font-mono font-bold px-2 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/40 rounded">
              Ref ID: #{cs.indentNo || flow?.indentNo || 'N/A'} {flow?.siteName ? `(${flow.siteName})` : ''}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2.5">
            <span>BARBRIK PROJECT LTD.</span>
            <span className="text-slate-400 font-normal text-sm sm:text-base">|</span>
            <span className="text-indigo-200 font-bold text-sm sm:text-lg">Comparative Statement (CS Sheet)</span>
          </h1>
          <p className="text-xs text-slate-300">
            Direct L-1 Bidder Normalization, Item-Wise GST Breakdown, Split PO Optimization &amp; Commercial Evaluation
            &bull; Prepared by: <strong className="text-amber-300 font-semibold">{cs.preparedBy || 'Shyam Rao Sureshe'}</strong>
            &bull; Signatory: <strong className="text-emerald-300 font-semibold">{cs.approvedBy || 'Pranjal Agrawal'}</strong>
          </p>
        </div>

        {(onClose || onBackToDirectory) && (
          <button
            type="button"
            onClick={() => {
              if (onClose) onClose();
              else if (onBackToDirectory) onBackToDirectory();
            }}
            className="text-slate-400 hover:text-white hover:bg-slate-700/50 p-2 rounded-full transition-colors cursor-pointer shrink-0"
            title="Close"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* EXECUTIVE ALERT BOX: EA BRIEF & DIRECTOR REVISION REMARK */}
      {(Boolean(eaBrief) || Boolean(directorRevisionRemark)) && (
        <div className="space-y-3">
          {Boolean(eaBrief) && (
            <div className="p-4 bg-indigo-950/80 border-2 border-indigo-500/60 rounded-2xl flex items-start gap-3 shadow-lg animate-in fade-in">
              <div className="p-2 bg-indigo-500/20 text-indigo-300 rounded-xl border border-indigo-500/30 shrink-0 mt-0.5">
                <FileText className="w-5 h-5 text-indigo-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black px-2 py-0.5 bg-indigo-500/30 text-indigo-300 rounded border border-indigo-400/40">
                    EA PRE-REVIEW BRIEF
                  </span>
                  <span className="text-xs text-indigo-200 font-mono font-bold bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700">
                    Executive Summary for Director
                  </span>
                </div>
                <div className="mt-2 p-3 bg-indigo-900/40 border border-indigo-500/40 rounded-xl">
                  <p className="text-sm text-indigo-100 font-medium whitespace-pre-wrap">{eaBrief}</p>
                </div>
              </div>
            </div>
          )}

          {Boolean(directorRevisionRemark) && (
            <div className="p-4 bg-amber-950/80 border-2 border-amber-500/60 rounded-2xl flex items-start gap-3 shadow-lg animate-in fade-in">
              <div className="p-2 bg-amber-500/20 text-amber-300 rounded-xl border border-amber-500/30 shrink-0 mt-0.5">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black px-2 py-0.5 bg-amber-500/30 text-amber-300 rounded border border-amber-400/40">
                    DIRECTOR REVISION REMARK
                  </span>
                  {isStage2B && (
                    <span className="text-xs text-amber-200 font-mono font-bold bg-slate-900/60 px-2 py-0.5 rounded border border-slate-700">
                      5-Hour SLA Active (Assigned to Shyam Rao Sureshe)
                    </span>
                  )}
                </div>
                <div className="mt-2 p-3 bg-amber-900/40 border border-amber-500/40 rounded-xl">
                  <p className="text-sm font-black text-amber-200">
                    Director Directive: <span className="font-semibold text-white">{directorRevisionRemark}</span>
                  </p>
                </div>
                {isStage2B && (
                  <p className="text-xs text-amber-300/90 mt-1.5">
                    CS is unlocked for editing. Add the new vendor/quote and resubmit to Director Pranjal Agrawal using the action bar below.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Validation Errors Notice */}
      {validationErrors && validationErrors.length > 0 && (
        <div className="p-3.5 bg-rose-950/80 border border-rose-500/60 rounded-xl text-rose-200 text-xs space-y-1.5 animate-in fade-in">
          <div className="flex items-center gap-2 font-black text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
            <span>Cannot Link to Purchase FMS — Stage Completion Criteria Not Met:</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-[11px] text-rose-200/90 pl-1">
            {validationErrors.map((err, idx) => (
              <li key={idx}>{err}</li>
            ))}
          </ul>
          <p className="text-[10px] text-rose-300/80 pt-1 border-t border-rose-800/60">
            Tip: You can click &ldquo;Save Draft&rdquo; in the bottom action bar to save work in progress without advancing the stage.
          </p>
        </div>
      )}

      {/* Success Toast */}
      {saveSuccessMsg && (
        <div className="py-2 px-3 bg-emerald-500/20 border border-emerald-400/40 rounded-xl text-emerald-300 text-xs font-bold flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveSuccessMsg}</span>
        </div>
      )}

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
            <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Statement:</span>
            {!isEmbedded && statements.length > 0 && onSelectStatementId ? (
              <select
                aria-label="Select saved Comparative Statement"
                value={activeStatementId || cs.id}
                onChange={(e) => onSelectStatementId(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold bg-slate-50 border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {statements.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.site} — IND: {s.indentNo || 'N/A'} ({s.forPurpose?.slice(0, 30) || 'General'}) [{s.statementDate}] {s.status === 'Approved' ? '🔒' : ''}
                  </option>
                ))}
              </select>
            ) : (
              <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2.5 py-1 rounded">
                Ref #{cs.indentNo} ({cs.id})
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs flex-wrap">
            <span className="text-slate-500">
              Prepared by: <strong className="text-slate-800 font-bold">{cs.preparedBy || 'Shyam Rao Sureshe'}</strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500">
              Status:{' '}
              <strong className={cs.status === 'Approved' ? 'text-emerald-700 font-extrabold' : 'text-amber-700 font-extrabold'}>
                {cs.status} {isRecordLocked ? '(Locked)' : ''}
              </strong>
            </span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-500 font-mono text-[11px]">Updated: {cs.updatedAt}</span>
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
              disabled={isRatesLocked}
              onChange={(e) => handleUpdateHeader('site', e.target.value)}
              placeholder="e.g. BIJETALA, SILADEHI"
              className="w-full px-3 py-1.5 text-xs font-bold bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              disabled={isRatesLocked}
              onChange={(e) => handleUpdateHeader('indentNo', e.target.value)}
              placeholder="e.g. 466"
              className="w-full px-3 py-1.5 text-xs font-mono font-bold bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
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
              disabled={isRatesLocked}
              onChange={(e) => handleUpdateHeader('indentDate', e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full px-3 py-1.5 text-xs font-medium bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Statement Date */}
          <div className="space-y-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Clock className="w-3 h-3 text-indigo-600" />
              <span>CS Date</span>
            </label>
            <input
              type="text"
              value={cs.statementDate}
              disabled={isRatesLocked}
              onChange={(e) => handleUpdateHeader('statementDate', e.target.value)}
              placeholder="DD/MM/YYYY"
              className="w-full px-3 py-1.5 text-xs font-medium bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* For / Equipment Purpose */}
          <div className="space-y-1 sm:col-span-2 lg:col-span-1">
            <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <Layers className="w-3 h-3 text-indigo-600" />
              <span>Activity / Equipment</span>
            </label>
            <input
              type="text"
              value={cs.forPurpose}
              disabled={isRatesLocked}
              onChange={(e) => handleUpdateHeader('forPurpose', e.target.value)}
              placeholder="e.g. HM LOADER & DG-82.5KVA"
              className="w-full px-3 py-1.5 text-xs font-semibold bg-slate-50 focus:bg-white border border-slate-300 rounded-lg text-slate-800 uppercase focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>
        </div>
      </div>

      {/* 3. PROCUREMENT KPI & SPLIT PO SAVINGS CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
        {/* Single Lowest Supplier */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Single Lowest (L-1) Bidder</span>
            <Building2 className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="mt-2">
            <div className="text-sm font-black text-slate-900 truncate">
              {singleLowestVendor?.vendorName || 'No quotes'}
            </div>
            <div className="text-lg font-mono font-black text-indigo-700 mt-0.5">
              ₹{(singleLowestVendor?.totalLanded || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-[10px] text-slate-400 mt-1">If 100% awarded to single supplier</div>
          </div>
        </div>

        {/* Split PO Optimized Total */}
        <div className="bg-gradient-to-br from-indigo-900 to-slate-900 text-white p-4 rounded-2xl shadow-sm border border-indigo-800">
          <div className="text-[11px] font-bold text-indigo-200 uppercase tracking-wider flex items-center justify-between">
            <span>Split PO Optimized Total</span>
            <Zap className="w-4 h-4 text-amber-300" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-mono font-black text-amber-300">
              ₹{splitPoOptimizedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-indigo-200 mt-1 flex items-center gap-1 font-medium">
              <span>Pure item-wise lowest landed sum</span>
            </div>
          </div>
        </div>

        {/* Cost Savings via Split PO */}
        <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-2xl shadow-2xs">
          <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center justify-between">
            <span>Split PO Savings</span>
            <Percent className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="mt-2">
            <div className="text-2xl font-mono font-black text-emerald-700">
              ₹{splitPoSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-emerald-800 font-bold mt-1">
              {savingsPercent > 0 ? `${savingsPercent.toFixed(1)}% savings vs. single vendor` : 'Single vendor optimal'}
            </div>
          </div>
        </div>

        {/* Multi-Vendor Dual Supply Summary */}
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-2xs">
          <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider flex items-center justify-between">
            <span>Selected Award Total</span>
            <Award className="w-4 h-4 text-amber-500" />
          </div>
          <div className="mt-2">
            <div className="text-xl font-mono font-black text-slate-900">
              ₹{awardedSummary.totalAwardedValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
            </div>
            <div className="text-xs text-slate-500 font-medium mt-1">
              {awardedSummary.vendorsWithAwards} of {cs.vendors.length} vendors awarded &bull; {awardedSummary.totalItems} items
            </div>
          </div>
        </div>
      </div>


      {/* 4. TABLE 1: COMPARATIVE STATEMENT SPREADSHEET */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <FileSpreadsheet className="w-5 h-5 text-amber-300" />
            <div>
              <h2 className="text-sm font-black tracking-tight text-white uppercase flex items-center gap-2">
                <span>1. Quotation Matrix (Item-Wise Base Rate, GST% &amp; Landed Cost)</span>
                {isRatesLocked && (
                  <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-500/20 text-amber-300 border border-amber-400/30 rounded">
                    RATES LOCKED
                  </span>
                )}
              </h2>
              <p className="text-[11px] text-slate-300">
                Landed Rate = Base Rate + GST% &bull; Total = Landed Rate &times; Qty &bull; Lowest item rates highlighted in emerald
              </p>
            </div>
          </div>

          {!isRatesLocked && (
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleAddItem}
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>

              <button
                type="button"
                onClick={handleAddVendor}
                className="flex items-center gap-1 px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 rounded-lg text-xs font-bold transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-slate-950" />
                <span>Add Vendor Column</span>
              </button>
            </div>
          )}
        </div>

        {/* Desktop Matrix Spreadsheet Table */}
        <div className="hidden md:block overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-30 bg-slate-100 shadow-xs border-b border-slate-300">
              {/* Row 1: Group Headers */}
              <tr className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                <th colSpan={6} className="py-2.5 px-3 border-r-2 border-slate-300 uppercase tracking-wider text-[11px]">
                  Material Specification &amp; Indent Requirements
                </th>
                {cs.vendors.map((vendor, vIdx) => (
                  <th
                    key={vendor.vendorId}
                    colSpan={effectiveMode === 'EDIT' ? 4 : 5}
                    className="py-2.5 px-3 border-r-2 border-slate-300 text-center uppercase tracking-wider text-[11px] bg-indigo-50/70"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {effectiveMode === 'EDIT' ? (
                        <div className="flex items-center gap-1.5 flex-1 min-w-0">
                          <input
                            type="text"
                            list={`vendor-suggestions-${vendor.vendorId}`}
                            value={vendor.vendorName}
                            disabled={isRatesLocked}
                            onChange={(e) => handleUpdateVendorMeta(vendor.vendorId, 'vendorName', e.target.value)}
                            placeholder="Type Supplier Name..."
                            className="w-full text-xs font-black text-indigo-950 bg-white border border-indigo-300 focus:border-indigo-600 rounded px-2 py-1 focus:outline-none shadow-2xs"
                          />
                          <datalist id={`vendor-suggestions-${vendor.vendorId}`}>
                            {vendorMasterList.map((vm, vmIdx) => (
                              <option key={vm.id || vmIdx} value={vm.tradeName}>
                                {vm.tradeName} ({vm.legalName || 'Vendor Master'})
                              </option>
                            ))}
                          </datalist>
                        </div>
                      ) : (
                        <div className="flex items-center justify-center flex-1 min-w-0">
                          <span className="font-extrabold text-indigo-950 truncate max-w-[280px] text-xs">
                            {vendor.vendorName}
                          </span>
                        </div>
                      )}
                      {cs.vendors.length > 1 && !isRatesLocked && (
                        <button
                          type="button"
                          onClick={() => handleDeleteVendor(vendor.vendorId)}
                          className="text-slate-400 hover:text-rose-600 p-0.5 rounded cursor-pointer shrink-0"
                          title="Remove vendor column"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
              </tr>

              {/* Row 2: Sub-column Headers */}
              <tr className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-300 text-[10px] uppercase">
                <th className="py-2 px-2 border-r border-slate-200 text-center w-10 min-w-[40px] sticky left-0 z-40 bg-slate-100">S.N.</th>
                <th className="py-2 px-3 border-r border-slate-200 min-w-[220px] sticky left-10 z-40 bg-slate-100 shadow-[2px_0_4px_rgba(0,0,0,0.05)]">Material / Spare Description</th>
                <th className="py-2 px-2 border-r border-slate-200 min-w-[100px]">Brand / Make</th>
                <th className="py-2 px-2 border-r border-slate-200 text-center w-14">Unit</th>
                <th className="py-2 px-2 border-r border-slate-200 text-right w-14">Qty</th>
                <th className="py-2 px-1 border-r-2 border-slate-300 text-center w-8"></th>

                {cs.vendors.map((vendor) => (
                  <React.Fragment key={vendor.vendorId}>
                    <th className="py-2 px-2 border-r border-slate-200 text-right min-w-[80px]">Base Rate</th>
                    <th className="py-2 px-1 border-r border-slate-200 text-center w-14">GST %</th>
                    <th className="py-2 px-2 border-r border-slate-200 text-right min-w-[85px]">Landed Rate</th>
                    <th className="py-2 px-2 border-r border-slate-200 text-right min-w-[90px]">Total Amount</th>
                    {effectiveMode !== 'EDIT' && (
                      <th className="py-2 px-1 border-r-2 border-slate-300 text-center w-12 bg-amber-50/60 text-slate-800">
                        Award
                      </th>
                    )}
                  </React.Fragment>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-200 relative">
              {cs.items.map((item, idx) => {
                const l1Info = itemL1Map[item.id];
                const awardedVendorId = cs.awardedVendorMap?.[item.id] || l1Info?.l1VendorId;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                    {/* S.N. */}
                    <td className="py-2 px-2 border-r border-slate-200 text-center font-mono font-bold text-slate-500 w-10 min-w-[40px] sticky left-0 z-10 bg-white align-middle">
                      {idx + 1}
                    </td>

                    {/* Item Name + Delete Action */}
                    <td className="py-1.5 px-3 border-r border-slate-200 font-semibold text-slate-800 min-w-[220px] sticky left-10 z-10 bg-white shadow-[2px_0_4px_rgba(0,0,0,0.05)] align-middle">
                      <div className="flex items-center gap-1.5">
                        {!isRatesLocked && cs.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => handleDeleteItem(item.id)}
                            className="text-slate-300 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors shrink-0"
                            title="Delete item row"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <input
                          type="text"
                          value={item.itemName}
                          disabled={isRatesLocked}
                          onChange={(e) => handleUpdateItemMeta(item.id, 'itemName', e.target.value)}
                          className="w-full text-xs font-semibold bg-transparent focus:bg-white border-b border-transparent focus:border-indigo-500 focus:outline-none"
                        />
                      </div>
                    </td>

                    {/* Brand / Make */}
                    <td className="py-1.5 px-2 border-r border-slate-200 text-slate-600">
                      <input
                        type="text"
                        value={item.brandMake}
                        disabled={isRatesLocked}
                        onChange={(e) => handleUpdateItemMeta(item.id, 'brandMake', e.target.value)}
                        className="w-full text-xs bg-transparent focus:bg-white border-b border-transparent focus:border-indigo-500 focus:outline-none"
                      />
                    </td>

                    {/* Unit */}
                    <td className="py-1.5 px-2 border-r border-slate-200 text-center">
                      <input
                        type="text"
                        value={item.unit}
                        disabled={isRatesLocked}
                        onChange={(e) => handleUpdateItemMeta(item.id, 'unit', e.target.value)}
                        className="w-full text-xs text-center font-mono uppercase bg-transparent focus:bg-white border-b border-transparent focus:border-indigo-500 focus:outline-none"
                      />
                    </td>

                    {/* Qty */}
                    <td className="py-1.5 px-2 border-r border-slate-200 text-right">
                      <input
                        type="number"
                        min="1"
                        value={item.qty}
                        disabled={isRecordLocked || (effectiveMode === 'APPROVAL' && !isPranjal)}
                        onChange={(e) => handleUpdateItemMeta(item.id, 'qty', e.target.value)}
                        className="w-full text-xs text-right font-mono font-bold bg-transparent focus:bg-white border-b border-transparent focus:border-indigo-500 focus:outline-none"
                      />
                    </td>

                    {/* Delete Item */}
                    <td className="py-1 px-1 border-r-2 border-slate-300 text-center">
                      {!isRatesLocked && cs.items.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteItem(item.id)}
                          className="text-slate-300 hover:text-rose-600 p-0.5 rounded cursor-pointer transition-colors"
                          title="Delete row"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </td>

                    {/* Vendor Rate Cells */}
                    {cs.vendors.map((vendor) => {
                      const quote = vendor.itemRates[item.id] || {
                        baseRate: 0,
                        gstPercent: 18,
                        gstAmount: 0,
                        landedRate: 0,
                        amount: 0,
                        isQuoted: false,
                      };

                      const isLowest = l1Info && l1Info.l1VendorId === vendor.vendorId && quote.landedRate > 0;
                      const isAwarded = awardedVendorId === vendor.vendorId;

                      return (
                        <React.Fragment key={vendor.vendorId}>
                          {/* Base Rate */}
                          <td className={`py-1.5 px-2 border-r border-slate-200 text-right ${isLowest ? 'bg-emerald-50/50' : ''}`}>
                            <input
                              type="number"
                              step="any"
                              value={quote.baseRate || ''}
                              disabled={isRatesLocked}
                              placeholder="0.00"
                              onChange={(e) =>
                                handleRateChange(vendor.vendorId, item.id, 'baseRate', parseFloat(e.target.value) || 0)
                              }
                              className="w-full text-right font-mono text-xs bg-transparent focus:bg-white border-b border-transparent focus:border-indigo-500 focus:outline-none"
                            />
                          </td>

                          {/* GST % */}
                          <td className={`py-1.5 px-1 border-r border-slate-200 text-center ${isLowest ? 'bg-emerald-50/50' : ''}`}>
                            <input
                              type="number"
                              step="any"
                              value={quote.gstPercent !== undefined ? quote.gstPercent : 18}
                              disabled={isRatesLocked}
                              onChange={(e) =>
                                handleRateChange(vendor.vendorId, item.id, 'gstPercent', parseFloat(e.target.value) || 0)
                              }
                              className="w-full text-center font-mono text-[11px] bg-transparent focus:bg-white border-b border-transparent focus:border-indigo-500 focus:outline-none"
                            />
                          </td>

                          {/* Landed Rate */}
                          <td className={`py-1.5 px-2 border-r border-slate-200 text-right font-mono font-semibold ${isLowest ? 'bg-emerald-100 text-emerald-950 font-black' : 'text-slate-700'}`}>
                            ₹{quote.landedRate.toFixed(2)}
                          </td>

                          {/* Total Amount */}
                          <td className={`py-1.5 px-2 border-r border-slate-200 text-right font-mono font-bold ${isLowest ? 'bg-emerald-50 text-emerald-900 font-black' : 'text-slate-800'}`}>
                            ₹{quote.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                          </td>

                          {/* Award Checkbox (DIRECTOR EDITABLE IN STAGE 3 APPROVAL MODE) */}
                          {effectiveMode !== 'EDIT' && (
                            <td className={`py-1.5 px-1 border-r-2 border-slate-300 text-center ${isAwarded ? 'bg-amber-100/80' : ''}`}>
                              <input
                                type="radio"
                                name={`award-${item.id}`}
                                checked={isAwarded}
                                disabled={!isAwardEditable}
                                onClick={() => handleAwardVendor(item.id, vendor.vendorId)}
                                onChange={() => {}}
                                className="w-3.5 h-3.5 text-indigo-600 focus:ring-indigo-500 rounded cursor-pointer"
                                title={`Award ${item.itemName} to ${vendor.vendorName} (Click again to uncheck)`}
                              />
                            </td>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tr>
                );
              })}
            </tbody>

            {/* Total Row */}
            <tfoot className="bg-slate-100 font-bold border-t-2 border-slate-300">
              <tr>
                <td colSpan={6} className="py-2.5 px-3 border-r-2 border-slate-300 text-right uppercase tracking-wider text-slate-700">
                  Total Landed Vendor Evaluation:
                </td>
                {cs.vendors.map((vendor) => {
                  const vTotal = vendorTotals.find((vt) => vt.vendorId === vendor.vendorId)?.totalLanded || 0;
                  const isLowestTotal = singleLowestVendor?.vendorId === vendor.vendorId;

                  return (
                    <React.Fragment key={vendor.vendorId}>
                      <td colSpan={3} className={`py-2 px-2 border-r border-slate-200 text-right text-[11px] ${isLowestTotal ? 'bg-emerald-100 text-emerald-900' : 'text-slate-600'}`}>
                        {isLowestTotal ? 'LOWEST TOTAL:' : 'Total:'}
                      </td>
                      <td className={`py-2 px-2 border-r border-slate-200 text-right font-mono text-sm font-black ${isLowestTotal ? 'bg-emerald-200/80 text-emerald-950' : 'text-slate-900'}`}>
                        ₹{vTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                      </td>
                      {effectiveMode !== 'EDIT' && (
                        <td className="py-2 px-1 border-r-2 border-slate-300 text-center">
                          {isLowestTotal && <Award className="w-3.5 h-3.5 text-emerald-700 mx-auto" />}
                        </td>
                      )}
                    </React.Fragment>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>

        {/* Mobile Item Cards View (md:hidden) */}
        <div className="block md:hidden divide-y divide-slate-200">
          {cs.items.map((item, idx) => {
            const l1Info = itemL1Map[item.id];
            const lowestRate = l1Info?.l1Rate || 0;
            const awardedVendorId = cs.awardedVendorMap?.[item.id] || l1Info?.l1VendorId;

            return (
              <div key={item.id} className="p-4 space-y-3 bg-white">
                {/* Item Header & Qty */}
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-0.5 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded shrink-0">
                        #{idx + 1}
                      </span>
                      <h3 className="text-sm font-bold text-slate-900 leading-tight truncate">
                        {item.itemName}
                      </h3>
                    </div>
                    {item.brandMake && (
                      <p className="text-[11px] text-slate-500 line-clamp-2">
                        {item.brandMake}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block text-xs font-mono font-black px-2 py-1 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg">
                      {item.qty} {item.unit}
                    </span>
                    {l1Info && lowestRate > 0 && (
                      <div className="text-[10px] text-emerald-700 font-bold mt-1">
                        L-1: ₹{lowestRate.toFixed(2)}
                      </div>
                    )}
                  </div>
                </div>

                {/* Nested List of Vendor Quotes */}
                <div className="space-y-2 pt-1">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                    Vendor Quotations ({cs.vendors.length})
                  </div>
                  <div className="space-y-2">
                    {cs.vendors.map((vendor) => {
                      const quote = vendor.itemRates[item.id] || {
                        baseRate: 0,
                        gstPercent: 18,
                        gstAmount: 0,
                        landedRate: 0,
                        amount: 0,
                        isQuoted: false,
                      };
                      const baseRate = quote.baseRate || 0;
                      const gstPercent = quote.gstPercent || 0;
                      const landedRate = quote.landedRate || 0;
                      const itemTotal = quote.amount || landedRate * item.qty;
                      const isL1 = l1Info && l1Info.l1VendorId === vendor.vendorId && landedRate > 0;
                      const isAwarded = awardedVendorId === vendor.vendorId;

                      return (
                        <div
                          key={vendor.vendorId}
                          className={`p-3 rounded-xl border transition-all ${
                            isAwarded
                              ? 'bg-amber-50/70 border-amber-300 ring-1 ring-amber-400'
                              : isL1
                              ? 'bg-emerald-50/50 border-emerald-300'
                              : 'bg-slate-50/80 border-slate-200'
                          }`}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              {/* Award radio button for Director in Stage 3 */}
                              {isAwardEditable && (
                                <input
                                  type="radio"
                                  name={`award-mobile-${item.id}`}
                                  checked={isAwarded}
                                  onChange={() => handleAwardVendor(item.id, vendor.vendorId)}
                                  className="w-4 h-4 text-emerald-600 focus:ring-emerald-500 cursor-pointer shrink-0"
                                  title={`Award item to ${vendor.vendorName}`}
                                />
                              )}
                              <span className="font-bold text-xs text-slate-900 truncate">
                                {vendor.vendorName}
                              </span>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              {isL1 && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-300 rounded">
                                  L-1
                                </span>
                              )}
                              {isAwarded && (
                                <span className="text-[10px] font-black px-1.5 py-0.5 bg-amber-400 text-slate-950 rounded flex items-center gap-0.5">
                                  <Award className="w-3 h-3 text-slate-950" />
                                  AWARDED
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="mt-2 flex items-baseline justify-between text-xs pt-1.5 border-t border-slate-200/60">
                            <div className="text-[11px] text-slate-500 space-x-1">
                              <span>Base: ₹{baseRate.toFixed(2)}</span>
                              <span>+ {gstPercent}% GST</span>
                            </div>
                            <div className="text-right">
                              <div className="font-mono font-black text-slate-900">
                                ₹{landedRate.toFixed(2)} <span className="text-[10px] font-normal text-slate-500">/ {item.unit}</span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-500">
                                Total: ₹{itemTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                              </div>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 5. TABLE 2: PERCENTAGE VARIANCE MATRIX (% vs. L-1) */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-800 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Percent className="w-4 h-4 text-amber-300" />
            <h2 className="text-xs font-black tracking-tight text-white uppercase">
              2. Percentage Variance Matrix (% Above Item L-1 Lowest Landed Rate)
            </h2>
          </div>
          <span className="text-[10px] text-slate-300 font-medium">
            0% indicates L-1 Lowest Bidder &bull; Green indicates competitive pricing
          </span>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px] shadow-xs">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 py-2 px-2 border-r border-slate-200 text-center w-10">S.N.</th>
                <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 py-2 px-3 border-r border-slate-200 min-w-[200px]">Item Description</th>
                <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 py-2 px-3 border-r border-slate-200 text-right min-w-[100px]">L-1 Rate</th>
                {cs.vendors.map((vendor) => (
                  <th key={vendor.vendorId} className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 py-2.5 px-3 border-r border-slate-200 text-center font-extrabold text-slate-900 text-xs">
                    {vendor.vendorName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200">
              {cs.items.map((item, idx) => {
                const l1Info = itemL1Map[item.id];
                const lowestRate = l1Info?.l1Rate || 0;

                return (
                  <tr key={item.id} className="hover:bg-slate-50/80">
                    <td className="py-2 px-2 border-r border-slate-200 text-center font-mono text-slate-400">
                      {idx + 1}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 font-semibold text-slate-800">
                      {item.itemName}
                    </td>
                    <td className="py-2 px-3 border-r border-slate-200 text-right font-mono font-bold text-emerald-700 bg-emerald-50/40">
                      ₹{lowestRate.toFixed(2)}
                    </td>
                    {cs.vendors.map((vendor) => {
                      const quote = vendor.itemRates[item.id];
                      const rate = quote?.landedRate || 0;
                      let diffPercent = 0;
                      if (lowestRate > 0 && rate > 0) {
                        diffPercent = ((rate - lowestRate) / lowestRate) * 100;
                      }

                      const isL1 = l1Info && l1Info.l1VendorId === vendor.vendorId && rate > 0;

                      return (
                        <td
                          key={vendor.vendorId}
                          className={`py-2 px-3 border-r border-slate-200 text-center font-mono text-xs ${isL1 ? 'bg-emerald-100 text-emerald-950 font-black' : diffPercent > 20 ? 'bg-rose-50 text-rose-700' : 'text-slate-700'}`}
                        >
                          {rate === 0 ? (
                            <span className="text-slate-400 italic text-[11px]">Unquoted</span>
                          ) : isL1 ? (
                            <span className="font-black text-emerald-700">0.0% (L-1)</span>
                          ) : (
                            <span>+{diffPercent.toFixed(1)}%</span>
                          )}
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
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-indigo-400" />
            <h2 className="text-xs font-black tracking-tight text-white uppercase">
              3. Commercial Terms &amp; Conditions &amp; Vendor Evaluation
            </h2>
          </div>
          <span className="text-[10px] text-amber-300 font-bold">
            Strict Rule: Freight &amp; Delivery is OURS (Barbrik Project Ltd.) for all vendors
          </span>
        </div>

        <div className="overflow-x-auto overflow-y-auto max-h-[calc(100vh-250px)] relative">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="sticky top-0 z-20 bg-slate-100 text-slate-700 font-bold border-b border-slate-300 text-[11px] shadow-xs">
              <tr>
                <th className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 py-2.5 px-3 border-r border-slate-200 w-44">Evaluation Parameter</th>
                {cs.vendors.map((v) => (
                  <th key={v.vendorId} className="sticky top-0 z-20 bg-slate-100 border-b border-slate-300 py-2.5 px-3 border-r border-slate-200 text-center font-extrabold text-slate-900 text-xs">
                    {v.vendorName}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 text-xs">
              {/* Vendor Rating */}
              <tr>
                <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-600 bg-slate-50">
                  Vendor Rating / Status
                </td>
                {cs.vendors.map((v) => (
                  <td key={v.vendorId} className="py-2 px-3 border-r border-slate-200">
                    <input
                      type="text"
                      value={v.rating}
                      disabled={isRatesLocked}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'rating', e.target.value)}
                      className="w-full text-xs bg-transparent focus:bg-white border-b border-transparent focus:border-indigo-500 focus:outline-none"
                    />
                  </td>
                ))}
              </tr>

              {/* Contact Person & Mobile */}
              <tr>
                <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-600 bg-slate-50">
                  Contact Person &amp; Phone
                </td>
                {cs.vendors.map((v) => (
                  <td key={v.vendorId} className="py-2 px-3 border-r border-slate-200">
                    <input
                      type="text"
                      value={v.contactPersonMobile}
                      disabled={isRatesLocked}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'contactPersonMobile', e.target.value)}
                      className="w-full text-xs bg-transparent focus:bg-white border-b border-transparent focus:border-indigo-500 focus:outline-none"
                    />
                  </td>
                ))}
              </tr>

              {/* Payment Terms */}
              <tr>
                <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-600 bg-slate-50">
                  Payment Terms
                </td>
                {cs.vendors.map((v) => (
                  <td key={v.vendorId} className="py-2 px-3 border-r border-slate-200">
                    <input
                      type="text"
                      value={v.paymentTerms}
                      disabled={isRatesLocked}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'paymentTerms', e.target.value)}
                      className="w-full text-xs bg-transparent focus:bg-white border-b border-transparent focus:border-indigo-500 focus:outline-none"
                    />
                  </td>
                ))}
              </tr>

              {/* Warranty Period */}
              <tr>
                <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-600 bg-slate-50">
                  Warranty Period
                </td>
                {cs.vendors.map((v) => (
                  <td key={v.vendorId} className="py-2 px-3 border-r border-slate-200">
                    <input
                      type="text"
                      value={v.warrantyPeriod}
                      disabled={isRatesLocked}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'warrantyPeriod', e.target.value)}
                      className="w-full text-xs bg-transparent focus:bg-white border-b border-transparent focus:border-indigo-500 focus:outline-none"
                    />
                  </td>
                ))}
              </tr>

              {/* Freight & Delivery (STRICT RULE: OURS in uniform regular font) */}
              <tr>
                <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-600 bg-slate-50">
                  Freight &amp; Delivery Terms
                </td>
                {cs.vendors.map((v) => (
                  <td key={v.vendorId} className="py-2 px-3 border-r border-slate-200 font-normal text-slate-800">
                    OURS (Barbrik Project Ltd.)
                  </td>
                ))}
              </tr>

              {/* Quotation Validity */}
              <tr>
                <td className="py-2 px-3 border-r border-slate-200 font-bold text-slate-600 bg-slate-50">
                  Quotation Date &amp; Validity
                </td>
                {cs.vendors.map((v) => (
                  <td key={v.vendorId} className="py-2 px-3 border-r border-slate-200">
                    <input
                      type="text"
                      value={v.quotationDateValidity}
                      disabled={isRatesLocked}
                      onChange={(e) => handleUpdateVendorMeta(v.vendorId, 'quotationDateValidity', e.target.value)}
                      className="w-full text-xs bg-transparent focus:bg-white border-b border-transparent focus:border-indigo-500 focus:outline-none"
                    />
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* 7. TABLE 4: PROCUREMENT RECOMMENDATIONS & SAVINGS ANALYSIS */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <h2 className="text-xs font-black tracking-tight text-slate-900 uppercase flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-indigo-600" />
          <span>4. Procurement Executive Recommendation &amp; Justification</span>
        </h2>
        <textarea
          rows={3}
          value={cs.notes || ''}
          disabled={isRatesLocked}
          onChange={(e) => handleUpdateHeader('notes', e.target.value)}
          placeholder="Enter commercial recommendations, delivery urgency, or dual-vendor allocation rationale..."
          className="w-full text-xs p-3 bg-slate-50 focus:bg-white border border-slate-300 rounded-xl text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
        />
        <div className="text-[11px] text-slate-500 flex items-center justify-between">
          <span>
            Authorized Signatory: <strong className="text-slate-800">Pranjal Agrawal (Director)</strong>
          </span>
          <span>
            Prepared by: <strong className="text-slate-800">{cs.preparedBy || 'Shyam Rao Sureshe'}</strong>
          </span>
        </div>
      </div>

      {/* 8. SINGLE STICKY ACTION BAR (EXECUTIVE CHECKOUT) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-900 border-t border-slate-800 shadow-2xl px-4 py-3 sm:px-6">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Left: Final Total & Awarded Count */}
          <div className="flex items-center justify-between md:justify-start gap-4">
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {awardedSummary.totalAwardedValue > 0 ? 'Awarded Total' : 'Final Total'}
              </div>
              <div className="text-xl sm:text-2xl font-mono font-black text-amber-300">
                ₹{(awardedSummary.totalAwardedValue > 0 ? awardedSummary.totalAwardedValue : (splitPoOptimizedTotal || analytics.splitPoOptimizedTotal || 0)).toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-[11px] text-slate-400 border-l border-slate-700 pl-3">
              <div>{cs.items.length} items &bull; {cs.vendors.length} vendors</div>
              {awardedSummary.totalAwardedValue > 0 && (
                <div className="text-emerald-400 font-bold">{awardedSummary.totalItems} of {cs.items.length} awarded</div>
              )}
            </div>
          </div>

          {/* Right: Primary Buttons & Dropdown */}
          <div className="flex items-center gap-2 flex-wrap justify-end">
            {/* 1. Request Additional Quotation (Director in Stage 3 Approval) */}
            {effectiveMode === 'APPROVAL' && isPranjal && (
              <button
                type="button"
                onClick={() => setIsRequestAdditionalQuoteModalOpen(true)}
                className="px-3.5 py-2 bg-amber-600/30 hover:bg-amber-600/50 text-amber-300 border border-amber-500/50 font-bold rounded-xl text-xs transition-all flex items-center gap-1.5 cursor-pointer"
                title="Return requisition to Purchaser (Shyam) for additional vendor quotation (5h SLA)"
              >
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Request Additional Quotation</span>
              </button>
            )}

            {/* 2. Save Draft */}
            <button
              type="button"
              onClick={
                isEmbedded
                  ? (effectiveMode === 'APPROVAL' ? handleSaveDraftAwardInFms : handleSaveDraftInFms)
                  : handleSaveSheet
              }
              disabled={isRecordLocked}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 font-bold rounded-xl text-xs transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              title="Save work as draft"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isRecordLocked ? 'Saved (Locked)' : 'Save Draft'}</span>
            </button>

            {/* 3. Primary Submit / Approval Button */}
            {effectiveMode === 'APPROVAL' ? (
              isPranjal ? (
                !isRecordLocked ? (
                  <button
                    type="button"
                    onClick={handleDigitalSignAndApprove}
                    className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer"
                    title="Confirm award selections and digitally sign as Director Pranjal Agrawal"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-300" />
                    <span>Approve &amp; Digitally Sign</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => setIsApproveModalOpen(true)}
                    className="px-4 py-2 bg-emerald-950 text-emerald-200 border border-emerald-500/60 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs flex items-center gap-1.5"
                  >
                    <Lock className="w-3.5 h-3.5 text-amber-300" />
                    <span>Digitally Signed: Pranjal Agrawal</span>
                  </button>
                )
              ) : isRecordLocked ? (
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 bg-emerald-950 text-emerald-200 border border-emerald-500/60 rounded-xl text-xs font-bold shadow-xs opacity-80 cursor-not-allowed flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-300" />
                  <span>Digitally Signed: Pranjal Agrawal</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled
                  className="px-4 py-2 bg-slate-800 text-slate-400 border border-slate-700 rounded-xl text-xs font-bold shadow-xs cursor-not-allowed opacity-80 flex items-center gap-1.5"
                >
                  <Lock className="w-3.5 h-3.5 text-amber-400/80" />
                  <span>Awaiting Director Sign-off</span>
                </button>
              )
            ) : isStage2B ? (
              <button
                type="button"
                onClick={handleResubmitToDirector}
                disabled={isSaving}
                className="px-5 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-black rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
                title="Resubmit updated Comparative Statement to Director Pranjal Agrawal for Stage 3 Approval"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4 text-indigo-200" />}
                <span>Resubmit to Director</span>
              </button>
            ) : isEmbedded ? (
              <button
                type="button"
                onClick={handleSaveAndLinkToFms}
                disabled={isSaving}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                title="Strict Validation: requires all quantities matched, >= 2 vendors, and non-zero total value"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4 text-emerald-200" />}
                <span>Approve &amp; Digitally Sign</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(true)}
                disabled={isRecordLocked}
                className="px-5 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black rounded-xl text-xs shadow-lg transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ShieldCheck className="w-4 h-4 text-amber-300" />
                <span>Approve &amp; Digitally Sign</span>
              </button>
            )}

            {/* 4. Secondary actions dropdown ... menu */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsSecondaryMenuOpen(!isSecondaryMenuOpen)}
                className="p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl transition-all cursor-pointer"
                title="More actions"
              >
                <MoreVertical className="w-4 h-4" />
              </button>

              {isSecondaryMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40 bg-transparent"
                    onClick={() => setIsSecondaryMenuOpen(false)}
                  />
                  <div className="absolute bottom-full right-0 mb-2 w-56 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl p-1.5 z-50 text-xs space-y-0.5">
                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        downloadComparativeStatementPdf(cs);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <FileDown className="w-4 h-4 text-rose-400" />
                      <span>Export PDF</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        downloadComparativeStatementExcel(cs);
                      }}
                      className="w-full text-left px-3 py-2 text-slate-200 hover:bg-slate-800 hover:text-white rounded-lg flex items-center gap-2 cursor-pointer"
                    >
                      <Download className="w-4 h-4 text-emerald-400" />
                      <span>Export Excel</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        setIsSecondaryMenuOpen(false);
                        handleAutoFillAllL1();
                      }}
                      disabled={!isAwardEditable}
                      className="w-full text-left px-3 py-2 text-amber-300 hover:bg-slate-800 rounded-lg flex items-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      <Award className="w-4 h-4 text-amber-400" />
                      <span>Auto-Fill All L-1</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </div>

      </div>

      {/* AI WHATSAPP & IMAGE QUOTE IMPORT MODAL */}
      {isPasteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-3xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
            {/* Modal Header */}
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md">
                  <Sparkles className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black tracking-tight">AI WhatsApp &amp; Image Quotation Import</h3>
                  <p className="text-xs text-slate-300">
                    Upload vendor quote image/PDF or paste WhatsApp message to auto-extract rates into CS matrix
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPasteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 text-xs text-slate-800">
              {/* Import Mode Tabs */}
              <div className="flex border-b border-slate-200 gap-4">
                <button
                  type="button"
                  onClick={() => setImportTab('image')}
                  className={`pb-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    importTab === 'image'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <Camera className="w-4 h-4" />
                  <span>Quotation Photo / Document Scan</span>
                </button>
                <button
                  type="button"
                  onClick={() => setImportTab('text')}
                  className={`pb-2.5 font-bold text-xs flex items-center gap-2 border-b-2 transition-all cursor-pointer ${
                    importTab === 'text'
                      ? 'border-indigo-600 text-indigo-700'
                      : 'border-transparent text-slate-500 hover:text-slate-800'
                  }`}
                >
                  <ClipboardPaste className="w-4 h-4" />
                  <span>WhatsApp Message / Chat Paste</span>
                </button>
              </div>

              {/* Tab 1: Image / PDF Upload */}
              {importTab === 'image' && (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-slate-300 hover:border-indigo-500 rounded-2xl p-6 text-center bg-slate-50/50 transition-colors cursor-pointer relative">
                    <input
                      type="file"
                      accept="image/*,application/pdf"
                      onChange={handleImageUpload}
                      className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                    />
                    <div className="space-y-2">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <div className="text-xs font-bold text-slate-700">
                        {quoteImageBase64 ? 'Document Ready for AI Analysis' : 'Click to Upload Quotation Photo or PDF'}
                      </div>
                      <p className="text-[11px] text-slate-400">
                        PNG, JPG, WEBP, or PDF scans of vendor bills or handwritten rate slips
                      </p>
                    </div>
                  </div>

                  {quoteImageBase64 && (
                    <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center justify-between text-xs text-emerald-800 font-bold">
                      <div className="flex items-center gap-2">
                        <Check className="w-4 h-4 text-emerald-600" />
                        <span>Document loaded successfully &bull; Ready to extract</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setQuoteImageBase64(null);
                          setQuoteMimeType(null);
                        }}
                        className="text-rose-600 text-xs hover:underline cursor-pointer"
                      >
                        Remove
                      </button>
                    </div>
                  )}
                </div>
              )}

              {/* Tab 2: WhatsApp Chat Paste */}
              {importTab === 'text' && (
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-700">
                    Paste WhatsApp Quote Message:
                  </label>
                  <textarea
                    rows={6}
                    value={rawQuoteInput}
                    onChange={(e) => setRawQuoteInput(e.target.value)}
                    placeholder={`e.g.\nShanti Earthmovers:\nGrease nipple 8no: ₹45/pc + 18% GST\nOil filter LF-3959: ₹850/pc inclusive GST\nHydraulic filter HF-6510: ₹1650/pc + 18% GST\nFreight OURS, delivery immediate`}
                    className="w-full text-xs p-3 font-mono bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
              )}

              {/* Extract Action Button */}
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleExtractQuoteWithAi}
                  disabled={isExtractingAi || (importTab === 'image' && !quoteImageBase64) || (importTab === 'text' && !rawQuoteInput.trim())}
                  className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-500 hover:to-indigo-600 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isExtractingAi ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin text-amber-300" />
                      <span>Analyzing Quotation with AI...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 text-amber-300" />
                      <span>Extract Rates with AI</span>
                    </>
                  )}
                </button>
              </div>

              {/* Extracted Review Section */}
              {extractedItemsReview.length > 0 && (
                <div className="space-y-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <span className="font-black text-xs uppercase text-slate-900 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                      <span>Review Extracted Rates ({extractedItemsReview.length} Items Found)</span>
                    </span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      Vendor: <strong className="text-slate-800">{extractedVendorName || 'New Vendor'}</strong>
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Vendor Name</label>
                      <input
                        type="text"
                        value={extractedVendorName}
                        onChange={(e) => setExtractedVendorName(e.target.value)}
                        className="w-full text-xs font-bold bg-white border border-slate-300 rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">GST Terms</label>
                      <input
                        type="text"
                        value={extractedGstTerms}
                        onChange={(e) => setExtractedGstTerms(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded px-2 py-1"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase">Payment Terms</label>
                      <input
                        type="text"
                        value={extractedPaymentTerms}
                        onChange={(e) => setExtractedPaymentTerms(e.target.value)}
                        className="w-full text-xs bg-white border border-slate-300 rounded px-2 py-1"
                      />
                    </div>
                  </div>

                  {/* Review Table */}
                  <div className="overflow-x-auto border border-slate-200 rounded-xl">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-slate-100 font-bold text-slate-700">
                        <tr>
                          <th className="py-2 px-2 text-center w-8">Include</th>
                          <th className="py-2 px-3">Extracted Item Name</th>
                          <th className="py-2 px-2">Matched CS Item</th>
                          <th className="py-2 px-2 text-right">Base Rate</th>
                          <th className="py-2 px-2 text-center">GST %</th>
                          <th className="py-2 px-2 text-right">Landed Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-200">
                        {extractedItemsReview.map((it, idx) => {
                          const landed = it.baseRate + (it.baseRate * it.gstPercent) / 100;
                          return (
                            <tr key={it.id} className="hover:bg-slate-50">
                              <td className="py-2 px-2 text-center">
                                <input
                                  type="checkbox"
                                  checked={it.included}
                                  onChange={(e) => {
                                    const copy = [...extractedItemsReview];
                                    copy[idx].included = e.target.checked;
                                    setExtractedItemsReview(copy);
                                  }}
                                  className="w-3.5 h-3.5 text-indigo-600 rounded cursor-pointer"
                                />
                              </td>
                              <td className="py-2 px-3 font-semibold text-slate-800">{it.itemRawName}</td>
                              <td className="py-2 px-2">
                                <select
                                  value={it.matchedItemId || ''}
                                  onChange={(e) => {
                                    const copy = [...extractedItemsReview];
                                    copy[idx].matchedItemId = e.target.value;
                                    setExtractedItemsReview(copy);
                                  }}
                                  className="w-full text-xs bg-white border border-slate-300 rounded px-2 py-1"
                                >
                                  <option value="">-- Match CS Item --</option>
                                  {cs.items.map((csItem) => (
                                    <option key={csItem.id} value={csItem.id}>
                                      {csItem.sn}. {csItem.itemName}
                                    </option>
                                  ))}
                                </select>
                              </td>
                              <td className="py-2 px-2 text-right font-mono font-bold text-slate-800">
                                ₹{it.baseRate.toFixed(2)}
                              </td>
                              <td className="py-2 px-2 text-center font-mono text-slate-600">{it.gstPercent}%</td>
                              <td className="py-2 px-2 text-right font-mono font-black text-indigo-700">
                                ₹{landed.toFixed(2)}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>

                  {/* Apply Actions */}
                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-500 text-[11px]">
                      Select vendor column to populate or create new vendor column:
                    </span>
                    <div className="flex items-center gap-2">
                      <select
                        id="target-vendor-select"
                        className="text-xs bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 font-bold"
                      >
                        <option value="">-- Create New Vendor Column --</option>
                        {cs.vendors.map((v) => (
                          <option key={v.vendorId} value={v.vendorId}>
                            Update: {v.vendorName}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => {
                          const sel = (document.getElementById('target-vendor-select') as HTMLSelectElement)?.value;
                          handleApplyExtractedQuote(sel || undefined);
                        }}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Apply &amp; Auto-Fill CS Vendor Column</span>
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* DIGITAL APPROVAL MODAL - STRICTLY PRANJAL AGRAWAL */}
      {isApproveModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black">
                  <ShieldCheck className="w-5 h-5 text-amber-300" />
                </div>
                <div>
                  <h3 className="text-base font-black">Director Executive Sign &amp; Approve</h3>
                  <p className="text-xs text-slate-300">Official digital signing lock for Barbrik CS Sheet</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsApproveModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-800">
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-xl space-y-2">
                <div className="flex items-center gap-2 font-bold text-emerald-950">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Authorized Signatory Credentials</span>
                </div>
                <div className="text-[11px] text-emerald-900 space-y-0.5">
                  <p>Signatory: <strong className="font-extrabold">Pranjal Agrawal</strong></p>
                  <p>Designation: <span className="font-semibold">Finance Approver / Director</span></p>
                  <p>Prepared By: <span className="font-semibold">{cs.preparedBy || 'Shyam Rao Sureshe'}</span></p>
                  <p>Total Split PO Optimized Value: <strong className="font-mono font-bold">₹{splitPoOptimizedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}</strong></p>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-700">Approval Remarks &amp; Directives</label>
                <textarea
                  rows={3}
                  value={approvalRemarks}
                  onChange={(e) => setApprovalRemarks(e.target.value)}
                  placeholder="Enter executive directives or split PO instructions..."
                  className="w-full text-xs p-3 bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsApproveModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleDigitalSignAndApprove}
                  className="px-6 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-1.5 cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4 text-amber-300" />
                  <span>Confirm Digital Signature (Pranjal Agrawal)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SPLIT PO GENERATION SUCCESS MODAL */}
      {isSplitPoModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black">
                  <Zap className="w-5 h-5 text-slate-950" />
                </div>
                <div>
                  <h3 className="text-base font-black">Split Purchase Orders Generated</h3>
                  <p className="text-xs text-slate-300">{createdSplitPos.length} discrete PO workflows created in FMS</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsSplitPoModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-800">
              <div className="space-y-2">
                {createdSplitPos.map((flowInstance) => (
                  <div key={flowInstance.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                    <div>
                      <div className="font-bold text-slate-900">{flowInstance.poNumber || flowInstance.indentNo}</div>
                      <div className="text-[11px] text-slate-500">
                        Vendor: {flowInstance.vendorName} &bull; Site: {flowInstance.siteName}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-mono font-bold text-indigo-700">₹{(flowInstance.poAmount || 0).toLocaleString('en-IN')}</div>
                      <div className="text-[10px] text-emerald-600 font-bold">Stage: PO Issued</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsSplitPoModalOpen(false)}
                  className="px-5 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl text-xs cursor-pointer"
                >
                  Done
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IMPORT FROM INDENT MODAL */}
      {isImportIndentOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-3">
                <FolderOpen className="w-5 h-5 text-amber-300" />
                <h3 className="text-base font-black">Load Items from Purchase FMS Indents</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsImportIndentOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-3 text-xs max-h-[60vh] overflow-y-auto">
              {purchaseFlows.map((f) => (
                <div
                  key={f.id}
                  onClick={() => handleImportFromFlow(f)}
                  className="p-3.5 bg-slate-50 hover:bg-indigo-50/60 border border-slate-200 hover:border-indigo-300 rounded-xl transition-all cursor-pointer flex items-center justify-between"
                >
                  <div>
                    <div className="font-bold text-slate-900">
                      Indent #{f.indentNo || f.requisitionNumber} &bull; {f.siteName}
                    </div>
                    <div className="text-[11px] text-slate-500">
                      {f.remarks || 'Standard requisition'} &bull; Priority: {f.priority}
                    </div>
                  </div>
                  <span className="text-xs text-indigo-600 font-bold flex items-center gap-1">
                    <span>Import</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      {/* REQUEST ADDITIONAL QUOTATION MODAL (DIRECTOR -> PURCHASER 5H SLA) */}
      {isRequestAdditionalQuoteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
          <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col animate-in fade-in duration-200">
            <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
              <div className="flex items-center gap-2.5">
                <div className="p-2 bg-amber-500/20 rounded-xl border border-amber-500/30 text-amber-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-black">Request Additional Quotation</h3>
                  <p className="text-xs text-slate-400">Return to Purchaser (Shyam) with specific directives</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsRequestAdditionalQuoteModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-800">
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 space-y-1">
                <p className="font-bold flex items-center gap-1">
                  <Clock className="w-4 h-4 text-amber-600" />
                  <span>SLA Clock Shift: Director &rarr; Purchaser (5-Hour SLA)</span>
                </p>
                <p className="text-[11px] text-amber-800">
                  This action marks Stage 3 as <strong>Returned to Purchaser</strong> (stopping the Director&apos;s SLA clock) and spawns <strong>Stage 2B</strong> with a 5-hour SLA assigned strictly to Purchase Executive Shyam Rao Sureshe.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block font-bold text-slate-900">
                  Director Directives &amp; Quotation Instructions <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={4}
                  value={requestQuoteInstructions}
                  onChange={(e) => setRequestQuoteInstructions(e.target.value)}
                  placeholder='e.g. "Get rate for branded item from Vendor Y" or "Negotiate 5% additional discount on hydraulic pumps with Mahavir Traders"...'
                  className="w-full text-xs p-3 border border-slate-300 rounded-xl bg-white focus:ring-2 focus:ring-amber-500 focus:outline-none font-medium"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setIsRequestAdditionalQuoteModalOpen(false)}
                  className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={!requestQuoteInstructions.trim() || isSaving}
                  onClick={() => handleReturnToPurchaser(requestQuoteInstructions)}
                  className="px-5 py-2 bg-amber-600 hover:bg-amber-500 text-white font-black rounded-xl text-xs shadow-md transition-all flex items-center gap-1.5 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <AlertTriangle className="w-4 h-4 text-amber-200" />}
                  <span>Return to Purchaser (5h SLA)</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
