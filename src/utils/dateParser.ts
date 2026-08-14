import { LanguageCode, TRANSLATIONS } from '../data/translations';
import { resolveTimezone } from './timezoneUtils';

export interface ParsedDateResult {
  dateLabel: string;
  timeOfDay?: string;
  daysLeft: number;
  targetDate?: string; // YYYY-MM-DD
  timezone?: string;
}

export function extractTimeFromText(text: string): string | undefined {
  const lowerText = text.toLowerCase().trim();
  if (!lowerText) return undefined;

  // 1. First look for complete colon matches: e.g. "13:00", "15:30", "1.00", "1.30", "15.00"
  const timeColonMatch = lowerText.match(/([01]?\d|2[0-3])[:\.]([0-5]\d)/);
  if (timeColonMatch) {
    let hr = parseInt(timeColonMatch[1], 10);
    const min = timeColonMatch[2];
    const isPm = lowerText.includes('pm') || lowerText.includes('вечера') || lowerText.includes('дня');
    const isAm = lowerText.includes('am') || lowerText.includes('утра') || lowerText.includes('ночи');
    if (isPm && hr < 12) hr += 12;
    if (isAm && hr === 12) hr = 0;
    return `${hr.toString().padStart(2, '0')}:${min}`;
  }

  // 2. Look for numeric hours with am/pm: e.g., "1 pm", "10 am", "12 pm", "12 am"
  const timeAmPm = lowerText.match(/(1[0-2]|[1-9])\s*(am|pm)/i);
  if (timeAmPm) {
    let hour = parseInt(timeAmPm[1], 10);
    if (timeAmPm[2].toLowerCase() === 'pm' && hour < 12) hour += 12;
    if (timeAmPm[2].toLowerCase() === 'am' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  // 3. Look for explicit natural language phrases in Russian/English
  let resolvedHour: number | null = null;

  // Common Russian phrases
  if (lowerText.includes('час дня') || lowerText.includes('в час дня') || lowerText.includes('на час дня') || lowerText.includes('в 1 дня') || lowerText.includes('на 1 дня')) {
    resolvedHour = 13;
  } else if (lowerText.includes('час ночи') || lowerText.includes('в час ночи') || lowerText.includes('на час ночи') || lowerText.includes('в час утра')) {
    resolvedHour = 1;
  } else if (lowerText.includes('два часа дня') || lowerText.includes('в два часа дня') || lowerText.includes('на два часа дня') || lowerText.includes('в два дня') || lowerText.includes('на два дня')) {
    resolvedHour = 14;
  } else if (lowerText.includes('три часа дня') || lowerText.includes('в три часа дня') || lowerText.includes('на три часа дня') || lowerText.includes('в три дня') || lowerText.includes('на три дня')) {
    resolvedHour = 15;
  } else if (lowerText.includes('четыре часа дня') || lowerText.includes('в четыре часа дня') || lowerText.includes('на четыре часа дня') || lowerText.includes('в четыре дня') || lowerText.includes('на четыре дня')) {
    resolvedHour = 16;
  } else if (lowerText.includes('пять часов вечера') || lowerText.includes('в пять вечера') || lowerText.includes('на пять вечера') || lowerText.includes('пять часов')) {
    resolvedHour = 17;
  } else if (lowerText.includes('шесть часов вечера') || lowerText.includes('в шесть вечера') || lowerText.includes('на шесть вечера') || lowerText.includes('шесть часов')) {
    resolvedHour = 18;
  } else if (lowerText.includes('семь часов вечера') || lowerText.includes('в семь вечера') || lowerText.includes('на семь вечера') || lowerText.includes('семь часов')) {
    resolvedHour = 19;
  } else if (lowerText.includes('восемь часов вечера') || lowerText.includes('в восемь вечера') || lowerText.includes('на восемь вечера') || lowerText.includes('восемь часов')) {
    resolvedHour = 20;
  } else if (lowerText.includes('девять часов вечера') || lowerText.includes('в девять вечера') || lowerText.includes('на девять вечера') || lowerText.includes('девять часов')) {
    resolvedHour = 21;
  } else if (lowerText.includes('десять часов вечера') || lowerText.includes('в десять вечера') || lowerText.includes('на десять вечера')) {
    resolvedHour = 22;
  } else if (lowerText.includes('одиннадцать вечера') || lowerText.includes('в одиннадцать вечера') || lowerText.includes('на одиннадцать вечера')) {
    resolvedHour = 23;
  } else if (lowerText.includes('двенадцать ночи') || lowerText.includes('двенадцать вечера') || lowerText.includes('двенадцать дня')) {
    resolvedHour = lowerText.includes('дня') ? 12 : 0;
  } else if (lowerText.includes('десять утра') || lowerText.includes('в десять утра') || lowerText.includes('на десять утра')) {
    resolvedHour = 10;
  } else if (lowerText.includes('девять утра') || lowerText.includes('в девять утра') || lowerText.includes('на девять утра')) {
    resolvedHour = 9;
  } else if (lowerText.includes('восемь утра') || lowerText.includes('в восемь утра') || lowerText.includes('на восемь утра')) {
    resolvedHour = 8;
  } else if (lowerText.includes('семь утра') || lowerText.includes('в семь утра') || lowerText.includes('на семь утра')) {
    resolvedHour = 7;
  } else if (lowerText.includes('шесть утра') || lowerText.includes('в шесть утра') || lowerText.includes('на шесть утра')) {
    resolvedHour = 6;
  }

  // Common English word phrases
  if (resolvedHour === null) {
    if (lowerText.includes('one pm') || lowerText.includes('at one pm') || lowerText.includes('1 pm') || lowerText.includes('at 1 pm') || lowerText.includes('at one in the afternoon')) {
      resolvedHour = 13;
    } else if (lowerText.includes('two pm') || lowerText.includes('at two pm') || lowerText.includes('2 pm') || lowerText.includes('at 2 pm')) {
      resolvedHour = 14;
    } else if (lowerText.includes('three pm') || lowerText.includes('at three pm') || lowerText.includes('3 pm') || lowerText.includes('at 3 pm') || lowerText.includes('three in the afternoon')) {
      resolvedHour = 15;
    } else if (lowerText.includes('four pm') || lowerText.includes('at four pm') || lowerText.includes('4 pm') || lowerText.includes('at 4 pm')) {
      resolvedHour = 16;
    } else if (lowerText.includes('five pm') || lowerText.includes('at five pm') || lowerText.includes('5 pm') || lowerText.includes('at 5 pm')) {
      resolvedHour = 17;
    } else if (lowerText.includes('six pm') || lowerText.includes('at six pm') || lowerText.includes('6 pm') || lowerText.includes('at 6 pm')) {
      resolvedHour = 18;
    } else if (lowerText.includes('seven pm') || lowerText.includes('at seven pm') || lowerText.includes('7 pm') || lowerText.includes('at 7 pm')) {
      resolvedHour = 19;
    } else if (lowerText.includes('eight pm') || lowerText.includes('at eight pm') || lowerText.includes('8 pm') || lowerText.includes('at 8 pm')) {
      resolvedHour = 20;
    } else if (lowerText.includes('nine pm') || lowerText.includes('at nine pm') || lowerText.includes('9 pm') || lowerText.includes('at 9 pm')) {
      resolvedHour = 21;
    } else if (lowerText.includes('ten pm') || lowerText.includes('at ten pm') || lowerText.includes('10 pm') || lowerText.includes('at 10 pm')) {
      resolvedHour = 22;
    } else if (lowerText.includes('eleven pm') || lowerText.includes('at eleven pm') || lowerText.includes('11 pm') || lowerText.includes('at 11 pm')) {
      resolvedHour = 23;
    } else if (lowerText.includes('twelve pm') || lowerText.includes('at twelve pm') || lowerText.includes('12 pm') || lowerText.includes('at 12 pm')) {
      resolvedHour = 12;
    } else if (lowerText.includes('one am') || lowerText.includes('at one am') || lowerText.includes('1 am') || lowerText.includes('at 1 am')) {
      resolvedHour = 1;
    } else if (lowerText.includes('two am') || lowerText.includes('at two am') || lowerText.includes('2 am') || lowerText.includes('at 2 am')) {
      resolvedHour = 2;
    } else if (lowerText.includes('three am') || lowerText.includes('at three am') || lowerText.includes('3 am') || lowerText.includes('at 3 am')) {
      resolvedHour = 3;
    } else if (lowerText.includes('four am') || lowerText.includes('at four am') || lowerText.includes('4 am') || lowerText.includes('at 4 am')) {
      resolvedHour = 4;
    } else if (lowerText.includes('five am') || lowerText.includes('at five am') || lowerText.includes('5 am') || lowerText.includes('at 5 am')) {
      resolvedHour = 5;
    } else if (lowerText.includes('six am') || lowerText.includes('at six am') || lowerText.includes('6 am') || lowerText.includes('at 6 am')) {
      resolvedHour = 6;
    } else if (lowerText.includes('seven am') || lowerText.includes('at seven am') || lowerText.includes('7 am') || lowerText.includes('at 7 am')) {
      resolvedHour = 7;
    } else if (lowerText.includes('eight am') || lowerText.includes('at eight am') || lowerText.includes('8 am') || lowerText.includes('at 8 am')) {
      resolvedHour = 8;
    } else if (lowerText.includes('nine am') || lowerText.includes('at nine am') || lowerText.includes('9 am') || lowerText.includes('at 9 am')) {
      resolvedHour = 9;
    } else if (lowerText.includes('ten am') || lowerText.includes('at ten am') || lowerText.includes('10 am') || lowerText.includes('at 10 am')) {
      resolvedHour = 10;
    } else if (lowerText.includes('eleven am') || lowerText.includes('at eleven am') || lowerText.includes('11 am') || lowerText.includes('at 11 am')) {
      resolvedHour = 11;
    } else if (lowerText.includes('twelve am') || lowerText.includes('at twelve am') || lowerText.includes('12 am') || lowerText.includes('at 12 am')) {
      resolvedHour = 0;
    }
  }

  // 4. Fallback: match general numeric triggers e.g., "в 15:00", "на 15", "at 13", "в 10 вечера", "в 1"
  if (resolvedHour === null) {
    const numericMatch = lowerText.match(/(?:в|на|at|on|alle)\s*(\d{1,2})(?:\s*(?:часов|ч|hours|h|дня|утра|вечера|ночи|am|pm))?/i);
    if (numericMatch) {
      let hr = parseInt(numericMatch[1], 10);
      const isPm = lowerText.includes('дня') || lowerText.includes('вечера') || lowerText.includes('pm');
      const isAm = lowerText.includes('утра') || lowerText.includes('ночи') || lowerText.includes('am');
      if (isPm && hr < 12) {
        hr += 12;
      } else if (isAm && hr === 12) {
        hr = 0;
      }
      resolvedHour = hr;
    }
  }

  if (resolvedHour !== null && resolvedHour >= 0 && resolvedHour <= 23) {
    return `${resolvedHour.toString().padStart(2, '0')}:00`;
  }

  return undefined;
}

export function parseEventDate(
  text: string,
  explicitDate?: string,
  explicitTime?: string,
  lang: LanguageCode = 'en'
): ParsedDateResult {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.en;
  const now = new Date();
  const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  let extractedTime: string | undefined = explicitTime || extractTimeFromText(text);
  let targetDate: Date | null = null;
  let extractedLabel: string | undefined = explicitDate;

  // Detect timezone from text or fallback
  const timezone = resolveTimezone(text);

  // 2. Parse explicitDate if provided
  if (explicitDate) {
    const isoMatch = explicitDate.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (isoMatch) {
      targetDate = new Date(parseInt(isoMatch[1], 10), parseInt(isoMatch[2], 10) - 1, parseInt(isoMatch[3], 10));
    }
  }

  // 3. Embedded date parsing from text
  const lower = text.toLowerCase();

  if (!targetDate) {
    if (
      lower.includes('сегодня') ||
      lower.includes('today') ||
      lower.includes('oggi') ||
      lower.includes('hoy') ||
      lower.includes("aujourd'hui") ||
      lower.includes('hoje') ||
      lower.includes('bugün') ||
      lower.includes('heute')
    ) {
      targetDate = new Date(today0);
      extractedLabel = t.today;
    } else if (
      lower.includes('завтра') ||
      lower.includes('tomorrow') ||
      lower.includes('domani') ||
      lower.includes('mañana') ||
      lower.includes('demain') ||
      lower.includes('amanhã') ||
      lower.includes('yarın') ||
      lower.includes('morgen')
    ) {
      targetDate = new Date(today0);
      targetDate.setDate(today0.getDate() + 1);
      extractedLabel = t.tomorrow;
    } else if (lower.includes('послезавтра') || lower.includes('dopodomani')) {
      targetDate = new Date(today0);
      targetDate.setDate(today0.getDate() + 2);
    } else if (
      lower.includes('вчера') ||
      lower.includes('yesterday') ||
      lower.includes('ieri') ||
      lower.includes('ayer') ||
      lower.includes('hier') ||
      lower.includes('ontem')
    ) {
      targetDate = new Date(today0);
      targetDate.setDate(today0.getDate() - 1);
    } else {
      const weekdayMap: Record<string, number> = {
        'воскресень': 0, 'sunday': 0, 'domenica': 0, 'domingo': 0, 'dimanche': 0, 'pazar': 0, 'sonntag': 0,
        'понедельник': 1, 'monday': 1, 'lunedì': 1, 'lunes': 1, 'lundi': 1, 'pazartesi': 1, 'montag': 1,
        'вторник': 2, 'tuesday': 2, 'martedì': 2, 'martes': 2, 'mardi': 2, 'salı': 2, 'dienstag': 2,
        'среду': 3, 'среда': 3, 'wednesday': 3, 'mercoledì': 3, 'miércoles': 3, 'mercredi': 3, 'çarşamba': 3, 'mittwoch': 3,
        'четверг': 4, 'thursday': 4, 'giovedì': 4, 'jueves': 4, 'jeudi': 4, 'perşembe': 4, 'donnerstag': 4,
        'пятниц': 5, 'friday': 5, 'venerdì': 5, 'viernes': 5, 'vendredi': 5, 'cuma': 5, 'freitag': 5,
        'суббот': 6, 'saturday': 6, 'sabato': 6, 'sábado': 6, 'samedi': 6, 'samstag': 6, 'cumartesi': 6,
      };

      for (const [key, dayIndex] of Object.entries(weekdayMap)) {
        if (lower.includes(key)) {
          const currentDay = today0.getDay();
          let diff = dayIndex - currentDay;
          if (diff <= 0) diff += 7;
          targetDate = new Date(today0);
          targetDate.setDate(today0.getDate() + diff);
          break;
        }
      }
    }
  }

  if (!targetDate) {
    const monthMap: Record<string, number> = {
      'январ': 0, 'янв': 0,
      'феврал': 1, 'фев': 1,
      'март': 2, 'мар': 2,
      'апрел': 3, 'апр': 3,
      'мая': 4, 'май': 4,
      'июн': 5,
      'июл': 6,
      'август': 7, 'авг': 7,
      'сентябр': 8, 'сен': 8,
      'октябр': 9, 'окт': 9,
      'ноябр': 10, 'ноя': 10,
      'декабр': 11, 'дек': 11,
      'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
      'genna': 0, 'febbra': 1, 'marzo': 2, 'aprile': 3, 'magg': 4, 'giugno': 5, 'luglio': 6, 'agosto': 7, 'settem': 8, 'ottob': 9, 'novem': 10, 'dicem': 11,
      'enero': 0, 'febrero': 1, 'abril': 3, 'mayo': 4, 'junio': 5, 'julio': 6, 'septiem': 8, 'octubre': 9, 'noviembre': 10, 'diciembre': 11,
      'januar': 0, 'februar': 1, 'märz': 2, 'juni': 5, 'juli': 6, 'oktober': 9, 'dezember': 11,
      'janvier': 0, 'février': 1, 'fevrier': 1, 'mars': 2, 'avril': 3, 'juin': 5, 'juillet': 6, 'août': 7, 'aout': 7, 'septembre': 8, 'octobre': 9, 'novembre': 10, 'décembre': 11, 'decembre': 11,
    };

    const regex = /(\d{1,2})\s*(?:de|de\s+os)?\s*([а-яa-zäöüçğışéèàùôîâêûîñáéíóúãõ]+)/ig;
    let match;
    while ((match = regex.exec(text)) !== null) {
      const dayNum = parseInt(match[1], 10);
      const monthStr = match[2].toLowerCase();

      let foundMonth: number | undefined;
      for (const [key, mIndex] of Object.entries(monthMap)) {
        if (monthStr.startsWith(key)) {
          foundMonth = mIndex;
          break;
        }
      }

      if (foundMonth !== undefined && dayNum >= 1 && dayNum <= 31) {
        let yr = today0.getFullYear();
        const testDate = new Date(yr, foundMonth, dayNum);
        if (testDate.getTime() - today0.getTime() < -60 * 86400000) {
          yr += 1;
        }
        targetDate = new Date(yr, foundMonth, dayNum);
        extractedLabel = `${dayNum} ${match[2]}`;
        break; // Found a valid date!
      }
    }

    if (!targetDate) {
      const slashMatch = text.match(/(\d{1,2})[\.\/-](\d{1,2})(?:[\.\/-](\d{2,4}))?/);
      if (slashMatch) {
        const d = parseInt(slashMatch[1], 10);
        const m = parseInt(slashMatch[2], 10) - 1;
        let yr = slashMatch[3] ? parseInt(slashMatch[3], 10) : today0.getFullYear();
        if (yr < 100) yr += 2000;
        if (m >= 0 && m <= 11 && d >= 1 && d <= 31) {
          targetDate = new Date(yr, m, d);
          extractedLabel = slashMatch[0];
        }
      }
    }
  }

  if (!targetDate) {
    targetDate = new Date(today0.getFullYear(), today0.getMonth(), today0.getDate() + 5);
  }

  const target0 = new Date(targetDate.getFullYear(), targetDate.getMonth(), targetDate.getDate());
  const diffMs = target0.getTime() - today0.getTime();
  const daysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));

  const targetDateISO = `${targetDate.getFullYear()}-${String(targetDate.getMonth() + 1).padStart(2, '0')}-${String(targetDate.getDate()).padStart(2, '0')}`;
  
  let dateLabel = extractedLabel || explicitDate || '';
  if (!dateLabel) {
    try {
      const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
      dateLabel = targetDate.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
    } catch (e) {
      dateLabel = `${targetDate.getMonth() + 1}/${targetDate.getDate()}`;
    }
  }

  return {
    dateLabel,
    timeOfDay: extractedTime,
    daysLeft,
    targetDate: targetDateISO,
    timezone,
  };
}
