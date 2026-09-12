$ErrorActionPreference = "Stop"
$ProjectRoot = Split-Path -Parent $PSScriptRoot
if (-not (Test-Path (Join-Path $ProjectRoot "index.html")) -or -not (Test-Path (Join-Path $ProjectRoot "game.js"))) {
  throw "Everrealm project root not found. Extract this patch into the Everrealm root before running cleanup."
}

$obsolete = @(
  "HOTFIX-NOTES.txt",
  "MOBILE-UI-PATCH-NOTES.txt",
  "MODIFIED_FILES.txt",
  "NAVIGATION_PERFORMANCE_FIX.txt",
  "PATCH-NOTES-USABILITY.txt",
  "PATCH-NOTES.txt",
  "PATCH_NOTES.txt",
  "PWA-V2-NOTES.txt",
  "STATUS_MENU_REDESIGN.md",
  "UPDATE-NOTES.txt",
  "equipment-shop.js",
  "fighter-skill-data.js",
  "firestore-debug.log",
  "inventory-minimal.css",
  "inventory-overhaul.css",
  "item-navigation.generated.js",
  "item-navigation.js",
  "manifest.webmanifest",
  "responsive-ui-redesign.css",
  "service-worker.js",
  "ui-system.css",
  "weapon-navigation.generated.js",
  "weapon-navigation.js"

)

foreach ($relative in $obsolete) {
  $path = Join-Path $ProjectRoot $relative
  if (Test-Path -LiteralPath $path) {
    Remove-Item -LiteralPath $path -Force
    Write-Host "Removed $relative"
  }
}

Write-Host "Everrealm obsolete-file cleanup complete."
