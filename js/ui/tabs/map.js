import { getState } from '../../core/state.js';
import { findCity, factionCities } from '../../core/utils.js';
import { switchTab } from '../common.js';

function renderMap(c) {
  const state = getState();
  // Focused bounding box around playable area for 48 cities
  const mapBounds = { minX: 440, minY: 100, maxX: 2040, maxY: 1560 };
  const mapW = mapBounds.maxX - mapBounds.minX;
  const mapH = mapBounds.maxY - mapBounds.minY;
  function mapX(x) { return ((x - mapBounds.minX) / mapW) * 100; }
  function mapY(y) { return ((y - mapBounds.minY) / mapH) * 100; }

  // 连线（按城市名查邻居，坐标移动不影响连接关系）
  const linePairs = [];
  const drawn = new Set();
  state.cities.forEach(ct => {
    ct.neighbors.forEach(n => {
      const key = [ct.name, n].sort().join('-');
      if (drawn.has(key)) return;
      drawn.add(key);
      const t = findCity(n);
      if (!t) return;
      linePairs.push([ct.name, t.name]);
    });
  });

  // 先用原始坐标占位渲染，便于测量真实容器尺寸
  const nodesHtml = state.cities.map(ct => {
    const owner = ct.owner ? state.factions[ct.owner] : null;
    const ownerMark = owner ? ` [${owner.name.charAt(0)}]` : '';
    return `<div class="map-node" data-city="${ct.name}" style="left:${mapX(ct.x)}%;top:${mapY(ct.y)}%" onclick="window.switchTab('military')" title="${ct.name} 守军${Math.floor(ct.troops)}">
      <span class="n-name">${ct.name}${ownerMark}</span>
      <span class="n-troops">守:${Math.floor(ct.troops)} 民:${ct.morale}</span>
    </div>`;
  }).join('');
  const linesHtml = linePairs.map(() => `<line x1="0" y1="0" x2="0" y2="0" stroke="#a07c5a" stroke-width="2" stroke-linecap="round"/>`).join('');

  let html = `
    <div class="card">
      <h3>天下地图</h3>
      <div class="map-wrapper">
        <svg class="map-lines" preserveAspectRatio="none">
          ${linesHtml}
        </svg>
        <div class="map-region-label" style="left:52%;top:18%">北方</div>
        <div class="map-region-label" style="left:72%;top:42%">中原</div>
        <div class="map-region-label" style="left:62%;top:78%">南方</div>
        <div class="map-region-label" style="left:18%;top:72%">西蜀</div>
        ${nodesHtml}
      </div>
    </div>
    <div class="card"><h3>城池数据</h3>
    <table><tr><th>城池</th><th>区域</th><th>归属</th><th>守军</th><th>城防</th><th>粮食</th><th>金钱</th><th>民心</th></tr>
    ${state.cities.map(ct=>{
      const ownerFac = ct.owner ? state.factions[ct.owner] : null;
      const owner = ownerFac ? `<span class="faction-dot" style="background:${ownerFac.color}"></span>${ownerFac.name}` : '无主';
      return `<tr><td>${ct.name}</td><td>${ct.region}</td><td>${owner}</td><td>${Math.floor(ct.troops)}</td><td>${ct.defense}</td><td>${ct.food}</td><td>${ct.money}</td><td>${ct.morale}</td></tr>`;
    }).join('')}
    </table></div>
    <div class="card"><h3>势力图例</h3>
    ${Object.values(state.factions).filter(f=>!f.eliminated).map(f=>`<span style="margin-right:16px"><span class="faction-dot" style="background:${f.color}"></span>${f.name} · 城池${factionCities(f.id).length} · 兵力${Math.floor(f.troops)}</span>`).join('')}
    </div>`;
  c.innerHTML = html;

  // ---- 抗重叠：测量真实容器尺寸后在真实像素空间迭代推开重叠节点 ----
  const wrap = c.querySelector('.map-wrapper');
  const W = wrap.clientWidth || 900;
  const H = wrap.clientHeight || (W * 10 / 16);
  const NODE_HW = 30, NODE_HH = 17;   // 节点真实半宽/半高（含少量间距）
  const pts = {};
  state.cities.forEach(ct => {
    pts[ct.name] = { x: mapX(ct.x) * W / 100, y: mapY(ct.y) * H / 100 };
  });
  const names = Object.keys(pts);
  for (let iter = 0; iter < 120; iter++) {
    let moved = false;
    for (let i = 0; i < names.length; i++) {
      for (let j = i + 1; j < names.length; j++) {
        const a = pts[names[i]], b = pts[names[j]];
        const dx = b.x - a.x, dy = b.y - a.y;
        const ox = NODE_HW * 2 - Math.abs(dx);   // 水平重叠量
        const oy = NODE_HH * 2 - Math.abs(dy);   // 垂直重叠量
        if (ox > 0 && oy > 0) {
          moved = true;
          if (ox < oy) {                          // 沿重叠较小的轴推开
            const s = (dx >= 0 ? 1 : -1) * ox / 2;
            a.x -= s; b.x += s;
          } else {
            const s = (dy >= 0 ? 1 : -1) * oy / 2;
            a.y -= s; b.y += s;
          }
        }
      }
    }
    if (!moved) break;
  }
  // 夹到容器内并换算百分比
  const posPct = {};
  names.forEach(n => {
    const lx = Math.max(NODE_HW, Math.min(W - NODE_HW, pts[n].x)) / W * 100;
    const ty = Math.max(NODE_HH, Math.min(H - NODE_HH, pts[n].y)) / H * 100;
    posPct[n] = { left: lx, top: ty };
  });
  // 应用到节点
  state.cities.forEach(ct => {
    const el = wrap.querySelector(`[data-city="${ct.name}"]`);
    if (el) { el.style.left = posPct[ct.name].left + '%'; el.style.top = posPct[ct.name].top + '%'; }
  });
  // 应用到连线
  const lineEls = wrap.querySelectorAll('svg line');
  linePairs.forEach((pair, i) => {
    const el = lineEls[i];
    if (!el) return;
    const p1 = posPct[pair[0]], p2 = posPct[pair[1]];
    el.setAttribute('x1', p1.left + '%'); el.setAttribute('y1', p1.top + '%');
    el.setAttribute('x2', p2.left + '%'); el.setAttribute('y2', p2.top + '%');
  });
}

export { renderMap };
