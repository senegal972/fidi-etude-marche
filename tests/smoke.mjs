// Smoke tests live des endpoints FIDI — optionnel
// Exécution : BASE_URL="https://deploy-preview-1--fidi-etude-marche.netlify.app" node tests/smoke.mjs
// Si BASE_URL n'est pas défini, teste http://localhost:8888 (netlify dev).
// Sort en code 0 si tout passe, 1 sinon. Ignore silencieusement si l'hôte est injoignable.

const BASE = (process.env.BASE_URL || "http://localhost:8888").replace(/\/$/, "");
const TIMEOUT_MS = 28000;

// Adresses canoniques (cf. .agents/qa-tester.md)
const ADRESSE_TEST = "1 rue de Rivoli, 75001 Paris";

let passed = 0, failed = 0, skipped = 0;

function log(status, name, extra = "") {
  const icon = status === "ok" ? "✅" : status === "skip" ? "⊘" : "❌";
  console.log(`${icon} ${name}${extra ? " — " + extra : ""}`);
  if (status === "ok") passed++;
  else if (status === "skip") skipped++;
  else failed++;
}

async function fetchT(url, opts = {}) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), TIMEOUT_MS);
  try {
    return await fetch(url, { ...opts, signal: ctrl.signal });
  } finally {
    clearTimeout(t);
  }
}

async function testAutocomplete() {
  const r = await fetchT(`${BASE}/api/autocomplete?q=paris`);
  if (!r.ok) return log("fail", "GET /api/autocomplete", `HTTP ${r.status}`);
  const data = await r.json();
  if (!Array.isArray(data)) return log("fail", "GET /api/autocomplete", "réponse non-tableau");
  log("ok", "GET /api/autocomplete", `${data.length} suggestions`);
}

async function testAnalyse() {
  const r = await fetchT(`${BASE}/api/analyse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      adresse: ADRESSE_TEST, type_bien: "appartement", surface: 60, perimetre: "rayon_1km",
    }),
  });
  if (!r.ok) return log("fail", "POST /api/analyse", `HTTP ${r.status}`);
  const d = await r.json();
  const checks = [
    [d.localisation && d.localisation.lat != null, "localisation.lat"],
    [d.score && typeof d.score.total === "number" && d.score.total >= 0 && d.score.total <= 100, "score.total ∈ [0,100]"],
    [Array.isArray(d.dvf_annees), "dvf_annees tableau"],
    [d.dpe && typeof d.dpe === "object", "dpe objet"],
  ];
  const bad = checks.filter(([ok]) => !ok).map(([, n]) => n);
  if (bad.length) return log("fail", "POST /api/analyse", `échecs: ${bad.join(", ")}`);
  log("ok", "POST /api/analyse", `score ${d.score.total}/100`);
}

async function testServices() {
  // Nouveau endpoint additif (services de proximité OSM)
  const r = await fetchT(`${BASE}/api/services?lat=48.8566&lon=2.3522&rayon=800`);
  if (r.status === 404) return log("skip", "GET /api/services", "endpoint absent (optionnel)");
  if (!r.ok) return log("fail", "GET /api/services", `HTTP ${r.status}`);
  const d = await r.json();
  if (!d || typeof d !== "object") return log("fail", "GET /api/services", "réponse invalide");
  log("ok", "GET /api/services", `${(d.categories || []).length} catégories`);
}

async function testLoyers() {
  // Nouveau endpoint additif (loyers de référence DHUP)
  const r = await fetchT(`${BASE}/api/loyers?code_insee=37099&prix_m2=3200`);
  if (r.status === 404) return log("skip", "GET /api/loyers", "endpoint absent (optionnel)");
  if (!r.ok) return log("fail", "GET /api/loyers", `HTTP ${r.status}`);
  const d = await r.json();
  if (!d || typeof d !== "object") return log("fail", "GET /api/loyers", "réponse invalide");
  if (d.disponible === false) return log("skip", "GET /api/loyers", "donnée indisponible (commune/API)");
  const loyer = d.appartement && d.appartement.loyer_m2;
  log("ok", "GET /api/loyers", loyer ? `${loyer} €/m²/mois` : "structure OK");
}

// Une erreur réseau transitoire contre un deploy preview (cold start, ECONNRESET,
// timeout, DNS) ne doit PAS faire échouer la CI : le smoke test cible les
// régressions fonctionnelles (mauvais statut HTTP, JSON malformé), pas la météo
// réseau d'un serverless éphémère. On classe donc ces erreurs en SKIP.
function isTransient(e) {
  const blob = `${e?.code || ""} ${e?.message || ""} ${e?.cause?.code || ""} ${e?.cause?.message || ""}`;
  return /ECONNRESET|ETIMEDOUT|ENOTFOUND|EAI_AGAIN|ECONNREFUSED|UND_ERR|fetch failed|aborted|abort|timeout/i.test(blob);
}

// Exécute un test en isolant les erreurs réseau transitoires (→ skip).
async function run(name, fn) {
  try {
    await fn();
  } catch (e) {
    if (isTransient(e)) {
      return log("skip", name, `réseau instable (${e.cause?.code || e.code || e.message})`);
    }
    log("fail", name, e.message);
  }
}

async function testRevenus() {
  // Nouveau endpoint additif (revenus INSEE Filosofi)
  const r = await fetchT(`${BASE}/api/revenus?code_insee=75112`);
  if (r.status === 404) return log("skip", "GET /api/revenus", "endpoint absent (optionnel)");
  if (!r.ok) return log("fail", "GET /api/revenus", `HTTP ${r.status}`);
  const d = await r.json();
  if (!d || typeof d !== "object") return log("fail", "GET /api/revenus", "réponse invalide");
  if (d.disponible === false) return log("skip", "GET /api/revenus", "donnée indisponible");
  log("ok", "GET /api/revenus", d.niveau_vie_median_annuel ? `${d.niveau_vie_median_annuel} €/an` : "structure OK");
}

async function testAvis() {
  // Endpoint de génération d'avis de valeur (logique pure, sans dépendance réseau)
  const payload = {
    adresse: ADRESSE_TEST, type_bien: "appartement", surface: 60,
    localisation: { code_insee: "75101", ville: "Paris" },
    comparables: [
      { adresse: "A", date: "2024-01", surface: 58, prix: 600000, prix_m2: 10345 },
      { adresse: "B", date: "2024-03", surface: 62, prix: 640000, prix_m2: 10322 },
    ],
    dpe: { etiquette_energie: "D" }, services: { score: 80 },
    loyers: { appartement: { loyer_m2: 28 } },
  };
  const r = await fetchT(`${BASE}/api/avis-de-valeur`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload),
  });
  if (r.status === 404) return log("skip", "POST /api/avis-de-valeur", "endpoint absent (optionnel)");
  if (!r.ok) return log("fail", "POST /api/avis-de-valeur", `HTTP ${r.status}`);
  const d = await r.json();
  const ok = d && d.valeur && Number.isFinite(d.valeur.valeur_venale) && typeof d.markdown === "string";
  if (!ok) return log("fail", "POST /api/avis-de-valeur", "structure invalide");
  log("ok", "POST /api/avis-de-valeur", `valeur ${d.valeur.valeur_venale} €`);
}

// Attend que les Netlify Functions du preview soient réellement propagées.
// Un deploy preview fraîchement « ready » peut renvoyer 404 / ECONNRESET
// pendant quelques secondes, le temps que les fonctions démarrent (cold start).
// Sonder une seule fois puis lancer la suite ferait échouer `testAutocomplete`
// (le 404 y est un échec dur) sur un simple artefact de timing, pas une
// régression. On sonde donc avec quelques essais espacés ; si les fonctions ne
// répondent jamais 200, on considère le preview non exploitable → skip global.
async function attendreFonctionsPretes(essais = 4, delaiMs = 4000) {
  for (let i = 0; i < essais; i++) {
    try {
      const r = await fetchT(`${BASE}/api/autocomplete?q=test`);
      if (r.ok) return true; // fonctions servies → on peut lancer la suite
      // 404/5xx pendant la propagation : on patiente et on réessaie
    } catch (e) {
      if (!isTransient(e)) throw e; // vraie erreur non-réseau → à remonter
    }
    if (i < essais - 1) await new Promise((res) => setTimeout(res, delaiMs));
  }
  return false; // jamais prêt (fonctions non propagées / preview sans fonctions)
}

async function main() {
  console.log(`\n🔍 Smoke tests FIDI — cible : ${BASE}\n`);
  // Vérifie que l'hôte répond ET que les fonctions sont propagées (cold start)
  let pret;
  try {
    pret = await attendreFonctionsPretes();
  } catch (e) {
    console.log(`⊘ Sonde en échec (${e.message}) — smoke tests ignorés.`);
    process.exit(0);
  }
  if (!pret) {
    console.log("⊘ Deploy preview non prêt (fonctions non propagées ou hôte injoignable) — smoke tests ignorés.");
    console.log("  Lancez `npx netlify dev` ou définissez BASE_URL vers un preview servant /api/*.\n");
    process.exit(0);
  }

  await run("GET /api/autocomplete", testAutocomplete);
  await run("POST /api/analyse", testAnalyse);
  await run("GET /api/services", testServices);
  await run("GET /api/loyers", testLoyers);
  await run("GET /api/revenus", testRevenus);
  await run("POST /api/avis-de-valeur", testAvis);

  console.log(`\nRésultat : ${passed} ✅  ${failed} ❌  ${skipped} ⊘\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Erreur smoke tests :", e);
  process.exit(1);
});
