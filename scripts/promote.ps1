<#
================================================================================
 promote.ps1 — Merge develop dans main : ce qui est en TEST part en PRODUCTION

   npm run promote

 Equivalent en ligne de commande d'une Pull Request develop -> main
 ("Create a merge commit"). Ce que fait le script, dans l'ordre :
   1. verifie que ton depot local est propre et a jour
   2. verifie que main ne contient rien qui ne soit pas passe par develop
   3. te montre la liste exacte des commits qui partiraient en production
   4. te demande de taper PRODUCTION pour confirmer
   5. pose un tag de retour arriere sur l'etat actuel de la production
   6. merge develop dans main et le pousse
   7. GitHub Actions deploie la production

 Rien n'est modifie avant l'etape 4. Tu peux annuler sans risque avant.

 Compatible Windows PowerShell 5.1 (pas d'operateurs ?:, ??, ?.).
================================================================================
#>
[CmdletBinding()]
param(
    # Ne pousse pas : montre seulement ce qui serait promu.
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$DEV_BRANCH  = 'develop'
$PROD_BRANCH = 'main'
$DEV_URL     = 'https://dev.worldwise-admission.com'
$PROD_URL    = 'https://worldwise-admission.com'

# ── Helpers d'affichage ──────────────────────────────────────────────────────
function Write-Step  ([string]$m) { Write-Host ""; Write-Host "> $m" -ForegroundColor Cyan }
function Write-Ok    ([string]$m) { Write-Host "  OK  $m" -ForegroundColor Green }
function Write-Warn2 ([string]$m) { Write-Host "  !   $m" -ForegroundColor Yellow }
function Fail        ([string]$m) {
    Write-Host ""
    Write-Host "ECHEC : $m" -ForegroundColor Red
    Write-Host ""
    exit 1
}

# Lance git et renvoie stdout. Echoue proprement si git renvoie une erreur.
function Git-Out {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    $out = & git @GitArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        Fail ("la commande 'git " + ($GitArgs -join ' ') + "' a echoue :`n" + ($out -join "`n"))
    }
    return ($out -join "`n")
}

# Lance git sans faire echouer le script (pour les tests booleens).
function Git-Try {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    & git @GitArgs 2>&1 | Out-Null
    return ($LASTEXITCODE -eq 0)
}

# Meme regle que le hook pre-push et le job `guard` de deploy-production.yml :
# le commit est dans develop, ou c'est un merge de develop au contenu identique.
function Test-OnlyTestedCode ([string]$ref) {
    if (Git-Try merge-base --is-ancestor $ref "origin/$DEV_BRANCH") { return $true }
    if (-not (Git-Try rev-parse --verify --quiet "$ref^2")) { return $false }
    if (-not (Git-Try merge-base --is-ancestor "$ref^2" "origin/$DEV_BRANCH")) { return $false }
    return ((Git-Out rev-parse "$ref^{tree}") -eq (Git-Out rev-parse "$ref^2^{tree}"))
}

# ── 0. Se placer a la racine du depot ────────────────────────────────────────
$repoRoot = Git-Out rev-parse --show-toplevel
Set-Location $repoRoot

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Yellow
Write-Host "  PROMOTION  $DEV_BRANCH  ->  $PROD_BRANCH  (production)" -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Yellow
Write-Host "  depot : $repoRoot"

# ── 1. Depot propre ──────────────────────────────────────────────────────────
Write-Step "Verification de l'etat local"
$dirty = & git status --porcelain
if ($dirty) {
    Write-Host ""
    Write-Host ($dirty -join "`n") -ForegroundColor DarkGray
    Fail "tu as des modifications non commitees. Commit ou remise de cote (git stash) avant de promouvoir."
}
Write-Ok "aucune modification en attente"

Write-Step "Recuperation de l'etat du serveur"
Git-Out fetch --prune --tags origin | Out-Null
Write-Ok "origin a jour"

$localDev = & git rev-parse --verify --quiet "refs/heads/$DEV_BRANCH"
if ($localDev -and -not (Git-Try merge-base --is-ancestor $localDev "origin/$DEV_BRANCH")) {
    Write-Warn2 "ta branche locale $DEV_BRANCH contient des commits non pousses : ils ne partiront PAS en production."
}

# ── 2. Les branches existent ? ───────────────────────────────────────────────
if (-not (Git-Try rev-parse --verify --quiet "refs/remotes/origin/$DEV_BRANCH")) {
    Fail "la branche origin/$DEV_BRANCH n'existe pas. Pousse d'abord ton travail sur $DEV_BRANCH."
}

$prodExists = Git-Try rev-parse --verify --quiet "refs/remotes/origin/$PROD_BRANCH"
if (-not $prodExists) {
    Write-Warn2 "la branche origin/$PROD_BRANCH n'existe pas encore : elle sera creee a partir de $DEV_BRANCH."
}

# ── 3. Divergence ? ──────────────────────────────────────────────────────────
$fastForward = $true
if ($prodExists) {
    Write-Step "Verification de la coherence des branches"
    if (-not (Test-OnlyTestedCode "origin/$PROD_BRANCH")) {
        Write-Host ""
        Write-Host "  Commits presents sur $PROD_BRANCH mais absents de $DEV_BRANCH :" -ForegroundColor Red
        & git --no-pager log --oneline --no-merges "origin/$DEV_BRANCH..origin/$PROD_BRANCH" | ForEach-Object { Write-Host "    $_" }
        Write-Host ""
        Fail @"
$PROD_BRANCH a diverge de $DEV_BRANCH.
     Il existe du code en production qui n'est pas dans $DEV_BRANCH (un correctif
     pousse directement sur $PROD_BRANCH, ou un merge Squash/Rebase). Une promotion
     risquerait de l'ecraser.

     A faire d'abord, pour rapatrier la production dans le test :
       git checkout $DEV_BRANCH
       git merge origin/$PROD_BRANCH
       git push origin $DEV_BRANCH
     puis verifie le test et relance la promotion.
"@
    }
    $fastForward = Git-Try merge-base --is-ancestor "origin/$PROD_BRANCH" "origin/$DEV_BRANCH"
    Write-Ok "$PROD_BRANCH ne contient que du code deja passe par $DEV_BRANCH"
}

# ── 4. Ce qui partirait en production ────────────────────────────────────────
if ($prodExists) { $range = "origin/$PROD_BRANCH..origin/$DEV_BRANCH" }
else             { $range = "origin/$DEV_BRANCH" }

$commits = & git --no-pager log --oneline --no-decorate $range
if (-not $commits) {
    Write-Host ""
    Write-Ok "la production est deja a jour avec $DEV_BRANCH : rien a promouvoir."
    Write-Host ""
    exit 0
}
$commitCount = ($commits | Measure-Object).Count
$filesChanged = & git --no-pager diff --stat "origin/$PROD_BRANCH" "origin/$DEV_BRANCH" 2>$null | Select-Object -Last 1

$newSha  = Git-Out rev-parse --short "origin/$DEV_BRANCH"
if ($prodExists) { $prevSha = Git-Out rev-parse --short "origin/$PROD_BRANCH" }
else             { $prevSha = '(aucune)' }

if ($fastForward) { $mode = 'fast-forward (main pointera exactement sur le commit teste)' }
else              { $mode = 'commit de merge (contenu identique a develop)' }

Write-Host ""
Write-Host "------------------------------------------------------------------"
Write-Host "  CE QUI PARTIRAIT EN PRODUCTION" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------"
Write-Host "  production actuelle : $prevSha"
Write-Host "  version testee      : $newSha"
Write-Host "  mode                : $mode"
Write-Host "  commits             : $commitCount"
if ($filesChanged) { Write-Host "  fichiers            :$filesChanged" }
Write-Host ""
$commits | ForEach-Object { Write-Host "    $_" }
Write-Host "------------------------------------------------------------------"
Write-Host ""
Write-Host "  Verifie que tout ceci fonctionne sur le TEST avant de continuer :" -ForegroundColor Yellow
Write-Host "    $DEV_URL"
Write-Host "    https://app.dev.worldwise-admission.com/login"
Write-Host ""

if ($DryRun) {
    Write-Warn2 "-DryRun : rien n'a ete pousse."
    Write-Host ""
    exit 0
}

# ── 5. Confirmation ──────────────────────────────────────────────────────────
Write-Host "  Apres confirmation, le site LIVE vu par les candidats sera mis a jour." -ForegroundColor Red
Write-Host "  ($PROD_URL)" -ForegroundColor Red
Write-Host ""
Write-Host -NoNewline "  Tape exactement  PRODUCTION  pour confirmer (autre chose = annulation) : "
$answer = Read-Host
if ($answer -cne 'PRODUCTION') {
    Write-Host ""
    Write-Warn2 "annule. Rien n'a ete modifie."
    Write-Host ""
    exit 0
}

# ── 6. Tag de retour arriere ─────────────────────────────────────────────────
$startBranch = Git-Out rev-parse --abbrev-ref HEAD

if ($prodExists) {
    Write-Step "Marquage de l'etat actuel de la production (pour retour arriere)"
    $stamp = Get-Date -Format 'yyyyMMdd-HHmm'
    $tag   = "rollback-$stamp"
    if (Git-Try rev-parse --verify --quiet "refs/tags/$tag") {
        Write-Warn2 "le tag $tag existe deja, reutilise tel quel"
    } else {
        Git-Out tag -a $tag "origin/$PROD_BRANCH" -m "Etat de la production avant promotion de $newSha" | Out-Null
        Git-Out push origin $tag | Out-Null
        Write-Ok "tag $tag pose sur $prevSha et pousse"
    }
}

# ── 7. Merger develop dans main et pousser ───────────────────────────────────
try {
    Write-Step "Merge de $DEV_BRANCH dans $PROD_BRANCH"
    if (-not $prodExists) {
        Git-Out checkout -B $PROD_BRANCH "origin/$DEV_BRANCH" | Out-Null
    } elseif ($fastForward) {
        Git-Out checkout -B $PROD_BRANCH "origin/$PROD_BRANCH" | Out-Null
        Git-Out merge --ff-only "origin/$DEV_BRANCH" | Out-Null
    } else {
        Git-Out checkout -B $PROD_BRANCH "origin/$PROD_BRANCH" | Out-Null
        Git-Out merge --no-ff --no-edit -m "Merge $DEV_BRANCH into $PROD_BRANCH (promotion $newSha)" "origin/$DEV_BRANCH" | Out-Null
        if (-not (Test-OnlyTestedCode 'HEAD')) {
            & git reset --hard "origin/$PROD_BRANCH" 2>&1 | Out-Null
            Fail "le merge produit un contenu different de $DEV_BRANCH. Rien n'a ete pousse."
        }
    }
    $pushedSha = Git-Out rev-parse --short HEAD
    Write-Ok "$PROD_BRANCH place sur $pushedSha"

    Write-Step "Envoi vers origin/$PROD_BRANCH"
    Git-Out push origin $PROD_BRANCH | Out-Null
    Write-Ok "pousse"
}
finally {
    # Toujours revenir sur la branche de depart, meme en cas d'erreur.
    if ($startBranch -and $startBranch -ne 'HEAD') {
        & git checkout $startBranch 2>&1 | Out-Null
    }
}

# ── 8. Suite ─────────────────────────────────────────────────────────────────
$remote = Git-Out remote get-url origin
$slug = $remote -replace '^git@github\.com:', '' -replace '^https://github\.com/', '' -replace '\.git$', ''

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  OK  $PROD_BRANCH pousse sur $pushedSha" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  GitHub Actions deploie maintenant la production :"
Write-Host "    https://github.com/$slug/actions"
Write-Host ""
Write-Host "  Si l'environnement 'production' exige une approbation (Required reviewers)," -ForegroundColor Yellow
Write-Host "  ouvre le run 'Deploy - PRODUCTION (main)' > Review deployments > Approve and deploy." -ForegroundColor Yellow
Write-Host ""
Write-Host "  Une fois deploye, verifie :"
Write-Host "    $PROD_URL"
Write-Host "    https://app.worldwise-admission.com/login"
Write-Host ""
if ($prodExists) {
    Write-Host "  Retour arriere (depuis le VPS) :" -ForegroundColor DarkGray
    Write-Host "    sudo /usr/local/sbin/wwa-deploy production $prevSha" -ForegroundColor DarkGray
    Write-Host ""
}
