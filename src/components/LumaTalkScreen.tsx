import React, { useState, useRef, useEffect } from 'react';
import { LifeMoment, VoiceMessage, LumaEventContext, LumaAction } from '../types';
import { LanguageCode, TRANSLATIONS } from '../data/translations';
import { LumaVoiceIcon, LumaLotusIcon } from './icons/LumaIcons';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { createLumaEntry } from '../services/lumaEntryService';
import { getLocalizedDateLabel, findMatchingMoment } from '../utils/momentUtils';
import { toLocalDateString, getLocalTimestamp } from '../utils/timezoneUtils';
import { getAuthToken } from '../firebase';

interface LumaTalkScreenProps {
  language: LanguageCode;
  moments?: LifeMoment[];
  onAddNewMoment: (moment: LifeMoment | string) => void;
  onApplyAction?: (action: LumaAction) => void;
  onDeleteMoment?: (momentId: string) => void;
  onUpdateMoment?: (momentId: string, fields: Partial<LifeMoment>) => void;
  plan?: 'free' | 'pro';
}

const LOCALIZED_TALK_STRINGS: Record<LanguageCode, {
  deletedSuccess: string;
  rescheduledSuccess: string;
  actionCancelled: string;
  confirmDelete: (title: string) => string;
  confirmReschedule: (title: string, day: string) => string;
  confirmationRequired: string;
  confirmReschedulingTitle: string;
  yesDelete: string;
  yesUpdate: string;
  cancel: string;
  stopRecording: string;
  voiceInput: string;
  newDay: string;
  saturday: string;
  sunday: string;
  tomorrow: string;
  friday: string;
  monday: string;
}> = {
  en: {
    deletedSuccess: 'I have successfully deleted this moment.',
    rescheduledSuccess: 'The moment has been rescheduled successfully.',
    actionCancelled: 'Action cancelled.',
    confirmDelete: (title) => `Are you sure you want to delete the moment "${title}"?`,
    confirmReschedule: (title, day) => `Would you like to reschedule "${title}" to ${day}?`,
    confirmationRequired: 'Confirmation required',
    confirmReschedulingTitle: 'Confirm rescheduling',
    yesDelete: 'Yes, Delete',
    yesUpdate: 'Yes, Update',
    cancel: 'Cancel',
    stopRecording: 'Stop recording',
    voiceInput: 'Voice input',
    newDay: 'new day',
    saturday: 'Saturday',
    sunday: 'Sunday',
    tomorrow: 'tomorrow',
    friday: 'Friday',
    monday: 'Monday',
  },
  ru: {
    deletedSuccess: 'Я успешно удалила это событие.',
    rescheduledSuccess: 'Событие успешно перенесено.',
    actionCancelled: 'Действие отменено.',
    confirmDelete: (title) => `Вы уверены, что хотите удалить событие «${title}»?`,
    confirmReschedule: (title, day) => `Вы хотите перенести событие «${title}» на ${day}?`,
    confirmationRequired: 'Требуется подтверждение',
    confirmReschedulingTitle: 'Подтвердите изменения',
    yesDelete: 'Да, удалить',
    yesUpdate: 'Да, обновить',
    cancel: 'Отмена',
    stopRecording: 'Остановить запись',
    voiceInput: 'Голосовой ввод',
    newDay: 'новый день',
    saturday: 'субботу',
    sunday: 'воскресенье',
    tomorrow: 'завтра',
    friday: 'пятницу',
    monday: 'понедельник',
  },
  es: {
    deletedSuccess: 'He eliminado este momento con éxito.',
    rescheduledSuccess: 'El momento ha sido reprogramado con éxito.',
    actionCancelled: 'Acción cancelada.',
    confirmDelete: (title) => `¿Estás seguro de que deseas eliminar el momento "${title}"?`,
    confirmReschedule: (title, day) => `¿Te gustaría reprogramar "${title}" para el ${day}?`,
    confirmationRequired: 'Se requiere confirmación',
    confirmReschedulingTitle: 'Confirmar reprogramación',
    yesDelete: 'Sí, eliminar',
    yesUpdate: 'Sí, actualizar',
    cancel: 'Cancelar',
    stopRecording: 'Detener grabación',
    voiceInput: 'Entrada de voz',
    newDay: 'nuevo día',
    saturday: 'sábado',
    sunday: 'domingo',
    tomorrow: 'mañana',
    friday: 'viernes',
    monday: 'lunes',
  },
  fr: {
    deletedSuccess: "J'ai supprimé ce moment avec succès.",
    rescheduledSuccess: 'Le moment a été reprogrammé avec succès.',
    actionCancelled: 'Action annulée.',
    confirmDelete: (title) => `Êtes-vous sûr de vouloir supprimer le moment "${title}" ?`,
    confirmReschedule: (title, day) => `Souhaitez-vous reprogrammer "${title}" pour ${day} ?`,
    confirmationRequired: 'Confirmation requise',
    confirmReschedulingTitle: 'Confirmer la reprogrammation',
    yesDelete: 'Oui, supprimer',
    yesUpdate: 'Oui, mettre à jour',
    cancel: 'Annuler',
    stopRecording: "Arrêter l'enregistrement",
    voiceInput: 'Saisie vocale',
    newDay: 'nouveau jour',
    saturday: 'samedi',
    sunday: 'dimanche',
    tomorrow: 'demain',
    friday: 'vendredi',
    monday: 'lundi',
  },
  it: {
    deletedSuccess: 'Ho eliminato questo momento con successo.',
    rescheduledSuccess: 'Il momento è stato riprogrammato con successo.',
    actionCancelled: 'Azione annullata.',
    confirmDelete: (title) => `Sei sicuro di voler eliminare il momento "${title}"?`,
    confirmReschedule: (title, day) => `Vuoi riprogrammare "${title}" per ${day}?`,
    confirmationRequired: 'Conferma richiesta',
    confirmReschedulingTitle: 'Conferma riprogrammazione',
    yesDelete: 'Sì, elimina',
    yesUpdate: 'Sì, aggiorna',
    cancel: 'Annulla',
    stopRecording: 'Interrompi registrazione',
    voiceInput: 'Input vocale',
    newDay: 'nuovo giorno',
    saturday: 'sabato',
    sunday: 'domenica',
    tomorrow: 'domani',
    friday: 'venerdì',
    monday: 'lunedì',
  },
  pt: {
    deletedSuccess: 'Excluí este momento com sucesso.',
    rescheduledSuccess: 'O momento foi reagendado com sucesso.',
    actionCancelled: 'Ação cancelada.',
    confirmDelete: (title) => `Tem certeza de que deseja excluir o momento "${title}"?`,
    confirmReschedule: (title, day) => `Gostaria de reagendar "${title}" para ${day}?`,
    confirmationRequired: 'Confirmação necessária',
    confirmReschedulingTitle: 'Confirmar reagendamento',
    yesDelete: 'Sim, excluir',
    yesUpdate: 'Sim, atualizar',
    cancel: 'Cancelar',
    stopRecording: 'Parar gravação',
    voiceInput: 'Entrada de voz',
    newDay: 'novo dia',
    saturday: 'sábado',
    sunday: 'domingo',
    tomorrow: 'amanhã',
    friday: 'sexta-feira',
    monday: 'segunda-feira',
  },
  tr: {
    deletedSuccess: 'Bu anı başarıyla sildim.',
    rescheduledSuccess: 'An başarıyla yeniden planlandı.',
    actionCancelled: 'İşlem iptal edildi.',
    confirmDelete: (title) => `"${title}" anını silmek istediğinizden emin misiniz?`,
    confirmReschedule: (title, day) => `"${title}" anını ${day} gününe ertelemek ister misiniz?`,
    confirmationRequired: 'Onay gerekiyor',
    confirmReschedulingTitle: 'Yeniden planlamayı onayla',
    yesDelete: 'Evet, Sil',
    yesUpdate: 'Evet, Güncelle',
    cancel: 'İptal',
    stopRecording: 'Kaydı durdur',
    voiceInput: 'Ses girişi',
    newDay: 'yeni gün',
    saturday: 'Cumartesi',
    sunday: 'Pazar',
    tomorrow: 'yarın',
    friday: 'Cuma',
    monday: 'Pazartesi',
  },
  zh: {
    deletedSuccess: '我已成功删除此时刻。',
    rescheduledSuccess: '时刻已成功重新安排。',
    actionCancelled: '操作已取消。',
    confirmDelete: (title) => `您确定要删除时刻 "${title}" 吗？`,
    confirmReschedule: (title, day) => `您想将 "${title}" 重新安排到 ${day} 吗？`,
    confirmationRequired: '需要确认',
    confirmReschedulingTitle: '确认重新安排',
    yesDelete: '是的，删除',
    yesUpdate: '是的，更新',
    cancel: '取消',
    stopRecording: '停止录音',
    voiceInput: '语音输入',
    newDay: '新的一天',
    saturday: '周六',
    sunday: '周日',
    tomorrow: '明天',
    friday: '周五',
    monday: '周一',
  },
  de: {
    deletedSuccess: 'Ich habe diesen Moment erfolgreich gelöscht.',
    rescheduledSuccess: 'Der Moment wurde erfolgreich verschoben.',
    actionCancelled: 'Aktion abgebrochen.',
    confirmDelete: (title) => `Sind Sie sicher, dass Sie den Moment "${title}" löschen möchten?`,
    confirmReschedule: (title, day) => `Möchten Sie "${title}" auf ${day} verschieben?`,
    confirmationRequired: 'Bestätigung erforderlich',
    confirmReschedulingTitle: 'Verschiebung bestätigen',
    yesDelete: 'Ja, löschen',
    yesUpdate: 'Ja, aktualisieren',
    cancel: 'Abbrechen',
    stopRecording: 'Aufnahme beenden',
    voiceInput: 'Spracheingabe',
    newDay: 'neuen Tag',
    saturday: 'Samstag',
    sunday: 'Sonntag',
    tomorrow: 'morgen',
    friday: 'Freitag',
    monday: 'Montag',
  },
};

export const LumaTalkScreen: React.FC<LumaTalkScreenProps> = ({
  language,
  moments = [],
  onAddNewMoment,
  onApplyAction,
  onDeleteMoment,
  onUpdateMoment,
  plan,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;
  const tk = LOCALIZED_TALK_STRINGS[language] || LOCALIZED_TALK_STRINGS.en;

  const [messages, setMessages] = useState<VoiceMessage[]>([
    {
      id: 'm1',
      sender: 'luma',
      text: t.lumaGreeting,
      timestamp: 'Now',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isThinking, setIsThinking] = useState(false);
  const [eventContext, setEventContext] = useState<LumaEventContext | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const {
    isListening,
    transcript,
    interimTranscript,
    startListening,
    stopListening,
    resetTranscript,
  } = useSpeechRecognition(language);

  // Auto-scroll to bottom of conversation
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isThinking, isListening]);

  const handleToggleMic = () => {
    if (isListening) {
      stopListening();
      if (transcript.trim()) {
        setInputValue(transcript.trim());
      }
    } else {
      resetTranscript();
      startListening();
    }
  };

  const currentSpeech = (transcript + (interimTranscript ? ` ${interimTranscript}` : '')).trim();

  const handleAcceptProposal = (messageId: string, proposal: NonNullable<VoiceMessage['proposal']>) => {
    if (proposal.type === 'delete') {
      if (onDeleteMoment) {
        onDeleteMoment(proposal.momentId);
      }
      
      const confirmationMsg: VoiceMessage = {
        id: `l_${Date.now()}`,
        sender: 'luma',
        text: tk.deletedSuccess,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => 
        prev.map(m => m.id === messageId ? { ...m, proposal: undefined } : m).concat(confirmationMsg)
      );
    } else if (proposal.type === 'edit' && proposal.changes) {
      if (onUpdateMoment) {
        let daysLeft = undefined;
        if (proposal.changes.targetDate) {
          const parts = proposal.changes.targetDate.split('-');
          if (parts.length === 3) {
            const yr = parseInt(parts[0], 10);
            const mo = parseInt(parts[1], 10) - 1;
            const da = parseInt(parts[2], 10);
            const now = new Date();
            const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            const target0 = new Date(yr, mo, da);
            daysLeft = Math.round((target0.getTime() - today0.getTime()) / (1000 * 60 * 60 * 24));
          }
        }
        onUpdateMoment(proposal.momentId, {
          ...proposal.changes,
          ...(daysLeft !== undefined ? { daysLeft } : {}),
        });
      }
      
      const confirmationMsg: VoiceMessage = {
        id: `l_${Date.now()}`,
        sender: 'luma',
        text: tk.rescheduledSuccess,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => 
        prev.map(m => m.id === messageId ? { ...m, proposal: undefined } : m).concat(confirmationMsg)
      );
    }
  };

  const handleRejectProposal = (messageId: string) => {
    const cancelMsg: VoiceMessage = {
      id: `l_${Date.now()}`,
      sender: 'luma',
      text: tk.actionCancelled,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => 
      prev.map(m => m.id === messageId ? { ...m, proposal: undefined } : m).concat(cancelMsg)
    );
  };

  const handleSend = async (textToSend?: string) => {
    const text = textToSend || inputValue || currentSpeech;
    if (!text.trim()) return;

    if (isListening) {
      stopListening();
    }

    const userMsg: VoiceMessage = {
      id: `u_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    resetTranscript();

    // Check if there is an active proposal in the last few messages
    const lastMsgWithProposal = [...messages].reverse().find(m => m.proposal !== undefined);
    if (lastMsgWithProposal && lastMsgWithProposal.proposal) {
      const lower = text.toLowerCase().trim();
      if (/yes|да|confirm|подтвержд|давай|ок|ok/i.test(lower)) {
        handleAcceptProposal(lastMsgWithProposal.id, lastMsgWithProposal.proposal);
        return;
      } else if (/no|нет|cancel|отмен|не надо|не/i.test(lower)) {
        handleRejectProposal(lastMsgWithProposal.id);
        return;
      }
    }

    // Direct deletion or update pattern recognition
    const lowerText = text.toLowerCase();
    const isDeleteRequest = /delete|remove|cancel|удали|убрать|стереть|отменить/i.test(lowerText);
    const isEditRequest = /move|reschedule|change|postpone|перенеси|поменяй|отложи/i.test(lowerText);
    
    const matchedMoment = findMatchingMoment(text, moments);

    if (isDeleteRequest && matchedMoment) {
      const lumaMsg: VoiceMessage = {
        id: `l_${Date.now()}`,
        sender: 'luma',
        text: tk.confirmDelete(matchedMoment.title),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposal: {
          type: 'delete',
          momentId: matchedMoment.id,
        }
      };
      setMessages((prev) => [...prev, lumaMsg]);
      return;
    }

    if (isEditRequest && matchedMoment) {
      let targetDay = tk.newDay;
      let proposedDateStr = '';
      
      if (lowerText.includes('saturday') || lowerText.includes('суббот')) {
        targetDay = tk.saturday;
        const d = new Date();
        const day = d.getDay();
        const diff = (6 - day + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        proposedDateStr = toLocalDateString(d);
      } else if (lowerText.includes('sunday') || lowerText.includes('воскрес')) {
        targetDay = tk.sunday;
        const d = new Date();
        const day = d.getDay();
        const diff = (7 - day + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        proposedDateStr = toLocalDateString(d);
      } else if (lowerText.includes('tomorrow') || lowerText.includes('завтра')) {
        targetDay = tk.tomorrow;
        const d = new Date();
        d.setDate(d.getDate() + 1);
        proposedDateStr = toLocalDateString(d);
      } else if (lowerText.includes('friday') || lowerText.includes('пятниц')) {
        targetDay = tk.friday;
        const d = new Date();
        const day = d.getDay();
        const diff = (5 - day + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        proposedDateStr = toLocalDateString(d);
      } else if (lowerText.includes('monday') || lowerText.includes('понедельн')) {
        targetDay = tk.monday;
        const d = new Date();
        const day = d.getDay();
        const diff = (1 - day + 7) % 7 || 7;
        d.setDate(d.getDate() + diff);
        proposedDateStr = toLocalDateString(d);
      }

      let extractedTime = '';
      const timeColonMatch = lowerText.match(/([01]?\d|2[0-3])[:\.]([0-5]\d)/);
      if (timeColonMatch) {
        extractedTime = `${timeColonMatch[1].padStart(2, '0')}:${timeColonMatch[2]}`;
      } else {
        const simpleHourMatch = lowerText.match(/(?:в|at)\s*([01]?\d|2[0-3])(?:\s*(?:часов|ч|hours|h|дня|утра))?/i);
        if (simpleHourMatch) {
          let hr = parseInt(simpleHourMatch[1], 10);
          if (lowerText.includes('дня') && hr < 12) hr += 12;
          if (lowerText.includes('вечера') && hr < 12) hr += 12;
          extractedTime = `${hr.toString().padStart(2, '0')}:00`;
        }
      }

      const lumaMsg: VoiceMessage = {
        id: `l_${Date.now()}`,
        sender: 'luma',
        text: tk.confirmReschedule(matchedMoment.title, targetDay),
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        proposal: {
          type: 'edit',
          momentId: matchedMoment.id,
          changes: {
            dateLabel: targetDay,
            targetDate: proposedDateStr || matchedMoment.targetDate,
            timeOfDay: extractedTime || matchedMoment.timeOfDay,
          }
        }
      };
      setMessages((prev) => [...prev, lumaMsg]);
      return;
    }

    setIsThinking(true);

    try {
      let currentCtx = eventContext;

      // Check if message references an existing LifeMoment in state
      const matchedMoment = findMatchingMoment(text, moments);

      if (matchedMoment) {
        currentCtx = {
          momentId: matchedMoment.id,
          originalEvent: matchedMoment.title,
          eventType: matchedMoment.category,
          targetDate: matchedMoment.targetDate,
          date: getLocalizedDateLabel(matchedMoment, language),
          time: matchedMoment.timeOfDay || '',
          timezone: matchedMoment.timezone,
          gentleSteps: matchedMoment.gentleSteps,
          discoveredFacts: [],
        };
        setEventContext(currentCtx);
      } else if (!currentCtx) {
        // If no existing moment match and no context yet, create a new moment entry
        const entryResult = await createLumaEntry({
          text,
          language,
          source: 'talk_screen',
          plan,
        });

        if (entryResult.success && entryResult.moment) {
          onAddNewMoment(entryResult.moment);
          currentCtx = {
            momentId: entryResult.moment.id,
            originalEvent: text,
            eventType: entryResult.moment.category,
            targetDate: entryResult.moment.targetDate,
            date: getLocalizedDateLabel(entryResult.moment, language),
            time: entryResult.moment.timeOfDay || '',
            timezone: entryResult.moment.timezone,
            gentleSteps: entryResult.moment.gentleSteps,
            discoveredFacts: [],
          };
          setEventContext(currentCtx);
        } else {
          currentCtx = {
            originalEvent: text,
            discoveredFacts: [],
          };
          setEventContext(currentCtx);
        }
      }

      // Build conversation history
      const conversationHistory = [...messages, userMsg].map((m) => ({
        sender: m.sender,
        text: m.text,
      }));

      // Send to talk companion API for conversational reply and structured action
      const authToken = await getAuthToken();
      const res = await fetch('/api/luma-talk', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          message: text,
          language,
          eventContext: currentCtx,
          history: conversationHistory,
          moments,
          currentClientTime: getLocalTimestamp(),
          plan,
        }),
      });

      let replyText = '';
      if (res.ok) {
        const data = await res.json();
        replyText = data.reply;
        if (data.updatedContext) {
          setEventContext(data.updatedContext);
        }
        if (data.action && onApplyAction) {
          onApplyAction(data.action);
        }
      }

      if (!replyText) {
        replyText = t.lumaFallbackReply;
      }

      const lumaMsg: VoiceMessage = {
        id: `l_${Date.now()}`,
        sender: 'luma',
        text: replyText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, lumaMsg]);
    } catch (e) {
      const fallbackMsg: VoiceMessage = {
        id: `l_${Date.now()}`,
        sender: 'luma',
        text: t.lumaNetworkErrorReply,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMsg]);
    } finally {
      setIsThinking(false);
    }
  };

  return (
    <div className="relative text-[#2D2825] flex flex-col flex-1 h-full min-h-0 w-full animate-fade-in overflow-hidden">
      {/* Top Header - Part of the talk space, non-carded */}
      <div className="pt-1 pb-2.5 px-2 border-b border-[#E4DDD3]/60 shrink-0 text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-0.5 rounded-full bg-white text-[#68705C] text-[11px] font-medium border border-[#E4DDD3]">
          <LumaLotusIcon className="w-3.5 h-3.5" />
          <span>{t.talkToLuma}</span>
        </div>
        <p className="text-[11px] text-[#8A827A] px-2 leading-tight">
          {t.lumaListeningSubtitle}
        </p>
      </div>

      {/* Scrollable Conversation Workspace */}
      <div className="flex-1 min-w-0 overflow-y-auto space-y-3 px-1 py-3 my-1 scrollbar-thin">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`flex flex-col ${
              m.sender === 'user' ? 'items-end' : 'items-start'
            }`}
          >
            <div
              className={`max-w-[85%] p-3.5 rounded-2xl text-xs leading-relaxed ${
                m.sender === 'user'
                  ? 'bg-[#2D2825] text-[#FAF8F5] rounded-br-none'
                  : 'bg-white border border-[#E4DDD3] text-[#2D2825] font-serif text-sm rounded-bl-none shadow-2xs'
              }`}
            >
              <div>{m.text}</div>
              
              {m.proposal && (
                <div className="mt-3 p-3 rounded-xl bg-[#FAF7F2] border border-[#E5DFD4] space-y-2 text-xs">
                  <div className="font-semibold text-[#2C2723]">
                    {m.proposal.type === 'delete' 
                      ? tk.confirmationRequired
                      : tk.confirmReschedulingTitle}
                  </div>
                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => handleAcceptProposal(m.id, m.proposal!)}
                      className="px-3 py-1.5 rounded-full bg-[#2C2723] text-white hover:bg-[#3D3732] font-semibold transition text-[10px] cursor-pointer shadow-xs"
                    >
                      {m.proposal.type === 'delete'
                        ? tk.yesDelete
                        : tk.yesUpdate}
                    </button>
                    <button
                      onClick={() => handleRejectProposal(m.id)}
                      className="px-3 py-1.5 rounded-full bg-white border border-[#E5DFD4] hover:bg-[#FAF7F2] text-[#6B6258] font-semibold transition text-[10px] cursor-pointer"
                    >
                      {tk.cancel}
                    </button>
                  </div>
                </div>
              )}
            </div>
            <span className="text-[9px] text-[#8A827A] mt-1 px-1">{m.timestamp}</span>
          </div>
        ))}

        {isThinking && (
          <div className="flex items-center gap-2 text-xs text-[#68705C] font-serif italic py-2 px-1">
            <LumaLotusIcon className="w-4 h-4 animate-spin" />
            <span>{t.lumaThinking}</span>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Live speech feedback if recording */}
      {isListening && (
        <div className="p-2.5 mb-2 rounded-2xl bg-white border border-[#68705C]/50 text-xs text-[#68705C] italic shrink-0 animate-pulse flex items-center gap-2 w-full">
          <LumaVoiceIcon className="w-3.5 h-3.5 text-[#68705C] shrink-0" />
          <span className="break-words line-clamp-2">{currentSpeech || t.listeningToYou}</span>
        </div>
      )}

      {/* Suggested prompts - only shown at start before user messages */}
      {messages.length <= 1 && (
        <div className="flex items-center justify-end gap-2 overflow-x-auto text-[11px] shrink-0 py-1.5 scrollbar-none w-full">
          <button
            onClick={() => handleSend(t.promptDoctor)}
            className="px-3 py-1.5 rounded-full bg-white border border-[#E4DDD3] text-[#2D2825] hover:border-[#68705C] transition shrink-0 cursor-pointer"
          >
            "{t.promptDoctor}"
          </button>
          <button
            onClick={() => handleSend(t.promptInterview)}
            className="px-3 py-1.5 rounded-full bg-white border border-[#E4DDD3] text-[#2D2825] hover:border-[#68705C] transition shrink-0 cursor-pointer"
          >
            "{t.promptInterview}"
          </button>
        </div>
      )}

      {/* Fixed Composer Box */}
      <div className="p-2 bg-[#F4EFEA] border border-[#E4DDD3] rounded-3xl flex items-center gap-2 shrink-0">
        <button
          onClick={handleToggleMic}
          className={`p-2.5 rounded-full transition shrink-0 cursor-pointer ${
            isListening ? 'bg-[#68705C] text-white animate-pulse' : 'bg-white text-[#2D2825] hover:bg-[#E4DDD3]'
          }`}
          title={isListening ? tk.stopRecording : tk.voiceInput}
        >
          <LumaVoiceIcon className="w-4 h-4" strokeWidth={1.25} />
        </button>

        <input
          type="text"
          value={inputValue || (isListening ? currentSpeech : '')}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
          placeholder={t.sayWhatsComing}
          className="flex-1 min-w-0 bg-transparent px-2 py-2 text-xs text-[#2D2825] placeholder-[#8A827A] focus:outline-none"
        />

        <button
          onClick={() => handleSend()}
          disabled={!inputValue.trim() && !currentSpeech.trim()}
          className="p-2.5 rounded-full bg-[#2D2825] text-[#FAF8F5] hover:bg-[#1A1816] disabled:opacity-40 transition shrink-0 cursor-pointer text-xs font-medium px-4"
        >
          {t.send}
        </button>
      </div>
    </div>
  );
};

