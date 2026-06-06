const API_BASE = 'http://localhost/glpi/public/apirest.php';

const getHeaders = () => ({
  'App-Token': import.meta.env.VITE_APP_TOKEN,
  'Session-Token': import.meta.env.VITE_SESSION_TOKEN,
  'Content-Type': 'application/json',
});

// ---------------------------------------------------------------------------
// Row normalisation
// ---------------------------------------------------------------------------

const COLUMN_ALIASES = {
  num_ticket: 'Num_Ticket',
  numticket: 'Num_Ticket',
  ticket: 'Num_Ticket',
  tickets_id: 'Num_Ticket',
  duration_second: 'Duration_second',
  durationsecond: 'Duration_second',
  duration: 'Duration_second',
  actiontime: 'Duration_second',
  time_cost: 'Time_Cost',
  timecost: 'Time_Cost',
  cost_time: 'Time_Cost',
  fixed_cost: 'Fixed_Cost',
  fixedcost: 'Fixed_Cost',
  cost_fixed: 'Fixed_Cost',
};

/**
 * Normalise a single CSV row: strips BOM, trims, resolves aliases.
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
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a number that may use French decimal format (comma as separator).
 * Examples: "8,7" → 8.7  |  "109" → 109  |  "" → 0
 */
function parseFrenchNumber(value) {
  if (!value && value !== 0) return 0;
  const str = String(value).trim().replace(',', '.');
  const num = parseFloat(str);
  return isNaN(num) ? 0 : num;
}

/**
 * Create a single TicketCost entry in GLPI.
 */
async function createTicketCost(payload) {
  const res = await fetch(`${API_BASE}/TicketCost`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ input: payload }),
  });

  if (!res.ok) {
    const text = await res.text();
    console.warn(`Échec création TicketCost pour ticket #${payload.tickets_id} : ${res.status} — ${text}`);
    return null;
  }

  const data = await res.json();
  return data.id;
}

// ---------------------------------------------------------------------------
// Main exported function
// ---------------------------------------------------------------------------

/**
 * Process the ticket cost CSV import.
 *
 * Expected CSV columns:
 *   Num_Ticket, Duration_second, Time_Cost, Fixed_Cost
 *
 * @param {Object[]} csvData  - Rows parsed by PapaParse (header mode).
 * @param {Function} onProgress - Callback receiving progress messages.
 * @returns {Object[]} The processed rows (augmented with CreatedCostId).
 */
export async function processTicketCostImport(csvData, onProgress) {
  if (!csvData || csvData.length === 0) return [];

  // Debug
  if (csvData.length > 0) {
    console.log('[ticketCostImport] Colonnes CSV brutes :', Object.keys(csvData[0]));
    console.log('[ticketCostImport] Première ligne brute :', csvData[0]);
  }

  onProgress('Insertion des coûts de tickets…');
  const results = [];
  let created = 0;

  for (let i = 0; i < csvData.length; i++) {
    const row = normalizeRow(csvData[i]);

    if (i === 0) {
      console.log('[ticketCostImport] Première ligne normalisée :', row);
    }

    const result = { ...row };

    const ticketId = parseInt(row.Num_Ticket, 10);
    if (!ticketId || isNaN(ticketId)) {
      console.warn(`[ticketCostImport] Ligne ${i + 1} : Num_Ticket invalide "${row.Num_Ticket}", ignorée.`);
      results.push(result);
      continue;
    }

    const payload = {
      tickets_id: ticketId,
      name: `Coût importé #${i + 1}`,
      actiontime: parseInt(row.Duration_second, 10) || 0,
      cost_time: parseFrenchNumber(row.Time_Cost),
      cost_fixed: parseFrenchNumber(row.Fixed_Cost),
    };

    const costId = await createTicketCost(payload);

    if (costId) {
      result.CreatedCostId = costId;
      created++;
    }

    results.push(result);
    onProgress(`Coûts insérés : ${created} / ${csvData.length}`);
  }

  onProgress('Import des coûts terminé avec succès !');
  return results;
}
