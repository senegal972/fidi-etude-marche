// Tests statiques de conformité des Netlify Functions — FIDI
// Exécution : node --test tests/
// Aucune dépendance externe (utilise node:test + node:fs).
//
// Couvre les chantiers QA / check-api / sécurité :
//   - Format ESM (import/export, pas de require/module.exports)
//   - Export `handler`
//   - Headers CORS présents
//   - Gestion de la requête OPTIONS (preflight)
//   - Usage de fetchTimeout / AbortController (pas de fetch nu sans timeout)
//   - Absence de secrets en dur (clés API hardcodées)
//   - Cohérence des redirections netlify.toml

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const FUNCTIONS_DIR = join(__dirname, "..", "netlify", "functions");
const NETLIFY_TOML = join(__dirname, "..", "netlify.toml");

// Liste des fonctions (hors helpers commençant par _)
const functionFiles = readdirSync(FUNCTIONS_DIR)
  .filter((f) => f.endsWith(".mjs") && !f.startsWith("_"));

// Helpers partagés (préfixe _) — testés différemment (pas de handler)
const helperFiles = readdirSync(FUNCTIONS_DIR)
  .filter((f) => f.endsWith(".mjs") && f.startsWith("_"));

const read = (file) => readFileSync(join(FUNCTIONS_DIR, file), "utf8");

test("au moins une fonction Netlify est présente", () => {
  assert.ok(functionFiles.length >= 1, "aucune fonction trouvée");
});

for (const file of functionFiles) {
  test(`${file} — format ESM (pas de require/module.exports)`, () => {
    const src = read(file);
    assert.doesNotMatch(src, /\brequire\s*\(/, "require() interdit en ESM");
    assert.doesNotMatch(src, /module\.exports/, "module.exports interdit en ESM");
  });

  test(`${file} — exporte un handler`, () => {
    const src = read(file);
    assert.match(src, /export\s+(const|async\s+function|function)\s+handler/,
      "doit exporter `handler`");
  });

  test(`${file} — headers CORS Access-Control-Allow-Origin`, () => {
    const src = read(file);
    assert.match(src, /Access-Control-Allow-Origin/,
      "doit définir le header CORS");
  });

  test(`${file} — gère la requête OPTIONS (preflight)`, () => {
    const src = read(file);
    assert.match(src, /OPTIONS/, "doit gérer la méthode OPTIONS");
  });

  test(`${file} — timeout sur les appels réseau (AbortController/fetchTimeout)`, () => {
    const src = read(file);
    const usesFetch = /\bfetch\s*\(/.test(src);
    if (!usesFetch) return; // pas d'appel réseau → rien à vérifier
    assert.ok(
      /AbortController/.test(src) || /fetchTimeout/.test(src),
      "tout appel fetch doit être protégé par un timeout",
    );
  });

  test(`${file} — pas de secret API en dur`, () => {
    const src = read(file);
    // Détecte des assignations de clés probables (tokens longs en clair)
    assert.doesNotMatch(
      src,
      /(api[_-]?key|api[_-]?token|secret|password)\s*[:=]\s*["'][A-Za-z0-9_\-]{16,}["']/i,
      "aucune clé/secret ne doit être codé en dur (utiliser process.env)",
    );
  });
}

for (const file of helperFiles) {
  test(`${file} (helper) — format ESM`, () => {
    const src = read(file);
    assert.doesNotMatch(src, /\brequire\s*\(/, "require() interdit en ESM");
    assert.doesNotMatch(src, /module\.exports/, "module.exports interdit en ESM");
    assert.match(src, /export\s+(const|async\s+function|function)/,
      "un helper doit exporter au moins une fonction");
  });
}

test("netlify.toml — chaque fonction a une redirection /api/*", () => {
  const toml = readFileSync(NETLIFY_TOML, "utf8");
  for (const file of functionFiles) {
    const name = file.replace(/\.mjs$/, "");
    assert.match(
      toml,
      new RegExp(`to\\s*=\\s*"/\\.netlify/functions/${name}"`),
      `redirection manquante pour la fonction ${name}`,
    );
  }
});

test("netlify.toml — fallback SPA présent", () => {
  const toml = readFileSync(NETLIFY_TOML, "utf8");
  assert.match(toml, /to\s*=\s*"\/index\.html"/, "fallback SPA requis");
});
