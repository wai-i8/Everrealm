"""Offline source normalization, strict packing and audit for Standard Mobile Units.

Runtime geometry comes from ../locomotion.js, never from a second cut table.
Requires Python 3, Pillow and Node. Source inference is an authoring aid only:
inspect the emitted manifest/contact sheet before promoting an atlas.
"""
import argparse
import hashlib
import json
from pathlib import Path
import statistics
import subprocess

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
METADATA = json.loads(subprocess.check_output(
    ["node", "--preserve-symlinks", "--preserve-symlinks-main", "-e", "process.stdout.write(JSON.stringify(require('./locomotion.js').STANDARD_MOBILE_UNIT_SPRITE))"],
    cwd=ROOT, text=True))
W, H = METADATA["cellWidth"], METADATA["cellHeight"]
AX, AY = METADATA["anchorX"], METADATA["anchorY"]
DIRECTIONS = list(METADATA["directions"])


def bands(occupied, bridge=4):
    groups = []
    for index, count in enumerate(occupied):
        if count < 3:
            continue
        if groups and index - groups[-1][1] <= bridge:
            groups[-1][1] = index + 1
        else:
            groups.append([index, index + 1])
    return [pair for pair in groups if pair[1] - pair[0] > 15]


def write_json(path, value):
    Path(path).write_text(json.dumps(value, indent=2, ensure_ascii=False) + "\n", encoding="utf8")


def decontaminate_edges(image):
    """Replace pale checker/matte RGB in translucent edges with nearby art RGB.

    Alpha is preserved. This avoids eroding fine hair, feathers and boot tips
    while preventing bilinear filtering from revealing a white halo.
    """
    image = image.convert("RGBA")
    source = image.copy().load()
    target = image.load()
    for y in range(image.height):
        for x in range(image.width):
            red, green, blue, alpha = source[x, y]
            if not (8 < alpha < 230 and min(red, green, blue) > 195 and max(red, green, blue) - min(red, green, blue) < 48):
                continue
            replacement = None
            for radius in range(1, 6):
                candidates = []
                for oy in range(-radius, radius + 1):
                    for ox in range(-radius, radius + 1):
                        if max(abs(ox), abs(oy)) != radius or not (0 <= x + ox < image.width and 0 <= y + oy < image.height):
                            continue
                        candidate = source[x + ox, y + oy]
                        if candidate[3] >= 230:
                            candidates.append(candidate)
                colored = [value for value in candidates if max(value[:3]) - min(value[:3]) >= 35 or max(value[:3]) < 190]
                if colored:
                    replacement = max(colored, key=lambda value: value[3])
                    break
            if replacement:
                target[x, y] = (*replacement[:3], alpha)
    return image


def normalize(args):
    sheet = Image.open(args.source).convert("RGBA")
    if args.matte == "black":
        sheet.putdata([(r, g, b, 0) if max(r, g, b) <= 6 else (r, g, b, a)
                       for r, g, b, a in sheet.getdata()])
    alpha = sheet.getchannel("A")
    if alpha.getextrema()[0] != 0:
        raise ValueError("Source has no transparent background; clean the source matte first.")
    pixels = alpha.load()
    rows = bands([sum(pixels[x, y] > 8 for x in range(sheet.width)) for y in range(sheet.height)])
    if len(rows) != METADATA["rows"]:
        raise ValueError(f"Source contains {len(rows)} separate rows; expected four. Supply complete, separated figures.")
    order = args.row_order.split(",")
    if sorted(order) != sorted(DIRECTIONS):
        raise ValueError("Source row order must contain down,right,up,left exactly once.")
    out = Path(args.output)
    out.mkdir(parents=True, exist_ok=True)
    frames = []
    for source_row, (top, bottom) in enumerate(rows):
        if args.mirror_left and order[source_row] == "left":
            for column in range(METADATA["columns"]):
                source_path = out / f"right-{column}.png"
                normalized = Image.open(source_path).convert("RGBA").transpose(Image.Transpose.FLIP_LEFT_RIGHT)
                file = f"left-{column}.png"
                normalized.save(out / file)
                frames.append({"direction": "left", "column": column, "file": file,
                               "sourceMirror": f"right-{column}.png", "sourceAnchor": [AX, AY], "sourceScale": args.height})
            continue
        columns = bands([sum(pixels[x, y] > 8 for y in range(top, bottom)) for x in range(sheet.width)])
        if len(columns) != args.source_columns:
            raise ValueError(f"Row {source_row}: {len(columns)} figures; expected {args.source_columns}.")
        for column, (left, right) in enumerate(columns[:METADATA["columns"]]):
            # Empty gaps define extraction regions, so adjacent feet/hair cannot
            # be cut by assuming a generated sheet obeys a regular grid.
            crop = sheet.crop((max(0, left - 2), max(0, top - 2), min(sheet.width, right + 2), min(sheet.height, bottom + 2)))
            bounds = crop.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
            crop = crop.crop(bounds)
            # Authoring-only root estimate. Review/edit sourceAnchor in a new
            # source manifest when the silhouette is asymmetric. Runtime never
            # performs this operation or fits alpha bounds.
            ca = crop.getchannel("A")
            root_centres = []
            for y in range(int(crop.height * .58), int(crop.height * .72)):
                spans = bands([255 if ca.getpixel((x, y)) > 32 else 0 for x in range(crop.width)], bridge=1)
                if spans:
                    a, b = max(spans, key=lambda span: span[1] - span[0])
                    root_centres.append((a + b) / 2)
            root_x = statistics.median(root_centres) if root_centres else crop.width / 2
            factor = args.height / crop.height
            scaled = crop.resize((round(crop.width * factor), args.height), Image.Resampling.LANCZOS)
            dest = (round(AX - root_x * factor), AY - args.height)
            if dest[0] < METADATA["gutter"] or dest[0] + scaled.width > W - METADATA["gutter"]:
                raise ValueError(f"{order[source_row]} {column}: figure exceeds safe canvas; choose a smaller source height.")
            normalized = Image.new("RGBA", (W, H))
            normalized.alpha_composite(scaled, dest)
            normalized = decontaminate_edges(normalized)
            # Remove RGB from zero-alpha pixels and subvisible resampling dust.
            normalized.putdata([(r, g, b, a) if a > 8 else (0, 0, 0, 0) for r, g, b, a in normalized.getdata()])
            file = f"{order[source_row]}-{column}.png"
            normalized.save(out / file)
            frames.append({"direction": order[source_row], "column": column, "file": file,
                           "sourceRect": [left, top, right, bottom], "sourceAnchor": [root_x, crop.height],
                           "sourceScale": factor})
    frames.sort(key=lambda item: METADATA["directions"][item["direction"]] * METADATA["columns"] + item["column"])
    manifest = {"geometryVersion": METADATA["version"], "source": str(Path(args.source).resolve()),
                "normalization": "offline semantic-root proposal; inspect contact sheet", "frames": frames}
    write_json(out / "frames.json", manifest)
    print(f"Normalized {len(frames)} frames: {out / 'frames.json'}")


def normalize_cycle(args):
    """Replace one direction's W1-W6 using a separately approved 3x2 cycle."""
    sheet = Image.open(args.source).convert("RGBA")
    alpha = sheet.getchannel("A")
    pixels = alpha.load()
    rows = bands([sum(pixels[x, y] > 8 for x in range(sheet.width)) for y in range(sheet.height)])
    if len(rows) != 2:
        raise ValueError(f"Cycle source contains {len(rows)} rows; expected two")
    found = []
    for top, bottom in rows:
        columns = bands([sum(pixels[x, y] > 8 for y in range(top, bottom)) for x in range(sheet.width)])
        if len(columns) != 3:
            raise ValueError(f"Cycle row contains {len(columns)} figures; expected three")
        found.extend((left, top, right, bottom) for left, right in columns)
    sequence = [int(value) for value in args.sequence.split(",")]
    if sorted(sequence) != list(range(6)):
        raise ValueError("Cycle sequence must contain 0..5 exactly once")
    directory = Path(args.manifest).parent
    manifest = json.loads(Path(args.manifest).read_text(encoding="utf8"))
    records = {(record["direction"], record["column"]): record for record in manifest["frames"]}
    for column, source_index in enumerate(sequence, 1):
        left, top, right, bottom = found[source_index]
        crop = sheet.crop((max(0, left - 2), max(0, top - 2), min(sheet.width, right + 2), min(sheet.height, bottom + 2)))
        bbox = crop.getchannel("A").point(lambda a: 255 if a > 8 else 0).getbbox()
        crop = crop.crop(bbox)
        factor = args.height / crop.height
        scaled = crop.resize((round(crop.width * factor), args.height), Image.Resampling.LANCZOS)
        frame = Image.new("RGBA", (W, H))
        frame.alpha_composite(scaled, (round(AX - scaled.width / 2), AY - args.height))
        frame = decontaminate_edges(frame)
        frame.putdata([(r, g, b, a) if a > 8 else (0, 0, 0, 0) for r, g, b, a in frame.getdata()])
        record = records[(args.direction, column)]
        frame.save(directory / record["file"])
        record.update({"cycleSource": str(Path(args.source).resolve()), "cycleSourceIndex": source_index,
                       "sourceAnchor": [crop.width / 2, crop.height], "sourceScale": factor})
    write_json(args.manifest, manifest)
    print(f"Replaced {args.direction} W1-W6 in {args.manifest}")


def frame_report(im, direction, column):
    errors = []
    if im.mode != "RGBA":
        errors.append("image must contain RGBA")
    im = im.convert("RGBA")
    a = im.getchannel("A")
    bbox = a.point(lambda x: 255 if x > 8 else 0).getbbox()
    if not bbox:
        return {"direction": direction, "column": column, "errors": ["empty frame"]}
    l, t, r, b = bbox
    gutter = METADATA["gutter"]
    if l < gutter or t < gutter or r > W - gutter or b > H - gutter:
        errors.append("occupied safety gutter: clipping/cross-cell bleed risk")
    if abs(b - AY) > 1:
        errors.append(f"foot baseline differs from shared anchor: {b} vs {AY}")
    rgba = im.load()
    white_edge = 0
    hidden_rgb = 0
    for y in range(H):
        for x in range(W):
            red, green, blue, alpha = rgba[x, y]
            if alpha == 0:
                hidden_rgb += int(bool(red or green or blue))
            elif alpha < 230 and min(red, green, blue) > 205 and max(red, green, blue) - min(red, green, blue) < 28:
                if any(0 <= x + dx < W and 0 <= y + dy < H and rgba[x + dx, y + dy][3] == 0
                       for dx, dy in ((-1, 0), (1, 0), (0, -1), (0, 1))):
                    nearby = [rgba[x + dx, y + dy] for dy in range(-3, 4) for dx in range(-3, 4)
                              if 0 <= x + dx < W and 0 <= y + dy < H and rgba[x + dx, y + dy][3] >= 230]
                    if any(max(value[:3]) - min(value[:3]) >= 35 or max(value[:3]) < 190 for value in nearby):
                        white_edge += 1
    if hidden_rgb:
        errors.append(f"hidden RGB in {hidden_rgb} transparent pixels")
    if white_edge > 4:
        errors.append(f"suspected white matte fringe: {white_edge} edge pixels")
    return {"direction": direction, "column": column, "bounds": bbox, "baseline": b,
            "whiteEdgePixels": white_edge, "errors": errors,
            "sha256": hashlib.sha256(im.tobytes()).hexdigest()}


def validate(im):
    expected = (W * METADATA["columns"], H * METADATA["rows"])
    if im.size != expected or im.mode != "RGBA":
        raise ValueError(f"Atlas must be RGBA {expected}; got {im.mode} {im.size}")
    frames = []
    errors = []
    for direction, row in METADATA["directions"].items():
        for column in range(METADATA["columns"]):
            cell = im.crop((column * W, row * H, (column + 1) * W, (row + 1) * H))
            report = frame_report(cell, direction, column)
            frames.append(report)
            errors.extend(f"{direction}/{column}: {error}" for error in report["errors"])
        walk = [r for r in frames if r["direction"] == direction and r["column"] in METADATA["walkColumns"]]
        if len(set(r.get("sha256") for r in walk)) < len(METADATA["walkColumns"]):
            errors.append(f"{direction}: duplicate Walk frames")
        heights = [r["bounds"][3] - r["bounds"][1] for r in walk if "bounds" in r]
        if heights and max(heights) - min(heights) > 8:
            errors.append(f"{direction}: unexpected scale/height drift")
    return {"passed": not errors, "metadata": METADATA, "frames": frames, "errors": errors,
            "visualReviewRequired": ["anatomy and complete feet", "direction identity", "alternating feet / natural loop",
                                     "body-root drift", "runtime exploration and battle", "STOP / final facing Idle"]}


def contact_sheet(im, path):
    # Every frame is shown on dark and light ground. Baseline/body-axis overlays
    # come from exactly the same metadata as the runtime draw operation.
    tile_w, tile_h = W, H * 2 + 24
    sheet = Image.new("RGB", (tile_w * METADATA["columns"], tile_h * METADATA["rows"]), "#182333")
    draw = ImageDraw.Draw(sheet)
    for direction, row in METADATA["directions"].items():
        for col in range(METADATA["columns"]):
            cell = im.crop((col * W, row * H, (col + 1) * W, (row + 1) * H))
            x, top = col * tile_w, row * tile_h
            draw.text((x + 8, top + 5), f"{direction} {'Idle' if col == 0 else 'W' + str(col)}", fill="white")
            for offset, bg in ((24, "#182333"), (24 + H, "#ddd5c3")):
                y = top + offset
                draw.rectangle((x, y, x + W - 1, y + H - 1), fill=bg, outline="#586775")
                sheet.paste(cell, (x, y), cell)
                draw.line((x, y + AY, x + W - 1, y + AY), fill="#42c4b7")
                draw.line((x + AX, y + 18, x + AX, y + H - 1), fill="#cd5683")
    sheet.save(path)


def repack(args):
    manifest_path = Path(args.manifest)
    manifest = json.loads(manifest_path.read_text(encoding="utf8"))
    if manifest.get("geometryVersion") != METADATA["version"]:
        raise ValueError("Source geometry version does not match runtime")
    records = manifest["frames"]
    keys = {(r["direction"], r["column"]) for r in records}
    expected = {(d, c) for d in DIRECTIONS for c in range(METADATA["columns"])}
    if len(records) != len(expected) or keys != expected:
        raise ValueError("Exactly 28 uniquely keyed frames (4 directions x Idle + W1..W6) are required")
    atlas = Image.new("RGBA", (W * METADATA["columns"], H * METADATA["rows"]))
    for record in records:
        cell = Image.open(manifest_path.parent / record["file"])
        if cell.size != (W, H) or cell.mode != "RGBA":
            raise ValueError(f"{record['file']}: every normalized frame must be RGBA {W}x{H}")
        atlas.paste(cell, (record["column"] * W, METADATA["directions"][record["direction"]] * H))
    out = Path(args.output)
    out.parent.mkdir(parents=True, exist_ok=True)
    report = validate(atlas)
    write_json(out.with_suffix(".audit.json"), report)
    contact_sheet(atlas, out.with_suffix(".contact.png"))
    if not report["passed"]:
        raise ValueError("Atlas rejected:\n" + "\n".join(report["errors"]))
    atlas.save(out)
    print(f"PASS: {out} (28 frames, fixed {W}x{H}, anchor {AX},{AY})")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="command", required=True)
    normal = sub.add_parser("normalize", help="Extract separated complete source figures; emit normalized frames and source anchors for review")
    normal.add_argument("source")
    normal.add_argument("output")
    normal.add_argument("--row-order", default=",".join(DIRECTIONS))
    normal.add_argument("--source-columns", type=int, default=METADATA["columns"])
    normal.add_argument("--height", type=int, default=192)
    normal.add_argument("--matte", choices=("transparent", "black"), default="transparent")
    normal.add_argument("--mirror-left", action="store_true", help="Offline-author left row by mirroring normalized right frames")
    cycle = sub.add_parser("normalize-cycle", help="Replace one direction's W1-W6 from a reviewed 3x2 source")
    cycle.add_argument("source")
    cycle.add_argument("manifest")
    cycle.add_argument("--direction", choices=DIRECTIONS, required=True)
    cycle.add_argument("--sequence", default="0,1,2,5,4,3")
    cycle.add_argument("--height", type=int, default=192)
    pack = sub.add_parser("repack")
    pack.add_argument("manifest")
    pack.add_argument("output")
    audit = sub.add_parser("validate")
    audit.add_argument("atlas")
    args = parser.parse_args()
    if args.command == "normalize":
        normalize(args)
    elif args.command == "normalize-cycle":
        normalize_cycle(args)
    elif args.command == "repack":
        repack(args)
    else:
        report = validate(Image.open(args.atlas))
        write_json(Path(args.atlas).with_suffix(".audit.json"), report)
        print(json.dumps({"passed": report["passed"], "errors": report["errors"]}))
        if not report["passed"]:
            raise SystemExit(1)


if __name__ == "__main__":
    main()
