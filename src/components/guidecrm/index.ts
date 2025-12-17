/**
 * GUIDECRM - Gamified Onboarding System
 *
 * Main exports for the onboarding guide system.
 *
 * Quick Start:
 * 1. Wrap your app with GuidecrmProvider
 * 2. Add <Guidecrm /> component in your layout
 * 3. Add data-onboarding attributes to target UI elements
 * 4. Call emit functions after user actions
 *
 * Example:
 * ```tsx
 * // In your layout/AppShell:
 * import { GuidecrmProvider, Guidecrm } from '@/components/guidecrm';
 *
 * <GuidecrmProvider>
 *   <App />
 *   <Guidecrm />
 * </GuidecrmProvider>
 *
 * // In your components (e.g., after saving company settings):
 * import { guidecrmCompanySaved } from '@/components/guidecrm';
 *
 * const handleSave = async () => {
 *   await saveSettings();
 *   guidecrmCompanySaved(); // This marks step 1 complete
 * };
 * ```
 */

// Main components
export { Guidecrm } from './Guidecrm';
export { GuidecrmProvider, useGuidecrm, useGuidecrmSafe } from './GuidecrmContext';
export { GuidecrmProgressBar, GuidecrmProgressCompact } from './GuidecrmProgressBar';
export { GuidecrmTooltip } from './GuidecrmTooltip';
export { GuidecrmChecklist } from './GuidecrmChecklist';
export { GuidecrmCompletion, GuidecrmCompletionFallback } from './GuidecrmCompletion';

// Types
export type {
  OnboardingProgress,
  OnboardingStep,
  OnboardingStepKey,
  OnboardingStepTarget,
  OnboardingContextValue,
  OnboardingEventType,
  OnboardingEvent,
} from './guidecrmTypes';

export {
  ONBOARDING_STEPS,
  calculateProgressPercentage,
  getCurrentStep,
  getCompletedStepsCount,
} from './guidecrmTypes';

// Events - import these to emit events after user actions
export {
  emitOnboardingEvent,
  guidecrmCompanySaved,
  guidecrmTemplateCreated,
  guidecrmClientCreated,
  guidecrmQuoteCreated,
  guidecrmInvoiceCreated,
  guidecrmMemberInvited,
  guidecrmInventoryCreated,
  subscribeToOnboardingEvents,
  GUIDECRM_EVENT,
} from './guidecrmEvents';
