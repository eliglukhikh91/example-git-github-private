import React, { useState, useEffect } from 'react';
import { LifeMoment, LumaTab, LumaAction, GentleStep, UserProfileData } from './types';
import { LanguageCode } from './data/translations';
import { CalmHomeSpace } from './components/CalmHomeSpace';
import { MomentsSpace } from './components/MomentsSpace';
import { LumaTalkScreen } from './components/LumaTalkScreen';
import { LumaProfileScreen } from './components/LumaProfileScreen';
import { LumaNav, LumaDesktopSidebar } from './components/LumaNav';
import { MomentDetailModal } from './components/MomentDetailModal';
import { MomentCreateModal } from './components/MomentCreateModal';
import { LumaUpgradeModal } from './components/LumaUpgradeModal';
import { LoginScreen } from './components/LoginScreen';
import { useAuth } from './contexts/AuthContext';
import { createLumaEntry } from './services/lumaEntryService';
import { syncMomentsForReminders, syncNotificationPreferences } from './services/notificationService';
import { parseEventDate } from './utils/dateParser';
import { countMomentsThisMonth } from './utils/momentUtils';

export default function App() {
  const { user, loading: authLoading, isConfigured, logout, deleteAccount } = useAuth();

  const [moments, setMoments] = useState<LifeMoment[]>([]);
  const [activeTab, setActiveTab] = useState<LumaTab>('space');
  const [selectedMoment, setSelectedMoment] = useState<LifeMoment | null>(null);
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [language, setLanguage] = useState<LanguageCode>('en');

  const [isUpgradeOpen, setIsUpgradeOpen] = useState(false);

  const [profileData, setProfileData] = useState<UserProfileData>({
    name: '',
    email: '',
    preferredLanguage: 'English',
    homeLocation: '',
    travelPreferences: '',
    importantPreferences: '',
    communicationStyle: 'balanced',
    prepReminders: true,
    importantReminders: true,
    quietHours: true,
    quietHoursRange: '10:00 PM – 08:00 AM',
    plan: 'free',
  });

  // Load this account's moments + profile once we know who's signed in.
  // Data is namespaced per Firebase uid so different accounts on the same
  // browser never see each other's moments. If this uid has no data yet but
  // this browser has old (pre-auth) local data, adopt it once as a one-time
  // migration rather than silently discarding it.
  useEffect(() => {
    if (!user) return;

    try {
      const savedMoments = localStorage.getItem(`luma_moments_${user.uid}`);
      if (savedMoments) {
        setMoments(JSON.parse(savedMoments));
      } else {
        const legacyMoments = localStorage.getItem('luma_moments');
        setMoments(legacyMoments ? JSON.parse(legacyMoments) : []);
      }
    } catch (e) {
      console.error('Error loading moments', e);
    }

    try {
      const savedProfile = localStorage.getItem(`luma_user_profile_${user.uid}`);
      const legacyProfile = !savedProfile ? localStorage.getItem('luma_user_profile') : null;
      const parsed = savedProfile ? JSON.parse(savedProfile) : legacyProfile ? JSON.parse(legacyProfile) : null;
      setProfileData((prev) => ({
        ...prev,
        ...(parsed || {}),
        plan: parsed?.plan || 'free',
        // Name and email always come from the signed-in account, never from
        // old locally-typed values — this is the single source of truth now.
        name: user.displayName || prev.name,
        email: user.email || prev.email,
      }));
    } catch (e) {
      console.error('Error loading profile', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.uid]);

  // Save moments to this account's localStorage slot on any change.
  useEffect(() => {
    if (!user) return;
    try {
      localStorage.setItem(`luma_moments_${user.uid}`, JSON.stringify(moments));
    } catch (e) {
      console.error('Error saving moments', e);
    }
  }, [moments, user?.uid]);

  // Honest trial enforcement: there's no real payment processor wired up yet
  // (see LumaUpgradeModal — "Start free trial" just flips a local flag), so
  // nothing actually charges anyone when the 7-day trial ends. Without this
  // check, a person would silently keep full Pro access forever for free
  // once their trial passed. Once real billing (Stripe/App Store/Play
  // webhook) is in place, replace this with a check against the person's
  // actual subscription status instead of just expiring the local date.
  useEffect(() => {
    if (
      profileData.plan === 'pro' &&
      profileData.trialEndsAt &&
      new Date(profileData.trialEndsAt).getTime() < Date.now()
    ) {
      handleUpdateProfile({ plan: 'free' });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileData.plan, profileData.trialEndsAt]);

  // Keep the server's lightweight copy of moments (for reminder scheduling)
  // in sync. Debounced so rapid edits (e.g. typing a title) don't fire a
  // request per keystroke.
  useEffect(() => {
    if (!user) return;
    const timer = setTimeout(() => {
      syncMomentsForReminders(moments);
    }, 1500);
    return () => clearTimeout(timer);
  }, [moments, user?.uid]);

  const handleUpdateProfile = (updated: Partial<UserProfileData>) => {
    setProfileData((prev) => {
      // Name and email are owned by the signed-in account, not by this form.
      const { name: _ignoredName, email: _ignoredEmail, ...rest } = updated;
      const next = { ...prev, ...rest };
      try {
        if (user) {
          localStorage.setItem(`luma_user_profile_${user.uid}`, JSON.stringify(next));
        }
      } catch (e) {}

      // If a notification-relevant setting changed, ask the browser for
      // permission (only if reminders are now wanted) and tell the server
      // what to send and when.
      const notifKeys: (keyof UserProfileData)[] = ['prepReminders', 'importantReminders', 'quietHours', 'quietHoursRange'];
      if (notifKeys.some((k) => k in rest)) {
        syncNotificationPreferences(next, language).catch(() => {});
      }

      return next;
    });
  };

  const handleToggleStepDone = (momentId: string, stepId: string) => {
    setMoments((prev) =>
      prev.map((m) => {
        if (m.id !== momentId) return m;
        return {
          ...m,
          gentleSteps: m.gentleSteps.map((s) =>
            s.id === stepId ? { ...s, done: !s.done } : s
          ),
        };
      })
    );
  };

  const handleDeleteMoment = (momentId: string) => {
    setMoments((prev) => prev.filter((m) => m.id !== momentId));
    if (selectedMoment && selectedMoment.id === momentId) {
      setSelectedMoment(null);
    }
  };

  const handleUpdateMoment = (momentId: string, updatedFields: Partial<LifeMoment>) => {
    setMoments((prev) =>
      prev.map((m) => (m.id === momentId ? { ...m, ...updatedFields } : m))
    );
  };

  const handleClearMoments = () => {
    setMoments([]);
    setSelectedMoment(null);
  };

  const handleApplyAction = (action: LumaAction) => {
    if (!action || action.type === 'none' || !action.momentId) return;

    setMoments((prevMoments) => {
      return prevMoments.map((m) => {
        if (m.id !== action.momentId) return m;

        if (action.type === 'add_step' && action.step) {
          const offsetDays = action.step.offsetDays;
          const offsetText = offsetDays != null ? `T-${offsetDays} дней` : (action.step.when || 'T-Minus');
          const newStepId = action.step.id || `s_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

          const newStep: GentleStep = {
            id: newStepId,
            text: action.step.text,
            when: offsetText,
            done: false,
          };

          const exists = m.gentleSteps.some(
            (s) => s.text.toLowerCase() === newStep.text.toLowerCase()
          );
          if (exists) {
            return m;
          }

          return {
            ...m,
            gentleSteps: [...m.gentleSteps, newStep],
            oneThingToPrepare: m.oneThingToPrepare || newStep.text,
          };
        }

        if (action.type === 'update_step' && action.step) {
          const targetStepId = action.stepId || action.step.id;
          const offsetDays = action.step.offsetDays;
          const offsetText = offsetDays != null ? `T-${offsetDays} дней` : action.step.when;

          return {
            ...m,
            gentleSteps: m.gentleSteps.map((s) => {
              const isMatch =
                (targetStepId && s.id === targetStepId) ||
                (action.step?.text && s.text.toLowerCase().includes(action.step.text.toLowerCase())) ||
                (s.text.toLowerCase().includes('звонок') && action.step?.text.toLowerCase().includes('звонок'));

              if (isMatch) {
                return {
                  ...s,
                  text: action.step?.text || s.text,
                  when: offsetText || s.when,
                };
              }
              return s;
            }),
          };
        }

        if (action.type === 'delete_step') {
          const targetStepId = action.stepId || action.step?.id;
          return {
            ...m,
            gentleSteps: m.gentleSteps.filter((s) => {
              if (targetStepId && s.id === targetStepId) return false;
              if (
                action.step?.text &&
                (s.text.toLowerCase().includes(action.step.text.toLowerCase()) ||
                  action.step.text.toLowerCase().includes(s.text.toLowerCase()))
              ) {
                return false;
              }
              return true;
            }),
          };
        }

        if (action.type === 'update_moment' && action.momentFields) {
          let calculatedDaysLeft = m.daysLeft;
          const targetDateStr = action.momentFields.targetDate || m.targetDate;
          if (targetDateStr) {
            const parts = targetDateStr.split('-');
            if (parts.length === 3) {
              const yr = parseInt(parts[0], 10);
              const mo = parseInt(parts[1], 10) - 1;
              const da = parseInt(parts[2], 10);
              const now = new Date();
              const today0 = new Date(now.getFullYear(), now.getMonth(), now.getDate());
              const target0 = new Date(yr, mo, da);
              const diffMs = target0.getTime() - today0.getTime();
              calculatedDaysLeft = Math.round(diffMs / (1000 * 60 * 60 * 24));
            }
          }

          return {
            ...m,
            ...action.momentFields,
            daysLeft: calculatedDaysLeft,
          };
        }

        return m;
      });
    });
  };

  const handleAddNewMoment = async (entry: LifeMoment | string) => {
    const isFreeLimitReached = (!profileData.plan || profileData.plan === 'free') && countMomentsThisMonth(moments) >= 3;
    if (isFreeLimitReached) {
      setIsUpgradeOpen(true);
      return;
    }

    if (typeof entry === 'object') {
      const exists = moments.some(
        (m) => m.id === entry.id || m.title.toLowerCase() === entry.title.toLowerCase()
      );
      if (!exists) {
        setMoments((prev) => [{ ...entry, createdAt: entry.createdAt || new Date().toISOString() }, ...prev]);
      }
      return;
    }

    const titleStr = entry.trim();
    if (!titleStr) return;

    const exists = moments.some((m) => m.title.toLowerCase() === titleStr.toLowerCase());
    if (exists) return;

    try {
      const res = await createLumaEntry({
        text: titleStr,
        language,
        source: 'app_direct',
        plan: profileData.plan,
      });
      if (res.success && res.moment) {
        setMoments((prev) => [{ ...res.moment, createdAt: new Date().toISOString() }, ...prev]);
      }
    } catch (e) {
      const parsed = parseEventDate(titleStr, undefined, undefined, language);
      const newMoment: LifeMoment = {
        id: `m_${Date.now()}`,
        title: titleStr,
        category: 'journey',
        dateLabel: parsed.dateLabel,
        timeOfDay: parsed.timeOfDay,
        daysLeft: parsed.daysLeft,
        createdAt: new Date().toISOString(),
        oneThingToPrepare:
          language === 'ru'
            ? 'Купить eSIM для мобильного интернета по прибытии'
            : 'Buy eSIM for mobile data on arrival',
        reassuranceNote:
          language === 'ru'
            ? 'Паспорта действительны до 2028. Авиабилеты сохранены оффлайн.'
            : 'Passports valid until 2028. Flight tickets saved offline.',
        gentleSteps: [
          {
            id: `s_${Date.now()}`,
            text:
              language === 'ru'
                ? 'Купить eSIM для мобильного интернета по прибытии'
                : 'Buy eSIM for mobile data on arrival',
            when: 'Today',
            done: false,
          },
        ],
      };
      setMoments((prev) => [newMoment, ...prev]);
    }
  };

  // Auth gate: block the app entirely until someone is signed in with a
  // name set. LoginScreen itself handles the "Firebase not configured" state.
  if (authLoading) {
    return <div className="min-h-screen h-[100dvh] bg-[#F7F4EE]" />;
  }
  if (!isConfigured || !user || !user.displayName) {
    return <LoginScreen language={language} />;
  }

  return (
    <div className="min-h-screen h-[100dvh] bg-[#F7F4EE] text-[#2C2723] font-sans antialiased selection:bg-[#E5DFD4] flex flex-col md:flex-row overflow-hidden">
      
      {/* Desktop & Tablet Sidebar Navigation */}
      <LumaDesktopSidebar
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        language={language}
        userName={profileData.name}
        userEmail={profileData.email}
      />

      {/* Main Content Workspace Canvas */}
      <main className={`flex-1 flex flex-col h-full min-h-0 relative w-full overflow-y-auto ${
        activeTab === 'talk' ? 'p-3 pb-28 md:p-6 md:pb-6 overflow-hidden' : 'p-4 md:p-8 lg:p-10 pb-28 md:pb-12'
      }`}>
        {activeTab === 'space' && (
          <CalmHomeSpace
            language={language}
            userName={profileData.name}
            moments={moments}
            onOpenTalk={() => setActiveTab('talk')}
            onOpenMoments={() => setActiveTab('moments')}
            onToggleStepDone={handleToggleStepDone}
            onAddNewMoment={handleAddNewMoment}
            onSelectMoment={(moment) => setSelectedMoment(moment)}
            onOpenCreateModal={() => {
              if ((!profileData.plan || profileData.plan === 'free') && countMomentsThisMonth(moments) >= 3) {
                setIsUpgradeOpen(true);
              } else {
                setIsCreateOpen(true);
              }
            }}
          />
        )}

        {activeTab === 'talk' && (
          <LumaTalkScreen
            language={language}
            moments={moments}
            onAddNewMoment={handleAddNewMoment}
            onApplyAction={handleApplyAction}
            onDeleteMoment={handleDeleteMoment}
            onUpdateMoment={handleUpdateMoment}
            plan={profileData.plan}
          />
        )}

        {activeTab === 'moments' && (
          <MomentsSpace
            language={language}
            moments={moments}
            onSelectMoment={(moment) => setSelectedMoment(moment)}
            onOpenCreateModal={() => {
              if ((!profileData.plan || profileData.plan === 'free') && countMomentsThisMonth(moments) >= 3) {
                setIsUpgradeOpen(true);
              } else {
                setIsCreateOpen(true);
              }
            }}
            onOpenTalk={() => setActiveTab('talk')}
            onToggleStepDone={handleToggleStepDone}
            onAddStep={(momentId, newStep) => {
              handleApplyAction({
                type: 'add_step',
                momentId,
                step: newStep,
              });
            }}
          />
        )}

        {activeTab === 'profile' && (
          <LumaProfileScreen
            language={language}
            onLanguageChange={(lang) => setLanguage(lang)}
            profileData={profileData}
            onUpdateProfile={handleUpdateProfile}
            momentsCount={moments.length}
            momentsThisMonth={countMomentsThisMonth(moments)}
            moments={moments}
            onOpenUpgradeModal={() => setIsUpgradeOpen(true)}
            onClearHistory={handleClearMoments}
            onSignOut={logout}
            onDeleteAccount={deleteAccount}
          />
        )}
      </main>

      {/* Floating Bottom Pill Navigation (Mobile only) */}
      <LumaNav
        language={language}
        activeTab={activeTab}
        onSelectTab={(tab) => setActiveTab(tab)}
        userName={profileData.name}
        userEmail={profileData.email}
      />

      {/* Modals for Mobile / Direct Detail & Creation */}
      <MomentDetailModal
        language={language}
        moment={selectedMoment ? moments.find((m) => m.id === selectedMoment.id) || selectedMoment : null}
        onClose={() => setSelectedMoment(null)}
        onToggleStep={handleToggleStepDone}
        onAddStep={(momentId, newStep) => {
          handleApplyAction({
            type: 'add_step',
            momentId,
            step: newStep,
          });
        }}
        onDeleteMoment={handleDeleteMoment}
        onUpdateMoment={handleUpdateMoment}
      />

      <MomentCreateModal
        language={language}
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onAddMoment={(m) => handleAddNewMoment(m)}
        plan={profileData.plan}
      />

      <LumaUpgradeModal
        language={language}
        isOpen={isUpgradeOpen}
        onClose={() => setIsUpgradeOpen(false)}
        onUpgrade={(billingCycle) => {
          const trialEndsAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();
          handleUpdateProfile({ plan: 'pro', billingCycle, trialEndsAt });
          setIsUpgradeOpen(false);
        }}
      />

    </div>
  );
}
