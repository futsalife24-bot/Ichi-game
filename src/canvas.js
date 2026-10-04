// キャンバスに もじ・え を かいて テクスチャに する
import * as THREE from 'three';

export const FONT = '"Hiragino Maru Gothic ProN", "Hiragino Sans", "BIZ UDPGothic", "Noto Sans JP", "Noto Sans CJK JP", "Yu Gothic", sans-serif';
export const EMOJI_FONT = '"Apple Color Emoji", "Segoe UI Emoji", "Noto Color Emoji", sans-serif';

export function canvasTexture(w, h, draw) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  const redraw = (...args) => {
    const x = c.getContext('2d');
    x.clearRect(0, 0, w, h);
    draw(x, w, h, ...args);
    tex.needsUpdate = true;
  };
  redraw();
  tex.userData.redraw = (fn) => { draw = fn; redraw(); };
  return tex;
}

export function roundRect(x, px, py, w, h, r) {
  x.beginPath();
  if (x.roundRect) x.roundRect(px, py, w, h, r);
  else x.rect(px, py, w, h);
}

/** かんばん（まるい しかくに もじ） */
export function signTexture(text, { bg = '#fff6dc', fg = '#6b3a2a', border = '#c98a55', w = 512, h = 160 } = {}) {
  return canvasTexture(w, h, (x) => {
    x.fillStyle = border;
    roundRect(x, 0, 0, w, h, h * 0.3);
    x.fill();
    x.fillStyle = bg;
    roundRect(x, h * 0.08, h * 0.08, w - h * 0.16, h * 0.84, h * 0.24);
    x.fill();
    x.fillStyle = fg;
    x.font = `bold ${Math.floor(h * 0.52)}px ${FONT}`;
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText(text, w / 2, h * 0.54, w - h * 0.28);
  });
}
