import React, { useState } from 'react';
import Papa from 'papaparse';
import { processImport } from '../service/import';
import { processTicketImport } from '../service/ticketImport';
import { processTicketCostImport } from '../service/ticketCostImport';
import { processImageImport } from '../service/importImage';
import '../index.css';

function ImportPage() {
  const [equipFile, setEquipFile] = useState(null);
  const [ticketFile, setTicketFile] = useState(null);
  const [costFile, setCostFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  const handleEquipFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setEquipFile(e.target.files[0]);
    } else {
      setEquipFile(null);
    }
  };

  const handleTicketFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setTicketFile(e.target.files[0]);
    } else {
      setTicketFile(null);
    }
  };

  const handleCostFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setCostFile(e.target.files[0]);
    } else {
      setCostFile(null);
    }
  };

  const handleImageFileChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    } else {
      setImageFile(null);
    }
  };

  const parseCSVFile = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        let text = e.target.result;

        // Fix double-wrapped CSV: some spreadsheet exports wrap entire data
        // rows in quotes when any field contains a comma (e.g. "8,7").
        // This makes PapaParse treat the row as a single quoted field.
        // We detect and unwrap each affected line individually.
        const lines = text.split(/\r?\n/);
        const header = (lines[0] || '').trim();

        // Only fix if header itself is NOT quoted (normal CSV header)
        if (lines.length > 1 && !header.startsWith('"')) {
          let fixed = false;

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line || !line.startsWith('"') || !line.endsWith('"')) continue;

            // Check if this line is a single quoted CSV field:
            // scan from position 1 for the matching closing quote.
            // Inside a quoted field, "" is an escaped quote.
            let pos = 1;
            while (pos < line.length) {
              if (line[pos] === '"') {
                if (pos + 1 < line.length && line[pos + 1] === '"') {
                  pos += 2; // escaped "" → skip both
                } else {
                  break; // found the closing quote
                }
              } else {
                pos++;
              }
            }

            // If the closing quote is at the very end → entire line is one field
            if (pos === line.length - 1) {
              lines[i] = line.slice(1, -1).replace(/""/g, '"');
              fixed = true;
            }
          }

          if (fixed) {
            text = lines.join('\n');
            console.log('[parseCSV] Lignes double-wrapped corrigées');
          }
        }

        Papa.parse(text, {
          header: true,
          skipEmptyLines: true,
          complete: (results) => resolve(results.data),
          error: (err) => reject(err),
        });
      };
      reader.onerror = () => reject(reader.error);
      reader.readAsText(file, 'UTF-8');
    });
  };

  const handleImport = async () => {
    if (!equipFile && !ticketFile && !costFile && !imageFile) {
      setStatus('Veuillez sélectionner au moins un fichier.');
      return;
    }

    setIsLoading(true);
    setResults(null);
    let finalResults = [];

    try {
      let ticketDataRaw = null;
      if (ticketFile) {
        setStatus('Lecture du fichier tickets...');
        ticketDataRaw = await parseCSVFile(ticketFile);
      }

      if (equipFile) {
        setStatus('Lecture du fichier équipements...');
        const equipData = await parseCSVFile(equipFile);
        
        if (equipData.length === 0) {
          setStatus('Le fichier équipements est vide ou mal formaté.');
        } else {
          setStatus('Début import équipements...');
          const updatedEquip = await processImport(equipData, (msg) => {
            setStatus(`[Équipements] ${msg}`);
          });
          finalResults = [...finalResults, ...updatedEquip];
        }
      }

      if (ticketFile && ticketDataRaw) {
        if (ticketDataRaw.length === 0) {
          setStatus('Le fichier tickets est vide ou mal formaté.');
        } else {
          setStatus('Début import tickets...');
          const updatedTickets = await processTicketImport(ticketDataRaw, (msg) => {
            setStatus(`[Tickets] ${msg}`);
          });
          finalResults = [...finalResults, ...updatedTickets];
        }
      }

      if (costFile) {
        setStatus('Lecture du fichier coûts...');
        const costData = await parseCSVFile(costFile);

        if (costData.length === 0) {
          setStatus('Le fichier coûts est vide ou mal formaté.');
        } else {
          setStatus('Début import coûts...');
          const updatedCosts = await processTicketCostImport(costData, ticketDataRaw, (msg) => {
            setStatus(`[Ticket Costs] ${msg}`);
          });
          finalResults = [...finalResults, ...updatedCosts];
        }
      }

      if (imageFile) {
        setStatus('Début import des images ZIP...');
        await processImageImport(imageFile, finalResults, (msg) => {
          setStatus(`[Images] ${msg}`);
        });
      }

      setResults(finalResults);
      setStatus('Importation globale terminée !');
    } catch (error) {
      console.error("Erreur lors de l'import:", error);
      setStatus("Une erreur s'est produite lors de l'import.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="import-page" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Import de Données</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ width: '150px', fontWeight: 'bold' }}>Équipements :</label>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleEquipFileChange}
            disabled={isLoading}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', flex: 1 }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ width: '150px', fontWeight: 'bold' }}>Tickets :</label>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleTicketFileChange}
            disabled={isLoading}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', flex: 1 }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ width: '150px', fontWeight: 'bold' }}>Ticket Costs :</label>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleCostFileChange}
            disabled={isLoading}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', flex: 1 }}
          />
        </div>

        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ width: '150px', fontWeight: 'bold' }}>Images (ZIP) :</label>
          <input 
            type="file" 
            accept=".zip" 
            onChange={handleImageFileChange}
            disabled={isLoading}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px', flex: 1 }}
          />
        </div>

        <button 
          onClick={handleImport} 
          disabled={(!equipFile && !ticketFile && !costFile && !imageFile) || isLoading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isLoading ? '#ccc' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            alignSelf: 'flex-start',
            marginTop: '1rem'
          }}
        >
          {isLoading ? 'Importation en cours...' : 'Valider'}
        </button>
      </div>

      {status && (
        <div style={{ padding: '1rem', backgroundColor: '#f8f9fa', borderRadius: '4px', marginBottom: '2rem' }}>
          <strong>Statut :</strong> {status}
        </div>
      )}

      {results && results.length > 0 && (
        <div>
          <h2>Résultat de l'analyse (Aperçu)</h2>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
              <thead>
                <tr>
                  {Object.keys(results[0]).map((key) => (
                    <th key={key} style={{ border: '1px solid #ddd', padding: '8px', backgroundColor: '#f2f2f2' }}>
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {results.slice(0, 10).map((row, index) => (
                  <tr key={index}>
                    {Object.values(row).map((val, idx) => (
                      <td key={idx} style={{ border: '1px solid #ddd', padding: '8px' }}>
                        {typeof val === 'object' ? JSON.stringify(val) : val}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            {results.length > 10 && <p style={{ marginTop: '0.5rem', color: '#666' }}>Aperçu limité aux 10 premières lignes.</p>}
          </div>
        </div>
      )}
    </div>
  );
}

export default ImportPage;
