import React, { useState } from 'react';
import { Check, Loader2, Ban } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { THEMES } from '../utils/themes';
import type { ThemeType } from '../types';

/**
 * Выбор оформления портала.
 *
 * Живет только в панели администратора: тема общая для компании, сотрудники ее
 * не выбирают и переключателя не видят. Клик применяет тему сразу — сервер
 * сохраняет выбор, остальные вкладки подхватывают его опросом.
 *
 * Показываем сами баннеры, а не цветные кружки: акцентный цвет интерфейса от
 * темы больше не зависит, и выбирать по цвету стало нечего — выбор идет между
 * тремя картинками, поэтому их и надо видеть.
 */
export const ThemeSwatches: React.FC = () => {
  const { theme, setTheme, isAdmin } = useApp();
  const [pending, setPending] = useState<ThemeType | null>(null);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  if (!isAdmin) return null;

  const handlePick = async (next: ThemeType) => {
    if (next === theme || pending) return;
    setPending(next);
    setFeedback(null);
    const result = await setTheme(next);
    setFeedback({ ok: result.success, message: result.message });
    setPending(null);
    setTimeout(() => setFeedback(null), 4000);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-black text-slate-900">Оформление портала</h3>
        <p className="text-xs text-slate-500 mt-0.5">
          Баннер и подборка мероприятий применяются у всех сотрудников. Открытые вкладки
          подхватят изменение в течение минуты.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {THEMES.map((item) => {
          const isActive = theme === item.id;
          return (
            <button
              key={item.id}
              onClick={() => void handlePick(item.id)}
              disabled={pending !== null}
              aria-pressed={isActive}
              className={`relative overflow-hidden rounded-xl border text-left transition-colors disabled:opacity-60 ${
                isActive
                  ? 'border-accent ring-2 ring-accent/25'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {item.banner ? (
                <img
                  src={item.banner}
                  alt=""
                  loading="lazy"
                  className="w-full h-24 object-cover object-left"
                />
              ) : (
                <div className="w-full h-24 bg-slate-100 flex items-center justify-center">
                  <Ban className="w-5 h-5 text-slate-400" />
                </div>
              )}

              <div className="flex items-center gap-2 px-3 py-2.5 bg-white">
                <span className="min-w-0 flex-1">
                  <span className="block text-xs font-bold text-slate-900 truncate">
                    {item.label}
                  </span>
                  <span className="block text-[10px] text-slate-400">
                    {item.banner ? 'Баннер и подборка' : 'Без баннера'}
                  </span>
                </span>

                {pending === item.id ? (
                  <Loader2 className="w-4 h-4 text-accent animate-spin shrink-0" />
                ) : (
                  isActive && <Check className="w-4 h-4 text-accent shrink-0" />
                )}
              </div>
            </button>
          );
        })}
      </div>

      {feedback && (
        <div
          className={`p-3 rounded-xl text-[11px] font-semibold ${
            feedback.ok
              ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
              : 'bg-rose-50 text-rose-900 border border-rose-200'
          }`}
        >
          {feedback.message}
        </div>
      )}
    </div>
  );
};
