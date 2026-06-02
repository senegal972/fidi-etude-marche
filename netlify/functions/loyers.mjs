// Netlify Function — Loyers de référence (Carte des loyers DHUP/ANIL 2025)
// GET /api/loyers?code_insee=37099&prix_m2=3200
// Retourne le loyer d'annonce estimé au m²/mois (appartement & maison) pour une
// commune, via la Tabular API data.gouv.fr. Si prix_m2 est fourni, calcule le
// rendement locatif brut implicite — utile pour l'avis de valeur (méthode par
// capitalisation).
// Source : « Carte des loyers » — Ministère de la Transition écologique (DHUP),
// millésime 2025. Données ouvertes (Licence Ouverte / Etalab).
//
// Endpoint 100% additif : n'impacte aucune autre fonction.

import { cacheGet, cacheSet, cacheTag } from "./_cache.mjs";

const TIMEOUT_MS = 8000;
const TABULAR_BASE = "https://tabular-api.data.gouv.fr/api/resources";

// Ressources « Carte des loyers » 2025 (data.gouv.fr — dataset 693aa2feed1bf4da603faa49)
const RESOURCES = {
  appartement:       "55b34088-0964-415f-9df7-d87dd98a09be", // tous appartements
  appartement_t1t2:  "14a1fe11-b2d1-49b3-9f6b-83d12df9482c", // 1 ou 2 pièces
  appartement_t3p:   "5e3b28a4-cf56-43a3-ae79-43cceeb27f8c", // 3 pièces ou plus
  maison:            "129f764d-b613-44e4-952c-5ff50a8c9b73", // maisons
};

const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResp(status, body) {
  return { statusCode: status, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

async function fetchTimeout(url, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

function round2(x) {
  const n = Number(x);
  return Number.isFinite(n) ? Math.round(n * 100) / 100 : null;
}

// Fiabilité de la prédiction d'après le nombre d'observations communales
function fiabilite(nbobsCom, typpred) {
  const n = parseInt(nbobsCom, 10) || 0;
  if (typpred === "commune" || n >= 50) return "élevée";
  if (n >= 10) return "moyenne";
  return "indicative"; // prédiction par « maille » (voisinage), peu d'annonces locales
}

// Interroge une ressource pour un code INSEE donné
async function fetchLoyer(resourceId, codeInsee) {
  const url = `${TABULAR_BASE}/${resourceId}/data/?INSEE_C__exact=${encodeURIComponent(codeInsee)}`;
  try {
    const r = await fetchTimeout(url, TIMEOUT_MS);
    if (!r.ok) return null;
    const data = await r.json();
    const row = (data.data || [])[0];
    if (!row || row.loypredm2 == null) return null;
    return {
      loyer_m2: round2(row.loypredm2),
      fourchette_basse: round2(row["lwr.IPm2"]),
      fourchette_haute: round2(row["upr.IPm2"]),
      fiabilite: fiabilite(row.nbobs_com, row.TYPPRED),
      nb_observations: parseInt(row.nbobs_com, 10) || 0,
      commune: row.LIBGEO || null,
    };
  } catch (e) {
    return null;
  }
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResp(200, {});

  const p = event.queryStringParameters || {};
  const codeInsee = (p.code_insee || "").trim();
  const prixM2 = parseFloat(p.prix_m2); // optionnel : pour le rendement

  if (!/^[0-9][0-9AB][0-9]{3}$/i.test(codeInsee)) {
    return jsonResp(400, { error: "Paramètre 'code_insee' requis (5 caractères)" });
  }

  const cacheKey = cacheTag("loyers2025", codeInsee);
  let bundle = await cacheGet(cacheKey);

  if (!bundle) {
    const [appartement, app_t1t2, app_t3p, maison] = await Promise.all([
      fetchLoyer(RESOURCES.appartement, codeInsee),
      fetchLoyer(RESOURCES.appartement_t1t2, codeInsee),
      fetchLoyer(RESOURCES.appartement_t3p, codeInsee),
      fetchLoyer(RESOURCES.maison, codeInsee),
    ]);

    if (!appartement && !maison) {
      // Aucune donnée (commune absente ou API indisponible) → réponse exploitable
      return jsonResp(200, {
        disponible: false,
        code_insee: codeInsee,
        source: "Carte des loyers 2025 — DHUP (donnée indisponible pour cette commune)",
        note: "Les communes de Paris, Lyon et Marseille sont indexées à l'arrondissement (ex. 75112, 69383, 13205).",
      });
    }

    bundle = {
      disponible: true,
      code_insee: codeInsee,
      commune: (appartement || maison).commune,
      unite: "€/m²/mois (loyer d'annonce charges comprises)",
      appartement,
      appartement_t1_t2: app_t1t2,
      appartement_t3_plus: app_t3p,
      maison,
      source: "Carte des loyers 2025 — Ministère de la Transition écologique (DHUP) · Licence Ouverte",
    };
    await cacheSet(cacheKey, bundle);
  }

  // Rendement locatif brut implicite si un prix au m² est fourni
  if (Number.isFinite(prixM2) && prixM2 > 0) {
    const out = { ...bundle, prix_m2_reference: prixM2, rendement_brut: {} };
    for (const [k, v] of Object.entries({ appartement: bundle.appartement, maison: bundle.maison })) {
      if (v && v.loyer_m2) {
        const annuel = v.loyer_m2 * 12;
        out.rendement_brut[k] = {
          loyer_annuel_m2: round2(annuel),
          taux_brut_pct: round2((annuel / prixM2) * 100),
        };
      }
    }
    return jsonResp(200, out);
  }

  return jsonResp(200, bundle);
};
