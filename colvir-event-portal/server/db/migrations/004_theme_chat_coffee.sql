-- ---------------------------------------------------------------------------
-- 1. Настройки приложения (общие для компании)
--
-- Тему оформления теперь выбирает администратор, и она применяется у всех
-- сотрудников. Раньше тема лежала в localStorage каждого браузера, поэтому
-- «единое оформление на компанию» было невозможно.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS app_settings (
  key         text PRIMARY KEY,
  value       text NOT NULL,
  updated_by  uuid REFERENCES users (id) ON DELETE SET NULL,
  updated_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO app_settings (key, value) VALUES ('theme', 'classic')
ON CONFLICT (key) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2. Чат: перестает быть «праздничным», получает каналы
--
-- Каналы вводятся сразу, хотя в интерфейсе пока один общий: иначе при переходе
-- к группам по интересам пришлось бы переписывать структуру и переносить данные.
-- ---------------------------------------------------------------------------
ALTER TABLE holiday_chat_messages RENAME TO chat_messages;
ALTER INDEX IF EXISTS holiday_chat_messages_pkey RENAME TO chat_messages_pkey;
ALTER INDEX IF EXISTS holiday_chat_created_idx RENAME TO chat_messages_created_idx;

CREATE TABLE IF NOT EXISTS chat_channels (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  created_by  uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now()
);

INSERT INTO chat_channels (id, name) VALUES ('general', 'Общий чат')
ON CONFLICT (id) DO NOTHING;

ALTER TABLE chat_messages
  ADD COLUMN IF NOT EXISTS channel_id text NOT NULL DEFAULT 'general';

ALTER TABLE chat_messages
  DROP CONSTRAINT IF EXISTS chat_messages_channel_id_fkey;
ALTER TABLE chat_messages
  ADD CONSTRAINT chat_messages_channel_id_fkey
  FOREIGN KEY (channel_id) REFERENCES chat_channels (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS chat_messages_channel_idx
  ON chat_messages (channel_id, created_at);

-- ---------------------------------------------------------------------------
-- 3. Random Coffee: доступность и подбор пар циклами
--
-- Прежняя схема хранила запись на один слот, а пару подбирал браузер и никуда
-- не сохранял — второй участник о ней не узнавал. Теперь сотрудник отмечает
-- несколько удобных слотов, а сервер по дедлайну цикла разбивает всех на пары
-- по общему слоту и сохраняет результат для обеих сторон.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS coffee_cycles (
  id                    bigserial PRIMARY KEY,
  title                 text NOT NULL DEFAULT '',
  /* Дата, на которую назначаются встречи цикла. */
  meeting_date          date NOT NULL,
  /* До этого момента можно менять свою доступность. */
  registration_ends_at  timestamptz NOT NULL,
  status                text NOT NULL DEFAULT 'open'
                        CHECK (status IN ('open', 'matched', 'cancelled')),
  matched_at            timestamptz,
  created_by            uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at            timestamptz NOT NULL DEFAULT now()
);

-- Одновременно открытым может быть только один цикл: иначе непонятно,
-- в какой из них попадает отмеченная доступность.
CREATE UNIQUE INDEX IF NOT EXISTS coffee_cycles_single_open_idx
  ON coffee_cycles ((status)) WHERE status = 'open';

CREATE TABLE IF NOT EXISTS coffee_availability (
  cycle_id    bigint NOT NULL REFERENCES coffee_cycles (id) ON DELETE CASCADE,
  user_id     uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  slot        text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (cycle_id, user_id, slot)
);

CREATE INDEX IF NOT EXISTS coffee_availability_cycle_slot_idx
  ON coffee_availability (cycle_id, slot);

CREATE TABLE IF NOT EXISTS coffee_matches (
  id          bigserial PRIMARY KEY,
  cycle_id    bigint NOT NULL REFERENCES coffee_cycles (id) ON DELETE CASCADE,
  /* Слот, который подошел всем участникам пары. */
  slot        text NOT NULL,
  location    text NOT NULL DEFAULT '',
  status      text NOT NULL DEFAULT 'scheduled'
              CHECK (status IN ('scheduled', 'done', 'cancelled')),
  /* Когда участникам отправлено напоминание «пора на кофе-брейк». */
  reminder_sent_at timestamptz,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Участники пары вынесены в отдельную таблицу, чтобы при нечетном количестве
-- сотрудников можно было собрать тройку, а не отбрасывать «лишнего».
--
-- cycle_id здесь денормализован намеренно: он позволяет одним уникальным
-- индексом гарантировать, что в рамках цикла сотрудник участвует ровно в одной
-- встрече. Через ссылку на coffee_matches такое ограничение на уровне схемы
-- выразить нельзя.
CREATE TABLE IF NOT EXISTS coffee_match_members (
  match_id  bigint NOT NULL REFERENCES coffee_matches (id) ON DELETE CASCADE,
  cycle_id  bigint NOT NULL REFERENCES coffee_cycles (id) ON DELETE CASCADE,
  user_id   uuid NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  PRIMARY KEY (match_id, user_id),
  UNIQUE (cycle_id, user_id)
);

CREATE INDEX IF NOT EXISTS coffee_match_members_user_idx
  ON coffee_match_members (user_id);

-- ---------------------------------------------------------------------------
-- 4. Личные уведомления
--
-- Таблица notifications обслуживала только администраторов, поэтому сотрудник
-- не мог получить сообщение «вам подобран коллега». Добавляем адресата и
-- аудиторию; существующие записи остаются административными.
-- ---------------------------------------------------------------------------
ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES users (id) ON DELETE CASCADE;

ALTER TABLE notifications
  ADD COLUMN IF NOT EXISTS audience text NOT NULL DEFAULT 'admin';

ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_audience_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_audience_check
  CHECK (audience IN ('admin', 'user'));

-- Личное уведомление обязано иметь адресата.
ALTER TABLE notifications
  DROP CONSTRAINT IF EXISTS notifications_user_required_check;
ALTER TABLE notifications
  ADD CONSTRAINT notifications_user_required_check
  CHECK (audience <> 'user' OR user_id IS NOT NULL);

CREATE INDEX IF NOT EXISTS notifications_user_idx
  ON notifications (user_id, read, created_at DESC);
