import React, { useState, useRef, useEffect } from 'react';
import { useRestaurants } from '../../context/RestaurantContext';
import {
  X,
  Send,
  Sparkles,
  User as UserIcon,
  Loader2,
  MapPin,
  UtensilsCrossed,
  RotateCcw
} from 'lucide-react';

interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: string;
}

const INITIAL_WELCOME: ChatMessage = {
  id: 'welcome',
  role: 'model',
  text: "Bonjour ! Je suis **Le Concierge Gourmand**, votre guide culinaire parisien. Je connais par cœur les restaurants enregistrés dans votre carnet et l'ensemble de la scène gastronomique de la capitale.\n\nQue vous cherchiez où dîner ce soir parmi vos adresses à tester, une idée de restaurant pour une occasion particulière ou le meilleur plat d'un quartier, demandez-moi !",
  timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
};

export const ConciergeChatModal: React.FC = () => {
  const {
    isConciergeOpen,
    setIsConciergeOpen,
    restaurants,
    setSelectedRestaurant,
    setMapCenter,
    setMapZoom,
  } = useRestaurants();

  const [messages, setMessages] = useState<ChatMessage[]>([INITIAL_WELCOME]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [lastFailedQuery, setLastFailedQuery] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  if (!isConciergeOpen) return null;

  const quickPrompts = [
    'Où dîner ce soir parmi mes adresses à tester ?',
    'Un bistrot romantique pour un dîner à deux',
    'Où trouver les meilleurs desserts ou brunch à Paris ?',
    'Un resto convivial entre amis avec bonne ambiance',
    'Recommande-moi une pépite selon mes coups de cœur',
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const queryText = textToSend || input;
    if (!queryText.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `usr_${Date.now()}`,
      role: 'user',
      text: queryText.trim(),
      timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setLastFailedQuery(null);

    try {
      const apiMessages = [...messages, userMsg].map((m) => ({
        role: m.role,
        text: m.text,
      }));

      const res = await fetch('/api/concierge-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: apiMessages,
          contextRestaurants: restaurants,
        }),
      });

      if (!res.ok) {
        throw new Error('Erreur de réponse du concierge');
      }

      const data = await res.json();
      const modelMsg: ChatMessage = {
        id: `bot_${Date.now()}`,
        role: 'model',
        text: data.reply || 'Je reste à votre écoute pour vos découvertes gourmandes à Paris.',
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err: any) {
      console.error('Concierge error:', err);
      setLastFailedQuery(queryText.trim());
      setMessages((prev) => [
        ...prev,
        {
          id: `err_${Date.now()}`,
          role: 'model',
          text: "Je n'ai pas pu joindre les carnets à cet instant. Vous pouvez relancer la question ci-dessous.",
          timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetChat = () => {
    setMessages([
      {
        ...INITIAL_WELCOME,
        timestamp: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      },
    ]);
    setLastFailedQuery(null);
  };

  // Helper to find and link restaurants from user list mentioned in chat
  const findMentionedRestaurants = (text: string) => {
    return restaurants.filter((r) =>
      text.toLowerCase().includes(r.name.toLowerCase())
    );
  };

  // Helper to render markdown bold and list items cleanly
  const renderFormattedText = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, lIdx) => {
      // Process **bold**
      const parts = line.split(/(\*\*[^*]+\*\*)/g);
      const formattedLine = parts.map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-bold text-zinc-900 dark:text-zinc-100">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const itemContent = line.trim().replace(/^[*\-]\s+/, '');
        const itemParts = itemContent.split(/(\*\*[^*]+\*\*)/g);
        return (
          <div key={lIdx} className="flex items-start gap-1.5 my-1 pl-1">
            <span className="text-rose-500 font-bold shrink-0">•</span>
            <span>
              {itemParts.map((part, pIdx) => {
                if (part.startsWith('**') && part.endsWith('**')) {
                  return (
                    <strong key={pIdx} className="font-bold text-zinc-900 dark:text-zinc-100">
                      {part.slice(2, -2)}
                    </strong>
                  );
                }
                return part;
              })}
            </span>
          </div>
        );
      }

      return (
        <div key={lIdx} className={line.trim() === '' ? 'h-2' : ''}>
          {formattedLine}
        </div>
      );
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-950 w-full max-w-xl h-[85vh] rounded-2xl shadow-2xl border border-zinc-200 dark:border-zinc-800 flex flex-col overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between bg-zinc-50/80 dark:bg-zinc-900/40">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-500 via-rose-600 to-amber-500 text-white flex items-center justify-center shadow-md shadow-rose-500/20">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-1.5">
                <span>Le Concierge Gourmand</span>
                <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 dark:bg-rose-950/40 px-1.5 py-0.2 rounded border border-rose-200 dark:border-rose-800">
                  IA Paris
                </span>
              </h2>
              <p className="text-[11px] text-zinc-500">
                Conseiller gastronomique basé sur vos adresses et Paris
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={handleResetChat}
              className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg transition"
              title="Recommencer la conversation"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setIsConciergeOpen(false)}
              className="p-1.5 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 rounded-lg transition"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Messages List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {messages.map((msg) => {
            const isUser = msg.role === 'user';
            const mentioned = !isUser ? findMentionedRestaurants(msg.text) : [];

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isUser ? 'justify-end' : 'justify-start'}`}
              >
                {!isUser && (
                  <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0 mt-0.5">
                    <UtensilsCrossed className="w-3.5 h-3.5" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-3 text-xs leading-relaxed space-y-2 ${
                    isUser
                      ? 'bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 rounded-tr-xs shadow-sm'
                      : 'bg-zinc-100/90 dark:bg-zinc-900/90 text-zinc-800 dark:text-zinc-200 border border-zinc-200/60 dark:border-zinc-800 rounded-tl-xs'
                  }`}
                >
                  <div className="space-y-1">{renderFormattedText(msg.text)}</div>

                  {/* Mentioned restaurants quick buttons */}
                  {mentioned.length > 0 && (
                    <div className="pt-2 border-t border-zinc-200/50 dark:border-zinc-700/50 flex flex-wrap gap-1.5">
                      <span className="text-[10px] text-zinc-500 w-full font-medium">
                        Dans votre carnet (cliquez pour voir sur la carte) :
                      </span>
                      {mentioned.map((r) => (
                        <button
                          key={r.id}
                          onClick={() => {
                            setSelectedRestaurant(r);
                            setMapCenter([r.lat, r.lng]);
                            setMapZoom(16);
                            setIsConciergeOpen(false);
                          }}
                          className="px-2 py-1 text-[11px] font-semibold bg-white dark:bg-zinc-800 text-rose-600 dark:text-rose-400 rounded-lg shadow-xs hover:bg-rose-50 flex items-center gap-1 border border-rose-200 dark:border-rose-900 transition"
                        >
                          <MapPin className="w-3 h-3" />
                          <span>{r.name} ({r.arrondissement})</span>
                        </button>
                      ))}
                    </div>
                  )}

                  <div className="text-[9px] opacity-50 text-right">
                    {msg.timestamp}
                  </div>
                </div>

                {isUser && (
                  <div className="w-7 h-7 rounded-lg bg-rose-500 text-white flex items-center justify-center shrink-0 mt-0.5">
                    <UserIcon className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="w-7 h-7 rounded-lg bg-zinc-900 text-white dark:bg-zinc-100 dark:text-zinc-900 flex items-center justify-center shrink-0">
                <UtensilsCrossed className="w-3.5 h-3.5" />
              </div>
              <div className="bg-zinc-100 dark:bg-zinc-900 rounded-2xl rounded-tl-xs px-4 py-3 text-xs flex items-center gap-2 text-zinc-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-rose-500" />
                <span>Le concierge consulte ses carnets et prépare sa recommandation...</span>
              </div>
            </div>
          )}

          {lastFailedQuery && (
            <div className="flex justify-center">
              <button
                onClick={() => handleSendMessage(lastFailedQuery)}
                className="px-3 py-1.5 text-xs bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-300 border border-rose-200 dark:border-rose-800 rounded-xl flex items-center gap-1.5 hover:bg-rose-100 transition"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Réessayer la dernière question</span>
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Quick prompt suggestions chips */}
        <div className="px-4 py-2 border-t border-zinc-100 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/30 flex gap-1.5 overflow-x-auto no-scrollbar">
          {quickPrompts.map((prompt, i) => (
            <button
              key={i}
              onClick={() => handleSendMessage(prompt)}
              className="px-2.5 py-1 text-[11px] bg-white dark:bg-zinc-800 hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-zinc-700 text-zinc-600 dark:text-zinc-300 rounded-lg border border-zinc-200 dark:border-zinc-700 whitespace-nowrap transition"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar */}
        <div className="p-3.5 border-t border-zinc-100 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage();
            }}
            className="flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Posez votre question gourmande au concierge..."
              className="flex-1 px-4 py-2.5 text-xs bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-xl text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500"
            />
            <button
              type="submit"
              disabled={isLoading || !input.trim()}
              className="p-2.5 bg-zinc-900 hover:bg-zinc-800 disabled:opacity-50 text-white rounded-xl shadow-sm transition"
              title="Envoyer"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
