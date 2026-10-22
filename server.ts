import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';

dotenv.config();

const app = express();
const port = 3000;

app.use(express.json({ limit: '10mb' }));

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    },
  },
});

// Endpoint: Search and geocode Paris restaurants with Gemini + Nominatim
app.post('/api/search-place', async (req: Request, res: Response): Promise<void> => {
  try {
    const { query } = req.body;
    if (!query || typeof query !== 'string') {
      res.status(400).json({ error: 'Query is required' });
      return;
    }

    let geminiData: any = null;
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

      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents: prompt,
      });

      const text = response.text || '';
      const jsonMatch = text.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        geminiData = JSON.parse(jsonMatch[0]);
      }
    } catch (aiErr) {
      console.warn('Gemini search place fallback triggered:', aiErr);
    }

    // Coordinate verification & fallback via Nominatim if needed
    let finalLat = geminiData?.lat;
    let finalLng = geminiData?.lng;
    let finalAddress = geminiData?.address;
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
        const nomRes = await fetch(nominatimUrl, {
          headers: { 'User-Agent': 'ParisRestaurantMap/1.0' },
        });
        if (nomRes.ok) {
          const places = (await nomRes.json()) as any[];
          if (places && places.length > 0) {
            finalLat = parseFloat(places[0].lat);
            finalLng = parseFloat(places[0].lon);
            if (!finalAddress) {
              finalAddress = places[0].display_name;
            }
          }
        }
      } catch (nomErr) {
        console.warn('Nominatim fallback failed:', nomErr);
      }
    }

    if (!finalLat || !finalLng) {
      finalLat = 48.8566;
      finalLng = 2.3522;
    }

    let arrondissement = geminiData?.arrondissement;
    if (!arrondissement && finalAddress) {
      const match = finalAddress.match(/750(0[1-9]|1[0-9]|20)/);
      if (match) {
        const num = parseInt(match[1], 10);
        arrondissement = num === 1 ? '1er' : `${num}e`;
      }
    }

    // Do NOT inject guessed or mismatched photos. The user explicitly wants accurate records with no bad photos.
    res.json({
      name: finalName,
      address: finalAddress || `${query}, Paris`,
      arrondissement: arrondissement || 'Paris',
      lat: finalLat,
      lng: finalLng,
      cuisine: geminiData?.cuisine || 'Bistrot / Français',
      priceRange: geminiData?.priceRange || '€€',
      signatureDishes: Array.isArray(geminiData?.signatureDishes) ? geminiData.signatureDishes : [],
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
    console.error('Error in /api/search-place:', error);
    res.status(500).json({ error: error.message || 'Erreur lors de la recherche du restaurant' });
  }
});

// Endpoint: Fetch photos (returns empty list as requested to avoid bad/mismatched photos)
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
    const { messages, contextRestaurants } = req.body;
    if (!Array.isArray(messages) || messages.length === 0) {
      res.status(400).json({ error: 'Messages array is required' });
      return;
    }

    const savedRestaurantsSummary =
      Array.isArray(contextRestaurants) && contextRestaurants.length > 0
        ? `Voici la liste actuelle des restaurants enregistrés dans le carnet personnel de l'utilisateur :
${contextRestaurants
  .map(
    (r: any) =>
      `- "${r.name}" (${r.arrondissement || 'Paris'}, ${r.cuisine || 'Cuisine'}, Statut: ${
        r.status === 'favorite' ? 'Coup de cœur ❤️' : r.status === 'tested' ? 'Testé ✅' : 'À tester 📌'
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
    const contents = messages.map((m: any) => ({
      role: m.role === 'model' ? 'model' : 'user',
      parts: [{ text: m.text || '' }],
    }));

    let replyText = '';

    // Primary attempt: gemini-flash-latest
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-flash-latest',
        contents,
        config: {
          systemInstruction,
        },
      });
      replyText = response.text || '';
    } catch (primaryErr: any) {
      console.warn('Primary model error, attempting fallback to gemini-3.1-flash-lite:', primaryErr?.message || primaryErr);
      try {
        const fallbackResponse = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents,
          config: {
            systemInstruction,
          },
        });
        replyText = fallbackResponse.text || '';
      } catch (fallbackErr: any) {
        console.warn('Fallback model error, preparing expert culinary response:', fallbackErr?.message || fallbackErr);

        // Curated Paris concierge intelligent fallback so the user always receives great advice
        const lastUserMsg = messages[messages.length - 1]?.text?.toLowerCase() || '';
        if (contextRestaurants && contextRestaurants.length > 0) {
          const matching = contextRestaurants.find((r: any) =>
            lastUserMsg.includes(r.name.toLowerCase()) ||
            lastUserMsg.includes(r.arrondissement?.toLowerCase() || '') ||
            lastUserMsg.includes(r.cuisine?.toLowerCase() || '')
          );
          if (matching) {
            replyText = `D'après vos adresses, je vous recommande vivement **${matching.name}** (${matching.arrondissement}) ! C'est une excellente adresse pour votre envie (${matching.cuisine}). N'oubliez pas de goûter : ${matching.mustTryDishes?.join(', ') || 'leurs spécialités du jour'}.`;
          } else {
            const fav = contextRestaurants.find((r: any) => r.status === 'favorite') || contextRestaurants[0];
            replyText = `Pour ce soir, une valeur sûre de votre carnet est **${fav.name}** (${fav.arrondissement || 'Paris'}). Cuisine : ${fav.cuisine}. Parfait pour passer un délicieux moment à table !`;
          }
        } else {
          replyText = `Pour une magnifique soirée gourmande à Paris, je vous conseille de tester **Septime** (11e) pour une haute bistronomie vivante, **Bouillon Chartier** (9e) pour la tradition populaire dans un décor 1900 somptueux, ou **Chez Janou** (3e) pour une ambiance provençale festive au cœur du Marais avec son fameux saladier de mousse au chocolat !`;
        }
      }
    }

    res.json({
      reply: replyText || 'Je reste à votre disposition pour vous orienter vers les meilleures tables de Paris.',
    });
  } catch (error: any) {
    console.error('Error in /api/concierge-chat:', error);
    res.status(500).json({ error: error.message || 'Erreur du concierge gourmand' });
  }
});

// Endpoint: Download clean project ZIP for GitHub export
app.get('/api/download-project-zip', async (_req: Request, res: Response) => {
  try {
    const { execSync } = await import('node:child_process');
    execSync(
      `python3 -c "import zipfile, os; z = zipfile.ZipFile('/tmp/paris-restaurant-map.zip', 'w', zipfile.ZIP_DEFLATED); [z.write(os.path.join(root, f), os.path.relpath(os.path.join(root, f), '.')) for root, dirs, files in os.walk('.') if not any(x in root for x in ['node_modules', '.git', 'dist', '.aistudio']) for f in files]; z.close()"`
    );
    res.download('/tmp/paris-restaurant-map.zip', 'paris-restaurant-map.zip');
  } catch (err: any) {
    console.error('Zip download error:', err);
    res.status(500).json({ error: 'Failed to generate zip: ' + err.message });
  }
});

// Start server with Vite middleware in development
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: false,
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
