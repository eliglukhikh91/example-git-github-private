import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { sanitizePlainText } from '../utils/sanitize.js';

// ---------------------------------------------------------------------------
// Уведомления администраторам
// ---------------------------------------------------------------------------

export type NotificationAudience = 'admin' | 'user';

export interface NotificationDto {
  id: string;
  audience: NotificationAudience;
  userId: string | null;
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
  audience: NotificationAudience;
  user_id: string | null;
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
    audience: row.audience,
    userId: row.user_id,
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
  id, audience, user_id, event_id, event_title, participant_name, is_team_game,
  team_name, role, time_slot, created_at, read, type, message_text
`;

/** Административная лента: события по всем сотрудникам. */
export async function listAdminNotifications(limit = 200): Promise<NotificationDto[]> {
  const { rows } = await query<NotificationRow>(
    `SELECT ${NOTIFICATION_COLUMNS} FROM notifications
     WHERE audience = 'admin'
     ORDER BY created_at DESC LIMIT $1`,
    [limit]
  );
  return rows.map(toNotification);
}

/**
 * Личная лента сотрудника.
 *
 * Появилась вместе с Random Coffee: сообщение «вам подобран коллега» адресовано
 * конкретному человеку, а раньше таблица обслуживала только администраторов —
 * поэтому участник о своей паре не узнавал.
 */
export async function listUserNotifications(
  userId: string,
  limit = 100
): Promise<NotificationDto[]> {
  const { rows } = await query<NotificationRow>(
    `SELECT ${NOTIFICATION_COLUMNS} FROM notifications
     WHERE audience = 'user' AND user_id = $1
     ORDER BY created_at DESC LIMIT $2`,
    [userId, limit]
  );
  return rows.map(toNotification);
}

export interface NotificationInput {
  audience?: NotificationAudience;
  userId?: string | null;
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
    `INSERT INTO notifications (id, audience, user_id, event_id, event_title, participant_name,
                                is_team_game, team_name, role, time_slot, type, message_text)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12)
     RETURNING ${NOTIFICATION_COLUMNS}`,
    [
      id,
      input.audience ?? 'admin',
      input.userId ?? null,
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

/**
 * Отметить прочитанным. Рядовой сотрудник может закрыть только своё уведомление —
 * иначе по перебору id можно было бы гасить чужие и административные.
 */
export async function markNotificationRead(
  id: string,
  requester: { userId: string; isAdmin: boolean }
): Promise<boolean> {
  const { rowCount } = await query(
    `UPDATE notifications SET read = true
     WHERE id = $1
       AND ( ($2::boolean AND audience = 'admin') OR (audience = 'user' AND user_id = $3) )`,
    [id, requester.isAdmin, requester.userId]
  );
  return (rowCount ?? 0) > 0;
}

export async function markAllNotificationsRead(requester: {
  userId: string;
  isAdmin: boolean;
}): Promise<number> {
  const { rowCount } = await query(
    `UPDATE notifications SET read = true
     WHERE read = false
       AND ( ($1::boolean AND audience = 'admin') OR (audience = 'user' AND user_id = $2) )`,
    [requester.isAdmin, requester.userId]
  );
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
// Чат
//
// Перестал быть «праздничным»: это постоянный раздел, не привязанный к темам.
// Каналы заведены сразу, хотя в интерфейсе пока один общий — иначе при переходе
// к группам по интересам пришлось бы менять схему и переносить сообщения.
// ---------------------------------------------------------------------------

export const DEFAULT_CHAT_CHANNEL = 'general';

export interface ChatChannelDto {
  id: string;
  name: string;
}

export async function listChatChannels(): Promise<ChatChannelDto[]> {
  const { rows } = await query<{ id: string; name: string }>(
    'SELECT id, name FROM chat_channels ORDER BY created_at, id'
  );
  return rows;
}

export interface ChatMessageDto {
  id: string;
  channelId: string;
  author: string;
  department: string;
  text: string;
  time: string;
}

interface ChatMessageRow {
  id: string;
  channel_id: string;
  author: string;
  department: string;
  text: string;
  created_at: Date;
}

function toChatMessage(row: ChatMessageRow): ChatMessageDto {
  return {
    id: row.id,
    channelId: row.channel_id,
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

export async function listChatMessages(
  channelId = DEFAULT_CHAT_CHANNEL,
  limit = 200
): Promise<ChatMessageDto[]> {
  const { rows } = await query<ChatMessageRow>(
    `SELECT id, channel_id, author, department, text, created_at
     FROM (
       SELECT id, channel_id, author, department, text, created_at
       FROM chat_messages
       WHERE channel_id = $1
       ORDER BY created_at DESC LIMIT $2
     ) recent
     ORDER BY created_at ASC`,
    [channelId, limit]
  );
  return rows.map(toChatMessage);
}

export async function sendChatMessage(input: {
  userId: string;
  author: string;
  department: string;
  text: string;
  channelId?: string;
}): Promise<ChatMessageDto> {
  const id = `msg-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
  const channelId = input.channelId ?? DEFAULT_CHAT_CHANNEL;

  const { rows: channel } = await query('SELECT 1 FROM chat_channels WHERE id = $1', [channelId]);
  if (channel.length === 0) {
    throw new Error(`Канал ${channelId} не найден`);
  }

  const { rows } = await query<ChatMessageRow>(
    `INSERT INTO chat_messages (id, channel_id, user_id, author, department, text)
     VALUES ($1,$2,$3,$4,$5,$6)
     RETURNING id, channel_id, author, department, text, created_at`,
    [
      id,
      channelId,
      input.userId,
      sanitizePlainText(input.author).slice(0, 200),
      sanitizePlainText(input.department).slice(0, 200),
      sanitizePlainText(input.text).slice(0, 2000)
    ]
  );
  return toChatMessage(rows[0]);
}
