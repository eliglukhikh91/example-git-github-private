import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { getMoscowIsoDate, toIsoDate, toRussianDate } from '../src/utils/eventDate.js';

describe('Дата мероприятия', () => {
  test('выбранный в календаре день превращается в привычную строку', () => {
    assert.equal(toRussianDate('2026-08-12'), '12 августа 2026');
    assert.equal(toRussianDate('2026-01-01'), '1 января 2026');
    assert.equal(toRussianDate('2026-12-31'), '31 декабря 2026');
  });

  test('сохраненная дата открывается в календаре', () => {
    assert.equal(toIsoDate('12 августа 2026'), '2026-08-12');
    assert.equal(toIsoDate('1 января 2026'), '2026-01-01');
  });

  test('понимаются даты, набранные в прежнем свободном виде', () => {
    assert.equal(toIsoDate('2 сентября 2026 г.'), '2026-09-02');
    assert.equal(toIsoDate('12.08.2026'), '2026-08-12');
    assert.equal(toIsoDate('2026-08-12'), '2026-08-12');
    assert.equal(toIsoDate('  5 мая 2027  '), '2027-05-05');
  });

  test('то, что датой не является, дает пустую строку', () => {
    assert.equal(toIsoDate('по договоренности'), '');
    assert.equal(toIsoDate(''), '');
    assert.equal(toIsoDate('32 фывапролджа 2026'), '');
    assert.equal(toRussianDate('12 августа 2026'), '');
    assert.equal(toRussianDate(''), '');
  });

  test('перевод туда и обратно ничего не теряет', () => {
    for (const iso of ['2026-02-28', '2026-07-04', '2027-11-30']) {
      assert.equal(toIsoDate(toRussianDate(iso)), iso);
    }
  });

  test('сегодняшняя дата считается по Москве', () => {
    const iso = getMoscowIsoDate(new Date('2026-09-02T22:30:00Z'));
    // 22:30 UTC — это уже следующий день в Москве.
    assert.equal(iso, '2026-09-03');
    assert.match(getMoscowIsoDate(), /^\d{4}-\d{2}-\d{2}$/);
  });
});
