import { getState } from '../../core/state.js';
import { QUESTS } from '../../config/quests.js';

function renderQuests(c) {
  const state = getState();
  const quests = state.quests || {};
  let html = `<div class="card"><h3>任务</h3><p>完成任务可获得金钱、粮食、兵力或装备奖励。</p></div>`;

  const completedIds = new Set(Object.keys(quests));
  const active = QUESTS.filter(q => !completedIds.has(q.id));
  const done = QUESTS.filter(q => completedIds.has(q.id));

  if (active.length) {
    html += `<div class="card"><h3>进行中 (${active.length})</h3><table><tr><th>任务</th><th>描述</th></tr>`;
    active.forEach(q => {
      html += `<tr><td><b>${q.name}</b></td><td>${q.desc}</td></tr>`;
    });
    html += `</table></div>`;
  }

  if (done.length) {
    html += `<div class="card"><h3>已完成 (${done.length})</h3><table><tr><th>任务</th><th>完成时间</th></tr>`;
    done.forEach(q => {
      const meta = quests[q.id];
      const time = meta && meta.completedAt ? `${meta.completedAt.year}年${meta.completedAt.month}月` : '-';
      html += `<tr><td><b style="color:#1a5c1a">${q.name}</b></td><td>${time}</td></tr>`;
    });
    html += `</table></div>`;
  }

  c.innerHTML = html;
}

export { renderQuests };
