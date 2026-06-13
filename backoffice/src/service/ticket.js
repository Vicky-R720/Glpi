import { buildUrl } from "./api.js";

const SESSION_TOKEN = import.meta.env.VITE_SESSION_TOKEN;
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;

const HEADERS = {
  "Content-Type": "application/json",
  "Session-Token": SESSION_TOKEN,
  "App-Token": APP_TOKEN,
};

/**
 * Récupère tous les tickets de GLPI
 */
export async function getTicketsList() {
  const url = `${buildUrl("Ticket")}/?range=0-999&sort=id&order=DESC`;
  const response = await fetch(url, { method: "GET", headers: HEADERS });
  if (!response.ok) throw new Error("Échec du chargement des tickets");
  return await response.json();
}

/**
 * Récupère la fiche détaillée d'un ticket par son ID
 */
export async function getTicketDetails(ticketId) {
  const url = `${buildUrl("Ticket")}/${ticketId}?expand_dropdowns=true`;
  const response = await fetch(url, { method: "GET", headers: HEADERS });
  if (!response.ok) throw new Error(`Échec du chargement du ticket #${ticketId}`);
  return await response.json();
}

/**
 * Récupère les équipements associés à un ticket (ex: Computer, Monitor)
 */
export async function getTicketLinkedItems(ticketId) {
  const url = `${buildUrl("Ticket")}/${ticketId}/Item_Ticket?expand_dropdowns=true`;
  const response = await fetch(url, { method: "GET", headers: HEADERS });
  if (!response.ok) return []; // Retourne vide si aucun lien
  return await response.json();
}

/**
 * Récupère les détails financiers et de temps (coûts) liés à un ticket
 */
export async function getTicketCosts(ticketId) {
  const url = `${buildUrl("Ticket")}/${ticketId}/TicketCost`;
  const response = await fetch(url, { method: "GET", headers: HEADERS });
  if (!response.ok) return []; // Retourne vide si aucun coût saisi
  return await response.json();
}

/**
 * Récupère tous les prix saisis sur le Kanban (SQLite)
 */
export async function getKanbanAsks() {
  const response = await fetch("http://localhost:8080/api/ask");
  if (!response.ok) return [];
  return await response.json();
}

export async function getKanbanReo() {
  const response = await fetch("http://localhost:8080/api/reo");
  if (!response.ok) return [];
  return await response.json();
}