"""Reproducible, original stylized GLB sample; no external service or photo upload.

Visual reference: public/seed/portrait/505c2b02-6264-45fa-b236-b006a9948cce.png.
Hair, skin, facial hair and white/red polo reference that portrait. The body,
pose and shoes are illustrative, not a reconstruction or an exact likeness.
Run from the repository root: python scripts/generate-figurine.py
"""
import json
import math
import struct
from pathlib import Path

document = {
    'asset': {'version': '2.0', 'generator': 'Portfolio original procedural figurine',
              'extras': {'reference': 'Bundled Jhon portrait; stylized sample, approximate likeness'}},
    'scene': 0, 'scenes': [{'nodes': []}], 'nodes': [], 'meshes': [],
    'materials': [], 'bufferViews': [], 'accessors': [],
}
binary = bytearray()


def accessor(values, kind, component=5126, target=34962):
    while len(binary) % 4:
        binary.append(0)
    offset = len(binary)
    flat = [v for row in values for v in row] if isinstance(values[0], tuple) else values
    binary.extend(struct.pack('<' + ('f' if component == 5126 else 'H') * len(flat), *flat))
    view = len(document['bufferViews'])
    document['bufferViews'].append({'buffer': 0, 'byteOffset': offset, 'byteLength': len(binary)-offset, 'target': target})
    item = {'bufferView': view, 'componentType': component, 'count': len(values), 'type': kind}
    if kind == 'VEC3':
        item.update(min=[min(row[i] for row in values) for i in range(3)],
                    max=[max(row[i] for row in values) for i in range(3)])
    document['accessors'].append(item)
    return len(document['accessors']) - 1


def sphere(theta_max=math.pi, rows=22, columns=32):
    positions, indices = [], []
    for row in range(rows+1):
        theta = theta_max * row / rows
        for col in range(columns+1):
            phi = 2*math.pi*col/columns
            positions.append((math.sin(theta)*math.cos(phi), math.cos(theta), math.sin(theta)*math.sin(phi)))
    for row in range(rows):
        for col in range(columns):
            a = row*(columns+1)+col
            b = a+columns+1
            indices.extend([a, a+1, b, a+1, b+1, b])
    return {'attributes': {'POSITION': accessor(positions, 'VEC3'), 'NORMAL': accessor(positions, 'VEC3')},
            'indices': accessor(indices, 'SCALAR', 5123, 34963)}


shapes = {'round': sphere(), 'cap': sphere(1.62)}
colors = {
    'skin': '#ba8665', 'skinLight': '#ca9877', 'hair': '#181517',
    'white': '#f6f2e9', 'red': '#a82535', 'navy': '#23354b',
    'sole': '#d6d2c9', 'eye': '#241b19', 'iris': '#65412b',
    'pedestal': '#cadcf4', 'lip': '#8f5344',
}
meshes = {}
for name, color in colors.items():
    # glTF baseColorFactor is linear, while the reference swatches are sRGB.
    srgb = [int(color[i:i+2], 16)/255 for i in (1, 3, 5)]
    rgb = [value/12.92 if value <= .04045 else ((value+.055)/1.055)**2.4 for value in srgb]
    material = len(document['materials'])
    document['materials'].append({'name': name, 'pbrMetallicRoughness': {
        'baseColorFactor': rgb+[1], 'metallicFactor': 0, 'roughnessFactor': 0.72}})
    for shape, primitive in shapes.items():
        meshes[(shape, name)] = len(document['meshes'])
        document['meshes'].append({'name': f'{shape}-{name}', 'primitives': [dict(primitive, material=material)]})


def part(name, color, position, scale, tilt=0, shape='round'):
    node = {'name': name, 'mesh': meshes[(shape, color)], 'translation': list(position), 'scale': list(scale)}
    if tilt:
        node['rotation'] = [0, 0, math.sin(tilt/2), math.cos(tilt/2)]
    document['scenes'][0]['nodes'].append(len(document['nodes']))
    document['nodes'].append(node)


part('Display base', 'pedestal', (0, .055, 0), (.64, .055, .43))
for side in (-1, 1):
    x = side*.16
    part('Navy trousers', 'navy', (x, .49, 0), (.145, .37, .17))
    part('Sneaker sole', 'sole', (x, .14, .085), (.17, .065, .255))
    part('White sneaker', 'white', (x, .20, .09), (.165, .1, .235))
    for y in (.22, .25, .28):
        part('Sneaker lace', 'sole', (x, y, .265), (.085, .009, .012))
part('White polo', 'white', (0, 1.04, 0), (.37, .43, .24))
part('Neck', 'skin', (0, 1.49, 0), (.17, .22, .17))
for side in (-1, 1):
    part('Red polo collar', 'red', (side*.105, 1.415, .178), (.13, .085, .045), side*.5)
part('Polo placket', 'white', (0, 1.24, .235), (.035, .15, .018))
for y in (1.34, 1.24, 1.14):
    part('Polo button', 'navy', (0, y, .258), (.012, .012, .008))
part('Portrait red shirt accent', 'red', (-.22, 1.12, .195), (.075, .29, .04), -.38)
part('Small chest emblem', 'navy', (.19, 1.25, .22), (.065, .028, .015))
part('Right white sleeve', 'white', (.38, 1.19, 0), (.145, .22, .19), .3)
part('Right arm', 'skin', (.45, .94, .02), (.09, .23, .1), .2)
part('Right hand', 'skinLight', (.40, .75, .14), (.10, .12, .09), -.2)
part('Left red sleeve', 'red', (-.37, 1.24, 0), (.145, .21, .18), -.6)
part('Raised upper arm', 'skin', (-.54, 1.32, .035), (.10, .22, .10), -.65)
part('Raised forearm', 'skin', (-.62, 1.62, .1), (.09, .23, .09), .3)
part('Greeting hand', 'skinLight', (-.56, 1.82, .2), (.10, .14, .07), -.35)
part('Oversized head', 'skinLight', (0, 2.05, .015), (.58, .64, .51))
for side in (-1, 1):
    part('Ear', 'skin', (side*.565, 2.03, .02), (.09, .14, .09))
    part('Ear inner', 'skinLight', (side*.6, 2.03, .075), (.035, .08, .025))
    x = side*.225
    part('Eye white', 'white', (x, 2.105, .465), (.155, .19, .055))
    part('Brown iris', 'iris', (x+side*.008, 2.095, .513), (.106, .132, .025))
    part('Pupil', 'eye', (x+side*.008, 2.095, .535), (.073, .102, .016))
    part('Eye highlight', 'white', (x-.024, 2.145, .549), (.029, .037, .009))
    part('Eyebrow', 'hair', (x, 2.335, .435), (.15, .033, .025), -side*.08)
part('Nose', 'skin', (0, 1.96, .515), (.065, .075, .08))
part('Small smile', 'lip', (0, 1.795, .473), (.115, .025, .017))
for side in (-1, 1):
    part('Thin mustache', 'hair', (side*.052, 1.86, .49), (.058, .013, .012), side*.12)
part('Chin hair', 'hair', (0, 1.68, .437), (.05, .027, .012))
part('Black hair cap', 'hair', (0, 2.16, -.005), (.60, .60, .53), shape='cap')
for x, y, z, tilt in [(-.42,2.52,.24,-.5),(-.24,2.67,.29,-.5),(-.02,2.71,.24,-.5),
                       (.2,2.67,.27,-.4),(.4,2.54,.29,-.4),(-.3,2.42,.44,-.7),
                       (-.08,2.46,.47,-.7),(.13,2.45,.45,-.6),(.34,2.40,.40,-.5)]:
    part('Tousled hair lock', 'hair', (x,y,z), (.14,.22,.11), tilt)

while len(binary) % 4:
    binary.append(0)
document['buffers'] = [{'byteLength': len(binary)}]
encoded = json.dumps(document, separators=(',', ':')).encode('utf-8')
encoded += b' ' * (-len(encoded) % 4)
glb = struct.pack('<III', 0x46546C67, 2, 12+8+len(encoded)+8+len(binary))
glb += struct.pack('<II', len(encoded), 0x4E4F534A)+encoded
glb += struct.pack('<II', len(binary), 0x004E4942)+binary
target = Path('public/seed/models/jhon-figurine.glb')
target.parent.mkdir(parents=True, exist_ok=True)
target.write_bytes(glb)
print(f'Created {target}: {len(glb):,} bytes, {len(document["nodes"])} parts')
