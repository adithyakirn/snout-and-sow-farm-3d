import * as THREE from 'three';
import { treeData } from './tree-data.js';

// Decorative planting only. Metres, registration and surveyed/planned objects
// remain owned by app.js. Quality changes foliage detail, never tree locations.
export const FOREST_SETTINGS = Object.freeze({
  seed: 21741, density: 0.85, windStrength: 0.65, quality: 'auto',
  palette: ['#203F35', '#315D43', '#56834B', '#8EAF60', '#C2CF82'],
});
export function seededRandom(seed) {
  return () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 4294967296;
  };
}
function segmentDistance(x, z, a, b) {
  const dx = b.x - a.x, dz = b.z - a.z;
  const t = THREE.MathUtils.clamp(((x - a.x) * dx + (z - a.z) * dz) / (dx * dx + dz * dz || 1), 0, 1);
  return Math.hypot(x - a.x - t * dx, z - a.z - t * dz);
}
export function plantingAllowed(x, z, radius, exclusions) {
  // Entire working compound, including all paths, entrance approaches and gate
  // sight lines. Expand by crown radius rather than merely clearing the trunk.
  if (x > -34 - radius && x < 39 + radius && z > -57 - radius && z < 57 + radius) return false;
  for (const b of exclusions.buildings || []) {
    const dx = x - b.x, dz = z - b.z, c = Math.cos(b.angle), s = Math.sin(b.angle);
    if (Math.abs(c * dx - s * dz) < b.w / 2 + radius + 3 &&
        Math.abs(s * dx + c * dz) < b.d / 2 + radius + 3) return false;
  }
  for (const points of exclusions.corridors || []) {
    for (let i = 1; i < points.length; i++) {
      if (segmentDistance(x, z, points[i - 1], points[i]) < radius + 2.5) return false;
    }
  }
  return true;
}

// Four original, deterministic leaf sprays. RGB encodes a subtle broad paint
// value; alpha encodes the silhouette. No white border and no blended cards.
function leafAtlas() {
  const canvas = document.createElement('canvas');
  canvas.width = 1024; canvas.height = 512;
  const ctx = canvas.getContext('2d');
  const random = seededRandom(941);
  for (let tile = 0; tile < 4; tile++) {
    ctx.save(); ctx.translate(tile * 256 + 128, 128);
    for (let spray = 0; spray < 9; spray++) {
      const angle = spray * 2.399 + tile * 0.7;
      const reach = spray === 0 ? 0 : 26 + random() * 45;
      const cx = Math.cos(angle) * reach, cy = Math.sin(angle) * reach * 0.8;
      for (let leaf = 0; leaf < 13; leaf++) {
        const a = random() * Math.PI * 2, r = Math.sqrt(random()) * 34;
        const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
        const tone = Math.round(173 + (1 - (y + 105) / 210) * 51 + random() * 20);
        ctx.fillStyle = `rgb(${tone},${tone},${tone})`;
        ctx.beginPath();
        ctx.ellipse(x, y, 10 + random() * 9, 4 + random() * 5, a * 0.6 + tile, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // Small deliberate holes in each spray reveal the next layer of the crown.
    ctx.globalCompositeOperation = 'destination-out';
    for (let hole = 0; hole < 8; hole++) {
      ctx.beginPath(); ctx.ellipse((random() - 0.5) * 90, (random() - 0.5) * 80, 3 + random() * 3, 2 + random() * 2, random() * 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.restore();
  }
  // A feather-shaped palm spray occupies the lower-left atlas tile.
  ctx.save(); ctx.translate(128, 272);
  ctx.strokeStyle = 'rgb(211,211,211)'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0,0); ctx.lineTo(0,224); ctx.stroke();
  for (let i=0;i<24;i++) {
    const y=8+i*8.6, width=Math.sin((i+1)/25*Math.PI)*92;
    for (const side of [-1,1]) {
      ctx.fillStyle = `rgb(${190+i},${190+i},${190+i})`;
      ctx.beginPath(); ctx.moveTo(0,y); ctx.quadraticCurveTo(side*width*0.55,y+3,side*width,y+24);
      ctx.quadraticCurveTo(side*width*0.45,y+16,0,y+5); ctx.fill();
    }
  }
  ctx.restore();
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.NoColorSpace; // data, not an sRGB photograph
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.anisotropy = 2;
  return texture;
}
const windGLSL = /* glsl */`
  uniform float forestTime;
  uniform float windStrength;
  vec3 forestWind(vec3 p, vec3 root) {
    float phase = root.x * 0.117 + root.z * 0.083;
    float gust = 0.7 + 0.3 * sin(forestTime * 0.23 + phase * 0.2);
    float anchor = pow(clamp(p.y / 12.0, 0.0, 1.0), 1.6);
    float sway = sin(forestTime * 0.75 + phase) * 0.16 * gust;
    return p + vec3(1.0, 0.0, 0.38) * sway * anchor * windStrength;
  }
`;
function foliageMaterial(atlas, settings) {
  return new THREE.ShaderMaterial({
    name: 'Painted leaf sprays', side: THREE.DoubleSide, fog: true,
    uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
      leafMap: {value: atlas}, palette: {value: settings.palette.map(c => new THREE.Color(c))},
      sunDirection: {value: new THREE.Vector3(-40, 85, 35).normalize()},
    }]),
    vertexShader: /* glsl */`
      #include <fog_pars_vertex>
      ${windGLSL}
      attribute float canopyValue;
      varying vec2 leafUV;
      varying vec3 crownNormal;
      varying float paintValue;
      varying float treeTint;
      void main() {
        // instanceMatrix is injected by Three r170; never redeclare it.
        vec3 root = instanceMatrix[3].xyz;
        vec3 p = forestWind(position, root);
        float flutter = sin(forestTime * 1.65 + root.x + position.x * 1.7 + position.z) * 0.025;
        p.xz += vec2(1.0, 0.38) * flutter * windStrength * smoothstep(3.0, 11.0, p.y);
        vec4 world = modelMatrix * instanceMatrix * vec4(p, 1.0);
        mat3 m = mat3(instanceMatrix);
        vec3 n = normal / vec3(dot(m[0],m[0]), dot(m[1],m[1]), dot(m[2],m[2]));
        crownNormal = normalize(mat3(modelMatrix) * m * n);
        leafUV = uv; paintValue = canopyValue;
        treeTint = sin(root.x * 0.37 + root.z * 0.19);
        vec4 mvPosition = viewMatrix * world;
        gl_Position = projectionMatrix * mvPosition;
        #include <fog_vertex>
      }
    `,
    fragmentShader: /* glsl */`
      #include <fog_pars_fragment>
      uniform sampler2D leafMap;
      uniform vec3 palette[5];
      uniform vec3 sunDirection;
      varying vec2 leafUV;
      varying vec3 crownNormal;
      varying float paintValue;
      varying float treeTint;
      void main() {
        vec4 leaf = texture2D(leafMap, leafUV);
        if (leaf.a < 0.42) discard;
        float light = dot(normalize(crownNormal), sunDirection);
        light += (paintValue - 0.5) * 0.26;
        vec3 col = mix(palette[0], palette[1], smoothstep(-0.65, -0.20, light));
        col = mix(col, palette[2], smoothstep(-0.08, 0.16, light));
        col = mix(col, palette[3], smoothstep(0.45, 0.65, light));
        col = mix(col, palette[4], smoothstep(0.88, 1.0, light) * 0.32);
        col *= 0.91 + leaf.r * 0.11;
        col *= vec3(1.0 + treeTint * 0.045, 1.0 + treeTint * 0.018, 1.0 - treeTint * 0.035);
        gl_FragColor = vec4(col, 1.0);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
        #include <fog_fragment>
      }
    `,
  });
}

function geometryBuilder() {
  const positions = [], normals = [], uvs = [], values = [], indices = [];
  return {
    card(center, right, up, outward, size, tile, value) {
      const start = positions.length / 3;
      for (const [x, y] of [[-1,-1],[1,-1],[1,1],[-1,1]]) {
        positions.push(center.x + (right.x*x + up.x*y)*size, center.y + (right.y*x + up.y*y)*size, center.z + (right.z*x + up.z*y)*size);
        // Bent normals describe the volume of a cluster, not a flat rectangle.
        const n = outward.clone().addScaledVector(right, x * 0.32).addScaledVector(up, y * 0.32).normalize();
        normals.push(n.x,n.y,n.z); uvs.push((tile + (x+1)/2)/4, 0.5+(y+1)/4); values.push(value);
      }
      indices.push(start,start+1,start+2,start,start+2,start+3);
    },
    frond(tip, angle, length) {
      const start = positions.length / 3;
      for(let i=0;i<=8;i++) {
        const t=i/8, reach=t*length, h=Math.sin(t*Math.PI)*0.8-t*t*1.6;
        for(const side of [-1,1]) {
          positions.push(tip.x+Math.cos(angle)*reach-Math.sin(angle)*side*0.9,tip.y+h,tip.z+Math.sin(angle)*reach+Math.cos(angle)*side*0.9);
          normals.push(Math.cos(angle)*t*0.4,1,Math.sin(angle)*t*0.4);
          uvs.push((side+1)/8,0.5-t*0.5); values.push(0.65);
        }
        if(i<8) {const k=start+i*2;indices.push(k,k+1,k+2,k+1,k+3,k+2);}
      }
    },
    finish() {
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
      geo.setAttribute('normal',new THREE.Float32BufferAttribute(normals,3));
      geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));
      geo.setAttribute('canopyValue',new THREE.Float32BufferAttribute(values,1));
      geo.setIndex(indices); geo.computeBoundingSphere(); return geo;
    },
  };
}
function mergeBranches(parts) {
  const p = [], n = [], index = [];
  for (const geo of parts) {
    const offset = p.length / 3;
    p.push(...geo.attributes.position.array); n.push(...geo.attributes.normal.array);
    for (const i of geo.index.array) index.push(i + offset);
    geo.dispose();
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position',new THREE.Float32BufferAttribute(p,3));
  geo.setAttribute('normal',new THREE.Float32BufferAttribute(n,3)); geo.setIndex(index); return geo;
}
function branch(a, b, bottom, top) {
  const delta = b.clone().sub(a);
  const geo = new THREE.CylinderGeometry(top,bottom,delta.length(),5,1,true);
  geo.applyQuaternion(new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0,1,0),delta.normalize()));
  geo.translate((a.x+b.x)/2,(a.y+b.y)/2,(a.z+b.z)/2); return geo;
}
function treeTemplate(variant) {
  const random = seededRandom(901 + variant * 187);
  const base = geometryBuilder(), detail = geometryBuilder(), parts = [];
  const palm = variant === 7;
  const lean = (random() - 0.5) * 1.3;
  const fork = new THREE.Vector3(lean, 4.2, 0.3);
  parts.push(branch(new THREE.Vector3(),new THREE.Vector3(lean*0.3,2.4,0),0.34,0.23));
  parts.push(branch(new THREE.Vector3(lean*0.3,2.4,0),fork,0.23,0.17));
  if (palm) {
    const tip = new THREE.Vector3(lean*1.5,10,0.5);
    parts.push(branch(fork,tip,0.18,0.10));
    for (let f=0; f<9; f++) {
      const a = f * Math.PI * 2/9 + random()*0.2;
      base.frond(tip,a,3.8+random()*0.9);
    }
  } else {
    const clusterCount = 6 + variant % 3;
    for (let c=0; c<clusterCount; c++) {
      const a = c*2.399+random()*0.65;
      const reach = c===0 ? 0.1 : 1.5+random()*1.6;
      const center = new THREE.Vector3(lean+Math.cos(a)*reach, c===0 ? 8.7 : 6.0+random()*2.4, Math.sin(a)*reach);
      const radius = c===0 ? 2.3 : 1.4+random()*0.8;
      parts.push(branch(fork,center,0.13,0.035));
      for (let k=0; k<38; k++) {
        // Fibonacci directions cover the underside and orbiting views too.
        const y = 1-2*(k+0.5)/38, a2=k*2.399+variant;
        const r = Math.sqrt(1-y*y);
        const outward = new THREE.Vector3(Math.cos(a2)*r,y,Math.sin(a2)*r);
        const position = center.clone().add(new THREE.Vector3(outward.x*radius,outward.y*radius*0.63,outward.z*radius));
        const right = new THREE.Vector3().crossVectors(outward,new THREE.Vector3(0,1,0)).normalize();
        const up = new THREE.Vector3().crossVectors(right,outward).normalize();
        // Interleaved base/detail sprays keep silhouettes stable at LOD changes.
        (k%2 ? detail : base).card(position,right,up,outward, radius*(0.60+random()*0.13),Math.floor(random()*4),0.3+random()*0.5);
      }
    }
  }
  return {base:base.finish(), detail:detail.finish(), trunk:mergeBranches(parts)};
}

export function createForest(parent, exclusions = {}, options = {}) {
  const settings = {...FOREST_SETTINGS,...options};
  const group = new THREE.Group(); group.name = 'Decorative painterly forest'; parent.add(group);
  const atlas = leafAtlas();
  const time = {value:0}, strength = {value:settings.windStrength};
  const leaves = foliageMaterial(atlas,settings);
  leaves.uniforms.forestTime = time; leaves.uniforms.windStrength = strength;
  const trunkMaterial = new THREE.MeshLambertMaterial({color:'#79604a'});
  trunkMaterial.onBeforeCompile = shader => {
    shader.uniforms.forestTime = time; shader.uniforms.windStrength = strength;
    shader.vertexShader = windGLSL + shader.vertexShader.replace('#include <begin_vertex>',
      '#include <begin_vertex>\n transformed = forestWind(transformed, instanceMatrix[3].xyz);');
  };
  trunkMaterial.customProgramCacheKey = () => 'forest-anchored-wind-v1';
  const random = seededRandom(settings.seed), trees = [], lists = Array.from({length:8},()=>[]);
  for (const [x,z,type,scale] of treeData) {
    const roll = random(), variant = type===1 && random()<0.22 ? 7 : Math.floor(random()*7);
    const small = type===3 ? 0.25 : type===2 ? 0.65 : 1;
    const sx = scale*small*(0.83+random()*0.28), sy=scale*small*(0.85+random()*0.35);
    const radius = variant===7 ? 4.2*sx : 6.2*sx;
    if (roll>settings.density || !plantingAllowed(x,z,radius,exclusions)) continue;
    if (trees.some(t=>Math.hypot(t.x-x,t.z-z)<(t.radius+radius)*0.57)) continue;
    const t = {x,z,radius,variant,sx,sy,rotation:random()*Math.PI*2};
    trees.push(t); lists[variant].push(t);
    if (variant !== 7 && random() < 0.2) {
      const bx=x+radius*0.42, bz=z-radius*0.25;
      if(plantingAllowed(bx,bz,1.4,exclusions)) {
        lists[(variant+2)%7].push({x:bx,z:bz,radius:1.4,variant:(variant+2)%7,sx:0.23,sy:0.15,rotation:random()*6.28});
      }
    }
  }
  const dummy = new THREE.Object3D();
  const batches = [];
  for (let v=0; v<8; v++) {
    const template = treeTemplate(v), list = lists[v];
    const base = new THREE.InstancedMesh(template.base,leaves,list.length);
    const trunk = new THREE.InstancedMesh(template.trunk,trunkMaterial,list.length);
    const detail = new THREE.InstancedMesh(template.detail,leaves,list.length);
    base.name = `Leaf masses ${v}`; trunk.name = `Forked trunks ${v}`; detail.name = `Near leaf detail ${v}`;
    for (let i=0; i<list.length; i++) {
      const t=list[i]; dummy.position.set(t.x,0,t.z); dummy.rotation.set(0,t.rotation,0); dummy.scale.set(t.sx,t.sy,t.sx*(0.9+(i%5)*0.04)); dummy.updateMatrix();
      t.matrix=dummy.matrix.clone(); base.setMatrixAt(i,t.matrix); trunk.setMatrixAt(i,t.matrix);
    }
    base.computeBoundingSphere(); trunk.computeBoundingSphere();
    base.instanceMatrix.setUsage(THREE.DynamicDrawUsage); trunk.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    // Wind displacement is <0.25 m; include it in bounds.
    base.boundingSphere.radius += 0.5; trunk.boundingSphere.radius += 0.5;
    detail.count=0; detail.frustumCulled=false;
    detail.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    group.add(base,trunk,detail); batches.push({list,base,trunk,detail});
  }
  // Soft contact/canopy shade is a single instanced ground pass. This avoids
  // rendering hundreds of alpha crowns into a shadow map on mobile.
  const shadowCanvas=document.createElement('canvas'); shadowCanvas.width=128; shadowCanvas.height=128;
  const ctx=shadowCanvas.getContext('2d'), grad=ctx.createRadialGradient(64,64,7,64,64,63);
  grad.addColorStop(0,'rgba(16,35,25,0.38)'); grad.addColorStop(0.5,'rgba(16,35,25,0.22)'); grad.addColorStop(1,'rgba(16,35,25,0)'); ctx.fillStyle=grad; ctx.fillRect(0,0,128,128);
  const shadowTexture=new THREE.CanvasTexture(shadowCanvas); shadowTexture.colorSpace=THREE.SRGBColorSpace;
  const shade=new THREE.InstancedMesh(new THREE.PlaneGeometry(2,2).rotateX(-Math.PI/2),new THREE.MeshBasicMaterial({map:shadowTexture,transparent:true,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),trees.length);
  trees.forEach((t,i)=>{dummy.position.set(t.x+t.sy*2,0.015,t.z-t.sy*1.5);dummy.rotation.set(0,0,0);dummy.scale.set(t.radius*1.15,1,t.radius*0.8);dummy.updateMatrix();shade.setMatrixAt(i,dummy.matrix);});
  group.add(shade);
  let quality='balanced', lastLOD=-Infinity, lastFov=0, lastAspect=0;
  const previousCamera = new THREE.Vector3(Infinity,Infinity,Infinity);
  const previousRotation = new THREE.Quaternion();
  const frustum = new THREE.Frustum(), clip = new THREE.Matrix4(), bounds = new THREE.Sphere();
  function setQuality(value) {
    quality=value==='auto' ? (matchMedia('(pointer: coarse)').matches || navigator.hardwareConcurrency<=4 ? 'low' : 'balanced') : value;
    lastLOD=-Infinity;
  }
  setQuality(settings.quality);
  return {
    group, trees, settings, setQuality,
    get quality(){return quality;},
    get time(){return time.value;},
    update(elapsed,camera) {
      time.value=elapsed;
      if (!camera || !group.visible) return;
      if (Math.abs(elapsed-lastLOD)<0.4 && previousCamera.distanceToSquared(camera.position)<0.25 && previousRotation.angleTo(camera.quaternion)<0.005 && lastFov===camera.fov && lastAspect===camera.aspect) return;
      lastLOD=elapsed; previousCamera.copy(camera.position); previousRotation.copy(camera.quaternion);
      lastFov=camera.fov; lastAspect=camera.aspect;
      camera.updateMatrixWorld();
      frustum.setFromProjectionMatrix(clip.multiplyMatrices(camera.projectionMatrix,camera.matrixWorldInverse));
      const limit=quality==='low' ? 65 : 145;
      for (const {list,base,trunk,detail} of batches) {
        let count=0, visible=0;
        for (const t of list) {
          bounds.center.set(t.x,t.sy*6,t.z); bounds.radius=8*Math.max(t.sx,t.sy);
          if (!frustum.intersectsSphere(bounds)) continue;
          base.setMatrixAt(visible,t.matrix); trunk.setMatrixAt(visible++,t.matrix);
          if ((t.x-camera.position.x)**2+(t.z-camera.position.z)**2+(t.sy*7-camera.position.y)**2<limit*limit) detail.setMatrixAt(count++,t.matrix);
        }
        base.count=trunk.count=visible;
        base.instanceMatrix.needsUpdate=trunk.instanceMatrix.needsUpdate=true;
        detail.count=count; detail.instanceMatrix.needsUpdate=true;
      }
    },
    stats(){return {trees:trees.length,understory:lists.reduce((n,l)=>n+l.length,0)-trees.length,palms:trees.filter(t=>t.variant===7).length,quality,windTime:time.value,visibleTrees:batches.reduce((n,b)=>n+b.base.count,0),detailTrees:batches.reduce((n,b)=>n+b.detail.count,0),visible:group.visible};},
    dispose(){
      group.traverse(o=>{if(o.isMesh) {o.geometry.dispose(); o.dispose?.();}});
      leaves.dispose(); trunkMaterial.dispose(); shade.material.dispose(); atlas.dispose(); shadowTexture.dispose(); parent.remove(group);
    },
  };
}
