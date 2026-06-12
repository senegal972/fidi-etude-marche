# Phase 1 — Vision & Architecture Globale
## Projet : Site Web Professionnel OPTIMMO DOM
**Version** : 1.0 · **Date** : 2026-06-10 · **Client** : Optimmo Dom / contact@fidiconseil.com

---

## 1. Identité & Positionnement

| Attribut | Valeur |
|---|---|
| **Nom** | Optimmo Dom |
| **Fondateur** | Franck Fidi |
| **Domaine** | fidiconseil.com |
| **Email** | contact@fidiconseil.com |
| **Slogan** | *L'excellence immobilière aux Antilles* |
| **Marchés** | Martinique · Guadeloupe |
| **Gamme** | Très haute gamme — consulting patrimonial |
| **Ton** | Élégant, confiant, expert, chaleureux |
| **Template** | Caribbean Luxury (choix validé) |

### Services Core
1. Conseil immobilier & transaction
2. Dénouement successoral
3. Valorisation de patrimoine
4. Développement foncier
5. Accompagnement projets de construction
6. Avis de valeur vénale
7. Étude de marché (Martinique / Guadeloupe)
8. Réseau Sextant (Franck Fidi, Philippe Marie-Luce, Lucien Fortuné)

### Équipe & URLs Sextant

| Agent | URL Sextant | Territoire |
|---|---|---|
| **Franck Fidi** | https://franck-fidi.sextantfrance.fr/fr/liste.htm#numnego=75011114 | Martinique & Guadeloupe |
| **Philippe Marie-Luce** | https://philippe-marie-luce.sextantfrance.fr/fr/liste.htm#numnego=75011175 | Guadeloupe |
| **Lucien Fortuné** | https://lucien-fortune.sextantfrance.fr/fr/liste.htm#numnego=75011408 | Martinique |

---

## 2. Architecture Macro du Site

```mermaid
graph TB
    subgraph PUBLIC["🌐 ESPACE PUBLIC (sans authentification)"]
        HP[Accueil — Hero Premium]
        SERV[Services & Expertises]
        PROJ[Réalisations & Projets]
        CAT[Catalogue Immobilier]
        SEXT[Équipe Sextant]
        CONTACT[Contact & Demandes]
        BLOG[Actualités / Insights marché]
    end

    subgraph PARTNER["🔐 ESPACE PARTENAIRES (authentification requise)"]
        DASH[Dashboard Partenaire]
        subgraph TOOLS["Outils Métier"]
            AV[Avis de Valeur]
            EM[Étude de Marché]
            DVF[Analyse DVF]
            DPE[Analyse DPE]
            RISK[Analyse Risques]
        end
        subgraph MGMT["Gestion"]
            DOCS[Bibliothèque Documents]
            MSGS[Messagerie Interne]
            PROJS[Suivi Projets]
        end
    end

    subgraph ADMIN["⚙️ BACK-OFFICE (admin uniquement)"]
        USERS[Gestion Utilisateurs]
        PERMS[Niveaux d'Accès]
        PAY[Abonnements & Paiements]
        CATALOG_ADMIN[Gestion Catalogue]
        ANALYTICS[Analytics & Stats]
    end

    subgraph PAY_GW["💳 PASSERELLE PAIEMENT"]
        PAYPAL[PayPal SDK]
        SUBS[Abonnements récurrents]
        ONESHOT[Accès à la demande]
    end

    HP --> SERV
    HP --> CAT
    HP --> CONTACT
    PARTNER --> PAY_GW
    ADMIN --> USERS
    ADMIN --> PAY
```

---

## 3. Arborescence des Pages

```mermaid
graph LR
    ROOT["/"]

    ROOT --> A["/ — Accueil"]
    ROOT --> B["/services"]
    ROOT --> C["/realisations"]
    ROOT --> D["/catalogue"]
    ROOT --> E["/equipe"]
    ROOT --> F["/contact"]
    ROOT --> G["/actualites"]

    ROOT --> H["/espace-partenaires"]
    H --> H1["/espace-partenaires/dashboard"]
    H --> H2["/espace-partenaires/outils"]
    H --> H3["/espace-partenaires/documents"]
    H --> H4["/espace-partenaires/projets"]
    H --> H5["/espace-partenaires/abonnement"]

    ROOT --> I["/admin"]
    I --> I1["/admin/utilisateurs"]
    I --> I2["/admin/catalogue"]
    I --> I3["/admin/paiements"]
    I --> I4["/admin/analytics"]

    B --> B1["/services/conseil-immobilier"]
    B --> B2["/services/succession"]
    B --> B3["/services/valorisation"]
    B --> B4["/services/foncier"]
    B --> B5["/services/construction"]
    B --> B6["/services/avis-de-valeur"]
    B --> B7["/services/etude-de-marche"]
```

---

## 4. Modèle de Données Principal

```mermaid
erDiagram
    USER {
        uuid id PK
        string email
        string nom
        string prenom
        enum role "admin|partenaire|collaborateur|public"
        enum plan "free|basic|pro|premium"
        date abonnement_fin
        bool actif
        timestamp created_at
    }

    PROPERTY {
        uuid id PK
        string titre
        string adresse
        string commune
        enum type "maison|appartement|terrain|commercial|immeuble"
        decimal surface
        decimal prix
        enum statut "disponible|vendu|loué|sous_compromis"
        string[] photos
        string description
        enum territoire "martinique|guadeloupe"
        timestamp created_at
    }

    PROJECT {
        uuid id PK
        string titre
        string description
        enum type "construction|foncier|succession|valorisation"
        enum statut "en_cours|terminé|showcase"
        string[] photos
        string[] documents
        bool public
        timestamp created_at
    }

    SUBSCRIPTION {
        uuid id PK
        uuid user_id FK
        string paypal_subscription_id
        enum plan "basic|pro|premium"
        decimal montant_mensuel
        enum statut "actif|suspendu|annulé"
        date prochaine_echeance
    }

    ACCESS_GRANT {
        uuid id PK
        uuid user_id FK
        string outil "avis_valeur|etude_marche|dvf|dpe|risques"
        timestamp expires_at
        string paypal_order_id
    }

    CONTACT_REQUEST {
        uuid id PK
        string nom
        string email
        string telephone
        string sujet
        string message
        enum statut "nouveau|traite|archive"
        timestamp created_at
    }

    USER ||--o{ SUBSCRIPTION : "possède"
    USER ||--o{ ACCESS_GRANT : "obtient"
    PROPERTY }|--|| USER : "géré par"
    PROJECT }|--|| USER : "conduit par"
```

---

## 5. Stack Technique Recommandée

```mermaid
graph LR
    subgraph FRONT["Frontend"]
        NUXT["Nuxt 3 / Vue 3\n(SSR + SPA hybrid)"]
        TAILWIND["Tailwind CSS v4\n+ shadcn/vue"]
        PINIA["Pinia\n(state management)"]
    end

    subgraph BACK["Backend (Netlify Functions — ESM)"]
        AUTH["auth.mjs\n(JWT / sessions)"]
        CATALOG["catalog.mjs\n(CRUD biens)"]
        PAYMENTS["payments.mjs\n(PayPal SDK)"]
        TOOLS["tools/*.mjs\n(outils existants réutilisés)"]
    end

    subgraph DB["Persistance"]
        BLOB["Netlify Blobs\n(fichiers, cache)"]
        SUPABASE["Supabase\n(PostgreSQL — users, biens, projets)"]
    end

    subgraph SERVICES["Services Tiers"]
        PAYPAL_SDK["PayPal REST API v2"]
        SENTRY["Sentry\n(monitoring)"]
        CLOUDINARY["Cloudinary\n(images optimisées)"]
        SEXTANT["Sextant API\n(catalogue partenaire)"]
    end

    FRONT --> BACK
    BACK --> DB
    BACK --> SERVICES
```

**Alternative légère (sans Nuxt)** : HTML + Vanilla JS + Alpine.js (pour cohérence avec l'existant `fidi-etude-marche`). Recommandé si budget/délai contraints.

---

## 6. Niveaux d'Accès Partenaires

```mermaid
graph TB
    subgraph PLANS["Plans d'Abonnement Mensuel"]
        FREE["🆓 PUBLIC\n(0 €/mois)\n- Catalogue lecture\n- Contact\n- Réalisations"]

        BASIC["🥉 BASIC\n(29 €/mois)\n- Étude de marché\n- Données DVF\n- Rapports PDF"]

        PRO["🥈 PRO\n(79 €/mois)\n- Tout Basic +\n- Avis de valeur\n- Analyse DPE\n- Analyse risques\n- Messagerie"]

        PREMIUM["🥇 PREMIUM\n(149 €/mois)\n- Tout Pro +\n- Accès Sextant\n- Suivi projets partagés\n- Docs confidentiels\n- Support prioritaire"]
    end

    subgraph ONESHOT["Accès à la Demande (sans abonnement)"]
        AV_OS["Avis de valeur\n19 €/rapport"]
        EM_OS["Étude de marché\n29 €/analyse"]
        DVF_OS["Rapport DVF\n9 €/commune"]
    end

    FREE --> BASIC --> PRO --> PREMIUM
```

---

## 7. Phases de Développement

```mermaid
gantt
    title Roadmap Développement Optimmo Dom
    dateFormat  YYYY-MM-DD
    section Phase 1 — Fondations
    Architecture & design system    :2026-06-15, 7d
    Charte graphique & UI Kit        :2026-06-18, 5d
    section Phase 2 — Site Public
    Page Accueil (hero + services)   :2026-06-22, 5d
    Catalogue immobilier             :2026-06-25, 4d
    Pages Services (7 pages)         :2026-06-27, 4d
    Équipe Sextant                   :2026-07-01, 3d
    Contact & Formulaires            :2026-07-01, 2d
    section Phase 3 — Auth & Paiement
    Système authentification         :2026-07-04, 4d
    Intégration PayPal               :2026-07-06, 4d
    Gestion abonnements              :2026-07-08, 3d
    section Phase 4 — Outils Partenaires
    Dashboard partenaire             :2026-07-11, 3d
    Intégration outils existants     :2026-07-13, 5d
    Back-office admin                :2026-07-16, 4d
    section Phase 5 — Finitions
    Tests & QA                       :2026-07-20, 4d
    Optimisation SEO & performances  :2026-07-22, 3d
    Déploiement production           :2026-07-25, 2d
```

---

## 8. Exigences Non-Fonctionnelles

| Critère | Exigence |
|---|---|
| **Performance** | LCP < 2.5s · CLS < 0.1 · FID < 100ms (Core Web Vitals) |
| **Mobile** | Responsive 320px → 4K · Touch-optimized |
| **Accessibilité** | WCAG 2.1 AA minimum |
| **SEO** | SSR · sitemap.xml · meta OG · Schema.org RealEstateListing |
| **Sécurité** | HTTPS · JWT HttpOnly · CORS strict · Rate limiting API |
| **Langues** | Français (principal) · Anglais (secondaire, phase 2) |
| **Navigateurs** | Chrome/Firefox/Safari/Edge — 2 dernières versions |
