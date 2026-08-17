import React from 'react';
import { useApp } from '../context/AppContext';
import blueGiftBoxImg from '../assets/images/blue_gift_box_1785842784484.jpg';
import springFlowerImg from '../assets/images/spring_flower_icon_1785843467346.jpg';
import newYearTreeImg from '../assets/images/new_year_tree_icon_1785843481320.jpg';

export const ThemeBanner: React.FC = () => {
  const { theme, cmsContent } = useApp();

  if (theme === 'classic') return null;

  return (
    <div className="relative overflow-hidden bg-gradient-to-r from-[#EBF3FE] via-[#DDEBFE] to-[#C8E0FE] border-b-2 border-white/80 px-5 py-4 sm:py-4.5 shadow-[0_12px_32px_rgba(21,96,170,0.15)]">
      
      {/* Background Volumetric Light */}
      <div className="absolute -right-10 -top-10 w-64 h-64 bg-[#1560AA]/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -left-10 -bottom-10 w-48 h-48 bg-white/40 rounded-full blur-2xl pointer-events-none" />
      
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4 relative z-10">
        
        {/* Banner Content */}
        <div className="flex items-center gap-4 sm:gap-5">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/95 border-2 border-white shadow-[0_8px_20px_rgba(21,96,170,0.22)] flex items-center justify-center shrink-0 text-3xl sm:text-4xl overflow-hidden p-1 transform hover:scale-105 transition-transform">
            {theme === 'spring' && (
              <img src={springFlowerImg} alt="Colvir Spring" className="w-full h-full object-cover rounded-xl shadow-2xs" />
            )}
            {theme === 'birthday' && (
              <img src={blueGiftBoxImg} alt="Gift Box" className="w-full h-full object-cover rounded-xl shadow-2xs" />
            )}
            {theme === 'newyear' && (
              <img src={newYearTreeImg} alt="New Year Tree" className="w-full h-full object-cover rounded-xl shadow-2xs" />
            )}
          </div>

          <div>
            <h2 className="text-base sm:text-lg md:text-xl lg:text-2xl font-black text-slate-900 tracking-tight leading-snug">
              {theme === 'spring' && (cmsContent?.holidayBannerSpringText || 'Colvir Spring: Атмосфера свежести и весеннего вдохновения!')}
              {theme === 'birthday' && (cmsContent?.holidayBannerBirthdayText || 'День Рождения Colvir: Празднуем успехи компании вместе!')}
              {theme === 'newyear' && (cmsContent?.holidayBannerNewYearText || 'Новый Год в Colvir: Зимняя сказка и праздничное настроение!')}
            </h2>
          </div>
        </div>

      </div>
    </div>
  );
};


