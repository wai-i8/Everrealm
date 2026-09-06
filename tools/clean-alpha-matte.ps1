param(
  [Parameter(Mandatory = $true)]
  [string] $Source,

  [Parameter(Mandatory = $true)]
  [string] $Destination,

  [ValidateSet("checker", "alpha")]
  [string] $Mode = "alpha",

  [ValidateRange(0, 4)]
  [int] $EdgePasses = 1
)

$ErrorActionPreference = "Stop"
Add-Type -AssemblyName System.Drawing

if (-not ("LanternAlphaCleaner" -as [type])) {
  Add-Type -ReferencedAssemblies System.Drawing -TypeDefinition @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Imaging;
using System.IO;
using System.Runtime.InteropServices;

public static class LanternAlphaCleaner
{
    private static bool IsPaleNeutral(byte b, byte g, byte r, int floor, int spread)
    {
        int min = Math.Min(r, Math.Min(g, b));
        int max = Math.Max(r, Math.Max(g, b));
        return min >= floor && max - min <= spread;
    }

    private static bool TouchesTransparent(byte[] pixels, int stride, int width, int height, int x, int y)
    {
        for (int oy = -1; oy <= 1; oy++)
        {
            for (int ox = -1; ox <= 1; ox++)
            {
                if (ox == 0 && oy == 0) continue;
                int nx = x + ox;
                int ny = y + oy;
                if (nx < 0 || ny < 0 || nx >= width || ny >= height) return true;
                if (pixels[ny * stride + nx * 4 + 3] == 0) return true;
            }
        }
        return false;
    }

    public static void Clean(string source, string destination, bool extractChecker, int edgePasses)
    {
        using (var input = new Bitmap(source))
        using (var bitmap = new Bitmap(input.Width, input.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(bitmap))
            {
                graphics.Clear(Color.Transparent);
                graphics.DrawImageUnscaled(input, 0, 0);
            }

            var rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
            var data = bitmap.LockBits(rect, ImageLockMode.ReadWrite, PixelFormat.Format32bppArgb);
            int bytes = Math.Abs(data.Stride) * data.Height;
            var pixels = new byte[bytes];
            Marshal.Copy(data.Scan0, pixels, 0, bytes);

            if (extractChecker)
            {
                var visited = new bool[bitmap.Width * bitmap.Height];
                var queue = new Queue<int>();
                Action<int, int> seed = (x, y) =>
                {
                    int id = y * bitmap.Width + x;
                    if (visited[id]) return;
                    int offset = y * data.Stride + x * 4;
                    if (!IsPaleNeutral(pixels[offset], pixels[offset + 1], pixels[offset + 2], 214, 28)) return;
                    visited[id] = true;
                    queue.Enqueue(id);
                };

                for (int x = 0; x < bitmap.Width; x++) { seed(x, 0); seed(x, bitmap.Height - 1); }
                for (int y = 0; y < bitmap.Height; y++) { seed(0, y); seed(bitmap.Width - 1, y); }

                int[] dx = { -1, 1, 0, 0 };
                int[] dy = { 0, 0, -1, 1 };
                while (queue.Count > 0)
                {
                    int id = queue.Dequeue();
                    int x = id % bitmap.Width;
                    int y = id / bitmap.Width;
                    int offset = y * data.Stride + x * 4;
                    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = pixels[offset + 3] = 0;
                    for (int direction = 0; direction < 4; direction++)
                    {
                        int nx = x + dx[direction];
                        int ny = y + dy[direction];
                        if (nx < 0 || ny < 0 || nx >= bitmap.Width || ny >= bitmap.Height) continue;
                        int nextId = ny * bitmap.Width + nx;
                        if (visited[nextId]) continue;
                        int next = ny * data.Stride + nx * 4;
                        if (!IsPaleNeutral(pixels[next], pixels[next + 1], pixels[next + 2], 205, 38)) continue;
                        visited[nextId] = true;
                        queue.Enqueue(nextId);
                    }
                }
            }

            for (int pass = 0; pass < edgePasses; pass++)
            {
                var clear = new List<int>();
                for (int y = 0; y < bitmap.Height; y++)
                {
                    for (int x = 0; x < bitmap.Width; x++)
                    {
                        int offset = y * data.Stride + x * 4;
                        if (pixels[offset + 3] == 0) continue;
                        if (!IsPaleNeutral(pixels[offset], pixels[offset + 1], pixels[offset + 2], 222, 30)) continue;
                        if (TouchesTransparent(pixels, data.Stride, bitmap.Width, bitmap.Height, x, y)) clear.Add(offset);
                    }
                }
                foreach (int offset in clear)
                {
                    pixels[offset] = pixels[offset + 1] = pixels[offset + 2] = pixels[offset + 3] = 0;
                }
            }

            // Transparent RGB must be black; this prevents coloured matte bleed
            // when the browser scales an atlas frame with bilinear filtering.
            for (int index = 0; index < pixels.Length; index += 4)
            {
                if (pixels[index + 3] != 0) continue;
                pixels[index] = pixels[index + 1] = pixels[index + 2] = 0;
            }

            Marshal.Copy(pixels, 0, data.Scan0, bytes);
            bitmap.UnlockBits(data);
            Directory.CreateDirectory(Path.GetDirectoryName(Path.GetFullPath(destination)));
            bitmap.Save(destination, ImageFormat.Png);
        }
    }
}
'@
}

$sourcePath = (Resolve-Path -LiteralPath $Source).Path
$destinationPath = [System.IO.Path]::GetFullPath($Destination)
[LanternAlphaCleaner]::Clean($sourcePath, $destinationPath, $Mode -eq "checker", $EdgePasses)

$result = [System.Drawing.Bitmap]::FromFile($destinationPath)
try {
  $transparentCorner = $result.GetPixel(0, 0).A
  Write-Output "Saved $destinationPath ($($result.Width)x$($result.Height), corner alpha $transparentCorner)"
}
finally {
  $result.Dispose()
}
