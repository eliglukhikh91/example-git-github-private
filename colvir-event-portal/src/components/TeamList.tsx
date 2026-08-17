import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { exportTeamsToExcel, exportTeamsToCSV } from '../utils/exportUtils';
import { formatMoscowDateTime, getMoscowShortDateString } from '../utils/timeUtils';
import {
  Users,
  Trophy,
  Download,
  Search,
  Crown,
  UserCheck,
  FileSpreadsheet,
  FileText,
  Calendar,
  Sparkles,
  Building2,
  Mail,
  Send,
  CheckCircle2
} from 'lucide-react';

export const TeamList: React.FC = () => {
  const { events, participants, getTeamsForEvent, getParticipantsForEvent } = useApp();

  const [selectedEventId, setSelectedEventId] = useState<string>(
    events[0]?.id || ''
  );
  const [searchTerm, setSearchTerm] = useState<string>('');

  const currentEvent = events.find((e) => e.id === selectedEventId) || events[0];
  const teams = currentEvent ? getTeamsForEvent(currentEvent.id) : [];
  const allParticipants = currentEvent ? getParticipantsForEvent(currentEvent.id) : [];

  // Filtered teams or participants by search term
  const filteredTeams = teams.filter((t) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    const nameMatch = t.name.toLowerCase().includes(term);
    const memberMatch = t.members.some(
      (m) =>
        m.lastName.toLowerCase().includes(term) ||
        m.firstName.toLowerCase().includes(term) ||
        m.department?.toLowerCase().includes(term)
    );
    return nameMatch || memberMatch;
  });

  const filteredSoloParticipants = allParticipants.filter((p) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      p.lastName.toLowerCase().includes(term) ||
      p.firstName.toLowerCase().includes(term) ||
      p.email.toLowerCase().includes(term) ||
      p.department?.toLowerCase().includes(term) ||
      p.timeSlot?.toLowerCase().includes(term)
    );
  });

  const handleExcelExport = () => {
    exportTeamsToExcel(
      participants,
      events,
      selectedEventId,
      currentEvent ? `Colvir_Teams_${currentEvent.title.replace(/\s+/g, '_')}` : 'Colvir_Teams'
    );
  };

  const handleCSVExport = () => {
    exportTeamsToCSV(
      participants,
      events,
      selectedEventId,
      currentEvent ? `Colvir_Teams_${currentEvent.title.replace(/\s+/g, '_')}` : 'Colvir_Teams'
    );
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      
      {/* Header & Event Switcher */}
      <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
        
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#f0f6fc] text-[#1560AA] text-xs font-extrabold uppercase tracking-wider mb-2">
              <Users className="w-3.5 h-3.5" />
              Мониторинг в реальном времени
            </div>
            <h2 className="text-2xl font-black text-slate-900 tracking-tight">
              Сформированные группы и участники
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Просматривайте текущий состав команд, капитанов и списки участников по каждому мероприятию.
            </p>
          </div>

          {/* Export Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handleExcelExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4" />
              <span>Скачать в Excel (.xlsx)</span>
            </button>

            <button
              onClick={handleCSVExport}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
            >
              <FileText className="w-4 h-4" />
              <span>Скачать в CSV (.csv)</span>
            </button>
          </div>
        </div>

        {/* Event Selection Tabs / Filter Bar */}
        <div className="space-y-3 pt-4 border-t border-slate-100">
          <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
            Выберите мероприятие:
          </label>
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none">
            {events.map((evt) => {
              const isActive = evt.id === selectedEventId;
              const evtParticipants = getParticipantsForEvent(evt.id);
              const evtTeams = getTeamsForEvent(evt.id);
              
              return (
                <button
                  key={evt.id}
                  onClick={() => setSelectedEventId(evt.id)}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-2xl text-xs font-bold whitespace-nowrap transition-all border ${
                    isActive
                      ? 'bg-[#1560AA] border-[#1560AA] text-white shadow-xs ring-2 ring-[#1560AA]/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <Calendar className="w-3.5 h-3.5" />
                  <span className="max-w-[200px] truncate">{evt.title}</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                      isActive ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-700'
                    }`}
                  >
                    {evt.isTeamGame ? `${evtTeams.length} команд` : `${evtParticipants.length} чел`}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Search Bar for Filtering Teams or Members */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Поиск по названию команды, фамилии капитана или участника, отделу..."
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:bg-white focus:border-[#1560AA] focus:ring-2 focus:ring-[#1560AA]/20 transition-all"
          />
        </div>

      </div>

      {/* TEAM GAME GROUPS DISPLAY */}
      {currentEvent?.isTeamGame ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between text-xs font-bold text-slate-600 px-1">
            <span>Сформировано команд: {filteredTeams.length}</span>
            <span>Всего игроков: {allParticipants.length}</span>
          </div>

          {filteredTeams.length === 0 ? (
            <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
              <Trophy className="w-12 h-12 text-slate-300 mx-auto" />
              <h3 className="text-base font-bold text-slate-800">
                Пока нет сформированных команд
              </h3>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                Будьте первыми! Запишитесь на мероприятие и создайте свою команду или предложите коллегам объединиться.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {filteredTeams.map((team) => {
                const captain = team.members.find((m) => m.role === 'captain');
                const players = team.members.filter((m) => m.role !== 'captain');

                return (
                  <div
                    key={team.id}
                    className="bg-white rounded-3xl border border-slate-200/80 shadow-xs hover:border-[#1560AA]/40 transition-all flex flex-col overflow-hidden"
                  >
                    {/* Team Header */}
                    <div className="p-5 bg-gradient-to-r from-[#f0f6fc] to-slate-50 border-b border-slate-100 flex items-center justify-between">
                      <div className="space-y-0.5">
                        <div className="text-[11px] font-bold text-[#1560AA] uppercase tracking-wider">
                          Команда
                        </div>
                        <h3 className="text-lg font-black text-slate-900 leading-tight">
                          {team.name}
                        </h3>
                      </div>
                      <span className="px-3 py-1 bg-[#1560AA] text-white text-xs font-extrabold rounded-xl shadow-2xs">
                        {team.members.length} / {currentEvent.maxTeamSize || 5} чел
                      </span>
                    </div>

                    {/* Team Members Content */}
                    <div className="p-5 space-y-4 flex-1">
                      
                      {/* Captain Card */}
                      {captain && (
                        <div className="bg-amber-50/80 border border-amber-200/80 rounded-2xl p-3.5 space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-extrabold uppercase text-amber-800 flex items-center gap-1">
                              <Crown className="w-3.5 h-3.5 text-amber-600" />
                              Капитан команды
                            </span>
                            <span className="text-[10px] text-amber-700 font-semibold flex items-center gap-1"><Crown className="w-3 h-3" />Капитан</span>
                          </div>
                          <div className="font-bold text-slate-900 text-sm">
                            {captain.lastName} {captain.firstName}
                          </div>
                          <div className="text-xs text-slate-600 flex flex-col gap-0.5 pt-1">
                            {captain.department && (
                              <span className="flex items-center gap-1">
                                <Building2 className="w-3 h-3 text-slate-400" />
                                {captain.department}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Mail className="w-3 h-3 text-slate-400" />
                              {captain.email}
                            </span>
                            {captain.telegram && (
                              <span className="flex items-center gap-1 text-[#1560AA] font-semibold">
                                <Send className="w-3 h-3" />
                                {captain.telegram}
                              </span>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Players List */}
                      <div className="space-y-2">
                        <div className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                          Состав игроков ({players.length}):
                        </div>

                        {players.length === 0 ? (
                          <div className="text-xs text-slate-400 italic py-1">
                            В команде пока только капитан.
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {players.map((m) => (
                              <div
                                key={m.id}
                                className="p-2.5 bg-slate-50 border border-slate-200/60 rounded-xl flex items-center justify-between text-xs"
                              >
                                <div>
                                  <div className="font-bold text-slate-800">
                                    {m.lastName} {m.firstName}
                                  </div>
                                  <div className="text-[11px] text-slate-500">
                                    {m.department || m.email}
                                  </div>
                                </div>
                                <span className="text-[10px] bg-slate-200 text-slate-700 px-2 py-0.5 font-bold rounded-md">
                                  Игрок
                                </span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>

                    </div>

                    <div className="px-5 py-3 bg-slate-50/80 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
                      <span>Дата создания: {getMoscowShortDateString(new Date(team.createdAt))}</span>
                      <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                    </div>

                  </div>
                );
              })}
            </div>
          )}

        </div>
      ) : (
        
        /* INDIVIDUAL / CLUB EVENT PARTICIPANTS TABLE */
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-xs overflow-hidden">
          <div className="p-5 border-b border-slate-100 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-900">
              Список зарегистрированных участников ({filteredSoloParticipants.length})
            </h3>
            <span className="text-xs text-slate-500">
              Лимит: {currentEvent?.maxParticipants} мест
            </span>
          </div>

          {filteredSoloParticipants.length === 0 ? (
            <div className="p-12 text-center text-slate-500 text-sm">
              На выбранное мероприятие пока нет записей.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead className="bg-slate-50 text-slate-500 font-bold uppercase tracking-wider border-b border-slate-200 text-[10px]">
                  <tr>
                    <th className="py-3.5 px-4">№</th>
                    <th className="py-3.5 px-4">Участник (ФИО)</th>
                    <th className="py-3.5 px-4">Отдел / Департамент</th>
                    <th className="py-3.5 px-4">Email / Telegram</th>
                    <th className="py-3.5 px-4">Слот времени</th>
                    <th className="py-3.5 px-4">Дата записи</th>
                    <th className="py-3.5 px-4">Статус</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredSoloParticipants.map((p, idx) => (
                    <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3.5 px-4 font-bold text-slate-400">{idx + 1}</td>
                      <td className="py-3.5 px-4 font-bold text-slate-900 text-sm">
                        {p.lastName} {p.firstName}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-600">
                        {p.department || '—'}
                      </td>
                      <td className="py-3.5 px-4 space-y-0.5">
                        <div className="font-semibold text-slate-800">{p.email}</div>
                        {p.telegram && (
                          <div className="text-[11px] text-[#1560AA] font-bold">
                            {p.telegram}
                          </div>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-bold text-[#1560AA]">
                        <span className="px-2.5 py-1 bg-[#f0f6fc] border border-[#1560AA]/20 rounded-lg">
                          {p.timeSlot || 'По графику'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-500">
                        {formatMoscowDateTime(p.registeredAt)}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 bg-emerald-100 text-emerald-800 font-bold rounded-lg text-[10px]">
                          Подтверждено
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

    </div>
  );
};
