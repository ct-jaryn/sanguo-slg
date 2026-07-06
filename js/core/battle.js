import { getState } from './state.js';
import {
  armyTroopTotal, findGeneral, factionGenerals, effectiveStats, addGeneralExp,
  findArmy, factionArmies, disbandArmiesAt, factionCities, log
} from './utils.js';
import {
  TROOP_TYPES, COUNTER_BONUS, cityDefenseComp, counterFactor, RIVER_CITIES
} from '../config/constants.js';
import { TACTICS } from '../config/tactics.js';
import { SKILLS } from '../config/skills.js';
import { getFormationMods, getArmyBondBonus, applyTroopTraitMods } from '../systems/ai.js';
import { awardRandomEquipment } from '../systems/economy.js';
import { showBattleFx } from '../ui/renderer.js';
import { showBattleReport } from '../ui/modal.js';
import { playSound } from '../systems/audio.js';
import { checkAchievements } from '../systems/achievements.js';

function armyBattle(attackerId, defenderId, army, targetCity, tacticKey='normal') {
  const total = armyTroopTotal(army);
  const mainGeneral = army.generals.length ? findGeneral(army.generals[0]) : null;
  const atkFaction = getState().factions[attackerId];
  const tactic = TACTICS[tacticKey] || TACTICS.normal;
  const stats = effectiveStats(mainGeneral);
  const atkForm = getFormationMods(army);
  const lossMul = atkForm.lossMul;
  const playerInvolved = attackerId === getState().playerId || defenderId === getState().playerId;
  if (playerInvolved) playSound('attack');

  // 围城：多回合消耗，第一次不判定胜负
  if (tacticKey === 'siege') {
    if (!targetCity.siegeProgress) targetCity.siegeProgress = { attackerId, armyId: army.id, progress: 0, turns: 0 };
    targetCity.siegeProgress.turns++;
    const bond = getArmyBondBonus(army);
    const bondMul = bond.mods.forceMul * bond.mods.atkMul;
    const siegeDamage = Math.floor(total * 0.15 * bondMul);
    targetCity.troops = Math.max(0, targetCity.troops - siegeDamage);
    targetCity.siegeProgress.progress += 25;
    const losses = Math.floor(total * 0.05 * lossMul);
    applyArmyLosses(army, total, losses);
    addGeneralExp(mainGeneral, 15);
    if (playerInvolved && bond.active.length) bond.active.forEach(b => log(`羁绊触发：${b.name}！${b.desc}`));
    log(`${atkFaction.name} 的 ${army.name} 围困 ${targetCity.name}，守军损失 ${siegeDamage}，围城进度 ${targetCity.siegeProgress.progress}%`);
    if (targetCity.siegeProgress.progress >= 100 || targetCity.troops === 0) {
      // 城池投降
      const oldOwner = targetCity.owner;
      disbandArmiesAt(targetCity.name, oldOwner);
      targetCity.owner = attackerId;
      targetCity.troops = Math.max(0, targetCity.troops);
      targetCity.morale = Math.max(30, targetCity.morale - 20);
      army.city = targetCity.name;
      targetCity.siegeProgress = null;
      log(`${atkFaction.name} 的 ${army.name}(${mainGeneral?mainGeneral.name:'无将'}) 攻占了 ${targetCity.name}！围城成功`);
      if(oldOwner && getState().factions[oldOwner] && factionCities(oldOwner).length===0) log(`${getState().factions[oldOwner].name} 势力灭亡！`);
      if (playerInvolved) {
        showBattleFx('大捷！');
        playSound('victory');
        showBattleReport({
          attacker: atkFaction.name, armyName: army.name, mainGeneral: mainGeneral ? mainGeneral.name : '无将',
          defender: oldOwner && getState().factions[oldOwner] ? getState().factions[oldOwner].name : '无主守军',
          cityName: targetCity.name, tacticName: tactic.name, victory: true,
          atkLosses: losses, defLosses: Math.max(0, targetCity.troops),
          reward: 0, equipment: null, bonds: bond.active.map(b => `攻：${b.name}`)
        });
      }
    }
    return;
  }
  // 非围城清除 siegeProgress
  if (targetCity.siegeProgress && targetCity.siegeProgress.attackerId === attackerId) targetCity.siegeProgress = null;

  let attack = 0;
  [['infantry',army.infantry],['cavalry',army.cavalry],['archer',army.archer]].forEach(([typeKey,troops])=>{
    if(troops<=0) return;
    const tt = TROOP_TYPES[typeKey];
    let base = troops * (0.5 + stats.force/200) * (0.5 + stats.command/200) * tt.atk;
    if(typeKey==='archer') base *= tt.siegeAtk;
    attack += base;
  });
  let aMods = {forceMul:1, atkMul:1, moraleMul:1, defMul:1, woundExtra:0};
  let dMods = {forceMul:1, atkMul:1, moraleMul:1, defMul:1, woundExtra:0};
  if(mainGeneral && mainGeneral.skill && SKILLS[mainGeneral.skill] && typeof SKILLS[mainGeneral.skill].battle==='function') SKILLS[mainGeneral.skill].battle(aMods,dMods);

  // 羁绊加成
  const atkBond = getArmyBondBonus(army);
  if (atkBond.active.length) {
    const b = atkBond.mods;
    aMods.forceMul *= b.forceMul; aMods.atkMul *= b.atkMul; aMods.moraleMul *= b.moraleMul; aMods.defMul *= b.defMul; aMods.woundExtra += b.woundExtra;
    if (playerInvolved) atkBond.active.forEach(bond => log(`羁绊触发：${bond.name}！${bond.desc}`));
  }
  const defArmy = getState().armies.find(a => a.faction === defenderId && a.city === targetCity.name);
  const defBond = getArmyBondBonus(defArmy);
  if (defBond.active.length) {
    const b = defBond.mods;
    dMods.forceMul *= b.forceMul; dMods.atkMul *= b.atkMul; dMods.moraleMul *= b.moraleMul; dMods.defMul *= b.defMul; dMods.woundExtra += b.woundExtra;
    if (playerInvolved) defBond.active.forEach(bond => log(`守军羁绊触发：${bond.name}！${bond.desc}`));
  }

  // 阵型加成与兵种特技
  aMods.atkMul *= atkForm.atkMul; aMods.defMul *= atkForm.defMul;
  const defForm = defArmy ? getFormationMods(defArmy) : { atkMul: 1, defMul: 1, lossMul: 1 };
  dMods.atkMul *= defForm.atkMul; dMods.defMul *= defForm.defMul;
  applyTroopTraitMods(army, targetCity, 'attack', aMods);
  if (defArmy) applyTroopTraitMods(defArmy, targetCity, 'defense', dMods);

  attack *= aMods.forceMul * aMods.atkMul * tactic.atk;

  // 水战加成
  if (tactic.waterBonus && RIVER_CITIES.includes(targetCity.name)) attack *= 1.25;

  // 军事科技攻击加成
  attack *= (1 + getState().tech.military.atkBonus / 100);

  // 兵种克制
  const atkShare = { infantry: army.infantry/total, cavalry: army.cavalry/total, archer: army.archer/total };
  const defComp = cityDefenseComp(targetCity);
  attack *= (1 + COUNTER_BONUS * counterFactor(atkShare, defComp));

  const defGeneral = defenderId!=='neutral' ? factionGenerals(defenderId).filter(g=>!g.injured).sort((a,b)=>b.command-a.command)[0] : null;
  const defStats = effectiveStats(defGeneral);
  if(defGeneral && defGeneral.skill && SKILLS[defGeneral.skill] && typeof SKILLS[defGeneral.skill].battle==='function') SKILLS[defGeneral.skill].battle(dMods,aMods);

  let defense = targetCity.troops * 1.2 * (targetCity.defense + getState().tech.fort.defBonus) * dMods.defMul * dMods.moraleMul * (0.8+Math.random()*0.4);
  defense *= (1 + COUNTER_BONUS * counterFactor(defComp, atkShare));
  if(defGeneral) defense *= (0.5 + defStats.command/200);
  if(defGeneral && defGeneral.skill==='lianying') defense *= (1 + SKILLS.lianying.defend);
  if(getState().eventsTriggered.chibi && attackerId==='cao' && (targetCity.name==='荆州'||targetCity.name==='扬州') && getState().factions.sun.allies.includes('liu')) attack*=0.7;

  const originalDefTroops = targetCity.troops;
  const victory = attack > defense;
  const report = {
    attacker: atkFaction.name, armyName: army.name, mainGeneral: mainGeneral ? mainGeneral.name : '无将',
    defender: defenderId === 'neutral' ? '无主守军' : getState().factions[defenderId].name,
    cityName: targetCity.name, tacticName: tactic.name, victory,
    bonds: []
  };
  if (atkBond.active.length) report.bonds.push(...atkBond.active.map(b => `攻：${b.name}`));
  if (defBond.active.length) report.bonds.push(...defBond.active.map(b => `守：${b.name}`));
  let dropped = null;
  if (victory) {
    getState().stats.wins++;
    getState().stats.battles++;
    const losses = Math.floor(total * 0.25 * tactic.loss * lossMul);
    const survivors = total - losses;
    const garrison = Math.floor(survivors / 2);
    applyArmyLosses(army, total, losses);
    targetCity.troops = garrison;
    const oldOwner = targetCity.owner;
    if (oldOwner) getState().stats.generalsDefeated++;
    disbandArmiesAt(targetCity.name, oldOwner);
    targetCity.owner = attackerId;
    targetCity.morale = Math.max(30, targetCity.morale - 20);
    army.city = targetCity.name;
    const reward = 200 * (mainGeneral && mainGeneral.skill === 'jianxiong' ? SKILLS.jianxiong.rewardGold : 1);
    atkFaction.gold += reward;
    // 火攻：额外守军损失
    if (tacticKey === 'fire') {
      targetCity.troops = Math.floor(targetCity.troops * (1 - tactic.fireDamage));
    }
    if (mainGeneral && mainGeneral.skill === 'huoji') targetCity.troops = Math.floor(targetCity.troops * (1 - SKILLS.huoji.fire));
    addGeneralExp(mainGeneral, 30);
    if (defGeneral) addGeneralExp(defGeneral, 10);
    dropped = awardRandomEquipment();
    if (dropped) log(`缴获装备：${dropped.name}`);
    log(`${atkFaction.name} 的 ${army.name}(${mainGeneral ? mainGeneral.name : '无将'}) 攻占了 ${targetCity.name}！损失 ${losses} 兵力`);
    if (oldOwner && getState().factions[oldOwner] && factionCities(oldOwner).length === 0) log(`${getState().factions[oldOwner].name} 势力灭亡！`);
    report.atkLosses = losses;
    report.defLosses = Math.max(0, originalDefTroops - targetCity.troops);
    report.reward = reward;
    report.equipment = dropped ? dropped.name : null;
  } else {
    getState().stats.battles++;
    let losses = Math.floor(total * 0.4 * tactic.loss * lossMul);
    applyArmyLosses(army, total, losses);
    targetCity.troops = Math.floor(targetCity.troops * 0.85);
    if (mainGeneral) {
      let woundChance = 0.3 + aMods.woundExtra;
      if (mainGeneral.skill && SKILLS[mainGeneral.skill].wound) woundChance *= SKILLS[mainGeneral.skill].wound;
      if (Math.random() < woundChance) { mainGeneral.injured = 1; mainGeneral.injuredTurns = 1 + Math.floor(Math.random() * 2); log(`${mainGeneral.name} 受伤，需休养 ${mainGeneral.injuredTurns} 月`); }
    }
    addGeneralExp(mainGeneral, 15);
    if (defGeneral) addGeneralExp(defGeneral, 20);
    log(`${atkFaction.name} 的 ${army.name} 进攻 ${targetCity.name} 失败，损失 ${losses} 兵力`);
    report.atkLosses = losses;
    report.defLosses = Math.floor(originalDefTroops * 0.15);
    report.reward = 0;
    report.equipment = null;
  }
  if (playerInvolved) {
    showBattleFx(victory ? '大捷！' : '败退', victory ? '' : 'defeat');
    playSound(victory ? 'victory' : 'defeat');
    showBattleReport(report);
  }
  checkAchievements();
}

function applyArmyLosses(army, total, losses) {
  const ratio = Math.max(0, (total - losses) / total);
  army.infantry = Math.floor(army.infantry * ratio);
  army.cavalry = Math.floor(army.cavalry * ratio);
  army.archer = Math.floor(army.archer * ratio);
}

function battle(attackerId, defenderId, general, atkTroops, targetCity, troopTypeKey) {
  const atkFaction = getState().factions[attackerId];
  const troopType = TROOP_TYPES[troopTypeKey];
  const defTroops = targetCity.troops;
  const stats = effectiveStats(general);
  let aMods = {forceMul:1, atkMul:1, moraleMul:1, defMul:1, woundExtra:0};
  let dMods = {forceMul:1, atkMul:1, moraleMul:1, defMul:1, woundExtra:0};
  if(general && general.skill && SKILLS[general.skill] && typeof SKILLS[general.skill].battle === 'function') SKILLS[general.skill].battle(aMods,dMods);
  // 兵种特技
  if (troopTypeKey === 'cavalry') aMods.atkMul *= 1.15;
  if (troopTypeKey === 'archer' && targetCity.troops > 1500) aMods.atkMul *= 1.1;
  const defGeneral = defenderId!=='neutral' ? factionGenerals(defenderId).filter(g=>!g.injured).sort((a,b)=>b.command-a.command)[0] : null;
  const defStats = effectiveStats(defGeneral);
  if(defGeneral && defGeneral.skill && SKILLS[defGeneral.skill] && typeof SKILLS[defGeneral.skill].battle==='function') SKILLS[defGeneral.skill].battle(dMods,aMods);
  let attack = atkTroops * (0.5 + stats.force/200 * aMods.forceMul) * (0.5 + stats.command/200) * troopType.atk * aMods.atkMul;
  attack *= (1 + getState().tech.military.atkBonus / 100);
  if(troopTypeKey==='archer') attack *= troopType.siegeAtk;
  const atkShare = { infantry: troopTypeKey==='infantry'?1:0, cavalry: troopTypeKey==='cavalry'?1:0, archer: troopTypeKey==='archer'?1:0 };
  const defComp = cityDefenseComp(targetCity);
  attack *= (1 + COUNTER_BONUS * counterFactor(atkShare, defComp));
  let defense = targetCity.troops * 1.2 * (targetCity.defense + getState().tech.fort.defBonus) * dMods.defMul * dMods.moraleMul * (0.8+Math.random()*0.4);
  defense *= (1 + COUNTER_BONUS * counterFactor(defComp, atkShare));
  if(defGeneral) defense *= (0.5 + defStats.command/200);
  if(defGeneral && defGeneral.skill==='lianying') defense *= (1 + SKILLS.lianying.defend);
  if(getState().eventsTriggered.chibi && attackerId==='cao' && (targetCity.name==='荆州'||targetCity.name==='扬州') && getState().factions.sun.allies.includes('liu')) attack*=0.7;

  atkFaction.troops -= atkTroops;
  let victory = attack > defense;
  if (victory) {
    getState().stats.wins++;
    getState().stats.battles++;
    const losses = Math.floor(atkTroops * 0.25);
    const survivors = atkTroops - losses;
    const garrison = Math.floor(survivors / 2);
    atkFaction.troops += survivors - garrison;
    targetCity.troops = garrison;
    const oldOwner = targetCity.owner;
    if (oldOwner) getState().stats.generalsDefeated++;
    disbandArmiesAt(targetCity.name, oldOwner);
    targetCity.owner = attackerId;
    targetCity.morale = Math.max(30, targetCity.morale - 20);
    const reward = 200 * (general && general.skill === 'jianxiong' ? SKILLS.jianxiong.rewardGold : 1);
    atkFaction.gold += reward;
    if (general && general.skill === 'huoji') targetCity.troops = Math.floor(targetCity.troops * (1 - SKILLS.huoji.fire));
    addGeneralExp(general, 25);
    if (defGeneral) addGeneralExp(defGeneral, 8);
    const dropped = awardRandomEquipment();
    if (dropped) log(`缴获装备：${dropped.name}`);
    log(`${atkFaction.name} 的 ${general.name} 攻占了 ${targetCity.name}！损失 ${losses} 兵力`);
    if (oldOwner && getState().factions[oldOwner]) {
      const old = getState().factions[oldOwner];
      if (factionCities(oldOwner).length === 0) log(`${old.name} 势力灭亡！`);
    }
  } else {
    getState().stats.battles++;
    const losses = Math.floor(atkTroops * 0.4);
    const survivors = atkTroops - losses;
    atkFaction.troops += survivors;
    targetCity.troops = Math.floor(defTroops * 0.85);
    let woundChance = 0.3 + aMods.woundExtra;
    if (general && general.skill && SKILLS[general.skill].wound) woundChance *= SKILLS[general.skill].wound;
    if (Math.random() < woundChance) { general.injured = 1; general.injuredTurns = 1 + Math.floor(Math.random() * 2); log(`${general.name} 受伤，需休养 ${general.injuredTurns} 月`); }
    addGeneralExp(general, 12);
    if (defGeneral) addGeneralExp(defGeneral, 15);
    log(`${atkFaction.name} 进攻 ${targetCity.name} 失败，损失 ${losses} 兵力`);
  }
  checkAchievements();
}

export { armyBattle, battle, applyArmyLosses };
