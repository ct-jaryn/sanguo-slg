import { makeGenerals } from '../data/generals.js';
import { makeCities } from '../data/cities.js';
import { makeFactions } from '../data/factions.js';
import { EQUIPMENT_POOL } from '../config/equipment.js';
import { initCityBuildings } from '../config/buildings.js';
import { log, setLogState } from './log.js';

const DEFAULT_TECH = {
  farm: { level: 0, max: 5, farmBonus: 0 },
  comm: { level: 0, max: 5, commBonus: 0 },
  military: { level: 0, max: 5, recruitBonus: 0, atkBonus: 0 },
  fort: { level: 0, max: 5, defBonus: 0 }
};

let state;
let selectedTab = 'internal';

function initState() {
  const factions = makeFactions();
  Object.values(factions).forEach(f => { f.tech = JSON.parse(JSON.stringify(DEFAULT_TECH)); });
  const cities = makeCities();
  cities.forEach(c => initCityBuildings(c));
  const generals = makeGenerals();
  const relations = {};
  const ids = Object.keys(factions);
  ids.forEach(a=>{relations[a]={};ids.forEach(b=>{relations[a][b]=a===b?100:(factions[a].ai&&factions[b].ai?30:20);});});
  state = {
    factions, cities, generals,
    relations,
    year: 1, month: 1, turn: 1,
    playerId: 'liu',
    logs: [],
    gameOver: false,
    winner: null,
    policy: null,
    eventsTriggered: {},
    pendingEvents: [],
    eventHistory: [],
    eventIdSeq: 1,
    yellowTurban: false,
    armies: [],
    nextArmyId: 1,
    tutorial: true,
    tutorialStep: 0,
    difficulty: 'normal',
    shownTips: {},
    achievements: {},
    stats: { wins: 0, battles: 0, generalsDefeated: 0, citiesLost: 0, eventsResolved: 0 },
    quests: {},
    eventChains: {},
    endingTitle: null,
    equipmentPool: JSON.parse(JSON.stringify(EQUIPMENT_POOL))
  };
  setLogState(state);
  log('游戏开始！公元190年，乱世群雄并起。');
}

function getState() { return state; }
function setState(newState) { state = newState; }
function getSelectedTab() { return selectedTab; }
function setSelectedTab(tab) { selectedTab = tab; }

export { getState, setState, getSelectedTab, setSelectedTab, initState, DEFAULT_TECH };
