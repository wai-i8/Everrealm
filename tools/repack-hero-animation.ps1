param(
  [Parameter(Mandatory = $true)][string]$InputPath,
  [Parameter(Mandatory = $true)][string]$OutputPath,
  [Parameter(Mandatory = $true)][string]$ActualFrameCounts,
  [int]$CellWidth = 256,
  [int]$CellHeight = 192
)

$ErrorActionPreference = 'Stop'
$parsedFrameCounts = @($ActualFrameCounts -split ',' | ForEach-Object { [int]$_.Trim() })
if ($parsedFrameCounts.Count -ne 5) { throw 'ActualFrameCounts must contain five comma-separated row counts.' }
Add-Type -AssemblyName System.Drawing

$source = @'
using System;
using System.Collections.Generic;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Drawing.Imaging;
using System.Linq;
using System.Runtime.InteropServices;

public static class HeroAnimationRepacker
{
    private sealed class Component
    {
        public int Id, Count, MinX = int.MaxValue, MinY = int.MaxValue, MaxX = int.MinValue, MaxY = int.MinValue;
        public long SumX, SumY;
        public float CenterX { get { return (float)SumX / Count; } }
        public float CenterY { get { return (float)SumY / Count; } }
        public int Height { get { return MaxY - MinY + 1; } }
    }

    private sealed class Pose
    {
        public int Row, Index;
        public float AnchorX;
        public int MinX = int.MaxValue, MinY = int.MaxValue, MaxX = int.MinValue, MaxY = int.MinValue;
        public bool HasPixels { get { return MinX != int.MaxValue; } }
    }

    private static readonly float[] RowCentres = new float[] { .115f, .322f, .520f, .718f, .912f };
    private static readonly int[] DesiredCounts = new int[] { 6, 8, 8, 10, 8 };

    public static string Repack(string inputPath, string outputPath, int[] actualCounts, int cellWidth, int cellHeight)
    {
        using (var loaded = new Bitmap(inputPath))
        using (var source = new Bitmap(loaded.Width, loaded.Height, PixelFormat.Format32bppArgb))
        {
            using (var graphics = Graphics.FromImage(source)) graphics.DrawImageUnscaled(loaded, 0, 0);
            int width = source.Width, height = source.Height;
            byte[] pixels = ReadPixels(source);
            bool[] opaque = new bool[width * height];
            int[] labels = new int[width * height];
            for (int y = 0; y < height; y++)
            for (int x = 0; x < width; x++)
                opaque[y * width + x] = pixels[(y * width + x) * 4 + 3] > 8;

            List<Component> components = LabelComponents(opaque, labels, width, height);
            int[] componentRows = components.ToDictionary(c => c.Id, c => NearestRow(c.CenterY / height))
                                             .OrderBy(pair => pair.Key).Select(pair => pair.Value).Prepend(0).ToArray();
            var poses = new List<Pose>[5];
            for (int row = 0; row < 5; row++)
            {
                var anchors = components.Where(c => componentRows[c.Id] == row && c.Height >= 42)
                                        .OrderByDescending(c => c.Count)
                                        .Take(actualCounts[row])
                                        .OrderBy(c => c.CenterX)
                                        .ToArray();
                if (anchors.Length != actualCounts[row])
                    throw new InvalidOperationException("Could not find " + actualCounts[row] + " hero poses in row " + row + ".");
                poses[row] = anchors.Select((component, index) => new Pose { Row = row, Index = index, AnchorX = component.CenterX }).ToList();
            }

            int[] componentPoses = new int[components.Count + 1];
            foreach (var component in components)
            {
                int row = componentRows[component.Id];
                Pose nearest = poses[row].OrderBy(p => Math.Abs(p.AnchorX - component.CenterX)).First();
                componentPoses[component.Id] = nearest.Index;
                nearest.MinX = Math.Min(nearest.MinX, component.MinX);
                nearest.MinY = Math.Min(nearest.MinY, component.MinY);
                nearest.MaxX = Math.Max(nearest.MaxX, component.MaxX);
                nearest.MaxY = Math.Max(nearest.MaxY, component.MaxY);
            }

            using (var atlas = new Bitmap(cellWidth * 10, cellHeight * 5, PixelFormat.Format32bppArgb))
            using (var graphics = Graphics.FromImage(atlas))
            {
                graphics.Clear(Color.Transparent);
                graphics.CompositingMode = CompositingMode.SourceCopy;
                graphics.CompositingQuality = CompositingQuality.HighQuality;
                graphics.InterpolationMode = InterpolationMode.HighQualityBicubic;
                graphics.PixelOffsetMode = PixelOffsetMode.HighQuality;

                for (int row = 0; row < 5; row++)
                {
                    var extracted = new List<Bitmap>();
                    try
                    {
                        foreach (var pose in poses[row])
                        {
                            if (!pose.HasPixels) throw new InvalidOperationException("Empty pose in row " + row + ".");
                            extracted.Add(ExtractPose(pixels, labels, componentRows, componentPoses, width, pose, row));
                        }

                        for (int column = 0; column < DesiredCounts[row]; column++)
                        {
                            int sourceIndex = SourceFrame(column, extracted.Count, DesiredCounts[row]);
                            Bitmap item = extracted[sourceIndex];
                            float scale = Math.Min(1f, Math.Min((cellWidth - 12f) / item.Width, (cellHeight - 8f) / item.Height));
                            int drawWidth = Math.Max(1, (int)Math.Round(item.Width * scale));
                            int drawHeight = Math.Max(1, (int)Math.Round(item.Height * scale));
                            int drawX = column * cellWidth + (cellWidth - drawWidth) / 2;
                            int drawY = (row + 1) * cellHeight - 4 - drawHeight;
                            graphics.DrawImage(item, new Rectangle(drawX, drawY, drawWidth, drawHeight));
                        }
                    }
                    finally { foreach (var item in extracted) item.Dispose(); }
                }
                atlas.Save(outputPath, ImageFormat.Png);
            }

            return string.Join("; ", poses.Select((row, index) => "row" + index + "=" + row.Count));
        }
    }

    private static int SourceFrame(int outputIndex, int actualCount, int desiredCount)
    {
        if (outputIndex < actualCount) return outputIndex;
        if (desiredCount == 6 && actualCount == 5) return 3;
        if (desiredCount == 8 && actualCount == 7) return 6;
        return actualCount - 1;
    }

    private static int NearestRow(float normalizedY)
    {
        int best = 0;
        float distance = float.MaxValue;
        for (int row = 0; row < RowCentres.Length; row++)
        {
            float candidate = Math.Abs(normalizedY - RowCentres[row]);
            if (candidate < distance) { distance = candidate; best = row; }
        }
        return best;
    }

    private static byte[] ReadPixels(Bitmap bitmap)
    {
        var data = bitmap.LockBits(new Rectangle(0, 0, bitmap.Width, bitmap.Height), ImageLockMode.ReadOnly, PixelFormat.Format32bppArgb);
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
                int index = queue[head++], x = index % width, y = index / width;
                component.Count++; component.SumX += x; component.SumY += y;
                component.MinX = Math.Min(component.MinX, x); component.MinY = Math.Min(component.MinY, y);
                component.MaxX = Math.Max(component.MaxX, x); component.MaxY = Math.Max(component.MaxY, y);
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

    private static Bitmap ExtractPose(byte[] sourcePixels, int[] labels, int[] componentRows, int[] componentPoses, int sourceWidth, Pose pose, int row)
    {
        int itemWidth = pose.MaxX - pose.MinX + 1, itemHeight = pose.MaxY - pose.MinY + 1;
        var item = new Bitmap(itemWidth, itemHeight, PixelFormat.Format32bppArgb);
        byte[] itemPixels = new byte[itemWidth * itemHeight * 4];
        for (int y = 0; y < itemHeight; y++)
        for (int x = 0; x < itemWidth; x++)
        {
            int sourceIndex = (pose.MinY + y) * sourceWidth + pose.MinX + x;
            int label = labels[sourceIndex];
            if (label == 0 || componentRows[label] != row || componentPoses[label] != pose.Index) continue;
            Buffer.BlockCopy(sourcePixels, sourceIndex * 4, itemPixels, (y * itemWidth + x) * 4, 4);
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

Add-Type -TypeDefinition $source -ReferencedAssemblies System.Drawing, System.Core
$resolvedInput = [IO.Path]::GetFullPath($InputPath)
$resolvedOutput = [IO.Path]::GetFullPath($OutputPath)
if (-not (Test-Path -LiteralPath $resolvedInput)) { throw "Input sheet not found: $resolvedInput" }
if ([IO.Path]::GetExtension($resolvedOutput) -ne '.png') { throw 'Output sheet must be a PNG.' }

$result = [HeroAnimationRepacker]::Repack($resolvedInput, $resolvedOutput, $parsedFrameCounts, $CellWidth, $CellHeight)
[PSCustomObject]@{ Output = $resolvedOutput; Frames = $result; Bytes = (Get-Item -LiteralPath $resolvedOutput).Length }
