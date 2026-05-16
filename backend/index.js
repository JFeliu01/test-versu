const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const client = require('prom-client');
const Groq = require('groq-sdk');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const groq = new Groq({
  apiKey: process.env.AI_API_KEY
});

app.use(cors());
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register });

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

wss.on('connection', (ws) => {
  ws.on('message', async (message) => {
    try {
      const parsedMessage = message.toString();
      
      const stream = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Responde conciso. Máximo 2 párrafos.' },
          { role: 'user', content: parsedMessage }
        ],
        model: 'llama3-8b-8192',
        temperature: 0.3,
        max_tokens: 150,
        stream: true,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          ws.send(JSON.stringify({ type: 'chunk', content }));
        }
      }
      ws.send(JSON.stringify({ type: 'done' }));
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', content: 'Internal Server Error' }));
    }
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => console.log(`Servidor activo en el puerto ${PORT}`));