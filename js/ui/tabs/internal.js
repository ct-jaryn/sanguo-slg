import { getState } from '../../core/state.js';
import { log } from '../../core/log.js';
import {
  getSeason, player, factionCities, factionGenerals
} from '../../core/utils.js';
import { POLICIES } from '../../config/policies.js';
import { DIFFICULTY } from '../../config/constants.js';
import { renderAll } from '../common.js';

function renderInternal(c) {
  const state = getState();
  const p = player();
  const season = getSeason();
  const tech = state.tech;
  const policyName = state.policy ? POLICIES[state.policy].name : '无';
  c.innerHTML = `
    <div class="card"><h3>内政中心 · 当前季节：${season}</h3>
    <p>拥有城池：${factionCities(state.playerId).length}座 · 武将：${factionGenerals(state.playerId).length}人 · 当前政策：${policyName}</p>
    <button class="action" onclick="window.doInternal('farm')" ${p.gold<200?'disabled':''}>开垦农田 (200金)</button>
    <button class="action" onclick="window.doInternal('comm')" ${p.gold<200?'disabled':''}>发展商业 (200金)</button>
    <button class="action" onclick="window.doInternal('recruit')" ${p.gold<150||p.food<200?'disabled':''}>招兵买马 (150金+200粮)</button>
    <button class="action" onclick="window.doInternal('search')" ${p.gold<300?'disabled':''}>寻访人才 (300金)</button>
    <button class="action" onclick="window.doInternal('heal')" ${p.gold<200||!factionGenerals(state.playerId).some(g=>g.injured)?'disabled':''}>医治伤员 (200金)</button>
    <button class="action" onclick="window.doInternal('morale')" ${p.gold<150?'disabled':''}>提升民心 (150金)</button>
    <button class="action" onclick="window.doInternal('fort')" ${p.gold<300?'disabled':''}>加固城防 (300金)</button>
    </div>
    <div class="card"><h3>科技树</h3>
    <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:12px">
      <div><b>农业</b> Lv.${tech.farm.level}/${tech.farm.max} 粮产+${tech.farm.farmBonus} <button class="action" onclick="window.doInternal('tech_farm')" ${p.gold<500||tech.farm.level>=tech.farm.max?'disabled':''}>升级 (500金)</button></div>
      <div><b>商业</b> Lv.${tech.comm.level}/${tech.comm.max} 金产+${tech.comm.commBonus} <button class="action" onclick="window.doInternal('tech_comm')" ${p.gold<500||tech.comm.level>=tech.comm.max?'disabled':''}>升级 (500金)</button></div>
      <div><b>军事</b> Lv.${tech.military.level}/${tech.military.max} 招兵+${tech.military.recruitBonus} 攻击+${tech.military.atkBonus}% <button class="action" onclick="window.doInternal('tech_military')" ${p.gold<500||tech.military.level>=tech.military.max?'disabled':''}>升级 (500金)</button></div>
      <div><b>城防</b> Lv.${tech.fort.level}/${tech.fort.max} 城防+${tech.fort.defBonus} <button class="action" onclick="window.doInternal('tech_fort')" ${p.gold<500||tech.fort.level>=tech.fort.max?'disabled':''}>升级 (500金)</button></div>
    </div></div>
    <div class="card"><h3>政策法令</h3>
    <p>每项政策持续生效，切换政策需花费 300 金。</p>
    ${Object.values(POLICIES).map(pol=>`<button class="action" onclick="window.setPolicy('${pol.id}')" ${state.policy===pol.id?'style="background:var(--accent-green);color:#fff"':''}${p.gold<300&&state.policy!==pol.id?' disabled':''}>${pol.name}：${pol.desc}</button>`).join('')}
    </div>
    <div class="card"><h3>游戏难度</h3>
    <p>当前难度：<b>${DIFFICULTY[state.difficulty||'normal'].name}</b> ${state.turn>1?'（已开始游戏，不可更改）':''}</p>
    ${Object.entries(DIFFICULTY).map(([k,v])=>`<button class="action" onclick="window.setDifficulty('${k}')" ${state.difficulty===k?'style="background:var(--accent-green);color:#fff"':''} ${state.turn>1?'disabled':''}>${v.name}</button>`).join('')}
    <p style="font-size:0.8rem;color:var(--muted)">简单：AI资源/招兵减少，进攻更谨慎；普通：标准体验；困难：AI资源/招兵增加，进攻更积极。</p>
    </div>
    <div class="card"><h3>城池产出</h3>
    <table><tr><th>城池</th><th>粮食产出</th><th>金钱产出</th><th>民心</th><th>守军</th><th>城防</th></tr>
    ${factionCities(state.playerId).map(city=>`<tr><td>${city.name}</td><td>${city.food}</td><td>${city.money}</td><td>${city.morale}</td><td>${Math.floor(city.troops)}</td><td>${city.defense.toFixed(1)}</td></tr>`).join('')}
    </table></div>`;
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
    p.gold-=150; p.food-=200; let add = Math.floor(100+Math.random()*101+state.tech.military.recruitBonus); if(state.policy==='shangwu') add+=30; p.troops+=add; log(`招兵买马，兵力+${add}`);
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
  }else if(type==='tech_farm' && p.gold>=500 && state.tech.farm.level < state.tech.farm.max){
    p.gold-=500; state.tech.farm.level++; state.tech.farm.farmBonus += 10; log(`农业科技升至 Lv.${state.tech.farm.level}，每城粮产+${state.tech.farm.farmBonus}`);
  }else if(type==='tech_comm' && p.gold>=500 && state.tech.comm.level < state.tech.comm.max){
    p.gold-=500; state.tech.comm.level++; state.tech.comm.commBonus += 8; log(`商业科技升至 Lv.${state.tech.comm.level}，每城金产+${state.tech.comm.commBonus}`);
  }else if(type==='tech_military' && p.gold>=500 && state.tech.military.level < state.tech.military.max){
    p.gold-=500; state.tech.military.level++; state.tech.military.recruitBonus += 30; state.tech.military.atkBonus += 4; log(`军事科技升至 Lv.${state.tech.military.level}，招兵+${state.tech.military.recruitBonus}，全军攻击+${state.tech.military.atkBonus}%`);
  }else if(type==='tech_fort' && p.gold>=500 && state.tech.fort.level < state.tech.fort.max){
    p.gold-=500; state.tech.fort.level++; state.tech.fort.defBonus += 0.1; cities.forEach(c=>{c.defense = Math.min(2.5, +(c.defense + 0.1).toFixed(2));}); log(`城防科技升至 Lv.${state.tech.fort.level}，城防+${state.tech.fort.defBonus.toFixed(1)}`);
  }else if(type==='tech' && p.gold>=500){
    // 兼容旧版研发科技：随机升级一个未满的科技
    p.gold-=500; const opts = ['farm','comm','military','fort'].filter(k=>state.tech[k].level<state.tech[k].max);
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
  if(state.policy===pid) return;
  if(p.gold<300){ log('金钱不足，无法切换政策'); return; }
  p.gold-=300; state.policy=pid; log(`颁布${POLICIES[pid].name}`);
  renderAll();
}

export { renderInternal, doInternal, setDifficulty, setPolicy };
