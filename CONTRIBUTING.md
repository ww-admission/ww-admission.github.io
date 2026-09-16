# WWA — Processus de développement & déploiement

> Agence : **Qatorze** | Projet : **WorldWise Admission**
>
> Le détail pas à pas (commandes, écrans GitHub, correctifs, retour arrière) est dans
> **[docs/BRANCHING.md](docs/BRANCHING.md)**.

---

## Règles fondamentales

1. **On ne touche jamais `main` à la main** : c'est le reflet exact de la production,
   avancé automatiquement à chaque mise en ligne.
2. **La production ne reçoit que des versions** `vMAJEUR.MINEUR.PATCH`, approuvées dans
   GitHub.
3. **Tout travail passe par `develop`** (et donc par le TEST), sauf un correctif urgent
   de production (branche `hotfix/*`).

---

## Branches

| Branche | Rôle |
|---|---|
| `main` | Version en ligne — jamais de commit direct |
| `develop` | Intégration — chaque push part sur le TEST |
| `feature/*` | Nouvelle fonctionnalité → PR vers `develop` |
| `fix/*` | Correction de bug → PR vers `develop` |
| `chore/*` | Maintenance, dépendances, CI → PR vers `develop` |
| `hotfix/*` | Correctif urgent de production, créé depuis `main` |

---

## Workflow développeur

### 1. Créer une branche depuis `develop`

```bash
git checkout develop
git pull origin develop
git checkout -b feature/nom-de-la-fonctionnalite
```

### 2. Développer et committer

Format **Conventional Commits** :

```
feat(scope): description courte
fix(scope): description courte
chore(scope): description courte
```

Exemples :
```bash
git commit -m "feat(auth): add JWT refresh token endpoint"
git commit -m "fix(frontend): correct login redirect on mobile"
git commit -m "chore(ci): update build check"
```

### 3. Pousser et ouvrir une Pull Request vers `develop`

```bash
git push origin feature/nom-de-la-fonctionnalite
```

- Base : `develop`
- Décrire le changement et les tests effectués
- La CI **CI - build** doit être verte (typage, build, contrôle du bundle)
- Merge via **Squash and Merge** pour garder un historique propre

> Petite correction évidente, ou urgence sur le TEST : un commit direct sur `develop`
> est accepté. Le TEST se met à jour dans la foulée.

---

## Ce qui se passe après un merge (ou un push) sur `develop`

Le workflow **TEST - deploiement** met à jour automatiquement :

- https://dev.worldwise-admission.com
- https://app.dev.worldwise-admission.com

Il se connecte au VPS OVH, construit la nouvelle version à côté de celle en ligne,
bascule, puis vérifie que `/health` annonce bien le commit poussé et que le site de test
reste non indexable. Chaque déploiement apparaît dans **Deployments → staging**.

---

## Mise en production

### Prérequis

- Tout ce qui doit partir est mergé sur `develop`
- **TEST - deploiement** est vert sur le dernier commit
- Les vérifications manuelles sont faites sur `dev.worldwise-admission.com`

### 1. Publier la version

```powershell
npm run release:dry     # ce qui partirait
npm run release         # choisir patch / minor / major, puis retaper le numéro
```

Le script crée et pousse le tag (ex. `v1.4.0`).

> **Convention** : toujours `vMAJEUR.MINEUR.PATCH`. Jamais `latest`, jamais supprimer
> ni déplacer un tag existant (le hook `pre-push` et les règles GitHub l'interdisent).

### 2. Approuver dans GitHub

**Actions → PRODUCTION ← v1.4.0** : le résumé liste les changements, la version
remplacée et le passage par le TEST.
**Review deployments → production → Approve and deploy**
(reviewers : `GRIMDERVALD`, `Steeve36`).

### 3. Ce qui se passe ensuite, automatiquement

```
build vérifié → [approbation] → déploiement sur le VPS
  (build à côté + bascule, sauvegarde de la base avant migrations)
→ vérification /health (version) + SEO
→ Release GitHub v1.4.0 (archive) → main = v1.4.0
```

### 4. Vérifier

```bash
curl https://worldwise-admission.com/health     # "version":"v1.4.0"
```

---

## Correctif urgent en production

```powershell
git fetch origin
git checkout -b hotfix/description origin/main
# ... correctif ...
git commit -am "fix: description"
git push -u origin hotfix/description
npm run release:hotfix      # v1.4.1, puis approbation
```

Le correctif est **reporté automatiquement dans `develop`** après la mise en ligne.

## Revenir à une version précédente

**Actions → PRODUCTION - mise en ligne d'une version → Run workflow →
Use workflow from : tag `v1.3.0`** → approbation.

---

## Règles à ne jamais enfreindre

- Ne jamais committer ni pousser directement sur `main`
- Ne jamais supprimer ni déplacer un tag de version
- Ne jamais pousser de secrets, tokens ou `.env` dans le repo
- Ne jamais approuver une mise en production sans avoir lu le résumé du run
- La CI doit être verte avant tout merge sur `develop`

---

## Environnements

| Environnement | URL | Source | Déploiement |
|---|---|---|---|
| Test | `https://dev.worldwise-admission.com` | branche `develop` | Automatique à chaque push |
| Production | `https://worldwise-admission.com` | tag `v*.*.*` | `npm run release` + approbation GitHub |

---

## Historique

Jusqu'à `v1.0.1` (juin 2026), les versions étaient construites en images Docker,
poussées vers Harbor (via Tailscale, runner `ndewo`) puis déployées par Komodo. Ce
pipeline (`.github/workflows/ci.yml`) est conservé en déclenchement manuel
uniquement ; les images `www_prod/*:1.0.0` et `1.0.1` restent dans Harbor.
