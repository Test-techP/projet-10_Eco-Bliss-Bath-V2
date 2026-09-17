[CmdletBinding()]
param()

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

$projectRoot = (
    Resolve-Path (Join-Path $PSScriptRoot "..")
).Path

$composeFile = Join-Path $projectRoot "docker-compose.yml"
$seedFile = Join-Path $projectRoot "data\diay0794_ebb.sql"
$databaseDirectory = Join-Path $projectRoot "mysql"
$backupRoot = Join-Path $projectRoot ".test-db-backups"
$backupDirectory = $null

if (-not (Test-Path -LiteralPath $composeFile -PathType Leaf)) {
    throw "Fichier docker-compose.yml introuvable : $composeFile"
}

if (-not (Test-Path -LiteralPath $seedFile -PathType Leaf)) {
    throw "Fichier SQL initial introuvable : $seedFile"
}

if ((Split-Path $databaseDirectory -Leaf) -ne "mysql") {
    throw "Répertoire de base de données inattendu : $databaseDirectory"
}

Push-Location $projectRoot

try {
    Write-Host "Arrêt de la base et du backend..."
    docker compose -f $composeFile down

    if ($LASTEXITCODE -ne 0) {
        throw "Impossible d'arrêter les services Docker."
    }

    if (Test-Path -LiteralPath $databaseDirectory) {
        New-Item `
            -ItemType Directory `
            -Path $backupRoot `
            -Force | Out-Null

        $timestamp = Get-Date -Format "yyyyMMdd-HHmmssfff"
        $backupDirectory = Join-Path `
            $backupRoot `
            "mysql-$timestamp"

        Write-Host "Sauvegarde de la base actuelle :"
        Write-Host $backupDirectory

        Move-Item `
            -LiteralPath $databaseDirectory `
            -Destination $backupDirectory
    }

    Write-Host "Recréation de la base depuis les données initiales..."
    docker compose -f $composeFile up -d --wait

    if ($LASTEXITCODE -ne 0) {
        throw "La recréation des services Docker a échoué."
    }

    Write-Host "État des services :"
    docker compose -f $composeFile ps

    if ($LASTEXITCODE -ne 0) {
        throw "Impossible de vérifier l'état des services Docker."
    }

    Write-Host "Réinitialisation terminée avec succès."
}
catch {
    if ($null -ne $backupDirectory) {
        Write-Warning "La base précédente reste disponible ici :"
        Write-Warning $backupDirectory
    }

    throw
}
finally {
    Pop-Location
}
