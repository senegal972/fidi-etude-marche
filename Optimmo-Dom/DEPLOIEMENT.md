# Déploiement & Configuration — Optimmo Dom

> Guide de mise en production du site **Optimmo Dom** et de l'**Espace Partenaires**
> (authentification JWT + paiements PayPal) sur Netlify.
> Domaine cible : **fidiconseil.com**

---

## 1. Vue d'ensemble

| Composant | Emplacement | Dépend de |
|-----------|-------------|-----------|
| Site public | `Optimmo-Dom/*.html` | — |
| Espace Partenaires (front) | `Optimmo-Dom/espace-partenaires/*.html` | API auth + PayPal |
| API Auth | `netlify/functions/auth-*.mjs` | `JWT_SECRET`, Netlify Blobs |
| API Paiements | `netlify/functions/paypal-*.mjs` | identifiants PayPal |
| Outils d'analyse | `netlify/functions/{analyse,transactions,…}.mjs` | (clés optionnelles) |

Le déploiement est **automatique** : tout push sur `main` déclenche un build Netlify.
Aucune étape de build front (HTML servi tel quel).

---

## 2. Variables d'environnement Netlify

À configurer dans **Netlify → Site configuration → Environment variables**
(ou via CLI `npx netlify env:set NOM "valeur"`).

### 2.1 Authentification (obligatoire)

| Variable | Obligatoire | Description |
|----------|:-----------:|-------------|
| `JWT_SECRET` | ✅ | Clé secrète de signature des JWT (HMAC-SHA256). **Sans elle, la connexion échoue.** |

Génération d'un secret robuste :

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

> ⚠️ Ne jamais committer cette valeur. La changer invalide toutes les sessions en cours.

### 2.2 Paiements PayPal (obligatoire pour les abonnements)

| Variable | Obligatoire | Description |
|----------|:-----------:|-------------|
| `PAYPAL_CLIENT_ID` | ✅ | Client ID de l'application PayPal (REST API). |
| `PAYPAL_CLIENT_SECRET` | ✅ | Secret de l'application PayPal. |
| `PAYPAL_ENV` | ➖ | `sandbox` (défaut) ou `live` en production. |
| `PAYPAL_PLAN_ID_BASIC` | ✅ | ID du plan d'abonnement Basic (29 €/mois). |
| `PAYPAL_PLAN_ID_PRO` | ✅ | ID du plan d'abonnement Pro (79 €/mois). |
| `PAYPAL_PLAN_ID_PREMIUM` | ✅ | ID du plan d'abonnement Premium (149 €/mois). |
| `PAYPAL_WEBHOOK_ID` | ✅ | ID du webhook PayPal (vérification de signature). |
| `BASE_URL` | ➖ | URL publique du site (défaut `https://fidiconseil.com`). Sert aux `return_url`/`cancel_url` PayPal. |

### 2.3 Outils d'analyse (optionnel)

| Variable | Description |
|----------|-------------|
| `PAPPERS_API_KEY` | Clé Pappers pour `/api/pappers` (santé financière). |
| `SENTRY_DSN` | Monitoring Sentry (optionnel). |

---

## 3. Configuration PayPal pas à pas

### 3.1 Créer l'application REST

1. Se connecter sur <https://developer.paypal.com/dashboard/applications>.
2. **Apps & Credentials** → bascule **Sandbox** (tests) ou **Live** (production).
3. **Create App** → nommer « Optimmo Dom ».
4. Copier le **Client ID** → `PAYPAL_CLIENT_ID` et le **Secret** → `PAYPAL_CLIENT_SECRET`.

### 3.2 Créer les produits & plans d'abonnement

Les abonnements PayPal nécessitent un **Product** puis des **Plans**.
Via l'API (le plus simple) une fois le token obtenu, ou via
**Pay → Subscriptions** dans le dashboard PayPal.

Exemple de création d'un produit (API) :

```bash
# 1. Obtenir un token
TOKEN=$(curl -s -u "$PAYPAL_CLIENT_ID:$PAYPAL_CLIENT_SECRET" \
  https://api-m.sandbox.paypal.com/v1/oauth2/token \
  -d grant_type=client_credentials | node -pe "JSON.parse(require('fs').readFileSync(0)).access_token")

# 2. Créer le produit
curl -s https://api-m.sandbox.paypal.com/v1/catalogs/products \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{"name":"Optimmo Dom — Outils d'analyse","type":"SERVICE","category":"SOFTWARE"}'
# → noter l'"id" retourné (PROD-XXXX)
```

Puis créer **trois plans** (Basic 29 €, Pro 79 €, Premium 149 €), facturation
mensuelle, devise **EUR**. Pour chacun :

```bash
curl -s https://api-m.sandbox.paypal.com/v1/billing/plans \
  -H "Authorization: Bearer $TOKEN" -H "Content-Type: application/json" \
  -d '{
    "product_id":"PROD-XXXX",
    "name":"Optimmo Dom — Pro",
    "billing_cycles":[{
      "frequency":{"interval_unit":"MONTH","interval_count":1},
      "tenure_type":"REGULAR","sequence":1,"total_cycles":0,
      "pricing_scheme":{"fixed_price":{"value":"79","currency_code":"EUR"}}
    }],
    "payment_preferences":{"auto_bill_outstanding":true,"setup_fee_failure_action":"CANCEL","payment_failure_threshold":1}
  }'
# → noter l'"id" (P-XXXX) → PAYPAL_PLAN_ID_PRO
```

Reporter les trois IDs `P-XXXX` dans `PAYPAL_PLAN_ID_BASIC/PRO/PREMIUM`.

### 3.3 Configurer le webhook

1. Dashboard PayPal → **Apps & Credentials** → votre app → **Webhooks** → **Add Webhook**.
2. URL : `https://fidiconseil.com/api/paypal/webhook`
3. Événements à cocher :
   - `BILLING.SUBSCRIPTION.ACTIVATED`
   - `BILLING.SUBSCRIPTION.CANCELLED`
   - `BILLING.SUBSCRIPTION.SUSPENDED`
   - `BILLING.SUBSCRIPTION.EXPIRED`
   - `PAYMENT.SALE.COMPLETED`
4. Copier le **Webhook ID** généré → `PAYPAL_WEBHOOK_ID`.

### 3.4 Client-id public pour le paiement à la carte

Le paiement **one-shot** (accès 30 jours) utilise les PayPal Smart Buttons côté
navigateur. Renseigner le **même Client ID public** dans la balise meta de
`Optimmo-Dom/espace-partenaires/paiement.html` :

```html
<meta name="paypal-client-id" content="VOTRE_CLIENT_ID_PUBLIC" />
```

> Laisser vide désactive proprement le paiement à la carte (message d'attente
> affiché à l'utilisateur). Les abonnements ne sont pas concernés.

---

## 4. Netlify Blobs (persistance)

L'authentification stocke ses données dans **Netlify Blobs** (aucune base
externe). Les stores sont créés automatiquement au premier accès :

| Store | Contenu |
|-------|---------|
| `optimmo-users` | Comptes partenaires (email → profil, hash scrypt, plan). |
| `optimmo-sessions` | Sessions JWT (jti) + rate-limiting connexion. |
| `optimmo-grants` | Accès one-shot (userId:outil → expiration). |

Netlify Blobs est activé par défaut sur les sites avec Functions. Aucune
configuration supplémentaire requise.

---

## 5. Création du premier compte partenaire

L'inscription se fait via l'endpoint `POST /api/auth/register`. Une fois le site
déployé :

```bash
curl -s https://fidiconseil.com/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email":"partenaire@exemple.com",
    "password":"motDePasseFort123",
    "nom":"Dupont",
    "prenom":"Marie"
  }'
```

Le compte est créé **sans abonnement actif** : l'utilisateur se connecte sur
`/espace-partenaires/`, accède au tableau de bord, puis souscrit une formule
(Basic/Pro/Premium) ou un accès à la carte.

> Pour accorder un plan manuellement (ex. compte de démonstration), mettre à jour
> l'entrée du store `optimmo-users` avec `plan` et `plan_expires_at` via le
> dashboard Netlify Blobs ou un script Function dédié.

---

## 6. Procédure de déploiement

```bash
# 1. Configurer les variables (exemple sandbox)
npx netlify env:set JWT_SECRET "$(node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))")"
npx netlify env:set PAYPAL_CLIENT_ID "AXxxxx"
npx netlify env:set PAYPAL_CLIENT_SECRET "EFxxxx"
npx netlify env:set PAYPAL_ENV "sandbox"
npx netlify env:set PAYPAL_PLAN_ID_BASIC "P-xxxx"
npx netlify env:set PAYPAL_PLAN_ID_PRO "P-xxxx"
npx netlify env:set PAYPAL_PLAN_ID_PREMIUM "P-xxxx"
npx netlify env:set PAYPAL_WEBHOOK_ID "WH-xxxx"
npx netlify env:set BASE_URL "https://fidiconseil.com"

# 2. Vérifier la configuration
npx netlify build --dry

# 3. Lancer les tests de conformité
npm test            # 125 tests — fonctions Netlify
npm run check       # vérification syntaxe ESM

# 4. Déploiement : merge sur main → build automatique
git checkout main && git merge claude/optimodum-website-project-1ff0d5
git push origin main
```

---

## 7. Tests post-déploiement

| Vérification | Comment |
|--------------|---------|
| Site public | Ouvrir `https://fidiconseil.com/` (sert le dossier `Optimmo-Dom/`) |
| Connexion | `/espace-partenaires/` → identifiants → redirection tableau de bord |
| Tableau de bord | Les outils s'affichent verrouillés/déverrouillés selon le plan |
| Abonnement | Cliquer « Choisir Pro » → redirection PayPal → retour `paiement-succes.html` |
| Webhook | Dashboard PayPal → Webhooks → **Send test** → vérifier réponse `200` |
| Outils d'analyse | Outil débloqué → ouvre l'application d'étude de marché (`/index.html`) |

### Passage en production (live)

1. Recréer l'application PayPal et les plans en mode **Live**.
2. Mettre à jour `PAYPAL_ENV=live` et tous les IDs PayPal (client, plans, webhook).
3. Mettre à jour le `content` de la meta `paypal-client-id` dans `paiement.html`
   avec le Client ID **live**.
4. Vérifier `BASE_URL=https://fidiconseil.com`.

---

## 8. Sécurité — rappels

- `JWT_SECRET` et les secrets PayPal ne sont **jamais** dans le code (uniquement
  `process.env`). Les tests CI échouent si un secret est codé en dur.
- Les mots de passe sont hachés avec **scrypt** (sel aléatoire par compte).
- Le JWT est stocké dans un cookie **HttpOnly + Secure + SameSite=Lax** (24 h),
  avec repli `Authorization: Bearer` côté client.
- Connexion limitée à **5 tentatives / 15 min** par email (anti brute-force).
- Les abonnements vérifient le `custom_id` PayPal = `user.id` (anti-détournement).
- Les webhooks vérifient la **signature PayPal** avant tout traitement.

---

## 9. Raccordement du domaine `fidiconseil.com` (registrar Gandi)

Le domaine est enregistré chez **Gandi** ; le site est hébergé sur **Netlify**.
Deux méthodes au choix.

### Étape commune — déclarer le domaine sur Netlify

1. Netlify → projet `fidi-etude-marche` → **Domain management** → **Add a domain**.
2. Saisir `fidiconseil.com` → **Verify** → **Add domain**.
3. Netlify propose alors soit ses **nameservers** (option A), soit des
   **enregistrements DNS** à créer (option B).

### Option A — Déléguer le DNS à Netlify (recommandé, le plus simple)

Donne le HTTPS automatique et gère l'apex sans configuration manuelle.

1. Dans Netlify, après ajout du domaine → **Set up Netlify DNS** → Netlify
   affiche **4 nameservers** (ex. `dns1.p0X.nsone.net`, … — propres à votre zone).
2. Chez **Gandi** → domaine `fidiconseil.com` → onglet **Nameservers / Serveurs
   de noms** → **Modifier / External** → remplacer par les **4 nameservers
   Netlify** copiés à l'étape 1.
3. Patienter la propagation DNS (de quelques minutes à 24 h). Netlify émet
   automatiquement le certificat **Let's Encrypt** (HTTPS).

> ⚠️ Cette option transfère **toute** la gestion DNS à Netlify. Si des e-mails
> `@fidiconseil.com` (MX) ou d'autres enregistrements existent chez Gandi,
> recréez-les dans Netlify DNS **avant** de basculer les nameservers, sinon la
> messagerie sera interrompue.

### Option B — Garder le DNS Gandi (Gandi LiveDNS)

À privilégier si votre messagerie / vos enregistrements restent gérés par Gandi.

Chez **Gandi** → domaine → **Enregistrements DNS (LiveDNS)** → ajouter :

| Type | Nom | Valeur | TTL |
|------|-----|--------|-----|
| `A` | `@` | `75.2.60.5` | 1800 |
| `CNAME` | `www` | `fidi-etude-marche.netlify.app.` | 1800 |

- `@` = l'apex `fidiconseil.com` ; `75.2.60.5` est le load-balancer Netlify.
- Si votre LiveDNS propose un type **`ALIAS`/`ANAME`**, vous pouvez l'utiliser sur
  `@` avec la valeur `apex-loadbalancer.netlify.com.` (alternative au `A`).
- Dans Netlify, après propagation, **Verify DNS configuration** puis laisser
  Netlify provisionner le certificat HTTPS.

### Après raccordement

- Définir `fidiconseil.com` comme **domaine principal** dans Netlify (redirige
  `www` → apex ou inversement, au choix).
- Mettre à jour la variable d'environnement `BASE_URL=https://fidiconseil.com`.
- Vérifier que `https://fidiconseil.com` redirige vers le site Optimmo Dom
  (dossier `/Optimmo-Dom/`, cf. règle de redirection du `netlify.toml`).
- Mettre à jour les **return_url / webhook PayPal** sur le domaine définitif.
