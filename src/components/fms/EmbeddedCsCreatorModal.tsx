import React, { useState } from 'react';
import {
  X,
  Plus,
  Trash2,
  CheckCircle2,
  Building2,
  FileSpreadsheet,
  Calculator,
  Percent,
  Sparkles,
  Zap,
  Info
} from 'lucide-react';
import {
  ComparativeStatement,
  CsItem,
  CsVendorQuote,
  CsVendorItemRate,
  FmsInstance,
  UserProfile
} from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface EmbeddedCsCreatorModalProps {
  isOpen: boolean;
  flow: FmsInstance;
  stageIndex: number;
  currentUser: UserProfile;
  onClose: () => void;
  onSaveAndLink: (cs: ComparativeStatement) => void;
}

export const EmbeddedCsCreatorModal: React.FC<EmbeddedCsCreatorModalProps> = ({
  isOpen,
  flow,
  currentUser,
  onClose,
  onSaveAndLink,
}) => {
  const [site, setSite] = useState<string>(flow.siteName || 'BIJETALA');
  const [indentNo, setIndentNo] = useState<string>(flow.indentNo || '466');
  const [forPurpose, setForPurpose] = useState<string>(
    flow.remarks || `Procurement for Indent #${flow.indentNo || '466'}`
  );
  const [statementDate, setStatementDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  // Default Line Items pre-populated from FMS Purchase Request
  const [items, setItems] = useState<CsItem[]>([
    {
      id: 'item-1',
      sn: 1,
      itemName: 'HM LOADER ENGINE SPARE KIT & FILTERS',
      brandMake: 'CATERPILLAR / JCB / OEM',
      unit: 'NOS',
      qty: 2,
    },
    {
      id: 'item-2',
      sn: 2,
      itemName: 'HYDRAULIC OIL 68 (BARBRIK APPROVED)',
      brandMake: 'CASTROL / SHELL / VALVOLINE',
      unit: 'LTRS',
      qty: 210,
    },
  ]);

  // Initial Vendors (At least 2 to compare)
  const [vendors, setVendors] = useState<CsVendorQuote[]>([
    {
      vendorId: 'vendor-1',
      vendorName: 'RAIPUR HEAVY EQUIPMENT SPARES',
      rating: '4.8 / 5.0 (Top Rated Local)',
      contactPersonMobile: 'Amit Ji | +91-7477230200',
      storeOfficeAddress: 'Bhanpuri Industrial Area, Raipur (C.G.)',
      paymentTerms: '30 Days Credit',
      warrantyPeriod: '01 Year OEM Warranty',
      gstTerms: '18% GST Extra',
      freightDeliveryTerms: 'OURS (Arranged by Barbrik)',
      quotationDateValidity: `${new Date().toLocaleDateString('en-GB')} | 30 Days`,
      primaryProductFocus: 'Heavy Plant & Earthmoving Spares',
      itemRates: {
        'item-1': {
          baseRate: 45000,
          gstPercent: 18,
          gstAmount: 8100,
          freightPerUnit: 0,
          landedRate: 53100,
          amount: 106200,
          isQuoted: true,
        },
        'item-2': {
          baseRate: 185,
          gstPercent: 18,
          gstAmount: 33.3,
          freightPerUnit: 0,
          landedRate: 218.3,
          amount: 45843,
          isQuoted: true,
        },
      },
    },
    {
      vendorId: 'vendor-2',
      vendorName: 'CHHATISGARH AUTO & TRACTOR TRADERS',
      rating: '4.5 / 5.0 (Approved Vendor)',
      contactPersonMobile: 'Sanjay Sharma | +91-9826112233',
      storeOfficeAddress: 'Ring Road No. 1, Raipur (C.G.)',
      paymentTerms: '15 Days Credit',
      warrantyPeriod: '06 Months Warranty',
      gstTerms: '18% GST Extra',
      freightDeliveryTerms: 'OURS (Arranged by Barbrik)',
      quotationDateValidity: `${new Date().toLocaleDateString('en-GB')} | 15 Days`,
      primaryProductFocus: 'Filters, Oils & Electricals',
      itemRates: {
        'item-1': {
          baseRate: 48000,
          gstPercent: 18,
          gstAmount: 8640,
          freightPerUnit: 0,
          landedRate: 56640,
          amount: 113280,
          isQuoted: true,
        },
        'item-2': {
          baseRate: 178,
          gstPercent: 18,
          gstAmount: 32.04,
          freightPerUnit: 0,
          landedRate: 210.04,
          amount: 44108.4,
          isQuoted: true,
        },
      },
    },
  ]);

  const [saving, setSaving] = useState(false);

  if (!isOpen) return null;

  // Recalculate landed rate and total amount
  const updateVendorItemRate = (
    vendorId: string,
    itemId: string,
    field: 'baseRate' | 'gstPercent',
    value: number
  ) => {
    setVendors((prev) =>
      prev.map((v) => {
        if (v.vendorId !== vendorId) return v;
        const currentRate = v.itemRates[itemId] || {
          baseRate: 0,
          gstPercent: 18,
          gstAmount: 0,
          freightPerUnit: 0,
          landedRate: 0,
          amount: 0,
          isQuoted: true,
        };

        const targetItem = items.find((i) => i.id === itemId);
        const qty = targetItem ? targetItem.qty : 1;

        const baseRate = field === 'baseRate' ? value : currentRate.baseRate;
        const gstPercent = field === 'gstPercent' ? value : currentRate.gstPercent;

        const gstAmount = (baseRate * gstPercent) / 100;
        const landedRate = baseRate + gstAmount;
        const amount = landedRate * qty;

        return {
          ...v,
          itemRates: {
            ...v.itemRates,
            [itemId]: {
              baseRate,
              gstPercent,
              gstAmount,
              freightPerUnit: 0,
              landedRate,
              amount,
              isQuoted: baseRate > 0,
            },
          },
        };
      })
    );
  };

  const handleAddItem = () => {
    const newId = `item-${items.length + 1}`;
    const newItem: CsItem = {
      id: newId,
      sn: items.length + 1,
      itemName: 'NEW REQUIRED MATERIAL / CONSUMABLE',
      brandMake: 'APPROVED MAKE',
      unit: 'NOS',
      qty: 1,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (id: string) => {
    if (items.length <= 1) return;
    setItems(items.filter((i) => i.id !== id));
  };

  const handleAddVendor = () => {
    const vId = `vendor-${vendors.length + 1}`;
    const newVendor: CsVendorQuote = {
      vendorId: vId,
      vendorName: `SUPPLIER / VENDOR ${vendors.length + 1}`,
      rating: '4.0 / 5.0 (Standard Local Vendor)',
      contactPersonMobile: 'Contact Person | +91-9800000000',
      storeOfficeAddress: 'Raipur Commercial Hub',
      paymentTerms: '30 Days Credit',
      warrantyPeriod: 'Standard Terms',
      gstTerms: '18% GST Extra',
      freightDeliveryTerms: 'OURS (Arranged by Barbrik)',
      quotationDateValidity: `${new Date().toLocaleDateString('en-GB')} | 30 Days`,
      primaryProductFocus: 'General Hardware & Spares',
      itemRates: {},
    };
    setVendors([...vendors, newVendor]);
  };

  const handleSaveCs = () => {
    setSaving(true);
    const csId = `cs-fms-${Date.now()}`;
    const newCs: ComparativeStatement = {
      id: csId,
      companyName: 'Barbrik Project Ltd.',
      site,
      indentNo,
      indentDate: new Date().toLocaleDateString('en-GB'),
      forPurpose,
      statementDate: new Date(statementDate).toLocaleDateString('en-GB'),
      items,
      vendors,
      status: 'Draft',
      createdAt: new Date().toLocaleDateString('en-GB'),
      updatedAt: new Date().toLocaleDateString('en-GB'),
    };

    // Save to storage
    const saved = storageAdapter.saveComparativeStatement(newCs);
    onSaveAndLink(saved);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-black shadow-md">
              <FileSpreadsheet className="w-5 h-5 text-amber-300" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">
                  Comparative Statement Builder (CS Sheet)
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-indigo-500/30 text-indigo-200 border border-indigo-400/30 rounded">
                  BARBRIK FMS LINKED
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Generating Comparative Rates for Indent #{indentNo} ({site}) &bull; Prepared by {currentUser.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800">
          {/* Metadata Grid */}
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Company Name
              </label>
              <input
                type="text"
                disabled
                value="Barbrik Project Ltd."
                className="w-full px-3 py-1.5 bg-slate-100 border border-slate-300 rounded-lg font-bold text-slate-700"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Site / Location <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={site}
                onChange={(e) => setSite(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Indent / PR No. <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                value={indentNo}
                onChange={(e) => setIndentNo(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-bold text-slate-900 focus:ring-2 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Statement Date
              </label>
              <input
                type="date"
                value={statementDate}
                onChange={(e) => setStatementDate(e.target.value)}
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-900"
              />
            </div>

            <div className="md:col-span-4">
              <label className="block text-[11px] font-bold text-slate-600 mb-1">
                Procurement Purpose / Scope
              </label>
              <input
                type="text"
                value={forPurpose}
                onChange={(e) => setForPurpose(e.target.value)}
                placeholder="Describe equipment, machine, or site requirement..."
                className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg font-medium text-slate-800"
              />
            </div>
          </div>

          {/* Line Items Table */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-black text-slate-900 flex items-center gap-2">
                <span>1. Required Items / Bill of Quantities</span>
                <span className="px-2 py-0.5 text-[10px] bg-slate-200 text-slate-700 rounded-full font-bold">
                  {items.length} Items
                </span>
              </h4>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item</span>
              </button>
            </div>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-700 font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-2.5 w-12 text-center">S.N.</th>
                    <th className="p-2.5">Item Description</th>
                    <th className="p-2.5 w-40">Brand / Make</th>
                    <th className="p-2.5 w-24 text-center">Unit</th>
                    <th className="p-2.5 w-24 text-center">Qty</th>
                    <th className="p-2.5 w-12 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white">
                  {items.map((item, idx) => (
                    <tr key={item.id} className="hover:bg-slate-50">
                      <td className="p-2.5 text-center font-bold text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.itemName}
                          onChange={(e) =>
                            setItems(
                              items.map((it) =>
                                it.id === item.id ? { ...it, itemName: e.target.value } : it
                              )
                            )
                          }
                          className="w-full px-2 py-1 border border-slate-200 rounded font-medium text-slate-900 focus:ring-1 focus:ring-indigo-500"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.brandMake}
                          onChange={(e) =>
                            setItems(
                              items.map((it) =>
                                it.id === item.id ? { ...it, brandMake: e.target.value } : it
                              )
                            )
                          }
                          className="w-full px-2 py-1 border border-slate-200 rounded text-slate-700 font-medium"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="text"
                          value={item.unit}
                          onChange={(e) =>
                            setItems(
                              items.map((it) =>
                                it.id === item.id ? { ...it, unit: e.target.value } : it
                              )
                            )
                          }
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center font-medium text-slate-800"
                        />
                      </td>
                      <td className="p-2.5">
                        <input
                          type="number"
                          min="1"
                          value={item.qty}
                          onChange={(e) =>
                            setItems(
                              items.map((it) =>
                                it.id === item.id
                                  ? { ...it, qty: parseFloat(e.target.value) || 1 }
                                  : it
                              )
                            )
                          }
                          className="w-full px-2 py-1 border border-slate-200 rounded text-center font-bold text-slate-900"
                        />
                      </td>
                      <td className="p-2.5 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={items.length <= 1}
                          className="p-1 text-slate-400 hover:text-rose-600 disabled:opacity-30"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Vendors & Quotation Comparison Grid */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <h4 className="font-black text-slate-900 flex items-center gap-2">
                <span>2. Vendor Quotations &amp; Rate Entry</span>
                <span className="px-2 py-0.5 text-[10px] bg-indigo-100 text-indigo-800 rounded-full font-bold">
                  {vendors.length} Suppliers Compared
                </span>
              </h4>
              <button
                type="button"
                onClick={handleAddVendor}
                className="px-3 py-1 bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded-lg font-bold text-xs flex items-center gap-1 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Supplier Column</span>
              </button>
            </div>

            <div className="space-y-4">
              {vendors.map((vendor, vIdx) => {
                // Calculate vendor total landed cost
                const totalVendorCost = items.reduce((sum, item) => {
                  const rate = vendor.itemRates[item.id];
                  return sum + (rate ? rate.amount : 0);
                }, 0);

                return (
                  <div
                    key={vendor.vendorId}
                    className="p-4 bg-slate-50 rounded-2xl border border-slate-200 space-y-3"
                  >
                    <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-slate-800 text-white font-black text-[11px] flex items-center justify-center">
                          V{vIdx + 1}
                        </span>
                        <input
                          type="text"
                          value={vendor.vendorName}
                          onChange={(e) =>
                            setVendors(
                              vendors.map((v) =>
                                v.vendorId === vendor.vendorId
                                  ? { ...v, vendorName: e.target.value }
                                  : v
                              )
                            )
                          }
                          placeholder="Vendor Company Name..."
                          className="font-black text-sm text-slate-900 bg-white border border-slate-300 rounded-lg px-2.5 py-1 w-72"
                        />
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-medium text-xs">Total Landed Quote:</span>
                        <span className="font-black font-mono text-sm text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg">
                          ₹{totalVendorCost.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </span>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-[11px]">
                      <div>
                        <label className="text-slate-500 font-bold block mb-0.5">Contact / Mobile</label>
                        <input
                          type="text"
                          value={vendor.contactPersonMobile}
                          onChange={(e) =>
                            setVendors(
                              vendors.map((v) =>
                                v.vendorId === vendor.vendorId
                                  ? { ...v, contactPersonMobile: e.target.value }
                                  : v
                              )
                            )
                          }
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 font-bold block mb-0.5">Payment Terms</label>
                        <input
                          type="text"
                          value={vendor.paymentTerms}
                          onChange={(e) =>
                            setVendors(
                              vendors.map((v) =>
                                v.vendorId === vendor.vendorId
                                  ? { ...v, paymentTerms: e.target.value }
                                  : v
                              )
                            )
                          }
                          className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-slate-800 font-medium"
                        />
                      </div>
                      <div>
                        <label className="text-slate-500 font-bold block mb-0.5">Freight Terms</label>
                        <input
                          type="text"
                          disabled
                          value="OURS (Arranged by Barbrik Project Ltd.)"
                          className="w-full px-2 py-1 bg-slate-100 border border-slate-200 rounded font-bold text-slate-700"
                        />
                      </div>
                    </div>

                    {/* Rates per Item */}
                    <div className="pt-2">
                      <p className="font-bold text-slate-700 text-[11px] mb-1.5">
                        Item Rates &amp; GST for {vendor.vendorName || `Vendor ${vIdx + 1}`}:
                      </p>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {items.map((item) => {
                          const rateData = vendor.itemRates[item.id] || {
                            baseRate: 0,
                            gstPercent: 18,
                            gstAmount: 0,
                            freightPerUnit: 0,
                            landedRate: 0,
                            amount: 0,
                            isQuoted: false,
                          };

                          return (
                            <div
                              key={item.id}
                              className="p-2.5 bg-white rounded-xl border border-slate-200 flex items-center justify-between gap-3 shadow-2xs"
                            >
                              <div className="min-w-0 flex-1">
                                <p className="font-bold text-slate-900 truncate">
                                  {item.itemName}
                                </p>
                                <p className="text-[10px] text-slate-500">
                                  Qty: {item.qty} {item.unit}
                                </p>
                              </div>

                              <div className="flex items-center gap-2">
                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 block">
                                    Base Rate (₹)
                                  </label>
                                  <input
                                    type="number"
                                    min="0"
                                    value={rateData.baseRate || ''}
                                    placeholder="Rate"
                                    onChange={(e) =>
                                      updateVendorItemRate(
                                        vendor.vendorId,
                                        item.id,
                                        'baseRate',
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-20 px-2 py-1 border border-slate-300 rounded font-bold text-right text-slate-900"
                                  />
                                </div>

                                <div>
                                  <label className="text-[9px] font-bold text-slate-400 block">
                                    GST %
                                  </label>
                                  <select
                                    value={rateData.gstPercent}
                                    onChange={(e) =>
                                      updateVendorItemRate(
                                        vendor.vendorId,
                                        item.id,
                                        'gstPercent',
                                        parseFloat(e.target.value) || 0
                                      )
                                    }
                                    className="w-16 px-1.5 py-1 border border-slate-300 rounded text-slate-800 font-bold text-center"
                                  >
                                    <option value="0">0%</option>
                                    <option value="5">5%</option>
                                    <option value="12">12%</option>
                                    <option value="18">18%</option>
                                    <option value="28">28%</option>
                                  </select>
                                </div>

                                <div className="text-right min-w-[70px]">
                                  <span className="text-[9px] text-slate-400 font-bold block">
                                    Landed
                                  </span>
                                  <span className="font-mono font-black text-slate-900 text-xs">
                                    ₹{rateData.landedRate ? rateData.landedRate.toFixed(2) : '0.00'}
                                  </span>
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
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-slate-500 text-xs font-medium">
            <Info className="w-4 h-4 text-indigo-600 shrink-0" />
            <span>
              Saving will create CS Sheet record, attach it to Stage {flow.currentStageIndex + 1}, and log completion timestamp.
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSaveCs}
              disabled={saving}
              className="px-6 py-2 bg-gradient-to-r from-indigo-600 to-indigo-700 hover:from-indigo-700 hover:to-indigo-800 text-white font-black rounded-xl text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>{saving ? 'Generating CS Sheet...' : 'Save & Link to Purchase FMS'}</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
