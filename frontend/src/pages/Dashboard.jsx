import { useState, useEffect, useMemo } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { getSocket, disconnectSocket } from '../services/socket';
import { getAccessToken } from '../services/api';
import TaskDetailSlideover from '../components/TaskDetailSlideover';
import AppLayout from '../components/AppLayout';
import KanbanView from '../components/KanbanView';
import CalendarView from '../components/CalendarView';

export function OrgIdNote({ orgId }) {
  const addToast = useToast();
  if (!orgId) return null;
  const copy = () => {
    navigator.clipboard.writeText(orgId).then(() => addToast('Org ID copied to clipboard', 'info'));
  };
  return (
    <div className="org-id-wrap">
      <span className="org-id-label">Org ID for team login</span>
      <code className="org-id-code">{orgId}</code>
      <button type="button" onClick={copy} className="org-id-copy btn-ghost" title="Copy">Copy</button>
    </div>
  );
}

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

function statusPill(status) {
  if (status === 'TODO') return 'pill pill-todo';
  if (status === 'IN_PROGRESS') return 'pill pill-progress';
  return 'pill pill-done';
}

function priorityPill(priority) {
  const c = { LOW: 'pill-priority-low', MEDIUM: 'pill-priority-medium', HIGH: 'pill-priority-high', URGENT: 'pill-priority-urgent' };
  return `pill ${c[priority] || c.MEDIUM}`;
}

function isOverdue(dueDate) {
  if (!dueDate) return false;
  return new Date(dueDate) < new Date();
}

function formatDue(dueDate) {
  if (!dueDate) return '';
  const d = new Date(dueDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dDay = new Date(d);
  dDay.setHours(0, 0, 0, 0);
  if (dDay.getTime() === today.getTime()) return 'Today';
  if (dDay.getTime() === tomorrow.getTime()) return 'Tomorrow';
  return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: d.getFullYear() !== today.getFullYear() ? 'numeric' : undefined });
}

function getFirstName(email) {
  if (!email) return 'there';
  const part = email.split('@')[0] || '';
  return part.charAt(0).toUpperCase() + part.slice(1).toLowerCase();
}

export default function Dashboard() {
  const [tasks, setTasks] = useState([]);
  const [stats, setStats] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [tagsFilter, setTagsFilter] = useState('');
  const [sortBy, setSortBy] = useState('-createdAt');
  const [myTasksOnly, setMyTasksOnly] = useState(false);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [slideoverTaskId, setSlideoverTaskId] = useState(null);
  const [exporting, setExporting] = useState(false);
  const [viewMode, setViewMode] = useState('list'); // list | board | calendar
  const [quickFilter, setQuickFilter] = useState('');
  const [focusMode, setFocusMode] = useState(false);
  const [quickAddTitle, setQuickAddTitle] = useState('');
  const [quickAdding, setQuickAdding] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState(new Set());
  const [bulkStatus, setBulkStatus] = useState('');
  const [bulkPriority, setBulkPriority] = useState('');
  const [bulkUpdating, setBulkUpdating] = useState(false);
  const { user, orgId } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const addToast = useToast();
  const canCreateTask = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canManageTasks = user?.role === 'ADMIN' || user?.role === 'MANAGER';

  const query = useMemo(() => {
    const p = new URLSearchParams();
    if (statusFilter) p.set('status', statusFilter);
    if (priorityFilter || quickFilter === 'urgent') p.set('priority', quickFilter === 'urgent' ? 'URGENT' : priorityFilter);
    if (tagsFilter.trim()) p.set('tags', tagsFilter.split(',').map((t) => t.trim()).filter(Boolean).join(','));
    if (sortBy) p.set('sort', sortBy);
    if (myTasksOnly || quickFilter === 'my') p.set('assignedTo', 'me');
    return p.toString();
  }, [statusFilter, priorityFilter, tagsFilter, sortBy, myTasksOnly, quickFilter]);

  const handleQuickAdd = async (e) => {
    e.preventDefault();
    const title = quickAddTitle.trim();
    if (!title || !canCreateTask) return;
    setQuickAdding(true);
    try {
      await api.post('/tasks', { title, status: 'TODO' });
      setQuickAddTitle('');
      fetchTasks();
      fetchStats();
      addToast('Task created');
    } catch {
      addToast('Failed to create task', 'error');
    } finally {
      setQuickAdding(false);
    }
  };

  const fetchTasks = () => {
    const url = query ? `/tasks?${query}` : '/tasks';
    api.get(url).then((res) => setTasks(res.data)).catch(() => {}).finally(() => setLoading(false));
  };

  const fetchStats = () => {
    api.get('/tasks/stats/summary').then((res) => setStats(res.data)).catch(() => {});
  };

  useEffect(() => {
    if (!orgId) return;
    setLoading(true);
    fetchTasks();
    fetchStats();
  }, [orgId, query]);

  useEffect(() => {
    const taskId = location.state?.openTask;
    if (taskId) {
      setSlideoverTaskId(String(taskId));
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [location.state?.openTask, navigate]);

  useEffect(() => {
    if (!orgId || !user?.id) return;
    const token = getAccessToken();
    const socket = getSocket(orgId, token);
    const onUpdate = (payload) => {
      fetchTasks();
      fetchStats();
      setRecentActivity((prev) => [{ id: Date.now(), ...payload, at: new Date() }, ...prev].slice(0, 8));
    };
    socket.on('task:update', onUpdate);
    return () => {
      socket.off('task:update', onUpdate);
    };
  }, [orgId, user?.id]);

  const handleBulkUpdate = () => {
    if (selectedTasks.size === 0) return;
    const updates = {};
    if (bulkStatus) updates.status = bulkStatus;
    if (bulkPriority) updates.priority = bulkPriority;
    if (Object.keys(updates).length === 0) return;
    const count = selectedTasks.size;
    setBulkUpdating(true);
    const taskIds = [...selectedTasks].map(String);
    api
      .patch('/tasks/bulk', { taskIds, updates })
      .then(() => {
        fetchTasks();
        fetchStats();
        setSelectedTasks(new Set());
        setBulkStatus('');
        setBulkPriority('');
        addToast(`${count} task(s) updated`);
      })
      .catch((err) => addToast(err.response?.data?.error || 'Bulk update failed', 'error'))
      .finally(() => setBulkUpdating(false));
  };

  const toggleSelect = (id) => {
    setSelectedTasks((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => setSelectedTasks(new Set(filteredTasks.map((t) => t._id)));
  const selectNone = () => setSelectedTasks(new Set());

  const handleExportCsv = () => {
    setExporting(true);
    api.get('/tasks/export?format=csv', { responseType: 'blob' })
      .then((res) => {
        const url = URL.createObjectURL(res.data);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'tasks.csv';
        a.click();
        URL.revokeObjectURL(url);
        addToast('Export downloaded');
      })
      .catch(() => addToast('Export failed', 'error'))
      .finally(() => setExporting(false));
  };


  const filteredTasks = useMemo(() => {
    let list = tasks;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      list = list.filter((t) => t.title.toLowerCase().includes(q) || (t.description && t.description.toLowerCase().includes(q)));
    }
    if (quickFilter === 'overdue') {
      const now = new Date();
      list = list.filter((t) => t.dueDate && new Date(t.dueDate) < now && t.status !== 'DONE');
    }
    if (quickFilter === 'today') {
      const now = new Date();
      now.setHours(0, 0, 0, 0);
      const tomorrow = new Date(now);
      tomorrow.setDate(tomorrow.getDate() + 1);
      list = list.filter((t) => t.dueDate && (() => {
        const d = new Date(t.dueDate);
        d.setHours(0, 0, 0, 0);
        return d >= now && d < tomorrow;
      })());
    }
    if (quickFilter === 'dueWeek') {
      const now = new Date();
      const weekEnd = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      list = list.filter((t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= weekEnd);
    }
    return list;
  }, [tasks, search, quickFilter]);

  const upcomingTasks = useMemo(() => {
    const now = new Date();
    const in7 = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    return tasks
      .filter((t) => t.dueDate && new Date(t.dueDate) >= now && new Date(t.dueDate) <= in7 && t.status !== 'DONE')
      .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
      .slice(0, 5);
  }, [tasks]);

  if (!user) return null;

  return (
    <AppLayout onOpenSlideover={setSlideoverTaskId} hideSidebar={focusMode}>
      <div className={`app-main ${focusMode ? 'focus-mode' : ''}`}>
        <h1 className="dashboard-welcome">Welcome back, {getFirstName(user.email)}</h1>
        <p className="dashboard-welcome-sub">Here’s what’s happening with your tasks.</p>
        <OrgIdNote orgId={orgId} />

        {stats && !focusMode && (
          <div className="dashboard-stats">
            <div className="stat-card glass stat-card-progress">
              <div className="stat-progress-ring" style={{ '--p': Math.round(((stats.byStatus?.DONE ?? 0) / Math.max(stats.total, 1)) * 100) }}>
                <span className="stat-value">{stats.total}</span>
              </div>
              <span className="stat-label">Total</span>
            </div>
            <div className="stat-card glass">
              <span className="stat-value stat-value-accent">{stats.myTasks}</span>
              <span className="stat-label">My tasks</span>
            </div>
            <div className="stat-card glass">
              <span className="stat-value">{stats.byStatus?.TODO ?? 0}</span>
              <span className="stat-label">To do</span>
            </div>
            <div className="stat-card glass">
              <span className="stat-value">{stats.byStatus?.IN_PROGRESS ?? 0}</span>
              <span className="stat-label">In progress</span>
            </div>
            <div className="stat-card glass">
              <span className="stat-value stat-value-done">{stats.byStatus?.DONE ?? 0}</span>
              <span className="stat-label">Done</span>
            </div>
            {stats.overdue > 0 && (
              <div className="stat-card glass stat-overdue">
                <span className="stat-value">{stats.overdue}</span>
                <span className="stat-label">Overdue</span>
              </div>
            )}
          </div>
        )}

        {loading && (
          <>
            <div className="dashboard-stats">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="skeleton skeleton-stat" />
              ))}
            </div>
            <div className="dashboard-section-title">Tasks</div>
            <div className="dashboard-list">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className={`skeleton skeleton-card`} style={{ width: `${94 - i * 2}%` }} />
              ))}
            </div>
          </>
        )}

        {!loading && (
          <>
            {canCreateTask && (
              <form onSubmit={handleQuickAdd} className="quick-add-form glass">
                <input
                  type="text"
                  placeholder="Quick add task…"
                  value={quickAddTitle}
                  onChange={(e) => setQuickAddTitle(e.target.value)}
                  disabled={quickAdding}
                  className="input-glass quick-add-input"
                />
                <button type="submit" disabled={!quickAddTitle.trim() || quickAdding} className="btn-primary btn-sm">
                  {quickAdding ? '…' : 'Add'}
                </button>
              </form>
            )}
            {upcomingTasks.length > 0 && !focusMode && (
              <>
                <div className="dashboard-section-title">Upcoming deadlines</div>
                <div className="dashboard-upcoming">
                  {upcomingTasks.map((t) => (
                    <div key={t._id} className="dashboard-upcoming-item">
                      <Link to={`/tasks/${t._id}`}>{t.title}</Link>
                      <span className="dashboard-upcoming-date">{formatDue(t.dueDate)}</span>
                    </div>
                  ))}
                </div>
              </>
            )}

            <div className="quick-filters">
              {[
                { id: '', label: 'All' },
                { id: 'my', label: 'My tasks' },
                { id: 'today', label: 'Today' },
                { id: 'urgent', label: 'Urgent' },
                { id: 'dueWeek', label: 'Due this week' },
                { id: 'overdue', label: 'Overdue' },
              ].map((f) => (
                <button
                  key={f.id || 'all'}
                  type="button"
                  className={`quick-filter-chip ${quickFilter === f.id ? 'active' : ''}`}
                  onClick={() => setQuickFilter(f.id)}
                >
                  {f.label}
                </button>
              ))}
            </div>
            <div className="dashboard-toolbar-row">
              <button
                type="button"
                className={`view-switcher-btn${focusMode ? ' active' : ''}`}
                onClick={() => setFocusMode((f) => !f)}
                title={focusMode ? 'Exit focus mode' : 'Focus mode'}
              >
                {focusMode ? '◎' : '○'}
              </button>
              <div className="dashboard-view-switcher">
                {['list', 'board', 'calendar'].map((v) => (
                  <button
                    key={v}
                    type="button"
                    className={`view-switcher-btn${viewMode === v ? ' active' : ''}`}
                    onClick={() => setViewMode(v)}
                  >
                    {v === 'list' ? '≡' : v === 'board' ? '⊞' : '▦'}
                  </button>
                ))}
              </div>
              <span className="dashboard-section-title">Tasks</span>
            </div>
            <div className="dashboard-toolbar">
              <input
                type="search"
                placeholder="Search tasks…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-glass dashboard-search"
              />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="input-glass dashboard-select"
              >
                <option value="">All statuses</option>
                {STATUSES.map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
              <select
                value={priorityFilter}
                onChange={(e) => setPriorityFilter(e.target.value)}
                className="input-glass dashboard-select"
              >
                <option value="">All priorities</option>
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>{p}</option>
                ))}
              </select>
              <input
                type="text"
                placeholder="Tags (comma-separated)"
                value={tagsFilter}
                onChange={(e) => setTagsFilter(e.target.value)}
                className="input-glass dashboard-select dashboard-tags-input"
              />
              <select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="input-glass dashboard-select">
                <option value="-createdAt">Newest first</option>
                <option value="dueDate">Due date (earliest)</option>
                <option value="-dueDate">Due date (latest)</option>
              </select>
              <label className="dashboard-mytasks">
                <input type="checkbox" checked={myTasksOnly} onChange={(e) => setMyTasksOnly(e.target.checked)} />
                <span>My tasks</span>
              </label>
              <button type="button" onClick={handleExportCsv} disabled={exporting} className="btn-ghost dashboard-export">
              {exporting ? 'Exporting…' : 'Export CSV'}
            </button>
              {canCreateTask && (
                <Link to="/tasks/new" className="btn-primary dashboard-new">New task</Link>
              )}
            </div>

            {viewMode === 'board' && (
              <KanbanView
                tasks={filteredTasks}
                onCardClick={setSlideoverTaskId}
                onStatusChange={
                  (id, status) =>
                    api.patch(`/tasks/${id}`, { status }).then(() => { fetchTasks(); fetchStats(); addToast('Status updated'); }).catch(() => addToast('Failed to update', 'error'))
                }
              />
            )}
            {viewMode === 'calendar' && (
              <CalendarView tasks={filteredTasks} onCardClick={setSlideoverTaskId} />
            )}
            {viewMode === 'list' && canManageTasks && filteredTasks.length > 0 && (
              <div className="bulk-toolbar glass">
                <span className="bulk-count">
                  {selectedTasks.size > 0 ? `${selectedTasks.size} selected` : 'Select tasks'}
                </span>
                {selectedTasks.size > 0 ? (
                  <>
                    <select value={bulkStatus} onChange={(e) => setBulkStatus(e.target.value)} className="input-glass bulk-select">
                      <option value="">Status…</option>
                      {STATUSES.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                    <select value={bulkPriority} onChange={(e) => setBulkPriority(e.target.value)} className="input-glass bulk-select">
                      <option value="">Priority…</option>
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>{p}</option>
                      ))}
                    </select>
                    <button type="button" onClick={handleBulkUpdate} disabled={(!bulkStatus && !bulkPriority) || bulkUpdating} className="btn-primary btn-sm">
                      {bulkUpdating ? 'Updating…' : 'Apply'}
                    </button>
                    <button type="button" onClick={selectNone} className="btn-ghost btn-sm">Clear</button>
                  </>
                ) : (
                  <>
                    <button type="button" onClick={selectAll} className="btn-ghost btn-sm">Select all</button>
                  </>
                )}
              </div>
            )}
            {viewMode === 'list' && (
            <ul className="dashboard-list">
              {filteredTasks.length === 0 && (
                <li className="dashboard-empty glass card-premium">
                  <div className="empty-illus">
                    <div className="empty-illus-inner">✓</div>
                  </div>
                  <span>{search ? 'No tasks match your search.' : 'No tasks yet.'}</span>
                  {canCreateTask && !search && (
                    <Link to="/tasks/new" className="dashboard-empty-cta">Create your first task</Link>
                  )}
                  {!canCreateTask && !search && (
                    <span className="dashboard-empty-hint">Ask your manager or admin to create tasks.</span>
                  )}
                </li>
              )}
              {filteredTasks.map((t) => (
                <li key={t._id} className="dashboard-list-item">
                  {canManageTasks && (
                    <input
                      type="checkbox"
                      checked={selectedTasks.has(t._id)}
                      onChange={() => toggleSelect(t._id)}
                      onClick={(e) => e.stopPropagation()}
                      className="dashboard-card-checkbox"
                    />
                  )}
                  <button
                    type="button"
                    onClick={() => setSlideoverTaskId(t._id)}
                    className={`dashboard-card glass card-hover card-premium dashboard-card-btn ${isOverdue(t.dueDate) ? 'card-overdue' : ''}`}
                    data-status={t.status}
                  >
                    <span className="dashboard-card-title">{t.title}</span>
                    <span className="dashboard-card-meta">
                      <span className={statusPill(t.status)}>{t.status}</span>
                      <span className={priorityPill(t.priority)}>{t.priority}</span>
                      { (() => {
                        const arr = Array.isArray(t.assignedTo) ? t.assignedTo : t.assignedTo ? [t.assignedTo] : [];
                        const emails = arr.map((a) => a?.email).filter(Boolean);
                        return emails.length > 0 ? <span className="dashboard-card-assignee">{emails.join(', ')}</span> : null;
                      })()}
                      {t.dueDate && <span className="dashboard-card-due">{formatDue(t.dueDate)}</span>}
                      {isOverdue(t.dueDate) && <span className="pill pill-overdue">Overdue</span>}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
            )}
          </>
        )}

        {canCreateTask && (
          <Link to="/tasks/new" className="fab" title="New task" aria-label="New task">
            +
          </Link>
        )}

        {slideoverTaskId && (
          <TaskDetailSlideover
            taskId={slideoverTaskId}
            onClose={() => setSlideoverTaskId(null)}
            onRefresh={() => { fetchTasks(); fetchStats(); }}
          />
        )}
      </div>
    </AppLayout>
  );
}
