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
    const { page = 1, limit = 10, status, rating_min, channel, date_from, date_to } = req.query;
    const offset = (Number(page) - 1) * Number(limit);
    
    let where = 'WHERE c.org_id = $1';
    const params = [req.user.org_id];
    let paramIdx = 2;

    if (status && status !== 'Todos') {
      where += ` AND c.status = $${paramIdx++}`;
      params.push(status);
    }
    if (rating_min && rating_min !== 'Todos') {
      where += ` AND c.rating >= $${paramIdx++}`;
      params.push(Number(rating_min));
    }
    if (channel && channel !== 'Todos') {
      where += ` AND c.channel = $${paramIdx++}`;
      params.push(channel);
    }
    if (date_from) {
      where += ` AND c.created_at >= $${paramIdx++}`;
      params.push(date_from);
    }
    if (date_to) {
      where += ` AND c.created_at <= $${paramIdx++}`;
      params.push(date_to + 'T23:59:59');
    }

    const countResult = await db.query(`SELECT COUNT(*) FROM conversations c ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await db.query(
      `SELECT c.*,
        COALESCE(
          EXTRACT(EPOCH FROM (
            (SELECT MAX(created_at) FROM messages WHERE conversation_id = c.id) -
            (SELECT MIN(created_at) FROM messages WHERE conversation_id = c.id)
          )), 0
        )::int AS duration_seconds
      FROM conversations c
      ${where}
      ORDER BY c.created_at DESC
      LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, Number(limit), offset]
    );

    res.json({ data: result.rows, total, page: Number(page), limit: Number(limit) });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.post('/conversations', authenticateToken, async (req, res) => {
  try {
    const result = await db.query('INSERT INTO conversations (org_id) VALUES ($1) RETURNING *', [req.user.org_id]);
    const newConv = result.rows[0];

    // Broadcast to all connected WebSocket clients in the same org
    wss.clients.forEach(client => {
      if (client.readyState === 1 && client.orgId === req.user.org_id) {
        client.send(JSON.stringify({ type: 'new_conversation', conversation: { ...newConv, duration_seconds: 0 } }));
      }
    });

    res.json(newConv);
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
      const parsed = JSON.parse(message.toString());

      // Handle registration for real-time broadcasts
      if (parsed.type === 'register') {
        const decoded = jwt.verify(parsed.token, JWT_SECRET);
        ws.orgId = decoded.org_id;
        return;
      }

      const { conversationId, text, token, systemPrompt } = parsed;
      const decoded = jwt.verify(token, JWT_SECRET);
      ws.orgId = decoded.org_id;
      
      const conv = await db.query('SELECT org_id FROM conversations WHERE id = $1', [conversationId]);
      if (conv.rows.length === 0 || conv.rows[0].org_id !== decoded.org_id) {
        ws.send(JSON.stringify({ type: 'error', content: 'Unauthorized' }));
        return;
      }

      const previousMessagesQuery = await db.query('SELECT role, content FROM messages WHERE conversation_id = $1 ORDER BY created_at ASC', [conversationId]);
      const previousMessages = previousMessagesQuery.rows.map(m => ({
        role: m.role,
        content: m.content
      }));

      const stream = await groq.chat.completions.create({
        messages: [
          { role: 'system', content: systemPrompt || 'Responde conciso. Máximo 2 párrafos.' },
          ...previousMessages,
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