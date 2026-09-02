import { MOSCOW_TIMEZONE } from './timeUtils';

/**
 * Дата мероприятия.
 *
 * В базе она лежит человеческой строкой — «12 августа 2026» — и в таком виде
 * показывается на карточках. Календарь в браузере работает с форматом
 * YYYY-MM-DD, поэтому форма переводит дату туда и обратно: в поле выбирается
 * день в календаре, а в базу уходит привычная строка, и старые мероприятия не
 * нужно переписывать.
 */
const MONTHS = [
  'января',
  'февраля',
  'марта',
  'апреля',
  'мая',
  'июня',
  'июля',
  'августа',
  'сентября',
  'октября',
  'ноября',
  'декабря'
];

/** Сегодняшняя дата по Москве в формате YYYY-MM-DD. */
export function getMoscowIsoDate(date: Date = new Date()): string {
  // en-CA дает ровно YYYY-MM-DD, а timeZone считает день по Москве, а не по
  // часовому поясу рабочей станции.
  return date.toLocaleDateString('en-CA', { timeZone: MOSCOW_TIMEZONE });
}

/** «2026-08-12» → «12 августа 2026». Пустая строка, если дата не разобралась. */
export function toRussianDate(iso: string): string {
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return '';

  const [, year, month, day] = match;
  const monthName = MONTHS[Number(month) - 1];
  if (!monthName) return '';

  return `${Number(day)} ${monthName} ${Number(year)}`;
}

/**
 * «12 августа 2026» → «2026-08-12». Понимает и «2 сентября 2026 г.», и
 * «12.08.2026», и уже готовый ISO. Пустая строка, если разобрать не вышло:
 * в базе встречаются даты, набранные руками в свободном виде.
 */
export function toIsoDate(text: string): string {
  const value = text.trim();
  if (!value) return '';

  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;

  const dotted = value.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
  if (dotted) {
    const [, day, month, year] = dotted;
    return build(year, Number(month), Number(day));
  }

  const russian = value.match(/^(\d{1,2})\s+([А-Яа-яЁё]+)\s+(\d{4})/);
  if (russian) {
    const [, day, monthWord, year] = russian;
    const monthIndex = MONTHS.findIndex((name) => name === monthWord.toLowerCase());
    if (monthIndex >= 0) return build(year, monthIndex + 1, Number(day));
  }

  return '';
}

function build(year: string, month: number, day: number): string {
  if (month < 1 || month > 12 || day < 1 || day > 31) return '';
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}
