import React from 'react';
import { ArrowRight } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTheme } from '../utils/themes';
import { getCategoryLabel } from '../utils/eventCategories';
import type { EventItem } from '../types';

interface ThemedEventStripProps {
  onViewDetails: (event: EventItem) => void;
}

/**
 * Тематическая подборка мероприятий в дайджесте.
 *
 * Вместо перекраски всего интерфейса активная тема просто подсвечивает
 * релевантный контент: 2–3 события с соответствующим тегом. При классической
 * теме и при отсутствии подходящих событий блок не рендерится.
 */
export const ThemedEventStrip: React.FC<ThemedEventStripProps> = ({ onViewDetails }) => {
  const { theme, events } = useApp();
  const themeInfo = getTheme(theme);

  if (theme === 'classic' || !themeInfo.tag) return null;

  const matching = events
    .filter((event) => event.tags.some((tag) => tag.toLowerCase().includes(themeInfo.tag)))
    .slice(0, 3);

  if (matching.length === 0) return null;

  const Icon = themeInfo.icon;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      <div className="flex items-center gap-2 mb-3">
        <Icon className="w-4 h-4 shrink-0 text-accent" />
        <h3 className="text-sm font-black text-slate-900 tracking-tight">
          Подборка: {themeInfo.label}
        </h3>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {matching.map((event) => (
          <button
            key={event.id}
            onClick={() => onViewDetails(event)}
            className="text-left bg-white border border-slate-200 rounded-2xl p-4 hover:border-accent/40 transition-colors group"
          >
            <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              {getCategoryLabel(event.category)}
            </p>
            <h4 className="text-sm font-bold text-slate-900 mt-1 line-clamp-2 leading-snug">
              {event.title}
            </h4>
            <p className="text-xs text-slate-500 mt-2 flex items-center gap-1.5">
              <span className="truncate">{event.date}</span>
              <ArrowRight className="w-3.5 h-3.5 shrink-0 text-accent opacity-0 group-hover:opacity-100 transition-opacity" />
            </p>
          </button>
        ))}
      </div>
    </div>
  );
};
