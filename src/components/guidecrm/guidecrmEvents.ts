/**
 * GUIDECRM - Event System
 *
 * This file handles events that trigger onboarding step completions.
 * Call these functions after successful actions in your components.
 *
 * Usage example:
 * import { emitOnboardingEvent } from '@/components/guidecrm/guidecrmEvents';
 * // After saving company settings:
 * emitOnboardingEvent('guidecrm:company_saved');
 */

import { OnboardingEventType, OnboardingEvent } from './guidecrmTypes';

// Event name constant
export const GUIDECRM_EVENT = 'guidecrm:event';

/**
 * Emit an onboarding event
 * This will be caught by the OnboardingContext to update progress
 */
export function emitOnboardingEvent(
  type: OnboardingEventType,
  payload?: OnboardingEvent['payload']
): void {
  const event = new CustomEvent<OnboardingEvent>(GUIDECRM_EVENT, {
    detail: { type, payload },
  });
  window.dispatchEvent(event);
}

// =========================================
// CONVENIENCE FUNCTIONS FOR EACH STEP
// =========================================

/**
 * Step 1: Call when company settings are saved
 */
export function guidecrmCompanySaved(): void {
  emitOnboardingEvent('guidecrm:company_saved');
}

/**
 * Step 2: Call when a template is created
 * @param templateType - 'QUOTE' or 'INVOICE'
 */
export function guidecrmTemplateCreated(templateType: 'QUOTE' | 'INVOICE'): void {
  emitOnboardingEvent('guidecrm:template_created', { templateType });
}

/**
 * Step 3: Call when a client is created
 */
export function guidecrmClientCreated(): void {
  emitOnboardingEvent('guidecrm:client_created');
}

/**
 * Step 4: Call when a quote/devis is created
 */
export function guidecrmQuoteCreated(): void {
  emitOnboardingEvent('guidecrm:quote_created');
}

/**
 * Step 5: Call when an invoice/facture is created
 */
export function guidecrmInvoiceCreated(): void {
  emitOnboardingEvent('guidecrm:invoice_created');
}

/**
 * Step 6: Call when a team member is invited
 */
export function guidecrmMemberInvited(): void {
  emitOnboardingEvent('guidecrm:member_invited');
}

/**
 * Step 7: Call when an inventory item is created
 */
export function guidecrmInventoryCreated(): void {
  emitOnboardingEvent('guidecrm:inventory_created');
}

// =========================================
// LISTENER HELPER
// =========================================

/**
 * Subscribe to onboarding events
 * @returns Cleanup function
 */
export function subscribeToOnboardingEvents(
  callback: (event: OnboardingEvent) => void
): () => void {
  const handler = (e: Event) => {
    const customEvent = e as CustomEvent<OnboardingEvent>;
    callback(customEvent.detail);
  };

  window.addEventListener(GUIDECRM_EVENT, handler);
  return () => window.removeEventListener(GUIDECRM_EVENT, handler);
}
