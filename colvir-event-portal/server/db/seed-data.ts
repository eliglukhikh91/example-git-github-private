/**
 * Демонстрационное наполнение портала.
 *
 * Заливается только явной командой `npm run seed` и только когда база пуста.
 * В production запускать не требуется — администратор создает мероприятия сам.
 */

export interface SeedEvent {
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
  imageUrl: string;
  organizer: string;
  tags: string[];
  themeTag?: 'newyear' | 'spring' | 'birthday' | null;
}

export interface SeedParticipant {
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
}

export const SEED_EVENTS: SeedEvent[] = [
  {
    id: 'evt-001',
    title: 'Корпоративный Квиз Colvir 2026: Битва Эрудитов',
    description:
      'Интеллектуальная командная викторина из 6 раундов! Проверьте логику, командную сплоченность и эрудицию. Вас ждут призы, вкусные угощения и звание чемпионов Colvir 2026.',
    category: 'team-game',
    isTeamGame: true,
    maxTeamSize: 5,
    maxParticipants: 50,
    date: '12 августа 2026',
    timeSlots: ['18:00 - 20:30 (МСК)'],
    location: 'Главный конференц-зал (4 этаж) / Трансляция',
    imageUrl:
      'https://images.unsplash.com/photo-1511632765486-a01980e01a18?w=800&auto=format&fit=crop&q=80',
    organizer: 'HR & Event Team',
    tags: ['Командная игра', 'Интеллект', 'Квиз', 'Вечер'],
    themeTag: 'birthday'
  },
  {
    id: 'evt-002',
    title: 'English Speaking Club: Tech Trends & AI',
    description:
      'Неформальное общение на английском языке с носителем. Обсуждаем последние технологические тренды, тренажер публичных выступлений и бизнес-лексику.',
    category: 'speaking-club',
    isTeamGame: false,
    maxParticipants: 30,
    date: '14 августа 2026',
    timeSlots: ['11:00 - 12:00 (МСК)', '15:00 - 16:00 (МСК)', '18:00 - 19:00 (МСК)'],
    location: 'Переговорная "Орион" (2 этаж) & MS Teams',
    imageUrl:
      'https://images.unsplash.com/photo-1528605248644-14dd04022da1?w=800&auto=format&fit=crop&q=80',
    organizer: 'Colvir Education Center',
    tags: ['Английский', 'Speaking', 'Карьера', 'Практика']
  },
  {
    id: 'evt-003',
    title: '15-минутный Кофе-брейк & Random Coffee Рандомайзер',
    description:
      'Запишитесь на быстрый 15-минутный кофе-брейк! Выберите удобное время, и наш встроенный умный рандомайзер автоматически подберет вам случайного собеседника среди коллег для неформального общения за чашкой кофе.',
    category: 'coffee-break',
    isTeamGame: false,
    maxParticipants: 60,
    date: '18 августа 2026',
    timeSlots: [
      '10:00 - 10:15 (МСК)',
      '10:15 - 10:30 (МСК)',
      '11:30 - 11:45 (МСК)',
      '12:00 - 12:15 (МСК)',
      '15:00 - 15:15 (МСК)',
      '15:15 - 15:30 (МСК)',
      '16:30 - 16:45 (МСК)'
    ],
    location: 'Коворкинг 3 этажа / Онлайн MS Teams',
    imageUrl:
      'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?w=800&auto=format&fit=crop&q=80',
    organizer: 'HR & Сообщество Colvir',
    tags: ['15 минут', 'Кофе-брейк', 'Рандомайзер', 'Random Coffee', 'Собеседник', 'Нетворкинг']
  },
  {
    id: 'evt-004',
    title: 'Книжный клуб: Обсуждаем "Атомные привычки" Джеймса Клира',
    description:
      'Разбираем, как небольшие изменения дают выдающиеся результаты в работе и жизни. Участники получат электронный конспект и полезный трекер привычек.',
    category: 'book-club',
    isTeamGame: false,
    maxParticipants: 20,
    date: '20 августа 2026',
    timeSlots: ['18:30 - 20:00 (МСК)'],
    location: 'Библиотека компании & Zoom',
    imageUrl:
      'https://images.unsplash.com/photo-1512820790803-83ca734da794?w=800&auto=format&fit=crop&q=80',
    organizer: 'Colvir Book Club',
    tags: ['Книги', 'Продуктивность', 'Саморазвитие'],
    themeTag: 'spring'
  },
  {
    id: 'evt-005',
    title: 'Турнир по Волейболу: Летний Кубок Colvir',
    description:
      'Командный спортивный турнир на открытой площадке. Собирайте команду от своего отдела или присоединяйтесь к сборным командам.',
    category: 'team-game',
    isTeamGame: true,
    maxTeamSize: 6,
    maxParticipants: 36,
    date: '22 августа 2026',
    timeSlots: ['10:00 - 14:00 (МСК)'],
    location: 'Спортивный комплекс "Динамо"',
    imageUrl:
      'https://images.unsplash.com/photo-1612872087720-bb876e2e67d1?w=800&auto=format&fit=crop&q=80',
    organizer: 'Спорт-комитет Colvir',
    tags: ['Спорт', 'Волейбол', 'Командная игра', 'На свежем воздухе'],
    themeTag: 'newyear'
  }
];

export const SEED_PARTICIPANTS: SeedParticipant[] = [
  {
    id: 'part-101',
    eventId: 'evt-001',
    firstName: 'Михаил',
    lastName: 'Сергеев',
    email: 'm.sergeev@colvir.com',
    telegram: '@misha_dev',
    department: 'Департамент бэкенда',
    isTeamGame: true,
    teamName: 'Альфа-Кодеры',
    role: 'captain',
    registeredAt: '2026-07-25T10:15:00Z'
  },
  {
    id: 'part-102',
    eventId: 'evt-001',
    firstName: 'Анна',
    lastName: 'Воронцова',
    email: 'a.vorontsova@colvir.com',
    telegram: '@ann_v',
    department: 'Аналитика данных',
    isTeamGame: true,
    teamName: 'Альфа-Кодеры',
    role: 'player',
    registeredAt: '2026-07-25T10:20:00Z'
  },
  {
    id: 'part-103',
    eventId: 'evt-001',
    firstName: 'Дмитрий',
    lastName: 'Ковалев',
    email: 'd.kovalev@colvir.com',
    telegram: '@dima_k',
    department: 'Департамент бэкенда',
    isTeamGame: true,
    teamName: 'Альфа-Кодеры',
    role: 'player',
    registeredAt: '2026-07-25T11:00:00Z'
  },
  {
    id: 'part-104',
    eventId: 'evt-001',
    firstName: 'Ольга',
    lastName: 'Соколова',
    email: 'o.sokolova@colvir.com',
    telegram: '@olga_design',
    department: 'UI/UX Дизайн',
    isTeamGame: true,
    teamName: 'Пиксельные Гении',
    role: 'captain',
    registeredAt: '2026-07-25T12:30:00Z'
  },
  {
    id: 'part-105',
    eventId: 'evt-001',
    firstName: 'Артем',
    lastName: 'Павлов',
    email: 'a.pavlov@colvir.com',
    telegram: '@artem_p',
    department: 'UI/UX Дизайн',
    isTeamGame: true,
    teamName: 'Пиксельные Гении',
    role: 'player',
    registeredAt: '2026-07-25T13:00:00Z'
  },
  {
    id: 'part-106',
    eventId: 'evt-002',
    firstName: 'Елена',
    lastName: 'Глухих',
    email: 'e.glukhikh@colvir.com',
    telegram: '@elena_colvir',
    department: 'Департамент разработки и инноваций',
    timeSlot: '15:00 - 16:00 (МСК)',
    isTeamGame: false,
    registeredAt: '2026-07-26T09:00:00Z'
  },
  {
    id: 'part-107',
    eventId: 'evt-003',
    firstName: 'Сергей',
    lastName: 'Николаев',
    email: 's.nikolaev@colvir.com',
    telegram: '@s_nik',
    department: 'Тестирование QA',
    timeSlot: '15:00 - 15:15 (МСК)',
    isTeamGame: false,
    registeredAt: '2026-07-26T14:15:00Z'
  },
  {
    id: 'part-108',
    eventId: 'evt-003',
    firstName: 'Анастасия',
    lastName: 'Белова',
    email: 'a.belova@colvir.com',
    telegram: '@nastya_colvir',
    department: 'Департамент маркетинга & PR',
    timeSlot: '15:00 - 15:15 (МСК)',
    isTeamGame: false,
    registeredAt: '2026-07-27T09:30:00Z'
  },
  {
    id: 'part-109',
    eventId: 'evt-003',
    firstName: 'Александр',
    lastName: 'Морозов',
    email: 'a.morozov@colvir.com',
    telegram: '@sasha_m',
    department: 'Архитектура и DevOps',
    timeSlot: '10:00 - 10:15 (МСК)',
    isTeamGame: false,
    registeredAt: '2026-07-27T11:00:00Z'
  },
  {
    id: 'part-110',
    eventId: 'evt-003',
    firstName: 'Екатерина',
    lastName: 'Зайцева',
    email: 'e.zaytseva@colvir.com',
    telegram: '@katya_design',
    department: 'UI/UX Дизайн',
    timeSlot: '15:15 - 15:30 (МСК)',
    isTeamGame: false,
    registeredAt: '2026-07-27T12:45:00Z'
  },
  {
    id: 'part-111',
    eventId: 'evt-003',
    firstName: 'Павел',
    lastName: 'Климов',
    email: 'p.klimov@colvir.com',
    telegram: '@pavel_k',
    department: 'Бизнес-аналитика',
    timeSlot: '11:30 - 11:45 (МСК)',
    isTeamGame: false,
    registeredAt: '2026-07-28T08:15:00Z'
  }
];

export const SEED_RATINGS = [
  {
    id: 'rate-1',
    eventId: 'evt-001',
    userEmail: 'e.glukhikh@colvir.com',
    userName: 'Глухих Елена',
    rating: 10,
    comment: 'Отличные вопросы по k8s и Kafka! Было очень динамично.'
  },
  {
    id: 'rate-2',
    eventId: 'evt-001',
    userEmail: 'a.belova@colvir.com',
    userName: 'Белова Анастасия',
    rating: 9,
    comment: 'Супер квиз, ждем следующего раунда!'
  },
  {
    id: 'rate-3',
    eventId: 'evt-002',
    userEmail: 's.nikolaev@colvir.com',
    userName: 'Николаев Сергей',
    rating: 9,
    comment: 'Great discussion on open banking APIs!'
  },
  {
    id: 'rate-4',
    eventId: 'evt-003',
    userEmail: 'a.morozov@colvir.com',
    userName: 'Морозов Александр',
    rating: 10,
    comment: 'Познакомились с новым коллегой из QA, очень душевный перерыв.'
  },
  {
    id: 'rate-5',
    eventId: 'evt-004',
    userEmail: 'e.zaytseva@colvir.com',
    userName: 'Зайцева Екатерина',
    rating: 8,
    comment: 'Хороший разбор первых 3 глав книги Эрика Эванса.'
  }
];

export const SEED_HOLIDAY_CHAT = [
  {
    id: 'hchat-1',
    author: 'Анна Васильева',
    department: 'Департамент QA',
    text: 'Отличный праздничный режим! Поздравляю всю команду Colvir!'
  },
  {
    id: 'hchat-2',
    author: 'Михаил Соколов',
    department: 'Разработка Backend',
    text: 'Присоединяюсь к поздравлениям, отличная работа за квартал.'
  },
  {
    id: 'hchat-3',
    author: 'Елена Смирнова',
    department: 'HR & Корпоративная культура',
    text: 'Всем хорошего настроения и отличного дня!'
  }
];
