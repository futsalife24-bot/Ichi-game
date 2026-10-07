"""Blender のバックグラウンドで、あかりの港町の立体素材をつくる。"""
import bpy
import bmesh
import json
import math
import random
from pathlib import Path
from mathutils import Vector, Matrix

if not bpy.app.background:
    raise RuntimeError('制作はバックグラウンドの Blender で実行してください。')

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets-src' / 'harbor'
OUTPUT = ROOT / 'assets' / 'harbor'
SOURCE.mkdir(parents=True, exist_ok=True)
OUTPUT.mkdir(parents=True, exist_ok=True)
random.seed(810)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for c in list(bpy.data.collections):
    if c.name != 'Collection': bpy.data.collections.remove(c)

def linear(v):
    return v / 12.92 if v <= .04045 else ((v + .055) / 1.055) ** 2.4

def tint(rgb, factor=1):
    return tuple(linear(max(0, min(1, c * factor))) for c in rgb)

mat = bpy.data.materials.new('港町の頂点色')
mat.use_nodes = True
bsdf = mat.node_tree.nodes.get('Principled BSDF')
bsdf.inputs['Roughness'].default_value = .72
attr_node = mat.node_tree.nodes.new('ShaderNodeVertexColor')
attr_node.layer_name = 'HarborColor'
mat.node_tree.links.new(attr_node.outputs['Color'], bsdf.inputs['Base Color'])
PARTS = {}
KEY = ''

CREAM = (.97, .85, .63)
STONE = (.85, .71, .51)
TEAL = (.18, .54, .57)
DEEP = (.09, .25, .28)
GLASS = (.30, .66, .72)
BRICK = (.76, .35, .24)
GOLD = (.94, .66, .27)
BARK = (.44, .26, .18)

def mesh(name, verts, faces, color, smooth=False, colors=None):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(mat)
    attr = data.color_attributes.new(name='HarborColor', type='FLOAT_COLOR', domain='CORNER')
    for p in data.polygons:
        p.use_smooth = smooth
        for li in p.loop_indices:
            vi = data.loops[li].vertex_index
            attr.data[li].color = (*(colors[vi] if colors else tint(color)), 1)
    PARTS.setdefault(KEY, []).append(obj)
    return obj

def box(name, center, size, color, bevel=0, rotation=None):
    # おおきなふちは丸め、小さなレンガは面数をおさえる。
    sx, sy, sz = [v / 2 for v in size]
    bm = bmesh.new()
    bmesh.ops.create_cube(bm, size=2)
    for v in bm.verts: v.co = (v.co.x*sx, v.co.y*sy, v.co.z*sz)
    if bevel:
        bmesh.ops.bevel(bm, geom=list(bm.edges), offset=min(bevel, min(size)*.25), segments=1, affect='EDGES')
    bmesh.ops.recalc_face_normals(bm, faces=list(bm.faces))
    bm.verts.ensure_lookup_table()
    bm.verts.index_update()
    r = rotation or Matrix.Identity(3)
    verts = [Vector(center) + r @ v.co for v in bm.verts]
    faces = [tuple(v.index for v in f.verts) for f in bm.faces]
    bm.free()
    return mesh(name, verts, faces, color)

def tube(name, points, radii, color, sides=8):
    pts = [Vector(p) for p in points]
    verts, faces, colors = [], [], []
    for row, (p, radius) in enumerate(zip(pts, radii)):
        n = (pts[min(row+1,len(pts)-1)]-pts[max(0,row-1)]).normalized()
        a = n.cross(Vector((0,1,0)))
        if a.length < .01: a = n.cross(Vector((1,0,0)))
        a.normalize(); b = n.cross(a).normalized()
        for j in range(sides):
            angle = math.tau*j/sides
            verts.append(p+radius*(a*math.cos(angle)+b*math.sin(angle)))
            colors.append(tint(color, .94+.09*math.cos(angle+.4)))
        if row:
            for j in range(sides):
                a0=(row-1)*sides+j; b0=(row-1)*sides+(j+1)%sides
                faces.append((a0,b0,b0+sides,a0+sides))
    faces += [tuple(reversed(range(sides))), tuple((len(pts)-1)*sides+j for j in range(sides))]
    return mesh(name, verts, faces, color, smooth=True, colors=colors)

def disk(name, center, radius, depth, color, axis=(0,-1,0), sides=32):
    c=Vector(center); n=Vector(axis).normalized()
    return tube(name,[c-n*depth/2,c+n*depth/2],[radius,radius],color,sides)

def ring(name, center, radius, width, color, start=0, end=math.tau, count=24, axis='front'):
    c=Vector(center); verts=[]; faces=[]
    for row in range(count+1):
        a=start+(end-start)*row/count
        for r in [radius-width/2,radius+width/2]:
            if axis=='front': v=Vector((math.cos(a)*r,0,math.sin(a)*r))
            else: v=Vector((math.cos(a)*r,math.sin(a)*r,0))
            verts.append(c+v)
        if row: faces.append((2*row-2,2*row-1,2*row+1,2*row))
    return mesh(name,verts,faces,color)

def leaf(name, at, length, width, color, tilt=0, turn=0, veins=False):
    # おりめと厚みのある葉。表裏を持ち、絵文字や板の画像を使わない。
    r=Matrix.Rotation(turn,3,'Z') @ Matrix.Rotation(tilt,3,'X')
    points=[(0,0,0),(-width*.46,-.035,length*.30),(-width*.5,-.025,length*.56),(-width*.25,-.015,length*.81),(0,0,length),(width*.25,-.015,length*.81),(width*.5,-.025,length*.56),(width*.46,-.035,length*.30),(0,-.12,length*.48),(0,.018,length*.48)]
    verts=[Vector(at)+r@Vector(p) for p in points]
    faces=[]
    for j in range(8):
        faces.append(((j+1)%8,j,8))
        faces.append((j,(j+1)%8,9))
    colors=[tint(color,.90+(.08 if j%2 else 0)) for j in range(8)]+[tint(color,1.10),tint(color,.74)]
    obj=mesh(name,verts,faces,color,colors=colors)
    if veins:
        def p(v): return Vector(at)+r@Vector(v)
        vein=(.92,.84,.43) if color[1]>.4 else (.98,.69,.40)
        tube(name+'・ふとい葉脈',[p((0,-.035,-.16)),p((0,-.13,length*.46)),p((0,-.028,length*.96))],[.026,.019,.006],vein,6)
        for h in [.28,.46,.64]:
            for side in [-1,1]:
                tube(name+'・こえだの葉脈',[p((0,-.126,h*length)),p((side*width*.34,-.06,(h+.12)*length))],[.01,.004],vein,4)
    return obj

def arch_door(x=0,y=-2.52,bottom=.28,width=1.5,height=2.6):
    rad=width/2; shoulder=bottom+height-rad
    vertices=[(x-rad,y,bottom),(x+rad,y,bottom),(x+rad,y,shoulder)]
    vertices += [(x+math.cos(i*math.pi/14)*rad,y,shoulder+math.sin(i*math.pi/14)*rad) for i in range(1,15)]
    mesh('アーチのくぼんだ扉',vertices,[tuple(range(len(vertices)))],DEEP)
    for i in range(5):
        xx=x-width*.4+i*width*.2
        top=shoulder+math.sqrt(max(0,rad*rad-(xx-x)**2))-.08
        box('扉の木のいた',(xx,y-.018,(bottom+top)/2),(width*.18,.038,top-bottom),(.20,.41,.42))
    for side in [-1,1]: box('扉わきの石',(x+side*(rad+.10),y-.045,(bottom+shoulder)/2),(.20,.24,shoulder-bottom),CREAM,.035)
    for i in range(14):
        a=(i+.5)*math.pi/14
        xx=x+math.cos(a)*(rad+.09);zz=shoulder+math.sin(a)*(rad+.09)
        box('アーチを組む石',(xx,y-.045,zz),(.21,.25,.25),CREAM,.025,Matrix.Rotation(a-math.pi/2,3,'Y'))
    disk('まるい真鍮のとって',(x+.34,y-.09,bottom+.90),.074,.09,GOLD,sides=12)
    box('玄関のだん',(x,y-.13,.14),(2.05,.85,.28),STONE,.06)

def window(x,y,z,w=1.18,h=1.45,turn=0,planter=True):
    r=Matrix.Rotation(turn,3,'Z')
    def p(v): return Vector((x,y,z))+r@Vector(v)
    box('窓の奥のかげ',p((0,.045,0)),(w+.22,.11,h+.22),DEEP,.025,r)
    box('青い窓ガラス',p((0,-.025,0)),(w,.075,h),GLASS,0,r)
    for sx in [-1,1]: box('窓のたて枠',p((sx*(w/2+.055),-.11,0)),(.13,.20,h+.25),CREAM,.022,r)
    for sz in [-1,1]: box('窓のよこ枠',p((0,-.11,sz*(h/2+.05))),(w+.24,.20,.12),CREAM,.022,r)
    box('窓のなかの縦枠',p((0,-.10,0)),(.065,.12,h),CREAM,0,r)
    box('窓のなかの横枠',p((0,-.10,.1)),(w,.12,.065),CREAM,0,r)
    mesh('ガラスの大きなひかり',[p((-w*.35,-.072,h*.40)),p((-w*.16,-.072,h*.40)),p((w*.35,-.072,-h*.36)),p((w*.16,-.072,-h*.36))],[(0,1,2,3)],(.66,.86,.81))
    box('窓台の石',p((0,-.16,-h*.5-.14)),(w+.42,.42,.15),STONE,.025,r)
    if planter:
        box('花のプランター',p((0,-.27,-h*.5-.32)),(w+.11,.50,.28),(.55,.28,.20),.04,r)
        for i in range(5):
            at=p((-w*.4+i*w*.20,-.29,-h*.5-.16))
            leaf('窓べの若葉',at,.29,.18,(.32,.55,.31),tilt=.4,turn=i*1.6)
            disk('窓べの花',at+Vector((0,-.05,.18)),.11,.06,[(.98,.73,.24),(.97,.48,.44)][i%2],sides=8)

def brick_walls(w=6.3,d=4.9,h=4.10,base=BRICK):
    box('レンガの下地',(0,0,h/2+.22),(w,d,h),(.67,.37,.28),.08)
    box('石の基壇',(0,0,.22),(w+.22,d+.22,.44),STONE,.07)
    for row in range(12):
        z=.48+row*.30
        for face in range(4):
            span=w if face<2 else d
            for col in range(math.ceil(span/.60)):
                t=-span/2+.30+col*.60+(row%2)*.29
                if t>span/2-.12: continue
                # 正面の扉と窓の下にレンガを重ねない。
                if face==0 and ((abs(t)<.93 and z<3.0) or (abs(abs(t)-2.05)<.77 and .98<z<2.89)): continue
                if face in [2,3] and abs(abs(t)-1.20)<.74 and 1.0<z<2.9: continue
                color=tuple(c*random.uniform(.91,1.10) for c in base)
                if face<2:
                    at=(t,(-1 if face==0 else 1)*(d/2+.015),z);size=(.55,.048,.25)
                else:
                    at=((-1 if face==2 else 1)*(w/2+.015),t,z);size=(.048,.55,.25)
                box('ずらして積んだレンガ',at,size,color)
    for x in [-w/2,w/2]:
        for y in [-d/2,d/2]:
            for i in range(7): box('角をまもる切石',(x,y,.48+i*.53),(.30,.30,.37),CREAM,.028)
    box('軒下の帯',(0,0,4.12),(w+.36,d+.36,.20),CREAM,.03)

def roof(w=7.0,d=5.6,eave=4.2,peak=6.65):
    verts=[(-w/2,-d/2,eave),(w/2,-d/2,eave),(0,-d/2,peak),(-w/2,d/2,eave),(w/2,d/2,eave),(0,d/2,peak)]
    mesh('切妻屋根の下地',verts,[(0,3,5,2),(1,2,5,4),(0,1,4,3)],TEAL)
    # 手前と奥の妻壁を屋根より少し内側へ。
    for yy in [-d/2+.04,d/2-.04]:
        mesh('明るい妻壁',[(-w/2+.05,yy,eave),(w/2-.05,yy,eave),(0,yy,peak-.04)],[(0,1,2) if yy<0 else (0,2,1)],(.93,.73,.47))
    for side in [-1,1]:
        slope=(peak-eave)/(w/2)
        for row in range(7):
            xx=side*(row+.5)*(w/2)/7
            zz=peak-abs(xx)*slope+.055
            for col in range(9):
                yy=-d/2+(col+.5)*d/9
                rot=Matrix.Rotation(side*math.atan(slope),3,'Y')
                box('一枚ずつ重なる青緑の瓦',(xx,yy,zz),((w/2)/7*math.sqrt(1+slope*slope)+.05,d/9-.035,.095),tuple(c*(.90+.16*random.random()) for c in TEAL),.016,rot)
        for yy in [-d/2-.035,d/2+.035]:
            tube('屋根のクリーム色のふち',[(0,yy,peak+.12),(side*w/2,yy,eave+.10)],[.075,.075],CREAM,6)
    tube('屋根の棟',[(0,-d/2-.1,peak+.16),(0,d/2+.1,peak+.16)],[.12,.12],(.17,.42,.46),8)
    disk('妻壁のまる窓',(0,-d/2-.02,5.00),.49,.08,DEEP)
    ring('まる窓の石枠',(0,-d/2-.075,5.0),.49,.14,CREAM)
    box('まる窓の横枠',(0,-d/2-.095,5.0),(.86,.1,.08),CREAM)
    box('まる窓の縦枠',(0,-d/2-.095,5.0),(.08,.1,.86),CREAM)

def house(bakery=False):
    brick_walls(base=(.82,.43,.28) if bakery else BRICK)
    roof(peak=6.45 if bakery else 6.65)
    arch_door(x=1.90 if bakery else 0)
    if bakery:
        window(-.96,-2.52,1.86,w=2.75,h=1.60,planter=False)
        for i in range(9):
            xx=-2.8+(i+.5)*.43
            col=CREAM if i%2 else (.83,.31,.28)
            verts=[(xx-.215,-2.52,3.0),(xx+.215,-2.52,3.0),(xx+.215,-3.5,2.54),(xx-.215,-3.5,2.54)]
            mesh('しましまの日よけ',verts,[(0,3,2,1)],col)
            box('日よけのひらひら',(xx,-3.51,2.43),(.42,.06,.22),col,.035)
        for xx in [-2.84,1.08]: tube('日よけの金の支え',[(xx,-2.6,2.4),(xx,-3.5,2.52)],[.035,.035],GOLD,6)
        box('パン看板の台',(-.95,-2.68,3.52),(2.14,.18,.70),(.26,.40,.38),.1)
        loaf(-.95,-2.86,3.48)
        for i in range(3): loaf(-1.88+i*.83,-2.72,1.38,scale=.36)
    else:
        for x in [-2.05,2.05]: window(x,-2.52,1.96)
        box('玄関のちいさな庇',(0,-2.93,3.18),(2.15,1.05,.16),TEAL,.045,Matrix.Rotation(.13,3,'X'))
        for x in [-.82,.82]: tube('庇のもちおくり',[(x,-2.52,2.77),(x,-3.30,3.06)],[.055,.055],CREAM,6)
    for side in [-1,1]:
        for y in [-1.2,1.2]: window(side*3.21,y,1.95,w=1.12,h=1.36,turn=side*math.pi/2,planter=False)
    box('レンガの煙突',(2.0,.75,5.85),(.70,.70,2.00),BRICK,.04)
    for i in range(5): box('煙突の石の帯',(2.0,.75,5.14+i*.35),(.76,.76,.075),CREAM,.015)
    box('煙突のふた',(2.0,.75,6.85),(.96,.96,.20),STONE,.04)
    box('煙突の黒いくぼみ',(2.0,.75,6.959),(.57,.57,.012),DEEP)

def loaf(x,y,z,scale=1):
    # パンも文字画像を使わず、焼き目と切り込みを立体でつくる。
    pts=[(x-.68*scale,y,z),(x-.40*scale,y-.05*scale,z+.06*scale),(x+.40*scale,y-.05*scale,z+.06*scale),(x+.68*scale,y,z)]
    tube('ふっくらしたパン',pts,[.05*scale,.23*scale,.23*scale,.05*scale],(.93,.64,.25),10)
    for i in range(3): tube('パンの切り込み',[(x+(-.35+i*.33)*scale,y-.23*scale,z-.03*scale),(x+(-.22+i*.33)*scale,y-.26*scale,z+.18*scale)],[.034*scale,.034*scale],(.99,.85,.51),5)

def clock_tower():
    box('時計塔のひろい土台',(0,0,.28),(4.3,4.3,.56),STONE,.08)
    box('時計塔の赤レンガ',(0,0,3.46),(3.3,3.3,6.4),BRICK,.09)
    for row in range(17):
        z=.72+row*.32
        for face in range(4):
            for col in range(5):
                t=-1.30+col*.60+(row%2)*.2
                if t>1.5:continue
                at=(t,-1.67,z) if face==0 else ((t,1.67,z) if face==1 else ((-1.67,t,z) if face==2 else (1.67,t,z)))
                size=(.54,.046,.26) if face<2 else (.046,.54,.26)
                box('時計塔のレンガ',at,size,tuple(c*(.94+random.random()*.14) for c in BRICK))
    for x in [-1.68,1.68]:
        for y in [-1.68,1.68]: box('時計塔の角柱',(x,y,3.40),(.28,.28,6.1),CREAM,.035)
    arch_door(y=-1.74,width=1.38,height=2.5)
    for z in [3.6,6.25]: box('時計塔の切石の帯',(0,0,z),(3.70,3.70,.26),CREAM,.045)
    box('時計の四角い部屋',(0,0,7.32),(3.58,3.58,2.05),(.96,.79,.49),.05)
    for turn in [0,math.pi/2,math.pi,-math.pi/2]:
        r=Matrix.Rotation(turn,3,'Z');center=r@Vector((0,-1.85,7.36));axis=r@Vector((0,-1,0))
        disk('時計の真鍮のわく',center,1.03,.16,GOLD,axis)
        disk('時計の白い文字盤',center+axis*.095,.91,.035,CREAM,axis)
        for i in range(12):
            a=i*math.tau/12
            p=center+r@Vector((math.sin(a)*.73,-.125,math.cos(a)*.73))
            box('時計の目もり',p,(.075,.065,.17 if i%3==0 else .11),DEEP,.012,r@Matrix.Rotation(a,3,'Y'))
        for end in [(.02,.56),(.49,-.22)]:
            tube('時計のはり',[center+axis*.18,center+r@Vector((end[0],-.18,end[1]))],[.050,.028],DEEP,6)
        disk('時計のはりの軸',center+axis*.23,.105,.07,GOLD,axis,12)
    box('時計の上のひさし',(0,0,8.44),(4.05,4.05,.23),CREAM,.04)
    mesh('銅色の四角いとがり屋根',[(-2,-2,8.57),(2,-2,8.57),(2,2,8.57),(-2,2,8.57),(0,0,10.45)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(3,2,1,0)],TEAL)
    for a in range(4):
        x,y=[(-2,-2),(2,-2),(2,2),(-2,2)][a]
        tube('屋根の金の継ぎ目',[(x,y,8.59),(0,0,10.5)],[.045,.045],GOLD,6)
    tube('屋根のてっぺん',[(0,0,10.42),(0,0,10.99)],[.10,.035],GOLD,10)
    disk('風見のまるい飾り',(0,0,10.72),.16,.14,GOLD,axis=(0,0,1),sides=12)

def glasshouse():
    box('温室の石の土台',(0,0,.24),(8.05,6.05,.48),STONE,.07)
    box('温室のこし壁',(0,0,.68),(7.84,5.84,.75),(.76,.45,.29),.04)
    for y in [-2.91,2.91]:
        for i in range(7):
            x=-3.38+i*1.125
            box('大きいガラスの窓',(x,y,2.16),(1.03,.045,2.25),GLASS)
            mesh('窓のひかり',[ (x-.38,y-.029*(1 if y<0 else -1),3.12),(x-.10,y-.029*(1 if y<0 else -1),3.12),(x+.38,y-.029*(1 if y<0 else -1),1.19),(x+.10,y-.029*(1 if y<0 else -1),1.19)],[(0,1,2,3)],(.58,.83,.80))
        for i in range(8):box('温室のたての格子',(-3.94+i*1.125,y,2.15),(.10,.16,2.56),CREAM,.015)
        for z in [.98,2.20,3.36]:box('温室のよこの格子',(0,y,z),(7.95,.17,.10),CREAM,.015)
    for x in [-3.94,3.94]:
        for i in range(5): box('温室わきのガラス',(x,-2.32+i*1.16,2.16),(.04,1.07,2.25),GLASS)
        for i in range(6):box('温室わきのたて格子',(x,-2.91+i*1.16,2.16),(.17,.11,2.56),CREAM,.015)
        for z in [.98,2.20,3.36]:box('温室わきの横格子',(x,0,z),(.17,5.92,.10),CREAM,.015)
    for side in [-1,1]:
        for i in range(7):
            x=-3.94+(i+.5)*7.88/7
            verts=[(x-.54,0,5.17),(x+.54,0,5.17),(x+.54,side*2.98,3.40),(x-.54,side*2.98,3.40)]
            mesh('光をうけるガラスの屋根',verts,[(0,1,2,3) if side>0 else (3,2,1,0)],(.32+.018*(i%3),.66+.018*(i%3),.69))
        for i in range(8):
            x=-3.98+i*7.96/7
            tube('屋根のクリーム色の骨',[(x,0,5.23),(x,side*3.03,3.44)],[.057,.057],CREAM,6)
    for x in [-3.98,3.98]:
        mesh('温室の三角ガラス',[(x,-2.93,3.41),(x,2.93,3.41),(x,0,5.17)],[(0,1,2)],(.32,.63,.65))
        tube('温室の妻壁の格子',[(x,0,3.39),(x,0,5.23)],[.06,.06],CREAM,6)
    tube('温室の屋根の棟',[(-4.13,0,5.24),(4.13,0,5.24)],[.095,.095],TEAL,8)
    arch_door(y=-3.02,width=1.6,height=2.9)
    for x in [-2.3,2.3]:
        box('入口の大きな植木鉢',(x,-3.28,.55),(.82,.82,.88),(.71,.39,.27),.10)
        for i in range(9): leaf('温室の花の葉',(x,-3.28,.88),.64,.32,(.29,.53,.35),tilt=.55,turn=i*2.40)
        for i in range(5):disk('温室の黄色い花',(x+math.sin(i*2.4)*.30,-3.4+math.cos(i*2.4)*.25,1.55),.16,.07,GOLD,sides=9)

def tree(coral=True):
    colors=[(.89,.40,.36),(.96,.56,.43),(.97,.68,.49),(.91,.46,.44)] if coral else [(.95,.68,.22),(.99,.80,.35),(.91,.54,.23),(.97,.86,.52)]
    path=[(0,0,.10),(-.12,.05,1.05),(.06,-.08,2.13),(-.16,.04,3.14),(.09,.04,4.22)]
    radii=[.28,.24,.20,.14,.047]
    tube('枝ぶりの見える曲がった幹',path,radii,BARK,11)
    for i in range(5):
        a=i*math.tau/5
        tube('みちにひろがる根',[(0,0,.22),(.36*math.cos(a),.36*math.sin(a),.10),(.65*math.cos(a+.1),.65*math.sin(a+.1),.025)],[.16,.12,.014],BARK,7)
    clusters=[(-1.00,-.15,3.24),(.98,-.22,3.43),(-.76,.48,4.14),(.75,.48,4.20),(.02,-.37,4.70),(-.32,-.88,3.94),(.75,-.82,3.77),(-.90,.69,3.45)]
    for i,(x,y,z) in enumerate(clusters):
        base=(-.03,0,1.85+(i%3)*.48)
        bend=(x*.60,y*.65,z-.60)
        tube('空が見える枝分かれ',[base,bend,(x,y,z)],[.13,.082,.022],BARK,7)
        for sub in range(3):
            a=sub*2.399+i
            tip=Vector((x+.24*math.cos(a),y+.24*math.sin(a),z+.10*(sub-1)))
            tube('葉房をささえるこえだ',[bend,tip],[.055,.008],BARK,5)
            # 球の樹冠を置かず、ひとつずつ葉を重ね、枝の隙間を残す。
            for j in range(9):
                ang=j*2.399+sub
                at=tip+Vector((math.cos(ang)*(.15+.15*(j%2)),math.sin(ang)*(.15+.15*(j%2)),.08*math.sin(j*1.7)))
                length=.41+.13*random.random()
                leaf('枝先の折り目のある一枚葉',at,length,.34+.07*random.random(),colors[(i+j)%4],tilt=.75+random.random()*.8,turn=ang)
    for i in range(5):
        a=i*1.2
        tube('樹皮の細い溝',[(math.cos(a)*.245,math.sin(a)*.245,.28),(-.10+math.cos(a)*.22,.05+math.sin(a)*.22,1.05),(.06+math.cos(a)*.182,-.08+math.sin(a)*.182,2.13)],[.015,.013,.01],(.31,.19,.14),4)

def collectible(color):
    leaf('あつめる厚みのある葉',(0,0,.17),1.08,.79,color,tilt=.12,turn=-.12,veins=True)

def lantern():
    disk('灯籠の石の足',(0,0,.07),.26,.14,STONE,axis=(0,0,1),sides=12)
    tube('真鍮と青緑の支柱',[(0,0,.12),(0,0,1.23)],[.065,.052],DEEP,10)
    for z in [.28,1.13]:disk('支柱の金のわ',(0,0,z),.095,.07,GOLD,axis=(0,0,1),sides=10)
    box('あたたかい灯籠のガラス',(0,0,1.49),(.32,.32,.48),(.99,.82,.40),.04)
    for x in [-.20,.20]:
        for y in [-.20,.20]:tube('灯籠の四本のわく',[(x,y,1.24),(x*.80,y*.80,1.75)],[.025,.025],DEEP,5)
    box('灯籠のしたの皿',(0,0,1.24),(.49,.49,.07),DEEP,.025)
    mesh('灯籠のとがったふた',[(-.27,-.27,1.75),(.27,-.27,1.75),(.27,.27,1.75),(-.27,.27,1.75),(0,0,1.96)],[(0,1,4),(1,2,4),(2,3,4),(3,0,4),(3,2,1,0)],TEAL)

for key,builder in [('brickHouse',house),('bakery',lambda:house(True)),('clockTower',clock_tower),('glasshouse',glasshouse),('treeCoral',tree),('treeGold',lambda:tree(False)),('leafGreen',lambda:collectible((.36,.69,.39))),('leafAmber',lambda:collectible((.96,.70,.21))),('leafRed',lambda:collectible((.91,.34,.29))),('lantern',lantern)]:
    KEY=key
    builder()
    print('造形済み: '+key,flush=True)

payload={'version':1,'assets':{}}
report={};merged={}
for key,parts in PARTS.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in parts: obj.select_set(True)
    bpy.context.view_layer.objects.active=parts[0]
    bpy.ops.object.join()
    obj=bpy.context.object;obj.name=key;data=obj.data
    ground=min(v.co.z for v in data.vertices)
    for v in data.vertices:v.co.z-=ground
    data.update();data.calc_loop_triangles()
    color=data.color_attributes['HarborColor']
    geometry={'positions':[],'normals':[],'colors':[],'indices':[]};lookup={}
    for tri in data.loop_triangles:
        poly=data.polygons[tri.polygon_index]
        for vi,li in zip(tri.vertices,tri.loops):
            p=data.vertices[vi].co;n=data.vertices[vi].normal if poly.use_smooth else poly.normal;c=color.data[li].color
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

total=sum(r['三角形'] for r in report.values())
assert total<=60000,total
for key in ['treeCoral','treeGold']: assert report[key]['幅高さ奥行m'][0]<=3.8
(OUTPUT/'harbor-kit.json').write_text(json.dumps(payload,separators=(',',':')),encoding='utf-8')
(SOURCE/'geometry-report.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
bpy.ops.object.select_all(action='DESELECT')
for obj in merged.values():obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT/'harbor-kit.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT')

# 素材の原点はそのまま、一覧用の位置だけを動かす。
positions={'brickHouse':(-10,2,0),'bakery':(-2,2,0),'clockTower':(5.0,4,0),'glasshouse':(12,1,0),'treeCoral':(-9,-6,0),'treeGold':(-4,-6,0),'leafGreen':(1.0,-7,0),'leafAmber':(3.0,-7,0),'leafRed':(5.0,-7,0),'lantern':(7.5,-6,0)}
for key,pos in positions.items():merged[key].location=pos
preview=bpy.data.collections.new('プレビュー専用');bpy.context.scene.collection.children.link(preview)
def preview_object(obj):
    for c in list(obj.users_collection):c.objects.unlink(obj)
    preview.objects.link(obj)
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.025))
floor=bpy.context.object;floor.name='プレビューのゆか';preview_object(floor)
fm=bpy.data.materials.new('あたたかい砂色');fm.diffuse_color=(*tint((.89,.86,.76)),1);floor.data.materials.append(fm)
bpy.ops.object.camera_add(location=(24,-38,28))
camera=bpy.context.object;preview_object(camera)
camera.rotation_euler=(Vector((1,0,2.6))-camera.location).to_track_quat('-Z','Y').to_euler()
camera.data.type='ORTHO';camera.data.ortho_scale=35;bpy.context.scene.camera=camera
for location,energy,size in [((-8,-12,23),3800,12),((12,2,17),2200,11)]:
    bpy.ops.object.light_add(type='AREA',location=location)
    lamp=bpy.context.object;preview_object(lamp);lamp.data.energy=energy;lamp.data.shape='DISK';lamp.data.size=size
    lamp.rotation_euler=(Vector((0,0,3))-lamp.location).to_track_quat('-Z','Y').to_euler()
scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.samples=32;scene.cycles.use_denoising=True
scene.world.color=(.38,.38,.38)
scene.view_settings.view_transform='AgX'
scene.render.resolution_x=1900;scene.render.resolution_y=1200;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.filepath=str(SOURCE/'harbor-kit-preview.png')
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'harbor-kit.blend'))
bpy.ops.render.render(write_still=True)
print(json.dumps({'納品':report,'三角形合計':total,'JSONバイト':(OUTPUT/'harbor-kit.json').stat().st_size},ensure_ascii=False),flush=True)
