Diagnostique une fonction Netlify défaillante.

Usage: /debug-function [nom_fonction]

Exemples:
  /debug-function analyse
  /debug-function transactions
  /debug-function batiment

---

## Procédure de diagnostic

### 1. Lecture du fichier
Lire `netlify/functions/[nom_fonction].mjs` et identifier :
- Les URLs d'API tierces appelées
- Les paramètres d'entrée attendus
- Les dépendances sur `_cache.mjs`

### 2. Test de connectivité
Tester chaque API tierce manuellement :
```bash
# Exemple pour analyse
curl -s "https://api-adresse.data.gouv.fr/search/?q=paris&limit=1" | jq .features[0].properties
curl -s "https://geo.api.gouv.fr/communes?codePostal=75001&fields=nom,population" | jq .[0]
```

### 3. Simulation locale
```bash
# Démarrer Netlify Dev
npx netlify dev &
sleep 3

# Tester la fonction
curl -v "http://localhost:8888/api/[nom_fonction]?lat=48.8566&lon=2.3522&..."
```

### 4. Causes fréquentes

| Symptôme | Cause probable | Solution |
|---|---|---|
| `null` ou `{}` retourné | API tierce timeout | Vérifier le timeout (8000ms), augmenter si besoin |
| `500 Internal Server Error` | Erreur JS non catchée | Ajouter try/catch autour de l'appel |
| `CORS error` côté navigateur | Header manquant | Ajouter `Access-Control-Allow-Origin: *` |
| Données périmées | Cache Blobs trop long | Réduire TTL dans `_cache.mjs` |
| `Cannot find module` | Import ESM incorrect | Vérifier les extensions `.mjs` et les imports |
| Données vides pour certaines communes | Code INSEE non trouvé | Vérifier la résolution BAN → GéoAPI |

### 5. Rapport
Résumer le problème trouvé et proposer un correctif précis avec le code modifié.
