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

// 夏季每城免费征募的兵力（受守军上限约束）
const SUMMER_DRAFT_TROOPS = 24;

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
      if (policy.id === 'renzheng') cityMoney *= 1.1;
    }
    if (diff) {
      cityFood *= diff.aiFoodMul;
      cityMoney *= diff.aiGoldMul;
    }
    foodGain += cityFood;
    goldGain += cityMoney;
    if (season === '夏' && Math.random() < 0.3) {
      // 夏季免费征募：与玩家调兵同口径，受守军上限约束
      const cap = 6000 + traitEffects.garrisonCapBonus + buildingEffects.garrisonCapBonus;
      c.troops = Math.min(c.troops + SUMMER_DRAFT_TROOPS, cap);
    }
    c.morale = Math.max(20, Math.min(100, c.morale - moraleDecay));
  });

  f.food += foodGain;
  f.gold += goldGain;
  return { cities, policy };
}

// 军团每回合粮饷需求（并入总消耗，参与饥荒判定）
function armyFoodNeed(f) {
  const myArmies = factionArmies(f.id);
  const eliteCfg = getEliteTroop(f.id);
  let need = 0;
  myArmies.forEach(a => {
    const eliteFoodMul = eliteCfg ? (eliteCfg.food || 1) : 1;
    need += Math.floor(a.infantry / 100) * 20
      + Math.floor(a.cavalry / 100) * 30
      + Math.floor(a.archer / 100) * 22
      + Math.floor((a.elite || 0) / 100) * 20 * (eliteFoodMul - 1);
  });
  return need;
}

// 断粮减员：预备役 → 各城守军 → 军团（按比例削减兵种），杜绝白嫖维持费
function applyFamineDecay(f, cities, decay) {
  let remain = decay;
  const fromReserve = Math.min(f.troops, remain);
  f.troops -= fromReserve;
  remain -= fromReserve;
  if (remain > 0) {
    cities.forEach(c => {
      if (remain <= 0) return;
      const d = Math.min(c.troops, remain);
      c.troops -= d;
      remain -= d;
    });
  }
  if (remain > 0) {
    factionArmies(f.id).forEach(a => {
      if (remain <= 0) return;
      const total = a.infantry + a.cavalry + a.archer + (a.elite || 0);
      if (total <= 0) return;
      const d = Math.min(total, remain);
      const ratio = (total - d) / total;
      a.infantry = Math.floor(a.infantry * ratio);
      a.cavalry = Math.floor(a.cavalry * ratio);
      a.archer = Math.floor(a.archer * ratio);
      a.elite = Math.floor((a.elite || 0) * ratio);
      remain -= d;
    });
  }
}

function consumeUpkeep(f, cities) {
  const garrisonTotal = cities.reduce((s, c) => s + c.troops, 0);
  const policy = f.policy ? POLICIES[f.policy] : null;
  // 军团粮饷与预备役/守军粮耗合并结算，统一参与饥荒判定
  let consume = Math.floor((f.troops + garrisonTotal) / 100) * 20 + armyFoodNeed(f);
  if (policy && policy.id === 'shangwu') consume = Math.floor(consume * 1.1);
  f.food -= consume;

  if (f.food < 0) {
    const decay = Math.floor(Math.abs(f.food) / 5);
    applyFamineDecay(f, cities, decay);
    if (f.id === getState().playerId) log(`粮食不足，兵力衰减 ${decay}`);
    f.food = 0;
  }
  // 预备役超出承载上限时裁减（明示日志，不再静默蒸发）
  const reserveCap = cities.length * 3000;
  if (f.troops > reserveCap) {
    if (f.id === getState().playerId) log(`预备役超出承载上限，裁减 ${f.troops - reserveCap} 兵`);
    f.troops = reserveCap;
  }
}

function resolveResources(state) {
  Object.values(state.factions).forEach(f => {
    if (f.eliminated) return;
    const { cities } = resolveCityResources(f, state);
    consumeUpkeep(f, cities);
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
  saveAuto();
}

function nextTurn() {
  const state = getState();
  if (state.gameOver) return;

  // 先结算上一回合遗留的待处理事件，再进入新回合；本回合新触发的事件留给玩家处理
  autoResolveAllPending();
  advanceDate(state);
  resolveWounds(state);
  resolveResources(state);
  runAI(state);
  triggerEvents();
  updateRelations(state);
  endTurnCleanup(state);
}

export { nextTurn };
