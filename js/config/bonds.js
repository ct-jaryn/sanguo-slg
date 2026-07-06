const BONDS = [
  { id: 'taoyuan', name: '桃园结义', members: ['刘备','关羽','张飞'], require: 3, bonus: { forceMul: 1.08, atkMul: 1.12, moraleMul: 1.10 }, desc: '三英同心，攻击+12%' },
  { id: 'wuhu', name: '五虎上将', members: ['关羽','张飞','赵云','马超','黄忠'], require: 3, bonus: { forceMul: 1.10, atkMul: 1.10, defMul: 1.05 }, desc: '蜀汉五虎齐聚，全军战力提升' },
  { id: 'cao_advisors', name: '王佐之才', members: ['曹操','郭嘉','荀彧'], require: 3, bonus: { atkMul: 1.10, defMul: 1.10, moraleMul: 1.10 }, desc: '曹氏智囊团，攻防兼备' },
  { id: 'wu_dudu', name: '东吴都督', members: ['周瑜','陆逊','吕蒙','鲁肃'], require: 3, bonus: { atkMul: 1.10, defMul: 1.10 }, desc: '水军与谋略并进' },
  { id: 'wolongfengchu', name: '卧龙凤雏', members: ['诸葛亮','庞统'], require: 2, bonus: { atkMul: 1.15 }, desc: '得一可安天下' },
  { id: 'lv_diao', name: '英雄美人', members: ['吕布','貂蝉'], require: 2, bonus: { forceMul: 1.10, woundExtra: -0.15 }, desc: '吕布貂蝉并肩，武力与生存提升' },
  { id: 'hebei_pillars', name: '河北双雄', members: ['颜良','文丑'], require: 2, bonus: { forceMul: 1.08, atkMul: 1.10 }, desc: '河北猛将，所向披靡' },
  { id: 'xiahou_brothers', name: '夏侯兄弟', members: ['夏侯惇','夏侯渊'], require: 2, bonus: { forceMul: 1.06, atkMul: 1.08 }, desc: '夏侯双雄，冲锋陷阵' },
  { id: 'cao_tiger', name: '曹魏虎贲', members: ['许褚','典韦'], require: 2, bonus: { forceMul: 1.10, defMul: 1.05 }, desc: '虎贲双卫，勇冠三军' },
  { id: 'hebei_advisors', name: '河北智囊', members: ['田丰','沮授'], require: 2, bonus: { atkMul: 1.08, defMul: 1.08 }, desc: '河北谋士，运筹帷幄' },
  { id: 'wu_warriors', name: '江东猛将', members: ['甘宁','太史慈','周泰','黄盖'], require: 3, bonus: { forceMul: 1.08, atkMul: 1.10 }, desc: '江东虎臣，水上悍勇' },
  { id: 'five_sons', name: '五子良将', members: ['张辽','徐晃','于禁','乐进','张郃'], require: 2, bonus: { atkMul: 1.10, defMul: 1.05 }, desc: '曹魏良将，能攻善守' }
];

export { BONDS };
