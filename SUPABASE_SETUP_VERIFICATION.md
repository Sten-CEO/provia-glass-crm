# Guide de Configuration et Vérification Supabase

Ce document explique comment configurer Supabase et vérifier que le système de création de comptes fonctionne correctement.

---

## 🔧 À FAIRE À LA MAIN DANS SUPABASE

### 1. Configuration des Secrets Edge Functions

Les Edge Functions nécessitent deux secrets qui sont **automatiquement disponibles** dans l'environnement Supabase:

#### Secrets requis:
- `SUPABASE_URL` - URL de votre projet Supabase (fourni automatiquement)
- `SUPABASE_SERVICE_ROLE_KEY` - Clé de service avec privilèges admin (fourni automatiquement)

#### Où les trouver (pour vérification):
1. Allez sur [dashboard.supabase.com](https://dashboard.supabase.com)
2. Sélectionnez votre projet
3. Allez dans **Settings** → **API**
4. Vous verrez:
   - **Project URL**: C'est votre `SUPABASE_URL`
   - **service_role secret**: C'est votre `SUPABASE_SERVICE_ROLE_KEY` (⚠️ À NE JAMAIS EXPOSER CÔTÉ CLIENT!)

**Note**: Ces secrets sont injectés automatiquement dans les Edge Functions, vous n'avez rien à configurer manuellement.

---

### 2. Déploiement de l'Edge Function

L'Edge Function `create-employee-account` DOIT être déployée pour fonctionner.

#### Option A: Déploiement via Supabase CLI (recommandé)

```bash
# 1. Installer Supabase CLI
npm install -g supabase

# 2. Se connecter
supabase login

# 3. Lier votre projet
supabase link --project-ref orsshwehenldhlvrhfin

# 4. Déployer la fonction
supabase functions deploy create-employee-account
```

#### Option B: Déploiement via Dashboard Supabase

1. Allez sur [dashboard.supabase.com](https://dashboard.supabase.com)
2. Votre projet → **Edge Functions**
3. Cliquez sur **New Function** ou sélectionnez `create-employee-account`
4. Copiez le contenu de `supabase/functions/create-employee-account/index.ts`
5. Collez dans l'éditeur
6. Cliquez sur **Deploy**

#### Vérifier le déploiement:

```bash
supabase functions list
```

Vous devriez voir `create-employee-account` dans la liste.

---

### 3. Vérification des Politiques RLS (Row Level Security)

Les politiques RLS garantissent l'isolation multi-tenant. Voici les politiques importantes:

#### Tables concernées:
- `equipe`
- `user_roles`
- `companies`
- `jobs`, `clients`, `devis`, `factures`, etc.

#### Vérifier les politiques:

1. Allez sur dashboard.supabase.com → **Database** → **Policies**
2. Pour chaque table, vérifiez qu'il y a des politiques avec `company_id`:

**Exemple pour `equipe`**:
```sql
-- Policy pour SELECT
CREATE POLICY "Users can view equipe from their company"
ON equipe FOR SELECT
USING (company_id = (
  SELECT company_id FROM user_roles
  WHERE user_id = auth.uid()
));

-- Policy pour INSERT
CREATE POLICY "Users can insert equipe in their company"
ON equipe FOR INSERT
WITH CHECK (company_id = (
  SELECT company_id FROM user_roles
  WHERE user_id = auth.uid()
));
```

**Exemple pour `user_roles`**:
```sql
-- Policy pour SELECT
CREATE POLICY "Users can view their own role"
ON user_roles FOR SELECT
USING (user_id = auth.uid());
```

#### Comment créer/vérifier les policies:

```bash
# Via CLI
supabase db pull  # Récupère les migrations actuelles

# Ou via Dashboard
# Database → Policies → Sélectionner la table → Voir les policies existantes
```

---

### 4. Vérification des Triggers

Les triggers automatisent certaines actions comme la création de `company_id`.

#### Trigger important: `handle_new_user`

Ce trigger est appelé automatiquement lors d'une inscription normale (`signUp`), mais **PAS** lors de `admin.createUser` (ce qui est voulu pour éviter de créer une company pour chaque employé).

Vérifier le trigger:

1. Dashboard → **Database** → **Functions**
2. Chercher `handle_new_user`
3. Vérifier qu'il contient quelque chose comme:

```sql
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Ne pas créer de company si is_employee est true
  IF (NEW.raw_user_meta_data->>'is_employee')::boolean = true THEN
    RETURN NEW;
  END IF;

  -- Créer une company pour les nouveaux owners
  INSERT INTO companies (name, owner_id)
  VALUES ('Ma Company', NEW.id);

  -- Créer le rôle owner
  INSERT INTO user_roles (user_id, company_id, role)
  SELECT NEW.id, id, 'owner'
  FROM companies
  WHERE owner_id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

#### Trigger: `set_company_id`

Ce trigger peut être utilisé pour automatiquement set le `company_id` sur les nouvelles lignes.

---

## ✅ VÉRIFICATION ÉTAPE PAR ÉTAPE

### Test 1: Créer un Employé Terrain depuis le CRM

#### Étape 1: Créer l'employé dans la table `equipe`
1. Connectez-vous au CRM en tant qu'Owner/Admin
2. Allez dans **Équipe** (`/equipe`)
3. Cliquez sur **"Inviter un employé"**
4. Remplissez:
   - Nom: **Test Employé**
   - Email: **test.employe@example.com**
   - Rôle: **Employé terrain**
5. Cliquez sur **Inviter**

Cela crée une entrée dans la table `equipe` SANS `user_id` (car pas encore de compte Auth).

#### Étape 2: Créer l'accès à l'application
1. Dans la liste des employés, trouvez **Test Employé**
2. Cliquez sur **"Créer un accès à l'application"** (bouton avec icône smartphone)
3. Choisissez **"Générer un mot de passe temporaire"**
4. Cliquez sur **"Créer l'accès"**

#### Étape 3: Vérifier dans Supabase Dashboard

##### 3.1 Vérifier Auth → Users
1. Dashboard → **Authentication** → **Users**
2. **Vous DEVEZ voir** `test.employe@example.com` dans la liste
3. Vérifier:
   - ✅ **Email Confirmed**: Oui (doit être vert)
   - ✅ **Provider**: Email
   - ✅ **Created**: Aujourd'hui

**Si l'utilisateur n'apparaît PAS**:
- ❌ L'edge function n'a pas été déployée → Déployer la fonction
- ❌ Il y a eu une erreur → Vérifier les logs

##### 3.2 Vérifier Table `user_roles`
1. Dashboard → **Table Editor** → **user_roles**
2. Trouvez la ligne avec `user_id` correspondant à `test.employe@example.com`
3. Vérifier:
   - ✅ `role` = **'employe_terrain'** (en minuscules avec underscore)
   - ✅ `company_id` = Votre company_id (doit correspondre à votre company)

**Si le role est incorrect**:
- ❌ Le rôle dans la table `equipe` n'est pas mappé correctement
- ❌ L'edge function n'a pas le bon mapping

##### 3.3 Vérifier Table `equipe`
1. Dashboard → **Table Editor** → **equipe**
2. Trouvez la ligne avec email = `test.employe@example.com`
3. Vérifier:
   - ✅ `user_id` = UUID du user créé (PAS NULL!)
   - ✅ `company_id` = Votre company_id
   - ✅ `app_access_status` = **'active'**
   - ✅ `status` = **'active'**
   - ✅ `role` = **'Employé terrain'** (UI role)

#### Étape 4: Tester la connexion Employé

1. Ouvrez `/employee/login`
2. Entrez:
   - Email: `test.employe@example.com`
   - Mot de passe: Le mot de passe temporaire copié
3. **Résultat attendu**: ✅ Connexion réussie → Redirection vers `/employee`

#### Étape 5: Tester le blocage CRM

1. Ouvrez `/auth/login` (page de connexion CRM)
2. Entrez les MÊMES identifiants:
   - Email: `test.employe@example.com`
   - Mot de passe: Le mot de passe temporaire
3. **Résultat attendu**: ❌ Message d'erreur clair:
   > "Ce compte est réservé à l'application employé. Veuillez utiliser la page de connexion employé."
4. ✅ Déconnexion automatique

#### Logs à vérifier (Console navigateur - F12):
```
📥 Received request data: { employeeId: "...", email: "test.employe@example.com", ... }
🎭 Role mapping: { employeeUIRole: "Employé terrain", mappedDBRole: "employe_terrain", ... }
✅ Validation passed, creating user account...
User created: [user_id]
✅ Equipe updated with user_id: [user_id]
✅ User role created successfully: employe_terrain
```

---

### Test 2: Créer un Admin depuis le CRM

#### Étape 1: Créer l'admin dans la table `equipe`
1. Connectez-vous au CRM en tant qu'Owner
2. Allez dans **Équipe**
3. Cliquez sur **"Inviter un employé"**
4. Remplissez:
   - Nom: **Test Admin**
   - Email: **test.admin@example.com**
   - Rôle: **Admin**
5. Cliquez sur **Inviter**

#### Étape 2: Créer l'accès
1. Cliquez sur **"Créer un accès à l'application"**
2. Générer un mot de passe temporaire
3. Cliquez sur **"Créer l'accès"**

#### Étape 3: Vérifier dans Supabase Dashboard

##### 3.1 Auth → Users
- ✅ `test.admin@example.com` existe
- ✅ Email confirmé

##### 3.2 Table `user_roles`
- ✅ `role` = **'admin'** (pas 'employe_terrain'!)
- ✅ `company_id` = Votre company_id

##### 3.3 Table `equipe`
- ✅ `user_id` rempli
- ✅ `app_access_status` = **'none'** (pas 'active' car c'est un admin CRM)
- ✅ `role` = **'Admin'** (UI role)

#### Étape 4: Tester la connexion CRM

1. Ouvrez `/auth/login`
2. Entrez les identifiants de l'admin
3. **Résultat attendu**: ✅ Connexion réussie → Accès au CRM

#### Étape 5: Tester le blocage App Employé

1. Ouvrez `/employee/login`
2. Entrez les MÊMES identifiants
3. **Résultat attendu**: ❌ Message d'erreur:
   > "Ce compte est réservé au CRM. Veuillez utiliser la page de connexion CRM à /auth/login."
4. ✅ Déconnexion automatique

#### Logs à vérifier:
```
🎭 Role mapping: { employeeUIRole: "Admin", mappedDBRole: "admin", ... }
✅ User role created successfully: admin
```

---

## 🔍 DÉPANNAGE

### Problème: L'utilisateur n'apparaît pas dans Auth → Users

**Causes possibles**:
1. ❌ Edge function pas déployée
2. ❌ Erreur lors de l'appel à `admin.createUser`
3. ❌ Secrets mal configurés

**Solution**:
1. Vérifier les **Edge Functions Logs**:
   - Dashboard → **Edge Functions** → **create-employee-account** → **Logs**
   - Chercher les erreurs
2. Vérifier que la fonction est déployée:
   ```bash
   supabase functions list
   ```
3. Re-déployer si nécessaire:
   ```bash
   supabase functions deploy create-employee-account
   ```

### Problème: Le rôle dans `user_roles` est toujours 'employe_terrain'

**Cause**:
- ❌ Le rôle dans la table `equipe` n'est pas correctement mappé

**Solution**:
1. Vérifier le rôle dans la table `equipe`:
   ```sql
   SELECT id, nom, email, role FROM equipe
   WHERE email = 'test.admin@example.com';
   ```
2. Le rôle doit être exactement:
   - `'Owner'` → mappé vers `'owner'`
   - `'Admin'` → mappé vers `'admin'`
   - `'Manager'` → mappé vers `'manager'`
   - `'Backoffice'` → mappé vers `'backoffice'`
   - `'Employé terrain'` → mappé vers `'employe_terrain'`

3. Si le rôle est incorrect, corriger manuellement:
   ```sql
   UPDATE equipe
   SET role = 'Admin'
   WHERE email = 'test.admin@example.com';
   ```

4. Supprimer le user Auth et recréer l'accès.

### Problème: "Identifiants incorrects" même avec le bon mot de passe

**Causes possibles**:
1. ❌ Mauvaise page de connexion
2. ❌ Email non confirmé
3. ❌ Mot de passe mal copié

**Solution**:
1. Vérifier dans Auth → Users que l'email est confirmé
2. Vérifier que vous utilisez la bonne page:
   - `employe_terrain` → `/employee/login`
   - Autres rôles → `/auth/login`
3. Copier-coller le mot de passe depuis le modal (ne pas le taper manuellement)

### Problème: "Employee belongs to a different company"

**Cause**:
- ❌ L'employé dans `equipe` a un `company_id` différent de celui de l'utilisateur qui crée l'accès

**Solution**:
1. Vérifier le company_id dans la table `equipe`:
   ```sql
   SELECT id, nom, email, company_id FROM equipe
   WHERE email = 'test.admin@example.com';
   ```
2. Vérifier le company_id de l'utilisateur connecté:
   ```sql
   SELECT user_id, company_id, role FROM user_roles
   WHERE user_id = auth.uid();
   ```
3. Les deux `company_id` doivent correspondre.

---

## 📊 CHECKLIST FINALE

Avant de considérer le système fonctionnel, cochez toutes ces cases:

### Configuration Supabase
- [ ] Edge function `create-employee-account` déployée
- [ ] Secrets `SUPABASE_URL` et `SUPABASE_SERVICE_ROLE_KEY` disponibles
- [ ] Politiques RLS vérifiées pour `equipe`, `user_roles`, etc.
- [ ] Trigger `handle_new_user` configuré avec gestion `is_employee`

### Test Employé Terrain
- [ ] Compte créé via "Créer un accès à l'application"
- [ ] Utilisateur visible dans Auth → Users
- [ ] Email confirmé automatiquement
- [ ] `user_roles` contient role = 'employe_terrain'
- [ ] `equipe` contient user_id + app_access_status = 'active'
- [ ] Connexion OK sur `/employee/login`
- [ ] Connexion BLOQUÉE sur `/auth/login` avec message clair

### Test Admin/Owner
- [ ] Compte créé via "Créer un accès à l'application"
- [ ] Utilisateur visible dans Auth → Users
- [ ] `user_roles` contient role = 'admin' (ou 'owner', 'manager')
- [ ] `equipe` contient user_id + app_access_status = 'none'
- [ ] Connexion OK sur `/auth/login`
- [ ] Connexion BLOQUÉE sur `/employee/login` avec message clair

### Logs et Debugging
- [ ] Logs edge function affichent le bon role mapping
- [ ] Console navigateur affiche les logs de création
- [ ] Aucune erreur dans Supabase Functions Logs
- [ ] Aucune erreur dans la console navigateur

---

## 📖 RESSOURCES

- [Documentation Supabase Auth Admin](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Documentation Edge Functions](https://supabase.com/docs/guides/functions)
- [Documentation RLS](https://supabase.com/docs/guides/auth/row-level-security)
- [CLI Supabase](https://supabase.com/docs/reference/cli/introduction)

---

## 🆘 SUPPORT

Si tous les tests échouent après avoir suivi ce guide:

1. Vérifier les logs à TOUS les niveaux:
   - Console navigateur (F12)
   - Supabase Functions Logs
   - Supabase Auth Logs
   - Table Editor (user_roles, equipe)

2. Consulter `ROLES_HIERARCHY.md` pour comprendre le système complet

3. Vérifier que l'edge function est bien déployée:
   ```bash
   supabase functions list
   ```

4. Re-déployer l'edge function:
   ```bash
   supabase functions deploy create-employee-account
   ```

5. Tester avec un nouvel employé (pas un existant) pour éviter les conflits
