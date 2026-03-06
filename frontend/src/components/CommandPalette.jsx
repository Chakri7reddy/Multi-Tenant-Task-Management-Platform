import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';

const ACTIONS = [
  { id: 'go-dashboard', label: 'Go to Dashboard', path: '/dashboard', icon: '◉' },
  { id: 'go-team', label: 'Go to Team', path: '/team', icon: '◇', roles: ['ADMIN', 'MANAGER'] },
  { id: 'go-activity', label: 'Go to Activity', path: '/activity', icon: '◎' },
  { id: 'go-profile', label: 'Go to Profile', path: '/profile', icon: '◆' },
  { id: 'new-task', label: 'Create new task', path: '/tasks/new', icon: '+', roles: ['ADMIN', 'MANAGER'] },
];

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState(0);
  const [tasks, setTasks] = useState([]);
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    if (!open || !query.trim()) return;
    const t = setTimeout(() => {
      api.get('/tasks').then((r) => {
        const q = query.trim().toLowerCase();
        const list = (r.data || []).filter((task) =>
          (task.title || '').toLowerCase().includes(q) || (task.description || '').toLowerCase().includes(q)
        );
        setTasks(list.slice(0, 8));
      }).catch(() => setTasks([]));
    }, 200);
    return () => clearTimeout(t);
  }, [open, query]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    const navList = ACTIONS.filter((a) => {
      if (a.roles && !a.roles.includes(user?.role)) return false;
      if (!q) return true;
      return a.label.toLowerCase().includes(q);
    });
    const taskItems = tasks.map((t) => ({ id: `task-${t._id}`, label: t.title, path: '/dashboard', taskId: t._id, icon: '▪' }));
    return [...navList, ...taskItems];
  }, [query, user?.role, tasks]);

  useEffect(() => {
    const onKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen((o) => !o);
        setQuery('');
        setSelected(0);
        setTasks([]);
      }
      if (!open) return;
      if (e.key === 'Escape') setOpen(false);
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelected((s) => (s < filtered.length - 1 ? s + 1 : 0));
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelected((s) => (s > 0 ? s - 1 : filtered.length - 1));
      }
      if (e.key === 'Enter' && filtered[selected]) {
        e.preventDefault();
        const a = filtered[selected];
        if (a.taskId) {
          navigate('/dashboard', { state: { openTask: String(a.taskId) } });
        } else if (a.path) {
          navigate(a.path);
        }
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, filtered, selected, navigate]);

  useEffect(() => {
    setSelected(0);
  }, [query]);

  if (!user) return null;
  if (!open) return null;

  return (
    <>
      <div className="command-backdrop" onClick={() => setOpen(false)} aria-hidden />
      <div className="command-palette glass" role="dialog" aria-label="Command palette">
        <div className="command-input-wrap">
          <span className="command-icon">⌘</span>
          <input
            type="text"
            placeholder="Search or run a command…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            className="command-input"
          />
        </div>
        <ul className="command-list">
          {filtered.length === 0 ? (
            <li className="command-empty">No results</li>
          ) : (
            filtered.map((a, i) => (
              <li key={a.id}>
                <button
                  type="button"
                  className={`command-item ${i === selected ? 'selected' : ''}`}
                  onClick={() => {
                  if (a.taskId) navigate('/dashboard', { state: { openTask: String(a.taskId) } });
                  else if (a.path) navigate(a.path);
                  setOpen(false);
                }}
                  onMouseEnter={() => setSelected(i)}
                >
                  <span className="command-item-icon">{a.icon}</span>
                  <span>{a.label}</span>
                </button>
              </li>
            ))
          )}
        </ul>
        <div className="command-footer">
          <span>↑↓ Navigate</span>
          <span>↵ Select</span>
          <span>Esc Close</span>
        </div>
      </div>
    </>
  );
}
