import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [orgId, setOrgId] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showLookup, setShowLookup] = useState(false);
  const [lookupEmail, setLookupEmail] = useState('');
  const [lookupPassword, setLookupPassword] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [foundOrgs, setFoundOrgs] = useState(null);
  const { login, user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = location.state?.from?.pathname;
  const redirectTo = from && from !== '/' && from !== '/login' ? from : '/dashboard';

  useEffect(() => {
    if (user) navigate(redirectTo, { replace: true });
  }, [user, redirectTo, navigate]);

  if (user) return null;

  const handleLookup = async (e) => {
    e.preventDefault();
    setLookupError('');
    setFoundOrgs(null);
    setLookupLoading(true);
    try {
      const { data } = await api.post('/auth/lookup-org', { email: lookupEmail, password: lookupPassword });
      setFoundOrgs(data.orgs);
    } catch (err) {
      setLookupError(err.response?.data?.error || 'Invalid email or password');
    } finally {
      setLookupLoading(false);
    }
  };

  const useOrgId = (id) => {
    setOrgId(id);
    setShowLookup(false);
    setFoundOrgs(null);
    setLookupError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { data } = await api.post('/auth/login', { email, password, orgId });
      login(data);
      navigate(redirectTo, { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <h1 className="auth-hero-logo">Taskflow</h1>
        <p className="auth-hero-tagline">Collaborate on tasks, track progress, and ship faster with your team.</p>
        <ul className="auth-features">
          <li>Real-time updates across all devices</li>
          <li>Roles & permissions for teams</li>
          <li>Priorities, due dates & assignments</li>
          <li>One place for your whole org</li>
        </ul>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-card glass-strong">
          <div className="auth-brand">
            <span className="auth-logo">Sign in</span>
            <span className="auth-tagline">Welcome back to your workspace</span>
          </div>
          <form onSubmit={handleSubmit} className="auth-form">
            <label className="auth-field-label" htmlFor="login-orgId">Organization ID</label>
            <input
              id="login-orgId"
              type="text"
              placeholder="24-character ID from your dashboard"
              value={orgId}
              onChange={(e) => setOrgId(e.target.value)}
              required
              className="input-glass"
              autoComplete="off"
              aria-describedby="login-orgId-hint"
            />
            <span id="login-orgId-hint" className="auth-hint">Get this from your admin or the dashboard after first sign-in.</span>
            <label className="auth-field-label" htmlFor="login-email">Email</label>
            <input
              id="login-email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="input-glass"
              autoComplete="email"
            />
            <label className="auth-field-label" htmlFor="login-password">Password</label>
            <input
              id="login-password"
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="input-glass"
              autoComplete="current-password"
            />
            {error && <p className="auth-error">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary auth-submit">
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
          <p className="auth-footer">
            <button type="button" className="auth-footer-link" onClick={() => setShowLookup(true)}>
              Don't remember org ID?
            </button>
            {' · '}
            <Link to="/forgot-password">Forgot password?</Link>
            {' · '}
            No account? <Link to="/register">Create organization</Link>
          </p>
        </div>
      </div>

      {showLookup && (
        <>
          <div className="auth-modal-backdrop" onClick={() => { setShowLookup(false); setFoundOrgs(null); setLookupError(''); }} aria-hidden />
          <div className="auth-modal glass-strong">
            <div className="auth-modal-header">
              <h2 className="auth-modal-title">Find your organization ID</h2>
              <button type="button" className="auth-modal-close" onClick={() => { setShowLookup(false); setFoundOrgs(null); setLookupError(''); }} aria-label="Close">×</button>
            </div>
            <p className="auth-modal-hint">Enter your email and password to retrieve your organization ID.</p>
            {!foundOrgs ? (
              <form onSubmit={handleLookup} className="auth-form">
                <label className="auth-field-label" htmlFor="lookup-email">Email</label>
                <input
                  id="lookup-email"
                  type="email"
                  placeholder="you@example.com"
                  value={lookupEmail}
                  onChange={(e) => setLookupEmail(e.target.value)}
                  required
                  className="input-glass"
                  autoComplete="email"
                />
                <label className="auth-field-label" htmlFor="lookup-password">Password</label>
                <input
                  id="lookup-password"
                  type="password"
                  placeholder="Password"
                  value={lookupPassword}
                  onChange={(e) => setLookupPassword(e.target.value)}
                  required
                  className="input-glass"
                  autoComplete="current-password"
                />
                {lookupError && <p className="auth-error">{lookupError}</p>}
                <button type="submit" disabled={lookupLoading} className="btn-primary auth-submit">
                  {lookupLoading ? 'Looking up…' : 'Get org ID'}
                </button>
              </form>
            ) : (
              <div className="auth-lookup-result">
                <p className="auth-lookup-success">Your organization{foundOrgs.length > 1 ? 's' : ''}:</p>
                {foundOrgs.map((o) => (
                  <div key={o.orgId} className="auth-lookup-org">
                    <code className="auth-lookup-org-id">{o.orgId}</code>
                    <span className="auth-lookup-org-name">{o.orgName}</span>
                    <button type="button" className="btn-primary btn-sm" onClick={() => useOrgId(o.orgId)}>
                      Use this
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
