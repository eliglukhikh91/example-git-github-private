-- Базовое наполнение редактируемого контента.
-- Это не демо-данные, а значения по умолчанию для интерфейса,
-- которые администратор затем меняет через панель управления.

INSERT INTO cms_content (key, value) VALUES
  ('holidayBannerSpringText',   'Colvir Spring: Атмосфера свежести и весеннего вдохновения!'),
  ('holidayBannerBirthdayText', 'День Рождения Colvir: Празднуем успехи компании вместе!'),
  ('holidayBannerNewYearText',  'Новый Год в Colvir: Зимняя сказка, белые снежинки и праздник!'),
  ('randomCoffeeTitle',         'Добро пожаловать в Random coffee!'),
  ('randomCoffeeDescription',   'Отвлекитесь от задач на 15 минут! Выберите удобный слот, и наш умный рандомайзер подберет вам случайного коллегу из любого отдела Colvir для неформального знакомства за чашкой кофе.'),
  ('randomCoffeeFormat',        'Онлайн (Zoom)'),
  ('randomCoffeeDuration',      '15 минут')
ON CONFLICT (key) DO NOTHING;

INSERT INTO coffee_slots (slot, position) VALUES
  ('10:00 - 10:15 (МСК)', 1),
  ('10:15 - 10:30 (МСК)', 2),
  ('11:30 - 11:45 (МСК)', 3),
  ('12:00 - 12:15 (МСК)', 4),
  ('15:00 - 15:15 (МСК)', 5),
  ('15:15 - 15:30 (МСК)', 6),
  ('16:30 - 16:45 (МСК)', 7)
ON CONFLICT (slot) DO NOTHING;

INSERT INTO organizer_tags (tag) VALUES
  ('Colvir Event Team'),
  ('Colvir Booking Club'),
  ('Colvir Tech Hub'),
  ('Colvir HR Dept')
ON CONFLICT (tag) DO NOTHING;
