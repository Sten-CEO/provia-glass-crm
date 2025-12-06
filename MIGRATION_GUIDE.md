# Guide de migration - Ajout des champs de contact

## Problème rencontré

Lors de la sauvegarde des paramètres société, l'erreur suivante apparaît :
```
Could not find the 'tva_intracom' column of 'companies' in the schema cache
```

## Solution

Vous devez appliquer la migration qui ajoute les colonnes manquantes à la table `companies`.

## Étapes à suivre

### Option 1 : Via le Dashboard Supabase (Recommandé)

1. **Ouvrez le dashboard Supabase** : https://supabase.com/dashboard
2. **Sélectionnez votre projet**
3. **Allez dans SQL Editor** (dans le menu de gauche)
4. **Créez une nouvelle requête** (bouton "New query")
5. **Copiez-collez le script SQL suivant** :

```sql
-- Ajout des champs de contact et email d'expédition pour les sociétés
-- Ces champs sont utilisés pour l'envoi d'emails (devis, factures) et les informations de contact

-- Ajouter les champs de contact s'ils n'existent pas déjà
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS telephone TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS adresse TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS ville TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS code_postal TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS siret TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS tva_intracom TEXT;
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

-- Ajouter le champ email_from pour l'envoi de documents
-- Ce champ sera utilisé comme "reply-to" dans les emails de devis/factures
-- Si non défini, on utilisera le champ "email" par défaut
ALTER TABLE public.companies ADD COLUMN IF NOT EXISTS email_from TEXT;

-- Ajouter un commentaire pour documenter l'usage
COMMENT ON COLUMN public.companies.email IS 'Email principal de la société (affiché sur les documents)';
COMMENT ON COLUMN public.companies.email_from IS 'Email d''expédition pour les documents (devis, factures). Utilisé comme reply-to dans les emails';
COMMENT ON COLUMN public.companies.telephone IS 'Numéro de téléphone principal';
COMMENT ON COLUMN public.companies.adresse IS 'Adresse complète de la société';
COMMENT ON COLUMN public.companies.ville IS 'Ville';
COMMENT ON COLUMN public.companies.code_postal IS 'Code postal';
COMMENT ON COLUMN public.companies.siret IS 'Numéro SIRET';
COMMENT ON COLUMN public.companies.tva_intracom IS 'Numéro TVA intracommunautaire';

-- Créer un index pour les recherches par email
CREATE INDEX IF NOT EXISTS idx_companies_email ON public.companies(email);
```

6. **Cliquez sur "Run"** (ou appuyez sur Ctrl+Enter)
7. **Vérifiez le résultat** : Vous devriez voir "Success. No rows returned"

### Option 2 : Via Supabase CLI (Si vous développez en local)

```bash
npx supabase db push
```

## Vérification

Pour vérifier que la migration a été appliquée correctement :

1. Allez dans **Table Editor** > **companies**
2. Vérifiez que les colonnes suivantes existent :
   - ✅ `email`
   - ✅ `email_from`
   - ✅ `telephone`
   - ✅ `adresse`
   - ✅ `ville`
   - ✅ `code_postal`
   - ✅ `siret`
   - ✅ `tva_intracom`
   - ✅ `updated_at`

## Après la migration

1. **Actualisez votre application** (F5)
2. **Allez dans Paramètres > Société**
3. **Remplissez les champs** :
   - Nom de la société
   - SIRET
   - Numéro TVA
   - Email principal
   - Téléphone
   - Adresse
4. **Cliquez sur Enregistrer**

Cela devrait maintenant fonctionner sans erreur !

## Note importante

⚠️ La clause `IF NOT EXISTS` garantit que le script peut être exécuté plusieurs fois sans erreur. Si les colonnes existent déjà, elles ne seront pas modifiées.
