#!/usr/bin/env bash
# ============================================================================
# ssh-gate.sh — Seule commande autorisée pour la clé SSH de GitHub Actions
#
# Installé par install.sh dans /usr/local/sbin/wwa-deploy-gate (root, 0755).
# Dans /home/deploy/.ssh/authorized_keys, la clé de GitHub Actions est déclarée :
#
#   command="/usr/local/sbin/wwa-deploy-gate",restrict ssh-ed25519 AAAA... github-actions@wwa
#
# Quelle que soit la commande envoyée par le client, sshd exécute CE script, qui
# n'accepte que :
#
#   staging    [sha]          → sudo wwa-deploy staging --yes [sha]
#   production vX.Y.Z         → sudo wwa-deploy production --yes vX.Y.Z
#
# Une clé volée ne donne donc ni shell, ni transfert de fichiers, ni tunnel :
# seulement le droit de redéployer du code déjà présent sur GitHub.
# ============================================================================
set -euo pipefail

read -r -a args <<< "${SSH_ORIGINAL_COMMAND:-}"

refuse() {
  printf 'wwa-deploy-gate : commande refusee (%s)\n' "$1" >&2
  logger -t wwa-deploy-gate "refus: $1 | commande: ${SSH_ORIGINAL_COMMAND:-<vide>}" 2>/dev/null || true
  exit 2
}

[ "${#args[@]}" -ge 1 ] && [ "${#args[@]}" -le 2 ] || refuse "attendu : <staging|production> [ref]"

target="${args[0]}"
ref="${args[1]:-}"

case "$target" in
  staging)
    [ -z "$ref" ] || [[ "$ref" =~ ^([0-9a-f]{7,40}|v[0-9]+\.[0-9]+\.[0-9]+)$ ]] \
      || refuse "ref de test invalide"
    ;;
  production)
    [[ "$ref" =~ ^v[0-9]+\.[0-9]+\.[0-9]+$ ]] || refuse "la production exige un tag vX.Y.Z"
    ;;
  *)
    refuse "cible inconnue"
    ;;
esac

logger -t wwa-deploy-gate "deploiement $target ${ref:-<pointe de branche>} demande via SSH" 2>/dev/null || true

if [ -n "$ref" ]; then
  exec sudo -n /usr/local/sbin/wwa-deploy "$target" --yes "$ref"
fi
exec sudo -n /usr/local/sbin/wwa-deploy "$target" --yes
