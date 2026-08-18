import { Router } from 'express';
import { z } from 'zod';
import { requireAuth, requireAdmin } from '../auth/middleware.js';
import { toPublicUser } from '../auth/routes.js';
import { updateEditableProfile } from '../services/users.js';
import {
  listEvents,
  createEvent,
  updateEvent,
  deleteEvent,
  listParticipants,
  registerForEvent,
  cancelRegistration,
  RegistrationError
} from '../services/events.js';
import {
  getCmsContent,
  updateCmsContent,
  listCoffeeSlots,
  addCoffeeSlot,
  deleteCoffeeSlot,
  listOrganizerTags,
  addOrganizerTag
} from '../services/content.js';
import {
  listAdminNotifications,
  listUserNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  listRatings,
  upsertRating,
  listChatMessages,
  listChatChannels,
  sendChatMessage,
  DEFAULT_CHAT_CHANNEL
} from '../services/engagement.js';
import { getTheme, setTheme, isThemeName } from '../services/settings.js';
import {
  getOpenCycle,
  getCycleById,
  listCycles,
  createCycle,
  cancelCycle,
  getMyAvailability,
  setMyAvailability,
  getSlotDemand,
  countParticipants,
  getMyMatch,
  listMatchesForCycle,
  runMatching,
  notifyMatchMembers,
  getLatestCycleForUser,
  CoffeeError
} from '../services/coffee.js';

const eventSchema = z.object({
  title: z.string().trim().min(1, 'Укажите название мероприятия').max(300),
  description: z.string().max(50_000).default(''),
  category: z.string().trim().max(50).default('other'),
  isTeamGame: z.boolean().default(false),
  maxTeamSize: z.number().int().positive().max(100).nullable().optional(),
  maxParticipants: z.number().int().min(0).max(100_000).default(0),
  date: z.string().trim().max(100).default(''),
  timeSlots: z.array(z.string().max(100)).max(50).default([]),
  location: z.string().trim().max(300).default(''),
  meetingUrl: z.string().max(2000).nullable().optional(),
  imageUrl: z.string().max(5_000_000).default(''),
  organizer: z.string().trim().max(200).default(''),
  tags: z.array(z.string().max(60)).max(30).default([])
});

const registrationSchema = z.object({
  eventId: z.string().trim().min(1),
  firstName: z.string().trim().min(1, 'Укажите имя').max(100),
  lastName: z.string().trim().min(1, 'Укажите фамилию').max(100),
  telegram: z.string().trim().max(100).optional(),
  department: z.string().trim().max(200).optional(),
  timeSlot: z.string().trim().max(100).optional(),
  teamName: z.string().trim().max(120).optional(),
  role: z.enum(['captain', 'player']).optional()
});

const profileSchema = z.object({
  telegram: z.string().trim().max(100).optional(),
  phone: z.string().trim().max(50).optional(),
  interests: z.array(z.string().max(80)).max(50).optional(),
  avatarUrl: z.string().max(5_000_000).nullable().optional()
});

const ratingSchema = z.object({
  eventId: z.string().trim().min(1),
  rating: z.number().int().min(1).max(10),
  comment: z.string().max(2000).optional()
});

const chatMessageSchema = z.object({
  text: z.string().trim().min(1, 'Сообщение не может быть пустым').max(2000),
  channelId: z.string().trim().max(60).optional()
});

const availabilitySchema = z.object({
  slots: z.array(z.string().max(100)).max(50)
});

const cycleSchema = z.object({
  title: z.string().trim().max(200).optional(),
  meetingDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Дата встреч в формате ГГГГ-ММ-ДД'),
  registrationEndsAt: z.string().min(1, 'Укажите дедлайн записи')
});

/** Единый ответ на ошибку валидации, чтобы клиент показывал понятный текст. */
function validationError(error: z.ZodError): { success: false; message: string } {
  return {
    success: false,
    message: error.issues[0]?.message ?? 'Некорректные данные запроса'
  };
}

export function createApiRouter(): Router {
  const router = Router();

  // Все за пределами /api/auth требует активной сессии Active Directory.
  router.use(requireAuth);

  // -------------------------------------------------------------------------
  // Начальная загрузка: один запрос вместо десятка при старте приложения
  // -------------------------------------------------------------------------
  router.get('/bootstrap', async (req, res) => {
    const user = req.user!;
    const isAdmin = user.role === 'admin';
    const [
      events,
      participants,
      cmsContent,
      coffeeSlots,
      organizerTags,
      ratings,
      notifications,
      themeState,
      chatChannels
    ] = await Promise.all([
      listEvents(),
      listParticipants(),
      getCmsContent(),
      listCoffeeSlots(),
      listOrganizerTags(),
      listRatings(),
      isAdmin ? listAdminNotifications() : listUserNotifications(user.id),
      getTheme(),
      listChatChannels()
    ]);

    res.json({
      success: true,
      user: toPublicUser(user),
      events,
      participants,
      cmsContent,
      coffeeSlots,
      organizerTags,
      ratings,
      notifications,
      theme: themeState.theme,
      chatChannels
    });
  });

  // -------------------------------------------------------------------------
  // Мероприятия
  // -------------------------------------------------------------------------
  router.get('/events', async (_req, res) => {
    res.json({ success: true, events: await listEvents() });
  });

  router.post('/events', requireAdmin, async (req, res) => {
    const parsed = eventSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }
    const event = await createEvent(parsed.data, req.user!.id);
    res.status(201).json({ success: true, event });
  });

  router.put('/events/:id', requireAdmin, async (req, res) => {
    const parsed = eventSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }
    const event = await updateEvent(req.params.id, parsed.data);
    if (!event) {
      res.status(404).json({ success: false, message: 'Мероприятие не найдено' });
      return;
    }
    res.json({ success: true, event });
  });

  router.delete('/events/:id', requireAdmin, async (req, res) => {
    const deleted = await deleteEvent(req.params.id);
    if (!deleted) {
      res.status(404).json({ success: false, message: 'Мероприятие не найдено' });
      return;
    }
    res.json({ success: true });
  });

  // -------------------------------------------------------------------------
  // Записи на мероприятия
  // -------------------------------------------------------------------------
  router.get('/participants', async (_req, res) => {
    res.json({ success: true, participants: await listParticipants() });
  });

  router.post('/participants', async (req, res) => {
    const parsed = registrationSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }

    try {
      // Email берется из сессии, а не из формы: иначе можно записать кого угодно.
      const { participant } = await registerForEvent(
        { ...parsed.data, email: req.user!.email },
        req.user!.id
      );
      res.status(201).json({ success: true, participant });
    } catch (error) {
      if (error instanceof RegistrationError) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      throw error;
    }
  });

  router.delete('/participants/:id', async (req, res) => {
    const participant = await cancelRegistration(req.params.id, {
      id: req.user!.id,
      email: req.user!.email,
      isAdmin: req.user!.role === 'admin'
    });
    if (!participant) {
      res.status(404).json({
        success: false,
        message: 'Запись не найдена или принадлежит другому сотруднику'
      });
      return;
    }
    res.json({ success: true, participant });
  });

  // -------------------------------------------------------------------------
  // Профиль сотрудника
  // -------------------------------------------------------------------------
  router.patch('/profile', async (req, res) => {
    const parsed = profileSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }
    const user = await updateEditableProfile(req.user!.id, parsed.data);
    if (!user) {
      res.status(404).json({ success: false, message: 'Профиль не найден' });
      return;
    }
    res.json({ success: true, user: toPublicUser(user) });
  });

  // -------------------------------------------------------------------------
  // Уведомления
  //
  // Администратор видит ленту по всем сотрудникам, рядовой сотрудник — только
  // адресованные ему лично (например, о подобранной паре Random Coffee).
  // -------------------------------------------------------------------------
  router.get('/notifications', async (req, res) => {
    const user = req.user!;
    const notifications =
      user.role === 'admin' ? await listAdminNotifications() : await listUserNotifications(user.id);
    res.json({ success: true, notifications });
  });

  router.post('/notifications', requireAdmin, async (req, res) => {
    // Через API создаются только административные записи: личные уведомления
    // формирует сам сервер, чтобы никто не мог написать «от имени системы».
    const notification = await createNotification({ ...(req.body ?? {}), audience: 'admin' });
    res.status(201).json({ success: true, notification });
  });

  router.post('/notifications/:id/read', async (req, res) => {
    const user = req.user!;
    const updated = await markNotificationRead(req.params.id, {
      userId: user.id,
      isAdmin: user.role === 'admin'
    });
    res.json({ success: updated });
  });

  router.post('/notifications/read-all', async (req, res) => {
    const user = req.user!;
    const updated = await markAllNotificationsRead({
      userId: user.id,
      isAdmin: user.role === 'admin'
    });
    res.json({ success: true, updated });
  });

  // -------------------------------------------------------------------------
  // Оценки
  // -------------------------------------------------------------------------
  router.get('/ratings', async (_req, res) => {
    res.json({ success: true, ratings: await listRatings() });
  });

  router.post('/ratings', async (req, res) => {
    const parsed = ratingSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }
    const user = req.user!;
    const rating = await upsertRating({
      ...parsed.data,
      userEmail: user.email,
      userName: user.displayName || `${user.lastName} ${user.firstName}`.trim()
    });
    res.status(201).json({ success: true, rating });
  });

  // -------------------------------------------------------------------------
  // CMS, слоты Random Coffee и теги организаторов
  // -------------------------------------------------------------------------
  router.get('/cms', async (_req, res) => {
    res.json({ success: true, cmsContent: await getCmsContent() });
  });

  router.patch('/cms', requireAdmin, async (req, res) => {
    const patch = req.body ?? {};
    if (typeof patch !== 'object' || Array.isArray(patch)) {
      res.status(400).json({ success: false, message: 'Ожидается объект с полями контента' });
      return;
    }
    res.json({ success: true, cmsContent: await updateCmsContent(patch) });
  });

  router.get('/coffee-slots', async (_req, res) => {
    res.json({ success: true, coffeeSlots: await listCoffeeSlots() });
  });

  router.post('/coffee-slots', requireAdmin, async (req, res) => {
    const slot = String(req.body?.slot ?? '');
    res.json({ success: true, coffeeSlots: await addCoffeeSlot(slot) });
  });

  router.delete('/coffee-slots', requireAdmin, async (req, res) => {
    const slot = String(req.query.slot ?? req.body?.slot ?? '');
    res.json({ success: true, coffeeSlots: await deleteCoffeeSlot(slot) });
  });

  router.get('/organizer-tags', async (_req, res) => {
    res.json({ success: true, organizerTags: await listOrganizerTags() });
  });

  router.post('/organizer-tags', requireAdmin, async (req, res) => {
    const tag = String(req.body?.tag ?? '');
    res.json({ success: true, organizerTags: await addOrganizerTag(tag) });
  });

  // -------------------------------------------------------------------------
  // Чат
  // -------------------------------------------------------------------------
  router.get('/chat/channels', async (_req, res) => {
    res.json({ success: true, channels: await listChatChannels() });
  });

  router.get('/chat/messages', async (req, res) => {
    const channelId = String(req.query.channelId ?? DEFAULT_CHAT_CHANNEL);
    res.json({ success: true, messages: await listChatMessages(channelId) });
  });

  router.post('/chat/messages', async (req, res) => {
    const parsed = chatMessageSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }
    const user = req.user!;
    const message = await sendChatMessage({
      userId: user.id,
      author: user.displayName || `${user.lastName} ${user.firstName}`.trim(),
      department: user.department || 'Команда Colvir',
      text: parsed.data.text,
      channelId: parsed.data.channelId
    });
    res.status(201).json({ success: true, message });
  });

  // -------------------------------------------------------------------------
  // Оформление
  //
  // Тема общая для компании: сотрудники ее только получают, меняет администратор.
  // -------------------------------------------------------------------------
  router.get('/theme', async (_req, res) => {
    res.json({ success: true, ...(await getTheme()) });
  });

  router.post('/theme', requireAdmin, async (req, res) => {
    const theme = req.body?.theme;
    if (!isThemeName(theme)) {
      res.status(400).json({ success: false, message: 'Неизвестная тема оформления' });
      return;
    }
    res.json({ success: true, ...(await setTheme(theme, req.user!.id)) });
  });

  // -------------------------------------------------------------------------
  // Random Coffee
  // -------------------------------------------------------------------------

  /** Все, что нужно экрану: текущий цикл, моя доступность и моя пара. */
  router.get('/coffee/state', async (req, res) => {
    const user = req.user!;
    const openCycle = await getOpenCycle();
    const cycle = openCycle ?? (await getLatestCycleForUser(user.id));

    if (!cycle) {
      res.json({
        success: true,
        cycle: null,
        slots: await listCoffeeSlots(),
        myAvailability: [],
        slotDemand: {},
        participants: 0,
        myMatch: null
      });
      return;
    }

    const [slots, myAvailability, slotDemand, participants, myMatch] = await Promise.all([
      listCoffeeSlots(),
      getMyAvailability(cycle.id, user.id),
      getSlotDemand(cycle.id),
      countParticipants(cycle.id),
      cycle.status === 'matched' ? getMyMatch(cycle.id, user.id) : Promise.resolve(null)
    ]);

    res.json({
      success: true,
      cycle,
      slots,
      myAvailability,
      slotDemand,
      participants,
      myMatch
    });
  });

  router.put('/coffee/availability', async (req, res) => {
    const parsed = availabilitySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }

    const cycle = await getOpenCycle();
    if (!cycle) {
      res.status(409).json({
        success: false,
        message: 'Сейчас нет открытого цикла Random Coffee'
      });
      return;
    }

    try {
      const slots = await setMyAvailability(cycle.id, req.user!.id, parsed.data.slots);
      res.json({ success: true, myAvailability: slots });
    } catch (error) {
      if (error instanceof CoffeeError) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      throw error;
    }
  });

  // --- Управление циклами: только администратор ---

  router.get('/coffee/cycles', requireAdmin, async (_req, res) => {
    res.json({ success: true, cycles: await listCycles() });
  });

  router.post('/coffee/cycles', requireAdmin, async (req, res) => {
    const parsed = cycleSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }
    try {
      const cycle = await createCycle(parsed.data, req.user!.id);
      res.status(201).json({ success: true, cycle });
    } catch (error) {
      if (error instanceof CoffeeError) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      throw error;
    }
  });

  router.post('/coffee/cycles/:id/cancel', requireAdmin, async (req, res) => {
    const cycle = await cancelCycle(Number(req.params.id));
    if (!cycle) {
      res.status(404).json({ success: false, message: 'Открытый цикл не найден' });
      return;
    }
    res.json({ success: true, cycle });
  });

  /** Запустить подбор досрочно, не дожидаясь дедлайна. */
  router.post('/coffee/cycles/:id/match', requireAdmin, async (req, res) => {
    try {
      const result = await runMatching(Number(req.params.id));
      const notified = await notifyMatchMembers(result.matches, createNotification);
      res.json({
        success: true,
        cycle: result.cycle,
        matches: result.matches,
        unmatched: result.unmatched,
        notified
      });
    } catch (error) {
      if (error instanceof CoffeeError) {
        res.status(error.status).json({ success: false, message: error.message });
        return;
      }
      throw error;
    }
  });

  router.get('/coffee/cycles/:id/matches', requireAdmin, async (req, res) => {
    const cycle = await getCycleById(Number(req.params.id));
    if (!cycle) {
      res.status(404).json({ success: false, message: 'Цикл не найден' });
      return;
    }
    res.json({ success: true, cycle, matches: await listMatchesForCycle(cycle.id) });
  });

  return router;
}
