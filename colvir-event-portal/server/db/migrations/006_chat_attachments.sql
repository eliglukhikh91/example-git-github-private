-- ---------------------------------------------------------------------------
-- Изображения в чате.
--
-- Сами файлы лежат на диске (каталог задается через UPLOADS_DIR), в базе —
-- только метаданные. Класть двадцатимегабайтные картинки в bytea не стали
-- намеренно: они попадают в WAL и в каждый дамп, из-за чего база и бэкапы
-- растут кратно, а выборка сообщений начинает тянуть блобы вместе с текстом.
--
-- storage_path хранится относительным (например «2026/08/ab12….png»): при
-- переносе на другой сервер меняется только UPLOADS_DIR, база остается как есть.
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS chat_attachments (
  id            uuid PRIMARY KEY,
  message_id    text REFERENCES chat_messages (id) ON DELETE CASCADE,
  uploaded_by   uuid REFERENCES users (id) ON DELETE SET NULL,
  file_name     text NOT NULL,
  mime_type     text NOT NULL,
  byte_size     bigint NOT NULL,
  storage_path  text NOT NULL,
  created_at    timestamptz NOT NULL DEFAULT now()
);

-- Лента грузится пачкой сообщений, вложения подтягиваются к ним одним запросом.
CREATE INDEX IF NOT EXISTS chat_attachments_message_idx
  ON chat_attachments (message_id);

-- Тип проверяется по сигнатуре файла при загрузке; ограничение в базе — вторая
-- линия обороны на случай, если запись пойдет мимо обычного маршрута.
-- SVG отсутствует в списке намеренно: он умеет исполнять скрипты.
ALTER TABLE chat_attachments
  DROP CONSTRAINT IF EXISTS chat_attachments_mime_check;
ALTER TABLE chat_attachments
  ADD CONSTRAINT chat_attachments_mime_check
  CHECK (mime_type IN ('image/png', 'image/jpeg', 'image/gif', 'image/webp'));

-- Сообщение может состоять из одной картинки. Колонка остается NOT NULL, а
-- «без подписи» выражается пустой строкой: иначе null пришлось бы обрабатывать
-- в каждом месте, где выводится текст сообщения.
ALTER TABLE chat_messages
  ALTER COLUMN text SET DEFAULT '';
