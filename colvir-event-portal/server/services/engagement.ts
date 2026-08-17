import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { sanitizePlainText } from '../utils/sanitize.js';

// ---------------------------------------------------------------------------
// Уведомления администраторам
// ---------------------------------------------------------------------------

export interface NotificationDto {
  id: string;
  eventId: string | null;
  eventTitle: string;
  participantName: string;
  isTeamGame: boolean;
  teamName?: string;
  role?: string;
  timeSlot?: string;
  timestamp: string;
  read: boolean;
  type: string;
  messageText?: string;
}

interface NotificationRow {
  id: string;
  event_id: string | null;
  event_title: string;
  participant_name: string;
  is_team_game: boolean;
  team_name: string | null;
  role: string | null;
  time_slot: string | null;
  created_at: Date;
  read: boolean;
  type: string;
  message_text: string | null;
}

function toNotification(row: NotificationRow): NotificationDto {
  return {
    id: row.id,
    eventId: row.event_id,
    eventTitle: row.event_title,
    participantName: row.participant_name,
    isTeamGame: row.is_team_game,
    teamName: row.team_name ?? undefined,
    role: row.role ?? undefined,
    timeSlot: row.time_slot ?? undefined,
    timestamp: row.created_at.toISOString(),
    read: row.read,
    type: row.type,
    messageText: row.message_text ?? undefined
  };
}

const NOTIFICATION_COLUMNS = `
  id, event_id, event_title, participant_name, is_team_game, team_name, role,
  time_slot, created_at, read, type, message_text
`;

export async function listNotifications(limit = 200): Promise<NotificationDto[]> {
  const { rows } = await query<NotificationRow>(
    `SELECT ${NOTIFICATION_COLUMNS} FROM notifications ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows.map(toNotification);
}

export interface NotificationInput {
  eventId?: string | null;
  eventTitle?: string;
  participantName?: string;
  isTeamGame?: boolean;
  teamName?: string;
  role?: string;
  timeSlot?: string;
  type?: string;
  messageText?: string;
}

export async function createNotification(input: NotificationInput): Promise<NotificationDto> {
  const id = `notif-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const { rows } = await query<NotificationRow>(
    `INSERT INTO notifications (id, event_id, event_title, participant_name, is_team_game,
                                team_name, role, time_slot, type, message_text)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING ${NOTIFICATION_COLUMNS}`,
    [
      id,
      input.eventId ?? null,
      sanitizePlainText(input.eventTitle ?? '').slice(0, 300),
      sanitizePlainText(input.participantName ?? '').slice(0, 200),
      Boolean(input.isTeamGame),
      input.teamName ? sanitizePlainText(input.teamName).slice(0, 120) : null,
      input.role ? sanitizePlainText(input.role).slice(0, 60) : null,
      input.timeSlot ? sanitizePlainText(input.timeSlot).slice(0, 100) : null,
      sanitizePlainText(input.type ?? 'registration').slice(0, 40),
      input.messageText ? sanitizePlainText(input.messageText).slice(0, 2000) : null
    ]
  );
  return toNotification(rows[0]);
}

export async function markNotificationRead(id: string): Promise<boolean> {
  const { rowCount } = await query('UPDATE notifications SET read = true WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function markAllNotificationsRead(): Promise<number> {
  const { rowCount } = await query('UPDATE notifications SET read = true WHERE read = false');
  return rowCount ?? 0;
}

// ---------------------------------------------------------------------------
// Оценки мероприятий
// ---------------------------------------------------------------------------

export interface RatingDto {
  id: string;
  eventId: string;
  eventTitle: string;
  userEmail: string;
  userName: string;
  rating: number;
  comment?: string;
  timestamp: string;
}

interface RatingRow {
  id: string;
  event_id: string;
  event_title: string;
  user_email: string;
  user_name: string;
  rating: number;
  comment: string | null;
  created_at: Date;
}

function toRating(row: RatingRow): RatingDto {
  return {
    id: row.id,
    eventId: row.event_id,
    eventTitle: row.event_title,
    userEmail: row.user_email,
    userName: row.user_name,
    rating: row.rating,
    comment: row.comment ?? undefined,
    timestamp: row.created_at.toISOString()
  };
}

const RATING_COLUMNS = `id, event_id, event_title, user_email, user_name, rating, comment, created_at`;

export async function listRatings(): Promise<RatingDto[]> {
  const { rows } = await query<RatingRow>(
    `SELECT ${RATING_COLUMNS} FROM ratings ORDER BY created_at DESC`
  );
  return rows.map(toRating);
}

/**
 * Оценка привязана к сотруднику, а не к произвольному email из формы:
 * автор берётся из сессии, повторная отправка обновляет прежнюю оценку.
 */
export async function upsertRating(input: {
  eventId: string;
  rating: number;
  comment?: string;
  userEmail: string;
  userName: string;
}): Promise<RatingDto> {
  const id = `rate-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const { rows } = await query<RatingRow>(
    `INSERT INTO ratings (id, event_id, event_title, user_email, user_name, rating, comment)
     VALUES ($1, $2, COALESCE((SELECT title FROM events WHERE id = $2), ''), $3, $4, $5, $6)
     ON CONFLICT (event_id, lower(user_email)) DO UPDATE SET
       rating = EXCLUDED.rating,
       comment = EXCLUDED.comment,
       user_name = EXCLUDED.user_name,
       created_at = now()
     RETURNING ${RATING_COLUMNS}`,
    [
      id,
      input.eventId,
      input.userEmail.toLowerCase(),
      sanitizePlainText(input.userName).slice(0, 200),
      input.rating,
      input.comment ? sanitizePlainText(input.comment).slice(0, 2000) : null
    ]
  );
  return toRating(rows[0]);
}

// ---------------------------------------------------------------------------
// Праздничный чат
// ---------------------------------------------------------------------------

export interface HolidayMessageDto {
  id: string;
  author: string;
  department: string;
  text: string;
  time: string;
}

interface HolidayMessageRow {
  id: string;
  author: string;
  department: string;
  text: string;
  created_at: Date;
}

function toHolidayMessage(row: HolidayMessageRow): HolidayMessageDto {
  return {
    id: row.id,
    author: row.author,
    department: row.department,
    text: row.text,
    time: row.created_at.toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Moscow'
    })
  };
}

export async function listHolidayMessages(limit = 200): Promise<HolidayMessageDto[]> {
  const { rows } = await query<HolidayMessageRow>(
    `SELECT id, author, department, text, created_at
     FROM (
       SELECT id, author, department, text, created_at
       FROM holiday_chat_messages ORDER BY created_at DESC LIMIT $1
     ) recent
     ORDER BY created_at ASC`,
    [limit]
  );
  return rows.map(toHolidayMessage);
}

export async function addHolidayMessage(input: {
  userId: string;
  author: string;
  department: string;
  text: string;
}): Promise<HolidayMessageDto> {
  const id = `hchat-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  const { rows } = await query<HolidayMessageRow>(
    `INSERT INTO holiday_chat_messages (id, user_id, author, department, text)
     VALUES ($1,$2,$3,$4,$5)
     RETURNING id, author, department, text, created_at`,
    [
      id,
      input.userId,
      sanitizePlainText(input.author).slice(0, 200),
      sanitizePlainText(input.department).slice(0, 200),
      sanitizePlainText(input.text).slice(0, 2000)
    ]
  );
  return toHolidayMessage(rows[0]);
}
