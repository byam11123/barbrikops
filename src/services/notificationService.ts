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

