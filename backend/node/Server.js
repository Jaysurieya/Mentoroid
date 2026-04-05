// Backend/Server.js
const express = require('express');
const mongoose = require('mongoose');
const bodyParser = require('body-parser');
const cors = require('cors');
const dotenv = require('dotenv');
const path = require('path');
// load env early so other modules (FirebaseAdmin) see variables
dotenv.config();

const authRoutes = require('./Routes/authRoutes.js');
const materialRoutes = require('./Routes/materialRoutes.js');
const sessionRoutes = require('./Routes/sessionRoutes.js');
const { auth } = require('firebase-admin');
const connectDB = require('./Mongoconnect');

connectDB();
const app = express();


app.use(cors({
  origin: ["http://localhost:5173"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  credentials: true
}));

app.use(bodyParser.json());
app.use(express.json());

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));


app.use('/api/auth', authRoutes);
app.use('/api/materials', materialRoutes);
app.use('/api/rag', materialRoutes);   // /api/rag/query also handled
app.use('/api/sessions', sessionRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});