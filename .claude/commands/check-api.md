Vérifie la cohérence et l'état de toutes les fonctions Netlify du projet.

Usage: /check-api

---

Pour chaque fichier dans netlify/functions/*.mjs (hors _cache.mjs) :

1. **Syntaxe** — vérifie que le fichier est du JavaScript ESM valide (`import/export`, pas de `require`)
2. **CORS** — vérifie la présence du header `Access-Control-Allow-Origin: *`
3. **Timeout** — vérifie que `fetchTimeout` ou un AbortController est utilisé
4. **Gestion d'erreurs** — vérifie que les appels API sont dans des try/catch
5. **Export** — vérifie la présence de `export const handler`

Ensuite, vérifie netlify.toml :
- Chaque fonction a-t-elle une redirection `/api/*` configurée ?
- Les timeouts sont-ils raisonnables (≤ 26s) ?

Résume sous forme de tableau :
| Fonction | Syntaxe | CORS | Timeout | Erreurs | Export | Redirect |
|----------|---------|------|---------|---------|--------|---------|

Marque ✅ si OK, ⚠️ si à vérifier, ❌ si manquant.
