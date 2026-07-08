// 城池建筑系统配置

const BUILDINGS = {
  farm: {
    id: 'farm',
    name: '农田',
    desc: '提升城池粮食产出',
    effectDesc: (lv) => `粮食产出 +${lv * 10}%`,
    foodMul: (lv) => 1 + lv * 0.1,
    cost: (lv) => ({ gold: 200 + lv * 100, food: 0 }),
    maxLevel: 5
  },
  market: {
    id: 'market',
    name: '市场',
    desc: '提升城池金钱产出',
    effectDesc: (lv) => `金钱产出 +${lv * 10}%`,
    goldMul: (lv) => 1 + lv * 0.1,
    cost: (lv) => ({ gold: 250 + lv * 100, food: 0 }),
    maxLevel: 5
  },
  barracks: {
    id: 'barracks',
    name: '兵营',
    desc: '提升守军上限与招兵效率',
    effectDesc: (lv) => `守军上限 +${lv * 200}，招兵 +${lv * 5}%`,
    garrisonCapBonus: (lv) => lv * 200,
    recruitMul: (lv) => 1 + lv * 0.05,
    cost: (lv) => ({ gold: 300 + lv * 150, food: 100 + lv * 50 }),
    maxLevel: 5
  },
  wall: {
    id: 'wall',
    name: '城墙',
    desc: '提升城池防御',
    effectDesc: (lv) => `城防 +${(lv * 0.1).toFixed(1)}`,
    defenseBonus: (lv) => lv * 0.1,
    cost: (lv) => ({ gold: 300 + lv * 150, food: 50 + lv * 50 }),
    maxLevel: 5
  },
  workshop: {
    id: 'workshop',
    name: '工坊',
    desc: '提升战斗缴获装备的概率',
    effectDesc: (lv) => `缴获装备概率 +${lv * 5}%`,
    dropBonus: (lv) => lv * 0.05,
    cost: (lv) => ({ gold: 400 + lv * 200, food: 0 }),
    maxLevel: 5
  },
  academy: {
    id: 'academy',
    name: '书院',
    desc: '降低科技研究消耗',
    effectDesc: (lv) => `科技研究金币消耗 -${lv * 5}%`,
    techDiscount: (lv) => lv * 0.05,
    cost: (lv) => ({ gold: 350 + lv * 150, food: 100 + lv * 50 }),
    maxLevel: 5
  }
};

const BUILDING_IDS = Object.keys(BUILDINGS);

// 获取城池建筑效果汇总
function getCityBuildingEffects(city) {
  const buildings = city.buildings || {};
  const effects = {
    foodMul: 1,
    goldMul: 1,
    garrisonCapBonus: 0,
    recruitMul: 1,
    defenseBonus: 0,
    dropBonus: 0,
    techDiscount: 0
  };
  BUILDING_IDS.forEach(id => {
    const cfg = BUILDINGS[id];
    const lv = buildings[id] || 0;
    if (lv <= 0) return;
    if (cfg.foodMul) effects.foodMul *= cfg.foodMul(lv);
    if (cfg.goldMul) effects.goldMul *= cfg.goldMul(lv);
    if (cfg.garrisonCapBonus) effects.garrisonCapBonus += cfg.garrisonCapBonus(lv);
    if (cfg.recruitMul) effects.recruitMul *= cfg.recruitMul(lv);
    if (cfg.defenseBonus) effects.defenseBonus += cfg.defenseBonus(lv);
    if (cfg.dropBonus) effects.dropBonus += cfg.dropBonus(lv);
    if (cfg.techDiscount) effects.techDiscount += cfg.techDiscount(lv);
  });
  return effects;
}

// 计算升级消耗（升到下一级）
function getBuildingCost(id, currentLevel) {
  const cfg = BUILDINGS[id];
  if (!cfg) return null;
  const next = currentLevel + 1;
  if (next > cfg.maxLevel) return null;
  return cfg.cost(currentLevel);
}

// 初始化城池建筑（旧存档兼容）
function initCityBuildings(city) {
  if (!city.buildings) city.buildings = {};
  BUILDING_IDS.forEach(id => {
    if (city.buildings[id] === undefined) city.buildings[id] = 0;
  });
}

export { BUILDINGS, BUILDING_IDS, getCityBuildingEffects, getBuildingCost, initCityBuildings };
