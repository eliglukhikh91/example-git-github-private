import test, { describe } from 'node:test';
import assert from 'node:assert/strict';
import { buildMatchPlan, parseSlotStart } from '../server/services/coffee.js';

/**
 * Алгоритм подбора не обращается к базе, поэтому проверяется как чистая функция.
 */

const candidate = (userId: string, ...slots: string[]) => ({ userId, slots: new Set(slots) });

describe('Подбор пар Random Coffee', () => {
  test('сводит двоих по общему слоту', () => {
    const { plan, unmatched } = buildMatchPlan([
      candidate('a', '10:00', '15:00'),
      candidate('b', '15:00')
    ]);

    assert.equal(plan.length, 1);
    assert.equal(plan[0].slot, '15:00', 'слот должен подходить обоим');
    assert.deepEqual([...plan[0].members].sort(), ['a', 'b']);
    assert.deepEqual(unmatched, []);
  });

  test('не сводит тех, у кого нет общего слота, и сообщает об этом', () => {
    const { plan, unmatched } = buildMatchPlan([
      candidate('a', '10:00'),
      candidate('b', '15:00')
    ]);

    assert.equal(plan.length, 0);
    // Оба должны попасть в unmatched: администратору важно видеть, что двое
    // остались без встречи, а не только их количество.
    assert.deepEqual([...unmatched].sort(), ['a', 'b']);
  });

  test('выбранный слот всегда есть у всех участников встречи', () => {
    const people = [
      candidate('a', '10:00', '11:00'),
      candidate('b', '11:00', '15:00'),
      candidate('c', '10:00', '15:00'),
      candidate('d', '15:00')
    ];
    const byId = new Map(people.map((person) => [person.userId, person]));

    const { plan } = buildMatchPlan(people);

    for (const entry of plan) {
      for (const member of entry.members) {
        assert.ok(
          byId.get(member)!.slots.has(entry.slot),
          `слот ${entry.slot} должен быть отмечен у ${member}`
        );
      }
    }
  });

  test('сотрудник участвует не более чем в одной встрече', () => {
    const { plan } = buildMatchPlan([
      candidate('a', '10:00'),
      candidate('b', '10:00'),
      candidate('c', '10:00'),
      candidate('d', '10:00')
    ]);

    const seen = plan.flatMap((entry) => entry.members);
    assert.equal(new Set(seen).size, seen.length, 'участники не должны дублироваться');
  });

  test('приоритет у того, у кого меньше вариантов', () => {
    // У «d» единственный возможный партнёр — «a». Жадный по числу вариантов
    // алгоритм обязан не «съесть» a в паре с b или c.
    const { plan, unmatched } = buildMatchPlan([
      candidate('a', '10:00', '11:00', '15:00'),
      candidate('b', '11:00', '15:00'),
      candidate('c', '11:00', '15:00'),
      candidate('d', '10:00')
    ]);

    assert.ok(
      plan.some((entry) => entry.members.includes('d')),
      'сотрудник с единственным вариантом должен получить пару'
    );
    assert.equal(unmatched.length, 0);
  });

  test('нечётный участник становится третьим, а не остаётся без встречи', () => {
    const { plan, unmatched } = buildMatchPlan([
      candidate('a', '10:00'),
      candidate('b', '10:00'),
      candidate('c', '10:00')
    ]);

    assert.equal(plan.length, 1);
    assert.equal(plan[0].members.length, 3, 'должна получиться тройка');
    assert.deepEqual(unmatched, []);
  });

  test('уже встречавшиеся пары не повторяются, пока есть альтернатива', () => {
    const history = new Set(['a|b']);
    const { plan } = buildMatchPlan(
      [
        candidate('a', '10:00'),
        candidate('b', '10:00'),
        candidate('c', '10:00'),
        candidate('d', '10:00')
      ],
      history
    );

    const pairs = plan.map((entry) => [...entry.members].sort().join('|'));
    assert.ok(!pairs.includes('a|b'), 'повторной пары a+b быть не должно');
    assert.equal(plan.length, 2);
  });

  test('повтор допускается, если других вариантов нет', () => {
    const history = new Set(['a|b']);
    const { plan } = buildMatchPlan([candidate('a', '10:00'), candidate('b', '10:00')], history);

    // Лучше повторная встреча, чем ни одной.
    assert.equal(plan.length, 1);
    assert.deepEqual([...plan[0].members].sort(), ['a', 'b']);
  });

  test('участники без отмеченных слотов игнорируются', () => {
    const { plan } = buildMatchPlan([
      candidate('a', '10:00'),
      candidate('b', '10:00'),
      candidate('c')
    ]);

    const seen = plan.flatMap((entry) => entry.members);
    assert.ok(!seen.includes('c'), 'сотрудник без слотов не должен попасть в пару');
  });
});

describe('Разбор времени слота', () => {
  test('берёт начало слота по Москве', () => {
    const start = parseSlotStart('10:00 - 10:15 (МСК)', '2026-08-20');
    assert.ok(start);
    assert.equal(start!.toISOString(), '2026-08-20T07:00:00.000Z', 'МСК — это UTC+3');
  });

  test('возвращает null на непонятном формате', () => {
    assert.equal(parseSlotStart('когда-нибудь', '2026-08-20'), null);
    assert.equal(parseSlotStart('99:99', '2026-08-20'), null);
  });
});
