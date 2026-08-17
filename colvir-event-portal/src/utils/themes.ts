import { Flower2, Gift, Snowflake, Circle, type LucideIcon } from 'lucide-react';
import type { CMSContent, ThemeType } from '../types';

export interface ThemeDescriptor {
  id: ThemeType;
  label: string;
  icon: LucideIcon;
  /** Цвет свотча в переключателе; совпадает с --theme-accent в index.css. */
  swatch: string;
  /** Тег мероприятия, по которому собирается тематическая подборка в дайджесте. */
  tag: string;
}

export const THEMES: ThemeDescriptor[] = [
  { id: 'classic', label: 'Классическая', icon: Circle, swatch: '#1560AA', tag: '' },
  { id: 'spring', label: 'Весна', icon: Flower2, swatch: '#2f9e6b', tag: 'весна' },
  { id: 'birthday', label: 'День рождения', icon: Gift, swatch: '#b4553d', tag: 'день рождения' },
  { id: 'newyear', label: 'Новый год', icon: Snowflake, swatch: '#2a6fb0', tag: 'новый год' }
];

export function getTheme(theme: ThemeType): ThemeDescriptor {
  return THEMES.find((item) => item.id === theme) ?? THEMES[0];
}

/** Текст полосы-баннера берётся из CMS, редактируемой администратором. */
export function getThemeBannerText(theme: ThemeType, cms: CMSContent): string {
  switch (theme) {
    case 'spring':
      return cms.holidayBannerSpringText;
    case 'birthday':
      return cms.holidayBannerBirthdayText;
    case 'newyear':
      return cms.holidayBannerNewYearText;
    default:
      return '';
  }
}
