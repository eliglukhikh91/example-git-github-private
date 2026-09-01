import type { ThemeType } from '../types';
import { CATEGORY_OPTIONS } from './eventCategories';

/**
 * Отбор мероприятий в праздничную подборку под баннером.
 *
 * Попасть в подборку можно двумя способами:
 *  1. выбрать тему в форме мероприятия (поле themeTag) — явный способ;
 *  2. поставить мероприятию хэштег из списка ниже — быстрый способ, когда
 *     мероприятия заводят пачкой и лезть в выпадающий список неудобно.
 *
 * Оба способа равноправны: достаточно любого.
 *
 * Хэштег сравнивается ЦЕЛИКОМ, а не по вхождению подстроки. Первая версия
 * подборки искала «новый год» внутри тегов, и мероприятие с тегом
 * «новый формат» попадало в новогоднюю подборку.
 */
export const THEME_HASHTAGS: Record<Exclude<ThemeType, 'classic'>, string[]> = {
  newyear: ['новыйгод', 'colvirnewyear', 'newyear'],
  spring: ['colvirspring', 'весна', 'spring'],
  birthday: ['деньрождения', 'colvirbirthday', 'birthday']
};

/**
 * Приводит хэштег к виду, в котором его можно сравнивать: нижний регистр, без
 * решетки, пробелов, дефисов и подчеркиваний. Поэтому «#Новый Год»,
 * «новый-год» и «новыйгод» — это один и тот же хэштег, и администратору не
 * нужно помнить, как именно он писал его в прошлый раз.
 *
 * «ё» приводится к «е»: в интерфейсе везде «е», и тег «День Рождения» не
 * должен разъезжаться с «День Рождённия» из-за одной буквы.
 */
export function normalizeHashtag(tag: string): string {
  return tag
    .trim()
    .toLowerCase()
    .replace(/ё/g, 'е')
    .replace(/^#+/, '')
    .replace(/[\s\-_]+/g, '');
}

/** Мероприятие в том объеме, который нужен для отбора в подборку. */
interface TaggedEvent {
  themeTag?: ThemeType | null;
  tags?: string[];
}

/** Попадает ли мероприятие в подборку темы. */
export function matchesTheme(event: TaggedEvent, theme: ThemeType): boolean {
  if (theme === 'classic') return false;

  if (event.themeTag === theme) return true;

  const wanted = THEME_HASHTAGS[theme];
  return (event.tags ?? []).some((tag) => wanted.includes(normalizeHashtag(tag)));
}

/** Хэштег, который показываем администратору как основной для темы. */
export function primaryHashtag(theme: ThemeType): string | null {
  if (theme === 'classic') return null;
  return `#${THEME_HASHTAGS[theme][0]}`;
}

/**
 * Перечисление основных хэштегов для подсказки в форме мероприятия —
 * «#новыйгод, #colvirspring и #деньрождения». Собирается из того же списка,
 * по которому идет отбор, чтобы подсказка не разошлась с поведением.
 */
export const THEME_HASHTAG_HINT = (() => {
  const primary = Object.values(THEME_HASHTAGS).map((list) => `#${list[0]}`);
  return `${primary.slice(0, -1).join(', ')} и ${primary[primary.length - 1]}`;
})();

/** Сколько хэштегов разрешаем одному мероприятию. */
const MAX_HASHTAGS = 10;

/**
 * Делит одну часть строки на хэштеги.
 *
 * Пробел не может одновременно быть разделителем и частью хэштега, поэтому
 * правило зависит от решеток. Есть решетки — новый хэштег начинается с них, и
 * «#День Рождения» остается одним хэштегом из двух слов. Решеток нет —
 * разделителем работает пробел, и «новыйгод квиз» дает два хэштега.
 *
 * Без этого «#Новый Год» превращалось в два бессмысленных тега «Новый» и
 * «Год», и мероприятие не попадало ни в какую подборку.
 */
function splitChunk(chunk: string): string[] {
  const trimmed = chunk.trim();
  if (!trimmed) return [];
  if (!trimmed.includes('#')) return trimmed.split(/\s+/);
  return trimmed.split(/(?=#)/);
}

/**
 * Разбирает строку из поля ввода в список хэштегов. Запятая, точка с запятой и
 * перевод строки разделяют хэштеги всегда, пробел — по правилу выше.
 *
 * Повторы убираем по нормализованному виду, иначе «#Квиз» и «#квиз» осели бы
 * в базе как два разных тега.
 */
export function parseHashtags(raw: string): string[] {
  const seen = new Set<string>();
  const result: string[] = [];

  for (const chunk of raw.split(/[,;\n]+/).flatMap(splitChunk)) {
    const tag = chunk
      .replace(/^#+/, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, 60);
    if (!tag) continue;

    const key = normalizeHashtag(tag);
    if (!key || seen.has(key)) continue;

    seen.add(key);
    result.push(tag);
    if (result.length >= MAX_HASHTAGS) break;
  }

  return result;
}

/**
 * Теги, которые форма мероприятия проставляет сама: категория и признак
 * командной игры. Перечислены все категории, а не только текущая: категорию
 * мероприятия могли поменять после создания, и в базе остался прежний тег.
 */
export const SERVICE_TAGS: string[] = [
  ...CATEGORY_OPTIONS.map((option) => option.value),
  'Команды',
  'Индивидуально'
];

/**
 * Собирает строку для поля ввода из тегов мероприятия.
 *
 * Служебные теги в поле не показываются: администратор их не писал и
 * редактировать ему там нечего.
 */
export function formatHashtags(tags: string[], serviceTags: string[] = SERVICE_TAGS): string {
  const service = new Set(serviceTags.map(normalizeHashtag));
  return tags
    .filter((tag) => !service.has(normalizeHashtag(tag)))
    .map((tag) => `#${tag}`)
    .join(' ');
}
