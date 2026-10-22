import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import {
  collection,
  query,
  where,
  onSnapshot,
  setDoc,
  doc,
  deleteDoc,
  updateDoc
} from 'firebase/firestore';
import { auth, db, googleProvider, signInWithPopup, signOut, handleFirestoreError, OperationType } from '../lib/firebase';
import { Restaurant, RestaurantCollection, FilterState, RestaurantStatus } from '../types/restaurant';
import { DEMO_RESTAURANTS, INITIAL_COLLECTIONS } from '../lib/demoData';

export function calculateDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

export function formatDistance(km: number): string {
  if (km < 1) {
    return `${Math.round(km * 1000)} m`;
  }
  return `${km.toFixed(1)} km`;
}

interface RestaurantContextType {
  restaurants: Restaurant[];
  collections: RestaurantCollection[];
  filters: FilterState;
  setFilters: React.Dispatch<React.SetStateAction<FilterState>>;
  resetFilters: () => void;
  filteredRestaurants: Restaurant[];
  selectedRestaurant: Restaurant | null;
  setSelectedRestaurant: (r: Restaurant | null) => void;
  selectedLocationForAdd: { lat: number; lng: number } | null;
  setSelectedLocationForAdd: (loc: { lat: number; lng: number } | null) => void;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  isConciergeOpen: boolean;
  setIsConciergeOpen: (open: boolean) => void;
  user: User | null;
  authLoading: boolean;
  addRestaurant: (r: Omit<Restaurant, 'id' | 'userId' | 'createdAt'>) => Promise<Restaurant>;
  updateRestaurant: (id: string, updates: Partial<Restaurant>) => Promise<void>;
  deleteRestaurant: (id: string) => Promise<void>;
  checkDuplicate: (name: string, address: string, excludeId?: string) => { isDuplicate: boolean; existingRestaurant?: Restaurant };
  addCollection: (name: string, color: string, icon: string, description?: string) => Promise<RestaurantCollection>;
  deleteCollection: (id: string) => Promise<void>;
  clearDemoRestaurants: () => Promise<void>;
  restoreDemoRestaurants: () => void;
  loginWithGoogle: () => Promise<void>;
  logout: () => Promise<void>;
  mapCenter: [number, number];
  setMapCenter: (center: [number, number]) => void;
  mapZoom: number;
  setMapZoom: (zoom: number) => void;
  // Dark mode
  isDarkMode: boolean;
  toggleDarkMode: () => void;
  // Geolocation
  userLocation: { lat: number; lng: number; accuracy: number } | null;
  isLocating: boolean;
  locationError: string | null;
  setLocationError: (err: string | null) => void;
  locateUser: () => void;
  setManualLocation: (lat: number, lng: number) => void;
  clearLocation: () => void;
  getDistanceToRestaurant: (r: Restaurant) => number | null;
}

const DEFAULT_FILTERS: FilterState = {
  searchQuery: '',
  status: 'all',
  cuisine: 'all',
  arrondissement: 'all',
  priceRange: 'all',
  minRating: 0,
  collectionId: 'all',
  sortBy: 'rating_desc',
};

const LOCAL_STORAGE_KEY = 'paris_restaurants_local_v2';
const LOCAL_COLLECTIONS_KEY = 'paris_collections_local_v2';
const THEME_STORAGE_KEY = 'paris_restaurants_theme_mode';

const RestaurantContext = createContext<RestaurantContextType | null>(null);

export const RestaurantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // Dark Mode State
  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      const stored = localStorage.getItem(THEME_STORAGE_KEY);
      if (stored !== null) {
        return stored === 'dark';
      }
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    } catch {
      return false;
    }
  });

  // Apply dark class to <html> element
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem(THEME_STORAGE_KEY, 'light');
    }
  }, [isDarkMode]);

  const toggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  // User Geolocation State
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number; accuracy: number } | null>(null);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);

  const [restaurants, setRestaurants] = useState<Restaurant[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (stored) {
        const parsed: Restaurant[] = JSON.parse(stored);
        // Clean out any old automatic stock photos from demo restaurants
        return parsed.map((r) => (r.isDemo ? { ...r, photos: [] } : r));
      }
    } catch (e) {
      console.warn('Could not read restaurants from localStorage', e);
    }
    return DEMO_RESTAURANTS;
  });

  const [collections, setCollections] = useState<RestaurantCollection[]>(() => {
    try {
      const stored = localStorage.getItem(LOCAL_COLLECTIONS_KEY);
      if (stored) {
        return JSON.parse(stored);
      }
    } catch (e) {
      console.warn('Could not read collections from localStorage', e);
    }
    return INITIAL_COLLECTIONS;
  });

  const [filters, setFilters] = useState<FilterState>(DEFAULT_FILTERS);
  const [selectedRestaurant, setSelectedRestaurant] = useState<Restaurant | null>(null);
  const [selectedLocationForAdd, setSelectedLocationForAdd] = useState<{ lat: number; lng: number } | null>(null);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isConciergeOpen, setIsConciergeOpen] = useState(false);

  const [mapCenter, setMapCenter] = useState<[number, number]>([48.8566, 2.3522]);
  const [mapZoom, setMapZoom] = useState<number>(13);

  // Locate User Function
  const locateUser = useCallback(() => {
    if (!navigator.geolocation) {
      setLocationError("La géolocalisation n'est pas supportée par votre navigateur.");
      return;
    }

    setIsLocating(true);
    setLocationError(null);

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const coords = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
        };
        setUserLocation(coords);
        setIsLocating(false);

        // Fly map to user location
        setMapCenter([coords.lat, coords.lng]);
        setMapZoom(15);
      },
      (err) => {
        setIsLocating(false);
        let msg = 'Impossible de récupérer votre position.';
        if (err.code === err.PERMISSION_DENIED) {
          msg = 'Autorisation de géolocalisation refusée.';
        } else if (err.code === err.POSITION_UNAVAILABLE) {
          msg = 'Signal GPS introuvable.';
        } else if (err.code === err.TIMEOUT) {
          msg = 'Délai de géolocalisation dépassé.';
        }
        setLocationError(msg);
      },
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 60000 }
    );
  }, []);

  const setManualLocation = useCallback((lat: number, lng: number) => {
    setUserLocation({ lat, lng, accuracy: 25 });
    setLocationError(null);
    setMapCenter([lat, lng]);
    setMapZoom(15);
  }, []);

  const clearLocation = useCallback(() => {
    setUserLocation(null);
    setLocationError(null);
  }, []);

  // Distance helper
  const getDistanceToRestaurant = useCallback(
    (r: Restaurant): number | null => {
      if (!userLocation) return null;
      return calculateDistanceKm(userLocation.lat, userLocation.lng, r.lat, r.lng);
    },
    [userLocation]
  );

  // Sync to localStorage in offline/guest mode
  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(restaurants));
      } catch (e) {
        console.warn('LocalStorage save error', e);
      }
    }
  }, [restaurants, user]);

  useEffect(() => {
    if (!user) {
      try {
        localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(collections));
      } catch (e) {
        console.warn('LocalStorage save error', e);
      }
    }
  }, [collections, user]);

  // Auth observer and Firestore listener
  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      setAuthLoading(false);
    });
    return () => unsubscribeAuth();
  }, []);

  // Firestore sync when logged in
  useEffect(() => {
    if (!user) return;

    // Listen to restaurants
    const restQuery = query(collection(db, 'restaurants'), where('userId', '==', user.uid));
    const unsubscribeRest = onSnapshot(
      restQuery,
      (snapshot) => {
        const loaded: Restaurant[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as Restaurant);
        });
        if (loaded.length > 0) {
          setRestaurants(loaded);
        } else {
          setRestaurants([]);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'restaurants');
      }
    );

    // Listen to collections
    const colQuery = query(collection(db, 'collections'), where('userId', '==', user.uid));
    const unsubscribeCol = onSnapshot(
      colQuery,
      (snapshot) => {
        const loaded: RestaurantCollection[] = [];
        snapshot.forEach((docSnap) => {
          loaded.push({ id: docSnap.id, ...docSnap.data() } as RestaurantCollection);
        });
        if (loaded.length > 0) {
          setCollections(loaded);
        }
      },
      (error) => {
        handleFirestoreError(error, OperationType.LIST, 'collections');
      }
    );

    return () => {
      unsubscribeRest();
      unsubscribeCol();
    };
  }, [user]);

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS);
  }, []);

  // Duplicate checker
  const checkDuplicate = useCallback(
    (name: string, address: string, excludeId?: string) => {
      const cleanName = name.trim().toLowerCase();
      const cleanAddr = address.trim().toLowerCase();

      const existing = restaurants.find((r) => {
        if (excludeId && r.id === excludeId) return false;
        const sameName = r.name.trim().toLowerCase() === cleanName;
        const sameAddr = r.address.trim().toLowerCase() === cleanAddr;
        return sameName || (cleanAddr.length > 10 && sameAddr);
      });

      return {
        isDuplicate: Boolean(existing),
        existingRestaurant: existing,
      };
    },
    [restaurants]
  );

  const addRestaurant = useCallback(
    async (data: Omit<Restaurant, 'id' | 'userId' | 'createdAt'>): Promise<Restaurant> => {
      const newId = `rest_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
      const now = new Date().toISOString();
      const currentUserId = user ? user.uid : 'local-user';

      const newRest: Restaurant = {
        ...data,
        id: newId,
        userId: currentUserId,
        createdAt: now,
        updatedAt: now,
      };

      if (user) {
        try {
          const docRef = doc(db, 'restaurants', newId);
          await setDoc(docRef, newRest);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `restaurants/${newId}`);
        }
      } else {
        setRestaurants((prev) => [newRest, ...prev]);
      }

      setSelectedRestaurant(newRest);
      setMapCenter([newRest.lat, newRest.lng]);
      setMapZoom(15);
      return newRest;
    },
    [user]
  );

  const updateRestaurant = useCallback(
    async (id: string, updates: Partial<Restaurant>) => {
      const now = new Date().toISOString();
      const fullUpdates = { ...updates, updatedAt: now };

      if (user) {
        try {
          const docRef = doc(db, 'restaurants', id);
          await updateDoc(docRef, fullUpdates);
        } catch (error) {
          handleFirestoreError(error, OperationType.UPDATE, `restaurants/${id}`);
        }
      } else {
        setRestaurants((prev) =>
          prev.map((r) => (r.id === id ? { ...r, ...fullUpdates } : r))
        );
      }

      setSelectedRestaurant((prev) => (prev && prev.id === id ? { ...prev, ...fullUpdates } : prev));
    },
    [user]
  );

  const deleteRestaurant = useCallback(
    async (id: string) => {
      if (user) {
        try {
          const docRef = doc(db, 'restaurants', id);
          await deleteDoc(docRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `restaurants/${id}`);
        }
      } else {
        setRestaurants((prev) => prev.filter((r) => r.id !== id));
      }

      setSelectedRestaurant((prev) => (prev?.id === id ? null : prev));
    },
    [user]
  );

  const addCollection = useCallback(
    async (name: string, color: string, icon: string, description?: string): Promise<RestaurantCollection> => {
      const newId = `col_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const now = new Date().toISOString();
      const currentUserId = user ? user.uid : 'local-user';

      const newCol: RestaurantCollection = {
        id: newId,
        userId: currentUserId,
        name,
        color,
        icon,
        description: description || '',
        createdAt: now,
      };

      if (user) {
        try {
          const docRef = doc(db, 'collections', newId);
          await setDoc(docRef, newCol);
        } catch (error) {
          handleFirestoreError(error, OperationType.CREATE, `collections/${newId}`);
        }
      } else {
        setCollections((prev) => [...prev, newCol]);
      }
      return newCol;
    },
    [user]
  );

  const deleteCollection = useCallback(
    async (id: string) => {
      if (user) {
        try {
          const docRef = doc(db, 'collections', id);
          await deleteDoc(docRef);
        } catch (error) {
          handleFirestoreError(error, OperationType.DELETE, `collections/${id}`);
        }
      } else {
        setCollections((prev) => prev.filter((c) => c.id !== id));
      }
      setRestaurants((prev) =>
        prev.map((r) => ({
          ...r,
          collections: r.collections.filter((cId) => cId !== id),
        }))
      );
    },
    [user]
  );

  const clearDemoRestaurants = useCallback(async () => {
    const demoItems = restaurants.filter((r) => r.isDemo);
    for (const item of demoItems) {
      await deleteRestaurant(item.id);
    }
  }, [restaurants, deleteRestaurant]);

  const restoreDemoRestaurants = useCallback(() => {
    setRestaurants(DEMO_RESTAURANTS);
    setCollections(INITIAL_COLLECTIONS);
    try {
      localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(DEMO_RESTAURANTS));
      localStorage.setItem(LOCAL_COLLECTIONS_KEY, JSON.stringify(INITIAL_COLLECTIONS));
    } catch (e) {
      console.warn(e);
    }
  }, []);

  const loginWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error: any) {
      console.error('Login error:', error);
      alert('Connexion Google impossible dans cette fenêtre ou annulée.');
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await signOut(auth);
      setRestaurants(DEMO_RESTAURANTS);
      setSelectedRestaurant(null);
    } catch (error) {
      console.error('Logout error:', error);
    }
  }, []);

  // Filter and sort restaurants
  const filteredRestaurants = useMemo(() => {
    return restaurants
      .filter((r) => {
        if (filters.searchQuery.trim()) {
          const q = filters.searchQuery.toLowerCase();
          const matchName = r.name.toLowerCase().includes(q);
          const matchAddr = r.address.toLowerCase().includes(q);
          const matchCuisine = r.cuisine.toLowerCase().includes(q);
          const matchDishes = r.mustTryDishes.some((d) => d.toLowerCase().includes(q));
          const matchNotes = r.notes.toLowerCase().includes(q);
          if (!matchName && !matchAddr && !matchCuisine && !matchDishes && !matchNotes) {
            return false;
          }
        }

        if (filters.status !== 'all' && r.status !== filters.status) {
          return false;
        }

        if (filters.cuisine !== 'all' && !r.cuisine.toLowerCase().includes(filters.cuisine.toLowerCase())) {
          return false;
        }

        if (filters.arrondissement !== 'all') {
          const arrPrefix = filters.arrondissement.split(' ')[0];
          if (!r.arrondissement.includes(arrPrefix) && !r.address.includes(arrPrefix)) {
            return false;
          }
        }

        if (filters.priceRange !== 'all' && r.priceRange !== filters.priceRange) {
          return false;
        }

        if (filters.minRating > 0 && r.personalRating < filters.minRating) {
          return false;
        }

        if (filters.collectionId !== 'all') {
          if (!r.collections.includes(filters.collectionId)) {
            return false;
          }
        }

        return true;
      })
      .sort((a, b) => {
        switch (filters.sortBy) {
          case 'distance_asc': {
            if (!userLocation) return 0;
            const distA = calculateDistanceKm(userLocation.lat, userLocation.lng, a.lat, a.lng);
            const distB = calculateDistanceKm(userLocation.lat, userLocation.lng, b.lat, b.lng);
            return distA - distB;
          }
          case 'rating_desc':
            return b.personalRating - a.personalRating;
          case 'rating_asc':
            return a.personalRating - b.personalRating;
          case 'date_desc': {
            const dateA = a.visitedAt || a.createdAt;
            const dateB = b.visitedAt || b.createdAt;
            return new Date(dateB).getTime() - new Date(dateA).getTime();
          }
          case 'name_asc':
            return a.name.localeCompare(b.name, 'fr');
          case 'price_asc':
            return a.priceRange.length - b.priceRange.length;
          case 'price_desc':
            return b.priceRange.length - a.priceRange.length;
          default:
            return 0;
        }
      });
  }, [restaurants, filters, userLocation]);

  return (
    <RestaurantContext.Provider
      value={{
        restaurants,
        collections,
        filters,
        setFilters,
        resetFilters,
        filteredRestaurants,
        selectedRestaurant,
        setSelectedRestaurant,
        selectedLocationForAdd,
        setSelectedLocationForAdd,
        isAddModalOpen,
        setIsAddModalOpen,
        isConciergeOpen,
        setIsConciergeOpen,
        user,
        authLoading,
        addRestaurant,
        updateRestaurant,
        deleteRestaurant,
        checkDuplicate,
        addCollection,
        deleteCollection,
        clearDemoRestaurants,
        restoreDemoRestaurants,
        loginWithGoogle,
        logout,
        mapCenter,
        setMapCenter,
        mapZoom,
        setMapZoom,
        isDarkMode,
        toggleDarkMode,
        userLocation,
        isLocating,
        locationError,
        setLocationError,
        locateUser,
        setManualLocation,
        clearLocation,
        getDistanceToRestaurant,
      }}
    >
      {children}
    </RestaurantContext.Provider>
  );
};

export const useRestaurants = () => {
  const context = useContext(RestaurantContext);
  if (!context) {
    throw new Error('useRestaurants must be used within a RestaurantProvider');
  }
  return context;
};
