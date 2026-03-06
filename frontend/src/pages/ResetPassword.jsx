import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../services/api';
import { useToast } from '../context/ToastContext';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const addToast = useToast();

  useEffect(() => {
    if (!token) setError('Missing reset token. Use the link from your email.');
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (!token) return;
    setLoading(true);
    try {
      await api.post('/auth/reset-password', { token, newPassword });
      addToast('Password reset. You can sign in now.');
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.response?.data?.error || 'Reset failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-hero">
        <h1 className="auth-hero-logo">Taskflow</h1>
        <p className="auth-hero-tagline">Set a new password for your account.</p>
      </div>
      <div className="auth-form-wrap">
        <div className="auth-card glass-strong">
          <div className="auth-brand">
            <span className="auth-logo">Reset password</span>
            <span className="auth-tagline">Choose a new password</span>
          </div>
          {!token ? (
            <p className="auth-error">Missing reset token. Use the link from the forgot-password email.</p>
          ) : (
            <form onSubmit={handleSubmit} className="auth-form">
              <label className="auth-field-label" htmlFor="rp-new">New password</label>
              <input
                id="rp-new"
                type="password"
                placeholder="At least 6 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
                minLength={6}
                className="input-glass"
                autoComplete="new-password"
              />
              <label className="auth-field-label" htmlFor="rp-confirm">Confirm new password</label>
              <input
                id="rp-confirm"
                type="password"
                placeholder="Repeat password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                minLength={6}
                className="input-glass"
                autoComplete="new-password"
              />
              {error && <p className="auth-error">{error}</p>}
              <button type="submit" disabled={loading} className="btn-primary auth-submit">
                {loading ? 'Resetting…' : 'Reset password'}
              </button>
            </form>
          )}
          <p className="auth-footer">
            <Link to="/login">Back to sign in</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
