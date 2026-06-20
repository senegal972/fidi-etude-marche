# Bibliothèque de fonds d'écran — page d'accueil

Les fonds d'écran du hero (grande image de la page d'accueil) sont gérés
depuis `index.html`, dans le bloc CSS « BIBLIOTHÈQUE DE FONDS D'ÉCRAN ».

| Nom    | Source                                            | Description |
|--------|---------------------------------------------------|-------------|
| Fond 1 | Unsplash `photo-1449844908441-8829872d2607`       | Maison créole / volcan (image d'origine) |
| Fond 2 | `assets/fonds/fond-ecran-2.jpg`                   | Maison créole authentique + Montagne Pelée + Saint-Pierre & la mer |

## Changer le fond affiché
Dans `index.html`, modifier la ligne :

    --fond-actif: var(--fond-ecran-1);   /* ou var(--fond-ecran-2) */

## Ajouter / remplacer une image locale
Déposer le fichier dans ce dossier (`assets/fonds/`) en haute résolution
(idéalement ≥ 1920 px de large, format .jpg) puis pointer la variable
correspondante vers son chemin.
