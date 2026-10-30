/* ================================================================
   LearnMate — goals.js
   Project Goal Tracker: add, update progress, filter, delete
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── DOM refs ────────────────────────────────────────────────────
  const goalsList   = document.getElementById('goalsList');
  const goalsEmpty  = document.getElementById('goalsEmpty');
  const titleInput  = document.getElementById('goalTitle');
  const trackSelect = document.getElementById('goalTrack');
  const deadlineIn  = document.getElementById('goalDeadline');
  const addGoalBtn  = document.getElementById('addGoalBtn');
  const goalSearch  = document.getElementById('goalSearch');
  const filterBtns  = document.querySelectorAll('.filter-btn');
  const template    = document.getElementById('goalCardTemplate');

  // Stats
  const statTotal  = document.getElementById('statTotal');
  const statActive = document.getElementById('statActive');
  const statDone   = document.getElementById('statDone');
  const statAvgPct = document.getElementById('statAvgPct');

  let allGoals    = [];
  let activeFilter = 'all';
  let searchQuery  = '';

  // ── Load goals on init ──────────────────────────────────────────
  loadGoals();

  // Listen for storage changes across tabs or windows
  window.addEventListener('storage', e => {
    if (e.key === 'goals') {
      readFromLocalStorage();
    }
  });

  // Re-read localStorage whenever the Goals tab gains focus
  window.addEventListener('focus', () => {
    readFromLocalStorage();
  });

  function readFromLocalStorage() {
    try {
      const stored = localStorage.getItem('goals');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) {
          allGoals = parsed;
          renderGoals();
          return true;
        }
      }
    } catch (e) {
      console.warn('Could not parse goals from localStorage:', e);
    }
    return false;
  }

  async function loadGoals() {
    // 1. Immediately read from localStorage on load/refresh so visual progress bar widths
    // and percentage text update without waiting for network
    const hasLocal = readFromLocalStorage();

    // 2. Fetch from backend API and merge progress
    try {
      const res  = await fetch('/api/goals');
      const data = await res.json();
      const serverGoals = data.goals || [];

      if (serverGoals.length > 0) {
        // If goals exist in localStorage (with auto-progress updates), merge progress values
        if (allGoals.length > 0) {
          serverGoals.forEach(sg => {
            const localMatch = allGoals.find(lg => lg.id === sg.id || lg.title === sg.title);
            if (localMatch && localMatch.progress !== undefined) {
              sg.progress = Math.max(parseInt(sg.progress, 10) || 0, parseInt(localMatch.progress, 10) || 0);
              if (sg.progress >= 100) sg.status = 'completed';
              // Sync back to backend if different
              patchGoal(sg.id, { progress: sg.progress, status: sg.status });
            }
          });
        }
        allGoals = serverGoals;
      } else if (!hasLocal) {
        allGoals = [];
      }

      syncGoalsToStorage();
      renderGoals();
    } catch (err) {
      console.error('Failed to load goals from server:', err);
      // Fallback: render whatever was cached in localStorage
      renderGoals();
    }
  }

  function syncGoalsToStorage() {
    if (allGoals && allGoals.length > 0) {
      localStorage.setItem('goals', JSON.stringify(allGoals));
    }
  }

  // ── Add goal ────────────────────────────────────────────────────
  addGoalBtn.addEventListener('click', addGoal);
  titleInput.addEventListener('keydown', e => {
    if (e.key === 'Enter') addGoal();
  });

  async function addGoal() {
    const title    = titleInput.value.trim();
    const track    = trackSelect.value;
    const deadline = deadlineIn.value;

    if (!title) {
      showToast('Please enter a goal title.', 'error');
      titleInput.focus();
      return;
    }

    try {
      const res = await fetch('/api/goals', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ title, track, deadline }),
      });
      const data = await res.json();
      allGoals.push(data.goal);
      syncGoalsToStorage();
      titleInput.value  = '';
      deadlineIn.value  = '';
      renderGoals();
      showToast('Goal added! 🎯', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to add goal.', 'error');
    }
  }

  // ── Render goals list ────────────────────────────────────────────
  function renderGoals() {
    updateStats();

    // Filter + search
    let filtered = allGoals.filter(g => {
      const matchFilter = activeFilter === 'all' || g.status === activeFilter;
      const matchSearch = !searchQuery || g.title.toLowerCase().includes(searchQuery);
      return matchFilter && matchSearch;
    });

    // Clear existing cards (keep the empty placeholder in DOM structure)
    goalsList.querySelectorAll('.goal-card').forEach(c => c.remove());

    if (filtered.length === 0) {
      goalsEmpty.style.display = 'block';
      return;
    }
    goalsEmpty.style.display = 'none';

    filtered.forEach(goal => {
      const card = buildGoalCard(goal);
      goalsList.appendChild(card);
    });
  }

  function buildGoalCard(goal) {
    const clone = template.content.cloneNode(true);
    const card  = clone.querySelector('.goal-card');

    card.setAttribute('data-id', goal.id);
    if (goal.status === 'completed') card.classList.add('completed');

    // Track badge
    const badge = card.querySelector('.goal-track-badge');
    badge.textContent = goal.track;
    badge.style.background = trackColor(goal.track).bg;
    badge.style.color       = trackColor(goal.track).fg;

    // Info
    card.querySelector('.goal-title').textContent = goal.title;
    const dl = card.querySelector('.goal-deadline');
    dl.textContent = goal.deadline ? '📅 Due: ' + formatDate(goal.deadline) : '';

    // Progress
    const pct = goal.progress || 0;
    card.querySelector('.progress-pct').textContent    = pct + '%';
    card.querySelector('.progress-bar-fill').style.width = pct + '%';
    const slider = card.querySelector('.progress-slider');
    slider.value = pct;
    slider.addEventListener('input', debounce(async e => {
      const newPct = parseInt(e.target.value);
      card.querySelector('.progress-pct').textContent    = newPct + '%';
      card.querySelector('.progress-bar-fill').style.width = newPct + '%';
      await patchGoal(goal.id, { progress: newPct });
      const g = allGoals.find(x => x.id === goal.id);
      if (g) {
        g.progress = newPct;
        if (g.progress >= 100) g.status = 'completed';
      }
      syncGoalsToStorage();
      updateStats();
    }, 400));

    // Status chip
    const chip = card.querySelector('.goal-status-chip');
    chip.textContent = goal.status;
    chip.className   = 'goal-status-chip chip-' + goal.status;

    card.querySelector('.goal-created').textContent = 'Added ' + goal.created;

    // Complete button
    card.querySelector('.complete-btn').addEventListener('click', async () => {
      const newStatus = goal.status === 'completed' ? 'active' : 'completed';
      await patchGoal(goal.id, { status: newStatus });
      const g = allGoals.find(x => x.id === goal.id);
      if (g) g.status = newStatus;
      syncGoalsToStorage();
      renderGoals();
      showToast(newStatus === 'completed' ? '🎉 Goal completed!' : 'Goal reactivated.', 'success');
    });

    // Delete button
    card.querySelector('.delete-btn').addEventListener('click', async () => {
      if (!confirm('Delete this goal?')) return;
      await fetch('/api/goals/' + goal.id, { method: 'DELETE' });
      allGoals = allGoals.filter(x => x.id !== goal.id);
      syncGoalsToStorage();
      renderGoals();
      showToast('Goal removed.', 'info');
    });

    return card;
  }

  // ── Stats ────────────────────────────────────────────────────────
  function updateStats() {
    const total  = allGoals.length;
    const done   = allGoals.filter(g => g.status === 'completed').length;
    const active = total - done;
    const avg    = total > 0
      ? Math.round(allGoals.reduce((s, g) => s + (g.progress || 0), 0) / total)
      : 0;
    if (statTotal)  statTotal.textContent  = total;
    if (statActive) statActive.textContent = active;
    if (statDone)   statDone.textContent   = done;
    if (statAvgPct) statAvgPct.textContent = avg + '%';
  }

  // ── Filter buttons ───────────────────────────────────────────────
  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeFilter = btn.getAttribute('data-filter');
      renderGoals();
    });
  });

  // ── Search ────────────────────────────────────────────────────────
  if (goalSearch) {
    goalSearch.addEventListener('input', debounce(e => {
      searchQuery = e.target.value.toLowerCase().trim();
      renderGoals();
    }, 300));
  }

  // ── API helpers ────────────────────────────────────────────────────
  async function patchGoal(id, payload) {
    try {
      await fetch('/api/goals/' + id, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify(payload),
      });
    } catch (err) {
      console.error('Failed to update goal:', err);
    }
  }

  // ── Track colour map ─────────────────────────────────────────────
  function trackColor(track) {
    if (track.includes('Python'))  return { bg: '#f3e8ff', fg: '#7c3aed' };
    if (track.includes('Java'))    return { bg: '#eef2ff', fg: '#4338ca' };
    if (track.includes('C ') || track === 'C Programming') return { bg: '#ccfbf1', fg: '#0d9488' };
    return { bg: '#f3f4f6', fg: '#374151' };
  }

  // ── Format date ───────────────────────────────────────────────────
  function formatDate(dateStr) {
    if (!dateStr) return '';
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
});
