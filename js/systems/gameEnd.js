import { getState } from '../core/state.js';
import { log } from '../core/log.js';
import { player, factionCities, factionArmies, armyTroopTotal } from '../core/utils.js';

function checkEliminations() {
  Object.values(getState().factions).forEach(f => {
    if (f.eliminated || f.id === getState().playerId) return;
    if (factionCities(f.id).length === 0) {
      // 失去所有城池即灭亡：残余军团兵力归零并清理，避免幽灵军团卡住武将
      getState().armies = getState().armies.filter(a => a.faction !== f.id);
      f.eliminated = true;
      f.ai = false;
      f.troops = 0;
      // 从所有势力的盟友列表中移除
      Object.values(getState().factions).forEach(o => { o.allies = o.allies.filter(a => a !== f.id); });
      log(`${f.name} 势力已彻底灭亡，退出群雄之争。`);
    }
  });
}

function checkVictory() {
  const p = player();
  const total = getState().cities.length;
  const mine = factionCities(getState().playerId).length;
  if (mine >= Math.ceil(total * 0.85)) {
    getState().gameOver = true;
    getState().winner = getState().playerId;
    getState().endingTitle = '统一天下：你赢得了胜利！';
    log(getState().endingTitle);
    return;
  }
  // 灭亡判定：无城池且无可作战军团（含预备役+军团兵力）才判负
  const armyTotal = factionArmies(getState().playerId).reduce((s, a) => s + armyTroopTotal(a), 0);
  const allForces = p.troops + factionCities(getState().playerId).reduce((s, c) => s + c.troops, 0) + armyTotal;
  if ((mine === 0 && armyTotal === 0) || (mine === 0 && p.food <= 0 && p.gold <= 0 && allForces <= 0)) {
    getState().gameOver = true;
    getState().winner = null;
    getState().endingTitle = '你的势力覆灭了。';
    log(getState().endingTitle);
  }
}

export { checkEliminations, checkVictory };
