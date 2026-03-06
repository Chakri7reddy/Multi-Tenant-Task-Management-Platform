const ROLES = ['ADMIN', 'MANAGER', 'USER'];

const permissionMap = {
  ADMIN: ['manage_users', 'manage_tasks', 'create_tasks', 'assign_tasks', 'update_own_tasks'],
  MANAGER: ['manage_tasks', 'create_tasks', 'assign_tasks', 'update_own_tasks'],
  USER: ['update_own_tasks'],
};

function requireRole(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    if (allowedRoles.includes(req.user.role)) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

function requirePermission(permission) {
  return (req, res, next) => {
    if (!req.user) return res.status(401).json({ error: 'Unauthorized' });
    const perms = permissionMap[req.user.role] || [];
    if (perms.includes(permission)) return next();
    return res.status(403).json({ error: 'Insufficient permissions' });
  };
}

module.exports = { requireRole, requirePermission, ROLES };
