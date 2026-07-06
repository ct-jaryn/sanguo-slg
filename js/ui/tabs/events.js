import { getState } from '../../core/state.js';
import { log } from '../../core/log.js';
import { ACHIEVEMENTS, initStats } from '../../systems/achievements.js';
import { resolveEvent, buildEventContext } from '../../systems/eventSystem.js';
import { EVENTS } from '../../config/events.js';
import { renderAll } from '../common.js';

function dismissTip(tab) {
  const state = getState();
  if (!state.shownTips) state.shownTips = {};
  state.shownTips[tab] = true;
  renderAll();
}

function renderAchievements(c) {
  const state = getState();
  initStats();
  if (!state.achievements) state.achievements = {};
  const unlocked = Object.keys(state.achievements).length;
  const total = ACHIEVEMENTS.length;
  c.innerHTML = `
    <div class="card"><h3>成就系统</h3>
    <p>已解锁 ${unlocked}/${total} 个成就</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px">
      ${ACHIEVEMENTS.map(ach => {
        const ok = !!state.achievements[ach.id];
        return `<div style="padding:12px;border:1px solid var(--border);border-radius:6px;background:${ok?'#f0fff0':'var(--bg)'};opacity:${ok?1:0.7}">
          <div style="font-weight:bold">${ok?'★ ':'☆ '}${ach.name}</div>
          <div style="font-size:0.85rem;color:var(--muted)">${ach.desc}</div>
          ${ok ? `<div style="font-size:0.75rem;color:var(--accent-green);margin-top:4px">${state.achievements[ach.id].unlockedAt.year}年${state.achievements[ach.id].unlockedAt.month}月解锁</div>` : ''}
        </div>`;
      }).join('')}
    </div></div>`;
}

function renderEvents(c) {
  const state = getState();
  const pending = state.pendingEvents.filter(e => e.factionId === state.playerId);
  let html = `<div class="card"><h3>待处理事件</h3>`;
  if (pending.length === 0) {
    html += `<p>当前没有待处理事件。</p>`;
  } else {
    pending.forEach(evt => {
      html += `<div style="margin:8px 0;padding:10px;border:1px solid var(--border);border-radius:6px;background:var(--bg)">
        <b>${evt.title}</b>
        <p style="margin:4px 0;color:var(--text)">${evt.desc}</p>
        <div>`;
      const ctx = buildEventContext(evt);
      evt.choices.forEach(ch => {
        const ok = !ch.condition || ch.condition(ctx);
        html += `<button class="action" onclick="window.resolvePlayerEvent(${evt.id},${ch.idx})" ${ok?'':'disabled'}>${ch.label}</button>`;
      });
      html += `</div></div>`;
    });
  }
  html += `</div>`;

  html += `<div class="card"><h3>事件历史</h3>`;
  if (state.eventHistory.length === 0) {
    html += `<p>暂无事件记录。</p>`;
  } else {
    html += `<table><tr><th>时间</th><th>事件</th><th>结果</th></tr>`;
    html += state.eventHistory.slice(0, 20).map(h =>
      `<tr><td>${h.year}年${h.month}月</td><td>${h.title}</td><td>${h.result || '—'}</td></tr>`
    ).join('');
    html += `</table>`;
  }
  html += `</div>`;
  c.innerHTML = html;
}

function renderLogPage(c) {
  const state = getState();
  c.innerHTML = `<div class="card"><h3>完整日志</h3>${state.logs.map(m=>`<div class="log-entry">${m}</div>`).join('')}</div>`;
}

function resolvePlayerEvent(eventId, choiceIdx) {
  const state = getState();
  const evt = state.pendingEvents.find(e => e.id === eventId);
  if (!evt || evt.factionId !== state.playerId) return;
  const ev = EVENTS.find(e => e.id === evt.defId);
  if (!ev) return;
  const ctx = buildEventContext(evt);
  const choice = ev.choices[choiceIdx];
  if (!choice) return;
  let result = '';
  if (choice.effect) result = choice.effect(ctx) || '';
  resolveEvent(evt, result);
  renderAll();
}

export { renderEvents, renderLogPage, renderAchievements, dismissTip, resolvePlayerEvent };
