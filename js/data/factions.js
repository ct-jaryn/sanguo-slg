function makeFactions() {
  return {
    liu: {id:'liu',name:'刘备',color:'#c41e3a',leader:'刘备',personality:'player',ai:false,food:1000,gold:800,troops:500,morale:80,allies:[],eliminated:false},
    cao: {id:'cao',name:'曹操',color:'#1a5c1a',leader:'曹操',personality:'expansion',ai:true,food:1800,gold:1500,troops:1000,morale:80,allies:[],eliminated:false},
    sun: {id:'sun',name:'孙权',color:'#2980b9',leader:'孙权',personality:'diplomatic',ai:true,food:1600,gold:1400,troops:900,morale:80,allies:[],eliminated:false},
    yuan: {id:'yuan',name:'袁绍',color:'#8e44ad',leader:'袁绍',personality:'expansion',ai:true,food:1400,gold:900,troops:800,morale:75,allies:[],eliminated:false},
    lv: {id:'lv',name:'吕布',color:'#e67e22',leader:'吕布',personality:'expansion',ai:true,food:1000,gold:800,troops:700,morale:60,allies:[],eliminated:false}
  };
}

export { makeFactions };
