# 🔥 DÉPANNAGE URGENT - Edge Function Pas Déployée

**PROBLÈME CONFIRMÉ**: L'edge function sur Supabase est une vieille version.

**PREUVE**: La réponse ne contient pas le champ `role`:
```
✅ Account created successfully: {success: true, userId: '...', temporaryPassword: '...'}
```

Elle devrait contenir:
```
{success: true, userId: '...', temporaryPassword: '...', role: 'admin', email: '...'}
```

---

## 🚀 SOLUTION EN 3 ÉTAPES

### ÉTAPE 1: Vérifier l'État du Déploiement

```bash
# Ouvrir Terminal, aller dans le projet
cd /chemin/vers/provia-glass-crm

# Vérifier les fonctions déployées
supabase functions list --project-ref rryjcqcxhpccgzkhgdqr
```

**Si vous voyez une erreur "not linked"**:
```bash
# Se connecter à Supabase
supabase login

# Lier le projet
supabase link --project-ref rryjcqcxhpccgzkhgdqr
```

### ÉTAPE 2: FORCER le Redéploiement

```bash
# Déployer l'edge function (CRITIQUE!)
supabase functions deploy create-employee-account --project-ref rryjcqcxhpccgzkhgdqr
```

**Vous DEVEZ voir**:
```
Deploying create-employee-account (project ref: rryjcqcxhpccgzkhgdqr)
Bundled create-employee-account size: 1.2KB
Deployed create-employee-account to https://rryjcqcxhpccgzkhgdqr.supabase.co/functions/v1/create-employee-account
```

**Si vous voyez une erreur**:
- "Command not found" → Installez Supabase CLI: `npm install -g supabase`
- "Not logged in" → Exécutez: `supabase login`
- "Project not found" → Vérifiez le Project ID dans `supabase/config.toml`

### ÉTAPE 3: Vérifier le Déploiement

#### 3.1 Vérifier dans Supabase Dashboard

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. **Edge Functions** → **create-employee-account**
4. Cliquez sur **"Logs"** (en haut)
5. Vous devez voir l'activité récente

#### 3.2 Tester avec un NOUVEAU compte

**IMPORTANT**: Supprimez d'abord l'ancien compte `claude@gmail.com`:

1. **Supabase Dashboard** → **Authentication** → **Users**
2. Cherchez `claude@gmail.com`
3. Cliquez sur les 3 points → **Delete user**

4. **Table Editor** → **user_roles**
5. Cherchez la ligne avec `user_id` de claude@gmail.com
6. Supprimez-la

7. **Table Editor** → **equipe**
8. Trouvez le membre "claude"
9. Mettez `user_id` à **NULL** (ou supprimez le membre)

#### 3.3 Re-créer le membre Admin

1. Allez sur `/equipe`
2. Invitez un nouveau membre:
   - Nom: `Test Admin Final`
   - Email: `testadmin@votredomaine.com` (PAS claude@gmail.com)
   - Rôle: **Admin (CRM + App optionnel)**
3. "Créer un accès à l'application"

#### 3.4 Vérifier la Console (F12)

Vous devez maintenant voir:
```
✅ Account created successfully: {
  success: true,
  userId: '...',
  temporaryPassword: '...',
  role: 'admin',  ← DOIT être présent!
  email: 'testadmin@votredomaine.com'
}
```

**Si `role` est présent**: ✅ L'edge function est bien déployée!

**Si `role` est absent**: ❌ Le déploiement a échoué.

#### 3.5 Vérifier dans Supabase

**Dashboard** → **Edge Functions** → **create-employee-account** → **Logs**

Vous devez voir (dans les logs récents):
```
📥 Received request data: { employeeId: '...', email: 'testadmin@...', ... }
🎭 Role mapping: {
  employeeUIRole: "Admin",
  mappedDBRole: "admin",
  ...
}
✅ Validation passed, creating user account...
User created: [user_id]
✅ Equipe updated with user_id: [user_id]
✅ User role created successfully: admin
```

**Si vous ne voyez PAS ces logs**: L'edge function n'est pas correctement déployée.

#### 3.6 Tester la Connexion

1. Ouvrez `/auth/login`
2. Email: `testadmin@votredomaine.com`
3. Mot de passe: celui copié
4. Cliquez "Se connecter"

**Console devrait afficher**:
```
Role found: admin  ← Pas "employe_terrain"!
✅ CRM access granted for role: admin
```

---

## 🔍 DIAGNOSTIC COMPLET

### Vérifier le Project ID

```bash
cat supabase/config.toml
```

Doit afficher:
```
project_id = "rryjcqcxhpccgzkhgdqr"
```

### Vérifier le Code de l'Edge Function

```bash
grep -A 10 "return new Response" supabase/functions/create-employee-account/index.ts
```

Doit afficher:
```typescript
return new Response(
  JSON.stringify({
    success: true,
    userId: newUser.user.id,
    temporaryPassword: password || null,
    role: dbRole,  ← DOIT être là!
    email: email,
  }),
```

Si `role: dbRole,` est présent dans le code mais pas dans la réponse, c'est que le déploiement n'a pas fonctionné.

---

## ⚠️ PROBLÈMES COURANTS

### Problème 1: "Supabase CLI not found"

```bash
# Installer
npm install -g supabase

# Vérifier
supabase --version
```

### Problème 2: "Authentication required"

```bash
# Se connecter
supabase login
```

Cela va ouvrir un navigateur.

### Problème 3: "Project not linked"

```bash
# Lier
supabase link --project-ref rryjcqcxhpccgzkhgdqr
```

### Problème 4: Le déploiement semble réussir mais rien ne change

**Vérifier les logs Supabase**:
1. Dashboard → Edge Functions → create-employee-account
2. Onglet **Logs**
3. Si vous ne voyez PAS les nouveaux logs (avec 🎭, ✅, etc.), le déploiement a échoué silencieusement

**Solution**: Re-déployer en forçant:
```bash
# Supprimer la fonction sur Supabase Dashboard
# Puis re-déployer
supabase functions deploy create-employee-account --project-ref rryjcqcxhpccgzkhgdqr
```

---

## 📋 CHECKLIST ABSOLUE

Cochez TOUTES ces cases dans l'ordre:

- [ ] Terminal ouvert, dans le dossier `provia-glass-crm`
- [ ] `supabase login` exécuté (authentifié)
- [ ] `supabase link --project-ref rryjcqcxhpccgzkhgdqr` exécuté
- [ ] `supabase functions deploy create-employee-account --project-ref rryjcqcxhpccgzkhgdqr` exécuté
- [ ] Message "Deployed create-employee-account to https://..." affiché
- [ ] Ancien compte `claude@gmail.com` supprimé (Auth, user_roles, equipe)
- [ ] Nouveau membre créé avec email différent
- [ ] Console affiche `role: 'admin'` dans la réponse ✅
- [ ] Dashboard → Edge Functions → Logs affiche les nouveaux logs 🎭
- [ ] Table `user_roles` contient `role = 'admin'` (pas 'employe_terrain')
- [ ] Connexion sur `/auth/login` affiche `Role found: admin`
- [ ] Connexion réussie au CRM

**Si TOUTES les cases sont cochées**: ✅ Le système fonctionne!

**Si une case n'est PAS cochée**: Retournez à cette étape et résolvez le problème.

---

## 🆘 SI ÇA NE MARCHE TOUJOURS PAS

Envoyez-moi:

1. **Sortie de cette commande**:
```bash
supabase functions list --project-ref rryjcqcxhpccgzkhgdqr
```

2. **Sortie de cette commande**:
```bash
cat supabase/config.toml
```

3. **Screenshot** des logs Supabase Edge Function (Dashboard → Edge Functions → create-employee-account → Logs)

4. **Console navigateur** lors de la création du membre (doit afficher la réponse complète avec `role`)

---

**Date**: 2025-11-22
**Project ID**: `rryjcqcxhpccgzkhgdqr`
