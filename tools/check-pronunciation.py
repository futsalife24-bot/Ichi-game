"""Isolated-clip ASR pass, separate from long-batch recognition."""
import sys,json,hashlib
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'.tools'))
from faster_whisper import WhisperModel
source=ROOT/'assets-src/gemini-tts'
plan=json.loads((source/'plan.json').read_text(encoding='utf8'))
model=WhisperModel('small',device='cpu',compute_type='int8',download_root=str(ROOT/'.models'),cpu_threads=4)
result=[]
target='pronunciation-final.json' if '--final' in sys.argv else 'pronunciation-check.json'
wanted=next((x.split('=',1)[1] for x in sys.argv if x.startswith('--hash=')),None)
if wanted and (source/target).exists():
    result=[r for r in json.loads((source/target).read_text(encoding='utf8')) if r['hash']!=wanted]
initial=[(0,3),(1,0),(3,13),(4,27),(4,29),(4,31),(13,0)]
final=[(6,i) for i in [10,11,12,13,14,15,16,27]]+[(16,i) for i in range(9,16)]+[(18,i) for i in range(len(plan['batches'][18]))]
for bi,ci in (final if '--final' in sys.argv else initial):
    clip=plan['batches'][bi][ci]
    if wanted and clip['hash']!=wanted: continue
    audio=ROOT/'voice/gemini'/(clip['hash']+'.mp3')
    if not audio.exists():
        result.append({'hash':clip['hash'],'expected':clip['reading'],'status':'not-yet-imported'})
        continue
    segments,_=model.transcribe(str(audio),language='ja',beam_size=5,condition_on_previous_text=False)
    result.append({'hash':clip['hash'],'sha256':hashlib.sha256(audio.read_bytes()).hexdigest(),'expected':clip['reading'],'recognized':''.join(x.text for x in segments)})
    (source/target).write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf8')
    print(clip['hash'],'checked',flush=True)
