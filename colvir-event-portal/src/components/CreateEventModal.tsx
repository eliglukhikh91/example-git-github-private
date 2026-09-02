import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EventCategory } from '../types';
import { ImageUploadAndEditor } from './ImageUploadAndEditor';
import { MoscowClock } from './MoscowClock';
import { RichTextEditor } from './RichTextEditor';
import { getDefaultMoscowTimeSlot } from '../utils/timeUtils';
import { getMoscowIsoDate, toRussianDate } from '../utils/eventDate';
import { withSlot } from '../utils/timeSlots';
import { TimeSlotPicker } from './TimeSlotPicker';
import { parseHashtags, THEME_HASHTAG_HINT } from '../utils/themeTags';
import { X, Sparkles, Tag, Hash, AlertTriangle } from 'lucide-react';

interface CreateEventModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CreateEventModal: React.FC<CreateEventModalProps> = ({ isOpen, onClose }) => {
  const { createEvent, organizerTags, addOrganizerTag } = useApp();

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<EventCategory>('coffee-break');
  const [description, setDescription] = useState('');
  const [isTeamGame, setIsTeamGame] = useState(false);
  const [maxTeamSize, setMaxTeamSize] = useState(5);
  const [maxParticipants, setMaxParticipants] = useState(30);
  // Дата выбирается в календаре, поэтому в состоянии она лежит как YYYY-MM-DD,
  // а в мероприятие уходит привычной строкой «12 августа 2026».
  const [date, setDate] = useState(() => getMoscowIsoDate());
  const [location, setLocation] = useState('Конференц-зал Colvir / Online');
  const [meetingUrl, setMeetingUrl] = useState('');
  const [timeSlots, setTimeSlots] = useState<string[]>(() => [getDefaultMoscowTimeSlot()]);
  // Поля «с» и «до» держит форма, а не сам выбор слотов: при отправке надо
  // добавить выбранное время в список, даже если кнопку «Добавить» не нажали.
  const [slotFrom, setSlotFrom] = useState('');
  const [slotTo, setSlotTo] = useState('');
  const [imageUrl, setImageUrl] = useState('https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80');
  const [organizer, setOrganizer] = useState(organizerTags[0] || 'Colvir Event Team');
  const [themeTag, setThemeTag] = useState<'newyear' | 'spring' | 'birthday' | ''>('');
  const [hashtags, setHashtags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [isAddingNewTag, setIsAddingNewTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  if (!isOpen) return null;

  /**
   * Форма не размонтируется при закрытии, поэтому после удачной публикации ее
   * нужно очистить руками: иначе в следующий раз админ увидит поля от прошлого
   * мероприятия и легко создаст его копию.
   */
  const resetForm = () => {
    setTitle('');
    setDescription('');
    setIsTeamGame(false);
    setMaxTeamSize(5);
    setMaxParticipants(30);
    setDate(getMoscowIsoDate());
    setLocation('Конференц-зал Colvir / Online');
    setMeetingUrl('');
    setTimeSlots([getDefaultMoscowTimeSlot()]);
    setSlotFrom('');
    setSlotTo('');
    setThemeTag('');
    setHashtags('');
    setSaveError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date.trim()) return;
    if (isSaving) return;

    // Время из полей «с» и «до» попадает в список даже без нажатия «Добавить
    // слот»: раньше оно просто пропадало, а мероприятие сохранялось с
    // подставленным 10:00 - 11:00, которое админ не выбирал.
    const slots = withSlot(timeSlots, slotFrom, slotTo);
    if (slots.length === 0) {
      setSaveError('Выберите хотя бы один слот времени.');
      return;
    }

    let defaultImg = imageUrl.trim();
    if (!defaultImg) {
      if (category === 'coffee-break') defaultImg = 'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80';
      else if (category === 'speaking-club') defaultImg = 'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=80';
      else if (category === 'book-club') defaultImg = 'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80';
      else if (category === 'team-game') defaultImg = 'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80';
      else defaultImg = 'https://images.unsplash.com/photo-1511578314322-379afb476865?w=800&auto=format&fit=crop&q=80';
    }

    setIsSaving(true);
    setSaveError(null);

    // Раньше здесь не было ни await, ни catch: форма закрывалась сразу, и
    // когда сервер отказывал (например, из-за тяжелой обложки), мероприятие
    // не создавалось молча — без единого сообщения.
    try {
      await createEvent({
        title: title.trim(),
        category,
        description: description.trim() || 'Приглашаем всех сотрудников принять участие!',
        isTeamGame,
        maxTeamSize: isTeamGame ? maxTeamSize : undefined,
        maxParticipants,
        date: toRussianDate(date),
        timeSlots: slots,
        location: location.trim(),
        meetingUrl: meetingUrl.trim() ? meetingUrl.trim() : undefined,
        imageUrl: defaultImg,
        organizer: organizer.trim(),
        tags: [category, isTeamGame ? 'Команды' : 'Индивидуально', ...parseHashtags(hashtags)],
        themeTag: themeTag || null
      });
      resetForm();
      onClose();
    } catch (error) {
      // Форму не закрываем: введенное остается на месте, чтобы не набирать
      // все заново.
      setSaveError(
        error instanceof Error && error.message
          ? error.message
          : 'Не удалось создать мероприятие. Попробуйте еще раз.'
      );
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Modal Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-accent-light text-accent rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Создать новое мероприятие
              </h2>
              <p className="text-xs text-slate-500">
                Добавление события в корпоративный дайджест Colvir
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          
          {/* Synchronized Moscow Time Widget */}
          <MoscowClock variant="full" />

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Название мероприятия <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Полезный кофе-брейк: Практика ИИ"
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
                onChange={(e) => {
                  const cat = e.target.value as EventCategory;
                  setCategory(cat);
                  if (cat === 'team-game') setIsTeamGame(true);
                }}
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
                id="create-date"
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

          {/* Team Game Checkbox */}
          <div className="p-4 bg-accent-light border border-accent/20 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                id="isTeamGameCheck"
                checked={isTeamGame}
                onChange={(e) => setIsTeamGame(e.target.checked)}
                className="w-4 h-4 text-accent rounded-md focus:ring-accent"
              />
              <label htmlFor="isTeamGameCheck" className="text-xs font-bold text-slate-800 cursor-pointer">
                Это командная игра (нужна регистрация команд и капитана)
              </label>
            </div>

            {isTeamGame && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-slate-600 font-semibold">Игроков в команде:</span>
                <input
                  type="number"
                  min={2}
                  max={20}
                  value={maxTeamSize}
                  onChange={(e) => setMaxTeamSize(Number(e.target.value))}
                  className="w-16 px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-bold text-center"
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
            idPrefix="create"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Место / Ссылка
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Конференц-зал A / MS Teams"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white outline-hidden"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Максимум участников
              </label>
              <input
                type="number"
                min={5}
                max={500}
                value={maxParticipants}
                onChange={(e) => setMaxParticipants(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white outline-hidden"
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

          {/* IMAGE UPLOAD & EDITOR COMPONENT (UP TO 20MB) */}
          <ImageUploadAndEditor
            currentImageUrl={imageUrl}
            onImageChange={setImageUrl}
            category={category}
          />

          {/* Попадание в праздничную подборку под баннером дайджеста */}
          <div className="space-y-2">
            <label
              htmlFor="event-theme-tag"
              className="block text-xs font-bold text-slate-700 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-accent" />
              <span>Праздничная подборка</span>
            </label>
            <select
              id="event-theme-tag"
              value={themeTag}
              onChange={(event) =>
                setThemeTag(event.target.value as 'newyear' | 'spring' | 'birthday' | '')
              }
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-hidden"
            >
              <option value="">Не включать в подборку</option>
              <option value="newyear">Новый год</option>
              <option value="spring">Весна</option>
              <option value="birthday">День рождения компании</option>
            </select>
            <p className="text-[11px] text-slate-500">
              Мероприятие покажется под баннером, когда администратор включит эту тему.
            </p>
          </div>

          {/* Хэштеги: второй способ попасть в праздничную подборку */}
          <div className="space-y-2">
            <label
              htmlFor="event-hashtags"
              className="block text-xs font-bold text-slate-700 flex items-center gap-1.5"
            >
              <Hash className="w-3.5 h-3.5 text-accent" />
              <span>Хэштеги</span>
            </label>
            <input
              id="event-hashtags"
              type="text"
              value={hashtags}
              onChange={(e) => setHashtags(e.target.value)}
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

          {saveError && (
            <div className="p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 bg-rose-50 text-rose-900 border border-rose-200">
              <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">{saveError}</div>
            </div>
          )}

          <div className="pt-2">
            <button
              type="submit"
              disabled={isSaving}
              className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white font-bold text-sm rounded-xl shadow-md transition-all disabled:opacity-60"
            >
              {isSaving ? 'Публикуем…' : 'Опубликовать мероприятие в дайджесте'}
            </button>
          </div>

        </form>

      </div>
    </div>
  );
};
