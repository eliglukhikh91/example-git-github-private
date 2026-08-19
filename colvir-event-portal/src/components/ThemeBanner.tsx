import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTheme } from '../utils/themes';

/**
 * Баннер активной праздничной темы.
 *
 * Это единственное вместе с подборкой мероприятий место, на которое влияет
 * тема: остальной интерфейс всегда фирменный синий. Раньше баннер собирался из
 * текста CMS, иконки в кружке и декоративных иконок с анимацией — теперь это
 * готовое изображение, в которое заголовок и подпись уже впечатаны, поэтому
 * ничего поверх не накладывается.
 *
 * Закрытие живет в sessionStorage, а не в localStorage: баннер должен вернуться
 * в новой сессии, а не исчезнуть навсегда после одного клика.
 */
const DISMISS_KEY = 'colvir_theme_banner_dismissed';

export const ThemeBanner: React.FC = () => {
  const { theme } = useApp();
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

  const { banner, label } = getTheme(theme);

  // У классической темы баннера нет вовсе.
  if (!banner || dismissed === theme) return null;

  const handleDismiss = () => {
    setDismissed(theme);
    try {
      sessionStorage.setItem(DISMISS_KEY, theme);
    } catch {
      // приватный режим — баннер просто вернется при перезагрузке
    }
  };

  return (
    <div className="relative border-b border-slate-200 bg-slate-100">
      {/*
        Пропорция задана точно по файлам (1600×685), а не фиксированной высотой:
        заголовок и подпись впечатаны в изображение, и любая обрезка по высоте
        рано или поздно срезала бы текст на неудачной ширине экрана.
      */}
      <img
        src={banner}
        alt={label}
        width={1600}
        height={685}
        className="w-full aspect-[1600/685] object-cover"
      />

      <button
        onClick={handleDismiss}
        className="absolute top-3 right-3 p-1.5 text-slate-500 bg-white/80 hover:bg-white hover:text-slate-800 rounded-lg backdrop-blur-xs transition-colors"
        aria-label={`Скрыть баннер темы «${label}»`}
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
};
