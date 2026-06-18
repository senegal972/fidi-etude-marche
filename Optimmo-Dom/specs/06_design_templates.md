# Phase 6 — Design System & Propositions de Templates
## Projet Optimmo Dom · Identité Visuelle Très Haute Gamme

---

## 1. Identité Visuelle Optimmo Dom

### Philosophie Design
> Élégance des Antilles · Expertise patrimoniale · Confiance absolue

Le design doit évoquer :
- La **lumière caraïbe** (sans être cliché touristique)
- La **rigueur professionnelle** d'un cabinet d'expertise parisien
- La **chaleur humaine** des relations locales martiniquaises/guadeloupéennes
- La **modernité discrète** d'un acteur haut de gamme

---

## 2. Système de Couleurs

```mermaid
graph LR
    subgraph PALETTE["Palette Chromatique"]
        C1["#1A2B3C\nNavy Profond\n(couleur principale)"]
        C2["#C9A84C\nOr Antillais\n(accents, CTAs)"]
        C3["#F5F0E8\nCrème Ivoire\n(fond principal)"]
        C4["#2D5A4E\nVert Mangrove\n(secondaire, succès)"]
        C5["#8B9BAB\nGris Ardoise\n(textes secondaires)"]
        C6["#FFFFFF\nBlanc Pur\n(cartes, sections)"]
    end
```

### Palette complète

| Nom | Hex | Usage |
|---|---|---|
| **Navy Profond** | `#1A2B3C` | Header, footer, textes titres |
| **Navy Moyen** | `#243447` | Hover states, dividers |
| **Or Antillais** | `#C9A84C` | CTA primaires, badges prestige, underlines |
| **Or Clair** | `#E8C96A` | Hover gold, highlights |
| **Crème Ivoire** | `#F5F0E8` | Background global |
| **Crème Foncée** | `#EDE7D9` | Section alternée |
| **Vert Mangrove** | `#2D5A4E` | Success, nature, foncier |
| **Vert Clair** | `#3D7A68` | Hover vert |
| **Gris Ardoise** | `#8B9BAB` | Body text secondaire |
| **Blanc Pur** | `#FFFFFF` | Cards, formulaires |
| **Alerte** | `#C0392B` | Erreurs, urgence |

### Application des couleurs

```
MODE CLAIR (défaut):
  body background: #F5F0E8
  cards: #FFFFFF
  titres: #1A2B3C
  texte: #333D47
  accent: #C9A84C
  hover: #E8C96A

MODE SOMBRE (option espace partenaires):
  body background: #0F1923
  cards: #1A2B3C
  titres: #F5F0E8
  texte: #8B9BAB
  accent: #C9A84C
```

---

## 3. Typographie

| Usage | Famille | Poids | Taille |
|---|---|---|---|
| Logo / Brand | **Cormorant Garamond** | 600 | Variable |
| Titres H1 | **Cormorant Garamond** | 600 | 56-72px |
| Titres H2 | **Cormorant Garamond** | 500 | 40-48px |
| Titres H3 | **Playfair Display** | 500 | 28-32px |
| Sous-titres | **Raleway** | 400 italic | 18-20px |
| Corps de texte | **Lato** | 400 | 16px |
| UI / Labels | **Lato** | 700 | 13-14px |
| Data / Chiffres | **Lato Mono** | 400 | Variable |

### Règles typographiques
- Line height corps: 1.7
- Letter-spacing titres: 0.02-0.05em
- Espacement entre sections: 120px desktop / 80px mobile
- Utiliser `text-transform: uppercase` + `letter-spacing: 0.15em` pour les labels de section

---

## 4. Propositions de Templates

### Option A — "Riviera Prestige" ⭐ RECOMMANDÉ

```mermaid
graph TB
    subgraph TEMPLATE_A["Template A — Riviera Prestige"]
        A_HERO["HERO : Plein écran · Fond vidéo (mer)\n+ overlay dégradé navy → transparent\n+ Texte blanc centré\n+ Ligne or sous le titre\n+ 2 boutons (solide or + transparent)"]

        A_TRUST["BANDE CONFIANCE : fond noir pur\nchiffres clés en or · séparateurs fins"]

        A_SERVICES["SERVICES : Fond crème\nGrid 3×2 · Cards avec border-left or\nIcone SVG fine + titre navy + texte gris"]

        A_CATALOG["CATALOGUE : Fond blanc\nCarousel large format · Photos plein cadre\nPrix en or · Badge territoire"]

        A_TEAM["TEAM : Fond navy\nPhotos N&B → couleur au hover\nNom en or · Rôle en blanc fin"]

        A_TESTIMONIALS["TÉMOIGNAGES : Fond crème foncé\nGrands guillemets or · Texte italic"]

        A_CTA["CTA FINAL : Fond dégradé navy→vert mangrove\nBouton or plein écran width"]
    end
```

**Inspiration** : Sotheby's International Realty · Christie's Real Estate
**Forces** : Luxe intemporel · Fonctionne très bien sur mobile · Photographie au centre
**Implémentation** : HTML + Tailwind CSS v4 + Alpine.js (cohérent avec l'existant)

---

### Option B — "Tropical Contemporary"

```mermaid
graph TB
    subgraph TEMPLATE_B["Template B — Tropical Contemporary"]
        B_HERO["HERO : Split screen\nGauche : texte sur blanc\nDroite : photo propriété cadrée\n(pas de fond plein)"]

        B_NAV["NAV : Sticky · fond blanc · shadow subtle\nLogo navy · liens gris → or au hover"]

        B_SERVICES["SERVICES : Icones illustrations tropicales\nFond blanc · Cards à border-radius 16px\nOmbre douce · hover lift effect"]

        B_CATALOG["CATALOGUE : Masonry grid\n(Pinterest style pour les photos)"]

        B_MAP["SECTION CARTE : Leaflet interactive\nPropriétés géolocalisées · Cluster markers"]

        B_ABOUT["À PROPOS : Photo couleur warm\nTexte manuscrit signature\nFond texture légère (lin ou papier)"]
    end
```

**Inspiration** : Propriétés privées · Belles Demeures · Côté Maisons
**Forces** : Très vivant · Bon pour le catalogue · Moderne sans être froid
**Implémentation** : Nuxt 3 + Tailwind + Swiper.js

---

### Option C — "Expert Patrimonial"

```mermaid
graph TB
    subgraph TEMPLATE_C["Template C — Expert Patrimonial"]
        C_NAV["NAV : Barre fine navy\nLogo + navigation texte pur\nSans icônes · Élégance minimaliste"]

        C_HERO["HERO : Fond navy plein\nTypo LARGE Cormorant\nAnimation lettre par lettre\nLigne or décorative horizontale"]

        C_SECTIONS["SECTIONS ALTERNÉES :\nBlanc / Crème / Blanc / Navy\nRythmé et structuré"]

        C_STATS["STATS IMPACT : Compteurs animés\nChiffres en or XXL · labels en gris"]

        C_SERVICES["SERVICES : Timeline verticale\nChaque service = étape numérotée\nIcone + titre + description + CTA"]

        C_TRUST["LOGOS PARTENAIRES : Sextant · Géorisques\nRNE · ADEME · Data Gouv"]
    end
```

**Inspiration** : Cabinets d'avocats · Notaires · Experts immobiliers parisiens
**Forces** : Crédibilité maximale · Idéal pour la partie B2B / partenaires
**Implémentation** : HTML + GSAP (animations) + CSS Grid

---

### Option D — "Caribbean Luxury" (la plus audacieuse)

```mermaid
graph TB
    subgraph TEMPLATE_D["Template D — Caribbean Luxury"]
        D_INTRO["INTRO ANIMÉE : 3 secondes\nLogo se révèle · Fondu sur le hero"]

        D_HERO["HERO : Image aérienne Martinique/Guadeloupe\nText overlay sophistiqué\nParticules dorées légères (Canvas)"]

        D_NAV["NAV HAMBURGER : Menu plein écran\nFond navy · Liens animés\n(style agence de luxe)"]

        D_SCROLL["PARALLAX : Sections qui se révèlent\nau scroll · Images en profondeur"]

        D_CATALOG["CATALOGUE : Cards 3D hover\nFlip card : face photo → détails\nEffect perspective CSS"]

        D_TOOLS["SECTION OUTILS : Fond sombre\nPrésentation cinématique\nBadge 'Exclusif partenaires'"]
    end
```

**Inspiration** : Dolce & Gabbana Real Estate · Christophe Charre Immobilier
**Forces** : Impact mémorable · Se démarque totalement de la concurrence
**Risques** : Temps de développement plus long · Animations = perf mobile à surveiller

---

## 5. Composants UI Réutilisables

```mermaid
graph LR
    subgraph COMPONENTS["Bibliothèque de Composants"]
        subgraph ATOMS["Atomes"]
            BTN_PRIMARY["PrimaryButton\n(or plein)"]
            BTN_SECONDARY["SecondaryButton\n(transparent · border or)"]
            BTN_GHOST["GhostButton\n(texte only · underline or)"]
            BADGE["Badge\n(territoire, type, statut)"]
            INPUT["InputField\n(label flottant · focus or)"]
            DIVIDER["GoldDivider\n(ligne or · 80px)"]
        end

        subgraph MOLECULES["Molécules"]
            PROPERTY_CARD["PropertyCard"]
            SERVICE_CARD["ServiceCard"]
            TEAM_CARD["TeamCard"]
            STAT_COUNTER["StatCounter\n(chiffre animé)"]
            TESTIMONIAL["TestimonialQuote"]
            PLAN_CARD["PricingCard"]
        end

        subgraph ORGANISMS["Organismes"]
            HERO_SECTION["HeroSection"]
            CATALOG_GRID["CatalogGrid + Filters"]
            CONTACT_FORM["ContactForm"]
            TOOL_WIDGET["ToolWidget\n(avec gate auth)"]
            DASHBOARD_LAYOUT["DashboardLayout"]
        end
    end
```

---

## 6. Animations & Micro-interactions

```
ANIMATION_SYSTEM:
  // Entrées au scroll (Intersection Observer)
  fade-in-up:
    initial: { opacity: 0, y: 30px }
    animate: { opacity: 1, y: 0 }
    duration: 600ms · easing: ease-out

  // Compteurs chiffres clés
  count-up:
    duration: 2000ms · easing: ease-out
    start: 0 · end: valeur cible
    trigger: IntersectionObserver threshold=0.5

  // Cards catalogue
  card-hover:
    transform: translateY(-8px)
    box-shadow: 0 20px 40px rgba(26,43,60,0.15)
    transition: 250ms ease

  // Gold underline sur les liens nav
  nav-link-underline:
    width: 0 → 100% au hover
    height: 2px
    background: #C9A84C
    transition: 300ms ease

  // Bouton CTA
  button-pulse:
    box-shadow: 0 0 0 0 rgba(201,168,76,0.4)
    animation: pulse 2s infinite (avant le premier clic)

RÈGLES:
  - prefers-reduced-motion → désactiver toutes les animations
  - Aucune animation > 600ms sauf intro/loader
  - Jamais de GIF ou animations continues intrusives
```

---

## 7. Responsive Breakpoints

```
BREAKPOINTS:
  xs:  < 480px   (petits mobiles)
  sm:  480-767px (mobiles)
  md:  768-1023px (tablettes)
  lg:  1024-1279px (laptop)
  xl:  1280-1535px (desktop)
  2xl: ≥ 1536px  (grands écrans)

ADAPTATIONS MOBILES CRITIQUES:
  - Nav hamburger dès md
  - Hero : texte réduit à 80%, CTA full-width
  - Catalogue : 1 colonne sur xs/sm
  - Dashboard : sidebar collapse → bottom navigation
  - Outils : steps verticaux plein écran
  - Wizard AV : un step à la fois, barre de progression
```

---

## 8. Template Sélectionné & Implémentation

### Recommandation finale

**Template A "Riviera Prestige"** avec des éléments de **Template D** pour le hero :

```mermaid
graph TB
    FINAL["🏆 Template Final : Riviera Prestige Enhanced"]

    subgraph HERO_FINAL["Hero (éléments D)"]
        VID["Vidéo fond 4K · Martinique vue mer"]
        OVER["Overlay navy semi-transparent"]
        ANIM["Titre Cormorant · animation reveal lettre"]
        LINE["Ligne or · 120px width"]
        CTA_H["2 CTAs bien contrastés"]
    end

    subgraph BODY_FINAL["Corps du site (éléments A)"]
        TRUST_B["Bande stats fond noir · or"]
        SERV_B["Services grille · cards propres"]
        CAT_B["Catalogue photos plein cadre"]
        TEAM_B["Équipe fond navy · hover couleur"]
    end

    subgraph PARTNER_FINAL["Espace Partenaires (éléments C)"]
        DARK_DASH["Dashboard fond sombre"]
        CHART_GOLD["Charts couleur or + navy"]
        TABLE_PROF["Tables professionnelles"]
    end

    FINAL --> HERO_FINAL
    FINAL --> BODY_FINAL
    FINAL --> PARTNER_FINAL
```

### Plan de fichiers CSS

```
optimmo-dom-website/
├── styles/
│   ├── tokens.css          # Variables CSS (couleurs, typo, espacements)
│   ├── base.css            # Reset + typographie globale
│   ├── components/
│   │   ├── buttons.css
│   │   ├── cards.css
│   │   ├── forms.css
│   │   ├── nav.css
│   │   └── badges.css
│   ├── sections/
│   │   ├── hero.css
│   │   ├── catalog.css
│   │   ├── team.css
│   │   └── pricing.css
│   ├── pages/
│   │   ├── home.css
│   │   ├── services.css
│   │   └── dashboard.css
│   └── utilities.css       # Classes utilitaires custom
```

---

## 9. Inspiration Sites de Référence

| Site | Ce qu'on retient |
|---|---|
| **sothebysrealty.com** | Fullscreen properties, typographie raffinée |
| **christiesrealestate.com** | Structure très propre, confiance immédiate |
| **proprietes-privees.com** | Catalogue FR, fonctionnalités recherche |
| **beauties.fr** | Qualité photographique, galeries |
| **century21.fr** | Ergonomie recherche, filtres mobiles |
| **sextant.immo** | Cohérence réseau, profils agents (à compléter) |
