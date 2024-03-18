// node --version # Should be >= 18

// npm install @google/generative-ai express

const express = require('express');
const { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } = require('@google/generative-ai');
const dotenv = require('dotenv').config();
const fs = require('fs');
const fsPromises = fs.promises;
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

const MODEL_NAME = "gemini-pro";
const API_KEY = process.env.API_KEY;

const DATA_DIRECTORY = path.join(__dirname, 'data');
const FILE_NAME = 'example.txt';
const FILE_PATH = path.join(DATA_DIRECTORY, FILE_NAME);

let fileContent = '';

(async () => {
  try {
    fileContent = await fsPromises.readFile(FILE_PATH, 'utf-8');
    console.log('File contents loaded successfully.');
    console.log(fileContent);
  } catch (error) {
    console.error('Error reading file:', error);
  }
})();

fs.watchFile(FILE_PATH, async (curr, prev) => {
  if (curr.mtime !== prev.mtime) {
    try {
      fileContent = await fsPromises.readFile(FILE_PATH, 'utf-8');
      console.log('File contents updated successfully.');
    } catch (error) {
      console.error('Error updating file contents:', error);
    }
  }
});

async function runChat(userInput) {
  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: MODEL_NAME });
  const generationConfig = {
    temperature: 0.9,
    topK: 1,
    topP: 1,
    maxOutputTokens: 2000,
  };
  const safetySettings = [
    {
      category: HarmCategory.HARM_CATEGORY_HARASSMENT,
      threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
    },
  ];

  console.log(fileContent);

  const chat = model.startChat({
    generationConfig,
    safetySettings,
    history: [
      {
        role: "user",
        parts: [{ text: "The following is a string of words: " + fileContent }],
      },
      {
        role: "model",
        parts: [{ text: "Understood, they are: " + fileContent }],
      },
    ],
  });

  const result = await chat.sendMessage(userInput);
  const response = result.response;
  return response.text();
}

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/index.html');
});

app.get('/loader.gif', (req, res) => {
  res.sendFile(__dirname + '/loader.gif');
});

app.post('/chat', async (req, res) => {
  try {
    const userInput = req.body?.userInput;
    console.log('incoming /chat req', userInput);
    if (!userInput) {
      return res.status(400).json({ error: 'Invalid request body' });
    }
    const response = await runChat(userInput);
    res.json({ response });
  } catch (error) {
    console.error('Error in chat endpoint:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
