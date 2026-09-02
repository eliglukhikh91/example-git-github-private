import React, { useState } from 'react';
import { EventItem, EventCategory } from '../types';
import { useApp } from '../context/AppContext';
import { RichTextEditor } from './RichTextEditor';
import { formatHashtags, parseHashtags, THEME_HASHTAG_HINT } from '../utils/themeTags';
import { parseSlot, withSlot } from '../utils/timeSlots';
import { toIsoDate, toRussianDate } from '../utils/eventDate';
import { TimeSlotPicker } from './TimeSlotPicker';
import { X, Sparkles, Trash2, Tag, Hash, AlertTriangle } from 'lucide-react';

interface EditEventModalProps {
  event: EventItem | null;
  isOpen: boolean;
  onClose: () => void;
}

export const EditEventModal: React.FC<EditEventModalProps> = ({ event, isOpen, onClose }) => {
  const { updateEvent, deleteEvent, organizerTags, addOrganizerTag } = useApp();

  if (!isOpen || !event) return null;

  const [title, setTitle] = useState(event.title);
  const [category, setCategory] = useState<EventCategory>(event.category);
  const [description, setDescription] = useState(event.description);
  const [isTeamGame, setIsTeamGame] = useState(event.isTeamGame);
  const [maxTeamSize, setMaxTeamSize] = useState(event.maxTeamSize || 5);
  const [maxParticipants, setMaxParticipants] = useState(event.maxParticipants);
  // Дата в базе лежит строкой «12 августа 2026»; для календаря переводим ее в
  // YYYY-MM-DD, а при сохранении возвращаем обратно.
  const [date, setDate] = useState(() => toIsoDate(event.date));
  const [location, setLocation] = useState(event.location);
  const [meetingUrl, setMeetingUrl] = useState(event.meetingUrl || '');
  const [timeSlots, setTimeSlots] = useState<string[]>(event.timeSlots);
  // Поля «с» и «до» заполняем первым слотом мероприятия, чтобы было видно, от
  // чего отталкиваться. Форма добавит выбранное время в список при сохранении,
  // даже если кнопку «Добавить слот» не нажали.
  const [slotFrom, setSlotFrom] = useState(() => parseSlot(event.timeSlots[0] ?? '')?.from ?? '');
  const [slotTo, setSlotTo] = useState(() => parseSlot(event.timeSlots[0] ?? '')?.to ?? '');
  const [imageUrl, setImageUrl] = useState(event.imageUrl);
  const [organizer, setOrganizer] = useState(event.organizer);
  const [themeTag, setThemeTag] = useState<'newyear' | 'spring' | 'birthday' | ''>(
    event.themeTag ?? ''
  );
  const [hashtags, setHashtags] = useState(() => formatHashtags(event.tags));
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isAddingNewTag, setIsAddingNewTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSaving) return;

    const slots = withSlot(timeSlots, slotFrom, slotTo);
    if (slots.length === 0) {
      setSaveError('Выберите хотя бы один слот времени.');
      return;
    }

    setIsSaving(true);
    setSaveError(null);

    // Как и в форме создания: без await и catch правки терялись молча, если
    // сервер отказывал.
    try {
      await updateEvent({
        ...event,
        title: title.trim(),
        category,
        description: description.trim(),
        isTeamGame,
        maxTeamSize: isTeamGame ? maxTeamSize : undefined,
        maxParticipants,
        date: toRussianDate(date),
        location: location.trim(),
        meetingUrl: meetingUrl.trim() ? meetingUrl.trim() : undefined,
        timeSlots: slots,
        imageUrl: imageUrl.trim() || event.imageUrl,
        organizer: organizer.trim(),
        tags: [category, isTeamGame ? 'Команды' : 'Индивидуально', ...parseHashtags(hashtags)],
        themeTag: themeTag || null
      });
      onClose();
    } catch (error) {
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : 'Не удалось сохранить изменения. Попробуйте еще раз.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = () => {
    if (window.confirm(`Вы уверены, что хотите удалить мероприятие "${event.title}"? Это действие необратимо.`)) {
      deleteEvent(event.id);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-accent-light text-accent rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Редактировать мероприятие
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDelete}
              className="p-2 text-red-600 hover:bg-red-50 rounded-xl transition-colors"
              title="Удалить мероприятие"
            >
              <Trash2 className="w-5 h-5" />
            </button>
            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Название мероприятия <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-accent outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Категория
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as EventCategory)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-accent outline-hidden"
              >
                <option value="coffee-break">☕ Полезный кофе-брейк</option>
                <option value="speaking-club">🗣️ Speaking Club</option>
                <option value="book-club">📚 Книжный клуб</option>
                <option value="team-game">🎮 Командная игра / Турнир</option>
                <option value="workshop">🎓 Воркшоп / Обучение</option>
                <option value="other">✨ Другое событие</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Дата проведения <span className="text-red-500">*</span>
              </label>
              <input
                id="edit-date"
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-accent outline-hidden"
              />
              {date && (
                <p className="text-[11px] text-slate-500 mt-1">{toRussianDate(date)}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Максимум участников
              </label>
              <input
                type="number"
                min={2}
                max={500}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-accent outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Локация / Аудитория
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-accent outline-hidden"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ссылка на онлайн-встречу (Teams / Zoom / Webex)
            </label>
            <input
              type="url"
              value={meetingUrl}
              onChange={(e) => setMeetingUrl(e.target.value)}
              placeholder="https://teams.microsoft.com/l/meetup-join/..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white outline-hidden"
            />
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={isTeamGame}
                onChange={(e) => setIsTeamGame(e.target.checked)}
                className="w-4 h-4 text-accent rounded-sm focus:ring-accent"
              />
              <span className="text-xs font-bold text-slate-800">
                Это командное соревнование / турнир
              </span>
            </label>

            {isTeamGame && (
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Максимум человек в команде
                </label>
                <input
                  type="number"
                  min={2}
                  max={15}
                  value={maxTeamSize}
                  onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:border-accent outline-hidden"
                />
              </div>
            )}
          </div>

          <TimeSlotPicker
            slots={timeSlots}
            onSlotsChange={setTimeSlots}
            from={slotFrom}
            to={slotTo}
            onFromChange={setSlotFrom}
            onToChange={setSlotTo}
            idPrefix="edit"
          />

          {/* Попадание в праздничную подборку под баннером дайджеста */}
          <div className="space-y-2">
            <label
              htmlFor="edit-theme-tag"
              className="block text-xs font-bold text-slate-700 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Праздничная подборка</span>
            </label>
            <select
              id="edit-theme-tag"
              value={themeTag}
              onChange={(changeEvent) =>
                setThemeTag(changeEvent.target.value as 'newyear' | 'spring' | 'birthday' | '')
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-hidden"
            >
              <option value="">Не включать в подборку</option>
              <option value="newyear">Новый год</option>
              <option value="spring">Весна</option>
              <option value="birthday">День рождения компании</option>
            </select>
          </div>

          {/* Хэштеги: второй способ попасть в праздничную подборку */}
          <div className="space-y-2">
            <label
              htmlFor="edit-hashtags"
              className="block text-xs font-bold text-slate-700 flex items-center gap-1.5"
            >
              <Hash className="w-3.5 h-3.5 text-accent" />
              <span>Хэштеги</span>
            </label>
            <input
              id="edit-hashtags"
              type="text"
              value={hashtags}
              onChange={(changeEvent) => setHashtags(changeEvent.target.value)}
              placeholder="#новыйгод #квиз"
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-hidden"
            />
            <p className="text-[11px] text-slate-500">
              Каждый хэштег с решетки, через пробел или запятую. Хэштеги{' '}
              {THEME_HASHTAG_HINT} тоже включают мероприятие в праздничную подборку —
              выбирать тему в списке выше тогда не обязательно.
            </p>
          </div>

          {/* ORGANIZER / BADGE SELECTION OR CREATION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-accent" />
                <span>Организатор / Плашка события</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingNewTag(!isAddingNewTag)}
                className="text-xs font-bold text-accent hover:underline"
              >
                {isAddingNewTag ? 'Выбрать из существующих' : '+ Добавить свою плашку'}
              </button>
            </div>

            {isAddingNewTag ? (
              <div className="flex gap-2">
                <input
                  type="text"
                  value={newTagInput}
                  onChange={(e) => setNewTagInput(e.target.value)}
                  placeholder="Например: Colvir Innovation Lab"
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:border-accent outline-hidden"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (newTagInput.trim()) {
                      addOrganizerTag(newTagInput.trim());
                      setOrganizer(newTagInput.trim());
                      setNewTagInput('');
                      setIsAddingNewTag(false);
                    }
                  }}
                  className="px-4 py-2 bg-accent text-white text-xs font-bold rounded-xl hover:bg-accent-hover"
                >
                  Добавить
                </button>
              </div>
            ) : (
              <select
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-accent outline-hidden"
              >
                {organizerTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Описание мероприятия (инструменты форматирования: жирный, списки, цвета, шрифты)
            </label>
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Введите подробную программу мероприятия с форматированием..."
              minHeight="140px"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Ссылка на изображение-обложку (URL)
            </label>
            <input
              type="text"
              value={imageUrl}
              onChange={(e) => setImageUrl(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-accent outline-hidden"
            />
          </div>

          {saveError && (
            <div className="p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 bg-rose-50 text-rose-900 border border-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{saveError}</div>
            </div>
          )}

          {/* Footer Actions */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-3">
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-3 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
            >
              <Trash2 className="w-4 h-4" />
              <span>Удалить событие</span>
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Отмена
              </button>
              <button
                type="submit"
                disabled={isSaving}
                className="px-6 py-3 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-xs transition-all disabled:opacity-60"
              >
                {isSaving ? 'Сохраняем…' : 'Сохранить изменения'}
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
