import { getState } from '../core/state.js';
import { log } from '../core/log.js';
import { factionCities, factionGenerals, player } from '../core/utils.js';
import { playSound } from './audio.js';

const ACHIEVEMENTS = [
  { id: 'first_blood', name: '初出茅庐', desc: '攻占第一座城池', check: () => factionCities(getState().playerId).length >= 1 && getState().turn > 1 },
  { id: 'expansion', name: '开疆拓土', desc: '拥有 10 座城池', check: () => factionCities(getState().playerId).length >= 10 },
  { id: 'dominator', name: '半壁江山', desc: '拥有 25 座城池', check: () => factionCities(getState().playerId).length >= 25 },
  { id: 'collector', name: '群英荟萃', desc: '拥有 20 名武将', check: () => factionGenerals(getState().playerId).length >= 20 },
  { id: 'wealthy', name: '富甲一方', desc: '金钱达到 5000', check: () => player().gold >= 5000 },
  { id: 'granary', name: '粮仓充足', desc: '粮食达到 10000', check: () => player().food >= 10000 },
  { id: 'warmonger', name: '百战之师', desc: '累计胜利 20 次', check: () => (getState().stats && getState().stats.wins >= 20) },
  { id: 'diplomat', name: '合纵连横', desc: '与所有存活势力结盟', check: () => {
    const alive = Object.values(getState().factions).filter(f => !f.eliminated && f.id !== getState().playerId);
    const p = player();
    return alive.length > 0 && alive.every(f => p.allies.includes(f.id));
  }},
  { id: 'unifier', name: '天下归心', desc: '统一天下', check: () => getState().winner === getState().playerId },
  { id: 'scholar', name: '科技强国', desc: '所有科技达到满级', check: () => Object.values(getState().tech).every(t => t.level >= t.max) }
];

function initStats() {
  if (!getState().stats) getState().stats = { wins: 0, battles: 0, generalsDefeated: 0, citiesLost: 0, eventsResolved: 0 };
}

function checkAchievements() {
  initStats();
  let newlyUnlocked = [];
  if (!getState().achievements) getState().achievements = {};
  const p = player();
  ACHIEVEMENTS.forEach(ach => {
    if (getState().achievements[ach.id]) return;
    let ok = false;
    try { ok = ach.check(); } catch (e) {}
    if (ok) {
      getState().achievements[ach.id] = { unlockedAt: { year: getState().year, month: getState().month, turn: getState().turn } };
      newlyUnlocked.push(ach);
    }
  });
  newlyUnlocked.forEach(ach => log(`成就解锁：${ach.name} — ${ach.desc}`));
  if (newlyUnlocked.length) {
    playSound('achievement');
    showAchievementPop(newlyUnlocked[0]);
  }
  return newlyUnlocked;
}

function showAchievementPop(ach) {
  const pop = document.createElement('div');
  pop.className = 'achievement-pop';
  pop.innerHTML = `<b>成就解锁</b><br/>${ach.name}<br/><span style="font-size:0.8rem;color:var(--muted)">${ach.desc}</span>`;
  document.body.appendChild(pop);
  setTimeout(() => { pop.remove(); }, 3200);
}

export { ACHIEVEMENTS, initStats, checkAchievements, showAchievementPop };
