const API_BASE = import.meta.env.VITE_API_BASE;

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

const parseDate = (dateStr, timeStr) => {
  if (!dateStr) return null;
  const parts = dateStr.split('/');
  if (parts.length !== 3) return null;

  const [day, month, year] = parts.map((p) => p.trim());
  const time = timeStr ? timeStr.trim() : '00:00';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')} ${time}:00`;
};

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
 * @param {Object[]} ticketData - Rows from the tickets CSV (to map Num_Ticket -> Titre)
 * @param {Function} onProgress - Callback receiving progress messages.
 * @returns {Object[]} The processed rows (augmented with CreatedCostId).
 */
export async function processTicketCostImport(csvData, ticketData, onProgress) {
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

    const numTicket = parseInt(row.Num_Ticket, 10);
    if (!numTicket || isNaN(numTicket)) {
      console.warn(`[ticketCostImport] Ligne ${i + 1} : Num_Ticket invalide "${row.Num_Ticket}", ignorée.`);
      results.push(result);
      continue;
    }

    // Étape A : Trouver le vrai ID du ticket
    let glpiTicketId = numTicket; // Fallback
    let titre = null;
    let expectedDate = null;

    if (ticketData && ticketData.length > 0) {
      // Find the corresponding ticket in Feuille 2 by Ref_Ticket
      const refTicket = ticketData.find((t) => {
        const ref = parseInt(t.Ref_Ticket || t.ref_ticket, 10);
        return ref === numTicket;
      });
      if (refTicket) {
        if (refTicket.CreatedTicketId) {
          glpiTicketId = refTicket.CreatedTicketId;
        } else {
          titre = refTicket.Titre || refTicket.titre || refTicket.Title || refTicket.title;
          expectedDate = parseDate(refTicket.Date || refTicket.date, refTicket.Heure || refTicket.heure);
        }
      }
    }

    if (titre) {
      try {
        const searchUrl = `${API_BASE}/search/Ticket?criteria[0][field]=1&criteria[0][searchtype]=contains&criteria[0][value]=${encodeURIComponent(titre)}`;
        const res = await fetch(searchUrl, { headers: getHeaders() });
        if (res.ok) {
          const searchData = await res.json();
          if (searchData && searchData.data && searchData.data.length > 0) {
            let foundId = null;
            if (expectedDate) {
              // Vérifier la date pour différencier les tickets ayant le même titre (ex: "Écran bleu")
              for (const item of searchData.data) {
                const id = item["2"] || item.id;
                const tRes = await fetch(`${API_BASE}/Ticket/${id}`, { headers: getHeaders() });
                if (tRes.ok) {
                  const tData = await tRes.json();
                  if (tData.date === expectedDate) {
                    foundId = id;
                    break;
                  }
                }
              }
              if (foundId) {
                glpiTicketId = foundId;
              } else {
                console.warn(`[ticketCostImport] Ticket "${titre}" avec la date ${expectedDate} est introuvable dans GLPI. Le coût a été ignoré pour ne pas le mélanger.`);
                glpiTicketId = null; // On annule pour éviter de l'associer au mauvais ticket
              }
            } else {
              glpiTicketId = parseInt(searchData.data[0]["2"] || searchData.data[0].id, 10) || glpiTicketId;
            }
          } else {
            console.warn(`[ticketCostImport] Ticket avec le titre "${titre}" introuvable dans GLPI.`);
          }
        }
      } catch (err) {
        console.error(`[ticketCostImport] Erreur recherche ticket "${titre}":`, err);
      }
    }

    if (!glpiTicketId) {
      console.warn(`[ticketCostImport] Ligne ${i + 1} : Impossible de lier le coût (ticket introuvable).`);
      results.push(result);
      continue;
    }

    // Étape B : Insérer le coût avec le vrai ID
    const payload = {
      tickets_id: glpiTicketId,
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
