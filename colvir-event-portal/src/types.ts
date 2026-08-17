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
  eventId: string | null;
  eventTitle: string;
  participantName: string;
  isTeamGame: boolean;
  teamName?: string;
  role?: string;
  timeSlot?: string;
  timestamp: string;
  read: boolean;
  type?: 'registration' | 'random_coffee_match' | 'direct_message' | 'zoom_invite' | string;
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
  | 'holiday-chat';

export type ThemeType = 'classic' | 'spring' | 'birthday' | 'newyear';

export interface HolidayChatMessage {
  id: string;
  author: string;
  department: string;
  text: string;
  time: string;
}

/** Состояние подключения к контроллеру домена, отдаётся /api/auth/ad/status. */
export interface DirectoryStatus {
  status: string;
  domain: string;
  directory: 'ldap' | 'file';
  protocol: string;
  ssoEnabled: boolean;
  allowedDomains: string[];
  serverTimeMoscow: string;
}
