# FIDI · Étude de Marché Immobilier — Guide Claude Code

> Orchestration Ruflo v3.38.20 (ex Claude Flow) · Projet senegal972/fidi-etude-marche

## Architecture du projet

```
fidi-etude-marche/
├── index.html                    # SPA principale (HTML + JS inline)
├── saisie.js / saisie.css        # Écran de saisie « Nouvelle étude » (2 colonnes, brouillon, modèles)
├── marque.js / marque.css        # Module « Mise en page » (marque blanche : enseigne, logo, couleurs)
├── marque.json                   # Charte par défaut du déploiement (un fichier par client)
├── avis-valeur.js / .css         # Module Avis de valeur
├── manifest.webmanifest          # PWA manifest
├── favicon.svg                   # Icône
├── netlify.toml                  # Config Netlify (redirections, timeouts)
├── package.json                  # Dépendances Node.js
├── netlify/functions/            # Netlify Functions (Node.js ESM)
│   ├── _cache.mjs                # Cache Netlify Blobs partagé
│   ├── analyse.mjs               # POST /api/analyse — analyse principale
│   ├── autocomplete.mjs          # GET  /api/autocomplete — BAN
│   ├── batiment.mjs              # GET  /api/batiment — DPE détaillé
│   ├── entreprise.mjs            # GET  /api/entreprise — RNE/INPI
│   ├── pappers.mjs               # GET  /api/pappers — santé financière
│   ├── permis.mjs                # GET  /api/permis — SITADEL
│   └── transactions.mjs          # GET  /api/transactions — DVF détail
├── .claude/
│   ├── settings.json             # Configuration Claude Code
│   └── commands/                 # Commandes slash personnalisées
└── .agents/
    ├── config.toml               # Configuration des agents
    └── *.md                      # Définitions des agents spécialisés
```

## Sources de données publiques françaises

| Source | URL | Usage |
|--------|-----|-------|
| **BAN** | api-adresse.data.gouv.fr | Géocodage adresses |
| **DVF Etalab** | app.dvf.etalab.gouv.fr | Transactions immobilières détaillées |
| **DVF Caisse Dépôts** | opendata.caissedesdepots.fr | Statistiques DVF par commune |
| **VALORIS** | valoris-immo.fr | Prix médians au m² |
| **ADEME DPE** | data.ademe.fr | Diagnostics de Performance Énergétique |
| **Géorisques** | georisques.gouv.fr | Risques naturels et technologiques |
| **GéoAPI INSEE** | geo.api.gouv.fr | Données territoriales (commune, IRIS) |
| **IGN Cadastre** | apicarto.ign.fr | Sections cadastrales |
| **RNE / INPI** | recherche-entreprises.api.gouv.fr | Données légales entreprises |
| **Pappers** | api.pappers.fr | Santé financière (clé API requise) |
| **SITADEL** | data.statistiques.developpement-durable.gouv.fr | Permis de construire |
| **OpenStreetMap** | overpass-api.de | Services de proximité (écoles, commerces, santé, transports) |
| **Carte des loyers** | tabular-api.data.gouv.fr | Loyers d'annonce au m² par commune (DHUP, millésime 2025) |
| **INSEE Filosofi** | tabular-api.data.gouv.fr | Niveau de vie médian & revenus par commune (millésime 2021) |

## Fonctions API — Entrées / Sorties

### `POST /api/analyse`
```json
{ "adresse": "string", "type_bien": "maison|appartement|tous", "surface": 120, "perimetre": "rayon_1km|commune|..." }
```
Retourne : `{ localisation, commune_info, valoris, dpe, dvf_annees, dvf_periodes, risques, score, estimation }`

### `GET /api/transactions`
Paramètres : `lat, lon, perimetre, type_bien`  
Retourne : liste des transactions DVF proches avec coordonnées GPS

### `GET /api/batiment`
Paramètres : `lat, lon, code_postal, ville`  
Retourne : caractéristiques bâti via ADEME DPE V2

### `GET /api/autocomplete`
Paramètre : `q` (texte adresse)  
Retourne : suggestions BAN

### `GET /api/permis`
Paramètres : `lat, lon, code_postal, ville`  
Retourne : permis SITADEL + DPE neufs + contact mairie

### `GET /api/entreprise`
Paramètre : `q` (SIREN/SIRET/raison sociale)  
Retourne : données RNE/INPI

### `GET /api/pappers`
Paramètre : `siren` (9 chiffres)  
Retourne : santé financière Pappers

### `GET /api/services`
Paramètres : `lat, lon, rayon` (100–2000 m, défaut 800)  
Retourne : aménités OSM proches par catégorie + score services /100

### `GET /api/loyers`
Paramètres : `code_insee` (5 car.), `prix_m2` (optionnel, pour le rendement)  
Retourne : loyer d'annonce €/m²/mois (appartement, T1-T2, T3+, maison) + rendement locatif brut si `prix_m2` fourni — source Carte des loyers DHUP 2025

### `GET /api/revenus`
Paramètre : `code_insee` (5 car.)  
Retourne : niveau de vie médian, revenu déclaré médian, part de ménages imposés — source INSEE Filosofi 2021

### `POST /api/avis-de-valeur`
```json
{ "adresse", "type_bien", "surface", "etat", "localisation", "prix_m2_reference",
  "comparables", "dpe", "risques", "services", "loyers", "revenus" }
```
Retourne : `{ valeur: { valeur_venale, fourchette_basse, fourchette_haute, ajustements, capitalisation }, markdown }` — avis de valeur vénale complet (comparaison directe + contrôle par capitalisation)

## Modules d'interface

L'interface est découpée en modules autonomes chargés par `index.html`. **Toute évolution de
l'écran de saisie ou de l'habillage passe par ces fichiers, pas par du code ajouté dans `index.html`.**

### Écran de saisie — `saisie.js` / `saisie.css`
- Deux colonnes : contenu de l'étude à gauche (bien, caractéristiques, vérifications),
  options et récapitulatif en direct à droite.
- Ne modifie pas `lancerAnalyse()`. **Les identifiants historiques sont un contrat à conserver** :
  `inputAdresse`, `selectType`, `inputSurface`, `selectPerimetre`, `btnAnalyse`, `optEntreprise`,
  `inputEntrepriseQ`, `optFinance`, `inputFinanceSiren`, `optPermis`, `btnGeoloc`, `autocompleteList`.
- Familles de biens, libellés de surface et modèles prédéfinis : constantes `FAMILLES` et `MODELES_BASE`.
- Sources affichées dans le récapitulatif : constante `SOURCES` — **à mettre à jour quand une source
  de données est ajoutée** (commande `/add-datasource`).
- Persistance `localStorage` : `fidi_em_brouillon`, `fidi_em_recentes`, `fidi_em_modeles`,
  `fidi_em_seq_<année>` (numérotation des références `EM-AAAA-NNN`).
- Le formulaire se replie en résumé quand `#results-panel` devient visible (MutationObserver).

### Mise en page / marque blanche — `marque.js` / `marque.css` / `marque.json`
- L'application est destinée à être commercialisée : **aucune enseigne, couleur ou coordonnée
  ne doit être écrite en dur** dans le HTML, le CSS ou le JS.
- Priorité des réglages : valeurs par défaut de `marque.js` < `marque.json` (charte du déploiement)
  < réglages de l'utilisateur (`localStorage`, clé `fidi_marque_perso`, panneau « Mise en page »).
- Couleurs : utiliser les variables CSS `--fidi-blue`, `--fidi-blue-light`, `--fidi-accent`,
  `--fidi-accent-hover`, `--fidi-on-accent`, `--fidi-gold`, `--fidi-on-gold`.
  En JavaScript (Chart.js, Leaflet) : `Marque.couleur('principale'|'accent'|'secondaire')`
  et `Marque.rgba('principale', 0.1)`.
- Enseigne et coordonnées : `Marque.get()` → `{ enseigne, produit, baseline, logo, couleurs, coordonnees }`.
- Impression / PDF : `marque.js` insère `#marquePrint` (en-tête) et `#marquePrintPied` (pied)
  dans `#results-panel` ; ils ne sont visibles qu'à l'impression.
- `marque.json` est versionné dans un dépôt public : **ne pas y inscrire de coordonnées personnelles**.
- Reste à faire : appliquer la charte au document généré par `avis-valeur.js` (couleurs encore en dur)
  et rattacher la charte au compte utilisateur côté serveur (aujourd'hui : par navigateur).

## Score de potentiel — Axes de notation

| Axe | Pondération | Critères |
|-----|-------------|----------|
| Dynamisme marché | 25 pts | Volume transactions, évolution prix |
| Prix au m² | 20 pts | Niveau et tendance (VALORIS/DVF) |
| Performance DPE | 20 pts | Distribution étiquettes énergie |
| Contexte territorial | 20 pts | Population, emploi, services |
| Risques | 15 pts | Inondation, séisme, argiles |

## Règles de développement

### Priorités
1. **Ne pas casser les fonctions existantes** — chaque fonction Netlify est indépendante
2. **Toujours tester avec une vraie adresse** avant de déployer (ex : "15 rue de la Paix, Paris")
3. **Respecter le format ESM** (`import/export`, pas de `require`)
4. **Gérer les erreurs silencieusement** — toutes les APIs tierces peuvent échouer

### Conventions de code
- Fonctions Netlify : `netlify/functions/*.mjs` (Node.js ESM)
- Helpers partagés : `netlify/functions/_cache.mjs`
- Timeout API : 8 000 ms par défaut, wrappé dans `fetchTimeout()`
- CORS : headers `Access-Control-Allow-Origin: *` sur toutes les réponses
- Pas de build step — le HTML est servi tel quel
- Interface : un module = un couple `nom.js` + `nom.css` à la racine, en JavaScript sans framework,
  encapsulé dans une IIFE ; pas de `alert()` pour les contrôles de saisie (message en ligne)
- Tests statiques de l'interface : `tests/interface.test.mjs` (contrat des identifiants, charte)

### Variables d'environnement (Netlify)
| Variable | Usage |
|----------|-------|
| `PAPPERS_API_KEY` | Clé Pappers pour `/api/pappers` |
| `SENTRY_DSN` | Monitoring Sentry (optionnel) |

## Orchestration multi-agents (ruflo)

Ce projet utilise ruflo pour coordonner des agents spécialisés :

- **dvf-analyst** — Analyse et optimisation des requêtes DVF
- **dpe-analyst** — Traitement des données DPE/ADEME
- **risk-analyst** — Interprétation des risques Géorisques
- **api-developer** — Développement des Netlify Functions
- **data-integrator** — Intégration de nouvelles sources de données
- **frontend-developer** — Améliorations de la SPA (HTML/JS/CSS)
- **qa-tester** — Tests et validation des endpoints

### Coordination des agents
```
Orchestrateur → dvf-analyst + dpe-analyst (parallèle)
             → risk-analyst (parallèle)
             → api-developer (séquentiel si modification code)
             → qa-tester (validation finale)
```

## Commandes slash disponibles

| Commande | Description |
|----------|-------------|
| `/analyse-adresse` | Teste une analyse complète sur une adresse |
| `/check-api` | Vérifie l'état et la cohérence des fonctions API |
| `/add-datasource` | Guide pour intégrer une nouvelle source de données |
| `/deploy-check` | Vérifie la configuration avant déploiement Netlify |
| `/debug-function` | Diagnostique une fonction Netlify défaillante |

### Plugins Ruflo additionnels

Skills et commandes issus des plugins Ruflo `security-audit`, `testgen` et
`observability` (via `@claude-flow/cli`) :

| Commande | Description |
|----------|-------------|
| `/audit` | Audit de sécurité du projet (scan CVE, STRIDE) — `security scan` |
| `/testgen` | Génère des tests pour un fichier/module (analyse de couverture, TDD) |
| `/observe` | Observabilité : traces d'exécution, métriques, corrélation télémétrie |

Skills associés : `security-scan`, `dependency-check` (sécurité) ·
`tdd-workflow`, `tdd-repair`, `test-gaps` (tests) ·
`observe-metrics`, `observe-trace` (observabilité).

## Déploiement

```bash
# Test local (nécessite Netlify CLI)
npx netlify dev

# Vérification de la configuration
npx netlify build --dry

# Variables d'environnement
npx netlify env:set PAPPERS_API_KEY "votre-clé"
```

Le déploiement se fait automatiquement via GitHub → Netlify sur la branche `main`.
