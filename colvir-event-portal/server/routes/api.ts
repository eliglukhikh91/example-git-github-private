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
  listNotifications,
  createNotification,
  markNotificationRead,
  markAllNotificationsRead,
  listRatings,
  upsertRating,
  listHolidayMessages,
  addHolidayMessage
} from '../services/engagement.js';

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

const holidayMessageSchema = z.object({
  text: z.string().trim().min(1, 'Сообщение не может быть пустым').max(2000)
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

  // Всё за пределами /api/auth требует активной сессии Active Directory.
  router.use(requireAuth);

  // -------------------------------------------------------------------------
  // Начальная загрузка: один запрос вместо десятка при старте приложения
  // -------------------------------------------------------------------------
  router.get('/bootstrap', async (req, res) => {
    const isAdmin = req.user!.role === 'admin';
    const [events, participants, cmsContent, coffeeSlots, organizerTags, ratings, notifications] =
      await Promise.all([
        listEvents(),
        listParticipants(),
        getCmsContent(),
        listCoffeeSlots(),
        listOrganizerTags(),
        listRatings(),
        isAdmin ? listNotifications() : Promise.resolve([])
      ]);

    res.json({
      success: true,
      user: toPublicUser(req.user!),
      events,
      participants,
      cmsContent,
      coffeeSlots,
      organizerTags,
      ratings,
      notifications
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
      // Email берётся из сессии, а не из формы: иначе можно записать кого угодно.
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
  // Уведомления (только администраторы)
  // -------------------------------------------------------------------------
  router.get('/notifications', requireAdmin, async (_req, res) => {
    res.json({ success: true, notifications: await listNotifications() });
  });

  router.post('/notifications', requireAdmin, async (req, res) => {
    const notification = await createNotification(req.body ?? {});
    res.status(201).json({ success: true, notification });
  });

  router.post('/notifications/:id/read', requireAdmin, async (req, res) => {
    const updated = await markNotificationRead(req.params.id);
    res.json({ success: updated });
  });

  router.post('/notifications/read-all', requireAdmin, async (_req, res) => {
    res.json({ success: true, updated: await markAllNotificationsRead() });
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
  // Праздничный чат
  // -------------------------------------------------------------------------
  router.get('/holiday/messages', async (_req, res) => {
    res.json({ success: true, messages: await listHolidayMessages() });
  });

  router.post('/holiday/messages', async (req, res) => {
    const parsed = holidayMessageSchema.safeParse(req.body ?? {});
    if (!parsed.success) {
      res.status(400).json(validationError(parsed.error));
      return;
    }
    const user = req.user!;
    const message = await addHolidayMessage({
      userId: user.id,
      author: user.displayName || `${user.lastName} ${user.firstName}`.trim(),
      department: user.department || 'Команда Colvir',
      text: parsed.data.text
    });
    res.status(201).json({ success: true, message });
  });

  return router;
}
