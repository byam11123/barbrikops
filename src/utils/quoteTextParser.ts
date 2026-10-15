import { CsItem, CsVendorQuote, CsVendorItemRate } from '../types';

export interface ParsedQuoteResult {
  site?: string;
  indentNo?: string;
  indentDate?: string;
  forPurpose?: string;
  items: CsItem[];
  vendors: CsVendorQuote[];
}

/**
 * Intelligent quotation text parser for vendor bids and WhatsApp messages
 * Extracts Site, Indent, For (Equipment), line items, quantities, and vendor rates
 */
export function parseRawQuoteText(rawText: string, existingItems: CsItem[] = []): ParsedQuoteResult {
  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  
  let detectedSite = '';
  let detectedIndentNo = '';
  let detectedIndentDate = '';
  let detectedFor = '';

  const extractedItems: CsItem[] = [...existingItems];
  const vendorQuotesMap: Map<string, { vendorName: string; rates: Map<string, number>; gstRates: Map<string, number> }> = new Map();
  let currentVendorName = '';

  // 1. Scan for header metadata
  for (const line of lines) {
    const siteMatch = line.match(/(?:site|location|project)\s*[:=-]\s*([a-zA-Z0-9\s_-]+)/i);
    if (siteMatch && !detectedSite) {
      detectedSite = siteMatch[1].trim();
    }

    const indentMatch = line.match(/(?:indent\s*(?:no|num)?|ind\s*no)\s*[:=-]\s*([a-zA-Z0-9\s_-]+)/i);
    if (indentMatch && !detectedIndentNo) {
      detectedIndentNo = indentMatch[1].trim();
    }

    const dateMatch = line.match(/(?:date|indent\s*date)\s*[:=-]\s*(\d{1,2}[/-]\d{1,2}[/-]\d{2,4})/i);
    if (dateMatch && !detectedIndentDate) {
      detectedIndentDate = dateMatch[1].trim();
    }

    const forMatch = line.match(/(?:for|equipment|purpose|vehicle|plant)\s*[:=-]\s*([a-zA-Z0-9\s_\-&().+]+)/i);
    if (forMatch && !detectedFor) {
      detectedFor = forMatch[1].trim();
    }
  }

  // 2. Scan lines for Vendor delimiters or item quotation lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check if line represents a vendor title
    const vendorHeaderMatch = line.match(/^(?:vendor|supplier|m\/s|party|quote\s*by|quotation\s*from)\s*[:=-]?\s*([a-zA-Z0-9\s.,&()'-]+)$/i) ||
      line.match(/^(?:vendor\s*[A-Z0-9]|supplier\s*[A-Z0-9])[:\s-]+([a-zA-Z0-9\s.,&()'-]+)/i);

    if (vendorHeaderMatch) {
      currentVendorName = vendorHeaderMatch[1].trim();
      if (!vendorQuotesMap.has(currentVendorName)) {
        vendorQuotesMap.set(currentVendorName, {
          vendorName: currentVendorName,
          rates: new Map(),
          gstRates: new Map(),
        });
      }
      continue;
    }

    // Check item quote format (e.g. "1. GREASE NIPPLE 8NO - 10 NOS @ 45/- GST 18%")
    // or tab-separated / pipe-separated
    const numberedItemMatch = line.match(/^(\d+)[\.\)]\s*(.+?)(?:[-–—:|]|\s{2,})(.+)$/);
    if (numberedItemMatch) {
      const sn = parseInt(numberedItemMatch[1], 10);
      const itemDescPart = numberedItemMatch[2].trim();
      const quoteDetailsPart = numberedItemMatch[3].trim();

      // Extract rate, qty, unit, gst
      const rateMatch = quoteDetailsPart.match(/(?:rate|@|rs\.?|inr|₹)?\s*(\d+(?:\.\d+)?)\s*(?:\/-|\/pc|\/nos|\/set)?/i);
      const rate = rateMatch ? parseFloat(rateMatch[1]) : 0;

      const qtyMatch = quoteDetailsPart.match(/(\d+(?:\.\d+)?)\s*(nos|no|set|kg|bag|mtr|meter|ltr|liter|mt|pkt)/i);
      const qty = qtyMatch ? parseFloat(qtyMatch[1]) : 1;
      const unit = qtyMatch ? qtyMatch[2].toUpperCase() : 'NOS';

      const gstMatch = quoteDetailsPart.match(/(?:gst|tax)\s*[:=-]?\s*(\d+(?:\.\d+)?)\s*%/i);
      const gstPercent = gstMatch ? parseFloat(gstMatch[1]) : 18;

      // Brand match e.g. (HINO ASCO) or [TATA]
      const brandMatch = itemDescPart.match(/\(([a-zA-Z0-9\s&/.-]+)\)/) || itemDescPart.match(/\[([a-zA-Z0-9\s&/.-]+)\]/);
      const brand = brandMatch ? brandMatch[1].trim() : '—';
      const cleanItemName = itemDescPart.replace(/\([a-zA-Z0-9\s&/.-]+\)/, '').trim();

      // Check if item already in extractedItems
      let existing = extractedItems.find((it) => it.itemName.toLowerCase() === cleanItemName.toLowerCase());
      if (!existing) {
        existing = {
          id: `item-${Date.now()}-${extractedItems.length + 1}`,
          sn: extractedItems.length + 1,
          itemName: cleanItemName,
          brandMake: brand,
          unit: unit,
          qty: qty,
        };
        extractedItems.push(existing);
      }

      // Record rate if vendor known
      if (currentVendorName && vendorQuotesMap.has(currentVendorName)) {
        const vData = vendorQuotesMap.get(currentVendorName)!;
        vData.rates.set(existing.id, rate);
        vData.gstRates.set(existing.id, gstPercent);
      }
    }
  }

  // If no vendors detected explicitly from headers, create 2 standard placeholder vendors
  if (vendorQuotesMap.size === 0) {
    vendorQuotesMap.set('Supplier A', { vendorName: 'Supplier A', rates: new Map(), gstRates: new Map() });
    vendorQuotesMap.set('Supplier B', { vendorName: 'Supplier B', rates: new Map(), gstRates: new Map() });
  }

  // Construct final vendor quotes
  const vendors: CsVendorQuote[] = Array.from(vendorQuotesMap.values()).map((vData, idx) => {
    const itemRates: Record<string, CsVendorItemRate> = {};

    extractedItems.forEach((item) => {
      const baseRate = vData.rates.get(item.id) || 0;
      const gstPercent = vData.gstRates.get(item.id) || 18;
      const gstAmount = (baseRate * gstPercent) / 100;
      const landedRate = baseRate + gstAmount;
      const amount = landedRate * item.qty;

      itemRates[item.id] = {
        baseRate,
        gstPercent,
        gstAmount,
        landedRate,
        amount,
        isQuoted: baseRate > 0,
      };
    });

    return {
      vendorId: `vnd-${Date.now()}-${idx + 1}`,
      vendorName: vData.vendorName,
      rating: '4.5 / 5.0 (Top Rated Supplier)',
      contactPersonMobile: 'Contact Person | Mo: +91-9876543210',
      storeOfficeAddress: 'Local Commercial Market, Chhattisgarh',
      paymentTerms: '30 Days Credit',
      warrantyPeriod: '01 Year Comprehensive Warranty',
      gstTerms: '18% GST Applicable',
      freightDeliveryTerms: 'OURS (Barbrik Project Ltd.)',
      quotationDateValidity: `${new Date().toLocaleDateString('en-GB')} | 30 Days Validity`,
      primaryProductFocus: 'Heavy Equipment Spares & Consumables',
      itemRates,
    };
  });

  return {
    site: detectedSite,
    indentNo: detectedIndentNo,
    indentDate: detectedIndentDate,
    forPurpose: detectedFor,
    items: extractedItems,
    vendors,
  };
}
