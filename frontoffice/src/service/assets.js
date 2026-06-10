import { buildUrl } from "./api.js";

const SESSION_TOKEN = import.meta.env.VITE_SESSION_TOKEN;
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;

const HEADERS = {
  "Content-Type": "application/json",
  "Session-Token": SESSION_TOKEN,
  "App-Token": APP_TOKEN,
};

export const ASSET_TYPES = [
  { key: "Computer", label: "Ordinateur" },
  { key: "Monitor", label: "Écran / Moniteur" },
  { key: "NetworkEquipment", label: "Matériel Réseau" },
  { key: "Peripheral", label: "Périphérique" },
  { key: "Phone", label: "Téléphone" },
  { key: "Printer", label: "Imprimante" },
  { key: "Software", label: "Logiciel" },
  { key: "Consumable", label: "Consommable" },
  { key: "Cartridge", label: "Cartouche" },
  { key: "Rack", label: "Rack / Baie" },
  { key: "Pdu", label: "PDU" },
  { key: "PassiveDCEquipment", label: "Équipement DC Passif" },
  { key: "Enclosure", label: "Châssis" }
];

/**
 * Fetch assets of a single type and normalize their fields.
 */
export async function fetchAssetsByType(itemtype, typeLabel) {
  const url = `${buildUrl(itemtype)}/?range=0-200&expand_dropdowns=true`;
  try {
    const response = await fetch(url, { method: "GET", headers: HEADERS });
    if (!response.ok) {
      console.warn(`[Assets Service] Failed to fetch ${itemtype}: ${response.status} ${response.statusText}`);
      return [];
    }
    const data = await response.json();
    if (!Array.isArray(data)) return [];

    return data.map(item => {
      const modelKey = `${itemtype.toLowerCase()}models_id`;
      let modelVal = item[modelKey] || "N/A";
      
      const cleanValue = (val) => {
        if (!val || typeof val !== 'string') return val;
        const cleaned = val.replace(/&nbsp;/g, ' ').trim();
        return cleaned === '' ? 'N/A' : cleaned;
      };

      return {
        id: item.id,
        name: cleanValue(item.name) || "Sans nom",
        itemtype,
        typeLabel,
        status: cleanValue(item.states_id) || "N/A",
        location: cleanValue(item.locations_id) || "N/A",
        manufacturer: cleanValue(item.manufacturers_id) || "N/A",
        model: cleanValue(modelVal) || "N/A",
        serial: cleanValue(item.serial) || "N/A",
        inventoryNumber: cleanValue(item.otherserial) || "N/A",
        user: cleanValue(item.users_id) || "N/A",
        dateMod: item.date_mod || "N/A",
        raw: item
      };
    });
  } catch (error) {
    console.error(`[Assets Service] Error fetching type ${itemtype}:`, error);
    return [];
  }
}

/**
 * Fetch all assets from all supported types in parallel.
 */
export async function fetchAllAssets() {
  const promises = ASSET_TYPES.map(type => 
    fetchAssetsByType(type.key, type.label)
  );
  const results = await Promise.all(promises);
  return results.flat();
}

/**
 * Extract unique lists of properties to populate filter dropdowns.
 */
export function extractFilterOptions(assets) {
  const states = new Set();
  const locations = new Set();
  const manufacturers = new Set();
  const users = new Set();

  assets.forEach(item => {
    if (item.status && item.status !== "N/A") states.add(item.status);
    if (item.location && item.location !== "N/A") locations.add(item.location);
    if (item.manufacturer && item.manufacturer !== "N/A") manufacturers.add(item.manufacturer);
    if (item.user && item.user !== "N/A") users.add(item.user);
  });

  return {
    states: Array.from(states).sort(),
    locations: Array.from(locations).sort(),
    manufacturers: Array.from(manufacturers).sort(),
    users: Array.from(users).sort(),
  };
}
