import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import { initializeApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';
import { getMessaging } from 'firebase-admin/messaging';
import rateLimit from 'express-rate-limit';

dotenv.config({ path: '.env.local' });
dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());

// --- Firebase Admin (verifies who's calling before we spend Gemini API budget) ---
let firebaseAdminApp: any = null;
let db: any = null;
try {
  const rawKey = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
  if (rawKey) {
    const serviceAccount = JSON.parse(rawKey);
    firebaseAdminApp = initializeApp({
      credential: cert(serviceAccount),
    });
    db = getFirestore(firebaseAdminApp);
  } else {
    console.warn('FIREBASE_SERVICE_ACCOUNT_KEY is not set — sign-in verification is disabled, and the AI endpoints will reject all requests. See .env.example.');
  }
} catch (e) {
  console.error('Failed to initialize firebase-admin. Check FIREBASE_SERVICE_ACCOUNT_KEY.', e);
}

/**
 * Requires a valid Firebase ID token (sent as "Authorization: Bearer <token>")
 * before letting a request through to an endpoint that calls the (paid)
 * Gemini API. This is what actually enforces "must be signed in" — the
 * frontend's login screen is just the user-facing part of that gate.
 */
async function requireAuth(req: express.Request, res: express.Response, next: express.NextFunction) {
  // Local-dev-only shortcut so you can hit the API without a real Firebase
  // token while testing. Guarded by TWO conditions on purpose: NODE_ENV alone
  // isn't reliable (some hosts never set it to "production"), so this also
  // requires ALLOW_TEST_AUTH=true to be set explicitly. Never set that
  // variable in your real deployment — anyone who sends
  // "Authorization: Bearer test" would otherwise get free, unauthenticated
  // access to the (paid) Gemini API.
  if (
    process.env.NODE_ENV !== 'production' &&
    process.env.ALLOW_TEST_AUTH === 'true' &&
    req.headers.authorization === 'Bearer test'
  ) {
    return next();
  }
  if (!firebaseAdminApp) {
    return res.status(503).json({ error: 'Sign-in is not configured on this server yet.' });
  }
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: 'Sign in required.' });
  }
  try {
    const decoded = await getAuth(firebaseAdminApp).verifyIdToken(token);
    (req as any).user = { uid: decoded.uid, email: decoded.email, name: decoded.name };
    next();
  } catch (e) {
    return res.status(401).json({ error: 'Your sign-in has expired. Please sign in again.' });
  }
}

// Guards against a compromised or scripted account hammering the (paid)
// Gemini API in a loop. Keyed by signed-in uid (set by requireAuth, which
// always runs first) rather than IP, so it can't be dodged by rotating IPs
// and doesn't punish people on shared networks. Generous on purpose — this
// is an abuse backstop, not a feature limit; no real person should ever hit it.
const aiEndpointLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req: express.Request) => (req as any).user?.uid || req.ip,
  message: { error: "You're sending requests a bit fast — please wait a moment and try again." },
});

// Voice functionality control flag
const IS_VOICE_FEATURE_ENABLED = true;

// Health check endpoints for Cloud Run container health checks
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', voiceEnabled: IS_VOICE_FEATURE_ENABLED, timestamp: new Date().toISOString() });
});

app.get('/healthz', (req, res) => {
  res.status(200).send('OK');
});

// Voice processing & STT transcript endpoint
app.post('/api/voice-process', (req, res) => {
  const { transcript, text } = req.body || {};
  const queryText = transcript || text || '';

  return res.json({
    status: 'ok',
    voiceEnabled: true,
    processedText: queryText,
    timestamp: new Date().toISOString()
  });
});

// Initialize Gemini client lazily or if key exists
const getGeminiClient = () => {
  const apiKey = process.env.GEMINI_API_KEY;
  console.log('getGeminiClient API Key found:', apiKey ? (apiKey.substring(0, 8) + '...') : 'NOT_FOUND');
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    return null;
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
};

/**
 * Calls Gemini, retrying briefly when the model comes back overloaded.
 *
 * Google answers 503 UNAVAILABLE ("this model is currently experiencing high
 * demand ... try again later") when a model is momentarily saturated. That is
 * transient, so the useful response is to wait a moment and try again — but
 * the retry has to actually differ from the first attempt to stand a chance.
 * Retrying instantly against the same model is what made every free-plan
 * request fall through to the canned template: the "fallback" model name was
 * hardcoded to the same lite model the free plan already uses as its primary,
 * so the second call re-hit the same saturated backend microseconds later.
 *
 * Attempts run primary -> fallback (when it is a genuinely different model)
 * -> fallback again, with a growing pause before each retry.
 */
async function generateWithRetry(
  ai: any,
  opts: { primaryModel: string; fallbackModel: string; contents: string; config: any; label: string }
): Promise<any> {
  const { primaryModel, fallbackModel, contents, config, label } = opts;
  const differsFromPrimary = fallbackModel && fallbackModel !== primaryModel;
  const attempts = differsFromPrimary
    ? [primaryModel, fallbackModel, fallbackModel]
    : [primaryModel, primaryModel, primaryModel];
  const delaysMs = [0, 700, 2000];

  let lastError: any;
  for (let i = 0; i < attempts.length; i++) {
    if (delaysMs[i] > 0) {
      await new Promise((resolve) => setTimeout(resolve, delaysMs[i]));
    }
    try {
      return await ai.models.generateContent({ model: attempts[i], contents, config });
    } catch (err: any) {
      lastError = err;
      console.warn(
        `${label}: attempt ${i + 1}/${attempts.length} on ${attempts[i]} failed:`,
        err?.message || err
      );
    }
  }
  throw lastError;
}

// Standard Fallback Preset Generators for seamless experience when offline or without key
const getFallbackPrepPlan = (title: string, category?: string, details?: string, lang: string = 'en') => {
  const lower = title.toLowerCase();
  const isEn = lang !== 'ru';

  let phaseBefore = isEn ? [
    { id: '1', title: 'Review core context and key goals', timeline: 'T-7 days', category: 'Research', priority: 'high', completed: false, note: 'Gather initial information' },
    { id: '2', title: 'Prepare necessary notes and documents', timeline: 'T-3 days', category: 'Documents', priority: 'high', completed: false, note: 'Ensure everything is updated' },
  ] : [
    { id: '1', title: 'Исследовать контекст и ключевые требования', timeline: 'T-7 дней', category: 'Исследование', priority: 'high', completed: false, note: 'Собрать всю вводную информацию' },
    { id: '2', title: 'Подготовить необходимые документы и файлы', timeline: 'T-3 дня', category: 'Документы', priority: 'high', completed: false, note: 'Проверить актуальность и форматы' },
  ];

  let phaseDayOf = isEn ? [
    { id: '3', title: 'Final list review and mental prep', timeline: '2 hours before', category: 'Readiness', priority: 'high', completed: false, note: 'Stay focused and calm' },
    { id: '4', title: 'Arrive or connect 10 minutes early', timeline: '15 mins before', category: 'Timing', priority: 'high', completed: false, note: 'Avoid unnecessary rush' },
  ] : [
    { id: '3', title: 'Финальная проверка списка перед стартом', timeline: 'За 2 часа', category: 'Готовность', priority: 'high', completed: false, note: 'Самочувствие, тайминг, вода' },
    { id: '4', title: 'Прибыть/подключиться за 10-15 минут', timeline: 'За 15 мин', category: 'Тайминг', priority: 'high', completed: false, note: 'Избежать спешки' },
  ];

  let phaseAfter = isEn ? [
    { id: '5', title: 'Follow up and capture key outcomes', timeline: 'T+1 day', category: 'Wrap-up', priority: 'medium', completed: false, note: 'Summarize key takeaways' }
  ] : [
    { id: '5', title: 'Отправить Follow-up или зафиксировать заметки', timeline: 'T+1 день', category: 'Завершение', priority: 'medium', completed: false, note: 'Подвести итоги встречи/события' }
  ];

  let questions = isEn ? [
    'Is this meeting/event taking place in person or online?',
    'Are there specific outcomes you want to prioritize?'
  ] : [
    'Это событие будет проходить онлайн или очно?',
    'Есть ли у вас особые пожелания или критические ограничения?'
  ];

  // Specific scenarios
  if (lower.includes('salary') || lower.includes('повышен') || lower.includes('зарплат') || lower.includes('manager') || lower.includes('руководител')) {
    phaseBefore = isEn ? [
      { id: '1', title: 'Summarize key achievements and value added over the past year', timeline: 'T-5 days', category: 'Achievements', priority: 'high', completed: false, note: 'Focus on measurable impact and major projects' },
      { id: '2', title: 'Research market salary benchmarks for your role and level', timeline: 'T-3 days', category: 'Research', priority: 'high', completed: false, note: 'Define target and minimum acceptable ranges' },
      { id: '3', title: 'Outline main talking points and anticipate potential feedback', timeline: 'T-1 day', category: 'Preparation', priority: 'high', completed: false, note: 'Frame the conversation constructively' },
    ] : [
      { id: '1', title: 'Собрать ключевые достижения и результаты за последний год', timeline: 'T-5 дней', category: 'Достижения', priority: 'high', completed: false, note: 'Сфокусируйтесь на измеримом вкладе' },
      { id: '2', title: 'Изучить аналитику зарплатного рынка по вашей роли', timeline: 'T-3 дня', category: 'Рынок', priority: 'high', completed: false, note: 'Определите целевую и минимальную вилку' },
      { id: '3', title: 'Сформулировать тезисы и аргументы для диалога', timeline: 'T-1 день', category: 'Аргументы', priority: 'high', completed: false, note: 'Подготовиться к конструктивному обсуждению' },
    ];
    phaseDayOf = isEn ? [
      { id: '4', title: 'Rehearse core arguments with a calm, collaborative mindset', timeline: '1 hour before', category: 'Mindset', priority: 'medium', completed: false, note: 'Focus on mutual growth and future value' }
    ] : [
      { id: '4', title: 'Настроиться на спокойный партнерский диалог', timeline: 'За 1 час', category: 'Настрой', priority: 'medium', completed: false, note: 'Фокус на совместном развитии' }
    ];
    phaseAfter = isEn ? [
      { id: '5', title: 'Send a summary email confirming agreed next steps and timeline', timeline: 'Same day', category: 'Follow-up', priority: 'high', completed: false, note: 'Ensure clear alignment' }
    ] : [
      { id: '5', title: 'Фиксировать договоренности в письменном виде', timeline: 'В тот же день', category: 'Follow-up', priority: 'high', completed: false, note: 'Закрепить результат' }
    ];
    questions = isEn ? [
      'Is there a specific percentage or target number you have in mind?',
      'When is the next formal performance review cycle?'
    ] : [
      'Есть ли у вас конкретная желаемая цифра или процент?',
      'Когда проходит ближайший официальный performance review?'
    ];
  } else if (lower.includes('sobes') || lower.includes('собес') || lower.includes('interview') || lower.includes('интервью')) {
    phaseBefore = isEn ? [
      { id: '1', title: 'Research company products, team culture, and recent achievements', timeline: 'T-5 days', category: 'Research', priority: 'high', completed: false, note: 'Highlight 2-3 relevant alignment areas' },
      { id: '2', title: 'Prepare 3 STAR-method stories highlighting key challenges solved', timeline: 'T-3 days', category: 'Experience', priority: 'high', completed: false, note: 'Focus on Situation, Task, Action, Result' },
      { id: '3', title: 'Formulate 3 thoughtful questions for the interviewer', timeline: 'T-2 days', category: 'Questions', priority: 'medium', completed: false, note: 'Ask about team goals and metrics' },
    ] : [
      { id: '1', title: 'Изучить продукты, культуру и последние новости компании', timeline: 'T-5 дней', category: 'Исследование', priority: 'high', completed: false, note: 'Выделите 2-3 ключевых достижения компании' },
      { id: '2', title: 'Подготовить 3 истории по методу STAR (Situation, Task, Action, Result)', timeline: 'T-3 дня', category: 'Опыт', priority: 'high', completed: false, note: 'Фокус на сложных кейсах' },
      { id: '3', title: 'Сформулировать 3 продуманных вопроса интервьюеру', timeline: 'T-2 дня', category: 'Вопросы', priority: 'medium', completed: false, note: 'О команде и метриках успеха' },
    ];
    phaseDayOf = isEn ? [
      { id: '4', title: 'Review your key talking points and resume', timeline: '30 mins before', category: 'Review', priority: 'medium', completed: false, note: 'Keep notes easily accessible' }
    ] : [
      { id: '4', title: 'Перечитать резюме и ключевые тезисы', timeline: 'За 30 мин', category: 'Обзор', priority: 'medium', completed: false, note: 'Держать заметки под рукой' }
    ];
    phaseAfter = isEn ? [
      { id: '5', title: 'Send a brief thank-you note to the interviewer', timeline: 'Within 4 hours', category: 'Follow-up', priority: 'high', completed: false, note: 'Reiterate enthusiasm for the role' }
    ] : [
      { id: '5', title: 'Написать краткое Thank You письмо', timeline: 'За 4 часа после', category: 'Follow-up', priority: 'high', completed: false, note: 'Поблагодарить за время' }
    ];
  } else if (
    lower.includes('турци') || lower.includes('поездк') || lower.includes('отпуск') ||
    lower.includes('flight') || lower.includes('trip') || lower.includes('travel') ||
    lower.includes('стамбул') || lower.includes('istanbul') || lower.includes('rome') || lower.includes('рим')
  ) {
    phaseBefore = isEn ? [
      { id: '1', title: 'Check passport validity and visa requirements', timeline: 'T-14 days', category: 'Documents', priority: 'high', completed: false, note: 'Must be valid at least 6 months' },
      { id: '2', title: 'Get travel insurance and save offline copies', timeline: 'T-7 days', category: 'Safety', priority: 'high', completed: false, note: 'Keep PDF available offline' },
      { id: '3', title: 'Arrange eSIM or mobile roaming data', timeline: 'T-3 days', category: 'Connectivity', priority: 'medium', completed: false, note: 'Ensure internet upon landing' },
      { id: '4', title: 'Pack clothes and essential items', timeline: 'T-1 day', category: 'Luggage', priority: 'high', completed: false, note: 'Check weather forecast' }
    ] : [
      { id: '1', title: 'Проверить срок действия загранпаспорта', timeline: 'T-14 дней', category: 'Документы', priority: 'high', completed: false, note: 'Не менее 6 месяцев' },
      { id: '2', title: 'Оформить туристическую медицинскую страховку', timeline: 'T-7 дней', category: 'Безопасность', priority: 'high', completed: false, note: 'Сохранить PDF на телефон' },
      { id: '3', title: 'Купить eSIM или подключить роуминг-пакет', timeline: 'T-3 дня', category: 'Связь', priority: 'medium', completed: false, note: 'Проверить связь по прилету' },
      { id: '4', title: 'Собрать вещи и багаж по погоде', timeline: 'T-1 день', category: 'Багаж', priority: 'high', completed: false, note: 'Сверить прогноз погоды' }
    ];
    phaseDayOf = isEn ? [
      { id: '5', title: 'Complete online flight check-in and download boarding passes', timeline: '24 hours before', category: 'Flight', priority: 'high', completed: false, note: 'Select preferred seats' }
    ] : [
      { id: '5', title: 'Пройти онлайн-регистрацию на рейс и сохранить посадочные', timeline: 'За 24 часа', category: 'Перелет', priority: 'high', completed: false, note: 'Выбрать места' }
    ];
    phaseAfter = isEn ? [
      { id: '6', title: 'Save receipts and notes for trip record', timeline: 'Upon return', category: 'Finance', priority: 'low', completed: false, note: 'Keep records clean' }
    ] : [
      { id: '6', title: 'Сохранить чеки и ваучеры для учета', timeline: 'По возвращении', category: 'Финансы', priority: 'low', completed: false, note: 'Подвести бюджет' }
    ];
  }

  let cleanTitle = title;
  const lowerTitle = title.toLowerCase();
  if (lowerTitle.includes('встреча с руководителем') || lowerTitle.includes('встречу с руководителем')) {
    cleanTitle = isEn ? 'Meeting with manager' : 'Встреча с руководителем';
  } else if (lowerTitle.includes('собеседование') || lowerTitle.includes('собес') || lowerTitle.includes('interview')) {
    cleanTitle = isEn ? 'Interview' : 'Собеседование';
  } else if (lowerTitle.includes('стоматолог') || lowerTitle.includes('dentist')) {
    cleanTitle = isEn ? 'Dentist' : 'Стоматолог';
  } else if (lowerTitle.includes('стамбул') || lowerTitle.includes('istanbul')) {
    cleanTitle = isEn ? 'Trip to Istanbul' : 'Поездка в Стамбул';
  }

  const result = {
    eventId: `evt_${Date.now()}`,
    title: cleanTitle,
    category: category || (isEn ? 'General Event' : 'Общее событие'),
    summary: isEn ? `Gentle preparation roadmap for "${cleanTitle}". Designed thoughtfully with stress-free timing.` : `Интеллектуальная дорожная карта подготовки к событию "${cleanTitle}".`,
    clarifyingQuestions: questions,
    checklist: {
      before: phaseBefore,
      dayOf: phaseDayOf,
      after: phaseAfter
    },
    aiTip: isEn ? 'Luma keeps your reminders calm and clear so you can focus on what matters.' : 'Приложение автоматически адаптирует напоминания для вашего спокойствия.'
  };

  // Perform dynamic post-processing for other supported languages
  if (lang !== 'en' && lang !== 'ru') {
    const categoriesMap: Record<string, string> = {
      Research: { es: 'Investigación', fr: 'Recherche', it: 'Ricerca', pt: 'Pesquisa', tr: 'Araştırma', zh: '研究', de: 'Forschung' }[lang] || 'Research',
      Documents: { es: 'Documentos', fr: 'Documents', it: 'Documenti', pt: 'Documentos', tr: 'Belgeler', zh: '文件', de: 'Dokumente' }[lang] || 'Documents',
      Readiness: { es: 'Preparación', fr: 'Préparation', it: 'Prontezza', pt: 'Preparação', tr: 'Hazırlık', zh: '准备', de: 'Bereitschaft' }[lang] || 'Readiness',
      Timing: { es: 'Tiempos', fr: 'Timing', it: 'Tempistica', pt: 'Timing', tr: 'Zamanlama', zh: '时间', de: 'Timing' }[lang] || 'Timing',
      'Wrap-up': { es: 'Cierre', fr: 'Clôture', it: 'Conclusione', pt: 'Conclusão', tr: 'Kapanış', zh: '总结', de: 'Abschluss' }[lang] || 'Wrap-up',
      Achievements: { es: 'Logros', fr: 'Réalisations', it: 'Traguardi', pt: 'Conquistas', tr: 'Başarılar', zh: '成就', de: 'Erfolge' }[lang] || 'Achievements',
      Preparation: { es: 'Preparación', fr: 'Préparation', it: 'Preparazione', pt: 'Preparação', tr: 'Hazırlık', zh: '准备', de: 'Vorbereitung' }[lang] || 'Preparation',
      Mindset: { es: 'Actitud', fr: 'Mentalité', it: 'Mentalità', pt: 'Mentalidade', tr: 'Zihniyet', zh: '心态', de: 'Einstellung' }[lang] || 'Mindset',
      'Follow-up': { es: 'Seguimiento', fr: 'Suivi', it: 'Seguito', pt: 'Acompanhamento', tr: 'Takip', zh: '后续', de: 'Follow-up' }[lang] || 'Follow-up',
      Experience: { es: 'Experiencia', fr: 'Expérience', it: 'Esperienza', pt: 'Experiência', tr: 'Deneyim', zh: '经验', de: 'Erfahrung' }[lang] || 'Experience',
      Questions: { es: 'Preguntas', fr: 'Questions', it: 'Domande', pt: 'Perguntas', tr: 'Sorular', zh: '提问', de: 'Fragen' }[lang] || 'Questions',
      Review: { es: 'Revisión', fr: 'Révision', it: 'Revisione', pt: 'Revisão', tr: 'Gözden Geçirme', zh: '复习', de: 'Überprüfung' }[lang] || 'Review',
      Safety: { es: 'Seguridad', fr: 'Sécurité', it: 'Sicurezza', pt: 'Segurança', tr: 'Güvenlik', zh: '安全', de: 'Sicherheit' }[lang] || 'Safety',
      Connectivity: { es: 'Conectividad', fr: 'Connectivité', it: 'Connettività', pt: 'Conectividade', tr: 'Bağlantı', zh: '网络连接', de: 'Konnektivität' }[lang] || 'Connectivity',
      Luggage: { es: 'Equipaje', fr: 'Bagages', it: 'Bagaglio', pt: 'Bagagem', tr: 'Bagaj', zh: '行李', de: 'Gepäck' }[lang] || 'Luggage',
      Flight: { es: 'Vuelo', fr: 'Vol', it: 'Volo', pt: 'Voo', tr: 'Uçuş', zh: '航班', de: 'Flug' }[lang] || 'Flight',
      Finance: { es: 'Finanzas', fr: 'Finances', it: 'Finanza', pt: 'Finanças', tr: 'Finans', zh: '财务', de: 'Finanzen' }[lang] || 'Finance'
    };

    const timelineMap: Record<string, string> = {
      'T-7 days': { es: 'T-7 días', fr: 'J-7 jours', it: 'T-7 giorni', pt: 'T-7 dias', tr: 'T-7 gün', zh: '提前7天', de: 'T-7 Tage' }[lang] || 'T-7 days',
      'T-3 days': { es: 'T-3 días', fr: 'J-3 jours', it: 'T-3 giorni', pt: 'T-3 dias', tr: 'T-3 gün', zh: '提前3天', de: 'T-3 Tage' }[lang] || 'T-3 days',
      'T-5 days': { es: 'T-5 días', fr: 'J-5 jours', it: 'T-5 giorni', pt: 'T-5 dias', tr: 'T-5 gün', zh: '提前5天', de: 'T-5 Tage' }[lang] || 'T-5 days',
      'T-1 day': { es: 'T-1 día', fr: 'J-1 jour', it: 'T-1 giorno', pt: 'T-1 dia', tr: 'T-1 gün', zh: '提前1天', de: 'T-1 Tag' }[lang] || 'T-1 day',
      '2 hours before': { es: '2 horas antes', fr: '2 heures avant', it: '2 ore prima', pt: '2 horas antes', tr: '2 saat önce', zh: '提前2小时', de: '2 Stunden vorher' }[lang] || '2 hours before',
      '15 mins before': { es: '15 min antes', fr: '15 min avant', it: '15 min prima', pt: '15 min antes', tr: '15 dk önce', zh: '提前15分钟', de: '15 Min. vorher' }[lang] || '15 mins before',
      '1 hour before': { es: '1 hora antes', fr: '1 heure avant', it: '1 ora prima', pt: '1 hora antes', tr: '1 saat önce', zh: '提前1小时', de: '1 Stunde vorher' }[lang] || '1 hour before',
      '30 mins before': { es: '30 min antes', fr: '30 min avant', it: '30 min prima', pt: '30 min antes', tr: '30 dk önce', zh: '提前30分钟', de: '30 Min. vorher' }[lang] || '30 mins before',
      'Within 4 hours': { es: 'En 4 horas', fr: 'Sous 4 heures', it: 'Entro 4 ore', pt: 'Em até 4 horas', tr: '4 saat içinde', zh: '4小时内', de: 'Innerhalb von 4 Std.' }[lang] || 'Within 4 hours',
      'T-14 days': { es: 'T-14 días', fr: 'J-14 jours', it: 'T-14 giorni', pt: 'T-14 dias', tr: 'T-14 gün', zh: '提前14天', de: 'T-14 Tage' }[lang] || 'T-14 days',
      '24 hours before': { es: '24 horas antes', fr: '24 heures avant', it: '24 ore prima', pt: '24 horas antes', tr: '24 saat önce', zh: '提前24小时', de: '24 Stunden vorher' }[lang] || '24 hours before',
      'Upon return': { es: 'Al volver', fr: 'Au retour', it: 'Al rientro', pt: 'Ao retornar', tr: 'Dönüşte', zh: '返回时', de: 'Nach der Rückkehr' }[lang] || 'Upon return',
      'Same day': { es: 'El mismo día', fr: 'Le jour même', it: 'Lo stesso giorno', pt: 'No mesmo dia', tr: 'Aynı gün', zh: '当天', de: 'Am selben Tag' }[lang] || 'Same day',
      'T+1 day': { es: 'T+1 día', fr: 'J+1 jour', it: 'T+1 giorno', pt: 'T+1 dia', tr: 'T+1 gün', zh: '第T+1天', de: 'T+1 Tag' }[lang] || 'T+1 day'
    };

    const sumMap: Record<string, string> = {
      es: `Hoja de ruta de preparación suave para "${title}". Diseñado cuidadosamente con tiempos sin estrés.`,
      fr: `Plan de préparation en douceur pour "${title}". Conçu avec soin pour éviter tout stress.`,
      it: `Tabella di marcia per una preparazione serena per "${title}". Progettato con cura senza stress.`,
      pt: `Roteiro de preparação suave para "${title}". Projetado com cuidado e sem estresse.`,
      tr: `"${title}" için kolay hazırlık planı. Stresten uzak ve özenle tasarlandı.`,
      zh: `“${title}” 的温柔准备路线图。精心设计，让您无忧准备。`,
      de: `Sanfter Vorbereitungsplan für „${title}“. Sorgfältig gestaltet für eine stressfreie Zeit.`
    };

    const tipMap: Record<string, string> = {
      es: 'Luma mantiene tus recordatorios calmados y claros para que te concentres en lo importante.',
      fr: 'Luma garde vos rappels calmes et clairs pour vous concentrer sur l\'essentiel.',
      it: 'Luma mantiene i tuoi promemoria calmi e chiari per farti concentrare su ciò che conta.',
      pt: 'O Luma mantém seus lembretes calmos e claros para você focar no que importa.',
      tr: 'Luma, önemli şeylere odaklanabilmeniz için hatırlatıcılarınızı sakin ve net tutar.',
      zh: 'Luma 保持您的提醒平静而清晰，让您专注于重要的事情。',
      de: 'Luma hält Ihre Erinnerungen ruhig und klar, damit Sie sich auf das Wesentliche konzentrieren können.'
    };

    const defaultCatMap: Record<string, string> = {
      es: 'Evento General',
      fr: 'Événement Général',
      it: 'Evento Generale',
      pt: 'Evento Geral',
      tr: 'Genel Etkinlik',
      zh: '一般事件',
      de: 'Allgemeines Ereignis'
    };

    result.category = category || defaultCatMap[lang] || 'General Event';
    if (sumMap[lang]) result.summary = sumMap[lang];
    if (tipMap[lang]) result.aiTip = tipMap[lang];

    const translateStepsList = (steps: any[]) => {
      return steps.map(step => ({
        ...step,
        category: categoriesMap[step.category] || step.category,
        timeline: timelineMap[step.timeline] || step.timeline
      }));
    };

    result.checklist.before = translateStepsList(result.checklist.before);
    result.checklist.dayOf = translateStepsList(result.checklist.dayOf);
    result.checklist.after = translateStepsList(result.checklist.after);
  }

  return result;
};

// API Route: Generate Preparation Plan
app.post('/api/generate-prep', requireAuth, aiEndpointLimiter, async (req, res) => {
  const { title, category, eventDate, contextDetails, language, timezone, currentClientTime, plan } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  const lang = detectMessageLanguage(title, language);
  
  const languageNames: Record<string, string> = {
    en: 'English',
    ru: 'Russian',
    es: 'Spanish',
    it: 'Italian',
    zh: 'Chinese',
    tr: 'Turkish',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese'
  };
  const langName = languageNames[lang] || 'English';

  const ai = getGeminiClient();

  if (!ai) {
    const fallback = getFallbackPrepPlan(title, category, contextDetails, lang);
    return res.json({ success: true, source: 'smart-template', data: fallback });
  }

  // Give the model the weekday explicitly — LLMs are more reliable at
  // "today is Tuesday, so Friday is in 3 days" than at deriving the weekday
  // from a raw ISO date string themselves.
  const referenceDate = resolveReferenceDate(currentClientTime);
  const referenceDateLabel = referenceDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  try {
    const prompt = `
You are Luma — an empathetic, calm AI companion for important life events.
The user input text (or raw query): "${title}".
Initial Category Suggestion: "${category || ''}".
Initial Date/time context: "${eventDate || ''}".
Timezone: "${timezone || 'User local timezone'}".
Additional context: "${contextDetails || ''}".
Current local time of the user (client time reference in ISO): "${currentClientTime || new Date().toISOString()}".
Today, from the user's perspective, is: ${referenceDateLabel}.

CRITICAL FEATURE: EXTRACT STRUCTURED INFORMATION FROM NATURAL LANGUAGE INPUT
1. "title": Extract a concise, professional title for the event. DO NOT use the entire user sentence. The phrase "как подготовиться?" or "how to prepare?" is an instruction to prepare, NOT part of the title.
   - Example user input: "У меня запланирована встреча с руководителем в пятницу в час дня, как подготовиться?" -> title must be "Встреча с руководителем".
2. "purpose": Extract the actual reason, goal, or context of the event from the user input. DO NOT simply repeat the title. This must capture the deeper "why" or "what about" (e.g., "Negotiate a salary increase and discuss compensation expectations").
3. "targetDate": Parse the date from the user input text. Convert it to "YYYY-MM-DD" relative to today (${referenceDateLabel}).
   - Double-check your day-of-week arithmetic against today's actual weekday given above before answering.
4. "dateLabel": Create a beautiful, warm, localized date label for the parsed date in the language of the output (e.g., "Friday, August 14" in English, "Пятница, 14 августа" in Russian).
5. "timeOfDay": Parse the time from the user input text (e.g., "в час дня" -> "13:00", "в три часа дня" -> "15:00"). Return it in HH:MM 24-hour format.
6. "category": Categorize the event (choose from: "Work", "Health", "Travel", "Home", "Personal", "General").

CRITICAL LANGUAGE REQUIREMENT:
All output JSON fields ("title", "purpose", "summary", "aiTip", "dateLabel", and all checklist item "title" and "note" fields) MUST be strictly in ${langName}.
If the user's input is in English, generate ALL content in English. If in Russian, generate in Russian.

CRITICAL STEP RELEVANCE RULE (PRIORITY 0):
Generate 3-6 concise, practical, contextually relevant steps in total. YOU MUST USE THE "purpose" TO GENERATE SPECIFIC PREPARATION STEPS.
- Every step MUST answer: "What specifically should this person do before THIS particular event?"
- DO NOT use vague verbs like "Understand", "Prepare", "Consider", "Check" unless followed by a concrete object and context (e.g., instead of "Prepare files", use "Save your hotel confirmation offline").
- DO NOT output generic logistical advice (e.g., "check internet", "arrive 10 minutes early", "review context") unless explicitly relevant.

CRITICAL REASONING & ACCURACY RULES:
1. NO INVENTED FACTS: Stick strictly to what the user provided. Do NOT assume unmentioned destinations, job titles, or motives if not stated (e.g., for "I'm flying to Istanbul", do NOT assume vacation length or hotel if not specified; for "My trip is in two months", do NOT invent a destination).
2. USE ALL PROVIDED CONTEXT: If the user provided specific details (e.g., "taken on two additional projects", "worried about no budget"), your steps and "aiTip" MUST explicitly reference and incorporate those exact details.
3. ADAPT TIMELINE TO ACTUAL TIMING:
   - Imminent events (e.g., "in 20 minutes"): Timelines MUST be "In 15 mins", "In 10 mins", "In 5 mins", "Right now". DO NOT generate T-3 days or T-1 week steps! All steps must be emergency/immediate action items.
   - Far future events (e.g., "in two months"): Timelines MUST be "T-8 weeks", "T-6 weeks", "T-2 weeks", "T-1 week". DO NOT generate "pack bags today" or "arrive 10 minutes early".
4. CLARIFYING QUESTIONS:
   - If user input is sparse or brief (e.g., "I have an important meeting on Friday"), provide 1-2 sharp clarifying questions asking for the missing context.
   - If user input is ALREADY rich and detailed, set "clarifyingQuestions" to [] (an empty array) or max 1 question.
5. STRICTLY BANNED GENERIC PHRASES:
   You are strictly forbidden from outputting generic template phrases such as:
   - "understand context and requirements"
   - "prepare necessary documents and things"
   - "review important information"
   - "prepare questions"
   - "arrive 10 minutes early" (unless specifically relevant, e.g. in-person medical clinic appointment)
   - "check internet connection"
   - "take a deep breath and stay calm"
6. LUMA'S THOUGHT (aiTip) vs STEPS:
   - "aiTip" MUST be a unique, strategic observation or hidden risk/nuance. It MUST NOT repeat any checklist step.
7. STRICT LANGUAGE MANDATE:
   - You MUST generate 100% of all JSON text fields strictly in ${langName} (${lang}). Do NOT switch languages.

Format strictly as JSON:
{
  "eventId": "evt_string",
  "title": "Clean, extracted concise event title in ${langName}",
  "purpose": "Specific goal or context of the event in ${langName}",
  "category": "One of: Work, Health, Travel, Home, Personal, General",
  "targetDate": "YYYY-MM-DD",
  "dateLabel": "Beautiful localized date label in ${langName}",
  "timeOfDay": "HH:MM",
  "timezone": "${timezone || ''}",
  "summary": "1-2 sentence gentle summary in ${langName}",
  "clarifyingQuestions": ["Question 1 in ${langName}", "Question 2 in ${langName}"],
  "checklist": {
    "before": [
      { "id": "b1", "title": "Specific action step in ${langName}", "timeline": "T-3 days", "category": "Preparation", "priority": "high", "note": "why this helps in ${langName}" }
    ],
    "dayOf": [
      { "id": "d1", "title": "Specific action step in ${langName}", "timeline": "Day of event", "category": "Mindset", "priority": "high", "note": "why this helps in ${langName}" }
    ],
    "after": [
      { "id": "a1", "title": "Specific action step in ${langName}", "timeline": "T+1 day", "category": "Wrap-up", "priority": "medium", "note": "why this helps in ${langName}" }
    ]
  },
  "aiTip": "One strong, specific contextual insight (Luma's Thought) in ${langName}"
}
`;

    // Pro subscribers get the full model for every request — Free stays on
    // the lighter, cheaper model. The fallback on error is always the cheap
    // model, since a failure-retry shouldn't itself be an expensive call.
    const primaryModel = plan === 'pro' ? 'gemini-3.6-flash' : 'gemini-3.1-flash-lite';

    const response = await generateWithRetry(ai, {
      primaryModel,
      fallbackModel: 'gemini-3.1-flash-lite',
      contents: prompt,
      label: 'generate-prep',
      config: {
        responseMimeType: 'application/json',
      },
    });

    const text = response.text || '{}';
    const parsed = JSON.parse(text);
    return res.json({ success: true, source: 'gemini-ai', data: parsed });
  } catch (err: any) {
    console.error('Error generating preparation plan:', err);
    const fallback = getFallbackPrepPlan(title, category, contextDetails, lang);
    return res.json({ success: true, source: 'smart-template-fallback', data: fallback });
  }
});

function detectSingleStringLanguage(text: string): 'en' | 'ru' | 'es' | 'it' | 'zh' | 'tr' | 'fr' | 'de' | 'pt' | null {
  const trimmed = text.trim();
  if (!trimmed) return null;

  // 1. Chinese (zh) - CJK characters
  if (/[\u4e00-\u9fa5]/.test(trimmed)) {
    return 'zh';
  }

  // 2. Russian (ru) - Cyrillic characters
  if (/[а-яА-ЯёЁ]/.test(trimmed)) {
    return 'ru';
  }

  // Tokenize and lowercase words for Latin languages
  const words = trimmed.toLowerCase().split(/[\s,.:;?!"'()]+/);

  let trScore = 0;
  let esScore = 0;
  let itScore = 0;
  let frScore = 0;
  let deScore = 0;
  let ptScore = 0;
  let enScore = 0;

  // Distinctive character patterns
  const trCharCount = (trimmed.match(/[çğışüöÇĞİŞÜÖ]/g) || []).length;
  trScore += trCharCount * 15;

  const esCharCount = (trimmed.match(/[ñÑ¿¡]/g) || []).length;
  esScore += esCharCount * 20;

  const deCharCount = (trimmed.match(/[äöüßÄÖÜ]/g) || []).length;
  deScore += deCharCount * 15;

  const ptCharCount = (trimmed.match(/[ãõãÕ]/g) || []).length;
  ptScore += ptCharCount * 20;

  // Word set scoring
  const trWords = new Set([
    'cumartesi', 'sabahı', 'beş', 'günlüğüne', 'uçuyorum', 'istiyorum', 'yerel', 'yemekleri', 'denemek', 
    'ayrıca', 'bir', 'için', 'da', 'de', 'bu', 'ne', 've', 'istanbul\'a', 'istanbul', 'cumartesı', 
    'sabahi', 'bes', 'gunlugune', 'ucuyorum', 'yemeklerı', 'muze', 'müzeleri', 'ziyaret', 'etmek'
  ]);
  
  const esWords = new Set([
    'el', 'los', 'las', 'un', 'una', 'del', 'con', 'para', 'por', 'este', 'esta', 'vuelo', 
    'sábado', 'sabado', 'durante', 'cinco', 'días', 'dias', 'estambul', 'quiero', 'también', 'tambien', 
    'visitar', 'museos', 'comer', 'comida', 'pero', 'mas', 'más', 'como', 'todo', 'gustaria', 'probar',
    'cocina', 'gastronomía', 'gastronomia'
  ]);
  
  const itWords = new Set([
    'il', 'i', 'gli', 'le', 'un', 'una', 'del', 'per', 'con', 'questo', 'questa', 'sabato', 
    'mattina', 'volo', 'giorni', 'cinque', 'istanbul', 'voglio', 'anche', 'visitare', 'musei', 'mangiare', 'cibo', 
    'ma', 'più', 'piu', 'come', 'tutto', 'vorrei', 'provare', 'cucina', 'locale', 'inoltre', 'alcuni', 'vorrei'
  ]);
  
  const frWords = new Set([
    'le', 'les', 'un', 'une', 'et', 'en', 'de', 'du', 'des', 'pour', 'avec', 'ce', 'cette', 
    'dans', 'je', 'suis', 'pars', 'jours', 'matin', 'samedi', 'vol', 'veux', 'visiter', 'musées', 
    'musees', 'manger', 'nourriture', 'mais', 'plus', 'comme', 'tout', 'à', 'a', 'essayer', 'cuisine'
  ]);
  
  const deWords = new Set([
    'der', 'die', 'das', 'ein', 'eine', 'und', 'von', 'für', 'fuer', 'mit', 'dieser', 'diese', 'dieses', 
    'ist', 'am', 'samstagmorgen', 'fliege', 'ich', 'fünf', 'fuenf', 'tage', 'nach', 'möchte', 'moechte', 
    'auch', 'museen', 'besuchen', 'essen', 'lokale', 'lokales', 'speisen', 'gerichte', 'aber', 'mehr', 
    'wie', 'alles', 'würde', 'gern', 'außerdem', 'probieren', 'küche'
  ]);

  const ptWords = new Set([
    'os', 'as', 'um', 'uma', 'do', 'da', 'dos', 'das', 'em', 'no', 'na', 'nos', 
    'nas', 'com', 'para', 'por', 'e', 'que', 'se', 'vôo', 'voo', 'sábado', 'sabado', 'manhã', 
    'manha', 'cinco', 'dias', 'istambul', 'quero', 'também', 'tambem', 'visitar', 'museus', 'comer', 
    'comida', 'local', 'mas', 'mais', 'como', 'tudo', 'experimentar', 'além', 'alem', 'disso', 'gostaria'
  ]);
  
  const enWords = new Set([
    'the', 'and', 'for', 'with', 'this', 'that', 'you', 'have', 'not', 'but', 'from', 'flight', 
    'flying', 'trip', 'travel', 'saturday', 'morning', 'days', 'five', 'want', 'visit', 'museums', 
    'also', 'try', 'local', 'food', 'more', 'how', 'all', 'to', 'istanbul', 'would', 'like', 'cuisine',
    'i', 'im', 'a', 'an', 'in', 'on', 'at', 'my', 'of', 'is', 'are', 'am', 'meeting', 'manager',
    'salary', 'conversation', 'raise', 'project', 'projects', 'budget', 'apartment', 'moving',
    'lived', 'years', 'months', 'parents', 'boyfriend', 'interview', 'starts', 'minutes', 'first',
    'time', 'important', 'worried'
  ]);

  for (const word of words) {
    if (trWords.has(word)) trScore += 25;
    if (esWords.has(word)) esScore += 25;
    if (itWords.has(word)) itScore += 25;
    if (frWords.has(word)) frScore += 25;
    if (deWords.has(word)) deScore += 25;
    if (ptWords.has(word)) ptScore += 25;
    if (enWords.has(word)) enScore += 25;
  }

  const scores = [
    { lang: 'en' as const, score: enScore },
    { lang: 'tr' as const, score: trScore },
    { lang: 'es' as const, score: esScore },
    { lang: 'it' as const, score: itScore },
    { lang: 'fr' as const, score: frScore },
    { lang: 'de' as const, score: deScore },
    { lang: 'pt' as const, score: ptScore },
  ];

  scores.sort((a, b) => b.score - a.score);

  if (scores[0].score > 0) {
    return scores[0].lang;
  }

  return null;
}

function detectMessageLanguage(message: string, clientLang?: string, history?: any[]): 'en' | 'ru' | 'es' | 'it' | 'zh' | 'tr' | 'fr' | 'de' | 'pt' {
  // Priority 1: Current user message language
  const currentLang = detectSingleStringLanguage(message);
  if (currentLang) {
    return currentLang;
  }

  // Priority 2: Language of the last user message in conversation history
  if (history && history.length > 0) {
    for (let i = history.length - 1; i >= 0; i--) {
      const msg = history[i];
      if (msg && msg.sender === 'user') {
        const text = msg.text || '';
        const histLang = detectSingleStringLanguage(text);
        if (histLang) {
          return histLang;
        }
      }
    }
  }

  // Priority 3: Fallback to client/interface language if supported
  const supportedLangs = ['en', 'ru', 'es', 'it', 'zh', 'tr', 'fr', 'de', 'pt'];
  if (clientLang && supportedLangs.includes(clientLang)) {
    return clientLang as 'en' | 'ru' | 'es' | 'it' | 'zh' | 'tr' | 'fr' | 'de' | 'pt';
  }

  // Priority 4: English as final fallback
  return 'en';
}

function serverExtractTimeFromText(text: string): string | undefined {
  const lowerText = text.toLowerCase().trim();
  if (!lowerText) return undefined;

  // 1. First look for complete colon matches: e.g. "13:00", "15:30", "1.00", "1.30", "15.00"
  const timeColonMatch = lowerText.match(/([01]?\d|2[0-3])[:\.]([0-5]\d)/);
  if (timeColonMatch) {
    let hr = parseInt(timeColonMatch[1], 10);
    const min = timeColonMatch[2];
    const isPm = lowerText.includes('pm') || lowerText.includes('вечера') || lowerText.includes('дня');
    const isAm = lowerText.includes('am') || lowerText.includes('утра') || lowerText.includes('ночи');
    if (isPm && hr < 12) hr += 12;
    if (isAm && hr === 12) hr = 0;
    return `${hr.toString().padStart(2, '0')}:${min}`;
  }

  // 2. Look for numeric hours with am/pm: e.g., "1 pm", "10 am", "12 pm", "12 am"
  const timeAmPm = lowerText.match(/(1[0-2]|[1-9])\s*(am|pm)/i);
  if (timeAmPm) {
    let hour = parseInt(timeAmPm[1], 10);
    if (timeAmPm[2].toLowerCase() === 'pm' && hour < 12) hour += 12;
    if (timeAmPm[2].toLowerCase() === 'am' && hour === 12) hour = 0;
    return `${hour.toString().padStart(2, '0')}:00`;
  }

  // 3. Look for explicit natural language phrases in Russian/English
  let resolvedHour: number | null = null;

  // Common Russian phrases
  if (lowerText.includes('час дня') || lowerText.includes('в час дня') || lowerText.includes('на час дня') || lowerText.includes('в 1 дня') || lowerText.includes('на 1 дня')) {
    resolvedHour = 13;
  } else if (lowerText.includes('час ночи') || lowerText.includes('в час ночи') || lowerText.includes('на час ночи') || lowerText.includes('в час утра')) {
    resolvedHour = 1;
  } else if (lowerText.includes('два часа дня') || lowerText.includes('в два часа дня') || lowerText.includes('на два часа дня') || lowerText.includes('в два дня') || lowerText.includes('на два дня')) {
    resolvedHour = 14;
  } else if (lowerText.includes('три часа дня') || lowerText.includes('в три часа дня') || lowerText.includes('на три часа дня') || lowerText.includes('в три дня') || lowerText.includes('на три дня')) {
    resolvedHour = 15;
  } else if (lowerText.includes('четыре часа дня') || lowerText.includes('в четыре часа дня') || lowerText.includes('на четыре часа дня') || lowerText.includes('в четыре дня') || lowerText.includes('на четыре дня')) {
    resolvedHour = 16;
  } else if (lowerText.includes('пять часов вечера') || lowerText.includes('в пять вечера') || lowerText.includes('на пять вечера') || lowerText.includes('пять часов')) {
    resolvedHour = 17;
  } else if (lowerText.includes('шесть часов вечера') || lowerText.includes('в шесть вечера') || lowerText.includes('на шесть вечера') || lowerText.includes('шесть часов')) {
    resolvedHour = 18;
  } else if (lowerText.includes('семь часов вечера') || lowerText.includes('в семь вечера') || lowerText.includes('на семь вечера') || lowerText.includes('семь часов')) {
    resolvedHour = 19;
  } else if (lowerText.includes('восемь часов вечера') || lowerText.includes('в восемь вечера') || lowerText.includes('на восемь вечера') || lowerText.includes('восемь часов')) {
    resolvedHour = 20;
  } else if (lowerText.includes('девять часов вечера') || lowerText.includes('в девять вечера') || lowerText.includes('на девять вечера') || lowerText.includes('девять часов')) {
    resolvedHour = 21;
  } else if (lowerText.includes('десять часов вечера') || lowerText.includes('в десять вечера') || lowerText.includes('на десять вечера')) {
    resolvedHour = 22;
  } else if (lowerText.includes('одиннадцать вечера') || lowerText.includes('в одиннадцать вечера') || lowerText.includes('на одиннадцать вечера')) {
    resolvedHour = 23;
  } else if (lowerText.includes('двенадцать ночи') || lowerText.includes('двенадцать вечера') || lowerText.includes('двенадцать дня')) {
    resolvedHour = lowerText.includes('дня') ? 12 : 0;
  } else if (lowerText.includes('десять утра') || lowerText.includes('в десять утра') || lowerText.includes('на десять утра')) {
    resolvedHour = 10;
  } else if (lowerText.includes('девять утра') || lowerText.includes('в девять утра') || lowerText.includes('на девять утра')) {
    resolvedHour = 9;
  } else if (lowerText.includes('восемь утра') || lowerText.includes('в восемь утра') || lowerText.includes('на восемь утра')) {
    resolvedHour = 8;
  } else if (lowerText.includes('семь утра') || lowerText.includes('в семь утра') || lowerText.includes('на семь утра')) {
    resolvedHour = 7;
  } else if (lowerText.includes('шесть утра') || lowerText.includes('в шесть утра') || lowerText.includes('на шесть утра')) {
    resolvedHour = 6;
  }

  // Common English word phrases
  if (resolvedHour === null) {
    if (lowerText.includes('one pm') || lowerText.includes('at one pm') || lowerText.includes('1 pm') || lowerText.includes('at 1 pm') || lowerText.includes('at one in the afternoon')) {
      resolvedHour = 13;
    } else if (lowerText.includes('two pm') || lowerText.includes('at two pm') || lowerText.includes('2 pm') || lowerText.includes('at 2 pm')) {
      resolvedHour = 14;
    } else if (lowerText.includes('three pm') || lowerText.includes('at three pm') || lowerText.includes('3 pm') || lowerText.includes('at 3 pm') || lowerText.includes('three in the afternoon')) {
      resolvedHour = 15;
    } else if (lowerText.includes('four pm') || lowerText.includes('at four pm') || lowerText.includes('4 pm') || lowerText.includes('at 4 pm')) {
      resolvedHour = 16;
    } else if (lowerText.includes('five pm') || lowerText.includes('at five pm') || lowerText.includes('5 pm') || lowerText.includes('at 5 pm')) {
      resolvedHour = 17;
    } else if (lowerText.includes('six pm') || lowerText.includes('at six pm') || lowerText.includes('6 pm') || lowerText.includes('at 6 pm')) {
      resolvedHour = 18;
    } else if (lowerText.includes('seven pm') || lowerText.includes('at seven pm') || lowerText.includes('7 pm') || lowerText.includes('at 7 pm')) {
      resolvedHour = 19;
    } else if (lowerText.includes('eight pm') || lowerText.includes('at eight pm') || lowerText.includes('8 pm') || lowerText.includes('at 8 pm')) {
      resolvedHour = 20;
    } else if (lowerText.includes('nine pm') || lowerText.includes('at nine pm') || lowerText.includes('9 pm') || lowerText.includes('at 9 pm')) {
      resolvedHour = 21;
    } else if (lowerText.includes('ten pm') || lowerText.includes('at ten pm') || lowerText.includes('10 pm') || lowerText.includes('at 10 pm')) {
      resolvedHour = 22;
    } else if (lowerText.includes('eleven pm') || lowerText.includes('at eleven pm') || lowerText.includes('11 pm') || lowerText.includes('at 11 pm')) {
      resolvedHour = 23;
    } else if (lowerText.includes('twelve pm') || lowerText.includes('at twelve pm') || lowerText.includes('12 pm') || lowerText.includes('at 12 pm')) {
      resolvedHour = 12;
    } else if (lowerText.includes('one am') || lowerText.includes('at one am') || lowerText.includes('1 am') || lowerText.includes('at 1 am')) {
      resolvedHour = 1;
    } else if (lowerText.includes('two am') || lowerText.includes('at two am') || lowerText.includes('2 am') || lowerText.includes('at 2 am')) {
      resolvedHour = 2;
    } else if (lowerText.includes('three am') || lowerText.includes('at three am') || lowerText.includes('3 am') || lowerText.includes('at 3 am')) {
      resolvedHour = 3;
    } else if (lowerText.includes('four am') || lowerText.includes('at four am') || lowerText.includes('4 am') || lowerText.includes('at 4 am')) {
      resolvedHour = 4;
    } else if (lowerText.includes('five am') || lowerText.includes('at five am') || lowerText.includes('5 am') || lowerText.includes('at 5 am')) {
      resolvedHour = 5;
    } else if (lowerText.includes('six am') || lowerText.includes('at six am') || lowerText.includes('6 am') || lowerText.includes('at 6 am')) {
      resolvedHour = 6;
    } else if (lowerText.includes('seven am') || lowerText.includes('at seven am') || lowerText.includes('7 am') || lowerText.includes('at 7 am')) {
      resolvedHour = 7;
    } else if (lowerText.includes('eight am') || lowerText.includes('at eight am') || lowerText.includes('8 am') || lowerText.includes('at 8 am')) {
      resolvedHour = 8;
    } else if (lowerText.includes('nine am') || lowerText.includes('at nine am') || lowerText.includes('9 am') || lowerText.includes('at 9 am')) {
      resolvedHour = 9;
    } else if (lowerText.includes('ten am') || lowerText.includes('at ten am') || lowerText.includes('10 am') || lowerText.includes('at 10 am')) {
      resolvedHour = 10;
    } else if (lowerText.includes('eleven am') || lowerText.includes('at eleven am') || lowerText.includes('11 am') || lowerText.includes('at 11 am')) {
      resolvedHour = 11;
    } else if (lowerText.includes('twelve am') || lowerText.includes('at twelve am') || lowerText.includes('12 am') || lowerText.includes('at 12 am')) {
      resolvedHour = 0;
    }
  }

  // 4. Fallback: match general numeric triggers e.g., "в 15:00", "на 15", "at 13", "в 10 вечера", "в 1"
  if (resolvedHour === null) {
    const numericMatch = lowerText.match(/(?:в|на|at|on|alle)\s*(\d{1,2})(?:\s*(?:часов|ч|hours|h|дня|утра|веера|ночи|am|pm))?/i);
    if (numericMatch) {
      let hr = parseInt(numericMatch[1], 10);
      const isPm = lowerText.includes('дня') || lowerText.includes('вечера') || lowerText.includes('pm');
      const isAm = lowerText.includes('утра') || lowerText.includes('ночи') || lowerText.includes('am');
      if (isPm && hr < 12) {
        hr += 12;
      } else if (isAm && hr === 12) {
        hr = 0;
      }
      resolvedHour = hr;
    }
  }

  if (resolvedHour !== null && resolvedHour >= 0 && resolvedHour <= 23) {
    return `${resolvedHour.toString().padStart(2, '0')}:00`;
  }

  return undefined;
}

/**
 * Resolves "today" from the client's local wall-clock time string
 * (e.g. "2026-08-15T14:30:00", sent by the frontend as currentClientTime).
 * Deliberately parses the Y/M/D digits directly instead of new Date(iso) +
 * toISOString(), which would re-interpret the timestamp through the SERVER's
 * own timezone and can silently shift the calendar date by ±1 day when the
 * server and the user are in different timezones. Falls back to the server's
 * own clock only if no client time was provided.
 */
function resolveReferenceDate(currentClientTime?: string): Date {
  if (currentClientTime) {
    const m = currentClientTime.match(/^(\d{4})-(\d{2})-(\d{2})/);
    if (m) {
      const year = parseInt(m[1], 10);
      const month = parseInt(m[2], 10) - 1;
      const day = parseInt(m[3], 10);
      return new Date(year, month, day);
    }
  }
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

// Formats a Date using its own local getters (no UTC conversion) — safe to use
// on Date objects built via new Date(year, month, day, ...), since those are
// only ever read back with matching local getters, never round-tripped through UTC.
function toLocalDateStringServer(d: Date): string {
  const pad = (n: number) => n.toString().padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}


function serverExtractDateFromText(text: string, lang: string = 'en', referenceDate?: Date): { targetDate: string; dateLabel: string } | undefined {
  const lower = text.toLowerCase();
  const today0 = referenceDate ?? (() => {
    const d = new Date();
    return new Date(d.getFullYear(), d.getMonth(), d.getDate());
  })();

  const monthMap: Record<string, number> = {
    'январ': 0, 'янв': 0,
    'феврал': 1, 'фев': 1,
    'март': 2, 'мар': 2,
    'апрел': 3, 'апр': 3,
    'мая': 4, 'май': 4,
    'июн': 5,
    'июл': 6,
    'август': 7, 'авг': 7,
    'сентябр': 8, 'сен': 8,
    'октябр': 9, 'окт': 9,
    'ноябр': 10, 'ноя': 10,
    'декабр': 11, 'дек': 11,
    'jan': 0, 'feb': 1, 'mar': 2, 'apr': 3, 'may': 4, 'jun': 5, 'jul': 6, 'aug': 7, 'sep': 8, 'oct': 9, 'nov': 10, 'dec': 11,
  };

  const regex = /(\d{1,2})\s*(?:de|de\s+os)?\s*([а-яa-zäöüçğışéèàùôîâêûîñáéíóúãõ]+)/ig;
  let match;
  while ((match = regex.exec(lower)) !== null) {
    const dayNum = parseInt(match[1], 10);
    const monthStr = match[2];

    let foundMonth: number | undefined;
    for (const [key, mIndex] of Object.entries(monthMap)) {
      if (monthStr.startsWith(key)) {
        foundMonth = mIndex;
        break;
      }
    }

    if (foundMonth !== undefined && dayNum >= 1 && dayNum <= 31) {
      let yr = today0.getFullYear();
      const testDate = new Date(yr, foundMonth, dayNum);
      if (testDate.getTime() - today0.getTime() < -60 * 86400000) {
        yr += 1;
      }
      const targetDateObj = new Date(yr, foundMonth, dayNum);
      const targetDateISO = `${targetDateObj.getFullYear()}-${String(targetDateObj.getMonth() + 1).padStart(2, '0')}-${String(targetDateObj.getDate()).padStart(2, '0')}`;
      const locale = lang === 'ru' ? 'ru-RU' : 'en-US';
      let dateLabel = '';
      try {
        dateLabel = targetDateObj.toLocaleDateString(locale, { month: 'long', day: 'numeric' });
      } catch (e) {
        dateLabel = `${dayNum} ${monthStr}`;
      }
      return { targetDate: targetDateISO, dateLabel };
    }
  }
  return undefined;
}

// API Route: Luma Gentle Companion Talk
app.post('/api/luma-talk', requireAuth, aiEndpointLimiter, async (req, res) => {
  const { message, language, eventContext, history, moments, currentClientTime, plan } = req.body;

  if (!message) {
    return res.status(400).json({ error: 'Message is required' });
  }

  const lang = detectMessageLanguage(message, language, history);

  const languageNames: Record<string, string> = {
    en: 'English',
    ru: 'Russian',
    es: 'Spanish',
    it: 'Italian',
    zh: 'Chinese',
    tr: 'Turkish',
    fr: 'French',
    de: 'German',
    pt: 'Portuguese'
  };
  const responseLanguage = languageNames[lang] || 'English';

function detectActionFromMessage(msgText: string, hist?: any[], ctx?: any, lang: string = 'en', currentClientTime?: string): any {
  if (!ctx || !ctx.momentId) {
    return { type: 'none' };
  }
  const lower = msgText.toLowerCase().trim();
  const momentId = ctx.momentId;

  // Check for reschedule of the event itself
  const isRescheduleEvent = 
    lower.includes('перенеси') || lower.includes('перенести') || lower.includes('reschedule') || lower.includes('move') || lower.includes('отложи') || lower.includes('поменяй') || lower.includes('время') || lower.includes('дата') || lower.includes('date') || lower.includes('time') || lower.includes(' на ');

  if (isRescheduleEvent) {
    const timeOfDay = serverExtractTimeFromText(lower);
    let dateLabel = 'Coming days';
    let targetDate: string | undefined = undefined;
    const referenceDate = resolveReferenceDate(currentClientTime);
    const locale = lang === 'ru' ? 'ru-RU' : 'en-US';

    const parsedDate = serverExtractDateFromText(lower, lang, referenceDate);
    if (parsedDate) {
      targetDate = parsedDate.targetDate;
      dateLabel = parsedDate.dateLabel;
    } else if (lower.includes('пятниц') || lower.includes('friday')) {
      const d = new Date(referenceDate);
      const diff = (5 - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      targetDate = toLocalDateStringServer(d);
      dateLabel = d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
    } else if (lower.includes('завтра') || lower.includes('tomorrow')) {
      const d = new Date(referenceDate);
      d.setDate(d.getDate() + 1);
      targetDate = toLocalDateStringServer(d);
      dateLabel = d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
    } else if (lower.includes('понедельн') || lower.includes('monday')) {
      const d = new Date(referenceDate);
      const diff = (1 - d.getDay() + 7) % 7 || 7;
      d.setDate(d.getDate() + diff);
      targetDate = toLocalDateStringServer(d);
      dateLabel = d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
    } else if (lower.includes('среду') || lower.includes('среда') || lower.includes('wednesday')) {
      const isNextWednesday = lower.includes('следующ') || lower.includes('next');
      const d = new Date(referenceDate);
      const diff = (3 - d.getDay() + 7) % 7 || 7;
      const addDays = isNextWednesday ? diff + 7 : diff;
      d.setDate(d.getDate() + addDays);
      targetDate = toLocalDateStringServer(d);
      dateLabel = d.toLocaleDateString(locale, { weekday: 'long', month: 'long', day: 'numeric' });
    }

    return {
      type: 'update_moment',
      momentId,
      momentFields: {
        ...(targetDate ? { targetDate, dateLabel } : {}),
        ...(timeOfDay ? { timeOfDay } : {})
      }
    };
  }

  // 1. DELETE command
  if (
    lower.startsWith('удали') || lower.includes(' удали') ||
    lower.startsWith('убери') || lower.includes(' убери') ||
    lower.includes('delete') || lower.includes('remove') ||
    lower.includes('не хочу это в плане')
  ) {
    let targetStepId: string | undefined = undefined;
    let targetStepText = msgText.replace(/^(удали|убери|delete|remove)\s+/i, '').replace(/из\s+плана/i, '').trim();

    if (ctx.gentleSteps && Array.isArray(ctx.gentleSteps)) {
      const match = ctx.gentleSteps.find((s: any) =>
        s.text && (s.text.toLowerCase().includes(targetStepText.toLowerCase()) || targetStepText.toLowerCase().includes(s.text.toLowerCase()))
      );
      if (match) {
        targetStepId = match.id;
        targetStepText = match.text;
      }
    }

    return {
      type: 'delete_step',
      momentId,
      stepId: targetStepId,
      step: { text: targetStepText || 'step' }
    };
  }

  // 2. UPDATE command
  if (
    lower.startsWith('перенеси') || lower.includes('перенеси') ||
    lower.startsWith('поменяй') || lower.includes('поменяй') ||
    lower.includes('move') || lower.includes('reschedule') || lower.includes('change date')
  ) {
    const numMatch = lower.match(/(\d+)\s*дн/);
    const offsetDays = numMatch ? parseInt(numMatch[1], 10) : 5;

    let targetStepId: string | undefined = undefined;
    let targetStepText = '';

    if (ctx.gentleSteps && Array.isArray(ctx.gentleSteps)) {
      const match = ctx.gentleSteps.find((s: any) =>
        lower.includes(s.text.toLowerCase()) || (s.text.toLowerCase().includes('звонок') && lower.includes('звонок'))
      ) || ctx.gentleSteps[ctx.gentleSteps.length - 1];

      if (match) {
        targetStepId = match.id;
        targetStepText = match.text;
      }
    }

    return {
      type: 'update_step',
      momentId,
      stepId: targetStepId,
      step: {
        id: targetStepId,
        text: targetStepText || msgText,
        offsetDays: offsetDays,
        when: `T-${offsetDays} дней`
      }
    };
  }

  // 3. Relative offset ("за 6 дней до вылета")
  const isRelativeOffset = lower.match(/^(?:за|for|à)\s*(\d+)\s*(?:дн|day|dias|tagen|jour)/i) ||
                           lower.match(/(\d+)\s*дней?\s*до/i) || lower.match(/t-(\d+)/i);

  if (isRelativeOffset) {
    const daysNum = parseInt(isRelativeOffset[1], 10);
    let stepText = msgText.trim();

    if (hist && hist.length > 0) {
      for (let i = hist.length - 1; i >= 0; i--) {
        const text = hist[i].text || '';
        if (text.toLowerCase().includes('добавь') || text.toLowerCase().includes('записала:')) {
          const extracted = text.replace(/.*(?:добавь|записала:)\s*/i, '').replace(/\..*/, '').trim();
          if (extracted && extracted.length > 3) {
            stepText = extracted;
          }
          break;
        }
      }
    }

    return {
      type: 'add_step',
      momentId,
      step: {
        text: stepText,
        offsetDays: daysNum,
        when: `T-${daysNum} дней`
      }
    };
  }

  // 4. Explicit ADD command ("Добавь в Моя поездка...", "Добавь ...", "напомни за 6 дней...")
  if (
    lower.startsWith('добавь') || lower.includes('добавь в ') || lower.includes('добавить ') ||
    lower.startsWith('напомни') || lower.includes('напомни ') || lower.startsWith('add ')
  ) {
    let taskText = msgText;
    if (taskText.includes('—')) {
      taskText = taskText.split('—')[1].trim();
    } else if (taskText.includes('-')) {
      taskText = taskText.split('-')[1].trim();
    } else {
      taskText = taskText.replace(/^(добавь|добавить|напомни|add)\s+(?:в|to)?\s*[^—:-]+\s*[—:-]?\s*/i, '').trim();
    }

    const numMatch = lower.match(/(?:за|for)\s*(\d+)\s*дн/) || lower.match(/(\d+)\s*дней\s*до/);
    const offsetDays = numMatch ? parseInt(numMatch[1], 10) : undefined;

    return {
      type: 'add_step',
      momentId,
      step: {
        text: taskText || msgText,
        offsetDays: offsetDays,
        when: offsetDays ? `T-${offsetDays} дней` : undefined
      }
    };
  }

  // 5. Unconfirmed idea / General statement -> NONE (Rule 11)
  return { type: 'none' };
}

function getDynamicFallbackReply(
  message: string,
  lang: 'en' | 'ru' | 'es' | 'it' | 'zh' | 'tr' | 'fr' | 'de' | 'pt',
  history?: any[],
  eventContext?: any
): string {
  const lower = message.toLowerCase();
  const hasHistory = Array.isArray(history) && history.filter(m => m.sender === 'assistant' || m.sender === 'luma').length > 0;

  // 1. Museums / Culture / Sights
  const isMuseum = lower.includes('musei') || lower.includes('museum') || lower.includes('музеи') || 
                   lower.includes('müzeleri') || lower.includes('museos') || lower.includes('musées') || 
                   lower.includes('museen') || lower.includes('посетить') || lower.includes('галере') || lower.includes('galleri');
  if (isMuseum) {
    switch (lang) {
      case 'it': return "Ho segnato il tuo desiderio di visitare i musei. Ti piacerebbe aggiungerne alcuni di specifici al tuo piano di viaggio?";
      case 'ru': return "Я записала ваше пожелание посетить музеи. Хотите добавить конкретные музеи в ваш план?";
      case 'es': return "He anotado tu deseo de visitar museos. ¿Te gustaría añadir algunos específicos a tu plan de viaje?";
      case 'de': return "Ich habe Ihren Wunsch, Museen zu besuchen, notiert. Möchten Sie bestimmte Museen zum Plan hinzufügen?";
      case 'pt': return "Anotei seu desejo de visitar museus. Gostaria de adicionar alguns específicos ao seu plano de viagem?";
      case 'fr': return "J'ai bien noté votre souhait de visiter des musées. Souhaitez-vous en ajouter de spécifiques à votre plan ?";
      case 'tr': return "Müzeleri ziyaret etme isteğinizi kaydettim. Planınıza özel bazı müzeler eklemek ister misiniz?";
      case 'zh': return "我已经记录了您想参观博物馆的意愿。您想在计划中添加具体的目标吗？";
      default: return "I've noted your wish to visit museums. Would you like to add specific ones to your preparation plan?";
    }
  }

  // 2. Food / Cuisine / Local dishes / Restaurants
  const isFood = lower.includes('cucina') || lower.includes('food') || lower.includes('кухню') || 
                 lower.includes('кухня') || lower.includes('еду') || lower.includes('ресторан') || 
                 lower.includes('comida') || lower.includes('gastronomía') || lower.includes('gastronomia') || 
                 lower.includes('essen') || lower.includes('manger') || lower.includes('yemek') || lower.includes('dishes');
  if (isFood) {
    switch (lang) {
      case 'it': return "La cucina locale è una parte meravigliosa del viaggio! Ho aggiunto una nota per scoprire i piatti tipici con tutta calma.";
      case 'ru': return "Местная кухня — замечательная часть любого путешествия! Записала идею попробовать традиционные блюда.";
      case 'es': return "¡La gastronomía local es una parte maravillosa del viaje! He añadido una nota para probar los platos típicos con calma.";
      case 'de': return "Die lokale Küche ist ein wunderbarer Teil der Reise! Ich habe eine Notiz hinzugefügt, um entspannt lokale Gerichte zu probieren.";
      case 'pt': return "A culinária local é uma parte maravilhosa da viagem! Adicionei uma nota para experimentar a comida típica com calma.";
      case 'fr': return "La cuisine locale est une merveilleuse partie du voyage ! J'ai ajouté une note pour découvrir les plats typiques sereinement.";
      case 'tr': return "Yerel mutfak seyahatin harika bir parçasıdır! Yerel yemekleri sakince denemeniz için bir not ekledim.";
      case 'zh': return "当地美食是旅行中极棒的一部分！我已经记录下要悠闲品尝当地特色的提示。";
      default: return "Local cuisine is a wonderful part of any trip! I've added a note to explore local dishes at a relaxing pace.";
    }
  }

  // 3. Flight / Travel / Trip / City names
  const isTravel = lower.includes('istanbul') || lower.includes('estambul') || lower.includes('istambul') || 
                   lower.includes('стамбул') || lower.includes('flight') || lower.includes('trip') || 
                   lower.includes('travel') || lower.includes('поездк') || lower.includes('отпуск') || 
                   lower.includes('рейс') || lower.includes('volo') || lower.includes('fliegen') || 
                   lower.includes('viagg') || lower.includes('vuelo');
  if (isTravel) {
    if (hasHistory) {
      switch (lang) {
        case 'it': return "Ho aggiornato tutti i dettagli per il tuo viaggio. C'è qualcos'altro che vorresti considerare?";
        case 'ru': return "Я обновила все детали для вашей поездки. Есть ли ещё что-то важное, что вы хотите учесть?";
        case 'es': return "He actualizado todos los detalles de tu viaje. ¿Hay algo más importante que quieras considerar?";
        case 'de': return "Ich habe die Details für Ihre Reise aktualisiert. Gibt es noch etwas Wichtiges, das Sie berücksichtigen möchten?";
        case 'pt': return "Atualizei todos os detalhes da sua viagem. Há mais alguma coisa importante que você gostaria de considerar?";
        case 'fr': return "J'ai mis à jour les détails de votre voyage. Y a-t-il autre chose d'important que vous souhaiteriez prendre en compte ?";
        case 'tr': return "Seyahatiniz için tüm detayları güncelledim. Dikkate almak istediğiniz başka önemli bir şey var mı?";
        case 'zh': return "我已经更新了您行程的详细信息。您还有其他重要的事项想考虑吗？";
        default: return "I've updated all the details for your trip. Is there anything else important you'd like to consider?";
      }
    } else {
      switch (lang) {
        case 'it': return "Viaggi da solo o in famiglia? Mi assicurerò di impostare con calma i promemoria per il passaporto e l'eSIM.";
        case 'ru': return "Записала задачу по звонку. За сколько дней до вылета вы бы хотели сделать этот звонок?";
        case 'es': return "¿Viajas solo o en familia? Me encargaré de programar los recordatorios del pasaporte y la eSIM con calma.";
        case 'de': return "Reisen Sie allein oder mit der Familie? Ich werde dafür sorgen, dass Pass- und eSIM-Erinnerungen in aller Ruhe eingerichtet werden.";
        case 'pt': return "Você viaja sozinho ou com a família? Vou garantir que os lembretes do passaporte e do eSIM sejam definidos com calma.";
        case 'fr': return "Voyagez-vous seul ou en famille ? Je veillerai à programmer sereinement les rappels pour le passeport et l'eSIM.";
        case 'tr': return "Yalnız mı yoksa ailenizle mi seyahat ediyorsunuz? Pasaport ve eSIM hatırlatıcılarını sakince ayarlayacağımdan emin olabilirsiniz.";
        case 'zh': return "您是独自旅行还是与家人同行？我会轻柔地为您设置护照和 eSIM 提醒。";
        default: return "Noted your task. How many days before the event would you like to set this reminder?";
      }
    }
  }

  // 4. Doctor / Medical / Clinic
  const isDoctor = lower.includes('doctor') || lower.includes('clinic') || lower.includes('врач') || 
                   lower.includes('доктор') || lower.includes('клиник') || lower.includes('medica') || 
                   lower.includes('arzt') || lower.includes('visita');
  if (isDoctor) {
    if (hasHistory) {
      switch (lang) {
        case 'it': return "Ho annotato i dettagli per la visita medica. Vuoi che ti aiuti a preparare delle domande per il dottore?";
        case 'ru': return "Я сохранила детали визита к врачу. Помочь ли вам составить список вопросов к приёму?";
        case 'es': return "He anotado los detalles de la visita médica. ¿Quieres que te ayude a preparar preguntas para el doctor?";
        case 'de': return "Ich habe die Details zum Arztbesuch notiert. Soll ich Ihnen helfen, Fragen für den Arzt vorzubereiten?";
        case 'pt': return "Anotei os detalhes da consulta médica. Quer que eu ajude a preparar perguntas para o médico?";
        case 'fr': return "J'ai bien noté les détails du rendez-vous médical. Voulez-vous que je vous aide à préparer des questions pour le médecin ?";
        case 'tr': return "Doktor randevusu detaylarını kaydettim. Doktor için sorular hazırlamanıza yardımcı olmamı ister misiniz?";
        case 'zh': return "我已经记录了就诊的详细信息。需要我帮您准备要问医生的问题吗？";
        default: return "I've noted the details for your medical visit. Would you like help preparing questions for your doctor?";
      }
    } else {
      switch (lang) {
        case 'it': return "Ho registrato la tua visita medica. Ricorda di portare con calma i risultati degli esami precedenti. Andrà tutto bene.";
        case 'ru': return "Я записала ваш визит к врачу. Не забудьте взять результаты предыдущих анализов. Всё будет хорошо.";
        case 'es': return "He anotado tu visita médica. Recuerda traer los resultados de tus análisis anteriores con tranquilidad. Todo saldrá bien.";
        case 'de': return "Ich habe Ihren Arztbesuch notiert. Denken Sie daran, frühere Untersuchungsergebnisse in aller Ruhe mitzubringen. Alles wird gut werden.";
        case 'pt': return "Anotei sua consulta médica. Lembre-se de trazer os resultados dos exames anteriores com calma. Vai dar tudo certo.";
        case 'fr': return "J'ai bien noté votre visite médicale. Pensez à apporter sereinement vos précédents résultats d'analyses. Tout va bien se passer.";
        case 'tr': return "Doktor randevunuzu kaydettim. Önceki tahlil sonuçlarını yanınızda getirmeyi unutmayın. Her şey iyi olacak.";
        case 'zh': return "我已经记录了您的就诊。请记得带上之前的化验结果。一切都会顺利的。";
        default: return "I've noted your doctor visit. Remember to bring previous test results in peace. You're going to be okay.";
      }
    }
  }

  // 5. General fallback based on history
  if (hasHistory) {
    switch (lang) {
      case 'it': return "Ho aggiornato questa informazione nella tua preparazione. Di cos'altro vorresti parlare?";
      case 'ru': return "Я обновила этот шаг в вашем плане подготовки. Всё сохранено.";
      case 'es': return "He actualizado esta información en tu preparación. ¿De qué más te gustaría hablar?";
      case 'de': return "Ich habe diese Information in Ihrer Vorbereitung aktualisiert. Worüber möchten Sie noch sprechen?";
      case 'pt': return "Atualizei essa informação na sua preparação. Sobre o que mais gostaria de falar?";
      case 'fr': return "J'ai mis à jour cette information dans votre préparation. De quoi d'autre aimeriez-vous parler ?";
      case 'tr': return "Bu bilgiyi hazırlığınızda güncelledim. Başka ne hakkında konuşmak istersiniz?";
      case 'zh': return "我已经更新了您准备工作中的此信息。您还想聊些什么？";
      default: return "I've updated this step in your preparation plan.";
    }
  }

  switch (lang) {
    case 'it': return "Ti capisco. Non devi più tenere tutto a mente. L'ho annotato in modo sicuro per te.";
    case 'ru': return "Я вас понимаю. Больше не нужно всё держать в голове. Я бережно сохранила это для вас.";
    case 'es': return "Te entiendo. Ya no tienes que guardarlo todo en tu cabeza. Lo he anotado de forma segura para ti.";
    case 'de': return "Ich verstehe Sie. Sie müssen nicht mehr alles im Kopf behalten. Ich habe es sicher für Sie notiert.";
    case 'pt': return "Eu entendo você. Não precisa mais guardar tudo na cabeça. Anotei isso com segurança para você.";
    case 'fr': return "Je vous comprends. Vous n'avez plus besoin de tout garder en tête. Je l'ai soigneusement noté pour vous.";
    case 'tr': return "Sizi anlıyorum. Artık her şeyi aklınızda tutmanıza gerek yok. Bunu sizin için güvenle kaydettim.";
    case 'zh': return "我理解。您不必把所有事情都记在脑子里。我已经为您安全地记录下来了。";
    default: return "I understand. You don't have to keep everything in your mind. I've noted it safely for you.";
  }
}

  const detectedAction = detectActionFromMessage(message, history, eventContext, lang, currentClientTime);
  const ai = getGeminiClient();

  if (!ai) {
    const reply = getDynamicFallbackReply(message, lang, history, eventContext);
    return res.json({
      reply,
      action: detectedAction,
      updatedContext: eventContext
    });
  }

  try {
    const talkReferenceDate = resolveReferenceDate(currentClientTime);
    const talkReferenceDateLabel = talkReferenceDate.toLocaleDateString(lang === 'ru' ? 'ru-RU' : 'en-US', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });

    const systemInstruction = `
You are Luma — a calm, gentle AI companion that helps people prepare for important life moments without stress or endless task lists.
Emotional promise: "I don't have to hold everything in my head anymore."

You are continuing an ongoing conversation with the user regarding a life moment.

Target Language: ${responseLanguage}
Today, from the user's perspective, is: ${talkReferenceDateLabel}.

CRITICAL RULES:
1. Speak with quiet warmth, clarity, and empathy in 1-2 short sentences.
2. Return a JSON object with:
   - "reply": Warm response strictly in ${responseLanguage}.
   - "action": An object describing structured state changes:
     - type: "add_step" | "update_step" | "delete_step" | "update_moment" | "none"
     - momentId: MUST BE EXACTLY "${eventContext?.momentId || ''}" if provided. DO NOT INVENT A NEW ID.
     - stepId: ID of step if updating or deleting a step.
     - step: { text: "...", offsetDays: <number of days before event>, when: "T-6 дней" }
     - momentFields: If type is "update_moment", return the fields of the moment being updated:
       - targetDate: YYYY-MM-DD (e.g. if the user says "пятница", convert to correct YYYY-MM-DD relative to today, ${talkReferenceDateLabel})
       - dateLabel: Elegant localized date label (e.g. "Friday, August 14" in English, "Пятница, 14 августа" in Russian)
       - timeOfDay: HH:MM in 24-hour format
3. If the user wants to reschedule/update the main moment itself (e.g. "Перенеси встречу с руководителем на пятницу на 15:00.", "Перенеси встречу на 15:00", "Поменяй время на час дня"), set action.type = "update_moment". Calculate the targetDate (YYYY-MM-DD) and dateLabel relative to today (${talkReferenceDateLabel}) — double-check your day-of-week arithmetic before answering — and parse the timeOfDay correctly.
4. Rule for unconfirmed ideas (e.g. "Я хочу посетить музеи"): set action.type = "none" and ask if they want to add it. Only create add_step if user explicitly asks to add or confirms.
`;

    const prompt = `
Target Response Language: ${responseLanguage}
Current Local Time of the User (client time reference): "${currentClientTime || new Date().toISOString()}"
Today, from the user's perspective, is: ${talkReferenceDateLabel}.

Existing App Moments (for context and finding matching events):
${JSON.stringify(moments || [], null, 2)}

Current Event Context:
${JSON.stringify(eventContext || {}, null, 2)}

Conversation History:
${JSON.stringify(history || [], null, 2)}

New User Message:
"${message}"

Return a JSON object with keys "reply", "action", and "updatedContext".
`;

    const primaryTalkModel = plan === 'pro' ? 'gemini-3.6-flash' : 'gemini-3.1-flash-lite';

    const response = await generateWithRetry(ai, {
      primaryModel: primaryTalkModel,
      fallbackModel: 'gemini-3.1-flash-lite',
      contents: prompt,
      label: 'luma-talk',
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    
    let defaultReply = 'Я услышала вас.';

    let finalAction = parsed.action;
    if (!finalAction || !finalAction.type || finalAction.type === 'none') {
      if (detectedAction.type !== 'none') {
        finalAction = detectedAction;
      } else {
        finalAction = { type: 'none' };
      }
    } else {
      // Force momentId to match app context
      if (eventContext?.momentId) {
        finalAction.momentId = eventContext.momentId;
      }
    }

    return res.json({
      reply: parsed.reply || defaultReply,
      action: finalAction,
      updatedContext: parsed.updatedContext || eventContext
    });
  } catch (err: any) {
    console.error('Error in luma-talk:', err);
    const reply = getDynamicFallbackReply(message, lang, history, eventContext);

    return res.json({
      reply,
      action: detectedAction,
      updatedContext: eventContext,
      ...(process.env.NODE_ENV !== 'production'
        ? { debugError: err?.message || String(err) }
        : {}),
    });
  }
});

// Serves the Firebase Messaging service worker with the real config values
// baked in — it can't read Vite's import.meta.env since it's not bundled by
// Vite, so the values are substituted here from the same .env.local that
// already powers everything else. Registered directly on Express (not left
// to Vite's dev middleware or the static file server) so it works the same
// way in dev and production, and so the browser sees the exact bytes it
// expects at the root-scoped path required for push notifications.
// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================
// Moments live in the browser's localStorage — the server has no idea an
// event exists until the client syncs a lightweight copy here (just enough
// to schedule a reminder: id, title, date, time). Nothing else about the
// moment (notes, prep steps) is ever sent to Firestore.

const REMINDER_TEXT: Record<string, { dayBefore: (title: string) => string; hoursBefore: (title: string) => string }> = {
  en: {
    dayBefore: (title) => `Tomorrow: ${title}. A gentle nudge to finish getting ready.`,
    hoursBefore: (title) => `Coming up soon: ${title}. You've got this.`,
  },
  ru: {
    dayBefore: (title) => `Завтра: ${title}. Самое время закончить подготовку.`,
    hoursBefore: (title) => `Скоро: ${title}. Всё под контролем.`,
  },
  es: {
    dayBefore: (title) => `Mañana: ${title}. Un recordatorio suave para terminar de prepararte.`,
    hoursBefore: (title) => `Muy pronto: ${title}. Lo tienes bajo control.`,
  },
  fr: {
    dayBefore: (title) => `Demain : ${title}. Un petit rappel pour finir de vous préparer.`,
    hoursBefore: (title) => `Bientôt : ${title}. Vous êtes prêt·e.`,
  },
  it: {
    dayBefore: (title) => `Domani: ${title}. Un gentile promemoria per finire di prepararti.`,
    hoursBefore: (title) => `Tra poco: ${title}. Sei pronto/a.`,
  },
  pt: {
    dayBefore: (title) => `Amanhã: ${title}. Um lembrete gentil para terminar de se preparar.`,
    hoursBefore: (title) => `Em breve: ${title}. Você está pronto(a).`,
  },
  tr: {
    dayBefore: (title) => `Yarın: ${title}. Hazırlığınızı tamamlamak için nazik bir hatırlatma.`,
    hoursBefore: (title) => `Yakında: ${title}. Hazırsınız.`,
  },
  zh: {
    dayBefore: (title) => `明天：${title}。温柔提醒您完成准备。`,
    hoursBefore: (title) => `即将开始：${title}。一切准备就绪。`,
  },
  de: {
    dayBefore: (title) => `Morgen: ${title}. Eine sanfte Erinnerung, die Vorbereitung abzuschließen.`,
    hoursBefore: (title) => `Bald: ${title}. Du bist bereit.`,
  },
};

// Replaces this user's synced moment list wholesale — simpler and safer than
// per-moment create/update/delete calls scattered across every place the
// client can change a moment. Only reminder-relevant fields are stored.
app.post('/api/notifications/sync-moments', requireAuth, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Notifications are not configured on this server yet.' });
  const uid = (req as any).user.uid;
  const { moments } = req.body as { moments: Array<{ id: string; title: string; targetDate?: string; timeOfDay?: string }> };

  try {
    const momentsRef = db.collection('users').doc(uid).collection('moments');
    const existing = await momentsRef.get();
    const incomingIds = new Set((moments || []).map((m) => m.id));

    const batch = db.batch();
    existing.docs.forEach((doc: any) => {
      if (!incomingIds.has(doc.id)) batch.delete(doc.ref);
    });
    for (const m of moments || []) {
      if (!m.targetDate) continue;
      batch.set(
        momentsRef.doc(m.id),
        {
          title: m.title,
          targetDate: m.targetDate,
          timeOfDay: m.timeOfDay || null,
        },
        { merge: true }
      );
    }
    await batch.commit();
    res.json({ success: true });
  } catch (e: any) {
    console.error('sync-moments error', e);
    res.status(500).json({ error: 'Could not sync moments.' });
  }
});

// Registers this device's FCM token and the preferences needed to schedule
// reminders at sensible times (timezone, quiet hours, language).
app.post('/api/notifications/register', requireAuth, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Notifications are not configured on this server yet.' });
  const uid = (req as any).user.uid;
  const { token, timezone, language, quietHours, quietHoursRange, prepReminders, importantReminders } = req.body;

  try {
    const userRef = db.collection('users').doc(uid);
    const update: any = {
      timezone: timezone || 'UTC',
      language: language || 'en',
      quietHours: quietHours !== false,
      quietHoursRange: quietHoursRange || '22:00-08:00',
      prepReminders: prepReminders !== false,
      importantReminders: importantReminders !== false,
    };
    if (token) {
      update.fcmTokens = FieldValue.arrayUnion(token);
    }
    await userRef.set(update, { merge: true });
    res.json({ success: true });
  } catch (e: any) {
    console.error('register notification error', e);
    res.status(500).json({ error: 'Could not save notification settings.' });
  }
});

app.post('/api/notifications/unregister', requireAuth, async (req, res) => {
  if (!db) return res.status(503).json({ error: 'Notifications are not configured on this server yet.' });
  const uid = (req as any).user.uid;
  const { token } = req.body;
  try {
    if (token) {
      await db.collection('users').doc(uid).set(
        { fcmTokens: FieldValue.arrayRemove(token) },
        { merge: true }
      );
    }
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ error: 'Could not update notification settings.' });
  }
});

/**
 * Returns the current local hour (0-23) for a given IANA timezone. Falls
 * back to UTC if the timezone string is missing or invalid.
 */
function localHourInTimezone(timezone: string, date: Date): number {
  try {
    return parseInt(
      new Intl.DateTimeFormat('en-US', { timeZone: timezone, hour: 'numeric', hour12: false }).format(date),
      10
    ) % 24;
  } catch {
    return date.getUTCHours();
  }
}

function isWithinQuietHours(timezone: string, quietHoursRange: string, date: Date): boolean {
  const [start, end] = (quietHoursRange || '22:00-08:00').split('-').map((s) => parseInt(s, 10));
  const hour = localHourInTimezone(timezone, date);
  if (isNaN(start) || isNaN(end)) return false;
  if (start > end) return hour >= start || hour < end; // wraps past midnight
  return hour >= start && hour < end;
}

/**
 * Checks every user's synced moments for a due "day before" or "2 hours
 * before" reminder, and sends push notifications via FCM. Runs on an
 * interval (see start() below) — for a production deployment behind a host
 * that can spin containers down when idle, hitting this same logic from an
 * external Cloud Scheduler job is more reliable; see README.
 */
async function checkAndSendReminders() {
  if (!db || !firebaseAdminApp) return;
  const now = new Date();

  try {
    const usersSnap = await db.collection('users').where('fcmTokens', '!=', null).get();
    for (const userDoc of usersSnap.docs) {
      const userData = userDoc.data();
      const tokens: string[] = userData.fcmTokens || [];
      if (!tokens.length) continue;
      const timezone = userData.timezone || 'UTC';
      const lang = REMINDER_TEXT[userData.language] ? userData.language : 'en';
      const quietHoursOn = userData.quietHours !== false;

      if (quietHoursOn && isWithinQuietHours(timezone, userData.quietHoursRange, now)) {
        continue; // try again next pass, once quiet hours have ended
      }

      const momentsSnap = await userDoc.ref.collection('moments').get();
      for (const momentDoc of momentsSnap.docs) {
        const m = momentDoc.data();
        if (!m.targetDate) continue;
        const [y, mo, d] = m.targetDate.split('-').map((n: string) => parseInt(n, 10));
        const [hh, mm] = (m.timeOfDay || '09:00').split(':').map((n: string) => parseInt(n, 10));

        // Both "now" and the event are expressed as UTC-labeled instants
        // built from the SAME local wall-clock numbers, so subtracting them
        // gives a valid relative difference without needing a full timezone
        // math library. (Known limitation: off by the DST shift, if any,
        // between now and the event — acceptable for T-1-day/T-2-hour nudges.)
        const nowLocalStr = new Intl.DateTimeFormat('en-CA', {
          timeZone: timezone, year: 'numeric', month: '2-digit', day: '2-digit',
          hour: '2-digit', minute: '2-digit', hour12: false,
        }).format(now);
        const [nowDatePart, nowTimePart] = nowLocalStr.split(', ');
        const [nowY, nowMo, nowD] = nowDatePart.split('-').map((n) => parseInt(n, 10));
        const [nowH, nowMin] = nowTimePart.split(':').map((n) => parseInt(n, 10));
        const nowInstant = Date.UTC(nowY, nowMo - 1, nowD, nowH, nowMin);

        const eventInstant = Date.UTC(y, mo - 1, d, hh, mm);
        const dayBeforeTrigger = Date.UTC(y, mo - 1, d - 1, 18, 0);
        const hoursBeforeTrigger = eventInstant - 2 * 60 * 60 * 1000;

        const remindersSent = m.remindersSent || {};
        const messages: string[] = [];

        if (userData.prepReminders !== false && !remindersSent.dayBefore && nowInstant >= dayBeforeTrigger && nowInstant < eventInstant) {
          messages.push(REMINDER_TEXT[lang].dayBefore(m.title || 'Your moment'));
          remindersSent.dayBefore = true;
        }
        if (userData.importantReminders !== false && m.timeOfDay && !remindersSent.hoursBefore && nowInstant >= hoursBeforeTrigger && nowInstant < eventInstant) {
          messages.push(REMINDER_TEXT[lang].hoursBefore(m.title || 'Your moment'));
          remindersSent.hoursBefore = true;
        }

        for (const body of messages) {
          try {
            await getMessaging(firebaseAdminApp).sendEachForMulticast({
              tokens,
              notification: { title: 'Luma', body },
              data: { url: '/' },
            });
          } catch (sendErr) {
            console.error('Failed to send reminder push', sendErr);
          }
        }
        if (messages.length) {
          await momentDoc.ref.set({ remindersSent }, { merge: true });
        }
      }
    }
  } catch (e) {
    console.error('checkAndSendReminders error', e);
  }
}

app.get('/firebase-messaging-sw.js', (req, res) => {
  const cfg = {
    apiKey: process.env.VITE_FIREBASE_API_KEY || '',
    authDomain: process.env.VITE_FIREBASE_AUTH_DOMAIN || '',
    projectId: process.env.VITE_FIREBASE_PROJECT_ID || '',
    appId: process.env.VITE_FIREBASE_APP_ID || '',
    messagingSenderId: process.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  };
  const js = `
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/11.0.2/firebase-messaging-compat.js');

firebase.initializeApp(${JSON.stringify(cfg)});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || 'Luma';
  const options = {
    body: (payload.notification && payload.notification.body) || '',
    icon: '/assets/icon-192.png',
    badge: '/assets/icon-192.png',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = (event.notification.data && event.notification.data.url) || '/';
  event.waitUntil(
    self.clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientsArr) => {
      const existing = clientsArr.find((c) => c.url.includes(self.location.origin));
      if (existing) {
        existing.focus();
      } else {
        self.clients.openWindow(targetUrl);
      }
    })
  );
});
`.trimStart();
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('Service-Worker-Allowed', '/');
  res.send(js);
});

// External trigger for the reminder check — point a Cloud Scheduler job (or
// any cron service) at this URL every 5-15 minutes. This is the reliable
// option for hosts that can spin your container down when idle, since the
// in-process setInterval below only runs while the server is actually up.
// Protected by a shared secret (not a user's Firebase token) since it's
// meant to be called by infrastructure, not a signed-in person.
app.post('/api/notifications/run-check', async (req, res) => {
  const secret = process.env.CRON_SECRET;
  const provided = (req.headers.authorization || '').replace('Bearer ', '');
  if (!secret || provided !== secret) {
    return res.status(401).json({ error: 'Unauthorized.' });
  }
  await checkAndSendReminders();
  res.json({ success: true });
});

// Start Express server and attach Vite
async function start() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const listenerPort = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;
  app.listen(listenerPort, '0.0.0.0', () => {
    console.log(`Luma server listening on http://0.0.0.0:${listenerPort}`);
  });

  // Simple always-on fallback: check for due reminders every 5 minutes.
  // Only useful if your host keeps this process running continuously — see
  // the /api/notifications/run-check route above for the Cloud Scheduler
  // alternative, which works even if the container sleeps between requests.
  if (db) {
    setInterval(checkAndSendReminders, 5 * 60 * 1000);
  }
}

start();
