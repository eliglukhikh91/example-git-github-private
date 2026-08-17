import * as XLSX from 'xlsx';
import { Participant, EventItem, Team } from '../types';
import { formatMoscowDateTime } from './timeUtils';

export function exportTeamsToExcel(
  participants: Participant[],
  events: EventItem[],
  selectedEventId?: string,
  fileNamePrefix: string = 'Colvir_Teams_List'
) {
  // Filter participants if specific event selected
  const filteredParticipants = selectedEventId
    ? participants.filter((p) => p.eventId === selectedEventId && p.status !== 'cancelled')
    : participants.filter((p) => p.status !== 'cancelled');

  const eventMap = new Map(events.map((e) => [e.id, e]));

  // Sheet 1: Detailed Participants Table
  const tableData = filteredParticipants.map((p, index) => {
    const event = eventMap.get(p.eventId);
    return {
      '№': index + 1,
      'Мероприятие': event?.title || 'Не указано',
      'Тип мероприятия': p.isTeamGame ? 'Командная игра' : 'Индивидуальное / Клуб',
      'Название команды': p.teamName || '—',
      'Роль в команде': p.role === 'captain' ? 'Капитан' : p.role === 'player' ? 'Игрок' : '—',
      'Фамилия': p.lastName,
      'Имя': p.firstName,
      'ФИО': `${p.lastName} ${p.firstName}`,
      'Отдел': p.department || '—',
      'Email': p.email,
      'Telegram': p.telegram || '—',
      'Слот времени': p.timeSlot || '—',
      'Статус': p.status === 'confirmed' ? 'Подтверждено' : 'В ожидании',
      'Дата и время записи': formatMoscowDateTime(p.registeredAt)
    };
  });

  // Sheet 2: Summary by Teams
  const teamMap = new Map<string, { eventTitle: string; teamName: string; captain: string; membersCount: number; membersList: string }>();
  
  filteredParticipants.forEach((p) => {
    if (p.isTeamGame && p.teamName) {
      const key = `${p.eventId}_${p.teamName}`;
      const event = eventMap.get(p.eventId);
      const existing = teamMap.get(key) || {
        eventTitle: event?.title || '',
        teamName: p.teamName,
        captain: 'Не назначен',
        membersCount: 0,
        membersList: ''
      };

      existing.membersCount += 1;
      const memberFullName = `${p.lastName} ${p.firstName} (${p.role === 'captain' ? 'Капитан' : 'Игрок'})`;
      existing.membersList = existing.membersList ? `${existing.membersList}, ${memberFullName}` : memberFullName;
      if (p.role === 'captain') {
        existing.captain = `${p.lastName} ${p.firstName} (${p.email})`;
      }
      teamMap.set(key, existing);
    }
  });

  const teamSummaryData = Array.from(teamMap.values()).map((t, idx) => ({
    '№': idx + 1,
    'Мероприятие': t.eventTitle,
    'Название команды': t.teamName,
    'Капитан команды': t.captain,
    'Количество участников': t.membersCount,
    'Состав команды': t.membersList
  }));

  const wb = XLSX.utils.book_new();

  const wsParticipants = XLSX.utils.json_to_sheet(tableData);
  XLSX.utils.book_append_sheet(wb, wsParticipants, 'Все участники');

  if (teamSummaryData.length > 0) {
    const wsTeams = XLSX.utils.json_to_sheet(teamSummaryData);
    XLSX.utils.book_append_sheet(wb, wsTeams, 'Сформированные команды');
  }

  const dateStr = new Date().toISOString().slice(0, 10);
  const fileName = `${fileNamePrefix}_${dateStr}.xlsx`;

  XLSX.writeFile(wb, fileName);
}

export function exportTeamsToCSV(
  participants: Participant[],
  events: EventItem[],
  selectedEventId?: string,
  fileNamePrefix: string = 'Colvir_Teams_List'
) {
  const filteredParticipants = selectedEventId
    ? participants.filter((p) => p.eventId === selectedEventId && p.status !== 'cancelled')
    : participants.filter((p) => p.status !== 'cancelled');

  const eventMap = new Map(events.map((e) => [e.id, e]));

  const headers = ['№', 'Мероприятие', 'Тип', 'Команда', 'Роль', 'Фамилия', 'Имя', 'Отдел', 'Email', 'Telegram', 'Время', 'Статус', 'Зарегистрирован'];

  const rows = filteredParticipants.map((p, index) => {
    const event = eventMap.get(p.eventId);
    return [
      index + 1,
      `"${(event?.title || '').replace(/"/g, '""')}"`,
      `"${p.isTeamGame ? 'Командная игра' : 'Индивидуальное'}"`,
      `"${(p.teamName || '—').replace(/"/g, '""')}"`,
      `"${p.role === 'captain' ? 'Капитан' : p.role === 'player' ? 'Игрок' : '—'}"`,
      `"${p.lastName.replace(/"/g, '""')}"`,
      `"${p.firstName.replace(/"/g, '""')}"`,
      `"${(p.department || '—').replace(/"/g, '""')}"`,
      `"${p.email.replace(/"/g, '""')}"`,
      `"${(p.telegram || '—').replace(/"/g, '""')}"`,
      `"${(p.timeSlot || '—').replace(/"/g, '""')}"`,
      `"${p.status === 'confirmed' ? 'Подтверждено' : 'В ожидании'}"`,
      `"${formatMoscowDateTime(p.registeredAt)}"`
    ].join(';');
  });

  const csvContent = '\uFEFF' + [headers.join(';'), ...rows].join('\n');
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  const dateStr = new Date().toISOString().slice(0, 10);
  link.setAttribute('download', `${fileNamePrefix}_${dateStr}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
