-- Базовая схема портала корпоративных мероприятий Colvir.
-- Всё, что раньше жило в localStorage браузера, теперь хранится здесь.

CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ---------------------------------------------------------------------------
-- Пользователи. Источник истины — Active Directory; таблица хранит только
-- проекцию профиля AD плюс поля, которые сотрудник редактирует сам.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  upn               text NOT NULL UNIQUE,
  sam_account_name  text,
  email             text NOT NULL,
  first_name        text NOT NULL DEFAULT '',
  last_name         text NOT NULL DEFAULT '',
  display_name      text NOT NULL DEFAULT '',
  department        text NOT NULL DEFAULT '',
  title             text NOT NULL DEFAULT '',
  company           text NOT NULL DEFAULT '',
  telegram          text NOT NULL DEFAULT '',
  phone             text NOT NULL DEFAULT '',
  interests         text[] NOT NULL DEFAULT '{}',
  avatar_url        text,
  role              text NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  ad_groups         text[] NOT NULL DEFAULT '{}',
  ad_synced_at      timestamptz,
  last_login_at     timestamptz,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS users_email_idx ON users (lower(email));

-- ---------------------------------------------------------------------------
-- Мероприятия
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS events (
  id                text PRIMARY KEY,
  title             text NOT NULL,
  description       text NOT NULL DEFAULT '',
  category          text NOT NULL DEFAULT 'other',
  is_team_game      boolean NOT NULL DEFAULT false,
  max_team_size     integer,
  max_participants  integer NOT NULL DEFAULT 0,
  event_date        text NOT NULL DEFAULT '',
  time_slots        text[] NOT NULL DEFAULT '{}',
  location          text NOT NULL DEFAULT '',
  meeting_url       text,
  image_url         text NOT NULL DEFAULT '',
  organizer         text NOT NULL DEFAULT '',
  tags              text[] NOT NULL DEFAULT '{}',
  created_by        uuid REFERENCES users (id) ON DELETE SET NULL,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS events_category_idx ON events (category);

-- ---------------------------------------------------------------------------
-- Записи участников на мероприятия
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS participants (
  id            text PRIMARY KEY,
  event_id      text NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  user_id       uuid REFERENCES users (id) ON DELETE SET NULL,
  first_name    text NOT NULL DEFAULT '',
  last_name     text NOT NULL DEFAULT '',
  email         text NOT NULL,
  telegram      text,
  department    text,
  time_slot     text,
  is_team_game  boolean NOT NULL DEFAULT false,
  team_name     text,
  role          text CHECK (role IN ('captain', 'player')),
  status        text NOT NULL DEFAULT 'confirmed'
                CHECK (status IN ('confirmed', 'waitlist', 'cancelled')),
  registered_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS participants_event_idx ON participants (event_id);
CREATE INDEX IF NOT EXISTS participants_email_idx ON participants (lower(email));

-- Один сотрудник не может записаться на одно мероприятие дважды,
-- пока предыдущая запись не отменена.
CREATE UNIQUE INDEX IF NOT EXISTS participants_active_registration_idx
  ON participants (event_id, lower(email))
  WHERE status <> 'cancelled';

-- ---------------------------------------------------------------------------
-- Уведомления администраторам
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS notifications (
  id                text PRIMARY KEY,
  event_id          text REFERENCES events (id) ON DELETE CASCADE,
  event_title       text NOT NULL DEFAULT '',
  participant_name  text NOT NULL DEFAULT '',
  is_team_game      boolean NOT NULL DEFAULT false,
  team_name         text,
  role              text,
  time_slot         text,
  type              text NOT NULL DEFAULT 'registration',
  message_text      text,
  read              boolean NOT NULL DEFAULT false,
  created_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS notifications_read_idx ON notifications (read, created_at DESC);

-- ---------------------------------------------------------------------------
-- Оценки мероприятий
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS ratings (
  id           text PRIMARY KEY,
  event_id     text NOT NULL REFERENCES events (id) ON DELETE CASCADE,
  event_title  text NOT NULL DEFAULT '',
  user_email   text NOT NULL,
  user_name    text NOT NULL DEFAULT '',
  rating       integer NOT NULL CHECK (rating BETWEEN 1 AND 10),
  comment      text,
  created_at   timestamptz NOT NULL DEFAULT now()
);

-- Одна оценка на сотрудника и мероприятие; повторная отправка перезаписывает.
CREATE UNIQUE INDEX IF NOT EXISTS ratings_event_user_idx
  ON ratings (event_id, lower(user_email));

-- ---------------------------------------------------------------------------
-- Редактируемый контент (CMS), слоты Random Coffee, теги организаторов
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS cms_content (
  key         text PRIMARY KEY,
  value       text NOT NULL DEFAULT '',
  updated_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS coffee_slots (
  slot        text PRIMARY KEY,
  position    integer NOT NULL DEFAULT 0,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS organizer_tags (
  tag         text PRIMARY KEY,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Праздничный чат и плейлист
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS holiday_chat_messages (
  id          text PRIMARY KEY,
  user_id     uuid REFERENCES users (id) ON DELETE SET NULL,
  author      text NOT NULL DEFAULT '',
  department  text NOT NULL DEFAULT '',
  text        text NOT NULL,
  music_track jsonb,
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS holiday_chat_created_idx ON holiday_chat_messages (created_at);

CREATE TABLE IF NOT EXISTS holiday_tracks (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  artist      text NOT NULL DEFAULT '',
  duration    text NOT NULL DEFAULT '',
  mood        text NOT NULL DEFAULT '',
  added_by    text NOT NULL DEFAULT '',
  audio_url   text,
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------------
-- Журнал аутентификации. В интерфейсе заявлено, что попытки входа логируются —
-- эта таблица делает утверждение правдой.
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS auth_audit_log (
  id           bigserial PRIMARY KEY,
  occurred_at  timestamptz NOT NULL DEFAULT now(),
  event_type   text NOT NULL,
  upn          text,
  success      boolean NOT NULL,
  reason       text,
  ip_address   text,
  user_agent   text,
  details      jsonb
);

CREATE INDEX IF NOT EXISTS auth_audit_occurred_idx ON auth_audit_log (occurred_at DESC);
CREATE INDEX IF NOT EXISTS auth_audit_upn_idx ON auth_audit_log (lower(upn), occurred_at DESC);
