import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ViewMode } from '../types';
import { ColvirLogo } from './ColvirLogo';
import { MoscowClock } from './MoscowClock';
import {
  Calendar,
  Users,
  User,
  Bell,
  PlusCircle,
  ShieldAlert,
  Menu,
  X,
  Sparkles,
  CheckCheck,
  Building2,
  Coffee
} from 'lucide-react';

interface HeaderProps {
  onOpenProfile: () => void;
  onOpenCreateEvent: () => void;
  onToggleNotifications: () => void;
  onOpenAccessSettings?: () => void;
  onOpenActiveDirectory?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenProfile,
  onOpenCreateEvent,
  onToggleNotifications,
  onOpenAccessSettings,
  onOpenActiveDirectory
}) => {
  const {
    activeView,
    setActiveView,
    isAdmin,
    unreadCount,
    userProfile,
    getTotalStats,
    isAdAuthenticated
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const stats = getTotalStats();

  const navItems: { id: ViewMode; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    { id: 'digest', label: 'Дайджест мероприятий', icon: (active) => <Calendar className={`w-4 h-4 ${active ? 'text-white' : 'text-[#1560AA]'}`} /> },
    { id: 'random-coffee', label: 'Random Coffee', icon: (active) => <Coffee className={`w-4 h-4 ${active ? 'text-white' : 'text-[#1560AA]'}`} /> },
    ...(isAdmin ? [{ id: 'teams' as ViewMode, label: 'Сформированные группы', icon: (active: boolean) => <Users className={`w-4 h-4 ${active ? 'text-white' : 'text-[#1560AA]'}`} /> }] : []),
    { id: 'my-events', label: 'Мои записи', icon: (active) => <User className={`w-4 h-4 ${active ? 'text-white' : 'text-[#1560AA]'}`} /> },
    ...(isAdmin ? [{ id: 'admin-manage' as ViewMode, label: 'Панель администратора', icon: (active: boolean) => <ShieldAlert className={`w-4 h-4 ${active ? 'text-white' : 'text-[#1560AA]'}`} /> }] : [])
  ];

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 sm:h-20">
          
          {/* Logo & Brand */}
          <div className="flex items-center gap-3">
            <button
              onClick={() => setActiveView('digest')}
              className="flex items-center gap-3 text-left focus:outline-hidden group py-2"
              title="Перейти к дайджесту мероприятий"
            >
              <ColvirLogo className="h-9 sm:h-10 group-hover:opacity-90 transition-opacity" />
            </button>
          </div>

          {/* Desktop Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setActiveView(item.id)}
                  className={`flex items-center gap-2 px-4 py-2 text-sm font-bold rounded-xl transition-all ${
                    isActive
                      ? 'bg-[#1560AA] text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
                  }`}
                >
                  {item.icon(isActive)}
                  <span>{item.label}</span>
                  {item.id === 'teams' && (
                    <span className={`ml-1 text-xs px-2 py-0.5 font-bold rounded-full ${
                      isActive ? 'bg-white/20 text-white' : 'bg-[#1560AA]/10 text-[#1560AA]'
                    }`}>
                      {stats.totalTeams}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Right Action Controls */}
          <div className="flex items-center gap-2 sm:gap-3">
            
            {/* Live Synchronized Moscow Clock Badge */}
            <div className="hidden sm:block">
              <MoscowClock variant="badge" />
            </div>

            {/* Real-time Counter Badge */}
            <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 bg-[#f0f6fc] border border-[#1560AA]/20 rounded-xl text-xs font-semibold text-[#1560AA]">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span>{stats.totalParticipants} участников в системе</span>
            </div>

            {/* Admin Notifications Bell */}
            <button
              onClick={onToggleNotifications}
              className="relative p-2.5 rounded-xl text-slate-600 hover:text-[#1560AA] hover:bg-slate-100 transition-colors focus:outline-hidden"
              title="Уведомления администратора"
            >
              <Bell className="w-5 h-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex items-center justify-center min-w-[20px] h-[20px] px-1 bg-[#1560AA] text-white text-[10px] font-extrabold rounded-full ring-2 ring-white animate-bounce">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Create Event Button (Visible in Admin mode or desktop) */}
            {isAdmin && (
              <button
                onClick={onOpenCreateEvent}
                className="hidden sm:flex items-center gap-2 px-3.5 py-2 bg-[#1560AA] hover:bg-[#104d88] text-white text-sm font-semibold rounded-xl shadow-xs transition-all transform active:scale-95"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Создать событие</span>
              </button>
            )}

            {/* Colvir AD SSO Button */}
            {onOpenActiveDirectory && (
              <button
                onClick={onOpenActiveDirectory}
                className={`hidden lg:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isAdAuthenticated
                    ? 'bg-blue-50 border-blue-200 text-[#1560AA] hover:bg-blue-100'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
                title="Авторизация Active Directory (Colvir AD)"
              >
                <Building2 className={`w-3.5 h-3.5 ${isAdAuthenticated ? 'text-[#1560AA]' : 'text-slate-400'}`} />
                <span>Colvir AD</span>
                {isAdAuthenticated && (
                  <span className="w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-white"></span>
                )}
              </button>
            )}

            {/* Admin Access Settings Pill */}
            {onOpenAccessSettings && (
              <button
                onClick={onOpenAccessSettings}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all ${
                  isAdmin
                    ? 'bg-blue-50 border-blue-300 text-[#1560AA] hover:bg-blue-100'
                    : 'bg-slate-100 border-slate-200 text-slate-600 hover:bg-slate-200'
                }`}
                title="Настройка прав доступа и режима администратора"
              >
                <ShieldAlert className={`w-3.5 h-3.5 ${isAdmin ? 'text-[#1560AA]' : 'text-slate-400'}`} />
                <span>{isAdmin ? 'Админ' : 'Гость'}</span>
              </button>
            )}

            {/* User Profile Button */}
            <button
              onClick={onOpenProfile}
              className="flex items-center gap-2 p-1.5 sm:px-3 sm:py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold border border-slate-200/80 transition-all focus:outline-hidden"
            >
              <img
                src={userProfile.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80'}
                alt={userProfile.firstName}
                className="w-7 h-7 rounded-lg object-cover ring-1 ring-[#1560AA]/30"
              />
              <span className="hidden md:inline text-xs font-bold text-slate-800">
                {userProfile.firstName}
              </span>
            </button>

            {/* Mobile Menu Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="p-2 rounded-xl text-slate-600 hover:bg-slate-100 md:hidden focus:outline-hidden"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>

          </div>
        </div>
      </div>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-slate-200 bg-white px-4 pt-3 pb-6 space-y-2">
          <div className="grid grid-cols-1 gap-1">
            {navItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setActiveView(item.id);
                  setMobileMenuOpen(false);
                }}
                className={`flex items-center justify-between w-full px-4 py-3 rounded-xl text-sm font-semibold ${
                  activeView === item.id
                    ? 'bg-[#f0f6fc] text-[#1560AA]'
                    : 'text-slate-700 hover:bg-slate-50'
                }`}
              >
                <div className="flex items-center gap-3">
                  {item.icon(activeView === item.id)}
                  <span>{item.label}</span>
                </div>
                {item.id === 'teams' && (
                  <span className="text-xs px-2 py-0.5 bg-[#1560AA] text-white font-bold rounded-full">
                    {stats.totalTeams}
                  </span>
                )}
              </button>
            ))}
          </div>

          {isAdmin && (
            <button
              onClick={() => {
                onOpenCreateEvent();
                setMobileMenuOpen(false);
              }}
              className="flex items-center justify-center gap-2 w-full mt-2 py-3 bg-[#1560AA] text-white text-sm font-semibold rounded-xl"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Создать событие</span>
            </button>
          )}

          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
            <span>Всего участников: <strong className="text-slate-800">{stats.totalParticipants}</strong></span>
            <span>Команд: <strong className="text-slate-800">{stats.totalTeams}</strong></span>
          </div>
        </div>
      )}
    </header>
  );
};
