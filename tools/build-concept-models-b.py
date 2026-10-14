"""第五〜第八島のコンセプト主役を作り、原本と配信用形状を書き出す。"""
import bpy, math, json, os, sys, hashlib
from mathutils import Vector
from math import sin, cos, pi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets-src', 'islands', 'concept-models-b')
DEST = os.path.join(ROOT, 'assets', 'islands', 'concept-models-b.json')
os.makedirs(OUT, exist_ok=True)
os.makedirs(os.path.dirname(DEST), exist_ok=True)
bpy.context.preferences.filepaths.save_version=0
FIRST = '--first' in sys.argv
PREVIEW=next((a.split('=',1)[1] for a in sys.argv if a.startswith('--preview=')),None)
UPDATE=next((a.split('=',1)[1] for a in sys.argv if a.startswith('--update=')),None)
M = {}
def srgb_linear(x):
    return x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4
def mat(n,c,t='stone',r=.68,metal=0):
    a=bpy.data.materials.new(n); a.diffuse_color=(*(srgb_linear(x) for x in c),1); a.use_nodes=True
    p=next(x for x in a.node_tree.nodes if x.type=='BSDF_PRINCIPLED')
    p.inputs['Base Color'].default_value=(*(srgb_linear(x) for x in c),1)
    p.inputs['Roughness'].default_value=r; p.inputs['Metallic'].default_value=metal
    M[n]=(a,dict(color=list(c),roughness=r,metalness=metal,type=t))
for spec in [
 ('basket',(.62,.35,.15),'wood',.72,0),('basketLight',(.86,.55,.25),'wood',.68,0),('woodDark',(.24,.13,.08),'wood',.77,0),
 ('roseCloth',(.94,.46,.44),'cloth',.86,0),('pinkCloth',(.99,.66,.66),'cloth',.88,0),('yellowCloth',(.98,.77,.28),'cloth',.86,0),
 ('ochre',(.84,.57,.32),'plaster',.87,0),('cream',(.96,.86,.69),'plaster',.88,0),('white',(.95,.96,.91),'plaster',.83,0),
 ('turquoise',(.05,.51,.55),'plaster',.63,0),('blue',(.08,.34,.75),'roof',.38,0),('blueDark',(.04,.20,.48),'roof',.43,0),
 ('tile',(.10,.57,.63),'stone',.53,0),('tileWhite',(.90,.81,.61),'stone',.57,0),('coralPink',(.96,.43,.53),'coral',.78,0),
 ('coralLavender',(.59,.46,.75),'coral',.76,0),('coralCream',(.99,.75,.56),'coral',.73,0),
 ('shell',(.88,.54,.50),'pearl',.42,0),('shellInner',(.98,.73,.77),'pearl',.31,0),('pearl',(.96,.91,.82),'pearl',.17,.02),
 ('gold',(.93,.63,.16),'metal',.28,.65),('red',(.70,.19,.20),'roof',.52,0),('redLight',(.88,.40,.34),'roof',.52,0),
 ('mango',(.99,.57,.22),'plaster',.84,0),('coralWall',(.91,.43,.38),'plaster',.84,0),('fabric',(.96,.94,.84),'cloth',.85,0),
 ('leaf',(.28,.55,.32),'foliage',.78,0),('orange',(.98,.49,.08),'blossom',.51,0),('apple',(.80,.14,.12),'blossom',.47,0),
 ('lemon',(.98,.78,.18),'blossom',.51,0),('lime',(.42,.69,.20),'blossom',.51,0),('plum',(.48,.19,.46),'blossom',.49,0),
 ('light',(.99,.87,.42),'glass',.18,0)]: mat(*spec)

def use(o,n,m):
    o.name=n; o.data.materials.clear(); o.data.materials.append(M[m][0]); return o
def bevel(o,w=.08,seg=3):
    mod=o.modifiers.new('丸い縁','BEVEL'); mod.width=w; mod.segments=seg
    mod=o.modifiers.new('なめらかな法線','WEIGHTED_NORMAL'); return o
def cube(n,loc,scale,m,b=.05):
    bpy.ops.mesh.primitive_cube_add(size=1,location=loc); o=use(bpy.context.object,n,m); o.dimensions=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if b: bevel(o,b)
    return o
def cyl(n,loc,r,depth,m,vertices=32,b=.04,axis=None):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=loc); o=use(bpy.context.object,n,m)
    if axis: o.rotation_euler=axis
    if b: bevel(o,b)
    return o
def sphere(n,loc,scale,m,seg=24,rings=12):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc); o=use(bpy.context.object,n,m); o.scale=scale; bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    for p in o.data.polygons: p.use_smooth=True
    return o
def cone(n,loc,r1,r2,h,m,vert=32):
    bpy.ops.mesh.primitive_cone_add(vertices=vert,radius1=r1,radius2=r2,depth=h,location=loc); return use(bpy.context.object,n,m)
def tube(n,pts,r,m,res=8):
    c=bpy.data.curves.new(n,'CURVE'); c.dimensions='3D'; c.resolution_u=12; c.bevel_depth=r; c.bevel_resolution=3
    p=c.splines.new('POLY'); p.points.add(len(pts)-1)
    for q,v in zip(p.points,pts): q.co=(*v,1)
    o=bpy.data.objects.new(n,c); bpy.context.collection.objects.link(o); use(o,n,m)
    bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active=o; o.select_set(True)
    bpy.ops.object.convert(target='MESH'); o.select_set(False); return o
def arc(n,rx,rz,zbase,y,r,m,start=0,end=pi,steps=28):
    return tube(n,[(rx*cos(start+(end-start)*i/steps),y,zbase+rz*sin(start+(end-start)*i/steps)) for i in range(steps+1)],r,m)
def panel(n,points,m,thick=.06):
    # 頂点の両面を作り、布にも厚みと影を与える。
    N=len(points); vs=[tuple(v) for v in points]+[(v[0],v[1]+thick,v[2]) for v in points]
    fs=[tuple(range(N-1,-1,-1)),tuple(range(N,2*N))]+[(i,(i+1)%N,(i+1)%N+N,i+N) for i in range(N)]
    me=bpy.data.meshes.new(n); me.from_pydata(vs,[],fs); me.update(); ob=bpy.data.objects.new(n,me); bpy.context.collection.objects.link(ob); return use(ob,n,m)
def radial(n,outer,inner,zs,m,count=40):
    vs=[]
    for i in range(count):
        a=2*pi*i/count; vs.append((outer*cos(a),outer*sin(a),zs[0])); vs.append((inner*cos(a),inner*sin(a),zs[1]))
    fs=[(2*i,2*((i+1)%count),2*((i+1)%count)+1,2*i+1) for i in range(count)]
    me=bpy.data.meshes.new(n); me.from_pydata(vs,[],fs); me.update(); ob=bpy.data.objects.new(n,me); bpy.context.collection.objects.link(ob); return use(ob,n,m)
def roof_sector(n,r,zedge,zpeak,a0,a1,m):
    pts=[(0,0,zpeak)]
    for j in range(9):
        a=a0+(a1-a0)*j/8; pts.append((r*cos(a),r*sin(a),zedge-.18*sin(pi*j/8)))
    return panel(n,pts,m,.08)
def cloth_petal(n,a0,a1,m):
    vs=[]; rows=8; cols=8
    for j in range(rows+1):
        t=j/rows
        for i in range(cols+1):
            u=i/cols; a=a0+(a1-a0)*u
            rr=10.9*t*(1+.025*sin(pi*u))
            z=10.35-3.45*t*t-.28*t*sin(pi*u)
            vs.append((rr*cos(a),.75*rr*sin(a),z))
    fs=[]
    for j in range(rows):
        for i in range(cols):
            k=j*(cols+1)+i; fs.append((k,k+1,k+cols+2,k+cols+1))
    me=bpy.data.meshes.new(n); me.from_pydata(vs,[],fs); me.update(); o=bpy.data.objects.new(n,me); bpy.context.collection.objects.link(o); use(o,n,m)
    mod=o.modifiers.new('布の厚み','SOLIDIFY'); mod.thickness=.11
    return o
def arch_gateway(x,y,w,h,depth,m,tag):
    # 左右の柱と丸い輪を分け、通過部には面を作らない。
    foot=h-w/2
    cube(tag+'左',(x-w/2-.23,y,foot/2),(.46,depth,foot),m,.12)
    cube(tag+'右',(x+w/2+.23,y,foot/2),(.46,depth,foot),m,.12)
    pts=[(x+w/2*cos(a),y,foot+w/2*sin(a)) for a in [pi*i/32 for i in range(33)]]
    tube(tag+'丸い縁',pts,.24,m)
def fruit_cluster(x,y,z):
    for i in range(7):
        a=2*pi*i/7; sphere('果物',(x+.28*cos(a),y+.18*sin(a),z+.04*(i%2)),(.18,.17,.18),'orange' if i%2 else 'apple',12,8)
def oval_ring(n,rx,ry,z,r,m,phase=0,cx=0,cy=0):
    return tube(n,[(cx+rx*cos(2*pi*i/72+phase),cy+ry*sin(2*pi*i/72+phase),z) for i in range(73)],r,m)
def fruit_bowl(x,y,z,scale=1):
    cyl('編みかごの底',(x,y,z+.11*scale),.77*scale,.21*scale,'basket',24,.07)
    oval_ring('小かごの太い縁',.77*scale,.77*scale,z+.37*scale,.085*scale,'basketLight',cx=x,cy=y)
    for i in range(12):
        a=2*pi*i/12; xx=x+.45*scale*cos(a); yy=y+.40*scale*sin(a)
        color=['apple','orange','lemon','lime','plum'][i%5]
        sphere('山盛りの果実',(xx,yy,z+(.42+.12*(i%3))*scale),(.22*scale,.21*scale,.20*scale),color,12,8)
    sphere('中央の果実',(x,y,z+.70*scale),(.25*scale,.24*scale,.24*scale),'lemon',12,8)
def lantern(x,y,z):
    tube('吊りランタンの鎖',[(x,y,z+.65),(x,y,z+.28)],.035,'gold')
    sphere('ランタンの光',(x,y,z),(.24,.24,.34),'light',16,10)
    for i in range(6):
        a=2*pi*i/6
        tube('ランタンの金の格子',[(x+.24*cos(a),y+.24*sin(a),z-.26),(x+.24*cos(a),y+.24*sin(a),z+.28)],.035,'gold')
    cyl('ランタンの蓋',(x,y,z+.35),.28,.10,'gold',16,.03)
def build_greatFruitMarket():
    # 低い丸階段の上に、厚い編み軒と八本の支柱を置く。
    for r,z,h in [(9.6,.10,.20),(9.0,.28,.35),(8.35,.48,.40)]:
        cyl('市場の低い丸階段',(0,0,z),r,h,'cream',64,.11)
    for i in range(8):
        a=pi/8+2*pi*i/8; x=9.05*cos(a); y=6.65*sin(a)
        cyl('太いかご支柱',(x,y,3.4),.49,5.9,'basketLight',24,.14)
        cyl('支柱の石台',(x,y,.69),.70,.54,'tileWhite',24,.10)
        for zz in [1.0,5.55,6.12]:
            cyl('支柱の編み輪',(x,y,zz),.56,.12,'basket',24,.05)
        lantern(x*.89,y*.88,4.9)
    for z,rx,ry,r in [(5.6,9.15,6.75,.29),(6.07,9.85,7.20,.31),(6.60,10.45,7.75,.32),(6.98,10.75,8.05,.24)]:
        oval_ring('かごの厚い多段編み軒',rx,ry,z,r,'basketLight')
    for i in range(56):
        a=2*pi*i/56; b=a+.23
        pts=[(9.12*cos(a),6.73*sin(a),5.56),(9.83*cos(b),7.18*sin(b),6.08),
             (10.42*cos(a),7.72*sin(a),6.61),(10.73*cos(b),8.03*sin(b),6.98)]
        tube('交差する編み帯',pts,.11,'basket' if i%2 else 'basketLight')
    for i in range(16):
        a=2*pi*i/16
        tube('屋根裏の放射梁',[(0,0,9.8),(6.2*cos(a),4.6*sin(a),7.1),(10.2*cos(a),7.5*sin(a),6.6)],.13,'basketLight')
    # 一本の目印になる編み取っ手は市場の前面を大きく跨ぐ。
    for yy in [-5]:
        arc('太い編みかご取っ手',11.3,11.3,5.2,yy,.36,'basketLight')
        for strand in range(3):
            pts=[]
            for i in range(85):
                a=pi*i/84; tw=19*a+strand*2*pi/3
                pts.append(((11.3+.42*cos(tw))*cos(a),yy+.43*sin(tw),5.2+(11.3+.42*cos(tw))*sin(a)))
            tube('取っ手の編み帯',pts,.075,'basket')
    # ういた はしを のこさず、かごの あみぶちへ つなぐ。
    for side in [-1,1]:
        joins=[(side*11.3,-5,5.2),(side*10.6,-5,5.5),
               (side*9.4,-5,6.45),(side*8.45,-5,6.98)]
        tube('取っ手から編み軒へつながる首',joins,.36,'basketLight')
        for strand in range(3):
            points=[]
            for j in range(49):
                t=j/48; section=min(2,int(t*3)); k=t*3-section
                p=joins[section]; q=joins[section+1]; twist=t*5*pi+strand*2*pi/3
                points.append((p[0]+(q[0]-p[0])*k,p[1]+.42*sin(twist),
                               p[2]+(q[2]-p[2])*k+.42*cos(twist)))
            tube('首のつながる編み帯',points,.075,'basket')
    for k in range(12):
        a=2*pi*k/12; cloth_petal('花びらの布屋根',a,a+2*pi/12,['pinkCloth','roseCloth','yellowCloth'][k%3])
        tube('布の縫い目',[(10.9*t*cos(a),.75*10.9*t*sin(a),10.35-3.45*t*t) for t in [i/20 for i in range(21)]],.035,'cream')
    for a in [-2.5,-.6,.6,2.5]:
        x=9.6*cos(a); y=7.0*sin(a)
        panel('黄色の垂れ布',[(x,y,6.8),(x+1.5*cos(a),y+1.1*sin(a),6.6),
              (x+2.6*cos(a),y+2.2*sin(a),4.8),(x+1.8*cos(a),y+1.9*sin(a),4.4),
              (x+.7*cos(a),y+1.0*sin(a),5.1)],'yellowCloth',.07)
    for i in range(24):
        a=2*pi*i/24; x=10.72*cos(a); y=8.0*sin(a)
        sphere('屋根縁の花',(x,y,7.0),(.18,.18,.18),'coralPink',12,8)
    sphere('果実の頂飾り',(0,0,10.65),(1.45,1.45,1.0),'yellowCloth',24,12)
    for x in [-6.7,6.7]:
        for y in [-3.5,0,3.5]:
            cube('陳列台',(x,y,1.10),(2.45,1.65,1.22),'basket',.14)
            cube('台の天板',(x,y,1.77),(2.75,1.87,.22),'basketLight',.11)
            for xx in [x-.65,x+.65]: fruit_bowl(xx,y,1.93,.72)
            for j in range(7):
                cube('台の幾何学タイル',(x-1.1+j*.36,y-.85,1.08),(.25,.06,.27),'tile' if j%2 else 'tileWhite',.025)
    for x,y in [(-7.1,-5.1),(7.1,-5.1),(-7.1,5.0),(7.1,5.0)]:
        fruit_bowl(x,y,.80,1.0)
    # 中央の通過帯は幅約５mを空け、奥の店まで視線を通す。
def build_moroccanStall():
    for x in [-2.7,2.7]: cube('黄土壁',(x,0,2.25),(.6,1.8,4.5),'ochre',.13)
    arch_gateway(0,-.55,4.5,4.4,.9,'cream','売場の')
    cube('背壁',(0,.85,2.05),(5.6,.32,4.1),'ochre',.12)
    cube('売り台',(0,-1.05,.95),(4.8,1.35,1.55),'basket',.12)
    cube('売り台の厚い天板',(0,-1.05,1.80),(5.1,1.56,.20),'basketLight',.08)
    for i in range(13):
        x=-2.3+i*.38
        cube('幾何学タイルの帯',(x,-1.78,1.1),(.31,.07,.35),'tile' if i%2 else 'tileWhite',.025)
    for x in [-1.65,-.55,.55,1.65]: fruit_bowl(x,-1.30,1.91,.69)
    for i in range(8):
        x0=-3+i*.75; x1=x0+.75
        panel('縞の日よけ',[(x0,-1.25,4.65),(x1,-1.25,4.65),
              (x1,-3.2,3.55),(x0+.375,-3.25,3.43),(x0,-3.2,3.55)],
              'roseCloth' if i%2 else 'fabric',.07)
        tube('布のふさ',[(x0+.375,-3.23,3.48),(x0+.375,-3.23,3.20)],.035,'yellowCloth')
    for x in [-2.25,2.25]:
        cyl('陶器のつぼ',(x,-2.0,.35),.28,.68,'tile',16,.06)
        sphere('つぼの丸い肩',(x,-2.0,.70),(.30,.30,.22),'tileWhite',16,10)
    lantern(-2.5,-2.45,2.48)
    lantern(2.5,-2.45,2.48)
def build_moroccanHouse():
    cube('黄土色の家',(0,.3,4),(7.7,5.5,8),'cream',.28)
    arch_gateway(0,-2.55,2.2,3.7,.16,'ochre','玄関')
    cube('扉の暗い奥',(0,-2.51,1.95),(2.15,.09,3.62),'blueDark',.09)
    cube('青緑の扉',(0,-2.59,1.95),(1.8,.10,3.42),'turquoise',.09)
    sphere('扉の取っ手',(.65,-2.65,1.85),(.12,.07,.12),'gold')
    for x in [-.72,.72]:
        cube('扉の浮彫り',(x,-2.69,1.9),(.07,.06,2.75),'tileWhite',.025)
    for z in [1.18,1.85,2.52]:
        cube('扉の横の浮彫り',(0,-2.69,z),(1.45,.06,.055),'tileWhite',.02)
    tube('上窓の丸い縁',[(.75*cos(pi*i/24),-2.56,5.7+.75*sin(pi*i/24)) for i in range(25)],.12,'ochre')
    cube('上窓の青い奥',(0,-2.51,5.2),(1.3,.09,1.0),'turquoise',.04)
    for x in [-2.7,2.7]:
        arch_gateway(x,-2.55,1.25,2.5,.13,'ochre','窓')
        cube('窓の奥',(x,-2.48,1.15),(1.0,.07,2.1),'turquoise',.07)
    cube('屋上の縁',(0,.3,8.35),(8,5.8,.4),'ochre',.14)
    cube('小さなテラスの床',(0,-2.82,6.53),(4.5,1.35,.30),'tileWhite',.10)
    for x in [-2.0,-1.0,0,1.0,2.0]:
        cube('テラスの白い欄干',(x,-3.37,7.0),(.19,.18,.86),'cream',.05)
    tube('テラスの手すり',[(-2.2,-3.38,7.45),(2.2,-3.38,7.45)],.11,'cream')
    for x in [-3.70,3.70]:
        cube('角の立体石枠',(x,-2.50,4),(.36,.39,7.65),'ochre',.09)
        for z in [1.0,2.3,3.6,4.9,6.2,7.5]:
            cube('角石の節',(x,-2.70,z),(.51,.17,.20),'tileWhite',.045)
    for i in range(15):
        x=-3.4+i*.49
        cube('屋根下のタイルフリーズ',(x,-2.49,7.75),(.37,.08,.34),'tile' if i%2 else 'tileWhite',.025)
    for x in [-2.7,2.7]:
        tube('側窓の丸い縁',[(x+.48*cos(pi*i/20),-2.56,5.0+.48*sin(pi*i/20)) for i in range(21)],.10,'ochre')
        cube('側窓の青い奥',(x,-2.51,4.7),(.70,.08,.75),'turquoise',.04)
def shell_mesh(n,scale,upper,m):
    # 扇の縁を波打たせて、放射状のふくらみを実面にする。
    if not upper:
        vs=[(0,0,.62)]; rows=16; cols=64
        for j in range(1,rows+1):
            r=j/rows
            for i in range(cols):
                a=2*pi*i/cols
                edge=1+.028*cos(14*a)
                vs.append((scale[0]*r*cos(a)*edge,scale[1]*1.8*r*sin(a),.62+1.0*r*r+.09*r*cos(14*a)))
        fs=[(0,1+i,1+(i+1)%cols) for i in range(cols)]
        for j in range(rows-1):
            for i in range(cols):
                a=1+j*cols+i; b=1+j*cols+(i+1)%cols
                fs.append((a,b,b+cols,a+cols))
        me=bpy.data.meshes.new(n); me.from_pydata(vs,[],fs); me.update(); o=bpy.data.objects.new(n,me); bpy.context.collection.objects.link(o); use(o,n,m)
        for face in me.polygons: face.use_smooth=True
        mod=o.modifiers.new('殻の厚み','SOLIDIFY'); mod.thickness=.23
        b=o.modifiers.new('丸い縁','BEVEL'); b.width=.07; b.segments=2
        return
    vs=[(0,1.3,2.1)]; rows=14; cols=64
    for j in range(1,rows+1):
        r=j/rows
        for i in range(cols+1):
            a=pi*i/cols
            edge=1+.035*cos(i/cols*pi*14)
            x=scale[0]*r*cos(a)*edge
            z=scale[2]*(r*sin(a)*.8+.22*r*r+.025*cos(a*14)*r)
            y=scale[1]*(r*r*.52+.09*sin(a*14)*r)
            if upper: z=2.1+z; y=y+1.3
            else: z=1.1-z*.33; y=y-1.2
            vs.append((x,y,z))
    fs=[(0,1+i,2+i) for i in range(cols)]
    for j in range(rows-1):
        for i in range(cols):
            a=1+j*(cols+1)+i; fs.append((a,a+1,a+cols+2,a+cols+1))
    me=bpy.data.meshes.new(n); me.from_pydata(vs,[],fs); me.update(); o=bpy.data.objects.new(n,me); bpy.context.collection.objects.link(o); use(o,n,m)
    for face in me.polygons: face.use_smooth=True
    s=o.modifiers.new('殻の厚み','SOLIDIFY'); s.thickness=.20
    b=o.modifiers.new('丸い縁','BEVEL'); b.width=.07; b.segments=2
def build_greatPearlShell():
    shell_mesh('上の開いた貝殻',(7.3,2,8.2),True,'shellInner')
    shell_mesh('下の貝殻',(7.0,2,4),False,'shell')
    tube('貝殻の厚い縁',[(7.3*cos(pi*i/64),1.3+2*(.52+.09*sin(pi*i/64*14)),2.1+8.2*(.8*sin(pi*i/64)+.22+.025*cos(pi*i/64*14))) for i in range(65)],.17,'shell')
    for i in range(15):
        a=pi*i/14
        tube('殻の放射骨',[(0,1.35,2.1),(2.9*cos(a),1.65,2.1+3.5*sin(a)+1.2),(6.9*cos(a),2.1,2.1+6.6*sin(a)+1.3)],.075,'shell')
    sphere('乳白色の真珠',(0,-.55,2.85),(1.55,1.55,1.55),'pearl',64,40)
    cyl('真珠の台座',(0,-.55,1.05),2.1,.75,'shellInner',40,.17)
def build_coralArch():
    # 幹の内縁は左右とも二メートル以上空け、砂道の見通しを残す。
    def growth(n,points,radii,m):
        c=bpy.data.curves.new(n,'CURVE'); c.dimensions='3D'; c.resolution_u=16
        c.bevel_depth=1; c.bevel_resolution=5; c.use_fill_caps=True
        sp=c.splines.new('BEZIER'); sp.bezier_points.add(len(points)-1)
        for bp,p,r in zip(sp.bezier_points,points,radii):
            bp.co=p; bp.radius=r; bp.handle_left_type='AUTO'; bp.handle_right_type='AUTO'
        o=bpy.data.objects.new(n,c); bpy.context.collection.objects.link(o); use(o,n,m)
        bpy.ops.object.select_all(action='DESELECT'); bpy.context.view_layer.objects.active=o; o.select_set(True)
        bpy.ops.object.convert(target='MESH'); o.select_set(False)
        for f in o.data.polygons: f.use_smooth=True
    for s in [-1,1]:
        trunk=[(s*3.55,.15,.04),(s*3.65,.10,1.35),(s*3.52,.00,2.75),
               (s*3.28,.06,4.15),(s*2.80,.18,5.38),(s*2.05,.28,6.50),
               (s*1.03,.38,7.25),(0,.42,7.48)]
        growth('太い曲線の珊瑚幹',trunk,[.93,.96,.87,.80,.72,.66,.59,.56],'coralPink')
        growth('外側に重なる珊瑚の太い幹',
               [(s*4.25,-.62,.08),(s*4.30,-.70,1.42),(s*4.10,-.66,2.82),
                (s*3.78,-.56,4.20),(s*3.16,-.31,5.57),(s*2.22,.01,6.78)],
               [.55,.64,.66,.57,.46,.24],'coralPink')
        growth('前に伸びる珊瑚の支幹',
               [(s*3.54,-.79,.03),(s*3.59,-.92,1.48),(s*3.55,-.88,2.65),
                (s*3.38,-.64,3.82),(s*3.06,-.39,4.86)],
               [.47,.54,.49,.42,.17],'coralLavender')
        for k in range(13):
            h=.55+k*.47
            x=s*(3.56-.020*h*h-.010*h*h*h)
            side=1 if k%2 else -1
            y=.10+side*.26
            outward=s*(.48+.17*(k%3))
            tip=(x+outward*.92,y+side*(.50+.12*(k%4)),h+1.25+.16*(k%3))
            mid=(x+outward*.56,y+side*.32,h+.70)
            m='coralCream' if k%7==0 else 'coralLavender' if k%3==0 else 'coralPink'
            growth('珊瑚の曲がる枝',[(x,y,h),mid,tip],[.28,.23,.075],m)
            sphere('丸い珊瑚の枝先',tip,(.18,.17,.20),m,16,10)
            if k%2==0:
                p2=(mid[0]+s*.45,mid[1]-side*.27,mid[2]+.70)
                growth('分岐した小枝',[mid,(mid[0]+s*.25,mid[1]-side*.17,mid[2]+.36),p2],[.13,.105,.045],m)
        for k in range(105):
            h=.20+(k%21)*.31; a=2*pi*((k*11)%23)/23
            x=s*(3.57-.018*h*h-.010*h*h*h)+.76*cos(a)
            y=.10+.74*sin(a)
            if s*x<2.50: continue
            rr=.16+.048*(k%5)
            sphere('珊瑚の小さな群体',(x,y,h),(rr,rr*.78,rr*1.12),'coralLavender' if k%11==0 else 'coralPink',16,10)
        for dx,dy,r in [(.8,.15,.68),(.30,-.74,.57),(-.37,.69,.48)]:
            sphere('珊瑚の根元の塊',(s*(3.55+dx),dy,.42),(r,r*.9,.52),'coralPink',20,12)
    sphere('つながる珊瑚の冠',(0,.42,7.48),(.60,.60,.54),'coralPink',20,12)
def build_spiralShellSeat():
    # 厚い乳白の殻を実際にくり抜き、前から奥へ続く休憩穴を作る。
    body=sphere('巻き貝のふくらむ殻',(-.12,.31,1.48),(1.56,1.04,1.28),'pearl',56,36)
    cutter=sphere('開口のくり抜き用',(.77,-.52,.92),(.82,1.02,.67),'shellInner',56,36)
    mod=body.modifiers.new('奥へ入る貝の開口','BOOLEAN');mod.operation='DIFFERENCE';mod.solver='EXACT';mod.object=cutter
    bpy.context.view_layer.objects.active=body
    bpy.ops.object.modifier_apply(modifier=mod.name)
    bpy.data.objects.remove(cutter,do_unlink=True)
    for face in body.data.polygons: face.use_smooth=True
    # 前面のらせんは、中心から外へ太くなりながら殻の奥へ溶け込む立体。
    points=[]; radii=[]
    for i in range(97):
        t=i/96; a=-pi/4+4*pi*t; r=.08+1.28*t**1.08
        points.append(Vector((-.35+r*cos(a),-.81+.22*t,1.58+r*sin(a))))
        radii.append(.10+.20*t)
    sides=12; vertices=[]; faces=[]
    for i,p in enumerate(points):
        tangent=(points[min(i+1,96)]-points[max(0,i-1)]).normalized()
        u=tangent.cross(Vector((0,1,0))).normalized();v=tangent.cross(u).normalized()
        for j in range(sides):
            a=2*pi*j/sides; q=p+radii[i]*(u*cos(a)+v*sin(a))
            vertices.append(tuple(q))
    for i in range(96):
        for j in range(sides):
            k=i*sides+j;n=i*sides+(j+1)%sides
            faces.append((k,n,n+sides,k+sides))
    faces.append(tuple(range(sides-1,-1,-1)))
    faces.append(tuple(96*sides+j for j in range(sides)))
    me=bpy.data.meshes.new('厚みのある巻き殻');me.from_pydata(vertices,[],faces);me.update()
    coil=bpy.data.objects.new('中心から膨らむ巻き殻',me);bpy.context.collection.objects.link(coil);use(coil,coil.name,'pearl')
    for face in me.polygons: face.use_smooth=True
    # 殻口から奥へ幅が狭まる壁を作る。穴は面で塞がず、奥だけを丸く閉じる。
    sides=48
    def mouth_wall(name,rings,material,inside):
        verts=[];faces=[]
        for y,rx,rz,cz in rings:
            for j in range(sides):
                a=2*pi*j/sides
                verts.append((.77+rx*cos(a),y,cz+rz*sin(a)))
        for k in range(len(rings)-1):
            for j in range(sides):
                a=k*sides+j;b=k*sides+(j+1)%sides
                faces.append((a,b,b+sides,a+sides) if inside else (a,a+sides,b+sides,b))
        if inside: faces.append(tuple((len(rings)-1)*sides+j for j in range(sides)))
        me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.update()
        ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);use(ob,name,material)
        for face in me.polygons:face.use_smooth=True
    mouth_wall('殻の厚い外側の口縁',[(-.93,.72,.53,.91),(-.72,.82,.61,.91),(-.42,.86,.64,.92)],'pearl',False)
    mouth_wall('奥まで続く淡い桃色の内壁',[(-.94,.66,.48,.91),(-.70,.64,.48,.91),(-.42,.58,.44,.89),(-.10,.48,.37,.86),(.22,.30,.22,.84)],'shellInner',True)
    lip=[(.77+.69*cos(2*pi*i/48),-.94,.91+.50*sin(2*pi*i/48)) for i in range(49)]
    tube('殻口の丸い乳白の縁',lip,.085,'tileWhite')
    seam=[(.77+.86*cos(2*pi*i/48),-.41,.92+.64*sin(2*pi*i/48)) for i in range(49)]
    tube('殻と口がつながる丸い縁',seam,.055,'pearl')
    seat=cyl('開口前の低い丸座面',(.62,-1.10,.15),1.00,.26,'tileWhite',48,.10)
    seat.scale.y=.76
    sphere('座面の淡い内張り',(.62,-1.13,.29),(.81,.67,.075),'shellInner',40,20)
    for x in [-.91,-.48,.20,.62]:
        ridge=[]
        for j in range(20):
            y=-.48+1.32*j/19
            inside=1-((x+.12)/1.56)**2-((y-.31)/1.04)**2
            if inside>.02: ridge.append((x,y,1.48+1.28*math.sqrt(inside)+.018))
        if len(ridge)>3:tube('殻の砂金色の柔らかな稜線',ridge,.018,'tileWhite')
def city_dome(n,x,y,z,r,h,m='blue'):
    # 下半分を持たない半球で、白壁の上に載る青い屋根を作る。
    steps=18; sides=40; vs=[]; fs=[]
    for j in range(steps+1):
        t=(pi/2)*j/steps
        for i in range(sides):
            a=2*pi*i/sides
            vs.append((x+r*cos(t)*cos(a),y+r*cos(t)*sin(a),z+h*sin(t)))
    for j in range(steps):
        for i in range(sides):
            k=j*sides+i; next_i=j*sides+(i+1)%sides
            fs.append((k,next_i,next_i+sides,k+sides))
    me=bpy.data.meshes.new(n); me.from_pydata(vs,[],fs); me.update()
    ob=bpy.data.objects.new(n,me); bpy.context.collection.objects.link(ob); use(ob,n,m)
    for f in me.polygons: f.use_smooth=True
    cyl('丸屋根の白い厚い縁',(x,y,z),r*1.025,.22,'white',48,.07)
def city_arch(n,x,y,z,r,wall,depth,m='white'):
    # 二つの半円と前後面を閉じた厚い石積み。穴の内側には面を置かない。
    count=32; vs=[]; fs=[]
    for yy in [y-depth/2,y+depth/2]:
        for radius in [r,r+wall]:
            for i in range(count+1):
                a=pi*i/count
                vs.append((x+radius*cos(a),yy,z+radius*sin(a)))
    stride=count+1
    for i in range(count):
        fs.append((i,i+1,stride+i+1,stride+i))
        fs.append((2*stride+i,3*stride+i,3*stride+i+1,2*stride+i+1))
        fs.append((i,2*stride+i,2*stride+i+1,i+1))
        fs.append((stride+i,stride+i+1,3*stride+i+1,3*stride+i))
    fs.extend([(0,stride,3*stride,2*stride),(count,2*stride+count,3*stride+count,stride+count)])
    me=bpy.data.meshes.new(n); me.from_pydata(vs,[],fs); me.update()
    ob=bpy.data.objects.new(n,me); bpy.context.collection.objects.link(ob);use(ob,n,m)
    for face in me.polygons: face.use_smooth=True
    return ob
def build_windCity():
    # 地上には幅７の通路を残し、左右の石壁と高い城門で街を持ち上げる。
    for s in [-1,1]:
        x=s*4.25
        cube('門の厚い白い柱',(x,-9.0,2.45),(1.48,2.8,4.9),'white',.30)
        cube('門を支える横の石壁',(s*6.55,-8.9,2.70),(3.4,3.0,5.4),'white',.35)
        for h in [1.2,3.2,4.65]: cube('石柱の明るい縁',(x,-10.47,h),(1.63,.14,.16),'cream',.04)
        for j in range(4):
            cube('門の側の段',(s*(5.3+j*.55),-11.25+j*.35,.14+j*.22),(1.6,1.15,.28+j*.44),'white',.07)
    city_arch('中央を抜ける大きな半円門',0,-9.0,4.75,3.5,.77,3.02)
    city_arch('門の青い奥行き縁',0,-10.54,4.75,3.54,.10,.15,'tile')
    cube('門の上の歩廊',(0,-8.95,8.73),(9.9,3.25,.75),'white',.24)
    for s in [-1,1]:
        for j in range(7):
            x=s*(.7+j*.59)
            cyl('上層の白い手すり柱',(x,-10.58,9.25),.075,.66,'white',12,.025)
    tube('門上の曲がる手すり',[(x,-10.58,9.61+.11*cos(pi*x/5)) for x in [-4.6+i*.23 for i in range(41)]],.095,'white')
    # 門の下から中央塔へ、白い階段が段階的に上がる。
    for j in range(12):
        y=-11.7+j*.72; z=.18+j*.34
        cube('街へ上がる幅広い階段',(0,y,z/2),(6.8-j*.13,.81,z),'white',.09)
    for s in [-1,1]:
        for j in range(7):
            y=-7.3+j*.69; z=1.35+j*.50
            cube('脇へ上がる折り階段',(s*(5.0+j*.40),y,z-.12),(2.15,.8,z+.25),'white',.07)
    # 低い棟、中庭の棟、奥の高い棟をずらして重ねる。
    buildings=[(6.9,-4.1,2.75,7.2,1.0,1.65),(8.0,2.3,2.55,5.4,3.4,1.35),
               (5.35,5.8,2.25,6.0,5.0,1.4),(8.45,7.4,1.4,4.4,6.15,.9)]
    for s in [-1,1]:
        city_arch('左右の下層に続くアーチ',s*7.25,-6.75,2.65,1.45,.45,1.9)
        cube('上下の町をつなぐ張り出し床',(s*6.8,.9,4.55),(6.9,11.0,.52),'white',.25)
        for y in [-3.6,-1.6,.4,2.4,4.4]:
            cyl('上の歩廊の石の欄干',(s*10.15,y,5.10),.10,.78,'white',12,.035)
        tube('上の歩廊の長い手すり',[(s*10.15,-4.35+j*.24,5.54) for j in range(40)],.11,'white')
    for s in [-1,1]:
        for k,(xx,yy,r,h,base,cap) in enumerate(buildings):
            x=s*xx
            cyl('階層をつなぐ丸い石のテラス',(x,yy,base-.22),r+.55,.55,'white',48,.18)
            cyl('層をなす曲面の白壁',(x,yy,base+h/2),r,h,'white',40,.18)
            city_dome('半球の青い屋根',x,yy,base+h,r*.94,cap)
            front=yy-r-.035
            city_arch('彫り込んだ青い入口',x,front,base+1.28,.58,.13,.10,'tile')
            cube('扉の濃い奥',(x,front+.11,base+.83),(1.05,.12,1.66),'blueDark',.09)
            for dx in [-r*.60,r*.60]:
                sphere('壁の奥まった丸窓',(x+dx,front+.06,base+h*.61),(.24,.13,.43),'blueDark',20,12)
                city_arch('窓の白い彫り縁',x+dx,front-.08,base+h*.61,.32,.09,.11,'cream')
            if k<3:
                cube('前へ張り出すバルコニー',(x,front-.42,base+h*.58),(r*1.42,.95,.22),'white',.09)
                for j in range(7):
                    px=x-r*.62+j*r*.206
                    cyl('バルコニーの欄干',(px,front-.84,base+h*.58+.40),.075,.70,'white',12,.02)
                tube('バルコニーの丸い笠木',[(x-r*.72+j*r*.048,front-.85,base+h*.58+.80) for j in range(31)],.095,'white')
            for j in range(10):
                a=2*pi*j/10
                px=x+(r+.31)*cos(a); py=yy+(r+.31)*sin(a)
                if abs(px)<3.75 and py<-4: continue
                sphere('城の縁に垂れる緑',(px,py,base+.2),(.25,.28,.36),'leaf',12,8)
    # 中央塔の芯と帆の高さ・前後位置は旧原本と同じ。
    cyl('塔を囲む上の白い円形庭',(0,0,5.55),4.8,.65,'white',48,.19)
    cyl('風車の中央塔',(0,0,13.4),2.8,17.2,'white',48,.18)
    city_dome('中央塔の低い青い冠',0,0,22.0,2.88,.98)
    for z in [8.4,11.7,15.4,18.5]:
        for a in [0,pi/2,pi,3*pi/2]:
            sphere('塔の細長い青窓',(2.79*cos(a),2.79*sin(a),z),(.23,.23,.60),'blueDark',16,10)
    for z in [7.6,13.3,19.2]: cyl('塔の彫り込んだ白い帯',(0,0,z),2.92,.18,'cream',48,.07)
    for s in [-1,1]:
        for j in range(5):
            x=s*(4.5+j*1.25)
            sphere('城門の花壇の緑',(x,-7.0-(j%2)*1.2,5.55),(.38,.42,.30),'leaf',16,10)
            for k in range(3): sphere('花壇の小花',(x+(k-1)*.18,-7.43-(j%2)*1.2,5.72),(.09,.10,.09),'light',10,6)
def build_windSails():
    # 支点のまわりで回す前提で、羽根は支点相対へ書き出す。
    hub=(0,-.45,7.0)
    cyl('固定軸',(0,0,7),.35,1.8,'woodDark',24,.06,axis=(pi/2,0,0))
    for i in range(8):
        a=2*pi*i/8
        p1=(6.6*cos(a),-.55,7+6.6*sin(a))
        p2=(4.7*cos(a+.42),-.55,7+4.7*sin(a+.42))
        tube('rotate_帆の木骨',[hub,p1],.11,'basket')
        tube('rotate_布の外縁',[p1,p2,hub],.035,'cream')
        # 放射方向の列で布を少し前へ膨らませる。
        vs=[]; fs=[]; rows=10
        for j in range(rows+1):
            t=j/rows
            for k in range(j+1):
                u=k/j if j else 0
                x=hub[0]*(1-t)+t*(p1[0]*(1-u)+p2[0]*u)
                z=hub[2]*(1-t)+t*(p1[2]*(1-u)+p2[2]*u)
                vs.append((x,-.55-.23*sin(pi*t)*sin(pi*u),z))
        for j in range(rows):
            a0=j*(j+1)//2; b0=(j+1)*(j+2)//2
            for k in range(j+1):
                fs.append((a0+k,b0+k,b0+k+1))
                if k<j: fs.append((a0+k,b0+k+1,a0+k+1))
        me=bpy.data.meshes.new('帆の布面'); me.from_pydata(vs,[],fs); me.update()
        o=bpy.data.objects.new('rotate_張った三角の帆',me); bpy.context.collection.objects.link(o); use(o,o.name,'fabric')
        for f in me.polygons: f.use_smooth=True
        mod=o.modifiers.new('布の厚み','SOLIDIFY'); mod.thickness=.045
        sphere('rotate_帆先の金具',p1,(.12,.10,.12),'gold',12,8)
    sphere('rotate_中心飾り',hub,(.65,.33,.65),'gold',32,16)
    tube('rotate_中心の補強輪',[(.46*cos(2*pi*i/48),-.78,7+.46*sin(2*pi*i/48)) for i in range(49)],.095,'basketLight')
    PIVOTS['windSails']={'sails':hub}
def build_blueDomePavilion():
    cyl('白い床',(0,0,.35),3.4,.70,'white',40,.15)
    for i in range(8):
        a=2*pi*i/8; x=2.65*cos(a); y=2.65*sin(a)
        cyl('白い柱',(x,y,3.4),.23,5.5,'white',20,.06)
        cyl('柱頭',(x,y,6.25),.42,.27,'cream',20,.04)
    cyl('屋根の輪',(0,0,6.3),3.25,.4,'white',40,.11)
    sphere('青い丸屋根',(0,0,6.45),(3.2,3.2,1.65),'blue',40,20)
    sphere('金の頂飾り',(0,0,8),(0.23,.23,.35),'gold')
def build_skyAirship():
    sphere('気球の船体',(0,0,4.65),(4.6,6.8,1.95),'fabric',36,18)
    for y in [-4.8,-2.4,0,2.4,4.8]:
        tube('船体の骨',[(4.45*cos(2*pi*i/40),y,4.65+1.89*sin(2*pi*i/40)) for i in range(41)],.05,'basket')
    cube('空中船の舟',(0,0,1.2),(3.2,6.4,1.6),'basket',.45)
    for x in [-1.35,1.35]:
        for y in [-2.5,2.5]: tube('吊り索',[(x,y,1.8),(x*.8,y*1.1,3.9)],.045,'basket')
    for y in [-2.9,2.9]: panel('白い小帆',[(-2.6,y,1.5),(0,y,3.2),(0,y,1.5)],'fabric')
def star(n,x,y,z,r,m):
    pts=[]
    for i in range(10):
        a=pi/2+2*pi*i/10; rr=r if i%2==0 else r*.47
        pts.append((x+rr*cos(a),y,z+rr*sin(a)))
    return panel(n,pts,m,.16)
def build_starCarousel():
    cyl('固定円形台',(0,0,.55),8.25,1.1,'cream',64,.20)
    for a in [2*pi*i/24 for i in range(24)]:
        x,y=7.95*cos(a),7.95*sin(a)
        sphere('台の灯り',(x,y,.65),(.15,.15,.15),'light',12,8)
    # この部分以降は床中央を支点に独立して回る。
    cyl('rotate_回転床',(0,0,1.22),7.65,.24,'basketLight',64,.08)
    cyl('rotate_太い支柱',(0,0,5.3),.65,8.0,'gold',32,.09)
    for i in range(12):
        a=2*pi*i/12; x,y=6.3*cos(a),6.3*sin(a)
        cyl('rotate_外柱',(x,y,5.5),.11,7.4,'gold',16,.04)
        sphere('rotate_柱灯',(x,y,8.5),(.16,.16,.16),'light',12,8)
    cyl('rotate_屋根の縁',(0,0,9.2),7.55,.48,'gold',64,.14)
    for i in range(16):
        a=2*pi*i/16; roof_sector('rotate_赤とクリームの屋根',7.55,9.2,13.0,a,a+2*pi/16,'red' if i%2 else 'fabric')
        a2=2*pi*(i+1)/16
        panel('rotate_布の波形縁',[(7.55*cos(a),7.55*sin(a),9.25),(7.55*cos(a2),7.55*sin(a2),9.25),
              (7.5*cos((a+a2)/2),7.5*sin((a+a2)/2),8.54)],'redLight' if i%2 else 'fabric',.09)
        star('rotate_屋根の星',7.53*cos(a),7.53*sin(a),9.16,.30,'gold')
        sphere('rotate_縁の灯り',(7.5*cos(a),7.5*sin(a),8.88),(.13,.13,.13),'light',12,8)
    cyl('rotate_冠の台',(0,0,12.92),.78,.40,'gold',32,.08)
    star('固定の大きな星',0,-.38,14.0,1.1,'gold')
    for i in range(8):
        a=2*pi*i/8; x,y=5.55*cos(a),5.55*sin(a)
        cyl('rotate_乗り物の棒',(x,y,4.5),.06,5.3,'gold',12,.02)
        sphere('rotate_木馬の胴',(x,y,2.0),(.74,.35,.45),'cream',16,10)
        sphere('rotate_木馬の鞍',(x-.08,y,2.38),(.35,.37,.14),'redLight',12,8)
        sphere('rotate_木馬の頭',(x+.48,y,2.42),(.34,.25,.42),'cream',16,10)
        sphere('rotate_木馬の鼻',(x+.76,y,2.28),(.24,.21,.17),'cream',16,10)
        tube('rotate_木馬の尾',[(x-.65,y,2.20),(x-.94,y,2.42),(x-1.05,y,2.09)],.095,'redLight')
        sphere('rotate_木馬の目',(x+.7,y-.18,2.52),(.055,.035,.055),'woodDark',12,8)
        for dx in [-.40,.45]: cube('rotate_木馬の脚',(x+dx,y,1.48),(.14,.18,.75),'basket',.04)
        cone('rotate_木馬の耳',(x+.55,y,2.78),.10,.01,.42,'cream',12)
    PIVOTS['starCarousel']={'platform':(0,0,1.1)}
def build_festivalShellStage():
    cyl('舞台の台',(0,-.1,.55),5.9,1.1,'cream',48,.18)
    shell_mesh('舞台の大きな貝の背景',(5.8,1.5,6.2),True,'shellInner')
    cyl('貝の足元',(0,1.4,1.6),1.0,1.4,'shell',24,.13)
    for i in range(13):
        a=pi*i/12
        tube('舞台の貝の骨',[(0,1.0,2.1),(5.4*cos(a),1.15,2.1+5.4*sin(a)+1.1)],.09,'gold')
    for i in range(15):
        a=pi*i/14; x=5.5*cos(a)
        sphere('舞台の灯り',(x,-.25,3.45+4.9*sin(a)),(.13,.13,.13),'light',12,8)
def build_festivalCelebrationCanopy():
    # 祝いの席は回転木馬の左。中央への通路をふさがない開いた天幕にする。
    radius=6.05
    for i in range(12):
        a=2*pi*i/12
        roof_sector('赤とクリームの縞屋根',radius,5.65,8.05,a,a+2*pi/12,'red' if i%2 else 'fabric')
        roof_sector('天幕の内側',radius-.15,5.55,7.92,a,a+2*pi/12,'fabric' if i%2 else 'redLight')
        if i%2==0:
            x,y=radius*cos(a),radius*sin(a)
            cyl('金色の支柱',(x,y,2.76),.095,5.52,'gold',12,.02)
            sphere('支柱の灯り',(x,y,5.54),(.20,.20,.20),'light',12,8)
        a1=a+2*pi/12
        for j in range(3):
            t=j/3; b=a+(a1-a)*t; c=a+(a1-a)*(t+1/3)
            panel('赤布の垂れ飾り',[(radius*cos(b),radius*sin(b),5.67),
                  (radius*cos(c),radius*sin(c),5.67),
                  (radius*cos(c),radius*sin(c),4.65),
                  (radius*cos((b+c)/2),radius*sin((b+c)/2),4.38),
                  (radius*cos(b),radius*sin(b),4.65)],'redLight',.06)
    oval_ring('金色の軒',radius,radius,5.65,.085,'gold')
    for i in range(36):
        a=2*pi*i/36
        sphere('軒下の灯り',(radius*cos(a),radius*sin(a),5.48),(.12,.12,.12),'light',10,6)
    for i in range(18):
        a=2*pi*i/18
        x,y=(radius-.08)*cos(a),(radius-.08)*sin(a)
        sphere('花の束',(x,y,5.76),(.27,.24,.19),'coralPink',12,8)
        sphere('花の葉',(x+.16,y,5.72),(.20,.21,.13),'leaf',10,6)
    sphere('天幕の金の頂',(0,0,8.12),(.34,.34,.29),'gold',16,8)
def build_festivalCelebrationTable():
    cyl('食卓の台脚',(0,0,.39),.22,.78,'basket',16,.04)
    cyl('食卓の天板',(0,0,.79),1.18,.15,'basketLight',32,.05)
    cyl('白いクロスの上面',(0,0,.90),1.28,.045,'fabric',32,.015)
    for i in range(12):
        a=2*pi*i/12; b=2*pi*(i+1)/12
        panel('白いクロスの垂れ',[(1.26*cos(a),1.26*sin(a),.90),
              (1.26*cos(b),1.26*sin(b),.90),(1.28*cos(b),1.28*sin(b),.48),
              (1.28*cos(a),1.28*sin(a),.48)],'fabric',.025)
    for i in range(4):
        a=2*pi*i/4
        sphere('花の飾り',(.20*cos(a),.20*sin(a),.97),(.14,.14,.14),'coralPink',10,6)
    sphere('飾りの葉',(0,0,.99),(.18,.18,.12),'leaf',10,6)
def build_festivalCelebrationChair():
    for x in [-.34,.34]:
        for y in [-.32,.32]:
            cube('いすの脚',(x,y,.27),(.10,.10,.54),'basket',.025)
    cube('木の座面',(0,0,.57),(.90,.78,.13),'basketLight',.06)
    for x in [-.34,.34]:
        cube('背もたれの柱',(x,.32,1.02),(.09,.10,.83),'gold',.02)
    cube('背もたれの赤い布',(0,.33,1.22),(.76,.09,.36),'red',.04)
def house(col,height):
    cube('色しっくいの家',(0,0,height/2),(6.7,5.8,height),col,.25)
    cube('屋上の縁',(0,0,height+.18),(7.0,6.1,.38),'cream',.10)
    arch_gateway(0,-2.9,2.5,4.0,.16,'cream','家の正面')
    cube('丸い入口の青緑扉',(0,-2.84,1.75),(2.05,.09,3.45),'turquoise',.08)
    for x in [-2.25,2.25]:
        for z in [2.4,height-2.1]:
            sphere('窓の奥',(x,-2.91,z),(.53,.08,.67),'blueDark',16,10)
            tube('窓の白い縁',[(x+.58*cos(pi*i/16),-3,z+.70*sin(pi*i/16)) for i in range(17)],.09,'cream')
    for x in [-3.12,3.12]: cube('縁のタイル',(x,-2.96,height/2),(.14,.07,height-.5),'tile',.02)
    for x in [-2.75,-1.65,-.55,.55,1.65,2.75]:
        cube('屋根下のタイル',(x,-2.97,height-.42),(.48,.08,.30),'tile' if x>0 else 'tileWhite',.03)
def build_mexicanHouseA(): house('coralWall',9)
def build_mexicanHouseB(): house('mango',11.3)

BUILD={k:v for k,v in list(globals().items()) if k.startswith('build_') and callable(v)}
PIVOTS={}
SIZES={'greatFruitMarket':[24,17,18],'moroccanStall':[6,5,5],'moroccanHouse':[8,9,6],
 'greatPearlShell':[15,11,8],'coralArch':[10,8,3],'spiralShellSeat':[4,3,3],
 'windCity':[22,23,17],'windSails':[14,14,1.5],'blueDomePavilion':[7,8,7],
 'skyAirship':[10,7,14],'starCarousel':[17,15,17],'festivalShellStage':[12,9,7],
 'festivalCelebrationCanopy':[13,9,13],'festivalCelebrationTable':[2.7,1.1,2.7],
 'festivalCelebrationChair':[1,1.5,1],
 'mexicanHouseA':[7,9,6],'mexicanHouseB':[7,12,6]}

def render_preview(id):
    world=bpy.context.scene.world or bpy.data.worlds.new('空'); bpy.context.scene.world=world; world.color=(.32,.43,.55)
    camera_pos=(SIZES[id][0]*1.15,-SIZES[id][2]*1.75,SIZES[id][1]*1.0)
    if id=='windSails': camera_pos=(0,-23,9)
    if id=='windCity': camera_pos=(0,-37,19)
    bpy.ops.object.camera_add(location=camera_pos)
    cam=bpy.context.object; cam.name='確認カメラ'; target=Vector((0,0,SIZES[id][1]*.45)); cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
    cam.data.type='ORTHO'; cam.data.ortho_scale=max(SIZES[id][0]*1.35,SIZES[id][1]*1.65); bpy.context.scene.camera=cam
    bpy.ops.object.light_add(type='AREA',location=(-10,-12,24)); bpy.context.object.data.energy=3300; bpy.context.object.data.shape='DISK'; bpy.context.object.data.size=18
    bpy.ops.object.light_add(type='AREA',location=(13,7,16)); bpy.context.object.data.energy=2200; bpy.context.object.data.size=13
    if id=='greatFruitMarket':
        bpy.ops.object.light_add(type='AREA',location=(0,-9,5.5)); bpy.context.object.data.energy=3000; bpy.context.object.data.size=11
        bpy.ops.object.light_add(type='AREA',location=(0,0,6.1)); bpy.context.object.data.energy=1800; bpy.context.object.data.size=7
    bpy.context.scene.render.engine='CYCLES'; bpy.context.scene.cycles.samples=24
    bpy.context.scene.render.threads_mode='FIXED'; bpy.context.scene.render.threads=4
    bpy.context.scene.render.resolution_x=620; bpy.context.scene.render.resolution_y=510; bpy.context.scene.render.resolution_percentage=100
    bpy.context.scene.render.image_settings.file_format='PNG'; bpy.context.scene.render.filepath=os.path.join(OUT,id+'.png')
    bpy.ops.render.render(write_still=True)

def export_asset(id):
    objs=[o for o in bpy.context.scene.objects if o.type=='MESH']
    groups={}; counts={}; bounds=[999,999,999,-999,-999,-999]
    for o in objs:
        deps=bpy.context.evaluated_depsgraph_get(); e=o.evaluated_get(deps); me=e.to_mesh(); me.calc_loop_triangles()
        if not me.loop_triangles: e.to_mesh_clear(); continue
        mid=o.data.materials[0].name if o.data.materials else 'white'
        dynamic=o.name.startswith('rotate_')
        pivot=(0,0,0)
        if dynamic:
            pivot=next(iter(PIVOTS.get(id,{'x':(0,0,0)}).values()))
        key=('rotate_' if dynamic else 'static_')+mid
        if key not in groups:
            groups[key]=dict(name=key,material=mid,positions=[],normals=[],indices=[],_seen={})
        group=groups[key]
        local_count=0
        for tri in me.loop_triangles:
            verts=[o.matrix_world @ me.vertices[vi].co for vi in tri.vertices]
            if not all(math.isfinite(c) for v in verts for c in v):
                raise ValueError('座標に非有限値: '+id+'/'+o.name)
            face=(verts[1]-verts[0]).cross(verts[2]-verts[0])
            if face.length_squared<1e-12:
                continue
            face.normalize()
            for vi,v in zip(tri.vertices,verts):
                vn=o.matrix_world.to_3x3() @ me.vertices[vi].normal
                if not all(math.isfinite(c) for c in vn) or vn.length_squared<1e-12:
                    vn=face.copy()
                else:
                    vn.normalize()
                bounds[:3]=[min(bounds[i],v[i]) for i in range(3)]
                bounds[3:]=[max(bounds[i+3],v[i]) for i in range(3)]
                q=(v[0]-pivot[0],v[2]-pivot[2],-(v[1]-pivot[1]))
                vec=tuple(round(float(a),5) for a in (*q,vn.x,vn.z,-vn.y))
                if not all(math.isfinite(x) for x in vec):
                    raise ValueError('書き出し値に非有限値: '+id+'/'+o.name)
                ix=group['_seen'].get(vec)
                if ix is None:
                    ix=len(group['positions'])//3; group['_seen'][vec]=ix
                    group['positions'].extend(vec[:3]); group['normals'].extend(vec[3:])
                group['indices'].append(ix); local_count+=1
        counts[o.name]=local_count//3
        e.to_mesh_clear()
    meshes=[]
    for group in groups.values():
        del group['_seen']; meshes.append(group)
    p={}
    for mesh in meshes:
        if not mesh['name'].startswith('rotate_'): continue
        v=next(iter(PIVOTS.get(id,{'x':(0,0,0)}).values()))
        p[mesh['name']]=dict(position=[round(v[0],4),round(v[2],4),round(-v[1],4)],axis=[0,1,0] if id=='starCarousel' else [0,0,1])
    asset=dict(meshes=meshes,size=SIZES[id])
    if id=='windCity':
        # Three.js座標の円形障害物。中央の幅７の門は空ける。
        asset['colliderCircles']=[[-4.25,9.0,.70],[4.25,9.0,.70],[-6.55,8.9,1.8],[6.55,8.9,1.8]]
    if p: asset['pivots']=p
    report=dict(id=id,requestedSize=SIZES[id],staticBounds=[round(x,3) for x in bounds],triangles=sum(counts.values()),meshCount=len(meshes),opening='休憩用の穴あり' if id=='spiralShellSeat' else '通過口あり' if id in ('greatFruitMarket','coralArch','windCity') else '該当なし',pivots=p,preview=id+'.png',blend=id+'.blend')
    return asset,report

def signature(value):
    return hashlib.sha256(json.dumps(value,sort_keys=True,separators=(',',':'),allow_nan=False).encode('utf-8')).hexdigest()

protected=None
if UPDATE in ('windCity','spiralShellSeat','greatFruitMarket','starCarousel'):
    with open(DEST,encoding='utf-8') as f: protected=json.load(f,parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x)))
    if not set(SIZES).issubset(protected['assets']) or UPDATE not in protected['assets']: raise ValueError('既存素材が揃っていません')
    protected_hash={id:signature(asset) for id,asset in protected['assets'].items() if id!=UPDATE}
    material_hash=signature(protected['materials'])
    with open(os.path.join(OUT,'geometry-report.json'),encoding='utf-8') as f: old_report_ids={row['id'] for row in json.load(f)}
    if old_report_ids!=set(protected['assets']): raise ValueError('既存14素材の報告が揃っていません')
assets={}; reports=[]
ids=list(SIZES)
if FIRST: ids=['greatFruitMarket','greatPearlShell']
if PREVIEW: ids=[PREVIEW]
if UPDATE: ids=UPDATE.split(',')
for id in ids:
    bpy.ops.object.select_all(action='SELECT'); bpy.ops.object.delete(use_global=False)
    BUILD['build_'+id]()
    asset,report=export_asset(id)
    assets[id]=asset; reports.append(report)
    render_preview(id)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,id+'.blend'))
    print('完成:',id,'三角形:',report['triangles'])
if PREVIEW: sys.exit(0)
if UPDATE:
    if protected: old=protected
    else:
        with open(DEST,encoding='utf-8') as f:
            old=json.load(f,parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x)))
        old['materials'].update({k:v[1] for k,v in M.items()})
    old['assets'].update(assets); assets=old['assets']
    with open(os.path.join(OUT,'geometry-report.json'),encoding='utf-8') as f: old_reports=json.load(f)
    changed={r['id']:r for r in reports}
    reports=[changed.get(r['id'],r) for r in old_reports]
    reports.extend(r for r in changed.values() if r['id'] not in {old['id'] for old in old_reports})
    if protected:
        if any(signature(assets[id])!=old_hash for id,old_hash in protected_hash.items()): raise ValueError('対象外の素材の形状が変わりました')
        if signature(old['materials'])!=material_hash: raise ValueError('既存材質が変わりました')
with open(DEST+'.tmp','w',encoding='utf-8') as f:
    json.dump(dict(version=1,materials=old['materials'] if protected else {k:v[1] for k,v in M.items()},assets=assets),f,separators=(',',':'),allow_nan=False)
os.replace(DEST+'.tmp',DEST)
with open(os.path.join(OUT,'geometry-report.json.tmp'),'w',encoding='utf-8') as f:
    json.dump(reports,f,ensure_ascii=False,indent=2,allow_nan=False)
os.replace(os.path.join(OUT,'geometry-report.json.tmp'),os.path.join(OUT,'geometry-report.json'))
