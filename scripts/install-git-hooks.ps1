<#
================================================================================
 install-git-hooks.ps1 — Active les garde-fous git locaux

   npm run hooks:install

 Configure `core.hooksPath` sur scripts/git-hooks, ce qui active le hook
 pre-push. Ce hook refuse tout `git push` vers main (production) qui
 contiendrait du code absent de origin/develop (donc non teste).

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
Write-Host '    Effet : un "git push origin main" est refuse s il contient du code'
Write-Host '            absent de develop. Merge develop -> main (PR ou npm run promote).'
Write-Host ""
Write-Host "    Verifier :  git config core.hooksPath"
Write-Host "    Desactiver: git config --unset core.hooksPath"
Write-Host ""
