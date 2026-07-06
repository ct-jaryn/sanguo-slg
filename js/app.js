import { initState } from './core/state.js';
import { log } from './core/utils.js';
import { renderAll } from './ui/renderer.js';
import { switchTab } from './ui/renderer.js';
import { closeModal, showBattleReport } from './ui/modal.js';
import {
  showTutorialStep, nextTutorialStep, prevTutorialStep, skipTutorial
} from './systems/tutorial.js';
import {
  doInternal, setDifficulty, setPolicy
} from './ui/tabs/internal.js';
import {
  updateAtkTargets, reinforceCity, doArmyAttack, openArmyEditor, saveArmy, disbandArmy
} from './ui/tabs/military.js';
import {
  openEquipShop, buyEquip, equipItem, recruitGeneral
} from './ui/tabs/talent.js';
import { doDiplomacy } from './ui/tabs/diplomacy.js';
import {
  renderEvents, renderLogPage, renderAchievements, dismissTip, resolvePlayerEvent
} from './ui/tabs/events.js';
import {
  saveGame, exportEncryptedSave, importEncryptedSave, promptImportSave, loadGame
} from './systems/save.js';
import { nextTurn } from './systems/economy.js';

function showTutorial() {
  showTutorialStep();
}

function closeTutorial() {
  const overlay = document.getElementById('tutorial');
  if (overlay) overlay.style.display = 'none';
  document.querySelectorAll('.tutorial-target').forEach(el => el.classList.remove('tutorial-target'));
}

function initGame() {
  initState();
}

window.addEventListener('DOMContentLoaded', () => {
  // 绑定所有需要在 HTML onclick 中使用的函数到 window
  window.initGame = initGame;
  window.switchTab = switchTab;
  window.closeModal = closeModal;
  window.showBattleReport = showBattleReport;

  window.showTutorial = showTutorial;
  window.closeTutorial = closeTutorial;
  window.showTutorialStep = showTutorialStep;
  window.nextTutorialStep = nextTutorialStep;
  window.prevTutorialStep = prevTutorialStep;
  window.skipTutorial = skipTutorial;

  window.doInternal = doInternal;
  window.setDifficulty = setDifficulty;
  window.setPolicy = setPolicy;

  window.updateAtkTargets = updateAtkTargets;
  window.reinforceCity = reinforceCity;
  window.doArmyAttack = doArmyAttack;
  window.openArmyEditor = openArmyEditor;
  window.saveArmy = saveArmy;
  window.disbandArmy = disbandArmy;

  window.openEquipShop = openEquipShop;
  window.buyEquip = buyEquip;
  window.equipItem = equipItem;
  window.recruitGeneral = recruitGeneral;

  window.doDiplomacy = doDiplomacy;

  window.dismissTip = dismissTip;
  window.resolvePlayerEvent = resolvePlayerEvent;

  window.saveGame = saveGame;
  window.exportEncryptedSave = exportEncryptedSave;
  window.importEncryptedSave = importEncryptedSave;
  window.promptImportSave = promptImportSave;
  window.loadGame = loadGame;

  window.nextTurn = nextTurn;

  window.onerror = (msg) => { log('系统错误：' + msg); return true; };

  initState();
  renderAll();
});
