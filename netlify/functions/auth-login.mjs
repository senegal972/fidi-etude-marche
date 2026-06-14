// POST /api/auth/login — Connexion Espace Partenaires Optimmo Dom
// Body : { email, password }
// Retourne un JWT (24h) + dépose le cookie HttpOnly optimmo_jwt.
// Rate limiting : 5 tentatives / 15 min par email (stocké en Blobs).

import {
  jsonResp, handleOptions, dbGet, dbSet,
  verifyPassword, signJWT, normalizeEmail,
} from "./_auth.mjs";

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000;

export async function handler(event) {
  const opts = handleOptions(event);
  if (opts) return opts;
  if (event.httpMethod !== "POST") return jsonResp(405, { error: "Méthode non autorisée" });

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return jsonResp(400, { error: "JSON invalide" }); }

  const email = normalizeEmail(body.email);
  const password = body.password;
  if (!email || !password) return jsonResp(400, { error: "Email et mot de passe requis" });

  // Rate limiting par email
  const rlKey = `ratelimit:${email}`;
  const rl = (await dbGet("optimmo-sessions", rlKey)) || { attempts: [], };
  const now = Date.now();
  rl.attempts = (rl.attempts || []).filter((t) => now - t < WINDOW_MS);
  if (rl.attempts.length >= MAX_ATTEMPTS) {
    return jsonResp(429, { error: "Trop de tentatives — réessayez dans 15 minutes" });
  }

  const user = await dbGet("optimmo-users", email);
  const valid = user && verifyPassword(password, user.salt, user.hash);

  if (!valid) {
    rl.attempts.push(now);
    await dbSet("optimmo-sessions", rlKey, rl);
    return jsonResp(401, { error: "Identifiants incorrects" });
  }

  if (!user.actif) return jsonResp(403, { error: "Compte suspendu — contactez contact@fidiconseil.com" });

  // Reset rate limit + émettre le token
  await dbSet("optimmo-sessions", rlKey, { attempts: [] });
  const token = signJWT({ sub: user.id, email: user.email, role: user.role, plan: user.plan });

  const planActive = user.plan_expires_at && new Date(user.plan_expires_at) > new Date();

  return jsonResp(200, {
    success: true,
    token,
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      plan: planActive ? user.plan : null,
      plan_expires_at: planActive ? user.plan_expires_at : null,
    },
  }, {
    "Set-Cookie": `optimmo_jwt=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`,
  });
}
