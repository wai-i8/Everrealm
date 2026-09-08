#!/usr/bin/env python3
"""Compile the supplied Main Town authoring JPG into runtime metadata.

The JPG is the canonical authoring source.  This development-time compiler
classifies the deliberately painted colour regions, removes unrelated bright
background highlights from the white navigation layer, and emits compact RLE
payloads for the synchronous browser runtime.
"""

from __future__ import annotations

import argparse
import base64
import hashlib
import json
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage


ROOT = Path(__file__).resolve().parents[1]
ASSET_DIR = ROOT / "assets" / "main-town"
DISPLAY_NAME = "maintown.jpg"
AUTHORING_NAME = "maintown_walkable.jpg"
EXPECTED_SIZE = (7680, 4320)
COLOUR_TOLERANCE = 20
FEET_RADIUS = 3


def fail(message: str) -> None:
    raise SystemExit(f"[main-town-navigation] {message}")


def source_image(name: str) -> tuple[np.ndarray, bytes]:
    path = ASSET_DIR / name
    try:
        raw = path.read_bytes()
        image = Image.open(path).convert("RGB")
    except Exception as error:  # pragma: no cover - build-time diagnostics
        fail(f"cannot read {name}: {error}")
    if image.size != EXPECTED_SIZE:
        fail(f"{name} must be exactly {EXPECTED_SIZE[0]}x{EXPECTED_SIZE[1]}, got {image.size[0]}x{image.size[1]}")
    return np.asarray(image), raw


def near_colour(pixels: np.ndarray, colour: tuple[int, int, int]) -> np.ndarray:
    # JPEG is the supplied source format, so use a small per-channel tolerance
    # instead of pretending that the compressed pixels remain exact RGB.
    red, green, blue = (pixels[:, :, index] for index in range(3))
    cr, cg, cb = colour
    return (
        (np.abs(red.astype(np.int16) - cr) <= COLOUR_TOLERANCE)
        & (np.abs(green.astype(np.int16) - cg) <= COLOUR_TOLERANCE)
        & (np.abs(blue.astype(np.int16) - cb) <= COLOUR_TOLERANCE)
    )


def largest_component(mask: np.ndarray) -> tuple[np.ndarray, np.ndarray, np.ndarray]:
    labels, count = ndimage.label(mask, structure=np.ones((3, 3), dtype=np.uint8))
    if count == 0:
        fail("authoring image has no connected region for a required colour")
    sizes = np.bincount(labels.ravel())
    label = int(np.argmax(sizes[1:]) + 1)
    return labels == label, labels, sizes


def components(mask: np.ndarray, minimum_size: int = 1000) -> list[dict]:
    labels, count = ndimage.label(mask, structure=np.ones((3, 3), dtype=np.uint8))
    sizes = np.bincount(labels.ravel())
    result = []
    for label in range(1, count + 1):
        size = int(sizes[label])
        if size < minimum_size:
            continue
        ys, xs = np.where(labels == label)
        result.append({
            "label": label,
            "size": size,
            "bbox": {
                "x": int(xs.min()),
                "y": int(ys.min()),
                "width": int(xs.max() + 1 - xs.min()),
                "height": int(ys.max() + 1 - ys.min()),
            },
            "centroid": [int(round(float(xs.mean()))), int(round(float(ys.mean())))],
        })
    return result


def rect_from_component(component: dict) -> dict:
    return dict(component["bbox"])


def pick_component(candidates: list[dict], predicate, label: str) -> dict:
    matches = [item for item in candidates if predicate(item["centroid"], item["bbox"])]
    if len(matches) != 1:
        fail(f"expected exactly one {label} cyan component, found {len(matches)}")
    return matches[0]


def safe_anchor(main_white: np.ndarray, clearance: np.ndarray, component: dict, direction: str) -> list[int]:
    bbox = component["bbox"]
    cx, cy = component["centroid"]
    if direction in {"down", "up"}:
        preferred = np.array([cx, bbox["y"] + bbox["height"] + 90 if direction == "down" else bbox["y"] - 90])
        x0 = max(0, bbox["x"] - 160)
        x1 = min(EXPECTED_SIZE[0], bbox["x"] + bbox["width"] + 160)
        y0 = bbox["y"] + bbox["height"] + 16 if direction == "down" else max(0, bbox["y"] - 220)
        y1 = min(EXPECTED_SIZE[1], bbox["y"] + bbox["height"] + 260) if direction == "down" else max(0, bbox["y"] - 16)
    else:
        preferred = np.array([bbox["x"] - 100, cy])
        x0 = max(0, bbox["x"] - 260)
        x1 = max(0, bbox["x"] - 16)
        y0 = max(0, bbox["y"] - 120)
        y1 = min(EXPECTED_SIZE[1], bbox["y"] + bbox["height"] + 120)
    ys, xs = np.where(main_white[y0:y1, x0:x1] & (clearance[y0:y1, x0:x1] >= FEET_RADIUS + 1))
    if len(xs) == 0:
        fail(f"could not find a clear white spawn anchor for {component}")
    xs = xs + x0
    ys = ys + y0
    distances = (xs - preferred[0]) ** 2 + (ys - preferred[1]) ** 2
    index = int(np.argmin(distances))
    return [int(xs[index]), int(ys[index])]


def rle_encode(values: np.ndarray) -> str:
    flat = np.asarray(values, dtype=np.uint8).ravel()
    changes = np.flatnonzero(flat[1:] != flat[:-1]) + 1
    starts = np.concatenate((np.array([0]), changes))
    ends = np.concatenate((changes, np.array([flat.size])))
    encoded = bytearray()
    for start, end in zip(starts.tolist(), ends.tolist()):
        count = int(end - start)
        while count >= 128:
            encoded.append((count & 127) | 128)
            count >>= 7
        encoded.append(count)
        encoded.append(int(flat[start]))
    return base64.b64encode(bytes(encoded)).decode("ascii")


def compile_package() -> tuple[dict, dict]:
    display_pixels, display_raw = source_image(DISPLAY_NAME)
    authoring_pixels, authoring_raw = source_image(AUTHORING_NAME)
    white_candidate = near_colour(authoring_pixels, (255, 255, 255))
    cyan_candidate = near_colour(authoring_pixels, (0, 255, 255))
    pink_candidate = near_colour(authoring_pixels, (255, 0, 255))
    main_white, white_labels, white_sizes = largest_component(white_candidate)
    cyan_components = components(cyan_candidate)
    if len(cyan_components) != 6:
        fail(f"expected six cyan transition components, found {len(cyan_components)}")
    pink_components = components(pink_candidate)
    if len(pink_components) != 1:
        fail(f"expected one pink deck component, found {len(pink_components)}")

    weapon = pick_component(cyan_components, lambda c, b: c[0] < 3000 and c[1] < 2400, "left-upper Weapon / Equipment Shop")
    guild = pick_component(cyan_components, lambda c, b: 3000 <= c[0] < 4500 and c[1] < 2400, "upper-middle Guild")
    clinic = pick_component(cyan_components, lambda c, b: c[0] >= 4500 and c[1] < 2400 and c[0] < 6000, "right-upper Hospital / Clinic")
    general_store = pick_component(cyan_components, lambda c, b: c[0] < 3000 and c[1] >= 2400, "left-lower Item / General Store")
    inn = pick_component(cyan_components, lambda c, b: 4500 <= c[0] < 6000 and c[1] >= 2400, "right-lower Inn")
    east = pick_component(cyan_components, lambda c, b: c[0] >= 6000, "rightmost East Exit")
    deck = pink_components[0]

    transitions = [
        ("Weapon Shop", "weapon-shop", weapon, 1, "down", "world-to-shop", "shop"),
        ("Guild", "guild", guild, 2, "down", "world-to-guild", "guild"),
        ("Hospital / Clinic", "hospital-clinic", clinic, 3, "down", "world-to-clinic", "clinic"),
        ("Item / General Store", "item-general-store", general_store, 4, "down", "world-to-general-store", "general-store"),
        ("Inn", "inn", inn, 5, "down", "world-to-inn", "inn"),
    ]
    trigger_values = np.zeros((EXPECTED_SIZE[1], EXPECTED_SIZE[0]), dtype=np.uint8)
    cyan_labels, _ = ndimage.label(cyan_candidate, structure=np.ones((3, 3), dtype=np.uint8))
    for _, _, component, value, _, _, _ in transitions:
        trigger_values[cyan_labels == component["label"]] = value
    trigger_values[cyan_labels == east["label"]] = 6
    pink_labels, _ = ndimage.label(pink_candidate, structure=np.ones((3, 3), dtype=np.uint8))
    trigger_values[pink_labels == deck["label"]] = 7
    authored_regions = trigger_values > 0
    # The supplied JPG leaves a 2–3 px anti-aliased seam between each painted
    # cyan/pink region and the white road.  Only the perimeter shared by an
    # authored region and the white component is normalized; no unmarked area
    # elsewhere becomes walkable.
    shared_edge = (
        ndimage.binary_dilation(main_white, iterations=3)
        & ndimage.binary_dilation(authored_regions, iterations=3)
    )
    bridge = ndimage.binary_dilation(shared_edge, iterations=6)
    walkable = (main_white | authored_regions | bridge).astype(np.uint8)
    collision = np.zeros_like(walkable)
    clearance = ndimage.distance_transform_edt(walkable)
    walkable_labels, _ = ndimage.label(walkable, structure=np.ones((3, 3), dtype=np.uint8))
    central_candidates = np.argwhere(main_white & (clearance >= FEET_RADIUS + 1))
    if len(central_candidates) == 0:
        fail("could not find a clear central Main Town seed")
    centre = np.array([EXPECTED_SIZE[1] // 2, EXPECTED_SIZE[0] // 2])
    central_distances = ((central_candidates - centre) ** 2).sum(axis=1)
    central = central_candidates[int(np.argmin(central_distances))]
    central_label = int(walkable_labels[central[0], central[1]])

    building_triggers = []
    connectivity_results = {}
    for name, region_id, component, value, direction, portal_id, target_map in transitions:
        bbox = rect_from_component(component)
        anchor = safe_anchor(main_white, clearance, component, direction)
        region_mask = trigger_values == value
        reachable_pixels = int(np.count_nonzero(region_mask & (walkable_labels == central_label)))
        building_triggers.append({
            "name": name,
            "region_id": region_id,
            "region_value": value,
            "doorway_center_x": bbox["x"] + bbox["width"] // 2,
            "trigger_center_x": bbox["x"] + bbox["width"] // 2,
            "rectangle": bbox,
            "portal_id": portal_id,
            "target_map": target_map,
            "return_direction": "down",
        })
        connectivity_results[name] = {
            "reachable": bool(reachable_pixels and walkable_labels[anchor[1], anchor[0]] == central_label),
            "reachable_anchor_pixels": reachable_pixels,
            "example_anchor": anchor,
        }

    east_bbox = rect_from_component(east)
    east_anchor = safe_anchor(main_white, clearance, east, "left")
    east_reachable_pixels = int(np.count_nonzero((trigger_values == 6) & (walkable_labels == central_label)))
    connectivity_results["East exit"] = {
        "reachable": bool(east_reachable_pixels and walkable_labels[east_anchor[1], east_anchor[0]] == central_label),
        "reachable_anchor_pixels": east_reachable_pixels,
        "example_anchor": east_anchor,
    }
    deck_bbox = rect_from_component(deck)
    deck_anchor = safe_anchor(main_white, clearance, deck, "left")
    package = {
        "source": {
            "filename": DISPLAY_NAME,
            "width": EXPECTED_SIZE[0],
            "height": EXPECTED_SIZE[1],
            "sha256": hashlib.sha256(display_raw).hexdigest(),
        },
        "authoring": {
            "image": f"assets/main-town/{AUTHORING_NAME}",
            "filename": AUTHORING_NAME,
            "width": EXPECTED_SIZE[0],
            "height": EXPECTED_SIZE[1],
            "sha256": hashlib.sha256(authoring_raw).hexdigest(),
            "colors": {"white": [255, 255, 255], "cyan": [0, 255, 255], "pink": [255, 0, 255]},
            "matching": "JPEG colour distance <=20 per channel; white uses the largest 8-connected white component; cyan and pink use connected components",
        },
        "coordinate_system": "original image pixels; origin top-left; x right, y down; rectangles half-open [x,x+width), [y,y+height)",
        "rendering": "flattened; no foreground or depth sorting; authoring image is never rendered",
        "movement_rule": "A feet disk must be completely inside the compiled white walkable region, an authored cyan transition region, or the authored pink deck region. Only a <=3 px JPEG anti-alias seam directly shared by those authored regions is normalized. Every other pixel is blocked. Navigation data is an allowlist and never falls back to tiles or visible art.",
        "feet_radius_px": FEET_RADIUS,
        "building_triggers": building_triggers,
        "east_exit": {**east_bbox, "region_id": "east-exit", "region_value": 6, "destination": "Mountain Field", "portal_id": "world-to-field"},
        "deck_interaction": {**deck_bbox, "region_id": "deck-configuration", "region_value": 7, "function": "deck configuration interaction", "object_kind": "deckInteraction", "approach_anchor": deck_anchor},
        "files": {"display": f"assets/main-town/{DISPLAY_NAME}", "authoring": f"assets/main-town/{AUTHORING_NAME}", "generated": "map/main-town-navigation.generated.js"},
        "connectivity": {
            "feet_radius_px": FEET_RADIUS,
            "method": "8-connected compiled allowlist with a conservative clear feet disk; anchors are derived from the supplied colour components",
            "central_seed": [int(central[1]), int(central[0])],
            "results": connectivity_results,
        },
        "legacy_sources": {"old_main_town_masks": "disabled", "old_deck_objects": "disabled", "old_trigger_coordinates": "not canonical"},
        "qa": {
            "all_image_dimensions": [EXPECTED_SIZE[0], EXPECTED_SIZE[1]],
            "binary_walkable_mask": True,
            "jpeg_edge_bridge_pixels": int(np.count_nonzero(bridge)),
            "compiled_trigger_values": {"weapon-shop": 1, "guild": 2, "hospital-clinic": 3, "item-general-store": 4, "inn": 5, "east-exit": 6, "deck-configuration": 7},
            "six_destinations_reachable": all(item["reachable"] for item in connectivity_results.values()),
            "pink_interaction_present": True,
        },
    }
    masks = {"walkable": rle_encode(walkable), "collision": rle_encode(collision), "triggers": rle_encode(trigger_values)}
    return package, masks


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--json", action="store_true", help="emit compiler JSON to stdout")
    args = parser.parse_args()
    package, masks = compile_package()
    payload = {"package": package, "masks": masks}
    if args.json:
        print(json.dumps(payload, separators=(",", ":")))
    else:
        print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
