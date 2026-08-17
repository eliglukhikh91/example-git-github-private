import React, { useState, useEffect } from 'react';
import { Clock, Globe, ShieldCheck } from 'lucide-react';
import { getMoscowTimeString, getMoscowDateString } from '../utils/timeUtils';

interface MoscowClockProps {
  variant?: 'compact' | 'full' | 'badge';
  className?: string;
}

export const MoscowClock: React.FC<MoscowClockProps> = ({ variant = 'compact', className = '' }) => {
  const [timeStr, setTimeStr] = useState(() => getMoscowTimeString());
  const [dateStr, setDateStr] = useState(() => getMoscowDateString());

  useEffect(() => {
    const interval = setInterval(() => {
      setTimeStr(getMoscowTimeString());
      setDateStr(getMoscowDateString());
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  if (variant === 'badge') {
    return (
      <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 bg-blue-50 border border-blue-200/80 rounded-xl text-xs font-bold text-accent shadow-2xs ${className}`}>
        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
        <Clock className="w-3.5 h-3.5 text-accent" />
        <span className="font-mono tracking-tight">{timeStr}</span>
        <span className="text-[10px] px-1.5 py-0.2 bg-accent text-white rounded font-black uppercase">МСК</span>
      </div>
    );
  }

  if (variant === 'full') {
    return (
      <div className={`p-4 bg-gradient-to-r from-slate-900 to-blue-950 text-white rounded-2xl border border-blue-900/50 shadow-md ${className}`}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-blue-600/30 border border-blue-400/30 flex items-center justify-center text-blue-300">
              <Globe className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-black text-blue-200 uppercase tracking-wider block">
                Синхронизация времени
              </span>
              <span className="text-[11px] text-slate-300 font-medium">
                Часовой пояс: Москва (Europe/Moscow, UTC+3)
              </span>
            </div>
          </div>

          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 text-[10px] font-black rounded-full uppercase">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            Точное время МСК
          </span>
        </div>

        <div className="flex items-baseline justify-between pt-1">
          <div>
            <div className="text-2xl font-black font-mono tracking-tight text-white flex items-center gap-2">
              <span>{timeStr}</span>
              <span className="text-xs font-black px-2 py-0.5 bg-blue-600 text-white rounded-md uppercase">
                МСК
              </span>
            </div>
            <p className="text-xs text-slate-300 font-semibold mt-0.5">
              {dateStr}
            </p>
          </div>

          <div className="text-right text-[11px] text-slate-400 font-medium">
            <div className="flex items-center gap-1 text-blue-300 font-bold">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Единый стандарт</span>
            </div>
            <span>Все события создаются по МСК</span>
          </div>
        </div>
      </div>
    );
  }

  // Compact default variant
  return (
    <div className={`flex items-center gap-2 px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-200/80 transition-colors ${className}`}>
      <Clock className="w-3.5 h-3.5 text-accent" />
      <span className="font-mono tracking-tight text-slate-900">{timeStr}</span>
      <span className="text-[10px] font-black text-accent bg-blue-100 px-1.5 py-0.2 rounded uppercase">
        МСК
      </span>
    </div>
  );
};
