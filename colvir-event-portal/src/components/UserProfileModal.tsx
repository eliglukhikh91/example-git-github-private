import React, { useState } from 'react';
import { useApp } from '../context/AppContext';
import { formatMoscowDateTime } from '../utils/timeUtils';
import { EventItem } from '../types';
import {
  X,
  User,
  History,
  Save,
  Trash2,
  CheckCircle2,
  ShieldCheck,
  Calendar,
  Sparkles,
  Building,
  Mail,
  Send,
  Phone,
  Clock,
  Gamepad2,
  Camera,
  Upload
} from 'lucide-react';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { userProfile, updateUserProfile, getUserRegistrations, cancelRegistration, events, isAdAuthenticated, adDomain } = useApp();

  const [activeTab, setActiveTab] = useState<'profile' | 'history'>('profile');

  // Form states
  const [firstName, setFirstName] = useState(userProfile.firstName);
  const [lastName, setLastName] = useState(userProfile.lastName);
  const [email, setEmail] = useState(userProfile.email);
  const [telegram, setTelegram] = useState(userProfile.telegram);
  const [phone, setPhone] = useState(userProfile.phone);
  const [department, setDepartment] = useState(userProfile.department);
  const [interests, setInterests] = useState<string[]>(userProfile.interests || []);
  const [newInterest, setNewInterest] = useState('');
  const [avatarUrl, setAvatarUrl] = useState(userProfile.avatarUrl || '');
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Synchronize local form state whenever userProfile or modal visibility changes
  React.useEffect(() => {
    if (isOpen) {
      setFirstName(userProfile.firstName || '');
      setLastName(userProfile.lastName || '');
      setEmail(userProfile.email || '');
      setTelegram(userProfile.telegram || '');
      setPhone(userProfile.phone || '');
      setDepartment(userProfile.department || '');
      setInterests(userProfile.interests || []);
      setAvatarUrl(userProfile.avatarUrl || '');
      setAvatarError(null);
    }
  }, [isOpen, userProfile]);

  if (!isOpen) return null;

  const registrations = getUserRegistrations();
  const eventMap = new Map<string, EventItem>(events.map((e) => [e.id, e]));

  const availableTags = [
    'Командные игры',
    'Английский язык',
    'Книги',
    'Искусственный интеллект',
    'Настолки',
    'Кофе',
    'Футбол',
    'Волейбол',
    'IT/Tech'
  ];

  const handleToggleInterest = (tag: string) => {
    if (interests.includes(tag)) {
      setInterests(interests.filter((t) => t !== tag));
    } else {
      setInterests([...interests, tag]);
    }
  };

  const handleAddCustomInterest = () => {
    if (newInterest.trim() && !interests.includes(newInterest.trim())) {
      setInterests([...interests, newInterest.trim()]);
      setNewInterest('');
    }
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 20 * 1024 * 1024) {
      setAvatarError('Максимальный размер фото профиля — 20 МБ.');
      return;
    }

    setAvatarError(null);
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const maxDim = 320;
          let width = img.width;
          let height = img.height;
          if (width > height) {
            if (width > maxDim) {
              height = Math.round((height * maxDim) / width);
              width = maxDim;
            }
          } else {
            if (height > maxDim) {
              width = Math.round((width * maxDim) / height);
              height = maxDim;
            }
          }
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const compressed = canvas.toDataURL('image/jpeg', 0.85);
            setAvatarUrl(compressed);
            updateUserProfile({
              ...userProfile,
              firstName: firstName.trim() || userProfile.firstName,
              lastName: lastName.trim() || userProfile.lastName,
              avatarUrl: compressed
            });
            setSavedSuccess(true);
            setTimeout(() => setSavedSuccess(false), 2500);
          } else {
            const rawUrl = reader.result as string;
            setAvatarUrl(rawUrl);
            updateUserProfile({
              ...userProfile,
              avatarUrl: rawUrl
            });
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateUserProfile({
      ...userProfile,
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      telegram: telegram.trim(),
      phone: phone.trim(),
      department: department.trim(),
      interests,
      avatarUrl
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-fadeIn">
      <div className="bg-white rounded-3xl shadow-2xl border border-slate-200 w-full max-w-2xl max-h-[90vh] overflow-y-auto flex flex-col">
        
        {/* Header */}
        <div className="p-6 border-b border-slate-100 flex items-center justify-between sticky top-0 bg-white/95 backdrop-blur-md z-10">
          <div className="flex items-center gap-3">
            <img
              src={avatarUrl || userProfile.avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=100&auto=format&fit=crop&q=80'}
              alt={userProfile.firstName}
              className="w-10 h-10 rounded-2xl object-cover ring-2 ring-[#1560AA]/30"
            />
            <div>
              <h2 className="text-xl font-extrabold text-slate-900 leading-tight">
                Личный кабинет сотрудника
              </h2>
              <p className="text-xs text-slate-500">
                {userProfile.lastName} {userProfile.firstName} — {userProfile.department}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-600 rounded-xl hover:bg-slate-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex border-b border-slate-100 bg-slate-50/80 px-6">
          <button
            onClick={() => setActiveTab('profile')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'profile'
                ? 'border-[#1560AA] text-[#1560AA]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-4 h-4" />
            <span>Профиль и интересы</span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`py-3.5 px-4 text-xs font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'history'
                ? 'border-[#1560AA] text-[#1560AA]'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <History className="w-4 h-4" />
            <span>История записей ({registrations.filter((r) => r.status !== 'cancelled').length})</span>
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6">
          
          {/* TAB 1: PROFILE EDITING */}
          {activeTab === 'profile' && (
            <form onSubmit={handleSave} className="space-y-5">
              
              {/* Active Directory SSO Status Banner */}
              <div className="p-3.5 bg-blue-50/80 border border-blue-200/80 rounded-2xl flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#1560AA] shrink-0" />
                  <div>
                    <div className="text-xs font-black text-[#1560AA] flex items-center gap-1.5">
                      <span>Аутентификация Active Directory</span>
                      <span className="bg-blue-200/70 text-[#1560AA] px-1.5 py-0.2 rounded-md text-[10px] font-black">{adDomain}</span>
                    </div>
                    <p className="text-[11px] text-slate-600 font-medium">
                      {isAdAuthenticated ? 'Учетная запись сотрудника Colvir подтверждена по SSO/LDAP' : 'Сессия Active Directory не активна'}
                    </p>
                  </div>
                </div>
                <span className={`px-2.5 py-1 text-[10px] font-black rounded-full uppercase ${
                  isAdAuthenticated ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                }`}>
                  {isAdAuthenticated ? 'Активно' : 'Гость'}
                </span>
              </div>
              
              {savedSuccess && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold rounded-xl flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  <span>Профиль успешно сохранен!</span>
                </div>
              )}

              {/* Avatar Upload (Up to 20 MB) */}
              <div className="flex items-center gap-4 p-4 bg-slate-50 border border-slate-200/80 rounded-2xl">
                <img
                  src={avatarUrl || 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'}
                  alt="Avatar"
                  className="w-16 h-16 rounded-2xl object-cover ring-2 ring-[#1560AA]/30 shrink-0"
                />
                <div className="space-y-1.5 flex-1">
                  <label className="block text-xs font-bold text-slate-800">
                    Фото профиля (до 20 МБ)
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="px-3 py-1.5 bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 text-xs font-bold rounded-xl cursor-pointer shadow-2xs transition-all flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-[#1560AA]" />
                      <span>Загрузить фото</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleAvatarUpload}
                        className="hidden"
                      />
                    </label>
                    <span className="text-[11px] text-slate-400">PNG, JPG, WEBP до 20 МБ</span>
                  </div>
                  {avatarError && (
                    <p className="text-[11px] text-red-600 font-semibold">{avatarError}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Фамилия <span className="text-slate-400 font-medium">(из AD)</span>
                  </label>
                  <input
                    type="text"
                    value={lastName}
                    readOnly
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 cursor-not-allowed outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Имя <span className="text-slate-400 font-medium">(из AD)</span>
                  </label>
                  <input
                    type="text"
                    value={firstName}
                    readOnly
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 cursor-not-allowed outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Рабочий Email <span className="text-slate-400 font-medium">(из AD)</span>
                  </label>
                  <input
                    type="email"
                    value={email}
                    readOnly
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 cursor-not-allowed outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Telegram handle
                  </label>
                  <input
                    type="text"
                    value={telegram}
                    onChange={(e) => setTelegram(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Телефон
                  </label>
                  <input
                    type="text"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-semibold focus:bg-white focus:border-[#1560AA] outline-hidden"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Отдел / Департамент <span className="text-slate-400 font-medium">(из AD)</span>
                  </label>
                  <input
                    type="text"
                    value={department}
                    readOnly
                    disabled
                    className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-sm font-semibold text-slate-600 cursor-not-allowed outline-hidden"
                  />
                </div>
              </div>

              {/* Interests Selector */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <label className="block text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-[#1560AA]" />
                  Мои интересы (для рекомендованных событий):
                </label>

                <div className="flex flex-wrap gap-2">
                  {availableTags.map((tag) => {
                    const isSelected = interests.includes(tag);
                    return (
                      <button
                        type="button"
                        key={tag}
                        onClick={() => handleToggleInterest(tag)}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                          isSelected
                            ? 'bg-[#1560AA] text-white shadow-2xs'
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        {isSelected ? '✓ ' : '+ '}
                        {tag}
                      </button>
                    );
                  })}
                </div>

                <div className="flex gap-2 pt-2">
                  <input
                    type="text"
                    value={newInterest}
                    onChange={(e) => setNewInterest(e.target.value)}
                    placeholder="Добавить свой интерес..."
                    className="flex-1 px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                  />
                  <button
                    type="button"
                    onClick={handleAddCustomInterest}
                    className="px-3 py-1.5 bg-slate-800 text-white text-xs font-bold rounded-xl"
                  >
                    Добавить
                  </button>
                </div>
              </div>

              <div className="pt-3">
                <button
                  type="submit"
                  className="w-full py-3 bg-[#1560AA] hover:bg-[#104d88] text-white font-bold text-sm rounded-xl shadow-xs transition-all flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  <span>Сохранить изменения профиля</span>
                </button>
              </div>

            </form>
          )}

          {/* TAB 2: REGISTRATION HISTORY */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              {registrations.length === 0 ? (
                <div className="text-center py-12 text-slate-400 space-y-2">
                  <Calendar className="w-10 h-10 mx-auto stroke-1" />
                  <p className="text-sm font-medium">У вас пока нет активных записей на мероприятия</p>
                </div>
              ) : (
                registrations.map((reg) => {
                  const evt = eventMap.get(reg.eventId);
                  const isCancelled = reg.status === 'cancelled';

                  return (
                    <div
                      key={reg.id}
                      className={`p-4 rounded-2xl border transition-all ${
                        isCancelled
                          ? 'bg-slate-50 border-slate-200 opacity-60'
                          : 'bg-white border-slate-200 shadow-xs'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span
                              className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-md ${
                                isCancelled
                                  ? 'bg-slate-200 text-slate-600'
                                  : 'bg-emerald-100 text-emerald-800'
                              }`}
                            >
                              {isCancelled ? 'Отменено' : 'Подтверждено'}
                            </span>
                            <span className="text-xs text-slate-400 font-medium">
                              {formatMoscowDateTime(reg.registeredAt)}
                            </span>
                          </div>

                          <h4 className="font-bold text-slate-900 text-base leading-snug">
                            {evt?.title || 'Мероприятие'}
                          </h4>

                          <div className="text-xs text-slate-600 space-y-1 pt-1">
                            <div>📅 Дата: <strong>{evt?.date}</strong> ({reg.timeSlot || '10:00'})</div>
                            <div>📍 Место: {evt?.location}</div>
                            {reg.isTeamGame && (
                              <div className="text-[#1560AA] font-bold flex items-center gap-1 pt-0.5">
                                <Gamepad2 className="w-3.5 h-3.5" />
                                Команда: {reg.teamName} ({reg.role === 'captain' ? '👑 Капитан' : '🏃 Игрок'})
                              </div>
                            )}
                          </div>
                        </div>

                        {!isCancelled && (
                          <button
                            onClick={() => cancelRegistration(reg.id)}
                            className="text-xs font-semibold text-red-600 hover:text-red-800 hover:bg-red-50 px-3 py-1.5 rounded-xl border border-red-200/60 transition-colors shrink-0"
                          >
                            Отменить запись
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};
