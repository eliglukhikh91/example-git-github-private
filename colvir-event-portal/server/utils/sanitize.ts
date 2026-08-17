import createDOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

const window = new JSDOM('').window;
const purify = createDOMPurify(window as unknown as Window & typeof globalThis);

/**
 * Описание мероприятия — это HTML из визуального редактора, и на клиенте оно
 * выводится через dangerouslySetInnerHTML. Санитайзим при записи, чтобы в базу
 * не попал хранимый XSS; на рендере клиент чистит содержимое повторно.
 */
const ALLOWED_TAGS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'span', 'div', 'hr'
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'class', 'style'];

export function sanitizeRichText(html: string): string {
  return purify.sanitize(html ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['srcset', 'formaction', 'xlink:href']
  });
}

/** Обычный текст: полностью снимаем разметку. */
export function sanitizePlainText(text: string): string {
  return purify.sanitize(text ?? '', { ALLOWED_TAGS: [], ALLOWED_ATTR: [] });
}

/** Ссылка на встречу: пропускаем только http(s). */
export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  try {
    const parsed = new URL(trimmed);
    return ['http:', 'https:'].includes(parsed.protocol) ? parsed.toString() : null;
  } catch {
    return null;
  }
}

/**
 * Изображения приходят либо ссылкой, либо data:image (загрузка через редактор).
 * Другие схемы (javascript:, data:text/html) отсекаем.
 */
export function sanitizeImageSource(url: string | null | undefined): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  if (!trimmed) return null;
  if (/^data:image\/(png|jpe?g|gif|webp|avif);base64,[a-z0-9+/=\s]+$/i.test(trimmed)) {
    return trimmed;
  }
  return sanitizeUrl(trimmed);
}
