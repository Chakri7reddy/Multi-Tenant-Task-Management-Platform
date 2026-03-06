const path = require('path');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
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
  cors: { origin: config.frontendUrl, credentials: true },
  path: '/ws',
});
setupWebSocket(io);

app.use(cors({ origin: config.frontendUrl, credentials: true }));
app.use(express.json());

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

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
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
  server.listen(config.port, () => {
    console.log(`Server running on http://localhost:${config.port}`);
  });
}

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
