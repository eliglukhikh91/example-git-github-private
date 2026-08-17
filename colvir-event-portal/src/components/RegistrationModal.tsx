import React, { useState } from 'react';
import { EventItem, Participant } from '../types';
import { useApp } from '../context/AppContext';
import { formatMoscowDateTime } from '../utils/timeUtils';
import {
  X,
  CheckCircle2,
  Users,
  ShieldCheck,
  Clock,
  Calendar,
  Sparkles,
  Download,
  ArrowRight,
  UserCheck,
  Building,
  Gamepad2,
  ChevronDown,
  Crown
} from 'lucide-react';

interface RegistrationModalProps {
  event: EventItem | null;
  onClose: () => void;
  onNavigateToTeams?: () => void;
}

export const RegistrationModal: React.FC<RegistrationModalProps> = ({
  event,
  onClose,
  onNavigateToTeams
}) => {
  const { registerForEvent, userProfile, getTeamsForEvent } = useApp();

  if (!event) return null;

  const existingTeams = getTeamsForEvent(event.id);

  // Form states
  const [lastName, setLastName] = useState(userProfile.lastName || '');
  const [firstName, setFirstName] = useState(userProfile.firstName || '');
  // Email не редактируется: он приходит из учётной записи Active Directory.
  const email = userProfile.email;
  const [telegram, setTelegram] = useState(userProfile.telegram || '');
  const [department, setDepartment] = useState(userProfile.department || '');
  const [selectedTimeSlot, setSelectedTimeSlot] = useState(event.timeSlots[0] || '');

  // Team game states
  const [teamSelectionMode, setTeamSelectionMode] = useState<'new' | 'existing'>(
    existingTeams.length > 0 ? 'existing' : 'new'
  );
  const [selectedTeamName, setSelectedTeamName] = useState(
    existingTeams[0]?.name || ''
  );
  const [newTeamName, setNewTeamName] = useState('');
  const [role, setRole] = useState<'captain' | 'player'>('player');

  // Registration result
  const [completedParticipant, setCompletedParticipant] = useState<Participant | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showIdentityFields, setShowIdentityFields] = useState(false);

  const initials = `${lastName.charAt(0)}${firstName.charAt(0)}`.toUpperCase() || '—';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!lastName.trim() || !firstName.trim()) {
      setErrorMsg('Пожалуйста, заполните имя и фамилию.');
      return;
    }

    let finalTeamName = '';
    if (event.isTeamGame) {
      if (teamSelectionMode === 'existing') {
        if (!selectedTeamName) {
          setErrorMsg('Выберите команду из списка или создайте новую.');
          return;
        }
        finalTeamName = selectedTeamName;
      } else {
        if (!newTeamName.trim()) {
          setErrorMsg('Введите название новой команды.');
          return;
        }
        finalTeamName = newTeamName.trim();
      }
    }

    setIsSubmitting(true);
    try {
      // Email не передаётся из формы: сервер берёт его из сессии Active Directory,
      // иначе можно было бы записать на мероприятие любого сотрудника.
      const participant = await registerForEvent({
        eventId: event.id,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        telegram: telegram.trim(),
        department: department.trim(),
        timeSlot: selectedTimeSlot,
        teamName: event.isTeamGame ? finalTeamName : undefined,
        role: event.isTeamGame ? role : undefined
      });

      setCompletedParticipant(participant);
    } catch (err: any) {
      setErrorMsg(err.message || 'Ошибка при регистрации. Попробуйте еще раз.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDownloadTicket = () => {
    if (!completedParticipant) return;
    const content = `
===================================================
     COLVIR EVENTS — ПОДТВЕРЖДЕНИЕ УЧАСТИЯ
===================================================
Мероприятие: ${event.title}
Дата: ${event.date}
Время: ${completedParticipant.timeSlot || event.timeSlots[0] || '10:00'}
Место: ${event.location}

УЧАСТНИК:
ФИО: ${completedParticipant.lastName} ${completedParticipant.firstName}
Отдел: ${completedParticipant.department || '—'}
Email: ${completedParticipant.email}
Telegram: ${completedParticipant.telegram || '—'}

${
  event.isTeamGame
    ? `КОМАНДНАЯ ИГРА:
Команда: ${completedParticipant.teamName}
Роль: ${completedParticipant.role === 'captain' ? 'Капитан команды' : 'Игрок'}`
    : ''
}

Статус: ПОДТВЕРЖДЕНО
Код билета: ${completedParticipant.id}
Зарегистрирован: ${formatMoscowDateTime(completedParticipant.registeredAt)}
===================================================
`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `Pass_${event.id}_${completedParticipant.lastName}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col relative">
        
        {/* Header bar */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div>
            <span className="text-xs font-extrabold uppercase text-[#1560AA] tracking-wider">
              {event.isTeamGame ? 'Командное мероприятие' : 'Индивидуальная запись'}
            </span>
            <h2 className="text-xl font-bold text-slate-900 line-clamp-1">
              {event.title}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6">
          
          {/* CONFIRMATION SCREEN IF COMPLETED */}
          {completedParticipant ? (
            <div className="text-center py-4 space-y-6 animate-scaleUp">
              
              {/* Checkmark Icon */}
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto shadow-inner ring-8 ring-emerald-50">
                <CheckCircle2 className="w-10 h-10 stroke-[2.5]" />
              </div>

              <div className="space-y-1">
                <h3 className="text-2xl font-black text-slate-900">
                  Участие подтверждено!
                </h3>
                <p className="text-sm text-slate-600">
                  Вы успешно записались на событие. Ниже представлены детали вашей записи.
                </p>
              </div>

              {/* Status Confirmation Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-left space-y-3 shadow-xs">
                
                <div className="flex items-center justify-between border-b border-slate-200/80 pb-3">
                  <div className="text-xs text-slate-500">Статус регистрации:</div>
                  <span className="inline-flex items-center gap-1 px-3 py-1 bg-emerald-500 text-white text-xs font-bold rounded-lg">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Подтверждено
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div>
                    <span className="text-slate-500 block">Участник:</span>
                    <strong className="text-slate-900 font-semibold text-sm">
                      {completedParticipant.lastName} {completedParticipant.firstName}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Отдел:</span>
                    <strong className="text-slate-800 font-medium">
                      {completedParticipant.department || '—'}
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Дата и время:</span>
                    <strong className="text-slate-800 font-medium">
                      {event.date} ({completedParticipant.timeSlot || 'По графику'})
                    </strong>
                  </div>

                  <div>
                    <span className="text-slate-500 block">Место проведения:</span>
                    <strong className="text-slate-800 font-medium">
                      {event.location}
                    </strong>
                  </div>
                </div>

                {/* Team Info if Team Game */}
                {completedParticipant.isTeamGame && (
                  <div className="mt-3 pt-3 border-t border-slate-200/80 bg-[#f0f6fc] p-3 rounded-xl border border-[#1560AA]/20 flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-[#1560AA] font-bold uppercase block">
                        Сформированная команда:
                      </span>
                      <span className="text-sm font-extrabold text-slate-900">
                        {completedParticipant.teamName}
                      </span>
                    </div>
                    <span className="px-2.5 py-1 bg-[#1560AA] text-white text-xs font-bold rounded-lg flex items-center gap-1.5">
                      {completedParticipant.role === 'captain' ? (
                        <Crown className="w-3.5 h-3.5" />
                      ) : (
                        <UserCheck className="w-3.5 h-3.5" />
                      )}
                      {completedParticipant.role === 'captain' ? 'Капитан' : 'Игрок'}
                    </span>
                  </div>
                )}

              </div>

              {/* Action Buttons */}
              <div className="space-y-2 pt-2">
                <button
                  onClick={handleDownloadTicket}
                  className="w-full py-3 px-4 bg-slate-900 hover:bg-slate-800 text-white text-sm font-bold rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  <span>Скачать подтверждение (TXT / Пропуск)</span>
                </button>

                {event.isTeamGame && onNavigateToTeams && (
                  <button
                    onClick={() => {
                      onClose();
                      onNavigateToTeams();
                    }}
                    className="w-full py-3 px-4 bg-[#f0f6fc] border border-[#1560AA]/30 text-[#1560AA] text-sm font-bold rounded-xl hover:bg-[#1560AA] hover:text-white transition-all flex items-center justify-center gap-2"
                  >
                    <span>Смотреть состав всех команд</span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={onClose}
                  className="w-full py-2.5 text-xs text-slate-500 hover:text-slate-800 font-semibold"
                >
                  Закрыть окно
                </button>
              </div>

            </div>
          ) : (
            
            /* REGISTRATION FORM */
            <form onSubmit={handleSubmit} className="space-y-5">
              
              {errorMsg && (
                <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-xl">
                  {errorMsg}
                </div>
              )}

              {/* Данные сотрудника: сводка вместо повторного ввода.
                  ФИО, email и отдел уже известны из Active Directory, поэтому
                  поля разворачиваются только по кнопке «Изменить». */}
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-3">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-[#1560AA] text-white flex items-center justify-center text-xs font-black shrink-0">
                    {initials}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-bold text-slate-900 truncate">
                      {lastName} {firstName}
                    </div>
                    <div className="text-xs text-slate-500 truncate">
                      {[email, department].filter(Boolean).join(' · ')}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowIdentityFields((prev) => !prev)}
                    aria-expanded={showIdentityFields}
                    className="shrink-0 px-3 py-1.5 text-xs font-bold text-[#1560AA] hover:bg-white rounded-lg transition-colors flex items-center gap-1"
                  >
                    <span>Изменить</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 transition-transform ${showIdentityFields ? 'rotate-180' : ''}`}
                    />
                  </button>
                </div>

                {showIdentityFields && (
                  <div className="mt-3 pt-3 border-t border-slate-200 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Фамилия <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={lastName}
                          onChange={(e) => setLastName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-[#1560AA] focus:ring-2 focus:ring-[#1560AA]/20 outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Имя <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          required
                          value={firstName}
                          onChange={(e) => setFirstName(e.target.value)}
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-[#1560AA] focus:ring-2 focus:ring-[#1560AA]/20 outline-hidden"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Рабочий Email (из Active Directory)
                        </label>
                        <input
                          type="email"
                          readOnly
                          disabled
                          value={email}
                          className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm text-slate-600 cursor-not-allowed outline-hidden"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Telegram (необязательно)
                        </label>
                        <input
                          type="text"
                          value={telegram}
                          onChange={(e) => setTelegram(e.target.value)}
                          placeholder="@username"
                          className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-[#1560AA] focus:ring-2 focus:ring-[#1560AA]/20 outline-hidden"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Отдел / Департамент
                      </label>
                      <input
                        type="text"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm focus:border-[#1560AA] focus:ring-2 focus:ring-[#1560AA]/20 outline-hidden"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Time Slot Selection */}
              {event.timeSlots.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <div className="flex items-center justify-between">
                    <label className="block text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Clock className="w-4 h-4 text-[#1560AA]" />
                      Выберите удобное время (Московское время)
                    </label>
                    <span className="px-2 py-0.5 bg-blue-100 text-[#1560AA] text-[10px] font-black rounded uppercase">
                      МСК / UTC+3
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {event.timeSlots.map((slot) => {
                      const displaySlot = slot.includes('МСК') ? slot : `${slot} (МСК)`;
                      return (
                        <button
                          type="button"
                          key={slot}
                          onClick={() => setSelectedTimeSlot(slot)}
                          className={`p-3 rounded-xl border text-xs font-semibold transition-all text-left flex items-center justify-between ${
                            selectedTimeSlot === slot
                              ? 'bg-[#f0f6fc] border-[#1560AA] text-[#1560AA] ring-1 ring-[#1560AA]'
                              : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                          }`}
                        >
                          <span>{displaySlot}</span>
                          {selectedTimeSlot === slot && <CheckCircle2 className="w-4 h-4 text-[#1560AA]" />}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* TEAM GAME SPECIFIC FIELDS */}
              {event.isTeamGame && (
                <div className="space-y-4 pt-3 border-t border-slate-100 bg-[#f0f6fc]/60 p-4 rounded-2xl border border-[#1560AA]/20">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-[#1560AA] uppercase tracking-wider flex items-center gap-1.5">
                      <Gamepad2 className="w-4 h-4 text-[#1560AA]" />
                      Командная игра: Настройки команды
                    </h4>
                    <span className="text-[11px] font-semibold text-slate-500">
                      до {event.maxTeamSize || 5} участников
                    </span>
                  </div>

                  {/* Mode selector: existing or new */}
                  <div className="grid grid-cols-2 gap-2">
                    {existingTeams.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setTeamSelectionMode('existing')}
                        className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                          teamSelectionMode === 'existing'
                            ? 'bg-white border-[#1560AA] text-[#1560AA] shadow-xs'
                            : 'bg-slate-100/80 border-transparent text-slate-600'
                        }`}
                      >
                        Вступить в существующую
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={() => setTeamSelectionMode('new')}
                      className={`py-2 px-3 text-xs font-bold rounded-xl border transition-all ${
                        teamSelectionMode === 'new'
                          ? 'bg-white border-[#1560AA] text-[#1560AA] shadow-xs'
                          : 'bg-slate-100/80 border-transparent text-slate-600'
                      }`}
                    >
                      + Создать новую команду
                    </button>
                  </div>

                  {/* Existing Teams Dropdown */}
                  {teamSelectionMode === 'existing' && existingTeams.length > 0 ? (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Выберите сформированную команду:
                      </label>
                      <select
                        value={selectedTeamName}
                        onChange={(e) => setSelectedTeamName(e.target.value)}
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold text-slate-800 focus:border-[#1560AA] outline-hidden"
                      >
                        {existingTeams.map((t) => (
                          <option key={t.id} value={t.name}>
                            {t.name} ({t.members.length} участн. — Капитан: {t.captainName || 'Не указан'})
                          </option>
                        ))}
                      </select>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Название вашей новой команды <span className="text-red-500">*</span>
                      </label>
                      <input
                        type="text"
                        value={newTeamName}
                        onChange={(e) => setNewTeamName(e.target.value)}
                        placeholder="Например: Альфа-Разработка"
                        className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-semibold focus:border-[#1560AA] focus:ring-2 focus:ring-[#1560AA]/20 outline-hidden"
                      />
                    </div>
                  )}

                  {/* Role Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                      Ваша роль в этой команде:
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setRole('captain')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          role === 'captain'
                            ? 'bg-[#1560AA] border-[#1560AA] text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Crown className="w-4 h-4" />
                        <span>Капитан</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setRole('player')}
                        className={`p-3 rounded-xl border text-xs font-bold transition-all flex items-center justify-center gap-2 ${
                          role === 'player'
                            ? 'bg-[#1560AA] border-[#1560AA] text-white shadow-xs'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <UserCheck className="w-4 h-4" />
                        <span>Просто игрок</span>
                      </button>
                    </div>
                  </div>

                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-3.5 px-4 bg-[#1560AA] hover:bg-[#104d88] text-white font-bold text-sm rounded-xl shadow-md transition-all active:scale-98 flex items-center justify-center gap-2"
                >
                  <span>Подтвердить запись на мероприятие</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>

            </form>
          )}

        </div>

      </div>
    </div>
  );
};
