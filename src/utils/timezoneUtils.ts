import { LanguageCode } from '../data/translations';

const CITY_TIMEZONE_MAP: Record<string, string> = {
  dubai: 'Asia/Dubai',
  'дубай': 'Asia/Dubai',
  london: 'Europe/London',
  'лондон': 'Europe/London',
  istanbul: 'Europe/Istanbul',
  'стамбул': 'Europe/Istanbul',
  'new york': 'America/New_York',
  'нью-йорк': 'America/New_York',
  'los angeles': 'America/Los_Angeles',
  'лос-анджелес': 'America/Los_Angeles',
  paris: 'Europe/Paris',
  'париж': 'Europe/Paris',
  rome: 'Europe/Rome',
  'рим': 'Europe/Rome',
  moscow: 'Europe/Moscow',
  'москва': 'Europe/Moscow',
  tokyo: 'Asia/Tokyo',
  'токио': 'Asia/Tokyo',
  singapore: 'Asia/Singapore',
  'сингапур': 'Asia/Singapore',
  berlin: 'Europe/Berlin',
  'берлин': 'Europe/Berlin',
  madrid: 'Europe/Madrid',
  'мадрид': 'Europe/Madrid',
  chicago: 'America/Chicago',
  sydney: 'Australia/Sydney',
  toronto: 'America/Toronto',
};

const TZ_CODE_MAP: Record<string, string> = {
  pst: 'America/Los_Angeles',
  pdt: 'America/Los_Angeles',
  est: 'America/New_York',
  edt: 'America/New_York',
  cst: 'America/Chicago',
  cdt: 'America/Chicago',
  gmt: 'UTC',
  utc: 'UTC',
  cet: 'Europe/Paris',
  cest: 'Europe/Paris',
  gst: 'Asia/Dubai',
  msk: 'Europe/Moscow',
};

/**
 * Formats a Date as a LOCAL calendar date string "YYYY-MM-DD" — unlike
 * date.toISOString().split('T')[0], this does NOT convert to UTC first,
 * so it never shifts the date by ±1 day for users outside UTC.
 */
export function toLocalDateString(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * Builds a local wall-clock timestamp string ("YYYY-MM-DDTHH:mm:ss") to send
 * to the server as the user's "current time" reference. Deliberately NOT using
 * Date.toISOString() here — that converts to UTC and can silently shift the
 * calendar date by a day for users outside the UTC timezone. Sending the local
 * wall-clock time lets the server read the user's actual local date directly.
 */
export function getLocalTimestamp(d: Date = new Date()): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${toLocalDateString(d)}T${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}


export function resolveTimezone(
  text?: string,
  userHomeLocation?: string,
  fallbackTz?: string
): string {
  // 1. Explicit timezone in input text
  if (text) {
    const lower = text.toLowerCase();

    // Check timezone abbreviations
    for (const [code, tz] of Object.entries(TZ_CODE_MAP)) {
      const reg = new RegExp(`\\b${code}\\b`, 'i');
      if (reg.test(lower)) {
        return tz;
      }
    }

    // Check city names in text
    for (const [city, tz] of Object.entries(CITY_TIMEZONE_MAP)) {
      if (lower.includes(city)) {
        return tz;
      }
    }
  }

  // 2. User profile home location
  if (userHomeLocation) {
    const lowerHome = userHomeLocation.toLowerCase();
    for (const [city, tz] of Object.entries(CITY_TIMEZONE_MAP)) {
      if (lowerHome.includes(city)) {
        return tz;
      }
    }
  }

  // 3. Fallback to explicitly provided fallback or browser timezone
  if (fallbackTz) return fallbackTz;

  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC';
  } catch (e) {
    return 'UTC';
  }
}

/**
 * Formats time string (e.g., "13:00") into local display time without converting via Date UTC.
 * Ensures "13:00" -> "1:00 PM" for English, "13:00" for Russian, etc.
 */
export function formatTimeOfDay(time?: string, lang: LanguageCode = 'en'): string {
  if (!time) return '';

  const trimmed = time.trim();

  // If already formatted with text (e.g. "Morning flight", "1:00 PM", "10:40 AM")
  if (/[a-zA-Z]/.test(trimmed) && !/^\d{1,2}:\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  const match = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match) {
    const hour = parseInt(match[1], 10);
    const min = match[2];

    if (lang === 'en' || lang === 'zh') {
      const ampm = hour >= 12 ? 'PM' : 'AM';
      let hour12 = hour % 12;
      if (hour12 === 0) hour12 = 12;
      return `${hour12}:${min} ${ampm}`;
    } else {
      return `${hour.toString().padStart(2, '0')}:${min}`;
    }
  }

  return trimmed;
}

/**
 * Formats time string along with timezone label if needed (e.g. "1:00 PM (Asia/Dubai)")
 */
export function formatTimeWithTimezone(
  time?: string,
  timezone?: string,
  lang: LanguageCode = 'en',
  currentViewingTz?: string
): string {
  const formattedTime = formatTimeOfDay(time, lang);
  if (!formattedTime) return '';

  if (timezone && currentViewingTz && timezone !== currentViewingTz) {
    const cityName = timezone.split('/')[1]?.replace('_', ' ') || timezone;
    if (lang === 'ru') {
      return `${formattedTime} (${cityName})`;
    }
    return `${formattedTime} (${cityName} time)`;
  }

  return formattedTime;
}
