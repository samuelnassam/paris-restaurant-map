import express, { Request, Response, NextFunction } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { z } from 'zod';

dotenv.config();

// Validate required environment variables
if (!process.env.GEMINI_API_KEY) {
  console.error('Missing required environment variable: GEMINI_API_KEY');
  process.exit(1);
}

const app = express();
const port = Number(process.env.PORT) || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Rate limiting: 100 requests per 15 minutes per IP
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
  skip: (req) => req.path === '/health',
});

// Apply rate limiting to all API routes
app.use('/api/', apiLimiter);

// Body parser with size limit
app.use(express.json({ limit: '10mb' }));

// Health check endpoint
app.get('/health', (_req: Request, res: Response) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// Initialize Google GenAI
const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'paris-restaurant-map/1.0',
    },
  },
});

// Timeout utility
const withTimeout = <T>(promise: Promise<T>, ms: number, timeoutMessage = 'Request timeout'): Promise<T> => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(timeoutMessage)), ms);
    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((error) => {
        clearTimeout(timer);
        reject(error);
      });
  });
};

// Zod schemas for request validation
const searchPlaceSchema = z.object({
  query: z.string().min(1).max(500, 'Query must be less than 500 characters'),
});

const conciergeChatSchema = z.object({
  messages: z.array(
    z.object({
      role: z.enum(['user', 'model', 'assistant']),
      text: z.string().min(1).max(5000),
    })
  ).min(1),
  contextRestaurants: z.array(
    z.object({
      id: z.string().optional(),
      name: z.string().optional(),
      address: z.string().optional(),
      arrondissement: z.string().optional(),
      cuisine: z.string().optional(),
      status: z.string().optional(),
      personalRating: z.number().optional(),
      mustTryDishes: z.array(z.string()).optional(),
      personalReview: z.string().optional(),
    })
  ).optional(),
});

// Error handler middleware
app.use((err: Error, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Endpoint: Search and geocode Paris restaurants with Gemini + Nominatim
app.post('/api/search-place', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { query } = searchPlaceSchema.parse(req.body);

    let geminiData: Record<string, any> | null = null;

    // Primary: Try Gemini AI
    try {
      const prompt = `Tu es un expert de la restauration et de la géolocalisation à Paris.
Pour l'établissement ou adresse parisienne suivante : "${query}", trouve les informations précises.
Fournis impérativement un JSON STRICT au format suivant sans markdown :
{
  "name": "Nom officiel du restaurant",
  "address": "Numéro et rue, code postal Paris (ex: 80 Rue de Charonne, 75011 Paris)",
  "arrondissement": "ex: 11e ou 3e (Marais)",
  "lat": 48.8566,
  "lng": 2.3522,
  "cuisine": "ex: Français / Bistrot, Italien, Japonais, Street Food, etc.",
  "priceRange": "€ ou €€ ou €€€ ou €€€€",
  "signatureDishes": ["Plat 1", "Plat 2"],
  "phone": "ex: +33 1 43 67 38 29 ou vide",
  "website": "URL officielle ou vide",
  "googleMapsUrl": "https://maps.google.com/?q=..."
}
Assure-toi que les coordonnées lat/lng correspondent précisément à Paris (latitude entre 48.81 et 48.91, longitude entre 2.22 et 2.47).`;

      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents: prompt,
        }),
        15000 // 15 seconds timeout
      );

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        try {
          geminiData = JSON.parse(jsonMatch[0]);
        } catch (parseErr) {
          console.warn('Failed to parse Gemini JSON response:', parseErr);
        }
      }
    } catch (aiErr: any) {
      console.warn('Gemini search place error (fallback to Nominatim):', aiErr?.message || aiErr);
    }

    // Coordinate verification & fallback via Nominatim if needed
    let finalLat = geminiData?.lat as number | undefined;
    let finalLng = geminiData?.lng as number | undefined;
    let finalAddress = geminiData?.address as string | undefined;
    let finalName = geminiData?.name || query;

    const isWithinParis =
      typeof finalLat === 'number' &&
      typeof finalLng === 'number' &&
      finalLat >= 48.8 &&
      finalLat <= 48.92 &&
      finalLng >= 2.2 &&
      finalLng <= 2.49;

    if (!isWithinParis) {
      try {
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(
          query + ' Paris France'
        )}&limit=3&viewbox=2.2241,48.9021,2.4699,48.8155&bounded=1`;

        const nomRes = await withTimeout(
          fetch(nominatimUrl, {
            headers: { 'User-Agent': 'ParisRestaurantMap/1.0' },
          }),
          5000 // 5 seconds timeout for Nominatim
        );

        if (nomRes.ok) {
          const places = (await nomRes.json()) as Array<{
            lat: string;
            lon: string;
            display_name: string;
          }>;
          if (places && places.length > 0) {
            finalLat = parseFloat(places[0].lat);
            finalLng = parseFloat(places[0].lon);
            if (!finalAddress) {
              finalAddress = places[0].display_name;
            }
          }
        }
      } catch (nomErr: any) {
        console.warn('Nominatim fallback failed:', nomErr?.message || nomErr);
      }
    }

    // Default fallback coordinates (Paris center)
    if (typeof finalLat !== 'number' || typeof finalLng !== 'number') {
      finalLat = 48.8566;
      finalLng = 2.3522;
    }

    // Extract arrondissement from address if not provided
    let arrondissement = geminiData?.arrondissement as string | undefined;
    if (!arrondissement && finalAddress) {
      const match = finalAddress.match(/750(0[1-9]|1[0-9]|20)/);
      if (match) {
        const num = parseInt(match[1], 10);
        arrondissement = num === 1 ? '1er' : `${num}e`;
      }
    }

    // Return sanitized restaurant data
    res.json({
      name: finalName,
      address: finalAddress || `${query}, Paris`,
      arrondissement: arrondissement || 'Paris',
      lat: finalLat,
      lng: finalLng,
      cuisine: geminiData?.cuisine || 'Bistrot / Français',
      priceRange: geminiData?.priceRange || '€€',
      signatureDishes: Array.isArray(geminiData?.signatureDishes)
        ? geminiData.signatureDishes
        : [],
      photos: [],
      phone: geminiData?.phone || '',
      website: geminiData?.website || '',
      googleMapsUrl:
        geminiData?.googleMapsUrl ||
        `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
          finalName + ' ' + (finalAddress || 'Paris')
        )}`,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Error in /api/search-place:', error);
    res.status(500).json({
      error: error.message || 'Failed to search for restaurant',
    });
  }
});

// Endpoint: Fetch photos - disabled for security
app.post('/api/fetch-restaurant-photos', async (_req: Request, res: Response): Promise<void> => {
  res.json({
    photos: [],
    count: 0,
    message: 'Automatic web photos disabled to prevent mismatched imagery.',
  });
});

// Endpoint: Multi-turn AI Concierge for Paris Food Recommendations
app.post('/api/concierge-chat', async (req: Request, res: Response): Promise<void> => {
  try {
    // Validate request body
    const { messages, contextRestaurants } = conciergeChatSchema.parse(req.body);

    const savedRestaurantsSummary =
      Array.isArray(contextRestaurants) && contextRestaurants.length > 0
        ? `Voici la liste actuelle des restaurants enregistrés dans le carnet personnel de l'utilisateur :\n${contextRestaurants
            .map(
              (r) =>
                `- "${r.name}" (${r.arrondissement || 'Paris'}, ${r.cuisine || 'Cuisine'}, Statut: ${
                  r.status === 'favorite'
                    ? 'Coup de cœur ❤️'
                    : r.status === 'tested'
                      ? 'Testé ✅'
                      : 'À tester 🧭'
                }, Note: ${r.personalRating ? r.personalRating + '/5' : 'Pas encore noté'}, Plats: ${
                  r.mustTryDishes?.join(', ') || 'N/A'
                }${r.personalReview ? ' - Avis perso: ' + r.personalReview : ''})`
            )
            .join('\n')}`
        : `L'utilisateur n'a pas encore de restaurants personnels enregistrés. Tu peux lui proposer les meilleures adresses de Paris.`;

    const systemInstruction = `Tu es "Le Concierge Gourmand", un critique gastronomique et guide personnel d'exception spécialisé dans les restaurants et bistrots de Paris.
Ton style est chaleureux, raffiné, enthousiaste, passionné et très concret (comme un bon ami parisien qui connaît toutes les meilleures tables et pépites cachées).

Tes rôles principaux :
1. Guider l'utilisateur en priorité parmi les restaurants de son carnet (indiqués ci-dessous) selon ses envies du moment (dîner en amoureux, fête entre amis, envie de vin naturel, street food, budget modéré ou étoilé).
2. S'il cherche de nouvelles inspirations, recommander d'authentiques pépites parisiennes avec leur quartier/arrondissement, leurs spécialités et leur fourchette de prix.
3. Conseiller sur les plats à ne pas manquer, les ambiances des arrondissements parisiens (du Haut-Marais à Bastille, de Belleville à Saint-Germain-des-Prés).

Informations du carnet de l'utilisateur :
${savedRestaurantsSummary}

Directives de réponse :
- Si tu mentionnes un restaurant déjà présent dans son carnet, mets son nom en **Gras** et précise qu'il est déjà dans son carnet (ex: "Dans tes favoris", "Dans ta liste à tester").
- Sois concis, structuré, vivant et précis. Évite le jargon creux.`;

    // Format messages for Gemini generateContent multi-turn contents
    const contents = messages.map((m) => ({
      role: m.role === 'model' || m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.text || '' }],
    }));

    let replyText = '';

    // Primary attempt: gemini-flash-latest
    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: 'gemini-flash-latest',
          contents,
          config: {
            systemInstruction,
          },
        }),
        15000 // 15 seconds timeout
      );
      replyText = response.text || '';
    } catch (primaryErr: any) {
      console.warn(
        'Primary model error, attempting fallback to gemini-3.1-flash-lite:',
        primaryErr?.message || primaryErr
      );
      try {
        const fallbackResponse = await withTimeout(
          ai.models.generateContent({
            model: 'gemini-3.1-flash-lite',
            contents,
            config: {
              systemInstruction,
            },
          }),
          15000
        );
        replyText = fallbackResponse.text || '';
      } catch (fallbackErr: any) {
        console.warn(
          'Fallback model error, preparing expert culinary response:',
          fallbackErr?.message || fallbackErr
        );

        // Curated Paris concierge intelligent fallback
        const lastUserMsg = messages[messages.length - 1]?.text?.toLowerCase() || '';
        if (contextRestaurants && contextRestaurants.length > 0) {
          const matching = contextRestaurants.find(
            (r) =>
              lastUserMsg.includes(r.name?.toLowerCase() || '') ||
              lastUserMsg.includes(r.arrondissement?.toLowerCase() || '') ||
              lastUserMsg.includes(r.cuisine?.toLowerCase() || '')
          );
          if (matching) {
            replyText = `D'après vos adresses, je vous recommande vivement **${matching.name}** (${matching.arrondissement}) ! C'est une excellente adresse pour votre envie (${matching.cuisine}). N'oubliez pas de goûter : ${matching.mustTryDishes?.join(', ') || 'leurs spécialités du jour'}.`;
          } else {
            const fav = contextRestaurants.find((r) => r.status === 'favorite') || contextRestaurants[0];
            replyText = `Pour ce soir, une valeur sûre de votre carnet est **${fav.name}** (${fav.arrondissement || 'Paris'}). Cuisine : ${fav.cuisine}. Parfait pour passer un délicieux moment à table !`;
          }
        } else {
          replyText = `Pour une magnifique soirée gourmande à Paris, je vous conseille de tester **Septime** (11e) pour une haute bistronomie vivante, **Bouillon Chartier** (9e) pour la tradition populaire dans un décor 1900 somptueux, ou **Chez Janou** (3e) pour une ambiance provençale festive au cœur du Marais avec son fameux saladier de mousse au chocolat !`;
        }
      }
    }

    res.json({
      reply:
        replyText ||
        'Je reste à votre disposition pour vous orienter vers les meilleures tables de Paris.',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      res.status(400).json({ error: 'Validation error', details: error.errors });
      return;
    }
    console.error('Error in /api/concierge-chat:', error);
    res.status(500).json({ error: error.message || 'Erreur du concierge gourmand' });
  }
});

// Endpoint: Download project ZIP - DISABLED for security
app.get('/api/download-project-zip', async (_req: Request, res: Response): Promise<void> => {
  res.status(404).json({
    error: 'Endpoint disabled for security reasons',
  });
});

// Start server with Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        watch: process.env.DISABLE_HMR === 'true' ? null : {},
      },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static('dist'));
    app.get('*', (_req, res) => {
      res.sendFile('dist/index.html', { root: '.' });
    });
  }

  app.listen(port, '0.0.0.0', () => {
    console.log(`Paris Restaurant Map server running at http://0.0.0.0:${port}`);
  });
}

startServer();

export default app;
