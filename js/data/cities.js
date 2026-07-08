function makeCities() {
  // 48 cities covering the full Three Kingdoms map
  // traits: capital/granary/fortress/port/commercial/military/strategic
  const data = [
    // 北方 (North)
    {name:'邺城',owner:'yuan',troops:2200,defense:1.2,food:120,money:90,morale:70,neighbors:['平原','南皮','邯郸','许昌','洛阳'],region:'北方',x:1280,y:560,traits:['military','capital']},
    {name:'平原',owner:'yuan',troops:1800,defense:1.0,food:100,money:70,morale:65,neighbors:['邺城','南皮','北海','陈留','许昌'],region:'北方',x:1480,y:500,traits:['granary']},
    {name:'南皮',owner:'yuan',troops:1600,defense:1.0,food:90,money:60,morale:65,neighbors:['邺城','平原','北海','蓟'],region:'北方',x:1500,y:340,traits:['military']},
    {name:'蓟',owner:'yuan',troops:1500,defense:1.1,food:80,money:50,morale:60,neighbors:['南皮','北平'],region:'北方',x:1480,y:180,traits:['fortress']},
    {name:'北平',owner:'yuan',troops:1400,defense:1.0,food:70,money:45,morale:60,neighbors:['蓟','襄平'],region:'北方',x:1680,y:180,traits:['military']},
    {name:'襄平',owner:null,troops:1300,defense:1.0,food:60,money:40,morale:55,neighbors:['北平'],region:'北方',x:1880,y:220,traits:['port']},
    {name:'邯郸',owner:'cao',troops:1700,defense:1.1,food:90,money:70,morale:70,neighbors:['邺城','濮阳','许昌'],region:'北方',x:1240,y:700,traits:['commercial']},
    {name:'濮阳',owner:'cao',troops:1800,defense:1.1,food:100,money:80,morale:70,neighbors:['邯郸','陈留','小沛','北海'],region:'北方',x:1400,y:680,traits:['military']},
    {name:'北海',owner:'cao',troops:1600,defense:1.1,food:90,money:70,morale:70,neighbors:['平原','南皮','濮阳','徐州'],region:'北方',x:1620,y:620,traits:['port','commercial']},
    {name:'许昌',owner:'cao',troops:2400,defense:1.3,food:110,money:120,morale:75,neighbors:['邺城','平原','陈留','洛阳','小沛','邯郸'],region:'北方',x:1260,y:820,traits:['capital','military']},
    {name:'陈留',owner:'cao',troops:2000,defense:1.1,food:100,money:100,morale:70,neighbors:['平原','许昌','濮阳','小沛','徐州'],region:'北方',x:1440,y:800,traits:['military']},
    {name:'洛阳',owner:'cao',troops:2100,defense:1.4,food:90,money:130,morale:80,neighbors:['邺城','许昌','长安','汉中','弘农'],region:'北方',x:1040,y:840,traits:['capital','fortress','commercial']},
    {name:'弘农',owner:'cao',troops:1500,defense:1.1,food:80,money:70,morale:70,neighbors:['洛阳','长安','武关'],region:'北方',x:1040,y:980,traits:['strategic']},
    {name:'长安',owner:'cao',troops:2000,defense:1.3,food:90,money:100,morale:75,neighbors:['洛阳','弘农','天水','汉中','武关'],region:'北方',x:860,y:900,traits:['capital','fortress']},
    {name:'武关',owner:null,troops:1200,defense:1.0,food:60,money:50,morale:55,neighbors:['弘农','长安','上庸','襄阳'],region:'北方',x:980,y:1060,traits:['fortress','strategic']},
    // 中原 (Central)
    {name:'小沛',owner:'liu',troops:1500,defense:1.0,food:90,money:80,morale:75,neighbors:['许昌','陈留','濮阳','徐州','下邳'],region:'中原',x:1580,y:820,traits:['strategic']},
    {name:'徐州',owner:'lv',troops:1900,defense:1.1,food:100,money:90,morale:60,neighbors:['陈留','小沛','下邳','寿春','北海'],region:'中原',x:1720,y:760,traits:['military']},
    {name:'下邳',owner:'lv',troops:1700,defense:1.2,food:95,money:85,morale:60,neighbors:['小沛','徐州','寿春','广陵'],region:'中原',x:1740,y:920,traits:['fortress']},
    {name:'广陵',owner:'lv',troops:1400,defense:1.0,food:80,money:70,morale:60,neighbors:['下邳','寿春','建业'],region:'中原',x:1840,y:840,traits:['port']},
    {name:'寿春',owner:'sun',troops:1800,defense:1.1,food:110,money:100,morale:70,neighbors:['徐州','下邳','广陵','扬州','汝南'],region:'中原',x:1660,y:1040,traits:['strategic','military']},
    {name:'汝南',owner:'sun',troops:1500,defense:1.0,food:90,money:80,morale:70,neighbors:['寿春','江夏','襄阳'],region:'中原',x:1480,y:1000,traits:['granary']},
    // 南方 (South)
    {name:'扬州',owner:'sun',troops:1600,defense:1.0,food:120,money:110,morale:75,neighbors:['寿春','建业','江夏','庐江'],region:'南方',x:1760,y:1160,traits:['granary','commercial']},
    {name:'庐江',owner:'sun',troops:1500,defense:1.0,food:100,money:90,morale:70,neighbors:['扬州','建业','柴桑'],region:'南方',x:1640,y:1160,traits:['port']},
    {name:'建业',owner:'sun',troops:2000,defense:1.3,food:130,money:120,morale:80,neighbors:['广陵','扬州','庐江','吴','柴桑'],region:'南方',x:1780,y:1280,traits:['capital','port','fortress']},
    {name:'吴',owner:'sun',troops:1600,defense:1.1,food:110,money:100,morale:75,neighbors:['建业','会稽'],region:'南方',x:1900,y:1260,traits:['port','commercial']},
    {name:'会稽',owner:'sun',troops:1500,defense:1.0,food:100,money:90,morale:75,neighbors:['吴','建安'],region:'南方',x:1960,y:1400,traits:['port']},
    {name:'建安',owner:null,troops:1300,defense:1.0,food:90,money:70,morale:60,neighbors:['会稽'],region:'南方',x:1840,y:1480,traits:['port']},
    {name:'柴桑',owner:'sun',troops:1700,defense:1.1,food:120,money:100,morale:75,neighbors:['庐江','建业','江夏','长沙','豫章'],region:'南方',x:1560,y:1260,traits:['port','military']},
    {name:'豫章',owner:'sun',troops:1400,defense:1.0,food:100,money:80,morale:70,neighbors:['柴桑','长沙'],region:'南方',x:1600,y:1380,traits:['port']},
    {name:'江夏',owner:'sun',troops:1600,defense:1.0,food:110,money:95,morale:70,neighbors:['汝南','扬州','柴桑','襄阳','长沙'],region:'南方',x:1420,y:1160,traits:['port','military']},
    {name:'长沙',owner:'sun',troops:1500,defense:1.0,food:120,money:100,morale:70,neighbors:['江夏','柴桑','豫章','武陵','桂阳'],region:'南方',x:1420,y:1320,traits:['granary','military']},
    {name:'桂阳',owner:null,troops:1300,defense:1.0,food:100,money:80,morale:60,neighbors:['长沙','武陵','零陵'],region:'南方',x:1320,y:1420,traits:['commercial']},
    {name:'零陵',owner:null,troops:1200,defense:1.0,food:90,money:70,morale:60,neighbors:['桂阳','武陵'],region:'南方',x:1200,y:1460,traits:['port']},
    {name:'武陵',owner:null,troops:1400,defense:1.1,food:110,money:90,morale:60,neighbors:['长沙','桂阳','零陵','荆州','永安'],region:'南方',x:1220,y:1260,traits:['strategic']},
    {name:'荆州',owner:null,troops:1500,defense:1.2,food:140,money:110,morale:60,neighbors:['江夏','武陵','襄阳','永安','汉中','武关'],region:'南方',x:1180,y:1080,traits:['fortress','granary','strategic']},
    {name:'襄阳',owner:'cao',troops:2000,defense:1.3,food:110,money:100,morale:75,neighbors:['汝南','江夏','荆州','武关','上庸','新野'],region:'南方',x:1180,y:960,traits:['fortress','capital','strategic']},
    {name:'新野',owner:'cao',troops:1500,defense:1.1,food:90,money:80,morale:70,neighbors:['襄阳','上庸'],region:'南方',x:1280,y:900,traits:['military']},
    {name:'上庸',owner:'cao',troops:1400,defense:1.0,food:80,money:70,morale:70,neighbors:['武关','新野','襄阳','汉中'],region:'南方',x:1100,y:860,traits:['strategic']},
    // 西蜀 (West)
    {name:'汉中',owner:'cao',troops:1800,defense:1.2,food:110,money:90,morale:70,neighbors:['洛阳','长安','上庸','荆州','成都','梓潼'],region:'西蜀',x:900,y:1020,traits:['fortress','strategic']},
    {name:'梓潼',owner:'liu',troops:1400,defense:1.1,food:100,money:80,morale:70,neighbors:['汉中','成都','永安'],region:'西蜀',x:760,y:1040,traits:['military']},
    {name:'成都',owner:'liu',troops:1400,defense:1.3,food:150,money:100,morale:80,neighbors:['汉中','梓潼','永安','江州','云南'],region:'西蜀',x:600,y:1080,traits:['capital','granary']},
    {name:'永安',owner:'liu',troops:1300,defense:1.1,food:100,money:80,morale:75,neighbors:['荆州','武陵','梓潼','成都','江州'],region:'西蜀',x:980,y:1200,traits:['strategic']},
    {name:'江州',owner:'liu',troops:1200,defense:1.0,food:110,money:80,morale:75,neighbors:['成都','永安','云南','建宁'],region:'西蜀',x:700,y:1200,traits:['port']},
    {name:'建宁',owner:null,troops:1100,defense:1.0,food:100,money:70,morale:60,neighbors:['江州','云南'],region:'西蜀',x:680,y:1360,traits:['granary']},
    {name:'云南',owner:null,troops:1100,defense:1.0,food:90,money:60,morale:60,neighbors:['成都','江州','建宁'],region:'西蜀',x:540,y:1320,traits:['strategic']},
    // 西凉 (Northwest)
    {name:'天水',owner:null,troops:1400,defense:1.1,food:70,money:50,morale:60,neighbors:['长安','安定','武威'],region:'西凉',x:740,y:820,traits:['military']},
    {name:'安定',owner:null,troops:1200,defense:1.0,food:60,money:45,morale:60,neighbors:['天水','长安'],region:'西凉',x:920,y:760,traits:['strategic']},
    {name:'武威',owner:null,troops:1300,defense:1.1,food:50,money:40,morale:55,neighbors:['天水'],region:'西凉',x:560,y:700,traits:['military']}
  ];
  return data;
}

export { makeCities };
