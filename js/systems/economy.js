import { getState } from '../core/state.js';
import {
  factionCities, factionArmies, getSeason, relation, setRelation,
  findCity, findGeneral, disbandArmiesAt, log
} from '../core/utils.js';
import { DIFFICULTY } from '../config/constants.js';
import { POLICIES } from '../config/policies.js';
import { SKILLS } from '../config/skills.js';
import { EQUIPMENT_POOL } from '../config/equipment.js';
import { aiTurn, aiArmyAttack } from './ai.js';
import { historicalEvents, triggerSeasonEvent, randomEvent, triggerRandomEvent, autoResolveAllPending } from './eventSystem.js';
import { checkEliminations, checkVictory, saveAuto } from './save.js';
import { checkAchievements } from './achievements.js';
import { renderAll } from '../ui/renderer.js';

function awardRandomEquipment() {
  const pool = EQUIPMENT_POOL.filter(it => !it.owned);
  if (!pool.length) return null;
  const weights = pool.map(it => it.rarity);
  const total = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * total;
  for (let i = 0; i < pool.length; i++) {
    r -= weights[i];
    if (r <= 0) {
      pool[i].owned = true;
      return pool[i];
    }
  }
  pool[0].owned = true;
  return pool[0];
}

function nextTurn() {
  const state = getState();
  if(state.gameOver) return;
  state.month++; state.turn++;
  if(state.month>12){ state.month=1; state.year++; }
  // Wound recovery
  state.generals.forEach(g=>{
    if(g.injured){
      g.injuredTurns--;
      if(g.injuredTurns<=0){ g.injured=0; if(g.faction===state.playerId) log(`${g.name} 伤愈复出`); }
    }
  });
  // Resource settlement
  Object.values(state.factions).forEach(f => {
    if (f.eliminated) return;
    const cities = factionCities(f.id);
    const diff = f.ai ? DIFFICULTY[state.difficulty || 'normal'] : null;
    const hasTianming = state.generals.some(g => g.faction === f.id && !g.injured && g.skill === 'tianming');
    const policy = f.policy ? POLICIES[f.policy] : null;
    let foodGain = 0, goldGain = 0;
    let moraleDecay = hasTianming ? SKILLS.tianming.moraleDecay : 1;
    if (policy && policy.id === 'renzheng') moraleDecay *= 0.5;
    cities.forEach(c => {
      let fmul = c.morale / 100, gmul = c.morale / 100;
      const season = getSeason();
      if (season === '春') fmul *= 1.2;
      if (season === '秋') fmul *= 1.3;
      let cityFood = c.food * fmul + state.tech.farm.farmBonus;
      let cityMoney = c.money * gmul + state.tech.comm.commBonus;
      if (policy) {
        if (policy.id === 'tuntian') cityFood *= 1.2;
        if (policy.id === 'tuntian') cityMoney *= 0.95;
        if (policy.id === 'zhongshang') cityMoney *= 1.2;
        if (policy.id === 'zhongshang') cityFood *= 0.95;
      }
      if (diff) {
        cityFood *= diff.aiFoodMul;
        cityMoney *= diff.aiGoldMul;
      }
      foodGain += cityFood;
      goldGain += cityMoney;
      if (season === '夏' && Math.random() < 0.3) c.troops += Math.floor(20 * (1 + 0.2));
      c.morale = Math.max(20, Math.min(100, c.morale - moraleDecay));
    });
    f.food += foodGain; f.gold += goldGain;
    const garrisonTotal = cities.reduce((s, c) => s + c.troops, 0);
    let consume = Math.floor((f.troops + garrisonTotal) / 100) * 20;
    if (policy && policy.id === 'shangwu') consume = Math.floor(consume * 1.1);
    f.food -= consume;
    if (f.food < 0) {
      const decay = Math.floor(Math.abs(f.food) / 5);
      f.troops = Math.max(0, f.troops - decay);
      if (f.id === state.playerId) log(`粮食不足，兵力衰减 ${decay}`);
      f.food = 0;
    }
    f.troops = Math.min(f.troops, cities.length * 3000);
    const myArmies = factionArmies(f.id);
    myArmies.forEach(a => {
      const foodNeed = (Math.floor(a.infantry / 100) * 20 + Math.floor(a.cavalry / 100) * 30 + Math.floor(a.archer / 100) * 22);
      f.food -= foodNeed;
    });
  });
  // AI turns
  Object.values(state.factions).filter(f=>f.ai && !f.eliminated).forEach(f=>{
    aiTurn(f);
    aiArmyAttack(f);
  });
  // Historical events
  historicalEvents();
  // Season events
  triggerSeasonEvent();
  // Random monthly event
  if(state.month===1) randomEvent();
  else if(Math.random()<0.3) triggerRandomEvent(); // 每月30%概率触发随机事件
  // Relation fluctuations
  Object.values(state.factions).forEach(a=>{
    if(a.eliminated) return;
    Object.values(state.factions).forEach(b=>{
      if(b.eliminated || a.id===b.id) return;
      if(Math.random()<0.15){
        setRelation(a.id,b.id,relation(a.id,b.id)+(Math.random()<0.5?-5:5));
      }
    });
  });
  checkEliminations();
  checkVictory();
  checkAchievements();
  autoResolveAllPending(); // 回合结束前自动处理未决的玩家事件
  saveAuto();
  renderAll();
}

export { awardRandomEquipment, nextTurn };
