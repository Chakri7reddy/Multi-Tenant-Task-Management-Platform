const { getRedisSubscriber } = require('../config/redis');
const taskService = require('../services/taskService');

const ORG_ROOM_PREFIX = 'org:';

function setupWebSocket(io) {
  const redisSub = getRedisSubscriber();
  redisSub.once('ready', () => {
    redisSub.subscribe(taskService.CHANNEL_TASK, (err) => {
      if (err) console.warn('Redis subscribe error:', err.message);
    });
  });
  redisSub.on('message', (channel, message) => {
    if (channel !== taskService.CHANNEL_TASK) return;
    try {
      const { orgId, ...payload } = JSON.parse(message);
      io.to(ORG_ROOM_PREFIX + orgId).emit('task:update', payload);
    } catch (e) {
      // ignore
    }
  });

  io.on('connection', (socket) => {
    const orgId = socket.handshake.auth?.orgId;
    if (!orgId) {
      socket.disconnect(true);
      return;
    }
    const room = ORG_ROOM_PREFIX + orgId;
    socket.join(room);

    socket.on('disconnect', () => {
      socket.leave(room);
    });
  });
}

module.exports = { setupWebSocket };
