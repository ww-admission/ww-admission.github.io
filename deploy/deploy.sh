#!/usr/bin/env bash
# ============================================================================
# deploy.sh — Déploiement de WWA sur le VPS OVH
#
#   sudo bash /var/www/wwa-dev/deploy/deploy.sh                 → STAGING, pointe de develop
#   sudo bash /var/www/wwa-dev/deploy/deploy.sh staging <sha>
#   sudo bash /var/www/wwa/deploy/deploy.sh production v1.2.0   → une version publiée
#   sudo bash /var/www/wwa/deploy/deploy.sh production v1.1.0   → retour arrière
#
# La cible par défaut est STAGING : déployer en production demande de le dire
# explicitement, de confirmer en tapant PRODUCTION, et de désigner un tag de
# version vX.Y.Z (sans argument : la version pointée par origin/main).
#
# Déroulé sans coupure du site : le nouveau frontend est construit dans
# dist-next/ pendant que dist/ reste servi, puis les deux sont échangés.
# Si le nouveau build ne répond pas, l'ancien est remis en place.
#
# Variables d'environnement acceptées :
#   WWA_YES=1              saute la confirmation interactive (GitHub Actions)
#   WWA_NO_BUILD=1         saute le build Astro (diagnostic uniquement)
#   WWA_ALLOW_UNTAGGED=1   autorise en production un commit sans tag (urgence)
#   PHP_FPM=...            nom du service php-fpm (défaut : php8.3-fpm)
# ============================================================================
set -euo pipefail

# Arguments acceptes dans n'importe quel ordre :
#   staging | production   la cible (defaut : staging)
#   <ref>                  tag ou sha a deployer (retour arriere)
#   --yes | -y             saute la confirmation (GitHub Actions)
TARGET=""
REF=""
ASSUME_YES="${WWA_YES:-}"
for arg in "$@"; do
  case "$arg" in
    --yes|-y)
      ASSUME_YES=1
      ;;
    staging|production)
      TARGET="$arg"
      ;;
    -*)
      printf 'option inconnue : %s\n' "$arg" >&2
      exit 1
      ;;
    *)
      if [ -z "$REF" ]; then
        REF="$arg"
      else
        printf 'argument en trop : %s\n' "$arg" >&2
        exit 1
      fi
      ;;
  esac
done
TARGET="${TARGET:-staging}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

C_INFO='\033[1;36m'; C_OK='\033[1;32m'; C_WARN='\033[1;33m'; C_ERR='\033[1;31m'; C_OFF='\033[0m'
log()  { printf "\n${C_INFO}▶ %s${C_OFF}\n" "$1"; }
ok()   { printf "${C_OK}  ✓ %s${C_OFF}\n" "$1"; }
warn() { printf "${C_WARN}  ! %s${C_OFF}\n" "$1"; }
die()  { printf "\n${C_ERR}✗ %s${C_OFF}\n" "$1" >&2; exit 1; }

# ── 1. Cible ───────────────────────────────────────────────────────────────
case "$TARGET" in
  staging|production) ;;
  *) die "cible inconnue : '$TARGET' (attendu : staging | production)" ;;
esac

TARGET_CONF="$SCRIPT_DIR/targets/$TARGET.conf"
[ -f "$TARGET_CONF" ] || die "fichier de cible introuvable : $TARGET_CONF"
# shellcheck disable=SC1090
. "$TARGET_CONF"

for v in ENV_NAME GIT_BRANCH APP_DIR NODE_PORT REVERB_PORT SYSTEMD_UNIT \
         SUPERVISOR_GROUP SITE_HOST APP_HOST API_HOST DB_NAME; do
  [ -n "${!v:-}" ] || die "$TARGET.conf : variable $v manquante"
done

[ "$(id -u)" -eq 0 ] || die "à lancer en root : sudo bash $0 $TARGET"

API_DIR="$APP_DIR/api"
FE_ENV="$APP_DIR/.env"
API_ENV="$API_DIR/.env"
PHP_FPM="${PHP_FPM:-php8.3-fpm}"
if [ "$TARGET" = production ]; then EXAMPLE_SUFFIX=prod; else EXAMPLE_SUFFIX=staging; fi

# ── 2. Verrou : jamais deux déploiements simultanés ────────────────────────
exec 9>"/var/lock/wwa-deploy-$TARGET.lock"
flock -n 9 || die "un déploiement $TARGET est déjà en cours"

# ── 3. Bannière + confirmation ─────────────────────────────────────────────
printf "\n"
if [ "$TARGET" = production ]; then
  printf "${C_ERR}==================================================================${C_OFF}\n"
  printf "${C_ERR}  ATTENTION : DEPLOIEMENT EN  P R O D U C T I O N${C_OFF}\n"
  printf "${C_ERR}==================================================================${C_OFF}\n"
else
  printf "${C_WARN}==================================================================${C_OFF}\n"
  printf "${C_WARN}  Deploiement sur l'environnement de TEST${C_OFF}\n"
  printf "${C_WARN}==================================================================${C_OFF}\n"
fi
printf "  cible        : %s\n" "$TARGET"
printf "  branche      : %s\n" "${REF:-$GIT_BRANCH}"
printf "  dossier      : %s\n" "$APP_DIR"
printf "  vitrine      : https://%s\n" "$SITE_HOST"
printf "  back-office  : https://%s\n" "$APP_HOST"
printf "  base         : %s\n" "$DB_NAME"
printf "\n"

if [ "$TARGET" = production ] && [ "$ASSUME_YES" != "1" ]; then
  printf "${C_ERR}Cette operation met a jour le site LIVE vu par les candidats.${C_OFF}\n"
  printf "Tape exactement  PRODUCTION  pour continuer (autre chose = annulation) : "
  read -r answer
  [ "$answer" = "PRODUCTION" ] || die "annulé par l'utilisateur"
fi

# ── 4. Préflight : cohérence des .env avec la cible ────────────────────────
# C'est ici qu'on attrape les erreurs les plus coûteuses : un staging
# configuré avec le cookie ou la base de production.
log "Vérification de la configuration"

[ -f "$FE_ENV" ]  || die "$FE_ENV manquant (modèle : deploy/env/frontend.env.$EXAMPLE_SUFFIX.example)"
[ -f "$API_ENV" ] || die "$API_ENV manquant (modèle : deploy/env/api.env.$EXAMPLE_SUFFIX.example)"

# Lit une clé dans un fichier .env : dernière occurrence, quotes et CR retirés.
env_get() {
  sed -nE "s/^[[:space:]]*$2[[:space:]]*=[[:space:]]*//p" "$1" 2>/dev/null \
    | tail -n1 | tr -d "\"'\r" | sed -e 's/[[:space:]]*$//'
}
# Extrait l'hôte d'une URL (sans schéma, sans port, sans chemin), en minuscules.
host_of() {
  printf '%s' "$1" | sed -E 's#^[a-zA-Z]+://##; s#/.*$##; s#:[0-9]+$##' \
    | tr '[:upper:]' '[:lower:]'
}

fe_env_name=$(env_get "$FE_ENV" PUBLIC_ENV_NAME)
fe_site=$(env_get "$FE_ENV" PUBLIC_SITE_URL)
fe_app=$(env_get "$FE_ENV" PUBLIC_APP_URL)
fe_cookie=$(env_get "$FE_ENV" COOKIE_DOMAIN)
fe_backend=$(env_get "$FE_ENV" BACKEND_URL)
fe_jwt=$(env_get "$FE_ENV" JWT_SECRET)
fe_rvb_key=$(env_get "$FE_ENV" PUBLIC_REVERB_APP_KEY)
fe_rvb_host=$(env_get "$FE_ENV" PUBLIC_REVERB_HOST)

[ "$fe_env_name" = "$ENV_NAME" ] || die "PUBLIC_ENV_NAME='$fe_env_name' dans $FE_ENV mais la cible est '$ENV_NAME'.
     Un mauvais PUBLIC_ENV_NAME desindexe la prod (robots Disallow) ou expose le test."

[ "$(host_of "$fe_site")" = "$SITE_HOST" ] \
  || die "PUBLIC_SITE_URL pointe sur '$(host_of "$fe_site")', attendu '$SITE_HOST'"
[ "$(host_of "$fe_app")" = "$APP_HOST" ] \
  || die "PUBLIC_APP_URL pointe sur '$(host_of "$fe_app")', attendu '$APP_HOST'"
[ "$(host_of "$fe_backend")" = "$API_HOST" ] \
  || die "BACKEND_URL pointe sur '$(host_of "$fe_backend")', attendu '$API_HOST'"

# ── INVARIANT COOKIE : la garde la plus importante du script ───────────────
cookie_bare="${fe_cookie#.}"
[ -n "$cookie_bare" ] || die "COOKIE_DOMAIN est vide dans $FE_ENV (attendu : .$SITE_HOST)"
[ "$cookie_bare" = "$SITE_HOST" ] || die "COOKIE_DOMAIN='$fe_cookie' incoherent.
     Attendu exactement '.$SITE_HOST'.
     Un COOKIE_DOMAIN trop large fait partager la session entre test et production :
     un login sur le test deconnecterait les utilisateurs du site live."
case "$APP_HOST" in
  "$SITE_HOST"|*".$SITE_HOST") ;;
  *) die "APP_HOST '$APP_HOST' n'est pas un sous-domaine de SITE_HOST '$SITE_HOST'.
     Le cookie de session ne pourrait pas couvrir les deux hotes.
     Utilise app.$SITE_HOST (et non dev.app....)." ;;
esac
ok "cookie : .$SITE_HOST couvre $SITE_HOST et $APP_HOST"

[ -n "$fe_jwt" ] || die "JWT_SECRET est vide dans $FE_ENV"
case "$fe_jwt" in
  *REMPLACER*|*change-me*|*changeme*)
    die "JWT_SECRET est encore la valeur d'exemple dans $FE_ENV (openssl rand -base64 48)" ;;
esac
[ "${#fe_jwt}" -ge 32 ] \
  || die "JWT_SECRET fait ${#fe_jwt} caracteres, minimum 32 (openssl rand -base64 48)"

# Les deux environnements ne doivent jamais partager le meme secret de session.
if [ "$TARGET" = staging ] && [ -r /var/www/wwa/.env ]; then
  prod_jwt=$(env_get /var/www/wwa/.env JWT_SECRET)
  if [ -n "$prod_jwt" ] && [ "$prod_jwt" = "$fe_jwt" ]; then
    die "JWT_SECRET identique entre staging et production. Genere-en un nouveau pour le staging."
  fi
fi

api_debug=$(env_get "$API_ENV" APP_DEBUG)
api_db=$(env_get "$API_ENV" DB_DATABASE)
api_conn=$(env_get "$API_ENV" DB_CONNECTION)
api_front=$(env_get "$API_ENV" FRONTEND_URL)
api_rvb_key=$(env_get "$API_ENV" REVERB_APP_KEY)
api_rvb_origins=$(env_get "$API_ENV" REVERB_ALLOWED_ORIGINS)
api_rvb_port=$(env_get "$API_ENV" REVERB_SERVER_PORT)
api_key=$(env_get "$API_ENV" APP_KEY)

[ "$api_debug" = "false" ] || die "APP_DEBUG='$api_debug' dans $API_ENV, doit etre 'false'"
[ -n "$api_key" ]          || die "APP_KEY est vide dans $API_ENV -> php artisan key:generate"
[ "$api_conn" = "pgsql" ]  || die "DB_CONNECTION='$api_conn' dans $API_ENV, attendu 'pgsql'"
[ "$api_db" = "$DB_NAME" ] || die "DB_DATABASE='$api_db' dans $API_ENV, attendu '$DB_NAME'.
     Deployer le staging sur la base de production detruirait des donnees reelles."
[ "$(host_of "$api_front")" = "$APP_HOST" ] \
  || die "FRONTEND_URL pointe sur '$(host_of "$api_front")', attendu '$APP_HOST' (CORS)"
[ "$api_rvb_key" = "$fe_rvb_key" ] \
  || die "REVERB_APP_KEY ($API_ENV) different de PUBLIC_REVERB_APP_KEY ($FE_ENV) -> WebSocket casse"
[ "$(host_of "$fe_rvb_host")" = "$API_HOST" ] \
  || die "PUBLIC_REVERB_HOST='$fe_rvb_host', attendu '$API_HOST'"
[ "${api_rvb_port:-$REVERB_PORT}" = "$REVERB_PORT" ] \
  || die "REVERB_SERVER_PORT='$api_rvb_port' dans $API_ENV, attendu '$REVERB_PORT'"
case "$api_rvb_origins" in
  *'*'*) die "REVERB_ALLOWED_ORIGINS contient '*' -> Cross-Site WebSocket Hijacking" ;;
  *"https://$APP_HOST"*) ;;
  *) die "REVERB_ALLOWED_ORIGINS ('$api_rvb_origins') ne contient pas https://$APP_HOST" ;;
esac
ok "frontend et backend coherents (hotes, base, CORS, Reverb)"

systemctl list-unit-files "$SYSTEMD_UNIT.service" --no-legend 2>/dev/null | grep -q . \
  || die "service '$SYSTEMD_UNIT' non installe -> lance d'abord : sudo bash $SCRIPT_DIR/install.sh $TARGET"
ok "service systemd $SYSTEMD_UNIT present"

# ── 5. Récupération du code ────────────────────────────────────────────────
log "Récupération du code"
cd "$APP_DIR"
git config --global --add safe.directory "$APP_DIR" 2>/dev/null || true
git fetch --prune --tags --force origin

if [ -n "$REF" ]; then
  git rev-parse --verify "$REF^{commit}" >/dev/null 2>&1 || die "reference git inconnue : $REF"
  TARGET_SHA=$(git rev-parse "$REF^{commit}")
else
  git rev-parse --verify "origin/$GIT_BRANCH" >/dev/null 2>&1 \
    || die "la branche origin/$GIT_BRANCH n'existe pas. Cree-la et pousse-la d'abord."
  TARGET_SHA=$(git rev-parse "origin/$GIT_BRANCH")
fi

# Version publiée : le tag demandé, sinon un tag vX.Y.Z posé exactement sur ce commit.
VERSION=""
if [ -n "$REF" ] && git rev-parse -q --verify "refs/tags/$REF" >/dev/null; then
  VERSION="$REF"
else
  VERSION=$(git describe --tags --exact-match --match 'v[0-9]*.[0-9]*.[0-9]*' "$TARGET_SHA" 2>/dev/null || true)
fi

if [ "$TARGET" = production ]; then
  if [ -z "$VERSION" ]; then
    [ "${WWA_ALLOW_UNTAGGED:-}" = "1" ] || die "la production ne deploie que des versions (tag vX.Y.Z).
     $(git rev-parse --short "$TARGET_SHA") n'a pas de tag. Publie une version (npm run release),
     ou, en urgence seulement : WWA_ALLOW_UNTAGGED=1"
    warn "commit sans tag deploye en production (WWA_ALLOW_UNTAGGED=1)"
  else
    printf '%s' "$VERSION" | grep -Eq '^v[0-9]+\.[0-9]+\.[0-9]+$' \
      || die "tag '$VERSION' hors convention (attendu : vMAJEUR.MINEUR.PATCH)"
  fi
fi

PREV_SHA=$(git rev-parse HEAD 2>/dev/null || echo '')
if [ -n "$PREV_SHA" ]; then
  printf '%s\n' "$PREV_SHA" > "$APP_DIR/.deploy-previous"
  ok "version precedente memorisee : $(git describe --tags --always "$PREV_SHA" 2>/dev/null)"
fi

if [ "$PREV_SHA" = "$TARGET_SHA" ]; then
  warn "deja a jour sur $(git rev-parse --short "$TARGET_SHA") — rebuild quand meme"
else
  printf "  commits appliques :\n"
  git --no-pager log --oneline "$PREV_SHA..$TARGET_SHA" 2>/dev/null | head -20 | sed 's/^/    /' || true
fi

git reset --hard "$TARGET_SHA"
# Pas de -x : les fichiers ignores (.env, node_modules, dist*, api/vendor) sont preserves.
git clean -fd
RELEASE_SHA=$(git rev-parse --short HEAD)
ok "code sur ${VERSION:+$VERSION · }$RELEASE_SHA"

# ── 6. Maintenance de l'API ────────────────────────────────────────────────
# Le code PHP vient de changer : l'API reste en maintenance jusqu'à ce que
# dépendances et migrations correspondent. La vitrine continue d'être servie
# par l'ancien process Node et l'ancien dist/.
cd "$API_DIR"
php artisan down --retry=15 >/dev/null 2>&1 || true
trap 'cd "$API_DIR" 2>/dev/null && php artisan up >/dev/null 2>&1 || true' EXIT

# Échec avant toute modification de vendor/ ou de la base : on remet le code
# précédent pour que l'API redémarre sur une version cohérente.
abort_before_migration() {
  if [ -n "$PREV_SHA" ]; then
    git -C "$APP_DIR" reset --hard "$PREV_SHA" >/dev/null 2>&1 \
      && warn "code remis sur $(git -C "$APP_DIR" rev-parse --short "$PREV_SHA") : le site en ligne n'a pas change"
  fi
  die "$1"
}

# ── 7. Frontend Astro : build à côté de la version en ligne ────────────────
cd "$APP_DIR"
if [ "${WWA_NO_BUILD:-}" = "1" ]; then
  warn "build Astro saute (WWA_NO_BUILD=1)"
else
  log "Frontend : dépendances npm"
  # --include=dev : @astrojs/partytown et @tailwindcss/typography sont des
  # devDependencies necessaires au build, meme avec NODE_ENV=production.
  npm ci --include=dev --no-audit --no-fund \
    || abort_before_migration "npm ci a echoue"

  log "Frontend : build Astro ($ENV_NAME, ${VERSION:+$VERSION, }release $RELEASE_SHA)"
  rm -rf "$APP_DIR/dist-next"
  # Les PUBLIC_* sont figees ici. PUBLIC_RELEASE et PUBLIC_VERSION n'existent que
  # dans process.env, jamais dans .env -> aucun conflit de precedence.
  WWA_OUT_DIR=dist-next PUBLIC_RELEASE="$RELEASE_SHA" PUBLIC_VERSION="$VERSION" npm run build \
    || abort_before_migration "le build Astro a echoue"
  [ -f "$APP_DIR/dist-next/server/entry.mjs" ] \
    || abort_before_migration "build incomplet : dist-next/server/entry.mjs absent"
  ok "build pret dans dist-next/ (dist/ toujours en ligne)"
fi

# ── 8. Backend Laravel : sauvegarde, dépendances, migrations ───────────────
cd "$API_DIR"

if [ "$TARGET" = production ]; then
  log "Backend : sauvegarde de la base avant migration"
  BACKUP_DIR=/var/backups/wwa
  install -d -m 0700 "$BACKUP_DIR"
  dump="$BACKUP_DIR/pre-deploy-$(date +%Y%m%d-%H%M%S)-${VERSION:-$RELEASE_SHA}.dump"
  runuser -u postgres -- pg_dump -Fc "$DB_NAME" > "$dump" \
    || abort_before_migration "sauvegarde de $DB_NAME impossible : aucune migration lancee"
  chmod 600 "$dump"
  # On garde les 20 dernieres sauvegardes pre-deploiement.
  ls -1t "$BACKUP_DIR"/pre-deploy-*.dump 2>/dev/null | tail -n +21 | xargs -r rm -f
  ok "base sauvegardee : $dump"
fi

log "Backend : dépendances Composer"
COMPOSER_ALLOW_SUPERUSER=1 composer install \
  --no-dev --no-interaction --prefer-dist --optimize-autoloader --no-progress

log "Backend : migrations"
php artisan migrate --force

log "Backend : caches"
php artisan config:cache
php artisan route:cache
php artisan view:cache
php artisan event:cache
# Pas de storage:link : les pieces jointes sont servies par le BFF Astro,
# jamais en direct par nginx (cf. deploy/nginx/wwa-api.conf).

# ── 9. Bascule du frontend + permissions ───────────────────────────────────
cd "$APP_DIR"
if [ -d "$APP_DIR/dist-next" ]; then
  log "Bascule du frontend"
  rm -rf "$APP_DIR/dist-prev"
  [ -d "$APP_DIR/dist" ] && mv "$APP_DIR/dist" "$APP_DIR/dist-prev"
  mv "$APP_DIR/dist-next" "$APP_DIR/dist"
  ok "dist/ = nouvelle version, dist-prev/ = version precedente"
fi

log "Permissions"
chown -R www-data:www-data "$APP_DIR/dist" "$API_DIR/storage" "$API_DIR/bootstrap/cache"
find "$API_DIR/storage" "$API_DIR/bootstrap/cache" -type d -exec chmod 775 {} +
chown www-data:www-data "$FE_ENV" "$API_ENV"
chmod 600 "$FE_ENV" "$API_ENV"

# ── 10. Redémarrages ────────────────────────────────────────────────────────
log "Redémarrage des services"
systemctl reload "$PHP_FPM"
systemctl restart "$SYSTEMD_UNIT"
if supervisorctl status "$SUPERVISOR_GROUP:*" >/dev/null 2>&1; then
  supervisorctl restart "$SUPERVISOR_GROUP:*"
  ok "supervisor $SUPERVISOR_GROUP:* redemarre"
else
  warn "groupe supervisor '$SUPERVISOR_GROUP' introuvable — Reverb et la queue n'ont pas redemarre"
fi

cd "$API_DIR" && php artisan up
trap - EXIT

# ── 11. Vérification (et remise en place de l'ancien frontend si échec) ────
log "Vérification"

wait_health() {
  local body=''
  for _ in 1 2 3 4 5 6 7 8 9 10; do
    body=$(curl -fsS --max-time 5 "http://127.0.0.1:$NODE_PORT/health" 2>/dev/null || true)
    [ -n "$body" ] && break
    sleep 2
  done
  printf '%s' "$body"
}

health=$(wait_health)
if [ -z "$health" ] || ! systemctl is-active --quiet "$SYSTEMD_UNIT"; then
  if [ -d "$APP_DIR/dist-prev" ]; then
    warn "le nouveau frontend ne repond pas : remise en place de la version precedente"
    rm -rf "$APP_DIR/dist-failed"
    mv "$APP_DIR/dist" "$APP_DIR/dist-failed"
    mv "$APP_DIR/dist-prev" "$APP_DIR/dist"
    systemctl restart "$SYSTEMD_UNIT"
    [ -n "$(wait_health)" ] && warn "ancien frontend de nouveau en ligne (build rate conserve dans dist-failed/)"
  fi
  die "/health ne repondait pas sur 127.0.0.1:$NODE_PORT avec la nouvelle version -> journalctl -u $SYSTEMD_UNIT -n 50
     Attention : les migrations de base ont deja ete appliquees."
fi

case "$health" in
  *"\"env\":\"$ENV_NAME\""*) ok "sante : $health" ;;
  *) die "l'application repond mais annonce le mauvais environnement : $health
     PUBLIC_ENV_NAME n'a probablement pas ete pris en compte au build." ;;
esac
case "$health" in
  *"\"release\":\"$RELEASE_SHA\""*) ok "release en ligne : ${VERSION:+$VERSION · }$RELEASE_SHA" ;;
  *) warn "release annoncee differente de $RELEASE_SHA (build saute ?)" ;;
esac

if ss -ltn 2>/dev/null | grep -q "127.0.0.1:$REVERB_PORT"; then
  ok "Reverb ecoute sur 127.0.0.1:$REVERB_PORT"
else
  warn "Reverb n'ecoute pas sur 127.0.0.1:$REVERB_PORT -> /var/log/supervisor/$SUPERVISOR_GROUP-reverb.log"
fi

printf "\n${C_OK}==================================================================${C_OFF}\n"
printf "${C_OK}  OK  Deploiement %s termine — %s${C_OFF}\n" "$TARGET" "${VERSION:+$VERSION · }$RELEASE_SHA"
printf "${C_OK}==================================================================${C_OFF}\n"
printf "  vitrine     : https://%s\n" "$SITE_HOST"
printf "  back-office : https://%s/login\n" "$APP_HOST"
if [ -n "$PREV_SHA" ] && [ "$PREV_SHA" != "$TARGET_SHA" ]; then
  prev_ref=$(git describe --tags --exact-match --match 'v[0-9]*.[0-9]*.[0-9]*' "$PREV_SHA" 2>/dev/null \
    || git rev-parse --short "$PREV_SHA")
  printf "\n  retour arriere si besoin :\n"
  printf "    sudo /usr/local/sbin/wwa-deploy %s %s\n\n" "$TARGET" "$prev_ref"
fi
