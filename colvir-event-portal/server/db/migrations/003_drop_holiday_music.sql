-- Музыкальный плеер и плейлист убраны из продукта по решению продакт-оунера:
-- в праздничном разделе остается только чат.

DROP TABLE IF EXISTS holiday_tracks;

ALTER TABLE holiday_chat_messages DROP COLUMN IF EXISTS music_track;
