import React from 'react';
import { EventItem } from '../types';
import { useApp } from '../context/AppContext';
import { safeHtml } from '../utils/sanitizeHtml';
import { Calendar, Clock, MapPin, Users, Gamepad2, Sparkles, Check, ChevronRight } from 'lucide-react';

interface EventCardProps {
  event: EventItem;
  onRegister: (event: EventItem) => void;
  onViewDetails: (event: EventItem) => void;
}

export const EventCard: React.FC<EventCardProps> = ({ event, onRegister, onViewDetails }) => {
  const { getParticipantsForEvent, getUserRegistrations } = useApp();
  
  const participants = getParticipantsForEvent(event.id);
  const currentCount = participants.length;
  const isFull = currentCount >= event.maxParticipants;

  const myRegistrations = getUserRegistrations();
  const isUserRegistered = myRegistrations.some((r) => r.eventId === event.id && r.status !== 'cancelled');
  const userRegistration = myRegistrations.find((r) => r.eventId === event.id && r.status !== 'cancelled');

  const progressPercent = Math.min(100, Math.round((currentCount / event.maxParticipants) * 100));

  const getCategoryBadge = () => {
    switch (event.category) {
      case 'team-game':
        return { label: 'Командная игра' };
      case 'speaking-club':
        return { label: 'Speaking Club' };
      case 'coffee-break':
        return { label: 'Кофе-брейк' };
      case 'book-club':
        return { label: 'Книжный клуб' };
      case 'workshop':
        return { label: 'Воркшоп' };
      default:
        return { label: 'Мероприятие' };
    }
  };

  const badge = getCategoryBadge();

  return (
    <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col overflow-hidden group">
      
      {/* Cover Image Container */}
      <div className="relative h-48 w-full overflow-hidden bg-slate-100">
        <img
          src={event.imageUrl}
          alt={event.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
        
        {/* Category Badge & Team Game Badge */}
        <div className="absolute top-3 left-3 flex items-center gap-2">
          <span
            style={{ backgroundColor: '#c8dcfc', color: '#1560AA' }}
            className="px-3 py-1 text-xs font-bold rounded-lg shadow-xs"
          >
            {badge.label}
          </span>
          {event.isTeamGame && (
            <span
              style={{ backgroundColor: '#c8dcfc', color: '#1560AA' }}
              className="px-2.5 py-1 text-xs font-bold rounded-lg shadow-xs flex items-center gap-1"
            >
              <Gamepad2 className="w-3.5 h-3.5" />
              Команды до {event.maxTeamSize || 5} чел
            </span>
          )}
        </div>

        {/* User Registration Status Pill */}
        {isUserRegistered && (
          <div className="absolute top-3 right-3 px-3 py-1 bg-emerald-500 text-white text-xs font-extrabold rounded-lg shadow-xs flex items-center gap-1">
            <Check className="w-3.5 h-3.5 stroke-[3]" />
            Вы записаны
          </div>
        )}

        {/* Organizer Tag */}
        <div className="absolute bottom-3 left-3 text-white text-xs font-medium drop-shadow-sm flex items-center gap-1">
          <Sparkles className="w-3.5 h-3.5 text-blue-200" />
          <span>{event.organizer}</span>
        </div>
      </div>

      {/* Card Content Body */}
      <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
        
        <div className="space-y-2">
          <h3
            onClick={() => onViewDetails(event)}
            className="text-lg font-bold text-slate-900 hover:text-[#1560AA] transition-colors cursor-pointer line-clamp-2 leading-snug"
          >
            {event.title}
          </h3>
          <div
            className="text-xs text-slate-600 line-clamp-2 leading-relaxed prose prose-sm max-w-none"
            dangerouslySetInnerHTML={safeHtml(event.description)}
          />
        </div>

        {/* Date, Time & Location Metadata */}
        <div className="space-y-2 pt-2 border-t border-slate-100 text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#1560AA]" />
            <span className="font-semibold text-slate-800">{event.date}</span>
          </div>

          <div className="flex items-start gap-2">
            <Clock className="w-4 h-4 text-[#1560AA] mt-0.5 shrink-0" />
            <div className="flex flex-wrap gap-1 items-center">
              {event.timeSlots.map((slot, i) => (
                <span key={i} className="px-2 py-0.5 bg-blue-50 border border-blue-100 font-semibold rounded-md text-[#1560AA]">
                  {slot.includes('МСК') ? slot : `${slot} (МСК)`}
                </span>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-[#1560AA]" />
            <span className="truncate">{event.location}</span>
          </div>
        </div>

        {/* Progress Bar & Counter */}
        <div className="space-y-1.5 pt-1">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-600 flex items-center gap-1">
              <Users className="w-3.5 h-3.5 text-slate-400" />
              Записано участников:
            </span>
            <span className={isFull ? 'text-amber-600 font-bold' : 'text-[#1560AA] font-bold'}>
              {currentCount} / {event.maxParticipants}
            </span>
          </div>
          
          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
            <div
              className={`h-full transition-all duration-500 rounded-full ${
                isFull ? 'bg-amber-500' : 'bg-[#1560AA]'
              }`}
              style={{ width: `${progressPercent}%` }}
            />
          </div>
        </div>

        {/* Action Button Controls */}
        <div className="pt-2 flex flex-col gap-2">
          {event.meetingUrl && (
            <a
              href={event.meetingUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="w-full py-2 px-3 bg-blue-50 hover:bg-blue-100 border border-blue-200 text-[#1560AA] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5"
            >
              <span>🔗 Подключиться к встрече</span>
            </a>
          )}
          <div className="flex items-center gap-2">
            {isUserRegistered ? (
              <button
                onClick={() => onViewDetails(event)}
                className="flex-1 py-2.5 px-4 bg-[#f0f6fc] border border-[#1560AA]/30 text-[#1560AA] text-xs font-bold rounded-xl hover:bg-[#1560AA] hover:text-white transition-all flex items-center justify-center gap-1.5"
              >
                <span>Посмотреть детали / Билет</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : isFull ? (
              <button
                onClick={() => onViewDetails(event)}
                className="flex-1 py-2.5 px-4 bg-amber-50 border border-amber-200 text-amber-800 text-xs font-bold rounded-xl hover:bg-amber-100 transition-all text-center"
              >
                Места заполнились (Подробнее)
              </button>
            ) : (
              <button
                onClick={() => onRegister(event)}
                className="flex-1 py-2.5 px-4 bg-[#1560AA] hover:bg-[#104d88] text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-1.5 active:scale-95"
              >
                <span>Записаться</span>
                <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};
