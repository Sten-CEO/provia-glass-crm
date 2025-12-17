# GUIDECRM - Système d'Onboarding Gamifié

## Vue d'ensemble

Le système GuideCRM fournit un onboarding interactif et gamifié pour guider les nouveaux utilisateurs à travers la configuration initiale du CRM Provia BASE. Il comprend :

- Une barre de progression flottante en bas de l'écran
- Des tooltips avec flèches pointant vers les éléments UI
- Une animation de célébration à 100% de progression
- Persistance de la progression dans Supabase

## Structure des fichiers

```
src/components/guidecrm/
├── index.ts                 # Exports principaux
├── guidecrmTypes.ts         # Types et configuration des étapes
├── guidecrmEvents.ts        # Système d'événements
├── GuidecrmContext.tsx      # Provider React et hook useGuidecrm
├── GuidecrmProgressBar.tsx  # Barre de progression flottante
├── GuidecrmTooltip.tsx      # Composant tooltip avec flèches
├── GuidecrmChecklist.tsx    # Panel de checklist des étapes
├── GuidecrmCompletion.tsx   # Animation de célébration
├── Guidecrm.tsx             # Composant principal
└── GUIDECRM_README.md       # Ce fichier
```

## Les 7 étapes d'onboarding

| # | Clé | Titre | Route | Validation |
|---|-----|-------|-------|------------|
| 1 | `company` | Informations de l'entreprise | `/parametres` | Enregistrement des paramètres société |
| 2 | `templates` | Modèles devis & facture | `/parametres` | Création d'1 modèle devis ET 1 modèle facture |
| 3 | `client` | Créer un client | `/clients` | Création d'un client |
| 4 | `quote` | Créer un devis | `/devis` | Enregistrement d'un devis |
| 5 | `invoice` | Créer une facture | `/factures` | Enregistrement d'une facture |
| 6 | `member` | Ajouter un membre | `/equipe` | Invitation d'un membre |
| 7 | `inventory` | Ajouter un produit | `/inventaire/consommables` | Création d'un item inventaire |

## Comment modifier les étapes

### Modifier le texte ou l'ordre des étapes

Éditez le fichier `guidecrmTypes.ts` et modifiez le tableau `ONBOARDING_STEPS` :

```typescript
export const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    key: 'company',
    number: 1,
    title: 'Nouveau titre ici',
    description: 'Nouvelle description ici',
    route: '/parametres',
    targets: [
      { selector: 'nav-parametres', description: 'Cliquez sur Paramètres', position: 'right' },
      // Ajoutez/modifiez les cibles ici
    ],
    checkComplete: (p) => p.company_done,
  },
  // ... autres étapes
];
```

### Ajouter une nouvelle étape

1. Ajoutez un nouveau champ booléen dans la migration SQL et la table `onboarding_progress`
2. Ajoutez la nouvelle clé dans `OnboardingStepKey`
3. Ajoutez l'étape dans `ONBOARDING_STEPS`
4. Créez une fonction d'événement dans `guidecrmEvents.ts`
5. Ajoutez le handler dans le switch de `GuidecrmContext.tsx`
6. Ajoutez les attributs `data-onboarding` sur les éléments UI

## Liste des data-onboarding ajoutés

### Navigation (Sidebar.tsx)
- `data-onboarding="nav-clients"` - Lien menu Clients
- `data-onboarding="nav-devis"` - Lien menu Devis
- `data-onboarding="nav-factures"` - Lien menu Factures
- `data-onboarding="nav-inventaire"` - Lien menu Inventaire
- `data-onboarding="nav-equipe"` - Lien menu Équipe
- `data-onboarding="nav-parametres"` - Lien menu Paramètres

### Paramètres (Parametres.tsx)
- `data-onboarding="tab-societe"` - Onglet Société
- `data-onboarding="tab-modeles"` - Onglet Modèles
- `data-onboarding="btn-save-company"` - Bouton Enregistrer

### Templates (parametres/Templates.tsx)
- `data-onboarding="btn-new-template"` - Bouton Nouveau modèle
- `data-onboarding="select-template-type"` - Select type de document
- `data-onboarding="btn-save-template"` - Bouton Sauvegarder

### Clients (Clients.tsx)
- `data-onboarding="btn-new-client"` - Bouton Nouveau client
- `data-onboarding="input-client-nom"` - Champ Nom du client
- `data-onboarding="btn-create-client"` - Bouton Créer

### Devis (Devis.tsx / DevisEditor.tsx)
- `data-onboarding="btn-new-devis"` - Bouton Nouveau Devis
- `data-onboarding="btn-save-devis"` - Bouton Enregistrer

### Factures (Factures.tsx / FactureEditor.tsx)
- `data-onboarding="btn-new-facture"` - Bouton Nouvelle Facture
- `data-onboarding="btn-save-facture"` - Bouton Enregistrer

### Équipe (Equipe.tsx)
- `data-onboarding="btn-invite-member"` - Bouton Inviter un employé
- `data-onboarding="input-member-nom"` - Champ Nom du membre
- `data-onboarding="input-member-email"` - Champ Email du membre
- `data-onboarding="btn-create-member"` - Bouton Inviter

### Inventaire (inventaire/InventaireConsommables.tsx)
- `data-onboarding="btn-new-consommable"` - Bouton Nouveau consommable
- `data-onboarding="input-item-nom"` - Champ Nom de l'article
- `data-onboarding="btn-create-item"` - Bouton Créer

## Comment déclencher les événements

Les événements sont déclenchés automatiquement après les actions utilisateur réussies. Exemple :

```typescript
import { guidecrmClientCreated } from '@/components/guidecrm';

const handleAddClient = async () => {
  // ... logique de création
  const { error } = await supabase.from("clients").insert([clientData]);

  if (!error) {
    toast.success("Client créé avec succès");
    guidecrmClientCreated(); // DÉCLENCHE LA MISE À JOUR DE PROGRESSION
  }
};
```

### Fonctions disponibles

| Fonction | Étape | Usage |
|----------|-------|-------|
| `guidecrmCompanySaved()` | 1 | Après enregistrement des paramètres société |
| `guidecrmTemplateCreated('QUOTE')` | 2 | Après création d'un modèle de devis |
| `guidecrmTemplateCreated('INVOICE')` | 2 | Après création d'un modèle de facture |
| `guidecrmClientCreated()` | 3 | Après création d'un client |
| `guidecrmQuoteCreated()` | 4 | Après création d'un devis |
| `guidecrmInvoiceCreated()` | 5 | Après création d'une facture |
| `guidecrmMemberInvited()` | 6 | Après invitation d'un membre |
| `guidecrmInventoryCreated()` | 7 | Après création d'un item inventaire |

## Table Supabase

### Migration SQL

La table `onboarding_progress` est créée par le fichier :
`supabase/migrations/20251217000000_guidecrm_onboarding_progress.sql`

### Structure de la table

```sql
CREATE TABLE public.onboarding_progress (
    id UUID PRIMARY KEY,
    user_id UUID NOT NULL,
    company_id UUID NOT NULL,
    company_done BOOLEAN DEFAULT FALSE,
    template_quote_done BOOLEAN DEFAULT FALSE,
    template_invoice_done BOOLEAN DEFAULT FALSE,
    client_done BOOLEAN DEFAULT FALSE,
    quote_done BOOLEAN DEFAULT FALSE,
    invoice_done BOOLEAN DEFAULT FALSE,
    member_done BOOLEAN DEFAULT FALSE,
    inventory_done BOOLEAN DEFAULT FALSE,
    completed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
    UNIQUE(user_id, company_id)
);
```

## Pour supprimer complètement GuideCRM

Si vous souhaitez remplacer ce système par un autre :

1. **Supprimer les fichiers** :
   ```bash
   rm -rf src/components/guidecrm/
   ```

2. **Retirer l'intégration de AppShell.tsx** :
   - Supprimer les imports `GuidecrmProvider` et `Guidecrm`
   - Supprimer le wrapper `<GuidecrmProvider>` et le composant `<Guidecrm />`

3. **Retirer les attributs data-onboarding** :
   Rechercher et supprimer tous les `data-onboarding` dans les fichiers :
   - `Sidebar.tsx`
   - `Parametres.tsx`
   - `parametres/Templates.tsx`
   - `Clients.tsx`
   - `Devis.tsx`, `DevisEditor.tsx`
   - `Factures.tsx`, `FactureEditor.tsx`
   - `Equipe.tsx`
   - `inventaire/InventaireConsommables.tsx`

4. **Retirer les imports et appels d'événements** :
   Rechercher et supprimer tous les `guidecrmXXX()` dans les fichiers ci-dessus.

5. **Supprimer la table Supabase** :
   ```sql
   DROP TABLE IF EXISTS public.onboarding_progress;
   DROP FUNCTION IF EXISTS public.guidecrm_update_updated_at();
   DROP FUNCTION IF EXISTS public.guidecrm_check_onboarding_complete();
   ```

## Debug

Pour voir l'état de l'onboarding dans la console :

```typescript
// Dans n'importe quel composant enfant de GuidecrmProvider
import { useGuidecrm } from '@/components/guidecrm';

const { progress, currentStep, progressPercentage } = useGuidecrm();
console.log('Progression:', progress);
console.log('Étape actuelle:', currentStep);
console.log('Pourcentage:', progressPercentage);
```

Pour réinitialiser l'onboarding (mode développement) :

```typescript
const { resetOnboarding } = useGuidecrm();
await resetOnboarding(); // Remet tout à zéro
```
