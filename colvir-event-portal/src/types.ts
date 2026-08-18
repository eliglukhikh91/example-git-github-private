export type EventCategory = 'team-game' | 'speaking-club' | 'coffee-break' | 'book-club' | 'workshop' | 'other';

export interface EventItem {
  id: string;
  title: string;
  description: string;
  category: EventCategory;
  isTeamGame: boolean;
  maxTeamSize?: number; // Например, 5 участников в команде
  maxParticipants: number;
  date: string;
  timeSlots: string[];
  location: string;
  meetingUrl?: string;
  imageUrl: string;
  createdAt: string;
  organizer: string;
  tags: string[];
}

export interface Participant {
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

export interface Team {
  id: string;
  eventId: string;
  name: string;
  captainId?: string;
  captainName?: string;
  members: Participant[];
  createdAt: string;
}

/**
 * Профиль сотрудника.
 *
 * ФИО, email, отдел и должность приходят из Active Directory и на портале
 * не редактируются. Пользователь меняет только telegram, телефон, интересы
 * и аватар.
 */
export interface UserProfile {
  id: string;
  firstName: string;
  lastName: string;
  displayName: string;
  email: string;
  upn: string;
  telegram: string;
  phone: string;
  department: string;
  title: string;
  interests: string[];
  avatarUrl?: string;
  role: 'user' | 'admin';
  isAdmin: boolean;
  /** CN групп Active Directory, в которые входит сотрудник. */
  adGroups: string[];
  adSyncedAt: string | null;
}

export interface CMSContent {
  holidayBannerSpringText: string;
  holidayBannerBirthdayText: string;
  holidayBannerNewYearText: string;
  randomCoffeeTitle: string;
  randomCoffeeDescription: string;
  randomCoffeeFormat: string;
  randomCoffeeDuration: string;
}

export interface AdminNotification {
  id: string;
  /** 'admin' — лента администратора, 'user' — личное уведомление сотрудника. */
  audience: 'admin' | 'user';
  userId: string | null;
  eventId: string | null;
  eventTitle: string;
  participantName: string;
  isTeamGame: boolean;
  teamName?: string;
  role?: string;
  timeSlot?: string;
  timestamp: string;
  read: boolean;
  type?:
    | 'registration'
    | 'random_coffee_match'
    | 'random_coffee_reminder'
    | 'direct_message'
    | string;
  messageText?: string;
}

export interface EventRating {
  id: string;
  eventId: string;
  eventTitle: string;
  userEmail: string;
  userName: string;
  rating: number; // от 1 до 10
  comment?: string;
  timestamp: string;
}

export type ViewMode =
  | 'digest'
  | 'teams'
  | 'my-events'
  | 'admin-manage'
  | 'random-coffee'
  | 'chat';

export type ThemeType = 'classic' | 'spring' | 'birthday' | 'newyear';

export interface ChatMessage {
  id: string;
  /**
   * Канал сообщения. Пока в интерфейсе только общий 'general', но поле есть
   * с самого начала — чтобы при добавлении групп по интересам не переписывать
   * структуру данных и не переносить историю.
   */
  channelId: string;
  author: string;
  department: string;
  text: string;
  time: string;
}

export interface ChatChannel {
  id: string;
  name: string;
}

/** Состояние подключения к контроллеру домена, отдается /api/auth/ad/status. */
export interface DirectoryStatus {
  status: string;
  domain: string;
  directory: 'ldap' | 'file';
  protocol: string;
  ssoEnabled: boolean;
  allowedDomains: string[];
  serverTimeMoscow: string;
}

// ---------------------------------------------------------------------------
// Random Coffee
// ---------------------------------------------------------------------------

/**
 * Цикл подбора: сотрудники отмечают удобные слоты до дедлайна, затем сервер
 * разбивает всех на пары по общему слоту.
 */
export interface CoffeeCycle {
  id: number;
  title: string;
  meetingDate: string;
  registrationEndsAt: string;
  status: 'open' | 'matched' | 'cancelled';
  matchedAt: string | null;
}

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

/** Все состояние экрана Random Coffee, приходит одним запросом. */
export interface CoffeeState {
  cycle: CoffeeCycle | null;
  slots: string[];
  myAvailability: string[];
  /** Сколько человек отметили каждый слот — подсказка «где больше шансов». */
  slotDemand: Record<string, number>;
  participants: number;
  myMatch: CoffeeMatch | null;
}
