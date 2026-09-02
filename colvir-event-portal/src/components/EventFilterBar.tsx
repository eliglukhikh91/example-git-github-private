import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Trophy,
  Sparkles,
  Search,
  Coffee,
  BookOpen,
  MessageSquare,
  Gamepad2
} from 'lucide-react';

/**
 * Поиск и фильтр по категориям над списком мероприятий.
 *
 * Раньше этот блок назывался AnalyticsBanner и, кроме поиска, показывал шапку
 * во всю ширину: пилюлю «Colvir Event Hub», заголовок, абзац описания и три
 * счетчика — участников, команд, мероприятий. Сотрудник приходит сюда
 * записаться, а не смотреть статистику, и все это занимало первый экран, ничего
 * ему не давая. Счетчики остались там, где нужны, — в панели администратора.
 */
export const EventFilterBar: React.FC = () => {
  const { searchQuery, setSearchQuery, selectedCategory, setSelectedCategory } = useApp();

  const categories = [
    { id: 'all', label: 'Все мероприятия', icon: <Sparkles className="w-3.5 h-3.5" /> },
    { id: 'team-game', label: 'Командные игры', icon: <Gamepad2 className="w-3.5 h-3.5" /> },
    { id: 'speaking-club', label: 'Speaking Club', icon: <MessageSquare className="w-3.5 h-3.5" /> },
    { id: 'coffee-break', label: 'Кофе-брейк', icon: <Coffee className="w-3.5 h-3.5" /> },
    { id: 'book-club', label: 'Книжный клуб', icon: <BookOpen className="w-3.5 h-3.5" /> },
    { id: 'workshop', label: 'Воркшопы & Обучение', icon: <Trophy className="w-3.5 h-3.5" /> }
  ];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
      <div className="flex flex-col lg:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Поиск по названию, теме или ключевому слову"
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm placeholder-slate-400 focus:outline-hidden focus:border-accent focus:ring-2 focus:ring-accent/20 transition-all shadow-xs"
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

        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
          {categories.map((cat) => {
            const isActive = selectedCategory === cat.id;
            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold rounded-xl whitespace-nowrap transition-all ${
                  isActive
                    ? 'bg-accent text-white shadow-xs'
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
  );
};
