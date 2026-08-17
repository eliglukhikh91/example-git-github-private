import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Smile, X } from 'lucide-react';
import { useApp } from '../context/AppContext';
import { getTheme } from '../utils/themes';

/**
 * Праздничный чат.
 *
 * Раньше жил внутри тематического модального окна вместе с плеером и
 * плейлистом. Теперь это обычная страница — как RandomCoffeeView, — а музыка
 * из продукта убрана.
 */

// Один набор эмодзи вместо прежних двух дублирующих панелей.
const EMOJIS = [
  '🎉', '🌸', '🎂', '❄️', '👍', '❤️', '✨', '🥳',
  '☕', '🎁', '🍾', '🔥', '👏', '😊', '🚀', '🎈',
  '⭐', '🙌', '🥇', '🥂', '💐', '🍰', '😄', '🤝'
];

export const HolidayChatView: React.FC = () => {
  const { holidayChatMessages, addHolidayChatMessage, userProfile, theme } = useApp();

  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [holidayChatMessages.length]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setText('');
    setShowEmojiPicker(false);
    try {
      await addHolidayChatMessage(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const themeInfo = getTheme(theme);

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-[#f0f6fc] flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-[#1560AA]" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Праздничный чат</h2>
            <p className="text-xs text-slate-500">
              Общий чат компании
              {theme !== 'classic' ? ` · ${themeInfo.label}` : ''} · {holidayChatMessages.length}{' '}
              {holidayChatMessages.length === 1 ? 'сообщение' : 'сообщений'}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 flex flex-col">
        <div className="flex-1 p-4 sm:p-5 space-y-3 max-h-[55vh] overflow-y-auto">
          {holidayChatMessages.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Сообщений пока нет</p>
              <p className="text-xs text-slate-500">Напишите первым — коллеги увидят сразу.</p>
            </div>
          ) : (
            holidayChatMessages.map((message) => {
              const isMine =
                message.author ===
                (userProfile.displayName ||
                  `${userProfile.lastName} ${userProfile.firstName}`.trim());

              return (
                <div
                  key={message.id}
                  className={`p-3 rounded-xl border ${
                    isMine ? 'bg-[#f0f6fc] border-[#1560AA]/20' : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-baseline justify-between gap-3">
                    <span className="text-xs font-extrabold text-slate-900 truncate">
                      {message.author}
                      {message.department ? (
                        <span className="font-medium text-slate-400"> · {message.department}</span>
                      ) : null}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">{message.time}</span>
                  </div>
                  <p className="text-sm text-slate-800 leading-snug mt-1 whitespace-pre-wrap break-words">
                    {message.text}
                  </p>
                </div>
              );
            })
          )}
          <div ref={bottomRef} />
        </div>

        {showEmojiPicker && (
          <div className="px-4 sm:px-5 pb-3">
            <div className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
              <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-1">
                <span>Эмодзи</span>
                <button
                  type="button"
                  onClick={() => setShowEmojiPicker(false)}
                  className="text-slate-400 hover:text-slate-700"
                  aria-label="Закрыть выбор эмодзи"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
              <div className="grid grid-cols-8 gap-1 text-base text-center">
                {EMOJIS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setText((prev) => prev + emoji)}
                    className="p-1.5 hover:bg-white rounded-lg transition-colors"
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <form
          onSubmit={handleSubmit}
          className="border-t border-slate-200 p-3 sm:p-4 flex items-center gap-2"
        >
          <button
            type="button"
            onClick={() => setShowEmojiPicker((prev) => !prev)}
            className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-colors shrink-0"
            aria-label="Выбрать эмодзи"
          >
            <Smile className="w-4 h-4" />
          </button>

          <input
            type="text"
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder="Написать сообщение…"
            maxLength={2000}
            className="flex-1 min-w-0 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-[#1560AA] focus:ring-2 focus:ring-[#1560AA]/20 outline-hidden"
          />

          <button
            type="submit"
            disabled={!text.trim() || isSending}
            className="px-4 py-2.5 bg-[#1560AA] hover:bg-[#104d88] disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Отправить</span>
          </button>
        </form>
      </div>
    </div>
  );
};
