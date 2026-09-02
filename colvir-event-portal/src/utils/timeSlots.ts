/**
 * Слоты времени у мероприятия.
 *
 * Слот хранится строкой вида «13:00 - 13:30 (МСК)» — так он и приходит из базы,
 * и показывается сотруднику. Часовой пояс у портала один, московский, поэтому
 * пометка «(МСК)» есть у каждого слота, а не выбирается.
 */
export const MOSCOW_SUFFIX = '(МСК)';

/** Слот из полей «с» и «до». Пустое или бессмысленное время дает null. */
export function formatSlot(from: string, to: string): string | null {
  if (!isTime(from) || !isTime(to)) return null;
  if (to <= from) return null;
  return `${from} - ${to} ${MOSCOW_SUFFIX}`;
}

/** Проверка формата HH:MM, который отдает поле ввода времени. */
function isTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/**
 * Добавляет слот к списку, если он корректен и такого еще нет.
 *
 * Отдельная функция, потому что вызывается из двух мест: по кнопке «Добавить»
 * и при отправке формы. Второе важнее: раньше выбранное в полях время
 * терялось, если админ не нажал кнопку, — мероприятие сохранялось с чужим
 * временем и никто об этом не узнавал.
 */
export function withSlot(slots: string[], from: string, to: string): string[] {
  const slot = formatSlot(from, to);
  if (!slot || slots.includes(slot)) return slots;
  return [...slots, slot];
}

/**
 * Разбирает слот обратно в пару «с»/«до» — нужно, чтобы открыть уже
 * сохраненное мероприятие с заполненными полями времени.
 */
export function parseSlot(slot: string): { from: string; to: string } | null {
  const match = slot.match(/^\s*(\d{1,2}:\d{2})\s*[-–—]\s*(\d{1,2}:\d{2})/);
  if (!match) return null;

  const from = pad(match[1]);
  const to = pad(match[2]);
  return isTime(from) && isTime(to) ? { from, to } : null;
}

/** «9:00» из старых записей приводим к «09:00»: поле времени требует две цифры. */
function pad(value: string): string {
  const [hours, minutes] = value.split(':');
  return `${hours.padStart(2, '0')}:${minutes}`;
}
