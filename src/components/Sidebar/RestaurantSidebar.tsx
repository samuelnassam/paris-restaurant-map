import React, { useState } from 'react';
import { useRestaurants, formatDistance } from '../../context/RestaurantContext';
import { STATUS_LABELS, COMMON_CUISINES, PARIS_ARRONDISSEMENTS, PriceRange, RestaurantStatus } from '../../types/restaurant';
import {
  Search,
  SlidersHorizontal,
  X,
  Plus,
  Star,
  Sparkles,
  MapPin,
  Utensils,
  FolderHeart,
  ChevronDown,
  Trash2,
  LogIn,
  LogOut,
  Compass,
  Heart,
  CheckCircle2,
  RotateCcw,
  Moon,
  Sun,
  Crosshair,
  Loader2,
  Download,
  Globe,
  Navigation,
  ExternalLink,
  HelpCircle,
  FileCode
} from 'lucide-react';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenWelcome?: () => void;
}

export const RestaurantSidebar: React.FC<SidebarProps> = ({ isOpen, onClose, onOpenWelcome }) => {
  const {
    filteredRestaurants,
    restaurants,
    collections,
    filters,
    setFilters,
    resetFilters,
    selectedRestaurant,
    setSelectedRestaurant,
    setIsAddModalOpen,
    setIsConciergeOpen,
    user,
    loginWithGoogle,
    logout,
    clearDemoRestaurants,
    restoreDemoRestaurants,
    addCollection,
    isDarkMode,
    toggleDarkMode,
    userLocation,
    isLocating,
    locateUser,
    getDistanceToRestaurant,
  } = useRestaurants();

  const [isFilterExpanded, setIsFilterExpanded] = useState(false);
  const [newCollectionName, setNewCollectionName] = useState('');
  const [showAddCollection, setShowAddCollection] = useState(false);

  const hasDemo = restaurants.some((r) => r.isDemo);

  const handleStatusClick = (status: RestaurantStatus | 'all') => {
    setFilters((prev) => ({
      ...prev,
      status: prev.status === status ? 'all' : status,
    }));
  };

  const handleCollectionClick = (colId: string | 'all') => {
    setFilters((prev) => ({
      ...prev,
      collectionId: prev.collectionId === colId ? 'all' : colId,
    }));
  };

  const handleCreateCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCollectionName.trim()) return;
    await addCollection(newCollectionName.trim(), '#e11d48', 'Sparkles');
    setNewCollectionName('');
    setShowAddCollection(false);
  };

  const handleExportCarnet = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      appName: 'Paris Restaurant Map',
      version: '2.0',
      totalRestaurants: restaurants.length,
      restaurants,
      collections,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `paris-restaurants-carnet-${new Date().toISOString().slice(0, 10)}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleDownloadCodeZip = () => {
    window.location.href = '/api/download-project-zip';
  };

  const activeFiltersCount =
    (filters.searchQuery ? 1 : 0) +
    (filters.status !== 'all' ? 1 : 0) +
    (filters.cuisine !== 'all' ? 1 : 0) +
    (filters.arrondissement !== 'all' ? 1 : 0) +
    (filters.priceRange !== 'all' ? 1 : 0) +
    (filters.minRating > 0 ? 1 : 0) +
    (filters.collectionId !== 'all' ? 1 : 0);

  return (
    <aside
      className={`
        fixed inset-y-0 left-0 z-30 w-full sm:w-[420px] md:w-[460px] bg-white dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 flex flex-col transition-transform duration-300 ease-in-out shadow-2xl md:shadow-none md:relative md:translate-x-0
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}
    >
      {/* Top Header */}
      <div className="p-4 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/50 dark:bg-zinc-900/30">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md shadow-rose-500/20">
              <Utensils className="w-4 h-4" />
            </div>
            <div>
              <h1 className="font-serif text-lg font-bold text-zinc-900 dark:text-zinc-50 tracking-tight leading-none">
                Paris Restaurant Map
              </h1>
              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                Mon carnet gastronomique à Paris
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {user ? (
              <div className="flex items-center gap-2">
                {user.photoURL ? (
                  <img
                    src={user.photoURL}
                    alt={user.displayName || 'Profil'}
                    className="w-7 h-7 rounded-full ring-1 ring-zinc-300 dark:ring-zinc-700"
                  />
                ) : (
                  <div className="w-7 h-7 rounded-full bg-zinc-800 text-white text-xs flex items-center justify-center font-bold">
                    {user.email?.charAt(0).toUpperCase()}
                  </div>
                )}
                <button
                  onClick={logout}
                  className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
                  title="Se déconnecter"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={loginWithGoogle}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 dark:text-zinc-200 hover:text-zinc-900 bg-white dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700 rounded-lg shadow-xs hover:bg-zinc-50 transition"
                title="Synchroniser avec Google"
              >
                <LogIn className="w-3.5 h-3.5 text-rose-500" />
                <span className="hidden xs:inline">Connexion</span>
              </button>
            )}

            {/* Guide & Presentation Modal */}
            {onOpenWelcome && (
              <button
                onClick={onOpenWelcome}
                className="p-1.5 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
                title="Présentation & Guide de l'application"
              >
                <HelpCircle className="w-4 h-4" />
              </button>
            )}

            {/* Download Code ZIP for GitHub button */}
            <button
              onClick={handleDownloadCodeZip}
              className="p-1.5 text-zinc-500 hover:text-emerald-600 dark:text-zinc-400 dark:hover:text-emerald-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
              title="Télécharger tout le code du projet (ZIP pour GitHub)"
            >
              <FileCode className="w-4 h-4" />
            </button>

            {/* Export Carnet JSON button */}
            <button
              onClick={handleExportCarnet}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
              title="Exporter / Sauvegarder mon carnet (JSON)"
            >
              <Download className="w-4 h-4" />
            </button>

            {/* Night / Day Mode Toggle */}
            <button
              onClick={toggleDarkMode}
              className="p-1.5 text-zinc-500 hover:text-zinc-800 dark:text-zinc-400 dark:hover:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition"
              title={isDarkMode ? 'Passer en mode jour' : 'Passer en mode nuit'}
            >
              {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4" />}
            </button>

            {/* Close button for mobile */}
            <button
              onClick={onClose}
              className="md:hidden p-1.5 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 rounded-lg"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Demo banner if demo data active */}
        {hasDemo && (
          <div className="flex items-center justify-between px-2.5 py-1.5 bg-amber-50/80 dark:bg-amber-950/30 border border-amber-200/80 dark:border-amber-900/40 rounded-lg text-xs text-amber-900 dark:text-amber-300 mb-2">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-500 animate-pulse" />
              Adresses de démonstration actives
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={clearDemoRestaurants}
                className="text-[11px] font-semibold text-amber-800 dark:text-amber-300 hover:underline flex items-center gap-1"
                title="Supprimer les restaurants de démo"
              >
                <Trash2 className="w-3 h-3" />
                Vider
              </button>
            </div>
          </div>
        )}

        {/* Search Bar with Geolocation Quick Button */}
        <div className="flex items-center gap-1.5">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-zinc-400" />
            <input
              type="text"
              value={filters.searchQuery}
              onChange={(e) => setFilters((prev) => ({ ...prev, searchQuery: e.target.value }))}
              placeholder="Rechercher par nom, rue, cuisine, plat..."
              className="w-full pl-9 pr-8 py-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition shadow-xs"
            />
            {filters.searchQuery && (
              <button
                onClick={() => setFilters((prev) => ({ ...prev, searchQuery: '' }))}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          <button
            onClick={locateUser}
            disabled={isLocating}
            className={`p-2.5 rounded-xl border transition flex items-center justify-center shrink-0 ${
              userLocation
                ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800 shadow-xs'
                : 'bg-white dark:bg-zinc-900 text-zinc-500 hover:text-blue-600 border-zinc-200 dark:border-zinc-800 hover:bg-zinc-50 dark:hover:bg-zinc-800'
            }`}
            title={userLocation ? 'Position active (cliquer pour actualiser)' : 'Me géolocaliser à Paris'}
          >
            {isLocating ? (
              <Loader2 className="w-4 h-4 animate-spin text-blue-500" />
            ) : (
              <Crosshair className={`w-4 h-4 ${userLocation ? 'text-blue-600 dark:text-blue-400' : ''}`} />
            )}
          </button>
        </div>
      </div>

      {/* Quick Status Bar & Filter Toggle */}
      <div className="px-4 py-2.5 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-2 overflow-x-auto no-scrollbar">
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => handleStatusClick('all')}
            className={`px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
              filters.status === 'all'
                ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 shadow-xs'
                : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
            }`}
          >
            Tous ({restaurants.length})
          </button>
          <button
            onClick={() => handleStatusClick('favorite')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
              filters.status === 'favorite'
                ? 'bg-rose-600 text-white shadow-xs'
                : 'text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40'
            }`}
          >
            <Heart className="w-3 h-3 fill-current" />
            <span>Coups de cœur</span>
          </button>
          <button
            onClick={() => handleStatusClick('to_try')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
              filters.status === 'to_try'
                ? 'bg-amber-600 text-white shadow-xs'
                : 'text-amber-700 dark:text-amber-400 hover:bg-amber-50 dark:hover:bg-amber-950/40'
            }`}
          >
            <Compass className="w-3 h-3" />
            <span>À tester</span>
          </button>
          <button
            onClick={() => handleStatusClick('tested')}
            className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-lg transition whitespace-nowrap ${
              filters.status === 'tested'
                ? 'bg-emerald-600 text-white shadow-xs'
                : 'text-emerald-700 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/40'
            }`}
          >
            <CheckCircle2 className="w-3 h-3" />
            <span>Testés</span>
          </button>
        </div>

        <button
          onClick={() => setIsFilterExpanded(!isFilterExpanded)}
          className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition ${
            activeFiltersCount > 0
              ? 'border-rose-400 bg-rose-50 dark:bg-rose-950/40 text-rose-700 dark:text-rose-300'
              : 'border-zinc-200 dark:border-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800'
          }`}
          title="Filtres avancés"
        >
          <SlidersHorizontal className="w-3.5 h-3.5" />
          {activeFiltersCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-600 text-white text-[10px] flex items-center justify-center font-bold">
              {activeFiltersCount}
            </span>
          )}
        </button>
      </div>

      {/* Expanded Filters Panel */}
      {isFilterExpanded && (
        <div className="p-4 bg-zinc-50/90 dark:bg-zinc-900/60 border-b border-zinc-200/80 dark:border-zinc-800 space-y-3 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
              Filtres détaillés
            </span>
            {activeFiltersCount > 0 && (
              <button
                onClick={resetFilters}
                className="text-xs text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1"
              >
                <RotateCcw className="w-3 h-3" />
                Réinitialiser les filtres
              </button>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {/* Arrondissement */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Arrondissement
              </label>
              <select
                value={filters.arrondissement}
                onChange={(e) => setFilters((prev) => ({ ...prev, arrondissement: e.target.value }))}
                className="w-full text-xs p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="all">Tous les arrondissements</option>
                {PARIS_ARRONDISSEMENTS.map((arr) => (
                  <option key={arr} value={arr}>
                    {arr}
                  </option>
                ))}
              </select>
            </div>

            {/* Cuisine */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Type de cuisine
              </label>
              <select
                value={filters.cuisine}
                onChange={(e) => setFilters((prev) => ({ ...prev, cuisine: e.target.value }))}
                className="w-full text-xs p-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-800 dark:text-zinc-200 focus:outline-none focus:ring-1 focus:ring-rose-500"
              >
                <option value="all">Toutes les cuisines</option>
                {COMMON_CUISINES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>

            {/* Budget */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Budget
              </label>
              <div className="flex gap-1">
                {(['all', '€', '€€', '€€€', '€€€€'] as const).map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilters((prev) => ({ ...prev, priceRange: p }))}
                    className={`flex-1 py-1 text-xs rounded-md font-medium border transition ${
                      filters.priceRange === p
                        ? 'bg-zinc-900 text-white border-zinc-900 dark:bg-white dark:text-zinc-900'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {p === 'all' ? 'Tous' : p}
                  </button>
                ))}
              </div>
            </div>

            {/* Note minimale */}
            <div>
              <label className="block text-[11px] font-medium text-zinc-600 dark:text-zinc-400 mb-1">
                Note perso minimale
              </label>
              <div className="flex items-center gap-1">
                {[0, 3, 4, 4.5].map((rating) => (
                  <button
                    key={rating}
                    onClick={() => setFilters((prev) => ({ ...prev, minRating: rating }))}
                    className={`flex-1 py-1 text-xs rounded-md font-medium border transition flex items-center justify-center gap-0.5 ${
                      filters.minRating === rating
                        ? 'bg-amber-500 text-white border-amber-500'
                        : 'bg-white dark:bg-zinc-900 border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    {rating === 0 ? 'Toutes' : `${rating}★`}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Collections Bar */}
      <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/80 bg-zinc-50/30 dark:bg-zinc-900/10">
        <div className="flex items-center justify-between mb-1.5">
          <span className="text-[11px] font-semibold text-zinc-500 uppercase tracking-wider flex items-center gap-1">
            <FolderHeart className="w-3 h-3 text-rose-500" />
            Mes Collections
          </span>
          <button
            onClick={() => setShowAddCollection(!showAddCollection)}
            className="text-[11px] text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-0.5"
          >
            <Plus className="w-3 h-3" />
            Nouvelle
          </button>
        </div>

        {/* Add Collection inline form */}
        {showAddCollection && (
          <form onSubmit={handleCreateCollection} className="flex gap-1.5 mb-2">
            <input
              type="text"
              value={newCollectionName}
              onChange={(e) => setNewCollectionName(e.target.value)}
              placeholder="Ex: Dimanche midi, À tester absolument..."
              className="flex-1 px-2.5 py-1 text-xs bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-1 focus:ring-rose-500"
            />
            <button
              type="submit"
              className="px-2.5 py-1 text-xs bg-zinc-900 hover:bg-zinc-800 text-white rounded-lg font-medium"
            >
              Créer
            </button>
          </form>
        )}

        <div className="flex gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          <button
            onClick={() => handleCollectionClick('all')}
            className={`px-2 py-1 text-[11px] rounded-lg font-medium whitespace-nowrap transition ${
              filters.collectionId === 'all'
                ? 'bg-zinc-800 text-white dark:bg-zinc-200 dark:text-zinc-900'
                : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200/70'
            }`}
          >
            Toutes
          </button>
          {collections.map((col) => (
            <button
              key={col.id}
              onClick={() => handleCollectionClick(col.id)}
              className={`px-2 py-1 text-[11px] rounded-lg font-medium whitespace-nowrap transition flex items-center gap-1 ${
                filters.collectionId === col.id
                  ? 'bg-rose-500 text-white shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-200/70'
              }`}
            >
              <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: col.color || '#e11d48' }}
              />
              <span>{col.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Sort & Count Header */}
      <div className="px-4 py-2 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between text-xs text-zinc-500">
        <span>
          <strong className="text-zinc-900 dark:text-zinc-100">{filteredRestaurants.length}</strong>{' '}
          restaurant{filteredRestaurants.length > 1 ? 's' : ''} affiché{filteredRestaurants.length > 1 ? 's' : ''}
        </span>

        <div className="flex items-center gap-1">
          <span>Tri :</span>
          <select
            value={filters.sortBy}
            onChange={(e) => setFilters((prev) => ({ ...prev, sortBy: e.target.value as any }))}
            className="bg-transparent text-zinc-700 dark:text-zinc-300 font-medium focus:outline-none cursor-pointer"
          >
            {userLocation && (
              <option value="distance_asc">📍 Plus proche de moi</option>
            )}
            <option value="rating_desc">Meilleures notes</option>
            <option value="date_desc">Visites récentes</option>
            <option value="name_asc">Ordre alphabétique</option>
            <option value="price_asc">Prix croissant</option>
            <option value="price_desc">Prix décroissant</option>
          </select>
        </div>
      </div>

      {/* Restaurant Cards List */}
      <div className="flex-1 overflow-y-auto divide-y divide-zinc-100 dark:divide-zinc-800/60">
        {filteredRestaurants.length === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 mx-auto rounded-full bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center text-zinc-400 mb-3">
              <Compass className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              Aucun restaurant trouvé
            </h3>
            <p className="text-xs text-zinc-500 max-w-[240px] mx-auto mb-4">
              Essayez de modifier votre recherche ou réinitialisez les filtres.
            </p>
            <div className="flex justify-center gap-2">
              <button
                onClick={resetFilters}
                className="px-3 py-1.5 text-xs font-medium text-zinc-700 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 rounded-lg transition"
              >
                Réinitialiser
              </button>
              {!hasDemo && (
                <button
                  onClick={restoreDemoRestaurants}
                  className="px-3 py-1.5 text-xs font-medium text-rose-600 bg-rose-50 hover:bg-rose-100 rounded-lg transition"
                >
                  Charger les démos
                </button>
              )}
            </div>
          </div>
        ) : (
          filteredRestaurants.map((rest) => {
            const isSelected = selectedRestaurant?.id === rest.id;
            const statusConfig = STATUS_LABELS[rest.status];

            return (
              <div
                key={rest.id}
                onClick={() => setSelectedRestaurant(rest)}
                className={`p-3.5 flex gap-3 cursor-pointer transition relative hover:bg-zinc-50 dark:hover:bg-zinc-900/50 ${
                  isSelected
                    ? 'bg-rose-50/60 dark:bg-rose-950/20 border-l-4 border-l-rose-500'
                    : 'border-l-4 border-l-transparent'
                }`}
              >
                {/* Photo Thumbnail */}
                <div className="w-20 h-20 rounded-xl overflow-hidden bg-zinc-100 dark:bg-zinc-800 shrink-0 relative shadow-xs">
                  {rest.photos && rest.photos.length > 0 ? (
                    <>
                      <img
                        src={rest.photos[0]}
                        alt={rest.name}
                        className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        loading="lazy"
                        onError={(e) => {
                          // Hide broken image and fall back to cuisine icon
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />
                      {rest.photos.length > 1 && (
                        <span className="absolute top-1 left-1 px-1 py-0.2 bg-black/60 backdrop-blur-xs text-[9px] font-medium text-white rounded">
                          📷 {rest.photos.length}
                        </span>
                      )}
                    </>
                  ) : (
                    <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-zinc-100 to-zinc-200 dark:from-zinc-800 dark:to-zinc-900 text-zinc-700 dark:text-zinc-300">
                      <span className="text-2xl mb-0.5">
                        {rest.cuisine?.toLowerCase().includes('japon') || rest.cuisine?.toLowerCase().includes('ramen')
                          ? '🍜'
                          : rest.cuisine?.toLowerCase().includes('ital')
                          ? '🍝'
                          : rest.cuisine?.toLowerCase().includes('mer') || rest.cuisine?.toLowerCase().includes('poisson')
                          ? '🦞'
                          : rest.cuisine?.toLowerCase().includes('brunch') || rest.cuisine?.toLowerCase().includes('douceur')
                          ? '🥐'
                          : rest.cuisine?.toLowerCase().includes('street') || rest.cuisine?.toLowerCase().includes('burger') || rest.name.toLowerCase().includes('falafel')
                          ? '🥙'
                          : rest.cuisine?.toLowerCase().includes('gastro')
                          ? '✨'
                          : '🍽️'}
                      </span>
                      <span className="text-[9px] font-semibold text-zinc-500 uppercase tracking-tight">
                        {rest.priceRange || 'Paris'}
                      </span>
                    </div>
                  )}

                  {/* Status badge in photo */}
                  <span
                    className={`absolute bottom-1 right-1 px-1.5 py-0.5 text-[9px] font-bold rounded-md uppercase tracking-wider backdrop-blur-md ${statusConfig.bg} ${statusConfig.color} border ${statusConfig.border}`}
                  >
                    {rest.status === 'favorite' ? '★ Favori' : rest.status === 'to_try' ? 'À tester' : rest.status === 'tested' ? 'Testé' : 'Éviter'}
                  </span>
                </div>

                {/* Info Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-1.5">
                    <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                      {rest.name}
                    </h2>
                    <span className="text-xs font-semibold text-zinc-500 shrink-0">
                      {rest.priceRange}
                    </span>
                  </div>

                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate mt-0.5 flex items-center gap-1">
                    <MapPin className="w-3 h-3 shrink-0 text-zinc-400" />
                    <span>{rest.arrondissement || 'Paris'}</span>
                    <span className="text-zinc-300 dark:text-zinc-700">•</span>
                    <span className="truncate">{rest.cuisine}</span>
                    {userLocation && getDistanceToRestaurant(rest) !== null && (
                      <>
                        <span className="text-zinc-300 dark:text-zinc-700">•</span>
                        <span className="text-[10px] font-semibold text-blue-600 dark:text-blue-400 shrink-0">
                          {formatDistance(getDistanceToRestaurant(rest)!)}
                        </span>
                      </>
                    )}
                  </p>

                  {/* Rating or status */}
                  <div className="flex items-center gap-2 mt-1.5">
                    {rest.personalRating > 0 ? (
                      <div className="flex items-center text-amber-500 text-xs font-bold">
                        <Star className="w-3.5 h-3.5 fill-amber-400 text-amber-400 mr-0.5" />
                        <span>{rest.personalRating}</span>
                        <span className="text-[10px] text-zinc-400 font-normal ml-0.5">/5 (Perso)</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-amber-700 dark:text-amber-400 italic">
                        Pas encore noté
                      </span>
                    )}

                    {rest.visitedAt && (
                      <span className="text-[10px] text-zinc-400">
                        Visité le {new Date(rest.visitedAt).toLocaleDateString('fr-FR', { month: 'short', year: 'numeric' })}
                      </span>
                    )}
                  </div>

                  {/* Signature Dish Preview */}
                  {rest.mustTryDishes && rest.mustTryDishes.length > 0 && (
                    <div className="mt-1.5 flex items-center gap-1">
                      <span className="text-[10px] font-medium text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800 px-1.5 py-0.5 rounded truncate max-w-full">
                        ✨ {rest.mustTryDishes[0]}
                      </span>
                    </div>
                  )}

                  {/* Action: Itinéraire Google Maps */}
                  <div className="mt-2 flex items-center gap-1.5 flex-wrap">
                    <a
                      href={
                        rest.googleMapsUrl ||
                        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                          rest.name + ' ' + (rest.address || 'Paris')
                        )}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-medium text-blue-700 bg-blue-50 dark:text-blue-300 dark:bg-blue-950/50 rounded-md border border-blue-200 dark:border-blue-800/60 hover:bg-blue-100 dark:hover:bg-blue-900/50 transition shrink-0"
                      title="Ouvrir l'itinéraire Google Maps"
                    >
                      <Navigation className="w-3 h-3 text-blue-600 dark:text-blue-400" />
                      <span>Itinéraire Maps</span>
                      <ExternalLink className="w-2.5 h-2.5 opacity-70" />
                    </a>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Bottom Sticky CTA Bar */}
      <div className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 flex items-center gap-2">
        <button
          onClick={() => setIsAddModalOpen(true)}
          className="flex-1 py-2.5 px-3 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-100 rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md transition"
        >
          <Plus className="w-4 h-4" />
          <span>Ajouter un restaurant</span>
        </button>

        <button
          onClick={() => setIsConciergeOpen(true)}
          className="py-2.5 px-3 bg-gradient-to-r from-rose-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white rounded-xl font-semibold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-rose-500/20 transition shrink-0"
          title="Consulter le Concierge Gourmand IA"
        >
          <Sparkles className="w-4 h-4" />
          <span className="hidden sm:inline">Concierge IA</span>
        </button>
      </div>
    </aside>
  );
};
