import React, { useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { ColvirLogo } from './components/ColvirLogo';
import { AnalyticsBanner } from './components/AnalyticsBanner';
import { ThemeBanner } from './components/ThemeBanner';
import { EventCard } from './components/EventCard';
import { TeamList } from './components/TeamList';
import { RegistrationModal } from './components/RegistrationModal';
import { CreateEventModal } from './components/CreateEventModal';
import { UserProfileModal } from './components/UserProfileModal';
import { EventDetailModal } from './components/EventDetailModal';
import { AdminNotificationsDrawer } from './components/AdminNotificationsDrawer';
import { AccessSettingsModal } from './components/AccessSettingsModal';
import { ActiveDirectoryAuthModal } from './components/ActiveDirectoryAuthModal';
import { AdminDashboard } from './components/AdminDashboard';
import { RandomCoffeeView } from './components/RandomCoffeeView';
import { ChatView } from './components/ChatView';
import { ThemedEventStrip } from './components/ThemedEventStrip';
import { EventItem } from './types';
import { Calendar, PlusCircle, Filter, Trophy, Lock } from 'lucide-react';

const MainApp: React.FC = () => {
  const {
    events,
    activeView,
    setActiveView,
    searchQuery,
    selectedCategory,
    isAdmin,
    getUserRegistrations
  } = useApp();

  // Modals state
  const [registerEvent, setRegisterEvent] = useState<EventItem | null>(null);
  const [detailEvent, setDetailEvent] = useState<EventItem | null>(null);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCreateEventOpen, setIsCreateEventOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [isAccessSettingsOpen, setIsAccessSettingsOpen] = useState(false);
  const [isActiveDirectoryOpen, setIsActiveDirectoryOpen] = useState(false);

  // Filter events by search & category
  const filteredEvents = events.filter((evt) => {
    const matchesSearch =
      !searchQuery ||
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.tags.some((t) => t.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesCategory =
      selectedCategory === 'all' || evt.category === selectedCategory;

    return matchesSearch && matchesCategory;
  });

  const userRegs = getUserRegistrations().filter((r) => r.status !== 'cancelled');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row font-sans text-slate-900 antialiased selection:bg-accent/20 selection:text-accent">
      
      {/* Side Navigation Bar */}
      <Sidebar
        onOpenProfile={() => setIsProfileOpen(true)}
        onOpenCreateEvent={() => setIsCreateEventOpen(true)}
        onToggleNotifications={() => setIsNotificationsOpen(!isNotificationsOpen)}
        onOpenAccessSettings={() => setIsAccessSettingsOpen(true)}
        onOpenActiveDirectory={() => setIsActiveDirectoryOpen(true)}
      />

      {/* Main Content Container (Offset by Sidebar width on desktop) */}
      <div className="flex-1 md:pl-64 lg:pl-72 flex flex-col min-w-0">
        
        {/* Main Content Area */}
        <main className="flex-1 pb-16">
          <ThemeBanner />
          
          {/* VIEW 1: DIGEST & DASHBOARD */}
          {activeView === 'digest' && (
            <div className="space-y-8">
              <AnalyticsBanner />

              <ThemedEventStrip
                onRegister={(evt) => setRegisterEvent(evt)}
                onViewDetails={(evt) => setDetailEvent(evt)}
              />

              <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
                
                {/* Digest Section Title */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-accent" />
                      Дайджест корпоративных мероприятий
                    </h2>
                    <p className="text-xs text-slate-500">
                      Найдено событий: <strong className="text-slate-800">{filteredEvents.length}</strong>
                    </p>
                  </div>

                  {isAdmin && (
                    <button
                      onClick={() => setIsCreateEventOpen(true)}
                      className="flex items-center gap-2 px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs transition-all active:scale-95"
                    >
                      <PlusCircle className="w-4 h-4" />
                      <span>Создать новое мероприятие</span>
                    </button>
                  )}
                </div>

              {/* Events Grid */}
              {filteredEvents.length === 0 ? (
                <div className="bg-white rounded-3xl p-12 text-center border border-slate-200/80 space-y-3">
                  <Filter className="w-12 h-12 text-slate-300 mx-auto" />
                  <h3 className="text-base font-bold text-slate-800">
                    Мероприятия не найдены
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm mx-auto">
                    Попробуйте изменить параметры поиска или фильтр категорий.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                  {filteredEvents.map((event) => (
                    <EventCard
                      key={event.id}
                      event={event}
                      onRegister={(evt) => setRegisterEvent(evt)}
                      onViewDetails={(evt) => setDetailEvent(evt)}
                    />
                  ))}
                </div>
              )}

            </div>
          </div>
        )}

        {/* VIEW 5: 15-MIN COFFEE BREAK & RANDOMIZER */}
        {activeView === 'random-coffee' && <RandomCoffeeView />}

        {/* VIEW 6: ЧАТ — постоянный раздел, не привязан к темам */}
        {activeView === 'chat' && <ChatView />}

        {/* VIEW 2: REAL-TIME TEAMS & PARTICIPANTS */}
        {activeView === 'teams' && (isAdmin ? <TeamList /> : <div className="max-w-md mx-auto p-12 text-center space-y-4"><div className="w-12 h-12 bg-amber-100 text-amber-700 rounded-2xl mx-auto flex items-center justify-center"><Lock className="w-5 h-5" /></div><h3 className="text-lg font-bold text-slate-800">Доступно только администратору</h3><p className="text-xs text-slate-500">Просмотр сформированных групп, команд и скачивание файлов доступны в панели администратора.</p></div>)}

        {/* VIEW 4: ADMIN DASHBOARD */}
        {activeView === 'admin-manage' && (
          <AdminDashboard
            onOpenCreateEvent={() => setIsCreateEventOpen(true)}
            onOpenAccessSettings={() => setIsAccessSettingsOpen(true)}
          />
        )}

        {/* VIEW 3: USER PERSONAL CABINET */}
        {activeView === 'my-events' && (
          <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-black text-slate-900">
                  Мой личный кабинет
                </h2>
                <p className="text-xs text-slate-500">
                  История записей, активные билеты и настройка профиля
                </p>
              </div>

              <button
                onClick={() => setIsProfileOpen(true)}
                className="px-4 py-2 bg-accent hover:bg-accent-hover text-white text-xs font-bold rounded-xl shadow-xs self-start sm:self-auto"
              >
                Редактировать профиль
              </button>
            </div>

            {/* Quick Summary Card */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="bg-accent-light border border-accent/20 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-accent uppercase block">
                    Активные записи:
                  </span>
                  <span className="text-3xl font-black text-slate-900">
                    {userRegs.length}
                  </span>
                </div>
                <Calendar className="w-10 h-10 text-accent opacity-80" />
              </div>

              <div className="bg-emerald-50 border border-emerald-200 p-5 rounded-2xl flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-emerald-800 uppercase block">
                    Статус участия:
                  </span>
                  <span className="text-base font-bold text-emerald-900">
                    Подтверждено
                  </span>
                </div>
                <Trophy className="w-10 h-10 text-emerald-600 opacity-80" />
              </div>
            </div>

            {/* Registrations List */}
            <div className="bg-white rounded-3xl p-6 border border-slate-200/80 space-y-4">
              <h3 className="text-base font-bold text-slate-900">
                Мои мероприятия ({userRegs.length})
              </h3>

              {userRegs.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs">
                  Вы пока не записались ни на одно мероприятие. Загляните в{' '}
                  <button
                    onClick={() => setActiveView('digest')}
                    className="text-accent font-bold underline"
                  >
                    Дайджест
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  {userRegs.map((reg) => {
                    const evt = events.find((e) => e.id === reg.eventId);
                    return (
                      <div
                        key={reg.id}
                        className="p-4 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                      >
                        <div className="space-y-1">
                          <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 text-[10px] font-bold rounded-md">
                            Подтверждено
                          </span>
                          <h4 className="font-bold text-slate-900 text-sm">
                            {evt?.title || 'Мероприятие'}
                          </h4>
                          <div className="text-xs text-slate-500">
                            {[evt?.date, reg.timeSlot || '10:00', evt?.location].filter(Boolean).join(' · ')}
                          </div>
                          {reg.isTeamGame && (
                            <div className="text-xs text-accent font-bold">
                              Команда: {reg.teamName} ({reg.role === 'captain' ? 'Капитан' : 'Игрок'})
                            </div>
                          )}
                        </div>

                        <button
                          onClick={() => {
                            if (evt) setDetailEvent(evt);
                          }}
                          className="px-3.5 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl hover:bg-slate-100 transition-colors"
                        >
                          Подробнее
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col items-center text-center space-y-3">
          <ColvirLogo className="h-8" />
          <p className="text-xs text-slate-500 font-medium max-w-md">
            Корпоративная система бронирования и записи на внутренние мероприятия, секции и тимбилдинги
          </p>
          <p className="text-[11px] text-slate-400">
            © 2026 Colvir Software Solutions. Все права защищены.
          </p>
        </div>
      </footer>

      </div>

      {/* MODALS & DRAWERS */}
      <RegistrationModal
        event={registerEvent}
        onClose={() => setRegisterEvent(null)}
        onNavigateToTeams={() => setActiveView('teams')}
      />

      <EventDetailModal
        event={detailEvent}
        onClose={() => setDetailEvent(null)}
        onRegister={(evt) => setRegisterEvent(evt)}
      />

      <CreateEventModal
        isOpen={isCreateEventOpen}
        onClose={() => setIsCreateEventOpen(false)}
      />

      <UserProfileModal
        isOpen={isProfileOpen}
        onClose={() => setIsProfileOpen(false)}
      />

      <AdminNotificationsDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
      />

      <AccessSettingsModal
        isOpen={isAccessSettingsOpen}
        onClose={() => setIsAccessSettingsOpen(false)}
      />

      <ActiveDirectoryAuthModal
        isOpen={isActiveDirectoryOpen}
        onClose={() => setIsActiveDirectoryOpen(false)}
      />

    </div>
  );
};

/**
 * Гейт авторизации: до подтверждения сессии сервером приложение не монтирует
 * AppProvider и, соответственно, не запрашивает никаких данных портала.
 */
const AuthenticatedApp: React.FC = () => {
  const { status } = useAuth();

  if (status === 'checking') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-400">
          <div className="w-10 h-10 border-3 border-slate-200 border-t-accent rounded-full animate-spin" />
          <p className="text-xs font-semibold">Проверка сессии Active Directory…</p>
        </div>
      </div>
    );
  }

  if (status === 'anonymous') {
    return <LoginScreen />;
  }

  return (
    <AppProvider>
      <MainApp />
    </AppProvider>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
