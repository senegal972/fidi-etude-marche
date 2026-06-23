// POST /api/auth/logout — Déconnexion : révoque la session (jti) + efface le cookie.

import { jsonResp, handleOptions, checkAuth, dbSet } from "./_auth.mjs";

export async function handler(event) {
  const opts = handleOptions(event);
  if (opts) return opts;
  if (event.httpMethod !== "POST") return jsonResp(405, { error: "Méthode non autorisée" });

  const user = await checkAuth(event);
  if (user?.jti) {
    await dbSet("optimmo-sessions", user.jti, { user_id: user.id, revoked: true, revoked_at: new Date().toISOString() });
  }

  return jsonResp(200, { success: true }, {
    "Set-Cookie": "optimmo_jwt=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
  });
}
