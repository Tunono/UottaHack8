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

async function callGPT(prompt) {
  const start = Date.now();
  const response = await openai.chat.completions.create({
    model: 'gpt-3.5-turbo',
    messages: [{ role: 'user', content: prompt }],
  });
  const time = Date.now() - start;
  const output = response.choices[0].message.content;
  const tokens = response.usage.total_tokens;
  return { output, time, tokens };
}

async function callGemini(prompt) {
  const start = Date.now();
  const response = await genAI.models.generateContent({
    model: 'gemini-2.5-flash',
    contents: prompt,
  });
  const time = Date.now() - start;
  const output = response.text;
  const tokens = null; // Gemini API doesn't provide token count in response
  return { output, time, tokens };
}

app.post('/compare', async (req, res) => {
  const { prompt } = req.body;
  try {
    const [gpt, gemini] = await Promise.all([
      callGPT(prompt),
      callGemini(prompt)
    ]);

    // Calculate similarity
    const similarity = stringSimilarity.compareTwoStrings(gpt.output, gemini.output);

    res.json({ gpt, gemini, similarity });
} catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));