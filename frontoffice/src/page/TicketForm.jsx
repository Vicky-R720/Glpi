import { useState, useEffect, useRef, useCallback } from 'react';
import { apiGet, apiPost } from '../service/api';
import { useToast } from '../hooks/useToast';
import Toast from '../components/Toast';
import Spinner from '../components/Spinner';

/**
 * Urgency options with color coding
 */
const URGENCY_OPTIONS = [
  { value: 1, label: 'Basse', color: '#28a745', bg: '#e6f4ea' },
  { value: 3, label: 'Moyenne', color: '#f0ad4e', bg: '#fff8e1' },
  { value: 5, label: 'Haute', color: '#dc3545', bg: '#fce4ec' },
];

/**
 * TicketForm — PAGE 2 : Création de ticket d'assistance GLPI
 */
export default function TicketForm() {
  const { toasts, showToast } = useToast();

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [urgency, setUrgency] = useState(3);
  const [submitting, setSubmitting] = useState(false);

  // Computer association (autocomplete)
  const [allComputers, setAllComputers] = useState([]);
  const [computersLoading, setComputersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [selectedComputers, setSelectedComputers] = useState([]);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Load computers on mount for the autocomplete
  useEffect(() => {
    const loadComputers = async () => {
      try {
        const data = await apiGet('Computer?range=0-50');
        setAllComputers(Array.isArray(data) ? data : []);
      } catch (err) {
        console.error('Erreur chargement ordinateurs:', err);
      } finally {
        setComputersLoading(false);
      }
    };
    loadComputers();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filtered computers for autocomplete (exclude already selected)
  const filteredComputers = allComputers.filter((c) => {
    const alreadySelected = selectedComputers.some((s) => s.id === c.id);
    const matchesQuery =
      !searchQuery ||
      (c.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      String(c.id).includes(searchQuery);
    return !alreadySelected && matchesQuery;
  });

  const addComputer = useCallback((computer) => {
    setSelectedComputers((prev) => [...prev, computer]);
    setSearchQuery('');
    setShowDropdown(false);
    inputRef.current?.focus();
  }, []);

  const removeComputer = useCallback((id) => {
    setSelectedComputers((prev) => prev.filter((c) => c.id !== id));
  }, []);

  /**
   * Submit handler — double action:
   * A) POST /Ticket → get ticket ID
   * B) For each selected computer → POST /Ticket_Item
   */
  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!title.trim()) {
      showToast('Le titre est obligatoire.', 'error');
      return;
    }

    setSubmitting(true);

    try {
      // ===== ÉTAPE A : Créer le ticket =====
      const ticketPayload = {
        input: {
          name: title.trim(),
          content: description.trim(),
          urgency: urgency,
        },
      };

      const ticketResult = await apiPost('Ticket', ticketPayload);
      const ticketId = ticketResult?.id;

      if (!ticketId) {
        throw new Error('ID du ticket non retourné par GLPI');
      }

      // ===== ÉTAPE B : Lier les ordinateurs sélectionnés =====
      if (selectedComputers.length > 0) {
        const linkPromises = selectedComputers.map((computer) =>
          apiPost('Ticket_Item', {
            input: {
              tickets_id: ticketId,
              itemtype: 'Computer',
              items_id: computer.id,
            },
          })
        );

        await Promise.all(linkPromises);
      }

      // Success
      showToast(
        `Ticket #${ticketId} créé avec succès${
          selectedComputers.length > 0
            ? ` — ${selectedComputers.length} ordinateur(s) lié(s)`
            : ''
        }`,
        'success'
      );

      // Reset form
      setTitle('');
      setDescription('');
      setUrgency(3);
      setSelectedComputers([]);
    } catch (err) {
      console.error('Erreur création ticket:', err);
      showToast(`Erreur: ${err.message}`, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const currentUrgency = URGENCY_OPTIONS.find((o) => o.value === urgency);

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Toast toasts={toasts} />

      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--glpi-gray-900)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--glpi-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="12" y1="18" x2="12" y2="12" />
            <line x1="9" y1="15" x2="15" y2="15" />
          </svg>
          Assistance — Nouveau Ticket
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--glpi-gray-500)' }}>
          Déclarez un incident et associez-le au matériel concerné
        </p>
      </div>

      {/* ===== Form Card ===== */}
      <form
        onSubmit={handleSubmit}
        className="rounded-lg overflow-hidden"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--glpi-gray-200)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {/* Section: Informations du ticket */}
        <div
          className="px-6 py-3 text-xs font-semibold uppercase tracking-wider"
          style={{
            background: 'var(--glpi-gray-100)',
            color: 'var(--glpi-gray-600)',
            borderBottom: '1px solid var(--glpi-gray-200)',
          }}
        >
          Informations du ticket
        </div>

        <div className="p-6 space-y-5">
          {/* Titre */}
          <div>
            <label
              htmlFor="ticket-title"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--glpi-gray-700)' }}
            >
              Titre <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <input
              id="ticket-title"
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Mon écran ne s'allume plus"
              className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-all duration-200"
              style={{
                border: '1px solid var(--glpi-gray-300)',
                background: 'var(--glpi-gray-50)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--glpi-primary-light)';
                e.target.style.boxShadow = '0 0 0 3px rgba(42,95,158,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--glpi-gray-300)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Description */}
          <div>
            <label
              htmlFor="ticket-desc"
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--glpi-gray-700)' }}
            >
              Description
            </label>
            <textarea
              id="ticket-desc"
              rows="5"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Décrivez précisément le problème rencontré (symptômes, matériel concerné, étapes pour reproduire)..."
              className="w-full px-3 py-2.5 rounded-md text-sm outline-none transition-all duration-200 resize-y"
              style={{
                border: '1px solid var(--glpi-gray-300)',
                background: 'var(--glpi-gray-50)',
              }}
              onFocus={(e) => {
                e.target.style.borderColor = 'var(--glpi-primary-light)';
                e.target.style.boxShadow = '0 0 0 3px rgba(42,95,158,0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = 'var(--glpi-gray-300)';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>

          {/* Urgence */}
          <div>
            <label
              className="block text-sm font-medium mb-2"
              style={{ color: 'var(--glpi-gray-700)' }}
            >
              Urgence / Priorité
            </label>
            <div className="flex gap-3">
              {URGENCY_OPTIONS.map((opt) => {
                const isActive = urgency === opt.value;
                return (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => setUrgency(opt.value)}
                    className="flex-1 py-2.5 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer"
                    style={{
                      background: isActive ? opt.bg : 'var(--glpi-gray-50)',
                      border: isActive
                        ? `2px solid ${opt.color}`
                        : '1px solid var(--glpi-gray-300)',
                      color: isActive ? opt.color : 'var(--glpi-gray-600)',
                      transform: isActive ? 'scale(1.02)' : 'scale(1)',
                    }}
                  >
                    <span
                      className="inline-block w-2 h-2 rounded-full mr-2"
                      style={{ background: opt.color }}
                    />
                    {opt.label}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Section: Association d'ordinateurs */}
        <div
          className="px-6 py-3 text-xs font-semibold uppercase tracking-wider"
          style={{
            background: 'var(--glpi-gray-100)',
            color: 'var(--glpi-gray-600)',
            borderTop: '1px solid var(--glpi-gray-200)',
            borderBottom: '1px solid var(--glpi-gray-200)',
          }}
        >
          Éléments associés — Ordinateurs
        </div>

        <div className="p-6 space-y-4">
          {/* Autocomplete search */}
          <div ref={dropdownRef} className="relative">
            <label
              className="block text-sm font-medium mb-1.5"
              style={{ color: 'var(--glpi-gray-700)' }}
            >
              Rechercher un ordinateur à lier
            </label>
            <div className="relative">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setShowDropdown(true);
                }}
                onFocus={() => setShowDropdown(true)}
                placeholder={
                  computersLoading
                    ? 'Chargement de la liste...'
                    : 'Tapez le nom ou ID d\'un ordinateur...'
                }
                disabled={computersLoading}
                className="w-full pl-10 pr-3 py-2.5 rounded-md text-sm outline-none transition-all duration-200"
                style={{
                  border: '1px solid var(--glpi-gray-300)',
                  background: computersLoading ? 'var(--glpi-gray-100)' : 'var(--glpi-gray-50)',
                }}
                onFocusCapture={(e) => {
                  e.target.style.borderColor = 'var(--glpi-primary-light)';
                  e.target.style.boxShadow = '0 0 0 3px rgba(42,95,158,0.1)';
                }}
                onBlurCapture={(e) => {
                  e.target.style.borderColor = 'var(--glpi-gray-300)';
                  e.target.style.boxShadow = 'none';
                }}
              />
              {/* Search icon */}
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="var(--glpi-gray-400)"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <circle cx="11" cy="11" r="8" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
            </div>

            {/* Dropdown */}
            {showDropdown && !computersLoading && (
              <div
                className="absolute z-20 w-full mt-1 rounded-md overflow-hidden max-h-52 overflow-y-auto"
                style={{
                  background: 'var(--surface-card)',
                  border: '1px solid var(--glpi-gray-300)',
                  boxShadow: 'var(--shadow-lg)',
                }}
              >
                {filteredComputers.length === 0 ? (
                  <div
                    className="px-4 py-3 text-sm text-center"
                    style={{ color: 'var(--glpi-gray-500)' }}
                  >
                    Aucun ordinateur trouvé
                  </div>
                ) : (
                  filteredComputers.slice(0, 15).map((computer) => (
                    <button
                      key={computer.id}
                      type="button"
                      onClick={() => addComputer(computer)}
                      className="w-full text-left px-4 py-2.5 flex items-center justify-between transition-colors duration-100 cursor-pointer"
                      style={{ borderBottom: '1px solid var(--glpi-gray-100)' }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'var(--glpi-primary-50)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'transparent')
                      }
                    >
                      <div>
                        <span className="text-sm font-medium" style={{ color: 'var(--glpi-gray-900)' }}>
                          {computer.name || 'Sans nom'}
                        </span>
                        {computer.serial && (
                          <span
                            className="text-xs ml-2 font-mono"
                            style={{ color: 'var(--glpi-gray-500)' }}
                          >
                            S/N: {computer.serial}
                          </span>
                        )}
                      </div>
                      <span
                        className="text-xs font-mono px-2 py-0.5 rounded"
                        style={{
                          background: 'var(--glpi-primary-50)',
                          color: 'var(--glpi-primary)',
                        }}
                      >
                        #{computer.id}
                      </span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          {/* Selected computers badges */}
          {selectedComputers.length > 0 && (
            <div>
              <p
                className="text-xs font-semibold mb-2 uppercase tracking-wide"
                style={{ color: 'var(--glpi-gray-600)' }}
              >
                {selectedComputers.length} ordinateur{selectedComputers.length > 1 ? 's' : ''} sélectionné{selectedComputers.length > 1 ? 's' : ''}
              </p>
              <div className="flex flex-wrap gap-2">
                {selectedComputers.map((computer) => (
                  <div
                    key={computer.id}
                    className="inline-flex items-center gap-2 pl-3 pr-1.5 py-1.5 rounded-md text-sm transition-all duration-200"
                    style={{
                      background: 'var(--glpi-primary-50)',
                      border: '1px solid var(--glpi-primary-100)',
                      color: 'var(--glpi-primary-dark)',
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    <span className="font-medium text-xs">
                      {computer.name}
                    </span>
                    <span className="text-xs font-mono opacity-60">#{computer.id}</span>
                    <button
                      type="button"
                      onClick={() => removeComputer(computer.id)}
                      className="ml-1 w-5 h-5 rounded-full flex items-center justify-center transition-colors duration-150 cursor-pointer"
                      style={{ background: 'rgba(42,95,158,0.1)' }}
                      onMouseEnter={(e) =>
                        (e.currentTarget.style.background = 'rgba(220,53,69,0.15)')
                      }
                      onMouseLeave={(e) =>
                        (e.currentTarget.style.background = 'rgba(42,95,158,0.1)')
                      }
                      title="Détacher cet ordinateur"
                    >
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {selectedComputers.length === 0 && (
            <p className="text-xs italic" style={{ color: 'var(--glpi-gray-400)' }}>
              Aucun ordinateur sélectionné. Utilisez la recherche ci-dessus pour lier du matériel au ticket.
            </p>
          )}
        </div>

        {/* Submit section */}
        <div
          className="px-6 py-4 flex items-center justify-between"
          style={{
            background: 'var(--glpi-gray-50)',
            borderTop: '1px solid var(--glpi-gray-200)',
          }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--glpi-gray-500)' }}>
            <span
              className="inline-block w-2 h-2 rounded-full"
              style={{ background: currentUrgency?.color }}
            />
            Urgence: {currentUrgency?.label}
            {selectedComputers.length > 0 && (
              <span className="ml-2">
                • {selectedComputers.length} élément{selectedComputers.length > 1 ? 's' : ''} lié{selectedComputers.length > 1 ? 's' : ''}
              </span>
            )}
          </div>
          <button
            type="submit"
            disabled={submitting || !title.trim()}
            className="px-6 py-2.5 rounded-md text-sm font-semibold text-white transition-all duration-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            style={{
              background: submitting
                ? 'var(--glpi-gray-400)'
                : 'var(--glpi-primary)',
            }}
            onMouseEnter={(e) => {
              if (!submitting) e.target.style.background = 'var(--glpi-primary-dark)';
            }}
            onMouseLeave={(e) => {
              if (!submitting) e.target.style.background = 'var(--glpi-primary)';
            }}
          >
            {submitting ? (
              <>
                <div
                  className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full"
                  style={{ animation: 'spin 0.8s linear infinite' }}
                />
                Création en cours...
              </>
            ) : (
              'Créer le ticket'
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
