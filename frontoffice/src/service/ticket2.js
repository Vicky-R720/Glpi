import { buildUrl } from "./api.js";


const SESSION_TOKEN = import.meta.env.VITE_SESSION_TOKEN;
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;

const HEADERS = {
    "Content-Type": "application/json",
    "Session-Token": SESSION_TOKEN,
    "App-Token": APP_TOKEN,
};

export async function getTicketsList() {
    const url = `${buildUrl("Ticket")}/?range=0-999&sort=id&order=DESC`;
    const response = await fetch(url, {
        method: "GET", headers: HEADERS
    });
    
    if (!response.ok) throw new Error("Échec du chargement des tickets");
    return await response.json();
}

export async function getdetailTicket(id) {
    const url = `${buildUrl("Ticket")}/${id}?expand_dropdowns=true`;
    const response = await fetch(url, {
        method: "GET", headers: HEADERS
    });
    
    if (!response.ok) throw new Error("Échec du chargement du ticket");
    return await response.json();
}

export async function getTicketLinkedItems(ticketId) {
  const url = `${buildUrl("Ticket")}/${ticketId}/Item_Ticket?expand_dropdowns=true`;
  const response = await fetch(url, { method: "GET", headers: HEADERS });
  if (!response.ok) return [];
  return await response.json();
}

export async function getTicketCosts(ticketId) {
  const url = `${buildUrl("Ticket")}/${ticketId}/TicketCost`;
  const response = await fetch(url, { method: "GET", headers: HEADERS });
  if (!response.ok) return [];
  return await response.json();
}

// Dans frontoffice/src/service/ticket2.js
export async function updateTicketStatus(ticketId, newStatusId) {
    const url = `${buildUrl("Ticket")}/${ticketId}`;
    const response = await fetch(url, {
        method: "PUT", // ou PATCH selon la configuration de votre API
        headers: HEADERS,
        body: JSON.stringify({
            input: {
                id: ticketId,
                status: newStatusId
            }
        })
    });
    
    if (!response.ok) throw new Error("Échec de la mise à jour du statut");
    return await response.json();
}
