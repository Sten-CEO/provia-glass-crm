// Feature flags configuration
export const FEATURE_FLAGS = {
  CREATION_V2: true, // Nouvel éditeur devis/factures
  DEDUCT_STOCK_ON_INVOICE: false, // Déduction stock à la facturation
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag] ?? false;
}
