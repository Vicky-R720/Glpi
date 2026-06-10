# ÉTAPE 3 : Interactions et Drag & Drop

## Implémentation
Le glisser-déposer a été développé à l'aide de `@hello-pangea/dnd` (un fork moderne de `react-beautiful-dnd`).
- **DragDropContext :** Enveloppe les 3 colonnes pour détecter la fin du déplacement (`onDragEnd`).
- **Logique de validation :** Si un ticket est déplacé vers "In progress" ou "Terminé", une boîte de dialogue (Modal) bloque temporairement la requête API pour demander à l'utilisateur de fournir une "note de suivi".
- **Mise à jour API :** L'instance de `fetch()` configurée avec les headers GLPI (`App-Token`, `Session-Token`) exécute un `PUT` sur le ticket pour changer son statut de manière transparente.

## Composants impliqués (dans `TicketKanban.jsx`)

### 1. `DragDropContext`, `Droppable`, `Draggable`
- Intégrés nativement dans le composant principal.
- Gèrent l'inclinaison (`rotate(3deg)`) et l'ombre portée (shadow) lors de la préhension de la carte.

### 2. `<TransitionModal />` (Sous-composant de TicketKanban)
- **Rôle :** Modal qui s'affiche lors d'un déplacement critique (vers En cours / Terminé).
- **Fonctionnalité :** Possède un champ `<textarea>` pour saisir des informations supplémentaires (note de suivi ITIL) avant de valider.

### 3. Fonction `moveTicket`
- Met à jour l'interface utilisateur de manière optimiste (changement immédiat).
- Effectue la requête `PUT` vers `/api/Ticket/{id}`.
- Revert l'interface (retour en arrière) en cas d'erreur de communication avec l'API GLPI.
