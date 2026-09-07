(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) module.exports = api;
  root.LanternMainTownNavigation = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  "use strict";

  // This is the checked-in, browser-loadable projection of
  // assets/main-town/main-town-navigation.json.  The JSON and bitmap files
  // remain the package source; this small projection lets the synchronous map
  // registry use the same authored coordinates before any images decode.
  const DATA = {
    source: {
      filename: "01-1000186771.png",
      width: 1536,
      height: 1152,
      sha256: "7dc2aaf968cbcbdb337c332a5a736997a6e0f115a86790f78762f45cefee1819",
    },
    coordinate_system: "original image pixels; origin top-left; x right, y down; rectangles half-open [x,x+width), [y,y+height)",
    rendering: "flattened; no foreground or depth sorting",
    movement_rule: "A feet disk must be completely inside the white walkable allowlist. Collision mask is supplemental solid objects, NOT the complete blocked map. Never derive walkability by inverting collision.",
    building_triggers: [
      { name: "Weapon Shop", doorway_center_x: 378, trigger_center_x: 378, rectangle: { x: 358, y: 427, width: 40, height: 8 } },
      { name: "Guild", doorway_center_x: 687, trigger_center_x: 687, rectangle: { x: 665, y: 350, width: 44, height: 8 } },
      { name: "Hospital / Clinic", doorway_center_x: 1016, trigger_center_x: 1016, rectangle: { x: 996, y: 430, width: 40, height: 8 } },
      { name: "Item / General Store", doorway_center_x: 378, trigger_center_x: 378, rectangle: { x: 358, y: 766, width: 40, height: 8 } },
      { name: "Inn", doorway_center_x: 1004, trigger_center_x: 1004, rectangle: { x: 984, y: 768, width: 40, height: 8 } },
    ],
    east_exit: {
      x: 1180,
      y: 518,
      width: 12,
      height: 28,
      destination: "Mountain Field",
    },
    other_exits: [],
    files: {
      walkable: "main-town-walkable-mask.png",
      collision: "main-town-collision-mask.png",
      triggers: "main-town-trigger-mask.png",
      review: "main-town-navigation-review.png",
    },
    connectivity: {
      feet_radius_px: 3,
      method: "Euclidean distance transform >3; 4-connected flood fill; anchor intersects trigger rectangle; conservative no diagonal corner cutting",
      central_seed: [687, 698],
      results: {
        "Weapon Shop": { reachable: true, reachable_anchor_pixels: 200, example_anchor: [358, 430] },
        Guild: { reachable: true, reachable_anchor_pixels: 220, example_anchor: [665, 353] },
        "Hospital / Clinic": { reachable: true, reachable_anchor_pixels: 181, example_anchor: [996, 433] },
        "Item / General Store": { reachable: true, reachable_anchor_pixels: 200, example_anchor: [358, 769] },
        Inn: { reachable: true, reachable_anchor_pixels: 160, example_anchor: [984, 772] },
        "East exit": { reachable: true, reachable_anchor_pixels: 253, example_anchor: [1180, 518] },
      },
    },
    ambiguities: [
      "Painterly/soft curb and vegetation boundaries have several pixels of visual uncertainty; manually traced, not pixel-perfect.",
      "Flattened silhouettes of bottom shop/inn and vegetation remain blocked; hidden ground is not inferred.",
      "East path edge is soft and irregular; rectangle spans outgoing path and includes blocked edge pixels. Trigger activates only for a valid feet anchor.",
      "Guild steps are treated as traversable exposed stone; threshold is at the top landing.",
    ],
    qa: {
      all_image_dimensions: [1536, 1152],
      binary_masks: true,
      walkable_solid_overlap_pixels: 0,
      six_destinations_reachable: true,
      manual_visual_review_required_for_pixel_exactness: true,
    },
  };

  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  return Object.freeze({
    data: Object.freeze(DATA),
    cloneData: () => clone(DATA),
  });
});
