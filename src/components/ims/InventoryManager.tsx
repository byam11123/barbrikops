import React, { useState } from 'react';
import { 
  Boxes, 
  Search, 
  Filter, 
  Plus, 
  ArrowUpDown, 
  AlertTriangle, 
  CheckCircle2, 
  ExternalLink,
  MapPin,
  Clock,
  ArrowRightLeft
} from 'lucide-react';
import { InventoryItem, InventoryMovement, UserProfile } from '../../types';

interface InventoryManagerProps {
  items: InventoryItem[];
  movements: InventoryMovement[];
  currentUser: UserProfile;
  onUpdateItem: (item: InventoryItem) => void;
  onNewMovement?: () => void;
  onReturnDegraded: (item: InventoryItem) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  items,
  movements,
  currentUser,
  onUpdateItem,
  onNewMovement,
  onReturnDegraded,
}) => {
  const [activeTab, setActiveTab] = useState<'STOCK' | 'MOVEMENTS'>('STOCK');
  const [locationFilter, setLocationFilter] = useState<string>('ALL');
  const [conditionFilter, setConditionFilter] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const filteredItems = items.filter((item) => {
    if (locationFilter !== 'ALL' && item.location !== locationFilter) return false;
    if (conditionFilter !== 'ALL' && item.condition !== conditionFilter) return false;
    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      const matchName = item.name.toLowerCase().includes(q);
      const matchId = item.itemId.toLowerCase().includes(q);
      const matchCat = item.category.toLowerCase().includes(q);
      if (!matchName && !matchId && !matchCat) return false;
    }
    return true;
  });

  const lowStockCount = items.filter((i) => i.currentStock <= i.minThreshold).length;
  const degradedCount = items.filter((i) => i.condition === 'Degraded/Damaged').length;

  return (
    <div className="space-y-5">
      {/* Top Inventory Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        {/* Tracked SKUs */}
        <div className="p-5 rounded-2xl border bg-white border-slate-200 hover:border-indigo-300 hover:shadow-xs transition-all text-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600">
              Tracked Items
            </span>
            <Boxes className="w-5 h-5 text-indigo-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {items.length}
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-100">
              4 Locations
            </span>
          </div>
        </div>

        {/* Low Stock Alerts */}
        <div className="p-5 rounded-2xl border bg-white border-slate-200 hover:border-amber-300 hover:shadow-xs transition-all text-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-600">
              Low Stock Alerts
            </span>
            <AlertTriangle className="w-5 h-5 text-amber-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {lowStockCount}
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-100">
              Below Threshold
            </span>
          </div>
        </div>

        {/* Degraded Items */}
        <div className="p-5 rounded-2xl border bg-white border-slate-200 hover:border-rose-300 hover:shadow-xs transition-all text-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-rose-600">
              Degraded / Scrap
            </span>
            <AlertTriangle className="w-5 h-5 text-rose-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {degradedCount}
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-100">
              Action Required
            </span>
          </div>
        </div>

        {/* Movement Transactions */}
        <div className="p-5 rounded-2xl border bg-white border-slate-200 hover:border-emerald-300 hover:shadow-xs transition-all text-slate-900">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-600">
              Movement Logs
            </span>
            <ArrowRightLeft className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-3xl sm:text-4xl font-black text-slate-900">
              {movements.length}
            </span>
            <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-100">
              Audit Tracked
            </span>
          </div>
        </div>
      </div>

      {/* Control bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex bg-white p-1 rounded-lg border border-slate-200">
            <button
              onClick={() => setActiveTab('STOCK')}
              className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                activeTab === 'STOCK'
                  ? 'bg-slate-100 text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Current Stock
            </button>
            <button
              onClick={() => setActiveTab('MOVEMENTS')}
              className={`px-3 py-1 text-xs rounded-md font-semibold transition-all ${
                activeTab === 'MOVEMENTS'
                  ? 'bg-slate-100 text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              Movement Logs ({movements.length})
            </button>
          </div>

          {activeTab === 'STOCK' && (
            <>
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search item, SKU..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-300 rounded-lg w-44 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <select
                aria-label="Filter by location"
                value={locationFilter}
                onChange={(e) => setLocationFilter(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg py-1.5 px-2 text-slate-700 font-medium"
              >
                <option value="ALL">All Locations</option>
                <option value="Siladehi Site">Siladehi Site</option>
                <option value="Bijetala Site">Bijetala Site</option>
                <option value="Raipur Office">Raipur Office</option>
                <option value="Central Store">Central Store</option>
              </select>

              <select
                aria-label="Filter by condition"
                value={conditionFilter}
                onChange={(e) => setConditionFilter(e.target.value)}
                className="text-xs bg-white border border-slate-300 rounded-lg py-1.5 px-2 text-slate-700 font-medium"
              >
                <option value="ALL">All Conditions</option>
                <option value="Good">Good</option>
                <option value="Fair">Fair</option>
                <option value="Degraded/Damaged">Degraded/Damaged</option>
                <option value="Under Repair">Under Repair</option>
              </select>
            </>
          )}
        </div>

        {onNewMovement && (
          <button
            onClick={onNewMovement}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors shrink-0"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Record Stock Transfer / Issue</span>
          </button>
        )}
      </div>

      {/* Stock Master Table or Movement Logs */}
      {activeTab === 'STOCK' ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-white text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Item ID</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-3">Category</th>
                  <th className="py-3 px-3">Location</th>
                  <th className="py-3 px-3 text-right">Current Stock</th>
                  <th className="py-3 px-3 text-right">Min Threshold</th>
                  <th className="py-3 px-3">Condition</th>
                  <th className="py-3 px-3">Last Checked</th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.length > 0 ? (
                  filteredItems.map((item) => {
                    const isLow = item.currentStock <= item.minThreshold;
                    const isDegraded = item.condition === 'Degraded/Damaged';

                    return (
                      <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-3 px-3 font-mono font-bold text-slate-800">
                          {item.itemId}
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {item.name}
                        </td>
                        <td className="py-3 px-3 text-slate-600">
                          <span className="px-2 py-0.5 rounded bg-slate-100 text-[11px]">
                            {item.category}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-700 font-medium">
                          <span className="flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" />
                            {item.location}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-bold text-slate-900 text-sm">
                          {item.currentStock} {item.unit}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-slate-500">
                          {item.minThreshold} {item.unit}
                        </td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-[10px] ${
                              item.condition === 'Good'
                                ? 'bg-emerald-100 text-emerald-800'
                                : item.condition === 'Fair'
                                ? 'bg-blue-100 text-blue-800'
                                : item.condition === 'Degraded/Damaged'
                                ? 'bg-rose-100 text-rose-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {item.condition}
                          </span>
                        </td>
                        <td className="py-3 px-3 font-mono text-slate-500">
                          {item.lastCheckedDate}
                        </td>
                        <td className="py-3 px-3 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isDegraded ? (
                              <button
                                onClick={() => onReturnDegraded(item)}
                                className="px-2 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 rounded text-[11px] font-semibold transition-colors flex items-center gap-1"
                              >
                                <ExternalLink className="w-3 h-3" />
                                <span>FMS Degraded Form</span>
                              </button>
                            ) : (
                              <button
                                onClick={() => onReturnDegraded(item)}
                                className="px-2 py-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded text-[11px] font-medium transition-colors"
                              >
                                Mark Degraded
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={9} className="py-8 text-center text-slate-500">
                      No inventory items found matching filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              Showing <span className="font-semibold text-slate-800">{filteredItems.length}</span> items ({lowStockCount} low stock alerts)
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              IMS Inventory Management System • Location: {locationFilter}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="bg-white text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px]">
                <tr>
                  <th className="py-3 px-3">Transaction ID</th>
                  <th className="py-3 px-3">Timestamp</th>
                  <th className="py-3 px-3">Type</th>
                  <th className="py-3 px-4">Item Name</th>
                  <th className="py-3 px-3 text-right">Qty</th>
                  <th className="py-3 px-3">Source → Destination</th>
                  <th className="py-3 px-3">Reference Doc</th>
                  <th className="py-3 px-3">Initiated By</th>
                  <th className="py-3 px-4">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {movements.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {m.transactionId}
                    </td>
                    <td className="py-3 px-3 font-mono text-slate-500">
                      {m.timestamp}
                    </td>
                    <td className="py-3 px-3">
                      <span
                        className={`px-2 py-0.5 rounded font-bold text-[10px] ${
                          m.type === 'RECEIVE'
                            ? 'bg-emerald-100 text-emerald-800'
                            : m.type === 'ISSUE'
                            ? 'bg-blue-100 text-blue-800'
                            : m.type === 'RETURN_DEGRADED'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-amber-100 text-amber-800'
                        }`}
                      >
                        {m.type}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-900">
                      {m.itemName}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-slate-900">
                      {m.quantity}
                    </td>
                    <td className="py-3 px-3 text-slate-600">
                      {m.sourceLocation} → <span className="font-semibold text-slate-800">{m.destinationLocation}</span>
                    </td>
                    <td className="py-3 px-3 font-mono text-indigo-600 font-medium">
                      {m.referenceDoc || '—'}
                    </td>
                    <td className="py-3 px-3 text-slate-700">
                      {m.initiatedBy}
                    </td>
                    <td className="py-3 px-4 text-slate-500 italic max-w-xs truncate">
                      {m.notes || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Table Footer */}
          <div className="px-4 py-3 bg-white border-t border-slate-200 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2">
            <div>
              Showing <span className="font-semibold text-slate-800">{movements.length}</span> logged stock transactions
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              Immutable Stock Movement Ledger • Real-time Traceability
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
