// しゅじんこうと カメラの あいだだけ、たてものや こずえに のぞきまどを あける。
import * as THREE from 'three';

export function createHarborSight() {
  return { hero: { value: new THREE.Vector3(0,-1000,0) }, eye: { value: new THREE.Vector3() }, time: { value: 0 } };
}
export function harborSightMaterial(sight, { sway = false, ...options } = {}) {
  const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .83, ...options });
  material.customProgramCacheKey = () => `harbor-sight-v1-${sway}`;
  material.onBeforeCompile = shader => {
    Object.assign(shader.uniforms, { harborHero: sight.hero, harborEye: sight.eye, harborTime: sight.time });
    shader.vertexShader = 'uniform float harborTime;\nvarying vec3 harborWorld;\n' + shader.vertexShader;
    if (sway) shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\n transformed.x += sin(harborTime*.8+position.y*1.5+position.x)*smoothstep(1.8,5.0,position.y)*.055;');
    shader.vertexShader = shader.vertexShader.replace('#include <worldpos_vertex>', `#include <worldpos_vertex>
      vec4 harborPosition=vec4(transformed,1.0);
      #ifdef USE_INSTANCING
        harborPosition=instanceMatrix*harborPosition;
      #endif
      harborWorld=(modelMatrix*harborPosition).xyz;`);
    shader.fragmentShader = 'uniform vec3 harborHero;\nuniform vec3 harborEye;\nvarying vec3 harborWorld;\n' + shader.fragmentShader;
    shader.fragmentShader = shader.fragmentShader.replace('#include <clipping_planes_fragment>', `#include <clipping_planes_fragment>
      vec3 harborRay=harborHero-harborEye;
      float harborAlong=dot(harborWorld-harborEye,harborRay)/max(.01,dot(harborRay,harborRay));
      float harborGap=length(harborWorld-(harborEye+harborRay*harborAlong));
      if(harborAlong>.03 && harborAlong<.985 && harborWorld.y>harborHero.y-1.25){
        float harborCover=smoothstep(.76,1.38,harborGap);
        float harborDot=fract(sin(dot(floor(gl_FragCoord.xy),vec2(12.9898,78.233)))*43758.5453);
        if(harborDot>harborCover) discard;
      }`);
  };
  return material;
}

// えがく ときと おなじ、しゅじんこうを かくす いちの はんてい。
export function isBetweenHeroAndCamera(point,hero,eye,radius=1.38) {
  const ray=new THREE.Vector3().subVectors(hero,eye),along=new THREE.Vector3().subVectors(point,eye).dot(ray)/Math.max(.01,ray.lengthSq());
  return along>.03&&along<.985&&point.y>hero.y-1.25&&point.distanceTo(ray.multiplyScalar(along).add(eye))<radius;
}
