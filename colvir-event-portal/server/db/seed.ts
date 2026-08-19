import { getPool, withTransaction } from './pool.js';
import {
  SEED_EVENTS,
  SEED_PARTICIPANTS,
  SEED_RATINGS,
  SEED_HOLIDAY_CHAT
} from './seed-data.js';

/**
 * Заливает демонстрационные данные. По умолчанию не делает ничего, если в базе
 * уже есть мероприятия — чтобы повторный запуск не затирал рабочий контент.
 * Флаг --force очищает демо-таблицы перед заливкой.
 */
export async function seedDemoData(options: { force?: boolean } = {}): Promise<boolean> {
  const pool = getPool();

  const { rows } = await pool.query<{ count: number }>('SELECT count(*)::bigint AS count FROM events');
  if (rows[0].count > 0 && !options.force) {
    console.log(
      `[seed] В базе уже есть мероприятия (${rows[0].count}). Пропускаю. Используйте --force, чтобы перезалить.`
    );
    return false;
  }

  await withTransaction(async (client) => {
    if (options.force) {
      // participants/ratings/notifications удалятся каскадом вместе с events
      await client.query('DELETE FROM events');
      await client.query('DELETE FROM chat_messages');
    }

    for (const event of SEED_EVENTS) {
      await client.query(
        `INSERT INTO events (id, title, description, category, is_team_game, max_team_size,
                             max_participants, event_date, time_slots, location, image_url,
                             organizer, tags, theme_tag)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
         ON CONFLICT (id) DO NOTHING`,
        [
          event.id,
          event.title,
          event.description,
          event.category,
          event.isTeamGame,
          event.maxTeamSize ?? null,
          event.maxParticipants,
          event.date,
          event.timeSlots,
          event.location,
          event.imageUrl,
          event.organizer,
          event.tags,
          event.themeTag ?? null
        ]
      );
    }

    for (const participant of SEED_PARTICIPANTS) {
      await client.query(
        `INSERT INTO participants (id, event_id, first_name, last_name, email, telegram,
                                   department, time_slot, is_team_game, team_name, role,
                                   status, registered_at)
         VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,'confirmed',$12)
         ON CONFLICT (id) DO NOTHING`,
        [
          participant.id,
          participant.eventId,
          participant.firstName,
          participant.lastName,
          participant.email,
          participant.telegram ?? null,
          participant.department ?? null,
          participant.timeSlot ?? null,
          participant.isTeamGame,
          participant.teamName ?? null,
          participant.role ?? null,
          participant.registeredAt
        ]
      );
    }

    for (const rating of SEED_RATINGS) {
      const event = SEED_EVENTS.find((e) => e.id === rating.eventId);
      await client.query(
        `INSERT INTO ratings (id, event_id, event_title, user_email, user_name, rating, comment)
         VALUES ($1,$2,$3,$4,$5,$6,$7)
         ON CONFLICT (event_id, lower(user_email)) DO NOTHING`,
        [
          rating.id,
          rating.eventId,
          event?.title ?? '',
          rating.userEmail,
          rating.userName,
          rating.rating,
          rating.comment
        ]
      );
    }

    for (const [index, message] of SEED_HOLIDAY_CHAT.entries()) {
      await client.query(
        `INSERT INTO chat_messages (id, channel_id, author, department, text, created_at)
         VALUES ($1, 'general', $2, $3, $4, now() - ($5 || ' minutes')::interval)
         ON CONFLICT (id) DO NOTHING`,
        [
          message.id,
          message.author,
          message.department,
          message.text,
          String((SEED_HOLIDAY_CHAT.length - index) * 5)
        ]
      );
    }
  });

  console.log(
    `[seed] Загружено: мероприятий ${SEED_EVENTS.length}, участников ${SEED_PARTICIPANTS.length}, оценок ${SEED_RATINGS.length}`
  );
  return true;
}
