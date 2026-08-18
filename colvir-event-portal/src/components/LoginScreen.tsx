import React, { useState } from 'react';
import {
  Building2,
  ShieldCheck,
  Lock,
  KeyRound,
  User,
  RefreshCw,
  AlertTriangle,
  ShieldAlert,
  Server,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ColvirLogo } from './ColvirLogo';

/**
 * Экран входа. Портал не показывает никаких данных, пока сервер не подтвердил
 * учетную запись Active Directory — раньше приложение считало пользователя
 * авторизованным по умолчанию.
 */
export const LoginScreen: React.FC = () => {
  const { login, loginWithSso, directoryStatus } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsLoading(true);
    setError(null);

    const result = await login(email, password);
    // Пароль не остается ни в состоянии компонента, ни в хранилище браузера.
    setPassword('');
    if (!result.success) setError(result.message);
    setIsLoading(false);
  };

  const handleSso = async () => {
    setIsLoading(true);
    setError(null);
    const result = await loginWithSso();
    if (!result.success) setError(result.message);
    setIsLoading(false);
  };

  const allowedDomains = directoryStatus?.allowedDomains?.join(', ') ?? '';

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans antialiased">
      <div className="w-full max-w-md space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <ColvirLogo className="h-9" />
          <div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              Портал корпоративных мероприятий
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Вход по учетной записи Active Directory
            </p>
          </div>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 overflow-hidden">
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-accent flex items-center justify-center text-white shadow-md ring-4 ring-accent/10">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h2 className="text-base font-black text-slate-900">Colvir Active Directory</h2>
              <p className="text-[11px] text-slate-500 font-medium">
                {directoryStatus
                  ? `Домен ${directoryStatus.domain} · ${directoryStatus.protocol}`
                  : 'Проверка подключения к контроллеру домена…'}
              </p>
            </div>
          </div>

          <div className="p-6 space-y-5">
            {directoryStatus && (
              <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between text-[11px]">
                <span className="flex items-center gap-2 font-bold text-slate-700">
                  <Server className="w-3.5 h-3.5 text-blue-600" />
                  Контроллер домена
                </span>
                <span className="inline-flex items-center gap-1.5 font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                  {directoryStatus.status === 'online' ? 'Онлайн' : directoryStatus.status}
                </span>
              </div>
            )}

            {error && (
              <div className="p-4 rounded-2xl text-xs font-semibold flex items-start gap-3 bg-rose-50 text-rose-900 border border-rose-200">
                <AlertTriangle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
                <div className="leading-relaxed">{error}</div>
              </div>
            )}

            {directoryStatus?.ssoEnabled && (
              <div className="space-y-3">
                <div className="p-4 bg-blue-50/70 border border-blue-200/80 rounded-2xl space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-black text-accent">
                    <Sparkles className="w-4 h-4" />
                    <span>Сквозной вход по доменной учетной записи</span>
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed font-medium">
                    Работает в корпоративной сети и через VPN: шлюз проверяет билет
                    Kerberos вашей рабочей станции.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={handleSso}
                  disabled={isLoading}
                  className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white text-xs font-extrabold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {isLoading ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <ShieldCheck className="w-4 h-4" />
                  )}
                  <span>Войти через Colvir SSO</span>
                </button>

                <div className="flex items-center gap-3 text-[10px] font-bold text-slate-400 uppercase">
                  <span className="h-px bg-slate-200 flex-1" />
                  или
                  <span className="h-px bg-slate-200 flex-1" />
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="ad-login" className="text-xs font-bold text-slate-700">
                  Корпоративный email или логин AD
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="ad-login"
                    type="text"
                    required
                    autoComplete="username"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="i.ivanov@colvir.com"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-accent/30 outline-hidden"
                  />
                </div>
                {allowedDomains && (
                  <span className="text-[10px] text-slate-400">
                    Разрешенные домены: {allowedDomains}
                  </span>
                )}
              </div>

              <div className="space-y-1.5">
                <label htmlFor="ad-password" className="text-xs font-bold text-slate-700">
                  Доменный пароль
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                  <input
                    id="ad-password"
                    type="password"
                    required
                    autoComplete="current-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••••••"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-accent/30 outline-hidden"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 px-4 bg-accent hover:bg-accent-hover text-white text-xs font-extrabold rounded-2xl shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {isLoading ? (
                  <RefreshCw className="w-4 h-4 animate-spin" />
                ) : (
                  <Lock className="w-4 h-4" />
                )}
                <span>Войти в Active Directory</span>
              </button>
            </form>

            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-start gap-3">
              <ShieldAlert className="w-5 h-5 text-slate-500 shrink-0 mt-0.5" />
              <div className="text-[11px] text-slate-500 leading-relaxed font-medium">
                Доступ ограничен сотрудниками Colvir Software Solutions. Все попытки входа
                записываются в журнал безопасности портала.
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-[11px] text-slate-400">
          © 2026 Colvir Software Solutions
        </p>
      </div>
    </div>
  );
};
