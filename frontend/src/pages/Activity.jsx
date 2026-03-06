import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../components/AppLayout';

export default function Activity() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/notifications').then((r) => setNotifications(r.data.list || [])).catch(() => {}).finally(() => setLoading(false));
  }, []);

  const markRead = (id) => {
    api.patch(`/notifications/${id}/read`).then(() => setNotifications((prev) => prev.map((n) => (n._id === id ? { ...n, read: true } : n)))).catch(() => {});
  };

  const markAllRead = () => {
    api.post('/notifications/read-all').then(() => setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))).catch(() => {});
  };

  return (
    <AppLayout>
      <div className="app-main">
        <div className="activity-page">
          <h1 className="activity-title">Activity & Messages</h1>
          <p className="activity-subtitle">Your notifications, comments, and task updates in one place.</p>
          {loading ? (
            <div className="activity-loading">
              <div className="skeleton" style={{ height: 60, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 60, marginBottom: 12 }} />
              <div className="skeleton" style={{ height: 60 }} />
            </div>
          ) : (
            <>
              {notifications.length > 0 && (
                <div className="activity-toolbar">
                  <button type="button" className="btn-ghost btn-sm" onClick={markAllRead}>Mark all read</button>
                </div>
              )}
              <ul className="activity-list">
                {notifications.length === 0 ? (
                  <li className="activity-empty glass card-premium">
                    <span className="activity-empty-icon">◎</span>
                    <p>No activity yet</p>
                    <span className="activity-empty-hint">You’ll see task updates, comments, and assignments here.</span>
                  </li>
                ) : (
                  notifications.map((n) => (
                    <li key={n._id} className={`activity-item glass card-premium ${n.read ? '' : 'activity-unread'}`}>
                      <button
                        type="button"
                        className="activity-item-btn"
                        onClick={() => markRead(n._id)}
                      >
                        <span className="activity-type">{n.type}</span>
                        <span className="activity-title-text">{n.title}</span>
                        <span className="activity-date">{new Date(n.createdAt).toLocaleString()}</span>
                      </button>
                      {n.taskId && (
                        <Link to={`/tasks/${n.taskId._id || n.taskId}`} className="activity-task-link">View task →</Link>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </>
          )}
        </div>
      </div>
    </AppLayout>
  );
}
