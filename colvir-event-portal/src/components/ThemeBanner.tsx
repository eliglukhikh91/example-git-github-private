import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTheme, getThemeBannerText, splitBannerText } from '../utils/themes';

/**
 * Баннер активной праздничной темы.
 *
 * Первая версия была тонкой полосой в одну строку — праздник не считывался.
 * Теперь это блок с плотной заливкой цветом темы: иконка в кружке, заголовок и
 * подзаголовок белым. Заливка сплошная, без градиента и блюра; по углам —
 * несколько тематических иконок с низкой непрозрачностью как едва заметный
 * узор (это не glassmorphism-блобы, а просто фон).
 *
 * Цвет берётся из --color-accent, который переопределяется под тему в index.css,
 * поэтому баннер всегда совпадает по цвету с кнопками и бейджами страницы.
 */
export const ThemeBanner: React.FC = () => {
  const { theme, cmsContent } = useApp();
  const [dismissedTheme, setDismissedTheme] = useState<string | null>(null);

  // Смена темы возвращает баннер: закрытие относится к конкретной теме,
  // а не выключает баннер навсегда.
  useEffect(() => {
    setDismissedTheme(null);
  }, [theme]);

  if (theme === 'classic' || dismissedTheme === theme) return null;

  const text = getThemeBannerText(theme, cmsContent);
  if (!text) return null;

  const { icon: Icon, label } = getTheme(theme);
  const { title, subtitle } = splitBannerText(text, label);

  return (
    <div className="relative overflow-hidden bg-accent">
      {/* Декоративный узор: те же иконки темы, едва заметные. */}
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute -top-6 right-10 w-28 h-28 text-white/10"
      />
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-8 right-44 w-24 h-24 text-white/[0.07]"
      />
      <Icon
        aria-hidden="true"
        className="pointer-events-none absolute top-4 right-[19rem] w-14 h-14 text-white/[0.06] hidden lg:block"
      />

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-6 flex items-center gap-4">
        <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-white/15 flex items-center justify-center shrink-0">
          <Icon className="w-6 h-6 text-white" />
        </div>

        <div className="min-w-0 flex-1">
          <h2 className="text-lg sm:text-xl font-black text-white tracking-tight leading-snug">
            {title}
          </h2>
          {subtitle && (
            <p className="text-xs sm:text-sm text-white/85 font-medium mt-0.5 leading-snug">
              {subtitle}
            </p>
          )}
        </div>

        <button
          onClick={() => setDismissedTheme(theme)}
          className="shrink-0 p-2 -mr-1 text-white/70 hover:text-white rounded-xl hover:bg-white/10 transition-colors"
          aria-label={`Скрыть сообщение темы «${label}»`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
