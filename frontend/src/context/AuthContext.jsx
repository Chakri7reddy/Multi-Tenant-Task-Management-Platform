import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import api, { getAccessToken, getRefreshToken, setTokens, clearTokens } from '../services/api';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [orgId, setOrgId] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadUser = useCallback(() => {
    const t = getAccessToken();
    if (!t) {
      setUser(null);
      setOrgId(null);
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout
    Promise.all([
      api.get('/users/me', { signal: controller.signal }),
      api.get('/orgs/me', { signal: controller.signal }),
    ])
      .then(([userRes, orgRes]) => {
        setUser({ id: userRes.data._id, email: userRes.data.email, role: userRes.data.role });
        setOrgId(orgRes.data._id);
      })
      .catch((err) => {
        if (err.code === 'ERR_CANCELED' || err.name === 'AbortError') {
          console.warn('Auth check timed out – is the backend running at', import.meta.env.VITE_API_URL || '/api', '?');
        }
        clearTokens();
        setUser(null);
        setOrgId(null);
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setLoading(false);
      });
  }, []);

  useEffect(() => {
    loadUser();
  }, [loadUser]);

  const login = useCallback((data) => {
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user ? { id: data.user.id, email: data.user.email, role: data.user.role } : { id: data.userId });
    setOrgId(data.user?.orgId != null ? String(data.user.orgId) : null);
  }, []);

  const logout = useCallback(() => {
    api.post('/auth/logout').catch(() => {});
    clearTokens();
    setUser(null);
    setOrgId(null);
  }, []);

  const registerDone = useCallback((data) => {
    setTokens(data.accessToken, data.refreshToken);
    setUser(data.user ? { id: data.user.id, email: data.user.email, role: data.user.role } : null);
    const oid = data.user?.orgId ?? data.org?.id;
    setOrgId(oid != null ? String(oid) : null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, orgId, loading, login, logout, registerDone, loadUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
