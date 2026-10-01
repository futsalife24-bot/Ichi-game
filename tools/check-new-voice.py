"""ローカルの認識モデルで追加音声を照合し、原本のハッシュと認識結果を保存する。"""
import argparse
import hashlib
import json
import sys
from pathlib import Path

parser = argparse.ArgumentParser()
parser.add_argument('--tools', required=True)
parser.add_argument('--model', required=True)
parser.add_argument('--batches', nargs='+', type=int, required=True)
parser.add_argument('--clips', action='store_true')
args = parser.parse_args()
sys.path.insert(0, args.tools)
from faster_whisper import WhisperModel

root = Path(__file__).resolve().parent.parent
source = root / 'assets-src/gemini-tts'
plan = json.loads((source / 'plan.json').read_text(encoding='utf-8'))
model = WhisperModel(args.model, device='cpu', compute_type='int8', cpu_threads=6)
if args.clips:
    output = source / 'character-clips.asr.json'
    results = {item['hash']: item for item in json.loads(output.read_text(encoding='utf-8'))} if output.exists() else {}
    for batch in args.batches:
        for clip in plan['batches'][batch]:
            path = root / 'voice/gemini' / (clip['hash'] + '.mp3')
            segments, _ = model.transcribe(str(path), language='ja', beam_size=5, condition_on_previous_text=False)
            result = {'batchId': batch, 'hash': clip['hash'], 'expected': clip['reading'],
                      'sha256': hashlib.sha256(path.read_bytes()).hexdigest(), 'recognized': ''.join(s.text for s in segments)}
            results[clip['hash']] = result
            print(json.dumps(result, ensure_ascii=False), flush=True)
    output.write_text(json.dumps(list(results.values()), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    sys.exit(0)
for batch in args.batches:
    path = source / f'batch-{batch:02d}-source.wav'
    segments, info = model.transcribe(str(path), language='ja', beam_size=5,
                                      word_timestamps=True, condition_on_previous_text=False)
    recognized = [{'start': s.start, 'end': s.end, 'text': s.text,
                   'words': [{'start': w.start, 'end': w.end, 'text': w.word} for w in (s.words or [])]}
                  for s in segments]
    report = {'batchId': batch, 'sourceSha256': hashlib.sha256(path.read_bytes()).hexdigest(),
              'model': 'faster-whisper-small', 'language': info.language,
              'expected': [c['reading'] for c in plan['batches'][batch]], 'segments': recognized}
    path.with_suffix('.asr.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'batchId': batch, 'recognized': [s['text'] for s in recognized]}, ensure_ascii=False), flush=True)
