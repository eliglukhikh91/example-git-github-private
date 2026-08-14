import React from 'react';
import { LanguageCode, TRANSLATIONS } from '../data/translations';

interface LumaHeaderBarProps {
  language?: LanguageCode;
  compact?: boolean;
}

export const LumaHeaderBar: React.FC<LumaHeaderBarProps> = ({ language = 'en', compact = false }) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  return (
    <header className={`w-full flex items-center justify-between z-20 relative ${compact ? 'py-1.5 mb-2' : 'py-3 mb-3'}`}>
      {/* Restored Iconic Luma Brand Mark & Logo */}
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-[#2C2723] flex items-center justify-center text-[#FAF4EE] shadow-xs select-none">
          <span className="font-serif text-sm sm:text-base font-semibold leading-none mt-[-1px]">
            L
          </span>
        </div>
        <div className="flex flex-col">
          <span className="font-serif text-base sm:text-lg font-normal tracking-widest text-[#2C2723] uppercase leading-none">
            LUMA
          </span>
        </div>
      </div>

      {/* Subtle status indicator */}
      <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-[#FAF7F2] border border-[#E5DFD4] text-[10px] text-[#5C6B52] font-medium">
        <span className="w-1.5 h-1.5 rounded-full bg-[#5C6B52] animate-pulse" />
        <span>{t.youreAllSet || "You’re all set"}</span>
      </div>
    </header>
  );
};
