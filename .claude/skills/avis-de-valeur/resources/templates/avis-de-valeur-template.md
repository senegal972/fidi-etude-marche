# AVIS DE VALEUR VÉNALE

---

**Réf. dossier** : {{REF_DOSSIER}}  
**Date de l'avis** : {{DATE_AVIS}}  
**Valable jusqu'au** : {{DATE_VALIDITE}} *(3 mois)*

---

## 1. MISSION ET MANDANT

| | |
|---|---|
| **Mandant** | {{NOM_MANDANT}} |
| **Qualité** | Propriétaire / Acquéreur potentiel / Autre |
| **Objet de la mission** | Estimation de la valeur vénale à la date ci-dessus |
| **Usage de l'avis** | Cession / Acquisition / Succession / Information |

---

## 2. IDENTIFICATION DU BIEN

| | |
|---|---|
| **Adresse** | {{ADRESSE_COMPLETE}} |
| **Code postal** | {{CODE_POSTAL}} |
| **Commune** | {{VILLE}} |
| **Département** | {{DEPARTEMENT}} |
| **Type de bien** | {{TYPE_BIEN}} *(Appartement / Maison / Local commercial / Autre)* |
| **Références cadastrales** | Section {{SECTION}} n° {{NUM_PARCELLE}} *(si disponible)* |
| **Régime juridique** | {{REGIME}} *(Pleine propriété / Copropriété / Usufruit)* |
| **Surface habitable** | {{SURFACE_HABITABLE}} m² *(loi Boutin / Carrez)* |
| **Terrain** | {{SURFACE_TERRAIN}} m² *(si maison)* |

### Composition
- **Nombre de pièces** : {{NB_PIECES}}
- **Chambres** : {{NB_CHAMBRES}}
- **Salles d'eau** : {{NB_SDB}}
- **Étage** : {{ETAGE}} / {{ETAGE_TOTAL}} *(si immeuble)*
- **Annexes** : {{ANNEXES}} *(parking, cave, terrasse, balcon, jardin)*

---

## 3. ANALYSE DU MARCHÉ LOCAL

**Secteur** : {{SECTEUR_GEO}}  
**IRIS** : {{IRIS}} — {{NOM_IRIS}}  
**Commune** : {{VILLE}} ({{CODE_INSEE}}) — {{POPULATION}} habitants

### Tendances de marché
- **Prix médian au m²** ({{TYPE_BIEN}}) : **{{PRIX_MEDIAN}} €/m²** *(source : VALORIS/DVF)*
- **Évolution sur 12 mois** : {{EVOLUTION_12M}}
- **Évolution sur 3 ans** : {{EVOLUTION_3ANS}}
- **Volume de transactions** (12 derniers mois, commune) : {{NB_TRANSACTIONS}} ventes
- **Tension du marché** : {{TENSION}} *(fort / modéré / faible)*

### Contexte territorial
- **Dynamisme économique** : {{CONTEXTE_ECONOMIQUE}}
- **Accessibilité transport** : {{ACCESSIBILITE}}
- **Bassin d'emploi** : {{BASSIN_EMPLOI}}

---

## 4. TRANSACTIONS COMPARABLES (DVF)

> Source : Demandes de Valeurs Foncières (Etalab / Ministère des Finances)  
> Sélection : ≤ 24 mois — ≤ {{RAYON_KM}} km — {{TYPE_BIEN}} — surface ±30%

| # | Adresse | Date | Surface (m²) | Prix total | Prix/m² | Écart |
|---|---------|------|:---:|---:|---:|:---:|
| 1 | {{COMP1_ADRESSE}} | {{COMP1_DATE}} | {{COMP1_SRF}} | {{COMP1_PRIX}} € | {{COMP1_M2}} €/m² | {{COMP1_ECART}} |
| 2 | {{COMP2_ADRESSE}} | {{COMP2_DATE}} | {{COMP2_SRF}} | {{COMP2_PRIX}} € | {{COMP2_M2}} €/m² | {{COMP2_ECART}} |
| 3 | {{COMP3_ADRESSE}} | {{COMP3_DATE}} | {{COMP3_SRF}} | {{COMP3_PRIX}} € | {{COMP3_M2}} €/m² | {{COMP3_ECART}} |
| 4 | {{COMP4_ADRESSE}} | {{COMP4_DATE}} | {{COMP4_SRF}} | {{COMP4_PRIX}} € | {{COMP4_M2}} €/m² | {{COMP4_ECART}} |
| 5 | {{COMP5_ADRESSE}} | {{COMP5_DATE}} | {{COMP5_SRF}} | {{COMP5_PRIX}} € | {{COMP5_M2}} €/m² | {{COMP5_ECART}} |

**Prix médian des comparables** : **{{PRIX_MEDIAN_COMP}} €/m²**

---

## 5. DESCRIPTION ET ÉTAT DU BIEN

### Caractéristiques générales
- **Année de construction estimée** : {{ANNEE_CONSTRUCTION}} *(source : DPE / Cadastre)*
- **État général** : {{ETAT_GENERAL}} *(Bon / Moyen / À rénover)*
- **Dernière rénovation significative** : {{DERNIERE_RENOVATION}}
- **Copropriété** : {{COPROPRIETE}} *(Oui/Non — charges : {{CHARGES_ANNUELLES}} €/an)*

### Points notables
- **Atouts** : {{ATOUTS_BIEN}}
- **Faiblesses** : {{FAIBLESSES_BIEN}}
- **Travaux identifiés** : {{TRAVAUX_IDENTIFIES}}

### Équipements
- [ ] Parking / Garage
- [ ] Cave / Cellier
- [ ] Balcon / Terrasse ({{SURFACE_ANNEXE}} m²)
- [ ] Jardin privatif ({{SURFACE_JARDIN}} m²)
- [ ] Digicode / Interphone / Gardien
- [ ] Ascenseur
- [ ] Double vitrage
- [ ] {{AUTRE_EQUIPEMENT}}

---

## 6. PERFORMANCE ÉNERGÉTIQUE (DPE)

> Source : ADEME DPE V2 — Base publique nationale

| | Énergie | GES |
|---|:---:|:---:|
| **Étiquette** | **{{ETIQUETTE_ENERGIE}}** | **{{ETIQUETTE_GES}}** |
| **Consommation** | {{CONSO_ENERGIE}} kWh EP/(m².an) | {{EMISSION_GES}} kgCO₂eq/(m².an) |
| **Classification** | {{CLASSE_ENERGIE_LABEL}} | {{CLASSE_GES_LABEL}} |

**Système de chauffage** : {{SYSTEME_CHAUFFAGE}}  
**Production eau chaude** : {{SYSTEME_ECS}}

### Impact sur la valeur
{{#if DPE_F_G}}
> ⚠️ **Passoire énergétique** (DPE {{ETIQUETTE_ENERGIE}}) — Application de la Loi Climat et Résilience (2021) :  
> - Interdiction de louer si consommation > 450 kWh/m²/an (DPE G) depuis le 1er janvier 2023  
> - Interdiction de louer DPE F à partir du 1er janvier 2028  
> - Décote estimée : **−{{DECOTE_DPE}}%** sur la valeur de marché  
> - Estimation travaux de rénovation thermique : **{{COUT_TRAVAUX_DPE}} €**
{{else}}
DPE {{ETIQUETTE_ENERGIE}} — Impact neutre à positif sur la valeur.
{{/if}}

---

## 7. RISQUES ET CONTRAINTES

> Source : Géorisques (BRGM / Ministère de la Transition Écologique)

| Risque | Niveau | Impact estimé |
|--------|:------:|:---:|
| Inondation | {{RISQUE_INONDATION}} | {{IMPACT_INONDATION}} |
| Séisme (zone {{ZONE_SISMIQUE}}/5) | {{NIVEAU_SEISME}} | {{IMPACT_SEISME}} |
| Retrait/Gonflement argiles | {{NIVEAU_ARGILES}} | {{IMPACT_ARGILES}} |
| Radon (catégorie {{CAT_RADON}}/3) | {{NIVEAU_RADON}} | {{IMPACT_RADON}} |
| Installations classées (ICPE) | {{RISQUE_ICPE}} | {{IMPACT_ICPE}} |
| Plan d'exposition au bruit | {{RISQUE_PEB}} | {{IMPACT_PEB}} |

**Synthèse risques** : {{SYNTHESE_RISQUES}}

---

## 8. SERVICES ET ÉQUIPEMENTS DE PROXIMITÉ

> Source : OpenStreetMap / Overpass API (ODbL) — Rayon {{RAYON_SERVICES}} m

**Score de proximité** : **{{SCORE_SERVICES}} / 100**

| Catégorie | Équipements dans le rayon | Évaluation |
|-----------|:---:|---|
| Transports en commun | {{COUNT_TRANSPORTS}} | {{EVAL_TRANSPORTS}} |
| Commerces | {{COUNT_COMMERCES}} | {{EVAL_COMMERCES}} |
| Santé | {{COUNT_SANTE}} | {{EVAL_SANTE}} |
| Éducation | {{COUNT_ECOLES}} | {{EVAL_ECOLES}} |
| Loisirs & culture | {{COUNT_LOISIRS}} | {{EVAL_LOISIRS}} |

**Accès transport** : {{DESC_TRANSPORTS}}  
**Commerces de proximité** : {{DESC_COMMERCES}}

---

## 9. VALEUR ESTIMÉE

### Méthode retenue : Comparaison directe *(principale)*

```
Prix de référence marché    : {{PRIX_MEDIAN_COMP}} €/m²
Surface habitable           : {{SURFACE_HABITABLE}} m²
Valeur brute de référence   : {{VALEUR_BRUTE}} €

Ajustements qualitatifs     :
  {{AJUSTEMENT_1_LABEL}}    : {{AJUSTEMENT_1_PCT}}%
  {{AJUSTEMENT_2_LABEL}}    : {{AJUSTEMENT_2_PCT}}%
  {{AJUSTEMENT_DPE_LABEL}}  : {{AJUSTEMENT_DPE_PCT}}%
  {{AJUSTEMENT_RISQUES}}    : {{AJUSTEMENT_RISQUES_PCT}}%
  {{AJUSTEMENT_SERVICES}}   : {{AJUSTEMENT_SERVICES_PCT}}%
─────────────────────────────────────────────────────
Correction nette totale     : {{CORRECTION_TOTALE}}%
```

### Résultat

| | |
|---|---:|
| **Fourchette basse** | **{{FOURCHETTE_BASSE}} €** |
| **VALEUR VÉNALE ESTIMÉE** | **{{VALEUR_VENALE}} €** |
| **Fourchette haute** | **{{FOURCHETTE_HAUTE}} €** |
| **Prix au m² implicite** | **{{PRIX_M2_IMPLICITE}} €/m²** |

> La valeur vénale centrale est la référence de cet avis. La fourchette représente la dispersion normale observée sur ce type de marché (±{{AMPLITUDE_PCT}}%).

{{#if METHODE_CAPITALISATION}}
### Méthode de contrôle : Capitalisation du revenu

```
Loyer mensuel estimé        : {{LOYER_MENSUEL}} €/mois
Revenu brut annuel          : {{REVENU_BRUT}} €/an
Taux de capitalisation brut : {{TAUX_CAPI}}%
Valeur par capitalisation   : {{VALEUR_CAPI}} €
Écart vs comparaison        : {{ECART_METHODES}}%
Verdict                     : {{VERDICT_COHERENCE}}
```
{{/if}}

---

## 10. FACTEURS D'INFLUENCE SUR LA VALEUR

### Facteurs positifs (+)
{{FACTEURS_POSITIFS}}

### Facteurs négatifs (−)
{{FACTEURS_NEGATIFS}}

### Potentiel de valorisation
{{POTENTIEL_VALORISATION}}

---

## 11. CONDITIONS ET RÉSERVES

Cet avis de valeur est établi sur la base :
- Des données de marché disponibles à la date du **{{DATE_AVIS}}**
- Des informations communiquées par le mandant
- Des sources publiques citées (DVF Etalab, ADEME DPE V2, Géorisques, VALORIS, OpenStreetMap)

**Il ne constitue pas :**
- Une expertise immobilière au sens de la Charte de l'Expertise en Évaluation Immobilière (5e éd.)
- Un engagement de prix de vente ou d'achat
- Un document utilisable pour un crédit hypothécaire (qui requiert une expertise certifiée)

**Limites :**
1. La valeur peut différer en fonction de conditions de négociation individuelles.
2. L'état intérieur du bien n'a pas fait l'objet d'une inspection physique (sauf mention contraire).
3. Les informations relatives à la surface, aux équipements et aux charges n'ont pas été vérifiées sur pièces.
4. Tout événement de marché postérieur à la date de l'avis n'est pas pris en compte.
5. La présente estimation est valable **3 mois** à compter de la date de l'avis.

---

## SOURCES DE DONNÉES

| Source | Données utilisées | Licence |
|--------|------------------|---------|
| DVF Etalab | Transactions immobilières | Ouverte (Etalab) |
| ADEME DPE V2 | Performance énergétique | Ouverte (ADEME) |
| Géorisques (BRGM) | Risques naturels et technologiques | Ouverte (Etalab) |
| GéoAPI INSEE | Données territoriales | Ouverte (Etalab) |
| VALORIS | Prix médians au m² | Ouverte |
| OpenStreetMap | Services de proximité | ODbL |
| SITADEL | Permis de construire | Ouverte (SDES) |

---

*Document généré par FIDI · Conseil Immobilier — Propulsé par Claude Code*  
*Données publiques françaises — Aucune donnée personnelle stockée*
