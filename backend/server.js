const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
const PORT = 3001;

// Middlewares
app.use(cors());
app.use(express.json());

// Initialize SQLite Database
const dbPath = path.resolve(__dirname, 'kanban.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base SQLite :', err.message);
  } else {
    console.log('Connecté à la base de données SQLite (kanban.db).');
    
    // Create the table if it doesn't exist
    db.run(`CREATE TABLE IF NOT EXISTS kanban_config (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      config_data TEXT NOT NULL
    )`, (err) => {
      if (err) {
        console.error('Erreur lors de la création de la table :', err.message);
      } else {
        // Initialize with default data if empty
        const DEFAULT_CONFIG = {
          columns: {
            nouveau: { color: '#fee2e2', labelMg: 'Vaovao', labelFr: 'Nouveau' },
            in_progress: { color: '#fef3c7', labelMg: 'Efa manao', labelFr: 'In progress' },
            termine: { color: '#dcfce7', labelMg: 'Vita', labelFr: 'Terminé' },
          },
        };
        
        db.get(`SELECT config_data FROM kanban_config WHERE id = 1`, (err, row) => {
          if (!row) {
            db.run(`INSERT INTO kanban_config (id, config_data) VALUES (1, ?)`, [JSON.stringify(DEFAULT_CONFIG)]);
            console.log('Configuration par défaut insérée.');
          }
        });
      }
    });
  }
});

// GET Endpoint to retrieve the config
app.get('/api/kanban-config', (req, res) => {
  db.get(`SELECT config_data FROM kanban_config WHERE id = 1`, (err, row) => {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    if (row && row.config_data) {
      try {
        const config = JSON.parse(row.config_data);
        return res.json(config);
      } catch (parseErr) {
        return res.status(500).json({ error: 'Erreur parsing JSON' });
      }
    }
    res.status(404).json({ error: 'Configuration introuvable' });
  });
});

// POST Endpoint to update the config
app.post('/api/kanban-config', (req, res) => {
  const newConfig = req.body;
  if (!newConfig) {
    return res.status(400).json({ error: 'Données manquantes' });
  }

  db.run(`UPDATE kanban_config SET config_data = ? WHERE id = 1`, [JSON.stringify(newConfig)], function(err) {
    if (err) {
      return res.status(500).json({ error: err.message });
    }
    res.json({ success: true, message: 'Configuration sauvegardée dans SQLite.' });
  });
});

app.listen(PORT, () => {
  console.log(`Serveur API Kanban démarré sur http://localhost:${PORT}`);
});
