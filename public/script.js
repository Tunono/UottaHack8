document.getElementById('promptForm').addEventListener('submit', async (e) => {
  e.preventDefault();
  const prompt = document.getElementById('prompt').value;
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
      body: JSON.stringify({ prompt })
    });
    const data = await response.json();

    if (data.error) {
      resultsDiv.innerHTML = `<p>Error: ${data.error}</p>`;
      return;
    }

    resultsDiv.innerHTML = `
      <div class="result">
        <h2>Chat-GPT</h2>
        <p>${data.gpt.output}</p>
        <div class="metrics">
          Time: ${data.gpt.time}ms<br>
          Tokens: ${data.gpt.tokens || 'N/A'}
        </div>
      </div>
      <div class="result">
        <h2>Gemini</h2>
        <p>${data.gemini.output}</p>
        <div class="metrics">
          Time: ${data.gemini.time}ms<br>
          Tokens: ${data.gemini.tokens || 'N/A'}
        </div>
      </div>
      <div class="result">
        <h2>Similarity</h2>
        <p>GPT vs Gemini: ${(data.similarity * 100).toFixed(2)}%</p>
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