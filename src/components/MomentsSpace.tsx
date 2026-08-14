import React, { useState, useMemo } from 'react';
import { LifeMoment, GentleStep } from '../types';
import { LanguageCode, TRANSLATIONS } from '../data/translations';
import { LumaHeaderBar } from './LumaHeaderBar';
import { getLocalizedDaysAhead, getLocalizedDateLabel } from '../utils/momentUtils';
import { formatTimeWithTimezone } from '../utils/timezoneUtils';
import {
  LumaCompassIcon,
  LumaHorizonIcon,
  LumaCaringIcon,
  LumaPlusIcon,
  LumaCheckIcon,
  LumaVoiceIcon,
  LumaSproutIcon,
} from './icons/LumaIcons';

const MONTH_NAMES: Record<LanguageCode, string[]> = {
  en: ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE', 'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'],
  ru: ['ЯНВАРЬ', 'ФЕВРАЛЬ', 'МАРТ', 'АПРЕЛЬ', 'МАЙ', 'ИЮНЬ', 'ИЮЛЬ', 'АВГУСТ', 'СЕНТЯБРЬ', 'ОКТЯБРЬ', 'НОЯБРЬ', 'ДЕКАБРЬ'],
  es: ['ENERO', 'FEBRERO', 'MARZO', 'ABRIL', 'MAYO', 'JUNIO', 'JULIO', 'AGOSTO', 'SEPTIEMBRE', 'OCTUBRE', 'NOVIEMBRE', 'DICIEMBRE'],
  fr: ['JANVIER', 'FÉVRIER', 'MARS', 'AVRIL', 'MAI', 'JUIN', 'JUILLET', 'AOÛT', 'SEPTEMBRE', 'OCTOBRE', 'NOVEMBRE', 'DÉCEMBRE'],
  it: ['GENNAIO', 'FEBBRAIO', 'MARZO', 'APRILE', 'MAGGIO', 'GIUGNO', 'LUGLIO', 'AGOSTO', 'SETTEMBRE', 'OTTOBRE', 'NOVEMBRE', 'DICEMBRE'],
  pt: ['JANEIRO', 'FEVEREIRO', 'MARÇO', 'ABRIL', 'MAIO', 'JUNHO', 'JULHO', 'AGOSTO', 'SETEMBRO', 'OUTUBRO', 'NOVEMBRO', 'DEZEMBRO'],
  tr: ['OCAK', 'ŞUBAT', 'MART', 'NİSAN', 'MAYIS', 'HAZİRAN', 'TEMMUZ', 'AĞUSTOS', 'EYLÜL', 'EKİM', 'KASIM', 'ARALIK'],
  zh: ['一月', '二月', '三月', '四月', '五月', '六月', '七月', '八月', '九月', '十月', '十一月', '十二月'],
  de: ['JANUAR', 'FEBRUAR', 'MÄRZ', 'APRIL', 'MAI', 'JUNI', 'JULI', 'AUGUST', 'SEPTEMBER', 'OKTOBER', 'NOVEMBER', 'DEZEMBER']
};

const SHORT_MONTH_NAMES: Record<LanguageCode, string[]> = {
  en: ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN', 'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'],
  ru: ['ЯНВ', 'ФЕВ', 'МАР', 'АПР', 'МАЙ', 'ИЮН', 'ИЮЛ', 'АВГ', 'СЕН', 'ОКТ', 'НОЯ', 'ДЕК'],
  es: ['ENE', 'FEB', 'MAR', 'ABR', 'MAY', 'JUN', 'JUL', 'AGO', 'SEP', 'OCT', 'NOV', 'DIC'],
  fr: ['JANV', 'FÉVR', 'MARS', 'AVR', 'MAI', 'JUIN', 'JUIL', 'AOÛT', 'SEPT', 'OCT', 'NOV', 'DÉC'],
  it: ['GEN', 'FEB', 'MAR', 'APR', 'MAG', 'GIU', 'LUG', 'AGO', 'SET', 'OTT', 'NOV', 'DIC'],
  pt: ['JAN', 'FEV', 'MAR', 'ABR', 'MAI', 'JUN', 'JUL', 'AGO', 'SET', 'OUT', 'NOV', 'DEZ'],
  tr: ['OCA', 'ŞUB', 'MAR', 'NİS', 'MAY', 'HAZ', 'TEM', 'AĞU', 'EYL', 'EKİ', 'KAS', 'ARA'],
  zh: ['1月', '2月', '3月', '4月', '5月', '6月', '7月', '8月', '9月', '10月', '11月', '12月'],
  de: ['JAN', 'FEB', 'MÄR', 'APR', 'MAI', 'JUN', 'JUL', 'AUG', 'SEP', 'OKT', 'NOV', 'DEZ']
};

const WEEKDAYS: Record<LanguageCode, string[]> = {
  en: ['M', 'T', 'W', 'T', 'F', 'S', 'S'],
  ru: ['ПН', 'ВТ', 'СР', 'ЧТ', 'ПТ', 'СБ', 'ВС'],
  es: ['L', 'M', 'X', 'J', 'V', 'S', 'D'],
  fr: ['L', 'M', 'M', 'J', 'V', 'S', 'D'],
  it: ['L', 'M', 'M', 'G', 'V', 'S', 'D'],
  pt: ['S', 'T', 'Q', 'Q', 'S', 'S', 'D'],
  tr: ['P', 'S', 'Ç', 'P', 'C', 'C', 'P'],
  zh: ['一', '二', '三', '四', '五', '六', '日'],
  de: ['M', 'D', 'M', 'D', 'F', 'S', 'S']
};

const LOCALIZED_SPACE_STRINGS: Record<LanguageCode, {
  yourMoments: string;
  activeCount: (count: number) => string;
  newMoment: string;
  momentsHeader: string;
  lifePrepared: string;
  appearHere: string;
  createFirst: string;
  orTalk: string;
  nextMoment: string;
  selectedMoment: string;
  whatsReady: string;
  ofPrepared: (done: number, total: number) => string;
  nextUp: string;
  preparationSteps: string;
  addStep: string;
  addStepPlaceholder: string;
  addBtn: string;
  discussBtn: string;
  calendarHeader: string;
  prevMonth: string;
  nextMonth: string;
  upcomingTimeline: string;
}> = {
  en: {
    yourMoments: 'Moments',
    activeCount: (count) => `${count} active ${count === 1 ? 'moment' : 'moments'}`,
    newMoment: 'New moment',
    momentsHeader: 'MOMENTS',
    lifePrepared: 'YOUR LIFE, A LITTLE MORE PREPARED.',
    appearHere: 'Your Moments will appear here as you add them.',
    createFirst: 'Create your first Moment',
    orTalk: 'Or simply talk to Luma',
    nextMoment: 'YOUR NEXT MOMENT',
    selectedMoment: 'SELECTED MOMENT',
    whatsReady: "WHAT'S READY",
    ofPrepared: (done, total) => `${done} of ${total} prepared`,
    nextUp: 'NEXT UP',
    preparationSteps: 'GENTLE STEPS',
    addStep: 'Add step',
    addStepPlaceholder: 'e.g. Confirm hotel reservation',
    addBtn: 'Add',
    discussBtn: 'Talk to Luma',
    calendarHeader: 'MOMENTS AHEAD',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    upcomingTimeline: 'UPCOMING TIMELINE'
  },
  ru: {
    yourMoments: 'Ваши события',
    activeCount: (count) => `${count} ${count === 1 ? 'активное событие' : 'активных событий'}`,
    newMoment: 'Новое событие',
    momentsHeader: 'СОБЫТИЯ',
    lifePrepared: 'ВАША ЖИЗНЬ, ЧУТЬ БОЛЕЕ ПОДГОТОВЛЕННАЯ.',
    appearHere: 'Ваши события появятся здесь, как только вы их добавите.',
    createFirst: 'Создать первое событие',
    orTalk: 'Поговорить с Luma',
    nextMoment: 'ВАШЕ СЛЕДУЮЩЕЕ СОБЫТИЕ',
    selectedMoment: 'ВЫБРАННОЕ СОБЫТИЕ',
    whatsReady: 'ГОТОВНОСТЬ',
    ofPrepared: (done, total) => `${done} из ${total} готово`,
    nextUp: 'СЛЕДУЮЩИЙ ШАГ',
    preparationSteps: 'ШАГИ ПОДГОТОВКИ',
    addStep: 'Добавить шаг',
    addStepPlaceholder: 'например: Подтвердить бронь отеля',
    addBtn: 'Добавить',
    discussBtn: 'Обсудить с Luma',
    calendarHeader: 'КАЛЕНДАРЬ СОБЫТИЙ',
    prevMonth: 'Предыдущий месяц',
    nextMonth: 'Следующий месяц',
    upcomingTimeline: 'ПРЕДСТОЯЩИЕ СОБЫТИЯ'
  },
  es: {
    yourMoments: 'Momentos',
    activeCount: (count) => `${count} ${count === 1 ? 'momento activo' : 'momentos activos'}`,
    newMoment: 'Nuevo momento',
    momentsHeader: 'MOMENTOS',
    lifePrepared: 'TU VIDA, UN POCO MÁS PREPARADA.',
    appearHere: 'Tus momentos aparecerán aquí a medida que los agregues.',
    createFirst: 'Crear primer momento',
    orTalk: 'O simplemente habla con Luma',
    nextMoment: 'TU PRÓXIMO MOMENTO',
    selectedMoment: 'MOMENTO SELECCIONADO',
    whatsReady: 'QUÉ ESTÁ LISTO',
    ofPrepared: (done, total) => `${done} de ${total} listos`,
    nextUp: 'SIGUIENTE PASO',
    preparationSteps: 'PASOS DE PREPARACIÓN',
    addStep: 'Añadir paso',
    addStepPlaceholder: 'ej. Confirmar reserva de hotel',
    addBtn: 'Añadir',
    discussBtn: 'Hablar con Luma',
    calendarHeader: 'MOMENTOS POR DELANTE',
    prevMonth: 'Mes anterior',
    nextMonth: 'Mes siguiente',
    upcomingTimeline: 'PRÓXIMOS EVENTOS'
  },
  fr: {
    yourMoments: 'Moments',
    activeCount: (count) => `${count} ${count === 1 ? 'moment actif' : 'moments actifs'}`,
    newMoment: 'Nouveau moment',
    momentsHeader: 'MOMENTS',
    lifePrepared: 'VOTRE VIE, UN PEU MIEUX PRÉPARÉE.',
    appearHere: 'Vos moments apparaîtront ici dès que vous les ajouterez.',
    createFirst: 'Créer votre premier moment',
    orTalk: 'Ou discutez simplement avec Luma',
    nextMoment: 'VOTRE PROCHAIN MOMENT',
    selectedMoment: 'MOMENT SÉLECTIONNÉ',
    whatsReady: 'CE QUI EST PRÊT',
    ofPrepared: (done, total) => `${done} sur ${total} prêts`,
    nextUp: 'SUIVANT',
    preparationSteps: 'ÉTAPES DE PRÉPARATION',
    addStep: 'Ajouter une étape',
    addStepPlaceholder: 'ex. Confirmer la réservation d\'hôtel',
    addBtn: 'Ajouter',
    discussBtn: 'Discuter avec Luma',
    calendarHeader: 'CALENDRIER',
    prevMonth: 'Mois précédent',
    nextMonth: 'Mois suivant',
    upcomingTimeline: 'ÉVÉNEMENTS À VENIR'
  },
  it: {
    yourMoments: 'Momenti',
    activeCount: (count) => `${count} ${count === 1 ? 'momento attivo' : 'momenti attivi'}`,
    newMoment: 'Nuovo momento',
    momentsHeader: 'MOMENTI',
    lifePrepared: 'LA TUA VITA, UN PO\' PIÙ PREPARATA.',
    appearHere: 'I tuoi momenti appariranno qui quando li aggiungerai.',
    createFirst: 'Crea il primo momento',
    orTalk: 'O parla semplicemente con Luma',
    nextMoment: 'IL TUO PROSSIMO MOMENTO',
    selectedMoment: 'MOMENTO SELEZIONATO',
    whatsReady: 'COSA È PRONTO',
    ofPrepared: (done, total) => `${done} di ${total} pronti`,
    nextUp: 'PROSSIMO PASSO',
    preparationSteps: 'PASSI DI PREPARAZIONE',
    addStep: 'Aggiungi passo',
    addStepPlaceholder: 'es. Conferma prenotazione hotel',
    addBtn: 'Aggiungi',
    discussBtn: 'Parla con Luma',
    calendarHeader: 'CALENDARIO EVENTI',
    prevMonth: 'Mese precedente',
    nextMonth: 'Mese successivo',
    upcomingTimeline: 'PROSSIMI EVENTI'
  },
  pt: {
    yourMoments: 'Momentos',
    activeCount: (count) => `${count} ${count === 1 ? 'momento ativo' : 'momentos ativos'}`,
    newMoment: 'Novo momento',
    momentsHeader: 'MOMENTOS',
    lifePrepared: 'SUA VIDA, UM POUCO MAIS PREPARADA.',
    appearHere: 'Seus momentos aparecerão aqui conforme você os adicionar.',
    createFirst: 'Criar seu primeiro momento',
    orTalk: 'Ou simplesmente fale com o Luma',
    nextMoment: 'SEU PRÓXIMO MOMENTO',
    selectedMoment: 'MOMENTO SELECIONADO',
    whatsReady: 'O QUE ESTÁ PRONTO',
    ofPrepared: (done, total) => `${done} de ${total} prontos`,
    nextUp: 'PRÓXIMO PASSO',
    preparationSteps: 'PASSOS GENTIS',
    addStep: 'Adicionar passo',
    addStepPlaceholder: 'ex: Confirmar reserva de hotel',
    addBtn: 'Adicionar',
    discussBtn: 'Falar com o Luma',
    calendarHeader: 'MOMENTOS ADIANTE',
    prevMonth: 'Mês anterior',
    nextMonth: 'Próximo mês',
    upcomingTimeline: 'CRONOGRAMA DE EVENTOS'
  },
  tr: {
    yourMoments: 'Anlar',
    activeCount: (count) => `${count} aktif ${count === 1 ? 'an' : 'an'}`,
    newMoment: 'Yeni an',
    momentsHeader: 'ANLAR',
    lifePrepared: 'HAYATINIZ, BİRAZ DAHA HAZIR.',
    appearHere: 'Anlarınız, siz ekledikçe burada görünecektir.',
    createFirst: 'İlk anınızı oluşturun',
    orTalk: 'Veya Luma ile konuşun',
    nextMoment: 'SIRADAKİ ANINIZ',
    selectedMoment: 'SEÇİLEN AN',
    whatsReady: 'HAZIR OLANLAR',
    ofPrepared: (done, total) => `${done} / ${total} hazır`,
    nextUp: 'SIRADAKİ ADIM',
    preparationSteps: 'HAZIRLIK ADIMLARI',
    addStep: 'Adım ekle',
    addStepPlaceholder: 'örn. Otel rezervasyonunu onayla',
    addBtn: 'Ekle',
    discussBtn: 'Luma ile Konuş',
    calendarHeader: 'ÖNÜMÜZDEKİ ANLAR',
    prevMonth: 'Önceki ay',
    nextMonth: 'Sonraki ay',
    upcomingTimeline: 'YAKLAŞAN ANLAR'
  },
  zh: {
    yourMoments: '事件',
    activeCount: (count) => `${count} 个活跃事件`,
    newMoment: '新增事件',
    momentsHeader: '事件',
    lifePrepared: '生活，从此多一分从容筹备。',
    appearHere: '您添加的事件将会显示在这里。',
    createFirst: '创建首个事件',
    orTalk: '或者与 Luma 倾心对话',
    nextMoment: '您的下个事件',
    selectedMoment: '选定事件',
    whatsReady: '准备就绪',
    ofPrepared: (done, total) => `已准备 ${done} / ${total}`,
    nextUp: '下步聚焦',
    preparationSteps: '筹备步骤',
    addStep: '添加步骤',
    addStepPlaceholder: '例如：确认酒店预订',
    addBtn: '添加',
    discussBtn: '与 Luma 讨论',
    calendarHeader: '事件日历',
    prevMonth: '上个月',
    nextMonth: '下个月',
    upcomingTimeline: '日程事件'
  },
  de: {
    yourMoments: 'Momente',
    activeCount: (count) => `${count} aktive ${count === 1 ? 'Moment' : 'Momente'}`,
    newMoment: 'Neuer Moment',
    momentsHeader: 'MOMENTE',
    lifePrepared: 'IHR LEBEN, EIN WENIG BESSER VORBEREITET.',
    appearHere: 'Ihre Momente werden hier angezeigt, sobald Sie sie hinzufügen.',
    createFirst: 'Ersten Moment erstellen',
    orTalk: 'Oder sprechen Sie einfach mit Luma',
    nextMoment: 'IHR NÄCHSTER MOMENT',
    selectedMoment: 'AUSGEWÄHLTER MOMENT',
    whatsReady: 'WAS IST BEREIT',
    ofPrepared: (done, total) => `${done} von ${total} vorbereitet`,
    nextUp: 'NÄCHSTER SCHRITT',
    preparationSteps: 'VORBEREITUNGSSCHRITTE',
    addStep: 'Schritt hinzufügen',
    addStepPlaceholder: 'z.B. Hotelreservierung bestätigen',
    addBtn: 'Hinzufügen',
    discussBtn: 'Mit Luma besprechen',
    calendarHeader: 'BEVORSTEHENDE MOMENTE',
    prevMonth: 'Vorheriger Monat',
    nextMonth: 'Nächster Monat',
    upcomingTimeline: 'BEVORSTEHENDE TERMINE'
  }
};

function getMomentDate(moment: LifeMoment): Date {
  if (moment.targetDate) {
    const parts = moment.targetDate.split('-');
    if (parts.length === 3) {
      const year = parseInt(parts[0], 10);
      const month = parseInt(parts[1], 10) - 1;
      const day = parseInt(parts[2], 10);
      if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
        return new Date(year, month, day);
      }
    }
  }
  const d = new Date();
  d.setDate(d.getDate() + (moment.daysLeft || 0));
  return d;
}

function formatDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

interface MomentsSpaceProps {
  language: LanguageCode;
  moments: LifeMoment[];
  onSelectMoment: (moment: LifeMoment) => void;
  onOpenCreateModal: () => void;
  onOpenTalk?: () => void;
  onToggleStepDone?: (momentId: string, stepId: string) => void;
  onAddStep?: (momentId: string, step: GentleStep) => void;
}

export const MomentsSpace: React.FC<MomentsSpaceProps> = ({
  language,
  moments,
  onSelectMoment,
  onOpenCreateModal,
  onOpenTalk,
  onToggleStepDone,
  onAddStep,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const s = LOCALIZED_SPACE_STRINGS[language] || LOCALIZED_SPACE_STRINGS.en;

  // Sort moments chronologically
  const sortedMoments = useMemo(() => {
    return [...moments].sort((a, b) => {
      const dateA = getMomentDate(a).getTime();
      const dateB = getMomentDate(b).getTime();
      return dateA - dateB;
    });
  }, [moments]);

  const nearestMoment = sortedMoments[0] || null;

  const [selectedMomentId, setSelectedMomentId] = useState<string>(
    nearestMoment?.id || ''
  );
  const [selectedCalendarDateKey, setSelectedCalendarDateKey] = useState<string | null>(null);

  // Active moment logic
  const activeMoment =
    moments.find((m) => m.id === selectedMomentId) || nearestMoment;

  // Initial Calendar month based on active or nearest moment
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(() => {
    if (nearestMoment) {
      return getMomentDate(nearestMoment);
    }
    return new Date();
  });

  const [newStepText, setNewStepText] = useState('');
  const [showAddInput, setShowAddInput] = useState(false);

  // Map dates to moments
  const momentsByDateKey = useMemo(() => {
    const map: Record<string, LifeMoment[]> = {};
    moments.forEach((m) => {
      const key = formatDateKey(getMomentDate(m));
      if (!map[key]) map[key] = [];
      map[key].push(m);
    });
    return map;
  }, [moments]);

  const handleCreateStep = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStepText.trim() || !activeMoment || !onAddStep) return;
    const newStep: GentleStep = {
      id: `s_custom_${Date.now()}`,
      text: newStepText.trim(),
      when: 'Today',
      done: false,
    };
    onAddStep(activeMoment.id, newStep);
    setNewStepText('');
    setShowAddInput(false);
  };

  const handleSelectMoment = (moment: LifeMoment) => {
    setSelectedMomentId(moment.id);
    onSelectMoment(moment);
    const mDate = getMomentDate(moment);
    setSelectedCalendarDateKey(formatDateKey(mDate));
  };

  // Calendar calculations
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const monthNameList = MONTH_NAMES[language] || MONTH_NAMES.en;
  const shortMonthList = SHORT_MONTH_NAMES[language] || SHORT_MONTH_NAMES.en;
  const weekdayList = WEEKDAYS[language] || WEEKDAYS.en;

  const currentMonthTitle = `${monthNameList[month]} ${year}`;

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayWeekday = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const handleDayClick = (dayNumber: number) => {
    const d = new Date(year, month, dayNumber);
    const key = formatDateKey(d);
    setSelectedCalendarDateKey(key);

    const mList = momentsByDateKey[key];
    if (mList && mList.length > 0) {
      handleSelectMoment(mList[0]);
    }
  };

  const isNearestMomentSelected = activeMoment?.id === nearestMoment?.id;

  return (
    <div className="relative space-y-6 max-w-7xl mx-auto pb-28 text-[#2C2723] animate-fade-in pt-1 px-1">
      {/* Mobile Header Bar */}
      <div className="md:hidden">
        <LumaHeaderBar language={language} compact />
      </div>

      {/* Main Title Bar */}
      <div className="flex items-center justify-between relative z-10 px-1 py-1">
        <div>
          <h1 className="font-serif text-2xl md:text-3xl font-normal text-[#2C2723]">
            {s.yourMoments}
          </h1>
          <p className="text-xs text-[#6B6258] font-medium mt-0.5">
            {s.activeCount(moments.length)}
          </p>
        </div>

        {moments.length > 0 && (
          <button
            onClick={onOpenCreateModal}
            className="px-4 py-2 rounded-full bg-[#2C2723] text-white hover:bg-[#3D3732] active:scale-95 transition shadow-3xs cursor-pointer flex items-center gap-2 shrink-0 text-xs font-medium"
            title={s.newMoment}
          >
            <LumaPlusIcon className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">
              {s.newMoment}
            </span>
          </button>
        )}
      </div>

      {/* Empty State */}
      {moments.length === 0 ? (
        <div className="py-16 px-6 sm:px-12 rounded-[32px] bg-white border border-[#E5DFD4] text-center space-y-6 relative z-10 shadow-3xs max-w-lg mx-auto mt-8 animate-fade-in">
          <div className="space-y-2">
            <div className="w-[88px] h-[88px] rounded-full bg-[#F3EEE3] flex items-center justify-center mx-auto mb-3">
              <LumaSproutIcon className="w-[46px] h-[46px] text-[#5C6B52]" strokeWidth={1.1} />
            </div>
            <h2 className="font-serif text-xs tracking-widest text-[#6B6258] font-semibold uppercase">
              {s.momentsHeader}
            </h2>
            <h3 className="font-serif text-xl sm:text-2xl text-[#2C2723] leading-snug">
              {s.lifePrepared}
            </h3>
            <p className="text-xs text-[#6B6258] leading-relaxed max-w-xs mx-auto">
              {s.appearHere}
            </p>
          </div>
          
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={onOpenCreateModal}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#2C2723] hover:bg-[#3D3732] text-white text-xs font-semibold cursor-pointer transition shadow-xs flex items-center justify-center gap-1.5"
            >
              <LumaPlusIcon className="w-3.5 h-3.5" />
              <span>{s.createFirst}</span>
            </button>
            <button
              onClick={onOpenTalk}
              className="w-full sm:w-auto px-6 py-3 rounded-full bg-[#FAF7F2] border border-[#E5DFD4] hover:bg-[#FAF7F2]/80 text-[#6B6258] hover:text-[#2C2723] text-xs font-semibold cursor-pointer transition flex items-center justify-center gap-1.5"
            >
              <LumaVoiceIcon className="w-3.5 h-3.5 text-[#5C6B52]" />
              <span>{s.orTalk}</span>
            </button>
          </div>
        </div>
      ) : (
        /* TWO-ZONE MASTER WORKSPACE (Desktop ≥1024px, Tablet 768-1023px, Mobile stacked) */
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start relative z-10">
          
          {/* ============================================================ */}
          {/* LEFT ZONE — YOUR NEXT MOMENT / FOCUS WORKSPACE (lg:col-span-6) */}
          {/* ============================================================ */}
          <div className="lg:col-span-6 space-y-6">
            {activeMoment && (
              <div className="bg-white border border-[#E5DFD4] rounded-[32px] p-6 sm:p-8 shadow-xs space-y-6 relative overflow-hidden">
                
                {/* Eyebrow Header */}
                <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD4]/60">
                  <span className="text-[11px] font-semibold uppercase tracking-widest text-[#5C6B52] flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#5C6B52] animate-pulse" />
                    {isNearestMomentSelected ? s.nextMoment : s.selectedMoment}
                  </span>
                  <span className="text-[11px] font-semibold text-[#5C6B52] px-2.5 py-0.5 rounded-full bg-[#5C6B52]/10">
                    {getLocalizedDaysAhead(activeMoment, language)}
                  </span>
                </div>

                {/* Main Event Title & Date Info */}
                <div className="space-y-2">
                  <h2 className="font-serif text-2xl sm:text-3xl font-normal text-[#2C2723] leading-tight break-words">
                    {activeMoment.title}
                  </h2>
                  <div className="flex flex-wrap items-center gap-2 text-xs text-[#6B6258] font-medium">
                    <span>{getLocalizedDateLabel(activeMoment, language)}</span>
                    {activeMoment.timeOfDay && (
                      <>
                        <span>·</span>
                        <span className="font-mono text-[#2C2723]">
                          {formatTimeWithTimezone(activeMoment.timeOfDay, activeMoment.timezone, language)}
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Progress Indicator ("WHAT'S READY") */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DFD4] space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-[10px] uppercase tracking-wider text-[#6B6258] font-semibold">
                      {s.whatsReady}
                    </span>
                    <span className="font-semibold text-[#5C6B52]">
                      {s.ofPrepared(activeMoment.gentleSteps.filter((s) => s.done).length, activeMoment.gentleSteps.length)}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-[#E5DFD4] rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#5C6B52] transition-all duration-300"
                      style={{
                        width: `${
                          activeMoment.gentleSteps.length > 0
                            ? Math.round(
                                (activeMoment.gentleSteps.filter((s) => s.done).length /
                                  activeMoment.gentleSteps.length) *
                                  100
                              )
                            : 0
                        }%`,
                      }}
                    />
                  </div>
                </div>

                {/* Luma's Thought */}
                <div className="p-4 rounded-2xl bg-[#FAF7F2] border border-[#E5DFD4] space-y-1.5">
                  <div className="flex items-center gap-2 text-[#5C6B52] text-[10px] font-serif font-semibold tracking-wider uppercase">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#5C6B52]" />
                    {t.lumaThought || "Luma's Thought"}
                  </div>
                  <p className="text-[#2C2723]/90 text-xs sm:text-sm leading-relaxed font-serif italic pl-3 border-l-2 border-[#5C6B52]/40">
                    "{activeMoment.reassuranceNote || t.defaultReassurance}"
                  </p>
                </div>

                {/* NEXT UP Focus Box */}
                {(activeMoment.oneThingToPrepare || activeMoment.gentleSteps.find((s) => !s.done)) && (
                  <div className="p-4 rounded-2xl bg-[#2C2723] text-white space-y-1 shadow-3xs">
                    <div className="text-[10px] uppercase tracking-widest text-[#C29E65] font-semibold">
                      {s.nextUp}
                    </div>
                    <p className="text-xs sm:text-sm font-medium leading-normal text-white/95">
                      {activeMoment.oneThingToPrepare ||
                        activeMoment.gentleSteps.find((s) => !s.done)?.text}
                    </p>
                  </div>
                )}

                {/* Gentle Steps Checklist */}
                <div className="space-y-3 pt-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] uppercase tracking-wider text-[#6B6258] font-semibold">
                      {s.preparationSteps}
                    </span>
                    <button
                      onClick={() => setShowAddInput(!showAddInput)}
                      className="text-xs text-[#5C6B52] font-semibold hover:underline cursor-pointer flex items-center gap-1"
                    >
                      <LumaPlusIcon className="w-3.5 h-3.5" />
                      <span>{s.addStep}</span>
                    </button>
                  </div>

                  {showAddInput && (
                    <form onSubmit={handleCreateStep} className="flex gap-2">
                      <input
                        type="text"
                        value={newStepText}
                        onChange={(e) => setNewStepText(e.target.value)}
                        placeholder={s.addStepPlaceholder}
                        className="flex-1 p-2.5 rounded-xl bg-[#FAF7F2] border border-[#E5DFD4] text-xs font-medium text-[#2C2723] focus:outline-none focus:border-[#5C6B52]"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2.5 rounded-xl bg-[#2C2723] text-white text-xs font-medium hover:bg-[#3D3732] cursor-pointer shrink-0"
                      >
                        {s.addBtn}
                      </button>
                    </form>
                  )}

                  <div className="space-y-2">
                    {activeMoment.gentleSteps.map((step) => (
                      <div
                        key={step.id}
                        onClick={() => {
                          if (onToggleStepDone) {
                            onToggleStepDone(activeMoment.id, step.id);
                          }
                        }}
                        className={`p-3.5 rounded-2xl border transition flex items-center justify-between cursor-pointer ${
                          step.done
                            ? 'bg-[#FAF7F2] border-[#E5DFD4] text-[#6B6258]'
                            : 'bg-white border-[#E5DFD4] text-[#2C2723] hover:border-[#5C6B52]'
                        }`}
                      >
                        <div className="flex items-center gap-3 pr-2 min-w-0 flex-1">
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
                            className={`text-xs font-medium break-words flex-1 min-w-0 ${
                              step.done ? 'line-through' : ''
                            }`}
                          >
                            {step.text}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF7F2] text-[#6B6258] shrink-0">
                          {step.when}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* CTA Button: Talk to Luma */}
                <div className="pt-2">
                  <button
                    onClick={() => {
                      onSelectMoment(activeMoment);
                      if (onOpenTalk) onOpenTalk();
                    }}
                    className="w-full py-3 px-5 rounded-2xl bg-[#5C6B52] hover:bg-[#4D5A44] active:scale-[0.99] text-white text-xs font-medium transition cursor-pointer flex items-center justify-center gap-2 shadow-xs"
                  >
                    <LumaVoiceIcon className="w-4 h-4" />
                    <span>
                      {s.discussBtn}
                    </span>
                  </button>
                </div>

              </div>
            )}
          </div>

          {/* ============================================================ */}
          {/* RIGHT ZONE — MOMENTS AHEAD / VISUAL CALENDAR & TIMELINE (lg:col-span-6) */}
          {/* ============================================================ */}
          <div className="lg:col-span-6 space-y-6">
            
            {/* 1. VISUAL CALENDAR WIDGET */}
            <div className="bg-white border border-[#E5DFD4] rounded-[32px] p-6 shadow-xs space-y-4">
              
              {/* Calendar Header Nav */}
              <div className="flex items-center justify-between pb-3 border-b border-[#E5DFD4]/60">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B6258]">
                  {s.calendarHeader}
                </span>
                
                <div className="flex items-center gap-3">
                  <span className="font-serif text-sm font-medium text-[#2C2723]">
                    {currentMonthTitle}
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={handlePrevMonth}
                      className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#FAF7F2] border border-[#E5DFD4] text-[#2C2723] hover:bg-[#E5DFD4]/50 flex items-center justify-center text-xs transition cursor-pointer"
                      title={s.prevMonth}
                    >
                      ‹
                    </button>
                    <button
                      onClick={handleNextMonth}
                      className="w-9 h-9 sm:w-8 sm:h-8 rounded-full bg-[#FAF7F2] border border-[#E5DFD4] text-[#2C2723] hover:bg-[#E5DFD4]/50 flex items-center justify-center text-xs transition cursor-pointer"
                      title={s.nextMonth}
                    >
                      ›
                    </button>
                  </div>
                </div>
              </div>

              {/* Weekdays Row */}
              <div className="grid grid-cols-7 text-center text-[10px] font-semibold text-[#6B6258]">
                {weekdayList.map((wd, i) => (
                  <div key={i} className="py-1">
                    {wd}
                  </div>
                ))}
              </div>

              {/* Month Days Grid */}
              <div className="grid grid-cols-7 text-center gap-1">
                {/* Empty padding cells for previous month days */}
                {Array.from({ length: firstDayWeekday }).map((_, i) => (
                  <div key={`empty-${i}`} className="h-10 sm:h-11" />
                ))}

                {/* Days of Current Month */}
                {Array.from({ length: daysInMonth }).map((_, idx) => {
                  const dayNum = idx + 1;
                  const dayDate = new Date(year, month, dayNum);
                  const dateKey = formatDateKey(dayDate);

                  const dayMoments = momentsByDateKey[dateKey] || [];
                  const hasMoments = dayMoments.length > 0;

                  const isSelectedDate = selectedCalendarDateKey === dateKey;
                  const isToday = formatDateKey(new Date()) === dateKey;

                  return (
                    <button
                      key={`day-${dayNum}`}
                      onClick={() => handleDayClick(dayNum)}
                      className={`h-10 sm:h-11 rounded-2xl flex flex-col items-center justify-center text-xs font-medium relative transition cursor-pointer select-none ${
                        isSelectedDate
                          ? 'bg-[#2C2723] text-white shadow-3xs'
                          : isToday
                          ? 'bg-[#5C6B52]/15 text-[#5C6B52] font-semibold'
                          : 'hover:bg-[#FAF7F2] text-[#2C2723]'
                      }`}
                    >
                      <span>{dayNum}</span>
                      {hasMoments && (
                        <span
                          className={`w-1.5 h-1.5 rounded-full absolute bottom-1 ${
                            isSelectedDate ? 'bg-[#C29E65]' : 'bg-[#5C6B52]'
                          }`}
                        />
                      )}
                    </button>
                  );
                })}
              </div>

            </div>

            {/* 2. CHRONOLOGICAL UPCOMING TIMELINE */}
            <div className="bg-white border border-[#E5DFD4] rounded-[32px] p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-[#E5DFD4]/60">
                <span className="text-[11px] font-semibold uppercase tracking-widest text-[#6B6258]">
                  {s.upcomingTimeline}
                </span>
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E5DFD4] text-[#6B6258]">
                  {sortedMoments.length}
                </span>
              </div>

              <div className="space-y-3">
                {sortedMoments.map((moment) => {
                  const mDate = getMomentDate(moment);
                  const dayNum = mDate.getDate();
                  const monthName = shortMonthList[mDate.getMonth()];
                  const isSelected = activeMoment?.id === moment.id;

                  return (
                    <div
                      key={moment.id}
                      onClick={() => handleSelectMoment(moment)}
                      className={`p-4 rounded-2xl border transition cursor-pointer flex items-center justify-between group ${
                        isSelected
                          ? 'bg-[#FAF7F2] border-[#5C6B52] ring-1 ring-[#5C6B52]/30'
                          : 'bg-white border-[#E5DFD4] hover:border-[#5C6B52]/60 hover:bg-[#FAF7F2]/50'
                      }`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 pr-2">
                        {/* Date Dot Badge */}
                        <div className="flex items-center gap-1.5 shrink-0 text-xs font-semibold text-[#5C6B52]">
                          <span className="w-2 h-2 rounded-full bg-[#5C6B52]" />
                          <span className="uppercase font-mono">
                            {monthName} {dayNum}
                          </span>
                        </div>

                        {/* Title & Time */}
                        <div className="min-w-0">
                          <h4 className="font-serif text-base text-[#2C2723] group-hover:text-[#5C6B52] transition break-words">
                            {moment.title}
                          </h4>
                          {moment.timeOfDay && (
                            <p className="text-[11px] text-[#6B6258] font-mono">
                              {formatTimeWithTimezone(moment.timeOfDay, moment.timezone, language)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Days Left Badge */}
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] font-medium text-[#6B6258] px-2 py-0.5 rounded-full bg-[#FAF7F2] border border-[#E5DFD4]">
                          {getLocalizedDaysAhead(moment, language)}
                        </span>
                        <div className="p-1.5 rounded-full bg-[#FAF7F2] text-[#5C6B52] shrink-0">
                          {moment.category === 'journey' ? (
                            <LumaHorizonIcon className="w-3.5 h-3.5" />
                          ) : moment.category === 'health' ? (
                            <LumaCaringIcon className="w-3.5 h-3.5" />
                          ) : (
                            <LumaCompassIcon className="w-3.5 h-3.5" />
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

        </div>
      )}
    </div>
  );
};
