# Guide de déploiement - Système de devis avec signature électronique

## Prérequis

- Supabase CLI installé
- Accès au dashboard Supabase de votre projet
- URL de votre application frontend déployée

## Étape 1 : Configuration des variables d'environnement

### Via Supabase Dashboard (RECOMMANDÉ)

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Settings** > **Edge Functions**
4. Ajoutez la variable d'environnement suivante :
   - **Nom** : `FRONTEND_URL`
   - **Valeur** : L'URL de votre application frontend
     - Production : `https://votre-domaine.com`
     - Développement : `http://localhost:5173`

### Via Supabase CLI (Alternative)

```bash
npx supabase secrets set FRONTEND_URL=https://votre-domaine.com
```

## Étape 2 : Déployer les Edge Functions

### Option A : Via Supabase CLI

```bash
# Déployer la fonction get-quote-public
npx supabase functions deploy get-quote-public

# Déployer la fonction sign-quote
npx supabase functions deploy sign-quote

# Déployer la fonction send-quote-email (mise à jour)
npx supabase functions deploy send-quote-email

# Déployer la fonction send-invoice-email (si elle existe)
npx supabase functions deploy send-invoice-email
```

### Option B : Via Supabase Dashboard

1. Allez dans **Edge Functions** dans le dashboard
2. Créez une nouvelle fonction `get-quote-public`
   - Copiez le contenu de `supabase/functions/get-quote-public/index.ts`
3. Créez une nouvelle fonction `sign-quote`
   - Copiez le contenu de `supabase/functions/sign-quote/index.ts`
4. Mettez à jour la fonction `send-quote-email`
   - Copiez le nouveau contenu de `supabase/functions/send-quote-email/index.ts`

## Étape 3 : Appliquer la migration de base de données

### Via Supabase CLI

```bash
npx supabase db push
```

### Via Supabase Dashboard (Alternative)

1. Allez dans **SQL Editor**
2. Copiez et exécutez le contenu de `supabase/migrations/20251207100000_add_quote_signatures.sql`

## Étape 4 : Vérification

### Tester le système

1. **Envoyer un devis par email**
   - Créez un devis dans le CRM
   - Cliquez sur "Envoyer par email"
   - Vérifiez que l'email est bien reçu

2. **Vérifier le lien dans l'email**
   - Le lien doit pointer vers : `https://votre-domaine.com/quote/{token}`
   - Et non vers : `https://xxx.supabase.co/quote/{token}`

3. **Tester la visualisation**
   - Cliquez sur le lien dans l'email
   - Vous devriez voir :
     - Le PDF du devis intégré
     - Le bouton de téléchargement
     - Le formulaire de signature

4. **Tester la signature**
   - Remplissez le formulaire
   - Cochez la case d'acceptation
   - Cliquez sur "Signer électroniquement"
   - Vérifiez que le statut du devis passe à "Accepté" dans le CRM

## Résolution de problèmes

### Erreur "requested path is invalid"

**Cause** : La variable `FRONTEND_URL` n'est pas configurée ou pointe vers la mauvaise URL.

**Solution** :
1. Vérifiez que `FRONTEND_URL` est bien configurée dans Supabase
2. Redéployez la fonction `send-quote-email`
3. Envoyez un nouveau devis pour tester

### Erreur 404 sur /quote/{token}

**Cause** : L'application frontend n'est pas déployée ou la route n'existe pas.

**Solution** :
1. Vérifiez que votre application React est déployée
2. Vérifiez que la route `/quote/:token` existe dans `src/App.tsx` (ligne 78)
3. Vérifiez que `PublicQuoteView.tsx` est bien importé

### Le PDF ne s'affiche pas

**Cause** : Les Edge Functions `get-quote-public` ne sont pas déployées.

**Solution** :
1. Déployez la fonction `get-quote-public`
2. Vérifiez les logs dans le dashboard Supabase

### La signature ne fonctionne pas

**Cause** : La fonction `sign-quote` n'est pas déployée ou la migration n'est pas appliquée.

**Solution** :
1. Déployez la fonction `sign-quote`
2. Appliquez la migration `20251207100000_add_quote_signatures.sql`

## Configuration en développement local

Pour tester en local :

```bash
# Démarrer Supabase localement
npx supabase start

# Configurer FRONTEND_URL pour le développement local
npx supabase secrets set FRONTEND_URL=http://localhost:5173 --local

# Déployer les fonctions localement
npx supabase functions deploy get-quote-public --local
npx supabase functions deploy sign-quote --local
npx supabase functions deploy send-quote-email --local

# Démarrer l'application React
npm run dev
```

## Notes importantes

1. **FRONTEND_URL** doit être configurée AVANT de déployer les Edge Functions
2. Si vous changez `FRONTEND_URL`, vous devez **redéployer** `send-quote-email`
3. Les tokens de devis sont uniques et permanents (pas d'expiration technique)
4. L'expiration du devis est gérée au niveau fonctionnel, pas technique
