const mongoose = require('mongoose');
require('dotenv').config();

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.URI);
    console.log('MongoDB connected fr 🚀');
  } catch (err) {
    console.error('MongoDB connection error 💀', err.message);
    process.exit(1);
  }
};

module.exports = connectDB;
