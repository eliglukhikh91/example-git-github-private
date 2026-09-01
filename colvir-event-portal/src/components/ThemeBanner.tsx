import React, { useEffect, useState } from 'react';
import { X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTheme } from '../utils/themes';

/**
 * Баннер активной праздничной темы.
 *
 * Это единственное вместе с подборкой мероприятий место, на которое влияет
 * тема: остальной интерфейс всегда фирменный синий.
 *
 * Заголовок и подпись выводятся HTML-слоем поверх картинки, а не впечатаны в
 * файл: текст правит администратор на вкладке «Редактор текстов», а
 * перерисовать пиксели растрового файла из формы невозможно.
 *
 * Закрытие живет в sessionStorage, а не в localStorage: баннер должен вернуться
 * в новой сессии, а не исчезнуть навсегда после одного клика.
 */
const DISMISS_KEY = 'colvir_theme_banner_dismissed';

/** Высота баннера на экранах от sm и ширина, которую занимает на ней гора. */
const BANNER_HEIGHT_PX = 240;
/**
 * Гора вписана в левую треть кадра с пропорцией ~2.9:1, поэтому ее ширина
 * примерно равна высоте баннера. Плюс отступ, чтобы текст не касался вершины.
 */
const TEXT_OFFSET_PX = BANNER_HEIGHT_PX + 24;

const BannerText: React.FC<{ title: string; subtitle: string }> = ({ title, subtitle }) => (
  <>
    <h2 className="font-heading text-lg sm:text-2xl font-black tracking-tight" style={{ color: '#1E3A5F' }}>
      {title}
    </h2>
    {subtitle && (
      <p className="font-body mt-1 text-xs sm:text-sm font-medium" style={{ color: '#4E6B85' }}>
        {subtitle}
      </p>
    )}
  </>
);

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

  const { banner, label, sky, titleKey, subtitleKey } = getTheme(theme);

  // У классической темы баннера нет вовсе.
  if (!banner || dismissed === theme) return null;

  // Пока тексты не подгрузились из CMS, показываем название темы, а не пустоту.
  const title = (titleKey && cmsContent?.[titleKey]) || label;
  const subtitle = (subtitleKey && cmsContent?.[subtitleKey]) || '';

  const handleDismiss = () => {
    setDismissed(theme);
    try {
      sessionStorage.setItem(DISMISS_KEY, theme);
    } catch {
      // приватный режим — баннер просто вернется при перезагрузке
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-xs">
        {/*
          На узком экране текст поверх картинки не помещается: гора занимает
          почти всю ширину. Поэтому на телефоне баннер складывается — полоса с
          картинкой сверху, текст под ней.
        */}
        <div className="sm:hidden">
          <img
            src={banner}
            alt=""
            aria-hidden="true"
            className="h-28 w-full object-cover object-left select-none"
            style={{ backgroundColor: sky ?? undefined }}
          />
          <div className="px-4 py-3 text-center">
            <BannerText title={title} subtitle={subtitle} />
          </div>
        </div>

        {/*
          От sm и шире — текст слоем поверх картинки, в свободной зоне неба
          справа от горы.

          Картинка прижата к левому краю и масштабируется по высоте, а не
          растягивается на всю ширину: при соотношении сторон ~2.9:1 и высоте
          баннера 240px растянутая по ширине картинка обрезалась бы по вертикали
          почти на треть и срезала вершину горы. Оставшаяся справа часть
          заливается цветом неба этой же темы, поэтому стыка не видно.
        */}
        <div
          className="relative hidden sm:flex items-center justify-center pr-8"
          style={{
            height: `${BANNER_HEIGHT_PX}px`,
            paddingLeft: `${TEXT_OFFSET_PX}px`,
            backgroundColor: sky ?? undefined
          }}
        >
          <img
            src={banner}
            alt=""
            aria-hidden="true"
            className="absolute inset-y-0 left-0 h-full w-auto max-w-none select-none"
          />

          {/*
            Растушевка правого края картинки в заливку. Небо на картинке слегка
            градиентное, и на широком экране на границе с ровной заливкой был
            заметен вертикальный стык. Полоса начинается за горой (480px при
            высоте 240px гора занимает первые ~240px), поэтому саму гору не
            задевает. На экране уже картинки стык не возникает вовсе — там она
            обрезается по ширине, и градиент ничего не портит.
          */}
          <div
            aria-hidden="true"
            className="absolute inset-0 pointer-events-none"
            style={{ background: `linear-gradient(to right, ${sky}00 480px, ${sky} 700px)` }}
          />

          {/*
            Белая подложка под текстом — как в утвержденных референсах. Она же
            страхует читаемость: небо у трех тем разной светлоты, и темно-синий
            текст прямо по картинке на новогоднем баннере читался бы хуже.
          */}
          <div className="relative max-w-md rounded-2xl bg-white/95 px-8 py-5 text-center shadow-sm">
            <BannerText title={title} subtitle={subtitle} />
          </div>
        </div>

        <button
          onClick={handleDismiss}
          className="absolute top-3 right-3 p-1.5 text-slate-500 bg-white/80 hover:bg-white hover:text-slate-800 rounded-lg transition-colors"
          aria-label={`Скрыть баннер темы «${label}»`}
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
