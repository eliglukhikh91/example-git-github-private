import { query, withTransaction } from '../db/pool.js';
import { sanitizePlainText } from '../utils/sanitize.js';

/**
 * Random Coffee.
 *
 * Логика работает циклами:
 *
 *   1. Администратор открывает цикл: дата встреч и дедлайн записи.
 *   2. До дедлайна сотрудники отмечают ВСЕ удобные им слоты — не один.
 *   3. По дедлайну сервер разбивает участников на пары так, чтобы у обоих был
 *      общий слот, и сохраняет результат для двоих сразу.
 *
 * Прежняя реализация подбирала коллегу в браузере одного человека, никуда пару
 * не сохраняла, а при пустом слоте подставляла пять захардкоженных «коллег» —
 * поэтому второй участник о встрече не узнавал, а иногда и не существовал.
 */

export interface CoffeeCycle {
  id: number;
  title: string;
  meetingDate: string;
  registrationEndsAt: string;
  status: 'open' | 'matched' | 'cancelled';
  matchedAt: string | null;
}

interface CycleRow {
  id: number;
  title: string;
  meeting_date: Date;
  registration_ends_at: Date;
  status: CoffeeCycle['status'];
  matched_at: Date | null;
}

function toCycle(row: CycleRow): CoffeeCycle {
  return {
    id: row.id,
    title: row.title,
    meetingDate: row.meeting_date.toISOString().slice(0, 10),
    registrationEndsAt: row.registration_ends_at.toISOString(),
    status: row.status,
    matchedAt: row.matched_at?.toISOString() ?? null
  };
}

const CYCLE_COLUMNS = `id, title, meeting_date, registration_ends_at, status, matched_at`;

export class CoffeeError extends Error {
  constructor(
    message: string,
    readonly status = 400
  ) {
    super(message);
  }
}

// ---------------------------------------------------------------------------
// Цикл
// ---------------------------------------------------------------------------

export async function getOpenCycle(): Promise<CoffeeCycle | null> {
  const { rows } = await query<CycleRow>(
    `SELECT ${CYCLE_COLUMNS} FROM coffee_cycles WHERE status = 'open'`
  );
  return rows[0] ? toCycle(rows[0]) : null;
}

export async function getCycleById(id: number): Promise<CoffeeCycle | null> {
  const { rows } = await query<CycleRow>(
    `SELECT ${CYCLE_COLUMNS} FROM coffee_cycles WHERE id = $1`,
    [id]
  );
  return rows[0] ? toCycle(rows[0]) : null;
}

/** Последний цикл, в котором участвовал сотрудник (для показа прошлой встречи). */
export async function getLatestCycleForUser(userId: string): Promise<CoffeeCycle | null> {
  const { rows } = await query<CycleRow>(
    `SELECT c.${CYCLE_COLUMNS.split(', ').join(', c.')}
     FROM coffee_cycles c
     JOIN coffee_match_members m ON m.cycle_id = c.id AND m.user_id = $1
     ORDER BY c.meeting_date DESC, c.id DESC
     LIMIT 1`,
    [userId]
  );
  return rows[0] ? toCycle(rows[0]) : null;
}

export async function listCycles(limit = 20): Promise<CoffeeCycle[]> {
  const { rows } = await query<CycleRow>(
    `SELECT ${CYCLE_COLUMNS} FROM coffee_cycles ORDER BY meeting_date DESC, id DESC LIMIT $1`,
    [limit]
  );
  return rows.map(toCycle);
}

export async function createCycle(
  input: { title?: string; meetingDate: string; registrationEndsAt: string },
  createdBy: string
): Promise<CoffeeCycle> {
  const existing = await getOpenCycle();
  if (existing) {
    throw new CoffeeError(
      'Уже есть открытый цикл Random Coffee. Завершите его подбором или отмените.',
      409
    );
  }

  if (new Date(input.registrationEndsAt).getTime() <= Date.now()) {
    throw new CoffeeError('Дедлайн записи должен быть в будущем');
  }

  const { rows } = await query<CycleRow>(
    `INSERT INTO coffee_cycles (title, meeting_date, registration_ends_at, created_by)
     VALUES ($1, $2, $3, $4)
     RETURNING ${CYCLE_COLUMNS}`,
    [
      sanitizePlainText(input.title ?? '').slice(0, 200),
      input.meetingDate,
      input.registrationEndsAt,
      createdBy
    ]
  );
  return toCycle(rows[0]);
}

export async function cancelCycle(id: number): Promise<CoffeeCycle | null> {
  const { rows } = await query<CycleRow>(
    `UPDATE coffee_cycles SET status = 'cancelled'
     WHERE id = $1 AND status = 'open'
     RETURNING ${CYCLE_COLUMNS}`,
    [id]
  );
  return rows[0] ? toCycle(rows[0]) : null;
}

// ---------------------------------------------------------------------------
// Доступность сотрудника
// ---------------------------------------------------------------------------

export async function getMyAvailability(cycleId: number, userId: string): Promise<string[]> {
  const { rows } = await query<{ slot: string }>(
    `SELECT slot FROM coffee_availability WHERE cycle_id = $1 AND user_id = $2 ORDER BY slot`,
    [cycleId, userId]
  );
  return rows.map((row) => row.slot);
}

/**
 * Полностью заменяет отмеченные слоты сотрудника в цикле.
 * Пустой список — отказ от участия в этом цикле.
 */
export async function setMyAvailability(
  cycleId: number,
  userId: string,
  slots: readonly string[]
): Promise<string[]> {
  const cycle = await getCycleById(cycleId);
  if (!cycle) throw new CoffeeError('Цикл не найден', 404);
  if (cycle.status !== 'open') {
    throw new CoffeeError('Подбор по этому циклу уже выполнен, доступность изменить нельзя', 409);
  }
  if (new Date(cycle.registrationEndsAt).getTime() <= Date.now()) {
    throw new CoffeeError('Срок записи в этот цикл истек', 409);
  }

  // Принимаем только слоты из справочника, чтобы в паре не оказалось времени,
  // которого нет в расписании.
  const { rows: allowed } = await query<{ slot: string }>('SELECT slot FROM coffee_slots');
  const allowedSet = new Set(allowed.map((row) => row.slot));
  const clean = Array.from(new Set(slots)).filter((slot) => allowedSet.has(slot));

  await withTransaction(async (client) => {
    await client.query('DELETE FROM coffee_availability WHERE cycle_id = $1 AND user_id = $2', [
      cycleId,
      userId
    ]);
    for (const slot of clean) {
      await client.query(
        'INSERT INTO coffee_availability (cycle_id, user_id, slot) VALUES ($1,$2,$3)',
        [cycleId, userId, slot]
      );
    }
  });

  return clean.sort();
}

/** Сколько сотрудников отметили каждый слот — для подсказки «когда больше шансов». */
export async function getSlotDemand(cycleId: number): Promise<Record<string, number>> {
  const { rows } = await query<{ slot: string; count: number }>(
    `SELECT slot, count(*)::bigint AS count FROM coffee_availability
     WHERE cycle_id = $1 GROUP BY slot`,
    [cycleId]
  );
  return Object.fromEntries(rows.map((row) => [row.slot, row.count]));
}

export async function countParticipants(cycleId: number): Promise<number> {
  const { rows } = await query<{ count: number }>(
    `SELECT count(DISTINCT user_id)::bigint AS count FROM coffee_availability WHERE cycle_id = $1`,
    [cycleId]
  );
  return rows[0].count;
}

// ---------------------------------------------------------------------------
// Пары
// ---------------------------------------------------------------------------

export interface CoffeeMatchMember {
  userId: string;
  displayName: string;
  email: string;
  department: string;
  telegram: string;
  avatarUrl: string | null;
}

export interface CoffeeMatch {
  id: number;
  cycleId: number;
  slot: string;
  location: string;
  status: 'scheduled' | 'done' | 'cancelled';
  members: CoffeeMatchMember[];
}

async function loadMatches(where: string, params: readonly unknown[]): Promise<CoffeeMatch[]> {
  const { rows } = await query<{
    id: number;
    cycle_id: number;
    slot: string;
    location: string;
    status: CoffeeMatch['status'];
    user_id: string;
    display_name: string;
    email: string;
    department: string;
    telegram: string;
    avatar_url: string | null;
  }>(
    `SELECT m.id, m.cycle_id, m.slot, m.location, m.status,
            u.id AS user_id, u.display_name, u.email, u.department, u.telegram, u.avatar_url
     FROM coffee_matches m
     JOIN coffee_match_members mm ON mm.match_id = m.id
     JOIN users u ON u.id = mm.user_id
     WHERE ${where}
     ORDER BY m.id, u.display_name`,
    params
  );

  const byId = new Map<number, CoffeeMatch>();
  for (const row of rows) {
    let match = byId.get(row.id);
    if (!match) {
      match = {
        id: row.id,
        cycleId: row.cycle_id,
        slot: row.slot,
        location: row.location,
        status: row.status,
        members: []
      };
      byId.set(row.id, match);
    }
    match.members.push({
      userId: row.user_id,
      displayName: row.display_name,
      email: row.email,
      department: row.department,
      telegram: row.telegram,
      avatarUrl: row.avatar_url
    });
  }

  return Array.from(byId.values());
}

export async function getMyMatch(cycleId: number, userId: string): Promise<CoffeeMatch | null> {
  const matches = await loadMatches(
    `m.cycle_id = $1 AND m.id IN (
       SELECT match_id FROM coffee_match_members WHERE user_id = $2
     )`,
    [cycleId, userId]
  );
  return matches[0] ?? null;
}

export async function listMatchesForCycle(cycleId: number): Promise<CoffeeMatch[]> {
  return loadMatches('m.cycle_id = $1', [cycleId]);
}

// ---------------------------------------------------------------------------
// Алгоритм подбора
// ---------------------------------------------------------------------------

interface Candidate {
  userId: string;
  slots: Set<string>;
}

/** Пары, которые уже встречались ранее — их стараемся не повторять. */
type History = Set<string>;

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`;
}

export interface MatchPlanEntry {
  members: string[];
  slot: string;
}

/**
 * Разбивает участников на пары.
 *
 * Порядок такой: сначала берем сотрудника с наименьшим числом возможных
 * партнеров (у кого меньше всего вариантов — тому сложнее всего найти пару), и
 * подбираем ему партнера, который тоже стеснен в вариантах. Это простой
 * «greedy by fewest options» — он не дает математически оптимального
 * паросочетания, но на десятках участников работает предсказуемо и не оставляет
 * без пары тех, у кого отмечен один слот.
 *
 * Ранее встречавшиеся пары исключаются, пока есть альтернативы; если
 * альтернатив нет, повтор допускается — лучше повторная встреча, чем никакой.
 *
 * При нечетном числе участников последний присоединяется к уже собранной
 * встрече с подходящим слотом, образуя тройку.
 */
export function buildMatchPlan(
  candidates: readonly Candidate[],
  history: History = new Set()
): { plan: MatchPlanEntry[]; unmatched: string[] } {
  const pool = candidates.filter((candidate) => candidate.slots.size > 0);
  const remaining = new Map(pool.map((candidate) => [candidate.userId, candidate]));
  const plan: MatchPlanEntry[] = [];
  // Те, кому пару подобрать не удалось: их нужно вернуть вызывающему, чтобы
  // администратор видел реальную картину, а не только размер списка пар.
  const unmatched: string[] = [];

  const sharedSlots = (a: Candidate, b: Candidate): string[] =>
    [...a.slots].filter((slot) => b.slots.has(slot)).sort();

  const optionsFor = (candidate: Candidate): Candidate[] =>
    [...remaining.values()].filter(
      (other) => other.userId !== candidate.userId && sharedSlots(candidate, other).length > 0
    );

  while (remaining.size > 1) {
    // Самый «стесненный» участник идет первым.
    const ordered = [...remaining.values()].sort(
      (a, b) => optionsFor(a).length - optionsFor(b).length
    );
    const current = ordered[0];
    const options = optionsFor(current);

    if (options.length === 0) {
      // Ни с кем не совпало время — фиксируем явно, а не теряем молча.
      unmatched.push(current.userId);
      remaining.delete(current.userId);
      continue;
    }

    const fresh = options.filter(
      (other) => !history.has(pairKey(current.userId, other.userId))
    );
    const shortlist = fresh.length > 0 ? fresh : options;

    // Среди допустимых берем того, у кого тоже меньше всего вариантов.
    const partner = shortlist.sort(
      (a, b) => optionsFor(a).length - optionsFor(b).length
    )[0];

    const slots = sharedSlots(current, partner);
    plan.push({ members: [current.userId, partner.userId], slot: slots[0] });
    remaining.delete(current.userId);
    remaining.delete(partner.userId);
  }

  // Нечетный участник — третьим в подходящую встречу.
  for (const leftover of [...remaining.values()]) {
    const target = plan.find((entry) => leftover.slots.has(entry.slot) && entry.members.length < 3);
    if (target) {
      target.members.push(leftover.userId);
    } else {
      unmatched.push(leftover.userId);
    }
  }

  return { plan, unmatched };
}

async function loadCandidates(cycleId: number): Promise<Candidate[]> {
  const { rows } = await query<{ user_id: string; slot: string }>(
    'SELECT user_id, slot FROM coffee_availability WHERE cycle_id = $1',
    [cycleId]
  );

  const byUser = new Map<string, Candidate>();
  for (const row of rows) {
    let candidate = byUser.get(row.user_id);
    if (!candidate) {
      candidate = { userId: row.user_id, slots: new Set() };
      byUser.set(row.user_id, candidate);
    }
    candidate.slots.add(row.slot);
  }
  return [...byUser.values()];
}

async function loadHistory(): Promise<History> {
  const { rows } = await query<{ a: string; b: string }>(
    `SELECT m1.user_id AS a, m2.user_id AS b
     FROM coffee_match_members m1
     JOIN coffee_match_members m2 ON m1.match_id = m2.match_id AND m1.user_id < m2.user_id`
  );
  return new Set(rows.map((row) => pairKey(row.a, row.b)));
}

export interface MatchResult {
  cycle: CoffeeCycle;
  matches: CoffeeMatch[];
  unmatched: string[];
}

/**
 * Выполняет подбор по циклу и переводит его в статус matched.
 * Идемпотентен: повторный вызов на уже сматченном цикле вернет ошибку.
 */
export async function runMatching(cycleId: number): Promise<MatchResult> {
  const cycle = await getCycleById(cycleId);
  if (!cycle) throw new CoffeeError('Цикл не найден', 404);
  if (cycle.status !== 'open') {
    throw new CoffeeError('Подбор по этому циклу уже выполнен', 409);
  }

  const [candidates, history, defaultLocation] = await Promise.all([
    loadCandidates(cycleId),
    loadHistory(),
    getDefaultLocation()
  ]);

  if (candidates.length < 2) {
    throw new CoffeeError(
      'Для подбора нужно минимум два участника с отмеченными слотами',
      409
    );
  }

  const { plan, unmatched } = buildMatchPlan(candidates, history);

  await withTransaction(async (client) => {
    for (const entry of plan) {
      const inserted = await client.query<{ id: number }>(
        `INSERT INTO coffee_matches (cycle_id, slot, location) VALUES ($1,$2,$3) RETURNING id`,
        [cycleId, entry.slot, defaultLocation]
      );
      const matchId = inserted.rows[0].id;
      for (const userId of entry.members) {
        await client.query(
          'INSERT INTO coffee_match_members (match_id, cycle_id, user_id) VALUES ($1,$2,$3)',
          [matchId, cycleId, userId]
        );
      }
    }

    await client.query(
      `UPDATE coffee_cycles SET status = 'matched', matched_at = now() WHERE id = $1`,
      [cycleId]
    );
  });

  return {
    cycle: (await getCycleById(cycleId))!,
    matches: await listMatchesForCycle(cycleId),
    unmatched
  };
}

/** Место встречи по умолчанию берем из редактируемого администратором контента. */
async function getDefaultLocation(): Promise<string> {
  const { rows } = await query<{ value: string }>(
    `SELECT value FROM cms_content WHERE key = 'randomCoffeeFormat'`
  );
  return rows[0]?.value ?? '';
}

/** Циклы, у которых истек дедлайн записи, — для планировщика. */
export async function findCyclesDueForMatching(): Promise<CoffeeCycle[]> {
  const { rows } = await query<CycleRow>(
    `SELECT ${CYCLE_COLUMNS} FROM coffee_cycles
     WHERE status = 'open' AND registration_ends_at <= now()`
  );
  return rows.map(toCycle);
}

// ---------------------------------------------------------------------------
// Уведомления участникам
// ---------------------------------------------------------------------------

/**
 * Разбирает слот вида «10:00 - 10:15 (МСК)» и возвращает московское время начала
 * на дату встречи. Нужно, чтобы напомнить участникам ровно перед кофе-брейком.
 * Если формат неожиданный — вернем null, напоминание просто не отправится.
 */
export function parseSlotStart(slot: string, meetingDate: string): Date | null {
  const match = /(\d{1,2}):(\d{2})/.exec(slot);
  if (!match) return null;

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;

  // Слоты объявлены по Москве (UTC+3), а сервер может жить в другой зоне.
  const parsed = new Date(`${meetingDate}T${String(hours).padStart(2, '0')}:${match[2]}:00+03:00`);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function describePartners(match: CoffeeMatch, forUserId: string): string {
  return match.members
    .filter((member) => member.userId !== forUserId)
    .map((member) =>
      member.department ? `${member.displayName} (${member.department})` : member.displayName
    )
    .join(', ');
}

/** Личные уведомления обоим (или всем трем) участникам встречи. */
export async function notifyMatchMembers(
  matches: readonly CoffeeMatch[],
  createNotification: (input: {
    audience: 'user';
    userId: string;
    eventTitle: string;
    participantName: string;
    timeSlot: string;
    type: string;
    messageText: string;
  }) => Promise<unknown>
): Promise<number> {
  let sent = 0;

  for (const match of matches) {
    for (const member of match.members) {
      const partners = describePartners(match, member.userId);
      if (!partners) continue;

      await createNotification({
        audience: 'user',
        userId: member.userId,
        eventTitle: 'Random Coffee',
        participantName: partners,
        timeSlot: match.slot,
        type: 'random_coffee_match',
        messageText:
          `Вам подобран коллега для кофе-брейка: ${partners}. ` +
          `Время: ${match.slot}${match.location ? `, формат: ${match.location}` : ''}.`
      });
      sent += 1;
    }
  }

  return sent;
}

/**
 * Встречи, которым пора отправить напоминание: слот начинается в пределах
 * ближайших `withinMinutes` минут, а напоминание еще не уходило.
 */
export async function findMatchesDueForReminder(withinMinutes = 15): Promise<CoffeeMatch[]> {
  const { rows } = await query<{ id: number; slot: string; meeting_date: Date }>(
    `SELECT m.id, m.slot, c.meeting_date
     FROM coffee_matches m
     JOIN coffee_cycles c ON c.id = m.cycle_id
     WHERE m.status = 'scheduled'
       AND m.reminder_sent_at IS NULL
       AND c.meeting_date BETWEEN (now() - interval '1 day')::date AND (now() + interval '1 day')::date`
  );

  const now = Date.now();
  const dueIds = rows
    .filter((row) => {
      const start = parseSlotStart(row.slot, row.meeting_date.toISOString().slice(0, 10));
      if (!start) return false;
      const diffMinutes = (start.getTime() - now) / 60_000;
      // Напоминаем незадолго до начала и еще немного после — если планировщик
      // проснулся с задержкой, участники все равно получат сообщение.
      return diffMinutes <= withinMinutes && diffMinutes >= -withinMinutes;
    })
    .map((row) => row.id);

  if (dueIds.length === 0) return [];
  return loadMatches('m.id = ANY($1::bigint[])', [dueIds]);
}

export async function markReminderSent(matchIds: readonly number[]): Promise<void> {
  if (matchIds.length === 0) return;
  await query('UPDATE coffee_matches SET reminder_sent_at = now() WHERE id = ANY($1::bigint[])', [
    matchIds
  ]);
}

/** Напоминание «пора на кофе-брейк» — тем, у кого встреча начинается вот-вот. */
export async function sendDueReminders(
  createNotification: (input: {
    audience: 'user';
    userId: string;
    eventTitle: string;
    participantName: string;
    timeSlot: string;
    type: string;
    messageText: string;
  }) => Promise<unknown>
): Promise<number> {
  const due = await findMatchesDueForReminder();
  let sent = 0;

  for (const match of due) {
    for (const member of match.members) {
      const partners = describePartners(match, member.userId);
      if (!partners) continue;

      await createNotification({
        audience: 'user',
        userId: member.userId,
        eventTitle: 'Random Coffee',
        participantName: partners,
        timeSlot: match.slot,
        type: 'random_coffee_reminder',
        messageText:
          `Пора на кофе-брейк! Вас ждет ${partners}` +
          `${match.location ? `, формат: ${match.location}` : ''}.`
      });
      sent += 1;
    }
  }

  await markReminderSent(due.map((match) => match.id));
  return sent;
}
