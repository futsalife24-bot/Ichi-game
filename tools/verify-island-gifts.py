"""八島の小さな部品の形状・原本・個別ファイルを照合する。"""
import json, math, os, struct

ROOT=os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SOURCE=os.path.join(ROOT,'assets-src','islands','bonus')
GAME=os.path.join(ROOT,'assets','islands','bonus')
with open(os.path.join(SOURCE,'bonus-parts.json'),encoding='utf-8') as f:catalog=json.load(f)
with open(os.path.join(GAME,'bonus-parts.json'),encoding='utf-8') as f:pack=json.load(f)
parts=catalog['parts'];assets=pack['assets'];ids=[p['id'] for p in parts]
with open(os.path.join(SOURCE,'index.html'),encoding='utf-8') as f:gallery=f.read()
assert os.path.getsize(os.path.join(SOURCE,'overview.jpg'))>10000
assert len(parts)==24 and len(ids)==len(set(ids)) and set(ids)==set(assets)
assert {p['island'] for p in parts}==set(range(1,9))
assert all(sum(p['island']==n for p in parts)==3 for n in range(1,9))
for part in parts:
    id=part['id'];meshes=assets[id]['meshes']
    assert meshes and len(meshes)==part['objects']
    assert 0<part['triangles']<10000
    count=0;names=[];vertices=[]
    for mesh in meshes:
        names.append(mesh['name']);p=mesh['positions'];index=mesh['indices']
        assert len(p)%3==0 and len(index)%3==0 and p and index
        assert all(math.isfinite(v) for v in p)
        assert all(0<=i<len(p)//3 for i in index)
        assert mesh['material'] in pack['materials']
        vertices.extend([p[i:i+3] for i in range(0,len(p),3)]);count+=len(index)//3
    assert count==part['triangles']
    assert len(set(names))>=2,id+' の部品が分離されていない'
    low=[min(v[i] for v in vertices) for i in range(3)]
    high=[max(v[i] for v in vertices) for i in range(3)]
    assert all(abs(low[i]-part['bounds_m']['min'][i])<.001 for i in range(3))
    assert all(abs(high[i]-part['bounds_m']['max'][i])<.001 for i in range(3))
    sizes=[high[i]-low[i] for i in range(3)]
    assert all(.03<size<3 for size in sizes) and max(sizes)>.3
    for ext,folder in [('.blend',SOURCE),('.png',SOURCE),('.glb',GAME)]:
        path=os.path.join(folder,id+ext)
        assert os.path.getsize(path)>1000,path
    with open(os.path.join(SOURCE,id+'.png'),'rb') as f:header=f.read(24)
    assert header[:8]==b'\x89PNG\r\n\x1a\n' and struct.unpack('>II',header[16:24])==(560,520)
    assert f'href="{id}.png"' in gallery and f'alt="{part["name"]}"' in gallery
    with open(os.path.join(GAME,id+'.glb'),'rb') as f:header=f.read(12)
    magic,version,length=struct.unpack('<4sII',header)
    assert magic==b'glTF' and version==2 and length==os.path.getsize(os.path.join(GAME,id+'.glb'))
print('24点：島別３点、原本・描画・個別glb・軽量形状・寸法・有限値・材質・部品分離を確認')
