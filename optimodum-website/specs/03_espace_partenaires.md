# Phase 3 — Espace Partenaires Sécurisé
## Projet Optimmo Dom · Module Accès Restreint & Outils Métier

---

## 1. Flow d'Authentification Complet

```mermaid
flowchart TD
    ENTRY["Visiteur clique\n'Espace Partenaires'"]
    CHECK_SESSION{"Session JWT\nvalide ?"}
    DASH["→ Dashboard partenaire"]
    LOGIN_PAGE["/login"]

    subgraph AUTH_FLOW["Processus Login"]
        EMAIL_INPUT["Saisie email + mot de passe"]
        VALIDATE_FORM{"Champs valides ?"}
        FORM_ERROR["Erreur inline"]
        POST_AUTH["POST /api/auth/login"]
        RATE_LIMIT{"< 5 tentatives\n/ 15 min ?"}
        LOCKED["Compte verrouillé 15 min\n+ email alerte"]
        DB_CHECK{"Email + hash\nmot de passe OK ?"}
        BAD_CREDS["Erreur : identifiants invalides"]
        CHECK_ACTIVE{"Compte actif ?"}
        INACTIVE["Compte suspendu\n(contact admin)"]
        CHECK_SUB{"Abonnement\nvalide ?"}
        NO_SUB["→ Page souscription"]
        ISSUE_JWT["Génération JWT\n(exp: 24h, HttpOnly cookie)"]
        REDIRECT_DASH["→ Dashboard"]
    end

    ENTRY --> CHECK_SESSION
    CHECK_SESSION -->|Oui| DASH
    CHECK_SESSION -->|Non| LOGIN_PAGE
    LOGIN_PAGE --> EMAIL_INPUT
    EMAIL_INPUT --> VALIDATE_FORM
    VALIDATE_FORM -->|NON| FORM_ERROR --> EMAIL_INPUT
    VALIDATE_FORM -->|OUI| POST_AUTH
    POST_AUTH --> RATE_LIMIT
    RATE_LIMIT -->|Dépassé| LOCKED
    RATE_LIMIT -->|OK| DB_CHECK
    DB_CHECK -->|NON| BAD_CREDS --> EMAIL_INPUT
    DB_CHECK -->|OUI| CHECK_ACTIVE
    CHECK_ACTIVE -->|NON| INACTIVE
    CHECK_ACTIVE -->|OUI| CHECK_SUB
    CHECK_SUB -->|NON| NO_SUB
    CHECK_SUB -->|OUI| ISSUE_JWT --> REDIRECT_DASH
```

---

## 2. Dashboard Partenaire — Structure

```mermaid
graph TB
    subgraph DASH["Dashboard /espace-partenaires/dashboard"]
        HEADER["En-tête : Bonjour {prénom} · Plan {plan} · Expire le {date}"]

        subgraph KPIs["Métriques rapides"]
            K1["Outils disponibles"]
            K2["Rapports générés ce mois"]
            K3["Documents partagés"]
            K4["Messages non lus"]
        end

        subgraph QUICK_ACCESS["Accès rapide aux outils"]
            QA1["🏠 Avis de valeur\n(si plan ≥ PRO)"]
            QA2["📊 Étude de marché\n(si plan ≥ BASIC)"]
            QA3["📍 Analyse DVF\n(si plan ≥ BASIC)"]
            QA4["🌿 Analyse DPE\n(si plan ≥ PRO)"]
            QA5["⚠️ Risques\n(si plan ≥ PRO)"]
            QA6["🔒 Verrouillé\n(surbrillance → upgrade)"]
        end

        subgraph RECENT["Activité récente"]
            R1["Derniers rapports générés"]
            R2["Documents récents"]
            R3["Notifications"]
        end

        subgraph SIDEBAR["Sidebar navigation"]
            NAV1["Dashboard"]
            NAV2["Outils"]
            NAV3["Documents"]
            NAV4["Projets partagés"]
            NAV5["Messagerie"]
            NAV6["Mon abonnement"]
            NAV7["Paramètres"]
        end
    end
```

---

## 3. Matrice des Droits par Plan

```mermaid
graph LR
    subgraph MATRIX["Matrice Accès Outils"]
        subgraph TOOLS["Outils / Fonctionnalités"]
            T1["Catalogue lecture seule"]
            T2["Téléchargement PDF rapports"]
            T3["Outil Étude de marché"]
            T4["Export données DVF brutes"]
            T5["Outil Avis de valeur"]
            T6["Analyse DPE détaillée"]
            T7["Analyse risques complète"]
            T8["Bibliothèque documents"]
            T9["Messagerie admin"]
            T10["Suivi projets partagés"]
            T11["Interfaces Sextant agents"]
            T12["Support prioritaire"]
        end

        subgraph PLANS["Plans"]
            PL1["PUBLIC 0€"]
            PL2["BASIC 29€"]
            PL3["PRO 79€"]
            PL4["PREMIUM 149€"]
        end
    end

    T1 --> PL1
    T1 --> PL2
    T1 --> PL3
    T1 --> PL4

    T2 --> PL2
    T2 --> PL3
    T2 --> PL4

    T3 --> PL2
    T3 --> PL3
    T3 --> PL4

    T4 --> PL2
    T4 --> PL3
    T4 --> PL4

    T5 --> PL3
    T5 --> PL4

    T6 --> PL3
    T6 --> PL4

    T7 --> PL3
    T7 --> PL4

    T8 --> PL3
    T8 --> PL4

    T9 --> PL3
    T9 --> PL4

    T10 --> PL4
    T11 --> PL4
    T12 --> PL4
```

### Tableau récapitulatif

| Fonctionnalité | PUBLIC | BASIC | PRO | PREMIUM |
|---|:---:|:---:|:---:|:---:|
| Catalogue (lecture) | ✅ | ✅ | ✅ | ✅ |
| Rapports PDF | ❌ | ✅ | ✅ | ✅ |
| Étude de marché | ❌ | ✅ | ✅ | ✅ |
| Données DVF export | ❌ | ✅ | ✅ | ✅ |
| Avis de valeur | ❌ | ❌ | ✅ | ✅ |
| Analyse DPE | ❌ | ❌ | ✅ | ✅ |
| Analyse risques | ❌ | ❌ | ✅ | ✅ |
| Bibliothèque docs | ❌ | ❌ | ✅ | ✅ |
| Messagerie admin | ❌ | ❌ | ✅ | ✅ |
| Suivi projets | ❌ | ❌ | ❌ | ✅ |
| Accès Sextant | ❌ | ❌ | ❌ | ✅ |
| Support prioritaire | ❌ | ❌ | ❌ | ✅ |

---

## 4. Intégration des Outils Existants

```mermaid
flowchart TD
    subgraph EXISTING["Outils existants (fidi-etude-marche)"]
        AV_TOOL["Avis de valeur\n(avis-valeur.js + netlify/functions/)"]
        EM_TOOL["Étude de marché\n(index.html + /api/analyse)"]
        DVF["API DVF\n(/api/transactions)"]
        DPE["API DPE\n(/api/batiment)"]
        RISK["API Risques\n(dans /api/analyse)"]
        LOYERS["API Loyers\n(/api/loyers)"]
        REVENUS["API Revenus\n(/api/revenus)"]
    end

    subgraph INTEGRATION["Intégration dans Espace Partenaires"]
        IFRAME_AV["Option A : iframe sandboxé\n(paramètres pré-remplis)"]
        EMBED_AV["Option B : composant embarqué\n(API calls directes depuis front)"]
        PROXY["Option C : proxy Netlify Function\n(/api/partner/[outil])"]
    end

    subgraph AUTH_GATE["Middleware d'accès"]
        JWT_CHECK["Vérification JWT"]
        PLAN_CHECK["Vérification plan (BASIC/PRO/PREMIUM)"]
        QUOTA_CHECK["Quota mensuel (si applicable)"]
        LOG_USAGE["Log utilisation (facturation à la demande)"]
    end

    EXISTING --> AUTH_GATE
    AUTH_GATE -->|Accès autorisé| INTEGRATION
    AUTH_GATE -->|Refus| UPGRADE_PROMPT["Modale 'Upgrader votre plan'"]
```

### Pseudocode Middleware d'accès aux outils

```
FUNCTION checkToolAccess(req, tool):
  INPUT:
    req.cookies.jwt_token: string
    tool: "avis_valeur|etude_marche|dvf|dpe|risques"

  REQUIRED_PLAN = {
    "etude_marche": "basic",
    "dvf": "basic",
    "avis_valeur": "pro",
    "dpe": "pro",
    "risques": "pro"
  }

  STEP 1 — Vérifier JWT:
    token = verifyJWT(req.cookies.jwt_token)
    IF !token → RETURN 401 { error: "Non authentifié" }

  STEP 2 — Charger l'utilisateur:
    user = await db.users.findById(token.userId)
    IF !user.actif → RETURN 403 { error: "Compte suspendu" }

  STEP 3 — Vérifier l'abonnement:
    subscription = await db.subscriptions.findActiveByUser(user.id)
    IF !subscription:
      oneshot = await db.access_grants.findValid(user.id, tool)
      IF !oneshot → RETURN 402 { error: "Accès requis", redirect: "/abonnement" }

  STEP 4 — Vérifier le niveau de plan:
    plan_level = { "basic": 1, "pro": 2, "premium": 3 }
    required_level = plan_level[REQUIRED_PLAN[tool]]
    user_level = plan_level[subscription.plan]
    IF user_level < required_level:
      RETURN 403 {
        error: "Plan insuffisant",
        required_plan: REQUIRED_PLAN[tool],
        current_plan: subscription.plan
      }

  STEP 5 — Logger l'utilisation:
    await db.usage_logs.create({
      user_id: user.id,
      tool: tool,
      timestamp: now()
    })

  RETURN { authorized: true, user, subscription }

TDD_ANCHORS:
  - user sans JWT → 401 ✓
  - user actif plan BASIC → accès DVF OK ✓
  - user actif plan BASIC → accès avis_valeur → 403 ✓
  - user plan PRO → accès avis_valeur OK ✓
  - token expiré → 401 ✓
  - user avec one-shot avis_valeur non expiré → accès OK ✓
```

---

## 5. Bibliothèque de Documents

```mermaid
graph TB
    subgraph LIBRARY["Bibliothèque Documents"]
        CATS["Catégories"]
        CAT1["📋 Templates\n(baux, mandats, compromis)"]
        CAT2["📊 Rapports marché\n(études Martinique/Guadeloupe)"]
        CAT3["📜 Guides juridiques\n(succession, urbanisme)"]
        CAT4["🏗️ Projets partagés\n(documents confidentiels)"]

        ACTIONS["Actions disponibles"]
        ACT1["Télécharger PDF/DOCX"]
        ACT2["Aperçu en ligne"]
        ACT3["Partager (lien temporaire 7 jours)"]
        ACT4["Signaler une mise à jour"]
    end

    subgraph PERMISSIONS_DOC["Permissions Documents"]
        DP1["PRO : Templates + Rapports + Guides"]
        DP2["PREMIUM : Tout + Projets partagés"]
    end

    CATS --> CAT1 & CAT2 & CAT3 & CAT4
    ACTIONS --> ACT1 & ACT2 & ACT3 & ACT4
    LIBRARY --> PERMISSIONS_DOC
```

---

## 6. Espace Sextant (PREMIUM uniquement)

```mermaid
graph LR
    subgraph SEXTANT_SPACE["Espace Sextant — Plan PREMIUM"]
        OVERVIEW["Vue d'ensemble réseau"]

        subgraph AGENTS["Profils agents avec leurs outils"]
            AG1["Philippe\n→ Son catalogue Sextant\n→ Ses statistiques\n→ Contact direct"]
            AG2["Marie-Luce\n→ Son catalogue Sextant\n→ Ses statistiques\n→ Contact direct"]
            AG3["Lucien Fortuné\n→ Son catalogue Sextant\n→ Ses statistiques\n→ Contact direct"]
        end

        subgraph COLLAB["Collaboration"]
            REF["Système de référencement\n(envoyer un lead à un agent)"]
            COOPT["Cooptation projets\n(proposer un co-mandat)"]
        end
    end

    SEXTANT_SPACE --> AGENTS
    SEXTANT_SPACE --> COLLAB
```

---

## 7. Pseudocode Dashboard Principal

```
COMPONENT PartnerDashboard:
  STATE:
    user: User
    subscription: Subscription | null
    recentReports: Report[]
    notifications: Notification[]
    unreadMessages: int

  LIFECYCLE:
    onMounted:
      await Promise.all([
        fetchUserProfile(),
        fetchSubscription(),
        fetchRecentReports(limit=5),
        fetchNotifications(limit=10),
        fetchUnreadCount()
      ])

  RENDER:
    <main class="dashboard">
      <DashboardHeader
        [user=user]
        [plan=subscription?.plan ?? "none"]
        [expiresAt=subscription?.prochaine_echeance]
      />

      <KPIRow>
        <KPICard icon="🔧" label="Outils disponibles" value={countTools(subscription)} />
        <KPICard icon="📄" label="Rapports ce mois" value={recentReports.length} />
        <KPICard icon="✉️" label="Messages" value={unreadMessages} alert={unreadMessages > 0} />
      </KPIRow>

      <ToolGrid [plan=subscription?.plan] [onLockedClick=showUpgradeModal] />

      <RecentActivity [reports=recentReports] [notifications=notifications] />

      IF !subscription OR subscription.statut == "expiré":
        <UpgradeBanner />
    </main>

FUNCTION countTools(subscription):
  IF !subscription → RETURN 0
  SWITCH subscription.plan:
    "basic"   → RETURN 4
    "pro"     → RETURN 9
    "premium" → RETURN 12
```
