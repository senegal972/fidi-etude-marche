// /api/admin/users — Gestion des comptes (administrateur uniquement)
// GET  : liste des comptes (sans mot de passe) + catalogue des applications
// POST : { email, role?, apps?, actif? } — met à jour le rôle, les applications
//        attribuées et l'état actif/suspendu d'un compte.

import {
  jsonResp, handleOptions, checkAuth, dbGet, dbSet, dbList,
  normalizeEmail, effectiveRole, ROLES, APPS,
} from "./_auth.mjs";

function publicUser(u) {
  return {
    email: u.email, nom: u.nom, prenom: u.prenom,
    role: effectiveRole(u), apps: Array.isArray(u.apps) ? u.apps : [],
    actif: u.actif !== false, created_at: u.created_at || null,
  };
}

export async function handler(event) {
  const opts = handleOptions(event);
  if (opts) return opts;

  const me = await checkAuth(event);
  if (!me) return jsonResp(401, { error: "Non authentifié" });
  if (effectiveRole(me) !== "admin") return jsonResp(403, { error: "Réservé à l'administrateur" });

  if (event.httpMethod === "GET") {
    const keys = await dbList("optimmo-users");
    const users = (await Promise.all(keys.map((k) => dbGet("optimmo-users", k)))).filter(Boolean).map(publicUser);
    users.sort((a, b) => String(a.nom).localeCompare(String(b.nom), "fr"));
    const applications = Object.entries(APPS).map(([id, a]) => ({ id, nom: a.nom }));
    return jsonResp(200, { users, applications });
  }

  if (event.httpMethod === "POST") {
    let body;
    try { body = JSON.parse(event.body || "{}"); }
    catch (e) { return jsonResp(400, { error: "JSON invalide" }); }

    const email = normalizeEmail(body.email);
    const user = await dbGet("optimmo-users", email);
    if (!user) return jsonResp(404, { error: "Compte introuvable" });

    if (body.role !== undefined) {
      if (!ROLES.includes(body.role)) return jsonResp(400, { error: "Rôle inconnu" });
      if (email === me.email && body.role !== "admin") return jsonResp(400, { error: "Vous ne pouvez pas retirer votre propre rôle administrateur" });
      user.role = body.role;
    }
    if (body.apps !== undefined) {
      if (!Array.isArray(body.apps) || body.apps.some((a) => !APPS[a])) return jsonResp(400, { error: "Application inconnue" });
      user.apps = [...new Set(body.apps)];
    }
    if (body.actif !== undefined) {
      if (email === me.email && body.actif === false) return jsonResp(400, { error: "Vous ne pouvez pas suspendre votre propre compte" });
      user.actif = body.actif === true;
    }

    const saved = await dbSet("optimmo-users", email, user);
    if (!saved) return jsonResp(503, { error: "Stockage indisponible — réessayez plus tard" });
    return jsonResp(200, { success: true, user: publicUser(user) });
  }

  return jsonResp(405, { error: "Méthode non autorisée" });
}
