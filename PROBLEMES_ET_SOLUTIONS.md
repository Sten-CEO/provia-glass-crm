# Problèmes rencontrés et solutions

## 🔴 Problème 1 : Impossible d'ajouter un email dans Paramètres > Société

### Symptôme
- Les champs email, téléphone, adresse ne sont pas disponibles dans le formulaire
- Erreur lors de la sauvegarde : `Could not find the 'tva_intracom' column of 'companies' in the schema cache`

### Cause
- Les colonnes nécessaires n'existent pas dans la table `companies`
- Le formulaire n'affichait pas les champs de contact

### ✅ Solution appliquée
1. **Migration de base de données** : Ajout des colonnes manquantes
   - Voir le fichier : `MIGRATION_GUIDE.md`
   - Migration : `supabase/migrations/20251205100000_add_company_contact_fields.sql`

2. **Mise à jour du formulaire** : Ajout des champs dans `src/pages/Parametres.tsx`
   - Email principal
   - Email d'expédition (optionnel)
   - Téléphone
   - Adresse complète, ville, code postal

### 📋 Action requise
**Vous devez appliquer la migration SQL** (voir `MIGRATION_GUIDE.md`)

---

## 🔴 Problème 2 : Envoi d'email ne fonctionne pas

### Symptôme
- Message "Failed to send a request to the Edge Function"
- Message "Email stub" dans la console
- Erreur CORS

### Causes
1. **Code obsolète** : L'éditeur de devis utilisait un composant stub (EmailComposerModal) au lieu du vrai composant (QuoteSendModal)
2. **Edge Functions non déployées** : Les fonctions Supabase ne sont pas déployées

### ✅ Solution appliquée
1. **Remplacement du stub** dans `src/pages/DevisEditor.tsx`
   - ❌ Ancien : `EmailComposerModal` (stub)
   - ✅ Nouveau : `QuoteSendModal` (vrai envoi)

2. **Suppression du code de simulation** :
   - Supprimé la fonction `handleEmailSend` qui était un stub
   - L'email est maintenant envoyé via `supabase.functions.invoke('send-quote-email')`

### 📋 Actions requises
1. **Déployer les Edge Functions** (voir `DEPLOY_EDGE_FUNCTIONS.md`)
   ```bash
   npx supabase functions deploy send-quote-email
   npx supabase functions deploy send-invoice-email
   ```

2. **Configurer la clé API Resend**
   - Dashboard Supabase > Settings > Edge Functions > Environment Variables
   - Ajouter : `RESEND_API_KEY` = votre clé Resend
   - **Redéployer les fonctions après avoir ajouté la clé**

---

## 📚 Guides disponibles

### 1. MIGRATION_GUIDE.md
Guide pas à pas pour appliquer la migration SQL qui ajoute les colonnes manquantes à la table `companies`.

**À faire en priorité** : Cette migration est **obligatoire** pour pouvoir sauvegarder vos paramètres société.

### 2. DEPLOY_EDGE_FUNCTIONS.md
Guide complet pour :
- Installer Supabase CLI
- Se connecter et lier votre projet
- Déployer les Edge Functions
- Configurer les variables d'environnement
- Tester et débugger

**À faire après la migration** : Sans les Edge Functions déployées, l'envoi d'email ne fonctionnera pas.

---

## 🎯 Plan d'action recommandé

### Étape 1 : Appliquer la migration SQL ⭐ PRIORITÉ
1. Ouvrez `MIGRATION_GUIDE.md`
2. Suivez les instructions pour appliquer la migration
3. Vérifiez que les colonnes existent dans la table `companies`

**Résultat attendu** : Vous pouvez sauvegarder les paramètres société sans erreur.

### Étape 2 : Remplir les paramètres société
1. Allez dans **Paramètres > Société**
2. Remplissez au minimum :
   - Nom de la société
   - Email principal
3. Enregistrez

**Résultat attendu** : Les paramètres sont sauvegardés avec succès.

### Étape 3 : Déployer les Edge Functions
1. Ouvrez `DEPLOY_EDGE_FUNCTIONS.md`
2. Installez Supabase CLI
3. Déployez les fonctions `send-quote-email` et `send-invoice-email`

**Résultat attendu** : Les fonctions apparaissent dans le dashboard Supabase.

### Étape 4 : Configurer Resend (optionnel mais recommandé)
1. Créez un compte sur https://resend.com/
2. Créez une clé API
3. Ajoutez-la dans Supabase (Settings > Edge Functions > Environment Variables)
4. **Redéployez les fonctions**

**Résultat attendu** : Les emails sont envoyés réellement au lieu d'être simulés.

### Étape 5 : Tester l'envoi d'email
1. Ouvrez un devis
2. Cliquez sur "Envoyer par email"
3. Remplissez le formulaire
4. Envoyez

**Résultat attendu** :
- Avec clé Resend : Email réellement envoyé ✅
- Sans clé Resend : Email simulé mais lien public créé ⚠️

---

## ❓ FAQ

### Q : Est-ce que je dois obligatoirement configurer Resend ?
**R :** Non. Sans Resend, l'application fonctionne en mode "simulation" :
- Un lien public est créé pour le devis/facture
- Aucun email n'est envoyé
- Vous pouvez copier le lien et l'envoyer manuellement au client

### Q : Comment savoir si les Edge Functions sont déployées ?
**R :** Allez dans le Dashboard Supabase > Edge Functions. Vous devriez voir `send-quote-email` et `send-invoice-email` dans la liste.

### Q : Dois-je redéployer après avoir ajouté des variables d'environnement ?
**R :** **OUI !** Les variables ne sont prises en compte qu'après un redéploiement.

### Q : Comment débugger si l'envoi ne fonctionne pas ?
**R :**
1. Console du navigateur (F12) → onglet Console
2. Dashboard Supabase → Edge Functions → Logs
3. Vérifiez que la migration SQL a été appliquée
4. Vérifiez que l'email est renseigné dans Paramètres > Société

---

## 📝 Modifications effectuées dans le code

### Fichiers modifiés
1. `src/pages/Parametres.tsx`
   - Ajout des champs email, téléphone, adresse
   - Modification du chargement/sauvegarde pour utiliser la table `companies`

2. `src/pages/DevisEditor.tsx`
   - Remplacement de `EmailComposerModal` par `QuoteSendModal`
   - Suppression de la fonction stub `handleEmailSend`

3. `supabase/migrations/20251205100000_add_company_contact_fields.sql`
   - Ajout de `tva_intracom` et `updated_at`
   - Documentation complète des colonnes

### Fichiers créés
1. `MIGRATION_GUIDE.md` - Guide pour appliquer la migration SQL
2. `DEPLOY_EDGE_FUNCTIONS.md` - Guide pour déployer les Edge Functions
3. `PROBLEMES_ET_SOLUTIONS.md` - Ce fichier (récapitulatif)

---

## 🚀 Statut actuel

| Tâche | Statut | Action requise |
|-------|--------|----------------|
| Code frontend mis à jour | ✅ Terminé | Aucune - déjà poussé sur Git |
| Migration SQL créée | ✅ Terminé | **À appliquer manuellement** |
| Edge Functions code | ✅ Terminé | **À déployer** |
| Configuration Resend | ⚠️ Optionnel | À configurer pour envoi réel |

---

## 📞 Besoin d'aide ?

Si vous rencontrez des problèmes :
1. Vérifiez les logs dans la console du navigateur (F12)
2. Vérifiez les logs des Edge Functions dans le dashboard Supabase
3. Assurez-vous que toutes les étapes ont été suivies dans l'ordre
4. Relisez les guides `MIGRATION_GUIDE.md` et `DEPLOY_EDGE_FUNCTIONS.md`
