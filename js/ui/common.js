import { getState, getSelectedTab, setSelectedTab } from '../core/state.js';
import { log } from '../core/log.js';
import { getSeason, player, factionArmies, factionCities } from '../core/utils.js';
import { showToast, flashResources } from './toast.js';

const ICON = '../assets';

// Nav icon mapping
const NAV_ICONS = {
  internal: `${ICON}/icons/nav-split/nav-internal.png`,
  military: `${ICON}/icons/nav-split/nav-military.png`,
  talent: `${ICON}/icons/nav-split/nav-talent.png`,
  diplomacy: `${ICON}/icons/nav-split/nav-diplomacy.png`,
  map: `${ICON}/icons/nav-split/nav-map.png`,
  events: `${ICON}/icons/nav-split/nav-events.png`,
  achievements: `${ICON}/icons/nav-split/nav-achievements.png`,
  quests: `${ICON}/icons/nav-split/nav-quests.png`,
  logs: `${ICON}/icons/nav-split/nav-logs.png`,
};

// Resource icon mapping
const RES_ICONS = {
  food: `${ICON}/icons/split/res-food.png`,
  gold: `${ICON}/icons/split/res-gold.png`,
  troops: `${ICON}/icons/split/res-troops.png`,
  morale: `${ICON}/icons/split/res-morale.png`,
};

// Season icon mapping
const SEASON_ICONS = {
  '春': `${ICON}/seasons/split/season-spring.png`,
  '夏': `${ICON}/seasons/split/season-summer.png`,
  '秋': `${ICON}/seasons/split/season-autumn.png`,
  '冬': `${ICON}/seasons/split/season-winter.png`,
};

const SEASON_CLASSES = { '春': 'season-spring', '夏': 'season-summer', '秋': 'season-autumn', '冬': 'season-winter' };

// Battle FX sprite mapping
const FX_SPRITES = {
  slash: `${ICON}/battle/split/fx-slash.png`,
  fire: `${ICON}/battle/split/fx-fire.png`,
  water: `${ICON}/battle/split/fx-water.png`,
  arrow: `${ICON}/battle/split/fx-arrow.png`,
};

const FX_ANIM_CLASSES = {
  slash: 'fx-anim-slash',
  fire: 'fx-anim-fire',
  water: 'fx-anim-water',
  arrow: 'fx-anim-arrow',
};

const FX_SIZE_CLASSES = {
  slash: 'fx-sprite-slash',
  fire: 'fx-sprite-fire',
  water: 'fx-sprite-water',
  arrow: 'fx-sprite-arrow',
};

let renderContentFn = null;

function setRenderContent(fn) {
  renderContentFn = fn;
}

function renderLogs() {
  const state = getState();
  const el = document.getElementById('logs');
  if (!el) return;
  el.innerHTML = state.logs.slice(0, 20).map(m => {
    // Auto-classify log type by content
    let cls = 'log-info';
    if (/获得|增加|\+\d|招兵|招募|加入/.test(m)) cls = 'log-gain';
    else if (/损失|减少|失败|覆灭|受伤|死亡/.test(m)) cls = 'log-loss';
    else if (/战斗|进攻|攻占|出征|胜利/.test(m)) cls = 'log-battle';
    else if (/事件|选择/.test(m)) cls = 'log-event';
    return `<div class="log-entry ${cls}">${m}</div>`;
  }).join('');
}

function renderHeader() {
  const state = getState();
  const p = player();
  if (!p) return;
  const season = getSeason();
  const seasonIcon = SEASON_ICONS[season] || SEASON_ICONS['春'];
  const seasonCls = SEASON_CLASSES[season] || 'season-spring';

  const hRes = document.getElementById('h-res');
  const hDate = document.getElementById('h-date');
  const hSeason = document.getElementById('h-season');

  if (hRes) hRes.innerHTML = `
    <span class="res-item" title="粮食"><img class="res-icon" src="${RES_ICONS.food}" alt="粮">粮食:${Math.floor(p.food)}</span>
    <span class="res-item" title="金钱"><img class="res-icon" src="${RES_ICONS.gold}" alt="金">金钱:${Math.floor(p.gold)}</span>
    <span class="res-item" title="兵力"><img class="res-icon" src="${RES_ICONS.troops}" alt="兵">兵力:${Math.floor(p.troops)}</span>
    <span class="res-item" title="士气"><img class="res-icon" src="${RES_ICONS.morale}" alt="气">士气:${Math.floor(p.morale)}</span>`;

  if (hDate) hDate.innerHTML = `<span class="top-date">第${state.year}年 ${state.month}月 第${state.turn}回合</span>`;

  if (hSeason) hSeason.innerHTML = `<span class="season-badge ${seasonCls}"><img class="season-icon" src="${seasonIcon}" alt="${season}">${season}</span>`;
}

function renderSidebar() {
  const state = getState();
  const tabs = [
    { id: 'internal', label: '内政' },
    { id: 'military', label: '军事' },
    { id: 'talent', label: '人才' },
    { id: 'diplomacy', label: '外交' },
    { id: 'map', label: '地图' },
    { id: 'events', label: '事件' },
    { id: 'achievements', label: '成就' },
    { id: 'quests', label: '任务' },
    { id: 'logs', label: '日志' }
  ];
  const pendingCount = state.pendingEvents.filter(e => e.factionId === state.playerId).length;
  const selectedTab = getSelectedTab();
  const sb = document.getElementById('sidebar');
  if (!sb) return;
  const disabled = state.gameOver ? 'disabled' : '';

  sb.innerHTML =
    `<div class="nav-section">功能</div>` +
    tabs.map(t => {
      let badge = '';
      if (t.id === 'events' && pendingCount > 0) badge = `<span class="badge">${pendingCount}</span>`;
      const iconSrc = NAV_ICONS[t.id] || '';
      return `<button class="${selectedTab === t.id ? 'active' : ''}" onclick="appActions.switchTab('${t.id}')" ${disabled}>
        <img class="nav-icon-img" src="${iconSrc}" alt="">${t.label}${badge}
      </button>`;
    }).join('') +
    `<hr>` +
    `<div class="nav-section">存档</div>` +
    `<button onclick="appActions.saveGame()" ${disabled}><img class="nav-icon-img" src="${ICON}/icons/action-split/act-save.png" alt="">保存游戏</button>` +
    `<button onclick="appActions.exportEncryptedSave()" ${disabled}><img class="nav-icon-img" src="${ICON}/icons/action-split/act-export.png" alt="">导出存档</button>` +
    `<button onclick="appActions.promptImportSave()" ${disabled}><img class="nav-icon-img" src="${ICON}/icons/action-split/act-import.png" alt="">导入存档</button>` +
    `<button onclick="appActions.loadGame()"><img class="nav-icon-img" src="${ICON}/icons/action-split/act-save.png" alt="">读取游戏</button>` +
    `<button class="btn-end-turn" onclick="appActions.nextTurn()" style="background:var(--accent-green);color:#fff;border-color:var(--accent-green);margin-top:4px" ${disabled}>
      <img class="nav-icon-img" src="${ICON}/icons/action-split/act-nextturn.png" alt="">结束回合
    </button>`;
}

function switchTab(id) {
  setSelectedTab(id);
  if (renderContentFn) renderContentFn();
  renderSidebar();
  // Add fade-in to content
  const c = document.getElementById('content');
  if (c) { c.classList.remove('fade-in'); void c.offsetWidth; c.classList.add('fade-in'); }
}

function renderAll() {
  renderHeader();
  renderSidebar();
  if (renderContentFn) renderContentFn();
  renderLogs();
  flashResources();
}

function closeModal() {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modal-content');
  if (modal) { modal.classList.remove('open'); modal.style.display = 'none'; }
  if (content) content.innerHTML = '';
}

function showModal() {
  const modal = document.getElementById('modal');
  if (modal) { modal.style.display = 'flex'; modal.classList.add('open'); }
}

function showBattleReport(r) {
  const content = document.getElementById('modal-content');
  if (!content) return;
  const resultColor = r.victory ? 'var(--accent-green)' : 'var(--accent-red)';
  const resultText = r.victory ? '胜利' : '失败';
  content.innerHTML = `
    <h2>战斗结算 · ${r.cityName}</h2>
    <div style="margin:8px 0"><b style="color:${resultColor};font-size:1.1rem">${resultText}</b> · 战术：${r.tacticName}</div>
    <div style="margin:8px 0">攻方：${r.attacker} · ${r.armyName}（主将 ${r.mainGeneral}）</div>
    <div style="margin:8px 0">守方：${r.defender}</div>
    <div style="margin:8px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div style="padding:10px;border:1px solid rgba(139,69,19,0.3);border-radius:6px;text-align:center">
        <div style="font-size:0.8rem;color:var(--muted)">攻方损失</div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--accent-red)">${r.atkLosses}</div>
      </div>
      <div style="padding:10px;border:1px solid rgba(139,69,19,0.3);border-radius:6px;text-align:center">
        <div style="font-size:0.8rem;color:var(--muted)">守方损失</div>
        <div style="font-size:1.2rem;font-weight:700;color:var(--accent-red)">${r.defLosses}</div>
      </div>
    </div>
    ${r.bonds && r.bonds.length ? `<div style="margin:8px 0"><b>羁绊触发：</b>${r.bonds.join('、')}</div>` : ''}
    ${r.reward ? `<div style="margin:8px 0">获得金钱：<b style="color:var(--accent-green)">${r.reward}</b></div>` : ''}
    ${r.equipment ? `<div style="margin:8px 0">缴获装备：<b style="color:var(--accent-purple)">${r.equipment}</b></div>` : ''}
    <div style="margin-top:14px"><button class="action btn-primary" onclick="appActions.closeModal()">关闭</button></div>`;
  showModal();
}

function currentGoal() {
  const state = getState();
  const cities = factionCities(state.playerId).length;
  const total = state.cities.length;
  const myArmies = factionArmies(state.playerId).length;
  if (cities <= 2 && myArmies === 0) return '目标：组建第一支军团，然后出征攻取相邻城池。';
  if (cities < 5) return '目标：攻占更多城池，扩大势力范围。';
  if (cities < Math.ceil(total * 0.5)) return '目标：继续扩张，削弱强敌。';
  return `目标：一统天下！还需占领 ${Math.ceil(total * 0.85) - cities} 座城池。`;
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
    quests: '提示：完成任务可获得金钱、粮食、兵力或装备奖励。',
    logs: '提示：这里显示完整的事件历史。'
  };
  return tips[tab] || '';
}

/**
 * Show battle FX with image sprites.
 * @param {string} text - Victory/defeat text
 * @param {string} cls - CSS class ('defeat' for loss)
 * @param {string} fxType - 'slash' | 'fire' | 'water' | 'arrow'
 */
function showBattleFx(text, cls, fxType) {
  const fx = document.getElementById('battle-fx');
  if (!fx) return;

  // Determine FX type from text content if not specified
  let type = fxType || 'slash';
  if (!fxType) {
    if (/火攻|火/.test(text)) type = 'fire';
    else if (/水战|水/.test(text)) type = 'water';
    else if (/箭|弓/.test(text)) type = 'arrow';
  }

  const spriteSrc = FX_SPRITES[type] || FX_SPRITES.slash;
  const animCls = FX_ANIM_CLASSES[type] || FX_ANIM_CLASSES.slash;
  const sizeCls = FX_SIZE_CLASSES[type] || FX_SIZE_CLASSES.slash;

  fx.innerHTML = `
    <div class="fx-sprite-wrap ${animCls}">
      <img class="fx-sprite ${sizeCls}" src="${spriteSrc}" alt="">
    </div>
    <div class="fx-text ${cls || ''}">${text}</div>
  `;

  fx.classList.add('active');
  document.body.classList.add('battle-shake');
  setTimeout(() => {
    fx.classList.remove('active');
    document.body.classList.remove('battle-shake');
  }, 750);
}

export {
  setRenderContent,
  renderLogs, renderHeader, renderSidebar, switchTab, closeModal, showModal,
  currentGoal, tabTip, showBattleFx, showBattleReport,
  renderAll,
  NAV_ICONS, RES_ICONS, SEASON_ICONS, FX_SPRITES
};
