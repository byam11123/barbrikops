import React, { useState, useEffect } from 'react';
import { X, Boxes, Plus, Save, CheckCircle2 } from 'lucide-react';
import { InventoryItem } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface QuickAddInventoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: (newItem: InventoryItem) => void;
}

export const QuickAddInventoryModal: React.FC<QuickAddInventoryModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  // Dynamically load registries from storageAdapter / CentralRegistryConfig
  const locations = storageAdapter.getMasterSites();
  const categories = storageAdapter.getMasterCategories();
  const units = storageAdapter.getMasterUnits();

  const [name, setName] = useState('');
  const [category, setCategory] = useState<string>(categories[0] || 'Consumables');
  const [unit, setUnit] = useState<string>(units[0] || 'Nos');
  const [location, setLocation] = useState<string>(locations[0] || 'Central Store');
  const [currentStock, setCurrentStock] = useState<number>(0);
  const [minThreshold, setMinThreshold] = useState<number>(5);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Sync state if registries change when modal opens
  useEffect(() => {
    if (isOpen) {
      setName('');
      setCurrentStock(0);
      setMinThreshold(5);
      setError('');
      setIsSaving(false);

      const locs = storageAdapter.getMasterSites();
      const cats = storageAdapter.getMasterCategories();
      const uns = storageAdapter.getMasterUnits();

      if (locs.length > 0) {
        setLocation(locs.includes('Siladehi Site') ? 'Siladehi Site' : locs[0]);
      }
      if (cats.length > 0) {
        setCategory(cats[0]);
      }
      if (uns.length > 0) {
        setUnit(uns[0]);
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError('Item Name is required');
      return;
    }

    setIsSaving(true);
    setError('');

    const existingItems = storageAdapter.getInventoryItems();
    // Check for duplicate name
    const duplicate = existingItems.find(
      (i) => i.name.toLowerCase().trim() === name.toLowerCase().trim()
    );
    if (duplicate) {
      setError(`Item "${name.trim()}" already exists in Master Catalog (ID: ${duplicate.itemId})`);
      setIsSaving(false);
      return;
    }

    const categoryPrefix = (category || 'ITEM').slice(0, 3).toUpperCase();
    const itemId = `ITEM-${categoryPrefix}-${Date.now().toString().slice(-4)}`;

    const newItem: InventoryItem = {
      id: `inv_${Date.now()}`,
      itemId,
      name: name.trim(),
      category: category || 'Consumables',
      unit: unit.trim() || 'Nos',
      location: location || 'Siladehi Site',
      currentStock: Math.max(0, Number(currentStock)),
      minThreshold: Math.max(0, Number(minThreshold)),
      condition: 'Good',
      lastCheckedDate: new Date().toLocaleDateString('en-GB'),
    };

    setIsSaving(false);
    if (onSuccess) {
      onSuccess(newItem);
    }
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-slate-900 rounded-2xl max-w-lg w-full border border-slate-200 dark:border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-emerald-600/30 rounded-xl border border-emerald-500/30">
              <Boxes className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white">Quick Add Master Inventory Item</h2>
              <p className="text-xs text-slate-400 mt-0.5">Register new material SKU into Master Catalog</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs font-semibold text-rose-700">
              {error}
            </div>
          )}

          {/* Item Name */}
          <div>
            <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
              Material / Item Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                setError('');
              }}
              placeholder="e.g. Hydraulic Filter 200HP or Concrete Vibrator Needle 50mm"
              className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-semibold"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Category Dropdown - Bound to Central masterCategories Registry */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Category <span className="text-rose-500">*</span>
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Measuring Unit Dropdown - Bound to Central masterUnits Registry */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Measuring Unit <span className="text-rose-500">*</span>
              </label>
              <select
                value={unit}
                onChange={(e) => setUnit(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
              >
                {units.map((u) => (
                  <option key={u} value={u}>
                    {u}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {/* Primary Location Dropdown - Bound to Central masterSites Registry */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Primary Location
              </label>
              <select
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-medium cursor-pointer"
              >
                {locations.map((loc) => (
                  <option key={loc} value={loc}>
                    {loc}
                  </option>
                ))}
              </select>
            </div>

            {/* Initial Stock */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Initial Stock
              </label>
              <input
                type="number"
                min={0}
                value={currentStock}
                onChange={(e) => setCurrentStock(parseInt(e.target.value) || 0)}
                className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              />
            </div>

            {/* Min Threshold */}
            <div>
              <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                Min Threshold
              </label>
              <input
                type="number"
                min={0}
                value={minThreshold}
                onChange={(e) => setMinThreshold(parseInt(e.target.value) || 0)}
                className="w-full text-xs p-2.5 border border-slate-300 dark:border-slate-700 rounded-xl bg-white dark:bg-slate-800 text-slate-900 dark:text-white focus:ring-2 focus:ring-indigo-500 outline-none font-bold"
              />
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-200 dark:border-slate-800">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-md transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{isSaving ? 'Registering SKU...' : 'Save to Master Catalog'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
