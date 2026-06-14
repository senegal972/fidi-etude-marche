// POST /api/auth/register — Inscription Espace Partenaires Optimmo Dom
// Body : { email, password, nom, prenom, telephone?, type? ("particulier"|"professionnel"), territoire? }
// Crée le compte avec plan null (choix du plan après inscription).

import { randomUUID } from "node:crypto";
import {
  jsonResp, handleOptions, dbGet, dbSet,
  hashPassword, normalizeEmail, isValidEmail,
} from "./_auth.mjs";

export async function handler(event) {
  const opts = handleOptions(event);
  if (opts) return opts;
  if (event.httpMethod !== "POST") return jsonResp(405, { error: "Méthode non autorisée" });

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return jsonResp(400, { error: "JSON invalide" }); }

  const email = normalizeEmail(body.email);
  const { password, nom, prenom } = body;

  if (!isValidEmail(email)) return jsonResp(400, { error: "Email invalide" });
  if (!password || password.length < 8) return jsonResp(400, { error: "Mot de passe : 8 caractères minimum" });
  if (!nom?.trim() || !prenom?.trim()) return jsonResp(400, { error: "Nom et prénom requis" });

  const existing = await dbGet("optimmo-users", email);
  if (existing) return jsonResp(409, { error: "Un compte existe déjà avec cet email" });

  const { salt, hash } = hashPassword(password);
  const user = {
    id: randomUUID(),
    email,
    nom: nom.trim(),
    prenom: prenom.trim(),
    telephone: body.telephone?.trim() || null,
    type: body.type === "professionnel" ? "professionnel" : "particulier",
    territoire: body.territoire || null,
    salt,
    hash,
    role: "partenaire",
    plan: null,
    plan_expires_at: null,
    actif: true,
    created_at: new Date().toISOString(),
  };

  const saved = await dbSet("optimmo-users", email, user);
  if (!saved) return jsonResp(503, { error: "Stockage indisponible — réessayez plus tard" });

  return jsonResp(201, {
    success: true,
    message: "Compte créé — vous pouvez vous connecter",
    user: { id: user.id, email, nom: user.nom, prenom: user.prenom, plan: null },
  });
}
