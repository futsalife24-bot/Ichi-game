// もりの みず。ひかりと きのかげを のこして、かわ・なみ・たきを ながす。
import * as THREE from 'three';
import { riverZ, riverY, riverSurfaceWidth, riverSurfaceY, coastRadius, SPRING, springWaterY, smooth } from './forest-layout.js';

const SEA_Y = -.65;
const FALL_X = -32;
const FALL_Z = -7;

// ひょうめんの ながれだけ GPU で うごかす。かげ・きりは Three.js に まかせる。
function waterMaterial(clock, kind) {
  const material = new THREE.MeshStandardMaterial({
    color: 0xffffff, roughness: kind === 'fall' ? .3 : .24, metalness: .08,
    transparent: true, opacity: 1, depthWrite: false,
    side: kind === 'fall' ? THREE.DoubleSide : THREE.FrontSide,
    forceSinglePass: true,
  });
  material.name = `forest-water-${kind}`;
  material.customProgramCacheKey = () => `forest-water-v1-${kind}`;
  material.onBeforeCompile = shader => {
    shader.uniforms.uWaterTime = clock;
    shader.uniforms.uDeepColor = { value: new THREE.Color(kind === 'sea' ? 0x288da8 : 0x238d94) };
    shader.uniforms.uShallowColor = { value: new THREE.Color(kind === 'sea' ? 0x71cbd2 : 0x7bd4c2) };
    shader.uniforms.uFoamColor = { value: new THREE.Color(0xe5fff6) };
    const declarations = `
      uniform float uWaterTime;
      varying vec2 vWaterUv;
      varying vec3 vWaterPosition;
      ${kind === 'sea' ? 'varying float vWaterShore;' : ''}
    `;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', `#include <common>\n${declarations}\n${kind === 'sea' ? 'attribute float waterShore;' : ''}`);
    const waves = kind === 'fall' ? `
      transformed.z += .035 * sin(position.y * 7.0 - uWaterTime * 5.0) * (1.0 - abs(uv.x));
      transformed.x += .025 * sin(uv.y * 16.0 - uWaterTime * 2.5 + uv.x * 4.0) * smoothstep(0.0, .2, uv.y);
    ` : `
      transformed.y += .024 * sin(position.x * .83 - uWaterTime * 1.6)
        + .018 * sin(position.z * 1.45 + position.x * .32 - uWaterTime * 1.1);
    `;
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', `
      #include <begin_vertex>
      ${waves}
      vWaterUv = uv;
      vWaterPosition = position;
      ${kind === 'sea' ? 'vWaterShore = waterShore;' : ''}
    `);
    if (kind !== 'fall') shader.vertexShader = shader.vertexShader.replace('#include <beginnormal_vertex>', `
      #include <beginnormal_vertex>
      objectNormal = normalize(vec3(
        -.01992 * cos(position.x * .83 - uWaterTime * 1.6)
        -.00576 * cos(position.z * 1.45 + position.x * .32 - uWaterTime * 1.1),
        1.0, -.0261 * cos(position.z * 1.45 + position.x * .32 - uWaterTime * 1.1)));
    `);
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', `
      #include <common>
      ${declarations}
      uniform vec3 uDeepColor;
      uniform vec3 uShallowColor;
      uniform vec3 uFoamColor;
    `);
    let surface;
    if (kind === 'sea') surface = `
      float a = atan(vWaterPosition.z, vWaterPosition.x);
      float shore = vWaterShore;
      float depth = smoothstep(-.5, 15.0, shore);
      float moving = vWaterPosition.x * .35 + vWaterPosition.z * .23 - uWaterTime * .75;
      float sky = .5 + .5 * sin(moving + sin(vWaterPosition.z * .25) * 1.6);
      float crest = pow(max(0.0, sin(moving * 2.0)), 18.0) * .18;
      float beachWave = .4 + .5 * sin(a * 17.0 + uWaterTime * .6);
      float foam = (1.0 - smoothstep(.08, .55, abs(shore - beachWave)))
        * (.35 + .3 * sin(a * 39.0 - uWaterTime * 1.5));
      diffuseColor.rgb = mix(uShallowColor, uDeepColor, depth * .85);
      diffuseColor.rgb += vec3(.035, .06, .065) * sky;
      diffuseColor.rgb = mix(diffuseColor.rgb, uFoamColor, clamp(foam + crest, 0.0, .8));
      diffuseColor.a = .9;
    `;
    else if (kind === 'fall') surface = `
      float across = abs(vWaterUv.x);
      float ribbon = .5 + .5 * sin(vWaterUv.x * 48.0 + sin(vWaterUv.x * 13.0 + vWaterUv.y * 9.0 - uWaterTime * 3.5) * 2.0);
      float drop = .5 + .5 * sin(vWaterUv.y * 45.0 - uWaterTime * 10.0 + vWaterUv.x * 5.0);
      float fringe = .91 + .045 * sin(vWaterUv.y * 21.0 - uWaterTime * 1.8)
        + .025 * sin(vWaterUv.y * 47.0 + vWaterUv.x * 8.0 - uWaterTime * 3.0);
      float edge = 1.0 - smoothstep(fringe - .1, fringe, across);
      float core = 1.0 - smoothstep(.55, .85, across);
      float threads = mix(.13, 1.0, smoothstep(.32, .78, ribbon));
      float foam = .46 + .22 * ribbon + .15 * pow(drop, 4.0);
      diffuseColor.rgb = mix(uShallowColor, uFoamColor, foam);
      diffuseColor.a = (.72 + .14 * ribbon) * edge * mix(threads, 1.0, core * .88);
    `;
    else surface = `
      float across = abs(vWaterUv.y);
      float depth = 1.0 - pow(clamp(across, 0.0, 1.0), 1.5);
      float flow = vWaterUv.x - uWaterTime * 1.55;
      float eddy = sin(flow * .6 + vWaterUv.y * 5.0);
      float sky = .5 + .5 * sin(flow * .42 + vWaterUv.y * 3.5 + eddy * .6);
      float streak = pow(max(0.0, sin(flow * 2.8 + eddy * 1.3)), 12.0);
      float thread = pow(max(0.0, sin(vWaterUv.y * 19.0 + sin(flow * .45))), 10.0);
      float bank = smoothstep(.7, .95, across);
      float foam = bank * (.12 + streak * .65) + streak * thread * .22;
      diffuseColor.rgb = mix(uShallowColor, uDeepColor, depth * .82);
      diffuseColor.rgb += vec3(.045, .065, .075) * sky;
      diffuseColor.rgb = mix(diffuseColor.rgb, uFoamColor, clamp(foam, 0.0, .82));
      diffuseColor.a = mix(.68, .88, depth);
    `;
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `#include <color_fragment>\n${surface}`);
  };
  return material;
}

function stripGeometry(rows, columns, sample) {
  const positions = [], uvs = [], indices = [];
  for (let row = 0; row <= rows; row++) {
    for (let col = 0; col <= columns; col++) {
      const [x, y, z, u, v] = sample(row / rows, col / columns * 2 - 1);
      positions.push(x, y, z); uvs.push(u, v);
    }
  }
  for (let row = 0; row < rows; row++) for (let col = 0; col < columns; col++) {
    const a = row * (columns + 1) + col, b = a + columns + 1;
    indices.push(a, a + 1, b, a + 1, b + 1, b);
  }
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
  geometry.setIndex(indices); geometry.computeVertexNormals(); geometry.computeBoundingSphere();
  return geometry;
}

function rippleMaterial(clock) {
  const material = new THREE.MeshBasicMaterial({ color: 0xe8fff4, transparent: true, opacity: .62, depthWrite: false });
  material.customProgramCacheKey = () => 'forest-wake-v1';
  material.onBeforeCompile = shader => {
    shader.uniforms.uWaterTime = clock;
    shader.vertexShader = shader.vertexShader.replace('#include <common>', '#include <common>\nvarying vec2 vWakeUv;');
    shader.vertexShader = shader.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvWakeUv = uv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <common>', '#include <common>\nuniform float uWaterTime;\nvarying vec2 vWakeUv;');
    shader.fragmentShader = shader.fragmentShader.replace('#include <color_fragment>', `
      #include <color_fragment>
      vec2 p = (vWakeUv - .5) * 2.0;
      float radius = length(vec2(p.x * .65, p.y));
      float ring = 1.0 - smoothstep(.025, .09, abs(fract(radius * 3.4 - uWaterTime * .52) - .5));
      float tail = smoothstep(-.45, .05, p.x);
      diffuseColor.a *= ring * (1.0 - smoothstep(.35, 1.0, radius)) * tail;
    `);
  };
  return material;
}

export class ForestWater {
  constructor(group) {
    this.group = group;
    this.clock = { value: 0 };
    this.riverMaterial = waterMaterial(this.clock, 'river');
    const seaGeometry = new THREE.PlaneGeometry(270, 270, 64, 64);
    seaGeometry.rotateX(-Math.PI / 2);
    const seaPositions = seaGeometry.attributes.position, shoreDistance = [];
    for (let i = 0; i < seaPositions.count; i++) {
      const x = seaPositions.getX(i), z = seaPositions.getZ(i);
      shoreDistance.push(Math.hypot(x, z) - coastRadius(Math.atan2(z, x)));
    }
    seaGeometry.setAttribute('waterShore', new THREE.Float32BufferAttribute(shoreDistance, 1));
    this.sea = new THREE.Mesh(seaGeometry, waterMaterial(this.clock, 'sea'));
    this.sea.position.y = SEA_Y; this.sea.receiveShadow = true; this.sea.renderOrder = 1;
    group.add(this.sea);

    // かわぐちは うみまで つなぐ。まんなかの ひろさは ちけいと おなじ。
    this.river = new THREE.Mesh(stripGeometry(192, 10, (t, across) => {
      const x = -49 + t * 98;
      return [x, riverSurfaceY(x), riverZ(x) + across * riverSurfaceWidth(x), x, across];
    }), this.riverMaterial);
    this.river.receiveShadow = true; this.river.renderOrder = 2; group.add(this.river);

    const wakeGeometry = new THREE.PlaneGeometry(2, 2);
    wakeGeometry.rotateX(-Math.PI / 2);
    this.wakes = new THREE.InstancedMesh(wakeGeometry, rippleMaterial(this.clock), 64);
    this.wakes.count = 0; this.wakes.renderOrder = 3; this.wakes.frustumCulled = false;
    group.add(this.wakes);
    this.makeWaterfall();
  }

  // いわを おいた ばしょへ よぶと、したながれに ちいさな なみが できる。
  addRockWake(x, z, radius = .7) {
    if (this.wakes.count >= this.wakes.instanceMatrix.count) return;
    const object = new THREE.Object3D();
    object.position.set(x + radius * .7, riverY(x) + .07, z);
    object.rotation.y = -Math.atan(.304 * Math.cos(x * .095));
    object.scale.set(radius * 2.7, 1, radius * 1.25);
    object.updateMatrix(); this.wakes.setMatrixAt(this.wakes.count++, object.matrix);
    this.wakes.instanceMatrix.needsUpdate = true;
  }

  makeWaterfall() {
    this.waterfallGroup = new THREE.Group();
    this.waterfallGroup.name = 'もりの こたき';
    this.waterfallGroup.position.set(FALL_X, riverY(FALL_X), FALL_Z);
    this.group.add(this.waterfallGroup);
    const fallMaterial = waterMaterial(this.clock, 'fall');
    const lipHeight = across => .045 * Math.sin(across * 6 + .8) + .025 * Math.sin(across * 15);
    const fallWidth = t => (1.16 + .15 * t) * (1 + .045 * Math.sin(t * 13 + .8) + .02 * Math.sin(t * 31));
    // こやまの わきみずの いけから、たきの くちまで つながる。
    const springPoolGeo=new THREE.CircleGeometry(SPRING.radius,48);springPoolGeo.rotateX(-Math.PI/2);
    const springPool=new THREE.Mesh(springPoolGeo,this.riverMaterial);springPool.name='やまの わきみず';
    springPool.position.set(SPRING.x,SPRING.y,SPRING.z);springPool.scale.z=1/1.12;springPool.receiveShadow=true;springPool.renderOrder=2;this.group.add(springPool);
    const upstreamGeo=stripGeometry(60,12,(t,across)=>{
      const z=-15.7+(15.7+SPRING.lipZ)*t,width=.25+.65*smooth(-15.7,-14,z)+.26*smooth(-9,-8,z);
      return [SPRING.x+across*width,springWaterY(z),z,t*8,across];
    });
    const upstreamIndex=upstreamGeo.index.array;
    for(let i=0;i<upstreamIndex.length;i+=3)[upstreamIndex[i+1],upstreamIndex[i+2]]=[upstreamIndex[i+2],upstreamIndex[i+1]];
    upstreamGeo.computeVertexNormals();
    const upstream=new THREE.Mesh(upstreamGeo,this.riverMaterial);upstream.name='わきみずから たきへ';upstream.receiveShadow=true;upstream.renderOrder=2;this.group.add(upstream);
    const fall = new THREE.Mesh(stripGeometry(32, 16, (t, across) => {
      const y = 3.5 * (1 - t) + lipHeight(across) * (1 - t), z = -1.0 + 1.25 * Math.pow(t, .65);
      return [across * fallWidth(t) + .045 * Math.sin(t * 8.7), y, z, across, t];
    }), fallMaterial);
    fall.renderOrder = 3; this.waterfallGroup.add(fall);

    // たきつぼから ほんりゅうへ。いしの あいだを ほそく ながれる。
    const channel = new THREE.Mesh(stripGeometry(28, 6, (t, across) => {
      const z = FALL_Z + .4 + (riverZ(FALL_X) - FALL_Z - .4) * t;
      const x = FALL_X + .28 * Math.sin(t * Math.PI);
      return [x + across * (1.2 - .27 * t), riverY(x) + .015, z, t * 7, across];
    }), this.riverMaterial);
    // しりゅうは +z むきなので、うらおもてを そろえる。
    const ci = channel.geometry.index.array;
    for (let i = 0; i < ci.length; i += 3) [ci[i + 1], ci[i + 2]] = [ci[i + 2], ci[i + 1]];
    channel.geometry.computeVertexNormals(); channel.receiveShadow = true; channel.renderOrder = 2;
    this.group.add(channel);

    const poolGeometry = new THREE.CircleGeometry(1.9, 48);
    poolGeometry.rotateX(-Math.PI / 2);
    const poolUvs = poolGeometry.attributes.uv;
    for (let i = 0; i < poolUvs.count; i++) poolUvs.setXY(i, poolUvs.getY(i) * 3, (poolUvs.getX(i) - .5) * 2);
    const pool = new THREE.Mesh(poolGeometry, this.riverMaterial);
    pool.position.set(0, .025, .35); pool.scale.z = .85; pool.receiveShadow = true; pool.renderOrder = 2;
    this.waterfallGroup.add(pool);

    const splashMaterial = new THREE.MeshBasicMaterial({ color: 0xd9fff4, transparent: true, opacity: .65, depthWrite: false });
    this.splash = new THREE.InstancedMesh(new THREE.SphereGeometry(.065, 5, 4), splashMaterial, 18);
    this.splash.instanceMatrix.setUsage(THREE.DynamicDrawUsage); this.splash.renderOrder = 4;
    this.splash.frustumCulled = false; this.waterfallGroup.add(this.splash);
    this.splashObject = new THREE.Object3D();
    this.splashSeeds = Array.from({ length: 18 }, (_, i) => ({
      phase: i * .61803398875 % 1, angle: i * 2.3999632297,
      speed: .5 + (i % 5) * .1, x: Math.sin(i * 2.6) * .85,
    }));
    this.update(0, 0);
  }

  update(dt, t) {
    this.clock.value = Number.isFinite(t) ? t : this.clock.value + Math.max(0, dt || 0);
    for (let i = 0; i < this.splashSeeds.length; i++) {
      const seed = this.splashSeeds[i], age = (this.clock.value * seed.speed + seed.phase) % 1;
      const object = this.splashObject;
      object.position.set(seed.x + Math.cos(seed.angle) * age * .65,
        .06 + Math.sin(age * Math.PI) * (.45 + .15 * Math.sin(i)),
        .3 + Math.sin(seed.angle) * age * .45);
      object.scale.setScalar(.4 + (1 - age) * .75); object.updateMatrix();
      this.splash.setMatrixAt(i, object.matrix);
    }
    this.splash.instanceMatrix.needsUpdate = true;
  }
}
