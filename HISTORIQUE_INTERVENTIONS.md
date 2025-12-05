# Historique automatique des interventions

## 📋 Fonctionnalités

L'onglet "Historique" dans les interventions enregistre automatiquement :

- ✅ **Événements de pointage** : début/fin de journée, pauses
- ✅ **Changements de statut** : modification du statut de l'intervention
- ✅ **Création de facture** : quand une facture est générée depuis l'intervention
- ✅ **Modifications importantes** : dates, assignations, horaires

## 🔧 Implémentation actuelle

### Système hybride : TypeScript + SQL (optionnel)

#### 1. Logs via TypeScript (ACTIF)

Les logs sont enregistrés automatiquement via le code TypeScript :

- **Hooks React** :
  - `useInterventionTimesheetLogger` : écoute les événements de pointage en temps réel
  - `useInterventionStatusLogger` : détecte les changements de statut

- **Bibliothèque** : `src/lib/interventionLogger.ts`
  - Fonctions utilitaires pour créer des logs
  - `logTimesheetEvent()` : événements de pointage
  - `logStatusChange()` : changements de statut
  - `logInvoiceLink()` : création de facture
  - `logInterventionEvent()` : événement générique

- **Intégration** :
  - `InterventionDetail.tsx` : active les hooks automatiques
  - `FactureEditor.tsx` : enregistre la création de facture
  - `InterventionHistoryTab.tsx` : affiche l'historique en temps réel

#### 2. Triggers SQL (OPTIONNEL - Non appliqué)

Pour une redondance supplémentaire, des triggers SQL sont disponibles dans :
`supabase/migrations/20251205000000_auto_log_intervention_events.sql`

**⚠️ Ces triggers ne sont pas nécessaires car le système TypeScript est déjà actif.**

Si vous souhaitez les activer malgré tout :

##### Option A : Via Supabase Dashboard

1. Ouvrir le Dashboard Supabase
2. Aller dans **SQL Editor**
3. Copier le contenu de `supabase/migrations/20251205000000_auto_log_intervention_events.sql`
4. Exécuter le script

##### Option B : Via Supabase CLI

```bash
npx supabase db push
```

**Note** : Les triggers SQL créeront des doublons car le système TypeScript enregistre déjà les événements.

## 📊 Affichage de l'historique

L'onglet "Historique" dans une intervention affiche :

- **Badge coloré** : type d'action
- **Horodatage** : date et heure précise
- **Détails** : description de l'événement
- **Utilisateur** : qui a effectué l'action

**Filtres disponibles** :
- Toutes les actions
- Création
- Modification
- Changement statut
- Facturation
- Planning

## 🔄 Mise à jour en temps réel

L'historique se met à jour automatiquement via **Supabase Realtime** :
- Pas besoin de recharger la page
- Les nouveaux événements apparaissent instantanément

## 🧪 Test de fonctionnement

Pour vérifier que le système fonctionne :

1. **Ouvrir une intervention**
2. **Aller dans l'onglet Historique**
3. **Effectuer une action** :
   - Changer le statut de l'intervention
   - Créer une facture depuis l'intervention
   - Faire pointer un employé sur l'intervention (via l'app mobile)
4. **Vérifier** : l'événement doit apparaître dans l'historique

## 🐛 Dépannage

### L'historique est vide

- Vérifier que des actions ont été effectuées APRÈS l'implémentation du système
- Les anciennes interventions n'ont pas d'historique (c'est normal)
- Ouvrir la console du navigateur pour voir les erreurs éventuelles

### Les événements n'apparaissent pas

1. Vérifier la connexion Realtime Supabase
2. Vérifier les permissions sur la table `intervention_logs`
3. Regarder les logs de la console pour les erreurs

### Doublons dans l'historique

- Si vous avez activé les triggers SQL ET que le code TypeScript est actif, désactiver l'un des deux
- Recommandation : **garder uniquement le système TypeScript**

## 📝 Structure de la table `intervention_logs`

```sql
CREATE TABLE intervention_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  intervention_id UUID REFERENCES jobs(id),
  action TEXT NOT NULL,
  details TEXT,
  user_name TEXT,
  user_id UUID,
  company_id UUID,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

## 🎯 Prochaines améliorations possibles

- [ ] Export de l'historique en PDF
- [ ] Notifications par email sur certains événements
- [ ] Graphique chronologique visuel
- [ ] Filtres avancés (par utilisateur, par période)
