const mongoose = require('mongoose');
const config = require('./index');

async function connectDb() {
  try {
    await mongoose.connect(config.mongodbUri);
    console.log('MongoDB connected');
  } catch (err) {
    console.error('MongoDB connection error:', err.message);
    process.exit(1);
  }
}

module.exports = { connectDb };
