import React, { useEffect, useRef, useState } from 'react';
import { useApp } from '../context/AppContext';
import { ViewMode } from '../types';
import { ColvirLogo } from './ColvirLogo';
import { ThemeSwatches } from './ThemeSwatches';
import {
  Calendar,
  Users,
  UserCheck,
  Bell,
  PlusCircle,
  ShieldCheck,
  Menu,
  Activity,
  User,
  Coffee,
  MessageSquare,
  ChevronDown,
  CheckCircle2
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
  onOpenAccessSettings
}) => {
  const {
    activeView,
    setActiveView,
    isAdmin,
    unreadCount,
    getTotalStats,
    userProfile,
    isAdAuthenticated,
    adDomain
  } = useApp();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const stats = getTotalStats();

  const navItems: { id: ViewMode; label: string; icon: (active: boolean) => React.ReactNode }[] = [
    { id: 'digest', label: 'Дайджест мероприятий', icon: (active) => <Calendar className={`w-5 h-5 ${active ? 'text-white' : 'text-accent'}`} /> },
    { id: 'random-coffee', label: 'Random Coffee', icon: (active) => <Coffee className={`w-5 h-5 ${active ? 'text-white' : 'text-accent'}`} /> },
    { id: 'holiday-chat', label: 'Праздничный чат', icon: (active) => <MessageSquare className={`w-5 h-5 ${active ? 'text-white' : 'text-accent'}`} /> },
    ...(isAdmin ? [{ id: 'teams' as ViewMode, label: 'Сформированные группы', icon: (active: boolean) => <Users className={`w-5 h-5 ${active ? 'text-white' : 'text-accent'}`} /> }] : []),
    { id: 'my-events', label: 'Мои записи', icon: (active) => <UserCheck className={`w-5 h-5 ${active ? 'text-white' : 'text-accent'}`} /> },
    ...(isAdmin ? [{ id: 'admin-manage' as ViewMode, label: 'Панель администратора', icon: (active: boolean) => <ShieldCheck className={`w-5 h-5 ${active ? 'text-white' : 'text-accent'}`} /> }] : [])
  ];

  /**
   * Карточка профиля с выпадающим меню.
   *
   * Раньше под логотипом стояли четыре иконки (часы, колокольчик, профиль,
   * настройки), а карточка профиля ниже вела туда же, куда и иконка профиля.
   * Теперь редкие действия собраны в одно меню, а на виду остался только
   * колокольчик — он меняется чаще всего.
   */
  const ProfileMenu: React.FC<{ onNavigate: () => void }> = ({ onNavigate }) => {
    const [open, setOpen] = useState(false);
    const containerRef = useRef<HTMLDivElement | null>(null);

    useEffect(() => {
      if (!open) return;

      const handlePointerDown = (event: MouseEvent) => {
        if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
      };
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === 'Escape') setOpen(false);
      };

      document.addEventListener('mousedown', handlePointerDown);
      document.addEventListener('keydown', handleKeyDown);
      return () => {
        document.removeEventListener('mousedown', handlePointerDown);
        document.removeEventListener('keydown', handleKeyDown);
      };
    }, [open]);

    return (
      <div className="relative" ref={containerRef}>
        <button
          onClick={() => setOpen((prev) => !prev)}
          aria-expanded={open}
          aria-haspopup="menu"
          className="w-full flex items-center gap-3 p-2.5 rounded-2xl bg-slate-50 hover:bg-slate-100 border border-slate-200/80 transition-colors text-left"
        >
          {userProfile.avatarUrl ? (
            <img
              src={userProfile.avatarUrl}
              alt=""
              className="w-10 h-10 rounded-xl object-cover shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-xl bg-accent text-white flex items-center justify-center font-black text-sm shrink-0">
              {(userProfile.lastName || userProfile.email).charAt(0).toUpperCase()}
            </div>
          )}

          <div className="min-w-0 flex-1">
            <div className="text-xs font-black text-slate-900 truncate">
              {userProfile.lastName} {userProfile.firstName}
            </div>
            <div className="text-[11px] text-slate-500 truncate font-medium">
              {userProfile.title || userProfile.department || 'Сотрудник Colvir'}
            </div>
          </div>

          <ChevronDown
            className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </button>

        {open && (
          <div
            role="menu"
            className="absolute left-0 right-0 top-full mt-2 z-40 bg-white border border-slate-200 rounded-2xl shadow-lg p-3 space-y-2"
          >
            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenProfile();
                onNavigate();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <User className="w-4 h-4 text-accent" />
              <span>Профиль</span>
            </button>

            <button
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onOpenAccessSettings();
                onNavigate();
              }}
              className="w-full flex items-center gap-2.5 px-2.5 py-2 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-100 transition-colors text-left"
            >
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${isAdAuthenticated ? 'text-emerald-600' : 'text-slate-300'}`}
              />
              <span className="min-w-0 flex-1">
                Статус AD-сессии
                <span className="block font-medium text-[10px] text-slate-400 truncate">
                  {isAdAuthenticated ? `Активна · ${adDomain}` : 'Не активна'}
                  {isAdmin ? ' · Администратор' : ''}
                </span>
              </span>
            </button>

            <div className="pt-2 border-t border-slate-100 px-2.5 pb-1">
              <ThemeSwatches />
            </div>
          </div>
        )}
      </div>
    );
  };

  const SidebarContent: React.FC = () => (
    <div className="flex flex-col h-full bg-white border-r border-slate-200">
      <div className="p-4 border-b border-slate-100 space-y-3">
        <div className="flex items-center justify-between gap-2">
          <button
            onClick={() => {
              setActiveView('digest');
              setMobileMenuOpen(false);
            }}
            className="focus:outline-hidden hover:opacity-90 transition-opacity py-1.5"
            title="На главную"
          >
            <ColvirLogo className="h-10" />
          </button>

          <button
            onClick={() => {
              onToggleNotifications();
              setMobileMenuOpen(false);
            }}
            className="relative p-2 rounded-xl text-slate-600 hover:text-accent hover:bg-slate-100 transition-colors shrink-0"
            title="Уведомления"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 bg-accent text-white text-[9px] font-black rounded-full ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>
        </div>

        <ProfileMenu onNavigate={() => setMobileMenuOpen(false)} />
      </div>

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
                      ? 'bg-accent text-white shadow-xs'
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
                        isActive ? 'bg-white/20 text-white' : 'bg-accent/10 text-accent'
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

        {isAdmin && (
          <div>
            <p className="px-3 text-[10px] font-extrabold uppercase tracking-wider text-slate-400 mb-2">
              Действия
            </p>
            <button
              onClick={() => {
                onOpenCreateEvent();
                setMobileMenuOpen(false);
              }}
              className="w-full flex items-center gap-2.5 px-3.5 py-2.5 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-98"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Создать событие</span>
            </button>
          </div>
        )}
      </div>

      <div className="p-4 border-t border-slate-100 bg-slate-50/70 space-y-3">
        <div className="flex items-center gap-2 px-3 py-2 bg-accent-light border border-accent/20 rounded-xl text-[11px] font-semibold text-accent">
          <Activity className="w-3.5 h-3.5 shrink-0" />
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
      <aside className="hidden md:block fixed top-0 left-0 bottom-0 w-64 lg:w-72 z-30">
        <SidebarContent />
      </aside>

      <div className="md:hidden sticky top-0 z-30 bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between shadow-xs">
        <button onClick={() => setActiveView('digest')} className="focus:outline-hidden">
          <ColvirLogo className="h-8" />
        </button>

        <div className="flex items-center gap-2">
          <button
            onClick={onToggleNotifications}
            className="relative p-2 rounded-xl text-slate-600 hover:bg-slate-100"
            aria-label="Уведомления"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 flex items-center justify-center min-w-[16px] h-[16px] px-0.5 bg-accent text-white text-[9px] font-black rounded-full ring-2 ring-white">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMobileMenuOpen(true)}
            className="p-2 text-slate-700 hover:bg-slate-100 rounded-xl focus:outline-hidden"
            aria-label="Открыть меню"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/40"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs bg-white h-full z-10 shadow-2xl flex flex-col">
            <SidebarContent />
          </div>
        </div>
      )}
    </>
  );
};
