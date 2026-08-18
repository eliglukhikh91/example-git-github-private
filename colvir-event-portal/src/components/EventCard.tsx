import React from 'react';
import { EventItem } from '../types';
import { useApp } from '../context/AppContext';
import { safeHtml } from '../utils/sanitizeHtml';
import { getCategoryLabel } from '../utils/eventCategories';
import { CheckCircle2, ChevronRight, Video } from 'lucide-react';

interface EventCardProps {
  event: EventItem;
  onRegister: (event: EventItem) => void;
  onViewDetails: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onRegister, onViewDetails }) => {
  const { getParticipantsForEvent, getUserRegistrations } = useApp();

  const participants = getParticipantsForEvent(event.id);
  const currentCount = participants.length;
  const isFull = event.maxParticipants > 0 && currentCount >= event.maxParticipants;

  const isUserRegistered = getUserRegistrations().some(
    (r) => r.eventId === event.id && r.status !== 'cancelled'
  );

  const progressPercent =
    event.maxParticipants > 0
      ? Math.min(100, Math.round((currentCount / event.maxParticipants) * 100))
      : 0;

  // Дата, время и место — одной строкой через разделитель вместо трех строк
  // с отдельными иконками. Полный список слотов остается в EventDetailModal.
  const firstSlot = event.timeSlots[0];
  const extraSlots = Math.max(0, event.timeSlots.length - 1);
  const metaParts = [
    event.date,
    firstSlot
      ? `${firstSlot.includes('МСК') ? firstSlot : `${firstSlot} (МСК)`}${
          extraSlots > 0 ? ` и еще ${extraSlots}` : ''
        }`
      : null,
    event.location
  ].filter(Boolean) as string[];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group">
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={event.imageUrl}
          alt=""
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />

        {/* Единственный бейдж на карточке. Размер команды показывается в деталях. */}
        <span className="absolute top-3 left-3 px-3 py-1 bg-accent-soft text-accent text-xs font-bold rounded-lg shadow-xs">
          {getCategoryLabel(event.category)}
        </span>

        <div className="absolute bottom-3 left-3 right-3 text-white text-xs font-medium drop-shadow-sm truncate">
          {event.organizer}
        </div>
      </div>

      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        <div className="space-y-2">
          <div className="flex items-start gap-2">
            <h3
              onClick={() => onViewDetails(event)}
              className="flex-1 min-w-0 text-lg font-bold text-slate-900 hover:text-accent transition-colors cursor-pointer line-clamp-2 leading-snug"
            >
              {event.title}
            </h3>
            {isUserRegistered && (
              <span className="shrink-0 mt-1.5" title="Вы записаны">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" aria-label="Вы записаны" />
              </span>
            )}
          </div>
          <div
            className="text-xs text-slate-600 line-clamp-2 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={safeHtml(event.description)}
          />
        </div>

        <div className="pt-2 border-t border-slate-100 text-xs text-slate-600 flex items-start gap-1.5">
          <span className="flex-1 min-w-0 leading-relaxed">{metaParts.join(' · ')}</span>
          {event.meetingUrl && (
            <a
              href={event.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="shrink-0 p-1 -m-1 text-accent hover:text-accent-hover transition-colors"
              title="Подключиться к встрече"
              aria-label="Подключиться к встрече"
            >
              <Video className="w-4 h-4" />
            </a>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex justify-end text-xs font-bold">
            <span className={isFull ? 'text-amber-600' : 'text-accent'}>
              {currentCount} / {event.maxParticipants}
            </span>
          </div>
          <div className="w-full bg-slate-100 h-1 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isFull ? 'bg-amber-500' : 'bg-accent'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        <div className="pt-1">
          {isUserRegistered ? (
            <button
              onClick={() => onViewDetails(event)}
              className="w-full py-2.5 px-4 bg-accent-light border border-accent/30 text-accent text-xs font-bold rounded-xl hover:bg-accent hover:text-white transition-all flex items-center justify-center gap-1.5"
            >
              <span>Посмотреть детали</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          ) : isFull ? (
            <button
              onClick={() => onViewDetails(event)}
              className="w-full py-2.5 px-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl hover:bg-amber-100 transition-all"
            >
              Места заполнились
            </button>
          ) : (
            <button
              onClick={() => onRegister(event)}
              className="w-full py-2.5 px-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
            >
              <span>Записаться</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
