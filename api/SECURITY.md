# Sécurité — Image Docker `api` (Laravel + Octane + FrankenPHP)

## 1. Contexte

`Dockerfile.laravel` construit l'image de production sur la base `dunglas/frankenphp`
(Debian 13 "trixie") avec les extensions PHP `pcntl`, `pdo_sqlite`, `opcache`, `zip`
ajoutées via `install-php-extensions`. Un scan de vulnérabilités a été exécuté
avant la mise en production pour évaluer le risque réel.

## 2. Résultat du scan

```
MSYS_NO_PATHCONV=1 docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image --severity HIGH,CRITICAL wwa-laravel-final
```

| Cible | Vulnérabilités |
|---|---|
| OS Debian 13 (paquets système) | 67 (58 HIGH, 9 CRITICAL) |
| `vendor/` (dépendances Composer) | 0 |
| `usr/local/bin/frankenphp` (binaire Go) | 0 |

**100% des findings viennent du système Debian sous-jacent à l'image de base** —
aucun dans notre code applicatif ni nos dépendances directes. Pour les 67 CVE,
**aucune "Fixed Version" n'est disponible** dans les dépôts Debian trixie au moment
du scan : il n'y a rien à patcher par mise à jour de paquet à ce stade.

## 3. CVE retenus comme pertinents (surface applicative réelle)

| CVE | Package | Sévérité | Justification |
|---|---|---|---|
| CVE-2026-5773, CVE-2026-6276 | `curl` / `libcurl4t64` 8.14.1 | HIGH | Réutilisation de connexion → fuite de cookie / mauvais transfert SMB. Exploitable seulement si l'app fait des requêtes sortantes vers des URLs contrôlées par l'attaquant (SSRF) en réutilisant un handle curl entre hôtes. Le backend n'appelle que des endpoints fixes (Pusher/Reverb) — aucune fonctionnalité ne fait fetcher une URL fournie par l'utilisateur côté serveur. Risque réel faible, à surveiller si une fonctionnalité de ce type est ajoutée plus tard. |
| CVE-2026-11822, CVE-2026-11824 | `libsqlite3-0` 3.46.1 | HIGH | Corruption mémoire / heap overflow dans SQLite, notre moteur de DB de prod. Nécessite du SQL malveillant ou un fichier `.sqlite` corrompu pour être déclenché ; Eloquent utilise des requêtes paramétrées, pas de SQL brut piloté par l'utilisateur. Exploitation via l'API HTTP peu probable, mais composant sensible car il porte les données de prod — à prioriser dès qu'un correctif Debian sort. |

## 4. CVE écartés (bruit, hors surface applicative)

| CVE | Package | Sévérité | Pourquoi ignorable |
|---|---|---|---|
| CVE-2026-42496, CVE-2026-8376 | `perl`, `perl-base`, `perl-modules-5.40` | CRITICAL | `perl-archive-tar` : traversée de chemin via symlinks ; heap overflow Perl. Perl fait partie du système de base Debian, **jamais appelé par notre code PHP**. Nécessiterait que l'attaquant ait déjà une exécution de commande arbitraire — à ce stade le CVE est sans objet. |
| CVE-2026-42497, CVE-2026-48962, CVE-2026-9538 | `perl`, `perl-base`, `perl-modules-5.40` | HIGH | Idem — `Archive::Tar` / `IO::Compress`, jamais invoqués par l'application. |
| CVE-2026-43185 + ~25 autres CVE kernel (ex. CVE-2013-7445, CVE-2024-21803, CVE-2026-46323…) | `linux-libc-dev` | CRITICAL/HIGH | Ce paquet ne contient que des **headers C** du kernel, pas un kernel en exécution — le container partage le kernel de l'hôte. Faux positif classique des scanners pour les containers : rien n'est réellement exécuté ici. |
| CVE-2026-7598 | `libssh2-1t64` | HIGH | Rien dans la stack n'utilise SSH2. Exposition nulle. |
| CVE-2025-69720 | `ncurses-base`, `libtinfo6`, `ncurses-bin` | HIGH | Rendu terminal interactif (sortie `artisan` en TTY), jamais exposé via HTTP. Exposition nulle. |

## 5. Surveillance continue

Assurée nativement par Harbor (scanner Trivy intégré, scan automatique à chaque
push d'image + rescan planifiable sur les images existantes). Pas de tooling CI
additionnel nécessaire pour cette tâche.

## Sources

- Scan exécuté le 2026-06-21 avec `aquasec/trivy` (image `latest` au moment du scan).
- Image scannée : `wwa-laravel-final`, buildée depuis `api/Dockerfile.laravel`
  sur base `dunglas/frankenphp` (Debian 13.5).
- Détail des CVE : https://avd.aquasec.com/nvd/{cve-id} (remplacer `{cve-id}` par
  l'identifiant, ex. https://avd.aquasec.com/nvd/cve-2026-5773).
