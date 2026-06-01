// Netlify Function — Services de proximité (OpenStreetMap Overpass)
// GET /api/services?lat=48.8566&lon=2.3522&rayon=800
// Retourne le nombre d'aménités proches par catégorie (écoles, commerces,
// santé, transports, loisirs). Source : Overpass API (data ODbL, sans clé).
//
// Endpoint 100% additif : n'impacte aucune autre fonction.

import { cacheGet, cacheSet, cacheTag } from "./_cache.mjs";

const TIMEOUT_MS = 12000;
// Plusieurs miroirs Overpass pour la résilience
const OVERPASS_ENDPOINTS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResp(status, body) {
  return { statusCode: status, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

async function fetchTimeout(url, opts = {}, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

// Catégories analysées → filtres Overpass (clé/valeurs OSM)
const CATEGORIES = [
  {
    id: "ecoles", label: "Éducation", icon: "bi-mortarboard",
    filters: ['node["amenity"~"school|kindergarten|college|university"]'],
  },
  {
    id: "commerces", label: "Commerces", icon: "bi-shop",
    filters: ['node["shop"]'],
  },
  {
    id: "sante", label: "Santé", icon: "bi-heart-pulse",
    filters: ['node["amenity"~"pharmacy|hospital|clinic|doctors|dentist"]'],
  },
  {
    id: "transports", label: "Transports", icon: "bi-bus-front",
    filters: [
      'node["public_transport"~"station|stop_position|platform"]',
      'node["railway"~"station|tram_stop"]',
      'node["highway"="bus_stop"]',
    ],
  },
  {
    id: "loisirs", label: "Loisirs & culture", icon: "bi-tree",
    filters: [
      'node["leisure"~"park|sports_centre|fitness_centre|playground"]',
      'node["amenity"~"restaurant|cafe|cinema|theatre|library"]',
    ],
  },
];

function buildQuery(lat, lon, rayon) {
  const around = `(around:${rayon},${lat},${lon})`;
  const parts = [];
  for (const cat of CATEGORIES) {
    for (const f of cat.filters) {
      parts.push(`${f}${around};`);
    }
  }
  // out count uniquement → léger. On compte par requête séparée via id catégorie.
  return `[out:json][timeout:25];(${parts.join("")});out tags;`;
}

function classify(elements) {
  const counts = Object.fromEntries(CATEGORIES.map((c) => [c.id, 0]));
  for (const el of elements) {
    const tags = el.tags || {};
    if (tags.amenity && /^(school|kindergarten|college|university)$/.test(tags.amenity)) counts.ecoles++;
    else if (tags.shop) counts.commerces++;
    else if (tags.amenity && /^(pharmacy|hospital|clinic|doctors|dentist)$/.test(tags.amenity)) counts.sante++;
    else if (tags.public_transport || tags.railway || tags.highway === "bus_stop") counts.transports++;
    else if (tags.leisure || (tags.amenity && /^(restaurant|cafe|cinema|theatre|library)$/.test(tags.amenity))) counts.loisirs++;
  }
  return counts;
}

// Score "services de proximité" sur 100 (indicatif)
function scoreServices(counts) {
  // Pondérations : transports et commerces priment pour l'attractivité résidentielle
  const w = { transports: 2.0, commerces: 1.2, sante: 1.5, ecoles: 1.5, loisirs: 1.0 };
  let raw = 0;
  for (const [k, v] of Object.entries(counts)) raw += Math.min(v, 30) * (w[k] || 1);
  // Normalisation empirique : ~120 points bruts = quartier très bien équipé
  return Math.max(0, Math.min(100, Math.round((raw / 120) * 100)));
}

async function queryOverpass(query) {
  for (const endpoint of OVERPASS_ENDPOINTS) {
    try {
      const r = await fetchTimeout(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: "data=" + encodeURIComponent(query),
      });
      if (!r.ok) continue;
      const data = await r.json();
      if (data && Array.isArray(data.elements)) return data.elements;
    } catch (e) {
      // miroir suivant
    }
  }
  return null;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResp(200, {});

  const p = event.queryStringParameters || {};
  const lat = parseFloat(p.lat);
  const lon = parseFloat(p.lon);
  let rayon = parseInt(p.rayon, 10) || 800;
  rayon = Math.max(100, Math.min(2000, rayon)); // borne 100m–2km

  if (!Number.isFinite(lat) || !Number.isFinite(lon)) {
    return jsonResp(400, { error: "Paramètres 'lat' et 'lon' requis (nombres)" });
  }

  const cacheKey = cacheTag("services", lat.toFixed(4), lon.toFixed(4), rayon);
  const cached = await cacheGet(cacheKey);
  if (cached) return jsonResp(200, cached);

  const elements = await queryOverpass(buildQuery(lat, lon, rayon));
  if (elements === null) {
    // Échec silencieux : on renvoie une structure vide exploitable côté front
    return jsonResp(200, {
      disponible: false,
      rayon_m: rayon,
      categories: CATEGORIES.map((c) => ({ id: c.id, label: c.label, icon: c.icon, count: null })),
      score: null,
      source: "OpenStreetMap / Overpass (indisponible)",
    });
  }

  const counts = classify(elements);
  const result = {
    disponible: true,
    rayon_m: rayon,
    total: elements.length,
    categories: CATEGORIES.map((c) => ({
      id: c.id, label: c.label, icon: c.icon, count: counts[c.id],
    })),
    score: scoreServices(counts),
    source: "OpenStreetMap / Overpass (ODbL)",
  };

  await cacheSet(cacheKey, result);
  return jsonResp(200, result);
};
