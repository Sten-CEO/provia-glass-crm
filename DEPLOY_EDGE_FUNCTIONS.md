# Guide de déploiement des Edge Functions

## Problème rencontré

Lors de l'envoi d'emails pour devis ou factures, l'erreur suivante apparaît :
```
FunctionsRelayError: Failed to send a request to the Edge Function
```

## Cause

Les Edge Functions ne sont pas déployées sur Supabase ou ne sont pas à jour.

## Solution : Déployer les Edge Functions

### Prérequis

1. **Installer Supabase CLI** (si pas déjà fait) :
   ```bash
   npm install -g supabase
   ```

2. **Se connecter à Supabase** :
   ```bash
   npx supabase login
   ```
   Cela ouvrira votre navigateur pour vous connecter.

3. **Lier votre projet** :
   ```bash
   npx supabase link --project-ref VOTRE_PROJECT_REF
   ```

   Pour trouver votre `PROJECT_REF` :
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet
   - L'URL sera : `https://supabase.com/dashboard/project/VOTRE_PROJECT_REF`
   - Copiez la partie après `/project/`

### Déploiement des Edge Functions

1. **Déployez la fonction d'envoi de devis** :
   ```bash
   npx supabase functions deploy send-quote-email
   ```

2. **Déployez la fonction d'envoi de factures** :
   ```bash
   npx supabase functions deploy send-invoice-email
   ```

3. **Vérifiez le déploiement** :
   - Allez sur https://supabase.com/dashboard
   - Sélectionnez votre projet
   - Allez dans **Edge Functions** (menu de gauche)
   - Vous devriez voir :
     - ✅ `send-quote-email`
     - ✅ `send-invoice-email`

### Configuration des variables d'environnement

⚠️ **IMPORTANT** : Après le déploiement, vous devez configurer les variables d'environnement.

1. **Dans le Dashboard Supabase** :
   - Allez dans **Settings** > **Edge Functions**
   - Scrollez jusqu'à **Environment Variables**

2. **Ajoutez la variable `RESEND_API_KEY`** :
   - Nom : `RESEND_API_KEY`
   - Valeur : Votre clé API Resend (commence par `re_...`)

   Pour obtenir une clé API Resend :
   - Allez sur https://resend.com/
   - Créez un compte ou connectez-vous
   - Allez dans **API Keys**
   - Créez une nouvelle clé API
   - Copiez la clé (vous ne pourrez plus la voir après !)

3. **Sauvegardez la variable**

### Redéploiement après ajout de variables

⚠️ Après avoir ajouté des variables d'environnement, vous **DEVEZ** redéployer les fonctions :

```bash
npx supabase functions deploy send-quote-email
npx supabase functions deploy send-invoice-email
```

## Test des Edge Functions

### Test via curl (optionnel)

Vous pouvez tester la fonction avec curl :

```bash
curl -i --location --request POST 'https://VOTRE_PROJECT_REF.supabase.co/functions/v1/send-quote-email' \
  --header 'Authorization: Bearer VOTRE_ANON_KEY' \
  --header 'Content-Type: application/json' \
  --data '{"quoteId":"123","recipientEmail":"test@example.com","recipientName":"Test"}'
```

Remplacez :
- `VOTRE_PROJECT_REF` par votre Project Reference
- `VOTRE_ANON_KEY` par votre Anon Key (disponible dans Settings > API)

### Test via l'application

1. **Actualisez votre application** (F5)
2. **Ouvrez un devis**
3. **Cliquez sur le bouton "Envoyer par email"**
4. **Remplissez le formulaire**
5. **Cliquez sur "Envoyer"**

**Résultat attendu avec clé API Resend configurée** :
- ✅ "Email envoyé avec succès"
- ✅ Le client reçoit l'email avec le PDF en pièce jointe
- ✅ Le statut du devis passe à "Envoyé"

**Résultat attendu SANS clé API Resend** :
- ⚠️ "Envoi simulé"
- ℹ️ Un lien public est créé mais aucun email n'est envoyé
- ✅ Le client peut quand même consulter le devis via le lien

## Vérification des logs

Pour voir les logs des Edge Functions et débugger les erreurs :

1. **Via le Dashboard** :
   - Allez dans **Edge Functions**
   - Cliquez sur la fonction (`send-quote-email` ou `send-invoice-email`)
   - Cliquez sur l'onglet **Logs**
   - Vous verrez tous les appels et erreurs

2. **Via CLI** :
   ```bash
   npx supabase functions logs send-quote-email
   ```

## Problèmes courants

### Erreur : "Could not find the function"
**Solution** : La fonction n'est pas déployée. Suivez les étapes de déploiement ci-dessus.

### Erreur : "Missing RESEND_API_KEY"
**Solution** :
1. Ajoutez la variable dans Settings > Edge Functions > Environment Variables
2. Redéployez la fonction

### Erreur CORS
**Solution** : Les headers CORS sont déjà configurés dans le code. Si le problème persiste :
1. Vérifiez que vous utilisez la bonne URL de projet
2. Redéployez la fonction
3. Vérifiez les logs de la fonction

### Erreur : "Invalid API Key"
**Solution** :
1. Vérifiez que votre clé Resend est correcte
2. Vérifiez que la clé n'a pas expiré
3. Créez une nouvelle clé si nécessaire

## Résumé des commandes

```bash
# Installation et configuration
npm install -g supabase
npx supabase login
npx supabase link --project-ref VOTRE_PROJECT_REF

# Déploiement
npx supabase functions deploy send-quote-email
npx supabase functions deploy send-invoice-email

# Voir les logs
npx supabase functions logs send-quote-email
npx supabase functions logs send-invoice-email
```

## Support

Si vous rencontrez des problèmes :
1. Vérifiez les logs des Edge Functions
2. Vérifiez la console du navigateur (F12)
3. Assurez-vous que la migration de base de données a été appliquée (voir MIGRATION_GUIDE.md)
4. Vérifiez que votre email est bien renseigné dans Paramètres > Société
