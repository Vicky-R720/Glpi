import { buildUrl } from "./api.js";

const SESSION_TOKEN = import.meta.env.VITE_SESSION_TOKEN;
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;

const HEADERS = {
  "Content-Type": "application/json",
  "Session-Token": SESSION_TOKEN,
  "App-Token": APP_TOKEN,
};

/**
 * Fetch ITIL categories from GLPI.
 */
export async function fetchITILCategories() {
  const url = `${buildUrl("ITILCategory")}/?range=0-500&expand_dropdowns=true`;
  try {
    const response = await fetch(url, { method: "GET", headers: HEADERS });
    if (!response.ok) {
      console.warn(`[Ticket Service] Failed to fetch ITILCategory: ${response.status} ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[Ticket Service] Error fetching ITIL categories:", error);
    return [];
  }
}

/**
 * Fetch locations from GLPI.
 */
export async function fetchLocations() {
  const url = `${buildUrl("Location")}/?range=0-500&expand_dropdowns=true`;
  try {
    const response = await fetch(url, { method: "GET", headers: HEADERS });
    if (!response.ok) {
      console.warn(`[Ticket Service] Failed to fetch Location: ${response.status} ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[Ticket Service] Error fetching locations:", error);
    return [];
  }
}

/**
 * Fetch users from GLPI.
 */
export async function fetchUsers() {
  const url = `${buildUrl("User")}/?range=0-500&expand_dropdowns=true`;
  try {
    const response = await fetch(url, { method: "GET", headers: HEADERS });
    if (!response.ok) {
      console.warn(`[Ticket Service] Failed to fetch User: ${response.status} ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    return Array.isArray(data) ? data : [];
  } catch (error) {
    console.error("[Ticket Service] Error fetching users:", error);
    return [];
  }
}

/**
 * Create a Ticket, associate multiple assets, and associate multiple observers.
 * 
 * @param {Object} ticketInput - The ticket properties (name, content, type, urgency, impact, itilcategories_id, locations_id)
 * @param {Array} associatedAssets - List of selected asset objects containing id and itemtype
 * @param {Array} observers - List of selected user objects representing observers
 */
export async function createTicketWithDetails(ticketInput, associatedAssets = [], observers = []) {
  const url = `${buildUrl("Ticket")}/`;
  try {
    // 1. Create the Ticket
    const response = await fetch(url, {
      method: "POST",
      headers: HEADERS,
      body: JSON.stringify({ input: ticketInput }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Erreur lors de la création du ticket: ${errorText}`);
    }

    const ticketData = await response.json();
    const ticketId = ticketData.id;

    if (!ticketId) {
      throw new Error("L'API GLPI n'a pas renvoyé d'identifiant pour le ticket créé.");
    }

    // 2. Link assets one-by-one via Item_Ticket
    const assetPromises = associatedAssets.map(async (asset) => {
      const linkUrl = `${buildUrl("Item_Ticket")}/`;
      try {
        const linkRes = await fetch(linkUrl, {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({
            input: {
              tickets_id: ticketId,
              itemtype: asset.itemtype,
              items_id: asset.id,
            },
          }),
        });

        if (!linkRes.ok) {
          const errText = await linkRes.text();
          console.warn(`[Ticket Service] Impossible d'associer ${asset.itemtype} #${asset.id} au ticket #${ticketId}:`, errText);
        }
      } catch (err) {
        console.error(`[Ticket Service] Erreur lors de l'association de l'élément:`, err);
      }
    });

    // 3. Link observers one-by-one via Ticket_User (type = 2)
    const observerPromises = observers.map(async (observer) => {
      const linkUrl = `${buildUrl("Ticket_User")}/`;
      try {
        const linkRes = await fetch(linkUrl, {
          method: "POST",
          headers: HEADERS,
          body: JSON.stringify({
            input: {
              tickets_id: ticketId,
              users_id: observer.id,
              type: 2, // 2 = Observateur
            },
          }),
        });

        if (!linkRes.ok) {
          const errText = await linkRes.text();
          console.warn(`[Ticket Service] Impossible d'associer l'observateur #${observer.id} au ticket #${ticketId}:`, errText);
        }
      } catch (err) {
        console.error(`[Ticket Service] Erreur lors de l'association de l'observateur:`, err);
      }
    });

    // Wait for all associations to finish (or attempt to finish)
    await Promise.all([...assetPromises, ...observerPromises]);

    return { success: true, ticketId };
  } catch (error) {
    console.error("[Ticket Service] Erreur lors de createTicketWithDetails:", error);
    return { success: false, error: error.message };
  }
}
