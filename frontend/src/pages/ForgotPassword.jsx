import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [orgId, setOrgId] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [sent, setSent] = useState(false);
  const [resetUrl, setResetUrl] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    setSent(false);
    setResetUrl('');
    try {
      const { data } = await api.post('/auth/forgot-password', { email, orgId });
      setSent(true);
      if (data.resetUrl) setResetUrl(data.resetUrl);
    } catch (err) {
      setError(err.response?.data?.error || 'Request failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <h1 className="auth-hero-logo">Taskflow</h1>
        <p className="auth-hero-tagline">Reset your password to get back into your workspace.</p>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-card glass-strong">
          <div className="auth-brand">
            <span className="auth-logo">Forgot password</span>
            <span className="auth-tagline">We’ll help you reset it</span>
          </div>
          {!sent ? (
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-field-label" htmlFor="fp-orgId">Organization ID</label>
              <input
                id="fp-orgId"
                type="text"
                placeholder="24-character ID"
                value={orgId}
                onChange={(e) => setOrgId(e.target.value)}
                required
                className="input-glass"
                autoComplete="off"
              />
              <label className="auth-field-label" htmlFor="fp-email">Email</label>
              <input
                id="fp-email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="input-glass"
                autoComplete="email"
              />
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary auth-submit">
                {loading ? 'Sending…' : 'Send reset link'}
              </button>
            </form>
          ) : (
            <div className="auth-form">
              <p className="auth-success">If an account exists for that email in this org, we’ve prepared a reset link.</p>
              {resetUrl && (
                <p className="auth-reset-url">
                  <strong>Reset link (demo):</strong>{' '}
                  <a href={resetUrl} className="auth-reset-link">Open reset page</a>
                </p>
              )}
            </div>
          )}
          <p className="auth-footer">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
