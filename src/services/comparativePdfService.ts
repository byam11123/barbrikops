import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { ComparativeStatement } from '../types';
import { calculateCsL1Analytics } from './comparativeExcelService';

/**
 * Generates and triggers browser download of the Barbrik Project Ltd.
 * Comparative Statement as a high-resolution, corporate color-designed Landscape PDF.
 * Formatted with exact column widths, corporate navy/gold styling,
 * standard INR / Rs. currency representations (preventing unicode glyph corruption),
 * smart dynamic pagination, and clean word wrapping.
 */
export function downloadComparativeStatementPdf(cs: ComparativeStatement): void {
  // A4 Landscape: 297mm x 210mm
  const doc = new jsPDF({
    orientation: 'landscape',
    unit: 'mm',
    format: 'a4',
  });

  const analytics = calculateCsL1Analytics(cs);
  const { itemL1Map, vendorTotals, singleLowestVendor, splitPoOptimizedTotal, splitPoSavings, savingsPercent } = analytics;

  const pageWidth = 297;
  const pageHeight = 210;
  const margin = 10;
  const contentWidth = pageWidth - margin * 2; // 277mm

  // ==========================================
  // 1. TOP HEADER & CORPORATE BRANDING BANNER (Page 1)
  // Deep Navy (#1F4E79) with Gold Accent Line (#D4AF37)
  // ==========================================
  doc.setFillColor(31, 78, 121); // #1F4E79
  doc.rect(margin, 8, contentWidth, 13, 'F');

  // Gold accent strip
  doc.setFillColor(212, 175, 55); // #D4AF37
  doc.rect(margin, 21, contentWidth, 1.2, 'F');

  // Company and Sheet Title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text('BARBRIK PROJECT LTD.  •  COMPARATIVE STATEMENT (CS SHEET)', margin + 4, 16.5);

  doc.setFontSize(8);
  doc.setFont('helvetica', 'normal');
  doc.text('PROCUREMENT & ENGINEERING DIVISION', pageWidth - margin - 4, 16.5, { align: 'right' });

  // ==========================================
  // 2. REQUISITION CONTEXT GRID (Header Box)
  // ==========================================
  const headerBoxY = 24;
  const headerBoxHeight = 15;
  doc.setFillColor(248, 250, 252); // slate-50
  doc.setDrawColor(203, 213, 225); // slate-300
  doc.setLineWidth(0.3);
  doc.rect(margin, headerBoxY, contentWidth, headerBoxHeight, 'FD');

  // Row 1 of header box
  doc.setFontSize(7.5);
  doc.setTextColor(71, 85, 105); // slate-600
  doc.setFont('helvetica', 'bold');
  doc.text('SITE:', margin + 4, headerBoxY + 5.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(15, 23, 42); // slate-900
  doc.text(cs.site || '[Not Specified]', margin + 14, headerBoxY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text('INDENT NO:', margin + 65, headerBoxY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cs.indentNo || '[Not Specified]', margin + 85, headerBoxY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text('INDENT DATE:', margin + 130, headerBoxY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cs.indentDate || '[Not Specified]', margin + 154, headerBoxY + 5.5);

  doc.setTextColor(71, 85, 105);
  doc.text('STATEMENT DATE:', margin + 195, headerBoxY + 5.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cs.statementDate || new Date().toLocaleDateString('en-GB'), margin + 226, headerBoxY + 5.5);

  // Row 2 of header box
  doc.setTextColor(71, 85, 105);
  doc.text('FOR PURPOSE:', margin + 4, headerBoxY + 11.5);
  doc.setTextColor(15, 23, 42);
  doc.text(cs.forPurpose || '[General Spare Parts & Consumables]', margin + 28, headerBoxY + 11.5);

  doc.setTextColor(71, 85, 105);
  doc.text('STATUS:', margin + 195, headerBoxY + 11.5);
  if (cs.status === 'Approved' || cs.status === 'PO Created') {
    doc.setTextColor(4, 120, 87); // emerald-700
    doc.text(`DIGITALLY APPROVED (${cs.approvalDetails?.approverName || 'Pranjal Agrawal'})`, margin + 211, headerBoxY + 11.5);
  } else {
    doc.setTextColor(180, 83, 9); // amber-700
    doc.text('DRAFT / IN REVIEW', margin + 211, headerBoxY + 11.5);
  }

  // ==========================================
  // 3. TABLE 1: MAIN COMPARATIVE MATRIX
  // ==========================================
  const vendorCount = Math.max(1, cs.vendors.length);

  // Proportional Column Width Calculation (exact budget of 277mm)
  // Spec columns: S.N. (8), ITEM (46), BRAND (23), UNIT (10), QTY (9) = 96mm
  const snWidth = 8;
  const itemWidth = 46;
  const brandWidth = 23;
  const unitWidth = 10;
  const qtyWidth = 9;
  const specTotalWidth = snWidth + itemWidth + brandWidth + unitWidth + qtyWidth; // 96mm
  const vendorAvailableWidth = contentWidth - specTotalWidth; // 181mm
  const perVendorWidth = vendorAvailableWidth / vendorCount; // ~60.33mm for 3 vendors

  const rateColWidth = Math.floor(perVendorWidth * 0.35); // ~21mm
  const gstColWidth = Math.floor(perVendorWidth * 0.28);  // ~17mm
  const amtColWidth = perVendorWidth - rateColWidth - gstColWidth; // ~22.33mm

  // Build header rows (2-tier)
  const t1HeaderRow1: any[] = [
    { content: 'REQUISITION SPECIFICATION', colSpan: 5, styles: { halign: 'center', fillColor: [15, 23, 42], textColor: [255, 255, 255] } },
  ];

  cs.vendors.forEach((v) => {
    t1HeaderRow1.push({
      content: `${v.vendorName.toUpperCase()}\n(Rating: ${v.rating || '4.0/5'})`,
      colSpan: 3,
      styles: { halign: 'center', fillColor: [47, 85, 151], textColor: [255, 255, 255] },
    });
  });

  // Second header row: Clean currency units to prevent awkward line breaks
  const t1HeaderRow2: string[] = ['S.N.', 'ITEM NAME', 'BRAND', 'UNIT', 'QTY'];
  cs.vendors.forEach(() => {
    t1HeaderRow2.push('RATE (Rs.)', 'GST (Rs.)', 'TOTAL (Rs.)');
  });

  // Table 1 columnStyles map
  const t1ColumnStyles: Record<number, any> = {
    0: { cellWidth: snWidth, halign: 'center' },
    1: { cellWidth: itemWidth, halign: 'left' },
    2: { cellWidth: brandWidth, halign: 'left' },
    3: { cellWidth: unitWidth, halign: 'center' },
    4: { cellWidth: qtyWidth, halign: 'center' },
  };

  for (let vi = 0; vi < vendorCount; vi++) {
    const baseCol = 5 + vi * 3;
    t1ColumnStyles[baseCol] = { cellWidth: rateColWidth, halign: 'right' };
    t1ColumnStyles[baseCol + 1] = { cellWidth: gstColWidth, halign: 'right' };
    t1ColumnStyles[baseCol + 2] = { cellWidth: amtColWidth, halign: 'right' };
  }

  // Data rows
  const t1BodyRows: any[] = [];
  cs.items.forEach((item, idx) => {
    const l1 = itemL1Map[item.id];
    const assignedVendorId =
      (cs.awardedVendorMap && cs.awardedVendorMap[item.id]) || l1?.l1VendorId;

    const row: any[] = [
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
        const isAwarded = assignedVendorId === v.vendorId;

        // Clean newline badge
        let cellText = q.baseRate.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
        if (isL1 && isAwarded) cellText += '\n[L-1 & AW]';
        else if (isL1) cellText += '\n[L-1]';
        else if (isAwarded) cellText += '\n[Awarded]';

        // L-1 soft green cell styling: fillColor [198, 239, 206], textColor [0, 97, 0]
        const rateCellStyle: any = { halign: 'right' };
        if (isL1) {
          rateCellStyle.fillColor = [198, 239, 206];
          rateCellStyle.textColor = [0, 97, 0];
          rateCellStyle.fontStyle = 'bold';
        } else if (isAwarded) {
          rateCellStyle.fillColor = [238, 242, 255];
          rateCellStyle.textColor = [49, 46, 129];
        }

        row.push({ content: cellText, styles: rateCellStyle });
        row.push({ content: q.gstAmount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }), styles: { halign: 'right' } });
        row.push({
          content: q.amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }),
          styles: {
            halign: 'right',
            fontStyle: 'bold',
            fillColor: isL1 ? [220, 252, 231] : undefined,
            textColor: isL1 ? [0, 97, 0] : [15, 23, 42],
          },
        });
      } else {
        row.push({ content: 'Not Quoted', styles: { halign: 'center', textColor: [148, 163, 184] } });
        row.push({ content: '0.00', styles: { halign: 'right', textColor: [148, 163, 184] } });
        row.push({ content: '0.00', styles: { halign: 'right', textColor: [148, 163, 184] } });
      }
    });

    t1BodyRows.push(row);
  });

  // Grand Total Row
  const totalRow: any[] = [
    { content: 'GRAND TOTAL', colSpan: 5, styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] } },
  ];
  cs.vendors.forEach((v) => {
    const vTotal = vendorTotals.find((vt) => vt.vendorId === v.vendorId);
    const isOverallLowest = singleLowestVendor && singleLowestVendor.vendorId === v.vendorId;

    totalRow.push({ content: '—', styles: { halign: 'center', fillColor: [241, 245, 249], textColor: [100, 116, 139] } });
    totalRow.push({
      content: vTotal ? vTotal.gstTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00',
      styles: { halign: 'right', fontStyle: 'bold', fillColor: [241, 245, 249], textColor: [15, 23, 42] },
    });
    totalRow.push({
      content: `${vTotal ? vTotal.totalLanded.toLocaleString('en-IN', { minimumFractionDigits: 2 }) : '0.00'}${isOverallLowest ? '\n[Overall L-1]' : ''}`,
      styles: {
        halign: 'right',
        fontStyle: 'bold',
        fillColor: isOverallLowest ? [198, 239, 206] : [241, 245, 249],
        textColor: isOverallLowest ? [0, 97, 0] : [15, 23, 42],
      },
    });
  });
  t1BodyRows.push(totalRow);

  // Approved Row (Strict Barbrik Procurement Rule)
  const approvedSignText = cs.approvalDetails
    ? `APPROVED BY: ${cs.approvalDetails.approverName}\n(${cs.approvalDetails.approverDesignation})\nDate: ${cs.approvalDetails.approvalDate}\nRef: ${cs.approvalDetails.signatureStamp}`
    : 'APPROVED BY:\nAuthorized Signatory (Barbrik Project Ltd.)';

  const approvedRow: any[] = [
    { content: approvedSignText, colSpan: 5, styles: { halign: 'left', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [6, 95, 70] } },
  ];

  cs.vendors.forEach((v) => {
    const awardedItems = cs.items.filter((it) => (cs.awardedVendorMap || {})[it.id] === v.vendorId);
    const isAwarded = awardedItems.length > 0;

    if (cs.approvalDetails && isAwarded) {
      approvedRow.push({
        content: `Digitally Signed\n${cs.approvalDetails.approverName}\n[PO Approved: ${awardedItems.length} Items]`,
        colSpan: 3,
        styles: { halign: 'center', fontStyle: 'bold', fillColor: [236, 253, 245], textColor: [4, 120, 87] },
      });
    } else if (cs.approvalDetails) {
      approvedRow.push({
        content: `Evaluated & Retained\n[0 Items in Current PO]`,
        colSpan: 3,
        styles: { halign: 'center', fillColor: [248, 250, 252], textColor: [100, 116, 139] },
      });
    } else {
      approvedRow.push({
        content: `Sign: ___________________\n${v.vendorName}`,
        colSpan: 3,
        styles: { halign: 'center', textColor: [100, 116, 139] },
      });
    }
  });
  t1BodyRows.push(approvedRow);

  autoTable(doc, {
    startY: headerBoxY + headerBoxHeight + 2.5,
    head: [t1HeaderRow1, t1HeaderRow2],
    body: t1BodyRows,
    theme: 'grid',
    styles: {
      fontSize: 6.8,
      cellPadding: { top: 1.2, bottom: 1.2, left: 1, right: 1.2 },
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 6.8,
      cellPadding: 1.2,
    },
    columnStyles: t1ColumnStyles,
    margin: { left: margin, right: margin },
  });

  // Get final Y position after Table 1
  let currentY = (doc as any).lastAutoTable.finalY + 5;

  // Check if Table 2 can comfortably fit on Page 1 (needs ~35mm)
  const table2EstimatedHeight = (cs.items.length + 1) * 5 + 8;
  const table2FitsPage1 = currentY + table2EstimatedHeight <= 194;

  if (!table2FitsPage1) {
    doc.addPage();
    renderContinuationBanner(doc, cs, margin, contentWidth, pageWidth, 'PERCENTAGE VARIANCE MATRIX');
    currentY = 22;
  }

  // ==========================================
  // 4. TABLE 2: PERCENTAGE VARIANCE MATRIX (% vs. L-1)
  // Clean column allocation and Rs. formatting
  // ==========================================
  const t2Headers: string[] = ['S.N.', 'ITEM NAME', 'L-1 RATE (Rs.)'];
  cs.vendors.forEach((v) => {
    t2Headers.push(`${v.vendorName} (% vs L-1)`);
  });

  const t2BodyRows: any[] = [];
  cs.items.forEach((item, idx) => {
    const l1 = itemL1Map[item.id];
    const row: any[] = [
      idx + 1,
      item.itemName,
      l1 && l1.l1Rate > 0 ? l1.l1Rate.toFixed(2) : 'Not Quoted',
    ];

    cs.vendors.forEach((v) => {
      const q = v.itemRates[item.id];
      if (q && q.isQuoted && q.baseRate > 0 && l1 && l1.l1Rate > 0) {
        const variance = ((q.baseRate - l1.l1Rate) / l1.l1Rate) * 100;
        if (Math.abs(variance) < 0.001) {
          row.push({ content: '0.00% (L-1)', styles: { halign: 'center', fontStyle: 'bold', textColor: [0, 97, 0], fillColor: [198, 239, 206] } });
        } else {
          row.push({ content: `+${variance.toFixed(2)}%`, styles: { halign: 'center', textColor: [180, 83, 9] } });
        }
      } else {
        row.push({ content: 'Not Quoted', styles: { halign: 'center', textColor: [148, 163, 184] } });
      }
    });

    t2BodyRows.push(row);
  });

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('TABLE 2: PERCENTAGE VARIANCE MATRIX (% vs. L-1)', margin, currentY);
  currentY += 2;

  // Column styles for Table 2
  const t2Col0 = 10;
  const t2Col1 = 65;
  const t2Col2 = 26;
  const t2VendorWidth = (contentWidth - (t2Col0 + t2Col1 + t2Col2)) / vendorCount;

  const t2ColumnStyles: Record<number, any> = {
    0: { cellWidth: t2Col0, halign: 'center' },
    1: { cellWidth: t2Col1, halign: 'left' },
    2: { cellWidth: t2Col2, halign: 'right', fontStyle: 'bold' },
  };
  for (let vi = 0; vi < vendorCount; vi++) {
    t2ColumnStyles[3 + vi] = { cellWidth: t2VendorWidth, halign: 'center' };
  }

  autoTable(doc, {
    startY: currentY,
    head: [t2Headers],
    body: t2BodyRows,
    theme: 'grid',
    styles: {
      fontSize: 6.8,
      cellPadding: { top: 1.2, bottom: 1.2, left: 1, right: 1.2 },
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [30, 41, 59],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      halign: 'center',
      fontSize: 6.8,
      cellPadding: 1.2,
    },
    columnStyles: t2ColumnStyles,
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // ==========================================
  // 5. TABLE 3: COMMERCIAL TERMS & CONDITIONS
  // Freight & Delivery Terms: OURS for all vendors (regular font)
  // Smart dynamic pagination: only break page if insufficient space
  // ==========================================
  const table3EstimatedHeight = 11 * 4.2 + 8; // ~54mm
  if (currentY + table3EstimatedHeight > 194) {
    doc.addPage();
    renderContinuationBanner(doc, cs, margin, contentWidth, pageWidth, 'COMMERCIAL TERMS & SAVINGS ANALYSIS');
    currentY = 22;
  }

  const t3Headers: string[] = ['COMMERCIAL PARAMETERS', ...cs.vendors.map((v) => v.vendorName.toUpperCase())];
  const t3BodyRows: any[] = [
    ['Supplier / Vendor Name', ...cs.vendors.map((v) => v.vendorName)],
    ['Purchaser / Client', ...cs.vendors.map(() => 'Barbrik Project Ltd.')],
    ['Vendor Rating & Assessment', ...cs.vendors.map((v) => v.rating || '4.0 / 5.0 (Approved Supplier)')],
    ['Contact Person & Mobile', ...cs.vendors.map((v) => v.contactPersonMobile || '—')],
    ['Store / Office Address', ...cs.vendors.map((v) => v.storeOfficeAddress || '—')],
    ['Payment Terms', ...cs.vendors.map((v) => v.paymentTerms || '30 Days Credit')],
    ['Warranty Period', ...cs.vendors.map((v) => v.warrantyPeriod || '01 Year OEM Warranty')],
    ['GST & Tax Terms', ...cs.vendors.map((v) => v.gstTerms || 'Applicable GST As Quoted')],
    ['Freight & Delivery Terms', ...cs.vendors.map((v) => v.freightDeliveryTerms || 'OURS for all vendors (Barbrik Fleet Transit)')],
    ['Quotation Date & Validity', ...cs.vendors.map((v) => v.quotationDateValidity || '30 Days Validity')],
    ['Primary Product Focus', ...cs.vendors.map((v) => v.primaryProductFocus || 'Heavy Equipment & Consumables')],
  ];

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('TABLE 3: COMMERCIAL TERMS & CONDITIONS & VENDOR EVALUATION', margin, currentY);
  currentY += 2;

  const t3Col0Width = 55;
  const t3VendorColWidth = (contentWidth - t3Col0Width) / vendorCount;
  const t3ColumnStyles: Record<number, any> = {
    0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: t3Col0Width },
  };
  for (let vi = 0; vi < vendorCount; vi++) {
    t3ColumnStyles[1 + vi] = { cellWidth: t3VendorColWidth };
  }

  autoTable(doc, {
    startY: currentY,
    head: [t3Headers],
    body: t3BodyRows,
    theme: 'grid',
    styles: {
      fontSize: 6.8,
      cellPadding: { top: 1.2, bottom: 1.2, left: 1.5, right: 1.5 },
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
      valign: 'middle',
    },
    headStyles: {
      fillColor: [31, 78, 121],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 6.8,
      cellPadding: 1.4,
    },
    columnStyles: t3ColumnStyles,
    margin: { left: margin, right: margin },
  });

  currentY = (doc as any).lastAutoTable.finalY + 5;

  // ==========================================
  // 6. TABLE 4: PROCUREMENT RECOMMENDATIONS & SAVINGS
  // Clean Rs. formatting and explicit column width with line breaks to prevent truncation
  // ==========================================
  const table4EstimatedHeight = 3 * 7 + 8; // ~29mm
  if (currentY + table4EstimatedHeight > 194) {
    doc.addPage();
    renderContinuationBanner(doc, cs, margin, contentWidth, pageWidth, 'EXECUTIVE RECOMMENDATIONS & SAVINGS');
    currentY = 22;
  }

  const t4Headers: string[] = ['ANALYSIS PARAMETER', 'EXECUTIVE PROCUREMENT RECOMMENDATION & SAVINGS'];
  const t4BodyRows: any[] = [
    [
      'Direct L-1 Single PO:',
      singleLowestVendor
        ? `${singleLowestVendor.vendorName} is the overall single lowest bidder at Rs. ${singleLowestVendor.totalLanded.toLocaleString('en-IN', { minimumFractionDigits: 2 })}.`
        : 'Review individual item bids for qualification.',
    ],
    [
      'Split PO Optimization:',
      splitPoSavings > 0
        ? `Splitting PO across item-wise L-1 suppliers achieves total landed cost of Rs. ${splitPoOptimizedTotal.toLocaleString('en-IN', { minimumFractionDigits: 2 })}, delivering net savings of Rs. ${splitPoSavings.toLocaleString('en-IN', { minimumFractionDigits: 2 })} (${savingsPercent.toFixed(2)}%) compared to placing a single PO.`
        : `Single PO placement with ${singleLowestVendor?.vendorName || 'the L-1 supplier'} is already cost-optimal with zero split variance.`,
    ],
    [
      'Logistics & Authorization:',
      `Approved for procurement execution as per Barbrik Project Ltd. standards. Freight arranged under Barbrik fleet logistics (OURS). Payment and credit terms confirmed.`,
    ],
  ];

  doc.setFontSize(7.5);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(30, 41, 59);
  doc.text('TABLE 4: PROCUREMENT RECOMMENDATIONS & SAVINGS ANALYSIS', margin, currentY);
  currentY += 2;

  const t4Col0Width = 55;
  const t4Col1Width = contentWidth - t4Col0Width; // 222mm

  autoTable(doc, {
    startY: currentY,
    head: [t4Headers],
    body: t4BodyRows,
    theme: 'grid',
    styles: {
      fontSize: 7,
      cellPadding: 2,
      lineColor: [203, 213, 225],
      lineWidth: 0.15,
      textColor: [30, 41, 59],
      overflow: 'linebreak',
      valign: 'middle',
    },
    headStyles: {
      fillColor: [15, 23, 42],
      textColor: [255, 255, 255],
      fontStyle: 'bold',
      fontSize: 7,
      cellPadding: 1.5,
    },
    columnStyles: {
      0: { fontStyle: 'bold', fillColor: [248, 250, 252], cellWidth: t4Col0Width },
      1: { cellWidth: t4Col1Width },
    },
    margin: { left: margin, right: margin },
  });

  // ==========================================
  // 7. FOOTER CORPORATE SEAL / VERIFICATION
  // ==========================================
  const pageCount = (doc as any).internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    // Subtle separator line
    doc.setDrawColor(226, 232, 240);
    doc.setLineWidth(0.2);
    doc.line(margin, 202, pageWidth - margin, 202);

    doc.setFontSize(6.5);
    doc.setTextColor(148, 163, 184);
    doc.text(
      `Barbrik Project Ltd. • Comparative Statement • Generated on ${new Date().toLocaleString('en-GB')} • Page ${i} of ${pageCount}`,
      pageWidth / 2,
      205.5,
      { align: 'center' }
    );
  }

  // Save PDF
  const safeIndent = (cs.indentNo || 'CS').replace(/[^a-zA-Z0-9_-]/g, '_');
  const safeSite = (cs.site || 'SITE').replace(/[^a-zA-Z0-9_-]/g, '_');
  const dateStr = new Date().toISOString().slice(0, 10);
  const filename = `Barbrik_CS_${safeSite}_IND_${safeIndent}_${dateStr}.pdf`;
  doc.save(filename);
}

/**
 * Helper to render the sleek corporate continuation banner on pages 2+
 */
function renderContinuationBanner(
  doc: jsPDF,
  cs: ComparativeStatement,
  margin: number,
  contentWidth: number,
  pageWidth: number,
  sectionTitle: string
): void {
  // Deep Navy (#1F4E79)
  doc.setFillColor(31, 78, 121);
  doc.rect(margin, 8, contentWidth, 8, 'F');

  // Gold accent strip
  doc.setFillColor(212, 175, 55);
  doc.rect(margin, 16, contentWidth, 0.8, 'F');

  // Continuation title
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(8.5);
  doc.setFont('helvetica', 'bold');
  doc.text(`BARBRIK PROJECT LTD.  •  ${sectionTitle}`, margin + 4, 13.5);

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.text(
    `SITE: ${cs.site || 'SITE'}  |  INDENT NO: ${cs.indentNo || 'N/A'}  |  INDENT DATE: ${cs.indentDate || 'N/A'}`,
    pageWidth - margin - 4,
    13.5,
    { align: 'right' }
  );
}
