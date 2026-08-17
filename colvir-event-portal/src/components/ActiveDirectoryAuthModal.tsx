import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Building2,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  LogOut,
  ShieldAlert,
  Server
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface ActiveDirectoryAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Панель активной сессии Active Directory.
 *
 * Формы входа здесь больше нет: пока сервер не подтвердил учётную запись,
 * приложение показывает LoginScreen и никакие данные не загружает. Раньше этот
 * модал при ошибке сети «логинил» пользователя локально — такой запасной путь
 * убран полностью.
 */
export const ActiveDirectoryAuthModal: React.FC<ActiveDirectoryAuthModalProps> = ({
  isOpen,
  onClose
}) => {
  const { user, isAdmin, directoryStatus, logout, syncWithDirectory } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(
    null
  );

  if (!isOpen || !user) return null;

  const handleSync = async () => {
    setIsLoading(true);
    setFeedback(null);
    const result = await syncWithDirectory();
    setFeedback({ type: result.success ? 'success' : 'error', message: result.message });
    setIsLoading(false);
  };

  const lastSync = user.adSyncedAt
    ? new Date(user.adSyncedAt).toLocaleString('ru-RU', { timeZone: 'Europe/Moscow' })
    : '—';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-xl max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-accent flex items-center justify-center text-white shadow-md ring-4 ring-accent/10">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-black text-slate-900">Colvir Active Directory</h2>
                <span className="px-2 py-0.5 bg-blue-50 text-accent border border-blue-200/80 rounded-md text-[10px] font-black uppercase">
                  {directoryStatus?.ssoEnabled ? 'SSO / LDAP' : 'LDAP'}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-medium">
                Текущая сессия корпоративной учётной записи
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
            aria-label="Закрыть"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6 flex-1">
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-blue-600" />
                <span className="text-xs font-black text-slate-800">
                  Статус контроллера домена
                </span>
              </div>
              <span className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                {directoryStatus?.status === 'online' ? 'Домен онлайн' : 'Статус неизвестен'}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <div className="text-slate-400 font-medium">Домен:</div>
                <div className="font-bold text-slate-800">{directoryStatus?.domain ?? '—'}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <div className="text-slate-400 font-medium">Протокол:</div>
                <div className="font-bold text-slate-800">{directoryStatus?.protocol ?? '—'}</div>
              </div>
            </div>
          </div>

          {feedback && (
            <div
              className={`p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 animate-fadeIn ${
                feedback.type === 'success'
                  ? 'bg-emerald-50 text-emerald-900 border border-emerald-200'
                  : 'bg-rose-50 text-rose-900 border border-rose-200'
              }`}
            >
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              ) : (
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              )}
              <div className="leading-relaxed">{feedback.message}</div>
            </div>
          )}

          <div className="p-5 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 border border-blue-200/80 rounded-2xl space-y-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-3">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt=""
                    className="w-12 h-12 rounded-2xl object-cover ring-2 ring-blue-500/30"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-2xl bg-accent text-white flex items-center justify-center font-black text-lg ring-2 ring-blue-500/30">
                    {(user.lastName || user.email).charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-base font-black text-slate-900">
                      {user.displayName || `${user.lastName} ${user.firstName}`}
                    </h3>
                    <ShieldCheck className="w-4 h-4 text-blue-600" />
                  </div>
                  <p className="text-xs text-blue-900/80 font-medium">{user.email}</p>
                  <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                    {user.department || 'Отдел не указан'}
                  </p>
                </div>
              </div>

              <span
                className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase shrink-0 ${
                  isAdmin ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isAdmin ? 'Администратор' : 'Сотрудник'}
              </span>
            </div>

            <div className="pt-3 border-t border-blue-200/60 grid grid-cols-2 gap-3 text-xs">
              <div>
                <span className="text-slate-500">Группы доступа AD:</span>
                <div className="flex flex-wrap gap-1 mt-1">
                  {user.adGroups.length === 0 ? (
                    <span className="text-[11px] text-slate-400">нет данных</span>
                  ) : (
                    user.adGroups.slice(0, 6).map((group) => (
                      <span
                        key={group}
                        className="px-2 py-0.5 bg-white border border-slate-200 rounded-md text-[10px] font-bold text-slate-700"
                      >
                        {group}
                      </span>
                    ))
                  )}
                </div>
              </div>
              <div>
                <span className="text-slate-500">Последняя синхронизация:</span>
                <div className="font-bold text-slate-800 text-[11px] mt-1">{lastSync}</div>
              </div>
            </div>

            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={handleSync}
                disabled={isLoading}
                className="flex-1 py-2 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors shadow-xs disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Обновить данные AD</span>
              </button>

              <button
                onClick={() => void logout()}
                className="py-2 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-1.5 transition-colors"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Выйти из AD</span>
              </button>
            </div>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Доступ к платформе ограничен сотрудниками Colvir Software Solutions. Все попытки
              входа записываются в журнал безопасности портала.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
