-- ---------------------------------------------------------------------------
-- Тег праздничной темы у мероприятия.
--
-- Подборка под баннером раньше собиралась подстрокой по свободным тегам
-- («новый год» внутри tags), что ломалось от любой опечатки и от тега вроде
-- «новый формат». Теперь связь явная: администратор выбирает тему из списка.
--
-- NULL означает «в подборки не попадает» — это обычное состояние большинства
-- мероприятий, поэтому значения по умолчанию нет.
-- ---------------------------------------------------------------------------

ALTER TABLE events
  ADD COLUMN IF NOT EXISTS theme_tag text;

ALTER TABLE events
  DROP CONSTRAINT IF EXISTS events_theme_tag_check;
ALTER TABLE events
  ADD CONSTRAINT events_theme_tag_check
  CHECK (theme_tag IS NULL OR theme_tag IN ('newyear', 'spring', 'birthday'));

-- Подборка запрашивается на каждой загрузке дайджеста, а помеченных
-- мероприятий немного — частичный индекс не тянет за собой остальные строки.
CREATE INDEX IF NOT EXISTS events_theme_tag_idx
  ON events (theme_tag)
  WHERE theme_tag IS NOT NULL;
