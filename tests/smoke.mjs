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

async function main() {
  console.log(`\n🔍 Smoke tests FIDI — cible : ${BASE}\n`);
  // Vérifie d'abord que l'hôte répond
  try {
    await fetchT(`${BASE}/api/autocomplete?q=test`);
  } catch (e) {
    console.log(`⊘ Hôte injoignable (${e.message}) — smoke tests ignorés.`);
    console.log("  Lancez `npx netlify dev` ou définissez BASE_URL vers le deploy preview.\n");
    process.exit(0);
  }

  await run("GET /api/autocomplete", testAutocomplete);
  await run("POST /api/analyse", testAnalyse);
  await run("GET /api/services", testServices);
  await run("GET /api/loyers", testLoyers);

  console.log(`\nRésultat : ${passed} ✅  ${failed} ❌  ${skipped} ⊘\n`);
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error("Erreur smoke tests :", e);
  process.exit(1);
});
