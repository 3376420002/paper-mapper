(function (PM) {
  'use strict';

  function createConnections(THREE, scene, edges, paperMarkers) {
    let lineGroup = null;

    function clear() {
      if (!lineGroup) return;
      scene.remove(lineGroup);
      lineGroup.traverse(object => {
        if (object.geometry) object.geometry.dispose();
        if (object.material) object.material.dispose();
      });
      lineGroup = null;
    }

    function showFor(selectedId) {
      clear();
      if (!selectedId) return;
      lineGroup = new THREE.Group();
      lineGroup.name = 'Selected paper citations';

      for (const [sourceId, targetId] of edges) {
        let color;
        if (sourceId === selectedId) color = '#38bdf8';
        else if (targetId === selectedId) color = '#fbbf24';
        else continue;

        const source = paperMarkers.markers.get(sourceId);
        const target = paperMarkers.markers.get(targetId);
        if (!source || !target) continue;
        const geometry = new THREE.BufferGeometry().setFromPoints([
          source.group.position.clone(), target.group.position.clone()
        ]);
        const material = new THREE.LineBasicMaterial({ color, transparent: true, opacity: 0.7, depthTest: false, depthWrite: false });
        const line = new THREE.Line(geometry, material);
        line.renderOrder = 10;
        lineGroup.add(line);
      }
      scene.add(lineGroup);
    }

    return { showFor, clear };
  }

  PM.createConnections = createConnections;
})(window.PM = window.PM || {});
