// GET /api/auth/me — Profil de l'utilisateur connecté + droits outils
// Auth : Bearer token ou cookie optimmo_jwt.

import { jsonResp, handleOptions, checkAuth, checkToolAccess, TOOL_REQUIRED_PLAN } from "./_auth.mjs";

export async function handler(event) {
  const opts = handleOptions(event);
  if (opts) return opts;
  if (event.httpMethod !== "GET") return jsonResp(405, { error: "Méthode non autorisée" });

  const user = await checkAuth(event);
  if (!user) return jsonResp(401, { error: "Non authentifié" });

  // Droits sur chaque outil (abonnement ou one-shot)
  const outils = {};
  for (const tool of Object.keys(TOOL_REQUIRED_PLAN)) {
    const access = await checkToolAccess(user, tool);
    outils[tool] = access.authorized
      ? { acces: true, via: access.via }
      : { acces: false, plan_requis: access.required_plan };
  }

  const planActive = user.plan_expires_at && new Date(user.plan_expires_at) > new Date();

  return jsonResp(200, {
    user: {
      id: user.id,
      email: user.email,
      nom: user.nom,
      prenom: user.prenom,
      role: user.role,
      plan: planActive ? user.plan : null,
      plan_expires_at: planActive ? user.plan_expires_at : null,
    },
    outils,
  });
}
