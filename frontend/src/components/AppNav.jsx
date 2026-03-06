import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { disconnectSocket } from '../services/socket';
import api from '../services/api';

const NavIcon = ({ name }) => {
  const icons = {
    dashboard: '◉',
    team: '◇',
    profile: '◆',
    activity: '◎',
    notif: '◆',
  };
  return <span className="nav-icon" aria-hidden>{icons[name] || '•'}</span>;
};

export default function AppNav({ onOpenSlideover }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState({ list: [], unreadCount: 0 });
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const fetchNotifs = () => {
    api.get('/notifications').then((r) => setNotifications({ list: r.data.list || [], unreadCount: r.data.unreadCount || 0 })).catch(() => {});
  };

  useEffect(() => {
    if (user?.id) fetchNotifs();
  }, [user?.id]);

  const handleLogout = () => {
    logout();
    disconnectSocket();
    navigate('/');
  };

  if (!user) return null;

  return (
    <header className="app-header glass card-premium nav-premium">
      <Link to="/dashboard" className="app-logo">
        <span className="app-logo-text">Taskflow</span>
      </Link>
      <nav className="app-nav">
        <NavLink to="/dashboard" className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`} end>
          <NavIcon name="dashboard" />
          <span>Dashboard</span>
        </NavLink>
        {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
          <NavLink to="/team" className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}>
            <NavIcon name="team" />
            <span>Team</span>
          </NavLink>
        )}
        <NavLink to="/activity" className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}>
          <NavIcon name="activity" />
          <span>Activity</span>
        </NavLink>
        <NavLink to="/profile" className={({ isActive }) => `app-nav-link${isActive ? ' active' : ''}`}>
          <NavIcon name="profile" />
          <span>Profile</span>
        </NavLink>
        <div className="nav-notif-wrap">
          <button
            type="button"
            className="nav-notif-btn btn-ghost btn-icon"
            onClick={() => { setNotifOpen((o) => !o); if (!notifOpen) fetchNotifs(); }}
            title="Notifications"
            aria-label="Notifications"
          >
            {notifications.unreadCount > 0 && <span className="nav-notif-badge">{notifications.unreadCount}</span>}
            <NavIcon name="notif" />
          </button>
          {notifOpen && (
            <>
              <div className="nav-notif-backdrop" onClick={() => setNotifOpen(false)} aria-hidden />
              <div className="nav-notif-dropdown glass card-premium">
                <div className="nav-notif-header">
                  <span className="nav-notif-title">Notifications</span>
                  {notifications.unreadCount > 0 && (
                    <button type="button" className="btn-ghost btn-sm" onClick={() => api.post('/notifications/read-all').then(() => fetchNotifs()).catch(() => {})}>Mark all read</button>
                  )}
                </div>
                {!notifications.list?.length ? (
                  <p className="nav-notif-empty">No notifications</p>
                ) : (
                  <ul className="nav-notif-list">
                    {notifications.list.map((n) => (
                      <li key={n._id} className={n.read ? '' : 'nav-notif-unread'}>
                        <button
                          type="button"
                          className="nav-notif-item-btn"
                          onClick={() => {
                            api.patch(`/notifications/${n._id}/read`).then(() => fetchNotifs()).catch(() => {});
                            const tid = n.taskId?._id || n.taskId;
                            if (tid) {
                              if (onOpenSlideover) onOpenSlideover(tid);
                              else navigate(`/tasks/${tid}`);
                            }
                            setNotifOpen(false);
                          }}
                        >
                          <span className="nav-notif-event">{n.type}</span>
                          <span className="nav-notif-task">{n.title}</span>
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </>
          )}
        </div>
        <div className="nav-user-wrap">
          <span className="app-user">
            <span className="app-user-email">{user.email}</span>
            <span className="pill pill-role app-user-role">{user.role}</span>
          </span>
          <button type="button" onClick={handleLogout} className="btn-ghost nav-logout">Logout</button>
        </div>
      </nav>
    </header>
  );
}
