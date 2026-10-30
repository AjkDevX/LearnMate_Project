/* ================================================================
   LearnMate — chat.js
   AI Coach chat interface: send/receive, markdown rendering,
   typing indicator, sidebar, quick prompts
   ================================================================ */

document.addEventListener('DOMContentLoaded', () => {

  // ── DOM refs ────────────────────────────────────────────────────
  const chatMessages    = document.getElementById('chatMessages');
  const chatInput       = document.getElementById('chatInput');
  const sendBtn         = document.getElementById('sendBtn');
  const typingIndicator = document.getElementById('typingIndicator');
  const loadingSpinner  = document.getElementById('loadingSpinner');
  const chatForm        = document.getElementById('chatForm');
  const statusDot       = document.getElementById('statusDot');
  const clearChatBtn    = document.getElementById('clearChatBtn');
  const quickPrompts    = document.getElementById('quickPrompts');
  const sidebarToggle   = document.getElementById('sidebarToggle');
  const chatSidebar     = document.getElementById('chatSidebar');

  // ── Markdown renderer (via marked.js + highlight.js) ────────────
  if (typeof marked !== 'undefined') {
    marked.setOptions({
      highlight: (code, lang) => {
        if (typeof hljs !== 'undefined' && lang && hljs.getLanguage(lang)) {
          return hljs.highlight(code, { language: lang }).value;
        }
        return typeof hljs !== 'undefined' ? hljs.highlightAuto(code).value : code;
      },
      breaks: true,
      gfm: true,
    });
  }

  function renderMarkdown(text) {
    if (typeof marked !== 'undefined') {
      return marked.parse(text);
    }
    // Fallback: escape HTML and preserve newlines
    return text
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/\n/g, '<br>');
  }

  // ── Status dot ──────────────────────────────────────────────────
  function setStatus(online) {
    if (!statusDot) return;
    statusDot.className = 'status-dot ' + (online ? 'online' : 'offline');
    statusDot.title = online ? 'AI Online' : 'AI Offline';
  }
  setStatus(true); // optimistically set online

  // ── Auto-resize textarea ─────────────────────────────────────────
  chatInput.addEventListener('input', () => {
    chatInput.style.height = 'auto';
    chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
  });

  // ── Send on Enter (Shift+Enter = new line) ───────────────────────
  chatInput.addEventListener('keydown', e => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  });
  sendBtn.addEventListener('click', sendMessage);

  if (chatForm) {
    chatForm.addEventListener('submit', e => {
      e.preventDefault();
      sendMessage();
    });
  }

  // ── Quick prompt buttons ──────────────────────────────────────────
  if (quickPrompts) {
    quickPrompts.querySelectorAll('.qp-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const prompt = btn.getAttribute('data-prompt');
        if (prompt) {
          chatInput.value = prompt;
          chatInput.dispatchEvent(new Event('input'));
          chatInput.focus();
          sendMessage();
        }
      });
    });
  }

  // ── Mobile sidebar toggle ─────────────────────────────────────────
  if (sidebarToggle && chatSidebar) {
    sidebarToggle.addEventListener('click', () => {
      chatSidebar.classList.toggle('open');
    });
    // Close sidebar when clicking outside
    document.addEventListener('click', e => {
      if (chatSidebar.classList.contains('open') &&
          !chatSidebar.contains(e.target) &&
          e.target !== sidebarToggle) {
        chatSidebar.classList.remove('open');
      }
    });
  }

  // ── Clear chat ────────────────────────────────────────────────────
  if (clearChatBtn) {
    clearChatBtn.addEventListener('click', async () => {
      if (!confirm('Clear the entire conversation?')) return;
      await fetch('/api/clear-chat', { method: 'POST' });
      // Remove all messages except the welcome one (first child)
      const msgs = chatMessages.querySelectorAll('.msg');
      msgs.forEach((m, i) => { if (i > 0) m.remove(); });
      showToast('Chat cleared.', 'success');
    });
  }

  // ── Core send function ────────────────────────────────────────────
  async function sendMessage() {
    const text = chatInput.value.trim();
    if (!text || sendBtn.disabled) return;

    // Append user bubble (displays the user's exact typed query)
    appendMessage('user', text);
    chatInput.value = '';
    chatInput.style.height = 'auto';

    // Disable input while waiting
    setInputDisabled(true);
    showTyping(true);

    // Show loading spinner div when the form is submitted
    if (loadingSpinner) {
      loadingSpinner.style.display = 'flex';
    }

    // Context Injection: silently fetch goals from localStorage (or fallback)
    // and prepend them as a hidden system context string
    let goalsStr = '';
    const storedGoalsRaw = localStorage.getItem('goals');
    if (storedGoalsRaw) {
      try {
        const parsed = JSON.parse(storedGoalsRaw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          goalsStr = parsed.map(g => `${g.title} (Progress: ${g.progress || 0}%, Status: ${g.status || 'active'})`).join('; ');
        } else if (typeof parsed === 'string') {
          goalsStr = parsed;
        }
      } catch (e) {
        goalsStr = storedGoalsRaw;
      }
    }
    if (!goalsStr) {
      goalsStr = 'Master Computer Science concepts, Python Data Science, Java, and C Programming';
    }
    const hiddenContext = `[System Context: Student Learning Goals: ${goalsStr}]\n\n`;
    const promptWithContext = `${hiddenContext}${text}`;

    try {
      const res = await fetch('/api/chat', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ message: promptWithContext }),
      });

      if (!res.ok) throw new Error('Server error ' + res.status);
      const data = await res.json();

      let aiResponseText = data.response || data.reply || '';

      // ── Intercept and Update Progress loop via Regex ───────────────
      const progressRegex = /\[UPDATE_PROGRESS:\s*(\d+)\]/i;
      const progressMatch = aiResponseText.match(progressRegex);

      if (progressMatch) {
        // 1. Extract the number (e.g., 1)
        const progressIncrement = parseInt(progressMatch[1], 10) || 1;

        // 2. Remove the tag entirely from the data.response string so the user never sees it
        aiResponseText = aiResponseText.replace(progressRegex, '').trim();
        aiResponseText = aiResponseText.replace(/<p>\s*<\/p>/g, '').trim();
        data.response  = aiResponseText;
        data.reply     = aiResponseText;

        // 3. Fetch the current goals from localStorage
        let goalsList = [];
        try {
          const raw = localStorage.getItem('goals');
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed)) goalsList = parsed;
          }
        } catch (e) {
          goalsList = [];
        }

        // Initialize default goal if none exists
        if (goalsList.length === 0) {
          goalsList = [{
            id: 1,
            title: "Master Computer Science & Coding Concepts",
            track: "Python Data Science",
            deadline: "",
            progress: 0,
            status: "active",
            created: "Now"
          }];
        }

        // 4. Add the extracted number to the progress value of the currently active goal
        let activeGoal = goalsList.find(g => g.status === 'active') || goalsList[0];
        if (activeGoal) {
          const currentPct = parseInt(activeGoal.progress, 10) || 0;
          activeGoal.progress = Math.min(100, currentPct + progressIncrement);
          if (activeGoal.progress >= 100) {
            activeGoal.status = 'completed';
          }

          // Persist progress to server backend if goal ID exists
          if (activeGoal.id) {
            fetch('/api/goals/' + activeGoal.id, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ progress: activeGoal.progress, status: activeGoal.status })
            }).catch(() => {});
          }

          if (typeof showToast === 'function') {
            showToast(`🎯 Assessment Passed! Auto-Progress: +${progressIncrement}% (${activeGoal.title}: ${activeGoal.progress}%)`, 'success');
          }
        }

        // 5. Save the updated goals back to localStorage
        localStorage.setItem('goals', JSON.stringify(goalsList));
      }

      // Ensure AI response is injected using .innerHTML (not innerText)
      appendMessage('ai', data.response || data.reply, data.ts);
      setStatus(true);
    } catch (err) {
      console.error(err);
      appendMessage('ai', '<p>⚠️ Failed to connect to LearnMate AI. Please check your server and credentials.</p>');
      setStatus(false);
    } finally {
      // Hide loading spinner div when the response arrives
      if (loadingSpinner) {
        loadingSpinner.style.display = 'none';
      }
      setInputDisabled(false);
      showTyping(false);
    }
  }

  function appendMessage(role, content, ts = '') {
    const div = document.createElement('div');
    div.className = 'msg ' + (role === 'user' ? 'msg-user' : 'msg-ai');

    const time = ts || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });

    if (role === 'user') {
      div.innerHTML = `
        <div class="msg-body msg-body-user">
          <div class="msg-content">${escapeHtml(content)}</div>
          <span class="msg-time">${time}</span>
        </div>
        <div class="msg-avatar msg-avatar-user">👤</div>
      `;
      chatMessages.appendChild(div);
      scrollToBottom();
    } else {
      div.innerHTML = `
        <div class="msg-avatar">🎓</div>
        <div class="msg-body">
          <div class="msg-content markdown-body"></div>
          <span class="msg-time">${time}</span>
        </div>
      `;
      // Ensure the AI response is injected using .innerHTML (not innerText)
      const contentEl = div.querySelector('.msg-content');
      contentEl.innerHTML = content;

      chatMessages.appendChild(div);
      scrollToBottom();

      // Call hljs.highlightAll(); immediately after injecting the AI response to trigger syntax highlighting
      if (typeof hljs !== 'undefined') {
        hljs.highlightAll();
      }
    }
  }

  function setInputDisabled(disabled) {
    chatInput.disabled = disabled;
    sendBtn.disabled   = disabled;
  }

  function showTyping(show) {
    if (typingIndicator) typingIndicator.classList.toggle('visible', show);
  }

  function scrollToBottom() {
    chatMessages.scrollTo({ top: chatMessages.scrollHeight, behavior: 'smooth' });
  }

  // Safe HTML escape for user messages
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  // Initial syntax highlighting for server-rendered history
  if (typeof hljs !== 'undefined') {
    hljs.highlightAll();
  }

  // Focus input on load
  chatInput.focus();
  scrollToBottom();
});
