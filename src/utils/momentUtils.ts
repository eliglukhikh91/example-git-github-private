import { LifeMoment } from '../types';
import { LanguageCode, TRANSLATIONS } from '../data/translations';
import { formatTimeWithTimezone } from './timezoneUtils';

/**
 * Calculates days left dynamically relative to today's local date.
 */
export function getCalculatedDaysLeft(moment: LifeMoment): number {
  if (moment.targetDate) {
    const parts = moment.targetDate.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      const da = parseInt(parts[2], 10);
      const now = new Date();
      const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const target0 = new Date(yr, mo, da);
      const diffMs = target0.getTime() - today0.getTime();
      return Math.round(diffMs / (1000 * 60 * 60 * 24));
    }
  }
  return moment.daysLeft ?? 5;
}

/**
 * Returns localized countdown label based on current UI language.
 */
export function getLocalizedDaysAhead(moment: LifeMoment, lang: LanguageCode): string {
  const days = getCalculatedDaysLeft(moment);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  return t.daysAhead(days);
}

const LOCALE_MAP: Record<LanguageCode, string> = {
  en: 'en-US',
  ru: 'ru-RU',
  es: 'es-ES',
  fr: 'fr-FR',
  it: 'it-IT',
  pt: 'pt-PT',
  de: 'de-DE',
  tr: 'tr-TR',
  zh: 'zh-CN',
};

/**
 * Returns localized date label dynamically formatted according to current UI language.
 */
export function getLocalizedDateLabel(moment: LifeMoment, lang: LanguageCode): string {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const timeStr = formatTimeWithTimezone(moment.timeOfDay, moment.timezone);

  if (moment.targetDate) {
    const parts = moment.targetDate.split('-');
    if (parts.length === 3) {
      const yr = parseInt(parts[0], 10);
      const mo = parseInt(parts[1], 10) - 1;
      const da = parseInt(parts[2], 10);
      const now = new Date();
      const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const target0 = new Date(yr, mo, da);
      const days = Math.round((target0.getTime() - today0.getTime()) / (1000 * 60 * 60 * 24));

      if (days === 0) {
        return timeStr ? `${t.today}, ${timeStr}` : t.today;
      }
      if (days === 1) {
        return timeStr ? `${t.tomorrow}, ${timeStr}` : t.tomorrow;
      }

      const locale = LOCALE_MAP[lang] || 'en-US';
      let formattedDate = '';
      try {
        const d = new Date(yr, mo, da);
        formattedDate = new Intl.DateTimeFormat(locale, { month: 'long', day: 'numeric' }).format(d);
      } catch (e) {
        formattedDate = `${da}/${mo + 1}`;
      }

      return timeStr ? `${formattedDate}, ${timeStr}` : formattedDate;
    }
  }

  // Fallback if no targetDate:
  if (!moment.dateLabel || isGenericFallbackLabel(moment.dateLabel)) {
    return timeStr ? `${t.comingDays}, ${timeStr}` : t.comingDays;
  }

  return timeStr ? `${moment.dateLabel}, ${timeStr}` : moment.dateLabel;
}

function isGenericFallbackLabel(label: string): boolean {
  if (!label) return true;
  const lower = label.toLowerCase();
  return (
    lower.includes('coming days') ||
    lower.includes('ближайшие дни') ||
    lower.includes('próximos dias') ||
    lower.includes('proximos dias') ||
    lower.includes('próximos días') ||
    lower.includes('prochains jours') ||
    lower.includes('prossimi giorni') ||
    lower.includes('günlerde') ||
    lower.includes('kommenden tagen') ||
    lower.includes('未来的日子里')
  );
}

/**
 * Finds an existing LifeMoment from user message using title and key location/category matches.
 */
export function findMatchingMoment(text: string, moments: LifeMoment[]): LifeMoment | null {
  if (!text || !moments || moments.length === 0) return null;
  const lowerText = text.toLowerCase();

  for (const m of moments) {
    if (!m.title) continue;
    const lowerTitle = m.title.toLowerCase();

    // 1. Title is directly contained in user message or user message is contained in title
    if (lowerText.includes(lowerTitle) || lowerTitle.includes(lowerText)) {
      return m;
    }

    // 2. Extract key phrase from title (e.g. "поездка в стамбул", "стамбул", "istanbul", "doctor", "interview")
    const cleanedTitle = lowerTitle
      .replace(/моя\s+/g, '')
      .replace(/поездка\s+в\s+/g, '')
      .replace(/поездка\s+/g, '')
      .replace(/trip\s+to\s+/g, '')
      .replace(/на\s+\d+\s+дн(ей|я|ь)/g, '')
      .trim();

    if (cleanedTitle && cleanedTitle.length >= 3 && lowerText.includes(cleanedTitle)) {
      return m;
    }
  }

  // 3. Keyword/city matching fallback
  const keywordsMap: [string[], string][] = [
    [['стамбул', 'istanbul', 'estambul', 'istambul'], 'journey'],
    [['доктор', 'арис', 'doctor', 'aris', 'клиника', 'clinic'], 'health'],
    [['интервью', 'директор', 'interview', 'career'], 'career'],
  ];

  for (const [kwList, cat] of keywordsMap) {
    const textHasKw = kwList.some((kw) => lowerText.includes(kw));
    if (textHasKw) {
      const match = moments.find(
        (m) => m.category === cat || kwList.some((kw) => m.title.toLowerCase().includes(kw))
      );
      if (match) return match;
    }
  }

  return null;
}

/**
 * Counts moments created in the current calendar month (by local wall-clock
 * date), for the Free plan's "3 per month" cap. Moments synced before this
 * field existed have no createdAt — they're treated as not counting toward
 * the current month's quota, so nobody's existing moments retroactively push
 * them over a limit they didn't know was being tracked.
 */
export function countMomentsThisMonth(moments: LifeMoment[]): number {
  const now = new Date();
  return moments.filter((m) => {
    if (!m.createdAt) return false;
    const d = new Date(m.createdAt);
    if (isNaN(d.getTime())) return false;
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  }).length;
}
