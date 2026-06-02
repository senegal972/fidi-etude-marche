Guide interactif pour intégrer une nouvelle source de données publiques dans FIDI.

Usage: /add-datasource [nom_source] [url_api]

Exemples:
  /add-datasource "Loyers CLAMEUR" "https://api.clameur.fr/..."
  /add-datasource "Commerces OSM" "https://overpass-api.de/..."

---

## Étapes à suivre

### 1. Analyser la source
- Vérifier la licence (doit être open data / data.gouv.fr / officielle)
- Tester l'endpoint manuellement avec curl
- Identifier les paramètres d'entrée (lat/lon, code_insee, code_postal...)
- Identifier le format de sortie (JSON, CSV, GeoJSON)

### 2. Créer la fonction Netlify
Créer `netlify/functions/[nom].mjs` en respectant ce template :

```js
// Netlify Function — [Description]
// GET /api/[nom]
// Paramètres : [liste]

const CORS_HEADERS = {
  "Content-Type": "application/json; charset=utf-8",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type",
};

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers: CORS_HEADERS, body: "" };
  }
  try {
    // ... logique
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify(data) };
  } catch (e) {
    return { statusCode: 200, headers: CORS_HEADERS, body: JSON.stringify({ error: e.message }) };
  }
};
```

### 3. Ajouter la redirection dans netlify.toml
```toml
[[redirects]]
  from   = "/api/[nom]"
  to     = "/.netlify/functions/[nom]"
  status = 200
```

### 4. Intégrer dans /api/analyse si pertinent
- Ajouter l'appel dans `netlify/functions/analyse.mjs`
- Enrichir le score si la source affecte un axe de notation

### 5. Afficher dans la SPA
- Ajouter une section dans `index.html`
- Suivre les conventions CSS existantes (`.card`, `.kpi-card`, etc.)

### 6. Tester
```bash
npx netlify dev &
curl "http://localhost:8888/api/[nom]?lat=48.8566&lon=2.3522"
```
