import React, { useState } from 'react';
import { LifeMoment, GentleStep } from '../types';
import { LanguageCode, TRANSLATIONS } from '../data/translations';
import { getLocalizedDateLabel, getCalculatedDaysLeft } from '../utils/momentUtils';
import { formatTimeWithTimezone } from '../utils/timezoneUtils';
import {
  LumaCheckIcon,
  LumaPlusIcon,
  LumaLeafIcon,
  LumaVoiceIcon,
  LumaCompassIcon,
} from './icons/LumaIcons';

interface EventPreparationWorkspaceProps {
  moment: LifeMoment;
  language: LanguageCode;
  onToggleStepDone: (momentId: string, stepId: string) => void;
  onAddStep?: (momentId: string, step: GentleStep) => void;
  onOpenTalk?: () => void;
  className?: string;
}

const LOCALIZED_PREP_STRINGS: Record<LanguageCode, {
  whatsAhead: string;
  lumaThought: string;
  yourPreparation: string;
  doThisNow: string;
  doThisToday: string;
  doThisFirst: string;
  later: string;
  addStep: string;
  addStepPlaceholder: string;
  addBtn: string;
  talkToLuma: string;
  completedCount: (done: number, total: number) => string;
  inXMinutes: string;
  inXDays: (days: number) => string;
  inXWeeks: (weeks: number) => string;
  inXMonths: (months: number) => string;
}> = {
  en: {
    whatsAhead: "WHAT'S AHEAD",
    lumaThought: "LUMA'S THOUGHT",
    yourPreparation: "YOUR PREPARATION",
    doThisNow: "DO THIS NOW",
    doThisToday: "DO THIS TODAY",
    doThisFirst: "DO THIS FIRST",
    later: "LATER",
    addStep: "Add a step",
    addStepPlaceholder: "e.g. Confirm hotel booking",
    addBtn: "Add",
    talkToLuma: "Talk to Luma about this event",
    completedCount: (done, total) => `${done} of ${total} prepared`,
    inXMinutes: "Starts in 20 minutes",
    inXDays: (days) => days === 0 ? "Today" : days === 1 ? "1 day to prepare" : `${days} days to prepare`,
    inXWeeks: (weeks) => `${weeks} ${weeks === 1 ? 'week' : 'weeks'} to prepare`,
    inXMonths: (months) => `${months} ${months === 1 ? 'month' : 'months'} away`,
  },
  ru: {
    whatsAhead: "ЧТО ВПЕРЕДИ",
    lumaThought: "МЫСЛЬ LUMA",
    yourPreparation: "ВАША ПОДГОТОВКА",
    doThisNow: "СДЕЛАЙТЕ СЕЙЧАС",
    doThisToday: "СДЕЛАЙТЕ СЕГОДНЯ",
    doThisFirst: "СДЕЛАЙТЕ В ПЕРВУЮ ОЧЕРЕДЬ",
    later: "ПОЗЖЕ",
    addStep: "Добавить шаг",
    addStepPlaceholder: "например: Подтвердить бронирование",
    addBtn: "Добавить",
    talkToLuma: "Обсудить это событие с Luma",
    completedCount: (done, total) => `${done} из ${total} готово`,
    inXMinutes: "Начало через 20 минут",
    inXDays: (days) => days === 0 ? "Сегодня" : days === 1 ? "1 день на подготовку" : `${days} дн. на подготовку`,
    inXWeeks: (weeks) => `${weeks} ${weeks === 1 ? 'неделя' : 'недель'} на подготовку`,
    inXMonths: (months) => `Через ${months} ${months === 1 ? 'месяц' : 'месяцев'}`,
  },
  es: {
    whatsAhead: "QUÉ VIENE",
    lumaThought: "PENSAMIENTO DE LUMA",
    yourPreparation: "TU PREPARACIÓN",
    doThisNow: "HAZ ESTO AHORA",
    doThisToday: "HAZ ESTO HOY",
    doThisFirst: "HAZ ESTO PRIMERO",
    later: "MÁS ADELANTE",
    addStep: "Añadir paso",
    addStepPlaceholder: "ej. Confirmar reserva",
    addBtn: "Añadir",
    talkToLuma: "Hablar con Luma sobre este evento",
    completedCount: (done, total) => `${done} de ${total} listos`,
    inXMinutes: "Comienza en 20 minutos",
    inXDays: (days) => days === 0 ? "Hoy" : days === 1 ? "1 día para preparar" : `${days} días para preparar`,
    inXWeeks: (weeks) => `${weeks} semanas para preparar`,
    inXMonths: (months) => `En ${months} meses`,
  },
  fr: {
    whatsAhead: "À VENIR",
    lumaThought: "LA PENSÉE DE LUMA",
    yourPreparation: "VOTRE PRÉPARATION",
    doThisNow: "À FAIRE MAINTENANT",
    doThisToday: "À FAIRE AUJOURD'HUI",
    doThisFirst: "À FAIRE EN PREMIER",
    later: "PLUS TARD",
    addStep: "Ajouter une étape",
    addStepPlaceholder: "ex. Confirmer la réservation",
    addBtn: "Ajouter",
    talkToLuma: "Discuter avec Luma de cet événement",
    completedCount: (done, total) => `${done} sur ${total} prêts`,
    inXMinutes: "Commence dans 20 minutes",
    inXDays: (days) => days === 0 ? "Aujourd'hui" : days === 1 ? "1 jour pour se préparer" : `${days} jours pour se préparer`,
    inXWeeks: (weeks) => `${weeks} semaines pour se préparer`,
    inXMonths: (months) => `Dans ${months} mois`,
  },
  it: {
    whatsAhead: "COSA C'È AVANTI",
    lumaThought: "IL PENSIERO DI LUMA",
    yourPreparation: "LA TUA PREPARAZIONE",
    doThisNow: "FAI QUESTO ORA",
    doThisToday: "FAI QUESTO OGGI",
    doThisFirst: "FAI QUESTO PER PRIMO",
    later: "PIÙ TARDI",
    addStep: "Aggiungi passo",
    addStepPlaceholder: "es. Conferma prenotazione",
    addBtn: "Aggiungi",
    talkToLuma: "Parla con Luma di questo evento",
    completedCount: (done, total) => `${done} di ${total} pronti`,
    inXMinutes: "Inizia tra 20 minuti",
    inXDays: (days) => days === 0 ? "Oggi" : days === 1 ? "1 giorno per prepararsi" : `${days} giorni per prepararsi`,
    inXWeeks: (weeks) => `${weeks} settimane per prepararsi`,
    inXMonths: (months) => `Tra ${months} mesi`,
  },
  pt: {
    whatsAhead: "O QUE VEM POR AÍ",
    lumaThought: "O PENSAMENTO DE LUMA",
    yourPreparation: "SUA PREPARAÇÃO",
    doThisNow: "FAÇA ISSO AGORA",
    doThisToday: "FAÇA ISSO HOJE",
    doThisFirst: "FAÇA ISSO PRIMEIRA",
    later: "DEPOIS",
    addStep: "Adicionar passo",
    addStepPlaceholder: "ex: Confirmar reserva",
    addBtn: "Adicionar",
    talkToLuma: "Falar com Luma sobre este evento",
    completedCount: (done, total) => `${done} de ${total} prontos`,
    inXMinutes: "Começa em 20 minutos",
    inXDays: (days) => days === 0 ? "Hoje" : days === 1 ? "1 dia para preparar" : `${days} dias para preparar`,
    inXWeeks: (weeks) => `${weeks} semanas para preparar`,
    inXMonths: (months) => `Em ${months} meses`,
  },
  tr: {
    whatsAhead: "ÖNÜMÜZDEKİ",
    lumaThought: "LUMA'NIN DÜŞÜNCESİ",
    yourPreparation: "HAZIRLIĞINIZ",
    doThisNow: "ŞİMDİ YAPIN",
    doThisToday: "BUGÜN YAPIN",
    doThisFirst: "ÖNCE BUNU YAPIN",
    later: "SONRA",
    addStep: "Adım ekle",
    addStepPlaceholder: "örn. Rezervasyonu onayla",
    addBtn: "Ekle",
    talkToLuma: "Luma ile bu anı konuşun",
    completedCount: (done, total) => `${done} / ${total} hazır`,
    inXMinutes: "20 dakika içinde başlıyor",
    inXDays: (days) => days === 0 ? "Bugün" : days === 1 ? "Hazırlık için 1 gün" : `Hazırlık için ${days} gün`,
    inXWeeks: (weeks) => `Hazırlık için ${weeks} hafta`,
    inXMonths: (months) => `${months} ay sonra`,
  },
  zh: {
    whatsAhead: "前瞻概览",
    lumaThought: "LUMA 洞察",
    yourPreparation: "筹备清单",
    doThisNow: "当下的行动",
    doThisToday: "今日聚焦",
    doThisFirst: "优先事项",
    later: "后续步骤",
    addStep: "添加步骤",
    addStepPlaceholder: "例如：确认预订",
    addBtn: "添加",
    talkToLuma: "与 Luma 倾心讨论此事件",
    completedCount: (done, total) => `已准备 ${done} / ${total}`,
    inXMinutes: "20 分钟后开始",
    inXDays: (days) => days === 0 ? "今天" : days === 1 ? "1 天筹备时间" : `${days} 天筹备时间`,
    inXWeeks: (weeks) => `${weeks} 周筹备时间`,
    inXMonths: (months) => `${months} 个月后`,
  },
  de: {
    whatsAhead: "WAS ANSTEHT",
    lumaThought: "LUMAS GEDANKE",
    yourPreparation: "IHRE VORBEREITUNG",
    doThisNow: "JETZT ERLEDIGEN",
    doThisToday: "HEUTE ERLEDIGEN",
    doThisFirst: "ZUERST ERLEDIGEN",
    later: "SPÄTER",
    addStep: "Schritt hinzufügen",
    addStepPlaceholder: "z.B. Buchung bestätigen",
    addBtn: "Hinzufügen",
    talkToLuma: "Mit Luma über diesen Moment sprechen",
    completedCount: (done, total) => `${done} von ${total} vorbereitet`,
    inXMinutes: "Startet in 20 Minuten",
    inXDays: (days) => days === 0 ? "Heute" : days === 1 ? "1 Tag zur Vorbereitung" : `${days} Tage zur Vorbereitung`,
    inXWeeks: (weeks) => `${weeks} Wochen zur Vorbereitung`,
    inXMonths: (months) => `In ${months} Monaten`,
  },
};

export const EventPreparationWorkspace: React.FC<EventPreparationWorkspaceProps> = ({
  moment,
  language,
  onToggleStepDone,
  onAddStep,
  onOpenTalk,
  className = '',
}) => {
  const [newStepText, setNewStepText] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const p = LOCALIZED_PREP_STRINGS[language] || LOCALIZED_PREP_STRINGS.en;

  const daysLeft = getCalculatedDaysLeft(moment);
  const steps = moment.gentleSteps || [];
  const completedSteps = steps.filter((s) => s.done);
  const isImminent = daysLeft <= 0 || (moment.title && (moment.title.toLowerCase().includes('20 min') || moment.title.toLowerCase().includes('20 минут')));

  // Format intelligent timing label
  const getTimingBadgeText = (): string => {
    if (isImminent) {
      return p.inXMinutes;
    }
    if (daysLeft <= 14) {
      return p.inXDays(daysLeft);
    }
    if (daysLeft <= 45) {
      const weeks = Math.round(daysLeft / 7);
      return p.inXWeeks(weeks || 2);
    }
    const months = Math.round(daysLeft / 30);
    return p.inXMonths(months || 2);
  };

  // Identify primary next action vs remaining steps
  const primaryStep = steps.find((s) => !s.done) || steps[0];
  const secondarySteps = steps.filter((s) => s.id !== primaryStep?.id);

  // Dynamic header label for primary action
  const getPrimaryActionLabel = (): string => {
    if (isImminent) return p.doThisNow;
    if (daysLeft <= 3) return p.doThisToday;
    return p.doThisFirst;
  };

  const handleCreateStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepText.trim() || !onAddStep) return;
    const newStep: GentleStep = {
      id: `s_custom_${Date.now()}`,
      text: newStepText.trim(),
      when: 'Today',
      done: false,
    };
    onAddStep(moment.id, newStep);
    setNewStepText('');
    setShowAddInput(false);
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* 1. WHAT'S AHEAD */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-widest uppercase font-semibold text-[#6B6258]">
            {p.whatsAhead}
          </span>
          <span className="text-[11px] font-medium text-[#5C6B52] px-3 py-1 rounded-full bg-[#5C6B52]/10 border border-[#5C6B52]/20">
            {getTimingBadgeText()}
          </span>
        </div>

        <div className="space-y-1.5">
          <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#2C2723] leading-tight break-words">
            {moment.title}
          </h2>
          <div className="flex flex-wrap items-center gap-2 text-xs sm:text-sm text-[#6B6258] font-medium">
            <span>{getLocalizedDateLabel(moment, language)}</span>
            {moment.timeOfDay && (
              <>
                <span>·</span>
                <span className="font-mono text-[#2C2723]">
                  {formatTimeWithTimezone(moment.timeOfDay, moment.timezone, language)}
                </span>
              </>
            )}
          </div>
        </div>

        {/* Purpose or context details if provided */}
        {(moment.purpose || moment.notes) && (
          <p className="text-xs text-[#6B6258] leading-relaxed bg-[#FAF7F2] p-3.5 rounded-2xl border border-[#E5DFD4]/80">
            {moment.purpose || moment.notes}
          </p>
        )}
      </div>

      {/* 2. LUMA'S THOUGHT (Visually distinct insight, NOT a task card or checkbox) */}
      <div className="p-4 sm:p-5 rounded-2xl bg-[#FAF7F2] border border-[#E5DFD4] space-y-2 relative overflow-hidden">
        <div className="flex items-center gap-2 text-[#5C6B52] text-[10px] sm:text-[11px] font-serif font-semibold tracking-wider uppercase">
          <LumaLeafIcon className="w-3.5 h-3.5 text-[#5C6B52]" strokeWidth={1.5} />
          <span>{p.lumaThought}</span>
        </div>
        <p className="text-[#2C2723]/95 leading-relaxed font-serif text-xs sm:text-sm italic pl-3 border-l-2 border-[#5C6B52]/40">
          "{moment.reassuranceNote || t.defaultReassurance}"
        </p>
      </div>

      {/* 3. YOUR PREPARATION */}
      <div className="space-y-4 pt-1 border-t border-[#E5DFD4]/60">
        <div className="flex items-center justify-between">
          <span className="text-[10px] tracking-widest uppercase font-semibold text-[#6B6258]">
            {p.yourPreparation}
          </span>
          <span className="text-xs font-medium text-[#5C6B52]">
            {p.completedCount(completedSteps.length, steps.length)}
          </span>
        </div>

        {/* PRIMARY PRIORITIZED ACTION */}
        {primaryStep && (
          <div className="space-y-1.5">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#C29E65] px-1">
              {getPrimaryActionLabel()}
            </div>
            <div
              onClick={() => onToggleStepDone(moment.id, primaryStep.id)}
              className={`p-4 sm:p-5 rounded-2xl border transition flex items-center justify-between cursor-pointer select-none group ${
                primaryStep.done
                  ? 'bg-[#FAF7F2] border-[#E5DFD4] text-[#6B6258]'
                  : 'bg-[#2C2723] text-white border-[#2C2723] shadow-xs hover:bg-[#3D3732]'
              }`}
            >
              <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                <div
                  className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition ${
                    primaryStep.done
                      ? 'bg-[#5C6B52] border-[#5C6B52] text-white'
                      : 'border-white/50 group-hover:border-white text-transparent'
                  }`}
                >
                  <LumaCheckIcon className="w-3.5 h-3.5" />
                </div>
                <span
                  className={`text-xs sm:text-sm font-medium leading-snug break-words flex-1 ${
                    primaryStep.done ? 'line-through opacity-70' : 'text-white'
                  }`}
                >
                  {primaryStep.text}
                </span>
              </div>

              <span
                className={`text-[10px] font-mono px-2.5 py-1 rounded-full shrink-0 ${
                  primaryStep.done
                    ? 'bg-[#E5DFD4]/50 text-[#6B6258]'
                    : 'bg-white/15 text-white/90'
                }`}
              >
                {primaryStep.when}
              </span>
            </div>
          </div>
        )}

        {/* SECONDARY REMAINING STEPS (LATER) */}
        {secondarySteps.length > 0 && (
          <div className="space-y-2 pt-2">
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#6B6258] px-1">
              {p.later}
            </div>

            <div className="space-y-2">
              {secondarySteps.map((step) => (
                <div
                  key={step.id}
                  onClick={() => onToggleStepDone(moment.id, step.id)}
                  className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer select-none ${
                    step.done
                      ? 'bg-[#FAF7F2]/60 border-[#E5DFD4] text-[#6B6258]'
                      : 'bg-white border-[#E5DFD4] text-[#2C2723] hover:border-[#5C6B52]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0 flex-1 pr-2">
                    <div
                      className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition ${
                        step.done
                          ? 'bg-[#5C6B52] border-[#5C6B52] text-white'
                          : 'border-[#7D756C]'
                      }`}
                    >
                      {step.done && <LumaCheckIcon className="w-3 h-3" />}
                    </div>
                    <span
                      className={`text-xs font-medium leading-relaxed break-words flex-1 ${
                        step.done ? 'line-through text-[#6B6258]' : 'text-[#2C2723]'
                      }`}
                    >
                      {step.text}
                    </span>
                  </div>

                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#6B6258] shrink-0 border border-[#E5DFD4]/60">
                    {step.when}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ADD STEP FUNCTIONALITY */}
        <div className="pt-1">
          {showAddInput ? (
            <form onSubmit={handleCreateStep} className="flex gap-2">
              <input
                type="text"
                value={newStepText}
                onChange={(e) => setNewStepText(e.target.value)}
                placeholder={p.addStepPlaceholder}
                className="flex-1 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DFD4] text-xs font-medium text-[#2C2723] focus:outline-none focus:border-[#5C6B52]"
                autoFocus
              />
              <button
                type="submit"
                className="px-4 py-2.5 rounded-xl bg-[#2C2723] text-white text-xs font-medium hover:bg-[#3D3732] cursor-pointer shrink-0"
              >
                {p.addBtn}
              </button>
            </form>
          ) : (
            <button
              onClick={() => setShowAddInput(true)}
              className="text-xs text-[#5C6B52] font-semibold hover:underline cursor-pointer flex items-center gap-1 py-1"
            >
              <LumaPlusIcon className="w-3.5 h-3.5" />
              <span>{p.addStep}</span>
            </button>
          )}
        </div>
      </div>

      {/* TALK TO LUMA LINK */}
      {onOpenTalk && (
        <div className="pt-2">
          <button
            onClick={onOpenTalk}
            className="w-full py-3 px-5 rounded-2xl bg-[#FAF7F2] border border-[#E5DFD4] hover:bg-[#E5DFD4]/40 text-[#5C6B52] hover:text-[#2C2723] text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2"
          >
            <LumaVoiceIcon className="w-4 h-4 text-[#5C6B52]" />
            <span>{p.talkToLuma}</span>
          </button>
        </div>
      )}
    </div>
  );
};
