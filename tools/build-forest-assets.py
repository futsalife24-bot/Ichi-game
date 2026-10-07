"""Blender のバックグラウンドで、こもれびのしまの森をつくる。"""
import bpy
import json
import math
import random
from pathlib import Path
from mathutils import Vector

if not bpy.app.background:
    raise RuntimeError('この制作スクリプトは独立したバックグラウンドBlenderで実行してください。開いている場面は変更しません。')

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets-src' / 'forest'
OUTPUT = ROOT / 'assets' / 'forest'
SOURCE.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)
random.seed(214)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for collection in list(bpy.data.collections):
    if collection.name != 'Collection':
        bpy.data.collections.remove(collection)

def linear(v):
    return v / 12.92 if v <= 0.04045 else ((v + 0.055) / 1.055) ** 2.4

def tint(rgb, factor=1):
    return tuple(linear(max(0, min(1, c * factor))) for c in rgb)

material = bpy.data.materials.new('もりの頂点色')
material.use_nodes = True
bsdf = material.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value = .9
vertex_color = material.node_tree.nodes.new('ShaderNodeVertexColor')
vertex_color.layer_name = 'WoodlandColor'
material.node_tree.links.new(vertex_color.outputs['Color'], bsdf.inputs['Base Color'])
PARTS = {}
KEY = ''

def mesh(name, verts, faces, color, smooth=True, colors=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(material)
    attr = data.color_attributes.new(name='WoodlandColor', type='FLOAT_COLOR', domain='CORNER')
    for polygon in data.polygons:
        polygon.use_smooth = smooth
        for index in polygon.loop_indices:
            vi = data.loops[index].vertex_index
            rgb = colors[vi] if colors else tint(color)
            attr.data[index].color = (*rgb, 1)
    PARTS.setdefault(KEY, []).append(obj)
    return obj

def tube(name, points, radii, color, sides=10, ridges=.03, caps=True):
    points = [Vector(p) for p in points]
    verts, colors, faces = [], [], []
    for row, (point, radius) in enumerate(zip(points, radii)):
        direction = (points[min(row + 1, len(points) - 1)] - points[max(row - 1, 0)]).normalized()
        across = direction.cross(Vector((0, 1, 0)))
        if across.length < .05:
            across = direction.cross(Vector((1, 0, 0)))
        across.normalize()
        along = direction.cross(across).normalized()
        for side in range(sides):
            angle = side * math.tau / sides
            rr = radius * (1 + ridges * math.sin(side * 2.7 + row * .4))
            position = point + rr * (across * math.cos(angle) + along * math.sin(angle))
            verts.append(position)
            colors.append(tint(color, 1 + .12 * math.sin(side * 2.4) + .03 * row))
        if row:
            for side in range(sides):
                a = (row - 1) * sides + side
                b = (row - 1) * sides + (side + 1) % sides
                faces.append((a, b, b + sides, a + sides))
    if caps:
        faces.append(tuple(reversed(range(sides))))
        faces.append(tuple((len(points) - 1) * sides + side for side in range(sides)))
    return mesh(name, verts, faces, color, colors=colors)

def blob(name, center, scale, color, rings=7, sides=12, phase=0, roughness=.09):
    cx, cy, cz = center
    verts = [(cx, cy, cz - scale[2])]
    colors = [tint(color, .87)]
    for row in range(1, rings):
        lat = -math.pi / 2 + math.pi * row / rings
        for side in range(sides):
            angle = math.tau * side / sides
            wave = 1 + roughness * math.sin(angle * 3 + phase) * math.cos(lat * 2) + roughness * .4 * math.sin(angle * 5 + lat * 4)
            x = math.cos(lat) * math.cos(angle) * scale[0] * wave
            y = math.cos(lat) * math.sin(angle) * scale[1] * wave
            z = math.sin(lat) * scale[2] * (1 + .035 * math.sin(angle * 4))
            verts.append((cx + x, cy + y, cz + z))
            colors.append(tint(color, .96 + .075 * math.sin(lat) + .04 * math.sin(angle * 3 + phase)))
    verts.append((cx, cy, cz + scale[2]))
    colors.append(tint(color, 1.055))
    faces = []
    for side in range(sides):
        faces.append((0, 1 + (side + 1) % sides, 1 + side))
    for row in range(rings - 2):
        for side in range(sides):
            a = 1 + row * sides + side
            b = 1 + row * sides + (side + 1) % sides
            faces.append((a, b, b + sides, a + sides))
    last = 1 + (rings - 2) * sides
    for side in range(sides):
        faces.append((last + side, last + (side + 1) % sides, len(verts) - 1))
    return mesh(name, verts, faces, color, colors=colors)

def leaf_surface(name, center, scale, color, seed, count=16):
    # はのかたまりのひょうめんに、すじとおりめのあるはをかさねる。
    rng=random.Random(seed)
    for i in range(count):
        a=rng.uniform(0,math.tau)
        z=rng.uniform(-.35,.85)
        radial=Vector((math.sqrt(1-z*z)*math.cos(a),math.sqrt(1-z*z)*math.sin(a),z))
        normal=Vector((radial.x/scale[0],radial.y/scale[1],radial.z/scale[2])).normalized()
        at=Vector(center)+Vector((radial.x*scale[0],radial.y*scale[1],radial.z*scale[2]))*1.015
        direction=normal.cross(Vector((0,0,1)))
        if direction.length<.1: direction=normal.cross(Vector((0,1,0)))
        direction.normalize()
        side=normal.cross(direction).normalized()
        size=.18+rng.random()*.10
        verts=[at-direction*size,at-side*size*.42,at+normal*.046,at+direction*size,at+side*size*.42]
        colors=[tint(color,.88),tint(color,1.11),tint(color,1.16),tint(color,1.0),tint(color,.89)]
        mesh(name,verts,[(0,1,2),(1,3,2),(3,4,2),(4,0,2)],color,smooth=False,colors=colors)

BARK = (.48, .32, .19)
BARK_LIGHT = (.58, .40, .24)
MOSS = (.40, .56, .22)

def roots(name, radius=.55, extent=1.35, count=7, bark=BARK):
    for i in range(count):
        a = i * math.tau / count + .18 + .17*math.sin(i*3.7)
        c, s = math.cos(a), math.sin(a)
        reach=extent*(.76+.36*(.5+.5*math.sin(i*4.1)))
        bend=a+.15*math.cos(i*1.8)
        thickness=.82+.23*(.5+.5*math.cos(i*2.2))
        tube(name + '・ひろがるね', [(c * .12, s * .12, .52+.10*math.sin(i*1.8)), (c * radius, s * radius, .25), (math.cos(bend) * reach * .78, math.sin(bend) * reach * .78, .08), (math.cos(bend) * reach, math.sin(bend) * reach, .018)], [r*thickness for r in [.26, .23, .13, .018]], bark, sides=7)

def bark_lines(name, path, radii, color, count=7):
    for i in range(count):
        a = math.tau * i / count
        centers = []
        for p, r in zip(path, radii):
            centers.append((p[0] + math.cos(a) * r * .96, p[1] + math.sin(a) * r * .96, p[2]))
        tube(name + '・きはだのすじ', centers, [.032 if k else .045 for k in range(len(path))], color, sides=4, caps=False)

def oak():
    path = [(0, 0, .12), (.12, .07, 1.1), (.06, .13, 2.3), (.35, .08, 3.4), (.26, .04, 4.45), (.65, .1, 5.45)]
    radii = [.62, .51, .45, .39, .27, .1]
    tube('かし・まがったみき', path, radii, BARK, sides=14, ridges=.11)
    bark_lines('かし', path[:5], radii[:5], (.33, .22, .13),count=11)
    roots('かし')
    clusters = [(-1.6,-.55,5.2,1.5,1.2,1.12), (1.45,-.3,5.8,1.6,1.33,1.15), (-.5,1.12,6.1,1.5,1.6,1.35), (.65,.3,7.05,1.6,1.45,1.35), (-1.45,.2,6.8,1.38,1.3,1.25), (1.8,.8,6.75,1.35,1.3,1.1), (-2.2,.45,5.8,1.15,1.05,.96), (.2,-1.15,6.2,1.48,1.22,1.16), (2.0,-.4,5.0,1.0,.98,.88)]
    for i, (x,y,z,sx,sy,sz) in enumerate(clusters):
        if i < 7:
            tube('かし・ふたまたのえだ',[(.1,.1,2.4 + i % 3 * .4),(x*.53,y*.5,z-1.5),(x,y,z-.3)],[.22,.16,.05], BARK, sides=8)
        color = [(.36,.58,.27),(.42,.63,.30),(.49,.67,.31),(.52,.70,.35)][i%4]
        blob('かし・かさなるは', (x,y,z), (sx,sy,sz), color, rings=8, sides=14, phase=i,roughness=.14)
        leaf_surface('かし・おりめのあるは',(x,y,z),(sx,sy,sz),color,seed=i+12)
        a = i * 1.6
        blob('かし・えださきのは', (x+math.cos(a)*sx*.78,y+math.sin(a)*sy*.75,z-.35), (.53,.48,.46), color, rings=5, sides=8, phase=i)
    # ねもとのこけは、ひかりをうけるふくらみでつくる。
    for i in range(5):
        a = i * 1.35
        blob('かし・ねのこけ',(.48*math.cos(a),.48*math.sin(a),.2),(.35,.23,.16),MOSS,rings=4,sides=8,phase=i)

def birch():
    bark = (.79,.76,.64)
    path = [(0,0,.08),(-.12,0,1.3),(.04,.04,2.6),(-.17,.05,4),(-.02,0,5.3),(.17,.04,6.25)]
    radii = [.38,.28,.25,.20,.14,.045]
    tube('しらかば・ゆるくまがるみき',path,radii,bark,sides=12,ridges=.07)
    roots('しらかば',radius=.34,extent=.95,count=5,bark=bark)
    for i in range(15):
        z = .4 + i * .34
        row = min(4, int(z / 1.3))
        p = path[row]
        a = i * 1.47
        r = radii[row] * .98
        # きはだのよこじまを、みきにそったうすいめんでつくる。
        verts=[]
        for dz in [-.025,.025 + .015 * (i%3)]:
            for da in [-.3,0,.3]:
                verts.append((p[0]+math.cos(a+da)*r,p[1]+math.sin(a+da)*r,z+dz))
        mesh('しらかば・よこじま',verts,[(0,1,4,3),(1,2,5,4)],(.32,.31,.26))
    clusters = [(-1.0,-.25,4.85,1.05,.98,1.08),(1.1,.2,5.2,1.05,.92,1.12),(-.7,.65,6.1,1.1,1.03,1.22),(.62,-.32,6.75,1.1,1.0,1.18),(-.45,-.5,7.1,1.06,.9,1.12),(1.3,.3,6.3,.84,.86,.97),(.05,.8,7.4,.9,.89,1.0)]
    for i,(x,y,z,sx,sy,sz) in enumerate(clusters):
        tube('しらかば・ほそいえだ',[(0,0,2.6+i*.35),(x*.7,y*.7,z-1.1),(x,y,z)],[.14,.075,.025],bark,sides=7)
        col = [(.49,.65,.32),(.57,.71,.39),(.43,.61,.29)][i%3]
        blob('しらかば・まるいは', (x,y,z), (sx,sy,sz),col,rings=8,sides=14,phase=i,roughness=.13)
        leaf_surface('しらかば・おりめのあるは',(x,y,z),(sx,sy,sz),col,seed=i+47,count=13)
        blob('しらかば・はのかさなり',(x+.45,y-.3,z-.3),(.5,.48,.45),col,rings=4,sides=8,phase=i)

def fern():
    for i in range(11):
        angle = i * 2.399
        length = .57 + .26 * (i % 3) / 2
        outward = Vector((math.cos(angle),math.sin(angle),0))
        sideways = Vector((-math.sin(angle),math.cos(angle),0))
        points=[]
        for j in range(8):
            t=j/7
            points.append(outward*length*t+Vector((0,0,.04+math.sin(t*2.25)*(.40+.1*(i%2)))))
        tube('しだ・ほそいくき',points,[.012*(1-j/9) for j in range(8)],(.43,.53,.18),sides=4)
        for j in range(1,8):
            t=j/8
            mid=outward*length*t+Vector((0,0,.04+math.sin(t*2.25)*(.40+.1*(i%2))))
            width=.17*(1-t)**.55
            for side in [-1,1]:
                tip=mid+sideways*width*side+outward*.09+Vector((0,0,.035))
                v=[mid-outward*.035,mid+sideways*width*.44*side-outward*.018+Vector((0,0,.026)),tip,mid+sideways*width*.5*side+outward*.055+Vector((0,0,.038)),mid+outward*.025]
                face=(4,3,2,1,0) if side==1 else (0,1,2,3,4)
                mesh('しだ・いちまいのは',v,[face],(.33+.025*(j%2),.57+.025*(i%3),.25),smooth=False)

def rock(tall=False):
    sx,sy,sz=(.77,.65,1.55) if tall else (1.05,.78,.84)
    obj=blob('こけいし・いしのかたまり',(0,0,sz*.44),(sx,sy,sz*.58),(.57,.60,.51),rings=6,sides=11,roughness=.18)
    for vert in obj.data.vertices:
        if vert.co.z < .04: vert.co.z=.035
    for poly in obj.data.polygons: poly.use_smooth=False
    for i in range(6):
        a=i*1.04
        blob('こけいし・こけのあつみ',(math.cos(a)*sx*.45,math.sin(a)*sy*.4,sz*(.81+.02*(i%3))),(.36,.31,.11),(.41+.02*(i%3),.55+.02*(i%3),.27),rings=4,sides=8,phase=i)
    # いしのわれめに、ちいさなくぼみのかげをおく。
    x=-sx*.4
    tube('こけいし・われめ',[(x,-sy*.71,sz*.76),(x+.12,-sy*.91,sz*.57),(x+.07,-sy*.91,sz*.35),(x+.25,-sy*.69,sz*.18)],[.018,.018,.014,.006],(.35,.39,.34),sides=4)

def cut_disk(name,center,radius,normal=(0,0,1),rings=6):
    n=Vector(normal).normalized()
    u=n.cross(Vector((0,1,0)))
    if u.length<.1:u=n.cross(Vector((1,0,0)))
    u.normalize();v=n.cross(u)
    c=Vector(center)
    verts=[c]
    faces=[];colors=[tint((.69,.49,.28))]
    sides=24
    for row in range(1,rings*2+1):
        r=radius*row/(rings*2)
        for j in range(sides):
            a=j*math.tau/sides
            rr=r*(1+.032*math.sin(a*3+row*.15))
            verts.append(c+(u*math.cos(a)+v*math.sin(a))*rr)
            colors.append(tint((.76,.57,.34) if row%2 else (.57,.39,.22)))
        if row==1:
            for j in range(sides): faces.append((0,1+j,1+(j+1)%sides))
        else:
            for j in range(sides):
                a=1+(row-2)*sides+j;b=1+(row-2)*sides+(j+1)%sides
                faces.append((a,b,b+sides,a+sides))
    mesh(name,verts,faces,(.75,.55,.31),smooth=False,colors=colors)

def stump():
    tube('きりかぶ・きはだ',[(0,0,.05),(.02,0,.38),(-.02,.02,.78),(0,0,.9)],[.56,.48,.45,.46],BARK,sides=16,ridges=.12,caps=False)
    roots('きりかぶ',radius=.48,extent=.98,count=6)
    cut_disk('きりかぶ・ねんりん',(0,0,.905),.46)
    for i in range(9):
        a=i*math.tau/9
        tube('きりかぶ・ふかいすじ',[(math.cos(a)*.54,math.sin(a)*.54,.1),(math.cos(a)*.48,math.sin(a)*.48,.4),(math.cos(a)*.45,math.sin(a)*.45,.85)],[.019,.025,.014],(.34,.23,.14),sides=4)
    for i in range(3):blob('きりかぶ・こけ',(.4-i*.2,.28,.5-i*.13),(.22,.17,.15),MOSS,rings=4,sides=8)

def log():
    points=[(-1.6,0,.36),(-.8,.04,.4),(0,-.03,.46),(.8,.02,.4),(1.55,0,.35)]
    tube('たおれぎ・ふといみき',points,[.32,.36,.4,.35,.3],BARK,sides=16,ridges=.14,caps=False)
    cut_disk('たおれぎ・ひだりのねんりん',(-1.605,0,.36),.318,normal=(-1,0,0),rings=5)
    cut_disk('たおれぎ・みぎのねんりん',(1.555,0,.35),.298,normal=(1,0,0),rings=5)
    for i in range(8):
        a=i*math.tau/8
        tube('たおれぎ・かわのすじ',[(x,y+math.cos(a)*r*.99,z+math.sin(a)*r*.99) for (x,y,z),r in zip(points,[.32,.36,.4,.35,.3])],[.025]*5,(.37,.25,.14),sides=4,caps=False)
    tube('たおれぎ・おれたえだ',[(.15,.05,.65),(.3,.18,.9),(.4,.23,1.1)],[.16,.12,.10],BARK,sides=9)
    cut_disk('たおれぎ・えだのきりくち',(.4,.23,1.1),.1,normal=(.1,.05,.2),rings=3)
    for i in range(7):blob('たおれぎ・こけのじゅうたん',(-1.1+i*.34,.05,.71+.05*math.sin(i)),(.30,.25,.11),(.39,.55,.23),rings=4,sides=8,phase=i)
    for i in range(3):
        blob('たおれぎ・さるのこしかけ',(-.5+i*.4,-.35,.4+i*.07),(.2,.2,.055),(.80,.61,.39),rings=4,sides=8)

for key, builder in [('oak',oak),('birch',birch),('fern',fern),('rock',rock),('rockTall',lambda:rock(True)),('stump',stump),('log',log)]:
    KEY=key
    builder()

# ゲームには、かげ・いろ・なめらかさをたもったひとつのかたまりをわたす。
payload={'version':1,'assets':{}}
report={}
merged={}
for key,parts in PARTS.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts:obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    obj=bpy.context.object
    obj.name=key
    data=obj.data
    ground=min(vertex.co.z for vertex in data.vertices)
    for vertex in data.vertices:vertex.co.z-=ground
    data.update()
    data.calc_loop_triangles()
    color=data.color_attributes['WoodlandColor']
    geometry={'positions':[],'normals':[],'colors':[],'indices':[]}
    lookup={}
    for tri in data.loop_triangles:
        poly=data.polygons[tri.polygon_index]
        for vi,li in zip(tri.vertices,tri.loops):
            p=data.vertices[vi].co
            n=data.vertices[vi].normal if poly.use_smooth else poly.normal
            c=color.data[li].color
            values=tuple(round(float(q),5) for q in (p.x,p.z,-p.y,n.x,n.z,-n.y,c[0],c[1],c[2]))
            if values not in lookup:
                lookup[values]=len(lookup)
                geometry['positions'].extend(values[:3]);geometry['normals'].extend(values[3:6]);geometry['colors'].extend(values[6:])
            geometry['indices'].append(lookup[values])
    payload['assets'][key]=geometry
    coords=[v.co for v in data.vertices]
    bounds=[round(max(v[i] for v in coords)-min(v[i] for v in coords),3) for i in [0,2,1]]
    report[key]={'三角形':len(geometry['indices'])//3,'頂点':len(geometry['positions'])//3,'幅高さ奥行m':bounds}
    merged[key]=obj

assert report['oak']['三角形']<=5000
assert report['birch']['三角形']<=5000
assert sum(r['三角形'] for r in report.values())<=30000
(OUTPUT/'woodland-kit.json').write_text(json.dumps(payload,separators=(',',':')),encoding='utf-8')
(SOURCE/'geometry-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# GLB は、げんてんがそろったそざいとしてほぞんする。
bpy.ops.object.select_all(action='DESELECT')
for obj in merged.values():obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT/'woodland-kit.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT')

# ならべてみくらべるプレビュー。げんぽんには各そざいのげんてんをのこす。
for key,pos in {'oak':(-4.4,1,0),'birch':(3.5,1.1,0),'fern':(-1.7,-3,0),'rock':(1.0,-3.8,0),'rockTall':(3.4,-3.7,0),'stump':(-4.0,-3.6,0),'log':(-.5,-5.4,0)}.items():
    merged[key].location=pos

preview_collection=bpy.data.collections.new('プレビュー専用')
bpy.context.scene.collection.children.link(preview_collection)
def preview_object(obj):
    for collection in list(obj.users_collection):collection.objects.unlink(obj)
    preview_collection.objects.link(obj)

bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.025))
floor=bpy.context.object;floor.name='プレビューのゆか';preview_object(floor)
floor_mat=bpy.data.materials.new('あたたかいはいけい');floor_mat.diffuse_color=(*tint((.88,.88,.76)),1);floor.data.materials.append(floor_mat)
bpy.ops.object.camera_add(location=(15,-25,17))
camera=bpy.context.object;preview_object(camera)
direction=Vector((0,-.6,3.3))-camera.location
camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=16.7;bpy.context.scene.camera=camera
for location,energy,size in [((-6,-10,17),2100,9),((8,1,12),1100,8)]:
    bpy.ops.object.light_add(type='AREA',location=location)
    lamp=bpy.context.object;preview_object(lamp);lamp.data.energy=energy;lamp.data.shape='DISK';lamp.data.size=size
    lamp.rotation_euler=(Vector((0,0,3))-lamp.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=40;scene.cycles.use_denoising=True
scene.world.color=(.35,.35,.35)
scene.view_settings.view_transform='AgX'
scene.render.resolution_x=1400;scene.render.resolution_y=1100;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.render.filepath=str(SOURCE/'woodland-kit-preview.png')
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'woodland-kit.blend'))
bpy.ops.render.render(write_still=True)
print(json.dumps({'納品':report,'三角形合計':sum(r['三角形'] for r in report.values()),'JSONバイト':(OUTPUT/'woodland-kit.json').stat().st_size},ensure_ascii=False))
