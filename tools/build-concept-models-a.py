"""採用済み原画の第一〜第四島にある主役をBlenderで制作する。"""
import bpy
import json
import math
import os
import random
import sys
from collections import defaultdict
from pathlib import Path
from mathutils import Vector

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets-src/islands/concept-models-a'
OUTPUT = ROOT / 'assets/islands/concept-models-a.json'
UPDATE_ONLY=os.environ.get('ICHI_CONCEPT_UPDATE')=='1' or os.environ.get('ICHI_CONCEPT_RENDER_ONLY')=='1'
SOURCE.mkdir(parents=True, exist_ok=True)
OUTPUT.parent.mkdir(parents=True, exist_ok=True)
random.seed(4104)
bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)

PALETTE = {
 'bark':('#8D5C3D','bark',.91,0),'barkDeep':('#66402E','bark',.94,0),
 'barkLight':('#B48156','bark',.88,0),'wood':('#C48645','wood',.72,0),
 'woodLight':('#E5AF68','wood',.66,0),'woodDark':('#764B2E','wood',.85,0),
 'plaster':('#F7E8CC','plaster',.89,0),'blueWall':('#638EA1','wood',.8,0),
 'blueRoof':('#306A87','roof',.62,.04),'tealRoof':('#25818A','roof',.58,.05),
 'redRoof':('#AE5943','roof',.75,0),'brick':('#B66D50','stone',.88,0),
 'brickDark':('#92523C','stone',.9,0),'brickLight':('#D89370','stone',.84,0),
 'stone':('#C8BBA5','stone',.91,0),'stoneDark':('#908A7F','stone',.95,0),
 'white':('#FDF3E4','plaster',.68,0),'metal':('#8A6A41','metal',.37,.75),
 'iron':('#3C4A50','metal',.42,.67),'glass':('#8AC6C3','glass',.13,.04),
 'window':('#F9D89A','glass',.29,0),'foliage':('#547A45','foliage',.88,0),
 'foliageLight':('#88A858','foliage',.84,0),'foliageDark':('#345D3E','foliage',.91,0),
 'blossom':('#ED98B6','blossom',.83,0),'blossomLight':('#F7C4D5','blossom',.8,0),
 'blossomDeep':('#D9729C','blossom',.85,0),'cloth':('#F7DDAE','cloth',.87,0),
 'redCloth':('#C77653','cloth',.86,0)
}
MATS={}
for key,(hex_color,kind,rough,metal) in PALETTE.items():
 rgb=[int(hex_color[i:i+2],16)/255 for i in (1,3,5)]
 m=bpy.data.materials.new(key);m.diffuse_color=(*rgb,1);m.use_nodes=True
 p=m.node_tree.nodes.get('Principled BSDF');p.inputs['Base Color'].default_value=(*rgb,1)
 p.inputs['Roughness'].default_value=rough;p.inputs['Metallic'].default_value=metal
 if key=='glass':
  p.inputs['Transmission Weight'].default_value=.55;p.inputs['Roughness'].default_value=.1
 MATS[key]=m

ASSETS={}
def begin(name):
 global CURRENT
 CURRENT=name;ASSETS[name]=[]
 print('造形開始:',name,flush=True)
def keep(obj,mat,name):
 obj.name=f'{CURRENT}_{name}';obj.data.materials.clear();obj.data.materials.append(MATS[mat]);ASSETS[CURRENT].append(obj)
 return obj
def cube(name,loc,scale,mat,bevel=0):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object
 o.dimensions=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 if bevel:
  mod=o.modifiers.new('角の丸み','BEVEL');mod.width=bevel;mod.segments=2
  o.modifiers.new('なめらかな法線','WEIGHTED_NORMAL')
 return keep(o,mat,name)
def boxes(name,items,mat):
 # 小さな煉瓦目地を一つのメッシュにまとめて造形する。
 verts=[];faces=[]
 for loc,scale in items:
  x,y,z=loc;w,d,h=scale;base=len(verts)
  verts.extend([(x+sx*w/2,y+sy*d/2,z+sz*h/2)
                for sz in (-1,1) for sy in (-1,1) for sx in (-1,1)])
  faces.extend(tuple(base+j for j in face) for face in
               ((0,1,3,2),(4,6,7,5),(0,4,5,1),(2,3,7,6),(0,2,6,4),(1,5,7,3)))
 return poly(name,verts,faces,mat)
def sphere(name,loc,scale,mat,sub=1):
 bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=sub,radius=1,location=loc);o=bpy.context.object
 o.scale=scale;return keep(o,mat,name)
def cylinder(name,loc,radius,depth,mat,verts=16,rotation=None):
 bpy.ops.mesh.primitive_cylinder_add(vertices=verts,radius=radius,depth=depth,location=loc);o=bpy.context.object
 if rotation:o.rotation_euler=rotation
 return keep(o,mat,name)
def segment(name,a,b,r1,r2,mat,sides=10):
 a,b=Vector(a),Vector(b);direction=b-a
 mid=(a+b)*.5
 bpy.ops.mesh.primitive_cone_add(vertices=sides,radius1=r1,radius2=r2,depth=direction.length,location=mid)
 o=bpy.context.object;o.rotation_euler=direction.to_track_quat('Z','Y').to_euler()
 return keep(o,mat,name)
def curved_wood(name,points,radii,mat,sides=20,steps=8):
 # 制御点を通る滑らかな管を一つの連続メッシュにする。
 path=[]
 def sample(a,b,c,d,t):
  return .5*((2*b)+(-a+c)*t+(2*a-5*b+4*c-d)*t*t+(-a+3*b-3*c+d)*t*t*t)
 for i in range(len(points)-1):
  p0=Vector(points[max(0,i-1)]);p1=Vector(points[i]);p2=Vector(points[i+1]);p3=Vector(points[min(len(points)-1,i+2)])
  for j in range(steps):
   t=j/steps;path.append((sample(p0,p1,p2,p3,t),radii[i]*(1-t)+radii[i+1]*t))
 path.append((Vector(points[-1]),radii[-1]))
 verts=[];faces=[]
 for i,(center,radius) in enumerate(path):
  tangent=(path[min(len(path)-1,i+1)][0]-path[max(0,i-1)][0]).normalized()
  axis=tangent.cross(Vector((0,1,0)))
  if axis.length<.01:axis=tangent.cross(Vector((1,0,0)))
  axis.normalize();other=tangent.cross(axis).normalized()
  for j in range(sides):
   a=math.tau*j/sides
   ripple=1+.035*math.sin(j*3+i*.21)
   p=center+radius*ripple*(axis*math.cos(a)+other*math.sin(a))
   verts.append(tuple(p))
 for i in range(len(path)-1):
  for j in range(sides):faces.append((i*sides+j,i*sides+(j+1)%sides,(i+1)*sides+(j+1)%sides,(i+1)*sides+j))
 faces.append(tuple(reversed(tuple(range(sides)))))
 faces.append(tuple((len(path)-1)*sides+j for j in range(sides)))
 o=poly(name,verts,faces,mat)
 for p in o.data.polygons:p.use_smooth=True
 return o
def poly(name,vertices,faces,mat):
 mesh=bpy.data.meshes.new(name);mesh.from_pydata(vertices,[],faces);mesh.update()
 o=bpy.data.objects.new(name,mesh);bpy.context.collection.objects.link(o)
 return keep(o,mat,name)
def ring(name,center,radius,tube,mat,axis='Y',start=0,end=math.tau,steps=40):
 pts=[];faces=[];sides=8
 for i in range(steps+1):
  t=start+(end-start)*i/steps
  for j in range(sides):
   q=math.tau*j/sides
   if axis=='Y': p=(center[0]+(radius+tube*math.cos(q))*math.cos(t),center[1]+tube*math.sin(q),center[2]+(radius+tube*math.cos(q))*math.sin(t))
   else: p=(center[0]+(radius+tube*math.cos(q))*math.cos(t),center[1]+(radius+tube*math.cos(q))*math.sin(t),center[2]+tube*math.sin(q))
   pts.append(p)
 for i in range(steps):
  for j in range(sides):
   a=i*sides+j;b=i*sides+(j+1)%sides;c=(i+1)*sides+(j+1)%sides;d=(i+1)*sides+j
   faces.append((a,b,c,d))
 return poly(name,pts,faces,mat)
def roof(name,w,d,eave,ridge,mat,x=0,y=0):
 # 切妻の屋根面には厚みをつけ、軒を広くする。
 vs=[(x-w/2,y-d/2,eave),(x,y-d/2,ridge),(x+w/2,y-d/2,eave),
     (x-w/2,y+d/2,eave),(x,y+d/2,ridge),(x+w/2,y+d/2,eave)]
 o=poly(name,vs,[(0,3,4,1),(1,4,5,2)],mat)
 mod=o.modifiers.new('屋根の厚み','SOLIDIFY');mod.thickness=.2
 mod=o.modifiers.new('屋根の縁','BEVEL');mod.width=.07;mod.segments=2
 return o
def gable(name,w,depth,eave,ridge,mat):
 for y in (-depth/2+.04,depth/2-.04):
  poly(name,[(-w/2,y,eave),(w/2,y,eave),(0,y,ridge)],[(0,1,2)],mat)
def window(name,x,y,z,w,h,front=True):
 cube(name+'ガラス',(x,y,z),(w,.07,h),'window',.03)
 for xx in (-1,1):cube(name+'縦枠',(x+xx*w/2,y-.07,z),(.12,.17,h+.16),'white',.025)
 for zz in (-1,1):cube(name+'横枠',(x,y-.07,z+zz*h/2),(w+.15,.17,.12),'white',.025)
 cube(name+'桟',(x,y-.09,z),(w,.1,.09),'white',.01)
 cube(name+'小桟',(x,y-.1,z),(.08,.1,h),'white',.01)
def dome(name,x,y,base,rise,radius,mat,segments=48,rings=12):
 # 丸屋根は輪を積んだ実面にして、縁と頂点をつなぐ。
 verts=[];faces=[]
 for j in range(rings+1):
  t=(math.pi/2)*j/rings;rr=max(.025,radius*math.cos(t));z=base+rise*math.sin(t)
  for i in range(segments):
   a=math.tau*i/segments;verts.append((x+rr*math.cos(a),y+rr*math.sin(a),z))
 for j in range(rings):
  for i in range(segments):
   a=j*segments+i;b=j*segments+(i+1)%segments
   faces.append((a,b,b+segments,a+segments))
 o=poly(name,verts,faces,mat)
 for f in o.data.polygons:f.use_smooth=True
 mod=o.modifiers.new('屋根の厚み','SOLIDIFY');mod.thickness=.13
 return o
def roof_tiles(name,w,d,eave,ridge,mat,x=0,y=0):
 # 瓦の継ぎ目を斜面の上に薄い実面として並べる。
 verts=[];faces=[];seam_verts=[];seam_faces=[];cols=7;rows=max(11,int(d*2.5))
 for side in (-1,1):
  for row in range(rows):
   ya=y-d/2+row*d/rows+.025;yb=y-d/2+(row+1)*d/rows-.025
   for col in range(cols):
    xa=.09+col*(w/2-.16)/cols;xb=.09+(col+1)*(w/2-.16)/cols-.035
    xa+=.025*(row%2);xb+=.025*(row%2)
    za=ridge-(xa/(w/2))*(ridge-eave)+.055
    zb=ridge-(xb/(w/2))*(ridge-eave)+.055
    base=len(verts);verts.extend([(x+side*xa,ya,za),(x+side*xb,ya,zb),
                                  (x+side*xb,yb,zb),(x+side*xa,yb,za)])
    faces.append((base,base+1,base+2,base+3))
   sy=y-d/2+(row+1)*d/rows
   base=len(seam_verts)
   seam_verts.extend([(x+side*.05,sy-.025,ridge+.085),
                      (x+side*(w/2-.13),sy-.025,eave+.085),
                      (x+side*(w/2-.13),sy+.025,eave+.085),
                      (x+side*.05,sy+.025,ridge+.085)])
   seam_faces.append((base,base+1,base+2,base+3))
 poly(name,verts,faces,mat)
 poly('屋根瓦の横の継ぎ目',seam_verts,seam_faces,'blueRoof' if mat=='tealRoof' else 'tealRoof')
def petal_cluster(cx,cy,cz,sx,sy,sz,shade,phase=0):
 # 樹冠を連続した花雲の面として作る。細い枝の上に不規則な縁を持つ。
 rings=5;segments=32;verts=[];faces=[]
 for k in range(rings):
  v=math.pi*k/(rings-1)
  for j in range(segments):
   u=math.tau*j/segments
   ripple=1+.075*math.sin(7*u+phase)+.045*math.sin(13*u-2*phase)+.03*math.sin(19*u)
   verts.append((cx+sx*math.sin(v)*math.cos(u)*ripple,
                 cy+sy*math.sin(v)*math.sin(u)*ripple,
                 cz+sz*math.cos(v)+.16*math.sin(u*5+phase)*math.sin(v)))
 for k in range(rings-1):
  for j in range(segments):faces.append((k*segments+j,k*segments+(j+1)%segments,(k+1)*segments+(j+1)%segments,(k+1)*segments+j))
 poly('連続した花の樹冠',verts,faces,shade)
def spray(name,clouds,count,mat,kind):
 # 小さな花びら・葉を空間へ散らし、一材質の単一メッシュにする。
 verts=[];faces=[]
 for i in range(count):
  cx,cy,cz,sx,sy,sz=clouds[i%len(clouds)]
  a=random.random()*math.tau;t=random.uniform(-1,1);r=random.random()**.35
  f=math.sqrt(1-t*t)*r
  center=Vector((cx+sx*f*math.cos(a),cy+sy*f*math.sin(a),cz+sz*t*r))
  direction=Vector((random.uniform(-1,1),random.uniform(-1,1),random.uniform(-.4,.7))).normalized()
  cross=direction.cross(Vector((0,0,1)))
  if cross.length<.1:cross=direction.cross(Vector((0,1,0)))
  cross.normalize()
  length=random.uniform(.16,.36) if kind=='flower' else random.uniform(.25,.6)
  width=length*(.7 if kind=='flower' else .38)
  base=len(verts)
  verts.extend([tuple(center-direction*length*.5),tuple(center+cross*width*.5),
                tuple(center+direction*length*.5),tuple(center-cross*width*.5),
                tuple(center+Vector((0,0,.045)))])
  faces.extend([(base,base+1,base+4),(base+1,base+2,base+4),
                (base+2,base+3,base+4),(base+3,base,base+4)])
 return poly(name,verts,faces,mat)
def little_clumps(name,clouds,count,mat,min_size=.13,max_size=.42):
 # 大きな球体を置かず、小花房・葉房の微細な重なりを一つのメッシュにする。
 phi=(1+math.sqrt(5))/2
 unit=[(-1,phi,0),(1,phi,0),(-1,-phi,0),(1,-phi,0),(0,-1,phi),(0,1,phi),
       (0,-1,-phi),(0,1,-phi),(phi,0,-1),(phi,0,1),(-phi,0,-1),(-phi,0,1)]
 unit=[Vector(v).normalized() for v in unit]
 triangles=[(0,11,5),(0,5,1),(0,1,7),(0,7,10),(0,10,11),(1,5,9),(5,11,4),
            (11,10,2),(10,7,6),(7,1,8),(3,9,4),(3,4,2),(3,2,6),(3,6,8),
            (3,8,9),(4,9,5),(2,4,11),(6,2,10),(8,6,7),(9,8,1)]
 verts=[];faces=[]
 for i in range(count):
  cx,cy,cz,sx,sy,sz=clouds[i%len(clouds)]
  a=random.random()*math.tau;t=random.uniform(-1,1);f=math.sqrt(1-t*t)
  radius=random.uniform(.65,1.03)
  center=Vector((cx+sx*f*math.cos(a)*radius,cy+sy*f*math.sin(a)*radius,cz+sz*t*radius))
  size=random.uniform(min_size,max_size)
  base=len(verts)
  verts.extend(tuple(center+v*size) for v in unit)
  faces.extend(tuple(base+j for j in tri) for tri in triangles)
 return poly(name,verts,faces,mat)
def five_petal_flowers(name,clouds,count,mat):
 # 一輪に五枚の杯状花弁を付け、枝先の表面へ向ける。
 verts=[];faces=[]
 for i in range(count):
  cx,cy,cz,sx,sy,sz=clouds[i%len(clouds)]
  a=random.random()*math.tau;t=random.uniform(-1,1);f=math.sqrt(1-t*t)
  center=Vector((cx+sx*f*math.cos(a),cy+sy*f*math.sin(a),cz+sz*t))
  outward=Vector((f*math.cos(a)/sx,f*math.sin(a)/sy,t/sz)).normalized()
  tangent=outward.cross(Vector((0,0,1)))
  if tangent.length<.1:tangent=outward.cross(Vector((0,1,0)))
  tangent.normalize();bitangent=outward.cross(tangent).normalized()
  radius=random.uniform(.11,.23)
  base=len(verts);verts.append(tuple(center))
  for j in range(5):
   angle=math.tau*j/5+random.uniform(-.08,.08)
   direction=tangent*math.cos(angle)+bitangent*math.sin(angle)
   side=outward.cross(direction).normalized()
   halfway=center+direction*radius*.58+outward*radius*.13
   tip=center+direction*radius+outward*radius*.34
   verts.extend([tuple(halfway-side*radius*.28),tuple(tip-side*radius*.37),
                 tuple(tip+side*radius*.37),tuple(halfway+side*radius*.28)])
   q=base+1+4*j
   faces.extend([(base,q,q+1),(base,q+1,q+2),(base,q+2,q+3)])
 return poly(name,verts,faces,mat)

if not UPDATE_ONLY:
 begin('blossomTree')
 trunk=[(0,0,.03),(.15,-.03,.8),(.05,.08,1.7),(.35,.1,2.6),(.18,.1,3.4),(.1,.05,4.4)]
 curved_wood('連続してねじれる幹',trunk,[1.08,1.02,.9,.79,.64,.42],'bark',24,8)
 for k in range(7):
  a=math.tau*k/7
  points=[(r*math.cos(a+.12*z),r*math.sin(a+.12*z),z) for z,r in ((.12,1.1),(1,1.06),(2,.91),(3,.74),(4,.49))]
  curved_wood('幹のねじれた樹皮の筋',points,[.055,.05,.045,.035,.008],'barkDeep',8,7)
 for q in range(7):
  a=math.tau*q/7
  points=[(.32*math.cos(a+.45),.26*math.sin(a+.45),2.2),(.75*math.cos(a+.2),.6*math.sin(a+.2),1.0),(1.32*math.cos(a),1.12*math.sin(a),.25),(2.1*math.cos(a),1.8*math.sin(a),.03)]
  curved_wood('地面へなだらかに広がる根',points,[.27,.28,.18,.03],'barkDeep',16,8)
 for k in range(9):
  a=math.tau*k/9+.15
  origin=(.22*math.cos(a),.1*math.sin(a),3.6)
  tip=(7.1*math.cos(a),3.4*math.sin(a),7.25+.85*math.sin(k*2))
  middle=(3.5*math.cos(a+.2),1.6*math.sin(a+.2),5.95)
  curved_wood('横へ張る一続きの主枝',[origin,(1.45*math.cos(a),.6*math.sin(a),4.65),middle,(5.2*math.cos(a),2.5*math.sin(a),6.65),tip],[.43,.36,.27,.17,.045],'bark',18,7)
  for j in (-1,1):
   side=(tip[0]+j*.95*math.cos(a+math.pi/2),tip[1]+j*.8*math.sin(a+math.pi/2),tip[2]+.5)
   curved_wood('花へ入る細枝',[middle,((middle[0]+side[0])*.5,(middle[1]+side[1])*.5,side[2]-.25),side],[.13,.09,.015],'bark',12,7)
 clouds=[(0,0,9.1,3.2,2.55,2.15)]
 for k in range(18):
  a=math.tau*k/18
  r=4.7+(k%4)*.55
  cx,cy,cz=r*math.cos(a),3.15*math.sin(a),8.1+.95*math.sin(3*a)+(.35 if k%2 else -.35)
  clouds.append((cx,cy,cz,2.7,2.15,1.75))
 for k in range(7):
  a=math.tau*k/7+.2
  cx,cy,cz=3.4*math.cos(a),2.2*math.sin(a),10.1+.35*math.cos(2*a)
  clouds.append((cx,cy,cz,2.45,1.7,1.6))
 for k,mat in enumerate(('blossom','blossomLight','blossomDeep')):
  little_clumps('小さな花房',clouds[k::3],1250,mat,.12,.29)
  five_petal_flowers('五枚の花びら',clouds[k::3],2800,mat)
  spray('風で揺れる花びら',clouds[k::3],700,mat,'flower')

 begin('forestArch')
 arch_path=[(-8.5,0,0),(-8.25,-.2,2.3),(-7.6,-.25,5.3),(-6.9,.1,8.7),
            (-5.2,.55,11.4),(-2.7,.95,13.1),(.8,1.25,13.8),(4.5,1.5,13.4),
            (7.1,1.65,14.1)]
 curved_wood('左の巨木が道へ覆いかぶさる主幹',arch_path,
             [2.5,2.35,2.1,1.82,1.59,1.32,1.05,.68,.055],'bark',28,9)
 curved_wood('右で主枝を受ける細い根幹',
             [(8.2,1.8,0),(8.0,1.65,2.7),(7.5,1.55,6.0),(6.8,1.4,9.4),
              (5.6,1.45,12.0),(4.3,1.5,13.3)],
             [.91,.84,.72,.59,.43,.14],'bark',22,8)
 curved_wood('左幹から道の上へ覆いかぶさる副主枝',
             [(-8.7,1.1,1.1),(-8.0,1.35,5.0),(-6.4,1.45,9.1),(-3.8,1.7,12.1),
              (-.9,1.8,14.1),(2.6,2.0,14.7),(5.6,2.1,14.2)],
             [1.3,1.21,1.08,.93,.74,.45,.05],'barkDeep',22,8)
 for k in range(13):
  offset=(k-6)*.31
  left=[(-8.5+offset,-2.35,.12),(-8.25+offset,-2.22,2.3),(-7.6+offset,-2.0,5.3),
        (-6.9+offset*.7,-1.67,8.7),(-5.2+offset*.4,-1.25,11.4)]
  curved_wood('左の幹を上る深い樹皮筋',left,[.075,.07,.06,.045,.01],'barkDeep',8,7)
 for k in range(7):
  offset=(k-3)*.23
  right=[(8.2+offset,.89,.1),(8.0+offset,.84,2.7),(7.5+offset,.84,6.0),
         (6.8+offset*.5,.81,9.4)]
  curved_wood('右の根から続く樹皮筋',right,[.055,.05,.045,.01],'barkDeep',8,7)
 for side in (-1,1):
  base_x=-8.5 if side<0 else 8.2
  base_y=0 if side<0 else 1.8
  spread=3.5 if side<0 else 2.0
  for n in range(9 if side<0 else 6):
   a=n*math.tau/(9 if side<0 else 6)
   root=(base_x+spread*math.cos(a),base_y+spread*.62*math.sin(a),.04)
   curved_wood('左右で太さの違う根',[(base_x,base_y,3.2),(base_x+.35*math.cos(a),base_y+.3*math.sin(a),1.6),
               (base_x+spread*.55*math.cos(a),base_y+spread*.38*math.sin(a),.36),root],
               ([.63,.49,.26,.025] if side<0 else [.36,.29,.17,.02]),'barkDeep',16,8)
 for k in range(13):
  a=-1.7+k*.28
  root=(-5.8+.45*math.cos(a),.4,10.5+.15*k)
  tip=(-8.2+2.8*math.sin(a),5.8*math.sin(a),15.7+1.3*math.cos(a))
  curved_wood('左の巨木から前後へ分かれる枝',[root,(-4.0,2.3*math.sin(a),13.2),tip],
              [.32,.19,.025],'bark',14,9)
 for k in range(8):
  a=-1.5+k*.42
  root=(3.5,.7,12.4)
  tip=(8.3+1.4*math.cos(a),4.8*math.sin(a),15.1+.8*math.cos(a))
  curved_wood('右へ張る細枝',[root,(6.4,2.3*math.sin(a),14.0),tip],[.19,.12,.018],'bark',12,8)
 for side in (-1,1):
  x=-8.5 if side<0 else 8.2
  for k in range(10):
   h=.8+k*.86
   curved_wood('幹に絡むツタ',[(x,-2.24 if side<0 else .86,h),
               (x+side*.2,-2.12 if side<0 else .9,h+.35),
               (x+side*.08,-2.0 if side<0 else .96,h+.7)],[.04,.04,.018],'foliageDark',6,6)
 forest_clouds=[(-7.8+i*2.2,random.uniform(-2.2,2.6),15.2+random.uniform(-.7,.8),
                 2.25,2.3,2.0) for i in range(9)]
 forest_clouds.extend((-8.2+2.8*math.sin(a),5.8*math.sin(a),15.7+1.3*math.cos(a),1.7,1.65,1.55)
                      for a in [-1.7+k*.28 for k in range(13)])
 forest_clouds.extend((8.3+1.4*math.cos(a),4.8*math.sin(a),15.1+.8*math.cos(a),1.35,1.5,1.4)
                      for a in [-1.5+k*.42 for k in range(8)])
 for i,mat in enumerate(('foliage','foliageDark','foliageLight')):
  little_clumps('細かな葉房',forest_clouds[i::3],1900,mat,.17,.46)
  spray('枝に重なる多数の小葉',forest_clouds[i::3],7700,mat,'leaf')
 for obj in ASSETS['forestArch']:
  obj.scale.x*=.88;obj.scale.y*=.65;obj.scale.z*=.94
 bpy.context.view_layer.update()

 def nordic_school():
  begin('nordicSchool')
  cube('板壁の本体',(0,0,2.75),(7.2,6.5,5.5),'blueWall',.13)
  for side in (-1,1):
   for i in range(10):cube('板壁の継ぎ目',(side*3.62,-2.85+i*.62,2.75),(.035,.035,5.2),'woodLight',.01)
  roof('大きな青い切妻',8.3,7.3,5.45,7.05,'blueRoof')
  gable('校舎の切妻壁',7.15,6.5,5.45,6.82,'blueWall')
  for yy in (-3.6,3.6):
   for side in (-1,1):segment('屋根端の白い破風',(0,yy,7.05),(side*4.15,yy,5.45),.09,.09,'white',8)
  for x in (-2.25,2.25):window('校舎の窓',x,-3.3,3.1,1.25,1.65)
  cylinder('妻面の丸窓',(0,-3.34,6.05),.48,.1,'white',24,rotation=(math.pi/2,0,0))
  cylinder('丸窓の青いガラス',(0,-3.43,6.05),.37,.12,'glass',24,rotation=(math.pi/2,0,0))
  for a in (0,math.pi/2):
   segment('丸窓の白い桟',(-.37*math.cos(a),-3.53,6.05-.37*math.sin(a)),(.37*math.cos(a),-3.53,6.05+.37*math.sin(a)),.035,.035,'white',8)
  cube('玄関の扉',(0,-3.39,1.35),(1.45,.15,2.7),'woodDark',.08)
  cylinder('扉の取手',(.48,-3.55,1.4),.07,.12,'metal',12,rotation=(math.pi/2,0,0))
  cube('玄関の屋根',(0,-3.85,3.05),(2.45,1.3,.18),'blueRoof',.06)
  for x in (-3.45,3.45):cube('白い角の柱',(x,-3.3,2.7),(.15,.2,5.2),'white',.025)
  for x in (-2.3,2.3):window('裏の窓',x,3.3,3.1,1.25,1.65)
 nordic_school()

def house(name,w,h,d,brick,roofmat,seed):
 begin(name)
 wallh=h-2.5
 cube('煉瓦の壁',(0,0,wallh/2),(w-.4,d-.5,wallh),brick,.08)
 # 段状の切妻は三角形を平板で済ませず、左右の肩を積み上げる。
 steps=5
 for k in range(steps):
  width=w-.5-k*.75
  cube('段状切妻の煉瓦',(0,-d/2+.08,wallh+.22+k*.39),(width,.38,.42),brick,.05)
  cube('段の白い笠石',(0,-d/2-.16,wallh+.43+k*.39),(width+.12,.16,.1),'white',.025)
 roof('奥へ続く青緑屋根',w,d,wallh-.2,h-.25,roofmat,y=.2)
 roof_tiles('重なった青緑の瓦',w,d,wallh-.2,h-.25,'blueRoof' if roofmat=='tealRoof' else 'tealRoof',y=.2)
 gable('段状切妻の奥壁',w-.5,d-.5,wallh-.3,h-1.0,brick)
 for zz in [2.25,4.65,7.05,9.45]:
  if zz>wallh-.6:continue
  for x in (-w*.26,w*.26):
   window('大きな白枠の縦窓',x,-d/2-.18,zz,1.02,1.70)
   cube('窓下の石の飾り',(x,-d/2-.30,zz-.95),(1.25,.30,.18),'white',.035)
   ring('窓上の丸い石枠',(x,-d/2-.23,zz+.78),.54,.085,'white',axis='Y',start=0,end=math.pi,steps=16)
 cube('入口の奥まった青い扉',(0,-d/2-.21,1.35),(1.56,.16,2.62),'blueRoof',.09)
 ring('入口の厚い石アーチ',(0,-d/2-.32,2.5),.86,.20,'white',axis='Y',start=0,end=math.pi,steps=24)
 for x in (-.94,.94):cube('入口の石柱',(x,-d/2-.30,1.40),(.25,.29,2.76),'white',.06)
 cylinder('真鍮の取手',(.57,-d/2-.39,1.35),.075,.13,'metal',12,rotation=(math.pi/2,0,0))
 seams=[]
 for row in range(int(wallh/.47)):
  z=.3+row*.47
  for col in range(int(w/.75)):
   x=-w/2+.5+col*.75+(.37 if row%2 else 0)
   if abs(x)>w/2-.35:continue
   seams.append(((x,-d/2-.14,z),(.64,.02,.018)))
   if row%2==0:
    for col in range(int(w/.75)):
     x=-w/2+.40+col*.75
     if abs(x)<w/2-.35:seams.append(((x,-d/2-.17,z+.22),(.022,.035,.29)))
 boxes('立体の煉瓦目地',seams,'brickDark')
 for x in (-w/2+.20,w/2-.20):
  cube('両隅の厚い石枠',(x,-d/2-.13,wallh/2),(.30,.36,wallh),'white',.06)
  for z in [1.2,3.2,5.2,7.2,9.2]:
   if z<wallh:cube('隅石の節',(x,-d/2-.34,z),(.43,.15,.20),'stone',.035)
 for z in (3.35,5.8,8.2):
  if z<wallh-.15:cube('階ごとの厚い石帯',(0,-d/2-.13,z),(w,.32,.20),'white',.05)
 for yy in (-d/2-.27,d/2+.23):
  for s in (-1,1):
   segment('切妻の太い斜め縁',(0,yy,h-.27),(s*w/2,yy,wallh-.2),.15,.16,'white',12)
 cube('玄関の低い石段',(0,-d/2-.74,.17),(2.85,.95,.34),'stone',.06)
 for x in (-w*.26,w*.26):
  cube('花箱',(x,-d/2-.42,3.9),(.85,.5,.3),'wood',.05)
  for q in range(4):sphere('花箱の花',(x-.3+q*.2,-d/2-.55,4.17),(.14,.13,.16),['blossom','foliageLight'][q%2])
house('canalHouseA',6.0,10.4,7.0,'brick','tealRoof',1)
house('canalHouseB',6.0,12.3,7.0,'brickDark','blueRoof',2)
house('canalHouseC',6.0,9.3,7.0,'brickLight','tealRoof',3)

begin('harborClock')
cylinder('時計塔の広い石基壇',(0,0,.72),5.05,1.44,'stone',48)
cylinder('煉瓦の幅広い円塔',(0,0,9.05),4.25,16.7,'brick',48)
for z in (1.55,5.05,9.25,12.0,16.95):ring('白い石の帯',(0,0,z),4.30,.23,'white',axis='Z',steps=64)
for k in range(16):
 a=math.tau*k/16
 cylinder('塔の立体石柱',(4.28*math.cos(a),4.28*math.sin(a),9.15),.18,15.6,'white',12)
clock_seams=[]
for z in (2.0,5.65,9.8):
 for k in range(24):
  a=math.tau*k/24
  clock_seams.append(((4.27*math.sin(a),-4.27*math.cos(a),z),(.24,.12,.17)))
boxes('円塔の煉瓦の節',clock_seams,'brickDark')
for k in range(4):
 a=math.tau*k/4
 x,y=4.37*math.sin(a),-4.37*math.cos(a)
 if k==0:
  cylinder('時計の盤面',(x,y,14.5),1.73,.23,'cloth',48,rotation=(math.pi/2,0,0))
 else:
  rotation=(math.pi/2,0,0) if k==2 else (math.pi/2,0,math.pi/2)
  cylinder('上階の丸い石窓',(x,y,14.5),.76,.17,'white',32,rotation=rotation)
  cylinder('上階の青い丸窓',(x+(.12 if k==1 else -.12 if k==3 else 0),y+(.12 if k==2 else 0),14.5),.56,.20,'glass',32,rotation=rotation)
 # 正面の盤面を主に作り、針と目盛りを独立した立体とする。
 if k==0:
  ring('時計の外輪',(0,-4.55,14.5),1.72,.15,'metal',steps=48)
  for n in range(12):
   a=math.tau*n/12
   cube('時計の目盛り',(1.42*math.sin(a),-4.63,14.5+1.42*math.cos(a)),(.10,.10,.24),'metal',.015)
  segment('短針',(0,-4.67,14.5),(.72,-4.67,15.10),.11,.055,'iron',8)
  segment('長針',(0,-4.70,14.5),(-.42,-4.70,15.62),.065,.025,'iron',8)
cylinder('時計の中心',(0,-4.73,14.5),.16,.14,'metal',16,rotation=(math.pi/2,0,0))
cube('時計塔の奥まった入口',(0,-4.31,1.92),(2.0,.2,3.4),'woodDark',.11)
ring('入口の厚い石アーチ',(0,-4.50,3.42),1.15,.27,'white',start=0,end=math.pi,steps=32)
for x in (-1.20,1.20):cube('入口の石柱',(x,-4.48,1.86),(.38,.43,3.54),'white',.08)
for z in (5.7,9.5):
 cylinder('塔の丸窓',(0,-4.34,z),.62,.13,'white',32,rotation=(math.pi/2,0,0))
 cylinder('丸窓のガラス',(0,-4.47,z),.47,.1,'glass',32,rotation=(math.pi/2,0,0))
cylinder('頂部の広い見晴台',(0,0,18.00),4.3,1.25,'white',48)
for k in range(16):
 a=math.tau*k/16
 cylinder('見晴台の白い手すり柱',(4.07*math.cos(a),4.07*math.sin(a),18.95),.14,1.0,'white',12)
ring('見晴台の連続する手すり',(0,0,19.44),4.08,.13,'white',axis='Z',steps=64)
for k in range(8):
 a=math.tau*k/8
 x,y=3.54*math.cos(a),3.54*math.sin(a)
 cylinder('頂部の細柱',(x,y,19.86),.20,1.35,'white',12)
 if k%2==0:
  sphere('頂部の丸窓',(x,y,19.93),(.31,.31,.45),'glass',2)
cylinder('頂部の青緑の軒',(0,0,20.62),4.38,.39,'tealRoof',48)
dome('膨らむ青緑の丸屋根',0,0,20.80,2.28,4.26,'tealRoof')
for k in range(12):
 a=math.tau*k/12
 curved_wood('ドームの細い金属の骨',[(4.17*math.cos(a),4.17*math.sin(a),20.83),
            (2.75*math.cos(a),2.75*math.sin(a),22.45),(0,0,23.04)], [.055,.045,.02],'metal',8,5)
cylinder('小尖塔の台',(0,0,23.19),.35,.35,'metal',16)
segment('金の小尖塔',(0,0,23.33),(0,0,24.05),.20,.01,'metal',16)

begin('harborBakery')
cube('パン屋の壁',(0,0,3.65),(8.6,7.5,7.3),'brick',.12)
roof('青緑の屋根',9.5,8.3,7.2,9.2,'tealRoof')
roof_tiles('パン屋の屋根瓦',9.5,8.3,7.2,9.2,'blueRoof')
gable('パン屋の切妻壁',8.55,7.45,7.2,8.9,'brick')
for x in (-2.85,2.85):
 window('大きな店先の窓',x,-3.88,2.78,1.9,2.65)
 window('二階の窓',x,-3.88,6.25,1.32,1.6)
 ring('二階の窓の丸い石枠',(x,-3.96,6.98),.71,.13,'white',start=0,end=math.pi,steps=20)
 cube('窓の陳列用厚い棚',(x,-4.12,1.30),(2.18,.64,.19),'woodLight',.055)
 for j in range(6):
  sphere('店先の焼き立てパン',(x-.78+j*.31,-4.25,1.52),(.22,.18,.14),'woodLight',2)
cube('店の奥まった入口',(0,-3.89,1.42),(1.86,.18,2.75),'woodDark',.07)
ring('店の丸い入口の石枠',(0,-4.05,2.68),.99,.18,'white',start=0,end=math.pi,steps=24)
for x in (-1.06,1.06):cube('入口の石柱',(x,-4.03,1.42),(.24,.27,2.75),'white',.045)
for i in range(10):
 x0=-4.25+i*.85;x1=x0+.85
 verts=[];faces=[]
 for j in range(7):
  t=j/6;y=-3.84-1.87*t
  for k in range(3):
   u=k/2;xx=x0+(x1-x0)*u
   z=5.73-.72*t-.16*math.sin(math.pi*t)+.07*t*math.cos(math.pi*u)
   verts.append((xx,y,z))
 for j in range(6):
  for k in range(2):
   a=j*3+k;faces.append((a,a+1,a+4,a+3))
 o=poly('たわみのある縞布',verts,faces,'redCloth' if i%2 else 'cloth')
 mod=o.modifiers.new('縞布の厚み','SOLIDIFY');mod.thickness=.08
 poly('日よけの波形ふち',[(x0,-5.71,5.01),(x1,-5.71,5.01),
                         ((x0+x1)/2,-5.73,4.64)],[(0,1,2)],'redCloth' if i%2 else 'cloth')
for x in (-4.25,0,4.25):
 segment('日よけの横支え',(x,-3.82,5.78),(x,-5.72,4.97),.065,.055,'metal',10)
bakery_seams=[]
for row in range(13):
 z=.4+row*.47
 for col in range(11):
  x=-4.05+col*.75+(.35 if row%2 else 0)
  if abs(x)<4.13:bakery_seams.append(((x,-3.79,z),(.62,.03,.022)))
boxes('パン屋の煉瓦目地',bakery_seams,'brickDark')
for x in (-4.15,4.15):cube('パン屋の石の隅柱',(x,-3.78,3.55),(.34,.35,7.1),'white',.06)
cube('店の白い軒帯',(0,-3.81,7.20),(8.95,.35,.28),'white',.07)
for i in range(10):
 x=-3.95+i*.88
 cube('店先の敷石',(x,-4.39,.12),(.78,.92,.24),'stone',.035)
for x in (-3.7,3.7):cube('店の石柱',(x,-3.85,3.5),(.2,.2,6.8),'white',.04)

begin('harborGlasshouse')
cube('温室の石基礎',(0,0,.42),(10,12,.85),'stone',.12)
for x in (-4.5,4.5):
 for y in (-5.55,-2.78,0,2.78,5.55):
  cube('青緑の高い鉄骨',(x,y,4.12),(.18,.18,6.55),'tealRoof',.025)
for y in (-5.55,-2.78,0,2.78,5.55):
 arc_points=[]
 for j in range(25):
  x=-4.5+9*j/24
  arc_points.append((x,y,7.28+2.38*math.sin(math.pi*(x+4.5)/9)))
 curved_wood('連続する丸屋根の鉄骨',arc_points,[.095]*25,'tealRoof',10,2)
for x in (-3.4,-1.7,0,1.7,3.4):
 for j in range(4):
  ya=-5.55+j*2.78;yb=ya+2.78
  zz=7.28+2.38*math.sin(math.pi*(x+4.5)/9)
  segment('縦に続く屋根骨',(x,ya,zz),(x,yb,zz),.075,.075,'tealRoof',8)
glass_verts=[];glass_faces=[]
for j in range(4):
 ya=-5.50+j*2.76;yb=ya+2.68
 for k in range(24):
  xa=-4.48+8.96*k/24;xb=-4.48+8.96*(k+1)/24
  za=7.28+2.38*math.sin(math.pi*(xa+4.5)/9)
  zb=7.28+2.38*math.sin(math.pi*(xb+4.5)/9)
  base=len(glass_verts)
  glass_verts.extend([(xa,ya,za),(xb,ya,zb),(xb,yb,zb),(xa,yb,za)])
  glass_faces.append((base,base+1,base+2,base+3))
poly('丸く続くガラス屋根',glass_verts,glass_faces,'glass')
for y in (-4.16,-1.39,1.39,4.16):
 for x in (-4.51,4.51):
  cube('透ける側壁',(x,y,4.07),(.055,2.52,6.50),'glass',.015)
  cube('側壁の水平な枠',(x,y,4.28),(.15,2.57,.12),'tealRoof',.025)
for y in (-5.55,5.55):
 for x in (-3.0,3.0):cube('妻面のガラス',(x,y,4.1),(2.8,.055,6.45),'glass',.02)
 for x in (-4.55,4.55):cube('妻面の鉄柱',(x,y,4.15),(.15,.18,6.6),'tealRoof',.025)
cube('温室の両開き入口',(0,-5.74,2.14),(2.25,.16,3.95),'tealRoof',.06)
for x in (-.52,.52):cube('入口のガラス',(x,-5.86,2.14),(.88,.05,3.65),'glass',.02)
ring('入口の丸い枠',(0,-5.89,4.04),1.10,.12,'tealRoof',start=0,end=math.pi,steps=24)
for y in (-3.8,0,3.8):
 cylinder('ガラスの小塔の台',(0,y,9.67),1.34,.26,'tealRoof',24)
 cylinder('ガラスの小塔',(0,y,10.33),1.04,1.18,'glass',24)
 for k in range(8):
  a=math.tau*k/8
  cylinder('小塔の青緑の枠',(1.03*math.cos(a),y+1.03*math.sin(a),10.33),.055,1.18,'tealRoof',8)
 dome('小塔の丸いガラス屋根',0,y,10.93,.86,1.20,'glass',32,8)
 sphere('小塔の金具',(0,y,11.85),(.13,.13,.22),'metal',2)
for x in (-3.5,3.5):
 for y in (-3.8,0,3.8):
  cube('花台',(x,y,1.15),(1.0,1.2,.15),'wood',.04)
  for j in range(3):sphere('温室の葉',(x-.26+j*.26,y,1.57),(.2,.22,.36),'foliage',1)

if not UPDATE_ONLY:
 begin('lighthouse')
 cylinder('石の灯台',(0,0,6.0),1.75,12,'white',20)
 for z in (1.25,4.7,8.15):ring('水平の石目',(0,0,z),1.77,.07,'stone',axis='Z',steps=32)
 for z in (3,7):cube('海を見る小窓',(0,-1.79,z),(.52,.1,.82),'window',.025)
 cylinder('灯室の台',(0,0,12.35),2.1,.5,'stone',20)
 cylinder('灯りのガラス',(0,0,13.1),1.5,1.15,'glass',20)
 for k in range(8):
  a=math.tau*k/8
  cylinder('灯室の枠',(1.45*math.cos(a),1.45*math.sin(a),13.1),.08,1.2,'iron',8)
 bpy.ops.mesh.primitive_cone_add(vertices=20,radius1=2,radius2=.28,depth=1.2,location=(0,0,14.25));keep(bpy.context.object,'tealRoof','灯台の屋根')

 begin('alpineWorkshop')
 cube('石積みの基礎',(0,0,.55),(19.3,11.5,1.1),'stone',.18)
 for x in (-9.0,9.0):cube('木造の側壁',(x,0,5.2),(.7,11.1,8.8),'wood',.1)
 cube('奥の漆喰壁',(0,5.45,5.6),(18.5,.42,8.6),'plaster',.1)
 for x in (-8.6,-4.3,0,4.3,8.6):
  cube('正面の太い柱',(x,-5.35,5.3),(.56,.62,8.45),'woodDark',.11)
  cube('梁の木口',(x,-5.62,9.55),(.88,.94,.88),'woodLight',.09)
 cube('入口の横梁',(0,-5.4,9.75),(19.3,.68,.65),'woodDark',.1)
 roof('大きな赤茶色の屋根',21.5,13.1,10.0,14.6,'redRoof',y=.3)
 gable('工房の二階切妻壁',18.0,11.0,9.95,13.75,'plaster')
 for side in (-1,1):
  for row in range(13):
   y=-6.05+row*.99
   x0=.2;x1=10.55
   z0=14.6-(x0/10.75)*4.6+.05
   z1=14.6-(x1/10.75)*4.6+.05
   poly('赤い屋根瓦の段',[(side*x0,y,z0),(side*x1,y,z1),(side*x1,y+.08,z1),(side*x0,y+.08,z0)],[(0,1,2,3)],'brickDark')
 for yy in (-6.2,6.8):
  for side in (-1,1):segment('張り出した屋根の木製破風',(0,yy,14.6),(side*10.75,yy,10.0),.17,.17,'woodDark',10)
 for side in (-1,1):
  segment('切妻を支える太い斜材',(0,-5.7,13.7),(side*7.4,-5.7,10.2),.29,.24,'woodDark',12)
  segment('切妻の横組み梁',(0,-5.8,11.3),(side*8.3,-5.8,11.3),.26,.26,'wood',12)
 roof('作業場を覆う手前の小屋根',8.2,5.0,7.65,10.75,'redRoof',x=-4.0,y=-5.25)
 for x in (-7.9,-.1):cube('小屋根の木柱',(x,-7.45,4.3),(.35,.35,6.75),'woodDark',.065)
 for x in (-7.9,-.1):segment('木柱から屋根への筋交い',(x,-7.45,6.2),(x+(.8 if x<0 else -.8),-7.0,7.7),.16,.13,'wood',10)
 for x in (-7.0,7.0):
  cube('二階のバルコニー',(x,-6.1,8.1),(5.1,2.0,.4),'wood',.09)
  for k in range(5):cube('バルコニーの手すり',(x-2+k, -7.0,8.9),(.16,.16,1.35),'woodDark',.03)
  cube('花箱',(x,-7.12,8.1),(3.0,.52,.45),'woodDark',.06)
  for k in range(9):sphere('花と葉',(x-1.3+k*.33,-7.16,8.48),(.2,.2,.22),['foliage','blossomLight','blossom'][k%3])
 cube('開いた工房の床',(0,-4.2,1.18),(15.8,10.2,.2),'woodLight',.06)
 for x in (-5.2,1.3,5.5):
  cube('工作台の天板',(x,-4.45,2.0),(3.3,1.5,.28),'woodLight',.07)
  for xx in (-1.35,1.35):
   for yy in (-.5,.5):cube('工作台の脚',(x+xx,-4.45+yy,1.5),(.2,.2,.8),'woodDark',.025)
  for k in range(4):cube('丸い積み木',(x-1.1+k*.58,-4.4,2.27),(.4,.4,.32),['wood','redRoof','blueRoof','woodLight'][k],.06)
 cube('庭から見える大工作台',(-4.2,-8.0,1.55),(5.3,2.2,.32),'woodLight',.12)
 for x in (-6.4,-2.0):
  for y in (-8.75,-7.25):cube('工作台の太い脚',(x,y,.76),(.35,.35,1.35),'woodDark',.07)
 for k in range(5):
  x=-6.1+k*.9
  cube('工作台の積み木',(x,-8.1,1.97),(.55,.52,.5),['wood','blueRoof','redRoof','woodLight','wood'][k],.09)
 for row in range(3):
  for k in range(5):
   cube('片側へ積んだ切り出し材',(6.6,-7.6+k*.24,1.45+row*.3),(3.3,.18,.23),'woodLight' if row%2 else 'wood',.035)
 for x in (-6.5,6.5):
  cube('室内の棚',(x,4.8,3.35),(2.6,.65,.2),'woodDark',.04)
  cube('室内の上棚',(x,4.8,4.8),(2.6,.65,.2),'woodDark',.04)
  for j in range(4):
   cube('棚の木箱',(x-1.0+j*.65,4.8,3.7),(.45,.42,.5),'woodLight',.05)
 for x in (-7.2,7.2):window('二階の工房窓',x,-5.75,10.6,1.2,1.55)

 begin('greatWaterwheel')
 for y in (-.78,.78):
  ring('水車の太い外輪',(0,y,6.05),5.82,.35,'woodLight',steps=64)
  ring('内側の組み木',(0,y,6.05),4.95,.22,'wood',steps=64)
 for k in range(12):
  a=math.tau*k/12
  for y in (-.8,.8):
   segment('中心から外輪への放射梁',(0,y,6.05),(5.62*math.cos(a),y,6.05+5.62*math.sin(a)),.3,.22,'wood',10)
  cube('水を受ける羽板',(5.55*math.cos(a),0,6.05+5.55*math.sin(a)),(1.0,2.0,.35),'woodLight',.07).rotation_euler[1]=-a
  for y in (-.85,.85):
   sphere('外輪の留め金',(5.72*math.cos(a),y,6.05+5.72*math.sin(a)),(.1,.08,.1),'metal',1)
 cylinder('独立した回転軸',(0,0,6.05),.72,3.1,'woodDark',20,rotation=(math.pi/2,0,0))
 for y in (-1.55,1.55):cylinder('軸の真鍮金具',(0,y,6.05),.78,.18,'metal',20,rotation=(math.pi/2,0,0))

 begin('workshopAqueduct')
 for x in (-5.45,0,5.45):
  cube('樋の支柱',(x,0,3.05),(.58,.58,6.1),'woodDark',.08)
  segment('支柱の斜め補強',(x,0,3.0),(x+1.0,0,4.5),.18,.16,'wood',8)
 cube('水路の底板',(0,0,5.8),(12.0,2.0,.28),'woodLight',.08)
 for y in (-.96,.96):cube('水路の側板',(0,y,6.18),(12.0,.2,.85),'wood',.07)
 for x in (-5.7,5.7):cube('樋の木口',(x,0,5.78),(.22,2.2,.32),'woodDark',.035)

def evaluated_triangles(objects):
 # モディファイアと配置を確定し、同材質の部品を一つの描画メッシュへまとめる。
 deps=bpy.context.evaluated_depsgraph_get();group=defaultdict(lambda:{'positions':[],'normals':[],'indices':[],'lookup':{}})
 for obj in objects:
  mat=obj.data.materials[0].name;dest=group[mat]
  ev=obj.evaluated_get(deps);mesh=ev.to_mesh();mesh.calc_loop_triangles()
  mat_world=obj.matrix_world
  normal_matrix=mat_world.to_3x3().inverted().transposed()
  for tri in mesh.loop_triangles:
   triangle=[]
   for li in tri.loops:
    vertex=mesh.vertices[mesh.loops[li].vertex_index]
    p=mat_world @ vertex.co
    n=(normal_matrix @ vertex.normal).normalized()
    # Blenderの前方-YをThree.jsの前方+Zへ変える。
    position=(p.x,p.z,-p.y)
    if CURRENT=='greatWaterwheel':position=(position[0],position[1]-6.05,position[2])
    normal=(n.x,n.z,-n.y)
    triangle.append((position,normal))
   if not all(math.isfinite(v) for position,normal in triangle for v in (*position,*normal)):
    continue
   a,b,c=(Vector(v[0]) for v in triangle)
   face=(b-a).cross(c-a)
   if face.length_squared<1e-12:continue
   face.normalize()
   for position,normal in triangle:
    if Vector(normal).length_squared<.01:normal=tuple(face)
    values=tuple(round(float(v),5) for v in (*position,*normal))
    idx=dest['lookup'].get(values)
    if idx is None:
     idx=len(dest['positions'])//3
     dest['lookup'][values]=idx
     dest['positions'].extend(values[:3]);dest['normals'].extend(values[3:])
    dest['indices'].append(idx)
  ev.to_mesh_clear()
 prefix='rotate_' if CURRENT=='greatWaterwheel' else ''
 return [{'name':f'{prefix}{CURRENT}_{mat}','material':mat,
          'positions':v['positions'],'normals':v['normals'],'indices':v['indices']} for mat,v in group.items()]
def render_asset(key):
 for o in bpy.context.scene.objects:
  if o.type=='MESH':o.hide_render=o not in ASSETS[key]
 dims=REPORT[key]['size'];w,h,d=dims
 camera_data=bpy.data.cameras.new('確認用カメラ');camera=bpy.data.objects.new('確認用カメラ',camera_data);bpy.context.collection.objects.link(camera)
 camera.location=(w*.95,-max(w,d)*1.55,h*.9)
 target=Vector((0,0,h*.48));camera.rotation_euler=(target-camera.location).to_track_quat('-Z','Y').to_euler();camera_data.type='ORTHO';camera_data.ortho_scale=max(w*1.6,h*1.95,d*1.6)
 bpy.context.scene.camera=camera
 world=bpy.context.scene.world or bpy.data.worlds.new('確認の空');bpy.context.scene.world=world;world.use_nodes=True
 world.node_tree.nodes['Background'].inputs['Color'].default_value=(.62,.72,.82,1)
 world.node_tree.nodes['Background'].inputs['Strength'].default_value=.7
 light_data=bpy.data.lights.new('確認用の斜光','AREA');light=bpy.data.objects.new('確認用の斜光',light_data);bpy.context.collection.objects.link(light)
 light.location=(-w*.6,-d*.8,h*1.8);light_data.energy=1600;light_data.shape='DISK';light_data.size=max(w,d)
 bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.samples=20
 bpy.context.scene.render.threads_mode='FIXED';bpy.context.scene.render.threads=4
 bpy.context.scene.view_settings.view_transform='Standard'
 bpy.context.scene.view_settings.look='Medium High Contrast'
 bpy.context.scene.render.resolution_x=800;bpy.context.scene.render.resolution_y=600;bpy.context.scene.render.resolution_percentage=100
 bpy.context.scene.render.image_settings.file_format='PNG';bpy.context.scene.render.filepath=str(SOURCE/f'{key}.png')
 bpy.ops.render.render(write_still=True)
 bpy.data.objects.remove(camera,do_unlink=True);bpy.data.objects.remove(light,do_unlink=True)

RENDER_ONLY=os.environ.get('ICHI_CONCEPT_RENDER_ONLY')=='1'
HARBOR_IDS=['canalHouseA','canalHouseB','canalHouseC','harborClock','harborBakery','harborGlasshouse']
print('造形済み:',list(ASSETS),flush=True)
if RENDER_ONLY:
 targets=[s.strip() for s in os.environ.get('ICHI_CONCEPT_TARGETS','').split(',') if s.strip()]
 if not targets or any(key not in ASSETS for key in targets):raise ValueError('試写するモデルIDを指定する')
 REPORT=json.loads((SOURCE/'geometry-report.json').read_text(encoding='utf-8'))['assets']
 REPORT['harborClock']['size']=[10.4,24.1,10.4]
 for key in targets:render_asset(key)
 print(json.dumps({'試写したモデル':targets},ensure_ascii=False),flush=True)
 sys.exit(0)
REPORT={};payload={'version':1,'materials':{},'assets':{}}
PREVIEW=os.environ.get('ICHI_CONCEPT_PREVIEW')=='1'
TARGETS=[s.strip() for s in os.environ.get('ICHI_CONCEPT_TARGETS','').split(',') if s.strip()]
if UPDATE_ONLY or TARGETS:
 payload=json.loads(OUTPUT.read_text(encoding='utf-8'),parse_constant=lambda x: (_ for _ in ()).throw(ValueError(x)))
 if UPDATE_ONLY and (len(payload['assets'])!=13 or not all(key in payload['assets'] for key in HARBOR_IDS)):
  raise ValueError('既存の13モデルを確認できないため差し替えを中止')
 REPORT=json.loads((SOURCE/'geometry-report.json').read_text(encoding='utf-8'))['assets']
for key,(color,kind,rough,metal) in PALETTE.items():
 rgb=[int(color[i:i+2],16)/255 for i in (1,3,5)]
 payload['materials'][key]={'color':rgb,'roughness':rough,'metalness':metal,'type':kind}
payload['materials']['glass']['opacity']=.46
selected=HARBOR_IDS if UPDATE_ONLY else (TARGETS if TARGETS else (list(ASSETS)[:2] if PREVIEW else list(ASSETS)))
if any(key not in ASSETS for key in selected):raise ValueError('存在しないモデルID')
for key in selected:
 objects=ASSETS[key]
 CURRENT=key
 meshes=evaluated_triangles(objects)
 coords=[v for m in meshes for v in m['positions']]
 xs=coords[0::3];ys=coords[1::3];zs=coords[2::3]
 size=[round(max(xs)-min(xs),3),round(max(ys)-min(ys),3),round(max(zs)-min(zs),3)]
 pivots={m['name']:{'position':[0,6.05,0],'axis':[0,0,1]} for m in meshes} if key=='greatWaterwheel' else None
 data={'meshes':meshes,'size':size}
 if pivots:data['pivots']=pivots
 payload['assets'][key]=data
 REPORT[key]={'size':size,'triangles':sum(len(m['indices'])//3 for m in meshes),'meshGroups':len(meshes)}
 if key=='forestArch':REPORT[key]['opening']={'width':7,'height':8,'depth':8,'collision':'中央には設定しない'}
 if pivots:REPORT[key]['pivots']=pivots
 if key=='greatWaterwheel':REPORT[key]['orientation']='正面はThree.jsの+Z。回転軸は+Z。Blenderの輪中心(0,0,6.05)をThree.jsの(0,6.05,0)へ変換。'
temp_output=OUTPUT.with_suffix('.json.tmp')
temp_output.write_text(json.dumps(payload,separators=(',',':'),allow_nan=False),encoding='utf-8')
os.replace(temp_output,OUTPUT)
temp_report=SOURCE/'geometry-report.json.tmp'
temp_report.write_text(json.dumps({'assets':REPORT,'blender':bpy.app.version_string},ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
os.replace(temp_report,SOURCE/'geometry-report.json')
for o in bpy.context.scene.objects:
 if o.type=='MESH':o.hide_render=False
bpy.context.preferences.filepaths.save_version=0
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/('harbor-six.blend' if UPDATE_ONLY else 'concept-models-a.blend')))
for key in selected:
 render_asset(key)
print(json.dumps({'完成したモデル':list(ASSETS),'三角形':{k:v['triangles'] for k,v in REPORT.items()}},ensure_ascii=False),flush=True)
