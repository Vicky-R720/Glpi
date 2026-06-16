import React, { useState } from 'react';
import Papa from 'papaparse';
import { processImport } from '../service/import';

export default function ImportMvt(){
    const [equipFile, setEquipFile] = useState(null);
  const [ticketFile, setTicketFile] = useState(null);
  const [costFile, setCostFile] = useState(null);
  const [imageFile, setImageFile] = useState(null);
  
  const [status, setStatus] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [results, setResults] = useState(null);

  // Manual entry state
  const [manualTicket, setManualTicket] = useState('');
  const [manualMvt, setManualMvt] = useState('open');
  const [manualValeur, setManualValeur] = useState('');

  const handleMvtChange = (e) => {
    if (e.target.files && e.target.files[0]) {
      setEquipFile(e.target.files[0]);
    } else {
      setEquipFile(null);
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
  
          // Fix improperly quoted fields like ""16,5"" -> "16,5"
          // This must happen after the unwrapper to avoid breaking Excel's line wrapping
          text = text.replace(/,""([^"]+)""/g, ',"$1"');

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
    
      setIsLoading(true);
      setResults(null);
      
  
      try {
        let ticketDataRaw = null;
        
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
            
          }
        }
  
        
        setStatus('Importation globale terminée !');
      } catch (error) {
        console.error("Erreur lors de l'import:", error);
        setStatus("Une erreur s'est produite lors de l'import.");
      } finally {
        setIsLoading(false);
      }
    };

  const handleManualSubmit = async (e) => {
    e.preventDefault();
    if (!manualTicket || !manualMvt) {
      setStatus("Veuillez remplir au moins le Ticket et le Mouvement.");
      return;
    }
    
    setIsLoading(true);
    setStatus("Début saisie manuelle...");
    
    try {
      const manualData = [{
        ticket: manualTicket.trim(),
        mvt: manualMvt.trim(),
        valeur: manualValeur.trim()
      }];
      
      await processImport(manualData, (msg) => {
        setStatus(`[Saisie manuelle] ${msg}`);
      });
      
      setStatus("Saisie manuelle terminée avec succès !");
      
      setManualTicket('');
      setManualValeur('');
    } catch (error) {
      console.error("Erreur lors de la saisie manuelle:", error);
      setStatus("Une erreur s'est produite lors de la saisie manuelle.");
    } finally {
      setIsLoading(false);
    }
  };

    return (
    <div className="import-page" style={{ padding: '2rem', maxWidth: '800px', margin: '0 auto' }}>
      <h1>Import de Données des mouvement</h1>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <label style={{ width: '150px', fontWeight: 'bold' }}>Équipements :</label>
          <input 
            type="file" 
            accept=".csv" 
            onChange={handleMvtChange}
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

      <hr style={{ margin: '3rem 0', borderColor: '#eee' }} />
      
      <h2>Saisie Manuelle</h2>
      <p style={{ color: '#666', marginBottom: '1.5rem' }}>
        Ajoutez une ligne manuellement (utilise la même logique que l'import CSV).
      </p>
      <form onSubmit={handleManualSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 'bold' }}>Ticket ID :</label>
          <input 
            type="text" 
            value={manualTicket} 
            onChange={(e) => setManualTicket(e.target.value)} 
            placeholder="Ex: 25"
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 'bold' }}>Mouvement :</label>
          <select 
            value={manualMvt} 
            onChange={(e) => setManualMvt(e.target.value)}
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          >
            <option value="open">open</option>
            <option value="close">close</option>
            <option value="cancel">cancel</option>
          </select>
        </div>
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          <label style={{ fontWeight: 'bold' }}>Valeur :</label>
          <input 
            type="text" 
            value={manualValeur} 
            onChange={(e) => setManualValeur(e.target.value)} 
            placeholder='Ex: 16,5'
            style={{ padding: '0.5rem', border: '1px solid #ccc', borderRadius: '4px' }}
          />
        </div>

        <button 
          type="submit" 
          disabled={isLoading}
          style={{
            padding: '0.5rem 1rem',
            backgroundColor: isLoading ? '#ccc' : '#28a745',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: isLoading ? 'not-allowed' : 'pointer',
            marginTop: '0.5rem'
          }}
        >
          {isLoading ? 'Traitement en cours...' : 'Ajouter manuellement'}
        </button>
      </form>
    </div>
  );

}