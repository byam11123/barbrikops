import React, { useState, useEffect } from 'react';
import {
  X,
  Boxes,
  Truck,
  ShoppingCart,
  Archive,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  Info,
  Layers,
  Save,
  Building2,
  Plus
} from 'lucide-react';
import { FmsInstance, FmsLineItem, UserProfile, InventoryItem } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';
import { QuickAddInventoryModal } from '../ims/QuickAddInventoryModal';

export function getStockAtStore(
  inventoryItems: InventoryItem[],
  itemName: string,
  storeLocation: string
): number {
  if (!inventoryItems || !itemName) return 0;
  const itemLower = itemName.toLowerCase().trim();
  const match = inventoryItems.find(
    inv =>
      (inv.location === storeLocation || (storeLocation.toLowerCase().includes('central') && inv.location === 'Central Store')) &&
      (inv.name.toLowerCase().includes(itemLower) || itemLower.includes(inv.name.toLowerCase()))
  );
  return match ? match.currentStock : 0;
}

export interface StoreTriageModalProps {
  flow: FmsInstance;
  currentUser: UserProfile;
  readOnly?: boolean;
  onClose: () => void;
  onCompleteTriage: (
    updatedFlow: FmsInstance,
    triageSummary: {
      storeDispatchCount: number;
      purchaseCount: number;
      archivedCount: number;
      triageNotes: string;
    }
  ) => void;
}

export const StoreTriageModal: React.FC<StoreTriageModalProps> = ({
  flow,
  currentUser,
  readOnly = false,
  onClose,
  onCompleteTriage,
}) => {
  const masterSites = storageAdapter.getMasterSites();
  const otherSiteOptions = masterSites.filter(s => s !== 'Central Store');
  const defaultOtherSite = otherSiteOptions[0] || 'Bijetala Site';

  // Strict mathematical stock and routing calculation helper
  const calculateStockAndRouting = (
    item: FmsLineItem,
    csrStock: number,
    otherStock: number,
    siteName?: string,
    forcedAlloc?: 'STORE_DISPATCH' | 'PURCHASE_REQUISITION' | 'HELD_ARCHIVED'
  ): FmsLineItem => {
    const reqQty = item.qty || 1;
    const totalAvail = csrStock + otherStock;
    const stockSite = siteName || item.stockSiteName || defaultOtherSite;

    // Check manual override (Archive)
    const isArchived = forcedAlloc === 'HELD_ARCHIVED' || (forcedAlloc === undefined && item.triageAllocation === 'HELD_ARCHIVED');

    if (isArchived) {
      return {
        ...item,
        csrStock,
        otherSiteStock: otherStock,
        stockSiteName: stockSite,
        storeStockQtyAvailable: totalAvail,
        csrQty: 0,
        otherSiteQty: 0,
        storeQty: 0,
        purchaseQty: 0,
        purchaseQtyRequired: 0,
        holdQty: reqQty,
        triageAllocation: 'HELD_ARCHIVED',
        dispatchSource: 'Central Store',
      };
    }

    // Mathematical Stock Logic:
    // Purchase Qty = Math.max(0, Req Qty - (CSR Stock + Other Site Stock))
    let csrQty = 0;
    let otherSiteQty = 0;
    let purchaseQtyRequired = 0;
    let triageAllocation: 'STORE_DISPATCH' | 'PURCHASE_REQUISITION' | 'HELD_ARCHIVED' = 'STORE_DISPATCH';

    if (totalAvail >= reqQty) {
      // 1. Total Avail >= Req Qty -> Store Dispatch ACTIVE, Purchase Qty = 0, Purchase DISABLED
      triageAllocation = 'STORE_DISPATCH';
      csrQty = Math.min(reqQty, csrStock);
      otherSiteQty = Math.min(reqQty - csrQty, otherStock);
      purchaseQtyRequired = 0;
    } else if (totalAvail === 0) {
      // 2. Total Avail == 0 -> Purchase ACTIVE, Purchase Qty = Req Qty, Store Dispatch DISABLED
      triageAllocation = 'PURCHASE_REQUISITION';
      csrQty = 0;
      otherSiteQty = 0;
      purchaseQtyRequired = reqQty;
    } else {
      // 3. 0 < Total Avail < Req Qty -> Split Routing
      triageAllocation = 'STORE_DISPATCH';
      csrQty = Math.min(reqQty, csrStock);
      otherSiteQty = Math.min(reqQty - csrQty, otherStock);
      purchaseQtyRequired = Math.max(0, reqQty - (csrQty + otherSiteQty));
    }

    const dispatchSource = csrQty > 0 && otherSiteQty > 0
      ? `Central Store & ${stockSite}`
      : csrQty > 0
      ? 'Central Store'
      : otherSiteQty > 0
      ? stockSite
      : 'Central Store';

    return {
      ...item,
      csrStock,
      otherSiteStock: otherStock,
      stockSiteName: stockSite,
      storeStockQtyAvailable: totalAvail,
      csrQty,
      otherSiteQty,
      storeQty: csrQty + otherSiteQty,
      purchaseQty: purchaseQtyRequired,
      purchaseQtyRequired,
      holdQty: 0,
      triageAllocation,
      dispatchSource,
    };
  };

  // Load initial line items from flow or initialize default line item if empty
  const [lineItems, setLineItems] = useState<FmsLineItem[]>(() => {
    let rawCandidate: any[] = [];
    if (flow.lineItems && flow.lineItems.length > 0) {
      rawCandidate = flow.lineItems;
    } else if (flow.instanceDataPool?.requisitionItems && Array.isArray(flow.instanceDataPool.requisitionItems)) {
      rawCandidate = flow.instanceDataPool.requisitionItems;
    } else if (flow.instanceDataPool?.lineItems && Array.isArray(flow.instanceDataPool.lineItems)) {
      rawCandidate = flow.instanceDataPool.lineItems;
    } else if (flow.instanceDataPool?.multiItems && Array.isArray(flow.instanceDataPool.multiItems)) {
      rawCandidate = flow.instanceDataPool.multiItems;
    } else if (flow.stages?.[0]?.submittedData?.requisitionItems && Array.isArray(flow.stages[0].submittedData.requisitionItems)) {
      rawCandidate = flow.stages[0].submittedData.requisitionItems;
    } else if (flow.stages?.[0]?.submittedData?.multiItems && Array.isArray(flow.stages[0].submittedData.multiItems)) {
      rawCandidate = flow.stages[0].submittedData.multiItems;
    } else {
      rawCandidate = [
        {
          id: 'ITEM-1',
          itemDescription: flow.title || 'Requested Indent Line Material',
          qty: 1,
          unit: 'Nos',
          urgency: 'NORMAL' as const,
        }
      ];
    }

    const rawItems: FmsLineItem[] = rawCandidate.map((item: any, idx: number) => {
      const q = parseFloat(item.qty || item.quantity || item.requestedQty || item.ordered_qty) || 1;
      return {
        id: item.id || `ITEM-${idx + 1}`,
        itemDescription: item.itemDescription || item.item_description || item.description || `Item #${idx + 1}`,
        qty: q,
        requestedQty: q,
        unit: item.unit || 'Nos',
        urgency: item.urgency || ('NORMAL' as const),
        remark: item.remarks || item.remark || item.workPurpose || item.work_purpose || '',
        csrStock: item.csrStock,
        otherSiteStock: item.otherSiteStock,
        stockSiteName: item.stockSiteName,
        triageAllocation: item.triageAllocation,
      };
    });

    const inventoryItems = storageAdapter.getInventoryItems();

    return rawItems.map(item => {
      const autoCsrStock = item.csrStock ?? getStockAtStore(inventoryItems, item.itemDescription, 'Central Store');
      const otherStock = item.otherSiteStock ?? 0;
      const siteName = item.stockSiteName || defaultOtherSite;

      return calculateStockAndRouting(item, autoCsrStock, otherStock, siteName);
    });
  });

  const [triageNotes, setTriageNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const handleCsrStockChange = (idx: number, val: number) => {
    if (readOnly) return;
    setLineItems(prev => {
      const next = [...prev];
      const cur = next[idx];
      const newCsrStock = Math.max(0, val);
      next[idx] = calculateStockAndRouting(cur, newCsrStock, cur.otherSiteStock || 0, cur.stockSiteName);
      return next;
    });
  };

  const handleOtherSiteStockChange = (idx: number, val: number) => {
    if (readOnly) return;
    setLineItems(prev => {
      const next = [...prev];
      const cur = next[idx];
      const newOtherStock = Math.max(0, val);
      next[idx] = calculateStockAndRouting(cur, cur.csrStock || 0, newOtherStock, cur.stockSiteName);
      return next;
    });
  };

  const handleStockSiteNameChange = (idx: number, siteName: string) => {
    if (readOnly) return;
    setLineItems(prev => {
      const next = [...prev];
      const cur = next[idx];
      next[idx] = calculateStockAndRouting(cur, cur.csrStock || 0, cur.otherSiteStock || 0, siteName);
      return next;
    });
  };

  const handleToggleArchive = (idx: number) => {
    if (readOnly) return;
    setLineItems(prev => {
      const next = [...prev];
      const cur = next[idx];
      if (cur.triageAllocation === 'HELD_ARCHIVED') {
        // Toggle OFF archive -> revert to mathematical stock routing
        next[idx] = calculateStockAndRouting(
          cur,
          cur.csrStock || 0,
          cur.otherSiteStock || 0,
          cur.stockSiteName,
          'STORE_DISPATCH'
        );
      } else {
        // Toggle ON archive -> manual override
        next[idx] = calculateStockAndRouting(
          cur,
          cur.csrStock || 0,
          cur.otherSiteStock || 0,
          cur.stockSiteName,
          'HELD_ARCHIVED'
        );
      }
      return next;
    });
  };

  const storeCount = lineItems.filter(i => i.triageAllocation !== 'HELD_ARCHIVED' && ((i.csrQty || 0) + (i.otherSiteQty || 0)) > 0).length;
  const purchaseCount = lineItems.filter(i => i.triageAllocation !== 'HELD_ARCHIVED' && (i.purchaseQtyRequired || 0) > 0).length;
  const archivedCount = lineItems.filter(i => i.triageAllocation === 'HELD_ARCHIVED').length;

  const handleSubmitTriage = () => {
    setIsSubmitting(true);

    const preparedLineItems: FmsLineItem[] = lineItems.map((item, idx) => {
      const isArchived = item.triageAllocation === 'HELD_ARCHIVED';
      const reqQty = Number(item.qty || 1);
      const csr = Number(item.csrQty || 0);
      const other = Number(item.otherSiteQty || 0);
      const storeQ = csr + other;
      const purchQ = Number(item.purchaseQtyRequired || 0);

      return {
        ...item,
        id: item.id || `ITEM-${idx + 1}`,
        itemDescription: item.itemDescription || 'Material Item',
        qty: reqQty,
        requestedQty: reqQty,
        csrStock: item.csrStock ?? 0,
        otherSiteStock: item.otherSiteStock ?? 0,
        stockSiteName: item.stockSiteName || defaultOtherSite,
        csrQty: csr,
        otherSiteQty: other,
        storeQty: isArchived ? 0 : storeQ,
        purchaseQty: isArchived ? 0 : purchQ,
        purchaseQtyRequired: isArchived ? 0 : purchQ,
        holdQty: isArchived ? reqQty : 0,
        triageAllocation: item.triageAllocation,
      };
    });

    const { updatedParent } = storageAdapter.splitIndentForPurchaseAndStore(
      flow,
      preparedLineItems,
      triageNotes,
      currentUser
    );

    const resultingFlow = updatedParent || flow;
    resultingFlow.lineItems = preparedLineItems;

    setTimeout(() => {
      onCompleteTriage(resultingFlow, {
        storeDispatchCount: storeCount,
        purchaseCount: purchaseCount,
        archivedCount: archivedCount,
        triageNotes,
      });
      setIsSubmitting(false);
    }, 400);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-5xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-500/30">
              <Boxes className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-400/30">
                  STAGE 2 MULTI-STORE TRIAGE
                </span>
                <span className="text-xs text-slate-400">Indent #{flow.indentNo || flow.requisitionNumber}</span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                Multi-Store Stock Triage & Pipeline Split
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Triage Overview Metrics */}
        <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 grid grid-cols-1 sm:grid-cols-4 gap-3 text-xs shrink-0">
          <div className="p-2.5 bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
            <Layers className="w-4 h-4 text-slate-500 shrink-0" />
            <div>
              <p className="text-slate-500 dark:text-slate-400 font-medium">Total Line Items</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{lineItems.length} Items</p>
            </div>
          </div>
          <div className="p-2.5 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl border border-emerald-200 dark:border-emerald-800/50 flex items-center gap-2.5">
            <Truck className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
            <div>
              <p className="text-emerald-700 dark:text-emerald-400 font-medium">Store Dispatch</p>
              <p className="text-sm font-bold text-emerald-800 dark:text-emerald-300">{storeCount} Items</p>
            </div>
          </div>
          <div className="p-2.5 bg-amber-50 dark:bg-amber-950/30 rounded-xl border border-amber-200 dark:border-amber-800/50 flex items-center gap-2.5">
            <ShoppingCart className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
            <div>
              <p className="text-amber-700 dark:text-amber-400 font-medium">Purchase Pipeline</p>
              <p className="text-sm font-bold text-amber-800 dark:text-amber-300">{purchaseCount} Items</p>
            </div>
          </div>
          <div className="p-2.5 bg-slate-100 dark:bg-slate-800 rounded-xl border border-slate-300 dark:border-slate-700 flex items-center gap-2.5">
            <Archive className="w-4 h-4 text-slate-600 dark:text-slate-400 shrink-0" />
            <div>
              <p className="text-slate-600 dark:text-slate-400 font-medium">Archived / Hold</p>
              <p className="text-sm font-bold text-slate-900 dark:text-white">{archivedCount} Items</p>
            </div>
          </div>
        </div>

        {/* Line Item Triage Table */}
        <div className="p-6 overflow-y-auto space-y-4 flex-1">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <span>Requested Material Line Breakdown</span>
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Type physical stock counts at CSR and other sites. Routing and Purchase Qty are locked to mathematical stock balance.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsQuickAddOpen(true)}
                className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-lg shadow-xs transition-colors flex items-center gap-1 cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Quick Add SKU</span>
              </button>
              <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/40">
                ⚡ Multi-Store Triage Active
              </span>
            </div>
          </div>

          <QuickAddInventoryModal
            isOpen={isQuickAddOpen}
            onClose={() => setIsQuickAddOpen(false)}
            onSuccess={() => {
              const inv = storageAdapter.getInventoryItems();
              setLineItems(prev => prev.map(item => {
                const autoCsr = getStockAtStore(inv, item.itemDescription, 'Central Store');
                if (autoCsr > 0 && (item.csrStock === 0 || !item.csrStock)) {
                  return calculateStockAndRouting(item, autoCsr, item.otherSiteStock || 0, item.stockSiteName);
                }
                return item;
              }));
            }}
          />

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3 min-w-[160px]">Material Description</th>
                  <th className="py-2.5 px-3 w-20 text-center">Req Qty</th>
                  <th className="py-2.5 px-3 w-24 text-center bg-indigo-50/50 dark:bg-indigo-950/20">CSR Stock</th>
                  <th className="py-2.5 px-3 w-28 text-center bg-blue-50/50 dark:bg-blue-950/20">Other Site Stock</th>
                  <th className="py-2.5 px-3 w-36 text-center">Stock Site Name</th>
                  <th className="py-2.5 px-3 w-24 text-center">Total Avail</th>
                  <th className="py-2.5 px-3 w-24 text-center">Purchase Qty</th>
                  <th className="py-2.5 px-3 text-center">Triage Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {lineItems.map((item, idx) => {
                  const csrStockVal = item.csrStock ?? 0;
                  const otherStockVal = item.otherSiteStock ?? 0;
                  const totalAvail = csrStockVal + otherStockVal;
                  const reqQty = item.qty || 1;
                  const isArchived = item.triageAllocation === 'HELD_ARCHIVED';

                  // Mathematically calculated Purchase Qty = Math.max(0, Req Qty - Total Avail)
                  const purchaseQty = item.purchaseQtyRequired ?? Math.max(0, reqQty - totalAvail);

                  // Build clear dispatch statement preview
                  const csrQtyUsed = item.csrQty || 0;
                  const otherQtyUsed = item.otherSiteQty || 0;
                  const siteNameUsed = item.stockSiteName || defaultOtherSite;

                  let dispatchPreviewStr = '';
                  if (!isArchived && (csrQtyUsed > 0 || otherQtyUsed > 0)) {
                    if (csrQtyUsed > 0 && otherQtyUsed > 0) {
                      dispatchPreviewStr = `Dispatch ${csrQtyUsed} from Central Store and ${otherQtyUsed} from ${siteNameUsed}`;
                    } else if (csrQtyUsed > 0) {
                      dispatchPreviewStr = `Dispatch ${csrQtyUsed} from Central Store`;
                    } else if (otherQtyUsed > 0) {
                      dispatchPreviewStr = `Dispatch ${otherQtyUsed} from ${siteNameUsed}`;
                    }
                  }

                  return (
                    <tr key={item.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                      <td className="py-3 px-3 font-mono text-slate-500">{idx + 1}</td>
                      <td className="py-3 px-3">
                        <p className="font-semibold text-slate-900 dark:text-white">{item.itemDescription}</p>
                        {item.remark && <p className="text-[11px] text-slate-500 mt-0.5">{item.remark}</p>}
                        {!isArchived && dispatchPreviewStr && (
                          <p className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 mt-1 flex items-center gap-1">
                            <Truck className="w-3 h-3" />
                            <span>{dispatchPreviewStr}</span>
                          </p>
                        )}
                        {isArchived && (
                          <p className="text-[11px] font-bold text-slate-500 mt-1 flex items-center gap-1">
                            <Archive className="w-3 h-3" />
                            <span>Material Put On Hold / Archived</span>
                          </p>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                        {reqQty} {item.unit}
                      </td>

                      {/* 1. CSR Stock Column */}
                      <td className="py-3 px-3 text-center bg-indigo-50/30 dark:bg-indigo-950/10">
                        <input
                          type="number"
                          min={0}
                          value={csrStockVal}
                          disabled={readOnly}
                          onChange={(e) => handleCsrStockChange(idx, parseInt(e.target.value) || 0)}
                          className="w-16 text-center py-1 px-1 border border-indigo-200 dark:border-indigo-800 rounded bg-white dark:bg-slate-800 font-bold text-indigo-900 dark:text-indigo-200 focus:ring-2 focus:ring-indigo-500 outline-none"
                          title="Central Store / Raipur Workshop physical stock count"
                        />
                      </td>

                      {/* 2. Other Site Stock Column */}
                      <td className="py-3 px-3 text-center bg-blue-50/30 dark:bg-blue-950/10">
                        <input
                          type="number"
                          min={0}
                          value={otherStockVal}
                          disabled={readOnly}
                          onChange={(e) => handleOtherSiteStockChange(idx, parseInt(e.target.value) || 0)}
                          className="w-16 text-center py-1 px-1 border border-blue-200 dark:border-blue-800 rounded bg-white dark:bg-slate-800 font-bold text-blue-900 dark:text-blue-200 focus:ring-2 focus:ring-blue-500 outline-none"
                          title="Stock available at other sites"
                        />
                      </td>

                      {/* 3. Stock Site Name Column */}
                      <td className="py-3 px-3 text-center">
                        <select
                          value={item.stockSiteName || defaultOtherSite}
                          disabled={readOnly || !(otherStockVal > 0)}
                          onChange={(e) => handleStockSiteNameChange(idx, e.target.value)}
                          className="w-full text-xs py-1 px-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 text-slate-900 dark:text-white disabled:opacity-40 cursor-pointer"
                        >
                          {masterSites.map((site) => (
                            <option key={site} value={site}>
                              {site}
                            </option>
                          ))}
                        </select>
                      </td>

                      {/* Total Available */}
                      <td className="py-3 px-3 text-center">
                        <span
                          className={`inline-flex items-center gap-1 font-bold px-2 py-0.5 rounded text-xs ${
                            totalAvail >= reqQty
                              ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                              : totalAvail > 0
                              ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                              : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                          }`}
                        >
                          {totalAvail} {item.unit}
                        </span>
                      </td>

                      {/* Purchase Qty - Mathematically Locked */}
                      <td className="py-3 px-3 text-center font-bold">
                        <input
                          type="number"
                          min={0}
                          max={reqQty}
                          value={isArchived ? 0 : purchaseQty}
                          readOnly
                          disabled
                          className={`w-16 text-center py-1 px-1 border rounded font-bold text-xs ${
                            isArchived
                              ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 opacity-50 cursor-not-allowed'
                              : purchaseQty === 0
                              ? 'bg-slate-100 text-slate-400 border-slate-200 dark:bg-slate-800 opacity-60 font-semibold cursor-not-allowed'
                              : 'bg-amber-50 text-amber-900 border-amber-300 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-700'
                          }`}
                          title={
                            totalAvail >= reqQty
                              ? 'Stock math dictates Purchase Qty = 0 (Total stock covers full requisition)'
                              : `Purchase Qty auto-calculated: Math.max(0, ${reqQty} - ${totalAvail}) = ${purchaseQty}`
                          }
                        />
                      </td>

                      {/* Triage Action Buttons - Strict Mathematical Radio Behavior */}
                      <td className="py-3 px-3">
                        <div className="flex items-center justify-center gap-1">
                          {/* 1. Store Dispatch Button */}
                          {(() => {
                            const isFullStock = totalAvail >= reqQty;
                            const isPartialStock = totalAvail > 0 && totalAvail < reqQty;
                            const isZeroStock = totalAvail === 0;

                            const isStoreActive = !isArchived && (isFullStock || isPartialStock);
                            const isStoreDisabled = readOnly || isZeroStock;

                            return (
                              <button
                                type="button"
                                disabled={isStoreDisabled}
                                onClick={() => {
                                  if (isArchived) handleToggleArchive(idx);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                  isStoreActive
                                    ? 'bg-emerald-600 text-white shadow-xs ring-2 ring-emerald-500/40'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed'
                                }`}
                                title={
                                  isZeroStock
                                    ? 'Stock math dictates this route: 0 stock available in stores'
                                    : isFullStock
                                    ? 'Store Dispatch Active: Total stock covers full requisition'
                                    : `Partial Store Dispatch Active (${totalAvail} of ${reqQty} in stock)`
                                }
                              >
                                <Truck className="w-3.5 h-3.5" />
                                <span>
                                  {isPartialStock ? `Dispatch (${totalAvail})` : 'Store Dispatch'}
                                </span>
                              </button>
                            );
                          })()}

                          {/* 2. Purchase Button */}
                          {(() => {
                            const isFullStock = totalAvail >= reqQty;
                            const isPartialStock = totalAvail > 0 && totalAvail < reqQty;
                            const isZeroStock = totalAvail === 0;

                            const isPurchaseActive = !isArchived && (isZeroStock || isPartialStock);
                            const isPurchaseDisabled = readOnly || isFullStock;

                            return (
                              <button
                                type="button"
                                disabled={isPurchaseDisabled}
                                onClick={() => {
                                  if (isArchived) handleToggleArchive(idx);
                                }}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                                  isPurchaseActive
                                    ? 'bg-amber-600 text-white shadow-xs ring-2 ring-amber-500/40'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-500 opacity-50 cursor-not-allowed'
                                }`}
                                title={
                                  isFullStock
                                    ? `Stock math dictates this route: Total stock ${totalAvail} >= Req ${reqQty}, purchase not required`
                                    : isZeroStock
                                    ? 'Purchase Active: 0 stock available in stores'
                                    : `Partial Purchase Active (${purchaseQty} required from market)`
                                }
                              >
                                <ShoppingCart className="w-3.5 h-3.5" />
                                <span>
                                  {isPartialStock ? `Purchase (${purchaseQty})` : 'Purchase'}
                                </span>
                              </button>
                            );
                          })()}

                          {/* 3. Archive Button (Manual Override Only) */}
                          {(() => {
                            return (
                              <button
                                type="button"
                                disabled={readOnly}
                                onClick={() => handleToggleArchive(idx)}
                                className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 cursor-pointer ${
                                  isArchived
                                    ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900 shadow-xs ring-2 ring-slate-400'
                                    : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                                }`}
                                title={isArchived ? 'Archived / On Hold (Click to restore stock math route)' : 'Manual Override: Put on Hold / Archive'}
                              >
                                <Archive className="w-3.5 h-3.5" />
                                <span>Archive</span>
                              </button>
                            );
                          })()}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Triage Remarks */}
          <div className="mt-4">
            <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 mb-1">
              Store Manager Remarks / Triage Notes
            </label>
            <textarea
              rows={2}
              value={triageNotes}
              disabled={readOnly}
              onChange={(e) => setTriageNotes(e.target.value)}
              placeholder="e.g. Dispatched 2 units from Central Store and transferred 3 units from Bijetala Site..."
              className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none disabled:opacity-60"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>{readOnly ? 'Stage 2 Store Triage Complete (Read-Only View).' : 'Routing and Purchase Qty are strictly locked to mathematical stock balance.'}</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              {readOnly ? 'Close Details' : 'Cancel'}
            </button>
            {!readOnly && (
              <button
                type="button"
                onClick={handleSubmitTriage}
                disabled={isSubmitting}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>{isSubmitting ? 'Launching Parallel Sub-Tracks...' : 'Confirm Stock Triage & Launch Sub-Tracks'}</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export const StoreStockTriageModal = StoreTriageModal;
