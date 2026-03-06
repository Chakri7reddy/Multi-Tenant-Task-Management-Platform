import { useState, useEffect } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { disconnectSocket } from '../services/socket';
import api from '../services/api';

const NavItem = ({ to, icon, label, end }) => (
  <NavLink to={to} end={end} className={({ isActive }) => `sidebar-link${isActive ? ' active' : ''}`}>
    <span className="sidebar-icon">{icon}</span>
    <span>{label}</span>
  </NavLink>
);

export default function AppSidebar({ onOpenSlideover }) {
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState({ list: [], unreadCount: 0 });
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();

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
    <aside className="sidebar">
      <div className="sidebar-brand">
        <Link to="/dashboard" className="sidebar-logo">
          <span className="sidebar-logo-mark">T</span>
          <span className="sidebar-logo-text">Taskflow</span>
        </Link>
      </div>
      <nav className="sidebar-nav">
        <NavItem to="/dashboard" icon="◉" label="Dashboard" end />
        {(user.role === 'ADMIN' || user.role === 'MANAGER') && (
          <NavItem to="/team" icon="◇" label="Team" />
        )}
        <NavItem to="/activity" icon="◎" label="Activity" />
        <NavItem to="/profile" icon="◆" label="Profile" />
      </nav>
      <div className="sidebar-tools">
        <button type="button" className="sidebar-theme-btn" onClick={toggle} title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'} aria-label="Toggle theme">
          <span className="sidebar-theme-icon">{theme === 'dark' ? '☀' : '☽'}</span>
          <span>{theme === 'dark' ? 'Light' : 'Dark'}</span>
        </button>
        <div className="sidebar-kbd-hint">
          <kbd>⌘</kbd><kbd>K</kbd> Quick actions
        </div>
      </div>
      <div className="sidebar-bottom">
        <div className="sidebar-notif-wrap">
          <button
            type="button"
            className="sidebar-notif-btn"
            onClick={() => { setNotifOpen((o) => !o); if (!notifOpen) fetchNotifs(); }}
            title="Notifications"
            aria-label="Notifications"
          >
            <span className="sidebar-notif-icon">◆</span>
            {notifications.unreadCount > 0 && <span className="sidebar-notif-badge">{notifications.unreadCount}</span>}
          </button>
          {notifOpen && (
            <>
              <div className="sidebar-notif-backdrop" onClick={() => setNotifOpen(false)} aria-hidden />
              <div className="sidebar-notif-dropdown glass">
                <div className="sidebar-notif-header">
                  <span>Notifications</span>
                  {notifications.unreadCount > 0 && (
                    <button type="button" className="btn-ghost btn-sm" onClick={() => api.post('/notifications/read-all').then(() => fetchNotifs()).catch(() => {})}>Mark all read</button>
                  )}
                </div>
                {!notifications.list?.length ? (
                  <p className="sidebar-notif-empty">No notifications</p>
                ) : (
                  <ul className="sidebar-notif-list">
                    {notifications.list.map((n) => (
                      <li key={n._id} className={n.read ? '' : 'nav-notif-unread'}>
                        <button
                          type="button"
                          className="nav-notif-item-btn"
                          onClick={() => {
                            api.patch(`/notifications/${n._id}/read`).then(() => fetchNotifs()).catch(() => {});
                            const tid = n.taskId?._id || n.taskId;
                            if (tid) {
                              if (onOpenSlideover) onOpenSlideover(String(tid));
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
        <div className="sidebar-user">
          <span className="sidebar-user-email">{user.email}</span>
          <span className="pill pill-role sidebar-user-role">{user.role}</span>
        </div>
        <button type="button" onClick={handleLogout} className="sidebar-logout btn-ghost">Logout</button>
      </div>
    </aside>
  );
}
