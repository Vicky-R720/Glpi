import { getLang, getTicketsList, getdetailTicket, getTicketLinkedItems, getTicketCosts, updateTicketStatus, getKanbanColors } from "../service/ticket2.js";
const API_BASE = import.meta.env.VITE_API_BASE;


const getHeaders = () => {
  return {
    'App-Token': import.meta.env.VITE_APP_TOKEN,
    'Session-Token': import.meta.env.VITE_SESSION_TOKEN,
    'Content-Type': 'application/json'
  };
};



const tickets  = await getTicketsList();


/**
 * Main import process
 * @param {Array} csvData - Array of objects parsed from CSV
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Array} - The transformed data array
 */
export async function processImport(csvData, onProgress) {
  if (!csvData || csvData.length === 0) return [];

  /** 
  // We need distinct values for each category to pre-fetch/create
  const uniqueStates = new Set();
  const uniqueLocations = new Set();
  const uniqueManufacturers = new Set();
  const uniqueUsers = new Set();
  const uniqueModelsByItemType = {}; // e.g., { Computer: Set(), Monitor: Set() }

  */
  csvData.forEach(row => {
    /** 
    if (row.Status) uniqueStates.add(row.Status);
    if (row.Location) uniqueLocations.add(row.Location);
    if (row.Manufacturer) uniqueManufacturers.add(row.Manufacturer);
    if (row.User) uniqueUsers.add(row.User);
    
    if (row.Item_Type && row.Model) {
      if (!uniqueModelsByItemType[row.Item_Type]) {
        uniqueModelsByItemType[row.Item_Type] = new Set();
      }
      uniqueModelsByItemType[row.Item_Type].add(row.Model);
    }*/
  });

  onProgress("Chargement des données existantes depuis GLPI...");



  onProgress("Vérification et création des valeurs manquantes...");

  // We will process row by row and replace textual values with IDs
  const updatedData = [];
  let processed = 0;

  for (const row of csvData) {
    if (typeof row.valeur === 'string') {
      row.valeur = parseFloat(row.valeur.replace(/"/g, '').replace(',', '.')) || 0;
    }
    const newRow = { ...row };
    /**
    // Replace Status -> State ID
    if (row.Status) {
      const id = await getOrCreateEntityId('State', row.Status, stateMap);
      if (id) newRow.Status = id;
    }
    */

    if (row.mvt == "close") {
        //const coutSaisiNum = parseFloat(superpriceValue) || 0;
        let linkedItems = [];
        let glpiCost = 0;

        // Step 1: Try to fetch GLPI data (non-blocking - if it fails, we still insert)
                try {
                    console.log("Fetching GLPI linked items and costs...");
                    const [items, costs] = await Promise.all([
                        getTicketLinkedItems(row.ticket),
                        getTicketCosts(row.ticket)
                    ]);
                    linkedItems = items || [];
                    console.log("linkedItems:", JSON.stringify(linkedItems));
                    console.log("costs:", JSON.stringify(costs));
        
                    if (Array.isArray(costs)) {
                        costs.forEach(cost => {
                            const timeHrs = cost.actiontime ? (parseFloat(cost.actiontime) / 3600.0) : 0;
                            const hourlyRate = parseFloat(cost.cost_time || 0);
                            const fixedCost = parseFloat(cost.cost_fixed || 0);
                            const materialCost = parseFloat(cost.cost_material || 0);
                            glpiCost += (timeHrs * hourlyRate) + fixedCost + materialCost;
                        });
                    }
                    console.log("Calculated glpiCost:", glpiCost);
                } catch (glpiError) {
                    console.warn("GLPI API failed (continuing with defaults):", glpiError);
                    linkedItems = [];
                    glpiCost = 0;
                }
        
                // Step 2: Build payloads and POST to SQLite backend
                const N = linkedItems.length > 0 ? linkedItems.length : 1;
                const glpiShare = glpiCost / N;
                const kanbanShare = row.valeur / N;
                let insertSuccess = false;
                const groupee = new Date().toISOString();
        
                try {
                    if (linkedItems.length > 0) {
                        console.log("Inserting " + linkedItems.length + " records (one per linked item)...");
                        for (const item of linkedItems) {
                            const payload = {
                                id_ticket: row.ticket,
                                cout_saisi: kanbanShare,
                                cout_glpi: glpiShare,
                                id_item: item.items_id,
                                category: item.itemtype || "Non catégorisé",
                                groupe: groupee,
                                type_saisi: "super_price"
                            };
                            console.log("POST payload:", JSON.stringify(payload));
                            const response = await fetch("http://localhost:8080/api/ask", {
                                method: "POST",
                                headers: {"Content-Type": "application/json"},
                                body: JSON.stringify(payload)
                            });
                            const responseText = await response.text();
                            console.log("Response status:", response.status, "body:", responseText);
                            if (!response.ok) {
                                alert("Erreur insertion (status " + response.status + "): " + responseText);
                            } else {
                                insertSuccess = true;
                            }
                        }
                    } else {
                        // No linked items - insert a single record
                        const payload = {
                            id_ticket: row.ticket,
                            cout_saisi: kanbanShare,
                            cout_glpi: glpiCost,
                            id_item: "0",
                            category: "Non catégorisé",
                            groupe: "0"
                        };
                        console.log("POST payload (no linked items):", JSON.stringify(payload));
                        const response = await fetch("http://localhost:8080/api/ask", {
                            method: "POST",
                            headers: {"Content-Type": "application/json"},
                            body: JSON.stringify(payload)
                        });
                        const responseText = await response.text();
                        console.log("Response status:", response.status, "body:", responseText);
                        if (!response.ok) {
                            alert("Erreur insertion (status " + response.status + "): " + responseText);
                        } else {
                            insertSuccess = true;
                        }
                    }
                } catch (fetchError) {
                    console.error("Fetch to /api/ask failed:", fetchError);
                    alert("Impossible de contacter le backend Spring Boot (localhost:8080). Vérifiez qu'il est démarré.\n\nErreur: " + fetchError.message);
                }
        
                if (insertSuccess) {
                    console.log("=== INSERT SUCCESS ===");
                }
        
                // Step 3: Update ticket status in GLPI
               
                try{
                    await updateTicketStatus(row.ticket, 6);
                } catch (error){
                    console.error("Status update failed:", error)
                    alert("Impossible de changer le statut du ticket " + row.ticket);
                } finally {
                    
                }


    }

    if (row.mvt == "cancel") {
        console.log("=== Delete START ===");
                console.log("row.ticket:", row.ticket);
                
                let insertSuccess = false;
        
                try {
                    
                        //console.log("Inserting " + linkedItems.length + " records (one per linked item)...");
                        const response = await fetch("http://localhost:8080/api/ask/ticket/" + row.ticket, {
                                method: "DELETE",
                            });
                } catch (fetchError) {
                    console.error("Fetch to /api/ask failed:", fetchError);
                    alert("Impossible de contacter le backend Spring Boot (localhost:8080). Vérifiez qu'il est démarré.\n\nErreur: " + fetchError.message);
                }
        
                if (insertSuccess) {
                    console.log("=== INSERT SUCCESS ===");
                }
        
                // Step 3: Update ticket status in GLPI
                
                try{
                    await updateTicketStatus(row.ticket, 2);
                } catch (error){
                    console.error("Status update failed:", error)
                    alert("Impossible de changer le statut du ticket " + row.ticket);
                } finally {
                    
                }
    }
    if (row.mvt == "open"){
        console.log("=== submitPourcentage START ===");
        console.log("row.ticket:", row.ticket);
    

        //const coutSaisiNum = row.valeur;
        let linkedItems = [];
        let glpiCost = 0;

        // Step 1: Try to fetch GLPI data (non-blocking - if it fails, we still insert)
        try {
            console.log("Fetching GLPI linked items and costs...");
            const [items, costs] = await Promise.all([
                getTicketLinkedItems(row.ticket),
                getTicketCosts(row.ticket)
            ]);
            linkedItems = items || [];
            console.log("linkedItems:", JSON.stringify(linkedItems));
            console.log("costs:", JSON.stringify(costs));

            if (Array.isArray(costs)) {
                costs.forEach(cost => {
                    const timeHrs = cost.actiontime ? (parseFloat(cost.actiontime) / 3600.0) : 0;
                    const hourlyRate = parseFloat(cost.cost_time || 0);
                    const fixedCost = parseFloat(cost.cost_fixed || 0);
                    const materialCost = parseFloat(cost.cost_material || 0);
                    glpiCost += (timeHrs * hourlyRate) + fixedCost + materialCost;
                });
            }
            console.log("Calculated glpiCost:", glpiCost);
        } catch (glpiError) {
            console.warn("GLPI API failed (continuing with defaults):", glpiError);
            linkedItems = [];
            glpiCost = 0;
        }

        // Step 2: Get the last cout_saisi for this ticket from SQLite
        const N = linkedItems.length > 0 ? linkedItems.length : 1;
        const glpiShare = glpiCost / N;
        
        let insertSuccess = false;
        const groupee = new Date().toISOString();

        // Fetch last super_price from backend
        let lastprice = 0;
        try {
            const priceResp = await fetch("http://localhost:8080/api/ask/price/" + row.ticket);
            lastprice = await priceResp.json();
            console.log("lastprice for ticket:", lastprice);
        } catch (e) {
            console.warn("Could not fetch last price:", e);
        }

        const kanbanShare = row.valeur * lastprice / 100;

        try {
            if (linkedItems.length > 0) {
                console.log("Inserting " + linkedItems.length + " records (one per linked item)...");
                for (const item of linkedItems) {
                    const payload = {
                        id_ticket: row.ticket,
                        cout_saisi: kanbanShare,
                        cout_glpi: glpiShare,
                        id_item: item.items_id,
                        category: item.itemtype || "Non catégorisé",
                        groupe: groupee,
                        type_saisi: "Reo"
                    };
                    console.log("POST payload:", JSON.stringify(payload));
                    const response = await fetch("http://localhost:8080/api/ask", {
                        method: "POST",
                        headers: {"Content-Type": "application/json"},
                        body: JSON.stringify(payload)
                    });
                    const responseText = await response.text();
                    console.log("Response status:", response.status, "body:", responseText);
                    if (!response.ok) {
                        alert("Erreur insertion (status " + response.status + "): " + responseText);
                    } else {
                        insertSuccess = true;
                    }
                }
            } else {
                // No linked items - insert a single record
                const payload = {
                    id_ticket: row.ticket,
                    cout_saisi: kanbanShare,
                    cout_glpi: glpiCost,
                    id_item: "0",
                    category: "Non catégorisé",
                    groupe: groupee
                };
                console.log("POST payload (no linked items):", JSON.stringify(payload));
                const response = await fetch("http://localhost:8080/api/ask", {
                    method: "POST",
                    headers: {"Content-Type": "application/json"},
                    body: JSON.stringify(payload)
                });
                const responseText = await response.text();
                console.log("Response status:", response.status, "body:", responseText);
                if (!response.ok) {
                    alert("Erreur insertion (status " + response.status + "): " + responseText);
                } else {
                    insertSuccess = true;
                }
            }
        } catch (fetchError) {
            console.error("Fetch to /api/ask failed:", fetchError);
            alert("Impossible de contacter le backend Spring Boot (localhost:8080). Vérifiez qu'il est démarré.\n\nErreur: " + fetchError.message);
        }

        if (insertSuccess) {
            console.log("=== INSERT SUCCESS ===");
        }

        // Step 3: Update ticket status in GLPI
        
    
        try{
            await updateTicketStatus(row.ticket, 2);
        } catch (error){
            console.error("Status update failed:", error)
            alert("Impossible de changer le statut du ticket " + row.ticket);
        } finally {
            
        }
    }
   
    updatedData.push(newRow);
    processed++;
    onProgress(`Préparation des données : ${processed} / ${csvData.length}`);
  }

  onProgress("Insertion des mvt...");

  // Now create the main equipment (Computer, Monitor, etc.)
  let insertedCount = 0;
  /**for (const item of updatedData) {
    if (!item.Item_Type) continue;

    try {
      // Build the GLPI payload using standard GLPI foreign keys
      const payload = {
        name: item.Name || '',
        states_id: item.Status || 0,
        locations_id: item.Location || 0,
        manufacturers_id: item.Manufacturer || 0,
        users_id: item.User || 0,
      };

      // Add the model ID dynamically (e.g., computermodels_id, monitormodels_id)
      const modelField = `${item.Item_Type.toLowerCase()}models_id`;
      payload[modelField] = item.Model || 0;

      // Map Inventory_Number to otherserial (standard in GLPI)
      if (item.Inventory_Number) {
        payload.otherserial = item.Inventory_Number;
      }

      const response = await fetch(`${API_BASE}/${item.Item_Type}`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify({ input: payload })
      });

      if (!response.ok) {
        console.warn(`Échec de la création de l'équipement ${item.Name}: ${response.statusText}`);
      } else {
        insertedCount++;
      }
    } catch (error) {
      console.error(`Erreur lors de la création de l'équipement ${item.Name}:`, error);
    }
    
    onProgress(`Insertion : ${insertedCount} / ${updatedData.length} terminés`);
  }
    */

  onProgress("Traitement terminé avec succès !");
  return updatedData;
}
