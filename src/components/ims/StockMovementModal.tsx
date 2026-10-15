import React, { useState } from 'react';
import { X, ArrowRightLeft, AlertCircle, Check } from 'lucide-react';
import { InventoryItem, InventoryMovement, UserProfile } from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface StockMovementModalProps {
  isOpen: boolean;
  onClose: () => void;
  items: InventoryItem[];
  currentUser: UserProfile;
  preselectedItem?: InventoryItem | null;
  onRecord: (movement: InventoryMovement, updatedStock: number, newCondition?: InventoryItem['condition']) => void;
}

export const StockMovementModal: React.FC<StockMovementModalProps> = ({
  isOpen,
  onClose,
  items,
  currentUser,
  preselectedItem,
  onRecord,
}) => {
  const [selectedItemId, setSelectedItemId] = useState<string>(preselectedItem?.itemId || items[0]?.itemId || '');
  const [movementType, setMovementType] = useState<InventoryMovement['type']>('TRANSFER');
  const [quantity, setQuantity] = useState<number>(1);
  const [sourceLoc, setSourceLoc] = useState<string>('Central Store');
  const [destLoc, setDestLoc] = useState<string>('Siladehi Site');
  const [referenceDoc, setReferenceDoc] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const currentItem = items.find((i) => i.itemId === selectedItemId) || items[0];

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentItem) {
      setError('Item not found');
      return;
    }

    if (quantity <= 0) {
      setError('Quantity must be greater than zero');
      return;
    }

    if ((movementType === 'ISSUE' || movementType === 'TRANSFER' || movementType === 'RETURN_DEGRADED') && quantity > currentItem.currentStock) {
      setError(`Cannot move ${quantity} units. Only ${currentItem.currentStock} ${currentItem.unit} available in stock.`);
      return;
    }

    let updatedStock = currentItem.currentStock;
    let newCondition = currentItem.condition;

    if (movementType === 'RECEIVE') {
      updatedStock += quantity;
    } else if (movementType === 'ISSUE' || movementType === 'RETURN_DEGRADED') {
      updatedStock -= quantity;
      if (movementType === 'RETURN_DEGRADED') {
        newCondition = 'Degraded/Damaged';
      }
    }

    const txnId = `TXN-${Date.now().toString().slice(-6)}`;
    const newMovement: InventoryMovement = {
      id: `mov-${Date.now()}`,
      transactionId: txnId,
      itemId: currentItem.itemId,
      itemName: currentItem.name,
      type: movementType,
      quantity,
      sourceLocation: sourceLoc,
      destinationLocation: destLoc,
      timestamp: new Date().toLocaleString('en-GB'),
      referenceDoc: referenceDoc.trim() || undefined,
      initiatedBy: currentUser.name,
      notes: notes.trim() || undefined,
    };

    onRecord(newMovement, updatedStock, newCondition);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
      <div className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2 text-slate-900 font-bold">
            <ArrowRightLeft className="w-5 h-5 text-indigo-600" />
            <span>Record Inventory Movement</span>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Select Inventory Item <span className="text-rose-500">*</span>
            </label>
            <select
              value={selectedItemId}
              onChange={(e) => setSelectedItemId(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
            >
              {items.map((i) => (
                <option key={i.itemId} value={i.itemId}>
                  [{i.itemId}] {i.name} (Stock: {i.currentStock} {i.unit} @ {i.location})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Type
              </label>
              <select
                value={movementType}
                onChange={(e) => setMovementType(e.target.value as InventoryMovement['type'])}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
              >
                <option value="TRANSFER">TRANSFER (Site to Site)</option>
                <option value="ISSUE">ISSUE (To Department/Project)</option>
                <option value="RETURN_DEGRADED">RETURN DEGRADED (Scrap/Audit)</option>
                <option value="RECEIVE">RECEIVE (New Inward)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Quantity ({currentItem?.unit || 'Units'}) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                min={1}
                required
                value={quantity}
                onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none font-mono font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Source Location
              </label>
              <select
                value={sourceLoc}
                onChange={(e) => setSourceLoc(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
              >
                {storageAdapter.getMasterSites().map((site) => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Destination Location
              </label>
              <select
                value={destLoc}
                onChange={(e) => setDestLoc(e.target.value)}
                className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white font-medium"
              >
                {storageAdapter.getMasterSites().map((site) => (
                  <option key={site} value={site}>
                    {site}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Reference Document (Indent No / PO No / Checklist ID)
            </label>
            <input
              type="text"
              placeholder="e.g. REQ-2026-752 or CHK-270"
              value={referenceDoc}
              onChange={(e) => setReferenceDoc(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Operational Notes / Justification
            </label>
            <textarea
              rows={2}
              placeholder="Add justification or dispatch notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full text-xs px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex items-center gap-2 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Check className="w-4 h-4" />
              <span>Record &amp; Sync Inventory</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
