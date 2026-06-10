# ÉTAPE 4 : Actions sur les Tickets (Création et Détails)

## Implémentation
Afin d'offrir une expérience utilisateur fluide, toutes les actions de visualisation et de création rapide sont gérées sans quitter la page Kanban.

### 1. Création rapide
- **Où ?** Un bouton `+ Ajouter 1 ticket` est positionné à la fin de la colonne "Nouveau".
- **Comment ?** Il ouvre le composant `<QuickCreateModal />`.
- **API :** Exécute un appel `POST /api/Ticket/` avec le statut forcé à 1 (Nouveau), en reprenant les headers GLPI natifs du Jour 1.

### 2. Affichage des détails
- **Où ?** Le volet s'ouvre depuis la droite de l'écran lors d'un clic sur une carte.
- **Contenu :** Affiche la description formatée en HTML (telle que stockée par GLPI) ainsi que les informations de tracking (Date de création, urgence).
- **Matériels associés :** Une requête supplémentaire `GET /api/Ticket/{id}/Item_Ticket` est lancée pour lister tous les équipements (Ordinateurs, Moniteurs, etc.) liés à ce ticket spécifique, réutilisant ainsi le travail effectué au Jour 1.

## Composants impliqués (dans `TicketKanban.jsx`)

### 1. `<QuickCreateModal />` (Sous-composant)
- Formulaire allégé ne demandant que : Titre, Description et Urgence.

### 2. `<TicketDrawer />` (Sous-composant)
- Drawer coulissant (`transform: translateX(0)`) utilisant une animation CSS fluide.
- Gère son propre état de chargement (`loading`) pendant qu'il fetch les détails complexes du ticket sur GLPI.
