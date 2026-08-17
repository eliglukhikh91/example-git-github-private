/**
 * Utilities for strictly synchronizing and formatting time in Moscow Timezone (Europe/Moscow, UTC+3)
 */

export const MOSCOW_TIMEZONE = 'Europe/Moscow';

/**
 * Returns current Date object
 */
export const getNow = (): Date => new Date();

/**
 * Returns current Moscow time as a formatted string (HH:mm:ss)
 */
export const getMoscowTimeString = (date: Date = new Date(), includeSeconds: boolean = true): string => {
  return date.toLocaleTimeString('ru-RU', {
    timeZone: MOSCOW_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    ...(includeSeconds ? { second: '2-digit' } : {})
  });
};

/**
 * Returns current Moscow date formatted in Russian (e.g., "27 июля 2026")
 */
export const getMoscowDateString = (date: Date = new Date()): string => {
  return date.toLocaleDateString('ru-RU', {
    timeZone: MOSCOW_TIMEZONE,
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
};

/**
 * Returns current Moscow date in short format (DD.MM.YYYY)
 */
export const getMoscowShortDateString = (date: Date = new Date()): string => {
  return date.toLocaleDateString('ru-RU', {
    timeZone: MOSCOW_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
};

/**
 * Returns formatted Date & Time string strictly in Moscow Timezone (e.g., "27.07.2026, 15:42 МСК")
 */
export const formatMoscowDateTime = (dateInput: string | number | Date = new Date()): string => {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);
  
  const formatted = date.toLocaleString('ru-RU', {
    timeZone: MOSCOW_TIMEZONE,
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
  
  return `${formatted} (МСК)`;
};

/**
 * Calculates current Moscow hour and generates default time slot suggestion
 * e.g., if current Moscow time is 14:15, suggests "15:00 - 16:00 (МСК)"
 */
export const getDefaultMoscowTimeSlot = (): string => {
  const moscowTimeString = getMoscowTimeString(new Date(), false); // "14:15"
  const [hourStr] = moscowTimeString.split(':');
  let currentHour = parseInt(hourStr, 10);
  if (isNaN(currentHour)) currentHour = 12;

  const nextHour = (currentHour + 1) % 24;
  const afterNextHour = (currentHour + 2) % 24;

  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${pad(nextHour)}:00 - ${pad(afterNextHour)}:00 (МСК)`;
};

/**
 * Formats ISO string or timestamp into Moscow time format for exports
 */
export const formatMoscowExportDate = (dateInput: string | number | Date): string => {
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return String(dateInput);
  return date.toLocaleString('ru-RU', {
    timeZone: MOSCOW_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }) + ' MSK';
};
