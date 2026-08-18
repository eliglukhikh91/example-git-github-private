import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { query } from '../db/pool.js';
import { getConfig } from '../config/env.js';

/**
 * Вложения чата.
 *
 * Файлы лежат на диске, в базе — только метаданные. Двадцатимегабайтные
 * картинки в bytea попадали бы в WAL и в каждый дамп, а выборка сообщений
 * начинала бы тянуть блобы вместе с текстом.
 *
 * Главное здесь — не доверять клиенту. Заявленный Content-Type и расширение
 * подделываются тривиально, поэтому тип определяется по сигнатуре файла, а имя
 * на диске генерируется нами: исходное имя хранится отдельно и только для
 * показа. SVG не поддерживается намеренно — он умеет исполнять скрипты, и
 * встроенный в него JavaScript выполнился бы в домене портала.
 */

export const ALLOWED_IMAGE_TYPES = [
  'image/png',
  'image/jpeg',
  'image/gif',
  'image/webp'
] as const;

export type AllowedImageType = (typeof ALLOWED_IMAGE_TYPES)[number];

const EXTENSIONS: Record<AllowedImageType, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/gif': 'gif',
  'image/webp': 'webp'
};

export class AttachmentError extends Error {
  constructor(
    message: string,
    readonly code: 'unsupported_type' | 'too_large' | 'not_found'
  ) {
    super(message);
    this.name = 'AttachmentError';
  }
}

/**
 * Определяет тип по первым байтам файла.
 *
 * Расширение и заголовок Content-Type приходят от клиента, поэтому проверять
 * по ним бессмысленно: HTML со скриптом, названный «cat.png», прошел бы такую
 * проверку и был бы отдан браузеру как страница.
 */
export function detectImageType(buffer: Buffer): AllowedImageType | null {
  if (buffer.length < 12) return null;

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a
  ) {
    return 'image/png';
  }

  // JPEG: FF D8 FF
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) {
    return 'image/jpeg';
  }

  // GIF: «GIF87a» или «GIF89a»
  if (buffer.subarray(0, 6).toString('latin1').match(/^GIF8[79]a$/)) {
    return 'image/gif';
  }

  // WEBP: «RIFF» ‹4 байта размера› «WEBP»
  if (
    buffer.subarray(0, 4).toString('latin1') === 'RIFF' &&
    buffer.subarray(8, 12).toString('latin1') === 'WEBP'
  ) {
    return 'image/webp';
  }

  return null;
}

/**
 * Имя показывается в интерфейсе и попадает в заголовок ответа, поэтому убираем
 * управляющие символы (они ломают заголовок) и разделители путей.
 */
export function safeFileName(name: string): string {
  const cleaned = Array.from(name)
    .filter((char) => {
      const code = char.codePointAt(0) ?? 0;
      return code > 31 && code !== 127;
    })
    .join('')
    .replace(/[\\/]/g, '_')
    .trim()
    .slice(0, 120);
  return cleaned || 'izobrazhenie';
}

export interface AttachmentDto {
  id: string;
  fileName: string;
  mimeType: string;
  byteSize: number;
  url: string;
}

interface AttachmentRow {
  id: string;
  file_name: string;
  mime_type: string;
  byte_size: string;
  storage_path: string;
}

function toDto(row: AttachmentRow): AttachmentDto {
  return {
    id: row.id,
    fileName: row.file_name,
    mimeType: row.mime_type,
    byteSize: Number(row.byte_size),
    url: `/api/chat/attachments/${row.id}`
  };
}

/** Создает каталог загрузок и проверяет, что в него можно писать. */
export async function ensureUploadsDir(): Promise<string> {
  const dir = getConfig().uploads.dir;
  await fs.mkdir(dir, { recursive: true });
  await fs.access(dir, (await import('node:fs')).constants.W_OK);
  return dir;
}

/**
 * Сохраняет картинку и заводит запись. Файл раскладывается по годам и месяцам,
 * чтобы в одном каталоге не накапливались десятки тысяч файлов.
 */
export async function saveImageAttachment(input: {
  buffer: Buffer;
  originalName: string;
  uploadedBy: string;
}): Promise<AttachmentDto> {
  const config = getConfig();

  if (input.buffer.byteLength > config.uploads.maxBytes) {
    throw new AttachmentError('Файл больше допустимого размера', 'too_large');
  }

  const mimeType = detectImageType(input.buffer);
  if (!mimeType) {
    throw new AttachmentError(
      'Поддерживаются только изображения PNG, JPEG, GIF и WEBP',
      'unsupported_type'
    );
  }

  const now = new Date();
  const folder = `${now.getUTCFullYear()}/${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
  const id = crypto.randomUUID();
  const relativePath = `${folder}/${id}.${EXTENSIONS[mimeType]}`;
  const absolutePath = path.join(config.uploads.dir, relativePath);

  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, input.buffer);

  try {
    await query(
      `INSERT INTO chat_attachments (id, uploaded_by, file_name, mime_type, byte_size, storage_path)
       VALUES ($1,$2,$3,$4,$5,$6)`,
      [
        id,
        input.uploadedBy,
        safeFileName(input.originalName),
        mimeType,
        input.buffer.byteLength,
        relativePath
      ]
    );
  } catch (error) {
    // Иначе на диске останется файл, о котором никто не знает.
    await fs.unlink(absolutePath).catch(() => undefined);
    throw error;
  }

  return {
    id,
    fileName: safeFileName(input.originalName),
    mimeType,
    byteSize: input.buffer.byteLength,
    url: `/api/chat/attachments/${id}`
  };
}

/**
 * Удаляет вложение вместе с файлом.
 *
 * Нужно, когда сообщение не удалось записать уже после сохранения картинки:
 * иначе в хранилище остался бы файл, на который никто не ссылается, и его
 * пришлось бы вычищать отдельной уборкой.
 */
export async function deleteAttachment(attachmentId: string): Promise<void> {
  const { rows } = await query<{ storage_path: string }>(
    'DELETE FROM chat_attachments WHERE id = $1 RETURNING storage_path',
    [attachmentId]
  );

  if (rows.length === 0) return;

  const absolutePath = path.resolve(getConfig().uploads.dir, rows[0].storage_path);
  await fs.unlink(absolutePath).catch(() => undefined);
}

export async function attachToMessage(attachmentId: string, messageId: string): Promise<void> {
  await query('UPDATE chat_attachments SET message_id = $1 WHERE id = $2', [
    messageId,
    attachmentId
  ]);
}

export async function listAttachmentsForMessages(
  messageIds: readonly string[]
): Promise<Map<string, AttachmentDto>> {
  if (messageIds.length === 0) return new Map();

  const { rows } = await query<AttachmentRow & { message_id: string }>(
    `SELECT id, message_id, file_name, mime_type, byte_size, storage_path
     FROM chat_attachments
     WHERE message_id = ANY($1::text[])`,
    [messageIds as string[]]
  );

  return new Map(rows.map((row) => [row.message_id, toDto(row)]));
}

export interface StoredAttachment {
  absolutePath: string;
  mimeType: string;
  fileName: string;
  byteSize: number;
}

/**
 * Отдает путь к файлу по идентификатору.
 *
 * Путь собирается из значения в базе, а не из параметра запроса, поэтому
 * «../../etc/passwd» в адресе никуда не приведет. На всякий случай результат
 * дополнительно сверяется с каталогом загрузок.
 */
export async function getStoredAttachment(id: string): Promise<StoredAttachment> {
  if (!/^[0-9a-f-]{36}$/i.test(id)) {
    throw new AttachmentError('Вложение не найдено', 'not_found');
  }

  const { rows } = await query<AttachmentRow>(
    `SELECT id, file_name, mime_type, byte_size, storage_path
     FROM chat_attachments WHERE id = $1`,
    [id]
  );

  if (rows.length === 0) {
    throw new AttachmentError('Вложение не найдено', 'not_found');
  }

  const config = getConfig();
  const absolutePath = path.resolve(config.uploads.dir, rows[0].storage_path);
  if (!absolutePath.startsWith(path.resolve(config.uploads.dir) + path.sep)) {
    throw new AttachmentError('Вложение не найдено', 'not_found');
  }

  return {
    absolutePath,
    mimeType: rows[0].mime_type,
    fileName: rows[0].file_name,
    byteSize: Number(rows[0].byte_size)
  };
}
