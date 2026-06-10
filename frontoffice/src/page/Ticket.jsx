import { useEffect, useState } from "react";
import { getTicketsList, getdetailTicket, getTicketLinkedItems, getTicketCosts } from "../service/ticket2.js";
import "./Ticket.css";

export default function Ticket() {
    const [tickets, setTickets] = useState([]);
    const [loading, setLoading] = useState(true);

    // Modal states
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedTicket, setSelectedTicket] = useState(null);
    const [linkedItems, setLinkedItems] = useState([]);
    const [ticketCosts, setTicketCosts] = useState([]);
    const [loadingDetails, setLoadingDetails] = useState(false);

    const statusList = [
        { ids: [1], name: "Nouveau" },
        { ids: [2, 3], name: "En cours" },
        { ids: [5], name: "Terminé" }
    ];

    useEffect(() => {
        async function loadingTickets() {
            try {
                const data = await getTicketsList();
                setTickets(data)
            } catch (error) {
                console.error(error);
            } finally {
                setLoading(false);
            }
        }
        loadingTickets();
    }, []);

    const handleTicketClick = async (id) => {
        setIsModalOpen(true);
        setLoadingDetails(true);
        try {
            const [details, items, costs] = await Promise.all([
                getdetailTicket(id),
                getTicketLinkedItems(id),
                getTicketCosts(id)
            ]);
            setSelectedTicket(details);
            setLinkedItems(items);
            setTicketCosts(costs);
        } catch (error) {
            console.error(error);
        } finally {
            setLoadingDetails(false);
        }
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setSelectedTicket(null);
        setLinkedItems([]);
        setTicketCosts([]);
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
            default: return <span className="badge bg-light text-dark">Inconnu ({statusId})</span>;
        }
    };

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

    if (loading) {
        return <p>Chargement...</p>;
    }
    return (
        <div className="ticket">
            <h1>Ticket</h1>

            {statusList.map(status => {
                const filtre = tickets.filter(ticket => status.ids.includes(ticket.status));

                return (

                    <div key={status.name}>
                        <h2>{status.name} - {filtre.length}</h2>
                        <ul>
                            {tickets
                                .filter(ticket => status.ids.includes(ticket.status))
                                .map(ticket => (
                                    <li key={ticket.id} onClick={() => handleTicketClick(ticket.id)}>
                                        <strong>{ticket.id}</strong> - {ticket.name}

                                    </li>
                                ))}
                        </ul>

                        {
                            status.ids.includes(1) && (
                                <a href="/new-ticket">Ajouter ticket</a>
                            )
                        }

                    </div>
                )
            })}

            {isModalOpen && (
                <div className="modal-overlay" onClick={closeModal}>
                    <div className="modal-content" onClick={e => e.stopPropagation()} style={{ width: '800px', maxWidth: '95%' }}>
                        <button className="close-btn" onClick={closeModal}>&times;</button>
                        {loadingDetails ? (
                            <p>Chargement des détails...</p>
                        ) : selectedTicket ? (
                            <div className="modal-details">
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                                    <div>
                                        <span className="badge bg-light text-dark" style={{ marginBottom: '10px' }}>Fiche d'intervention</span>
                                        <h2 style={{ marginTop: '0', marginBottom: '5px' }}>Ticket #{selectedTicket.id} : {selectedTicket.name}</h2>
                                        <p style={{ color: '#6c757d', fontSize: '0.9em', marginTop: '0' }}>Modifié le : {selectedTicket.date_mod}</p>
                                    </div>
                                    <div>
                                        {getStatusBadge(selectedTicket.status)}
                                    </div>
                                </div>

                                <div className="detail-grid">
                                    <div className="detail-item">
                                        <span className="label">Date d'ouverture</span>
                                        <span className="value">{selectedTicket.date || "N/A"}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Type</span>
                                        <span className="value">
                                            {parseInt(selectedTicket.type, 10) === 1 ? "⚠️ Incident" : "📋 Demande"}
                                        </span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Catégorie</span>
                                        <span className="value">{selectedTicket.itilcategories_id || "Non catégorisé"}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Statut</span>
                                        <span>{getStatusBadge(selectedTicket.status)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Source de la demande</span>
                                        <span className="value">{selectedTicket.requesttypes_id || "Directe"}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Urgence</span>
                                        <span>{getUrgencyLabel(selectedTicket.urgency)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Impact</span>
                                        <span>{getImpactLabel(selectedTicket.impact)}</span>
                                    </div>
                                    <div className="detail-item">
                                        <span className="label">Priorité</span>
                                        <span>{getPriorityLabel(selectedTicket.priority)}</span>
                                    </div>
                                </div>

                                <h3 className="section-title">Description du problème</h3>
                                <div className="modal-content-html" dangerouslySetInnerHTML={{ __html: selectedTicket.content || "<span style='color: #999; font-style: italic;'>Aucune description fournie.</span>" }} />

                                <h3 className="section-title">💻 Matériel(s) informatique(s) associé(s)</h3>
                                {linkedItems.length === 0 ? (
                                    <p style={{ color: '#999', fontStyle: 'italic', fontSize: '0.9em' }}>Aucun matériel rattaché à ce ticket.</p>
                                ) : (
                                    <div>
                                        {linkedItems.map((link) => (
                                            <div key={link.id} className="linked-item">
                                                <span><strong>[{link.itemtype}]</strong> {link.items_id}</span>
                                                <span className="badge bg-secondary">Rattaché</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <h3 className="section-title">💰 Temps passé & Coûts d'intervention</h3>
                                {ticketCosts.length === 0 ? (
                                    <p style={{ color: '#999', fontStyle: 'italic', fontSize: '0.9em' }}>Aucune information financière enregistrée sur ce ticket.</p>
                                ) : (
                                    <div className="table-responsive">
                                        <table className="table table-bordered">
                                            <thead className="table-light">
                                                <tr>
                                                    <th>Libellé / Intervention</th>
                                                    <th>Temps passé</th>
                                                    <th>Coût horaire</th>
                                                    <th>Coût fixe</th>
                                                    <th>Coût matériel</th>
                                                </tr>
                                            </thead>
                                            <tbody>
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
                        ) : (
                            <p>Erreur lors du chargement des détails.</p>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}