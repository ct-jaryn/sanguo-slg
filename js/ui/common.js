import { getState, getSelectedTab, setSelectedTab } from '../core/state.js';
import { log } from '../core/log.js';
import { getSeason, player, factionArmies, factionCities } from '../core/utils.js';

let renderContentFn = null;

function setRenderContent(fn) {
  renderContentFn = fn;
}

function renderLogs() {
  const state = getState();
  const el = document.getElementById('logs');
  if (!el) return;
  el.innerHTML = state.logs.slice(0,20).map(m=>`<div class="log-entry">${m}</div>`).join('');
}

function renderHeader() {
  const state = getState();
  const p = player();
  const hRes = document.getElementById('h-res');
  const hDate = document.getElementById('h-date');
  const hSeason = document.getElementById('h-season');
  if (hRes) hRes.innerHTML = `
    <span class="res-item" style="color:#1a5c1a">粮食:${Math.floor(p.food)}</span>
    <span class="res-item" style="color:#b8860b">金钱:${Math.floor(p.gold)}</span>
    <span class="res-item" style="color:#c41e3a">兵力:${Math.floor(p.troops)}</span>
    <span class="res-item">士气:${Math.floor(p.morale)}</span>`;
  if (hDate) hDate.innerText = `第${state.year}年 ${state.month}月 第${state.turn}回合`;
  if (hSeason) hSeason.innerHTML = `季节:<b>${getSeason()}</b>`;
}

function renderSidebar() {
  const state = getState();
  const tabs = [
    {id:'internal',label:'内政'},
    {id:'military',label:'军事'},
    {id:'talent',label:'人才'},
    {id:'diplomacy',label:'外交'},
    {id:'map',label:'地图'},
    {id:'events',label:'事件'},
    {id:'achievements',label:'成就'},
    {id:'logs',label:'日志'}
  ];
  const pendingCount = state.pendingEvents.filter(e=>e.factionId===state.playerId).length;
  const selectedTab = getSelectedTab();
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  sb.innerHTML = tabs.map(t=>{
    let badge = '';
    if(t.id==='events' && pendingCount>0) badge = ` <span style="background:var(--accent-red);color:#fff;border-radius:50%;padding:2px 6px;font-size:0.7rem">${pendingCount}</span>`;
    return `<button class="${selectedTab===t.id?'active':''}" onclick="window.switchTab('${t.id}')">${t.label}${badge}</button>`;
  }).join('') +
    `<hr style="width:100%;border-color:var(--border)">` +
    `<button onclick="window.saveGame()">保存游戏</button>` +
    `<button onclick="window.exportEncryptedSave()">导出加密存档</button>` +
    `<button onclick="window.promptImportSave()">导入加密存档</button>` +
    `<button onclick="window.loadGame()">读取游戏</button>` +
    `<button onclick="window.nextTurn()" style="background:var(--accent-green);color:#fff;border-color:var(--accent-green)">结束回合</button>`;
}

function switchTab(id) {
  setSelectedTab(id);
  if (renderContentFn) renderContentFn();
  renderSidebar();
}

function renderAll() {
  renderHeader();
  renderSidebar();
  if (renderContentFn) renderContentFn();
  renderLogs();
}

function closeModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modal-content');
  if (modal) modal.style.display = 'none';
  if (content) content.innerHTML = '';
}

function showBattleReport(r) {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;
  const resultColor = r.victory ? 'var(--accent-green)' : 'var(--accent-red)';
  const resultText = r.victory ? '胜利' : '失败';
  content.innerHTML = `
    <h2>战斗结算 · ${r.cityName}</h2>
    <div style="margin:8px 0"><b style="color:${resultColor}">${resultText}</b> · 战术：${r.tacticName}</div>
    <div style="margin:8px 0">攻方：${r.attacker} · ${r.armyName}（主将 ${r.mainGeneral}）</div>
    <div style="margin:8px 0">守方：${r.defender}</div>
    <div style="margin:8px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div style="padding:8px;border:1px solid var(--border);border-radius:4px">攻方损失<br/><b>${r.atkLosses}</b></div>
      <div style="padding:8px;border:1px solid var(--border);border-radius:4px">守方损失<br/><b>${r.defLosses}</b></div>
    </div>
    ${r.bonds && r.bonds.length ? `<div style="margin:8px 0"><b>羁绊触发：</b>${r.bonds.join('、')}</div>` : ''}
    ${r.reward ? `<div style="margin:8px 0">获得金钱：<b>${r.reward}</b></div>` : ''}
    ${r.equipment ? `<div style="margin:8px 0">缴获装备：<b>${r.equipment}</b></div>` : ''}
    <div style="margin-top:12px"><button class="action" onclick="window.closeModal()">关闭</button></div>`;
  modal.style.display = 'flex';
}

function currentGoal() {
  const state = getState();
  const cities = factionCities(state.playerId).length;
  const total = state.cities.length;
  const myArmies = factionArmies(state.playerId).length;
  if (cities <= 2 && myArmies === 0) return '目标：组建第一支军团，然后出征攻取相邻城池。';
  if (cities < 5) return '目标：攻占更多城池，扩大势力范围。';
  if (cities < Math.ceil(total * 0.5)) return '目标：继续扩张，削弱强敌。';
  return `目标：一统天下！还需占领 ${Math.ceil(total*0.85) - cities} 座城池。`;
}

function tabTip(tab) {
  const tips = {
    internal: '提示：优先升级农业/商业科技，选择合适的政策可大幅提升国力。',
    military: '提示：围城适合消耗坚城，火攻需智力75+主将，水战在临江/南方城池生效。',
    talent: '提示：武将战斗获得经验升级，装备商店和战斗胜利可获得装备。',
    diplomacy: '提示：与强敌结盟争取发展时间，对弱敌可宣战扩张。',
    map: '提示：点击地图上的城池可快速切换到军事面板。',
    events: '提示：及时处理事件，选择最适合当前局势的选项。',
    achievements: '提示：完成成就可获得称号展示，部分成就需要长期经营。',
    logs: '提示：这里显示完整的事件历史。'
  };
  return tips[tab] || '';
}

function showBattleFx(text, cls) {
  const fx = document.getElementById('battle-fx');
  if (!fx) return;
  fx.innerHTML = `<div class="fx-text ${cls || ''}">${text}</div>`;
  fx.classList.add('active');
  document.body.classList.add('battle-shake');
  setTimeout(() => { fx.classList.remove('active'); document.body.classList.remove('battle-shake'); }, 650);
}

export {
  setRenderContent,
  renderLogs, renderHeader, renderSidebar, switchTab, closeModal,
  currentGoal, tabTip, showBattleFx, showBattleReport,
  renderAll
};
