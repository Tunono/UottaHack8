let allModels = [];
let selectedModels = [];

document.addEventListener('DOMContentLoaded', async () => {
  // Fetch available models
  try {
    const customProvider = localStorage.getItem('customProvider');
    const customApiKey = localStorage.getItem('customApiKey');
    let url = '/models';
    if (customProvider && customApiKey) {
      url += `?customProvider=${encodeURIComponent(customProvider)}&customApiKey=${encodeURIComponent(customApiKey)}`;
    }
    const response = await fetch(url);
    const data = await response.json();
    allModels = data.models;

    renderModelCards();
    setupSearchFilter();
    setupFormSubmission();
  } catch (error) {
    console.error('Error loading models:', error);
    showError('Failed to load AI models. Please refresh the page.');
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
  } else if (selectedModels.length < 2) {
    // Select
    selectedModels.push({ model, index });
    cardElement.classList.add('selected');
  } else {
    // Replace the last one if 2 are already selected
    const oldIndex = selectedModels[1].index;
    const oldCard = document.querySelector(`.model-card:nth-child(${oldIndex + 1})`);
    oldCard.classList.remove('selected');
    
    selectedModels[1] = { model, index };
    cardElement.classList.add('selected');
  }

  updateSelectedDisplay();
}

function updateSelectedDisplay() {
  const selected1 = document.getElementById('selected1');
  const selected2 = document.getElementById('selected2');
  const compareButton = document.getElementById('compareButton');

  if (selectedModels.length >= 1) {
    selected1.innerHTML = `
      <div class="selected-info">
        <strong>${selectedModels[0].model.name}</strong>
        <small>${selectedModels[0].model.provider}</small>
      </div>
    `;
  } else {
    selected1.innerHTML = '<div class="selected-placeholder">Model 1</div>';
  }

  if (selectedModels.length >= 2) {
    selected2.innerHTML = `
      <div class="selected-info">
        <strong>${selectedModels[1].model.name}</strong>
        <small>${selectedModels[1].model.provider}</small>
      </div>
    `;
    compareButton.disabled = false;
  } else {
    selected2.innerHTML = '<div class="selected-placeholder">Model 2</div>';
    compareButton.disabled = true;
  }
}

function setupFormSubmission() {
  document.getElementById('promptForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    if (selectedModels.length < 2) {
      showError('Please select two models to compare.');
      return;
    }

    const prompt = document.getElementById('prompt').value.trim();
    const model1 = selectedModels[0].model;
    const model2 = selectedModels[1].model;
    const resultsDiv = document.getElementById('results');

    if (!prompt) {
      showError('Please enter a prompt to compare.');
      return;
    }

    // Show loading state
    resultsDiv.innerHTML = `
      <div class="loading-container">
        <div class="spinner"></div>
        <div class="loading-text">Analyzing AI responses...</div>
      </div>
    `;

    try {
      const response = await fetch('/compare', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ prompt, model1, model2 })
      });
      const data = await response.json();

      if (data.error) {
        showError(`Error: ${data.error}`);
        return;
      }

      displayResults(data);
    } catch (error) {
      showError(`Network error: ${error.message}`);
    }
  });
}

function showError(message) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

function displayResults(data) {
  const resultsDiv = document.getElementById('results');

  resultsDiv.innerHTML = `
    <div class="results-grid">
      <div class="result-card">
        <div class="card-header">
          <h2>${data.model1.name}</h2>
          <button class="fullscreen-btn" onclick="toggleFullscreen(this)" title="Fullscreen">
            <i class="fas fa-expand"></i>
          </button>
        </div>
        <div class="response-text">${formatResponse(data.model1.output)}</div>
        <div class="metrics">
          <h4>Performance Metrics</h4>
          <ul class="metrics-list">
            <li><span class="metric-label">Response Time:</span> <span class="metric-value">${data.model1.time}ms</span></li>
            <li><span class="metric-label">Tokens Used:</span> <span class="metric-value">${data.model1.tokens || 'N/A'}</span></li>
            <li><span class="metric-label">Characters:</span> <span class="metric-value">${data.model1.metrics.charCount}</span></li>
            <li><span class="metric-label">Words:</span> <span class="metric-value">${data.model1.metrics.wordCount}</span></li>
            <li><span class="metric-label">Sentences:</span> <span class="metric-value">${data.model1.metrics.sentenceCount}</span></li>
            <li><span class="metric-label">Lexical Diversity:</span> <span class="metric-value">${data.model1.metrics.lexicalDiversity.toFixed(1)}%</span></li>
            <li><span class="metric-label">Avg Word Length:</span> <span class="metric-value">${data.model1.metrics.avgWordLength}</span></li>
          </ul>
        </div>
      </div>

      <div class="result-card">
        <div class="card-header">
          <h2>${data.model2.name}</h2>
          <button class="fullscreen-btn" onclick="toggleFullscreen(this)" title="Fullscreen">
            <i class="fas fa-expand"></i>
          </button>
        </div>
        <div class="response-text">${formatResponse(data.model2.output)}</div>
        <div class="metrics">
          <h4>Performance Metrics</h4>
          <ul class="metrics-list">
            <li><span class="metric-label">Response Time:</span> <span class="metric-value">${data.model2.time}ms</span></li>
            <li><span class="metric-label">Tokens Used:</span> <span class="metric-value">${data.model2.tokens || 'N/A'}</span></li>
            <li><span class="metric-label">Characters:</span> <span class="metric-value">${data.model2.metrics.charCount}</span></li>
            <li><span class="metric-label">Words:</span> <span class="metric-value">${data.model2.metrics.wordCount}</span></li>
            <li><span class="metric-label">Sentences:</span> <span class="metric-value">${data.model2.metrics.sentenceCount}</span></li>
            <li><span class="metric-label">Lexical Diversity:</span> <span class="metric-value">${data.model2.metrics.lexicalDiversity.toFixed(1)}%</span></li>
            <li><span class="metric-label">Avg Word Length:</span> <span class="metric-value">${data.model2.metrics.avgWordLength}</span></li>
          </ul>
        </div>
      </div>

      <div class="comparison-card">
        <h2>Comparison Analysis</h2>
        <div class="similarity-score">
          <div class="similarity-label">Response Similarity</div>
          <div class="similarity-value">${(data.similarity * 100).toFixed(2)}%</div>
        </div>
        <div class="metric-comparison">
          <h4>Metric Differences</h4>
          <ul class="metrics-list">
            <li><span class="metric-label">Time Difference:</span> <span class="metric-value">${Math.abs(data.model1.time - data.model2.time)}ms</span></li>
            <li><span class="metric-label">Character Difference:</span> <span class="metric-value">${Math.abs(data.model1.metrics.charCount - data.model2.metrics.charCount)}</span></li>
            <li><span class="metric-label">Word Difference:</span> <span class="metric-value">${Math.abs(data.model1.metrics.wordCount - data.model2.metrics.wordCount)}</span></li>
            <li><span class="metric-label">Sentence Difference:</span> <span class="metric-value">${Math.abs(data.model1.metrics.sentenceCount - data.model2.metrics.sentenceCount)}</span></li>
          </ul>
        </div>
      </div>
    </div>
  `;

  // Render MathJax for math notation in both responses
  if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
    MathJax.typesetPromise([resultsDiv]).catch((err) => console.log('MathJax error:', err));
  }
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