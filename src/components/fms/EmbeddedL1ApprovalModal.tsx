import React, { useState, useEffect } from 'react';
import {
  X,
  CheckCircle2,
  Building2,
  FileSpreadsheet,
  Zap,
  Award,
  ShieldCheck,
  Check,
  AlertCircle,
  Lock,
  ArrowRight
} from 'lucide-react';
import {
  ComparativeStatement,
  CsApprovalDetails,
  FmsInstance,
  UserProfile
} from '../../types';
import { storageAdapter } from '../../services/storageAdapter';

interface EmbeddedL1ApprovalModalProps {
  isOpen: boolean;
  flow: FmsInstance;
  stageIndex: number;
  csSheet: ComparativeStatement | null;
  currentUser: UserProfile;
  onClose: () => void;
  onApproveL1: (updatedCs: ComparativeStatement, remarks: string) => void;
}

export const EmbeddedL1ApprovalModal: React.FC<EmbeddedL1ApprovalModalProps> = ({
  isOpen,
  flow,
  csSheet,
  currentUser,
  onClose,
  onApproveL1,
}) => {
  // Local active state of Comparative Statement
  const [cs, setCs] = useState<ComparativeStatement | null>(csSheet);
  const [remarks, setRemarks] = useState<string>(
    'L1 vendor selection approved based on lowest landed cost & verified technical specification compliance.'
  );
  const [awardedMap, setAwardedMap] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (csSheet) {
      setCs(csSheet);
      // Compute default awarded vendor per item (lowest landed rate = L1)
      const initialMap: Record<string, string> = {};
      csSheet.items.forEach((item) => {
        let lowestRate = Infinity;
        let lowestVendorId = '';
        csSheet.vendors.forEach((vendor) => {
          const itemRate = vendor.itemRates[item.id];
          if (itemRate && itemRate.isQuoted && itemRate.landedRate > 0) {
            if (itemRate.landedRate < lowestRate) {
              lowestRate = itemRate.landedRate;
              lowestVendorId = vendor.vendorId;
            }
          }
        });
        if (lowestVendorId) {
          initialMap[item.id] = csSheet.awardedVendorMap?.[item.id] || lowestVendorId;
        }
      });
      setAwardedMap(initialMap);
    } else {
      // Try fetching from storage using linked record or indent number
      const statements = storageAdapter.getComparativeStatements();
      const match =
        statements.find((c) => c.indentNo === flow.indentNo) || statements[0] || null;
      if (match) {
        setCs(match);
        const initialMap: Record<string, string> = {};
        match.items.forEach((item) => {
          let lowestRate = Infinity;
          let lowestVendorId = '';
          match.vendors.forEach((vendor) => {
            const itemRate = vendor.itemRates[item.id];
            if (itemRate && itemRate.isQuoted && itemRate.landedRate > 0) {
              if (itemRate.landedRate < lowestRate) {
                lowestRate = itemRate.landedRate;
                lowestVendorId = vendor.vendorId;
              }
            }
          });
          if (lowestVendorId) {
            initialMap[item.id] = match.awardedVendorMap?.[item.id] || lowestVendorId;
          }
        });
        setAwardedMap(initialMap);
      }
    }
  }, [csSheet?.id, flow?.id, flow?.currentStageIndex, flow?.status, isOpen]);

  if (!isOpen) return null;

  if (!cs) {
    return (
      <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl max-w-md w-full p-6 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-amber-500 mx-auto" />
          <h3 className="font-black text-slate-900 text-base">No Comparative Statement Attached</h3>
          <p className="text-xs text-slate-600">
            A Comparative Statement (CS Sheet) needs to be generated in Stage 2 before L1 Approval can be completed.
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-900 text-white rounded-xl text-xs font-bold"
          >
            Close &amp; Return to FMS
          </button>
        </div>
      </div>
    );
  }

  // Calculate lowest landed rate for each item across vendors
  const getL1VendorForItem = (itemId: string): { vendorId: string; landedRate: number } | null => {
    let lowestRate = Infinity;
    let lowestVendorId = '';
    cs.vendors.forEach((v) => {
      const rate = v.itemRates[itemId];
      if (rate && rate.isQuoted && rate.landedRate > 0 && rate.landedRate < lowestRate) {
        lowestRate = rate.landedRate;
        lowestVendorId = v.vendorId;
      }
    });
    return lowestVendorId ? { vendorId: lowestVendorId, landedRate: lowestRate } : null;
  };

  const handleConfirmApproval = () => {
    setSubmitting(true);
    const dateStr = new Date().toLocaleDateString('en-GB');
    const approverName = currentUser.name.toLowerCase().includes('pranjal')
      ? 'Pranjal Agrawal'
      : currentUser.name;
    const designation = currentUser.name.toLowerCase().includes('pranjal')
      ? 'Executive Director / Authorized Signatory'
      : 'Authorized Signatory';

    const approvalDetails: CsApprovalDetails = {
      approverName,
      approverDesignation: designation,
      approvalDate: `${dateStr} | ${new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })}`,
      remarks,
      signatureStamp: `VERIFIED-L1-${Date.now().toString().slice(-6)}`,
    };

    const updatedCs: ComparativeStatement = {
      ...cs,
      status: 'Approved',
      approvedBy: approverName,
      approvalDate: dateStr,
      awardedVendorMap: awardedMap,
      approvalDetails,
      updatedAt: dateStr,
    };

    // Save updated CS Sheet to storage
    const savedCs = storageAdapter.saveComparativeStatement(updatedCs);

    // Call callback to advance FMS stage with actual timestamp
    onApproveL1(savedCs, remarks);
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 overflow-y-auto">
      <div className="bg-white rounded-2xl max-w-5xl w-full shadow-2xl border border-slate-200 overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in duration-200">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between shrink-0 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500 text-slate-950 flex items-center justify-center font-black shadow-md">
              <Award className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-black tracking-tight">
                  L1 Vendor Selection &amp; CS Approval
                </h3>
                <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-amber-400 text-slate-950 rounded">
                  APPROVAL STAGE (PRANJAL SIR / L1)
                </span>
              </div>
              <p className="text-xs text-slate-300">
                Barbrik Project Ltd. &bull; Indent #{cs.indentNo || flow.indentNo} ({cs.site}) &bull; Purpose: {cs.forPurpose}
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

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 text-xs text-slate-800">
          {/* Summary Banner */}
          <div className="p-4 bg-amber-50/80 border border-amber-200 rounded-xl flex items-center justify-between gap-4">
            <div className="space-y-1">
              <h4 className="font-black text-amber-950 text-sm flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-amber-700" />
                <span>Executive Director Approval Protocol</span>
              </h4>
              <p className="text-xs text-amber-900 leading-relaxed">
                Review vendor landed rates below. The system auto-highlights lowest cost (L1) items in emerald. Select the winning vendor per line item and submit approval.
              </p>
            </div>
            <div className="text-right shrink-0 bg-white px-3 py-2 rounded-lg border border-amber-200 shadow-2xs font-mono">
              <span className="text-[10px] text-slate-500 font-bold block">Indent Reference</span>
              <span className="font-black text-slate-900 text-sm">#{cs.indentNo}</span>
            </div>
          </div>

          {/* Vendor Rate Comparison Table */}
          <div>
            <h4 className="font-black text-slate-900 text-sm mb-3 flex items-center gap-2">
              <span>Itemized Vendor Rate Comparison Grid</span>
              <span className="text-[11px] font-normal text-slate-500">
                ({cs.items.length} items across {cs.vendors.length} vendors)
              </span>
            </h4>

            <div className="border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
              <table className="w-full text-left border-collapse">
                <thead className="bg-slate-100 text-slate-800 font-bold text-[11px] border-b border-slate-200">
                  <tr>
                    <th className="p-3 w-10 text-center">S.N.</th>
                    <th className="p-3 min-w-[200px]">Item Description &amp; Qty</th>
                    {cs.vendors.map((v, vIdx) => (
                      <th key={v.vendorId} className="p-3 min-w-[160px] text-center bg-slate-200/60 border-l border-slate-300">
                        <div className="font-black text-slate-900 text-xs">V{vIdx + 1}: {v.vendorName}</div>
                        <div className="text-[10px] font-normal text-slate-600 mt-0.5">{v.paymentTerms}</div>
                      </th>
                    ))}
                    <th className="p-3 w-48 text-center bg-amber-100/60 border-l border-amber-300">
                      Awarded Vendor (L1)
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 bg-white text-xs">
                  {cs.items.map((item, idx) => {
                    const l1Data = getL1VendorForItem(item.id);

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="p-3 text-center font-bold text-slate-500">
                          {idx + 1}
                        </td>
                        <td className="p-3">
                          <p className="font-black text-slate-900">{item.itemName}</p>
                          <p className="text-[10px] font-semibold text-indigo-700 mt-0.5">
                            Make: {item.brandMake} &bull; Qty: {item.qty} {item.unit}
                          </p>
                        </td>

                        {/* Vendors Columns */}
                        {cs.vendors.map((v) => {
                          const rateData = v.itemRates[item.id];
                          const isL1 = l1Data?.vendorId === v.vendorId;
                          const isSelected = (awardedMap[item.id] || l1Data?.vendorId) === v.vendorId;

                          return (
                            <td
                              key={v.vendorId}
                              onClick={() => {
                                if (rateData && rateData.isQuoted) {
                                  setAwardedMap({ ...awardedMap, [item.id]: v.vendorId });
                                }
                              }}
                              className={`p-3 text-center border-l border-slate-200 cursor-pointer transition-colors ${
                                isSelected
                                  ? 'bg-amber-100/60 dark:bg-amber-950/40 font-bold ring-2 ring-amber-500/50'
                                  : isL1
                                  ? 'bg-emerald-50/70 font-bold'
                                  : 'hover:bg-slate-100/80'
                              }`}
                            >
                              {rateData && rateData.isQuoted && rateData.landedRate > 0 ? (
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="radio"
                                    name={`l1_award_${item.id}`}
                                    checked={isSelected}
                                    onChange={() => setAwardedMap({ ...awardedMap, [item.id]: v.vendorId })}
                                    className="w-4 h-4 text-amber-600 focus:ring-amber-500 accent-amber-600 cursor-pointer"
                                  />
                                  <div>
                                    <div className="font-mono font-black text-slate-900 text-sm">
                                      ₹{rateData.landedRate.toFixed(2)}
                                    </div>
                                    <div className="text-[10px] text-slate-500 mt-0.5">
                                      Base: ₹{rateData.baseRate} + {rateData.gstPercent}% GST
                                    </div>
                                    {isL1 && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-black bg-emerald-600 text-white px-2 py-0.5 rounded-full mt-1 shadow-2xs">
                                        <Zap className="w-2.5 h-2.5" /> L1 LOWEST
                                      </span>
                                    )}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">Not Quoted</span>
                              )}
                            </td>
                          );
                        })}

                        {/* Awarded Vendor Selection Badge */}
                        <td className="p-3 border-l border-amber-200 bg-amber-50/30 text-center">
                          {(() => {
                            const selectedVendorId = awardedMap[item.id] || l1Data?.vendorId;
                            const selVendor = cs.vendors.find(v => v.vendorId === selectedVendorId);
                            return selVendor ? (
                              <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-600 text-white rounded-lg font-bold text-xs shadow-xs">
                                <Check className="w-3.5 h-3.5" />
                                <span>{selVendor.vendorName}</span>
                              </span>
                            ) : (
                              <span className="text-slate-400 text-xs italic">Select Vendor</span>
                            );
                          })()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Approval Sign-off Form */}
          <div className="p-4 bg-slate-900 text-white rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-black text-sm text-white flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-amber-400" />
                <span>Executive Sign-Off &amp; Approval Remarks</span>
              </h4>
              <span className="text-[11px] text-amber-300 font-bold font-mono">
                PRANJAL AGRAWAL (EXECUTIVE DIRECTOR)
              </span>
            </div>

            <div>
              <label className="block text-slate-300 text-xs font-semibold mb-1">
                Approval Notes &amp; Award Justification <span className="text-rose-400">*</span>
              </label>
              <textarea
                rows={2}
                value={remarks}
                onChange={(e) => setRemarks(e.target.value)}
                placeholder="Enter executive remarks for order award..."
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs font-medium focus:ring-2 focus:ring-amber-400 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex items-center justify-between shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-slate-300 hover:bg-slate-100 text-slate-700 font-bold rounded-xl text-xs transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirmApproval}
            disabled={submitting}
            className="px-6 py-2.5 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-slate-950 font-black rounded-xl text-xs shadow-md flex items-center gap-2 transition-all cursor-pointer"
          >
            <ShieldCheck className="w-4 h-4 text-slate-950" />
            <span>{submitting ? 'Submitting Sign-off...' : 'Approve L1 Selection & Advance FMS'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
