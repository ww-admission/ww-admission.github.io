#!/usr/bin/env bash
# ============================================================================
# install.sh — Installe les services systeme d'un environnement WWA
#
#   sudo bash /var/www/wwa-dev/deploy/install.sh staging
#   sudo bash /var/www/wwa/deploy/install.sh production
#
# Optionnel : autoriser un utilisateur a lancer le deploiement sans mot de
# passe (necessaire pour le push-to-deploy GitHub Actions) :
#   sudo bash /var/www/wwa/deploy/install.sh production deploy
#
# A relancer chaque fois qu'un fichier de deploy/systemd, deploy/supervisor
# ou deploy/nginx change dans le depot.
#
# Idempotent : peut etre relance autant de fois que necessaire.
# ============================================================================
set -euo pipefail

TARGET="${1:-}"
DEPLOY_USER="${2:-}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

C_INFO='\033[1;36m'; C_OK='\033[1;32m'; C_WARN='\033[1;33m'; C_ERR='\033[1;31m'; C_OFF='\033[0m'
log()  { printf "\n${C_INFO}▶ %s${C_OFF}\n" "$1"; }
ok()   { printf "${C_OK}  ✓ %s${C_OFF}\n" "$1"; }
warn() { printf "${C_WARN}  ! %s${C_OFF}\n" "$1"; }
die()  { printf "\n${C_ERR}✗ %s${C_OFF}\n" "$1" >&2; exit 1; }

case "$TARGET" in
  staging|production) ;;
  *) die "usage : sudo bash $0 <staging|production> [utilisateur-de-deploiement]" ;;
esac

[ "$(id -u)" -eq 0 ] || die "à lancer en root : sudo bash $0 $TARGET"

TARGET_CONF="$SCRIPT_DIR/targets/$TARGET.conf"
[ -f "$TARGET_CONF" ] || die "fichier de cible introuvable : $TARGET_CONF"
# shellcheck disable=SC1090
. "$TARGET_CONF"

# SUPERVISOR_GROUP sert aussi de prefixe de nommage : wwa | wwa-dev
PREFIX="$SUPERVISOR_GROUP"

printf "\n  installation de l'environnement : %s\n" "$TARGET"
printf "  dossier    : %s\n" "$APP_DIR"
printf "  prefixe    : %s\n" "$PREFIX"
printf "  node port  : %s\n" "$NODE_PORT"
printf "  reverb port: %s\n" "$REVERB_PORT"

[ -d "$APP_DIR" ] || die "$APP_DIR n'existe pas — clone le depot d'abord"

# ── systemd ────────────────────────────────────────────────────────────────
log "systemd : $SYSTEMD_UNIT"
UNIT_SRC="$SCRIPT_DIR/systemd/$SYSTEMD_UNIT.service"
[ -f "$UNIT_SRC" ] || die "unite introuvable : $UNIT_SRC"
install -m 0644 -o root -g root "$UNIT_SRC" "/etc/systemd/system/$SYSTEMD_UNIT.service"
systemctl daemon-reload
systemctl enable "$SYSTEMD_UNIT" >/dev/null
ok "/etc/systemd/system/$SYSTEMD_UNIT.service installe et active au demarrage"

# ── supervisor ─────────────────────────────────────────────────────────────
log "supervisor : groupe $SUPERVISOR_GROUP"
SUP_SRC="$SCRIPT_DIR/supervisor/$PREFIX.conf"
[ -f "$SUP_SRC" ] || die "conf supervisor introuvable : $SUP_SRC"
install -d -m 0755 /var/log/supervisor
install -m 0644 -o root -g root "$SUP_SRC" "/etc/supervisor/conf.d/$PREFIX.conf"
supervisorctl reread >/dev/null || true
supervisorctl update >/dev/null || true
ok "/etc/supervisor/conf.d/$PREFIX.conf installe"

# ── nginx ──────────────────────────────────────────────────────────────────
log "nginx : vhosts $PREFIX-site / $PREFIX-app / $PREFIX-api"
install -d -m 0755 /etc/nginx/snippets
SNIPPET_SRC="$SCRIPT_DIR/nginx/snippets/$PREFIX-node-proxy.conf"
[ -f "$SNIPPET_SRC" ] || die "snippet introuvable : $SNIPPET_SRC"
install -m 0644 -o root -g root "$SNIPPET_SRC" "/etc/nginx/snippets/$PREFIX-node-proxy.conf"

for kind in site app api; do
  SRC="$SCRIPT_DIR/nginx/$PREFIX-$kind.conf"
  [ -f "$SRC" ] || die "vhost introuvable : $SRC"
  DEST="/etc/nginx/sites-available/$PREFIX-$kind"
  # Ne jamais ecraser une conf deja modifiee par certbot (blocs listen 443 ssl).
  if [ -f "$DEST" ] && grep -q "listen 443" "$DEST"; then
    warn "$DEST contient deja du TLS (certbot) — laisse tel quel"
    warn "  si tu as modifie $SRC, reporte le changement a la main puis : nginx -t && systemctl reload nginx"
  else
    install -m 0644 -o root -g root "$SRC" "$DEST"
    ok "$DEST installe"
  fi
  ln -sfn "$DEST" "/etc/nginx/sites-enabled/$PREFIX-$kind"
done

rm -f /etc/nginx/sites-enabled/default
nginx -t || die "configuration nginx invalide — rien n'a ete recharge"
systemctl reload nginx
ok "nginx recharge"

# ── sudoers pour le push-to-deploy (optionnel) ─────────────────────────────
if [ -n "$DEPLOY_USER" ]; then
  log "sudoers : $DEPLOY_USER"
  id "$DEPLOY_USER" >/dev/null 2>&1 || die "l'utilisateur '$DEPLOY_USER' n'existe pas"

  # Le script lance en root est une COPIE root-only. Si on autorisait
  # directement deploy/deploy.sh (modifiable par l'utilisateur de deploiement),
  # celui-ci pourrait s'octroyer root en editant le fichier.
  install -m 0755 -o root -g root "$SCRIPT_DIR/deploy.sh" /usr/local/sbin/wwa-deploy
  ok "/usr/local/sbin/wwa-deploy installe (copie root-only de deploy.sh)"

  # Commande forcée de la clé SSH de GitHub Actions (voir deploy/ssh-gate.sh).
  install -m 0755 -o root -g root "$SCRIPT_DIR/ssh-gate.sh" /usr/local/sbin/wwa-deploy-gate
  ok "/usr/local/sbin/wwa-deploy-gate installe (seule commande permise a la cle GitHub)"

  SUDOERS=/etc/sudoers.d/wwa-deploy
  {
    echo "# Genere par deploy/install.sh — ne pas editer a la main."
    echo "# Autorise uniquement le lancement du deploiement, rien d'autre."
    echo "$DEPLOY_USER ALL=(root) NOPASSWD: /usr/local/sbin/wwa-deploy"
  } > "$SUDOERS"
  chmod 0440 "$SUDOERS"
  visudo -cf "$SUDOERS" >/dev/null || { rm -f "$SUDOERS"; die "regle sudoers invalide, annulee"; }
  ok "$SUDOERS ecrit et valide"
  warn "wwa-deploy est une copie : relance install.sh apres toute modif de deploy/deploy.sh"
fi

# ── Recapitulatif ──────────────────────────────────────────────────────────
printf "\n${C_OK}==================================================================${C_OFF}\n"
printf "${C_OK}  OK  Services de l'environnement %s installes${C_OFF}\n" "$TARGET"
printf "${C_OK}==================================================================${C_OFF}\n"
printf "  Prochaines etapes :\n"
printf "    1. remplir %s/.env      (modele deploy/env/frontend.env.*)\n" "$APP_DIR"
printf "    2. remplir %s/api/.env  (modele deploy/env/api.env.*)\n" "$APP_DIR"
printf "    3. cd %s/api && php artisan key:generate && php artisan migrate --seed --force\n" "$APP_DIR"
printf "    4. sudo bash %s/deploy.sh %s\n" "$SCRIPT_DIR" "$TARGET"
printf "    5. certbot --nginx -d %s -d %s -d %s\n\n" "$SITE_HOST" "$APP_HOST" "$API_HOST"
