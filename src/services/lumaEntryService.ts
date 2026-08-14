import { LifeMoment, GentleStep } from '../types';
import { LanguageCode, TRANSLATIONS } from '../data/translations';
import { parseEventDate } from '../utils/dateParser';
import { getLocalTimestamp } from '../utils/timezoneUtils';
import { getAuthToken } from '../firebase';

export interface CreateLumaEntryInput {
  text: string;
  date?: string;
  time?: string;
  category?: 'journey' | 'health' | 'career' | 'family' | 'personal' | string;
  language?: LanguageCode;
  source?: 'web_ui' | 'voice_input' | 'siri_shortcut' | 'android_action' | string;
  plan?: 'free' | 'pro';
}

export interface CreateLumaEntryResult {
  success: boolean;
  moment: LifeMoment;
  message: string;
  source: string;
  aiSource?: string;
}

function detectInputLanguage(text: string, defaultLang: LanguageCode = 'en'): LanguageCode {
  const trimmed = text.trim();
  if (!trimmed) return defaultLang;
  // If text contains Cyrillic characters, it's Russian
  if (/[а-яА-ЯёЁ]/.test(trimmed)) {
    return 'ru';
  }
  // If text contains CJK
  if (/[\u4e00-\u9fa5]/.test(trimmed)) {
    return 'zh';
  }
  // Otherwise, if Latin alphabet, default to English
  return 'en';
}

/**
 * Core action handler for creating Luma Moments.
 * Designed to process inputs uniformly whether coming from Web UI, Voice STT,
 * iOS Siri Shortcuts / App Intents, or Android App Actions.
 */
export async function createLumaEntry(input: CreateLumaEntryInput): Promise<CreateLumaEntryResult> {
  const text = input.text.trim();
  const contentLang = detectInputLanguage(text, input.language || 'en');
  const source = input.source || 'web_ui';
  const t = TRANSLATIONS[contentLang] || TRANSLATIONS.en;

  if (!text) {
    throw new Error('Text input cannot be empty');
  }

  // Parse date, time, daysLeft, and timezone from input text and explicit inputs
  const parsedDate = parseEventDate(text, input.date, input.time, contentLang);

  // Detect basic category from text keywords if not explicitly supplied
  const lower = text.toLowerCase();
  let category: 'journey' | 'health' | 'career' | 'family' | 'personal' = 'personal';

  if (
    lower.includes('sobes') ||
    lower.includes('собес') ||
    lower.includes('interview') ||
    lower.includes('интервью') ||
    lower.includes('job') ||
    lower.includes('работа') ||
    lower.includes('salary') ||
    lower.includes('manager')
  ) {
    category = 'career';
  } else if (
    lower.includes('турци') ||
    lower.includes('поездк') ||
    lower.includes('отпуск') ||
    lower.includes('flight') ||
    lower.includes('trip') ||
    lower.includes('travel') ||
    lower.includes('стамбул') ||
    lower.includes('билет') ||
    lower.includes('лечу') ||
    lower.includes('полет') ||
    lower.includes('перелет') ||
    lower.includes('рейс') ||
    lower.includes('авиа') ||
    lower.includes('самолет') ||
    lower.includes('аэропорт') ||
    lower.includes('volo') ||
    lower.includes('viagg') ||
    lower.includes('fliegen') ||
    lower.includes('vuelo') ||
    lower.includes('vol') ||
    lower.includes('aeroporto') ||
    lower.includes('airport') ||
    lower.includes('vacation') ||
    lower.includes('holiday') ||
    lower.includes('istanbul') ||
    lower.includes('estambul') ||
    lower.includes('istambul') ||
    lower.includes('turkey') ||
    lower.includes('türkei') ||
    lower.includes('turquie') ||
    lower.includes('turquia') ||
    lower.includes('turchia')
  ) {
    category = 'journey';
  } else if (
    lower.includes('врач') ||
    lower.includes('доктор') ||
    lower.includes('doctor') ||
    lower.includes('медицин') ||
    lower.includes('клиник') ||
    lower.includes('анализ') ||
    lower.includes('прием') ||
    lower.includes('medica') ||
    lower.includes('arzt') ||
    lower.includes('visita')
  ) {
    category = 'health';
  } else if (
    lower.includes('семья') ||
    lower.includes('мама') ||
    lower.includes('папа') ||
    lower.includes('ребенок') ||
    lower.includes('family') ||
    lower.includes('kid')
  ) {
    category = 'family';
  }

  // Attempt to call server AI endpoint /api/generate-prep
  try {
    const authToken = await getAuthToken();
    const res = await fetch('/api/generate-prep', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      },
      body: JSON.stringify({
        title: text,
        category,
        language: contentLang,
        timezone: parsedDate.timezone,
        eventDate: parsedDate.dateLabel || input.date || input.time ? `${parsedDate.dateLabel || input.date || ''} ${parsedDate.timeOfDay || input.time || ''}`.trim() : undefined,
        contextDetails: `Source: ${source}`,
        currentClientTime: getLocalTimestamp(),
        plan: input.plan,
      })
    });

    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        const prep = json.data;

        // Convert API response checklist into Luma GentleSteps
        const gentleSteps: GentleStep[] = [];

        if (prep.checklist?.before?.length) {
          prep.checklist.before.forEach((item: any, idx: number) => {
            gentleSteps.push({
              id: `s_b_${Date.now()}_${idx}`,
              text: item.title,
              when: item.timeline || 'Before',
              done: false,
            });
          });
        }

        if (prep.checklist?.dayOf?.length) {
          prep.checklist.dayOf.forEach((item: any, idx: number) => {
            gentleSteps.push({
              id: `s_d_${Date.now()}_${idx}`,
              text: item.title,
              when: item.timeline || 'Day of event',
              done: false,
            });
          });
        }

        if (gentleSteps.length === 0) {
          gentleSteps.push({
            id: `s_default_${Date.now()}`,
            text: t.defaultStepText,
            when: 'Today',
            done: false,
          });
        }

        let calculatedDaysLeft = parsedDate.daysLeft;
        const targetDateStr = prep.targetDate || parsedDate.targetDate;
        if (targetDateStr) {
          const parts = targetDateStr.split('-');
          if (parts.length === 3) {
            const yr = parseInt(parts[0], 10);
            const mo = parseInt(parts[1], 10) - 1;
            const da = parseInt(parts[2], 10);
            const now = new Date();
            const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const target0 = new Date(yr, mo, da);
            const diffMs = target0.getTime() - today0.getTime();
            calculatedDaysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));
          }
        }

        const moment: LifeMoment = {
          id: prep.eventId || `m_${Date.now()}`,
          title: prep.title || text,
          originalPrompt: text,
          purpose: prep.purpose,
          category: prep.category || category,
          dateLabel: prep.dateLabel || parsedDate.dateLabel,
          targetDate: prep.targetDate || parsedDate.targetDate,
          timeOfDay: prep.timeOfDay !== undefined ? prep.timeOfDay : (parsedDate.timeOfDay || input.time),
          timezone: prep.timezone || parsedDate.timezone,
          daysLeft: calculatedDaysLeft,
          oneThingToPrepare: gentleSteps[0]?.text || t.reviewMainSteps,
          reassuranceNote: prep.summary || prep.aiTip || t.organizedAssurance,
          gentleSteps,
        };

        const confirmationMsg = t.eventCreatedMessage(moment.title, moment.gentleSteps.length);

        return {
          success: true,
          moment,
          message: confirmationMsg,
          source,
          aiSource: json.source || 'gemini-ai',
        };
      } else {
        console.error('API responded with success: false or missing data:', json);
      }
    } else {
      const errText = await res.text();
      console.error(`API Error ${res.status} when calling /api/generate-prep:`, errText);
    }
  } catch (err) {
    console.error('Network or server error when calling /api/generate-prep, using local fallback:', err);
  }

  // Robust Client-Side Fallback if server is unreachable
  const fallbackSteps: GentleStep[] = [
    {
      id: `s_fb_1_${Date.now()}`,
      text: t.fallbackStep1Text,
      when: t.fallbackStep1When,
      done: false,
    },
    {
      id: `s_fb_2_${Date.now()}`,
      text: t.fallbackStep2Text,
      when: t.fallbackStep2When,
      done: false,
    },
    {
      id: `s_fb_3_${Date.now()}`,
      text: t.fallbackStep3Text,
      when: t.fallbackStep3When,
      done: false,
    },
  ];

  let cleanTitle = text;
  const lowerText = text.toLowerCase();
  if (lowerText.includes('встреча с руководителем') || lowerText.includes('встречу с руководителем')) {
    cleanTitle = contentLang === 'ru' ? 'Встреча с руководителем' : 'Meeting with manager';
  } else if (lowerText.includes('собеседование') || lowerText.includes('собес')) {
    cleanTitle = contentLang === 'ru' ? 'Собеседование' : 'Interview';
  } else if (lowerText.includes('стоматолог')) {
    cleanTitle = contentLang === 'ru' ? 'Стоматолог' : 'Dentist';
  } else if (lowerText.includes('стамбул') || lowerText.includes('istanbul')) {
    cleanTitle = contentLang === 'ru' ? 'Поездка в Стамбул' : 'Trip to Istanbul';
  }

  const fallbackMoment: LifeMoment = {
    id: `m_${Date.now()}`,
    title: cleanTitle,
    originalPrompt: text,
    category,
    dateLabel: parsedDate.dateLabel,
    targetDate: parsedDate.targetDate,
    timeOfDay: parsedDate.timeOfDay || input.time,
    timezone: parsedDate.timezone,
    daysLeft: parsedDate.daysLeft,
    oneThingToPrepare: fallbackSteps[0].text,
    reassuranceNote: t.fallbackMomentSaved,
    gentleSteps: fallbackSteps,
  };

  return {
    success: true,
    moment: fallbackMoment,
    message: t.eventAddedMessage(cleanTitle),
    source,
    aiSource: 'client-fallback',
  };
}

/**
 * Standard Action Interface Schema for Future Native Mobile App Integrations:
 * - iOS: Apple App Intents / Siri Shortcuts
 * - Android: Android App Actions / Google Assistant Shortcuts
 */
export const LUMA_NATIVE_INTENT_SPEC = {
  intentName: 'CreateLumaEntryIntent',
  description: 'Create a new life moment event with AI-generated preparation steps in Luma',
  parameters: {
    text: {
      type: 'string',
      required: true,
      description: 'The natural language prompt or speech transcript describing the event',
    },
    date: {
      type: 'string',
      required: false,
      description: 'Optional date string (e.g., "next Friday", "2026-08-15")',
    },
    time: {
      type: 'string',
      required: false,
      description: 'Optional time string (e.g., "15:00", "3 PM")',
    },
    category: {
      type: 'string',
      required: false,
      enum: ['journey', 'health', 'career', 'family', 'personal'],
      description: 'Optional category tag for the moment',
    },
  },
  handler: createLumaEntry,
};
