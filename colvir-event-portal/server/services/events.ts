import crypto from 'node:crypto';
import { query, withTransaction } from '../db/pool.js';
import { sanitizeRichText, sanitizePlainText, sanitizeUrl, sanitizeImageSource } from '../utils/sanitize.js';

export interface EventDto {
  id: string;
  title: string;
  description: string;
  category: string;
  isTeamGame: boolean;
  maxTeamSize?: number;
  maxParticipants: number;
  date: string;
  timeSlots: string[];
  location: string;
  meetingUrl?: string;
  imageUrl: string;
  createdAt: string;
  organizer: string;
  tags: string[];
  /** Тема, в подборку которой попадает мероприятие. null — ни в какую. */
  themeTag: string | null;
}

export interface ParticipantDto {
  id: string;
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  telegram?: string;
  department?: string;
  timeSlot?: string;
  isTeamGame: boolean;
  teamName?: string;
  role?: 'captain' | 'player';
  registeredAt: string;
  status: 'confirmed' | 'waitlist' | 'cancelled';
}

interface EventRow {
  id: string;
  title: string;
  description: string;
  category: string;
  is_team_game: boolean;
  max_team_size: number | null;
  max_participants: number;
  event_date: string;
  time_slots: string[];
  location: string;
  meeting_url: string | null;
  image_url: string;
  organizer: string;
  tags: string[];
  theme_tag: string | null;
  created_at: Date;
}

interface ParticipantRow {
  id: string;
  event_id: string;
  first_name: string;
  last_name: string;
  email: string;
  telegram: string | null;
  department: string | null;
  time_slot: string | null;
  is_team_game: boolean;
  team_name: string | null;
  role: 'captain' | 'player' | null;
  registered_at: Date;
  status: 'confirmed' | 'waitlist' | 'cancelled';
}

function toEvent(row: EventRow): EventDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    category: row.category,
    isTeamGame: row.is_team_game,
    maxTeamSize: row.max_team_size ?? undefined,
    maxParticipants: row.max_participants,
    date: row.event_date,
    timeSlots: row.time_slots ?? [],
    location: row.location,
    meetingUrl: row.meeting_url ?? undefined,
    imageUrl: row.image_url,
    createdAt: row.created_at.toISOString().slice(0, 10),
    organizer: row.organizer,
    tags: row.tags ?? [],
    themeTag: row.theme_tag ?? null
  };
}

function toParticipant(row: ParticipantRow): ParticipantDto {
  return {
    id: row.id,
    eventId: row.event_id,
    firstName: row.first_name,
    lastName: row.last_name,
    email: row.email,
    telegram: row.telegram ?? undefined,
    department: row.department ?? undefined,
    timeSlot: row.time_slot ?? undefined,
    isTeamGame: row.is_team_game,
    teamName: row.team_name ?? undefined,
    role: row.role ?? undefined,
    registeredAt: row.registered_at.toISOString(),
    status: row.status
  };
}

const EVENT_COLUMNS = `
  id, title, description, category, is_team_game, max_team_size, max_participants,
  event_date, time_slots, location, meeting_url, image_url, organizer, tags, theme_tag,
  created_at
`;

const PARTICIPANT_COLUMNS = `
  id, event_id, first_name, last_name, email, telegram, department, time_slot,
  is_team_game, team_name, role, registered_at, status
`;

export async function listEvents(): Promise<EventDto[]> {
  const { rows } = await query<EventRow>(
    `SELECT ${EVENT_COLUMNS} FROM events ORDER BY created_at DESC`
  );
  return rows.map(toEvent);
}

export async function getEvent(id: string): Promise<EventDto | null> {
  const { rows } = await query<EventRow>(`SELECT ${EVENT_COLUMNS} FROM events WHERE id = $1`, [id]);
  return rows[0] ? toEvent(rows[0]) : null;
}

export interface EventInput {
  title: string;
  description: string;
  category: string;
  isTeamGame: boolean;
  maxTeamSize?: number | null;
  maxParticipants: number;
  date: string;
  timeSlots: string[];
  location: string;
  meetingUrl?: string | null;
  imageUrl: string;
  organizer: string;
  tags: string[];
  themeTag?: string | null;
}

/** Значения совпадают с ограничением events_theme_tag_check в миграции 008. */
const THEME_TAGS = new Set(['newyear', 'spring', 'birthday']);

/**
 * Потолок числа тегов у мероприятия: два служебных (категория и признак
 * командной игры) плюс десять хэштегов от администратора.
 */
const MAX_TAGS = 12;

function sanitizeEventInput(input: EventInput) {
  return {
    title: sanitizePlainText(input.title).slice(0, 300),
    description: sanitizeRichText(input.description),
    category: sanitizePlainText(input.category).slice(0, 50),
    isTeamGame: Boolean(input.isTeamGame),
    maxTeamSize: input.maxTeamSize ?? null,
    maxParticipants: input.maxParticipants,
    date: sanitizePlainText(input.date).slice(0, 100),
    timeSlots: input.timeSlots.map((slot) => sanitizePlainText(slot).slice(0, 100)),
    location: sanitizePlainText(input.location).slice(0, 300),
    meetingUrl: sanitizeUrl(input.meetingUrl),
    imageUrl: sanitizeImageSource(input.imageUrl) ?? '',
    organizer: sanitizePlainText(input.organizer).slice(0, 200),
    // Длину списка ограничиваем здесь, а не только в форме: форма — не защита,
    // запрос к API можно отправить и мимо нее.
    tags: input.tags
      .map((tag) => sanitizePlainText(tag).slice(0, 60))
      .filter(Boolean)
      .slice(0, MAX_TAGS),
    // Незнакомое значение превращаем в null, а не отдаем в базу: иначе запрос
    // упал бы на check-ограничении с невнятной для пользователя ошибкой.
    themeTag: input.themeTag && THEME_TAGS.has(input.themeTag) ? input.themeTag : null
  };
}

export async function createEvent(input: EventInput, createdBy: string): Promise<EventDto> {
  const clean = sanitizeEventInput(input);
  const id = `evt-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;

  const { rows } = await query<EventRow>(
    `INSERT INTO events (id, title, description, category, is_team_game, max_team_size,
                         max_participants, event_date, time_slots, location, meeting_url,
                         image_url, organizer, tags, theme_tag, created_by)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16)
     RETURNING ${EVENT_COLUMNS}`,
    [
      id,
      clean.title,
      clean.description,
      clean.category,
      clean.isTeamGame,
      clean.maxTeamSize,
      clean.maxParticipants,
      clean.date,
      clean.timeSlots,
      clean.location,
      clean.meetingUrl,
      clean.imageUrl,
      clean.organizer,
      clean.tags,
      clean.themeTag,
      createdBy
    ]
  );

  return toEvent(rows[0]);
}

export async function updateEvent(id: string, input: EventInput): Promise<EventDto | null> {
  const clean = sanitizeEventInput(input);

  const { rows } = await query<EventRow>(
    `UPDATE events SET
       title = $2, description = $3, category = $4, is_team_game = $5, max_team_size = $6,
       max_participants = $7, event_date = $8, time_slots = $9, location = $10,
       meeting_url = $11, image_url = $12, organizer = $13, tags = $14, theme_tag = $15,
       updated_at = now()
     WHERE id = $1
     RETURNING ${EVENT_COLUMNS}`,
    [
      id,
      clean.title,
      clean.description,
      clean.category,
      clean.isTeamGame,
      clean.maxTeamSize,
      clean.maxParticipants,
      clean.date,
      clean.timeSlots,
      clean.location,
      clean.meetingUrl,
      clean.imageUrl,
      clean.organizer,
      clean.tags,
      clean.themeTag
    ]
  );

  return rows[0] ? toEvent(rows[0]) : null;
}

export async function deleteEvent(id: string): Promise<boolean> {
  const { rowCount } = await query('DELETE FROM events WHERE id = $1', [id]);
  return (rowCount ?? 0) > 0;
}

export async function listParticipants(): Promise<ParticipantDto[]> {
  const { rows } = await query<ParticipantRow>(
    `SELECT ${PARTICIPANT_COLUMNS} FROM participants ORDER BY registered_at DESC`
  );
  return rows.map(toParticipant);
}

export interface RegistrationInput {
  eventId: string;
  firstName: string;
  lastName: string;
  email: string;
  telegram?: string;
  department?: string;
  timeSlot?: string;
  teamName?: string;
  role?: 'captain' | 'player';
}

export class RegistrationError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

/**
 * Запись на мероприятие. Лимит мест и повторные записи проверяются в одной
 * транзакции с блокировкой строки события: два одновременных запроса не могут
 * занять последнее место дважды.
 */
export async function registerForEvent(
  input: RegistrationInput,
  userId: string
): Promise<{ participant: ParticipantDto; event: EventDto }> {
  return withTransaction(async (client) => {
    const eventResult = await client.query<EventRow>(
      `SELECT ${EVENT_COLUMNS} FROM events WHERE id = $1 FOR UPDATE`,
      [input.eventId]
    );
    if (eventResult.rows.length === 0) {
      throw new RegistrationError('Мероприятие не найдено', 404);
    }
    const event = toEvent(eventResult.rows[0]);

    const existing = await client.query(
      `SELECT 1 FROM participants
       WHERE event_id = $1 AND lower(email) = lower($2) AND status <> 'cancelled'`,
      [input.eventId, input.email]
    );
    if ((existing.rowCount ?? 0) > 0) {
      throw new RegistrationError('Вы уже записаны на это мероприятие', 409);
    }

    const countResult = await client.query<{ count: number }>(
      `SELECT count(*)::bigint AS count FROM participants
       WHERE event_id = $1 AND status = 'confirmed'`,
      [input.eventId]
    );
    const confirmed = countResult.rows[0].count;
    const status: ParticipantDto['status'] =
      event.maxParticipants > 0 && confirmed >= event.maxParticipants ? 'waitlist' : 'confirmed';

    if (event.isTeamGame && event.maxTeamSize && input.teamName) {
      const teamCount = await client.query<{ count: number }>(
        `SELECT count(*)::bigint AS count FROM participants
         WHERE event_id = $1 AND lower(team_name) = lower($2) AND status <> 'cancelled'`,
        [input.eventId, input.teamName]
      );
      if (teamCount.rows[0].count >= event.maxTeamSize) {
        throw new RegistrationError(
          `В команде «${input.teamName}» уже максимальное число участников (${event.maxTeamSize})`,
          409
        );
      }
    }

    const id = `part-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    const inserted = await client.query<ParticipantRow>(
      `INSERT INTO participants (id, event_id, user_id, first_name, last_name, email, telegram,
                                 department, time_slot, is_team_game, team_name, role, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
       RETURNING ${PARTICIPANT_COLUMNS}`,
      [
        id,
        input.eventId,
        userId,
        sanitizePlainText(input.firstName).slice(0, 100),
        sanitizePlainText(input.lastName).slice(0, 100),
        input.email.trim().toLowerCase(),
        input.telegram ? sanitizePlainText(input.telegram).slice(0, 100) : null,
        input.department ? sanitizePlainText(input.department).slice(0, 200) : null,
        input.timeSlot ? sanitizePlainText(input.timeSlot).slice(0, 100) : null,
        event.isTeamGame,
        input.teamName ? sanitizePlainText(input.teamName).slice(0, 120) : null,
        event.isTeamGame ? (input.role ?? 'player') : null,
        status
      ]
    );

    const participant = toParticipant(inserted.rows[0]);

    const notificationId = `notif-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`;
    await client.query(
      `INSERT INTO notifications (id, event_id, event_title, participant_name, is_team_game,
                                  team_name, role, time_slot, type)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'registration')`,
      [
        notificationId,
        event.id,
        event.title,
        `${participant.lastName} ${participant.firstName}`.trim(),
        event.isTeamGame,
        participant.teamName ?? null,
        participant.role === 'captain' ? 'Капитан' : participant.role === 'player' ? 'Игрок' : null,
        participant.timeSlot ?? null
      ]
    );

    return { participant, event };
  });
}

export async function cancelRegistration(
  participantId: string,
  requester: { id: string; email: string; isAdmin: boolean }
): Promise<ParticipantDto | null> {
  const { rows } = await query<ParticipantRow>(
    `UPDATE participants SET status = 'cancelled'
     WHERE id = $1 AND ($2::boolean OR lower(email) = lower($3))
     RETURNING ${PARTICIPANT_COLUMNS}`,
    [participantId, requester.isAdmin, requester.email]
  );
  return rows[0] ? toParticipant(rows[0]) : null;
}
