// Netlify Function — Revenus & niveau de vie (INSEE Filosofi 2021)
// GET /api/revenus?code_insee=75112
// Retourne le niveau de vie médian, le revenu déclaré médian et la part de
// ménages imposés d'une commune (ou arrondissement), via la Tabular API
// data.gouv.fr. Alimente l'axe « contexte territorial » du score FIDI et la
// section marché de l'avis de valeur.
// Source : « Revenu des français à la commune » (base Filosofi 2021, INSEE).
// Données ouvertes (Licence Ouverte / Etalab).
//
// Endpoint 100% additif : n'impacte aucune autre fonction.

import { cacheGet, cacheSet, cacheTag } from "./_cache.mjs";

const TIMEOUT_MS = 8000;
const RESOURCE_ID = "516130bc-4dcb-47f5-8347-ae96553c43ab"; // Filosofi 2021 commune
const TABULAR_BASE = "https://tabular-api.data.gouv.fr/api/resources";

// Colonnes source (noms exacts, avec accents/espaces) → clés normalisées
const COL = {
  code:               "Code géographique",
  nom:                "Libellé géographique",
  niveau_vie_median:  "[DISP] Médiane (€)",          // revenu disponible médian par UC
  q1:                 "[DISP] 1ᵉʳ quartile (€)",
  q3:                 "[DISP] 3ᵉ quartile (€)",
  revenu_declare_med: "[DEC] Médiane (€)",
  part_imposes:       "[DEC] Part des ménages fiscaux imposés (%)",
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

// Convertit "29 940" / "8,9" / "" en nombre exploitable (ou null)
function num(v) {
  if (v == null || v === "") return null;
  const n = parseFloat(String(v).replace(/\s/g, "").replace(",", "."));
  return Number.isFinite(n) ? n : null;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResp(200, {});

  const p = event.queryStringParameters || {};
  const codeInsee = (p.code_insee || "").trim();

  if (!/^[0-9][0-9AB][0-9]{3}$/i.test(codeInsee)) {
    return jsonResp(400, { error: "Paramètre 'code_insee' requis (5 caractères)" });
  }

  const cacheKey = cacheTag("revenus2021", codeInsee);
  const cached = await cacheGet(cacheKey);
  if (cached) return jsonResp(200, cached);

  const filterKey = encodeURIComponent(`${COL.code}__exact`);
  const url = `${TABULAR_BASE}/${RESOURCE_ID}/data/?${filterKey}=${encodeURIComponent(codeInsee)}`;

  let row = null;
  try {
    const r = await fetchTimeout(url, TIMEOUT_MS);
    if (r.ok) {
      const data = await r.json();
      row = (data.data || [])[0] || null;
    }
  } catch (e) {
    row = null;
  }

  if (!row) {
    return jsonResp(200, {
      disponible: false,
      code_insee: codeInsee,
      source: "INSEE Filosofi 2021 (donnée indisponible pour cette commune)",
      note: "Le secret statistique masque les communes < 50 ménages fiscaux. Paris/Lyon/Marseille sont indexés à l'arrondissement (ex. 75112).",
    });
  }

  const result = {
    disponible: true,
    code_insee: codeInsee,
    commune: row[COL.nom] || null,
    niveau_vie_median_annuel: num(row[COL.niveau_vie_median]),  // €/an par unité de consommation
    revenu_declare_median_annuel: num(row[COL.revenu_declare_med]),
    premier_quartile: num(row[COL.q1]),
    troisieme_quartile: num(row[COL.q3]),
    part_menages_imposes_pct: num(row[COL.part_imposes]),
    annee: 2021,
    source: "INSEE Filosofi 2021 — « Revenu des français à la commune » · Licence Ouverte",
  };

  await cacheSet(cacheKey, result);
  return jsonResp(200, result);
};
