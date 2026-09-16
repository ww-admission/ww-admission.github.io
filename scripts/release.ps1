<#
================================================================================
 release.ps1 — Publie une version en PRODUCTION (tag vX.Y.Z)

   npm run release            nouvelle version depuis develop (ce qui est en TEST)
   npm run release:hotfix     correctif urgent depuis la branche hotfix/* courante
   npm run release:dry        montre ce qui partirait, sans rien faire

 Ce que fait le script, dans l'ordre :
   1. verifie que ton depot est propre et a jour
   2. verifie que la version est construite sur la production actuelle (main)
   3. montre la liste exacte des changements et si le TEST sert bien ce code
   4. propose le numero de version suivant (patch / minor / major)
   5. te demande de retaper ce numero pour confirmer
   6. cree le tag et le pousse -> GitHub Actions attend l'approbation puis deploie

 Rien n'est modifie avant l'etape 5. Tu peux annuler sans risque avant.

 Compatible Windows PowerShell 5.1 (pas d'operateurs ?:, ??, ?.).
================================================================================
#>
[CmdletBinding()]
param(
    # Publie la branche courante (hotfix/*) au lieu de develop.
    [switch]$Hotfix,
    # Type de version. Sans parametre : patch pour un hotfix, sinon question.
    [ValidateSet('patch', 'minor', 'major')]
    [string]$Bump,
    # Ne cree rien : montre seulement ce qui partirait.
    [switch]$DryRun
)

$ErrorActionPreference = 'Stop'

$DEV_BRANCH  = 'develop'
$PROD_BRANCH = 'main'
$DEV_URL     = 'https://dev.worldwise-admission.com'
$PROD_URL    = 'https://worldwise-admission.com'

function Write-Step  ([string]$m) { Write-Host ""; Write-Host "> $m" -ForegroundColor Cyan }
function Write-Ok    ([string]$m) { Write-Host "  OK  $m" -ForegroundColor Green }
function Write-Warn2 ([string]$m) { Write-Host "  !   $m" -ForegroundColor Yellow }
function Fail        ([string]$m) {
    Write-Host ""
    Write-Host "ECHEC : $m" -ForegroundColor Red
    Write-Host ""
    exit 1
}

function Git-Out {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    $out = & git @GitArgs 2>&1
    if ($LASTEXITCODE -ne 0) {
        Fail ("la commande 'git " + ($GitArgs -join ' ') + "' a echoue :`n" + ($out -join "`n"))
    }
    return ($out -join "`n")
}

function Git-Try {
    param([Parameter(ValueFromRemainingArguments = $true)][string[]]$GitArgs)
    & git @GitArgs 2>&1 | Out-Null
    return ($LASTEXITCODE -eq 0)
}

# ── 0. Racine du depot ───────────────────────────────────────────────────────
$repoRoot = Git-Out rev-parse --show-toplevel
Set-Location $repoRoot

if ($Hotfix) { $title = 'HOTFIX -> PRODUCTION' } else { $title = 'NOUVELLE VERSION  develop -> PRODUCTION' }
Write-Host ""
Write-Host "==================================================================" -ForegroundColor Yellow
Write-Host "  $title" -ForegroundColor Yellow
Write-Host "==================================================================" -ForegroundColor Yellow

# ── 1. Depot propre et a jour ────────────────────────────────────────────────
Write-Step "Verification de l'etat local"
$dirty = & git status --porcelain
if ($dirty) {
    Write-Host ($dirty -join "`n") -ForegroundColor DarkGray
    Fail "modifications non commitees. Commit ou git stash avant de publier."
}
Git-Out fetch --prune --tags --force origin | Out-Null
Write-Ok "depot propre, origin a jour"

if (-not (Git-Try rev-parse --verify --quiet "refs/remotes/origin/$PROD_BRANCH")) {
    Fail "origin/$PROD_BRANCH n'existe pas."
}

# ── 2. Source de la version ──────────────────────────────────────────────────
if ($Hotfix) {
    $branch = Git-Out rev-parse --abbrev-ref HEAD
    if ($branch -eq 'HEAD' -or $branch -eq $DEV_BRANCH -or $branch -eq $PROD_BRANCH) {
        Fail @"
un hotfix se publie depuis une branche dediee, pas depuis '$branch'.
       git checkout -b hotfix/description origin/$PROD_BRANCH
       ... correctif, commit ...
       git push -u origin hotfix/description
       npm run release:hotfix
"@
    }
    if (-not (Git-Try rev-parse --verify --quiet "refs/remotes/origin/$branch")) {
        Fail "la branche $branch n'est pas sur GitHub : git push -u origin $branch"
    }
    if ((Git-Out rev-parse HEAD) -ne (Git-Out rev-parse "origin/$branch")) {
        Fail "ta branche $branch differe de origin/$branch : pousse d'abord (git push)."
    }
    $sourceRef  = "origin/$branch"
    $sourceName = $branch
} else {
    if (-not (Git-Try rev-parse --verify --quiet "refs/remotes/origin/$DEV_BRANCH")) {
        Fail "origin/$DEV_BRANCH n'existe pas."
    }
    $localDev = & git rev-parse --verify --quiet "refs/heads/$DEV_BRANCH"
    if ($localDev -and ($localDev -ne (Git-Out rev-parse "origin/$DEV_BRANCH"))) {
        Write-Warn2 "ta branche locale $DEV_BRANCH differe de GitHub : seul origin/$DEV_BRANCH est publie."
    }
    $sourceRef  = "origin/$DEV_BRANCH"
    $sourceName = $DEV_BRANCH
}

$sha      = Git-Out rev-parse "$sourceRef^{commit}"
$shortSha = Git-Out rev-parse --short $sha

# ── 3. Construite sur la production actuelle ? ───────────────────────────────
Write-Step "Coherence avec la production (main)"
if ($sha -eq (Git-Out rev-parse "origin/$PROD_BRANCH")) {
    Write-Ok "$sourceName est identique a la production : rien de nouveau a publier."
    exit 0
}
if (-not (Git-Try merge-base --is-ancestor "origin/$PROD_BRANCH" $sha)) {
    Write-Host ""
    Write-Host "  En production (main) mais absent de $sourceName :" -ForegroundColor Red
    & git --no-pager log --oneline --no-merges "$sha..origin/$PROD_BRANCH" | ForEach-Object { Write-Host "    $_" }
    if ($Hotfix) {
        Fail "la branche $sourceName ne part pas de la production. Recree-la depuis origin/$PROD_BRANCH."
    }
    Fail @"
un correctif en production n'a pas ete reporte dans $DEV_BRANCH.
       git checkout $DEV_BRANCH; git pull
       git merge origin/$PROD_BRANCH
       git push
     puis relance npm run release.
"@
}
Write-Ok "$sourceName est construit sur la production actuelle"

$already = & git tag --points-at $sha | Where-Object { $_ -match '^v\d+\.\d+\.\d+$' }
if ($already) {
    Fail "ce commit est deja publie sous $($already -join ', '). Pour le redeployer : Actions > PRODUCTION > Run workflow > tag."
}

# ── 4. Versions ──────────────────────────────────────────────────────────────
$allVersions = & git tag -l 'v*' --sort=-v:refname | Where-Object { $_ -match '^v\d+\.\d+\.\d+$' }
if ($allVersions) { $latest = @($allVersions)[0] } else { $latest = 'v0.0.0' }
$prodVersion = & git describe --tags --abbrev=0 --match 'v[0-9]*.[0-9]*.[0-9]*' "origin/$PROD_BRANCH" 2>$null
if (-not $prodVersion) { $prodVersion = '(aucune)' }

$commits = & git --no-pager log --oneline --no-merges --no-decorate "origin/$PROD_BRANCH..$sha"
$commitCount = ($commits | Measure-Object).Count
$filesChanged = & git --no-pager diff --stat "origin/$PROD_BRANCH" $sha 2>$null | Select-Object -Last 1

# Le TEST sert-il ce commit ?
$testStatus = ''
try {
    $health = Invoke-RestMethod -Uri "$DEV_URL/health" -TimeoutSec 10
    if ($health.release -and $sha.StartsWith([string]$health.release)) {
        $testStatus = "OK : ce commit est en ligne sur le TEST"
    } else {
        $testStatus = "le TEST sert $($health.release), pas $shortSha"
    }
} catch {
    $testStatus = "TEST injoignable ($DEV_URL/health)"
}

Write-Host ""
Write-Host "------------------------------------------------------------------"
Write-Host "  CE QUI PARTIRAIT EN PRODUCTION" -ForegroundColor Yellow
Write-Host "------------------------------------------------------------------"
Write-Host "  source              : $sourceName ($shortSha)"
Write-Host "  en production       : $prodVersion"
Write-Host "  derniere version    : $latest"
Write-Host "  commits             : $commitCount"
if ($filesChanged) { Write-Host "  fichiers            :$filesChanged" }
if ($testStatus.StartsWith('OK')) {
    Write-Host "  TEST                : $testStatus" -ForegroundColor Green
} else {
    Write-Host "  TEST                : $testStatus" -ForegroundColor Yellow
}
Write-Host ""
$commits | Select-Object -First 40 | ForEach-Object { Write-Host "    $_" }
if ($commitCount -gt 40) { Write-Host "    ... et $($commitCount - 40) autres" }
Write-Host "------------------------------------------------------------------"

if (-not $Bump) {
    if ($Hotfix) {
        $Bump = 'patch'
    } elseif ($DryRun) {
        $Bump = 'minor'
    } else {
        Write-Host ""
        Write-Host "  Type de version :"
        Write-Host "    1  patch   corrections uniquement"
        Write-Host "    2  minor   nouvelles fonctionnalites (le plus courant)"
        Write-Host "    3  major   changement majeur / incompatible"
        Write-Host -NoNewline "  Choix [1/2/3] : "
        $choice = Read-Host
        switch ($choice) {
            '1' { $Bump = 'patch' }
            '2' { $Bump = 'minor' }
            '3' { $Bump = 'major' }
            default { Write-Warn2 "annule. Rien n'a ete modifie."; exit 0 }
        }
    }
}

$parts = $latest.TrimStart('v').Split('.') | ForEach-Object { [int]$_ }
switch ($Bump) {
    'major' { $version = "v$($parts[0] + 1).0.0" }
    'minor' { $version = "v$($parts[0]).$($parts[1] + 1).0" }
    'patch' { $version = "v$($parts[0]).$($parts[1]).$($parts[2] + 1)" }
}
if (Git-Try rev-parse --verify --quiet "refs/tags/$version") {
    Fail "le tag $version existe deja."
}

Write-Host ""
Write-Host "  Nouvelle version    : $version  ($Bump)" -ForegroundColor Yellow

if ($DryRun) {
    Write-Host ""
    Write-Warn2 "-DryRun : rien n'a ete cree ni pousse."
    Write-Host ""
    exit 0
}

if (-not $testStatus.StartsWith('OK')) {
    Write-Host ""
    Write-Warn2 "ce code n'est pas verifie sur le TEST ($testStatus)."
    if ($Hotfix) {
        Write-Warn2 "pour le tester d'abord : Actions > TEST - deploiement > Run workflow > branche $sourceName"
    }
}

# ── 5. Confirmation ──────────────────────────────────────────────────────────
Write-Host ""
Write-Host "  Apres confirmation, $version partira en PRODUCTION des son approbation dans GitHub." -ForegroundColor Red
Write-Host "  ($PROD_URL)" -ForegroundColor Red
Write-Host ""
Write-Host -NoNewline "  Retape exactement  $version  pour confirmer (autre chose = annulation) : "
$answer = Read-Host
if ($answer -cne $version) {
    Write-Host ""
    Write-Warn2 "annule. Rien n'a ete modifie."
    Write-Host ""
    exit 0
}

# ── 6. Tag et envoi ──────────────────────────────────────────────────────────
Write-Step "Creation du tag $version"
$msgFile = [System.IO.Path]::GetTempFileName()
try {
    $lines = @("$version", "", "Source : $sourceName ($shortSha)", "Precedente en production : $prodVersion", "")
    $lines += $commits | ForEach-Object { "- $_" }
    [System.IO.File]::WriteAllLines($msgFile, [string[]]$lines, (New-Object System.Text.UTF8Encoding($false)))
    Git-Out tag -a $version $sha -F $msgFile | Out-Null
} finally {
    Remove-Item $msgFile -ErrorAction SilentlyContinue
}
Write-Ok "tag $version pose sur $shortSha"

Write-Step "Envoi du tag vers GitHub"
Git-Out push origin "refs/tags/$version" | Out-Null
Write-Ok "pousse"

$remote = Git-Out remote get-url origin
$slug = $remote -replace '^git@github\.com:', '' -replace '^https://github\.com/', '' -replace '\.git$', ''

Write-Host ""
Write-Host "==================================================================" -ForegroundColor Green
Write-Host "  OK  $version envoyee" -ForegroundColor Green
Write-Host "==================================================================" -ForegroundColor Green
Write-Host ""
Write-Host "  1. Ouvre le run 'PRODUCTION <- $version' :"
Write-Host "       https://github.com/$slug/actions/workflows/deploy-production.yml"
Write-Host "  2. Relis le resume (changements, passage par le TEST)"
Write-Host "  3. Review deployments > production > Approve and deploy"
Write-Host ""
Write-Host "  Une fois en ligne : $PROD_URL/health doit afficher `"version`":`"$version`""
Write-Host "  Archive : https://github.com/$slug/releases/tag/$version"
Write-Host ""
