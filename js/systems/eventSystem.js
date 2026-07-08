import { getState, DEFAULT_TECH } from '../core/state.js';
import { log } from '../core/log.js';
import {
  getSeason, player, factionCities, factionGenerals, findCity, findGeneral, setRelation
} from '../core/utils.js';
import { EVENTS } from '../config/events.js';
import { checkAchievements } from './achievements.js';

const EVENT_CHAINS = {
  yellow_turban_rumors: {
    first: 'yellow_turban_rumors',
    next: ['yellow_turban_gathering', 'yellow_turban_revival'],
    chance: 0.5
  },
  drought: {
    first: 'drought',
    next: ['famine', 'refugee_crisis'],
    chance: 0.6
  },
  bandit_attack: {
    first: 'bandit_attack',
    next: ['bandit_nest', 'hero_arrives'],
    chance: 0.4
  },
  famous_general: {
    first: 'famous_general',
    next: ['duel_challenge', 'general_defects'],
    chance: 0.4
  }
};

function startEventChain(chainId) {
  getState().eventChains = getState().eventChains || {};
  getState().eventChains[chainId] = { step: 0, active: true };
}

function advanceEventChain(chainId) {
  if (!getState().eventChains || !getState().eventChains[chainId]) return;
  const chain = EVENT_CHAINS[chainId];
  const progress = getState().eventChains[chainId];
  progress.step++;
  if (progress.step >= chain.next.length) {
    progress.active = false;
  }
}

function getChainNextEvent(chainId) {
  if (!getState().eventChains || !getState().eventChains[chainId]) return null;
  const progress = getState().eventChains[chainId];
  if (!progress.active) return null;
  const chain = EVENT_CHAINS[chainId];
  return chain.next[progress.step] || null;
}

function triggerChainedEvent(f) {
  if (!getState().eventChains) return;
  Object.keys(getState().eventChains).forEach(chainId => {
    const progress = getState().eventChains[chainId];
    if (!progress.active || Math.random() > EVENT_CHAINS[chainId].chance) return;
    const nextId = getChainNextEvent(chainId);
    if (!nextId) return;
    const ev = EVENTS.find(e => e.id === nextId);
    if (!ev) return;
    const cities = factionCities(f.id);
    if (!cities.length) return;
    const city = cities[Math.floor(Math.random() * cities.length)];
    const ctx = { state: getState(), faction: f, city };
    if (ev.condition && !ev.condition(ctx)) return;
    addPendingEvent(ev, ctx);
    advanceEventChain(chainId);
  });
}

function tryTriggerHistoricalEvent(evId) {
  const ev = EVENTS.find(e => e.id === evId);
  if (!ev) return;
  const cities = factionCities(getState().playerId);
  if (!cities.length) return;
  const city = cities[Math.floor(Math.random() * cities.length)];
  const ctx = { state: getState(), faction: player(), city };
  if (ev.condition && !ev.condition(ctx)) return;
  addPendingEvent(ev, ctx);
}

function historicalEvents() {
  const y = getState().year;
  // 董卓乱政
  if(y===1 && !getState().eventsTriggered.dongzhuoRebellion){
    getState().eventsTriggered.dongzhuoRebellion=true;
    Object.values(getState().factions).forEach(f=>{
      if(!f.eliminated){ f.gold = Math.floor(f.gold*0.85); f.food = Math.floor(f.food*0.85); }
    });
    log('董卓乱政：洛阳焚毁，天下群雄资源受损，讨伐之声四起。');
  }
  // 煮酒论英雄
  if(y>=2 && y<=4 && getState().playerId==='liu' && !getState().eventsTriggered.cookingWine && getState().factions.cao && !getState().factions.cao.eliminated){
    tryTriggerHistoricalEvent('cooking_wine');
  }
  // 十八路诸侯讨董
  if(y>=1 && y<=2 && !getState().eventsTriggered.coalitionDongzhuo){
    tryTriggerHistoricalEvent('coalition_dongzhuo');
  }
  // Yellow Turban
  if(y>=2 && y<=4 && !getState().eventsTriggered.yellowTurban && Math.random()<0.25){
    getState().eventsTriggered.yellowTurban=true;
    const free = getState().cities.filter(c=>!c.owner);
    if(free.length){
      const c = free[Math.floor(Math.random()*free.length)];
      c.owner='huangjin'; c.troops=3000; c.morale=50;
      getState().factions.huangjin = {id:'huangjin',name:'黄巾军',color:'#d4af37',leader:'张角',personality:'expansion',ai:true,food:500,gold:200,troops:0,morale:60,allies:[],eliminated:false,tech:JSON.parse(JSON.stringify(DEFAULT_TECH))};
      getState().relations.huangjin={}; Object.keys(getState().factions).forEach(k=>{ if(k==='huangjin'){getState().relations.huangjin.huangjin=100;} else {getState().relations.huangjin[k]=-50;getState().relations[k].huangjin=-50;} });
      log(`黄巾起义爆发！张角占据 ${c.name}，建立黄巾军势力！`);
    }
  }
  // Guandu
  if(y>=4 && y<=6 && !getState().eventsTriggered.guandu && Math.random()<0.3){
    getState().eventsTriggered.guandu=true;
    setRelation('cao','yuan',-100);
    log('官渡之战：曹操与袁绍正式宣战！');
  }
  // San gu maolu
  if(y>=3 && y<=5 && !getState().eventsTriggered.sangu && player().id==='liu' && !factionGenerals('liu').some(g=>g.name==='诸葛亮')){
    getState().eventsTriggered.sangu=true;
    const zg = findGeneral('诸葛亮');
    if(zg && zg.faction!=='liu'){ zg.faction='liu'; zg.loyalty=100; log('三顾茅庐：诸葛亮出山，辅佐刘备！'); }
  }
  // Chibi
  if(y>=6 && y<=8 && !getState().eventsTriggered.chibi){
    getState().eventsTriggered.chibi=true;
    log('赤壁之战：曹操南征，孙刘联盟抗曹！');
    if(getState().factions.cao && !getState().factions.cao.eliminated){
      getState().factions.cao.troops = Math.floor(getState().factions.cao.troops*0.7);
      getState().factions.cao.food = Math.floor(getState().factions.cao.food*0.8);
      log('赤壁大火：曹操水军损失惨重，南征受挫。');
    }
  }
  // 夷陵之战
  if(y>=12 && y<=16 && getState().playerId==='liu' && !getState().eventsTriggered.yiling && getState().factions.sun && !getState().factions.sun.eliminated){
    const jz = findCity('荆州');
    if(jz && jz.owner==='sun') tryTriggerHistoricalEvent('yiling_battle');
  }
  // 南中平定
  if(y>=10 && y<=18 && !getState().eventsTriggered.sevenCaptures){
    const ownedSouth = ['成都','永安','建宁','云南'].filter(n=>{ const c=findCity(n); return c && c.owner===getState().playerId; }).length;
    if(ownedSouth>=2) tryTriggerHistoricalEvent('seven_captures');
  }
  // Diyi shijinzhou
  if(y>=8 && y<=12 && !getState().eventsTriggered.jingzhouLost){
    const guanyu = findGeneral('关羽');
    const jz = findCity('荆州');
    if(guanyu && guanyu.faction==='liu' && jz && jz.owner==='liu' && getState().factions.sun && !getState().factions.sun.eliminated && Math.random()<0.2){
      getState().eventsTriggered.jingzhouLost=true;
      jz.owner='sun'; jz.troops=Math.floor(jz.troops*0.7);
      log(`大意失荆州：孙权偷袭荆州，关羽败走麦城！`);
    }
  }
  // Baimenlou
  if(y>=5 && y<=8 && !getState().eventsTriggered.baimenlou && getState().factions.lv && !getState().factions.lv.eliminated && getState().factions.cao && !getState().factions.cao.eliminated){
    if(Math.random()<0.25){
      getState().eventsTriggered.baimenlou=true;
      factionCities('lv').forEach(c=>{c.owner='cao';c.morale=50;});
      // 吕布势力灭亡：清理其军团，避免幽灵势力卡住武将
      getState().armies = getState().armies.filter(a=>a.faction!=='lv');
      getState().factions.lv.eliminated = true;
      getState().factions.lv.ai = false;
      log('白门楼：吕布兵败被杀，城池尽归曹操！');
    }
  }
  // Wuzhangyuan
  if(y>=15 && y<=17 && !getState().eventsTriggered.wuzhangyuan){
    const zg = findGeneral('诸葛亮');
    if(zg && zg.faction===getState().playerId && Math.random()<0.3){
      getState().eventsTriggered.wuzhangyuan=true;
      zg.injured=1; zg.injuredTurns=99;
      log('五丈原：诸葛亮星落秋风，英年早逝！');
    }
  }
  // Three Kingdoms to Jin
  if(y>=20 && y<=25 && !getState().eventsTriggered.sanguiguijin){
    const smy = findGeneral('司马懿');
    const sf = smy && smy.faction!==getState().playerId ? getState().factions[smy.faction] : null;
    if(sf && !sf.eliminated && Math.random()<0.2){
      getState().eventsTriggered.sanguiguijin=true;
      log(`三国归晋：司马氏篡${sf.name}，天下终归晋朝！`);
      getState().gameOver=true; getState().winner=smy.faction; getState().endingTitle='三国归晋：天下终归司马氏';
    }
  }
  // 长期僵局结局
  if(y>=30 && !getState().gameOver){
    const alive = Object.values(getState().factions).filter(f=>!f.eliminated);
    const top = alive.slice().sort((a,b)=>factionCities(b.id).length-factionCities(a.id).length)[0];
    getState().gameOver=true; getState().winner=top?top.id:null;
    getState().endingTitle='天下三分：群雄割据，终究无人能一统';
    log(getState().endingTitle);
  }
}

function randomEvent() {
  triggerRandomEvent();
}

function triggerSeasonEvent() {
  const season = getSeason();
  const seasonEvents = EVENTS.filter(ev => ev.id.startsWith('season_') && ev.id.endsWith(season));
  if (!seasonEvents.length) return;
  Object.values(getState().factions).filter(f => !f.eliminated).forEach(f => {
    const cities = factionCities(f.id);
    if (!cities.length) return;
    const city = cities[Math.floor(Math.random() * cities.length)];
    const ev = seasonEvents[0];
    const ctx = { state: getState(), faction: f, city };
    if (ev.condition && !ev.condition(ctx)) return;
    if (f.id === getState().playerId) {
      addPendingEvent(ev, ctx);
    } else {
      // AI 季节事件直接结算
      if (ev.effect) ev.effect(ctx);
    }
  });
}

function triggerRandomEvent() {
  // 优先推进事件链
  Object.values(getState().factions).filter(f => !f.eliminated).forEach(f => triggerChainedEvent(f));

  const candidates = [];
  // 每个存活势力都可能触发事件，玩家势力优先
  const factions = Object.values(getState().factions).filter(f => !f.eliminated);
  factions.forEach(f => {
    const cities = factionCities(f.id);
    if (!cities.length) return;
    const city = cities[Math.floor(Math.random() * cities.length)];
    const ctx = { state: getState(), faction: f, city };
    EVENTS.forEach(ev => {
      if (ev.weight <= 0) return;
      try { if (ev.condition && !ev.condition(ctx)) return; } catch (e) { return; }
      candidates.push({ ev, ctx, weight: ev.weight });
    });
  });
  if (!candidates.length) { log('这一年天下相对太平。'); return; }
  // 加权随机选 1-2 个事件
  const count = Math.random() < 0.7 ? 1 : 2;
  for (let i = 0; i < count; i++) {
    const total = candidates.reduce((s, c) => s + c.weight, 0);
    let r = Math.random() * total;
    let pick = null;
    for (const c of candidates) {
      r -= c.weight;
      if (r <= 0) { pick = c; break; }
    }
    if (!pick) pick = candidates[0];
    addPendingEvent(pick.ev, pick.ctx);
    // 启动事件链
    const chain = Object.values(EVENT_CHAINS).find(ch => ch.first === pick.ev.id);
    if (chain && !getState().eventChains?.[chain.first]) startEventChain(chain.first);
    candidates.splice(candidates.indexOf(pick), 1);
    if (!candidates.length) break;
  }
}

function addPendingEvent(ev, ctx) {
  const desc = typeof ev.desc === 'function' ? ev.desc(ctx) : ev.desc;
  const evt = {
    id: getState().eventIdSeq++,
    defId: ev.id,
    title: ev.title,
    desc,
    type: ev.type,
    factionId: ctx.faction.id,
    cityName: ctx.city.name,
    generalName: ctx.general ? ctx.general.name : null,
    choices: ev.choices ? ev.choices.map((c, idx) => ({ label: c.label, idx, condition: c.condition })) : [],
    createdTurn: getState().turn,
    resolved: false
  };
  getState().pendingEvents.push(evt);
  // AI 事件立即自动处理；玩家事件加入待处理列表
  if (ctx.faction.id !== getState().playerId) {
    autoResolveEvent(evt);
  } else {
    log(`[事件] ${evt.title}：${evt.desc}`);
  }
}

function autoResolveEvent(evt) {
  const ev = EVENTS.find(e => e.id === evt.defId);
  if (!ev) return;
  const ctx = buildEventContext(evt);
  if (!ctx) { resolveEvent(evt, '事件上下文无效，已跳过。'); return; }
  let result = '';
  if (ev.type === 'choice' && ev.choices) {
    // AI 选第一个满足条件的选项，否则选最后一个
    let choice = ev.choices[ev.choices.length - 1];
    for (const c of ev.choices) {
      try { if (!c.condition || c.condition(ctx)) { choice = c; break; } } catch (e) {}
    }
    if (choice.effect) result = choice.effect(ctx) || '';
  } else if (ev.effect) {
    ev.effect(ctx);
    result = `${evt.title} 已发生。`;
  }
  resolveEvent(evt, result);
}

function buildEventContext(evt) {
  const faction = getState().factions[evt.factionId];
  const city = findCity(evt.cityName);
  const general = evt.generalName ? findGeneral(evt.generalName) : null;
  if (!faction || !city) return null;
  return { state: getState(), faction, city, general };
}

function resolveEvent(evt, result) {
  evt.resolved = true;
  getState().pendingEvents = getState().pendingEvents.filter(e => e.id !== evt.id);
  getState().eventHistory.unshift({
    turn: getState().turn,
    year: getState().year,
    month: getState().month,
    title: evt.title,
    desc: evt.desc,
    result
  });
  if (getState().eventHistory.length > 50) getState().eventHistory.pop();
  if (result) log(`[事件] ${evt.title}：${result}`);
  getState().stats.eventsResolved++;
  checkAchievements();
}

function autoResolveAllPending() {
  // 自动处理所有未处理的玩家事件（默认选第一个可选项）
  const playerEvents = getState().pendingEvents.filter(e => e.factionId === getState().playerId);
  playerEvents.forEach(evt => autoResolveEvent(evt));
}

export {
  EVENT_CHAINS, startEventChain, advanceEventChain, getChainNextEvent, triggerChainedEvent,
  tryTriggerHistoricalEvent, historicalEvents, randomEvent, triggerSeasonEvent,
  triggerRandomEvent, addPendingEvent, autoResolveEvent, buildEventContext,
  resolveEvent, autoResolveAllPending
};
