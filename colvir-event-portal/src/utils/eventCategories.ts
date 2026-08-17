import type { EventCategory } from '../types';

/**
 * Человекочитаемые названия категорий.
 *
 * Раньше эта функция жила прямо в EventCard.tsx, а таблица заполняемости
 * в AdminDashboard показывала сырой enum (`team-game`, `coffee-break`).
 * Теперь источник один на оба места.
 */
const CATEGORY_LABELS: Record<EventCategory, string> = {
  'team-game': 'Командная игра',
  'speaking-club': 'Speaking Club',
  'coffee-break': 'Кофе-брейк',
  'book-club': 'Книжный клуб',
  workshop: 'Воркшоп',
  other: 'Мероприятие'
};

export function getCategoryLabel(category: string): string {
  return CATEGORY_LABELS[category as EventCategory] ?? CATEGORY_LABELS.other;
}

/** Совместимая с прежним вызовом форма: `getCategoryBadge(event.category).label`. */
export function getCategoryBadge(category: string): { label: string } {
  return { label: getCategoryLabel(category) };
}

export const CATEGORY_OPTIONS: { value: EventCategory; label: string }[] = (
  Object.keys(CATEGORY_LABELS) as EventCategory[]
).map((value) => ({ value, label: CATEGORY_LABELS[value] }));
