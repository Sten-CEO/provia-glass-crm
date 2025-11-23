# 🔐 VÉRIFICATION COMPLÈTE : Secrets Supabase

**Date**: 2025-11-23
**Problème**: Les logs sont vides = la fonction ne s'exécute pas correctement

---

## ✅ ÉTAPE 1 : Vérifier Que Les Secrets Sont Configurés

### 1.1 Aller sur Supabase Dashboard

1. Ouvrez : https://supabase.com/dashboard
2. Cliquez sur votre projet : **rryjcqcxhpccgzkhgdqr**
3. Dans le menu de gauche, cliquez : **Settings** (icône engrenage en bas)
4. Cliquez : **Edge Functions**

### 1.2 Vérifier Les Secrets

Vous devriez voir 2 secrets :

| Secret Name | Value | Status |
|-------------|-------|--------|
| `SUPABASE_URL` | `https://rryjcqcxhpccgzkhgdqr.supabase.co` | ✅ Auto |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhb...` (très long) | ❓ À vérifier |

**CRITIQUE** : Si `SUPABASE_SERVICE_ROLE_KEY` n'existe PAS ou est vide :

1. Allez dans **Settings** → **API**
2. Copiez la clé **service_role** (section "Project API keys")
3. Retournez dans **Settings** → **Edge Functions**
4. Cliquez **Add secret**
5. Name: `SUPABASE_SERVICE_ROLE_KEY`
6. Value: Collez la service_role key
7. Cliquez **Save**

**⚠️ APRÈS avoir ajouté/modifié un secret, vous DEVEZ redéployer** :

```bash
supabase functions deploy create-employee-account --project-ref rryjcqcxhpccgzkhgdqr
```

---

## ✅ ÉTAPE 2 : Test Complet Avec Logs En Temps Réel

### 2.1 Ouvrir Les Logs (AVANT de créer le membre)

1. Dashboard → **Edge Functions**
2. Cliquez sur **create-employee-account**
3. Cliquez sur l'onglet **Logs**
4. **GARDEZ cette page ouverte** dans un onglet

### 2.2 Ouvrir Votre Application (Nouvel Onglet)

1. Allez sur : `http://localhost:5173/equipe` (ou votre URL)
2. **Ouvrez la console** (F12 ou Cmd+Option+I)
3. Cliquez **Console** en haut

### 2.3 Créer Un Nouveau Membre (Email JAMAIS Utilisé)

**IMPORTANT** : Utilisez un email que vous n'avez **JAMAIS** utilisé avant !

1. Cliquez "Inviter un employé"
2. **Nom** : `Test Deploy Version 8`
3. **Email** : `testv8nouveau@votredomaine.com` ← **NOUVEAU !**
4. **Rôle** : **Admin (CRM + App optionnel)**
5. Cliquez "Inviter"
6. Cliquez "Créer un accès à l'application"
7. Cliquez "Générer un mot de passe"
8. **COPIEZ** le mot de passe
9. Cliquez "Créer l'accès"

### 2.4 Surveiller SIMULTANÉMENT

**Dans la Console (F12)** :
- Regardez ce qui s'affiche après le clic "Créer l'accès"
- Cherchez : `Edge function response data:`

**Dans Les Logs Supabase** :
- Rafraîchissez la page (F5)
- Des logs doivent **IMMÉDIATEMENT** apparaître

---

## 📊 RÉSULTATS ATTENDUS

### ✅ CAS 1 : Ça Marche Maintenant !

**Console (F12)** affiche :
```javascript
Edge function response data: {
  success: true,
  userId: "...",
  temporaryPassword: "...",
  role: "admin",        ← PRÉSENT !
  email: "testv8nouveau@votredomaine.com"  ← PRÉSENT !
}
```

**Logs Supabase** affichent :
```
📥 Received request data: { employeeId: '...', email: 'testv8nouveau@votredomaine.com', ... }
🎭 Role mapping: { employeeUIRole: 'Admin', mappedDBRole: 'admin', ... }
✅ Validation passed, creating user account...
User created: ...
✅ Equipe updated with user_id: ...
✅ User role created successfully: admin
```

**Supabase Auth → Users** :
- Le user `testv8nouveau@votredomaine.com` **apparaît** ✅

**Table `user_roles`** :
- Une ligne avec `role = 'admin'` pour ce user ✅

**Test Connexion** (`/auth/login`) :
- Email : `testv8nouveau@votredomaine.com`
- Mot de passe : celui copié
- Console affiche : `Role found: admin` ✅
- Vous êtes redirigé vers `/tableau-de-bord` ✅

---

### ❌ CAS 2 : Logs Toujours Vides

**Si aucun log n'apparaît dans Supabase** :

1. Les secrets ne sont pas configurés → Retournez à ÉTAPE 1
2. L'URL de l'edge function est incorrecte dans le frontend

**Vérifiez** :
```bash
cat .env
```

Doit contenir :
```
VITE_SUPABASE_URL=https://rryjcqcxhpccgzkhgdqr.supabase.co
VITE_SUPABASE_ANON_KEY=eyJhbGc...
```

**Si le fichier .env n'existe pas ou ne contient pas ces lignes** :

```bash
echo "VITE_SUPABASE_URL=https://rryjcqcxhpccgzkhgdqr.supabase.co" > .env
echo "VITE_SUPABASE_ANON_KEY=VOTRE_ANON_KEY" >> .env
```

Puis redémarrez le serveur :
```bash
npm run dev
```

---

### ❌ CAS 3 : Logs Apparaissent Mais Erreur

**Si les logs montrent une erreur** :

Copier-coller l'erreur exacte et me l'envoyer.

Erreurs possibles :
- `Missing authorization header` → Problème de token frontend
- `Unauthorized` → L'utilisateur connecté n'a pas de rôle
- `Employee not found` → L'employeeId est invalide
- `User already exists` → Email déjà utilisé (utilisez un NOUVEAU email)

---

### ❌ CAS 4 : Réponse Sans `role` et `email`

**Si la console affiche** :
```javascript
{success: true, userId: '...', temporaryPassword: '...'}
```
(sans `role` et `email`)

**Mais que les logs Supabase montrent que tout s'est bien passé** :

Cela signifie qu'il y a **2 versions** de la fonction :
- Une ancienne version qui répond (cache ?)
- La nouvelle version qui est déployée

**Solution** : Forcer le refresh du navigateur :
1. **Cmd+Shift+R** (Mac) ou **Ctrl+Shift+F5** (Windows)
2. OU : Ouvrir une fenêtre **Navigation Privée**
3. Re-tester la création

---

## 🎯 CHECKLIST COMPLÈTE

Cochez au fur et à mesure :

- [ ] 1. Vérifier que `SUPABASE_SERVICE_ROLE_KEY` existe dans Settings → Edge Functions
- [ ] 2. Si manquant, copier depuis Settings → API et l'ajouter
- [ ] 3. Redéployer après ajout de secret : `supabase functions deploy create-employee-account --project-ref rryjcqcxhpccgzkhgdqr`
- [ ] 4. Ouvrir les logs Supabase dans un onglet
- [ ] 5. Ouvrir l'app avec console (F12) dans un autre onglet
- [ ] 6. Créer un membre avec email **complètement nouveau** (jamais utilisé)
- [ ] 7. Vérifier que les logs apparaissent dans Supabase
- [ ] 8. Vérifier que la console affiche `role` et `email` dans la réponse
- [ ] 9. Vérifier que le user apparaît dans Auth → Users
- [ ] 10. Vérifier que le rôle est correct dans table `user_roles`
- [ ] 11. Tester la connexion sur `/auth/login`
- [ ] 12. Vérifier que la console affiche `Role found: admin`
- [ ] 13. Vérifier la redirection vers `/tableau-de-bord`

---

## 📞 SI ÇA NE MARCHE TOUJOURS PAS

Envoyez-moi :

1. **Screenshot** de Settings → Edge Functions (section Secrets)
2. **Copie exacte** de la console (F12) lors de la création
3. **Copie exacte** des logs Supabase
4. **Screenshot** de Auth → Users (montrant si le user apparaît ou non)

Avec ces 4 éléments, je pourrai identifier le problème précis.

---

**Date**: 2025-11-23
**Version Edge Function**: 8
**Project ID**: `rryjcqcxhpccgzkhgdqr`
