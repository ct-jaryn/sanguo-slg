import { getState } from './state.js';
import { log } from './log.js';
import {
  armyTroopTotal, findGeneral, factionGenerals, effectiveStats, addGeneralExp,
  disbandArmiesAt, factionCities
} from './utils.js';
import {
  TROOP_TYPES, COUNTER_BONUS, cityDefenseComp, counterFactor, RIVER_CITIES,
  FORMATIONS, getCityTraitEffects, troopLevelBonus, addTroopXP
} from '../config/constants.js';
import { getEliteTroop, eliteRatio } from '../config/eliteTroops.js';
import { getCityBuildingEffects } from '../config/buildings.js';
import { BONDS } from '../config/bonds.js';
import { TACTICS } from '../config/tactics.js';
import { SKILLS } from '../config/skills.js';


function armyBattle(attackerId, defenderId, army, targetCity, tacticKey='normal') {
  const total = armyTroopTotal(army);
  const mainGeneral = army.generals.length ? findGeneral(army.generals[0]) : null;
  const atkFaction = getState().factions[attackerId];
  const tactic = TACTICS[tacticKey] || TACTICS.normal;
  const stats = effectiveStats(mainGeneral);
  const atkForm = getFormationMods(army);
  const lossMul = atkForm.lossMul;
  const playerInvolved = attackerId === getState().playerId || defenderId === getState().playerId;
  const atkEliteCfg = getEliteTroop(attackerId);

  // 围城：多回合消耗，第一次不判定胜负
  if (tacticKey === 'siege') {
    // 围城进度归属其他势力时不继承，重建
    if (!targetCity.siegeProgress || targetCity.siegeProgress.attackerId !== attackerId) targetCity.siegeProgress = { attackerId, armyId: army.id, progress: 0, turns: 0 };
    targetCity.siegeProgress.turns++;
    const bond = getArmyBondBonus(army);
    const bondMul = bond.mods.forceMul * bond.mods.atkMul;
    const cityTraits = getCityTraitEffects(targetCity);
    let siegeMul = 1;
    if (atkEliteCfg && atkEliteCfg.siegeAtk) {
      const ratio = eliteRatio(army, atkEliteCfg);
      siegeMul = 1 + ratio * (atkEliteCfg.siegeAtk - 1);
    }
    const originalDefTroops = targetCity.troops;
    const siegeDamage = Math.floor(total * 0.15 * bondMul * siegeMul / cityTraits.defMul * cityTraits.defenseMul);
    targetCity.troops = Math.max(0, targetCity.troops - siegeDamage);
    targetCity.siegeProgress.progress += Math.floor(25 / cityTraits.defMul);
    const losses = Math.floor(total * 0.05 * tactic.loss * lossMul);
    applyArmyLosses(army, total, losses);
    addGeneralExp(mainGeneral, 15);
    if (playerInvolved && bond.active.length) bond.active.forEach(b => log(`羁绊触发：${b.name}！${b.desc}`));
    log(`${atkFaction.name} 的 ${army.name} 围困 ${targetCity.name}，守军损失 ${siegeDamage}，围城进度 ${targetCity.siegeProgress.progress}%`);
    if (targetCity.siegeProgress.progress >= 100 || targetCity.troops === 0) {
      // 城池投降
      const oldOwner = targetCity.owner;
      const defLosses = Math.max(0, originalDefTroops - targetCity.troops);
      disbandArmiesAt(targetCity.name, oldOwner);
      targetCity.owner = attackerId;
      targetCity.morale = Math.max(30, targetCity.morale - 20);
      army.city = targetCity.name;
      targetCity.siegeProgress = null;
      // 破城后安置驻军：从军团幸存兵力中拨付，不留空城
      const remain = armyTroopTotal(army);
      const garrison = Math.floor(remain / 2);
      if (remain > 0) applyArmyLosses(army, remain, garrison);
      targetCity.troops = garrison;
      log(`${atkFaction.name} 的 ${army.name}(${mainGeneral?mainGeneral.name:'无将'}) 攻占了 ${targetCity.name}！围城成功`);
      if(oldOwner && getState().factions[oldOwner] && factionCities(oldOwner).length===0) log(`${getState().factions[oldOwner].name} 势力灭亡！`);
      return {
        playerInvolved, victory: true,
        report: {
          attacker: atkFaction.name, armyName: army.name, mainGeneral: mainGeneral ? mainGeneral.name : '无将',
          defender: oldOwner && getState().factions[oldOwner] ? getState().factions[oldOwner].name : '无主守军',
          cityName: targetCity.name, tacticName: tactic.name, victory: true,
          atkLosses: losses, defLosses,
          reward: 0, equipment: null, bonds: bond.active.map(b => `攻：${b.name}`)
        },
        fxText: '大捷！', sound: 'victory'
      };
    }
    return { playerInvolved, victory: false, report: null, fxText: null, sound: null };
  }
  // 非围城清除 siegeProgress
  if (targetCity.siegeProgress && targetCity.siegeProgress.attackerId === attackerId) targetCity.siegeProgress = null;

  let attack = 0;
  [['infantry',army.infantry],['cavalry',army.cavalry],['archer',army.archer]].forEach(([typeKey,troops])=>{
    if(troops<=0) return;
    const tt = TROOP_TYPES[typeKey];
    const lvlBonus = troopLevelBonus(army.troopLevel?.[typeKey] || 1);
    let base = troops * (0.5 + stats.force/200) * (0.5 + stats.command/200) * tt.atk * lvlBonus;
    if(typeKey==='archer') base *= tt.siegeAtk;
    if (atkEliteCfg && typeKey === atkEliteCfg.base) {
      const ratio = eliteRatio(army, atkEliteCfg);
      base *= (1 + ratio * (atkEliteCfg.atk - 1));
    }
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

  attack *= aMods.forceMul * aMods.atkMul * aMods.moraleMul * aMods.defMul * tactic.atk;

  const cityTraits = getCityTraitEffects(targetCity);

  // 水战加成
  if (tactic.waterBonus && RIVER_CITIES.includes(targetCity.name)) {
    let waterMul = 1.25 * cityTraits.waterAtkMul;
    if (atkEliteCfg && atkEliteCfg.waterAtk) {
      const ratio = eliteRatio(army, atkEliteCfg);
      waterMul *= (1 + ratio * (atkEliteCfg.waterAtk - 1));
    }
    attack *= waterMul;
  }

  // 军事科技攻击加成
  attack *= (1 + (atkFaction?.tech?.military?.atkBonus || 0) / 100);

  // 兵种克制
  const atkShare = { infantry: army.infantry/(total||1), cavalry: army.cavalry/(total||1), archer: army.archer/(total||1) };
  const defComp = cityDefenseComp(targetCity);
  attack *= (1 + COUNTER_BONUS * counterFactor(atkShare, defComp));

  // 要冲：被进攻时受到伤害降低
  attack *= cityTraits.defenseMul;

  const defFaction = targetCity.owner ? getState().factions[targetCity.owner] : null;
  const fortBonus = defFaction?.tech?.fort?.defBonus || 0;
  const buildingEffects = getCityBuildingEffects(targetCity);
  const buildingDefBonus = buildingEffects.defenseBonus || 0;

  const defGeneral = defenderId!=='neutral' ? factionGenerals(defenderId).filter(g=>!g.injured).sort((a,b)=>b.command-a.command)[0] : null;
  const defStats = effectiveStats(defGeneral);
  if(defGeneral && defGeneral.skill && SKILLS[defGeneral.skill] && typeof SKILLS[defGeneral.skill].battle==='function') SKILLS[defGeneral.skill].battle(dMods,aMods);

  let defense = targetCity.troops * 1.2 * (targetCity.defense * cityTraits.defMul + fortBonus + buildingDefBonus) * dMods.defMul * dMods.moraleMul * dMods.forceMul * dMods.atkMul * (0.8+Math.random()*0.4);
  const defEliteCfg = defenderId !== 'neutral' ? getEliteTroop(defenderId) : null;
  if (defEliteCfg && defArmy) {
    const ratio = eliteRatio(defArmy, defEliteCfg);
    defense *= (1 + ratio * (defEliteCfg.def - 1));
  }
  defense *= (1 + COUNTER_BONUS * counterFactor(defComp, atkShare));
  if(defGeneral) defense *= (0.5 + defStats.command/200);
  if(defGeneral && defGeneral.skill==='lianying') defense *= (1 + SKILLS.lianying.defend);
  if(getState().eventsTriggered.chibi && attackerId==='cao' && (targetCity.name==='荆州'||targetCity.name==='扬州') && getState().factions.sun?.allies?.includes('liu')) attack*=0.7;

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
    if (attackerId === getState().playerId) getState().stats.wins++;
    getState().stats.battles++;
    // 火攻/火计：城破结算前对原守军造成额外损失，火攻并削减城防
    if (tacticKey === 'fire') {
      targetCity.troops = Math.floor(targetCity.troops * (1 - tactic.fireDamage));
      targetCity.defense = Math.max(0, targetCity.defense * (1 - tactic.fireDamage));
    }
    if (mainGeneral && mainGeneral.skill === 'huoji') targetCity.troops = Math.floor(targetCity.troops * (1 - SKILLS.huoji.fire));
    const losses = Math.floor(total * 0.25 * tactic.loss * lossMul);
    const survivors = total - losses;
    const garrison = Math.floor(survivors / 2);
    // 驻军从军团幸存兵力中扣除，不凭空造兵
    applyArmyLosses(army, total, losses + garrison);
    targetCity.troops = garrison;
    const oldOwner = targetCity.owner;
    if (oldOwner) getState().stats.generalsDefeated++;
    disbandArmiesAt(targetCity.name, oldOwner);
    targetCity.owner = attackerId;
    targetCity.siegeProgress = null;
    targetCity.morale = Math.max(30, targetCity.morale - 20);
    army.city = targetCity.name;
    const reward = 200 * (mainGeneral && mainGeneral.skill === 'jianxiong' ? SKILLS.jianxiong.rewardGold : 1);
    atkFaction.gold += reward;
    addGeneralExp(mainGeneral, 30);
    if (defGeneral) addGeneralExp(defGeneral, 10);
    [['infantry', army.infantry], ['cavalry', army.cavalry], ['archer', army.archer]].forEach(([type, count]) => { if (count > 0) addTroopXP(army, type, 25); });
    // 仅玩家攻城胜利时掉落装备，避免 AI 抽干玩家装备池
    if (attackerId === getState().playerId) {
      dropped = awardRandomEquipment(targetCity);
      if (dropped) log(`缴获装备：${dropped.name}`);
    }
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
    [['infantry', army.infantry], ['cavalry', army.cavalry], ['archer', army.archer]].forEach(([type, count]) => { if (count > 0) addTroopXP(army, type, 10); });
    log(`${atkFaction.name} 的 ${army.name} 进攻 ${targetCity.name} 失败，损失 ${losses} 兵力`);
    report.atkLosses = losses;
    report.defLosses = Math.floor(originalDefTroops * 0.15);
    report.reward = 0;
    report.equipment = null;
  }
  return {
    playerInvolved, victory,
    report,
    fxText: victory ? '大捷！' : '败退',
    sound: victory ? 'victory' : 'defeat'
  };
}

function applyArmyLosses(army, total, losses) {
  const ratio = Math.max(0, (total - losses) / total);
  army.infantry = Math.floor(army.infantry * ratio);
  army.cavalry = Math.floor(army.cavalry * ratio);
  army.archer = Math.floor(army.archer * ratio);
  if (army.elite) army.elite = Math.floor(army.elite * ratio);
}

function getArmyBondBonus(army) {
  const mods = { forceMul: 1, atkMul: 1, defMul: 1, moraleMul: 1, woundExtra: 0 };
  const active = [];
  if (!army || !army.generals.length) return { mods, active };
  BONDS.forEach(bond => {
    const need = bond.require || bond.members.length;
    const matched = bond.members.filter(name => army.generals.includes(name));
    if (matched.length >= need) {
      active.push(bond);
      const bonus = bond.bonus;
      if (bonus.forceMul) mods.forceMul *= bonus.forceMul;
      if (bonus.atkMul) mods.atkMul *= bonus.atkMul;
      if (bonus.defMul) mods.defMul *= bonus.defMul;
      if (bonus.moraleMul) mods.moraleMul *= bonus.moraleMul;
      if (bonus.woundExtra) mods.woundExtra += bonus.woundExtra;
    }
  });
  return { mods, active };
}

function getFormationMods(army) {
  const f = FORMATIONS[army.formation] || FORMATIONS.yulin;
  const total = armyTroopTotal(army);
  const share = total ? { infantry: army.infantry / total, cavalry: army.cavalry / total, archer: army.archer / total } : { infantry: 0, cavalry: 0, archer: 0 };
  const mods = { atkMul: f.atk, defMul: f.def, lossMul: f.lossMul || 1 };
  if (f.cavalryAtk && share.cavalry >= 0.4) mods.atkMul *= 1 + f.cavalryAtk;
  if (f.archerAtk && share.archer >= 0.4) mods.atkMul *= 1 + f.archerAtk;
  if (f.infantryDef && share.infantry >= 0.4) mods.defMul *= 1 + f.infantryDef;
  return mods;
}

function applyTroopTraitMods(army, targetCity, side, mods) {
  const total = armyTroopTotal(army);
  if (!total) return;
  const share = { infantry: army.infantry / total, cavalry: army.cavalry / total, archer: army.archer / total };
  if (side === 'attack') {
    if (share.cavalry >= 0.4) mods.atkMul *= 1.15;
    if (share.archer >= 0.4 && targetCity.troops > 1500) mods.atkMul *= 1.1;
  } else {
    if (share.infantry >= 0.4) mods.defMul *= 1.1;
  }
}

function awardRandomEquipment(city) {
  const pool = getState().equipmentPool.filter(it => !it.owned);
  if (!pool.length) return null;
  let dropMul = 1;
  if (city) {
    const buildingEffects = getCityBuildingEffects(city);
    dropMul += buildingEffects.dropBonus || 0;
  }
  // 基础掉落概率：60%，工坊增加概率
  if (Math.random() > 0.6 * Math.min(1.5, dropMul)) return null;
  const weights = pool.map(it => 5 - it.rarity); // 反比权重：越稀有掉落越少
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

function estimateBattle(army, targetCity, tacticKey = 'normal') {
  const total = armyTroopTotal(army);
  const attackerId = army.faction;
  const defenderId = targetCity.owner || 'neutral';
  const mainGeneral = army.generals.length ? findGeneral(army.generals[0]) : null;
  const stats = effectiveStats(mainGeneral);
  const atkFaction = getState().factions[attackerId];
  const tactic = TACTICS[tacticKey] || TACTICS.normal;
  const atkForm = getFormationMods(army);
  const atkEliteCfg = getEliteTroop(attackerId);

  let attack = 0;
  [['infantry', army.infantry], ['cavalry', army.cavalry], ['archer', army.archer]].forEach(([typeKey, troops]) => {
    if (troops <= 0) return;
    const tt = TROOP_TYPES[typeKey];
    const lvlBonus = troopLevelBonus(army.troopLevel?.[typeKey] || 1);
    let base = troops * (0.5 + stats.force / 200) * (0.5 + stats.command / 200) * tt.atk * lvlBonus;
    if (typeKey === 'archer') base *= tt.siegeAtk;
    if (atkEliteCfg && typeKey === atkEliteCfg.base) {
      const ratio = eliteRatio(army, atkEliteCfg);
      base *= (1 + ratio * (atkEliteCfg.atk - 1));
    }
    attack += base;
  });

  let aMods = { forceMul: 1, atkMul: 1, moraleMul: 1, defMul: 1, woundExtra: 0 };
  let dMods = { forceMul: 1, atkMul: 1, moraleMul: 1, defMul: 1, woundExtra: 0 };
  if (mainGeneral && mainGeneral.skill && SKILLS[mainGeneral.skill] && typeof SKILLS[mainGeneral.skill].battle === 'function') SKILLS[mainGeneral.skill].battle(aMods, dMods);

  const atkBond = getArmyBondBonus(army);
  if (atkBond.active.length) {
    const b = atkBond.mods;
    aMods.forceMul *= b.forceMul; aMods.atkMul *= b.atkMul; aMods.moraleMul *= b.moraleMul; aMods.defMul *= b.defMul; aMods.woundExtra += b.woundExtra;
  }
  const defArmy = getState().armies.find(a => a.faction === defenderId && a.city === targetCity.name);
  const defBond = getArmyBondBonus(defArmy);
  if (defBond.active.length) {
    const b = defBond.mods;
    dMods.forceMul *= b.forceMul; dMods.atkMul *= b.atkMul; dMods.moraleMul *= b.moraleMul; dMods.defMul *= b.defMul; dMods.woundExtra += b.woundExtra;
  }

  aMods.atkMul *= atkForm.atkMul; aMods.defMul *= atkForm.defMul;
  const defForm = defArmy ? getFormationMods(defArmy) : { atkMul: 1, defMul: 1, lossMul: 1 };
  dMods.atkMul *= defForm.atkMul; dMods.defMul *= defForm.defMul;
  applyTroopTraitMods(army, targetCity, 'attack', aMods);
  if (defArmy) applyTroopTraitMods(defArmy, targetCity, 'defense', dMods);

  attack *= aMods.forceMul * aMods.atkMul * aMods.moraleMul * aMods.defMul * tactic.atk;

  const cityTraits = getCityTraitEffects(targetCity);
  if (tactic.waterBonus && RIVER_CITIES.includes(targetCity.name)) {
    let waterMul = 1.25 * cityTraits.waterAtkMul;
    if (atkEliteCfg && atkEliteCfg.waterAtk) {
      const ratio = eliteRatio(army, atkEliteCfg);
      waterMul *= (1 + ratio * (atkEliteCfg.waterAtk - 1));
    }
    attack *= waterMul;
  }

  attack *= (1 + (atkFaction?.tech?.military?.atkBonus || 0) / 100);

  const atkShare = { infantry: army.infantry / (total || 1), cavalry: army.cavalry / (total || 1), archer: army.archer / (total || 1) };
  const defComp = cityDefenseComp(targetCity);
  attack *= (1 + COUNTER_BONUS * counterFactor(atkShare, defComp));
  attack *= cityTraits.defenseMul;

  const defFaction = targetCity.owner ? getState().factions[targetCity.owner] : null;
  const fortBonus = defFaction?.tech?.fort?.defBonus || 0;
  const buildingDefBonus = getCityBuildingEffects(targetCity).defenseBonus || 0;
  const defGeneral = defenderId !== 'neutral' ? factionGenerals(defenderId).filter(g => !g.injured).sort((a, b) => b.command - a.command)[0] : null;
  const defStats = effectiveStats(defGeneral);
  if (defGeneral && defGeneral.skill && SKILLS[defGeneral.skill] && typeof SKILLS[defGeneral.skill].battle === 'function') SKILLS[defGeneral.skill].battle(dMods, aMods);

  let defense = targetCity.troops * 1.2 * (targetCity.defense * cityTraits.defMul + fortBonus + buildingDefBonus) * dMods.defMul * dMods.moraleMul * dMods.forceMul * dMods.atkMul;
  const defEliteCfg = defenderId !== 'neutral' ? getEliteTroop(defenderId) : null;
  if (defEliteCfg && defArmy) {
    const ratio = eliteRatio(defArmy, defEliteCfg);
    defense *= (1 + ratio * (defEliteCfg.def - 1));
  }
  defense *= (1 + COUNTER_BONUS * counterFactor(defComp, atkShare));
  if (defGeneral) defense *= (0.5 + defStats.command / 200);
  if (defGeneral && defGeneral.skill === 'lianying') defense *= (1 + SKILLS.lianying.defend);
  if (getState().eventsTriggered.chibi && attackerId === 'cao' && (targetCity.name === '荆州' || targetCity.name === '扬州') && getState().factions.sun?.allies?.includes('liu')) attack *= 0.7;

  const ratio = attack / (attack + defense || 1);
  let chance = Math.round(ratio * 100);
  let hint = '';
  if (chance >= 75) hint = '胜券在握';
  else if (chance >= 55) hint = '优势在握';
  else if (chance >= 45) hint = '胜负难料';
  else if (chance >= 25) hint = '处于劣势';
  else hint = '凶多吉少';

  const counterTip = counterFactor(atkShare, defComp) > 0.05 ? '（兵种克制守军）' : (counterFactor(defComp, atkShare) > 0.05 ? '（守军克制你）' : '');

  return {
    atkPower: Math.round(attack),
    defPower: Math.round(defense),
    chance,
    hint,
    counterTip,
    tacticName: tactic.name,
    water: tactic.waterBonus && RIVER_CITIES.includes(targetCity.name)
  };
}

export {
  armyBattle, applyArmyLosses,
  getArmyBondBonus, getFormationMods, applyTroopTraitMods,
  awardRandomEquipment, estimateBattle
};
