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
  ArrowRightLeft,
  ChevronUp,
  ChevronDown
} from 'lucide-react';
import { InventoryItem, InventoryMovement, UserProfile } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

import { QuickAddInventoryModal } from './QuickAddInventoryModal';

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
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);
  const [selectedRowIds, setSelectedRowIds] = useState<string[]>([]);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: 'asc' | 'desc' } | null>(null);

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

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (!prev || prev.key !== key) return { key, direction: 'asc' };
      if (prev.direction === 'asc') return { key, direction: 'desc' };
      return null;
    });
  };

  const sortedItems = React.useMemo(() => {
    if (!sortConfig) return filteredItems;
    const { key, direction } = sortConfig;
    return [...filteredItems].sort((a, b) => {
      let aVal: any = '';
      let bVal: any = '';
      switch (key) {
        case 'itemId':
          aVal = (a.itemId || '').toLowerCase();
          bVal = (b.itemId || '').toLowerCase();
          break;
        case 'name':
          aVal = (a.name || '').toLowerCase();
          bVal = (b.name || '').toLowerCase();
          break;
        case 'category':
          aVal = (a.category || '').toLowerCase();
          bVal = (b.category || '').toLowerCase();
          break;
        case 'location':
          aVal = (a.location || '').toLowerCase();
          bVal = (b.location || '').toLowerCase();
          break;
        case 'currentStock':
          aVal = a.currentStock || 0;
          bVal = b.currentStock || 0;
          break;
        case 'minThreshold':
          aVal = a.minThreshold || 0;
          bVal = b.minThreshold || 0;
          break;
        case 'condition':
          aVal = (a.condition || '').toLowerCase();
          bVal = (b.condition || '').toLowerCase();
          break;
        case 'lastChecked':
          aVal = (a.lastCheckedDate || '').toLowerCase();
          bVal = (b.lastCheckedDate || '').toLowerCase();
          break;
        default:
          return 0;
      }
      if (aVal < bVal) return direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [filteredItems, sortConfig]);

  const toggleSelectAll = () => {
    if (selectedRowIds.length === sortedItems.length && sortedItems.length > 0) {
      setSelectedRowIds([]);
    } else {
      setSelectedRowIds(sortedItems.map((i) => i.id));
    }
  };

  const handleToggleRow = (id: string) => {
    setSelectedRowIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

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
                className="text-xs bg-white border border-slate-300 rounded-lg py-1.5 px-2 text-slate-700 font-medium font-semibold"
              >
                <option value="ALL">All Locations</option>
                {storageAdapter.getMasterSites().map((site) => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
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

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsQuickAddOpen(true)}
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold shadow-xs transition-colors shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Quick Add SKU</span>
          </button>

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
      </div>

      <QuickAddInventoryModal
        isOpen={isQuickAddOpen}
        onClose={() => setIsQuickAddOpen(false)}
        onSuccess={(newItem) => {
          onUpdateItem(newItem);
        }}
      />

      {/* Stock Master Table or Movement Logs */}
      {activeTab === 'STOCK' ? (
        <>
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 z-30 bg-slate-50 text-slate-700 font-semibold border-b border-slate-200 uppercase tracking-wider text-[11px] shadow-xs">
                <tr>
                  <th className="w-10 min-w-[40px] py-3 px-3 text-center sticky left-0 top-0 z-40 bg-slate-50 border-r border-slate-200 border-b border-slate-200">
                    <input
                      type="checkbox"
                      checked={sortedItems.length > 0 && selectedRowIds.length === sortedItems.length}
                      onChange={toggleSelectAll}
                      className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                      title="Select / Deselect All"
                    />
                  </th>
                  <th
                    onClick={() => handleSort('itemId')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Item ID</span>
                      {sortConfig?.key === 'itemId' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('name')}
                    className="py-3 px-4 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Item Name</span>
                      {sortConfig?.key === 'name' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('category')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Category</span>
                      {sortConfig?.key === 'category' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('location')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Location</span>
                      {sortConfig?.key === 'location' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('currentStock')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-50 transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Current Stock</span>
                      {sortConfig?.key === 'currentStock' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('minThreshold')}
                    className="py-3 px-3 text-right cursor-pointer hover:bg-slate-50 transition-colors select-none"
                  >
                    <div className="flex items-center justify-end gap-1.5">
                      <span>Min Threshold</span>
                      {sortConfig?.key === 'minThreshold' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('condition')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Condition</span>
                      {sortConfig?.key === 'condition' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th
                    onClick={() => handleSort('lastChecked')}
                    className="py-3 px-3 cursor-pointer hover:bg-slate-50 transition-colors select-none"
                  >
                    <div className="flex items-center gap-1.5">
                      <span>Last Checked</span>
                      {sortConfig?.key === 'lastChecked' ? (
                        sortConfig.direction === 'asc' ? <ChevronUp className="w-3.5 h-3.5 text-indigo-600" /> : <ChevronDown className="w-3.5 h-3.5 text-indigo-600" />
                      ) : (
                        <ArrowUpDown className="w-3 h-3 text-slate-400 opacity-60" />
                      )}
                    </div>
                  </th>
                  <th className="py-3 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 relative">
                {sortedItems.length > 0 ? (
                  sortedItems.map((item) => {
                    const isLow = item.currentStock <= item.minThreshold;
                    const isDegraded = item.condition === 'Degraded/Damaged';
                    const isChecked = selectedRowIds.includes(item.id);

                    return (
                      <tr key={item.id} className={`hover:bg-slate-50 transition-colors group ${isChecked ? 'bg-indigo-50/40' : ''}`}>
                        <td
                          className={`w-10 min-w-[40px] py-3 px-3 text-center sticky left-0 z-10 border-r border-slate-200/60 align-middle ${
                            isChecked ? '!bg-indigo-50' : 'bg-white group-hover:bg-slate-50'
                          }`}
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToggleRow(item.id)}
                            className="rounded text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                          />
                        </td>
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
                    <td colSpan={10} className="py-8 text-center text-slate-500">
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
              Showing <span className="font-semibold text-slate-800">{sortedItems.length}</span> items ({lowStockCount} low stock alerts)
            </div>
            <div className="text-[11px] font-medium text-slate-400">
              IMS Inventory Management System • Location: {locationFilter}
            </div>
          </div>
        </div>

        {/* Bulk Action Bar */}
        {selectedRowIds.length > 0 && (
          <div className="sticky bottom-4 z-40 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-xl flex items-center justify-between gap-4 border border-slate-700 animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-indigo-500 text-white text-xs font-bold">
                {selectedRowIds.length}
              </span>
              <span className="text-xs font-semibold text-slate-200">
                {selectedRowIds.length === 1 ? 'item selected' : 'items selected'}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const selected = sortedItems.filter((i) => selectedRowIds.includes(i.id));
                  const headers = ['Item ID', 'Item Name', 'Category', 'Location', 'Current Stock', 'Min Threshold', 'Condition', 'Last Checked'];
                  const csvData = [
                    headers,
                    ...selected.map((i) => [
                      i.itemId,
                      i.name,
                      i.category,
                      i.location,
                      `${i.currentStock} ${i.unit}`,
                      `${i.minThreshold} ${i.unit}`,
                      i.condition,
                      i.lastCheckedDate
                    ])
                  ];
                  const csvContent = 'data:text/csv;charset=utf-8,' + csvData.map(e => e.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
                  const encodedUri = encodeURI(csvContent);
                  const link = document.createElement('a');
                  link.setAttribute('href', encodedUri);
                  link.setAttribute('download', `Inventory_Bulk_Export_${new Date().toISOString().slice(0, 10)}.csv`);
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-colors cursor-pointer border border-slate-700"
              >
                Bulk Export
              </button>
              <button
                type="button"
                onClick={() => {
                  // Bulk Assign placeholder
                }}
                className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer shadow-xs"
              >
                Bulk Assign
              </button>
              <button
                type="button"
                onClick={() => setSelectedRowIds([])}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
              >
                Clear Selection
              </button>
            </div>
          </div>
        )}
        </>
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
