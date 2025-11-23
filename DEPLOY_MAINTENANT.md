# 🔥 DÉPLOYER L'EDGE FUNCTION MAINTENANT

**PROBLÈME CONFIRMÉ**: L'edge function n'est pas déployée sur Supabase.

**PREUVE #1**: Aucun user n'apparaît dans Supabase Auth → Users (seuls les comptes entreprises)
**PREUVE #2**: La réponse ne contient pas les champs `role` et `email`

---

## ⚡ COMMANDES À EXÉCUTER (5 MINUTES MAX)

### ÉTAPE 1: Ouvrir Terminal

Sur Mac : `Cmd + Espace` → Tapez "Terminal" → Entrée

### ÉTAPE 2: Aller dans le Projet

```bash
cd /chemin/vers/provia-glass-crm
```

Remplacez `/chemin/vers/provia-glass-crm` par le chemin réel.

### ÉTAPE 3: Vérifier Supabase CLI

```bash
supabase --version
```

**Si "command not found"**:
```bash
npm install -g supabase
```

### ÉTAPE 4: Login Supabase

```bash
supabase login
```

Cela ouvrira votre navigateur pour vous authentifier.

### ÉTAPE 5: Lier le Projet

```bash
supabase link --project-ref rryjcqcxhpccgzkhgdqr
```

**Sortie attendue**:
```
Linked to project "rryjcqcxhpccgzkhgdqr"
```

### ÉTAPE 6: DÉPLOYER L'EDGE FUNCTION (CRITIQUE!)

```bash
supabase functions deploy create-employee-account --project-ref rryjcqcxhpccgzkhgdqr
```

**Sortie attendue**:
```
Deploying create-employee-account (project ref: rryjcqcxhpccgzkhgdqr)
Bundled create-employee-account size: ~1.2KB
Deployed create-employee-account to https://rryjcqcxhpccgzkhgdqr.supabase.co/functions/v1/create-employee-account
```

### ÉTAPE 7: Vérifier le Déploiement

```bash
supabase functions list --project-ref rryjcqcxhpccgzkhgdqr
```

**Sortie attendue**:
```
NAME                       STATUS
create-employee-account    ACTIVE
```

---

## ✅ VÉRIFICATION IMMÉDIATE

### 1. Créer un Nouveau Membre

1. Allez sur `/equipe`
2. Cliquez "Inviter un employé"
3. Nom: `Test Déploiement Admin`
4. Email: `testdeploy@votredomaine.com` (utilisez un email NOUVEAU)
5. Rôle: **Admin (CRM + App optionnel)**
6. Cliquez "Inviter"
7. Cliquez "Créer un accès à l'application"
8. Générer un mot de passe temporaire
9. Cliquez "Créer l'accès"

### 2. Vérifier la Console (F12)

Vous DEVEZ maintenant voir :
```javascript
Edge function response data: {
  success: true,
  userId: "...",
  temporaryPassword: "...",
  role: "admin",        ← NOUVEAU !
  email: "testdeploy@votredomaine.com"  ← NOUVEAU !
}
```

### 3. Vérifier Supabase Dashboard → Auth → Users

1. Allez sur https://supabase.com/dashboard
2. Sélectionnez votre projet
3. **Authentication** → **Users**
4. Cherchez `testdeploy@votredomaine.com`
5. **Il DOIT maintenant apparaître ici !** ✅

### 4. Vérifier Table `user_roles`

1. **Table Editor** → **user_roles**
2. Cherchez l'entrée avec email `testdeploy@votredomaine.com`
3. Vérifier : `role` = `"admin"` (PAS `"employe_terrain"`)

### 5. Tester la Connexion CRM

1. Ouvrez `/auth/login`
2. Email: `testdeploy@votredomaine.com`
3. Mot de passe: celui copié
4. Cliquez "Se connecter"

**Console DOIT afficher**:
```
Role found: admin
✅ CRM access granted for role: admin
```

**Résultat**: Vous êtes redirigé vers `/tableau-de-bord` ✅

---

## 🎯 RÉSUMÉ

| Avant Déploiement | Après Déploiement |
|-------------------|-------------------|
| ❌ Users n'apparaissent pas dans Auth | ✅ Users apparaissent dans Auth |
| ❌ Réponse sans `role` et `email` | ✅ Réponse avec `role` et `email` |
| ❌ Tous les comptes = `employe_terrain` | ✅ Rôles corrects (admin, owner, etc.) |
| ❌ Connexion CRM bloquée pour admins | ✅ Connexion CRM fonctionne |

---

## 🚨 SI VOUS RENCONTREZ DES ERREURS

### Erreur: "command not found: supabase"

**Solution**:
```bash
npm install -g supabase
```

### Erreur: "Project not found"

**Solution**: Vérifier le Project ID dans `supabase/config.toml`:
```bash
cat supabase/config.toml
```

Doit afficher `project_id = "rryjcqcxhpccgzkhgdqr"`

### Erreur: "Not logged in"

**Solution**:
```bash
supabase login
```

### Erreur: "Failed to deploy"

**Solution**: Vérifier les logs et me les envoyer. Mais en général, cela fonctionne du premier coup si les étapes 1-5 sont réussies.

---

## 📞 APRÈS LE DÉPLOIEMENT

Une fois que vous avez exécuté ces étapes et que vous voyez les users apparaître dans Auth → Users, **le système fonctionnera parfaitement**.

Si après le déploiement les users n'apparaissent toujours pas, envoyez-moi :
1. La sortie complète de la commande `supabase functions deploy`
2. La console navigateur (F12) lors de la création d'un membre
3. Les logs de l'edge function (Dashboard → Edge Functions → create-employee-account → Logs)

---

**Date**: 2025-11-22
**Project ID**: `rryjcqcxhpccgzkhgdqr`
**Temps nécessaire**: 5 minutes
