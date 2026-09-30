import { readFileSync } from 'node:fs';
const b = readFileSync(process.argv[2]);
let data, rate, channels, bits;
for (let p = 12; p + 8 <= b.length;) {
  const size = b.readUInt32LE(p + 4), id = b.toString('ascii', p, p + 4);
  if (id === 'fmt ') { channels = b.readUInt16LE(p + 10); rate = b.readUInt32LE(p + 12); bits = b.readUInt16LE(p + 22); }
  if (id === 'data') data = b.subarray(p + 8, p + 8 + size);
  p += 8 + size + size % 2;
}
if (channels !== 1 || bits !== 16 || !data) throw Error('Expected mono PCM16');
const step = Math.round(rate * 0.01), energies = [];
let peak = 0;
for (let i = 0; i < data.length / 2; i += step) {
  let sum = 0, n = 0;
  for (let j = i; j < Math.min(i + step, data.length / 2); j++) { const x = data.readInt16LE(j * 2); sum += x*x; peak = Math.max(peak, Math.abs(x)); n++; }
  energies.push(Math.sqrt(sum / n));
}
const gaps = []; let start = null;
for (let i = 0; i <= energies.length; i++) {
  if (i < energies.length && energies[i] < 180) { start ??= i; }
  else if (start !== null) { if (i - start >= 20) gaps.push([start / 100, i / 100]); start = null; }
}
console.log(JSON.stringify({rate,channels,bits,duration:data.length/2/rate,peak,gaps}));
