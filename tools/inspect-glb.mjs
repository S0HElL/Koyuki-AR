// Dependency-free GLB inspector (dev tool only, not shipped to the browser).
// Usage: node tools/inspect-glb.mjs models/Koyuki.glb
import { readFileSync } from 'node:fs';

const file = process.argv[2] ?? 'models/Koyuki.glb';
const buf = readFileSync(file);

const magic = buf.toString('ascii', 0, 4);
if (magic !== 'glTF') throw new Error(`Not a GLB (magic = ${JSON.stringify(magic)})`);
const version = buf.readUInt32LE(4);
const declaredLength = buf.readUInt32LE(8);
const jsonLength = buf.readUInt32LE(12);
const jsonType = buf.toString('ascii', 16, 20);
if (jsonType !== 'JSON') throw new Error('First chunk is not JSON');
const gltf = JSON.parse(buf.toString('utf8', 20, 20 + jsonLength));

console.log('file:', file);
console.log('bytes:', buf.length, '(declared', declaredLength + ')');
console.log('glTF version:', version, '| asset:', JSON.stringify(gltf.asset));
console.log('extensionsUsed:', gltf.extensionsUsed ?? []);
console.log('extensionsRequired:', gltf.extensionsRequired ?? []);
console.log('scenes:', gltf.scenes?.length ?? 0, '| default scene:', gltf.scene);
console.log('nodes:', gltf.nodes?.length ?? 0);
console.log('meshes:', gltf.meshes?.length ?? 0);
console.log('skins:', gltf.skins?.length ?? 0);
console.log('materials:', gltf.materials?.length ?? 0);
console.log('textures:', gltf.textures?.length ?? 0);
console.log('images:', gltf.images?.length ?? 0);
const external = (gltf.images ?? []).filter((i) => i.uri && !i.uri.startsWith('data:'));
console.log('external image URIs:', external.length ? external.map((i) => i.uri) : 'none (embedded)');
console.log('buffers:', (gltf.buffers ?? []).map((b) => ({ byteLength: b.byteLength, uri: b.uri ? '(uri)' : undefined })));

console.log('animations:', gltf.animations?.length ?? 0);
(gltf.animations ?? []).forEach((a, i) => console.log(`  [${i}] name=${JSON.stringify(a.name)} channels=${a.channels?.length}`));

// Bounding box from POSITION accessor min/max, transformed by node world matrices.
const identity = () => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1];
const mul = (a, b) => {
  const o = new Array(16).fill(0);
  for (let c = 0; c < 4; c++)
    for (let r = 0; r < 4; r++)
      for (let k = 0; k < 4; k++) o[c * 4 + r] += a[k * 4 + r] * b[c * 4 + k];
  return o;
};
const local = (n) => {
  if (n.matrix) return n.matrix;
  const [qx, qy, qz, qw] = n.rotation ?? [0, 0, 0, 1];
  const [sx, sy, sz] = n.scale ?? [1, 1, 1];
  const [tx, ty, tz] = n.translation ?? [0, 0, 0];
  return [
    (1 - 2 * (qy * qy + qz * qz)) * sx, 2 * (qx * qy + qz * qw) * sx, 2 * (qx * qz - qy * qw) * sx, 0,
    2 * (qx * qy - qz * qw) * sy, (1 - 2 * (qx * qx + qz * qz)) * sy, 2 * (qy * qz + qx * qw) * sy, 0,
    2 * (qx * qz + qy * qw) * sz, 2 * (qy * qz - qx * qw) * sz, (1 - 2 * (qx * qx + qy * qy)) * sz, 0,
    tx, ty, tz, 1,
  ];
};
const min = [Infinity, Infinity, Infinity];
const max = [-Infinity, -Infinity, -Infinity];
const visit = (idx, parent) => {
  const n = gltf.nodes[idx];
  const world = mul(parent, local(n));
  if (n.mesh !== undefined) {
    for (const p of gltf.meshes[n.mesh].primitives) {
      const acc = gltf.accessors[p.attributes.POSITION];
      if (!acc?.min || !acc?.max) continue;
      for (let i = 0; i < 8; i++) {
        const v = [i & 1 ? acc.max[0] : acc.min[0], i & 2 ? acc.max[1] : acc.min[1], i & 4 ? acc.max[2] : acc.min[2]];
        for (let a = 0; a < 3; a++) {
          const w = world[a] * v[0] + world[4 + a] * v[1] + world[8 + a] * v[2] + world[12 + a];
          min[a] = Math.min(min[a], w);
          max[a] = Math.max(max[a], w);
        }
      }
    }
  }
  (n.children ?? []).forEach((c) => visit(c, world));
};
const scene = gltf.scenes?.[gltf.scene ?? 0];
(scene?.nodes ?? []).forEach((n) => visit(n, identity()));
console.log('bbox min (static, un-skinned, meters if glTF-conformant):', min.map((v) => +v.toFixed(4)));
console.log('bbox max:', max.map((v) => +v.toFixed(4)));
console.log('size x/y/z:', max.map((v, i) => +(v - min[i]).toFixed(4)));
