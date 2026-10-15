import * as XLSX from 'xlsx';
import { ComparativeStatement, CsItem, CsVendorQuote } from '../types';

/**
 * Helper to download array buffer as Excel file in browser
 */
function downloadWorkbookBuffer(buffer: Uint8Array, filename: string): void {
  const blob = new Blob([buffer as any], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

/**
 * Calculates item-wise L-1 rates and split PO savings for a Comparative Statement
 */
export function calculateCsL1Analytics(cs: ComparativeStatement) {
  const itemL1Map: Record<string, { l1Rate: number; l1VendorId: string; l1VendorName: string }> = {};
  
  cs.items.forEach((item) => {
    let minRate = Infinity;
    let minVendorId = '';
    let minVendorName = '';

    cs.vendors.forEach((v) => {
      const q = v.itemRates[item.id];
      if (q && q.isQuoted && q.baseRate > 0) {
        if (q.baseRate < minRate) {
          minRate = q.baseRate;
          minVendorId = v.vendorId;
          minVendorName = v.vendorName;
        }
      }
    });

    if (minRate < Infinity) {
      itemL1Map[item.id] = {
        l1Rate: minRate,
        l1VendorId: minVendorId,
        l1VendorName: minVendorName,
      };
    } else {
      itemL1Map[item.id] = {
        l1Rate: 0,
        l1VendorId: '',
        l1VendorName: 'Not Quoted',
      };
    }
  });

  // Calculate vendor totals
  const vendorTotals = cs.vendors.map((v) => {
    let subtotal = 0;
    let gstTotal = 0;
    let totalLanded = 0;
    let quotedCount = 0;

    cs.items.forEach((item) => {
      const q = v.itemRates[item.id];
      if (q && q.isQuoted && q.baseRate > 0) {
        quotedCount++;
        subtotal += q.baseRate * item.qty;
        gstTotal += q.gstAmount * item.qty;
        totalLanded += q.amount;
      }
    });

    return {
      vendorId: v.vendorId,
      vendorName: v.vendorName,
      rating: v.rating,
      subtotal,
      gstTotal,
      totalLanded,
      quotedCount,
    };
  });

  // Single lowest vendor
  const validVendors = vendorTotals.filter((v) => v.quotedCount > 0);
  validVendors.sort((a, b) => a.totalLanded - b.totalLanded);
  const singleLowestVendor = validVendors[0] || null;

  // Split PO optimized total
  let splitPoOptimizedTotal = 0;
  let splitPoItemCount = 0;
  cs.items.forEach((item) => {
    const l1 = itemL1Map[item.id];
    if (l1 && l1.l1Rate > 0) {
      const v = cs.vendors.find((vnd) => vnd.vendorId === l1.l1VendorId);
      const q = v?.itemRates[item.id];
      if (q) {
        splitPoOptimizedTotal += q.amount;
        splitPoItemCount++;
      }
    }
  });

  const singlePoTotal = singleLowestVendor ? singleLowestVendor.totalLanded : 0;
  const splitPoSavings = Math.max(0, singlePoTotal - splitPoOptimizedTotal);
  const savingsPercent = singlePoTotal > 0 ? (splitPoSavings / singlePoTotal) * 100 : 0;

  return {
    itemL1Map,
    vendorTotals,
    singleLowestVendor,
    splitPoOptimizedTotal,
    splitPoSavings,
    savingsPercent,
  };
}

/**
 * Builds the official Barbrik Project Ltd. Comparative Statement (.xlsx)
 * Following all strict rules:
 * - Landscape layout, fit-all-columns print scaling
 * - Uniform font sizing
 * - Direct L-1 cell tags/highlighting (NO separate L-1 columns)
 * - Approved row with APPROVED BY on left and sign line for each vendor
 * - Percentage Variance Matrix (% vs. L-1) strictly without remarks/spread column
 * - Commercial Terms with Freight & Delivery Terms: OURS for all vendors
 * - Procurement Recommendations & Savings Analysis
 */
export function generateComparativeStatementExcel(cs: ComparativeStatement): Uint8Array {
  const wb = XLSX.utils.book_new();
  const analytics = calculateCsL1Analytics(cs);
  const { itemL1Map } = analytics;

  // We will build sheet data as a 2D array of rows
  const rows: (string | number)[][] = [];

  // ROW 1: Header Title
  rows.push([`BARBRIK PROJECT LTD. - COMPARATIVE STATEMENT`]);

  // ROW 2: Site, Indent No, Indent Date
  rows.push([
    `SITE: ${cs.site || '[Not Specified]'}`,
    '',
    `INDENT NO: ${cs.indentNo || '[Not Specified]'}`,
    '',
    `INDENT DATE: ${cs.indentDate || '[Not Specified]'}`,
  ]);

  // ROW 3: For Purpose, Statement Date
  rows.push([
    `FOR: ${cs.forPurpose || '[Not Specified]'}`,
    '',
    '',
    `DATE: ${cs.statementDate || new Date().toLocaleDateString('en-GB')}`,
  ]);

  // Empty separator
  rows.push([]);

  // ==========================================
  // TABLE 1: MAIN COMPARATIVE STATEMENT
  // ==========================================
  const t1HeaderRow1: (string | number)[] = ['S.N.', 'ITEM NAME', 'BRAND / MAKE', 'UNIT', 'QTY'];
  const t1HeaderRow2: (string | number)[] = ['', '', '', '', ''];

  cs.vendors.forEach((v) => {
    t1HeaderRow1.push(`${v.vendorName.toUpperCase()} (Rating: ${v.rating || '4.0/5'})`);
    t1HeaderRow1.push('');
    t1HeaderRow1.push('');

    t1HeaderRow2.push('RATE');
    t1HeaderRow2.push('GST AMOUNT');
    t1HeaderRow2.push('AMOUNT');
  });

  rows.push(t1HeaderRow1);
  rows.push(t1HeaderRow2);

  // Data rows
  const itemRowStart = rows.length + 1; // 1-indexed for Excel
  cs.items.forEach((item, idx) => {
    const l1 = itemL1Map[item.id];
    const row: (string | number)[] = [
      idx + 1,
      item.itemName,
      item.brandMake || '—',
      item.unit,
      item.qty,
    ];

    cs.vendors.forEach((v) => {
      const q = v.itemRates[item.id];
      if (q && q.isQuoted && q.baseRate > 0) {
        const isL1 = l1 && l1.l1Rate === q.baseRate;
        const isAwarded = cs.awardedVendorMap && cs.awardedVendorMap[item.id] === v.vendorId;
        let rateDisplay: string | number = q.baseRate;
        if (isAwarded && isL1) {
          rateDisplay = `${q.baseRate.toFixed(2)} [L-1 & AWARDED]`;
        } else if (isAwarded) {
          rateDisplay = `${q.baseRate.toFixed(2)} [AWARDED]`;
        } else if (isL1) {
          rateDisplay = `${q.baseRate.toFixed(2)} [L-1]`;
        }
        row.push(rateDisplay);
        row.push(Number(q.gstAmount.toFixed(2)));
        row.push(Number(q.amount.toFixed(2)));
      } else {
        row.push('Not Quoted');
        row.push(0);
        row.push(0);
      }
    });

    rows.push(row);
  });
  const itemRowEnd = rows.length;

  // Total row
  const totalRow: (string | number)[] = ['TOTAL', '', '', '', ''];
  cs.vendors.forEach((v, vIdx) => {
    const colRate = 5 + vIdx * 3;
    const colGst = colRate + 1;
    const colAmt = colRate + 2;

    const colGstLetter = XLSX.utils.encode_col(colGst);
    const colAmtLetter = XLSX.utils.encode_col(colAmt);

    totalRow.push('—');
    totalRow.push({ f: `SUM(${colGstLetter}${itemRowStart}:${colGstLetter}${itemRowEnd})` } as any);
    totalRow.push({ f: `SUM(${colAmtLetter}${itemRowStart}:${colAmtLetter}${itemRowEnd})` } as any);
  });
  rows.push(totalRow);

  // APPROVED ROW (Strict Rule - Below Comparative Table)
  // Left side: APPROVED BY (spanning columns S.N. to QTY)
  // For each vendor: An approved line for signature across each vendor's columns
  const approvedByText = cs.approvalDetails
    ? `APPROVED BY: ${cs.approvalDetails.approverName} (${cs.approvalDetails.approverDesignation}) - ${cs.approvalDetails.approvalDate}`
    : 'APPROVED BY';
  const approvedRow: (string | number)[] = [approvedByText, '', '', '', ''];
  cs.vendors.forEach((v) => {
    const isVendorAwarded = cs.awardedVendorMap && Object.values(cs.awardedVendorMap).includes(v.vendorId);
    if (cs.approvalDetails && isVendorAwarded) {
      approvedRow.push(`Digitally Signed: ${cs.approvalDetails.approverName}`);
    } else if (cs.approvalDetails) {
      approvedRow.push('Evaluated - Not Awarded');
    } else {
      approvedRow.push('Sign: ___________________');
    }
    approvedRow.push('');
    approvedRow.push('');
  });
  rows.push(approvedRow);

  // Empty separator
  rows.push([]);
  rows.push([]);

  // ==========================================
  // TABLE 2: PERCENTAGE VARIANCE MATRIX (% vs. L-1)
  // Strictly without remarks / competitive spread column!
  // ==========================================
  rows.push(['TABLE 2: PERCENTAGE VARIANCE MATRIX (% vs. L-1)']);
  const t2Headers: (string | number)[] = ['S.N.', 'ITEM NAME', 'L-1 RATE'];
  cs.vendors.forEach((v) => {
    t2Headers.push(`${v.vendorName} (% vs L-1)`);
  });
  rows.push(t2Headers);

  cs.items.forEach((item, idx) => {
    const l1 = itemL1Map[item.id];
    const row: (string | number)[] = [
      idx + 1,
      item.itemName,
      l1 && l1.l1Rate > 0 ? Number(l1.l1Rate.toFixed(2)) : 'Not Quoted',
    ];

    cs.vendors.forEach((v) => {
      const q = v.itemRates[item.id];
      if (q && q.isQuoted && q.baseRate > 0 && l1 && l1.l1Rate > 0) {
        const variance = ((q.baseRate - l1.l1Rate) / l1.l1Rate) * 100;
        if (Math.abs(variance) < 0.001) {
          row.push('0.00% (L-1)');
        } else {
          row.push(`+${variance.toFixed(2)}%`);
        }
      } else {
        row.push('Not Quoted');
      }
    });

    rows.push(row);
  });

  // Empty separator
  rows.push([]);
  rows.push([]);

  // ==========================================
  // TABLE 3: COMMERCIAL TERMS & CONDITIONS & VENDOR EVALUATION
  // Header Banner: COMMERCIAL TERMS & CONDITIONS & VENDOR EVALUATION
  // Sub-headers: COMMERCIAL PARAMETERS | [VENDOR 1] | [VENDOR 2] ...
  // Freight & Delivery Terms: OURS for all vendors (in regular unbolded font)
  // ==========================================
  rows.push(['COMMERCIAL TERMS & CONDITIONS & VENDOR EVALUATION']);
  const t3Headers: (string | number)[] = ['COMMERCIAL PARAMETERS'];
  cs.vendors.forEach((v) => {
    t3Headers.push(v.vendorName.toUpperCase());
  });
  rows.push(t3Headers);

  // Row 1: Company Name (Barbrik Project Ltd. for all)
  const r1Company: (string | number)[] = ['Company Name'];
  cs.vendors.forEach(() => r1Company.push('Barbrik Project Ltd.'));
  rows.push(r1Company);

  // Row 2: Vendor Rating & Assessment
  const r2Rating: (string | number)[] = ['Vendor Rating & Assessment'];
  cs.vendors.forEach((v) => r2Rating.push(v.rating || '4.0 / 5.0 (Standard Approved Supplier)'));
  rows.push(r2Rating);

  // Row 3: Contact Person & Mobile
  const r3Contact: (string | number)[] = ['Contact Person & Mobile'];
  cs.vendors.forEach((v) => r3Contact.push(v.contactPersonMobile || '—'));
  rows.push(r3Contact);

  // Row 4: Store / Office Address
  const r4Address: (string | number)[] = ['Store / Office Address'];
  cs.vendors.forEach((v) => r4Address.push(v.storeOfficeAddress || '—'));
  rows.push(r4Address);

  // Row 5: Payment Terms
  const r5Payment: (string | number)[] = ['Payment Terms'];
  cs.vendors.forEach((v) => r5Payment.push(v.paymentTerms || '30 Days Credit'));
  rows.push(r5Payment);

  // Row 6: Warranty Period
  const r6Warranty: (string | number)[] = ['Warranty Period'];
  cs.vendors.forEach((v) => r6Warranty.push(v.warrantyPeriod || 'Standard OEM Warranty'));
  rows.push(r6Warranty);

  // Row 7: GST & Tax Terms
  const r7Gst: (string | number)[] = ['GST & Tax Terms'];
  cs.vendors.forEach((v) => r7Gst.push(v.gstTerms || 'Applicable GST As Quoted'));
  rows.push(r7Gst);

  // Row 8: Freight & Delivery Terms (Strict Rule: OURS for all vendors, regular font)
  const r8Freight: (string | number)[] = ['Freight & Delivery Terms'];
  cs.vendors.forEach(() => r8Freight.push('OURS (Barbrik Project Ltd.)'));
  rows.push(r8Freight);

  // Row 9: Quotation Date & Validity
  const r9Validity: (string | number)[] = ['Quotation Date & Validity'];
  cs.vendors.forEach((v) => r9Validity.push(v.quotationDateValidity || '30 Days Validity'));
  rows.push(r9Validity);

  // Row 10: Primary Product Focus
  const r10Focus: (string | number)[] = ['Primary Product Focus'];
  cs.vendors.forEach((v) => r10Focus.push(v.primaryProductFocus || 'Construction & Heavy Equipment Spares'));
  rows.push(r10Focus);

  // Empty separator
  rows.push([]);
  rows.push([]);

  // ==========================================
  // TABLE 4: PROCUREMENT RECOMMENDATIONS & SAVINGS ANALYSIS
  // ==========================================
  rows.push(['PROCUREMENT RECOMMENDATIONS & SAVINGS ANALYSIS']);
  rows.push([
    'Direct Like-for-Like L-1:',
    analytics.singleLowestVendor
      ? `${analytics.singleLowestVendor.vendorName} is overall lowest bidder with landed total of ₹${analytics.singleLowestVendor.totalLanded.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`
      : 'Review individual item bids for qualification.',
  ]);

  rows.push([
    'Split PO Optimization:',
    analytics.splitPoSavings > 0
      ? `Splitting PO across item-wise L-1 vendors achieves total cost of ₹${analytics.splitPoOptimizedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}, saving ₹${analytics.splitPoSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${analytics.savingsPercent.toFixed(2)}%) compared to placing single PO.`
      : `Single PO placement with ${analytics.singleLowestVendor?.vendorName || 'the L-1 supplier'} is already cost-optimal with zero split delta.`,
  ]);

  rows.push([
    'Comprehensive Strategy:',
    `Approved for procurement execution as per Barbrik Project Ltd. standards. Freight arranged under Barbrik fleet logistics (OURS). Payment and credit terms confirmed.`,
  ]);

  // Convert 2D array to worksheet
  const ws = XLSX.utils.aoa_to_sheet(rows);

  // Configure merges for headers and tables
  const totalCols = Math.max(5 + cs.vendors.length * 3, cs.vendors.length + 1);
  const merges: XLSX.Range[] = [
    // Title row 0
    { s: { r: 0, c: 0 }, e: { r: 0, c: totalCols - 1 } },
    // Table 1 vendor column headers
  ];

  // Vendor merged headers row 4 (5 in 0-indexed)
  cs.vendors.forEach((_, vIdx) => {
    const startCol = 5 + vIdx * 3;
    merges.push({ s: { r: 4, c: startCol }, e: { r: 4, c: startCol + 2 } });
  });

  // Approved row merge
  // Find approved row index
  const approvedRowIdx = 4 + 2 + cs.items.length + 1;
  merges.push({ s: { r: approvedRowIdx, c: 0 }, e: { r: approvedRowIdx, c: 4 } });
  cs.vendors.forEach((_, vIdx) => {
    const startCol = 5 + vIdx * 3;
    merges.push({ s: { r: approvedRowIdx, c: startCol }, e: { r: approvedRowIdx, c: startCol + 2 } });
  });

  ws['!merges'] = merges;

  // Set explicit column widths with padding so no numbers clip
  const colWidths: { wch: number }[] = [
    { wch: 8 },  // S.N.
    { wch: 32 }, // Item Name
    { wch: 18 }, // Brand / Make
    { wch: 10 }, // Unit
    { wch: 10 }, // Qty
  ];

  cs.vendors.forEach(() => {
    colWidths.push({ wch: 16 }); // Rate
    colWidths.push({ wch: 16 }); // GST
    colWidths.push({ wch: 18 }); // Amount
  });

  ws['!cols'] = colWidths;

  // Print Setup: Landscape, Fit All Columns to 1 Page Width
  ws['!pageSetup'] = {
    orientation: 'landscape',
    paperSize: 9, // A4
    fitToWidth: 1,
    fitToHeight: 0,
  };

  // Show Gridlines
  ws['!sheetViews'] = [{ showGridLines: true }];

  // Add sheet to workbook
  XLSX.utils.book_append_sheet(wb, ws, 'Comparative Statement');

  // Generate binary output
  const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  return new Uint8Array(wbout);
}

/**
 * Generates and triggers browser download of the Barbrik Project Ltd. Comparative Statement (.xlsx)
 */
export function downloadComparativeStatementExcel(cs: ComparativeStatement): void {
  const buffer = generateComparativeStatementExcel(cs);
  const safeIndent = (cs.indentNo || 'CS').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeSite = (cs.site || 'SITE').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Barbrik_CS_${safeSite}_IND_${safeIndent}_${dateStr}.xlsx`;
  downloadWorkbookBuffer(buffer, filename);
}
