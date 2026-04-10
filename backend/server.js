const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

const apiRoutes = require('./routes/api');
const { recalculateAndBroadcastQueue } = require('./controllers/queueController');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST', 'PUT'],
  },
});

// Middleware
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '25mb' }));

// Attach io to every request so controllers can emit events
app.use((req, res, next) => {
  req.io = io;
  next();
});

// Routes
app.use('/api', apiRoutes);

// MongoDB Connection
const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/opd_platform';

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

mongoose
  .connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected successfully');

    // Socket.io connection handler — only after DB is ready
    io.on('connection', (socket) => {
      console.log(`🔌 Client connected: ${socket.id}`);
      recalculateAndBroadcastQueue(io);
      socket.on('disconnect', () => {
        console.log(`🔌 Client disconnected: ${socket.id}`);
      });
    });

    // Queue heartbeat — starvation-prevention, fires every 60 seconds
    setInterval(() => {
      console.log('⏱️  Queue heartbeat: recalculating priority scores...');
      recalculateAndBroadcastQueue(io);
    }, 60 * 1000);
  })
  .catch((err) => {
    console.error('❌ MongoDB connection error:', err.message);
    process.exit(1);
  });
