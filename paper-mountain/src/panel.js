(function (PM) {
  'use strict';

  const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[char]);
  const clusterColor = cluster => `hsl(${Number(cluster.hue) || 0} 58% 70%)`;

  function renderLink(link) {
    const value = String(link || '').trim();
    if (!value) return '<span class="link-row">— 未提供原文链接</span>';
    if (/^https?:\/\//i.test(value)) {
      try {
        const url = new URL(value);
        let label = `${url.hostname} ↗`;
        if (url.hostname.includes('arxiv.org') && url.pathname.includes('/abs/')) label = `arXiv: ${url.pathname.split('/abs/')[1]} ↗`;
        else if (url.hostname.includes('openreview.net')) label = 'OpenReview ↗';
        else if (url.hostname.includes('github.com')) label = 'GitHub ↗';
        return `<span class="link-row"><a href="${escapeHtml(url.href)}" target="_blank" rel="noopener noreferrer">${escapeHtml(label)}</a></span>`;
      } catch (_) { return '<span class="link-row">— 链接格式无效</span>'; }
    }
    if (value.startsWith('/') || value.startsWith('file://') || /^[A-Za-z]:[\\/]/.test(value)) {
      return `<span class="link-row">${escapeHtml(value)}<button type="button" class="copy-button" data-copy-path="${escapeHtml(value)}">复制路径</button></span>`;
    }
    return `<span class="link-row">${escapeHtml(value)}</span>`;
  }

  function createPanel(element, data, actions) {
    const { CLUSTERS, PAPERS, EDGES } = data;
    const byId = id => PAPERS.find(paper => paper.id === id);

    function overview() {
      const frontier = PAPERS.filter(paper => paper.status === 'frontier').length;
      const cards = CLUSTERS.map(cluster => {
        const local = PAPERS.filter(paper => paper.cluster === cluster.id);
        const highest = [...local].sort((a, b) => b.elevation - a.elevation)[0];
        return `<button type="button" class="cluster-card" data-cluster="${escapeHtml(cluster.id)}" style="--cluster-color:${clusterColor(cluster)}"><span class="cluster-card-header"><strong>${escapeHtml(cluster.name)}</strong><span class="badge">${local.length} 篇</span></span><small>${escapeHtml(cluster.subtitle)}</small><small class="highest">↑ ${highest ? escapeHtml(highest.shortName) : '暂无论文'}</small></button>`;
      }).join('');
      element.innerHTML = `<span class="panel-kicker">FIELD OVERVIEW</span><h2 class="panel-title">领域概览</h2><p class="panel-subtitle">距离反映引用关联。选择论文标记，查看它在山区的位置和前后引用。</p><div class="stat-grid"><div class="stat"><strong>${CLUSTERS.length}</strong><span>子领域</span></div><div class="stat"><strong>${PAPERS.length}</strong><span>论文</span></div><div class="stat"><strong>${frontier}</strong><span>前沿</span></div></div><div class="divider"></div><div class="section-head"><h3>研究分区</h3><small>${String(CLUSTERS.length).padStart(2, '0')} AREAS</small></div><div class="cluster-list">${cards}</div><div class="panel-footnote">此页面仅含通用占位数据。替换 <code>src/data.js</code> 后可载入其他研究领域。</div>`;
      element.scrollTop = 0;
    }

    function detail(paper) {
      const cluster = CLUSTERS.find(item => item.id === paper.cluster);
      const cited = EDGES.filter(edge => edge[0] === paper.id).map(edge => byId(edge[1])).filter(Boolean);
      const citedBy = EDGES.filter(edge => edge[1] === paper.id).map(edge => byId(edge[0])).filter(Boolean);
      const statusColor = PM.STATUS_COLORS[paper.status] || PM.STATUS_COLORS.baseline;
      const statusLabel = PM.STATUS_LABELS[paper.status] || paper.status;
      const citationRows = (papers, color) => papers.length
        ? papers.map(item => `<button type="button" class="citation-row" data-paper="${escapeHtml(item.id)}" style="--edge-color:${color}"><i></i>${escapeHtml(item.shortName)}</button>`).join('')
        : '<p class="citation-empty">— 暂无</p>';
      const altitude = Math.max(0, Math.min(100, Number(paper.elevation) || 0));
      element.innerHTML = `<button type="button" class="back-button" data-overview>← 返回领域概览</button><span class="panel-kicker">PAPER DETAIL / ${escapeHtml(paper.id)}</span><h2 class="panel-title">${escapeHtml(paper.title)}</h2><p class="detail-meta">${escapeHtml(paper.venue)} · ${escapeHtml(paper.year)} 年 · 被引 ${Number(paper.citations) || 0}</p><div class="meta"><span class="tag cluster" style="--cluster-color:${cluster ? clusterColor(cluster) : '#6ee7ff'}">${cluster ? escapeHtml(cluster.name) : '未分类'}</span><span class="tag status" style="--status-color:${statusColor}">${escapeHtml(statusLabel)}</span></div><div class="divider"></div><div class="altitude-head"><span>海拔</span><strong>${altitude}</strong></div><div class="altitude-track"><span style="width:${altitude}%"></span></div><div class="altitude-markers"><span>山脚</span><span>山腰</span><span>主峰</span></div><div class="divider"></div><div class="info-block"><h3>论文原文</h3>${renderLink(paper.link)}</div><div class="divider"></div><div class="info-block"><h3>核心思路 / 基于</h3><p>${escapeHtml(paper.basedOn)}</p></div><div class="divider"></div><div class="info-block"><h3>留下的问题</h3><p>${escapeHtml(paper.openProblem)}</p></div><div class="divider"></div><div class="citation-section"><h3>引用了 <span>${cited.length}</span></h3>${citationRows(cited, '#38bdf8')}</div><div class="citation-section"><h3>被引用 <span>${citedBy.length}</span></h3>${citationRows(citedBy, '#fbbf24')}</div>`;
      element.scrollTop = 0;
    }

    async function copyPath(button) {
      const path = button.dataset.copyPath;
      let copied = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(path);
          copied = true;
        }
      } catch (_) {}
      if (!copied) {
        const input = document.createElement('textarea');
        input.value = path;
        input.style.position = 'fixed'; input.style.left = '-9999px';
        document.body.appendChild(input); input.select();
        copied = document.execCommand('copy'); input.remove();
      }
      if (copied) {
        button.textContent = '已复制'; button.classList.add('copied');
        setTimeout(() => { button.textContent = '复制路径'; button.classList.remove('copied'); }, 1200);
      } else actions.onToast?.('复制失败，请手动复制路径');
    }

    element.addEventListener('click', event => {
      const button = event.target.closest('button');
      if (!button) return;
      if (button.hasAttribute('data-overview')) actions.onOverview?.();
      else if (button.dataset.paper) actions.onPaper?.(button.dataset.paper);
      else if (button.dataset.cluster) actions.onCluster?.(button.dataset.cluster);
      else if (button.hasAttribute('data-copy-path')) copyPath(button);
    });

    return { overview, detail };
  }

  PM.createPanel = createPanel;
  PM.escapeHtml = escapeHtml;
  PM.renderLink = renderLink;
})(window.PM = window.PM || {});
