// server.js

// Simple Node.js Express backend to proxy Gemini API requests and protect your API key
const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Polyfill fetch for Node.js if not available (should be available in Node 18+)
if (typeof fetch === 'undefined') {
  global.fetch = (...args) => import('node-fetch').then(({default: fetch}) => fetch(...args));
}

const app = express();
const PORT = process.env.PORT || 3000;

// Configure static file serving
app.use(express.static(__dirname));
console.log('Serving static files from:', __dirname);

// Store your Gemini API key in .env file as GEMINI_API_KEY=your_key_here
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

// Allow all local requests
app.use(cors());
app.use(express.json());

app.post('/api/gemini', async (req, res) => {
  const { model, prompt } = req.body;
  console.log('Received request with model:', model);
  
  if (!model || !prompt) {
    console.error('Missing model or prompt in request body.');
    return res.status(400).json({ error: 'Model and prompt are required.' });
  }
  
  if (!GEMINI_API_KEY) {
    console.error('Gemini API key not set in backend.');
    return res.status(500).json({ error: 'Gemini API key not set in backend.' });
  }

  // Validate model name
  // Use Gemini v1.5 model for v1 endpoint
  const validModels = ['gemini-1.5-pro'];
  if (!validModels.includes(model)) {
    console.error('Invalid model name:', model);
    return res.status(400).json({ error: `Invalid model name. Use: ${validModels.join(', ')}` });
  }

  // Use v1 endpoint for Gemini 1.5
  const endpoint = `https://generativelanguage.googleapis.com/v1/models/${model}:generateContent?key=${GEMINI_API_KEY}`;
  
  // Properly format the request body according to Gemini API specifications
  const body = {
    contents: [{
      parts: [{ text: prompt }]
    }],
    generationConfig: {
      temperature: 0.7,
      maxOutputTokens: 1024
    }
  };

  try {
    console.log('Sending request to Gemini API...');
    const apiRes = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });

    if (!apiRes.ok) {
      console.error('API Response not OK:', apiRes.status, apiRes.statusText);
      const errorText = await apiRes.text();
      console.error('Error response:', errorText);
      return res.status(apiRes.status).json({ 
        error: 'Error from Gemini API', 
        status: apiRes.status,
        details: errorText
      });
    }

    const data = await apiRes.json();
    console.log('Received response from Gemini API:', JSON.stringify(data, null, 2));

    if (data.error) {
      console.error('Gemini API error:', data.error);
      return res.status(500).json({ error: data.error.message || 'Gemini API error.' });
    }

    if (!data.candidates || !data.candidates[0] || !data.candidates[0].content) {
      console.error('Unexpected API response format:', data);
      return res.status(500).json({ error: 'Unexpected response format from Gemini API.' });
    }

    res.json(data);
  } catch (err) {
    console.error('Error connecting to Gemini API:', err);
    res.status(500).json({ 
      error: 'Error connecting to Gemini API.',
      details: err.message,
      stack: err.stack
    });
  }
});

// Serve index.html for the root route
app.get('/', (req, res) => {
    const indexPath = path.join(__dirname, 'index.html');
    console.log('Attempting to serve:', indexPath);
    if (!require('fs').existsSync(indexPath)) {
        console.error('Error: index.html not found at', indexPath);
        return res.status(404).send('index.html not found');
    }
    res.sendFile(indexPath);
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error('Server error:', err);
    res.status(500).send('Something broke!');
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser`);
    console.log('Working directory:', __dirname);
});
