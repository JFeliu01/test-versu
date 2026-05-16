const express = require('express');
const cors = require('cors');
const { WebSocketServer } = require('ws');
const http = require('http');
const client = require('prom-client');
const Groq = require('groq-sdk');
const jwt = require('jsonwebtoken');
const db = require('./db');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const groq = new Groq({ apiKey: process.env.AI_API_KEY });
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey_para_desarrollo';

app.use(cors());
app.use(express.json());

const register = new client.Registry();
client.collectDefaultMetrics({ register });

const httpRequestsTotal = new client.Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'path', 'status_code'],
  registers: [register]
});

const wsActiveConnections = new client.Gauge({
  name: 'ws_active_connections',
  help: 'Number of active WebSocket connections',
  registers: [register]
});

app.use((req, res, next) => {
  res.on('finish', () => {
    httpRequestsTotal.inc({ method: req.method, path: req.route?.path || req.path, status_code: res.statusCode });
  });
  next();
});

app.get('/metrics', async (req, res) => {
  try {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
  } catch (ex) {
    res.status(500).end(ex);
  }
});

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) return res.status(403).json({ error: 'Forbidden' });
    req.user = user;
    next();
  });
};

app.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1 AND password = $2', [email, password]);
    if (result.rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
    const user = result.rows[0];
    const token = jwt.sign({ id: user.id, org_id: user.org_id, name: user.name, email: user.email }, JWT_SECRET);
    res.json({ token });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/conversations', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM conversations WHERE org_id = $1 ORDER BY created_at DESC', [req.user.org_id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('INSERT INTO conversations (org_id) VALUES ($1) RETURNING *', [req.user.org_id]);
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/conversations/:id/messages', authenticateToken, async (req, res) => {
  try {
    const conv = await db.query('SELECT org_id FROM conversations WHERE id = $1', [req.params.id]);
    if (conv.rows.length === 0 || conv.rows[0].org_id !== req.user.org_id) return res.status(403).json({ error: 'Forbidden' });
    const result = await db.query('SELECT * FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [req.params.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/conversations/:id/rating', authenticateToken, async (req, res) => {
  const { rating } = req.body;
  try {
    const conv = await db.query('SELECT org_id FROM conversations WHERE id = $1', [req.params.id]);
    if (conv.rows.length === 0 || conv.rows[0].org_id !== req.user.org_id) return res.status(403).json({ error: 'Forbidden' });
    await db.query('UPDATE conversations SET rating = $1 WHERE id = $2', [rating, req.params.id]);
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

wss.on('connection', (ws) => {
  wsActiveConnections.inc();

  ws.on('message', async (message) => {
    try {
      const { conversationId, text, token } = JSON.parse(message.toString());
      const decoded = jwt.verify(token, JWT_SECRET);
      
      const conv = await db.query('SELECT org_id FROM conversations WHERE id = $1', [conversationId]);
      if (conv.rows.length === 0 || conv.rows[0].org_id !== decoded.org_id) {
        ws.send(JSON.stringify({ type: 'error', content: 'Unauthorized' }));
        return;
      }

      const stream = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: 'Responde conciso. Máximo 2 párrafos.' },
          { role: 'user', content: text }
        ],
        model: 'llama-3.1-8b-instant',
        temperature: 0.3,
        max_tokens: 150,
        stream: true,
      });

      let fullResponse = '';
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || '';
        if (content) {
          fullResponse += content;
          ws.send(JSON.stringify({ type: 'chunk', content }));
        }
      }

      await db.query('INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)', [conversationId, 'user', text]);
      await db.query('INSERT INTO messages (conversation_id, role, content) VALUES ($1, $2, $3)', [conversationId, 'assistant', fullResponse]);

      ws.send(JSON.stringify({ type: 'done' }));
    } catch (error) {
      ws.send(JSON.stringify({ type: 'error', content: error.message }));
    }
  });

  ws.on('close', () => {
    wsActiveConnections.dec();
  });
});

const PORT = process.env.PORT || 4000;
if (require.main === module) {
  server.listen(PORT, () => console.log(`Servidor activo en el puerto ${PORT}`));
}
module.exports = { app, server };