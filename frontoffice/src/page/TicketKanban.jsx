import { useState, useEffect, useCallback, useRef } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { useKanbanConfig } from '../service/useKanbanConfig.js';
import { buildUrl } from '../service/api.js';
import './TicketKanban.css';

const SESSION_TOKEN = import.meta.env.VITE_SESSION_TOKEN;
const APP_TOKEN = import.meta.env.VITE_APP_TOKEN;
const HEADERS = {
  "Content-Type": "application/json",
  "Session-Token": SESSION_TOKEN,
  "App-Token": APP_TOKEN,
};

/* ============ URGENCY DISPLAY ============ */
const URGENCY_MAP = {
  1: { label: 'Très basse', color: '#6c757d', bg: '#f1f3f5' },
  2: { label: 'Basse', color: '#28a745', bg: '#e6f4ea' },
  3: { label: 'Moyenne', color: '#f0ad4e', bg: '#fff8e1' },
  4: { label: 'Haute', color: '#dc3545', bg: '#fce4ec' },
  5: { label: 'Très haute', color: '#dc3545', bg: '#fce4ec' },
};

function getUrgency(val) {
  return URGENCY_MAP[val] || URGENCY_MAP[3];
}

function formatDate(dateStr) {
  if (!dateStr) return '—';
  try {
    return new Date(dateStr).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  } catch { return dateStr; }
}

function getStatusForColumn(colId) {
  if (colId === 'nouveau') return 1;
  if (colId === 'in_progress') return 2;
  if (colId === 'termine') return 5;
  return 1;
}

/* ============ MAIN KANBAN COMPONENT ============ */
export default function TicketKanban() {
  const { config } = useKanbanConfig();
  const [tickets, setTickets] = useState({ nouveau: [], in_progress: [], termine: [] });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(null);

  // Modals
  const [transitionModal, setTransitionModal] = useState({ open: false, ticket: null, sourceCol: null, destCol: null, srcIdx: 0, dstIdx: 0 });
  const [quickCreateOpen, setQuickCreateOpen] = useState(false);
  const [drawerTicketId, setDrawerTicketId] = useState(null);

  const showToast = useCallback((msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }, []);

  // ===== FETCH TICKETS =====
  const fetchTickets = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${buildUrl('Ticket')}/?range=0-999&sort=id&order=DESC`, { headers: HEADERS });
      if (!res.ok) throw new Error('Erreur chargement tickets');
      const data = await res.json();
      const cols = { nouveau: [], in_progress: [], termine: [] };
      if (Array.isArray(data)) {
        data.forEach((t) => {
          const s = parseInt(t.status, 10);
          if (s === 1) cols.nouveau.push(t);
          else if ([2, 3, 4].includes(s)) cols.in_progress.push(t);
          else if ([5, 6].includes(s)) cols.termine.push(t);
        });
      }
      setTickets(cols);
    } catch (err) {
      console.error('Erreur Kanban:', err);
      showToast('Erreur lors du chargement des tickets', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => { fetchTickets(); }, [fetchTickets]);

  // ===== DRAG & DROP =====
  const onDragEnd = (result) => {
    const { source, destination, draggableId } = result;
    if (!destination) return;
    if (source.droppableId === destination.droppableId && source.index === destination.index) return;

    const sourceCol = source.droppableId;
    const destCol = destination.droppableId;
    const sourceTickets = Array.from(tickets[sourceCol]);
    const ticket = sourceTickets.find((t) => String(t.id) === draggableId);
    if (!ticket) return;

    if (sourceCol === destCol) {
      sourceTickets.splice(source.index, 1);
      sourceTickets.splice(destination.index, 0, ticket);
      setTickets({ ...tickets, [sourceCol]: sourceTickets });
      return;
    }

    // Cross-column: show modal for in_progress/termine, direct for nouveau
    if (destCol === 'in_progress' || destCol === 'termine') {
      setTransitionModal({ open: true, ticket, sourceCol, destCol, srcIdx: source.index, dstIdx: destination.index });
    } else {
      moveTicket(ticket, sourceCol, destCol, source.index, destination.index, 1);
    }
  };

  const moveTicket = async (ticket, sourceCol, destCol, srcIdx, dstIdx, newStatus) => {
    // Optimistic update
    const src = Array.from(tickets[sourceCol]);
    const dst = Array.from(tickets[destCol]);
    src.splice(srcIdx, 1);
    const updated = { ...ticket, status: newStatus };
    dst.splice(dstIdx, 0, updated);
    setTickets({ ...tickets, [sourceCol]: src, [destCol]: dst });

    try {
      const res = await fetch(`${buildUrl('Ticket')}/${ticket.id}`, {
        method: 'PUT', headers: HEADERS,
        body: JSON.stringify({ input: { status: newStatus } }),
      });
      if (!res.ok) throw new Error(await res.text());
      showToast(`Ticket #${ticket.id} déplacé vers ${config.columns[destCol].labelMg}`);
    } catch (err) {
      console.error('Erreur déplacement:', err);
      fetchTickets();
      showToast(`Erreur: ${err.message}`, 'error');
    }
  };

  const handleTransitionConfirm = async (note) => {
    const { ticket, sourceCol, destCol, srcIdx, dstIdx } = transitionModal;
    const newStatus = getStatusForColumn(destCol);
    setTransitionModal({ ...transitionModal, open: false });
    await moveTicket(ticket, sourceCol, destCol, srcIdx, dstIdx, newStatus);
    // Optionally post follow-up note
    if (note && note.trim()) {
      try {
        await fetch(`${buildUrl('ITILFollowup')}/`, {
          method: 'POST', headers: HEADERS,
          body: JSON.stringify({ input: { items_id: ticket.id, itemtype: 'Ticket', content: note } }),
        });
      } catch (err) { console.warn('Erreur ajout note:', err); }
    }
  };

  // ===== QUICK CREATE =====
  const handleQuickCreate = async (ticketInput) => {
    try {
      const res = await fetch(`${buildUrl('Ticket')}/`, {
        method: 'POST', headers: HEADERS,
        body: JSON.stringify({ input: { ...ticketInput, status: 1 } }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      showToast(`Ticket #${data.id} créé avec succès`);
      setQuickCreateOpen(false);
      fetchTickets();
    } catch (err) {
      showToast(`Erreur: ${err.message}`, 'error');
    }
  };

  // ===== RENDER =====
  if (loading) {
    return (
      <div className="text-center py-5">
        <div className="spinner-border text-primary" role="status"></div>
        <p className="mt-2 text-muted">Chargement du tableau Kanban...</p>
      </div>
    );
  }

  return (
    <div>
      {/* Toast */}
      {toast && (
        <div className={`kanban-toast ${toast.type === 'error' ? 'kanban-toast-error' : 'kanban-toast-success'}`}>
          {toast.type === 'success' ? '✓' : '✕'} {toast.msg}
        </div>
      )}

      <h2 className="h4 mb-1">📋 Kanban des Tickets</h2>
      <p className="text-muted small mb-4">Glissez-déposez les cartes pour changer le statut d'un ticket.</p>

      <DragDropContext onDragEnd={onDragEnd}>
        <div className="kanban-board">
          {['nouveau', 'in_progress', 'termine'].map((colId) => (
            <div key={colId} className="kanban-column" style={{ background: config.columns[colId].color }}>
              {/* Column Header */}
              <div className="kanban-col-header">
                <span className="kanban-col-title">{config.columns[colId].labelMg}</span>
                <span className="kanban-col-count">{tickets[colId].length}</span>
              </div>

              {/* Droppable Zone */}
              <Droppable droppableId={colId}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className={`kanban-col-body ${snapshot.isDraggingOver ? 'kanban-drag-over' : ''}`}
                  >
                    {tickets[colId].length === 0 && !snapshot.isDraggingOver && (
                      <div className="kanban-empty">Aucun ticket</div>
                    )}
                    {tickets[colId].map((ticket, index) => (
                      <Draggable key={ticket.id} draggableId={String(ticket.id)} index={index}>
                        {(dragProvided, dragSnapshot) => {
                          const urg = getUrgency(ticket.urgency);
                          return (
                            <div
                              ref={dragProvided.innerRef}
                              {...dragProvided.draggableProps}
                              {...dragProvided.dragHandleProps}
                              className={`kanban-card ${dragSnapshot.isDragging ? 'kanban-card-dragging' : ''}`}
                              style={dragProvided.draggableProps.style}
                              onClick={() => setDrawerTicketId(ticket.id)}
                            >
                              <div className="kanban-card-top">
                                <span className="kanban-card-id">#{ticket.id}</span>
                                <span className="kanban-card-urg" style={{ background: urg.bg, color: urg.color }}>
                                  <span className="kanban-urg-dot" style={{ background: urg.color }}></span>
                                  {urg.label}
                                </span>
                              </div>
                              <div className="kanban-card-title">{ticket.name || 'Sans titre'}</div>
                              <div className="kanban-card-date">📅 {formatDate(ticket.date)}</div>
                            </div>
                          );
                        }}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>

              {/* Footer: Add button only on Nouveau column */}
              {colId === 'nouveau' && (
                <div className="kanban-col-footer">
                  <button className="kanban-add-btn" onClick={() => setQuickCreateOpen(true)}>
                    ＋ Ajouter 1 ticket
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </DragDropContext>

      {/* ===== TRANSITION MODAL ===== */}
      {transitionModal.open && (
        <TransitionModal
          ticket={transitionModal.ticket}
          destCol={transitionModal.destCol}
          config={config}
          onConfirm={handleTransitionConfirm}
          onCancel={() => setTransitionModal({ ...transitionModal, open: false })}
        />
      )}

      {/* ===== QUICK CREATE MODAL ===== */}
      {quickCreateOpen && (
        <QuickCreateModal
          onSubmit={handleQuickCreate}
          onClose={() => setQuickCreateOpen(false)}
        />
      )}

      {/* ===== TICKET DRAWER ===== */}
      {drawerTicketId && (
        <TicketDrawer
          ticketId={drawerTicketId}
          onClose={() => setDrawerTicketId(null)}
        />
      )}
    </div>
  );
}

/* ============================================================
   TRANSITION MODAL — Sub-component
   ============================================================ */
function TransitionModal({ ticket, destCol, config, onConfirm, onCancel }) {
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleConfirm = async () => {
    setSubmitting(true);
    await onConfirm(note);
    setSubmitting(false);
  };

  const destLabel = config.columns[destCol]?.labelMg || destCol;

  return (
    <div className="kanban-modal-overlay" onClick={submitting ? undefined : onCancel}>
      <div className="kanban-modal" onClick={(e) => e.stopPropagation()}>
        <div className="kanban-modal-header">
          <h5 className="mb-0">Déplacer vers « {destLabel} »</h5>
          <button className="btn-close" onClick={onCancel} disabled={submitting}></button>
        </div>
        <div className="kanban-modal-body">
          <p className="text-muted small mb-3">
            Ticket <strong>#{ticket.id}</strong> — {ticket.name}
          </p>
          <label className="form-label fw-bold small">Note de suivi (optionnel)</label>
          <textarea
            className="form-control"
            rows="4"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Détails sur l'intervention ou la résolution..."
          />
        </div>
        <div className="kanban-modal-footer">
          <button className="btn btn-outline-secondary" onClick={onCancel} disabled={submitting}>Annuler</button>
          <button className="btn btn-primary d-flex align-items-center gap-2" onClick={handleConfirm} disabled={submitting}>
            {submitting && <span className="spinner-border spinner-border-sm"></span>}
            Valider le déplacement
          </button>
        </div>
      </div>
    </div>
  );
}

/* ============================================================
   QUICK CREATE MODAL — Sub-component
   ============================================================ */
function QuickCreateModal({ onSubmit, onClose }) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim()) return;
    setSubmitting(true);
    await onSubmit({ name: title.trim(), content: description.trim(), urgency });
    setSubmitting(false);
  };

  return (
    <div className="kanban-modal-overlay" onClick={submitting ? undefined : onClose}>
      <div className="kanban-modal kanban-modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="kanban-modal-header">
          <h5 className="mb-0">🎟️ Création rapide de ticket</h5>
          <button className="btn-close" onClick={onClose} disabled={submitting}></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="kanban-modal-body">
            <div className="mb-3">
              <label className="form-label fw-bold small">Titre <span className="text-danger">*</span></label>
              <input type="text" className="form-control" required value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Ex: Problème de connexion WiFi" />
            </div>
            <div className="mb-3">
              <label className="form-label fw-bold small">Description</label>
              <textarea className="form-control" rows="3" value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Détails du problème..." />
            </div>
            <div className="mb-3">
              <label className="form-label fw-bold small">Urgence</label>
              <select className="form-select" value={urgency} onChange={(e) => setUrgency(Number(e.target.value))}>
                <option value={1}>1 - Très basse</option>
                <option value={2}>2 - Basse</option>
                <option value={3}>3 - Moyenne</option>
                <option value={4}>4 - Haute</option>
                <option value={5}>5 - Très haute</option>
              </select>
            </div>
          </div>
          <div className="kanban-modal-footer">
            <button type="button" className="btn btn-outline-secondary" onClick={onClose} disabled={submitting}>Annuler</button>
            <button type="submit" className="btn btn-primary" disabled={submitting || !title.trim()}>
              {submitting ? 'Création...' : 'Créer le ticket'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

/* ============================================================
   TICKET DRAWER — Sub-component (volet latéral détails)
   ============================================================ */
function TicketDrawer({ ticketId, onClose }) {
  const [details, setDetails] = useState(null);
  const [linkedItems, setLinkedItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      try {
        const res = await fetch(`${buildUrl('Ticket')}/${ticketId}?expand_dropdowns=true`, { headers: HEADERS });
        if (res.ok) {
          const data = await res.json();
          if (!cancelled) setDetails(data);
        }
        const itemsRes = await fetch(`${buildUrl('Ticket')}/${ticketId}/Item_Ticket?expand_dropdowns=true`, { headers: HEADERS });
        if (itemsRes.ok) {
          const items = await itemsRes.json();
          if (!cancelled && Array.isArray(items)) setLinkedItems(items);
        }
      } catch (err) {
        console.error('Erreur chargement détails:', err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    load();
    return () => { cancelled = true; };
  }, [ticketId]);

  return (
    <>
      <div className="kanban-drawer-overlay" onClick={onClose}></div>
      <div className="kanban-drawer">
        <div className="kanban-drawer-header">
          <h5 className="mb-0 text-truncate">{loading ? 'Chargement...' : (details?.name || `Ticket #${ticketId}`)}</h5>
          <button className="btn-close" onClick={onClose}></button>
        </div>
        <div className="kanban-drawer-body">
          {loading ? (
            <div className="text-center py-5"><div className="spinner-border text-primary"></div></div>
          ) : !details ? (
            <div className="text-center text-muted py-5">Impossible de charger les détails.</div>
          ) : (
            <>
              <h6 className="text-uppercase text-secondary small fw-bold border-bottom pb-2 mb-3">Informations</h6>
              <div className="row g-3 mb-4">
                <div className="col-6"><span className="text-muted small d-block">Statut</span><span className="fw-bold">{details.status}</span></div>
                <div className="col-6"><span className="text-muted small d-block">Urgence</span><span className="fw-bold">{details.urgency}/5</span></div>
                <div className="col-6"><span className="text-muted small d-block">Date d'ouverture</span><span className="fw-bold">{details.date || '—'}</span></div>
                <div className="col-6"><span className="text-muted small d-block">Dernière modif.</span><span className="fw-bold">{details.date_mod || '—'}</span></div>
              </div>

              <h6 className="text-uppercase text-secondary small fw-bold border-bottom pb-2 mb-3">Description</h6>
              <div className="bg-light p-3 rounded mb-4 small" style={{ whiteSpace: 'pre-wrap' }} dangerouslySetInnerHTML={{ __html: details.content || '<em class="text-muted">Aucune description</em>' }} />

              <h6 className="text-uppercase text-secondary small fw-bold border-bottom pb-2 mb-3">
                Éléments associés <span className="badge bg-secondary ms-2">{linkedItems.length}</span>
              </h6>
              {linkedItems.length === 0 ? (
                <p className="text-muted small fst-italic">Aucun matériel associé.</p>
              ) : (
                <div className="list-group list-group-flush">
                  {linkedItems.map((item) => (
                    <div key={item.id} className="list-group-item d-flex align-items-center gap-2 px-0">
                      <span className="badge bg-light text-primary border">🖥️</span>
                      <div>
                        <span className="fw-bold small">[{item.itemtype}] #{item.items_id}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </>
  );
}
