import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { 
  getTicketsList, 
  getTicketDetails, 
  getTicketLinkedItems, 
  getTicketCosts 
} from "../service/ticket.js";

function Tickets() {
  const [tickets, setTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selectedTicket, setSelectedTicket] = useState(null);
  
  // États de la fiche détaillée
  const [ticketDetails, setTicketDetails] = useState(null);
  const [linkedItems, setLinkedItems] = useState([]);
  const [ticketCosts, setTicketCosts] = useState([]);
  
  const [loadingList, setLoadingList] = useState(true);
  const [loadingFiche, setLoadingFiche] = useState(false);

  useEffect(() => {
    loadTickets();
  }, []);

  const loadTickets = async () => {
    try {
      setLoadingList(true);
      const data = await getTicketsList();
      setTickets(data);
    } catch (e) {
      console.error("Erreur de chargement de la liste des tickets:", e);
    } finally {
      setLoadingList(false);
    }
  };

  // Chargement des données de la fiche
  const handleSelectTicket = async (ticket) => {
    setSelectedTicket(ticket);
    setLoadingFiche(true);
    try {
      const [details, items, costs] = await Promise.all([
        getTicketDetails(ticket.id),
        getTicketLinkedItems(ticket.id),
        getTicketCosts(ticket.id)
      ]);
      setTicketDetails(details);
      setLinkedItems(items);
      setTicketCosts(costs);
    } catch (e) {
      console.error("Erreur de chargement des détails du ticket:", e);
    } finally {
      setLoadingFiche(false);
    }
  };

  // Formatage des statuts GLPI sous forme de badges HTML
  const getStatusBadge = (statusId) => {
    const id = parseInt(statusId, 10);
    switch (id) {
      case 1: return <span className="badge bg-danger">Nouveau</span>;
      case 2:
      case 3: return <span className="badge bg-warning text-dark">En cours</span>;
      case 4: return <span className="badge bg-secondary">En attente</span>;
      case 5: return <span className="badge bg-info text-dark">Résolu</span>;
      case 6: return <span className="badge bg-success">Clos</span>;
      default: return <span className="badge bg-light text-dark">Inconnu ({statusId})</span>;
    }
  };

  // Libellés d'Urgence
  const getUrgencyLabel = (urgencyVal) => {
    const v = parseInt(urgencyVal, 10);
    switch (v) {
      case 1: return <span className="badge bg-secondary">Très basse (1)</span>;
      case 2: return <span className="badge bg-secondary">Basse (2)</span>;
      case 3: return <span className="badge bg-warning text-dark">Moyenne (3)</span>;
      case 4: return <span className="badge bg-danger">Haute (4)</span>;
      case 5: return <span className="badge bg-danger fw-bold">Très haute (5)</span>;
      default: return <span className="badge bg-light text-dark">N/A ({urgencyVal})</span>;
    }
  };

  // Libellés d'Impact
  const getImpactLabel = (impactVal) => {
    const v = parseInt(impactVal, 10);
    switch (v) {
      case 1: return <span className="badge bg-secondary">Très bas (1)</span>;
      case 2: return <span className="badge bg-secondary">Bas (2)</span>;
      case 3: return <span className="badge bg-warning text-dark">Moyen (3)</span>;
      case 4: return <span className="badge bg-danger">Haut (4)</span>;
      case 5: return <span className="badge bg-danger fw-bold">Très haut (5)</span>;
      default: return <span className="badge bg-light text-dark">N/A ({impactVal})</span>;
    }
  };

  // Libellés de Priorité
  const getPriorityLabel = (priorityVal) => {
    const v = parseInt(priorityVal, 10);
    switch (v) {
      case 1: return <span className="badge bg-secondary">Très basse (1)</span>;
      case 2: return <span className="badge bg-secondary">Basse (2)</span>;
      case 3: return <span className="badge bg-primary">Moyenne (3)</span>;
      case 4: return <span className="badge bg-danger">Haute (4)</span>;
      case 5: return <span className="badge bg-danger fw-bold">Très haute (5)</span>;
      case 6: return <span className="badge bg-danger fw-bold">Majeure (6)</span>;
      default: return <span className="badge bg-light text-dark">N/A ({priorityVal})</span>;
    }
  };

  // Filtrage local des tickets
  const filteredTickets = tickets.filter(ticket => {
    const matchesSearch = ticket.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                          (ticket.content && ticket.content.toLowerCase().includes(searchTerm.toLowerCase()));
    const matchesStatus = statusFilter === "all" || parseInt(ticket.status, 10) === parseInt(statusFilter, 10);
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="app-shell">
      <Sidebar />

      <div className="main p-4">
        <header className="topbar px-4 py-3 d-flex align-items-center justify-content-between mb-4 rounded shadow-sm">
          <div>
            <h1 className="h4 mb-1 text-primary">Gestion des Tickets</h1>
            <p className="text-muted mb-0 small">Consultez les incidents et suivez les fiches d'intervention.</p>
          </div>
          <button className="btn btn-outline-primary" onClick={loadTickets}>Actualiser</button>
        </header>

        <div className="row g-4">
          {/* SECTION GAUCHE : LISTE DES TICKETS */}
          <div className="col-md-5">
            <div className="card shadow-sm border-0 p-3 h-100">
              <h5 className="text-secondary mb-3">Tickets déclarés</h5>

              {/* Filtres */}
              <div className="d-flex gap-2 mb-3">
                <input 
                  type="text" 
                  className="form-control form-control-sm"
                  placeholder="Rechercher un ticket..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select 
                  className="form-select form-select-sm"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={{ maxWidth: '140px' }}
                >
                  <option value="all">Tous états</option>
                  <option value="1">Nouveau</option>
                  <option value="2">En cours</option>
                  <option value="5">Résolu</option>
                  <option value="6">Clos</option>
                </select>
              </div>

              {loadingList ? (
                <div className="text-center my-4">
                  <div className="spinner-border spinner-border-sm text-primary"></div>
                </div>
              ) : (
                <div className="list-group overflow-auto" style={{ maxHeight: '550px' }}>
                  {filteredTickets.map(ticket => (
                    <button
                      key={ticket.id}
                      onClick={() => handleSelectTicket(ticket)}
                      className={`list-group-item list-group-item-action py-3 border-start border-4 ${
                        selectedTicket?.id === ticket.id ? 'active border-primary' : 'border-secondary'
                      }`}
                    >
                      <div className="d-flex justify-content-between align-items-start mb-1">
                        <span className="small fw-semibold text-muted">Ticket #{ticket.id}</span>
                        {getStatusBadge(ticket.status)}
                      </div>
                      <h6 className="mb-1 text-truncate">{ticket.name || "Sans titre"}</h6>
                      <p className="small text-muted mb-0 text-truncate">{ticket.content}</p>
                    </button>
                  ))}
                  {filteredTickets.length === 0 && (
                    <div className="text-center text-muted small py-4">Aucun ticket correspondant.</div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* SECTION DROITE : LA FICHE DU TICKET SÉLECTIONNÉ */}
          <div className="col-md-7">
            <div className="card shadow-sm border-0 p-4 h-100" style={{ minHeight: '500px' }}>
              {!selectedTicket ? (
                <div className="d-flex flex-column align-items-center justify-content-center h-100 py-5 text-muted">
                  <span className="fs-1 mb-2">🎟️</span>
                  <span>Sélectionnez un ticket à gauche pour afficher sa fiche de suivi.</span>
                </div>
              ) : loadingFiche ? (
                <div className="d-flex justify-content-center align-items-center h-100 py-5">
                  <div className="spinner-border text-primary"></div>
                </div>
              ) : ticketDetails ? (
                <div>
                  {/* En-tête Fiche */}
                  <div className="d-flex justify-content-between align-items-start border-bottom pb-3 mb-3">
                    <div>
                      <span className="badge bg-light text-dark border mb-2">Fiche d'intervention</span>
                      <h4 className="mb-1">Ticket #{ticketDetails.id} : {ticketDetails.name}</h4>
                      <p className="small text-muted mb-0">Modifié le : {ticketDetails.date_mod}</p>
                    </div>
                    <div>
                      {getStatusBadge(ticketDetails.status)}
                    </div>
                  </div>

                  {/* Fiche de Détail des Champs demandés */}
                  <div className="card shadow-sm border-0 p-3 mb-4 bg-light border-start border-primary border-4">
                    <h6 className="text-primary fw-semibold mb-3 border-bottom pb-2">📋 Informations détaillées</h6>
                    <div className="row g-3">
                      <div className="col-6 col-sm-4">
                        <span className="text-secondary small d-block">Date d'ouverture</span>
                        <span className="fw-bold text-dark">{ticketDetails.date || "N/A"}</span>
                      </div>
                      <div className="col-6 col-sm-4">
                        <span className="text-secondary small d-block">Type</span>
                        <span className="fw-bold text-dark">
                          {parseInt(ticketDetails.type, 10) === 1 ? "⚠️ Incident" : "📋 Demande"}
                        </span>
                      </div>
                      <div className="col-6 col-sm-4">
                        <span className="text-secondary small d-block">Catégorie</span>
                        <span className="fw-bold text-dark">{ticketDetails.itilcategories_id || "Non catégorisé"}</span>
                      </div>
                      <div className="col-6 col-sm-4">
                        <span className="text-secondary small d-block">Statut</span>
                        <div>{getStatusBadge(ticketDetails.status)}</div>
                      </div>
                      <div className="col-6 col-sm-4">
                        <span className="text-secondary small d-block">Source de la demande</span>
                        <span className="fw-bold text-dark">{ticketDetails.requesttypes_id || "Directe"}</span>
                      </div>
                      <div className="col-6 col-sm-4">
                        <span className="text-secondary small d-block">Urgence</span>
                        <div>{getUrgencyLabel(ticketDetails.urgency)}</div>
                      </div>
                      <div className="col-6 col-sm-4">
                        <span className="text-secondary small d-block">Impact</span>
                        <div>{getImpactLabel(ticketDetails.impact)}</div>
                      </div>
                      <div className="col-6 col-sm-4">
                        <span className="text-secondary small d-block">Priorité</span>
                        <div>{getPriorityLabel(ticketDetails.priority)}</div>
                      </div>
                    </div>
                  </div>

                  {/* Description */}
                  <div className="mb-4">
                    <h6 className="text-secondary fw-semibold mb-2">Description du problème</h6>
                    <div className="p-3 bg-light rounded font-monospace small" style={{ whiteSpace: 'pre-wrap' }}>
                      {ticketDetails.content || <span className="text-muted italic">Aucune description fournie.</span>}
                    </div>
                  </div>

                  {/* Matériels associés (Item_Ticket) */}
                  <div className="mb-4 border-top pt-3">
                    <h6 className="text-secondary fw-semibold mb-2">💻 Matériel(s) informatique(s) associé(s)</h6>
                    {linkedItems.length === 0 ? (
                      <span className="text-muted small italic">Aucun matériel rattaché à ce ticket.</span>
                    ) : (
                      <div className="list-group">
                        {linkedItems.map((link) => (
                          <div key={link.id} className="list-group-item d-flex justify-content-between align-items-center py-2 bg-light">
                            <span className="small"><strong>[{link.itemtype}]</strong> {link.items_id}</span>
                            <span className="badge bg-secondary">Rattaché</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Coûts et Temps d'intervention (TicketCost) */}
                  <div className="mb-2 border-top pt-3">
                    <h6 className="text-secondary fw-semibold mb-2">💰 Temps passé & Coûts d'intervention</h6>
                    {ticketCosts.length === 0 ? (
                      <span className="text-muted small italic">Aucune information financière enregistrée sur ce ticket.</span>
                    ) : (
                      <div className="table-responsive">
                        <table className="table table-sm table-bordered mt-1">
                          <thead className="table-light">
                            <tr className="small">
                              <th>Libellé / Intervention</th>
                              <th>Temps passé</th>
                              <th>Coût horaire</th>
                              <th>Coût fixe</th>
                              <th>Coût matériel</th>
                            </tr>
                          </thead>
                          <tbody className="small">
                            {ticketCosts.map((cost) => (
                              <tr key={cost.id}>
                                <td>{cost.name || "Intervention technique"}</td>
                                <td>{cost.actiontime ? Math.round(cost.actiontime / 60) : 0} minutes</td>
                                <td>{cost.cost_time || 0} € / hr</td>
                                <td>{cost.cost_fixed || 0} €</td>
                                <td>{cost.cost_material || 0} €</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Tickets;
