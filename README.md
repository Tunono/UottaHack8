# LLM Comparison Website

This website allows you to compare responses from two different LLMs: OpenAI GPT and Google Gemini.

## Setup

1. Install dependencies:
   ```
   npm install
   ```

2. Set up your API keys in `.env`:
   - `OPENAI_API_KEY`: Get from https://platform.openai.com/
   - `GEMINI_API_KEY`: Get from https://makersuite.google.com/app/apikey

3. Run the server:
   ```
   npm start
   ```

4. Open http://localhost:3000 in your browser.

## Features

- Input a prompt and get responses from both LLMs
- View response times and token counts (where available)
- See similarity score between the responses~