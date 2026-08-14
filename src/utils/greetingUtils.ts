import { LanguageCode } from '../data/translations';

/**
 * Generates dynamic time-based greeting using user's actual local time.
 * Time ranges:
 * - 05:00–11:59 -> Morning
 * - 12:00–17:59 -> Afternoon
 * - 18:00–04:59 -> Evening
 */
export function getGreetingForTime(userName: string, lang: LanguageCode = 'en', hour?: number): string {
  const currentHour = hour !== undefined ? hour : new Date().getHours();

  if (lang === 'ru') {
    if (currentHour >= 5 && currentHour < 12) {
      return `Доброе утро, ${userName}.`;
    } else if (currentHour >= 12 && currentHour < 18) {
      return `Добрый день, ${userName}.`;
    } else {
      return `Добрый вечер, ${userName}.`;
    }
  } else if (lang === 'zh') {
    if (currentHour >= 5 && currentHour < 12) {
      return `早上好，${userName}。`;
    } else if (currentHour >= 12 && currentHour < 18) {
      return `下午好，${userName}。`;
    } else {
      return `晚上好，${userName}。`;
    }
  } else if (lang === 'es') {
    if (currentHour >= 5 && currentHour < 12) {
      return `Buenos días, ${userName}.`;
    } else if (currentHour >= 12 && currentHour < 18) {
      return `Buenas tardes, ${userName}.`;
    } else {
      return `Buenas noches, ${userName}.`;
    }
  } else if (lang === 'fr') {
    if (currentHour >= 5 && currentHour < 12) {
      return `Bonjour, ${userName}.`;
    } else if (currentHour >= 12 && currentHour < 18) {
      return `Bon après-midi, ${userName}.`;
    } else {
      return `Bonsoir, ${userName}.`;
    }
  } else if (lang === 'de') {
    if (currentHour >= 5 && currentHour < 12) {
      return `Guten Morgen, ${userName}.`;
    } else if (currentHour >= 12 && currentHour < 18) {
      return `Guten Tag, ${userName}.`;
    } else {
      return `Guten Abend, ${userName}.`;
    }
  } else if (lang === 'tr') {
    if (currentHour >= 5 && currentHour < 12) {
      return `Günaydın, ${userName}.`;
    } else if (currentHour >= 12 && currentHour < 18) {
      return `İyi günler, ${userName}.`;
    } else {
      return `İyi akşamlar, ${userName}.`;
    }
  } else if (lang === 'it') {
    if (currentHour >= 5 && currentHour < 12) {
      return `Buongiorno, ${userName}.`;
    } else if (currentHour >= 12 && currentHour < 18) {
      return `Buon pomeriggio, ${userName}.`;
    } else {
      return `Buonasera, ${userName}.`;
    }
  } else if (lang === 'pt') {
    if (currentHour >= 5 && currentHour < 12) {
      return `Bom dia, ${userName}.`;
    } else if (currentHour >= 12 && currentHour < 18) {
      return `Boa tarde, ${userName}.`;
    } else {
      return `Boa noite, ${userName}.`;
    }
  } else {
    // English (default)
    if (currentHour >= 5 && currentHour < 12) {
      return `Good morning, ${userName}.`;
    } else if (currentHour >= 12 && currentHour < 18) {
      return `Good afternoon, ${userName}.`;
    } else {
      return `Good evening, ${userName}.`;
    }
  }
}
