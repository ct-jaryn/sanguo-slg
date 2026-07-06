import { getState } from '../../core/state.js';
import {
  log, player, factionGenerals, factionArmies, findGeneral, effectiveStats, equipNameList,
  removeGeneralFromArmies, generalExpToLevelUp
} from '../../core/utils.js';
import { EQUIPMENT_POOL, EQUIPMENT_TYPES } from '../../config/equipment.js';
import { BONDS } from '../../config/bonds.js';
import { SKILL_NAMES } from '../../config/skills.js';
import { renderAll } from '../renderer.js';
import { closeModal } from '../modal.js';

function renderTalent(c) {
  const state = getState();
  const p = player();
  const myGens = factionGenerals(state.playerId);
  const enemyGens = state.generals.filter(g => g.faction !== 'free' && g.faction !== state.playerId && g.loyalty < 30 && state.factions[g.faction] && !state.factions[g.faction].eliminated);
  const equippable = state.generals.filter(g => g.faction === state.playerId);
  c.innerHTML = `
    <div class="card"><h3>人才招募</h3>
    <button class="action" onclick="window.doInternal('search')" ${p.gold < 300 ? 'disabled' : ''}>寻访人才 (300金)</button>
    <button class="action" onclick="window.openEquipShop()" ${p.gold < 500 ? 'disabled' : ''}>装备商店 (500金)</button>
    <p>在野武将可通过寻访加入。敌方忠诚度低于30的武将可招降。武将战斗可获得经验升级。</p>
    </div>
    <div class="card"><h3>可招降武将</h3>
    ${enemyGens.length ? enemyGens.map(g => `<div style="margin:4px 0">${g.name} (${state.factions[g.faction].name}) 忠诚${g.loyalty} <button class="action" onclick="window.recruitGeneral('${g.name}')" ${p.gold < 500 ? 'disabled' : ''}>招降 (500金)</button></div>`).join('') : '<p>当前没有可招降武将</p>'}
    </div>
    <div class="card"><h3>武将羁绊</h3>
    <p>将羁绊武将编入同一军团可触发组合技加成。</p>
    ${(() => {
      const ownedNames = new Set(myGens.map(g => g.name));
      const activeInArmies = new Set();
      factionArmies(state.playerId).forEach(a => {
        BONDS.forEach(bond => {
          if (bond.members.filter(n => a.generals.includes(n)).length >= (bond.require || bond.members.length)) activeInArmies.add(bond.id);
        });
      });
      return BONDS.map(bond => {
        const owned = bond.members.filter(n => ownedNames.has(n)).length;
        const need = bond.require || bond.members.length;
        const active = activeInArmies.has(bond.id);
        const color = active ? 'var(--accent-green)' : (owned >= need ? 'var(--accent-orange)' : 'var(--muted)');
        return `<div style="margin:4px 0;padding:6px;border:1px solid var(--border);border-radius:4px;background:${active?'#f0fff0':'var(--bg)'};color:${color}">
          <b>${active ? '★ ' : ''}${bond.name}</b>（${bond.members.join(' / ')}）${active ? '已触发' : `${owned}/${need}`}<br/>
          <span style="font-size:0.8rem;color:var(--muted)">${bond.desc}</span>
        </div>`;
      }).join('');
    })()}
    </div>
    <div class="card"><h3>我方武将</h3>
    <table><tr><th>姓名</th><th>等级</th><th>经验</th><th>武力</th><th>智力</th><th>统率</th><th>政治</th><th>忠诚</th><th>特技</th><th>装备</th><th>状态</th></tr>
    ${myGens.map(g => {
      const st = effectiveStats(g);
      const equipStr = [g.equipment.weapon, g.equipment.armor, g.equipment.horse].filter(Boolean).map(e => e.name).join(', ') || '无';
      return `<tr><td>${g.name}</td><td>${g.level}</td><td>${g.exp}/${generalExpToLevelUp(g.level)}</td><td>${st.force}</td><td>${st.intelligence}</td><td>${st.command}</td><td>${st.politics}</td><td>${g.loyalty}</td><td>${g.skill ? SKILL_NAMES[g.skill] || '' : '-'}</td><td>${equipStr}</td><td>${g.injured ? '<span class="injured">受伤' + g.injuredTurns + '月</span>' : '健康'}</td></tr>`;
    }).join('')}
    </table></div>
    <div class="card"><h3>装备管理</h3>
    <p>为武将穿戴或卸下装备。装备效果计入有效属性。</p>
    <div style="margin:8px 0">
      <label>武将：</label><select id="equip-gen">${equippable.map(g => `<option value="${g.name}">${g.name}</option>`).join('')}</select>
      <label> 装备：</label><select id="equip-item"><option value="">卸下全部</option>${EQUIPMENT_POOL.filter(it => it.owned).map(it => `<option value="${it.name}">${it.name} (${EQUIPMENT_TYPES[it.type].name})</option>`).join('')}</select>
      <button class="action" onclick="window.equipItem()">穿戴/卸下</button>
    </div>
    <p style="font-size:0.8rem;color:var(--muted)">装备可在战斗胜利、事件奖励或装备商店中获得。</p>
    </div>`;
}

function openEquipShop() {
  const p = player();
  if (p.gold < 500) return;
  const items = EQUIPMENT_POOL.filter(it => !it.owned).sort(() => Math.random() - 0.5).slice(0, 4);
  const modal = document.getElementById('modal');
  const content = document.getElementById('modal-content');
  modal.style.display = 'flex';
  content.innerHTML = `
    <h2>装备商店</h2>
    <p>当前金钱：${Math.floor(p.gold)}</p>
    ${items.length ? items.map(it => {
      const attr = ['force', 'intelligence', 'command', 'politics'].filter(k => it[k]).map(k => `${k === 'force' ? '武' : k === 'intelligence' ? '智' : k === 'command' ? '统' : '政'}+${it[k]}`).join(' ');
      return `<div style="margin:8px 0;padding:8px;border:1px solid var(--border);border-radius:4px">
        <b>${it.name}</b> [${EQUIPMENT_TYPES[it.type].name}] ${attr} · ${it.cost}金
        <button class="action" onclick="window.buyEquip('${it.name}')" ${p.gold < it.cost ? 'disabled' : ''}>购买</button>
      </div>`;
    }).join('') : '<p>当前没有可售装备。</p>'}
    <div style="margin-top:12px"><button class="action" onclick="window.closeModal()">关闭</button></div>`;
}

function buyEquip(name) {
  const p = player();
  const item = EQUIPMENT_POOL.find(it => it.name === name);
  if (!item || item.owned || p.gold < item.cost) return;
  p.gold -= item.cost;
  item.owned = true;
  log(`购买装备 ${item.name}`);
  openEquipShop();
  renderAll();
}

function equipItem() {
  const state = getState();
  const gName = document.getElementById('equip-gen').value;
  const itemName = document.getElementById('equip-item').value;
  const g = findGeneral(gName);
  if (!g) return;
  if (!itemName) {
    // 卸下全部
    Object.keys(g.equipment).forEach(slot => {
      const item = g.equipment[slot];
      if (item) { item.owned = true; g.equipment[slot] = null; }
    });
    log(`${g.name} 卸下全部装备`);
  } else {
    const item = EQUIPMENT_POOL.find(it => it.name === itemName);
    if (!item || !item.owned) return;
    // 如果其他武将装备了该物品，先卸下
    state.generals.forEach(gg => {
      if (gg.equipment[item.type] && gg.equipment[item.type].name === item.name) {
        gg.equipment[item.type] = null;
      }
    });
    // 卸下当前同槽位
    const old = g.equipment[item.type];
    if (old) old.owned = true;
    g.equipment[item.type] = item;
    log(`${g.name} 装备了 ${item.name}`);
  }
  renderAll();
}

function recruitGeneral(name) {
  const state = getState();
  const g = findGeneral(name);
  const p = player();
  if(g && p.gold>=500 && g.faction!==state.playerId){
    p.gold-=500; removeGeneralFromArmies(g.name); g.faction=state.playerId; g.loyalty=70;
    log(`成功招降 ${g.name}！`);
    renderAll();
  }
}

export { renderTalent, openEquipShop, buyEquip, equipItem, recruitGeneral };
