import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { LifeMoment } from '../types';
import { LanguageCode, TRANSLATIONS } from '../data/translations';
import { LumaLotusIcon, LumaCompassIcon, LumaVoiceIcon } from './icons/LumaIcons';
import { createLumaEntry } from '../services/lumaEntryService';
import { parseEventDate } from '../utils/dateParser';

interface MomentCreateModalProps {
  language: LanguageCode;
  isOpen: boolean;
  onClose: () => void;
  onAddMoment: (moment: LifeMoment) => void;
  plan?: 'free' | 'pro';
}

export const MomentCreateModal: React.FC<MomentCreateModalProps> = ({
  language,
  isOpen,
  onClose,
  onAddMoment,
  plan,
}) => {
  const [activeMode, setActiveMode] = useState<'ai' | 'manual'>('ai');
  const [title, setTitle] = useState('');
  const [dateLabel, setDateLabel] = useState('');
  const [focusStep, setFocusStep] = useState('');
  const [reassurance, setReassurance] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  if (!isOpen) return null;

  const t = TRANSLATIONS[language] || TRANSLATIONS.en;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    if (activeMode === 'ai') {
      setIsGenerating(true);
      try {
        const res = await createLumaEntry({
          text: title,
          date: dateLabel || undefined,
          language,
          source: 'create_modal_ai',
          plan,
        });
        if (res.success && res.moment) {
          onAddMoment(res.moment);
          setTitle('');
          setDateLabel('');
          onClose();
        }
      } catch (err) {
        console.error('Error in AI event generation:', err);
      } finally {
        setIsGenerating(false);
      }
    } else {
      // Manual creation
      const parsed = parseEventDate(title, dateLabel || undefined, undefined, language);
      const newMoment: LifeMoment = {
        id: `m_${Date.now()}`,
        title,
        category: 'journey',
        dateLabel: parsed.dateLabel,
        targetDate: parsed.targetDate,
        timeOfDay: parsed.timeOfDay,
        daysLeft: parsed.daysLeft,
        oneThingToPrepare: focusStep || t.defaultStepText,
        reassuranceNote: reassurance || t.organizedAssurance,
        gentleSteps: [
          {
            id: `s_${Date.now()}_1`,
            text: focusStep || t.defaultStepText,
            when: 'Today',
            done: false,
          },
        ],
      };

      onAddMoment(newMoment);
      setTitle('');
      setDateLabel('');
      setFocusStep('');
      setReassurance('');
      onClose();
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#3E3832]/30 backdrop-blur-sm animate-fade-in">
      <div className="bg-[#FAF8F5] border border-[#E6DFD5] rounded-3xl w-full max-w-md shadow-xl overflow-hidden text-[#3E3832] flex flex-col">
        
        {/* Header */}
        <div className="p-6 bg-[#F3EEE8] border-b border-[#E6DFD5] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <LumaLotusIcon className="w-5 h-5 text-[#5C6B52]" />
            <h2 className="font-serif text-xl text-[#3E3832]">{t.addMoment}</h2>
          </div>
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="p-1.5 rounded-full border border-[#E6DFD5] text-[#3E3832] hover:bg-[#E6DFD5] transition cursor-pointer disabled:opacity-40"
          >
            ✕
          </button>
        </div>

        {/* Tab Selector */}
        <div className="px-6 pt-5 shrink-0">
          <div className="p-1 rounded-xl bg-[#F3EEE8] flex gap-1">
            <button
              type="button"
              onClick={() => setActiveMode('ai')}
              disabled={isGenerating}
              className={`flex-1 py-2 px-1 text-[10px] sm:text-[11px] font-semibold rounded-lg transition-all break-words leading-tight flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-center ${
                activeMode === 'ai'
                  ? 'bg-[#2D2825] text-white shadow-xs'
                  : 'text-[#6B6258] hover:text-[#2D2825]'
              }`}
            >
              <span>✨</span>
              <span>{t.aiPlanningTab}</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveMode('manual')}
              disabled={isGenerating}
              className={`flex-1 py-2 px-1 text-[10px] sm:text-[11px] font-semibold rounded-lg transition-all break-words leading-tight flex flex-col sm:flex-row items-center justify-center gap-1 sm:gap-1.5 text-center ${
                activeMode === 'manual'
                  ? 'bg-[#2D2825] text-white shadow-xs'
                  : 'text-[#6B6258] hover:text-[#2D2825]'
              }`}
            >
              <span>✍️</span>
              <span>{t.manualPlanTab}</span>
            </button>
          </div>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          
          {activeMode === 'ai' ? (
            /* AI Mode Inputs */
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-[#A8A096] font-semibold">
                  {t.whatEventComing}
                </label>
                <input
                  type="text"
                  required
                  disabled={isGenerating}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.aiMomentPlaceholder}
                  className="w-full p-3.5 rounded-2xl bg-white border border-[#E6DFD5] focus:outline-none focus:border-[#5C6B52] text-xs text-[#3E3832]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-[#A8A096] font-semibold">
                  {t.whenIsItOptional}
                </label>
                <input
                  type="text"
                  disabled={isGenerating}
                  value={dateLabel}
                  onChange={(e) => setDateLabel(e.target.value)}
                  placeholder={t.whenIsItPlaceholder}
                  className="w-full p-3.5 rounded-2xl bg-white border border-[#E6DFD5] focus:outline-none focus:border-[#5C6B52] text-xs text-[#3E3832]"
                />
              </div>

              {/* Informative explanation note */}
              <div className="p-3.5 rounded-2xl bg-[#5C6B52]/5 border border-[#5C6B52]/10 text-[#5C6B52] flex items-start gap-2.5 leading-relaxed">
                <LumaLotusIcon className="w-4 h-4 shrink-0 mt-0.5 animate-pulse" />
                <span className="text-[11px]">
                  {t.lumaAnalysisNotice}
                </span>
              </div>
            </div>
          ) : (
            /* Manual Mode Inputs */
            <div className="space-y-4">
              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-[#A8A096] font-semibold">
                  {t.whatMomentComing}
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={t.manualWhatPlaceholder}
                  className="w-full p-3.5 rounded-2xl bg-white border border-[#E6DFD5] focus:outline-none focus:border-[#5C6B52] text-xs text-[#3E3832]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-[#A8A096] font-semibold">
                  {t.whenIsIt}
                </label>
                <input
                  type="text"
                  value={dateLabel}
                  onChange={(e) => setDateLabel(e.target.value)}
                  placeholder={t.whenIsItPlaceholder}
                  className="w-full p-3.5 rounded-2xl bg-white border border-[#E6DFD5] focus:outline-none focus:border-[#5C6B52] text-xs text-[#3E3832]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-[#A8A096] font-semibold">
                  {t.oneThingToPrep}
                </label>
                <input
                  type="text"
                  value={focusStep}
                  onChange={(e) => setFocusStep(e.target.value)}
                  placeholder={t.manualOneThingPlaceholder}
                  className="w-full p-3.5 rounded-2xl bg-white border border-[#E6DFD5] focus:outline-none focus:border-[#5C6B52] text-xs text-[#3E3832]"
                />
              </div>

              <div className="space-y-1">
                <label className="text-[10px] uppercase tracking-wider text-[#A8A096] font-semibold">
                  {t.quietReassuranceNote}
                </label>
                <input
                  type="text"
                  value={reassurance}
                  onChange={(e) => setReassurance(e.target.value)}
                  placeholder={t.manualReassurancePlaceholder}
                  className="w-full p-3.5 rounded-2xl bg-white border border-[#E6DFD5] focus:outline-none focus:border-[#5C6B52] text-xs text-[#3E3832]"
                />
              </div>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isGenerating || !title.trim()}
            className="w-full py-3.5 rounded-full bg-[#3E3832] text-[#FAF8F5] text-xs font-semibold hover:bg-[#2C2723] transition mt-4 shadow-sm flex items-center justify-center gap-2 cursor-pointer px-4 text-center break-words disabled:opacity-40"
          >
            {isGenerating ? (
              <>
                <LumaLotusIcon className="w-4 h-4 animate-spin text-[#C29E65]" />
                <span>{t.lumaThinkingAhead}</span>
              </>
            ) : activeMode === 'ai' ? (
              <span>✨ {t.createIntelligentPlan}</span>
            ) : (
              <span>{t.addMomentBtn}</span>
            )}
          </button>
        </form>

      </div>
    </div>,
    document.body
  );
};
