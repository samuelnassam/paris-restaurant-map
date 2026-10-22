import React, { useState, useEffect } from 'react';
import { useRestaurants } from '../../context/RestaurantContext';
import { Restaurant, STATUS_LABELS, COMMON_CUISINES, PARIS_ARRONDISSEMENTS, PriceRange, RestaurantStatus } from '../../types/restaurant';
import {
  X,
  Star,
  MapPin,
  Calendar,
  Navigation,
  Globe,
  Phone,
  Trash2,
  Edit3,
  Check,
  Plus,
  Image as ImageIcon,
  Heart,
  Compass,
  CheckCircle2,
  Ban,
  Tag,
  Share2,
  ShieldAlert,
  Camera,
  Sparkles,
  Loader2,
  Maximize2,
  ChevronLeft,
  ChevronRight,
  Eye,
  UtensilsCrossed
} from 'lucide-react';

const FALLBACK_PARIS_PHOTO = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=1200&q=80';

export const RestaurantDetailModal: React.FC = () => {
  const {
    selectedRestaurant,
    setSelectedRestaurant,
    updateRestaurant,
    deleteRestaurant,
    collections,
  } = useRestaurants();

  const [isEditing, setIsEditing] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  // Edit form state
  const [editForm, setEditForm] = useState<Partial<Restaurant>>({});
  const [newDishInput, setNewDishInput] = useState('');
  const [newPhotoInput, setNewPhotoInput] = useState('');
  const [showAddPhoto, setShowAddPhoto] = useState(false);
  const [copiedShare, setCopiedShare] = useState(false);

  const handleShare = async () => {
    if (!selectedRestaurant) return;
    const dishes = selectedRestaurant.mustTryDishes?.length
      ? `\nPlats recommandés: ${selectedRestaurant.mustTryDishes.join(', ')}`
      : '';
    const note = selectedRestaurant.personalRating
      ? `\nMa note: ${selectedRestaurant.personalRating}/5 ★`
      : '';
    const text = `🍽️ ${selectedRestaurant.name} (${selectedRestaurant.cuisine})\n📍 ${selectedRestaurant.address} (${selectedRestaurant.arrondissement})${dishes}${note}\nItinéraire: https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(selectedRestaurant.name + ' ' + selectedRestaurant.address)}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: selectedRestaurant.name,
          text,
        });
        return;
      } catch {
        // Fallback to clipboard
      }
    }

    try {
      await navigator.clipboard.writeText(text);
      setCopiedShare(true);
      setTimeout(() => setCopiedShare(false), 2200);
    } catch (e) {
      console.warn('Share copy failed', e);
    }
  };

  // Reset form and active index when selected restaurant changes
  useEffect(() => {
    if (selectedRestaurant) {
      setEditForm(selectedRestaurant);
      setActivePhotoIndex(0);
      setIsEditing(false);
      setShowDeleteConfirm(false);
      setLightboxIndex(null);
    }
  }, [selectedRestaurant?.id]);

  // Keyboard navigation for Lightbox
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (lightboxIndex === null || !selectedRestaurant?.photos || selectedRestaurant.photos.length === 0) return;
      if (e.key === 'Escape') {
        setLightboxIndex(null);
      } else if (e.key === 'ArrowLeft') {
        setLightboxIndex((prev) => (prev! > 0 ? prev! - 1 : selectedRestaurant.photos.length - 1));
      } else if (e.key === 'ArrowRight') {
        setLightboxIndex((prev) => (prev! < selectedRestaurant.photos.length - 1 ? prev! + 1 : 0));
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lightboxIndex, selectedRestaurant?.photos]);

  const handleSetCoverPhoto = async (photoUrl: string) => {
    if (!selectedRestaurant || !selectedRestaurant.photos) return;
    const current = selectedRestaurant.photos;
    const reordered = [photoUrl, ...current.filter((p) => p !== photoUrl)];
    await updateRestaurant(selectedRestaurant.id, { photos: reordered });
    setActivePhotoIndex(0);
  };

  const handleRemovePhoto = async (photoIndex: number) => {
    if (!selectedRestaurant || !selectedRestaurant.photos) return;
    const updated = selectedRestaurant.photos.filter((_, idx) => idx !== photoIndex);
    await updateRestaurant(selectedRestaurant.id, { photos: updated });
    setActivePhotoIndex(0);
  };

  if (!selectedRestaurant) return null;

  const statusConfig = STATUS_LABELS[selectedRestaurant.status];

  const handleStatusChange = async (newStatus: RestaurantStatus) => {
    await updateRestaurant(selectedRestaurant.id, { status: newStatus });
  };

  const handleRatingChange = async (rating: number) => {
    await updateRestaurant(selectedRestaurant.id, { personalRating: rating });
  };

  const handleAddDish = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDishInput.trim()) return;
    const updated = [...(selectedRestaurant.mustTryDishes || []), newDishInput.trim()];
    await updateRestaurant(selectedRestaurant.id, { mustTryDishes: updated });
    setNewDishInput('');
  };

  const handleRemoveDish = async (indexToRemove: number) => {
    const updated = selectedRestaurant.mustTryDishes.filter((_, i) => i !== indexToRemove);
    await updateRestaurant(selectedRestaurant.id, { mustTryDishes: updated });
  };

  const handleAddPhotoUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPhotoInput.trim()) return;
    const updated = [...(selectedRestaurant.photos || []), newPhotoInput.trim()];
    await updateRestaurant(selectedRestaurant.id, { photos: updated });
    setNewPhotoInput('');
    setShowAddPhoto(false);
  };

  const handlePhotoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    const file = files[0];
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const updated = [...(selectedRestaurant.photos || []), reader.result];
        await updateRestaurant(selectedRestaurant.id, { photos: updated });
        setShowAddPhoto(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleToggleCollection = async (collectionId: string) => {
    const current = selectedRestaurant.collections || [];
    const updated = current.includes(collectionId)
      ? current.filter((id) => id !== collectionId)
      : [...current, collectionId];
    await updateRestaurant(selectedRestaurant.id, { collections: updated });
  };

  const handleSaveEdit = async () => {
    if (!editForm.name?.trim() || !editForm.address?.trim()) {
      alert('Le nom et l’adresse sont obligatoires.');
      return;
    }
    await updateRestaurant(selectedRestaurant.id, editForm);
    setIsEditing(false);
  };

  const handleDelete = async () => {
    await deleteRestaurant(selectedRestaurant.id);
    setSelectedRestaurant(null);
  };

  const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${selectedRestaurant.lat},${selectedRestaurant.lng}`;

  return (
    <div className="fixed inset-y-0 right-0 z-40 w-full sm:w-[460px] md:w-[500px] bg-white dark:bg-zinc-950 shadow-2xl border-l border-zinc-200 dark:border-zinc-800 flex flex-col animate-in slide-in-from-right duration-300">
      {/* Top action header */}
      <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/40">
        <div className="flex items-center gap-2">
          {/* Status Quick Switcher */}
          <div className="flex items-center bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 p-0.5 rounded-lg shadow-xs">
            <button
              onClick={() => handleStatusChange('favorite')}
              className={`p-1.5 rounded-md transition ${
                selectedRestaurant.status === 'favorite'
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-rose-500'
              }`}
              title="Coup de cœur"
            >
              <Heart className="w-3.5 h-3.5 fill-current" />
            </button>
            <button
              onClick={() => handleStatusChange('tested')}
              className={`p-1.5 rounded-md transition ${
                selectedRestaurant.status === 'tested'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-emerald-600'
              }`}
              title="Déjà testé"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleStatusChange('to_try')}
              className={`p-1.5 rounded-md transition ${
                selectedRestaurant.status === 'to_try'
                  ? 'bg-amber-500 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-amber-500'
              }`}
              title="À tester"
            >
              <Compass className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleStatusChange('to_avoid')}
              className={`p-1.5 rounded-md transition ${
                selectedRestaurant.status === 'to_avoid'
                  ? 'bg-zinc-700 text-white shadow-xs'
                  : 'text-zinc-500 hover:text-zinc-700'
              }`}
              title="À éviter"
            >
              <Ban className="w-3.5 h-3.5" />
            </button>
          </div>

          <span className={`px-2 py-0.5 text-xs font-semibold rounded-md border ${statusConfig.bg} ${statusConfig.color} ${statusConfig.border}`}>
            {statusConfig.label}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsEditing(!isEditing)}
            className={`p-2 rounded-lg border text-xs font-medium flex items-center gap-1 transition ${
              isEditing
                ? 'bg-rose-50 text-rose-700 border-rose-300 dark:bg-rose-950/40'
                : 'text-zinc-600 dark:text-zinc-400 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
            title="Modifier la fiche"
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>{isEditing ? 'Annuler' : 'Modifier'}</span>
          </button>

          <button
            onClick={() => setShowDeleteConfirm(true)}
            className="p-2 text-zinc-400 hover:text-rose-600 hover:bg-rose-50 dark:hover:bg-rose-950/30 rounded-lg transition"
            title="Supprimer ce restaurant"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <button
            onClick={() => setSelectedRestaurant(null)}
            className="p-2 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
            title="Fermer la fiche"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Delete Confirmation Modal Overlay */}
      {showDeleteConfirm && (
        <div className="p-4 bg-rose-50 dark:bg-rose-950/40 border-b border-rose-200 dark:border-rose-900/60 flex items-center justify-between gap-3 animate-in fade-in duration-200">
          <div className="flex items-center gap-2 text-xs text-rose-900 dark:text-rose-200">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>Supprimer définitivement ce restaurant de votre carnet ?</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setShowDeleteConfirm(false)}
              className="px-2.5 py-1 text-xs text-zinc-600 dark:text-zinc-300 hover:underline"
            >
              Annuler
            </button>
            <button
              onClick={handleDelete}
              className="px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-md shadow-xs"
            >
              Supprimer
            </button>
          </div>
        </div>
      )}

      {/* Main Scrollable Body */}
      <div className="flex-1 overflow-y-auto">
        {/* Photo Gallery Header */}
        <div className="relative bg-zinc-900 aspect-video w-full overflow-hidden group">
          {selectedRestaurant.photos && selectedRestaurant.photos.length > 0 ? (
            <>
              <img
                src={selectedRestaurant.photos[activePhotoIndex] || selectedRestaurant.photos[0]}
                alt={selectedRestaurant.name}
                className="w-full h-full object-cover cursor-pointer transition duration-300 group-hover:scale-[1.02]"
                onClick={() => setLightboxIndex(activePhotoIndex)}
              />
              <button
                type="button"
                onClick={() => setLightboxIndex(activePhotoIndex)}
                className="absolute bottom-3 right-3 p-2 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-lg text-xs font-medium flex items-center gap-1 shadow-md transition"
                title="Agrandir en plein écran"
              >
                <Maximize2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Plein écran</span>
              </button>
            </>
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 bg-gradient-to-br from-zinc-800 via-zinc-900 to-zinc-950 text-center relative">
              <div className="w-12 h-12 rounded-2xl bg-zinc-700/50 border border-zinc-600/40 text-amber-400 flex items-center justify-center mb-2 shadow-inner">
                <UtensilsCrossed className="w-6 h-6 text-rose-400" />
              </div>
              <h3 className="font-serif text-lg font-bold text-white tracking-tight">
                {selectedRestaurant.name}
              </h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-sm">
                {selectedRestaurant.cuisine} • {selectedRestaurant.arrondissement}
              </p>
              <button
                type="button"
                onClick={() => setShowAddPhoto(true)}
                className="mt-3 px-3 py-1.5 bg-zinc-800/90 hover:bg-zinc-700 text-zinc-200 border border-zinc-600/50 rounded-xl text-xs font-medium flex items-center gap-1.5 transition shadow-sm"
              >
                <Camera className="w-3.5 h-3.5 text-rose-400" />
                <span>Ajouter ma photo</span>
              </button>
            </div>
          )}

          {/* Top Floating Button: Add Photo */}
          <div className="absolute top-3 right-3 flex items-center gap-2 pointer-events-none">
            <button
              type="button"
              onClick={() => setShowAddPhoto(!showAddPhoto)}
              className="pointer-events-auto px-2.5 py-1.5 bg-black/60 hover:bg-black/80 backdrop-blur-md text-white rounded-lg text-xs font-medium flex items-center gap-1.5 shadow-md transition"
              title="Ajouter une photo personnelle"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>+ Photo</span>
            </button>
          </div>

          {/* Photo carousel thumbnails strip if multiple photos */}
          {selectedRestaurant.photos && selectedRestaurant.photos.length > 1 && (
            <div className="absolute bottom-2 left-2 right-2 flex gap-1.5 overflow-x-auto no-scrollbar p-1 bg-black/50 backdrop-blur-md rounded-lg">
              {selectedRestaurant.photos.map((photo, idx) => (
                <button
                  key={idx}
                  onClick={() => setActivePhotoIndex(idx)}
                  className={`w-12 h-9 rounded-md overflow-hidden shrink-0 border-2 transition ${
                    activePhotoIndex === idx ? 'border-white scale-105 shadow-sm' : 'border-transparent opacity-60 hover:opacity-100'
                  }`}
                >
                  <img
                    src={photo}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Add photo popup */}
        {showAddPhoto && (
          <div className="p-4 bg-zinc-50 dark:bg-zinc-900 border-b border-zinc-200 dark:border-zinc-800 space-y-3">
            <h4 className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
              Ajouter une photo à ce restaurant
            </h4>
            <form onSubmit={handleAddPhotoUrl} className="flex gap-2">
              <input
                type="url"
                value={newPhotoInput}
                onChange={(e) => setNewPhotoInput(e.target.value)}
                placeholder="Coller l'URL d'une image (ex: https://...)"
                className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
              />
              <button
                type="submit"
                className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white text-xs font-medium rounded-lg"
              >
                Ajouter URL
              </button>
            </form>
            <div className="flex items-center gap-2">
              <label className="flex-1 flex items-center justify-center gap-2 px-3 py-1.5 bg-white dark:bg-zinc-800 border border-dashed border-zinc-300 dark:border-zinc-700 rounded-lg text-xs font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 cursor-pointer transition">
                <Camera className="w-3.5 h-3.5" />
                <span>Importer un fichier photo depuis votre appareil</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoFileUpload}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        )}

        {/* Content Body */}
        <div className="p-6 space-y-6">
          {/* Edit Form Mode */}
          {isEditing ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Nom du restaurant *
                </label>
                <input
                  type="text"
                  value={editForm.name || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full text-sm p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                  Adresse complète à Paris *
                </label>
                <input
                  type="text"
                  value={editForm.address || ''}
                  onChange={(e) => setEditForm((prev) => ({ ...prev, address: e.target.value }))}
                  className="w-full text-sm p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Arrondissement
                  </label>
                  <select
                    value={editForm.arrondissement || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, arrondissement: e.target.value }))}
                    className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
                  >
                    {PARIS_ARRONDISSEMENTS.map((arr) => (
                      <option key={arr} value={arr}>
                        {arr}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Type de cuisine
                  </label>
                  <input
                    type="text"
                    value={editForm.cuisine || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, cuisine: e.target.value }))}
                    placeholder="Ex: Bistronomie française, Italien..."
                    className="w-full text-xs p-2.5 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Fourchette de prix
                  </label>
                  <div className="flex gap-1">
                    {(['€', '€€', '€€€', '€€€€'] as PriceRange[]).map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setEditForm((prev) => ({ ...prev, priceRange: p }))}
                        className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border ${
                          editForm.priceRange === p
                            ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900'
                            : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        {p}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Date de visite
                  </label>
                  <input
                    type="date"
                    value={editForm.visitedAt || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, visitedAt: e.target.value }))}
                    className="w-full text-xs p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Site web
                  </label>
                  <input
                    type="url"
                    value={editForm.website || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, website: e.target.value }))}
                    placeholder="https://..."
                    className="w-full text-xs p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Téléphone
                  </label>
                  <input
                    type="tel"
                    value={editForm.phone || ''}
                    onChange={(e) => setEditForm((prev) => ({ ...prev, phone: e.target.value }))}
                    placeholder="+33 1 ..."
                    className="w-full text-xs p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={handleSaveEdit}
                  className="flex-1 py-2.5 bg-zinc-900 hover:bg-zinc-800 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-md"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer les modifications</span>
                </button>
              </div>
            </div>
          ) : (
            /* View Mode */
            <>
              {/* Title & Coordinates */}
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h1 className="font-serif text-2xl font-bold text-zinc-900 dark:text-zinc-50 tracking-tight">
                    {selectedRestaurant.name}
                  </h1>
                  <span className="text-base font-bold text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-lg shrink-0">
                    {selectedRestaurant.priceRange}
                  </span>
                </div>

                <p className="text-xs font-medium text-rose-600 dark:text-rose-400 mt-1">
                  {selectedRestaurant.cuisine}
                </p>

                <div className="flex items-start gap-1.5 mt-2 text-xs text-zinc-500 dark:text-zinc-400">
                  <MapPin className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
                  <span>{selectedRestaurant.address}</span>
                </div>
              </div>

              {/* Action Buttons: Itinéraire, Site web, Appel */}
              <div className="flex items-center gap-2 pt-1">
                <a
                  href={directionsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 py-2 px-3 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 shadow-sm transition"
                >
                  <Navigation className="w-3.5 h-3.5" />
                  <span>Itinéraire</span>
                </a>

                {selectedRestaurant.website && (
                  <a
                    href={selectedRestaurant.website}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl transition"
                    title="Visiter le site web"
                  >
                    <Globe className="w-4 h-4" />
                  </a>
                )}

                {selectedRestaurant.phone && (
                  <a
                    href={`tel:${selectedRestaurant.phone}`}
                    className="p-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200 rounded-xl transition"
                    title={`Appeler (${selectedRestaurant.phone})`}
                  >
                    <Phone className="w-4 h-4" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={handleShare}
                  className={`p-2 rounded-xl transition flex items-center gap-1 ${
                    copiedShare
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200'
                  }`}
                  title={copiedShare ? 'Recommandation copiée !' : 'Partager ce restaurant'}
                >
                  {copiedShare ? <Check className="w-4 h-4" /> : <Share2 className="w-4 h-4" />}
                </button>
              </div>

              {/* PERSONAL LOG SECTION (Strictly Personal, clearly labeled) */}
              <div className="bg-amber-50/60 dark:bg-amber-950/20 border border-amber-200/80 dark:border-amber-900/40 rounded-2xl p-4 space-y-4">
                <div className="flex items-center justify-between border-b border-amber-200/50 dark:border-amber-900/40 pb-2">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 dark:text-amber-300 flex items-center gap-1.5">
                    <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                    Mon Carnet Personnel
                  </span>
                  <span className="text-[10px] text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-900/50 px-2 py-0.5 rounded-full font-medium">
                    Avis privé
                  </span>
                </div>

                {/* Rating Input */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-xs font-semibold text-zinc-800 dark:text-zinc-200">
                      Ma note personnelle
                    </span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {selectedRestaurant.personalRating > 0
                        ? `${selectedRestaurant.personalRating} / 5 étoiles`
                        : 'Non noté'}
                    </span>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        onClick={() => handleRatingChange(star)}
                        className="p-1 hover:scale-125 transition duration-150 focus:outline-none"
                        title={`Noter ${star}/5`}
                      >
                        <Star
                          className={`w-6 h-6 ${
                            star <= selectedRestaurant.personalRating
                              ? 'text-amber-400 fill-amber-400 drop-shadow-xs'
                              : 'text-zinc-300 dark:text-zinc-700'
                          }`}
                        />
                      </button>
                    ))}
                    {selectedRestaurant.personalRating > 0 && (
                      <button
                        onClick={() => handleRatingChange(0)}
                        className="text-[10px] text-zinc-400 hover:text-zinc-600 ml-2"
                        title="Effacer la note"
                      >
                        Effacer
                      </button>
                    )}
                  </div>
                </div>

                {/* Visit Date */}
                <div>
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-zinc-800 dark:text-zinc-200 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-zinc-500" />
                      Date de visite
                    </span>
                    <input
                      type="date"
                      value={selectedRestaurant.visitedAt || ''}
                      onChange={(e) => updateRestaurant(selectedRestaurant.id, { visitedAt: e.target.value })}
                      className="text-xs py-1 px-2 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg text-zinc-800 dark:text-zinc-200"
                    />
                  </div>
                </div>

                {/* Free Personal Review */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    Mon avis personnel rédigé librement
                  </label>
                  <textarea
                    defaultValue={selectedRestaurant.personalReview || ''}
                    onBlur={(e) => {
                      if (e.target.value !== selectedRestaurant.personalReview) {
                        updateRestaurant(selectedRestaurant.id, { personalReview: e.target.value });
                      }
                    }}
                    placeholder="Écrivez librement vos impressions, les saveurs, le service, le cadre..."
                    rows={3}
                    className="w-full p-2.5 text-xs bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed"
                  />
                </div>

                {/* Annotations & Tips */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-800 dark:text-zinc-200 mb-1.5">
                    Annotations & conseils de visite
                  </label>
                  <textarea
                    defaultValue={selectedRestaurant.notes || ''}
                    onBlur={(e) => {
                      if (e.target.value !== selectedRestaurant.notes) {
                        updateRestaurant(selectedRestaurant.id, { notes: e.target.value });
                      }
                    }}
                    placeholder="Ex: Réserver la table 12 côté cour, demander le menu dégustation, arriver à 19h sans résa..."
                    rows={2}
                    className="w-full p-2.5 text-xs bg-white dark:bg-zinc-800/90 border border-zinc-200 dark:border-zinc-700/80 rounded-xl text-zinc-800 dark:text-zinc-200 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 leading-relaxed"
                  />
                </div>
              </div>

              {/* MUST-TRY & FAVORITE DISHES */}
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-rose-500" />
                    Plats à tester ou préférés
                  </h3>
                  <span className="text-[11px] text-zinc-400">
                    {selectedRestaurant.mustTryDishes?.length || 0} plat(s)
                  </span>
                </div>

                <div className="flex flex-wrap gap-1.5">
                  {selectedRestaurant.mustTryDishes && selectedRestaurant.mustTryDishes.map((dish, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-100 dark:bg-zinc-800 text-zinc-800 dark:text-zinc-200 rounded-lg text-xs font-medium"
                    >
                      <span>🍽️ {dish}</span>
                      <button
                        onClick={() => handleRemoveDish(idx)}
                        className="text-zinc-400 hover:text-rose-500 transition ml-0.5"
                        title="Retirer ce plat"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>

                {/* Add dish inline form */}
                <form onSubmit={handleAddDish} className="flex gap-1.5 mt-2">
                  <input
                    type="text"
                    value={newDishInput}
                    onChange={(e) => setNewDishInput(e.target.value)}
                    placeholder="Ajouter un plat (ex: Tartelette champignons, Carpaccio...)"
                    className="flex-1 px-3 py-1.5 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
                  />
                  <button
                    type="submit"
                    className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white rounded-xl text-xs font-medium flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Ajouter</span>
                  </button>
                </form>
              </div>

              {/* PHOTOS GALLERY */}
              <div className="space-y-3 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300 flex items-center gap-1.5">
                      <Camera className="w-3.5 h-3.5 text-rose-500" />
                      <span>Photos du restaurant ({selectedRestaurant.photos?.length || 0})</span>
                    </h3>
                    <p className="text-[11px] text-zinc-400 mt-0.5">
                      Vos photos de plats, de la salle et de la carte
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setShowAddPhoto(!showAddPhoto)}
                    className="px-2.5 py-1 text-xs font-medium text-rose-600 bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 rounded-lg transition flex items-center gap-1 shrink-0"
                    title="Ajouter une photo"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Ajouter</span>
                  </button>
                </div>

                {selectedRestaurant.photos && selectedRestaurant.photos.length > 0 ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    {selectedRestaurant.photos.map((photo, idx) => (
                      <div
                        key={idx}
                        className="group relative rounded-xl overflow-hidden aspect-4/3 bg-zinc-900 border border-zinc-200 dark:border-zinc-800 shadow-xs cursor-pointer"
                        onClick={() => setLightboxIndex(idx)}
                      >
                        <img
                          src={photo}
                          alt={`${selectedRestaurant.name} photo ${idx + 1}`}
                          className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                        />

                        {/* Top tag */}
                        <div className="absolute top-1.5 left-1.5 pointer-events-none">
                          {idx === 0 ? (
                            <span className="px-1.5 py-0.5 text-[9px] font-bold rounded-md bg-rose-600 text-white shadow-xs">
                              Couverture
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[9px] font-medium rounded-md bg-black/60 backdrop-blur-xs text-white opacity-0 group-hover:opacity-100 transition">
                              Photo #{idx + 1}
                            </span>
                          )}
                        </div>

                        {/* Hover Overlay with actions */}
                        <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center gap-1.5 p-2">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              setLightboxIndex(idx);
                            }}
                            className="p-1.5 bg-white/90 hover:bg-white text-zinc-900 rounded-lg shadow-sm transition"
                            title="Agrandir en plein écran"
                          >
                            <Maximize2 className="w-3.5 h-3.5" />
                          </button>

                          {idx !== 0 && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSetCoverPhoto(photo);
                              }}
                              className="p-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg shadow-sm transition text-[10px] font-medium flex items-center gap-1"
                              title="Définir comme photo principale"
                            >
                              <Star className="w-3.5 h-3.5" />
                              <span className="hidden sm:inline">Couverture</span>
                            </button>
                          )}

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemovePhoto(idx);
                            }}
                            className="p-1.5 bg-black/60 hover:bg-rose-600 text-white rounded-lg transition"
                            title="Retirer cette photo"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="p-4 rounded-xl border border-dashed border-zinc-200 dark:border-zinc-800 text-center">
                    <p className="text-xs text-zinc-500 mb-2">Aucune photo pour l'instant</p>
                    <button
                      type="button"
                      onClick={() => setShowAddPhoto(true)}
                      className="px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-lg text-xs font-medium inline-flex items-center gap-1.5 transition"
                    >
                      <Camera className="w-3.5 h-3.5 text-rose-500" />
                      <span>Ajouter une photo (URL ou fichier)</span>
                    </button>
                  </div>
                )}
              </div>

              {/* COLLECTIONS ASSIGNMENT */}
              <div className="space-y-2.5 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-600 dark:text-zinc-400">
                  Mes Collections
                </h3>
                <div className="flex flex-wrap gap-1.5">
                  {collections.map((col) => {
                    const isAssigned = selectedRestaurant.collections?.includes(col.id);
                    return (
                      <button
                        key={col.id}
                        onClick={() => handleToggleCollection(col.id)}
                        className={`px-2.5 py-1 rounded-lg text-xs font-medium transition flex items-center gap-1.5 border ${
                          isAssigned
                            ? 'bg-rose-50 border-rose-300 text-rose-800 dark:bg-rose-950/40 dark:border-rose-800 dark:text-rose-200 shadow-xs'
                            : 'bg-zinc-50 dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100'
                        }`}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full"
                          style={{ backgroundColor: col.color || '#e11d48' }}
                        />
                        <span>{col.name}</span>
                        {isAssigned && <Check className="w-3 h-3 text-rose-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>
            </>
          )}
        </div>
      </div>

      {/* FULL-SCREEN LIGHTBOX OVERLAY */}
      {lightboxIndex !== null && selectedRestaurant.photos && selectedRestaurant.photos.length > 0 && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex flex-col items-center justify-between p-4 sm:p-6 backdrop-blur-md animate-in fade-in duration-200"
          onClick={() => setLightboxIndex(null)}
        >
          {/* Top Bar */}
          <div
            className="w-full flex items-center justify-between text-white pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div>
              <h3 className="text-sm font-semibold tracking-wide text-zinc-100">
                {selectedRestaurant.name}
              </h3>
              <p className="text-xs text-zinc-400">
                Photo {lightboxIndex + 1} sur {selectedRestaurant.photos.length}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => handleSetCoverPhoto(selectedRestaurant.photos[lightboxIndex])}
                className="px-2.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium rounded-lg transition flex items-center gap-1"
                title="Définir cette photo comme couverture"
              >
                <Star className="w-3.5 h-3.5 text-amber-400" />
                <span className="hidden sm:inline">Photo principale</span>
              </button>

              <button
                type="button"
                onClick={() => setLightboxIndex(null)}
                className="p-2 bg-zinc-800/80 hover:bg-zinc-750 text-white rounded-lg transition"
                title="Fermer (Echap)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          {/* Central Image with Navigation */}
          <div
            className="relative flex-1 w-full max-w-5xl flex items-center justify-center p-2 sm:p-4 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Prev button */}
            {selectedRestaurant.photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev! > 0 ? prev! - 1 : selectedRestaurant.photos.length - 1
                  )
                }
                className="absolute left-2 sm:left-4 z-10 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition backdrop-blur-md shadow-lg"
                title="Photo précédente (←)"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
            )}

            {/* High-res image */}
            <img
              src={selectedRestaurant.photos[lightboxIndex]}
              alt={selectedRestaurant.name}
              className="max-h-[75vh] max-w-full object-contain rounded-xl shadow-2xl transition duration-300"
              onError={(e) => {
                (e.target as HTMLImageElement).src = FALLBACK_PARIS_PHOTO;
              }}
            />

            {/* Next button */}
            {selectedRestaurant.photos.length > 1 && (
              <button
                type="button"
                onClick={() =>
                  setLightboxIndex((prev) =>
                    prev! < selectedRestaurant.photos.length - 1 ? prev! + 1 : 0
                  )
                }
                className="absolute right-2 sm:right-4 z-10 p-2.5 bg-black/60 hover:bg-black/90 text-white rounded-full transition backdrop-blur-md shadow-lg"
                title="Photo suivante (→)"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            )}
          </div>

          {/* Bottom Thumbnails Strip */}
          <div
            className="w-full max-w-2xl flex justify-center gap-2 overflow-x-auto no-scrollbar p-2 pointer-events-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {selectedRestaurant.photos.map((photo, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setLightboxIndex(idx)}
                className={`w-14 h-10 rounded-lg overflow-hidden shrink-0 border-2 transition ${
                  lightboxIndex === idx ? 'border-rose-500 scale-105 shadow-md' : 'border-transparent opacity-50 hover:opacity-100'
                }`}
              >
                <img
                  src={photo}
                  alt=""
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = FALLBACK_PARIS_PHOTO;
                  }}
                />
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
