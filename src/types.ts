export type LumaTab = 'space' | 'talk' | 'moments' | 'profile';

export interface UserProfileData {
  name: string;
  email: string;
  preferredLanguage: string;
  homeLocation: string;
  travelPreferences: string;
  importantPreferences: string;
  communicationStyle: 'concise' | 'balanced' | 'detailed';
  prepReminders: boolean;
  importantReminders: boolean;
  quietHours: boolean;
  quietHoursRange: string;
  plan?: 'free' | 'pro';
  billingCycle?: 'monthly' | 'annual';
  trialEndsAt?: string; // ISO date — set when a free trial starts
}


export interface GentleStep {
  id: string;
  text: string;
  when: string; // e.g. "Today", "2 days before", "Day of event"
  done: boolean;
}

export interface LifeMoment {
  id: string;
  title: string;
  originalPrompt?: string;
  purpose?: string;
  category: 'journey' | 'health' | 'career' | 'family' | 'personal' | string;
  dateLabel: string; // e.g. "Next Thursday, Oct 12"
  targetDate?: string; // e.g. "2026-10-29"
  daysLeft: number;
  timeOfDay?: string;
  timezone?: string; // e.g. "Asia/Dubai", "Europe/London", "America/New_York"
  oneThingToPrepare: string; // The single clear focus
  reassuranceNote: string; // "Passports valid. Weather is mild."
  gentleSteps: GentleStep[];
  notes?: string;
  createdAt?: string; // ISO timestamp — when this moment was added, used for the Free plan's monthly cap
}

export interface VoiceMessage {
  id: string;
  sender: 'user' | 'luma';
  text: string;
  timestamp: string;
  proposal?: {
    type: 'delete' | 'edit';
    momentId: string;
    changes?: {
      title?: string;
      dateLabel?: string;
      timeOfDay?: string;
      targetDate?: string;
      daysLeft?: number;
    };
  };
}

export interface LumaStepPayload {
  id?: string;
  text: string;
  when?: string;
  offsetDays?: number;
  done?: boolean;
}

export interface LumaAction {
  type: 'none' | 'add_step' | 'update_step' | 'delete_step' | 'update_moment';
  momentId?: string;
  stepId?: string;
  step?: LumaStepPayload;
  momentFields?: Partial<LifeMoment>;
}

export interface LumaEventContext {
  momentId?: string;
  originalEvent?: string;
  eventType?: string;
  eventGoal?: string;
  date?: string;
  targetDate?: string;
  time?: string;
  timezone?: string;
  participants?: string;
  userDetails?: string;
  discoveredFacts?: string[];
  gentleSteps?: GentleStep[];
}

