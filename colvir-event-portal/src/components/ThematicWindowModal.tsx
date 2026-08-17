import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ThemeType } from '../types';
import confetti from 'canvas-confetti';
import blueGiftBoxImg from '../assets/images/blue_gift_box_1785842784484.jpg';
import springFlowerImg from '../assets/images/spring_flower_icon_1785843467346.jpg';
import newYearTreeImg from '../assets/images/new_year_tree_icon_1785843481320.jpg';
import {
  X,
  Sparkles,
  Volume2,
  Pause,
  MessageSquare,
  Send,
  CheckCircle2,
  Play,
  Music,
  Radio,
  PowerOff,
  Smile,
  PlusCircle,
  Disc,
  ListMusic
} from 'lucide-react';

export const ThematicWindowModal: React.FC = () => {
  const {
    theme,
    setTheme,
    isThemeModalOpen,
    setIsThemeModalOpen,
    holidayChatMessages,
    holidayPlaylistTracks,
    addHolidayChatMessage,
    addHolidayTrack
  } = useApp();

  const [activeTab, setActiveTab] = useState<ThemeType>(
    theme === 'classic' ? 'birthday' : theme
  );
  const [isPlayingAudio, setIsPlayingAudio] = useState<boolean>(true);
  const [currentTrackIndex, setCurrentTrackIndex] = useState<number>(0);

  // Chat & Emoji State
  const [newMsgText, setNewMsgText] = useState<string>('');
  const [showEmojiPicker, setShowEmojiPicker] = useState<boolean>(false);

  // Add Music Modal/Popover State
  const [showAddMusicModal, setShowAddMusicModal] = useState<boolean>(false);
  const [musicTitle, setMusicTitle] = useState<string>('');
  const [musicArtist, setMusicArtist] = useState<string>('');
  const [musicMood, setMusicMood] = useState<string>('Праздник & Дзен');
  const [musicDuration, setMusicDuration] = useState<string>('3:30');

  // Currently playing music message ID in chat
  const [playingMessageTrackId, setPlayingMessageTrackId] = useState<string | null>(null);

  if (!isThemeModalOpen) return null;

  const STANDARD_EMOJIS = [
    '🎉', '🌸', '🎂', '❄️', '👍', '❤️', '✨', '🥳',
    '🎵', '☕', '🎁', '🍾', '🔥', '👏', '😊', '🚀',
    '🍰', '🎈', '⭐', '🙌', '🎶', '🥇', '🥂', '💐'
  ];

  const triggerThemeConfetti = (type: ThemeType) => {
    if (type === 'birthday') {
      confetti({
        particleCount: 100,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#3B82F6', '#EF4444', '#10B981']
      });
    } else if (type === 'spring') {
      confetti({
        particleCount: 100,
        spread: 90,
        origin: { y: 0.6 },
        colors: ['#EC4899', '#F472B6', '#3B82F6', '#10B981']
      });
    } else if (type === 'newyear') {
      confetti({
        particleCount: 120,
        spread: 100,
        origin: { y: 0.6 },
        colors: ['#FFFFFF', '#93C5FD', '#60A5FA', '#3B82F6']
      });
    }
  };

  const handleSelectTheme = (selected: ThemeType) => {
    setActiveTab(selected);
    setTheme(selected);
    triggerThemeConfetti(selected);
  };

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMsgText.trim()) return;

    addHolidayChatMessage(newMsgText.trim());
    setNewMsgText('');
    setShowEmojiPicker(false);
  };

  const handleAddEmoji = (emoji: string) => {
    setNewMsgText((prev) => prev + emoji);
  };

  const handleAddMusicSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!musicTitle.trim()) return;

    addHolidayTrack({
      title: musicTitle.trim(),
      artist: musicArtist.trim() || 'Colvir Sound',
      duration: musicDuration.trim() || '3:30',
      mood: musicMood.trim() || 'Праздничное Настроение'
    });

    setMusicTitle('');
    setMusicArtist('');
    setShowAddMusicModal(false);
  };

  const getThemeDetails = () => {
    switch (activeTab) {
      case 'spring':
        return {
          title: '🌸 Colvir Spring',
          subtitle: 'Сезон вдохновения, свежих идей и весенних цветов в компании',
          heroIcon: '🌸',
          effectLabel: 'Праздничное оформление',
          greetingMsg: 'Время цветения, ярких идей и легких релизов!'
        };
      case 'birthday':
        return {
          title: '🎂 День Рождения Colvir',
          subtitle: 'Празднуем успехи компании, с тортом, музыкой и отличным настроением!',
          heroIcon: '🎂',
          effectLabel: 'Праздничное оформление',
          greetingMsg: 'Празднуем победы и успехи Colvir вместе!'
        };
      case 'newyear':
      default:
        return {
          title: '🎄 Новый Год в Colvir',
          subtitle: 'Зимняя сказка, праздничный чат и дайджест',
          heroIcon: '❄️',
          effectLabel: 'Праздничное оформление',
          greetingMsg: 'Тепла, уютных праздников и волшебного настроения!'
        };
    }
  };

  const currentInfo = getThemeDetails();

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-md flex items-center justify-center p-3 sm:p-6 animate-fade-in">
      
      {/* Main 3D Soft Blue Glass Modal */}
      <div className="relative w-full max-w-5xl bg-gradient-to-br from-[#EBF3FE] via-[#DDEBFE] to-[#C8E0FE] rounded-[36px] shadow-[0_24px_60px_rgba(25,75,160,0.25),inset_0_2px_6px_rgba(255,255,255,0.9)] border-2 border-white p-5 sm:p-8 space-y-6 overflow-hidden my-auto">
        
        {/* Soft Background Blur Blobs */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-400/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-80 h-80 bg-cyan-400/20 rounded-full blur-3xl pointer-events-none" />

        {/* Modal Top Header */}
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-white/60 pb-5">
          <div className="space-y-1">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/80 border border-white text-[#1560AA] text-xs font-black shadow-xs">
              <Sparkles className="w-4 h-4 text-[#1560AA]" />
              <span>{currentInfo.effectLabel}</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
              {currentInfo.title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 font-medium">
              {currentInfo.subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-3 shrink-0">
            {/* Theme Selector Tabs */}
            <div className="p-1.5 bg-white/80 border border-white rounded-2xl shadow-xs flex items-center gap-1">
              <button
                onClick={() => handleSelectTheme('birthday')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'birthday' && theme !== 'classic'
                    ? 'bg-[#1560AA] text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100/80'
                }`}
              >
                <span>🎁 День Рождения</span>
              </button>

              <button
                onClick={() => handleSelectTheme('spring')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'spring' && theme !== 'classic'
                    ? 'bg-[#1560AA] text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100/80'
                }`}
              >
                <span>🌸 Colvir Spring</span>
              </button>

              <button
                onClick={() => handleSelectTheme('newyear')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'newyear' && theme !== 'classic'
                    ? 'bg-[#1560AA] text-white shadow-md'
                    : 'text-slate-700 hover:bg-slate-100/80'
                }`}
              >
                <span>❄️ Новый Год</span>
              </button>
            </div>

            {/* BUTTON: OFF HOLIDAY MOOD */}
            <button
              onClick={() => {
                setTheme('classic');
              }}
              className={`px-3.5 py-2 rounded-2xl text-xs font-black transition-all flex items-center gap-1.5 shadow-xs cursor-pointer border ${
                theme === 'classic'
                  ? 'bg-slate-800 text-white border-slate-900 ring-2 ring-slate-400'
                  : 'bg-white hover:bg-red-50 text-red-600 hover:text-red-700 border-red-200'
              }`}
              title="Отключить праздничное настроение и возвратиться к обычному стилю"
            >
              <PowerOff className="w-4 h-4" />
              <span>Отключить праздничное настроение</span>
            </button>

            {/* Close Button */}
            <button
              onClick={() => setIsThemeModalOpen(false)}
              className="p-2.5 bg-white/90 hover:bg-white text-slate-700 hover:text-slate-900 rounded-2xl border border-white shadow-xs transition-all cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content Grid: Left (Hero Stage & Playlist) + Right (Holiday Chat) */}
        <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          
          {/* LEFT SIDE: Hero Stage + Holiday Playlist */}
          <div className="lg:col-span-5 space-y-5 flex flex-col justify-between">
            
            {/* Hero Central Stage */}
            <div className="bg-white/85 backdrop-blur-xl border-2 border-white rounded-[28px] p-5 shadow-[0_12px_28px_rgba(28,78,160,0.12),inset_0_2px_4px_rgba(255,255,255,0.9)] text-center space-y-3">
              
              {/* 3D Pedestal Symbol */}
              <div className="relative inline-block my-1">
                <div className="w-28 h-28 rounded-3xl bg-gradient-to-br from-[#2573c8] via-[#1560AA] to-[#0e4379] border-4 border-white shadow-[0_16px_36px_rgba(21,96,170,0.4),inset_0_4px_8px_rgba(255,255,255,0.6)] flex items-center justify-center text-5xl text-white mx-auto transform hover:scale-105 transition-transform overflow-hidden">
                  {theme === 'classic' ? (
                    '🏢'
                  ) : activeTab === 'birthday' ? (
                    <div className="relative w-full h-full p-1 flex flex-col items-center justify-center">
                      <div className="absolute top-1 z-10 flex items-center gap-1">
                        <span className="text-xs animate-candle-flicker text-amber-300 filter drop-shadow-[0_0_6px_rgba(251,191,36,1)]">🔥</span>
                        <span className="text-sm animate-candle-flicker text-amber-300 filter drop-shadow-[0_0_8px_rgba(251,191,36,1)] delay-75">🔥</span>
                        <span className="text-xs animate-candle-flicker text-amber-300 filter drop-shadow-[0_0_6px_rgba(251,191,36,1)] delay-150">🔥</span>
                      </div>
                      <img src={blueGiftBoxImg} alt="Gift Box Cake" className="w-full h-full object-cover rounded-2xl" />
                    </div>
                  ) : activeTab === 'spring' ? (
                    <div className="w-full h-full p-1">
                      <img src={springFlowerImg} alt="Spring Flower" className="w-full h-full object-cover rounded-2xl" />
                    </div>
                  ) : activeTab === 'newyear' ? (
                    <div className="w-full h-full p-1">
                      <img src={newYearTreeImg} alt="New Year Tree" className="w-full h-full object-cover rounded-2xl" />
                    </div>
                  ) : (
                    currentInfo.heroIcon
                  )}
                </div>
                <div className="absolute -top-2 -right-2 w-7 h-7 bg-amber-400 text-slate-900 rounded-full flex items-center justify-center font-black border-2 border-white shadow-xs text-xs">
                  ★
                </div>
              </div>

              <div>
                <p className="text-xs font-bold text-slate-700 bg-blue-50 px-3 py-1.5 rounded-xl inline-block border border-blue-200/80">
                  {theme === 'classic'
                    ? 'Классический корпоративный режим Colvir включен'
                    : currentInfo.greetingMsg}
                </p>
              </div>

              {theme !== 'classic' ? (
                <div className="space-y-2 pt-1">
                  <button
                    onClick={() => {
                      setTheme(activeTab);
                      triggerThemeConfetti(activeTab);
                    }}
                    className="w-full py-2.5 bg-[#1560AA] hover:bg-[#104d88] text-white font-black text-xs rounded-2xl shadow-md border border-white/60 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4 text-amber-300" />
                    <span>Применить {currentInfo.title}</span>
                  </button>

                  <button
                    onClick={() => setTheme('classic')}
                    className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer border border-slate-200"
                  >
                    <PowerOff className="w-3.5 h-3.5 text-slate-500" />
                    <span>Отключить праздничное настроение</span>
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => handleSelectTheme('birthday')}
                  className="w-full py-2.5 bg-[#1560AA] hover:bg-[#104d88] text-white font-black text-xs rounded-2xl shadow-md border border-white/60 transition-all active:scale-95 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-amber-300" />
                  <span>Включить Праздничное Настроение</span>
                </button>
              )}
            </div>

            {/* Holiday Playlist Box */}
            <div className="bg-white/85 backdrop-blur-xl border-2 border-white rounded-[28px] p-4 shadow-[0_12px_28px_rgba(28,78,160,0.12),inset_0_2px_4px_rgba(255,255,255,0.9)] space-y-3">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-[#1560AA] text-white flex items-center justify-center shadow-xs">
                    <Radio className="w-4 h-4 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-xs font-black text-slate-900">Праздничный Плейлист</h3>
                    <p className="text-[10px] text-slate-500 font-bold">Colvir Radio • Live ({holidayPlaylistTracks.length} треков)</p>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowAddMusicModal(true)}
                    className="px-2.5 py-1 rounded-xl bg-[#1560AA] hover:bg-[#104d88] text-white font-extrabold text-[11px] flex items-center gap-1 transition-all cursor-pointer shadow-2xs"
                    title="Добавить музыку для всех"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Музыка</span>
                  </button>

                  <button
                    onClick={() => setIsPlayingAudio(!isPlayingAudio)}
                    className="p-1.5 rounded-xl bg-blue-100 hover:bg-blue-200 text-[#1560AA] font-black text-xs transition-all cursor-pointer"
                  >
                    {isPlayingAudio ? <Pause className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>

              {/* Playlist Tracks */}
              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                {holidayPlaylistTracks.map((track, idx) => (
                  <button
                    key={track.id || idx}
                    onClick={() => {
                      setCurrentTrackIndex(idx);
                      setIsPlayingAudio(true);
                    }}
                    className={`w-full p-2 rounded-xl border text-left transition-all flex items-center justify-between ${
                      currentTrackIndex === idx
                        ? 'bg-blue-50/90 border-[#1560AA] ring-2 ring-blue-200 shadow-2xs'
                        : 'bg-slate-50/70 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Disc className={`w-3.5 h-3.5 shrink-0 ${currentTrackIndex === idx ? 'text-[#1560AA] animate-spin' : 'text-slate-400'}`} />
                      <div className="truncate">
                        <div className="text-xs font-bold text-slate-800 truncate">{track.title}</div>
                        <div className="text-[10px] text-slate-500 truncate">{track.artist} • {track.mood}</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0 ml-1">{track.duration}</span>
                  </button>
                ))}
              </div>
            </div>

          </div>

          {/* RIGHT SIDE: Holiday Chat Box */}
          <div className="lg:col-span-7 flex flex-col justify-between bg-white/85 backdrop-blur-xl border-2 border-white rounded-[28px] p-5 shadow-[0_12px_28px_rgba(28,78,160,0.12),inset_0_2px_4px_rgba(255,255,255,0.9)] space-y-3">
            
            {/* Chat Top Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-2xl bg-blue-100 text-[#1560AA] flex items-center justify-center font-bold">
                  <MessageSquare className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900">Праздничный Чат Colvir</h3>
                  <p className="text-[10px] text-slate-500 font-bold">Делитесь поздравлениями и треками с коллегами</p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddMusicModal(true)}
                  className="px-3 py-1.5 bg-gradient-to-r from-[#1560AA] to-blue-600 hover:from-blue-700 hover:to-[#1560AA] text-white text-xs font-extrabold rounded-xl shadow-xs flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Music className="w-3.5 h-3.5" />
                  <span>+ Музыка для всех</span>
                </button>
                <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-black rounded-full">
                  Онлайн
                </span>
              </div>
            </div>

            {/* Modal for Adding Music to Chat & Playlist */}
            {showAddMusicModal && (
              <div className="p-4 bg-blue-50/90 border-2 border-[#1560AA] rounded-2xl space-y-3 animate-fade-in shadow-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-xs font-black text-[#1560AA]">
                    <Music className="w-4 h-4" />
                    <span>Поделиться треком в чате для всех</span>
                  </div>
                  <button
                    onClick={() => setShowAddMusicModal(false)}
                    className="p-1 hover:bg-blue-100 rounded-lg text-slate-500"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <form onSubmit={handleAddMusicSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Название песни / трека *
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Например: Spring Jazz Lounge"
                      value={musicTitle}
                      onChange={(e) => setMusicTitle(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1560AA]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Исполнитель / Группа
                    </label>
                    <input
                      type="text"
                      placeholder="Например: Colvir Sound Studio"
                      value={musicArtist}
                      onChange={(e) => setMusicArtist(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1560AA]"
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Настроение / Жанр
                    </label>
                    <select
                      value={musicMood}
                      onChange={(e) => setMusicMood(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1560AA]"
                    >
                      <option value="Праздник & Дзен">Праздник & Дзен</option>
                      <option value="Весенний Джайв">Весенний Джайв</option>
                      <option value="Уютный Джаз">Уютный Джаз</option>
                      <option value="Новогодний Огонек">Новогодний Огонек</option>
                      <option value="Энергичный Рок">Энергичный Рок</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-slate-600 mb-1">
                      Длительность
                    </label>
                    <input
                      type="text"
                      placeholder="3:30"
                      value={musicDuration}
                      onChange={(e) => setMusicDuration(e.target.value)}
                      className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-[#1560AA]"
                    />
                  </div>

                  <div className="sm:col-span-2 pt-1 flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => setShowAddMusicModal(false)}
                      className="px-3 py-1.5 bg-slate-200 text-slate-700 font-bold rounded-xl text-xs"
                    >
                      Отмена
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#1560AA] hover:bg-[#104d88] text-white font-extrabold rounded-xl text-xs shadow-xs flex items-center gap-1"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Опубликовать трек</span>
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* Chat Messages Container */}
            <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
              {holidayChatMessages.map((msg) => (
                <div
                  key={msg.id}
                  className="bg-blue-50/70 border border-blue-100 p-3 rounded-2xl space-y-1.5"
                >
                  <div className="flex items-center justify-between text-[11px]">
                    <span className="font-extrabold text-[#1560AA]">{msg.author}</span>
                    <span className="text-[10px] text-slate-400">{msg.time}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 font-semibold">{msg.department}</div>
                  <p className="text-xs text-slate-800 leading-snug pt-0.5 font-medium">
                    {msg.text}
                  </p>

                  {/* Render Music Card in Chat if message has music attached */}
                  {msg.musicTrack && (
                    <div className="mt-2 p-2.5 bg-gradient-to-r from-[#1560AA] to-blue-700 text-white rounded-xl shadow-xs flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <button
                          onClick={() => {
                            if (playingMessageTrackId === msg.id) {
                              setPlayingMessageTrackId(null);
                            } else {
                              setPlayingMessageTrackId(msg.id);
                            }
                          }}
                          className="w-8 h-8 rounded-full bg-white text-[#1560AA] flex items-center justify-center shrink-0 shadow-xs hover:scale-105 transition-all cursor-pointer"
                        >
                          {playingMessageTrackId === msg.id ? (
                            <Pause className="w-4 h-4 fill-[#1560AA]" />
                          ) : (
                            <Play className="w-4 h-4 fill-[#1560AA] ml-0.5" />
                          )}
                        </button>

                        <div className="min-w-0">
                          <div className="text-xs font-black truncate">{msg.musicTrack.title}</div>
                          <div className="text-[10px] text-blue-200 font-bold truncate">
                            {msg.musicTrack.artist} • {msg.musicTrack.mood || 'Праздничный трек'}
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        {playingMessageTrackId === msg.id && (
                          <div className="flex items-end gap-0.5 h-4">
                            <span className="w-1 bg-amber-300 rounded-full animate-bounce h-full" />
                            <span className="w-1 bg-amber-300 rounded-full animate-bounce h-2/3 delay-100" />
                            <span className="w-1 bg-amber-300 rounded-full animate-bounce h-4/5 delay-200" />
                          </div>
                        )}
                        <span className="text-[10px] font-black px-2 py-0.5 bg-white/20 rounded-md">
                          {msg.musicTrack.duration || '3:30'}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Standard Emoji Picker Drawer */}
            {showEmojiPicker && (
              <div className="p-2.5 bg-white border border-blue-200 rounded-2xl shadow-sm space-y-1.5 animate-fade-in">
                <div className="flex items-center justify-between text-[10px] font-bold text-slate-500 px-1">
                  <span>Стандартный набор эмодзи</span>
                  <button onClick={() => setShowEmojiPicker(false)} className="text-slate-400 hover:text-slate-700">
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>

                <div className="grid grid-cols-8 gap-1 text-base text-center">
                  {STANDARD_EMOJIS.map((emoji, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => handleAddEmoji(emoji)}
                      className="p-1.5 hover:bg-blue-50 rounded-xl transition-all hover:scale-110 cursor-pointer"
                    >
                      {emoji}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Quick Emoji Bar above Input */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 pt-1 no-scrollbar">
              <span className="text-[10px] font-bold text-slate-400 shrink-0">Эмодзи:</span>
              {STANDARD_EMOJIS.slice(0, 10).map((emoji, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => handleAddEmoji(emoji)}
                  className="px-2 py-1 bg-white hover:bg-blue-50 border border-slate-200/80 rounded-lg text-xs transition-all hover:scale-105 shrink-0 cursor-pointer"
                >
                  {emoji}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="px-2 py-1 bg-blue-100 hover:bg-blue-200 text-[#1560AA] font-bold rounded-lg text-xs shrink-0 cursor-pointer flex items-center gap-1"
              >
                <Smile className="w-3.5 h-3.5" />
                <span>Еще</span>
              </button>
            </div>

            {/* Send Message Form */}
            <form onSubmit={handleSendMessage} className="pt-1 flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowEmojiPicker(!showEmojiPicker)}
                className="p-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl transition-all cursor-pointer shrink-0"
                title="Выберите эмодзи"
              >
                <Smile className="w-4 h-4 text-[#1560AA]" />
              </button>

              <button
                type="button"
                onClick={() => setShowAddMusicModal(!showAddMusicModal)}
                className="p-2.5 bg-blue-100 hover:bg-blue-200 text-[#1560AA] rounded-xl transition-all cursor-pointer shrink-0"
                title="Добавить музыку в чат"
              >
                <Music className="w-4 h-4" />
              </button>

              <input
                type="text"
                value={newMsgText}
                onChange={(e) => setNewMsgText(e.target.value)}
                placeholder="Напишите поздравление, эмодзи или мнение..."
                className="flex-1 px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:outline-none focus:border-[#1560AA] focus:bg-white"
              />

              <button
                type="submit"
                className="px-4 py-2.5 bg-[#1560AA] hover:bg-[#104d88] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center gap-1 cursor-pointer shrink-0"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>

          </div>

        </div>

        {/* Modal Footer */}
        <div className="relative z-10 pt-3 border-t border-white/60 flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2 font-bold text-slate-700">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Текущий режим: <strong className="text-[#1560AA]">{theme === 'classic' ? 'Классический' : currentInfo.title}</strong></span>
          </div>

          <div className="flex items-center gap-2">
            {theme !== 'classic' && (
              <button
                onClick={() => setTheme('classic')}
                className="px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-xs rounded-xl border border-red-200 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <PowerOff className="w-3.5 h-3.5" />
                <span>Отключить праздничное настроение</span>
              </button>
            )}

            <button
              onClick={() => setIsThemeModalOpen(false)}
              className="px-5 py-2 bg-white hover:bg-slate-100 text-slate-800 font-bold rounded-xl border border-slate-200 shadow-2xs transition-all cursor-pointer"
            >
              Закрыть
            </button>
          </div>
        </div>

      </div>

      <style>{`
        @keyframes candleFlicker {
          0%, 100% { opacity: 1; transform: scale(1.1); }
          50% { opacity: 0.35; transform: scale(0.75); }
        }
        .animate-candle-flicker {
          animation: candleFlicker 0.4s infinite alternate ease-in-out;
        }
      `}</style>

    </div>
  );
};
