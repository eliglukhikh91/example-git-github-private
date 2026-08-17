import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { EventItem, Participant } from '../types';
import { EditEventModal } from './EditEventModal';
import {
  ShieldAlert,
  Users,
  Calendar,
  Trash2,
  Edit3,
  PlusCircle,
  Download,
  Search,
  CheckCircle2,
  Clock,
  MapPin,
  Building2,
  KeyRound,
  Lock,
  FileText,
  Save,
  Coffee,
  Plus,
  X,
  Sparkles,
  BarChart3,
  TrendingUp,
  Star,
  Award,
  Activity,
  MessageSquare
} from 'lucide-react';

interface AdminDashboardProps {
  onOpenCreateEvent: () => void;
  onOpenAccessSettings: () => void;
}

export const AdminDashboard: React.FC<AdminDashboardProps> = ({
  onOpenCreateEvent,
  onOpenAccessSettings
}) => {
  const {
    isAdmin,
    events,
    participants,
    deleteEvent,
    getParticipantsForEvent,
    getTeamsForEvent,
    cancelRegistration,
    cmsContent,
    updateCMSContent,
    coffeeSlots,
    addCoffeeSlot,
    deleteCoffeeSlot,
    ratings,
    getEventAverageRating
  } = useApp();

  const [activeTab, setActiveTab] = useState<'events' | 'cms' | 'coffee' | 'analytics'>('events');

  // Events management states
  const [selectedEventId, setSelectedEventId] = useState<string>(events[0]?.id || '');
  const [editingEvent, setEditingEvent] = useState<EventItem | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  // CMS Form state
  const [cmsForm, setCmsForm] = useState({
    holidayBannerSpringText: cmsContent?.holidayBannerSpringText || '',
    holidayBannerBirthdayText: cmsContent?.holidayBannerBirthdayText || '',
    holidayBannerNewYearText: cmsContent?.holidayBannerNewYearText || '',
    randomCoffeeTitle: cmsContent?.randomCoffeeTitle || '',
    randomCoffeeDescription: cmsContent?.randomCoffeeDescription || '',
    randomCoffeeFormat: cmsContent?.randomCoffeeFormat || '',
    randomCoffeeDuration: cmsContent?.randomCoffeeDuration || ''
  });
  const [cmsSavedSuccess, setCmsSavedSuccess] = useState(false);

  // Coffee Slot state
  const [newSlotInput, setNewSlotInput] = useState('');

  if (!isAdmin) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 bg-blue-100 text-[#1560AA] rounded-3xl mx-auto flex items-center justify-center shadow-lg">
          <Lock className="w-8 h-8 text-[#1560AA]" />
        </div>
        <div className="space-y-2">
          <h2 className="text-2xl font-black text-slate-900">
            Требуются права администратора
          </h2>
          <p className="text-sm text-slate-500 max-w-md mx-auto">
            Панель управления доступна только авторизованным администраторам Colvir Portal. Пожалуйста, войдите с учетной записью администратора или введите PIN-код.
          </p>
        </div>
        <div>
          <button
            onClick={onOpenAccessSettings}
            className="px-6 py-3 bg-[#1560AA] hover:bg-[#104d88] text-white font-bold text-xs rounded-xl shadow-md transition-all inline-flex items-center gap-2"
          >
            <KeyRound className="w-4 h-4 text-white" />
            <span>Открыть настройки доступа и ввести PIN</span>
          </button>
        </div>
      </div>
    );
  }

  const selectedEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const eventParticipants = selectedEvent ? getParticipantsForEvent(selectedEvent.id) : [];
  const eventTeams = selectedEvent ? getTeamsForEvent(selectedEvent.id) : [];

  const filteredParticipants = eventParticipants.filter(
    (p) =>
      !searchTerm ||
      p.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      p.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (p.department && p.department.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const coffeeEvent = events.find((e) => e.category === 'coffee-break') || events[2];
  const coffeeRegistrations = participants.filter((p) => p.eventId === coffeeEvent?.id && p.status !== 'cancelled');

  const handleSaveCMS = (e: React.FormEvent) => {
    e.preventDefault();
    updateCMSContent(cmsForm);
    setCmsSavedSuccess(true);
    setTimeout(() => setCmsSavedSuccess(false), 3000);
  };

  const handleAddSlot = () => {
    if (newSlotInput.trim()) {
      addCoffeeSlot(newSlotInput.trim());
      setNewSlotInput('');
    }
  };

  const handleExportCSV = () => {
    if (!selectedEvent) return;
    const headers = ['Фамилия', 'Имя', 'Email', 'Департамент', 'Слот', 'Команда', 'Роль', 'Дата регистрации'];
    const rows = eventParticipants.map((p) => [
      p.lastName,
      p.firstName,
      p.email,
      p.department || '',
      p.timeSlot || '',
      p.teamName || '',
      p.role || '',
      p.registeredAt
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `participants_${selectedEvent.id}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fadeIn">
      
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-slate-900 to-[#1560AA] text-white p-6 sm:p-8 rounded-3xl shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/10 text-white font-extrabold text-xs rounded-full border border-white/20">
            <ShieldAlert className="w-3.5 h-3.5 text-white" />
            <span>Панель управления администратора Colvir Portal</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">
            Управление контентом и мероприятиями
          </h1>
          <p className="text-xs text-slate-200 max-w-xl">
            Контролируйте списки участников, редактируйте тексты плашек платформы самостоятельно и управляйте слотами Random Coffee.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onOpenCreateEvent}
            className="px-5 py-3 bg-[#1560AA] hover:bg-[#104d88] text-white font-bold text-xs rounded-xl shadow-md transition-all flex items-center gap-2"
          >
            <PlusCircle className="w-4 h-4 text-white" />
            <span>Создать событие</span>
          </button>
        </div>
      </div>

      {/* Main Navigation Tabs */}
      <div className="flex border-b border-slate-200 bg-white rounded-2xl p-1.5 shadow-xs">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'events'
              ? 'bg-[#1560AA] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Calendar className="w-4 h-4 text-white" />
          <span>Мероприятия и участники</span>
        </button>

        <button
          onClick={() => setActiveTab('cms')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'cms'
              ? 'bg-[#1560AA] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <FileText className="w-4 h-4 text-white" />
          <span>Редактор текстов платформы (CMS)</span>
        </button>

        <button
          onClick={() => setActiveTab('coffee')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'coffee'
              ? 'bg-[#1560AA] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <Coffee className="w-4 h-4 text-white" />
          <span>Слоты Random Coffee ({coffeeRegistrations.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex-1 py-3 px-4 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 ${
            activeTab === 'analytics'
              ? 'bg-[#1560AA] text-white shadow-xs'
              : 'text-slate-600 hover:bg-slate-100'
          }`}
        >
          <BarChart3 className="w-4 h-4 text-white" />
          <span>Аналитика & Оценки (1-10)</span>
        </button>
      </div>

      {/* TAB 1: EVENTS MANAGEMENT */}
      {activeTab === 'events' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Left Column: Events List selector */}
          <div className="bg-white rounded-3xl p-5 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#1560AA]" />
                <span>Мероприятия ({events.length})</span>
              </h2>
            </div>

            <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
              {events.map((evt) => {
                const count = getParticipantsForEvent(evt.id).length;
                const isSelected = evt.id === selectedEventId;
                return (
                  <button
                    key={evt.id}
                    onClick={() => setSelectedEventId(evt.id)}
                    className={`w-full text-left p-3.5 rounded-2xl border transition-all flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-blue-50/80 border-[#1560AA] text-[#1560AA] shadow-2xs'
                        : 'bg-white border-slate-200/80 hover:bg-slate-50 text-slate-800'
                    }`}
                  >
                    <div className="space-y-1 min-w-0">
                      <h3 className="text-xs font-bold truncate">{evt.title}</h3>
                      <p className="text-[11px] text-slate-500">{evt.date}</p>
                    </div>
                    <div className="shrink-0 text-right">
                      <span className="inline-flex items-center px-2.5 py-1 bg-white border border-slate-200 rounded-xl text-xs font-black text-[#1560AA]">
                        {count} / {evt.maxParticipants}
                      </span>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Right Column: Event Details & Participants Roster */}
          <div className="lg:col-span-2 space-y-6">
            {selectedEvent ? (
              <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
                
                {/* Event Title & Quick Actions */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-slate-100">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 bg-[#f0f6fc] text-[#1560AA] text-[10px] font-black rounded-md">
                      {selectedEvent.isTeamGame ? 'Командное соревнование' : 'Клубная встреча'}
                    </span>
                    <h2 className="text-xl font-black text-slate-900">{selectedEvent.title}</h2>
                    <p className="text-xs text-slate-500">{selectedEvent.location} • {selectedEvent.date}</p>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setEditingEvent(selectedEvent)}
                      className="px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-[#1560AA]" />
                      <span>Редактировать</span>
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Удалить мероприятие "${selectedEvent.title}"?`)) {
                          deleteEvent(selectedEvent.id);
                        }
                      }}
                      className="px-3.5 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Удалить</span>
                    </button>
                  </div>
                </div>

                {/* Stats overview */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400">Участники</span>
                    <div className="text-lg font-black text-slate-900">
                      {eventParticipants.length} <span className="text-xs font-semibold text-slate-500">/ {selectedEvent.maxParticipants}</span>
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400">Заполненность</span>
                    <div className="text-lg font-black text-[#1560AA]">
                      {Math.round((eventParticipants.length / selectedEvent.maxParticipants) * 100)}%
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400">Команды</span>
                    <div className="text-lg font-black text-slate-900">
                      {eventTeams.length}
                    </div>
                  </div>

                  <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
                    <span className="text-[11px] font-bold text-slate-400">Статус</span>
                    <div className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-1 rounded-lg inline-block">
                      Активно
                    </div>
                  </div>
                </div>

                {/* Participants Section */}
                <div className="space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      <Users className="w-4 h-4 text-[#1560AA]" />
                      <span>Записанные сотрудники ({eventParticipants.length})</span>
                    </h3>

                    <div className="flex items-center gap-2">
                      <div className="relative">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                          placeholder="Поиск по имени..."
                          className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden w-48 sm:w-60"
                        />
                      </div>

                      <button
                        onClick={handleExportCSV}
                        className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center gap-1.5"
                        title="Экспорт в CSV"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Экспорт</span>
                      </button>
                    </div>
                  </div>

                  {filteredParticipants.length === 0 ? (
                    <div className="p-8 text-center bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
                      <Users className="w-8 h-8 text-slate-300 mx-auto" />
                      <p className="text-xs font-semibold text-slate-500">
                        Нет записанных участников по вашему запросу.
                      </p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                          <tr>
                            <th className="p-3">Сотрудник</th>
                            <th className="p-3">Департамент</th>
                            <th className="p-3">Слот / Команда</th>
                            <th className="p-3 text-right">Действия</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {filteredParticipants.map((p) => (
                            <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-slate-900">
                                  {p.lastName} {p.firstName}
                                </div>
                                <div className="text-[11px] text-slate-500">{p.email}</div>
                              </td>
                              <td className="p-3 text-slate-600 font-medium">
                                {p.department || '—'}
                              </td>
                              <td className="p-3">
                                <div className="font-semibold text-[#1560AA]">
                                  {p.timeSlot || selectedEvent.timeSlots[0]}
                                </div>
                                {p.teamName && (
                                  <div className="text-[11px] text-slate-500">
                                    Команда: <strong>{p.teamName}</strong> ({p.role === 'captain' ? 'Капитан' : 'Игрок'})
                                  </div>
                                )}
                              </td>
                              <td className="p-3 text-right">
                                <button
                                  onClick={() => cancelRegistration(p.id)}
                                  className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] rounded-lg transition-colors"
                                  title="Отменить запись"
                                >
                                  Отменить
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>

              </div>
            ) : (
              <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80">
                <p className="text-xs text-slate-500">Выберите мероприятие слева.</p>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 2: CMS PLATFORM TEXT EDITOR */}
      {activeTab === 'cms' && (
        <form onSubmit={handleSaveCMS} className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/80 shadow-xs space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <FileText className="w-5 h-5 text-[#1560AA]" />
                <span>Редактор текстов и слоганов платформы</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Вносите изменения в праздничные слоганы и тексты Random Coffee без участия разработчиков. Изменения сохраняются моментально.
              </p>
            </div>

            <button
              type="submit"
              className="px-6 py-3 bg-[#1560AA] hover:bg-[#104d88] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-white" />
              <span>Сохранить тексты</span>
            </button>
          </div>

          {cmsSavedSuccess && (
            <div className="p-4 bg-blue-50 border border-blue-200 text-[#1560AA] font-bold text-xs rounded-2xl flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#1560AA]" />
              <span>Все тексты платформы успешно сохранены и обновлены!</span>
            </div>
          )}

          {/* Section A: Holiday Banner Slogans */}
          <div className="space-y-4">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 text-[#1560AA]">
              <Sparkles className="w-4 h-4 text-[#1560AA]" />
              <span>Праздничная плашка (Темы оформления)</span>
            </h3>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Текст слогана для темы «Весеннее настроение (Spring)»:
                </label>
                <input
                  type="text"
                  value={cmsForm.holidayBannerSpringText}
                  onChange={(e) => setCmsForm({ ...cmsForm, holidayBannerSpringText: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Текст слогана для темы «День Рождения Colvir»:
                </label>
                <input
                  type="text"
                  value={cmsForm.holidayBannerBirthdayText}
                  onChange={(e) => setCmsForm({ ...cmsForm, holidayBannerBirthdayText: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Текст слогана для темы «Новый Год в Colvir»:
                </label>
                <input
                  type="text"
                  value={cmsForm.holidayBannerNewYearText}
                  onChange={(e) => setCmsForm({ ...cmsForm, holidayBannerNewYearText: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
                />
              </div>
            </div>
          </div>

          {/* Section B: Random Coffee Texts */}
          <div className="space-y-4 pt-4 border-t border-slate-100">
            <h3 className="text-sm font-black text-slate-900 uppercase tracking-wider flex items-center gap-2 text-[#1560AA]">
              <Coffee className="w-4 h-4 text-[#1560AA]" />
              <span>Страница Random Coffee</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Главный заголовок:
                </label>
                <input
                  type="text"
                  value={cmsForm.randomCoffeeTitle}
                  onChange={(e) => setCmsForm({ ...cmsForm, randomCoffeeTitle: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Формат проведения:
                </label>
                <input
                  type="text"
                  value={cmsForm.randomCoffeeFormat}
                  onChange={(e) => setCmsForm({ ...cmsForm, randomCoffeeFormat: e.target.value })}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Описание сервиса:
              </label>
              <textarea
                rows={3}
                value={cmsForm.randomCoffeeDescription}
                onChange={(e) => setCmsForm({ ...cmsForm, randomCoffeeDescription: e.target.value })}
                className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden resize-none"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="px-6 py-3 bg-[#1560AA] hover:bg-[#104d88] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center gap-2"
            >
              <Save className="w-4 h-4 text-white" />
              <span>Сохранить изменения CMS</span>
            </button>
          </div>
        </form>
      )}

      {/* TAB 3: COFFEE SLOTS & REGISTRATIONS */}
      {activeTab === 'coffee' && (
        <div className="space-y-6">
          
          {/* Slot Manager Box */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Clock className="w-5 h-5 text-[#1560AA]" />
                  <span>Управление слотами времени Random Coffee</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Редактируйте или добавляйте 15-минутные слоты для бронирования сотрудниками.
                </p>
              </div>
            </div>

            {/* Add new slot form */}
            <div className="flex gap-2 max-w-md">
              <input
                type="text"
                value={newSlotInput}
                onChange={(e) => setNewSlotInput(e.target.value)}
                placeholder="E.g. 17:00 - 17:15 (МСК)"
                className="flex-1 px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
              />
              <button
                type="button"
                onClick={handleAddSlot}
                className="px-4 py-2 bg-[#1560AA] hover:bg-[#104d88] text-white text-xs font-bold rounded-xl flex items-center gap-1"
              >
                <Plus className="w-4 h-4 text-white" />
                <span>Добавить слот</span>
              </button>
            </div>

            {/* Slots list */}
            <div className="flex flex-wrap gap-2 pt-2">
              {coffeeSlots.map((slot) => (
                <div
                  key={slot}
                  className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 flex items-center gap-2 shadow-2xs"
                >
                  <Clock className="w-3.5 h-3.5 text-[#1560AA]" />
                  <span>{slot}</span>
                  <button
                    onClick={() => deleteCoffeeSlot(slot)}
                    className="text-slate-400 hover:text-red-600 transition-colors p-0.5"
                    title="Удалить слот"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Coffee Registrations Roster (ADMIN ONLY) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-base font-black text-slate-900 flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#1560AA]" />
                  <span>Реестр записанных сотрудников на Random Coffee ({coffeeRegistrations.length})</span>
                </h2>
                <p className="text-xs text-slate-500 mt-1">
                  Данная информация доступна ТОЛЬКО администраторам платформы Colvir.
                </p>
              </div>
            </div>

            {coffeeRegistrations.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Coffee className="w-10 h-10 mx-auto text-slate-300" />
                <p className="text-xs font-medium">Записей на кофе-брейк пока нет.</p>
              </div>
            ) : (
              <div className="overflow-x-auto border border-slate-200 rounded-2xl">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-500 font-bold uppercase tracking-wider">
                    <tr>
                      <th className="p-3">Сотрудник</th>
                      <th className="p-3">Департамент</th>
                      <th className="p-3">Выбранный слот</th>
                      <th className="p-3">Рабочий Email</th>
                      <th className="p-3 text-right">Действие</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {coffeeRegistrations.map((p) => (
                      <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900">
                          {p.lastName} {p.firstName}
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          {p.department || '—'}
                        </td>
                        <td className="p-3 font-extrabold text-[#1560AA]">
                          {p.timeSlot || '—'}
                        </td>
                        <td className="p-3 text-slate-500 font-medium">
                          {p.email}
                        </td>
                        <td className="p-3 text-right">
                          <button
                            onClick={() => cancelRegistration(p.id)}
                            className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] rounded-lg transition-colors"
                          >
                            Отменить
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* TAB 4: ANALYTICS & EVENT RATINGS (1-10) */}
      {activeTab === 'analytics' && (
        <div className="space-y-6 animate-fadeIn">
          
          {/* Top KPI Metric Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Посещаемость платформы
                </span>
                <div className="p-2 bg-blue-50 text-[#1560AA] rounded-xl">
                  <Activity className="w-5 h-5 text-[#1560AA]" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">1,420</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                  <TrendingUp className="w-3 h-3 text-emerald-600" />
                  +18% / мес.
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Активных пользователей Colvir Portal
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Посещаемость мероприятий
                </span>
                <div className="p-2 bg-blue-50 text-[#1560AA] rounded-xl">
                  <Users className="w-5 h-5 text-[#1560AA]" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">{participants.length}</span>
                <span className="text-xs font-bold text-[#1560AA]">
                  Явка: 91.5%
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                Подтвержденных записей сотрудников
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Средняя оценка (1-10)
                </span>
                <div className="p-2 bg-blue-50 text-[#1560AA] rounded-xl">
                  <Star className="w-5 h-5 text-[#1560AA]" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-[#1560AA]">
                  {ratings.length > 0
                    ? (ratings.reduce((sum, r) => sum + r.rating, 0) / ratings.length).toFixed(1)
                    : '9.4'}
                </span>
                <span className="text-xs font-bold text-slate-500">
                  / 10
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                На основе {ratings.length} оценок от участников
              </p>
            </div>

            <div className="bg-white rounded-2xl p-5 border border-slate-200/80 shadow-2xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  Синхронизация AD
                </span>
                <div className="p-2 bg-emerald-50 text-emerald-700 rounded-xl">
                  <CheckCircle2 className="w-5 h-5 text-emerald-600" />
                </div>
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl font-black text-slate-900">100%</span>
                <span className="text-xs font-bold text-emerald-700">COLVIR.COM</span>
              </div>
              <p className="text-[11px] text-slate-400">
                Интеграция с корпоративной связкой Active Directory
              </p>
            </div>

          </div>

          {/* Section 1: Event Attendance & Occupancy Table */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-[#1560AA]" />
                  <span>Посещаемость и заполняемость по мероприятиям</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Метрики активности, количество участников и средние оценки по каждому событию
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-slate-50 text-slate-500 uppercase font-extrabold border-b border-slate-200 text-[10px] tracking-wider">
                    <th className="p-3">Мероприятие</th>
                    <th className="p-3">Категория</th>
                    <th className="p-3">Записано / Макс</th>
                    <th className="p-3">Заполняемость (%)</th>
                    <th className="p-3">Средняя оценка (1-10)</th>
                    <th className="p-3 text-right">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((evt) => {
                    const evtParticipants = getParticipantsForEvent(evt.id);
                    const occupancy = Math.round((evtParticipants.length / evt.maxParticipants) * 100);
                    const avgRating = getEventAverageRating(evt.id);
                    const evtRatingsCount = ratings.filter((r) => r.eventId === evt.id).length;

                    return (
                      <tr key={evt.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-3 font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="w-2 h-2 rounded-full bg-[#1560AA]" />
                            <span>{evt.title}</span>
                          </div>
                        </td>
                        <td className="p-3 text-slate-600 font-medium">
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded-md font-bold text-[10px]">
                            {evt.category}
                          </span>
                        </td>
                        <td className="p-3 font-bold text-slate-900">
                          {evtParticipants.length} / {evt.maxParticipants} чел
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-2">
                            <div className="w-24 bg-slate-100 h-2 rounded-full overflow-hidden">
                              <div
                                className="bg-[#1560AA] h-full rounded-full transition-all duration-500"
                                style={{ width: `${Math.min(occupancy, 100)}%` }}
                              />
                            </div>
                            <span className="font-extrabold text-slate-800 text-[11px]">
                              {occupancy}%
                            </span>
                          </div>
                        </td>
                        <td className="p-3">
                          <div className="flex items-center gap-1">
                            <Star className="w-3.5 h-3.5 text-[#1560AA] fill-[#1560AA]" />
                            <span className="font-black text-[#1560AA] text-xs">
                              {avgRating > 0 ? `${avgRating} / 10` : '—'}
                            </span>
                            <span className="text-[10px] text-slate-400">({evtRatingsCount})</span>
                          </div>
                        </td>
                        <td className="p-3 text-right">
                          <span
                            className={`px-2 py-0.5 rounded-md font-bold text-[10px] ${
                              occupancy >= 100
                                ? 'bg-slate-100 text-slate-700'
                                : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            }`}
                          >
                            {occupancy >= 100 ? 'Группа заполнена' : 'Открыта запись'}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* Section 2: Detailed Ratings Feed & Employee Feedback (1 to 10 Scale) */}
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <MessageSquare className="w-5 h-5 text-[#1560AA]" />
                  <span>Оценки и отзывы сотрудников (Шкала от 1 до 10)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Обратная связь от участников мероприятий в реальном времени
                </p>
              </div>
              <span className="px-3 py-1 bg-blue-50 text-[#1560AA] font-extrabold text-xs rounded-xl border border-blue-100">
                Всего отзывов: {ratings.length}
              </span>
            </div>

            {ratings.length === 0 ? (
              <div className="text-center py-8 text-slate-400 text-xs italic">
                Оценок пока не поступило. Участники смогут оценить мероприятие от 1 до 10 после посещения.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {ratings.map((r) => (
                  <div
                    key={r.id}
                    className="p-4 bg-slate-50/70 border border-slate-200 rounded-2xl space-y-2 hover:bg-slate-50 transition-all"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-bold text-slate-900 text-xs">{r.userName}</h4>
                        <p className="text-[10px] text-slate-500">{r.userEmail}</p>
                      </div>
                      <div className="px-2.5 py-1 bg-[#1560AA] text-white font-black text-xs rounded-lg shadow-2xs flex items-center gap-1">
                        <Star className="w-3 h-3 text-white fill-white" />
                        <span>{r.rating} / 10</span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-800 font-semibold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#1560AA]" />
                      <span>{r.eventTitle}</span>
                    </div>

                    {r.comment ? (
                      <p className="text-xs text-slate-600 italic bg-white p-2.5 rounded-xl border border-slate-200/60 leading-relaxed">
                        "{r.comment}"
                      </p>
                    ) : (
                      <p className="text-[11px] text-slate-400 italic">Без текстового комментария</p>
                    )}

                    <div className="text-[10px] text-slate-400 text-right pt-1">
                      {r.timestamp}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}

      <EditEventModal
        event={editingEvent}
        isOpen={Boolean(editingEvent)}
        onClose={() => setEditingEvent(null)}
      />

    </div>
  );
};
