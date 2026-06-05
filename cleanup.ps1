# Script to clean up obsolete folders and files after refactoring
Write-Host "Cleaning up obsolete GLPI backoffice files..." -ForegroundColor Yellow

$backofficeSrc = "backoffice/src"
$frontofficeSrc = "frontoffice/src"

# List of paths to remove in backoffice
$backofficePaths = @(
    "$backofficeSrc/services",
    "$backofficeSrc/context",
    "$backofficeSrc/components/configuration",
    "$backofficeSrc/components/layout",
    "$backofficeSrc/components/Accueil.jsx"
)

foreach ($path in $backofficePaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
        Write-Host "Removed: $path" -ForegroundColor Green
    }
}

# List of paths to remove in frontoffice
$frontofficePaths = @(
    "$frontofficeSrc/services"
)

foreach ($path in $frontofficePaths) {
    if (Test-Path $path) {
        Remove-Item -Recurse -Force $path
        Write-Host "Removed: $path" -ForegroundColor Green
    }
}

Write-Host "Cleanup completed successfully!" -ForegroundColor Cyan
