import { Flower2, Gift, Snowflake, Circle, type LucideIcon } from 'lucide-react';
import type { CMSContent, ThemeType } from '../types';

export interface ThemeDescriptor {
  id: ThemeType;
  label: string;
  icon: LucideIcon;
  /** Цвет свотча в переключателе; совпадает с --color-accent темы в index.css. */
  swatch: string;
  /** Тег мероприятия, по которому собирается тематическая подборка в дайджесте. */
  tag: string;
}

export const THEMES: ThemeDescriptor[] = [
  { id: 'classic', label: 'Классическая', icon: Circle, swatch: '#1560AA', tag: '' },
  { id: 'spring', label: 'Весна', icon: Flower2, swatch: '#1B6F49', tag: 'весна' },
  { id: 'birthday', label: 'День рождения', icon: Gift, swatch: '#AE3260', tag: 'день рождения' },
  { id: 'newyear', label: 'Новый год', icon: Snowflake, swatch: '#17618A', tag: 'новый год' }
];

export function getTheme(theme: ThemeType): ThemeDescriptor {
  return THEMES.find((item) => item.id === theme) ?? THEMES[0];
}

/** Текст баннера берётся из CMS, редактируемой администратором. */
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

/**
 * Разбивает строку CMS на заголовок и подзаголовок баннера.
 *
 * Тексты в CMS уже написаны в формате «Название: пояснение»
 * («Новый Год в Colvir: Зимняя сказка, белые снежинки и праздник!»), поэтому
 * делим по первому двоеточию — новых полей в CMS для этого заводить не нужно.
 * Если двоеточия нет, заголовком становится название темы.
 */
export function splitBannerText(
  text: string,
  themeLabel: string
): { title: string; subtitle: string } {
  const separator = text.indexOf(':');
  if (separator === -1) {
    return { title: themeLabel, subtitle: text.trim() };
  }

  const title = text.slice(0, separator).trim();
  const subtitle = text.slice(separator + 1).trim();
  if (!title || !subtitle) {
    return { title: themeLabel, subtitle: text.trim() };
  }

  return { title, subtitle };
}
