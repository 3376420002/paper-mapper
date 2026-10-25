(function (PM) {
  'use strict';

  function createPaperModal(data, actions) {
    const dialog = document.getElementById('paperDialog');
    const form = document.getElementById('paperForm');
    const title = document.getElementById('paperTitle');
    const elevation = document.getElementById('elevationInput');
    const output = document.getElementById('elevationOutput');
    const clusterSelect = document.getElementById('clusterSelect');

    clusterSelect.innerHTML = data.CLUSTERS.map(cluster =>
      `<option value="${PM.escapeHtml(cluster.id)}">${PM.escapeHtml(cluster.name)}</option>`
    ).join('');

    document.getElementById('addButton').addEventListener('click', () => {
      dialog.showModal(); title.focus();
    });
    document.getElementById('closeDialog').addEventListener('click', () => dialog.close());
    document.getElementById('cancelDialog').addEventListener('click', () => dialog.close());
    dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
    elevation.addEventListener('input', () => { output.textContent = elevation.value; });

    form.addEventListener('submit', event => {
      event.preventDefault();
      const paperTitle = title.value.trim();
      if (!paperTitle) { title.focus(); return; }
      const cluster = data.CLUSTERS.find(item => item.id === clusterSelect.value) || data.CLUSTERS[0];
      const id = `p${Date.now()}`;
      const paper = {
        id,
        title: paperTitle,
        shortName: paperTitle.length > 25 ? `${paperTitle.slice(0, 25)}…` : paperTitle,
        cluster: cluster.id,
        elevation: Number(elevation.value),
        status: form.elements.status.value,
        citations: 0,
        venue: '新录入',
        year: new Date().getFullYear(),
        link: form.elements.link.value.trim(),
        basedOn: '待补充',
        openProblem: '待补充',
        layoutX: cluster.cx + (Math.random() * 2 - 1) * cluster.sigma * 0.25,
        layoutZ: cluster.cz + (Math.random() * 2 - 1) * cluster.sigma * 0.25
      };
      data.PAPERS.push(paper);
      dialog.close();
      form.reset();
      output.textContent = '65';
      actions.onAdd?.(paper);
    });

    return { open: () => dialog.showModal(), close: () => dialog.close() };
  }

  PM.createPaperModal = createPaperModal;
})(window.PM = window.PM || {});
