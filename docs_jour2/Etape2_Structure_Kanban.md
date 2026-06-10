# ÉTAPE 2 : Structure de la Vue Kanban (FrontOffice)

## Implémentation
Le frontoffice nécessitait un nouveau point d'entrée pour le tableau Kanban. Plutôt que de surcharger l'existant, nous avons créé un hook métier et un composant Kanban unique.

1. **Synchronisation :** Le hook `useKanbanConfig` écoute les modifications du `localStorage` (effectuées depuis le backoffice) afin de mettre à jour instantanément les couleurs et noms des colonnes sans rechargement de page.
2. **Colonnes Kanban :** Les 3 colonnes ("Nouveau", "In progress", "Terminé") sont générées dynamiquement en se basant sur le statut API de GLPI (Nouveau=1, En cours=2,3,4, Terminé=5,6).
3. **Cartes (Cards) :** Design dense, reprenant les conventions de couleurs pour les niveaux d'urgence (Vert, Orange, Rouge).

## Fichiers Modifiés / Créés

### 1. `frontoffice/src/service/useKanbanConfig.js` [Nouveau]
*Hook React pour la synchronisation des préférences.*
```javascript
export function useKanbanConfig() {
  const [config, setConfig] = useState(readConfig);
  // Écoute de window.addEventListener('storage', ...)
  return { config };
}
```

### 2. `frontoffice/src/page/TicketKanban.jsx` [Nouveau]
*Composant principal contenant toute la logique du tableau.*
- Mappe les tickets issus de l'API GLPI dans les 3 colonnes.
- Affiche le compteur de tickets dans le header de chaque colonne.

### 3. `frontoffice/src/page/TicketKanban.css` [Nouveau]
*Styles dédiés au Kanban.*
- Design structuré : `.kanban-board`, `.kanban-column`, `.kanban-card`.

### 4. `frontoffice/src/App.jsx` [Modifié]
- Ajout de la route `/kanban` et d'un lien `NavLink` dans le header principal.
