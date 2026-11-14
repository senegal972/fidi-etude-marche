// Tests statiques de l'interface — écran de saisie et module « Mise en page ».
// Exécution : node --test tests/
// Garantit que les modules restent branchés et que le contrat des identifiants tient.

import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const lire = (f) => readFileSync(new URL("../" + f, import.meta.url), "utf8");
const html = lire("index.html");

test("index.html charge les modules d'interface", () => {
  for (const f of ["/saisie.css", "/saisie.js", "/marque.css", "/marque.js", "/avis-valeur.js"]) {
    assert.ok(html.includes(f), `${f} n'est pas chargé par index.html`);
  }
});

test("écran de saisie — identifiants attendus par lancerAnalyse() présents une seule fois", () => {
  const ids = ["inputAdresse", "selectType", "inputSurface", "selectPerimetre", "btnAnalyse",
    "optEntreprise", "inputEntrepriseQ", "entrepriseQueryWrap", "optFinance", "inputFinanceSiren",
    "financeQueryWrap", "optPermis", "btnGeoloc", "autocompleteList"];
  for (const id of ids) {
    const n = html.split(`id="${id}"`).length - 1;
    assert.equal(n, 1, `id="${id}" attendu 1 fois, trouvé ${n}`);
  }
});

test("marque blanche — points d'accroche du bandeau présents", () => {
  for (const id of ["marqueTitre", "marqueBaseline", "btnMarque"]) {
    assert.ok(html.includes(`id="${id}"`), `id="${id}" manquant`);
  }
});

test("marque.json — charte valide et sans coordonnées personnelles", () => {
  const m = JSON.parse(lire("marque.json"));
  assert.equal(typeof m.enseigne, "string");
  for (const k of ["principale", "accent", "secondaire"]) {
    assert.match(m.couleurs[k], /^#[0-9a-fA-F]{6}$/, `couleur ${k} invalide`);
  }
  // Dépôt public : téléphone et e-mail se règlent dans le panneau, pas dans le fichier versionné.
  assert.equal(m.coordonnees.telephone, "");
  assert.equal(m.coordonnees.email, "");
});

test("modules d'interface — pas de alert() ni de couleur de marque d'origine en dur", () => {
  for (const f of ["saisie.js", "marque.css", "saisie.css"]) {
    const src = lire(f);
    assert.ok(!/\balert\s*\(/.test(src), `${f} utilise alert()`);
    assert.ok(!/#1a3a6e|#e8491d/i.test(src), `${f} contient une couleur de marque en dur`);
  }
});
