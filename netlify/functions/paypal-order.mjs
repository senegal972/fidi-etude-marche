// POST /api/paypal/order — Accès à la demande (paiement one-shot) Optimmo Dom
// Body : { action: "create", produit: "avis_valeur"|"etude_marche"|"dvf" }
//      | { action: "capture", order_id: "..." }
// "create"  → crée l'ordre PayPal (Smart Buttons côté client)
// "capture" → capture le paiement et accorde l'accès 30 jours

import { jsonResp, handleOptions, checkAuth, dbSet } from "./_auth.mjs";
import { paypalAPI, ONESHOT_PRODUCTS } from "./_paypal.mjs";

const GRANT_DAYS = 30;

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
    if (body.action === "create") return await createOrder(user, body);
    if (body.action === "capture") return await captureOrder(user, body);
    return jsonResp(400, { error: "Action inconnue (create | capture)" });
  } catch (e) {
    return jsonResp(502, { error: "Service PayPal indisponible", detail: e.message });
  }
}

async function createOrder(user, body) {
  const product = ONESHOT_PRODUCTS[body.produit];
  if (!product) return jsonResp(400, { error: "Produit invalide (avis_valeur | etude_marche | dvf)" });

  const { ok, data } = await paypalAPI("POST", "/v2/checkout/orders", {
    intent: "CAPTURE",
    purchase_units: [{
      reference_id: `${user.id}:${body.produit}`,
      custom_id: user.id,
      description: product.label,
      amount: { currency_code: "EUR", value: product.prix },
    }],
    application_context: { brand_name: "Optimmo Dom", locale: "fr-FR" },
  });

  if (!ok) return jsonResp(502, { error: "Création ordre PayPal échouée", detail: data });
  return jsonResp(200, { order_id: data.id, produit: body.produit, prix: product.prix });
}

async function captureOrder(user, body) {
  const orderId = body.order_id;
  if (!orderId) return jsonResp(400, { error: "order_id requis" });

  const { ok, data } = await paypalAPI("POST", `/v2/checkout/orders/${orderId}/capture`);
  if (!ok || data.status !== "COMPLETED") {
    return jsonResp(402, { error: "Paiement non confirmé", statut: data.status });
  }

  const unit = data.purchase_units?.[0];
  const reference = unit?.reference_id || "";
  const [refUserId, produit] = reference.split(":");

  // Sécurité : l'ordre doit avoir été créé pour cet utilisateur et un produit connu
  if (refUserId !== user.id || !ONESHOT_PRODUCTS[produit]) {
    return jsonResp(403, { error: "Ordre invalide pour ce compte" });
  }

  const expiresAt = new Date(Date.now() + GRANT_DAYS * 24 * 3600 * 1000).toISOString();
  await dbSet("optimmo-grants", `${user.id}:${produit}`, {
    outil: produit,
    expires_at: expiresAt,
    paypal_order_id: orderId,
    granted_at: new Date().toISOString(),
  });

  return jsonResp(200, { success: true, outil: produit, expires_at: expiresAt });
}
