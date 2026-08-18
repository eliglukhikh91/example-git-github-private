import React, { useEffect, useRef, useState } from 'react';
import { MessageSquare, Send, Smile, X } from 'lucide-react';
import { useApp } from '../context/AppContext';

/**
 * Чат компании.
 *
 * Раньше жил внутри тематического модального окна вместе с музыкальным плеером
 * и был привязан к праздничной теме. Теперь это постоянный раздел, доступный
 * всем сотрудникам независимо от активной темы, а музыка из продукта убрана.
 *
 * Сообщения хранятся с привязкой к каналу. В интерфейсе пока один общий канал,
 * переключателя нет — но данные уже готовы к группам по интересам.
 */

// Один набор эмодзи вместо прежних двух дублирующих панелей.
const EMOJIS = [
  '🎉', '🌸', '🎂', '❄️', '👍', '❤️', '✨', '🥳',
  '☕', '🎁', '🍾', '🔥', '👏', '😊', '🚀', '🎈',
  '⭐', '🙌', '🥇', '🥂', '💐', '🍰', '😄', '🤝'
];

function pluralizeMessages(count: number): string {
  const mod10 = count % 10;
  const mod100 = count % 100;
  if (mod10 === 1 && mod100 !== 11) return 'сообщение';
  if (mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14)) return 'сообщения';
  return 'сообщений';
}

export const ChatView: React.FC = () => {
  const { chatMessages, chatChannels, activeChannelId, sendChatMessage, userProfile } = useApp();

  const [text, setText] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [chatMessages.length]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    setIsSending(true);
    setText('');
    setShowEmojiPicker(false);
    try {
      await sendChatMessage(trimmed);
    } finally {
      setIsSending(false);
    }
  };

  const channelName =
    chatChannels.find((channel) => channel.id === activeChannelId)?.name ?? 'Общий чат';

  const myName =
    userProfile.displayName || `${userProfile.lastName} ${userProfile.firstName}`.trim();

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      <div className="bg-white rounded-2xl border border-slate-200 p-6">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-xl bg-accent-soft flex items-center justify-center shrink-0">
            <MessageSquare className="w-5 h-5 text-accent" />
          </div>
          <div className="min-w-0">
            <h2 className="text-xl font-black text-slate-900 tracking-tight">Чат</h2>
            <p className="text-xs text-slate-500">
              {channelName} · {chatMessages.length} {pluralizeMessages(chatMessages.length)}
            </p>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 flex flex-col">
        <div className="flex-1 p-4 sm:p-5 space-y-3 max-h-[55vh] overflow-y-auto">
          {chatMessages.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <MessageSquare className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-bold text-slate-700">Сообщений пока нет</p>
              <p className="text-xs text-slate-500">Напишите первым — коллеги увидят сразу.</p>
            </div>
          ) : (
            chatMessages.map((message) => {
              const isMine = message.author === myName;
              return (
                <div
                  key={message.id}
                  className={`p-3 rounded-xl border ${
                    isMine ? 'bg-accent-soft border-accent/20' : 'bg-slate-50 border-slate-200'
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
            className="flex-1 min-w-0 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:bg-white focus:border-accent focus:ring-2 focus:ring-accent/20 outline-hidden"
          />

          <button
            type="submit"
            disabled={!text.trim() || isSending}
            className="px-4 py-2.5 bg-accent hover:bg-accent-hover disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-2 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span className="hidden sm:inline">Отправить</span>
          </button>
        </form>
      </div>
    </div>
  );
};
