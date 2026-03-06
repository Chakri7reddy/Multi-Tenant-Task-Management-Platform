const express = require('express');
const path = require('path');
const router = express.Router();
const { authMiddleware } = require('../middleware/auth');
const { requirePermission } = require('../middleware/rbac');
const taskService = require('../services/taskService');
const notificationService = require('../services/notificationService');
const activityService = require('../services/activityService');
const { apiLimiter } = require('../middleware/rateLimit');
const { upload } = require('../middleware/upload');
const Task = require('../models/Task');
const Comment = require('../models/Comment');
const Template = require('../models/Template');

router.use(authMiddleware);
router.use(apiLimiter);

router.get('/', async (req, res) => {
  try {
    const status = req.query.status || null;
    const priority = req.query.priority || null;
    const sort = req.query.sort || '-createdAt';
    const tags = req.query.tags ? req.query.tags.split(',').map((t) => t.trim()).filter(Boolean) : null;
    let assignedTo = null;
    if (req.query.assignedTo === 'me') assignedTo = req.user._id;
    const tasks = await taskService.getTasksByOrg(req.orgId, { status, assignedTo, priority, tags, sort });
    return res.json(tasks);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/stats/summary', async (req, res) => {
  try {
    const orgId = req.orgId;
    const [byStatus, total, myCount, overdueCount] = await Promise.all([
      Task.aggregate([{ $match: { orgId } }, { $group: { _id: '$status', count: { $sum: 1 } } }]),
      Task.countDocuments({ orgId }),
      Task.countDocuments({ orgId, assignedTo: { $in: [req.user._id] }, status: { $ne: 'DONE' } }),
      Task.countDocuments({ orgId, dueDate: { $lt: new Date(), $ne: null }, status: { $ne: 'DONE' } }),
    ]);
    const statusCounts = { TODO: 0, IN_PROGRESS: 0, DONE: 0 };
    byStatus.forEach((s) => { statusCounts[s._id] = s.count; });
    return res.json({ total, myTasks: myCount, overdue: overdueCount, byStatus: statusCounts });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/export', async (req, res) => {
  try {
    const tasks = await taskService.getTasksByOrg(req.orgId, {});
    const format = req.query.format || 'csv';
    if (format === 'csv') {
      const header = 'Title,Status,Priority,Assigned To,Due Date,Tags,Created\n';
      const assignedStr = (t) => {
        const arr = Array.isArray(t.assignedTo) ? t.assignedTo : t.assignedTo ? [t.assignedTo] : [];
        return arr.map((u) => u?.email || u).filter(Boolean).join('; ');
      };
      const rows = tasks.map(
        (t) =>
          `"${(t.title || '').replace(/"/g, '""')}",${t.status},${t.priority || ''},"${assignedStr(t).replace(/"/g, '""')}",${t.dueDate ? new Date(t.dueDate).toISOString() : ''},"${(t.tags || []).join(', ')}",${t.createdAt ? new Date(t.createdAt).toISOString() : ''}`
      ).join('\n');
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=tasks.csv');
      return res.send(header + rows);
    }
    return res.json(tasks);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/bulk', requirePermission('manage_tasks'), async (req, res) => {
  try {
    const { taskIds, updates } = req.body;
    if (!Array.isArray(taskIds) || taskIds.length === 0 || !updates || typeof updates !== 'object') {
      return res.status(400).json({ error: 'taskIds array and updates object required' });
    }
    const allowed = ['status', 'priority', 'assignedTo'];
    const set = {};
    allowed.forEach((k) => {
      if (updates[k] !== undefined) {
        if (k === 'assignedTo') {
          set[k] = Array.isArray(updates[k]) ? updates[k].filter(Boolean) : updates[k] ? [updates[k]] : [];
        } else {
          set[k] = updates[k];
        }
      }
    });
    if (Object.keys(set).length === 0) return res.status(400).json({ error: 'No allowed fields to update' });
    const ids = taskIds.map((id) => (typeof id === 'string' && id.length === 24 ? id : String(id))).filter(Boolean);
    if (ids.length === 0) return res.status(400).json({ error: 'Invalid task IDs' });
    const result = await Task.updateMany(
      { _id: { $in: ids }, orgId: req.orgId },
      { $set: set }
    );
    taskService.publishTaskUpdate(req.orgId, { event: 'bulk_updated' });
    return res.json({ modified: result.modifiedCount });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/templates', async (req, res) => {
  try {
    const list = await Template.find({ orgId: req.orgId }).sort({ createdAt: -1 }).lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/templates', requirePermission('create_tasks'), async (req, res) => {
  try {
    const { name, title, description, priority, tags, subtasks } = req.body;
    if (!name || !title) return res.status(400).json({ error: 'name and title required' });
    const doc = await Template.create({
      orgId: req.orgId,
      name,
      title,
      description: description || '',
      priority: priority || 'MEDIUM',
      tags: Array.isArray(tags) ? tags : [],
      subtasks: Array.isArray(subtasks) ? subtasks.map((s) => ({ title: s.title || s })) : [],
    });
    return res.status(201).json(doc);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/templates/:tid', async (req, res) => {
  try {
    const t = await Template.findOne({ _id: req.params.tid, orgId: req.orgId }).lean();
    if (!t) return res.status(404).json({ error: 'Template not found' });
    return res.json(t);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id/activity', async (req, res) => {
  try {
    const list = await activityService.getByTaskId(req.params.id, req.orgId);
    if (list === null) return res.status(404).json({ error: 'Task not found' });
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id/comments', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const list = await Comment.find({ taskId: req.params.id })
      .sort({ createdAt: 1 })
      .populate('userId', 'email')
      .lean();
    return res.json(list);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/comments', async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    const { body } = req.body;
    if (!body || !body.trim()) return res.status(400).json({ error: 'body required' });
    const comment = await Comment.create({
      taskId: req.params.id,
      userId: req.user._id,
      body: body.trim(),
    });
    await comment.populate('userId', 'email');
    await activityService.log(req.params.id, req.user._id, 'comment_added', { body: body.trim().slice(0, 100) });
    const assignees = Array.isArray(task.assignedTo) ? task.assignedTo : task.assignedTo ? [task.assignedTo] : [];
    for (const a of assignees) {
      const aid = a?._id?.toString?.() || a?.toString?.();
      if (aid && aid !== req.user._id.toString()) {
        await notificationService.createNotification(aid, 'comment', {
          taskId: req.params.id,
          title: `New comment on task: ${task.title}`,
          meta: { commentId: comment._id },
        });
      }
    }
    taskService.publishTaskUpdate(req.orgId, { event: 'comment', task: { _id: req.params.id } });
    return res.status(201).json(comment);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/attachments', upload.single('file'), async (req, res) => {
  try {
    const task = await Task.findOne({ _id: req.params.id, orgId: req.orgId });
    if (!task) return res.status(404).json({ error: 'Task not found' });
    if (!req.file) return res.status(400).json({ error: 'File required' });
    const url = `/uploads/tasks/${req.file.filename}`;
    const att = { url, name: req.file.originalname, contentType: req.file.mimetype };
    await Task.findByIdAndUpdate(req.params.id, { $push: { attachments: att } });
    taskService.publishTaskUpdate(req.orgId, { event: 'updated' });
    return res.status(201).json(att);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const task = await taskService.getTaskById(req.params.id, req.orgId);
    if (!task) return res.status(404).json({ error: 'Task not found' });
    return res.json(task);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/:id/duplicate', requirePermission('create_tasks'), async (req, res) => {
  try {
    const source = await taskService.getTaskById(req.params.id, req.orgId);
    if (!source) return res.status(404).json({ error: 'Task not found' });
    const raw = source.toObject ? source.toObject() : { ...source };
    const assigneeIds = Array.isArray(raw.assignedTo)
      ? raw.assignedTo.map((a) => a?._id || a).filter(Boolean)
      : raw.assignedTo ? [raw.assignedTo._id || raw.assignedTo] : [];
    const task = await taskService.createTask(req.orgId, {
      title: (raw.title || 'Untitled') + ' (copy)',
      description: raw.description || '',
      status: 'TODO',
      priority: raw.priority || 'MEDIUM',
      assignedTo: assigneeIds,
      dueDate: raw.dueDate ? new Date(raw.dueDate) : null,
      tags: Array.isArray(raw.tags) ? [...raw.tags] : [],
      subtasks: (raw.subtasks || []).map((s) => ({ title: s.title || s, done: false })),
    });
    await activityService.log(task._id, req.user._id, 'created', { title: task.title });
    return res.status(201).json(task);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.post('/', requirePermission('create_tasks'), async (req, res) => {
  try {
    const { title, description, status, priority, assignedTo, dueDate, tags, subtasks } = req.body;
    if (!title) return res.status(400).json({ error: 'title required' });
    const assignees = Array.isArray(assignedTo) ? assignedTo.filter(Boolean) : assignedTo ? [assignedTo] : [];
    const task = await taskService.createTask(req.orgId, {
      title,
      description: description || '',
      status: status || 'TODO',
      priority: priority || 'MEDIUM',
      assignedTo: assignees,
      dueDate: dueDate ? new Date(dueDate) : null,
      tags: Array.isArray(tags) ? tags.filter(Boolean) : [],
      subtasks: Array.isArray(subtasks) ? subtasks.map((s) => ({ title: s.title || s, done: !!s.done })) : [],
    });
    await activityService.log(task._id, req.user._id, 'created', { title: task.title });
    const assigneeIds = Array.isArray(task.assignedTo) ? task.assignedTo : task.assignedTo ? [task.assignedTo] : [];
    for (const a of assigneeIds) {
      const aid = a?._id?.toString?.() || a?.toString?.();
      if (aid && aid !== req.user._id.toString()) {
        await notificationService.createNotification(aid, 'task_assigned', {
          taskId: task._id,
          title: `Task assigned to you: ${task.title}`,
          meta: {},
        });
      }
    }
    return res.status(201).json(task);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.patch('/:id', async (req, res) => {
  try {
    const updates = {};
    const { title, description, status, priority, assignedTo, dueDate, tags, subtasks } = req.body;
    if (title !== undefined) updates.title = title;
    if (description !== undefined) updates.description = description;
    if (status !== undefined) updates.status = status;
    if (priority !== undefined) updates.priority = priority;
    if (dueDate !== undefined) updates.dueDate = dueDate;
    if (tags !== undefined) updates.tags = Array.isArray(tags) ? tags.filter(Boolean) : [];
    if (subtasks !== undefined) updates.subtasks = Array.isArray(subtasks) ? subtasks.map((s) => ({ title: s.title || s, done: !!s.done })) : [];

    if (req.user.role === 'USER') {
      const existing = await taskService.getTaskById(req.params.id, req.orgId);
      if (!existing) return res.status(404).json({ error: 'Task not found' });
      const assignees = Array.isArray(existing.assignedTo) ? existing.assignedTo : existing.assignedTo ? [existing.assignedTo] : [];
      const assignedIds = assignees.map((a) => a?._id?.toString?.() || a?.toString?.()).filter(Boolean);
      if (!assignedIds.includes(req.user._id.toString())) {
        return res.status(403).json({ error: 'You can only update tasks assigned to you' });
      }
      if (assignedTo !== undefined) delete updates.assignedTo;
    } else {
      if (assignedTo !== undefined) {
        updates.assignedTo = Array.isArray(assignedTo) ? assignedTo.filter(Boolean) : assignedTo ? [assignedTo] : [];
      }
    }

    const task = await taskService.updateTask(req.params.id, req.orgId, updates);
    if (!task) return res.status(404).json({ error: 'Task not found' });

    await activityService.log(task._id, req.user._id, 'updated', {});
    if (updates.assignedTo && Array.isArray(updates.assignedTo)) {
      for (const aid of updates.assignedTo) {
        const idStr = aid?._id?.toString?.() || aid?.toString?.();
        if (idStr && idStr !== req.user._id.toString()) {
          await notificationService.createNotification(idStr, 'task_assigned', {
            taskId: task._id,
            title: `Task assigned to you: ${task.title}`,
            meta: {},
          });
        }
      }
    }
    return res.json(task);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

router.delete('/:id', requirePermission('manage_tasks'), async (req, res) => {
  try {
    const ok = await taskService.deleteTask(req.params.id, req.orgId);
    if (!ok) return res.status(404).json({ error: 'Task not found' });
    return res.status(204).send();
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
