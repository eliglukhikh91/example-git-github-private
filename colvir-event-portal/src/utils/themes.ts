import { Flower2, Gift, Snowflake, Circle, type LucideIcon } from 'lucide-react';
import type { CMSContent, ThemeType } from '../types';

export interface ThemeDescriptor {
  id: ThemeType;
  label: string;
  /**
   * Декоративная иконка темы.
   *
   * В брифе указаны имена из Tabler (`ti-flower`, `ti-gift`, `ti-snowflake`) —
   * здесь взяты эквиваленты из lucide-react, которая уже подключена в проекте;
   * вторую иконочную библиотеку ради трех глифов тянуть не стали.
   */
  icon: LucideIcon;
  /** Утвержденный цвет темы: используется для свотчей и декоративных иконок. */
  decor: string;
  /** CSS-класс анимации декоративной иконки (см. index.css). */
  animation: string;
  /** Тег мероприятия, по которому собирается тематическая подборка в дайджесте. */
  tag: string;
}

export const THEMES: ThemeDescriptor[] = [
  {
    id: 'classic',
    label: 'Обычная',
    icon: Circle,
    decor: '#1560AA',
    animation: '',
    tag: ''
  },
  {
    id: 'spring',
    label: 'Весна',
    icon: Flower2,
    decor: '#7C9885',
    animation: 'theme-decor-sway',
    tag: 'весна'
  },
  {
    id: 'birthday',
    label: 'День рождения компании',
    icon: Gift,
    decor: '#C97B5C',
    animation: 'theme-decor-shimmer',
    tag: 'день рождения'
  },
  {
    id: 'newyear',
    label: 'Новый год',
    icon: Snowflake,
    decor: '#2F6B73',
    animation: 'theme-decor-spin',
    tag: 'новый год'
  }
];

export function getTheme(theme: ThemeType): ThemeDescriptor {
  return THEMES.find((item) => item.id === theme) ?? THEMES[0];
}

/** Текст баннера берется из CMS, редактируемой администратором. */
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
