/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { RestaurantProvider, useRestaurants } from './context/RestaurantContext';
import { ParisMap } from './components/Map/ParisMap';
import { RestaurantSidebar } from './components/Sidebar/RestaurantSidebar';
import { RestaurantDetailModal } from './components/RestaurantDetail/RestaurantDetailModal';
import { AddRestaurantModal } from './components/AddRestaurant/AddRestaurantModal';
import { ConciergeChatModal } from './components/Concierge/ConciergeChatModal';
import { WelcomeModal } from './components/Onboarding/WelcomeModal';
import { Menu, Plus, Sparkles, MapPin, Compass, Crosshair, Sun, Moon, HelpCircle } from 'lucide-react';

const MainLayout: React.FC = () => {
  const [isSidebarOpenMobile, setIsSidebarOpenMobile] = useState(false);
  const [isWelcomeOpen, setIsWelcomeOpen] = useState(() => {
    return localStorage.getItem('paris_food_welcome_dismissed') !== 'true';
  });

  const {
    setIsAddModalOpen,
    setIsConciergeOpen,
    filteredRestaurants,
    isDarkMode,
    toggleDarkMode,
    locateUser,
    isLocating,
    userLocation,
  } = useRestaurants();

  return (
    <div className="relative w-screen h-screen flex overflow-hidden bg-zinc-100 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 font-sans">
      {/* Mobile Top App Bar */}
      <div className="md:hidden absolute top-0 left-0 right-0 z-20 h-14 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-md border-b border-zinc-200/80 dark:border-zinc-800 px-3 flex items-center justify-between">
        <button
          onClick={() => setIsSidebarOpenMobile(true)}
          className="p-2 text-zinc-700 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition flex items-center gap-1.5"
        >
          <Menu className="w-5 h-5" />
          <span className="font-serif font-bold text-sm tracking-tight">Paris Map</span>
          <span className="text-[11px] font-semibold text-rose-600 bg-rose-50 px-1.5 py-0.2 rounded-full">
            {filteredRestaurants.length}
          </span>
        </button>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsWelcomeOpen(true)}
            className="p-2 text-zinc-600 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition border border-zinc-200 dark:border-zinc-700"
            title="Guide & Présentation"
          >
            <HelpCircle className="w-4 h-4" />
          </button>

          <button
            onClick={locateUser}
            disabled={isLocating}
            className={`p-2 rounded-xl border transition ${
              userLocation
                ? 'bg-blue-50 text-blue-600 border-blue-200 dark:bg-blue-950/40 dark:border-blue-800'
                : 'text-zinc-600 dark:text-zinc-300 border-zinc-200 dark:border-zinc-700'
            }`}
            title="Me géolocaliser"
          >
            <Crosshair className="w-4 h-4" />
          </button>

          <button
            onClick={toggleDarkMode}
            className="p-2 text-zinc-600 dark:text-amber-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-xl transition border border-zinc-200 dark:border-zinc-700"
            title={isDarkMode ? 'Mode jour' : 'Mode nuit'}
          >
            {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>

          <button
            onClick={() => setIsConciergeOpen(true)}
            className="p-2 bg-rose-50 hover:bg-rose-100 text-rose-600 rounded-xl transition border border-rose-200/60"
            title="Concierge IA"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1 px-3 py-1.5 bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-rose-600 dark:hover:bg-rose-700 rounded-xl text-xs font-semibold shadow-sm transition"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Ajouter</span>
          </button>
        </div>
      </div>

      {/* Sidebar (Desktop visible, mobile slide-in) */}
      <RestaurantSidebar
        isOpen={isSidebarOpenMobile}
        onClose={() => setIsSidebarOpenMobile(false)}
        onOpenWelcome={() => setIsWelcomeOpen(true)}
      />

      {/* Main Map View Area */}
      <main className="flex-1 h-full w-full relative min-h-0 overflow-hidden pt-14 md:pt-0">
        <ParisMap />
      </main>

      {/* Welcome / Onboarding Modal */}
      <WelcomeModal
        isOpen={isWelcomeOpen}
        onClose={() => setIsWelcomeOpen(false)}
      />

      {/* Detailed Restaurant Sheet Modal */}
      <RestaurantDetailModal />

      {/* Add Restaurant Modal */}
      <AddRestaurantModal />

      {/* AI Concierge Chat Modal */}
      <ConciergeChatModal />
    </div>
  );
};

export default function App() {
  return (
    <RestaurantProvider>
      <MainLayout />
    </RestaurantProvider>
  );
}
