<#
================================================================================
 install-git-hooks.ps1 — Active les garde-fous git locaux

   npm run hooks:install

 Configure `core.hooksPath` sur scripts/git-hooks, ce qui active le hook
 pre-push. Ce hook refuse un push direct sur main (avancee par le workflow
 PRODUCTION) et la suppression ou le deplacement d'un tag de version vX.Y.Z.

 A lancer une seule fois par clone du depot (la config est locale au clone,
 elle n'est pas versionnee).
================================================================================
#>
$ErrorActionPreference = 'Stop'

$repoRoot = (& git rev-parse --show-toplevel 2>&1)
if ($LASTEXITCODE -ne 0) {
    Write-Host "ECHEC : ce dossier n'est pas un depot git." -ForegroundColor Red
    exit 1
}
Set-Location $repoRoot

& git config core.hooksPath scripts/git-hooks
if ($LASTEXITCODE -ne 0) {
    Write-Host "ECHEC : impossible d'ecrire la configuration git." -ForegroundColor Red
    exit 1
}

$current = (& git config core.hooksPath)

Write-Host ""
Write-Host "OK  garde-fous git actives" -ForegroundColor Green
Write-Host "    core.hooksPath = $current"
Write-Host ""
Write-Host '    Effet : push direct sur main refuse, tags de version vX.Y.Z intouchables.'
Write-Host '            Production : npm run release  (ou release:hotfix).'
Write-Host ""
Write-Host "    Verifier :  git config core.hooksPath"
Write-Host "    Desactiver: git config --unset core.hooksPath"
Write-Host ""
