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
  }
});

document.getElementById('promptForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = document.getElementById('prompt').value;
  const model1 = JSON.parse(document.getElementById('model1').value);
  const model2 = JSON.parse(document.getElementById('model2').value);
  const resultsDiv = document.getElementById('results');
  resultsDiv.innerHTML = `
    <div class="text-center">
      <div class="spinner-border text-primary" role="status">
        <span class="sr-only">Loading...</span>
      </div>
      <p class="mt-2">Comparing LLM responses...</p>
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
      resultsDiv.innerHTML = `<p>Error: ${data.error}</p>`;
      return;
    }

    resultsDiv.innerHTML = `
      <div class="result">
        <h2>${data.model1.name}</h2>
        <p>${data.model1.output}</p>
        <div class="metrics">
          Time: ${data.model1.time}ms<br>
          Tokens: ${data.model1.tokens || 'N/A'}
        </div>
      </div>
      <div class="result">
        <h2>${data.model2.name}</h2>
        <p>${data.model2.output}</p>
        <div class="metrics">
          Time: ${data.model2.time}ms<br>
          Tokens: ${data.model2.tokens || 'N/A'}
        </div>
      </div>
      <div class="result">
        <h2>Similarity</h2>
        <p>${data.model1.name} vs ${data.model2.name}: ${(data.similarity * 100).toFixed(2)}%</p>
      </div>
    `;

    // Render MathJax for math notation in both responses
    if (window.MathJax && typeof window.MathJax.typesetPromise === 'function') {
      MathJax.typesetPromise([resultsDiv]).catch((err) => console.log('MathJax error:', err));
    }
  } catch (error) {
    resultsDiv.innerHTML = `<p>Error: ${error.message}</p>`;
  }
});