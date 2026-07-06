import { getState } from '../core/state.js';
import { log } from '../core/log.js';
import {
  findCity, availableGenerals, armyTroopTotal, findGeneral, factionCities,
  factionArmies, relation, setRelation, effectiveStats
} from '../core/utils.js';
import { AI_COMP_PREFS, RIVER_CITIES, DIFFICULTY } from '../config/constants.js';
import { TACTICS } from '../config/tactics.js';
import { battle, armyBattle } from '../core/battle.js';
import { checkAchievements } from './achievements.js';

function aiArmyTacticHint(f, city) {
  const nearby = city.neighbors.map(n => findCity(n)).filter(Boolean);
  const riverRatio = nearby.length ? nearby.filter(n => RIVER_CITIES.includes(n.name)).length / nearby.length : 0;
  if (riverRatio >= 0.4) return 'water';
  const enemyStrong = nearby.some(n => n.owner && n.owner !== f.id && (n.defense >= 1.2 || n.troops >= 1500));
  if (city.defense >= 1.2 || enemyStrong) return 'siege';
  const gens = availableGenerals(f.id).filter(g => g.faction === f.id).slice(0, 3);
  const avgInt = gens.length ? gens.reduce((s, g) => s + g.intelligence, 0) / gens.length : 50;
  if (avgInt >= 75) return Math.random() < 0.5 ? 'fire' : 'ambush';
  const northernPlains = ['平原','北平','蓟','南皮','晋阳','河内','陈留','邺城'];
  if (northernPlains.includes(city.name)) return 'cavalry';
  return 'normal';
}

function getOptimalAIComp(f, city, use) {
  const hint = aiArmyTacticHint(f, city);
  const pref = AI_COMP_PREFS[hint] || AI_COMP_PREFS.normal;
  let inf = Math.floor(use * pref.infantry);
  let cav = Math.floor(use * pref.cavalry);
  let arc = Math.floor(use * pref.archer);
  const sum = inf + cav + arc;
  if (sum < use) {
    const diff = use - sum;
    const order = hint === 'cavalry' ? ['cavalry','infantry','archer'] : (hint === 'fire' || hint === 'ambush' ? ['archer','infantry','cavalry'] : ['infantry','cavalry','archer']);
    for (const type of order) {
      if (diff <= 0) break;
      if (type === 'infantry') { inf += diff; break; }
      if (type === 'cavalry') { cav += diff; break; }
      if (type === 'archer') { arc += diff; break; }
    }
  }
  // 按兵种优势选择阵型
  let formation = 'yulin';
  const share = { infantry: inf / use, cavalry: cav / use, archer: arc / use };
  if (share.cavalry >= 0.4) formation = 'fengshi';
  else if (share.archer >= 0.35) formation = 'yanxing';
  else if (share.infantry >= 0.5) formation = 'fangyuan';
  else if (hint === 'ambush' || hint === 'fire') formation = 'changsheng';
  return { infantry: inf, cavalry: cav, archer: arc, hint, formation };
}

function pickAIGenerals(f, hint) {
  const pool = availableGenerals(f.id).filter(g => g.faction === f.id && !g.injured);
  if (!pool.length) return [];
  let sorted;
  if (hint === 'fire' || hint === 'ambush') sorted = pool.slice().sort((a, b) => b.intelligence - a.intelligence);
  else if (hint === 'siege' || hint === 'water') sorted = pool.slice().sort((a, b) => b.command - a.command);
  else sorted = pool.slice().sort((a, b) => b.force - a.force);
  const main = sorted[0];
  const rest = pool.filter(g => g !== main).sort((a, b) => b.force - a.force).slice(0, 2);
  return [main, ...rest].map(g => g.name);
}

function chooseAITroopType(general, targetCity) {
  if (!general) return 'infantry';
  if (RIVER_CITIES.includes(targetCity.name)) return 'infantry';
  if (general.intelligence >= 75) return 'archer';
  if (general.force >= 90) return 'cavalry';
  return 'infantry';
}

function aiTurn(f) {
  const st = getState();
  const cities = factionCities(f.id);
  const diff = DIFFICULTY[st.difficulty || 'normal'];
  // AI policy switching
  if (f.gold > 800 && Math.random() < 0.2) {
    const best = chooseAIPolicy(f, cities);
    if (best && f.policy !== best) {
      f.gold -= 300;
      f.policy = best;
    }
  }
  // AI tech upgrade
  if (f.gold > 800 && Math.random() < diff.aiTechChance) {
    const preferred = f.personality === 'expansion' ? 'military' : (f.personality === 'diplomatic' ? 'comm' : 'farm');
    const techOptions = ['farm', 'comm', 'military', 'fort'];
    const tech = st.tech[preferred].level < st.tech[preferred].max ? preferred : techOptions.find(k => st.tech[k].level < st.tech[k].max);
    if (tech) {
      f.gold -= 500;
      st.tech[tech].level++;
      if (tech === 'farm') st.tech[tech].farmBonus += 10;
      else if (tech === 'comm') st.tech[tech].commBonus += 8;
      else if (tech === 'military') { st.tech[tech].recruitBonus += 30; st.tech[tech].atkBonus += 4; }
      else if (tech === 'fort') { st.tech[tech].defBonus += 0.1; cities.forEach(c => c.defense = Math.min(2.5, +(c.defense + 0.1).toFixed(2))); }
    }
  }
  // 民心维护：抵消每回合衰减，避免 AI 城池民心崩到 20
  if(cities.length && f.gold>100){
    f.gold -= 20;
    cities.forEach(c=>c.morale = Math.min(100, c.morale + 3));
  }
  // Recruit
  if(f.gold>500 && f.food>=200 && f.troops<2000 && cities.length){
    f.gold-=150; f.food-=200; let add=Math.floor((100+Math.floor(Math.random()*101))*diff.aiRecruitMul); if(f.policy==='shangwu') add+=30; f.troops+=add;
  }
  // Develop
  if(f.personality==='conservative' && f.gold>400 && cities.length){
    f.gold-=200; cities.forEach(c=>c.food+=15);
  }
  // Diplomatic AI ally
  if(f.personality==='diplomatic' && Math.random()<0.4){
    const candidates = Object.values(st.factions).filter(o=>o.id!==f.id && !o.eliminated && relation(f.id,o.id)>30 && !f.allies.includes(o.id));
    if(candidates.length){
      const t = candidates[Math.floor(Math.random()*candidates.length)];
      f.gold-=500; setRelation(f.id,t.id,relation(f.id,t.id)+30);
      f.allies.push(t.id); t.allies.push(f.id);
      log(`${f.name} 与 ${t.name} 结为盟友`);
    }
  }
  // Attack
  if(f.personality==='expansion' || (f.personality==='diplomatic' && Math.random()<0.3)){
    const myCities = factionCities(f.id);
    const targets = [];
    myCities.forEach(c=>{
      c.neighbors.forEach(n=>{
        const t = findCity(n);
        if(t && t.owner!==f.id && (!t.owner || relation(f.id,t.owner)<80)){
          targets.push({from:c,to:t});
        }
      });
    });
    targets.sort((a,b)=>a.to.troops-b.to.troops);
    const usedGenerals = new Set();
    for(const atk of targets){
      if(f.troops>atk.to.troops*(diff.aiAttackThreshold+0.2) && f.troops>500){
        // 选未受伤且未在本回合出战的武将（排除已在军团中的）
        const gen = availableGenerals(f.id).filter(g=>!g.injured && !usedGenerals.has(g.name)).sort((a,b)=>b.force-a.force)[0];
        if(gen){
          usedGenerals.add(gen.name);
          const use = Math.min(f.troops, Math.max(500, Math.floor(atk.to.troops*1.2)));
          const troopType = chooseAITroopType(gen, atk.to);
          battle(f.id, atk.to.owner||'neutral', gen, use, atk.to, troopType);
          checkAchievements();
          if(Math.random()<0.7) break;
        }
      }
    }
  }
  // Distribute troops to cities and auto-create armies for AI
  if(cities.length && f.troops>0){
    const per = Math.floor(f.troops/cities.length);
    cities.forEach(c=>{ c.troops += per; });
    f.troops -= per*cities.length;
  }
  // Auto-create or replenish one army per city if enough troops
  const myArmies = factionArmies(f.id);
  cities.forEach(city=>{
    const stationed = myArmies.filter(a=>a.city===city.name);
    if(stationed.length===0 && city.troops>=500){
      const use = Math.min(city.troops, 1500);
      const comp = getOptimalAIComp(f, city, use);
      const gens = pickAIGenerals(f, comp.hint);
      st.armies.push({id:st.nextArmyId++, faction:f.id, name:`${city.name}军`, city:city.name, generals:gens, formation:comp.formation, infantry:comp.infantry, cavalry:comp.cavalry, archer:comp.archer});
      city.troops -= use;
    } else if(stationed.length && city.troops>=300){
      const a = stationed[0];
      const add = Math.min(city.troops-200, 500);
      const comp = getOptimalAIComp(f, city, add);
      a.infantry += comp.infantry; a.cavalry += comp.cavalry; a.archer += comp.archer;
      if (!a.formation) a.formation = comp.formation;
      city.troops -= add;
    }
  });
}

function chooseAIPolicy(f, cities) {
  const st = getState();
  const lowFood = f.food < 800 && cities.reduce((s,c)=>s+c.food,0) < 80 * cities.length;
  const lowGold = f.gold < 600 && cities.reduce((s,c)=>s+c.money,0) < 60 * cities.length;
  const atWar = Object.values(st.factions).some(o => o.id !== f.id && !o.eliminated && relation(f.id, o.id) < -30);
  if (lowFood) return 'tuntian';
  if (lowGold) return 'zhongshang';
  if (atWar && f.troops < 2000) return 'shangwu';
  if (f.personality === 'diplomatic') return 'renzheng';
  return 'tuntian';
}

function chooseAITactic(army, targetCity) {
  const main = army.generals.length ? findGeneral(army.generals[0]) : null;
  if (!main) return 'normal';
  const st = effectiveStats(main);
  // Prefer siege for strong defended cities
  if (st.command >= 70 && targetCity.troops >= 1500 && targetCity.defense >= 1.2) return 'siege';
  // Fire attack for smart generals
  if (st.intelligence >= 75 && TACTICS.fire.req(main, targetCity)) return 'fire';
  // Ambush for smart generals vs weak cities
  if (st.intelligence >= 70 && targetCity.troops < armyTroopTotal(army)) return 'ambush';
  // Water bonus for river cities
  if (RIVER_CITIES.includes(targetCity.name)) return 'water';
  return 'normal';
}

function aiArmyAttack(f) {
  const st = getState();
  const diff = DIFFICULTY[st.difficulty || 'normal'];
  if(f.personality==='expansion' || (f.personality==='diplomatic' && Math.random()<0.3)){
    const myArmies = factionArmies(f.id).filter(a=>armyTroopTotal(a)>=500);
    const targets = [];
    myArmies.forEach(a=>{
      const city = a.city ? findCity(a.city) : null;
      if(!city || city.owner!==f.id) return;   // 校验驻扎城仍属本势力，避免从敌城出兵
      city.neighbors.forEach(n=>{
        const t = findCity(n);
        if(t && t.owner!==f.id && (!t.owner || relation(f.id,t.owner)<80)){
          targets.push({army:a,to:t});
        }
      });
    });
    targets.sort((a,b)=>a.to.troops-b.to.troops);
    for(const atk of targets){
      // 主将受伤则跳过该军团
      const mg = atk.army.generals.length ? findGeneral(atk.army.generals[0]) : null;
      if(mg && mg.injured) continue;
      if(armyTroopTotal(atk.army)>atk.to.troops*diff.aiAttackThreshold){
        if(atk.to.owner) setRelation(f.id,atk.to.owner,-100);
        const tactic = chooseAITactic(atk.army, atk.to);
        armyBattle(f.id, atk.to.owner||'neutral', atk.army, atk.to, tactic);
        checkAchievements();
        if(Math.random()<0.6) break;
      }
    }
  }
}

export {
  aiArmyTacticHint, getOptimalAIComp, pickAIGenerals, chooseAITroopType,
  aiTurn, chooseAIPolicy, chooseAITactic, aiArmyAttack
};
