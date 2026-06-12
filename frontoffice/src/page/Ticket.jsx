import { useEffect, useState } from "react";
import { getLang, getTicketsList, getdetailTicket, getTicketLinkedItems, getTicketCosts, updateTicketStatus, getKanbanColors } from "../service/ticket2.js";
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
    // On initialise la langue par défaut à "fr"
    const [currentLang, setCurrentLang] = useState("fr");

    const [draggedTicketId, setDraggedTicketId] = useState(null);
    const [lang, setLang] = useState([]);

    const [isSupperpriceModalOpen , setIsSupperpriceModalOpen] = useState(false);
    const [superpriceValue , setSuperpriceValue] = useState("");
    const [pendingDropTicketId , setPendingDropTicketId] = useState(null);
    const [pendingDropStatusId, setPendingDropStatusId] = useState(null)

    // Color states from Spring Boot SQLite DB
    const [columnColors, setColumnColors] = useState({
        colorNouveau: '#ffb3ba',
        colorEnCours: '#bae1ff',
        colorTermine: '#baffc9'
    });



    useEffect(() => {
        async function fetchLang() {
            try {
                const data = await getLang(currentLang);
                setLang(data);
            } catch (error) {
                console.error("Impossible de charger les lang Kanban", error);
            }
        }
        fetchLang();
    }, [currentLang]);

    const statusList = [];

    lang.forEach(l => {
        try {
            statusList.push({
                ...l,
                ids: JSON.parse(l.glpi_ids) // Convert string "[1]" to array [1]
            });
        } catch (e) {
            console.error("Error parsing glpi_ids:", e);
        }
    });


    useEffect(() => {
        async function fetchColors() {
            try {
                const data = await getKanbanColors();
                setColumnColors({
                    colorNouveau: data.colorNouveau || '#ffb3ba',
                    colorEnCours: data.colorEnCours || '#bae1ff',
                    colorTermine: data.colorTermine || '#baffc9'
                });
            } catch (error) {
                console.error("Impossible de charger les couleurs Kanban", error);
            }
        }
        fetchColors();
    }, []);



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

    // Déclenché quand on commence à glisser un ticket
    const handleDragStart = (e, ticketId) => {
        setDraggedTicketId(ticketId);
    };

    // Autoriser le dépôt au dessus d'une colonne (Nécessaire pour que onDrop s'active)
    const handleDragOver = (e) => {
        e.preventDefault();
    };

    // Déclenché quand on lâche le ticket dans une nouvelle colonne
    const handleDrop = async (e, targetStatusId) => {
        e.preventDefault();
        if (!draggedTicketId) return;

        if(targetStatusId === 6 ){
            setPendingDropTicketId(draggedTicketId);
            setPendingDropStatusId(targetStatusId);
            setIsSupperpriceModalOpen(true);
            return;
        }
        // 1. Mise à jour "Optimiste" de l'interface (pour que ça soit instantané visuellement)
        const originalTickets = [...tickets];
        setTickets(tickets.map(ticket =>
            ticket.id === draggedTicketId ? { ...ticket, status: targetStatusId } : ticket
        ));

        // 2. Appel à l'API en arrière plan
        try {
            await updateTicketStatus(draggedTicketId, targetStatusId);
        } catch (error) {
            console.error("Erreur lors de la mise à jour :", error);
            // En cas d'erreur, on annule visuellement le déplacement
            setTickets(originalTickets);
            alert("Impossible de changer le statut du ticket.");
        } finally {
            setDraggedTicketId(null);
        }
    };
    const submitSuperprice = async () => {
        if(!pendingDropTicketId || !superpriceValue){
            alert("il faut entrer le superprice");
            return ;
        }
        try{
            const response = await fetch("http://localhost:8080/api/ask", {
                method: "POST" ,
                headers: {"Content-Type" : "application/json"},
                body:JSON.stringify({
                    id_ticket: pendingDropTicketId,
                    superprice : superpriceValue
                })
            });
            if(!response.ok){
                console.error("tsy mety ohhh")
            }
        } catch (error){
            console.error("tsy mety ohhh:", error)
        }
        const originalTickets = [...tickets];
        setTickets(tickets.map(ticket => 
            ticket.id === pendingDropTicketId ? {...ticket, status: pendingDropStatusId} : ticket
        ));
        try{
            await updateTicketStatus(pendingDropTicketId, pendingDropStatusId);
        } catch (error){
            console.error("tsy mety ohhh", error)
            setTickets(originalTickets);
            alert("tsy mety oa");
        } finally {
            setDraggedTicketId(null);
            setPendingDropTicketId(null);
            setPendingDropStatusId(null);
            setSuperpriceValue("");
            setIsSupperpriceModalOpen(false);
        }
    };


    if (loading) {
        return <p>Chargement...</p>;
    }
    return (
        <div className="ticket">
            <h1>Ticket</h1>
            <select
                value={currentLang}
                onChange={(e) => setCurrentLang(e.target.value)}
                style={{ padding: '8px', borderRadius: '5px', height: 'fit-content' }}
            >
                <option value="fr">Français</option>
                <option value="mlg">Malgache</option>
            </select>
            
            <div className="ticket-columns">
                {statusList.map(status => {
                    const columnTickets = tickets.filter(ticket => status.ids.includes(ticket.status));

                    // On choisit le premier ID du statut cible (ex: si "Nouveau", l'id est 1)
                    const targetStatusId = status.ids[0];

                    let columnColor = '#f8f9fa';
                    if (targetStatusId === 1) columnColor = columnColors.colorNouveau;
                    else if (targetStatusId === 2 || targetStatusId === 3) columnColor = columnColors.colorEnCours;
                    else if (targetStatusId === 5) columnColor = columnColors.colorTermine;

                    return (
                        <div key={status.name} className="ticket-column"
                            style={{ backgroundColor: columnColor, transition: 'background-color 0.3s' }}
                            onDragOver={handleDragOver}
                            onDrop={(e) => handleDrop(e, targetStatusId)} // On dépose sur la colonne entière
                        >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                                <h2 style={{ margin: 0, border: 'none', padding: 0 }}>{status.name} - {columnTickets.length}</h2>
                            </div>

                            <ul>
                                {columnTickets.map(ticket => (
                                    <li key={ticket.id} onClick={() => handleTicketClick(ticket.id)}
                                        draggable // Rend la ligne déplaçable
                                        onDragStart={(e) => handleDragStart(e, ticket.id)}
                                        style={{
                                            cursor: 'grab', // Indique visuellement qu'on peut glisser
                                            opacity: draggedTicketId === ticket.id ? 0.5 : 1
                                        }}
                                    >
                                        <strong>#{ticket.id}</strong> - {ticket.name}
                                    </li>
                                ))}
                            </ul>

                            {
                                status.ids.includes(1) && (
                                    <a href="/new-ticket" style={{ display: 'block', textAlign: 'center' }}>Ajouter ticket</a>
                                )
                            }
                        </div>
                    );
                })}
            </div>

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

            {isSupperpriceModalOpen && (
                <div className="modal-overlay" onClick={() => setIsSupperpriceModalOpen(false)}>
                    <div className="modal-content" onClick={e => e.stopPropagation()}>
                        <button className="close-btn" onClick={() => setIsSupperpriceModalOpen(false)}>&Stimes;</button>
                        <h2>superprice</h2>
                        <input 
                            type="number" 
                            className="form-control"
                            placeholder="montant"
                            value={superpriceValue}
                            onChange={(e) => setSuperpriceValue(e.target.value)}   // ← onChange, pas onCharge
                        />
                        

                        <button
                        className="btn"
                        onClick={submitSuperprice}>
                            valider
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}