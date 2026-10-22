# 🍽️ Paris Restaurant Map & Concierge Gourmand IA

> **Application Full-Stack moderne de cartographie gastronomique et concierge culinaire intelligent pour les 20 arrondissements de Paris.**

[![React](https://img.shields.io/badge/React-19.0-61DAFB?logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Tailwind CSS v4](https://img.shields.io/badge/Tailwind_CSS-v4-38B2AC?logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Google Gemini Flash](https://img.shields.io/badge/Google_Gemini-Flash_AI-4285F4?logo=google&logoColor=white)](https://ai.google.dev/)
[![Leaflet](https://img.shields.io/badge/Leaflet-1.9-199900?logo=leaflet&logoColor=white)](https://leafletjs.com/)
[![Firebase](https://img.shields.io/badge/Firebase-Auth_%26_Firestore-FFCA28?logo=firebase&logoColor=black)](https://firebase.google.com/)
[![Vite](https://img.shields.io/badge/Vite-8.x-646CFF?logo=vite&logoColor=white)](https://vitejs.dev/)

---

## 🌟 Présentation du Projet

**Paris Restaurant Map** est une application web interactive conçue pour les passionnés de gastronomie parisienne. Elle permet de cartographier, noter, organiser et découvrir des restaurants à travers les 20 arrondissements de Paris, tout en bénéficiant de l'expertise d'un **Concierge Gourmand propulsé par l'IA Gemini**.

L'application a été pensée avec une approche **Offline-First & Cloud Sync** : utilisable immédiatement sans friction en mode invité avec persistance locale (`localStorage`), avec la possibilité de synchroniser l'ensemble de ses adresses sur le Cloud via **Firebase Firestore** et **Google Authentication**.

---

## ✨ Fonctionnalités Clés

### 🗺️ 1. Cartographie Interactive Spécifique à Paris (Leaflet OSM)
- **Centrage et limites strictes sur Paris intra-muros** (coordonnées GPS et zoom calibrés).
- **Thèmes adaptatifs Jour / Nuit** : Cartographie tuiles claires (Voyager) et sombres (CartoDB Dark Matter) synchronisées avec le mode sombre de l'interface.
- **Marqueurs dynamiques et colorés** selon le statut de chaque établissement (*Coup de cœur*, *À tester*, *Testé*, *À éviter*).
- **Sélection interactive sur la carte** : Clic sur une adresse pour afficher sa fiche détaillée et centrer la vue avec animation fluide.

### 🤖 2. Concierge Gourmand IA (Google Gemini Flash)
- **Agent culinaire conversationnel** connecté en backend via le SDK `@google/genai`.
- **Raisonnement contextualisé** : Le concierge analyse en temps réel les restaurants enregistrés par l'utilisateur, ses coups de cœur et son quartier pour formuler des recommandations ultra-pertinentes.
- **Architecture résiliente avec fallback en cascade** : Basculement automatique en cas de latence et moteur expert parisien de secours pour garantir 100% de disponibilité.

### 📍 3. Géolocalisation & Calcul de Distance en Temps Réel
- Détection de la position GPS de l'utilisateur avec prise en compte de la précision.
- **Calcul instantané de la distance** séparant l'utilisateur de chaque restaurant (formule de Haversine).
- **Tri automatique par proximité** (« 📍 Plus proche de moi »).
- Raccourci direct **« Itinéraire Maps »** ouvrant le trajet piéton / transports dans Google Maps.

### 🔍 4. Moteur de Recherche & Géocodage Intelligent
- Recherche d'établissements avec extraction automatique des coordonnées, de l'arrondissement et des spécialités culinaires via l'IA et l'API Nominatim.
- **Détection des doublons** en temps réel (par nom et adresse) pour éviter les entrées redondantes.

### 📸 5. Gestionnaire de Photos & Fiche Détaillée
- Galerie interactive avec visionneuse plein écran (**Lightbox**).
- Importation d'images par URL externe ou téléversement de fichiers locaux avec encodage Base64.
- Choix de la photo de couverture et prévisualisations culinaires soignées.
- Partage en 1 clic de la fiche restaurant (presse-papier ou API native `navigator.share`).

### 🏷️ 6. Organisation en Collections Personnalisées
- Création de listes thématiques personnalisables (*Ex: « Dimanche midi », « Street food pépite », « Dîner romantique »*) avec pastilles de couleur.
- Filtrage croisé combinant : statut, type de cuisine, arrondissement, fourchette de prix (€ à €€€€), note personnelle et distance.

### 🔐 7. Persistance Hybride (Mode Invité + Cloud Firestore)
- **Mode Invité immédiat** : Aucune barrière à l'entrée, stockage persistant dans le navigateur.
- **Synchronisation Google 1-clic** : Sauvegarde sécurisée dans Firebase Firestore pour retrouver ses adresses sur smartphone, tablette et ordinateur.
- **Règles de sécurité Firestore granulaires** : Cloisonnement strict des données utilisateur par `userId`.
- **Export JSON complet** : Téléchargement et sauvegarde locale du carnet en un clic.

---

## 🛠️ Architecture Technique

```
├── server.ts                    # Serveur Express backend + Proxy API Gemini & Géocodage
├── src/
│   ├── main.tsx                 # Point d'entrée React 19
│   ├── App.tsx                  # Layout principal & intégration des modales
│   ├── context/
│   │   └── RestaurantContext.tsx # État global (Restaurants, Filtres, Auth, GPS)
│   ├── lib/
│   │   ├── firebase.ts          # Initialisation Firebase Auth & Firestore
│   │   └── demoData.ts          # Données de démonstration parisiennes
│   ├── types/
│   │   └── restaurant.ts        # Typage TypeScript strict des modèles
│   └── components/
│       ├── Map/
│       │   └── ParisMap.tsx     # Composant cartographique Leaflet
│       ├── Sidebar/
│       │   └── RestaurantSidebar.tsx # Liste, recherche, filtres et tri GPS
│       ├── RestaurantDetail/
│       │   └── RestaurantDetailModal.tsx # Fiche complète, édition, photos & partage
│       ├── AddRestaurant/
│       │   └── AddRestaurantModal.tsx # Formulaire d'ajout & géocodage IA
│       ├── Concierge/
│       │   └── ConciergeChatModal.tsx # Interface de chat avec l'IA Gemini
│       └── Onboarding/
│           └── WelcomeModal.tsx # Modale d'accueil et présentation
├── firestore.rules              # Règles de sécurité Firestore
├── vite.config.ts               # Configuration Vite & Tailwind CSS v4
└── package.json
```

---

## 🚀 Installation & Démarrage en Local

### Prérequis
- [Node.js](https://nodejs.org/) (version 20+ recommandée)
- Un compte [Google AI Studio](https://aistudio.google.com/) pour obtenir une clé API Gemini (gratuite)

### 1. Cloner le dépôt
```bash
git clone https://github.com/VOTRE_PSEUDO/paris-restaurant-map.git
cd paris-restaurant-map
```

### 2. Installer les dépendances
```bash
npm install
```

### 3. Configurer les variables d'environnement
Créez un fichier `.env` à la racine en vous basant sur `.env.example` :
```env
GEMINI_API_KEY="votre_cle_api_gemini"
PORT=3000
```

### 4. Lancer le serveur de développement
```bash
npm run dev
```
Ouvrez [http://localhost:3000](http://localhost:3000) dans votre navigateur.

### 5. Construire pour la production
```bash
npm run build
npm start
```

---


---

## 📄 Licence

Ce projet est sous licence [Apache 2.0](LICENSE).
