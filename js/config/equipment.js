const EQUIPMENT_TYPES = {
  weapon: { name: '武器', slot: 'weapon' },
  armor: { name: '防具', slot: 'armor' },
  horse: { name: '坐骑', slot: 'horse' }
};
const EQUIPMENT_POOL = [
  { name: '青龙偃月刀', type: 'weapon', force: 8, command: 2, cost: 800, rarity: 3 },
  { name: '丈八蛇矛', type: 'weapon', force: 7, command: 1, cost: 700, rarity: 3 },
  { name: '青釭剑', type: 'weapon', force: 6, intelligence: 2, cost: 600, rarity: 2 },
  { name: '方天画戟', type: 'weapon', force: 10, command: 2, cost: 1200, rarity: 4 },
  { name: '雌雄双股剑', type: 'weapon', force: 5, politics: 2, cost: 600, rarity: 2 },
  { name: '诸葛连弩', type: 'weapon', force: 4, intelligence: 4, cost: 700, rarity: 3 },
  { name: '铁甲', type: 'armor', command: 4, force: 2, cost: 500, rarity: 2 },
  { name: '藤甲', type: 'armor', command: 6, force: -1, cost: 600, rarity: 3 },
  { name: '锦袍', type: 'armor', politics: 3, command: 2, cost: 500, rarity: 2 },
  { name: '赤兔马', type: 'horse', force: 3, command: 5, cost: 1000, rarity: 4 },
  { name: '的卢马', type: 'horse', command: 3, politics: 2, cost: 700, rarity: 3 },
  { name: '绝影马', type: 'horse', command: 4, intelligence: 1, cost: 700, rarity: 3 }
];

export { EQUIPMENT_TYPES, EQUIPMENT_POOL };
