import { getState } from '../../core/state.js';
import { log } from '../../core/log.js';
import {
  player, factionCities, findCity, findGeneral,
  relation, setRelation, factionArmies, findArmy, armyTroopTotal,
  availableGenerals
} from '../../core/utils.js';
import { FORMATIONS } from '../../config/constants.js';
import { TACTICS } from '../../config/tactics.js';
import { armyBattle } from '../../core/battle.js';
import { showBattleFx, showBattleReport, renderAll, closeModal } from '../common.js';
import { playSound } from '../../systems/audio.js';
import { checkAchievements } from '../../systems/achievements.js';

function renderMilitary(c) {
  const state = getState();
  const p = player();
  const pcities = factionCities(state.playerId);
  const myArmies = factionArmies(state.playerId);
  const availableGens = availableGenerals(state.playerId);

  let html = `<div class="card"><h3>军团管理</h3>`;
  html += `<p>可用兵力：${Math.floor(p.troops)} · 可用武将：${availableGens.length}人 · 军团上限：${pcities.length}</p>`;
  html += `<button class="action" onclick="window.openArmyEditor()">组建新军团</button>`;
  html += `</div>`;

  html += `<div class="card"><h3>我的军团</h3>`;
  if (myArmies.length === 0) {
    html += `<p>暂无军团，请组建军团后出征。</p>`;
  } else {
    html += `<table><tr><th>军团</th><th>驻扎</th><th>主将</th><th>将领</th><th>阵型</th><th>步兵</th><th>骑兵</th><th>弓兵</th><th>总兵力</th><th>操作</th></tr>`;
    myArmies.forEach(a => {
      const main = a.generals.length ? a.generals[0] : '-';
      const form = FORMATIONS[a.formation] || FORMATIONS.yulin;
      html += `<tr>
        <td>${a.name}</td>
        <td>${a.city || '待命'}</td>
        <td>${main}</td>
        <td>${a.generals.join(', ') || '-'}</td>
        <td>${form.name}</td>
        <td>${a.infantry}</td><td>${a.cavalry}</td><td>${a.archer}</td>
        <td>${armyTroopTotal(a)}</td>
        <td>
          <button class="action" onclick="window.openArmyEditor(${a.id})">调整</button>
          <button class="action" onclick="window.disbandArmy(${a.id})">解散</button>
        </td>
      </tr>`;
    });
    html += `</table>`;
  }
  html += `</div>`;

  html += `<div class="card"><h3>派军团出征</h3>`;
  if (myArmies.length === 0 || pcities.length === 0) {
    html += `<p>无可用军团或城池。</p>`;
  } else {
    const defaultArmy = myArmies[0];
    const fromCity = defaultArmy && defaultArmy.city ? findCity(defaultArmy.city) : pcities[0];
    const neighborOpts = fromCity && fromCity.neighbors ? fromCity.neighbors.map(n => {
      const t = findCity(n);
      if (!t) return '';
      return `<option value="${n}">${n}${t.owner ? ' (' + state.factions[t.owner].name + ')' : ' (无主)'}</option>`;
    }).join('') : '';
    const toOptions = neighborOpts || '<option value="">无相邻目标</option>';
    html += `<div style="margin:8px 0">
      <label>军团：</label><select id="atk-army" onchange="window.updateAtkTargets()">${myArmies.map(a => `<option value="${a.id}">${a.name} (${armyTroopTotal(a)}人 @${a.city || '待命'})</option>`).join('')}</select>
      <label> 目标城：</label><select id="atk-to">${toOptions}</select>
      <label> 战术：</label><select id="atk-tactic">${Object.entries(TACTICS).map(([k, v]) => `<option value="${k}">${v.name}</option>`).join('')}</select>
      <button class="action" onclick="window.doArmyAttack()">出征</button>
    </div>`;
    html += `<div id="tactic-desc" style="font-size:0.85rem;color:var(--muted)"></div>`;
    html += `<div id="atk-preview"></div>`;
  }
  html += `</div>`;

  html += `<div class="card"><h3>城池驻防</h3>`;
  html += `<p>预备役：${Math.floor(p.troops)} · 单城守军上限 6000</p>`;
  if (pcities.length === 0) {
    html += `<p>无可驻防城池。</p>`;
  } else {
    html += `<div style="margin:8px 0">
      <label>城池：</label><select id="gar-city">${pcities.map(c=>`<option value="${c.name}">${c.name} (守军${Math.floor(c.troops)})</option>`).join('')}</select>
      <label> 数量：</label><input type="number" id="gar-num" value="500" min="100" step="100" style="width:90px">
      <button class="action" onclick="window.reinforceCity('in')">从预备役调兵驻防</button>
      <button class="action" onclick="window.reinforceCity('out')">撤回预备役</button>
    </div>`;
  }
  html += `</div>`;

  c.innerHTML = html;

  const armySel = document.getElementById('atk-army');
  const toSel = document.getElementById('atk-to');
  if (armySel && toSel) {
    armySel.addEventListener('change', window.updateAtkTargets);
    window.updateAtkTargets();
    const tacticSel = document.getElementById('atk-tactic');
    const tacticDesc = document.getElementById('tactic-desc');
    if (tacticSel && tacticDesc) {
      const updateTacticDesc = () => {
        const armyId = parseInt(armySel.value, 10);
        const army = isNaN(armyId) ? null : findArmy(armyId);
        const main = army && army.generals.length ? findGeneral(army.generals[0]) : null;
        const t = TACTICS[tacticSel.value] || TACTICS.normal;
        const ok = !t.req || t.req(main, null);
        tacticDesc.innerHTML = `${t.desc} ${ok ? '' : '（当前主将不满足条件）'}`;
      };
      tacticSel.addEventListener('change', updateTacticDesc);
      updateTacticDesc();
    }
  }
}

function updateAtkTargets() {
  const state = getState();
  const armySel = document.getElementById('atk-army');
  const toSel = document.getElementById('atk-to');
  if (!armySel || !toSel) return;
  const raw = armySel.value;
  const armyId = parseInt(raw, 10);
  const army = isNaN(armyId) ? null : findArmy(armyId);
  const fromCity = army && army.city ? findCity(army.city) : factionCities(state.playerId)[0];
  if (!fromCity) { toSel.innerHTML = '<option value="">无出发城池</option>'; return; }
  const neighbors = fromCity.neighbors || [];
  const opts = neighbors.map(n => {
    const t = findCity(n);
    if (!t) return '';
    return `<option value="${n}">${n}${t.owner ? ' (' + state.factions[t.owner].name + ')' : ' (无主)'}</option>`;
  }).join('');
  toSel.innerHTML = opts || '<option value="">无相邻目标</option>';
  if (toSel.options.length) {
    const firstReal = Array.from(toSel.options).find(o => o.value);
    if (firstReal) toSel.value = firstReal.value;
  }
}

function reinforceCity(dir) {
  const state = getState();
  const p = player();
  const cityEl = document.getElementById('gar-city');
  const numEl = document.getElementById('gar-num');
  if (!cityEl || !numEl) { alert('界面未就绪，请重新打开军事面板'); return; }
  const cityName = cityEl.value;
  const num = Math.max(0, parseInt(numEl.value)||0);
  const city = findCity(cityName);
  if(!city || city.owner!==state.playerId){ alert('请选择己方城池'); return; }
  if(num<100){ alert('数量至少100'); return; }
  if(dir==='in'){
    if(num>p.troops){ alert('预备役兵力不足'); return; }
    if(city.troops+num>6000){ alert('超过单城守军上限 6000'); return; }
    p.troops -= num; city.troops += num;
    log(`调 ${num} 兵力驻防 ${city.name}，守军达 ${Math.floor(city.troops)}`);
  }else{
    if(num>city.troops){ alert('城池守军不足'); return; }
    city.troops -= num; p.troops += num;
    log(`从 ${city.name} 撤回 ${num} 兵力至预备役`);
  }
  renderAll();
}

function doArmyAttack() {
  const state = getState();
  if(state.gameOver) return;
  const armySel = document.getElementById('atk-army');
  const toSel = document.getElementById('atk-to');
  const tacticSel = document.getElementById('atk-tactic');
  if (!armySel || !toSel || !tacticSel) { alert('界面未就绪，请重新打开军事面板'); return; }
  const rawArmyId = armySel.value;
  const armyId = parseInt(rawArmyId, 10);
  const toName = toSel.value;
  const tacticKey = tacticSel.value;
  if (!rawArmyId || rawArmyId === '' || isNaN(armyId)) { alert('请选择出征军团'); return; }
  const army = findArmy(armyId);
  if (!army) { alert('所选军团不存在或已解散'); return; }
  if (!toName || toName === '请先选军团' || toName === '无相邻目标' || toName === '无出发城池') { alert('请选择目标城池'); return; }
  const target = findCity(toName);
  if (!target) { alert('目标城池不存在'); return; }
  if(target.owner===state.playerId) { alert('不能攻击己方城池'); return; }
  if(target.owner && relation(state.playerId,target.owner)>=80) { alert('不能攻击盟友'); return; }
  const fromCity = army.city ? findCity(army.city) : factionCities(state.playerId)[0];
  if(!fromCity || fromCity.owner!==state.playerId) { alert('军团驻扎城已丢失，请重新驻防'); return; }
  if(!fromCity.neighbors.includes(target.name)) { alert('目标不相邻'); return; }
  if(armyTroopTotal(army)<100) { alert('军团兵力不足'); return; }
  const mainGeneral = army.generals.length ? findGeneral(army.generals[0]) : null;
  if(mainGeneral && mainGeneral.injured) { alert('主将受伤中'); return; }
  const tactic = TACTICS[tacticKey];
  if(tactic.req && !tactic.req(mainGeneral, target)) { alert('当前主将不满足该战术条件'); return; }
  if(target.owner) setRelation(state.playerId,target.owner,-100);
  const result = armyBattle(state.playerId, target.owner||'neutral', army, target, tacticKey);
  if (result && result.playerInvolved) {
    showBattleFx(result.fxText, result.victory ? '' : 'defeat');
    playSound(result.sound);
    showBattleReport(result.report);
    checkAchievements();
  }
  renderAll();
}

function openArmyEditor(armyId=null) {
  const state = getState();
  const p = player();
  const army = armyId ? findArmy(armyId) : null;
  const pcities = factionCities(state.playerId);
  const availableGens = availableGenerals(state.playerId, armyId);
  const maxArmies = pcities.length;
  const currentCount = factionArmies(state.playerId).length;
  if(!army && currentCount>=maxArmies){ alert('军团数量已达城池数量上限'); return; }

  const currentGens = army ? army.generals : [];
  const unselectedGens = availableGens.map(g=>g.name);
  const allSelectable = [...new Set([...currentGens, ...unselectedGens])];

  const modal = document.getElementById('modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;
  modal.style.display='flex';
    content.innerHTML = `
    <h2>${army?'调整军团':'组建新军团'}</h2>
    <div style="margin:8px 0"><label>军团名称：</label><input id="army-name" value="${army?army.name:state.factions[state.playerId].name+(currentCount+1)+'军'}" style="width:140px"></div>
    <div style="margin:8px 0"><label>驻扎城池：</label><select id="army-city">${pcities.map(c=>`<option value="${c.name}" ${army&&army.city===c.name?'selected':''}>${c.name}</option>`).join('')}</select></div>
    <div style="margin:8px 0"><label>阵型：</label><select id="army-formation">${Object.entries(FORMATIONS).map(([k,v])=>`<option value="${k}" ${(army&&army.formation===k)||(!army&&k==='yulin')?'selected':''}>${v.name} - ${v.desc}</option>`).join('')}</select></div>
    <div style="margin:8px 0"><label>将领（最多3人）：</label></div>
    <div id="gen-picker">${allSelectable.map(name=>`<label style="margin-right:12px"><input type="checkbox" value="${name}" ${currentGens.includes(name)?'checked':''}> ${name}</label>`).join('')}</div>
    <div style="margin:8px 0"><label>步兵：</label><input type="number" id="army-infantry" value="${army?army.infantry:0}" min="0" step="100" style="width:80px"></div>
    <div style="margin:8px 0"><label>骑兵：</label><input type="number" id="army-cavalry" value="${army?army.cavalry:0}" min="0" step="100" style="width:80px"></div>
    <div style="margin:8px 0"><label>弓兵：</label><input type="number" id="army-archer" value="${army?army.archer:0}" min="0" step="100" style="width:80px"></div>
    <p>可用兵力：${Math.floor(p.troops)} · 预计消耗：步兵1粮/百、骑兵1.5粮/百、弓兵1.1粮/百（按季节结算）</p>
    <div style="margin-top:12px"><button class="action" onclick="window.saveArmy(${armyId||'null'})" style="background:var(--accent-green);color:#fff;border-color:var(--accent-green)">保存</button>
    <button class="action" onclick="window.closeModal()">取消</button></div>
  `;
}

function saveArmy(armyId) {
  const state = getState();
  const p = player();
  const name = (document.getElementById('army-name').value.trim() || '无名军团').replace(/[<>]/g,'');
  const city = document.getElementById('army-city').value;
  const formation = document.getElementById('army-formation').value || 'yulin';
  const gens = Array.from(document.querySelectorAll('#gen-picker input:checked')).map(i=>i.value).slice(0,3);
  const infantry = Math.max(0, parseInt(document.getElementById('army-infantry').value)||0);
  const cavalry = Math.max(0, parseInt(document.getElementById('army-cavalry').value)||0);
  const archer = Math.max(0, parseInt(document.getElementById('army-archer').value)||0);
  const existing = armyId ? findArmy(armyId) : null;
  const existingTotal = existing ? armyTroopTotal(existing) : 0;
  const total = infantry + cavalry + archer;
  if(total > p.troops + existingTotal){ alert('兵力不足'); return; }
  if(total < 100){ alert('军团总兵力至少100'); return; }

  if(armyId){
    const army = existing;
    if (!army) { alert('军团不存在'); return; }
    p.troops += armyTroopTotal(army);
    army.name = name; army.city = city; army.generals = gens; army.formation = formation;
    army.infantry = infantry; army.cavalry = cavalry; army.archer = archer;
    p.troops -= total;
    log(`调整军团 ${name}，总兵力 ${total}`);
  }else{
    state.armies.push({id:state.nextArmyId++, faction:state.playerId, name, city, generals:gens, formation, infantry, cavalry, archer});
    p.troops -= total;
    log(`组建军团 ${name}，总兵力 ${total}`);
  }
  closeModal();
  renderAll();
}

function disbandArmy(armyId) {
  const state = getState();
  if(!confirm('确定解散该军团？兵力将返回预备役。')) return;
  const army = findArmy(armyId);
  if(!army) return;
  const p = state.factions[army.faction];
  p.troops += armyTroopTotal(army);
  state.armies = state.armies.filter(a=>a.id!==armyId);
  log(`解散军团 ${army.name}，兵力返回预备役`);
  renderAll();
}

export { renderMilitary, updateAtkTargets, reinforceCity, doArmyAttack, openArmyEditor, saveArmy, disbandArmy };
