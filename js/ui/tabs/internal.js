import { getState } from '../../core/state.js';
import { log } from '../../core/log.js';
import {
  getSeason, player, factionCities, factionGenerals
} from '../../core/utils.js';
import { POLICIES } from '../../config/policies.js';
import { DIFFICULTY, CITY_TRAITS, getCityTraitEffects } from '../../config/constants.js';
import { BUILDINGS, getCityBuildingEffects, getBuildingCost } from '../../config/buildings.js';
import { renderAll } from '../common.js';

function avgTechDiscount() {
  const cities = factionCities(getState().playerId);
  if (!cities.length) return 0;
  return cities.reduce((s, c) => s + getCityBuildingEffects(c).techDiscount, 0) / cities.length;
}

function renderInternal(c) {
  const state = getState();
  const p = player();
  const season = getSeason();
  const tech = p.tech;
  const activePolicy = p.policy || state.policy;
  const policyName = activePolicy ? POLICIES[activePolicy].name : '无';
  c.innerHTML = `
    <div class="card"><h3>内政中心 · 当前季节：${season}</h3>
    <p>拥有城池：${factionCities(state.playerId).length}座 · 武将：${factionGenerals(state.playerId).length}人 · 当前政策：${policyName}</p>
    <button class="action" onclick="appActions.doInternal('farm')" ${p.gold<200?'disabled':''}>开垦农田 (200金)</button>
    <button class="action" onclick="appActions.doInternal('comm')" ${p.gold<200?'disabled':''}>发展商业 (200金)</button>
    <button class="action" onclick="appActions.doInternal('recruit')" ${p.gold<150||p.food<200?'disabled':''}>招兵买马 (150金+200粮)</button>
    <button class="action" onclick="appActions.doInternal('search')" ${p.gold<300?'disabled':''}>寻访人才 (300金)</button>
    <button class="action" onclick="appActions.doInternal('heal')" ${p.gold<200||!factionGenerals(state.playerId).some(g=>g.injured)?'disabled':''}>医治伤员 (200金)</button>
    <button class="action" onclick="appActions.doInternal('morale')" ${p.gold<150?'disabled':''}>提升民心 (150金)</button>
    <button class="action" onclick="appActions.doInternal('fort')" ${p.gold<300?'disabled':''}>加固城防 (300金)</button>
    </div>
    <div class="card"><h3>科技树</h3>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
      ${[['farm','农业','粮产'],['comm','商业','金产'],['military','军事','招兵'],['fort','城防','城防']].map(([k,name,res])=>{
        const t = tech[k];
        const cost = Math.floor(500*(1-avgTechDiscount()));
        return `<div><b>${name}</b> Lv.${t.level}/${t.max} ${res}+${k==='farm'?t.farmBonus:k==='comm'?t.commBonus:k==='military'?t.recruitBonus+' 攻击+'+t.atkBonus+'%':t.defBonus} <button class="action" onclick="appActions.doInternal('tech_${k}')" ${p.gold<cost||t.level>=t.max?'disabled':''}>升级 (${cost}金)</button></div>`;
      }).join('')}
    </div></div>
    <div class="card"><h3>政策法令</h3>
    <p>每项政策持续生效，切换政策需花费 300 金。</p>
    ${Object.values(POLICIES).map(pol=>`<button class="action" onclick="appActions.setPolicy('${pol.id}')" ${activePolicy===pol.id?'style="background:var(--accent-green);color:#fff" ':''}${p.gold<300&&activePolicy!==pol.id?'disabled ':''}>${pol.name}：${pol.desc}</button>`).join('')}
    </div>
    <div class="card"><h3>游戏难度</h3>
    <p>当前难度：<b>${DIFFICULTY[state.difficulty||'normal'].name}</b> ${state.turn>1?'（已开始游戏，不可更改）':''}</p>
    ${Object.entries(DIFFICULTY).map(([k,v])=>`<button class="action" onclick="appActions.setDifficulty('${k}')" ${state.difficulty===k?'style="background:var(--accent-green);color:#fff"':''} ${state.turn>1?'disabled':''}>${v.name}</button>`).join('')}
    <p style="font-size:0.8rem;color:var(--muted)">简单：AI资源/招兵减少，进攻更谨慎；普通：标准体验；困难：AI资源/招兵增加，进攻更积极。</p>
    </div>
    <div class="card"><h3>城池产出</h3>
    <table><tr><th>城池</th><th>特色</th><th>粮食产出</th><th>金钱产出</th><th>民心</th><th>守军</th><th>城防</th></tr>
    ${factionCities(state.playerId).map(city=>{
      const traits = (city.traits || []).map(t => CITY_TRAITS[t]?.name || t).join('、');
      const eff = getCityTraitEffects(city);
      const beff = getCityBuildingEffects(city);
      return `<tr><td>${city.name}</td><td>${traits || '—'}</td><td>${Math.floor(city.food * eff.foodMul * beff.foodMul)}</td><td>${Math.floor(city.money * eff.goldMul * beff.goldMul)}</td><td>${city.morale}</td><td>${Math.floor(city.troops)}</td><td>${(city.defense * eff.defMul + beff.defenseBonus).toFixed(1)}</td></tr>`;
    }).join('')}
    </table></div>
    <div class="card"><h3>城池建设</h3>
    <p>选择城池进行建筑升级，每座城池每种建筑最高 5 级。</p>
    <div style="margin:8px 0">
      <label>城池：</label><select id="build-city" onchange="appActions.updateBuildingPanel()">${factionCities(state.playerId).map(c => `<option value="${c.name}">${c.name}</option>`).join('')}</select>
    </div>
    <div id="building-panel"></div>
    </div>`;

  setTimeout(() => updateBuildingPanel(), 0);
}

function doInternal(type) {
  const state = getState();
  const p = player();
  const cities = factionCities(state.playerId);
  if(type==='farm' && p.gold>=200){
    p.gold-=200; cities.forEach(c=>c.food+=15); log('开垦农田，各城粮食产出+15');
  }else if(type==='comm' && p.gold>=200){
    p.gold-=200; cities.forEach(c=>c.money+=12); log('发展商业，各城金钱产出+12');
  }else if(type==='recruit' && p.gold>=150 && p.food>=200){
    p.gold-=150; p.food-=200;
    const recruitMul = cities.reduce((s, c) => s + getCityTraitEffects(c).recruitMul * getCityBuildingEffects(c).recruitMul, 0) / Math.max(1, cities.length);
    let add = Math.floor((100+Math.random()*101+p.tech.military.recruitBonus) * recruitMul); if((p.policy || state.policy)==='shangwu') add+=30; p.troops+=add; log(`招兵买马，兵力+${add}`);
  }else if(type==='search' && p.gold>=300){
    p.gold-=300;
    if(Math.random()<0.4){
      const pool = state.generals.filter(g=>g.faction==='free');
      if(pool.length){
        const g = pool[Math.floor(Math.random()*pool.length)];
        g.faction=state.playerId; g.loyalty=70;
        log(`寻访到人才 ${g.name}，已加入麾下！`);
      }else log('寻访未果。');
    }else log('寻访未果。');
  }else if(type==='heal' && p.gold>=200){
    p.gold-=200; factionGenerals(state.playerId).forEach(g=>{g.injured=0;g.injuredTurns=0;}); log('医治伤员，所有武将恢复健康');
  }else if(type==='morale' && p.gold>=150){
    p.gold-=150; cities.forEach(c=>c.morale=Math.min(100,c.morale+10)); log('提升民心，各城民心+10');
  }else if(type==='fort' && p.gold>=300){
    p.gold-=300; cities.forEach(c=>{c.defense = Math.min(2.5, +(c.defense + 0.1).toFixed(2));}); log('加固城防，各城城防+0.1');
  }else if(type==='tech_farm' && p.gold>=Math.floor(500*(1-avgTechDiscount())) && p.tech.farm.level < p.tech.farm.max){
    const cost = Math.floor(500*(1-avgTechDiscount()));
    p.gold-=cost; p.tech.farm.level++; p.tech.farm.farmBonus += 10; log(`农业科技升至 Lv.${p.tech.farm.level}，每城粮产+${p.tech.farm.farmBonus}${cost<500?'（书院折扣）':''}`);
  }else if(type==='tech_comm' && p.gold>=Math.floor(500*(1-avgTechDiscount())) && p.tech.comm.level < p.tech.comm.max){
    const cost = Math.floor(500*(1-avgTechDiscount()));
    p.gold-=cost; p.tech.comm.level++; p.tech.comm.commBonus += 8; log(`商业科技升至 Lv.${p.tech.comm.level}，每城金产+${p.tech.comm.commBonus}${cost<500?'（书院折扣）':''}`);
  }else if(type==='tech_military' && p.gold>=Math.floor(500*(1-avgTechDiscount())) && p.tech.military.level < p.tech.military.max){
    const cost = Math.floor(500*(1-avgTechDiscount()));
    p.gold-=cost; p.tech.military.level++; p.tech.military.recruitBonus += 30; p.tech.military.atkBonus += 4; log(`军事科技升至 Lv.${p.tech.military.level}，招兵+${p.tech.military.recruitBonus}，全军攻击+${p.tech.military.atkBonus}%${cost<500?'（书院折扣）':''}`);
  }else if(type==='tech_fort' && p.gold>=Math.floor(500*(1-avgTechDiscount())) && p.tech.fort.level < p.tech.fort.max){
    const cost = Math.floor(500*(1-avgTechDiscount()));
    p.gold-=cost; p.tech.fort.level++; p.tech.fort.defBonus += 0.1; cities.forEach(c=>{c.defense = Math.min(2.5, +(c.defense + 0.1).toFixed(2));}); log(`城防科技升至 Lv.${p.tech.fort.level}，城防+${p.tech.fort.defBonus.toFixed(1)}${cost<500?'（书院折扣）':''}`);
  }else if(type==='tech' && p.gold>=Math.floor(500*(1-avgTechDiscount()))){
    // 兼容旧版研发科技：随机升级一个未满的科技
    p.gold-=500; const opts = ['farm','comm','military','fort'].filter(k=>p.tech[k].level<p.tech[k].max);
    if(opts.length){ doInternal(`tech_${opts[Math.floor(Math.random()*opts.length)]}`); return; }
    log('所有科技已满级');
  }
  renderAll();
}

function setDifficulty(d) {
  const state = getState();
  if (state.turn > 1) { log('游戏已开始，无法更改难度'); return; }
  if (!DIFFICULTY[d]) return;
  state.difficulty = d;
  log(`游戏难度设置为 ${DIFFICULTY[d].name}`);
  renderAll();
}

function setPolicy(pid) {
  const state = getState();
  const p = player();
  const activePolicy = p.policy || state.policy;
  if(activePolicy===pid) return;
  if(p.gold<300){ log('金钱不足，无法切换政策'); return; }
  p.gold-=300; p.policy=pid; state.policy=pid; log(`颁布${POLICIES[pid].name}`);
  renderAll();
}

function updateBuildingPanel() {
  const state = getState();
  const p = player();
  const citySel = document.getElementById('build-city');
  const panel = document.getElementById('building-panel');
  if (!citySel || !panel) return;
  const city = factionCities(state.playerId).find(c => c.name === citySel.value);
  if (!city) { panel.innerHTML = '<p>请选择城池</p>'; return; }
  const buildings = city.buildings || {};
  let html = `<table><tr><th>建筑</th><th>等级</th><th>效果</th><th>升级消耗</th><th>操作</th></tr>`;
  Object.values(BUILDINGS).forEach(cfg => {
    const lv = buildings[cfg.id] || 0;
    const maxed = lv >= cfg.maxLevel;
    const cost = getBuildingCost(cfg.id, lv);
    const canAfford = cost && p.gold >= cost.gold && p.food >= cost.food;
    html += `<tr>
      <td><b>${cfg.name}</b><br/><span style="font-size:0.8rem;color:var(--muted)">${cfg.desc}</span></td>
      <td>${lv}/${cfg.maxLevel}</td>
      <td>${lv > 0 ? cfg.effectDesc(lv) : '—'}</td>
      <td>${maxed ? '已满级' : `${cost.gold}金${cost.food ? ' ' + cost.food + '粮' : ''}`}</td>
      <td>${maxed ? '—' : `<button class="action" onclick="appActions.doBuildBuilding('${city.name}', '${cfg.id}')" ${canAfford ? '' : 'disabled'}>升级</button>`}</td>
    </tr>`;
  });
  html += `</table>`;
  panel.innerHTML = html;
}

function doBuildBuilding(cityName, buildingId) {
  const state = getState();
  const p = player();
  const city = factionCities(state.playerId).find(c => c.name === cityName);
  if (!city) { alert('城池不存在'); return; }
  const cfg = BUILDINGS[buildingId];
  if (!cfg) { alert('建筑不存在'); return; }
  const lv = (city.buildings && city.buildings[buildingId]) || 0;
  if (lv >= cfg.maxLevel) { alert('建筑已满级'); return; }
  const cost = getBuildingCost(buildingId, lv);
  if (p.gold < cost.gold || p.food < cost.food) { alert('资源不足'); return; }
  p.gold -= cost.gold;
  p.food -= cost.food;
  if (!city.buildings) city.buildings = {};
  city.buildings[buildingId] = lv + 1;
  log(`${city.name} 建造 ${cfg.name} 至 Lv.${lv + 1}`);
  renderAll();
}

export { renderInternal, doInternal, setDifficulty, setPolicy, updateBuildingPanel, doBuildBuilding };
