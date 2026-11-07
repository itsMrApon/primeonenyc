"""
Builds the hero "architectural miniature" diorama and exports it as a GLB.

    /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/build_hero_miniature.py -- \
        --out public/gl/models/hero/miniature.glb --preview /tmp/preview.png [--samples 96]

Coordinates: Blender Z-up, front of the diorama faces -Y (the exporter turns
that into glTF +Z, towards the site camera). Units are the scene units the
three.js side uses (≈ metres, then scaled down by ROOT.scale in UmbrellaScene).

Objects in the GLB:
  Static         board, street, house, railing, trees — one mesh, one baked
                 colour × ambient-occlusion atlas (1 draw call)
  Car_*          die-cast sedan parts with their own PBR materials
  Umbrella       empty at the umbrella's foot
    Canopy       origin at the apex (three.js scales it to open the umbrella)
      Canopy_Frame  ribs, stretchers, runner, tips (moves with the canopy)
    Umbrella_Shaft, Umbrella_Handle

Keep UMBRELLA in sync with webgl/scenes/UmbrellaScene.ts (the rain stops on
this exact canopy profile).
"""

import argparse
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--out", required=True)
ap.add_argument("--preview", default="")
ap.add_argument("--closeup", default="", help="extra close-up render of the nameplate")
ap.add_argument("--samples", type=int, default=96)
ap.add_argument("--atlas", type=int, default=2048)
ap.add_argument("--plaque-font", default=os.path.expanduser("~/Library/Fonts/Montserrat-ExtraBold.otf"),
                help="OFL font for the QUEENS, NY nameplate")
ap.add_argument("--font", default=os.path.expanduser("~/Library/Fonts/Montserrat-ExtraBoldItalic.otf"),
                help="OFL font for the canopy wordmark")
args = ap.parse_args(argv)

UMBRELLA = dict(x=0.35, y=-0.25, radius=3.0, rim_z=3.5, height=0.95)
APEX_Z = UMBRELLA["rim_z"] + UMBRELLA["height"]

# ----------------------------------------------------------------- scene / materials

bpy.ops.wm.read_factory_settings(use_empty=True)
scene = bpy.context.scene
scene.unit_settings.system = "METRIC"


def srgb(hex_):
    """Hex sRGB → linear RGBA (Blender colour sockets are linear)."""
    hex_ = hex_.lstrip("#")
    c = [int(hex_[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    lin = [x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c]
    return (*lin, 1.0)


def material(name, color, rough=0.8, metal=0.0, **extra):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = srgb(color)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    for k, v in extra.items():
        b.inputs[k].default_value = v
    return m


PAPER = "#efeee6"
PAPER_SHADE = "#e2e1d8"
STREET = "#c9cbbf"
DARK = "#282c20"
LIME = "#d2ff00"
LIME_ALT = "#bde600"

M = {
    "paper": material("Paper", PAPER, 0.9),
    "paper_shade": material("PaperShade", PAPER_SHADE, 0.9),
    "street": material("Street", STREET, 0.95),
    "dark": material("Dark", DARK, 0.6),
    "window": material("WindowPane", "#3f4437", 0.25, 0.1),
    "tree": material("Tree", "#f4f3ec", 0.95),
    # die-cast car
    "paint": material("Car_Paint", "#1f3b2c", 0.32, 0.55, **{"Coat Weight": 1.0, "Coat Roughness": 0.05}),
    "glass": material("Car_Glass", "#1c2024", 0.04, 0.0, **{"Alpha": 0.55}),
    "tyre": material("Car_Tyre", "#16171a", 0.85),
    "chrome": material("Car_Chrome", "#d9dbd4", 0.12, 1.0),
    "head": material("Car_Headlight", "#fff6df", 0.2, 0.0, **{"Emission Color": srgb("#fff6df"), "Emission Strength": 0.4}),
    "tail": material("Car_Taillight", "#c2271c", 0.3, 0.0),
    "interior": material("Car_Interior", "#202319", 0.9),
    # umbrella
    "lime": material("Canopy_Lime", LIME, 0.75, 0.0, **{"Sheen Weight": 0.6, "Sheen Roughness": 0.4}),
    "lime_alt": material("Canopy_LimeAlt", LIME_ALT, 0.75, 0.0, **{"Sheen Weight": 0.6, "Sheen Roughness": 0.4}),
    "frame": material("Umbrella_Frame", DARK, 0.4, 0.6),
}
for attr, value in (("blend_method", "BLEND"), ("surface_render_method", "BLENDED")):
    if hasattr(M["glass"], attr):
        setattr(M["glass"], attr, value)


def obj_from_bmesh(name, bm, mat=None):
    me = bpy.data.meshes.new(name)
    bm.to_mesh(me)
    bm.free()
    ob = bpy.data.objects.new(name, me)
    scene.collection.objects.link(ob)
    if mat:
        ob.data.materials.append(mat)
    return ob


def box(name, size, loc, mat, bevel=0.0, segments=2):
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=1.0)
    bmesh.ops.scale(bm, vec=Vector(size), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    ob = obj_from_bmesh(name, bm, mat)
    if bevel:
        mod = ob.modifiers.new("bevel", "BEVEL")
        mod.width = bevel
        mod.segments = segments
        mod.limit_method = "ANGLE"
    return ob


def cylinder(name, radius, depth, loc, mat, axis="Z", verts=24, rot=None):
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=radius, radius2=radius, depth=depth)
    if axis == "X":
        bmesh.ops.rotate(bm, verts=bm.verts, matrix=Matrix.Rotation(math.pi / 2, 3, "Y"))
    elif axis == "Y":
        bmesh.ops.rotate(bm, verts=bm.verts, matrix=Matrix.Rotation(math.pi / 2, 3, "X"))
    if rot is not None:
        bmesh.ops.rotate(bm, verts=bm.verts, matrix=rot)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    return obj_from_bmesh(name, bm, mat)


def rod(name, a, b, radius, mat, verts=8):
    """Thin cylinder from point a to point b."""
    a, b = Vector(a), Vector(b)
    d = b - a
    bm = bmesh.new()
    bmesh.ops.create_cone(bm, cap_ends=True, segments=verts, radius1=radius, radius2=radius, depth=d.length)
    rot = d.to_track_quat("Z", "Y").to_matrix()
    bmesh.ops.rotate(bm, verts=bm.verts, matrix=rot)
    bmesh.ops.translate(bm, vec=(a + b) / 2, verts=bm.verts)
    return obj_from_bmesh(name, bm, mat)


def icosphere(name, radius, loc, mat, subdiv=2, squash=1.0):
    bm = bmesh.new()
    bmesh.ops.create_icosphere(bm, subdivisions=subdiv, radius=radius)
    bmesh.ops.scale(bm, vec=Vector((1, 1, squash)), verts=bm.verts)
    bmesh.ops.translate(bm, vec=Vector(loc), verts=bm.verts)
    return obj_from_bmesh(name, bm, mat)


def extrude_profile(name, pts, width, mat, axis_len="Y"):
    """Side profile (length, height) polygon extruded across X by `width`."""
    bm = bmesh.new()
    front = [bm.verts.new((-width / 2, p[0], p[1])) for p in pts]
    back = [bm.verts.new((width / 2, p[0], p[1])) for p in pts]
    bm.faces.new(front[::-1])
    bm.faces.new(back)
    n = len(pts)
    for i in range(n):
        j = (i + 1) % n
        bm.faces.new((front[i], front[j], back[j], back[i]))
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    return obj_from_bmesh(name, bm, mat)


static_parts = []


def static(ob):
    static_parts.append(ob)
    return ob


# ----------------------------------------------------------------- model base (board)

BOARD = dict(w=7.4, d=5.8, t=0.2)
static(box("board", (BOARD["w"], BOARD["d"], BOARD["t"]), (0, 0, -BOARD["t"] / 2), M["paper"], bevel=0.01))
# street along the front edge, curb, sidewalk
static(box("street", (BOARD["w"], 1.1, 0.01), (0, -2.35, 0.005), M["street"]))
for i in range(6):
    static(box(f"lane{i}", (0.42, 0.05, 0.012), (-3.0 + i * 1.2, -2.35, 0.006), M["paper"]))
static(box("curb", (BOARD["w"], 0.12, 0.07), (0, -1.74, 0.035), M["paper_shade"], bevel=0.008))
static(box("sidewalk", (BOARD["w"], 0.62, 0.035), (0, -1.37, 0.0175), M["paper_shade"]))
for i in range(13):  # sidewalk joints
    static(box(f"joint{i}", (0.012, 0.62, 0.037), (-3.5 + i * 0.58, -1.37, 0.0185), M["paper"]))
# driveway from sidewalk to the car
static(box("driveway", (1.25, 2.4, 0.02), (1.5, 0.15, 0.01), M["paper_shade"]))

# ----------------------------------------------------------------- house (Woodside two-family)

HX0, HX1 = -2.75, -0.1       # footprint x
HY0, HY1 = -0.95, 1.15       # footprint y (front face at HY0)
HZ = 2.25                    # wall height (flat roof)
hw, hd = HX1 - HX0, HY1 - HY0
hcx, hcy = (HX0 + HX1) / 2, (HY0 + HY1) / 2
static(box("house_walls", (hw, hd, HZ), (hcx, hcy, HZ / 2), M["paper"], bevel=0.006))
# plinth / water table
static(box("house_plinth", (hw + 0.06, hd + 0.06, 0.22), (hcx, hcy, 0.11), M["paper_shade"], bevel=0.005))
# floor band between storeys
static(box("house_band", (hw + 0.04, hd + 0.04, 0.06), (hcx, hcy, 1.12), M["paper_shade"]))
# cornice + dentils
static(box("cornice", (hw + 0.24, hd + 0.24, 0.12), (hcx, hcy, HZ + 0.06), M["paper_shade"], bevel=0.01))
static(box("cornice_cap", (hw + 0.3, hd + 0.3, 0.05), (hcx, hcy, HZ + 0.145), M["paper"], bevel=0.008))
n_dent = 22
for i in range(n_dent):
    x = HX0 + 0.06 + i * (hw - 0.12) / (n_dent - 1)
    static(box(f"dentil_f{i}", (0.05, 0.05, 0.06), (x, HY0 - 0.1, HZ - 0.03), M["paper"]))
for i in range(16):
    y = HY0 + 0.06 + i * (hd - 0.12) / 15
    static(box(f"dentil_s{i}", (0.05, 0.05, 0.06), (HX1 + 0.1, y, HZ - 0.03), M["paper"]))
# parapet + rooftop units
static(box("parapet", (hw, hd, 0.12), (hcx, hcy, HZ + 0.23), M["paper"], bevel=0.005))
static(box("roof_inset", (hw - 0.14, hd - 0.14, 0.13), (hcx, hcy, HZ + 0.235), M["paper_shade"]))
static(box("ac_unit", (0.42, 0.3, 0.22), (HX0 + 0.6, HY1 - 0.5, HZ + 0.4), M["paper"], bevel=0.015))
static(box("vent", (0.16, 0.16, 0.34), (HX1 - 0.45, HY1 - 0.35, HZ + 0.46), M["dark"], bevel=0.01))


def window(prefix, cx, cz, face, w=0.4, h=0.56):
    """Framed window on the front (face='front', at HY0) or side (face='side', at HX1)."""
    out = 0.012
    if face == "front":
        y = HY0
        static(box(f"{prefix}_pane", (w, 0.02, h), (cx, y - 0.002, cz), M["window"]))
        static(box(f"{prefix}_frameL", (0.04, 0.05, h + 0.08), (cx - w / 2 - 0.02, y - out, cz), M["paper"]))
        static(box(f"{prefix}_frameR", (0.04, 0.05, h + 0.08), (cx + w / 2 + 0.02, y - out, cz), M["paper"]))
        static(box(f"{prefix}_mullion", (0.02, 0.03, h), (cx, y - 0.01, cz), M["paper"]))
        static(box(f"{prefix}_transom", (w, 0.03, 0.02), (cx, y - 0.01, cz + h * 0.18), M["paper"]))
        static(box(f"{prefix}_lintel", (w + 0.16, 0.07, 0.07), (cx, y - 0.03, cz + h / 2 + 0.06), M["paper_shade"], bevel=0.006))
        static(box(f"{prefix}_sill", (w + 0.14, 0.1, 0.04), (cx, y - 0.05, cz - h / 2 - 0.03), M["paper_shade"], bevel=0.006))
    else:
        x = HX1
        static(box(f"{prefix}_pane", (0.02, w, h), (x + 0.002, cx, cz), M["window"]))
        static(box(f"{prefix}_frameL", (0.05, 0.04, h + 0.08), (x + out, cx - w / 2 - 0.02, cz), M["paper"]))
        static(box(f"{prefix}_frameR", (0.05, 0.04, h + 0.08), (x + out, cx + w / 2 + 0.02, cz), M["paper"]))
        static(box(f"{prefix}_mullion", (0.03, 0.02, h), (x + 0.01, cx, cz), M["paper"]))
        static(box(f"{prefix}_lintel", (0.07, w + 0.16, 0.07), (x + 0.03, cx, cz + h / 2 + 0.06), M["paper_shade"], bevel=0.006))
        static(box(f"{prefix}_sill", (0.1, w + 0.14, 0.04), (x + 0.05, cx, cz - h / 2 - 0.03), M["paper_shade"], bevel=0.006))


# front: 3 windows upstairs, 2 + door downstairs; side: 2 per floor
for i, x in enumerate((HX0 + 0.5, hcx, HX1 - 0.5)):
    window(f"wf2_{i}", x, 1.68, "front")
window("wf1_0", HX0 + 0.5, 0.72, "front")
window("wf1_1", hcx - 0.05, 0.72, "front")
for i, y in enumerate((HY0 + 0.55, HY1 - 0.55)):
    window(f"ws1_{i}", y, 0.72, "side")
    window(f"ws2_{i}", y, 1.68, "side")

# door, awning, stoop with railings (door near the right end of the front)
DX = HX1 - 0.52
static(box("door", (0.42, 0.03, 0.72), (DX, HY0 - 0.005, 0.62), M["dark"]))
static(box("door_frame_top", (0.54, 0.06, 0.05), (DX, HY0 - 0.02, 1.0), M["paper_shade"]))
for s in (-1, 1):
    static(box(f"door_frame_{s}", (0.05, 0.06, 0.76), (DX + s * 0.24, HY0 - 0.02, 0.62), M["paper_shade"]))
static(box("door_knob", (0.03, 0.03, 0.03), (DX + 0.13, HY0 - 0.03, 0.6), M["paper"]))
awning = box("awning", (0.66, 0.36, 0.035), (DX, HY0 - 0.18, 1.07), M["dark"], bevel=0.005)
awning.rotation_euler = (math.radians(-14), 0, 0)
static(awning)
for s in (-1, 1):
    static(rod(f"awning_bracket{s}", (DX + s * 0.29, HY0, 0.98), (DX + s * 0.29, HY0 - 0.33, 1.04), 0.008, M["dark"]))
STEP_H, STEP_D, N_STEPS = 0.13, 0.17, 4
landing_y = HY0 - 0.22
static(box("stoop_landing", (0.78, 0.44, 0.26), (DX, HY0 - 0.22, 0.13), M["paper_shade"], bevel=0.005))
for i in range(N_STEPS):
    top = 0.26 - (i + 1) * STEP_H + STEP_H
    y = HY0 - 0.44 - STEP_D * (i + 0.5)
    static(box(f"step{i}", (0.78, STEP_D, top), (DX, y, top / 2), M["paper_shade"], bevel=0.004))
stoop_end = HY0 - 0.44 - STEP_D * N_STEPS
for s in (-1, 1):
    x = DX + s * 0.36
    p0, p1, p2 = (x, HY0 - 0.02, 0.56), (x, landing_y - 0.2, 0.56), (x, stoop_end, 0.3)
    static(rod(f"rail_top_a{s}", p0, p1, 0.012, M["dark"]))
    static(rod(f"rail_top_b{s}", p1, p2, 0.012, M["dark"]))
    for k in range(5):
        t = k / 4
        top = Vector(p1).lerp(Vector(p2), t) if t > 0 else Vector(p1)
        base_z = max(0.26 - STEP_H * min(int(t * N_STEPS), N_STEPS - 1), 0.04)
        static(rod(f"baluster{s}_{k}", (top.x, top.y, base_z), (top.x, top.y, top.z), 0.007, M["dark"]))

# front-yard railing along the sidewalk, in front of the house
FY = -1.0 - 0.05
fy_rail = HY0 - 0.08 - 0.0
for x0, x1 in ((HX0 - 0.05, DX - 0.45),):
    static(rod("fence_top", (x0, -1.02, 0.34), (x1, -1.02, 0.34), 0.012, M["dark"]))
    static(rod("fence_mid", (x0, -1.02, 0.12), (x1, -1.02, 0.12), 0.008, M["dark"]))
    n = int((x1 - x0) / 0.09)
    for k in range(n + 1):
        x = x0 + k * (x1 - x0) / n
        static(rod(f"picket{k}", (x, -1.02, 0.02), (x, -1.02, 0.36), 0.006, M["dark"]))
    for x in (x0, x1):
        static(box(f"fence_post{x:.2f}", (0.05, 0.05, 0.42), (x, -1.02, 0.21), M["dark"]))

# model-kit trees (white, faceted crowns on wire trunks)
for i, (x, y, s) in enumerate(((-3.25, 1.95, 1.0), (-3.3, -1.37, 0.8), (2.95, 1.9, 1.1))):
    static(rod(f"trunk{i}", (x, y, 0.0), (x, y, 1.05 * s), 0.03 * s, M["dark"]))
    static(icosphere(f"crown{i}a", 0.5 * s, (x, y, 1.25 * s), M["tree"], subdiv=1, squash=1.15))
    static(icosphere(f"crown{i}b", 0.33 * s, (x + 0.22 * s, y - 0.1 * s, 1.55 * s), M["tree"], subdiv=1))
    static(icosphere(f"crown{i}c", 0.3 * s, (x - 0.2 * s, y + 0.12 * s, 1.0 * s), M["tree"], subdiv=1))
# NYC street furniture: hydrant, street lamp, stoop planters
HYD = (2.55, -1.5)
static(cylinder("hydrant_body", 0.075, 0.26, (HYD[0], HYD[1], 0.165), M["dark"], verts=16))
static(cylinder("hydrant_base", 0.1, 0.05, (HYD[0], HYD[1], 0.06), M["dark"], verts=16))
static(icosphere("hydrant_cap", 0.08, (HYD[0], HYD[1], 0.3), M["dark"], subdiv=2, squash=0.7))
static(cylinder("hydrant_nozzles", 0.035, 0.24, (HYD[0], HYD[1], 0.2), M["dark"], axis="X", verts=10))
LAMP = (-1.0, -1.55)
static(cylinder("lamp_base", 0.06, 0.12, (LAMP[0], LAMP[1], 0.095), M["dark"], verts=12))
static(rod("lamp_pole", (LAMP[0], LAMP[1], 0.1), (LAMP[0], LAMP[1], 2.0), 0.022, M["dark"]))
static(rod("lamp_arm", (LAMP[0], LAMP[1], 1.95), (LAMP[0], LAMP[1] - 0.32, 2.05), 0.016, M["dark"]))
static(box("lamp_head", (0.16, 0.24, 0.06), (LAMP[0], LAMP[1] - 0.36, 2.03), M["dark"], bevel=0.015))
for s in (-1, 1):
    static(box(f"planter{s}", (0.16, 0.16, 0.16), (DX + s * 0.5, HY0 - 0.12, 0.08), M["paper_shade"], bevel=0.01))
    static(icosphere(f"shrub{s}", 0.12, (DX + s * 0.5, HY0 - 0.12, 0.24), M["tree"], subdiv=1))
# low hedge along the side of the lot
static(box("hedge", (0.32, 2.6, 0.32), (-3.45, 0.2, 0.16), M["tree"], bevel=0.06, segments=3))

# ----------------------------------------------------------------- die-cast sedan

CAR_SCALE = 0.44          # real metres → scene units
CAR_LOC = (1.5, 0.05, 0.0)
car_parts = []


def car(ob):
    car_parts.append(ob)
    return ob


# side profile (y along the car, front at -y; z up), real metres
lower = [(-2.40, 0.22), (-2.46, 0.42), (-2.42, 0.62), (-2.20, 0.71), (-1.20, 0.82), (-0.85, 0.87),
         (1.45, 0.89), (2.20, 0.86), (2.42, 0.74), (2.46, 0.50), (2.40, 0.22)]
body = car(extrude_profile("Car_Body", lower, 1.82, M["paint"]))
for wy in (-1.45, 1.42):  # wheel arches
    cut = cylinder("arch", 0.42, 2.2, (0, wy, 0.33), None, axis="X", verts=32)
    mod = body.modifiers.new("arch", "BOOLEAN")
    mod.object = cut
    mod.operation = "DIFFERENCE"
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cut)
bev = body.modifiers.new("bevel", "BEVEL")
bev.width, bev.segments, bev.limit_method = 0.06, 3, "ANGLE"

# glass cabin + roof and pillars in paint
cabin = [(-0.85, 0.86), (-0.18, 1.40), (0.78, 1.41), (1.45, 0.88)]
glass = car(extrude_profile("Car_Glass", cabin, 1.5, M["glass"]))
for v in glass.data.vertices:  # taper the greenhouse towards the roof
    if v.co.z > 1.2:
        v.co.x *= 0.86
roof = car(box("Car_Roof", (1.3, 0.98, 0.05), (0, 0.3, 1.415), M["paint"], bevel=0.02))
for s in (-1, 1):  # A, B, C pillars
    car(rod(f"Car_PillarA{s}", (s * 0.74, -0.83, 0.88), (s * 0.645, -0.17, 1.4), 0.035, M["paint"]))
    car(rod(f"Car_PillarB{s}", (s * 0.7, 0.33, 0.88), (s * 0.645, 0.33, 1.4), 0.03, M["paint"]))
    car(rod(f"Car_PillarC{s}", (s * 0.74, 1.43, 0.89), (s * 0.645, 0.77, 1.4), 0.04, M["paint"]))
    car(box(f"Car_Mirror{s}", (0.14, 0.08, 0.08), (s * 0.95, -0.72, 0.95), M["paint"], bevel=0.02))
# interior silhouettes (visible through the glass)
for s in (-1, 1):
    car(box(f"Car_SeatF{s}", (0.48, 0.12, 0.5), (s * 0.38, -0.05, 1.05), M["interior"], bevel=0.04))
    car(box(f"Car_SeatR{s}", (0.48, 0.12, 0.46), (s * 0.38, 0.95, 1.03), M["interior"], bevel=0.04))
car(box("Car_Dash", (1.4, 0.3, 0.12), (0, -0.62, 0.92), M["interior"], bevel=0.03))
# wheels: tyre + chrome hub
for wx in (-0.8, 0.8):
    for wy in (-1.45, 1.42):
        car(cylinder(f"Car_Tyre{wx}{wy}", 0.34, 0.24, (wx, wy, 0.34), M["tyre"], axis="X", verts=32))
        car(cylinder(f"Car_Hub{wx}{wy}", 0.2, 0.25, (wx, wy, 0.34), M["chrome"], axis="X", verts=24))
# lights, grille, bumpers, plate
for s in (-1, 1):
    car(box(f"Car_Head{s}", (0.42, 0.05, 0.1), (s * 0.6, -2.43, 0.63), M["head"], bevel=0.015))
    car(box(f"Car_Tail{s}", (0.4, 0.05, 0.1), (s * 0.62, 2.44, 0.68), M["tail"], bevel=0.015))
car(box("Car_Grille", (0.7, 0.04, 0.14), (0, -2.45, 0.5), M["interior"], bevel=0.01))
car(box("Car_BumperF", (1.7, 0.08, 0.1), (0, -2.47, 0.32), M["chrome"], bevel=0.03))
car(box("Car_BumperR", (1.7, 0.08, 0.1), (0, 2.47, 0.32), M["chrome"], bevel=0.03))
car(box("Car_Plate", (0.5, 0.02, 0.12), (0, 2.49, 0.5), M["paper"]))

# ----------------------------------------------------------------- umbrella


def canopy_z(r):
    return UMBRELLA["height"] * (1 - min(r / UMBRELLA["radius"], 1) ** 1.7)


PANEL = math.pi / 4  # 8 panels


def canopy_point(r, a):
    """
    Canopy surface (relative to the apex) at radius r, angle a. Like real umbrella
    fabric it is taut between the ribs: across a panel the points lie on the straight
    chord between the two rib points (an octagonal cross-section), the hem rises in a
    curve between rib tips, and the panel sags very slightly mid-way down.
    """
    R, H = UMBRELLA["radius"], UMBRELLA["height"]
    local = (a % PANEL) - PANEL / 2          # angle from the panel's centre line
    chord = math.cos(PANEL / 2) / math.cos(local)  # 1 on a rib, cos(22.5°) mid-panel
    k = 1 - (local / (PANEL / 2)) ** 2       # 0 on a rib, 1 mid-panel
    q = min(r / R, 1)
    z = canopy_z(r) - H + 0.17 * k * q ** 4 - 0.035 * k * math.sin(math.pi * q)
    return Vector((math.cos(a) * r * chord, math.sin(a) * r * chord, z))


umbrella = bpy.data.objects.new("Umbrella", None)
scene.collection.objects.link(umbrella)
umbrella.location = (UMBRELLA["x"], UMBRELLA["y"], 0)

# canopy: 24 rings × 96 segments (12 per panel), panels alternate lime tones, thin shell
bm = bmesh.new()
RINGS, SEG = 24, 96
apex = bm.verts.new((0, 0, 0))
rings = []
for i in range(1, RINGS + 1):
    r = UMBRELLA["radius"] * (i / RINGS) ** 0.9  # a little denser towards the hem
    rings.append([bm.verts.new(canopy_point(r, 2 * math.pi * j / SEG)) for j in range(SEG)])
for j in range(SEG):
    f = bm.faces.new((apex, rings[0][j], rings[0][(j + 1) % SEG]))
    f.material_index = (j * 8 // SEG) % 2
for i in range(RINGS - 1):
    for j in range(SEG):
        f = bm.faces.new((rings[i][j], rings[i + 1][j], rings[i + 1][(j + 1) % SEG], rings[i][(j + 1) % SEG]))
        f.material_index = (j * 8 // SEG) % 2
bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
for f in bm.faces:  # normals up/out
    if f.normal.z < 0:
        f.normal_flip()
canopy = obj_from_bmesh("Canopy", bm)
canopy.data.materials.append(M["lime"])
canopy.data.materials.append(M["lime_alt"])
sol = canopy.modifiers.new("thick", "SOLIDIFY")
sol.thickness, sol.offset = 0.025, -1.0
canopy.parent = umbrella
canopy.location = (0, 0, APEX_Z)


def sweep(name, pts, radius, mat, closed=False, verts=6):
    """Tube through a list of points (joined straight rods; dense enough to read as curved)."""
    parts = [rod(f"{name}{i}", pts[i], pts[i + 1], radius, mat, verts) for i in range(len(pts) - 1)]
    if closed:
        parts.append(rod(f"{name}_close", pts[-1], pts[0], radius, mat, verts))
    return parts


# frame and trim, all in canopy space: ribs + stretchers underneath, hem binding,
# seam piping on top, metal ferrules at the tips, top cap and finial
frame_parts = []
R = UMBRELLA["radius"]
runner_z = -1.55  # relative to the apex
up = Vector((0, 0, 1))
for j in range(8):
    a = j * PANEL
    rib = [canopy_point(R * s / 16, a) for s in range(17)]
    frame_parts += sweep(f"rib{j}_", [p - up * 0.045 for p in rib], 0.015, M["frame"])
    frame_parts += sweep(f"seam{j}_", [p + up * 0.022 for p in rib[1:]], 0.011, M["dark"], verts=5)
    mid = canopy_point(R * 0.52, a) - up * 0.055
    frame_parts.append(rod(f"stretcher{j}", (0, 0, runner_z), mid, 0.011, M["frame"], verts=6))
    frame_parts.append(icosphere(f"joint{j}", 0.022, mid, M["frame"], subdiv=1))
    tip = rib[-1]
    out = Vector((math.cos(a), math.sin(a), -0.35)).normalized()
    frame_parts.append(rod(f"ferrule{j}", tip, tip + out * 0.13, 0.019, M["chrome"], verts=8))
hem = [canopy_point(R, 2 * math.pi * i / 192) for i in range(192)]
frame_parts += sweep("hem", hem, 0.021, M["dark"], closed=True, verts=6)
frame_parts.append(cylinder("runner", 0.065, 0.22, (0, 0, runner_z), M["frame"], verts=16))
frame_parts.append(cylinder("top_cap", 0.2, 0.05, (0, 0, 0.015), M["dark"], verts=24))
frame_parts.append(cylinder("finial", 0.04, 0.3, (0, 0, 0.17), M["chrome"], verts=16))
frame_parts.append(icosphere("finial_tip", 0.06, (0, 0, 0.34), M["dark"], subdiv=2))

# printed wordmark (dark green), one word per panel going round: PRIME, ONE, PRIME, ONE…
# conformed to the fabric. Montserrat is OFL-licensed, so its outlines can ship in the GLB.
def make_logo(name, text, height=0.3):
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = text
    curve.font = bpy.data.fonts.load(args.font)
    curve.align_x = "CENTER"
    curve.align_y = "CENTER"
    curve.space_character = 1.08
    ob = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(ob)
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.view_layer.objects.active
    # centre on the origin; scale by cap height so every word has the same letter size
    xs = [v.co.x for v in ob.data.vertices]
    ys = [v.co.y for v in ob.data.vertices]
    cx, cy, h = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, max(ys) - min(ys)
    for v in ob.data.vertices:
        v.co = Vector(((v.co.x - cx) / h * height, (v.co.y - cy) / h * height, 0))
    bm = bmesh.new()
    bm.from_mesh(ob.data)
    bmesh.ops.triangulate(bm, faces=bm.faces)
    for _ in range(2):
        bmesh.ops.subdivide_edges(bm, edges=bm.edges, cuts=1, use_grid_fill=True)
    bm.to_mesh(ob.data)
    bm.free()
    ob.data.materials.clear()
    ob.data.materials.append(M["dark"])
    return ob


logos = []
for j in range(8):
    am = (j + 0.5) * PANEL
    r0 = 2.2  # nearer the hem, where the panel is widest
    centre = canopy_point(r0, am)
    c, s_ = math.cos(am), math.sin(am)
    slope = (canopy_point(r0 - 0.05, am).z - canopy_point(r0 + 0.05, am).z) / 0.1
    x_axis = Vector((-s_, c, 0)).normalized()             # reads left → right from outside
    y_axis = Vector((-c, -s_, slope)).normalized()        # letters' top points up the slope
    z_axis = x_axis.cross(y_axis).normalized()
    rot = Matrix((x_axis, y_axis, z_axis)).transposed().to_4x4()
    logo = make_logo(f"logo{j}", "PRIME" if j % 2 == 0 else "ONE")
    logo.matrix_world = Matrix.Translation(centre + z_axis * 0.06) @ rot
    logos.append(logo)

shaft_bottom = 0.6
shaft = cylinder("Umbrella_Shaft", 0.04, APEX_Z - shaft_bottom, (0, 0, (APEX_Z + shaft_bottom) / 2), M["frame"], verts=16)
shaft.parent = umbrella

# J handle as a swept curve, with a chrome collar and an end cap
curve = bpy.data.curves.new("handle", "CURVE")
curve.dimensions = "3D"
curve.bevel_depth = 0.065
curve.bevel_resolution = 5
sp = curve.splines.new("BEZIER")
handle_pts = [(0, 0, shaft_bottom + 0.02), (0, 0, 0.3), (0.24, 0, 0.1), (0.46, 0, 0.3)]
sp.bezier_points.add(len(handle_pts) - 1)
for bp, p in zip(sp.bezier_points, handle_pts):
    bp.co = p
    bp.handle_left_type = bp.handle_right_type = "AUTO"
handle_curve = bpy.data.objects.new("handle_curve", curve)
scene.collection.objects.link(handle_curve)
bpy.context.view_layer.objects.active = handle_curve
handle_curve.select_set(True)
bpy.ops.object.convert(target="MESH")
handle = bpy.context.view_layer.objects.active
handle.name = "Umbrella_Handle"
handle.data.materials.clear()
handle.data.materials.append(M["dark"])
handle.parent = umbrella
collar = cylinder("Umbrella_Collar", 0.075, 0.07, (0, 0, shaft_bottom + 0.02), M["chrome"], verts=20)
collar.parent = umbrella
end_cap = icosphere("Umbrella_HandleCap", 0.068, handle_pts[-1], M["chrome"], subdiv=2)
end_cap.parent = umbrella

def join(name, objs):
    bpy.ops.object.select_all(action="DESELECT")
    for o in objs:
        o.select_set(True)
    bpy.context.view_layer.objects.active = objs[0]
    for o in objs:  # bake modifiers before joining
        bpy.context.view_layer.objects.active = o
        for m in list(o.modifiers):
            bpy.ops.object.modifier_apply(modifier=m.name)
    bpy.context.view_layer.objects.active = objs[0]
    for o in objs:
        o.select_set(True)
    bpy.ops.object.join()
    ob = bpy.context.view_layer.objects.active
    ob.name = name
    return ob


canopy_frame = join("Canopy_Frame", frame_parts)
canopy_frame.parent = canopy
canopy_frame.location = (0, 0, 0)

# logos were placed in canopy space at the world origin; parent them, then shrinkwrap
# onto the fabric (offset so they sit printed on top, not z-fighting)
for logo in logos:
    m = logo.matrix_world.copy()
    logo.parent = canopy
    logo.matrix_parent_inverse = Matrix.Identity(4)
    logo.matrix_basis = m
bpy.context.view_layer.update()
for logo in logos:
    sw = logo.modifiers.new("wrap", "SHRINKWRAP")
    sw.target = canopy
    sw.wrap_method = "NEAREST_SURFACEPOINT"
    sw.wrap_mode = "OUTSIDE_SURFACE"
    sw.offset = 0.008
    bpy.context.view_layer.objects.active = logo
    bpy.ops.object.modifier_apply(modifier=sw.name)
canopy_logo = join("Canopy_Logo", logos)

# ----------------------------------------------------------------- "QUEENS, NY" nameplate

def text_mesh(name, text, font_path, height, depth):
    """Raised lettering: a font curve converted to mesh, centred, scaled to cap height."""
    curve = bpy.data.curves.new(name, "FONT")
    curve.body = text
    curve.font = bpy.data.fonts.load(font_path)
    curve.align_x = "CENTER"
    curve.space_character = 1.06
    curve.extrude = depth / 2
    ob = bpy.data.objects.new(name, curve)
    scene.collection.objects.link(ob)
    bpy.ops.object.select_all(action="DESELECT")
    ob.select_set(True)
    bpy.context.view_layer.objects.active = ob
    bpy.ops.object.convert(target="MESH")
    ob = bpy.context.view_layer.objects.active
    xs = [v.co.x for v in ob.data.vertices]
    ys = [v.co.y for v in ob.data.vertices]
    cx, cy, h = (min(xs) + max(xs)) / 2, (min(ys) + max(ys)) / 2, max(ys) - min(ys)
    for v in ob.data.vertices:
        v.co = Vector(((v.co.x - cx) / h * height, (v.co.y - cy) / h * height, v.co.z))
    return ob


# Freestanding NYC-style nameplate on the sidewalk, right of the hydrant. Kept as real
# geometry (not in the baked atlas) so the small lettering stays sharp.
PLAQUE = dict(x=3.15, y=-1.42, w=1.08, h=0.36, t=0.04, post=0.36, yaw=math.radians(-12))
plaque_parts = []
panel_z = PLAQUE["post"] + PLAQUE["h"] / 2
plaque_parts.append(box("plaque_panel", (PLAQUE["w"], PLAQUE["t"], PLAQUE["h"]), (0, 0, panel_z), M["dark"], bevel=0.012))
# fine paper-white border, inset from the edge, on the front face
inset, line = 0.035, 0.012
fy = -PLAQUE["t"] / 2 - 0.004
for sx, sz, lx, lz in (
    (PLAQUE["w"] - 2 * inset, line, 0, PLAQUE["h"] / 2 - inset),
    (PLAQUE["w"] - 2 * inset, line, 0, -PLAQUE["h"] / 2 + inset),
    (line, PLAQUE["h"] - 2 * inset, PLAQUE["w"] / 2 - inset, 0),
    (line, PLAQUE["h"] - 2 * inset, -PLAQUE["w"] / 2 + inset, 0),
):
    plaque_parts.append(box(f"plaque_border{lx:.2f}{lz:.2f}", (sx, 0.008, sz), (lx, fy, panel_z + lz), M["paper"]))
for sx in (-1, 1):
    x = sx * (PLAQUE["w"] / 2 - 0.12)
    plaque_parts.append(box(f"plaque_post{sx}", (0.05, 0.05, PLAQUE["post"] + 0.04), (x, 0.0, (PLAQUE["post"] + 0.04) / 2), M["dark"], bevel=0.008))
    plaque_parts.append(box(f"plaque_foot{sx}", (0.11, 0.11, 0.03), (x, 0.0, 0.015), M["dark"], bevel=0.006))
letters = text_mesh("plaque_text", "QUEENS, NY", args.plaque_font, height=0.1, depth=0.012)
letters.rotation_euler = (math.pi / 2, 0, 0)          # stand the text up on the front face
letters.location = (0, -PLAQUE["t"] / 2 - 0.006, panel_z)
bpy.context.view_layer.objects.active = letters
bpy.ops.object.select_all(action="DESELECT")
letters.select_set(True)
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
letters.data.materials.clear()
letters.data.materials.append(M["paper"])
plaque_parts.append(letters)

# car: group parts by material into a few meshes, then place
by_mat = {}
for o in car_parts:
    by_mat.setdefault(o.data.materials[0].name, []).append(o)
car_root = bpy.data.objects.new("Car", None)
scene.collection.objects.link(car_root)
for mat_name, objs in by_mat.items():
    ob = join(mat_name.replace("Car_", "Car_") + "_Mesh", objs)
    ob.parent = car_root
car_root.location = CAR_LOC
car_root.scale = (CAR_SCALE,) * 3

plaque = join("Plaque", plaque_parts)
plaque.location = (PLAQUE["x"], PLAQUE["y"], 0)
plaque.rotation_euler = (0, 0, PLAQUE["yaw"])

# ----------------------------------------------------------------- bake static atlas (colour × AO)

for o in static_parts:
    bpy.context.view_layer.objects.active = o
    for m in list(o.modifiers):
        bpy.ops.object.modifier_apply(modifier=m.name)
static_ob = join("Static", static_parts)
bpy.ops.object.select_all(action="DESELECT")
static_ob.select_set(True)
bpy.context.view_layer.objects.active = static_ob
bpy.ops.object.mode_set(mode="EDIT")
bpy.ops.mesh.select_all(action="SELECT")
bpy.ops.uv.smart_project(angle_limit=math.radians(66), island_margin=0.004)
bpy.ops.object.mode_set(mode="OBJECT")

atlas = bpy.data.images.new("Static_Bake", args.atlas, args.atlas)
scene.render.engine = "CYCLES"
scene.cycles.device = "CPU"
scene.cycles.samples = args.samples
scene.render.bake.margin = 8

# Temporarily turn every static material into emission = base colour × AO, then bake EMIT.
saved = []
for mat in static_ob.data.materials:
    nt = mat.node_tree
    bsdf = nt.nodes["Principled BSDF"]
    out = nt.nodes["Material Output"]
    color = bsdf.inputs["Base Color"].default_value[:]
    ao = nt.nodes.new("ShaderNodeAmbientOcclusion")
    ao.inputs["Distance"].default_value = 0.55
    ao.samples = 16
    ao.inputs["Color"].default_value = color
    emit = nt.nodes.new("ShaderNodeEmission")
    # keep some light in the creases so it reads as soft studio occlusion, not black
    mix = nt.nodes.new("ShaderNodeMix")
    mix.data_type = "RGBA"
    mix.inputs["Factor"].default_value = 0.78
    mix.inputs[6].default_value = (color[0] * 0.55, color[1] * 0.55, color[2] * 0.55, 1)
    nt.links.new(ao.outputs["Color"], mix.inputs[7])
    nt.links.new(mix.outputs[2], emit.inputs["Color"])
    old = out.inputs["Surface"].links[0].from_socket
    nt.links.new(emit.outputs["Emission"], out.inputs["Surface"])
    tex = nt.nodes.new("ShaderNodeTexImage")
    tex.image = atlas
    nt.nodes.active = tex
    saved.append((mat, old, [ao, emit, mix, tex]))

bpy.ops.object.bake(type="EMIT")
atlas.pack()
# Restore the shared materials (the handle and the car plate use some of them).
for mat, old, nodes in saved:
    nt = mat.node_tree
    nt.links.new(old, nt.nodes["Material Output"].inputs["Surface"])
    for n in nodes:
        nt.nodes.remove(n)

baked = bpy.data.materials.new("Static_Baked")
baked.use_nodes = True
b = baked.node_tree.nodes["Principled BSDF"]
b.inputs["Roughness"].default_value = 0.92
t = baked.node_tree.nodes.new("ShaderNodeTexImage")
t.image = atlas
baked.node_tree.links.new(t.outputs["Color"], b.inputs["Base Color"])
static_ob.data.materials.clear()
static_ob.data.materials.append(baked)

# ----------------------------------------------------------------- preview render (site-like view)

if args.preview:
    world = bpy.data.worlds.new("w")
    world.use_nodes = True
    world.node_tree.nodes["Background"].inputs["Color"].default_value = srgb("#f8f8f3")
    world.node_tree.nodes["Background"].inputs["Strength"].default_value = 0.8
    scene.world = world
    sun_data = bpy.data.lights.new("sun", "SUN")
    sun_data.energy = 3.2
    sun_data.angle = math.radians(2)
    sun = bpy.data.objects.new("sun", sun_data)
    sun.rotation_euler = (math.radians(50), math.radians(-12), math.radians(-35))
    scene.collection.objects.link(sun)
    cam_data = bpy.data.cameras.new("cam")
    cam_data.angle = math.radians(15) * 1.6
    cam = bpy.data.objects.new("cam", cam_data)
    scene.collection.objects.link(cam)
    target = Vector((0.2, 0, 2.0))
    yaw, pitch, dist = math.radians(24), math.radians(14), 29.0
    cam.location = target + Vector((math.sin(yaw) * math.cos(pitch), -math.cos(yaw) * math.cos(pitch), math.sin(pitch))) * dist
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
    scene.camera = cam
    scene.render.resolution_x, scene.render.resolution_y = 1280, 800
    scene.cycles.samples = 48
    scene.view_settings.view_transform = "Khronos PBR Neutral" if "Khronos PBR Neutral" in [
        e.identifier for e in scene.view_settings.bl_rna.properties["view_transform"].enum_items] else "Standard"
    scene.render.filepath = args.preview
    bpy.ops.render.render(write_still=True)
    if args.closeup:
        target = Vector((PLAQUE["x"] - 0.4, PLAQUE["y"], 0.45))
        cam.location = target + Vector((0.6, -3.2, 1.0))
        cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
        cam_data.angle = math.radians(32)
        scene.render.filepath = args.closeup
        bpy.ops.render.render(write_still=True)
    for o in (sun, cam):
        bpy.data.objects.remove(o)

# ----------------------------------------------------------------- export

bpy.ops.object.select_all(action="SELECT")
bpy.ops.export_scene.gltf(
    filepath=args.out,
    export_format="GLB",
    use_selection=False,
    export_apply=True,
    export_yup=True,
    export_image_format="WEBP",
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=7,
    export_materials="EXPORT",
    export_cameras=False,
    export_lights=False,
)
print("EXPORTED", args.out)
