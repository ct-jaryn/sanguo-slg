import { getState } from '../../core/state.js';
import { log } from '../../core/log.js';
import {
  player, relation, setRelation
} from '../../core/utils.js';
import { renderAll } from '../common.js';

function renderDiplomacy(c) {
  const state = getState();
  const p = player();
  const others = Object.values(state.factions).filter(f=>f.id!==state.playerId && !f.eliminated);
  c.innerHTML = `<div class="card"><h3>外交关系</h3>` +
    others.map(f=>{
      const r = relation(state.playerId,f.id);
      let level = r>=80?'盟友':r>=50?'友好':r>=20?'中立':r>=0?'敌对':'战争';
      return `<div style="margin:8px 0;padding:8px;border:1px solid var(--border);border-radius:4px">
        <b><span class="faction-dot" style="background:${f.color}"></span>${f.name}</b> 关系值:${r} (${level})
        <div style="margin-top:6px">
          <button class="action" onclick="appActions.doDiplomacy('ally','${f.id}')" ${p.gold<500||r<50||p.allies.includes(f.id)?'disabled':''}>${p.allies.includes(f.id)?'已结盟':'结盟(500金)'}</button>
          <button class="action" onclick="appActions.doDiplomacy('trade','${f.id}')" ${p.food<200?'disabled':''}>贸易(200粮)</button>
          <button class="action" onclick="appActions.doDiplomacy('gift','${f.id}')" ${p.gold<300?'disabled':''}>送礼(300金)</button>
          <button class="action" onclick="appActions.doDiplomacy('sow','${f.id}')" ${p.gold<400?'disabled':''}>离间(400金)</button>
          <button class="action" onclick="appActions.doDiplomacy('peace','${f.id}')" ${p.gold<300||r>=0?'disabled':''}>停战(300金)</button>
          <button class="action" onclick="appActions.doDiplomacy('war','${f.id}')">宣战</button>
        </div>
      </div>`;
    }).join('') + `</div>`;
}

function doDiplomacy(type,targetId) {
  const state = getState();
  const p = player();
  const f = state.factions[targetId];
  if (!f || f.eliminated) { log('目标势力不存在或已灭亡'); return; }
  if(type==='ally' && p.gold>=500 && !p.allies.includes(targetId) && !f.allies.includes(state.playerId)){
    p.gold-=500; setRelation(state.playerId,targetId,Math.max(relation(state.playerId,targetId),80));
    if(!p.allies.includes(targetId)) p.allies.push(targetId);
    if(!f.allies.includes(state.playerId)) f.allies.push(state.playerId);
    log(`与 ${f.name} 结为盟友，关系提升至盟友级`);
  }else if(type==='trade' && p.food>=200){
    p.food-=200; p.gold+=300; setRelation(state.playerId,targetId,relation(state.playerId,targetId)+10);
    log(`与 ${f.name} 贸易，用200粮换300金，关系+10`);
  }else if(type==='gift' && p.gold>=300){
    p.gold-=300; setRelation(state.playerId,targetId,relation(state.playerId,targetId)+15);
    log(`向 ${f.name} 送礼，关系+15`);
  }else if(type==='sow' && p.gold>=400){
    p.gold-=400;
    const targets = state.generals.filter(g=>g.faction===targetId);
    if(targets.length){
      const g = targets[Math.floor(Math.random()*targets.length)];
      const drop = 15+Math.floor(Math.random()*16);
      g.loyalty-=drop;
      log(`离间 ${f.name} 的 ${g.name}，忠诚度-${drop}`);
    }
  }else if(type==='peace' && p.gold>=300){
    p.gold-=300; setRelation(state.playerId,targetId,20);
    p.allies = p.allies.filter(id => id !== targetId);
    f.allies = f.allies.filter(id => id !== state.playerId);
    log(`与 ${f.name} 停战，关系恢复为20`);
  }else if(type==='war'){
    setRelation(state.playerId,targetId,-100);
    p.allies = p.allies.filter(id => id !== targetId);
    f.allies = f.allies.filter(id => id !== state.playerId);
    log(`向 ${f.name} 宣战！`);
  }
  renderAll();
}

export { renderDiplomacy, doDiplomacy };
