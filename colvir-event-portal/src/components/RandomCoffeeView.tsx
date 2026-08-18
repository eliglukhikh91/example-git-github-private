import React, { useEffect, useMemo, useState } from 'react';
import {
  Coffee,
  Clock,
  Users,
  CheckCircle2,
  CalendarClock,
  Mail,
  Send,
  Info,
  Sparkles,
  Building
} from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Random Coffee.
 *
 * Работает циклами, как Slack-боты вроде Donut:
 *
 *   1. Администратор открывает цикл — дату встреч и дедлайн записи.
 *   2. Сотрудник отмечает ВСЕ удобные ему слоты, а не один.
 *   3. По дедлайну сервер разбивает участников на пары так, чтобы у обоих был
 *      общий слот, и присылает обоим личное уведомление.
 *
 * Прежняя версия подбирала коллегу прямо в браузере, пару никуда не сохраняла и
 * при пустом слоте подставляла пять захардкоженных «сотрудников» — поэтому
 * второй участник о встрече не узнавал, а иногда и не существовал. Мультислот
 * решает исходную проблему: время встречи выбирает не человек до подбора, а
 * система после — из того, что по определению подходит обоим.
 */

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('ru-RU', {
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });
}

function formatDateTime(value: string): string {
  return new Date(value).toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export const RandomCoffeeView: React.FC = () => {
  const { coffee, saveCoffeeAvailability, cmsContent, userProfile, refreshCoffee } = useApp();

  const [selected, setSelected] = useState<string[]>(coffee.myAvailability);
  const [isSaving, setIsSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ ok: boolean; message: string } | null>(null);

  // Пришли свежие данные с сервера — подтягиваем выбор, чтобы не показывать
  // устаревшее состояние после сохранения или смены цикла.
  useEffect(() => {
    setSelected(coffee.myAvailability);
  }, [coffee.myAvailability]);

  const { cycle, slots, slotDemand, participants, myMatch } = coffee;

  const registrationClosed = cycle
    ? cycle.status !== 'open' || new Date(cycle.registrationEndsAt).getTime() <= Date.now()
    : true;

  const isDirty = useMemo(() => {
    const a = [...selected].sort().join('|');
    const b = [...coffee.myAvailability].sort().join('|');
    return a !== b;
  }, [selected, coffee.myAvailability]);

  const toggleSlot = (slot: string) => {
    setSelected((prev) =>
      prev.includes(slot) ? prev.filter((item) => item !== slot) : [...prev, slot]
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    setFeedback(null);
    const result = await saveCoffeeAvailability(selected);
    setFeedback({ ok: result.success, message: result.message });
    setIsSaving(false);
    setTimeout(() => setFeedback(null), 5000);
  };

  const partners = myMatch
    ? myMatch.members.filter((member) => member.userId !== userProfile.id)
    : [];

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Заголовок */}
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-start gap-3">
          <div className="w-11 h-11 rounded-xl bg-accent-soft flex items-center justify-center shrink-0">
            <Coffee className="w-5 h-5 text-accent" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              {cmsContent.randomCoffeeTitle || 'Random Coffee'}
            </h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed max-w-2xl">
              {cmsContent.randomCoffeeDescription ||
                'Отметьте удобные слоты — система подберёт вам случайного коллегу на короткий кофе-брейк.'}
            </p>
            {(cmsContent.randomCoffeeFormat || cmsContent.randomCoffeeDuration) && (
              <p className="text-[11px] text-slate-400 mt-2">
                {[cmsContent.randomCoffeeFormat, cmsContent.randomCoffeeDuration]
                  .filter(Boolean)
                  .join(' · ')}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Нет активного цикла */}
      {!cycle && (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-2">
          <CalendarClock className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-sm font-bold text-slate-700">Запись пока не открыта</p>
          <p className="text-xs text-slate-500 max-w-md mx-auto">
            Организатор ещё не объявил следующий раунд Random Coffee. Как только он появится,
            здесь можно будет отметить удобное время.
          </p>
        </div>
      )}

      {/* Моя пара */}
      {myMatch && partners.length > 0 && (
        <div className="bg-white rounded-2xl border border-accent/30 overflow-hidden">
          <div className="bg-accent-soft px-5 py-3 flex items-center gap-2 border-b border-accent/20">
            <Sparkles className="w-4 h-4 text-accent shrink-0" />
            <h3 className="text-sm font-black text-accent">Вам подобран коллега</h3>
          </div>

          <div className="p-5 space-y-4">
            {partners.map((partner) => (
              <div key={partner.userId} className="flex items-center gap-3">
                {partner.avatarUrl ? (
                  <img
                    src={partner.avatarUrl}
                    alt=""
                    className="w-12 h-12 rounded-xl object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-xl bg-accent text-white flex items-center justify-center font-black shrink-0">
                    {partner.displayName.charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 truncate">
                    {partner.displayName}
                  </p>
                  {partner.department && (
                    <p className="text-xs text-slate-500 truncate flex items-center gap-1.5">
                      <Building className="w-3 h-3 shrink-0" />
                      {partner.department}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-1.5 shrink-0">
                  <a
                    href={`mailto:${partner.email}`}
                    className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                    title={`Написать на ${partner.email}`}
                  >
                    <Mail className="w-4 h-4" />
                  </a>
                  {partner.telegram && (
                    <a
                      href={`https://t.me/${partner.telegram.replace(/^@/, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 transition-colors"
                      title={`Telegram ${partner.telegram}`}
                    >
                      <Send className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>
            ))}

            <div className="pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <span className="text-slate-400 block">Дата:</span>
                <strong className="text-slate-900">{formatDate(cycle!.meetingDate)}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Время:</span>
                <strong className="text-slate-900">{myMatch.slot}</strong>
              </div>
              <div>
                <span className="text-slate-400 block">Формат:</span>
                <strong className="text-slate-900">{myMatch.location || 'на ваш выбор'}</strong>
              </div>
            </div>

            {partners.length > 1 && (
              <p className="text-[11px] text-slate-500 flex items-start gap-1.5">
                <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                Участников оказалось нечётное число, поэтому в этот раз встреча на трёх человек.
              </p>
            )}
          </div>
        </div>
      )}

      {/* Подбор выполнен, но пары нет */}
      {cycle?.status === 'matched' && !myMatch && (
        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-1">
          <p className="text-sm font-bold text-amber-900">На этот раз пары не нашлось</p>
          <p className="text-xs text-amber-800 leading-relaxed">
            Ни у кого из участников не совпало время с отмеченными вами слотами. В следующем
            цикле отметьте побольше вариантов — так шансов заметно больше.
          </p>
        </div>
      )}

      {/* Выбор слотов */}
      {cycle && cycle.status === 'open' && (
        <div className="bg-white rounded-2xl border border-slate-200 p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
            <div className="min-w-0">
              <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-accent shrink-0" />
                Когда вам удобно?
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Отметьте все подходящие слоты — чем больше вариантов, тем выше шанс найти пару.
                Время встречи выберет система из общего для вас двоих.
              </p>
            </div>

            <div className="shrink-0 text-xs text-right">
              <div className="text-slate-400">Встречи:</div>
              <strong className="text-slate-900">{formatDate(cycle.meetingDate)}</strong>
              <div className="text-slate-400 mt-1">Запись до:</div>
              <strong className="text-slate-900">
                {formatDateTime(cycle.registrationEndsAt)}
              </strong>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-accent-soft rounded-xl text-[11px] font-semibold text-accent">
            <Users className="w-3.5 h-3.5 shrink-0" />
            <span>
              Уже участвуют: {participants}
              {participants < 2 ? ' — нужен минимум ещё один коллега' : ''}
            </span>
          </div>

          {slots.length === 0 ? (
            <p className="text-xs text-slate-500">
              Организатор ещё не завёл слоты времени для Random Coffee.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {slots.map((slot) => {
                const isChecked = selected.includes(slot);
                const demand = slotDemand[slot] ?? 0;
                return (
                  <button
                    key={slot}
                    type="button"
                    onClick={() => toggleSlot(slot)}
                    disabled={registrationClosed}
                    aria-pressed={isChecked}
                    className={`p-3 rounded-xl border text-xs font-semibold text-left flex items-center justify-between gap-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${
                      isChecked
                        ? 'bg-accent-soft border-accent text-accent'
                        : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                    }`}
                  >
                    <span className="min-w-0 truncate">{slot}</span>
                    <span className="flex items-center gap-2 shrink-0">
                      {demand > 0 && (
                        <span className="text-[10px] font-bold text-slate-400">
                          {demand} чел.
                        </span>
                      )}
                      {isChecked && <CheckCircle2 className="w-4 h-4" />}
                    </span>
                  </button>
                );
              })}
            </div>
          )}

          {feedback && (
            <div
              className={`p-3 rounded-xl text-xs font-semibold ${
                feedback.ok
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {feedback.message}
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-1">
            <p className="text-[11px] text-slate-500">
              {registrationClosed
                ? 'Запись в этот цикл закрыта — ожидайте результата подбора.'
                : `Отмечено слотов: ${selected.length}. Изменить можно до закрытия записи.`}
            </p>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void refreshCoffee()}
                className="px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
              >
                Обновить
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={registrationClosed || isSaving || !isDirty}
                className="px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors"
              >
                {isSaving ? 'Сохраняю…' : 'Сохранить доступность'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Как это работает */}
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 space-y-2">
        <h3 className="text-xs font-black text-slate-800 flex items-center gap-2">
          <Info className="w-4 h-4 text-accent shrink-0" />
          Как это работает
        </h3>
        <ol className="text-[11px] text-slate-600 leading-relaxed space-y-1 list-decimal list-inside">
          <li>Организатор объявляет раунд: дату встреч и срок записи.</li>
          <li>Вы отмечаете все удобные слоты — можно несколько.</li>
          <li>
            После закрытия записи система разбивает участников на пары так, чтобы время подходило
            обоим, и старается не сводить тех, кто уже встречался.
          </li>
          <li>Вы получаете уведомление с именем коллеги и временем, а перед началом — напоминание.</li>
        </ol>
      </div>
    </div>
  );
};
