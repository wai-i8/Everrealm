param(
  [Parameter(Mandatory = $true)]
  [string] $Source,

  [Parameter(Mandatory = $true)]
  [string] $Destination,

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
  [int] $AnchorY = 224
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$destinationPath = [IO.Path]::GetFullPath($Destination)
$sourceBitmap = [Drawing.Bitmap]::FromFile($sourcePath)

try {
  $frames = @()
  $maxWidth = 1
  $maxHeight = 1
  for ($row = 0; $row -lt $Rows; $row += 1) {
    for ($column = 0; $column -lt $Columns; $column += 1) {
      $left = [Math]::Floor($column * $sourceBitmap.Width / $Columns)
      $right = [Math]::Ceiling(($column + 1) * $sourceBitmap.Width / $Columns)
      $top = [Math]::Floor($row * $sourceBitmap.Height / $Rows)
      $bottom = [Math]::Ceiling(($row + 1) * $sourceBitmap.Height / $Rows)
      $minX = $right
      $minY = $bottom
      $maxX = $left - 1
      $maxY = $top - 1
      for ($y = $top; $y -lt $bottom; $y += 1) {
        for ($x = $left; $x -lt $right; $x += 1) {
          if ($sourceBitmap.GetPixel($x, $y).A -le 8) { continue }
          $minX = [Math]::Min($minX, $x)
          $minY = [Math]::Min($minY, $y)
          $maxX = [Math]::Max($maxX, $x)
          $maxY = [Math]::Max($maxY, $y)
        }
      }
      if ($maxX -lt $minX -or $maxY -lt $minY) {
        throw "Battle atlas cell $row,$column contains no opaque pixels."
      }
      $frame = [Drawing.Rectangle]::FromLTRB($minX, $minY, $maxX + 1, $maxY + 1)
      $frames += ,$frame
      $maxWidth = [Math]::Max($maxWidth, $frame.Width)
      $maxHeight = [Math]::Max($maxHeight, $frame.Height)
    }
  }

  $availableWidth = [Math]::Max(1, $CellWidth - $Padding * 2)
  $availableHeight = [Math]::Max(1, $AnchorY - $Padding)
  $scale = [Math]::Min(1.0, [Math]::Min($availableWidth / [double]$maxWidth, $availableHeight / [double]$maxHeight))
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
        $row = [Math]::Floor($index / $Columns)
        $column = $index % $Columns
        $sourceRect = $frames[$index]
        $drawWidth = [Math]::Max(1, [Math]::Round($sourceRect.Width * $scale))
        $drawHeight = [Math]::Max(1, [Math]::Round($sourceRect.Height * $scale))
        $drawX = $column * $CellWidth + [Math]::Floor(($CellWidth - $drawWidth) / 2)
        $drawY = $row * $CellHeight + $AnchorY - $drawHeight
        $destinationRect = [Drawing.Rectangle]::new($drawX, $drawY, $drawWidth, $drawHeight)
        $graphics.DrawImage($sourceBitmap, $destinationRect, $sourceRect, [Drawing.GraphicsUnit]::Pixel)
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
    Grid = "${Columns}x${Rows}"
    AnchorY = $AnchorY
    CornerAlpha = $result.GetPixel(0, 0).A
  }
}
finally { $result.Dispose() }
