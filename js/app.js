import { initState, getState } from './core/state.js';
import { renderAll } from './ui/renderer.js';
import { log } from './core/log.js';
import { closeModal, switchTab } from './ui/common.js';
import {
  showTutorialStep, nextTutorialStep, prevTutorialStep, skipTutorial, closeTutorial
} from './systems/tutorial.js';
import {
  doInternal, setDifficulty, setPolicy, updateBuildingPanel, doBuildBuilding
} from './ui/tabs/internal.js';
import {
  updateAtkTargets, updateAtkPreview, reinforceCity, doArmyAttack, openArmyEditor, saveArmy, disbandArmy
} from './ui/tabs/military.js';
import {
  openEquipShop, buyEquip, equipItem, recruitGeneral
} from './ui/tabs/talent.js';
import { doDiplomacy } from './ui/tabs/diplomacy.js';
import {
  dismissTip, resolvePlayerEvent
} from './ui/tabs/events.js';
import {
  saveGame, exportEncryptedSave, importEncryptedSave, promptImportSave, loadGame
} from './systems/save.js';
import { nextTurn } from './systems/economy.js';

function initGame() {
  initState();
  try {
    if (localStorage.getItem('sanguo_slg_tutorial_seen')) getState().tutorial = false;
  } catch (e) {}
  if (getState().tutorial) setTimeout(() => { showTutorialStep(); }, 100);
  renderAll();
}

const appActions = {
  getState,
  initGame,
  switchTab,
  closeModal,

  closeTutorial,
  showTutorial: showTutorialStep,
  showTutorialStep,
  nextTutorialStep,
  prevTutorialStep,
  skipTutorial,

  doInternal,
  setDifficulty,
  setPolicy,
  updateBuildingPanel,
  doBuildBuilding,

  updateAtkTargets,
  updateAtkPreview,
  reinforceCity,
  doArmyAttack,
  openArmyEditor,
  saveArmy,
  disbandArmy,

  openEquipShop,
  buyEquip,
  equipItem,
  recruitGeneral,

  doDiplomacy,

  dismissTip,
  resolvePlayerEvent,

  saveGame,
  exportEncryptedSave,
  importEncryptedSave: (input) => { if (importEncryptedSave(input)) renderAll(); },
  promptImportSave: () => { if (promptImportSave()) renderAll(); },
  loadGame: () => {
    if (loadGame()) {
      if (getState().tutorial) setTimeout(() => { showTutorialStep(); }, 100);
      renderAll();
    }
  },

  nextTurn: () => { nextTurn(); renderAll(); }
};

window.appActions = appActions;

window.addEventListener('DOMContentLoaded', () => {
  window.onerror = (msg, source, line, col, err) => {
    log('系统错误：' + msg);
    if (err) console.error(err);
    return false;
  };

  initState();
  try {
    if (localStorage.getItem('sanguo_slg_tutorial_seen')) getState().tutorial = false;
  } catch (e) {}
  if (getState().tutorial) setTimeout(() => { showTutorialStep(); }, 100);
  renderAll();
});
