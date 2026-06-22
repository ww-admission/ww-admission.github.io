# WWA — Processus de développement & déploiement

> Agence : **Qatorze** | Projet : **WorldWise Admission**

---

## Règle fondamentale

**Aucune modification directe sur `main` ou `develop`.**
Tout travail passe par une branche de fonctionnalité, une Pull Request, et une revue avant merge.

---

## Branches

| Branche | Rôle |
|---|---|
| `main` | Miroir de la production — ne reçoit jamais de commit direct |
| `develop` | Branche d'intégration — reçoit les merges des branches de fonctionnalité |
| `feature/*` | Nouvelle fonctionnalité |
| `fix/*` | Correction de bug |
| `chore/*` | Maintenance, dépendances, CI |

---

## Workflow développeur

### 1. Créer une branche depuis `develop`

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nom-de-la-fonctionnalite
```

### 2. Développer et committer

Utiliser le format **Conventional Commits** :

```
feat(scope): description courte
fix(scope): description courte
chore(scope): description courte
```

Exemples :
```bash
git commit -m "feat(auth): add JWT refresh token endpoint"
git commit -m "fix(frontend): correct login redirect on mobile"
git commit -m "chore(ci): update trivy scan threshold"
```

### 3. Pousser la branche

```bash
git push origin feature/nom-de-la-fonctionnalite
```

### 4. Ouvrir une Pull Request vers `develop`

- Base : `develop`
- Remplir le template de PR (description, tests effectués)
- Assigner un reviewer

### 5. Revue et merge

- Au moins **1 approbation** requise
- La CI doit être **verte** (build, test, scan Trivy informatif)
- Merge via **Squash and Merge** pour garder un historique propre

---

## Ce qui se passe automatiquement après un merge sur `develop`

La CI GitHub Actions se déclenche et exécute dans l'ordre :

```
hadolint → secret-scan → build → test → scan Trivy (informatif) → push Harbor wwa_dev
```

Les images sont taguées `dev` et `dev-sha-<8chars>` dans Harbor.

**Komodo redéploie automatiquement** sur `www-admission` en polling le tag `dev`.

L'environnement de développement `dev.worldwise-admission.com` est mis à jour automatiquement.

---

## Déploiement en production

### Prérequis

- Toutes les fonctionnalités de la release sont mergées sur `develop`
- La CI est verte sur le dernier commit de `develop`
- Les tests manuels sont validés sur `dev.worldwise-admission.com`
- Un second reviewer est disponible pour approuver le gate GitHub

### 1. Créer un tag semver

```bash
git checkout develop
git pull origin develop
git tag v1.2.0
git push origin v1.2.0
```

> **Convention** : toujours `vMAJEUR.MINEUR.PATCH` — jamais `latest`, jamais supprimer un tag existant.

### 2. La CI prod se déclenche automatiquement

```
hadolint → secret-scan → build → test → scan Trivy (BLOQUANT sur CRITICAL/HIGH fixables)
→ [GATE MANUEL — approbation GitHub requise]
→ push Harbor www_prod (tag : 1.2.0)
```

### 3. Approuver le gate manuel

Dans GitHub → Actions → run du tag → bouton **Review deployments** → **Approve**.

> Le reviewer ne peut pas être la même personne que celle qui a poussé le tag (`Prevent self-review` activé).

### 4. Déployer via Komodo

Dans Komodo UI `http://100.98.227.73:9120` :
- Stack `wwa-prod` → mettre à jour `IMAGE_TAG` → valeur du nouveau tag (ex: `1.2.0`)
- Cliquer **Deploy**

### 5. Vérifications post-déploiement

```bash
# Sur www-admission
docker ps --filter name=wwa-prod
docker exec wwa-prod-api-1 php artisan migrate --force
curl https://worldwise-admission.com/up
```

---

## Règles à ne jamais enfreindre

- Ne jamais committer directement sur `develop` ou `main`
- Ne jamais supprimer un tag de production
- Ne jamais pousser de secrets, tokens ou `.env` dans le repo
- Ne jamais utiliser le tag `latest` en production
- La CI doit être verte avant tout merge sur `develop`

---

## Environnements

| Environnement | URL | Branche | Déploiement |
|---|---|---|---|
| Développement | `https://dev.worldwise-admission.com` | `develop` | Automatique via Komodo polling |
| Production | `https://worldwise-admission.com` | tag `v*.*.*` | Manuel via gate GitHub + Komodo |
