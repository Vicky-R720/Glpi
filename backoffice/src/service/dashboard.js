import { buildUrl } from "./api.js";
import { RESET_ENTITIES } from "./reset.js";

const SESSION_TOKEN = import.meta.env.VITE_SESSION_TOKEN;
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;

const HEADERS = {
  "Content-Type": "application/json",
  "Session-Token": SESSION_TOKEN,
  "App-Token": APP_TOKEN,
};

// Liste des équipements d'inventaire réels (exclut les modèles, lieux, utilisateurs, etc.)
const INVENTORY_ASSETS = [
  "Computer",
  "Monitor",
  "NetworkEquipment",
  "Peripheral",
  "Phone",
  "Printer",
  "Software",
  "Consumable",
  "Cartridge",
  "Rack",
  "Pdu",
  "PassiveDCEquipment",
  "Enclosure"
];

/**
 * Récupère le nombre d'éléments pour une entité spécifique via les en-têtes de réponse
 */
export async function getEntityCount(entity) {
  const url = `${buildUrl(entity)}/?range=0-0`;
  const response = await fetch(url, { method: "GET", headers: HEADERS });
  
  if (!response.ok) {
    if (response.status === 404) return 0;
    throw new Error(`Erreur de comptage sur ${entity}`);
  }

  const contentRange = response.headers.get("Content-Range");
  if (contentRange) {
    const total = contentRange.split("/")[1];
    return parseInt(total, 10);
  }

  const data = await response.json();
  return Array.isArray(data) ? data.length : 0;
}

/**
 * Charge tous les tickets pour en faire l'analyse détaillée
 */
export async function getTicketsData() {
  const url = `${buildUrl("Ticket")}/?range=0-9999&sort=id&order=DESC`; // Tri par ID décroissant
  const response = await fetch(url, { method: "GET", headers: HEADERS });

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error("Erreur lors de la récupération des tickets");
  }

  const data = await response.json();
  return Array.isArray(data) ? data : [];
}

/**
 * Récupère et agrège toutes les statistiques du parc et des tickets pour le dashboard
 */
export async function fetchDashboardMetrics() {
  // 1. Comptage en parallèle des équipements d'inventaire
  const countPromises = INVENTORY_ASSETS.map(async (type) => {
    try {
      const count = await getEntityCount(type);
      return { type, count };
    } catch (e) {
      console.error(`Erreur pour ${type}:`, e);
      return { type, count: 0 };
    }
  });

  const countResults = await Promise.all(countPromises);

  const assetDetails = {};
  let assetTotal = 0;
  countResults.forEach(({ type, count }) => {
    assetDetails[type] = count;
    assetTotal += count;
  });

  // 2. Analyse détaillée des tickets
  const tickets = await getTicketsData();

  const ticketTypes = {
    incident: 0,
    request: 0,
  };

  const ticketStatuses = {
    new: 0,         // Nouveau (1)
    processing: 0,  // En cours (2: Attribué, 3: Planifié)
    pending: 0,     // En attente (4)
    resolved: 0,    // Résolu (5)
    closed: 0,      // Clos (6)
  };

  tickets.forEach((ticket) => {
    // Calcul par type
    if (parseInt(ticket.type, 10) === 1) {
      ticketTypes.incident++;
    } else if (parseInt(ticket.type, 10) === 2) {
      ticketTypes.request++;
    }

    // Calcul par statut
    const status = parseInt(ticket.status, 10);
    if (status === 1) ticketStatuses.new++;
    else if (status === 2 || status === 3) ticketStatuses.processing++;
    else if (status === 4) ticketStatuses.pending++;
    else if (status === 5) ticketStatuses.resolved++;
    else if (status === 6) ticketStatuses.closed++;
  });

  return {
    assets: {
      total: assetTotal,
      details: assetDetails,
    },
    tickets: {
      total: tickets.length,
      types: ticketTypes,
      statuses: ticketStatuses,
      list: tickets
    }
  };
}
