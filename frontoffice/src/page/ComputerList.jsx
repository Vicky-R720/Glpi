import { useState, useEffect, useMemo } from 'react';
import { apiGet } from '../service/api';
import Spinner from '../components/Spinner';

/**
 * Mapping GLPI states_id → label + color
 * (GLPI uses numeric IDs; these are the common defaults)
 */
const STATUS_MAP = {
  0: { label: 'Non défini', bg: '#adb5bd', text: '#fff' },
  1: { label: 'En service', bg: '#28a745', text: '#fff' },
  2: { label: 'En stock', bg: '#17a2b8', text: '#fff' },
  3: { label: 'En réparation', bg: '#f0ad4e', text: '#212529' },
  4: { label: 'Hors service', bg: '#dc3545', text: '#fff' },
  5: { label: 'Mis au rebut', bg: '#6c757d', text: '#fff' },
};

function getStatus(id) {
  return STATUS_MAP[id] || STATUS_MAP[0];
}

/**
 * ComputerList — PAGE 1 : Inventaire des ordinateurs style GLPI
 */
export default function ComputerList() {
  const [computers, setComputers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Search / filter state
  const [searchName, setSearchName] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const [filterType, setFilterType] = useState('');

  // Fetch computers on mount
  useEffect(() => {
    fetchComputers();
  }, []);

  const fetchComputers = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await apiGet('Computer?range=0-50');
      setComputers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Erreur chargement ordinateurs:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Collect unique status values and types for dropdown filters
  const uniqueStatuses = useMemo(() => {
    const set = new Set(computers.map((c) => c.states_id).filter(Boolean));
    return [...set].sort((a, b) => a - b);
  }, [computers]);

  const uniqueTypes = useMemo(() => {
    const set = new Set(computers.map((c) => c.computertypes_id).filter(Boolean));
    return [...set].sort((a, b) => a - b);
  }, [computers]);

  // Filter logic
  const filtered = useMemo(() => {
    return computers.filter((c) => {
      const matchName =
        !searchName ||
        (c.name || '').toLowerCase().includes(searchName.toLowerCase());
      const matchStatus =
        !filterStatus || String(c.states_id) === filterStatus;
      const matchType =
        !filterType || String(c.computertypes_id) === filterType;
      return matchName && matchStatus && matchType;
    });
  }, [computers, searchName, filterStatus, filterType]);

  const handleSearch = (e) => {
    e.preventDefault();
    // Filtering is done via useMemo, this is just for UX
  };

  const handleReset = () => {
    setSearchName('');
    setFilterStatus('');
    setFilterType('');
  };

  // Format date nicely
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      return new Date(dateStr).toLocaleDateString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-xl font-semibold flex items-center gap-2" style={{ color: 'var(--glpi-gray-900)' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="var(--glpi-primary)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="3" width="20" height="14" rx="2" ry="2" />
            <line x1="8" y1="21" x2="16" y2="21" />
            <line x1="12" y1="17" x2="12" y2="21" />
          </svg>
          Parc Informatique — Ordinateurs
        </h1>
        <p className="text-sm mt-1" style={{ color: 'var(--glpi-gray-500)' }}>
          Inventaire des postes récupérés depuis GLPI
        </p>
      </div>

      {/* ===== Search / Filter bar ===== */}
      <form
        onSubmit={handleSearch}
        className="rounded-lg p-4 mb-5 flex flex-wrap items-end gap-3"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--glpi-gray-200)',
          boxShadow: 'var(--shadow-sm)',
        }}
      >
        {/* Name search */}
        <div className="flex-1 min-w-[200px]">
          <label
            className="block text-xs font-semibold mb-1 uppercase tracking-wide"
            style={{ color: 'var(--glpi-gray-600)' }}
          >
            Nom du PC
          </label>
          <input
            type="text"
            value={searchName}
            onChange={(e) => setSearchName(e.target.value)}
            placeholder="Rechercher par nom..."
            className="w-full px-3 py-2 rounded-md text-sm outline-none transition-all duration-200"
            style={{
              border: '1px solid var(--glpi-gray-300)',
              background: 'var(--glpi-gray-50)',
            }}
            onFocus={(e) => (e.target.style.borderColor = 'var(--glpi-primary-light)')}
            onBlur={(e) => (e.target.style.borderColor = 'var(--glpi-gray-300)')}
          />
        </div>

        {/* Status dropdown */}
        <div className="min-w-[160px]">
          <label
            className="block text-xs font-semibold mb-1 uppercase tracking-wide"
            style={{ color: 'var(--glpi-gray-600)' }}
          >
            Statut
          </label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm outline-none cursor-pointer"
            style={{
              border: '1px solid var(--glpi-gray-300)',
              background: 'var(--glpi-gray-50)',
            }}
          >
            <option value="">Tous les statuts</option>
            {uniqueStatuses.map((sid) => (
              <option key={sid} value={sid}>
                {getStatus(sid).label} (ID: {sid})
              </option>
            ))}
          </select>
        </div>

        {/* Type dropdown */}
        <div className="min-w-[160px]">
          <label
            className="block text-xs font-semibold mb-1 uppercase tracking-wide"
            style={{ color: 'var(--glpi-gray-600)' }}
          >
            Type
          </label>
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="w-full px-3 py-2 rounded-md text-sm outline-none cursor-pointer"
            style={{
              border: '1px solid var(--glpi-gray-300)',
              background: 'var(--glpi-gray-50)',
            }}
          >
            <option value="">Tous les types</option>
            {uniqueTypes.map((tid) => (
              <option key={tid} value={tid}>
                Type #{tid}
              </option>
            ))}
          </select>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            type="submit"
            className="px-5 py-2 rounded-md text-sm font-medium text-white transition-all duration-200 cursor-pointer"
            style={{ background: 'var(--glpi-primary)' }}
            onMouseEnter={(e) => (e.target.style.background = 'var(--glpi-primary-dark)')}
            onMouseLeave={(e) => (e.target.style.background = 'var(--glpi-primary)')}
          >
            Rechercher
          </button>
          <button
            type="button"
            onClick={handleReset}
            className="px-5 py-2 rounded-md text-sm font-medium transition-all duration-200 cursor-pointer"
            style={{
              background: 'var(--glpi-gray-100)',
              color: 'var(--glpi-gray-700)',
              border: '1px solid var(--glpi-gray-300)',
            }}
            onMouseEnter={(e) => (e.target.style.background = 'var(--glpi-gray-200)')}
            onMouseLeave={(e) => (e.target.style.background = 'var(--glpi-gray-100)')}
          >
            Réinitialiser
          </button>
        </div>
      </form>

      {/* ===== Results count ===== */}
      {!loading && !error && (
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-medium" style={{ color: 'var(--glpi-gray-500)' }}>
            {filtered.length} résultat{filtered.length !== 1 ? 's' : ''} sur {computers.length} total
          </span>
        </div>
      )}

      {/* ===== Data Table ===== */}
      <div
        className="rounded-lg overflow-hidden"
        style={{
          background: 'var(--surface-card)',
          border: '1px solid var(--glpi-gray-200)',
          boxShadow: 'var(--shadow-md)',
        }}
      >
        {loading ? (
          <Spinner text="Chargement de l'inventaire..." />
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-lg"
              style={{ background: '#fce4ec', color: '#dc3545' }}
            >
              !
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--glpi-gray-700)' }}>
              Erreur de chargement
            </p>
            <p className="text-xs" style={{ color: 'var(--glpi-gray-500)' }}>
              {error}
            </p>
            <button
              onClick={fetchComputers}
              className="mt-2 px-4 py-1.5 rounded-md text-xs font-medium text-white cursor-pointer"
              style={{ background: 'var(--glpi-primary)' }}
            >
              Réessayer
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-xl"
              style={{ background: 'var(--glpi-primary-50)', color: 'var(--glpi-primary)' }}
            >
              ∅
            </div>
            <p className="text-sm font-medium" style={{ color: 'var(--glpi-gray-700)' }}>
              Aucun ordinateur trouvé
            </p>
            <p className="text-xs" style={{ color: 'var(--glpi-gray-500)' }}>
              Modifiez vos critères de recherche
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="glpi-table">
              <thead>
                <tr>
                  <th style={{ width: 70 }}>ID</th>
                  <th>Nom de l'ordinateur</th>
                  <th>Numéro de série</th>
                  <th style={{ width: 140 }}>Statut</th>
                  <th style={{ width: 170 }}>Date de modification</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((computer) => {
                  const status = getStatus(computer.states_id);
                  return (
                    <tr key={computer.id}>
                      <td>
                        <span
                          className="font-mono text-xs font-semibold px-2 py-0.5 rounded"
                          style={{
                            background: 'var(--glpi-primary-50)',
                            color: 'var(--glpi-primary)',
                          }}
                        >
                          #{computer.id}
                        </span>
                      </td>
                      <td>
                        <span className="font-medium" style={{ color: 'var(--glpi-gray-900)' }}>
                          {computer.name || '—'}
                        </span>
                      </td>
                      <td>
                        <span className="font-mono text-xs" style={{ color: 'var(--glpi-gray-600)' }}>
                          {computer.serial || '—'}
                        </span>
                      </td>
                      <td>
                        <span
                          className="badge"
                          style={{ background: status.bg, color: status.text }}
                        >
                          {status.label}
                        </span>
                      </td>
                      <td>
                        <span className="text-xs" style={{ color: 'var(--glpi-gray-500)' }}>
                          {formatDate(computer.date_mod)}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
