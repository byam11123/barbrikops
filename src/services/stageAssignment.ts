import { FmsStageDefinition, FmsStageExecution, FmsInstance, UserProfile, ChecklistItem, DelegationTask } from '../types';
import { 
  FMS_CHECK_STOCK_STAGES, 
  FMS_STANDARD_PURCHASE_STAGES, 
  FMS_PO_PAYMENT_STAGES,
  FMS_PURCHASE_TO_STORE_DISPATCH_STAGES,
  FMS_STORE_TO_SITE_DISPATCH_STAGES,
  FMS_PAYMENT_TO_DISPATCH_STAGES,
  FMS_SITE_RECEIVE_STAGES,
  FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES,
  FMS_HR_ATTENDANCE_PAYMENT_STAGES,
  FMS_BREAKDOWN_REPORTING_STAGES,
  FMS_EQUIPMENT_PART_REPAIR_STAGES,
  FMS_DPR_REPORTING_STAGES,
  FMS_BENEFICIARY_APPROVAL_STAGES
} from '../data/initialData';

/**
 * Strict role and assignee matching for FMS stages across all flows:
 * 1. Check Stock FMS (Store Verification):
 *    - Amanat Bharadwaj (Store Manager)
 * 2. Store to Site Dispatch FMS (Stock Available):
 *    - Stages 1 to 8: Store Manager - Sumant (Siladehi) / Hemant (Bijetala)
 *    - Stage 9: Purchaser (Rajnikant Behera / Purchaser)
 * 3. Indent to PO FMS (Purchase Dept):
 *    - Stage 1: Store Manager (Amanat Bharadwaj)
 *    - Stages 2, 5, 6, 7, 8: Asst. Manager Purchase & Store (Bramhanand Patel)
 *    - Stage 4: Project Manager (Pranay Ghosh / Chakravarti Ji)
 *    - Stages 3, 9, 10, 11, 12: Purchase Executive (Shyam Rao Sureshe / Rajnikant Behera)
 * 4. PO to Payment FMS (Accounts Dept):
 *    - Stages 1, 5, 8, 12: Finance Approver (Pranjal Agrawal / Khushboo Sahu)
 *    - Stages 2, 4, 6, 9, 10, 15: Accounts Executive / Manager (Byamkesh Kaiwartya / Manish Koshle / Priyanka)
 *    - Stages 3, 7: Purchase Executive (Shyam Rao Sureshe)
 *    - Stages 11, 13, 14: EA / Accounts (Khushboo Sahu / Rajnikant / Vivek)
 * 5. Accounts Invoice Collection FMS:
 *    - Stages 1, 2, 6, 7: Accounts Manager (Byamkesh Kaiwartya / Priyanka / Manish Koshle / Accounts)
 *    - Stages 3, 4: Purchase Manager (Bramhanand Patel)
 *    - Stage 5: Khushboo Sahu (EA)
 * 6. HR Labour Attendance & Payment FMS:
 *    - Stage 1: Site Incharge
 *    - Stages 2, 3, 4, 5, 6, 9, 10, 11: Garima Pal (HR)
 *    - Stage 7: Mamta (HR / Accounts)
 *    - Stage 8: Nandita / Khilesh (Planning / DPR)
 * 7. Purchase to Store to Dispatch FMS:
 *    - Stages 1, 4, 5, 7, 8, 9: Store Manager (Bramhanand Patel)
 *    - Stages 2, 3, 6: Purchase Executive (Shyam Rao Sureshe)
 *    - Stage 10: Purchaser (Rajendra / Vivek / Rajnikant)
 * 8. Payment to Dispatch FMS:
 *    - Stages 1, 4, 5, 6, 7: Purchase Assistant / Purchaser (Rajendra / Vivek / Rajnikant)
 *    - Stages 2, 3: Purchase Executive (Shyam Rao Sureshe)
 * 9. Site Receive FMS:
 *    - Stages 1, 2, 3, 4, 5, 6, 8: Store Incharge (Amanat Bharadwaj / Site Store Incharge)
 *    - Stage 7: Construction (Civil Incharge) / Mechanical Incharge (Pranay Ghosh / Chakravarti Ji)
 *    - Stages 9, 10: Site DEO (Site Data Entry Operator)
 */
export const isUserResponsibleForStage = (
  stageDef: FmsStageDefinition | undefined,
  stageExec: FmsStageExecution | undefined,
  user: UserProfile
): boolean => {
  if (!user || (!stageDef && !stageExec)) return false;

  const userName = user.name.toLowerCase().trim();
  const userRole = user.role.toLowerCase().trim();
  const targetAssignee = (stageExec?.assignee || stageDef?.whoDefaultAssignee || '').toLowerCase().trim();

  // 1. Direct Explicit Assignee Name Check
  if (targetAssignee) {
    const userParts = userName.split(/[\s,._/-]+/).filter(Boolean);
    const hasNameMatch = userParts.some(p => p.length >= 3 && targetAssignee.includes(p));
    if (hasNameMatch) return true;

    // List of specific individuals in the organization
    const knownIndividuals = [
      'khushboo', 'pranjal', 'bramhanand', 'shyam', 'rajnikant', 
      'rajendra', 'vivek', 'amanat', 'sumant', 'hemant', 
      'garima', 'mamta', 'khilesh', 'nandita', 'pranay', 
      'chakravarti', 'byamkesh', 'manish', 'priyanka', 'ritu'
    ];

    // If this stage is explicitly assigned to a known individual other than the current user, reject
    const assignedToOtherIndividual = knownIndividuals.some(ind => 
      targetAssignee.includes(ind) && !userName.includes(ind)
    );

    if (assignedToOtherIndividual) {
      return false;
    }
  }

  if (!stageDef) {
    return false;
  }

  // Equipment Part Repair FMS Stages
  if (stageDef.stageId?.startsWith('STG-EQP-')) {
    // Purchase Manager (Bramhanand Patel): Stages 1, 2, 3, 4, 5, 8, 9, 14, 15
    if (['STG-EQP-01', 'STG-EQP-02', 'STG-EQP-03', 'STG-EQP-04', 'STG-EQP-05', 'STG-EQP-08', 'STG-EQP-09', 'STG-EQP-14', 'STG-EQP-15'].includes(stageDef.stageId)) {
      return userName.includes('bramhanand') ||
             userName.includes('patel') ||
             userRole.includes('purchase manager') ||
             userRole.includes('asst. manager purchase & store') ||
             userRole.includes('purchase') ||
             userRole.includes('admin');
    }
    // Purchase Executive (Shyam Rao Sureshe): Stages 6, 7, 10, 12, 13, 16
    if (['STG-EQP-06', 'STG-EQP-07', 'STG-EQP-10', 'STG-EQP-12', 'STG-EQP-13', 'STG-EQP-16'].includes(stageDef.stageId)) {
      return userName.includes('shyam') ||
             userName.includes('sureshe') ||
             userName.includes('rajnikant') ||
             userRole.includes('purchase executive') ||
             userRole.includes('purchase');
    }
    // Purchase Assistant (Rajendra / Vivek): Stage 11
    if (stageDef.stageId === 'STG-EQP-11') {
      return userName.includes('rajendra') ||
             userName.includes('vivek') ||
             userRole.includes('purchase assistant') ||
             userRole.includes('purchaser');
    }
    // Store Manager / Store Incharge (Sumant / Hemant / Bramhanand): Stages 17, 18
    if (['STG-EQP-17', 'STG-EQP-18'].includes(stageDef.stageId)) {
      return userName.includes('sumant') ||
             userName.includes('hemant') ||
             userName.includes('bramhanand') ||
             userName.includes('amanat') ||
             userRole.includes('store');
    }
  }

  // DPR (Daily Progress Report) FMS Stages
  if (stageDef.stageId?.startsWith('STG-DPR-')) {
    // Khilesh (Planning / DPR Incharge): Stages 1, 5, 6
    if (['STG-DPR-01', 'STG-DPR-05', 'STG-DPR-06'].includes(stageDef.stageId)) {
      return userName.includes('khilesh') || 
             userRole.includes('planning') || 
             userRole.includes('dpr') || 
             userRole.includes('site engineer');
    }
    // Nandita (Planning Executive): Stages 2, 3
    if (['STG-DPR-02', 'STG-DPR-03'].includes(stageDef.stageId)) {
      return userName.includes('nandita') || 
             userRole.includes('planning executive') || 
             userRole.includes('planning') || 
             userRole.includes('dpr');
    }
    // Pranay Ghosh (Mechanical Incharge): Stage 4
    if (stageDef.stageId === 'STG-DPR-04') {
      return userName.includes('pranay') || 
             userName.includes('chakravarti') || 
             userRole.includes('mechanical') || 
             userRole.includes('project manager');
    }
  }

  // Equipment Part Repair FMS Stages
  if (stageDef.stageId?.startsWith('STG-EQP-')) {
    // Purchase Manager (Bramhanand Patel): Stages 1, 2, 3, 4, 5, 8, 9, 14, 15
    if (['STG-EQP-01', 'STG-EQP-02', 'STG-EQP-03', 'STG-EQP-04', 'STG-EQP-05', 'STG-EQP-08', 'STG-EQP-09', 'STG-EQP-14', 'STG-EQP-15'].includes(stageDef.stageId)) {
      return userName.includes('bramhanand') || 
             userRole.includes('purchase manager') ||
             userRole.includes('asst. manager purchase & store') ||
             userRole.includes('purchase');
    }
    // Purchase Executive (Shyam Rao Sureshe): Stages 6, 7, 10, 12, 13, 16
    if (['STG-EQP-06', 'STG-EQP-07', 'STG-EQP-10', 'STG-EQP-12', 'STG-EQP-13', 'STG-EQP-16'].includes(stageDef.stageId)) {
      return userName.includes('shyam') || 
             userName.includes('rajnikant') || 
             userRole.includes('purchase executive') ||
             userRole.includes('purchaser');
    }
    // Purchase Assistant (Rajendra / Vivek): Stage 11
    if (stageDef.stageId === 'STG-EQP-11') {
      return userName.includes('rajendra') || 
             userName.includes('vivek') || 
             userRole.includes('purchase assistant');
    }
    // Store Manager / Store Incharge (Sumant / Hemant / Bramhanand): Stages 17, 18
    if (['STG-EQP-17', 'STG-EQP-18'].includes(stageDef.stageId)) {
      return userName.includes('sumant') || 
             userName.includes('hemant') || 
             userName.includes('bramhanand') ||
             userRole.includes('store manager') || 
             userRole.includes('store in charge') ||
             userRole.includes('store');
    }
  }

  // Machine/Vehicle/Plant Breakdown Reporting FMS Stages
  if (stageDef.stageId?.startsWith('STG-BRK-')) {
    // Mechanical Manager (J Chakraworti): Stages 3, 5, 9, 10, 11, 12
    if (['STG-BRK-03', 'STG-BRK-05', 'STG-BRK-09', 'STG-BRK-10', 'STG-BRK-11', 'STG-BRK-12'].includes(stageDef.stageId)) {
      return userName.includes('chakraworti') ||
             userName.includes('chakravarti') ||
             userName.includes('chakraborty') ||
             userRole.includes('mechanical') ||
             userRole.includes('mechanical manager') ||
             userRole.includes('admin');
    }
    // Store Keeper (Sumant Singh Chauhan / Pranab Chakraborty): Stages 6, 7
    if (['STG-BRK-06', 'STG-BRK-07'].includes(stageDef.stageId)) {
      return userName.includes('sumant') ||
             userName.includes('pranab') ||
             userRole.includes('store') ||
             userRole.includes('store keeper');
    }
    // Service Engineer / Mechanic: Stage 4
    if (stageDef.stageId === 'STG-BRK-04') {
      return userName.includes('service') ||
             userRole.includes('service engineer') ||
             userRole.includes('mechanic');
    }
    // Driver / Operator / Mechanic: Stages 13, 14
    if (['STG-BRK-13', 'STG-BRK-14'].includes(stageDef.stageId)) {
      return userRole.includes('driver') ||
             userRole.includes('operator') ||
             userRole.includes('mechanic') ||
             userName.includes('chotu');
    }
    // Default Site Mechanic: Stages 1, 2, 8
    return userName.includes('mechanic') ||
           userRole.includes('mechanic') ||
           userName.includes('chotu') ||
           userRole.includes('site');
  }

  // HR Labour Attendance & Payment FMS Stages
  if (stageDef.stageId?.startsWith('STG-HR-')) {
    // Stage 1: Site Incharge
    if (stageDef.stageId === 'STG-HR-01') {
      return userRole.includes('site incharge') ||
             userRole.includes('site') ||
             userRole.includes('incharge') ||
             userName.includes('site') ||
             userName.includes('amanat');
    }
    // Stage 7: Mamta (HR / Accounts Verification)
    if (stageDef.stageId === 'STG-HR-07') {
      return userName.includes('mamta') || 
             userRole.includes('hr') || 
             userRole.includes('accounts');
    }
    // Stage 8: Nandita / Khilesh (DPR / Planning)
    if (stageDef.stageId === 'STG-HR-08') {
      return userName.includes('nandita') || 
             userName.includes('khilesh') || 
             userName.includes('khileash') || 
             userRole.includes('planning') || 
             userRole.includes('dpr');
    }
    // Stages 2, 3, 4, 5, 6, 9, 10, 11: Garima Pal (HR)
    return userName.includes('garima') || 
           userRole.includes('hr') || 
           userRole.includes('human resources') ||
           userRole.includes('admin');
  }

  // Accounts Invoice Collection FMS Stages
  if (stageDef.stageId?.startsWith('STG-INV-')) {
    // Stages 1, 2, 6, 7: Accounts Manager (Byamkesh / Priyanka / Manish / Accounts)
    if (['STG-INV-01', 'STG-INV-02', 'STG-INV-06', 'STG-INV-07'].includes(stageDef.stageId)) {
      return userName.includes('byamkesh') || 
             userName.includes('priyanka') || 
             userName.includes('manish') || 
             userRole.includes('accounts') ||
             userRole.includes('it executive');
    }
    // Stages 3, 4: Purchase Manager (Bramhanand Patel)
    if (['STG-INV-03', 'STG-INV-04'].includes(stageDef.stageId)) {
      return userName.includes('bramhanand') || 
             userRole.includes('purchase manager') ||
             userRole.includes('asst. manager purchase & store') ||
             userRole.includes('purchase');
    }
    // Stage 5: Khushboo (EA) / Finance Approver
    if (stageDef.stageId === 'STG-INV-05') {
      return userName.includes('khushboo') || 
             userName.includes('pranjal') || 
             userRole.includes('ea') || 
             userRole.includes('executive assistant') ||
             userRole.includes('finance');
    }
  }

  // Store to Site Dispatch FMS Stages (Stock Available)
  if (stageDef.stageId?.startsWith('STG-SSD-')) {
    // Stages 1 to 8: Store Manager Sumant (Siladehi) / Hemant (Bijetala)
    if (['STG-SSD-01', 'STG-SSD-02', 'STG-SSD-03', 'STG-SSD-04', 'STG-SSD-05', 'STG-SSD-06', 'STG-SSD-07', 'STG-SSD-08'].includes(stageDef.stageId)) {
      return userName.includes('sumant') || 
             userName.includes('hemant') || 
             userName.includes('amanat') ||
             userRole.includes('store manager') || 
             userRole.includes('store in charge') ||
             userRole.includes('store');
    }
    // Stage 9: Get Receiving -> Purchaser
    if (stageDef.stageId === 'STG-SSD-09') {
      return userName.includes('rajnikant') || 
             userName.includes('rajendra') || 
             userName.includes('vivek') || 
             userRole.includes('purchaser') || 
             userRole.includes('purchase assistant');
    }
  }

  // Site Receive FMS Stages
  if (stageDef.stageId?.startsWith('STG-REC-')) {
    if (stageDef.stageId === 'STG-REC-07') {
      return userName.includes('pranay') || 
             userName.includes('chakravarti') || 
             userRole.includes('project manager') || 
             userRole.includes('civil') ||
             userRole.includes('mechanical');
    }
    if (['STG-REC-09', 'STG-REC-10'].includes(stageDef.stageId)) {
      return userRole.includes('deo') || 
             userRole.includes('data entry') || 
             userRole.includes('site') ||
             userName.includes('deo') ||
             userName.includes('amanat') ||
             userName.includes('vivek') ||
             userName.includes('rajendra');
    }
    return userName.includes('amanat') || 
           userName.includes('store') || 
           userRole.includes('store') ||
           userRole.includes('incharge') ||
           userRole.includes('site store');
  }

  // Check Stock FMS Stages (Store Manager)
  if (stageDef.stageId?.startsWith('STG-STK-')) {
    return userName.includes('amanat') || userRole.includes('store');
  }

  // Purchase to Store to Dispatch FMS Stages
  if (stageDef.stageId?.startsWith('STG-PSD-')) {
    // Stages 1, 4, 5, 7, 8, 9: Store Manager (Bramhanand Patel)
    if (['STG-PSD-01', 'STG-PSD-04', 'STG-PSD-05', 'STG-PSD-07', 'STG-PSD-08', 'STG-PSD-09'].includes(stageDef.stageId)) {
      return userName.includes('bramhanand') || 
             userRole.includes('store manager') || 
             userRole.includes('purchase & store');
    }
    // Stages 2, 3, 6: Purchase Executive (Shyam Rao Sureshe)
    if (['STG-PSD-02', 'STG-PSD-03', 'STG-PSD-06'].includes(stageDef.stageId)) {
      return userName.includes('shyam') || 
             userName.includes('rajnikant') || 
             userRole.includes('purchase executive');
    }
    // Stage 10: Get Receiving -> Purchaser (Rajendra / Vivek / Rajnikant)
    if (stageDef.stageId === 'STG-PSD-10') {
      return userName.includes('rajendra') || 
             userName.includes('vivek') || 
             userName.includes('rajnikant') || 
             userRole.includes('purchaser') || 
             userRole.includes('purchase assistant');
    }
  }

  // Payment to Dispatch FMS Stages
  if (stageDef.stageId?.startsWith('STG-DISP-')) {
    // Stages 2 & 3: Check & Verify with PO, Acceptability Check -> Purchase Executive (Shyam Rao Sureshe)
    if (['STG-DISP-02', 'STG-DISP-03'].includes(stageDef.stageId)) {
      return userName.includes('shyam') || 
             userName.includes('rajnikant') || 
             userRole.includes('purchase executive') ||
             userRole.includes('purchaser');
    }
    // Stages 1, 4, 5, 6, 7: Receive Material, Return/Replace, Credit Note, Dispatch -> Purchase Assistant (Rajendra/Vivek/Rajnikant)
    if (['STG-DISP-01', 'STG-DISP-04', 'STG-DISP-05', 'STG-DISP-06', 'STG-DISP-07'].includes(stageDef.stageId)) {
      return userName.includes('rajendra') || 
             userName.includes('vivek') || 
             userName.includes('rajnikant') || 
             userName.includes('bramhanand') || 
             userRole.includes('purchase assistant') || 
             userRole.includes('purchaser');
    }
  }

  // Accounts PO to Payment FMS Stages
  if (stageDef.stageId?.startsWith('STG-PAY-')) {
    // Finance approvals: STG-PAY-01, 05, 08, 12 -> Pranjal Agrawal / Khushboo Sahu
    if (['STG-PAY-01', 'STG-PAY-05', 'STG-PAY-08', 'STG-PAY-12'].includes(stageDef.stageId)) {
      return userName.includes('pranjal') || 
             userName.includes('khushboo') || 
             userRole.includes('finance');
    }
    // Accounts bank addition & payment processing: STG-PAY-02, 04, 06, 09, 10, 15 -> Byamkesh Kaiwartya / Manish / Priyanka
    if (['STG-PAY-02', 'STG-PAY-04', 'STG-PAY-06', 'STG-PAY-09', 'STG-PAY-10', 'STG-PAY-15'].includes(stageDef.stageId)) {
      return userName.includes('byamkesh') || 
             userName.includes('manish') || 
             userName.includes('priyanka') || 
             userRole.includes('accounts');
    }
    // Purchase liaison: STG-PAY-03, 07 -> Shyam Rao Sureshe / Rajnikant
    if (['STG-PAY-03', 'STG-PAY-07'].includes(stageDef.stageId)) {
      return userName.includes('shyam') || 
             userName.includes('rajnikant') || 
             userRole.includes('purchase');
    }
    // Stage 11 & Stage 14: Payment Approval Form (UPI) & Make Payment (UPI) -> Khushboo Sahu (EA)
    if (['STG-PAY-11', 'STG-PAY-14'].includes(stageDef.stageId)) {
      return userName.includes('khushboo') || 
             userName.includes('pranjal') || 
             userRole.includes('ea');
    }
    // Stage 13: Get QR Code -> Purchaser (Rajnikant / Vivek / Rajendra)
    if (stageDef.stageId === 'STG-PAY-13') {
      return userName.includes('rajnikant') || 
             userName.includes('vivek') || 
             userName.includes('rajendra') || 
             userName.includes('shyam') || 
             userRole.includes('purchaser');
    }
  }

  // Beneficiary Approval Form FMS Stages (Columns J to O)
  if (stageDef.stageId?.startsWith('STG-BEN-')) {
    // Stage 1: Finance approval -> Pranjal Agrawal / Khushboo Sahu
    if (stageDef.stageId === 'STG-BEN-01') {
      return userName.includes('pranjal') || 
             userName.includes('khushboo') || 
             userRole.includes('finance') ||
             userRole.includes('director');
    }
    // Stages 2 & 3: Net Banking Entry & Addition Confirmation -> Byamkesh Kaiwartya / Manish / Accounts
    if (['STG-BEN-02', 'STG-BEN-03'].includes(stageDef.stageId)) {
      return userName.includes('byamkesh') || 
             userName.includes('manish') || 
             userName.includes('priyanka') || 
             userName.includes('pranjal') || 
             userRole.includes('accounts');
    }
  }

  // Standard Indent to PO Purchase FMS Stages:
  // 1. Stage 1: Store Manager (Amanat Bharadwaj)
  if (stageDef.stageId === 'STG-01' || stageDef.stageNumber === 1) {
    return userName.includes('amanat') || userRole === 'store manager' || userRole.includes('store');
  }

  // 2. Stages 2, 5, 6, 7, 8: Asst. Manager Purchase & Store (Bramhanand Patel)
  if (['STG-02', 'STG-05', 'STG-06', 'STG-07', 'STG-08'].includes(stageDef.stageId)) {
    return userName.includes('bramhanand') || 
           (userRole.includes('asst') && userRole.includes('purchase')) ||
           userRole.includes('purchase & store');
  }

  // 3. Stage 4: Project Manager (Pranay Ghosh / Chakravarti Ji)
  if (stageDef.stageId === 'STG-04' || stageDef.stageNumber === 4) {
    return userName.includes('pranay') || 
           userName.includes('chakravarti') || 
           userRole.includes('project manager') || 
           userRole.includes('mechanical');
  }

  // 4. Stages 3, 9, 10, 11, 12: Purchase Executive (Shyam Rao Sureshe / Rajnikant Behera)
  if (['STG-03', 'STG-09', 'STG-10', 'STG-11', 'STG-12'].includes(stageDef.stageId)) {
    return userName.includes('shyam') || 
           userName.includes('rajnikant') || 
           userName.includes('rajendra') || 
           userRole.includes('purchase executive') || 
           userRole.includes('purchaser');
  }

  // Direct assignee matching
  const defaultAssignee = (stageDef.whoDefaultAssignee || '').toLowerCase();
  if (defaultAssignee && defaultAssignee.includes(userName)) {
    return true;
  }

  // Fallback direct name match on execution override:
  const execAssignee = (stageExec?.assignee || '').toLowerCase();
  if (execAssignee && execAssignee.includes(userName)) {
    return true;
  }

  return false;
};

/**
 * Returns true if an entire FMS flow's CURRENT active stage is awaiting the given user
 */
export const isFlowAwaitingUserAction = (
  flow: FmsInstance,
  user: UserProfile
): boolean => {
  if (flow.status === 'Completed' || flow.status === 'Cancelled') {
    return false;
  }

  const curIndex = flow.currentStageIndex;
  const curStage = flow.stages[curIndex];
  if (!curStage) return false;

  // Direct Assignee check on the active stage execution (essential for custom workflow templates)
  if (curStage.assignee && user?.name) {
    const userName = user.name.toLowerCase().trim();
    const targetAssignee = curStage.assignee.toLowerCase().trim();
    const userParts = userName.split(/[\s,._/-]+/).filter(Boolean);
    if (userParts.some(p => p.length >= 3 && targetAssignee.includes(p))) {
      return true;
    }
  }

  const stageDefs = flow.flowType === 'CHECK_STOCK'
    ? FMS_CHECK_STOCK_STAGES
    : flow.flowType === 'BENEFICIARY_APPROVAL'
    ? FMS_BENEFICIARY_APPROVAL_STAGES
    : flow.flowType === 'PO_TO_PAYMENT'
    ? FMS_PO_PAYMENT_STAGES
    : flow.flowType === 'PURCHASE_TO_STORE_DISPATCH'
    ? FMS_PURCHASE_TO_STORE_DISPATCH_STAGES
    : flow.flowType === 'STORE_TO_SITE_DISPATCH'
    ? FMS_STORE_TO_SITE_DISPATCH_STAGES
    : flow.flowType === 'PAYMENT_TO_DISPATCH'
    ? FMS_PAYMENT_TO_DISPATCH_STAGES
    : flow.flowType === 'SITE_RECEIVE'
    ? FMS_SITE_RECEIVE_STAGES
    : flow.flowType === 'ACCOUNTS_INVOICE_COLLECTION'
    ? FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES
    : flow.flowType === 'HR_ATTENDANCE_PAYMENT'
    ? FMS_HR_ATTENDANCE_PAYMENT_STAGES
    : flow.flowType === 'BREAKDOWN_REPORTING'
    ? FMS_BREAKDOWN_REPORTING_STAGES
    : flow.flowType === 'EQUIPMENT_PART_REPAIR'
    ? FMS_EQUIPMENT_PART_REPAIR_STAGES
    : flow.flowType === 'DPR_REPORTING'
    ? FMS_DPR_REPORTING_STAGES
    : FMS_STANDARD_PURCHASE_STAGES;

  const curDef = stageDefs[curIndex];
  if (!curDef) return false;

  return isUserResponsibleForStage(curDef, curStage, user);
};

/**
 * Returns stage definitions array for any flow type
 */
export const getStageDefinitionsForFlowType = (flowType: string): FmsStageDefinition[] => {
  switch (flowType) {
    case 'BENEFICIARY_APPROVAL':
      return FMS_BENEFICIARY_APPROVAL_STAGES;
    case 'CHECK_STOCK':
      return FMS_CHECK_STOCK_STAGES;
    case 'PO_TO_PAYMENT':
      return FMS_PO_PAYMENT_STAGES;
    case 'PURCHASE_TO_STORE_DISPATCH':
      return FMS_PURCHASE_TO_STORE_DISPATCH_STAGES;
    case 'STORE_TO_SITE_DISPATCH':
      return FMS_STORE_TO_SITE_DISPATCH_STAGES;
    case 'PAYMENT_TO_DISPATCH':
      return FMS_PAYMENT_TO_DISPATCH_STAGES;
    case 'SITE_RECEIVE':
      return FMS_SITE_RECEIVE_STAGES;
    case 'ACCOUNTS_INVOICE_COLLECTION':
      return FMS_ACCOUNTS_INVOICE_COLLECTION_STAGES;
    case 'HR_ATTENDANCE_PAYMENT':
      return FMS_HR_ATTENDANCE_PAYMENT_STAGES;
    case 'BREAKDOWN_REPORTING':
      return FMS_BREAKDOWN_REPORTING_STAGES;
    case 'EQUIPMENT_PART_REPAIR':
      return FMS_EQUIPMENT_PART_REPAIR_STAGES;
    case 'DPR_REPORTING':
      return FMS_DPR_REPORTING_STAGES;
    case 'INDENT_PURCHASE':
    default:
      return FMS_STANDARD_PURCHASE_STAGES;
  }
};

/**
 * Groups 16+ FMS flow types into 4 core operational domains
 */
export const getFmsDomainCategory = (flowType: string): {
  domainKey: 'PROCUREMENT' | 'FINANCE_ACCOUNTS' | 'SITE_LOGISTICS' | 'HR_EQUIPMENT';
  label: string;
  badgeClass: string;
} => {
  switch (flowType) {
    case 'INDENT_PURCHASE':
    case 'CHECK_STOCK':
    case 'SUBCONTRACTOR_BILLING':
      return {
        domainKey: 'PROCUREMENT',
        label: 'Procurement & Vendor Sourcing',
        badgeClass: 'bg-amber-100 text-amber-900 border-amber-300'
      };
    case 'BENEFICIARY_APPROVAL':
    case 'PO_TO_PAYMENT':
    case 'ACCOUNTS_INVOICE_COLLECTION':
    case 'PAYROLL':
      return {
        domainKey: 'FINANCE_ACCOUNTS',
        label: 'Accounts, Invoices & Finance',
        badgeClass: 'bg-emerald-100 text-emerald-900 border-emerald-300'
      };
    case 'PURCHASE_TO_STORE_DISPATCH':
    case 'STORE_TO_SITE_DISPATCH':
    case 'PAYMENT_TO_DISPATCH':
    case 'SITE_RECEIVE':
    case 'FUEL_ISSUE':
      return {
        domainKey: 'SITE_LOGISTICS',
        label: 'Site Logistics & Material Movement',
        badgeClass: 'bg-blue-100 text-blue-900 border-blue-300'
      };
    case 'HR_ATTENDANCE_PAYMENT':
    case 'BREAKDOWN_REPORTING':
    case 'EQUIPMENT_PART_REPAIR':
    case 'DPR_REPORTING':
    case 'LEAVE_SUBMISSION':
    default:
      return {
        domainKey: 'HR_EQUIPMENT',
        label: 'Plant, Equipment & Site Operations',
        badgeClass: 'bg-purple-100 text-purple-900 border-purple-300'
      };
  }
};

/**
 * Calculates SLA compliance status for a specific stage execution
 */
export const getStageSlaStatus = (
  slaHours: number,
  status: string,
  plannedStr?: string
): {
  status: 'DONE' | 'OVERDUE' | 'NEAR_BREACH' | 'ON_TRACK';
  label: string;
  badgeClass: string;
} => {
  if (status === 'Done' || status === 'Skipped') {
    return { status: 'DONE', label: 'Completed', badgeClass: 'bg-emerald-100 text-emerald-800' };
  }

  if (slaHours === 0 || !slaHours) {
    return { status: 'ON_TRACK', label: 'As Needed (No SLA)', badgeClass: 'bg-indigo-50 text-indigo-700 border border-indigo-200 font-medium' };
  }

  // Reference date matching system time: 05/10/2026
  const now = new Date(2026, 9, 5, 12, 0).getTime();
  
  if (!plannedStr) {
    return { status: 'ON_TRACK', label: `SLA: ${slaHours}h`, badgeClass: 'bg-slate-100 text-slate-700' };
  }

  try {
    const cleaned = plannedStr.split(' ')[0];
    const parts = cleaned.split('/');
    if (parts.length === 3) {
      const plannedTime = new Date(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])).getTime();
      const slaMs = slaHours * 60 * 60 * 1000;
      const deadline = plannedTime + slaMs;

      if (now > deadline) {
        const hrsOver = Math.round((now - deadline) / (1000 * 60 * 60));
        return { 
          status: 'OVERDUE', 
          label: `Overdue +${hrsOver}h`, 
          badgeClass: 'bg-rose-100 text-rose-800 border border-rose-300 font-bold animate-pulse' 
        };
      } else if (now > deadline - (slaMs * 0.3)) {
        return { 
          status: 'NEAR_BREACH', 
          label: `Near SLA (${slaHours}h)`, 
          badgeClass: 'bg-amber-100 text-amber-800 border border-amber-300 font-bold' 
        };
      }
    }
  } catch {
    // Fallback
  }

  return { status: 'ON_TRACK', label: `On Track (${slaHours}h SLA)`, badgeClass: 'bg-emerald-50 text-emerald-700 border border-emerald-200' };
};

/**
 * Finds all linked parent and child FMS flows for linear lineage tracing
 */
export const getLinkedFmsChain = (currentFlow: FmsInstance, allFlows: FmsInstance[]): FmsInstance[] => {
  const chain: FmsInstance[] = [];
  const indent = currentFlow.indentNo || currentFlow.requisitionNumber;
  const po = currentFlow.poNumber;

  allFlows.forEach((f) => {
    const fIndent = f.indentNo || f.requisitionNumber;
    const fPo = f.poNumber;

    if (f.id === currentFlow.id) {
      chain.push(f);
      return;
    }

    if (f.linkedFlowId === currentFlow.flowId || currentFlow.linkedFlowId === f.flowId) {
      chain.push(f);
      return;
    }

    if (indent && fIndent && indent === fIndent) {
      chain.push(f);
      return;
    }

    if (po && fPo && po === fPo) {
      chain.push(f);
      return;
    }
  });

  return Array.from(new Set(chain));
};

/**
 * Accurately matches any FMS flow instance against a workflowKey or template ID
 */
export const isFlowMatchingWorkflow = (
  flow: FmsInstance,
  workflowKeyOrTemplateId?: string | null
): boolean => {
  if (!workflowKeyOrTemplateId || workflowKeyOrTemplateId === 'ALL') return true;
  const target = workflowKeyOrTemplateId.trim();
  const targetUpper = target.toUpperCase();

  // 1. Exact match on flowType or customTemplateId
  if (flow.flowType === target || flow.flowType?.toUpperCase() === targetUpper) return true;
  if (flow.customTemplateId === target || flow.customTemplateId?.toUpperCase() === targetUpper) return true;

  // 2. Builtin template ID and templateKey aliases
  const BUILTIN_KEY_MAP: Record<string, string> = {
    tpl_indent_purchase: 'INDENT_PURCHASE',
    INDENT_PURCHASE: 'tpl_indent_purchase',
    tpl_check_stock: 'CHECK_STOCK',
    CHECK_STOCK: 'tpl_check_stock',
    tpl_po_to_payment: 'PO_TO_PAYMENT',
    PO_TO_PAYMENT: 'tpl_po_to_payment',
    tpl_beneficiary_approval: 'BENEFICIARY_APPROVAL',
    BENEFICIARY_APPROVAL: 'tpl_beneficiary_approval',
    tpl_purchase_to_store: 'PURCHASE_TO_STORE_DISPATCH',
    PURCHASE_TO_STORE_DISPATCH: 'tpl_purchase_to_store',
    tpl_store_to_site: 'STORE_TO_SITE_DISPATCH',
    STORE_TO_SITE_DISPATCH: 'tpl_store_to_site',
    tpl_site_receive: 'SITE_RECEIVE',
    SITE_RECEIVE: 'tpl_site_receive',
    tpl_payment_to_dispatch: 'PAYMENT_TO_DISPATCH',
    PAYMENT_TO_DISPATCH: 'tpl_payment_to_dispatch',
    tpl_accounts_invoice: 'ACCOUNTS_INVOICE_COLLECTION',
    ACCOUNTS_INVOICE_COLLECTION: 'tpl_accounts_invoice',
    tpl_hr_attendance: 'HR_ATTENDANCE_PAYMENT',
    HR_ATTENDANCE_PAYMENT: 'tpl_hr_attendance',
    tpl_breakdown: 'BREAKDOWN_REPORTING',
    BREAKDOWN_REPORTING: 'tpl_breakdown',
    tpl_part_repair: 'EQUIPMENT_PART_REPAIR',
    EQUIPMENT_PART_REPAIR: 'tpl_part_repair',
    tpl_dpr: 'DPR_REPORTING',
    DPR_REPORTING: 'tpl_dpr',
  };

  const alias = BUILTIN_KEY_MAP[target] || BUILTIN_KEY_MAP[targetUpper];
  if (alias) {
    if (flow.flowType === alias || flow.flowType?.toUpperCase() === alias.toUpperCase()) return true;
    if (flow.customTemplateId === alias || flow.customTemplateId?.toUpperCase() === alias.toUpperCase()) return true;
  }

  // Beneficiary Approval fallback heuristics (indent or requisition starting with BEN)
  if (targetUpper === 'BENEFICIARY_APPROVAL' || target === 'tpl_beneficiary_approval') {
    if (flow.flowType === 'BENEFICIARY_APPROVAL') return true;
    if (flow.indentNo && flow.indentNo.toUpperCase().includes('BEN')) return true;
    if (flow.requisitionNumber && flow.requisitionNumber.toUpperCase().includes('BEN')) return true;
  }

  return false;
};

/**
 * Resolves the department key for any FMS flow instance
 */
export const getFlowDepartmentKey = (
  flow: FmsInstance, 
  customTemplates?: Array<{ id: string; departmentHub?: string; templateKey?: string }>
): string => {
  if (flow.customTemplateId && customTemplates) {
    const tpl = customTemplates.find((t) => t.id === flow.customTemplateId);
    if (tpl?.departmentHub) {
      const hub = tpl.departmentHub.toUpperCase();
      if (hub === 'PROCUREMENT') return 'PURCHASE';
      if (hub === 'SITE_LOGISTICS') return 'STORE';
      if (hub === 'FINANCE_ACCOUNTS') return 'ACCOUNTS';
      if (hub === 'HR_EQUIPMENT') return 'PLANT_OPS';
      return hub;
    }
  }

  const ft = flow.flowType;
  if (['CHECK_STOCK', 'STORE_TO_SITE_DISPATCH', 'PURCHASE_TO_STORE_DISPATCH', 'SITE_RECEIVE', 'FUEL_ISSUE'].includes(ft)) {
    return 'STORE';
  }
  if (['INDENT_PURCHASE', 'PAYMENT_TO_DISPATCH', 'SUBCONTRACTOR_BILLING'].includes(ft)) {
    return 'PURCHASE';
  }
  if (['PO_TO_PAYMENT', 'ACCOUNTS_INVOICE_COLLECTION', 'PAYROLL', 'BENEFICIARY_APPROVAL'].includes(ft)) {
    return 'ACCOUNTS';
  }
  if (['BREAKDOWN_REPORTING', 'EQUIPMENT_PART_REPAIR', 'HR_ATTENDANCE_PAYMENT', 'LEAVE_SUBMISSION'].includes(ft)) {
    return 'PLANT_OPS';
  }
  if (['DPR_REPORTING'].includes(ft)) {
    return 'OPERATIONS';
  }
  return 'OPERATIONS';
};

import { storageAdapter } from './storageAdapter';

/**
 * Returns formatted label for department keys based on Department Hub configuration
 */
export const getDepartmentBranchLabel = (deptKey: string): string => {
  if (!deptKey) return 'General';

  try {
    const configuredDepts = storageAdapter.getDepartments();
    const match = configuredDepts.find(
      (d) => d.key.toUpperCase() === deptKey.toUpperCase() || d.id === deptKey
    );
    if (match && match.name) {
      return match.name;
    }
  } catch {
    // Fallback if storage not ready
  }

  switch (deptKey.toUpperCase()) {
    case 'PURCHASE':
    case 'PROCUREMENT':
      return 'Purchase';
    case 'STORE':
    case 'SITE_LOGISTICS':
      return 'Store';
    case 'ACCOUNTS':
    case 'FINANCE_ACCOUNTS':
      return 'Accounts';
    case 'PLANT_OPS':
    case 'HR_EQUIPMENT':
      return 'Plant & Ops';
    case 'OPERATIONS':
      return 'Operations';
    default:
      return deptKey.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
  }
};

/**
 * Maps a workflow key/template ID to its parent department key
 */
export const getDepartmentForWorkflow = (
  wfKey: string | null | undefined, 
  customTemplates: any[] = [], 
  flows: any[] = []
): string | null => {
  if (!wfKey || wfKey === 'ALL') return null;

  const k = wfKey.toLowerCase();
  
  if (k.includes('check_stock') || k.includes('store_dispatch') || k.includes('site_issue') || k.includes('site_receive') || k.includes('store')) {
    return 'STORE';
  }
  if (k.includes('indent') || k.includes('purchase') || k.includes('vendor_payment_dispatch') || k.includes('payment_to_dispatch')) {
    return 'PURCHASE';
  }
  if (k.includes('po_to_payment') || k.includes('beneficiary') || k.includes('accounts') || k.includes('invoice_collection')) {
    return 'ACCOUNTS';
  }
  if (k.includes('hr_attendance') || k.includes('breakdown') || k.includes('equipment_part_repair') || k.includes('plant_ops') || k.includes('labour')) {
    return 'PLANT_OPS';
  }
  if (k.includes('dpr') || k.includes('operations')) {
    return 'OPERATIONS';
  }

  // Check custom templates
  const tpl = customTemplates.find(t => t.id === wfKey || t.templateKey === wfKey);
  if (tpl && tpl.departmentHub) {
    return tpl.departmentHub;
  }

  // Check flows
  const flow = flows.find(f => f.flowType === wfKey || f.customTemplateId === wfKey || isFlowMatchingWorkflow(f, wfKey));
  if (flow) {
    return getFlowDepartmentKey(flow, customTemplates);
  }

  return null;
};

/**
 * Checks if a ChecklistItem belongs to a given department key
 */
export const matchItemDepartment = (itemDept: string | undefined, deptKey: string): boolean => {
  if (!itemDept || !deptKey) return false;
  const d1 = itemDept.trim().toUpperCase();
  const d2 = deptKey.trim().toUpperCase();

  if (d1 === d2) return true;

  if (d2 === 'PURCHASE') {
    return d1.includes('PURCHASE') || d1.includes('PROCUREMENT');
  }
  if (d2 === 'STORE') {
    return d1.includes('STORE') || d1.includes('WAREHOUSE') || d1.includes('CSR');
  }
  if (d2 === 'ACCOUNTS') {
    return d1.includes('ACCOUNT') || d1.includes('FINANCE') || d1.includes('AUDIT');
  }
  if (d2 === 'PLANT_OPS') {
    return d1.includes('PLANT') || d1.includes('HR') || d1.includes('MECHANIC') || d1.includes('EQUIP');
  }
  if (d2 === 'OPERATIONS') {
    return d1.includes('IT') || d1.includes('STRUCTURE') || d1.includes('SR. STRUCTURE') || d1.includes('MIS') || d1.includes('OPERAT');
  }

  return d1.includes(d2) || d2.includes(d1);
};

/**
 * Checks if a DelegationTask belongs to a given department key based on assignee and role
 */
export const matchTaskDepartment = (
  task: DelegationTask, 
  deptKey: string, 
  usersList?: UserProfile[]
): boolean => {
  if (!task || !deptKey) return false;
  const targetDept = deptKey.trim().toUpperCase();
  const taskName = (task.name || '').toLowerCase();
  const rolePhone = (task.rolePhone || '').toLowerCase();
  const taskDesc = (task.task || '').toLowerCase();

  // 1. Try matching with configured users
  if (usersList && usersList.length > 0) {
    const matchedUser = usersList.find((u) => {
      const uName = u.name.toLowerCase();
      return taskName.includes(uName) || rolePhone.includes(uName);
    });

    if (matchedUser) {
      if (matchedUser.departmentKeys && matchedUser.departmentKeys.some(k => k.toUpperCase() === targetDept)) {
        return true;
      }
      if (matchedUser.departmentId?.toUpperCase().includes(targetDept)) {
        return true;
      }
      if (matchedUser.departmentName && matchItemDepartment(matchedUser.departmentName, targetDept)) {
        return true;
      }
    }
  }

  // 2. Fallback to keyword matching on task assignee, role, and task description
  if (targetDept === 'PURCHASE') {
    return rolePhone.includes('purchase') || rolePhone.includes('procurement') ||
           taskName.includes('shyam') || taskName.includes('rajnikant') || taskName.includes('vivek') || taskName.includes('rajendra') ||
           taskDesc.includes('indent') || taskDesc.includes('quotation') || taskDesc.includes('purchase order') || taskDesc.includes('po ');
  }
  if (targetDept === 'STORE') {
    return rolePhone.includes('store') || rolePhone.includes('warehouse') ||
           taskName.includes('amanat') || taskName.includes('sumant') || taskName.includes('hemant') ||
           taskDesc.includes('stock') || taskDesc.includes('inventory') || taskDesc.includes('dispatch') || taskDesc.includes('mrn');
  }
  if (targetDept === 'ACCOUNTS') {
    return rolePhone.includes('account') || rolePhone.includes('finance') ||
           taskName.includes('priyanka') || taskName.includes('khushboo') || taskName.includes('pranjal') || taskName.includes('manish') ||
           taskDesc.includes('payment') || taskDesc.includes('voucher') || taskDesc.includes('bill') || taskDesc.includes('salary') || taskDesc.includes('payroll');
  }
  if (targetDept === 'PLANT_OPS') {
    return rolePhone.includes('plant') || rolePhone.includes('mechanic') || rolePhone.includes('hr') ||
           taskName.includes('garima') || taskName.includes('mamta') || taskName.includes('chakraworti') || taskName.includes('chakraborty') ||
           taskDesc.includes('breakdown') || taskDesc.includes('repair') || taskDesc.includes('attendance') || taskDesc.includes('machine');
  }
  if (targetDept === 'OPERATIONS') {
    return rolePhone.includes('it ') || rolePhone.includes('mis') || rolePhone.includes('project') || rolePhone.includes('structure') ||
           taskName.includes('byamkesh') || taskName.includes('pooja') || taskName.includes('pranay') || taskName.includes('aman kumar') ||
           taskDesc.includes('vpn') || taskDesc.includes('server') || taskDesc.includes('pole') || taskDesc.includes('dpr');
  }

  return false;
};

