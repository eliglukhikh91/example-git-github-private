import React, { useCallback, useEffect, useState } from 'react';
import {
  CalendarClock,
  Play,
  Users,
  Ban,
  Plus,
  AlertTriangle,
  CheckCircle2,
  Coffee
} from 'lucide-react';
import { api, ApiError } from '../api/client';
import { useApp } from '../context/AppContext';
import type { CoffeeCycle, CoffeeMatch } from '../types';

/**
 * Управление циклами Random Coffee.
 *
 * Подбор пар выполняет сервер по дедлайну — планировщик проверяет открытые
 * циклы раз в минуту. Кнопка ниже нужна, чтобы запустить подбор досрочно,
 * не дожидаясь срока.
 */

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });
}

/** Дефолт для формы: встречи через неделю, запись закрывается за день до них. */
function defaultCycleDates(): { meetingDate: string; registrationEndsAt: string } {
  const meeting = new Date();
  meeting.setDate(meeting.getDate() + 7);
  const deadline = new Date(meeting);
  deadline.setDate(deadline.getDate() - 1);
  deadline.setHours(18, 0, 0, 0);

  const pad = (value: number) => String(value).padStart(2, '0');
  return {
    meetingDate: `${meeting.getFullYear()}-${pad(meeting.getMonth() + 1)}-${pad(meeting.getDate())}`,
    registrationEndsAt:
      `${deadline.getFullYear()}-${pad(deadline.getMonth() + 1)}-${pad(deadline.getDate())}` +
      `T${pad(deadline.getHours())}:${pad(deadline.getMinutes())}`
  };
}

export const AdminCoffeeCycles: React.FC = () => {
  const { refreshCoffee } = useApp();

  const [cycles, setCycles] = useState<CoffeeCycle[]>([]);
  const [matches, setMatches] = useState<Record<number, CoffeeMatch[]>>({});
  const [form, setForm] = useState(defaultCycleDates);
  const [title, setTitle] = useState('');
  const [busy, setBusy] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  const load = useCallback(async () => {
    try {
      const response = await api.get<{ cycles: CoffeeCycle[] }>('/api/coffee/cycles');
      setCycles(response.cycles);
    } catch (error) {
      setFeedback({
        ok: false,
        message: error instanceof ApiError ? error.message : 'Не удалось загрузить циклы'
      });
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const report = (ok: boolean, message: string) => {
    setFeedback({ ok, message });
    setTimeout(() => setFeedback(null), 6000);
  };

  const handleCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    try {
      await api.post('/api/coffee/cycles', {
        title: title.trim() || undefined,
        meetingDate: form.meetingDate,
        // datetime-local отдаёт время без зоны — переводим в ISO по локали браузера.
        registrationEndsAt: new Date(form.registrationEndsAt).toISOString()
      });
      setTitle('');
      await load();
      await refreshCoffee();
      report(true, 'Цикл открыт, сотрудники могут отмечать слоты');
    } catch (error) {
      report(false, error instanceof ApiError ? error.message : 'Не удалось открыть цикл');
    } finally {
      setBusy(false);
    }
  };

  const handleMatch = async (cycleId: number) => {
    setBusy(true);
    try {
      const result = await api.post<{ matches: CoffeeMatch[]; unmatched: string[]; notified: number }>(
        `/api/coffee/cycles/${cycleId}/match`
      );
      setMatches((prev) => ({ ...prev, [cycleId]: result.matches }));
      await load();
      await refreshCoffee();
      report(
        true,
        `Собрано встреч: ${result.matches.length}. Уведомлений отправлено: ${result.notified}.` +
          (result.unmatched.length > 0 ? ` Без пары: ${result.unmatched.length}.` : '')
      );
    } catch (error) {
      report(false, error instanceof ApiError ? error.message : 'Подбор не удался');
    } finally {
      setBusy(false);
    }
  };

  const handleCancel = async (cycleId: number) => {
    setBusy(true);
    try {
      await api.post(`/api/coffee/cycles/${cycleId}/cancel`);
      await load();
      await refreshCoffee();
      report(true, 'Цикл отменён');
    } catch (error) {
      report(false, error instanceof ApiError ? error.message : 'Не удалось отменить цикл');
    } finally {
      setBusy(false);
    }
  };

  const loadMatches = async (cycleId: number) => {
    try {
      const response = await api.get<{ matches: CoffeeMatch[] }>(
        `/api/coffee/cycles/${cycleId}/matches`
      );
      setMatches((prev) => ({ ...prev, [cycleId]: response.matches }));
    } catch (error) {
      report(false, error instanceof ApiError ? error.message : 'Не удалось загрузить пары');
    }
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
          <Coffee className="w-4 h-4 text-accent shrink-0" />
          Циклы Random Coffee
        </h3>
        <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
          Сотрудники отмечают удобные слоты до дедлайна, затем сервер разбивает их на пары по
          общему времени. Подбор запускается автоматически по дедлайну — кнопка ниже нужна только
          чтобы сделать это раньше срока.
        </p>
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-xs font-semibold flex items-start gap-2 ${
            feedback.ok
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {feedback.ok ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
          ) : (
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          )}
          <span>{feedback.message}</span>
        </div>
      )}

      {/* Новый цикл */}
      <form
        onSubmit={handleCreate}
        className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3"
      >
        <h4 className="text-xs font-black text-slate-800">Открыть новый цикл</h4>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Название (необязательно)
            </label>
            <input
              type="text"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Например: Random Coffee, неделя 34"
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-accent outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">Дата встреч</label>
            <input
              type="date"
              required
              value={form.meetingDate}
              onChange={(event) => setForm((prev) => ({ ...prev, meetingDate: event.target.value }))}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-accent outline-hidden"
            />
          </div>

          <div>
            <label className="block text-[11px] font-bold text-slate-600 mb-1">
              Запись закрывается
            </label>
            <input
              type="datetime-local"
              required
              value={form.registrationEndsAt}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, registrationEndsAt: event.target.value }))
              }
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-lg text-xs focus:border-accent outline-hidden"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="px-4 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          <span>Открыть цикл</span>
        </button>
      </form>

      {/* Список циклов */}
      {cycles.length === 0 ? (
        <p className="text-xs text-slate-500">Циклов пока не было.</p>
      ) : (
        <div className="space-y-3">
          {cycles.map((cycle) => {
            const cycleMatches = matches[cycle.id];
            return (
              <div key={cycle.id} className="border border-slate-200 rounded-xl overflow-hidden">
                <div className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {cycle.title || `Цикл от ${formatDate(cycle.meetingDate)}`}
                      </span>
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10px] font-black uppercase shrink-0 ${
                          cycle.status === 'open'
                            ? 'bg-accent-soft text-accent'
                            : cycle.status === 'matched'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        {cycle.status === 'open'
                          ? 'запись открыта'
                          : cycle.status === 'matched'
                            ? 'пары собраны'
                            : 'отменён'}
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 mt-1 flex items-center gap-1.5">
                      <CalendarClock className="w-3 h-3 shrink-0" />
                      Встречи {formatDate(cycle.meetingDate)} · запись до{' '}
                      {formatDateTime(cycle.registrationEndsAt)}
                    </p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {cycle.status === 'open' && (
                      <>
                        <button
                          onClick={() => void handleMatch(cycle.id)}
                          disabled={busy}
                          className="px-3 py-2 bg-accent hover:bg-accent-hover disabled:opacity-50 text-white text-[11px] font-bold rounded-lg transition-colors flex items-center gap-1.5"
                        >
                          <Play className="w-3.5 h-3.5" />
                          <span>Подобрать сейчас</span>
                        </button>
                        <button
                          onClick={() => void handleCancel(cycle.id)}
                          disabled={busy}
                          className="px-3 py-2 bg-rose-50 hover:bg-rose-100 disabled:opacity-50 text-rose-700 text-[11px] font-bold rounded-lg border border-rose-200 transition-colors flex items-center gap-1.5"
                        >
                          <Ban className="w-3.5 h-3.5" />
                          <span>Отменить</span>
                        </button>
                      </>
                    )}

                    {cycle.status === 'matched' && !cycleMatches && (
                      <button
                        onClick={() => void loadMatches(cycle.id)}
                        className="px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 text-[11px] font-bold rounded-lg border border-slate-200 transition-colors flex items-center gap-1.5"
                      >
                        <Users className="w-3.5 h-3.5" />
                        <span>Показать пары</span>
                      </button>
                    )}
                  </div>
                </div>

                {cycleMatches && (
                  <div className="border-t border-slate-200 bg-slate-50 p-4 space-y-2">
                    {cycleMatches.length === 0 ? (
                      <p className="text-[11px] text-slate-500">Пар не сформировано.</p>
                    ) : (
                      cycleMatches.map((match) => (
                        <div
                          key={match.id}
                          className="bg-white border border-slate-200 rounded-lg px-3 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-1"
                        >
                          <span className="text-xs font-semibold text-slate-800">
                            {match.members.map((member) => member.displayName).join(' + ')}
                          </span>
                          <span className="text-[11px] text-slate-500 shrink-0">{match.slot}</span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
