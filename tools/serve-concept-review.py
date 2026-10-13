"""島の実ブラウザー描画を、固定した確認用の画像へ保存するローカルサーバー。"""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
import re
import argparse

parser = argparse.ArgumentParser()
parser.add_argument('--port', type=int, default=5231)
PORT = parser.parse_args().port
if not 1024 <= PORT <= 65535:
    parser.error('確認用のポート番号は1024〜65535で指定してください')

ROOT = Path(__file__).resolve().parent.parent
DESTINATION = (ROOT / 'artifacts' / 'concept-scenes').resolve()
DESTINATION.relative_to(ROOT)
DESTINATION.mkdir(parents=True, exist_ok=True)

class ReviewHandler(SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=str(ROOT), **kwargs)

    def do_POST(self):
        match = re.fullmatch(r'/__concept-review__/([1-8])/(entry|hero|side)', self.path)
        if not match or self.headers.get('X-Concept-Review') != '1':
            self.send_error(400); return
        if self.headers.get('Origin') not in (f'http://127.0.0.1:{PORT}', f'http://localhost:{PORT}'):
            self.send_error(403); return
        size = int(self.headers.get('Content-Length', '0'))
        if not 8 <= size <= 4_000_000 or self.headers.get('Content-Type') != 'image/png':
            self.send_error(400); return
        data = self.rfile.read(size)
        if not data.startswith(b'\x89PNG\r\n\x1a\n'):
            self.send_error(400); return
        target = DESTINATION / f'{int(match[1]):02d}-{match[2]}.png'
        target.write_bytes(data)
        self.send_response(201); self.end_headers(); self.wfile.write(b'OK')

if __name__ == '__main__':
    print(f'島の確認サーバーを127.0.0.1:{PORT}で起動しました', flush=True)
    ThreadingHTTPServer(('127.0.0.1', PORT), ReviewHandler).serve_forever()
