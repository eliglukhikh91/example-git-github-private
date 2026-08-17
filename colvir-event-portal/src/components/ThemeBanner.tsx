import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTheme, getThemeBannerText } from '../utils/themes';

/**
 * Тонкая полоса с названием активной темы.
 *
 * Заменяет прежний баннер с градиентом, blur-подложкой и тяжёлой тенью:
 * иконка, текст, крестик — и ничего больше. Цвет берётся из --bg-accent-muted,
 * который меняется вместе с data-theme на <html>.
 */
export const ThemeBanner: React.FC = () => {
  const { theme, cmsContent } = useApp();
  const [dismissedTheme, setDismissedTheme] = useState<string | null>(null);

  // Смена темы возвращает полосу: закрытие относится к конкретной теме,
  // а не выключает баннер навсегда.
  useEffect(() => {
    setDismissedTheme(null);
  }, [theme]);

  if (theme === 'classic' || dismissedTheme === theme) return null;

  const text = getThemeBannerText(theme, cmsContent);
  if (!text) return null;

  const { icon: Icon, label } = getTheme(theme);

  return (
    <div
      className="border-b border-slate-200/80"
      style={{ background: 'var(--bg-accent-muted)' }}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center gap-3">
        <Icon className="w-4 h-4 shrink-0" style={{ color: 'var(--theme-accent)' }} />
        <p className="flex-1 min-w-0 text-xs font-semibold text-slate-700 truncate">{text}</p>
        <button
          onClick={() => setDismissedTheme(theme)}
          className="p-1 -mr-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-white/60 transition-colors shrink-0"
          aria-label={`Скрыть сообщение темы «${label}»`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
