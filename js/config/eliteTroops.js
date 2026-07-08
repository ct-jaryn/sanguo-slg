// 特殊兵种 / 精锐部队配置
// 每个势力拥有独一无二的精锐，由对应基础兵种升级而来

const ELITE_TROOPS = {
  liu: {
    id: 'baiyi',
    name: '白毦兵',
    base: 'infantry',
    atk: 1.15,
    def: 1.2,
    food: 1.3,
    desc: '刘备亲卫步兵，守城时防御+20%'
  },
  cao: {
    id: 'hubao',
    name: '虎豹骑',
    base: 'cavalry',
    atk: 1.25,
    def: 1.0,
    food: 1.5,
    desc: '曹操精锐骑兵，攻击+20%'
  },
  sun: {
    id: 'jiefan',
    name: '解烦兵',
    base: 'archer',
    atk: 1.15,
    def: 1.1,
    food: 1.3,
    waterAtk: 1.2,
    desc: '孙权精锐弓兵，水战+20%'
  },
  yuan: {
    id: 'xiandeng',
    name: '先登死士',
    base: 'archer',
    atk: 1.2,
    def: 1.0,
    food: 1.3,
    siegeAtk: 1.2,
    desc: '袁绍精锐弓兵，攻城+20%'
  },
  lv: {
    id: 'xianzhen',
    name: '陷阵营',
    base: 'infantry',
    atk: 1.2,
    def: 1.15,
    food: 1.3,
    desc: '吕布精锐步兵，攻防兼备'
  }
};

const ELITE_MAX_RATIO = 0.3; // 精锐最多占对应基础兵力的 30%
const ELITE_UNLOCK_MILITARY_LEVEL = 2; // 军事科技 2 级解锁

function getEliteTroop(factionId) {
  return ELITE_TROOPS[factionId] || null;
}

function eliteCap(army, eliteCfg) {
  if (!army || !eliteCfg) return 0;
  const baseCount = army[eliteCfg.base] || 0;
  return Math.floor(baseCount * ELITE_MAX_RATIO);
}

function eliteUnlocked(faction) {
  return faction && faction.tech && faction.tech.military && faction.tech.military.level >= ELITE_UNLOCK_MILITARY_LEVEL;
}

// 精锐在对应基础兵种中的占比（用于计算加权加成）
function eliteRatio(army, eliteCfg) {
  if (!army || !eliteCfg || !army.elite || army.elite <= 0) return 0;
  const baseCount = army[eliteCfg.base] || 0;
  if (!baseCount) return 0;
  return Math.min(1, army.elite / baseCount);
}

export {
  ELITE_TROOPS, ELITE_MAX_RATIO, ELITE_UNLOCK_MILITARY_LEVEL,
  getEliteTroop, eliteCap, eliteUnlocked, eliteRatio
};
