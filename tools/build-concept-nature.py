"""第六島の珊瑚庭と遠景岩礁をBlenderで造形し、配信用形状へ変換する。"""
import bpy, json, math, os, random, sys
import hashlib
from math import sin, cos, pi
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets-src','islands','concept-nature')
DEST=os.path.join(ROOT,'assets','islands','concept-nature.json')
os.makedirs(OUT,exist_ok=True); os.makedirs(os.path.dirname(DEST),exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
FIRST='--first' in sys.argv
PREVIEW=next((arg.split('=',1)[1] for arg in sys.argv if arg.startswith('--preview=')),None)
ADD_FAR='--add-far' in sys.argv
ADD_REEF_FAR='--add-reef-far' in sys.argv
R=random.Random(602)
M={}
def linear(x): return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def mat(id,color,type,roughness=.72):
    m=bpy.data.materials.new(id); m.use_nodes=True
    m.diffuse_color=(*(linear(x) for x in color),1)
    p=next(x for x in m.node_tree.nodes if x.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*(linear(x) for x in color),1)
    p.inputs['Roughness'].default_value=roughness
    M[id]=(m,dict(color=list(color),roughness=roughness,metalness=0,type=type))
mat('reefCoral',(.89,.43,.62),'coral')
mat('yellowSponge',(.98,.72,.31),'coral')
mat('spongeInside',(.51,.28,.10),'coral',.91)
mat('seaweedGreen',(.18,.48,.32),'foliage',.78)
mat('tableBlue',(.25,.54,.61),'coral')
mat('boulderLavender',(.52,.48,.72),'coral')
mat('reefStone',(.57,.66,.68),'stone',.85)
mat('whaleBlue',(.15,.55,.70),'coral',.45)
mat('whaleBelly',(.70,.87,.86),'coral',.53)
mat('whaleGroove',(.52,.70,.73),'coral',.62)
mat('whaleSpot',(.32,.67,.77),'coral',.49)
mat('whaleEye',(.025,.14,.18),'glass',.19)
mat('whaleSmile',(.08,.33,.43),'coral',.67)
mat('whaleEyeLight',(.94,.98,.97),'pearl',.17)
def mesh(name,vs,fs,mid,smooth=True,thickness=0):
    me=bpy.data.meshes.new(name); me.from_pydata(vs,[],fs); me.update()
    ob=bpy.data.objects.new(name,me); bpy.context.collection.objects.link(ob); ob.data.materials.append(M[mid][0])
    if smooth:
        for face in me.polygons: face.use_smooth=True
    if thickness:
        mod=ob.modifiers.new('厚み','SOLIDIFY'); mod.thickness=thickness
    return ob
def sphere(name,center,scale,mid,seg=32,rings=20,noise=0):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=center)
    ob=bpy.context.object; ob.name=name; ob.scale=scale
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    ob.data.materials.append(M[mid][0])
    if noise:
        for v in ob.data.vertices:
            x,y,z=v.co
            f=1+noise*(.45*sin(4*x+2*y)+.33*cos(5*y-3*z)+.22*sin(7*z+2*x))
            v.co*=f
    for p in ob.data.polygons: p.use_smooth=True
    return ob
def organic_tube(name,points,radii,mid,sides=12,phase=0):
    # 各輪の断面を連続させ、幹と枝に金属棒のような接合線を出さない。
    vs=[]; fs=[]; pts=[Vector(p) for p in points]
    for i,p in enumerate(pts):
        tangent=(pts[min(i+1,len(pts)-1)]-pts[max(0,i-1)]).normalized()
        axis=Vector((0,1,0)) if abs(tangent.y)<.92 else Vector((1,0,0))
        u=tangent.cross(axis).normalized(); v=tangent.cross(u).normalized()
        for j in range(sides):
            a=2*pi*j/sides+phase
            ripple=1+.065*sin(3*a+i*.63)
            q=p+radii[i]*ripple*(u*cos(a)+v*sin(a))
            vs.append(tuple(q))
    for i in range(len(pts)-1):
        for j in range(sides):
            k=i*sides+j; nxt=i*sides+(j+1)%sides
            fs.append((k,nxt,nxt+sides,k+sides))
    fs.append(tuple(range(sides-1,-1,-1)))
    fs.append(tuple((len(pts)-1)*sides+j for j in range(sides)))
    return mesh(name,vs,fs,mid)
def path_between(a,b,n=15,bend=0,phase=0):
    pts=[]
    for i in range(n):
        t=i/(n-1)
        pts.append((a[0]+(b[0]-a[0])*t+bend*sin(pi*t)*cos(phase),
                    a[1]+(b[1]-a[1])*t+bend*sin(pi*t)*sin(phase),
                    a[2]+(b[2]-a[2])*t+.10*sin(2*pi*t+phase)*sin(pi*t)))
    return pts
def branchCoral(far=False):
    steps=11 if far else 19
    base=[(.06*sin(i*.4),.04*cos(i*.4),2.72*i/18) for i in range(19)] if not far else [(.06*sin(i*.72),.04*cos(i*.72),2.72*i/10) for i in range(11)]
    organic_tube('連続した珊瑚の幹',base,[.27-.15*i/(steps-1) for i in range(steps)],'reefCoral',8 if far else 12)
    for i in range(14):
        h=.52+.125*i; a=2*pi*i/7+.3*(i%2)
        reach=.69+.31*(i%3)/2
        start=(.04*cos(a),.04*sin(a),h)
        end=(reach*cos(a),reach*sin(a),min(3.0,h+.9+.15*(i%3)))
        count=8 if far else 15
        pts=path_between(start,end,count,.12,a+.5)
        radii=[.135*(1-t)+.045*t for t in [j/(count-1) for j in range(count)]]
        organic_tube('枝珊瑚',pts,radii,'reefCoral',6 if far else 10,a)
        sphere('枝の丸い先',end,(.058,.058,.072),'reefCoral',8 if far else 12,6 if far else 8)
        if i%3==0:
            q=pts[5 if far else 9]; tip=(q[0]+.19*cos(a+.5),q[1]+.19*sin(a+.5),q[2]+.32)
            branch_steps=7 if far else 13
            organic_tube('二股の小枝',path_between(q,tip,branch_steps,.04,a),[.052-.025*j/(branch_steps-1) for j in range(branch_steps)],'reefCoral',6 if far else 8)

def branchCoralFar():
    # 遠景用だけ輪の数を減らし、枝の本数と伸びる方向は原本を保つ。
    branchCoral(far=True)
def hollow_sponge(x,y,h,r,tilt,far=False):
    # 外壁から厚い口縁を経て深い内壁まで一体の管にする。
    vs=[]; fs=[]; sides=16 if far else 32; steps=9 if far else 16
    rings=[]
    for j in range(steps+1):
        t=j/steps; z=h*t
        cx=x+tilt*t*t; cy=y+.12*sin(pi*t)
        rad=r*(1+.06*sin(pi*t))
        rings.append((cx,cy,z,rad))
    # 口縁を丸めて内側へ入る追加輪。
    rings += [(x+tilt,y,h+.045,r*.97),(x+tilt,y,h+.07,r*.83),
              (x+tilt,y,h+.025,r*.67),(x+tilt*.94,y,h-.13,r*.58),
              (x+tilt*.68,y,h-.58,r*.54),(x+tilt*.5,y,h-1.12,r*.46)]
    for cx,cy,z,rad in rings:
        for i in range(sides):
            a=2*pi*i/sides; vs.append((cx+rad*cos(a),cy+rad*sin(a),z))
    for j in range(len(rings)-1):
        for i in range(sides):
            k=j*sides+i; n=j*sides+(i+1)%sides
            fs.append((k,n,n+sides,k+sides))
    fs.append(tuple(range(sides-1,-1,-1)))
    fs.append(tuple((len(rings)-1)*sides+i for i in range(sides)))
    ob=mesh('口の深い管状スポンジ',vs,fs,'yellowSponge')
    ob.data.materials.append(M['spongeInside'][0])
    for j in range(steps+3,len(rings)-1):
        for i in range(sides): ob.data.polygons[j*sides+i].material_index=1
    ob.data.polygons[-1].material_index=1
def tubeSponge(far=False):
    for x,y,h,r,tilt in [(-.52,-.30,2.05,.28,-.10),(.03,-.32,2.5,.31,.12),(.49,-.08,1.8,.29,.10),(-.37,.38,1.46,.25,-.15),(.30,.39,2.12,.27,-.02)]:
        hollow_sponge(x,y,h,r,tilt,far)
    sphere('根元の海綿', (0,0,.22),(.84,.72,.31),'yellowSponge',12 if far else 24,8 if far else 14,noise=.08)
def tubeSpongeFar():
    # 五本の管と口の深さを保ち、遠景だけ断面と高さ方向の輪を減らす。
    tubeSponge(far=True)
def broadSeaweed():
    for k in range(6):
        a=2*pi*k/6+.2; height=2.8+.21*k; width=.57+.045*(k%3)
        vs=[]; fs=[]; steps=20; across=6
        for j in range(steps+1):
            t=j/steps
            cx=(-.72+.29*k)+.42*sin(2.5*t+k)*t*cos(a)
            cy=.22*sin(a)+.40*sin(2.1*t+k)*t*sin(a)
            z=height*t
            w=width*sin(pi*(.05+.9*t))*(.78+.22*t)
            for q in range(across+1):
                u=q/across*2-1
                x=cx+w*u*cos(a+pi/2)
                y=cy+w*u*sin(a+pi/2)+.13*sin(4*pi*t+u*pi+k)*t
                vs.append((x,y,z+.04*sin(pi*u)*sin(2*pi*t)))
        for j in range(steps):
            for q in range(across):
                i=j*(across+1)+q; fs.append((i,i+1,i+across+2,i+across+1))
        mesh('波打つ幅広い海草',vs,fs,'seaweedGreen',True,.045)
    sphere('海草の株元',(0,0,.15),(.46,.48,.22),'seaweedGreen',24,12)
def coral_disc(name,cx,cy,z,r,mid,phase=0):
    sides=48; rings=8; vs=[(cx,cy,z+.13)]
    for j in range(1,rings+1):
        t=j/rings
        for i in range(sides):
            a=2*pi*i/sides
            scallop=1+.065*sin(9*a+phase)+.025*cos(17*a+phase)
            rr=r*t*scallop
            zz=z+.13-.12*t*t+.045*t*t*sin(9*a+phase)
            vs.append((cx+rr*cos(a),cy+rr*sin(a),zz))
    fs=[(0,1+i,1+(i+1)%sides) for i in range(sides)]
    for j in range(rings-1):
        for i in range(sides):
            a=1+j*sides+i; b=1+j*sides+(i+1)%sides
            fs.append((a,b,b+sides,a+sides))
    edge_start=1+(rings-1)*sides
    bottom_start=len(vs)
    for i in range(sides):
        x,y,_=vs[edge_start+i]; vs.append((x,y,z-.15))
    bottom_center=len(vs); vs.append((cx,cy,z-.15))
    for i in range(sides):
        a=edge_start+i; b=edge_start+(i+1)%sides
        c=bottom_start+(i+1)%sides; d=bottom_start+i
        fs.append((a,b,c,d))
        fs.append((bottom_center,c,d))
    ob=mesh(name,vs,fs,mid,False)
    for face in list(ob.data.polygons)[sides*rings:sides*(rings+1)]:
        face.use_smooth=True
    return ob
def tableCoral():
    organic_tube('珊瑚の太い茎',[(0,0,0),(.02,0,.3),(.06,.02,.7),(.09,.04,1.25),(0,.07,1.66)],
                 [.29,.28,.23,.19,.14],'tableBlue',16)
    for x,y,z,r,p in [(-.35,0,.85,1.10,.2),(.4,.05,1.28,1.43,1.2),(0,0,1.78,1.75,2.3)]:
        coral_disc('波形のテーブル珊瑚',x,y,z,r,'tableBlue',p)
def coralBoulder(far=False):
    sphere('不規則な珊瑚岩',(0,0,1.08),(1.43,1.31,1.15),'boulderLavender',28 if far else 48,16 if far else 28,.13)
    for i in range(38 if far else 52):
        a=2*pi*(i*.61803398875%1)
        z=-.75+1.5*((i*.41421356237)%1)
        q=math.sqrt(max(.05,1-z*z))
        x=1.39*q*cos(a); y=1.27*q*sin(a); zz=1.08+1.10*z
        s=.09+.065*((i*7)%5)/4
        sphere('岩肌の小さな珊瑚粒',(x,y,zz),(s,s*.9,s*1.35),'boulderLavender',8 if far else 12,6 if far else 8)
def coralBoulderFar():
    # 大きな岩の外形と小粒の散らばりを残して、遠景用に分割を減らす。
    coralBoulder(far=True)
def reefRockArch():
    # 二層の自然な岩の帯で幅広い棚と奥行のある中央開口を作る。
    for yy,shift in [(-2.2,0),(1.8,.35)]:
        pts=[]; radii=[]
        for i in range(33):
            t=i/32; a=pi*(1-t)
            x=9.0*cos(a)+.35*sin(5*a+shift)
            z=2.0+18.6*sin(a)+.3*cos(7*a+shift)*sin(a)
            if i==0 or i==32: z=0
            pts.append((x,yy+.32*sin(3*a),z))
            radii.append(2.5+.4*sin(3*a+shift)+.25*cos(9*a))
        organic_tube('岩礁の大アーチ',pts,radii,'reefStone',12,shift)
    sphere('上に張り出す広い岩棚',(0,-.25,20.5),(10.6,4.0,2.9),'reefStone',48,24,.11)
    for s in [-1,1]:
        sphere('柱の足元',(s*9,-.1,2.0),(3.4,3.6,2.7),'reefStone',32,20,.12)
        sphere('岩棚の肩',(s*7,.15,17.5),(3.5,3.7,3.0),'reefStone',32,20,.11)
    for i in range(18):
        x=-9+18*(i/17); y=(-1)**i*(2.7+.6*sin(i)); z=19.7+.45*sin(i*1.7)
        sphere('岩棚の起伏',(x,y,z),(.65+.2*(i%3),.8,.45+.15*(i%4)),'reefStone',16,10,.13)

BODY_KNOTS=[(-10.5,.26,.34),(-8.5,.75,.75),(-5,1.65,1.55),(-1,2.50,2.30),
            (4,2.75,2.62),(7.6,2.57,2.47),(9.7,2.18,2.09),(11.0,1.32,1.38),(11.7,.08,.10)]
def body_shape(x):
    for i in range(len(BODY_KNOTS)-1):
        a=BODY_KNOTS[i]; b=BODY_KNOTS[i+1]
        if x<=b[0]:
            t=max(0,min(1,(x-a[0])/(b[0]-a[0]))); t=t*t*(3-2*t)
            return (a[1]+(b[1]-a[1])*t,a[2]+(b[2]-a[2])*t)
    return BODY_KNOTS[-1][1:]
def whale_fin(name,root,tip,chord0,chord1,thick0,mid):
    # 翼断面を連続させ、平板の三角形ではない長い胸びれを作る。
    vs=[]; fs=[]; steps=16; sides=16
    for i in range(steps+1):
        t=i/steps; smooth=t*t*(3-2*t)
        cx=root[0]+(tip[0]-root[0])*smooth+.3*sin(pi*t)
        cy=root[1]+(tip[1]-root[1])*smooth
        cz=root[2]+(tip[2]-root[2])*smooth-.12*sin(pi*t)
        chord=chord0*(1-t)+chord1*t
        thick=thick0*(1-t)+.035*t
        for j in range(sides):
            a=2*pi*j/sides
            vs.append((cx+chord*cos(a),cy+.10*sin(a)*sin(pi*t),cz+thick*sin(a)))
    for i in range(steps):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides
            fs.append((a,a+sides,b+sides,b) if tip[1]>root[1] else (a,b,b+sides,a+sides))
    if tip[1]>root[1]:
        fs.append(tuple(range(sides)))
        fs.append(tuple(steps*sides+j for j in range(sides-1,-1,-1)))
    else:
        fs.append(tuple(range(sides-1,-1,-1)))
        fs.append(tuple(steps*sides+j for j in range(sides)))
    return mesh(name,vs,fs,mid)
def friendlyWhale():
    # 前が太く尾に向かって絞れる横向きの胴。頭は+X、尾は-X。
    vs=[]; fs=[]; sections=56; sides=48
    for i in range(sections+1):
        x=-10.5+22.2*i/sections
        ry,rz=body_shape(x)
        for j in range(sides):
            a=2*pi*j/sides
            vs.append((x,ry*cos(a),3.10+rz*sin(a)))
    for i in range(sections):
        for j in range(sides):
            a=i*sides+j; b=i*sides+(j+1)%sides
            fs.append((a,b,b+sides,a+sides))
    fs.append(tuple(range(sides-1,-1,-1)))
    fs.append(tuple(sections*sides+j for j in range(sides)))
    body=mesh('前が太い鯨の胴',vs,fs,'whaleBlue')
    body.data.materials.append(M['whaleBelly'][0])
    for i in range(sections):
        for j in range(sides):
            a=2*pi*(j+.5)/sides
            if sin(a)<.10: body.data.polygons[i*sides+j].material_index=1
    # 胸びれは前寄りから後方へ長く、左右で同じ形を保つ。
    for sign in [-1,1]:
        whale_fin('長い胸びれ',(3.5,sign*2.25,2.18),(-5.25,sign*3.45,1.08),1.36,.08,.25,'whaleBlue')
        # 尾の左右の葉は胴の尾柄から広がり、端で丸く細くなる。
        whale_fin('左右に広い尾びれ',(-10.35,0,3.17),(-12.45,sign*3.28,3.25),1.02,.07,.18,'whaleBlue')
        sphere('丸い目',(8.32,sign*2.42,3.71),(.22,.13,.22),'whaleEye',24,16)
        sphere('目の光',(8.38,sign*2.56,3.79),(.055,.038,.055),'whaleEyeLight',16,10)
        mouth=[]
        for i in range(16):
            t=i/15; x=8.8+2.3*t
            ry,_=body_shape(x)
            mouth.append((x,sign*(ry+.014),2.57-.12*sin(pi*t)))
        organic_tube('ゆるい口の線',mouth,[.038]*16,'whaleSmile',8)
    # 淡い腹筋の縦溝を体表面に沿わせる。
    for j in range(9):
        a=pi+.16+(pi-.32)*j/8
        pts=[]
        for i in range(25):
            x=-3.8+14.8*i/24; ry,rz=body_shape(x)
            pts.append((x,(ry+.013)*cos(a),3.10+(rz+.013)*sin(a)))
        organic_tube('腹の柔らかい縦溝',pts,[.018]*25,'whaleGroove',8)
    for i in range(22):
        x=-4+12*((i*.61803398875)%1)
        a=.18*pi+.64*pi*((i*.41421356237)%1)
        ry,rz=body_shape(x)
        p=(x,(ry+.014)*cos(a),3.10+(rz+.014)*sin(a))
        s=.055+.045*(i%4)/3
        sphere('背の控えめな斑点',p,(s,s*.7,s*.42),'whaleSpot',12,8)
    organic_tube('背の低い小さな背びれ',[( -4,0,4.55),(-3.4,0,5.10),(-2.9,0,5.22),(-2.55,0,4.86)],
                 [.21,.20,.13,.07],'whaleBlue',12)

BUILDS={k:v for k,v in list(globals().items()) if k in ('branchCoral','branchCoralFar','tubeSponge','tubeSpongeFar','broadSeaweed','tableCoral','coralBoulder','coralBoulderFar','reefRockArch','friendlyWhale')}
SIZES={'branchCoral':[2.5,3,2.5],'tubeSponge':[1.8,2.5,1.8],'broadSeaweed':[2.5,4,2.5],
       'tableCoral':[3.5,2,3.5],'coralBoulder':[3,2.5,3],'reefRockArch':[22,24,8],'friendlyWhale':[24,6,7],
       'branchCoralFar':[2.5,3,2.5],'tubeSpongeFar':[1.8,2.5,1.8],'coralBoulderFar':[3,2.5,3]}
def render(id):
    sc=bpy.context.scene
    sc.world=bpy.data.worlds.new('深い海の背景'); sc.world.use_nodes=True
    bg=sc.world.node_tree.nodes.get('Background'); bg.inputs['Color'].default_value=(.08,.16,.20,1); bg.inputs['Strength'].default_value=.55
    w,h,d=SIZES[id]
    camera_pos=(w*.85,-d*1.6,h*.85)
    if id=='friendlyWhale': camera_pos=(1,-26,11)
    bpy.ops.object.camera_add(location=camera_pos)
    cam=bpy.context.object; cam.name='形状確認カメラ'
    focus=Vector((0,0,h*.45)); cam.rotation_euler=(focus-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'; cam.data.ortho_scale=max(w*1.36,h*1.58)
    sc.camera=cam
    if id=='reefRockArch':
        bpy.ops.object.light_add(type='AREA',location=(-15,-17,36)); bpy.context.object.data.energy=13000; bpy.context.object.data.size=24
        bpy.ops.object.light_add(type='AREA',location=(17,8,30)); bpy.context.object.data.energy=9000; bpy.context.object.data.size=20
    else:
        bpy.ops.object.light_add(type='AREA',location=(-8,-8,16)); bpy.context.object.data.energy=2300; bpy.context.object.data.size=13
        bpy.ops.object.light_add(type='AREA',location=(8,4,11)); bpy.context.object.data.energy=1400; bpy.context.object.data.size=10
        if id=='friendlyWhale':
            bpy.ops.object.light_add(type='AREA',location=(8,-11,1)); bpy.context.object.data.energy=2600; bpy.context.object.data.size=13
    sc.render.engine='CYCLES'; sc.cycles.samples=20
    sc.render.threads_mode='FIXED'; sc.render.threads=4
    sc.render.resolution_x=600; sc.render.resolution_y=520; sc.render.resolution_percentage=100
    sc.render.image_settings.file_format='PNG'; sc.render.filepath=os.path.join(OUT,id+'.png')
    bpy.ops.render.render(write_still=True)
def export(id):
    groups={}; bbox=[float('inf')]*3+[float('-inf')]*3; tris=0; excluded=0
    for ob in [x for x in bpy.context.scene.objects if x.type=='MESH']:
        ev=ob.evaluated_get(bpy.context.evaluated_depsgraph_get()); me=ev.to_mesh(); me.calc_loop_triangles()
        for tri in me.loop_triangles:
            mid=me.materials[me.polygons[tri.polygon_index].material_index].name
            if mid not in groups: groups[mid]=dict(name='static_'+mid,material=mid,positions=[],normals=[],indices=[],seen={})
            g=groups[mid]
            pts=[ob.matrix_world @ me.vertices[i].co for i in tri.vertices]
            if not all(math.isfinite(c) for p in pts for c in p): raise ValueError(id+'/'+ob.name+' の座標が非有限')
            face=(pts[1]-pts[0]).cross(pts[2]-pts[0])
            if face.length_squared<1e-12: excluded+=1; continue
            face.normalize()
            for idx,p in zip(tri.vertices,pts):
                normal=ob.matrix_world.to_3x3() @ me.vertices[idx].normal
                if not all(math.isfinite(c) for c in normal) or normal.length_squared<1e-12: normal=face.copy()
                else: normal.normalize()
                for k in range(3):
                    bbox[k]=min(bbox[k],p[k]); bbox[k+3]=max(bbox[k+3],p[k])
                q=(p.x,p.z,-p.y,normal.x,normal.z,-normal.y)
                key=tuple(round(float(v),5) for v in q)
                if not all(math.isfinite(v) for v in key): raise ValueError(id+'/'+ob.name+' の法線が非有限')
                ix=g['seen'].get(key)
                if ix is None:
                    ix=len(g['positions'])//3; g['seen'][key]=ix
                    g['positions'].extend(key[:3]); g['normals'].extend(key[3:])
                g['indices'].append(ix)
            tris+=1
        ev.to_mesh_clear()
    meshes=[]
    for g in groups.values(): del g['seen']; meshes.append(g)
    return dict(meshes=meshes,size=SIZES[id]),dict(id=id,requestedSize=SIZES[id],bounds=[round(x,3) for x in bbox],triangles=tris,excludedDegenerateTriangles=excluded,meshCount=len(meshes),opening=('中央通過口あり' if id=='reefRockArch' else '該当なし'),blend=id+'.blend',render=id+'.png')

def signature(data):
    return hashlib.sha256(json.dumps(data,sort_keys=True,separators=(',',':'),allow_nan=False).encode('utf-8')).hexdigest()

previous=None; original_signatures={}
if ADD_FAR or ADD_REEF_FAR:
    with open(DEST,encoding='utf-8') as f: previous=json.load(f,parse_constant=lambda value: (_ for _ in ()).throw(ValueError(value)))
    core=set(SIZES)-{'branchCoralFar','tubeSpongeFar','coralBoulderFar'}
    if not core.issubset(previous['assets']) or not set(previous['assets']).issubset(SIZES): raise ValueError('既存の自然素材７点が一致しません')
    generated={'branchCoralFar'} if ADD_FAR else {'tubeSpongeFar','coralBoulderFar'}
    original_signatures={id:signature(asset) for id,asset in previous['assets'].items()}
    for id in generated: original_signatures.pop(id,None)
    material_signature=signature(previous['materials'])
assets={}; reports=[]
for id in ([PREVIEW] if PREVIEW else (['branchCoralFar'] if ADD_FAR else (['tubeSpongeFar','coralBoulderFar'] if ADD_REEF_FAR else (['branchCoral','tubeSponge'] if FIRST else SIZES)))):
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    BUILDS[id]()
    asset,report=export(id); assets[id]=asset; reports.append(report)
    render(id)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,id+'.blend'))
    print('生成:',id,'三角形:',report['triangles'])
if PREVIEW: sys.exit(0)
if ADD_FAR or ADD_REEF_FAR:
    with open(os.path.join(OUT,'geometry-report.json'),encoding='utf-8') as f: old_reports=json.load(f)
    if {r['id'] for r in old_reports}!={*original_signatures,*({id for id in generated if id in previous['assets']})}: raise ValueError('既存の寸法報告が一致しません')
    assets={**previous['assets'],**assets}
    reports=[*(r for r in old_reports if r['id'] not in generated),*reports]
    if any(signature(assets[id])!=old for id,old in original_signatures.items()): raise ValueError('既存の形状が変わりました')
    materials=previous['materials']
    if signature(materials)!=material_signature: raise ValueError('既存の材質が変わりました')
else:
    materials={id:m[1] for id,m in M.items()}
with open(DEST,'w',encoding='utf-8') as f:
    json.dump(dict(version=1,materials=materials,assets=assets),f,separators=(',',':'),allow_nan=False)
with open(os.path.join(OUT,'geometry-report.json'),'w',encoding='utf-8') as f:
    json.dump(reports,f,ensure_ascii=False,indent=2,allow_nan=False)
