Lance une analyse complète sur une adresse française et affiche les résultats clés.

Usage: /analyse-adresse [adresse] [type_bien?] [surface?]

Exemples:
  /analyse-adresse "15 rue de la Paix, Paris"
  /analyse-adresse "12 avenue Foch, Lyon" appartement 75
  /analyse-adresse "3 impasse des Lilas, Bordeaux" maison 120

---

Appelle l'endpoint POST /api/analyse avec les paramètres fournis et résume :
1. Score de potentiel (total /100 et verdict)
2. Prix médian au m² (maison + appartement)
3. Nombre de transactions DVF (dernière année)
4. Distribution DPE (% A+B, % F+G)
5. Risques majeurs identifiés
6. Estimation vénale si surface fournie

Si aucune adresse n'est fournie, utilise "15 rue de la Paix, 75001 Paris" comme exemple de test.

Commande curl de test :
```bash
curl -s -X POST http://localhost:8888/api/analyse \
  -H "Content-Type: application/json" \
  -d '{"adresse":"$ADRESSE","type_bien":"$TYPE","surface":$SURFACE,"perimetre":"rayon_1km"}' | jq .
```
