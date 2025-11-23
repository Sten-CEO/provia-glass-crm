# 🔐 Guide des Contrôles d'Accès (Access Controls)

**Date**: 2025-11-23
**Projet**: Provia BASE CRM

---

## 📋 VUE D'ENSEMBLE

Le système de contrôles d'accès permet de gérer finement les autorisations de chaque membre de l'équipe. Vous pouvez décider qui peut voir et accéder à quelles sections du CRM.

### Fonctionnalités

✅ **Navigation Dynamique** : Les menus affichent uniquement les sections autorisées
✅ **Protection des Routes** : Redirection automatique si accès non autorisé
✅ **Notification** : Toast d'erreur explicite en cas d'accès refusé
✅ **Rôles Prédéfinis** : Owner et Admin ont accès complet par défaut

---

## 🎯 SECTIONS CONTRÔLABLES

Voici les sections que vous pouvez activer/désactiver pour chaque membre :

| Section | Clé | Description |
|---------|-----|-------------|
| **Tableau de bord** | `dashboard` | Vue d'ensemble CA, statistiques |
| **Devis** | `devis` | Création et gestion des devis |
| **Planning** | `planning` | Vue planning des interventions |
| **Agenda** | `agenda` | Calendrier et événements |
| **Interventions** | `jobs` | Gestion des interventions |
| **Pointage** | `timesheets` | Feuilles de temps et pointage |
| **Clients** | `clients` | Gestion clients et contrats |
| **Factures** | `factures` | Création et gestion factures |
| **Paiements** | `paiements` | Suivi des paiements |
| **Inventaire** | `inventaire` | Gestion stock et achats |
| **Équipe** | `equipe` | Gestion des membres |
| **Paramètres** | `parametres` | Configuration du CRM |

**Note** : La page Support est accessible à tous sans restriction.

---

## 👥 GESTION PAR RÔLE

### Owner et Admin

**Accès par défaut** : Complet (toutes les sections)

Les Owner et Admin ont automatiquement accès à toutes les fonctionnalités. Vous pouvez néanmoins restreindre certaines sections via les `access_controls` si nécessaire.

### Manager, Backoffice, Employé Terrain

**Accès par défaut** : Selon les `access_controls` configurés

Ces rôles n'ont accès qu'aux sections explicitement autorisées dans leurs `access_controls`.

---

## 🛠️ CONFIGURATION DES ACCÈS

### Via l'Interface (Page Équipe)

1. **Allez sur** `/equipe`
2. **Cliquez sur "Modifier"** (icône crayon) pour un membre
3. **Section "Accès UI"** : Cochez/décochez les sections autorisées
4. **Cliquez "Enregistrer"**

### Directement en Base de Données

**Table** : `equipe`
**Colonne** : `access_controls` (jsonb)

**Structure** :
```json
{
  "dashboard": true,
  "devis": true,
  "planning": false,
  "agenda": true,
  "jobs": true,
  "timesheets": false,
  "clients": true,
  "factures": true,
  "paiements": false,
  "inventaire": false,
  "equipe": false,
  "parametres": false
}
```

**Requête SQL exemple** :
```sql
UPDATE equipe
SET access_controls = '{
  "dashboard": true,
  "devis": true,
  "clients": true,
  "factures": true
}'::jsonb
WHERE id = 'member-uuid-here';
```

---

## 🔒 FONCTIONNEMENT TECHNIQUE

### 1. Hook `useAccessControls`

**Fichier** : `src/hooks/useAccessControls.tsx`

**Ce qu'il fait** :
1. Récupère le `user_id` de la session Supabase
2. Fetch le `role` et `access_controls` depuis la table `equipe`
3. Si Owner ou Admin → accès complet par défaut
4. Sinon → accès selon `access_controls`

**Utilisation dans un composant** :
```typescript
import { useAccessControls } from '@/hooks/useAccessControls';

function MyComponent() {
  const { hasAccess, userRole, loading } = useAccessControls();

  if (loading) return <Loader />;

  if (!hasAccess('devis')) {
    return <p>Vous n'avez pas accès aux devis</p>;
  }

  return <DevisContent />;
}
```

---

### 2. Composant `ProtectedRoute`

**Fichier** : `src/components/layout/ProtectedRoute.tsx`

**Ce qu'il fait** :
1. Vérifie si l'utilisateur a l'accès requis
2. Si OUI → Affiche le contenu
3. Si NON → Affiche un toast d'erreur + redirige vers `/tableau-de-bord`

**Utilisation dans App.tsx** :
```typescript
<Route
  path="/devis"
  element={
    <ProtectedRoute requiredAccess="devis">
      <Devis />
    </ProtectedRoute>
  }
/>
```

---

### 3. Sidebar Dynamique

**Fichier** : `src/components/layout/Sidebar.tsx`

**Ce qu'il fait** :
1. Filtre les items de navigation selon `hasAccess(accessKey)`
2. Cache automatiquement les sections non autorisées
3. Masque les sections entières si tous les items sont filtrés

**Configuration des items** :
```typescript
const navSections = [
  {
    label: "OPÉRATIONS",
    items: [
      {
        title: "Devis",
        icon: FileText,
        path: "/devis",
        accessKey: "devis"  // ← Vérifié par hasAccess()
      },
      // ...
    ],
  },
];
```

---

## 📊 EXEMPLES D'UTILISATION

### Exemple 1 : Manager Commercial

**Besoins** :
- Gestion clients et devis
- Consultation planning
- PAS d'accès inventaire, équipe, paramètres

**Configuration** :
```json
{
  "dashboard": true,
  "devis": true,
  "planning": true,
  "agenda": true,
  "jobs": false,
  "timesheets": false,
  "clients": true,
  "factures": true,
  "paiements": true,
  "inventaire": false,
  "equipe": false,
  "parametres": false
}
```

**Résultat** :
- ✅ Voit : Tableau de bord, Devis, Planning, Agenda, Clients, Factures, Paiements
- ❌ Ne voit pas : Interventions, Pointage, Inventaire, Équipe, Paramètres

---

### Exemple 2 : Backoffice Facturation

**Besoins** :
- Facturation et paiements uniquement
- Consultation clients

**Configuration** :
```json
{
  "dashboard": false,
  "devis": false,
  "planning": false,
  "agenda": false,
  "jobs": false,
  "timesheets": false,
  "clients": true,
  "factures": true,
  "paiements": true,
  "inventaire": false,
  "equipe": false,
  "parametres": false
}
```

**Résultat** :
- ✅ Voit : Clients, Factures, Paiements
- ❌ Ne voit pas : Tout le reste

---

### Exemple 3 : Manager avec Accès Complet

**Besoins** :
- Accès à tout sauf Paramètres

**Configuration** :
```json
{
  "dashboard": true,
  "devis": true,
  "planning": true,
  "agenda": true,
  "jobs": true,
  "timesheets": true,
  "clients": true,
  "factures": true,
  "paiements": true,
  "inventaire": true,
  "equipe": true,
  "parametres": false
}
```

---

## 🚨 COMPORTEMENT EN CAS D'ACCÈS REFUSÉ

### Scénario 1 : Via Navigation

1. **Utilisateur** clique sur un lien dans le menu
2. **Sidebar** cache le lien → Impossible de cliquer

**Résultat** : Le lien n'apparaît même pas.

---

### Scénario 2 : Via URL Directe

1. **Utilisateur** tape manuellement `/devis` dans l'URL
2. **ProtectedRoute** vérifie `hasAccess('devis')`
3. **Si refusé** :
   - Affiche un toast : "Accès refusé - Vous n'avez pas les autorisations nécessaires..."
   - Redirige vers `/tableau-de-bord`
   - Log console : `❌ Access denied to devis for role Manager`

**Résultat** : L'utilisateur ne peut PAS accéder à la page, même en tapant l'URL.

---

## 🔧 DÉPANNAGE

### Problème : Un membre ne voit aucune section

**Cause possible** : `access_controls` est vide ou null

**Solution** :
```sql
-- Vérifier
SELECT id, nom, role, access_controls
FROM equipe
WHERE user_id = 'user-id-here';

-- Corriger (exemple : accès basique)
UPDATE equipe
SET access_controls = '{
  "dashboard": true,
  "clients": true
}'::jsonb
WHERE user_id = 'user-id-here';
```

---

### Problème : Owner/Admin ne voit pas une section

**Cause possible** : `access_controls` override le comportement par défaut

**Solution** :
- Les Owner/Admin ont accès complet PAR DÉFAUT
- MAIS si `access_controls` est défini, il peut overrider
- Vérifiez : `access_controls.{section}` ne doit pas être `false`

---

### Problème : Toast d'erreur ne s'affiche pas

**Vérification** :
1. `<Toaster />` ou `<Sonner />` est présent dans `App.tsx` ✅
2. `toast` est bien importé de `"sonner"` ✅

---

## 📚 RÉFÉRENCE API

### `useAccessControls()`

**Retourne** :
```typescript
{
  accessControls: AccessControls;  // Objet des permissions
  userRole: string | null;         // Rôle du user
  hasAccess: (key: keyof AccessControls) => boolean;  // Fonction de vérification
  loading: boolean;                // État de chargement
}
```

**Exemple** :
```typescript
const { hasAccess, userRole, loading } = useAccessControls();

if (loading) return <Loader />;

console.log('Role:', userRole);  // "Admin", "Manager", etc.

if (hasAccess('devis')) {
  console.log('User can access devis');
}
```

---

### `ProtectedRoute`

**Props** :
```typescript
{
  children: ReactNode;                      // Contenu à protéger
  requiredAccess?: keyof AccessControls;    // Section requise (optionnel)
}
```

**Exemple** :
```typescript
// Protéger une route
<ProtectedRoute requiredAccess="factures">
  <FacturesPage />
</ProtectedRoute>

// Ou sans restriction spécifique (juste auth)
<ProtectedRoute>
  <ProfilPage />
</ProtectedRoute>
```

---

## 🎯 BONNES PRATIQUES

### 1. Définir des Accès Cohérents

Si vous donnez accès aux **Factures**, donnez aussi accès aux **Clients** (pour pouvoir créer des factures).

### 2. Tester les Permissions

Après configuration :
1. **Déconnectez-vous**
2. **Reconnectez-vous** avec le compte modifié
3. **Vérifiez** que seules les sections autorisées apparaissent

### 3. Documenter les Rôles

Créez un tableau récapitulatif des accès par rôle dans votre documentation interne.

### 4. Éviter les Configurations Vides

Un membre avec `access_controls = {}` ou `null` ne verra RIEN (sauf s'il est Owner/Admin).

---

## 🚀 ÉVOLUTIONS FUTURES POSSIBLES

- [ ] **Permissions granulaires** : Lecture seule vs Écriture
- [ ] **Groupes de permissions** : Templates prédéfinis (Commercial, Technicien, etc.)
- [ ] **Logs d'accès** : Tracer qui accède à quoi et quand
- [ ] **Interface UI** : Interface graphique pour gérer les permissions (drag & drop)
- [ ] **Permissions temporaires** : Donner un accès limité dans le temps

---

**Project ID** : `rryjcqcxhpccgzkhgdqr`
**Date** : 2025-11-23
