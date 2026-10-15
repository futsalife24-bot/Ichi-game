"""しゅっかずみの こえを ローカルで はかる。"""

import json
import math
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.tools'))

import av  # noqa: E402
import numpy as np  # noqa: E402


def db(value):
    return round(20 * math.log10(max(float(value), 1e-9)), 1)


def measure(path):
    chunks = []
    with av.open(str(path)) as container:
        for frame in container.decode(audio=0):
            data = frame.to_ndarray()
            if np.issubdtype(data.dtype, np.integer):
                data = data.astype(np.float32) / np.iinfo(data.dtype).max
            else:
                data = data.astype(np.float32)
            chunks.append(data.reshape(-1))
        rate = container.streams.audio[0].rate
    if not chunks:
        raise ValueError('おんせいが ありません')
    samples = np.concatenate(chunks)
    absolute = np.abs(samples)
    # 20msごとの音量。無音とMP3の余白を集計から外す。
    width = max(1, round(rate * .02))
    padded = np.pad(samples, (0, -len(samples) % width))
    frames = padded.reshape(-1, width)
    levels = np.sqrt(np.mean(frames * frames, axis=1))
    active = levels[levels >= .01]
    active_rms = float(np.sqrt(np.mean(active * active))) if len(active) else 0
    edge_width = max(1, round(rate * .04))
    head = float(np.sqrt(np.mean(samples[:edge_width] ** 2)))
    tail = float(np.sqrt(np.mean(samples[-edge_width:] ** 2)))
    return {
        'duration': round(len(samples) / rate, 2),
        'peakDb': db(np.max(absolute)),
        'activeRmsDb': db(active_rms),
        'head40msDb': db(head),
        'tail40msDb': db(tail),
        'nearClipSamples': int(np.count_nonzero(absolute >= .98)),
    }


def main():
    index = json.loads((ROOT / 'voice/index.json').read_text(encoding='utf-8'))['clips']
    measured = []
    for hash_id, clip in index.items():
        file = ROOT / 'voice' / clip['file']
        row = {'hash': hash_id, 'file': clip['file'], 'text': clip['text']}
        row.update(measure(file))
        measured.append(row)
    med = float(np.median([row['activeRmsDb'] for row in measured]))
    reviews = []
    for row in measured:
        reasons = []
        if abs(row['activeRmsDb'] - med) >= 4.5:
            reasons.append('音量差')
        if row['nearClipSamples'] >= 24:
            reasons.append('高いピーク')
        if row['head40msDb'] >= max(-28, row['activeRmsDb'] - 12):
            reasons.append('語頭の余白')
        if row['tail40msDb'] >= max(-28, row['activeRmsDb'] - 12):
            reasons.append('語尾の余白')
        if reasons:
            reviews.append({**row, '理由': reasons})
    focus_hashes = {'80c5cdd9', 'afab5722', '82b8edb7'}
    focus = [row for row in measured if row['hash'] in focus_hashes or row['text'].lower() == 'fish'
             or 'あそぼう！' in row['text']]
    result = {
        '説明': '出荷MP3原本を復号した補正前の機械計測。再生時の音量補正は反映しない。発音・意味・聴感の合否は判定しない。',
        '対象': len(measured),
        '基準': {'activeRms中央値Db': round(med, 1), '音量差Db': 4.5,
               '高いピーク試料数': 24, '端の判定Db': 'max(-28, activeRms-12)'},
        '集計': {'activeRmsDb範囲': [min(row['activeRmsDb'] for row in measured), max(row['activeRmsDb'] for row in measured)],
               'peakDb最大': max(row['peakDb'] for row in measured),
               '要確認': len(reviews),
               '理由別': {name: sum(name in row['理由'] for row in reviews)
                        for name in ['音量差', '高いピーク', '語頭の余白', '語尾の余白']}},
        '要確認音声': [dict(row, 理由=(['発音の聴感確認'] if row['hash'] in focus_hashes or row['text'].lower() == 'fish' else ['案内音声の試聴']))
                  for row in focus if row['hash'] not in {review['hash'] for review in reviews}] + reviews,
    }
    target = ROOT / 'docs/voice-quality-check.json'
    target.write_text(json.dumps(result, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'対象': result['対象'], '集計': result['集計'], '注目音声': len(focus)}, ensure_ascii=False))


if __name__ == '__main__':
    main()
