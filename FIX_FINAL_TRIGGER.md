# 🎯 FIX FINAL : Corriger Le Trigger Qui Écrase Les Rôles

**Date**: 2025-11-23
**Problème Identifié**: Le trigger `handle_new_user()` s'exécute pour TOUS les users créés, même les employés, ce qui écrase leurs rôles.

---

## 🔍 PROBLÈME TROUVÉ

Quand vous créez un membre avec le rôle "Admin" :

1. ✅ L'edge function crée le user avec `role: 'admin'` et `is_employee: true`
2. ⚡ **AUTOMATIQUEMENT**, le trigger `handle_new_user()` s'exécute
3. ❌ Le trigger crée une company ET insère un role `'owner'` dans `user_roles`
4. ❌ Résultat : Conflit de rôles, le user finit avec le mauvais rôle

---

## ✅ SOLUTION

J'ai créé une migration qui modifie le trigger pour qu'il **ignore les employés** :

```sql
IF (NEW.raw_user_meta_data->>'is_employee')::boolean IS TRUE THEN
  -- C'est un employé, ne rien faire (l'edge function gère tout)
  RETURN NEW;
END IF;
```

---

## 🚀 COMMANDES À EXÉCUTER (2 Minutes)

### ÉTAPE 1 : Déployer La Migration

Ouvrez Terminal et exécutez :

```bash
cd /chemin/vers/provia-glass-crm

supabase db push --project-ref rryjcqcxhpccgzkhgdqr
```

**Sortie attendue** :
```
Applying migration 20251123_fix_trigger_for_employees.sql...
Migration applied successfully
```

---

### ÉTAPE 2 : Vérifier Dans Le Dashboard

1. Allez sur : https://supabase.com/dashboard/project/rryjcqcxhpccgzkhgdqr/database/functions
2. Cherchez la fonction `handle_new_user`
3. Cliquez dessus
4. Vérifiez que le code contient :
   ```sql
   IF (NEW.raw_user_meta_data->>'is_employee')::boolean IS TRUE THEN
     RETURN NEW;
   END IF;
   ```

---

### ÉTAPE 3 : Nettoyer Les Anciens Users De Test

**IMPORTANT** : Supprimez tous les users de test créés avant ce fix :

1. **Supabase Dashboard** → **Authentication** → **Users**
2. **Supprimez** :
   - `testversion8nouveau@votredomaine.com`
   - `manager@gmail.com`
   - Tous les autres comptes de test

3. **Table Editor** → **user_roles**
   - Supprimez les entrées correspondantes

4. **Table Editor** → **equipe**
   - Pour chaque membre test, mettez `user_id` à `NULL`

---

### ÉTAPE 4 : Test Final

1. **Créer un nouveau membre** avec un **email complètement nouveau** :
   - Email : `admin-final-test@votredomaine.com`
   - Rôle : **Admin (CRM + App optionnel)**
   - Générer un mot de passe

2. **Console (F12)** doit afficher :
   ```javascript
   {
     success: true,
     userId: "...",
     temporaryPassword: "...",
     role: "admin",        ← PRÉSENT !
     email: "admin-final-test@votredomaine.com"  ← PRÉSENT !
   }
   ```

3. **Vérifier Auth → Users** :
   - Le user `admin-final-test@votredomaine.com` **doit apparaître** ✅

4. **Vérifier Table user_roles** :
   - Une seule ligne pour ce user
   - `role` = `"admin"` ✅
   - `company_id` = votre company ID (pas une nouvelle company)

5. **Test Connexion** sur `/auth/login` :
   - Email : `admin-final-test@votredomaine.com`
   - Mot de passe : celui généré
   - Console doit afficher : `Role found: admin` ✅
   - Redirection vers `/tableau-de-bord` ✅

---

## 📊 AVANT / APRÈS LE FIX

| Comportement | Avant Fix | Après Fix |
|--------------|-----------|-----------|
| Créer un employé terrain | ✅ Fonctionne | ✅ Fonctionne |
| Créer un Admin CRM | ❌ Devient owner/autre | ✅ Devient admin |
| User apparaît dans Auth | ❌ Parfois non | ✅ Toujours |
| Champ `role` dans réponse | ❌ Manquant | ✅ Présent |
| Connexion CRM pour Admin | ❌ Bloquée | ✅ Autorisée |
| Company créée pour employé | ❌ OUI (erreur) | ✅ NON |

---

## 🔧 SI LA COMMANDE `supabase db push` ÉCHOUE

### Erreur : "command not found: supabase"
```bash
npm install -g supabase
```

### Erreur : "Not logged in"
```bash
supabase login
```

### Erreur : "Project not linked"
```bash
supabase link --project-ref rryjcqcxhpccgzkhgdqr
```

### Erreur : "Migration failed"

Copiez-moi l'erreur exacte et je vous aiderai.

---

## ✅ CHECKLIST COMPLÈTE

- [ ] 1. Exécuter `supabase db push --project-ref rryjcqcxhpccgzkhgdqr`
- [ ] 2. Vérifier que la migration s'est appliquée
- [ ] 3. Supprimer tous les users de test dans Auth → Users
- [ ] 4. Supprimer les entrées correspondantes dans user_roles
- [ ] 5. Mettre user_id à NULL dans equipe pour les tests
- [ ] 6. Créer un nouveau membre Admin avec email nouveau
- [ ] 7. Vérifier que la console affiche `role: "admin"`
- [ ] 8. Vérifier que le user apparaît dans Auth → Users
- [ ] 9. Vérifier que user_roles contient UNE seule ligne avec role = "admin"
- [ ] 10. Tester la connexion sur `/auth/login`
- [ ] 11. Vérifier la console : `Role found: admin`
- [ ] 12. Vérifier la redirection vers `/tableau-de-bord`
- [ ] 13. Créer un employé terrain et vérifier qu'il ne peut PAS se connecter au CRM
- [ ] 14. Vérifier que l'employé terrain PEUT se connecter sur `/employee/login`

---

**SI TOUT FONCTIONNE** : Le système est complètement réparé ! ✅

**SI ÇA NE MARCHE PAS** : Envoyez-moi :
1. La sortie de `supabase db push`
2. La console (F12) lors de la création
3. Un screenshot de Auth → Users
4. Un screenshot de la table user_roles pour le user test

---

**Project ID**: `rryjcqcxhpccgzkhgdqr`
**Migration**: `20251123_fix_trigger_for_employees.sql`
