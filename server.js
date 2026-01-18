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

// Custom API keys (in memory)
let customOpenaiApiKey = null;
let customGeminiApiKey = null;

// Function to calculate text metrics
function calculateTextMetrics(text) {
  if (!text) return { charCount: 0, wordCount: 0, sentenceCount: 0, lexicalDiversity: 0, avgWordLength: 0 };

  const charCount = text.length;
  const words = text.toLowerCase().match(/\b\w+\b/g) || [];
  const wordCount = words.length;
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  const sentenceCount = sentences.length;
  const uniqueWords = new Set(words);
  const lexicalDiversity = wordCount > 0 ? (uniqueWords.size / wordCount) : 0;
  const avgWordLength = wordCount > 0 ? words.reduce((sum, word) => sum + word.length, 0) / wordCount : 0;

  return {
    charCount,
    wordCount,
    sentenceCount,
    lexicalDiversity: lexicalDiversity * 100, // as percentage
    avgWordLength: Math.round(avgWordLength * 100) / 100
  };
}

async function getAvailableModels(customProvider, customApiKey) {
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
      // Add default OpenAI models if fetch fails
      models.push(
        { provider: 'openai', id: 'gpt-4', name: 'GPT-4' },
        { provider: 'openai', id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo' }
      );
    }
  }
  if (process.env.GEMINI_API_KEY) {
    // Gemini models - hardcoded common ones
    models.push(
   { provider: 'gemini', id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash'}
    );
  }

  // Add custom models
  if (customProvider === 'openai' && customApiKey) {
    try {
      const customOpenai = new OpenAI({ apiKey: customApiKey });
      const customModels = await customOpenai.models.list();
      customModels.data.forEach(model => {
        if (model.id.includes('gpt')) {
          models.push({ provider: 'openai-custom', id: model.id, name: model.id });
        }
      });
      customOpenaiApiKey = customApiKey;
    } catch (error) {
      console.error('Error fetching custom OpenAI models:', error);
    }
  }
  if (customProvider === 'gemini' && customApiKey) {
    // For Gemini, add a custom model using a valid model id
    models.push({ provider: 'gemini-custom', id: 'gemini-1.5-flash', name: 'Gemini Custom' });
    customGeminiApiKey = customApiKey;
  }

  if (models.length === 0) {
    throw new Error('No API keys configured. Please set OPENAI_API_KEY and/or GEMINI_API_KEY in your .env file.');
  }
  // Filter out models that contain keywords that may signifiy a non-LLM model
  const filteredModels = models.filter(model => 
    !model.id.toLowerCase().includes('audio') && 
    !model.id.toLowerCase().includes('transcribe')&& 
    !model.id.toLowerCase().includes('tts')&&
    !model.id.toLowerCase().includes('instruct')&& 
    !model.id.toLowerCase().includes('image')
  );
  return filteredModels;
}

async function callModel(prompt, modelId) {
  const provider = modelId.includes('gpt') ? 'openai' : modelId.includes('gemini') ? 'gemini' : 'unknown';

  if (provider === 'openai') {
    const apiKey = modelId.includes('custom') ? customOpenaiApiKey : process.env.OPENAI_API_KEY;
    return callGPT(prompt, modelId, apiKey);
  } else if (provider === 'gemini') {
    const apiKey = modelId.includes('custom') ? customGeminiApiKey : process.env.GEMINI_API_KEY;
    return callGeminiModel(prompt, modelId, apiKey);
  }
}

async function callGPT(prompt,modelId, apiKey = process.env.OPENAI_API_KEY) {
  const start = Date.now();
  const client = new OpenAI({ apiKey });
  const response = await client.chat.completions.create({
    model: modelId,
    messages: [{ role: 'user', content: prompt }],
  });
  const time = Date.now() - start;
  const output = response.choices[0].message.content;
  const tokens = response.usage.total_tokens;
  return { output, time, tokens };
}

async function callGeminiModel(prompt, modelId, apiKey = process.env.GEMINI_API_KEY) {
  const start = Date.now();
  const client = new GoogleGenAI({ apiKey });
  const response = await client.models.generateContent({
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
    const customProvider = req.query.customProvider;
    const customApiKey = req.query.customApiKey;
    const models = await getAvailableModels(customProvider, customApiKey);
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/compare', async (req, res) => {
  const { prompt, model1, model2 } = req.body;
  try {
    if (!prompt || !model1 || !model2) {
      return res.status(400).json({ error: 'Missing prompt or model selection' });
    }

    const [result1, result2] = await Promise.all([
      callModel(prompt, model1.id),
      callModel(prompt, model2.id)
    ]);

    // Calculate similarity
    const similarity = stringSimilarity.compareTwoStrings(result1.output, result2.output);

    // Calculate text metrics for both responses
    const metrics1 = calculateTextMetrics(result1.output);
    const metrics2 = calculateTextMetrics(result2.output);

    res.json({ 
      model1: { ...result1, name: model1.name, metrics: metrics1 }, 
      model2: { ...result2, name: model2.name, metrics: metrics2 }, 
      similarity 
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));