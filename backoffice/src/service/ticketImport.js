const API_BASE = import.meta.env.VITE_API_BASE;

const getHeaders = () => ({
  'App-Token': import.meta.env.VITE_APP_TOKEN,
  'Session-Token': import.meta.env.VITE_SESSION_TOKEN,
  'Content-Type': 'application/json',
});

// ---------------------------------------------------------------------------
// Row normalisation — handles BOM, whitespace, casing, and column aliases
// ---------------------------------------------------------------------------

/**
 * Canonical column aliases.
 * Keys are lowercase, stripped of BOM / whitespace.
 * Values are the canonical field names used throughout the rest of the code.
 */
const COLUMN_ALIASES = {
  ref_ticket: 'Ref_Ticket',
  ref: 'Ref_Ticket',
  date: 'Date',
  heure: 'Heure',
  time: 'Heure',
  type: 'Type',
  titre: 'Titre',
  titre_: 'Titre',
  title: 'Titre',
  name: 'Titre',
  description: 'Description',
  content: 'Description',
  status: 'Status',
  statut: 'Status',
  priority: 'Priority',
  priorite: 'Priority',
  priorité: 'Priority',
  items: 'Items',
  item: 'Items',
  elements: 'Items',
};

/**
 * Normalise a single CSV row so that every key matches a canonical name.
 * Strips BOM (\uFEFF), trims whitespace, and resolves aliases.
 */
function normalizeRow(row) {
  const normalized = {};
  for (const [rawKey, rawValue] of Object.entries(row)) {
    const cleanKey = rawKey.replace(/^\uFEFF/, '').trim().toLowerCase();
    const canonical = COLUMN_ALIASES[cleanKey] || rawKey.trim();
    normalized[canonical] = typeof rawValue === 'string' ? rawValue.trim() : rawValue;
  }
  return normalized;
}

// ---------------------------------------------------------------------------
// Mapping helpers — translate CSV text values to GLPI numeric IDs
// ---------------------------------------------------------------------------

/**
 * Map a human-readable type string to a GLPI ticket type ID.
 *   1 = Incident (default)
 *   2 = Request
 */
const mapType = (typeStr) => {
  if (!typeStr) return 1;
  const lower = typeStr.toLowerCase();
  if (lower.includes('demande') || lower.includes('request')) return 2;
  return 1;
};

/**
 * Map a human-readable status string to a GLPI ticket status ID.
 *   1 = New (default)
 *   2 = Processing (assigned)
 *   3 = Processing (planned)
 *   4 = Pending
 *   5 = Solved
 *   6 = Closed
 */
const mapStatus = (statusStr) => {
  if (!statusStr) return 1;
  const lower = statusStr.toLowerCase();
  if (lower.includes('new') || lower.includes('nouveau')) return 1;
  if (lower.includes('assign') || lower.includes('cours')) return 2;
  if (lower.includes('plan')) return 3;
  if (lower.includes('pending') || lower.includes('attente')) return 4;
  if (lower.includes('solved') || lower.includes('résolu') || lower.includes('resolu')) return 5;
  if (lower.includes('closed') || lower.includes('clos') || lower.includes('fermé') || lower.includes('ferme')) return 6;
  return 1;
};

/**
 * Map a human-readable priority string to a GLPI priority ID.
 *   1 = Very high / Major
 *   2 = High
 *   3 = Medium (default)
 *   4 = Low
 *   5 = Very low
 */
const mapPriority = (prioStr) => {
  if (!prioStr) return 3;
  const lower = prioStr.toLowerCase();
  console.log(`Mapping priorité "${prioStr}" → "${lower}"`);
  if (lower.includes('major') || lower.includes('majeur')) return 6;
  if (lower.includes('very high') || lower.includes('très haute') || lower.includes('treshaute')) return 5;
  if (lower.includes('very low') || lower.includes('très basse') || lower.includes('tresbasse')) return 1;
  if (lower.includes('high') || lower.includes('haute')) return 4;
  if (lower.includes('low') || lower.includes('basse')) return 2;
  if (lower.includes('medium') || lower.includes('moyenne')) return 3;
  return 3;
};  

/**
 * Convert a DD/MM/YYYY date and an optional HH:MM time into
 * the GLPI datetime format: "YYYY-MM-DD HH:MM:SS".
 */
const parseDate = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const [day, month, year] = parts.map((p) => p.trim());
  const time = timeStr ? timeStr.trim() : '00:00';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time}:00`;
};

// ---------------------------------------------------------------------------
// GLPI API helpers
// ---------------------------------------------------------------------------

/** Item types to search when resolving the Items column. */
const ITEM_TYPES = ['Computer', 'Monitor', 'Printer', 'NetworkEquipment'];

/**
 * Fetch every item of a given type and return it as an array.
 * Returns [] on any error so callers can safely iterate.
 */
async function fetchAllItems(itemType) {
  try {
    const res = await fetch(`${API_BASE}/${itemType}?range=0-10000`, {
      headers: getHeaders(),
    });
    if (!res.ok) return [];
    return await res.json();
  } catch (err) {
    console.error(`Erreur lors du chargement des ${itemType} :`, err);
    return [];
  }
}

/**
 * Build a single Map<name (lowercase) → { itemtype, items_id, users_id }>
 * across all supported ITEM_TYPES.
 */
async function buildItemMap() {
  const itemMap = new Map();

  for (const itemType of ITEM_TYPES) {
    const items = await fetchAllItems(itemType);
    if (!Array.isArray(items)) continue;

    for (const item of items) {
      if (!item.name) continue;
      itemMap.set(item.name.toLowerCase().trim(), {
        itemtype: itemType,
        items_id: item.id,
        users_id: item.users_id ?? null,
      });
    }
  }

  return itemMap;
}

/**
 * Parse the Items column.
 * The CSV value may look like:  ["PC-ADM-001","MN-FORM-002"]
 * but CSV escaping may double-quote it, producing something like:
 *   "[""PC-ADM-001"",""MN-FORM-002""]"
 * This function normalises those quirks and always returns a string[].
 */
function parseItemsColumn(raw) {
  if (!raw) return [];

  let cleaned = raw.trim();

  // Remove outer quotes added by the CSV parser
  if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
    cleaned = cleaned.slice(1, -1);
  }

  // Unescape doubled double-quotes
  cleaned = cleaned.replace(/""/g, '"');

  // Try JSON array parsing
  if (cleaned.startsWith('[')) {
    try {
      const arr = JSON.parse(cleaned);
      return Array.isArray(arr) ? arr.map((s) => String(s).trim()) : [cleaned];
    } catch {
      // Fall through to plain splitting
    }
  }

  // Fallback: comma-separated names
  return cleaned
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

// ---------------------------------------------------------------------------
// Ticket creation helpers
// ---------------------------------------------------------------------------

/**
 * Create a single GLPI Ticket and return its ID (or null on failure).
 */
async function createTicket(payload) {
  const res = await fetch(`${API_BASE}/Ticket`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ input: payload }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(`Échec création ticket "${payload.name}" : ${res.status} — ${text}`);
    return null;
  }

  const data = await res.json();
  return data.id;
}

/**
 * Link an item (Computer, Monitor, …) to a ticket via Item_Ticket.
 */
async function linkItemToTicket(ticketId, itemtype, itemsId) {
  try {
    await fetch(`${API_BASE}/Item_Ticket`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        input: {
          tickets_id: ticketId,
          itemtype,
          items_id: itemsId,
        },
      }),
    });
  } catch (err) {
    console.error(`Erreur liaison ${itemtype} #${itemsId} → Ticket #${ticketId} :`, err);
  }
}

/**
 * Assign a user as Requester (type = 1) on a ticket via Ticket_User.
 */
async function assignRequester(ticketId, userId) {
  try {
    await fetch(`${API_BASE}/Ticket_User`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        input: {
          tickets_id: ticketId,
          users_id: userId,
          type: 1, // 1 = Requester
        },
      }),
    });
  } catch (err) {
    console.error(`Erreur assignation demandeur #${userId} → Ticket #${ticketId} :`, err);
  }
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Process the ticket CSV import.
 *
 * Expected CSV columns:
 *   Ref_Ticket, Date, Heure, Type, Titre, Description, Status, Priority, Items
 *
 * @param {Object[]} csvData  - Rows parsed by PapaParse (header mode).
 * @param {Function} onProgress - Callback receiving progress messages.
 * @returns {Object[]} The processed rows (augmented with CreatedTicketId).
 */
export async function processTicketImport(csvData, onProgress) {
  if (!csvData || csvData.length === 0) return [];

  // Debug: show what PapaParse actually parsed so we can spot header issues
  if (csvData.length > 0) {
    console.log('[ticketImport] Colonnes CSV brutes :', Object.keys(csvData[0]));
    console.log('[ticketImport] Première ligne brute :', csvData[0]);
  }

  // Safety net: if PapaParse produced only 1 column, the delimiter was wrong.
  // Manually split each row using the expected column order.
  const colCount = csvData.length > 0 ? Object.keys(csvData[0]).length : 0;
  if (colCount <= 1 && csvData.length > 0) {
    console.warn('[ticketImport] Une seule colonne détectée — re-parsing manuel des lignes');
    const EXPECTED = ['Ref_Ticket', 'Date', 'Heure', 'Type', 'Titre', 'Description', 'Status', 'Priority', 'Items'];
    const singleKey = Object.keys(csvData[0])[0];

    csvData = csvData.map((row) => {
      const raw = row[singleKey] || '';
      // Smart CSV split respecting quoted fields
      const values = [];
      let current = '';
      let inQuotes = false;
      for (let c = 0; c < raw.length; c++) {
        const ch = raw[c];
        if (ch === '"') {
          inQuotes = !inQuotes;
          current += ch;
        } else if (ch === ',' && !inQuotes) {
          values.push(current.trim());
          current = '';
        } else {
          current += ch;
        }
      }
      values.push(current.trim());

      const parsed = {};
      for (let j = 0; j < EXPECTED.length; j++) {
        parsed[EXPECTED[j]] = values[j] || '';
      }
      return parsed;
    });

    console.log('[ticketImport] Après re-parsing :', csvData[0]);
  }

  // 1 — Build the item lookup map
  onProgress('Chargement des équipements depuis GLPI…');
  const itemMap = await buildItemMap();

  // 2 — Iterate over each CSV row
  onProgress('Création des tickets…');
  const results = [];
  let created = 0;

  for (let i = 0; i < csvData.length; i++) {
    const row = normalizeRow(csvData[i]);

    // Debug first normalised row
    if (i === 0) {
      console.log('[ticketImport] Première ligne normalisée :', row);
    }

    const result = { ...row };

    // Build GLPI ticket payload
    const payload = {
      name: row.Titre || 'Sans titre',
      content: row.Description || '',
      type: mapType(row.Type),
      status: mapStatus(row.Status),
      priority: mapPriority(row.Priority),
    };

    const dateValue = parseDate(row.Date, row.Heure);
    if (dateValue) {
      payload.date = dateValue;
    }

    // Create the ticket
    const ticketId = await createTicket(payload);

    if (ticketId) {
      result.CreatedTicketId = ticketId;
      created++;

      // Link items & find first owner for requester assignment
      const itemNames = parseItemsColumn(row.Items);
      let requesterId = null;

      for (const name of itemNames) {
        const item = itemMap.get(name.toLowerCase().trim());
        if (!item) {
          console.warn(`Item "${name}" non trouvé dans GLPI.`);
          continue;
        }

        await linkItemToTicket(ticketId, item.itemtype, item.items_id);

        if (!requesterId && item.users_id) {
          requesterId = item.users_id;
        }
      }

      // Assign the owner of the first matched item as requester
      if (requesterId) {
        await assignRequester(ticketId, requesterId);
      }
    }

    results.push(result);
    onProgress(`Tickets créés : ${created} / ${csvData.length}`);
  }

  onProgress('Import des tickets terminé avec succès !');
  return results;
}

