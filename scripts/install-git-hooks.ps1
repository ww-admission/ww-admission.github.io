<#
================================================================================
 install-git-hooks.ps1 — Active les garde-fous git locaux

   npm run hooks:install

 Configure `core.hooksPath` sur scripts/git-hooks, ce qui active le hook
 pre-push. Ce hook refuse tout `git push` vers la branche PROD qui ne passe
 pas par scripts/promote.ps1.

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
Write-Host '    Effet : un "git push origin PROD" tape a la main est desormais refuse.'
Write-Host '            Seul  npm run promote  peut mettre a jour la production.'
Write-Host ""
Write-Host "    Verifier :  git config core.hooksPath"
Write-Host "    Desactiver: git config --unset core.hooksPath"
Write-Host ""
