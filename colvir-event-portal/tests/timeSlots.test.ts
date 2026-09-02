import test, { describe } from 'node:test';
import assert from 'node:assert/strict';

import { formatSlot, parseSlot, withSlot } from '../src/utils/timeSlots.js';

describe('Слоты времени мероприятия', () => {
  test('слот собирается из выбранного времени с пометкой МСК', () => {
    assert.equal(formatSlot('13:00', '13:30'), '13:00 - 13:30 (МСК)');
  });

  test('незаполненное или перевернутое время слотом не считается', () => {
    assert.equal(formatSlot('', '13:30'), null);
    assert.equal(formatSlot('13:00', ''), null);
    assert.equal(formatSlot('13:30', '13:00'), null);
    assert.equal(formatSlot('13:00', '13:00'), null);
    assert.equal(formatSlot('25:00', '26:00'), null);
  });

  test('выбранное время добавляется в список', () => {
    // Главный случай: время из полей попадает в мероприятие при сохранении,
    // даже если кнопку «Добавить слот» не нажали. Раньше оно терялось, и
    // мероприятие уходило в базу с подставленным 10:00 - 11:00.
    assert.deepEqual(withSlot([], '13:00', '13:30'), ['13:00 - 13:30 (МСК)']);
    assert.deepEqual(withSlot(['10:00 - 11:00 (МСК)'], '13:00', '13:30'), [
      '10:00 - 11:00 (МСК)',
      '13:00 - 13:30 (МСК)'
    ]);
  });

  test('пустые поля список не меняют', () => {
    const slots = ['10:00 - 11:00 (МСК)'];
    assert.deepEqual(withSlot(slots, '', ''), slots);
    assert.deepEqual(withSlot(slots, '13:30', '13:00'), slots);
  });

  test('тот же слот второй раз не добавляется', () => {
    assert.deepEqual(withSlot(['13:00 - 13:30 (МСК)'], '13:00', '13:30'), [
      '13:00 - 13:30 (МСК)'
    ]);
  });

  test('сохраненный слот разбирается обратно в поля времени', () => {
    assert.deepEqual(parseSlot('13:00 - 13:30 (МСК)'), { from: '13:00', to: '13:30' });
    assert.deepEqual(parseSlot('18:00 - 20:30 (МСК)'), { from: '18:00', to: '20:30' });
  });

  test('разбираются и записи прежнего формата', () => {
    // В базе есть слоты, набранные руками: с одной цифрой в часе, с длинным
    // тире, без пометки МСК.
    assert.deepEqual(parseSlot('9:00 - 10:00'), { from: '09:00', to: '10:00' });
    assert.deepEqual(parseSlot('11:00 – 12:00 (МСК)'), { from: '11:00', to: '12:00' });
    assert.equal(parseSlot('по договоренности'), null);
    assert.equal(parseSlot(''), null);
  });
});
