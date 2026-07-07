import { getState } from './state.js';

import { log } from './log.js';

function getSeason() {
  // 按真实四季分段：春3-5、夏6-8、秋9-11、冬12-2
  const m = getState().month;
  if (m >= 3 && m <= 5) return '春';
  if (m >= 6 && m <= 8) return '夏';
  if (m >= 9 && m <= 11) return '秋';
  return '冬';
}
const DEFAULT_PLAYER = { id: '', name: '未知', food: 0, gold: 0, troops: 0, morale: 50, allies: [], eliminated: true, policy: null };
function player() { return getState().factions[getState().playerId] || DEFAULT_PLAYER; }
function factionCities(fid) { return getState().cities.filter(c=>c.owner===fid); }
function factionGenerals(fid) { return getState().generals.filter(g=>g.faction===fid); }
function findCity(name) { return getState().cities.find(c=>c.name===name); }
function findGeneral(name) { return getState().generals.find(g=>g.name===name); }
function relation(a,b) { return getState().relations[a]?.[b] ?? 20; }
function setRelation(a,b,v) {
  const rel = Math.max(-100,Math.min(100,v));
  if(!getState().relations[a]) getState().relations[a] = {};
  if(!getState().relations[b]) getState().relations[b] = {};
  getState().relations[a][b]=getState().relations[b][a]=rel;
}
function factionArmies(fid) { return getState().armies.filter(a=>a.faction===fid); }
function findArmy(id) { return getState().armies.find(a=>a.id===id); }
function armyTroopTotal(a) { return a.infantry + a.cavalry + a.archer; }
function availableGenerals(fid, armyId=null) {
  return getState().generals.filter(g=>g.faction===fid && !g.injured && !getState().armies.some(ar=>ar.id!==armyId && ar.generals.includes(g.name)));
}

function effectiveStats(g) {
  if(!g) return { force: 50, intelligence: 50, command: 50, politics: 50 };
  const levelBonus = Math.floor(g.level / 5) * 2;
  let force = g.force + levelBonus, intelligence = g.intelligence + levelBonus;
  let command = g.command + levelBonus, politics = g.politics + levelBonus;
  Object.values(g.equipment).forEach(item => {
    if(!item) return;
    if(item.force) force += item.force;
    if(item.intelligence) intelligence += item.intelligence;
    if(item.command) command += item.command;
    if(item.politics) politics += item.politics;
  });
  return { force, intelligence, command, politics };
}

function generalExpToLevelUp(level) {
  return 100 + (level - 1) * 50;
}

function addGeneralExp(g, amount) {
  if(!g) return;
  g.exp += amount;
  let leveled = false;
  while(g.exp >= generalExpToLevelUp(g.level)) {
    g.exp -= generalExpToLevelUp(g.level);
    g.level++;
    leveled = true;
  }
  if(leveled) log(`${g.name} 升级至 Lv.${g.level}！`);
}

function removeGeneralFromArmies(name) {
  getState().armies.forEach(a=>{ a.generals = a.generals.filter(n=>n!==name); });
}

// 城池易主时，把守方驻扎在该城的军团遣散（兵力归零、释放武将），避免幽灵军团从敌城出兵
function disbandArmiesAt(cityName, factionId) {
  if(!factionId || factionId==='neutral') return;
  const st = getState();
  st.armies = st.armies.filter(a=>{
    if(a.faction===factionId && a.city===cityName){ return false; }   // 遣散该军团
    return true;
  });
}

export {
  getSeason, player, factionCities, factionGenerals, findCity, findGeneral,
  relation, setRelation, factionArmies, findArmy, armyTroopTotal, availableGenerals,
  effectiveStats, generalExpToLevelUp, addGeneralExp,
  removeGeneralFromArmies, disbandArmiesAt
};
