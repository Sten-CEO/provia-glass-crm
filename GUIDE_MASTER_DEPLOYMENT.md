# 🚀 GUIDE MASTER - DÉPLOIEMENT COMPLET PROVIA BASE CRM

**Project ID**: `rryjcqcxhpccgzkhgdqr`

Ce guide reprend TOUT depuis zéro. Rien n'a été déployé. Tout doit être fait dans l'ordre indiqué.

---

## 📊 SECTION 1: ANALYSE DU CODE ACTUEL

### ✅ Fichiers Modifiés et Leur État

#### 1.1 Edge Function: `supabase/functions/create-employee-account/index.ts`

**État**: ✅ **CODE CORRECT** mais **NON DÉPLOYÉ**

**Ce que fait la fonction**:
1. Vérifie que l'appelant est owner/admin/manager
2. Récupère le rôle depuis la table `equipe`
3. Mappe le rôle UI → DB:
   - `"Owner"` → `"owner"`
   - `"Admin"` → `"admin"`
   - `"Manager"` → `"manager"`
   - `"Backoffice"` → `"backoffice"`
   - `"Employé terrain"` → `"employe_terrain"`
4. Crée le user dans Supabase Auth avec `admin.createUser()`
5. Met à jour la table `equipe` avec le `user_id`
6. Insère dans `user_roles` avec le bon rôle
7. Retourne: `{ success, userId, temporaryPassword, role, email }`

**Logs dans la fonction**:
```
📥 Received request data
🎭 Role mapping
✅ Validation passed, creating user account...
User created: [user_id]
✅ Equipe updated with user_id
✅ User role created successfully: [role]
```

#### 1.2 Dialog: `src/components/equipe/CreateEmployeeAccessDialog.tsx`

**État**: ✅ **CODE CORRECT**

**Ce que fait le composant**:
1. Génère un mot de passe de 12 caractères
2. Appelle l'edge function via `supabase.functions.invoke()`
3. Affiche un modal avec:
   - ✅ Email de connexion
   - ✅ Mot de passe temporaire (copiable)
   - ✅ **URL de connexion selon le rôle**:
     - `employe_terrain` → `/employee/login`
     - Autres → `/auth/login`

#### 1.3 Login CRM: `src/pages/auth/Login.tsx`

**État**: ✅ **CODE CORRECT**

**Logique**:
```typescript
if (userRole?.role === 'employe_terrain') {
  // ❌ BLOQUÉ
  toast.error("Ce compte est réservé à l'application employé...");
  signOut();
} else {
  // ✅ OK - Accès au CRM
  navigate("/tableau-de-bord");
}
```

#### 1.4 Login Employé: `src/pages/employee/EmployeeLogin.tsx`

**État**: ✅ **CODE CORRECT**

**Logique**:
```typescript
if (userRole?.role !== 'employe_terrain') {
  // ❌ BLOQUÉ
  toast.error("Ce compte est réservé au CRM...");
  signOut();
} else {
  // ✅ OK - Accès à l'app employé
  navigate("/employee");
}
```

### 🔴 PROBLÈME IDENTIFIÉ

**Le code est correct MAIS**:
- ❌ L'edge function n'est **PAS déployée** sur Supabase
- ❌ Donc elle utilise l'ancienne version (ou n'existe pas)
- ❌ Les comptes ne sont pas créés ou sont créés avec le mauvais rôle

---

## 🎯 SECTION 2: LOGIQUE DES RÔLES (SYSTÈME COMPLET)

### 2.1 Définition des Rôles

#### 🔵 Rôles CRM (Accès /auth/login UNIQUEMENT)

| Rôle DB | Rôle UI | Permissions | Accès |
|---------|---------|-------------|-------|
| `owner` | "Owner" | Toutes | CRM uniquement |
| `admin` | "Admin" | Presque toutes | CRM uniquement |
| `manager` | "Manager" | Gestion équipe, jobs | CRM uniquement |
| `backoffice` | "Backoffice" | Admin, factures | CRM uniquement |

#### 🟢 Rôle Employé (Accès /employee/login UNIQUEMENT)

| Rôle DB | Rôle UI | Permissions | Accès |
|---------|---------|-------------|-------|
| `employe_terrain` | "Employé terrain" | Ses interventions | App employé uniquement |

### 2.2 Règles de Connexion

```
┌─────────────────────────────────────────────────────────┐
│  RÔLE              │  /auth/login  │  /employee/login   │
├─────────────────────────────────────────────────────────┤
│  owner             │      ✅       │       ❌           │
│  admin             │      ✅       │       ❌           │
│  manager           │      ✅       │       ❌           │
│  backoffice        │      ✅       │       ❌           │
│  employe_terrain   │      ❌       │       ✅           │
└─────────────────────────────────────────────────────────┘
```

### 2.3 Stockage des Rôles

**Table `user_roles`**:
```sql
user_id    | company_id | role
-----------|------------|------------------
uuid-1     | company-A  | admin          ← Rôle DB (minuscules)
uuid-2     | company-A  | employe_terrain
uuid-3     | company-A  | owner
```

**Table `equipe`**:
```sql
id     | nom          | role              | user_id | company_id
-------|--------------|-------------------|---------|------------
id-1   | Test Admin   | Admin             | uuid-1  | company-A  ← Rôle UI
id-2   | Test Employé | Employé terrain   | uuid-2  | company-A
id-3   | Test Owner   | Owner             | uuid-3  | company-A
```

**IMPORTANT**:
- Table `equipe`: Rôle UI (avec majuscules, espaces)
- Table `user_roles`: Rôle DB (minuscules, underscores)
- L'edge function fait le mapping automatiquement

---

## 🛠️ SECTION 3: EDGE FUNCTION - DÉPLOIEMENT PROPRE

### 3.1 Vérification du Code

**Fichier**: `supabase/functions/create-employee-account/index.ts`

Le code est déjà correct et fait:

1. ✅ Authentification de l'appelant
2. ✅ Vérification des permissions (owner/admin/manager)
3. ✅ Récupération du rôle depuis `equipe`
4. ✅ Mapping UI → DB
5. ✅ Création user Auth avec `email_confirm: true`
6. ✅ Update `equipe` avec `user_id`
7. ✅ Insert `user_roles` avec bon rôle
8. ✅ Retour des données au frontend

### 3.2 Commande de Déploiement

**IMPORTANT**: Utilisez le BON Project ID!

```bash
# Déployer l'edge function
supabase functions deploy create-employee-account --project-ref rryjcqcxhpccgzkhgdqr
```

### 3.3 Vérification du Déploiement

Après déploiement, vérifiez:

```bash
# Lister les fonctions
supabase functions list --project-ref rryjcqcxhpccgzkhgdqr
```

Vous devez voir:
```
create-employee-account
```

### 3.4 Secrets Automatiques

Les secrets suivants sont **AUTOMATIQUEMENT** injectés par Supabase:

- `SUPABASE_URL`: URL de votre projet
- `SUPABASE_SERVICE_ROLE_KEY`: Clé admin

**Pas de configuration manuelle nécessaire**.

---

## 📋 SECTION 4: CONFIGURATION SUPABASE

### 4.1 Tables à Vérifier

#### Table `user_roles`

**Aller sur**: Dashboard Supabase → Table Editor → user_roles

**Colonnes requises**:
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

**Valeurs possibles pour `role`**:
- `owner`
- `admin`
- `manager`
- `backoffice`
- `employe_terrain`

#### Table `equipe`

**Colonnes requises**:
```sql
CREATE TABLE equipe (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nom TEXT NOT NULL,
  role TEXT NOT NULL,  -- Valeurs UI: "Owner", "Admin", etc.
  email TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  phone TEXT,
  status TEXT,
  app_access_status TEXT,  -- 'active', 'none', 'suspended'
  competences TEXT[],
  note TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

#### Table `companies`

**Colonnes requises**:
```sql
CREATE TABLE companies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  owner_id UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4.2 Politiques RLS (Row Level Security)

#### Politique pour `user_roles`

```sql
-- SELECT: Voir son propre rôle
CREATE POLICY "Users can view their own role"
ON user_roles FOR SELECT
USING (user_id = auth.uid());

-- INSERT: Seul service_role peut insérer (via edge function)
-- Pas de policy publique pour INSERT
```

#### Politique pour `equipe`

```sql
-- SELECT: Voir l'équipe de sa company
CREATE POLICY "Users can view equipe from their company"
ON equipe FOR SELECT
USING (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
  )
);

-- INSERT: Créer des membres dans sa company
CREATE POLICY "Users can insert equipe in their company"
ON equipe FOR INSERT
WITH CHECK (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
  )
);

-- UPDATE: Modifier l'équipe de sa company
CREATE POLICY "Users can update equipe in their company"
ON equipe FOR UPDATE
USING (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
  )
);

-- DELETE: Supprimer des membres de sa company
CREATE POLICY "Users can delete equipe in their company"
ON equipe FOR DELETE
USING (
  company_id IN (
    SELECT company_id FROM user_roles
    WHERE user_id = auth.uid()
  )
);
```

### 4.3 Triggers

#### Trigger `handle_new_user`

Ce trigger s'exécute lors du signup normal (pas via `admin.createUser`):

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
  new_company_id UUID;
BEGIN
  -- Si c'est un employé créé via admin.createUser, ne rien faire
  IF (NEW.raw_user_meta_data->>'is_employee')::boolean = true THEN
    RETURN NEW;
  END IF;

  -- Créer une company pour le nouveau owner
  INSERT INTO companies (name, owner_id)
  VALUES ('Ma Company', NEW.id)
  RETURNING id INTO new_company_id;

  -- Créer le rôle owner
  INSERT INTO user_roles (user_id, company_id, role)
  VALUES (NEW.id, new_company_id, 'owner');

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attacher le trigger
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();
```

**IMPORTANT**: Ce trigger vérifie `is_employee: true` pour ne PAS créer de company pour les employés.

### 4.4 Vérification dans Supabase Dashboard

#### Étape 1: Vérifier les Tables

1. Dashboard → **Table Editor**
2. Vérifier que les tables existent:
   - ✅ `user_roles`
   - ✅ `equipe`
   - ✅ `companies`

#### Étape 2: Vérifier les Politiques RLS

1. Dashboard → **Database** → **Policies**
2. Pour chaque table, vérifier qu'il existe des policies
3. Noter les noms des policies

#### Étape 3: Vérifier les Triggers

1. Dashboard → **Database** → **Functions**
2. Chercher `handle_new_user`
3. Vérifier qu'il contient le check `is_employee`

#### Étape 4: Vérifier l'Edge Function

1. Dashboard → **Edge Functions**
2. Cliquer sur `create-employee-account`
3. Onglet **Logs** → vérifier les derniers logs

---

## ✅ SECTION 5: PLAN DE TEST COMPLET

### Test 1: Créer un Employé Terrain

#### Étape 1: Créer dans la table `equipe`

1. Connectez-vous au CRM en tant qu'Owner
2. Allez dans **Équipe** (`/equipe`)
3. Cliquez **"Inviter un employé"**
4. Remplissez:
   - Nom: `Test Employé Terrain`
   - Email: `employe.test@example.com`
   - Rôle: **Employé terrain (App uniquement)**
5. Cliquez **"Inviter"**

**Vérification**:
- ✅ Une ligne est créée dans la table `equipe`
- ✅ `role` = `"Employé terrain"` (UI)
- ✅ `user_id` = `NULL` (pas encore de compte Auth)

#### Étape 2: Créer l'accès

1. Dans la liste, trouvez `Test Employé Terrain`
2. Cliquez **"Créer un accès à l'application"** (icône smartphone)
3. Choisissez **"Générer un mot de passe temporaire"**
4. Cliquez **"Créer l'accès"**

#### Étape 3: Vérifier le Modal

Le modal doit afficher:

```
✅ Compte créé avec succès dans Supabase Auth!

Email de connexion:
employe.test@example.com

Mot de passe temporaire:
Xyz123Abc!@# (exemple)

🔐 Page de connexion à utiliser:
Cet employé doit se connecter sur l'application employé:
https://votre-site.com/employee/login

[📋 Copier l'URL de connexion]
```

**IMPORTANT**: Copiez le mot de passe!

#### Étape 4: Logs Console (F12)

Ouvrez la console (F12) et cherchez:

```
Response from edge function: { data: {...} }
Edge function response data: {
  success: true,
  userId: "...",
  temporaryPassword: "...",
  role: "employe_terrain",  ← DOIT être "employe_terrain"
  email: "employe.test@example.com"
}
```

#### Étape 5: Vérifier Supabase Dashboard

**5.1 Auth → Users**:
- ✅ `employe.test@example.com` existe
- ✅ Email Confirmed = `true`
- ✅ Provider = `email`

**5.2 Table `user_roles`**:
```sql
user_id              | company_id  | role
---------------------|-------------|------------------
uuid-employe-test    | your-co-id  | employe_terrain  ← IMPORTANT!
```

**5.3 Table `equipe`**:
```sql
id   | nom                    | role              | user_id           | app_access_status
-----|------------------------|-------------------|-------------------|------------------
...  | Test Employé Terrain   | Employé terrain   | uuid-employe-test | active
```

#### Étape 6: Logs Edge Function

Dashboard → **Edge Functions** → **create-employee-account** → **Logs**

Cherchez (du plus récent):
```
📥 Received request data: { employeeId: "...", email: "employe.test@example.com", ... }
🎭 Role mapping: {
  employeeUIRole: "Employé terrain",
  mappedDBRole: "employe_terrain",  ← VÉRIFIER ICI
  ...
}
✅ Validation passed, creating user account...
User created: uuid-employe-test
✅ Equipe updated with user_id: uuid-employe-test
✅ User role created successfully: employe_terrain
```

#### Étape 7: Test de Connexion - App Employé (DOIT MARCHER)

1. Ouvrez `/employee/login`
2. Entrez:
   - Email: `employe.test@example.com`
   - Mot de passe: Le mot de passe temporaire copié
3. Cliquez **"Se connecter"**

**Résultat attendu**:
- ✅ Toast: "Connexion réussie"
- ✅ Redirection vers `/employee` (dashboard employé)

**Console (F12)**:
```
Role found: employe_terrain
✅ Employee access granted
```

#### Étape 8: Test de Connexion - CRM (DOIT ÉCHOUER)

1. **DÉCONNECTEZ-VOUS** d'abord
2. Ouvrez `/auth/login` (login CRM)
3. Entrez les MÊMES identifiants
4. Cliquez **"Se connecter"**

**Résultat attendu**:
- ❌ Toast (5 secondes): "Ce compte est réservé à l'application employé. Veuillez utiliser la page de connexion employé."
- ❌ Déconnexion automatique
- ❌ Pas d'accès au CRM

**Console (F12)**:
```
Role found: employe_terrain
❌ Employee account attempted CRM login - BLOCKING
```

---

### Test 2: Créer un Admin CRM

#### Étape 1: Créer dans `equipe`

1. Connectez-vous au CRM en tant qu'Owner
2. **Équipe** → **"Inviter un employé"**
3. Remplissez:
   - Nom: `Test Admin CRM`
   - Email: `admin.test@example.com`
   - Rôle: **Admin (CRM + App optionnel)**
4. Cliquez **"Inviter"**

#### Étape 2: Créer l'accès

1. Trouvez `Test Admin CRM`
2. **"Créer un accès à l'application"**
3. **"Générer un mot de passe temporaire"**
4. **"Créer l'accès"**

#### Étape 3: Vérifier le Modal

```
✅ Compte créé avec succès dans Supabase Auth!

Email de connexion:
admin.test@example.com

Mot de passe temporaire:
Abc456Def!@# (exemple)

🔐 Page de connexion à utiliser:
Cet employé doit se connecter sur le CRM (pas l'app employé):
https://votre-site.com/auth/login

[📋 Copier l'URL de connexion]
```

#### Étape 4: Logs Console

```
Edge function response data: {
  success: true,
  userId: "...",
  temporaryPassword: "...",
  role: "admin",  ← DOIT être "admin" (PAS "employe_terrain")
  email: "admin.test@example.com"
}
```

#### Étape 5: Vérifier Supabase Dashboard

**Table `user_roles`**:
```sql
user_id           | company_id  | role
------------------|-------------|-------
uuid-admin-test   | your-co-id  | admin  ← IMPORTANT! (pas employe_terrain)
```

**Table `equipe`**:
```sql
nom              | role   | user_id         | app_access_status
-----------------|--------|-----------------|------------------
Test Admin CRM   | Admin  | uuid-admin-test | none
```

#### Étape 6: Logs Edge Function

```
🎭 Role mapping: {
  employeeUIRole: "Admin",
  mappedDBRole: "admin",  ← VÉRIFIER ICI
  ...
}
✅ User role created successfully: admin
```

#### Étape 7: Test de Connexion - CRM (DOIT MARCHER)

1. Ouvrez `/auth/login`
2. Entrez:
   - Email: `admin.test@example.com`
   - Mot de passe: Le mot de passe temporaire
3. Cliquez **"Se connecter"**

**Résultat attendu**:
- ✅ Toast: "Connexion réussie"
- ✅ Redirection vers `/tableau-de-bord` (CRM)

**Console**:
```
Role found: admin
✅ CRM access granted for role: admin
Navigating to: /tableau-de-bord
```

#### Étape 8: Test de Connexion - App Employé (DOIT ÉCHOUER)

1. **DÉCONNECTEZ-VOUS**
2. Ouvrez `/employee/login`
3. Entrez les MÊMES identifiants

**Résultat attendu**:
- ❌ Toast (5 secondes): "Ce compte est réservé au CRM. Veuillez utiliser la page de connexion CRM à /auth/login."
- ❌ Déconnexion automatique

**Console**:
```
Role found: admin
❌ Non-employee account attempted employee login - BLOCKING
Account role: admin - Should use CRM login instead
```

---

## 🔧 SECTION 6: RÉSOLUTION DE PROBLÈMES

### Problème 1: "Role found: employe_terrain" pour un Admin

**Cause**: L'edge function n'est pas déployée ou utilise l'ancienne version.

**Solution**:
```bash
# Re-déployer
supabase functions deploy create-employee-account --project-ref rryjcqcxhpccgzkhgdqr

# Vérifier
supabase functions list --project-ref rryjcqcxhpccgzkhgdqr
```

### Problème 2: L'utilisateur n'apparaît pas dans Auth → Users

**Cause**: Erreur dans l'edge function.

**Solution**:
1. Dashboard → Edge Functions → create-employee-account → **Logs**
2. Chercher les erreurs en rouge
3. Lire le message d'erreur exactement
4. Cas courants:
   - "User already exists" → Supprimer l'ancien user
   - "Permission denied" → Vérifier les RLS
   - "Column not found" → Vérifier le schéma de la table

### Problème 3: Tous les rôles sont "employe_terrain"

**Cause**: Le rôle dans la table `equipe` n'est pas correctement mappé.

**Solution**:
1. Vérifier dans la table `equipe` que le rôle est bien:
   - `"Owner"` (avec majuscule)
   - `"Admin"` (avec majuscule)
   - `"Employé terrain"` (avec espace et accent)
2. Si incorrect, corriger manuellement:
   ```sql
   UPDATE equipe
   SET role = 'Admin'
   WHERE email = 'admin.test@example.com';
   ```
3. Re-créer l'accès (supprimer l'ancien user Auth d'abord)

### Problème 4: "Identifiants incorrects" avec le bon mot de passe

**Causes possibles**:
1. Mot de passe mal copié → Re-copier depuis le modal
2. Email avec espace → Vérifier l'email exact
3. Mauvaise page de connexion → Vérifier le rôle et l'URL

**Solution**:
1. Vérifier dans Auth → Users que l'email est confirmé
2. Essayer de reset le password depuis Supabase Dashboard
3. Vérifier les logs de login dans la console (F12)

---

## 📦 SECTION 7: INSTRUCTIONS FINALES DE DÉPLOIEMENT

### Étape 1: Pull les derniers changements

```bash
cd /home/user/provia-glass-crm

# Récupérer les dernières modifications
git pull origin claude/project-analysis-bug-plan-01X26yuRYoBmw6933UHhfc3E
```

### Étape 2: Installer Supabase CLI (si pas déjà fait)

```bash
# Via npm
npm install -g supabase

# Vérifier l'installation
supabase --version
```

### Étape 3: Login Supabase

```bash
supabase login
```

Cela va ouvrir un navigateur pour vous authentifier.

### Étape 4: Lier le projet

```bash
supabase link --project-ref rryjcqcxhpccgzkhgdqr
```

### Étape 5: Déployer l'Edge Function

```bash
supabase functions deploy create-employee-account --project-ref rryjcqcxhpccgzkhgdqr
```

**Résultat attendu**:
```
Deploying create-employee-account (project ref: rryjcqcxhpccgzkhgdqr)
Bundled create-employee-account size: 1.2KB
Deployed create-employee-account to https://rryjcqcxhpccgzkhgdqr.supabase.co/functions/v1/create-employee-account
```

### Étape 6: Vérifier le déploiement

```bash
supabase functions list --project-ref rryjcqcxhpccgzkhgdqr
```

Vous devez voir:
```
NAME                       STATUS    CREATED_AT               UPDATED_AT               VERSION
create-employee-account    ACTIVE    2025-XX-XX XX:XX:XX     2025-XX-XX XX:XX:XX      XX
```

---

## ✅ CHECKLIST FINALE

Avant de considérer le système fonctionnel, cochez toutes ces cases:

### Configuration Supabase
- [ ] Project ID correct: `rryjcqcxhpccgzkhgdqr`
- [ ] Supabase CLI installé et login OK
- [ ] Projet lié avec `supabase link`
- [ ] Edge function déployée avec succès
- [ ] Tables `user_roles`, `equipe`, `companies` existent
- [ ] Politiques RLS vérifiées
- [ ] Trigger `handle_new_user` vérifié avec check `is_employee`

### Test Employé Terrain
- [ ] Compte créé via "Créer un accès"
- [ ] Modal affiche URL `/employee/login`
- [ ] Utilisateur existe dans Auth → Users
- [ ] `user_roles.role` = `'employe_terrain'`
- [ ] `equipe.user_id` rempli
- [ ] `equipe.app_access_status` = `'active'`
- [ ] Connexion OK sur `/employee/login`
- [ ] Connexion BLOQUÉE sur `/auth/login` avec message clair
- [ ] Logs edge function montrent `employe_terrain`

### Test Admin/Owner CRM
- [ ] Compte créé via "Créer un accès"
- [ ] Modal affiche URL `/auth/login`
- [ ] Utilisateur existe dans Auth → Users
- [ ] `user_roles.role` = `'admin'` (ou `'owner'`, `'manager'`)
- [ ] `equipe.user_id` rempli
- [ ] `equipe.app_access_status` = `'none'`
- [ ] Connexion OK sur `/auth/login`
- [ ] Connexion BLOQUÉE sur `/employee/login` avec message clair
- [ ] Logs edge function montrent le bon rôle (pas `employe_terrain`)

### Logs et Débogage
- [ ] Console (F12) affiche les logs de création
- [ ] Console affiche les logs de login avec rôle
- [ ] Supabase Functions Logs affichent les logs `🎭 Role mapping`
- [ ] Aucune erreur dans Supabase Functions Logs
- [ ] Aucune erreur dans la console navigateur

---

## 🎯 CONFIRMATION FINALE

Une fois TOUTES les cases cochées:

✅ **Le système est 100% fonctionnel**

- Les employés terrain accèdent uniquement à l'app employé
- Les rôles CRM accèdent uniquement au CRM
- Les comptes sont créés dans Supabase Auth
- Les rôles sont correctement assignés
- Les messages d'erreur sont clairs
- Le multi-tenant fonctionne (company_id)

---

## 📞 SUPPORT

Si après avoir suivi ce guide, quelque chose ne fonctionne pas:

1. **Vérifier les logs dans cet ordre**:
   - Console navigateur (F12)
   - Supabase Functions Logs
   - Supabase Auth Logs
   - Table Editor (user_roles, equipe)

2. **Vérifier que l'edge function est déployée**:
   ```bash
   supabase functions list --project-ref rryjcqcxhpccgzkhgdqr
   ```

3. **Re-déployer si nécessaire**:
   ```bash
   supabase functions deploy create-employee-account --project-ref rryjcqcxhpccgzkhgdqr
   ```

4. **Consulter les sections de dépannage** dans ce guide

---

**Date de création**: 2025-11-22
**Project ID**: `rryjcqcxhpccgzkhgdqr`
**Version**: 1.0 (Clean Deployment)
