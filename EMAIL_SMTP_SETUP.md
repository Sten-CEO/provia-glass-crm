# 📧 Configuration SMTP - Provia BASE

## Vue d'ensemble

Provia BASE utilise un système d'envoi d'emails **100% personnalisable** via SMTP. Chaque entreprise peut configurer son propre serveur SMTP pour envoyer ses devis et factures depuis n'importe quelle adresse email.

### Avantages

✅ **Aucune contrainte de domaine** - Utilisez Gmail, Outlook, OVH, IONOS ou tout autre fournisseur
✅ **100% gratuit** - Pas de quota ni de limite d'envoi (selon votre fournisseur SMTP)
✅ **Expéditeur personnalisé** - Les emails proviennent de VOTRE adresse
✅ **Aucune dépendance externe** - Pas de Resend, SendGrid ou autre service tiers
✅ **Sécurisé** - Support SSL/TLS et STARTTLS

---

## 🚀 Guide de configuration

### Étape 1 : Accéder aux paramètres

1. Connectez-vous à Provia BASE
2. Allez dans **Paramètres**
3. Cliquez sur l'onglet **Email (SMTP)**

### Étape 2 : Activer SMTP

Activez le switch **"Activé"** en haut à droite de la page.

### Étape 3 : Configurer les paramètres SMTP

Remplissez les champs selon votre fournisseur d'email (voir guides ci-dessous).

### Étape 4 : Tester la configuration

Cliquez sur le bouton **"Tester l'envoi"** pour vous envoyer un email de test.

### Étape 5 : Enregistrer

Cliquez sur **"Enregistrer la configuration"**.

---

## 📚 Guides de configuration par fournisseur

### 🔵 Gmail (Recommandé)

**Paramètres :**
- **Serveur SMTP :** `smtp.gmail.com`
- **Port :** `587`
- **Type de sécurité :** STARTTLS
- **Email d'envoi :** Votre adresse Gmail complète (ex: `contact@gmail.com`)
- **Mot de passe :** **Mot de passe d'application** (voir ci-dessous)

**⚠️ IMPORTANT : Créer un mot de passe d'application Gmail**

Gmail ne permet pas l'utilisation de votre mot de passe habituel pour les applications tierces. Vous devez créer un **mot de passe d'application** :

1. Allez sur https://myaccount.google.com/security
2. Activez la **validation en deux étapes** (si ce n'est pas déjà fait)
3. Allez dans **Mots de passe des applications**
4. Sélectionnez "Autre" et entrez "Provia BASE"
5. Copiez le mot de passe généré (16 caractères)
6. Collez-le dans le champ **"Mot de passe SMTP"** de Provia BASE

📖 [Guide officiel Google](https://support.google.com/mail/answer/185833)

---

### 🔷 Outlook / Hotmail

**Paramètres :**
- **Serveur SMTP :** `smtp-mail.outlook.com`
- **Port :** `587`
- **Type de sécurité :** STARTTLS
- **Email d'envoi :** Votre adresse Outlook/Hotmail (ex: `contact@outlook.com`)
- **Mot de passe :** Votre mot de passe Outlook habituel

**Note :** Outlook accepte le mot de passe habituel (pas besoin de mot de passe d'application).

---

### 🟠 OVH

**Paramètres :**
- **Serveur SMTP :** `ssl0.ovh.net`
- **Port :** `587`
- **Type de sécurité :** STARTTLS
- **Email d'envoi :** Votre adresse email OVH (ex: `contact@votre-domaine.com`)
- **Mot de passe :** Le mot de passe de votre compte email OVH

**Note :** Vous pouvez également utiliser `ssl0.ovh.net` avec le port `465` et SSL/TLS.

---

### 🔵 IONOS (1&1)

**Paramètres :**
- **Serveur SMTP :** `smtp.ionos.fr`
- **Port :** `587`
- **Type de sécurité :** STARTTLS
- **Email d'envoi :** Votre adresse email IONOS (ex: `contact@votre-domaine.com`)
- **Mot de passe :** Le mot de passe de votre compte email IONOS

---

### 🟢 Autre fournisseur

Pour tout autre fournisseur SMTP (domaine personnel, hébergeur, etc.), consultez la documentation de votre fournisseur pour obtenir :

1. L'adresse du serveur SMTP (ex: `mail.exemple.com`)
2. Le port (généralement `587` pour STARTTLS ou `465` pour SSL/TLS)
3. Le type de sécurité
4. Vos identifiants (email + mot de passe)

---

## 🔧 Résolution de problèmes

### ❌ "Authentification SMTP échouée"

**Causes possibles :**
- Mot de passe incorrect
- Pour Gmail : vous n'avez pas créé de mot de passe d'application
- Pour Outlook : validation en deux étapes activée (désactivez-la ou créez un mot de passe d'application)

**Solution :**
1. Vérifiez que vous utilisez le bon mot de passe
2. Pour Gmail : utilisez un mot de passe d'application (voir guide Gmail ci-dessus)
3. Vérifiez que votre email et mot de passe sont corrects en vous connectant à votre webmail

---

### ❌ "Impossible de se connecter au serveur SMTP"

**Causes possibles :**
- Adresse du serveur SMTP incorrecte
- Port incorrect
- Type de sécurité incorrect

**Solution :**
1. Vérifiez l'adresse du serveur SMTP (ex: `smtp.gmail.com` et non `mail.gmail.com`)
2. Vérifiez que vous utilisez le bon port :
   - **587** pour STARTTLS (recommandé)
   - **465** pour SSL/TLS
3. Assurez-vous que le type de sécurité correspond au port

---

### ❌ "Délai d'attente dépassé"

**Causes possibles :**
- Pare-feu bloquant le port SMTP
- Connexion internet instable

**Solution :**
1. Vérifiez votre connexion internet
2. Essayez avec un autre port (587 ou 465)
3. Contactez votre administrateur réseau si vous êtes en entreprise

---

### ⚠️ L'email de test arrive dans les spams

C'est normal pour un premier envoi. Pour améliorer la délivrabilité :

1. **Ajoutez votre adresse email d'envoi à vos contacts**
2. **Configurez SPF/DKIM** (pour les domaines personnalisés, consultez votre hébergeur)
3. **Marquez l'email comme "Non spam"** dans votre boîte de réception

---

## 🔒 Sécurité

### Stockage des mots de passe

Les mots de passe SMTP sont stockés **chiffrés** dans la base de données Supabase.

### Meilleures pratiques

1. ✅ Utilisez un **mot de passe d'application** pour Gmail
2. ✅ Ne partagez jamais vos identifiants SMTP
3. ✅ Activez la **validation en deux étapes** sur votre compte email
4. ✅ Changez régulièrement vos mots de passe

---

## 📊 Fonctionnement technique

### Architecture

```
Provia BASE
    ↓
Edge Function (send-quote-email / send-invoice-email)
    ↓
Module SMTP (_shared/smtp-mailer.ts)
    ↓
Bibliothèque SMTP (Deno SmtpClient)
    ↓
Votre serveur SMTP (Gmail, Outlook, OVH, etc.)
    ↓
Destinataire final
```

### Modules

- **smtp-mailer.ts** : Module SMTP partagé utilisant `SmtpClient` de Deno
- **send-quote-email/index.ts** : Edge Function pour l'envoi de devis
- **send-invoice-email/index.ts** : Edge Function pour l'envoi de factures
- **test-smtp/index.ts** : Edge Function pour tester la configuration SMTP

### Base de données

Table `companies` - Champs SMTP :
```sql
smtp_enabled    BOOLEAN DEFAULT false
smtp_host       TEXT
smtp_port       INTEGER
smtp_username   TEXT
smtp_password   TEXT (chiffré)
smtp_secure     BOOLEAN DEFAULT false
```

---

## ❓ FAQ

### Puis-je utiliser plusieurs adresses email ?

Non, chaque entreprise configure **une seule adresse email d'envoi**. Cette adresse sera utilisée pour tous les devis et factures.

### Combien d'emails puis-je envoyer ?

Cela dépend de votre fournisseur SMTP :
- **Gmail gratuit** : ~500 emails/jour
- **Outlook gratuit** : ~300 emails/jour
- **Serveur dédié** : Illimité (selon votre hébergeur)

### Est-ce que mes emails vont dans les spams ?

Pour les premiers envois, c'est possible. Pour améliorer la délivrabilité :
1. Utilisez une adresse email professionnelle (domaine personnalisé)
2. Configurez SPF et DKIM sur votre domaine
3. Évitez d'envoyer trop d'emails d'un coup
4. Demandez à vos clients d'ajouter votre adresse à leurs contacts

### Que se passe-t-il si je désactive SMTP ?

Si SMTP est désactivé, l'envoi d'emails échouera avec un message d'erreur demandant de configurer SMTP.

---

## 🛠️ Support

En cas de problème :

1. Testez votre configuration avec le bouton **"Tester l'envoi"**
2. Vérifiez les logs dans l'onglet **Edge Functions** de Supabase
3. Consultez la documentation de votre fournisseur SMTP
4. Contactez le support Provia BASE

---

## 📝 Notes de version

### Version 1.0 (Décembre 2025)
- ✅ Configuration SMTP personnalisée
- ✅ Support Gmail, Outlook, OVH, IONOS
- ✅ Test d'envoi intégré
- ✅ Interface de configuration complète
- ✅ Documentation utilisateur

---

**Made with ❤️ by Provia BASE**
