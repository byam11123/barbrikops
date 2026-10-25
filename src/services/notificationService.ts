// Browser Desktop Notifications & Notification Engine Utilities

/**
 * Checks if Notification API is supported in current environment
 */
export function isBrowserNotificationSupported(): boolean {
  return typeof window !== 'undefined' && 'Notification' in window;
}

/**
 * Gets current notification permission
 */
export function getBrowserNotificationPermission(): NotificationPermission {
  if (!isBrowserNotificationSupported()) return 'denied';
  return Notification.permission;
}

/**
 * Requests permission from user to display browser notifications
 */
export async function requestBrowserNotificationPermission(): Promise<NotificationPermission> {
  if (!isBrowserNotificationSupported()) return 'denied';
  try {
    const perm = await Notification.requestPermission();
    return perm;
  } catch (err) {
    console.error('Failed to request notification permission', err);
    return 'denied';
  }
}

/**
 * Sends a native browser desktop notification if permission is granted
 */
export function sendBrowserDesktopNotification(options: {
  title: string;
  body: string;
  icon?: string;
  tag?: string;
  onClick?: () => void;
}) {
  if (!isBrowserNotificationSupported()) return;
  if (Notification.permission !== 'granted') return;

  try {
    const notif = new Notification(options.title, {
      body: options.body,
      icon: options.icon || '/favicon.ico',
      tag: options.tag,
    });

    if (options.onClick) {
      notif.onclick = () => {
        window.focus();
        options.onClick?.();
        notif.close();
      };
    }
  } catch (err) {
    console.warn('Browser desktop notification error:', err);
  }
}

/**
 * Asynchronously dispatches a webhook payload to the configured endpoint (Slack, Teams, Zapier, custom backend)
 */
export async function dispatchWebhookNotification(
  webhookUrl: string | undefined, 
  payload: {
    event: string;
    title: string;
    message: string;
    timestamp: string;
    entityId?: string;
    data?: Record<string, any>;
  }
): Promise<{ success: boolean; error?: string }> {
  if (!webhookUrl || !webhookUrl.trim().startsWith('http')) {
    return { success: false, error: 'No valid webhook URL configured' };
  }

  try {
    const res = await fetch(webhookUrl.trim(), {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        source: 'BarBrik Operations FMS Tracker',
        ...payload,
        timestamp: payload.timestamp || new Date().toISOString(),
        text: `*[${payload.event}]* ${payload.title}\n${payload.message}`, // Compatible with Slack/Teams format
      }),
      mode: 'no-cors' // Allows posting to external third-party webhooks without browser CORS blocking
    });
    return { success: true };
  } catch (err: any) {
    console.warn('Webhook dispatch failed:', err);
    return { success: false, error: err?.message || 'Network error' };
  }
}

import { AppNotification, UserProfile } from '../types';
import { parseDateSafe } from './workShiftService';
import { storageAdapter } from './storageAdapter';

/**
 * Checks if a task or stage assignee is the same person as the current active user.
 * Used to suppress 'Action Required' notification spam when the user is already on the screen.
 */
export function isSelfAssigned(
  currentUser: UserProfile,
  assigneeNameOrRole?: string,
  targetUser?: UserProfile
): boolean {
  if (!assigneeNameOrRole && !targetUser) return false;
  if (targetUser && (targetUser.userId === currentUser.userId || targetUser.name.toLowerCase().trim() === currentUser.name.toLowerCase().trim())) {
    return true;
  }

  if (assigneeNameOrRole) {
    const cleanAssignee = assigneeNameOrRole.toLowerCase().trim();
    const cleanCurrentName = currentUser.name.toLowerCase().trim();
    if (cleanAssignee === cleanCurrentName) return true;
    if (cleanAssignee.includes(cleanCurrentName) || cleanCurrentName.includes(cleanAssignee)) return true;
    if (currentUser.role && (cleanAssignee === currentUser.role.toLowerCase().trim() || cleanAssignee.includes(currentUser.role.toLowerCase().trim()))) {
      return true;
    }
  }

  return false;
}

export interface SlaEvaluationResult {
  status: 'OK' | 'WARNING' | 'OVERDUE';
  elapsedRatio: number;
  elapsedMs: number;
  totalDurationMs: number;
  deadlineMs: number;
}

/**
 * Evaluates whether a stage is within SLA ('OK'), approaching limit at >=80% ('WARNING'),
 * or strictly overdue ('OVERDUE').
 * Uses currentTime > plannedDateTime + slaHours to ensure stages that just started
 * (e.g. 4 minutes ago) never trigger false overdue alerts.
 */
export function evaluateStageSlaStatus(
  currentStage: {
    stageStartedAt?: string;
    plannedDateTime?: string;
    plannedTimestamp?: string;
    slaHours?: number;
    status: string;
  },
  defaultSlaHours = 2,
  currentTime = Date.now()
): SlaEvaluationResult {
  if (currentStage.status !== 'In Progress') {
    return { status: 'OK', elapsedRatio: 0, elapsedMs: 0, totalDurationMs: 0, deadlineMs: 0 };
  }

  const slaHours = typeof currentStage.slaHours === 'number' && currentStage.slaHours > 0
    ? currentStage.slaHours
    : defaultSlaHours;

  const totalDurationMs = slaHours * 3600 * 1000;

  // Determine when the stage actually started
  let startMs: number | null = null;
  if (currentStage.stageStartedAt) {
    const parsedStart = new Date(currentStage.stageStartedAt).getTime();
    if (!isNaN(parsedStart)) startMs = parsedStart;
  }

  // Parse plannedDateTime
  const parsedPlanned = parseDateSafe(currentStage.plannedDateTime);
  const plannedTimeMs = currentStage.plannedTimestamp
    ? new Date(currentStage.plannedTimestamp).getTime()
    : parsedPlanned ? parsedPlanned.getTime() : null;

  let deadlineMs: number;

  if (startMs !== null) {
    // If plannedTimeMs is strictly in the future beyond startMs, treat it as the calculated deadline
    if (plannedTimeMs && plannedTimeMs > startMs + 60000) {
      deadlineMs = plannedTimeMs;
    } else {
      // Otherwise, plannedDateTime was set to start time -> calculate currentTime > plannedDateTime + slaHours
      deadlineMs = startMs + totalDurationMs;
    }
  } else if (plannedTimeMs !== null) {
    // If plannedTimeMs is in the future relative to currentTime, it's a future deadline
    if (plannedTimeMs > currentTime + 30 * 60 * 1000) {
      deadlineMs = plannedTimeMs;
      startMs = deadlineMs - totalDurationMs;
    } else {
      // plannedDateTime represents the start of the stage
      startMs = plannedTimeMs;
      deadlineMs = plannedTimeMs + totalDurationMs;
    }
  } else {
    // Fallback: stage started recently
    startMs = currentTime;
    deadlineMs = currentTime + totalDurationMs;
  }

  const effectiveWindowMs = Math.max(totalDurationMs, deadlineMs - (startMs || (deadlineMs - totalDurationMs)));
  const effectiveStartMs = deadlineMs - effectiveWindowMs;
  const elapsedMs = Math.max(0, currentTime - effectiveStartMs);
  const elapsedRatio = elapsedMs / effectiveWindowMs;

  // Strict check: strictly past the planned deadline
  if (currentTime > deadlineMs) {
    return { status: 'OVERDUE', elapsedRatio, elapsedMs, totalDurationMs: effectiveWindowMs, deadlineMs };
  } else if (elapsedRatio >= 0.8) {
    return { status: 'WARNING', elapsedRatio, elapsedMs, totalDurationMs: effectiveWindowMs, deadlineMs };
  }

  return { status: 'OK', elapsedRatio, elapsedMs, totalDurationMs: effectiveWindowMs, deadlineMs };
}

/**
 * Automatically clears (removes or marks read) all 'Overdue' or 'Action Required' or 'Warning'
 * notifications for a specific stage when that stage is completed.
 */
export function clearNotificationsForStage(
  notifications: AppNotification[],
  flowIdentifiers: { flowId?: string; id?: string; indentNo?: string; poNumber?: string },
  stageIdentifiers: { stageId?: string; stageIndex?: number; stageName?: string }
): AppNotification[] {
  const ids = [flowIdentifiers.flowId, flowIdentifiers.id, flowIdentifiers.indentNo, flowIdentifiers.poNumber]
    .filter(Boolean)
    .map((s) => String(s).toLowerCase().trim());

  const stageIdLower = stageIdentifiers.stageId?.toLowerCase().trim();
  const stageNameLower = stageIdentifiers.stageName?.toLowerCase().trim();
  const stageIdx = stageIdentifiers.stageIndex;

  return notifications.filter((notif) => {
    const notifFlowId = String(notif.data?.flowId || notif.linkEntityId || '').toLowerCase().trim();
    const notifTitle = notif.title.toLowerCase();
    const notifMsg = notif.message.toLowerCase();

    const matchesFlow = ids.some(
      (id) => notifFlowId === id || notifTitle.includes(id) || notifMsg.includes(id)
    );

    if (!matchesFlow) return true; // keep unrelated flows

    // Check if it's an Overdue or Action Required or Warning notification
    const isStageAlert =
      notif.type === 'FMS_ACTION_REQUIRED' ||
      notif.type === 'SLA_BREACH' ||
      notif.type === 'SLA_WARNING' ||
      notifTitle.includes('action required') ||
      notifTitle.includes('sla delay') ||
      notifTitle.includes('sla breach') ||
      notifTitle.includes('sla overdue') ||
      notifTitle.includes('sla warning');

    if (!isStageAlert) return true;

    // Check if it matches this specific completed stage
    const notifStageId = String(notif.data?.stageId || '').toLowerCase().trim();
    const notifStageIndex = notif.data?.stageIndex;
    const slaKey = String(notif.data?.slaKey || '').toLowerCase();

    const matchesStage =
      (stageIdLower && (notifStageId === stageIdLower || slaKey.includes(stageIdLower) || notifTitle.includes(stageIdLower) || notifMsg.includes(stageIdLower))) ||
      (stageNameLower && (notifTitle.includes(stageNameLower) || notifMsg.includes(stageNameLower))) ||
      (typeof stageIdx === 'number' && (notifStageIndex === stageIdx || notifTitle.includes(`stage ${stageIdx + 1}`)));

    // Return false to remove matching notification
    return !matchesStage;
  });
}

/**
 * Groups multiple notifications belonging to the same workflow into a single consolidated notification.
 * Reduces notification panel clutter and 34-item spam.
 * e.g., 'Updates in BPL/REQ/20261024-001-DISP'
 */
export function groupWorkflowNotifications(notifications: AppNotification[]): AppNotification[] {
  const getFlowKey = (n: AppNotification): string | null => {
    if (n.data?.flowId) return String(n.data.flowId).trim();
    if (n.linkTab === 'fms' && n.linkEntityId) return String(n.linkEntityId).trim();
    const text = `${n.title} ${n.message}`;
    const match = text.match(/(FLOW-[A-Z0-9_-]+|BPL\/[A-Z0-9_\/-]+|IND-[A-Z0-9_-]+)/i);
    return match ? match[1].trim() : null;
  };

  const flowBuckets = new Map<string, AppNotification[]>();
  const nonFlowNotifs: AppNotification[] = [];

  notifications.forEach((n) => {
    const key = getFlowKey(n);
    if (key) {
      const list = flowBuckets.get(key) || [];
      list.push(n);
      flowBuckets.set(key, list);
    } else {
      nonFlowNotifs.push(n);
    }
  });

  const result: AppNotification[] = [];

  flowBuckets.forEach((bucket, flowKey) => {
    if (bucket.length <= 1) {
      result.push(...bucket);
    } else {
      // Multiple alerts for this workflow -> group into a single notification per flow
      // Rank bucket by urgency (SLA_BREACH > FMS_ACTION_REQUIRED > SLA_WARNING > others), then latest timestamp
      const getUrgencyScore = (n: AppNotification): number => {
        const titleLower = n.title.toLowerCase();
        if (n.type === 'SLA_BREACH' || titleLower.includes('overdue') || titleLower.includes('breach') || titleLower.includes('delay')) return 40;
        if (n.type === 'FMS_ACTION_REQUIRED' || titleLower.includes('action required')) return 30;
        if (n.type === 'SLA_WARNING' || titleLower.includes('warning')) return 20;
        return 10;
      };

      bucket.sort((a, b) => {
        const scoreDiff = getUrgencyScore(b) - getUrgencyScore(a);
        if (scoreDiff !== 0) return scoreDiff;
        const tA = parseDateSafe(a.timestamp)?.getTime() || 0;
        const tB = parseDateSafe(b.timestamp)?.getTime() || 0;
        return tB - tA;
      });

      const urgentNotif = bucket[0];
      const hasOverdue = bucket.some((n) => n.type === 'SLA_BREACH' || n.title.toLowerCase().includes('overdue') || n.title.toLowerCase().includes('delay'));
      const hasAction = bucket.some((n) => n.type === 'FMS_ACTION_REQUIRED');
      const hasWarning = bucket.some((n) => n.type === 'SLA_WARNING' || n.title.toLowerCase().includes('warning'));
      const anyUnread = bucket.some((n) => !n.read);

      // Find matching FMS flow to extract true reference number and stage name
      let matchedFlow: any = undefined;
      try {
        const allFlows = storageAdapter.getFmsFlows();
        matchedFlow = allFlows.find((f) => 
          f.flowId === flowKey || 
          f.id === flowKey || 
          f.indentNo === flowKey || 
          f.poNumber === flowKey ||
          bucket.some((n) => n.linkEntityId === f.id || n.data?.flowId === f.flowId)
        );
      } catch (_) {}

      // Resolve human-readable reference number (e.g. BPL/REQ/..., BPL/PO/..., etc.)
      const refRegex = /(BPL\/[A-Z0-9_\/-]+|IND-[A-Z0-9_-]+|REQ-[A-Z0-9_-]+|PO-[A-Z0-9_-]+)/i;
      const refMatch = `${urgentNotif.title} ${urgentNotif.message} ${flowKey}`.match(refRegex);
      const displayRef = 
        matchedFlow?.requisitionNumber || 
        matchedFlow?.indentNo || 
        matchedFlow?.poNumber || 
        (refMatch ? refMatch[1] : null) || 
        flowKey;

      // Resolve stage name
      let stageName = '';
      if (urgentNotif.data?.stageName) {
        stageName = String(urgentNotif.data.stageName).trim();
      } else if (matchedFlow && typeof urgentNotif.data?.stageIndex === 'number' && matchedFlow.stages?.[urgentNotif.data.stageIndex]) {
        stageName = matchedFlow.stages[urgentNotif.data.stageIndex].stageName;
      } else if (matchedFlow && urgentNotif.data?.stageId) {
        const stg = matchedFlow.stages?.find((s: any) => s.stageId === urgentNotif.data?.stageId);
        if (stg) stageName = stg.stageName;
      } else if (matchedFlow && matchedFlow.stages?.[matchedFlow.currentStageIndex]) {
        stageName = matchedFlow.stages[matchedFlow.currentStageIndex].stageName;
      }

      // If not resolved from flow or data, parse from title and message
      if (!stageName) {
        // e.g. "SLA Overdue: BPL/REQ/20261024-001 (Prepare STN)" -> "Prepare STN"
        // e.g. "Action Required: Stage 2 (Prepare STN)" -> "Prepare STN"
        const parenMatch = urgentNotif.title.match(/\(([^)]+)\)/) || urgentNotif.message.match(/Stage \d+ \(([^)]+)\)/i);
        if (parenMatch) {
          stageName = parenMatch[1].trim();
        } else {
          const colonMatch = urgentNotif.title.match(/:\s*([^#:(]+)/);
          if (colonMatch) {
            stageName = colonMatch[1].trim();
          }
        }
      }

      // Determine urgency prefix
      const urgencyPrefix = hasOverdue 
        ? 'SLA Overdue' 
        : hasAction 
        ? 'Action Required' 
        : hasWarning 
        ? 'SLA Warning' 
        : 'Updates';

      // Build specific title: e.g. "SLA Overdue: Prepare STN (BPL/REQ/...)"
      let groupedTitle = '';
      if (stageName && displayRef) {
        groupedTitle = `${urgencyPrefix}: ${stageName} (${displayRef})`;
      } else if (stageName) {
        groupedTitle = `${urgencyPrefix}: ${stageName}`;
      } else if (displayRef) {
        groupedTitle = `${urgencyPrefix}: ${displayRef}`;
      } else {
        groupedTitle = `${urgencyPrefix} in ${flowKey}`;
      }

      const summaryParts: string[] = [];
      bucket.forEach((item) => {
        let label = item.title;
        if (label.includes(':')) {
          label = label.split(':')[0].trim();
        }
        if (!summaryParts.includes(label)) {
          summaryParts.push(label);
        }
      });

      const groupedNotif: AppNotification = {
        id: `grouped-${flowKey}`,
        userId: bucket.find((n) => n.userId !== 'ALL')?.userId || 'ALL',
        targetUserName: bucket.find((n) => n.targetUserName)?.targetUserName,
        title: groupedTitle,
        message: `${bucket.length} alerts for this workflow • Latest: ${urgentNotif.message}`,
        type: hasOverdue ? 'SLA_BREACH' : hasAction ? 'FMS_ACTION_REQUIRED' : hasWarning ? 'SLA_WARNING' : urgentNotif.type,
        urgency: hasOverdue || hasAction ? 'HIGH' : 'MEDIUM',
        timestamp: urgentNotif.timestamp,
        read: !anyUnread,
        linkTab: 'fms',
        linkEntityId: matchedFlow?.id || bucket.find((n) => n.linkEntityId)?.linkEntityId || urgentNotif.linkEntityId,
        data: {
          flowId: flowKey,
          stageName: stageName || undefined,
          stageId: urgentNotif.data?.stageId,
          stageIndex: urgentNotif.data?.stageIndex,
          isGrouped: true,
          groupedCount: bucket.length,
          groupedIds: bucket.map((n) => n.id),
        },
      };

      result.push(groupedNotif);
    }
  });

  return [...result, ...nonFlowNotifs].sort((a, b) => {
    const tA = parseDateSafe(a.timestamp)?.getTime() || 0;
    const tB = parseDateSafe(b.timestamp)?.getTime() || 0;
    return tB - tA;
  });
}

