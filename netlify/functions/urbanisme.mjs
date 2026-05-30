// Netlify Function — Réglementation urbanistique (GPU / PLU)
// POST /api/urbanisme
// Body : { lat, lon, code_insee }

import { cacheGet, cacheSet, cacheTag } from "./_cache.mjs";

const TIMEOUT_MS = 8000;
const GPU_BASE   = "https://apicarto.ign.fr/api/gpu";

const CORS_HEADERS = {
  "Content-Type"                : "application/json; charset=utf-8",
  "Access-Control-Allow-Origin" : "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResp(status, body) {
  return { statusCode: status, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

async function fetchTimeout(url, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try {
    return await fetch(url, { signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function safeGetJson(url) {
  try {
    const r = await fetchTimeout(url);
    if (!r.ok) return null;
    return await r.json();
  } catch {
    return null;
  }
}

// ─── Catégories PLU standard (R151-17 à R151-24 du Code de l'Urbanisme) ────────
const ZONE_TYPES = {
  U: {
    label: "Zone Urbaine",
    color: "#1565C0", text: "#fff",
    desc: "Zone déjà urbanisée et équipée. La construction y est en principe autorisée, sous réserve des règles locales (hauteur, emprise, retrait, etc.) fixées par le PLU.",
  },
  AU: {
    label: "Zone À Urbaniser",
    color: "#E65100", text: "#fff",
    desc: "Zone naturelle ou agricole destinée à être ouverte à l'urbanisation à court ou moyen terme. Constructible à condition de respecter les orientations d'aménagement et de programmation (OAP).",
  },
  A: {
    label: "Zone Agricole",
    color: "#6D4C41", text: "#fff",
    desc: "Zone protégée pour son potentiel agronomique, biologique ou économique. La constructibilité y est très limitée (exploitations agricoles et installations strictement nécessaires au service public).",
  },
  N: {
    label: "Zone Naturelle et Forestière",
    color: "#2E7D32", text: "#fff",
    desc: "Zone à protéger pour ses qualités naturelles, paysagères, historiques ou écologiques. Les constructions nouvelles y sont fortement restreintes voire interdites.",
  },
};

function zoneInfo(typezone) {
  const key = (typezone || "").replace(/\d+$/, "").toUpperCase();
  return ZONE_TYPES[key] || {
    label: typezone ? `Zone ${typezone}` : "Zone inconnue",
    color: "#757575", text: "#fff",
    desc: "Type de zone non classifié — consultez directement le PLU de la commune pour les règles applicables.",
  };
}

// ─── Zones PLU au point ──────────────────────────────────────────────────────
async function getZones(lat, lon) {
  const geom = JSON.stringify({ type: "Point", coordinates: [lon, lat] });
  const url  = `${GPU_BASE}/zone-urba?geom=${encodeURIComponent(geom)}`;
  const data = await safeGetJson(url);
  if (!data?.features?.length) return [];

  return data.features.map(f => {
    const p    = f.properties || {};
    const info = zoneInfo(p.typezone);
    return {
      typezone  : p.typezone   || null,
      libelle   : p.libelle    || null,
      libelong  : p.libelong   || null,
      idurba    : p.idurba     || null,
      datappro  : p.datappro   || null,
      urlfic    : p.urlfic     || null,
      partition : p.partition  || null,
      l_destdomi: p.l_destdomi || null,
      l_protect : p.l_protect  || null,
      zone_label: info.label,
      zone_color: info.color,
      zone_text : info.text,
      zone_desc : info.desc,
    };
  });
}

// ─── Document d'urbanisme au point ──────────────────────────────────────────
async function getDocument(lat, lon) {
  const geom = JSON.stringify({ type: "Point", coordinates: [lon, lat] });
  const url  = `${GPU_BASE}/document?geom=${encodeURIComponent(geom)}`;
  const data = await safeGetJson(url);
  if (!data?.features?.length) return null;

  const p = data.features[0].properties || {};
  return {
    nom      : p.nomdoc   || null,
    type_doc : p.typedoc  || null,
    etat     : p.etat     || null,
    datappro : p.datappro || null,
    datvalid : p.datvalid || null,
    urlfic   : p.urlfic   || null,
    idurba   : p.idurba   || null,
  };
}

// ─── Handler ────────────────────────────────────────────────────────────────
export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResp(200, {});

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch { return jsonResp(400, { error: "Corps JSON invalide" }); }

  const { lat, lon, code_insee } = body;
  if (!lat || !lon) return jsonResp(400, { error: "Coordonnées (lat, lon) requises" });

  // Cache sur la position arrondie à ~100 m
  const cacheKey = cacheTag("urba", String(lat).slice(0, 7), String(lon).slice(0, 7));
  const cached   = await cacheGet(cacheKey);
  if (cached) return jsonResp(200, cached);

  const [zones, document_plu] = await Promise.all([
    getZones(lat, lon).catch(() => []),
    getDocument(lat, lon).catch(() => null),
  ]);

  const result = {
    zones,
    document_plu,
    lat, lon,
    note  : "Données issues du Géoportail de l'Urbanisme (GPU) — IGN / DGALN. À titre informatif uniquement : consultez le service urbanisme de la mairie pour toute démarche officielle.",
    source: "https://www.geoportail-urbanisme.gouv.fr/",
  };

  if (zones.length > 0) await cacheSet(cacheKey, result);

  return jsonResp(200, result);
};
