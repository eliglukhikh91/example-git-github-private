import React from 'react';
import {
  X,
  ShieldCheck,
  ShieldAlert,
  Users,
  Building2,
  Info,
  LogOut,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AccessSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

/**
 * Панель прав доступа.
 *
 * Раньше здесь выдавались права администратора по PIN-коду и списку email,
 * которые хранились в localStorage браузера — то есть любой сотрудник мог
 * назначить себя администратором через DevTools. Теперь права определяются
 * членством в группах Active Directory и меняются только в самом домене;
 * портал их показывает, но не выдает.
 */
export const AccessSettingsModal: React.FC<AccessSettingsModalProps> = ({ isOpen, onClose }) => {
  const { user, isAdmin, directoryStatus, logout, syncWithDirectory } = useAuth();
  const [isSyncing, setIsSyncing] = React.useState(false);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  if (!isOpen || !user) return null;

  const handleSync = async () => {
    setIsSyncing(true);
    const result = await syncWithDirectory();
    setFeedback(result.message);
    setIsSyncing(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-accent flex items-center justify-center text-white shadow-md ring-4 ring-accent/10">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-lg font-black text-slate-900">Права доступа</h2>
              <p className="text-xs text-slate-500 font-medium">
                Управляются группами Active Directory
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

        <div className="p-6 space-y-5">
          {/* Текущая учетная запись */}
          <div className="p-5 bg-gradient-to-br from-blue-50/80 to-indigo-50/50 border border-blue-200/80 rounded-2xl space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900">
                  {user.displayName || `${user.lastName} ${user.firstName}`}
                </h3>
                <p className="text-xs text-blue-900/80 font-medium">{user.email}</p>
                <p className="text-[11px] text-slate-500 font-semibold mt-0.5">
                  {user.department || 'Отдел не указан в AD'}
                </p>
              </div>

              <span
                className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase shrink-0 ${
                  isAdmin
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-slate-200 text-slate-700'
                }`}
              >
                {isAdmin ? 'Администратор' : 'Сотрудник'}
              </span>
            </div>

            <div className="pt-3 border-t border-blue-200/60 space-y-1.5">
              <span className="text-[11px] text-slate-500 font-medium flex items-center gap-1.5">
                <Users className="w-3.5 h-3.5" />
                Группы Active Directory ({user.adGroups.length}):
              </span>
              <div className="flex flex-wrap gap-1">
                {user.adGroups.length === 0 ? (
                  <span className="text-[11px] text-slate-400">
                    Группы не переданы контроллером домена
                  </span>
                ) : (
                  user.adGroups.map((group) => (
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
          </div>

          {feedback && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl text-[11px] font-semibold text-emerald-900">
              {feedback}
            </div>
          )}

          {/* Как выдаются права */}
          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2">
            <div className="flex items-center gap-2 text-xs font-black text-slate-800">
              <Info className="w-4 h-4 text-accent" />
              Как выдаются права администратора
            </div>
            <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
              Роль вычисляется сервером при каждом входе по атрибуту{' '}
              <code className="bg-slate-200 px-1 py-0.5 rounded font-mono">memberOf</code> из
              Active Directory. Чтобы выдать или отозвать права, добавьте сотрудника в группу
              администраторов портала в домене{' '}
              <strong>{directoryStatus?.domain ?? 'Colvir'}</strong> — изменения применятся
              при следующем входе или после синхронизации.
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Портал не хранит собственных паролей, PIN-кодов и списков администраторов.
            </p>
          </div>

          {/* Статус каталога */}
          {directoryStatus && (
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <div className="text-slate-400 font-medium flex items-center gap-1">
                  <Building2 className="w-3 h-3" />
                  Домен:
                </div>
                <div className="font-bold text-slate-800">{directoryStatus.domain}</div>
              </div>
              <div className="bg-white p-2.5 rounded-xl border border-slate-200/80">
                <div className="text-slate-400 font-medium">Протокол:</div>
                <div className="font-bold text-slate-800">{directoryStatus.protocol}</div>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2">
            <button
              onClick={handleSync}
              disabled={isSyncing}
              className="flex-1 py-2.5 px-3 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-blue-600 ${isSyncing ? 'animate-spin' : ''}`} />
              <span>Синхронизировать с AD</span>
            </button>

            <button
              onClick={() => void logout()}
              className="py-2.5 px-3.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-xl border border-rose-200 flex items-center gap-1.5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Выйти</span>
            </button>
          </div>

          <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
            <div className="text-[11px] text-slate-500 leading-relaxed font-medium">
              Все входы, выходы и отказы в доступе записываются в журнал безопасности портала
              вместе с IP-адресом и временем.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
