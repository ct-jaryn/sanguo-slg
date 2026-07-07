import { getState } from '../core/state.js';
import { saveAuto } from './save.js';
import { switchTab } from '../ui/common.js';

const TUTORIAL_STEPS = [
  { title: '欢迎来到《三国风云·轻量 SLG》', msg: '你扮演刘备，目标是统一天下。本引导将带你熟悉核心界面。', target: null },
  { title: '资源概览', msg: '顶部显示粮食、金钱、兵力与士气。这些资源决定你能养多少兵、升多少科技。', target: '#h-res' },
  { title: '功能导航', msg: '左侧按钮可切换内政、军事、人才、外交、地图、事件、成就和日志。', target: '#sidebar' },
  { title: '内政经营', msg: '开垦农田、发展商业、招兵买马、研发科技、颁布政策，是势力发展的根基。', target: '#content', tab: 'internal' },
  { title: '军事出征', msg: '组建军团并分配步骑弓，选择合适战术攻占相邻城池。围城耗坚城，火攻/埋伏需高智力主将。', target: '#content', tab: 'military' },
  { title: '人才养成', msg: '寻访武将、招降敌将、装备养成、战斗升级。羁绊武将同军团可触发组合技。', target: '#content', tab: 'talent' },
  { title: '外交纵横', msg: '与强敌结盟争取时间，对弱敌宣战扩张，也可离间敌方武将。', target: '#content', tab: 'diplomacy' },
  { title: '天下地图', msg: '点击地图城池可快速切换军事面板，观察局势一目了然。', target: '#content', tab: 'map' },
  { title: '事件处理', msg: '及时处理随机事件和历史事件，选择最适合当前局势的选项。', target: '#content', tab: 'events' },
  { title: '准备就绪', msg: '每回合结束会结算资源并触发 AI 行动。现在点击「结束回合」开始你的征程吧！', target: '#sidebar' }
];

function closeTutorial() {
  const overlay = document.getElementById('tutorial');
  if (overlay) overlay.style.display = 'none';
  document.querySelectorAll('.tutorial-target').forEach(el => el.classList.remove('tutorial-target'));
}

function showTutorialStep() {
  if (!getState().tutorial) return;
  let idx = getState().tutorialStep || 0;
  if (idx >= TUTORIAL_STEPS.length) { closeTutorial(); return; }
  const step = TUTORIAL_STEPS[idx];
  if (!step) { closeTutorial(); return; }
  if (step.tab) switchTab(step.tab);
  const overlay = document.getElementById('tutorial');
  const box = document.getElementById('tutorial-box');
  document.querySelectorAll('.tutorial-target').forEach(el => el.classList.remove('tutorial-target'));
  if (step.target) {
    const el = document.querySelector(step.target);
    if (el) el.classList.add('tutorial-target');
  }
  const isLast = idx >= TUTORIAL_STEPS.length - 1;
  box.innerHTML = `
    <h2>${step.title}</h2>
    <p>${step.msg}</p>
    <div style="margin-top:16px">
      ${idx > 0 ? '<button class="action" onclick="window.prevTutorialStep()">上一步</button>' : ''}
      <button class="action" onclick="window.nextTutorialStep()" style="background:var(--accent-green);color:#fff;border-color:var(--accent-green)">${isLast ? '开始征程' : '下一步'}</button>
      <button class="action" onclick="window.skipTutorial()">跳过</button>
    </div>
    <div style="margin-top:8px;font-size:0.8rem;color:var(--muted)">步骤 ${idx + 1} / ${TUTORIAL_STEPS.length}</div>`;
  overlay.style.display = 'flex';
}

function nextTutorialStep() {
  const next = (getState().tutorialStep || 0) + 1;
  if (next >= TUTORIAL_STEPS.length) window.closeTutorial();
  else { getState().tutorialStep = next; showTutorialStep(); }
}

function prevTutorialStep() {
  getState().tutorialStep = Math.max(0, (getState().tutorialStep || 0) - 1);
  showTutorialStep();
}

function skipTutorial() {
  getState().tutorial = false;
  getState().tutorialStep = 0;
  const overlay = document.getElementById('tutorial');
  if (overlay) overlay.style.display = 'none';
  document.querySelectorAll('.tutorial-target').forEach(el => el.classList.remove('tutorial-target'));
  try { localStorage.setItem('sanguo_slg_tutorial_seen', '1'); } catch (e) {}
  saveAuto();
}

export { showTutorialStep, nextTutorialStep, prevTutorialStep, skipTutorial, closeTutorial };
