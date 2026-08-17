import React from 'react';
import { Check } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { THEMES } from '../utils/themes';

/**
 * Переключатель оформления: ряд кружков по цвету темы.
 *
 * Клик применяет тему сразу — промежуточного модального окна больше нет.
 */
export const ThemeSwatches: React.FC = () => {
  const { theme, setTheme } = useApp();

  return (
    <div className="space-y-2">
      <p className="text-[10px] font-extrabold uppercase tracking-wider text-slate-400">
        Оформление
      </p>
      <div className="flex items-center gap-2">
        {THEMES.map((item) => {
          const isActive = theme === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setTheme(item.id)}
              title={item.label}
              aria-label={item.label}
              aria-pressed={isActive}
              className={`w-7 h-7 rounded-full flex items-center justify-center transition-all ${
                isActive
                  ? 'ring-2 ring-offset-2 ring-slate-400'
                  : 'hover:scale-110 ring-1 ring-black/10'
              }`}
              style={{ backgroundColor: item.swatch }}
            >
              {isActive && <Check className="w-3.5 h-3.5 text-white" />}
            </button>
          );
        })}
      </div>
    </div>
  );
};
