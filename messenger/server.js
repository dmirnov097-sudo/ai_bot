const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();
const { Pool } = require('pg');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: { origin: 'http://localhost:3000', methods: ['GET', 'POST'] }
});

const pool = new Pool({
  connectionString: process.env.DATABASE_URL
});

app.use(cors());
app.use(express.json());

// Middleware для проверки токена
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'No token' });
  
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// РЕГИСТРАЦИЯ
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, email, password } = req.body;
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'All fields required' });
    }
    
    const hashedPassword = await bcrypt.hash(password, 10);
    
    const result = await pool.query(
      'INSERT INTO users (username, email, password_hash) VALUES ($1, $2, $3) RETURNING id, username, email',
      [username, email, hashedPassword]
    );
    
    const token = jwt.sign(
      { id: result.rows[0].id, username: result.rows[0].username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({ user: result.rows[0], token });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ЛОГИН
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }
    
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    
    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    const validPassword = await bcrypt.compare(password, user.password_hash);
    
    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid password' });
    }
    
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    
    res.json({
      user: { id: user.id, username: user.username, email: user.email },
      token
    });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ПОЛУЧИТЬ ПОЛЬЗОВАТЕЛЕЙ
app.get('/api/users', verifyToken, async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, status FROM users WHERE id != $1 LIMIT 50', [req.user.id]);
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ПОЛУЧИТЬ ЧАТЫ
app.get('/api/chats', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT DISTINCT c.* FROM chats c
       JOIN chat_members cm ON c.id = cm.chat_id
       WHERE cm.user_id = $1
       ORDER BY c.updated_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// СОЗДАТЬ ЧАТ
app.post('/api/chats', verifyToken, async (req, res) => {
  try {
    const { name, user_ids } = req.body;
    
    const result = await pool.query(
      'INSERT INTO chats (name, is_group) VALUES ($1, $2) RETURNING *',
      [name || 'Chat', user_ids.length > 1]
    );
    
    const chat = result.rows[0];
    
    // Добавить членов чата
    const allUserIds = [...new Set([...user_ids, req.user.id])];
    for (const userId of allUserIds) {
      await pool.query(
        'INSERT INTO chat_members (chat_id, user_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [chat.id, userId]
      );
    }
    
    res.json(chat);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ПОЛУЧИТЬ СООБЩЕНИЯ
app.get('/api/chats/:chatId/messages', verifyToken, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, u.username FROM messages m
       JOIN users u ON m.sender_id = u.id
       WHERE m.chat_id = $1
       ORDER BY m.created_at ASC
       LIMIT 100`,
      [req.params.chatId]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ОТПРАВИТЬ СООБЩЕНИЕ
app.post('/api/messages', verifyToken, async (req, res) => {
  try {
    const { chat_id, content } = req.body;
    if (!content || !chat_id) {
      return res.status(400).json({ error: 'Content and chat_id required' });
    }
    
    const result = await pool.query(
      `INSERT INTO messages (chat_id, sender_id, content) VALUES ($1, $2, $3) 
       RETURNING *`,
      [chat_id, req.user.id, content]
    );
    
    // Обновить время последнего обновления чата
    await pool.query('UPDATE chats SET updated_at = NOW() WHERE id = $1', [chat_id]);
    
    res.json(result.rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// Socket.io
const users = new Map();
const typingUsers = new Map();

io.on('connection', (socket) => {
  console.log('User connected:', socket.id);
  
  socket.on('user_join', (userId) => {
    users.set(userId, socket.id);
    socket.userId = userId;
    io.emit('users_online', Array.from(users.keys()));
  });
  
  socket.on('send_message', (data) => {
    io.to(String(data.chat_id)).emit('receive_message', data);
  });
  
  socket.on('join_chat', (chatId) => {
    socket.join(String(chatId));
  });
  
  socket.on('leave_chat', (chatId) => {
    socket.leave(String(chatId));
  });
  
  socket.on('typing', (data) => {
    socket.to(String(data.chat_id)).emit('user_typing', data);
  });
  
  socket.on('disconnect', () => {
    if (socket.userId) {
      users.delete(socket.userId);
      io.emit('users_online', Array.from(users.keys()));
    }
    console.log('User disconnected:', socket.id);
  });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
