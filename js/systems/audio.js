import { getState } from '../core/state.js';
import { log } from '../core/utils.js';

let audioCtx = null;
function initAudio() {
  if (audioCtx) return;
  try { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { audioCtx = null; }
}
function playTone(freq, type, duration, delay) {
  if (!audioCtx) return;
  const t = audioCtx.currentTime + (delay || 0);
  const o = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  o.type = type || 'sine';
  o.frequency.value = freq;
  o.connect(g);
  g.connect(audioCtx.destination);
  g.gain.setValueAtTime(0.08, t);
  g.gain.exponentialRampToValueAtTime(0.001, t + duration);
  o.start(t);
  o.stop(t + duration);
}
function playSound(name) {
  initAudio();
  if (name === 'attack') {
    playTone(130, 'sawtooth', 0.12, 0);
    playTone(90, 'sawtooth', 0.18, 0.1);
  } else if (name === 'victory') {
    playTone(523, 'sine', 0.18, 0);
    playTone(659, 'sine', 0.18, 0.15);
    playTone(784, 'sine', 0.35, 0.3);
  } else if (name === 'defeat') {
    playTone(300, 'sawtooth', 0.3, 0);
    playTone(200, 'sawtooth', 0.4, 0.2);
  } else if (name === 'achievement') {
    playTone(880, 'sine', 0.1, 0);
    playTone(1109, 'sine', 0.2, 0.1);
  } else if (name === 'march') {
    playTone(80, 'triangle', 0.2, 0);
    playTone(80, 'triangle', 0.2, 0.18);
  }
}

// ---------- 战斗动画 ----------
function showBattleFx(text, cls) {
  const fx = document.getElementById('battle-fx');
  if (!fx) return;
  fx.innerHTML = `<div class="fx-text ${cls || ''}">${text}</div>`;
  fx.classList.add('active');
  document.body.classList.add('battle-shake');
  setTimeout(() => { fx.classList.remove('active'); document.body.classList.remove('battle-shake'); }, 650);
}

function showBattleReport(r) {
  const modal = document.getElementById('modal');
  const content = document.getElementById('modal-content');
  if (!modal || !content) return;
  const resultColor = r.victory ? 'var(--accent-green)' : 'var(--accent-red)';
  const resultText = r.victory ? '胜利' : '失败';
  content.innerHTML = `
    <h2>战斗结算 · ${r.cityName}</h2>
    <div style="margin:8px 0"><b style="color:${resultColor}">${resultText}</b> · 战术：${r.tacticName}</div>
    <div style="margin:8px 0">攻方：${r.attacker} · ${r.armyName}（主将 ${r.mainGeneral}）</div>
    <div style="margin:8px 0">守方：${r.defender}</div>
    <div style="margin:8px 0;display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div style="padding:8px;border:1px solid var(--border);border-radius:4px">攻方损失<br/><b>${r.atkLosses}</b></div>
      <div style="padding:8px;border:1px solid var(--border);border-radius:4px">守方损失<br/><b>${r.defLosses}</b></div>
    </div>
    ${r.bonds && r.bonds.length ? `<div style="margin:8px 0"><b>羁绊触发：</b>${r.bonds.join('、')}</div>` : ''}
    ${r.reward ? `<div style="margin:8px 0">获得金钱：<b>${r.reward}</b></div>` : ''}
    ${r.equipment ? `<div style="margin:8px 0">缴获装备：<b>${r.equipment}</b></div>` : ''}
    <div style="margin-top:12px"><button class="action" onclick="window.closeModal()">关闭</button></div>`;
  modal.style.display = 'flex';
}

export { initAudio, playTone, playSound, showBattleFx, showBattleReport };
