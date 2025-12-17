/**
 * GUIDECRM - Gamified Onboarding System Types
 *
 * This file contains all TypeScript types for the onboarding guide system.
 * To modify steps or add new ones, update ONBOARDING_STEPS below.
 */

// =========================================
// DATABASE TYPES
// =========================================

export interface OnboardingProgress {
  id: string;
  user_id: string;
  company_id: string;
  company_done: boolean;
  template_quote_done: boolean;
  template_invoice_done: boolean;
  client_done: boolean;
  quote_done: boolean;
  invoice_done: boolean;
  member_done: boolean;
  inventory_done: boolean;
  completed_at: string | null;
  created_at: string;
  updated_at: string;
}

// =========================================
// STEP DEFINITIONS
// =========================================

export type OnboardingStepKey =
  | 'company'
  | 'templates'
  | 'client'
  | 'quote'
  | 'invoice'
  | 'member'
  | 'inventory';

export interface OnboardingStepTarget {
  selector: string;         // data-onboarding attribute value
  description: string;      // What the user should do
  position?: 'top' | 'bottom' | 'left' | 'right'; // Tooltip position
}

export interface OnboardingStep {
  key: OnboardingStepKey;
  number: number;
  title: string;
  description: string;
  route: string;            // Route to navigate to
  targets: OnboardingStepTarget[];  // DOM elements to highlight
  checkComplete: (progress: OnboardingProgress) => boolean;
}

// =========================================
// STEP CONFIGURATION
// =========================================

/**
 * ONBOARDING_STEPS - Main configuration for all onboarding steps
 *
 * To modify steps:
 * 1. Update the step definition below
 * 2. Add corresponding data-onboarding attributes to the UI components
 * 3. Update the event listeners in guidecrmEvents.ts
 */
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: 'company',
    number: 1,
    title: 'Informations de l\'entreprise',
    description: 'Remplissez les informations de votre société (nom, SIRET, adresse...)',
    route: '/parametres',
    targets: [
      { selector: 'nav-parametres', description: 'Cliquez sur Paramètres', position: 'right' },
      { selector: 'tab-societe', description: 'Onglet Société', position: 'bottom' },
      { selector: 'btn-save-company', description: 'Enregistrez les informations', position: 'top' },
    ],
    checkComplete: (p) => p.company_done,
  },
  {
    key: 'templates',
    number: 2,
    title: 'Modèles devis & facture',
    description: 'Créez au moins un modèle de devis ET un modèle de facture',
    route: '/parametres',
    targets: [
      { selector: 'nav-parametres', description: 'Cliquez sur Paramètres', position: 'right' },
      { selector: 'tab-modeles', description: 'Onglet Modèles', position: 'bottom' },
      { selector: 'btn-new-template', description: 'Créez un nouveau modèle', position: 'bottom' },
      { selector: 'select-template-type', description: 'Choisissez Devis ou Facture', position: 'bottom' },
      { selector: 'btn-save-template', description: 'Sauvegardez le modèle', position: 'top' },
    ],
    checkComplete: (p) => p.template_quote_done && p.template_invoice_done,
  },
  {
    key: 'client',
    number: 3,
    title: 'Créer un client',
    description: 'Ajoutez votre premier client dans le CRM',
    route: '/clients',
    targets: [
      { selector: 'nav-clients', description: 'Cliquez sur Clients', position: 'right' },
      { selector: 'btn-new-client', description: 'Nouveau client', position: 'bottom' },
      { selector: 'input-client-nom', description: 'Entrez le nom du client', position: 'right' },
      { selector: 'btn-create-client', description: 'Créez le client', position: 'top' },
    ],
    checkComplete: (p) => p.client_done,
  },
  {
    key: 'quote',
    number: 4,
    title: 'Créer un devis',
    description: 'Créez votre premier devis pour un client',
    route: '/devis',
    targets: [
      { selector: 'nav-devis', description: 'Cliquez sur Devis', position: 'right' },
      { selector: 'btn-new-devis', description: 'Nouveau devis', position: 'bottom' },
      { selector: 'btn-save-devis', description: 'Enregistrez le devis', position: 'top' },
    ],
    checkComplete: (p) => p.quote_done,
  },
  {
    key: 'invoice',
    number: 5,
    title: 'Créer une facture',
    description: 'Créez votre première facture',
    route: '/factures',
    targets: [
      { selector: 'nav-factures', description: 'Cliquez sur Factures', position: 'right' },
      { selector: 'btn-new-facture', description: 'Nouvelle facture', position: 'bottom' },
      { selector: 'btn-save-facture', description: 'Enregistrez la facture', position: 'top' },
    ],
    checkComplete: (p) => p.invoice_done,
  },
  {
    key: 'member',
    number: 6,
    title: 'Ajouter un membre',
    description: 'Invitez un membre à rejoindre votre équipe',
    route: '/equipe',
    targets: [
      { selector: 'nav-equipe', description: 'Cliquez sur Équipe', position: 'right' },
      { selector: 'btn-invite-member', description: 'Inviter un employé', position: 'bottom' },
      { selector: 'input-member-nom', description: 'Entrez le nom', position: 'right' },
      { selector: 'input-member-email', description: 'Entrez l\'email', position: 'right' },
      { selector: 'btn-create-member', description: 'Invitez le membre', position: 'top' },
    ],
    checkComplete: (p) => p.member_done,
  },
  {
    key: 'inventory',
    number: 7,
    title: 'Ajouter un produit',
    description: 'Ajoutez un article à votre inventaire',
    route: '/inventaire/consommables',
    targets: [
      { selector: 'nav-inventaire', description: 'Cliquez sur Inventaire', position: 'right' },
      { selector: 'btn-new-consommable', description: 'Nouveau consommable', position: 'bottom' },
      { selector: 'input-item-nom', description: 'Entrez le nom du produit', position: 'right' },
      { selector: 'btn-create-item', description: 'Créez l\'article', position: 'top' },
    ],
    checkComplete: (p) => p.inventory_done,
  },
];

// =========================================
// CONTEXT TYPES
// =========================================

export interface OnboardingContextValue {
  // State
  progress: OnboardingProgress | null;
  loading: boolean;
  error: string | null;
  isOnboardingComplete: boolean;
  currentStep: OnboardingStep | null;
  currentStepIndex: number;

  // Computed
  progressPercentage: number;
  completedSteps: number;
  totalSteps: number;

  // Actions
  markStepComplete: (stepKey: OnboardingStepKey, subKey?: 'template_quote' | 'template_invoice') => Promise<void>;
  goToStep: (step: OnboardingStep) => void;
  goToNextStep: () => void;
  dismissOnboarding: () => void;
  resetOnboarding: () => Promise<void>;
  refreshProgress: () => Promise<void>;

  // UI State
  showGuide: boolean;
  setShowGuide: (show: boolean) => void;
  highlightedTarget: string | null;
  setHighlightedTarget: (target: string | null) => void;
}

// =========================================
// EVENT TYPES
// =========================================

export type OnboardingEventType =
  | 'guidecrm:company_saved'
  | 'guidecrm:template_created'
  | 'guidecrm:client_created'
  | 'guidecrm:quote_created'
  | 'guidecrm:invoice_created'
  | 'guidecrm:member_invited'
  | 'guidecrm:inventory_created';

export interface OnboardingEvent {
  type: OnboardingEventType;
  payload?: {
    templateType?: 'QUOTE' | 'INVOICE';
    [key: string]: any;
  };
}

// =========================================
// HELPER FUNCTIONS
// =========================================

/**
 * Calculate the progress percentage based on completed steps
 */
export function calculateProgressPercentage(progress: OnboardingProgress | null): number {
  if (!progress) return 0;

  let completed = 0;
  const total = 7;

  if (progress.company_done) completed++;
  if (progress.template_quote_done && progress.template_invoice_done) completed++;
  if (progress.client_done) completed++;
  if (progress.quote_done) completed++;
  if (progress.invoice_done) completed++;
  if (progress.member_done) completed++;
  if (progress.inventory_done) completed++;

  return Math.round((completed / total) * 100);
}

/**
 * Get the current step (first incomplete step)
 */
export function getCurrentStep(progress: OnboardingProgress | null): OnboardingStep | null {
  if (!progress) return ONBOARDING_STEPS[0];

  for (const step of ONBOARDING_STEPS) {
    if (!step.checkComplete(progress)) {
      return step;
    }
  }

  return null; // All steps complete
}

/**
 * Get number of completed steps
 */
export function getCompletedStepsCount(progress: OnboardingProgress | null): number {
  if (!progress) return 0;

  let count = 0;
  for (const step of ONBOARDING_STEPS) {
    if (step.checkComplete(progress)) {
      count++;
    }
  }
  return count;
}
