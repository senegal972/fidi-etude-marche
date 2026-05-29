Vérifie la configuration avant un déploiement Netlify.

Usage: /deploy-check

---

## Checklist de déploiement

### 1. Configuration netlify.toml
Vérifie que :
- `publish = "."` est défini
- `functions = "netlify/functions"` est défini
- `command = "npm install --omit=dev ..."` est présent
- Toutes les fonctions ont une redirection `/api/*`
- Les timeouts sont ≤ 26s (limite Netlify plan Pro)

### 2. Fonctions ESM
Pour chaque `netlify/functions/*.mjs` :
- Commence par des `import` (pas de `require`)
- Exporte `export const handler = async (event) => {...}`
- Pas d'imports de modules Node.js non disponibles en ESM (ex: `__dirname` sans import.meta)

### 3. Variables d'environnement
Vérifie que le code référence uniquement ces variables (définies sur Netlify) :
- `process.env.PAPPERS_API_KEY` — dans `pappers.mjs`
- `process.env.SENTRY_DSN` — dans index.html (optionnel)

Vérifie qu'aucun secret n'est hardcodé dans le code.

### 4. Dépendances
- `package.json` contient uniquement `@netlify/blobs` comme dépendance
- Pas de dépendance `devDependencies` nécessaire au runtime

### 5. Test local
```bash
# Installer les dépendances
npm install

# Tester en local (nécessite Netlify CLI)
npx netlify dev

# Vérifier une fonction
curl -s http://localhost:8888/api/autocomplete?q=paris | jq .
curl -s -X POST http://localhost:8888/api/analyse \
  -H "Content-Type: application/json" \
  -d '{"adresse":"1 rue de Rivoli, Paris","type_bien":"appartement","surface":60,"perimetre":"rayon_1km"}' | jq .score
```

### 6. Résumé
Afficher un tableau récapitulatif :
| Vérification | Statut | Note |
|---|---|---|
