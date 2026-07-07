import { getState, DEFAULT_TECH } from '../core/state.js';
import {
  availableGenerals, factionCities, findCity, getSeason,
  relation, setRelation, player
} from '../core/utils.js';
import { RIVER_CITIES } from './constants.js';

const EVENTS = [
  {
    id:'harvest', title:'丰收', type:'auto', weight:2,
    condition:()=>true,
    desc:(ctx)=>`${ctx.city.name} 风调雨顺，粮食丰收。`,
    effect:(ctx)=>{ ctx.city.food += 30+Math.floor(Math.random()*21); ctx.city.morale = Math.min(100, ctx.city.morale+5); }
  },
  {
    id:'famine', title:'饥荒', type:'auto', weight:1.5,
    condition:()=>true,
    desc:(ctx)=>`${ctx.city.name} 遭遇饥荒，民不聊生。`,
    effect:(ctx)=>{ ctx.city.food = Math.max(0, ctx.city.food-40); ctx.city.morale = Math.max(20, ctx.city.morale-10); }
  },
  {
    id:'plague', title:'瘟疫', type:'auto', weight:1,
    condition:()=>true,
    desc:(ctx)=>`${ctx.city.name} 爆发瘟疫，守军与民夫大量病亡。`,
    effect:(ctx)=>{ ctx.city.troops = Math.max(0, ctx.city.troops-200-Math.floor(Math.random()*200)); ctx.city.morale = Math.max(20, ctx.city.morale-15); }
  },
  {
    id:'bandits', title:'山贼袭扰', type:'auto', weight:1.5,
    condition:()=>true,
    desc:(ctx)=>`${ctx.city.name} 周边山贼袭扰，守军疲于应付。`,
    effect:(ctx)=>{ ctx.city.troops = Math.max(0, ctx.city.troops-150-Math.floor(Math.random()*100)); ctx.city.money = Math.max(0, ctx.city.money-20); }
  },
  {
    id:'merchant', title:'商旅云集', type:'choice', weight:1.2,
    condition:(ctx)=>ctx.faction.gold>=100,
    desc:(ctx)=>`商旅路过 ${ctx.city.name}，愿以粮食换金钱。`,
    choices:[
      {label:'交易（200金换300粮）', condition:(ctx)=>ctx.faction.gold>=200, effect:(ctx)=>{ ctx.faction.gold-=200; ctx.faction.food+=300; return '你购买了粮食。'; }},
      {label:'拒绝', effect:(ctx)=>'你礼貌地送走了商队。'}
    ]
  },
  {
    id:'stranger', title:'隐士献策', type:'choice', weight:0.8,
    condition:()=>true,
    desc:(ctx)=>`一名隐士求见，自称有治国良策。`,
    choices:[
      {label:'厚礼相待（300金）', condition:(ctx)=>ctx.faction.gold>=300, effect:(ctx)=>{
        ctx.faction.gold-=300;
        if (!ctx.faction.tech) ctx.faction.tech = JSON.parse(JSON.stringify(DEFAULT_TECH));
        const branch = ['farm','comm','military'][Math.floor(Math.random()*3)];
        const key = branch==='farm'?'farmBonus':branch==='comm'?'commBonus':'recruitBonus';
        ctx.faction.tech[branch][key] += (branch==='military'?20:10);
        return `隐士献计，${branch==='farm'?'农业':branch==='comm'?'商业':'募兵'}科技提升。`;
      }},
      {label:'驱逐', effect:(ctx)=>'你赶走了这个来历不明的人。'}
    ]
  },
  {
    id:'defector', title:'敌将投诚', type:'choice', weight:0.6,
    condition:(ctx)=>{
      const enemies = getState().generals.filter(g=>g.faction!=='free' && g.faction!==ctx.faction.id && g.loyalty<50);
      return enemies.length>0;
    },
    desc:(ctx)=>{ ctx.general = getState().generals.filter(g=>g.faction!=='free' && g.faction!==ctx.faction.id && g.loyalty<50)[0]; return `${ctx.general.name} 有意脱离 ${getState().factions[ctx.general.faction].name} 投奔于你。`; },
    choices:[
      {label:'接纳（500金）', condition:(ctx)=>ctx.faction.gold>=500, effect:(ctx)=>{ ctx.faction.gold-=500; ctx.general.faction=ctx.faction.id; ctx.general.loyalty=70; return `${ctx.general.name} 已加入麾下。`; }},
      {label:'送还', effect:(ctx)=>{ setRelation(ctx.faction.id, ctx.general.faction, relation(ctx.faction.id, ctx.general.faction)+10); return `你送还 ${ctx.general.name}，双方关系缓和。`; }}
    ]
  },
  {
    id:'duel', title:'武将挑战', type:'choice', weight:0.7,
    condition:(ctx)=>{
      const gens = availableGenerals(ctx.faction.id);
      return gens.length>0;
    },
    desc:(ctx)=>{ ctx.general = availableGenerals(ctx.faction.id)[0]; return `${ctx.general.name} 在 ${ctx.city.name} 摆下擂台，是否允许民间武者挑战？`; },
    choices:[
      {label:'准许', effect:(ctx)=>{ if(Math.random()<0.6){ ctx.city.morale = Math.min(100, ctx.city.morale+10); return '比武振奋民心，民心提升。'; } else { ctx.general.injured=1; ctx.general.injuredTurns=1; return `${ctx.general.name} 不慎受伤。`; } }},
      {label:'禁止', effect:(ctx)=>{ ctx.city.morale = Math.max(20, ctx.city.morale-3); return '禁止比武让武者不满。'; }}
    ]
  },
  {
    id:'rebellion', title:'民变', type:'choice', weight:0.8,
    condition:(ctx)=>ctx.city.morale<50,
    desc:(ctx)=>`${ctx.city.name} 民心不稳，有刁民聚众闹事。`,
    choices:[
      {label:'安抚（200金）', condition:(ctx)=>ctx.faction.gold>=200, effect:(ctx)=>{ ctx.faction.gold-=200; ctx.city.morale = Math.min(100, ctx.city.morale+20); return '安抚有效，民心回升。'; }},
      {label:'镇压', effect:(ctx)=>{ ctx.city.troops = Math.max(0, ctx.city.troops-100); ctx.city.morale = Math.max(20, ctx.city.morale-10); return '叛乱被镇压，但民心更差。'; }}
    ]
  },
  {
    id:'hermit_general', title:'寻访隐士', type:'choice', weight:0.5,
    condition:()=>true,
    desc:(ctx)=>`传闻 ${ctx.city.name} 附近有隐士高人。`,
    choices:[
      {label:'寻访（300金）', condition:(ctx)=>ctx.faction.gold>=300, effect:(ctx)=>{ ctx.faction.gold-=300; const free = getState().generals.filter(g=>g.faction==='free'); if(free.length && Math.random()<0.5){ const g=free[Math.floor(Math.random()*free.length)]; g.faction=ctx.faction.id; g.loyalty=70; return `寻访到 ${g.name}，已加入麾下。`; } return '寻访未果。'; }},
      {label:'放弃', effect:(ctx)=>'你专注于军政要务。'}
    ]
  },
  {
    id:'nomad_invasion', title:'蛮族入侵', type:'choice', weight:0.6,
    condition:(ctx)=>{
      const border = ctx.faction.id==='yuan' || ctx.faction.id==='cao';
      return border && ctx.city.troops<2000;
    },
    desc:(ctx)=>`北方蛮族骑兵出现在 ${ctx.city.name} 郊外。`,
    choices:[
      {label:'派兵征讨', effect:(ctx)=>{ ctx.city.troops = Math.max(0, ctx.city.troops-300); return '你击退了蛮族，但守军受损。'; }},
      {label:'缴纳岁币（400金）', condition:(ctx)=>ctx.faction.gold>=400, effect:(ctx)=>{ ctx.faction.gold-=400; return '蛮族拿着财物退走。'; }},
      {label:'放任', effect:(ctx)=>{ ctx.city.troops = Math.max(0, ctx.city.troops-500); ctx.city.money = Math.max(0, ctx.city.money-50); return '蛮族劫掠后离去。'; }}
    ]
  },
  {
    id:'drought', title:'大旱', type:'choice', weight:1,
    condition:(ctx)=>ctx.city.morale>=40,
    desc:(ctx)=>`${ctx.city.name} 数月无雨，田地龟裂，民怨渐起。`,
    choices:[
      {label:'开仓赈灾（300粮）', condition:(ctx)=>ctx.faction.food>=300, effect:(ctx)=>{ ctx.faction.food-=300; ctx.city.morale = Math.min(100, ctx.city.morale+10); return '开仓赈灾，民心稳定。'; }},
      {label:'祈雨祭祀（200金）', condition:(ctx)=>ctx.faction.gold>=200, effect:(ctx)=>{ ctx.faction.gold-=200; ctx.city.food = Math.max(0, ctx.city.food-20); return '祭祀后微雨落下，灾情稍缓。'; }},
      {label:'强征赋税', effect:(ctx)=>{ ctx.city.morale = Math.max(20, ctx.city.morale-15); ctx.faction.gold += 100; return '强征赋税，民怨沸腾。'; }}
    ]
  },
  {
    id:'yellow_turban_rumors', title:'黄巾余孽', type:'choice', weight:0.7,
    condition:(ctx)=>ctx.city.morale<60,
    desc:(ctx)=>`${ctx.city.name} 流传黄巾余孽暗中活动，人心惶惶。`,
    choices:[
      {label:'派兵清剿（500兵）', condition:(ctx)=>ctx.faction.troops>=500, effect:(ctx)=>{ ctx.faction.troops-=500; ctx.city.morale = Math.min(100, ctx.city.morale+10); return '清剿黄巾余孽，民心稍安。'; }},
      {label:'招安（300金）', condition:(ctx)=>ctx.faction.gold>=300, effect:(ctx)=>{ ctx.faction.gold-=300; ctx.city.troops += 200; return '黄巾余孽接受招安，编入守军。'; }},
      {label:'放任自流', effect:(ctx)=>{ ctx.city.morale = Math.max(20, ctx.city.morale-10); ctx.city.troops = Math.max(0, ctx.city.troops-100); return '黄巾余孽坐大，城中守军受损。'; }}
    ]
  },
  {
    id:'yellow_turban_gathering', title:'黄巾聚众', type:'choice', weight:0,
    condition:()=>true,
    desc:(ctx)=>`${ctx.city.name} 黄巾余孽聚众响应，意图起事。`,
    choices:[
      {label:'斩首示众（400兵）', condition:(ctx)=>ctx.faction.troops>=400, effect:(ctx)=>{ ctx.faction.troops-=400; ctx.city.morale = Math.min(100, ctx.city.morale+15); return '斩杀渠帅，余党四散。'; }},
      {label:'开仓赈济（300粮）', condition:(ctx)=>ctx.faction.food>=300, effect:(ctx)=>{ ctx.faction.food-=300; ctx.city.morale = Math.min(100, ctx.city.morale+20); return '赈济灾民，黄巾不攻自破。'; }},
      {label:'弃城而走', effect:(ctx)=>{ const dmg=Math.floor(ctx.city.troops*0.3); ctx.city.troops=Math.max(0,ctx.city.troops-dmg); ctx.city.morale=Math.max(20,ctx.city.morale-20); return `黄巾攻陷衙署，守军损失 ${dmg}。`; }}
    ]
  },
  {
    id:'yellow_turban_revival', title:'黄巾再起', type:'choice', weight:0,
    condition:()=>true,
    desc:(ctx)=>`${ctx.city.name} 黄巾军攻城，形势危急。`,
    choices:[
      {label:'死守城池', effect:(ctx)=>{ const dmg=Math.floor(ctx.city.troops*0.2); ctx.city.troops=Math.max(0,ctx.city.troops-dmg); ctx.city.morale=Math.min(100,ctx.city.morale+10); return `击退黄巾，守军损失 ${dmg}，士气高涨。`; }},
      {label:'重金求援（500金）', condition:(ctx)=>ctx.faction.gold>=500, effect:(ctx)=>{ ctx.faction.gold-=500; ctx.city.troops += 300; return '邻城援军赶到，黄巾溃散。'; }}
    ]
  },
  {
    id:'bandit_attack', title:'山贼劫掠', type:'choice', weight:1,
    condition:(ctx)=>ctx.city.money>=50,
    desc:(ctx)=>`${ctx.city.name} 附近山贼下山劫掠商队。`,
    choices:[
      {label:'派兵清剿（200兵）', condition:(ctx)=>ctx.faction.troops>=200, effect:(ctx)=>{ ctx.faction.troops-=200; ctx.faction.gold += 100; return '清剿山贼，缴获财物。'; }},
      {label:'悬赏缉拿（200金）', condition:(ctx)=>ctx.faction.gold>=200, effect:(ctx)=>{ ctx.faction.gold-=200; ctx.city.morale = Math.min(100, ctx.city.morale+5); return '悬赏一出，山贼首级送到。'; }},
      {label:'闭门不出', effect:(ctx)=>{ ctx.city.money = Math.max(0, ctx.city.money-30); return '商队被劫，城市收入受损。'; }}
    ]
  },
  {
    id:'bandit_nest', title:'山贼巢穴', type:'choice', weight:0,
    condition:()=>true,
    desc:(ctx)=>`探子发现 ${ctx.city.name} 附近山贼巢穴。`,
    choices:[
      {label:'焚毁山寨（500兵）', condition:(ctx)=>ctx.faction.troops>=500, effect:(ctx)=>{ ctx.faction.troops-=500; ctx.faction.gold += 300; return '焚毁山寨，缴获大量财物。'; }},
      {label:'招安为兵（300金）', condition:(ctx)=>ctx.faction.gold>=300, effect:(ctx)=>{ ctx.faction.gold-=300; ctx.city.troops += 300; return '山贼受招安，编入守军。'; }},
      {label:'放任不管', effect:(ctx)=>{ ctx.city.money = Math.max(0, ctx.city.money-20); ctx.city.morale = Math.max(20, ctx.city.morale-5); return '山贼继续为患，商旅减少。'; }}
    ]
  },
  {
    id:'hero_arrives', title:'豪杰来投', type:'choice', weight:0,
    condition:()=>true,
    desc:(ctx)=>`一位豪杰因仰慕 ${ctx.faction.name} 威名，特来 ${ctx.city.name} 投奔。`,
    choices:[
      {label:'收留（200金）', condition:(ctx)=>ctx.faction.gold>=200, effect:(ctx)=>{ ctx.faction.gold-=200; const free = getState().generals.filter(g=>g.faction==='free'); if(free.length){ const g=free[Math.floor(Math.random()*free.length)]; g.faction=ctx.faction.id; g.loyalty=75; return `豪杰 ${g.name} 加入麾下。`; } ctx.city.troops += 200; return '豪杰虽不闻名，却带来乡勇200人。'; }},
      {label:'拒绝', effect:(ctx)=>'你婉拒了这位豪杰。'}
    ]
  },
  {
    id:'famous_general', title:'名将巡游', type:'choice', weight:0.6,
    condition:(ctx)=>getState().generals.some(g=>g.faction==='free'),
    desc:(ctx)=>`${ctx.city.name} 附近有名将巡游，似在寻找明主。`,
    choices:[
      {label:'三顾茅庐（500金）', condition:(ctx)=>ctx.faction.gold>=500, effect:(ctx)=>{ ctx.faction.gold-=500; const free = getState().generals.filter(g=>g.faction==='free'); if(free.length){ const g=free.sort((a,b)=>b.force-a.force)[0]; g.faction=ctx.faction.id; g.loyalty=90; return `名将 ${g.name} 被诚意打动，加入麾下。`; } return '名将已离去。'; }},
      {label:'派遣说客', effect:(ctx)=>{ if(Math.random()<0.3){ const free = getState().generals.filter(g=>g.faction==='free'); if(free.length){ const g=free[Math.floor(Math.random()*free.length)]; g.faction=ctx.faction.id; g.loyalty=60; return `说客说服 ${g.name} 加入。`; } } return '说客未能打动名将。'; }},
      {label:'不予理会', effect:(ctx)=>'你错过了这位名将。'}
    ]
  },
  {
    id:'duel_challenge', title:'武将挑战', type:'choice', weight:0,
    condition:(ctx)=>{
      const gens = availableGenerals(ctx.faction.id);
      return gens.length>0;
    },
    desc:(ctx)=>{ ctx.general = availableGenerals(ctx.faction.id)[0]; return `${ctx.general.name} 在 ${ctx.city.name} 摆下擂台，是否允许民间武者挑战？`; },
    choices:[
      {label:'准许', effect:(ctx)=>{ if(Math.random()<0.6){ ctx.city.morale = Math.min(100, ctx.city.morale+10); return '比武振奋民心，民心提升。'; } else { ctx.general.injured=1; ctx.general.injuredTurns=1; return `${ctx.general.name} 不慎受伤。`; } }},
      {label:'禁止', effect:(ctx)=>{ ctx.city.morale = Math.max(20, ctx.city.morale-3); return '禁止比武让武者不满。'; }}
    ]
  },
  {
    id:'general_defects', title:'名将离间', type:'choice', weight:0,
    condition:(ctx)=>{
      const enemies = getState().generals.filter(g=>g.faction!=='free' && g.faction!==ctx.faction.id && g.loyalty<50);
      return enemies.length>0;
    },
    desc:(ctx)=>{ ctx.general = getState().generals.filter(g=>g.faction!=='free' && g.faction!==ctx.faction.id && g.loyalty<50)[0]; return `${ctx.general.name} 对 ${getState().factions[ctx.general.faction].name} 心生不满，似有来投之意。`; },
    choices:[
      {label:'接纳（500金）', condition:(ctx)=>ctx.faction.gold>=500, effect:(ctx)=>{ ctx.faction.gold-=500; ctx.general.faction=ctx.faction.id; ctx.general.loyalty=70; return `${ctx.general.name} 已加入麾下。`; }},
      {label:'送还', effect:(ctx)=>{ setRelation(ctx.faction.id, ctx.general.faction, relation(ctx.faction.id, ctx.general.faction)+10); return `你送还 ${ctx.general.name}，双方关系缓和。`; }}
    ]
  },
  {
    id:'refugee_crisis', title:'流民涌入', type:'choice', weight:0,
    condition:()=>true,
    desc:(ctx)=>`连年灾荒，大批流民涌入 ${ctx.city.name}。`,
    choices:[
      {label:'妥善安置（300粮）', condition:(ctx)=>ctx.faction.food>=300, effect:(ctx)=>{ ctx.faction.food-=300; ctx.city.troops += 200; return '流民编入守军，城池安定。'; }},
      {label:'招募屯田（200金）', condition:(ctx)=>ctx.faction.gold>=200, effect:(ctx)=>{ ctx.faction.gold-=200; ctx.city.food += 20; return '流民垦荒，粮产增加。'; }},
      {label:'驱赶', effect:(ctx)=>{ ctx.city.morale = Math.max(20, ctx.city.morale-15); return '流民被驱赶，怨声载道。'; }}
    ]
  },
  {
    id:'season_spring', title:'春耕', type:'auto', weight:0,
    condition:(ctx)=>getSeason()==='春',
    desc:(ctx)=>`春意盎然，各地忙于春耕。`,
    effect:(ctx)=>{ ctx.faction.food += factionCities(ctx.faction.id).length * 30; }
  },
  {
    id:'season_autumn', title:'秋收', type:'auto', weight:0,
    condition:(ctx)=>getSeason()==='秋',
    desc:(ctx)=>`秋高气爽，粮仓渐满。`,
    effect:(ctx)=>{ ctx.faction.food += factionCities(ctx.faction.id).length * 50; }
  },
  {
    id:'season_winter', title:'冬寒', type:'auto', weight:0,
    condition:(ctx)=>getSeason()==='冬',
    desc:(ctx)=>`寒冬腊月，士卒难耐。`,
    effect:(ctx)=>{ ctx.faction.food -= factionCities(ctx.faction.id).length * 20; }
  },
  {
    id:'cooking_wine', title:'煮酒论英雄', type:'choice', weight:0,
    condition:(ctx)=> getState().year>=2 && getState().year<=4 && getState().playerId==='liu' && !getState().eventsTriggered.cookingWine && getState().factions.cao && !getState().factions.cao.eliminated,
    desc:'曹操邀刘备青梅煮酒，论天下英雄。',
    choices:[
      {label:'谦辞推托', effect:(ctx)=>{ setRelation('liu','cao', relation('liu','cao')+20); getState().eventsTriggered.cookingWine=true; return '刘备谦辞，曹操释然，双方关系缓和。'; }},
      {label:'豪言以对', effect:(ctx)=>{ setRelation('liu','cao', relation('liu','cao')-40); player().morale = Math.min(100, player().morale+10); getState().eventsTriggered.cookingWine=true; return '刘备豪言震座，曹操心生忌惮，刘备声望提升。'; }}
    ]
  },
  {
    id:'coalition_dongzhuo', title:'十八路诸侯讨董', type:'choice', weight:0,
    condition:(ctx)=> getState().year>=1 && getState().year<=2 && !getState().eventsTriggered.coalitionDongzhuo,
    desc:'董卓乱政，群雄呼吁结盟讨伐。',
    choices:[
      {label:'起兵响应（损兵500，关系+20）', condition:(ctx)=>ctx.faction.troops>=500, effect:(ctx)=>{ ctx.faction.troops-=500; getState().eventsTriggered.coalitionDongzhuo=true; Object.values(getState().factions).filter(o=>o.id!==ctx.faction.id && !o.eliminated).forEach(o=>setRelation(ctx.faction.id,o.id,relation(ctx.faction.id,o.id)+20)); return '你响应讨董，群雄称颂。'; }},
      {label:'按兵不动', effect:(ctx)=>{ getState().eventsTriggered.coalitionDongzhuo=true; Object.values(getState().factions).filter(o=>o.id!==ctx.faction.id && !o.eliminated).forEach(o=>setRelation(ctx.faction.id,o.id,relation(ctx.faction.id,o.id)-10)); return '你按兵不动，群雄颇有微词。'; }}
    ]
  },
  {
    id:'yiling_battle', title:'夷陵之战', type:'choice', weight:0,
    condition:(ctx)=> getState().year>=12 && getState().year<=16 && getState().playerId==='liu' && !getState().eventsTriggered.yiling && getState().factions.sun && !getState().factions.sun.eliminated && findCity('荆州') && findCity('荆州').owner==='sun',
    desc:'关羽失荆州后，刘备誓要东征孙权。',
    choices:[
      {label:'举兵复仇（与孙吴决裂）', effect:(ctx)=>{ setRelation('liu','sun',-100); getState().eventsTriggered.yiling=true; return '刘备兴兵伐吴，孙刘联盟破裂。'; }},
      {label:'以和为贵（赔款300金）', condition:(ctx)=>ctx.faction.gold>=300, effect:(ctx)=>{ ctx.faction.gold-=300; setRelation('liu','sun',20); getState().eventsTriggered.yiling=true; return '刘备隐忍，孙刘重修旧好。'; }}
    ]
  },
  {
    id:'seven_captures', title:'南中平定', type:'choice', weight:0,
    condition:(ctx)=> getState().year>=10 && getState().year<=18 && !getState().eventsTriggered.sevenCaptures && ['成都','永安','建宁','云南'].filter(n=>{ const c=findCity(n); return c && c.owner===ctx.faction.id; }).length>=2,
    desc:'南中蛮族反复，诸葛亮建议恩威并施。',
    choices:[
      {label:'七擒七纵（耗费500兵，收服人心）', condition:(ctx)=>ctx.faction.troops>=500, effect:(ctx)=>{ ctx.faction.troops-=500; ctx.faction.gold+=300; ctx.faction.food+=300; getState().eventsTriggered.sevenCaptures=true; return '七擒孟获，南中平定，获得大量物资。'; }},
      {label:'征讨镇压', effect:(ctx)=>{ ctx.faction.troops-=300; getState().eventsTriggered.sevenCaptures=true; return '南中蛮族暂服，但隐患未除。'; }}
    ]
  },
  {
    id:'flood', title:'洪涝', type:'choice', weight:1.2,
    condition:(ctx)=>getSeason()==='夏' && RIVER_CITIES.includes(ctx.city.name),
    desc:(ctx)=>`${ctx.city.name} 暴雨连绵，河水暴涨，农田被淹。`,
    choices:[
      {label:'开仓赈灾（300粮）', condition:(ctx)=>ctx.faction.food>=300, effect:(ctx)=>{ ctx.faction.food-=300; ctx.city.morale = Math.min(100, ctx.city.morale+5); return '赈灾及时，民心稳定。'; }},
      {label:'抢修堤坝（200金）', condition:(ctx)=>ctx.faction.gold>=200, effect:(ctx)=>{ ctx.faction.gold-=200; ctx.city.food = Math.max(0, ctx.city.food-10); return '堤坝修复，灾情稍缓。'; }},
      {label:'听天由命', effect:(ctx)=>{ ctx.city.food = Math.max(0, ctx.city.food-40); ctx.city.money = Math.max(0, ctx.city.money-20); ctx.city.morale = Math.max(20, ctx.city.morale-10); return '洪涝成灾，粮产与民心大损。'; }}
    ]
  },
  {
    id:'locust', title:'蝗灾', type:'choice', weight:1,
    condition:(ctx)=>getSeason()==='秋',
    desc:(ctx)=>`${ctx.city.name} 蝗虫过境，遮天蔽日，秋收无望。`,
    choices:[
      {label:'组织扑蝗（300兵）', condition:(ctx)=>ctx.faction.troops>=300, effect:(ctx)=>{ ctx.faction.troops-=300; ctx.city.food = Math.max(0, ctx.city.food-15); return '军民协力扑灭蝗虫，损失较小。'; }},
      {label:'祈祷消灾（200金）', condition:(ctx)=>ctx.faction.gold>=200, effect:(ctx)=>{ ctx.faction.gold-=200; ctx.city.food = Math.max(0, ctx.city.food-25); return '祭祀之后蝗群散去，仍有部分损失。'; }},
      {label:'放任', effect:(ctx)=>{ ctx.city.food = Math.max(0, ctx.city.food-50); ctx.city.morale = Math.max(20, ctx.city.morale-10); return '蝗灾肆虐，粮产锐减。'; }}
    ]
  },
  {
    id:'epidemic', title:'瘟疫', type:'choice', weight:0.8,
    condition:()=>true,
    desc:(ctx)=>`${ctx.city.name} 爆发瘟疫，军民染病者众。`,
    choices:[
      {label:'隔离救治（400金）', condition:(ctx)=>ctx.faction.gold>=400, effect:(ctx)=>{ ctx.faction.gold-=400; ctx.city.troops = Math.max(0, ctx.city.troops-100); ctx.city.morale = Math.min(100, ctx.city.morale+10); return '及时救治，疫情得到控制。'; }},
      {label:'焚烧疫区（200兵）', condition:(ctx)=>ctx.faction.troops>=200, effect:(ctx)=>{ ctx.faction.troops-=200; ctx.city.troops = Math.max(0, ctx.city.troops-300); return '以火封疫，代价惨烈。'; }},
      {label:'弃之不顾', effect:(ctx)=>{ ctx.city.troops = Math.max(0, ctx.city.troops-500); ctx.city.morale = Math.max(20, ctx.city.morale-15); return '瘟疫蔓延，守军与民心大损。'; }}
    ]
  }
];

export { EVENTS };
