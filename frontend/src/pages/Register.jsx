import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [orgName, setOrgName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { registerDone } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/register', { orgName, email, password });
      registerDone(data);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.error || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <h1 className="auth-hero-logo">Taskflow</h1>
        <p className="auth-hero-tagline">Create your organization and invite your team. You’ll be the first admin.</p>
        <ul className="auth-features">
          <li>Create tasks and assign to teammates</li>
          <li>Real-time sync and notifications</li>
          <li>Priority levels and due dates</li>
          <li>Full control with roles & permissions</li>
        </ul>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-card glass-strong">
          <div className="auth-brand">
            <span className="auth-logo">Create organization</span>
            <span className="auth-tagline">Get started in seconds</span>
          </div>
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-field-label" htmlFor="register-orgName">Organization name</label>
            <input
              id="register-orgName"
              type="text"
              placeholder="My Company"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              required
              className="input-glass"
            />
            <label className="auth-field-label" htmlFor="register-email">Admin email</label>
            <input
              id="register-email"
              type="email"
              placeholder="admin@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-glass"
              autoComplete="email"
            />
            <label className="auth-field-label" htmlFor="register-password">Password</label>
            <input
              id="register-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-glass"
              autoComplete="new-password"
            />
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary auth-submit">
              {loading ? 'Creating…' : 'Create organization'}
            </button>
          </form>
          <p className="auth-footer">
            Already have an org? <Link to="/login">Sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
