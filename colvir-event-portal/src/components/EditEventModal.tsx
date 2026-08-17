import React, { useState } from 'react';
import { EventItem, EventCategory } from '../types';
import { useApp } from '../context/AppContext';
import { RichTextEditor } from './RichTextEditor';
import { X, Sparkles, Trash2, Calendar, Clock, MapPin, Tag } from 'lucide-react';

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
  const [date, setDate] = useState(event.date);
  const [location, setLocation] = useState(event.location);
  const [meetingUrl, setMeetingUrl] = useState(event.meetingUrl || '');
  const [timeSlots, setTimeSlots] = useState<string[]>(event.timeSlots);
  const [newTimeSlot, setNewTimeSlot] = useState('');
  const [imageUrl, setImageUrl] = useState(event.imageUrl);
  const [organizer, setOrganizer] = useState(event.organizer);
  const [isAddingNewTag, setIsAddingNewTag] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');

  const handleAddTimeSlot = () => {
    if (newTimeSlot.trim()) {
      let slot = newTimeSlot.trim();
      if (!slot.includes('МСК')) slot += ' (МСК)';
      if (!timeSlots.includes(slot)) {
        setTimeSlots([...timeSlots, slot]);
      }
      setNewTimeSlot('');
    }
  };

  const handleRemoveTimeSlot = (idx: number) => {
    setTimeSlots(timeSlots.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateEvent({
      ...event,
      title: title.trim(),
      category,
      description: description.trim(),
      isTeamGame,
      maxTeamSize: isTeamGame ? maxTeamSize : undefined,
      maxParticipants,
      date: date.trim(),
      location: location.trim(),
      meetingUrl: meetingUrl.trim() ? meetingUrl.trim() : undefined,
      timeSlots: timeSlots.length > 0 ? timeSlots : ['10:00 - 11:00 (МСК)'],
      imageUrl: imageUrl.trim() || event.imageUrl,
      organizer: organizer.trim(),
      tags: [category, isTeamGame ? 'Команды' : 'Индивидуально']
    });
    onClose();
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
            <div className="p-2 bg-[#f0f6fc] text-[#1560AA] rounded-xl">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Редактировать мероприятие
              </h2>
              <p className="text-xs text-slate-500">
                Управление параметрами события в Colvir Portal
              </p>
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
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
                type="text"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
              />
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
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
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
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
                className="w-4 h-4 text-[#1560AA] rounded-sm focus:ring-[#1560AA]"
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
                  className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:border-[#1560AA] outline-hidden"
                />
              </div>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Слоты времени (МСК)
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {timeSlots.map((slot, idx) => (
                <span
                  key={idx}
                  className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-50 text-[#1560AA] border border-blue-200 rounded-xl text-xs font-bold"
                >
                  <span>{slot}</span>
                  {timeSlots.length > 1 && (
                    <button
                      type="button"
                      onClick={() => handleRemoveTimeSlot(idx)}
                      className="text-blue-400 hover:text-red-600 font-bold"
                    >
                      ×
                    </button>
                  )}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newTimeSlot}
                onChange={(e) => setNewTimeSlot(e.target.value)}
                placeholder="Например: 16:30 - 17:30"
                className="flex-1 px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddTimeSlot}
                className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 text-xs font-bold rounded-xl transition-colors"
              >
                Добавить слот
              </button>
            </div>
          </div>

          {/* ORGANIZER / BADGE SELECTION OR CREATION */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-[#1560AA]" />
                <span>Организатор / Плашка события</span>
              </label>
              <button
                type="button"
                onClick={() => setIsAddingNewTag(!isAddingNewTag)}
                className="text-xs font-bold text-[#1560AA] hover:underline"
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
                  className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:border-[#1560AA] outline-hidden"
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
                  className="px-4 py-2 bg-[#1560AA] text-white text-xs font-bold rounded-xl hover:bg-[#104d88]"
                >
                  Добавить
                </button>
              </div>
            ) : (
              <select
                value={organizer}
                onChange={(e) => setOrganizer(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
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
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
            />
          </div>

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
                className="px-6 py-3 bg-[#1560AA] hover:bg-[#104d88] text-white font-bold text-xs rounded-xl shadow-xs transition-all"
              >
                Сохранить изменения
              </button>
            </div>
          </div>

        </form>

      </div>
    </div>
  );
};
