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
  const provider = modelId.includes('gpt') ? 'openai' : 'gemini';

  if (provider === 'openai') {
    return callGPT(prompt, modelId);
  } else if (provider === 'gemini') {
    return callGeminiModel(prompt, modelId);
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

async function callGeminiModel(prompt, modelId) {
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
    if (!model1 || !model2) {
      return res.status(400).json({ error: 'Missing model selection' });
    }

    // If no prompt provided, return metadata-only comparison (pricing, context limits, recommendations)
    if (!prompt || prompt.trim().length === 0) {
      const info1 = getModelInfo(model1.id);
      const info2 = getModelInfo(model2.id);
      return res.json({ metadataOnly: true, model1: { name: model1.name, info: info1 }, model2: { name: model2.name, info: info2 } });
    }

    // Otherwise, call both models with the provided prompt
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

// Simple model metadata/pricing helper
function getModelInfo(modelId) {
  const id = (modelId || '').toLowerCase();
  if (id.includes('gpt-4')) {
    return {
      price: '$0.03 / 1k tokens (input), $0.06 / 1k tokens (output)',
      context: '8k-32k tokens (varies by variant)',
      recommended: 'Complex reasoning, summarization',
      notes: 'Higher cost, better for accuracy'
    };
  }
  if (id.includes('gpt-3.5') || id.includes('turbo')) {
    return {
      price: '$0.002 / 1k tokens',
      context: '4k-16k tokens (varies)',
      recommended: 'Cheap chat, prototyping',
      notes: 'Low cost, fast responses'
    };
  }
  if (id.includes('gemini')) {
    return {
      price: 'See Google Gemini pricing',
      context: 'Large context',
      recommended: 'Multimodal, high-quality responses',
      notes: 'Consult Google docs for exact pricing'
    };
  }
  return { price: 'Varies', context: 'Unknown', recommended: 'General use', notes: '' };
}

// Chat endpoint: single-model conversational call
app.post('/chat', async (req, res) => {
  const { prompt, model } = req.body;
  try {
    if (!prompt || !model) return res.status(400).json({ error: 'Missing prompt or model' });

    const result = await callModel(prompt, model.id);
    res.json({ output: result.output, time: result.time, tokens: result.tokens, modelName: model.name });
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));