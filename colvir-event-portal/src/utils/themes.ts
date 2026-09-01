import type { CMSContent, ThemeType } from '../types';
import bannerSpring from '../assets/themes/colvir-mountain-spring.jpg';
import bannerBirthday from '../assets/themes/colvir-mountain-birthday.jpg';
import bannerNewYear from '../assets/themes/colvir-mountain-newyear.jpg';

/**
 * Праздничные темы.
 *
 * Тема влияет ровно на два места: баннер вверху дайджеста и подборку
 * мероприятий под ним. Акцентный цвет интерфейса от темы не зависит — он всегда
 * фирменный синий, поэтому здесь больше нет ни цветов, ни декоративных иконок,
 * ни классов анимации.
 *
 * В самих изображениях текста нет: заголовок и подпись выводятся HTML-слоем
 * поверх картинки, а берутся из CMS по ключам titleKey/subtitleKey. Ключи лежат
 * здесь, рядом с картинкой, чтобы админская форма и сам баннер брали их из
 * одного места и не разъезжались.
 */
export interface ThemeDescriptor {
  id: ThemeType;
  label: string;
  /** Готовое изображение баннера. У классической темы баннера нет. */
  banner: string | null;
  /** Значение themeTag у мероприятия, попадающего в подборку этой темы. */
  tag: ThemeType | null;
  /** Ключи CMS с текстом поверх баннера. У классической темы баннера нет. */
  titleKey: keyof CMSContent | null;
  subtitleKey: keyof CMSContent | null;
  /**
   * Цвет неба у правого края картинки. Баннер ограничен по высоте, картинка в
   * него по ширине не растягивается, и оставшаяся справа часть заливается этим
   * цветом — стык получается незаметным. Цвет у каждой темы свой: у новогодней
   * небо заметно темнее (#96B7E4), у остальных светлее, и одна общая заливка
   * дала бы видимую границу.
   */
  sky: string | null;
}

export const THEMES: ThemeDescriptor[] = [
  {
    id: 'classic',
    label: 'Обычная',
    banner: null,
    tag: null,
    titleKey: null,
    subtitleKey: null,
    sky: null
  },
  {
    id: 'newyear',
    label: 'Новый год',
    banner: bannerNewYear,
    tag: 'newyear',
    titleKey: 'themeBannerNewYearTitle',
    subtitleKey: 'themeBannerNewYearSubtitle',
    sky: '#96B7E4'
  },
  {
    id: 'spring',
    label: 'Весна',
    banner: bannerSpring,
    tag: 'spring',
    titleKey: 'themeBannerSpringTitle',
    subtitleKey: 'themeBannerSpringSubtitle',
    sky: '#C5D6F2'
  },
  {
    id: 'birthday',
    label: 'День рождения компании',
    banner: bannerBirthday,
    tag: 'birthday',
    titleKey: 'themeBannerBirthdayTitle',
    subtitleKey: 'themeBannerBirthdaySubtitle',
    sky: '#D2E2F9'
  }
];

/** Тема с баннером: у нее заполнены и картинка, и ключи текстов, и цвет неба. */
export type BannerTheme = ThemeDescriptor & {
  banner: string;
  titleKey: keyof CMSContent;
  subtitleKey: keyof CMSContent;
  sky: string;
};

/** Темы с баннером — то есть все, кроме классической. */
export const BANNER_THEMES = THEMES.filter(
  (theme): theme is BannerTheme => theme.banner !== null
);

export function getTheme(theme: ThemeType): ThemeDescriptor {
  return THEMES.find((item) => item.id === theme) ?? THEMES[0];
}
