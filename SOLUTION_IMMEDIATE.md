# 🚨 SOLUTION IMMÉDIATE - Bug Rôles CRM vs Employés

**Problème**: Tous les comptes créés sont traités comme `employe_terrain` même quand vous choisissez Admin/Owner.

**Cause**: L'edge function `create-employee-account` **N'EST PAS DÉPLOYÉE** sur Supabase.

**Solution**: Déployer l'edge function (5 minutes max).

---

## ✅ ÉTAPE 1: DÉPLOYER L'EDGE FUNCTION

### 1.1 Ouvrir un Terminal

Sur votre Mac, ouvrez Terminal.

### 1.2 Aller dans le projet

```bash
cd /chemin/vers/provia-glass-crm
```

### 1.3 Installer Supabase CLI (si pas déjà fait)

```bash
npm install -g supabase
```

### 1.4 Login Supabase

```bash
supabase login
```

Cela va ouvrir votre navigateur pour vous authentifier.

### 1.5 Lier le projet

```bash
supabase link --project-ref rryjcqcxhpccgzkhgdqr
```

### 1.6 Déployer l'edge function (CRITIQUE!)

```bash
supabase functions deploy create-employee-account --project-ref rryjcqcxhpccgzkhgdqr
```

**Vous devez voir**:
```
Deploying create-employee-account (project ref: rryjcqcxhpccgzkhgdqr)
Bundled create-employee-account size: ~1KB
Deployed create-employee-account to https://...
```

### 1.7 Vérifier le déploiement

```bash
supabase functions list --project-ref rryjcqcxhpccgzkhgdqr
```

**Vous devez voir**:
```
NAME                       STATUS
create-employee-account    ACTIVE
```

✅ **C'EST TOUT! L'edge function est déployée.**

---

## 🧪 ÉTAPE 2: TESTER LE SYSTÈME

### Test A: Créer un Admin CRM

1. **Créer le membre**:
   - Allez sur `/equipe`
   - Cliquez "Inviter un employé"
   - Nom: `Test Admin Nouveau`
   - Email: `testadmin@votredomaine.com`
   - Rôle: **Admin (CRM + App optionnel)**
   - Cliquez "Inviter"

2. **Créer l'accès**:
   - Cliquez sur "Créer un accès à l'application" (icône smartphone)
   - Choisissez "Générer un mot de passe temporaire"
   - Cliquez "Créer l'accès"

3. **Le modal doit afficher**:
   ```
   ✅ Compte créé avec succès dans Supabase Auth!

   Email: testadmin@votredomaine.com
   Mot de passe: [copiez-le]

   🔐 Page de connexion à utiliser:
   Cet employé doit se connecter sur le CRM:
   https://votre-site.com/auth/login
   ```

4. **Vérifier dans Supabase Dashboard**:

   **4.1 Auth → Users**:
   - Cherchez `testadmin@votredomaine.com`
   - ✅ Il doit exister
   - ✅ Email Confirmed: true

   **4.2 Table Editor → user_roles**:
   - Cherchez l'entrée avec email `testadmin@votredomaine.com`
   - ✅ `role` doit être `"admin"` (PAS `"employe_terrain"`)
   - ✅ `company_id` doit être rempli

   **4.3 Edge Functions → create-employee-account → Logs**:
   - Cherchez le log le plus récent
   - Vous devez voir:
   ```
   🎭 Role mapping: {
     employeeUIRole: "Admin",
     mappedDBRole: "admin",  ← IMPORTANT
     ...
   }
   ✅ User role created successfully: admin
   ```

5. **Tester la connexion CRM** (DOIT MARCHER):
   - Ouvrez `/auth/login`
   - Email: `testadmin@votredomaine.com`
   - Mot de passe: celui copié
   - Cliquez "Se connecter"
   - **Résultat**: ✅ Accès au CRM
   - **Console**: `Role found: admin` + `✅ CRM access granted for role: admin`

6. **Tester la connexion App Employé** (DOIT ÉCHOUER):
   - Déconnectez-vous
   - Ouvrez `/employee/login`
   - Entrez les mêmes identifiants
   - **Résultat**: ❌ Message "Ce compte est réservé au CRM..."
   - **Console**: `❌ Non-employee account attempted employee login`

### Test B: Créer un Employé Terrain

1. **Créer le membre**:
   - Nom: `Test Employé Nouveau`
   - Email: `testemploye@votredomaine.com`
   - Rôle: **Employé terrain (App uniquement)**

2. **Créer l'accès** (même processus)

3. **Le modal doit afficher**:
   ```
   🔐 Page de connexion à utiliser:
   Cet employé doit se connecter sur l'application employé:
   https://votre-site.com/employee/login
   ```

4. **Vérifier Supabase**:
   - Table `user_roles`: `role` = `"employe_terrain"` ✅

5. **Tester connexion App** (DOIT MARCHER):
   - `/employee/login` → ✅ Accès

6. **Tester connexion CRM** (DOIT ÉCHOUER):
   - `/auth/login` → ❌ Message "Ce compte est réservé à l'application employé..."

---

## 🔴 SI LE PROBLÈME PERSISTE

### Problème: "Role found: employe_terrain" pour un Admin

**Cause**: Vous avez créé le membre AVANT de déployer l'edge function.

**Solution**: Supprimer et recréer le membre:

1. **Supprimer l'ancien user**:
   - Supabase Dashboard → Auth → Users
   - Cherchez l'email
   - Cliquez sur les 3 points → Delete user

2. **Supprimer dans user_roles**:
   - Table Editor → user_roles
   - Cherchez l'entrée avec cet email
   - Supprimez-la

3. **Supprimer dans equipe** (ou juste reset user_id):
   - Table Editor → equipe
   - Trouvez le membre
   - Soit supprimez, soit mettez `user_id` à NULL

4. **Recréer le membre** depuis `/equipe` → Créer accès

### Problème: "User already exists"

Vous essayez de créer un compte avec un email déjà utilisé.

**Solution**: Utilisez un autre email OU supprimez l'ancien user (étapes ci-dessus).

---

## 📊 RÉSUMÉ DES RÔLES

| Rôle | Connexion CRM<br>/auth/login | Connexion App<br>/employee/login |
|------|------------------------------|----------------------------------|
| `owner` | ✅ OUI | ❌ NON |
| `admin` | ✅ OUI | ❌ NON |
| `manager` | ✅ OUI | ❌ NON |
| `backoffice` | ✅ OUI | ❌ NON |
| `employe_terrain` | ❌ NON | ✅ OUI |

---

## ✅ CHECKLIST FINALE

- [ ] Edge function déployée: `supabase functions deploy create-employee-account`
- [ ] Test Admin: User créé dans Auth → Users
- [ ] Test Admin: Role = 'admin' dans user_roles (pas employe_terrain)
- [ ] Test Admin: Connexion OK sur /auth/login
- [ ] Test Admin: Connexion BLOQUÉE sur /employee/login
- [ ] Test Employé: User créé dans Auth → Users
- [ ] Test Employé: Role = 'employe_terrain' dans user_roles
- [ ] Test Employé: Connexion OK sur /employee/login
- [ ] Test Employé: Connexion BLOQUÉE sur /auth/login

**Si toutes les cases sont cochées: LE SYSTÈME FONCTIONNE PARFAITEMENT!**

---

## 💡 POURQUOI ÇA NE MARCHAIT PAS AVANT?

L'edge function contient le code qui:
1. Lit le rôle depuis la table `equipe`
2. Mappe "Admin" → "admin", "Owner" → "owner", etc.
3. Crée le user dans Supabase Auth
4. Insère dans `user_roles` avec le BON rôle

**MAIS** si l'edge function n'est pas déployée:
- Supabase utilise une vieille version (ou rien)
- Qui crée tout en `employe_terrain` par défaut
- Donc même si le frontend affiche "Admin", le rôle final est "employe_terrain"

**Maintenant que vous avez déployé**: tout fonctionne correctement!

---

**Date**: 2025-11-22
**Project ID**: `rryjcqcxhpccgzkhgdqr`
**Temps nécessaire**: 5-10 minutes max
