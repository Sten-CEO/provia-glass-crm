# Documentation du Système de Templates

## Vue d'ensemble

Le système de templates de Provia Glass CRM permet de créer des modèles personnalisés pour les devis et factures. Cette documentation explique l'architecture du système, son fonctionnement, et comment ajouter de nouveaux modèles.

## Architecture

### Source de vérité unique

Le système est basé sur une **fonction unifiée de rendu** qui garantit que tous les rendus du document (preview, PDF, page publique) sont **strictement identiques**.

```
┌─────────────────────────────────────────────────────────┐
│           FONCTION UNIFIÉE : renderQuoteHTML()           │
│                                                           │
│  Génère le HTML complet d'un document basé sur :         │
│  - Template (couleurs, layout, logo, etc.)               │
│  - Données du devis (client, lignes, totaux)             │
└─────────────────────────────────────────────────────────┘
                             │
         ┌───────────────────┼───────────────────┐
         │                   │                   │
         ▼                   ▼                   ▼
┌────────────────┐  ┌─────────────────┐  ┌──────────────┐
│ TemplatePreview│  │ PdfPreviewModal │  │pdf-generator │
│     .tsx       │  │      .tsx       │  │    .ts       │
├────────────────┤  ├─────────────────┤  ├──────────────┤
│ Éditeur de     │  │ Preview avant   │  │ PDF final    │
│ template       │  │ envoi du devis  │  │ + Page       │
│                │  │                 │  │ publique     │
└────────────────┘  └─────────────────┘  └──────────────┘
```

### Fichiers source

#### Client (React/TypeScript)

- **`src/lib/quote-template-renderer.ts`**
  - Fonction : `renderQuoteHTML(template, quoteData)`
  - Utilisée par : `TemplatePreview.tsx`, `PdfPreviewModal.tsx`
  - Génère le HTML côté client pour les previews

#### Serveur (Deno/Edge Functions)

- **`supabase/functions/_shared/quote-template-renderer.ts`**
  - Fonction : `renderQuoteHTML(template, quoteData)`
  - Utilisée par : `pdf-generator.ts`
  - Génère le HTML côté serveur pour les PDFs finaux
  - **Code identique à la version client**, adapté pour Deno

### Composants utilisant le système

1. **TemplatePreview.tsx** - Preview dans l'éditeur de modèles
   - Chemin : `src/components/templates/TemplatePreview.tsx`
   - Affiche un aperçu du template avec des données d'exemple

2. **PdfPreviewModal.tsx** - Preview lors de la création d'un devis
   - Chemin : `src/components/documents/PdfPreviewModal.tsx`
   - Affiche le devis final avant envoi avec les vraies données

3. **pdf-generator.ts** - Génération du PDF final
   - Chemin : `supabase/functions/_shared/pdf-generator.ts`
   - Génère le HTML qui sera envoyé au client par email et affiché sur la page publique

## Structure d'un Template

### Schéma de données

```typescript
interface TemplateData {
  type: 'QUOTE' | 'INVOICE';              // Type de document
  header_logo: string | null;              // URL du logo
  header_layout: 'logo-left' | 'logo-center' | 'logo-right' | 'split';
  logo_size: 'small' | 'medium' | 'large';
  main_color: string | null;               // Couleur principale (#hex)
  font_family: string | null;              // Police de caractères
  show_vat: boolean;                       // Afficher la TVA
  show_discounts: boolean;                 // Afficher les remises
  show_remaining_balance: boolean;         // Afficher le solde restant
  signature_enabled: boolean;              // Activer la signature
  header_html: string | null;              // HTML personnalisé pour l'en-tête
  content_html: string | null;             // HTML personnalisé pour le contenu
  footer_html: string | null;              // HTML personnalisé pour le pied de page
  css: string | null;                      // CSS personnalisé
}
```

### Layouts d'en-tête disponibles

#### 1. `logo-left` (par défaut)
```
┌─────────────────────────────────────┐
│ [LOGO]              DEVIS           │
│                     N° DEV-2025-001 │
└─────────────────────────────────────┘
```

#### 2. `logo-center`
```
┌─────────────────────────────────────┐
│            [LOGO]                   │
│                                     │
│            DEVIS                    │
│         N° DEV-2025-001             │
└─────────────────────────────────────┘
```

#### 3. `logo-right`
```
┌─────────────────────────────────────┐
│ DEVIS                    [LOGO]     │
│ N° DEV-2025-001                     │
└─────────────────────────────────────┘
```

#### 4. `split`
```
┌─────────────────────────────────────┐
│ [LOGO]          │  DEVIS            │
│                 │  N° DEV-2025-001  │
└─────────────────────────────────────┘
```

## Variables de template

### Variables anglaises (accolades simples)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{company_name}` | Nom de l'entreprise | Provia BASE |
| `{client_name}` | Nom du client | Jean Dupont |
| `{document_number}` | Numéro du document | DEV-2025-0001 |
| `{total_ht}` | Total HT | 1 000,00 € |
| `{total_ttc}` | Total TTC | 1 200,00 € |
| `{date}` | Date d'émission | 08/12/2025 |
| `{due_date}` | Date d'expiration | 07/01/2026 |
| `{document_type}` | Type de document | Devis |

### Variables françaises (doubles accolades)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{NomEntreprise}}` | Nom de l'entreprise | Provia BASE |
| `{{NomClient}}` | Nom du client | Jean Dupont |
| `{{EmailClient}}` | Email du client | jean.dupont@example.com |
| `{{TelephoneClient}}` | Téléphone du client | 06 12 34 56 78 |
| `{{AdresseClient}}` | Adresse du client | 123 Rue Exemple |
| `{{NumDevis}}` | Numéro du devis | DEV-2025-0001 |
| `{{NumDocument}}` | Numéro du document | DEV-2025-0001 |
| `{{TypeDocument}}` | Type de document | Devis |
| `{{MontantHT}}` | Montant HT | 1 000,00 € |
| `{{MontantTTC}}` | Montant TTC | 1 200,00 € |
| `{{DateEnvoi}}` | Date d'envoi | 08/12/2025 |
| `{{DateCreation}}` | Date de création | 08/12/2025 |
| `{{DateExpiration}}` | Date d'expiration | 07/01/2026 |

## Blocs HTML personnalisables

### 1. Header HTML (`header_html`)

Zone personnalisable en haut du document, après le logo et le titre.

**Exemple :**
```html
<div style="margin-bottom: 24px;">
  <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 16px;">
    <div>
      <h3 style="color: #10b981; margin: 0;">Émetteur</h3>
      <p><strong>{{NomEntreprise}}</strong></p>
      <p>123 Rue de la Vitrerie</p>
      <p>75001 Paris</p>
    </div>
    <div style="text-align: right;">
      <h3 style="color: #10b981; margin: 0;">Client</h3>
      <p><strong>{{NomClient}}</strong></p>
      <p>{{EmailClient}}</p>
      <p>{{TelephoneClient}}</p>
    </div>
  </div>
</div>
```

### 2. Content HTML (`content_html`)

Remplace le tableau des lignes par défaut. Si null, le tableau standard est utilisé.

**Exemple :**
```html
<div style="background: #f0fdf4; padding: 16px; border-radius: 8px; margin-bottom: 24px;">
  <h3 style="color: #10b981;">Description du projet</h3>
  <p>Installation de double vitrage pour {{NomClient}}</p>
  <p>Montant total : {{MontantTTC}}</p>
</div>
```

### 3. Footer HTML (`footer_html`)

Zone personnalisable en bas du document, avant la signature.

**Exemple :**
```html
<div style="text-align: center; font-size: 12px; color: #666;">
  <p>{{NomEntreprise}} - SIRET: 123 456 789 00012</p>
  <p>Capital social: 10 000 € - TVA: FR12345678900</p>
  <p>Conditions de paiement: 30 jours net</p>
</div>
```

## CSS personnalisé

Le champ `css` permet d'ajouter des styles CSS qui seront appliqués au document.

**Exemple :**
```css
.header h1 {
  font-size: 32px;
  letter-spacing: 2px;
}

table {
  border: 2px solid #10b981;
}

th {
  background-color: #10b981 !important;
}
```

## Ajouter un nouveau modèle

### 1. Via l'interface (recommandé)

1. Aller dans **Paramètres** > **Modèles de documents**
2. Cliquer sur **Nouveau modèle**
3. Remplir les informations :
   - Nom du modèle
   - Type (Devis/Facture)
   - Thème
   - Configuration (couleur, police, layout)
4. Personnaliser le HTML (header/content/footer)
5. Tester avec la preview en temps réel
6. Enregistrer

### 2. Via SQL (avancé)

```sql
INSERT INTO doc_templates (
  company_id,
  name,
  type,
  theme,
  header_layout,
  logo_size,
  main_color,
  font_family,
  show_vat,
  show_discounts,
  signature_enabled,
  header_html,
  footer_html,
  css
) VALUES (
  'uuid-de-la-company',
  'Mon Template Personnalisé',
  'QUOTE',
  'modern',
  'logo-center',
  'medium',
  '#10b981',
  'Inter, sans-serif',
  true,
  true,
  true,
  '<div>HTML de l''en-tête</div>',
  '<div>HTML du pied de page</div>',
  'body { font-size: 14px; }'
);
```

## Déploiement des modifications

Après avoir modifié le code du système de templates, **il est impératif** de déployer les Edge Functions pour que les changements soient effectifs :

```bash
# Déployer la fonction de génération PDF
npx supabase functions deploy get-quote-public --project-ref rryjcqcxhpccgzkhgdqr

# Déployer la fonction d'envoi d'email
npx supabase functions deploy send-quote-email --project-ref rryjcqcxhpccgzkhgdqr
```

⚠️ **Important** : Les modifications dans `supabase/functions/_shared/quote-template-renderer.ts` ou `pdf-generator.ts` ne seront pas visibles côté client tant que les fonctions ne sont pas redéployées.

## Vérification de la cohérence

Pour vérifier que le système fonctionne correctement :

### Test 1 : Preview dans l'éditeur

1. Aller dans **Paramètres** > **Modèles de documents**
2. Sélectionner un modèle
3. Observer la preview en temps réel
4. Vérifier que les variables sont remplacées
5. Vérifier que le layout d'en-tête est correct

### Test 2 : Preview lors de la création

1. Créer un nouveau devis
2. Sélectionner un template
3. Remplir les informations
4. Cliquer sur **Aperçu PDF**
5. **Vérifier que le rendu est IDENTIQUE à la preview de l'éditeur**

### Test 3 : PDF final et page publique

1. Envoyer le devis au client par email
2. Ouvrir le lien public du devis
3. **Vérifier que le rendu est IDENTIQUE aux previews précédentes**

## Migration des anciens devis

Les anciens devis créés avant l'implémentation du système unifié continueront de fonctionner :

- **Avec template** : Utilisent `renderQuoteHTML()` avec leur template assigné
- **Sans template** : Utilisent `generateQuoteHTML()` (template par défaut bleu)

Pas de migration nécessaire.

## Dépannage

### Les variables ne sont pas remplacées

**Cause** : Edge Functions pas déployées ou template mal configuré

**Solution** :
1. Vérifier les logs Supabase pour voir si le template est chargé
2. Redéployer les Edge Functions
3. Vérifier que les variables utilisent la bonne syntaxe (`{{Variable}}`)

### Le layout d'en-tête ne change pas

**Cause** : Le champ `header_layout` est null ou invalide

**Solution** :
1. Vérifier dans la base de données que `header_layout` est bien défini
2. Valeurs acceptées : `logo-left`, `logo-center`, `logo-right`, `split`

### Les 3 rendus sont différents

**Cause** : Code dupliqué ou versions désynchronisées

**Solution** :
1. Vérifier que tous les composants importent `renderQuoteHTML` depuis `quote-template-renderer.ts`
2. Vérifier qu'il n'y a pas de code dupliqué dans les fichiers
3. Redéployer les Edge Functions

## Support

Pour toute question ou problème avec le système de templates :

1. Consulter cette documentation
2. Vérifier les logs Supabase (Edge Functions)
3. Vérifier la console navigateur (erreurs JS)
4. Contacter l'équipe de développement

---

**Dernière mise à jour** : Décembre 2025
**Version** : 2.0 (système unifié)
