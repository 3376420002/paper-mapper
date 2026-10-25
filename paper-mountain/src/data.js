/* ⚠️ 在此替换你的真实子领域、论文和引用数据。其余代码不需要修改。
 * Edge [sourceId, targetId] 表示 source 引用了 target。
 * 本文件只有通用占位内容，没有真实论文或真实引用。
 */
(function (PM) {
  'use strict';
  const CLUSTERS = [
    { id: 'area-a', name: '子领域 A', subtitle: '占位研究方向', hue: 196, cx: -52, cz: -5, peak: 18, sigma: 32 },
    { id: 'area-b', name: '子领域 B', subtitle: '占位研究方向', hue: 38, cx: 52, cz: 6, peak: 22, sigma: 34 }
  ];

  const PAPERS = [
    { id: 'p-a1', title: '占位论文 A1', shortName: 'A1 · 高处论文', cluster: 'area-a', elevation: 80, status: 'frontier', citations: 0, venue: '示例会议', year: 2024, link: 'https://example.com/paper-a1', basedOn: '待补充：核心思路与前置工作。', openProblem: '待补充：本文留下的研究问题。' },
    { id: 'p-a2', title: '占位论文 A2', shortName: 'A2 · 基线论文', cluster: 'area-a', elevation: 50, status: 'baseline', citations: 0, venue: '示例会议', year: 2022, link: '/papers/placeholder-a2.pdf', basedOn: '待补充：核心思路与前置工作。', openProblem: '待补充：本文留下的研究问题。' },
    { id: 'p-b1', title: '占位论文 B1', shortName: 'B1 · 高处论文', cluster: 'area-b', elevation: 90, status: 'frontier', citations: 0, venue: '示例期刊', year: 2025, link: '', basedOn: '待补充：核心思路与前置工作。', openProblem: '待补充：本文留下的研究问题。' },
    { id: 'p-b2', title: '占位论文 B2', shortName: 'B2 · 基线论文', cluster: 'area-b', elevation: 40, status: 'baseline', citations: 0, venue: '示例期刊', year: 2021, link: '', basedOn: '待补充：核心思路与前置工作。', openProblem: '待补充：本文留下的研究问题。' }
  ];

  const EDGES = [
    ['p-a1', 'p-a2'],
    ['p-b1', 'p-a1']
  ];

  PM.DATA = { CLUSTERS, PAPERS, EDGES };
})(window.PM = window.PM || {});
