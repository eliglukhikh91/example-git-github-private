import React from 'react';
import { useApp } from '../context/AppContext';
import { getTheme } from '../utils/themes';
import { matchesTheme } from '../utils/themeTags';
import { EventCard } from './EventCard';
import type { EventItem } from '../types';

interface ThemedEventStripProps {
  onRegister: (event: EventItem) => void;
  onViewDetails: (event: EventItem) => void;
}

/**
 * Подборка мероприятий под праздничным баннером.
 *
 * Вместе с баннером это единственное, на что влияет тема — весь остальной
 * интерфейс от нее не зависит.
 *
 * Карточки берутся обычные, без отдельного оформления: те же бейджи, кнопки и
 * фирменный синий, что и в основном дайджесте. Раньше здесь были собственные
 * упрощенные карточки, из-за чего одно и то же мероприятие выглядело по-разному
 * в подборке и ниже в списке.
 *
 * Отбор — по теме, выбранной в форме мероприятия, либо по хэштегу
 * (`#новыйгод`, `#colvirspring`, `#деньрождения`), см. utils/themeTags.
 */
export const ThemedEventStrip: React.FC<ThemedEventStripProps> = ({
  onRegister,
  onViewDetails
}) => {
  const { theme, events } = useApp();
  const { tag } = getTheme(theme);

  if (!tag) return null;

  const matching = events.filter((event) => matchesTheme(event, tag)).slice(0, 3);

  // Пустой блок не показываем вовсе — иначе на классической подборке висел бы
  // заголовок без содержимого.
  if (matching.length === 0) return null;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <h3 className="text-sm font-black text-slate-900 tracking-tight mb-3">
        Подборка мероприятий
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {matching.map((event) => (
          <EventCard
            key={event.id}
            event={event}
            onRegister={onRegister}
            onViewDetails={onViewDetails}
          />
        ))}
      </div>
    </div>
  );
};
