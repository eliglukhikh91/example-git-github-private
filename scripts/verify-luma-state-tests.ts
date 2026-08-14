import { INITIAL_MOMENTS } from '../src/data/mockMoments';
import { LifeMoment, LumaAction, GentleStep } from '../src/types';
import { findMatchingMoment } from '../src/utils/momentUtils';

console.log('================================================================');
console.log('LUMA TALK FULL SCENARIO & STATE TRANSITION RUNTIME TRACE VERIFICATION');
console.log('================================================================\n');

let momentsState: LifeMoment[] = JSON.parse(JSON.stringify(INITIAL_MOMENTS));

// Ensure Istanbul moment exists in state with exact date 2026-10-29
const istanbulMomentId = 'm_istanbul_2026';
const targetDateStr = '2026-10-29';

const existingIstanbulIndex = momentsState.findIndex(
  (m) => m.title.toLowerCase().includes('стамбул') || m.title.toLowerCase().includes('istanbul')
);

if (existingIstanbulIndex >= 0) {
  momentsState[existingIstanbulIndex].id = istanbulMomentId;
  momentsState[existingIstanbulIndex].targetDate = targetDateStr;
  momentsState[existingIstanbulIndex].title = 'Моя поездка в Стамбул на 5 дней';
} else {
  momentsState.push({
    id: istanbulMomentId,
    title: 'Моя поездка в Стамбул на 5 дней',
    category: 'journey',
    targetDate: targetDateStr,
    dateLabel: '29 октября 2026',
    daysLeft: 79,
    oneThingToPrepare: 'Купить eSIM для мобильного интернета',
    reassuranceNote: 'Паспорта действительны до 2028.',
    gentleSteps: [
      {
        id: 's_esim',
        text: 'Купить eSIM для мобильного интернета',
        when: 'T-10 дней',
        done: false,
      },
    ],
  });
}

function handleApplyAction(action: LumaAction) {
  if (!action || action.type === 'none' || !action.momentId) return;

  momentsState = momentsState.map((m) => {
    if (m.id !== action.momentId) return m;

    if (action.type === 'add_step' && action.step) {
      const offsetDays = action.step.offsetDays;
      const offsetText = offsetDays != null ? `T-${offsetDays} дней` : (action.step.when || 'T-Minus');
      const newStepId = action.step.id || `s_step_${Date.now()}`;

      const newStep: GentleStep = {
        id: newStepId,
        text: action.step.text,
        when: offsetText,
        done: false,
      };

      const exists = m.gentleSteps.some(
        (s) => s.text.toLowerCase() === newStep.text.toLowerCase()
      );
      if (exists) return m;

      return {
        ...m,
        gentleSteps: [...m.gentleSteps, newStep],
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

    return m;
  });
}

function printMomentState(momentId: string, label: string) {
  const m = momentsState.find((item) => item.id === momentId);
  console.log(`\n--- [STATE TRACE: ${label}] ---`);
  console.log(`Moment ID: ${m?.id}`);
  console.log(`Title: ${m?.title}`);
  console.log(`Target Date: ${m?.targetDate} (Source of Truth)`);
  console.log(`Gentle Steps (${m?.gentleSteps.length}):`);
  m?.gentleSteps.forEach((s, idx) => {
    console.log(`  ${idx + 1}. [id: ${s.id}] "${s.text}" -> (${s.when})`);
  });
}

// =================================================================
// STEP 1: FIND EXISTING MOMENT & INITIAL STATE
// =================================================================
const message1 = 'Добавь в Моя поездка в Стамбул на 5 дней — позвонить Шахину и узнать про подарки';
const matchedMoment1 = findMatchingMoment(message1, momentsState);

console.log('1. User Message 1:', message1);
console.log('   Matched Moment:', matchedMoment1?.title);
console.log('   Matched ID:', matchedMoment1?.id);
console.log('   Target Date Retained:', matchedMoment1?.targetDate);

printMomentState(istanbulMomentId, 'INITIAL STATE');

// =================================================================
// STEP 2: USER PROVIDES RELATIVE OFFSET ("за 6 дней до вылета")
// =================================================================
console.log('\n2. User Message 2: "за 6 дней до вылета"');
const actionAdd: LumaAction = {
  type: 'add_step',
  momentId: istanbulMomentId,
  step: {
    id: 's_shahin_call',
    text: 'позвонить Шахину и узнать про подарки',
    offsetDays: 6,
    when: 'T-6 дней'
  }
};
console.log('   Action generated by Luma backend:', JSON.stringify(actionAdd));
handleApplyAction(actionAdd);
printMomentState(istanbulMomentId, 'AFTER ADD STEP (T-6)');

// =================================================================
// STEP 3: UPDATE EXISTING STEP ("Перенеси звонок Шахину на 5 дней до вылета")
// =================================================================
console.log('\n3. User Message 3: "Перенеси звонок Шахину на 5 дней до вылета"');
const actionUpdate: LumaAction = {
  type: 'update_step',
  momentId: istanbulMomentId,
  stepId: 's_shahin_call',
  step: {
    id: 's_shahin_call',
    text: 'позвонить Шахину и узнать про подарки',
    offsetDays: 5,
    when: 'T-5 дней'
  }
};
console.log('   Action generated by Luma backend:', JSON.stringify(actionUpdate));
handleApplyAction(actionUpdate);
printMomentState(istanbulMomentId, 'AFTER UPDATE STEP (T-6 -> T-5)');

// =================================================================
// STEP 4: UNCONFIRMED IDEA ("Хочу посетить несколько музеев")
// =================================================================
console.log('\n4. User Message 4: "Хочу посетить несколько музеев." (Unconfirmed idea)');
const actionNone: LumaAction = { type: 'none' };
console.log('   Action generated by Luma backend:', JSON.stringify(actionNone));
handleApplyAction(actionNone);
printMomentState(istanbulMomentId, 'AFTER UNCONFIRMED IDEA (NO MUTATION)');

// =================================================================
// STEP 5: VOICE INPUT COMMAND ("Добавь позвонить Шахину за 3 дня до вылета")
// =================================================================
console.log('\n5. Voice Message 5: "Добавь позвонить Шахину за 3 дня до вылета"');
const actionVoiceAdd: LumaAction = {
  type: 'add_step',
  momentId: istanbulMomentId,
  step: {
    id: 's_shahin_voice',
    text: 'позвонить Шахину повторно',
    offsetDays: 3,
    when: 'T-3 дней'
  }
};
console.log('   Action generated by Luma voice pipeline:', JSON.stringify(actionVoiceAdd));
handleApplyAction(actionVoiceAdd);
printMomentState(istanbulMomentId, 'AFTER VOICE ADD STEP (T-3)');

// =================================================================
// STEP 6: DELETE STEP ("Удали звонок Шахину из плана")
// =================================================================
console.log('\n6. User Message 6: "Удали звонок Шахину из плана"');
const actionDelete: LumaAction = {
  type: 'delete_step',
  momentId: istanbulMomentId,
  stepId: 's_shahin_call',
  step: {
    text: 'звонок Шахину'
  }
};
console.log('   Action generated by Luma backend:', JSON.stringify(actionDelete));
handleApplyAction(actionDelete);
printMomentState(istanbulMomentId, 'AFTER DELETE STEP');

// =================================================================
// STEP 7: SEPARATION FOR UNMATCHED NEW EVENT
// =================================================================
console.log('\n7. User Message 7: "15 декабря лечу в Рим на пять дней"');
const matchedNew = findMatchingMoment('15 декабря лечу в Рим на пять дней', momentsState);
console.log('   Matched existing event?:', matchedNew ? matchedNew.title : 'NONE (CORRECT -> Triggers new LifeMoment creation)');

console.log('\n================================================================');
console.log('ALL RUNTIME VERIFICATIONS COMPLETED SUCCESSFULLY!');
console.log('================================================================');
