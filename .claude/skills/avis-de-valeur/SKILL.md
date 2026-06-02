---
name: "Avis de Valeur Immobilier"
description: "Génère un avis de valeur vénale complet et professionnel pour un bien immobilier français. Utilise les données FIDI (DVF, DPE, Géorisques, OSM, INSEE) pour produire un document structuré conforme aux normes IFEI/Charte de l'Expertise. Déclencher quand l'utilisateur demande : avis de valeur, estimation immobilière, rapport d'évaluation, valeur vénale, prix du bien, combien vaut ce bien."
---

# Avis de Valeur Immobilier — FIDI

> Conforme à la **Charte de l'Expertise en Évaluation Immobilière** (5e éd.) et aux normes **TEGOVA/EVS**

## Ce que fait ce skill

Produit un **avis de valeur vénale** structuré en 10 sections, s'appuyant sur les APIs FIDI pour collecter automatiquement :
- Transactions DVF récentes (comparables)
- Performance énergétique DPE
- Risques naturels et technologiques (Géorisques)
- Services de proximité (OpenStreetMap)
- Données territoriales INSEE
- Activité permis de construire (SITADEL)

Le document généré suit le format professionnel attendu par les agents immobiliers, notaires, et institutions financières françaises.

## Différence Avis de Valeur vs Expertise

| | **Avis de Valeur** | **Expertise Immobilière** |
|---|---|---|
| **Producteur** | Agent immo / logiciel | Expert certifié RICS/IFEI |
| **Engagement** | Opinion indicative | Valeur certifiée |
| **Usage** | Vente, achat, succession | Hypothèque, contentieux, bilan |
| **Délai** | Immédiat | 5–15 jours |
| **Portée juridique** | Limitée | Pleine |

---

## Démarrage rapide

### Cas le plus courant — par adresse

Demander à Claude :
```
Génère un avis de valeur pour le bien : [adresse complète]
Type : appartement / maison / tous
Surface : [m²]
```

Claude appellera automatiquement `/api/analyse`, `/api/transactions`, `/api/batiment`, `/api/services`, et `/api/permis`, puis rédigera le document complet.

### Résultat attendu

Un document Markdown (~1 500 mots) comprenant :
1. En-tête de mission
2. Identification du bien
3. Analyse de marché
4. Transactions comparables
5. Description & état du bien
6. Performance énergétique
7. Risques & contraintes
8. Valeur estimée (fourchette)
9. Facteurs d'influence
10. Conditions et réserves

---

## Guide étape par étape

### Étape 1 — Collecte des données via les APIs FIDI

Appeler en parallèle :

```
GET /api/analyse
  body: { adresse, type_bien, surface, perimetre: "rayon_1km" }
  → localisation, valoris, dpe, dvf_annees, risques, score, estimation

GET /api/transactions
  ?lat=&lon=&perimetre=rayon_1km&type_bien=
  → liste comparables DVF

GET /api/batiment
  ?lat=&lon=&code_postal=&ville=
  → DPE V2 détaillé, année construction, surface, étiquette énergie

GET /api/services
  ?lat=&lon=&rayon=800
  → score services /100, catégories OSM

GET /api/permis
  ?lat=&lon=&code_postal=&ville=
  → activité construction locale

GET /api/loyers
  ?code_insee=&prix_m2=
  → loyer d'annonce €/m²/mois (appart, T1-T2, T3+, maison)
    + rendement locatif brut implicite si prix_m2 fourni
    (source : Carte des loyers DHUP 2025)

GET /api/revenus
  ?code_insee=
  → niveau de vie médian, revenu déclaré médian, part ménages imposés
    (source : INSEE Filosofi 2021) — alimente la section marché

POST /api/avis-de-valeur
  body: { adresse, type_bien, surface, etat, localisation,
          prix_m2_reference, comparables, dpe, risques,
          services, loyers, revenus }
  → { valeur: { valeur_venale, fourchette_basse, fourchette_haute,
                ajustements, capitalisation }, markdown }
    Génère le document complet automatiquement (raccourci de bout en bout).
```

> **Deux modes d'usage** : soit Claude orchestre manuellement les appels et
> rédige le document via le template ; soit on délègue tout le calcul de
> valorisation et l'assemblage au endpoint `POST /api/avis-de-valeur`
> (utilisé par le bouton « Générer l'avis de valeur » de la SPA).

### Étape 2 — Construction du document

Utiliser le template : `resources/templates/avis-de-valeur-template.md`

Remplir chaque section avec les données collectées :

**Section Prix** : utiliser `valoris.prix_median_m2` × surface + ajustements DPE et état
**Section Comparables** : sélectionner 3–5 transactions DVF < 24 mois, même périmètre, type similaire
**Section DPE** : étiquette énergie + étiquette GES + consommation kWh/m²/an
**Section Risques** : résumé Géorisques (inondation, séisme, argiles, radon)
**Section Services** : score /100, points forts de proximité (transports, commerces, santé)

### Étape 3 — Calcul de la fourchette de valeur

#### Méthode par comparaison (privilégiée)
```
prix_comparables = médiane des prix/m² transactions DVF sélectionnées
valeur_base = prix_comparables × surface

# Ajustements qualitatifs (±%)
+5 à +15%   étage élevé, vue dégagée, parking, cave
+5 à +10%   rénovation récente < 5 ans
−5 à −20%   DPE F ou G (depuis 2025 : interdiction location)
−3 à −10%   rez-de-chaussée, vis-à-vis, nuisances
−5 à −15%   risques naturels avérés (zone rouge)

fourchette_basse = valeur_base × (1 − max_ajustement_négatif)
fourchette_haute = valeur_base × (1 + max_ajustement_positif)
valeur_centrale = (fourchette_basse + fourchette_haute) / 2
```

#### Méthode par capitalisation (biens locatifs)
```
# Loyer de marché : ne plus saisir manuellement — appeler /api/loyers
loyer_m2_mois = GET /api/loyers?code_insee=...  → appartement.loyer_m2 (ou maison)
loyer_mensuel = loyer_m2_mois × surface
revenu_locatif_annuel = loyer_mensuel × 12 × taux_occupation
taux_capitalisation = 4% à 7% selon secteur (yield brut marché)
valeur_rendement = revenu_locatif_annuel / taux_capitalisation

# Astuce : /api/loyers?code_insee=...&prix_m2=<prix DVF/VALORIS>
# renvoie directement le rendement_brut.taux_brut_pct, à comparer au taux de marché.
```

Utiliser la **valeur par comparaison** comme référence principale. La valeur par rendement comme contrôle (écart < 15% = cohérent). Le loyer provient désormais de la **Carte des loyers DHUP 2025** (`/api/loyers`), plus besoin d'estimation manuelle. Vérifier le champ `fiabilite` : `indicative` = peu d'annonces locales, à pondérer.

---

## Structure détaillée du document généré

### Section 1 — En-tête de mission
```
AVIS DE VALEUR VÉNALE
─────────────────────────────────────────
Mandant         : [Nom du client]
Objet           : [Adresse complète]
Date de l'avis  : [JJ/MM/AAAA]
Réalisé par     : FIDI · Conseil Immobilier
Objet de l'avis : Estimation de la valeur vénale à la date ci-dessus
```

### Section 2 — Identification du bien
- Adresse cadastrale complète
- Type de bien (appartement / maison / local)
- Surface habitable déclarée (m²) — loi Boutin pour location, Carrez pour copropriété
- Références cadastrales (section, n° parcelle) si disponibles via IGN
- Régime juridique (pleine propriété, usufruit, copropriété)

### Section 3 — Analyse du marché local
- Commune, IRIS, département
- Population INSEE, tendance démographique
- Prix médian au m² (VALORIS/DVF) — évolution sur 3 ans
- Volume de transactions dans le secteur
- Dynamisme : tension offre/demande

### Section 4 — Transactions comparables
Tableau de 3 à 6 transactions DVF sélectionnées :
| Adresse | Date | Type | Surface | Prix total | Prix/m² |
Critères de sélection : ≤ 24 mois, ≤ 1 km, même type, surface ±30%

### Section 5 — Description et état du bien
- Année de construction estimée
- Nombre de pièces, configuration
- État général (à préciser par le mandant : bon / moyen / à rénover)
- Équipements notables (parking, cave, terrasse, jardin)
- Copropriété : charges, tantièmes si connu

### Section 6 — Performance énergétique (DPE)
- Étiquette énergie : A à G + consommation kWh EP/(m².an)
- Étiquette GES : A à G + émissions kgCO2eq/(m².an)
- Impact valeur : DPE F/G → décote légale/marché (Loi Climat 2022)
- Travaux estimés si passoire énergétique

### Section 7 — Risques et contraintes
- Aléa inondation (zone PPRi) : oui/non/niveau
- Aléa sismique : zone 1–5
- Aléa retrait/gonflement argiles : faible/moyen/fort
- Radon : catégorie 1/2/3
- Autres : ICPE, plan d'exposition au bruit, servitudes

### Section 8 — Valeur estimée
```
Valeur vénale estimée au [date] :
  Fourchette basse  : XXX XXX €
  Fourchette haute  : XXX XXX €
  Valeur centrale   : XXX XXX €  ← référence de l'avis
  Prix au m² implicite : X XXX €/m²
```

### Section 9 — Facteurs d'influence sur la valeur
**Facteurs positifs (+)**
- …

**Facteurs négatifs (−)**
- …

**Potentiel de valorisation**
- Travaux de rénovation énergétique (si DPE ≤ D)
- Extension possible selon PLU

### Section 10 — Conditions et réserves
> Cet avis de valeur est établi sur la base des données de marché disponibles à la date indiquée et des informations communiquées par le mandant. Il ne constitue pas une expertise immobilière au sens de la Charte de l'Expertise en Évaluation Immobilière ni un engagement de prix. La valeur peut différer en fonction de conditions de négociation, d'informations non communiquées, ou d'évolutions du marché. Sources de données : DVF Etalab, ADEME DPE, Géorisques, VALORIS, OpenStreetMap (ODbL).

---

## Cas particuliers

### Bien sans données DVF locales
Si < 3 comparables dans le rayon 1 km : élargir à `perimetre=rayon_3km` ou `commune`, puis appliquer une décote distance (−2% à −5% par km supplémentaire).

### Bien commercial ou mixte
Privilegier la méthode par capitalisation. Taux de capitalisation de référence :
- Commerces de pied d'immeuble Paris : 3,5–5%
- Bureaux province : 5–8%
- Locaux d'activité : 7–10%

### Bien hors données VALORIS
Utiliser exclusivement le prix médian DVF des transactions récentes. Indiquer l'absence de données VALORIS dans les réserves.

### Passoire énergétique (DPE F ou G)
Appliquer une décote systématique :
- DPE F : −5 à −15% (interdiction location depuis 2025)
- DPE G : −15 à −25% (hors marché locatif)
Mentionner le coût estimatif des travaux de rénovation thermique.

---

## Référence complète

Voir [METHODOLOGIE.md](docs/METHODOLOGIE.md) pour :
- Détail des normes IFEI / TEGOVA / IVS 2022
- Calcul des ajustements qualitatifs
- Barèmes de décote DPE par région
- Jurisprudence sur la responsabilité de l'évaluateur

Voir [template complet](resources/templates/avis-de-valeur-template.md) pour le document Markdown prêt à remplir.

---

## Skills associés

- `sparc-methodology` — pour orchestrer l'ensemble du rapport en phases (Spec → Pseudocode → Architecture → Refinement → Completion)
- `performance-analysis` — pour analyser les tendances de prix sur plusieurs années
- `pair-programming` — pour coder un nouveau endpoint `/api/avis-de-valeur` si automatisation souhaitée
