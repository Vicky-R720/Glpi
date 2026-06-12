import { useState, useEffect } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { getTicketsList, getTicketLinkedItems, getTicketCosts, getKanbanAsks } from "../service/ticket.js";

export default function ItemsCost() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [itemsList, setItemsList] = useState([]);
    const [metrics, setMetrics] = useState({
        totalItems: 0,
        totalCost: 0,
        totalGlpi: 0,
        totalKanban: 0
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedItemKey, setExpandedItemKey] = useState(null);

    useEffect(() => {
        async function loadAndComputeCosts() {
            try {
                setLoading(true);
                // 1. Charger les tickets et les superprices
                const [tickets, asks] = await Promise.all([
                    getTicketsList(),
                    getKanbanAsks()
                ]);

                // 2. Pour chaque ticket, charger les items associés et les coûts associés en parallèle
                const ticketsWithDetails = await Promise.all(
                    tickets.map(async (ticket) => {
                        try {
                            const [linkedItems, costs] = await Promise.all([
                                getTicketLinkedItems(ticket.id),
                                getTicketCosts(ticket.id)
                            ]);
                            return { ...ticket, linkedItems, costs };
                        } catch (err) {
                            console.error(`Erreur pour le ticket #${ticket.id}:`, err);
                            return { ...ticket, linkedItems: [], costs: [] };
                        }
                    })
                );

                // 3. Calculer les coûts par ticket et les attribuer aux types d'items
                const groupsMap = {};
                
                // Mapper les superprices par ID de ticket pour un accès rapide
                const askMap = {};
                asks.forEach(ask => {
                    const tid = parseInt(ask.id_ticket || ask.ticketId, 10);
                    if (tid) {
                        const price = parseFloat(ask.superprice || 0);
                        askMap[tid] = (askMap[tid] || 0) + price;
                    }
                });

                ticketsWithDetails.forEach((ticket) => {
                    // Calculer le coût GLPI pour ce ticket
                    // Formule : actiontime (converti en heure) * cost_time + cost_fixed + cost_material
                    let glpiCost = 0;
                    if (Array.isArray(ticket.costs)) {
                        ticket.costs.forEach(cost => {
                            const timeHrs = cost.actiontime ? (parseFloat(cost.actiontime) / 3600.0) : 0;
                            const hourlyRate = parseFloat(cost.cost_time || 0);
                            const fixedCost = parseFloat(cost.cost_fixed || 0);
                            const materialCost = parseFloat(cost.cost_material || 0);
                            glpiCost += (timeHrs * hourlyRate) + fixedCost + materialCost;
                        });
                    }

                    // Calculer le coût Kanban (superprice) pour ce ticket
                    const kanbanCost = askMap[ticket.id] || 0;

                    // Nombre d'items associés à ce ticket
                    const linked = ticket.linkedItems || [];
                    const N = linked.length;

                    if (N > 0) {
                        const glpiShare = glpiCost / N;
                        const kanbanShare = kanbanCost / N;
                        const totalShare = (glpiCost + kanbanCost) / N;

                        linked.forEach(item => {
                            const groupKey = item.itemtype;
                            if (!groupsMap[groupKey]) {
                                groupsMap[groupKey] = {
                                    key: groupKey,
                                    itemtype: groupKey,
                                    unique_items_set: new Set(),
                                    tickets: [],
                                    total_glpi: 0,
                                    total_kanban: 0,
                                    total_cost: 0
                                };
                            }

                            groupsMap[groupKey].unique_items_set.add(item.items_id);
                            groupsMap[groupKey].total_glpi += glpiShare;
                            groupsMap[groupKey].total_kanban += kanbanShare;
                            groupsMap[groupKey].total_cost += totalShare;

                            let existingTicket = groupsMap[groupKey].tickets.find(t => t.id === ticket.id);
                            if (existingTicket) {
                                existingTicket.glpi_share += glpiShare;
                                existingTicket.kanban_share += kanbanShare;
                                existingTicket.total_share += totalShare;
                                existingTicket.items_of_this_type_count += 1;
                            } else {
                                groupsMap[groupKey].tickets.push({
                                    id: ticket.id,
                                    name: ticket.name,
                                    status: ticket.status,
                                    total_items: N,
                                    glpi_cost: glpiCost,
                                    kanban_cost: kanbanCost,
                                    glpi_share: glpiShare,
                                    kanban_share: kanbanShare,
                                    total_share: totalShare,
                                    items_of_this_type_count: 1
                                });
                            }
                        });
                    }
                });

                const computedGroups = Object.values(groupsMap).map(group => ({
                    ...group,
                    unique_items: group.unique_items_set.size
                }));
                
                // Calculer les métriques globales
                let totalCostSum = 0;
                let totalGlpiSum = 0;
                let totalKanbanSum = 0;
                let totalItemsSum = 0;

                computedGroups.forEach(group => {
                    totalCostSum += group.total_cost;
                    totalGlpiSum += group.total_glpi;
                    totalKanbanSum += group.total_kanban;
                    totalItemsSum += group.unique_items;
                });

                setItemsList(computedGroups);
                setMetrics({
                    totalItems: totalItemsSum,
                    totalCost: totalCostSum,
                    totalGlpi: totalGlpiSum,
                    totalKanban: totalKanbanSum
                });

            } catch (err) {
                console.error("Erreur de calcul des coûts des items:", err);
                setError("Impossible de charger les données de coût des items.");
            } finally {
                setLoading(false);
            }
        }

        loadAndComputeCosts();
    }, []);

    // Filtrer les items par recherche
    const filteredItems = itemsList.filter(item => {
        const query = searchQuery.toLowerCase();
        return item.itemtype.toLowerCase().includes(query);
    });

    const toggleExpandRow = (key) => {
        if (expandedItemKey === key) {
            setExpandedItemKey(null);
        } else {
            setExpandedItemKey(key);
        }
    };

    const getStatusBadge = (statusId) => {
        const id = parseInt(statusId, 10);
        switch (id) {
            case 1: return <span className="badge bg-danger">Nouveau</span>;
            case 2:
            case 3: return <span className="badge bg-warning text-dark">En cours</span>;
            case 4: return <span className="badge bg-secondary">En attente</span>;
            case 5: return <span className="badge bg-info text-dark">Résolu</span>;
            case 6: return <span className="badge bg-success">Clos</span>;
            default: return <span className="badge bg-light text-dark">Statut {statusId}</span>;
        }
    };

    return (
        <div className="app-shell">
            <Sidebar />

            <div className="main">
                <header className="topbar px-4 py-3 d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between">
                    <div>
                        <h1 className="h4 mb-1">Coût par Équipement</h1>
                        <p className="text-muted mb-0 small">
                            Ventilation des coûts financiers (GLPI + Kanban) répartis équitablement par équipement rattaché.
                        </p>
                    </div>
                    <div>
                        <button className="btn btn-primary" onClick={() => window.location.reload()}>
                            Actualiser
                        </button>
                    </div>
                </header>

                <main className="content p-4">
                    {loading ? (
                        <div className="d-flex justify-content-center align-items-center my-5 py-5">
                            <div className="spinner-border text-primary" role="status">
                                <span className="visually-hidden">Chargement...</span>
                            </div>
                        </div>
                    ) : error ? (
                        <div className="alert alert-danger" role="alert">
                            {error}
                        </div>
                    ) : (
                        <>
                            {/* METRICS CARDS */}
                            <div className="row g-4 mb-4">
                                <div className="col-md-3">
                                    <div className="card shadow-sm border-0 p-3 h-100">
                                        <div className="card-body">
                                            <h6 className="card-subtitle text-muted mb-1 small text-uppercase fw-semibold">Équipements Rattachés</h6>
                                            <h3 className="card-title fw-bold mb-0 text-dark">{metrics.totalItems}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card shadow-sm border-0 p-3 h-100 bg-light border-start border-primary border-4">
                                        <div className="card-body">
                                            <h6 className="card-subtitle text-primary mb-1 small text-uppercase fw-semibold">Coût Total Réparti</h6>
                                            <h3 className="card-title fw-bold mb-0 text-primary">{metrics.totalCost.toFixed(2)} €</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card shadow-sm border-0 p-3 h-100">
                                        <div className="card-body">
                                            <h6 className="card-subtitle text-muted mb-1 small text-uppercase fw-semibold">Part Coûts GLPI</h6>
                                            <h3 className="card-title fw-bold mb-0 text-success">{metrics.totalGlpi.toFixed(2)} €</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col-md-3">
                                    <div className="card shadow-sm border-0 p-3 h-100">
                                        <div className="card-body">
                                            <h6 className="card-subtitle text-muted mb-1 small text-uppercase fw-semibold">Part Coûts Kanban (SQLite)</h6>
                                            <h3 className="card-title fw-bold mb-0 text-info">{metrics.totalKanban.toFixed(2)} €</h3>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* SEARCH BAR */}
                            <div className="card shadow-sm border-0 p-3 mb-4">
                                <div className="input-group">
                                    <span className="input-group-text bg-white border-end-0">🔍</span>
                                    <input
                                        type="text"
                                        className="form-control border-start-0"
                                        placeholder="Filtrer par type d'équipement (ex: Computer, Monitor) ou ID..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* MAIN TABLE */}
                            <div className="card shadow-sm border-0 p-4">
                                <h5 className="text-secondary mb-3">Répartition des Coûts par Type d'Équipement</h5>
                                <div className="table-responsive">
                                    <table className="table table-hover align-middle">
                                        <thead className="table-light">
                                            <tr>
                                                <th style={{ width: '40px' }}></th>
                                                <th>Type Équipement</th>
                                                <th className="text-center">Quantité (Unique)</th>
                                                <th className="text-center">Tickets associés</th>
                                                <th className="text-end">Coût GLPI (€)</th>
                                                <th className="text-end">Coût Kanban (SQLite) (€)</th>
                                                <th className="text-end fw-bold">Coût Total (€)</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredItems.map((item) => {
                                                const isExpanded = expandedItemKey === item.key;
                                                return (
                                                    <>
                                                        <tr 
                                                            key={item.key} 
                                                            onClick={() => toggleExpandRow(item.key)}
                                                            style={{ cursor: 'pointer' }}
                                                        >
                                                            <td className="text-center text-muted">
                                                                {isExpanded ? '▼' : '▶'}
                                                            </td>
                                                            <td>
                                                                <span className="fw-semibold">
                                                                    {item.itemtype === 'Computer' ? '🖥️ Computer' : 
                                                                     item.itemtype === 'Monitor' ? '📺 Monitor' : 
                                                                     `🔌 ${item.itemtype}`}
                                                                </span>
                                                            </td>
                                                            <td className="text-center">
                                                                <span className="badge bg-light text-dark border">
                                                                    {item.unique_items}
                                                                </span>
                                                            </td>
                                                            <td className="text-center">
                                                                <span className="badge bg-secondary rounded-pill">
                                                                    {item.tickets.length}
                                                                </span>
                                                            </td>
                                                            <td className="text-end text-success">{item.total_glpi.toFixed(2)} €</td>
                                                            <td className="text-end text-info">{item.total_kanban.toFixed(2)} €</td>
                                                            <td className="text-end fw-bold text-dark">{item.total_cost.toFixed(2)} €</td>
                                                        </tr>

                                                        {/* EXPANDED DETAILS */}
                                                        {isExpanded && (
                                                            <tr className="table-light">
                                                                <td colSpan="7" className="p-3">
                                                                    <div className="bg-white p-3 rounded shadow-sm border">
                                                                        <h6 className="text-secondary fw-bold mb-3 small text-uppercase">
                                                                            Détail des tickets contribuant au coût de ce type
                                                                        </h6>
                                                                        <table className="table table-sm table-bordered mb-0 small">
                                                                            <thead className="table-light">
                                                                                <tr>
                                                                                    <th>Ticket</th>
                                                                                    <th className="text-center">Statut</th>
                                                                                    <th className="text-center">Nb (Ce Type) / Total liés</th>
                                                                                    <th className="text-end">Coût Total GLPI</th>
                                                                                    <th className="text-end">Coût Kanban SQLite</th>
                                                                                    <th className="text-end fw-bold">Part attribuée à ce type</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {item.tickets.map((t) => (
                                                                                    <tr key={t.id}>
                                                                                        <td>
                                                                                            <strong>#{t.id}</strong> - {t.name || 'Sans sujet'}
                                                                                        </td>
                                                                                        <td className="text-center">
                                                                                            {getStatusBadge(t.status)}
                                                                                        </td>
                                                                                        <td className="text-center">
                                                                                            {t.items_of_this_type_count} / {t.total_items}
                                                                                        </td>
                                                                                        <td className="text-end">{t.glpi_cost.toFixed(2)} €</td>
                                                                                        <td className="text-end">{t.kanban_cost.toFixed(2)} €</td>
                                                                                        <td className="text-end fw-bold bg-light">
                                                                                            {t.total_share.toFixed(2)} €
                                                                                        </td>
                                                                                    </tr>
                                                                                ))}
                                                                            </tbody>
                                                                        </table>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        )}
                                                    </>
                                                );
                                            })}

                                            {filteredItems.length === 0 && (
                                                <tr>
                                                    <td colSpan="7" className="text-center text-muted py-4">
                                                        Aucun matériel trouvé correspondant à la recherche.
                                                    </td>
                                                </tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        </>
                    )}
                </main>
            </div>
        </div>
    );
}
