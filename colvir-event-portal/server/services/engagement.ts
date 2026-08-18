import crypto from 'node:crypto';
import { query } from '../db/pool.js';
import { sanitizePlainText } from '../utils/sanitize.js';
import { listAttachmentsForMessages, type AttachmentDto } from './attachments.js';

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
/**
 * Лента администратора: записи на мероприятия плюс его собственные личные
 * уведомления.
 *
 * Личные раньше сюда не попадали, и упоминание администратора в чате или его
 * пара по Random Coffee просто не доходили: в его ленте показывались только
 * записи с audience = 'admin'.
 */
export async function listAdminNotifications(
  adminUserId: string,
  limit = 200
): Promise<NotificationDto[]> {
  const { rows } = await query<NotificationRow>(
    `SELECT ${NOTIFICATION_COLUMNS} FROM notifications
     WHERE audience = 'admin' OR (audience = 'user' AND user_id = $1)
     ORDER BY created_at DESC LIMIT $2`,
    [adminUserId, limit]
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
 * Отметить прочитанным. Рядовой сотрудник может закрыть только свое уведомление —
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
 * автор берется из сессии, повторная отправка обновляет прежнюю оценку.
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
  description: string;
  messageCount: number;
  /** Общий канал нельзя заархивировать: в него уходят сообщения без канала. */
  isDefault: boolean;
}

export class ChatChannelError extends Error {
  constructor(
    message: string,
    readonly code: 'invalid_name' | 'duplicate' | 'not_found' | 'protected'
  ) {
    super(message);
    this.name = 'ChatChannelError';
  }
}

const TRANSLIT: Record<string, string> = {
  а: 'a', б: 'b', в: 'v', г: 'g', д: 'd', е: 'e', ж: 'zh', з: 'z', и: 'i',
  й: 'y', к: 'k', л: 'l', м: 'm', н: 'n', о: 'o', п: 'p', р: 'r', с: 's',
  т: 't', у: 'u', ф: 'f', х: 'h', ц: 'c', ч: 'ch', ш: 'sh', щ: 'sch',
  ъ: '', ы: 'y', ь: '', э: 'e', ю: 'yu', я: 'ya'
};

/**
 * Идентификатор канала из названия: «Книжный клуб» -> «knizhnyy-klub».
 *
 * Идентификатор виден в адресной строке и в запросах, поэтому кириллицу
 * транслитерируем, а не оставляем в URL-кодировке. Если после очистки ничего
 * не осталось (название из одних эмодзи или иероглифов), вызывающий код
 * подставит случайный суффикс.
 */
export function channelSlug(name: string): string {
  return name
    .toLowerCase()
    .split('')
    .map((char) => (char in TRANSLIT ? TRANSLIT[char] : char))
    .join('')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
}

export async function listChatChannels(
  options: { includeArchived?: boolean } = {}
): Promise<ChatChannelDto[]> {
  const { rows } = await query<{
    id: string;
    name: string;
    description: string;
    message_count: string;
  }>(
    `SELECT c.id, c.name, c.description, count(m.id) AS message_count
     FROM chat_channels c
     LEFT JOIN chat_messages m ON m.channel_id = c.id
     WHERE $1::boolean OR c.archived_at IS NULL
     GROUP BY c.id, c.name, c.description, c.created_at
     ORDER BY c.created_at, c.id`,
    [options.includeArchived ?? false]
  );

  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    messageCount: Number(row.message_count),
    isDefault: row.id === DEFAULT_CHAT_CHANNEL
  }));
}

/**
 * Заводит тематическую группу. Каналы открытые — войти может любой сотрудник,
 * поэтому списка участников нет; ограничение только на создание, оно проверяется
 * в маршруте через requireAdmin.
 */
export async function createChatChannel(input: {
  name: string;
  description?: string;
  createdBy: string;
}): Promise<ChatChannelDto> {
  const name = sanitizePlainText(input.name).trim().slice(0, 60);
  if (name.length < 2) {
    throw new ChatChannelError('Название канала слишком короткое', 'invalid_name');
  }

  const description = sanitizePlainText(input.description ?? '').trim().slice(0, 200);
  const base = channelSlug(name) || `kanal-${crypto.randomBytes(3).toString('hex')}`;

  // Названия могут повторяться визуально («Бег» и «бег»), поэтому уникальность
  // проверяем по идентификатору и при совпадении добавляем суффикс.
  let id = base;
  for (let attempt = 2; attempt <= 20; attempt += 1) {
    const { rows } = await query('SELECT 1 FROM chat_channels WHERE id = $1', [id]);
    if (rows.length === 0) break;
    if (attempt === 20) {
      throw new ChatChannelError('Канал с таким названием уже есть', 'duplicate');
    }
    id = `${base}-${attempt}`;
  }

  await query(
    `INSERT INTO chat_channels (id, name, description, created_by)
     VALUES ($1, $2, $3, $4)`,
    [id, name, description, input.createdBy]
  );

  return { id, name, description, messageCount: 0, isDefault: false };
}

/**
 * Убирает канал из списка, не трогая переписку. Полное удаление не делаем
 * намеренно: внешний ключ стоит с ON DELETE CASCADE и унес бы всю историю.
 */
export async function archiveChatChannel(channelId: string): Promise<void> {
  if (channelId === DEFAULT_CHAT_CHANNEL) {
    throw new ChatChannelError('Общий канал закрыть нельзя', 'protected');
  }

  const { rowCount } = await query(
    'UPDATE chat_channels SET archived_at = now() WHERE id = $1 AND archived_at IS NULL',
    [channelId]
  );

  if (!rowCount) {
    throw new ChatChannelError('Канал не найден или уже в архиве', 'not_found');
  }
}

export interface ChatMentionDto {
  userId: string;
  displayName: string;
}

export interface ChatMessageDto {
  id: string;
  channelId: string;
  author: string;
  department: string;
  text: string;
  time: string;
  attachment?: AttachmentDto | null;
  mentions?: ChatMentionDto[];
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

  const messages = rows.map(toChatMessage);
  const ids = messages.map((message) => message.id);

  // Вложения и упоминания подтягиваются одним запросом на всю страницу
  // сообщений, а не по запросу на сообщение.
  const [attachments, mentions] = await Promise.all([
    listAttachmentsForMessages(ids),
    listMentionsForMessages(ids)
  ]);

  return messages.map((message) => ({
    ...message,
    attachment: attachments.get(message.id) ?? null,
    mentions: mentions.get(message.id) ?? []
  }));
}

async function listMentionsForMessages(
  messageIds: readonly string[]
): Promise<Map<string, ChatMentionDto[]>> {
  if (messageIds.length === 0) return new Map();

  const { rows } = await query<{ message_id: string; user_id: string; display_name: string }>(
    `SELECT message_id, user_id, display_name
     FROM chat_mentions
     WHERE message_id = ANY($1::text[])`,
    [messageIds as string[]]
  );

  const byMessage = new Map<string, ChatMentionDto[]>();
  for (const row of rows) {
    const list = byMessage.get(row.message_id) ?? [];
    list.push({ userId: row.user_id, displayName: row.display_name });
    byMessage.set(row.message_id, list);
  }
  return byMessage;
}

/**
 * Записывает упоминания и рассылает уведомления упомянутым.
 *
 * Возвращает только тех, кого удалось связать с учетной записью: неизвестные
 * идентификаторы молча отбрасываются, чтобы подделанный запрос не создавал
 * записей и не порождал уведомлений в никуда.
 */
export async function saveChatMentions(input: {
  messageId: string;
  userIds: readonly string[];
  channelId: string;
  authorUserId: string;
  authorName: string;
  messageText: string;
}): Promise<ChatMentionDto[]> {
  // Себя упоминать незачем, повторы схлопываем — иначе одному человеку пришло
  // бы несколько одинаковых уведомлений об одном сообщении.
  const unique = Array.from(new Set(input.userIds)).filter((id) => id !== input.authorUserId);
  if (unique.length === 0) return [];

  const { rows: known } = await query<{ id: string; display_name: string }>(
    'SELECT id, display_name FROM users WHERE id = ANY($1::uuid[])',
    [unique]
  );
  if (known.length === 0) return [];

  const { rows: channel } = await query<{ name: string }>(
    'SELECT name FROM chat_channels WHERE id = $1',
    [input.channelId]
  );
  const channelName = channel[0]?.name ?? 'Чат';

  const mentions: ChatMentionDto[] = [];

  for (const user of known) {
    await query(
      `INSERT INTO chat_mentions (message_id, user_id, display_name)
       VALUES ($1,$2,$3)
       ON CONFLICT (message_id, user_id) DO NOTHING`,
      [input.messageId, user.id, user.display_name]
    );

    await createNotification({
      audience: 'user',
      userId: user.id,
      eventTitle: channelName,
      participantName: input.authorName,
      type: 'chat_mention',
      // Формулировка без рода: имя автора выводится отдельным полем, поэтому
      // «упомянул/упомянула» здесь не нужно.
      messageText: input.messageText
        ? `Вас упомянули в «${channelName}»: ${input.messageText}`
        : `Вас упомянули в «${channelName}» в сообщении с картинкой`
    });

    mentions.push({ userId: user.id, displayName: user.display_name });
  }

  return mentions;
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

  // В архивный канал писать нельзя: он уже убран из списка, и новое сообщение
  // туда никто не увидит.
  const { rows: channel } = await query(
    'SELECT 1 FROM chat_channels WHERE id = $1 AND archived_at IS NULL',
    [channelId]
  );
  if (channel.length === 0) {
    throw new ChatChannelError(`Канал ${channelId} не найден или закрыт`, 'not_found');
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
