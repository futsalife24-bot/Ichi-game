// しろい ゆかでも、じぶんの からだの まるみを みわけられるようにする。
const edgeShade = `
float avatarEdge = pow(1.0 - abs(dot(normalize(normal), normalize(vViewPosition))), 2.2);
gl_FragColor.rgb *= mix(vec3(1.0), vec3(.44, .60, .75), avatarEdge * .65);
`;

export function prepareAvatarVisibility(root) {
  const copies = new Map();
  const copy = original => {
    if (!original?.isMeshToonMaterial) return original;
    if (!copies.has(original)) {
      const material = original.clone();
      material.userData.avatarVisibility = true;
      material.onBeforeCompile = shader => {
        shader.fragmentShader = shader.fragmentShader.replace(
          '#include <premultiplied_alpha_fragment>',
          edgeShade + '\n#include <premultiplied_alpha_fragment>',
        );
      };
      material.customProgramCacheKey = () => 'avatar-soft-edge-v1';
      copies.set(original, material);
    }
    return copies.get(original);
  };
  root.traverse(object => {
    if (object.isMesh) object.material = Array.isArray(object.material)
      ? object.material.map(copy) : copy(object.material);
  });
}

export function releaseAvatarVisibility(root) {
  const materials = new Set();
  root.traverse(object => {
    if (!object.isMesh) return;
    for (const material of Array.isArray(object.material) ? object.material : [object.material])
      if (material?.userData.avatarVisibility) materials.add(material);
  });
  for (const material of materials) material.dispose();
}
