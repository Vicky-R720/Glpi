import { useState, useEffect, useCallback } from "react";
import Sidebar from "../components/Sidebar.jsx";
import { getKanbanAsks, getTicketsList, getTicketLinkedItems, getTicketCosts } from "../service/ticket.js";

export default function ItemsCost() {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [itemsList, setItemsList] = useState([]);
    const [metrics, setMetrics] = useState({
        totalItems: 0,
        totalCost: 0,
        totalGlpi: 0,
        totalSuperprice: 0,
        totalReo: 0
    });
    const [searchQuery, setSearchQuery] = useState("");
    const [expandedItemKey, setExpandedItemKey] = useState(null);

    const loadAndComputeCosts = useCallback(async () => {
        try {
            setLoading(true);
            const asks = await getKanbanAsks();

            const groupsMap = {};
            
            let totalCostSum = 0;
            let totalGlpiSum = 0;
            let totalSuperpriceSum = 0;
            let totalReoSum = 0;
            let totalItemsSum = 0;

            asks.forEach(ask => {
                const groupKey = ask.category || "Non catégorisé";
                if (!groupsMap[groupKey]) {
                    groupsMap[groupKey] = {
                        key: groupKey,
                        itemtype: groupKey,
                        unique_items_set: new Set(),
                        tickets: [],
                        total_glpi: 0,
                        total_superprice: 0,
                        total_reo: 0,
                        total_cost: 0
                    };
                }

                const glpiShare = parseFloat(ask.cout_glpi) || 0;
                const coutSaisi = parseFloat(ask.cout_saisi) || 0;
                const typeSaisi = ask.type_saisi || "super_price";
                const isSuperPrice = typeSaisi === "super_price";

                groupsMap[groupKey].unique_items_set.add(ask.id_item);

                // Ne compter cout_glpi qu'une seule fois par ticket+item
                const glpiKey = ask.id_ticket + "_" + ask.id_item;
                if (!groupsMap[groupKey].glpi_counted) {
                    groupsMap[groupKey].glpi_counted = new Set();
                }
                let glpiToAdd = 0;
                if (!groupsMap[groupKey].glpi_counted.has(glpiKey)) {
                    groupsMap[groupKey].glpi_counted.add(glpiKey);
                    groupsMap[groupKey].total_glpi += glpiShare;
                    glpiToAdd = glpiShare;
                }

                if (isSuperPrice) {
                    groupsMap[groupKey].total_superprice += coutSaisi;
                } else {
                    groupsMap[groupKey].total_reo += coutSaisi;
                }
                groupsMap[groupKey].total_cost += glpiToAdd + coutSaisi;

                groupsMap[groupKey].tickets.push({
                    id_ticket: ask.id_ticket,
                    id_item: ask.id_item,
                    type_saisi: typeSaisi,
                    glpi_share: glpiToAdd,
                    cout_saisi: coutSaisi,
                    total_share: glpiToAdd + coutSaisi
                });
            });

            const computedGroups = Object.values(groupsMap).map(group => {
                const uniqueCount = group.unique_items_set.size;
                totalCostSum += group.total_cost;
                totalGlpiSum += group.total_glpi;
                totalSuperpriceSum += group.total_superprice;
                totalReoSum += group.total_reo;
                totalItemsSum += uniqueCount;

                return {
                    ...group,
                    unique_items: uniqueCount
                };
            });

            setItemsList(computedGroups);
            setMetrics({
                totalItems: totalItemsSum,
                totalCost: totalCostSum,
                totalGlpi: totalGlpiSum,
                totalSuperprice: totalSuperpriceSum,
                totalReo: totalReoSum
            });

        } catch (err) {
            console.error("Erreur de calcul des coûts des items:", err);
            setError("Impossible de charger les données de coût des items depuis SQLite.");
        } finally {
            setLoading(false);
        }
    }, []);

    const handleSync = useCallback(async () => {
        try {
            setLoading(true);
            const tickets = await getTicketsList();
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

            const syncPayload = [];
            ticketsWithDetails.forEach((ticket) => {
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
                const linked = ticket.linkedItems || [];
                const N = linked.length > 0 ? linked.length : 1;
                const glpiShare = glpiCost / N;

                if (linked.length > 0) {
                    linked.forEach(item => {
                        syncPayload.push({
                            id_ticket: ticket.id,
                            cout_glpi: glpiShare,
                            id_item: item.items_id,
                            category: item.itemtype
                        });
                    });
                } else {
                    syncPayload.push({
                        id_ticket: ticket.id,
                        cout_glpi: glpiCost,
                        id_item: 0,
                        category: "Non catégorisé"
                    });
                }
            });

            await fetch("http://localhost:8080/api/ask/sync", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(syncPayload)
            });

            await loadAndComputeCosts();

        } catch (error) {
            console.error("Erreur de synchronisation GLPI vers SQLite:", error);
            setError("Impossible de synchroniser avec GLPI.");
            setLoading(false);
        }
    }, [loadAndComputeCosts]);

    useEffect(() => {
        handleSync();
    }, [handleSync]);

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

    return (
        <div className="app-shell">
            <Sidebar />

            <div className="main">
                <header className="topbar px-4 py-3 d-flex flex-column flex-md-row gap-3 align-items-md-center justify-content-between">
                    <div>
                        <h1 className="h4 mb-1">Coût par Équipement (SQLite Kanban)</h1>
                        <p className="text-muted mb-0 small">
                            Ventilation des coûts financiers (GLPI + Kanban) à partir de la table consolidée.
                        </p>
                    </div>
                    <div>
                        <button className="btn btn-primary" onClick={handleSync} disabled={loading}>
                            {loading ? "Synchronisation..." : "Synchroniser GLPI"}
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
                                <div className="col">
                                    <div className="card shadow-sm border-0 p-3 h-100">
                                        <div className="card-body">
                                            <h6 className="card-subtitle text-muted mb-1 small text-uppercase fw-semibold">Équipements Uniques</h6>
                                            <h3 className="card-title fw-bold mb-0 text-dark">{metrics.totalItems}</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col">
                                    <div className="card shadow-sm border-0 p-3 h-100">
                                        <div className="card-body">
                                            <h6 className="card-subtitle text-muted mb-1 small text-uppercase fw-semibold">Coûts GLPI</h6>
                                            <h3 className="card-title fw-bold mb-0 text-success">{metrics.totalGlpi.toFixed(2)} €</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col">
                                    <div className="card shadow-sm border-0 p-3 h-100">
                                        <div className="card-body">
                                            <h6 className="card-subtitle text-muted mb-1 small text-uppercase fw-semibold">Total SuperPrice</h6>
                                            <h3 className="card-title fw-bold mb-0 text-info">{metrics.totalSuperprice.toFixed(2)} €</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col">
                                    <div className="card shadow-sm border-0 p-3 h-100">
                                        <div className="card-body">
                                            <h6 className="card-subtitle text-muted mb-1 small text-uppercase fw-semibold">Total Réouverture</h6>
                                            <h3 className="card-title fw-bold mb-0 text-warning">{metrics.totalReo.toFixed(2)} €</h3>
                                        </div>
                                    </div>
                                </div>
                                <div className="col">
                                    <div className="card shadow-sm border-0 p-3 h-100 bg-light border-start border-primary border-4">
                                        <div className="card-body">
                                            <h6 className="card-subtitle text-primary mb-1 small text-uppercase fw-semibold">Coût Total</h6>
                                            <h3 className="card-title fw-bold mb-0 text-primary">{metrics.totalCost.toFixed(2)} €</h3>
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
                                                <th className="text-center">Interventions</th>
                                                <th className="text-end">GLPI (€)</th>
                                                <th className="text-end">SuperPrice (€)</th>
                                                <th className="text-end">Réouverture (€)</th>
                                                <th className="text-end fw-bold">Total (€)</th>
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
                                                            <td className="text-end text-info">{item.total_superprice.toFixed(2)} €</td>
                                                            <td className="text-end text-warning">{item.total_reo.toFixed(2)} €</td>
                                                            <td className="text-end fw-bold text-dark">{item.total_cost.toFixed(2)} €</td>
                                                        </tr>

                                                        {/* EXPANDED DETAILS */}
                                                        {isExpanded && (
                                                            <tr className="table-light">
                                                                <td colSpan="8" className="p-3">
                                                                    <div className="bg-white p-3 rounded shadow-sm border">
                                                                        <h6 className="text-secondary fw-bold mb-3 small text-uppercase">
                                                                            Détail des tickets contribuant au coût de ce type
                                                                        </h6>
                                                                        <table className="table table-sm table-bordered mb-0 small">
                                                                            <thead className="table-light">
                                                                                <tr>
                                                                                    <th>Ticket ID</th>
                                                                                    <th className="text-center">Item ID</th>
                                                                                    <th className="text-center">Type</th>
                                                                                    <th className="text-end">GLPI</th>
                                                                                    <th className="text-end">Coût Saisi</th>
                                                                                    <th className="text-end fw-bold">Total</th>
                                                                                </tr>
                                                                            </thead>
                                                                            <tbody>
                                                                                {item.tickets.map((t, idx) => (
                                                                                    <tr key={idx}>
                                                                                        <td>
                                                                                            <strong>#{t.id_ticket}</strong>
                                                                                        </td>
                                                                                        <td className="text-center">
                                                                                            {t.id_item}
                                                                                        </td>
                                                                                        <td className="text-center">
                                                                                            <span className={`badge ${t.type_saisi === 'super_price' ? 'bg-info' : 'bg-warning'}`}>
                                                                                                {t.type_saisi === 'super_price' ? 'SuperPrice' : 'Réouverture'}
                                                                                            </span>
                                                                                        </td>
                                                                                        <td className="text-end text-success">{t.glpi_share.toFixed(2)} €</td>
                                                                                        <td className="text-end">{t.cout_saisi.toFixed(2)} €</td>
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
                                                    <td colSpan="8" className="text-center text-muted py-4">
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
