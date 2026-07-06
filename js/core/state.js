import { makeGenerals } from '../data/generals.js';
import { makeCities } from '../data/cities.js';
import { makeFactions } from '../data/factions.js';
import { log, setLogState } from './log.js';

let state;
let selectedTab = 'internal';

function initState() {
  const factions = makeFactions();
  const cities = makeCities();
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
    tech: {
      farm: { level: 0, max: 5, farmBonus: 0 },
      comm: { level: 0, max: 5, commBonus: 0 },
      military: { level: 0, max: 5, recruitBonus: 0, atkBonus: 0 },
      fort: { level: 0, max: 5, defBonus: 0 }
    },
    policy: null,
    eventsTriggered: {},
    pendingEvents: [],
    eventHistory: [],
    eventIdSeq: 1,
    yellowTurban: false,
    armies: [],
    nextArmyId: 1,
    tutorial: !localStorage.getItem('sanguo_slg_tutorial_seen'),
    tutorialStep: 0,
    difficulty: 'normal',
    shownTips: {},
    achievements: {},
    stats: { wins: 0, battles: 0, generalsDefeated: 0, citiesLost: 0, eventsResolved: 0 },
    eventChains: {},
    endingTitle: null
  };
  setLogState(state);
  log('游戏开始！公元190年，乱世群雄并起。');
  if(state.tutorial) setTimeout(()=>{ window.showTutorialStep(); }, 100);
}

function getState() { return state; }
function setState(newState) { state = newState; }
function getSelectedTab() { return selectedTab; }
function setSelectedTab(tab) { selectedTab = tab; }

export { getState, setState, getSelectedTab, setSelectedTab, initState };
