import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTheme, getThemeBannerText, splitBannerText } from '../utils/themes';

/**
 * Баннер активной праздничной темы.
 *
 * Тему выбирает администратор, сотрудник её только видит — этот баннер и есть
 * основной способ узнать, что оформление сменилось.
 *
 * Закрытие живёт в sessionStorage, а не в localStorage: баннер должен вернуться
 * в новой сессии, а не исчезнуть навсегда после одного клика.
 */
const DISMISS_KEY = 'colvir_theme_banner_dismissed';

export const ThemeBanner: React.FC = () => {
  const { theme, cmsContent } = useApp();
  const [dismissed, setDismissed] = useState<string | null>(() => {
    try {
      return sessionStorage.getItem(DISMISS_KEY);
    } catch {
      return null;
    }
  });

  // Смена темы возвращает баннер: закрытие относится к конкретной теме.
  useEffect(() => {
    try {
      if (sessionStorage.getItem(DISMISS_KEY) !== theme) setDismissed(null);
    } catch {
      setDismissed(null);
    }
  }, [theme]);

  if (theme === 'classic' || dismissed === theme) return null;

  const text = getThemeBannerText(theme, cmsContent);
  if (!text) return null;

  const { icon: Icon, label, animation } = getTheme(theme);
  const { title, subtitle } = splitBannerText(text, label);

  const handleDismiss = () => {
    setDismissed(theme);
    try {
      sessionStorage.setItem(DISMISS_KEY, theme);
    } catch {
      // приватный режим — баннер просто вернётся при перезагрузке
    }
  };

  return (
    <div className="relative overflow-hidden bg-accent-soft border-b border-accent/15">
      {/* Декоративные иконки темы: живут в правой части, за текстовым блоком,
          поэтому читаемость не страдает. Цвет — утверждённый цвет темы. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-y-0 right-0 w-1/2 hidden sm:block"
        style={{ color: 'var(--color-accent-decor)' }}
      >
        <Icon className={`absolute top-2 right-8 w-16 h-16 opacity-25 ${animation}`} />
        <Icon className={`absolute bottom-1 right-32 w-10 h-10 opacity-30 ${animation}`} />
        <Icon
          className={`absolute top-6 right-52 w-8 h-8 opacity-25 hidden lg:block ${animation}`}
        />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex items-center gap-3.5">
        <div className="w-[38px] h-[38px] rounded-full bg-white flex items-center justify-center shrink-0 shadow-xs">
          <Icon className="w-5 h-5 text-accent" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-[15px] font-bold text-accent leading-snug">{title}</h2>
          {subtitle && (
            <p className="text-[11px] text-slate-600 leading-snug mt-0.5">{subtitle}</p>
          )}
        </div>

        <button
          onClick={handleDismiss}
          className="shrink-0 p-1.5 -mr-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white/70 transition-colors"
          aria-label={`Скрыть сообщение темы «${label}»`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
