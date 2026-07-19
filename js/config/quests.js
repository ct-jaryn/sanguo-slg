// 任务系统配置
// 任务在特定条件达成时自动完成并发放奖励

import { getState } from '../core/state.js';
import { player, factionCities, factionGenerals, findCity } from '../core/utils.js';
import { EQUIPMENT_POOL } from './equipment.js';

const QUESTS = [
  {
    id: 'first_city',
    name: '初占城池',
    desc: '攻占第一座非起始城池',
    condition: () => factionCities(getState().playerId).length > (getState().startCityCount || 0),
    reward: (state) => { player().gold += 500; player().food += 300; return '金钱+500 粮食+300'; }
  },
  {
    id: 'own_5_cities',
    name: '五城之主',
    desc: '在起始城池基础上再占 5 座城池',
    condition: () => factionCities(getState().playerId).length >= (getState().startCityCount || 0) + 5,
    reward: () => { player().gold += 800; player().troops += 800; return '金钱+800 兵力+800'; }
  },
  {
    id: 'take_luoyang',
    name: '问鼎中原',
    desc: '攻占帝都洛阳',
    condition: () => { const c = findCity('洛阳'); return c && c.owner === getState().playerId; },
    reward: () => { player().gold += 1500; player().morale = Math.min(100, player().morale + 10); return '金钱+1500 士气+10'; }
  },
  {
    id: 'recruit_zhuge',
    name: '卧龙入世',
    desc: '招募诸葛亮加入麾下',
    condition: () => factionGenerals(getState().playerId).some(g => g.name === '诸葛亮'),
    reward: () => { player().gold += 1000; player().food += 1000; return '金钱+1000 粮食+1000'; }
  },
  {
    id: 'five_wins',
    name: '连战连捷',
    desc: '累计取得 5 场战斗胜利',
    condition: () => (getState().stats && getState().stats.wins >= 5),
    reward: () => {
      const pool = getState().equipmentPool.filter(it => !it.owned);
      if (pool.length) {
        const item = pool[Math.floor(Math.random() * pool.length)];
        item.owned = true;
        return `获得装备：${item.name}`;
      }
      player().gold += 600;
      return '金钱+600';
    }
  },
  {
    id: 'wealth_3000',
    name: '富甲一方',
    desc: '金钱达到 3000',
    condition: () => player().gold >= 3000,
    reward: () => { player().food += 1500; return '粮食+1500'; }
  },
  {
    id: 'granary_5000',
    name: '仓廪充实',
    desc: '粮食达到 5000',
    condition: () => player().food >= 5000,
    reward: () => { player().troops += 1000; return '兵力+1000'; }
  },
  {
    id: 'eliminate_lvbu',
    name: '诛灭吕布',
    desc: '消灭吕布势力',
    condition: () => { const f = getState().factions.lv; return f && f.eliminated; },
    reward: () => { player().gold += 1200; player().troops += 1000; return '金钱+1200 兵力+1000'; }
  },
  {
    id: 'tech_military_3',
    name: '强军之路',
    desc: '军事科技达到 3 级',
    condition: () => player().tech && player().tech.military && player().tech.military.level >= 3,
    reward: () => { player().gold += 600; player().food += 600; return '金钱+600 粮食+600'; }
  },
  {
    id: 'defeat_yuan',
    name: '平定河北',
    desc: '消灭袁绍势力',
    condition: () => { const f = getState().factions.yuan; return f && f.eliminated; },
    reward: () => { player().gold += 1500; player().food += 1500; return '金钱+1500 粮食+1500'; }
  }
];

function checkQuests() {
  const state = getState();
  if (!state.quests) state.quests = {};
  const completed = [];
  QUESTS.forEach(q => {
    if (state.quests[q.id]) return;
    let ok = false;
    try { ok = q.condition(); } catch (e) {}
    if (ok) {
      const rewardText = q.reward(state);
      state.quests[q.id] = { completedAt: { year: state.year, month: state.month, turn: state.turn } };
      completed.push({ ...q, rewardText });
    }
  });
  return completed;
}

export { QUESTS, checkQuests };
