param(
  [Parameter(Mandatory = $true)]
  [string] $Source,

  [Parameter(Mandatory = $true)]
  [string] $Destination,

  [ValidateSet("player", "ordinary-monster")]
  [string] $VisualProfile = "ordinary-monster",

  [ValidateRange(1, 32)]
  [int] $Columns = 5,

  [ValidateRange(1, 32)]
  [int] $Rows = 4,

  [ValidateRange(96, 512)]
  [int] $CellWidth = 256,

  [ValidateRange(96, 512)]
  [int] $CellHeight = 256,

  [ValidateRange(0, 64)]
  [int] $Padding = 12,

  [ValidateRange(1, 255)]
  [int] $AnchorX = 128,

  [ValidateRange(1, 255)]
  [int] $AnchorY = 224,

  [ValidateRange(32, 250)]
  [int] $ForegroundAlphaThreshold = 180,

  [ValidateRange(1, 8)]
  [int] $EdgeRadius = 4
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

# These are category envelopes, not per-monster overrides. The source art is
# scaled uniformly once for the complete atlas, then placed on the shared
# battle cell/anchor. Smaller creatures are never enlarged to fill the cap.
$visualProfiles = @{
  "player" = @{ MaxWidth = 208; MaxHeight = 212 }
  "ordinary-monster" = @{ MaxWidth = 184; MaxHeight = 160 }
}
$profile = $visualProfiles[$VisualProfile]
if ($AnchorX -lt $Padding -or $AnchorX -gt $CellWidth - $Padding) {
  throw "AnchorX must stay inside the cell safety padding."
}
if ($AnchorY -lt $Padding -or $AnchorY -gt $CellHeight - $Padding) {
  throw "AnchorY must stay inside the cell safety padding."
}

function Get-CleanFrame {
  param(
    [Drawing.Bitmap] $Bitmap,
    [int] $Left,
    [int] $Top,
    [int] $Right,
    [int] $Bottom,
    [int] $AlphaThreshold,
    [int] $Radius,
    [double] $SourceAnchorX
  )

  $width = $Right - $Left
  $height = $Bottom - $Top
  $strong = New-Object bool[] ($width * $height)
  $minX = $width
  $minY = $height
  $maxX = -1
  $maxY = -1

  # Build a strong foreground mask first. This also rejects the soft dark
  # matte present in the old fighter source, whose border alpha stays below
  # the foreground threshold.
  for ($y = 0; $y -lt $height; $y += 1) {
    for ($x = 0; $x -lt $width; $x += 1) {
      $alpha = $Bitmap.GetPixel($Left + $x, $Top + $y).A
      if ($alpha -lt $AlphaThreshold) { continue }
      $strong[$y * $width + $x] = $true
      $minX = [Math]::Min($minX, $x)
      $minY = [Math]::Min($minY, $y)
      $maxX = [Math]::Max($maxX, $x)
      $maxY = [Math]::Max($maxY, $y)
    }
  }
  if ($maxX -lt $minX -or $maxY -lt $minY) {
    throw "Battle atlas cell $Top,$Left contains no strong foreground pixels."
  }

  $keep = New-Object bool[] ($width * $height)
  $keptMinX = $width
  $keptMinY = $height
  $keptMaxX = -1
  $keptMaxY = -1
  for ($y = 0; $y -lt $height; $y += 1) {
    for ($x = 0; $x -lt $width; $x += 1) {
      $pixel = $Bitmap.GetPixel($Left + $x, $Top + $y)
      if ($pixel.A -le 8) { continue }
      $isForeground = $strong[$y * $width + $x]
      if (-not $isForeground) {
        $isForeground = $false
        for ($oy = -$Radius; $oy -le $Radius -and -not $isForeground; $oy += 1) {
          for ($ox = -$Radius; $ox -le $Radius; $ox += 1) {
            $nx = $x + $ox
            $ny = $y + $oy
            if ($nx -lt 0 -or $ny -lt 0 -or $nx -ge $width -or $ny -ge $height) { continue }
            if ($strong[$ny * $width + $nx]) { $isForeground = $true; break }
          }
        }
      }
      if (-not $isForeground) { continue }
      $keep[$y * $width + $x] = $true
      $keptMinX = [Math]::Min($keptMinX, $x)
      $keptMinY = [Math]::Min($keptMinY, $y)
      $keptMaxX = [Math]::Max($keptMaxX, $x)
      $keptMaxY = [Math]::Max($keptMaxY, $y)
    }
  }
  if ($keptMaxX -lt $keptMinX -or $keptMaxY -lt $keptMinY) {
    throw "Battle atlas cell $Top,$Left contains no retained foreground pixels."
  }

  $cropWidth = $keptMaxX - $keptMinX + 1
  $cropHeight = $keptMaxY - $keptMinY + 1
  $crop = [Drawing.Bitmap]::new($cropWidth, $cropHeight, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    for ($y = 0; $y -lt $cropHeight; $y += 1) {
      for ($x = 0; $x -lt $cropWidth; $x += 1) {
        $sourceX = $keptMinX + $x
        $sourceY = $keptMinY + $y
        $pixel = $Bitmap.GetPixel($Left + $sourceX, $Top + $sourceY)
        if ($keep[$sourceY * $width + $sourceX]) {
          $crop.SetPixel($x, $y, [Drawing.Color]::FromArgb($pixel.A, $pixel.R, $pixel.G, $pixel.B))
        } else {
          $crop.SetPixel($x, $y, [Drawing.Color]::FromArgb(0, 0, 0, 0))
        }
      }
    }
    return [pscustomobject]@{
      Crop = $crop
      CropLeft = $keptMinX
      CropTop = $keptMinY
      Width = $cropWidth
      Height = $cropHeight
      SourceAnchorX = $SourceAnchorX
    }
  } catch {
    $crop.Dispose()
    throw
  }
}

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$destinationPath = [IO.Path]::GetFullPath($Destination)
$sourceBitmap = [Drawing.Bitmap]::FromFile($sourcePath)
$frames = @()

try {
  for ($row = 0; $row -lt $Rows; $row += 1) {
    for ($column = 0; $column -lt $Columns; $column += 1) {
      $left = [Math]::Floor($column * $sourceBitmap.Width / $Columns)
      $right = [Math]::Ceiling(($column + 1) * $sourceBitmap.Width / $Columns)
      $top = [Math]::Floor($row * $sourceBitmap.Height / $Rows)
      $bottom = [Math]::Ceiling(($row + 1) * $sourceBitmap.Height / $Rows)
      $sourceAnchorX = [Math]::Round(($right - $left) / 2.0, 3)
      $frames += Get-CleanFrame -Bitmap $sourceBitmap -Left $left -Top $top -Right $right -Bottom $bottom -AlphaThreshold $ForegroundAlphaThreshold -Radius $EdgeRadius -SourceAnchorX $sourceAnchorX
    }
  }

  $maxWidth = ($frames | Measure-Object -Property Width -Maximum).Maximum
  $maxHeight = ($frames | Measure-Object -Property Height -Maximum).Maximum
  $maxLeftExtent = ($frames | ForEach-Object { $_.SourceAnchorX - $_.CropLeft } | Measure-Object -Maximum).Maximum
  $maxRightExtent = ($frames | ForEach-Object { $_.CropLeft + $_.Width - $_.SourceAnchorX } | Measure-Object -Maximum).Maximum
  $availableWidth = [Math]::Max(1, $CellWidth - $Padding * 2)
  $availableHeight = [Math]::Max(1, $AnchorY - $Padding)
  $scale = [Math]::Min(1.0, [Math]::Min(
    $profile.MaxWidth / [double]$maxWidth,
    $profile.MaxHeight / [double]$maxHeight
  ))
  $scale = [Math]::Min($scale, [Math]::Min(
    [Math]::Min($availableWidth / [double]$maxWidth, $availableHeight / [double]$maxHeight),
    [Math]::Min(($AnchorX - $Padding) / [double]$maxLeftExtent, ($CellWidth - $AnchorX - $Padding) / [double]$maxRightExtent)
  ))

  $atlas = [Drawing.Bitmap]::new($CellWidth * $Columns, $CellHeight * $Rows, [Drawing.Imaging.PixelFormat]::Format32bppArgb)
  try {
    $graphics = [Drawing.Graphics]::FromImage($atlas)
    try {
      $graphics.Clear([Drawing.Color]::Transparent)
      $graphics.CompositingMode = [Drawing.Drawing2D.CompositingMode]::SourceCopy
      $graphics.CompositingQuality = [Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      for ($index = 0; $index -lt $frames.Count; $index += 1) {
        $frame = $frames[$index]
        $row = [Math]::Floor($index / $Columns)
        $column = $index % $Columns
        $drawWidth = [Math]::Max(1, [Math]::Round($frame.Width * $scale))
        $drawHeight = [Math]::Max(1, [Math]::Round($frame.Height * $scale))
        $sourceAnchorOffsetX = $frame.SourceAnchorX - $frame.CropLeft
        $drawX = [Math]::Round($column * $CellWidth + $AnchorX - $sourceAnchorOffsetX * $scale)
        $drawY = [Math]::Round($row * $CellHeight + $AnchorY - $drawHeight)
        if ($drawX -lt ($column * $CellWidth + $Padding) -or $drawX + $drawWidth -gt (($column + 1) * $CellWidth - $Padding)) {
          throw "Frame $row,$column exceeds horizontal safety padding after normalization."
        }
        if ($drawY -lt ($row * $CellHeight + $Padding) -or $drawY + $drawHeight -gt (($row + 1) * $CellHeight - ($CellHeight - $AnchorY))) {
          throw "Frame $row,$column exceeds vertical safety padding after normalization."
        }
        $destinationRect = [Drawing.Rectangle]::new($drawX, $drawY, $drawWidth, $drawHeight)
        $graphics.DrawImage($frame.Crop, $destinationRect, 0, 0, $frame.Crop.Width, $frame.Crop.Height, [Drawing.GraphicsUnit]::Pixel)
      }
    }
    finally { $graphics.Dispose() }

    [IO.Directory]::CreateDirectory([IO.Path]::GetDirectoryName($destinationPath)) | Out-Null
    $atlas.Save($destinationPath, [Drawing.Imaging.ImageFormat]::Png)
  }
  finally { $atlas.Dispose() }

  $result = [Drawing.Bitmap]::FromFile($destinationPath)
  try {
    [pscustomobject]@{
      Output = $destinationPath
      Size = "$($CellWidth * $Columns)x$($CellHeight * $Rows)"
      Grid = "${Columns}x${Rows}"
      VisualProfile = $VisualProfile
      MaxOpaqueBounds = "$maxWidth x $maxHeight"
      UniformScale = [Math]::Round($scale, 4)
      Anchor = "$AnchorX,$AnchorY"
      CornerAlpha = $result.GetPixel(0, 0).A
    }
  }
  finally { $result.Dispose() }
}
finally {
  foreach ($frame in $frames) { if ($frame.Crop) { $frame.Crop.Dispose() } }
  $sourceBitmap.Dispose()
}
