// node で src/*.js を よみこむ ための しかけ（'three' を vendor の ファイルに むすぶ）
export async function resolve(specifier, context, next) {
  if (specifier === 'three') {
    return { url: new URL('../vendor/three.module.js', import.meta.url).href, shortCircuit: true };
  }
  return next(specifier, context);
}
