const TACTICS = {
  normal: { name: '正面强攻', desc: '标准攻城', atk: 1.0, def: 1.0, loss: 1.0, siege: 1 },
  fire: { name: '火攻', desc: '高智力主将可用，守军额外损失，城防下降', req: (g) => g && g.intelligence >= 75, atk: 0.95, def: 1.0, loss: 1.1, siege: 1, fireDamage: 0.15 },
  water: { name: '水战', desc: '南方/临江城池伤害+25%', req: (g, city) => true, atk: 1.0, def: 1.0, loss: 1.0, siege: 1, waterBonus: true },
  ambush: { name: '埋伏', desc: '高智力主将可用，首回合攻击+30%', req: (g) => g && g.intelligence >= 70, atk: 1.3, def: 1.0, loss: 0.9, siege: 1 },
  siege: { name: '围城', desc: '分多回合消耗守军，自身损失-30%', req: (g) => g && g.command >= 70, atk: 0.6, def: 1.0, loss: 0.7, siege: 3 }
};

export { TACTICS };
