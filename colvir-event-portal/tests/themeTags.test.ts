import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import {
  formatHashtags,
  matchesTheme,
  normalizeHashtag,
  parseHashtags
} from '../src/utils/themeTags.js';

describe('Хэштеги праздничной подборки', () => {
  test('мероприятие попадает в подборку по хэштегу', () => {
    assert.equal(matchesTheme({ tags: ['новыйгод'] }, 'newyear'), true);
    assert.equal(matchesTheme({ tags: ['colvirspring'] }, 'spring'), true);
    assert.equal(matchesTheme({ tags: ['деньрождения'] }, 'birthday'), true);
  });

  test('регистр, решетка, пробелы и дефисы значения не имеют', () => {
    for (const tag of ['#НовыйГод', 'Новый Год', 'новый-год', '  #новый_год  ']) {
      assert.equal(matchesTheme({ tags: [tag] }, 'newyear'), true, `не сработало на «${tag}»`);
    }
  });

  test('«ё» и «е» — один и тот же хэштег', () => {
    assert.equal(matchesTheme({ tags: ['#ДеньРождёния'] }, 'birthday'), true);
  });

  test('похожий хэштег в подборку не тянет', () => {
    // Ради этого хэштег сравнивается целиком: поиск по вхождению подстроки
    // затягивал «новый формат» в новогоднюю подборку.
    assert.equal(matchesTheme({ tags: ['новыйформат'] }, 'newyear'), false);
    assert.equal(matchesTheme({ tags: ['весенняяуборка'] }, 'spring'), false);
    assert.equal(matchesTheme({ tags: ['новыйгодик'] }, 'newyear'), false);
  });

  test('хэштег одной темы не попадает в подборку другой', () => {
    assert.equal(matchesTheme({ tags: ['новыйгод'] }, 'spring'), false);
    assert.equal(matchesTheme({ tags: ['colvirspring'] }, 'birthday'), false);
  });

  test('выбранная в форме тема работает без всяких хэштегов', () => {
    assert.equal(matchesTheme({ themeTag: 'newyear', tags: [] }, 'newyear'), true);
    assert.equal(matchesTheme({ themeTag: 'newyear', tags: [] }, 'spring'), false);
  });

  test('у обычной темы подборки нет', () => {
    assert.equal(matchesTheme({ themeTag: 'newyear', tags: ['новыйгод'] }, 'classic'), false);
  });

  test('мероприятие без тегов и темы никуда не попадает', () => {
    assert.equal(matchesTheme({}, 'newyear'), false);
  });
});

describe('Разбор поля хэштегов', () => {
  test('разделителем считается пробел и запятая, решетка необязательна', () => {
    assert.deepEqual(parseHashtags('#новыйгод #квиз'), ['новыйгод', 'квиз']);
    assert.deepEqual(parseHashtags('новыйгод, квиз'), ['новыйгод', 'квиз']);
    assert.deepEqual(parseHashtags('новыйгод квиз'), ['новыйгод', 'квиз']);
    assert.deepEqual(parseHashtags('  #новыйгод ,,  квиз  '), ['новыйгод', 'квиз']);
  });

  test('хэштег с решеткой может состоять из нескольких слов', () => {
    // «#Новый Год» — один хэштег, а не «Новый» и «Год» по отдельности.
    assert.deepEqual(parseHashtags('#Новый Год, #квиз'), ['Новый Год', 'квиз']);
    assert.deepEqual(parseHashtags('#Новый Год #Тимбилдинг'), ['Новый Год', 'Тимбилдинг']);
  });

  test('многословный хэштег доводит мероприятие до подборки', () => {
    assert.equal(matchesTheme({ tags: parseHashtags('#Новый Год') }, 'newyear'), true);
    assert.equal(matchesTheme({ tags: parseHashtags('#День Рождения') }, 'birthday'), true);
  });

  test('повторы убираются независимо от написания', () => {
    assert.deepEqual(parseHashtags('#Квиз #квиз #КВИЗ'), ['Квиз']);
    assert.deepEqual(parseHashtags('квиз, Квиз'), ['квиз']);
  });

  test('пустая строка дает пустой список', () => {
    assert.deepEqual(parseHashtags('   '), []);
    assert.deepEqual(parseHashtags('###'), []);
  });

  test('больше десяти хэштегов на мероприятие не берем', () => {
    const many = Array.from({ length: 25 }, (_, i) => `#тег${i}`).join(' ');
    assert.equal(parseHashtags(many).length, 10);
  });

  test('служебные теги в поле ввода не показываются', () => {
    const tags = ['team-game', 'Команды', 'новыйгод', 'квиз'];
    assert.equal(formatHashtags(tags), '#новыйгод #квиз');
  });

  test('поле ввода и разбор согласованы между собой', () => {
    const tags = ['coffee-break', 'Индивидуально', 'новыйгод', 'кофе'];
    assert.deepEqual(parseHashtags(formatHashtags(tags)), ['новыйгод', 'кофе']);
  });
});

describe('Приведение хэштега к сравнимому виду', () => {
  test('снимает решетку, регистр и разделители', () => {
    assert.equal(normalizeHashtag('#Новый-Год'), 'новыйгод');
    assert.equal(normalizeHashtag('  COLVIRSPRING '), 'colvirspring');
  });
});
