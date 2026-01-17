document.addEventListener('DOMContentLoaded', async () => {
  // Fetch available models
  try {
    const response = await fetch('/models');
    const data = await response.json();
    const models = data.models;

    const model1Select = document.getElementById('model1');
    const model2Select = document.getElementById('model2');

    models.forEach(model => {
      const option1 = new Option(model.name, JSON.stringify(model));
      const option2 = new Option(model.name, JSON.stringify(model));
      model1Select.appendChild(option1);
      model2Select.appendChild(option2);
    });
  } catch (error) {
    console.error('Error loading models:', error);
    showError('Failed to load AI models. Please refresh the page.');
  }
});

document.getElementById('promptForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = document.getElementById('prompt').value.trim();
  const model1 = JSON.parse(document.getElementById('model1').value);
  const model2 = JSON.parse(document.getElementById('model2').value);
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
      body: JSON.stringify({ prompt })
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

function showError(message) {
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = `<div class="error-message">${message}</div>`;
}

function displayResults(data) {
  const resultsDiv = document.getElementById('results');

  resultsDiv.innerHTML = `
    <div class="results-grid">
      <div class="result-card">
        <h2>${data.model1.name}</h2>
        <div class="response-text">${escapeHtml(data.model1.output)}</div>
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
        <h2>${data.model2.name}</h2>
        <div class="response-text">${escapeHtml(data.model2.output)}</div>
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