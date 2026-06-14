// Helpers PayPal REST API v2 — Optimmo Dom
// Variables d'environnement requises :
//   PAYPAL_CLIENT_ID, PAYPAL_CLIENT_SECRET
//   PAYPAL_ENV ("sandbox" par défaut, "live" en production)
//   PAYPAL_PLAN_ID_BASIC / _PRO / _PREMIUM (plans créés dans le dashboard PayPal)
//   PAYPAL_WEBHOOK_ID (vérification de signature des webhooks)

const TIMEOUT_MS = 8000;

export function paypalBase() {
  return process.env.PAYPAL_ENV === "live"
    ? "https://api-m.paypal.com"
    : "https://api-m.sandbox.paypal.com";
}

async function fetchTimeout(url, options = {}, ms = TIMEOUT_MS) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), ms);
  try { return await fetch(url, { ...options, signal: ctrl.signal }); }
  finally { clearTimeout(t); }
}

let tokenCache = { token: null, expires: 0 };

export async function getPayPalToken() {
  if (tokenCache.token && Date.now() < tokenCache.expires) return tokenCache.token;

  const id = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_CLIENT_SECRET;
  if (!id || !secret) throw new Error("PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET non configurés");

  const res = await fetchTimeout(`${paypalBase()}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      "Authorization": `Basic ${Buffer.from(`${id}:${secret}`).toString("base64")}`,
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
  });
  if (!res.ok) throw new Error(`PayPal OAuth: ${res.status}`);
  const data = await res.json();
  tokenCache = { token: data.access_token, expires: Date.now() + (data.expires_in - 60) * 1000 };
  return tokenCache.token;
}

export async function paypalAPI(method, path, body) {
  const token = await getPayPalToken();
  const res = await fetchTimeout(`${paypalBase()}${path}`, {
    method,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = res.status === 204 ? {} : await res.json().catch(() => ({}));
  return { status: res.status, ok: res.ok, data };
}

// Vérification de signature webhook via l'API PayPal (recommandé par PayPal).
export async function verifyWebhookSignature(headers, rawBody) {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;
  try {
    const { ok, data } = await paypalAPI("POST", "/v1/notifications/verify-webhook-signature", {
      auth_algo: headers["paypal-auth-algo"],
      cert_url: headers["paypal-cert-url"],
      transmission_id: headers["paypal-transmission-id"],
      transmission_sig: headers["paypal-transmission-sig"],
      transmission_time: headers["paypal-transmission-time"],
      webhook_id: webhookId,
      webhook_event: JSON.parse(rawBody),
    });
    return ok && data.verification_status === "SUCCESS";
  } catch (e) { return false; }
}

// ── Catalogue produits ────────────────────────────────────────────────────────
export const SUBSCRIPTION_PLANS = {
  basic:   { env_key: "PAYPAL_PLAN_ID_BASIC",   prix: 29 },
  pro:     { env_key: "PAYPAL_PLAN_ID_PRO",     prix: 79 },
  premium: { env_key: "PAYPAL_PLAN_ID_PREMIUM", prix: 149 },
};

export const ONESHOT_PRODUCTS = {
  avis_valeur:  { prix: "19.00", label: "Avis de valeur — accès 30 jours" },
  etude_marche: { prix: "29.00", label: "Étude de marché — accès 30 jours" },
  dvf:          { prix: "9.00",  label: "Rapport DVF — accès 30 jours" },
};
