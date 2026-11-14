// GET  /api/marque — charte de marque (enseigne, logo, couleurs, coordonnées) du compte connecté
// POST /api/marque — enregistre la charte du compte connecté
// Auth : Bearer token ou cookie optimmo_jwt (voir _auth.mjs).
//
// Store Blobs :
//   optimmo-marques : clé = user.id → charte assainie (voir assainirMarque)
//
// La charte est rattachée au compte : elle suit l'utilisateur d'un poste à l'autre.
// Côté client, voir marque.js (module « Mise en page »).

import { jsonResp, handleOptions, checkAuth, dbGet, dbSet } from "./_auth.mjs";

const STORE = "optimmo-marques";
const TAILLE_MAX = 800_000; // octets — une charte avec logo redimensionné pèse quelques dizaines de ko

const LIMITES = {
  enseigne: 40, produit: 40, baseline: 80,
  raisonSociale: 80, adresse: 160, telephone: 30, email: 80, mentions: 240,
};

const hexOk = (h) => typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h);
const logoOk = (l) => typeof l === "string" && /^data:image\/(png|jpeg|webp|svg\+xml);/.test(l) && l.length < 600_000;
const texte = (v, max) => (typeof v === "string" ? v.replace(/[\u0000-\u001f]/g, " ").slice(0, max) : null);

// Ne conserve que les champs connus et valides : rien d'autre n'est stocké.
// Mêmes règles que assainir() dans marque.js — à faire évoluer ensemble.
export function assainirMarque(src) {
  const out = {};
  if (!src || typeof src !== "object" || Array.isArray(src)) return out;
  for (const k of ["enseigne", "produit", "baseline"]) {
    const t = texte(src[k], LIMITES[k]);
    if (t !== null) out[k] = t;
  }
  if (src.logo === "" || logoOk(src.logo)) out.logo = src.logo;
  if (src.couleurs && typeof src.couleurs === "object") {
    out.couleurs = {};
    for (const k of ["principale", "accent", "secondaire"]) {
      if (hexOk(src.couleurs[k])) out.couleurs[k] = src.couleurs[k].toUpperCase();
    }
  }
  if (src.coordonnees && typeof src.coordonnees === "object") {
    out.coordonnees = {};
    for (const k of ["raisonSociale", "adresse", "telephone", "email", "mentions"]) {
      const t = texte(src.coordonnees[k], LIMITES[k]);
      if (t !== null) out.coordonnees[k] = t;
    }
  }
  return out;
}

export async function handler(event) {
  const opts = handleOptions(event);
  if (opts) return opts;
  if (event.httpMethod !== "GET" && event.httpMethod !== "POST") {
    return jsonResp(405, { error: "Méthode non autorisée" });
  }

  const user = await checkAuth(event);
  if (!user) return jsonResp(401, { error: "Non authentifié" });
  const compte = { prenom: user.prenom || "", nom: user.nom || "" };

  if (event.httpMethod === "GET") {
    const marque = await dbGet(STORE, user.id);
    return jsonResp(200, { compte, marque: marque ? assainirMarque(marque) : null });
  }

  if ((event.body || "").length > TAILLE_MAX) return jsonResp(413, { error: "Charte trop volumineuse" });
  let corps;
  try { corps = JSON.parse(event.body || "{}"); } catch (e) { return jsonResp(400, { error: "JSON invalide" }); }

  const marque = assainirMarque(corps);
  const ok = await dbSet(STORE, user.id, marque);
  if (!ok) return jsonResp(503, { error: "Enregistrement indisponible" });
  return jsonResp(200, { compte, marque });
}
