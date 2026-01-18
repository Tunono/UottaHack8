let allModels = [];
let selectedModels = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Fetch available models
  try {
    const response = await fetch('/models');
    const data = await response.json();
    allModels = data.models;

    renderModelCards();
    setupSearchFilter();
    setupFormSubmission();
    // load persisted selection from other tabs / previous session
    loadSelectedModelsFromStorage();
  } catch (error) {
    console.error('Error loading models:', error);
    showError('Failed to load AI models. Please refresh the page.');
  }
});

// Persist selected models to localStorage
function saveSelectedModelsToStorage() {
  try {
    const simple = selectedModels.map(s => ({ id: s.model.id, name: s.model.name, provider: s.model.provider }));
    localStorage.setItem('selectedModels', JSON.stringify(simple));
    // notify other tabs (storage event fires automatically)
  } catch (e) {
    console.warn('Failed to save selected models', e);
  }
}

function loadSelectedModelsFromStorage() {
  try {
    const raw = localStorage.getItem('selectedModels');
    if (!raw) return;
    const arr = JSON.parse(raw);
    if (!Array.isArray(arr)) return;
    // map to current allModels entries where possible
    selectedModels = [];
    arr.forEach(item => {
      const found = allModels.find(m => m.id === item.id);
      if (found) {
        const idx = allModels.findIndex(m => m.id === found.id);
        selectedModels.push({ model: found, index: idx });
      }
    });
    // re-render cards to reflect selected state
    renderModelCards();
    updateSelectedDisplay();
  } catch (e) {
    console.warn('Failed to load selected models from storage', e);
  }
}

// Sync selection across tabs
window.addEventListener('storage', (e) => {
  if (e.key === 'selectedModels') {
    loadSelectedModelsFromStorage();
  }
});

function setupSearchFilter() {
  const searchInput = document.getElementById('modelSearchInput');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      const searchTerm = e.target.value.toLowerCase();
      filterAndRenderModels(searchTerm);
    });
  }
}

function filterAndRenderModels(searchTerm) {
  let filteredModels = allModels;

  if (searchTerm) {
    filteredModels = allModels.filter(model => 
      model.name.toLowerCase().includes(searchTerm) ||
      model.id.toLowerCase().includes(searchTerm) ||
      model.provider.toLowerCase().includes(searchTerm)
    );
  }

  renderFilteredModelCards(filteredModels);
}

function renderModelCards() {
  renderFilteredModelCards(allModels);
}

function renderFilteredModelCards(modelsToRender) {
  const modelsGrid = document.getElementById('modelsGrid');
  modelsGrid.innerHTML = '';

  modelsToRender.forEach((model, filteredIndex) => {
    const actualIndex = allModels.findIndex(m => m.id === model.id);
    
    const modelCard = document.createElement('div');
    modelCard.className = 'model-card';
    
    // Check if this model is already selected
    const isSelected = selectedModels.some(m => m.model.id === model.id);
    if (isSelected) {
      modelCard.classList.add('selected');
    }

    modelCard.innerHTML = `
      <div class="model-info">
        <h4>${model.name}</h4>
        <p class="model-provider">${model.provider}</p>
        <p class="model-id">${model.id}</p>
      </div>
      <button type="button" class="model-select-btn" data-index="${actualIndex}">Select</button>
    `;

    const selectBtn = modelCard.querySelector('.model-select-btn');
    selectBtn.addEventListener('click', () => toggleModelSelection(model, actualIndex, modelCard));

    modelsGrid.appendChild(modelCard);
  });
}

function toggleModelSelection(model, index, cardElement) {
  const isAlreadySelected = selectedModels.findIndex(m => m.model.id === model.id);

  if (isAlreadySelected !== -1) {
    // Deselect
    selectedModels.splice(isAlreadySelected, 1);
    cardElement.classList.remove('selected');
  } else {
    // Select up to 4 models
    if (selectedModels.length >= 4) {
      showError('You can select up to 4 models.');
      return;
    }
    selectedModels.push({ model, index });
    cardElement.classList.add('selected');
  }

  updateSelectedDisplay();
  saveSelectedModelsToStorage();
}

function updateSelectedDisplay() {
  const container = document.getElementById('topModelRow');
  const compareButton = document.getElementById('compareButton');
  const promptButton = document.getElementById('promptCompareButton');
  if (!container) return;

  container.innerHTML = '';

  // Render up to 4 small model pills
  selectedModels.forEach((entry, idx) => {
    const meta = getModelMetadata(entry.model);
    const card = document.createElement('div');
    card.className = 'top-model-pill';
    card.innerHTML = `
      <div class="pill-name">${entry.model.name}</div>
      <div class="pill-provider">${entry.model.provider}</div>
      <div class="pill-meta">${meta.price} • ${meta.context}</div>
      <button class="pill-remove" data-id="${entry.model.id}">&times;</button>
    `;
    // remove handler
    card.querySelector('.pill-remove').addEventListener('click', (e) => {
      e.stopPropagation();
      // find matching card element in grid and remove selected class
      const idxInSelected = selectedModels.findIndex(m => m.model.id === entry.model.id);
      if (idxInSelected !== -1) {
        selectedModels.splice(idxInSelected, 1);
        // remove selected state from model card
        const modelCards = document.querySelectorAll('.model-card');
        modelCards.forEach(mc => {
          if (mc.querySelector('.model-id') && mc.querySelector('.model-id').textContent === entry.model.id) {
            mc.classList.remove('selected');
          }
        });
        updateSelectedDisplay();
      }
    });

    container.appendChild(card);
  });

  // Show placeholders if less than 4 slots
  for (let i = selectedModels.length; i < 4; i++) {
    const ph = document.createElement('div');
    ph.className = 'top-model-pill placeholder';
    ph.innerHTML = `<div class="pill-name">+</div><div class="pill-provider">Add</div>`;
    container.appendChild(ph);
  }

  // Enable compare when at least 1 selected (metadata-only mode)
  compareButton.disabled = selectedModels.length < 1;
  if (promptButton) promptButton.disabled = selectedModels.length < 2;
  // persist whenever display updated
  saveSelectedModelsToStorage();
}

// Render metadata overview for selected models (no response compare)
function renderMetadataOverview(models) {
  const resultsDiv = document.getElementById('results');
  if (!resultsDiv) return;
  if (!models || models.length === 0) {
    resultsDiv.innerHTML = `<div class="error-message">No models selected.</div>`;
    return;
  }

  let cards = models.map((entry) => {
    const info = getModelMetadata(entry.model);
    return `
      <div class="result-card">
        <div class="card-header"><h2>${entry.model.name}</h2></div>
        <div class="metrics">
          <h4>Model Info</h4>
          <ul class="metrics-list">
            <li><span class="metric-label">Price:</span> <span class="metric-value">${info.price}</span></li>
            <li><span class="metric-label">Context:</span> <span class="metric-value">${info.context}</span></li>
            <li><span class="metric-label">Recommended:</span> <span class="metric-value">${info.recommended}</span></li>
            <li><span class="metric-label">Notes:</span> <span class="metric-value">${info.notes || '—'}</span></li>
          </ul>
        </div>
      </div>
    `;
  }).join('');

  resultsDiv.innerHTML = `
    <div class="results-grid">
      ${cards}
    </div>
  `;
}

function setupFormSubmission() {
  const compareButton = document.getElementById('compareButton');
  compareButton.addEventListener('click', () => {
    // Show metadata for all selected models (no response compare)
    if (selectedModels.length < 1) {
      showError('Please select at least one model to view metadata.');
      return;
    }
    renderMetadataOverview(selectedModels);
  });
  // Prompt Compare (open modal to collect prompt and compare first two selected models)
  const promptButton = document.getElementById('promptCompareButton');
  if (promptButton) {
    promptButton.addEventListener('click', () => {
      openPromptModal();
    });
  }
}

// Prompt modal handlers
function openPromptModal() {
  const modal = document.getElementById('promptModal');
  const input = document.getElementById('promptInput');
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'false');
  modal.style.display = 'flex';
  if (input) input.value = '';

  // attach modal button handlers
  const closeBtn = document.getElementById('promptClose');
  const cancelBtn = document.getElementById('promptCancel');
  const submitBtn = document.getElementById('promptSubmit');
  if (closeBtn) closeBtn.onclick = closePromptModal;
  if (cancelBtn) cancelBtn.onclick = closePromptModal;
  if (submitBtn) submitBtn.onclick = submitPromptCompare;
}

function closePromptModal() {
  const modal = document.getElementById('promptModal');
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  modal.style.display = 'none';
}

async function submitPromptCompare() {
  const input = document.getElementById('promptInput');
  const submitBtn = document.getElementById('promptSubmit');
  if (!input) return;
  const prompt = input.value.trim();
  if (!prompt) {
    showError('Please enter a prompt to compare.');
    return;
  }
  if (selectedModels.length < 2) {
    showError('Please select two models for prompt comparison.');
    closePromptModal();
    return;
  }

  // Use first two selected models
  const m1 = selectedModels[0].model;
  const m2 = selectedModels[1].model;

  const payload = { prompt, model1: { id: m1.id, name: m1.name, provider: m1.provider }, model2: { id: m2.id, name: m2.name, provider: m2.provider } };
  if (submitBtn) submitBtn.disabled = true;
  try {
    const res = await fetch('/compare', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    closePromptModal();
    displayResults(data);
  } catch (err) {
    console.error('Prompt compare failed', err);
    showError('Prompt compare failed. See console for details.');
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

function showError(message) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

function displayResults(data) {
  const resultsDiv = document.getElementById('results');
  // If this is metadata-only response (no prompt), render pricing/context comparison
  if (data.metadataOnly) {
    resultsDiv.innerHTML = `
      <div class="results-grid">
        <div class="result-card">
          <div class="card-header"><h2>${data.model1.name}</h2></div>
          <div class="metrics">
            <h4>Model Info</h4>
            <ul class="metrics-list">
              <li><span class="metric-label">Price:</span> <span class="metric-value">${data.model1.info.price}</span></li>
              <li><span class="metric-label">Context Window:</span> <span class="metric-value">${data.model1.info.context}</span></li>
              <li><span class="metric-label">Recommended:</span> <span class="metric-value">${data.model1.info.recommended}</span></li>
              <li><span class="metric-label">Notes:</span> <span class="metric-value">${data.model1.info.notes || '—'}</span></li>
            </ul>
          </div>
        </div>
        <div class="result-card">
          <div class="card-header"><h2>${data.model2.name}</h2></div>
          <div class="metrics">
            <h4>Model Info</h4>
            <ul class="metrics-list">
              <li><span class="metric-label">Price:</span> <span class="metric-value">${data.model2.info.price}</span></li>
              <li><span class="metric-label">Context Window:</span> <span class="metric-value">${data.model2.info.context}</span></li>
              <li><span class="metric-label">Recommended:</span> <span class="metric-value">${data.model2.info.recommended}</span></li>
              <li><span class="metric-label">Notes:</span> <span class="metric-value">${data.model2.info.notes || '—'}</span></li>
            </ul>
          </div>
        </div>
        <div class="comparison-card">
          <h2>Pricing Comparison</h2>
          <div class="metric-comparison">
            <p>Displayed prices are high-level estimates or vendor labels. Use the vendor docs for exact billing calculations.</p>
          </div>
        </div>
      </div>
    `;
    return;
  }

  // If we have metrics for both models, render the full comparison including a bar chart
  if (data.model1 && data.model1.metrics && data.model2 && data.model2.metrics) {
    const m1 = data.model1.metrics;
    const m2 = data.model2.metrics;

    resultsDiv.innerHTML = `
      <div class="results-grid">
        <div class="result-card">
          <div class="card-header"><h2>${data.model1.name}</h2></div>
          <div class="response-text">${formatResponse(data.model1.output)}</div>
          <div class="metrics">${renderMetricsListHtml(data.model1)}</div>
        </div>

        <div class="result-card">
          <div class="card-header"><h2>${data.model2.name}</h2></div>
          <div class="response-text">${formatResponse(data.model2.output)}</div>
          <div class="metrics">${renderMetricsListHtml(data.model2)}</div>
        </div>

        <div class="comparison-card">
          <h2>Metric Comparison</h2>
          <canvas id="metricsChart" width="400" height="300"></canvas>
        </div>
      </div>
    `;

    // render chart
    setTimeout(() => renderMetricsChart(data.model1, data.model2), 50);
  } else {
    // fallback: just render whatever is present
    resultsDiv.innerHTML = `<div class="error-message">No comparable metrics available.</div>`;
  }

  // Render MathJax for math notation in both responses
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    MathJax.typesetPromise([resultsDiv]).catch((err) => console.log('MathJax error:', err));
  }
}

function renderMetricsListHtml(modelData) {
  const metrics = modelData.metrics || {};
  return `
    <h4>Performance Metrics</h4>
    <ul class="metrics-list">
      <li><span class="metric-label">Response Time:</span> <span class="metric-value">${modelData.time}ms</span></li>
      <li><span class="metric-label">Tokens Used:</span> <span class="metric-value">${modelData.tokens || 'N/A'}</span></li>
      <li><span class="metric-label">Characters:</span> <span class="metric-value">${metrics.charCount || 0}</span></li>
      <li><span class="metric-label">Words:</span> <span class="metric-value">${metrics.wordCount || 0}</span></li>
      <li><span class="metric-label">Sentences:</span> <span class="metric-value">${metrics.sentenceCount || 0}</span></li>
      <li><span class="metric-label">Lexical Diversity:</span> <span class="metric-value">${metrics.lexicalDiversity ? metrics.lexicalDiversity.toFixed(1) + '%' : 'N/A'}</span></li>
      <li><span class="metric-label">Avg Word Length:</span> <span class="metric-value">${metrics.avgWordLength || 0}</span></li>
    </ul>
  `;
}

function renderMetricsChart(model1, model2) {
  const labels = ['Response Time (ms)', 'Tokens', 'Characters', 'Words', 'Sentences', 'Lexical Diversity (%)', 'Avg Word Length'];
  const m1 = model1.metrics || {};
  const m2 = model2.metrics || {};

  const data1 = [model1.time || 0, model1.tokens || 0, m1.charCount || 0, m1.wordCount || 0, m1.sentenceCount || 0, m1.lexicalDiversity ? Number(m1.lexicalDiversity.toFixed(1)) : 0, m1.avgWordLength || 0];
  const data2 = [model2.time || 0, model2.tokens || 0, m2.charCount || 0, m2.wordCount || 0, m2.sentenceCount || 0, m2.lexicalDiversity ? Number(m2.lexicalDiversity.toFixed(1)) : 0, m2.avgWordLength || 0];

  const ctx = document.getElementById('metricsChart').getContext('2d');
  // destroy previous chart if exists
  if (window._metricsChart) {
    try { window._metricsChart.destroy(); } catch (e) {}
  }

  window._metricsChart = new Chart(ctx, {
    type: 'bar',
    data: {
      labels,
      datasets: [
        { label: model1.name || 'Model 1', data: data1, backgroundColor: 'rgba(102,126,234,0.7)' },
        { label: model2.name || 'Model 2', data: data2, backgroundColor: 'rgba(118,75,162,0.7)' }
      ]
    },
    options: {
      responsive: true,
      scales: { y: { beginAtZero: true } }
    }
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatResponse(text) {
  // Store placeholders for code blocks to prevent interference
  const codeBlocks = [];
  let placeholder = text;
  
  // Extract code blocks FIRST (before escaping)
  placeholder = placeholder.replace(/```([\s\S]*?)```/g, (match, code) => {
    const lines = code.trim().split('\n');
    const firstLine = lines[0];
    let language = 'plaintext';
    let codeContent = code.trim();
    
    // Check if it's LaTeX/math code - render as math instead
    if (firstLine.match(/^(latex|tex|math)$/i)) {
      language = firstLine.toLowerCase();
      codeContent = lines.slice(1).join('\n').trim();
      // Render LaTeX as display math
      const mathBlock = `<div class="math-display">$$${codeContent}$$</div>`;
      codeBlocks.push(mathBlock);
      return `___CODE_BLOCK_${codeBlocks.length - 1}___`;
    }
    
    // Common language indicators
    if (firstLine.match(/^(javascript|js|typescript|ts|python|java|c|cpp|c\+\+|csharp|c#|php|ruby|go|rust|sql|html|css|xml|json|bash|shell)$/i)) {
      language = firstLine.toLowerCase();
      codeContent = lines.slice(1).join('\n').trim();
    }
    
    const codeBlock = `<div class="code-block"><div class="code-header"><span class="code-language">${language}</span><button class="code-copy" onclick="copyCode(this)">Copy</button></div><pre><code class="language-${language}">${escapeHtml(codeContent)}</code></pre></div>`;
    codeBlocks.push(codeBlock);
    return `___CODE_BLOCK_${codeBlocks.length - 1}___`;
  });
  
  // NOW escape the remaining HTML (that doesn't have code blocks)
  let escaped = escapeHtml(placeholder);
  
  // Restore code blocks
  escaped = escaped.replace(/___CODE_BLOCK_(\d+)___/g, (match, index) => {
    return codeBlocks[parseInt(index)];
  });
  
  // Format inline code (`code`) - but NOT inside math
  escaped = escaped.replace(/`([^`$\n]+)`/g, '<code class="inline-code">$1</code>');
  
  // Format math expressions with $$...$$ (display mode)
  escaped = escaped.replace(/\$\$([\s\S]*?)\$\$/g, (match, formula) => {
    return `<div class="math-display">$$${formula}$$</div>`;
  });
  
  // Format math expressions with $...$ (inline mode) - avoid $$ and newlines
  escaped = escaped.replace(/\$([^\$\n]+)\$/g, (match, formula) => {
    // Avoid double-matching already replaced content
    if (formula.includes('$$')) return match;
    return `<span class="math-inline">$${formula}$</span>`;
  });
  
  // Preserve line breaks
  escaped = escaped.replace(/\n/g, '<br>');
  
  return escaped;
}

function copyCode(button) {
  const codeBlock = button.closest('.code-block');
  const code = codeBlock.querySelector('code');
  const text = code.textContent;
  
  navigator.clipboard.writeText(text).then(() => {
    const originalText = button.textContent;
    button.textContent = 'Copied!';
    setTimeout(() => {
      button.textContent = originalText;
    }, 2000);
  }).catch(err => {
    console.error('Failed to copy:', err);
  });
}

function toggleFullscreen(button) {
  const card = button.closest('.result-card');
  const isFullscreen = card.classList.contains('fullscreen-active');
  
  if (isFullscreen) {
    // Exit fullscreen
    card.classList.remove('fullscreen-active');
    document.body.style.overflow = '';
    button.innerHTML = '<i class="fas fa-expand"></i>';
    button.title = 'Fullscreen';
  } else {
    // Enter fullscreen
    card.classList.add('fullscreen-active');
    document.body.style.overflow = 'hidden';
    button.innerHTML = '<i class="fas fa-compress"></i>';
    button.title = 'Exit Fullscreen';
  }
}

// Basic client-side model metadata lookup for developer info and pricing
function getModelMetadata(model) {
  // default fallback
  const fallback = { price: 'Varies', context: 'Unknown', recommended: 'General use' };

  if (!model || !model.id) return fallback;

  const id = model.id.toLowerCase();
  // simple heuristics for common models
  if (id.includes('gpt-4')) return { price: '$0.03 / 1k tokens (input), $0.06 / 1k tokens (output)', context: '8k-32k', recommended: 'Complex reasoning, summarization' };
  if (id.includes('gpt-3.5') || id.includes('turbo')) return { price: '$0.002 / 1k tokens', context: '4k-16k', recommended: 'Cheap chat, prototyping' };
  if (id.includes('gemini')) return { price: 'See Google Gemini pricing', context: 'Large', recommended: 'Multimodal, high-quality responses' };
  return fallback;
}