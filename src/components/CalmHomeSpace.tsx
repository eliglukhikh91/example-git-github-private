import React from 'react';
import { LifeMoment } from '../types';
import { LanguageCode, TRANSLATIONS } from '../data/translations';
import { getGreetingForTime } from '../utils/greetingUtils';
import { LumaHeaderBar } from './LumaHeaderBar';
import { getLocalizedDateLabel, getLocalizedDaysAhead } from '../utils/momentUtils';
import { formatTimeWithTimezone } from '../utils/timezoneUtils';
import {
  LumaCheckIcon,
  LumaVoiceIcon,
  LumaArrowRightIcon,
} from './icons/LumaIcons';

interface CalmHomeSpaceProps {
  language: LanguageCode;
  userName?: string;
  moments: LifeMoment[];
  onOpenTalk: () => void;
  onOpenMoments: () => void;
  onToggleStepDone: (momentId: string, stepId: string) => void;
  onAddNewMoment: (moment: LifeMoment | string) => void;
  onSelectMoment?: (moment: LifeMoment) => void;
  onOpenCreateModal?: () => void;
}

const LOCALIZED_HOME_STRINGS: Record<LanguageCode, {
  createFirstMoment: string;
  createFirstDesc: string;
  createBtn: string;
  orTellLuma: string;
  nextUp: string;
  talkToLumaBtn: string;
  momentDetails: string;
  needGuidance: string;
  askLuma: string;
  allMomentsLink: string;
}> = {
  en: {
    createFirstMoment: 'CREATE YOUR FIRST IMPORTANT MOMENT',
    createFirstDesc: "Tell Luma what's coming up — a trip, an interview, an appointment, a big meeting, or anything you want to feel prepared for.",
    createBtn: 'Create a Moment',
    orTellLuma: 'Or simply tell Luma in Talk',
    nextUp: 'NEXT UP',
    talkToLumaBtn: 'Talk to Luma',
    momentDetails: 'Moment details',
    needGuidance: 'Need guidance on this step?',
    askLuma: 'Ask Luma ›',
    allMomentsLink: 'View all Moments →',
  },
  ru: {
    createFirstMoment: 'СОЗДАЙТЕ СВОЁ ПЕРВОЕ СОБЫТИЕ',
    createFirstDesc: 'Расскажите Luma, что вас ждет впереди — поездка, собеседование, важная встреча или визит к врачу.',
    createBtn: 'Создать событие',
    orTellLuma: 'Или просто расскажите Luma в Диалоге',
    nextUp: 'СЛЕДУЮЩИЙ ШАГ',
    talkToLumaBtn: 'Обсудить с Luma',
    momentDetails: 'Детали события',
    needGuidance: 'Хотите обсудить шаг с Luma?',
    askLuma: 'Спросить Luma ›',
    allMomentsLink: 'Все события →',
  },
  es: {
    createFirstMoment: 'CREA TU PRIMER MOMENTO IMPORTANTE',
    createFirstDesc: 'Dile a Luma lo que se avecina: un viaje, una entrevista, una cita médica, una gran reunión o cualquier cosa para la que quieras prepararte.',
    createBtn: 'Crear un Momento',
    orTellLuma: 'O simplemente díselo a Luma en Hablar',
    nextUp: 'SIGUIENTE PASO',
    talkToLumaBtn: 'Hablar con Luma',
    momentDetails: 'Detalles del momento',
    needGuidance: '¿Necesitas orientación sobre este paso?',
    askLuma: 'Preguntar a Luma ›',
    allMomentsLink: 'Ver todos los Momentos →',
  },
  fr: {
    createFirstMoment: 'CRÉEZ VOTRE PREMIER MOMENT IMPORTANT',
    createFirstDesc: "Dites à Luma ce qui s'en vient : un voyage, un entretien, un rendez-vous, une grande réunion ou tout ce pour quoi vous voulez vous préparer.",
    createBtn: 'Créer un Moment',
    orTellLuma: 'Ou simplement le dire à Luma dans Discuter',
    nextUp: 'ÉTAPE SUIVANTE',
    talkToLumaBtn: 'Parler à Luma',
    momentDetails: 'Détails du moment',
    needGuidance: 'Besoin de conseils sur cette étape ?',
    askLuma: 'Demander à Luma ›',
    allMomentsLink: 'Voir tous les Moments →',
  },
  it: {
    createFirstMoment: 'CREA IL TUO PRIMO MOMENTO IMPORTANTE',
    createFirstDesc: "Dì a Luma cosa sta arrivando: un viaggio, un colloquio, un appuntamento, una riunione importante o qualsiasi cosa per cui desideri prepararti.",
    createBtn: 'Crea un Momento',
    orTellLuma: 'O semplicemente dillo a Luma in Parla',
    nextUp: 'PROSSIMO PASSO',
    talkToLumaBtn: 'Parla con Luma',
    momentDetails: 'Dettagli del momento',
    needGuidance: 'Hai bisogno di indicazioni su questo passaggio?',
    askLuma: 'Chiedi a Luma ›',
    allMomentsLink: 'Visualizza tutti i Momenti →',
  },
  pt: {
    createFirstMoment: 'CRIE SEU PRIMEIRO MOMENTO IMPORTANTE',
    createFirstDesc: 'Diga ao Luma o que está por vir: uma viagem, uma entrevista, uma consulta, uma grande reunião ou qualquer coisa para a qual você queira se preparar.',
    createBtn: 'Criar um Momento',
    orTellLuma: 'Ou simplesmente diga ao Luma em Falar',
    nextUp: 'PRÓXIMO PASSO',
    talkToLumaBtn: 'Falar com Luma',
    momentDetails: 'Detalhes do momento',
    needGuidance: 'Precisa de orientação sobre este passo?',
    askLuma: 'Perguntar ao Luma ›',
    allMomentsLink: 'Ver todos os Momentos →',
  },
  tr: {
    createFirstMoment: 'İLK ÖNEMLİ ANINIZI OLUŞTURUN',
    createFirstDesc: 'Luma\'ya neyin yaklaştığını söyleyin - bir seyahat, bir mülakat, bir randevu, büyük bir toplantı veya kendinizi hazır hissetmek istediğiniz herhangi bir şey.',
    createBtn: 'Bir An Oluştur',
    orTellLuma: 'Ya da sadece Luma\'ya Konuş ekranında söyleyin',
    nextUp: 'SIRADAKİ ADIM',
    talkToLumaBtn: 'Luma ile Konuş',
    momentDetails: 'Anın detayları',
    needGuidance: 'Bu adımda rehberliğe mi ihtiyacınız var?',
    askLuma: 'Luma\'ya Sor ›',
    allMomentsLink: 'Tüm Anları Görüntüle →',
  },
  zh: {
    createFirstMoment: '创建您的第一个重要时刻',
    createFirstDesc: '告诉 Luma 即将发生的事情——旅行、面试、约会、重要会议，或者任何您想为此做好准备的事情。',
    createBtn: '创建时刻',
    orTellLuma: '或者直接在「对话」中告诉 Luma',
    nextUp: '下一步',
    talkToLumaBtn: '与 Luma 对话',
    momentDetails: '时刻详情',
    needGuidance: '在此步骤中需要指导吗？',
    askLuma: '询问 Luma ›',
    allMomentsLink: '查看所有时刻 →',
  },
  de: {
    createFirstMoment: 'ERSTELLEN SIE IHREN ERSTEN WICHTIGEN MOMENT',
    createFirstDesc: 'Erzählen Sie Luma, was ansteht – eine Reise, ein Vorstellungsgespräch, ein Arztbesuch, ein wichtiges Treffen oder irgendetwas, auf das Sie sich vorbereiten möchten.',
    createBtn: 'Moment erstellen',
    orTellLuma: 'Oder sagen Sie es einfach Luma im Dialog',
    nextUp: 'NÄCHSTER SCHRITT',
    talkToLumaBtn: 'Mit Luma sprechen',
    momentDetails: 'Details zum Moment',
    needGuidance: 'Benötigen Sie Hilfe bei diesem Schritt?',
    askLuma: 'Luma fragen ›',
    allMomentsLink: 'Alle Momente anzeigen →',
  },
};

export const CalmHomeSpace: React.FC<CalmHomeSpaceProps> = ({
  language,
  userName = 'Guest',
  moments,
  onOpenTalk,
  onOpenMoments,
  onToggleStepDone,
  onSelectMoment,
  onOpenCreateModal,
}) => {
  const nextMoment = moments[0]; // Primary focused upcoming moment
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const h = LOCALIZED_HOME_STRINGS[language] || LOCALIZED_HOME_STRINGS.en;

  const [currentHour, setCurrentHour] = React.useState(() => new Date().getHours());

  React.useEffect(() => {
    const interval = setInterval(() => {
      setCurrentHour(new Date().getHours());
    }, 60000);
    return () => clearInterval(interval);
  }, []);

  const getGreeting = () => {
    return getGreetingForTime(userName, language, currentHour);
  };

  const primaryTask = nextMoment
    ? nextMoment.gentleSteps.find((s) => !s.done) || nextMoment.gentleSteps[0]
    : null;

  return (
    <div className="relative space-y-10 pb-28 max-w-3xl mx-auto text-[#2C2723] animate-fade-in pt-4 px-3 sm:px-6">
      {/* Mobile-only Luma Header bar */}
      <div className="md:hidden">
        <LumaHeaderBar language={language} />
      </div>

      {/* 1. GREETING */}
      <div className="pt-2 pb-2 space-y-2 text-center md:text-left">
        <h1 className="font-serif text-3xl md:text-5xl font-normal text-[#2C2723] tracking-tight leading-tight break-words">
          {getGreeting()}
        </h1>
        <p className="text-sm md:text-base text-[#6B6258] max-w-lg leading-relaxed">
          {t.oneThingToTakeCareToday || "You have one thing to take care of today."}
        </p>
      </div>

      {/* NO MOMENTS STATE */}
      {!nextMoment ? (
        <div className="py-12 px-6 sm:px-12 rounded-[32px] bg-white border border-[#E5DFD4] text-center space-y-6 shadow-3xs max-w-xl mx-auto mt-8 animate-fade-in">
          <div className="space-y-3">
            <h2 className="font-serif text-xs tracking-widest text-[#5C6B52] font-semibold uppercase">
              {h.createFirstMoment}
            </h2>
            <p className="font-serif text-xl sm:text-2xl text-[#2C2723] leading-snug break-words">
              {h.createFirstDesc}
            </p>
          </div>
          
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenCreateModal}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#2C2723] hover:bg-[#3D3732] text-white text-xs font-semibold cursor-pointer transition shadow-xs"
            >
              {h.createBtn}
            </button>
            <button
              onClick={onOpenTalk}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#FAF7F2] border border-[#E5DFD4] hover:bg-[#FAF7F2]/80 text-[#6B6258] hover:text-[#2C2723] text-xs font-semibold cursor-pointer transition"
            >
              {h.orTellLuma}
            </button>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          
          {/* 2. YOUR NEXT MOMENT — DOMINANT FEATURE AREA */}
          <div className="space-y-3">
            <div className="uppercase text-[11px] tracking-widest font-semibold text-[#6B6258] px-1">
              {t.yourNextMoment || "YOUR NEXT MOMENT"}
            </div>
 
            <div className="p-6 sm:p-10 rounded-[36px] bg-white border border-[#E5DFD4] shadow-xs space-y-6 relative overflow-hidden">
              
              {/* Header Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] tracking-widest uppercase font-semibold text-[#6B6258]">
                    {t.whatsAhead || "WHAT'S AHEAD"}
                  </span>
                  <span className="text-[11px] font-medium text-[#5C6B52] px-3 py-1 rounded-full bg-[#5C6B52]/10 border border-[#5C6B52]/20">
                    {getLocalizedDaysAhead(nextMoment, language)}
                  </span>
                </div>
                
                <h2 className="font-serif text-2xl sm:text-4xl font-normal text-[#2C2723] leading-tight break-words pt-1">
                  {nextMoment.title}
                </h2>
 
                <p className="text-xs sm:text-sm text-[#6B6258] font-medium">
                  {getLocalizedDateLabel(nextMoment, language)}
                  {nextMoment.timeOfDay && (
                    <>
                      <span className="mx-1.5">·</span>
                      <span className="font-mono text-[#2C2723]">
                        {formatTimeWithTimezone(nextMoment.timeOfDay, nextMoment.timezone, language)}
                      </span>
                    </>
                  )}
                </p>
              </div>
 
              {/* LUMA'S THOUGHT */}
              <div className="p-5 sm:p-6 rounded-2xl bg-[#FAF7F2] border border-[#E5DFD4] space-y-2 text-left">
                <div className="flex items-center gap-2 text-[#5C6B52] text-[11px] font-serif font-semibold tracking-wider uppercase">
                  <span className="w-1.5 h-1.5 rounded-full bg-[#5C6B52]" />
                  {t.lumaThought || "LUMA'S THOUGHT"}
                </div>
                <p className="text-[#2C2723]/90 text-sm sm:text-base leading-relaxed font-serif italic pl-3 border-l-2 border-[#5C6B52]/40">
                  "{nextMoment.reassuranceNote || t.defaultReassurance}"
                </p>
              </div>
 
              {/* YOUR PREPARATION — NEXT ACTION */}
              {primaryTask && (
                <div className="space-y-2">
                  <div className="text-[10px] tracking-widest uppercase font-semibold text-[#C29E65] px-1">
                    {nextMoment.daysLeft <= 0 ? "DO THIS NOW" : nextMoment.daysLeft <= 3 ? "DO THIS TODAY" : "DO THIS FIRST"}
                  </div>
                  <div
                    onClick={() => onToggleStepDone(nextMoment.id, primaryTask.id)}
                    className={`p-5 rounded-2xl border transition flex items-center justify-between cursor-pointer select-none ${
                      primaryTask.done
                        ? 'bg-[#FAF7F2] border-[#E5DFD4] text-[#6B6258]'
                        : 'bg-[#2C2723] text-white border-[#2C2723] shadow-xs hover:bg-[#3D3732]'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1 pr-3">
                      <div
                        className={`w-6 h-6 rounded-full border flex items-center justify-center shrink-0 transition ${
                          primaryTask.done
                            ? 'bg-[#5C6B52] border-[#5C6B52] text-white'
                            : 'border-white/50 text-transparent'
                        }`}
                      >
                        <LumaCheckIcon className="w-3.5 h-3.5" />
                      </div>
                      <span
                        className={`text-xs sm:text-sm font-medium leading-snug break-words flex-1 ${
                          primaryTask.done ? 'line-through opacity-70' : 'text-white'
                        }`}
                      >
                        {primaryTask.text}
                      </span>
                    </div>

                    <span
                      className={`text-[10px] font-mono px-2.5 py-1 rounded-full shrink-0 ${
                        primaryTask.done
                          ? 'bg-[#E5DFD4]/50 text-[#6B6258]'
                          : 'bg-white/15 text-white/90'
                      }`}
                    >
                      {primaryTask.when}
                    </span>
                  </div>
                </div>
              )}
 
              {/* Talk to Luma CTA */}
              <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
                <button
                  onClick={() => {
                    if (onSelectMoment) {
                      onSelectMoment(nextMoment);
                    }
                    onOpenTalk();
                  }}
                  className="w-full sm:w-auto py-3.5 px-6 rounded-2xl bg-[#5C6B52] hover:bg-[#4D5A44] active:scale-[0.99] text-white text-xs sm:text-sm font-medium transition cursor-pointer flex items-center justify-center gap-2.5 shadow-xs"
                >
                  <LumaVoiceIcon className="w-4 h-4" />
                  <span>{h.talkToLumaBtn}</span>
                </button>
 
                <button
                  onClick={() => {
                    if (onSelectMoment) {
                      onSelectMoment(nextMoment);
                    }
                    onOpenMoments();
                  }}
                  className="text-xs font-medium text-[#6B6258] hover:text-[#2C2723] transition cursor-pointer flex items-center gap-1"
                >
                  <span>{h.momentDetails}</span>
                  <LumaArrowRightIcon className="w-3.5 h-3.5" />
                </button>
              </div>
 
            </div>
          </div>
 
          {/* 3. JUST ONE THING FOR TODAY */}
          {primaryTask && (
            <div className="space-y-3 pt-2">
              <div className="uppercase text-[11px] tracking-widest font-semibold text-[#6B6258] px-1">
                {t.justOneThingForToday || "JUST ONE THING FOR TODAY"}
              </div>
 
              <div className="p-6 sm:p-7 rounded-[28px] bg-white border border-[#E5DFD4] shadow-3xs space-y-4">
                <div className="flex items-start gap-4">
                  <button
                    onClick={() => onToggleStepDone(nextMoment.id, primaryTask.id)}
                    className={`mt-0.5 w-6 h-6 rounded-full border border-[#5C6B52] flex items-center justify-center transition cursor-pointer shrink-0 ${
                      primaryTask.done ? 'bg-[#5C6B52] text-white' : 'hover:bg-[#5C6B52]/10'
                    }`}
                    title={primaryTask.done ? 'Mark as incomplete' : 'Mark as complete'}
                  >
                    {primaryTask.done && <LumaCheckIcon className="w-3.5 h-3.5" />}
                  </button>
 
                  <div className="space-y-1 min-w-0 flex-1">
                    <p className={`text-base sm:text-lg font-medium leading-snug break-words ${
                      primaryTask.done ? 'line-through text-[#6B6258]' : 'text-[#2C2723]'
                    }`}>
                      {primaryTask.text}
                    </p>
                    <div className="flex items-center gap-2 text-xs text-[#6B6258]">
                      <span className="font-mono">{primaryTask.when}</span>
                      <span>·</span>
                      <span className="font-serif italic">{nextMoment.title}</span>
                    </div>
                  </div>
                </div>
 
                <div className="pt-3 border-t border-[#FAF7F2] flex items-center justify-between text-xs">
                  <span className="text-[#6B6258]">
                    {h.needGuidance}
                  </span>
                  <button
                    onClick={onOpenTalk}
                    className="text-[#5C6B52] font-semibold hover:underline flex items-center gap-1 cursor-pointer"
                  >
                    <LumaVoiceIcon className="w-3.5 h-3.5" />
                    <span>{h.askLuma}</span>
                  </button>
                </div>
              </div>
            </div>
          )}
 
          {/* 4. SUBTLE NAVIGATION LINK TO ALL MOMENTS */}
          <div className="pt-8 text-center border-t border-[#E5DFD4]/60">
            <button
              onClick={onOpenMoments}
              className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-[#FAF7F2] border border-[#E5DFD4] text-[#5C6B52] font-medium text-xs sm:text-sm hover:bg-[#E5DFD4]/50 hover:text-[#2C2723] transition cursor-pointer shadow-3xs"
            >
              <span>{h.allMomentsLink}</span>
            </button>
          </div>

        </div>
      )}
    </div>
  );
};

