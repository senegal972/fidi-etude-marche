// Tests unitaires — Auth Espace Partenaires Optimmo Dom
// node --test tests/auth.test.mjs
// Les Blobs ne sont pas disponibles hors Netlify : on teste la crypto pure
// (scrypt, JWT) et les validations des handlers (sans persistance).

import { test } from "node:test";
import assert from "node:assert/strict";

process.env.JWT_SECRET = "test-secret-pour-les-tests-uniquement";

const {
  hashPassword, verifyPassword, signJWT, verifyJWT,
  normalizeEmail, isValidEmail, PLAN_LEVELS, TOOL_REQUIRED_PLAN,
} = await import("../netlify/functions/_auth.mjs");

test("hashPassword / verifyPassword — round trip", () => {
  const { salt, hash } = hashPassword("MonMotDePasse123");
  assert.ok(salt.length === 32);
  assert.ok(hash.length === 128);
  assert.equal(verifyPassword("MonMotDePasse123", salt, hash), true);
  assert.equal(verifyPassword("MauvaisMdp", salt, hash), false);
});

test("deux hashes du même mot de passe diffèrent (salt aléatoire)", () => {
  const a = hashPassword("identique");
  const b = hashPassword("identique");
  assert.notEqual(a.hash, b.hash);
});

test("signJWT / verifyJWT — round trip", () => {
  const token = signJWT({ sub: "u1", email: "test@fidiconseil.com", role: "partenaire", plan: "pro" });
  const payload = verifyJWT(token);
  assert.ok(payload);
  assert.equal(payload.email, "test@fidiconseil.com");
  assert.equal(payload.plan, "pro");
  assert.ok(payload.exp > Math.floor(Date.now() / 1000));
  assert.ok(payload.jti);
});

test("verifyJWT — rejette un token falsifié", () => {
  const token = signJWT({ sub: "u1", email: "a@b.com" });
  const [h, b] = token.split(".");
  const forged = `${h}.${b}.fausse-signature`;
  assert.equal(verifyJWT(forged), null);
});

test("verifyJWT — rejette un payload modifié", () => {
  const token = signJWT({ sub: "u1", email: "a@b.com", plan: "basic" });
  const [h, , sig] = token.split(".");
  const evil = Buffer.from(JSON.stringify({ sub: "u1", email: "a@b.com", plan: "premium", exp: 9999999999 })).toString("base64url");
  assert.equal(verifyJWT(`${h}.${evil}.${sig}`), null);
});

test("verifyJWT — rejette les tokens malformés", () => {
  assert.equal(verifyJWT(""), null);
  assert.equal(verifyJWT("abc"), null);
  assert.equal(verifyJWT("a.b"), null);
  assert.equal(verifyJWT(null), null);
});

test("normalizeEmail + isValidEmail", () => {
  assert.equal(normalizeEmail("  Franck@FidiConseil.COM "), "franck@fidiconseil.com");
  assert.equal(isValidEmail("contact@fidiconseil.com"), true);
  assert.equal(isValidEmail("pas-un-email"), false);
  assert.equal(isValidEmail("a@b"), false);
});

test("matrice des plans — cohérence", () => {
  assert.equal(PLAN_LEVELS.basic < PLAN_LEVELS.pro, true);
  assert.equal(PLAN_LEVELS.pro < PLAN_LEVELS.premium, true);
  assert.equal(TOOL_REQUIRED_PLAN.etude_marche, "basic");
  assert.equal(TOOL_REQUIRED_PLAN.avis_valeur, "pro");
  assert.equal(TOOL_REQUIRED_PLAN.sextant, "premium");
});

test("handlers — refus méthodes invalides", async () => {
  const { handler: login } = await import("../netlify/functions/auth-login.mjs");
  const { handler: register } = await import("../netlify/functions/auth-register.mjs");

  const getResp = await login({ httpMethod: "GET", headers: {} });
  assert.equal(getResp.statusCode, 405);

  const badJson = await login({ httpMethod: "POST", headers: {}, body: "{invalid" });
  assert.equal(badJson.statusCode, 400);

  const missingFields = await register({ httpMethod: "POST", headers: {}, body: JSON.stringify({ email: "x@y.com" }) });
  assert.equal(missingFields.statusCode, 400);

  const badEmail = await register({ httpMethod: "POST", headers: {}, body: JSON.stringify({ email: "pas-un-email", password: "12345678", nom: "F", prenom: "F" }) });
  assert.equal(badEmail.statusCode, 400);

  const shortPwd = await register({ httpMethod: "POST", headers: {}, body: JSON.stringify({ email: "x@y.com", password: "court", nom: "F", prenom: "F" }) });
  assert.equal(shortPwd.statusCode, 400);
});

test("handlers — OPTIONS preflight retourne 204", async () => {
  const { handler } = await import("../netlify/functions/auth-login.mjs");
  const resp = await handler({ httpMethod: "OPTIONS", headers: {} });
  assert.equal(resp.statusCode, 204);
});

test("auth-me sans token → 401", async () => {
  const { handler } = await import("../netlify/functions/auth-me.mjs");
  const resp = await handler({ httpMethod: "GET", headers: {} });
  assert.equal(resp.statusCode, 401);
});
