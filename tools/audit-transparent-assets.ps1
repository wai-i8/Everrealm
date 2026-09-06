param(
  [string[]] $Paths = @(
    "assets/hero-sprites-v3.png",
    "assets/hero-anim-down-v3.png",
    "assets/hero-anim-up-v3.png",
    "assets/hero-anim-right-v3.png",
    "assets/fighter-atlas-v2.png",
    "assets/fighter-walk-atlas-v4.png",
    "assets/npc-map-chibi-v4.png",
    "assets/npc-dialogue-portraits-v4.png",
    "assets/environment-atlas-v5.png",
    "assets/terrain-atlas-v1.png",
    "assets/interior-props-v2.png",
    "assets/monster-facing-core-v1.png",
    "assets/monster-facing-depths-v1.png",
    "assets/marker-atlas-v1.png",
    "assets/item-icon-atlas-v1.png",
    "assets/equipment-icon-atlas-v1.png"
  ),

  [ValidateRange(0.01, 0.95)]
  [double] $MinimumTransparentRatio = 0.05
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

if (-not ("LanternAlphaAudit" -as [type])) {
  Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Drawing;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public sealed class LanternAlphaAuditResult
{
    public string Path;
    public int Width;
    public int Height;
    public long Transparent;
    public long Partial;
    public long Opaque;
    public long DirtyTransparentRgb;
    public bool CornersTransparent;
}

public static class LanternAlphaAudit
{
    public static LanternAlphaAuditResult Inspect(string path)
    {
        using (var input = new Bitmap(path))
        using (var bitmap = new Bitmap(input.Width, input.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(bitmap))
            {
                graphics.Clear(Color.Transparent);
                graphics.DrawImageUnscaled(input, 0, 0);
            }

            var result = new LanternAlphaAuditResult {
                Path = path,
                Width = bitmap.Width,
                Height = bitmap.Height,
                // Alpha 1-4 is visually transparent and is sometimes left by PNG
                // provenance metadata encoders; reject only a materially painted edge.
                CornersTransparent = bitmap.GetPixel(0, 0).A <= 4
                  && bitmap.GetPixel(bitmap.Width - 1, 0).A <= 4
                  && bitmap.GetPixel(0, bitmap.Height - 1).A <= 4
                  && bitmap.GetPixel(bitmap.Width - 1, bitmap.Height - 1).A <= 4
            };

            var rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
            var data = bitmap.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
            try
            {
                int bytes = Math.Abs(data.Stride) * data.Height;
                var pixels = new byte[bytes];
                Marshal.Copy(data.Scan0, pixels, 0, bytes);
                for (int y = 0; y < bitmap.Height; y++)
                {
                    int row = y * data.Stride;
                    for (int x = 0; x < bitmap.Width; x++)
                    {
                        int offset = row + x * 4;
                        byte alpha = pixels[offset + 3];
                        if (alpha == 0)
                        {
                            result.Transparent++;
                            if (pixels[offset] != 0 || pixels[offset + 1] != 0 || pixels[offset + 2] != 0)
                                result.DirtyTransparentRgb++;
                        }
                        else if (alpha == 255) result.Opaque++;
                        else result.Partial++;
                    }
                }
            }
            finally { bitmap.UnlockBits(data); }
            return result;
        }
    }
}
'@
}

$failed = $false
$rows = foreach ($path in $Paths) {
  $resolved = (Resolve-Path -LiteralPath $path).Path
  $result = [LanternAlphaAudit]::Inspect($resolved)
  $total = [double]($result.Width * $result.Height)
  $ratio = $result.Transparent / $total
  $ok = $result.CornersTransparent -and $ratio -ge $MinimumTransparentRatio -and $result.DirtyTransparentRgb -eq 0
  if (-not $ok) { $failed = $true }
  [pscustomobject]@{
    Asset = [IO.Path]::GetFileName($resolved)
    Size = "$($result.Width)x$($result.Height)"
    Transparent = "{0:P1}" -f $ratio
    PartialAlpha = $result.Partial
    DirtyTransparentRGB = $result.DirtyTransparentRgb
    CornersClear = $result.CornersTransparent
    Result = if ($ok) { "PASS" } else { "FAIL" }
  }
}

$rows | Format-Table -AutoSize
if ($failed) {
  throw "One or more sprite atlases have an opaque/matted background or dirty transparent RGB. Run clean-alpha-matte.ps1 before activating them."
}
