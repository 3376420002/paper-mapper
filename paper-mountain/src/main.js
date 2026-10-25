(function (PM) {
  'use strict';

  function showError(message) {
    const loading = document.getElementById('sceneLoading');
    loading.classList.add('error');
    loading.innerHTML = `<strong>场景初始化失败</strong><small>${PM.escapeHtml(message)}</small>`;
  }

  function start(THREE) {
    try {
      const data = PM.DATA;
      if (!data || !Array.isArray(data.CLUSTERS) || !Array.isArray(data.PAPERS) || !Array.isArray(data.EDGES)) {
        throw new Error('请检查 src/data.js 中的 CLUSTERS、PAPERS 和 EDGES。');
      }
      if (!data.CLUSTERS.length) throw new Error('请至少提供一个子领域。');
      const clusterIds = new Set(data.CLUSTERS.map(cluster => cluster.id));
      const paperIds = new Set(data.PAPERS.map(paper => paper.id));
      if (clusterIds.size !== data.CLUSTERS.length || paperIds.size !== data.PAPERS.length) throw new Error('数据 ID 必须唯一。');
      for (const paper of data.PAPERS) if (!clusterIds.has(paper.cluster)) throw new Error(`论文 ${paper.id} 的子领域不存在。`);
      for (const [source, target] of data.EDGES) if (!paperIds.has(source) || !paperIds.has(target)) throw new Error(`引用关系 ${source} → ${target} 指向不存在的论文。`);

      const sceneRoot = document.getElementById('scene');
      const labelLayer = document.getElementById('clusterLabels');
      const tooltip = document.getElementById('tooltip');
      const loading = document.getElementById('sceneLoading');
      const searchInput = document.getElementById('searchInput');
      const rotateButton = document.getElementById('rotateButton');
      const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setSize(Math.max(sceneRoot.clientWidth, 1), Math.max(sceneRoot.clientHeight, 1), false);
      renderer.outputColorSpace = THREE.SRGBColorSpace;
      renderer.toneMapping = THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure = 1.15;
      sceneRoot.appendChild(renderer.domElement);

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0x070a10);
      scene.fog = new THREE.Fog(0x070a10, 340, 680);
      scene.add(new THREE.HemisphereLight(0x7fa6ff, 0x0b1220, 0.95));
      const light = (color, intensity, x, y, z) => {
        const item = new THREE.DirectionalLight(color, intensity);
        item.position.set(x, y, z); scene.add(item);
      };
      light(0xffffff, 1.55, 110, 180, 80);
      light(0x6688ff, 0.6, -140, 60, -100);
      light(0xff9966, 0.28, -70, 40, 140);

      let seed = 247139;
      const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 4294967296; };
      const starPositions = new Float32Array(750 * 3);
      for (let i = 0; i < 750; i++) {
        const angle = random() * Math.PI * 2;
        const distance = 250 + random() * 390;
        starPositions[i * 3] = Math.cos(angle) * distance;
        starPositions[i * 3 + 1] = 40 + random() * 240;
        starPositions[i * 3 + 2] = Math.sin(angle) * distance;
      }
      const starGeometry = new THREE.BufferGeometry();
      starGeometry.setAttribute('position', new THREE.BufferAttribute(starPositions, 3));
      scene.add(new THREE.Points(starGeometry, new THREE.PointsMaterial({ color: 0x8fb6ff, size: 2.2, transparent: true, opacity: 0.55, sizeAttenuation: false, depthWrite: false, fog: false })));

      const terrain = PM.createTerrain(THREE, data.CLUSTERS);
      scene.add(terrain.mesh);
      PM.layoutPapers(data.PAPERS, data.CLUSTERS, data.EDGES);
      const markers = PM.createPaperMarkers(THREE, scene, data.PAPERS, terrain.heightAt);
      const connections = PM.createConnections(THREE, scene, data.EDGES, markers);
      const controls = PM.createCameraControls(THREE, Math.max(sceneRoot.clientWidth, 1), Math.max(sceneRoot.clientHeight, 1));
      const raycaster = new THREE.Raycaster();
      const pointer = new THREE.Vector2();
      const projected = new THREE.Vector3();
      let selectedId = null;
      let lastFrame = performance.now();

      function toast(message) {
        const element = document.getElementById('toast');
        element.textContent = message; element.classList.add('show');
        clearTimeout(toast.timer);
        toast.timer = setTimeout(() => element.classList.remove('show'), 2600);
      }

      function pickPaper(event) {
        if (!event) return null;
        const rect = renderer.domElement.getBoundingClientRect();
        pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
        pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
        raycaster.setFromCamera(pointer, controls.camera);
        const hits = raycaster.intersectObjects(markers.selectable, false);
        return hits.length ? data.PAPERS.find(paper => paper.id === hits[0].object.userData.paperId) || null : null;
      }

      function hideTooltip() { tooltip.style.display = 'none'; renderer.domElement.style.cursor = 'grab'; }
      function showTooltip(paper, event) {
        if (!paper || !event) { hideTooltip(); return; }
        tooltip.innerHTML = `<strong>${PM.escapeHtml(paper.title)}</strong><small>${PM.escapeHtml(paper.venue)} · ${PM.escapeHtml(paper.year)} 年<br>海拔 ${PM.escapeHtml(paper.elevation)} · <em>${PM.escapeHtml(PM.STATUS_LABELS[paper.status] || paper.status)}</em></small>`;
        tooltip.style.display = 'block';
        renderer.domElement.style.cursor = 'pointer';
        const area = sceneRoot.getBoundingClientRect();
        const x = event.clientX - area.left, y = event.clientY - area.top;
        let left = x + 16, top = y + 16;
        if (left + tooltip.offsetWidth > area.width - 8) left = x - tooltip.offsetWidth - 16;
        if (top + tooltip.offsetHeight > area.height - 8) top = y - tooltip.offsetHeight - 16;
        tooltip.style.left = `${Math.max(8, left)}px`;
        tooltip.style.top = `${Math.max(8, top)}px`;
      }

      function updateRotateButton() {
        rotateButton.classList.toggle('on', controls.state.autoRotate);
        rotateButton.setAttribute('aria-pressed', String(controls.state.autoRotate));
      }

      function selectPaper(paperOrId) {
        const paper = typeof paperOrId === 'string' ? data.PAPERS.find(item => item.id === paperOrId) : paperOrId;
        if (!paper) return;
        selectedId = paper.id;
        markers.setSelected(selectedId);
        connections.showFor(selectedId);
        panel.detail(paper);
        controls.state.autoRotate = false; updateRotateButton();
        controls.flyTo(new THREE.Vector3(paper.layoutX, terrain.heightAt(paper.layoutX, paper.layoutZ) + 3, paper.layoutZ));
        hideTooltip();
      }

      function overview() {
        selectedId = null;
        markers.setSelected(null);
        connections.clear();
        panel.overview();
        controls.reset(); updateRotateButton();
        hideTooltip();
      }

      const panel = PM.createPanel(document.getElementById('panel'), data, {
        onPaper: selectPaper,
        onOverview: overview,
        onCluster: id => {
          const cluster = data.CLUSTERS.find(item => item.id === id);
          if (cluster) controls.flyTo(new THREE.Vector3(cluster.cx, terrain.heightAt(cluster.cx, cluster.cz), cluster.cz), 210);
        },
        onToast: toast
      });
      panel.overview();

      PM.createPaperModal(data, {
        onAdd: paper => {
          markers.createMarker(paper, true);
          markers.setSearch(searchInput.value);
          selectPaper(paper);
          toast('论文已放置到山区；刷新页面后会恢复占位数据');
        }
      });

      controls.attach(renderer.domElement, {
        onClick: event => { const paper = pickPaper(event); if (paper) selectPaper(paper); },
        onHover: event => showTooltip(pickPaper(event), event)
      });
      searchInput.addEventListener('input', () => markers.setSearch(searchInput.value));
      document.addEventListener('keydown', event => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); searchInput.focus(); }
      });
      rotateButton.addEventListener('click', () => {
        controls.state.autoRotate = !controls.state.autoRotate;
        updateRotateButton();
      });
      document.getElementById('resetButton').addEventListener('click', overview);

      const labels = data.CLUSTERS.map(cluster => {
        const label = document.createElement('div');
        label.className = 'cluster-label';
        label.style.setProperty('--cluster-color', `hsl(${Number(cluster.hue) || 0} 58% 70%)`);
        label.innerHTML = `<strong>${PM.escapeHtml(cluster.name)}</strong><small>${PM.escapeHtml(cluster.subtitle)}</small>`;
        labelLayer.appendChild(label);
        return { cluster, label };
      });
      function updateLabels() {
        const width = sceneRoot.clientWidth, height = sceneRoot.clientHeight;
        for (const { cluster, label } of labels) {
          projected.set(cluster.cx, terrain.heightAt(cluster.cx, cluster.cz) + 10, cluster.cz).project(controls.camera);
          const x = (projected.x * 0.5 + 0.5) * width;
          const y = (-projected.y * 0.5 + 0.5) * height;
          const visible = projected.z < 1 && x > 35 && x < width - 35 && y > 85 && y < height - 35;
          label.style.display = visible ? 'flex' : 'none';
          if (visible) { label.style.left = `${x}px`; label.style.top = `${y}px`; }
        }
      }

      function resize() {
        const width = Math.max(sceneRoot.clientWidth, 1), height = Math.max(sceneRoot.clientHeight, 1);
        renderer.setSize(width, height, false);
        controls.resize(width, height);
      }
      new ResizeObserver(resize).observe(sceneRoot);
      window.addEventListener('resize', resize);
      resize();

      function frame(now) {
        const delta = Math.min((now - lastFrame) / 1000, 0.05);
        lastFrame = now;
        controls.update(now);
        markers.update(delta, now);
        updateLabels();
        renderer.render(scene, controls.camera);
        requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
      loading.classList.add('hidden');
      PM.app = { scene, renderer, terrain, markers, connections, controls, panel, selectPaper, overview, data };
    } catch (error) {
      console.error(error);
      showError(error?.message || String(error));
    }
  }

  PM.start = start;
})(window.PM = window.PM || {});
