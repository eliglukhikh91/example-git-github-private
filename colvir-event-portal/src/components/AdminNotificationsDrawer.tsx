import React from 'react';
import { useApp } from '../context/AppContext';
import {
  Bell,
  CheckCheck,
  X,
  ShieldAlert,
  Sparkles,
  UserPlus,
  Gamepad2,
  Clock,
  Coffee
} from 'lucide-react';

/**
 * Сервер отдает время в ISO — приводим к московскому времени для показа.
 * Раньше в поле лежала уже отформатированная строка, поэтому ее выводили как есть.
 */
function formatNotificationTime(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('ru-RU', {
    day: 'numeric',
    month: 'long',
    hour: '2-digit',
    minute: '2-digit',
    timeZone: 'Europe/Moscow'
  });
}

interface AdminNotificationsDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminNotificationsDrawer: React.FC<AdminNotificationsDrawerProps> = ({
  isOpen,
  onClose
}) => {
  const { notifications, markNotificationAsRead, markAllNotificationsAsRead, unreadCount, isAdmin } =
    useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/40 backdrop-blur-xs animate-fadeIn">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-white shadow-2xl border-l border-slate-200 flex flex-col">
          
          {/* Drawer Header */}
          <div className="p-5 bg-gradient-to-r from-accent to-indigo-900 text-white flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 bg-white/10 rounded-xl">
                <Bell className="w-5 h-5 text-amber-300" />
              </div>
              <div>
                <h3 className="font-bold text-base leading-tight">
                  {isAdmin ? 'Уведомления администратора' : 'Мои уведомления'}
                </h3>
                <p className="text-xs text-blue-100">
                  {unreadCount > 0
                    ? `Новых: ${unreadCount}`
                    : 'Все уведомления прочитаны'}
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Action Bar */}
          {notifications.length > 0 && (
            <div className="px-5 py-3 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between text-xs font-semibold text-slate-600">
              <span>Всего записей: {notifications.length}</span>
              {unreadCount > 0 && (
                <button
                  onClick={markAllNotificationsAsRead}
                  className="text-accent hover:underline flex items-center gap-1 font-bold"
                >
                  <CheckCheck className="w-4 h-4" />
                  <span>Прочитать все</span>
                </button>
              )}
            </div>
          )}

          {/* Notifications List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {notifications.length === 0 ? (
              <div className="text-center py-12 text-slate-400 space-y-2">
                <Bell className="w-10 h-10 mx-auto stroke-1" />
                <p className="text-sm font-medium">Уведомлений пока нет</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  onClick={() => markNotificationAsRead(notif.id)}
                  className={`p-4 rounded-2xl border transition-all cursor-pointer relative space-y-2 ${
                    !notif.read
                      ? 'bg-accent-light border-accent/40 shadow-2xs'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {!notif.read && (
                    <span className="absolute top-3 right-3 w-2.5 h-2.5 bg-accent rounded-full ring-2 ring-white" />
                  )}

                  <div className="flex items-start gap-2.5">
                    <div className="p-2 bg-white rounded-xl border border-slate-200 text-accent shrink-0 mt-0.5">
                      {notif.type === 'random_coffee_match' ||
                      notif.type === 'random_coffee_reminder' ? (
                        <Coffee className="w-4 h-4" />
                      ) : (
                        <UserPlus className="w-4 h-4" />
                      )}
                    </div>

                    <div className="space-y-1 pr-4">
                      <div className="text-xs text-slate-500 font-semibold">
                        {formatNotificationTime(notif.timestamp)}
                      </div>

                      <div className="text-sm font-bold text-slate-900 leading-snug">
                        {notif.participantName}
                      </div>

                      <div className="text-xs font-semibold text-accent line-clamp-1">
                        {notif.eventTitle}
                      </div>

                      {/* Team Game Details */}
                      {notif.isTeamGame ? (
                        <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 text-amber-900 text-[11px] font-bold rounded-lg mt-1">
                          <Gamepad2 className="w-3.5 h-3.5 text-amber-600" />
                          <span>Команда: <strong>{notif.teamName}</strong></span>
                          {notif.role && <span className="text-amber-700">({notif.role})</span>}
                        </div>
                      ) : (
                        notif.timeSlot && (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-100 text-slate-800 text-[11px] font-bold rounded-lg mt-1">
                            <Clock className="w-3.5 h-3.5 text-accent" />
                            <span>Слот: {notif.timeSlot}</span>
                          </div>
                        )
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          <div className="p-4 border-t border-slate-200 bg-slate-50 text-center text-xs text-slate-500">
            Уведомления обновляются в реальном времени при каждой записи.
          </div>

        </div>
      </div>
    </div>
  );
};
