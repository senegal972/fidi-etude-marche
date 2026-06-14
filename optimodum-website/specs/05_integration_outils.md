# Phase 5 — Intégration des Outils Existants
## Projet Optimmo Dom · Réutilisation fidi-etude-marche

---

## 1. Cartographie des Outils à Intégrer

```mermaid
graph LR
    subgraph EXISTING_REPO["Repo fidi-etude-marche (existant)"]
        subgraph FUNCTIONS["Netlify Functions (.mjs)"]
            F_ANALYSE["/api/analyse\n(analyse principale)"]
            F_TRANS["/api/transactions\n(DVF)"]
            F_BAT["/api/batiment\n(DPE)"]
            F_AUTO["/api/autocomplete\n(BAN)"]
            F_PERM["/api/permis\n(SITADEL)"]
            F_ENT["/api/entreprise\n(INPI)"]
            F_PAP["/api/pappers\n(santé financière)"]
            F_AV["/api/avis-de-valeur\n(avis vénale)"]
            F_LOY["/api/loyers\n(DHUP)"]
            F_REV["/api/revenus\n(INSEE)"]
        end

        subgraph FRONTEND_FILES["Fichiers Frontend"]
            AV_JS["avis-valeur.js"]
            AV_CSS["avis-valeur.css"]
            INDEX_HTML["index.html (étude marché)"]
        end
    end

    subgraph NEW_SITE["Nouveau site Optimmo Dom"]
        TOOL_AV["Outil Avis de Valeur\n(plan PRO+)"]
        TOOL_EM["Outil Étude de Marché\n(plan BASIC+)"]
        TOOL_DVF["Analyse DVF\n(plan BASIC+)"]
        TOOL_DPE["Analyse DPE\n(plan PRO+)"]
        TOOL_RISK["Analyse Risques\n(plan PRO+)"]
        TOOL_LOYERS["Données Loyers\n(plan BASIC+)"]
    end

    F_AV --> TOOL_AV
    F_ANALYSE --> TOOL_EM
    F_TRANS --> TOOL_DVF
    F_BAT --> TOOL_DPE
    F_LOY --> TOOL_LOYERS
    F_ANALYSE --> TOOL_RISK
    AV_JS --> TOOL_AV
    AV_CSS --> TOOL_AV
```

---

## 2. Stratégie d'Intégration

```mermaid
flowchart TD
    subgraph STRATEGY["Options d'intégration"]
        OPT_A["Option A — Monorepo\nUnifier les deux projets\n✅ Cohérence\n✅ Partage de code\n❌ Complexité build"]

        OPT_B["Option B — Submodule Git\nfidi-etude-marche comme\nsous-module du nouveau repo\n✅ Isolation\n✅ Mises à jour indépendantes\n❌ Gestion submodules"]

        OPT_C["Option C — Microservices\nfidi-etude-marche reste déployé\nsur son propre domaine Netlify\n→ API cross-origin avec CORS\n✅ Indépendance totale\n✅ Zéro refactoring\n❌ 2 domaines à gérer"]

        OPT_D["Option D — Copier les Functions\nCopier les .mjs dans le\nnouveau repo + adapter\n✅ Simple\n✅ Un seul déploiement\n❌ Duplication code"]
    end

    RECOMMENDED["✅ RECOMMANDÉ : Option C\n(Microservices)\nfidi-etude-marche → api.optimmo-dom.fr\nnouveausite → optimmo-dom.fr"]
```

### Pourquoi l'Option C est recommandée

1. Les Netlify Functions `fidi-etude-marche` fonctionnent déjà en production
2. Zéro risque de régression sur les outils existants
3. L'espace partenaires appelle les APIs via HTTPS (déjà CORS-enabled)
4. Mise à jour possible de chaque repo indépendamment
5. Coût Netlify: même tier gratuit sur les deux repos

---

## 3. Configuration CORS pour Appels Cross-Origin

```javascript
// À ajouter dans chaque function fidi-etude-marche
// netlify/functions/_cors.mjs

export const ALLOWED_ORIGINS = [
  "https://optimmo-dom.fr",
  "https://www.optimmo-dom.fr",
  "http://localhost:3000",  // dev
  "http://localhost:8888"   // netlify dev
]

export function corsHeaders(origin) {
  const allowed = ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0]
  return {
    "Access-Control-Allow-Origin": allowed,
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Max-Age": "86400"
  }
}
```

---

## 4. Proxy Gateway — Authentification des Appels Outils

```mermaid
sequenceDiagram
    participant U as Utilisateur (browser)
    participant FE as Front Optimmo Dom
    participant GW as /api/tools/proxy (Gateway)
    participant TOOL as fidi-etude-marche API

    U->>FE: Clique "Lancer une analyse"
    FE->>GW: POST /api/tools/proxy/analyse\nHeaders: Authorization: Bearer {jwt}\nBody: {adresse, type_bien, ...}

    GW->>GW: Vérifie JWT
    GW->>GW: Vérifie plan utilisateur
    GW->>GW: Log utilisation

    GW->>TOOL: POST https://api.optimmo-dom.fr/api/analyse\n(avec API key interne)
    TOOL->>GW: Résultats analyse JSON
    GW->>FE: Résultats filtrés selon plan
    FE->>U: Affichage rapport
```

### Pseudocode Gateway

```
// netlify/functions/tools-proxy.mjs
FUNCTION handler(event):
  // STEP 1 — Auth
  user = await checkAuth(event)
  IF !user → RETURN 401

  // STEP 2 — Router
  path_parts = event.path.split("/")
  tool_name = path_parts[path_parts.length - 1]
  // tool_name = "analyse" | "transactions" | "batiment" | etc.

  // STEP 3 — Vérification plan
  access = await checkToolAccess(user, toolNameToKey(tool_name))
  IF !access.authorized → RETURN 403 { upgrade_required: access.required_plan }

  // STEP 4 — Proxy vers API fidi
  FIDI_BASE = env.FIDI_API_URL  // https://fidi-etude-marche.netlify.app
  FIDI_API_KEY = env.FIDI_INTERNAL_KEY  // Header X-Internal-Key pour sécuriser

  targetUrl = FIDI_BASE + "/api/" + tool_name
  body = event.body
  method = event.httpMethod

  response = await fetch(targetUrl, {
    method: method,
    headers: {
      "Content-Type": "application/json",
      "X-Internal-Key": FIDI_API_KEY,
      "X-User-Plan": access.subscription.plan,
      "X-User-Id": user.id
    },
    body: method != "GET" ? body : undefined
  })

  data = await response.json()

  // STEP 5 — Filtrer selon plan
  filtered_data = filterDataByPlan(data, access.subscription.plan)

  // STEP 6 — Sauvegarder rapport si applicable
  IF tool_name IN ["analyse", "avis-de-valeur"]:
    await saveReport(user.id, tool_name, filtered_data)

  RETURN response.status, filtered_data

FUNCTION filterDataByPlan(data, plan):
  IF plan == "basic":
    // Masquer les comparables détaillés dans les avis de valeur
    // Limiter DVF aux 12 derniers mois
    RETURN omit(data, ["comparables_detail", "scoring_detail"])
  IF plan == "pro":
    // Accès complet sauf export brut
    RETURN omit(data, ["raw_dvf_transactions"])
  IF plan == "premium":
    RETURN data  // Accès total
```

---

## 5. Outil Étude de Marché (intégré)

```mermaid
flowchart LR
    subgraph EM_TOOL["Outil Étude de Marché — Interface Partenaire"]
        ADDR_INPUT["Saisie adresse\n(autocomplete BAN)"]
        PARAMS["Paramètres :\n- Type bien\n- Surface\n- Périmètre"]
        LAUNCH["[ Lancer l'analyse ]"]
        LOADING["Animation chargement\n(5-15 secondes)"]

        subgraph RESULTS["Résultats structurés"]
            SCORE["Score potentiel /100\n(gauge animée)"]
            PRICE_CHART["Évolution prix m²\n(Chart.js · 5 ans)"]
            DVF_TABLE["Transactions récentes\n(tableau filtrable)"]
            DPE_DIST["Distribution DPE\n(camembert)"]
            RISK_MAP["Carte risques\n(Leaflet)"]
            LOYERS_DATA["Loyers de marché\n(tableau par type)"]
            REVENUS_DATA["Revenus médians\n(zone géo)"]
        end

        EXPORT["[ Télécharger PDF ]\n(plan BASIC+)"]
        SAVE["[ Sauvegarder l'analyse ]"]
    end

    ADDR_INPUT --> PARAMS --> LAUNCH --> LOADING --> RESULTS
    RESULTS --> EXPORT
    RESULTS --> SAVE
```

---

## 6. Outil Avis de Valeur (intégré)

```mermaid
flowchart TD
    subgraph AV_WIZARD["Wizard Avis de Valeur — 4 étapes"]
        STEP1["Étape 1 : Localisation\n- Adresse (autocomplete)\n- Type de bien\n- Surface habitable\n- Surface terrain"]

        STEP2["Étape 2 : Caractéristiques\n- État général (1-5)\n- DPE actuel\n- Nombre de pièces\n- Équipements (piscine, garage...)\n- Année de construction"]

        STEP3["Étape 3 : Contexte\n→ Chargement auto des données :\n- Prix marché (VALORIS/DVF)\n- Transactions comparables\n- DPE zone\n- Risques\n- Services proximité\n- Loyers marché"]

        STEP4["Étape 4 : Avis de valeur\n→ Appel /api/avis-de-valeur\n→ Rendu rapport complet\n- Valeur vénale estimée\n- Fourchette basse/haute\n- Ajustements détaillés\n- Contrôle par capitalisation\n- Recommandations"]
    end

    STEP1 --> STEP2 --> STEP3 --> STEP4

    subgraph REPORT_ACTIONS["Actions sur le rapport"]
        PDF["Générer PDF professionnel\n(avec logo Optimmo Dom)"]
        SHARE["Lien de partage sécurisé\n(exp 30 jours)"]
        ARCHIVE["Archiver dans\nla bibliothèque"]
    end

    STEP4 --> REPORT_ACTIONS
```

---

## 7. Génération PDF — Architecture

```mermaid
graph LR
    subgraph PDF_FLOW["Génération PDF Rapport"]
        DATA["Données rapport JSON"]
        TEMPLATE["Template HTML/CSS\n(en-tête Optimmo Dom,\ncharte graphique)"]
        PUPPETEER["Puppeteer headless\n(Netlify Function)"]
        PDF_FILE["Fichier .pdf"]
        BLOB_STORE["Netlify Blobs\n(stockage temporaire 24h)"]
        DOWNLOAD_URL["URL de téléchargement\n(signée, exp 24h)"]
    end

    DATA --> TEMPLATE --> PUPPETEER --> PDF_FILE --> BLOB_STORE --> DOWNLOAD_URL
```

### Alternative légère : `@react-pdf/renderer` ou `jsPDF` côté client
(évite la function serveur lourde avec Puppeteer)

---

## 8. Tableau de Bord Analytics (Admin)

```
COMPONENT AdminAnalytics:
  DATA (agrégé, pas de données personnelles brutes):
    - nb_users_actifs_ce_mois: int
    - revenus_mensuels: { basic: €, pro: €, premium: €, oneshot: € }
    - outils_utilises: { analyse: n, avis_valeur: n, dvf: n }
    - conversions: { visite→inscription: %, inscription→paiement: % }
    - rapports_generes: int
    - churn_rate: %

  CHARTS:
    - Courbe revenus M-12
    - Répartition plans (donut)
    - Top outils utilisés (barres)
    - Carte géo utilisateurs (Martinique vs Guadeloupe)

TDD_ANCHORS:
  - analytics visibles uniquement rôle "admin" ✓
  - données agrégées (RGPD) ✓
  - calcul churn rate correct sur 30j ✓
```
