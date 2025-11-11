// Machine d'états unifiée pour les interventions
export const INTERVENTION_STATUSES = {
  A_PLANIFIER: "À planifier",
  A_FAIRE: "À faire", 
  EN_COURS: "En cours",
  TERMINEE: "Terminée",
  ANNULEE: "Annulée",
} as const;

export type InterventionStatus = typeof INTERVENTION_STATUSES[keyof typeof INTERVENTION_STATUSES];

// Configuration des badges de statut (WCAG AA compliant)
export const STATUS_CONFIG: Record<InterventionStatus, { 
  label: string; 
  bgColor: string; 
  textColor: string;
}> = {
  [INTERVENTION_STATUSES.A_PLANIFIER]: {
    label: "À planifier",
    bgColor: "bg-[#E5E7EB]",
    textColor: "text-[#374151]",
  },
  [INTERVENTION_STATUSES.A_FAIRE]: {
    label: "À faire",
    bgColor: "bg-[#DBEAFE]",
    textColor: "text-[#1D4ED8]",
  },
  [INTERVENTION_STATUSES.EN_COURS]: {
    label: "En cours",
    bgColor: "bg-[#FEF3C7]",
    textColor: "text-[#92400E]",
  },
  [INTERVENTION_STATUSES.TERMINEE]: {
    label: "Terminée",
    bgColor: "bg-[#DCFCE7]",
    textColor: "text-[#166534]",
  },
  [INTERVENTION_STATUSES.ANNULEE]: {
    label: "Annulée",
    bgColor: "bg-[#FEE2E2]",
    textColor: "text-[#991B1B]",
  },
};

// Transitions de statuts autorisées
export const STATUS_TRANSITIONS: Record<InterventionStatus, InterventionStatus[]> = {
  [INTERVENTION_STATUSES.A_PLANIFIER]: [
    INTERVENTION_STATUSES.A_FAIRE,
    INTERVENTION_STATUSES.ANNULEE,
  ],
  [INTERVENTION_STATUSES.A_FAIRE]: [
    INTERVENTION_STATUSES.EN_COURS,
    INTERVENTION_STATUSES.ANNULEE,
  ],
  [INTERVENTION_STATUSES.EN_COURS]: [
    INTERVENTION_STATUSES.TERMINEE,
    INTERVENTION_STATUSES.ANNULEE,
  ],
  [INTERVENTION_STATUSES.TERMINEE]: [], // Lecture seule
  [INTERVENTION_STATUSES.ANNULEE]: [
    INTERVENTION_STATUSES.A_PLANIFIER,
    INTERVENTION_STATUSES.A_FAIRE,
  ],
};

export function getAvailableTransitions(currentStatus: InterventionStatus): InterventionStatus[] {
  return STATUS_TRANSITIONS[currentStatus] || [];
}

export function getAllStatuses(): InterventionStatus[] {
  return Object.values(INTERVENTION_STATUSES);
}
