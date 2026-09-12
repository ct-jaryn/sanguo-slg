/**
 * Toast notification system.
 * Replaces alert() calls with non-blocking notifications.
 */

const TOAST_DURATION = 3500;
const TOAST_MAX = 5;

let toastContainer = null;

function ensureContainer() {
  if (toastContainer && document.body.contains(toastContainer)) return toastContainer;
  toastContainer = document.createElement('div');
  toastContainer.className = 'toast-container';
  document.body.appendChild(toastContainer);
  return toastContainer;
}

function getIconSvg(type) {
  const icons = {
    success: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6L9 17l-5-5"/></svg>',
    error: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>',
    warning: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/><path d="M12 9v4M12 17h.01"/></svg>',
    info: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/></svg>',
    battle: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.5 17.5L3 6V3h3l11.5 11.5"/><path d="M13 19l6-6"/><path d="M16 16l4 4"/></svg>',
  };
  return icons[type] || icons.info;
}

/**
 * Show a toast notification.
 * @param {string} message - Toast message
 * @param {string} type - 'success' | 'error' | 'warning' | 'info' | 'battle'
 * @param {number} duration - ms to show (default 3500)
 */
function showToast(message, type = 'info', duration = TOAST_DURATION) {
  const container = ensureContainer();

  // Limit visible toasts
  while (container.children.length >= TOAST_MAX) {
    container.removeChild(container.firstChild);
  }

  const toast = document.createElement('div');
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span class="toast-icon">${getIconSvg(type)}</span>
    <span class="toast-msg">${message}</span>
    <button class="toast-close" aria-label="关闭">&times;</button>
  `;

  const close = () => {
    toast.classList.add('toast-out');
    toast.addEventListener('animationend', () => toast.remove(), { once: true });
  };

  toast.querySelector('.toast-close').addEventListener('click', close);
  container.appendChild(toast);

  if (duration > 0) {
    setTimeout(close, duration);
  }

  return toast;
}

/**
 * Show resource change floating text near an element.
 */
function showResourceFloat(el, text, color) {
  if (!el) return;
  const rect = el.getBoundingClientRect();
  const flo = document.createElement('div');
  flo.className = 'res-float';
  flo.textContent = text;
  flo.style.color = color || '#1a5c1a';
  flo.style.left = (rect.left + rect.width / 2) + 'px';
  flo.style.top = rect.top + 'px';
  document.body.appendChild(flo);
  flo.addEventListener('animationend', () => flo.remove(), { once: true });
}

/**
 * Flash the resource pills in the header when values change.
 */
function flashResources() {
  document.querySelectorAll('.res-item').forEach(el => {
    el.classList.remove('res-flash');
    void el.offsetWidth; // reflow to restart animation
    el.classList.add('res-flash');
  });
}

export { showToast, showResourceFloat, flashResources };
