// Helpers partagés — Authentification Espace Partenaires Optimmo Dom
// Zéro dépendance externe : scrypt (node:crypto) pour les mots de passe,
// HMAC-SHA256 pour les JWT, Netlify Blobs pour la persistance.
//
// Stores Blobs :
//   optimmo-users    : clé = email normalisé → { id, email, nom, prenom, hash, salt, role, plan, actif, created_at }
//   optimmo-sessions : clé = jti → { user_id, expires_at, revoked }
//   optimmo-grants   : clé = userId:outil → { outil, expires_at, paypal_order_id }

import { randomUUID, randomBytes, scryptSync, timingSafeEqual, createHmac } from "node:crypto";

const JWT_TTL_S = 24 * 3600; // 24h

export const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

export function jsonResp(status, body, extraHeaders = {}) {
  return { statusCode: status, headers: { ...CORS_HEADERS, ...extraHeaders }, body: JSON.stringify(body) };
}

export function handleOptions(event) {
  if (event.httpMethod === "OPTIONS") return { statusCode: 204, headers: CORS_HEADERS, body: "" };
  return null;
}

// ── Stores Blobs (fallback gracieux hors Netlify) ─────────────────────────────
const stores = {};
async function getStore(name) {
  if (stores[name] !== undefined) return stores[name];
  try {
    const mod = await import("@netlify/blobs");
    stores[name] = mod.getStore({ name, consistency: "strong" });
  } catch (e) {
    stores[name] = null;
  }
  return stores[name];
}

export async function dbGet(storeName, key) {
  const s = await getStore(storeName);
  if (!s) return null;
  try { return await s.get(key, { type: "json" }); } catch (e) { return null; }
}

export async function dbSet(storeName, key, value) {
  const s = await getStore(storeName);
  if (!s) return false;
  try { await s.setJSON(key, value); return true; } catch (e) { return false; }
}

export async function dbDelete(storeName, key) {
  const s = await getStore(storeName);
  if (!s) return false;
  try { await s.delete(key); return true; } catch (e) { return false; }
}

// ── Mots de passe (scrypt) ────────────────────────────────────────────────────
export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { salt, hash };
}

export function verifyPassword(password, salt, expectedHash) {
  try {
    const candidate = scryptSync(password, salt, 64);
    const expected = Buffer.from(expectedHash, "hex");
    return candidate.length === expected.length && timingSafeEqual(candidate, expected);
  } catch (e) { return false; }
}

// ── JWT (HMAC-SHA256, format standard header.payload.signature) ──────────────
function getSecret() {
  const s = process.env.JWT_SECRET;
  if (!s) throw new Error("JWT_SECRET non configuré");
  return s;
}

function b64url(buf) {
  return Buffer.from(buf).toString("base64url");
}

export function signJWT(payload) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const now = Math.floor(Date.now() / 1000);
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + JWT_TTL_S, jti: randomUUID() }));
  const sig = createHmac("sha256", getSecret()).update(`${header}.${body}`).digest("base64url");
  return `${header}.${body}.${sig}`;
}

export function verifyJWT(token) {
  try {
    const [header, body, sig] = token.split(".");
    if (!header || !body || !sig) return null;
    const expected = createHmac("sha256", getSecret()).update(`${header}.${body}`).digest("base64url");
    const a = Buffer.from(sig); const b = Buffer.from(expected);
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    const payload = JSON.parse(Buffer.from(body, "base64url").toString());
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload;
  } catch (e) { return null; }
}

// ── Middleware checkAuth ──────────────────────────────────────────────────────
// Lit le token depuis Authorization: Bearer xxx ou le cookie optimmo_jwt.
export async function checkAuth(event) {
  let token = null;
  const authHeader = event.headers?.authorization || event.headers?.Authorization;
  if (authHeader?.startsWith("Bearer ")) token = authHeader.slice(7);
  if (!token) {
    const cookies = event.headers?.cookie || "";
    const m = cookies.match(/optimmo_jwt=([^;]+)/);
    if (m) token = m[1];
  }
  if (!token) return null;

  const payload = verifyJWT(token);
  if (!payload) return null;

  const session = await dbGet("optimmo-sessions", payload.jti);
  if (session?.revoked) return null;

  const user = await dbGet("optimmo-users", payload.email);
  if (!user || !user.actif) return null;
  return { ...user, jti: payload.jti };
}

// ── Plans & droits ────────────────────────────────────────────────────────────
export const PLAN_LEVELS = { basic: 1, pro: 2, premium: 3 };

export const TOOL_REQUIRED_PLAN = {
  etude_marche: "basic",
  dvf: "basic",
  loyers: "basic",
  avis_valeur: "pro",
  dpe: "pro",
  risques: "pro",
  sextant: "premium",
  projets: "premium",
};

export async function checkToolAccess(user, tool) {
  const required = TOOL_REQUIRED_PLAN[tool];
  if (!required) return { authorized: false, error: "Outil inconnu" };

  // Abonnement actif ?
  const userLevel = PLAN_LEVELS[user.plan] || 0;
  const requiredLevel = PLAN_LEVELS[required];
  const planOk = user.plan_expires_at && new Date(user.plan_expires_at) > new Date();
  if (planOk && userLevel >= requiredLevel) return { authorized: true, via: "abonnement", plan: user.plan };

  // Accès one-shot non expiré ?
  const grant = await dbGet("optimmo-grants", `${user.id}:${tool}`);
  if (grant && new Date(grant.expires_at) > new Date()) {
    return { authorized: true, via: "one-shot", expires_at: grant.expires_at };
  }

  return { authorized: false, required_plan: required, current_plan: planOk ? user.plan : null };
}

// ── Validation ────────────────────────────────────────────────────────────────
export function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email);
}
