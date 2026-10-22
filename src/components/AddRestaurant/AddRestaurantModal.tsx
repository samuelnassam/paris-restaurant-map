import React, { useState, useEffect } from 'react';
import { useRestaurants } from '../../context/RestaurantContext';
import {
  COMMON_CUISINES,
  PARIS_ARRONDISSEMENTS,
  PriceRange,
  RestaurantStatus,
  STATUS_LABELS,
} from '../../types/restaurant';
import {
  X,
  Search,
  Sparkles,
  MapPin,
  AlertTriangle,
  Check,
  Star,
  Plus,
  Compass,
  Heart,
  CheckCircle2,
  Ban,
  Camera,
  Loader2,
  Navigation,
  Crosshair,
  Globe,
  Phone,
  ExternalLink
} from 'lucide-react';

export const AddRestaurantModal: React.FC = () => {
  const {
    isAddModalOpen,
    setIsAddModalOpen,
    addRestaurant,
    checkDuplicate,
    selectedLocationForAdd,
    setSelectedLocationForAdd,
    setSelectedRestaurant,
    collections,
    userLocation,
    locateUser,
  } = useRestaurants();

  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchingAi, setIsSearchingAi] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [arrondissement, setArrondissement] = useState('11e (Bastille / Charonne / Oberkampf)');
  const [lat, setLat] = useState<number>(48.8566);
  const [lng, setLng] = useState<number>(2.3522);
  const [status, setStatus] = useState<RestaurantStatus>('to_try');
  const [cuisine, setCuisine] = useState('Bistrot & Cuisine Française');
  const [priceRange, setPriceRange] = useState<PriceRange>('€€');
  const [website, setWebsite] = useState('');
  const [phone, setPhone] = useState('');
  const [personalRating, setPersonalRating] = useState<number>(0);
  const [personalReview, setPersonalReview] = useState('');
  const [notes, setNotes] = useState('');
  const [mustTryDishes, setMustTryDishes] = useState<string[]>([]);
  const [newDishInput, setNewDishInput] = useState('');
  const [visitedAt, setVisitedAt] = useState<string>('');
  const [photos, setPhotos] = useState<string[]>([]);
  const [photoInput, setPhotoInput] = useState('');
  const [selectedCollections, setSelectedCollections] = useState<string[]>([]);

  // Duplicate state
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);

  // Pre-fill coordinates if clicked on map
  useEffect(() => {
    if (selectedLocationForAdd) {
      setLat(selectedLocationForAdd.lat);
      setLng(selectedLocationForAdd.lng);
      setAddress(`Coordonnées : ${selectedLocationForAdd.lat.toFixed(5)}, ${selectedLocationForAdd.lng.toFixed(5)}`);
    }
  }, [selectedLocationForAdd]);

  // Check duplicates when name or address changes
  useEffect(() => {
    if (name.trim().length >= 3) {
      const dup = checkDuplicate(name, address);
      if (dup.isDuplicate) {
        setDuplicateWarning(dup.existingRestaurant);
      } else {
        setDuplicateWarning(null);
      }
    } else {
      setDuplicateWarning(null);
    }
  }, [name, address, checkDuplicate]);

  if (!isAddModalOpen) return null;

  // Search using backend Gemini + Maps/Search Grounding geocoder
  const handleSearchParisPlace = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setIsSearchingAi(true);
    setSearchError(null);

    try {
      const response = await fetch('/api/search-place', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: searchQuery.trim() }),
      });

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche du lieu');
      }

      const data = await response.json();

      setName(data.name || searchQuery.trim());
      setAddress(data.address || '');
      if (data.lat && data.lng) {
        setLat(data.lat);
        setLng(data.lng);
      }
      if (data.cuisine) {
        setCuisine(data.cuisine);
      }
      if (data.priceRange) {
        setPriceRange(data.priceRange);
      }
      if (data.arrondissement) {
        const foundArr = PARIS_ARRONDISSEMENTS.find((a) =>
          a.toLowerCase().includes(data.arrondissement.toLowerCase())
        );
        if (foundArr) setArrondissement(foundArr);
      }
      if (Array.isArray(data.signatureDishes) && data.signatureDishes.length > 0) {
        setMustTryDishes(data.signatureDishes);
      }
      if (Array.isArray(data.photos) && data.photos.length > 0) {
        setPhotos(data.photos);
      }
      if (data.website) {
        setWebsite(data.website);
      }
      if (data.phone) {
        setPhone(data.phone);
      }
    } catch (err: any) {
      console.error(err);
      setSearchError('Impossible de géolocaliser automatiquement cet établissement. Vous pouvez remplir les informations manuellement.');
    } finally {
      setIsSearchingAi(false);
    }
  };

  const handleAddDish = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishInput.trim()) return;
    setMustTryDishes((prev) => [...prev, newDishInput.trim()]);
    setNewDishInput('');
  };

  const handleRemoveDish = (index: number) => {
    setMustTryDishes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleAddPhoto = (e: React.FormEvent) => {
    e.preventDefault();
    if (!photoInput.trim()) return;
    setPhotos((prev) => [...prev, photoInput.trim()]);
    setPhotoInput('');
  };

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setPhotos((prev) => [...prev, reader.result as string]);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleCollection = (colId: string) => {
    setSelectedCollections((prev) =>
      prev.includes(colId) ? prev.filter((id) => id !== colId) : [...prev, colId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setFormError('Veuillez renseigner le nom du restaurant.');
      return;
    }
    if (!address.trim()) {
      setFormError('Veuillez renseigner l’adresse.');
      return;
    }
    setFormError(null);

    await addRestaurant({
      name: name.trim(),
      address: address.trim(),
      arrondissement,
      lat,
      lng,
      status,
      cuisine,
      priceRange,
      website: website.trim() || undefined,
      phone: phone.trim() || undefined,
      personalRating,
      personalReview: personalReview.trim(),
      notes: notes.trim(),
      mustTryDishes,
      visitedAt: status === 'tested' || status === 'favorite' ? (visitedAt || new Date().toISOString().split('T')[0]) : null,
      photos,
      collections: selectedCollections,
      googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ' ' + address)}`,
      isDemo: false,
    });

    handleClose();
  };

  const handleClose = () => {
    setIsAddModalOpen(false);
    setSelectedLocationForAdd(null);
    setSearchQuery('');
    setName('');
    setAddress('');
    setWebsite('');
    setPhone('');
    setMustTryDishes([]);
    setPhotos([]);
    setPersonalRating(0);
    setPersonalReview('');
    setNotes('');
    setDuplicateWarning(null);
    setFormError(null);
    setSearchError(null);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-2xl max-h-[92vh] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/70 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center font-bold">
              <Plus className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Ajouter un restaurant à Paris
              </h2>
              <p className="text-xs text-zinc-500">
                Recherchez l'adresse ou saisissez ses détails pour placer l'épingle
              </p>
            </div>
          </div>
          <button
            onClick={handleClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Scrollable form body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Automatic Geocoding Search Bar */}
          <div className="p-3.5 bg-gradient-to-r from-rose-50/60 to-amber-50/60 dark:from-rose-950/20 dark:to-amber-950/20 border border-rose-200/60 dark:border-rose-900/40 rounded-xl space-y-2">
            <label className="block text-xs font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-rose-500" />
              Recherche intelligente & géolocalisation automatique
            </label>
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleSearchParisPlace())}
                  placeholder="Ex: Septime, Pink Mamma, 80 rue de Charonne, Chez Janou..."
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
                />
              </div>
              <button
                type="button"
                onClick={() => handleSearchParisPlace()}
                disabled={isSearchingAi || !searchQuery.trim()}
                className="px-3.5 py-2 bg-zinc-900 hover:bg-zinc-800 text-white disabled:opacity-50 text-xs font-semibold rounded-xl flex items-center gap-1.5 shadow-sm transition"
              >
                {isSearchingAi ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Recherche...</span>
                  </>
                ) : (
                  <>
                    <Search className="w-3.5 h-3.5" />
                    <span>Géolocaliser</span>
                  </>
                )}
              </button>
            </div>
            {searchError && (
              <p className="text-[11px] text-amber-700 dark:text-amber-400 font-medium">
                {searchError}
              </p>
            )}
          </div>

          {/* DUPLICATE WARNING */}
          {duplicateWarning && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl flex items-start justify-between gap-3 animate-in fade-in">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-bold text-rose-900 dark:text-rose-200">
                    Restaurant déjà existant dans votre carnet !
                  </p>
                  <p className="text-[11px] text-rose-800 dark:text-rose-300 mt-0.5">
                    "{duplicateWarning.name}" ({duplicateWarning.address}) est déjà enregistré.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedRestaurant(duplicateWarning);
                  handleClose();
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-rose-600 text-white rounded-lg hover:bg-rose-700 shadow-xs shrink-0"
              >
                Voir la fiche
              </button>
            </div>
          )}

          {/* Core Info: Nom, Statut */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Nom de l'établissement *
              </label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Le Chateaubriand"
                className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Statut
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(['to_try', 'tested', 'favorite', 'to_avoid'] as RestaurantStatus[]).map((st) => {
                  const cfg = STATUS_LABELS[st];
                  const isSelected = status === st;
                  return (
                    <button
                      key={st}
                      type="button"
                      onClick={() => setStatus(st)}
                      className={`py-2 text-[11px] font-semibold rounded-lg border transition flex flex-col items-center justify-center gap-1 ${
                        isSelected
                          ? `${cfg.bg} ${cfg.color} ${cfg.border} ring-1 ring-current shadow-xs`
                          : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                      }`}
                    >
                      {st === 'favorite' ? (
                        <Heart className="w-3.5 h-3.5 fill-current" />
                      ) : st === 'tested' ? (
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      ) : st === 'to_try' ? (
                        <Compass className="w-3.5 h-3.5" />
                      ) : (
                        <Ban className="w-3.5 h-3.5" />
                      )}
                      <span>{cfg.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Adresse & Arrondissement */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Adresse complète à Paris *
              </label>
              <input
                type="text"
                required
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Ex: 129 Avenue Parmentier, 75011 Paris"
                className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Arrondissement
              </label>
              <select
                value={arrondissement}
                onChange={(e) => setArrondissement(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
              >
                {PARIS_ARRONDISSEMENTS.map((arr) => (
                  <option key={arr} value={arr}>
                    {arr}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Coordinates lat & lng (editable if needed) */}
          <div className="p-3 bg-zinc-50 dark:bg-zinc-900/60 rounded-xl border border-zinc-200/70 dark:border-zinc-800">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                <Navigation className="w-3.5 h-3.5 text-zinc-500" />
                Coordonnées GPS de l'épingle sur Paris
              </span>
              <button
                type="button"
                onClick={() => {
                  if (userLocation) {
                    setLat(userLocation.lat);
                    setLng(userLocation.lng);
                  } else {
                    locateUser();
                  }
                }}
                className="text-[11px] font-medium text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                title="Remplir avec ma position GPS actuelle"
              >
                <Crosshair className="w-3 h-3" />
                <span>{userLocation ? 'Utiliser ma position GPS' : 'Me géolocaliser'}</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Latitude</label>
                <input
                  type="number"
                  step="any"
                  value={lat}
                  onChange={(e) => setLat(parseFloat(e.target.value) || 48.8566)}
                  className="w-full text-xs p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200"
                />
              </div>
              <div>
                <label className="text-[10px] text-zinc-500 uppercase font-bold">Longitude</label>
                <input
                  type="number"
                  step="any"
                  value={lng}
                  onChange={(e) => setLng(parseFloat(e.target.value) || 2.3522)}
                  className="w-full text-xs p-1.5 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200"
                />
              </div>
            </div>
          </div>

          {/* Website officiel & Téléphone */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                  <Globe className="w-3.5 h-3.5 text-zinc-500" />
                  Site web officiel ou réservation
                </label>
                {website && (
                  <a
                    href={website.startsWith('http') ? website : `https://${website}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10.5px] font-medium text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                    title="Tester l'URL dans un nouvel onglet"
                  >
                    <span>Tester le lien</span>
                    <ExternalLink className="w-2.5 h-2.5" />
                  </a>
                )}
              </div>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://www.restaurant-exemple.fr"
                className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-zinc-500" />
                Numéro de téléphone
              </label>
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="Ex: 01 43 67 38 29"
                className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Cuisine & Budget */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Catégorie de cuisine
              </label>
              <select
                value={cuisine}
                onChange={(e) => setCuisine(e.target.value)}
                className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
              >
                {COMMON_CUISINES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Fourchette de prix
              </label>
              <div className="flex gap-1.5">
                {(['€', '€€', '€€€', '€€€€'] as PriceRange[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPriceRange(p)}
                    className={`flex-1 py-2 text-xs font-bold rounded-lg border transition ${
                      priceRange === p
                        ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900 shadow-xs'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Mon Carnet Personnel: Note & Avis */}
          <div className="p-4 bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-xl space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                Mon Carnet Personnel (Avis & Notes)
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/50 px-2 py-0.5 rounded-full font-medium">
                Privé
              </span>
            </div>

            {/* Note sur 5 */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Note personnelle sur 5 étoiles
                </span>
                <span className="text-xs font-bold text-amber-600">
                  {personalRating > 0 ? `${personalRating} / 5` : 'Pas encore noté'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setPersonalRating(star)}
                    className="p-1 hover:scale-125 transition"
                  >
                    <Star
                      className={`w-5 h-5 ${
                        star <= personalRating
                          ? 'text-amber-400 fill-amber-400'
                          : 'text-zinc-300 dark:text-zinc-700'
                      }`}
                    />
                  </button>
                ))}
              </div>
            </div>

            {/* Avis personnel rédigé */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Mon avis personnel
              </label>
              <textarea
                value={personalReview}
                onChange={(e) => setPersonalReview(e.target.value)}
                placeholder="Racontez vos impressions personnelles, le repas, l’accueil..."
                rows={2}
                className="w-full p-2.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>

            {/* Annotations */}
            <div>
              <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                Annotations & conseils de visite
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Ex: Réserver la table 4, fermer le lundi, super carte des vins..."
                className="w-full p-2 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-xl text-zinc-900 dark:text-zinc-100"
              />
            </div>
          </div>

          {/* Plats à tester ou préférés */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Plats à essayer ou plats préférés
            </label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {mustTryDishes.map((dish, i) => (
                <span
                  key={i}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-medium"
                >
                  <span>🍽️ {dish}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveDish(i)}
                    className="text-zinc-400 hover:text-rose-500"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDishInput}
                onChange={(e) => setNewDishInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddDish(e))}
                placeholder="Ajouter un plat (ex: Cacio e pepe, Profiterole...)"
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
              />
              <button
                type="button"
                onClick={handleAddDish}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-zinc-800 dark:text-zinc-200 rounded-xl text-xs font-medium"
              >
                + Ajouter
              </button>
            </div>
          </div>

          {/* Photos */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Photos du restaurant / des plats
            </label>
            {photos.length > 0 && (
              <div className="flex gap-2 mb-2 overflow-x-auto py-1">
                {photos.map((p, idx) => (
                  <div key={idx} className="w-16 h-14 rounded-lg overflow-hidden relative shrink-0 border border-zinc-200">
                    <img src={p} alt="" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => setPhotos((prev) => prev.filter((_, i) => i !== idx))}
                      className="absolute top-0.5 right-0.5 p-0.5 bg-black/70 text-white rounded-full"
                    >
                      <X className="w-2.5 h-2.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="flex gap-2">
              <input
                type="url"
                value={photoInput}
                onChange={(e) => setPhotoInput(e.target.value)}
                placeholder="URL d'une photo (https://...)"
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
              />
              <button
                type="button"
                onClick={handleAddPhoto}
                className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-xs font-medium rounded-xl"
              >
                + URL
              </button>
              <label className="px-3 py-1.5 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 text-xs font-medium rounded-xl flex items-center gap-1 cursor-pointer">
                <Camera className="w-3.5 h-3.5" />
                <span>Fichier</span>
                <input type="file" accept="image/*" onChange={handlePhotoFileUpload} className="hidden" />
              </label>
            </div>
          </div>

          {/* Collections */}
          <div>
            <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1.5">
              Associer à mes collections
            </label>
            <div className="flex flex-wrap gap-1.5">
              {collections.map((col) => {
                const isSelected = selectedCollections.includes(col.id);
                return (
                  <button
                    key={col.id}
                    type="button"
                    onClick={() => handleToggleCollection(col.id)}
                    className={`px-2.5 py-1 text-xs rounded-lg font-medium border transition flex items-center gap-1.5 ${
                      isSelected
                        ? 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 shadow-xs'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-50'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.color || '#e11d48' }} />
                    <span>{col.name}</span>
                    {isSelected && <Check className="w-3 h-3 text-rose-600" />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Form Validation Error Banner */}
          {formError && (
            <div className="p-3 bg-rose-50 dark:bg-rose-950/40 border border-rose-300 dark:border-rose-800 rounded-xl flex items-center gap-2 text-xs font-semibold text-rose-700 dark:text-rose-300 animate-in fade-in">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Footer Submit */}
          <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={handleClose}
              className="px-4 py-2.5 text-xs font-semibold text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-xl"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-6 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 text-xs font-bold rounded-xl shadow-md transition flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer sur la carte</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
