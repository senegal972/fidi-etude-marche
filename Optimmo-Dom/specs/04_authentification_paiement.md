# Phase 4 — Authentification & Paiement PayPal
## Projet Optimmo Dom · Module Sécurité & Monétisation

---

## 1. Architecture d'Authentification

```mermaid
graph TB
    subgraph CLIENT["Client (Browser)"]
        COOKIE["Cookie HttpOnly\n(jwt_token, exp 24h)"]
        LOCAL["LocalStorage\n(user_display_name, plan - non sensible)"]
    end

    subgraph NETLIFY_FUNCTIONS["Netlify Functions (serveur)"]
        AUTH_LOGIN["/api/auth/login"]
        AUTH_LOGOUT["/api/auth/logout"]
        AUTH_REGISTER["/api/auth/register"]
        AUTH_REFRESH["/api/auth/refresh"]
        AUTH_FORGOT["/api/auth/forgot-password"]
        AUTH_RESET["/api/auth/reset-password"]
        AUTH_ME["/api/auth/me"]
        MIDDLEWARE["checkAuth(req)\n(middleware partagé)"]
    end

    subgraph DB["Supabase PostgreSQL"]
        USERS_TABLE["users\n(id, email, password_hash, role, plan...)"]
        SESSIONS_TABLE["sessions\n(jti, user_id, expires_at, revoked)"]
        RESET_TABLE["password_resets\n(token_hash, user_id, expires_at)"]
    end

    CLIENT <--> AUTH_LOGIN
    CLIENT <--> AUTH_REFRESH
    AUTH_LOGIN --> USERS_TABLE
    AUTH_LOGIN --> SESSIONS_TABLE
    MIDDLEWARE --> SESSIONS_TABLE
```

---

## 2. Flow Complet d'Inscription

```mermaid
flowchart TD
    START["Visiteur → /register"]
    FORM["Formulaire :\n- Prénom, Nom\n- Email\n- Téléphone\n- Mot de passe (x2)\n- Type : particulier / professionnel\n- Territoire : MQ/GP/les deux\n- Code parrainage (optionnel)\n- Acceptation CGU"]

    VALIDATE{"Validation client:\n- Email format\n- MDP min 8 car.\n- Confirmation identique"}

    POST["POST /api/auth/register"]

    CHECK_EMAIL{"Email déjà\nexistant ?"}
    EMAIL_EXISTS["Erreur : 'Compte existant\nse connecter ou réinitialiser'"]

    HASH["bcrypt hash(password, salt=12)"]
    CREATE_USER["INSERT users\n(statut: en_attente)"]
    SEND_VERIFY["Envoi email vérification\n(token = UUID, exp 24h)"]
    SUCCESS_PAGE["Page : 'Vérifiez votre email'"]

    CLICK_LINK["Clic lien /verify-email?token=..."]
    VERIFY_TOKEN{"Token valide\n& non expiré ?"}
    EXPIRED["Page : 'Lien expiré\n→ Renvoyer'"]
    ACTIVATE["UPDATE users SET statut='actif'\nDELETE token"]
    REDIRECT_LOGIN["→ /login avec message 'Compte activé !'"]

    CHOOSE_PLAN["→ /abonnement\n(choix du plan)"]

    START --> FORM --> VALIDATE
    VALIDATE -->|NON| FORM
    VALIDATE -->|OUI| POST
    POST --> CHECK_EMAIL
    CHECK_EMAIL -->|OUI| EMAIL_EXISTS
    CHECK_EMAIL -->|NON| HASH --> CREATE_USER --> SEND_VERIFY --> SUCCESS_PAGE
    SUCCESS_PAGE --> CLICK_LINK
    CLICK_LINK --> VERIFY_TOKEN
    VERIFY_TOKEN -->|Expiré| EXPIRED
    VERIFY_TOKEN -->|Valide| ACTIVATE --> REDIRECT_LOGIN --> CHOOSE_PLAN
```

---

## 3. Réinitialisation de Mot de Passe

```mermaid
sequenceDiagram
    participant U as Utilisateur
    participant F as Frontend
    participant API as /api/auth
    participant DB as Supabase
    participant MAIL as Email Service

    U->>F: Clique "Mot de passe oublié"
    F->>F: Affiche champ email
    U->>F: Saisit email
    F->>API: POST /forgot-password {email}
    API->>DB: SELECT user WHERE email=?
    Note over API: Toujours répondre 200 (anti-enumeration)
    API->>DB: INSERT password_reset (token_hash, exp 1h)
    API->>MAIL: Envoi email lien reset
    API->>F: 200 {message: "Si l'email existe, un lien a été envoyé"}
    F->>U: Message de confirmation
    U->>F: Clique lien email /reset-password?token=xxx
    F->>API: GET /reset-password?token=xxx (validation)
    API->>DB: SELECT reset WHERE token_hash = hash(xxx) AND exp > now()
    API->>F: 200 {valid: true} ou 400
    F->>U: Formulaire nouveau mot de passe
    U->>F: Nouveau MDP + confirmation
    F->>API: POST /reset-password {token, password}
    API->>DB: UPDATE user SET password_hash = bcrypt(password)
    API->>DB: DELETE password_reset
    API->>F: 200 {success: true}
    F->>U: "Mot de passe changé → Se connecter"
```

---

## 4. Architecture PayPal — Abonnements

```mermaid
flowchart TD
    subgraph PAYPAL_PLANS["Plans PayPal (pré-créés dans PayPal Dashboard)"]
        PP_BASIC["Plan ID: P-BASIC-OPTIMMO DOM\n29€/mois · facturation mensuelle"]
        PP_PRO["Plan ID: P-PRO-OPTIMMO DOM\n79€/mois · facturation mensuelle"]
        PP_PREM["Plan ID: P-PREMIUM-OPTIMMO DOM\n149€/mois · facturation mensuelle"]
    end

    subgraph FLOW_SUB["Flow Souscription Abonnement"]
        USER_CHOOSE["Utilisateur choisit un plan"]
        INIT["POST /api/payments/create-subscription\n{plan_id}"]
        PAYPAL_REDIRECT["Redirection PayPal\n(approval URL)"]
        PP_APPROVE["Utilisateur approuve sur PayPal"]
        RETURN_URL["Return URL :\n/paiement/success?subscription_id=..."]
        CAPTURE["POST /api/payments/activate-subscription\n{subscription_id}"]
        VERIFY["Vérification PayPal API\n(status = ACTIVE ?)"]
        UPDATE_DB["UPDATE subscriptions\n(paypal_subscription_id, plan, statut='actif')"]
        DASH_REDIRECT["→ Dashboard avec accès débloqué"]
    end

    subgraph WEBHOOKS["PayPal Webhooks → /api/payments/webhook"]
        WH1["BILLING.SUBSCRIPTION.ACTIVATED → activer"]
        WH2["BILLING.SUBSCRIPTION.SUSPENDED → suspendre"]
        WH3["BILLING.SUBSCRIPTION.CANCELLED → désactiver"]
        WH4["PAYMENT.SALE.COMPLETED → renouveler expiry"]
        WH5["BILLING.SUBSCRIPTION.PAYMENT.FAILED → email alerte"]
    end

    USER_CHOOSE --> INIT --> PAYPAL_REDIRECT --> PP_APPROVE --> RETURN_URL --> CAPTURE --> VERIFY --> UPDATE_DB --> DASH_REDIRECT
    WEBHOOKS --> UPDATE_DB
```

---

## 5. Architecture PayPal — Accès à la Demande (One-Shot)

```mermaid
flowchart TD
    subgraph ONESHOT_FLOW["Flow One-Shot"]
        USER["Utilisateur veut\nun outil sans abonnement"]
        PRICING_MODAL["Modale prix :\n- Avis de valeur : 19€\n- Étude de marché : 29€\n- Rapport DVF : 9€"]
        CREATE_ORDER["POST /api/payments/create-order\n{product_id, user_id}"]
        PP_BUTTONS["PayPal Smart Payment Buttons\n(SDK JS côté client)"]
        APPROVE["onApprove callback"]
        CAPTURE_ORDER["POST /api/payments/capture-order\n{order_id}"]
        VERIFY_ORDER{"Paiement\nconfirmé ?"}
        GRANT_ACCESS["INSERT access_grants\n(user_id, outil, expires_at = +30 jours)"]
        REDIRECT_TOOL["→ Outil débloqué"]
        FAIL["Erreur paiement\n→ Message utilisateur"]
    end

    USER --> PRICING_MODAL --> CREATE_ORDER
    CREATE_ORDER --> PP_BUTTONS
    PP_BUTTONS --> APPROVE --> CAPTURE_ORDER
    CAPTURE_ORDER --> VERIFY_ORDER
    VERIFY_ORDER -->|OUI| GRANT_ACCESS --> REDIRECT_TOOL
    VERIFY_ORDER -->|NON| FAIL
```

---

## 6. Pseudocode Netlify Functions Paiement

```
// netlify/functions/payments-create-subscription.mjs
FUNCTION handler(event):
  IF event.httpMethod != "POST" → RETURN 405

  user = await checkAuth(event)  // middleware JWT
  IF !user → RETURN 401

  body = JSON.parse(event.body)
  plan_id = body.plan_id

  VALID_PLANS = {
    "basic":   env.PAYPAL_PLAN_ID_BASIC,
    "pro":     env.PAYPAL_PLAN_ID_PRO,
    "premium": env.PAYPAL_PLAN_ID_PREMIUM
  }

  IF plan_id NOT IN VALID_PLANS → RETURN 400

  // Appel PayPal API v2
  paypal_token = await getPayPalAccessToken()
  subscription = await paypalAPI.POST("/v1/billing/subscriptions", {
    plan_id: VALID_PLANS[plan_id],
    subscriber: {
      email_address: user.email,
      name: { given_name: user.prenom, surname: user.nom }
    },
    application_context: {
      return_url: env.BASE_URL + "/paiement/success",
      cancel_url: env.BASE_URL + "/paiement/annule"
    }
  })

  RETURN 200 {
    subscription_id: subscription.id,
    approval_url: subscription.links.find(l => l.rel=="approve").href
  }

// netlify/functions/payments-webhook.mjs
FUNCTION handler(event):
  // Vérification signature PayPal (CRITIQUE sécurité)
  isValid = verifyPayPalWebhook(event.headers, event.body)
  IF !isValid → RETURN 400

  payload = JSON.parse(event.body)
  subscription_id = payload.resource.id

  SWITCH payload.event_type:
    CASE "BILLING.SUBSCRIPTION.ACTIVATED":
      await db.subscriptions.update({
        paypal_subscription_id: subscription_id,
        statut: "actif"
      })
      await sendEmail(user.email, "Votre abonnement Optimmo Dom est activé !")

    CASE "BILLING.SUBSCRIPTION.CANCELLED":
      await db.subscriptions.update({
        paypal_subscription_id: subscription_id,
        statut: "annulé"
      })
      // Accès conservé jusqu'à la fin de la période payée

    CASE "BILLING.SUBSCRIPTION.PAYMENT.FAILED":
      await db.subscriptions.update({ statut: "suspendu" })
      await sendEmail(user.email, "Problème de paiement — Mettre à jour")

    CASE "PAYMENT.SALE.COMPLETED":
      sub = await db.subscriptions.findByPayPalId(subscription_id)
      await db.subscriptions.update({
        prochaine_echeance: addMonths(now(), 1)
      })

  RETURN 200

TDD_ANCHORS:
  - création abonnement BASIC retourne approval_url ✓
  - plan invalide → 400 ✓
  - webhook sans signature valide → 400 ✓
  - webhook CANCELLED → statut annulé en DB ✓
  - one-shot paiement capturé → access_grant créé ✓
  - access_grant expiré → accès refusé ✓
```

---

## 7. Variables d'Environnement Requises

```
# Supabase
SUPABASE_URL=https://xxx.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_KEY=eyJ...  (functions serveur uniquement)

# JWT
JWT_SECRET=<256-bit random secret>
JWT_EXPIRY=86400  # 24h en secondes

# PayPal
PAYPAL_CLIENT_ID=AYm...
PAYPAL_CLIENT_SECRET=EGj...
PAYPAL_PLAN_ID_BASIC=P-xxx
PAYPAL_PLAN_ID_PRO=P-xxx
PAYPAL_PLAN_ID_PREMIUM=P-xxx
PAYPAL_WEBHOOK_ID=xxx  # pour vérification signature

# Email (Resend ou SendGrid)
EMAIL_API_KEY=re_xxx
EMAIL_FROM=contact@optimmo-dom.fr

# App
BASE_URL=https://optimmo-dom.fr
PAPPERS_API_KEY=xxx  # hérité fidi-etude-marche
```

---

## 8. Page de Choix de Plan

```
COMPONENT PricingPage:
  STATE:
    selectedPlan: "basic"|"pro"|"premium" = "pro"
    billingCycle: "monthly" = "monthly"  // v2: "annual" avec -20%
    loading: bool = false

  RENDER:
    <section class="pricing">
      <h2>Choisissez votre accès</h2>
      <BillingToggle [value=billingCycle] [onChange=setBillingCycle] />

      <div class="pricing-grid">
        FOR EACH plan IN [basic, pro, premium]:
          <PricingCard
            [plan=plan]
            [price=getPrice(plan, billingCycle)]
            [features=PLAN_FEATURES[plan]]
            [highlighted=plan=="pro"]
            [selected=selectedPlan==plan]
            [onSelect=() => selectedPlan = plan]
          />
      </div>

      <div class="oneshot-section">
        <h3>Accès à la demande (sans abonnement)</h3>
        <OneShotCard outil="avis_valeur" price="19€" />
        <OneShotCard outil="etude_marche" price="29€" />
        <OneShotCard outil="dvf" price="9€" />
      </div>

      <PrimaryButton
        [loading=loading]
        [onClick=initPayment]
      >
        Commencer avec {selectedPlan} — {getPrice(selectedPlan)}€/mois
      </PrimaryButton>

      <p class="legal">
        Sans engagement · Annulation à tout moment · Paiement sécurisé PayPal
      </p>
    </section>
```
