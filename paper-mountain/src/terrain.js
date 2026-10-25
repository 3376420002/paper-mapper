(function (PM) {
  'use strict';

  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const smoothstep = (a, b, value) => {
    const t = clamp((value - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  };
  const fade = value => value * value * (3 - 2 * value);
  const lerp = (a, b, t) => a + (b - a) * t;

  function randomAt(x, z) {
    let n = Math.imul(x, 374761393) + Math.imul(z, 668265263);
    n = Math.imul(n ^ (n >>> 13), 1274126177);
    return ((n ^ (n >>> 16)) >>> 0) / 4294967295;
  }

  function noise2(x, z) {
    const ix = Math.floor(x), iz = Math.floor(z);
    const fx = fade(x - ix), fz = fade(z - iz);
    const a = lerp(randomAt(ix, iz), randomAt(ix + 1, iz), fx);
    const b = lerp(randomAt(ix, iz + 1), randomAt(ix + 1, iz + 1), fx);
    return lerp(a, b, fz);
  }

  function ridgedNoise(x, z) {
    const first = 1 - Math.abs(noise2(x, z) * 2 - 1);
    const second = 1 - Math.abs(noise2(x * 2.1 + 7.3, z * 2.1 - 4.9) * 2 - 1);
    return first * 0.72 + second * 0.28;
  }

  function terrainHeight(x, z, clusters) {
    let height = noise2(x * 0.035, z * 0.035) * 5;

    for (const cluster of clusters) {
      const dx = x - cluster.cx, dz = z - cluster.cz;
      const distanceSq = dx * dx + dz * dz;
      const localLift = Math.exp(-distanceSq / (2 * cluster.sigma * cluster.sigma * 1.4));
      const erosion = 0.6 + 0.5 * ridgedNoise(x * 0.075, z * 0.075);
      height += cluster.peak * localLift * erosion;
    }

    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const a = clusters[i], b = clusters[j];
        const vx = b.cx - a.cx, vz = b.cz - a.cz;
        const t = clamp(((x - a.cx) * vx + (z - a.cz) * vz) / (vx * vx + vz * vz || 1), 0, 1);
        const closestX = a.cx + vx * t, closestZ = a.cz + vz * t;
        const perpendicularSq = (x - closestX) ** 2 + (z - closestZ) ** 2;
        const middle = Math.sin(Math.PI * t) ** 2;
        height += 2.5 * middle * Math.exp(-perpendicularSq / (2 * 19 * 19));
      }
    }

    height += (noise2(x * 0.28, z * 0.28) - 0.5) * 0.8;
    const edge = smoothstep(115, 148, Math.hypot(x, z));
    return lerp(height, -16, edge);
  }

  function createTerrain(THREE, clusters) {
    const geometry = new THREE.PlaneGeometry(260, 260, 220, 220);
    geometry.rotateX(-Math.PI / 2);
    const positions = geometry.attributes.position;
    const colors = new Float32Array(positions.count * 3);
    const domainColors = clusters.map(cluster => new THREE.Color().setHSL(cluster.hue / 360, 0.33, 0.27));
    const dark = new THREE.Color(0.05, 0.065, 0.09);
    const mixed = new THREE.Color();

    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i);
      const height = terrainHeight(x, z, clusters);
      positions.setY(i, height);

      let total = 0, red = 0, green = 0, blue = 0;
      for (let index = 0; index < clusters.length; index++) {
        const cluster = clusters[index];
        const dx = x - cluster.cx, dz = z - cluster.cz;
        const weight = Math.exp(-(dx * dx + dz * dz) / (2 * cluster.sigma * cluster.sigma * 2));
        const color = domainColors[index];
        red += color.r * weight; green += color.g * weight; blue += color.b * weight;
        total += weight;
      }
      mixed.setRGB(red / Math.max(total, 0.0001), green / Math.max(total, 0.0001), blue / Math.max(total, 0.0001));
      const lowFade = smoothstep(-1, 0.14 * 42, height);
      mixed.lerpColors(dark, mixed, lowFade);
      const highLift = smoothstep(0.68 * 42, 0.95 * 42, height) * 0.15;
      mixed.lerp(new THREE.Color(0.72, 0.78, 0.80), highLift);
      colors[i * 3] = mixed.r; colors[i * 3 + 1] = mixed.g; colors[i * 3 + 2] = mixed.b;
    }

    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    geometry.computeVertexNormals();
    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92, metalness: 0.05, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(geometry, material);
    mesh.name = 'Research terrain';

    return { mesh, heightAt: (x, z) => terrainHeight(x, z, clusters) };
  }

  PM.createTerrain = createTerrain;
  PM.terrainHeight = terrainHeight;
  PM.noise2 = noise2;
})(window.PM = window.PM || {});
