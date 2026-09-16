# Branches et mise en ligne — WorldWise Admission

> Le quotidien : où on travaille, comment ça arrive en ligne, et comment on évite
> de casser la production par accident.

---

## 1. Les deux branches, les deux sites

| Branche | Environnement | Ce qui la met à jour | Ce qui se passe ensuite |
|---|---|---|---|
| **`develop`** | **TEST** | un `git push` | déploiement **automatique** sur `dev.worldwise-admission.com` et `app.dev.worldwise-admission.com` |
| **`main`** | **PRODUCTION** | un **merge de `develop` dans `main`** | déploiement **automatique** sur `worldwise-admission.com` et `app.worldwise-admission.com` |

`develop` est la branche par défaut : c'est là que tu arrives en clonant le dépôt,
c'est là que tu travailles, c'est là que tu casses des choses.

`main` ne reçoit **que des merges de `develop`**. On n'y committe jamais directement :
tout ce qui arrive en production doit d'abord être passé par le test.

---

## 2. Le cycle normal

```
   ┌─────────────┐   git push     ┌──────────────┐  auto   ┌──────────────────┐
   │ Ta machine  │ ─────────────► │   develop    │ ──────► │  SITE DE TEST    │
   │  (develop)  │                │  (GitHub)    │         │  dev.domaine.com │
   └─────────────┘                └──────┬───────┘         └──────────────────┘
                                         │
                              merge develop → main
                        (Pull Request  ou  npm run promote)
                                         │
                                         ▼
                                  ┌──────────────┐   auto   ┌────────────────┐
                                  │     main     │ ───────► │  SITE LIVE     │
                                  │  (GitHub)    │          │  domaine.com   │
                                  └──────────────┘          └────────────────┘
```

### Étape 1 — Travailler et publier sur le test

```powershell
git checkout develop
# ... tu codes ...

npm run dev          # vérifier en local d'abord
git add .
git commit -m "Description de ce que tu as changé"
git push
```

Le workflow **Deploy - TEST (develop)** part tout seul. Au bout de 2 à 5 minutes :

- https://dev.worldwise-admission.com
- https://app.dev.worldwise-admission.com/login

Un **bandeau orange « Environnement de test »** apparaît en bas à gauche de chaque
page du site de test, avec le numéro de version. Si tu ne le vois pas, tu es sur la
production — arrête-toi.

> Les commits qui ne touchent que de la documentation (`*.md`, `docs/`) ne
> déclenchent aucun déploiement.

### Étape 2 — Vérifier sérieusement

Sur le site de test, et seulement là :

- [ ] Le workflow **Deploy - TEST (develop)** est vert dans l'onglet *Actions*
- [ ] Le bandeau orange est bien présent
- [ ] La modification que tu as faite fonctionne
- [ ] Connexion admin sur `app.dev.…/login`
- [ ] Le formulaire `/candidature` se soumet et la candidature apparaît dans l'admin
- [ ] La messagerie temps réel fonctionne (message visible sans recharger)
- [ ] Bascule clair / sombre puis rechargement
- [ ] Aucune erreur rouge dans la console du navigateur

### Étape 3 — Merger `develop` dans `main`

Deux façons équivalentes. Les deux passent par les mêmes contrôles.

#### Méthode A — Pull Request sur GitHub (recommandée)

1. https://github.com/ww-admission/ww-admission.github.io/compare/main...develop
2. **Create pull request**, titre par exemple « Mise en production 2026-09-20 »
3. Relis l'onglet **Files changed** : c'est exactement ce qui part en ligne
4. Attends que **CI - build** soit vert sur la PR
5. **Merge pull request** avec l'option **Create a merge commit**

> ⚠️ **Jamais « Squash and merge » ni « Rebase and merge ».** Ces deux options
> réécrivent les commits : `main` contiendrait alors des commits absents de
> `develop`, et le job `guard` **refuserait le déploiement**. Le plus sûr est de les
> désactiver (§4.2).

#### Méthode B — Depuis le terminal

```powershell
npm run promote
```

Le script, dans l'ordre :

1. refuse s'il te reste des modifications non commitées ;
2. refuse si `main` contient du code absent de `develop` (et te dit comment réparer) ;
3. **te montre la liste exacte des commits** qui partiraient en production ;
4. te demande de taper `PRODUCTION` en entier pour confirmer ;
5. pose un **tag de retour arrière** sur l'état actuel de la production ;
6. merge `develop` dans `main` (fast-forward si possible) et pousse.

Rien n'est modifié avant l'étape 4 : tu peux annuler sans risque.

Pour voir ce qui partirait sans rien faire :

```powershell
npm run promote:dry
```

### Étape 4 — Suivre le déploiement

Le merge déclenche **Deploy - PRODUCTION (main)** :

1. https://github.com/ww-admission/ww-admission.github.io/actions
2. Le job **guard** vérifie que `main` ne contient que du code passé par `develop`
3. Si l'environnement `production` exige une approbation (§4.3), clique
   **Review deployments** → **Approve and deploy**
4. Le job **deploy** met le VPS à jour puis vérifie tout seul que la production sert
   bien le bon commit, que la vitrine est indexable et que le back-office ne l'est pas

---

## 3. Les garde-fous, et ce que chacun protège

| Garde-fou | Où | Ce qu'il empêche |
|---|---|---|
| Hook `pre-push` | ta machine | pousser sur `main` du code absent de `origin/develop` |
| Dépôt propre exigé | `promote.ps1` | promouvoir du code non commité |
| Contrôle de divergence | `promote.ps1` | écraser un correctif présent seulement sur `main` |
| Confirmation `PRODUCTION` à taper | `promote.ps1` | le clic réflexe |
| Tag de retour arrière | `promote.ps1` | perdre l'état précédent |
| Merge commit uniquement | réglages GitHub | squash / rebase qui désynchronisent `main` et `develop` |
| Branche `main` protégée | GitHub | force-push et suppression de branche |
| Job `guard` | GitHub Actions | déployer du code absent de `develop` |
| Commit exact transmis au VPS | GitHub Actions | déployer autre chose que ce que `guard` a vérifié |
| `environment: production` | GitHub Actions | (si reviewers requis) déploiement sans second clic |
| Confirmation `PRODUCTION` | `deploy.sh` | lancement manuel distrait sur le VPS |
| Préflight de configuration | `deploy.sh` | mauvais cookie, mauvaise base, mauvais environnement |
| Bandeau orange | l'application | confondre le test et la production |

**La règle commune** au hook, à `promote.ps1` et au job `guard` : le commit envoyé en
production est accepté s'il est **dans `develop`** (fast-forward), ou s'il est **un
merge de `develop` dont le contenu est identique au côté `develop`** (bouton
*Create a merge commit*). Tout le reste est refusé.

### Activer le hook local (une fois par clone)

```powershell
npm run hooks:install
```

Vérification :

```powershell
git config core.hooksPath      # doit afficher scripts/git-hooks
```

Sans ça, la seule barrière locale disparaît. Le reste des garde-fous tient toujours.

---

## 4. Réglages GitHub à faire une seule fois

### 4.1 Branche par défaut

**Settings → General → Default branch** → `develop`.

C'est ce qui fait que tu « arrives » sur `develop` en clonant, et que les nouvelles
pull requests visent `develop` par défaut.

### 4.2 Merge commits uniquement

**Settings → General → Pull Requests** :

- ☑ **Allow merge commits**
- ☐ **Allow squash merging**
- ☐ **Allow rebase merging**
- ☐ **Automatically delete head branches** → **décoché**. Et après chaque merge, ne
  clique jamais sur le bouton **Delete branch** que GitHub affiche sous la PR : il
  supprimerait `develop`.

### 4.3 Protéger `main`

**Settings → Rules → Rulesets → New branch ruleset**, cible `main` :

- ☑ **Restrict deletions**
- ☑ **Block force pushes**
- ☐ *Require a pull request before merging* → **laisser décoché** si tu veux garder
  `npm run promote` ; coche-le si tu veux imposer la méthode A.

### 4.4 Environnement `production`

**Settings → Environments → production** (il existe déjà).

- **Required reviewers** — c'est un **choix** :
  - **décoché** : le merge suffit, la production se met à jour toute seule ;
  - **coché** : après le merge, GitHub attend en plus ton clic
    **Approve and deploy**. Double sécurité, un clic de plus.
- **Deployment branches and tags** → **Selected branches** → `main` : empêche
  qu'un autre workflow ou une autre branche utilise les secrets de production.

### 4.5 Secrets pour le push-to-deploy

**Settings → Secrets and variables → Actions → New repository secret** — au niveau
**du dépôt** (*Repository secrets*), pas seulement dans l'environnement
`production`, sinon le déploiement de test ne les voit pas :

| Secret | Valeur |
|---|---|
| `VPS_HOST` | IP publique du VPS OVH |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | clé privée SSH de `deploy` (contenu complet, en-têtes inclus) |
| `VPS_SSH_KNOWN_HOSTS` | sortie de `ssh-keyscan -p <PORT> -H <IP_DU_VPS>` |
| `VPS_PORT` | seulement si le SSH du VPS n'écoute pas sur 22 |

`VPS_SSH_KNOWN_HOSTS` est fortement recommandé : sans lui, le workflow accepte
l'empreinte du serveur à l'aveugle à chaque exécution.

La création de l'utilisateur `deploy` et de sa clé est décrite dans
[DEPLOYMENT.md, étape 9](DEPLOYMENT.md#étape-9--push-to-deploy).

### 4.6 Désactiver l'ancien GitHub Pages

Le dépôt a servi de site GitHub Pages. **Settings → Pages** → *Source* : **None**
(ou *Unpublish site*), puis supprime l'environnement `github-pages` dans
**Settings → Environments**. Sinon `ww-admission.github.io` continue de revendiquer
le domaine `worldwise-admission.com`.

---

## 5. Situations particulières

### Un correctif urgent en production

Le chemin reste le même — il est juste plus rapide. Ne committe pas directement sur
`main` : le hook et le job `guard` le refuseraient.

```powershell
git checkout develop
# ... le correctif ...
git commit -am "fix: description"
git push
# vérifier sur dev.worldwise-admission.com (workflow vert)
npm run promote          # ou Pull Request develop → main
```

### Revenir en arrière tout de suite

Depuis le VPS :

```bash
sudo /usr/local/sbin/wwa-deploy production "$(cat /var/www/wwa/.deploy-previous)"
```

`deploy.sh` écrit le commit précédent dans `.deploy-previous` avant chaque
déploiement, et affiche la commande exacte à la fin de chaque exécution.

Ou avec le tag posé par `promote.ps1` :

```bash
git -C /var/www/wwa tag --list 'rollback-*' | tail -5
sudo /usr/local/sbin/wwa-deploy production rollback-20260818-1430
```

> Un retour arrière **ne défait pas les migrations de base de données**. Si le
> déploiement fautif a migré le schéma, restaure aussi la sauvegarde
> ([DEPLOYMENT.md étape 11](DEPLOYMENT.md#étape-11--sauvegardes-automatiques)).

> Le retour arrière remet le **VPS** sur l'ancien commit, pas la branche `main`. Le
> prochain merge redéploiera la pointe de `main` : corrige d'abord sur `develop`.

### `main` a divergé de `develop`

Ça arrive si quelqu'un a utilisé *Squash* ou *Rebase*, ou a poussé directement sur
`main` en contournant le hook. `promote.ps1` s'arrête et affiche les commits
concernés, et le job `guard` refuse de déployer. Pour rapatrier :

```powershell
git checkout develop
git merge origin/main
git push origin develop
# vérifier le test, puis nouveau merge develop → main
```

### Tester une modification du script de déploiement

`deploy.sh` est copié dans `/usr/local/sbin/wwa-deploy` (propriété de root) pour que
l'utilisateur `deploy` ne puisse pas s'octroyer les droits root en éditant le script.
Après toute modification de `deploy/deploy.sh`, il faut donc réinstaller la copie :

```bash
sudo bash /var/www/wwa/deploy/install.sh production deploy
```

---

## 6. Aide-mémoire

```powershell
# publier sur le TEST
git checkout develop
git commit -am "message"
git push

# voir ce qui partirait en production, sans rien faire
npm run promote:dry

# mettre en PRODUCTION : Pull Request develop → main (merge commit), ou
npm run promote

# activer les garde-fous locaux (une fois par clone)
npm run hooks:install
```

```bash
# depuis le VPS : déployer à la main
sudo /usr/local/sbin/wwa-deploy              # test (par défaut)
sudo /usr/local/sbin/wwa-deploy production   # production, avec confirmation

# retour arrière
sudo /usr/local/sbin/wwa-deploy production "$(cat /var/www/wwa/.deploy-previous)"

# état des services
systemctl status wwa-web wwa-dev-web
sudo supervisorctl status
```
