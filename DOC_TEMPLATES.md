# Système de Templates de Documents - Documentation

## Vue d'ensemble

Ce document décrit l'architecture du système de templates de devis/factures dans Provia Glass CRM.

**Objectif principal** : Garantir que le rendu d'un document soit **identique** partout :
- Aperçu dans l'éditeur de templates
- Aperçu lors de la création d'un devis
- PDF généré et envoyé par email
- Page publique pour le client

## Architecture

### Source de vérité unique

Le système utilise **un seul fichier de rendu HTML** qui est la source de vérité :

```
📁 Frontend (React)
└── src/lib/quoteHtmlRenderer.ts          ← SOURCE PRINCIPALE

📁 Backend (Edge Functions)
└── supabase/functions/_shared/quoteHtmlRenderer.ts  ← COPIE POUR BACKEND
```

⚠️ **IMPORTANT** : Ces deux fichiers doivent rester synchronisés. Toute modification
du rendu doit être appliquée aux DEUX fichiers.

### Composants qui utilisent le renderer

| Composant | Fichier | Utilisation |
|-----------|---------|-------------|
| Aperçu éditeur | `src/components/templates/LivePdfPreview.tsx` | Aperçu temps réel dans l'éditeur de modèles |
| Aperçu devis | `src/components/documents/PdfPreviewModal.tsx` | Modal "Aperçu PDF" lors de la création |
| Génération PDF | `supabase/functions/_shared/pdf-generator.ts` | Génération HTML pour PDF/email |

## Structure d'un template

### Interface TypeScript

```typescript
interface DocumentTemplate {
  id: string;
  company_id: string;
  type: "QUOTE" | "INVOICE" | "EMAIL";
  name: string;
  is_default: boolean;

  // Apparence
  theme: string;
  main_color: string | null;      // Couleur principale (ex: #3b82f6)
  accent_color: string | null;    // Couleur d'accent (ex: #fbbf24)
  font_family: string | null;     // Police (Arial, Times, etc.)
  background_style: string | null; // solid, gradient, pattern, none
  header_layout: string | null;   // logo-left, logo-center, logo-right, split

  // Logo
  header_logo: string | null;     // URL du logo
  logo_position: string | null;   // left, center, right
  logo_size: string | null;       // small, medium, large

  // Contenu HTML personnalisé
  header_html: string | null;     // HTML au-dessus du contenu
  content_html: string;           // HTML principal (remplace le tableau si fourni)
  footer_html: string | null;     // HTML en bas de page
  css: string | null;             // CSS personnalisé

  // Options d'affichage
  show_vat: boolean;              // Afficher la TVA
  show_discounts: boolean;        // Afficher les remises
  show_remaining_balance: boolean;
  signature_enabled: boolean;     // Zone de signature

  // Configuration des colonnes du tableau
  table_columns: {
    description: boolean;
    reference: boolean;
    quantity: boolean;
    unit: boolean;
    unit_price_ht: boolean;
    vat_rate: boolean;
    discount: boolean;
    total_ht: boolean;
  } | null;

  default_vat_rate: number | null;
  default_payment_method: string | null;
}
```

### Données de rendu

```typescript
interface QuoteRenderData {
  // Document
  numero: string;
  title?: string;
  issued_at?: string;
  expiry_date?: string;

  // Client
  client_nom: string;
  client_email?: string;
  client_telephone?: string;
  client_adresse?: string;

  // Entreprise (Émetteur)
  company_name?: string;
  company_email?: string;
  company_telephone?: string;
  company_adresse?: string;
  company_siret?: string;
  company_website?: string;

  // Montants
  total_ht: number;
  total_ttc: number;
  remise?: number;
  acompte?: number;

  // Lignes du devis
  lignes: QuoteLine[];

  // Contenu additionnel
  message_client?: string;
  conditions?: string;

  // Signature (si signée)
  signature?: {
    signed_at?: string;
    signer_name?: string;
    signature_image_url?: string;
  };
}
```

## Variables de template

Le système supporte deux formats de variables :

### Variables françaises (recommandées)

| Variable | Description |
|----------|-------------|
| `{{NomEntreprise}}` | Raison sociale |
| `{{EmailEntreprise}}` | Email de l'entreprise |
| `{{TelephoneEntreprise}}` | Téléphone entreprise |
| `{{AdresseEntreprise}}` | Adresse entreprise |
| `{{SIRETEntreprise}}` | Numéro SIRET |
| `{{NomClient}}` | Nom du client |
| `{{EmailClient}}` | Email du client |
| `{{TelephoneClient}}` | Téléphone client |
| `{{AdresseClient}}` | Adresse client |
| `{{NumDevis}}` | Numéro du devis |
| `{{NumDocument}}` | Numéro (devis ou facture) |
| `{{TypeDocument}}` | "Devis" ou "Facture" |
| `{{MontantHT}}` | Total HT formaté |
| `{{MontantTTC}}` | Total TTC formaté |
| `{{MontantTVA}}` | TVA formatée |
| `{{DateEnvoi}}` | Date d'émission |
| `{{DateCreation}}` | Date de création |
| `{{DateExpiration}}` | Date de validité |
| `{{Remise}}` | Montant remise |
| `{{Acompte}}` | Montant acompte |

### Variables anglaises (rétrocompatibilité)

| Variable | Équivalent français |
|----------|---------------------|
| `{company_name}` | `{{NomEntreprise}}` |
| `{client_name}` | `{{NomClient}}` |
| `{document_number}` | `{{NumDocument}}` |
| `{total_ht}` | `{{MontantHT}}` |
| `{total_ttc}` | `{{MontantTTC}}` |
| `{date}` | `{{DateCreation}}` |
| `{due_date}` | `{{DateExpiration}}` |

## Rendu du document

### Structure HTML générée

Le document est structuré ainsi :

```
┌─────────────────────────────────────┐
│  EN-TÊTE (Logo + Titre DEVIS)       │
│  selon header_layout                 │
├─────────────────────────────────────┤
│  header_html (si défini)             │
├─────────────────────────────────────┤
│  ┌───────────┐ ┌───────────┐        │
│  │ ÉMETTEUR  │ │  CLIENT   │        │
│  │ Nom       │ │ Nom       │        │
│  │ Adresse   │ │ Adresse   │        │
│  │ Tél/Email │ │ Tél/Email │        │
│  └───────────┘ └───────────┘        │
├─────────────────────────────────────┤
│  Date: XX/XX/XXXX                   │
│  Valable jusqu'au: XX/XX/XXXX       │
├─────────────────────────────────────┤
│  Titre du devis (si défini)         │
├─────────────────────────────────────┤
│  TABLEAU DES LIGNES                 │
│  (ou content_html personnalisé)     │
│  ┌────────────────────────────────┐ │
│  │ Desc │ Qté │ PU HT │ TVA │ Tot │ │
│  │──────│─────│───────│─────│─────│ │
│  │ ...  │ ... │ ...   │ ... │ ... │ │
│  └────────────────────────────────┘ │
├─────────────────────────────────────┤
│               Total HT:    1500,00€ │
│               TVA:          300,00€ │
│               ─────────────────────│
│               TOTAL TTC:   1800,00€ │
│               Acompte:      450,00€ │
├─────────────────────────────────────┤
│  Méthode de paiement (si définie)   │
├─────────────────────────────────────┤
│  Message client (si défini)         │
├─────────────────────────────────────┤
│  Conditions (si définies)           │
├─────────────────────────────────────┤
│  footer_html (si défini)            │
├─────────────────────────────────────┤
│  ZONE DE SIGNATURE (si activée)     │
│  ┌─────────────┐ ┌─────────────┐    │
│  │ Signature   │ │ Cachet      │    │
│  │ client      │ │ entreprise  │    │
│  └─────────────┘ └─────────────┘    │
└─────────────────────────────────────┘
```

### Layouts d'en-tête disponibles

| Layout | Description |
|--------|-------------|
| `logo-left` | Logo à gauche, titre à droite (défaut) |
| `logo-center` | Logo centré au-dessus du titre |
| `logo-right` | Logo à droite, titre à gauche |
| `split` | Logo à gauche, titre à droite (grille) |

### Styles de fond

| Style | Description |
|-------|-------------|
| `solid` | Fond blanc (défaut) |
| `gradient` | Dégradé couleur principale → accent |
| `pattern` | Motif en diagonale |
| `none` | Transparent |

## Ajouter un nouveau modèle

### Via l'interface

1. Aller dans **Paramètres > Templates**
2. Cliquer sur **"+ Nouveau modèle"**
3. Configurer les options dans les onglets :
   - **Général** : Nom, type, police
   - **Apparence** : Couleurs, logo, layout
   - **Contenu** : HTML personnalisé
   - **Colonnes** : Sélection des colonnes du tableau
   - **Options** : TVA, signature, méthode de paiement

### Via la base de données

Insérer dans la table `doc_templates` :

```sql
INSERT INTO doc_templates (
  company_id,
  type,
  name,
  main_color,
  accent_color,
  font_family,
  header_layout,
  show_vat,
  signature_enabled,
  is_default
) VALUES (
  'uuid-company',
  'QUOTE',
  'Mon modèle vert',
  '#16a34a',
  '#fbbf24',
  'Arial',
  'logo-left',
  true,
  true,
  false
);
```

## Migration des anciens devis

Les anciens devis sans `template_id` utilisent automatiquement le **template par défaut**.
Ce template par défaut est défini dans :
- `src/lib/quoteHtmlRenderer.ts` → fonction `getSampleQuoteData()`
- `supabase/functions/_shared/quoteHtmlRenderer.ts` → fonction `getDefaultTemplate()`

## Maintenance

### Modifier le rendu

1. Modifier **`src/lib/quoteHtmlRenderer.ts`**
2. Copier les modifications dans **`supabase/functions/_shared/quoteHtmlRenderer.ts`**
3. Tester les 3 rendus :
   - Aperçu dans l'éditeur de templates
   - Aperçu lors de la création d'un devis
   - PDF téléchargé/email

### Ajouter une nouvelle variable

1. Ajouter dans `replaceTemplateVariables()` des deux fichiers
2. Documenter dans `src/lib/templateVariables.ts`
3. Mettre à jour cette documentation

## Dépannage

### Le rendu est différent entre l'aperçu et le PDF

Vérifier que les deux fichiers `quoteHtmlRenderer.ts` sont synchronisés.

### Les variables ne sont pas remplacées

- Vérifier la syntaxe : `{{NomClient}}` (doubles accolades)
- Vérifier que la variable existe dans `replaceTemplateVariables()`

### Le logo ne s'affiche pas

- Vérifier que l'URL du logo est accessible publiquement
- Vérifier le champ `header_logo` dans le template

### Les couleurs ne s'appliquent pas

- Vérifier les champs `main_color` et `accent_color` (format hex : `#3b82f6`)
- Vérifier que `background_style` n'est pas `none`
