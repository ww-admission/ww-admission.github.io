# À faire — mise en service du déploiement WWA

> Liste des tâches restantes pour que le TEST et la PRODUCTION tournent sur le VPS OVH
> avec la procédure par versions. État relevé le **2026-09-17**.
>
> Écrite pour être exécutée par un agent IA (Copilot) accompagné d'un humain. Chaque
> tâche indique **qui** la fait, **comment**, et **comment vérifier**. Les commandes
> détaillées sont dans [DEPLOYMENT.md](DEPLOYMENT.md) ; le fonctionnement au quotidien
> dans [BRANCHING.md](BRANCHING.md).

---

## Règles pour l'agent

- Suivre les tâches **dans l'ordre**. Ne cocher une tâche qu'après sa vérification.
- **[Humain]** = nécessite un compte, un mot de passe, une clé ou une décision : l'agent
  explique quoi faire et attend la confirmation, il ne le fait pas à la place.
- **Ne jamais** : pousser directement sur `main`, supprimer ou déplacer un tag `v*`,
  réintroduire une branche `PROD` ou un script `promote`, supprimer un conteneur
  Docker autre que ceux de SafeLine, lancer `migrate:fresh` en production, coller une
  clé privée ou un secret dans un fichier du dépôt.
- **S'arrêter et demander** si une vérification échoue, si le VPS contient autre chose
  que ce qui est décrit ici, ou si une commande veut supprimer des données.

---

## État de départ (2026-09-17)

| Élément | État |
|---|---|
| Code | procédure par versions commitée sur `develop` en local (`881a695`, `1eded71` et ce fichier), **pas encore poussée** |
| `origin/develop` | `53c2ea6` |
| `origin/main` | `ac764c2` (ancien site ; sera avancée par la première mise en production) |
| Tags | `v1.0.0`, `v1.0.1` → prochaine version : `v1.1.0` |
| DNS Hostinger | `@`, `www`, `dev` → `37.59.97.158` ; **`app`, `api`, `app.dev`, `api.dev` absents** |
| VPS `37.59.97.158` | **SafeLine** sur 80/443, **console 9443 ouverte à Internet**, **SSH 22 fermé**, HTTPS → 504 |
| GitHub — secrets | seulement `HARBOR_*` ; **aucun `VPS_*`** |
| GitHub — environnement `production` | reviewers `GRIMDERVALD`, `Steeve36` ; aucune restriction de tag |
| GitHub — protections | aucun ruleset (ni `main`, ni tags) |
| GitHub Pages | **toujours actif** depuis `main` |
| Runner self-hosted `ndewo-runner` | en ligne, plus utilisé (ancien pipeline Harbor/Komodo) |

---

## Phase 1 — Code et DNS

### ☐ 1.1 Pousser `develop` — [Agent]

```powershell
git checkout develop
git status                 # doit être propre
git push origin develop
```

**Vérifier** : onglet *Actions* → **CI - build** vert sur le dernier commit.
**TEST - deploiement** échouera avec `secret VPS_SSH_KEY absent` : **normal** à ce stade.

### ☐ 1.2 Ajouter les 4 enregistrements DNS — [Humain] (hPanel Hostinger)

hPanel → **Domaines → worldwise-admission.com → DNS / Serveurs de noms → Enregistrements DNS** :

| Type | Nom | Pointe vers | TTL |
|---|---|---|---|
| `A` | `app` | `37.59.97.158` | 300 |
| `A` | `api` | `37.59.97.158` | 300 |
| `A` | `app.dev` | `37.59.97.158` | 300 |
| `A` | `api.dev` | `37.59.97.158` | 300 |

**Ne rien supprimer** : `MX`, `TXT` (SPF), `hostingermail-*._domainkey`, `autodiscover`,
`autoconfig` servent à la messagerie `info@`. Détails : DEPLOYMENT.md, étape 2.

**Vérifier** [Agent] :

```powershell
'','www.','app.','api.','dev.','app.dev.','api.dev.' | ForEach-Object {
  $h = "$($_)worldwise-admission.com"
  "{0,-34} {1}" -f $h, ((Resolve-DnsName $h -Type A -Server ns1.dns-parking.com -DnsOnly -ErrorAction SilentlyContinue | Where-Object Type -eq 'A').IPAddress -join ',')
}
```

Les 7 lignes doivent afficher `37.59.97.158`.

---

## Phase 2 — Serveur VPS OVH

### ☐ 2.1 Accéder au serveur — [Humain]

SSH est fermé depuis Internet : utiliser la **console KVM** du manager OVH
(*Bare Metal Cloud → VPS → vps-d51894c8 → KVM*), ou ouvrir SSH depuis cette console.

### ☐ 2.2 Inventaire avant toute suppression — [Agent, sur le VPS]

```bash
sudo ss -ltnp | grep -E ':(22|80|443|9443)\b'
sudo docker ps -a --format 'table {{.Names}}\t{{.Image}}\t{{.Status}}'
ls /var/www 2>/dev/null
```

**S'arrêter et demander** si on voit autre chose que des conteneurs `safeline-*`
(par exemple Komodo, `wwa-*`, une base de données) : ils peuvent appartenir à
l'ancienne infrastructure de l'agence (GRIMDERVALD). → tâche 5.3.

### ☐ 2.3 Choisir : réinstaller ou retirer SafeLine — [Humain décide]

- **Option A — réinstaller Ubuntu 24.04** si rien d'autre n'est utile sur le serveur
  (DEPLOYMENT.md, étape 1.1). Tout est effacé, on repart proprement.
- **Option B — retirer SafeLine seulement** (DEPLOYMENT.md, étape 1.0) :

```bash
DIR=$(sudo docker inspect safeline-mgt --format '{{ index .Config.Labels "com.docker.compose.project.working_dir" }}')
cd "$DIR" && sudo docker compose down
sudo ss -ltnp | grep -E ':(80|443|9443)\b' || echo "80, 443 et 9443 libres"
```

**Vérifier** [Agent, depuis un poste] : le port 9443 ne répond plus.

```powershell
Test-NetConnection 37.59.97.158 -Port 9443   # TcpTestSucceeded : False
```

### ☐ 2.4 Sécuriser le système et rendre SSH joignable — [Agent + Humain]

DEPLOYMENT.md, étapes **1.2** (SSH par clé), **1.3** (ufw + fail2ban), **1.4** (swap).
Le pare-feu réseau OVH (manager → *Network → Firewall*) doit laisser passer le port SSH,
80 et 443.

**Vérifier** :

```powershell
Test-NetConnection 37.59.97.158 -Port 22     # True (ou le port SSH choisi)
```

### ☐ 2.5 Installer la pile — [Agent, sur le VPS]

DEPLOYMENT.md, étape **3** (Node 22, PHP 8.3, Composer, PostgreSQL, nginx, supervisor)
puis étape **4** (bases `wwa_staging` et `wwa_production`, deux utilisateurs distincts).
Les mots de passe des bases sont générés et conservés par l'**humain**.

**Vérifier** : `node -v` (22.x), `php -v` (8.3), `sudo -u postgres psql -l` liste les deux bases.

### ☐ 2.6 Cloner les deux environnements — [Agent, sur le VPS]

DEPLOYMENT.md, étape **5** : les deux dossiers depuis `develop`.

```bash
REPO=https://github.com/ww-admission/ww-admission.github.io.git
git clone -b develop "$REPO" /var/www/wwa-dev
git clone -b develop "$REPO" /var/www/wwa
```

---

## Phase 3 — Environnement de TEST

### ☐ 3.1 Installer et configurer le TEST — [Agent + Humain pour les secrets]

DEPLOYMENT.md, étape **6.1 à 6.4** : `install.sh staging`, `.env` frontend et backend
(générer `JWT_SECRET`, secrets Reverb, `APP_KEY`), migrations et seeder.
`SUPER_ADMIN_EMAIL` / `SUPER_ADMIN_PASSWORD` : choisis par l'**humain**.

### ☐ 3.2 Certificats HTTPS — [Agent, sur le VPS]

DEPLOYMENT.md, étape **8** (commande « TEST »). Prérequis : tâche 1.2 vérifiée.

### ☐ 3.3 Premier déploiement du TEST — [Agent, sur le VPS]

```bash
sudo bash /var/www/wwa-dev/deploy/deploy.sh
```

**Vérifier** :

```bash
curl -s https://dev.worldwise-admission.com/health
# {"status":"ok","env":"staging","version":null,"release":"<sha>"}
curl -s https://dev.worldwise-admission.com/robots.txt      # Disallow: /
```

### ☐ 3.4 Recette du TEST — [Humain]

DEPLOYMENT.md, **10.5** : bandeau orange, connexion admin, inscription candidat,
candidature, messagerie temps réel, pièce jointe, clair/sombre, déconnexion.

---

## Phase 4 — Production et chaîne automatique

### ☐ 4.1 Installer la PRODUCTION — [Agent + Humain pour les secrets]

DEPLOYMENT.md, étape **7** : `install.sh production`, `.env` avec des secrets
**différents** du test, migrations, seeder. Puis certificats (étape **8**, commande
« PRODUCTION »).

### ☐ 4.2 Publier la première version `v1.1.0` — [Humain, sur son poste]

```powershell
npm run hooks:install
npm run release:dry        # relire la liste
npm run release            # choisir "minor", retaper v1.1.0
```

Sur GitHub, le run **PRODUCTION ← v1.1.0** attend l'approbation : **ne pas approuver
encore** (les secrets n'existent pas).

### ☐ 4.3 Déployer `v1.1.0` à la main — [Agent, sur le VPS]

```bash
sudo bash /var/www/wwa/deploy/deploy.sh production v1.1.0   # taper PRODUCTION
```

**Vérifier** :

```bash
curl -s https://worldwise-admission.com/health     # "env":"production","version":"v1.1.0"
curl -s https://worldwise-admission.com/robots.txt # Allow: /
ls /var/backups/wwa/pre-deploy-*.dump              # sauvegarde créée
```

### ☐ 4.4 Utilisateur `deploy` et clé à commande forcée — [Agent, sur le VPS]

DEPLOYMENT.md, étapes **9.1** et **9.2** :
`adduser deploy`, clé `gh_actions`, `authorized_keys` avec
`command="/usr/local/sbin/wwa-deploy-gate",restrict`, puis
`install.sh production deploy` et `install.sh staging deploy`.

**Vérifier** (depuis un poste qui a temporairement la clé) :

```bash
ssh -i gh_actions deploy@37.59.97.158 'cat /etc/passwd'   # doit être REFUSÉ
```

### ☐ 4.5 Créer les secrets GitHub — [Humain]

DEPLOYMENT.md, étape **9.3** pour obtenir les valeurs. GitHub → **Settings → Secrets and
variables → Actions → New repository secret** (au niveau du **dépôt**) :

`VPS_HOST`, `VPS_USER` (= `deploy`), `VPS_SSH_KEY`, `VPS_SSH_KNOWN_HOSTS`,
`VPS_PORT` (seulement si SSH ≠ 22).

Ensuite, sur le VPS : `sudo shred -u /home/deploy/.ssh/gh_actions`.

### ☐ 4.6 Valider la chaîne automatique — [Humain approuve, Agent vérifie]

1. GitHub → *Actions* → **TEST - deploiement** → *Re-run all jobs* → doit passer au vert.
2. Run **PRODUCTION ← v1.1.0** en attente → **Review deployments → Approve and deploy**.
3. **Vérifier** : run vert ; *Releases* contient `v1.1.0` ; `origin/main` pointe sur
   `v1.1.0` ; *Deployments → production* affiche `v1.1.0`.

```powershell
git fetch --tags origin
git rev-parse origin/main "v1.1.0^{commit}"   # les deux lignes identiques
```

### ☐ 4.7 Test complet + retour arrière — [Humain + Agent]

DEPLOYMENT.md, **10.6** : fichier `public/deploy-check.txt` → TEST → `npm run release`
(patch) → approbation → vérifier en production → **Run workflow sur le tag précédent**
(retour arrière) → vérifier → supprimer le fichier et publier une version propre.

---

## Phase 5 — Réglages GitHub et finitions

### ☐ 5.1 Réglages GitHub — [Humain, ou Agent avec accès admin et accord explicite]

BRANCHING.md, **§7** :

- [ ] *Environments → production* → **Deployment branches and tags** → *Selected* → règle de **tag** `v*`
- [ ] *Rules → Rulesets* → **tag ruleset** `versions` sur `v*` : Restrict deletions, Block force pushes, Restrict updates
- [ ] *Rules → Rulesets* → **branch ruleset** `production` sur `main` : Restrict deletions, Block force pushes (**pas** Restrict updates)
- [ ] *Pages* → **Unpublish site**, puis *Environments* → supprimer `github-pages`
- [ ] *Advanced Security* → activer **Dependabot alerts**

### ☐ 5.2 Sauvegardes quotidiennes — [Agent, sur le VPS]

DEPLOYMENT.md, étape **11** (cron `wwa-backup.sh`) + copie hors du VPS (snapshot OVH
ou `rsync`). **Vérifier** une restauration une fois, sur `wwa_staging`.

### ☐ 5.3 Prévenir l'agence Qatorze (GRIMDERVALD) — [Humain]

- Le déploiement ne passe plus par Harbor/Komodo : nouvelle procédure dans
  `CONTRIBUTING.md` et `docs/BRANCHING.md`.
- Demander si SafeLine, le serveur Komodo (`100.98.227.73`) ou le runner
  `ndewo-runner` servent encore à quelque chose ; sinon, retirer le runner
  (*Settings → Actions → Runners*) et les secrets `HARBOR_*`.

### ☐ 5.4 Remonter les TTL DNS — [Humain]

Une fois tout validé, TTL des 7 enregistrements : 300 → 3600.

---

## Plus tard (non bloquant)

- [ ] **Middleware** : `src/middleware.ts` lit les en-têtes au prérendu → avertissements
  `Astro.request.headers` au build. Correctif : ne pas appeler `requestHost()` quand
  `context.isPrerendered` est vrai.
- [ ] **Nettoyer la racine du dépôt** : restes de l'ancien site GitHub Pages
  (`index.html`, `404.html`, `_astro/`, `blog/`, `contact/`, `faq/`, `features/`,
  `feeds/`, `pricing/`, `process/`, `terms/`, `sitemap-*.xml`, `robots.txt`, `CNAME`,
  `.nojekyll`, `~partytown/`). À faire après la désactivation de Pages.
- [ ] **Resend** : quand les e-mails Laravel seront branchés, ajouter les enregistrements
  demandés par Resend dans la zone Hostinger (DEPLOYMENT.md, 2.3) — un seul SPF sur `@`.

---

## Terminé quand

- [ ] Les 7 hôtes répondent en HTTPS avec un certificat valide
- [ ] `https://dev.worldwise-admission.com/health` → `"env":"staging"`
- [ ] `https://worldwise-admission.com/health` → `"env":"production"` et la dernière version
- [ ] Un push sur `develop` met à jour le TEST sans intervention
- [ ] `npm run release` + approbation met à jour la PRODUCTION, crée la Release et avance `main`
- [ ] Un retour arrière par *Run workflow* sur un tag a été testé
- [ ] Port 9443 fermé, SSH par clé uniquement, clé GitHub limitée à `wwa-deploy-gate`
- [ ] Sauvegarde quotidienne en place et restauration testée
- [ ] Réglages GitHub de la phase 5.1 appliqués
