/* ================================================================
   LearnMate — pathway.js
   Curriculum Pathway Dashboard: generate, display, copy
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  const goalInput     = document.getElementById('pathwayGoal');
  const trackSelect   = document.getElementById('pathwayTrack');
  const levelSelect   = document.getElementById('pathwayLevel');
  const generateBtn   = document.getElementById('generatePathwayBtn');
  const btnText       = document.getElementById('pathwayBtnText');
  const btnSpinner    = document.getElementById('pathwayBtnSpinner');
  const outputPanel   = document.getElementById('pathwayOutput');
  const outputTitle   = document.getElementById('pathwayOutputTitle');
  const outputMeta    = document.getElementById('pathwayMeta');
  const outputContent = document.getElementById('pathwayContent');
  const copyBtn       = document.getElementById('copyPathwayBtn');

  // ── Markdown renderer ────────────────────────────────────────────
  function renderMd(text) {
    if (typeof marked !== 'undefined') {
      return marked.parse(text, { breaks: true, gfm: true });
    }
    return text.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br>');
  }

  // ── Generate pathway ─────────────────────────────────────────────
  generateBtn.addEventListener('click', generatePathway);

  goalInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) generatePathway();
  });

  async function generatePathway() {
    const goal  = goalInput.value.trim();
    const track = trackSelect.value;
    const level = levelSelect.value;

    if (!goal) {
      showToast('Please describe your learning goal first.', 'error');
      goalInput.focus();
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/pathway', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ goal, track, level }),
      });

      if (!res.ok) throw new Error('Server error ' + res.status);
      const data = await res.json();

      // Render output panel
      outputTitle.textContent = `${data.track} Pathway`;
      outputMeta.innerHTML = `
        <span class="pathway-meta-tag">📚 ${data.track}</span>
        <span class="pathway-meta-tag">⚡ ${capitalise(data.level)}</span>
        <span class="pathway-meta-tag">🎯 Custom Goal</span>
      `;
      outputContent.innerHTML = data.pathway;

      // Syntax highlight code blocks if hljs present
      if (typeof hljs !== 'undefined') {
        hljs.highlightAll();
      }

      outputPanel.style.display = 'block';
      outputPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
      showToast('Pathway generated! 🗺️', 'success');
    } catch (err) {
      console.error(err);
      showToast('Failed to generate pathway. Check your server connection.', 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Copy pathway ─────────────────────────────────────────────────
  if (copyBtn) {
    copyBtn.addEventListener('click', () => {
      const text = outputContent.innerText || outputContent.textContent;
      navigator.clipboard.writeText(text).then(() => {
        showToast('Pathway copied to clipboard!', 'success');
      }).catch(() => {
        showToast('Copy failed — please select and copy manually.', 'error');
      });
    });
  }

  // ── Sample template cards ────────────────────────────────────────
  document.querySelectorAll('.sample-load-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const card  = btn.closest('.sample-card');
      const goal  = card.getAttribute('data-goal');
      const track = card.getAttribute('data-track');
      const level = card.getAttribute('data-level');

      if (goalInput)   goalInput.value = goal;
      if (trackSelect) trackSelect.value = track;
      if (levelSelect) levelSelect.value = level;

      goalInput.scrollIntoView({ behavior: 'smooth', block: 'center' });
      showToast('Template loaded — click Generate to continue!', 'info');
    });
  });

  // ── Helpers ───────────────────────────────────────────────────────
  function setLoading(loading) {
    generateBtn.disabled = loading;
    btnText.style.display    = loading ? 'none'  : 'inline';
    btnSpinner.style.display = loading ? 'inline-block' : 'none';
  }

  function capitalise(str) {
    return str ? str.charAt(0).toUpperCase() + str.slice(1) : str;
  }
});
