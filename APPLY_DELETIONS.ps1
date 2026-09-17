# Run this once AFTER extracting this patch over the Everrealm project root.
$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
if (-not (Test-Path (Join-Path $root "game.js")) -or -not (Test-Path (Join-Path $root "maps\mountain-southeast.js"))) {
  throw "Patch is not extracted into the Everrealm project root."
}
$oldFiles = @(
  "APPLY_FIX.bat",
  "apply_everrealm_fix.py",
  "data\skills\warrior.js",
  "docs\maps\MINE.md",
  "functions\shared\data\skills\warrior.js",
  "maps\mine.js"
)
foreach ($relative in $oldFiles) {
  $path = Join-Path $root $relative
  if (Test-Path $path) { Remove-Item $path -Force }
}
Write-Host "Legacy cleanup deletions complete." -ForegroundColor Green
