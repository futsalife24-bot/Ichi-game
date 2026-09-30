"""Suggest silence boundaries using offline ASR; output is reviewed before import."""
import sys,json,re,difflib,wave,array
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'.tools'))
import pykakasi
kks=pykakasi.kakasi()
nums=['ぜろ','いち','に','さん','よん','ご','ろく','なな','はち','きゅう']
def number(n):
    if n<10:return nums[n]
    if n<100:return ('' if n<20 else nums[n//10])+'じゅう'+(nums[n%10] if n%10 else '')
    return str(n)
def kana(s):
    s=re.sub(r'\d+',lambda m:number(int(m[0])),s)
    s=''.join(x['hira'] for x in kks.convert(s)).lower()
    for a,b in [('いちこ','いっこ'),('ろくこ','ろっこ'),('はちこ','はっこ'),('じゅうこ','じゅっこ'),('は','わ'),('を','お'),('ー',''),('ぇ','え'),('ぃ','い')]:s=s.replace(a,b)
    return re.sub(r'[^ぁ-ゖa-z]','',s)
src=ROOT/'assets-src/gemini-tts'
plan=json.loads((src/'plan.json').read_text(encoding='utf8'))
report=[]
for bi,clips in enumerate(plan['batches']):
    stem='praise-source' if bi==0 else f'batch-{bi:02d}-source'
    af=src/(stem+'.asr.json')
    if not af.exists():continue
    words=[w for s in json.loads(af.read_text(encoding='utf8')) for w in s['words']]
    observed='';times=[]
    for w in words:
        t=kana(w['text']);observed+=t
        times.extend([w['start']+(w['end']-w['start'])*(i+.5)/len(t) for i in range(len(t))])
    expected=''.join(kana(c['reading']) for c in clips)
    match=difflib.SequenceMatcher(None,expected,observed,autojunk=False)
    mapping={}
    for block in match.get_matching_blocks():
        for i in range(block.size):mapping[block.a+i]=block.b+i
    with wave.open(str(src/(stem+'.wav')),'rb') as f:
        rate=f.getframerate();data=array.array('h',f.readframes(f.getnframes()))
    frame=rate//100;energy=[]
    for i in range(0,len(data),frame):
        a=data[i:i+frame];energy.append((sum(x*x for x in a)/len(a))**.5)
    gaps=[];start=None
    for i,v in enumerate(energy+[100000]):
        if v<180:
            if start is None:start=i
        elif start is not None:
            if i-start>=8:gaps.append((start/100,i/100))
            start=None
    pos=0;rows=[]
    for ci,c in enumerate(clips):
        text=kana(c['reading']);a=pos;pos+=len(text)
        matched=[mapping[i] for i in range(a,pos) if i in mapping]
        coverage=len(matched)/max(1,len(text))
        row={'index':ci,'text':c['text'],'coverage':round(coverage,3)}
        if matched:
            row.update(start=round(times[min(matched)],2),end=round(times[max(matched)],2),recognized=observed[min(matched):max(matched)+1])
        if ci<len(clips)-1:
            left=next((mapping[i] for i in range(pos-1,max(-1,pos-9),-1) if i in mapping),None)
            right=next((mapping[i] for i in range(pos,min(len(expected),pos+8)) if i in mapping),None)
            if left is not None and right is not None and right>left:
                lo,hi=times[left],times[right]
                candidates=[g for g in gaps if g[0]>=lo-.15 and g[1]<=hi+.15]
                if candidates:
                    g=max(candidates,key=lambda x:x[1]-x[0]);row.update(boundary=round(sum(g)/2,3),silence=round(g[1]-g[0],3))
        rows.append(row)
    report.append({'batchId':bi,'ratio':round(match.ratio(),3),'phrases':rows})
(src/'alignment.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf8')
for r in report:
    print(json.dumps({'batchId':r['batchId'],'ratio':r['ratio'],'boundaries':sum('boundary' in x for x in r['phrases']),'weak':[x for x in r['phrases'] if x['coverage']<.7 or ('boundary' not in x and x['index']<len(r['phrases'])-1)]},ensure_ascii=False))
