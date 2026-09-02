import React, { useState } from 'react';
import {
  ShieldCheck,
  Lock,
  KeyRound,
  User,
  RefreshCw,
  AlertTriangle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { ColvirLogo } from './ColvirLogo';

/**
 * Экран входа. Портал не показывает никаких данных, пока сервер не подтвердил
 * учетную запись Active Directory — раньше приложение считало пользователя
 * авторизованным по умолчанию.
 *
 * На экране только логин, пароль и кнопка. Прежняя версия вокруг этих двух
 * полей показывала шапку с названием каталога и доменом, плашку «Контроллер
 * домена — онлайн», список разрешенных почтовых доменов и напоминание о журнале
 * безопасности. Сотруднику при входе ничего из этого не нужно: он вводит те же
 * логин и пароль, что и на рабочей станции.
 *
 * Из служебного осталось одно: предупреждение, когда контроллер домена
 * недоступен. Оно объясняет, почему вход не проходит, и в обычной ситуации не
 * показывается вовсе.
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

  const directoryOffline = Boolean(directoryStatus && directoryStatus.status !== 'online');

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4 font-sans antialiased">
      <div className="w-full max-w-sm space-y-5">
        <div className="flex flex-col items-center gap-3 text-center">
          <ColvirLogo className="h-9" />
          <h1 className="text-lg font-black text-slate-900 tracking-tight">
            Портал корпоративных мероприятий
          </h1>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 p-6 space-y-4">
          {directoryOffline && (
            <div className="p-3 rounded-2xl text-[11px] font-semibold flex items-start gap-2.5 bg-amber-50 text-amber-900 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-px" />
              <span className="leading-relaxed">
                Контроллер домена недоступен, вход может не сработать.
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
                <span>Войти по доменной учетной записи</span>
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
                Логин
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
                <input
                  id="ad-login"
                  type="text"
                  required
                  autoFocus
                  autoComplete="username"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="i.ivanov@colvir.com"
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:ring-2 focus:ring-accent/30 outline-hidden"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="ad-password" className="text-xs font-bold text-slate-700">
                Пароль
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
              <span>Войти</span>
            </button>
          </form>
        </div>

        <p className="text-center text-[11px] text-slate-400">
          © 2026 Colvir Software Solutions
        </p>
      </div>
    </div>
  );
};
