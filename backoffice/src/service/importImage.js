import JSZip from 'jszip';

const API_BASE = import.meta.env.VITE_API_BASE;

const getHeaders = () => {
  return {
    'App-Token': import.meta.env.VITE_APP_TOKEN,
    'Session-Token': import.meta.env.VITE_SESSION_TOKEN,
  };
};

/**
 * Convertit un Blob image en Blob JPEG
 */
const convertToJpeg = async (blob) => {
  return new Promise((resolve, reject) => {
    if (blob.type === 'image/jpeg') {
      resolve(blob);
      return;
    }
    
    const img = new Image();
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      // Pour gérer la transparence (ex: PNG), on remplit d'abord le fond en blanc
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((jpegBlob) => {
        resolve(jpegBlob);
      }, 'image/jpeg', 0.9);
    };
    img.onerror = (err) => {
      URL.revokeObjectURL(url);
      reject(err);
    };
    img.src = url;
  });
};

/**
 * Récupère l'ID d'un équipement par son nom.
 * Si itemType n'est pas fourni, cherche dans Computer puis Monitor.
 */
const fetchEquipmentIdAndType = async (name, knownItemType = null) => {
  const typesToSearch = knownItemType ? [knownItemType] : ['Computer', 'Monitor'];

  for (const type of typesToSearch) {
    try {
      const headers = { ...getHeaders(), 'Content-Type': 'application/json' };
      const response = await fetch(`${API_BASE}/${type}?searchText[name]=${encodeURIComponent('^' + name + '$')}`, {
        method: 'GET',
        headers
      });
      if (response.ok) {
        const data = await response.json();
        if (Array.isArray(data) && data.length > 0) {
          return { id: data[0].id, itemType: type };
        }
      }
    } catch (error) {
      console.error(`Erreur de recherche d'équipement ${name} dans ${type}:`, error);
    }
  }
  return null;
};

/**
 * Fonction principale pour traiter l'archive d'images
 */
export async function processImageImport(zipFile, equipmentData, onProgress) {
  if (!zipFile) return;

  onProgress('Lecture de l\'archive ZIP...');
  const zip = new JSZip();
  let contents;
  try {
    contents = await zip.loadAsync(zipFile);
  } catch (err) {
    console.error("Erreur ZIP:", err);
    onProgress('Erreur de lecture du fichier ZIP.');
    return;
  }

  const files = Object.keys(contents.files);
  const imageFiles = files.filter(f => !contents.files[f].dir && (f.match(/\.(png|jpe?g)$/i) || f.indexOf('__MACOSX') === -1 && f.match(/\.(png|jpe?g)$/i)));
  
  // Filtrer les dossiers cachés MACOSX
  const validImageFiles = imageFiles.filter(f => !f.includes('__MACOSX/') && !f.split('/').pop().startsWith('._'));

  if (validImageFiles.length === 0) {
    onProgress('Aucune image valide trouvée dans le ZIP.');
    return;
  }

  let processedCount = 0;
  for (const filename of validImageFiles) {
    const fileObj = contents.files[filename];
    // Extraire le nom de base sans l'extension
    const baseName = filename.split('/').pop().replace(/\.(png|jpe?g)$/i, '');

    onProgress(`Traitement de l'image : ${baseName}...`);

    // Trouver le type d'équipement depuis le CSV si fourni
    let knownItemType = null;
    if (equipmentData && equipmentData.length > 0) {
      const equipment = equipmentData.find(e => e.Name === baseName);
      if (equipment) {
        knownItemType = equipment.Item_Type;
      }
    }

    // Récupération de l'ID et du type définitif depuis GLPI
    const equipmentInfo = await fetchEquipmentIdAndType(baseName, knownItemType);
    if (!equipmentInfo) {
      console.warn(`Équipement ${baseName} introuvable dans GLPI. Image ignorée.`);
      continue;
    }

    const { id: itemId, itemType } = equipmentInfo;

    // Conversion en JPEG si nécessaire
    const fileType = filename.toLowerCase().endsWith('.png') ? 'image/png' : 'image/jpeg';
    const originalBlob = await fileObj.async('blob');
    // On doit assigner le type manuellement car JSZip donne un blob générique
    const typedBlob = new Blob([originalBlob], { type: fileType });
    
    const jpegBlob = await convertToJpeg(typedBlob);
    const finalFilename = `${baseName}.jpeg`;

    // Upload du document vers GLPI
    try {
      const formData = new FormData();
      const uploadManifest = {
        input: {
          name: finalFilename,
          documentcategories_id: 0,
        }
      };
      formData.append('uploadManifest', JSON.stringify(uploadManifest));
      formData.append('filename[0]', jpegBlob, finalFilename);

      const docResponse = await fetch(`${API_BASE}/Document`, {
        method: 'POST',
        headers: getHeaders(), // Note: Content-Type est omis pour laisser le navigateur définir le boundary multipart
        body: formData
      });

      if (!docResponse.ok) {
        console.warn(`Échec création document pour ${baseName}: ${docResponse.statusText}`);
        continue;
      }

      const docData = await docResponse.json();
      const documentId = docData.id;

      // Lier le document à l'équipement
      const linkPayload = {
        input: {
          documents_id: documentId,
          itemtype: itemType,
          items_id: itemId
        }
      };

      const linkResponse = await fetch(`${API_BASE}/Document_Item`, {
        method: 'POST',
        headers: { ...getHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify(linkPayload)
      });

      if (!linkResponse.ok) {
        console.warn(`Échec de la liaison de l'image à ${baseName}.`);
      }

    } catch (err) {
      console.error(`Erreur lors de l'upload de l'image ${baseName}:`, err);
    }

    processedCount++;
    onProgress(`Images importées : ${processedCount} / ${validImageFiles.length}`);
  }

  onProgress("Importation des images terminée !");
}
