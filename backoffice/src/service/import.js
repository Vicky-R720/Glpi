const API_BASE = 'http://localhost/glpi/public/apirest.php';

const getHeaders = () => {
  return {
    'App-Token': import.meta.env.VITE_APP_TOKEN,
    'Session-Token': import.meta.env.VITE_SESSION_TOKEN,
    'Content-Type': 'application/json'
  };
};

/**
 * Fetch all items for a given entity to build a mapping from Name to ID.
 */
async function fetchEntityMap(entityName) {
  try {
    const response = await fetch(`${API_BASE}/${entityName}?range=0-10000`, {
      method: 'GET',
      headers: getHeaders()
    });
    
    if (!response.ok) {
      if (response.status === 404 || response.status === 206) {
        // 206 Partial Content is standard for GLPI successful GET
        // 404 might mean no items exist yet
      } else {
        console.warn(`Could not fetch ${entityName}: ${response.statusText}`);
      }
    }

    const data = await response.json();
    const map = new Map();
    if (Array.isArray(data)) {
      data.forEach(item => {
        if (item.name) {
          map.set(item.name.toLowerCase(), item.id);
        }
      });
    }
    return map;
  } catch (error) {
    console.error(`Error fetching ${entityName}:`, error);
    return new Map();
  }
}

/**
 * Create a new item for a given entity and return its new ID.
 */
async function createEntityItem(entityName, name) {
  try {
    const response = await fetch(`${API_BASE}/${entityName}`, {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        input: { name: name }
      })
    });

    if (!response.ok) {
      throw new Error(`Failed to create ${entityName}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error(`Error creating ${entityName} with name ${name}:`, error);
    return null;
  }
}

/**
 * Get or create an entity ID for a given name.
 */
async function getOrCreateEntityId(entityName, name, entityMap) {
  if (!name) return null;
  
  const lowerName = name.toLowerCase();
  if (entityMap.has(lowerName)) {
    return entityMap.get(lowerName);
  }

  // Not found, we need to create it
  const newId = await createEntityItem(entityName, name);
  if (newId) {
    entityMap.set(lowerName, newId);
  }
  return newId;
}

/**
 * Main import process
 * @param {Array} csvData - Array of objects parsed from CSV
 * @param {Function} onProgress - Callback for progress updates
 * @returns {Array} - The transformed data array
 */
export async function processImport(csvData, onProgress) {
  if (!csvData || csvData.length === 0) return [];

  // We need distinct values for each category to pre-fetch/create
  const uniqueStates = new Set();
  const uniqueLocations = new Set();
  const uniqueManufacturers = new Set();
  const uniqueUsers = new Set();
  const uniqueModelsByItemType = {}; // e.g., { Computer: Set(), Monitor: Set() }

  csvData.forEach(row => {
    if (row.Status) uniqueStates.add(row.Status);
    if (row.Location) uniqueLocations.add(row.Location);
    if (row.Manufacturer) uniqueManufacturers.add(row.Manufacturer);
    if (row.User) uniqueUsers.add(row.User);
    
    if (row.Item_Type && row.Model) {
      if (!uniqueModelsByItemType[row.Item_Type]) {
        uniqueModelsByItemType[row.Item_Type] = new Set();
      }
      uniqueModelsByItemType[row.Item_Type].add(row.Model);
    }
  });

  onProgress("Chargement des données existantes depuis GLPI...");

  // Fetch existing maps
  const stateMap = await fetchEntityMap('State');
  const locationMap = await fetchEntityMap('Location');
  const manufacturerMap = await fetchEntityMap('Manufacturer');
  const userMap = await fetchEntityMap('User');
  
  const modelMapsByItemType = {};
  for (const itemType of Object.keys(uniqueModelsByItemType)) {
    const modelEntityName = `${itemType}Model`;
    modelMapsByItemType[itemType] = await fetchEntityMap(modelEntityName);
  }

  onProgress("Vérification et création des valeurs manquantes...");

  // We will process row by row and replace textual values with IDs
  const updatedData = [];
  let processed = 0;

  for (const row of csvData) {
    const newRow = { ...row };

    // Replace Status -> State ID
    if (row.Status) {
      const id = await getOrCreateEntityId('State', row.Status, stateMap);
      if (id) newRow.Status = id;
    }

    // Replace Location -> Location ID
    if (row.Location) {
      const id = await getOrCreateEntityId('Location', row.Location, locationMap);
      if (id) newRow.Location = id;
    }

    // Replace Manufacturer -> Manufacturer ID
    if (row.Manufacturer) {
      const id = await getOrCreateEntityId('Manufacturer', row.Manufacturer, manufacturerMap);
      if (id) newRow.Manufacturer = id;
    }

    // Replace User -> User ID
    if (row.User) {
      const id = await getOrCreateEntityId('User', row.User, userMap);
      if (id) newRow.User = id;
    }

    // Replace Model -> [Item_Type]Model ID
    if (row.Item_Type && row.Model) {
      const modelEntityName = `${row.Item_Type}Model`;
      const modelMap = modelMapsByItemType[row.Item_Type];
      const id = await getOrCreateEntityId(modelEntityName, row.Model, modelMap);
      if (id) newRow.Model = id;
    }

    updatedData.push(newRow);
    processed++;
    onProgress(`Préparation des données : ${processed} / ${csvData.length}`);
  }

  onProgress("Insertion des équipements dans GLPI...");

  // Now create the main equipment (Computer, Monitor, etc.)
  let insertedCount = 0;
  for (const item of updatedData) {
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

  onProgress("Traitement terminé avec succès !");
  return updatedData;
}
