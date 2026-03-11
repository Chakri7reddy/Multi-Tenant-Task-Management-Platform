const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const config = require('./config');
const { connectDb } = require('./config/db');
const { redisHealth } = require('./config/redis');
const { setupWebSocket } = require('./websocket');
const { UPLOAD_DIR } = require('./middleware/upload');

const Task = require('./models/Task');
const authRoutes = require('./routes/auth');
const taskRoutes = require('./routes/tasks');
const userRoutes = require('./routes/users');
const orgRoutes = require('./routes/organizations');
const notificationRoutes = require('./routes/notifications');

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: { origin: config.frontendOrigins, credentials: true },
  path: '/ws',
});
setupWebSocket(io);

app.use(helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }));
app.use(cors({ origin: config.frontendOrigins, credentials: true }));
app.use(express.json({ limit: '1mb' }));

app.get('/health', async (req, res) => {
  const redisOk = await redisHealth();
  res.json({ status: 'ok', redis: redisOk });
});

app.use('/uploads', express.static(path.join(UPLOAD_DIR)));

app.use('/auth', authRoutes);
app.use('/orgs', orgRoutes);
app.use('/users', userRoutes);
app.use('/tasks', taskRoutes);
app.use('/notifications', notificationRoutes);

app.use((req, res) => res.status(404).json({ error: 'Not found' }));

app.use((err, req, res, next) => {
  if (!res.headersSent) {
    let status = err.status || err.statusCode || 500;
    if (err.code === 'LIMIT_FILE_SIZE') status = 413;
    if (err.code === 'LIMIT_UNEXPECTED_FILE') status = 400;
    const msg = status >= 500 && config.isProd ? 'Internal server error' : (err.message || 'Error');
    if (status >= 500) console.error(err);
    res.status(status).json({ error: msg });
  }
});

async function migrateAssignedToArray() {
  const tasks = await Task.find({ assignedTo: { $exists: true, $ne: null } }).lean();
  let count = 0;
  for (const t of tasks) {
    if (!Array.isArray(t.assignedTo) && t.assignedTo) {
      await Task.updateOne({ _id: t._id }, { $set: { assignedTo: [t.assignedTo] } });
      count++;
    }
  }
  if (count > 0) console.log(`Migrated ${count} tasks to multi-assign`);
}

async function start() {
  await connectDb();
  await migrateAssignedToArray();
  server.listen(config.port, '0.0.0.0', () => {
    console.log(`Server running on port ${config.port} (${config.nodeEnv})`);
  });
}

function gracefulShutdown(signal) {
  console.log(`${signal} received, shutting down`);
  server.close(() => {
    process.exit(0);
  });
  setTimeout(() => process.exit(1), 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
