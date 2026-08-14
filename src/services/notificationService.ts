import { LifeMoment, UserProfileData } from '../types';
import { getAuthToken, requestNotificationPermission } from '../firebase';

async function authedFetch(url: string, body: any): Promise<Response> {
  const token = await getAuthToken();
  return fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}

/**
 * Sends the server just enough about each moment to schedule a reminder —
 * id, title, date, and time. Called whenever the moments list changes.
 * Silently no-ops (rather than throwing) if the request fails, since this
 * is a background sync, not something the person is waiting on.
 */
export async function syncMomentsForReminders(moments: LifeMoment[]): Promise<void> {
  try {
    await authedFetch('/api/notifications/sync-moments', {
      moments: moments.map((m) => ({
        id: m.id,
        title: m.title,
        targetDate: m.targetDate,
        timeOfDay: m.timeOfDay,
      })),
    });
  } catch (e) {
    console.warn('Could not sync moments for reminders', e);
  }
}

export type NotificationSyncResult = 'granted' | 'denied' | 'unsupported' | 'not-configured' | 'disabled';

/**
 * Requests notification permission if the person wants any reminders, and
 * tells the server what to send and when (respecting their quiet hours and
 * the two reminder toggles). Call this whenever those settings change.
 */
export async function syncNotificationPreferences(
  profileData: UserProfileData,
  language: string
): Promise<NotificationSyncResult> {
  const wantsAnyReminders = profileData.prepReminders || profileData.importantReminders;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';

  let token: string | null = null;
  if (wantsAnyReminders) {
    const result = await requestNotificationPermission();
    if (result.status !== 'granted') {
      return result.status === 'not-configured' ? 'not-configured' : result.status;
    }
    token = result.token;
  }

  try {
    await authedFetch('/api/notifications/register', {
      token,
      timezone,
      language,
      quietHours: profileData.quietHours,
      quietHoursRange: rangeToServerFormat(profileData.quietHoursRange),
      prepReminders: profileData.prepReminders,
      importantReminders: profileData.importantReminders,
    });
  } catch (e) {
    console.warn('Could not sync notification preferences', e);
  }

  return wantsAnyReminders ? 'granted' : 'disabled';
}

// Converts a display string like "10:00 PM – 08:00 AM" into the "22:00-08:00"
// format the server expects. Falls back to the app's existing default range
// if the display string doesn't parse (e.g. it's already been customized
// into a format this simple parser doesn't recognize).
function rangeToServerFormat(display?: string): string {
  if (!display) return '22:00-08:00';
  const match = display.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?.*?(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!match) return '22:00-08:00';
  const to24h = (h: string, m: string, ampm?: string) => {
    let hour = parseInt(h, 10);
    if (ampm?.toUpperCase() === 'PM' && hour !== 12) hour += 12;
    if (ampm?.toUpperCase() === 'AM' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:${m}`;
  };
  return `${to24h(match[1], match[2], match[3])}-${to24h(match[4], match[5], match[6])}`;
}
