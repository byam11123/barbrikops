import React from 'react';
import { Layers, FileText, CheckCircle2, Clock, AlertCircle } from 'lucide-react';

interface FmsItemTableProps {
  items: any[];
  title?: string;
  className?: string;
  compact?: boolean;
}

export const FmsItemTable: React.FC<FmsItemTableProps> = ({
  items,
  title,
  className = '',
  compact = false,
}) => {
  if (!Array.isArray(items) || items.length === 0) {
    return (
      <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-500 italic">
        No items recorded
      </div>
    );
  }

  // Normalize item fields
  const normalized = items.map((item, idx) => {
    if (typeof item !== 'object' || item === null) {
      return {
        id: `item_${idx}`,
        rowNum: idx + 1,
        description: String(item),
        qty: '—',
        unit: '—',
        purpose: '—',
        allocation: '—',
        remarks: '—',
      };
    }

    const desc =
      item.itemDescription ||
      item.item_description ||
      item.description ||
      item.name ||
      item.item ||
      `Item #${idx + 1}`;

    const qty =
      item.qty !== undefined
        ? item.qty
        : item.quantity !== undefined
        ? item.quantity
        : item.requestedQty !== undefined
        ? item.requestedQty
        : '—';

    const unit = item.unit || item.uom || 'Nos';

    const purpose =
      item.workPurpose ||
      item.work_purpose ||
      item.purpose ||
      item.remark ||
      item.remarks ||
      '—';

    const allocation =
      item.triageAllocation ||
      (item.storeQty > 0 && item.purchaseQty > 0
        ? `Split (Store: ${item.storeQty}, Purch: ${item.purchaseQty})`
        : item.storeQty > 0
        ? `Store Dispatch (${item.storeQty})`
        : item.purchaseQty > 0
        ? `Purchase (${item.purchaseQty})`
        : item.holdQty > 0
        ? `Hold (${item.holdQty})`
        : '');

    const remarks = item.remarks || item.remark || item.notes || '';

    return {
      id: item.id || `item_${idx}`,
      rowNum: item.row_num || idx + 1,
      description: desc,
      qty,
      unit,
      purpose,
      allocation,
      remarks,
      storeQty: item.storeQty,
      purchaseQty: item.purchaseQty,
      holdQty: item.holdQty,
    };
  });

  return (
    <div className={`space-y-1.5 overflow-hidden ${className}`}>
      {title && (
        <div className="flex items-center justify-between text-xs">
          <span className="font-extrabold text-slate-800 flex items-center gap-1.5">
            <Layers className="w-3.5 h-3.5 text-indigo-600" />
            <span>{title}</span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-1.5 py-0.2 rounded">
              {items.length} {items.length === 1 ? 'Item' : 'Items'}
            </span>
          </span>
        </div>
      )}

      <div className="overflow-x-auto border border-slate-200 rounded-xl bg-white shadow-2xs">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
            <tr>
              <th className="py-2 px-2.5 w-10 text-center">#</th>
              <th className="py-2 px-2.5 min-w-[160px]">Item Description</th>
              <th className="py-2 px-2.5 w-20 text-center">Qty</th>
              <th className="py-2 px-2.5 w-16">Unit</th>
              <th className="py-2 px-2.5 min-w-[140px]">Work / Purpose</th>
              {normalized.some((n) => n.allocation) && (
                <th className="py-2 px-2.5 min-w-[120px]">Allocation</th>
              )}
              {normalized.some((n) => n.remarks) && (
                <th className="py-2 px-2.5 min-w-[120px]">Remarks</th>
              )}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {normalized.map((item, idx) => (
              <tr key={item.id} className="hover:bg-indigo-50/30 transition-colors">
                <td className="py-2 px-2.5 text-center font-mono text-[11px] font-bold text-slate-400">
                  {item.rowNum}
                </td>
                <td className="py-2 px-2.5 font-bold text-slate-900">
                  {item.description}
                </td>
                <td className="py-2 px-2.5 text-center font-mono font-black text-indigo-700">
                  {item.qty}
                </td>
                <td className="py-2 px-2.5 text-slate-600 font-medium text-[11px]">
                  {item.unit}
                </td>
                <td className="py-2 px-2.5 text-slate-600 text-[11px] italic">
                  {item.purpose}
                </td>
                {normalized.some((n) => n.allocation) && (
                  <td className="py-2 px-2.5 text-[11px]">
                    {item.allocation ? (
                      <span
                        className={`inline-block px-1.5 py-0.5 rounded font-bold border text-[10px] ${
                          item.allocation.toLowerCase().includes('store')
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : item.allocation.toLowerCase().includes('purch')
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : item.allocation.toLowerCase().includes('hold')
                            ? 'bg-slate-100 text-slate-700 border-slate-300'
                            : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                        }`}
                      >
                        {item.allocation}
                      </span>
                    ) : (
                      '—'
                    )}
                  </td>
                )}
                {normalized.some((n) => n.remarks) && (
                  <td className="py-2 px-2.5 text-slate-500 text-[11px]">
                    {item.remarks || '—'}
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
