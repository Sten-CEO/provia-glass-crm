/**
 * Template Variables System
 * Manages dynamic variables for document and email templates
 */

export interface TemplateVariableValues {
  // Client variables
  NomClient?: string;
  EmailClient?: string;
  TelephoneClient?: string;
  AdresseClient?: string;

  // Document variables
  NumDevis?: string;
  NumFacture?: string;
  NumDocument?: string;
  MontantHT?: string | number;
  MontantTTC?: string | number;
  MontantTVA?: string | number;
  DateEnvoi?: string | Date;
  DateEcheance?: string | Date;
  DateCreation?: string | Date;
  DateExpiration?: string | Date;
  TypeDocument?: string;

  // Company variables
  NomEntreprise?: string;
  EmailEntreprise?: string;
  TelephoneEntreprise?: string;
  AdresseEntreprise?: string;
  SiteWebEntreprise?: string;
  SIRETEntreprise?: string;

  // Payment variables
  MethodePaiement?: string;
  DatePaiement?: string | Date;
  MontantPaye?: string | number;
  MontantRestant?: string | number;

  // Additional variables
  MessagePersonnalise?: string;
  Remise?: string | number;
  Acompte?: string | number;
  Conditions?: string;

  // Generic fallback
  [key: string]: any;
}

/**
 * Available template variables with descriptions
 */
export const TEMPLATE_VARIABLES = {
  // Client
  CLIENT: [
    { key: '{{NomClient}}', label: 'Nom du client', description: 'Nom complet du client' },
    { key: '{{EmailClient}}', label: 'Email du client', description: 'Adresse email du client' },
    { key: '{{TelephoneClient}}', label: 'Téléphone du client', description: 'Numéro de téléphone du client' },
    { key: '{{AdresseClient}}', label: 'Adresse du client', description: 'Adresse complète du client' },
  ],

  // Document
  DOCUMENT: [
    { key: '{{NumDevis}}', label: 'Numéro de devis', description: 'Numéro unique du devis' },
    { key: '{{NumFacture}}', label: 'Numéro de facture', description: 'Numéro unique de la facture' },
    { key: '{{NumDocument}}', label: 'Numéro de document', description: 'Numéro du document (devis ou facture)' },
    { key: '{{TypeDocument}}', label: 'Type de document', description: 'Type : Devis ou Facture' },
    { key: '{{MontantHT}}', label: 'Montant HT', description: 'Montant hors taxes' },
    { key: '{{MontantTTC}}', label: 'Montant TTC', description: 'Montant toutes taxes comprises' },
    { key: '{{MontantTVA}}', label: 'Montant TVA', description: 'Montant de la TVA' },
    { key: '{{DateEnvoi}}', label: "Date d'envoi", description: "Date d'envoi du document" },
    { key: '{{DateEcheance}}', label: "Date d'échéance", description: "Date d'échéance de paiement" },
    { key: '{{DateCreation}}', label: 'Date de création', description: 'Date de création du document' },
    { key: '{{DateExpiration}}', label: "Date d'expiration", description: "Date d'expiration du devis" },
    { key: '{{Remise}}', label: 'Remise', description: 'Montant de la remise appliquée' },
    { key: '{{Acompte}}', label: 'Acompte', description: 'Montant de l\'acompte demandé' },
  ],

  // Company
  ENTREPRISE: [
    { key: '{{NomEntreprise}}', label: "Nom de l'entreprise", description: 'Raison sociale' },
    { key: '{{EmailEntreprise}}', label: "Email de l'entreprise", description: 'Email de contact' },
    { key: '{{TelephoneEntreprise}}', label: "Téléphone de l'entreprise", description: 'Numéro de téléphone' },
    { key: '{{AdresseEntreprise}}', label: "Adresse de l'entreprise", description: 'Adresse complète' },
    { key: '{{SiteWebEntreprise}}', label: 'Site web', description: "URL du site web de l'entreprise" },
    { key: '{{SIRETEntreprise}}', label: 'SIRET', description: "Numéro SIRET de l'entreprise" },
  ],

  // Payment
  PAIEMENT: [
    { key: '{{MethodePaiement}}', label: 'Méthode de paiement', description: 'Méthode de paiement choisie' },
    { key: '{{DatePaiement}}', label: 'Date de paiement', description: 'Date du paiement effectué' },
    { key: '{{MontantPaye}}', label: 'Montant payé', description: 'Montant déjà payé' },
    { key: '{{MontantRestant}}', label: 'Montant restant', description: 'Montant restant à payer' },
  ],
};

/**
 * Get all variables as a flat array
 */
export function getAllVariables() {
  return [
    ...TEMPLATE_VARIABLES.CLIENT,
    ...TEMPLATE_VARIABLES.DOCUMENT,
    ...TEMPLATE_VARIABLES.ENTREPRISE,
    ...TEMPLATE_VARIABLES.PAIEMENT,
  ];
}

/**
 * Format a date for template display
 */
function formatDate(date: string | Date | undefined): string {
  if (!date) return '';

  try {
    const d = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  } catch {
    return String(date);
  }
}

/**
 * Format a number as currency
 */
function formatCurrency(amount: string | number | undefined): string {
  if (amount === undefined || amount === null) return '0,00 €';

  const num = typeof amount === 'string' ? parseFloat(amount) : amount;
  if (isNaN(num)) return '0,00 €';

  return new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency: 'EUR',
  }).format(num);
}

/**
 * Replace all template variables in a string with their actual values
 */
export function replaceVariables(
  template: string,
  values: TemplateVariableValues
): string {
  if (!template) return '';

  let result = template;

  // Client variables
  result = result.replace(/\{\{NomClient\}\}/g, values.NomClient || '');
  result = result.replace(/\{\{EmailClient\}\}/g, values.EmailClient || '');
  result = result.replace(/\{\{TelephoneClient\}\}/g, values.TelephoneClient || '');
  result = result.replace(/\{\{AdresseClient\}\}/g, values.AdresseClient || '');

  // Document variables
  result = result.replace(/\{\{NumDevis\}\}/g, values.NumDevis || '');
  result = result.replace(/\{\{NumFacture\}\}/g, values.NumFacture || '');
  result = result.replace(/\{\{NumDocument\}\}/g, values.NumDocument || values.NumDevis || values.NumFacture || '');
  result = result.replace(/\{\{TypeDocument\}\}/g, values.TypeDocument || 'Document');

  // Amounts (formatted as currency)
  result = result.replace(/\{\{MontantHT\}\}/g, formatCurrency(values.MontantHT));
  result = result.replace(/\{\{MontantTTC\}\}/g, formatCurrency(values.MontantTTC));
  result = result.replace(/\{\{MontantTVA\}\}/g, formatCurrency(values.MontantTVA));
  result = result.replace(/\{\{Remise\}\}/g, formatCurrency(values.Remise));
  result = result.replace(/\{\{Acompte\}\}/g, formatCurrency(values.Acompte));
  result = result.replace(/\{\{MontantPaye\}\}/g, formatCurrency(values.MontantPaye));
  result = result.replace(/\{\{MontantRestant\}\}/g, formatCurrency(values.MontantRestant));

  // Dates (formatted as DD/MM/YYYY)
  result = result.replace(/\{\{DateEnvoi\}\}/g, formatDate(values.DateEnvoi));
  result = result.replace(/\{\{DateEcheance\}\}/g, formatDate(values.DateEcheance));
  result = result.replace(/\{\{DateCreation\}\}/g, formatDate(values.DateCreation));
  result = result.replace(/\{\{DateExpiration\}\}/g, formatDate(values.DateExpiration));
  result = result.replace(/\{\{DatePaiement\}\}/g, formatDate(values.DatePaiement));

  // Company variables
  result = result.replace(/\{\{NomEntreprise\}\}/g, values.NomEntreprise || '');
  result = result.replace(/\{\{EmailEntreprise\}\}/g, values.EmailEntreprise || '');
  result = result.replace(/\{\{TelephoneEntreprise\}\}/g, values.TelephoneEntreprise || '');
  result = result.replace(/\{\{AdresseEntreprise\}\}/g, values.AdresseEntreprise || '');
  result = result.replace(/\{\{SiteWebEntreprise\}\}/g, values.SiteWebEntreprise || '');
  result = result.replace(/\{\{SIRETEntreprise\}\}/g, values.SIRETEntreprise || '');

  // Payment variables
  result = result.replace(/\{\{MethodePaiement\}\}/g, values.MethodePaiement || '');

  // Additional variables
  result = result.replace(/\{\{MessagePersonnalise\}\}/g, values.MessagePersonnalise || '');
  result = result.replace(/\{\{Conditions\}\}/g, values.Conditions || '');

  // Legacy variables (for backward compatibility)
  result = result.replace(/\{company_name\}/g, values.NomEntreprise || '');
  result = result.replace(/\{client_name\}/g, values.NomClient || '');
  result = result.replace(/\{document_number\}/g, values.NumDocument || values.NumDevis || values.NumFacture || '');
  result = result.replace(/\{total_ht\}/g, formatCurrency(values.MontantHT));
  result = result.replace(/\{total_ttc\}/g, formatCurrency(values.MontantTTC));
  result = result.replace(/\{date\}/g, formatDate(values.DateCreation));
  result = result.replace(/\{due_date\}/g, formatDate(values.DateEcheance));
  result = result.replace(/\{document_type\}/g, values.TypeDocument || 'Document');

  return result;
}

/**
 * Get sample values for preview
 */
export function getSampleValues(type: 'quote' | 'invoice' | 'email' = 'quote'): TemplateVariableValues {
  const baseValues: TemplateVariableValues = {
    // Client
    NomClient: 'Jean Dupont',
    EmailClient: 'jean.dupont@example.com',
    TelephoneClient: '06 12 34 56 78',
    AdresseClient: '123 Rue de la République, 75001 Paris',

    // Company
    NomEntreprise: 'Provia Glass',
    EmailEntreprise: 'contact@provia-glass.fr',
    TelephoneEntreprise: '01 23 45 67 89',
    AdresseEntreprise: '456 Avenue des Champs, 75008 Paris',
    SiteWebEntreprise: 'www.provia-glass.fr',
    SIRETEntreprise: '123 456 789 00010',

    // Amounts
    MontantHT: 1500.00,
    MontantTVA: 300.00,
    MontantTTC: 1800.00,
    Remise: 150.00,
    Acompte: 450.00,

    // Dates
    DateCreation: new Date(),
    DateEnvoi: new Date(),

    // Payment
    MethodePaiement: 'Virement bancaire',
  };

  if (type === 'quote') {
    return {
      ...baseValues,
      NumDevis: 'DEV-2025-001',
      NumDocument: 'DEV-2025-001',
      TypeDocument: 'Devis',
      DateExpiration: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
    };
  }

  if (type === 'invoice') {
    return {
      ...baseValues,
      NumFacture: 'FACT-2025-001',
      NumDocument: 'FACT-2025-001',
      TypeDocument: 'Facture',
      DateEcheance: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // +30 days
      MontantPaye: 450.00,
      MontantRestant: 1350.00,
    };
  }

  return baseValues;
}

/**
 * Extract all variables used in a template string
 */
export function extractVariables(template: string): string[] {
  const regex = /\{\{([^}]+)\}\}/g;
  const matches: string[] = [];
  let match;

  while ((match = regex.exec(template)) !== null) {
    matches.push(`{{${match[1]}}}`);
  }

  return [...new Set(matches)]; // Remove duplicates
}

/**
 * Validate if a template string has valid variable syntax
 */
export function validateTemplate(template: string): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for unclosed variables
  const openBraces = (template.match(/\{\{/g) || []).length;
  const closeBraces = (template.match(/\}\}/g) || []).length;

  if (openBraces !== closeBraces) {
    errors.push('Variables mal fermées : nombre de {{ et }} ne correspond pas');
  }

  // Check for unknown variables
  const usedVariables = extractVariables(template);
  const knownVariables = getAllVariables().map(v => v.key);

  // Add legacy variables
  knownVariables.push('{company_name}', '{client_name}', '{document_number}', '{total_ht}', '{total_ttc}', '{date}', '{due_date}', '{document_type}');

  const unknownVariables = usedVariables.filter(v => {
    // Convert {{Variable}} format to check
    const cleanVar = v.replace(/[{}]/g, '');
    return !knownVariables.some(kv => kv.includes(cleanVar));
  });

  if (unknownVariables.length > 0) {
    errors.push(`Variables inconnues : ${unknownVariables.join(', ')}`);
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
