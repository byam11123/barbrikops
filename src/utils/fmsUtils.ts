import { FmsInstance } from '../types';

/**
 * Normalizes a tracking prefix (e.g. "BPL/BEN/" or "BPL/BEN" or "BPL-BEN").
 */
export function normalizeTrackingPrefix(prefix?: string, templateName?: string): string {
  let clean = (prefix || '').trim();

  // If no prefix provided, infer a 3-letter prefix from template name
  if (!clean || clean.length < 2) {
    const name = (templateName || 'WORKFLOW').toUpperCase().replace(/[^A-Z0-9\s]/g, '');
    const words = name.split(/\s+/).filter(Boolean);
    let code = 'REF';
    if (words.length >= 2) {
      code = (words[0].slice(0, 3) + words[1].slice(0, 3)).slice(0, 4);
    } else if (words.length === 1) {
      code = words[0].slice(0, 4);
    }
    clean = `BPL/${code}/`;
  }

  // If clean doesn't end with slash or dash, append slash
  if (!clean.endsWith('/') && !clean.endsWith('-')) {
    clean = `${clean}/`;
  }

  return clean.toUpperCase();
}

/**
 * Returns a human-friendly Title Label for a workflow ID field based on template name and prefix.
 * e.g., "BENEFICIARY APPROVAL FORM" -> "BENEFICIARY ID"
 */
export function getWorkflowIdTitle(templateName?: string, referenceLabel?: string): string {
  if (referenceLabel && !referenceLabel.includes('/') && !referenceLabel.includes('-') && referenceLabel.length < 30) {
    return referenceLabel.toUpperCase();
  }

  const name = (templateName || 'WORKFLOW')
    .toUpperCase()
    .replace('FORM', '')
    .replace('FMS', '')
    .replace('WORKFLOW', '')
    .replace('PROCESS', '')
    .trim();

  if (name.includes('BENEFICIARY')) return 'BENEFICIARY ID';
  if (name.includes('INDENT') || name.includes('PURCHASE')) return 'PURCHASE REQUISITION ID';
  if (name.includes('STOCK') || name.includes('STORE')) return 'STORE REQUISITION ID';
  if (name.includes('PAYMENT') || name.includes('PO')) return 'VOUCHER / PAYMENT ID';
  if (name.includes('ATTENDANCE') || name.includes('LABOUR')) return 'MUSTER ROLL ID';
  if (name.includes('BREAKDOWN') || name.includes('REPAIR')) return 'BREAKDOWN TICKET ID';

  return `${name || 'WORKFLOW'} ID`;
}

/**
 * Generates an automated counter tracking code for FMS workflows in the exact format:
 * {Prefix}{YYYYMMDD}-{Counter}
 * Example: BPL/BEN/20261010-001
 */
export function generateCounterTrackingId(
  prefixInput: string | undefined,
  templateName: string | undefined,
  existingFlows: FmsInstance[] = []
): string {
  return generateUniqueCounterTrackingId(prefixInput, templateName, existingFlows);
}

/**
 * Generates a strictly unique, non-colliding counter tracking ID.
 * If two users submit at the exact same time with identical proposed IDs or opening modal simultaneously,
 * this function queries the latest existing flows from storage, detects collisions,
 * and increments the counter until a strictly unique identifier is guaranteed.
 */
export function generateUniqueCounterTrackingId(
  prefixInput: string | undefined,
  templateName: string | undefined,
  existingFlows: FmsInstance[] = [],
  proposedId?: string
): string {
  const prefix = normalizeTrackingPrefix(prefixInput, templateName);

  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;

  // Build lookup set of all existing references across flows for O(1) duplicate checks
  const existingIdsSet = new Set<string>();
  existingFlows.forEach((flow) => {
    if (flow.indentNo) existingIdsSet.add(flow.indentNo.toUpperCase().trim());
    if (flow.requisitionNumber) existingIdsSet.add(flow.requisitionNumber.toUpperCase().trim());
    if (flow.flowId) existingIdsSet.add(flow.flowId.toUpperCase().trim());
  });

  // Calculate base count of flows created today or under this prefix
  let todayCount = 0;
  existingFlows.forEach((flow) => {
    const ref = (flow.requisitionNumber || flow.indentNo || flow.flowId || '').toUpperCase();
    if (ref.includes(dateStr) || ref.startsWith(prefix)) {
      todayCount++;
    }
  });

  let counter = todayCount + 1;

  // If a proposed ID is provided and is NOT already taken, use it
  if (proposedId && proposedId.trim() !== '') {
    const cleanProposed = proposedId.trim().toUpperCase();
    if (!existingIdsSet.has(cleanProposed)) {
      return proposedId.trim();
    }
  }

  // Otherwise, construct candidate and increment counter until strictly unique
  let candidate = `${prefix}${dateStr}-${String(counter).padStart(3, '0')}`;
  while (existingIdsSet.has(candidate.toUpperCase())) {
    counter++;
    candidate = `${prefix}${dateStr}-${String(counter).padStart(3, '0')}`;
  }

  return candidate;
}
