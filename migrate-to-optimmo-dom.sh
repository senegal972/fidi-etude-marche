#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# migrate-to-optimmo-dom.sh
#
# Migre le site Optimmo Dom vers un dépôt GitHub dédié senegal972/Optimmo-Dom
# et nettoie le dépôt fidi-etude-marche.
#
# Pré-requis :
#   - git installé
#   - gh (GitHub CLI) installé et authentifié avec votre compte senegal972
#       → installer : https://cli.github.com/
#       → authentifier : gh auth login
#
# Usage :
#   chmod +x migrate-to-optimmo-dom.sh
#   ./migrate-to-optimmo-dom.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}✔ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $1${NC}"; }
error() { echo -e "${RED}✖ $1${NC}"; exit 1; }

echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Migration Optimmo Dom → dépôt dédié"
echo "═══════════════════════════════════════════════════════════"
echo ""

# ── Vérifications ─────────────────────────────────────────────────────────────
command -v git >/dev/null || error "git n'est pas installé."
command -v gh  >/dev/null || error "GitHub CLI (gh) n'est pas installé. Voir https://cli.github.com/"
gh auth status >/dev/null 2>&1 || error "Vous n'êtes pas connecté à GitHub CLI. Lancez : gh auth login"

GHUSER=$(gh api user --jq '.login' 2>/dev/null) || error "Impossible de récupérer votre identifiant GitHub."
info "Connecté GitHub : $GHUSER"

# ── Répertoire de travail ──────────────────────────────────────────────────────
WORKDIR=$(mktemp -d)
info "Dossier temporaire : $WORKDIR"
trap 'rm -rf "$WORKDIR"' EXIT

# ── 1. Cloner fidi-etude-marche ────────────────────────────────────────────────
echo ""
warn "Étape 1/5 — Clonage de fidi-etude-marche..."
git clone --depth=1 "https://github.com/${GHUSER}/fidi-etude-marche.git" "$WORKDIR/fidi-etude-marche"
info "Dépôt cloné."

SRC="$WORKDIR/fidi-etude-marche"

# ── 2. Créer le nouveau dépôt ──────────────────────────────────────────────────
echo ""
warn "Étape 2/5 — Création du dépôt senegal972/Optimmo-Dom sur GitHub..."
if gh repo view "${GHUSER}/Optimmo-Dom" >/dev/null 2>&1; then
  warn "Le dépôt ${GHUSER}/Optimmo-Dom existe déjà — on continue."
else
  gh repo create "${GHUSER}/Optimmo-Dom" \
    --public \
    --description "Site web et Espace Partenaires Optimmo Dom — Expert immobilier Martinique & Guadeloupe"
  info "Dépôt créé : https://github.com/${GHUSER}/Optimmo-Dom"
fi

# ── 3. Construire la structure du nouveau dépôt ────────────────────────────────
echo ""
warn "Étape 3/5 — Construction de la structure Optimmo-Dom..."

DEST="$WORKDIR/Optimmo-Dom"
mkdir -p "$DEST/netlify/functions"

# Fichiers du site (depuis Optimmo-Dom/ → racine)
cp -r "$SRC/Optimmo-Dom/." "$DEST/"

# Fonctions serverless auth + paypal uniquement
for f in _auth.mjs _paypal.mjs auth-login.mjs auth-logout.mjs auth-me.mjs auth-register.mjs paypal-order.mjs paypal-subscription.mjs paypal-webhook.mjs; do
  cp "$SRC/netlify/functions/$f" "$DEST/netlify/functions/"
done

# netlify.toml adapté au nouveau dépôt (sans les routes études de marché)
cat > "$DEST/netlify.toml" << 'TOML'
[build]
  publish   = "."
  functions = "netlify/functions"
  command   = "npm install --omit=dev --no-audit --no-fund"

[functions."paypal-subscription"]
  timeout = 20

[functions."paypal-order"]
  timeout = 15

[functions."paypal-webhook"]
  timeout = 15

# ── Auth & Paiements Espace Partenaires ──────────────────────────────────────
[[redirects]]
  from   = "/api/auth/register"
  to     = "/.netlify/functions/auth-register"
  status = 200

[[redirects]]
  from   = "/api/auth/login"
  to     = "/.netlify/functions/auth-login"
  status = 200

[[redirects]]
  from   = "/api/auth/me"
  to     = "/.netlify/functions/auth-me"
  status = 200

[[redirects]]
  from   = "/api/auth/logout"
  to     = "/.netlify/functions/auth-logout"
  status = 200

[[redirects]]
  from   = "/api/paypal/subscription"
  to     = "/.netlify/functions/paypal-subscription"
  status = 200

[[redirects]]
  from   = "/api/paypal/order"
  to     = "/.netlify/functions/paypal-order"
  status = 200

[[redirects]]
  from   = "/api/paypal/webhook"
  to     = "/.netlify/functions/paypal-webhook"
  status = 200

# ── Raccourcis pages publiques ────────────────────────────────────────────────
[[redirects]]
  from   = "/services"
  to     = "/services.html"
  status = 302

[[redirects]]
  from   = "/catalogue"
  to     = "/catalogue.html"
  status = 302

[[redirects]]
  from   = "/realisations"
  to     = "/realisations.html"
  status = 302

[[redirects]]
  from   = "/contact"
  to     = "/contact.html"
  status = 302

[[redirects]]
  from   = "/espace-partenaires"
  to     = "/espace-partenaires/"
  status = 302

[[redirects]]
  from   = "/mentions-legales"
  to     = "/mentions-legales.html"
  status = 302

[[redirects]]
  from   = "/rgpd"
  to     = "/rgpd.html"
  status = 302

# ── Fallback ─────────────────────────────────────────────────────────────────
[[redirects]]
  from   = "/*"
  to     = "/index.html"
  status = 200
TOML

# package.json propre pour Optimmo-Dom
cat > "$DEST/package.json" << 'JSON'
{
  "name": "optimmo-dom",
  "version": "1.0.0",
  "private": true,
  "type": "module",
  "description": "Optimmo Dom — Site web et Espace Partenaires",
  "engines": { "node": ">=18" },
  "scripts": {
    "check": "for f in netlify/functions/*.mjs; do node --check \"$f\"; done"
  },
  "dependencies": {
    "@netlify/blobs": "^8.1.0"
  }
}
JSON

info "Structure construite."

# ── 4. Pousser vers le nouveau dépôt ──────────────────────────────────────────
echo ""
warn "Étape 4/5 — Push vers ${GHUSER}/Optimmo-Dom..."

cd "$DEST"
git init
git add -A
git commit -m "feat: init site Optimmo Dom (migré depuis fidi-etude-marche)

Contenu migré :
- Site public (HTML/CSS/JS) : accueil, services, catalogue, contact, réalisations
- Espace Partenaires : login, dashboard, paiement
- Pages légales : mentions légales, RGPD
- Netlify Functions : auth JWT + paiements PayPal
- netlify.toml dédié (sans routes études de marché)"

git branch -M main
git remote add origin "https://github.com/${GHUSER}/Optimmo-Dom.git"
git push -u origin main

info "Push réussi : https://github.com/${GHUSER}/Optimmo-Dom"

# ── 5. Nettoyage du dépôt fidi-etude-marche ───────────────────────────────────
echo ""
warn "Étape 5/5 — Nettoyage de fidi-etude-marche..."
echo ""
echo "  Pour finir proprement, lancez ces commandes dans votre clone local"
echo "  de fidi-etude-marche :"
echo ""
echo "    cd chemin/vers/fidi-etude-marche"
echo "    git rm -r Optimmo-Dom/"
echo "    git rm netlify/functions/_auth.mjs netlify/functions/_paypal.mjs"
echo "    git rm netlify/functions/auth-*.mjs netlify/functions/paypal-*.mjs"
echo "    git commit -m 'chore: retire le site Optimmo-Dom (migré vers son propre dépôt)'"
echo "    git push"
echo ""
warn "⚠ Ne supprimez pas les fonctions études de marché (analyse.mjs, transactions.mjs, etc.)"

# ── Résumé ────────────────────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════════════════"
echo "  Migration terminée !"
echo "═══════════════════════════════════════════════════════════"
echo ""
echo "  Nouveau dépôt : https://github.com/${GHUSER}/Optimmo-Dom"
echo ""
echo "  Prochaines étapes Netlify (à faire manuellement) :"
echo "  1. app.netlify.com → Add new site → Import from Git"
echo "     → Sélectionner senegal972/Optimmo-Dom"
echo "     → Publish directory : ."
echo "     → Laisser la commande de build par défaut"
echo "  2. Ajouter les variables d'environnement :"
echo "     JWT_SECRET / PAYPAL_CLIENT_ID / PAYPAL_CLIENT_SECRET"
echo "     PAYPAL_ENV / PAYPAL_PLAN_ID_BASIC/PRO/PREMIUM / BASE_URL"
echo "  3. Domain management → Migrer fidiconseil.com"
echo "     vers ce nouveau site (et le retirer de fidi-etude-marche)"
echo ""
