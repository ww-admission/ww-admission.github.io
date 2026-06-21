# Sécurité — Image Docker frontend (Astro + Node standalone)

## 1. Contexte

`Dockerfile.astro` construit l'image de production sur `node:22-alpine`, en
deux étapes (build complet, puis runtime avec `npm ci --omit=dev` + `dist/`
seulement). Un scan de vulnérabilités a été exécuté avant la mise en
production, suivi d'une analyse manuelle approfondie sur les CVE touchant le
framework réellement exécuté (Astro), déclenchée par un signalement externe
(rapport Aikido Security sur un mécanisme SSRF).

## 2. Résultat du scan

```
MSYS_NO_PATHCONV=1 docker run --rm -v /var/run/docker.sock:/var/run/docker.sock \
  aquasec/trivy image --severity HIGH,CRITICAL wwa-astro-final
```

| Cible | Vulnérabilités |
|---|---|
| OS Alpine 3.24.1 (paquets système) | 0 |
| Node.js (`node-pkg`, dépendances npm) | 41 (41 HIGH, 0 CRITICAL) |
| `node_modules/@esbuild/linux-x64/bin/esbuild` (binaire Go) | 15 (14 HIGH, 1 CRITICAL) |

## 3. CVE retenus comme pertinents (surface applicative réelle)

| CVE | Package | Sévérité | Fix amont | Analyse |
|---|---|---|---|---|
| CVE-2026-50146 | `astro` 5.18.2 | HIGH | 6.3.3 | XSS réfléchie via nom de slot non échappé. **Non exploitable ici** : vérifié que tout `slot=` dans `src/**/*.astro` est un littéral statique écrit par le développeur — aucun nom de slot n'est jamais construit depuis une donnée de requête. |
| CVE-2026-54299 | `astro` 5.18.2 | HIGH | 6.4.6 | SSRF via header `Host` non sanitisé dans le fetch interne de la page d'erreur prerendered (mécanisme documenté par Aikido Security sous CVE-2026-25545, même famille). **Non exploitable ici** — voir analyse détaillée section 4. |

`astro` est le seul package du scan qui tourne réellement dans le process de
production (confirmé par grep sur `dist/server/` — voir section 5). C'est
pourquoi ces 2 CVE ont reçu une analyse manuelle approfondie plutôt qu'un
simple classement "bruit vs pertinent".

## 4. Analyse détaillée CVE-2026-54299 (SSRF Host header)

**Mécanisme du code** (`node_modules/astro/dist/core/app/index.js:459-470`) :
pour une route `/404` ou `/500` marquée `prerender`, Astro construit
`statusURL` à partir de `request.url` puis appelle
`prerenderedErrorPageFetch(statusURL.toString())` — une requête HTTP interne.

`request.url` est lui-même construit dans
`node_modules/astro/dist/core/app/node.js:54-67` à partir du header `Host`
(`untrustedHostname`), passé à travers `validateHost()` /
`validateForwardedHeaders()` (`validate-headers.js`).

**Le verrou de sécurité** (`validate-headers.js:25`) :
```js
function validateHost(host, protocol, allowedDomains) {
  if (!host || host.length === 0) return void 0;
  if (!allowedDomains || allowedDomains.length === 0) return void 0;
  ...
```
Sans `allowedDomains` configuré (paramètre du manifeste Astro, jamais utilisé
dans ce projet — `grep -rn "allowedDomains" astro.config.mjs src/` ne retourne
rien), **toute valeur de `Host` est rejetée**, et `node.js` retombe sur
`hostname = "localhost"` en dur (ligne 67 : `validated.host ?? validatedHostname ?? "localhost"`).
Le `statusURL` de la fetch interne hérite donc systématiquement d'une origine
sûre, jamais de l'hôte fourni par le client.

**Test en conditions réelles** (image `wwa-astro-final`, container lancé,
requêtes contre une route inexistante pour déclencher le rendu 404 prerendered) :

```
curl -H "Host: attacker-controlled.invalid:9999" http://localhost:4322/route-inexistante
curl -H "Host: localhost:4322" -H "X-Forwarded-Host: attacker-controlled.invalid" \
     -H "X-Forwarded-Proto: https" http://localhost:4322/route-inexistante
```

Les deux requêtes retournent instantanément notre propre page 404
(`<link rel="canonical" href="https://worldwise-admission.com/404/">`, l'URL
configurée dans `astro.config.mjs`) — aucune tentative de connexion sortante
vers l'hôte injecté, aucun délai, aucune erreur réseau.

`@astrojs/node` est en version 9.5.5, au-delà de la version 9.5.3 mentionnée
comme patchée pour ce type de mécanisme côté adaptateur.

**Conclusion** : le vecteur SSRF nécessite que le déploiement configure
explicitement `allowedDomains` avec un pattern permissif (fonctionnalité pour
l'hébergement multi-domaines) — fonctionnalité que nous n'utilisons pas.
Risque non exploitable en l'état.

## 5. CVE écartés (bruit, hors surface applicative)

Vérifié par grep sur le bundle compilé (`dist/server/`) : aucune référence à
`axios`, `vite`, `rollup`, `svgo`, `tar`, `ws`, `undici`, `lodash`,
`fast-uri`, `form-data`, `minimatch`, `picomatch`, ou au binaire `esbuild`.
Ces packages sont présents dans `node_modules` après `npm ci --omit=dev`
uniquement parce qu'ils sont déclarés comme `dependencies` (et non
`devDependencies`) par le package `astro` lui-même (sa propre chaîne d'outils
de build : Vite/Rollup/esbuild/SVGO) — jamais chargés par le process qui sert
le trafic en production.

| CVE(s) | Package | Pourquoi ignorable |
|---|---|---|
| 12 CVE (axios, fast-uri, form-data, lodash, minimatch, picomatch, rollup, svgo, tar, undici, vite, ws) | `node-pkg` (41 findings au total) | Outillage de build d'Astro (Vite/Rollup/esbuild), jamais exécuté par `dist/server/entry.mjs`. |
| 15 CVE (dont 1 CRITICAL, Go stdlib `crypto/tls`) | binaire `esbuild` (gobinary) | esbuild est un bundler de build-time, jamais invoqué à l'exécution — confirmé par le même grep. |

## 6. Surveillance continue

Assurée nativement par Harbor (scanner Trivy intégré, scan automatique à chaque
push d'image + rescan planifiable sur les images existantes). Pas de tooling CI
additionnel nécessaire pour cette tâche.

## 7. Recommandation à moyen terme

Planifier l'upgrade `astro` vers 6.4.6+ (hors scope de cette tâche — bump de
version majeure, à valider séparément pour régressions). Justification : même
si le risque actuel est nul, dépendre du comportement par défaut de
`validateHost` (plutôt que d'un correctif amont) comme unique frontière de
sécurité contre ce vecteur n'est pas une posture à conserver indéfiniment.

## Sources

- Scan exécuté le 2026-06-21 avec `aquasec/trivy` (image `latest` au moment du scan).
- Image scannée : `wwa-astro-final`, buildée depuis `Dockerfile.astro` sur base `node:22-alpine`.
- Analyse SSRF déclenchée par un rapport externe Aikido Security (CVE-2026-25545,
  même famille de vulnérabilité que CVE-2026-54299).
- Détail des CVE : https://avd.aquasec.com/nvd/{cve-id} (remplacer `{cve-id}` par
  l'identifiant, ex. https://avd.aquasec.com/nvd/cve-2026-54299).
