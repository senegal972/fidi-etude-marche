// POST /api/paypal/webhook — Webhooks PayPal (abonnements) Optimmo Dom
// Configurer dans le dashboard PayPal : URL = https://<domaine>/api/paypal/webhook
// Événements : BILLING.SUBSCRIPTION.* + PAYMENT.SALE.COMPLETED
// La signature est vérifiée via l'API PayPal (PAYPAL_WEBHOOK_ID requis).

import { jsonResp, handleOptions, dbGet, dbSet } from "./_auth.mjs";
import { verifyWebhookSignature } from "./_paypal.mjs";

export async function handler(event) {
  const opts = handleOptions(event);
  if (opts) return opts;
  if (event.httpMethod !== "POST") return jsonResp(405, { error: "Méthode non autorisée" });

  const verified = await verifyWebhookSignature(event.headers || {}, event.body || "{}");
  if (!verified) return jsonResp(400, { error: "Signature webhook invalide" });

  let payload;
  try { payload = JSON.parse(event.body); }
  catch (e) { return jsonResp(400, { error: "JSON invalide" }); }

  const resource = payload.resource || {};
  const userId = resource.custom_id;

  // Retrouver l'utilisateur par id (scan paresseux : on stocke un index id→email)
  // Les abonnements portent custom_id = user.id posé à la création.
  const indexKey = `index:${userId}`;
  const userEmail = userId ? await dbGet("optimmo-grants", indexKey) : null;

  switch (payload.event_type) {
    case "BILLING.SUBSCRIPTION.ACTIVATED": {
      // L'activation est gérée principalement par /api/paypal/subscription (action activate).
      // Le webhook sert de filet de sécurité ; on indexe l'id → subscription.
      if (userId) {
        await dbSet("optimmo-grants", `sub:${resource.id}`, {
          user_id: userId, statut: "actif", updated_at: new Date().toISOString(),
        });
      }
      break;
    }

    case "BILLING.SUBSCRIPTION.SUSPENDED":
    case "BILLING.SUBSCRIPTION.CANCELLED":
    case "BILLING.SUBSCRIPTION.EXPIRED": {
      // Marquer la souscription ; l'accès reste valide jusqu'à plan_expires_at
      // (déjà payé), puis expire naturellement sans renouvellement.
      await dbSet("optimmo-grants", `sub:${resource.id}`, {
        user_id: userId || null,
        statut: payload.event_type.split(".").pop().toLowerCase(),
        updated_at: new Date().toISOString(),
      });
      if (userEmail?.email) {
        const user = await dbGet("optimmo-users", userEmail.email);
        if (user && user.paypal_subscription_id === resource.id) {
          user.subscription_status = "cancelled";
          await dbSet("optimmo-users", userEmail.email, user);
        }
      }
      break;
    }

    case "PAYMENT.SALE.COMPLETED": {
      // Renouvellement mensuel : prolonger plan_expires_at de l'abonné.
      const subId = resource.billing_agreement_id;
      if (subId) {
        const subRecord = await dbGet("optimmo-grants", `sub:${subId}`);
        const email = subRecord?.email;
        if (email) {
          const user = await dbGet("optimmo-users", email);
          if (user) {
            user.plan_expires_at = new Date(Date.now() + 32 * 24 * 3600 * 1000).toISOString();
            await dbSet("optimmo-users", email, user);
          }
        }
      }
      break;
    }

    default:
      break; // Événement ignoré silencieusement
  }

  return jsonResp(200, { received: true });
}
