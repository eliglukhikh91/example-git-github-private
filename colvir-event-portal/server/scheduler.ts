import {
  findCyclesDueForMatching,
  runMatching,
  notifyMatchMembers,
  sendDueReminders
} from './services/coffee.js';
import { createNotification } from './services/engagement.js';

/**
 * Фоновые задачи Random Coffee.
 *
 * Подбор пар работает циклами, поэтому кому-то нужно запустить его в момент
 * дедлайна — этим занимается таймер ниже. Отдельная задача рассылает
 * напоминание «пора на кофе-брейк» перед началом слота.
 *
 * Реализовано простым интервалом внутри процесса: внешний планировщик
 * (cron, k8s CronJob) для одной задачи раз в несколько минут — избыточен.
 * При нескольких репликах задачи возьмёт та, что проснётся первой: подбор
 * защищён проверкой статуса цикла, а напоминания — полем reminder_sent_at,
 * поэтому дубликатов не будет.
 */

const DEFAULT_INTERVAL_MS = 60_000;

export interface SchedulerHandle {
  stop: () => void;
  /** Прогнать задачи немедленно — используется в тестах. */
  runOnce: () => Promise<{ matchedCycles: number; notified: number; reminders: number }>;
}

export async function runScheduledTasks(): Promise<{
  matchedCycles: number;
  notified: number;
  reminders: number;
}> {
  let matchedCycles = 0;
  let notified = 0;

  const due = await findCyclesDueForMatching();
  for (const cycle of due) {
    try {
      const result = await runMatching(cycle.id);
      notified += await notifyMatchMembers(result.matches, createNotification);
      matchedCycles += 1;
      console.log(
        `[coffee] Цикл ${cycle.id}: собрано встреч ${result.matches.length}, ` +
          `без пары ${result.unmatched.length}`
      );
    } catch (error) {
      // Например, участников меньше двух — цикл останется открытым,
      // администратор решит, продлить его или отменить.
      console.warn(`[coffee] Цикл ${cycle.id} не удалось сматчить:`, (error as Error).message);
    }
  }

  const reminders = await sendDueReminders(createNotification);
  if (reminders > 0) {
    console.log(`[coffee] Отправлено напоминаний о кофе-брейке: ${reminders}`);
  }

  return { matchedCycles, notified, reminders };
}

export function startScheduler(intervalMs = DEFAULT_INTERVAL_MS): SchedulerHandle {
  let running = false;

  const tick = async () => {
    // Пропускаем такт, если предыдущий ещё не закончился.
    if (running) return;
    running = true;
    try {
      await runScheduledTasks();
    } catch (error) {
      console.error('[scheduler] Ошибка фоновой задачи:', error);
    } finally {
      running = false;
    }
  };

  const timer = setInterval(() => void tick(), intervalMs);
  timer.unref();

  return {
    stop: () => clearInterval(timer),
    runOnce: runScheduledTasks
  };
}
