# 🔍 Diagnostic : Problème d'envoi d'emails

Ce guide vous aide à diagnostiquer pourquoi l'envoi d'emails ne fonctionne pas.

## ✅ Checklist de vérification

### 1. Vérifier que les fonctions Edge sont déployées

Les fonctions doivent être déployées sur Supabase pour fonctionner.

**Dans Supabase Dashboard** :
1. Aller dans **Edge Functions**
2. Vérifier que vous voyez :
   - `send-quote-email`
   - `send-invoice-email`

**Si les fonctions n'apparaissent pas** :
```bash
# Déployer les fonctions
npx supabase functions deploy send-quote-email
npx supabase functions deploy send-invoice-email
```

### 2. Vérifier la clé API Resend

**Format attendu** : `re_xxxxxxxxxxxxxxxxxxxxxxxxxxxx`

**Dans Supabase Dashboard** :
1. Aller dans **Settings → Edge Functions → Environment Variables**
2. Vérifier qu'il existe une variable nommée **exactement** : `RESEND_API_KEY`
3. La valeur doit commencer par `re_`

**⚠️ Erreurs courantes** :
- ❌ Nom de variable mal orthographié (`RESEND_KEY`, `API_KEY_RESEND`, etc.)
- ❌ Espaces avant/après la clé
- ❌ Clé de test au lieu de la clé de production
- ❌ Clé révoquée ou expirée

**Tester la clé dans Resend** :
1. Aller sur [resend.com](https://resend.com)
2. Se connecter
3. Aller dans **API Keys**
4. Vérifier que la clé est active (pas révoquée)

### 3. Vérifier les logs des fonctions Edge

**Dans Supabase Dashboard** :
1. Aller dans **Edge Functions → Logs**
2. Filtrer par fonction : `send-quote-email` ou `send-invoice-email`
3. Regarder les derniers appels

**Messages à chercher** :

✅ **Si ça fonctionne** :
```
Email sent successfully: re_xxxxx
```

⚠️ **Si mode simulation** :
```
=== EMAIL SIMULATION (Clé API Resend manquante) ===
```

❌ **Si erreur API** :
```
Resend API error: {"message": "..."}
```

❌ **Si erreur d'authentification** :
```
Non authentifié
```

❌ **Si erreur de données** :
```
Devis introuvable ou accès non autorisé
```

### 4. Vérifier l'email de votre société

**Dans l'application** :
1. Aller dans **Paramètres → Société**
2. Vérifier que les champs suivants sont remplis :
   - **Nom** ✅ (obligatoire)
   - **Email** ✅ (obligatoire - sera utilisé comme reply-to)

**Si l'email n'est pas renseigné** :
Le système utilisera `noreply@proviabase.app` par défaut, mais le reply-to sera vide.

### 5. Vérifier l'email du client

**Dans la fiche client** :
1. Ouvrir le client concerné
2. Vérifier que l'**Email** est bien renseigné
3. Vérifier qu'il n'y a pas de faute de frappe

**Le bouton "Envoyer par email" est grisé ?**
→ L'email du client n'est pas renseigné

### 6. Tester avec les outils de développement

**Ouvrir la console du navigateur** :
1. Clic droit → Inspecter → Console
2. Cliquer sur "Envoyer par email"
3. Regarder les erreurs dans la console

**Erreurs courantes** :

❌ **`Failed to fetch`** :
- Problème de connexion à Supabase
- Vérifier que `VITE_SUPABASE_URL` est correcte dans `.env`

❌ **`Unauthorized`** :
- Vous n'êtes pas connecté
- Votre session a expiré

❌ **`Network request failed`** :
- Pas de connexion internet
- Firewall bloque Supabase

### 7. Tester manuellement l'API Resend

Pour vérifier que votre clé API fonctionne :

```bash
curl -X POST 'https://api.resend.com/emails' \
  -H 'Authorization: Bearer VOTRE_CLE_API' \
  -H 'Content-Type: application/json' \
  -d '{
    "from": "Test <noreply@proviabase.app>",
    "to": ["votre@email.com"],
    "subject": "Test",
    "html": "<p>Test</p>"
  }'
```

**Réponse attendue** :
```json
{
  "id": "re_xxxxx"
}
```

**Si erreur** :
```json
{
  "message": "Invalid API key"
}
```
→ La clé API n'est pas valide

### 8. Vérifier que la migration DB a été appliquée

**Dans Supabase SQL Editor** :
```sql
-- Vérifier que les champs existent
SELECT column_name
FROM information_schema.columns
WHERE table_name = 'companies'
  AND column_name IN ('email', 'email_from', 'telephone', 'adresse');
```

**Devrait retourner** :
- `email`
- `email_from`
- `telephone`
- `adresse`

**Si les colonnes n'existent pas** :
```bash
npx supabase db push
```

### 9. Redéployer les fonctions Edge

Si rien ne fonctionne, redéployer les fonctions :

```bash
# Vérifier que vous êtes connecté à Supabase
npx supabase login

# Lier votre projet
npx supabase link --project-ref VOTRE_PROJECT_REF

# Déployer toutes les fonctions
npx supabase functions deploy send-quote-email
npx supabase functions deploy send-invoice-email

# Vérifier les secrets
npx supabase secrets list
```

**Définir le secret si absent** :
```bash
npx supabase secrets set RESEND_API_KEY=re_votre_cle_api
```

## 🧪 Test complet étape par étape

### Test 1 : Mode simulation

1. **Ne PAS configurer** la clé API Resend
2. Ouvrir un devis
3. Cliquer sur "Envoyer par email"
4. Remplir et envoyer

**Résultat attendu** :
- Toast jaune : "⚠️ Envoi simulé"
- Dans les logs Supabase : "EMAIL SIMULATION"

### Test 2 : Avec clé API

1. Configurer la clé API Resend
2. **Redéployer les fonctions** (important !)
3. Ouvrir un devis
4. Cliquer sur "Envoyer par email"
5. Envoyer à votre propre email

**Résultat attendu** :
- Toast vert : "Email envoyé avec succès"
- Email reçu dans votre boîte
- PDF en pièce jointe

## 🔧 Solutions aux problèmes courants

### "Email envoyé" mais rien reçu

**Causes possibles** :
1. L'email est dans les spams → Vérifier le dossier spam
2. Email mal saisi → Vérifier l'orthographe
3. Limite Resend atteinte → Vérifier le dashboard Resend
4. Domaine non vérifié → Vérifier dans Resend

**Solution** :
- Vérifier les logs Resend : Dashboard → Logs
- Voir si l'email apparaît comme "sent"
- Si status = "bounced" → Email invalide

### "Envoi simulé" alors que la clé est configurée

**Causes** :
1. Fonctions pas redéployées après configuration de la clé
2. Variable mal nommée dans Supabase
3. Clé mal copiée (espaces, etc.)

**Solution** :
```bash
# Redéployer avec la nouvelle variable
npx supabase functions deploy send-quote-email
npx supabase functions deploy send-invoice-email
```

### Erreur "Non authentifié"

**Causes** :
- Session expirée
- Token invalide

**Solution** :
- Se déconnecter et se reconnecter
- Vider le cache du navigateur

### Erreur "Devis introuvable"

**Causes** :
- Le devis n'appartient pas à votre société
- Problème de RLS (Row Level Security)

**Solution** :
- Vérifier que vous êtes connecté avec le bon compte
- Vérifier les permissions RLS dans Supabase

## 📊 Informations à fournir pour support

Si le problème persiste, fournir :

1. **Logs de la fonction Edge** (sans la clé API !)
2. **Message d'erreur exact** dans la console
3. **Étapes pour reproduire** le problème
4. **Compte Resend** : gratuit ou payant ?
5. **Nombre d'emails envoyés** aujourd'hui (quota)

## 💡 Astuces

### Tester sans envoyer d'email réel

Utilisez un service comme [Mailtrap](https://mailtrap.io) ou configurez Resend en mode test.

### Voir les emails envoyés

Dans Resend Dashboard → Logs, vous pouvez voir :
- Tous les emails envoyés
- Leur statut (sent, delivered, bounced)
- Les erreurs éventuelles

### Activer le mode debug

Dans `send-quote-email/index.ts`, ajoutez plus de logs :

```typescript
console.log('🔍 DEBUG - Quote data:', quote);
console.log('🔍 DEBUG - Company data:', company);
console.log('🔍 DEBUG - Resend API key present:', !!resendApiKey);
```

---

**Dernière vérification** : Avez-vous bien **redéployé les fonctions** après avoir configuré la clé API ?

```bash
npx supabase functions deploy send-quote-email
npx supabase functions deploy send-invoice-email
```

C'est la cause n°1 des problèmes ! 🚀
