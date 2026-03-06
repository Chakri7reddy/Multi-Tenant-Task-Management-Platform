import { useState, useEffect } from 'react';
import { Link, useParams, useNavigate } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const STATUSES = ['TODO', 'IN_PROGRESS', 'DONE'];
const PRIORITIES = ['LOW', 'MEDIUM', 'HIGH', 'URGENT'];

export default function TaskForm() {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState('TODO');
  const [priority, setPriority] = useState('MEDIUM');
  const [assignedTo, setAssignedTo] = useState([]);
  const [dueDate, setDueDate] = useState('');
  const [tags, setTags] = useState([]);
  const [tagInput, setTagInput] = useState('');
  const [subtasks, setSubtasks] = useState([]);
  const [subtaskInput, setSubtaskInput] = useState('');
  const [templates, setTemplates] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [fetchingTask, setFetchingTask] = useState(isEdit);
  const [taskError, setTaskError] = useState('');
  const [error, setError] = useState('');
  const [canEditThisTask, setCanEditThisTask] = useState(true);
  const { user } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();
  const canAssign = user?.role === 'ADMIN' || user?.role === 'MANAGER';
  const canDeleteTask = user?.role === 'ADMIN';
  const canCreateTask = canAssign;

  useEffect(() => {
    if (!canAssign) return;
    api.get('/users').then((res) => setUsers(res.data)).catch(() => {});
  }, [canAssign]);

  useEffect(() => {
    if (!isEdit && canCreateTask) api.get('/tasks/templates').then((res) => setTemplates(res.data)).catch(() => {});
  }, [isEdit, canCreateTask]);

  // USER cannot create tasks; redirect to dashboard
  useEffect(() => {
    if (!isEdit && user && !canCreateTask) {
      navigate('/dashboard', { replace: true });
    }
  }, [isEdit, user, canCreateTask, navigate]);

  useEffect(() => {
    if (!isEdit) return;
    setFetchingTask(true);
    setTaskError('');
    api
      .get(`/tasks/${id}`)
      .then((res) => {
        const data = res.data;
        setTitle(data.title);
        setDescription(data.description || '');
        setStatus(data.status);
        setPriority(data.priority || 'MEDIUM');
        const arr = Array.isArray(data.assignedTo) ? data.assignedTo : data.assignedTo ? [data.assignedTo] : [];
        setAssignedTo(arr.map((a) => a?._id || a).filter(Boolean));
        setDueDate(data.dueDate ? data.dueDate.slice(0, 16) : '');
        setTags(Array.isArray(data.tags) ? data.tags : []);
        setSubtasks(Array.isArray(data.subtasks) ? data.subtasks.map((s) => ({ title: s.title, done: !!s.done })) : []);
        if (user?.role === 'USER') {
          const arr = Array.isArray(data.assignedTo) ? data.assignedTo : data.assignedTo ? [data.assignedTo] : [];
          const assignedIds = arr.map((a) => String(a?._id || a));
          setCanEditThisTask(assignedIds.includes(String(user?.id)));
        }
      })
      .catch((err) => {
        if (err.response?.status === 404) setTaskError('Task not found.');
        else setTaskError('Failed to load task.');
      })
      .finally(() => setFetchingTask(false));
  }, [id, isEdit, user?.role, user?.id]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const payload = {
        title,
        description: description || '',
        status,
        priority: priority || 'MEDIUM',
        assignedTo: Array.isArray(assignedTo) ? assignedTo.filter(Boolean) : assignedTo ? [assignedTo] : [],
        dueDate: dueDate || null,
        tags: tags.filter(Boolean),
        subtasks: subtasks.map((s) => ({ title: s.title, done: !!s.done })),
      };
      if (isEdit) {
        await api.patch(`/tasks/${id}`, payload);
        addToast('Task updated', 'success');
      } else {
        await api.post('/tasks', payload);
        addToast('Task created', 'success');
      }
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  if (taskError) {
    return (
      <AppLayout>
        <div className="app-main form-main">
          <div className="form-card glass-strong form-error-card">
            <p className="form-card-error">{taskError}</p>
            <Link to="/dashboard" className="btn-primary">Back to dashboard</Link>
          </div>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="app-main form-main">
        <div className="form-card glass-strong">
          <h1 className="form-card-title">{isEdit ? 'Edit task' : 'New task'}</h1>
          {fetchingTask ? (
            <p className="form-loading">Loading task…</p>
          ) : isEdit && !canEditThisTask ? (
            <div className="form-readonly-block">
              <p className="form-card-error">You can only edit tasks assigned to you. This task is assigned to someone else.</p>
              <div className="form-readonly-meta">
                <span><strong>{title}</strong></span>
                <span className={`pill pill-${status === 'DONE' ? 'done' : status === 'IN_PROGRESS' ? 'progress' : 'todo'}`}>{status}</span>
                <span className={`pill pill-priority-${(priority || 'MEDIUM').toLowerCase()}`}>{priority || 'MEDIUM'}</span>
              </div>
              {description && <p className="form-readonly-desc">{description}</p>}
              <button type="button" onClick={() => navigate('/dashboard')} className="btn-ghost">Back to dashboard</button>
            </div>
          ) : (
            <>
              <form onSubmit={handleSubmit} className="form-card-form">
                <label className="form-label" htmlFor="task-title">Title</label>
                <input
                  id="task-title"
                  type="text"
                  placeholder="Task title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                  className="input-glass"
                />
                <label className="form-label" htmlFor="task-desc">Description (optional)</label>
                <textarea
                  id="task-desc"
                  placeholder="Add details…"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="input-glass form-textarea"
                  rows={3}
                />
                <label className="form-label" htmlFor="task-status">Status</label>
                <select id="task-status" value={status} onChange={(e) => setStatus(e.target.value)} className="input-glass">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
                <label className="form-label" htmlFor="task-priority">Priority</label>
                <select id="task-priority" value={priority} onChange={(e) => setPriority(e.target.value)} className="input-glass">
                  {PRIORITIES.map((p) => (
                    <option key={p} value={p}>{p}</option>
                  ))}
                </select>
                {canAssign && (
                  <>
                    <label className="form-label">Assign to</label>
                    <div className="form-assignees">
                      {users.map((u) => (
                        <label key={u._id} className="form-assignee-item">
                          <input
                            type="checkbox"
                            checked={assignedTo.includes(u._id)}
                            onChange={(e) =>
                              setAssignedTo((prev) =>
                                e.target.checked ? [...prev, u._id] : prev.filter((id) => id !== u._id)
                              )
                            }
                          />
                          <span>{u.email}</span>
                        </label>
                      ))}
                      {users.length === 0 && <span className="form-assignee-empty">No team members</span>}
                    </div>
                  </>
                )}
                <label className="form-label">Tags</label>
                <div className="form-tags-wrap">
                  {tags.map((t) => (
                    <span key={t} className="form-tag-pill">
                      {t}
                      <button type="button" onClick={() => setTags((prev) => prev.filter((x) => x !== t))} aria-label="Remove">×</button>
                    </span>
                  ))}
                  <input
                    type="text"
                    placeholder="Add tag…"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.key === 'Enter' || e.key === ',') && tagInput.trim()) {
                        e.preventDefault();
                        setTags((prev) => (prev.includes(tagInput.trim()) ? prev : [...prev, tagInput.trim()]));
                        setTagInput('');
                      }
                    }}
                    className="input-glass form-tag-input"
                  />
                </div>
                <label className="form-label">Subtasks</label>
                <div className="form-subtasks">
                  {subtasks.map((s, i) => (
                    <div key={i} className="form-subtask-row">
                      <input
                        type="checkbox"
                        checked={s.done}
                        onChange={() =>
                          setSubtasks((prev) => prev.map((x, j) => (j === i ? { ...x, done: !x.done } : x)))
                        }
                      />
                      <span className={s.done ? 'form-subtask-done' : ''}>{s.title}</span>
                      <button type="button" onClick={() => setSubtasks((prev) => prev.filter((_, j) => j !== i))} className="form-subtask-remove">×</button>
                    </div>
                  ))}
                  <div className="form-subtask-add">
                    <input
                      type="text"
                      placeholder="Add subtask…"
                      value={subtaskInput}
                      onChange={(e) => setSubtaskInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && subtaskInput.trim()) {
                          e.preventDefault();
                          setSubtasks((prev) => [...prev, { title: subtaskInput.trim(), done: false }]);
                          setSubtaskInput('');
                        }
                      }}
                      className="input-glass"
                    />
                    <button type="button" onClick={() => subtaskInput.trim() && (setSubtasks((prev) => [...prev, { title: subtaskInput.trim(), done: false }]), setSubtaskInput(''))} className="btn-ghost">Add</button>
                  </div>
                </div>
                <label className="form-label" htmlFor="task-due">Due date (optional)</label>
                <div className="form-due-row">
                  <input
                    id="task-due"
                    type="datetime-local"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    className="input-glass"
                  />
                  <div className="form-due-quick">
                    <button type="button" className="btn-ghost btn-sm" onClick={() => {
                      const d = new Date();
                      d.setHours(18, 0, 0, 0);
                      setDueDate(d.toISOString().slice(0, 16));
                    }}>Today</button>
                    <button type="button" className="btn-ghost btn-sm" onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      d.setHours(18, 0, 0, 0);
                      setDueDate(d.toISOString().slice(0, 16));
                    }}>Tomorrow</button>
                    {dueDate && <button type="button" className="btn-ghost btn-sm" onClick={() => setDueDate('')}>Clear</button>}
                  </div>
                </div>
                {!isEdit && templates.length > 0 && (
                  <>
                    <label className="form-label">From template</label>
                    <select
                      className="input-glass"
                      value=""
                      onChange={(e) => {
                        const tid = e.target.value;
                        if (!tid) return;
                        const t = templates.find((x) => x._id === tid);
                        if (t) {
                          setTitle(t.title);
                          setDescription(t.description || '');
                          setPriority(t.priority || 'MEDIUM');
                          setTags(t.tags || []);
                          setSubtasks((t.subtasks || []).map((s) => ({ title: s.title, done: false })));
                        }
                        e.target.value = '';
                      }}
                    >
                      <option value="">Choose template…</option>
                      {templates.map((t) => (
                        <option key={t._id} value={t._id}>{t.name}</option>
                      ))}
                    </select>
                  </>
                )}
                {error && <p className="form-card-error">{error}</p>}
                <div className="form-actions-row">
                  <button type="submit" disabled={loading} className="btn-primary form-card-submit">
                    {loading ? 'Saving…' : 'Save'}
                  </button>
                  {isEdit && canCreateTask && (
                    <button
                      type="button"
                      className="btn-ghost"
                      disabled={loading}
                      onClick={async () => {
                        const name = window.prompt('Template name');
                        if (!name?.trim()) return;
                        setLoading(true);
                        try {
                          await api.post('/tasks/templates', {
                            name: name.trim(),
                            title,
                            description: description || '',
                            priority: priority || 'MEDIUM',
                            tags,
                            subtasks: subtasks.map((s) => ({ title: s.title })),
                          });
                          addToast('Saved as template');
                        } catch (err) {
                          addToast(err.response?.data?.error || 'Failed to save template', 'error');
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      Save as template
                    </button>
                  )}
                  {isEdit && canDeleteTask && (
                    <button
                      type="button"
                      className="btn-danger"
                      disabled={loading}
                      onClick={async () => {
                        if (!window.confirm('Delete this task? This cannot be undone.')) return;
                        setLoading(true);
                        try {
                          await api.delete(`/tasks/${id}`);
                          addToast('Task deleted', 'success');
                          navigate('/dashboard');
                        } catch (err) {
                          setError(err.response?.data?.error || 'Failed to delete');
                        } finally {
                          setLoading(false);
                        }
                      }}
                    >
                      Delete task
                    </button>
                  )}
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
