import { getState, setState } from '../core/state.js';
import { log } from '../core/log.js';
import { player, factionCities, factionArmies, armyTroopTotal } from '../core/utils.js';
import { SAVE_VERSION, DIFFICULTY } from '../config/constants.js';

function checkEliminations() {
  Object.values(getState().factions).forEach(f => {
    if (f.eliminated || f.id === getState().playerId) return;
    if (factionCities(f.id).length === 0) {
      // 失去所有城池即灭亡：残余军团兵力归零并清理，避免幽灵军团卡住武将
      getState().armies = getState().armies.filter(a => a.faction !== f.id);
      f.eliminated = true;
      f.ai = false;
      f.troops = 0;
      // 从所有势力的盟友列表中移除
      Object.values(getState().factions).forEach(o => { o.allies = o.allies.filter(a => a !== f.id); });
      log(`${f.name} 势力已彻底灭亡，退出群雄之争。`);
    }
  });
}

function checkVictory() {
  const p = player();
  const total = getState().cities.length;
  const mine = factionCities(getState().playerId).length;
  if (mine >= Math.ceil(total * 0.85)) { getState().gameOver = true; getState().winner = getState().playerId; getState().endingTitle = '统一天下：你赢得了胜利！'; log(getState().endingTitle); return; }
  // 灭亡判定：无城池且无可作战军团（含预备役+军团兵力）才判负
  const armyTotal = factionArmies(getState().playerId).reduce((s, a) => s + armyTroopTotal(a), 0);
  const allForces = p.troops + factionCities(getState().playerId).reduce((s, c) => s + c.troops, 0) + armyTotal;
  if ((mine === 0 && armyTotal === 0) || (mine === 0 && p.food <= 0 && p.gold <= 0 && allForces <= 0)) {
    getState().gameOver = true; getState().winner = null; getState().endingTitle = '你的势力覆灭了。'; log(getState().endingTitle);
  }
}

function saveAuto() {
  try { localStorage.setItem('sanguo_slg_autosave', JSON.stringify(serializeState())); } catch (e) { }
}

function saveGame() {
  try {
    localStorage.setItem('sanguo_slg_save', JSON.stringify(serializeState()));
    log('游戏已手动保存。');
  } catch (e) { log('保存失败：' + e.message); }
}

function exportEncryptedSave() {
  try {
    const payload = JSON.stringify(serializeState());
    const exportedAt = new Date().toISOString();
    const header = JSON.stringify({ v: SAVE_VERSION, exportedAt });
    const combined = btoa(header) + '|' + xorEncrypt(payload, exportedAt);
    const filename = `sanguo_save_${exportedAt.replace(/[:.]/g, '-')}.txt`;
    downloadText(combined, filename);
    log(`加密存档已导出：${filename}`);
    showExportModal(combined, header, filename);
  } catch (e) { log('导出失败：' + e.message); }
}

function importEncryptedSave(input) {
  try {
    const raw = (input || '').trim();
    if (!raw) { log('导入内容为空'); return false; }
    const parts = raw.split('|');
    if (parts.length !== 2) { log('导入格式错误'); return false; }
    const header = JSON.parse(atob(parts[0]));
    const decrypted = xorEncrypt(parts[1], header.exportedAt);
    const data = JSON.parse(decrypted);
    if (header.v !== SAVE_VERSION) { log(`存档版本 ${header.v} 与当前版本 ${SAVE_VERSION} 不匹配`); return false; }
    deserializeState(data);
    log(`存档已导入（版本 ${header.v}，导出时间 ${header.exportedAt}）`);
    return true;
  } catch (e) { log('导入失败：' + e.message); return false; }
}

function promptImportSave() {
  const raw = prompt('请粘贴加密存档内容（含版本号与导出时间的完整文本）：');
  if (raw) importEncryptedSave(raw);
}

function xorEncrypt(str, key) {
  let out = '';
  for (let i = 0; i < str.length; i++) {
    out += String.fromCharCode(str.charCodeAt(i) ^ key.charCodeAt(i % key.length));
  }
  return btoa(out);
}

function downloadText(text, filename) {
  const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; a.style.display = 'none';
  document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 1000);
}

function showExportModal(combined, headerJson, filename) {
  let header;
  try { header = JSON.parse(headerJson); } catch (e) { header = { v: SAVE_VERSION, exportedAt: '' }; }
  const content = document.getElementById('modal-content');
  const modal = document.getElementById('modal');
  if (!content || !modal) return;
  content.innerHTML = `
    <h2>导出加密存档</h2>
    <p class="hint">版本号：${header.v} · 导出时间：${header.exportedAt}</p>
    <p class="hint">文件 ${filename} 已自动下载，也可复制下方内容保存：</p>
    <textarea class="save-code-box" readonly onclick="this.select()">${combined}</textarea>
    <div style="margin-top:12px">
      <button class="action" onclick="window.closeModal()">关闭</button>
    </div>`;
  modal.style.display = 'flex';
}

function loadGame() {
  try {
    const data = localStorage.getItem('sanguo_slg_save') || localStorage.getItem('sanguo_slg_autosave');
    if (!data) { log('没有存档。'); return false; }
    deserializeState(JSON.parse(data));
    log('游戏已读取。');
    return true;
  } catch (e) { log('读档失败：' + e.message); return false; }
}

function serializeState() {
  return JSON.parse(JSON.stringify(getState()));
}

function deserializeState(data) {
  setState(data);
  const state = getState();
  if (!state.nextArmyId) state.nextArmyId = (state.armies || []).reduce((m, a) => Math.max(m, a.id || 0), 0) + 1;
  if (!state.armies) state.armies = [];
  // Rebuild faction list if huangjin exists
  if (!state.factions.huangjin && state.cities.some(c => c.owner === 'huangjin')) {
    state.factions.huangjin = { id: 'huangjin', name: '黄巾军', color: '#d4af37', leader: '张角', personality: 'expansion', ai: true, food: 500, gold: 200, troops: 0, morale: 60, allies: [] };
  }
  // 兼容旧存档：补齐 eliminated 标志与 allies 数组
  Object.values(state.factions).forEach(f => {
    if (f.eliminated === undefined) f.eliminated = false;
    if (!Array.isArray(f.allies)) f.allies = [];
  });
  // Ensure relations matrix covers all factions
  const ids = Object.keys(state.factions);
  ids.forEach(a => {
    if (!state.relations[a]) state.relations[a] = {};
    ids.forEach(b => {
      if (state.relations[a][b] === undefined) state.relations[a][b] = a === b ? 100 : 20;
    });
  });
  // 兼容旧存档：补齐可能缺失的字段，避免读档即崩
  if (!state.tech || state.tech.farmBonus !== undefined) {
    // 旧格式 tech: {farmBonus, commBonus, recruitBonus}
    const fb = state.tech ? state.tech.farmBonus || 0 : 0;
    const cb = state.tech ? state.tech.commBonus || 0 : 0;
    const rb = state.tech ? state.tech.recruitBonus || 0 : 0;
    state.tech = {
      farm: { level: Math.min(5, Math.floor(fb / 10)), max: 5, farmBonus: fb },
      comm: { level: Math.min(5, Math.floor(cb / 8)), max: 5, commBonus: cb },
      military: { level: Math.min(5, Math.floor(rb / 30)), max: 5, recruitBonus: rb, atkBonus: 0 },
      fort: { level: 0, max: 5, defBonus: 0 }
    };
  }
  if (!state.policy) state.policy = null;
  if (!state.eventsTriggered) state.eventsTriggered = {};
  if (!Array.isArray(state.pendingEvents)) state.pendingEvents = [];
  if (!Array.isArray(state.eventHistory)) state.eventHistory = [];
  if (!state.eventIdSeq) state.eventIdSeq = (state.pendingEvents.length + state.eventHistory.length) + 1;
  if (state.yellowTurban === undefined) state.yellowTurban = false;
  if (!Array.isArray(state.logs)) state.logs = [];
  if (!state.gameOver) state.gameOver = false;
  if (state.tutorial === undefined) state.tutorial = false;
  if (!state.shownTips) state.shownTips = {};
  if (!state.achievements) state.achievements = {};
  if (!state.stats) state.stats = { wins: 0, battles: 0, generalsDefeated: 0, citiesLost: 0, eventsResolved: 0 };
  if (!state.eventChains) state.eventChains = {};
  if (state.tutorialStep === undefined) state.tutorialStep = 0;
  if (state.endingTitle === undefined) state.endingTitle = null;
  if (!state.difficulty || !DIFFICULTY[state.difficulty]) state.difficulty = 'normal';
  // 兼容旧武将：补齐经验、等级、装备
  state.generals.forEach(g => {
    if (g.exp === undefined) g.exp = 0;
    if (g.level === undefined) g.level = 1;
    if (!g.equipment) g.equipment = { weapon: null, armor: null, horse: null };
  });
  // 兼容旧军团：补齐阵型
  (state.armies || []).forEach(a => {
    if (!a.formation) a.formation = 'yulin';
  });
}

export {
  checkEliminations, checkVictory, saveAuto, serializeState, deserializeState,
  xorEncrypt, downloadText, showExportModal,
  saveGame, exportEncryptedSave, importEncryptedSave, promptImportSave, loadGame
};
