# Guide de Vérification et Test - Système de Rôles

## ⚠️ IMPORTANT: Déployez d'abord l'Edge Function

Avant de tester, vous DEVEZ déployer l'edge function mise à jour:

```bash
# Option 1: Via Supabase CLI (recommandé)
supabase functions deploy create-employee-account

# Option 2: Via Dashboard Supabase
# 1. Allez sur dashboard.supabase.com
# 2. Votre projet → Edge Functions
# 3. create-employee-account → Deploy
# 4. Copiez le contenu de supabase/functions/create-employee-account/index.ts
```

## Test 1: Créer un Employé Terrain ✅

### Étapes
1. Connectez-vous au CRM en tant qu'Owner/Admin
2. Allez dans `/equipe`
3. Cliquez "Inviter un employé"
4. Remplissez:
   - Nom: Test Employé
   - Email: test.employe@test.com
   - Rôle: **Employé terrain (App uniquement)**
5. Cliquez "Inviter"

### Vérifications dans la Console (F12)
Vous devez voir:
```
📝 Creating account for: test.employe@test.com
🔑 Generated password: [mot de passe]
👤 Role mapping: { originalRole: "Employé terrain", mappedRole: "employe_terrain" }
📤 Sending request to edge function: {...}
📡 Edge function response status: 200
✅ Account created successfully
```

### Vérifications dans le Modal
Le modal doit afficher:
- ✅ Email de connexion: test.employe@test.com
- ✅ Mot de passe temporaire: [12 caractères]
- ✅ Message: "Ce membre doit se connecter sur l'**application employé**"
- ✅ URL: `https://votre-site.com/employee/login`
- ✅ Bouton pour copier l'URL

### Test de Connexion - Employee Login (DOIT MARCHER) ✅
1. Ouvrez `/employee/login`
2. Entrez l'email et le mot de passe temporaire
3. **Résultat attendu**: Connexion réussie → redirection vers `/employee`

### Test de Connexion - CRM Login (DOIT ÉCHOUER) ❌
1. Ouvrez `/auth/login`
2. Entrez le même email et mot de passe
3. **Résultat attendu**: "Identifiants incorrects" + déconnexion automatique

### Vérification dans Supabase Dashboard
1. Allez sur dashboard.supabase.com → Votre projet
2. **Table Editor → user_roles**
   - Trouvez la ligne avec l'email test.employe@test.com
   - Vérifiez: `role` = **'employe_terrain'** (minuscules, avec underscore)
   - Vérifiez: `company_id` correspond à votre company
3. **Table Editor → equipe**
   - Trouvez la ligne avec l'email test.employe@test.com
   - Vérifiez: `user_id` est rempli (pas NULL)
   - Vérifiez: `app_access_status` = **'active'**
   - Vérifiez: `company_id` correspond à votre company

---

## Test 2: Créer un Admin CRM ✅

### Étapes
1. Connectez-vous au CRM en tant qu'Owner/Admin
2. Allez dans `/equipe`
3. Cliquez "Inviter un employé"
4. Remplissez:
   - Nom: Test Admin
   - Email: test.admin@test.com
   - Rôle: **Admin (CRM + App optionnel)**
5. Cliquez "Inviter"

### Vérifications dans la Console (F12)
Vous devez voir:
```
📝 Creating account for: test.admin@test.com
🔑 Generated password: [mot de passe]
👤 Role mapping: { originalRole: "Admin", mappedRole: "admin" }
📤 Sending request to edge function: {...}
📡 Edge function response status: 200
✅ Account created successfully
```

### Vérifications dans le Modal
Le modal doit afficher:
- ✅ Email de connexion: test.admin@test.com
- ✅ Mot de passe temporaire: [12 caractères]
- ✅ Message: "Ce membre doit se connecter sur le **CRM** (pas l'app employé)"
- ✅ URL: `https://votre-site.com/auth/login`
- ✅ Bouton pour copier l'URL

### Test de Connexion - CRM Login (DOIT MARCHER) ✅
1. Ouvrez `/auth/login`
2. Entrez l'email et le mot de passe temporaire
3. **Résultat attendu**: Connexion réussie → accès au CRM

### Test de Connexion - Employee Login (DOIT ÉCHOUER) ❌
1. Ouvrez `/employee/login`
2. Entrez le même email et mot de passe
3. **Résultat attendu**: "Identifiants incorrects" + déconnexion automatique

### Vérification dans Supabase Dashboard
1. **Table Editor → user_roles**
   - Trouvez la ligne avec l'email test.admin@test.com
   - Vérifiez: `role` = **'admin'** (minuscules, sans underscore)
   - Vérifiez: `company_id` correspond à votre company
2. **Table Editor → equipe**
   - Trouvez la ligne avec l'email test.admin@test.com
   - Vérifiez: `user_id` est rempli (pas NULL)
   - Vérifiez: `app_access_status` = **'none'** (pas 'active')
   - Vérifiez: `company_id` correspond à votre company

---

## Test 3: Vérifier les Logs de l'Edge Function

### Accéder aux logs
1. Allez sur dashboard.supabase.com → Votre projet
2. Menu: **Edge Functions** → **create-employee-account** → **Logs**

### Créez un nouveau membre et vérifiez les logs

Vous devez voir (dans l'ordre):
```
📥 Received request data: {
  employeeId: "...",
  email: "test@test.com",
  role: "admin" ou "employe_terrain",
  firstName: "...",
  lastName: "...",
  passwordLength: 12
}

✅ Validation passed, creating user account...

User created: [user_id]

🎭 Role determination: {
  receivedRole: "admin",
  isValidRole: true,
  finalRole: "admin",
  validRoles: ["owner", "admin", "manager", "backoffice", "employe_terrain"]
}

✅ User role created successfully: admin
```

### Si vous voyez des erreurs

**Erreur: "Missing authorization header"**
- Votre session a expiré
- Reconnectez-vous et réessayez

**Erreur: "Password is required and must be at least 6 characters"**
- Bug dans la génération de mot de passe
- Vérifiez les logs frontend (console du navigateur)

**Erreur: "Failed to create user role"**
- Problème avec la table user_roles
- Vérifiez les permissions RLS
- Vérifiez que company_id existe

**receivedRole: null ou undefined**
- Le rôle n'est pas passé depuis le frontend
- Vérifiez les logs frontend
- Vérifiez que mapRoleToDbRole() retourne bien une valeur

---

## Dépannage Rapide

### Problème: "Identifiants incorrects" sur la BONNE page

**Causes possibles:**
1. Edge function pas déployée → Déployez-la
2. Mauvais mot de passe copié → Réessayez avec copier-coller du modal
3. Email avec espace ou typo → Vérifiez l'email exact

### Problème: Connexion marche sur la MAUVAISE page

**Diagnostic:**
1. Ouvrez Supabase Dashboard → Table Editor → user_roles
2. Trouvez votre utilisateur
3. Regardez la colonne `role`

**Si role = 'employe_terrain' mais vous avez créé un Admin:**
- ❌ L'edge function a reçu un rôle incorrect ou null
- Solution: Vérifiez les logs edge function (voir Test 3)
- Solution temporaire: Modifiez manuellement dans user_roles

**Si role = 'admin' mais vous avez créé un Employé terrain:**
- ❌ Vous avez sélectionné le mauvais rôle lors de la création
- Solution: Supprimez et recréez le membre

### Problème: L'edge function retourne une erreur 400

**Vérifications:**
1. Ouvrez la console (F12)
2. Cherchez `❌ Edge function error:`
3. Lisez le message d'erreur
4. Consultez les logs Supabase Functions

**Erreurs communes:**
- "Missing required fields" → Nom ou email vide
- "Password is required" → Bug génération password
- "Insufficient permissions" → Vous n'êtes pas Owner/Admin/Manager
- "User has no company assigned" → Votre compte n'a pas de company_id

---

## Checklist Finale ✅

Avant de considérer le système fonctionnel, vérifiez:

- [ ] Edge function déployée avec succès
- [ ] Test 1 (Employé terrain) passé: connexion OK sur /employee/login, BLOQUÉ sur /auth/login
- [ ] Test 2 (Admin) passé: connexion OK sur /auth/login, BLOQUÉ sur /employee/login
- [ ] Les logs edge function montrent le bon rôle (🎭 Role determination)
- [ ] Table user_roles contient les bons rôles en minuscules
- [ ] Modal de mot de passe affiche la bonne URL selon le rôle
- [ ] Aucune erreur dans les logs Supabase Functions
- [ ] Aucune erreur dans la console navigateur

---

## Support

Si tous les tests échouent:
1. Vérifiez que l'edge function est bien déployée
2. Consultez `ROLES_HIERARCHY.md` pour comprendre le système
3. Consultez `supabase/functions/DEPLOYMENT.md` pour le déploiement
4. Vérifiez les logs à TOUS les niveaux:
   - Console navigateur (F12)
   - Supabase Functions Logs
   - Supabase Table Editor (user_roles, equipe)

## Test de Non-Régression

Après chaque modification du système de rôles, refaites les Tests 1 et 2 pour garantir que tout fonctionne encore.
