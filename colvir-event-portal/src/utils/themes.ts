import type { ThemeType } from '../types';
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
 * Заголовок и подпись впечатаны в само изображение, отдельных текстов в CMS для
 * баннера не требуется.
 */
export interface ThemeDescriptor {
  id: ThemeType;
  label: string;
  /** Готовое изображение баннера. У классической темы баннера нет. */
  banner: string | null;
  /** Значение themeTag у мероприятия, попадающего в подборку этой темы. */
  tag: ThemeType | null;
}

export const THEMES: ThemeDescriptor[] = [
  { id: 'classic', label: 'Обычная', banner: null, tag: null },
  { id: 'newyear', label: 'Новый год', banner: bannerNewYear, tag: 'newyear' },
  { id: 'spring', label: 'Весна', banner: bannerSpring, tag: 'spring' },
  { id: 'birthday', label: 'День рождения компании', banner: bannerBirthday, tag: 'birthday' }
];

export function getTheme(theme: ThemeType): ThemeDescriptor {
  return THEMES.find((item) => item.id === theme) ?? THEMES[0];
}
