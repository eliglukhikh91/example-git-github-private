import React from 'react';
import { LumaTab } from '../types';
import { LanguageCode, TRANSLATIONS } from '../data/translations';
import {
  LumaLeafIcon,
  LumaVoiceIcon,
  LumaHorizonIcon,
  LumaUserIcon,
} from './icons/LumaIcons';

interface LumaNavProps {
  activeTab: LumaTab;
  onSelectTab: (tab: LumaTab) => void;
  language: LanguageCode;
  userName?: string;
  userEmail?: string;
}

export const LumaNav: React.FC<LumaNavProps> = ({
  activeTab,
  onSelectTab,
  language,
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const tabs: { id: LumaTab; label: string; icon: React.FC<any> }[] = [
    { id: 'space', label: t.navSpace || 'SPACE', icon: LumaLeafIcon },
    { id: 'talk', label: t.navTalk || 'TALK', icon: LumaVoiceIcon },
    { id: 'moments', label: t.navMoments || 'MOMENTS', icon: LumaHorizonIcon },
    { id: 'profile', label: t.navProfile || 'PROFILE', icon: LumaUserIcon },
  ];

  return (
    <div 
      className="md:hidden fixed left-0 right-0 z-50 px-4 flex justify-center pointer-events-none"
      style={{ bottom: 'max(16px, env(safe-area-inset-bottom))' }}
    >
      <div className="w-full max-w-sm bg-[#FAF7F2] border border-[#E5DFD4] rounded-full p-1.5 shadow-lg flex items-center justify-around pointer-events-auto">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onSelectTab(tab.id)}
              className={`flex flex-col items-center justify-center transition-all cursor-pointer py-1.5 px-1.5 sm:px-3 rounded-full flex-1 ${
                isActive
                  ? 'bg-[#E5DFD4] text-[#2C2723] font-semibold'
                  : 'text-[#6B6258] hover:text-[#2C2723]'
              }`}
            >
              <Icon className="w-4 h-4 mb-0.5 shrink-0" strokeWidth={1.25} />
              <span className="text-[8px] sm:text-[10px] tracking-wider sm:tracking-widest uppercase font-medium break-words text-center leading-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
};

export const LumaDesktopSidebar: React.FC<LumaNavProps> = ({
  activeTab,
  onSelectTab,
  language,
  userName = 'Guest',
  userEmail = '',
}) => {
  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const tabs: { id: LumaTab; label: string; icon: React.FC<any> }[] = [
    { id: 'space', label: t.navSpace || 'SPACE', icon: LumaLeafIcon },
    { id: 'talk', label: t.navTalk || 'TALK', icon: LumaVoiceIcon },
    { id: 'moments', label: t.navMoments || 'MOMENTS', icon: LumaHorizonIcon },
    { id: 'profile', label: t.navProfile || 'PROFILE', icon: LumaUserIcon },
  ];

  return (
    <aside className="hidden md:flex flex-col w-56 lg:w-64 xl:w-72 bg-[#FAF7F2] border-r border-[#E5DFD4] p-4 lg:p-6 justify-between shrink-0 h-full select-none overflow-y-auto">
      <div className="space-y-8">
        {/* Brand & Status Indicator Header */}
        <div className="space-y-3">
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

          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white border border-[#E5DFD4] shadow-3xs text-[11px] text-[#5C6B52] font-medium">
            <span className="w-2 h-2 rounded-full bg-[#5C6B52] animate-pulse" />
            <span>{t.youreAllSet || "You’re all set"}</span>
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          <div className="px-3 text-[10px] font-mono uppercase tracking-widest text-[#6B6258] font-semibold mb-2">
            Workspace
          </div>
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                onClick={() => onSelectTab(tab.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-3 rounded-2xl transition-all cursor-pointer text-xs ${
                  isActive
                    ? 'bg-[#E5DFD4] text-[#2C2723] font-semibold shadow-3xs'
                    : 'text-[#6B6258] hover:text-[#2C2723] hover:bg-[#F2ECE4]/60 font-medium'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" strokeWidth={1.5} />
                <span className="tracking-wider uppercase font-medium text-[11px]">
                  {tab.label}
                </span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* User Profile Quick Card at Bottom */}
      <button
        onClick={() => onSelectTab('profile')}
        className={`p-3 rounded-2xl border transition flex items-center gap-3 text-left cursor-pointer ${
          activeTab === 'profile'
            ? 'bg-white border-[#5C6B52] shadow-2xs'
            : 'bg-white/80 border-[#E5DFD4] hover:border-[#5C6B52]/50 hover:bg-white'
        }`}
      >
        <div className="w-9 h-9 rounded-full bg-[#2C2723] text-white flex items-center justify-center font-serif text-sm font-medium shrink-0">
          {userName ? userName.charAt(0).toUpperCase() : '?'}
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-serif text-sm font-medium text-[#2C2723] truncate">
            {userName}
          </div>
          <div className="text-[10px] text-[#6B6258] truncate font-mono">
            {userEmail}
          </div>
        </div>
      </button>
    </aside>
  );
};
