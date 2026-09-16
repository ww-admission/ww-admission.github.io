# Mise en ligne — test, production, correctifs

> Le quotidien : où on travaille, comment ça arrive en ligne, comment on corrige vite,
> et comment on retrouve une ancienne version.

---

## 1. En une image

```
  git push develop ──────────► TEST          dev.worldwise-admission.com
        (automatique)                        app.dev.worldwise-admission.com

  npm run release  ──► tag v1.4.0 ──► approbation ──► PRODUCTION   worldwise-admission.com
        (tu retapes "v1.4.0")        (Review deployments)          app.worldwise-admission.com
                                                        │
                                                        └─► archive : Release GitHub v1.4.0
                                                                      main = v1.4.0
```

| Quoi | Où | Déclencheur | Approbation |
|---|---|---|---|
| **TEST** | branche `develop` | chaque `git push` | aucune |
| **PRODUCTION** | un **tag de version** `vX.Y.Z` | `npm run release` | **oui**, dans GitHub |
| **Version en ligne** | branche `main` | avancée automatiquement après chaque mise en production | — |
| **Archive** | *Releases* GitHub + tags | créées automatiquement | — |

Trois règles suffisent :

1. **On travaille sur `develop`** (ou sur une branche `feature/*` / `fix/*` mergée dans `develop`).
2. **La production ne reçoit que des versions** `vX.Y.Z`. Jamais une branche, jamais un commit isolé.
3. **On ne touche jamais `main` à la main** : c'est le reflet exact de ce qui est en ligne.

C'est le fonctionnement d'avant (tags `v1.0.0`, `v1.0.1`, approbation GitHub) —
sans Harbor ni Komodo : le déploiement se fait directement sur le VPS OVH.

---

## 2. Publier sur le TEST

```powershell
git checkout develop
git pull
# ... tu codes, tu vérifies en local (npm run dev) ...
git commit -am "feat(candidature): description"
git push
```

Le workflow **TEST - deploiement** part tout seul (2 à 5 minutes). Il apparaît dans
**Actions** et dans **Deployments → staging**.

- https://dev.worldwise-admission.com
- https://app.dev.worldwise-admission.com/login

Le **bandeau orange « Environnement de test »** en bas à gauche affiche le commit en
ligne. Si tu ne le vois pas, tu es sur la production.

> Les commits qui ne touchent que la documentation (`*.md`, `docs/`) ne déploient rien.

### Vérifier avant de publier en production

- [ ] Le workflow **TEST - deploiement** est vert
- [ ] Le bandeau orange affiche le bon commit
- [ ] Connexion admin sur `app.dev.…/login`
- [ ] `/candidature` se soumet et la candidature apparaît dans l'admin
- [ ] Messagerie temps réel (message visible sans recharger)
- [ ] Bascule clair / sombre, puis rechargement
- [ ] Aucune erreur rouge dans la console du navigateur

---

## 3. Publier en PRODUCTION

### 3.1 Voir ce qui partirait (sans rien faire)

```powershell
npm run release:dry
```

### 3.2 Publier

```powershell
npm run release
```

Le script :

1. vérifie que ton dépôt est propre et à jour ;
2. vérifie que `develop` est construit sur la production actuelle (sinon un correctif
   en ligne serait effacé) ;
3. **affiche la liste exacte des changements** et si le TEST sert bien ce code ;
4. te demande le type de version :
   - `patch` → corrections (`v1.3.0` → `v1.3.1`)
   - `minor` → nouvelles fonctionnalités (`v1.3.0` → `v1.4.0`)
   - `major` → changement majeur (`v1.3.0` → `v2.0.0`)
5. **te fait retaper le numéro** (`v1.4.0`) : impossible de publier par réflexe ;
6. crée le tag et le pousse.

Rien n'est modifié avant l'étape 5.

### 3.3 Approuver dans GitHub

1. **Actions** → run **PRODUCTION ← v1.4.0**
2. Le résumé du run affiche : type (nouvelle version / retour arrière), version en
   ligne avant, **liste des changements**, passage ou non par le TEST, lien de comparaison
3. **Review deployments** → coche `production` → **Approve and deploy**

Personne ne peut envoyer en production sans ce clic (reviewers : `GRIMDERVALD`,
`Steeve36`).

Ensuite, tout seul :

- déploiement sur le VPS (site jamais coupé pendant le build, base sauvegardée avant
  les migrations) ;
- vérification que `https://worldwise-admission.com/health` annonce bien
  `"version":"v1.4.0"`, que la vitrine est indexable et le back-office non ;
- **archive** : Release GitHub `v1.4.0` avec la liste des changements ;
- `main` avancée sur `v1.4.0`.

La mise en production est visible dans **Deployments → production**, version par version.

---

## 4. Corriger vite

### 4.1 Un problème sur le TEST

C'est le cas normal : corrige sur `develop` et pousse. Le TEST se met à jour tout seul.

### 4.2 Un problème en PRODUCTION — correctif urgent (hotfix)

Quand `develop` contient déjà des fonctionnalités **pas prêtes** pour la production,
on corrige **à partir de ce qui est en ligne** (`main`), pas à partir de `develop` :

```powershell
git fetch origin
git checkout -b hotfix/description-courte origin/main

# ... le correctif, uniquement ...
git commit -am "fix: description"
git push -u origin hotfix/description-courte

npm run release:hotfix        # propose v1.4.1, tu retapes, puis approbation GitHub
```

Pour tester le correctif avant de le publier (recommandé si tu as 5 minutes) :
**Actions → TEST - deploiement → Run workflow → Branch : `hotfix/description-courte`**.

Après la mise en ligne, le workflow **reporte automatiquement le correctif dans
`develop`** et relance le TEST. En cas de conflit, le résumé du run indique les trois
commandes à lancer — tant que ce n'est pas fait, `npm run release` refuse de publier
une nouvelle version (pour ne pas effacer le correctif).

> Si `develop` ne contient rien de plus que la production, pas besoin de branche
> hotfix : corrige sur `develop`, pousse, puis `npm run release` (type `patch`).

### 4.3 Revenir à la version précédente (le plus rapide)

**Depuis GitHub** (rien à installer) :

**Actions → PRODUCTION - mise en ligne d'une version → Run workflow →
Use workflow from : Tags → `v1.3.0`** → approbation.

Le résumé du run affiche **RETOUR ARRIERE** et la liste des changements retirés.
`main` n'est pas modifiée : la correction se fait ensuite normalement, puis nouvelle
version.

**Depuis le VPS** (si GitHub est indisponible) :

```bash
sudo /usr/local/sbin/wwa-deploy production v1.3.0
```

> Un retour arrière **ne défait pas les migrations de base de données**. Chaque mise en
> production sauvegarde la base juste avant de migrer, dans
> `/var/backups/wwa/pre-deploy-<date>-<version>.dump`
> ([DEPLOYMENT.md, étape 11](DEPLOYMENT.md#étape-11--sauvegardes-automatiques)).

### 4.4 En dernier recours : directement sur le VPS

Si GitHub Actions est en panne, le script de déploiement reste utilisable à la main,
avec les mêmes contrôles :

```bash
sudo /usr/local/sbin/wwa-deploy                       # TEST, pointe de develop
sudo /usr/local/sbin/wwa-deploy production v1.4.1     # PRODUCTION, confirmation "PRODUCTION"
```

Un commit sans tag n'est accepté en production qu'avec `WWA_ALLOW_UNTAGGED=1`, à
réserver à une vraie urgence.

---

## 5. Les anciennes versions

| Où | Ce qu'on y trouve |
|---|---|
| **Releases** (`/releases`) | chaque version, sa date, la liste des changements, le code source (zip / tar.gz) |
| **Deployments → production** | quelle version a été mise en ligne, quand, par qui, approuvée par qui |
| **Tags** (`/tags`) | `v1.0.0`, `v1.0.1`, … — jamais supprimés, jamais déplacés |
| **VPS** `/var/backups/wwa/` | la base juste avant chaque mise en production (20 dernières) |
| **VPS** `/var/www/wwa/dist-prev/` | le build précédent du frontend |

Comparer deux versions :
`https://github.com/ww-admission/ww-admission.github.io/compare/v1.3.0...v1.4.0`

---

## 6. Les garde-fous, et ce que chacun protège

| Garde-fou | Où | Ce qu'il empêche |
|---|---|---|
| Numéro à retaper | `release.ps1` | la publication par réflexe |
| Contrôle « construit sur main » | `release.ps1` + workflow | effacer un correctif déjà en ligne |
| Build vérifié avant approbation | workflow | approuver une version qui ne compile pas |
| **Approbation `production`** | GitHub | toute mise en production sans validation humaine |
| Production = tag uniquement | workflow + `deploy.sh` + `ssh-gate.sh` | envoyer une branche ou un commit au hasard |
| Clé SSH à commande forcée | VPS (`ssh-gate.sh`) | qu'une clé volée ouvre un shell sur le serveur |
| Build à côté + bascule | `deploy.sh` | un site cassé pendant ou après un build raté |
| Sauvegarde avant migration | `deploy.sh` | perdre des données sur une migration ratée |
| Vérification `/health` + SEO | workflow | déclarer réussi un déploiement qui ne sert pas la bonne version |
| Hook `pre-push` | ta machine | push direct sur `main`, suppression ou déplacement d'un tag |
| Préflight des `.env` | `deploy.sh` | mauvais cookie, mauvaise base, mauvais environnement |
| Bandeau orange | l'application | confondre le test et la production |

### Activer le hook local (une fois par clone)

```powershell
npm run hooks:install
git config core.hooksPath      # doit afficher scripts/git-hooks
```

---

## 7. Réglages GitHub (une seule fois)

### 7.1 Environnement `production` — déjà en place

**Settings → Environments → production** :

- ☑ **Required reviewers** : `GRIMDERVALD`, `Steeve36` (déjà configuré)
- ☐ *Prevent self-review* : laisser décoché permet à une seule personne de publier un
  correctif urgent ; le cocher impose un second regard à chaque mise en production
- **Deployment branches and tags** → *Selected branches and tags* → ajouter la règle
  de **tag** `v*` : seuls les tags de version peuvent utiliser cet environnement

### 7.2 Protéger les tags de version

**Settings → Rules → Rulesets → New tag ruleset** — nom `versions`, cible
`v*` :

- ☑ **Restrict deletions**
- ☑ **Block force pushes**
- ☑ **Restrict updates**

### 7.3 Protéger `main`

**Settings → Rules → Rulesets → New branch ruleset** — nom `production`, cible `main` :

- ☑ **Restrict deletions**
- ☑ **Block force pushes**

Ne coche **pas** *Restrict updates* ni *Require a pull request* : le workflow de
production doit pouvoir avancer `main`.

### 7.4 Secrets du dépôt

**Settings → Secrets and variables → Actions → New repository secret** :

| Secret | Valeur |
|---|---|
| `VPS_HOST` | IP publique du VPS OVH |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | clé privée dédiée à GitHub Actions (contenu complet, en-têtes inclus) |
| `VPS_SSH_KNOWN_HOSTS` | sortie de `ssh-keyscan -p <PORT> -H <IP_DU_VPS>` |
| `VPS_PORT` | seulement si le SSH du VPS n'écoute pas sur 22 |

Création de l'utilisateur `deploy` et de sa clé :
[DEPLOYMENT.md, étape 9](DEPLOYMENT.md#étape-9--push-to-deploy).

### 7.5 Désactiver l'ancien GitHub Pages

**Settings → Pages → Unpublish site**. Sinon GitHub reconstruit un site statique à
chaque mise à jour de `main` et revendique le domaine `worldwise-admission.com`.

---

## 8. Aide-mémoire

```powershell
# TEST
git push                          # sur develop

# PRODUCTION
npm run release:dry               # voir ce qui partirait
npm run release                   # publier une version, puis approuver dans GitHub

# CORRECTIF URGENT
git checkout -b hotfix/xxx origin/main
git commit -am "fix: ..." ; git push -u origin hotfix/xxx
npm run release:hotfix

# RETOUR ARRIERE
# Actions > PRODUCTION > Run workflow > Use workflow from : tag vX.Y.Z

# une fois par clone
npm run hooks:install
```

```bash
# sur le VPS
sudo /usr/local/sbin/wwa-deploy                        # TEST
sudo /usr/local/sbin/wwa-deploy production v1.4.0      # PRODUCTION
curl -s https://worldwise-admission.com/health          # version en ligne
systemctl status wwa-web wwa-dev-web
sudo supervisorctl status
```
