"""Offline ASR evidence for generated batches; never edits the generated audio."""
import os, sys, json, time
from pathlib import Path
ROOT=Path(__file__).resolve().parent.parent
sys.path.insert(0,str(ROOT/'.tools'))
from faster_whisper import WhisperModel
model=WhisperModel('small',device='cpu',compute_type='int8',download_root=str(ROOT/'.models'),cpu_threads=6)
source=ROOT/'assets-src/gemini-tts'
while True:
    for path in sorted(source.glob('*-source.wav')):
        target=path.with_suffix('.asr.json')
        if target.exists() and target.stat().st_mtime>=path.stat().st_mtime: continue
        segments, info=model.transcribe(str(path),language='ja',beam_size=5,word_timestamps=True,condition_on_previous_text=False)
        result=[]
        for s in segments:
            result.append({'start':s.start,'end':s.end,'text':s.text,'words':[{'start':w.start,'end':w.end,'text':w.word,'probability':w.probability} for w in (s.words or [])]})
        target.write_text(json.dumps(result,ensure_ascii=False,indent=2),encoding='utf-8')
        print(path.name, 'transcribed', flush=True)
    if '--watch' not in sys.argv or (source/'asr-stop').exists(): break
    time.sleep(10)
