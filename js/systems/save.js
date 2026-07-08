import { getState, setState, DEFAULT_TECH } from '../core/state.js';
import { log, setLogState } from '../core/log.js';
import { SAVE_VERSION, DIFFICULTY } from '../config/constants.js';
import { EQUIPMENT_POOL } from '../config/equipment.js';

const LOCAL_SAVE_KEY = 'sanguo_slg_save';
const LOCAL_AUTOSAVE_KEY = 'sanguo_slg_autosave';

function saveAuto() {
  try {
    const data = JSON.stringify({ _version: SAVE_VERSION, state: serializeState() });
    localStorage.setItem(LOCAL_AUTOSAVE_KEY, data);
  } catch (e) { log('自动保存失败：' + e.message); }
}

function saveGame() {
  try {
    const data = JSON.stringify({ _version: SAVE_VERSION, state: serializeState() });
    localStorage.setItem(LOCAL_SAVE_KEY, data);
    log('游戏已手动保存。');
  } catch (e) { log('保存失败：' + e.message); }
}

function exportEncryptedSave() {
  try {
    const payload = JSON.stringify(serializeState());
    const exportedAt = new Date().toISOString();
    const header = JSON.stringify({ v: SAVE_VERSION, exportedAt });
    const combined = utf8ToBase64(header) + '|' + xorEncrypt(payload, exportedAt);
    const filename = `sanguo_save_${exportedAt.replace(/[:.]/g, '-')}.txt`;
    downloadText(combined, filename);
    log(`加密存档已导出：${filename}`);
    showExportModal(combined, header, filename);
  } catch (e) { log('导出失败：' + e.message); }
}

function utf8ToBase64(str) {
  try {
    const bytes = new TextEncoder().encode(str);
    let binary = '';
    bytes.forEach(b => binary += String.fromCharCode(b));
    return btoa(binary);
  } catch (e) { return btoa(unescape(encodeURIComponent(str))); }
}

function base64ToUtf8(b64) {
  try {
    const binary = atob(b64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return new TextDecoder().decode(bytes);
  } catch (e) { return decodeURIComponent(escape(atob(b64))); }
}

function importEncryptedSave(input) {
  try {
    const raw = (input || '').trim();
    if (!raw) { log('导入内容为空'); return false; }
    const parts = raw.split('|');
    if (parts.length !== 2) { log('导入格式错误'); return false; }
    const header = JSON.parse(base64ToUtf8(parts[0]));
    const decrypted = xorDecrypt(parts[1], header.exportedAt);
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
  const strBytes = new TextEncoder().encode(str);
  const keyBytes = new TextEncoder().encode(key);
  const out = new Uint8Array(strBytes.length);
  for (let i = 0; i < strBytes.length; i++) {
    out[i] = strBytes[i] ^ keyBytes[i % keyBytes.length];
  }
  let binary = '';
  out.forEach(b => binary += String.fromCharCode(b));
  return btoa(binary);
}

function xorDecrypt(b64, key) {
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  const keyBytes = new TextEncoder().encode(key);
  const out = new Uint8Array(bytes.length);
  for (let i = 0; i < bytes.length; i++) {
    out[i] = bytes[i] ^ keyBytes[i % keyBytes.length];
  }
  return new TextDecoder().decode(out);
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
      <button class="action" onclick="appActions.closeModal()">关闭</button>
    </div>`;
  modal.style.display = 'flex';
}

function loadGame() {
  try {
    const raw = localStorage.getItem(LOCAL_SAVE_KEY) || localStorage.getItem(LOCAL_AUTOSAVE_KEY);
    if (!raw) { log('没有存档。'); return false; }
    const parsed = JSON.parse(raw);
    const data = parsed._version ? parsed.state : parsed;
    deserializeState(data);
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
    state.factions.huangjin = { id: 'huangjin', name: '黄巾军', color: '#d4af37', leader: '张角', personality: 'expansion', ai: true, food: 500, gold: 200, troops: 0, morale: 60, allies: [], tech: JSON.parse(JSON.stringify(DEFAULT_TECH)) };
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
  // 迁移全局科技到玩家势力，并确保每个势力都有独立科技副本
  const playerHadTech = !!(state.factions[state.playerId] && state.factions[state.playerId].tech);
  Object.values(state.factions).forEach(f => {
    if (!f.tech) f.tech = JSON.parse(JSON.stringify(state.tech || DEFAULT_TECH));
  });
  if (state.tech && state.factions[state.playerId] && !playerHadTech) {
    state.factions[state.playerId].tech = JSON.parse(JSON.stringify(state.tech));
  }
  // 全局科技仅作为回退模板保留，不再参与游戏逻辑
  state.tech = JSON.parse(JSON.stringify(DEFAULT_TECH));
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
  // 兼容旧军团：补齐阵型、兵种经验与等级
  (state.armies || []).forEach(a => {
    if (!a.formation) a.formation = 'yulin';
    if (!a.troopXP) a.troopXP = { infantry: 0, cavalry: 0, archer: 0 };
    if (!a.troopLevel) a.troopLevel = { infantry: 1, cavalry: 1, archer: 1 };
  });
  // 兼容旧存档：将全局政策迁移到玩家势力对象
  if (state.policy && state.factions[state.playerId]) {
    state.factions[state.playerId].policy = state.policy;
  }
  // 兼容旧存档：补齐装备池；读档时重建武将装备引用，避免副本漂移
  if (!state.equipmentPool) {
    state.equipmentPool = JSON.parse(JSON.stringify(EQUIPMENT_POOL));
  }
  const poolByName = new Map(state.equipmentPool.map(it => [it.name, it]));
  state.generals.forEach(g => {
    if (!g.equipment) g.equipment = { weapon: null, armor: null, horse: null };
    ['weapon', 'armor', 'horse'].forEach(slot => {
      const old = g.equipment[slot];
      if (!old) return;
      const live = poolByName.get(old.name);
      if (live) {
        g.equipment[slot] = live;
        live.owned = false;
      } else {
        g.equipment[slot] = null;
      }
    });
  });
  // 同步日志模块的 state 引用，避免读档后日志写入旧对象
  setLogState(state);
}

export {
  saveAuto, serializeState, deserializeState,
  xorEncrypt, downloadText, showExportModal,
  saveGame, exportEncryptedSave, importEncryptedSave, promptImportSave, loadGame
};
