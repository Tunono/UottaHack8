document.addEventListener('DOMContentLoaded', async () => {
  const modelSelect = document.getElementById('chatModelSelect');
  const chatWindow = document.getElementById('chatWindow');
  const chatForm = document.getElementById('chatForm');
  const chatInput = document.getElementById('chatInput');
  const clearBtn = document.getElementById('clearChat');

  // Load models
  try {
    const res = await fetch('/models');
    const data = await res.json();
    const models = data.models || [];
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = JSON.stringify(m);
      opt.textContent = `${m.name} (${m.provider})`;
      modelSelect.appendChild(opt);
    });
  } catch (err) {
    console.error('Failed to load models:', err);
    const opt = document.createElement('option');
    opt.textContent = 'No models available';
    modelSelect.appendChild(opt);
  }

  clearBtn.addEventListener('click', () => {
    chatWindow.innerHTML = '';
  });

  chatForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const text = chatInput.value.trim();
    if (!text) return;

    // Display user message
    appendMessage('You', text, 'user');
    chatInput.value = '';

    // Get selected model
    let modelObj;
    try {
      modelObj = JSON.parse(modelSelect.value);
    } catch (err) {
      console.error('Invalid model selected');
      appendMessage('System', 'Invalid model selection', 'system');
      return;
    }

    // Show typing indicator
    appendMessage('Model', '...', 'loading');

    try {
      const resp = await fetch('/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt: text, model: modelObj })
      });
      const data = await resp.json();

      // Remove loading indicator
      const loadingEl = chatWindow.querySelector('.message.loading');
      if (loadingEl) loadingEl.remove();

      if (data.error) {
        appendMessage('Model', `Error: ${data.error}`, 'error');
      } else {
        appendMessage(data.modelName || 'Model', data.output || '[no response]', 'model');
      }

      chatWindow.scrollTop = chatWindow.scrollHeight;
    } catch (err) {
      console.error('Chat error', err);
      appendMessage('Model', `Network error: ${err.message}`, 'error');
    }
  });

  function appendMessage(who, text, cls) {
    const div = document.createElement('div');
    div.className = `message ${cls}`;
    div.innerHTML = `<div class="message-who">${who}</div><div class="message-text">${escapeHtml(text)}</div>`;
    chatWindow.appendChild(div);
  }

  function escapeHtml(str) {
    const d = document.createElement('div');
    d.textContent = str;
    return d.innerHTML;
  }

  // --- Selected models persistence & rendering (sync with Compare page) ---
  function loadSelectedModelsFromStorage() {
    try {
      const raw = localStorage.getItem('selectedModels');
      const container = document.getElementById('topModelRow');
      if (!container) return;
      container.innerHTML = '';
      if (!raw) return;
      const arr = JSON.parse(raw);
      if (!Array.isArray(arr) || arr.length === 0) return;

      arr.forEach(item => {
        const pill = document.createElement('div');
        pill.className = 'top-model-pill';
        const name = item.name || item.id;
        const provider = item.provider || '';
        pill.innerHTML = `
          <div class="pill-name">${name}</div>
          <div class="pill-provider">${provider}</div>
          <button class="pill-remove" data-id="${item.id}">&times;</button>
        `;
        // remove handler (updates storage and notifies other tabs)
        pill.querySelector('.pill-remove').addEventListener('click', (e) => {
          e.stopPropagation();
          removeModelFromSelection(item.id);
        });
        container.appendChild(pill);
      });
    } catch (e) {
      console.warn('failed to load selected models from storage', e);
    }
  }

  function removeModelFromSelection(id) {
    try {
      const raw = localStorage.getItem('selectedModels');
      if (!raw) return;
      const arr = JSON.parse(raw).filter(x => x.id !== id);
      localStorage.setItem('selectedModels', JSON.stringify(arr));
      // update UI immediately
      loadSelectedModelsFromStorage();
    } catch (e) {
      console.warn('failed to remove model from selection', e);
    }
  }

  // Listen for storage changes from other tabs
  window.addEventListener('storage', (e) => {
    if (e.key === 'selectedModels') {
      loadSelectedModelsFromStorage();
    }
  });

  // initial load of top model row
  loadSelectedModelsFromStorage();
});
