# Branches et mise en ligne — WorldWise Admission

> Le quotidien : où on travaille, comment ça arrive en ligne, et comment on évite
> de casser la production par accident.

---

## 1. Les deux branches, les deux sites

| Branche | Environnement | Ce qui se passe quand tu pousses | Approbation |
|---|---|---|---|
| **`develop`** | **TEST** | Mise en ligne **automatique** sur `dev.worldwise-admission.com` et `app.dev.worldwise-admission.com` | aucune |
| **`PROD`** | **PRODUCTION** | Mise en ligne sur `worldwise-admission.com` et `app.worldwise-admission.com` | **manuelle, obligatoire** |

`develop` est la branche par défaut : c'est là que tu arrives en clonant le dépôt,
c'est là que tu travailles, c'est là que tu casses des choses.

`PROD` est protégée. On ne pousse **jamais** dessus à la main.

> La branche `main` n'est plus utilisée. Le hook `pre-push` t'avertit si tu essaies
> encore de pousser dessus.

---

## 2. Le cycle normal

```
   ┌─────────────┐   git push     ┌──────────────┐  auto   ┌──────────────────┐
   │ Ta machine  │ ─────────────► │   develop    │ ──────► │  SITE DE TEST    │
   │  (develop)  │                │  (GitHub)    │         │  dev.domaine.com │
   └─────────────┘                └──────┬───────┘         └──────────────────┘
                                         │
                                  npm run promote
                                   (+ confirmation)
                                         │
                                         ▼
                                  ┌──────────────┐  approbation  ┌────────────────┐
                                  │     PROD     │ ────────────► │  SITE LIVE     │
                                  │  (GitHub)    │   GitHub UI   │  domaine.com   │
                                  └──────────────┘               └────────────────┘
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

### Étape 2 — Vérifier sérieusement

Sur le site de test, et seulement là :

- [ ] Le bandeau orange est bien présent
- [ ] La modification que tu as faite fonctionne
- [ ] Connexion admin sur `app.dev.…/login`
- [ ] Le formulaire `/candidature` se soumet et la candidature apparaît dans l'admin
- [ ] La messagerie temps réel fonctionne (message visible sans recharger)
- [ ] Bascule clair / sombre puis rechargement
- [ ] Aucune erreur rouge dans la console du navigateur

### Étape 3 — Promouvoir en production

```powershell
npm run promote
```

Le script, dans l'ordre :

1. refuse s'il te reste des modifications non commitées ;
2. refuse si `PROD` a divergé de `develop` (et te dit comment réparer) ;
3. **te montre la liste exacte des commits** qui partiraient en production ;
4. te demande de taper `PROD` en entier pour confirmer ;
5. pose un **tag de retour arrière** sur l'état actuel de la production ;
6. avance `PROD` et le pousse.

Rien n'est modifié avant l'étape 4 : tu peux annuler sans risque.

Pour voir ce qui partirait sans rien faire :

```powershell
npm run promote:dry
```

### Étape 4 — Approuver dans GitHub

Le push sur `PROD` déclenche **Deploy - PRODUCTION (PROD)**, qui **s'arrête et attend
ton clic**.

1. https://github.com/ww-admission/ww-admission.github.io/actions
2. Ouvre le run en cours → **Review deployments** → **Approve and deploy**

Le workflow vérifie ensuite tout seul que la production sert bien le bon commit, que
la vitrine est indexable et que le back-office ne l'est pas.

---

## 3. Les garde-fous, et ce que chacun protège

| Garde-fou | Où | Ce qu'il empêche |
|---|---|---|
| Hook `pre-push` | ta machine | `git push origin PROD` tapé à la main |
| Dépôt propre exigé | `promote.ps1` | promouvoir du code non commité |
| Contrôle de divergence | `promote.ps1` | écraser un correctif appliqué en prod |
| Confirmation `PROD` à taper | `promote.ps1` | le clic réflexe |
| Tag de retour arrière | `promote.ps1` | perdre l'état précédent |
| Branche `PROD` protégée | GitHub | force-push et suppression de branche |
| Job `guard` | GitHub Actions | déployer un commit absent de `develop` |
| `environment: production` | GitHub Actions | déploiement sans approbation humaine |
| Confirmation `PRODUCTION` | `deploy.sh` | lancement manuel distrait sur le VPS |
| Préflight de configuration | `deploy.sh` | mauvais cookie, mauvaise base, mauvais environnement |
| Bandeau orange | l'application | confondre le test et la production |

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
pull requests visent `develop`.

### 4.2 Protéger `PROD`

**Settings → Branches → Add branch ruleset** (ou *Add rule*), pattern `PROD` :

- ☑ **Restrict deletions**
- ☑ **Block force pushes**
- ☐ *Require a pull request before merging* → **laisser décoché**

> Pourquoi laisser le PR décoché : `promote.ps1` pousse directement sur `PROD`. La
> validation humaine ne se fait pas ici mais à l'étape suivante, au moment du
> déploiement — c'est plus utile, parce que tu approuves en voyant le résumé de ce
> qui part vraiment en ligne.

### 4.3 Exiger ton approbation avant chaque déploiement en production

**Settings → Environments → New environment** → nom exact : `production`

- ☑ **Required reviewers** → ajoute-toi
- (optionnel) **Wait timer** : 0

C'est **le garde-fou le plus important**. Sans lui, un push sur `PROD` déploierait
sans rien demander.

### 4.4 Secrets pour le push-to-deploy

**Settings → Secrets and variables → Actions → New repository secret** :

| Secret | Valeur |
|---|---|
| `VPS_HOST` | IP publique du VPS OVH |
| `VPS_USER` | `deploy` |
| `VPS_SSH_KEY` | clé privée SSH de `deploy` (contenu complet, en-têtes inclus) |
| `VPS_SSH_KNOWN_HOSTS` | sortie de `ssh-keyscan -H <IP_DU_VPS>` |
| `VPS_PORT` | seulement si ton SSH n'est pas sur 22 |

`VPS_SSH_KNOWN_HOSTS` est fortement recommandé : sans lui, le workflow accepte
l'empreinte du serveur à l'aveugle à chaque exécution.

La création de l'utilisateur `deploy` et de sa clé est décrite dans
[DEPLOYMENT.md, étape 9](DEPLOYMENT.md#étape-9--push-to-deploy).

---

## 5. Situations particulières

### Un correctif urgent en production

Le chemin reste le même — il est juste plus rapide. Ne pousse pas directement sur
`PROD` : le job `guard` refuserait le déploiement, parce que le commit ne serait pas
dans `develop`.

```powershell
git checkout develop
# ... le correctif ...
git commit -am "fix: description"
git push
# vérifier sur dev.worldwise-admission.com
npm run promote
# approuver dans GitHub
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

### `PROD` a divergé de `develop`

Ça arrive si quelqu'un a poussé sur `PROD` en contournant le processus.
`promote.ps1` s'arrête et affiche les commits concernés. Pour rapatrier :

```powershell
git checkout develop
git merge origin/PROD
git push origin develop
npm run promote
```

### Créer `PROD` la première fois

`promote.ps1` la crée tout seul à partir de `develop` si elle n'existe pas encore.

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

# promouvoir en PRODUCTION (puis approuver dans GitHub)
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
