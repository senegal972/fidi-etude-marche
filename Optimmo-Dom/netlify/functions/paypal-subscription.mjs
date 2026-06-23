// POST /api/paypal/subscription — Gestion des abonnements PayPal Optimmo Dom
// Body : { action: "create", plan: "basic"|"pro"|"premium" }
//      | { action: "activate", subscription_id: "I-..." }
// "create"   → crée l'abonnement PayPal, retourne l'approval_url
// "activate" → après approbation utilisateur, vérifie le statut et active le plan

import { jsonResp, handleOptions, checkAuth, dbGet, dbSet } from "./_auth.mjs";
import { paypalAPI, SUBSCRIPTION_PLANS } from "./_paypal.mjs";

export async function handler(event) {
  const opts = handleOptions(event);
  if (opts) return opts;
  if (event.httpMethod !== "POST") return jsonResp(405, { error: "Méthode non autorisée" });

  const user = await checkAuth(event);
  if (!user) return jsonResp(401, { error: "Non authentifié" });

  let body;
  try { body = JSON.parse(event.body || "{}"); }
  catch (e) { return jsonResp(400, { error: "JSON invalide" }); }

  try {
    if (body.action === "create") return await createSubscription(user, body);
    if (body.action === "activate") return await activateSubscription(user, body);
    return jsonResp(400, { error: "Action inconnue (create | activate)" });
  } catch (e) {
    return jsonResp(502, { error: "Service PayPal indisponible", detail: e.message });
  }
}

async function createSubscription(user, body) {
  const planDef = SUBSCRIPTION_PLANS[body.plan];
  if (!planDef) return jsonResp(400, { error: "Plan invalide (basic | pro | premium)" });

  const planId = process.env[planDef.env_key];
  if (!planId) return jsonResp(503, { error: `Plan PayPal non configuré (${planDef.env_key})` });

  const baseUrl = process.env.BASE_URL || "https://fidiconseil.com";
  const { ok, status, data } = await paypalAPI("POST", "/v1/billing/subscriptions", {
    plan_id: planId,
    custom_id: user.id,
    subscriber: {
      email_address: user.email,
      name: { given_name: user.prenom, surname: user.nom },
    },
    application_context: {
      brand_name: "Optimmo Dom",
      locale: "fr-FR",
      return_url: `${baseUrl}/espace-partenaires/paiement-succes.html?plan=${body.plan}`,
      cancel_url: `${baseUrl}/espace-partenaires/abonnement.html?annule=1`,
    },
  });

  if (!ok) return jsonResp(502, { error: "Création abonnement PayPal échouée", status, detail: data });

  const approvalUrl = (data.links || []).find((l) => l.rel === "approve")?.href;
  return jsonResp(200, { subscription_id: data.id, approval_url: approvalUrl, plan: body.plan });
}

async function activateSubscription(user, body) {
  const subId = body.subscription_id;
  if (!subId) return jsonResp(400, { error: "subscription_id requis" });

  const { ok, data } = await paypalAPI("GET", `/v1/billing/subscriptions/${subId}`);
  if (!ok) return jsonResp(502, { error: "Vérification PayPal échouée" });

  if (data.status !== "ACTIVE") {
    return jsonResp(409, { error: `Abonnement non actif (statut: ${data.status})` });
  }
  // Sécurité : l'abonnement doit appartenir à cet utilisateur
  if (data.custom_id && data.custom_id !== user.id) {
    return jsonResp(403, { error: "Cet abonnement appartient à un autre compte" });
  }

  // Déterminer le plan depuis le plan_id PayPal
  let plan = null;
  for (const [name, def] of Object.entries(SUBSCRIPTION_PLANS)) {
    if (process.env[def.env_key] === data.plan_id) { plan = name; break; }
  }
  if (!plan) return jsonResp(409, { error: "Plan PayPal non reconnu" });

  const nextBilling = data.billing_info?.next_billing_time
    || new Date(Date.now() + 32 * 24 * 3600 * 1000).toISOString();

  const stored = await dbGet("optimmo-users", user.email);
  if (!stored) return jsonResp(404, { error: "Utilisateur introuvable" });

  stored.plan = plan;
  stored.plan_expires_at = nextBilling;
  stored.paypal_subscription_id = subId;
  await dbSet("optimmo-users", user.email, stored);

  return jsonResp(200, { success: true, plan, plan_expires_at: nextBilling });
}
