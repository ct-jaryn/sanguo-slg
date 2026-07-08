const SAVE_VERSION = '1.0';
const SEASONS = ['春','夏','秋','冬'];
const TROOP_TYPES = {
  infantry: { name: '步兵', atk: 1.0, def: 1.0, food: 1.0, trait: 'shield', traitDesc: '盾墙：守城时防御+10%' },
  cavalry: { name: '骑兵', atk: 1.2, def: 1.0, food: 1.5, trait: 'charge', traitDesc: '冲锋：攻击时首回合+15%' },
  archer: { name: '弓兵', atk: 1.0, def: 1.0, food: 1.1, siegeAtk: 1.15, trait: 'volley', traitDesc: '齐射：守军超过1500时伤害+10%' }
};

// 军团阵型
const FORMATIONS = {
  yulin: { name: '鱼鳞阵', desc: '攻守均衡', atk: 1.0, def: 1.0 },
  fengshi: { name: '锋矢阵', desc: '骑兵占优时攻击+15%', atk: 1.0, def: 1.0, cavalryAtk: 0.15 },
  fangyuan: { name: '方圆阵', desc: '步兵占优时防御+15%', atk: 1.0, def: 1.0, infantryDef: 0.15 },
  yanxing: { name: '雁行阵', desc: '弓兵占优时伤害+15%', atk: 1.0, def: 1.0, archerAtk: 0.15 },
  changshe: { name: '长蛇阵', desc: '灵活机动，战损-10%', atk: 1.0, def: 1.0, lossMul: 0.9 }
};

// 难度配置（影响 AI 资源、招兵、进攻、科技）
const DIFFICULTY = {
  easy: { name: '简单', aiGoldMul: 0.8, aiFoodMul: 0.8, aiRecruitMul: 0.8, aiAttackThreshold: 0.9, aiTechChance: 0.15 },
  normal: { name: '普通', aiGoldMul: 1.0, aiFoodMul: 1.0, aiRecruitMul: 1.0, aiAttackThreshold: 0.6, aiTechChance: 0.25 },
  hard: { name: '困难', aiGoldMul: 1.3, aiFoodMul: 1.3, aiRecruitMul: 1.3, aiAttackThreshold: 0.4, aiTechChance: 0.4 }
};

// 兵种循环克制：骑兵克步兵、步兵克弓兵、弓兵克骑兵
const COUNTER = { cavalry: 'infantry', infantry: 'archer', archer: 'cavalry' };
const COUNTER_BONUS = 0.2;

// 兵种经验与等级：每级提升 5% 攻防，最高 5 级
const TROOP_XP_PER_LEVEL = 100;
const TROOP_MAX_LEVEL = 5;
function troopLevelBonus(level) {
  return 1 + (Math.min(level, TROOP_MAX_LEVEL) - 1) * 0.05;
}
function addTroopXP(army, type, amount) {
  if (!army.troopXP) army.troopXP = { infantry: 0, cavalry: 0, archer: 0 };
  if (!army.troopLevel) army.troopLevel = { infantry: 1, cavalry: 1, archer: 1 };
  if (!army.troopXP[type]) army.troopXP[type] = 0;
  army.troopXP[type] += amount;
  const needed = TROOP_XP_PER_LEVEL * army.troopLevel[type];
  while (army.troopLevel[type] < TROOP_MAX_LEVEL && army.troopXP[type] >= needed) {
    army.troopXP[type] -= needed;
    army.troopLevel[type]++;
  }
}
// 城池守军兵种构成（按城防：坚城弓兵多利于守城）
function cityDefenseComp(city) {
  return city.defense >= 1.3
    ? { infantry: 0.5, cavalry: 0.15, archer: 0.35 }
    : { infantry: 0.6, cavalry: 0.25, archer: 0.15 };
}
// 攻方兵种比例克制守方兵种比例的系数（0~1）
function counterFactor(atkShare, defShare) {
  return (atkShare.infantry || 0) * (defShare.archer || 0)
       + (atkShare.archer || 0) * (defShare.cavalry || 0)
       + (atkShare.cavalry || 0) * (defShare.infantry || 0);
}

// 城池临水判定（用于水战）
const RIVER_CITIES = ['襄阳','江夏','柴桑','建业','扬州','庐江','长沙','武陵','荆州','永安','江州','广陵','寿春','豫章','桂阳','零陵','会稽','建安'];

// 城市特色：影响产出、防御、募兵、守军上限等
const CITY_TRAITS = {
  capital: { name: '帝都', desc: '金钱产出+25%，招兵+20%', goldMul: 1.25, recruitMul: 1.2 },
  granary: { name: '天府', desc: '粮食产出+30%', foodMul: 1.3 },
  fortress: { name: '雄关', desc: '城防+25%，守军上限+1000', defMul: 1.25, garrisonCapBonus: 1000 },
  port: { name: '港口', desc: '水军伤害+15%，金钱产出+10%', waterAtkMul: 1.15, goldMul: 1.1 },
  commercial: { name: '商都', desc: '金钱产出+20%', goldMul: 1.2 },
  military: { name: '兵营', desc: '招兵+25%，守军上限+500', recruitMul: 1.25, garrisonCapBonus: 500 },
  strategic: { name: '要冲', desc: '被进攻时受到的伤害-10%', defenseMul: 0.9 }
};

function getCityTraitEffects(city) {
  const traits = city.traits || [];
  const effects = {
    foodMul: 1, goldMul: 1, defMul: 1, recruitMul: 1,
    waterAtkMul: 1, defenseMul: 1, garrisonCapBonus: 0
  };
  traits.forEach(t => {
    const cfg = CITY_TRAITS[t];
    if (!cfg) return;
    if (cfg.foodMul) effects.foodMul *= cfg.foodMul;
    if (cfg.goldMul) effects.goldMul *= cfg.goldMul;
    if (cfg.defMul) effects.defMul *= cfg.defMul;
    if (cfg.recruitMul) effects.recruitMul *= cfg.recruitMul;
    if (cfg.waterAtkMul) effects.waterAtkMul *= cfg.waterAtkMul;
    if (cfg.defenseMul) effects.defenseMul *= cfg.defenseMul;
    if (cfg.garrisonCapBonus) effects.garrisonCapBonus += cfg.garrisonCapBonus;
  });
  return effects;
}

// AI 军团编成偏好：根据战术/地理调整步骑弓比例
const AI_COMP_PREFS = {
  normal: { infantry: 0.55, cavalry: 0.25, archer: 0.20 },
  siege: { infantry: 0.50, cavalry: 0.20, archer: 0.30 },
  fire: { infantry: 0.35, cavalry: 0.20, archer: 0.45 },
  ambush: { infantry: 0.35, cavalry: 0.25, archer: 0.40 },
  water: { infantry: 0.65, cavalry: 0.15, archer: 0.20 },
  cavalry: { infantry: 0.30, cavalry: 0.55, archer: 0.15 }
};

export { SAVE_VERSION, SEASONS, TROOP_TYPES, FORMATIONS, DIFFICULTY, COUNTER, COUNTER_BONUS, cityDefenseComp, counterFactor, RIVER_CITIES, AI_COMP_PREFS, CITY_TRAITS, getCityTraitEffects, TROOP_XP_PER_LEVEL, TROOP_MAX_LEVEL, troopLevelBonus, addTroopXP };
