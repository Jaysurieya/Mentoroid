// Backend/Server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
const http = require('http');
const { Server: SocketServer } = require('socket.io');
// load env early so other modules (FirebaseAdmin) see variables
dotenv.config();

const authRoutes = require('./Routes/authRoutes.js');
const materialRoutes = require('./Routes/materialRoutes.js');
const sessionRoutes = require('./Routes/sessionRoutes.js');
const chatRoutes = require('./Routes/chatRoutes.js');
const { auth } = require('firebase-admin');
const connectDB = require('./Mongoconnect');
const socketHandler = require('./socketHandler');

connectDB();
const app = express();

const corsOptions = {
  origin: ["http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
};

app.use(cors(corsOptions));

app.use(bodyParser.json());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/rag', materialRoutes);   // /api/rag/query also handled
app.use('/api/sessions', sessionRoutes);
app.use('/api/chat', chatRoutes);

// ─── HTTP + Socket.IO ──────────────────────────────────────────────────────
const httpServer = http.createServer(app);
const io = new SocketServer(httpServer, { cors: corsOptions });

// Make io accessible from controllers via req.app.get('io')
app.set('io', io);

// Register socket event handlers
socketHandler(io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});