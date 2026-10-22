export type RestaurantStatus = 'to_try' | 'tested' | 'favorite' | 'to_avoid';

export type PriceRange = '€' | '€€' | '€€€' | '€€€€';

export interface Restaurant {
  id: string;
  userId: string;
  name: string;
  address: string;
  arrondissement: string;
  lat: number;
  lng: number;
  status: RestaurantStatus;
  cuisine: string;
  priceRange: PriceRange;
  personalRating: number; // 0 to 5
  personalReview: string;
  notes: string;
  mustTryDishes: string[];
  visitedAt?: string | null;
  photos: string[];
  collections: string[];
  website?: string;
  phone?: string;
  googleMapsUrl?: string;
  isDemo?: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface RestaurantCollection {
  id: string;
  userId: string;
  name: string;
  color: string;
  icon: string;
  description?: string;
  createdAt: string;
}

export interface FilterState {
  searchQuery: string;
  status: RestaurantStatus | 'all';
  cuisine: string | 'all';
  arrondissement: string | 'all';
  priceRange: PriceRange | 'all';
  minRating: number;
  collectionId: string | 'all';
  sortBy: 'rating_desc' | 'rating_asc' | 'date_desc' | 'name_asc' | 'price_asc' | 'price_desc' | 'distance_asc';
}

export const STATUS_LABELS: Record<RestaurantStatus, { label: string; color: string; bg: string; border: string; icon: string }> = {
  favorite: {
    label: 'Coup de cœur',
    color: 'text-rose-600 dark:text-rose-400',
    bg: 'bg-rose-50 dark:bg-rose-950/40',
    border: 'border-rose-200 dark:border-rose-800',
    icon: 'Heart',
  },
  tested: {
    label: 'Déjà testé',
    color: 'text-emerald-700 dark:text-emerald-400',
    bg: 'bg-emerald-50 dark:bg-emerald-950/40',
    border: 'border-emerald-200 dark:border-emerald-800',
    icon: 'CheckCircle2',
  },
  to_try: {
    label: 'À tester',
    color: 'text-amber-700 dark:text-amber-400',
    bg: 'bg-amber-50 dark:bg-amber-950/40',
    border: 'border-amber-200 dark:border-amber-800',
    icon: 'Compass',
  },
  to_avoid: {
    label: 'À éviter',
    color: 'text-zinc-600 dark:text-zinc-400',
    bg: 'bg-zinc-100 dark:bg-zinc-800',
    border: 'border-zinc-300 dark:border-zinc-700',
    icon: 'Ban',
  },
};

export const PARIS_ARRONDISSEMENTS = [
  '1er (Louvre / Châtelet)',
  '2e (Bourse / Sentier)',
  '3e (Haut-Marais / Temple)',
  '4e (Marais / Notre-Dame)',
  '5e (Quartier Latin)',
  '6e (Saint-Germain-des-Prés)',
  '7e (Tour Eiffel / Invalides)',
  '8e (Champs-Élysées / Madeleine)',
  '9e (Opéra / Pigalle / Grands Boulevards)',
  '10e (Canal Saint-Martin / République)',
  '11e (Bastille / Charonne / Oberkampf)',
  '12e (Aligre / Gare de Lyon)',
  '13e (Quartier Asiatique / BNF)',
  '14e (Montparnasse / Denfert)',
  '15e (Convention / Grenelle)',
  '16e (Passy / Trocadéro)',
  '17e (Batignolles / Ternes)',
  '18e (Montmartre / Lamarck)',
  '19e (La Villette / Buttes-Chaumont)',
  '20e (Belleville / Ménilmontant)',
];

export const COMMON_CUISINES = [
  'Bistrot & Cuisine Française',
  'Gastronomique & Étoilé',
  'Italien (Pizza & Pasta)',
  'Japonais (Sushi, Ramen, Izakaya)',
  'Brunch & Petit-Déjeuner',
  'Bar à vin & Petites assiettes',
  'Street Food & Burger',
  'Méditerranéen & Levant',
  'Asiatique Fusion (Coréen, Vietnamien, Thaï)',
  'Poissons & Fruits de mer',
  'Pâtisserie & Salon de thé',
  'Végétarien & Végétalien',
];
