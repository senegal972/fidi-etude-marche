// Tests de la fonction /api/marque — charte de marque rattachée au compte.
// Exécution : node --test tests/

import { test } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = process.env.JWT_SECRET || "secret-de-test";
const { handler, assainirMarque } = await import("../netlify/functions/marque.mjs");

test("marque sans jeton → 401 (lecture et écriture)", async () => {
  for (const httpMethod of ["GET", "POST"]) {
    const r = await handler({ httpMethod, headers: {}, body: "{}" });
    assert.equal(r.statusCode, 401);
  }
});

test("marque — OPTIONS → 204, méthode inconnue → 405", async () => {
  assert.equal((await handler({ httpMethod: "OPTIONS", headers: {} })).statusCode, 204);
  assert.equal((await handler({ httpMethod: "DELETE", headers: {} })).statusCode, 405);
});

test("assainirMarque — conserve une charte valide", () => {
  const m = assainirMarque({
    enseigne: "Agence Démo", produit: "Étude", baseline: "Signature",
    logo: "data:image/png;base64,AAAA",
    couleurs: { principale: "#0c447c", accent: "#993C1D", secondaire: "#0F6E56" },
    coordonnees: { raisonSociale: "Agence Démo SAS", telephone: "05 96 00 00 00" },
  });
  assert.equal(m.enseigne, "Agence Démo");
  assert.equal(m.couleurs.principale, "#0C447C");
  assert.equal(m.logo, "data:image/png;base64,AAAA");
  assert.equal(m.coordonnees.raisonSociale, "Agence Démo SAS");
});

test("assainirMarque — écarte ce qui est invalide ou inconnu", () => {
  const m = assainirMarque({
    enseigne: "x".repeat(500), role: "admin", plan: "premium",
    logo: "javascript:alert(1)",
    couleurs: { principale: "red", accent: "#12345", secondaire: "url(x)" },
    coordonnees: { email: 42, inconnu: "x" },
  });
  assert.equal(m.enseigne.length, 40);
  assert.ok(!("role" in m) && !("plan" in m));
  assert.ok(!("logo" in m));
  assert.deepEqual(m.couleurs, {});
  assert.deepEqual(m.coordonnees, {});
  assert.deepEqual(assainirMarque(null), {});
  assert.deepEqual(assainirMarque([1, 2]), {});
});
