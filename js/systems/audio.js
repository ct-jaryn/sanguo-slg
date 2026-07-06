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

export { playSound };
