param(
  [string]$InputPath = (Join-Path $PSScriptRoot '..\assets\environment-atlas-v4.png'),
  [string]$OutputPath = (Join-Path $PSScriptRoot '..\assets\environment-atlas-v5.png'),
  [int]$CellSize = 384,
  [int]$Padding = 18
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$source = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Runtime.InteropServices;

public static class EnvironmentAtlasRepacker
{
    private sealed class Component
    {
        public int Id;
        public int Count;
        public int MinX = int.MaxValue;
        public int MinY = int.MaxValue;
        public int MaxX = int.MinValue;
        public int MaxY = int.MinValue;
        public long SumX;
        public long SumY;
    }

    // The source is visually four-by-five, but tall buildings, trees, smoke and
    // ground bases cross mathematical cell lines.  These authored centres group
    // every detached component with its intended object before repacking.
    private static readonly PointF[] Anchors = new PointF[] {
        new PointF(160, 175), new PointF(470, 180), new PointF(785, 180), new PointF(1095, 175),
        new PointF(160, 465), new PointF(470, 465), new PointF(785, 465), new PointF(1095, 465),
        new PointF(160, 690), new PointF(470, 690), new PointF(785, 690), new PointF(1095, 690),
        new PointF(160, 930), new PointF(470, 930), new PointF(785, 930), new PointF(1095, 930),
        new PointF(160, 1160), new PointF(470, 1160), new PointF(785, 1160), new PointF(1095, 1160)
    };

    public static void Repack(string inputPath, string outputPath, int cellSize, int padding)
    {
        using (var loaded = new Bitmap(inputPath))
        using (var source = new Bitmap(loaded.Width, loaded.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(source))
            {
                graphics.DrawImageUnscaled(loaded, 0, 0);
            }

            int width = source.Width;
            int height = source.Height;
            int count = width * height;
            byte[] pixels = ReadPixels(source);
            bool[] opaque = new bool[count];
            int[] labels = new int[count];
            for (int y = 0; y < height; y++)
            {
                int byteRow = y * width * 4;
                int pixelRow = y * width;
                for (int x = 0; x < width; x++)
                    opaque[pixelRow + x] = pixels[byteRow + x * 4 + 3] > 8;
            }

            var components = LabelComponents(opaque, labels, width, height);
            int[] componentGroups = AssignGroups(components);
            Rectangle[] groupBounds = BuildGroupBounds(components, componentGroups);

            using (var atlas = new Bitmap(cellSize * 4, cellSize * 5, PixelFormat.Format32bppArgb))
            using (var graphics = Graphics.FromImage(atlas))
            {
                graphics.Clear(Color.Transparent);
                graphics.CompositingMode = CompositingMode.SourceCopy;
                graphics.CompositingQuality = CompositingQuality.HighQuality;
                graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;
                graphics.SmoothingMode = SmoothingMode.HighQuality;

                for (int group = 0; group < Anchors.Length; group++)
                {
                    Rectangle bounds = groupBounds[group];
                    if (bounds.Width <= 0 || bounds.Height <= 0)
                        throw new InvalidOperationException("No pixels assigned to environment item " + group + ".");

                    using (var item = ExtractGroup(pixels, labels, componentGroups, width, bounds, group))
                    {
                        float scale = Math.Min(
                            (cellSize - padding * 2f) / item.Width,
                            (cellSize - padding * 2f) / item.Height
                        );
                        int drawWidth = Math.Max(1, (int)Math.Round(item.Width * scale));
                        int drawHeight = Math.Max(1, (int)Math.Round(item.Height * scale));
                        int column = group % 4;
                        int row = group / 4;
                        int drawX = column * cellSize + (cellSize - drawWidth) / 2;
                        int drawY = (row + 1) * cellSize - padding - drawHeight;
                        graphics.DrawImage(item, new Rectangle(drawX, drawY, drawWidth, drawHeight));
                    }
                }

                atlas.Save(outputPath, ImageFormat.Png);
            }
        }
    }

    private static byte[] ReadPixels(Bitmap bitmap)
    {
        var rect = new Rectangle(0, 0, bitmap.Width, bitmap.Height);
        var data = bitmap.LockBits(rect, ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
        try
        {
            byte[] packed = new byte[bitmap.Width * bitmap.Height * 4];
            for (int y = 0; y < bitmap.Height; y++)
                Marshal.Copy(IntPtr.Add(data.Scan0, y * data.Stride), packed, y * bitmap.Width * 4, bitmap.Width * 4);
            return packed;
        }
        finally { bitmap.UnlockBits(data); }
    }

    private static List<Component> LabelComponents(bool[] opaque, int[] labels, int width, int height)
    {
        var components = new List<Component>();
        var queue = new int[opaque.Length];
        int nextId = 1;
        for (int start = 0; start < opaque.Length; start++)
        {
            if (!opaque[start] || labels[start] != 0) continue;
            var component = new Component { Id = nextId++ };
            int head = 0, tail = 0;
            queue[tail++] = start;
            labels[start] = component.Id;
            while (head < tail)
            {
                int index = queue[head++];
                int x = index % width;
                int y = index / width;
                component.Count++;
                component.SumX += x;
                component.SumY += y;
                component.MinX = Math.Min(component.MinX, x);
                component.MinY = Math.Min(component.MinY, y);
                component.MaxX = Math.Max(component.MaxX, x);
                component.MaxY = Math.Max(component.MaxY, y);

                for (int oy = -1; oy <= 1; oy++)
                for (int ox = -1; ox <= 1; ox++)
                {
                    if (ox == 0 && oy == 0) continue;
                    int nx = x + ox, ny = y + oy;
                    if (nx < 0 || ny < 0 || nx >= width || ny >= height) continue;
                    int neighbour = ny * width + nx;
                    if (!opaque[neighbour] || labels[neighbour] != 0) continue;
                    labels[neighbour] = component.Id;
                    queue[tail++] = neighbour;
                }
            }
            components.Add(component);
        }
        return components;
    }

    private static int[] AssignGroups(List<Component> components)
    {
        int[] groups = new int[components.Count + 1];
        foreach (var component in components)
        {
            float cx = (float)component.SumX / component.Count;
            float cy = (float)component.SumY / component.Count;
            int best = 0;
            double bestDistance = double.MaxValue;
            for (int group = 0; group < Anchors.Length; group++)
            {
                double dx = cx - Anchors[group].X;
                double dy = cy - Anchors[group].Y;
                double distance = dx * dx + dy * dy;
                if (distance < bestDistance) { bestDistance = distance; best = group; }
            }
            groups[component.Id] = best;
        }
        return groups;
    }

    private static Rectangle[] BuildGroupBounds(List<Component> components, int[] groups)
    {
        int[] minX = new int[Anchors.Length], minY = new int[Anchors.Length], maxX = new int[Anchors.Length], maxY = new int[Anchors.Length];
        for (int i = 0; i < Anchors.Length; i++) { minX[i] = minY[i] = int.MaxValue; maxX[i] = maxY[i] = int.MinValue; }
        foreach (var component in components)
        {
            int group = groups[component.Id];
            minX[group] = Math.Min(minX[group], component.MinX);
            minY[group] = Math.Min(minY[group], component.MinY);
            maxX[group] = Math.Max(maxX[group], component.MaxX);
            maxY[group] = Math.Max(maxY[group], component.MaxY);
        }
        var bounds = new Rectangle[Anchors.Length];
        for (int group = 0; group < Anchors.Length; group++)
            if (minX[group] != int.MaxValue)
                bounds[group] = Rectangle.FromLTRB(minX[group], minY[group], maxX[group] + 1, maxY[group] + 1);
        return bounds;
    }

    private static Bitmap ExtractGroup(byte[] sourcePixels, int[] labels, int[] componentGroups, int sourceWidth, Rectangle bounds, int group)
    {
        var item = new Bitmap(bounds.Width, bounds.Height, PixelFormat.Format32bppArgb);
        byte[] itemPixels = new byte[bounds.Width * bounds.Height * 4];
        for (int y = 0; y < bounds.Height; y++)
        for (int x = 0; x < bounds.Width; x++)
        {
            int sourceIndex = (bounds.Y + y) * sourceWidth + bounds.X + x;
            int label = labels[sourceIndex];
            if (label == 0 || componentGroups[label] != group) continue;
            Buffer.BlockCopy(sourcePixels, sourceIndex * 4, itemPixels, (y * bounds.Width + x) * 4, 4);
        }
        var data = item.LockBits(new Rectangle(0, 0, item.Width, item.Height), ImageLockMode.WriteOnly, PixelFormat.Format32bppArgb);
        try
        {
            for (int y = 0; y < item.Height; y++)
                Marshal.Copy(itemPixels, y * item.Width * 4, IntPtr.Add(data.Scan0, y * data.Stride), item.Width * 4);
        }
        finally { item.UnlockBits(data); }
        return item;
    }
}
'@

Add-Type -TypeDefinition $source -ReferencedAssemblies System.Drawing

$resolvedInput = [IO.Path]::GetFullPath($InputPath)
$resolvedOutput = [IO.Path]::GetFullPath($OutputPath)
if (-not (Test-Path -LiteralPath $resolvedInput)) { throw "Input atlas not found: $resolvedInput" }
if ([IO.Path]::GetExtension($resolvedOutput) -ne '.png') { throw 'Output atlas must be a PNG.' }

[EnvironmentAtlasRepacker]::Repack($resolvedInput, $resolvedOutput, $CellSize, $Padding)
Get-Item -LiteralPath $resolvedOutput | Select-Object FullName, Length
