import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { ViewMode, ThemeType } from '../types';
import { ColvirLogo } from './ColvirLogo';
import { MoscowClock } from './MoscowClock';
import {
  Calendar,
  Users,
  UserCheck,
  Bell,
  PlusCircle,
  ShieldCheck,
  Menu,
  X,
  Activity,
  Palette,
  Clock,
  User,
  Settings,
  Coffee,
  Shuffle,
  Sparkles
} from 'lucide-react';

interface SidebarProps {
  onOpenProfile: () => void;
  onOpenCreateEvent: () => void;
  onToggleNotifications: () => void;
  onOpenAccessSettings: () => void;
  onOpenActiveDirectory?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
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
    getTotalStats,
    theme,
    setTheme,
    openThemeModal,
    userProfile,
    isAdAuthenticated
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const stats = getTotalStats();

  const navItems: { id: ViewMode; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    { id: 'digest', label: 'Дайджест мероприятий', icon: (active) => <Calendar className={`w-5 h-5 ${active ? 'text-white' : 'text-[#1560AA]'}`} /> },
    { id: 'random-coffee', label: 'Random Coffee', icon: (active) => <Coffee className={`w-5 h-5 ${active ? 'text-white' : 'text-[#1560AA]'}`} /> },
    ...(isAdmin ? [{ id: 'teams' as ViewMode, label: 'Сформированные группы', icon: (active: boolean) => <Users className={`w-5 h-5 ${active ? 'text-white' : 'text-[#1560AA]'}`} /> }] : []),
    { id: 'my-events', label: 'Мои записи', icon: (active) => <UserCheck className={`w-5 h-5 ${active ? 'text-white' : 'text-[#1560AA]'}`} /> },
    ...(isAdmin ? [{ id: 'admin-manage' as ViewMode, label: 'Панель администратора', icon: (active: boolean) => <ShieldCheck className={`w-5 h-5 ${active ? 'text-white' : 'text-[#1560AA]'}`} /> }] : [])
  ];

  const SidebarContent = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      
      {/* 1. Header / Official Logo */}
      <div className="p-4 border-b border-slate-100 space-y-3">
        <button
          onClick={() => {
            setActiveView('digest');
            setMobileMenuOpen(false);
          }}
          className="focus:outline-hidden hover:opacity-90 transition-opacity flex items-center justify-center w-full py-1.5"
          title="На главную"
        >
          <ColvirLogo className="h-11" />
        </button>

        {/* Action icons directly underneath the logo: Clock, Bell, User Profile, Settings */}
        <div className="flex items-center justify-between gap-1 bg-slate-50 p-1.5 rounded-2xl border border-slate-200/80">
          <div title="Московское время">
            <MoscowClock variant="badge" className="px-2 py-1 text-[10px]" />
          </div>

          <div className="flex items-center gap-1">
            {/* Notifications Button */}
            <button
              onClick={() => {
                onToggleNotifications();
                setMobileMenuOpen(false);
              }}
              className="relative p-2 rounded-xl text-slate-700 hover:text-[#1560AA] hover:bg-white shadow-2xs transition-all"
              title="Уведомления"
            >
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <span className="absolute -top-1 -right-1 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 bg-[#1560AA] text-white text-[9px] font-black rounded-full ring-1 ring-white animate-pulse">
                  {unreadCount}
                </span>
              )}
            </button>

            {/* Profile Button */}
            <button
              onClick={() => {
                onOpenProfile();
                setMobileMenuOpen(false);
              }}
              className="p-2 rounded-xl text-slate-700 hover:text-[#1560AA] hover:bg-white shadow-2xs transition-all"
              title="Профиль сотрудника"
            >
              <User className="w-4 h-4" />
            </button>

            {/* Access Settings & Admin Toggle */}
            <button
              onClick={() => {
                onOpenAccessSettings();
                setMobileMenuOpen(false);
              }}
              className={`p-2 rounded-xl shadow-2xs transition-all ${
                isAdmin ? 'bg-blue-100 text-[#1560AA] hover:bg-blue-200' : 'text-slate-700 hover:text-[#1560AA] hover:bg-white'
              }`}
              title={isAdmin ? 'Режим администратора активен' : 'Настройки доступа / Вход админа'}
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* User Profile Card with photo, name and position */}
        <button
          onClick={() => {
            onOpenProfile();
            setMobileMenuOpen(false);
          }}
          className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-all text-left group"
          title="Открыть профиль"
        >
          <div className="relative shrink-0">
            <img
              src={userProfile.avatarUrl || "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"}
              alt={`${userProfile.firstName} ${userProfile.lastName}`}
              className="w-10 h-10 rounded-xl object-cover ring-2 ring-[#1560AA]/20 group-hover:ring-[#1560AA] transition-all"
            />
            {isAdAuthenticated && (
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-[#1560AA] text-white rounded-full text-[9px] flex items-center justify-center font-black ring-1 ring-white" title="AD SSO Active">
                ✓
              </span>
            )}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-slate-900 truncate">
              {userProfile.lastName} {userProfile.firstName}
            </div>
            <div className="text-[11px] text-slate-500 truncate font-medium">
              {userProfile.title || userProfile.department || 'Сотрудник Colvir'}
            </div>
          </div>
        </button>
      </div>

      {/* 2. Navigation items & Actions */}
      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        <div>
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
            Навигация
          </p>
          <nav className="space-y-1.5">
            {navItems.map((item) => {
              const isActive = activeView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveView(item.id);
                    setMobileMenuOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-3 rounded-2xl font-bold text-xs transition-all ${
                    isActive
                      ? 'bg-[#1560AA] text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100/80'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {item.icon(isActive)}
                    <span>{item.label}</span>
                  </div>
                  {item.id === 'teams' && (
                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                        isActive
                          ? 'bg-white/20 text-white'
                          : 'bg-[#1560AA]/10 text-[#1560AA]'
                      }`}
                    >
                      {stats.totalTeams}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        {/* 4. Actions & Admin Section */}
        <div>
          <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
            Действия
          </p>
          <div className="space-y-2">
            {isAdmin && (
              <button
                onClick={() => {
                  onOpenCreateEvent();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-[#1560AA] hover:bg-[#104d88] text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Создать событие</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5. Bottom Sidebar Theme Switcher & Footer Stats */}
      <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-3">
        
        {/* Theme Switcher Button */}
        <div className="space-y-2">
          <button
            onClick={() => openThemeModal(theme === 'classic' ? 'birthday' : theme)}
            className="w-full py-2.5 px-3 bg-[#1560AA] hover:bg-[#104d88] text-white font-extrabold text-xs rounded-xl shadow-xs transition-all flex items-center justify-center gap-2 active:scale-95 cursor-pointer"
          >
            <Sparkles className="w-4 h-4 text-white" />
            <span>Праздничное настроение</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-3 py-2 bg-[#f0f6fc] border border-[#1560AA]/20 rounded-xl text-[11px] font-semibold text-[#1560AA]">
          <Activity className="w-3.5 h-3.5 text-[#1560AA] animate-pulse shrink-0" />
          <span className="truncate">{stats.totalParticipants} участников в системе</span>
        </div>

        <p className="text-[10px] text-center text-slate-400 font-medium">
          Colvir Event Hub © {new Date().getFullYear()}
        </p>
      </div>

    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed Left) */}
      <aside className="hidden md:block fixed top-0 left-0 bottom-0 w-64 lg:w-72 z-30">
        <SidebarContent />
      </aside>

      {/* Mobile Top Header (Visible on small screens only) */}
      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <button
          onClick={() => setActiveView('digest')}
          className="focus:outline-hidden"
        >
          <ColvirLogo className="h-8" />
        </button>

        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onToggleNotifications}
              className="relative p-2 rounded-xl bg-[#f0f6fc] text-[#1560AA] text-xs font-bold"
            >
              <Bell className="w-5 h-5" />
              <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#1560AA] text-white rounded-full text-[9px] flex items-center justify-center font-black">
                {unreadCount}
              </span>
            </button>
          )}

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl focus:outline-hidden"
            aria-label="Открыть меню"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {/* Mobile Slide-over Drawer Backdrop & Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileMenuOpen(false)}
          />

          {/* Drawer Content */}
          <div className="relative w-4/5 max-w-xs bg-white h-full z-10 shadow-2xl flex flex-col">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};
