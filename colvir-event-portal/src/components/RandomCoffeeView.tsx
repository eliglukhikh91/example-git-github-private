import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { Participant } from '../types';
import {
  Coffee,
  Sparkles,
  Shuffle,
  Clock,
  Calendar,
  Send,
  Users,
  CheckCircle2,
  Video,
  Building,
  Mail,
  X,
  MessageSquare,
  HelpCircle,
  Link as LinkIcon,
  Copy,
  ExternalLink
} from 'lucide-react';

export const RandomCoffeeView: React.FC = () => {
  const {
    events,
    participants,
    registerForEvent,
    userProfile,
    getUserRegistrations,
    cmsContent,
    coffeeSlots,
    addNotification
  } = useApp();

  // Find the coffee break event
  const coffeeEvent = events.find((e) => e.category === 'coffee-break') || events[2];

  const timeSlots = coffeeSlots && coffeeSlots.length > 0 ? coffeeSlots : [
    '10:00 - 10:15 (МСК)',
    '10:15 - 10:30 (МСК)',
    '11:30 - 11:45 (МСК)',
    '12:00 - 12:15 (МСК)',
    '15:00 - 15:15 (МСК)',
    '15:15 - 15:30 (МСК)',
    '16:30 - 16:45 (МСК)'
  ];

  const [selectedSlot, setSelectedSlot] = useState<string>(timeSlots[0]);
  const [isShuffling, setIsShuffling] = useState(false);
  const [matchedParticipant, setMatchedParticipant] = useState<Participant | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Modals
  const [isZoomModalOpen, setIsZoomModalOpen] = useState(false);
  const [isMessageModalOpen, setIsMessageModalOpen] = useState(false);
  const [directMessageText, setDirectMessageText] = useState('');
  const [isCopiedZoom, setIsCopiedZoom] = useState(false);

  // Get user registrations for coffee event
  const myRegistrations = getUserRegistrations().filter(
    (r) => r.eventId === coffeeEvent?.id && r.status !== 'cancelled'
  );
  const isRegisteredForSlot = myRegistrations.some((r) => r.timeSlot === selectedSlot);

  // Pool of candidate participants for randomizer
  const poolForSlot = participants.filter(
    (p) =>
      p.eventId === coffeeEvent?.id &&
      p.timeSlot === selectedSlot &&
      p.email !== userProfile.email
  );

  // Fallback pool of colleagues if none specifically signed up for exact slot
  const generalPool: Participant[] = [
    {
      id: 'mock-1',
      eventId: coffeeEvent?.id || 'evt-003',
      firstName: 'Анастасия',
      lastName: 'Белова',
      email: 'a.belova@colvir.com',
      telegram: '@nastya_colvir',
      department: 'Департамент маркетинга & PR',
      timeSlot: selectedSlot,
      isTeamGame: false,
      registeredAt: new Date().toISOString(),
      status: 'confirmed'
    },
    {
      id: 'mock-2',
      eventId: coffeeEvent?.id || 'evt-003',
      firstName: 'Сергей',
      lastName: 'Николаев',
      email: 's.nikolaev@colvir.com',
      telegram: '@s_nik',
      department: 'Тестирование QA',
      timeSlot: selectedSlot,
      isTeamGame: false,
      registeredAt: new Date().toISOString(),
      status: 'confirmed'
    },
    {
      id: 'mock-3',
      eventId: coffeeEvent?.id || 'evt-003',
      firstName: 'Александр',
      lastName: 'Морозов',
      email: 'a.morozov@colvir.com',
      telegram: '@sasha_m',
      department: 'Архитектура и DevOps',
      timeSlot: selectedSlot,
      isTeamGame: false,
      registeredAt: new Date().toISOString(),
      status: 'confirmed'
    },
    {
      id: 'mock-4',
      eventId: coffeeEvent?.id || 'evt-003',
      firstName: 'Екатерина',
      lastName: 'Зайцева',
      email: 'e.zaytseva@colvir.com',
      telegram: '@katya_design',
      department: 'UI/UX Дизайн',
      timeSlot: selectedSlot,
      isTeamGame: false,
      registeredAt: new Date().toISOString(),
      status: 'confirmed'
    },
    {
      id: 'mock-5',
      eventId: coffeeEvent?.id || 'evt-003',
      firstName: 'Павел',
      lastName: 'Климов',
      email: 'p.klimov@colvir.com',
      telegram: '@pavel_k',
      department: 'Бизнес-аналитика',
      timeSlot: selectedSlot,
      isTeamGame: false,
      registeredAt: new Date().toISOString(),
      status: 'confirmed'
    }
  ];

  const candidatePool = poolForSlot.length > 0 ? poolForSlot : generalPool;

  const handleRegisterSlot = () => {
    if (!coffeeEvent) return;
    try {
      registerForEvent({
        eventId: coffeeEvent.id,
        firstName: userProfile.firstName,
        lastName: userProfile.lastName,
        telegram: userProfile.telegram,
        department: userProfile.department,
        timeSlot: selectedSlot
      });

      // Add platform notification
      addNotification({
        eventId: coffeeEvent.id,
        eventTitle: 'Random Coffee',
        participantName: `${userProfile.lastName} ${userProfile.firstName}`,
        isTeamGame: false,
        timeSlot: selectedSlot,
        type: 'registration',
        messageText: `Запись на 15-мин кофе-брейк (${selectedSlot})`
      });

      setFeedbackMsg(`Вы успешно записались на слот ${selectedSlot}! Уведомление отправлено на рабочую почту ${userProfile.email}`);
      setTimeout(() => setFeedbackMsg(''), 5000);
    } catch (err: any) {
      setFeedbackMsg(err.message || 'Ошибка записи');
    }
  };

  const handleRunRandomizer = () => {
    setIsShuffling(true);
    setMatchedParticipant(null);

    setTimeout(() => {
      const randomIndex = Math.floor(Math.random() * candidatePool.length);
      const matched = candidatePool[randomIndex];
      setMatchedParticipant(matched);
      setIsShuffling(false);

      // Trigger notification for finding a match
      addNotification({
        eventId: coffeeEvent?.id || 'evt-003',
        eventTitle: 'Random Coffee Match',
        participantName: `${matched.firstName} ${matched.lastName}`,
        isTeamGame: false,
        timeSlot: selectedSlot,
        type: 'random_coffee_match',
        messageText: `Коллега для кофе-брейка найден: ${matched.firstName} ${matched.lastName} (${matched.department})`
      });

      showToast(`Коллега для кофе-брейка найден! Уведомление отправлено на вашу рабочую почту и в центр уведомлений Colvir Event Hub.`);
    }, 900);
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 6000);
  };

  const handleSendZoomInvite = () => {
    if (!matchedParticipant) return;
    const zoomUrl = `https://zoom.us/j/colvir-coffee-${Date.now().toString().slice(-6)}`;
    
    // Send platform notification
    addNotification({
      eventId: coffeeEvent?.id || 'evt-003',
      eventTitle: 'Приглашение в Zoom',
      participantName: `${matchedParticipant.firstName} ${matchedParticipant.lastName}`,
      isTeamGame: false,
      timeSlot: selectedSlot,
      type: 'zoom_invite',
      messageText: `Приглашение в Zoom (${zoomUrl}) на слот ${selectedSlot}`
    });

    setIsZoomModalOpen(false);
    showToast(`Приглашение в Zoom отправлено сотруднику ${matchedParticipant.firstName} ${matchedParticipant.lastName} на рабочую почту (${matchedParticipant.email}) и в Центр Уведомлений!`);
  };

  const handleSendDirectMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!matchedParticipant || !directMessageText.trim()) return;

    // Send platform notification
    addNotification({
      eventId: coffeeEvent?.id || 'evt-003',
      eventTitle: 'Сообщение от коллегии',
      participantName: `${matchedParticipant.firstName} ${matchedParticipant.lastName}`,
      isTeamGame: false,
      timeSlot: selectedSlot,
      type: 'direct_message',
      messageText: `Сообщение от ${userProfile.firstName}: "${directMessageText.trim()}"`
    });

    setDirectMessageText('');
    setIsMessageModalOpen(false);
    showToast(`Сообщение отправлено сотруднику ${matchedParticipant.firstName} ${matchedParticipant.lastName} на платформе и продублировано на рабочую почту (${matchedParticipant.email})!`);
  };

  const icebreakers = [
    '☕ Какой напиток прямо сейчас у тебя в кружке?',
    '🚀 Каким интересным проектом или задачей ты сейчас занимаешься в Colvir?',
    '💡 Назови одну вещь, которая удивила или порадовала тебя на этой неделе.',
    '🎧 Какую музыку или подкасты ты любишь слушать во время работы?'
  ];

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8">
      
      {/* Toast Notification Alert */}
      {toastMessage && (
        <div className="fixed top-5 right-5 z-50 max-w-md bg-slate-900 text-white p-4 rounded-2xl shadow-2xl border border-slate-700 animate-fadeIn flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-accent flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-white" />
          </div>
          <div className="flex-1 text-xs space-y-1">
            <p className="font-extrabold text-white">Уведомление Colvir Event Hub</p>
            <p className="text-slate-300 leading-relaxed">{toastMessage}</p>
          </div>
          <button
            onClick={() => setToastMessage(null)}
            className="text-slate-400 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Top Banner with Coffee Background Image */}
      <div className="relative rounded-3xl overflow-hidden shadow-xl border border-slate-700/30">
        
        {/* Background Image */}
        <div
          className="absolute inset-0 bg-cover bg-center transition-all duration-700"
          style={{
            backgroundImage: `url('https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=1600&auto=format&fit=crop&q=80')`
          }}
        />

        {/* Semi-transparent dark blue overlay for harmonious legibility */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/90 via-[#0a2342]/85 to-accent/80 backdrop-blur-[2px]" />

        <div className="relative z-10 p-6 sm:p-10 space-y-5 max-w-3xl text-white">
          
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/15 border border-white/25 text-white text-xs font-black backdrop-blur-md shadow-xs">
            <Coffee className="w-4 h-4 text-white animate-pulse" />
            <span>15-минутный перерыв для общения</span>
          </div>

          <h1 className="text-2xl sm:text-4xl font-black tracking-tight text-white leading-tight drop-shadow-sm">
            {cmsContent?.randomCoffeeTitle || 'Добро пожаловать в Random coffee!'}
          </h1>

          <p className="text-sm sm:text-base text-slate-100/95 leading-relaxed font-medium">
            {cmsContent?.randomCoffeeDescription ||
              'Отвлекитесь от задач на 15 минут! Выберите удобный слот, и наш умный рандомайзер подберет вам случайного коллегу из любого отдела Colvir для неформального знакомства за чашкой кофе.'}
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-3 text-xs font-bold text-white">
            <div className="flex items-center gap-1.5 bg-white/15 px-3.5 py-2 rounded-xl border border-white/20 backdrop-blur-md">
              <Clock className="w-4 h-4 text-white" />
              <span>Длительность: {cmsContent?.randomCoffeeDuration || '15 минут'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 px-3.5 py-2 rounded-xl border border-white/20 backdrop-blur-md">
              <Video className="w-4 h-4 text-white" />
              <span>Формат: {cmsContent?.randomCoffeeFormat || 'Онлайн (Zoom)'}</span>
            </div>
            <div className="flex items-center gap-1.5 bg-white/15 px-3.5 py-2 rounded-xl border border-white/20 backdrop-blur-md">
              <Users className="w-4 h-4 text-white" />
              <span>Участников сегодня: {participants.length + 14}</span>
            </div>
          </div>

        </div>
      </div>

      {/* Main Grid: Slot Selection + Randomizer */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        
        {/* Left Column: 15-Min Slot Selector */}
        <div className="lg:col-span-5 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-5">
            <div>
              <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Calendar className="w-5 h-5 text-accent" />
                <span>Шаг 1: Выберите 15-мин слот</span>
              </h2>
              <p className="text-xs text-slate-500 mt-1">
                Выберите наиболее удобное время для кофе-брейка
              </p>
            </div>

            {feedbackMsg && (
              <div className="p-3.5 bg-blue-50 border border-blue-200 text-accent text-xs font-bold rounded-2xl flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-accent shrink-0" />
                <span>{feedbackMsg}</span>
              </div>
            )}

            <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
              {timeSlots.map((slot) => {
                const isSelected = selectedSlot === slot;
                const isRegistered = myRegistrations.some((r) => r.timeSlot === slot);

                return (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={`w-full p-3.5 rounded-2xl border transition-all flex items-center justify-between text-left ${
                      isSelected
                        ? 'bg-accent-light border-accent ring-2 ring-accent/20 shadow-xs'
                        : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                          isSelected
                            ? 'bg-accent text-white font-bold'
                            : 'bg-slate-200 text-slate-600'
                        }`}
                      >
                        <Clock className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <div className="text-sm font-black text-slate-900">
                          {slot}
                        </div>
                        <div className="text-[11px] text-slate-500 flex items-center gap-1">
                          <span>Слот открыт для записи</span>
                          {isRegistered && (
                            <span className="ml-1 px-1.5 py-0.2 bg-accent text-white font-bold rounded text-[10px]">
                              Ваша запись
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="shrink-0">
                      <div
                        className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                          isSelected
                            ? 'border-accent bg-accent'
                            : 'border-slate-300'
                        }`}
                      >
                        {isSelected && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Action button for registration */}
            <div className="pt-2">
              <button
                onClick={handleRegisterSlot}
                className="w-full py-3.5 px-4 rounded-2xl font-bold text-sm bg-accent hover:bg-accent-hover text-white shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95"
              >
                {isRegisteredForSlot ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-white" />
                    <span>Вы уже записаны ({selectedSlot})</span>
                  </>
                ) : (
                  <>
                    <Coffee className="w-4 h-4 text-white" />
                    <span>Записаться на 15 минут ({selectedSlot})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Randomizer Engine & Partner Card */}
        <div className="lg:col-span-7 space-y-6">
          <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs space-y-6">
            
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
              <div>
                <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                  <Shuffle className="w-5 h-5 text-accent" />
                  <span>Шаг 2: Поиск собеседника</span>
                </h2>
                <p className="text-xs text-slate-500">
                  Выбранный слот: <strong className="text-accent">{selectedSlot}</strong>
                </p>
              </div>

              <button
                onClick={handleRunRandomizer}
                disabled={isShuffling}
                className="px-5 py-3 bg-accent hover:bg-accent-hover text-white font-extrabold text-xs rounded-2xl shadow-md transition-all transform active:scale-95 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Shuffle className={`w-4 h-4 text-white ${isShuffling ? 'animate-spin' : ''}`} />
                <span>{isShuffling ? 'Подбираем коллегу...' : '🎲 Запустить Рандомайзер'}</span>
              </button>
            </div>

            {/* Randomizer Visual Area */}
            {isShuffling && (
              <div className="py-16 text-center space-y-4 bg-blue-50/50 rounded-2xl border border-blue-200/60 animate-pulse">
                <div className="w-16 h-16 bg-accent text-white rounded-3xl mx-auto flex items-center justify-center text-2xl font-black shadow-md">
                  ☕
                </div>
                <div>
                  <h3 className="text-base font-black text-slate-800">
                    Подбираем коллегу для кофе-брейка...
                  </h3>
                  <p className="text-xs text-slate-500">
                    Сверяем 15-минутный слот и подразделения компании!
                  </p>
                </div>
              </div>
            )}

            {!isShuffling && !matchedParticipant && (
              <div className="py-12 text-center space-y-4 bg-slate-50 rounded-2xl border border-slate-200/80 p-6">
                <div className="w-14 h-14 bg-accent text-white rounded-2xl mx-auto flex items-center justify-center shadow-md">
                  <Coffee className="w-7 h-7 text-white" />
                </div>
                <div className="max-w-md mx-auto space-y-2">
                  <h3 className="text-base font-black text-slate-900">
                    Нажмите «Запустить Рандомайзер»
                  </h3>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Система случайно подберет вам случайного коллегу, записанного на слот{' '}
                    <strong className="text-slate-700">{selectedSlot}</strong>, для 15-минутного онлайн кофе-брейка.
                  </p>
                </div>
                <button
                  onClick={handleRunRandomizer}
                  className="px-6 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all"
                >
                  Найти собеседника прямо сейчас
                </button>
              </div>
            )}

            {!isShuffling && matchedParticipant && (
              <div className="bg-gradient-to-br from-blue-50/90 via-white to-slate-50/60 rounded-3xl p-6 border-2 border-accent/30 shadow-md space-y-5 relative animate-fadeIn">
                
                {/* Matched Pill Title */}
                <div className="flex items-center justify-between border-b border-blue-100 pb-3">
                  <div className="flex items-center gap-2">
                    <span className="w-3 h-3 rounded-full bg-accent animate-ping" />
                    <h3 className="text-base sm:text-lg font-black text-accent">
                      Коллега для кофе-брейка найден!
                    </h3>
                  </div>
                  <span className="px-3 py-1 bg-accent text-white font-black text-[10px] rounded-full uppercase tracking-wider shadow-2xs">
                    Слот: {selectedSlot}
                  </span>
                </div>

                <div className="flex flex-col sm:flex-row items-center sm:items-start gap-5">
                  <div className="relative shrink-0">
                    <img
                      src={`https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=200&auto=format&fit=crop&q=80`}
                      alt={matchedParticipant.firstName}
                      className="w-20 h-20 rounded-2xl object-cover ring-4 ring-accent/30 shadow-md"
                    />
                    <div className="absolute -bottom-2 -right-2 bg-accent text-white p-1 rounded-full ring-2 ring-white">
                      <CheckCircle2 className="w-4 h-4 text-white" />
                    </div>
                  </div>

                  <div className="space-y-1 text-center sm:text-left flex-1">
                    <span className="text-[11px] font-bold text-accent uppercase tracking-wider block">
                      Ваш собеседник в Colvir
                    </span>
                    <h4 className="text-xl font-black text-slate-900">
                      {matchedParticipant.firstName} {matchedParticipant.lastName}
                    </h4>
                    <div className="text-xs font-semibold text-slate-600 flex items-center justify-center sm:justify-start gap-1">
                      <Building className="w-3.5 h-3.5 text-slate-400" />
                      <span>{matchedParticipant.department || 'Департамент Colvir'}</span>
                    </div>

                    <div className="pt-2 flex flex-wrap gap-1.5 justify-center sm:justify-start">
                      <span className="px-2.5 py-0.5 bg-blue-100/80 text-accent text-[11px] font-bold rounded-lg">
                        ☕ Любитель кофе
                      </span>
                      <span className="px-2.5 py-0.5 bg-blue-100/80 text-accent text-[11px] font-bold rounded-lg">
                        💬 Готов к общению
                      </span>
                      <span className="px-2.5 py-0.5 bg-blue-100/80 text-accent text-[11px] font-bold rounded-lg">
                        🚀 {matchedParticipant.email}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Contact & Meeting Action Buttons */}
                <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-3">
                  
                  {/* Action 1: Invite to Zoom */}
                  <button
                    onClick={() => setIsZoomModalOpen(true)}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-2xl shadow-xs transition-all active:scale-95"
                  >
                    <Video className="w-4 h-4 text-white" />
                    <span>Пригласить в Zoom</span>
                  </button>

                  {/* Action 2: Direct Message on Platform */}
                  <button
                    onClick={() => setIsMessageModalOpen(true)}
                    className="flex items-center justify-center gap-2 py-3 px-4 bg-slate-800 hover:bg-slate-900 text-white text-xs font-bold rounded-2xl shadow-xs transition-all active:scale-95"
                  >
                    <MessageSquare className="w-4 h-4 text-white" />
                    <span>Написать сообщение собеседнику</span>
                  </button>

                </div>

                <div className="text-center pt-1">
                  <button
                    onClick={handleRunRandomizer}
                    className="text-xs text-slate-500 hover:text-accent font-bold underline inline-flex items-center gap-1"
                  >
                    <Shuffle className="w-3.5 h-3.5" />
                    <span>Подобрать другого собеседника</span>
                  </button>
                </div>

              </div>
            )}

            {/* Icebreakers Box */}
            <div className="bg-blue-50/60 border border-blue-200/80 rounded-2xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-xs font-extrabold text-accent">
                <HelpCircle className="w-4 h-4 text-accent" />
                <span>Идеи для 15-минутной беседы (Icebreakers):</span>
              </div>
              <ul className="text-xs text-slate-700 space-y-1.5 pl-5 list-disc">
                {icebreakers.map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

          </div>
        </div>

      </div>

      {/* MODAL 1: ZOOM INVITATION MODAL */}
      {isZoomModalOpen && matchedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-accent flex items-center justify-center">
                  <Video className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Приглашение на встречу в Zoom
                  </h3>
                  <p className="text-xs text-slate-500">
                    Собеседник: {matchedParticipant.firstName} {matchedParticipant.lastName}
                  </p>
                </div>
              </div>
              <button onClick={() => setIsZoomModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Мы сгенерировали уникальную ссылку Zoom для вашего 15-минутного кофе-брейка на слот <strong>{selectedSlot}</strong>.
              </p>
              
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-2xl flex items-center justify-between gap-2 font-mono text-[11px] text-accent">
                <span className="truncate">https://zoom.us/j/colvir-coffee-break-2026</span>
                <button
                  onClick={() => {
                    navigator.clipboard.writeText('https://zoom.us/j/colvir-coffee-break-2026');
                    setIsCopiedZoom(true);
                    setTimeout(() => setIsCopiedZoom(false), 2000);
                  }}
                  className="px-2.5 py-1 bg-white border border-slate-300 rounded-xl font-sans text-xs font-bold text-slate-700 hover:bg-slate-100 flex items-center gap-1"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>{isCopiedZoom ? 'Скопировано!' : 'Копировать'}</span>
                </button>
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-blue-900 text-[11px]">
                <Mail className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>
                  При нажатии на кнопку ниже ссылка с приглашением будет отправлена на вашу рабочую почту ({userProfile.email}) и коллеге ({matchedParticipant.email}), а также появится в Центре Уведомлений на платформе!
                </span>
              </div>
            </div>

            <div className="pt-2 flex gap-3">
              <button
                onClick={() => setIsZoomModalOpen(false)}
                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
              >
                Отмена
              </button>
              <button
                onClick={handleSendZoomInvite}
                className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
              >
                <Send className="w-4 h-4 text-white" />
                <span>Отправить приглашение Zoom</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DIRECT PLATFORM MESSAGE MODAL */}
      {isMessageModalOpen && matchedParticipant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg p-6 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-2xl bg-slate-800 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
                <div>
                  <h3 className="font-extrabold text-slate-900 text-base">
                    Написать сообщение на платформе
                  </h3>
                  <p className="text-xs text-slate-500">
                    Получатель: {matchedParticipant.firstName} {matchedParticipant.lastName} ({matchedParticipant.department})
                  </p>
                </div>
              </div>
              <button onClick={() => setIsMessageModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSendDirectMessage} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Текст сообщения для коллеги:
                </label>
                <textarea
                  rows={4}
                  value={directMessageText}
                  onChange={(e) => setDirectMessageText(e.target.value)}
                  placeholder="Привет! Рад знакомству на Random Coffee. Буду рад обсудить текущие задачи и выпить кофе на Zoom..."
                  className="w-full p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-xs font-medium focus:bg-white focus:border-accent outline-hidden resize-none"
                  required
                />
              </div>

              <div className="p-3 bg-blue-50 border border-blue-200 rounded-xl flex items-start gap-2 text-blue-900 text-[11px]">
                <Mail className="w-4 h-4 text-accent shrink-0 mt-0.5" />
                <span>
                  Сообщение мгновенно отобразится в Центре Уведомлений Colvir Event Hub и будет отправлено на почту {matchedParticipant.email}.
                </span>
              </div>

              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={() => setIsMessageModalOpen(false)}
                  className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="flex-1 py-3 bg-accent hover:bg-accent-hover text-white font-bold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4 text-white" />
                  <span>Отправить сообщение</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
