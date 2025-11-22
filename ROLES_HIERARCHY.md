# Système Hiérarchique des Rôles - Provia Glass CRM

## Vue d'ensemble

Le système utilise une hiérarchie de rôles stricte pour séparer l'accès entre le CRM (gestion) et l'Application Employé (terrain).

## Règles Fondamentales

### 🔐 Principe de base
- **Employé terrain** = UNIQUEMENT l'application mobile/employé
- **Tous les autres rôles** (Owner, Admin, Manager, Backoffice) = UNIQUEMENT le CRM (par défaut)

### 📱 Pages de connexion
- `/auth/login` - Page de connexion CRM (Owner, Admin, Manager, Backoffice)
- `/employee/login` - Page de connexion Application Employé (Employé terrain uniquement)

## Hiérarchie des Rôles

### 1. Owner (Propriétaire)
- **Accès**: CRM complet
- **Permissions**: Toutes les permissions (gestion complète)
- **Connexion**: `/auth/login`
- **Peut créer**: Tous les types de membres
- **App Employé**: Optionnel (peut être activé si nécessaire)

### 2. Admin (Administrateur)
- **Accès**: CRM complet
- **Permissions**: Presque toutes les permissions
- **Connexion**: `/auth/login`
- **Peut créer**: Tous les types de membres
- **App Employé**: Optionnel (peut être activé si nécessaire)

### 3. Manager
- **Accès**: CRM avec restrictions possibles
- **Permissions**: Gestion d'équipe, devis, planning, jobs
- **Connexion**: `/auth/login`
- **Peut créer**: Tous les types de membres
- **App Employé**: Optionnel (peut être activé si nécessaire)

### 4. Backoffice
- **Accès**: CRM avec restrictions (pas d'accès terrain)
- **Permissions**: Administration, factures, paiements
- **Connexion**: `/auth/login`
- **Peut créer**: Non (sauf si permissions spéciales)
- **App Employé**: Optionnel (peut être activé si nécessaire)

### 5. Employé terrain
- **Accès**: Application Employé UNIQUEMENT
- **Permissions**: Voir et gérer uniquement ses propres interventions
- **Connexion**: `/employee/login`
- **Peut créer**: Rien
- **CRM**: JAMAIS

## Isolation Multi-tenant

### Principe de company_id
Tous les membres sont isolés par `company_id`:
- Un employé de la Company A ne voit JAMAIS les données de la Company B
- Toutes les requêtes filtrent par `company_id`
- Les notifications sont filtrées par `company_id` ET `employee_id`

### Tables concernées
- `equipe` - Tous les membres (avec leur company_id)
- `user_roles` - Rôle de chaque utilisateur (avec company_id)
- `jobs`, `devis`, `factures`, etc. - Toutes les données métier (avec company_id)

## Flux de Création de Membre

### Étape 1: Création dans le CRM
1. Owner/Admin/Manager va dans `/equipe`
2. Clique sur "Inviter un employé"
3. Remplit le formulaire avec le rôle souhaité
4. Système génère un mot de passe temporaire de 12 caractères

### Étape 2: Edge Function
1. Crée l'utilisateur Supabase Auth avec `email_confirm: true`
2. Insère dans la table `equipe` avec le `company_id` du créateur
3. Insère dans `user_roles` avec le rôle correct et le `company_id`
4. Pour Employé terrain: `app_access_status = 'active'`
5. Pour autres rôles: `app_access_status = 'none'` (par défaut)

### Étape 3: Affichage du mot de passe
Le système affiche un modal avec:
- L'email de connexion
- Le mot de passe temporaire (à copier)
- **L'URL de connexion correcte selon le rôle:**
  - Employé terrain → `/employee/login`
  - Autres rôles → `/auth/login`

## Logique de Vérification à la Connexion

### CRM Login (`/auth/login`)
```typescript
// Après authentification réussie
const userRole = await getUserRole(userId);

if (userRole === 'employe_terrain') {
  // BLOQUER - Mauvaise page de connexion
  toast.error("Identifiants incorrects");
  signOut();
}
// Sinon, autoriser l'accès au CRM
```

### Employee Login (`/employee/login`)
```typescript
// Après authentification réussie
const userRole = await getUserRole(userId);

if (userRole !== 'employe_terrain') {
  // BLOQUER - Mauvaise page de connexion
  toast.error("Identifiants incorrects");
  signOut();
}
// Sinon, autoriser l'accès à l'app employé
```

## Cas d'Usage

### Cas 1: Créer un Admin CRM
1. Rôle: Admin
2. Le membre reçoit:
   - Email: admin@example.com
   - Mot de passe: xyz123ABC!@#
   - URL: `https://votre-crm.com/auth/login`
3. Il se connecte sur `/auth/login` (CRM)
4. Il a accès au CRM complet
5. Il NE PEUT PAS se connecter sur `/employee/login`

### Cas 2: Créer un Employé Terrain
1. Rôle: Employé terrain
2. Le membre reçoit:
   - Email: employee@example.com
   - Mot de passe: abc789XYZ#$%
   - URL: `https://votre-crm.com/employee/login`
3. Il se connecte sur `/employee/login` (App)
4. Il voit uniquement ses interventions
5. Il NE PEUT PAS se connecter sur `/auth/login` (CRM)

### Cas 3: Admin avec accès App Employé (optionnel)
1. Créer normalement un Admin
2. Après création, aller dans l'onglet "Accès App" du membre
3. Activer l'accès à l'application employé
4. `app_access_status` passe de 'none' à 'active'
5. Le membre peut maintenant se connecter sur les DEUX:
   - `/auth/login` pour gérer le CRM
   - `/employee/login` pour voir le terrain

## Dépannage

### "Identifiants incorrects" alors que le mot de passe est correct

**Cause**: Connexion sur la mauvaise page

**Solution**:
1. Vérifier le rôle du compte dans Supabase Dashboard → Table Editor → user_roles
2. Si rôle = 'employe_terrain' → utiliser `/employee/login`
3. Si rôle = autre → utiliser `/auth/login`

### Un Admin peut se connecter sur l'app employé

**Cause**: Le rôle dans `user_roles` est 'employe_terrain' au lieu de 'admin'

**Solution**:
1. Vérifier les logs dans la console (F12) lors de la création
2. Chercher le log `🎭 Role determination` dans Supabase Functions Logs
3. Vérifier que le rôle passé est correct
4. Supprimer le membre et le recréer avec le bon rôle
5. Ou corriger manuellement dans la table `user_roles`

### Edge function retourne une erreur

**Vérifications**:
1. Edge function déployée: `supabase functions deploy create-employee-account`
2. Logs Supabase Functions pour voir l'erreur exacte
3. Console navigateur pour voir la requête envoyée
4. Vérifier que le token d'authentification est valide

## Tables de la Base de Données

### user_roles
```sql
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id),
  role TEXT, -- 'owner', 'admin', 'manager', 'backoffice', 'employe_terrain'
  created_at TIMESTAMP
);
```

### equipe
```sql
CREATE TABLE equipe (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  company_id UUID REFERENCES companies(id),
  nom TEXT,
  email TEXT,
  role TEXT, -- Version UI: "Owner", "Admin", etc.
  app_access_status TEXT, -- 'none', 'active', 'suspended'
  status TEXT,
  ...
);
```

## Notes Importantes

⚠️ **JAMAIS** créer un membre avec le mauvais rôle - c'est irréversible sans intervention manuelle dans la DB

⚠️ **TOUJOURS** vérifier que l'edge function est déployée avant de créer des membres

⚠️ **TOUJOURS** communiquer la bonne URL de connexion au nouveau membre selon son rôle

✅ Le système affiche maintenant automatiquement la bonne URL dans le modal de mot de passe temporaire
