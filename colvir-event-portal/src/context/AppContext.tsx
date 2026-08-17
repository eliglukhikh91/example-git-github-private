import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import confetti from 'canvas-confetti';
import { api, ApiError } from '../api/client';
import { useAuth } from './AuthContext';
import {
  EventItem,
  Participant,
  Team,
  UserProfile,
  AdminNotification,
  ViewMode,
  ThemeType,
  CMSContent,
  EventRating,
  HolidayChatMessage,
  HolidayTrack
} from '../types';

/**
 * Все данные портала хранятся на сервере в PostgreSQL.
 *
 * В localStorage остаётся единственная вещь — выбранная тема оформления. Это
 * настройка внешнего вида конкретного браузера, она не касается ни сотрудников,
 * ни мероприятий, поэтому синхронизировать её между устройствами не нужно.
 */
const THEME_STORAGE_KEY = 'colvir_theme_v1';

const EMPTY_CMS: CMSContent = {
  holidayBannerSpringText: '',
  holidayBannerBirthdayText: '',
  holidayBannerNewYearText: '',
  randomCoffeeTitle: '',
  randomCoffeeDescription: '',
  randomCoffeeFormat: '',
  randomCoffeeDuration: ''
};

export interface ActionResult {
  success: boolean;
  message: string;
}

interface AppContextType {
  events: EventItem[];
  participants: Participant[];
  notifications: AdminNotification[];
  userProfile: UserProfile;
  cmsContent: CMSContent;
  coffeeSlots: string[];
  isAdmin: boolean;
  isAdAuthenticated: boolean;
  adDomain: string;
  adLastSync: string;
  activeView: ViewMode;
  searchQuery: string;
  selectedCategory: string;
  unreadCount: number;
  theme: ThemeType;
  isThemeModalOpen: boolean;
  organizerTags: string[];
  ratings: EventRating[];
  holidayChatMessages: HolidayChatMessage[];
  holidayPlaylistTracks: HolidayTrack[];

  /** true, пока идёт первичная загрузка данных с сервера. */
  isLoading: boolean;
  /** Текст последней ошибки обращения к API, если она была. */
  lastError: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;

  setActiveView: (view: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: string) => void;
  setTheme: (theme: ThemeType) => void;
  setIsThemeModalOpen: (open: boolean) => void;
  openThemeModal: (targetTheme?: ThemeType) => void;

  updateUserProfile: (profile: UserProfile) => Promise<void>;
  updateCMSContent: (newContent: Partial<CMSContent>) => Promise<void>;
  addCoffeeSlot: (slot: string) => Promise<void>;
  deleteCoffeeSlot: (slot: string) => Promise<void>;
  addOrganizerTag: (tag: string) => Promise<void>;
  addNotification: (
    notif: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>
  ) => Promise<void>;
  addEventRating: (data: {
    eventId: string;
    eventTitle: string;
    rating: number;
    comment?: string;
  }) => Promise<void>;
  getEventAverageRating: (eventId: string) => number;
  addHolidayChatMessage: (
    msgText: string,
    musicTrack?: { title: string; artist?: string; duration?: string; mood?: string }
  ) => Promise<void>;
  addHolidayTrack: (track: {
    title: string;
    artist: string;
    duration?: string;
    mood?: string;
  }) => Promise<void>;

  registerForEvent: (data: {
    eventId: string;
    firstName: string;
    lastName: string;
    telegram?: string;
    department?: string;
    timeSlot?: string;
    teamName?: string;
    role?: 'captain' | 'player';
  }) => Promise<Participant>;

  cancelRegistration: (participantId: string) => Promise<void>;
  createEvent: (eventData: Omit<EventItem, 'id' | 'createdAt'>) => Promise<void>;
  updateEvent: (event: EventItem) => Promise<void>;
  deleteEvent: (eventId: string) => Promise<void>;
  markNotificationAsRead: (id: string) => Promise<void>;
  markAllNotificationsAsRead: () => Promise<void>;

  getTeamsForEvent: (eventId: string) => Team[];
  getParticipantsForEvent: (eventId: string) => Participant[];
  getUserRegistrations: () => Participant[];
  getTotalStats: () => {
    totalParticipants: number;
    totalTeams: number;
    totalEvents: number;
    upcomingCount: number;
  };
}

const AppContext = createContext<AppContextType | undefined>(undefined);

function readStoredTheme(): ThemeType {
  const saved = localStorage.getItem(THEME_STORAGE_KEY);
  return saved === 'spring' || saved === 'birthday' || saved === 'newyear' ? saved : 'classic';
}

interface BootstrapResponse {
  user: UserProfile;
  events: EventItem[];
  participants: Participant[];
  cmsContent: Partial<CMSContent>;
  coffeeSlots: string[];
  organizerTags: string[];
  ratings: EventRating[];
  notifications: AdminNotification[];
}

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAdmin, directoryStatus, updateOwnProfile } = useAuth();

  const [events, setEvents] = useState<EventItem[]>([]);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [notifications, setNotifications] = useState<AdminNotification[]>([]);
  const [cmsContent, setCmsContent] = useState<CMSContent>(EMPTY_CMS);
  const [coffeeSlots, setCoffeeSlots] = useState<string[]>([]);
  const [organizerTags, setOrganizerTags] = useState<string[]>([]);
  const [ratings, setRatings] = useState<EventRating[]>([]);
  const [holidayChatMessages, setHolidayChatMessages] = useState<HolidayChatMessage[]>([]);
  const [holidayPlaylistTracks, setHolidayPlaylistTracks] = useState<HolidayTrack[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<ViewMode>('digest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [theme, setTheme] = useState<ThemeType>(readStoredTheme);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  }, [theme]);

  const reportError = useCallback((error: unknown, fallback: string) => {
    const message =
      error instanceof ApiError
        ? error.message
        : error instanceof Error && error.message
          ? error.message
          : fallback;
    setLastError(message);
    console.error('[app]', fallback, error);
  }, []);

  const refresh = useCallback(async () => {
    if (!user) return;
    try {
      const data = await api.get<BootstrapResponse>('/api/bootstrap');
      setEvents(data.events);
      setParticipants(data.participants);
      setCmsContent({ ...EMPTY_CMS, ...data.cmsContent });
      setCoffeeSlots(data.coffeeSlots);
      setOrganizerTags(data.organizerTags);
      setRatings(data.ratings);
      setNotifications(data.notifications ?? []);
    } catch (error) {
      reportError(error, 'Не удалось загрузить данные портала');
    }
  }, [user, reportError]);

  useEffect(() => {
    if (!user) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    void refresh().finally(() => setIsLoading(false));
  }, [user, refresh]);

  // Праздничный чат и плейлист подгружаются отдельно — они нужны только при
  // открытии тематического окна и обновляются чаще остальных данных.
  const refreshHoliday = useCallback(async () => {
    if (!user) return;
    try {
      const [messages, tracks] = await Promise.all([
        api.get<{ messages: HolidayChatMessage[] }>('/api/holiday/messages'),
        api.get<{ tracks: HolidayTrack[] }>('/api/holiday/tracks')
      ]);
      setHolidayChatMessages(messages.messages);
      setHolidayPlaylistTracks(tracks.tracks);
    } catch (error) {
      reportError(error, 'Не удалось загрузить праздничный чат');
    }
  }, [user, reportError]);

  useEffect(() => {
    void refreshHoliday();
  }, [refreshHoliday]);

  const openThemeModal = useCallback((targetTheme?: ThemeType) => {
    if (targetTheme) setTheme(targetTheme);
    setIsThemeModalOpen(true);
  }, []);

  // ---------------------------------------------------------------------------
  // Мероприятия
  // ---------------------------------------------------------------------------
  const createEvent = useCallback(
    async (eventData: Omit<EventItem, 'id' | 'createdAt'>) => {
      try {
        const { event } = await api.post<{ event: EventItem }>('/api/events', eventData);
        setEvents((prev) => [event, ...prev]);
      } catch (error) {
        reportError(error, 'Не удалось создать мероприятие');
        throw error;
      }
    },
    [reportError]
  );

  const updateEvent = useCallback(
    async (updated: EventItem) => {
      try {
        const { event } = await api.put<{ event: EventItem }>(
          `/api/events/${encodeURIComponent(updated.id)}`,
          updated
        );
        setEvents((prev) => prev.map((item) => (item.id === event.id ? event : item)));
      } catch (error) {
        reportError(error, 'Не удалось сохранить изменения мероприятия');
        throw error;
      }
    },
    [reportError]
  );

  const deleteEvent = useCallback(
    async (eventId: string) => {
      try {
        await api.delete(`/api/events/${encodeURIComponent(eventId)}`);
        setEvents((prev) => prev.filter((item) => item.id !== eventId));
        setParticipants((prev) => prev.filter((item) => item.eventId !== eventId));
      } catch (error) {
        reportError(error, 'Не удалось удалить мероприятие');
        throw error;
      }
    },
    [reportError]
  );

  // ---------------------------------------------------------------------------
  // Записи на мероприятия
  // ---------------------------------------------------------------------------
  const registerForEvent = useCallback(
    async (data: {
      eventId: string;
      firstName: string;
      lastName: string;
      telegram?: string;
      department?: string;
      timeSlot?: string;
      teamName?: string;
      role?: 'captain' | 'player';
    }): Promise<Participant> => {
      const { participant } = await api.post<{ participant: Participant }>(
        '/api/participants',
        data
      );
      setParticipants((prev) => [participant, ...prev]);

      if (isAdmin) {
        // Уведомление создаётся сервером; администратору подтягиваем свежий список.
        api
          .get<{ notifications: AdminNotification[] }>('/api/notifications')
          .then((response) => setNotifications(response.notifications))
          .catch(() => undefined);
      }

      try {
        confetti({ particleCount: 60, spread: 70, origin: { y: 0.6 } });
      } catch {
        // анимация не критична
      }

      return participant;
    },
    [isAdmin]
  );

  const cancelRegistration = useCallback(
    async (participantId: string) => {
      try {
        await api.delete(`/api/participants/${encodeURIComponent(participantId)}`);
        setParticipants((prev) =>
          prev.map((item) =>
            item.id === participantId ? { ...item, status: 'cancelled' as const } : item
          )
        );
      } catch (error) {
        reportError(error, 'Не удалось отменить запись');
        throw error;
      }
    },
    [reportError]
  );

  // ---------------------------------------------------------------------------
  // Профиль
  // ---------------------------------------------------------------------------
  const updateUserProfile = useCallback(
    async (profile: UserProfile) => {
      try {
        // ФИО, email и отдел приходят из Active Directory и здесь не меняются.
        await updateOwnProfile({
          telegram: profile.telegram,
          phone: profile.phone,
          interests: profile.interests,
          avatarUrl: profile.avatarUrl ?? null
        });
      } catch (error) {
        reportError(error, 'Не удалось сохранить профиль');
        throw error;
      }
    },
    [updateOwnProfile, reportError]
  );

  // ---------------------------------------------------------------------------
  // Контент, слоты и теги
  // ---------------------------------------------------------------------------
  const updateCMSContent = useCallback(
    async (newContent: Partial<CMSContent>) => {
      try {
        const response = await api.patch<{ cmsContent: Partial<CMSContent> }>(
          '/api/cms',
          newContent
        );
        setCmsContent({ ...EMPTY_CMS, ...response.cmsContent });
      } catch (error) {
        reportError(error, 'Не удалось сохранить контент');
        throw error;
      }
    },
    [reportError]
  );

  const addCoffeeSlot = useCallback(
    async (slot: string) => {
      try {
        const response = await api.post<{ coffeeSlots: string[] }>('/api/coffee-slots', { slot });
        setCoffeeSlots(response.coffeeSlots);
      } catch (error) {
        reportError(error, 'Не удалось добавить слот');
      }
    },
    [reportError]
  );

  const deleteCoffeeSlot = useCallback(
    async (slot: string) => {
      try {
        const response = await api.delete<{ coffeeSlots: string[] }>(
          `/api/coffee-slots?slot=${encodeURIComponent(slot)}`
        );
        setCoffeeSlots(response.coffeeSlots);
      } catch (error) {
        reportError(error, 'Не удалось удалить слот');
      }
    },
    [reportError]
  );

  const addOrganizerTag = useCallback(
    async (tag: string) => {
      try {
        const response = await api.post<{ organizerTags: string[] }>('/api/organizer-tags', {
          tag
        });
        setOrganizerTags(response.organizerTags);
      } catch (error) {
        reportError(error, 'Не удалось добавить организатора');
      }
    },
    [reportError]
  );

  // ---------------------------------------------------------------------------
  // Уведомления
  // ---------------------------------------------------------------------------
  const addNotification = useCallback(
    async (notif: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>) => {
      if (!isAdmin) return; // сервер всё равно отклонит запрос от рядового сотрудника
      try {
        const response = await api.post<{ notification: AdminNotification }>(
          '/api/notifications',
          notif
        );
        setNotifications((prev) => [response.notification, ...prev]);
      } catch (error) {
        reportError(error, 'Не удалось создать уведомление');
      }
    },
    [isAdmin, reportError]
  );

  const markNotificationAsRead = useCallback(
    async (id: string) => {
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
      try {
        await api.post(`/api/notifications/${encodeURIComponent(id)}/read`);
      } catch (error) {
        reportError(error, 'Не удалось отметить уведомление прочитанным');
      }
    },
    [reportError]
  );

  const markAllNotificationsAsRead = useCallback(async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await api.post('/api/notifications/read-all');
    } catch (error) {
      reportError(error, 'Не удалось отметить уведомления прочитанными');
    }
  }, [reportError]);

  // ---------------------------------------------------------------------------
  // Оценки
  // ---------------------------------------------------------------------------
  const addEventRating = useCallback(
    async (data: { eventId: string; eventTitle: string; rating: number; comment?: string }) => {
      try {
        const { rating } = await api.post<{ rating: EventRating }>('/api/ratings', {
          eventId: data.eventId,
          rating: data.rating,
          comment: data.comment
        });
        setRatings((prev) => [rating, ...prev.filter((item) => item.id !== rating.id)]);
      } catch (error) {
        reportError(error, 'Не удалось сохранить оценку');
        throw error;
      }
    },
    [reportError]
  );

  const getEventAverageRating = useCallback(
    (eventId: string) => {
      const eventRatings = ratings.filter((r) => r.eventId === eventId);
      if (eventRatings.length === 0) return 0;
      const sum = eventRatings.reduce((acc, curr) => acc + curr.rating, 0);
      return Math.round((sum / eventRatings.length) * 10) / 10;
    },
    [ratings]
  );

  // ---------------------------------------------------------------------------
  // Праздничный чат
  // ---------------------------------------------------------------------------
  const addHolidayChatMessage = useCallback(
    async (
      msgText: string,
      musicTrack?: { title: string; artist?: string; duration?: string; mood?: string }
    ) => {
      try {
        const response = await api.post<{ message: HolidayChatMessage }>(
          '/api/holiday/messages',
          { text: msgText, musicTrack }
        );
        setHolidayChatMessages((prev) => [...prev, response.message]);
      } catch (error) {
        reportError(error, 'Не удалось отправить сообщение');
      }
    },
    [reportError]
  );

  const addHolidayTrack = useCallback(
    async (track: { title: string; artist: string; duration?: string; mood?: string }) => {
      try {
        const response = await api.post<{ track: HolidayTrack; message: HolidayChatMessage }>(
          '/api/holiday/tracks',
          track
        );
        setHolidayPlaylistTracks((prev) => [response.track, ...prev]);
        setHolidayChatMessages((prev) => [...prev, response.message]);
      } catch (error) {
        reportError(error, 'Не удалось добавить трек');
      }
    },
    [reportError]
  );

  // ---------------------------------------------------------------------------
  // Производные данные
  // ---------------------------------------------------------------------------
  const getParticipantsForEvent = useCallback(
    (eventId: string) =>
      participants.filter((p) => p.eventId === eventId && p.status !== 'cancelled'),
    [participants]
  );

  const getTeamsForEvent = useCallback(
    (eventId: string): Team[] => {
      const eventParts = getParticipantsForEvent(eventId).filter((p) => p.isTeamGame && p.teamName);
      const teamGroups = new Map<string, Participant[]>();

      eventParts.forEach((p) => {
        const teamName = p.teamName!;
        teamGroups.set(teamName, [...(teamGroups.get(teamName) ?? []), p]);
      });

      return Array.from(teamGroups.entries()).map(([teamName, members]) => {
        const captain = members.find((m) => m.role === 'captain') ?? members[0];
        return {
          id: `team-${eventId}-${teamName.toLowerCase().replace(/\s+/g, '-')}`,
          eventId,
          name: teamName,
          captainId: captain?.id,
          captainName: captain ? `${captain.lastName} ${captain.firstName}` : undefined,
          members,
          createdAt: members[0]?.registeredAt ?? new Date().toISOString()
        };
      });
    },
    [getParticipantsForEvent]
  );

  const getUserRegistrations = useCallback(() => {
    if (!user) return [];
    return participants.filter((p) => p.email.toLowerCase() === user.email.toLowerCase());
  }, [participants, user]);

  const getTotalStats = useCallback(() => {
    const active = participants.filter((p) => p.status !== 'cancelled');
    const uniqueTeams = new Set<string>();
    active.forEach((p) => {
      if (p.isTeamGame && p.teamName) {
        uniqueTeams.add(`${p.eventId}___${p.teamName.toLowerCase()}`);
      }
    });

    return {
      totalParticipants: active.length,
      totalTeams: uniqueTeams.size,
      totalEvents: events.length,
      upcomingCount: events.length
    };
  }, [participants, events]);

  const unreadCount = useMemo(
    () => notifications.filter((n) => !n.read).length,
    [notifications]
  );

  // Пользователь всегда есть: AppProvider монтируется только после входа.
  const userProfile = user!;

  const value = useMemo<AppContextType>(
    () => ({
      events,
      participants,
      notifications,
      userProfile,
      cmsContent,
      coffeeSlots,
      isAdmin,
      isAdAuthenticated: Boolean(user),
      adDomain: directoryStatus?.domain ?? '',
      adLastSync: user?.adSyncedAt
        ? new Date(user.adSyncedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
        : '—',
      activeView,
      searchQuery,
      selectedCategory,
      unreadCount,
      theme,
      isThemeModalOpen,
      organizerTags,
      ratings,
      holidayChatMessages,
      holidayPlaylistTracks,
      isLoading,
      lastError,
      clearError: () => setLastError(null),
      refresh,
      setActiveView,
      setSearchQuery,
      setSelectedCategory,
      setTheme,
      setIsThemeModalOpen,
      openThemeModal,
      updateUserProfile,
      updateCMSContent,
      addCoffeeSlot,
      deleteCoffeeSlot,
      addOrganizerTag,
      addNotification,
      addEventRating,
      getEventAverageRating,
      addHolidayChatMessage,
      addHolidayTrack,
      registerForEvent,
      cancelRegistration,
      createEvent,
      updateEvent,
      deleteEvent,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      getTeamsForEvent,
      getParticipantsForEvent,
      getUserRegistrations,
      getTotalStats
    }),
    [
      events,
      participants,
      notifications,
      userProfile,
      cmsContent,
      coffeeSlots,
      isAdmin,
      user,
      directoryStatus,
      activeView,
      searchQuery,
      selectedCategory,
      unreadCount,
      theme,
      isThemeModalOpen,
      organizerTags,
      ratings,
      holidayChatMessages,
      holidayPlaylistTracks,
      isLoading,
      lastError,
      refresh,
      openThemeModal,
      updateUserProfile,
      updateCMSContent,
      addCoffeeSlot,
      deleteCoffeeSlot,
      addOrganizerTag,
      addNotification,
      addEventRating,
      getEventAverageRating,
      addHolidayChatMessage,
      addHolidayTrack,
      registerForEvent,
      cancelRegistration,
      createEvent,
      updateEvent,
      deleteEvent,
      markNotificationAsRead,
      markAllNotificationsAsRead,
      getTeamsForEvent,
      getParticipantsForEvent,
      getUserRegistrations,
      getTotalStats
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp должен использоваться внутри AppProvider');
  }
  return context;
};
