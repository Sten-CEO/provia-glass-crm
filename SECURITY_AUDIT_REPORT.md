# RAPPORT D'ANALYSE DE SÉCURITÉ - Provia Glass CRM

**Date**: 2025-12-09
**Version**: 1.0
**Auditeur**: Claude Code Security Analysis

---

## Vue d'ensemble du projet

| Aspect | Détail |
|--------|--------|
| **Type** | CRM SaaS multi-tenant |
| **Stack Frontend** | React 18 + TypeScript + Vite |
| **Stack Backend** | Supabase (PostgreSQL) + Edge Functions (Deno) |
| **Authentification** | JWT via Supabase Auth |
| **Composants** | 142 composants, 55 pages, 8 Edge Functions |

---

## RÉSUMÉ EXÉCUTIF

| Gravité | Nombre | Actions |
|---------|--------|---------|
| 🔴 CRITIQUE (5/5) | 3 | Action immédiate requise |
| 🟠 ÉLEVÉE (4/5) | 4 | Corriger dans les 7 jours |
| 🟡 MOYENNE (3/5) | 5 | Planifier correction |
| 🔵 FAIBLE (2/5) | 4 | À améliorer |
| ⚪ INFO (1/5) | 3 | Recommandations |

---

## 🔴 PROBLÈMES CRITIQUES (Gravité 5/5)

### SEC-001: Fichier `.env` commité dans le repository Git

**Localisation**: `.env` (racine du projet)

**Contenu exposé**:
```
SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
SUPABASE_URL="https://rryjcqcxhpccgzkhgdqr.supabase.co"
VITE_SUPABASE_PUBLISHABLE_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

**Impact**:
- Exposition des clés API Supabase dans le contrôle de version
- Si le repo devient public ou est compromis, accès complet à la base de données
- Compromission de toutes les données clients

**Remédiation**:
1. Ajouter `.env` au `.gitignore` immédiatement
2. Régénérer TOUTES les clés Supabase (les actuelles sont compromises)
3. Supprimer l'historique Git contenant le fichier .env
4. Utiliser des variables d'environnement serveur (Vercel, Netlify, etc.)

---

### SEC-002: CORS configuré avec wildcard sur toutes les Edge Functions

**Localisation**: `supabase/functions/*/index.ts` (lignes 5-9)

**Code problématique**:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};
```

**Fichiers affectés**:
- `send-quote-email/index.ts`
- `send-invoice-email/index.ts`
- `sign-quote/index.ts`
- `get-quote-public/index.ts`
- `create-employee-account/index.ts`
- `test-smtp/index.ts`
- `generate-invoice-pdf/index.ts`
- `backfill-notifications/index.ts`

**Impact**:
- N'importe quel domaine peut appeler vos API
- Vulnérabilité aux attaques CSRF
- Vol de données via sites tiers malveillants

**Remédiation**:
```typescript
const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://votre-domaine.com',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true',
};
```

---

### SEC-003: Mots de passe SMTP stockés en clair

**Localisation**:
- `src/pages/Parametres.tsx` (lignes 150-155)
- Table `companies` colonne `smtp_password`

**Code problématique**:
```typescript
.update({
  smtp_password: smtpPassword,  // Stocké en clair !
})
```

**Impact**:
- Si la base de données est compromise, tous les mots de passe SMTP sont exposés
- Accès aux boîtes email des entreprises clientes
- Usurpation d'identité email

**Remédiation**:
1. Chiffrer les mots de passe avec AES-256 côté serveur
2. Stocker la clé de chiffrement dans un secret manager (Supabase Vault)
3. Déchiffrer uniquement dans les Edge Functions

---

## 🟠 PROBLÈMES ÉLEVÉS (Gravité 4/5)

### SEC-004: Vulnérabilité XSS via dangerouslySetInnerHTML

**Fichiers concernés**:
- `src/components/documents/PdfPreviewModal.tsx:278`
- `src/components/templates/LivePdfPreview.tsx:144`
- `src/components/templates/TemplatePreview.tsx:119`
- `src/components/templates/LiveEmailPreview.tsx`

**Code problématique**:
```typescript
<div dangerouslySetInnerHTML={{ __html: previewHtml }} />
```

**Vecteur d'attaque**:
Les champs `header_html`, `content_html`, `footer_html` des templates peuvent contenir du JavaScript malveillant qui sera exécuté.

**Impact**:
- Vol de session utilisateur
- Modification de données
- Keylogging

**Remédiation**:
```typescript
import DOMPurify from 'dompurify';

<div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(previewHtml) }} />
```

---

### SEC-005: Validation JWT insuffisante

**Localisation**: `supabase/functions/send-quote-email/index.ts:82-89`

**Code problématique**:
```typescript
const jwt = authHeader.replace('Bearer ', '');
const parts = jwt.split('.');
const payload = JSON.parse(atob(parts[1]));
const userId = payload.sub;  // Pas de vérification de signature !
```

**Impact**:
- Un attaquant peut forger un token JWT avec n'importe quel `sub`
- Usurpation d'identité complète
- Accès non autorisé à toutes les fonctionnalités

**Remédiation**:
```typescript
const { data: { user }, error } = await supabase.auth.getUser(token);
if (error || !user) {
  throw new Error('Token invalide');
}
const userId = user.id;
```

---

### SEC-006: Upload de fichiers non sécurisé

**Localisation**: `src/components/interventions/FilesSection.tsx:51`

**Code problématique**:
```typescript
file_url: URL.createObjectURL(file),  // URL blob temporaire !
```

**Problèmes**:
1. Fichiers non réellement uploadés (URLs temporaires)
2. Aucune validation de type MIME
3. Aucune limite de taille
4. Pas de scan antivirus

**Impact**:
- Perte de données (URLs invalides après refresh)
- Upload de fichiers malveillants
- Stockage de malware

**Remédiation**:
```typescript
// 1. Valider le type et la taille
const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
if (!allowedTypes.includes(file.type)) throw new Error('Type non autorisé');
if (file.size > 10 * 1024 * 1024) throw new Error('Fichier trop volumineux');

// 2. Upload vers Supabase Storage
const { data, error } = await supabase.storage
  .from('intervention-files')
  .upload(`${interventionId}/${file.name}`, file);
```

---

### SEC-007: Politique RLS trop permissive pour les signatures

**Localisation**: `supabase/migrations/20251207100000_add_quote_signatures.sql:24-27`

**Code problématique**:
```sql
CREATE POLICY "Allow public quote signing"
  ON public.quote_signatures
  FOR INSERT
  WITH CHECK (true);  -- Aucune vérification !
```

**Impact**:
- N'importe qui peut insérer une signature sur n'importe quel devis
- Signatures frauduleuses possibles

**Remédiation**:
Vérifier via l'Edge Function que le token correspond bien au devis avant d'insérer.

---

## 🟡 PROBLÈMES MOYENS (Gravité 3/5)

### SEC-008: Logs de debug excessifs en production

**Statistiques**: 98+ fichiers avec `console.log/error/debug`

**Exemples**:
```typescript
// src/pages/auth/Login.tsx:43
console.log("Login attempt started");
console.log("Signing in with Supabase...");

// src/pages/Parametres.tsx:51
console.log("User ID:", user.id);
```

**Impact**:
- Fuite d'informations sensibles dans la console du navigateur
- Exposition de tokens, IDs utilisateur, données métier

**Remédiation**:
```typescript
// Utiliser un logger conditionnel
if (import.meta.env.DEV) {
  console.log("Debug info...");
}
```

---

### SEC-009: Token de devis potentiellement faible

**Localisation**: `supabase/functions/send-quote-email/index.ts:201-203`

```typescript
token = crypto.randomUUID();  // 36 caractères, 122 bits d'entropie
```

**Recommandation**: Utiliser un token plus robuste
```typescript
token = crypto.randomBytes(32).toString('hex');  // 64 caractères, 256 bits
```

---

### SEC-010: Absence de rate limiting

**Endpoints concernés**:
- `get-quote-public`
- `sign-quote`
- `send-quote-email`

**Impact**:
- Brute force sur les tokens de devis
- Spam de signatures
- DoS sur les Edge Functions

---

### SEC-011: Mot de passe minimum trop faible

**Localisation**:
- `src/pages/auth/Login.tsx:129`
- `supabase/functions/create-employee-account/index.ts:77`

```typescript
if (password.length < 6) {  // Trop faible !
```

**Recommandation**: Minimum 12 caractères avec complexité

---

### SEC-012: Email non validé côté serveur

**Localisation**: `supabase/functions/send-quote-email/index.ts:70`

**Risque**: Injection d'en-têtes email

---

## 🔵 PROBLÈMES FAIBLES (Gravité 2/5)

### SEC-013: localStorage pour les sessions

Vulnérable aux attaques XSS si XSS existe.

### SEC-014: Absence de Content Security Policy (CSP)

Pas de protection contre les scripts inline.

### SEC-015: Pas de protection contre le clickjacking

L'application peut être embarquée dans une iframe malveillante.

### SEC-016: Fonctions RGPD non implémentées

Boutons "Exporter mes données" et "Supprimer mon compte" sans fonctionnalité.

---

## ⚪ RECOMMANDATIONS ADDITIONNELLES

1. **Audit des dépendances**: Exécuter `npm audit` régulièrement
2. **Tests de sécurité**: Intégrer SAST dans le CI/CD
3. **Journalisation**: Logger les actions sensibles (connexions, modifications)
4. **Headers de sécurité**: Ajouter X-Content-Type-Options, X-XSS-Protection

---

## POINTS POSITIFS

✅ Row Level Security (RLS) activé sur les tables principales
✅ Isolation multi-tenant par `company_id`
✅ Utilisation de Supabase Auth (JWT standard)
✅ Vérification des rôles avant actions administratives
✅ Service Role Key utilisé uniquement côté serveur
✅ HTTPS forcé via Supabase

---

## PLAN D'ACTION PRIORITAIRE

| # | Action | Gravité | Délai |
|---|--------|---------|-------|
| 1 | Régénérer clés Supabase + .gitignore | CRITIQUE | Immédiat |
| 2 | Restreindre CORS aux domaines autorisés | CRITIQUE | 24h |
| 3 | Chiffrer mots de passe SMTP | CRITIQUE | 48h |
| 4 | Corriger validation JWT Edge Functions | ÉLEVÉE | 7 jours |
| 5 | Implémenter DOMPurify pour XSS | ÉLEVÉE | 7 jours |
| 6 | Implémenter upload Supabase Storage | ÉLEVÉE | 14 jours |
| 7 | Supprimer console.log de production | MOYENNE | 14 jours |
| 8 | Implémenter rate limiting | MOYENNE | 21 jours |

---

*Rapport généré automatiquement par Claude Code Security Analysis*
