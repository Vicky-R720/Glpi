import { buildUrl } from "./api.js";

// Liste complète des entités disponibles pour réinitialisation
export const RESET_ENTITIES = [
  // ITIL
  { key: "Ticket", label: "Tickets & Incidents (Ticket)" },
  
  // Éléments physiques et logiciels (Assets)
  { key: "Computer", label: "Ordinateurs (Computer)" },
  { key: "Monitor", label: "Écrans & Moniteurs (Monitor)" },
  { key: "NetworkEquipment", label: "Matériels Réseau (NetworkEquipment)" },
  { key: "Peripheral", label: "Périphériques (Peripheral)" },
  { key: "Phone", label: "Téléphones (Phone)" },
  { key: "Printer", label: "Imprimantes (Printer)" },
  { key: "Software", label: "Logiciels (Software)" },
  { key: "Consumable", label: "Consommables (Consumable)" },
  { key: "Cartridge", label: "Cartouches (Cartridge)" },
  { key: "Rack", label: "Racks / Baies (Rack)" },
  { key: "Pdu", label: "PDUs (Pdu)" },
  { key: "PassiveDCEquipment", label: "Équipements DC Passifs (PassiveDCEquipment)" },
  { key: "Enclosure", label: "Châssis (Enclosure)" },

  // Modèles correspondants aux équipements (pour nettoyage propre)
  { key: "ComputerModel", label: "Modèles d'Ordinateur (ComputerModel)" },
  { key: "MonitorModel", label: "Modèles d'Écran (MonitorModel)" },
  { key: "NetworkEquipmentModel", label: "Modèles Matériels Réseau (NetworkEquipmentModel)" },
  { key: "PeripheralModel", label: "Modèles de Périphérique (PeripheralModel)" },
  { key: "PhoneModel", label: "Modèles de Téléphone (PhoneModel)" },
  { key: "PrinterModel", label: "Modèles d'Imprimante (PrinterModel)" },
  { key: "RackModel", label: "Modèles de Rack (RackModel)" },
  { key: "PduModel", label: "Modèles de Pdu (PduModel)" },
  { key: "EnclosureModel", label: "Modèles de Châssis (EnclosureModel)" },
  { key: "PassiveDCEquipmentModel", label: "Modèles d'Équipement DC Passif (PassiveDCEquipmentModel)" },

  // Métadonnées & Configuration
  { key: "Location", label: "Lieux (Location)" },
  { key: "Manufacturer", label: "Fabricants (Manufacturer)" },
  { key: "State", label: "Statuts / États (State)" },
  { key: "User", label: "Utilisateurs (User)" },
];

// Ordre strict de suppression (satisfaire les clés étrangères)
const dependencyOrder = [
  "TicketCost",
  "Ticket",
  
  // Suppression des équipements d'abord (qui référencent des modèles/lieux/fabricants)
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
  "Enclosure",

  // Suppression des modèles associés
  "ComputerModel",
  "MonitorModel",
  "NetworkEquipmentModel",
  "PeripheralModel",
  "PhoneModel",
  "PrinterModel",
  "RackModel",
  "PduModel",
  "EnclosureModel",
  "PassiveDCEquipmentModel",

  // Suppression des tables parentes globales
  "Location",
  "State",
  "Manufacturer",
  "User",
];

const SESSION_TOKEN = import.meta.env.VITE_SESSION_TOKEN;
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;

export async function fetchEntityIds(entity) {
  const url = `${buildUrl(entity)}/?only_id=true&range=0-9999`;
  const response = await fetch(url, {
    method: "GET",
    headers: {
      "Content-Type": "application/json",
      "Session-Token": SESSION_TOKEN,
      "App-Token": APP_TOKEN,
    },
  });

  if (!response.ok) {
    if (response.status === 404) return [];
    throw new Error(`HTTP ${response.status} - ${response.statusText}`);
  }

  const data = await response.json();
  if (Array.isArray(data)) {
    return data.map((item) => item.id);
  }
  return [];
}

export async function resetEntity(entity) {
  const ids = await fetchEntityIds(entity);
  if (ids.length === 0) {
    return { count: 0, results: [] };
  }

  // GLPI bulk delete uses DELETE /api/itemtype/
  const url = `${buildUrl(entity)}/`;
  const response = await fetch(url, {
    method: "DELETE",
    headers: {
      "Content-Type": "application/json",
      "Session-Token": SESSION_TOKEN,
      "App-Token": APP_TOKEN,
    },
    body: JSON.stringify({
      input: ids.map((id) => ({ id })),
      force_purge: true,
    }),
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`HTTP ${response.status} - ${text || response.statusText}`);
  }

  const results = await response.json();
  return { count: ids.length, results };
}

export async function resetEntities(entities, onProgress) {
  // Sort entities based on dependencyOrder
  const sorted = [...entities].sort((a, b) => {
    const idxA = dependencyOrder.indexOf(a);
    const idxB = dependencyOrder.indexOf(b);
    return idxA - idxB;
  });

  const results = [];
  for (const entity of sorted) {
    if (onProgress) onProgress(entity, "loading");
    try {
      const res = await resetEntity(entity);
      results.push({ entity, success: true, ...res });
      if (onProgress) onProgress(entity, "success", res.count);
    } catch (err) {
      console.error(`Error resetting ${entity}:`, err);
      results.push({ entity, success: false, error: err.message });
      if (onProgress) onProgress(entity, "error", 0, err.message);
    }
  }
  return results;
}
