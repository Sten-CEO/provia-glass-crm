# 🧪 TESTS AUTOMATISÉS - SYSTÈME D'AUTHENTIFICATION

**Project ID**: `rryjcqcxhpccgzkhgdqr`

Ce document fournit une liste de tests à effectuer pour vérifier que le système fonctionne correctement.

---

## 📋 PRÉREQUIS

Avant de commencer les tests:

- [ ] Edge function déployée: `supabase functions deploy create-employee-account --project-ref rryjcqcxhpccgzkhgdqr`
- [ ] Accès au CRM en tant qu'Owner
- [ ] Console navigateur ouverte (F12)
- [ ] Onglet Supabase Dashboard ouvert

---

## TEST #1: EMPLOYÉ TERRAIN

### Objectif
Vérifier qu'un employé terrain peut se connecter UNIQUEMENT sur `/employee/login`.

### Étapes

#### 1.1 Création dans `equipe`
- [ ] Aller sur `/equipe`
- [ ] Cliquer "Inviter un employé"
- [ ] Nom: `Test Employé 1`
- [ ] Email: `employe1@test.com`
- [ ] Rôle: **Employé terrain (App uniquement)**
- [ ] Cliquer "Inviter"

#### 1.2 Création de l'accès
- [ ] Cliquer "Créer un accès à l'application" (icône smartphone)
- [ ] Choisir "Générer un mot de passe temporaire"
- [ ] Cliquer "Créer l'accès"

#### 1.3 Vérifier le modal
- [ ] Message: "✅ Compte créé avec succès dans Supabase Auth!"
- [ ] Email affiché: `employe1@test.com`
- [ ] Mot de passe temporaire affiché
- [ ] Message: "Cet employé doit se connecter sur l'**application employé**"
- [ ] URL: `/employee/login`
- [ ] **COPIER LE MOT DE PASSE**

#### 1.4 Console (F12) - Données retournées
```javascript
// Chercher:
Edge function response data: {
  success: true,
  userId: "...",
  temporaryPassword: "...",
  role: "employe_terrain",  ← ATTENDU
  email: "employe1@test.com"
}
```
- [ ] `role` = `"employe_terrain"` ✅

#### 1.5 Supabase Dashboard - Auth → Users
- [ ] Aller sur Auth → Users
- [ ] Chercher `employe1@test.com`
- [ ] Email Confirmed: ✅ (vert)
- [ ] Provider: email

#### 1.6 Supabase Dashboard - Table `user_roles`
- [ ] Aller sur Table Editor → user_roles
- [ ] Chercher l'entrée avec email `employe1@test.com`
- [ ] Vérifier: `role` = `"employe_terrain"` ✅
- [ ] Vérifier: `company_id` = votre company_id

#### 1.7 Supabase Dashboard - Table `equipe`
- [ ] Aller sur Table Editor → equipe
- [ ] Chercher `Test Employé 1`
- [ ] Vérifier: `user_id` est rempli (pas NULL)
- [ ] Vérifier: `app_access_status` = `"active"`
- [ ] Vérifier: `role` = `"Employé terrain"` (UI)

#### 1.8 Edge Function Logs
- [ ] Aller sur Edge Functions → create-employee-account → Logs
- [ ] Chercher le log le plus récent
- [ ] Vérifier présence de:
```
📥 Received request data: { employeeId: "...", email: "employe1@test.com", ... }
🎭 Role mapping: {
  employeeUIRole: "Employé terrain",
  mappedDBRole: "employe_terrain",
  ...
}
✅ User role created successfully: employe_terrain
```

#### 1.9 Test Connexion - App Employé (DOIT MARCHER ✅)
- [ ] Ouvrir `/employee/login`
- [ ] Entrer email: `employe1@test.com`
- [ ] Entrer le mot de passe temporaire copié
- [ ] Cliquer "Se connecter"
- [ ] **Attendu**: Toast "Connexion réussie"
- [ ] **Attendu**: Redirection vers `/employee`
- [ ] Console: `Role found: employe_terrain`
- [ ] Console: `✅ Employee access granted`

#### 1.10 Test Connexion - CRM (DOIT ÉCHOUER ❌)
- [ ] **SE DÉCONNECTER D'ABORD**
- [ ] Ouvrir `/auth/login`
- [ ] Entrer les mêmes identifiants
- [ ] Cliquer "Se connecter"
- [ ] **Attendu**: Toast (5s) "Ce compte est réservé à l'application employé..."
- [ ] **Attendu**: Déconnexion automatique
- [ ] Console: `Role found: employe_terrain`
- [ ] Console: `❌ Employee account attempted CRM login - BLOCKING`

### Résultat Test #1
- [ ] ✅ Tous les sous-tests passés

---

## TEST #2: ADMIN CRM

### Objectif
Vérifier qu'un admin peut se connecter UNIQUEMENT sur `/auth/login`.

### Étapes

#### 2.1 Création dans `equipe`
- [ ] Aller sur `/equipe`
- [ ] Cliquer "Inviter un employé"
- [ ] Nom: `Test Admin 1`
- [ ] Email: `admin1@test.com`
- [ ] Rôle: **Admin (CRM + App optionnel)**
- [ ] Cliquer "Inviter"

#### 2.2 Création de l'accès
- [ ] Cliquer "Créer un accès à l'application"
- [ ] Choisir "Générer un mot de passe temporaire"
- [ ] Cliquer "Créer l'accès"

#### 2.3 Vérifier le modal
- [ ] Message: "✅ Compte créé avec succès dans Supabase Auth!"
- [ ] Email affiché: `admin1@test.com`
- [ ] Mot de passe temporaire affiché
- [ ] Message: "Cet employé doit se connecter sur le **CRM**"
- [ ] URL: `/auth/login`
- [ ] **COPIER LE MOT DE PASSE**

#### 2.4 Console (F12) - Données retournées
```javascript
Edge function response data: {
  success: true,
  userId: "...",
  temporaryPassword: "...",
  role: "admin",  ← ATTENDU (PAS "employe_terrain")
  email: "admin1@test.com"
}
```
- [ ] `role` = `"admin"` ✅

#### 2.5 Supabase Dashboard - Auth → Users
- [ ] Chercher `admin1@test.com`
- [ ] Email Confirmed: ✅
- [ ] Provider: email

#### 2.6 Supabase Dashboard - Table `user_roles`
- [ ] Chercher l'entrée avec email `admin1@test.com`
- [ ] Vérifier: `role` = `"admin"` ✅ (PAS `"employe_terrain"`)
- [ ] Vérifier: `company_id` = votre company_id

#### 2.7 Supabase Dashboard - Table `equipe`
- [ ] Chercher `Test Admin 1`
- [ ] Vérifier: `user_id` est rempli
- [ ] Vérifier: `app_access_status` = `"none"` (pas `"active"`)
- [ ] Vérifier: `role` = `"Admin"` (UI)

#### 2.8 Edge Function Logs
- [ ] Vérifier présence de:
```
🎭 Role mapping: {
  employeeUIRole: "Admin",
  mappedDBRole: "admin",  ← IMPORTANT
  ...
}
✅ User role created successfully: admin
```

#### 2.9 Test Connexion - CRM (DOIT MARCHER ✅)
- [ ] Ouvrir `/auth/login`
- [ ] Entrer email: `admin1@test.com`
- [ ] Entrer le mot de passe temporaire
- [ ] Cliquer "Se connecter"
- [ ] **Attendu**: Toast "Connexion réussie"
- [ ] **Attendu**: Redirection vers `/tableau-de-bord`
- [ ] Console: `Role found: admin`
- [ ] Console: `✅ CRM access granted for role: admin`

#### 2.10 Test Connexion - App Employé (DOIT ÉCHOUER ❌)
- [ ] **SE DÉCONNECTER**
- [ ] Ouvrir `/employee/login`
- [ ] Entrer les mêmes identifiants
- [ ] Cliquer "Se connecter"
- [ ] **Attendu**: Toast (5s) "Ce compte est réservé au CRM..."
- [ ] **Attendu**: Déconnexion automatique
- [ ] Console: `Role found: admin`
- [ ] Console: `❌ Non-employee account attempted employee login - BLOCKING`

### Résultat Test #2
- [ ] ✅ Tous les sous-tests passés

---

## TEST #3: OWNER CRM

### Objectif
Vérifier qu'un owner fonctionne comme un admin.

### Étapes

#### 3.1 Création
- [ ] Nom: `Test Owner 1`
- [ ] Email: `owner1@test.com`
- [ ] Rôle: **Owner (CRM + App optionnel)**

#### 3.2 Vérifications rapides
- [ ] Console: `role` = `"owner"`
- [ ] Table `user_roles`: `role` = `"owner"`
- [ ] Table `equipe`: `app_access_status` = `"none"`

#### 3.3 Connexions
- [ ] ✅ `/auth/login` → Accès CRM
- [ ] ❌ `/employee/login` → Bloqué

### Résultat Test #3
- [ ] ✅ Tous les tests passés

---

## TEST #4: MANAGER CRM

### Objectif
Vérifier qu'un manager fonctionne comme un admin.

### Étapes

#### 4.1 Création
- [ ] Nom: `Test Manager 1`
- [ ] Email: `manager1@test.com`
- [ ] Rôle: **Manager (CRM + App optionnel)**

#### 4.2 Vérifications rapides
- [ ] Console: `role` = `"manager"`
- [ ] Table `user_roles`: `role` = `"manager"`
- [ ] Table `equipe`: `app_access_status` = `"none"`

#### 4.3 Connexions
- [ ] ✅ `/auth/login` → Accès CRM
- [ ] ❌ `/employee/login` → Bloqué

### Résultat Test #4
- [ ] ✅ Tous les tests passés

---

## TEST #5: BACKOFFICE

### Objectif
Vérifier qu'un backoffice fonctionne comme un admin.

### Étapes

#### 5.1 Création
- [ ] Nom: `Test Backoffice 1`
- [ ] Email: `backoffice1@test.com`
- [ ] Rôle: **Backoffice (CRM + App optionnel)**

#### 5.2 Vérifications rapides
- [ ] Console: `role` = `"backoffice"`
- [ ] Table `user_roles`: `role` = `"backoffice"`
- [ ] Table `equipe`: `app_access_status` = `"none"`

#### 5.3 Connexions
- [ ] ✅ `/auth/login` → Accès CRM
- [ ] ❌ `/employee/login` → Bloqué

### Résultat Test #5
- [ ] ✅ Tous les tests passés

---

## TEST #6: MULTI-TENANT (ISOLATION)

### Objectif
Vérifier que deux companies sont bien isolées.

### Prérequis
- Avoir 2 companies différentes (Company A et Company B)

### Étapes

#### 6.1 Company A - Créer un employé
- [ ] Se connecter en tant qu'Owner de Company A
- [ ] Créer `Employé A` avec email `employeA@test.com`
- [ ] Noter le `company_id` de Company A

#### 6.2 Company B - Créer un employé
- [ ] Se connecter en tant qu'Owner de Company B
- [ ] Créer `Employé B` avec email `employeB@test.com`
- [ ] Noter le `company_id` de Company B

#### 6.3 Vérifier dans `user_roles`
- [ ] `employeA@test.com` a `company_id` = Company A
- [ ] `employeB@test.com` a `company_id` = Company B
- [ ] Les deux `company_id` sont DIFFÉRENTS

#### 6.4 Vérifier dans `equipe`
- [ ] `Employé A` a `company_id` = Company A
- [ ] `Employé B` a `company_id` = Company B

#### 6.5 Test d'isolation
- [ ] Se connecter en tant qu'Owner de Company A
- [ ] Aller sur `/equipe`
- [ ] Vérifier que seul `Employé A` est visible
- [ ] `Employé B` ne doit PAS être visible

### Résultat Test #6
- [ ] ✅ Isolation multi-tenant fonctionne

---

## RÉSUMÉ FINAL

### Checklist Globale

- [ ] Test #1: Employé terrain ✅
- [ ] Test #2: Admin CRM ✅
- [ ] Test #3: Owner CRM ✅
- [ ] Test #4: Manager CRM ✅
- [ ] Test #5: Backoffice ✅
- [ ] Test #6: Multi-tenant ✅

### Validation

Si TOUS les tests passent:

✅ **LE SYSTÈME EST 100% FONCTIONNEL**

Vous pouvez confirmer que:
- Les employés terrain accèdent uniquement à l'app employé
- Les rôles CRM accèdent uniquement au CRM
- Les comptes sont créés correctement dans Supabase Auth
- Les rôles sont correctement assignés
- Le multi-tenant fonctionne (isolation par company)
- Les messages d'erreur sont clairs

---

## DÉPANNAGE RAPIDE

### Si un test échoue

1. **Vérifier l'edge function est déployée**:
   ```bash
   supabase functions list --project-ref rryjcqcxhpccgzkhgdqr
   ```

2. **Vérifier les logs edge function**:
   - Dashboard → Edge Functions → create-employee-account → Logs
   - Chercher les erreurs en rouge

3. **Vérifier la console (F12)**:
   - Onglet Console
   - Chercher les logs de création et de login

4. **Vérifier les tables**:
   - `user_roles`: Le rôle est-il correct?
   - `equipe`: Le `user_id` est-il rempli?

5. **Re-déployer si nécessaire**:
   ```bash
   supabase functions deploy create-employee-account --project-ref rryjcqcxhpccgzkhgdqr
   ```

---

**Date**: 2025-11-22
**Version**: 1.0
**Project ID**: `rryjcqcxhpccgzkhgdqr`
