"""八島の小さな贈り物と飾りを、個別原本と配信用形状へ書き出す。"""
import bpy, json, math, os, sys
from math import sin, cos, pi
from mathutils import Vector

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT=os.path.join(ROOT,'assets-src','islands','bonus')
GAME=os.path.join(ROOT,'assets','islands','bonus')
os.makedirs(OUT,exist_ok=True);os.makedirs(GAME,exist_ok=True)
bpy.context.preferences.filepaths.save_version=0

MATS={
 'sand':('#e6d6ac',.88,0),'shell':('#e9a7a1',.38,0),'pearl':('#fff0d7',.18,.08),'petal':('#e98fa9',.74,0),
 'wood':('#a66d3f',.78,0),'darkwood':('#59402c',.82,0),'moss':('#548363',.93,0),'birch':('#ece9d8',.8,0),
 'pine':('#396b57',.9,0),'water':('#72c9c4',.24,.02),'brick':('#ab705a',.84,0),'teal':('#4c9eaa',.55,0),
 'blue':('#4c83bd',.51,0),'cream':('#f4e5bc',.84,0),'gold':('#d7ae56',.34,.5),'steel':('#9caabb',.38,.55),
 'red':('#d35f57',.7,0),'tile':('#3ca8a1',.45,0),'coral':('#e48772',.73,0),'sea':('#3e7c9a',.57,0),
 'white':('#f1f0e4',.76,0),'lavender':('#9e8fbc',.75,0),'yellow':('#eac363',.68,0),'paper':('#ec7e7a',.89,0)}
MATS.update({'barkmark':('#49463e',.91,0),'glow':('#ffe6a1',.28,0),'ink':('#343e45',.84,0),'rose':('#e67b95',.69,0)})

def color(hexvalue):
    n=int(hexvalue[1:],16);return tuple(((n>>shift)&255)/255 for shift in (16,8,0))
def linear(rgb):return tuple(v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in rgb)
def material(key):
    if key in bpy.data.materials:return bpy.data.materials[key]
    hx,rough,metal=MATS[key];rgb=linear(color(hx));m=bpy.data.materials.new(key);m.diffuse_color=(*rgb,1);m.use_nodes=True
    bsdf=m.node_tree.nodes.get('Principled BSDF');bsdf.inputs['Base Color'].default_value=(*rgb,1);bsdf.inputs['Roughness'].default_value=rough;bsdf.inputs['Metallic'].default_value=metal
    if key=='glow':
        bsdf.inputs['Emission Color'].default_value=(*rgb,1)
        bsdf.inputs['Emission Strength'].default_value=.45
    return m
def finish(obj,name,mat):
    obj.name=name;obj.data.materials.append(material(mat));return obj
def cube(name,at,size,mat,bevel=.03):
    bpy.ops.mesh.primitive_cube_add(size=1,location=at);o=finish(bpy.context.object,name,mat);o.dimensions=size;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        mod=o.modifiers.new('やわらかな かど','BEVEL');mod.width=bevel;mod.segments=2
        mod=o.modifiers.new('めん','WEIGHTED_NORMAL')
    return o
def cyl(name,at,r,depth,mat,vertices=24):
    bpy.ops.mesh.primitive_cylinder_add(vertices=vertices,radius=r,depth=depth,location=at);return finish(bpy.context.object,name,mat)
def cone(name,at,r1,r2,depth,mat,vertices=20):
    bpy.ops.mesh.primitive_cone_add(vertices=vertices,radius1=r1,radius2=r2,depth=depth,location=at);return finish(bpy.context.object,name,mat)
def sphere(name,at,size,mat,segments=16,rings=8):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=segments,ring_count=rings,location=at);o=finish(bpy.context.object,name,mat);o.scale=size;return o
def tube(name,points,r,mat):
    c=bpy.data.curves.new(name,'CURVE');c.dimensions='3D';c.bevel_depth=r;c.bevel_resolution=2
    s=c.splines.new('POLY');s.points.add(len(points)-1)
    for p,pt in zip(s.points,points):p.co=(*pt,1)
    o=bpy.data.objects.new(name,c);bpy.context.collection.objects.link(o);o.data.materials.append(material(mat));return o
def torus(name,at,major,minor,mat):
    bpy.ops.mesh.primitive_torus_add(major_segments=32,minor_segments=6,location=at,major_radius=major,minor_radius=minor);return finish(bpy.context.object,name,mat)
def blade(name,center,length,width,angle,mat):
    o=cube(name,center,(length,width,.06),mat,.015);o.rotation_euler[2]=angle;return o
def petal_ring(n,r,z,mat):
    for i in range(n):
        a=2*pi*i/n;sphere('はなびら',(.48*r*cos(a),.48*r*sin(a),z),(.37*r,.16*r,.07),mat).rotation_euler[2]=a
def star(at,r,mat):
    front=[];back=[]
    for i in range(10):
        a=pi/2+i*pi/5;radius=r if i%2==0 else .45*r
        front.append((at[0]+radius*cos(a),at[1]-.07*r,at[2]+radius*sin(a)))
        back.append((at[0]+radius*cos(a),at[1]+.07*r,at[2]+radius*sin(a)))
    faces=[tuple(range(9,-1,-1)),tuple(range(10,20))]+[(i,(i+1)%10,(i+1)%10+10,i+10) for i in range(10)]
    mesh=bpy.data.meshes.new('ほしの かたち');mesh.from_pydata(front+back,[],faces);mesh.update()
    obj=bpy.data.objects.new('ほし',mesh);bpy.context.collection.objects.link(obj);finish(obj,'ほし',mat)
def clear():
    bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)

def japan(v):
    if v==0:
        cube('ひらく はこの した',(0,0,.2),(1.1,.72,.35),'wood');cube('ふた',(0,0,.43),(1.18,.8,.11),'shell')
        for x in [-.33,.33]:
            sphere('さくらがい',(x,0,.55),(.26,.19,.075),'pearl')
            for i in range(5):
                a=-.8+i*.4
                tube('かいの すじ',[(x,0,.61),(x+.22*sin(a),-.14*cos(a),.61)],.009,'shell')
        tube('リボンの よこ', [(-.59,-.24,.49),(0,-.24,.51),(.59,-.24,.49)],.032,'red')
        tube('リボンの たて',[(0,-.4,.5),(0,0,.52),(0,.4,.5)],.032,'red')
        for side in [-1,1]:
            tube('リボンの わ',[(0,-.39,.55),(side*.16,-.42,.7),(side*.25,-.4,.63),(0,-.39,.55)],.033,'rose')
        sphere('リボンの むすびめ',(0,-.4,.55),(.075,.04,.055),'gold')
    elif v==1:
        cyl('はまいし',(0,0,.1),.46,.18,'sand');torus('みずの ふち',(0,0,.22),.32,.04,'water')
        for i in range(5):sphere('しおだまりの かい',(.25*cos(i*2.5),.25*sin(i*2.5),.27),(.12,.08,.035),'shell')
        tube('ゆれる すすき',[(0,0,.25),(.08,0,.7),(.22,0,1.05)],.025,'wood')
    else:
        torus('さくらの わ',(0,0,.62),.47,.08,'darkwood')
        for i in range(6):
            a=i*2*pi/6;sphere('さくら',(.47*cos(a),.47*sin(a),.62),(.19,.19,.12),'petal');sphere('はなの しん',(.47*cos(a),.47*sin(a),.73),(.05,.05,.03),'yellow')
        tube('かける ひも',[(-.1,0,1.07),(0,0,1.27),(.1,0,1.07)],.025,'cream')
def finland(v):
    if v==0:
        cyl('しらかばの だい',(0,0,.16),.38,.32,'birch');cube('しらかばの からだ',(0,0,.57),(.6,.54,.67),'birch')
        for x,z in [(-.2,.43),(.13,.54),(-.09,.77),(.23,.78),(-.25,.68)]:cube('しらかばの くろい ふし',(x,-.278,z),(.12,.018,.035),'barkmark',.006)
        for x in [-.18,.18]:cube('やわらかな ひかり',(x,-.287,.61),(.13,.022,.38),'glow',0)
        cone('こやの やね',(0,0,1.08),.5,0,.38,'darkwood',4).rotation_euler[2]=pi/4
        for x,y in [(-.32,-.14),(.29,.13),(.14,-.31)]:sphere('やねの こけ',(x,y,.94),(.15,.12,.06),'moss')
    elif v==1:
        cone('まつぼっくり',(0,0,.54),.35,.08,.85,'wood',12)
        for z in [.34,.53,.72]:torus('うろこ',(0,0,z),.24-(z-.34)*.15,.055,'darkwood')
        torus('つるす わ',(0,0,1.03),.13,.03,'gold')
    else:
        cube('こぶねの ふなぞこ',(0,0,.19),(1.1,.48,.27),'darkwood')
        for y in [-.22,.22]:tube('そりの ふち',[(-.55,y,.24),(-.4,y,.42),(.4,y,.42),(.55,y,.24)],.055,'wood')
        for x in [-.32,.32]:cube('こぶねの ざいた',(x,0,.43),(.09,.43,.06),'birch')
        for x in [-.42,.42]:tube('こぶねの げんそく',[(x,-.24,.25),(x,-.24,.4),(x,.24,.4)],.026,'wood')
        cube('はくじゅの ほ',(0,0,.75),(.05,.05,.87),'birch');cone('もりの ほ',(0,.05,.72),.35,0,.55,'pine',3)
def netherlands(v):
    if v==0:
        cyl('れんがの だい',(0,0,.18),.3,.36,'brick');cube('みずべの こや',(0,0,.64),(.55,.5,.58),'cream')
        cone('あおい やね',(0,0,1.09),.47,0,.35,'teal',4).rotation_euler[2]=pi/4
        for i in range(4):
            a=i*pi/2
            o=cube('かざぐるまの はね',(.28*cos(a),-.34,1.18+.28*sin(a)),(.6,.08,.14),'white',.012)
            o.rotation_euler[1]=-a
        sphere('はねの しん',(0,-.36,1.18),(.11,.08,.11),'gold')
    elif v==1:
        cube('きりづまの いえ',(0,0,.42),(.7,.54,.78),'brick')
        vertices=[(-.4,-.32,.78),(.4,-.32,.78),(0,-.32,1.18),(-.4,.32,.78),(.4,.32,.78),(0,.32,1.18)]
        faces=[(0,1,2),(5,4,3),(0,3,4,1),(0,2,5,3),(1,4,5,2)]
        mesh=bpy.data.meshes.new('きりづまの かたち');mesh.from_pydata(vertices,[],faces);mesh.update()
        roof=bpy.data.objects.new('あおい きりづまやね',mesh);bpy.context.collection.objects.link(roof);finish(roof,'あおい きりづまやね','teal')
        face=sphere('とけいの かお',(0,-.281,.59),(.20,.016,.20),'cream')
        rim=torus('とけいの わ',(0,-.301,.59),.205,.018,'gold');rim.rotation_euler[0]=pi/2
        for i in range(12):
            a=i*pi/6;x=.16*sin(a);z=.59+.16*cos(a)
            sphere('とけいの めもり',(x,-.318,z),(.012,.006,.012),'ink',8,4)
        tube('ながい はり',[(0,-.327,.59),(.09,-.327,.7)],.012,'ink')
        tube('みじかい はり',[(0,-.33,.59),(-.06,-.33,.63)],.014,'ink')
        cube('とけいの したの とびら',(0,-.277,.24),(.2,.024,.31),'darkwood',.01)
    else:
        cube('おはなの くるま',(0,0,.29),(.9,.53,.35),'teal')
        for x in [-.32,.32]:
            for y in [-.31,.31]:cyl('くるまの わ',(x,y,.14),.14,.05,'darkwood').rotation_euler[0]=pi/2
        for x,mat in [(-.25,'red'),(0,'yellow'),(.25,'petal')]:
            tube('くき',[(x,0,.45),(x,0,.8)],.018,'moss');petal_ring(5,.19,.82,mat)
def switzerland(v):
    if v==0:
        cyl('はぐるまの だい',(0,0,.15),.43,.22,'steel')
        for i in range(12):
            a=i*pi/6;cube('はぐるまの は',( .42*cos(a),.42*sin(a),.25),(.16,.12,.2),'gold',.01).rotation_euler[2]=a
        torus('まんなかの わ',(0,0,.27),.24,.05,'gold')
    elif v==1:
        cube('みずの うけ',(0,0,.2),(.9,.48,.27),'wood');cyl('すいしゃの しん',(0,.29,.57),.23,.12,'steel').rotation_euler[0]=pi/2
        for i in range(8):
            a=i*pi/4;blade('みずぐるまの いた',(.24*cos(a),.31,.57+.24*sin(a)),.42,.10,a,'wood').rotation_euler[0]=pi/2
        tube('みずの とい',[(-.46,-.2,.7),(-.18,-.2,.7),(-.18,.2,.6)],.055,'water')
    else:
        cube('こうぐばこ',(0,0,.28),(.94,.56,.45),'wood');cube('ふた',(0,0,.53),(.98,.59,.1),'darkwood')
        torus('もちて',(0,0,.73),.16,.035,'steel')
        for x in [-.31,.31]:cube('どめがね',(x,-.29,.36),(.07,.025,.19),'gold',0)
def morocco(v):
    if v==0:
        cube('こばこ',(0,0,.3),(.8,.7,.5),'wood');cube('タイルの ふた',(0,0,.58),(.88,.77,.09),'tile')
        for y in [-.38,.38]:tube('はこの ふち',[(-.45,y,.58),(.45,y,.58)],.025,'gold')
        for x in [-.44,.44]:tube('はこの ふち',[(x,-.38,.58),(x,.38,.58)],.025,'gold')
        cube('まえの とめがね',(0,-.361,.47),(.13,.04,.2),'gold',.01)
        sphere('とめがねの しん',(0,-.389,.47),(.028,.015,.028),'cream',8,4)
        for x in [-.22,0,.22]:
            for y in [-.2,0,.2]:cube('ひしがた', (x,y,.64),(.13,.13,.02),'cream',0).rotation_euler[2]=pi/4
    elif v==1:
        cyl('ランタンの だい',(0,0,.16),.34,.2,'gold',8);cone('アーチの あかり',(0,0,.65),.32,.17,.75,'tile',8)
        for a in range(8):
            angle=a*pi/4;tube('あかりの ほね',[(.28*cos(angle),.28*sin(angle),.22),(.24*cos(angle),.24*sin(angle),.9)],.025,'gold')
        cone('ランタンの やね',(0,0,1.1),.42,0,.32,'gold',8);torus('つりわ',(0,0,1.31),.09,.02,'gold')
    else:
        cyl('ちゃの おぼん',(0,0,.12),.54,.12,'gold');torus('おぼんの ふち',(0,0,.19),.51,.025,'tile')
        for x in [-.24,.24]:cyl('こっぷ',(x,0,.34),.14,.3,'tile',12)
        cone('おちゃの ポット',(0,.26,.47),.18,.1,.43,'steel',12);tube('つぎくち',[(0,.26,.53),(.26,.26,.58),(.33,.26,.5)],.035,'gold')
def palau(v):
    if v==0:
        sphere('ひらく かい',(0,0,.22),(.58,.42,.16),'shell');sphere('かいの ふた',(0,.2,.55),(.58,.31,.13),'shell').rotation_euler[0]=-.55
        sphere('しんじゅ',(0,0,.47),(.22,.22,.22),'pearl');torus('かいの ふち',(0,0,.23),.38,.025,'gold')
    elif v==1:
        cyl('さんごの いわ',(0,0,.13),.4,.2,'sea')
        for i in range(5):
            a=i*2*pi/5;x=.13*cos(a);y=.13*sin(a)
            mid=(.2*cos(a),.2*sin(a),.56)
            tube('さんごの おやえだ',[(x,y,.2),mid,(.31*cos(a),.31*sin(a),.94)],.052,'coral')
            for side in [-1,1]:
                branch=(.54*cos(a+side*.46),.54*sin(a+side*.46),.73+(.06 if side>0 else 0))
                tube('さんごの こえだ',[mid,branch],.032,'shell')
                sphere('まるい ひかり',branch,(.058,.058,.058),'glow',12,6)
            sphere('ひかる さき',(.31*cos(a),.31*sin(a),.94),(.074,.074,.074),'glow')
    else:
        sphere('うみがめの こうら',(0,0,.4),(.53,.42,.25),'sea');sphere('うみがめの あたま',(.5,0,.34),(.2,.18,.17),'moss')
        for y in [-.13,.13]:sphere('うみがめの め',(.65,y,.39),(.025,.02,.025),'ink',8,4)
        for x in [-.31,.31]:
            for y in [-.32,.32]:
                flipper=sphere('まるい ひれ',(x,y,.2),(.23,.15,.075),'moss');flipper.rotation_euler[2]=(.25 if x*y>0 else -.25)
        for i in range(6):
            a=i*pi/3;sphere('こうらの ろっかくもよう',(.29*cos(a),.24*sin(a),.59),(.13,.1,.026),'tile')
        sphere('こうらの まんなか',(0,0,.65),(.18,.16,.018),'teal')
def greece(v):
    if v==0:
        torus('くもの わ',(0,0,1.03),.33,.055,'white')
        for x in [-.25,0,.25]:
            tube('ふうりんの いと',[(x,0,.85),(x,0,.45)],.015,'gold');cyl('あおい ふうりん',(x,0,.4),.1,.21,'blue',10)
        for x in [-.25,0,.25]:sphere('くも',(x,0,1.02),(.2,.18,.15),'white')
    elif v==1:
        cyl('しろい だい',(0,0,.15),.45,.22,'white');cyl('しろい いえ',(0,0,.48),.32,.53,'cream');sphere('あおい ドーム',(0,0,.76),(.36,.36,.18),'blue')
        cube('いりぐち',(0,-.32,.37),(.19,.035,.32),'teal',0);torus('おんがくの わ',(0,0,.97),.12,.02,'gold')
    else:
        cube('そらぶねの かご',(0,0,.38),(.62,.33,.26),'wood');sphere('そらぶねの ふうせん',(0,0,1.08),(.47,.35,.45),'white')
        for x in [-.22,.22]:tube('そらぶねの つな',[(x,0,.48),(x,0,.88)],.018,'gold')
        cube('あおい つばさ',(0,.22,.44),(.8,.14,.08),'blue')
def mexico(v):
    if v==0:
        tube('いわいの ひも',[(-.68,0,1.0),(0,0,.93),(.68,0,1.0)],.018,'gold')
        for i in range(5):
            x=(i-2)*.28;mat=['red','yellow','tile','paper','blue'][i]
            cube('きりがみ',(x,0,.69),(.22,.035,.4),mat,.008)
            for dx in [-.055,.055]:sphere('きりぬき',(x+dx,-.025,.7),(.018,.008,.018),'cream',8,4)
    elif v==1:
        star((0,0,.65),.74,'yellow');torus('つりひも',(0,0,1.14),.1,.025,'gold')
        for i,mat in enumerate(['paper','tile','red','rose','blue']):
            a=pi/2+i*2*pi/5
            sphere('ほしの いろおび',(.48*cos(a),-.085,.65+.48*sin(a)),(.11,.025,.065),mat,10,6)
        for i in range(5):
            a=i*2*pi/5
            for j,mat in enumerate(['paper','rose','tile']):
                x=.38*cos(a)+(j-1)*.045
                tube('いろがみの ふさ',[(x,-.09,.55),(.52*cos(a)+(j-1)*.045,-.09,.23)],.014,mat)
    else:
        cyl('ちいさな まるい だい',(0,0,.12),.56,.2,'red');torus('だいの ふち',(0,0,.23),.5,.025,'gold')
        for i in range(4):
            a=i*pi/2;cx=.35*cos(a);cy=.35*sin(a)
            sphere('もくばの からだ',(cx,cy,.48),(.16,.09,.12),'cream',12,8)
            sphere('もくばの くら',(cx-.025,cy,.58),(.09,.075,.025),'red',10,6)
            sphere('もくばの くび',(cx+.13,cy,.57),(.05,.055,.12),'cream',10,6)
            sphere('もくばの かお',(cx+.19,cy,.65),(.11,.07,.07),'cream',10,6)
            sphere('もくばの はな',(cx+.28,cy,.62),(.045,.05,.04),'shell',8,4)
            for yy in [-.045,.045]:
                sphere('もくばの め',(cx+.23,cy+yy,.68),(.012,.012,.012),'ink',8,4)
                cone('もくばの みみ',(cx+.16,cy+yy,.75),.025,0,.09,'cream',8)
            for xx in [-.09,.1]:
                for yy in [-.05,.05]:tube('もくばの あし',[(cx+xx,cy+yy,.42),(cx+xx,cy+yy,.25)],.022,'wood')
            tube('もくばの しっぽ',[(cx-.15,cy,.53),(cx-.23,cy,.58),(cx-.26,cy,.49)],.018,'gold')
            tube('もくばの ささえ',[(cx,cy,.22),(cx,cy,.83)],.014,'gold')
        cone('まわる やね',(0,0,.91),.48,0,.35,'paper',12);cyl('ほしの ぼう',(0,0,.64),.025,.78,'gold')
        star((0,0,1.14),.24,'yellow')

SPECS=[
 ('japan-shell-gift',1,'桜貝の贈り物箱','ふたと貝を分けて開く',japan,0),('japan-tidepool-light',1,'潮だまりの小灯り','貝と水面を分ける',japan,1),('japan-sakura-wreath',1,'桜枝の輪飾り','季節の花を差し替える',japan,2),
 ('finland-birch-lamp',2,'白樺と苔の灯り','灯り窓を分ける',finland,0),('finland-pine-bell',2,'松ぼっくりの鈴','吊り輪を分ける',finland,1),('finland-forest-boat',2,'森の小舟','帆を分ける',finland,2),
 ('netherlands-canal-windmill',3,'運河の小風車','羽根を回せる',netherlands,0),('netherlands-clock-house',3,'切妻の時計小屋','時計面を分ける',netherlands,1),('netherlands-tulip-cart',3,'チューリップの手押し車','花を交換できる',netherlands,2),
 ('switzerland-gear-ornament',4,'工房の歯車飾り','歯車を回せる',switzerland,0),('switzerland-waterwheel-toy',4,'水車の卓上玩具','水車を回せる',switzerland,1),('switzerland-toolbox',4,'アルプスの道具箱','ふたと取手を分ける',switzerland,2),
 ('morocco-tile-box',5,'模様タイルの小箱','ふたと模様を分ける',morocco,0),('morocco-arch-lantern',5,'市場のアーチ灯り','灯りと骨を分ける',morocco,1),('morocco-tea-tray',5,'茶器のお盆','器を個別に分ける',morocco,2),
 ('palau-pearl-gift',6,'真珠の貝の贈り物','貝のふたを開ける',palau,0),('palau-coral-lamp',6,'珊瑚の灯り','珊瑚枝と光を分ける',palau,1),('palau-turtle-charm',6,'海亀の小飾り','甲羅とひれを分ける',palau,2),
 ('greece-cloud-chime',7,'雲の風鈴','鈴を個別に揺らす',greece,0),('greece-blue-dome-box',7,'青ドームの小箱','ドームを分ける',greece,1),('greece-airship-kite',7,'空船の凧飾り','風船と籠を分ける',greece,2),
 ('mexico-paper-garland',8,'切り紙の祝い飾り','紙片を個別に揺らす',mexico,0),('mexico-star-pinata',8,'星の贈り物','吊り紐と垂れ飾りを分ける',mexico,1),('mexico-carousel-mini',8,'回転木馬の小置物','屋根と木馬を分ける',mexico,2)]

def view_and_export(id):
    scene=bpy.context.scene;scene.render.engine='BLENDER_EEVEE';scene.render.resolution_x=560;scene.render.resolution_y=520;scene.render.resolution_percentage=100
    scene.render.image_settings.color_mode='RGB';scene.view_settings.view_transform='AgX'
    world=scene.world or bpy.data.worlds.new('やわらかな そら');scene.world=world;world.use_nodes=True
    world.node_tree.nodes['Background'].inputs['Color'].default_value=(.8,.83,.84,1)
    world.node_tree.nodes['Background'].inputs['Strength'].default_value=.35
    extras=[]
    floor=cube('さつえいの ゆか',(0,0,-.045),(200,200,.08),'cream',0);extras.append(floor)
    for name,loc,power,size in [('おおきな ひかり',(2,-3,5),180,4),('やわらかい ひかり',(-3,2,3),90,4)]:
        data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size
        lamp=bpy.data.objects.new(name,data);bpy.context.collection.objects.link(lamp);lamp.location=loc;lamp.rotation_euler=(Vector((0,0,.4))-lamp.location).to_track_quat('-Z','Y').to_euler();extras.append(lamp)
    bpy.ops.object.camera_add(location=(2.5,-3.2,2.35));camera=bpy.context.object;direction=Vector((0,0,.55))-camera.location;camera.rotation_euler=direction.to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=2.55;scene.camera=camera;extras.append(camera)
    scene.render.image_settings.file_format='PNG';scene.render.filepath=os.path.join(OUT,id+'.png');bpy.ops.render.render(write_still=True)
    for obj in extras:bpy.data.objects.remove(obj,do_unlink=True)
    bpy.ops.wm.save_as_mainfile(filepath=os.path.join(OUT,id+'.blend'))
    bpy.ops.object.select_all(action='SELECT');bpy.ops.export_scene.gltf(filepath=os.path.join(GAME,id+'.glb'),export_format='GLB',use_selection=True,export_apply=True)

def mesh_data():
    result=[];deps=bpy.context.evaluated_depsgraph_get()
    for original in [o for o in bpy.context.scene.objects if o.type in ('MESH','CURVE')]:
        e=original.evaluated_get(deps);mesh=e.to_mesh();mesh.calc_loop_triangles();vs=[];indices=[]
        for v in mesh.vertices:
            w=e.matrix_world@v.co;vs.extend([round(w.x,4),round(w.z,4),round(-w.y,4)])
        for tri in mesh.loop_triangles:indices.extend(tri.vertices)
        if vs:result.append({'name':original.name,'material':original.data.materials[0].name if original.data.materials else 'wood','positions':vs,'indices':indices})
        e.to_mesh_clear()
    return result

def main():
    entries=[];pack={};only=next((a.split('=',1)[1] for a in sys.argv if a.startswith('--only=')),None)
    for id,island,name,separate,builder,v in SPECS:
        if only and id!=only:continue
        clear();builder(v);meshes=mesh_data();coords=[m['positions'][i:i+3] for m in meshes for i in range(0,len(m['positions']),3)]
        minimum=[min(p[i] for p in coords) for i in range(3)];maximum=[max(p[i] for p in coords) for i in range(3)]
        triangles=sum(len(m['indices'])//3 for m in meshes)
        if not 0<triangles<10000:raise ValueError(id+' の面数が異常')
        if not all(math.isfinite(v) for p in coords for v in p):raise ValueError(id+' に有限でない座標')
        if any(maximum[i]-minimum[i]>3 for i in range(3)):raise ValueError(id+' の寸法が大きすぎる')
        view_and_export(id)
        entries.append({'id':id,'island':island,'name':name,'kind':['贈り物','建築小物','飾り'][v],'use':separate,'bounds_m':{'min':minimum,'max':maximum},'triangles':triangles,'objects':len(meshes),'source':'assets-src/islands/bonus/'+id+'.blend','preview':'assets-src/islands/bonus/'+id+'.png','glb':'assets/islands/bonus/'+id+'.glb','game_key':id,'state':'原本・個別形状・軽量形状を生成済み。ゲーム未配置'})
        pack[id]={'meshes':meshes,'bounds_m':{'min':minimum,'max':maximum}}
        print('作成',id,'面',triangles,flush=True)
    if only:return
    with open(os.path.join(OUT,'bonus-parts.json'),'w',encoding='utf-8') as f:json.dump({'schema_version':1,'source':'tools/build-island-gifts.py','parts':entries},f,ensure_ascii=False,indent=2)
    with open(os.path.join(GAME,'bonus-parts.json'),'w',encoding='utf-8') as f:json.dump({'version':1,'materials':{k:{'color':color(v[0]),'roughness':v[1],'metalness':v[2]} for k,v in MATS.items()},'assets':pack},f,ensure_ascii=False,separators=(',',':'))
    cards=''.join(f'<article><a href="{e["id"]}.png"><img src="{e["id"]}.png" alt="{e["name"]}"></a><h2>{e["name"]}</h2><p>第{e["island"]}島　{e["id"]}</p></article>' for e in entries)
    html=f'<!doctype html><html lang="ja"><meta charset="utf-8"><title>八島の小さな部品</title><style>body{{background:#f6f2e8;color:#3d342b;font-family:sans-serif;margin:24px}}main{{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}}article{{background:white;padding:10px;border-radius:10px}}img{{width:100%}}h2{{font-size:1.1em}}</style><h1>八島の小さな部品　24点</h1><p><a href="overview.jpg">八島を一枚で見る</a>。画像を選ぶと原寸で確認できます。</p><main>{cards}</main></html>'
    with open(os.path.join(OUT,'index.html'),'w',encoding='utf-8') as f:f.write(html)
    rows=[]
    for e in entries:
        low=e['bounds_m']['min'];high=e['bounds_m']['max'];size=' × '.join(f'{high[i]-low[i]:.2f}' for i in range(3))
        rows.append(f'| {e["island"]} | {e["name"]} | `{e["id"]}` | {size} | {e["use"]} | {e["triangles"]} |')
    readme='\n'.join([
        '# 八島の小さな部品',
        '',
        '採用済みの八島コンセプトアートと `docs/island-curriculum.md` に合わせ、各島３点、計24点の建築小物・飾り・贈り物を作成した。景観の主役や歩行路は変更しない。第一島は少数の小物を交換用に用意しただけで、操作を増やさない。',
        '',
        '正本は `bonus-parts.json` と各 `.blend`。個別 `.glb` は `assets/islands/bonus/`、軽量形状と材質は同じ場所の `bonus-parts.json` にある。`index.html` と `overview.jpg` で全点の実レンダーを比較できる。画像を選べば原寸を確認できる。ゲームへの配置・報酬・保存は未実装。',
        '',
        '形状はメートル単位。表は幅 × 高さ × 奥行。原点は各小物の中心付近、床上を高さ０とする。素材内の部品名でふた、羽根、鈴、花、紙片などを分けた。開閉や回転の支点と当たり判定は配置先で設定する。',
        '',
        '| 島 | 名前 | ID | 寸法 m | 分離して使う部分 | 三角面 |',
        '| --- | --- | --- | --- | --- | ---: |',
        *rows,
        '',
        '再生成は `Blender 5.2` で `blender -b -t 2 --python tools/build-island-gifts.py`、一覧画像は `python tools/render-island-gift-overview.py`。検証は `python tools/verify-island-gifts.py`。ゲームへ置くときは島の入口・主役・歩行路を覆わない位置を決め、画面と当たり判定を別に確認する。',
        ''
    ])
    with open(os.path.join(OUT,'README.md'),'w',encoding='utf-8') as f:f.write(readme)
    print('24点の原本・形状・一覧を作成しました',flush=True)

if __name__=='__main__':main()
