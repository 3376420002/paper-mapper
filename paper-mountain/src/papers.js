(function (PM) {
  'use strict';

  const STATUS_COLORS = {
    frontier: '#fbbf24',
    peak: '#a78bfa',
    baseline: '#38bdf8',
    legacy: '#64748b'
  };
  const STATUS_LABELS = {
    frontier: '当前前沿',
    peak: '里程碑主峰',
    baseline: '强基线',
    legacy: '早期 / 已超越'
  };

  function createPaperMarkers(THREE, scene, papers, heightAt) {
    const markers = new Map();
    const selectable = [];

    function createMarker(paper, animate = false) {
      const color = STATUS_COLORS[paper.status] || STATUS_COLORS.baseline;
      const citations = Math.max(0, Number(paper.citations) || 0);
      const radius = 0.9 + Math.min(Math.log10(citations + 1) / 4.5, 1) * 1.2;
      const group = new THREE.Group();
      const ballMaterial = new THREE.MeshStandardMaterial({
        color, emissive: color, emissiveIntensity: 0.65,
        roughness: 0.36, metalness: 0.08, transparent: true, opacity: 1
      });
      const haloMaterial = new THREE.MeshBasicMaterial({
        color, transparent: true, opacity: 0.16,
        blending: THREE.AdditiveBlending, depthWrite: false
      });
      const ball = new THREE.Mesh(new THREE.SphereGeometry(radius, 20, 14), ballMaterial);
      const halo = new THREE.Mesh(new THREE.SphereGeometry(radius * 2.1, 16, 12), haloMaterial);
      ball.userData.paperId = paper.id;
      group.add(halo, ball);
      group.position.set(paper.layoutX, heightAt(paper.layoutX, paper.layoutZ) + 1.8, paper.layoutZ);
      group.userData.paperId = paper.id;
      scene.add(group);
      const marker = { paper, group, ball, halo, ballMaterial, haloMaterial, targetScale: 1, currentScale: animate ? 0 : 1, bornAt: animate ? performance.now() : null };
      group.scale.setScalar(marker.currentScale);
      markers.set(paper.id, marker);
      selectable.push(ball);
      return marker;
    }

    function setSelected(id) {
      for (const marker of markers.values()) marker.targetScale = marker.paper.id === id ? 1.85 : 1;
    }

    function setSearch(query) {
      const normalized = query.trim().toLocaleLowerCase();
      for (const marker of markers.values()) {
        const paper = marker.paper;
        const content = [paper.title, paper.shortName, paper.venue, paper.basedOn, paper.openProblem].join(' ').toLocaleLowerCase();
        const matched = !normalized || content.includes(normalized);
        marker.ballMaterial.opacity = matched ? 1 : 0.07;
        marker.haloMaterial.opacity = matched ? 0.16 : 0.015;
      }
    }

    function update(deltaSeconds, now) {
      const follow = 1 - Math.exp(-deltaSeconds * 10);
      for (const marker of markers.values()) {
        let birthScale = 1;
        if (marker.bornAt !== null) {
          const t = Math.min((now - marker.bornAt) / 600, 1);
          const back = 1.70158;
          birthScale = 1 + (back + 1) * (t - 1) ** 3 + back * (t - 1) ** 2;
          if (t >= 1) marker.bornAt = null;
        }
        marker.currentScale += (marker.targetScale - marker.currentScale) * follow;
        marker.group.scale.setScalar(marker.currentScale * birthScale);
      }
    }

    papers.forEach(paper => createMarker(paper));
    return { markers, selectable, createMarker, setSelected, setSearch, update };
  }

  PM.STATUS_COLORS = STATUS_COLORS;
  PM.STATUS_LABELS = STATUS_LABELS;
  PM.createPaperMarkers = createPaperMarkers;
})(window.PM = window.PM || {});
