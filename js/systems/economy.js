import { getState, DEFAULT_TECH } from '../core/state.js';
import { log } from '../core/log.js';
import {
  factionCities, factionArmies, getSeason, relation, setRelation
} from '../core/utils.js';
import { DIFFICULTY, getCityTraitEffects } from '../config/constants.js';
import { getCityBuildingEffects } from '../config/buildings.js';
import { getEliteTroop } from '../config/eliteTroops.js';
import { POLICIES } from '../config/policies.js';
import { SKILLS } from '../config/skills.js';
import { aiTurn, aiArmyAttack } from './ai.js';
import { historicalEvents, triggerSeasonEvent, randomEvent, triggerRandomEvent, autoResolveAllPending } from './eventSystem.js';
import { checkEliminations, checkVictory } from './gameEnd.js';
import { saveAuto } from './save.js';
import { checkAchievements } from './achievements.js';
import { checkQuests } from '../config/quests.js';

function advanceDate(state) {
  state.month++;
  state.turn++;
  if (state.month > 12) {
    state.month = 1;
    state.year++;
  }
}

function resolveWounds(state) {
  state.generals.forEach(g => {
    if (!g.injured) return;
    g.injuredTurns--;
    if (g.injuredTurns <= 0) {
      g.injured = 0;
      if (g.faction === state.playerId) log(`${g.name} 伤愈复出`);
    }
  });
}

function ensureTech(f) {
  if (!f.tech) f.tech = JSON.parse(JSON.stringify(DEFAULT_TECH));
}

function resolveCityResources(f, state) {
  ensureTech(f);
  const cities = factionCities(f.id);
  const diff = f.ai ? DIFFICULTY[state.difficulty || 'normal'] : null;
  const hasTianming = state.generals.some(g => g.faction === f.id && !g.injured && g.skill === 'tianming');
  const policy = f.policy ? POLICIES[f.policy] : null;
  let foodGain = 0, goldGain = 0;
  let moraleDecay = hasTianming ? SKILLS.tianming.moraleDecay : 1;
  if (policy && policy.id === 'renzheng') moraleDecay *= 0.5;

  cities.forEach(c => {
    const traitEffects = getCityTraitEffects(c);
    const buildingEffects = getCityBuildingEffects(c);
    let fmul = c.morale / 100, gmul = c.morale / 100;
    const season = getSeason();
    if (season === '春') fmul *= 1.2;
    if (season === '秋') fmul *= 1.3;
    let cityFood = c.food * fmul * traitEffects.foodMul * buildingEffects.foodMul + f.tech.farm.farmBonus;
    let cityMoney = c.money * gmul * traitEffects.goldMul * buildingEffects.goldMul + f.tech.comm.commBonus;
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

  f.food += foodGain;
  f.gold += goldGain;
  return { cities, policy };
}

function consumeUpkeep(f, cities) {
  const garrisonTotal = cities.reduce((s, c) => s + c.troops, 0);
  const policy = f.policy ? POLICIES[f.policy] : null;
  let consume = Math.floor((f.troops + garrisonTotal) / 100) * 20;
  if (policy && policy.id === 'shangwu') consume = Math.floor(consume * 1.1);
  f.food -= consume;

  if (f.food < 0) {
    const decay = Math.floor(Math.abs(f.food) / 5);
    f.troops = Math.max(0, f.troops - decay);
    if (f.id === getState().playerId) log(`粮食不足，兵力衰减 ${decay}`);
    f.food = 0;
  }
  f.troops = Math.min(f.troops, cities.length * 3000);
}

function consumeArmyFood(f) {
  const myArmies = factionArmies(f.id);
  const eliteCfg = getEliteTroop(f.id);
  myArmies.forEach(a => {
    const eliteFoodMul = eliteCfg ? (eliteCfg.food || 1) : 1;
    const foodNeed = Math.floor(a.infantry / 100) * 20
      + Math.floor(a.cavalry / 100) * 30
      + Math.floor(a.archer / 100) * 22
      + Math.floor((a.elite || 0) / 100) * 20 * (eliteFoodMul - 1);
    f.food -= foodNeed;
  });
}

function resolveResources(state) {
  Object.values(state.factions).forEach(f => {
    if (f.eliminated) return;
    const { cities } = resolveCityResources(f, state);
    consumeUpkeep(f, cities);
    consumeArmyFood(f);
  });
}

function runAI(state) {
  Object.values(state.factions)
    .filter(f => f.ai && !f.eliminated)
    .forEach(f => {
      aiTurn(f);
      aiArmyAttack(f);
    });
}

function triggerEvents() {
  historicalEvents();
  triggerSeasonEvent();
  if (getState().month === 1) randomEvent();
  else if (Math.random() < 0.3) triggerRandomEvent();
}

function updateRelations(state) {
  Object.values(state.factions).forEach(a => {
    if (a.eliminated) return;
    Object.values(state.factions).forEach(b => {
      if (b.eliminated || a.id === b.id) return;
      // 盟友关系保持稳定，不随机波动
      if (a.allies.includes(b.id) && b.allies.includes(a.id)) return;
      if (Math.random() < 0.15) {
        setRelation(a.id, b.id, relation(a.id, b.id) + (Math.random() < 0.5 ? -5 : 5));
      }
    });
  });
}

function endTurnCleanup(state) {
  checkEliminations();
  checkVictory();
  checkAchievements();
  const completed = checkQuests();
  completed.forEach(q => log(`任务完成：${q.name} — ${q.rewardText}`));
  autoResolveAllPending();
  saveAuto();
}

function nextTurn() {
  const state = getState();
  if (state.gameOver) return;

  advanceDate(state);
  resolveWounds(state);
  resolveResources(state);
  runAI(state);
  triggerEvents();
  updateRelations(state);
  endTurnCleanup(state);
}

export { nextTurn };
