<#
.SYNOPSIS
    Build Smart Typography FR et le copie dans le dossier plugins du vault Obsidian.

.PARAMETER VaultPluginPath
    Chemin vers le dossier du plugin dans le vault. Par défaut, le vault
    "journal" synchronisé via Google Drive.

.NOTES
    Le dossier par défaut garde le nom du plugin d'origine
    (obsidian-smart-typography) alors que l'id du manifest est
    smart-typography-fr : c'est là qu'Obsidian a déjà enregistré le plugin et
    ses réglages (data.json). Un second dossier portant le même id ferait
    charger deux copies concurrentes.
#>
param(
	[string]$VaultPluginPath = "G:\Mon Drive\txt\journal\.obsidian\plugins\obsidian-smart-typography"
)

$ErrorActionPreference = "Stop"

# Une destination relative s'entend depuis là où l'utilisateur a lancé le script,
# pas depuis le dépôt : elle doit être résolue avant de changer de répertoire.
$VaultPluginPath = $ExecutionContext.SessionState.Path.GetUnresolvedProviderPathFromPSPath($VaultPluginPath)

# Le script doit pouvoir être appelé par son chemin absolu depuis n'importe où :
# sans cela, npm construirait le projet du répertoire courant, et Copy-Item y
# chercherait les fichiers à déployer.
Push-Location $PSScriptRoot
try {
	npm run build

	# $ErrorActionPreference ne couvre pas les commandes natives : sans ce test,
	# un build cassé laisserait déployer le main.js de la fois précédente, en
	# annonçant un succès.
	if ($LASTEXITCODE -ne 0) {
		throw "npm run build a échoué (code $LASTEXITCODE) : rien n'a été déployé."
	}

	if (-not (Test-Path -LiteralPath $VaultPluginPath)) {
		New-Item -ItemType Directory -Path $VaultPluginPath -Force | Out-Null
	}

	# Jamais data.json : ce sont les réglages du vault.
	Copy-Item main.js, manifest.json -Destination $VaultPluginPath -Force
}
finally {
	Pop-Location
}

Write-Host "Plugin déployé dans $VaultPluginPath"
Write-Host "Recharge Obsidian (palette de commandes -> Reload app without saving) pour voir les changements."
