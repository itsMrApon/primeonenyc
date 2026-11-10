"""
Converts the "Paper & Envelope" FBX (papers-envelopes.zip) to a GLB for the On Track
flight scene (webgl/scenes/PapersScrollScene.ts).

    /Applications/Blender.app/Contents/MacOS/Blender -b -P tools/blender/convert_papers.py -- \
        --fbx "<unzipped>/source/Paper & Envelope.fbx" --tex "<unzipped>/textures" \
        --out public/gl/models/papers/papers.glb [--report]

Every mesh gets one PBR material from the 2K texture set (base colour, normal, roughness;
the ground AO plane is dropped). The pile is centred on the origin, laid flat on the
ground (Blender XY plane, +Z up → glTF +Y up), and scaled so its longest side is 1 unit.
"""

import argparse
import os
import sys

import bpy
from mathutils import Vector

argv = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else []
ap = argparse.ArgumentParser()
ap.add_argument("--fbx", required=True)
ap.add_argument("--tex", required=True)
ap.add_argument("--out", required=True)
ap.add_argument("--report", action="store_true")
args = ap.parse_args(argv)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=args.fbx)

meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]


def world_bounds(objs):
    lo = Vector((1e9, 1e9, 1e9))
    hi = Vector((-1e9, -1e9, -1e9))
    for o in objs:
        for c in o.bound_box:
            w = o.matrix_world @ Vector(c)
            lo = Vector((min(lo[i], w[i]) for i in range(3)))
            hi = Vector((max(hi[i], w[i]) for i in range(3)))
    return lo, hi


print("== objects")
for o in bpy.context.scene.objects:
    extra = ""
    if o.type == "MESH":
        me = o.data
        extra = f"verts={len(me.vertices)} faces={len(me.polygons)} uvs={[uv.name for uv in me.uv_layers]} mats={[m.name for m in me.materials if m]}"
    print(f"  {o.type:6} {o.name!r} parent={o.parent.name if o.parent else None} dims={tuple(round(d, 4) for d in o.dimensions)} {extra}")
lo, hi = world_bounds(meshes)
print("== world bounds", tuple(round(v, 4) for v in lo), tuple(round(v, 4) for v in hi))
if args.report:
    sys.exit(0)

# Drop the ground / AO catcher if present (anything using the ground AO texture or named like a ground).
for o in list(meshes):
    names = [o.name.lower()] + [m.name.lower() for m in o.data.materials if m]
    if any("ground" in n or "shadow" in n or "floor" in n or "plane" in n for n in names):
        print("dropping", o.name)
        bpy.data.objects.remove(o, do_unlink=True)
meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]

# One material from the texture set.
mat = bpy.data.materials.new("Papers")
mat.use_nodes = True
nt = mat.node_tree
bsdf = nt.nodes["Principled BSDF"]


def tex(name, colorspace):
    img = bpy.data.images.load(os.path.join(args.tex, name))
    img.colorspace_settings.name = colorspace
    node = nt.nodes.new("ShaderNodeTexImage")
    node.image = img
    return node


base = tex("Papers_Paper_Envelope_BaseColor.1001.png", "sRGB")
nt.links.new(base.outputs["Color"], bsdf.inputs["Base Color"])
rough = tex("Papers_Paper_Envelope_Roughness.1001.png", "Non-Color")
nt.links.new(rough.outputs["Color"], bsdf.inputs["Roughness"])
nrm = tex("Papers_Paper_Envelope_Normal.1001.png", "Non-Color")
nmap = nt.nodes.new("ShaderNodeNormalMap")
nt.links.new(nrm.outputs["Color"], nmap.inputs["Color"])
nt.links.new(nmap.outputs["Normal"], bsdf.inputs["Normal"])
bsdf.inputs["Metallic"].default_value = 0.0

for o in meshes:
    o.data.materials.clear()
    o.data.materials.append(mat)

# Join into one mesh, centre, lay flat, normalise size.
bpy.ops.object.select_all(action="DESELECT")
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
pile = bpy.context.view_layer.objects.active
pile.name = "Papers"
bpy.ops.object.parent_clear(type="CLEAR_KEEP_TRANSFORM")
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
lo, hi = world_bounds([pile])
size = hi - lo
centre = (lo + hi) / 2
pile.location -= Vector((centre.x, centre.y, lo.z))
bpy.ops.object.transform_apply(location=True)
s = 1.0 / max(size.x, size.y, size.z)
pile.scale = (s, s, s)
bpy.ops.object.transform_apply(scale=True)
lo, hi = world_bounds([pile])
print("== final bounds", tuple(round(v, 4) for v in lo), tuple(round(v, 4) for v in hi))

# Remove empties / cameras / lights.
for o in list(bpy.context.scene.objects):
    if o.type != "MESH":
        bpy.data.objects.remove(o, do_unlink=True)

os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
kw = dict(filepath=os.path.abspath(args.out), export_format="GLB", export_yup=True, export_apply=True)
try:
    bpy.ops.export_scene.gltf(**kw, export_image_format="WEBP")
except TypeError:
    bpy.ops.export_scene.gltf(**kw)
print("== wrote", args.out, os.path.getsize(args.out))
