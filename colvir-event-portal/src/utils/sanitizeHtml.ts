import DOMPurify from 'dompurify';

/**
 * Описание мероприятия выводится через dangerouslySetInnerHTML, поэтому перед
 * вставкой в DOM его нужно чистить. Сервер санитайзит содержимое при записи;
 * здесь то же самое делается при выводе — чтобы записи, попавшие в базу другим
 * путём (миграция, ручной SQL), не могли выполнить скрипт в браузере.
 */
const ALLOWED_TAGS = [
  'p', 'br', 'b', 'strong', 'i', 'em', 'u', 's', 'strike',
  'ul', 'ol', 'li', 'blockquote', 'code', 'pre',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'a', 'span', 'div', 'hr'
];

const ALLOWED_ATTR = ['href', 'title', 'target', 'rel', 'class', 'style'];

// Внешние ссылки открываются в новой вкладке без доступа к window.opener.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.tagName === 'A' && node.hasAttribute('href')) {
    node.setAttribute('rel', 'noopener noreferrer');
    if (node.getAttribute('target') === '_blank') {
      node.setAttribute('target', '_blank');
    }
  }
});

export function sanitizeHtml(html: string | undefined | null): string {
  return DOMPurify.sanitize(html ?? '', {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ALLOWED_URI_REGEXP: /^(?:https?:|mailto:|tel:|#|\/)/i,
    FORBID_TAGS: ['script', 'style', 'iframe', 'object', 'embed', 'form', 'input'],
    FORBID_ATTR: ['srcset', 'formaction', 'xlink:href']
  });
}

/** Готовый объект для dangerouslySetInnerHTML с уже очищенным содержимым. */
export function safeHtml(html: string | undefined | null): { __html: string } {
  return { __html: sanitizeHtml(html) };
}
