"""８島の学習用パーツをBlenderで決定的に生成する。"""
import json
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets-src' / 'islands'
OUTPUT = ROOT / 'assets' / 'islands'
OUTPUT.mkdir(parents=True, exist_ok=True)
CATALOG = json.loads((SOURCE / 'parts.json').read_text(encoding='utf-8'))['parts']
SPECS = {p['id']: p for p in CATALOG if p['production'] == '新規'}
assert len(SPECS) == 34

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
for mesh_data in list(bpy.data.meshes):
    bpy.data.meshes.remove(mesh_data)

PALETTE = {
    'wood': (.65, .40, .21), 'dark': (.27, .24, .24),
    'cream': (.96, .87, .64), 'white': (.94, .93, .82),
    'red': (.88, .34, .26), 'gold': (.98, .67, .22),
    'teal': (.31, .64, .62), 'green': (.39, .67, .39),
    'stone': (.68, .69, .64), 'blue': (.36, .61, .85),
}

def linear(c):
    return c / 12.92 if c <= .04045 else ((c + .055) / 1.055) ** 2.4

MATERIALS = {}
for name, rgb in PALETTE.items():
    material = bpy.data.materials.new(name)
    material.use_nodes = True
    material.diffuse_color = (*rgb, 1)
    vertex = material.node_tree.nodes.new('ShaderNodeVertexColor')
    vertex.layer_name = 'IslandColor'
    material.node_tree.links.new(vertex.outputs['Color'], material.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    MATERIALS[name] = material

OBJECTS = {}
PIVOTS = {}
ANCHORS = {}
KEY = ''

def mesh(name, verts, faces, color='wood'):
    data = bpy.data.meshes.new(name)
    data.from_pydata(verts, [], faces)
    data.update()
    obj = bpy.data.objects.new(KEY + '__' + name, data)
    bpy.context.collection.objects.link(obj)
    data.materials.append(MATERIALS[color])
    attr = data.color_attributes.new(name='IslandColor', type='FLOAT_COLOR', domain='CORNER')
    rgb = tuple(linear(c) for c in PALETTE[color])
    for face in data.polygons:
        for loop in face.loop_indices:
            attr.data[loop].color = (*rgb, 1)
    OBJECTS.setdefault(KEY, []).append(obj)
    return obj

def box(name, center, size, color='wood', bevel=None):
    x,y,z = center; w,d,h = size
    a,b,c = w/2,d/2,h/2
    v = [(x-a,y-b,z-c),(x+a,y-b,z-c),(x+a,y+b,z-c),(x-a,y+b,z-c),
         (x-a,y-b,z+c),(x+a,y-b,z+c),(x+a,y+b,z+c),(x-a,y+b,z+c)]
    obj=mesh(name,v,[(3,2,1,0),(4,5,6,7),(0,1,5,4),(1,2,6,5),(2,3,7,6),(3,0,4,7)],color)
    # 外寸を変えず、触れる木製品の角を数センチだけやわらげる。
    width=min(.035,min(size)*.14) if bevel is None else bevel
    if width>.001:
        modifier=obj.modifiers.new('やわらかい角','BEVEL')
        modifier.width=width
        modifier.segments=2
        bpy.context.view_layer.objects.active=obj
        obj.select_set(True)
        bpy.ops.object.modifier_apply(modifier=modifier.name)
        obj.select_set(False)
    return obj

def prism(name, outline, depth, color='cream', z=0):
    # outlineはXZ平面。正面はBlenderの-Y側。
    n=len(outline)
    v=[(x,-depth/2,h+z) for x,h in outline]+[(x,depth/2,h+z) for x,h in outline]
    faces=[tuple(reversed(range(n))),tuple(range(n,2*n))]
    faces.extend((i,(i+1)%n,(i+1)%n+n,i+n) for i in range(n))
    return mesh(name,v,faces,color)

def cylinder(name,center,radius,height,color='wood',sides=12,axis='z'):
    x,y,z=center; verts=[]
    for offset in [-height/2,height/2]:
        for i in range(sides):
            a=2*math.pi*i/sides
            if axis=='z': verts.append((x+radius*math.cos(a),y+radius*math.sin(a),z+offset))
            elif axis=='y': verts.append((x+radius*math.cos(a),y+offset,z+radius*math.sin(a)))
            else: verts.append((x+offset,y+radius*math.cos(a),z+radius*math.sin(a)))
    faces=[tuple(reversed(range(sides))),tuple(range(sides,2*sides))]
    faces.extend((i,(i+1)%sides,(i+1)%sides+sides,i+sides) for i in range(sides))
    return mesh(name,verts,faces,color)

def part(key):
    global KEY
    KEY=key

def display(key,w,h,z,y=-.02):
    part(key+'_display')
    box('さしかえられる表示面',(0,y,z),(w,.018,h),'white')

def table(key,w,h,d,color='wood'):
    part(key)
    for x in [-w*.39,w*.39]:
        for y in [-d*.36,d*.36]: box('四本のあし',(x,y,(h-.12)/2),(.13,.13,h-.12),color)
    box('よこ木',(0,0,h-.20),(w*.85,d*.82,.12),color)
    part(key+'_surface')
    box('あかるい作業面',(0,0,h-.055),(w,d,.11),'cream',.045)

def open_box(key,w,h,d,basket=False):
    part(key)
    t=.06
    box('そこの板',(0,0,t/2),(w,d,t),'wood')
    for x in [-w/2+t/2,w/2-t/2]:box('横の低いふち',(x,0,h/2),(t,d,h),'wood')
    for y in [-d/2+t/2,d/2-t/2]:box('前後の低いふち',(0,y,h/2),(w-2*t,t,h),'wood')
    if basket:
        part(key+'_handle')
        for x in [-w*.34,w*.34]:box('持ち手の柱',(x,0,h*.84),(.045,.045,h*.32),'gold')
        box('持ち手の横棒',(0,0,h),(w*.7,.05,.05),'gold')
    else: display(key,w*.48,h*.26,h*.63,-d/2-.014)

def frame(key,w,h,d,arch=False):
    part(key)
    post_height=h*.72 if arch else h
    for x in [-w/2+.09,w/2-.09]:box('門の柱',(x,0,post_height/2),(.18,d,post_height),'wood')
    if arch:
        outline=[]
        for i in range(13):
            t=math.pi-i*math.pi/12
            outline.append((w*.44*math.cos(t),h*.68+h*.32*math.sin(t)))
        for i in range(13):
            t=i*math.pi/12
            outline.append((w*.35*math.cos(t),h*.68+h*.23*math.sin(t)))
        prism('まるい門のかざり',outline,d,'red')
    else:
        box('門の上',(0,0,h-.13),(w,d,.26),'wood')
    if arch:
        part(key+'_cap')
        cylinder('門のてっぺんの飾り',(0,-d*.52,h*.98),.13,.06,'gold',12,axis='y')
    ANCHORS[key]={'entrance': [0,0,0], 'walkableWidth':round(w-.36,3)}

def roof(key,w,h,d):
    part(key)
    # 屋根の側面を明瞭な山形にする。
    prism('屋根', [(-w/2,h*.67),(0,h),(w/2,h*.67)], d, 'red')

def shelf(key,w,h,d):
    part(key)
    for x in [-w/2+.06,0,w/2-.06]:box('棚の縦板',(x,0,h/2),(.12,d,h),'wood')
    for z in [.07,h*.52,h-.06]:box('棚の段',(0,0,z),(w,d,.12),'cream')

def accent(key,w,h,d):
    """島ごとの輪郭と用具の継ぎ目だけを少量足す。"""
    if key in ('cmBasket','cmCrate','i07Pack','i08CleanupBin'):
        part(key)
        for x in [-w*.43,w*.43]:
            for y in [-d*.40,d*.40]:
                box('角の補強',(x,y,h*.68),(.055,.055,h*.36),'gold')
        for y in [-d/2+.015,d/2-.015]:
            box('ふちの明るい木',(0,y,h-.018),(w,.04,.036),'cream')
    elif key in ('cmPlanBoard','cmSign','i07RouteGate'):
        part(key)
        for x in [-w*.43,w*.43]:
            cylinder('四隅の留め具',(x,-d*.29,h*.73),.035,.02,'teal',8,axis='y')
    elif key=='i04WorkTable':
        part(key)
        for x in [-w*.39,w*.39]:
            box('組み継ぎの木栓',(x,-d*.36,h*.67),(.17,.035,.10),'gold')
            box('足をつなぐ貫',(x*.75,0,h*.19),(.06,d*.75,.07),'dark')
        part(key+'_surface')
        for y in [-d*.38,d*.38]:box('作業面の縁',(0,y,h-.03),(w,.055,.055),'white')
        for y in [-d*.21,-d*.07,d*.07,d*.21]:
            box('天板の木の継ぎ目',(0,y,h+.004),(w*.91,.012,.012),'wood',.002)
    elif key=='i05Stall':
        part(key+'_awning')
        for i in range(6):
            x=-w/2+(i+.5)*w/6
            left=x-w/12;right=x+w/12
            mesh('波打つ布のふち',[(left,-d/2-.015,h-.20),(x,-d/2-.025,h-.37),
                                  (right,-d/2-.015,h-.20),(right,-d/2-.015,h-.14),
                                  (left,-d/2-.015,h-.14)],[(0,1,2,3,4)],
                 'red' if i%2 else 'cream')
            for edge in [left,right]:
                box('ひさしの縫い線',(edge,-d*.40,h-.125),(.012,d*.18,.012),'gold',.002)
        part(key+'_posts')
        for x in [-w*.42,w*.42]:box('柱の帯',(x,-d*.39,h*.69),(.20,.19,.08),'gold')
    elif key=='i06Balance':
        part(key)
        cylinder('支点の円い軸',(0,0,h*.82),.12,.16,'dark',axis='y')
        part(key+'_arm')
        prism('中央の目盛り',[(0,h*.79),(-.10,h*.64),(.10,h*.64)],.04,'red')
        for suffix,x in [('panLeft',-w*.40),('panRight',w*.40)]:
            part(key+'_'+suffix)
            for side in [-1,1]:
                box('皿を支える細い腕',(x+side*d*.20,0,h*.53),(.025,.025,h*.2),'gold')
    elif key=='i07Tent':
        part(key)
        for side in [-1,1]:
            for y in [-d*.48,d*.48]:
                seam=[]
                for t in [0,.28,.67,1]:
                    x=side*w/2*t
                    z=h*(1-t**1.20)+.008
                    seam.extend([(x,y-.008,z),(x,y+.008,z)])
                mesh('布にそった縫い目',seam,[(2*j,2*j+1,2*j+3,2*j+2) for j in range(3)],'gold')
            cylinder('支柱の先',(0,side*d*.49,h*.96),.05,.06,'wood')
        part(key+'_entrance')
        for side in [-1,1]:box('入口の縁取り',(side*w*.20,-d/2-.018,h*.265),(.04,.04,h*.53),'red')
    elif key=='i08Arch':
        part(key+'_cap')
        for i in range(11):
            x=(i-5)*w*.065
            z=h-.02+.14*(1-(x/(w*.36))**2)
            cylinder('弧を描く花飾り',(x,-d*.52,z),.07,.05,
                     'red' if i%3==0 else 'gold',8,axis='y')
        for x in [-w*.37,w*.37]:
            cylinder('柱の丸い飾り',(x,-d*.5,h*.78),.11,.04,'teal',10,axis='y')
        for i in range(24):
            t0=math.pi-i*math.pi/24;t1=math.pi-(i+1)*math.pi/24
            def edge(t,r,zr):return (w*r*math.cos(t),-d*.515,h*.68+h*zr*math.sin(t))
            mesh('門の金のふち',[edge(t0,.405,.275),edge(t1,.405,.275),
                                edge(t1,.39,.26),edge(t0,.39,.26)],[(0,1,2,3)],'gold')
    elif key=='i08Canopy':
        part(key+'_roof')
        for side in [-1,1]:
            cylinder('天幕のあかるい縁',(side*w*.48,0,h*.83),.025,d*.94,'gold',8,axis='y')
        for i in range(7):
            x=-w*.43+i*w*.143
            box('ひさしの短い飾り',(x,-d*.49,h*.82),(.035,.035,.10),'red' if i%2 else 'gold',.004)
    elif key=='i07Bridge':
        part(key)
        for i in range(7):
            x=-w*.43+i*w*.143
            box('橋板の境目',(x,0,h*.56),(.018,d*.80,.012),'dark')
        for suffix,y in [('railLeft',-d*.46),('railRight',d*.46)]:
            part(key+'_'+suffix)
            cylinder('渡れる橋の縄',(0,y,h*.96),.024,w*.94,'cream',8,axis='x')
            for x in [-w*.42,-w*.14,w*.14,w*.42]:
                box('縄を結ぶ細い柱',(x,y,h*.76),(.035,.035,h*.35),'gold',.004)
    elif key=='i05MarketEntrance':
        part(key)
        for x in [-w*.33,w*.33]:
            cylinder('市場の丸い目印',(x,-d*.48,h*.86),.11,.05,'red',10,axis='y')

for key,p in SPECS.items():
    w,h,d=p['target_size_m']
    if key in ('cmBasket','cmCrate','i07Pack','i08CleanupBin'):
        open_box(key,w,h,d,key in ('cmBasket','i07Pack'))
    elif key=='cmTicket':
        part(key);box('一枚の札',(0,0,h/2),(w,d,h),'gold')
    elif key in ('cmPlanBoard','cmSign'):
        part(key);box('低い台',(0,0,.07),(w*.72,d,.14),'wood')
        box('支柱',(0,0,h*.48),(.13,d*.55,h*.80),'wood')
        part(key+'_frame');box('外枠',(0,0,h*.73),(w,d*.55,h*.48),'gold')
        display(key,w*.87,h*.39,h*.73,-d*.29)
    elif key=='i03ReceivingBox':
        table(key,w,h,d)
        display(key,w*.45,h*.24,h*.46,-d/2-.02)
    elif key in ('i04WorkTable','i06ExperimentTable','i08Table'):
        table(key,w,h,d)
    elif key=='i04Triangle':
        part(key)
        # XZではなく床XY上の直角二等辺三角形。２枚で0.8m四方を敷ける。
        v=[(-w/3,-d/3,0),(w*2/3,-d/3,0),(-w/3,d*2/3,0),
           (-w/3,-d/3,h),(w*2/3,-d/3,h),(-w/3,d*2/3,h)]
        mesh('直角三角形',v,[(2,1,0),(3,4,5),(0,1,4,3),(1,2,5,4),(2,0,3,5)],'cream')
        PIVOTS[key]={'position':[0,0,0],'axis':[0,1,0],'purpose':'床面の回転中心'}
    elif key=='i04BuildBase':
        part(key);box('低い土台',(0,0,h/2),(w,d,h),'wood')
        display(key,w*.9,h*.15,h*.94,-d/2-.01)
    elif key=='i04Plank':
        for suffix,length in [('short',1.0),('long',2.0)]:
            part(key if suffix=='long' else key+'_'+suffix);box('同じ断面の板',(0,0,h/2),(length,d,h),'wood')
            ANCHORS[key if suffix=='long' else key+'_'+suffix]={'left':[-length/2,h/2,0],'center':[0,h/2,0],'right':[length/2,h/2,0]}
    elif key=='i04Post':
        part(key);box('柱',(0,0,h/2),(w,d,h),'wood')
        ANCHORS[key]={'top':[0,h,0]}
    elif key=='i04HouseBlocks':
        part(key);box('壁',(0,0,h*.33),(w,d,h*.66),'cream')
        part(key+'_roof');prism('三角屋根',[(-w/2,0),(0,h*.34),(w/2,0)],d,'red',h*.66)
        part(key+'_window');box('窓',(0,-d/2-.01,h*.45),(w*.28,.025,h*.22),'blue')
    elif key in ('i04Shelf','i05DisplayRack'):
        shelf(key,w,h,d)
        display(key,w*.45,h*.16,h*.83,-d/2-.014)
    elif key=='i05Stall':
        table(key,w,.8,d)
        part(key+'_posts')
        for x in [-w*.42,w*.42]:
            for y in [-d*.39,d*.39]:box('屋根の柱',(x,y,1.9),(.13,.13,2.2),'wood')
        part(key+'_awning')
        for i in range(6):
            left=-w/2+i*w/6;right=left+w/6
            verts=[]
            for j in range(5):
                y=-d/2+j*d/4
                sag=.055*math.sin(math.pi*j/4)
                verts.extend([(left,y,h-.12-sag),(right,y,h-.12-sag)])
            mesh('たるみのあるしま模様の布',verts,
                 [(2*j,2*j+1,2*j+3,2*j+2) for j in range(4)],
                 'red' if i%2 else 'cream')
    elif key=='i05Counter':
        table(key,w,h,d)
        part(key+'_zones')
        for x in [-w*.23,w*.23]:box('二つの区画',(x,0,h+.012),(w*.40,d*.72,.025),'white')
    elif key=='i05Awning':
        part(key)
        for x in [-w*.45,w*.45]:box('ひさしの柱',(x,0,.1),(.08,.08,.2),'wood')
        part(key+'_cloth')
        for i in range(6):box('短い布',(-w/2+(i+.5)*w/6,0,h*.78),(w/6,d,h*.44),'red' if i%2 else 'cream')
    elif key in ('i05MarketEntrance','i07RouteGate','i08Arch'):
        frame(key,w,h,d,key=='i08Arch')
        display(key,w*.46,h*.09,h*.87,-d/2-.015)
    elif key=='i06Balance':
        part(key);box('支柱',(0,0,h*.43),(.14,.16,h*.74),'wood');box('土台',(0,0,.07),(w*.42,d,.14),'wood')
        part(key+'_arm');box('はかりの腕',(0,0,h*.82),(w*.82,.10,.10),'gold')
        for suffix,x in [('panLeft',-w*.40),('panRight',w*.40)]:
            part(key+'_'+suffix)
            box('つり糸',(x,0,h*.62),(.025,.025,h*.36),'dark')
            cylinder('皿',(x,0,h*.42),d*.35,.055,'teal')
        PIVOTS[key+'_arm']={'position':[0,h*.82,0],'axis':[0,0,1],'purpose':'針の支点'}
        for suffix,x in [('panLeft',-w*.40),('panRight',w*.40)]:
            PIVOTS[key+'_'+suffix]={'position':[x,h*.79,0],'axis':[0,0,1],'purpose':'皿のつり点'}
    elif key=='i06Weight':
        part(key);cylinder('一個のおもり',(0,0,h/2),w*.48,h,'stone')
        part(key+'_handle');box('おもりのつまみ',(0,0,h*.92),(w*.26,d*.3,h*.16),'dark')
    elif key=='i06WaterTray':
        for suffix,angle in [('trayFlat',0),('traySlope',.10)]:
            part(key if suffix=='trayFlat' else key+'_'+suffix)
            box('水路の底',(0,0,h/2),(w,d,h),'blue')
            for y in [-d/2+.03,d/2-.03]:box('水路のふち',(0,y,h*.72),(w,.06,h*.56),'teal')
            ANCHORS[key if suffix=='trayFlat' else key+'_'+suffix]={'inlet':[-w/2,h/2,0],'outlet':[w/2,h/2,0],'slope':angle}
    elif key=='i06Windmill':
        part(key);box('風車の台',(0,0,h*.45),(.13,d*.75,h*.9),'wood')
        part(key+'_rotor')
        cylinder('回転の軸',(0,-d*.45,h*.78),.08,.09,'dark',axis='y')
        for a in range(4):
            theta=math.pi*a/2
            cx=math.cos(theta)*w*.26; cz=h*.78+math.sin(theta)*w*.26
            box('四枚の羽根',(cx,-d*.48,cz),(.10,.045,w*.42) if a%2==0 else (w*.42,.045,.10),'cream')
        PIVOTS[key+'_rotor']={'position':[0,h*.78,-d*.45],'axis':[0,0,1],'purpose':'羽根の回転軸'}
    elif key=='i07Bridge':
        part(key);box('橋の通行面',(0,0,h*.38),(w,d,h*.34),'wood')
        for x in [-w*.40,w*.40]:
            for y in [-d*.38,d*.38]:box('橋の支え',(x,y,h*.14),(.16,.16,h*.28),'wood')
        for suffix,y in [('railLeft',-d*.46),('railRight',d*.46)]:
            part(key+'_'+suffix);box('低い手すり',(0,y,h*.72),(w,.10,h*.56),'wood')
        ANCHORS[key]={'walkable':[w,d*.8,h*.55]}
    elif key=='i07Tent':
        part(key)
        box('テントの床',(0,0,.012),(w*.88,d*.90,.024),'wood')
        for side in [-1,1]:
            verts=[]
            for y in [-d/2,0,d/2]:
                for t in [0,.28,.67,1]:
                    x=side*w/2*t
                    z=h*(1-t**1.20)-(.04 if y==0 else 0)*math.sin(math.pi*t)
                    verts.append((x,y,z))
            mesh('ゆるくたるむ天幕',verts,
                 [(row*4+j,row*4+j+1,(row+1)*4+j+1,(row+1)*4+j)
                  for row in range(2) for j in range(3)],'cream')
        mesh('うしろの布',[(-w/2,d/2,0),(w/2,d/2,0),(0,d/2,h)],[(0,1,2)],'teal')
        part(key+'_entrance')
        for side in [-1,1]:
            mesh('入口の布のふち',[(0,-d/2-.018,h),(side*w*.08,-d/2-.018,h*.88),
                                (side*w*.49,-d/2-.018,0),(side*w*.42,-d/2-.018,0)],
                 [(0,1,2,3)],'red')
        ANCHORS[key]={'entrance':[0,0,-d/2],'walkableWidth':w*.56}
    elif key=='i08Stage':
        part(key);box('舞台',(0,0,h/2),(w,d,h),'wood')
        part(key+'_slope');prism('低いスロープ',[(-w*.22,0),(w*.22,h),(w*.22,0)],d*.5,'cream')
        ANCHORS[key]={'stageTop':[0,h,0],'rampFoot':[-w*.22,0,-d*.75]}
    elif key=='i08Canopy':
        part(key)
        for x in [-w*.43,w*.43]:
            for y in [-d*.40,d*.40]:box('開いた柱',(x,y,h*.48),(.14,.14,h*.96),'wood')
        part(key+'_roof')
        for side in [-1,1]:
            verts=[]
            for y in [-d/2,0,d/2]:
                for t in [0,.3,.7,1]:
                    verts.append((side*w/2*t,y,h*(1-.18*t**1.4)-(.04 if y==0 else 0)*math.sin(math.pi*t)))
            mesh('ふくらみのある祭りの天幕',verts,
                 [(row*4+j,row*4+j+1,(row+1)*4+j+1,(row+1)*4+j)
                  for row in range(2) for j in range(3)],'cream')
    elif key=='i08Bunting':
        part(key);box('飾りのひも',(0,0,h*.96),(w,.025,.025),'dark')
        part(key+'_flag')
        for i in range(7):
            x=-w*.42+i*w*.14
            prism('一枚ずつの旗',[(x-.11,h*.9),(x+.11,h*.9),(x,h*.20)],d*.3,'red' if i%2 else 'gold')
        PIVOTS[key+'_flag']={'position':[0,h*.96,0],'axis':[1,0,0],'purpose':'旗の吊り点'}
    elif key=='i08DecorationStand':
        part(key);box('飾り台',(0,0,h/2),(w,d,h),'wood')
        part(key+'_surface');box('置ける面',(0,0,h-.025),(w,d,.05),'cream')
    else:
        raise AssertionError(key)
    accent(key,w,h,d)
    print('造形済み: '+key,flush=True)

def export_geometry(obj):
    data=obj.data;data.calc_loop_triangles()
    color=data.color_attributes['IslandColor']
    result={'positions':[],'normals':[],'colors':[],'indices':[]}
    lookup={}
    for tri in data.loop_triangles:
        poly=data.polygons[tri.polygon_index]
        for vi,li in zip(tri.vertices,tri.loops):
            v=data.vertices[vi].co;n=data.vertices[vi].normal if poly.use_smooth else poly.normal
            c=color.data[li].color
            values=tuple(round(float(q),6) for q in (v.x,v.z,-v.y,n.x,n.z,-n.y,c[0],c[1],c[2]))
            if values not in lookup:
                lookup[values]=len(lookup)
                result['positions'].extend(values[:3]);result['normals'].extend(values[3:6]);result['colors'].extend(values[6:])
            result['indices'].append(lookup[values])
    return result

payload={'version':1,'assets':{}}
report={}
MERGED={}
for key,objects in OBJECTS.items():
    bpy.ops.object.select_all(action='DESELECT')
    for obj in objects: obj.select_set(True)
    bpy.context.view_layer.objects.active=objects[0]
    bpy.ops.object.join()
    obj=bpy.context.object;obj.name=key;MERGED[key]=obj
    geometry=export_geometry(obj)
    payload['assets'][key]=geometry
    coords=[v.co for v in obj.data.vertices]
    bounds=[[round(min(v[i] for v in coords),4),round(max(v[i] for v in coords),4)] for i in [0,2,1]]
    report[key]={'triangles':len(geometry['indices'])//3,'vertices':len(geometry['positions'])//3,
                 'bounds':bounds,'size':[round(b[1]-b[0],4) for b in bounds]}

for key in SPECS:
    assert key in payload['assets'], key
totals={}
for key,value in report.items():
    island=key[:3] if key.startswith('i0') else 'common'
    totals[island]=totals.get(island,0)+value['triangles']
assert all(v<=60000 for v in totals.values()),totals

attachments={'version':1,'coordinateSystem':'右手系Y-up、正面+Z','components':{},'anchors':ANCHORS,'pivots':PIVOTS}
for key in SPECS:
    attachments['components'][key]=[x for x in MERGED if x==key or x.startswith(key+'_')]
attachments['squarePair']={
    'asset':'i04Triangle',
    'first':{'position':[-0.8/6,0,0.8/6],'rotationY':0},
    'second':{'position':[0.8/6,0,-0.8/6],'rotationY':math.pi},
    'resultSize':[0.8,0.8],
}
(OUTPUT/'learning-kit.json').write_text(json.dumps(payload,separators=(',',':')),encoding='utf-8')
(OUTPUT/'learning-kit-attachments.json').write_text(json.dumps(attachments,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
(SOURCE/'learning-kit-geometry-report.json').write_text(json.dumps({'parts':report,'islandTriangles':totals,'blender':bpy.app.version_string},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')

# 可動ノードのBlender原点を、付帯データのY-up支点へ合わせる。
for key,pivot in PIVOTS.items():
    point=pivot['position']
    blender_point=Vector((point[0],-point[2],point[1]))
    obj=MERGED[key]
    for vertex in obj.data.vertices:vertex.co-=blender_point
    obj.location=blender_point
    obj.data.update()
bpy.ops.object.select_all(action='DESELECT')
for obj in MERGED.values():obj.select_set(True)
bpy.ops.export_scene.gltf(filepath=str(OUTPUT/'learning-kit.glb'),export_format='GLB',use_selection=True,export_materials='EXPORT')

# 書き出し後だけ一覧に配置し、原点とJSONの座標を保つ。
for index,key in enumerate(SPECS):
    col=index%6;row=index//6
    for component in attachments['components'][key]:
        MERGED[component].location+=Vector((col*5.8,row*5.5,0))
    curve=bpy.data.curves.new(key+'_preview_label','FONT')
    curve.body=key;curve.size=.42;curve.align_x='CENTER'
    label=bpy.data.objects.new(key+'_preview_label',curve)
    bpy.context.collection.objects.link(label)
    label.location=(col*5.8,row*5.5-2.1,.015)

def plain_material(name,rgb):
    mat=bpy.data.materials.new(name)
    mat.diffuse_color=(*rgb,1)
    return mat

bpy.ops.mesh.primitive_plane_add(size=200,location=(14,14,-.04))
floor=bpy.context.object;floor.name='プレビュー専用の床'
floor.data.materials.append(plain_material('砂色の床',(.82,.78,.67)))
bpy.ops.object.light_add(type='AREA',location=(15,6,25))
light=bpy.context.object;light.data.energy=7000;light.data.size=20
bpy.ops.object.camera_add()
camera=bpy.context.object;camera.data.type='ORTHO';camera.data.ortho_scale=39
bpy.context.scene.camera=camera
scene=bpy.context.scene;scene.render.engine='BLENDER_WORKBENCH'
scene.display.shading.color_type='MATERIAL'
scene.display.shading.light='STUDIO'
scene.display.shading.show_shadows=False
scene.render.resolution_x=1200;scene.render.resolution_y=1050;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG'
scene.view_settings.view_transform='Standard'
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'learning-kit.blend'))
for name,location in [('front',(14,-37,27)),('side',(48,14,25)),('top',(14,14,48)),
                      ('three-quarter',(39,-30,32))]:
    camera.location=location
    camera.rotation_euler=(Vector((14,14,0))-camera.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(SOURCE/('learning-kit-'+name+'.png'))
    bpy.ops.render.render(write_still=True)
for island in range(4,9):
    keys=[key for key in SPECS if key.startswith(f'i{island:02d}')]
    visible=set(component for key in keys for component in attachments['components'][key])
    for component,obj in MERGED.items():obj.hide_render=component not in visible
    for obj in bpy.data.objects:
        if obj.name.endswith('_preview_label'):obj.hide_render=True
    for index,key in enumerate(keys):
        for component in attachments['components'][key]:
            obj=MERGED[component]
            pivot=PIVOTS.get(component,{}).get('position',[0,0,0])
            obj.location=Vector((pivot[0]+(index%4)*5.5,-pivot[2]+(index//4)*5.5,pivot[1]))
    camera.location=(20,-17,20)
    camera.rotation_euler=(Vector((8.25,2.5,0))-camera.location).to_track_quat('-Z','Y').to_euler()
    camera.data.ortho_scale=22
    scene.render.resolution_x=1200;scene.render.resolution_y=800
    scene.render.filepath=str(SOURCE/(f'learning-kit-i{island:02d}-detail.png'))
    bpy.ops.render.render(write_still=True)
print(json.dumps({'素材':len(SPECS),'部品':len(MERGED),'三角形':totals,'Blender':bpy.app.version_string},ensure_ascii=False),flush=True)
