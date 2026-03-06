import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import AppLayout from '../components/AppLayout';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

export default function Profile() {
  const [profile, setProfile] = useState(null);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [avatarLoading, setAvatarLoading] = useState(false);
  const [prefsLoading, setPrefsLoading] = useState(false);
  const { user } = useAuth();
  const addToast = useToast();

  useEffect(() => {
    api.get('/users/me').then((res) => setProfile(res.data)).catch(() => {});
  }, []);

  const prefs = profile?.notificationPrefs || {};
  const emailOnAssign = prefs.emailOnAssign !== false;
  const emailOnDue = prefs.emailOnDue !== false;

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setAvatarLoading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const { data } = await api.post('/users/me/avatar', formData);
      setProfile((p) => (p ? { ...p, avatarUrl: data.avatarUrl } : { avatarUrl: data.avatarUrl }));
      addToast('Avatar updated');
    } catch {
      addToast('Avatar upload failed', 'error');
    } finally {
      setAvatarLoading(false);
      e.target.value = '';
    }
  };

  const handlePrefChange = (key, value) => {
    setPrefsLoading(true);
    const next = { ...prefs, [key]: value };
    api
      .patch('/users/me', { notificationPrefs: next })
      .then((res) => setProfile((p) => (p ? { ...p, ...res.data } : res.data)))
      .catch(() => addToast('Failed to update preferences', 'error'))
      .finally(() => setPrefsLoading(false));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters.');
      return;
    }
    setLoading(true);
    try {
      await api.patch('/users/me/password', { currentPassword, newPassword });
      addToast('Password updated');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update password');
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  return (
    <AppLayout>
      <div className="app-main form-main">
        <div className="form-card glass-strong profile-card">
          <h1 className="form-card-title">Profile</h1>
          <div className="profile-info profile-header">
            <div className="profile-avatar-wrap">
              {profile?.avatarUrl ? (
                <img src={profile.avatarUrl.startsWith('http') ? profile.avatarUrl : profile.avatarUrl} alt="" className="profile-avatar" />
              ) : (
                <div className="profile-avatar placeholder">{user?.email?.charAt(0)?.toUpperCase() || '?'}</div>
              )}
              <label className="profile-avatar-upload">
                <input type="file" accept="image/*" onChange={handleAvatarChange} disabled={avatarLoading} />
                {avatarLoading ? 'Uploading…' : 'Change photo'}
              </label>
            </div>
            <div>
              <p><strong>Email</strong> {user.email}</p>
              <p><strong>Role</strong> <span className="pill pill-role">{user.role}</span></p>
            </div>
          </div>
          <h2 className="profile-section-title">Notification preferences</h2>
          <div className="profile-prefs">
            <label className="profile-pref-row">
              <input
                type="checkbox"
                checked={emailOnAssign}
                onChange={(e) => handlePrefChange('emailOnAssign', e.target.checked)}
                disabled={prefsLoading}
              />
              <span>Email when a task is assigned to me</span>
            </label>
            <label className="profile-pref-row">
              <input
                type="checkbox"
                checked={emailOnDue}
                onChange={(e) => handlePrefChange('emailOnDue', e.target.checked)}
                disabled={prefsLoading}
              />
              <span>Email for upcoming due dates</span>
            </label>
          </div>
          <h2 className="profile-section-title">Change password</h2>
          <form onSubmit={handleSubmit} className="form-card-form">
            <label className="form-label" htmlFor="profile-current">Current password</label>
            <input
              id="profile-current"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              className="input-glass"
              required
              autoComplete="current-password"
            />
            <label className="form-label" htmlFor="profile-new">New password</label>
            <input
              id="profile-new"
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="input-glass"
              required
              minLength={6}
              autoComplete="new-password"
            />
            <label className="form-label" htmlFor="profile-confirm">Confirm new password</label>
            <input
              id="profile-confirm"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="input-glass"
              required
              minLength={6}
              autoComplete="new-password"
            />
            {error && <p className="form-card-error">{error}</p>}
            <button type="submit" disabled={loading} className="btn-primary form-card-submit">
              {loading ? 'Updating…' : 'Update password'}
            </button>
          </form>
        </div>
      </div>
    </AppLayout>
  );
}
