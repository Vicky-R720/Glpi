import { useEffect, useState } from 'react'
import { BrowserRouter as Router, Routes, Route, NavLink, Navigate, useLocation, Outlet, useOutletContext } from 'react-router-dom'
import './App.css'
import Assets from './page/Assets.jsx'
import DeclareTicket from './page/DeclareTicket.jsx'

//tsiory
const SESSION_TOKEN = import.meta.env.VITE_SESSION_TOKEN;
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;

const INVENTORY_ASSETS = [
  "Computer",
  "Monitor",
  "NetworkEquipment",
  "Peripheral",
  "Phone",
  "Printer",
  "Software",
  "Consumable",
  "ConsumableItem",
  "Cartridge",
  "CartridgeItem",
  "Rack",
  "Pdu",
  "PassiveDCEquipment",
  "Enclosure",
  "Cable",
  "PassiveDCObject"
];

const ENTITY_CONFIGS = {
  Computer: { label: "Ordinateurs", icon: "🖥️" },
  Monitor: { label: "Écrans & Moniteurs", icon: "📺" },
  NetworkEquipment: { label: "Matériels Réseau", icon: "🔌" },
  Peripheral: { label: "Périphériques", icon: "🖱️" },
  Phone: { label: "Téléphones", icon: "📞" },
  Printer: { label: "Imprimantes", icon: "🖨️" },
  Software: { label: "Logiciels", icon: "💿" },
  Consumable: { label: "Consommables", icon: "🔋" },
  ConsumableItem: { label: "Consommables", icon: "🔋" },
  Cartridge: { label: "Cartouches", icon: "🖨️" },
  CartridgeItem: { label: "Cartouches", icon: "🖨️" },
  Rack: { label: "Racks / Baies", icon: "🗄️" },
  Pdu: { label: "PDUs", icon: "🔌" },
  PassiveDCEquipment: { label: "Équipements DC Passifs", icon: "⚙️" },
  Enclosure: { label: "Châssis", icon: "📦" },
  Cable: { label: "Câbles", icon: "🪢" },
  PassiveDCObject: { label: "Objets DC Passifs", icon: "⚙️" }
};

function AppLayout() {
  const [assets, setAssets] = useState({});
  const [tickets, setTickets] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  // Fetch Inventory and Tickets (for inventory and list tabs)
  const loadData = async () => {
    setLoading(true);
    try {
      // Fetch Assets (taking the entities that exist)
      const fetchedAssets = {};
      const assetPromises = INVENTORY_ASSETS.map(async (entity) => {
        try {
          const res = await fetch(`/api/${entity}/?range=0-100`, {
            headers: { 
              "Content-Type": "application/json",
              "Session-Token": SESSION_TOKEN,
              "App-Token": APP_TOKEN
            }
          });
          if (res.ok) {
            const data = await res.json();
            if (Array.isArray(data) && data.length > 0) {
              fetchedAssets[entity] = data;
            }
          }
        } catch (e) {
          console.warn(`Error fetching entity ${entity}:`, e);
        }
      });

      // Fetch Tickets
      const resTick = await fetch('/api/Ticket/?range=0-100', {
        headers: { 
          "Content-Type": "application/json",
          "Session-Token": SESSION_TOKEN,
          "App-Token": APP_TOKEN
        }
      });
      let ticketsData = [];
      if (resTick.ok) {
        const data = await resTick.json();
        ticketsData = Array.isArray(data) ? data : [];
      }
      setTickets(ticketsData);

      await Promise.all(assetPromises);
      setAssets(fetchedAssets);
    } catch (e) {
      console.error("Error loading frontoffice data:", e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (location.pathname === '/inventory' || location.pathname === '/tickets' || location.pathname === '/') {
      loadData();
    }
  }, [location.pathname]);

  return (
    <div>
      <header className="site-header">
        <div className="container d-flex align-items-center justify-content-between">
          <a href="#" className="brand">🏢 Portail Utilisateur GLPI</a>
          <div className="d-flex gap-3">
            <NavLink 
              to="/inventory" 
              className={({ isActive }) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-primary'}`}
            >
              🖥️ Mon Matériel
            </NavLink>
            <NavLink 
              to="/assets" 
              className={({ isActive }) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-primary'}`}
            >
              🔍 Recherche d'Éléments
            </NavLink>
            <NavLink 
              to="/tickets" 
              className={({ isActive }) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-primary'}`}
            >
              🎟️ Mes Tickets
            </NavLink>
            <NavLink 
              to="/new-ticket" 
              className={({ isActive }) => `btn btn-sm ${isActive ? 'btn-primary' : 'btn-outline-primary'}`}
            >
              ➕ Déclarer Incident / Demande
            </NavLink>
          </div>
        </div>
      </header>

      <main className="container main-content" style={{ minHeight: '60vh' }}>
        {loading && location.pathname !== '/new-ticket' && location.pathname !== '/assets' && (
          <div className="text-center py-4">
            <div className="spinner-border text-primary" role="status"></div>
            <p className="mt-2 text-muted">Chargement des informations...</p>
          </div>
        )}
        <Outlet context={{ assets, tickets, loading }} />
      </main>

      <footer className="site-footer">
        <div className="container">
          🏢 Portail Utilisateur GLPI • Propulsé par React & API REST
        </div>
      </footer>
    </div>
  );
}

function InventoryView() {
  const { assets, loading } = useOutletContext();
  if (loading) return null;

  return (
    <div>
      <h2 className="h4 mb-4">Mes Équipements Enregistrés</h2>
      {Object.keys(assets).length === 0 ? (
        <div className="card shadow-sm border-0 p-4 text-center">
          <p className="text-muted mb-0">Aucun équipement enregistré.</p>
        </div>
      ) : (
        <div className="row g-4">
          {Object.entries(assets).map(([entityKey, items]) => {
            const config = ENTITY_CONFIGS[entityKey] || { label: entityKey, icon: "📦" };
            return (
              <div key={entityKey} className="col-md-6">
                <div className="card shadow-sm border-0 p-4 h-100">
                  <h3 className="h5 text-primary border-bottom pb-2 mb-3">
                    {config.icon} {config.label} ({items.length})
                  </h3>
                  <div className="list-group list-group-flush">
                    {items.map(item => (
                      <div key={item.id} className="list-group-item py-2 px-0 d-flex justify-content-between align-items-center">
                        <div>
                          <span className="fw-bold text-dark">{item.name || "Sans nom"}</span>
                          {item.serial && item.serial !== "N/A" && (
                            <span className="text-muted small d-block">S/N: {item.serial}</span>
                          )}
                        </div>
                        <span className="badge bg-light text-dark border">ID: {item.id}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function TicketsView() {
  const { tickets, loading } = useOutletContext();
  if (loading) return null;

  return (
    <div>
      <h2 className="h4 mb-4">Mes Demandes de Support / Incidents</h2>
      <div className="card shadow-sm border-0 p-4">
        {tickets.length === 0 ? (
          <div className="text-center py-4">
            <span className="fs-1">🎉</span>
            <p className="text-muted mt-2">Aucun incident ou ticket actif.</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover align-middle">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Incident / Titre</th>
                  <th>Status</th>
                  <th className="text-end">Date de création</th>
                </tr>
              </thead>
              <tbody>
                {tickets.map(t => (
                  <tr key={t.id}>
                    <td><code>#{t.id}</code></td>
                    <td>
                      <span className="fw-bold text-dark">{t.name}</span>
                      {t.content && <span className="text-muted small d-block text-truncate" style={{ maxWidth: '400px' }} dangerouslySetInnerHTML={{ __html: t.content }}></span>}
                    </td>
                    <td>
                      <span className="badge bg-warning text-dark">En cours</span>
                    </td>
                    <td className="text-end text-muted small">{t.date_creation || t.date_mod || 'N/A'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function App() {
  return (
    <Router>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/" element={<Navigate to="/inventory" replace />} />
          <Route path="/inventory" element={<InventoryView />} />
          <Route path="/assets" element={<Assets />} />
          <Route path="/tickets" element={<TicketsView />} />
          <Route path="/new-ticket" element={<DeclareTicket />} />
          
          {/* Redirect other views to inventory */}
          <Route path="/computers" element={<Navigate to="/inventory" replace />} />
          <Route path="/monitors" element={<Navigate to="/inventory" replace />} />
          <Route path="*" element={<Navigate to="/inventory" replace />} />
        </Route>
      </Routes>
    </Router>
  );
}
