// Netlify Function — Génération d'un avis de valeur vénale
// POST /api/avis-de-valeur
// body: {
//   adresse, type_bien, surface, etat,           // saisie utilisateur
//   localisation: { lat, lon, code_insee, ville, code_postal },
//   prix_m2_reference,                            // VALORIS/DVF médian €/m²
//   comparables: [ { adresse, date, surface, prix, prix_m2 } ],
//   dpe: { etiquette_energie, etiquette_ges, conso },
//   risques: { inondation, seisme, argiles, radon },
//   services: { score },                          // /api/services
//   loyers: { appartement:{loyer_m2}, maison:{loyer_m2} }, // /api/loyers
//   revenus: { niveau_vie_median_annuel }         // /api/revenus
// }
// Retourne : { valeur, sections, markdown } — document d'avis de valeur complet.
//
// Applique la méthodologie du skill avis-de-valeur (comparaison directe +
// ajustements + contrôle par capitalisation). Endpoint 100% additif.

const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

function jsonResp(status, body) {
  return { statusCode: status, headers: CORS_HEADERS, body: JSON.stringify(body) };
}

function median(arr) {
  const xs = arr.filter((x) => Number.isFinite(x)).sort((a, b) => a - b);
  if (!xs.length) return null;
  const m = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
}

function eur(n) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("fr-FR", { maximumFractionDigits: 0 }).format(Math.round(n)) + " €";
}

// Décote DPE (Loi Climat) — % appliqué à la valeur
function ajustementDpe(etiquette) {
  switch ((etiquette || "").toUpperCase()) {
    case "A": case "B": return +0.03;
    case "C": return 0;
    case "D": return -0.02;
    case "E": return -0.05;
    case "F": return -0.10;
    case "G": return -0.18;
    default:  return 0;
  }
}

// Décote risques — somme bornée
function ajustementRisques(risques = {}) {
  let a = 0;
  const lvl = (v) => (typeof v === "string" ? v.toLowerCase() : "");
  if (/fort|élevé|eleve|rouge/.test(lvl(risques.inondation))) a -= 0.10;
  else if (/moyen|bleu/.test(lvl(risques.inondation))) a -= 0.04;
  if (/fort|élevé|eleve/.test(lvl(risques.argiles))) a -= 0.04;
  if (/4|5|fort/.test(lvl(risques.seisme))) a -= 0.03;
  return Math.max(a, -0.20);
}

// Bonus/malus services de proximité (score /100)
function ajustementServices(score) {
  if (!Number.isFinite(score)) return 0;
  if (score >= 75) return +0.05;
  if (score >= 50) return 0;
  if (score >= 25) return -0.03;
  return -0.07;
}

function labelEtat(etat) {
  return { bon: "Bon état", moyen: "État moyen", renover: "À rénover" }[etat] || "Non précisé";
}
function ajustementEtat(etat) {
  return { bon: +0.05, moyen: 0, renover: -0.15 }[etat] || 0;
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResp(200, {});
  if (event.httpMethod !== "POST") return jsonResp(405, { error: "POST requis" });

  let b = {};
  try { b = JSON.parse(event.body || "{}"); }
  catch { return jsonResp(400, { error: "Corps JSON invalide" }); }

  const surface = parseFloat(b.surface);
  if (!Number.isFinite(surface) || surface <= 0) {
    return jsonResp(400, { error: "surface (m²) requise et positive" });
  }
  const typeBien = b.type_bien || "appartement";
  const loc = b.localisation || {};

  // 1. Prix de référence au m² : médiane des comparables, sinon VALORIS/DVF
  const compM2 = (b.comparables || []).map((c) => parseFloat(c.prix_m2)).filter(Number.isFinite);
  const prixRefM2 = median(compM2) || parseFloat(b.prix_m2_reference) || null;

  if (!prixRefM2) {
    return jsonResp(422, {
      error: "Données de prix insuffisantes",
      detail: "Aucun comparable ni prix_m2_reference exploitable pour estimer la valeur.",
    });
  }

  // 2. Valeur de base + ajustements
  const valeurBase = prixRefM2 * surface;
  const aDpe = ajustementDpe(b.dpe?.etiquette_energie);
  const aRisques = ajustementRisques(b.risques);
  const aServices = ajustementServices(b.services?.score);
  const aEtat = ajustementEtat(b.etat);
  const correctionTotale = aDpe + aRisques + aServices + aEtat;

  const valeurCentrale = valeurBase * (1 + correctionTotale);
  const amplitude = 0.10; // ±10% (marché normal)
  const fourchetteBasse = valeurCentrale * (1 - amplitude);
  const fourchetteHaute = valeurCentrale * (1 + amplitude);
  const prixM2Implicite = valeurCentrale / surface;

  // 3. Contrôle par capitalisation (si loyer disponible)
  const loyerM2 = typeBien === "maison"
    ? b.loyers?.maison?.loyer_m2
    : b.loyers?.appartement?.loyer_m2;
  let capitalisation = null;
  if (Number.isFinite(loyerM2) && loyerM2 > 0) {
    const revenuAnnuel = loyerM2 * surface * 12 * 0.95; // 5% vacance
    const tauxCapi = 0.05; // hypothèse marché 5%
    const valeurRendement = revenuAnnuel / tauxCapi;
    const ecart = (valeurRendement - valeurCentrale) / valeurCentrale;
    capitalisation = {
      loyer_m2_mois: loyerM2,
      revenu_annuel: Math.round(revenuAnnuel),
      taux_capitalisation_pct: tauxCapi * 100,
      valeur_rendement: Math.round(valeurRendement),
      ecart_pct: Math.round(ecart * 1000) / 10,
      coherent: Math.abs(ecart) < 0.15,
    };
  }

  const pct = (x) => (x === 0 ? "0 %" : `${x > 0 ? "+" : ""}${Math.round(x * 1000) / 10} %`);

  const valeur = {
    prix_reference_m2: Math.round(prixRefM2),
    surface,
    valeur_base: Math.round(valeurBase),
    ajustements: {
      dpe: pct(aDpe), risques: pct(aRisques),
      services: pct(aServices), etat: pct(aEtat),
      total: pct(correctionTotale),
    },
    fourchette_basse: Math.round(fourchetteBasse),
    valeur_venale: Math.round(valeurCentrale),
    fourchette_haute: Math.round(fourchetteHaute),
    prix_m2_implicite: Math.round(prixM2Implicite),
    capitalisation,
  };

  // 4. Assemblage du document Markdown
  const today = new Date().toISOString().slice(0, 10);
  const comparablesRows = (b.comparables || []).slice(0, 6).map((c, i) =>
    `| ${i + 1} | ${c.adresse || "—"} | ${c.date || "—"} | ${c.surface || "—"} | ${eur(c.prix)} | ${c.prix_m2 ? Math.round(c.prix_m2) + " €/m²" : "—"} |`
  ).join("\n") || "| — | Aucun comparable transmis | — | — | — | — |";

  const md = `# AVIS DE VALEUR VÉNALE

**Date** : ${today} · **Bien** : ${b.adresse || "—"}

## 1. Identification du bien
- **Adresse** : ${b.adresse || "—"}
- **Commune** : ${loc.ville || "—"} (${loc.code_insee || "—"})
- **Type** : ${typeBien}
- **Surface** : ${surface} m²
- **État** : ${labelEtat(b.etat)}

## 2. Contexte de marché
- **Prix de référence** : ${eur(prixRefM2)}/m²
- **Niveau de vie médian (commune, INSEE 2021)** : ${b.revenus?.niveau_vie_median_annuel ? eur(b.revenus.niveau_vie_median_annuel) + "/an/UC" : "—"}
- **Score services de proximité** : ${Number.isFinite(b.services?.score) ? b.services.score + "/100" : "—"}

## 3. Transactions comparables (DVF)
| # | Adresse | Date | Surface | Prix | Prix/m² |
|---|---------|------|:---:|---:|---:|
${comparablesRows}

## 4. Performance énergétique
- **DPE énergie** : ${b.dpe?.etiquette_energie || "—"} · **GES** : ${b.dpe?.etiquette_ges || "—"}
- **Impact valeur** : ${pct(aDpe)}

## 5. Calcul de la valeur (méthode par comparaison)
\`\`\`
Prix de référence        : ${eur(prixRefM2)}/m²
Surface                  : ${surface} m²
Valeur de base           : ${eur(valeurBase)}
─ Ajustements ─
  DPE                    : ${pct(aDpe)}
  Risques                : ${pct(aRisques)}
  Services de proximité  : ${pct(aServices)}
  État du bien           : ${pct(aEtat)}
  Correction totale      : ${pct(correctionTotale)}
\`\`\`

## 6. Valeur vénale estimée
| | |
|---|---:|
| **Fourchette basse** | **${eur(fourchetteBasse)}** |
| **VALEUR VÉNALE** | **${eur(valeurCentrale)}** |
| **Fourchette haute** | **${eur(fourchetteHaute)}** |
| Prix au m² implicite | ${eur(prixM2Implicite)}/m² |
${capitalisation ? `
## 7. Contrôle par capitalisation
- Loyer de marché : ${capitalisation.loyer_m2_mois} €/m²/mois (Carte des loyers DHUP)
- Valeur par rendement (taux ${capitalisation.taux_capitalisation_pct}%) : ${eur(capitalisation.valeur_rendement)}
- Écart avec la valeur par comparaison : ${capitalisation.ecart_pct} % → ${capitalisation.coherent ? "✅ cohérent" : "⚠️ écart > 15 %, à investiguer"}
` : ""}
## ${capitalisation ? "8" : "7"}. Conditions et réserves
Cet avis de valeur est établi le ${today} à partir des données de marché publiques (DVF, DPE ADEME, Géorisques, Carte des loyers DHUP, INSEE Filosofi, OpenStreetMap) et des informations transmises. Il ne constitue pas une expertise immobilière au sens de la Charte de l'Expertise en Évaluation Immobilière, ni un engagement de prix. La valeur peut varier selon les conditions de négociation et des éléments non communiqués. Validité : 3 mois.

---
*FIDI · Conseil Immobilier — Avis de valeur généré automatiquement*
`;

  return jsonResp(200, {
    genere_le: today,
    adresse: b.adresse || null,
    valeur,
    markdown: md,
    avertissement: "Avis de valeur indicatif — ne constitue pas une expertise certifiée.",
  });
};
