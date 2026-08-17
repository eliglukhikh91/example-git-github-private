import React from 'react';
import { useApp } from '../context/AppContext';
import { Star } from 'lucide-react';
import blueGiftBoxImg from '../assets/images/blue_gift_box_1785842784484.jpg';
import springFlowerImg from '../assets/images/spring_flower_icon_1785843467346.jpg';
import newYearTreeImg from '../assets/images/new_year_tree_icon_1785843481320.jpg';

export const ThemedLogoDecorator: React.FC = () => {
  const { theme, setTheme, openThemeModal } = useApp();

  const handleThemeChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value as any;
    setTheme(val);
    if (val !== 'classic') {
      openThemeModal(val);
    }
  };

  return (
    <div className="px-3.5 pt-3 pb-1.5 bg-gradient-to-b from-[#EBF3FE] to-transparent border-b border-slate-200/80 flex items-center justify-between">
      {/* Theme decoration strictly ABOVE the logo - clickable to open 3D Modal */}
      <button
        onClick={() => openThemeModal(theme === 'classic' ? 'birthday' : theme)}
        className="flex items-center gap-1.5 transition-transform active:scale-95 cursor-pointer group"
        title="Нажмите, чтобы открыть 3D Тематическое Окно"
      >
        {theme === 'spring' && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-pink-200 text-pink-700 font-black text-[10px] rounded-lg shadow-2xs group-hover:bg-pink-50">
            <img src={springFlowerImg} alt="Spring" className="w-3.5 h-3.5 rounded-xs object-cover" />
            <span>Colvir Spring</span>
          </div>
        )}
        {theme === 'birthday' && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-amber-200 text-amber-800 font-black text-[10px] rounded-lg shadow-2xs group-hover:bg-amber-50">
            <img src={blueGiftBoxImg} alt="Birthday" className="w-3.5 h-3.5 rounded-xs object-cover" />
            <span>День Рождения</span>
          </div>
        )}
        {theme === 'newyear' && (
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-white border border-emerald-200 text-emerald-800 font-black text-[10px] rounded-lg shadow-2xs group-hover:bg-emerald-50">
            <img src={newYearTreeImg} alt="New Year" className="w-3.5 h-3.5 rounded-xs object-cover" />
            <span>Новый Год</span>
          </div>
        )}
        {theme === 'classic' && (
          <div className="flex items-center gap-1 px-2 py-0.5 bg-white border border-blue-200 text-[#1560AA] font-black text-[10px] rounded-lg shadow-2xs group-hover:bg-blue-50">
            <Star className="w-3 h-3 text-[#1560AA] fill-[#1560AA]" />
            <span>3D Окно Тем ✨</span>
          </div>
        )}
      </button>

      {/* Theme Switcher Selector */}
      <select
        value={theme}
        onChange={handleThemeChange}
        className="text-[10px] font-extrabold bg-white border border-blue-200 text-slate-800 rounded-lg px-2 py-1 shadow-2xs focus:outline-none focus:border-[#1560AA] cursor-pointer"
        title="Тематическое оформление платформы"
      >
        <option value="classic">🔵 Классика</option>
        <option value="spring">🌸 Colvir Spring</option>
        <option value="birthday">🎁 День Рождения</option>
        <option value="newyear">❄️ Новый Год</option>
      </select>
    </div>
  );
};

