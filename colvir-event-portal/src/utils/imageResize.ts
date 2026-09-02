/**
 * Уменьшение обложки мероприятия перед отправкой на сервер.
 *
 * Форма разрешает выбрать файл до 20 МБ, и раньше он уходил на сервер как
 * есть — строкой data:base64, которая на треть длиннее самого файла. Обычное
 * фото с телефона на 6 МБ превращалось в 8 МБ запроса, сервер такой запрос не
 * принимал, и мероприятие просто не создавалось.
 *
 * На карточке обложка занимает от силы 800 точек по ширине, поэтому картинку
 * незачем хранить в исходном разрешении: приводим к 1600×900 и пережимаем в
 * JPEG. Файл на 6 МБ после этого весит примерно 300 КБ, а на экране выглядит
 * так же.
 */
const MAX_WIDTH = 1600;
const MAX_HEIGHT = 900;
const JPEG_QUALITY = 0.85;

/**
 * Размер, после которого картинку уже не трогаем: она и так легкая, а лишнее
 * перекодирование только испортит качество.
 */
const SKIP_BELOW_BYTES = 400 * 1024;

/** Примерный вес строки data:base64 в байтах. */
export function dataUrlBytes(dataUrl: string): number {
  const comma = dataUrl.indexOf(',');
  if (comma < 0) return dataUrl.length;
  return Math.floor(((dataUrl.length - comma - 1) * 3) / 4);
}

/**
 * Возвращает уменьшенную копию картинки. Если это не data:URL (ссылка на
 * внешнюю картинку или готовая обложка), картинка и так легкая или браузер не
 * смог ее прочитать — возвращает исходное значение без изменений: обложка
 * важнее, чем экономия, и терять ее из-за сбоя сжатия нельзя.
 */
export function shrinkImageDataUrl(source: string): Promise<string> {
  if (!source.startsWith('data:image/')) return Promise.resolve(source);
  if (dataUrlBytes(source) <= SKIP_BELOW_BYTES) return Promise.resolve(source);

  return new Promise((resolve) => {
    const image = new Image();

    image.onload = () => {
      const scale = Math.min(MAX_WIDTH / image.width, MAX_HEIGHT / image.height, 1);
      const canvas = document.createElement('canvas');
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));

      const context = canvas.getContext('2d');
      if (!context) {
        resolve(source);
        return;
      }

      try {
        context.drawImage(image, 0, 0, canvas.width, canvas.height);
        const compressed = canvas.toDataURL('image/jpeg', JPEG_QUALITY);
        // Прозрачный PNG после перевода в JPEG иногда оказывается тяжелее
        // оригинала — в этом случае оставляем исходный файл.
        resolve(dataUrlBytes(compressed) < dataUrlBytes(source) ? compressed : source);
      } catch {
        resolve(source);
      }
    };

    image.onerror = () => resolve(source);
    image.src = source;
  });
}
