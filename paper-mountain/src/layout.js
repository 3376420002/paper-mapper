(function (PM) {
  'use strict';

  function seededUnit(text) {
    let value = 2166136261;
    for (const char of text) value = Math.imul(value ^ char.charCodeAt(0), 16777619);
    value ^= value >>> 15;
    return (value >>> 0) / 4294967296;
  }

  function layoutPapers(papers, clusters, edges) {
    const clusterById = new Map(clusters.map(cluster => [cluster.id, cluster]));
    const nodeById = new Map();

    for (const paper of papers) {
      const cluster = clusterById.get(paper.cluster);
      if (!cluster) throw new Error(`论文 ${paper.id} 引用了不存在的子领域 ${paper.cluster}`);
      const angle = seededUnit(`${paper.id}:angle`) * Math.PI * 2;
      const radius = Math.sqrt(seededUnit(`${paper.id}:radius`)) * cluster.sigma * 0.4;
      const node = {
        paper, cluster,
        x: cluster.cx + Math.cos(angle) * radius,
        z: cluster.cz + Math.sin(angle) * radius,
        fx: 0, fz: 0
      };
      nodeById.set(paper.id, node);
    }

    const nodes = [...nodeById.values()];
    for (let iteration = 0; iteration < 200; iteration++) {
      for (const node of nodes) { node.fx = 0; node.fz = 0; }

      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const a = nodes[i], b = nodes[j];
          const dx = a.x - b.x, dz = a.z - b.z;
          const distanceSq = Math.max(dx * dx + dz * dz, 1);
          const distance = Math.sqrt(distanceSq);
          const force = 1200 / distanceSq;
          const fx = dx / distance * force, fz = dz / distance * force;
          a.fx += fx; a.fz += fz;
          b.fx -= fx; b.fz -= fz;
        }
      }

      for (const [sourceId, targetId] of edges) {
        const source = nodeById.get(sourceId), target = nodeById.get(targetId);
        if (!source || !target) continue;
        const dx = target.x - source.x, dz = target.z - source.z;
        const distance = Math.max(Math.hypot(dx, dz), 0.001);
        const force = (distance - 25) * 0.08;
        const fx = dx / distance * force, fz = dz / distance * force;
        source.fx += fx; source.fz += fz;
        target.fx -= fx; target.fz -= fz;
      }

      for (const node of nodes) {
        node.fx += (node.cluster.cx - node.x) * 0.03;
        node.fz += (node.cluster.cz - node.z) * 0.03;
        node.x += node.fx * 0.15;
        node.z += node.fz * 0.15;
      }
    }

    for (const node of nodes) {
      const dx = node.x - node.cluster.cx, dz = node.z - node.cluster.cz;
      const distance = Math.hypot(dx, dz);
      const limit = node.cluster.sigma * 0.85;
      if (distance > limit) {
        node.x = node.cluster.cx + dx / distance * limit;
        node.z = node.cluster.cz + dz / distance * limit;
      }
      node.paper.layoutX = node.x;
      node.paper.layoutZ = node.z;
    }
    return papers;
  }

  PM.layoutPapers = layoutPapers;
})(window.PM = window.PM || {});
