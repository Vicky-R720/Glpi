import React, { useEffect, useState, useMemo, useRef } from "react";
import { fetchAllAssets } from "../service/assets.js";
import { fetchITILCategories, fetchLocations, fetchUsers, createTicketWithDetails } from "../service/ticket.js";
import "./DeclareTicket.css";

export default function DeclareTicket() {
  // Form core fields states
  const [ticketType, setTicketType] = useState(1); // 1 = Incident, 2 = Request/Demande
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");
  const [urgency, setUrgency] = useState(3); // 1 to 5, default = 3 (Medium)
  
  // Lists from GLPI API
  const [categoriesList, setCategoriesList] = useState([]);
  const [locationsList, setLocationsList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [assetsList, setAssetsList] = useState([]);

  // Selections: Assets & Observers
  const [associatedAssets, setAssociatedAssets] = useState([]);
  const [observers, setObservers] = useState([]);

  // Autocomplete: Assets Search
  const [assetSearchText, setAssetSearchText] = useState("");
  const [showAssetDropdown, setShowAssetDropdown] = useState(false);
  const assetDropdownRef = useRef(null);

  // Autocomplete: Observers Search
  const [observerSearchText, setObserverSearchText] = useState("");
  const [showObserverDropdown, setShowObserverDropdown] = useState(false);
  const observerDropdownRef = useRef(null);

  // Loading & Submission feedbacks
  const [loading, setLoading] = useState(false);
  const [submitStatus, setSubmitStatus] = useState(null);

  // Load all metadata dynamically from GLPI API on component mount
  const loadMetadata = async () => {
    try {
      const [cats, locs, users, assets] = await Promise.all([
        fetchITILCategories(),
        fetchLocations(),
        fetchUsers(),
        fetchAllAssets()
      ]);
      setCategoriesList(cats);
      setLocationsList(locs);
      setUsersList(users);
      setAssetsList(assets);
    } catch (err) {
      console.error("[DeclareTicket] Failed to load form metadata options:", err);
    }
  };

  useEffect(() => {
    loadMetadata();
  }, []);

  // Safe Fallback lists if GLPI configuration returns empty datasets
  const categoriesToDisplay = useMemo(() => {
    return categoriesList.length > 0 ? categoriesList : [
      { id: 1, name: "Matériel / Hardware" },
      { id: 2, name: "Logiciel / Software" },
      { id: 3, name: "Réseau / Internet" },
      { id: 4, name: "Accès & Identifiants" },
      { id: 5, name: "Autre demande" }
    ];
  }, [categoriesList]);

  const locationsToDisplay = useMemo(() => {
    return locationsList.length > 0 ? locationsList : [
      { id: 1, name: "Administration" },
      { id: 2, name: "Laboratoire IA" },
      { id: 4, name: "Comptabilité" },
      { id: 5, name: "Magasin Informatique" }
    ];
  }, [locationsList]);

  // Autocomplete filter: Assets
  const filteredSearchAssets = useMemo(() => {
    if (assetSearchText.trim() === "") return [];
    const query = assetSearchText.toLowerCase();
    return assetsList.filter(asset => 
      !associatedAssets.some(item => item.id === asset.id && item.itemtype === asset.itemtype) &&
      (asset.name.toLowerCase().includes(query) ||
       asset.model.toLowerCase().includes(query) ||
       asset.serial.toLowerCase().includes(query) ||
       asset.typeLabel.toLowerCase().includes(query))
    ).slice(0, 8);
  }, [assetsList, assetSearchText, associatedAssets]);

  // Autocomplete filter: Observers (Users)
  const filteredSearchObservers = useMemo(() => {
    if (observerSearchText.trim() === "") return [];
    const query = observerSearchText.toLowerCase();
    return usersList.filter(user => 
      !observers.some(item => item.id === user.id) &&
      (user.name.toLowerCase().includes(query) ||
       (user.realname && user.realname.toLowerCase().includes(query)) ||
       (user.firstname && user.firstname.toLowerCase().includes(query)))
    ).slice(0, 8);
  }, [usersList, observerSearchText, observers]);

  // Detect clicks outside search dropdowns to close them
  useEffect(() => {
    function handleClickOutside(event) {
      if (assetDropdownRef.current && !assetDropdownRef.current.contains(event.target)) {
        setShowAssetDropdown(false);
      }
      if (observerDropdownRef.current && !observerDropdownRef.current.contains(event.target)) {
        setShowObserverDropdown(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Assets addition & deletion helpers
  const handleAddAsset = (asset) => {
    setAssociatedAssets([...associatedAssets, asset]);
    setAssetSearchText("");
    setShowAssetDropdown(false);
  };

  const handleRemoveAsset = (asset) => {
    setAssociatedAssets(associatedAssets.filter(item => !(item.id === asset.id && item.itemtype === asset.itemtype)));
  };

  // Observers addition & deletion helpers
  const handleAddObserver = (user) => {
    const observerName = user.firstname && user.realname 
      ? `${user.firstname} ${user.realname}` 
      : (user.realname || user.name);

    setObservers([...observers, { id: user.id, name: observerName }]);
    setObserverSearchText("");
    setShowObserverDropdown(false);
  };

  const handleRemoveObserver = (observerId) => {
    setObservers(observers.filter(item => item.id !== observerId));
  };

  // Form submission handler
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) return;

    setLoading(true);
    setSubmitStatus(null);

    // Build the ticket payload
    const ticketInput = {
      
      name: title,
      content: description,
      type: ticketType,
      urgency: Number(urgency),
      status: 1 // 1 = Nouveau
    };

    if (selectedCategory) {
      ticketInput.itilcategories_id = Number(selectedCategory);
    }

    if (selectedLocation) {
      ticketInput.locations_id = Number(selectedLocation);
    }

    // Call service to register ticket and create links
    const result = await createTicketWithDetails(ticketInput, associatedAssets, observers);

    setLoading(false);
    if (result.success) {
      setSubmitStatus({
        success: true,
        message: `Votre ticket #${result.ticketId} a été enregistré avec succès !`
      });
      // Reset form fields
      setTitle("");
      setDescription("");
      setSelectedCategory("");
      setSelectedLocation("");
      setUrgency(3);
      setAssociatedAssets([]);
      setObservers([]);
    } else {
      setSubmitStatus({
        success: false,
        message: `Erreur de création: ${result.error || "Veuillez réessayer plus tard."}`
      });
    }
  };

  return (
    <div className="container px-0" style={{ maxWidth: "850px" }}>
      <div className="mb-4">
        <h1 className="h3 page-title mb-1">🎟️ Déclarer un incident / Demande</h1>
        <p className="text-muted small">
          Renseignez les informations pour soumettre votre incident ou demande de service.
        </p>
      </div>

      <div className="card declare-ticket-card border-0 p-4 p-md-5">
        <form onSubmit={handleSubmit}>
          
          {/* Choice: Incident vs Demande */}
          <div className="mb-4">
            <label className="form-label text-dark fw-bold mb-3">Type de ticket</label>
            <div className="row g-3">
              <div className="col-12 col-sm-6">
                <div 
                  className={`type-card text-center h-100 ${ticketType === 1 ? 'active-incident' : ''}`}
                  onClick={() => setTicketType(1)}
                >
                  <span className="type-icon">⚠️</span>
                  <h5 className="fw-bold mb-1">Signaler un incident</h5>
                  <p className="text-muted small mb-0">Une panne ou une interruption d'un service (ex: écran en panne, bug logiciel).</p>
                </div>
              </div>
              <div className="col-12 col-sm-6">
                <div 
                  className={`type-card text-center h-100 ${ticketType === 2 ? 'active-request' : ''}`}
                  onClick={() => setTicketType(2)}
                >
                  <span className="type-icon">🛠️</span>
                  <h5 className="fw-bold mb-1">Demander un service</h5>
                  <p className="text-muted small mb-0">Une demande d'équipement ou d'aide logicielle (ex: obtenir un nouveau clavier).</p>
                </div>
              </div>
            </div>
          </div>

          <hr className="my-4 text-muted opacity-25" />

          {/* Title & Description */}
          <div className="mb-4">
            <h5 className="text-dark fw-bold mb-3">Informations générales</h5>
            
            {/* Title */}
            <div className="mb-3">
              <label htmlFor="ticketTitle" className="form-label text-secondary small fw-bold">Titre</label>
              <input 
                type="text" 
                id="ticketTitle" 
                className="form-control form-control-lg rounded-3 fs-6" 
                placeholder="Indiquez brièvement l'objet du problème..."
                value={title}
                onChange={e => setTitle(e.target.value)}
                required
              />
            </div>

            {/* Description */}
            <div className="mb-3">
              <label htmlFor="ticketDesc" className="form-label text-secondary small fw-bold">Description</label>
              <textarea 
                id="ticketDesc" 
                className="form-control rounded-3" 
                rows="5" 
                placeholder="Expliquez en détail les circonstances et les symptômes rencontrés..."
                value={description}
                onChange={e => setDescription(e.target.value)}
                required
              ></textarea>
            </div>
          </div>

          <hr className="my-4 text-muted opacity-25" />

          {/* Ticket Metadata dropdowns */}
          <div className="mb-4">
            <h5 className="text-dark fw-bold mb-3">Catégorisation & Localisation</h5>
            
            <div className="row g-3">
              {/* Category */}
              <div className="col-12 col-md-4">
                <label htmlFor="ticketCat" className="form-label text-secondary small fw-bold">Catégorie</label>
                <select 
                  id="ticketCat" 
                  className="form-select rounded-3" 
                  value={selectedCategory}
                  onChange={e => setSelectedCategory(e.target.value)}
                >
                  <option value="">Sélectionnez une catégorie</option>
                  {categoriesToDisplay.map(cat => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Location */}
              <div className="col-12 col-md-4">
                <label htmlFor="ticketLocation" className="form-label text-secondary small fw-bold">Lieu</label>
                <select 
                  id="ticketLocation" 
                  className="form-select rounded-3" 
                  value={selectedLocation}
                  onChange={e => setSelectedLocation(e.target.value)}
                >
                  <option value="">Sélectionnez un lieu</option>
                  {locationsToDisplay.map(loc => (
                    <option key={loc.id} value={loc.id}>
                      {loc.completename || loc.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Urgency */}
              <div className="col-12 col-md-4">
                <label htmlFor="ticketUrgency" className="form-label text-secondary small fw-bold">Urgence</label>
                <select 
                  id="ticketUrgency" 
                  className="form-select rounded-3" 
                  value={urgency}
                  onChange={e => setUrgency(Number(e.target.value))}
                >
                  <option value={1}>1 - Très basse</option>
                  <option value={2}>2 - Basse</option>
                  <option value={3}>3 - Moyenne</option>
                  <option value={4}>4 - Haute</option>
                  <option value={5}>5 - Très haute</option>
                </select>
              </div>
            </div>
          </div>

          <hr className="my-4 text-muted opacity-25" />

          {/* Observers selection dropdown (Ticket_User type = 2) */}
          <div className="mb-4" ref={observerDropdownRef}>
            <label className="form-label text-dark fw-bold mb-2">Observateurs</label>
            <p className="text-muted small mb-2">Ajoutez des collaborateurs pour suivre l'avancement du ticket.</p>
            
            <div className="asset-search-container mb-2">
              <div className="input-group">
                <span className="input-group-text bg-light text-secondary border-end-0">👤</span>
                <input 
                  type="text" 
                  className="form-control border-start-0" 
                  placeholder="Rechercher un observateur par son nom..."
                  value={observerSearchText}
                  onChange={e => {
                    setObserverSearchText(e.target.value);
                    setShowObserverDropdown(true);
                  }}
                  onFocus={() => setShowObserverDropdown(true)}
                />
              </div>

              {/* Observers Autocomplete Dropdown list */}
              {showObserverDropdown && filteredSearchObservers.length > 0 && (
                <div className="asset-dropdown-results custom-scrollbar">
                  {filteredSearchObservers.map(user => {
                    const fullName = user.firstname && user.realname 
                      ? `${user.firstname} ${user.realname}` 
                      : (user.realname || user.name);

                    return (
                      <div 
                        key={user.id} 
                        className="asset-dropdown-item"
                        onClick={() => handleAddObserver(user)}
                      >
                        <div>
                          <span className="fw-bold text-dark">{fullName}</span>
                          <span className="text-muted small ms-2">({user.name})</span>
                        </div>
                        <span className="text-primary small fw-semibold">+ Ajouter</span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* List of currently selected observer chips */}
            {observers.length > 0 ? (
              <div className="d-flex flex-wrap gap-2 mt-2">
                {observers.map(obs => (
                  <div key={obs.id} className="asset-tag shadow-sm">
                    <span className="text-dark fw-semibold">
                      👤 {obs.name}
                    </span>
                    <button 
                      type="button" 
                      className="btn-remove-asset" 
                      onClick={() => handleRemoveObserver(obs.id)}
                      title="Retirer"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted small border border-dashed rounded-3 p-3 text-center bg-light">
                Aucun observateur associé.
              </div>
            )}
          </div>

          <hr className="my-4 text-muted opacity-25" />

          {/* User's Assets selection widget (Matériels de l'utilisateur) */}
          <div className="mb-4" ref={assetDropdownRef}>
            <label className="form-label text-dark fw-bold mb-2">Matériels de l'utilisateur</label>
            <p className="text-muted small mb-2">Sélectionnez les équipements informatiques ou logiciels impactés par le ticket.</p>
            
            <div className="asset-search-container mb-2">
              <div className="input-group">
                <span className="input-group-text bg-light text-secondary border-end-0">🖥️</span>
                <input 
                  type="text" 
                  className="form-control border-start-0" 
                  placeholder="Rechercher un ordinateur, écran, périphérique..."
                  value={assetSearchText}
                  onChange={e => {
                    setAssetSearchText(e.target.value);
                    setShowAssetDropdown(true);
                  }}
                  onFocus={() => setShowAssetDropdown(true)}
                />
              </div>

              {/* Assets Autocomplete Dropdown list */}
              {showAssetDropdown && filteredSearchAssets.length > 0 && (
                <div className="asset-dropdown-results custom-scrollbar">
                  {filteredSearchAssets.map(asset => (
                    <div 
                      key={`${asset.itemtype}-${asset.id}`} 
                      className="asset-dropdown-item"
                      onClick={() => handleAddAsset(asset)}
                    >
                      <div>
                        <span className="fw-bold text-dark">{asset.name}</span>
                        <span className="badge bg-light text-secondary border ms-2 small">{asset.typeLabel}</span>
                        <div className="text-muted small font-monospace">Modèle: {asset.model} | S/N: {asset.serial}</div>
                      </div>
                      <span className="text-primary small fw-semibold">+ Assigner</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* List of currently associated assets chips */}
            {associatedAssets.length > 0 ? (
              <div className="d-flex flex-wrap gap-2 mt-2">
                {associatedAssets.map(asset => (
                  <div key={`${asset.itemtype}-${asset.id}`} className="asset-tag shadow-sm">
                    <span className="text-dark fw-semibold">
                      🖥️ {asset.name} <span className="text-muted font-monospace small">({asset.typeLabel})</span>
                    </span>
                    <button 
                      type="button" 
                      className="btn-remove-asset" 
                      onClick={() => handleRemoveAsset(asset)}
                      title="Retirer"
                    >
                      &times;
                    </button>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted small border border-dashed rounded-3 p-3 text-center bg-light">
                Aucun équipement ou logiciel associé.
              </div>
            )}
          </div>

          {submitStatus && (
            <div className={`alert ${submitStatus.success ? 'alert-success border-success' : 'alert-danger border-danger'} p-3 shadow-sm rounded-3 mb-4`} role="alert">
              <div className="d-flex align-items-center gap-2">
                <span className="fs-5">{submitStatus.success ? '🎉' : '❌'}</span>
                <div className="fw-bold">{submitStatus.message}</div>
              </div>
            </div>
          )}

          <button 
            type="submit" 
            className="btn btn-primary btn-lg w-100 rounded-3 shadow-sm py-2 text-white font-weight-bold"
            disabled={loading}
          >
            {loading ? (
              <span className="d-flex align-items-center justify-content-center gap-2">
                <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                Soumission du ticket et des liaisons...
              </span>
            ) : (
              ticketType === 1 ? '⚠️ Déclarer l\'incident' : '🛠️ Soumettre la demande'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
