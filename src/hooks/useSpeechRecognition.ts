import { useState, useEffect, useRef, useCallback } from 'react';
import { LanguageCode } from '../data/translations';

export interface SpeechRecognitionState {
  isSupported: boolean;
  isListening: boolean;
  transcript: string;
  interimTranscript: string;
  error: string | null;
}

export function useSpeechRecognition(language: LanguageCode) {
  const [isSupported, setIsSupported] = useState<boolean>(false);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const [interimTranscript, setInterimTranscript] = useState<string>('');
  const [error, setError] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);

  // Safely evaluate browser support strictly on client side after mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
    } else {
      setIsSupported(false);
    }
  }, []);

  const getLangCode = useCallback((lang: LanguageCode) => {
    switch (lang) {
      case 'ru': return 'ru-RU';
      case 'es': return 'es-ES';
      case 'fr': return 'fr-FR';
      case 'it': return 'it-IT';
      case 'de': return 'de-DE';
      case 'pt': return 'pt-PT';
      case 'tr': return 'tr-TR';
      case 'zh': return 'zh-CN';
      default: return 'en-US';
    }
  }, []);

  const startListening = useCallback(() => {
    setError(null);
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setError(
        language === 'ru'
          ? 'Ваш браузер не поддерживает встроенное распознавание речи. Вы можете ввести текст вручную.'
          : 'Speech recognition is not supported in this browser. Please use text input.'
      );
      return;
    }

    try {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }

      const recognition = new SpeechRecognition();
      recognition.continuous = true;
      recognition.interimResults = true;
      recognition.lang = getLangCode(language);

      recognition.onstart = () => {
        setIsListening(true);
        setError(null);
      };

      recognition.onresult = (event: any) => {
        let finalStr = '';
        let interimStr = '';

        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const res = event.results[i];
          if (res.isFinal) {
            finalStr += res[0].transcript;
          } else {
            interimStr += res[0].transcript;
          }
        }

        if (finalStr) {
          setTranscript((prev) => (prev ? `${prev} ${finalStr}` : finalStr));
        }
        setInterimTranscript(interimStr);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
          setError(
            language === 'ru'
              ? 'Доступ к микрофону отклонен. Пожалуйста, разрешите доступ к микрофону в браузере или используйте ввод текста.'
              : 'Microphone permission denied. Please allow microphone access or use text input.'
          );
        } else if (event.error !== 'no-speech') {
          setError(
            language === 'ru'
              ? 'Произошла ошибка при распознавании речи. Вы можете ввести текст ниже.'
              : 'Speech recognition encountered an issue. You can enter text manually below.'
          );
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
        setInterimTranscript('');
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      console.error('Failed to start speech recognition:', err);
      setIsListening(false);
      setError(
        language === 'ru'
          ? 'Не удалось запустить микрофон. Введите текст вручную.'
          : 'Could not activate microphone. Please type your input.'
      );
    }
  }, [language, getLangCode]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try {
        recognitionRef.current.stop();
      } catch (e) {
        console.warn('Error stopping recognition:', e);
      }
    }
    setIsListening(false);
    setInterimTranscript('');
  }, []);

  const resetTranscript = useCallback(() => {
    setTranscript('');
    setInterimTranscript('');
    setError(null);
  }, []);

  return {
    isSupported,
    isListening,
    transcript,
    interimTranscript,
    error,
    setTranscript,
    startListening,
    stopListening,
    resetTranscript,
  };
}
