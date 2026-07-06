import { getState, getSelectedTab } from '../core/state.js';
import {
  setRenderContent, renderLogs, renderHeader, renderSidebar, currentGoal, tabTip,
  renderAll
} from './common.js';
import { renderInternal } from './tabs/internal.js';
import { renderMilitary } from './tabs/military.js';
import { renderTalent } from './tabs/talent.js';
import { renderDiplomacy } from './tabs/diplomacy.js';
import { renderMap } from './tabs/map.js';
import { renderEvents, renderAchievements, renderLogPage } from './tabs/events.js';

function renderContent() {
  const state = getState();
  const c = document.getElementById('content');
  if (!c) return;
  const selectedTab = getSelectedTab();
  if(state.gameOver) {
    const msg = state.endingTitle || (state.winner===state.playerId ? '恭喜统一天下！' : (state.winner ? `${state.factions[state.winner] ? state.factions[state.winner].name : state.winner} 一统天下，你失败了。` : '你的势力覆灭了。'));
    c.innerHTML = `<div class="card"><h2>${msg}</h2><button class="action" onclick="window.initGame()">重新开始</button></div>`;
    return;
  }
  const tip = tabTip(selectedTab);
  let topHtml = `<div class="goal-bar">${currentGoal()}</div>`;
  if (tip && !state.shownTips[selectedTab]) {
    topHtml += `<div class="tip-bar"><b>新手提示：</b>${tip} <a href="#" onclick="window.dismissTip('${selectedTab}');return false;" style="color:var(--accent-red)">[知道了]</a></div>`;
  }
  const contentDiv = document.createElement('div');
  switch(selectedTab){
    case 'internal': renderInternal(contentDiv); break;
    case 'military': renderMilitary(contentDiv); break;
    case 'talent': renderTalent(contentDiv); break;
    case 'diplomacy': renderDiplomacy(contentDiv); break;
    case 'map': renderMap(contentDiv); break;
    case 'events': renderEvents(contentDiv); break;
    case 'achievements': renderAchievements(contentDiv); break;
    case 'logs': renderLogPage(contentDiv); break;
  }
  c.innerHTML = topHtml + contentDiv.innerHTML;
}

setRenderContent(renderContent);

export { renderAll, renderContent };
