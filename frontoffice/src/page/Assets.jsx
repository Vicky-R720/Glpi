import React, { useEffect, useState, useMemo } from "react";
import { fetchAllAssets, extractFilterOptions, ASSET_TYPES } from "../service/assets.js";
import "./Assets.css";

export default function Assets() {
  const [assets, setAssets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters State
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [selectedManufacturer, setSelectedManufacturer] = useState("");
  const [selectedUser, setSelectedUser] = useState("");

  // Detailed view sheet modal
  const [selectedItem, setSelectedItem] = useState(null);

  // Load all assets on mount
  const loadAssets = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await fetchAllAssets();
      setAssets(data);
    } catch (err) {
      setError("Erreur lors de la récupération des éléments de l'inventaire.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAssets();
  }, []);

  // Compute filter options dynamically from active assets
  const filterOptions = useMemo(() => {
    return extractFilterOptions(assets);
  }, [assets]);

  // Compute counts per itemtype
  const typeCounts = useMemo(() => {
    const counts = {};
    ASSET_TYPES.forEach((t) => {
      counts[t.key] = 0;
    });
    assets.forEach((item) => {
      if (counts[item.itemtype] !== undefined) {
        counts[item.itemtype]++;
      }
    });
    return counts;
  }, [assets]);

  // Filter assets reactively
  const filteredAssets = useMemo(() => {
    return assets.filter((item) => {
      // 1. Text Search matching multiple fields
      if (searchQuery.trim() !== "") {
        const query = searchQuery.toLowerCase();
        const matchesQuery =
          (item.name && item.name.toLowerCase().includes(query)) ||
          (item.serial && item.serial.toLowerCase().includes(query)) ||
          (item.inventoryNumber && item.inventoryNumber.toLowerCase().includes(query)) ||
          (item.model && item.model.toLowerCase().includes(query)) ||
          (item.manufacturer && item.manufacturer.toLowerCase().includes(query)) ||
          (item.user && item.user.toLowerCase().includes(query)) ||
          (item.location && item.location.toLowerCase().includes(query)) ||
          (item.status && item.status.toLowerCase().includes(query));

        if (!matchesQuery) return false;
      }

      // 2. Type Filter
      if (selectedType && item.itemtype !== selectedType) return false;

      // 3. Status Filter
      if (selectedStatus && item.status !== selectedStatus) return false;

      // 4. Location Filter
      if (selectedLocation && item.location !== selectedLocation) return false;

      // 5. Manufacturer Filter
      if (selectedManufacturer && item.manufacturer !== selectedManufacturer) return false;

      // 6. User Filter
      if (selectedUser && item.user !== selectedUser) return false;

      return true;
    });
  }, [
    assets,
    searchQuery,
    selectedType,
    selectedStatus,
    selectedLocation,
    selectedManufacturer,
    selectedUser,
  ]);

  // Reset all criteria filters
  const resetFilters = () => {
    setSearchQuery("");
    setSelectedType("");
    setSelectedStatus("");
    setSelectedLocation("");
    setSelectedManufacturer("");
    setSelectedUser("");
  };

  // Helper to determine status classes for badges
  const getStatusBadgeClass = (status) => {
    if (!status) return "status-badge status-default";
    const s = status.toLowerCase();
    if (s.includes("production")) return "status-badge status-production";
    if (s.includes("stock")) return "status-badge status-stock";
    if (s.includes("maintenance")) return "status-badge status-maintenance";
    if (s.includes("panne") || s.includes("hors service")) return "status-badge status-broken";
    return "status-badge status-default";
  };

  return (
    <div className="container-fluid px-0">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h1 className="h3 page-title mb-1">🖥️ Recherche d'Éléments</h1>
          <p className="text-muted small mb-0">
            Consultez et filtrez tous les équipements et actifs informatiques du parc.
          </p>
        </div>
        <button className="btn btn-outline-secondary btn-sm" onClick={loadAssets} disabled={loading}>
          {loading ? "Chargement..." : "🔄 Actualiser"}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger mb-4 shadow-sm" role="alert">
          {error}
        </div>
      )}

      {/* Interactive Category Counters */}
      {!loading && assets.length > 0 && (
        <div className="d-flex flex-wrap gap-2 mb-4 align-items-center">
          <span className="text-muted small me-2 fw-bold">Filtrer par catégorie :</span>
          <span
            className={`badge bg-light text-dark border badge-interactive ${selectedType === "" ? "active" : ""}`}
            onClick={() => setSelectedType("")}
          >
            Tous ({assets.length})
          </span>
          {ASSET_TYPES.map((type) => {
            const count = typeCounts[type.key] || 0;
            if (count === 0) return null;
            return (
              <span
                key={type.key}
                className={`badge bg-light text-dark border badge-interactive ${
                  selectedType === type.key ? "active" : ""
                }`}
                onClick={() => setSelectedType(selectedType === type.key ? "" : type.key)}
              >
                {type.label} ({count})
              </span>
            );
          })}
        </div>
      )}

      {/* Multi-Criteria Filters Card */}
      <div className="card glass-card border-0 mb-4 p-4">
        <h5 className="card-title text-dark mb-3 fw-bold">🔍 Critères de recherche</h5>
        <div className="row g-3">
          {/* Free Text Search */}
          <div className="col-12 col-md-4">
            <label className="form-label text-secondary small fw-bold" htmlFor="searchQuery">
              Recherche libre
            </label>
            <input
              type="text"
              id="searchQuery"
              className="form-control form-control-sm"
              placeholder="Nom, S/N, modèle, utilisateur..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>

          {/* Asset Type */}
          <div className="col-12 col-sm-6 col-md-2">
            <label className="form-label text-secondary small fw-bold" htmlFor="typeFilter">
              Type d'élément
            </label>
            <select
              id="typeFilter"
              className="form-select form-select-sm"
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
            >
              <option value="">Tous les types</option>
              {ASSET_TYPES.map((t) => (
                <option key={t.key} value={t.key}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div className="col-12 col-sm-6 col-md-2">
            <label className="form-label text-secondary small fw-bold" htmlFor="statusFilter">
              Statut (État)
            </label>
            <select
              id="statusFilter"
              className="form-select form-select-sm"
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
            >
              <option value="">Tous les statuts</option>
              {filterOptions.states.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Location */}
          <div className="col-12 col-sm-6 col-md-2">
            <label className="form-label text-secondary small fw-bold" htmlFor="locationFilter">
              Lieu
            </label>
            <select
              id="locationFilter"
              className="form-select form-select-sm"
              value={selectedLocation}
              onChange={(e) => setSelectedLocation(e.target.value)}
            >
              <option value="">Tous les lieux</option>
              {filterOptions.locations.map((loc) => (
                <option key={loc} value={loc}>
                  {loc}
                </option>
              ))}
            </select>
          </div>

          {/* Manufacturer */}
          <div className="col-12 col-sm-6 col-md-2">
            <label className="form-label text-secondary small fw-bold" htmlFor="manufacturerFilter">
              Fabricant
            </label>
            <select
              id="manufacturerFilter"
              className="form-select form-select-sm"
              value={selectedManufacturer}
              onChange={(e) => setSelectedManufacturer(e.target.value)}
            >
              <option value="">Tous les fabricants</option>
              {filterOptions.manufacturers.map((man) => (
                <option key={man} value={man}>
                  {man}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="row mt-3 align-items-center">
          <div className="col-12 col-md-6">
            {/* Assigned User */}
            <div className="d-flex align-items-center gap-2">
              <label className="text-secondary small fw-bold text-nowrap mb-0" htmlFor="userFilter">
                Utilisateur assigné :
              </label>
              <select
                id="userFilter"
                className="form-select form-select-sm"
                style={{ maxWidth: "250px" }}
                value={selectedUser}
                onChange={(e) => setSelectedUser(e.target.value)}
              >
                <option value="">Tous les utilisateurs</option>
                {filterOptions.users.map((usr) => (
                  <option key={usr} value={usr}>
                    {usr}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="col-12 col-md-6 text-md-end mt-2 mt-md-0">
            <button className="btn btn-light btn-sm text-dark border-secondary me-2" onClick={resetFilters}>
              🧹 Réinitialiser les filtres
            </button>
          </div>
        </div>
      </div>

      {/* Loading Spinner */}
      {loading && (
        <div className="text-center py-5">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-3 text-muted">Chargement et agrégation des équipements...</p>
        </div>
      )}

      {/* Results Section */}
      {!loading && (
        <div>
          <div className="d-flex justify-content-between align-items-center mb-3">
            <h5 className="text-dark fw-bold mb-0">
              📋 Résultats ({filteredAssets.length} éléments correspondants)
            </h5>
          </div>

          {filteredAssets.length === 0 ? (
            <div className="card text-center py-5 border-0 bg-white shadow-sm rounded-3">
              <span className="fs-1">🔍</span>
              <h5 className="mt-3 mb-1 text-dark fw-bold">Aucun élément ne correspond</h5>
              <p className="text-muted small">Modifiez vos critères de recherche pour trouver d'autres équipements.</p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table custom-table table-hover align-middle">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Nom</th>
                    <th>Catégorie</th>
                    <th>Modèle / Fabricant</th>
                    <th>S/N & Inventaire</th>
                    <th>Lieu</th>
                    <th>Statut</th>
                    <th>Utilisateur</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAssets.map((item) => (
                    <tr key={`${item.itemtype}-${item.id}`} onClick={() => setSelectedItem(item)}>
                      <td>
                        <code>#{item.id}</code>
                      </td>
                      <td>
                        <span className="fw-bold text-dark">{item.name}</span>
                      </td>
                      <td>
                        <span className="badge bg-light text-secondary border">{item.typeLabel}</span>
                      </td>
                      <td>
                        <div className="fw-semibold text-dark">{item.model}</div>
                        <div className="text-muted small">{item.manufacturer}</div>
                      </td>
                      <td>
                        <div className="text-dark small">S/N: {item.serial}</div>
                        <div className="text-muted small">Inv: {item.inventoryNumber}</div>
                      </td>
                      <td>{item.location}</td>
                      <td>
                        <span className={getStatusBadgeClass(item.status)}>{item.status}</span>
                      </td>
                      <td>
                        <span className="text-dark fw-semibold">{item.user}</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Element Detail sheet Modal */}
      {selectedItem && (
        <div className="modal-backdrop-custom" onClick={() => setSelectedItem(null)}>
          <div className="modal-dialog-custom" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-custom">
              <h5 className="modal-title fw-bold text-dark mb-0">
                🏢 Fiche d'Équipement {selectedItem.name}
              </h5>
              <button
                type="button"
                className="btn-close"
                aria-label="Fermer"
                onClick={() => setSelectedItem(null)}
              ></button>
            </div>

            <div className="modal-body-custom custom-scrollbar">
              <div className="row g-4">
                <div className="col-12 col-md-6">
                  <div className="detail-item">
                    <div className="detail-label">Nom de l'élément</div>
                    <div className="detail-value fw-bold text-primary">{selectedItem.name}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Catégorie d'équipement</div>
                    <div className="detail-value">{selectedItem.typeLabel} ({selectedItem.itemtype})</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Modèle</div>
                    <div className="detail-value">{selectedItem.model}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Fabricant</div>
                    <div className="detail-value">{selectedItem.manufacturer}</div>
                  </div>
                </div>

                <div className="col-12 col-md-6">
                  <div className="detail-item">
                    <div className="detail-label">Statut (État)</div>
                    <div className="detail-value">
                      <span className={getStatusBadgeClass(selectedItem.status)}>
                        {selectedItem.status}
                      </span>
                    </div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Lieu d'implantation</div>
                    <div className="detail-value">{selectedItem.location}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Utilisateur assigné</div>
                    <div className="detail-value fw-bold">{selectedItem.user}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Dernière modification</div>
                    <div className="detail-value text-muted small">{selectedItem.dateMod}</div>
                  </div>
                </div>
              </div>

              <div className="row mt-3">
                <div className="col-12">
                  <div className="detail-item">
                    <div className="detail-label">Numéro de Série (S/N)</div>
                    <div className="detail-value font-monospace">{selectedItem.serial}</div>
                  </div>
                  <div className="detail-item">
                    <div className="detail-label">Numéro d'Inventaire</div>
                    <div className="detail-value font-monospace">{selectedItem.inventoryNumber}</div>
                  </div>
                  
                  {/* HATEOAS Links from GLPI */}
                  {selectedItem.raw.links && selectedItem.raw.links.length > 0 && (
                    <div className="mt-3">
                      <span className="detail-label d-block mb-2">Relations API GLPI (HATEOAS)</span>
                      <div className="d-flex flex-wrap gap-2" style={{ maxHeight: "150px", overflowY: "auto" }}>
                        {selectedItem.raw.links.map((link, idx) => (
                          <a
                            key={idx}
                            href={link.href}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="badge bg-light text-secondary border text-decoration-none py-2 px-3 hover-shadow"
                            title={link.href}
                            style={{ transition: "all 0.2s" }}
                          >
                            🔗 {link.rel}
                          </a>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="modal-footer-custom">
              <button
                type="button"
                className="btn btn-secondary btn-sm rounded-pill px-4"
                onClick={() => setSelectedItem(null)}
              >
                Fermer la fiche
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
