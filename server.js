const express = require('express');
const path = require('path');
const OpenAI = require('openai');
const { GoogleGenAI } = require('@google/genai');
const stringSimilarity = require('string-similarity');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function getAvailableModels() {
  const models = [];
  if (process.env.OPENAI_API_KEY) {
    try {
      const openaiModels = await openai.models.list();
      openaiModels.data.forEach(model => {
        if (model.id.includes('gpt')) {
          models.push({ provider: 'openai', id: model.id, name: model.id });
        }
      });
    } catch (error) {
      console.error('Error fetching OpenAI models:', error);
    }
  }
  if (process.env.GEMINI_API_KEY) {
    // Gemini models - hardcoded common ones
    models.push(
      { provider: 'gemini', id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash' },
      { provider: 'gemini', id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro' },
      { provider: 'gemini', id: 'gemini-2.0-flash-exp', name: 'Gemini 2.0 Flash' },
      { provider: 'gemini', id: 'gemini-2.5-flash', name: 'Gemni 2.5 Flash'}
    );
  }
  return models;
}

async function callLLM(provider, modelId, prompt) {
  const start = Date.now();
  let output, tokens = null;

  if (provider === 'openai') {
    return callGPT(prompt,modelId);
  } else if (provider === 'gemini') {
    return callGemini(prompt,modelId);

  }
}

async function callGPT(prompt,modelId) {
  const start = Date.now();
  const response = await openai.chat.completions.create({
    model: modelId,
    messages: [{ role: 'user', content: prompt }],
  });
  const time = Date.now() - start;
  const output = response.choices[0].message.content;
  const tokens = response.usage.total_tokens;
  return { output, time, tokens };
}

async function callGemini(prompt,modelId) {
  const start = Date.now();
  const response = await genAI.models.generateContent({
    model: modelId,
    contents: prompt,
  });
  const time = Date.now() - start;
  const output = response.text;
  const tokens = null; // Gemini API doesn't provide token count in response
  return { output, time, tokens };
}


app.get('/models', async (req, res) => {
  try {
    const models = await getAvailableModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/compare', async (req, res) => {
  const { prompt, model1, model2 } = req.body;
  try {
    const [result1, result2] = await Promise.all([
      callLLM(model1.provider, model1.id, prompt),
      callLLM(model2.provider, model2.id, prompt)
    ]);

    // Calculate similarity
    const similarity = stringSimilarity.compareTwoStrings(result1.output, result2.output);

    res.json({ 
      model1: { ...result1, name: model1.name }, 
      model2: { ...result2, name: model2.name }, 
      similarity 
    });
} catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));