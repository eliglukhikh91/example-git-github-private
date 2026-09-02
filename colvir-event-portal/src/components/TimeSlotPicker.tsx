import React from 'react';
import { Clock, Info, X } from 'lucide-react';
import { formatSlot, withSlot } from '../utils/timeSlots';

/**
 * Выбор слотов времени для мероприятия.
 *
 * Время выбирается в полях «с» и «до» — это обычные поля типа time, браузер
 * открывает в них свои часы. Раньше слот набирался строкой в свободном виде
 * («Например: 14:00 - 15:00»), и любая опечатка молча уезжала в базу.
 *
 * Поля «с» и «до» живут в родительской форме: при отправке она добавляет
 * выбранное время в список, даже если админ не нажал «Добавить слот».
 */
interface TimeSlotPickerProps {
  slots: string[];
  onSlotsChange: (slots: string[]) => void;
  from: string;
  to: string;
  onFromChange: (value: string) => void;
  onToChange: (value: string) => void;
  /** Префикс id: на странице бывает открыта только одна форма, но id должны быть свои. */
  idPrefix: string;
}

const PRESETS: [string, string][] = [
  ['10:00', '11:00'],
  ['12:00', '13:00'],
  ['15:00', '16:00'],
  ['18:00', '19:00']
];

const HOURS = Array.from({ length: 24 }, (_, i) => String(i).padStart(2, '0'));
const MINUTES = Array.from({ length: 12 }, (_, i) => String(i * 5).padStart(2, '0'));

const selectClass =
  'px-2.5 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:border-accent outline-hidden';

/**
 * Часы и минуты отдельными списками, а не полем типа time.
 *
 * Поле time рисует браузер, и формат он берет из своей локали: на английской
 * системе то же время показывается как «01:00 PM». В портале время везде
 * московское и двадцатичетырехчасовое, поэтому выбор не должен зависеть от
 * настроек рабочей станции.
 */
const TimeSelect: React.FC<{
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}> = ({ id, label, value, onChange }) => {
  const [hours = '', minutes = ''] = value ? value.split(':') : [];

  const update = (nextHours: string, nextMinutes: string) => {
    if (!nextHours && !nextMinutes) {
      onChange('');
      return;
    }
    // Пока выбрана только одна половина, вторую подставляем нулями — иначе
    // значение остается неполным и слот не собирается.
    onChange(`${nextHours || '00'}:${nextMinutes || '00'}`);
  };

  return (
    <div className="space-y-1">
      <span className="block text-[10px] font-bold text-slate-500 uppercase">{label}</span>
      <div className="flex items-center gap-1">
        <select
          id={id}
          aria-label={`${label}: часы`}
          value={hours}
          onChange={(e) => update(e.target.value, minutes)}
          className={selectClass}
        >
          <option value="">чч</option>
          {HOURS.map((hour) => (
            <option key={hour} value={hour}>
              {hour}
            </option>
          ))}
        </select>
        <span className="font-black text-slate-400">:</span>
        <select
          aria-label={`${label}: минуты`}
          value={minutes}
          onChange={(e) => update(hours, e.target.value)}
          className={selectClass}
        >
          <option value="">мм</option>
          {MINUTES.map((minute) => (
            <option key={minute} value={minute}>
              {minute}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export const TimeSlotPicker: React.FC<TimeSlotPickerProps> = ({
  slots,
  onSlotsChange,
  from,
  to,
  onFromChange,
  onToChange,
  idPrefix
}) => {
  const pending = formatSlot(from, to);
  const wrongOrder = Boolean(from && to && !pending);
  const alreadyAdded = Boolean(pending && slots.includes(pending));

  const handleAdd = () => {
    onSlotsChange(withSlot(slots, from, to));
  };

  const handlePreset = (presetFrom: string, presetTo: string) => {
    onFromChange(presetFrom);
    onToChange(presetTo);
    onSlotsChange(withSlot(slots, presetFrom, presetTo));
  };

  const handleRemove = (index: number) => {
    onSlotsChange(slots.filter((_, i) => i !== index));
  };

  return (
    <div className="space-y-3 bg-accent-light/80 p-4 rounded-2xl border border-accent/20">
      <div className="flex items-center justify-between">
        <label className="text-xs font-black text-slate-900 flex items-center gap-1.5">
          <Clock className="w-4 h-4 text-accent" />
          <span>Слоты времени для записи</span>
        </label>
        <span className="px-2 py-0.5 bg-accent text-white text-[10px] font-black rounded uppercase">
          МСК / UTC+3
        </span>
      </div>

      <div className="p-2.5 bg-blue-100/60 border border-blue-200/80 rounded-xl text-[11px] text-accent font-semibold flex items-center gap-2">
        <Info className="w-4 h-4 shrink-0" />
        <span>Время всех мероприятий — московское.</span>
      </div>

      <div className="flex flex-wrap items-end gap-3">
        <TimeSelect
          id={`${idPrefix}-slot-from`}
          label="Начало"
          value={from}
          onChange={onFromChange}
        />

        <TimeSelect id={`${idPrefix}-slot-to`} label="Окончание" value={to} onChange={onToChange} />

        <button
          type="button"
          onClick={handleAdd}
          disabled={!pending || alreadyAdded}
          className="px-3.5 py-2 bg-accent text-white text-xs font-bold rounded-xl hover:bg-accent-hover disabled:opacity-50"
        >
          + Добавить слот
        </button>
      </div>

      {wrongOrder && (
        <p className="text-[11px] font-semibold text-rose-700">
          Окончание должно быть позже начала.
        </p>
      )}

      <div className="space-y-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase block">Частые слоты:</span>
        <div className="flex flex-wrap gap-1.5 text-[11px]">
          {PRESETS.map(([presetFrom, presetTo]) => (
            <button
              type="button"
              key={`${presetFrom}-${presetTo}`}
              onClick={() => handlePreset(presetFrom, presetTo)}
              className="px-2.5 py-1 bg-white hover:bg-blue-50 border border-slate-200 text-slate-700 font-bold rounded-lg transition-colors"
            >
              + {presetFrom} - {presetTo}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-1 pt-1">
        <span className="text-[10px] font-bold text-slate-500 uppercase block">
          Слоты мероприятия:
        </span>

        {slots.length === 0 ? (
          <p className="text-[11px] font-semibold text-slate-500">
            Пока ни одного. Выберите время и нажмите «Добавить слот».
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {slots.map((slot, index) => (
              <span
                key={slot}
                className="inline-flex items-center gap-1.5 px-3 py-1 bg-white border border-blue-300 text-xs font-bold rounded-lg text-accent shadow-xs"
              >
                <Clock className="w-3 h-3 text-accent" />
                {slot}
                <button
                  type="button"
                  onClick={() => handleRemove(index)}
                  className="text-slate-400 hover:text-red-600 ml-1"
                  aria-label={`Убрать слот ${slot}`}
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
