/* ================================================================
   LearnMate — main.js
   Global UI interactions: hamburger nav, shared utils
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── Hamburger / mobile nav ──────────────────────────────────────
  const hamburger = document.getElementById('hamburger');
  const navLinks  = document.getElementById('navLinks');

  if (hamburger && navLinks) {
    hamburger.addEventListener('click', () => {
      hamburger.classList.toggle('open');
      navLinks.classList.toggle('open');
    });

    // Close nav when a link is clicked on mobile
    navLinks.querySelectorAll('.nav-link').forEach(link => {
      link.addEventListener('click', () => {
        hamburger.classList.remove('open');
        navLinks.classList.remove('open');
      });
    });
  }

  // ── Highlight active nav link by current path ───────────────────
  const path = window.location.pathname;
  document.querySelectorAll('.nav-link').forEach(link => {
    if (link.getAttribute('href') === path) link.classList.add('active');
  });
});


/* ── Shared utility: debounce ──────────────────────────────────── */
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

/* ── Toast notification ─────────────────────────────────────────── */
function showToast(message, type = 'info') {
  const existing = document.getElementById('lm-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'lm-toast';
  toast.textContent = message;
  Object.assign(toast.style, {
    position:     'fixed',
    bottom:       '1.5rem',
    right:        '1.5rem',
    padding:      '0.75rem 1.25rem',
    borderRadius: '10px',
    fontSize:     '0.875rem',
    fontWeight:   '600',
    color:        '#fff',
    background:   type === 'error' ? '#ef4444' :
                  type === 'success' ? '#22c55e' : '#7c3aed',
    boxShadow:    '0 8px 24px rgba(0,0,0,.15)',
    zIndex:       9999,
    opacity:      0,
    transform:    'translateY(12px)',
    transition:   'opacity 0.2s, transform 0.2s',
  });

  document.body.appendChild(toast);
  requestAnimationFrame(() => {
    toast.style.opacity   = '1';
    toast.style.transform = 'translateY(0)';
  });
  setTimeout(() => {
    toast.style.opacity   = '0';
    toast.style.transform = 'translateY(12px)';
    setTimeout(() => toast.remove(), 250);
  }, 3000);
}
