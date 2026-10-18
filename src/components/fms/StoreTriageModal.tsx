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
  Save
} from 'lucide-react';
import { FmsInstance, FmsLineItem, UserProfile } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface StoreTriageModalProps {
  flow: FmsInstance;
  currentUser: UserProfile;
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
  onClose,
  onCompleteTriage,
}) => {
  // Load initial line items from flow or initialize default line item if empty
  const [lineItems, setLineItems] = useState<FmsLineItem[]>(() => {
    if (flow.lineItems && flow.lineItems.length > 0) {
      return flow.lineItems.map(item => ({
        ...item,
        triageAllocation: item.triageAllocation || 'PURCHASE_REQUISITION',
        storeStockQtyAvailable: item.storeStockQtyAvailable ?? 0,
        purchaseQtyRequired: item.purchaseQtyRequired ?? item.qty,
      }));
    }
    // Fallback if no line items exist on flow yet: create 1 default item from title/remarks
    return [
      {
        id: 'ITEM-1',
        itemDescription: flow.title || 'Requested Indent Line Material',
        qty: 1,
        unit: 'Nos',
        urgency: 'NORMAL',
        triageAllocation: 'PURCHASE_REQUISITION',
        storeStockQtyAvailable: 0,
        purchaseQtyRequired: 1,
      }
    ];
  });

  const [triageNotes, setTriageNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-lookup stock availability from Inventory Management System (IMS)
  useEffect(() => {
    const imsItems = storageAdapter.getInventoryItems();
    setLineItems(prev =>
      prev.map(item => {
        // Simple fuzzy match by item description name against IMS inventory catalog
        const match = imsItems.find(
          inv => inv.name.toLowerCase().includes(item.itemDescription.toLowerCase()) ||
                 item.itemDescription.toLowerCase().includes(inv.name.toLowerCase())
        );
        const availableStock = match ? match.currentStock : 0;
        // Default split: if stock available, allocate up to available stock for store dispatch
        const storeQty = Math.min(item.qty, availableStock);
        const purchaseQty = Math.max(0, item.qty - storeQty);
        let allocation: 'STORE_DISPATCH' | 'PURCHASE_REQUISITION' | 'HELD_ARCHIVED' = 'PURCHASE_REQUISITION';
        if (storeQty > 0 && purchaseQty === 0) {
          allocation = 'STORE_DISPATCH';
        } else if (storeQty > 0 && purchaseQty > 0) {
          allocation = 'PURCHASE_REQUISITION'; // Split track
        }

        return {
          ...item,
          storeStockQtyAvailable: availableStock,
          purchaseQtyRequired: item.purchaseQtyRequired ?? purchaseQty,
          triageAllocation: item.triageAllocation || allocation,
        };
      })
    );
  }, []);

  const handleUpdateAllocation = (
    index: number,
    allocation: 'STORE_DISPATCH' | 'PURCHASE_REQUISITION' | 'HELD_ARCHIVED'
  ) => {
    setLineItems(prev => {
      const next = [...prev];
      const target = { ...next[index], triageAllocation: allocation };
      if (allocation === 'STORE_DISPATCH') {
        target.purchaseQtyRequired = 0;
      } else if (allocation === 'PURCHASE_REQUISITION') {
        target.purchaseQtyRequired = target.qty;
      }
      next[index] = target;
      return next;
    });
  };

  const handleQtyChange = (index: number, field: 'qty' | 'purchaseQtyRequired', val: number) => {
    setLineItems(prev => {
      const next = [...prev];
      const target = { ...next[index], [field]: Math.max(0, val) };
      next[index] = target;
      return next;
    });
  };

  const storeCount = lineItems.filter(i => i.triageAllocation === 'STORE_DISPATCH').length;
  const purchaseCount = lineItems.filter(i => i.triageAllocation === 'PURCHASE_REQUISITION').length;
  const archivedCount = lineItems.filter(i => i.triageAllocation === 'HELD_ARCHIVED').length;

  const handleSubmitTriage = () => {
    setIsSubmitting(true);

    const { updatedParent } = storageAdapter.splitIndentForPurchaseAndStore(
      flow,
      lineItems,
      triageNotes,
      currentUser
    );

    // Keep the current user (e.g. Store Manager Amanat Bharadwaj) on their active CHECK_STOCK flow
    const resultingFlow = updatedParent || flow;

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
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-4xl w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-indigo-600/30 rounded-xl border border-indigo-500/30">
              <Boxes className="w-5 h-5 text-indigo-400" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-400/30">
                  STAGE 2 TRIAGE
                </span>
                <span className="text-xs text-slate-400">Indent #{flow.indentNo || flow.requisitionNumber}</span>
              </div>
              <h2 className="text-base font-bold text-white mt-0.5">
                Store Stock Triage & Parallel Pipeline Split
              </h2>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
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
            <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
              <span>Requested Material Line Breakdown</span>
              <span className="text-xs font-normal text-slate-500 dark:text-slate-400">
                (Store Manager will verify central inventory stock and assign pipeline track)
              </span>
            </h3>
            <span className="text-xs text-indigo-600 dark:text-indigo-400 font-medium bg-indigo-50 dark:bg-indigo-950/40 px-2.5 py-1 rounded-lg border border-indigo-200 dark:border-indigo-800/40">
              ⚡ IMS Auto Stock Check Active
            </span>
          </div>

          <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 font-semibold border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="py-2.5 px-3 w-8">#</th>
                  <th className="py-2.5 px-3">Material Description</th>
                  <th className="py-2.5 px-3 w-20 text-center">Req Qty</th>
                  <th className="py-2.5 px-3 w-28 text-center">IMS Store Stock</th>
                  <th className="py-2.5 px-3 w-28 text-center">Purchase Qty</th>
                  <th className="py-2.5 px-3 text-center">Pipeline Triage Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-900">
                {lineItems.map((item, idx) => (
                  <tr key={item.id || idx} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/50 transition-colors">
                    <td className="py-3 px-3 font-mono text-slate-500">{idx + 1}</td>
                    <td className="py-3 px-3">
                      <p className="font-semibold text-slate-900 dark:text-white">{item.itemDescription}</p>
                      {item.remark && <p className="text-[11px] text-slate-500 mt-0.5">{item.remark}</p>}
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-slate-900 dark:text-white">
                      {item.qty} {item.unit}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <span className={`inline-flex items-center gap-1 font-semibold px-2 py-0.5 rounded ${
                        (item.storeStockQtyAvailable ?? 0) >= item.qty
                          ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300'
                          : (item.storeStockQtyAvailable ?? 0) > 0
                          ? 'bg-amber-100 text-amber-800 dark:bg-amber-950/60 dark:text-amber-300'
                          : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400'
                      }`}>
                        {item.storeStockQtyAvailable ?? 0} {item.unit}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center">
                      <input
                        type="number"
                        min={0}
                        max={item.qty}
                        value={item.purchaseQtyRequired ?? item.qty}
                        onChange={(e) => handleQtyChange(idx, 'purchaseQtyRequired', parseInt(e.target.value) || 0)}
                        disabled={item.triageAllocation === 'STORE_DISPATCH' || item.triageAllocation === 'HELD_ARCHIVED'}
                        className="w-16 text-center py-1 px-1.5 border border-slate-300 dark:border-slate-700 rounded bg-white dark:bg-slate-800 font-bold text-slate-900 dark:text-white disabled:opacity-40"
                      />
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleUpdateAllocation(idx, 'STORE_DISPATCH')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                            item.triageAllocation === 'STORE_DISPATCH'
                              ? 'bg-emerald-600 text-white shadow-sm ring-2 ring-emerald-500/40'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-emerald-50 hover:text-emerald-700'
                          }`}
                        >
                          <Truck className="w-3.5 h-3.5" />
                          <span>Store Dispatch</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateAllocation(idx, 'PURCHASE_REQUISITION')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                            item.triageAllocation === 'PURCHASE_REQUISITION'
                              ? 'bg-amber-600 text-white shadow-sm ring-2 ring-amber-500/40'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 hover:bg-amber-50 hover:text-amber-700'
                          }`}
                        >
                          <ShoppingCart className="w-3.5 h-3.5" />
                          <span>Purchase</span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleUpdateAllocation(idx, 'HELD_ARCHIVED')}
                          className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all flex items-center gap-1 ${
                            item.triageAllocation === 'HELD_ARCHIVED'
                              ? 'bg-slate-800 text-white dark:bg-slate-200 dark:text-slate-900 shadow-sm'
                              : 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200'
                          }`}
                        >
                          <Archive className="w-3.5 h-3.5" />
                          <span>Archive</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
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
              onChange={(e) => setTriageNotes(e.target.value)}
              placeholder="e.g. 2 items issued from Siladehi Store; remaining 3 items routed to Purchase Dept for vendor quotation..."
              className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none"
            />
          </div>
        </div>

        {/* Modal Footer */}
        <div className="px-6 py-4 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between shrink-0">
          <p className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Info className="w-4 h-4 text-indigo-500 shrink-0" />
            <span>Parallel tracks will launch automatically upon submission without duplicating the indent.</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-800 rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSubmitTriage}
              disabled={isSubmitting}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 rounded-xl shadow-md transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4" />
              <span>{isSubmitting ? 'Launching Parallel Tracks...' : 'Confirm Stock Triage & Launch Sub-Tracks'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
