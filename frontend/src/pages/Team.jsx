import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import AppLayout from '../components/AppLayout';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const ROLES = [
  { value: 'USER', label: 'Member' },
  { value: 'MANAGER', label: 'Manager' },
  { value: 'ADMIN', label: 'Admin' },
];

export default function Team() {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [form, setForm] = useState({ email: '', password: '', role: 'USER' });
  const [submitting, setSubmitting] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();
  const addToast = useToast();

  const isAdmin = user?.role === 'ADMIN';
  const canViewTeam = isAdmin || user?.role === 'MANAGER';

  const fetchMembers = () => {
    api
      .get('/users')
      .then((res) => setMembers(res.data))
      .catch((err) => setError(err.response?.data?.error || 'Failed to load team'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!user) return;
    if (!canViewTeam) {
      navigate('/dashboard', { replace: true });
      return;
    }
    fetchMembers();
  }, [user, canViewTeam, navigate]);

  const handleCreateMember = (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (!form.email.trim() || !form.password) {
      setError('Email and password are required.');
      return;
    }
    setSubmitting(true);
    api
      .post('/users', {
        email: form.email.trim(),
        password: form.password,
        role: form.role,
      })
      .then(() => {
        setSuccess(`Added ${form.email} as ${form.role}.`);
        addToast(`Added ${form.email} as ${form.role}`);
        setForm({ email: '', password: '', role: 'USER' });
        fetchMembers();
        window.setTimeout(() => setSuccess(''), 4000);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to add team member.');
      })
      .finally(() => setSubmitting(false));
  };

  if (!user) return null;
  if (!canViewTeam) return null;

  return (
    <AppLayout>
      <div className="app-main team-main">
        <h1 className="team-title">Team</h1>
        <p className="team-hint">
          Members sign in with email, password, and your org ID from the dashboard.
        </p>

        {isAdmin && (
          <form onSubmit={handleCreateMember} className="team-form glass">
            <h2 className="team-form-title">Add member</h2>
            <div className="team-form-row">
              <input
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
                className="input-glass team-input"
                autoComplete="off"
              />
              <input
                type="password"
                placeholder="Password"
                value={form.password}
                onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
                className="input-glass team-input"
                autoComplete="new-password"
              />
              <select
                value={form.role}
                onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
                className="input-glass team-select"
              >
                {ROLES.map((r) => (
                  <option key={r.value} value={r.value}>{r.label}</option>
                ))}
              </select>
              <button type="submit" disabled={submitting} className="btn-primary">
                {submitting ? 'Adding…' : 'Add'}
              </button>
            </div>
          </form>
        )}

        {error && <p className="team-msg team-error">{error}</p>}
        {success && <p className="team-msg team-success" role="status">{success}</p>}

        {loading ? (
          <p className="team-loading">Loading team…</p>
        ) : (
          <ul className="team-list">
            {members.length === 0 && (
              <li className="team-empty glass">No members yet.</li>
            )}
            {members.map((m) => (
              <li key={m._id} className="team-item glass card-hover">
                <span className="team-item-email">{m.email}</span>
                <span className={`pill pill-role`}>{m.role}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </AppLayout>
  );
}
