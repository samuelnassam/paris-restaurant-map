import React, { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { useRestaurants } from '../../context/RestaurantContext';
import { Restaurant, RestaurantStatus } from '../../types/restaurant';
import {
  Navigation2,
  Plus,
  Layers,
  Map as MapIcon,
  Crosshair,
  Loader2,
  Moon,
  Sun,
  AlertCircle,
  X,
  Compass,
  Sparkles
} from 'lucide-react';

// Fix Leaflet default icon paths in bundler environments
delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

// Custom SVG Icons for markers based on status
const createMarkerIcon = (status: RestaurantStatus, isSelected: boolean) => {
  let bgColor = '#f59e0b'; // Amber for to_try
  let ringColor = 'rgba(245, 158, 11, 0.4)';
  let iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76"></polygon></svg>`;

  if (status === 'favorite') {
    bgColor = '#e11d48'; // Rose/Ruby
    ringColor = 'rgba(225, 29, 72, 0.45)';
    iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="white" stroke="white" stroke-width="2"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"></path></svg>`;
  } else if (status === 'tested') {
    bgColor = '#059669'; // Emerald
    ringColor = 'rgba(5, 150, 105, 0.4)';
    iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 2v6a3 3 0 0 1-3 3 3 3 0 0 1-3-3V2"></path><path d="M15 11v11"></path><path d="M6 2v10a3 3 0 0 0 3 3h1v7"></path><path d="M6 6h4"></path></svg>`;
  } else if (status === 'to_avoid') {
    bgColor = '#64748b'; // Slate
    ringColor = 'rgba(100, 116, 139, 0.4)';
    iconSvg = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line></svg>`;
  }

  const size = isSelected ? 42 : 34;
  const pulseHtml = isSelected
    ? `<span style="position: absolute; inset: -8px; border-radius: 9999px; background: ${ringColor}; animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>`
    : '';

  const html = `
    <div style="position: relative; width: ${size}px; height: ${size}px; display: flex; align-items: center; justify-content: center; cursor: pointer; transition: transform 0.2s;">
      ${pulseHtml}
      <div style="
        position: relative;
        width: ${size}px;
        height: ${size}px;
        background: ${bgColor};
        border: 2.5px solid #ffffff;
        border-radius: 50% 50% 50% 0;
        transform: rotate(-45deg);
        box-shadow: 0 4px 14px rgba(0,0,0,0.25);
        display: flex;
        align-items: center;
        justify-content: center;
      ">
        <div style="transform: rotate(45deg); display: flex; align-items: center; justify-content: center;">
          ${iconSvg}
        </div>
      </div>
    </div>
  `;

  return L.divIcon({
    className: 'custom-paris-marker',
    html,
    iconSize: [size, size],
    iconAnchor: [size / 2, size],
    popupAnchor: [0, -size],
  });
};

// Pulsating User Geolocation Marker
const createUserLocationIcon = () => {
  return L.divIcon({
    className: 'user-location-marker',
    html: `
      <div style="position: relative; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center;">
        <span style="position: absolute; inset: -6px; border-radius: 9999px; background: rgba(59, 130, 246, 0.35); animation: ping 1.8s cubic-bezier(0, 0, 0.2, 1) infinite;"></span>
        <div style="width: 18px; height: 18px; background: #2563eb; border: 3px solid #ffffff; border-radius: 9999px; box-shadow: 0 0 14px rgba(37,99,235,0.8); display: flex; align-items: center; justify-content: center;">
          <div style="width: 5px; height: 5px; background: #ffffff; border-radius: 9999px;"></div>
        </div>
      </div>
    `,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
};

// Preset popular points in Paris if GPS is denied in iframe
const PARIS_REFERENCE_POINTS = [
  { name: 'Châtelet / Centre', lat: 48.8584, lng: 2.347 },
  { name: 'Bastille / 11e', lat: 48.853, lng: 2.3698 },
  { name: 'Le Marais / 4e', lat: 48.8575, lng: 2.3622 },
  { name: 'Saint-Germain / 6e', lat: 48.8539, lng: 2.333 },
  { name: 'Montmartre / 18e', lat: 48.8867, lng: 2.3431 },
];

export const ParisMap: React.FC = () => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const addMarkerRef = useRef<L.Marker | null>(null);
  const userMarkerRef = useRef<L.Marker | null>(null);
  const userCircleRef = useRef<L.Circle | null>(null);

  const [useOsmFr, setUseOsmFr] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);

  const {
    filteredRestaurants,
    selectedRestaurant,
    setSelectedRestaurant,
    setSelectedLocationForAdd,
    setIsAddModalOpen,
    mapCenter,
    mapZoom,
    setMapCenter,
    setMapZoom,
    restaurants,
    isDarkMode,
    toggleDarkMode,
    userLocation,
    isLocating,
    locationError,
    setLocationError,
    locateUser,
    setManualLocation,
    clearLocation,
    setIsConciergeOpen,
  } = useRestaurants();

  // Apply reliable OpenStreetMap tile layer
  const applyTileLayer = (map: L.Map, useFr: boolean) => {
    if (tileLayerRef.current) {
      tileLayerRef.current.remove();
    }

    // 100% reliable OSM URLs - no external commercial services that fail
    const url = useFr
      ? 'https://{s}.tile.openstreetmap.fr/osmfr/{z}/{x}/{y}.png'
      : 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

    const attribution = useFr
      ? '&copy; OpenStreetMap France | &copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
      : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributeurs';

    const newLayer = L.tileLayer(url, {
      attribution,
      subdomains: useFr ? ['a', 'b', 'c'] : 'abc',
      maxZoom: 19,
      crossOrigin: true,
    }).addTo(map);

    tileLayerRef.current = newLayer;
  };

  // Initialize map
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return;

    const map = L.map(mapContainerRef.current, {
      center: [48.8566, 2.3522],
      zoom: 13,
      minZoom: 11,
      maxZoom: 19,
      zoomControl: false,
    });

    // Apply OpenStreetMap
    applyTileLayer(map, useOsmFr);

    // Zoom control in top-right
    L.control.zoom({ position: 'topright' }).addTo(map);

    // Invalidate size to guarantee tiles load when container computes bounds
    setTimeout(() => {
      map.invalidateSize();
    }, 100);
    setTimeout(() => {
      map.invalidateSize();
    }, 400);

    // Resize observer
    let resizeObserver: ResizeObserver | null = null;
    if (mapContainerRef.current) {
      resizeObserver = new ResizeObserver(() => {
        map.invalidateSize();
      });
      resizeObserver.observe(mapContainerRef.current);
    }

    // Click on map to add a restaurant at coordinates
    map.on('click', (e: L.LeafletMouseEvent) => {
      const { lat, lng } = e.latlng;
      setSelectedLocationForAdd({ lat, lng });

      if (addMarkerRef.current) {
        addMarkerRef.current.remove();
      }

      const tempIcon = L.divIcon({
        className: 'add-pin-marker',
        html: `
          <div style="position: relative; width: 32px; height: 32px; display: flex; align-items: center; justify-content: center;">
            <div style="width: 32px; height: 32px; background: #0f172a; border: 2.5px solid #ffffff; border-radius: 50% 50% 50% 0; transform: rotate(-45deg); display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.3);">
              <div style="transform: rotate(45deg); color: white; font-weight: bold; font-size: 18px; line-height: 1;">+</div>
            </div>
          </div>
        `,
        iconSize: [32, 32],
        iconAnchor: [16, 32],
      });

      const newTempMarker = L.marker([lat, lng], { icon: tempIcon }).addTo(map);
      addMarkerRef.current = newTempMarker;

      const popupContent = document.createElement('div');
      popupContent.className = 'p-1 font-sans text-center';
      popupContent.innerHTML = `
        <p class="text-xs font-semibold text-zinc-900 dark:text-zinc-100 mb-1">Ajouter un restaurant ici ?</p>
        <p class="text-[11px] text-zinc-500 mb-2">${lat.toFixed(4)}, ${lng.toFixed(4)}</p>
        <button id="btn-add-here" class="px-2.5 py-1 text-xs font-medium text-white bg-zinc-900 dark:bg-rose-600 hover:bg-zinc-800 rounded-md shadow-sm transition">
          Créer la fiche
        </button>
      `;

      popupContent.querySelector('#btn-add-here')?.addEventListener('click', () => {
        setIsAddModalOpen(true);
        newTempMarker.closePopup();
      });

      newTempMarker.bindPopup(popupContent, { offset: [0, -28] }).openPopup();
    });

    mapRef.current = map;

    return () => {
      if (resizeObserver) resizeObserver.disconnect();
      map.remove();
      mapRef.current = null;
    };
  }, [setSelectedLocationForAdd, setIsAddModalOpen]);

  // Switch between OSM standard & OSM France
  const handleToggleOsmFr = () => {
    const nextVal = !useOsmFr;
    setUseOsmFr(nextVal);
    if (mapRef.current) {
      applyTileLayer(mapRef.current, nextVal);
    }
  };

  // Sync user location marker
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (userLocation) {
      const latlng: [number, number] = [userLocation.lat, userLocation.lng];

      if (userMarkerRef.current) {
        userMarkerRef.current.setLatLng(latlng);
      } else {
        const marker = L.marker(latlng, {
          icon: createUserLocationIcon(),
          zIndexOffset: 500,
        }).addTo(map);

        marker.bindTooltip('Vous êtes ici (position active)', {
          direction: 'top',
          offset: [0, -18],
          permanent: false,
        });

        userMarkerRef.current = marker;
      }

      if (userCircleRef.current) {
        userCircleRef.current.setLatLng(latlng);
        userCircleRef.current.setRadius(Math.max(userLocation.accuracy, 30));
      } else {
        const circle = L.circle(latlng, {
          radius: Math.max(userLocation.accuracy, 30),
          color: '#3b82f6',
          weight: 1.5,
          opacity: 0.6,
          fillColor: '#3b82f6',
          fillOpacity: 0.12,
        }).addTo(map);
        userCircleRef.current = circle;
      }
    } else {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
      if (userCircleRef.current) {
        userCircleRef.current.remove();
        userCircleRef.current = null;
      }
    }
  }, [userLocation]);

  // Sync markers with filtered restaurants
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    Object.keys(markersRef.current).forEach((id) => {
      const stillExists = filteredRestaurants.some((r) => r.id === id);
      if (!stillExists) {
        markersRef.current[id].remove();
        delete markersRef.current[id];
      }
    });

    filteredRestaurants.forEach((rest) => {
      const isSelected = selectedRestaurant?.id === rest.id;
      const icon = createMarkerIcon(rest.status, isSelected);

      if (markersRef.current[rest.id]) {
        markersRef.current[rest.id].setIcon(icon);
        markersRef.current[rest.id].setLatLng([rest.lat, rest.lng]);
        markersRef.current[rest.id].setZIndexOffset(isSelected ? 1000 : 0);
      } else {
        const marker = L.marker([rest.lat, rest.lng], {
          icon,
          zIndexOffset: isSelected ? 1000 : 0,
        }).addTo(map);

        const firstPhoto = rest.photos && rest.photos.length > 0 ? rest.photos[0] : null;
        const tooltipHtml = `
          <div style="font-family: inherit; width: 190px; padding: 2px;">
            ${
              firstPhoto
                ? `<div style="position: relative; width: 100%; height: 95px; border-radius: 6px; overflow: hidden; margin-bottom: 6px; background: #27272a;">
                     <img src="${firstPhoto}" alt="${rest.name}" style="width: 100%; height: 100%; object-fit: cover;" onerror="this.parentElement.style.display='none'" />
                   </div>`
                : ''
            }
            <div style="font-weight: 700; font-size: 13px; color: ${isDarkMode ? '#fafafa' : '#18181b'}; line-height: 1.2;">${rest.name}</div>
            <div style="font-size: 11px; color: #71717a; margin-top: 2px;">${rest.arrondissement || 'Paris'} • ${rest.priceRange}</div>
            <div style="font-size: 11px; color: ${isDarkMode ? '#a1a1aa' : '#4b5563'}; margin-top: 1px;">${rest.cuisine}</div>
            ${
              rest.personalRating > 0
                ? `<div style="font-size: 11px; color: #f59e0b; margin-top: 3px; font-weight: 600;">★ ${rest.personalRating}/5 (Perso)</div>`
                : ''
            }
          </div>
        `;
        marker.bindTooltip(tooltipHtml, {
          direction: 'top',
          offset: [0, -32],
          opacity: 0.98,
        });

        marker.on('click', (e) => {
          L.DomEvent.stopPropagation(e);
          setSelectedRestaurant(rest);
          map.flyTo([rest.lat, rest.lng], Math.max(map.getZoom(), 14), {
            duration: 0.6,
          });
        });

        markersRef.current[rest.id] = marker;
      }
    });
  }, [filteredRestaurants, selectedRestaurant, setSelectedRestaurant, isDarkMode]);

  // Handle center and zoom updates from context
  useEffect(() => {
    if (!mapRef.current) return;
    mapRef.current.flyTo(mapCenter, mapZoom, { duration: 0.8 });
  }, [mapCenter, mapZoom]);

  // Center on selected restaurant
  useEffect(() => {
    if (selectedRestaurant && mapRef.current) {
      mapRef.current.flyTo([selectedRestaurant.lat, selectedRestaurant.lng], 15, {
        duration: 0.8,
      });
    }
  }, [selectedRestaurant]);

  const handleRecenter = () => {
    if (!mapRef.current) return;
    setMapCenter([48.8566, 2.3522]);
    setMapZoom(13);
  };

  const counts = {
    favorite: restaurants.filter((r) => r.status === 'favorite').length,
    tested: restaurants.filter((r) => r.status === 'tested').length,
    to_try: restaurants.filter((r) => r.status === 'to_try').length,
    to_avoid: restaurants.filter((r) => r.status === 'to_avoid').length,
  };

  return (
    <div className={`absolute inset-0 w-full h-full overflow-hidden ${isDarkMode ? 'night-tiles-active' : ''}`}>
      {/* Map DOM Element */}
      <div ref={mapContainerRef} className="absolute inset-0 w-full h-full z-0" />

      {/* Floating Map Actions Bar (Top Left) */}
      <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
        {/* Recenter Button */}
        <button
          onClick={handleRecenter}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-200 shadow-md hover:bg-white dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800 transition"
          title="Recentrer la carte sur Paris"
        >
          <Navigation2 className="w-3.5 h-3.5 text-zinc-900 dark:text-zinc-100" />
          <span>Paris Centre</span>
        </button>

        {/* GEOLOCATION BUTTON */}
        <div className="relative">
          <button
            onClick={() => {
              if (userLocation) {
                setShowLocationPicker(!showLocationPicker);
              } else {
                locateUser();
              }
            }}
            disabled={isLocating}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-md border transition ${
              userLocation
                ? 'bg-blue-600 hover:bg-blue-700 text-white border-blue-500'
                : 'bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md text-zinc-800 dark:text-zinc-200 hover:bg-white dark:hover:bg-zinc-800 border-zinc-200/80 dark:border-zinc-800'
            }`}
            title="Me géolocaliser sur la carte de Paris"
          >
            {isLocating ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
                <span>Recherche GPS...</span>
              </>
            ) : (
              <>
                <Crosshair className={`w-3.5 h-3.5 ${userLocation ? 'text-white' : 'text-blue-500'}`} />
                <span>{userLocation ? 'Ma position active' : 'Me géolocaliser'}</span>
              </>
            )}
          </button>
        </div>

        {/* Add pin button */}
        <button
          onClick={() => {
            setSelectedLocationForAdd({ lat: 48.8566, lng: 2.3522 });
            setIsAddModalOpen(true);
          }}
          className="flex items-center gap-1.5 px-3 py-2 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-rose-600 dark:hover:bg-rose-700 rounded-xl text-xs font-semibold shadow-md transition"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Ajouter à l'emplacement</span>
        </button>

        {/* OSM Layer Toggle */}
        <button
          onClick={handleToggleOsmFr}
          className="flex items-center gap-1.5 px-3 py-2 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md rounded-xl text-xs font-medium text-zinc-700 dark:text-zinc-200 shadow-md hover:bg-white dark:hover:bg-zinc-800 border border-zinc-200/80 dark:border-zinc-800 transition"
          title="Basculer vers les tuiles OSM France"
        >
          <Layers className="w-3.5 h-3.5 text-zinc-600 dark:text-zinc-400" />
          <span>{useOsmFr ? 'OSM France' : 'OSM Standard'}</span>
        </button>

        {/* Global Dark / Light Mode Switcher (Mode Nuit) */}
        <button
          onClick={toggleDarkMode}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold shadow-md border transition ${
            isDarkMode
              ? 'bg-zinc-800 text-amber-400 border-zinc-700 hover:bg-zinc-700'
              : 'bg-white/95 text-zinc-700 hover:bg-white border-zinc-200/80'
          }`}
          title={isDarkMode ? 'Désactiver le mode nuit' : 'Activer le mode nuit (fond de carte nocturne)'}
        >
          {isDarkMode ? (
            <>
              <Sun className="w-3.5 h-3.5 text-amber-400" />
              <span>Mode Nuit (Activé)</span>
            </>
          ) : (
            <>
              <Moon className="w-3.5 h-3.5 text-zinc-600" />
              <span>Mode Nuit</span>
            </>
          )}
        </button>
      </div>

      {/* Geolocation Fallback Dialog when permission is denied or manual selection wanted */}
      {(locationError || showLocationPicker) && (
        <div className="absolute top-18 left-4 z-20 max-w-sm p-4 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-xl text-xs text-zinc-800 dark:text-zinc-200 animate-in fade-in duration-200">
          <div className="flex items-start justify-between gap-2 mb-2">
            <div className="flex items-center gap-1.5 font-bold text-zinc-900 dark:text-zinc-100">
              <Compass className="w-4 h-4 text-blue-500" />
              <span>Position de référence à Paris</span>
            </div>
            <button
              onClick={() => {
                setLocationError(null);
                setShowLocationPicker(false);
              }}
              className="p-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-3 leading-relaxed">
            {locationError
              ? `${locationError} Choisissez un point de référence à Paris pour activer les distances et le tri par proximité :`
              : 'Définissez votre quartier de départ pour calculer la distance avec les restaurants :'}
          </p>

          <div className="grid grid-cols-1 gap-1.5 mb-3">
            {PARIS_REFERENCE_POINTS.map((pt) => (
              <button
                key={pt.name}
                onClick={() => {
                  setManualLocation(pt.lat, pt.lng);
                  setShowLocationPicker(false);
                }}
                className="px-3 py-1.5 text-left text-xs bg-zinc-50 dark:bg-zinc-800/80 hover:bg-blue-50 hover:text-blue-600 dark:hover:bg-blue-950/40 dark:hover:text-blue-400 rounded-lg border border-zinc-200/80 dark:border-zinc-700 transition flex items-center justify-between"
              >
                <span>📍 {pt.name}</span>
                <span className="text-[10px] text-zinc-400 font-mono">
                  {pt.lat.toFixed(2)}, {pt.lng.toFixed(2)}
                </span>
              </button>
            ))}
          </div>

          {userLocation && (
            <button
              onClick={() => {
                clearLocation();
                setShowLocationPicker(false);
              }}
              className="w-full py-1 text-[11px] text-rose-600 dark:text-rose-400 hover:underline text-center"
            >
              Réinitialiser / désactiver ma position
            </button>
          )}
        </div>
      )}

      {/* Floating Concierge IA Trigger Button on Map */}
      <button
        onClick={() => setIsConciergeOpen(true)}
        className="absolute bottom-16 sm:bottom-18 right-4 z-20 px-3.5 py-2.5 bg-gradient-to-r from-rose-500 via-rose-600 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white rounded-2xl shadow-xl shadow-rose-500/25 flex items-center gap-2 font-semibold text-xs transition duration-200 hover:scale-105 active:scale-95 border border-white/20"
        title="Ouvrir le Concierge Gourmand IA"
      >
        <Sparkles className="w-4 h-4 animate-pulse" />
        <span>Concierge IA</span>
      </button>

      {/* Map Legend Overlay in bottom-right */}
      <div className="absolute bottom-4 right-4 z-10 bg-white/90 dark:bg-zinc-900/90 backdrop-blur-md px-3.5 py-2.5 rounded-2xl shadow-lg border border-zinc-200/70 dark:border-zinc-800 hidden sm:flex items-center gap-4 text-xs font-medium">
        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400">
          <div className="w-2.5 h-2.5 rounded-full bg-rose-500 ring-2 ring-rose-200 dark:ring-rose-950" />
          <span>Coup de cœur ({counts.favorite})</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-700 dark:text-emerald-400">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-emerald-200 dark:ring-emerald-950" />
          <span>Déjà testé ({counts.tested})</span>
        </div>
        <div className="flex items-center gap-1.5 text-amber-600 dark:text-amber-400">
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500 ring-2 ring-amber-200 dark:ring-amber-950" />
          <span>À tester ({counts.to_try})</span>
        </div>
        {counts.to_avoid > 0 && (
          <div className="flex items-center gap-1.5 text-zinc-500 dark:text-zinc-400">
            <div className="w-2.5 h-2.5 rounded-full bg-zinc-500 ring-2 ring-zinc-200 dark:ring-zinc-800" />
            <span>À éviter ({counts.to_avoid})</span>
          </div>
        )}
      </div>

      {/* Mobile restaurant count badge */}
      <div className="absolute top-4 right-14 z-10 sm:hidden">
        <span className="px-2.5 py-1 text-[11px] font-medium bg-white/90 dark:bg-zinc-900/90 backdrop-blur rounded-lg text-zinc-700 dark:text-zinc-300 shadow">
          {filteredRestaurants.length} resto{filteredRestaurants.length > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};
