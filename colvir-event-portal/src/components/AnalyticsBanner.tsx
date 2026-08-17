import React from 'react';
import { useApp } from '../context/AppContext';
import { Users, Trophy, Calendar, Sparkles, Search, Filter, Coffee, BookOpen, MessageSquare, Gamepad2 } from 'lucide-react';

export const AnalyticsBanner: React.FC = () => {
  const {
    getTotalStats,
    searchQuery,
    setSearchQuery,
    selectedCategory,
    setSelectedCategory,
    setActiveView
  } = useApp();

  const stats = getTotalStats();

  const categories = [
    { id: 'all', label: 'Все мероприятия', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'team-game', label: 'Командные игры', icon: <Gamepad2 className="w-3.5 h-3.5" /> },
    { id: 'speaking-club', label: 'Speaking Club', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'coffee-break', label: 'Кофе-брейк', icon: <Coffee className="w-3.5 h-3.5" /> },
    { id: 'book-club', label: 'Книжный клуб', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'workshop', label: 'Воркшопы & Обучение', icon: <Trophy className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="bg-gradient-to-b from-[#f0f6fc]/80 to-slate-50 border-b border-slate-200/80 pt-6 pb-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        
        {/* Top Hero Heading & Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          
          <div className="lg:col-span-7 space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#1560AA]/10 text-[#1560AA] text-xs font-bold uppercase tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-[#1560AA]" />
              Colvir Event Hub
            </div>
            <h1 className="text-2xl sm:text-3xl lg:text-4xl font-extrabold text-slate-900 tracking-tight">
              Запись на корпоративные мероприятия
            </h1>
            <p className="text-sm text-slate-600 max-w-2xl leading-relaxed">
              Регистрируйтесь в команды, выбирайте время для Speaking Club или кофе-брейка, смотрите составы участников в реальном времени и развивайтесь вместе с коллегами!
            </p>
          </div>

          {/* Real-time Counter Metric Cards */}
          <div className="lg:col-span-5 grid grid-cols-3 gap-2 sm:gap-3 min-w-0">
            
            {/* Total Registered Employees */}
            <div className="bg-white p-2.5 sm:p-3.5 md:p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#1560AA]/40 transition-all flex flex-col justify-between min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-1 text-[#1560AA] mb-1 min-w-0">
                <Users className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase bg-[#f0f6fc] px-1.5 py-0.5 rounded-sm truncate shrink-0 max-w-full">
                  Всего
                </span>
              </div>
              <div className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight truncate">
                {stats.totalParticipants}
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5 truncate" title="Участников">
                Участников
              </div>
            </div>

            {/* Formed Teams Counter */}
            <div className="bg-white p-2.5 sm:p-3.5 md:p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#1560AA]/40 transition-all flex flex-col justify-between min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-1 text-indigo-600 mb-1 min-w-0">
                <Trophy className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase bg-indigo-50 px-1.5 py-0.5 rounded-sm truncate shrink-0 max-w-full">
                  Группы
                </span>
              </div>
              <div className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight truncate">
                {stats.totalTeams}
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5 truncate" title="Команд">
                Команд
              </div>
            </div>

            {/* Active Events */}
            <div className="bg-white p-2.5 sm:p-3.5 md:p-4 rounded-2xl border border-slate-200/80 shadow-xs hover:border-[#1560AA]/40 transition-all flex flex-col justify-between min-w-0 overflow-hidden">
              <div className="flex items-center justify-between gap-1 text-emerald-600 mb-1 min-w-0">
                <Calendar className="w-4 h-4 sm:w-5 sm:h-5 shrink-0" />
                <span className="text-[9px] sm:text-[10px] font-bold uppercase bg-emerald-50 px-1.5 py-0.5 rounded-sm truncate shrink-0 max-w-full">
                  Афиша
                </span>
              </div>
              <div className="text-lg sm:text-2xl md:text-3xl font-black text-slate-900 tracking-tight truncate">
                {stats.totalEvents}
              </div>
              <div className="text-[10px] sm:text-xs font-medium text-slate-500 mt-0.5 truncate" title="Мероприятий">
                Мероприятий
              </div>
            </div>

          </div>
        </div>

        {/* Search & Category Filter Controls */}
        <div className="flex flex-col lg:flex-row gap-3 pt-2">
          
          {/* Search Bar */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Поиск по названию события, темам или ключевым словам..."
              className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-hidden focus:border-[#1560AA] focus:ring-2 focus:ring-[#1560AA]/20 transition-all shadow-xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400 hover:text-slate-600"
              >
                Очистить
              </button>
            )}
          </div>

          {/* Category Filter Pills */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {categories.map((cat) => {
              const isActive = selectedCategory === cat.id;
              return (
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                    isActive
                      ? 'bg-[#1560AA] text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100 hover:text-slate-900'
                  }`}
                >
                  {cat.icon}
                  <span>{cat.label}</span>
                </button>
              );
            })}
          </div>

        </div>

      </div>
    </div>
  );
};
