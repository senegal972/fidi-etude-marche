# Méthodologie — Avis de Valeur Immobilier

## Cadre normatif français

### Charte de l'Expertise en Évaluation Immobilière (5e éd., 2012)
Référentiel principal en France, élaboré par :
- **IFEI** — Institut Français de l'Expertise Immobilière
- **SNPI**, **FNAIM**, **UNIS** — syndicats professionnels
- **ICH** — Institut du Commerce et de l'Habitat

Principes fondamentaux (Art. 2) :
1. **Indépendance** — l'évaluateur ne peut avoir d'intérêt dans le bien
2. **Impartialité** — conclusions fondées uniquement sur les données de marché
3. **Compétence** — connaissance du marché local et des méthodes d'évaluation
4. **Confidentialité** — respect des données du mandant

### TEGOVA / EVS 2020
Standards européens (European Valuation Standards), utilisés pour les rapports cross-border et les évaluations bancaires. Compatibles avec la Charte française.

Définition de la **Valeur de Marché** (EVS Art. 4.1) :
> « Le montant estimé auquel un bien devrait s'échanger à la date d'évaluation entre un acheteur et un vendeur consentants, dans une transaction à des conditions normales de concurrence, après une commercialisation adéquate, chaque partie agissant en connaissance de cause, avec prudence et sans contrainte. »

### IVS 2022 (International Valuation Standards)
Référentiel RICS. Utilisé pour les expertises formelles (crédit hypothécaire, cotation boursière).

---

## Les trois méthodes d'évaluation

### 1. Méthode par comparaison directe (obligatoire)

C'est la méthode de référence pour les biens d'habitation en France.

**Principe** : comparer le bien à évaluer à des transactions réelles récentes portant sur des biens similaires.

**Critères de sélection des comparables** :
- Zone géographique : même quartier ou commune (< 1–3 km)
- Date : ≤ 24 mois (36 mois maximum en marché peu actif)
- Type de bien : même nature (appartement/maison) et usage
- Surface : ±30% par rapport au bien étudié
- Source préférentielle : DVF Etalab (données notariales officielles)

**Tableau de pondération des ajustements** :

| Critère | Ajustement |
|---------|------------|
| Étage élevé (≥ 4) vs rez-de-chaussée | +5 à +15% |
| Vue dégagée, dominant | +3 à +10% |
| Exposition sud/sud-ouest | +3 à +7% |
| Parking inclus (secteur tendu) | +5 à +12% |
| Cave/cellier | +1 à +3% |
| Balcon/terrasse ≥ 10 m² | +3 à +8% |
| Jardin privatif | +5 à +20% (dépend surface) |
| Rénovation récente < 5 ans | +5 à +15% |
| Standing élevé (matériaux premium) | +5 à +20% |
| **Rez-de-chaussée sur rue** | −10 à −20% |
| **Vis-à-vis immédiat** | −5 à −10% |
| **Nuisances sonores avérées** | −5 à −15% |
| **DPE E** | −3 à −8% |
| **DPE F** | −8 à −15% |
| **DPE G** | −15 à −25% |
| **Travaux importants à prévoir** | −10 à −30% |
| **Risque inondation (zone rouge)** | −5 à −15% |

**Formule** :
```
Prix_comparable_corrigé = Prix_comparable × (1 + Σ ajustements)
Valeur_estimée = Médiane(Prix_comparables_corrigés) × Surface
Fourchette = ±10% autour de la valeur centrale (marché normal)
            ±15% (marché peu liquide ou bien atypique)
```

---

### 2. Méthode par capitalisation du revenu

Utilisée pour les biens à vocation locative (investissement).

**Formule** :
```
Valeur = Revenu net annuel / Taux de capitalisation
Revenu net = Loyer brut × (1 − taux vacance) − charges propriétaire
```

**Taux de capitalisation brut de référence 2024** :

| Type de bien | Paris IDF | Grandes métropoles | Province |
|-------------|-----------|-------------------|----------|
| Appartement T1-T2 | 3,0–4,5% | 4,0–5,5% | 5,0–7,0% |
| Appartement T3+ | 3,5–5,0% | 4,5–6,0% | 5,5–7,5% |
| Commerce pied d'immeuble | 3,5–5,5% | 5,0–7,0% | 6,0–9,0% |
| Bureau | 4,0–6,0% | 5,5–7,5% | 6,5–10,0% |
| Local d'activité | 5,5–7,5% | 6,5–9,0% | 7,5–12,0% |

**Note** : taux bas = marché prime (sécurité locataire, central). Taux élevé = risque marché.

---

### 3. Méthode par le coût de remplacement (ou coût de revient)

Utilisée principalement pour :
- Bâtiments spéciaux (usines, entrepôts, écoles)
- Propriétés sans comparables (châteaux, biens atypiques)
- Assurance et reconstruction

**Formule** :
```
Valeur = Valeur foncière + Coût de reconstruction − Dépréciation
Dépréciation = f(âge, état, vétusté, obsolescence fonctionnelle)
```

---

## Traitement des données FIDI par section

### DVF — Transactions de référence

Source : `GET /api/transactions?lat=&lon=&perimetre=rayon_1km&type_bien=`

Filtrage recommandé :
```javascript
const comparables = transactions
  .filter(t => {
    const monthsAgo = (Date.now() - new Date(t.date_mutation)) / (30 * 24 * 3600 * 1000);
    return monthsAgo <= 24
      && Math.abs(t.surface_reelle_bati - surface) / surface <= 0.30;
  })
  .sort((a, b) => new Date(b.date_mutation) - new Date(a.date_mutation))
  .slice(0, 6);
```

### DPE — Performance énergétique

Source : `GET /api/batiment?lat=&lon=&code_postal=&ville=`

Correspondance étiquette → impact valeur :
- A / B : prime verte +2 à +5%
- C : valeur de référence (neutre)
- D : légère décote −2 à −3%
- E : décote −3 à −8%
- F : décote −8 à −15% + mention interdiction location 2025
- G : décote −15 à −25% + mention interdiction location immédiate (> 450 kWh/m²)

### Géorisques — Risques naturels

Source : intégré dans `POST /api/analyse` (champ `risques`)

Grille d'impact sur la valeur :
- Inondation zone rouge (PPRi inconstructible) : −10 à −20%
- Inondation zone bleue (PPRi réglementé) : −3 à −8%
- Sismicité zone 4–5 : −2 à −5%
- Retrait/gonflement argiles fort : −3 à −8%
- Radon catégorie 3 : −1 à −3%
- Présence ICPE ou site pollué : −5 à −15%

### Services de proximité

Source : `GET /api/services?lat=&lon=&rayon=800`

Score /100 → impact sur attractivité résidentielle :
- Score ≥ 75 : secteur très bien équipé → prime +3 à +7%
- Score 50–74 : équipement correct → neutre
- Score 25–49 : équipement limité → légère décote −2 à −5%
- Score < 25 : secteur isolé → décote −5 à −10%

---

## Responsabilité et limites de l'avis de valeur

### Ce que l'avis de valeur n'est PAS

- Ce n'est **pas** une expertise immobilière au sens de la Charte
- Il ne peut pas servir de base à un crédit hypothécaire (exige une expertise RICS/IFEI)
- Il n'engage pas la responsabilité civile professionnelle de l'auteur au même titre qu'une expertise certifiée

### Clauses de réserve obligatoires

Toujours inclure dans le document :

```
RÉSERVES ET LIMITES DE LA MISSION

1. Cet avis de valeur est établi à la date indiquée. Toute évolution du marché
   postérieure à cette date n'est pas prise en compte.

2. La valeur estimée repose sur les informations communiquées par le mandant
   et les données de marché publiques (DVF, DPE, Géorisques). L'auteur n'a pas
   procédé à une inspection physique du bien sauf mention contraire.

3. Les informations relatives à la surface, à l'état du bien et aux
   équipements n'ont pas été vérifiées indépendamment. Toute inexactitude
   peut modifier significativement la valeur.

4. Cet avis ne constitue pas un engagement de prix de vente ou d'achat.
   Il est fourni à titre indicatif pour aider à la prise de décision.

5. Sources de données : DVF Etalab (Ministère des Finances), ADEME DPE V2,
   Géorisques (BRGM/MTES), VALORIS, OpenStreetMap (ODbL). Ces données sont
   publiques et peuvent comporter des inexactitudes ou omissions.
```

---

## Bibliographie et références

- **Charte de l'Expertise en Évaluation Immobilière**, 5e édition, 2012 — [ifei.fr]
- **EVS — European Valuation Standards**, TEGOVA, 2020
- **IVS 2022** — International Valuation Standards Council
- **Loi Climat et Résilience** (n° 2021-1104) — interdiction location passoires énergétiques
- **Décret tertiaire** (2019) et **RE2020** (2021) — nouvelles normes énergétiques
- **Base DVF** — data.gouv.fr/datasets/demandes-de-valeurs-foncieres
- **Base ADEME DPE V2** — data.ademe.fr
- **Géorisques** — georisques.gouv.fr
