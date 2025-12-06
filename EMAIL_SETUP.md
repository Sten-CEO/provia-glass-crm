# 📧 Configuration de l'envoi d'emails pour Devis et Factures

Ce guide explique comment configurer le système d'envoi d'emails pour vos devis et factures avec pièces jointes PDF.

## 🎯 Fonctionnalités

- ✅ Envoi de devis par email avec PDF en pièce jointe
- ✅ Envoi de factures par email avec PDF en pièce jointe
- ✅ Email d'expédition personnalisé (reply-to = email de votre société)
- ✅ Templates d'email personnalisables avec variables
- ✅ Mode simulation (sans clé API) pour tester le flux
- ✅ Sécurité : vérification que le document appartient bien à votre société
- ✅ PDF généré automatiquement à partir des données du document

## 📋 Prérequis

### 1. Compte Resend

1. Créer un compte sur [resend.com](https://resend.com) (gratuit pour 100 emails/jour)
2. Vérifier votre email
3. Obtenir votre clé API dans le dashboard Resend

### 2. Configurer la variable d'environnement

#### Pour Supabase Edge Functions (Production)

1. Aller dans votre projet Supabase
2. Naviguer vers **Settings → Edge Functions → Environment Variables**
3. Ajouter une nouvelle variable :
   - **Nom**: `RESEND_API_KEY`
   - **Valeur**: Votre clé API Resend (commence par `re_...`)

#### Pour le développement local

Si vous testez les fonctions Edge localement avec Supabase CLI :

1. Créer un fichier `.env` dans le dossier `supabase/` :
```bash
RESEND_API_KEY=re_votre_cle_api_ici
```

2. Ne pas commiter ce fichier (déjà dans .gitignore)

### 3. Configurer les informations de votre société

Les emails utilisent les informations de votre société pour le "reply-to" et les informations de contact.

**Dans l'application** :
1. Aller dans **Paramètres → Société**
2. Renseigner les champs suivants :
   - **Nom** : Nom de votre société (obligatoire)
   - **Email** : Email principal de contact (sera utilisé comme reply-to)
   - **Email d'expédition** (email_from) : Optionnel, sera utilisé si différent de l'email principal
   - **Téléphone** : Affiché dans le footer des emails
   - **Adresse** : Affichée dans le footer des emails
   - **SIRET** : Affiché dans les factures

**Via migration SQL** (si les champs n'existent pas) :
```sql
-- Migration déjà créée : 20251205100000_add_company_contact_fields.sql
-- Elle sera appliquée automatiquement au prochain déploiement
```

## 🚀 Utilisation

### Envoi d'un devis

1. Ouvrir un devis
2. Cliquer sur "Envoyer par email"
3. Vérifier/modifier :
   - Email du destinataire (pré-rempli depuis la fiche client)
   - Objet de l'email
   - Message
   - (Optionnel) Sélectionner un template d'email
4. Cliquer sur "Envoyer"

**Ce qui se passe** :
- Le PDF du devis est généré automatiquement
- Un email est envoyé avec le PDF en pièce jointe
- Le statut du devis passe à "Envoyé"
- Un lien public est créé pour que le client puisse consulter/signer en ligne

### Envoi d'une facture

1. Ouvrir une facture
2. Cliquer sur "Envoyer par email"
3. Vérifier/modifier :
   - Email du destinataire
   - Objet de l'email
   - Message
4. Cliquer sur "Envoyer"

**Ce qui se passe** :
- Le PDF de la facture est généré automatiquement
- Un email est envoyé avec le PDF en pièce jointe
- L'email contient les informations de paiement et d'échéance

## 📧 Format des emails

### Email "From"

- **Format** : `Nom de votre société <noreply@proviabase.app>`
- **Reply-To** : Email de votre société (défini dans les paramètres)

**Pourquoi `noreply@proviabase.app` ?**
Resend nécessite que l'adresse "from" soit sur un domaine vérifié. En utilisant un domaine par défaut et en mettant votre email en "reply-to", quand le client répond, ça arrive directement dans votre boîte mail.

**Pour utiliser votre propre domaine** :
1. Vérifier votre domaine dans Resend
2. Modifier le code dans `send-quote-email/index.ts` ligne 344 et `send-invoice-email/index.ts`
3. Remplacer `noreply@proviabase.app` par `noreply@votredomaine.com`

### Contenu HTML

Les emails sont au format HTML responsive avec :
- Header avec le nom de votre société
- Corps du message personnalisé
- Encadré avec les infos du document (numéro, montant, échéance)
- Bouton CTA pour les devis (consulter et signer en ligne)
- Footer avec les coordonnées de votre société

## 🎨 Templates d'email

Vous pouvez créer des templates d'email réutilisables avec des variables dynamiques.

### Variables disponibles

#### Client
- `{{NomClient}}` - Nom du client
- `{{EmailClient}}` - Email du client
- `{{TelephoneClient}}` - Téléphone du client
- `{{AdresseClient}}` - Adresse du client

#### Document
- `{{NumDevis}}` / `{{NumFacture}}` - Numéro du document
- `{{NumDocument}}` - Numéro générique
- `{{TypeDocument}}` - "Devis" ou "Facture"
- `{{MontantHT}}` - Montant HT formaté
- `{{MontantTTC}}` - Montant TTC formaté
- `{{DateEnvoi}}` - Date d'envoi
- `{{DateCreation}}` - Date de création du document
- `{{DateExpiration}}` - Date d'expiration (devis)
- `{{DateEcheance}}` - Date d'échéance (facture)

#### Société
- `{{NomEntreprise}}` - Nom de la société
- `{{EmailEntreprise}}` - Email de la société
- `{{TelephoneEntreprise}}` - Téléphone de la société
- `{{AdresseEntreprise}}` - Adresse de la société

### Exemple de template

**Objet** :
```
Votre {{TypeDocument}} {{NumDocument}} - {{NomEntreprise}}
```

**Corps** :
```
Bonjour {{NomClient}},

Nous vous remercions de votre confiance.

Veuillez trouver ci-joint votre {{TypeDocument}} n°{{NumDocument}} d'un montant de {{MontantTTC}}.

N'hésitez pas à nous contacter pour toute question.

Cordialement,
L'équipe {{NomEntreprise}}
```

## 🧪 Mode Simulation

Si vous n'avez pas encore configuré la clé API Resend, le système fonctionne en mode simulation :

- Les emails ne sont **pas envoyés réellement**
- Les logs sont affichés dans la console Supabase
- Un toast jaune indique le mode simulation
- Toutes les autres fonctionnalités sont actives (génération PDF, lien public, etc.)

C'est idéal pour tester le flux sans envoyer d'emails.

## 🔧 Architecture technique

### Fichiers modifiés/créés

#### Backend (Supabase Edge Functions)
- `supabase/functions/send-quote-email/index.ts` - Envoi de devis
- `supabase/functions/send-invoice-email/index.ts` - Envoi de factures
- `supabase/functions/_shared/pdf-generator.ts` - Génération des PDFs

#### Frontend (React)
- `src/components/devis/QuoteSendModal.tsx` - Modal d'envoi de devis (mis à jour)
- `src/components/factures/InvoiceSendModal.tsx` - Modal d'envoi de factures (nouveau)

#### Base de données
- `supabase/migrations/20251205100000_add_company_contact_fields.sql` - Ajout des champs de contact

### Flux d'envoi

```
1. Utilisateur clique sur "Envoyer"
   ↓
2. Modal valide les données (email destinataire, objet, message)
   ↓
3. Appel à la fonction Edge (send-quote-email ou send-invoice-email)
   ↓
4. Vérification de sécurité :
   - Utilisateur authentifié ?
   - Document appartient à sa société ?
   ↓
5. Récupération des données :
   - Document (devis/facture)
   - Client
   - Société
   ↓
6. Génération du PDF
   ↓
7. Construction de l'email HTML
   ↓
8. Envoi via API Resend
   ↓
9. Retour au frontend (succès ou erreur)
   ↓
10. Toast de confirmation et fermeture du modal
```

### Sécurité

- ✅ **Authentification** : Vérification du token Supabase
- ✅ **Autorisation** : Seuls les documents de votre société peuvent être envoyés
- ✅ **Row Level Security** : Activé sur toutes les tables
- ✅ **CORS** : Configuration stricte pour les Edge Functions
- ✅ **Variables sensibles** : Clé API stockée dans les variables d'environnement

## 🐛 Dépannage

### L'email n'est pas envoyé

1. **Vérifier la clé API Resend** :
   - Dans Supabase : Settings → Edge Functions → Environment Variables
   - La variable `RESEND_API_KEY` existe ?
   - La clé est valide ? (teste sur resend.com)

2. **Vérifier les logs** :
   - Dans Supabase : Edge Functions → Logs
   - Regarder les erreurs de `send-quote-email` ou `send-invoice-email`

3. **Vérifier l'email de la société** :
   - Dans l'app : Paramètres → Société
   - L'email est bien renseigné ?

### Le PDF n'est pas généré correctement

Le PDF est généré au format HTML simple. Pour un PDF plus professionnel :

1. **Option 1** : Utiliser puppeteer dans une fonction Edge
2. **Option 2** : Utiliser une API tierce comme PDF.co
3. **Option 3** : Générer le PDF côté frontend et l'uploader vers Supabase Storage

### L'email arrive en spam

1. Vérifier votre domaine dans Resend (SPF, DKIM)
2. Utiliser un domaine personnalisé vérifié
3. Éviter les mots "spam" dans l'objet
4. Demander au client d'ajouter votre email en contact

## 📊 Limites et quotas

### Resend (plan gratuit)
- **100 emails/jour**
- **1 domaine vérifié**
- Tous les emails doivent provenir d'un domaine vérifié

### Upgrade recommandé si :
- Vous envoyez plus de 100 emails/jour
- Vous avez besoin de plusieurs domaines
- Vous voulez des analytics avancés

## 🎓 Pour aller plus loin

### Personnaliser le template PDF

Modifier `supabase/functions/_shared/pdf-generator.ts` :
- Fonction `generateQuoteHTML()` pour les devis
- Fonction `generateInvoiceHTML()` pour les factures

### Ajouter des analytics

Resend fournit des webhooks pour tracker :
- Emails ouverts
- Liens cliqués
- Erreurs de delivery

Créer une fonction Edge pour recevoir ces webhooks et les stocker dans Supabase.

### Utiliser votre propre domaine

1. Dans Resend :
   - Ajouter votre domaine
   - Configurer les DNS (SPF, DKIM, DMARC)
   - Vérifier le domaine

2. Dans le code (ex: ligne 344 de send-quote-email/index.ts) :
```typescript
const from = `${company.name} <noreply@votredomaine.com>`;
```

## 💡 Exemple de test

### Test en local (mode simulation)

```bash
# 1. Lancer Supabase localement
npx supabase start

# 2. Créer un devis dans l'app
# 3. Cliquer sur "Envoyer par email"
# 4. Regarder les logs dans la console Supabase
npx supabase functions logs send-quote-email
```

### Test en production

1. Configurer la clé API Resend dans Supabase
2. Configurer l'email de votre société
3. Envoyer un devis de test à votre propre email
4. Vérifier :
   - Email reçu ?
   - PDF en pièce jointe ?
   - Reply-to = votre email société ?
   - Lien public fonctionne ?

## 📞 Support

En cas de problème :
1. Vérifier cette documentation
2. Consulter les logs Supabase
3. Vérifier le dashboard Resend
4. Ouvrir une issue GitHub avec les logs

---

**Dernière mise à jour** : 5 décembre 2024
