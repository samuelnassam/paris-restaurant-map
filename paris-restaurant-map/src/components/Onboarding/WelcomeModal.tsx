import React, { useState, useEffect } from 'react';
import { useRestaurants } from '../../context/RestaurantContext';
import {
  Sparkles,
  MapPin,
  Utensils,
  LogIn,
  Check,
  Zap,
  Compass,
  Heart,
  X,
  Share2,
  BookmarkCheck
} from 'lucide-react';

interface WelcomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose }) => {
  const { user, loginWithGoogle, restaurants } = useRestaurants();
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    if (dontShowAgain) {
      localStorage.setItem('paris_food_welcome_dismissed', 'true');
    }
  }, [dontShowAgain]);

  const handleClose = () => {
    if (dontShowAgain) {
      localStorage.setItem('paris_food_welcome_dismissed', 'true');
    }
    onClose();
  };

  const handleGoogleSignIn = async () => {
    await loginWithGoogle();
    handleClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-xl rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
        {/* Header Hero */}
        <div className="relative p-6 sm:p-7 bg-gradient-to-br from-rose-500 via-rose-600 to-amber-600 text-white">
          <button
            onClick={handleClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-black/20 hover:bg-black/30 text-white/90 hover:text-white transition"
            title="Fermer"
          >
            <X className="w-4 h-4" />
          </button>

          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-white/20 backdrop-blur-md text-xs font-semibold uppercase tracking-wider mb-3">
            <Utensils className="w-3.5 h-3.5" />
            <span>Guide & Carnet Gastronomique</span>
          </div>

          <h2 className="font-serif text-2xl sm:text-3xl font-bold tracking-tight leading-tight">
            Bienvenue sur Paris Restaurant Map
          </h2>
          <p className="text-rose-100 text-sm mt-1.5 max-w-md leading-relaxed">
            Votre carnet d'adresses personnel pour cartographier, noter et dénicher les meilleures tables de Paris.
          </p>
        </div>

        {/* 3 Pillars Content */}
        <div className="p-6 sm:p-7 space-y-4 overflow-y-auto max-h-[60vh]">
          {/* Pillar 1 */}
          <div className="flex gap-3.5 items-start">
            <div className="w-10 h-10 rounded-xl bg-rose-50 dark:bg-rose-950/40 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 border border-rose-100 dark:border-rose-900/40">
              <MapPin className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                1. Carte interactive des 20 arrondissements
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Repérez instantanément vos <strong>Coups de cœur</strong>, <strong>Adresses testées</strong> et <strong>À tester</strong>. Filtrez par quartier, type de cuisine, budget, ou distance par rapport à votre position.
              </p>
            </div>
          </div>

          {/* Pillar 2 */}
          <div className="flex gap-3.5 items-start">
            <div className="w-10 h-10 rounded-xl bg-amber-50 dark:bg-amber-950/40 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 border border-amber-100 dark:border-amber-900/40">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                2. Concierge Gourmand IA
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Votre sommelier & guide parisien virtuel propulsé par Gemini. Demandez-lui une recommandation sur mesure : <em>« Une terrasse romantique dans le Marais »</em>, <em>« Le meilleur bistrot sous 30€ »</em>, etc.
              </p>
            </div>
          </div>

          {/* Pillar 3 */}
          <div className="flex gap-3.5 items-start">
            <div className="w-10 h-10 rounded-xl bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 border border-blue-100 dark:border-blue-900/40">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                3. Expérience ultra-fluide & Recherche instantanée
              </h3>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5 leading-relaxed">
                Navigation réactive, géolocalisation en temps réel pour trouver les tables autour de vous, filtres instantanés par arrondissement et carnet accessible partout, même en déplacement dans Paris.
              </p>
            </div>
          </div>

          {/* Cloud Account vs Guest Mode */}
          <div className="p-3.5 rounded-xl bg-zinc-50 dark:bg-zinc-900/70 border border-zinc-200/80 dark:border-zinc-800 text-xs">
            <div className="flex items-center gap-2 font-semibold text-zinc-800 dark:text-zinc-200 mb-1">
              <BookmarkCheck className="w-4 h-4 text-rose-500" />
              <span>Utilisation libre & Inscription optionnelle</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400 leading-relaxed">
              L'application fonctionne immédiatement en mode invité (sauvegardé sur ce navigateur). Pour synchroniser vos adresses entre votre mobile et votre ordinateur, connectez-vous simplement avec votre compte Google.
            </p>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="p-5 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex flex-col sm:flex-row items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-xs text-zinc-500 dark:text-zinc-400 cursor-pointer self-start sm:self-auto">
            <input
              type="checkbox"
              checked={dontShowAgain}
              onChange={(e) => setDontShowAgain(e.target.checked)}
              className="rounded border-zinc-300 text-rose-600 focus:ring-rose-500"
            />
            <span>Ne plus afficher au démarrage</span>
          </label>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {!user ? (
              <button
                onClick={handleGoogleSignIn}
                className="flex-1 sm:flex-none px-4 py-2 text-xs font-semibold text-zinc-700 dark:text-zinc-200 bg-white dark:bg-zinc-800 hover:bg-zinc-100 dark:hover:bg-zinc-700 border border-zinc-200 dark:border-zinc-700 rounded-xl transition flex items-center justify-center gap-1.5"
              >
                <LogIn className="w-3.5 h-3.5" />
                <span>Connexion Google</span>
              </button>
            ) : null}

            <button
              onClick={handleClose}
              className="flex-1 sm:flex-none px-5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-xl shadow-xs transition"
            >
              Explorer la carte
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
