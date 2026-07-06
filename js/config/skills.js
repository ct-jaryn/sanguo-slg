const SKILL_NAMES = {
  wusheng:'武圣', paoxiao:'咆哮', longdan:'龙胆', shensuan:'神算', jianxiong:'奸雄',
  qixi:'奇袭', lianying:'连营', baonu:'暴怒', tianming:'天命', huoji:'火计'
};
const SKILLS = {
  wusheng: { name: '武圣', desc: '武力+20%', battle: (a,d) => { a.forceMul*=1.2; } },
  paoxiao: { name: '咆哮', desc: '敌方士气-15%', battle: (a,d) => { d.moraleMul*=0.85; } },
  longdan: { name: '龙胆', desc: '受伤概率降低50%', wound: 0.5 },
  shensuan: { name: '神算', desc: '敌方防御-20%', battle: (a,d) => { d.defMul*=0.8; } },
  jianxiong: { name: '奸雄', desc: '战胜后获得双倍金钱', rewardGold: 2 },
  qixi: { name: '奇袭', desc: '首回合攻击+30%', battle: (a,d) => { a.atkMul*=1.3; } },
  lianying: { name: '连营', desc: '防守时城防+20%', defend: 0.2 },
  baonu: { name: '暴怒', desc: '武力+25%，受伤概率+20%', battle: (a,d) => { a.forceMul*=1.25; a.woundExtra=0.2; } },
  tianming: { name: '天命', desc: '民心衰减减半', moraleDecay: 0.5 },
  huoji: { name: '火计', desc: '攻城时守军额外损失10%', fire: 0.1 }
};

export { SKILL_NAMES, SKILLS };
