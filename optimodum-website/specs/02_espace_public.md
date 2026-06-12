# Phase 2 — Espace Public : Pages & Composants
## Projet Optimmo Dom · Module Frontend Public

---

## 1. Page d'Accueil — Hero Premium

### Wireframe logique

```mermaid
graph TB
    subgraph NAV["Navigation Sticky"]
        LOGO[Logo Optimmo Dom] --- MENU["Services | Réalisations | Catalogue | Équipe | Contact"]
        MENU --- CTA_NAV["[ Espace Partenaires ]"]
    end

    subgraph HERO["Section Hero — 100vh"]
        BG["Vidéo/image fond\n(vue mer Martinique ou Guadeloupe)"]
        HEADLINE["OPTIMMO DOM\nL'excellence immobilière aux Antilles"]
        SUBLINE["Conseil · Valorisation · Développement foncier\nMartinique & Guadeloupe"]
        CTA1["→ Découvrir nos services"]
        CTA2["→ Consulter le catalogue"]
    end

    subgraph TRUST["Bande de confiance"]
        STAT1["20+ ans\nd'expérience"]
        STAT2["200+\nbiens valorisés"]
        STAT3["Martinique\n& Guadeloupe"]
        STAT4["Partenaire\nSextant"]
    end

    subgraph SERVICES_PREVIEW["Services en vitrine (6 cards)"]
        S1["Conseil immobilier"]
        S2["Succession"]
        S3["Valorisation"]
        S4["Foncier"]
        S5["Construction"]
        S6["Avis de valeur"]
    end

    subgraph FEATURED_PROPS["Propriétés vedettes (carousel)"]
        P1[Bien 1]
        P2[Bien 2]
        P3[Bien 3]
    end

    subgraph ABOUT["À propos — section narrative"]
        PHOTO[Photo professionnelle]
        TEXT["Texte expertise + philosophie"]
    end

    subgraph TEAM_PREVIEW["L'équipe Sextant"]
        T1["Philippe"]
        T2["Marie-Luce"]
        T3["Lucien Fortuné"]
    end

    subgraph TESTIMONIALS["Témoignages clients"]
        Q1[Témoignage 1]
        Q2[Témoignage 2]
        Q3[Témoignage 3]
    end

    subgraph CTA_FINAL["CTA Final"]
        CTA_F1["Demander un avis de valeur"]
        CTA_F2["Accéder à l'espace partenaires"]
    end

    subgraph FOOTER["Pied de page"]
        LINKS[Liens légaux]
        SOCIAL[Réseaux sociaux]
        CONTACT_F[Contact rapide]
    end

    NAV --> HERO --> TRUST --> SERVICES_PREVIEW --> FEATURED_PROPS --> ABOUT --> TEAM_PREVIEW --> TESTIMONIALS --> CTA_FINAL --> FOOTER
```

### Pseudocode Composant Hero

```
COMPONENT HeroSection:
  STATE:
    - currentSlide: int = 0
    - slides: Array<{image, headline, cta}>

  COMPUTED:
    - backgroundStyle: CSS gradient overlay sur image/vidéo

  LIFECYCLE:
    onMounted → startSlideshow(interval=5000ms)

  RENDER:
    <section class="hero full-height relative">
      <MediaBackground [src=slides[currentSlide].image] />
      <div class="hero-content centered">
        <AnimatedLogo />
        <h1 class="display-xl gold-accent">{{ headline }}</h1>
        <p class="subtitle">{{ subline }}</p>
        <div class="cta-group">
          <PrimaryButton href="/services">Découvrir nos services</PrimaryButton>
          <SecondaryButton href="/catalogue">Voir le catalogue</SecondaryButton>
        </div>
      </div>
      <SlideIndicators [count=slides.length] [current=currentSlide] />
    </section>

  TDD_ANCHORS:
    - hero renders with background media ✓
    - CTA buttons navigate correctly ✓
    - Slideshow advances every 5s ✓
    - Pauses on hover ✓
    - Keyboard accessible ✓
```

---

## 2. Catalogue Immobilier

### Flow utilisateur

```mermaid
flowchart TD
    ENTRY["Visiteur entre sur /catalogue"]
    LOAD["Chargement initial\n(20 biens · tri: récents)"]
    FILTER{"Filtres appliqués ?"}
    SEARCH["Recherche textuelle\n(commune, type, budget)"]
    GRID["Grille responsive\n(3 col desktop · 2 tablet · 1 mobile)"]
    CARD["Card bien :\n- Photo principale\n- Type · Surface · Prix\n- Commune · Territoire\n- Statut (dispo/vendu/loué)"]
    DETAIL["Page détail /catalogue/[id]"]
    GALLERY["Galerie photos lightbox"]
    MAP["Carte Leaflet\n(position approximative)"]
    CONTACT_FORM["Formulaire intérêt\n→ email notif admin"]
    SEXT["Lien Sextant\n(si bien Sextant)"]

    ENTRY --> LOAD --> FILTER
    FILTER -->|Non| GRID
    FILTER -->|Oui| SEARCH --> GRID
    GRID --> CARD --> DETAIL
    DETAIL --> GALLERY
    DETAIL --> MAP
    DETAIL --> CONTACT_FORM
    DETAIL --> SEXT
```

### Interface Sextant

```mermaid
graph LR
    subgraph SEXT_SECTION["Section Sextant dans le Catalogue"]
        LABEL["🏷️ Badge Sextant"]
        AGENT["Agent référent :\n- Photo\n- Nom\n- Téléphone\n- Lien profil Sextant"]
        IFRAME_TOGGLE["Option : iframe du catalogue\nSextant de l'agent"]
    end

    subgraph AGENTS["Agents Sextant Optimmo Dom"]
        A1["Philippe\n[lien profil sextant]"]
        A2["Marie-Luce\n[lien profil sextant]"]
        A3["Lucien Fortuné\n[lien profil sextant]"]
    end

    SEXT_SECTION --> AGENTS
```

### Pseudocode Catalogue

```
FUNCTION loadCatalogue(filters):
  INPUT: {
    type?: "maison|appartement|terrain|commercial|immeuble",
    territoire?: "martinique|guadeloupe",
    prix_min?: number,
    prix_max?: number,
    surface_min?: number,
    statut?: "disponible|tous",
    page: int = 1,
    per_page: int = 20
  }

  → CALL GET /api/catalog?{...filters}
  → RETURN { items: Property[], total: int, pages: int }

FUNCTION PropertyCard(property):
  RENDER:
    <article class="property-card" data-territoire={property.territoire}>
      <ImageSlider [images=property.photos] [lazy=true] />
      <div class="card-body">
        <span class="badge">{property.type}</span>
        <h3>{property.titre}</h3>
        <div class="meta">
          <span>{property.surface} m²</span>
          <span>{formatPrice(property.prix)}</span>
        </div>
        <p class="location">{property.commune} · {property.territoire}</p>
        <StatusBadge [statut=property.statut] />
        IF property.sextant_agent:
          <SextantBadge [agent=property.sextant_agent] />
      </div>
      <a href="/catalogue/{property.id}" class="card-link">Voir le détail →</a>
    </article>

TDD_ANCHORS:
  - filtres par type retournent uniquement le type demandé ✓
  - pagination fonctionne (page 2 = items 21-40) ✓
  - bien "vendu" affiche badge rouge ✓
  - images lazy-loaded ✓
  - lien Sextant s'ouvre dans nouvel onglet ✓
```

---

## 3. Pages Services (7 pages)

### Structure commune

```mermaid
graph TB
    subgraph PAGE_SERVICE["Template Page Service"]
        HERO_S["Hero section\n(image thématique + titre service)"]
        INTRO["Paragraphe introductif\n(expertise Optimmo Dom)"]
        PROCESS["Notre processus\n(étapes numérotées)"]
        CASES["Cas concrets\n(anonymisés Martinique/Guadeloupe)"]
        FAQ["FAQ spécifique au service"]
        CTA_SERVICE["CTA : Demander ce service"]
        RELATED["Services connexes"]
    end
```

### Matrice Services × Contenu

| Service | Process (étapes) | Outils liés | CTA principal |
|---|---|---|---|
| Conseil immobilier | 4 étapes | Catalogue, Étude marché | Prendre RDV |
| Dénouement successoral | 5 étapes | Avis de valeur, DVF | Consultation gratuite |
| Valorisation patrimoine | 4 étapes | Avis de valeur, DPE | Demande d'évaluation |
| Développement foncier | 6 étapes | Permis, Étude marché | Étude faisabilité |
| Projets de construction | 5 étapes | Permis, Entreprises | Contact projet |
| Avis de valeur | 3 étapes | Outil AV (partenaire) | Commander en ligne |
| Étude de marché | 4 étapes | Outil EM (partenaire) | Demander étude |

---

## 4. Section Équipe & Réseau Sextant

### Pseudocode Composant Équipe

```
COMPONENT TeamSection:
  DATA:
    members: [
      {
        nom: "Optimmo Dom / [Prénom Nom gérant]",
        role: "Fondateur & Expert Immobilier",
        specialites: ["Avis de valeur", "Étude de marché", "Succession"],
        territoire: ["Martinique", "Guadeloupe"],
        sextant_url: null,
        photo: "/images/team/gerant.jpg"
      },
      {
        nom: "Philippe",
        role: "Conseiller Sextant",
        specialites: [...],
        sextant_url: "https://www.sextant.immo/agent/philippe",
        photo: "/images/team/philippe.jpg"
      },
      {
        nom: "Marie-Luce",
        role: "Conseillère Sextant",
        sextant_url: "https://www.sextant.immo/agent/marie-luce",
        photo: "/images/team/marie-luce.jpg"
      },
      {
        nom: "Lucien Fortuné",
        role: "Conseiller Sextant",
        sextant_url: "https://www.sextant.immo/agent/lucien-fortune",
        photo: "/images/team/lucien-fortune.jpg"
      }
    ]

  RENDER:
    <section class="team">
      FOR EACH member IN members:
        <TeamCard
          [photo=member.photo]
          [nom=member.nom]
          [role=member.role]
          [tags=member.specialites]
          [sextant_link=member.sextant_url]
        />
```

---

## 5. Formulaire de Contact & Demandes

```mermaid
flowchart LR
    FORM["Formulaire Contact"] --> VALIDATE{"Validation\ncôté client"}
    VALIDATE -->|Erreur| ERROR["Messages d'erreur inline"]
    VALIDATE -->|OK| SUBMIT["POST /api/contact"]
    SUBMIT --> CAPTCHA{"reCAPTCHA v3\n> 0.5 ?"}
    CAPTCHA -->|Fail| REJECT["Erreur 403"]
    CAPTCHA -->|Pass| SAVE["Sauvegarde DB\n+ Notif email admin"]
    SAVE --> ACK["Message confirmation\n+ email accusé réception"]

    subgraph FIELDS["Champs du formulaire"]
        F1["Nom complet *"]
        F2["Email *"]
        F3["Téléphone"]
        F4["Type de demande\n(dropdown)"]
        F5["Territoire\n(Martinique / Guadeloupe / Les deux)"]
        F6["Message *"]
        F7["Comment nous avez-vous connus ?"]
    end
```

### Types de demandes (dropdown)
- Estimation / Avis de valeur
- Vente de bien
- Achat de bien
- Succession / Héritage
- Développement foncier
- Projet de construction
- Devenir partenaire
- Autre

---

## 6. SEO & Métadonnées

```
FUNCTION generateSEOMeta(page):
  SWITCH page.type:
    CASE "home":
      title: "Optimmo Dom — Conseil Immobilier Martinique & Guadeloupe"
      description: "Expert en immobilier aux Antilles : conseil, valorisation, dénouement successoral, avis de valeur. Martinique et Guadeloupe."
      og:image: "/images/og/optimmo-dom-home.jpg"

    CASE "service":
      title: "{service.nom} | Optimmo Dom Martinique Guadeloupe"
      description: "{service.meta_desc}"

    CASE "property":
      title: "{property.titre} — {property.commune} | Optimmo Dom"
      schema: RealEstateListing {
        "@type": "RealEstateListing",
        "name": property.titre,
        "address": { "@type": "PostalAddress", ... },
        "floorSize": { "@type": "QuantitativeValue", "value": property.surface },
        "price": property.prix
      }

  RETURN { title, description, og, schema }
```
