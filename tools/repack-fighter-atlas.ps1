param(
  [string] $Source = "assets/fighter-atlas-v1.png",
  [string] $Destination = "assets/fighter-atlas-v2.png",
  [ValidateRange(96, 512)]
  [int] $CellWidth = 256,
  [ValidateRange(96, 512)]
  [int] $CellHeight = 256,
  [ValidateRange(0, 32)]
  [int] $Padding = 8
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

function Get-TrueSpans {
  param([bool[]] $Flags)
  $spans = @()
  [int] $start = -1
  for ($index = 0; $index -lt $Flags.Length; $index += 1) {
    if ($Flags[$index] -and $start -lt 0) { $start = $index }
    if (-not $Flags[$index] -and $start -ge 0) {
      $spans += [pscustomobject]@{ Start = $start; End = $index - 1 }
      $start = -1
    }
  }
  if ($start -ge 0) { $spans += [pscustomobject]@{ Start = $start; End = $Flags.Length - 1 } }
  return $spans
}

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$destinationPath = [IO.Path]::GetFullPath($Destination)
$sourceBitmap = [Drawing.Bitmap]::FromFile($sourcePath)

try {
  $occupiedRows = [bool[]]::new($sourceBitmap.Height)
  for ($y = 0; $y -lt $sourceBitmap.Height; $y += 1) {
    for ($x = 0; $x -lt $sourceBitmap.Width; $x += 1) {
      if ($sourceBitmap.GetPixel($x, $y).A -gt 8) {
        $occupiedRows[$y] = $true
        break
      }
    }
  }
  $rowSpans = @(Get-TrueSpans $occupiedRows)
  if ($rowSpans.Count -ne 5) {
    throw "Expected five visual animation rows, found $($rowSpans.Count)."
  }

  $frames = @()
  foreach ($rowSpan in $rowSpans) {
    $occupiedColumns = [bool[]]::new($sourceBitmap.Width)
    for ($x = 0; $x -lt $sourceBitmap.Width; $x += 1) {
      for ($y = $rowSpan.Start; $y -le $rowSpan.End; $y += 1) {
        if ($sourceBitmap.GetPixel($x, $y).A -gt 8) {
          $occupiedColumns[$x] = $true
          break
        }
      }
    }
    $columnSpans = @(Get-TrueSpans $occupiedColumns)
    if ($columnSpans.Count -ne 4) {
      throw "Expected four direction frames in row $($frames.Count), found $($columnSpans.Count)."
    }
    $frames += ,@($columnSpans | ForEach-Object {
      [Drawing.Rectangle]::FromLTRB($_.Start, $rowSpan.Start, $_.End + 1, $rowSpan.End + 1)
    })
  }

  $atlas = [Drawing.Bitmap]::new($CellWidth * 4, $CellHeight * 5, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    $graphics = [Drawing.Graphics]::FromImage($atlas)
    try {
      $graphics.Clear([Drawing.Color]::Transparent)
      $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
      $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality

      for ($row = 0; $row -lt 5; $row += 1) {
        for ($column = 0; $column -lt 4; $column += 1) {
          $sourceRect = $frames[$row][$column]
          $availableWidth = $CellWidth - $Padding * 2
          $availableHeight = $CellHeight - $Padding * 2
          $scale = [Math]::Min(1, [Math]::Min($availableWidth / $sourceRect.Width, $availableHeight / $sourceRect.Height))
          $drawWidth = [Math]::Max(1, [Math]::Round($sourceRect.Width * $scale))
          $drawHeight = [Math]::Max(1, [Math]::Round($sourceRect.Height * $scale))
          $drawX = $column * $CellWidth + [Math]::Floor(($CellWidth - $drawWidth) / 2)
          $drawY = ($row + 1) * $CellHeight - $Padding - $drawHeight
          $destinationRect = [Drawing.Rectangle]::new($drawX, $drawY, $drawWidth, $drawHeight)
          $graphics.DrawImage($sourceBitmap, $destinationRect, $sourceRect, [Drawing.GraphicsUnit]::Pixel)
        }
      }
    }
    finally { $graphics.Dispose() }

    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destinationPath)) | Out-Null
    $atlas.Save($destinationPath, [Drawing.Imaging.ImageFormat]::Png)
  }
  finally { $atlas.Dispose() }
}
finally { $sourceBitmap.Dispose() }

$result = [Drawing.Bitmap]::FromFile($destinationPath)
try {
  [pscustomobject]@{
    Output = $destinationPath
    Size = "$($result.Width)x$($result.Height)"
    Grid = "4x5"
    CornerAlpha = $result.GetPixel(0, 0).A
  }
}
finally { $result.Dispose() }
