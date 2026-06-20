#!/usr/bin/env bash
# ═══════════════════════════════════════════════════════════════════════════════
# sync-optimmo-dom.sh
#
# Resynchronise tout le contenu à jour du site Optimmo Dom (depuis ce dépôt
# fidi-etude-marche) vers le dépôt dédié senegal972/Optimmo-Dom.
#
# À lancer depuis la RACINE de votre clone local de fidi-etude-marche,
# après un `git pull` pour récupérer les derniers commits.
#
# Pré-requis : git. (Pas besoin de gh.)
# Si le push demande un identifiant, utilisez votre nom d'utilisateur GitHub
# et un Personal Access Token (scope `repo`) comme mot de passe.
#
# Usage :
#   chmod +x sync-optimmo-dom.sh
#   ./sync-optimmo-dom.sh
# ═══════════════════════════════════════════════════════════════════════════════

set -euo pipefail
GREEN='\033[0;32m'; YELLOW='\033[1;33m'; RED='\033[0;31m'; NC='\033[0m'
info()  { echo -e "${GREEN}✔ $1${NC}"; }
warn()  { echo -e "${YELLOW}⚠ $1${NC}"; }
error() { echo -e "${RED}✖ $1${NC}"; exit 1; }

GHUSER="senegal972"
REPO="Optimmo-Dom"
REMOTE="https://github.com/${GHUSER}/${REPO}.git"

# ── Vérifs ────────────────────────────────────────────────────────────────────
[ -d "Optimmo-Dom" ] || error "Lancez ce script depuis la racine de fidi-etude-marche (dossier Optimmo-Dom/ introuvable)."
[ -d "netlify/functions" ] || error "Dossier netlify/functions/ introuvable."
command -v git >/dev/null || error "git n'est pas installé."

SRC_ROOT="$(pwd)"
WORKDIR="$(mktemp -d)"
trap 'rm -rf "$WORKDIR"' EXIT
info "Dossier temporaire : $WORKDIR"

# ── 1. Cloner le dépôt Optimmo-Dom existant ──────────────────────────────────
warn "Clonage de ${GHUSER}/${REPO}…"
git clone --depth=1 "$REMOTE" "$WORKDIR/repo" 2>/dev/null \
  || error "Impossible de cloner ${REMOTE} (dépôt privé ? identifiants ?)."
DEST="$WORKDIR/repo"

# ── 2. Resynchroniser le contenu ──────────────────────────────────────────────
warn "Copie des fichiers du site (Optimmo-Dom/ → racine)…"
# Efface l'ancien contenu suivi (sauf .git) puis recopie tout
find "$DEST" -mindepth 1 -maxdepth 1 ! -name '.git' -exec rm -rf {} +
cp -R "$SRC_ROOT/Optimmo-Dom/." "$DEST/"

warn "Copie des Netlify Functions (auth + PayPal)…"
mkdir -p "$DEST/netlify/functions"
for f in _auth.mjs _paypal.mjs auth-login.mjs auth-logout.mjs auth-me.mjs \
         auth-register.mjs paypal-order.mjs paypal-subscription.mjs paypal-webhook.mjs; do
  cp "$SRC_ROOT/netlify/functions/$f" "$DEST/netlify/functions/" \
    || error "Fonction manquante : $f"
done
info "Contenu resynchronisé (dont package.json, netlify.toml, image héro, lien /territoires corrigé)."

# ── 3. Commit + push ──────────────────────────────────────────────────────────
cd "$DEST"
git add -A
if git diff --cached --quiet; then
  info "Aucun changement à pousser — le dépôt est déjà à jour."
  exit 0
fi
git commit -m "chore: resync site Optimmo Dom (build Netlify + image héro + nettoyage liens app)"
git branch -M main
warn "Push vers ${GHUSER}/${REPO}…"
git push origin main
info "Push réussi → https://github.com/${GHUSER}/${REPO}"
echo ""
echo "  Netlify va relancer le build automatiquement."
echo "  Vérifiez que le déploiement passe au vert, puis on migre le domaine."
