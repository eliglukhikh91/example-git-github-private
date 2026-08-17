import React, { useState } from 'react';
import { EventItem } from '../types';
import { useApp } from '../context/AppContext';
import { safeHtml } from '../utils/sanitizeHtml';
import { EditEventModal } from './EditEventModal';
import {
  X,
  Calendar,
  Clock,
  MapPin,
  Users,
  Gamepad2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  Building2,
  Check,
  Edit3,
  Star,
  MessageSquare,
  CheckCircle2
} from 'lucide-react';

interface EventDetailModalProps {
  event: EventItem | null;
  onClose: () => void;
  onRegister: (event: EventItem) => void;
}

export const EventDetailModal: React.FC<EventDetailModalProps> = ({
  event,
  onClose,
  onRegister
}) => {
  const {
    getParticipantsForEvent,
    getTeamsForEvent,
    getUserRegistrations,
    isAdmin,
    ratings,
    addEventRating,
    getEventAverageRating,
    userProfile
  } = useApp();

  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [userRatingScore, setUserRatingScore] = useState<number>(10);
  const [ratingComment, setRatingComment] = useState<string>('');
  const [ratingSuccessMsg, setRatingSuccessMsg] = useState<string>('');
  const [isEditingRating, setIsEditingRating] = useState<boolean>(false);

  if (!event) return null;

  const participants = getParticipantsForEvent(event.id);
  const teams = getTeamsForEvent(event.id);
  const isFull = participants.length >= event.maxParticipants;

  const myRegistrations = getUserRegistrations();
  const isUserRegistered = myRegistrations.some((r) => r.eventId === event.id && r.status !== 'cancelled');
  const myReg = myRegistrations.find((r) => r.eventId === event.id && r.status !== 'cancelled');

  const avgRating = getEventAverageRating(event.id);
  const eventRatings = ratings.filter((r) => r.eventId === event.id);
  const myExistingRating = ratings.find((r) => r.eventId === event.id && r.userEmail === userProfile.email);

  const handleSubmitRating = (e: React.FormEvent) => {
    e.preventDefault();
    addEventRating({
      eventId: event.id,
      eventTitle: event.title,
      rating: userRatingScore,
      comment: ratingComment.trim() || undefined
    });
    setRatingSuccessMsg('Спасибо за ваш отзыв! Оценка сохранена и учтена в аналитике платформы.');
    setRatingComment('');
    setTimeout(() => setRatingSuccessMsg(''), 4000);
  };

  return (
    <>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
        <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col relative">
          
          {/* Cover Image & Close Header */}
          <div className="relative h-56 w-full bg-slate-100">
            <img
              src={event.imageUrl}
              alt={event.title}
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />

            <div className="absolute top-4 right-4 flex items-center gap-2">
              {isAdmin && (
                <button
                  onClick={() => setIsEditModalOpen(true)}
                  className="px-3 py-1.5 bg-white/95 hover:bg-white text-accent rounded-xl font-bold text-xs shadow-md transition-all flex items-center gap-1"
                  title="Редактировать событие"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Редактировать</span>
                </button>
              )}
              <button
                onClick={onClose}
                className="p-2 bg-black/40 hover:bg-black/60 text-white rounded-full transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="absolute bottom-4 left-6 right-6 text-white space-y-1">
              <span className="px-3 py-1 bg-accent text-white text-xs font-extrabold rounded-lg inline-block">
                {event.isTeamGame ? 'Командное соревнование' : 'Клубная встреча'}
              </span>
              <h2 className="text-2xl font-black leading-tight drop-shadow-sm">
                {event.title}
              </h2>
            </div>
          </div>

          {/* Content Body */}
          <div className="p-6 space-y-6">
            
            {/* Metadata Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-slate-50 p-4 rounded-2xl border border-slate-200/80 text-xs">
              <div className="space-y-0.5">
                <span className="text-slate-400 font-semibold block flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5 text-accent" />
                  Дата:
                </span>
                <strong className="text-slate-900 text-sm">{event.date}</strong>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 font-semibold block flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5 text-accent" />
                  Слоты времени (МСК):
                </span>
                <strong className="text-slate-900 text-xs block">
                  {event.timeSlots.map(s => s.includes('МСК') ? s : `${s} (МСК)`).join(', ')}
                </strong>
              </div>

              <div className="space-y-0.5">
                <span className="text-slate-400 font-semibold block flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-accent" />
                  Локация:
                </span>
                <strong className="text-slate-900 text-xs block truncate">{event.location}</strong>
              </div>

              {/* Размер команды перенесён сюда с карточки события, чтобы не
                  держать на ней второй бейдж. */}
              {event.isTeamGame && (
                <div className="space-y-0.5">
                  <span className="text-slate-400 font-semibold block flex items-center gap-1">
                    <Users className="w-3.5 h-3.5 text-accent" />
                    Формат:
                  </span>
                  <strong className="text-slate-900 text-xs block">
                    Командная игра · до {event.maxTeamSize || 5} чел. в команде
                  </strong>
                </div>
              )}
            </div>

            {/* Online Meeting Join Button Banner */}
            {event.meetingUrl && (
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl flex items-center justify-between gap-4">
                <div className="space-y-0.5">
                  <div className="text-xs font-bold text-accent uppercase tracking-wider">
                    Онлайн-трансляция / Встреча
                  </div>
                  <div className="text-xs text-slate-600 truncate max-w-sm">
                    {event.meetingUrl}
                  </div>
                </div>
                <a
                  href={event.meetingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="px-4 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 shrink-0"
                >
                  <span>Подключиться</span>
                </a>
              </div>
            )}

            {/* Description */}
            <div className="space-y-2">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                Описание программы:
              </h3>
              <div
                className="text-sm text-slate-700 leading-relaxed prose max-w-none"
                dangerouslySetInnerHTML={safeHtml(event.description)}
              />
            </div>

            {/* Registered status alert if user is registered */}
            {isUserRegistered && myReg && (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl space-y-1">
                <div className="flex items-center gap-2 text-emerald-900 font-bold text-sm">
                  <ShieldCheck className="w-5 h-5 text-emerald-600" />
                  <span>Вы записаны на это мероприятие</span>
                </div>
                <div className="text-xs text-emerald-800">
                  Слот: <strong>{myReg.timeSlot || event.timeSlots[0]}</strong>
                  {myReg.isTeamGame && (
                    <span> | Команда: <strong>{myReg.teamName}</strong> ({myReg.role === 'captain' ? 'Капитан' : 'Игрок'})</span>
                  )}
                </div>
              </div>
            )}

            {/* Event Rating & Evaluation Section (Confidential feedback to admins) */}
            <div className="p-5 bg-gradient-to-br from-slate-50 to-blue-50/40 rounded-2xl border border-slate-200/80 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Star className="w-5 h-5 text-accent fill-accent" />
                  <h3 className="text-sm font-bold text-slate-900">
                    Оценка мероприятия
                  </h3>
                </div>
                {isAdmin && avgRating > 0 && (
                  <div className="px-2.5 py-1 bg-blue-50 border border-blue-200 rounded-xl text-[11px] font-bold text-accent">
                    Админ: средняя оценка {avgRating}/10 ({eventRatings.length})
                  </div>
                )}
              </div>

              {(myExistingRating && !isEditingRating) || ratingSuccessMsg ? (
                <div className="p-4 bg-[#EBF3FE] border border-blue-200 rounded-2xl text-slate-800 font-bold text-xs flex items-center justify-between shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-2xl bg-accent text-white flex items-center justify-center font-black shrink-0 shadow-xs">
                      <CheckCircle2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <div className="text-sm font-black text-slate-900">
                        {ratingSuccessMsg || 'Спасибо за Вашу оценку!'}
                      </div>
                      <div className="text-[11px] font-medium text-slate-600">
                        Ваш отзыв конфиденциально передан организаторам.
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsEditingRating(true)}
                    className="text-[11px] text-accent hover:underline font-extrabold px-3 py-1.5 bg-white rounded-xl border border-slate-200 cursor-pointer shadow-2xs"
                  >
                    Изменить
                  </button>
                </div>
              ) : (
                <form onSubmit={(e) => {
                  handleSubmitRating(e);
                  setIsEditingRating(false);
                }} className="space-y-3 bg-white p-4 rounded-xl border border-slate-200/70">
                  <div className="space-y-1.5">
                    <label className="text-xs font-bold text-slate-700 flex items-center justify-between">
                      <span>Выберите оценку от 1 до 10:</span>
                      <span className="text-sm font-black text-accent">{userRatingScore} / 10</span>
                    </label>
                    
                    {/* 1 to 10 scale buttons */}
                    <div className="grid grid-cols-10 gap-1">
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((score) => (
                        <button
                          key={score}
                          type="button"
                          onClick={() => setUserRatingScore(score)}
                          className={`py-2 rounded-lg text-xs font-extrabold transition-all border cursor-pointer ${
                            userRatingScore === score
                              ? 'bg-accent text-white border-accent shadow-xs scale-105'
                              : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {score}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[11px] font-bold text-slate-500 flex items-center gap-1">
                      <MessageSquare className="w-3.5 h-3.5 text-slate-400" />
                      Ваш комментарий или пожелания организаторам (необязательно):
                    </label>
                    <textarea
                      value={ratingComment}
                      onChange={(e) => setRatingComment(e.target.value)}
                      placeholder="Что вам особенно понравилось или что стоит улучшить?"
                      rows={2}
                      className="w-full px-3 py-2 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-accent/30 focus:border-accent"
                    />
                  </div>

                  <div className="flex items-center justify-end gap-2">
                    {isEditingRating && (
                      <button
                        type="button"
                        onClick={() => setIsEditingRating(false)}
                        className="px-3 py-2 bg-slate-100 text-slate-700 text-xs font-bold rounded-xl"
                      >
                        Отмена
                      </button>
                    )}
                    <button
                      type="submit"
                      className="w-full py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
                    >
                      {myExistingRating ? 'Сохранить изменения' : 'Отправить оценку'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Real-time Team / Participant preview */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-accent" />
                  {event.isTeamGame ? `Сформированные команды (${teams.length})` : `Зарегистрированные сотрудники (${participants.length})`}
                </h3>
                <span className="text-xs font-bold text-accent">
                  {participants.length} / {event.maxParticipants} мест
                </span>
              </div>

              {event.isTeamGame ? (
                teams.length === 0 ? (
                  <div className="text-xs text-slate-400 italic py-2">
                    Команды пока не сформированы. Создайте первую команду при записи!
                  </div>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {teams.map((t) => (
                      <div key={t.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs space-y-1">
                        <div className="font-extrabold text-slate-900 flex items-center justify-between">
                          <span>{t.name}</span>
                          <span className="text-[10px] bg-slate-200 px-1.5 py-0.5 rounded-md text-slate-700">
                            {t.members.length} / {event.maxTeamSize || 5} чел
                          </span>
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Капитан: {t.captainName || '—'}
                        </div>
                      </div>
                    ))}
                  </div>
                )
              ) : (
                <div className="flex flex-wrap gap-1.5">
                  {participants.slice(0, 10).map((p) => (
                    <span
                      key={p.id}
                      className="px-2.5 py-1 bg-slate-100 border border-slate-200/80 rounded-lg text-xs font-semibold text-slate-800"
                    >
                      {p.lastName} {p.firstName.charAt(0)}.
                    </span>
                  ))}
                  {participants.length > 10 && (
                    <span className="px-2.5 py-1 bg-accent-light text-accent font-bold text-xs rounded-lg">
                      +{participants.length - 10} еще
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Action Footer */}
            <div className="pt-4 border-t border-slate-100 flex items-center gap-3">
              {!isUserRegistered && (
                <button
                  onClick={() => {
                    onClose();
                    onRegister(event);
                  }}
                  disabled={isFull}
                  className={`w-full py-3.5 px-4 rounded-xl font-bold text-sm shadow-xs transition-all flex items-center justify-center gap-2 ${
                    isFull
                      ? 'bg-slate-200 text-slate-500 cursor-not-allowed'
                      : 'bg-accent hover:bg-accent-hover text-white active:scale-98'
                  }`}
                >
                  <span>{isFull ? 'Мест нет (Группа заполнена)' : 'Записаться на мероприятие'}</span>
                  {!isFull && <ChevronRight className="w-4 h-4" />}
                </button>
              )}

              <button
                onClick={onClose}
                className="py-3.5 px-6 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-sm rounded-xl transition-all"
              >
                Закрыть
              </button>
            </div>

          </div>

        </div>
      </div>

      <EditEventModal
        event={event}
        isOpen={isEditModalOpen}
        onClose={() => {
          setIsEditModalOpen(false);
          onClose();
        }}
      />
    </>
  );
};
