# ÉTAPE 1 : Analyse et Configuration Backoffice

## Analyse de l'intégration
L'application existante est scindée en deux parties (Frontoffice et Backoffice) qui communiquent de manière native avec l'API GLPI en utilisant les tokens `App-Token` et `Session-Token`. 
Afin d'ajouter la configuration du Kanban sans casser le code existant, nous avons adopté la stratégie suivante :
1. **Simulation SQLite :** Le back-end SQLite n'étant pas actif dans ce contexte, nous utilisons le `localStorage` du navigateur avec la clé `kanban_config` pour simuler une base de données persistante (les changements se répercutent instantanément entre les onglets via les événements de stockage).
2. **Backoffice :** Ajout d'une nouvelle route et d'un onglet dans la `Sidebar` existante.
3. **Frontoffice :** Création d'un hook React personnalisé qui charge dynamiquement les couleurs et noms de colonnes configurés par l'administrateur.

## Fichiers Modifiés / Créés

### 1. `backoffice/src/service/kanbanConfig.js` [Nouveau]
*Service permettant la persistance des données Kanban.*
```javascript
export function getKanbanConfig() {
  const stored = localStorage.getItem('kanban_config');
  // Logique de chargement avec fallback sur DEFAULT_CONFIG
}
```

### 2. `backoffice/src/page/KanbanConfig.jsx` [Nouveau]
*Page d'administration pour définir les couleurs (Color Picker) et les noms en Malgache.*
- Permet de personnaliser "Nouveau", "In progress" et "Terminé".
- Affiche un aperçu en direct de la couleur choisie.

### 3. `backoffice/src/App.jsx` [Modifié]
- Ajout de la route `/kanban-config` dans le router protégé.

### 4. `backoffice/src/components/Sidebar.jsx` [Modifié]
- Ajout du lien vers la configuration dans la section "Paramètres".
