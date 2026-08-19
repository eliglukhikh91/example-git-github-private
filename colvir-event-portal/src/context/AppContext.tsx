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
  ChatMessage,
  ChatChannel,
  CoffeeState
} from '../types';

/**
 * Все данные портала хранятся на сервере в PostgreSQL.
 *
 * Тема оформления тоже переехала на сервер: ее выбирает администратор, и она
 * общая для компании. Раньше тема лежала в localStorage каждого браузера,
 * поэтому «единое оформление» было принципиально невозможно. Клиент забирает
 * ее при загрузке и периодически опрашивает — так смена темы админом доезжает
 * до уже открытых вкладок без перезагрузки.
 */
const THEME_POLL_INTERVAL_MS = 45_000;

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
  organizerTags: string[];
  ratings: EventRating[];
  chatMessages: ChatMessage[];
  chatChannels: ChatChannel[];
  activeChannelId: string;
  coffee: CoffeeState;

  /** true, пока идет первичная загрузка данных с сервера. */
  isLoading: boolean;
  /** Текст последней ошибки обращения к API, если она была. */
  lastError: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;

  setActiveView: (view: ViewMode) => void;
  setSearchQuery: (query: string) => void;
  setSelectedCategory: (cat: string) => void;
  setActiveChannelId: (channelId: string) => void;
  /** Завести тематическую группу. Сервер пускает только администратора. */
  createChatChannel: (
    name: string,
    description?: string
  ) => Promise<{ success: boolean; message: string }>;
  /** Убрать группу из списка. Переписка остается в базе. */
  archiveChatChannel: (channelId: string) => Promise<{ success: boolean; message: string }>;
  /** Сменить тему для всей компании. Доступно только администратору. */
  setTheme: (theme: ThemeType) => Promise<{ success: boolean; message: string }>;

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
  /** Отправка сообщения. Картинка необязательна, текст при ней может быть пустым. */
  sendChatMessage: (
    text: string,
    image?: File | null,
    /** Идентификаторы упомянутых коллег: они получат личное уведомление. */
    mentions?: string[]
  ) => Promise<{ success: boolean; message: string }>;

  /** Отметить свои удобные слоты в текущем цикле Random Coffee. */
  saveCoffeeAvailability: (slots: string[]) => Promise<{ success: boolean; message: string }>;
  refreshCoffee: () => Promise<void>;

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

const EMPTY_COFFEE: CoffeeState = {
  cycle: null,
  slots: [],
  myAvailability: [],
  slotDemand: {},
  participants: 0,
  myMatch: null
};

interface BootstrapResponse {
  user: UserProfile;
  events: EventItem[];
  participants: Participant[];
  cmsContent: Partial<CMSContent>;
  coffeeSlots: string[];
  organizerTags: string[];
  ratings: EventRating[];
  notifications: AdminNotification[];
  theme: ThemeType;
  chatChannels: ChatChannel[];
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
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatChannels, setChatChannels] = useState<ChatChannel[]>([]);
  const [activeChannelId, setActiveChannelId] = useState('general');
  const [coffee, setCoffee] = useState<CoffeeState>(EMPTY_COFFEE);

  const [isLoading, setIsLoading] = useState(true);
  const [lastError, setLastError] = useState<string | null>(null);

  const [activeView, setActiveView] = useState<ViewMode>('digest');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [theme, setThemeState] = useState<ThemeType>('classic');

  useEffect(() => {
    // Атрибут больше не влияет на оформление: акцент всегда фирменный синий, а
    // тема меняет только баннер и подборку. Оставлен как маркер активной темы —
    // по нему удобно понимать состояние в инспекторе и в автотестах.
    document.documentElement.dataset.theme = theme;
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
      setThemeState(data.theme ?? 'classic');
      setChatChannels(data.chatChannels ?? []);
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

  // Чат обновляется чаще остальных данных, поэтому грузится отдельным запросом.
  const refreshChat = useCallback(async () => {
    if (!user) return;
    try {
      const { messages } = await api.get<{ messages: ChatMessage[] }>(
        `/api/chat/messages?channelId=${encodeURIComponent(activeChannelId)}`
      );
      setChatMessages(messages);
    } catch (error) {
      reportError(error, 'Не удалось загрузить чат');
    }
  }, [user, activeChannelId, reportError]);

  useEffect(() => {
    void refreshChat();
  }, [refreshChat]);

  // Random Coffee: текущий цикл, моя доступность и подобранная пара.
  const refreshCoffee = useCallback(async () => {
    if (!user) return;
    try {
      setCoffee(await api.get<CoffeeState>('/api/coffee/state'));
    } catch (error) {
      reportError(error, 'Не удалось загрузить состояние Random Coffee');
    }
  }, [user, reportError]);

  useEffect(() => {
    void refreshCoffee();
  }, [refreshCoffee]);

  // Тему и список групп чата меняет администратор, поэтому у остальных они
  // подтягиваются опросом. Каналы опрашиваются тем же тактом: без этого новая
  // группа появлялась у сотрудников только после перезагрузки страницы, и
  // администратор, создав ее, не мог позвать туда людей.
  useEffect(() => {
    if (!user) return;

    const poll = async () => {
      try {
        const [themeState, channelState] = await Promise.all([
          api.get<{ theme: ThemeType }>('/api/theme'),
          api.get<{ channels: ChatChannel[] }>('/api/chat/channels')
        ]);

        setThemeState((prev) => (prev === themeState.theme ? prev : themeState.theme));
        setChatChannels((prev) => {
          const next = channelState.channels;
          // Сравниваем по составу и счетчикам, иначе новая ссылка на каждом
          // такте перерисовывала бы раздел чата раз в 45 секунд.
          const same =
            prev.length === next.length &&
            prev.every(
              (channel, index) =>
                channel.id === next[index].id && channel.messageCount === next[index].messageCount
            );
          return same ? prev : next;
        });
      } catch {
        // сеть моргнула — попробуем на следующем такте
      }
    };

    const timer = setInterval(() => void poll(), THEME_POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [user]);

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
        // Уведомление создается сервером; администратору подтягиваем свежий список.
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
  /**
   * Создать запись в административной ленте. Личные уведомления сотрудникам
   * формирует только сервер — иначе из браузера можно было бы отправить
   * сообщение «от имени системы» кому угодно.
   */
  const addNotification = useCallback(
    async (notif: Omit<AdminNotification, 'id' | 'timestamp' | 'read'>) => {
      if (!isAdmin) return; // эндпоинт закрыт правами администратора
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
  // Чат и тематические группы
  //
  // Каналы открытые: читать и писать может любой сотрудник, создает и закрывает
  // только администратор — это проверяет сервер, интерфейс лишь прячет кнопки.
  // ---------------------------------------------------------------------------
  const sendChatMessage = useCallback(
    async (text: string, image?: File | null, mentions?: string[]) => {
      try {
        // С картинкой уходит multipart, без нее — обычный JSON: гонять пустую
        // форму ради текстового сообщения незачем.
        let body: unknown;
        if (image) {
          const form = new FormData();
          form.append('text', text);
          form.append('channelId', activeChannelId);
          form.append('image', image, image.name);
          // В multipart нет вложенных структур, поэтому список уходит строкой.
          if (mentions?.length) form.append('mentions', JSON.stringify(mentions));
          body = form;
        } else {
          body = { text, channelId: activeChannelId, mentions };
        }

        const response = await api.post<{ message: ChatMessage }>('/api/chat/messages', body);
        setChatMessages((prev) => [...prev, response.message]);
        // Счетчик на плашке канала иначе разъезжается с числом в заголовке:
        // список каналов запрашивается только при загрузке приложения.
        setChatChannels((prev) =>
          prev.map((channel) =>
            channel.id === activeChannelId
              ? { ...channel, messageCount: channel.messageCount + 1 }
              : channel
          )
        );
        return { success: true, message: '' };
      } catch (error) {
        // Результат возвращается, чтобы форма не стирала неотправленную
        // картинку: иначе после отказа сервера пришлось бы выбирать файл заново.
        const message =
          error instanceof ApiError ? error.message : 'Не удалось отправить сообщение';
        setLastError(message);
        return { success: false, message };
      }
    },
    [activeChannelId, reportError]
  );

  const createChatChannel = useCallback(
    async (name: string, description?: string) => {
      try {
        const response = await api.post<{ channel: ChatChannel }>('/api/chat/channels', {
          name,
          description
        });
        setChatChannels((prev) => [...prev, response.channel]);
        setActiveChannelId(response.channel.id);
        return { success: true, message: `Группа «${response.channel.name}» создана` };
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Не удалось создать группу';
        setLastError(message);
        return { success: false, message };
      }
    },
    []
  );

  /**
   * Канал убирается из списка, переписка остается в базе. Если закрыли текущий,
   * возвращаем пользователя в общий, иначе он смотрел бы на пустую ленту.
   */
  const archiveChatChannel = useCallback(
    async (channelId: string) => {
      try {
        const response = await api.post<{ channels: ChatChannel[] }>(
          `/api/chat/channels/${encodeURIComponent(channelId)}/archive`,
          {}
        );
        setChatChannels(response.channels);
        setActiveChannelId((current) => (current === channelId ? 'general' : current));
        return { success: true, message: 'Группа закрыта, переписка сохранена' };
      } catch (error) {
        const message = error instanceof ApiError ? error.message : 'Не удалось закрыть группу';
        setLastError(message);
        return { success: false, message };
      }
    },
    []
  );

  /**
   * Смена темы для всей компании. Сервер пускает только администратора,
   * остальные вкладки увидят новую тему на следующем такте опроса.
   */
  const setTheme = useCallback(
    async (next: ThemeType) => {
      try {
        const response = await api.post<{ theme: ThemeType }>('/api/theme', { theme: next });
        setThemeState(response.theme);
        return { success: true, message: 'Оформление обновлено для всех сотрудников' };
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : 'Не удалось сменить оформление';
        setLastError(message);
        return { success: false, message };
      }
    },
    []
  );

  const saveCoffeeAvailability = useCallback(
    async (slots: string[]) => {
      try {
        await api.put('/api/coffee/availability', { slots });
        await refreshCoffee();
        return {
          success: true,
          message:
            slots.length > 0
              ? `Сохранено слотов: ${slots.length}. Пару подберем после закрытия записи.`
              : 'Вы отказались от участия в этом цикле'
        };
      } catch (error) {
        const message =
          error instanceof ApiError ? error.message : 'Не удалось сохранить доступность';
        setLastError(message);
        return { success: false, message };
      }
    },
    [refreshCoffee]
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
      organizerTags,
      ratings,
      chatMessages,
      chatChannels,
      activeChannelId,
      coffee,
      isLoading,
      lastError,
      clearError: () => setLastError(null),
      refresh,
      setActiveView,
      setSearchQuery,
      setSelectedCategory,
      setActiveChannelId,
      setTheme,
      updateUserProfile,
      updateCMSContent,
      addCoffeeSlot,
      deleteCoffeeSlot,
      addOrganizerTag,
      addNotification,
      addEventRating,
      getEventAverageRating,
      sendChatMessage,
      createChatChannel,
      archiveChatChannel,
      saveCoffeeAvailability,
      refreshCoffee,
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
      organizerTags,
      ratings,
      chatMessages,
      chatChannels,
      activeChannelId,
      coffee,
      isLoading,
      lastError,
      refresh,
      setTheme,
      updateUserProfile,
      updateCMSContent,
      addCoffeeSlot,
      deleteCoffeeSlot,
      addOrganizerTag,
      addNotification,
      addEventRating,
      getEventAverageRating,
      sendChatMessage,
      createChatChannel,
      archiveChatChannel,
      saveCoffeeAvailability,
      refreshCoffee,
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
